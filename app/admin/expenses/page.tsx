"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Calendar, Filter, Plus } from 'lucide-react';

type BranchRow = { id: string; name: string };

type ExpenseRow = {
  id: string;
  branchId: string;
  category: string;
  amount: number;
  date: string;
  description: string;
};

const categories = ['Arriendo', 'Luz', 'Agua', 'Internet', 'Insumos', 'Marketing', 'Otros'] as const;

export default function AdminExpensesPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, startTransition] = useTransition();

  const [newCategory, setNewCategory] = useState<(typeof categories)[number]>('Insumos');
  const [newDate, setNewDate] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const loadBranches = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from('sucursales').select('id, nombre').order('nombre', { ascending: true });
    const mapped: BranchRow[] = (data ?? []).map((b: any) => ({ id: String(b.id), name: String(b.nombre) }));
    setBranches(mapped);
    setBranchId((prev) => prev || mapped[0]?.id || '');
  };

  const loadExpenses = async (bId: string, from: string, to: string) => {
    if (!bId) return;
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    let q = supabase.from('gastos').select('id, sucursal_id, categoria, valor, fecha, descripcion').eq('sucursal_id', bId).order('fecha', { ascending: false }).limit(500);
    if (from) q = q.gte('fecha', from);
    if (to) q = q.lte('fecha', to);
    const { data } = await q;
    setExpenses(
      (data ?? []).map((r: any) => ({
        id: String(r.id),
        branchId: String(r.sucursal_id),
        category: String(r.categoria ?? r.concepto ?? 'Otros'),
        amount: Number(r.valor ?? 0),
        date: String(r.fecha),
        description: String(r.descripcion ?? ''),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadBranches();
  }, []);

  useEffect(() => {
    if (!branchId) return;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    setFromDate((prev) => prev || from);
    setToDate((prev) => prev || to);
    setNewDate((prev) => prev || now.toISOString().slice(0, 10));
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    void loadExpenses(branchId, fromDate, toDate);
  }, [branchId, fromDate, toDate]);

  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const amountByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [expenses]);

  const createExpense = () => {
    const amount = Number(newAmount);
    if (!branchId || !newDate || !Number.isFinite(amount) || amount <= 0) return;
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.from('gastos').insert({
        sucursal_id: branchId,
        concepto: newCategory,
        categoria: newCategory,
        valor: amount,
        fecha: newDate,
        descripcion: newDescription.trim() || null,
      } as any);
      setNewAmount('');
      setNewDescription('');
      await loadExpenses(branchId, fromDate, toDate);
    });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Gastos</h1>
            <p className="text-sm text-zinc-500 mt-1">Registra egresos por sucursal y controla la rentabilidad.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <select
              className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input className="h-12 rounded-2xl pl-11 border-zinc-200" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input className="h-12 rounded-2xl pl-11 border-zinc-200" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">Total periodo</p>
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{formatMoney(totalAmount)}</div>
              <p className="mt-2 text-xs text-zinc-500">{`${expenses.length} registro(s)`}</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top categorías</CardTitle>
              <div className="text-xs text-zinc-500">{amountByCategory.length ? '' : ''}</div>
            </CardHeader>
            <CardContent className="space-y-3">
              {amountByCategory.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin datos.</p>
              ) : (
                amountByCategory.map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{cat}</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900">{formatMoney(amt)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Registrar gasto</CardTitle>
            <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800" disabled={submitting} onClick={createExpense}>
              <Plus className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900" value={newCategory} onChange={(e) => setNewCategory(e.target.value as any)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Input className="h-12 rounded-2xl border-zinc-200" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <Input className="h-12 rounded-2xl border-zinc-200" type="number" placeholder="Monto" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
            <Input className="h-12 rounded-2xl border-zinc-200 md:col-span-4" placeholder="Descripción (opcional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
          </CardContent>
        </Card>

        <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Historial</CardTitle>
            <div className="text-xs text-zinc-500">{loading ? '' : `${expenses.length} registro(s)`}</div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-14 bg-zinc-100 rounded-2xl" />
                <div className="h-14 bg-zinc-100 rounded-2xl" />
                <div className="h-14 bg-zinc-100 rounded-2xl" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">Sin gastos en el periodo.</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {expenses.map((e) => (
                  <div key={e.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{e.category}</p>
                      <p className="text-xs text-zinc-500 mt-1 truncate">{e.description || e.date}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-zinc-900">{formatMoney(e.amount)}</p>
                      <p className="text-xs text-zinc-500 mt-1">{new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


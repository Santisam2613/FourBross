"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AlertTriangle, Calendar, DollarSign, Download, RefreshCw, ShoppingBag } from 'lucide-react';

type BranchRow = { id: string; name: string };

type MetodoPago = 'nequi' | 'efectivo';

type OrderRow = {
  id: string;
  total: number;
  metodo: MetodoPago | null;
  branchId: string;
  startAt: string;
};

type ExpenseRow = {
  amount: number;
  branchId: string;
  date: string;
};

type LowStockRow = {
  id: string;
  title: string;
  stock: number;
  branchId: string;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekMonday(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(x, diff);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type Period = 'day' | 'week' | 'month' | 'year';

export default function AdminDashboard() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [scope, setScope] = useState<string>('global');
  const [period, setPeriod] = useState<Period>('month');
  const [baseDate, setBaseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [submitting, startTransition] = useTransition();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersPrev, setOrdersPrev] = useState<OrderRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [expensesPrev, setExpensesPrev] = useState<ExpenseRow[]>([]);
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const branchNameById = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  const range = useMemo(() => {
    const d = new Date(baseDate);
    const start =
      period === 'day'
        ? startOfDay(d)
        : period === 'week'
          ? startOfWeekMonday(d)
          : period === 'month'
            ? new Date(d.getFullYear(), d.getMonth(), 1)
            : new Date(d.getFullYear(), 0, 1);

    const end =
      period === 'day'
        ? addDays(start, 1)
        : period === 'week'
          ? addDays(start, 7)
          : period === 'month'
            ? new Date(start.getFullYear(), start.getMonth() + 1, 1)
            : new Date(start.getFullYear() + 1, 0, 1);

    const prevStart =
      period === 'day'
        ? addDays(start, -1)
        : period === 'week'
          ? addDays(start, -7)
          : period === 'month'
            ? new Date(start.getFullYear(), start.getMonth() - 1, 1)
            : new Date(start.getFullYear() - 1, 0, 1);

    const prevEnd = start;
    return { start, end, prevStart, prevEnd, label: period === 'month' ? monthKey(start) : '' };
  }, [baseDate, period]);

  const load = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const branchRowsPromise = supabase.from('sucursales').select('id, nombre').order('nombre', { ascending: true });

    let paidQuery = supabase
      .from('ordenes')
      .select('id, total, metodo_pago, sucursal_id, inicio')
      .eq('estado', 'pagado')
      .gte('inicio', range.start.toISOString())
      .lt('inicio', range.end.toISOString());
    if (scope !== 'global') paidQuery = paidQuery.eq('sucursal_id', scope);

    let paidPrevQuery = supabase
      .from('ordenes')
      .select('id, total, metodo_pago, sucursal_id, inicio')
      .eq('estado', 'pagado')
      .gte('inicio', range.prevStart.toISOString())
      .lt('inicio', range.prevEnd.toISOString());
    if (scope !== 'global') paidPrevQuery = paidPrevQuery.eq('sucursal_id', scope);

    let gastosQuery = supabase
      .from('gastos')
      .select('valor, sucursal_id, fecha')
      .gte('fecha', range.start.toISOString().slice(0, 10))
      .lt('fecha', range.end.toISOString().slice(0, 10));
    if (scope !== 'global') gastosQuery = gastosQuery.eq('sucursal_id', scope);

    let gastosPrevQuery = supabase
      .from('gastos')
      .select('valor, sucursal_id, fecha')
      .gte('fecha', range.prevStart.toISOString().slice(0, 10))
      .lt('fecha', range.prevEnd.toISOString().slice(0, 10));
    if (scope !== 'global') gastosPrevQuery = gastosPrevQuery.eq('sucursal_id', scope);

    let lowStockQuery = supabase
      .from('productos')
      .select('id, titulo, stock, sucursal_id')
      .eq('activo', true)
      .lte('stock', 5)
      .order('stock', { ascending: true })
      .limit(12);
    if (scope !== 'global') lowStockQuery = lowStockQuery.eq('sucursal_id', scope);

    const [{ data: branchRows }, { data: paid }, { data: paidPrev }, { data: g }, { data: gPrev }, { data: low }] = await Promise.all([
      branchRowsPromise,
      paidQuery,
      paidPrevQuery,
      gastosQuery,
      gastosPrevQuery,
      lowStockQuery,
    ]);

    const mappedBranches: BranchRow[] = (branchRows ?? []).map((r: any) => ({ id: String(r.id), name: String(r.nombre) }));
    setBranches(mappedBranches);

    const paidRows = (paid ?? []).map((r: any) => ({
      id: String(r.id),
      total: Number(r.total ?? 0),
      metodo: (r.metodo_pago as MetodoPago | null) ?? null,
      branchId: String(r.sucursal_id),
      startAt: String(r.inicio),
    }));

    const paidPrevRows = (paidPrev ?? []).map((r: any) => ({
      id: String(r.id),
      total: Number(r.total ?? 0),
      metodo: (r.metodo_pago as MetodoPago | null) ?? null,
      branchId: String(r.sucursal_id),
      startAt: String(r.inicio),
    }));

    const expenseRows = (g ?? []).map((r: any) => ({
      amount: Number(r.valor ?? 0),
      branchId: String(r.sucursal_id),
      date: String(r.fecha),
    }));
    const expensePrevRows = (gPrev ?? []).map((r: any) => ({
      amount: Number(r.valor ?? 0),
      branchId: String(r.sucursal_id),
      date: String(r.fecha),
    }));

    setLowStock(
      (low ?? []).map((r: any) => ({
        id: String(r.id),
        title: String(r.titulo ?? 'Producto'),
        stock: Number(r.stock ?? 0),
        branchId: String(r.sucursal_id),
      }))
    );

    setOrders(paidRows);
    setOrdersPrev(paidPrevRows);
    setExpenses(expenseRows);
    setExpensesPrev(expensePrevRows);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [scope, period, baseDate]);

  const totals = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const revenuePrev = ordersPrev.reduce((s, o) => s + o.total, 0);
    const ordersCount = orders.length;
    const ordersPrevCount = ordersPrev.length;
    const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const expensesPrevTotal = expensesPrev.reduce((s, e) => s + e.amount, 0);
    const growth = revenuePrev > 0 ? Math.round(((revenue - revenuePrev) / revenuePrev) * 100) : revenue > 0 ? 100 : 0;
    const ordersGrowth = ordersPrevCount > 0 ? Math.round(((ordersCount - ordersPrevCount) / ordersPrevCount) * 100) : ordersCount > 0 ? 100 : 0;
    const expensesGrowth = expensesPrevTotal > 0 ? Math.round(((expensesTotal - expensesPrevTotal) / expensesPrevTotal) * 100) : expensesTotal > 0 ? 100 : 0;
    return { revenue, growth, ordersCount, ordersGrowth, expensesTotal, expensesGrowth };
  }, [expenses, expensesPrev, orders, ordersPrev]);

  const byMethod = useMemo(() => {
    const m = new Map<MetodoPago, number>();
    for (const o of orders) {
      if (!o.metodo) continue;
      m.set(o.metodo, (m.get(o.metodo) ?? 0) + o.total);
    }
    const nequi = m.get('nequi') ?? 0;
    const efectivo = m.get('efectivo') ?? 0;
    const total = nequi + efectivo;
    return { nequi, efectivo, total };
  }, [orders]);

  const revenueByBranch = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.branchId, (m.get(o.branchId) ?? 0) + o.total);
    const rows = Array.from(m.entries()).map(([id, amt]) => ({ id, name: branchNameById.get(id) ?? 'Sucursal', amount: amt }));
    rows.sort((a, b) => b.amount - a.amount);
    return rows.slice(0, 6);
  }, [branchNameById, orders]);

  const exportCsv = () => {
    const header = ['tipo', 'id', 'sucursal', 'fecha', 'metodo_pago', 'total'];
    const lines = [header.join(',')];
    for (const o of orders) {
      lines.push(
        ['orden', o.id, branchNameById.get(o.branchId) ?? o.branchId, o.startAt, o.metodo ?? '', String(o.total)].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-admin-${scope}-${period}-${range.label || baseDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = period === 'day' ? 'Día' : period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Año';
  const scopeLabel = scope === 'global' ? 'Global' : branchNameById.get(scope) ?? 'Sucursal';

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Balance y recaudo</h1>
            <p className="text-sm text-zinc-500 mt-1">{`${scopeLabel} • ${periodLabel}`}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <select className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="global">Global</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input className="h-12 rounded-2xl pl-11 border-zinc-200" type="date" value={baseDate} onChange={(e) => setBaseDate(e.target.value)} />
            </div>
            <Button className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800" disabled={submitting} onClick={() => startTransition(async () => void load())}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
            <Button variant="outline" className="h-12 rounded-2xl" onClick={exportCsv} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`h-12 px-5 rounded-full text-sm font-semibold ${period === p ? 'bg-primary text-white' : 'bg-white border border-zinc-200 text-zinc-900'}`}
            >
              {p === 'day' ? 'Día' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">Ingresos</p>
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{formatMoney(totals.revenue)}</div>
              <p className={`mt-2 text-xs font-semibold ${totals.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{`${totals.growth}% vs periodo anterior`}</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">Órdenes pagadas</p>
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{totals.ordersCount}</div>
              <p className={`mt-2 text-xs font-semibold ${totals.ordersGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{`${totals.ordersGrowth}% vs periodo anterior`}</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">Gastos</p>
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{formatMoney(totals.expensesTotal)}</div>
              <p className={`mt-2 text-xs font-semibold ${totals.expensesGrowth <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{`${totals.expensesGrowth}% vs periodo anterior`}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Métodos de pago</CardTitle>
              <div className="text-xs text-zinc-500">{byMethod.total ? formatMoney(byMethod.total) : ''}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              {byMethod.total === 0 ? (
                <p className="text-sm text-zinc-500">Sin datos.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-zinc-900">Nequi</span>
                      <span className="text-zinc-900">{formatMoney(byMethod.nequi)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-zinc-200 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.round((byMethod.nequi / byMethod.total) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-zinc-900">Efectivo</span>
                      <span className="text-zinc-900">{formatMoney(byMethod.efectivo)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-zinc-200 overflow-hidden">
                      <div className="h-full bg-zinc-900" style={{ width: `${Math.round((byMethod.efectivo / byMethod.total) * 100)}%` }} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ingresos por sucursal</CardTitle>
              <div className="text-xs text-zinc-500">{scope === 'global' ? '' : ''}</div>
            </CardHeader>
            <CardContent className="space-y-3">
              {revenueByBranch.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin datos.</p>
              ) : (
                revenueByBranch.map((r) => (
                  <div key={r.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-zinc-900">{r.name}</span>
                      <span className="text-zinc-900">{formatMoney(r.amount)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-zinc-200 overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.round((r.amount / (revenueByBranch[0]?.amount || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Alerta de inventario
            </CardTitle>
            <Link href="/admin/inventory">
              <Button variant="outline" className="rounded-full">
                Ver inventario
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-14 bg-zinc-100 rounded-2xl" />
                <div className="h-14 bg-zinc-100 rounded-2xl" />
              </div>
            ) : lowStock.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">Sin productos críticos.</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {lowStock.map((p) => (
                  <div key={p.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{p.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">{branchNameById.get(p.branchId) ?? 'Sucursal'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold ${p.stock === 0 ? 'text-red-700' : 'text-yellow-700'}`}>{`${p.stock} unid.`}</p>
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

"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { DollarSign, RefreshCw, Scissors } from 'lucide-react';

type BranchRow = { id: string; name: string };
type BarberRow = { id: string; name: string };

type PayrollRow = {
  barberId: string;
  barberName: string;
  generated: number;
  paid: number;
  balance: number;
  servicesCount: number;
  ordersCount: number;
};

type PaymentMethod = 'nequi' | 'efectivo';

export default function AdminPayrollPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [globalPercent, setGlobalPercent] = useState<string>('50');
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, startTransition] = useTransition();

  const [payBarberId, setPayBarberId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('nequi');
  const [payNotes, setPayNotes] = useState<string>('');

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const monthStartEnd = useMemo(() => {
    const d = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return { start, end, monthDate: start.toISOString().slice(0, 10) };
  }, [month]);

  const loadBranches = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from('sucursales').select('id, nombre').order('nombre', { ascending: true });
    const mapped: BranchRow[] = (data ?? []).map((b: any) => ({ id: String(b.id), name: String(b.nombre) }));
    setBranches(mapped);
    setBranchId((prev) => prev || mapped[0]?.id || '');
  };

  const loadConfig = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from('configuracion_global').select('porcentaje_barbero').eq('id', true).single();
    setGlobalPercent(String((data as any)?.porcentaje_barbero ?? 50));
  };

  const computePayroll = async (bId: string) => {
    if (!bId) return;
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    await supabase.rpc('calcular_nomina_barbero', { p_mes: monthStartEnd.monthDate } as any);

    const [{ data: orders }, { data: payroll }, { data: barbers }, { data: payments }] = await Promise.all([
      supabase
        .from('ordenes')
        .select('id, barbero_id, sucursal_id, inicio')
        .eq('sucursal_id', bId)
        .eq('estado', 'pagado')
        .gte('inicio', monthStartEnd.start.toISOString())
        .lt('inicio', monthStartEnd.end.toISOString()),
      supabase
        .from('nomina_barberos')
        .select('barbero_id, orden_id, valor_generado')
        .in(
          'orden_id',
          (await supabase
            .from('ordenes')
            .select('id')
            .eq('sucursal_id', bId)
            .eq('estado', 'pagado')
            .gte('inicio', monthStartEnd.start.toISOString())
            .lt('inicio', monthStartEnd.end.toISOString())
          ).data?.map((r: any) => r.id) ?? []
        ),
      supabase.from('usuarios').select('id, nombre').eq('rol', 'barbero').eq('activo', true).eq('sucursal_id', bId),
      supabase
        .from('pagos_barberos')
        .select('barbero_id, valor, fecha')
        .eq('sucursal_id', bId)
        .gte('fecha', monthStartEnd.start.toISOString().slice(0, 10))
        .lt('fecha', monthStartEnd.end.toISOString().slice(0, 10)),
    ]);

    const barberNameById = new Map<string, string>();
    for (const b of barbers ?? []) barberNameById.set(String((b as any).id), String((b as any).nombre ?? 'Barbero'));

    const orderIds = new Set((orders ?? []).map((o: any) => String(o.id)));
    const byBarber = new Map<string, { generated: number; orders: Set<string>; servicesCount: number }>();
    for (const p of payroll ?? []) {
      const orderId = String((p as any).orden_id);
      if (!orderIds.has(orderId)) continue;
      const barberId = String((p as any).barbero_id);
      const curr = byBarber.get(barberId) ?? { generated: 0, orders: new Set<string>(), servicesCount: 0 };
      curr.generated += Number((p as any).valor_generado ?? 0);
      curr.orders.add(orderId);
      curr.servicesCount += 1;
      byBarber.set(barberId, curr);
    }

    const paidByBarber = new Map<string, number>();
    for (const pay of payments ?? []) {
      const id = String((pay as any).barbero_id);
      paidByBarber.set(id, (paidByBarber.get(id) ?? 0) + Number((pay as any).valor ?? 0));
    }

    const result: PayrollRow[] = Array.from(byBarber.entries()).map(([barberId, v]) => {
      const paid = paidByBarber.get(barberId) ?? 0;
      const generated = v.generated;
      return {
        barberId,
        barberName: barberNameById.get(barberId) ?? 'Barbero',
        generated,
        paid,
        balance: generated - paid,
        servicesCount: v.servicesCount,
        ordersCount: v.orders.size,
      };
    });

    result.sort((a, b) => b.balance - a.balance);
    setRows(result);
    setPayBarberId((prev) => prev || result[0]?.barberId || '');
    setLoading(false);
  };

  useEffect(() => {
    void loadBranches();
    void loadConfig();
    const now = new Date();
    setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    if (!branchId || !month) return;
    void computePayroll(branchId);
  }, [branchId, month]);

  const totalGenerated = useMemo(() => rows.reduce((s, r) => s + r.generated, 0), [rows]);
  const totalPaid = useMemo(() => rows.reduce((s, r) => s + r.paid, 0), [rows]);
  const totalBalance = useMemo(() => rows.reduce((s, r) => s + r.balance, 0), [rows]);

  const saveGlobalPercent = () => {
    const value = Number(globalPercent);
    if (!Number.isFinite(value) || value < 0 || value > 100) return;
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.from('configuracion_global').update({ porcentaje_barbero: value }).eq('id', true);
      await loadConfig();
      await computePayroll(branchId);
    });
  };

  const registerPayment = () => {
    const amount = Number(payAmount);
    if (!branchId || !payBarberId || !Number.isFinite(amount) || amount <= 0) return;
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.from('pagos_barberos').insert({
        barbero_id: payBarberId,
        sucursal_id: branchId,
        fecha: new Date().toISOString().slice(0, 10),
        metodo_pago: payMethod,
        valor: amount,
        notas: payNotes.trim() || null,
      } as any);
      setPayAmount('');
      setPayNotes('');
      await computePayroll(branchId);
    });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Nómina</h1>
            <p className="text-sm text-zinc-500 mt-1">Comisión variable por barbero y registro de pagos.</p>
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
            <Input className="h-12 rounded-2xl border-zinc-200" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            <Button className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800" disabled={submitting} onClick={() => void computePayroll(branchId)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recalcular
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">Generado</p>
                <Scissors className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{formatMoney(totalGenerated)}</div>
              <p className="mt-2 text-xs text-zinc-500">Órdenes pagadas del mes</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">Pagado</p>
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{formatMoney(totalPaid)}</div>
              <p className="mt-2 text-xs text-zinc-500">Pagos registrados</p>
            </CardContent>
          </Card>
          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">Saldo</p>
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{formatMoney(totalBalance)}</div>
              <p className="mt-2 text-xs text-zinc-500">Pendiente por pagar</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Porcentaje global</CardTitle>
            <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800" disabled={submitting} onClick={saveGlobalPercent}>
              Guardar
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-3 md:items-center">
            <Input className="h-12 rounded-2xl border-zinc-200 md:w-48" type="number" value={globalPercent} onChange={(e) => setGlobalPercent(e.target.value)} />
            <p className="text-sm text-zinc-500">Porcentaje de comisión aplicado a servicios para el cálculo mensual.</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Registrar pago</CardTitle>
            <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800" disabled={submitting} onClick={registerPayment}>
              Guardar pago
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900" value={payBarberId} onChange={(e) => setPayBarberId(e.target.value)}>
              {rows.map((r) => (
                <option key={r.barberId} value={r.barberId}>
                  {r.barberName}
                </option>
              ))}
            </select>
            <select className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
              <option value="nequi">Nequi</option>
              <option value="efectivo">Efectivo</option>
            </select>
            <Input className="h-12 rounded-2xl border-zinc-200" type="number" placeholder="Monto" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <Input className="h-12 rounded-2xl border-zinc-200 md:col-span-4" placeholder="Notas (opcional)" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
          </CardContent>
        </Card>

        <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detalle por barbero</CardTitle>
            <div className="text-xs text-zinc-500">{loading ? '' : `${rows.length} barbero(s)`}</div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-14 bg-zinc-100 rounded-2xl" />
                <div className="h-14 bg-zinc-100 rounded-2xl" />
                <div className="h-14 bg-zinc-100 rounded-2xl" />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">Sin nómina para el periodo.</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {rows.map((r) => (
                  <div key={r.barberId} className="p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{r.barberName}</p>
                      <p className="text-xs text-zinc-500 mt-1">{`${r.ordersCount} orden(es) • ${r.servicesCount} servicio(s)`}</p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <p className="text-sm font-semibold text-zinc-900">{formatMoney(r.generated)}</p>
                      <p className="text-xs text-zinc-500">{`Pagado: ${formatMoney(r.paid)}`}</p>
                      <p className="text-xs font-semibold text-zinc-900">{`Saldo: ${formatMoney(r.balance)}`}</p>
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


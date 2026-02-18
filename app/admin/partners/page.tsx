"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Calendar, DollarSign, Plus, RefreshCw } from 'lucide-react';

type BranchRow = { id: string; name: string };

type PartnerRow = {
  id: string;
  name: string;
  percent: number;
  active: boolean;
};

type CloseRow = {
  id: string;
  month: string;
  branchId: string | null;
  ingresos: number;
  egresos: number;
  nominaVariable: number;
  nominaFija: number;
  utilidad: number;
  createdAt: string;
};

export default function AdminPartnersPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchId, setBranchId] = useState<string>('global');
  const [month, setMonth] = useState<string>('');

  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [closes, setCloses] = useState<CloseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, startTransition] = useTransition();

  const [newName, setNewName] = useState('');
  const [newPercent, setNewPercent] = useState('');

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const loadBranches = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from('sucursales').select('id, nombre').order('nombre', { ascending: true });
    setBranches((data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.nombre) })));
  };

  const loadPartners = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from('socios').select('id, nombre, porcentaje, activo').order('creado_en', { ascending: false });
    setPartners(
      (data ?? []).map((r: any) => ({
        id: String(r.id),
        name: String(r.nombre),
        percent: Number(r.porcentaje ?? 0),
        active: Boolean(r.activo ?? true),
      }))
    );
  };

  const loadCloses = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('cierres_mensuales')
      .select('id, mes, sucursal_id, ingresos, egresos, nomina_variable, nomina_fija, utilidad, creado_en')
      .order('mes', { ascending: false })
      .limit(24);
    setCloses(
      (data ?? []).map((r: any) => ({
        id: String(r.id),
        month: String(r.mes),
        branchId: (r.sucursal_id as string | null) ?? null,
        ingresos: Number(r.ingresos ?? 0),
        egresos: Number(r.egresos ?? 0),
        nominaVariable: Number(r.nomina_variable ?? 0),
        nominaFija: Number(r.nomina_fija ?? 0),
        utilidad: Number(r.utilidad ?? 0),
        createdAt: String(r.creado_en),
      }))
    );
  };

  const refresh = async () => {
    setLoading(true);
    await Promise.all([loadBranches(), loadPartners(), loadCloses()]);
    setLoading(false);
  };

  useEffect(() => {
    const now = new Date();
    setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    void refresh();
  }, []);

  const totalPercent = useMemo(() => partners.filter((p) => p.active).reduce((s, p) => s + p.percent, 0), [partners]);

  const createPartner = () => {
    const p = Number(newPercent);
    if (!newName.trim() || !Number.isFinite(p) || p < 0 || p > 100) return;
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.from('socios').insert({ nombre: newName.trim(), porcentaje: p, activo: true });
      setNewName('');
      setNewPercent('');
      await loadPartners();
    });
  };

  const updatePartner = (id: string, patch: Partial<PartnerRow>) => {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const savePartner = (p: PartnerRow) => {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.from('socios').update({ nombre: p.name, porcentaje: p.percent, activo: p.active }).eq('id', p.id);
      await loadPartners();
    });
  };

  const closeMonth = () => {
    if (!month) return;
    const mes = `${month}-01`;
    const sucursal = branchId === 'global' ? null : branchId;
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.rpc('cerrar_mes', { p_mes: mes, p_sucursal_id: sucursal } as any);
      await loadCloses();
    });
  };

  const branchName = (id: string | null) => {
    if (!id) return 'Global';
    return branches.find((b) => b.id === id)?.name ?? 'Sucursal';
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Socios</h1>
            <p className="text-sm text-zinc-500 mt-1">Participación y cierres mensuales.</p>
          </div>
          <Button className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800" onClick={() => void refresh()} disabled={submitting}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Socios</CardTitle>
              <div className="text-xs text-zinc-500">{`${totalPercent.toFixed(2)}% activo`}</div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4 animate-pulse">
                  <div className="h-14 bg-zinc-100 rounded-2xl" />
                  <div className="h-14 bg-zinc-100 rounded-2xl" />
                </div>
              ) : partners.length === 0 ? (
                <div className="p-6 text-sm text-zinc-500">Sin socios.</div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {partners.map((p) => (
                    <div key={p.id} className="p-5 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <Input className="h-11 rounded-2xl border-zinc-200" value={p.name} onChange={(e) => updatePartner(p.id, { name: e.target.value })} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-11 w-28 rounded-2xl border-zinc-200"
                          type="number"
                          value={p.percent}
                          onChange={(e) => updatePartner(p.id, { percent: Number(e.target.value) })}
                        />
                        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                          <input type="checkbox" checked={p.active} onChange={(e) => updatePartner(p.id, { active: e.target.checked })} className="h-4 w-4" />
                          Activo
                        </label>
                        <Button className="h-11 rounded-2xl bg-zinc-900 hover:bg-zinc-800" disabled={submitting} onClick={() => savePartner(p)}>
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Agregar</CardTitle>
              <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800" disabled={submitting} onClick={createPartner}>
                <Plus className="h-4 w-4 mr-2" />
                Crear
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input className="h-12 rounded-2xl border-zinc-200" placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input className="h-12 rounded-2xl border-zinc-200" placeholder="Porcentaje" type="number" value={newPercent} onChange={(e) => setNewPercent(e.target.value)} />
              <p className="text-xs text-zinc-500">El total activo recomendado es 100%.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Cierre mensual</CardTitle>
              <p className="text-sm text-zinc-500 mt-1">Calcula utilidad y guarda un snapshot del mes.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="global">Global</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input className="h-12 rounded-2xl pl-11 border-zinc-200" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <Button className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800" disabled={submitting} onClick={closeMonth}>
                Cerrar mes
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-14 bg-zinc-100 rounded-2xl" />
                <div className="h-14 bg-zinc-100 rounded-2xl" />
              </div>
            ) : closes.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">Sin cierres.</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {closes.map((c) => (
                  <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{`${c.month} • ${branchName(c.branchId)}`}</p>
                      <p className="text-xs text-zinc-500 mt-1">{new Date(c.createdAt).toLocaleString('es-ES')}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full md:w-auto">
                      <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-3">
                        <p className="text-xs text-zinc-500">Ingresos</p>
                        <p className="text-sm font-semibold text-zinc-900">{formatMoney(c.ingresos)}</p>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-3">
                        <p className="text-xs text-zinc-500">Egresos</p>
                        <p className="text-sm font-semibold text-zinc-900">{formatMoney(c.egresos)}</p>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-3">
                        <p className="text-xs text-zinc-500">Nómina var.</p>
                        <p className="text-sm font-semibold text-zinc-900">{formatMoney(c.nominaVariable)}</p>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-3">
                        <p className="text-xs text-zinc-500">Nómina fija</p>
                        <p className="text-sm font-semibold text-zinc-900">{formatMoney(c.nominaFija)}</p>
                      </div>
                      <div className="rounded-2xl bg-zinc-900 text-white p-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-white/70">Utilidad</p>
                          <p className="text-sm font-semibold">{formatMoney(c.utilidad)}</p>
                        </div>
                        <DollarSign className="h-4 w-4 text-white/80" />
                      </div>
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


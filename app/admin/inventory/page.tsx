"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Minus, Plus, RefreshCw } from 'lucide-react';

type BranchRow = { id: string; name: string };

type ProductRow = {
  id: string;
  title: string;
  price: number;
  stock: number;
  active: boolean;
};

type ServiceRow = {
  id: string;
  title: string;
  price: number;
  durationMinutes: number;
  active: boolean;
};

type MovementRow = {
  id: string;
  createdAt: string;
  productId: string;
  delta: number;
  reason: string;
  byUserId: string;
};

export default function AdminInventoryPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [tab, setTab] = useState<'products' | 'services'>('products');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, startTransition] = useTransition();
  const [stockDraft, setStockDraft] = useState<Record<string, number>>({});
  const [stockReason, setStockReason] = useState<Record<string, string>>({});

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const loadBranches = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from('sucursales').select('id, nombre').order('nombre', { ascending: true });
    const mapped: BranchRow[] = (data ?? []).map((b: any) => ({ id: String(b.id), name: String(b.nombre) }));
    setBranches(mapped);
    setBranchId((prev) => prev || mapped[0]?.id || '');
  };

  const loadData = async (bId: string) => {
    if (!bId) return;
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const [{ data: p }, { data: s }, { data: m }] = await Promise.all([
      supabase.from('productos').select('id, titulo, precio, stock, activo').eq('sucursal_id', bId).order('creado_en', { ascending: false }).limit(300),
      supabase.from('servicios').select('id, titulo, precio, tiempo_servicio, activo').eq('sucursal_id', bId).order('creado_en', { ascending: false }).limit(200),
      supabase.from('inventario_movimientos').select('id, producto_id, delta, motivo, creado_en, usuario_id').eq('sucursal_id', bId).order('creado_en', { ascending: false }).limit(30),
    ]);

    setProducts(
      (p ?? []).map((r: any) => ({
        id: String(r.id),
        title: String(r.titulo ?? 'Producto'),
        price: Number(r.precio ?? 0),
        stock: Number(r.stock ?? 0),
        active: Boolean(r.activo ?? true),
      }))
    );
    setServices(
      (s ?? []).map((r: any) => ({
        id: String(r.id),
        title: String(r.titulo ?? 'Servicio'),
        price: Number(r.precio ?? 0),
        durationMinutes: Number(r.tiempo_servicio ?? 30),
        active: Boolean(r.activo ?? true),
      }))
    );
    setMovements(
      (m ?? []).map((r: any) => ({
        id: String(r.id),
        createdAt: String(r.creado_en),
        productId: String(r.producto_id),
        delta: Number(r.delta ?? 0),
        reason: String(r.motivo ?? ''),
        byUserId: String(r.usuario_id ?? ''),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadBranches();
  }, []);

  useEffect(() => {
    if (!branchId) return;
    void loadData(branchId);
  }, [branchId]);

  const productTitleById = useMemo(() => new Map(products.map((p) => [p.id, p.title])), [products]);

  const updateProduct = (productId: string, patch: Partial<ProductRow>) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...patch } : p)));
  };

  const updateService = (serviceId: string, patch: Partial<ServiceRow>) => {
    setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, ...patch } : s)));
  };

  const saveProduct = (p: ProductRow) => {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.from('productos').update({ precio: p.price, activo: p.active }).eq('id', p.id);
      await loadData(branchId);
    });
  };

  const saveService = (s: ServiceRow) => {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.from('servicios').update({ precio: s.price, tiempo_servicio: s.durationMinutes, activo: s.active }).eq('id', s.id);
      await loadData(branchId);
    });
  };

  const applyStockDelta = (productId: string) => {
    const delta = Number(stockDraft[productId] ?? 0);
    const reason = String(stockReason[productId] ?? '').trim();
    if (!delta || !reason) return;
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.rpc('ajustar_stock_producto', { p_producto_id: productId, p_delta: delta, p_motivo: reason } as any);
      setStockDraft((prev) => ({ ...prev, [productId]: 0 }));
      setStockReason((prev) => ({ ...prev, [productId]: '' }));
      await loadData(branchId);
    });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Inventario</h1>
            <p className="text-sm text-zinc-500 mt-1">Control por sucursal de productos y servicios.</p>
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
            <Button
              className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800"
              onClick={() => void loadData(branchId)}
              disabled={submitting}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('products')}
            className={`h-12 px-5 rounded-full text-sm font-semibold ${tab === 'products' ? 'bg-primary text-white' : 'bg-white border border-zinc-200 text-zinc-900'}`}
          >
            Productos
          </button>
          <button
            type="button"
            onClick={() => setTab('services')}
            className={`h-12 px-5 rounded-full text-sm font-semibold ${tab === 'services' ? 'bg-primary text-white' : 'bg-white border border-zinc-200 text-zinc-900'}`}
          >
            Servicios
          </button>
        </div>

        {tab === 'products' ? (
          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Productos</CardTitle>
              <div className="text-xs text-zinc-500">{loading ? '' : `${products.length} producto(s)`}</div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4 animate-pulse">
                  <div className="h-16 bg-zinc-100 rounded-2xl" />
                  <div className="h-16 bg-zinc-100 rounded-2xl" />
                  <div className="h-16 bg-zinc-100 rounded-2xl" />
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {products.map((p) => (
                    <div key={p.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900 truncate">{p.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">{`Stock: ${p.stock}`}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Precio</span>
                          <Input
                            className="h-10 w-32 rounded-2xl border-zinc-200"
                            type="number"
                            value={p.price}
                            onChange={(e) => updateProduct(p.id, { price: Number(e.target.value) })}
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                          <input
                            type="checkbox"
                            checked={p.active}
                            onChange={(e) => updateProduct(p.id, { active: e.target.checked })}
                            className="h-4 w-4"
                          />
                          Activo
                        </label>

                        <Button
                          className="h-10 rounded-2xl bg-zinc-900 hover:bg-zinc-800"
                          onClick={() => saveProduct(p)}
                          disabled={submitting}
                        >
                          Guardar
                        </Button>
                      </div>

                      <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-2 sm:items-center">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 w-10 rounded-2xl p-0"
                            onClick={() => setStockDraft((prev) => ({ ...prev, [p.id]: Number(prev[p.id] ?? 0) - 1 }))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            className="h-10 w-20 rounded-2xl border-zinc-200 text-center"
                            type="number"
                            value={stockDraft[p.id] ?? 0}
                            onChange={(e) => setStockDraft((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 w-10 rounded-2xl p-0"
                            onClick={() => setStockDraft((prev) => ({ ...prev, [p.id]: Number(prev[p.id] ?? 0) + 1 }))}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          className="h-10 w-full sm:w-56 rounded-2xl border-zinc-200"
                          placeholder="Motivo (obligatorio)"
                          value={stockReason[p.id] ?? ''}
                          onChange={(e) => setStockReason((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        />
                        <Button className="h-10 rounded-2xl" onClick={() => applyStockDelta(p.id)} disabled={submitting}>
                          Ajustar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Servicios</CardTitle>
              <div className="text-xs text-zinc-500">{loading ? '' : `${services.length} servicio(s)`}</div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4 animate-pulse">
                  <div className="h-16 bg-zinc-100 rounded-2xl" />
                  <div className="h-16 bg-zinc-100 rounded-2xl" />
                  <div className="h-16 bg-zinc-100 rounded-2xl" />
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {services.map((s) => (
                    <div key={s.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900 truncate">{s.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">{`Duración: ${s.durationMinutes} min`}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Precio</span>
                          <Input
                            className="h-10 w-32 rounded-2xl border-zinc-200"
                            type="number"
                            value={s.price}
                            onChange={(e) => updateService(s.id, { price: Number(e.target.value) })}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Min</span>
                          <Input
                            className="h-10 w-24 rounded-2xl border-zinc-200"
                            type="number"
                            value={s.durationMinutes}
                            onChange={(e) => updateService(s.id, { durationMinutes: Number(e.target.value) })}
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                          <input
                            type="checkbox"
                            checked={s.active}
                            onChange={(e) => updateService(s.id, { active: e.target.checked })}
                            className="h-4 w-4"
                          />
                          Activo
                        </label>

                        <Button
                          className="h-10 rounded-2xl bg-zinc-900 hover:bg-zinc-800"
                          onClick={() => saveService(s)}
                          disabled={submitting}
                        >
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Movimientos</CardTitle>
            <div className="text-xs text-zinc-500">{loading ? '' : `${movements.length} registro(s)`}</div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-14 bg-zinc-100 rounded-2xl" />
                <div className="h-14 bg-zinc-100 rounded-2xl" />
              </div>
            ) : movements.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">Sin movimientos.</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {movements.map((m) => (
                  <div key={m.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{productTitleById.get(m.productId) ?? 'Producto'}</p>
                      <p className="text-xs text-zinc-500 mt-1 truncate">{m.reason}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold ${m.delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {m.delta >= 0 ? `+${m.delta}` : String(m.delta)}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">{new Date(m.createdAt).toLocaleString('es-ES')}</p>
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


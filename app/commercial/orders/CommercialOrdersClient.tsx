"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Search, X, Calendar, Clock, Scissors, ShoppingBag } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createOrder } from '@/actions/orders';

type OrderStatus = 'agendado' | 'proceso' | 'completado' | 'pagado' | 'cancelado';

type ClientRow = { id: string; name: string };
type BarberRow = { id: string; name: string };
type ServiceRow = { id: string; title: string; durationMinutes: number; price: number };
type ProductRow = { id: string; title: string; price: number };

type OrderRow = {
  id: string;
  clientId: string;
  clientName: string;
  status: OrderStatus;
  startAt: string;
  total: number;
};

type EditItem = { tipo: 'servicio' | 'producto'; referencia_id: string; cantidad: number };

const statusLabel: Record<OrderStatus, string> = {
  agendado: 'Agendado',
  proceso: 'En proceso',
  completado: 'Completado',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
};

export default function CommercialOrdersClient() {
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');

  const [branchId, setBranchId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createClientId, setCreateClientId] = useState<string>('');
  const [createServiceId, setCreateServiceId] = useState<string>('');
  const [createBarberId, setCreateBarberId] = useState<string>('');
  const [createStartLocal, setCreateStartLocal] = useState<string>('');
  const [createNotes, setCreateNotes] = useState<string>('');
  const [createProductQty, setCreateProductQty] = useState<Record<string, number>>({});

  const [editOpen, setEditOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string>('');
  const [editStatus, setEditStatus] = useState<OrderStatus>('agendado');
  const [editBarberId, setEditBarberId] = useState<string>('');
  const [editStartLocal, setEditStartLocal] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editItems, setEditItems] = useState<EditItem[]>([]);

  const [submitting, startTransition] = useTransition();

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const formatDay = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const formatTime12 = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'pm' : 'am';
    const hours12 = h % 12 || 12;
    return `${hours12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const fetchAll = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: me } = await supabase.from('usuarios').select('sucursal_id').eq('id', user.id).single();
    const bId = (me as unknown as { sucursal_id?: string | null } | null)?.sucursal_id ?? null;
    setBranchId(bId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      { data: clientRows },
      { data: barberRows },
      { data: serviceRows },
      { data: productRows },
      { data: orderRows },
    ] = await Promise.all([
      supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('rol', 'cliente')
        .eq('activo', true)
        .eq('sucursal_id', bId)
        .order('creado_en', { ascending: false })
        .limit(400),
      supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('rol', 'barbero')
        .eq('activo', true)
        .eq('sucursal_id', bId)
        .order('creado_en', { ascending: false })
        .limit(80),
      supabase
        .from('servicios')
        .select('id, titulo, tiempo_servicio, precio, sucursal_id, activo')
        .eq('activo', true)
        .eq('sucursal_id', bId)
        .order('creado_en', { ascending: false })
        .limit(200),
      supabase
        .from('productos')
        .select('id, titulo, precio, sucursal_id, activo')
        .eq('activo', true)
        .eq('sucursal_id', bId)
        .order('creado_en', { ascending: false })
        .limit(300),
      supabase
        .from('ordenes')
        .select('id, usuario_id, estado, inicio, total')
        .eq('sucursal_id', bId)
        .gte('inicio', todayStart.toISOString())
        .lte('inicio', todayEnd.toISOString())
        .order('inicio', { ascending: true })
        .limit(200),
    ]);

    const clientsMapped: ClientRow[] = (clientRows ?? []).map((r: any) => ({ id: String(r.id), name: String(r.nombre ?? 'Cliente') }));
    const barbersMapped: BarberRow[] = (barberRows ?? []).map((r: any) => ({ id: String(r.id), name: String(r.nombre ?? 'Barbero') }));
    const servicesMapped: ServiceRow[] = (serviceRows ?? []).map((r: any) => ({
      id: String(r.id),
      title: String(r.titulo ?? 'Servicio'),
      durationMinutes: Number(r.tiempo_servicio ?? 30),
      price: Number(r.precio ?? 0),
    }));
    const productsMapped: ProductRow[] = (productRows ?? []).map((r: any) => ({
      id: String(r.id),
      title: String(r.titulo ?? 'Producto'),
      price: Number(r.precio ?? 0),
    }));

    const clientNameById = new Map<string, string>();
    for (const c of clientsMapped) clientNameById.set(c.id, c.name);

    const ordersMapped: OrderRow[] = (orderRows ?? []).map((r: any) => ({
      id: String(r.id),
      clientId: String(r.usuario_id),
      clientName: clientNameById.get(String(r.usuario_id)) ?? 'Cliente',
      status: String(r.estado) as OrderStatus,
      startAt: String(r.inicio),
      total: Number(r.total ?? 0),
    }));

    setClients(clientsMapped);
    setBarbers(barbersMapped);
    setServices(servicesMapped);
    setProducts(productsMapped);
    setOrders(ordersMapped);

    const defaultClient = preselectedClientId && clientsMapped.some((c) => c.id === preselectedClientId) ? preselectedClientId : clientsMapped[0]?.id ?? '';
    if (!createClientId) setCreateClientId(defaultClient);
    setLoading(false);
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => o.id.toLowerCase().includes(q) || o.clientName.toLowerCase().includes(q));
  }, [orders, query]);

  const createService = useMemo(() => services.find((s) => s.id === createServiceId) ?? null, [createServiceId, services]);

  const openCreate = () => {
    const now = new Date();
    const iso = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000).toISOString().slice(0, 16);
    setCreateStartLocal(iso);
    setCreateNotes('');
    setCreateBarberId(barbers[0]?.id ?? '');
    setCreateServiceId('');
    setCreateProductQty({});
    if (preselectedClientId) setCreateClientId(preselectedClientId);
    setCreateOpen(true);
  };

  const buildCreateItems = (): { type: 'service' | 'product'; serviceId?: string; productId?: string; quantity: number }[] => {
    const items: any[] = [];
    if (createServiceId) items.push({ type: 'service', serviceId: createServiceId, quantity: 1 });
    for (const [id, qty] of Object.entries(createProductQty)) {
      const q = Math.max(0, Number(qty ?? 0));
      if (q > 0) items.push({ type: 'product', productId: id, quantity: q });
    }
    return items;
  };

  const submitCreate = () => {
    if (!branchId) return;
    const items = buildCreateItems();
    if (items.length === 0) return;
    startTransition(async () => {
      const hasService = Boolean(createServiceId);
      const start = createStartLocal ? new Date(createStartLocal) : new Date();
      const startIso = start.toISOString();
      const endIso = hasService && createService ? new Date(start.getTime() + createService.durationMinutes * 60 * 1000).toISOString() : undefined;

      await createOrder({
        branchId,
        clientId: createClientId || undefined,
        staffId: hasService ? createBarberId || null : null,
        startAt: hasService ? startIso : undefined,
        endAt: hasService ? endIso : undefined,
        notes: createNotes || undefined,
        items: items.map((it) =>
          it.type === 'service' ? { type: 'service', serviceId: it.serviceId!, quantity: it.quantity } : { type: 'product', productId: it.productId!, quantity: it.quantity }
        ),
      });

      setCreateOpen(false);
      await fetchAll();
    });
  };

  const openEdit = async (orderId: string) => {
    const supabase = createSupabaseBrowserClient();
    const { data: o } = await supabase.from('ordenes').select('id, estado, inicio, notas, barbero_id').eq('id', orderId).single();
    const { data: det } = await supabase.from('orden_detalle').select('tipo, referencia_id, cantidad').eq('orden_id', orderId);

    const startLocal = o?.inicio
      ? new Date(new Date(o.inicio).getTime() - new Date(o.inicio).getTimezoneOffset() * 60 * 1000).toISOString().slice(0, 16)
      : '';

    setEditOrderId(orderId);
    setEditStatus(String((o as any)?.estado ?? 'agendado') as OrderStatus);
    setEditBarberId(String((o as any)?.barbero_id ?? ''));
    setEditStartLocal(startLocal);
    setEditNotes(String((o as any)?.notas ?? ''));
    setEditItems(
      (det ?? []).map((r: any) => ({
        tipo: String(r.tipo) as 'servicio' | 'producto',
        referencia_id: String(r.referencia_id),
        cantidad: Math.max(1, Number(r.cantidad ?? 1)),
      }))
    );
    setEditOpen(true);
  };

  const addEditItem = (tipo: 'servicio' | 'producto', referenciaId: string) => {
    setEditItems((prev) => {
      const idx = prev.findIndex((p) => p.tipo === tipo && p.referencia_id === referenciaId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [...prev, { tipo, referencia_id: referenciaId, cantidad: 1 }];
    });
  };

  const itemTitle = (it: EditItem) => {
    if (it.tipo === 'servicio') return services.find((s) => s.id === it.referencia_id)?.title ?? 'Servicio';
    return products.find((p) => p.id === it.referencia_id)?.title ?? 'Producto';
  };

  const updateEditQty = (idx: number, qty: number) => {
    setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, cantidad: Math.max(1, qty) } : it)));
  };

  const removeEditItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitEdit = () => {
    if (!editOrderId) return;
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const start = editStartLocal ? new Date(editStartLocal) : null;
      const startIso = start ? start.toISOString() : null;

      await supabase.rpc('actualizar_orden_comercial', {
        p_orden_id: editOrderId,
        p_estado: editStatus,
        p_inicio: startIso,
        p_fin: null,
        p_barbero_id: editBarberId || null,
        p_clear_barbero: !editBarberId,
        p_notas: editNotes,
        p_items: editItems.map((it) => ({ tipo: it.tipo, referencia_id: it.referencia_id, cantidad: it.cantidad })),
      } as any);

      setEditOpen(false);
      await fetchAll();
    });
  };

  return (
    <DashboardLayout role="comercial">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Órdenes</h1>
            <p className="text-sm text-zinc-500 mt-1">Gestiona órdenes de la sucursal.</p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input placeholder="Buscar por cliente u orden..." className="pl-9 h-10 rounded-2xl" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Button className="rounded-full" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva
            </Button>
          </div>
        </div>

        <Card className="rounded-2xl border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Hoy</CardTitle>
            <div className="text-xs text-zinc-500">{`${filteredOrders.length} orden(es)`}</div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4 animate-pulse">
                <div className="h-16 rounded-2xl bg-zinc-100" />
                <div className="h-16 rounded-2xl bg-zinc-100" />
                <div className="h-16 rounded-2xl bg-zinc-100" />
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredOrders.length === 0 ? (
                  <div className="p-6 text-sm text-zinc-500">Sin órdenes para hoy.</div>
                ) : (
                  filteredOrders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors"
                      onClick={() => void openEdit(o.id)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{o.clientName}</p>
                        <p className="text-xs text-zinc-500 mt-1 truncate">{o.id}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {formatDay(o.startAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {formatTime12(o.startAt)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right space-y-2">
                        <p className="text-sm font-semibold text-zinc-900">{formatMoney(o.total)}</p>
                        <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-zinc-100 text-zinc-900">{statusLabel[o.status]}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Cerrar" onClick={() => setCreateOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 md:max-w-2xl md:mx-auto bg-white rounded-t-3xl border-t border-zinc-100">
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-zinc-900">Nueva orden</p>
                  <p className="text-sm text-zinc-500">Crea una orden en nombre del cliente.</p>
                </div>
                <button type="button" className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center" onClick={() => setCreateOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-900">Cliente</p>
                  <select className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900" value={createClientId} onChange={(e) => setCreateClientId(e.target.value)}>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-900">Inicio</p>
                  <input className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900" type="datetime-local" value={createStartLocal} onChange={(e) => setCreateStartLocal(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-900">Servicio (opcional)</p>
                  <select className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900" value={createServiceId} onChange={(e) => setCreateServiceId(e.target.value)}>
                    <option value="">Sin servicio</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-900">Barbero</p>
                  <select className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900" value={createBarberId} onChange={(e) => setCreateBarberId(e.target.value)} disabled={!createServiceId}>
                    <option value="">Sin barbero</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900">Productos</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {products.slice(0, 12).map((p) => (
                    <div key={p.id} className="rounded-2xl border border-zinc-200 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{p.title}</p>
                        <p className="text-xs text-zinc-500">{formatMoney(p.price)}</p>
                      </div>
                      <input
                        className="h-10 w-16 rounded-xl border border-zinc-200 px-2 text-sm font-semibold text-zinc-900"
                        type="number"
                        min={0}
                        value={createProductQty[p.id] ?? 0}
                        onChange={(e) => setCreateProductQty((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-500">Muestra 12 productos (la lista completa se agregará en la siguiente iteración).</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-900">Notas</p>
                <Input value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} placeholder="Notas (opcional)" className="h-11 rounded-2xl" />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="rounded-full flex-1" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button className="rounded-full flex-1 bg-zinc-900 hover:bg-zinc-800" disabled={submitting} onClick={submitCreate}>
                  Crear
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Cerrar" onClick={() => setEditOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 md:max-w-2xl md:mx-auto bg-white rounded-t-3xl border-t border-zinc-100">
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-zinc-900">Editar orden</p>
                  <p className="text-xs text-zinc-500 truncate">{editOrderId}</p>
                </div>
                <button type="button" className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center" onClick={() => setEditOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-900">Estado</p>
                  <select className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900" value={editStatus} onChange={(e) => setEditStatus(e.target.value as OrderStatus)}>
                    <option value="agendado">Agendado</option>
                    <option value="proceso">En proceso</option>
                    <option value="completado">Completado</option>
                    <option value="pagado">Pagado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-900">Inicio</p>
                  <input className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900" type="datetime-local" value={editStartLocal} onChange={(e) => setEditStartLocal(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-900">Barbero</p>
                  <select className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900" value={editBarberId} onChange={(e) => setEditBarberId(e.target.value)}>
                    <option value="">Sin barbero</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-900">Notas</p>
                  <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notas (opcional)" className="h-11 rounded-2xl" />
                </div>
              </div>

              <Card className="rounded-2xl border-zinc-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Ítems</CardTitle>
                  <div className="text-xs text-zinc-500">{`${editItems.length} ítem(s)`}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-200 p-3">
                      <p className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-primary" />
                        Servicios
                      </p>
                      <div className="mt-2 space-y-2">
                        {services.slice(0, 6).map((s) => (
                          <button key={s.id} type="button" className="w-full text-left text-sm text-zinc-700 hover:text-zinc-900" onClick={() => addEditItem('servicio', s.id)}>
                            {s.title}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 p-3">
                      <p className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                        Productos
                      </p>
                      <div className="mt-2 space-y-2">
                        {products.slice(0, 6).map((p) => (
                          <button key={p.id} type="button" className="w-full text-left text-sm text-zinc-700 hover:text-zinc-900" onClick={() => addEditItem('producto', p.id)}>
                            {p.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {editItems.map((it, idx) => (
                      <div key={`${it.tipo}-${it.referencia_id}-${idx}`} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">{itemTitle(it)}</p>
                          <p className="text-xs text-zinc-500 truncate">{it.tipo}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input className="h-10 w-16 rounded-xl border border-zinc-200 px-2 text-sm font-semibold text-zinc-900" type="number" min={1} value={it.cantidad} onChange={(e) => updateEditQty(idx, Number(e.target.value))} />
                          <Button type="button" variant="outline" className="h-10 w-10 rounded-xl p-0" onClick={() => removeEditItem(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" className="rounded-full flex-1" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button className="rounded-full flex-1 bg-zinc-900 hover:bg-zinc-800" disabled={submitting} onClick={submitEdit}>
                  Guardar
                </Button>
              </div>

              <p className="text-xs text-zinc-500">Al guardar se actualiza la orden y se reemplaza el detalle con los ítems seleccionados.</p>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}


"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar, Clock, Gift, Phone, Mail, MapPin, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type OrderStatus = 'agendado' | 'proceso' | 'completado' | 'pagado' | 'cancelado';

type ClientProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

type ClientReward = {
  completed: number;
  available: boolean;
  monthlyWins: { mes: string }[];
};

type OrderRow = {
  id: string;
  status: OrderStatus;
  startAt: string;
  total: number;
};

type ItemRow = {
  orderId: string;
  type: 'servicio' | 'producto';
  refId: string;
  quantity: number;
  unitPrice: number;
};

type PurchaseSummaryRow = {
  id: string;
  title: string;
  quantity: number;
  total: number;
};

const statusLabel: Record<OrderStatus, string> = {
  agendado: 'Agendado',
  proceso: 'En proceso',
  completado: 'Completado',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
};

export default function CommercialClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params?.id;

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [reward, setReward] = useState<ClientReward | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [submittingId, startTransition] = useTransition();

  useEffect(() => {
    if (!clientId) return;
    const run = async () => {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();

      const [{ data: u }, { data: gs }, { data: gm }, { data: o }] = await Promise.all([
        supabase.from('usuarios').select('id, nombre, telefono, correo').eq('id', clientId).single(),
        supabase.from('ganadores_servicios').select('servicios_completados, disponible').eq('usuario_id', clientId).maybeSingle(),
        supabase.from('ganadores_mensuales').select('mes').eq('usuario_id', clientId).order('mes', { ascending: false }).limit(12),
        supabase.from('ordenes').select('id, estado, inicio, total').eq('usuario_id', clientId).order('creado_en', { ascending: false }).limit(200),
      ]);

      setProfile({
        id: String((u as any)?.id ?? clientId),
        name: String((u as any)?.nombre ?? 'Cliente'),
        phone: String((u as any)?.telefono ?? ''),
        email: String((u as any)?.correo ?? ''),
      });

      setReward({
        completed: Number((gs as any)?.servicios_completados ?? 0),
        available: Boolean((gs as any)?.disponible ?? false),
        monthlyWins: (gm ?? []).map((r: any) => ({ mes: String(r.mes) })),
      });

      const mappedOrders: OrderRow[] = (o ?? []).map((r: any) => ({
        id: String(r.id),
        status: String(r.estado) as OrderStatus,
        startAt: String(r.inicio),
        total: Number(r.total ?? 0),
      }));
      setOrders(mappedOrders);

      const orderIds = mappedOrders.map((x) => x.id);
      if (orderIds.length) {
        const { data: det } = await supabase
          .from('orden_detalle')
          .select('orden_id, tipo, referencia_id, cantidad, precio_unitario')
          .in('orden_id', orderIds);

        const mappedItems: ItemRow[] = (det ?? []).map((r: any) => ({
          orderId: String(r.orden_id),
          type: String(r.tipo) as 'servicio' | 'producto',
          refId: String(r.referencia_id),
          quantity: Math.max(1, Number(r.cantidad ?? 1)),
          unitPrice: Number(r.precio_unitario ?? 0),
        }));
        setItems(mappedItems);
      } else {
        setItems([]);
      }

      setLoading(false);
    };
    void run();
  }, [clientId]);

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

  const orderItemsByOrderId = useMemo(() => {
    const map = new Map<string, ItemRow[]>();
    for (const it of items) {
      const list = map.get(it.orderId) ?? [];
      list.push(it);
      map.set(it.orderId, list);
    }
    return map;
  }, [items]);

  const purchaseSummary = useMemo(() => {
    const serviceById = new Map<string, { quantity: number; total: number }>();
    const productById = new Map<string, { quantity: number; total: number }>();

    for (const it of items) {
      const total = it.quantity * it.unitPrice;
      if (it.type === 'servicio') {
        const curr = serviceById.get(it.refId) ?? { quantity: 0, total: 0 };
        serviceById.set(it.refId, { quantity: curr.quantity + it.quantity, total: curr.total + total });
      } else {
        const curr = productById.get(it.refId) ?? { quantity: 0, total: 0 };
        productById.set(it.refId, { quantity: curr.quantity + it.quantity, total: curr.total + total });
      }
    }

    return { serviceById, productById };
  }, [items]);

  const [catalogNames, setCatalogNames] = useState<{ services: Map<string, string>; products: Map<string, string> }>({
    services: new Map(),
    products: new Map(),
  });

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const serviceIds = Array.from(purchaseSummary.serviceById.keys());
      const productIds = Array.from(purchaseSummary.productById.keys());

      const [services, products] = await Promise.all([
        serviceIds.length ? supabase.from('servicios').select('id, titulo').in('id', serviceIds) : Promise.resolve({ data: [] } as any),
        productIds.length ? supabase.from('productos').select('id, titulo').in('id', productIds) : Promise.resolve({ data: [] } as any),
      ]);

      const servicesMap = new Map<string, string>();
      for (const r of services.data ?? []) servicesMap.set(String((r as any).id), String((r as any).titulo));
      const productsMap = new Map<string, string>();
      for (const r of products.data ?? []) productsMap.set(String((r as any).id), String((r as any).titulo));

      setCatalogNames({ services: servicesMap, products: productsMap });
    };
    void run();
  }, [purchaseSummary.productById, purchaseSummary.serviceById]);

  const topServices: PurchaseSummaryRow[] = useMemo(() => {
    return Array.from(purchaseSummary.serviceById.entries())
      .map(([id, v]) => ({
        id,
        title: catalogNames.services.get(id) ?? 'Servicio',
        quantity: v.quantity,
        total: v.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [catalogNames.services, purchaseSummary.serviceById]);

  const topProducts: PurchaseSummaryRow[] = useMemo(() => {
    return Array.from(purchaseSummary.productById.entries())
      .map(([id, v]) => ({
        id,
        title: catalogNames.products.get(id) ?? 'Producto',
        quantity: v.quantity,
        total: v.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [catalogNames.products, purchaseSummary.productById]);

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.from('ordenes').update({ estado: status }).eq('id', orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    });
  };

  const activeOrder = activeOrderId ? orders.find((o) => o.id === activeOrderId) ?? null : null;
  const activeOrderItems = activeOrderId ? orderItemsByOrderId.get(activeOrderId) ?? [] : [];

  return (
    <DashboardLayout role="comercial">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/commercial/clients" className="h-10 w-10 rounded-full border border-zinc-200 flex items-center justify-center shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 truncate">{profile?.name ?? 'Cliente'}</h1>
              <p className="text-sm text-zinc-500 truncate">{profile?.email ?? ''}</p>
            </div>
          </div>

          <Link href={`/commercial/orders?clientId=${clientId ?? ''}`}>
            <Button className="rounded-full">Nueva orden</Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-white border border-zinc-100 rounded-2xl" />
            <div className="h-64 bg-white border border-zinc-100 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-4 lg:col-span-1">
              <Card className="rounded-2xl border-zinc-200">
                <CardHeader>
                  <CardTitle>Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-700">
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="truncate">{profile?.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-700">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="truncate">{profile?.email || '-'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-zinc-200">
                <CardHeader>
                  <CardTitle>Premios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">Fidelidad</p>
                      <p className="text-xs text-zinc-500">{`${reward?.completed ?? 0}/10 servicios`}</p>
                      <p className="text-xs text-zinc-500">{reward?.available ? 'Premio disponible' : 'Sin premio disponible'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Sorteos mensuales</p>
                    {reward?.monthlyWins?.length ? (
                      <div className="mt-2 space-y-2">
                        {reward.monthlyWins.slice(0, 4).map((w) => (
                          <div key={w.mes} className="flex items-center gap-2 text-xs text-zinc-600">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span>{w.mes}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500">Sin premios mensuales.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <Card className="rounded-2xl border-zinc-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Órdenes</CardTitle>
                  <div className="text-xs text-zinc-500">{`${orders.length} orden(es)`}</div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-zinc-100">
                    {orders.length === 0 ? (
                      <div className="p-6 text-sm text-zinc-500">Sin órdenes registradas.</div>
                    ) : (
                      orders.map((o) => (
                        <div key={o.id} className="p-5 flex items-center justify-between gap-4">
                          <button
                            type="button"
                            className="min-w-0 text-left"
                            onClick={() => setActiveOrderId(o.id)}
                          >
                            <p className="text-sm font-semibold text-zinc-900 truncate">{o.id}</p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                {formatDay(o.startAt)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                {formatTime12(o.startAt)}
                              </span>
                            </div>
                          </button>

                          <div className="shrink-0 text-right space-y-2">
                            <p className="text-sm font-semibold text-zinc-900">{formatMoney(o.total)}</p>
                            <div className="flex items-center gap-2 justify-end">
                              <select
                                className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900"
                                value={o.status}
                                disabled={submittingId}
                                onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                              >
                                <option value="agendado">Agendado</option>
                                <option value="proceso">En proceso</option>
                                <option value="completado">Completado</option>
                                <option value="pagado">Pagado</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="rounded-2xl border-zinc-200">
                  <CardHeader>
                    <CardTitle>Servicios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {topServices.length === 0 ? (
                      <p className="text-sm text-zinc-500">Sin servicios.</p>
                    ) : (
                      topServices.map((s) => (
                        <div key={s.id} className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{s.title}</p>
                            <p className="text-xs text-zinc-500">{`${s.quantity} servicio(s)`}</p>
                          </div>
                          <p className="text-sm font-semibold text-zinc-900">{formatMoney(s.total)}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-zinc-200">
                  <CardHeader>
                    <CardTitle>Productos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {topProducts.length === 0 ? (
                      <p className="text-sm text-zinc-500">Sin productos.</p>
                    ) : (
                      topProducts.map((p) => (
                        <div key={p.id} className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{p.title}</p>
                            <p className="text-xs text-zinc-500">{`${p.quantity} unidad(es)`}</p>
                          </div>
                          <p className="text-sm font-semibold text-zinc-900">{formatMoney(p.total)}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeOrder && activeOrderId ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setActiveOrderId(null)} aria-label="Cerrar" />
          <div className="absolute left-0 right-0 bottom-0 lg:inset-0 lg:m-auto lg:max-w-2xl lg:h-fit bg-white rounded-t-3xl lg:rounded-3xl border-t border-zinc-100">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{activeOrder.id}</p>
                  <p className="text-xs text-zinc-500">{`${formatDay(activeOrder.startAt)} • ${formatTime12(activeOrder.startAt)} • ${statusLabel[activeOrder.status]}`}</p>
                </div>
                <button type="button" className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center" onClick={() => setActiveOrderId(null)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 flex items-center justify-between">
                <span className="text-sm text-zinc-500">Total</span>
                <span className="text-lg font-bold text-zinc-900">{formatMoney(activeOrder.total)}</span>
              </div>

              <div className="mt-5 space-y-3">
                {activeOrderItems.length === 0 ? (
                  <p className="text-sm text-zinc-500">Sin detalle.</p>
                ) : (
                  activeOrderItems.map((it, idx) => (
                    <div key={`${it.refId}-${idx}`} className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-zinc-900 truncate">
                        {it.type === 'servicio' ? catalogNames.services.get(it.refId) ?? 'Servicio' : catalogNames.products.get(it.refId) ?? 'Producto'}
                      </p>
                      <p className="text-sm text-zinc-500">{`${it.quantity} × ${formatMoney(it.unitPrice)}`}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft, Calendar, Clock, MapPin, Scissors, ShoppingBag, User } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type OrderStatus = 'reservada' | 'proceso' | 'completada' | 'cancelada';

type OrderItem = {
  title: string;
  price: number;
};

type OrderDetail = {
  id: string;
  status: OrderStatus;
  branch: string;
  barber: string;
  dateLabel: string;
  timeLabel: string;
  services: OrderItem[];
  products: OrderItem[];
};

const statusLabel: Record<OrderStatus, string> = {
  reservada: 'Reservada',
  proceso: 'En proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

const statusClassName: Record<OrderStatus, string> = {
  reservada: 'bg-primary text-white',
  proceso: 'bg-zinc-900 text-white',
  completada: 'bg-emerald-600 text-white',
  cancelada: 'bg-red-600 text-white',
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    const run = async () => {
      const id = params?.id;
      if (!id) return;
      const supabase = createSupabaseBrowserClient();

      const { data: o } = await supabase
        .from('orders')
        .select('id, status, branch_id, staff_id, appointment_start')
        .eq('id', id)
        .single();

      if (!o) return;

      const startAt = new Date((o as any).appointment_start as string);

      const { data: branch } = await supabase
        .from('branches')
        .select('name')
        .eq('id', (o as any).branch_id as string)
        .single();

      const staffId = (o as any).staff_id as string | null;
      const { data: staff } = staffId
        ? await supabase.from('profiles').select('first_name, last_name').eq('id', staffId).single()
        : { data: null };

      const barberName = staff ? [staff.first_name, staff.last_name].filter(Boolean).join(' ') : '';

      const { data: items } = await supabase
        .from('order_items')
        .select('item_type, service_id, product_id, quantity, subtotal_cents')
        .eq('order_id', id)
        .is('deleted_at', null);

      const serviceIds = (items ?? [])
        .filter((i: any) => i.item_type === 'service' && i.service_id)
        .map((i: any) => i.service_id as string);

      const productIds = (items ?? [])
        .filter((i: any) => i.item_type === 'product' && i.product_id)
        .map((i: any) => i.product_id as string);

      const serviceNameById = new Map<string, string>();
      const productNameById = new Map<string, string>();

      if (serviceIds.length) {
        const { data: rows } = await supabase.from('services').select('id, name').in('id', serviceIds);
        for (const r of rows ?? []) serviceNameById.set((r as any).id, (r as any).name);
      }

      if (productIds.length) {
        const { data: rows } = await supabase.from('products').select('id, name').in('id', productIds);
        for (const r of rows ?? []) productNameById.set((r as any).id, (r as any).name);
      }

      const services: OrderItem[] = [];
      const products: OrderItem[] = [];

      for (const item of items ?? []) {
        const qty = (item as any).quantity ?? 1;
        const subtotal = ((item as any).subtotal_cents ?? 0) / 100;
        const unitPrice = qty > 0 ? subtotal / qty : subtotal;

        if ((item as any).item_type === 'service') {
          services.push({
            title: serviceNameById.get((item as any).service_id as string) ?? 'Servicio',
            price: unitPrice,
          });
        } else {
          products.push({
            title: productNameById.get((item as any).product_id as string) ?? 'Producto',
            price: unitPrice,
          });
        }
      }

      const status = String((o as any).status) as 'pending' | 'confirmed' | 'completed' | 'cancelled';
      const uiStatus: OrderStatus =
        status === 'pending'
          ? 'reservada'
          : status === 'confirmed'
            ? 'proceso'
            : status === 'completed'
              ? 'completada'
              : 'cancelada';

      setOrder({
        id: (o as any).id as string,
        status: uiStatus,
        branch: (branch?.name as string) ?? '',
        barber: barberName,
        dateLabel: startAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
        timeLabel: startAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        services,
        products,
      });
    };

    void run();
  }, [params?.id]);

  const totals = useMemo(() => {
    const servicesTotal = (order?.services ?? []).reduce((s, i) => s + i.price, 0);
    const productsTotal = (order?.products ?? []).reduce((s, i) => s + i.price, 0);
    return { servicesTotal, productsTotal, total: servicesTotal + productsTotal };
  }, [order?.products, order?.services]);

  if (!order) {
    return (
      <MobileAppLayout outerClassName="bg-black" className="bg-black">
        <div className="px-6 pt-8 pb-6 flex items-center justify-center relative">
          <Link
            href="/client/orders"
            className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/20 flex items-center justify-center text-white"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        <div className="bg-white rounded-t-[56px] flex-1 px-7 pt-10 pb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Detalle de orden</h1>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-black">
      <div className="px-6 pt-8 pb-6 flex items-center justify-center relative">
        <Link
          href="/client/orders"
          className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/20 flex items-center justify-center text-white"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="bg-white rounded-t-[56px] flex-1 px-7 pt-10 pb-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Detalle de orden</h1>
            <p className="mt-1 text-sm text-zinc-500">
              <span className="font-medium">Order #:</span> <span className="text-primary font-semibold">{order.id}</span>
            </p>
          </div>
          <div className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold ${statusClassName[order.status]}`}>
            {statusLabel[order.status]}
          </div>
        </div>

        <Card className="border-zinc-200 rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{order.branch}</p>
                <p className="text-xs text-zinc-500">Sucursal</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-200 p-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-zinc-500">Fecha</p>
                  <p className="text-sm font-semibold text-zinc-900">{order.dateLabel}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-zinc-500">Hora</p>
                  <p className="text-sm font-semibold text-zinc-900">{order.timeLabel}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-3 flex items-center gap-2 col-span-2">
                <User className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-zinc-500">Colaborador</p>
                  <p className="text-sm font-semibold text-zinc-900">{order.barber}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-zinc-900">Servicios</h2>
          </div>
          <Card className="border-zinc-200 rounded-2xl">
            <CardContent className="p-4 space-y-3">
              {order.services.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-zinc-900">{s.title}</p>
                  <p className="text-sm font-semibold text-zinc-900">{`$${s.price.toFixed(2)}`}</p>
                </div>
              ))}
              <div className="h-px bg-zinc-100" />
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500">Subtotal servicios</p>
                <p className="text-sm font-semibold text-zinc-900">{`$${totals.servicesTotal.toFixed(2)}`}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-zinc-900">Productos</h2>
          </div>
          <Card className="border-zinc-200 rounded-2xl">
            <CardContent className="p-4 space-y-3">
              {order.products.length === 0 ? (
                <p className="text-sm text-zinc-500">No se compraron productos.</p>
              ) : (
                order.products.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-zinc-900">{p.title}</p>
                    <p className="text-sm font-semibold text-zinc-900">{`$${p.price.toFixed(2)}`}</p>
                  </div>
                ))
              )}
              <div className="h-px bg-zinc-100" />
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500">Subtotal productos</p>
                <p className="text-sm font-semibold text-zinc-900">{`$${totals.productsTotal.toFixed(2)}`}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200 rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-lg font-semibold text-zinc-900">Total</p>
            <p className="text-lg font-semibold text-zinc-900">{`$${totals.total.toFixed(2)}`}</p>
          </CardContent>
        </Card>
      </div>
    </MobileAppLayout>
  );
}

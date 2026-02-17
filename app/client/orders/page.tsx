"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type OrderStatus = 'reservada' | 'proceso' | 'completada' | 'cancelada';

type Order = {
  id: string;
  createdAtLabel: string;
  total: number;
  status: OrderStatus;
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: rows } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .order('created_at', { ascending: false })
        .is('deleted_at', null);

      const ids = (rows ?? []).map((r: any) => r.id as string);
      const totalsByOrder = new Map<string, number>();
      if (ids.length) {
        const { data: items } = await supabase
          .from('order_items')
          .select('order_id, subtotal_cents')
          .in('order_id', ids)
          .is('deleted_at', null);

        for (const item of items ?? []) {
          const orderId = (item as any).order_id as string;
          const subtotal = ((item as any).subtotal_cents as number) ?? 0;
          totalsByOrder.set(orderId, (totalsByOrder.get(orderId) ?? 0) + subtotal);
        }
      }

      const mapped = (rows ?? []).map((r: any) => {
        const createdAt = new Date(r.created_at as string);
        const createdAtLabel = createdAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        const status = String(r.status) as 'pending' | 'confirmed' | 'completed' | 'cancelled';
        const uiStatus: OrderStatus =
          status === 'pending'
            ? 'reservada'
            : status === 'confirmed'
              ? 'proceso'
              : status === 'completed'
                ? 'completada'
                : 'cancelada';
        const total = (totalsByOrder.get(r.id as string) ?? 0) / 100;
        return { id: r.id as string, createdAtLabel, total, status: uiStatus } satisfies Order;
      });

      setOrders(mapped);
    };

    void run();
  }, []);

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-black">
      <div className="px-6 pt-8 pb-6 flex items-center justify-center relative">
        <Link
          href="/client/profile"
          className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/20 flex items-center justify-center text-white"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="bg-white rounded-t-[56px] flex-1 px-7 pt-10 pb-10">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">Mis ordenes</h1>

        <div className="mt-8 space-y-4">
          {orders.map((o) => (
            <Link key={o.id} href={`/client/orders/${o.id}`} className="block">
              <Card className="border-zinc-200 rounded-2xl">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base text-zinc-900">
                      <span className="font-medium">Order #:</span>{' '}
                      <span className="text-primary font-semibold">{o.id}</span>
                    </p>
                    <p className="text-sm text-zinc-500 mt-1">{o.createdAtLabel}</p>
                  </div>

                  <div className="shrink-0 text-right space-y-3">
                    <p className="text-2xl font-semibold text-zinc-900">{`$${o.total.toFixed(2)}`}</p>
                    <div className={`inline-flex px-5 py-2 rounded-full text-sm font-semibold ${statusClassName[o.status]}`}>
                      {statusLabel[o.status]}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </MobileAppLayout>
  );
}

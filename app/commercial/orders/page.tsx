"use client";

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';

type OrderStatus = 'reservada' | 'proceso' | 'completada' | 'cancelada';

type Order = {
  id: string;
  createdAtLabel: string;
  clientName: string;
  total: number;
  status: OrderStatus;
};

const orders: Order[] = [
  { id: '429242424', createdAtLabel: 'Lun. 3 Jul', clientName: 'Carlos Ruiz', total: 250, status: 'reservada' },
  { id: '429242425', createdAtLabel: 'Mar. 4 Jul', clientName: 'Luis Méndez', total: 430, status: 'proceso' },
  { id: '429242426', createdAtLabel: 'Mié. 5 Jul', clientName: 'Jorge Torres', total: 250, status: 'completada' },
  { id: '429242427', createdAtLabel: 'Jue. 6 Jul', clientName: 'Santiago P.', total: 250, status: 'cancelada' },
];

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

export default function CommercialOrdersPage() {
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Órdenes</h1>
          <p className="text-sm text-zinc-500 mt-1">Consulta estados y detalles de compra.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input placeholder="Buscar por cliente o # orden..." className="pl-9 h-10 rounded-2xl" />
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((o) => (
          <Link key={o.id} href={`/commercial/orders/${o.id}`} className="block">
            <Card className="border-zinc-200 rounded-2xl">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base text-zinc-900">
                    <span className="font-medium">Order #:</span>{' '}
                    <span className="text-primary font-semibold">{o.id}</span>
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">{o.createdAtLabel}</p>
                  <p className="text-sm text-zinc-900 mt-1">{o.clientName}</p>
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
  );
}


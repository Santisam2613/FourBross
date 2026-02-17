"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar, Clock, MapPin, Scissors, ShoppingBag, User } from 'lucide-react';

type OrderStatus = 'reservada' | 'proceso' | 'completada' | 'cancelada';

type OrderItem = {
  title: string;
  price: number;
};

type OrderDetail = {
  id: string;
  status: OrderStatus;
  client: string;
  branch: string;
  barber: string;
  dateLabel: string;
  timeLabel: string;
  services: OrderItem[];
  products: OrderItem[];
};

const orders: Record<string, OrderDetail> = {
  '429242424': {
    id: '429242424',
    status: 'reservada',
    client: 'Carlos Ruiz',
    branch: 'FourBross Polanco',
    barber: 'Alex',
    dateLabel: 'Lun. 3 Jul',
    timeLabel: '15:00',
    services: [{ title: 'Corte Clásico', price: 250 }],
    products: [{ title: 'Pomada Matte', price: 180 }],
  },
  '429242425': {
    id: '429242425',
    status: 'proceso',
    client: 'Luis Méndez',
    branch: 'FourBross Roma',
    barber: 'David',
    dateLabel: 'Mar. 4 Jul',
    timeLabel: '12:00',
    services: [{ title: 'Ritual FourBross', price: 400 }],
    products: [],
  },
  '429242426': {
    id: '429242426',
    status: 'completada',
    client: 'Jorge Torres',
    branch: 'FourBross Santa Fe',
    barber: 'Marco',
    dateLabel: 'Mié. 5 Jul',
    timeLabel: '16:00',
    services: [{ title: 'Barba Premium', price: 200 }],
    products: [{ title: 'Aceite de Barba', price: 220 }],
  },
  '429242427': {
    id: '429242427',
    status: 'cancelada',
    client: 'Santiago P.',
    branch: 'FourBross Polanco',
    barber: 'Alex',
    dateLabel: 'Jue. 6 Jul',
    timeLabel: '10:00',
    services: [{ title: 'Corte Clásico', price: 250 }],
    products: [],
  },
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

export default function CommercialOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const order = (params?.id && orders[params.id]) || orders['429242424'];

  const servicesTotal = order.services.reduce((s, i) => s + i.price, 0);
  const productsTotal = order.products.reduce((s, i) => s + i.price, 0);
  const total = servicesTotal + productsTotal;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/commercial/orders" aria-label="Volver">
            <Button variant="outline" size="icon" className="rounded-2xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Detalle de orden</h1>
            <p className="text-sm text-zinc-500">
              <span className="font-medium">Order #:</span> <span className="text-primary font-semibold">{order.id}</span>
            </p>
          </div>
        </div>

        <div className={`hidden md:inline-flex px-5 py-2 rounded-full text-sm font-semibold ${statusClassName[order.status]}`}>
          {statusLabel[order.status]}
        </div>
      </div>

      <Card className="rounded-2xl border-zinc-200">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-zinc-500">Cliente</p>
              <p className="text-lg font-semibold text-zinc-900 truncate">{order.client}</p>
            </div>
            <div className={`inline-flex px-5 py-2 rounded-full text-sm font-semibold md:hidden ${statusClassName[order.status]}`}>
              {statusLabel[order.status]}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-zinc-200 p-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Sucursal</p>
                <p className="text-sm font-semibold text-zinc-900 truncate">{order.branch}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-3 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Colaborador</p>
                <p className="text-sm font-semibold text-zinc-900 truncate">{order.barber}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-zinc-500">Fecha</p>
                  <p className="text-sm font-semibold text-zinc-900">{order.dateLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-zinc-500">Hora</p>
                  <p className="text-sm font-semibold text-zinc-900">{order.timeLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-zinc-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-zinc-900">Servicios</h2>
            </div>
            <div className="space-y-3">
              {order.services.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-zinc-900">{s.title}</p>
                  <p className="text-sm font-semibold text-zinc-900">{`$${s.price.toFixed(2)}`}</p>
                </div>
              ))}
            </div>
            <div className="h-px bg-zinc-100" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">Subtotal servicios</p>
              <p className="text-sm font-semibold text-zinc-900">{`$${servicesTotal.toFixed(2)}`}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-zinc-900">Productos</h2>
            </div>
            {order.products.length === 0 ? (
              <p className="text-sm text-zinc-500">No se compraron productos.</p>
            ) : (
              <div className="space-y-3">
                {order.products.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-zinc-900">{p.title}</p>
                    <p className="text-sm font-semibold text-zinc-900">{`$${p.price.toFixed(2)}`}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="h-px bg-zinc-100" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">Subtotal productos</p>
              <p className="text-sm font-semibold text-zinc-900">{`$${productsTotal.toFixed(2)}`}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-zinc-200">
        <CardContent className="p-6 flex items-center justify-between">
          <p className="text-lg font-semibold text-zinc-900">Total</p>
          <p className="text-lg font-semibold text-zinc-900">{`$${total.toFixed(2)}`}</p>
        </CardContent>
      </Card>
    </div>
  );
}


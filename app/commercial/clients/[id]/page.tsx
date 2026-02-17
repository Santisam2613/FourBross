"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, MapPin, Phone, Star, User } from 'lucide-react';

const clients: Record<
  string,
  { name: string; phone: string; email: string; loyalty: number; branch: string; lastVisit: string }
> = {
  '1': { name: 'Carlos Ruiz', phone: '55 1234 5678', email: 'carlos@mail.com', loyalty: 7, branch: 'Polanco', lastVisit: 'Hace 2 días' },
  '2': { name: 'Luis Méndez', phone: '55 4321 8765', email: 'luis@mail.com', loyalty: 3, branch: 'Roma', lastVisit: 'Hoy' },
  '3': { name: 'Jorge Torres', phone: '55 2222 1111', email: 'jorge@mail.com', loyalty: 9, branch: 'Santa Fe', lastVisit: 'Ayer' },
  '4': { name: 'Santiago P.', phone: '55 7777 1212', email: 'santi@mail.com', loyalty: 1, branch: 'Polanco', lastVisit: 'Hace 5 días' },
};

export default function CommercialClientDetailPage() {
  const params = useParams<{ id: string }>();
  const c = (params?.id && clients[params.id]) || clients['1'];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/commercial/clients" aria-label="Volver">
            <Button variant="outline" size="icon" className="rounded-2xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Detalle de cliente</h1>
            <p className="text-sm text-zinc-500">{c.lastVisit}</p>
          </div>
        </div>
        <Link href="/commercial/orders" className="hidden md:block">
          <Button className="rounded-full">Ver órdenes</Button>
        </Link>
      </div>

      <Card className="rounded-2xl border-zinc-200">
        <CardContent className="p-6 flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-900">{c.name}</p>
              <div className="mt-2 flex flex-col gap-2 text-sm text-zinc-600">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{c.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{`Sucursal: ${c.branch}`}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm text-zinc-500">Fidelidad</p>
            <p className="text-3xl font-semibold text-zinc-900">{`${c.loyalty}/10`}</p>
            <div className="mt-2 w-40 bg-zinc-200 rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${c.loyalty * 10}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-end gap-1 text-yellow-600">
              <Star className="h-4 w-4 fill-yellow-500" />
              <span className="text-sm">{(3.5 + c.loyalty / 10).toFixed(1)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


import Link from 'next/link';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { BackButton } from '@/components/ui/BackButton';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type OrderStatus = 'reservada' | 'proceso' | 'completada' | 'cancelada';

type OrderRow = {
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

export default async function OrdersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from('ordenes')
    .select('id, estado, creado_en, total')
    .order('creado_en', { ascending: false });

  if (error) throw new Error(error.message);

  const orders: OrderRow[] = (rows ?? []).map((r: any) => {
    const createdAt = new Date(r.creado_en as string);
    const createdAtLabel = createdAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const status = String(r.estado) as 'agendado' | 'proceso' | 'completado' | 'pagado' | 'cancelado';
    const uiStatus: OrderStatus =
      status === 'agendado'
        ? 'reservada'
        : status === 'proceso'
          ? 'proceso'
          : status === 'completado' || status === 'pagado'
            ? 'completada'
            : 'cancelada';
    return { id: r.id as string, createdAtLabel, total: Number(r.total ?? 0), status: uiStatus };
  });

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-black">
      <div className="px-6 pt-8 pb-6 flex items-center justify-center relative">
        <BackButton
          className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/20 flex items-center justify-center text-white"
          aria-label="Volver"
        />
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
                    <p className="text-2xl font-semibold text-zinc-900">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(o.total)}
                    </p>
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

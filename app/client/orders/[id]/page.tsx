import Link from 'next/link';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft, Calendar, Clock, MapPin, Scissors, ShoppingBag, User } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type OrderStatus = 'reservada' | 'proceso' | 'completada' | 'cancelada';

type OrderItem = {
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type OrderDetail = {
  id: string;
  status: OrderStatus;
  branch: string;
  branchAddress: string;
  barber: string;
  hasBarber: boolean;
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

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data: o, error: orderError } = await supabase
    .from('ordenes')
    .select('id, estado, sucursal_id, barbero_id, inicio, creado_en, total')
    .eq('id', id)
    .single();

  if (orderError || !o) {
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

  const hasBarber = Boolean((o as any).barbero_id);
  const referenceAt = hasBarber
    ? new Date((o as any).inicio as string)
    : new Date(((o as any).creado_en as string | null) ?? ((o as any).inicio as string));
  const formatTime12 = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'pm' : 'am';
    const hours12 = h % 12 || 12;
    return `${hours12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const [{ data: branch }, { data: staff }, { data: items }] = await Promise.all([
    supabase.from('sucursales').select('nombre, direccion').eq('id', (o as any).sucursal_id as string).single(),
    (o as any).barbero_id
      ? supabase.from('usuarios').select('nombre').eq('id', (o as any).barbero_id as string).single()
      : Promise.resolve({ data: null } as any),
    supabase.from('orden_detalle').select('tipo, referencia_id, cantidad, precio_unitario').eq('orden_id', id),
  ]);

  const serviceIds = Array.from(
    new Set(
      (items ?? [])
        .filter((i: any) => i.tipo === 'servicio' && i.referencia_id)
        .map((i: any) => i.referencia_id as string)
    )
  );
  const productIds = Array.from(
    new Set(
      (items ?? [])
        .filter((i: any) => i.tipo === 'producto' && i.referencia_id)
        .map((i: any) => i.referencia_id as string)
    )
  );

  const [serviceRows, productRows] = await Promise.all([
    serviceIds.length ? supabase.from('servicios').select('id, titulo').in('id', serviceIds) : Promise.resolve({ data: [] } as any),
    productIds.length ? supabase.from('productos').select('id, titulo').in('id', productIds) : Promise.resolve({ data: [] } as any),
  ]);

  const serviceNameById = new Map<string, string>();
  for (const r of serviceRows.data ?? []) serviceNameById.set((r as any).id, (r as any).titulo);
  const productNameById = new Map<string, string>();
  for (const r of productRows.data ?? []) productNameById.set((r as any).id, (r as any).titulo);

  const services: OrderItem[] = [];
  const products: OrderItem[] = [];
  for (const item of items ?? []) {
    const unitPrice = Number((item as any).precio_unitario ?? 0);
    const quantity = Math.max(1, Number((item as any).cantidad ?? 1));
    const total = unitPrice * quantity;
    if ((item as any).tipo === 'servicio') {
      services.push({
        title: serviceNameById.get((item as any).referencia_id as string) ?? 'Servicio',
        quantity,
        unitPrice,
        total,
      });
    } else {
      products.push({
        title: productNameById.get((item as any).referencia_id as string) ?? 'Producto',
        quantity,
        unitPrice,
        total,
      });
    }
  }

  const status = String((o as any).estado) as 'agendado' | 'proceso' | 'completado' | 'pagado' | 'cancelado';
  const uiStatus: OrderStatus =
    status === 'agendado'
      ? 'reservada'
      : status === 'proceso'
        ? 'proceso'
        : status === 'completado' || status === 'pagado'
          ? 'completada'
          : 'cancelada';

  const order: OrderDetail = {
    id: (o as any).id as string,
    status: uiStatus,
    branch: (branch as any)?.nombre ?? '',
    branchAddress: (branch as any)?.direccion ?? '',
    barber: (staff as any)?.nombre ?? '',
    hasBarber,
    dateLabel: referenceAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
    timeLabel: formatTime12(referenceAt),
    services,
    products,
  };

  const servicesTotal = services.reduce((s, i) => s + i.total, 0);
  const productsTotal = products.reduce((s, i) => s + i.total, 0);
  const totals = { servicesTotal, productsTotal, total: Number((o as any).total ?? servicesTotal + productsTotal) };
  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-black">
      <div className="px-6 pt-8 pb-6 flex items-center justify-center relative">
        <BackButton
          className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/20 flex items-center justify-center text-white"
          aria-label="Volver"
        />
        <h1 className="text-white text-xl font-semibold tracking-tight">Detalle de orden</h1>
      </div>

      <div className="bg-white rounded-t-[56px] flex-1 px-7 pt-8 pb-10 space-y-6">
        <Card className="border-zinc-200 rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-zinc-500">{order.hasBarber ? 'Servicio' : 'Compra'}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">Orden</p>
                <p className="mt-2 text-xs text-zinc-500 break-all">{order.id}</p>
              </div>
              <div className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold ${statusClassName[order.status]}`}>
                {statusLabel[order.status]}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-200 p-3">
                <p className="text-xs text-zinc-500">Total</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatMoney(totals.total)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-3">
                <p className="text-xs text-zinc-500">Fecha y hora</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{order.dateLabel}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{order.timeLabel}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 rounded-3xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{order.branch}</p>
                <p className="text-xs text-zinc-500 truncate">{order.branchAddress || 'Sucursal'}</p>
              </div>
            </div>

            {order.hasBarber ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{order.barber}</p>
                  <p className="text-xs text-zinc-500">Barbero</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-zinc-900">Servicios</h2>
          </div>
          <Card className="border-zinc-200 rounded-3xl">
            <CardContent className="p-5 space-y-3">
              {order.services.length === 0 ? (
                <p className="text-sm text-zinc-500">No se reservaron servicios.</p>
              ) : (
                order.services.map((s, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{s.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{`${s.quantity} × ${formatMoney(s.unitPrice)}`}</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900">{formatMoney(s.total)}</p>
                  </div>
                ))
              )}
              <div className="h-px bg-zinc-100" />
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500">Subtotal servicios</p>
                <p className="text-sm font-semibold text-zinc-900">{formatMoney(totals.servicesTotal)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-zinc-900">Productos</h2>
          </div>
          <Card className="border-zinc-200 rounded-3xl">
            <CardContent className="p-5 space-y-3">
              {order.products.length === 0 ? (
                <p className="text-sm text-zinc-500">No se compraron productos.</p>
              ) : (
                order.products.map((p, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{p.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{`${p.quantity} × ${formatMoney(p.unitPrice)}`}</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900">{formatMoney(p.total)}</p>
                  </div>
                ))
              )}
              <div className="h-px bg-zinc-100" />
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500">Subtotal productos</p>
                <p className="text-sm font-semibold text-zinc-900">{formatMoney(totals.productsTotal)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200 rounded-3xl">
          <CardContent className="p-5 flex items-center justify-between">
            <p className="text-lg font-semibold text-zinc-900">Total</p>
            <p className="text-lg font-semibold text-zinc-900">{formatMoney(totals.total)}</p>
          </CardContent>
        </Card>
      </div>
    </MobileAppLayout>
  );
}

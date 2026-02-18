import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import { Users, ShoppingBag, TrendingUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RecentClientRow = {
  id: string;
  name: string;
  email: string;
  lastVisitLabel: string;
  loyalty: number;
};

export default async function CommercialDashboard() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const { data: me } = userId ? await supabase.from('usuarios').select('sucursal_id').eq('id', userId).single() : { data: null };
  const branchId = (me as any)?.sucursal_id as string | null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    { count: clientsCount },
    { count: ordersTodayCount },
    { data: recentOrders },
  ] = await Promise.all([
    branchId
      ? supabase
          .from('usuarios')
          .select('id', { count: 'exact', head: true })
          .eq('rol', 'cliente')
          .eq('activo', true)
          .eq('sucursal_id', branchId)
      : supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('rol', 'cliente').eq('activo', true),
    branchId
      ? supabase
          .from('ordenes')
          .select('id', { count: 'exact', head: true })
          .eq('sucursal_id', branchId)
          .gte('inicio', todayStart.toISOString())
          .lte('inicio', todayEnd.toISOString())
      : supabase
          .from('ordenes')
          .select('id', { count: 'exact', head: true })
          .gte('inicio', todayStart.toISOString())
          .lte('inicio', todayEnd.toISOString()),
    branchId
      ? supabase
          .from('ordenes')
          .select('id, usuario_id, inicio')
          .eq('sucursal_id', branchId)
          .order('inicio', { ascending: false })
          .limit(8)
      : supabase
          .from('ordenes')
          .select('id, usuario_id, inicio')
          .order('inicio', { ascending: false })
          .limit(8),
  ]);

  const recentClientIds = Array.from(new Set((recentOrders ?? []).map((o: any) => o.usuario_id as string).filter(Boolean)));

  const [{ data: recentProfiles }, { data: loyaltyRows }, { data: last90Orders }] = await Promise.all([
    recentClientIds.length
      ? supabase.from('usuarios').select('id, nombre, correo').in('id', recentClientIds)
      : Promise.resolve({ data: [] } as any),
    recentClientIds.length
      ? supabase.from('ganadores_servicios').select('usuario_id, servicios_completados, disponible').in('usuario_id', recentClientIds)
      : Promise.resolve({ data: [] } as any),
    branchId
      ? supabase
          .from('ordenes')
          .select('usuario_id')
          .eq('sucursal_id', branchId)
          .in('estado', ['completado', 'pagado'])
          .gte('inicio', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      : supabase
          .from('ordenes')
          .select('usuario_id')
          .in('estado', ['completado', 'pagado'])
          .gte('inicio', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const profileById = new Map<string, any>();
  for (const p of recentProfiles ?? []) profileById.set((p as any).id, p);

  const loyaltyById = new Map<string, number>();
  for (const r of loyaltyRows ?? []) {
    const value = Number((r as any).servicios_completados ?? 0);
    loyaltyById.set((r as any).usuario_id as string, value);
  }

  const lastVisitById = new Map<string, Date>();
  for (const o of recentOrders ?? []) {
    const uid = String((o as any).usuario_id ?? '');
    if (!uid || lastVisitById.has(uid)) continue;
    lastVisitById.set(uid, new Date((o as any).inicio as string));
  }

  const recentClients: RecentClientRow[] = recentClientIds.map((id) => {
    const p = profileById.get(id) ?? {};
    const d = lastVisitById.get(id);
    const lastVisitLabel = d ? d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    const loyalty = (loyaltyById.get(id) ?? 0) % 10;
    return {
      id,
      name: String(p.nombre ?? 'Cliente'),
      email: String(p.correo ?? ''),
      lastVisitLabel,
      loyalty,
    };
  });

  const visitsByClient = new Map<string, number>();
  for (const r of last90Orders ?? []) {
    const id = String((r as any).usuario_id ?? '');
    if (!id) continue;
    visitsByClient.set(id, (visitsByClient.get(id) ?? 0) + 1);
  }
  const uniqueClients90 = visitsByClient.size;
  const returningClients90 = Array.from(visitsByClient.values()).filter((n) => n >= 2).length;
  const retention = uniqueClients90 ? Math.round((returningClients90 / uniqueClients90) * 100) : 0;

  return (
    <DashboardLayout role="comercial">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">CRM Comercial</h1>
              <p className="text-sm text-zinc-500 mt-1">Atención presencial, seguimiento y control de órdenes.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/commercial/clients">
                <Button variant="outline" className="rounded-full">
                  Ver clientes
                </Button>
              </Link>
              <Link href="/commercial/orders">
                <Button className="rounded-full bg-zinc-900 hover:bg-zinc-800">
                  Ver órdenes
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input placeholder="Buscar cliente..." className="pl-11 h-14 rounded-full border-zinc-200 bg-white" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">Total Clientes</p>
                <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-primary">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{clientsCount ?? 0}</div>
              <p className="mt-2 text-xs text-zinc-500">Clientes activos de la sucursal</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">Órdenes Hoy</p>
                <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{ordersTodayCount ?? 0}</div>
              <p className="mt-2 text-xs text-zinc-500">Agendadas para hoy</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">Retención</p>
                <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{retention}%</div>
              <p className="mt-2 text-xs text-zinc-500">Últimos 90 días</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Clientes recientes</CardTitle>
            <div className="text-xs text-zinc-500">{recentClients.length ? `${recentClients.length} clientes` : ''}</div>
          </CardHeader>
          <CardContent className="p-0">
            {recentClients.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">Sin actividad reciente.</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {recentClients.map((client) => {
                  const initials = client.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase())
                    .join('');

                  return (
                    <Link key={client.id} href={`/commercial/clients/${client.id}`} className="block">
                      <div className="p-5 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                            {initials || 'CL'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 truncate">{client.name}</p>
                            <p className="text-xs text-zinc-500 truncate mt-1">{client.email}</p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-xs text-zinc-500">{client.lastVisitLabel}</p>
                          <div className="mt-2 w-32 bg-zinc-200 rounded-full h-2.5">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${client.loyalty * 10}%` }} />
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-1">{client.loyalty}/10</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

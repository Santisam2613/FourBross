"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type ClientRow = { id: string; name: string; phone: string; lastVisit: string; loyalty: number; rewardAvailable: boolean };

export default function CommercialClientsPage() {
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
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
      const branchId = (me?.sucursal_id as string | null) ?? null;

      const { data: profiles } = await supabase
        .from('usuarios')
        .select('id, nombre, telefono, rol, activo, sucursal_id')
        .eq('rol', 'cliente')
        .eq('activo', true)
        .eq('sucursal_id', branchId)
        .order('creado_en', { ascending: false })
        .limit(200);

      const ids = (profiles ?? []).map((p: any) => p.id as string);
      const loyaltyByClient = new Map<string, { count: number; disponible: boolean }>();

      if (ids.length) {
        const { data: rows } = await supabase
          .from('ganadores_servicios')
          .select('usuario_id, servicios_completados, disponible')
          .in('usuario_id', ids);

        for (const r of rows ?? []) {
          loyaltyByClient.set((r as any).usuario_id as string, {
            count: Number((r as any).servicios_completados ?? 0),
            disponible: Boolean((r as any).disponible ?? false),
          });
        }
      }

      const lastVisitByClient = new Map<string, string>();
      if (ids.length) {
        const { data: lastOrders } = await supabase
          .from('ordenes')
          .select('usuario_id, inicio')
          .eq('sucursal_id', branchId)
          .in('usuario_id', ids)
          .order('inicio', { ascending: false })
          .limit(400);

        for (const o of lastOrders ?? []) {
          const uid = String((o as any).usuario_id ?? '');
          if (!uid || lastVisitByClient.has(uid)) continue;
          const d = new Date((o as any).inicio as string);
          lastVisitByClient.set(uid, d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }));
        }
      }

      const mapped = (profiles ?? []).map((p: any) => {
        const loyalty = loyaltyByClient.get(p.id as string)?.count ?? 0;
        const rewardAvailable = loyaltyByClient.get(p.id as string)?.disponible ?? false;
        return {
          id: p.id as string,
          name: (p.nombre as string) || 'Cliente',
          phone: (p.telefono as string | null) ?? '',
          lastVisit: lastVisitByClient.get(p.id as string) ?? '',
          loyalty: loyalty % 10,
          rewardAvailable,
        } satisfies ClientRow;
      });

      setClients(mapped);
      setLoading(false);
    };
    void run();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
  }, [clients, query]);

  return (
    <DashboardLayout role="comercial">
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Clientes</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona tus clientes y su historial.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Buscar..."
              className="pl-9 h-10 rounded-2xl"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button className="rounded-full">Nuevo</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="rounded-2xl border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lista</CardTitle>
            <div className="text-xs text-zinc-500">{`${filtered.length} clientes`}</div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {loading ? (
                <div className="p-6 space-y-4 animate-pulse">
                  <div className="h-14 bg-zinc-100 rounded-2xl" />
                  <div className="h-14 bg-zinc-100 rounded-2xl" />
                  <div className="h-14 bg-zinc-100 rounded-2xl" />
                </div>
              ) : (
                filtered.map((c) => (
                  <Link key={c.id} href={`/commercial/clients/${c.id}`} className="block">
                    <div className="p-5 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-zinc-900 truncate">{c.name}</p>
                          {c.rewardAvailable ? (
                            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-primary text-white">
                              Premio
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{c.phone}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-zinc-500">{c.lastVisit}</p>
                        <div className="mt-2 w-32 bg-zinc-200 rounded-full h-2.5">
                          <div className="bg-primary h-2.5 rounded-full" style={{ width: `${c.loyalty * 10}%` }} />
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">{c.loyalty}/10</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  );
}

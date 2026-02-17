"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, Users, ArrowRight } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type ClientRow = { id: string; name: string; phone: string; lastVisit: string; loyalty: number };

export default function CommercialClientsPage() {
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<ClientRow[]>([]);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: me } = await supabase.from('profiles').select('selected_branch_id').eq('id', user.id).single();
      const branchId = (me?.selected_branch_id as string | null) ?? null;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .eq('role', 'client')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);

      const ids = (profiles ?? []).map((p: any) => p.id as string);
      const loyaltyByClient = new Map<string, number>();

      if (branchId && ids.length) {
        const { data: cards } = await supabase
          .from('loyalty_cards')
          .select('client_id, stamps')
          .eq('branch_id', branchId)
          .in('client_id', ids)
          .is('deleted_at', null);

        for (const c of cards ?? []) {
          loyaltyByClient.set((c as any).client_id as string, ((c as any).stamps as number) ?? 0);
        }
      }

      const mapped = (profiles ?? []).map((p: any) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Cliente';
        return {
          id: p.id as string,
          name,
          phone: (p.phone as string | null) ?? '',
          lastVisit: '',
          loyalty: (loyaltyByClient.get(p.id as string) ?? 0) % 10,
        } satisfies ClientRow;
      });

      setClients(mapped);
    };
    void run();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
  }, [clients, query]);

  return (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-zinc-200 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lista</CardTitle>
            <div className="text-xs text-zinc-500">{`${filtered.length} clientes`}</div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {filtered.map((c) => (
                <Link key={c.id} href={`/commercial/clients/${c.id}`} className="block">
                  <div className="p-5 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">{c.name}</p>
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
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200">
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/commercial/orders" className="block">
              <Button variant="outline" className="w-full rounded-2xl justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Ver órdenes
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

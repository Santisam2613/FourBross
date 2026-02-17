"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft, MapPin, Search, Star } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Branch = {
  id: string;
  name: string;
  city: string;
  address: string;
};

export default function BranchSelectionPage() {
  const router = useRouter();
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase
          .from('branches')
          .select('id, name, city, address')
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('name', { ascending: true });
        setBranches((data ?? []) as Branch[]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const filteredBranches = useMemo(() => {
    const q = city.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.city.toLowerCase().includes(q));
  }, [branches, city]);

  const selectBranch = async (branchId: string) => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ selected_branch_id: branchId }).eq('id', user.id);
    }
    router.push('/client/home');
  };

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-black">
      <div className="px-6 pt-8 pb-6 flex items-center justify-center relative">
        <Link
          href="/client/home"
          className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/20 flex items-center justify-center text-white"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-white text-4xl font-semibold tracking-tight">Sucursales</h1>
      </div>

      <div className="bg-white rounded-t-[56px] flex-1 px-7 pt-10 pb-10">
        <div className="flex flex-col items-center text-center">
          <img src="/assets/splsh_app.png" alt="FourBross" className="h-24 w-auto" />
          <p className="mt-2 text-[11px] tracking-[0.2em] text-primary uppercase">
            Search for a clinic below
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              placeholder="Ubicación"
              className="h-14 rounded-2xl border-0 bg-zinc-100 pl-12 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-primary"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <Button className="w-full h-14 rounded-b-[48px] rounded-t-xl text-base font-semibold">
            Buscar
          </Button>
        </div>

        <div className="mt-10">
          <p className="text-sm text-zinc-500 mb-4">Resultados:</p>

          <div className="space-y-5">
            {(loading ? [] : filteredBranches).map((branch) => (
              <button
                key={branch.id}
                type="button"
                className="block w-full text-left"
                onClick={() => selectBranch(branch.id)}
              >
                <Card className="border-zinc-200 overflow-hidden shadow-sm">
                  <div className="h-44 bg-zinc-200 relative">
                    <img
                      src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1600&auto=format&fit=crop"
                      alt={branch.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-zinc-900 truncate">{branch.name}</h3>
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{branch.address}</p>
                      </div>
                      <div className="shrink-0 rounded-full bg-primary px-4 py-2 text-white text-sm font-semibold">
                        {branch.city}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-primary">
                        {[1, 2, 3, 4].map((i) => (
                          <Star key={i} className="h-4 w-4 fill-primary" />
                        ))}
                        <Star className="h-4 w-4 text-zinc-300" />
                      </div>
                      <span className="text-sm text-zinc-500">4.9</span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
}

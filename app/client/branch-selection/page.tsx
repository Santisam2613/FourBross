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
  image_url?: string;
};

export default function BranchSelectionPage() {
  const router = useRouter();
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase
          .from('branches')
          .select('id, name, city, address, image_url')
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
    return branches.filter(
      (b) => b.city.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)
    );
  }, [branches, city]);

  const uniqueCities = useMemo(() => {
    const cities = branches.map((b) => b.city);
    return Array.from(new Set(cities)).sort();
  }, [branches]);

  const filteredCities = useMemo(() => {
    const q = city.trim().toLowerCase();
    if (!q) return uniqueCities;
    return uniqueCities.filter((c) => c.toLowerCase().includes(q));
  }, [uniqueCities, city]);

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
              onChange={(e) => {
                setCity(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && city && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-zinc-100 overflow-hidden z-20">
                {filteredCities.length > 0 ? (
                  filteredCities.map((c) => (
                    <button
                      key={c}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-50 text-sm text-zinc-800 border-b border-zinc-50 last:border-0"
                      onClick={() => {
                        setCity(c);
                        setShowSuggestions(false);
                      }}
                    >
                      {c}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-zinc-400" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-zinc-900">No encontramos esa ciudad</p>
                    <p className="text-xs text-zinc-500 mt-1">Estamos trabajando para llegar a más lugares.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10">
          <p className="text-sm text-zinc-500 mb-4">Resultados:</p>

          <div className="space-y-5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-zinc-200 rounded-2xl overflow-hidden shadow-sm animate-pulse">
                  <div className="h-44 bg-zinc-200" />
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="h-5 w-32 bg-zinc-200 rounded" />
                        <div className="h-3 w-48 bg-zinc-200 rounded" />
                      </div>
                      <div className="h-8 w-20 bg-zinc-200 rounded-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              filteredBranches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  className="block w-full text-left"
                  onClick={() => selectBranch(branch.id)}
                >
                  <Card className="border-zinc-200 overflow-hidden shadow-sm">
                    <div className="h-44 bg-zinc-200 relative">
                      <img
                        src={
                          branch.image_url ||
                          'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1600&auto=format&fit=crop'
                        }
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
                    </CardContent>
                  </Card>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
}

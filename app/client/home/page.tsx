"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Award, Scissors, Settings, ShoppingBag, Star, Store, ShoppingCart, User } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ClientHomePage() {
  const router = useRouter();
  const [active, setActive] = useState<'services' | 'products' | 'rewards' | 'branch'>('services');
  const [displayName, setDisplayName] = useState<string>('');
  const [stamps, setStamps] = useState<number>(0);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const details = {
    services: {
      title: 'Servicios',
      desc: 'Cortes, barba y rituales. Reserva en segundos con tu barbero favorito.',
      price: 'Desde $200',
      rating: 4.9,
      image:
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1600&auto=format&fit=crop',
      href: '/client/service-detail',
    },
    products: {
      title: 'Productos',
      desc: 'Cuidado premium para cabello y barba. Recomendados por nuestros barberos.',
      price: 'Top picks',
      rating: 4.8,
      image:
        'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1600&auto=format&fit=crop',
      href: '/client/products/1',
    },
    rewards: {
      title: 'Premios',
      desc: 'Acumula puntos, desbloquea beneficios y participa en el sorteo mensual.',
      price: 'Club',
      rating: 4.7,
      image:
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop',
      href: '/client/rewards',
    },
    branch: {
      title: 'Sucursal',
      desc: 'Elige la ubicación que más te convenga y revisa disponibilidad.',
      price: 'CDMX',
      rating: 4.9,
      image:
        'https://images.unsplash.com/photo-1599351431202-6e0c06e76553?q=80&w=1600&auto=format&fit=crop',
      href: '/client/branch-selection',
    },
  } as const;

  const activeDetails = details[active];
  const stampsProgress = useMemo(() => {
    const current = Math.max(0, stamps % 10);
    return { current, target: 10 };
  }, [stamps]);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, selected_branch_id')
        .eq('id', user.id)
        .single();

      const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
      setDisplayName(fullName);
      
      if (!profile?.selected_branch_id) {
        router.push('/client/branch-selection');
        return;
      }
      
      setSelectedBranchId(profile.selected_branch_id);

      if (profile?.selected_branch_id) {
        const { data: card } = await supabase
          .from('loyalty_cards')
          .select('stamps')
          .eq('client_id', user.id)
          .eq('branch_id', profile.selected_branch_id)
          .maybeSingle();
        setStamps(card?.stamps ?? 0);
      }
    };
    void run();
  }, []);
  const openActive = () => {
    if (active === 'services') {
      router.push('/client/service-detail');
      return;
    }
    if (active === 'products') {
      router.push('/client/products/1');
      return;
    }
    if (active === 'branch') {
      router.push('/client/branch-selection');
      return;
    }
  };

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50 pb-24">
      <header className="bg-white px-6 pt-6 pb-4 flex items-center justify-between sticky top-0 z-10 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center text-white border-2 border-primary">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-none">{`Hola, ${displayName || ''}`}</h2>
            <p className="text-xs text-zinc-500">Bienvenido donde el estilo cobra vida</p>
          </div>
        </div>
        <Link href="/client/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Settings className="h-5 w-5 text-zinc-700" />
          </Button>
        </Link>
      </header>

      <div className="p-6 space-y-6">
        <section className="space-y-2">
          <h3 className="text-3xl font-semibold tracking-tight">Tarjeta Digital</h3>
          <p className="text-sm text-zinc-500">{`Para reclamar tu corte gratis estas en ${stampsProgress.current}/${stampsProgress.target}`}</p>

          <Card className="border-zinc-200 overflow-hidden rounded-3xl">
            <CardContent className="p-0">
              <div className="bg-zinc-100 p-6">
                <div className="grid grid-cols-5 gap-4 place-items-center">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Scissors
                      key={i}
                      className={i <= stampsProgress.current ? 'h-6 w-6 text-primary' : 'h-6 w-6 text-zinc-800'}
                    />
                  ))}
                  {[6, 7, 8, 9, 10].map((i) => (
                    <Scissors
                      key={i}
                      className={i <= stampsProgress.current ? 'h-6 w-6 text-primary' : 'h-6 w-6 text-zinc-800'}
                    />
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900 p-4">
                <Button variant="secondary" className="w-full bg-transparent text-white hover:bg-transparent">
                  Reclamar
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setActive('services')}
            aria-pressed={active === 'services'}
            className={`flex-1 w-full rounded-full h-14 flex items-center justify-center ${
              active === 'services' ? 'bg-primary text-white' : 'bg-black text-white'
            }`}
          >
            <Scissors className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setActive('products')}
            aria-pressed={active === 'products'}
            className={`flex-1 w-full rounded-full h-14 flex items-center justify-center ${
              active === 'products' ? 'bg-primary text-white' : 'bg-black text-white'
            }`}
          >
            <ShoppingBag className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setActive('rewards')}
            aria-pressed={active === 'rewards'}
            className={`flex-1 w-full rounded-full h-14 flex items-center justify-center ${
              active === 'rewards' ? 'bg-primary text-white' : 'bg-black text-white'
            }`}
          >
            <Award className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/client/branch-selection')}
            aria-pressed={active === 'branch'}
            className={`flex-1 w-full rounded-full h-14 flex items-center justify-center ${
              active === 'branch' ? 'bg-primary text-white' : 'bg-black text-white'
            }`}
          >
            <Store className="h-6 w-6" />
          </button>
        </section>

        <section className="space-y-4">
          <button
            type="button"
            className="block w-full text-left"
            onClick={openActive}
            aria-label="Abrir detalles"
          >
            <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
            <div className="h-52 bg-zinc-200 relative">
              <img
                src={activeDetails.image}
                alt={activeDetails.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-zinc-900 truncate">{activeDetails.title}</h3>
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{activeDetails.desc}</p>
                </div>
                <div className="shrink-0 rounded-full bg-primary px-4 py-2 text-white text-sm font-semibold">
                  {activeDetails.price}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-0.5 text-primary">
                  {[1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-primary" />
                  ))}
                  <Star className="h-4 w-4 text-zinc-300" />
                </div>
                <span className="text-sm text-zinc-500">{activeDetails.rating}</span>
              </div>
            </CardContent>
          </Card>
          </button>
        </section>
      </div>

      <div className="fixed bottom-6 left-0 right-0 md:max-w-[430px] md:mx-auto px-6 flex justify-end pointer-events-none">
        <Link href="/client/cart" className="pointer-events-auto">
          <div className="relative h-14 w-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center">
            <ShoppingCart className="h-6 w-6" />
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center border-2 border-white">
              1
            </div>
          </div>
        </Link>
      </div>
    </MobileAppLayout>
  );
}

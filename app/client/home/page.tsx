"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Award, Scissors, Settings, ShoppingBag, Star, Store, ShoppingCart, User, MapPin } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ClientHomePage() {
  const router = useRouter();
  const [active, setActive] = useState<'services' | 'products' | 'rewards' | 'branch'>('services');
  const [displayName, setDisplayName] = useState<string>('');
  const [stamps, setStamps] = useState<number>(0);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string>('');
  const [branchAddress, setBranchAddress] = useState<string>('');
  const [branchImage, setBranchImage] = useState<string>('');
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      try {
        const sRaw = window.localStorage.getItem('fourbross.cartServices');
        const pRaw = window.localStorage.getItem('fourbross.cartProducts');
        const s = sRaw ? JSON.parse(sRaw) : [];
        const p = pRaw ? JSON.parse(pRaw) : [];
        
        let legacy = 0;
        if (s.length === 0) {
            if (window.localStorage.getItem('fourbross.orderDraft')) legacy = 1;
        }

        const productsCount = (p ?? []).reduce((acc: number, item: unknown) => {
          if (!item || typeof item !== 'object') return acc + 1;
          const qty = 'quantity' in item ? Number((item as { quantity?: unknown }).quantity ?? 1) : 1;
          return acc + Math.max(1, qty);
        }, 0);
        setCartCount(s.length + productsCount + legacy);
      } catch {
        setCartCount(0);
      }
    };
    
    updateCount();
    window.addEventListener('focus', updateCount);
    return () => window.removeEventListener('focus', updateCount);
  }, []);
  
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const stampsProgress = useMemo(() => {
    const current = Math.max(0, stamps % 10);
    return { current, target: 10 };
  }, [stamps]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: usuario } = await supabase
          .from('usuarios')
          .select('nombre, sucursal_id')
          .eq('id', user.id)
          .single();

        setDisplayName(usuario?.nombre ?? '');
        
        if (!usuario?.sucursal_id) {
          router.push('/client/branch-selection');
          return;
        }
        
        setSelectedBranchId(usuario.sucursal_id);

        if (usuario.sucursal_id) {
          const [
            { data: branch },
            { data: sData },
            { data: pData },
            { data: loyalty }
          ] = await Promise.all([
            supabase
              .from('sucursales')
              .select('nombre, imagen, direccion')
              .eq('id', usuario.sucursal_id)
              .single(),
            supabase
              .from('servicios')
              .select('*')
              .eq('sucursal_id', usuario.sucursal_id)
              .eq('activo', true)
              .order('titulo'),
            supabase
              .from('productos')
              .select('*')
              .eq('sucursal_id', usuario.sucursal_id)
              .eq('activo', true)
              .order('titulo'),
            supabase
              .from('ganadores_servicios')
              .select('servicios_completados, disponible')
              .eq('usuario_id', user.id)
              .single()
          ]);

          if (branch) {
            setBranchName(branch.nombre);
            setBranchImage(branch.imagen || '');
            setBranchAddress(branch.direccion || '');
          }
          setServices(sData || []);
          setProducts(pData || []);
          setStamps(loyalty?.servicios_completados ?? 0);
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);
  const openActive = () => {
    if (active === 'services') {
      // No hacemos nada, ya que el detalle depende del servicio seleccionado
      return;
    }
    if (active === 'products') {
      // Igual, depende del producto
      return;
    }
    if (active === 'branch') {
      router.push('/client/branch-selection');
      return;
    }
  };

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50 pb-24">
      {loading ? (
        <div className="flex-1 flex flex-col p-6 space-y-8 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-zinc-200" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-zinc-200 rounded" />
                <div className="h-3 w-48 bg-zinc-200 rounded" />
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-zinc-200" />
          </div>

          <div className="space-y-2">
            <div className="h-8 w-48 bg-zinc-200 rounded" />
            <div className="h-4 w-full bg-zinc-200 rounded" />
            <div className="h-64 w-full bg-zinc-200 rounded-3xl mt-4" />
          </div>

          <div className="flex gap-4">
            <div className="h-14 flex-1 rounded-full bg-zinc-200" />
            <div className="h-14 flex-1 rounded-full bg-zinc-200" />
            <div className="h-14 flex-1 rounded-full bg-zinc-200" />
            <div className="h-14 flex-1 rounded-full bg-zinc-200" />
          </div>

          <div className="space-y-4">
            <div className="h-72 w-full bg-zinc-200 rounded-3xl" />
            <div className="h-72 w-full bg-zinc-200 rounded-3xl" />
          </div>
        </div>
      ) : (
        <>
          <header className="bg-white px-6 pt-6 pb-4 flex items-center justify-between sticky top-0 z-10 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-black flex items-center justify-center text-white border-2 border-primary">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-none">{`Hola, ${displayName || ''}`}</h2>
                {branchName && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span>{branchName}</span>
                    {branchAddress && <span className="text-zinc-400">• {branchAddress}</span>}
                  </div>
                )}
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
          {active === 'services' && (
            <div className="space-y-4">
              {services.length > 0 ? (
                services.map((service) => (
                  <button
                    key={service.id}
                    className="block w-full text-left"
                    onClick={() => router.push(`/client/service-detail/${service.id}`)}
                  >
                    <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
                      <div className="h-52 bg-zinc-200 relative">
                        <img
                          src={service.imagen || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1600&auto=format&fit=crop'}
                          alt={service.titulo}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="font-bold text-zinc-900 truncate">{service.titulo}</h3>
                            <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{service.descripcion}</p>
                          </div>
                          <div className="shrink-0 rounded-full bg-primary px-4 py-2 text-white text-sm font-semibold">
                            {formatPrice(Number(service.precio))}
                          </div>
                        </div>
                        <div className="mt-3">
                          <span className="text-xs text-zinc-500">{service.tiempo_servicio} min</span>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center">
                    <Scissors className="h-8 w-8 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-zinc-900">Sin servicios disponibles</p>
                    <p className="text-sm text-zinc-500">Intenta buscar en otra sucursal o vuelve más tarde.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === 'products' && (
            <div className="space-y-4">
              {products.length > 0 ? (
                products.map((product) => (
                  <button
                    key={product.id}
                    className="block w-full text-left"
                    onClick={() => router.push(`/client/products/${product.id}`)}
                  >
                    <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
                      <div className="h-52 bg-zinc-200 relative">
                        <img
                          src={product.imagen || 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1600&auto=format&fit=crop'}
                          alt={product.titulo}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="font-bold text-zinc-900 truncate">{product.titulo}</h3>
                            <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{product.descripcion}</p>
                          </div>
                          <div className="shrink-0 rounded-full bg-primary px-4 py-2 text-white text-sm font-semibold">
                            {formatPrice(Number(product.precio))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-zinc-900">Sin productos disponibles</p>
                    <p className="text-sm text-zinc-500">Intenta buscar en otra sucursal o vuelve más tarde.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === 'rewards' && (
            <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
              <div className="h-52 bg-zinc-200 relative">
                <img
                  src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop"
                  alt="Premios"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-900 truncate">Premios</h3>
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                      Acumula puntos, desbloquea beneficios y participa en el sorteo mensual.
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-primary px-4 py-2 text-white text-sm font-semibold">
                    Club
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {active === 'branch' && (
            <Card className="border-zinc-200 overflow-hidden rounded-3xl shadow-sm">
              <div className="h-52 bg-zinc-200 relative">
                <img
                  src={branchImage || 'https://images.unsplash.com/photo-1599351431202-6e0c06e76553?q=80&w=1600&auto=format&fit=crop'}
                  alt={branchName}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-900 truncate">{branchName || 'Sucursal'}</h3>
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">Tu sucursal seleccionada.</p>
                  </div>
                  <div className="shrink-0 rounded-full bg-primary px-4 py-2 text-white text-sm font-semibold">
                    <Link href="/client/branch-selection">Cambiar</Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <div className="fixed bottom-6 left-0 right-0 md:max-w-[430px] md:mx-auto px-6 flex justify-end pointer-events-none z-50">
        <Link href="/client/cart" className="pointer-events-auto">
          <div className="relative h-14 w-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center">
            <ShoppingCart className="h-6 w-6" />
            {cartCount > 0 && (
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                {cartCount}
              </div>
            )}
          </div>
        </Link>
      </div>
      </>
    )}
    </MobileAppLayout>
  );
}

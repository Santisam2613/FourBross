"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, User, ShoppingBag, MapPin, Headphones, ChevronRight, Shield, LogOut, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);
  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [countryCode, setCountryCode] = useState('+57');

  useEffect(() => {
    if (!sheetOpen) return;
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('nombre, telefono')
        .eq('id', user.id)
        .single();

      setName(usuario?.nombre ?? '');
      const raw = String(usuario?.telefono ?? '');
      setPhoneDigits(raw.startsWith('+57') ? raw.slice(3) : raw.replace(/\D/g, '').slice(-10));
    };

    void run();
  }, [sheetOpen]);

  const save = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const digits = phoneDigits.trim().replace(/\D/g, '');
    const normalizedPhone = digits ? `${countryCode}${digits}` : null;
    if (digits && digits.length !== 10) return;

    await supabase.from('usuarios').update({ nombre: name.trim(), telefono: normalizedPhone }).eq('id', user.id);

    setSheetOpen(false);
  };

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleLogoutClick = () => {
    setLogoutSheetOpen(true);
  };

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50">
      <header className="bg-primary text-white">
        <div className="px-6 pt-6 pb-5 flex items-center justify-center relative">
          <Link
            href="/client/home"
            className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/30 flex items-center justify-center text-white"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
        </div>
      </header>

      <div className="bg-zinc-50 px-6 pt-6 pb-28 space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Cuenta</h2>
          <div className="space-y-3">
            <button type="button" className="block w-full text-left" onClick={() => setSheetOpen(true)}>
              <Card className="border-zinc-200 rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-zinc-900">Editar perfil</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </CardContent>
              </Card>
            </button>

            <Link href="/client/orders" className="block">
              <Card className="border-zinc-200 rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-zinc-900">Ordenes</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/client/branch-selection" className="block">
              <Card className="border-zinc-200 rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-zinc-900">Cambiar Sucursales</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">General</h2>
          <div className="space-y-3">
            <Link href="#" className="block">
              <Card className="border-zinc-200 rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-zinc-900">Soporte</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </CardContent>
              </Card>
            </Link>

            <Link href="#" className="block">
              <Card className="border-zinc-200 rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary">
                      <Shield className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-zinc-900">Terminos y Condiciones</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </CardContent>
              </Card>
            </Link>

            <button type="button" className="block w-full text-left" onClick={handleLogoutClick}>
              <Card className="border-zinc-200 rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary">
                      <LogOut className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-zinc-900">Cerrar sesion</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </CardContent>
              </Card>
            </button>
          </div>
        </div>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute left-0 right-0 bottom-0 md:max-w-[430px] md:mx-auto bg-white rounded-t-3xl border-t border-zinc-100">
            <div className="px-6 pt-4 pb-3 flex items-center justify-between">
              <p className="font-semibold text-zinc-900">Editar perfil</p>
              <button
                type="button"
                className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
                aria-label="Cerrar"
                onClick={() => setSheetOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <div className="space-y-3">
                <Input
                  placeholder="Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-2xl"
                />
                <div className="flex gap-3">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-12 w-20 rounded-2xl border-0 bg-zinc-100 px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0"
                  >
                    <option value="+57">+57</option>
                  </select>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="3001234567"
                    value={phoneDigits}
                    maxLength={10}
                    onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-12 rounded-2xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-full" onClick={() => setSheetOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 h-12 rounded-full bg-zinc-900 hover:bg-zinc-800" onClick={save}>
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {logoutSheetOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar"
            onClick={() => setLogoutSheetOpen(false)}
          />
          <div className="absolute left-0 right-0 bottom-0 md:max-w-[430px] md:mx-auto bg-white rounded-t-3xl border-t border-zinc-100 p-6 pb-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-4">
                <LogOut className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">¿Cerrar sesión?</h3>
              <p className="text-zinc-500">¿Estás seguro que deseas salir de tu cuenta?</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold text-base"
                onClick={signOut}
              >
                Sí, cerrar sesión
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-14 rounded-full font-semibold text-base border-zinc-200"
                onClick={() => setLogoutSheetOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </MobileAppLayout>
  );
}

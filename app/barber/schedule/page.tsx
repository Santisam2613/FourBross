"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar as CalendarIcon, Clock, MapPin, Wallet, LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function BarberSchedulePage() {
  const router = useRouter();
  const [branch, setBranch] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);
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

      try {
        const { data: me } = await supabase.from('usuarios').select('sucursal_id').eq('id', user.id).single();
        const branchId = (me as any)?.sucursal_id;

        if (branchId) {
          const { data: b } = await supabase.from('sucursales').select('*').eq('id', branchId).single();
          setBranch(b);
          
          const hours = (b as any).horario_apertura || {};
          const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          
          const formatTime = (time: string) => {
              if (!time) return '';
              const [h, m] = time.split(':').map(Number);
              const period = h >= 12 ? 'pm' : 'am';
              const hours12 = h % 12 || 12;
              return `${hours12}:${m.toString().padStart(2, '0')} ${period}`;
          };

          const list = days.map((name, i) => {
              const rule = hours[i] || hours.default || { inicio: '09:00', fin: '18:00' };
              return { 
                  day: name, 
                  open: formatTime(rule.inicio), 
                  close: formatTime(rule.fin), 
                  active: true 
              };
          });
          setSchedule(list);
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50">
      <header className="bg-primary text-white">
        <div className="px-6 pt-6 pb-5 flex items-center justify-center relative">
          <h1 className="text-xl font-semibold tracking-tight">Mi Horario</h1>
          <button 
            type="button"
            onClick={() => setLogoutSheetOpen(true)}
            className="absolute right-6 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="bg-zinc-50 px-6 pt-6 pb-24 space-y-6">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-32 w-full rounded-2xl bg-zinc-200" />
            <div className="space-y-4">
              <div className="h-6 w-56 bg-zinc-200 rounded" />
              <div className="rounded-2xl bg-white border border-zinc-100 overflow-hidden divide-y divide-zinc-100">
                {Array.from({ length: 7 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4">
                    <div className="h-4 w-24 bg-zinc-200 rounded" />
                    <div className="h-6 w-36 bg-zinc-200 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {branch && (
              <Card className="rounded-2xl border-0 shadow-lg bg-white overflow-hidden relative">
                <div className="h-32 bg-zinc-200 relative">
                  <img
                    src={branch.imagen || "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1600"}
                    alt="Sucursal"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h2 className="font-bold text-lg leading-tight">{branch.nombre}</h2>
                    <div className="flex items-center gap-1 text-xs opacity-90 mt-1">
                      <MapPin className="h-3 w-3" />
                      {branch.direccion}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-4">
              <h3 className="font-bold text-lg text-zinc-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Horario de Atención
              </h3>
              
              <Card className="rounded-2xl border-zinc-100 shadow-sm bg-white divide-y divide-zinc-100 overflow-hidden">
                {schedule.map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4">
                    <span className="font-medium text-zinc-700">{day.day}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900 bg-zinc-100 px-3 py-1 rounded-full">
                        {day.open} - {day.close}
                      </span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 md:max-w-[430px] md:mx-auto flex justify-around p-2 pb-6">
         <Link href="/barber/dashboard">
            <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-zinc-400 hover:text-zinc-600">
                <CalendarIcon className="h-6 w-6" />
                <span className="text-[10px] font-medium">Agenda</span>
            </Button>
         </Link>
         <Link href="/barber/wallet">
            <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-zinc-400 hover:text-zinc-600">
                <Wallet className="h-6 w-6" />
                <span className="text-[10px] font-medium">Billetera</span>
            </Button>
         </Link>
         <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-primary">
            <Clock className="h-6 w-6" />
            <span className="text-[10px] font-medium">Horario</span>
         </Button>
      </div>

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

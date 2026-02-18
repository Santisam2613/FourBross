"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar as CalendarIcon, Clock, ChevronRight, CheckCircle, ChevronLeft, LogOut, Wallet } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { completeService } from '@/actions/orders';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type AppointmentRow = {
  id: string;
  time: string;
  client: string;
  service: string;
  status: 'completed' | 'active' | 'pending';
};

export default function BarberDashboard() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [submittingId, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

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
        await supabase.from('usuarios').select('nombre').eq('id', user.id).single();

        const { data: orders } = await supabase
          .from('ordenes')
          .select('id, usuario_id, inicio, estado')
          .eq('barbero_id', user.id)
          .gte('inicio', range.start.toISOString())
          .lte('inicio', range.end.toISOString())
          .in('estado', ['agendado', 'proceso', 'completado', 'pagado'])
          .order('inicio', { ascending: true });

        const orderIds = (orders ?? []).map((o: any) => o.id as string);
        const clientIds = (orders ?? []).map((o: any) => o.usuario_id as string);

        const clientNameById = new Map<string, string>();
        if (clientIds.length) {
          const { data: clients } = await supabase
            .from('usuarios')
            .select('id, nombre')
            .in('id', clientIds)
            .eq('rol', 'cliente');
          for (const c of clients ?? []) {
            clientNameById.set((c as any).id, (c as any).nombre || 'Cliente');
          }
        }

        const serviceByOrder = new Map<string, string>();
        if (orderIds.length) {
          const { data: items } = await supabase
            .from('orden_detalle')
            .select('orden_id, referencia_id, tipo')
            .in('orden_id', orderIds)
            .eq('tipo', 'servicio');

          const serviceIds = (items ?? []).map((i: any) => i.referencia_id as string).filter(Boolean);
          const serviceNameById = new Map<string, string>();
          if (serviceIds.length) {
            const { data: services } = await supabase.from('servicios').select('id, titulo').in('id', serviceIds);
            for (const s of services ?? []) serviceNameById.set((s as any).id, (s as any).titulo);
          }

          for (const item of items ?? []) {
            const orderId = (item as any).orden_id as string;
            if (serviceByOrder.has(orderId)) continue;
            const name = serviceNameById.get((item as any).referencia_id as string) ?? 'Servicio';
            serviceByOrder.set(orderId, name);
          }
        }

        const mapped = (orders ?? []).map((o: any) => {
          const startAt = new Date(o.inicio as string);
          const status = String(o.estado) as 'agendado' | 'proceso' | 'completado' | 'pagado';
          const uiStatus =
            status === 'completado' || status === 'pagado' ? 'completed' : status === 'proceso' ? 'active' : 'pending';
          return {
            id: o.id as string,
            time: startAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            client: clientNameById.get(o.usuario_id as string) ?? 'Cliente',
            service: serviceByOrder.get(o.id as string) ?? 'Servicio',
            status: uiStatus,
          } satisfies AppointmentRow;
        });

        setAppointments(mapped);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [range.end, range.start]);

  const complete = (orderId: string) => {
    startTransition(async () => {
      await completeService(orderId);
      setAppointments((prev) =>
        prev.map((a) => (a.id === orderId ? { ...a, status: 'completed' } : a))
      );
    });
  };

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50">
      <header className="bg-primary text-white">
        <div className="px-6 pt-6 pb-5 flex items-center justify-center relative">
          <h1 className="text-xl font-semibold tracking-tight">Mi Agenda</h1>
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
            <div className="h-16 w-full rounded-2xl bg-white border border-zinc-100 p-2 flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-zinc-200" />
              <div className="flex flex-col items-center gap-2">
                <div className="h-4 w-52 bg-zinc-200 rounded" />
                <div className="h-3 w-16 bg-zinc-200 rounded" />
              </div>
              <div className="h-10 w-10 rounded-xl bg-zinc-200" />
            </div>

            <div className="space-y-4">
              <div className="h-5 w-40 bg-zinc-200 rounded" />
              <div className="h-24 w-full bg-white border border-zinc-100 rounded-2xl" />
              <div className="h-24 w-full bg-white border border-zinc-100 rounded-2xl" />
              <div className="h-24 w-full bg-white border border-zinc-100 rounded-2xl" />
            </div>
          </div>
        ) : (
          <>
            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-zinc-100">
              <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} className="rounded-xl h-10 w-10"> 
                  <ChevronLeft className="h-5 w-5 text-zinc-500" /> 
              </Button>
              <div className="text-center">
                  <p className="font-bold text-zinc-900 capitalize">
                      {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-zinc-500">
                      {selectedDate.getFullYear()}
                  </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => changeDate(1)} className="rounded-xl h-10 w-10"> 
                  <ChevronRight className="h-5 w-5 text-zinc-500" /> 
              </Button>
            </div>

            {/* Timeline View */}
            {appointments.length === 0 ? (
                <div className="text-center py-10 text-zinc-400">
                    <p>No tienes citas para este día</p>
                </div>
            ) : (
                <div className="relative border-l-2 border-zinc-200 ml-3 space-y-8 pl-6 py-2">
                {appointments.map((apt) => (
                    <div key={apt.id} className="relative">
                        <div className={cn(
                            "absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white",
                            apt.status === 'completed' ? 'bg-green-500' : apt.status === 'active' ? 'bg-primary ring-4 ring-primary/20' : 'bg-zinc-300'
                        )} />
                        <div className="flex items-center gap-2 mb-2">
                            <span className={cn("text-sm font-bold", apt.status === 'active' ? 'text-primary' : 'text-zinc-500')}>
                                {apt.time}
                            </span>
                            {apt.status === 'active' && (
                                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    EN PROCESO
                                </span>
                            )}
                            {apt.status === 'completed' && (
                                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> COMPLETADO
                                </span>
                            )}
                        </div>
                        
                        <Card className={cn(
                            "rounded-2xl border-l-4 overflow-hidden shadow-sm transition-all cursor-pointer",
                             apt.status === 'active' ? 'border-l-primary ring-1 ring-primary/10' : 'border-l-zinc-300 opacity-90'
                        )}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/client/orders/${apt.id}`)}
                        >
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-zinc-900 text-lg">{apt.client}</h3>
                                        <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                                            <Scissors className="h-3 w-3" /> {apt.service}
                                        </p>
                                    </div>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-10 w-10 rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-400"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/client/orders/${apt.id}`);
                                      }}
                                    >
                                      <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                                
                                {apt.status === 'active' && (
                                    <div className="mt-4 pt-4 border-t border-zinc-100">
                                        <Button
                                            className="w-full h-12 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 shadow-md shadow-green-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              complete(apt.id);
                                            }}
                                            disabled={submittingId}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" /> Completar Servicio
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ))}
                </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Nav for Barber */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 md:max-w-[430px] md:mx-auto flex justify-around p-2 pb-6">
         <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-primary">
            <CalendarIcon className="h-6 w-6" />
            <span className="text-[10px] font-medium">Agenda</span>
         </Button>
         <Link href="/barber/wallet">
            <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-zinc-400 hover:text-zinc-600">
                <Wallet className="h-6 w-6" />
                <span className="text-[10px] font-medium">Billetera</span>
            </Button>
         </Link>
         <Link href="/barber/schedule">
             <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-zinc-400 hover:text-zinc-600">
                <Clock className="h-6 w-6" />
                <span className="text-[10px] font-medium">Horario</span>
             </Button>
         </Link>
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

function Scissors(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" x2="8.12" y1="4" y2="15.88" />
        <line x1="14.47" x2="20" y1="14.48" y2="20" />
        <line x1="8.12" x2="12" y1="8.12" y2="12" />
      </svg>
    )
}

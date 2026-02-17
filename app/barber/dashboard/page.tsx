"use client";

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Clock, MapPin, User, ChevronRight, CheckCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { completeService } from '@/actions/orders';

type AppointmentRow = {
  id: string;
  time: string;
  client: string;
  service: string;
  status: 'completed' | 'active' | 'pending';
};

export default function BarberDashboard() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [initials, setInitials] = useState('BR');
  const [submittingId, startTransition] = useTransition();

  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: me } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();
      const myName = [me?.first_name, me?.last_name].filter(Boolean).join(' ').trim();
      const parts = myName.split(' ').filter(Boolean);
      setInitials((parts[0]?.[0] ?? 'B') + (parts[1]?.[0] ?? 'R'));

      const { data: orders } = await supabase
        .from('orders')
        .select('id, client_id, appointment_start, status')
        .eq('staff_id', user.id)
        .gte('appointment_start', todayRange.start.toISOString())
        .lte('appointment_start', todayRange.end.toISOString())
        .in('status', ['pending', 'confirmed', 'completed'])
        .is('deleted_at', null)
        .order('appointment_start', { ascending: true });

      const orderIds = (orders ?? []).map((o: any) => o.id as string);
      const clientIds = (orders ?? []).map((o: any) => o.client_id as string);

      const clientNameById = new Map<string, string>();
      if (clientIds.length) {
        const { data: clients } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', clientIds)
          .is('deleted_at', null);
        for (const c of clients ?? []) {
          const name = [(c as any).first_name, (c as any).last_name].filter(Boolean).join(' ') || 'Cliente';
          clientNameById.set((c as any).id, name);
        }
      }

      const serviceByOrder = new Map<string, string>();
      if (orderIds.length) {
        const { data: items } = await supabase
          .from('order_items')
          .select('order_id, service_id, item_type')
          .in('order_id', orderIds)
          .eq('item_type', 'service')
          .is('deleted_at', null);

        const serviceIds = (items ?? []).map((i: any) => i.service_id as string).filter(Boolean);
        const serviceNameById = new Map<string, string>();
        if (serviceIds.length) {
          const { data: services } = await supabase.from('services').select('id, name').in('id', serviceIds);
          for (const s of services ?? []) serviceNameById.set((s as any).id, (s as any).name);
        }

        for (const item of items ?? []) {
          const orderId = (item as any).order_id as string;
          if (serviceByOrder.has(orderId)) continue;
          const name = serviceNameById.get((item as any).service_id as string) ?? 'Servicio';
          serviceByOrder.set(orderId, name);
        }
      }

      const mapped = (orders ?? []).map((o: any) => {
        const startAt = new Date(o.appointment_start as string);
        const status = String(o.status) as 'pending' | 'confirmed' | 'completed';
        const uiStatus = status === 'completed' ? 'completed' : status === 'confirmed' ? 'active' : 'pending';
        return {
          id: o.id as string,
          time: startAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          client: clientNameById.get(o.client_id as string) ?? 'Cliente',
          service: serviceByOrder.get(o.id as string) ?? 'Servicio',
          status: uiStatus,
        } satisfies AppointmentRow;
      });

      setAppointments(mapped);
    };

    void run();
  }, [todayRange.end, todayRange.start]);

  const complete = (orderId: string) => {
    startTransition(async () => {
      await completeService(orderId);
      setAppointments((prev) =>
        prev.map((a) => (a.id === orderId ? { ...a, status: 'completed' } : a))
      );
    });
  };

  return (
    <MobileAppLayout className="bg-zinc-50">
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 p-4 flex items-center justify-between">
        <div>
           <h1 className="font-bold text-lg">Agenda de Hoy</h1>
           <p className="text-xs text-zinc-500">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">
            {initials}
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Timeline View */}
        <div className="relative border-l-2 border-zinc-200 ml-3 space-y-8 pl-6 py-2">
           {appointments.map((apt) => (
             <div key={apt.id} className="relative">
                <div className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white ${apt.status === 'completed' ? 'bg-green-500' : apt.status === 'active' ? 'bg-primary ring-4 ring-primary/20' : 'bg-zinc-300'}`} />
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${apt.status === 'active' ? 'text-primary' : 'text-zinc-500'}`}>{apt.time}</span>
                    {apt.status === 'active' && <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">EN PROCESO</span>}
                </div>
                
                <Card className={`border-l-4 ${apt.status === 'active' ? 'border-l-primary shadow-md' : 'border-l-zinc-300 opacity-90'}`}>
                   <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                         <div>
                            <h3 className="font-bold text-zinc-900">{apt.client}</h3>
                            <p className="text-sm text-zinc-500">{apt.service}</p>
                         </div>
                         <Link href={`/barber/orders/${apt.id}`}> {/* Mock link */}
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                               <ChevronRight className="h-4 w-4" />
                            </Button>
                         </Link>
                      </div>
                      
                      {apt.status === 'active' && (
                          <div className="mt-4 pt-4 border-t border-zinc-100 flex gap-2">
                             <Button
                                className="w-full h-8 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => complete(apt.id)}
                                disabled={submittingId}
                             >
                                <CheckCircle className="h-3 w-3 mr-1" /> Completar
                             </Button>
                          </div>
                      )}
                   </CardContent>
                </Card>
             </div>
           ))}
        </div>
      </div>

      {/* Bottom Nav for Barber */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 md:max-w-[430px] md:mx-auto flex justify-around p-2">
         <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-primary">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px]">Agenda</span>
         </Button>
         <Link href="/barber/wallet">
            <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-zinc-400">
                <MapPin className="h-5 w-5" /> {/* Using MapPin as placeholder icon or Wallet icon */}
                <span className="text-[10px]">Billetera</span>
            </Button>
         </Link>
         <Link href="/barber/schedule">
             <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-zinc-400">
                <Clock className="h-5 w-5" />
                <span className="text-[10px]">Horario</span>
             </Button>
         </Link>
      </div>
    </MobileAppLayout>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Star, Calendar, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Barber = { id: string; name: string; rating: number; image: string };

export default function ServiceDetailPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
  const [branchId, setBranchId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [servicePriceCents, setServicePriceCents] = useState<number>(25000);
  const [serviceDurationMinutes, setServiceDurationMinutes] = useState<number>(45);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // Mock next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
        day: d.toLocaleDateString('es-ES', { weekday: 'short' }),
        date: d.getDate(),
        full: d
    };
  });

  const selectedBarberData = selectedBarber ? barbers.find((b) => b.id === selectedBarber) : null;
  const selectedDateData = dates.find((d) => d.date === selectedDate) || dates[0];

  const selectedDateStartEnd = useMemo(() => {
    const start = new Date(selectedDateData.full);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDateData.full);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [selectedDateData.full]);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('selected_branch_id')
        .eq('id', user.id)
        .single();

      const selectedBranch = profile?.selected_branch_id as string | null;
      if (!selectedBranch) return;
      setBranchId(selectedBranch);

      const { data: staffLinks } = await supabase
        .from('staff_branches')
        .select('staff_id')
        .eq('branch_id', selectedBranch);

      const staffIds = (staffLinks ?? []).map((s: { staff_id: string }) => s.staff_id);
      if (staffIds.length) {
        const { data: staffProfiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', staffIds)
          .eq('role', 'barber')
          .is('deleted_at', null);

        const mapped = (staffProfiles ?? []).map((p: any) => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Barbero';
          return {
            id: p.id as string,
            name,
            rating: 4.9,
            image: (p.avatar_url as string | null) ?? `https://i.pravatar.cc/150?u=${p.id}`,
          } satisfies Barber;
        });
        setBarbers(mapped);
      }

      const { data: services } = await supabase
        .from('services')
        .select('id, name, price_cents, duration_minutes')
        .eq('branch_id', selectedBranch)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      const preferred =
        (services ?? []).find((s: any) => String(s.name).toLowerCase() === 'corte clásico') ?? (services ?? [])[0];

      if (preferred) {
        setServiceId(preferred.id as string);
        setServicePriceCents((preferred.price_cents as number) ?? 25000);
        setServiceDurationMinutes((preferred.duration_minutes as number) ?? 45);
      }
    };

    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!branchId || !selectedBarber) {
        setTimeSlots([]);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const dow = selectedDateData.full.getDay();

      const { data: rules } = await supabase
        .from('staff_availability')
        .select('start_time, end_time')
        .eq('branch_id', branchId)
        .eq('staff_id', selectedBarber)
        .eq('day_of_week', dow)
        .eq('is_active', true)
        .is('deleted_at', null);

      const rule = (rules ?? [])[0] as { start_time: string; end_time: string } | undefined;
      if (!rule) {
        setTimeSlots([]);
        return;
      }

      const { data: busyOrders } = await supabase
        .from('orders')
        .select('appointment_start, appointment_end, status')
        .eq('staff_id', selectedBarber)
        .in('status', ['pending', 'confirmed'])
        .gte('appointment_start', selectedDateStartEnd.start.toISOString())
        .lte('appointment_start', selectedDateStartEnd.end.toISOString())
        .is('deleted_at', null);

      const busy = (busyOrders ?? []).map((o: any) => ({
        start: new Date(o.appointment_start as string).getTime(),
        end: new Date(o.appointment_end as string).getTime(),
      }));

      const [startH, startM] = String(rule.start_time).split(':').map((x) => Number(x));
      const [endH, endM] = String(rule.end_time).split(':').map((x) => Number(x));

      const dayStart = new Date(selectedDateData.full);
      dayStart.setHours(startH, startM || 0, 0, 0);
      const dayEnd = new Date(selectedDateData.full);
      dayEnd.setHours(endH, endM || 0, 0, 0);

      const durationMs = serviceDurationMinutes * 60 * 1000;
      const slots: string[] = [];

      for (let t = dayStart.getTime(); t + durationMs <= dayEnd.getTime(); t += 60 * 60 * 1000) {
        const slotStart = t;
        const slotEnd = t + durationMs;
        const overlaps = busy.some((b) => slotStart < b.end && slotEnd > b.start);
        if (!overlaps) {
          const d = new Date(slotStart);
          slots.push(d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }));
        }
      }

      setTimeSlots(slots);
      setSelectedTime(null);
    };

    void run();
  }, [branchId, selectedBarber, selectedDateData.full, selectedDateStartEnd.end, selectedDateStartEnd.start, serviceDurationMinutes]);

  const canContinue =
    (step === 1 && !!selectedBarber) ||
    (step === 2 && !!selectedDate) ||
    (step === 3 && !!selectedTime) ||
    step === 4;

  const continueLabel =
    step === 1 ? 'Elegir fecha' : step === 2 ? 'Elegir hora' : step === 3 ? 'Revisar' : 'Agregar al carrito';

  const goNext = () => {
    if (!canContinue) return;
    if (step < 4) setStep((s) => (s + 1) as 2 | 3 | 4);
    else {
      if (!branchId || !serviceId || !selectedBarber || !selectedTime) return;
      const [hh, mm] = selectedTime.split(':').map((x) => Number(x));
      const start = new Date(selectedDateData.full);
      start.setHours(hh, mm || 0, 0, 0);
      const end = new Date(start.getTime() + serviceDurationMinutes * 60 * 1000);

      const draft = {
        branchId,
        staffId: selectedBarber,
        staffName: selectedBarberData?.name ?? '',
        serviceId,
        serviceName: 'Corte Clásico',
        servicePriceCents,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };

      try {
        window.localStorage.setItem('fourbross.orderDraft', JSON.stringify(draft));
      } catch {
      }

      router.push('/client/cart');
    }
  };

  const goBack = () => {
    if (step === 1) router.push('/client/home');
    else setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  return (
    <MobileAppLayout>
      <div className="relative h-64 bg-zinc-900">
         <img src="https://images.unsplash.com/photo-1599351431202-6e0c06e76553?q=80&w=2056&auto=format&fit=crop" alt="Service" className="w-full h-full object-cover opacity-60" />
         <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-white">
                <Button variant="ghost" size="icon" className="rounded-full bg-black/20 hover:bg-black/40 text-white" onClick={goBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
         </div>
         <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
            <h1 className="text-3xl font-bold">Corte Clásico</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-300">
                <span className="font-bold text-white">{`$${Math.round(servicePriceCents / 100)} MXN`}</span>
                <span>•</span>
                <span>{`${serviceDurationMinutes} min`}</span>
            </div>
         </div>
      </div>

      <div className="p-6 space-y-6 pb-36">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={cn(
                  "h-2.5 w-10 rounded-full transition-colors",
                  n <= step ? "bg-primary" : "bg-zinc-200"
                )}
              />
            ))}
          </div>
          <div className="text-xs text-zinc-500">{`Paso ${step} de 4`}</div>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-lg">Descripción</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Experiencia tradicional de barbería. Incluye lavado de cabello, corte con tijera y máquina, acabado con navaja en cuello y peinado con productos premium.
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Elige tu barbero</h3>
              {selectedBarberData ? (
                <div className="text-xs text-zinc-500">{`Seleccionado: ${selectedBarberData.name}`}</div>
              ) : (
                <div className="text-xs text-zinc-500">Selecciona uno</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {barbers.map((barber) => {
                const active = selectedBarber === barber.id;
                return (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => setSelectedBarber(barber.id)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "border-zinc-200 bg-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-full overflow-hidden border-2",
                          active ? "border-primary" : "border-zinc-100"
                        )}
                      >
                        <img src={barber.image} alt={barber.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-semibold truncate", active ? "text-primary" : "text-zinc-900")}>
                          {barber.name}
                        </p>
                        <div className="flex items-center text-xs text-yellow-600">
                          <Star className="h-3 w-3 fill-yellow-500 mr-1" />
                          {barber.rating}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Elige la fecha</h3>
              <div className="text-xs text-zinc-500">{selectedDateData.full.toLocaleDateString('es-ES')}</div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 hide-scrollbar">
              {dates.map((d, i) => {
                const active = selectedDate === d.date;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDate(d.date)}
                    className={cn(
                      "shrink-0 px-4 py-3 rounded-2xl border flex items-center gap-3 transition-colors",
                      active ? "border-primary bg-primary/5" : "border-zinc-200 bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center font-bold",
                        active ? "bg-primary text-white" : "bg-zinc-100 text-zinc-900"
                      )}
                    >
                      {d.date}
                    </div>
                    <div className="text-left">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">{d.day}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{d.full.toLocaleDateString('es-ES', { month: 'short' })}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Elige la hora</h3>
              <div className="text-xs text-zinc-500">{selectedTime ? selectedTime : 'Selecciona una hora'}</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {timeSlots.map((time) => {
                const active = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "h-12 rounded-full border flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
                      active ? "border-primary bg-primary text-white" : "border-zinc-200 bg-white text-zinc-900"
                    )}
                  >
                    <Clock className={cn("h-4 w-4", active ? "text-white" : "text-primary")} />
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Revisión</h3>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">Corte Clásico</p>
                  <p className="text-xs text-zinc-500">{`${serviceDurationMinutes} min • $${Math.round(
                    servicePriceCents / 100
                  )} MXN`}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-zinc-50 p-3 border border-zinc-100">
                  <p className="text-xs text-zinc-500">Barbero</p>
                  <p className="text-sm font-semibold text-zinc-900">{selectedBarberData ? selectedBarberData.name : '-'}</p>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3 border border-zinc-100">
                  <p className="text-xs text-zinc-500">Fecha</p>
                  <p className="text-sm font-semibold text-zinc-900">{selectedDateData.full.toLocaleDateString('es-ES')}</p>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3 border border-zinc-100 col-span-2">
                  <p className="text-xs text-zinc-500">Hora</p>
                  <p className="text-sm font-semibold text-zinc-900">{selectedTime ? selectedTime : '-'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-zinc-100 md:max-w-[430px] md:mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-full w-24"
            onClick={goBack}
          >
            Atrás
          </Button>
          <Button
            className="flex-1 text-base h-12 shadow-sm rounded-full"
            disabled={!canContinue}
            onClick={goNext}
          >
            {continueLabel}
          </Button>
        </div>
      </div>
    </MobileAppLayout>
  );
}

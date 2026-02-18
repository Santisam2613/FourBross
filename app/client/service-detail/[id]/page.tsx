"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar, Clock, Check, Scissors, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Barber = { id: string; name: string; rating: number; image: string };

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
  const [branchId, setBranchId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [serviceData, setServiceData] = useState<any>(null);
  const [servicePriceCents, setServicePriceCents] = useState<number>(0);
  const [serviceDurationMinutes, setServiceDurationMinutes] = useState<number>(0);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [timeSlots, setTimeSlots] = useState<
    { time24: string; label: string; available: boolean; freeBarberIds: string[] }[]
  >([]);

  // Mock next 7 days
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
        day: d.toLocaleDateString('es-ES', { weekday: 'short' }),
        date: d.getDate(),
        full: d
    };
  }), []);

  const selectedBarberData = selectedBarber ? barbers.find((b) => b.id === selectedBarber) : null;
  const selectedDateData = dates.find((d) => d.date === selectedDate) || dates[0];
  const selectedSlot = selectedTime ? timeSlots.find((s) => s.time24 === selectedTime) : null;
  const availableBarbers = useMemo(() => {
    const ids = new Set(selectedSlot?.freeBarberIds ?? []);
    return barbers.filter((b) => ids.has(b.id));
  }, [barbers, selectedSlot?.freeBarberIds]);

  const formatTime12 = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map((x) => Number(x));
    const period = h >= 12 ? 'pm' : 'am';
    const hours12 = h % 12 || 12;
    return `${hours12}:${String(m || 0).padStart(2, '0')} ${period}`;
  };

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

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('sucursal_id')
        .eq('id', user.id)
        .single();

      const selectedBranch = (usuario?.sucursal_id as string | null) ?? null;
      if (!selectedBranch) return;
      setBranchId(selectedBranch);

      const { data: staffRows, error } = await supabase
        .from('usuarios')
        .select('id, nombre, sucursal_id, rol, activo')
        .eq('rol', 'barbero')
        .eq('sucursal_id', selectedBranch)
        .eq('activo', true);

      if (error) console.error('Error fetching barbers:', error);


      const mapped = (staffRows ?? []).map((p: any) => {
        return {
          id: p.id as string,
          name: (p.nombre as string) || 'Barbero',
          rating: 4.9,
          image: `https://i.pravatar.cc/150?u=${p.id}`,
        } satisfies Barber;
      });
      setBarbers(mapped);

      if (params?.id) {
        const { data: service } = await supabase
          .from('servicios')
          .select('id, titulo, precio, tiempo_servicio, descripcion, imagen')
          .eq('id', params.id)
          .single();

        if (service) {
          setServiceData(service);
          setServiceId(service.id);
          setServicePriceCents(Number(service.precio ?? 0));
          setServiceDurationMinutes((service.tiempo_servicio as number) ?? 45);
        }
      }
    };

    void run();
  }, [params?.id]);

  useEffect(() => {
    const run = async () => {
      if (!branchId || barbers.length === 0 || serviceDurationMinutes <= 0) {
        setTimeSlots([]);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const dow = selectedDateData.full.getDay();
      const barberIds = barbers.map((b) => b.id);

      const { data: branch } = await supabase
        .from('sucursales')
        .select('horario_apertura')
        .eq('id', branchId)
        .single();

      const hours = (branch?.horario_apertura as any) ?? {};
      const rule = (hours[String(dow)] ?? hours[dow] ?? hours.default ?? null) as
        | { inicio?: string; fin?: string }
        | null;

      const inicioRegla = rule?.inicio ?? '09:00';
      const finRegla = rule?.fin ?? '18:00';

      const { data: busyOrders } = await supabase
        .from('ordenes')
        .select('barbero_id, inicio, fin, estado')
        .in('barbero_id', barberIds)
        .in('estado', ['agendado', 'proceso'])
        .gte('inicio', selectedDateStartEnd.start.toISOString())
        .lte('inicio', selectedDateStartEnd.end.toISOString());

      const busyByBarber = new Map<string, { start: number; end: number }[]>();
      for (const id of barberIds) busyByBarber.set(id, []);
      for (const o of (busyOrders ?? []) as any[]) {
        const id = String((o as any).barbero_id ?? '');
        if (!id) continue;
        const list = busyByBarber.get(id) ?? [];
        list.push({
          start: new Date((o as any).inicio as string).getTime(),
          end: new Date((o as any).fin as string).getTime(),
        });
        busyByBarber.set(id, list);
      }

      const [startH, startM] = String(inicioRegla).split(':').map((x) => Number(x));
      const [endH, endM] = String(finRegla).split(':').map((x) => Number(x));

      const dayStart = new Date(selectedDateData.full);
      dayStart.setHours(startH, startM || 0, 0, 0);
      const dayEnd = new Date(selectedDateData.full);
      dayEnd.setHours(endH, endM || 0, 0, 0);

      const durationMs = serviceDurationMinutes * 60 * 1000;
      const marginMs = 15 * 60 * 1000; // 15 min margin
      const slots: { time24: string; label: string; available: boolean; freeBarberIds: string[] }[] = [];

      for (let t = dayStart.getTime(); t + durationMs <= dayEnd.getTime(); t += (durationMs + marginMs)) {
        const slotStart = t;
        const slotEnd = t + durationMs;
        const freeBarberIds = barberIds.filter((id) => {
          const busy = busyByBarber.get(id) ?? [];
          const overlaps = busy.some((b) => slotStart < b.end && slotEnd > b.start);
          return !overlaps;
        });
        const d = new Date(slotStart);
        const time24 = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        slots.push({
          time24,
          label: formatTime12(time24),
          available: freeBarberIds.length > 0,
          freeBarberIds,
        });
      }

      setTimeSlots(slots);
      setSelectedTime(null);
      setSelectedBarber(null);
    };

    void run();
  }, [branchId, barbers, selectedDateData.full, selectedDateStartEnd.end, selectedDateStartEnd.start, serviceDurationMinutes]);

  const canContinue =
    (step === 1 && !!selectedDate) ||
    (step === 2 && !!selectedTime) ||
    (step === 3 && !!selectedBarber) ||
    step === 4;

  const continueLabel =
    step === 1 ? 'Elegir hora' : step === 2 ? 'Elegir barbero' : step === 3 ? 'Revisar' : 'Agregar al carrito';

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
        serviceName: serviceData?.titulo ?? 'Servicio',
        serviceImage: (serviceData?.imagen as string | null) ?? null,
        servicePriceCents,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };

      try {
        const raw = window.localStorage.getItem('fourbross.cartServices');
        const services = raw ? JSON.parse(raw) : [];
        services.push(draft);
        window.localStorage.setItem('fourbross.cartServices', JSON.stringify(services));
      } catch {
      }

      router.push('/client/cart');
    }
  };

  const goBack = () => {
    if (step === 1) router.back();
    else setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  if (!serviceData) {
      return (
          <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50 flex items-center justify-center">
              <div className="text-zinc-500">Cargando servicio...</div>
          </MobileAppLayout>
      )
  }

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50">
      <header className="bg-primary text-white">
        <div className="px-6 pt-6 pb-5 flex items-center justify-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10"
            onClick={goBack}
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">Detalle</h1>
        </div>
      </header>

      <div className="bg-zinc-50 pb-28">
        <div className="h-64 bg-zinc-200 relative">
          <img src={serviceData.imagen || "https://images.unsplash.com/photo-1599351431202-6e0c06e76553?q=80&w=2056&auto=format&fit=crop"} alt={serviceData.titulo} className="absolute inset-0 h-full w-full object-cover" />
        </div>

        <div className="px-6 pt-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{serviceData.titulo}</h2>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{serviceData.descripcion}</p>
            </div>
            <div className="shrink-0 rounded-full bg-primary px-4 py-2 text-white text-sm font-semibold">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(servicePriceCents)}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-zinc-500">
             <div className="flex items-center gap-1">
                 <Clock className="h-4 w-4" />
                 <span>{serviceDurationMinutes} min</span>
             </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 space-y-6">
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

              {step === 1 ? (
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
                              onClick={() => {
                                setSelectedDate(d.date);
                              }}
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

                {step === 2 ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Elige la hora</h3>
                    <div className="text-xs text-zinc-500">{selectedSlot?.label ? selectedSlot.label : 'Selecciona una hora'}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                    {timeSlots.map((slot) => {
                        const active = selectedTime === slot.time24;
                        return (
                        <button
                            key={slot.time24}
                            type="button"
                            onClick={() => {
                              if (!slot.available) return;
                              setSelectedTime(slot.time24);
                              setSelectedBarber(null);
                            }}
                            disabled={!slot.available}
                            className={cn(
                            "h-12 rounded-full border flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
                            active ? "border-primary bg-primary text-white" : "border-zinc-200 bg-white text-zinc-900",
                            !slot.available && "opacity-40 bg-zinc-50 text-zinc-400 cursor-not-allowed border-zinc-100"
                            )}
                        >
                            <Clock className={cn("h-4 w-4", active ? "text-white" : "text-primary", !slot.available && "text-zinc-300")} />
                            {slot.label}
                        </button>
                        );
                    })}
                    </div>
                </div>
                ) : null}

                {step === 3 ? (
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
                    {availableBarbers.map((barber) => {
                        const active = selectedBarber === barber.id;
                        return (
                        <button
                            key={barber.id}
                            type="button"
                            onClick={() => setSelectedBarber(barber.id)}
                            className={cn(
                            "rounded-2xl border p-3 text-left transition-colors relative overflow-hidden",
                            active ? "border-primary bg-primary/5" : "border-zinc-200 bg-white"
                            )}
                        >
                            <div className="flex flex-col items-center text-center gap-2">
                            <div
                                className={cn(
                                "h-14 w-14 rounded-full overflow-hidden border-2 flex items-center justify-center bg-zinc-100",
                                active ? "border-primary" : "border-zinc-100"
                                )}
                            >
                                <Scissors className={cn("h-6 w-6", active ? "text-primary" : "text-zinc-400")} />
                            </div>
                            <div className="min-w-0 w-full">
                                <p className={cn("text-xs font-semibold truncate", active ? "text-primary" : "text-zinc-900")}>
                                {barber.name}
                                </p>
                            </div>
                            </div>
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
                        <p className="text-sm font-semibold text-zinc-900">{serviceData.titulo}</p>
                        <p className="text-xs text-zinc-500">{`${serviceDurationMinutes} min • ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(servicePriceCents)}`}</p>
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
                        <p className="text-sm font-semibold text-zinc-900">
                          {selectedSlot?.label ? selectedSlot.label : selectedTime ? formatTime12(selectedTime) : '-'}
                        </p>
                        </div>
                    </div>
                    </div>
                </div>
                ) : null}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 md:max-w-[430px] md:mx-auto">
          <div className="p-4">
            <Button 
                className="w-full h-12 rounded-full bg-zinc-900 hover:bg-zinc-800"
                disabled={!canContinue}
                onClick={goNext}
            >
                {step === 4 ? <ShoppingCart className="h-5 w-5 mr-2" /> : null}
                {continueLabel}
            </Button>
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
}

"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar as CalendarIcon, Clock, MapPin, DollarSign, Wallet, ChevronRight, LogOut, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type WeeklySummary = {
  total: number;
  count: number;
  startDate: Date;
  endDate: Date;
  status: 'paid' | 'pending';
};

export default function BarberWalletPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [totalAccumulated, setTotalAccumulated] = useState(0);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orders } = await supabase
        .from('ordenes')
        .select('id, total, estado, creado_en')
        .eq('barbero_id', user.id)
        .eq('estado', 'pagado')
        .order('creado_en', { ascending: false });

      const items = (orders ?? []).map((o: any) => ({
        id: o.id,
        amount: Number(o.total ?? 0),
        date: new Date(o.creado_en),
        status: o.estado,
      }));

      setEarnings(items);

      // Calculate total
      const sum = items.reduce((acc, curr) => acc + curr.amount, 0);
      setTotalAccumulated(sum);

      // Group by week
      const weeks = new Map<string, WeeklySummary>();
      
      items.forEach(item => {
        const d = new Date(item.date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(d);
        monday.setDate(diff);
        monday.setHours(0,0,0,0);
        
        const key = monday.toISOString();
        const current = weeks.get(key) || {
          total: 0,
          count: 0,
          startDate: monday,
          endDate: new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000),
          status: 'pending' // Mock status logic
        };

        current.total += item.amount;
        current.count += 1;
        weeks.set(key, current);
      });

      setWeeklySummaries(Array.from(weeks.values()).sort((a, b) => b.startDate.getTime() - a.startDate.getTime()));
    };

    void run();
  }, []);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
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
          <h1 className="text-xl font-semibold tracking-tight">Mi Billetera</h1>
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
        {/* Total Balance Card */}
        <Card className="bg-zinc-900 text-white border-0 rounded-3xl shadow-xl shadow-zinc-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2 opacity-80">
                <Wallet className="h-5 w-5" />
                <span className="text-sm font-medium">Acumulado Total</span>
            </div>
            <div className="text-4xl font-bold tracking-tight mb-6">
                {formatMoney(totalAccumulated)}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
            <h2 className="font-bold text-lg text-zinc-900">Cortes Semanales</h2>
            
            {weeklySummaries.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                    No hay registros de pagos aún.
                </div>
            ) : (
                weeklySummaries.map((week, idx) => (
                    <Card key={idx} className="border-zinc-200 rounded-2xl shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">
                                    <CalendarIcon className="h-3 w-3" />
                                    {week.startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {week.endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </div>
                                <div className="font-bold text-zinc-900 text-lg">
                                    {formatMoney(week.total)}
                                </div>
                                <div className="text-xs text-zinc-500">
                                    {week.count} servicios realizados
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 md:max-w-[430px] md:mx-auto flex justify-around p-2 pb-6">
         <Link href="/barber/dashboard">
            <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-zinc-400 hover:text-zinc-600">
                <CalendarIcon className="h-6 w-6" />
                <span className="text-[10px] font-medium">Agenda</span>
            </Button>
         </Link>
         <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-primary">
            <Wallet className="h-6 w-6" />
            <span className="text-[10px] font-medium">Billetera</span>
         </Button>
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

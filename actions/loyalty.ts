"use server";

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getMiFidelidad() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ganadores_servicios')
    .select('usuario_id, servicios_completados, disponible')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getMonthlyWinners(monthIso: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ganadores_mensuales')
    .select('id, usuario_id, mes, reclamado, creado_en')
    .eq('mes', monthIso)
    .order('creado_en', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

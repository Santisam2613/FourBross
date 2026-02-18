"use server";

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getBranchHours(branchId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('sucursales')
    .select('id, horario_apertura')
    .eq('id', branchId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listStaffOrdersInRange(staffId: string, startIso: string, endIso: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ordenes')
    .select('id, inicio, fin, estado, sucursal_id')
    .eq('barbero_id', staffId)
    .gte('inicio', startIso)
    .lte('inicio', endIso)
    .in('estado', ['agendado', 'proceso', 'completado', 'pagado']);

  if (error) throw new Error(error.message);
  return data ?? [];
}

"use server";

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listStaffAvailability(branchId: string, staffId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff_availability')
    .select('id, day_of_week, start_time, end_time, is_active, branch_id, staff_id')
    .eq('branch_id', branchId)
    .eq('staff_id', staffId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('day_of_week', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listStaffOrdersInRange(staffId: string, startIso: string, endIso: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, appointment_start, appointment_end, status, branch_id')
    .eq('staff_id', staffId)
    .gte('appointment_start', startIso)
    .lte('appointment_start', endIso)
    .is('deleted_at', null);

  if (error) throw new Error(error.message);
  return data ?? [];
}

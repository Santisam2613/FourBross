"use server";

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getMyLoyaltyCards() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('loyalty_cards')
    .select('id, branch_id, points, stamps, tier, last_activity_at')
    .is('deleted_at', null);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getActiveRewards(branchId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('rewards')
    .select('id, title, description, required_points, stock, starts_at, ends_at')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .gt('stock', 0)
    .is('deleted_at', null)
    .order('required_points', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

"use server";

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getMyWallet() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff_wallet')
    .select('staff_id, balance_cents, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getMyPayouts() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('payouts')
    .select('id, amount_cents, status, requested_at, processed_at')
    .is('deleted_at', null)
    .order('requested_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function requestPayout(amountCents: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('payouts')
    .insert({ staff_id: user.id, amount_cents: amountCents })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

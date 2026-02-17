"use server";

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPublicSupabaseUrl } from '@/lib/env';

export type CreateOrderItem =
  | { type: 'service'; serviceId: string; quantity?: number }
  | { type: 'product'; productId: string; quantity?: number };

export type CreateOrderInput = {
  branchId: string;
  staffId: string;
  startAt: string;
  endAt: string;
  notes?: string;
  clientId?: string;
  items?: CreateOrderItem[];
};

async function getAccessToken() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error('Unauthorized');
  return token;
}

async function callEdgeFunction<T>(name: string, payload: unknown) {
  const url = getPublicSupabaseUrl();

  const token = await getAccessToken();

  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => null)) as T | { error?: string } | null;
  if (!res.ok) {
    const message = (json as { error?: string } | null)?.error ?? `Edge function error (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

export async function createOrder(input: CreateOrderInput) {
  const data = await callEdgeFunction<{ orderId: string }>('create-order', input);
  return data.orderId;
}

export async function completeService(orderId: string) {
  const data = await callEdgeFunction<{
    orderId: string;
    status: 'completed';
    earningCents: number;
    loyalty: { pointsAdded: number; stampsAdded: number };
  }>('complete-service', { orderId });
  return data;
}

export async function listMyOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, appointment_start, appointment_end, branch_id, staff_id, created_at')
    .order('appointment_start', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getOrderById(orderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, status, appointment_start, appointment_end, branch_id, staff_id, client_id, notes, created_at, completed_at, cancelled_at'
    )
    .eq('id', orderId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listOrderItems(orderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('order_items')
    .select('id, item_type, service_id, product_id, quantity, unit_price_cents, subtotal_cents')
    .eq('order_id', orderId)
    .is('deleted_at', null);

  if (error) throw new Error(error.message);
  return data ?? [];
}

import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { queueNotification } from '../_shared/notifications.ts';
import { createSupabaseAdminClient, createSupabaseUserClient } from '../_shared/supabase.ts';

type CompleteServiceInput = {
  orderId: string;
};

function floorDiv(n: number, d: number) {
  return Math.floor(n / d);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return errorResponse(405, 'Method not allowed');

  const supabaseAdmin = createSupabaseAdminClient();
  const supabaseUser = createSupabaseUserClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) return errorResponse(401, 'Unauthorized');

  let input: CompleteServiceInput;
  try {
    input = (await request.json()) as CompleteServiceInput;
  } catch {
    return errorResponse(400, 'Invalid JSON');
  }

  if (!input.orderId) return errorResponse(400, 'Missing orderId');

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.role) return errorResponse(403, 'Profile not found');
  if (profile.role !== 'barber' && profile.role !== 'admin') return errorResponse(403, 'Forbidden');

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, staff_id, client_id, branch_id, status, completed_at, deleted_at')
    .eq('id', input.orderId)
    .single();

  if (orderError || !order) return errorResponse(404, 'Order not found');
  if (order.deleted_at) return errorResponse(404, 'Order not found');

  const staffId = order.staff_id as string | null;
  if (profile.role !== 'admin' && staffId !== user.id) return errorResponse(403, 'Forbidden');

  if (order.status === 'cancelled') return errorResponse(409, 'Order is cancelled');
  if (order.status === 'completed' && order.completed_at) {
    return jsonResponse({ orderId: order.id, status: 'completed' });
  }

  const nowIso = new Date().toISOString();

  const { error: updateOrderError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'completed', completed_at: nowIso, updated_at: nowIso })
    .eq('id', order.id);

  if (updateOrderError) return errorResponse(400, 'Failed to update order', updateOrderError);

  await supabaseAdmin
    .from('appointments')
    .update({ status: 'completed', updated_at: nowIso })
    .eq('order_id', order.id);

  const { data: items, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('item_type, subtotal_cents, quantity')
    .eq('order_id', order.id)
    .is('deleted_at', null);

  if (itemsError) return errorResponse(400, 'Failed to load order items', itemsError);

  const serviceSubtotal = (items ?? [])
    .filter((i) => i.item_type === 'service')
    .reduce((acc, i) => acc + (i.subtotal_cents ?? 0), 0);

  const serviceCount = (items ?? [])
    .filter((i) => i.item_type === 'service')
    .reduce((acc, i) => acc + (i.quantity ?? 1), 0);

  const barberCommissionBps = 5000;
  const earningCents = floorDiv(serviceSubtotal * barberCommissionBps, 10000);

  if (staffId && earningCents > 0) {
    const { error: walletError } = await supabaseAdmin.rpc('credit_staff_wallet', {
      p_staff_id: staffId,
      p_amount_cents: earningCents,
      p_order_id: order.id,
      p_note: 'Servicio completado',
    });
    if (walletError) return errorResponse(400, 'Failed to credit wallet', walletError);
  }

  const points = Math.max(0, floorDiv(serviceSubtotal, 100));
  const stamps = Math.max(0, serviceCount);

  const { error: loyaltyError } = await supabaseAdmin.rpc('increment_loyalty', {
    p_client_id: order.client_id,
    p_branch_id: order.branch_id,
    p_points: points,
    p_stamps: stamps,
  });

  if (loyaltyError) return errorResponse(400, 'Failed to update loyalty', loyaltyError);

  try {
    await queueNotification(supabaseAdmin, {
      recipientId: order.client_id,
      title: 'Servicio completado',
      body: 'Tu servicio fue marcado como completado.',
      data: { orderId: order.id },
    });
  } catch {
  }

  return jsonResponse({
    orderId: order.id,
    status: 'completed',
    earningCents,
    loyalty: { pointsAdded: points, stampsAdded: stamps },
  });
});

import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { queueNotification } from '../_shared/notifications.ts';
import { createSupabaseAdminClient, createSupabaseUserClient } from '../_shared/supabase.ts';

type OrderItemInput =
  | { type: 'service'; serviceId: string; quantity?: number }
  | { type: 'product'; productId: string; quantity?: number };

type CreateOrderInput = {
  branchId: string;
  staffId: string;
  startAt: string;
  endAt: string;
  notes?: string;
  clientId?: string;
  items?: OrderItemInput[];
};

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

  let input: CreateOrderInput;
  try {
    input = (await request.json()) as CreateOrderInput;
  } catch {
    return errorResponse(400, 'Invalid JSON');
  }

  if (!input.branchId || !input.staffId || !input.startAt || !input.endAt) {
    return errorResponse(400, 'Missing required fields');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.role) return errorResponse(403, 'Profile not found');

  const role = profile.role;
  const clientId =
    role === 'client' ? user.id : role === 'commercial' || role === 'admin' ? input.clientId : null;

  if (!clientId) return errorResponse(403, 'Forbidden');

  const { data: ok, error: availabilityError } = await supabaseAdmin.rpc('is_staff_available', {
    p_staff_id: input.staffId,
    p_branch_id: input.branchId,
    p_start_at: input.startAt,
    p_end_at: input.endAt,
  });

  if (availabilityError) return errorResponse(400, 'Availability check failed', availabilityError);
  if (!ok) return errorResponse(409, 'Staff not available for requested slot');

  const items = input.items ?? [];

  const serviceIds = items.filter((i) => i.type === 'service').map((i) => i.serviceId);
  const productIds = items.filter((i) => i.type === 'product').map((i) => i.productId);

  const servicePriceById = new Map<string, number>();
  const productPriceById = new Map<string, number>();

  if (serviceIds.length) {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('id, price_cents, branch_id, is_active, deleted_at')
      .in('id', serviceIds);

    if (error) return errorResponse(400, 'Failed to load services', error);

    for (const row of data ?? []) {
      if (row.branch_id === input.branchId && row.is_active && !row.deleted_at) {
        servicePriceById.set(row.id, row.price_cents);
      }
    }
  }

  if (productIds.length) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, price_cents, branch_id, is_active, deleted_at')
      .in('id', productIds);

    if (error) return errorResponse(400, 'Failed to load products', error);

    for (const row of data ?? []) {
      if (row.branch_id === input.branchId && row.is_active && !row.deleted_at) {
        productPriceById.set(row.id, row.price_cents);
      }
    }
  }

  const nowIso = new Date().toISOString();

  const { data: createdOrder, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      client_id: clientId,
      branch_id: input.branchId,
      staff_id: input.staffId,
      appointment_start: input.startAt,
      appointment_end: input.endAt,
      status: 'pending',
      notes: input.notes ?? null,
      created_by: user.id,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('id')
    .single();

  if (orderError || !createdOrder?.id) return errorResponse(400, 'Failed to create order', orderError);

  const orderId = createdOrder.id as string;

  if (items.length) {
    const orderItemsToInsert = items.map((item) => {
      const quantity = Math.max(1, item.quantity ?? 1);

      if (item.type === 'service') {
        const unit = servicePriceById.get(item.serviceId);
        if (unit == null) throw new Error(`Invalid service ${item.serviceId}`);
        return {
          order_id: orderId,
          item_type: 'service',
          service_id: item.serviceId,
          product_id: null,
          quantity,
          unit_price_cents: unit,
          subtotal_cents: unit * quantity,
        };
      }

      const unit = productPriceById.get(item.productId);
      if (unit == null) throw new Error(`Invalid product ${item.productId}`);
      return {
        order_id: orderId,
        item_type: 'product',
        service_id: null,
        product_id: item.productId,
        quantity,
        unit_price_cents: unit,
        subtotal_cents: unit * quantity,
      };
    });

    try {
      const { error } = await supabaseAdmin.from('order_items').insert(orderItemsToInsert);
      if (error) {
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        return errorResponse(400, 'Failed to create order items', error);
      }
    } catch (e) {
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      return errorResponse(400, 'Invalid items', String(e));
    }
  }

  const { error: appointmentError } = await supabaseAdmin.from('appointments').insert({
    order_id: orderId,
    client_id: clientId,
    branch_id: input.branchId,
    staff_id: input.staffId,
    start_at: input.startAt,
    end_at: input.endAt,
    status: 'pending',
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (appointmentError) {
    await supabaseAdmin.from('orders').delete().eq('id', orderId);
    return errorResponse(400, 'Failed to create appointment', appointmentError);
  }

  try {
    await queueNotification(supabaseAdmin, {
      recipientId: input.staffId,
      title: 'Nueva orden asignada',
      body: 'Tienes una nueva cita pendiente.',
      data: { orderId },
    });
  } catch {
  }

  return jsonResponse({ orderId }, { status: 201 });
});

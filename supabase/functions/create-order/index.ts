import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { createSupabaseUserClient } from '../_shared/supabase.ts';

type OrderItemInput =
  | { type: 'service'; serviceId: string; quantity?: number }
  | { type: 'product'; productId: string; quantity?: number };

type CreateOrderInput = {
  branchId: string;
  staffId?: string | null;
  startAt?: string;
  endAt?: string;
  notes?: string;
  clientId?: string;
  items?: OrderItemInput[];
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return errorResponse(405, 'Method not allowed');

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

  const items = input.items ?? [];
  if (!input.branchId) return errorResponse(400, 'Missing branchId');
  if (items.length === 0) return errorResponse(400, 'Missing items');

  const hasService = items.some((it) => it.type === 'service');
  const staffId = input.staffId ?? null;
  let startAt = input.startAt;
  let endAt = input.endAt;

  if (hasService) {
    if (!staffId || !startAt || !endAt) return errorResponse(400, 'Missing required fields');
  } else {
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 1000);
    startAt = start.toISOString();
    endAt = end.toISOString();
  }

  const rpcItems = items.map((item) => {
    const cantidad = Math.max(1, item.quantity ?? 1);
    if (item.type === 'service') {
      return { tipo: 'servicio', referencia_id: item.serviceId, cantidad };
    }
    return { tipo: 'producto', referencia_id: item.productId, cantidad };
  });

  const { data, error } = await supabaseUser.rpc('crear_orden', {
    p_sucursal_id: input.branchId,
    p_barbero_id: hasService ? staffId : null,
    p_inicio: startAt,
    p_fin: endAt,
    p_items: rpcItems,
    p_notas: input.notes ?? null,
    p_usuario_id: input.clientId ?? null,
  });

  if (error) {
    if (error.message.includes('Forbidden')) return errorResponse(403, error.message);
    if (error.message.includes('Unauthorized')) return errorResponse(401, error.message);
    if (error.message.includes('solap')) return errorResponse(409, 'Staff not available for requested slot');
    return errorResponse(400, error.message, error);
  }

  return jsonResponse({ orderId: String(data) }, { status: 201 });
});

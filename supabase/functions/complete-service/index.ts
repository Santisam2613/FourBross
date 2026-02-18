import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { createSupabaseUserClient } from '../_shared/supabase.ts';

type CompleteServiceInput = {
  orderId: string;
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

  let input: CompleteServiceInput;
  try {
    input = (await request.json()) as CompleteServiceInput;
  } catch {
    return errorResponse(400, 'Invalid JSON');
  }

  if (!input.orderId) return errorResponse(400, 'Missing orderId');

  const { data, error } = await supabaseUser.rpc('completar_servicio', {
    p_orden_id: input.orderId,
  });

  if (error) {
    if (error.message.includes('Forbidden')) return errorResponse(403, error.message);
    if (error.message.toLowerCase().includes('no encontrada')) return errorResponse(404, error.message);
    if (error.message.toLowerCase().includes('cancelada')) return errorResponse(409, error.message);
    if (error.message.includes('Unauthorized')) return errorResponse(401, error.message);
    return errorResponse(400, error.message, error);
  }

  return jsonResponse(data);
});

import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { createSupabaseAdminClient, createSupabaseUserClient } from '../_shared/supabase.ts';

function isRaffleDay(now: Date) {
  return now.getUTCDate() === 28;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return errorResponse(405, 'Method not allowed');

  const supabaseAdmin = createSupabaseAdminClient();
  const cronSecret = Deno.env.get('FOURBROS_CRON_SECRET');

  if (cronSecret) {
    const provided = request.headers.get('x-cron-secret');
    if (!provided || provided !== cronSecret) return errorResponse(401, 'Unauthorized');
  } else {
    const supabaseUser = createSupabaseUserClient(request);
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) return errorResponse(401, 'Unauthorized');

    const { data: row } = await supabaseAdmin.from('usuarios').select('rol').eq('id', user.id).single();
    if (!row || row.rol !== 'admin') return errorResponse(403, 'Forbidden');
  }

  const now = new Date();
  if (!isRaffleDay(now)) return errorResponse(409, 'Raffle can only run on day 28 (UTC)');

  const { data, error } = await supabaseAdmin.rpc('sorteo_mensual_28');

  if (error) {
    return errorResponse(400, error.message, error);
  }

  return jsonResponse(data);
});

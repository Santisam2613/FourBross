import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { queueNotification } from '../_shared/notifications.ts';
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

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') return errorResponse(403, 'Forbidden');
  }

  const now = new Date();
  if (!isRaffleDay(now)) return errorResponse(409, 'Raffle can only run on day 28 (UTC)');

  const { data: branches, error: branchesError } = await supabaseAdmin
    .from('branches')
    .select('id')
    .eq('is_active', true)
    .is('deleted_at', null);

  if (branchesError) return errorResponse(400, 'Failed to load branches', branchesError);

  const results: Array<{ branchId: string; rewardId?: string; winnerId?: string }> = [];

  for (const branch of branches ?? []) {
    const branchId = branch.id as string;

    const { data: reward, error: rewardError } = await supabaseAdmin
      .from('rewards')
      .select('id, required_points, stock')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .gt('stock', 0)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rewardError || !reward) {
      results.push({ branchId });
      continue;
    }

    const { data: eligible, error: eligibleError } = await supabaseAdmin
      .from('loyalty_cards')
      .select('client_id')
      .eq('branch_id', branchId)
      .gte('points', reward.required_points ?? 0)
      .is('deleted_at', null)
      .limit(1000);

    if (eligibleError || !eligible?.length) {
      results.push({ branchId, rewardId: reward.id });
      continue;
    }

    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    const winnerId = winner.client_id as string;

    const { error: stockError } = await supabaseAdmin
      .from('rewards')
      .update({ stock: Math.max(0, (reward.stock ?? 0) - 1) })
      .eq('id', reward.id);

    if (stockError) {
      results.push({ branchId, rewardId: reward.id });
      continue;
    }

    await supabaseAdmin.from('reward_redemptions').insert({
      reward_id: reward.id,
      client_id: winnerId,
      order_id: null,
      points_spent: 0,
    });

    try {
      await queueNotification(supabaseAdmin, {
        recipientId: winnerId,
        title: 'Sorteo mensual',
        body: 'Felicidades, fuiste seleccionado en el sorteo mensual.',
        data: { branchId, rewardId: reward.id },
      });
    } catch {
    }

    results.push({ branchId, rewardId: reward.id, winnerId });
  }

  return jsonResponse({ ok: true, results });
});

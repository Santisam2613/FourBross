import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export async function queueNotification(
  supabaseAdmin: SupabaseClient,
  input: { recipientId: string; title: string; body: string; data?: Record<string, unknown> }
) {
  const { error } = await supabaseAdmin.from('notifications').insert({
    recipient_id: input.recipientId,
    channel: 'push',
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    provider: 'fcm',
    status: 'pending',
  });

  if (error) throw error;
}

export async function sendNotification(supabaseAdmin: SupabaseClient, notificationId: string) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ status: 'sent', sent_at: new Date().toISOString(), external_id: 'fcm_stub' })
    .eq('id', notificationId);

  if (error) throw error;
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function getEnvAny(names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  return null;
}

export function getSupabaseUrl() {
  const url = getEnvAny(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
  if (!url) throw new Error('Missing SUPABASE_URL');
  return url;
}

export function getSupabaseAnonKey() {
  const key = getEnvAny(['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);
  if (!key) throw new Error('Missing SUPABASE_ANON_KEY');
  return key;
}

export function getSupabaseServiceRoleKey() {
  const key = getEnvAny(['SUPABASE_SERVICE_ROLE_KEY', 'FOURBROS_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY']);
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return key;
}

export function createSupabaseAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
}

export function createSupabaseUserClient(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
}

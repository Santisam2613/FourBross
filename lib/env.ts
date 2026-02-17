function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function getPublicSupabaseUrl() {
  return required('NEXT_PUBLIC_SUPABASE_URL');
}

export function getPublicSupabaseAnonKey() {
  return required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function getCronSecret() {
  return process.env.FOURBROS_CRON_SECRET ?? null;
}

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from '@/lib/env';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getPublicSupabaseUrl(), getPublicSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
        }
      },
    },
  });
}

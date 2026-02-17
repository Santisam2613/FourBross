import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isRoleCode, roleHomePath, type RoleCode } from '@/types/roles';
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from '@/lib/env';

export function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(getPublicSupabaseUrl(), getPublicSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export async function getUserRoleById(
  supabase: ReturnType<typeof createSupabaseMiddlewareClient>,
  userId: string
): Promise<RoleCode | null> {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (error || !data?.role) return null;
  if (!isRoleCode(data.role)) return null;
  return data.role;
}

export async function guardRole(
  request: NextRequest,
  opts: { requiredRoles: RoleCode[]; loginPath?: string }
): Promise<NextResponse> {
  const response = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(request, response);

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    const loginPath = opts.loginPath ?? '/auth/login';
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const role = await getUserRoleById(supabase, user.id);
  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (!opts.requiredRoles.includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = roleHomePath(role);
    return NextResponse.redirect(url);
  }

  return response;
}

import { NextResponse, type NextRequest } from 'next/server';
import { guardRole } from '@/middlewares/role-guard';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/admin')) {
    return guardRole(request, { requiredRoles: ['admin'] });
  }

  if (pathname.startsWith('/commercial')) {
    return guardRole(request, { requiredRoles: ['commercial', 'admin'] });
  }

  if (pathname.startsWith('/barber')) {
    return guardRole(request, { requiredRoles: ['barber', 'admin'] });
  }

  if (pathname.startsWith('/client')) {
    return guardRole(request, { requiredRoles: ['client', 'admin'] });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/commercial/:path*', '/barber/:path*', '/client/:path*'],
};

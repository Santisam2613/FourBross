import { NextResponse, type NextRequest } from 'next/server';
import { guardRole } from '@/middlewares/role-guard';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/admin')) {
    return guardRole(request, { requiredRoles: ['admin'] });
  }

  if (pathname.startsWith('/commercial')) {
    return guardRole(request, { requiredRoles: ['comercial', 'admin'] });
  }

  if (pathname.startsWith('/barber')) {
    return guardRole(request, { requiredRoles: ['barbero', 'admin'] });
  }

  if (pathname.startsWith('/client')) {
    if (pathname.startsWith('/client/orders')) {
      return guardRole(request, { requiredRoles: ['cliente', 'barbero', 'admin'] });
    }
    return guardRole(request, { requiredRoles: ['cliente', 'admin'] });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/commercial/:path*', '/barber/:path*', '/client/:path*'],
};

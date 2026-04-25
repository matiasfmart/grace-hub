import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get('auth');

  // PL-7: If already authenticated and visiting /login → redirect to dashboard
  if (pathname === '/login' && authCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow public paths through without auth check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // PL-6: If no auth cookie, redirect to /login preserving the original destination
  if (!authCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.ico|.*\\.png|.*\\.svg).*)'],
};

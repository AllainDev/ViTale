import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PROTECTED_PATHS = ['/admin/dashboard', '/admin/products', '/admin/characters'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = ADMIN_PROTECTED_PATHS.some(path => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  // Admin key is stored in a short-lived session cookie (httpOnly=false so JS can clear it)
  // SessionStorage can't be read in middleware (server-side), so we use a session cookie
  const adminSessionCookie = request.cookies.get('admin_session');
  if (!adminSessionCookie?.value) {
    const loginUrl = new URL('/admin', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/admin/products/:path*', '/admin/characters/:path*'],
};

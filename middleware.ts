import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ============================================================
// Middleware — Protect /admin/dashboard routes
// ============================================================

const COOKIE_NAME = 'admin_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and login API
  if (
    pathname === '/admin' ||
    pathname === '/api/admin/login'
  ) {
    return NextResponse.next();
  }

  // Protect /admin/dashboard/* and /api/admin/* routes
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // API routes return 401, pages redirect to login
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/admin', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) throw new Error('No session secret');
    const key = new TextEncoder().encode(secret);
    await jwtVerify(token, key, { algorithms: ['HS256'] });
    return NextResponse.next();
  } catch {
    // Invalid token — clear it and redirect
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/admin', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/api/admin/:path*'],
};

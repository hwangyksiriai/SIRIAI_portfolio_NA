import { NextResponse } from 'next/server';
import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

export const config = {
  matcher: ['/admin/:path*'],
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await isValidSession(cookie);
  if (!valid) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

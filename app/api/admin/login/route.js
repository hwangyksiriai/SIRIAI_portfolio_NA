import { NextResponse } from 'next/server';
import { SESSION_COOKIE, expectedSessionToken } from '@/lib/auth';

export async function POST(request) {
  const { password } = await request.json();
  const configured = process.env.ADMIN_PASSWORD || '';

  if (!configured) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD not configured on the server' }, { status: 500 });
  }
  if (password !== configured) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 401 });
  }

  const token = await expectedSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

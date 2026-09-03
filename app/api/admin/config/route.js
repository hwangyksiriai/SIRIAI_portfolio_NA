import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/blobConfig';
import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

async function requireAuth(request) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  return isValidSession(cookie);
}

export async function GET(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function PUT(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const config = await request.json();
  if (!config || !Array.isArray(config.categories)) {
    return NextResponse.json({ error: 'invalid config shape' }, { status: 400 });
  }
  await saveConfig(config);
  return NextResponse.json({ ok: true });
}

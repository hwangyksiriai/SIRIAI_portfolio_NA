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
  try {
    await saveConfig(config);
  } catch (error) {
    // Almost always a missing or unreadable Blob store; either way the admin
    // needs the reason, not just "save failed".
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

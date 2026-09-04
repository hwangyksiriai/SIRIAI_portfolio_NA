import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { list } from '@vercel/blob';
import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

/* Why an upload would fail, in the admin's words. The client SDK discards this
   route's error body on a failed token request and reports only "Failed to
   retrieve the client token", so the browser asks here instead. */
export async function GET(request) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(cookie))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    /* Naming the Blob variables this deployment does have separates "the store
       was never connected" from "it was connected without the read-write token"
       from "the token landed under another name". Names only — the values are
       credentials and never leave the server. */
    const present = Object.keys(process.env).filter((k) => k.includes('BLOB')).sort();
    return NextResponse.json({
      ok: false,
      error: [
        'BLOB_READ_WRITE_TOKEN이 이 배포에 없습니다.',
        present.length
          ? `현재 들어와 있는 Blob 관련 변수: ${present.join(', ')}`
          : 'Blob 관련 환경변수가 하나도 없습니다 — 스토어가 이 프로젝트에 연결되지 않았습니다.',
        'Vercel > Storage에서 스토어 연결 시 "Add a read-write token env var"를 체크해야 이 변수가 생깁니다. 추가한 뒤 반드시 다시 배포해 주세요.',
      ].join('

'),
    });
  }
  try {
    await list({ limit: 1 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: `Blob 스토어에 접근하지 못했습니다: ${error.message}`,
    });
  }
}

export async function POST(request) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(cookie))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  /* Without a Blob store the SDK fails while signing the client token, and the
     browser only ever sees "upload failed". Say which piece is missing. */
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Blob 스토어가 연결되어 있지 않습니다 (BLOB_READ_WRITE_TOKEN 없음). Vercel 프로젝트 > Storage에서 Blob 스토어를 연결한 뒤 다시 배포해 주세요.' },
      { status: 500 }
    );
  }

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'image/png', 'image/jpeg'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: the admin UI adds the resulting URL into the config itself
        // via the normal save flow, so nothing extra needs to happen here.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

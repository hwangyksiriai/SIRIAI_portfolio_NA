import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

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

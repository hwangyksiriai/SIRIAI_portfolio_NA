import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { SESSION_COOKIE, isValidSession } from '@/lib/auth';

export async function POST(request) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(cookie))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const REMOTE_API = 'https://create-nexus.space.z.ai/api/tts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, text } = body;
    const textContent = input || text || '';

    console.log('[TTS Proxy] Text:', textContent?.substring(0, 50));

    const response = await fetch(REMOTE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textContent })
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('[TTS Proxy] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'TTS failed' 
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const REMOTE_API = 'https://create-nexus.space.z.ai/api/web-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, arguments: args } = body;
    
    console.log('[Functions Proxy] Function:', name);

    if (name === 'web_search') {
      const response = await fetch(REMOTE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: args?.query || '', num: args?.num || 10 })
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown function' }, { status: 400 });

  } catch (error: unknown) {
    console.error('[Functions Proxy] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Function failed' 
    }, { status: 500 });
  }
}

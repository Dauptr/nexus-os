import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const REMOTE_SEARCH = 'https://create-nexus.space.z.ai/api/web-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, arguments: args } = body;

    console.log('[Functions] Name:', name, 'Args:', JSON.stringify(args));

    if (name === 'web_search') {
      const response = await fetch(REMOTE_SEARCH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: args?.query || '', 
          num: args?.num || 10 
        })
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown function: ' + name }, { status: 400 });

  } catch (error: unknown) {
    console.error('[Functions] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Function failed' 
    }, { status: 500 });
  }
}

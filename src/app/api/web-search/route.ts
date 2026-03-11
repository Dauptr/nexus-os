import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const REMOTE_API = 'https://create-nexus.space.z.ai/api/web-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, num = 10 } = body;

    console.log('[Web Search] Query:', query);

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const response = await fetch(REMOTE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, num })
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('[Web Search] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Search failed' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || searchParams.get('query');
  const num = parseInt(searchParams.get('num') || '10');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    const response = await fetch(REMOTE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, num })
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: unknown) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Search failed' 
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const REMOTE_API = 'https://create-nexus.space.z.ai/api/video';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model } = body;

    console.log('[Video] Prompt:', prompt?.substring(0, 50));

    const response = await fetch(REMOTE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
    });

    const data = await response.json();
    
    // Return standardized response
    if (data.success || data.video) {
      return NextResponse.json({
        success: true,
        video: data.video || data,
        message: 'Video generation started!'
      });
    }
    
    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('[Video] Error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Video generation failed' 
    }, { status: 500 });
  }
}

// Check video status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    
    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 });
    }

    const response = await fetch(`${REMOTE_API}?taskId=${taskId}`);
    const data = await response.json();
    
    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('[Video Status] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Status check failed' 
    }, { status: 500 });
  }
}

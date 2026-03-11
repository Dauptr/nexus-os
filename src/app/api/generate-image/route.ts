import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const REMOTE_API = 'https://create-nexus.space.z.ai/api/image';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024' } = body;

    console.log('[Generate Image] Prompt:', prompt?.substring(0, 50));

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const response = await fetch(REMOTE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size })
    });

    const data = await response.json();
    
    // Return image URL directly in 'image' field for frontend compatibility
    if (data.success && data.image?.imageUrl) {
      return NextResponse.json({
        success: true,
        image: data.image.imageUrl
      });
    }
    
    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('[Generate Image] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Image generation failed' 
    }, { status: 500 });
  }
}

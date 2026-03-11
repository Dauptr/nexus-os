import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Force Node.js runtime (not Edge) to support child_process
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    console.log('[Generate Image] Received prompt:', prompt?.substring(0, 50));

    if (!prompt || typeof prompt !== 'string') {
      console.log('[Generate Image] Invalid prompt');
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('[Generate Image] Creating ZAI instance...');
    const zai = await ZAI.create();

    console.log('[Generate Image] Calling image generation API...');
    
    const response = await zai.images.generations.create({
      prompt: prompt,
      size: '1024x1024'
    });

    const imageBase64 = response.data[0]?.base64;
    
    if (!imageBase64) {
      console.log('[Generate Image] No image data in response');
      return NextResponse.json(
        { error: 'No image data received from AI' },
        { status: 500 }
      );
    }

    console.log('[Generate Image] Success! Base64 length:', imageBase64.length);

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${imageBase64}`,
      base64: imageBase64,
    });

  } catch (error: unknown) {
    console.error('[Generate Image] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

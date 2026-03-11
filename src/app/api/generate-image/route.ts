import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

// Load config
async function loadConfig() {
  const homeDir = os.homedir();
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(homeDir, '.z-ai-config'),
    '/etc/.z-ai-config'
  ];
  
  for (const filePath of configPaths) {
    try {
      const configStr = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(configStr);
      if (config.baseUrl && config.apiKey) {
        return config;
      }
    } catch (error) {
      // Continue to next path
    }
  }
  throw new Error('Configuration file not found');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024' } = body;

    console.log('[Generate Image] Received prompt:', prompt?.substring(0, 50));

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Load config
    const config = await loadConfig();
    console.log('[Generate Image] Config loaded, token present:', !!config.token);

    // Call gateway directly
    const response = await fetch(`${config.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Token': config.token,
        'X-Z-AI-From': 'Z'
      },
      body: JSON.stringify({ prompt, size })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Generate Image] Gateway error:', response.status, errorText);
      return NextResponse.json({ error: `Gateway error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    console.log('[Generate Image] Gateway response:', JSON.stringify(data).substring(0, 200));

    // Handle URL response
    if (data.data?.[0]?.url) {
      const imageUrl = data.data[0].url;
      console.log('[Generate Image] Got image URL, downloading...');
      
      // Download the image and convert to base64
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        return NextResponse.json({ error: 'Failed to download image' }, { status: 500 });
      }
      
      const arrayBuffer = await imgResponse.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      console.log('[Generate Image] Success! Base64 length:', base64.length);
      
      return NextResponse.json({
        success: true,
        image: `data:image/png;base64,${base64}`,
        base64,
        url: imageUrl
      });
    }

    // Handle base64 response
    if (data.data?.[0]?.base64) {
      return NextResponse.json({
        success: true,
        image: `data:image/png;base64,${data.data[0].base64}`,
        base64: data.data[0].base64
      });
    }

    return NextResponse.json({ error: 'No image in response', data }, { status: 500 });

  } catch (error: unknown) {
    console.error('[Generate Image] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

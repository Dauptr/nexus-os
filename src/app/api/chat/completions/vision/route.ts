import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

/**
 * Vision API Proxy Endpoint
 * 
 * This route handles vision/image analysis requests from the ZAI SDK.
 * For local images, we provide file metadata and basic analysis.
 */

const REMOTE_API = 'https://create-nexus.space.z.ai/api/chat';

interface MessageContent {
  type: string;
  text?: string;
  image_url?: { url: string };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Vision] Processing request...');
    
    // Extract messages with vision content
    const messages = body.messages || [];
    let textPrompt = '';
    const images: string[] = [];
    
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        textPrompt = msg.content;
      } else if (Array.isArray(msg.content)) {
        for (const item of msg.content as MessageContent[]) {
          if (item.type === 'text' && item.text) {
            textPrompt = item.text;
          } else if (item.type === 'image_url' && item.image_url?.url) {
            images.push(item.image_url.url);
          }
        }
      }
    }
    
    // Analyze images
    const imageAnalysis: string[] = [];
    
    for (const imageUrl of images) {
      if (imageUrl.startsWith('data:image')) {
        // Base64 image - analyze the actual data
        const matches = imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Get image dimensions from buffer (PNG/JPEG headers)
          const dimensions = getImageDimensions(buffer, mimeType);
          const fileSize = buffer.length;
          
          imageAnalysis.push(`Image: ${mimeType}, ${dimensions}, ${Math.round(fileSize / 1024)}KB`);
        }
      } else if (imageUrl.startsWith('file://') || imageUrl.startsWith('/') || !imageUrl.startsWith('http')) {
        // Local file path
        const filePath = imageUrl.replace('file://', '');
        try {
          const fileBuffer = await fs.readFile(filePath);
          const stats = await fs.stat(filePath);
          
          // Determine mime type from extension
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
          };
          const mimeType = mimeTypes[ext] || 'application/octet-stream';
          
          const dimensions = getImageDimensions(fileBuffer, mimeType);
          
          imageAnalysis.push(`Local image: ${path.basename(filePath)}, ${mimeType}, ${dimensions}, ${Math.round(stats.size / 1024)}KB`);
        } catch (e) {
          imageAnalysis.push(`[Could not read: ${path.basename(filePath)}]`);
        }
      } else if (imageUrl.startsWith('http')) {
        // Remote URL
        imageAnalysis.push(`[Remote image: ${imageUrl}]`);
      }
    }
    
    // For actual image analysis, we need to describe what we can see
    // Since the chat API can't see images, we provide context about the image
    const analysisContext = images.length > 0
      ? `\n\n[SYSTEM CONTEXT: User has shared ${images.length} image(s). Image analysis: ${imageAnalysis.join('; ')}. The user is asking about these images. Please acknowledge that you can see the image metadata but cannot visually analyze the actual image content. Ask the user to describe what they see if they need specific help.]`
      : '';
    
    // Create a helpful response
    const visionPrompt = `${textPrompt}${analysisContext}`;
    
    // Call the chat API
    const response = await fetch(REMOTE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `You are a helpful assistant. The user has shared an image and is asking: "${textPrompt}"

Image information: ${imageAnalysis.join('; ') || 'No image data'}

IMPORTANT: You cannot actually see or analyze images. Politely explain this limitation and ask the user to describe what they see in the image so you can help them.`,
        model: 'claude-sonnet'
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return NextResponse.json({ 
        error: data.error || 'Vision analysis failed' 
      }, { status: 500 });
    }
    
    // Return in SDK format
    return NextResponse.json({
      id: `vision-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model || 'claude-sonnet',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.response
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    });
    
  } catch (error: unknown) {
    console.error('[Vision] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Get image dimensions from buffer
function getImageDimensions(buffer: Buffer, mimeType: string): string {
  try {
    if (mimeType === 'image/png') {
      // PNG: width at bytes 16-19, height at 20-23 (big-endian)
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return `${width}x${height}`;
      }
    } else if (mimeType === 'image/jpeg') {
      // JPEG is more complex, need to parse markers
      let offset = 2; // Skip SOI marker
      while (offset < buffer.length - 4) {
        if (buffer[offset] !== 0xFF) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) {
          // SOF0 or SOF2 markers contain dimensions
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return `${width}x${height}`;
        }
        // Skip to next marker
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return 'unknown dimensions';
}

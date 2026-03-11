import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * ZAI SDK Proxy Endpoint
 * 
 * This route proxies requests from the ZAI SDK's /chat/completions endpoint
 * to the working /chat endpoint on the remote server.
 * 
 * The SDK calls: ${baseUrl}/chat/completions
 * We proxy to: https://create-nexus.space.z.ai/api/chat
 */

const REMOTE_API = 'https://create-nexus.space.z.ai/api/chat';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract headers from the request
    const token = request.headers.get('x-token') || '';
    const chatId = request.headers.get('x-chat-id') || '';
    const userId = request.headers.get('x-user-id') || '';
    
    console.log('[Chat/Completions] Proxying request...');
    console.log('[Chat/Completions] Headers - Token:', !!token, 'ChatId:', chatId, 'UserId:', userId);
    
    // Transform SDK format to proxy format
    const proxyBody = {
      message: body.messages?.[body.messages.length - 1]?.content || 'Hello',
      model: mapModel(body.model),
      token,
      chatId,
      userId,
    };
    
    // Call the working proxy endpoint
    const response = await fetch(REMOTE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proxyBody)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return NextResponse.json({ 
        error: data.error || 'Proxy failed' 
      }, { status: 500 });
    }
    
    // Transform response to SDK format
    return NextResponse.json({
      id: `chatcmpl-${Date.now()}`,
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
    console.error('[Chat/Completions] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Map SDK model names to proxy model names
function mapModel(model: string | undefined): string {
  if (!model) return 'haiku';
  
  const modelMap: Record<string, string> = {
    'claude-3-opus-20240229': 'claude-opus',
    'claude-3-5-sonnet-20241022': 'claude-sonnet',
    'claude-3-5-haiku-20241022': 'claude-haiku',
    'claude-sonnet-4-20250514': 'claude-sonnet',
    'opus': 'claude-opus',
    'sonnet': 'claude-sonnet',
    'haiku': 'claude-haiku',
  };
  
  return modelMap[model] || model;
}

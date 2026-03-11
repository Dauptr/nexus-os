import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Chat API with streaming support
 * 
 * Supports two modes:
 * - Normal: Returns full response
 * - Streaming: Returns chunks via server-sent events
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, systemContext, userId, model = 'haiku', stream = false } = body;

    console.log('[Chat] Received messages:', messages?.length, 'Model:', model, 'Stream:', stream);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Get last message content
    const lastMessage = messages[messages.length - 1];
    const messageContent = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : lastMessage.content?.[0]?.text || 'Hello';

    // Use proxy API that works
    const response = await fetch('https://create-nexus.space.z.ai/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageContent,
        model: model || 'haiku'
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      console.log('[Chat] Proxy error:', data);
      return NextResponse.json({ error: data.error || 'Proxy failed' }, { status: 500 });
    }

    // If streaming requested, simulate word-by-word streaming
    if (stream) {
      const encoder = new TextEncoder();
      const fullResponse = data.response;
      const words = fullResponse.split(' ');
      
      const stream = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < words.length; i++) {
            const chunk = JSON.stringify({
              type: 'chunk',
              content: words[i] + (i < words.length - 1 ? ' ' : ''),
              index: i,
              done: i === words.length - 1
            });
            
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            
            // Small delay for streaming effect
            await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
          }
          
          // Final done message
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Normal response
    return NextResponse.json({
      success: true,
      message: {
        role: 'assistant',
        content: data.response,
      },
      conversationId: data.conversationId
    });

  } catch (error: unknown) {
    console.error('[Chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET endpoint for SSE streaming
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const message = searchParams.get('message') || 'Hello';
  const model = searchParams.get('model') || 'haiku';

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get response from proxy
        const response = await fetch('https://create-nexus.space.z.ai/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, model })
        });

        const data = await response.json();
        
        if (data.success) {
          const words = data.response.split(' ');
          
          for (let i = 0; i < words.length; i++) {
            const chunk = JSON.stringify({
              type: 'chunk',
              content: words[i] + (i < words.length - 1 ? ' ' : ''),
              index: i
            });
            
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            await new Promise(r => setTimeout(r, 25));
          }
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

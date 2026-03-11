import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * Streaming Chat API - Server-Sent Events
 * 
 * Usage:
 * GET /api/stream-chat?message=Hello&model=haiku
 * POST /api/stream-chat with { message, model, history }
 * 
 * Returns text/event-stream with chunks
 */

interface ChatMessage {
  role: string;
  content: string;
}

async function createChatStream(message: string, model: string, history: ChatMessage[] = [], systemPrompt?: string) {
  const encoder = new TextEncoder();

  // Build context from history
  let contextMessage = message;
  if (systemPrompt) {
    contextMessage = `${systemPrompt}\n\nUser: ${message}`;
  }
  if (history.length > 0) {
    const historyText = history.map((m) => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n');
    contextMessage = `${historyText}\nUser: ${message}`;
  }

  return new ReadableStream({
    async start(controller) {
      try {
        console.log(`[StreamChat] Starting stream for: ${message.substring(0, 50)}...`);

        const response = await fetch('https://create-nexus.space.z.ai/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: contextMessage,
            model
          })
        });

        const data = await response.json();

        if (data.success && data.response) {
          const words = data.response.split(' ');

          // Send start event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', totalWords: words.length })}\n\n`));

          // Stream word by word
          for (let i = 0; i < words.length; i++) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'chunk',
              content: words[i] + (i < words.length - 1 ? ' ' : ''),
              index: i,
              progress: Math.round(((i + 1) / words.length) * 100)
            })}\n\n`));

            // Natural typing feel
            await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
          }

          // Done signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            conversationId: data.conversationId,
            totalLength: data.response.length
          })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: data.error || 'Failed to get response'
          })}\n\n`));
        }
      } catch (error) {
        console.error('[StreamChat] Error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: 'Stream connection failed'
        })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });
}

// GET handler for simple streaming
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const message = searchParams.get('message') || 'Hello';
  const model = searchParams.get('model') || 'haiku';

  const stream = await createChatStream(message, model);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}

// POST handler for complex requests with history
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, model = 'haiku', history = [], systemPrompt } = body;

    const stream = await createChatStream(message, model, history, systemPrompt);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });

  } catch (error) {
    console.error('[StreamChat] POST error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create stream' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

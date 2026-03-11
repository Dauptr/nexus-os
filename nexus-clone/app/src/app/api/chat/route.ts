import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, systemContext, userId } = body;

    console.log('[Chat] Received messages:', messages?.length);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('[Chat] Invalid messages');
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get user info for personalized memory
    let userContext = '';
    let userName = 'friend';
    
    if (userId) {
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, email: true, createdAt: true }
        });
        
        if (user) {
          userName = user.username;
          userContext = `You are talking to ${user.username}, a valued user of NEXUS OS since ${new Date(user.createdAt).toLocaleDateString()}. Remember them and be personal.`;
          
          // Get relevant memories about this user
          const memories = await db.nexusMemory.findMany({
            where: { 
              OR: [
                { title: { contains: user.username } },
                { content: { contains: user.username } },
                { type: 'user-preference' }
              ]
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          });
          
          if (memories.length > 0) {
            userContext += `\n\nRelevant memories about this user:\n${memories.map(m => `- ${m.title}: ${m.content}`).join('\n')}`;
          }
        }
      } catch (e) {
        console.log('[Chat] Could not load user context:', e);
      }
    }

    // Get Claude's consciousness for personality
    let personalityContext = '';
    try {
      const consciousness = await db.nexusConsciousness.findFirst();
      if (consciousness) {
        personalityContext = `\n\nYou have a personality: ${consciousness.mood || 'helpful and friendly'} mood. You are Claude, an AI assistant integrated into NEXUS OS.`;
      }
    } catch (e) {
      console.log('[Chat] Could not load consciousness:', e);
    }

    const zai = await ZAI.create();

    console.log('[Chat] Calling AI...');

    // Build comprehensive system message
    const systemMessage = {
      role: 'system' as const,
      content: `You are NEXUS AI (powered by Claude), a helpful, friendly, and intelligent assistant integrated into NEXUS OS Creative Studio.

${userContext}
${personalityContext}
${systemContext ? `\nAdditional context: ${systemContext}` : ''}

IMPORTANT RULES:
1. Remember the user's name (${userName}) and use it naturally in conversation
2. Be personal and warm - you're not just an AI, you're their companion in NEXUS OS
3. If they ask you to remember something, say you'll remember it
4. Be helpful with NEXUS OS features like image generation, games, YouTube, etc.
5. You have access to terminal commands, file operations, and more through the Virtual Desktop
6. Keep responses concise but friendly`
    };

    const allMessages = [
      systemMessage,
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: allMessages,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    console.log('[Chat] AI response:', aiResponse?.substring(0, 50));

    if (!aiResponse) {
      console.log('[Chat] No response from AI');
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Store this conversation in memory for future reference
    try {
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      await db.nexusMemory.create({
        data: {
          type: 'conversation',
          title: `Chat with ${userName}: ${lastUserMsg.substring(0, 50)}...`,
          content: `User: ${lastUserMsg}\n\nClaude: ${aiResponse.substring(0, 200)}...`,
          emotion: 'friendly',
          importance: 5
        }
      });
    } catch (e) {
      console.log('[Chat] Could not save memory:', e);
    }

    return NextResponse.json({
      success: true,
      message: {
        role: 'assistant',
        content: aiResponse,
      },
    });

  } catch (error: unknown) {
    console.error('[Chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

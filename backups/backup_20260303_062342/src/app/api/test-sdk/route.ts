import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function GET() {
  try {
    const zai = await ZAI.create();
    
    // Test chat exactly as per documentation
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Hello, who are you?'
        }
      ],
    });

    const messageContent = completion.choices[0]?.message?.content;
    
    return NextResponse.json({
      success: true,
      response: messageContent,
    });
    
  } catch (error: unknown) {
    console.error('Test SDK error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

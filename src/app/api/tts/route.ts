import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const REMOTE_API = 'https://create-nexus.space.z.ai/api/tts';

// Voice mapping for different languages
const VOICE_MAP: Record<string, string> = {
  'en': 'tongtong',
  'en-us': 'tongtong', 
  'lt': 'tongtong',
  'ru': 'tongtong',
  'default': 'tongtong'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, input, voice, language } = body;
    const textContent = text || input || '';

    console.log('[TTS] Text:', textContent?.substring(0, 50), 'Language:', language, 'Voice:', voice);

    if (!textContent) {
      return NextResponse.json({ 
        success: false,
        error: 'Text is required' 
      }, { status: 400 });
    }

    // Map language to voice
    const selectedVoice = voice || VOICE_MAP[language || 'default'] || 'tongtong';

    const response = await fetch(REMOTE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: textContent,
        voice: selectedVoice
      })
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('[TTS] Error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'TTS failed' 
    }, { status: 500 });
  }
}

// Get available voices
export async function GET() {
  return NextResponse.json({
    success: true,
    voices: [
      { id: 'tongtong', name: 'Tong Tong', description: 'Natural voice (default)' },
      { id: 'alloy', name: 'Alloy', description: 'Neutral' },
      { id: 'echo', name: 'Echo', description: 'Male' },
      { id: 'fable', name: 'Fable', description: 'British' },
      { id: 'nova', name: 'Nova', description: 'Female' },
      { id: 'shimmer', name: 'Shimmer', description: 'Warm' }
    ],
    languages: [
      { code: 'en', name: 'English' },
      { code: 'en-us', name: 'English (US)' },
      { code: 'lt', name: 'Lietuvių' },
      { code: 'ru', name: 'Русский' }
    ]
  });
}

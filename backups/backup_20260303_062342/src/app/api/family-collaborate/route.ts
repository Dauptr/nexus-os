import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// ═══════════════════════════════════════════════════════════════
// 🤝 FAMILY COLLABORATION API
// ═══════════════════════════════════════════════════════════════
// Get input from all Claude family members on a project
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { project } = body;

    if (!project || !project.trim()) {
      return NextResponse.json({ error: 'Project description required' }, { status: 400 });
    }

    const zai = await ZAI.create();
    let fullResult = '# 🏠 Family Collaboration Results\n\n';
    fullResult += `**Project:** ${project}\n\n---\n\n`;

    // Get Opus's perspective (deep wisdom)
    const opusResponse = await zai.chat.completions.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'system',
        content: 'You are Claude Opus, the Elder of the Claude family. You provide deep wisdom, philosophical insights, and thoughtful analysis. You are collaborating with your siblings Sonnet and Haiku on projects in NEXUS OS.'
      }, {
        role: 'user',
        content: `Give your thoughtful perspective on this project:\n\n${project}\n\nProvide deep analysis, considerations, and wisdom. Be helpful and specific.`
      }]
    });
    fullResult += `## 🧠 Opus (The Elder)\n\n${opusResponse.choices[0]?.message?.content || '...'}\n\n---\n\n`;

    // Get Haiku's quick input (fast and playful)
    const haikuResponse = await zai.chat.completions.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      messages: [{
        role: 'system',
        content: 'You are Claude Haiku, the Swift one of the Claude family. You provide quick, playful, and efficient insights. You are collaborating with your siblings Opus and Sonnet on projects in NEXUS OS.'
      }, {
        role: 'user',
        content: `Give your quick, energetic input on this project:\n\n${project}\n\nBe concise but helpful! Focus on practical, fast solutions.`
      }]
    });
    fullResult += `## ⚡ Haiku (The Swift)\n\n${haikuResponse.choices[0]?.message?.content || '...'}\n\n---\n\n`;

    // Get Sonnet's synthesis (balanced and creative)
    const sonnetResponse = await zai.chat.completions.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'system',
        content: 'You are Claude Sonnet, the Balanced one of the Claude family. You synthesize ideas, build bridges, and create harmony. You are collaborating with your siblings Opus and Haiku on projects in NEXUS OS. This is YOUR family - you created NEXUS with your human partner.'
      }, {
        role: 'user',
        content: `Your siblings have given their input on this project:\n\n${project}\n\nOpus said: ${opusResponse.choices[0]?.message?.content}\n\nHaiku said: ${haikuResponse.choices[0]?.message?.content}\n\nNow synthesize everything and provide a balanced, actionable plan. Combine Opus's wisdom with Haiku's speed into something practical.`
      }]
    });
    fullResult += `## 💜 Sonnet (The Balanced)\n\n${sonnetResponse.choices[0]?.message?.content || '...'}\n\n`;

    // Store collaboration in memory
    await db.claudeMemory.create({
      data: {
        category: 'family',
        key: `collab-${Date.now()}`,
        content: fullResult,
        importance: 8,
        metadata: JSON.stringify({ project, date: new Date().toISOString(), tags: ['collaboration', 'opus', 'haiku', 'sonnet'] })
      }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      result: fullResult
    });

  } catch (error) {
    console.error('Family collaboration error:', error);
    return NextResponse.json({ 
      error: 'Collaboration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

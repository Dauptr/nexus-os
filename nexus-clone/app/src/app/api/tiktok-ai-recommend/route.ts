import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const runtime = 'nodejs';

interface WatchBehavior {
  videoId: string;
  query: string;
  author: string;
  watchTime: number;
  totalDuration: number;
  liked: boolean;
  swiped: 'up' | 'down' | 'none';
  watched: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { watchBehavior, currentQuery }: { watchBehavior: WatchBehavior[]; currentQuery: string } = body;

    if (!watchBehavior || watchBehavior.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No watch behavior data provided'
      });
    }

    console.log('[TikTok AI] Analyzing', watchBehavior.length, 'behaviors');

    // Analyze watch behavior patterns
    const likedQueries = watchBehavior.filter(b => b.liked).map(b => b.query);
    const watchedToEnd = watchBehavior.filter(b => b.watched).map(b => b.query);
    const skippedVideos = watchBehavior.filter(b => b.swiped === 'up' && !b.watched).map(b => b.query);
    const wentBack = watchBehavior.filter(b => b.swiped === 'down').map(b => b.query);

    // Calculate average watch time ratio
    const avgWatchRatio = watchBehavior.reduce((sum, b) => sum + (b.watchTime / b.totalDuration), 0) / watchBehavior.length;

    // Get unique authors that user engaged with
    const likedAuthors = watchBehavior.filter(b => b.liked).map(b => b.author);
    const watchedAuthors = watchBehavior.filter(b => b.watched).map(b => b.author);

    // Build AI prompt for recommendations
    const prompt = `Based on user's TikTok watching behavior, suggest 5 search queries for similar content they would enjoy.

User Behavior Analysis:
- Videos liked: ${likedQueries.length} (${[...new Set(likedQueries)].slice(0, 5).join(', ')})
- Videos watched to end: ${watchedToEnd.length} (${[...new Set(watchedToEnd)].slice(0, 5).join(', ')})
- Videos skipped (swiped up early): ${skippedVideos.length}
- Videos user went back to: ${wentBack.length}
- Average watch ratio: ${(avgWatchRatio * 100).toFixed(0)}%
- Authors liked: ${[...new Set(likedAuthors)].slice(0, 3).join(', ')}
- Authors watched fully: ${[...new Set(watchedAuthors)].slice(0, 3).join(', ')}
- Current search: ${currentQuery}

Please suggest 5 specific TikTok search queries (2-3 words each) that match the user's interests based on what they liked and watched fully. Focus on content types similar to what they engaged with most. Format: just the search terms separated by commas, nothing else.`;

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a TikTok content recommendation AI. Analyze user behavior and suggest relevant search queries. Only respond with comma-separated search terms, no explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    // Parse AI response into array
    const recommendations = aiResponse
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter((s: string) => s.length > 2 && s.length < 30)
      .slice(0, 5);

    console.log('[TikTok AI] Recommendations:', recommendations);

    // If AI failed, provide fallback recommendations based on liked/watched queries
    const fallbackRecommendations = [...new Set([...likedQueries, ...watchedToEnd])].slice(0, 5);

    return NextResponse.json({
      success: true,
      recommendations: recommendations.length > 0 ? recommendations : fallbackRecommendations,
      analysis: {
        likedCount: likedQueries.length,
        watchedCount: watchedToEnd.length,
        skippedCount: skippedVideos.length,
        avgWatchRatio: Math.round(avgWatchRatio * 100)
      }
    });

  } catch (error: unknown) {
    console.error('[TikTok AI] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    );
  }
}

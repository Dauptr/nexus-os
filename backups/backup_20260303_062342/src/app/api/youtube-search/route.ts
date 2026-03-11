import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const runtime = 'nodejs';

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  publishedAt: string;
  description: string;
  url: string;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, page = 1 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log('[YouTube Search] Query:', query, 'Page:', page);

    const zai = await ZAI.create();

    // Search for YouTube videos with the query
    const searchQuery = `${query} site:youtube.com`;

    const results = await zai.functions.invoke('web_search', {
      query: searchQuery,
      num: 20, // Get more results for pagination
    });

    console.log('[YouTube Search] Found', results.length, 'results');

    // Parse and filter YouTube results
    const videos: YouTubeVideo[] = [];

    for (const item of results) {
      const videoId = extractVideoId(item.url);

      if (videoId && !videos.find(v => v.id === videoId)) {
        videos.push({
          id: videoId,
          title: item.name || 'Untitled Video',
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          channel: item.host_name || 'YouTube',
          publishedAt: item.date || '',
          description: item.snippet || '',
          url: item.url,
        });
      }
    }

    console.log('[YouTube Search] Parsed', videos.length, 'videos');

    // Pagination: 5 results per page
    const pageSize = 5;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedVideos = videos.slice(startIndex, endIndex);
    const hasMore = endIndex < videos.length;
    const totalPages = Math.ceil(videos.length / pageSize);

    return NextResponse.json({
      success: true,
      videos: paginatedVideos,
      pagination: {
        currentPage: page,
        totalPages,
        totalResults: videos.length,
        hasMore,
        pageSize,
      },
    });

  } catch (error: unknown) {
    console.error('[YouTube Search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

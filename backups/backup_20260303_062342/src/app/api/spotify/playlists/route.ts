import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('access_token')
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token provided' }, { status: 400 })
    }
    
    const response = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Spotify playlists API error:', error)
      return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: response.status })
    }
    
    const data = await response.json()
    
    const playlists = data.items?.map((playlist: {
      id: string;
      name: string;
      description?: string;
      images?: Array<{ url: string }>;
      tracks?: { total: number };
      owner?: { display_name: string };
      external_urls?: { spotify: string };
    }) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      image: playlist.images?.[0]?.url,
      trackCount: playlist.tracks?.total || 0,
      owner: playlist.owner?.display_name,
      url: playlist.external_urls?.spotify
    })) || []
    
    return NextResponse.json({
      playlists,
      total: data.total,
      limit: data.limit,
      offset: data.offset,
      hasMore: data.next !== null
    })
  } catch (error) {
    console.error('Get playlists error:', error)
    return NextResponse.json({ error: 'Failed to get playlists' }, { status: 500 })
  }
}

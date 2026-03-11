import { NextRequest, NextResponse } from 'next/server'

const SPOTIFY_CLIENT_ID = '54f5b1b69b1d447587dbe051b10adc44'
const SPOTIFY_CLIENT_SECRET = '96e3bfbd2b3546a8a7f1a56e7fad7823'

// Helper to get base URL
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  return `${protocol}://${host}`
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl(request)
    const redirectUri = `${baseUrl}/api/spotify/callback`
    
    // Generate random state for security
    const state = Math.random().toString(36).substring(7)
    
    // Scopes for Spotify access
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-library-read',
      'user-top-read',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state'
    ].join(' ')
    
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
      show_dialog: 'false'
    })
    
    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`
    
    // Return the auth URL for popup-based OAuth
    return NextResponse.json({ 
      authUrl,
      state,
      redirectUri 
    })
  } catch (error) {
    console.error('Spotify auth error:', error)
    return NextResponse.json({ error: 'Failed to initiate auth' }, { status: 500 })
  }
}

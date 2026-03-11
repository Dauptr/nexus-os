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
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    if (error) {
      return NextResponse.redirect(new URL('/?spotify_error=' + error, request.url))
    }
    
    if (!code) {
      return NextResponse.redirect(new URL('/?spotify_error=no_code', request.url))
    }
    
    const baseUrl = getBaseUrl(request)
    const redirectUri = `${baseUrl}/api/spotify/callback`
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }).toString()
    })
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return NextResponse.redirect(new URL('/?spotify_error=token_exchange_failed', request.url))
    }
    
    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData
    
    // Redirect to home with tokens in URL (client will store them)
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('spotify_connected', 'true')
    redirectUrl.searchParams.set('access_token', access_token)
    redirectUrl.searchParams.set('refresh_token', refresh_token)
    redirectUrl.searchParams.set('expires_in', expires_in.toString())
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Spotify callback error:', error)
    return NextResponse.redirect(new URL('/?spotify_error=unknown', request.url))
  }
}

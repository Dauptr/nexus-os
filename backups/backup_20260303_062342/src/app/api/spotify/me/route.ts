import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('access_token')
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token provided' }, { status: 400 })
    }
    
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Spotify API error:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: response.status })
    }
    
    const userData = await response.json()
    
    return NextResponse.json({
      id: userData.id,
      display_name: userData.display_name,
      email: userData.email,
      images: userData.images,
      country: userData.country,
      product: userData.product,
      followers: userData.followers?.total || 0
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
  }
}

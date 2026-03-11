import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // In a real app, you'd revoke the token server-side
    // For now, we just return success - client will clear local storage
    return NextResponse.json({ success: true, message: 'Disconnected from Spotify' })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}

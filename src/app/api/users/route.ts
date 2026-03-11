import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Get all users or specific user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')
    const username = searchParams.get('username')
    
    console.log('[Users API] GET request - userId param:', userId, 'username param:', username)
    
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          photoUrl: true,
          bio: true,
          createdAt: true,
          _count: {
            select: {
              generatedImages: true
            }
          }
        }
      })
      return NextResponse.json({ success: true, user })
    }
    
    if (username) {
      const user = await db.user.findFirst({
        where: { username },
        select: {
          id: true,
          username: true,
          photoUrl: true,
          bio: true,
          createdAt: true,
          _count: {
            select: {
              generatedImages: true
            }
          }
        }
      })
      return NextResponse.json({ success: true, user })
    }
    
    // Get all users (for chat user list)
    const users = await db.user.findMany({
      where: { isBanned: false },
      select: {
        id: true,
        username: true,
        photoUrl: true,
        isAdmin: true
      },
      orderBy: { username: 'asc' }
    })
    
    console.log('[Users API] Returning', users.length, 'users')
    
    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error('Users error:', error)
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 })
  }
}

// PUT - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { username, bio, photoUrl } = body
    
    // Check if username is taken by another user
    if (username) {
      const existing = await db.user.findFirst({
        where: {
          username,
          NOT: { id: userId }
        }
      })
      if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
      }
    }
    
    const user = await db.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(bio !== undefined && { bio }),
        ...(photoUrl !== undefined && { photoUrl })
      },
      select: {
        id: true,
        email: true,
        username: true,
        photoUrl: true,
        bio: true,
        isAdmin: true
      }
    })
    
    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Generate random invite code
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// GET - Get user's invite links or get invite info by code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (code) {
      // Get invite info by code
      const invite = await db.inviteLink.findUnique({
        where: { code },
        include: {
          creator: { select: { username: true, photoUrl: true } }
        }
      })
      
      if (!invite) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
      }
      
      return NextResponse.json({ 
        success: true, 
        invite: {
          code: invite.code,
          createdBy: invite.creator,
          used: !!invite.usedById
        }
      })
    }
    
    // Get user's invite links
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const invites = await db.inviteLink.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        usedBy: { select: { username: true, photoUrl: true } }
      }
    })
    
    return NextResponse.json({ success: true, invites })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Create new invite link
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Generate unique code
    let code = generateCode()
    let exists = await db.inviteLink.findUnique({ where: { code } })
    while (exists) {
      code = generateCode()
      exists = await db.inviteLink.findUnique({ where: { code } })
    }
    
    const invite = await db.inviteLink.create({
      data: {
        code,
        creatorId: userId
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      invite: {
        code: invite.code,
        createdAt: invite.createdAt
      }
    })
  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

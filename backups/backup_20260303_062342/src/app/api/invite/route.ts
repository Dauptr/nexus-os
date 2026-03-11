import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'

const prisma = new PrismaClient()

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
      const invite = await prisma.inviteLink.findUnique({
        where: { code },
        include: {
          createdBy: { select: { username: true, photoUrl: true } }
        }
      })
      
      if (!invite) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
      }
      
      return NextResponse.json({ 
        success: true, 
        invite: {
          code: invite.code,
          createdBy: invite.createdBy,
          used: !!invite.usedById,
          features: invite.features ? JSON.parse(invite.features) : null
        }
      })
    }
    
    // Get user's invite links
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const invites = await prisma.inviteLink.findMany({
      where: { createdById: userId },
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

// POST - Create new invite link with features
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { features } = body
    
    // Generate unique code
    let code = generateCode()
    let exists = await prisma.inviteLink.findUnique({ where: { code } })
    while (exists) {
      code = generateCode()
      exists = await prisma.inviteLink.findUnique({ where: { code } })
    }
    
    const invite = await prisma.inviteLink.create({
      data: {
        code,
        createdById: userId,
        features: features ? JSON.stringify(features) : null
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      invite: {
        code: invite.code,
        createdAt: invite.createdAt,
        features: features || null
      }
    })
  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

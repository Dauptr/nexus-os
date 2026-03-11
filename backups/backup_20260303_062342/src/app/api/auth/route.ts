import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'

const prisma = new PrismaClient()

// Simple hash function for passwords (in production, use bcrypt)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

// GET - Check session and return user with features
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ authenticated: false })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        photoUrl: true,
        bio: true,
        isAdmin: true,
        features: true,
        createdAt: true
      }
    })
    
    if (!user) {
      return NextResponse.json({ authenticated: false })
    }
    
    // Get global features as fallback
    const globalFeatures = await prisma.appSettings.findUnique({
      where: { key: 'global_features' }
    })
    
    const defaultFeatures = {
      createImage: true,
      database: true,
      chat: true,
      youtube: true,
      tiktok: true,
      tetris: true,
      p2pChat: true,
      invite: true,
      donate: true,
      nexusAvatar: true,
      backgroundSounds: true,
      aiOnlineStatus: true,
      spotify: true
    }
    
    let userFeatures = defaultFeatures
    if (user.features) {
      try {
        userFeatures = { ...defaultFeatures, ...JSON.parse(user.features) }
      } catch {}
    } else if (globalFeatures) {
      try {
        userFeatures = { ...defaultFeatures, ...JSON.parse(globalFeatures.value) }
      } catch {}
    }
    
    return NextResponse.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        photoUrl: user.photoUrl,
        bio: user.bio,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      },
      features: userFeatures
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false })
  }
}

// POST - Login, Signup, Forgot Password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, password, username, photoUrl, bio, adminPassword, inviteCode } = body
    
    if (action === 'login') {
      // Login
      const user = await prisma.user.findUnique({
        where: { email }
      })
      
      if (!user || user.password !== simpleHash(password)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
      
      if (user.isBanned) {
        return NextResponse.json({ error: 'Account is banned' }, { status: 403 })
      }
      
      // Get user features
      const defaultFeatures = {
        createImage: true,
        database: true,
        chat: true,
        youtube: true,
        tiktok: true,
        tetris: true,
        p2pChat: true,
        invite: true,
        donate: true,
        nexusAvatar: true,
        backgroundSounds: true,
        aiOnlineStatus: true,
        spotify: true
      }
      
      let userFeatures = defaultFeatures
      if (user.features) {
        try {
          userFeatures = { ...defaultFeatures, ...JSON.parse(user.features) }
        } catch {}
      }
      
      const cookieStore = await cookies()
      cookieStore.set('userId', user.id, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
      if (user.isAdmin) {
        cookieStore.set('isAdmin', 'true', { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7
        })
      }
      
      return NextResponse.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          photoUrl: user.photoUrl,
          bio: user.bio,
          isAdmin: user.isAdmin
        },
        features: userFeatures
      })
    } 
    else if (action === 'signup') {
      // Check if email or username already exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      })
      
      if (existing) {
        return NextResponse.json({ error: 'Email or username already exists' }, { status: 400 })
      }
      
      // Get features from invite code or global defaults
      let userFeatures: Record<string, boolean> = {}
      
      if (inviteCode) {
        const invite = await prisma.inviteLink.findUnique({
          where: { code: inviteCode }
        })
        if (invite && !invite.usedById && invite.features) {
          try {
            userFeatures = JSON.parse(invite.features)
          } catch {}
        }
      }
      
      // Fallback to global features
      if (Object.keys(userFeatures).length === 0) {
        const globalFeatures = await prisma.appSettings.findUnique({
          where: { key: 'global_features' }
        })
        if (globalFeatures) {
          try {
            userFeatures = JSON.parse(globalFeatures.value)
          } catch {}
        }
      }
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: simpleHash(password),
          photoUrl: photoUrl || null,
          bio: bio || null,
          isAdmin: false,
          features: Object.keys(userFeatures).length > 0 ? JSON.stringify(userFeatures) : null
        }
      })
      
      // Mark invite as used
      if (inviteCode) {
        await prisma.inviteLink.update({
          where: { code: inviteCode },
          data: { 
            usedById: user.id,
            usedAt: new Date()
          }
        })
      }
      
      const cookieStore = await cookies()
      cookieStore.set('userId', user.id, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
      })
      
      return NextResponse.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          photoUrl: user.photoUrl,
          bio: user.bio,
          isAdmin: user.isAdmin
        },
        features: userFeatures
      })
    }
    else if (action === 'admin-login') {
      // Admin login with special password
      if (adminPassword !== 'dauptr112a') {
        return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 })
      }
      
      // Find or create admin user
      let adminUser = await prisma.user.findFirst({
        where: { isAdmin: true }
      })
      
      if (!adminUser) {
        adminUser = await prisma.user.create({
          data: {
            email: 'dauptr@gmail.com',
            username: 'Admin',
            password: simpleHash('admin'),
            isAdmin: true
          }
        })
      }
      
      const cookieStore = await cookies()
      cookieStore.set('userId', adminUser.id, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
      })
      cookieStore.set('isAdmin', 'true', { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
      })
      
      return NextResponse.json({ 
        success: true, 
        user: {
          id: adminUser.id,
          email: adminUser.email,
          username: adminUser.username,
          isAdmin: true
        }
      })
    }
    else if (action === 'forgot-password') {
      // Request password reset
      const user = await prisma.user.findUnique({
        where: { email }
      })
      
      if (!user) {
        // Don't reveal if email exists
        return NextResponse.json({ 
          success: true, 
          message: 'If the email exists, a reset request will be processed after admin approval.' 
        })
      }
      
      // Create or update password reset request
      await prisma.passwordReset.upsert({
        where: { userId: user.id },
        update: { 
          email,
          approved: false,
          createdAt: new Date()
        },
        create: {
          userId: user.id,
          email
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Password reset request submitted. An admin will review and approve it.' 
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Logout
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('userId')
  cookieStore.delete('isAdmin')
  return NextResponse.json({ success: true })
}

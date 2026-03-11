import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

import { cookies } from 'next/headers'



// Verify admin access
async function verifyAdmin(): Promise<string | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  const isAdmin = cookieStore.get('isAdmin')?.value
  
  if (!userId || isAdmin !== 'true') return null
  
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  })
  
  return user?.isAdmin ? userId : null
}

// GET - Get admin stats, user list, password reset requests, and app settings
export async function GET(request: NextRequest) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'stats'
    
    if (tab === 'password-resets') {
      const resetRequests = await db.passwordReset.findMany({
        include: {
          user: {
            select: { id: true, username: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ success: true, resetRequests })
    }
    
    if (tab === 'app-urls') {
      const urlsSetting = await db.appSettings.findUnique({
        where: { key: 'cloudflare_urls' }
      })
      const urls = urlsSetting ? JSON.parse(urlsSetting.value) : []
      return NextResponse.json({ success: true, urls })
    }
    
    const [
      totalUsers,
      totalImages,
      totalMessages,
      totalP2PMessages,
      totalInvites,
      recentUsers,
      resetRequests
    ] = await Promise.all([
      db.user.count(),
      db.generatedImage.count(),
      db.chatMessage.count(),
      db.p2PMessage.count(),
      db.inviteLink.count(),
      db.user.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          photoUrl: true,
          isAdmin: true,
          isBanned: true,
          features: true,
          createdAt: true,
          _count: {
            select: {
              generatedImages: true,
              sentMessages: true
            }
          }
        }
      }),
      db.passwordReset.count({ where: { approved: false } })
    ])
    
    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalImages,
        totalMessages,
        totalP2PMessages,
        totalInvites,
        pendingPasswordResets: resetRequests
      },
      users: recentUsers
    })
  } catch (error) {
    console.error('Admin GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Various admin actions
export async function POST(request: NextRequest) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { action, userId, isBanned, features, resetId, urls } = body
    
    // Ban/unban user
    if (action === 'ban' && userId) {
      const user = await db.user.update({
        where: { id: userId },
        data: { isBanned }
      })
      return NextResponse.json({ success: true, user })
    }
    
    // Delete user
    if (action === 'delete' && userId) {
      // First delete related records
      await db.passwordReset.deleteMany({ where: { userId } })
      await db.p2PMessage.deleteMany({ where: { fromUserId: userId } })
      await db.p2PMessage.deleteMany({ where: { toUserId: userId } })
      await db.chatMessage.deleteMany({ where: { userId } })
      await db.generatedImage.deleteMany({ where: { userId } })
      await db.inviteLink.deleteMany({ where: { createdById: userId } })
      // Finally delete the user
      await db.user.delete({ where: { id: userId } })
      return NextResponse.json({ success: true })
    }
    
    // Update user features
    if (action === 'updateFeatures' && userId) {
      const user = await db.user.update({
        where: { id: userId },
        data: { features: JSON.stringify(features) }
      })
      return NextResponse.json({ success: true, user })
    }
    
    // Approve password reset
    if (action === 'approveReset' && resetId) {
      const resetRequest = await db.passwordReset.findUnique({
        where: { id: resetId },
        include: { user: true }
      })
      
      if (!resetRequest) {
        return NextResponse.json({ error: 'Reset request not found' }, { status: 404 })
      }
      
      // Generate new random password
      const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      
      // Update user password and mark reset as approved
      await db.user.update({
        where: { id: resetRequest.userId },
        data: { password: newPassword }
      })
      
      await db.passwordReset.update({
        where: { id: resetId },
        data: { approved: true }
      })
      
      return NextResponse.json({ 
        success: true, 
        newPassword,
        email: resetRequest.email 
      })
    }
    
    // Reject password reset
    if (action === 'rejectReset' && resetId) {
      await db.passwordReset.delete({ where: { id: resetId } })
      return NextResponse.json({ success: true })
    }
    
    // Update app URLs
    if (action === 'updateUrls') {
      await db.appSettings.upsert({
        where: { key: 'cloudflare_urls' },
        update: { value: JSON.stringify(urls || []) },
        create: { key: 'cloudflare_urls', value: JSON.stringify(urls || []) }
      })
      return NextResponse.json({ success: true })
    }
    
    // Set global features (default for new users)
    if (action === 'setGlobalFeatures') {
      await db.appSettings.upsert({
        where: { key: 'global_features' },
        update: { value: JSON.stringify(features) },
        create: { key: 'global_features', value: JSON.stringify(features) }
      })
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

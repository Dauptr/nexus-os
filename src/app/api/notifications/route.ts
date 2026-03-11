import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// GET - Get all notifications for current user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    
    const notifications = await db.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false })
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    const unreadCount = await db.notification.count({
      where: { userId, read: false }
    })
    
    return NextResponse.json({
      success: true,
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Create notification (admin only) or mark as read
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { action, notificationId, targetUserId, type, title, message } = body
    
    // Mark as read
    if (action === 'markRead' && notificationId) {
      await db.notification.update({
        where: { id: notificationId, userId },
        data: { read: true }
      })
      return NextResponse.json({ success: true })
    }
    
    // Mark all as read
    if (action === 'markAllRead') {
      await db.notification.updateMany({
        where: { userId, read: false },
        data: { read: true }
      })
      return NextResponse.json({ success: true })
    }
    
    // Create notification (for admin or system)
    if (targetUserId && type && title && message) {
      // Check if user is admin or creating for self
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true }
      })
      
      if (!user?.isAdmin && targetUserId !== userId) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
      
      const notification = await db.notification.create({
        data: {
          userId: targetUserId,
          type,
          title,
          message
        }
      })
      
      return NextResponse.json({ success: true, notification })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }
    
    await db.notification.delete({
      where: { id, userId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

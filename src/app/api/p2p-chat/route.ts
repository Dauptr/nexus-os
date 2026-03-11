import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// GET - Get messages between users
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    console.log('[P2P Chat API] GET request - userId from cookie:', userId)
    
    if (!userId) {
      console.log('[P2P Chat API] Unauthorized - no userId cookie')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const otherUserId = searchParams.get('userId')
    
    console.log('[P2P Chat API] otherUserId param:', otherUserId)
    
    if (otherUserId) {
      // Get conversation with specific user
      console.log('[P2P Chat API] Querying messages where:', {
        or: [
          { fromUserId: userId, toUserId: otherUserId },
          { fromUserId: otherUserId, toUserId: userId }
        ]
      })
      
      const messages = await db.p2PMessage.findMany({
        where: {
          OR: [
            { fromUserId: userId, toUserId: otherUserId },
            { fromUserId: otherUserId, toUserId: userId }
          ]
        },
        orderBy: { createdAt: 'asc' },
        include: {
          fromUser: { select: { id: true, username: true, photoUrl: true } },
          toUser: { select: { id: true, username: true, photoUrl: true } }
        }
      })
      
      console.log('[P2P Chat API] Found messages:', messages.length)
      if (messages.length > 0) {
        console.log('[P2P Chat API] First message:', JSON.stringify(messages[0], null, 2))
      }
      
      // Mark as read
      const updateResult = await db.p2PMessage.updateMany({
        where: {
          fromUserId: otherUserId,
          toUserId: userId,
          read: false
        },
        data: { read: true }
      })
      console.log('[P2P Chat API] Marked as read:', updateResult.count, 'messages')
      
      return NextResponse.json({ success: true, messages })
    } else {
      // Get all conversations (latest message per user)
      const sentMessages = await db.p2PMessage.findMany({
        where: { fromUserId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          toUser: { select: { id: true, username: true, photoUrl: true } }
        }
      })
      
      const receivedMessages = await db.p2PMessage.findMany({
        where: { toUserId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          fromUser: { select: { id: true, username: true, photoUrl: true } }
        }
      })
      
      // Get unread count
      const unreadCount = await db.p2PMessage.count({
        where: { toUserId: userId, read: false }
      })
      
      console.log('[P2P Chat API] Summary - Sent:', sentMessages.length, 'Received:', receivedMessages.length, 'Unread:', unreadCount)
      
      // Combine and deduplicate users
      const conversations = new Map()
      
      sentMessages.forEach(msg => {
        if (!conversations.has(msg.toUserId)) {
          conversations.set(msg.toUserId, {
            user: msg.toUser,
            lastMessage: msg.content,
            lastMessageTime: msg.createdAt,
            unread: false
          })
        }
      })
      
      receivedMessages.forEach(msg => {
        const existing = conversations.get(msg.fromUserId)
        if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessageTime)) {
          conversations.set(msg.fromUserId, {
            user: msg.fromUser,
            lastMessage: msg.content,
            lastMessageTime: msg.createdAt,
            unread: !msg.read
          })
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        conversations: Array.from(conversations.values()),
        unreadCount
      })
    }
  } catch (error) {
    console.error('[P2P Chat API] Error:', error)
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 })
  }
}

// POST - Send message
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    console.log('[P2P Chat API] POST request - userId from cookie:', userId)
    
    if (!userId) {
      console.log('[P2P Chat API] Unauthorized - no userId cookie')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { toUserId, content } = body
    
    console.log('[P2P Chat API] Creating message - from:', userId, 'to:', toUserId, 'content:', content?.substring(0, 50))
    
    if (!toUserId || !content?.trim()) {
      console.log('[P2P Chat API] Missing fields - toUserId:', toUserId, 'content:', content)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    
    const message = await db.p2PMessage.create({
      data: {
        fromUserId: userId,
        toUserId,
        content: content.trim()
      },
      include: {
        fromUser: { select: { id: true, username: true, photoUrl: true } },
        toUser: { select: { id: true, username: true, photoUrl: true } }
      }
    })
    
    console.log('[P2P Chat API] Message created:', message.id)
    console.log('[P2P Chat API] Message details:', JSON.stringify(message, null, 2))
    
    // Create notification for recipient
    try {
      await db.notification.create({
        data: {
          userId: toUserId,
          type: 'message',
          title: 'New Message',
          message: `You have a new message from ${message.fromUser.username}`,
        }
      })
      console.log('[P2P Chat API] Notification created for recipient:', toUserId)
    } catch (notifError) {
      console.error('[P2P Chat API] Failed to create notification:', notifError)
    }
    
    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('[P2P Chat API] Send message error:', error)
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'

const prisma = new PrismaClient()

// GET - Get messages between users
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const otherUserId = searchParams.get('userId')
    
    if (otherUserId) {
      // Get conversation with specific user
      const messages = await prisma.p2PMessage.findMany({
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
      
      // Mark as read
      await prisma.p2PMessage.updateMany({
        where: {
          fromUserId: otherUserId,
          toUserId: userId,
          read: false
        },
        data: { read: true }
      })
      
      return NextResponse.json({ success: true, messages })
    } else {
      // Get all conversations (latest message per user)
      const sentMessages = await prisma.p2PMessage.findMany({
        where: { fromUserId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          toUser: { select: { id: true, username: true, photoUrl: true } }
        }
      })
      
      const receivedMessages = await prisma.p2PMessage.findMany({
        where: { toUserId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          fromUser: { select: { id: true, username: true, photoUrl: true } }
        }
      })
      
      // Get unread count
      const unreadCount = await prisma.p2PMessage.count({
        where: { toUserId: userId, read: false }
      })
      
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
    console.error('P2P chat error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Send message
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { toUserId, content } = body
    
    if (!toUserId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    
    const message = await prisma.p2PMessage.create({
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
    
    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

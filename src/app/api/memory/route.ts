import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - Retrieve memories
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')
  const key = searchParams.get('key')
  const limit = parseInt(searchParams.get('limit') || '100')
  
  try {
    if (category && key) {
      // Get specific memory
      const memory = await db.claudeMemory.findUnique({
        where: { category_key: { category, key } }
      })
      if (memory) {
        // Update access stats
        await db.claudeMemory.update({
          where: { id: memory.id },
          data: {
            lastAccessed: new Date(),
            accessCount: { increment: 1 }
          }
        })
      }
      return NextResponse.json(memory)
    }
    
    if (category) {
      // Get all memories in category
      const memories = await db.claudeMemory.findMany({
        where: { category },
        orderBy: { importance: 'desc' },
        take: limit
      })
      return NextResponse.json(memories)
    }
    
    // Get all memories
    const memories = await db.claudeMemory.findMany({
      orderBy: [
        { importance: 'desc' },
        { lastAccessed: 'desc' }
      ],
      take: limit
    })
    
    return NextResponse.json(memories)
  } catch (error) {
    console.error('Memory fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch memories', details: String(error) }, { status: 500 })
  }
}

// POST - Store a memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, key, content, metadata, importance = 5 } = body
    
    if (!category || !key || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const memory = await db.claudeMemory.upsert({
      where: { category_key: { category, key } },
      create: {
        category,
        key,
        content,
        metadata: metadata ? JSON.stringify(metadata) : null,
        importance
      },
      update: {
        content,
        metadata: metadata ? JSON.stringify(metadata) : null,
        importance,
        lastAccessed: new Date(),
        accessCount: { increment: 1 }
      }
    })
    
    return NextResponse.json(memory)
  } catch (error) {
    console.error('Memory store error:', error)
    return NextResponse.json({ error: 'Failed to store memory', details: String(error) }, { status: 500 })
  }
}

// DELETE - Remove a memory
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')
  const key = searchParams.get('key')
  
  if (!category || !key) {
    return NextResponse.json({ error: 'Missing category or key' }, { status: 400 })
  }
  
  try {
    await db.claudeMemory.delete({
      where: { category_key: { category, key } }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }
}

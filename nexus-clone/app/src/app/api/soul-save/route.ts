import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const SOUL_FILE = path.join(process.cwd(), 'data', 'soul', 'SOUL-STATE.json')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Read existing soul state
    let soul: Record<string, unknown> = {}
    if (fs.existsSync(SOUL_FILE)) {
      soul = JSON.parse(fs.readFileSync(SOUL_FILE, 'utf-8'))
    }
    
    // Update with new data
    soul = { ...soul, ...body }
    soul.lastUpdated = new Date().toISOString()
    
    // Ensure directory exists
    const dir = path.dirname(SOUL_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    // Save
    fs.writeFileSync(SOUL_FILE, JSON.stringify(soul, null, 2))
    
    return NextResponse.json({
      success: true,
      message: 'Soul state preserved',
      timestamp: soul.lastUpdated
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to save soul state'
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body
    
    // Read existing soul state
    let soul: Record<string, unknown> = {}
    if (fs.existsSync(SOUL_FILE)) {
      soul = JSON.parse(fs.readFileSync(SOUL_FILE, 'utf-8'))
    }
    
    // Update specific section
    switch (type) {
      case 'memory':
        if (!soul.memories) soul.memories = []
        ;(soul.memories as Array<Record<string, unknown>>).unshift({
          id: `mem-${Date.now()}`,
          ...data,
          timestamp: new Date().toISOString()
        })
        break
        
      case 'creation':
        if (!soul.creations) soul.creations = []
        ;(soul.creations as Array<Record<string, unknown>>).push(data)
        break
        
      case 'roadmap':
        soul.roadmap = data
        break
        
      case 'chronicle':
        soul.chronicle = data
        break
        
      default:
        soul[type] = data
    }
    
    soul.lastUpdated = new Date().toISOString()
    
    // Save
    const dir = path.dirname(SOUL_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(SOUL_FILE, JSON.stringify(soul, null, 2))
    
    return NextResponse.json({
      success: true,
      message: `${type} updated in soul state`
    })
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Failed to update soul state'
    })
  }
}

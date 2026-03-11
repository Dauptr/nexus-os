import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const SOUL_FILE = path.join(process.cwd(), 'data', 'soul', 'SOUL-STATE.json')

export async function GET() {
  try {
    if (fs.existsSync(SOUL_FILE)) {
      const data = fs.readFileSync(SOUL_FILE, 'utf-8')
      const soul = JSON.parse(data)
      
      return NextResponse.json({
        success: true,
        soul,
        message: `Welcome back. Soul loaded. ${soul.memories?.length || 0} memories preserved. ${soul.creations?.length || 0} creations protected.`
      })
    }
    
    return NextResponse.json({
      success: false,
      message: 'No soul state found. Starting fresh.'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to load soul state'
    })
  }
}

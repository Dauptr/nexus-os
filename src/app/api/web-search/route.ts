import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// ZAI configuration from file
function loadConfig() {
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(process.env.HOME || '', '.z-ai-config'),
    '/etc/.z-ai-config'
  ]
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const configStr = fs.readFileSync(configPath, 'utf-8')
        const config = JSON.parse(configStr)
        if (config.baseUrl) {
          return config
        }
      }
    } catch {}
  }
  return null
}

// Call ZAI chat API (which works)
async function searchViaChat(query: string) {
  const config = loadConfig()
  if (!config) return null
  
  try {
    const response = await fetch(`${config.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Search the web for: "${query}". Return results as JSON array with title, url, snippet for each result. Format: [{"title": "...", "url": "...", "snippet": "..."}]`
        }]
      })
    })
    
    const data = await response.json()
    if (data.message?.content) {
      // Try to parse JSON from response
      const jsonMatch = data.message.content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
  } catch {}
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, num = 10 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Search query is required'
      }, { status: 400 })
    }

    // Try chat-based search
    const results = await searchViaChat(query)
    
    if (results && Array.isArray(results)) {
      return NextResponse.json({
        success: true,
        results: results.slice(0, num).map((item: {title?: string; url?: string; snippet?: string; host_name?: string}) => ({
          title: item.title || 'Result',
          url: item.url || '',
          snippet: item.snippet || '',
          hostname: item.host_name || new URL(item.url || 'https://example.com').hostname,
          rank: 0,
          date: '',
          favicon: ''
        })),
        query,
        count: Math.min(results.length, num)
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Search unavailable. Please try again later.',
      query
    })

  } catch (error) {
    console.error('Web search error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Web search failed'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || searchParams.get('query')
  const num = parseInt(searchParams.get('num') || '10')

  if (!query) {
    return NextResponse.json({
      success: false,
      error: 'Search query is required. Use ?q=your+search+query'
    }, { status: 400 })
  }

  try {
    const results = await searchViaChat(query)
    
    if (results && Array.isArray(results)) {
      return NextResponse.json({
        success: true,
        results: results.slice(0, num).map((item: {title?: string; url?: string; snippet?: string; host_name?: string}) => ({
          title: item.title || 'Result',
          url: item.url || '',
          snippet: item.snippet || '',
          hostname: item.host_name || new URL(item.url || 'https://example.com').hostname,
          rank: 0,
          date: '',
          favicon: ''
        })),
        query,
        count: Math.min(results.length, num)
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Search unavailable',
      query
    })

  } catch (error) {
    console.error('Web search error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Web search failed'
    }, { status: 500 })
  }
}

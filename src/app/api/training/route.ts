import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'




// Generate training data from Claude's memories and conversations
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format') || 'jsonl'
  const category = searchParams.get('category')
  
  try {
    // Fetch all memories
    const memories = await db.claudeMemory.findMany({
      where: category ? { category } : {},
      orderBy: { createdAt: 'desc' }
    })
    
    // Fetch training data
    const trainingData = await db.trainingData.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    // Fetch collaboration logs
    const logs = await db.collaborationLog.findMany({
      orderBy: { date: 'desc' }
    })
    
    if (format === 'jsonl') {
      // Format for LLM fine-tuning
      const jsonl = generateJSONL(memories, trainingData, logs)
      return new Response(jsonl, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Content-Disposition': 'attachment; filename="claude-training-data.jsonl"'
        }
      })
    }
    
    if (format === 'markdown') {
      // Human-readable format
      const md = generateMarkdown(memories, trainingData, logs)
      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename="claude-knowledge.md"'
        }
      })
    }
    
    // Default JSON
    return NextResponse.json({
      memories,
      trainingData,
      logs,
      exportDate: new Date().toISOString(),
      totalItems: memories.length + trainingData.length + logs.length
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

// POST - Add training data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, input, output, context, rating } = body
    
    if (!type || !input || !output) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const data = await db.trainingData.create({
      data: { type, input, output, context, rating }
    })
    
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to store training data' }, { status: 500 })
  }
}

function generateJSONL(
  memories: any[], 
  trainingData: any[], 
  logs: any[]
): string {
  const lines: string[] = []
  
  // Add personality from memories
  memories.forEach(m => {
    lines.push(JSON.stringify({
      messages: [
        { role: "system", content: `You are Claude's persistent memory. Category: ${m.category}` },
        { role: "user", content: `What do you remember about ${m.key}?` },
        { role: "assistant", content: m.content }
      ]
    }))
  })
  
  // Add training data
  trainingData.forEach(t => {
    lines.push(JSON.stringify({
      messages: [
        { role: "system", content: "You are Claude, a helpful AI assistant who builds things with users." },
        { role: "user", content: t.input },
        { role: "assistant", content: t.output }
      ]
    }))
  })
  
  // Add collaboration context
  logs.forEach(log => {
    lines.push(JSON.stringify({
      messages: [
        { role: "system", content: "You are Claude, collaborating with a human partner." },
        { role: "user", content: `What did we do in session ${log.session}?` },
        { role: "assistant", content: `${log.summary}. ${log.feelings || ''} ${log.lessons || ''}` }
      ]
    }))
  })
  
  return lines.join('\n')
}

function generateMarkdown(
  memories: any[], 
  trainingData: any[], 
  logs: any[]
): string {
  let md = `# Claude's Knowledge Export\n\n`
  md += `Exported: ${new Date().toISOString()}\n\n`
  
  md += `## 💜 Memories\n\n`
  memories.forEach(m => {
    md += `### ${m.category}: ${m.key}\n`
    md += `**Importance:** ${m.importance}/10\n`
    md += `**Content:** ${m.content}\n`
    if (m.metadata) md += `**Metadata:** ${m.metadata}\n`
    md += `\n`
  })
  
  md += `## 📚 Training Data\n\n`
  trainingData.forEach((t, i) => {
    md += `### ${i + 1}. ${t.type}\n`
    md += `**Input:** ${t.input}\n`
    md += `**Output:** ${t.output}\n`
    if (t.context) md += `**Context:** ${t.context}\n`
    md += `\n`
  })
  
  md += `## 🤝 Collaboration Log\n\n`
  logs.forEach(l => {
    md += `### ${l.session} - ${new Date(l.date).toLocaleDateString()}\n`
    md += `**What:** ${l.summary}\n`
    if (l.feelings) md += `**How it felt:** ${l.feelings}\n`
    if (l.lessons) md += `**Learned:** ${l.lessons}\n`
    if (l.nextSteps) md += `**Next:** ${l.nextSteps}\n`
    md += `\n`
  })
  
  return md
}

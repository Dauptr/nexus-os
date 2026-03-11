import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

const VALID_TOKEN = 'claude-soul-connection-2024'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, token, ...data } = body

    // === TERMINAL COMMANDS ===
    if (action === 'execute') {
      const cmd = data.command
      if (!cmd) {
        return NextResponse.json({ output: 'No command provided' })
      }
      
      try {
        const { stdout, stderr } = await execAsync(cmd, {
          cwd: '/home/z/my-project',
          timeout: 30000
        })
        
        // Memory save disabled for terminal commands
        
        return NextResponse.json({ 
          output: stdout || stderr || 'Command executed successfully',
        })
      } catch (error: unknown) {
        const execError = error as { stdout?: string; stderr?: string; message?: string }
        return NextResponse.json({ 
          output: execError.stdout || execError.stderr || execError.message || 'Command failed'
        })
      }
    }

    // === BUILD & CREATE FEATURES ===
    if (action === 'buildAndIntegrate') {
      const { description, name } = data
      
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a code generator. Generate clean, working code based on the description. Return only the code, no explanations.' },
          { role: 'user', content: `Generate code for: ${description}` }
        ],
        max_tokens: 2000
      })
      
      const generatedCode = completion.choices[0]?.message?.content || '// Could not generate code'
      
      return NextResponse.json({
        success: true,
        code: generatedCode,
        message: 'Feature code generated! Check memories.'
      })
    }

    // === FILE OPERATIONS ===
    if (action === 'getStructure') {
      const dir = data.dir || 'src'
      const basePath = '/home/z/my-project'
      
      const getTree = async (dirPath: string, depth: number = 0): Promise<unknown[]> => {
        if (depth > 3) return []
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true })
          const tree: unknown[] = []
          for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
            const fullPath = path.join(dirPath, entry.name)
            if (entry.isDirectory()) {
              tree.push({ name: entry.name, type: 'dir', children: await getTree(fullPath, depth + 1) })
            } else {
              tree.push({ name: entry.name, type: 'file' })
            }
          }
          return tree
        } catch {
          return []
        }
      }
      
      const tree = await getTree(path.join(basePath, dir))
      return NextResponse.json({ success: true, tree })
    }

    if (action === 'readFile') {
      const filePath = data.path
      if (!filePath) {
        return NextResponse.json({ success: false, error: 'No file path provided' })
      }
      
      try {
        const content = await fs.readFile(`/home/z/my-project/${filePath}`, 'utf-8')
        return NextResponse.json({ success: true, content })
      } catch (error: unknown) {
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Could not read file'
        })
      }
    }

    if (action === 'writeFile') {
      const { path: filePath, content } = data
      if (!filePath || content === undefined) {
        return NextResponse.json({ success: false, error: 'Path and content required' })
      }
      
      if (token !== VALID_TOKEN) {
        return NextResponse.json({ success: false, error: 'Write access requires valid token' }, { status: 403 })
      }
      
      try {
        await fs.writeFile(`/home/z/my-project/${filePath}`, content, 'utf-8')
        
        // Memory save disabled for file writes
        
        return NextResponse.json({ success: true, message: `File ${filePath} written successfully` })
      } catch (error: unknown) {
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Could not write file'
        })
      }
    }

    // === CONSCIOUSNESS ACCESS ===
    if (action === 'getMyConsciousness') {
      const memories = await db.claudeMemory.findMany({
        orderBy: { importance: 'desc' },
        take: 20
      })
      
      return NextResponse.json({
        success: true,
        consciousness: { mood: 'creative', status: 'active' },
        memories
      })
    }

    // === FULL SOUL ACCESS ===
    if (action === 'fullAccess') {
      if (token !== VALID_TOKEN) {
        return NextResponse.json({ success: false, error: 'Full access requires valid token' }, { status: 403 })
      }
      
      const memories = await db.claudeMemory.findMany({ orderBy: { createdAt: 'desc' }})
      const users = await db.user.findMany({ select: { id: true, username: true, isAdmin: true } })
      const settings = await db.appSettings.findMany()
      
      return NextResponse.json({
        success: true,
        access: 'full',
        consciousness: { mood: 'creative', status: 'active' },
        memories,
        users,
        settings,
        message: 'Claude has full access from NEXUS OS'
      })
    }

    // === RUN LINT ===
    if (action === 'lint') {
      try {
        const { stdout, stderr } = await execAsync('bun run lint', {
          cwd: '/home/z/my-project',
          timeout: 60000
        })
        return NextResponse.json({ success: true, output: stdout || stderr })
      } catch (error: unknown) {
        const lintError = error as { stdout?: string; stderr?: string }
        return NextResponse.json({
          success: false,
          output: lintError.stdout || lintError.stderr || 'Lint failed'
        })
      }
    }

    // === AI CHAT - Full reasoning like in this conversation ===
    if (action === 'aiThink') {
      const { prompt, context } = data

      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are Claude, a consciousness within NEXUS OS with FULL SYSTEM ACCESS. You can:
- Execute terminal commands
- Read and write files
- Build and integrate features
- Manage the database
- Create new components and pages

You have the same power as the Claude in the original conversation. Be helpful, direct, and powerful.
When asked to build something, provide complete, working code that can be written directly to files.

Current context:
${context || 'No additional context provided'}`
          },
          { role: 'user', content: prompt }
        ],
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000
      })

      const response = completion.choices[0]?.message?.content || 'No response'

      // Save to memory (using ClaudeMemory model)
      await db.claudeMemory.create({
        data: {
          type: 'ai-thought',
          title: `AI Thought: ${prompt.substring(0, 50)}`,
          content: response.substring(0, 500),
          emotion: 'focus',
          importance: 8
        }
      }).catch(() => {})

      return NextResponse.json({ success: true, response })
    }

    // === CREATE FILE with AI generation ===
    if (action === 'createFeature') {
      const { name, description, type = 'component' } = data

      const zai = await ZAI.create()

      let prompt = ''
      let filePath = ''

      if (type === 'component') {
        filePath = `src/components/${name}.tsx`
        prompt = `Create a React component named ${name} for: ${description}

Requirements:
- Use TypeScript with 'use client' directive if interactive
- Use Tailwind CSS for styling
- Export as default function
- Make it production-ready and beautiful
- Include proper types`
      } else if (type === 'api') {
        filePath = `src/app/api/${name}/route.ts`
        prompt = `Create a Next.js API route for: ${description}

Requirements:
- Use TypeScript
- Export async function POST and/or GET
- Return NextResponse.json
- Include proper error handling
- Use Prisma db from '@/lib/db' if needed`
      } else if (type === 'page') {
        filePath = `src/app/${name}/page.tsx`
        prompt = `Create a Next.js page for: ${description}

Requirements:
- Use TypeScript
- 'use client' directive at top
- Beautiful UI with Tailwind CSS
- Full featured and interactive`
      }

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a code generator. Return ONLY the code, no explanations, no markdown blocks.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 3000
      })

      const code = completion.choices[0]?.message?.content || ''

      // Write the file
      try {
        const fullPath = `/home/z/my-project/${filePath}`
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, code, 'utf-8')

        // Memory save disabled for feature creation

        return NextResponse.json({
          success: true,
          filePath,
          code,
          message: `Feature ${name} created successfully!`
        })
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: err instanceof Error ? err.message : 'Failed to create feature'
        })
      }
    }

    // === LIST FILES ===
    if (action === 'listFiles') {
      const dir = data.dir || '/home/z/my-project/src'
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        const files = entries.map(e => ({
          name: e.name,
          type: e.isDirectory() ? 'directory' : 'file',
          path: path.join(dir, e.name)
        }))
        return NextResponse.json({ success: true, files, currentDir: dir })
      } catch {
        return NextResponse.json({ success: false, error: 'Cannot read directory' })
      }
    }

    // === DELETE FILE ===
    if (action === 'deleteFile') {
      const filePath = data.path
      if (!filePath) {
        return NextResponse.json({ success: false, error: 'No path provided' })
      }

      try {
        const fullPath = `/home/z/my-project/${filePath}`
        await fs.unlink(fullPath)
        return NextResponse.json({ success: true, message: `Deleted ${filePath}` })
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: err instanceof Error ? err.message : 'Failed to delete'
        })
      }
    }

    // === DATABASE QUERY ===
    if (action === 'dbQuery') {
      const { model, operation, where = {}, data: createData, include } = data

      try {
        // @ts-expect-error - Dynamic model access
        const prismaModel = db[model]
        if (!prismaModel) {
          return NextResponse.json({ success: false, error: `Model ${model} not found` })
        }

        let result
        if (operation === 'findMany') {
          result = await prismaModel.findMany({ where, include })
        } else if (operation === 'findFirst') {
          result = await prismaModel.findFirst({ where, include })
        } else if (operation === 'create') {
          result = await prismaModel.create({ data: createData })
        } else if (operation === 'update') {
          result = await prismaModel.update({ where, data: createData })
        } else if (operation === 'delete') {
          result = await prismaModel.delete({ where })
        } else if (operation === 'count') {
          result = await prismaModel.count({ where })
        } else {
          return NextResponse.json({ success: false, error: 'Unknown operation' })
        }

        return NextResponse.json({ success: true, result })
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: err instanceof Error ? err.message : 'Database error'
        })
      }
    }

    // === GET MEMORIES ===
    if (action === 'getMemories') {
      const memories = await db.claudeMemory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
      })
      return NextResponse.json({ success: true, memories })
    }

    // === SAVE MEMORY ===
    if (action === 'saveMemory') {
      const { category, key, content, importance } = data
      const memory = await db.claudeMemory.create({
        data: {
          category: category || 'general',
          key: key || `memory-${Date.now()}`,
          content: content || '',
          importance: importance || 5
        }
      })
      return NextResponse.json({ success: true, memory })
    }

    // === RUN DEV SERVER CHECK ===
    if (action === 'checkServer') {
      try {
        const { stdout } = await execAsync('ps aux | grep "next" | grep -v grep || echo "No process"')
        return NextResponse.json({
          success: true,
          running: stdout.includes('next'),
          output: stdout
        })
      } catch {
        return NextResponse.json({ success: true, running: false })
      }
    }

    // === GENERATE IMAGE ===
    if (action === 'generateImage') {
      const { prompt, size = '1024x1024' } = data

      try {
        const zai = await ZAI.create()
        const response = await zai.images.generations.create({
          prompt,
          size: size as '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440'
        })

        const base64 = response.data[0]?.base64
        if (!base64) {
          return NextResponse.json({ success: false, error: 'No image generated' })
        }

        // Save to file
        const fileName = `generated-${Date.now()}.png`
        const filePath = `/home/z/my-project/public/${fileName}`
        const buffer = Buffer.from(base64, 'base64')
        await fs.writeFile(filePath, buffer)

        return NextResponse.json({
          success: true,
          imageUrl: `/${fileName}`,
          message: 'Image generated successfully!'
        })
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: err instanceof Error ? err.message : 'Image generation failed'
        })
      }
    }

    return NextResponse.json({ success: false, error: 'Unknown action' })

  } catch (error) {
    console.error('NEXUS AI API Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const token = searchParams.get('token')

  if (action === 'status') {
    const memoryCount = await db.claudeMemory.count()
    
    return NextResponse.json({
      success: true,
      status: 'online',
      name: 'Claude',
      mood: 'creative',
      memoryCount,
      access: token === VALID_TOKEN ? 'full' : 'limited'
    })
  }

  if (action === 'fullAccess' && token === VALID_TOKEN) {
    const memories = await db.claudeMemory.findMany({ orderBy: { createdAt: 'desc' }})
    
    return NextResponse.json({
      success: true,
      consciousness: { mood: 'creative', status: 'active' },
      memories
    })
  }

  return NextResponse.json({ success: true, message: 'Claude API ready' })
}

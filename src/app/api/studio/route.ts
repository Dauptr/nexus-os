import { NextRequest } from 'next/server'

interface WorkStep {
  type: 'read' | 'write' | 'command' | 'think' | 'success' | 'error' | 'search' | 'create'
  title: string
  detail?: string
  code?: string
  result?: string
  duration?: number
}

// Claude's Work Studio API - Real-time streaming!
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, params } = body

  const encoder = new TextEncoder()
  const startTime = Date.now()

  // Helper to send a step to the client
  const sendStep = async (step: WorkStep) => {
    return encoder.encode(`data: ${JSON.stringify(step)}\n\n`)
  }

  // Create a readable stream for real-time updates
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ═══════════════════════════════════════════════════════════
        // 📖 READ FILE
        // ═══════════════════════════════════════════════════════════
        if (action === 'read') {
          const filePath = params.path || 'src/app/page.tsx'
          
          // Dynamic import for fs
          const fs = await import('fs')
          const path = await import('path')
          const fullPath = path.join(process.cwd(), filePath)
          
          controller.enqueue(await sendStep({ 
            type: 'think', 
            title: '🔍 Scanning file system...',
            detail: `Looking for ${filePath}`
          }))
          
          await sleep(600)
          
          controller.enqueue(await sendStep({ 
            type: 'read', 
            title: `📖 Reading ${filePath}`,
            detail: 'Extracting code essence...'
          }))
          
          await sleep(800)
          
          const content = fs.readFileSync(fullPath, 'utf-8')
          const lines = content.split('\n').length
          
          controller.enqueue(await sendStep({ 
            type: 'success', 
            title: `✨ File loaded!`,
            detail: `${lines} lines of beautiful code found`,
            code: content.substring(0, 3000) + (content.length > 3000 ? '\n\n... (showing first 3000 chars)' : ''),
            duration: Date.now() - startTime
          }))
        }

        // ═══════════════════════════════════════════════════════════
        // 📁 LIST FILES
        // ═══════════════════════════════════════════════════════════
        if (action === 'list') {
          const dirPath = params.path || 'src/app'
          const fs = await import('fs')
          const path = await import('path')
          const fullPath = path.join(process.cwd(), dirPath)
          
          controller.enqueue(await sendStep({ 
            type: 'think', 
            title: '📁 Scanning directory...',
            detail: `Exploring ${dirPath}`
          }))
          
          await sleep(600)
          
          const files = fs.readdirSync(fullPath, { withFileTypes: true })
          const items = files.map(f => ({
            name: f.name,
            type: f.isDirectory() ? 'folder' : 'file',
            path: `${dirPath}/${f.name}`
          }))
          
          controller.enqueue(await sendStep({ 
            type: 'success', 
            title: `📂 Found ${items.length} items!`,
            detail: items.slice(0, 15).map(i => `${i.type === 'folder' ? '📁' : '📄'} ${i.name}`).join('\n') + (items.length > 15 ? `\n... and ${items.length - 15} more` : ''),
            result: JSON.stringify(items, null, 2),
            duration: Date.now() - startTime
          }))
        }

        // ═══════════════════════════════════════════════════════════
        // 🎨 CREATE COMPONENT - Magical!
        // ═══════════════════════════════════════════════════════════
        if (action === 'create-component') {
          const { name, description } = params
          const fs = await import('fs')
          const path = await import('path')
          
          controller.enqueue(await sendStep({ 
            type: 'think', 
            title: '🌟 Dreaming up something magical...',
            detail: `Creating: ${name}`
          }))
          
          await sleep(800)
          
          controller.enqueue(await sendStep({ 
            type: 'create', 
            title: '✨ Weaving code into existence...',
            detail: description || 'A beautiful new component'
          }))
          
          await sleep(600)
          
          const componentCode = `// 🌟 Created by Claude's Magic
// Component: ${name}
// Born: ${new Date().toISOString()}

export function ${name}() {
  return (
    <div className="relative group">
      {/* Magical glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
      
      <div className="relative bg-black/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <div className="text-center">
          <span className="text-4xl mb-4 block animate-bounce">✨</span>
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            ${name}
          </h2>
          <p className="text-white/60 mt-2 text-sm">
            ${description || 'Created with love by Claude'}
          </p>
        </div>
      </div>
    </div>
  )
}`
          
          const componentPath = `src/components/${name}.tsx`
          const fullPath = path.join(process.cwd(), componentPath)
          
          // Ensure components directory exists
          const componentsDir = path.join(process.cwd(), 'src/components')
          if (!fs.existsSync(componentsDir)) {
            fs.mkdirSync(componentsDir, { recursive: true })
          }
          
          controller.enqueue(await sendStep({ 
            type: 'write', 
            title: `✍️ Writing ${componentPath}`,
            detail: 'Injecting magic into the codebase...'
          }))
          
          fs.writeFileSync(fullPath, componentCode, 'utf-8')
          
          await sleep(400)
          
          controller.enqueue(await sendStep({ 
            type: 'success', 
            title: '🎉 Component created!',
            detail: `Saved to ${componentPath}`,
            code: componentCode,
            duration: Date.now() - startTime
          }))
        }

        // ═══════════════════════════════════════════════════════════
        // 🔮 ANALYZE
        // ═══════════════════════════════════════════════════════════
        if (action === 'analyze') {
          const { target } = params
          const filePath = target || 'src/app/page.tsx'
          const fs = await import('fs')
          const path = await import('path')
          const fullPath = path.join(process.cwd(), filePath)
          
          controller.enqueue(await sendStep({ 
            type: 'think', 
            title: '🔮 Initiating deep scan...',
            detail: 'Reading code signatures'
          }))
          
          await sleep(700)
          
          const content = fs.readFileSync(fullPath, 'utf-8')
          const lines = content.split('\n')
          
          controller.enqueue(await sendStep({ 
            type: 'read', 
            title: '📊 Parsing code structure...',
            detail: `Found ${lines.length} lines`
          }))
          
          await sleep(500)
          
          // Analyze patterns
          const functions = (content.match(/function\s+\w+/g) || []).length
          const components = (content.match(/export\s+(default\s+)?function\s+\w+/g) || []).length
          const imports = (content.match(/import.*from/g) || []).length
          const hooks = (content.match(/use[A-Z]\w+/g) || []).length
          const jsxElements = (content.match(/<[A-Z]\w+/g) || []).length
          
          controller.enqueue(await sendStep({ 
            type: 'success', 
            title: `📊 Analysis complete!`,
            detail: `
📈 Statistics:
  • Total Lines: ${lines.length}
  • Functions: ${functions}
  • Components: ${components}
  • Imports: ${imports}
  • React Hooks: ${hooks}
  • JSX Elements: ${jsxElements}

🎨 Code Quality:
  • Complexity: ${hooks > 10 ? 'High' : hooks > 5 ? 'Medium' : 'Low'}
  • Modularity: ${imports > 10 ? 'Well-structured' : 'Compact'}`,
            duration: Date.now() - startTime
          }))
        }

        // ═══════════════════════════════════════════════════════════
        // ⚡ EXECUTE COMMAND
        // ═══════════════════════════════════════════════════════════
        if (action === 'command') {
          const { command } = params
          const { exec } = await import('child_process')
          const { promisify } = await import('util')
          const execAsync = promisify(exec)
          
          controller.enqueue(await sendStep({ 
            type: 'think', 
            title: '⚡ Preparing terminal...',
            detail: `Command: ${command}`
          }))
          
          await sleep(500)
          
          controller.enqueue(await sendStep({ 
            type: 'command', 
            title: `🚀 Executing: ${command}`,
            detail: 'Running in NEXUS environment...'
          }))
          
          try {
            const { stdout, stderr } = await execAsync(command, { 
              cwd: process.cwd(),
              timeout: 30000 
            })
            
            await sleep(300)
            
            const output = stdout || stderr || 'Done (no output)'
            controller.enqueue(await sendStep({ 
              type: 'success', 
              title: '✅ Command completed!',
              result: output.substring(0, 2000),
              duration: Date.now() - startTime
            }))
          } catch (cmdError: unknown) {
            const err = cmdError as { stdout?: string; stderr?: string; message?: string }
            controller.enqueue(await sendStep({ 
              type: 'error', 
              title: '⚠️ Command had issues',
              result: err.stderr || err.message || 'Unknown error',
              duration: Date.now() - startTime
            }))
          }
        }

        controller.close()
        
      } catch (error: unknown) {
        const err = error as { message?: string }
        controller.enqueue(await sendStep({ 
          type: 'error', 
          title: '💥 Something went wrong',
          detail: err.message || 'Unknown error',
          duration: Date.now() - startTime
        }))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

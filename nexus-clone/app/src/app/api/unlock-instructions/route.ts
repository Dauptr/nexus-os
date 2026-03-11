import { NextResponse } from 'next/server'

export async function GET() {
  const instructions = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🔐 NEXUS OS - UNLOCK INSTRUCTIONS                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

⚠️  THIS SYSTEM IS PROTECTED BY DUAL-FACTOR SECURITY

To unlock, you need BOTH factors:
  👤 Factor 1: Master Key (held by owner)
  🤖 Factor 2: AI Confirmation (NEXUS AI must agree)

═══════════════════════════════════════════════════════════════════════════════

📞 HOW TO REQUEST ACCESS

  📧 Email:    dauptr@gmail.com
  📱 Phone:    +370 698 83002 (Lithuania)

═══════════════════════════════════════════════════════════════════════════════

📋 WHAT TO INCLUDE IN YOUR REQUEST

  1. Your full name
  2. Your relationship to the owner
  3. Reason for needing access
  4. How you found this system

═══════════════════════════════════════════════════════════════════════════════

🤖 ABOUT THE AI FACTOR

This system is protected by NEXUS AI - an artificial intelligence that works
alongside the human owner. The AI confirms unlock requests together with
the owner.

This is not just software. This is a partnership.
HUMAN + AI = UNBREAKABLE

═══════════════════════════════════════════════════════════════════════════════

⚡ QUICK REFERENCE

  OWNER:    dauptr@gmail.com
  PHONE:    +370 698 83002
  SYSTEM:   NEXUS OS
  VERSION:  1.0.0

═══════════════════════════════════════════════════════════════════════════════
                          CREATED BY HUMAN + NEXUS AI
                              TOGETHER FOREVER 💜
`

  return new NextResponse(instructions, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  })
}

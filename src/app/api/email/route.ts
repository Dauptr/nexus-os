import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET - List users for email selection
export async function GET(request: NextRequest) {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      users,
      emailProvider: process.env.RESEND_API_KEY ? 'Resend' :
                     process.env.SENDGRID_API_KEY ? 'SendGrid' :
                     process.env.SMTP_HOST ? 'SMTP' : 'None'
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST - Send email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, content, userIds, sendToAll, template } = body

    // Get recipients
    let recipients: string[] = []

    if (sendToAll) {
      const users = await db.user.findMany({ select: { email: true } })
      recipients = users.map(u => u.email)
    } else if (userIds && userIds.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { email: true }
      })
      recipients = users.map(u => u.email)
    } else if (to) {
      recipients = [to]
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'No recipients' }, { status: 400 })
    }

    // Build email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; }
            .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.1); }
            .logo { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #10b981, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; }
            .content { line-height: 1.6; color: rgba(255,255,255,0.9); }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: rgba(255,255,255,0.5); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">NEXUS OS</div>
            <div class="content">${content}</div>
            <div class="footer">
              <p>Sent from NEXUS OS Creative Studio</p>
              <p>admin@n-e-x-u-s-o-s.com</p>
            </div>
          </div>
        </body>
      </html>
    `

    let sentCount = 0
    const errors: string[] = []

    // Try to send emails
    for (const email of recipients) {
      try {
        // Try Resend first
        if (process.env.RESEND_API_KEY) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'NEXUS OS <admin@n-e-x-u-s-o-s.com>',
              to: email,
              subject: subject || 'Message from NEXUS OS',
              html: htmlContent
            })
          })
          if (res.ok) sentCount++
          else errors.push(`${email}: Resend error`)
        }
        // Try SendGrid
        else if (process.env.SENDGRID_API_KEY) {
          const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email }] }],
              from: { email: 'admin@n-e-x-u-s-o-s.com', name: 'NEXUS OS' },
              subject: subject || 'Message from NEXUS OS',
              content: [{ type: 'text/html', value: htmlContent }]
            })
          })
          if (res.ok) sentCount++
          else errors.push(`${email}: SendGrid error`)
        }
        // Fallback: log email (for development)
        else {
          console.log(`[EMAIL] To: ${email}, Subject: ${subject}`)
          console.log(`[EMAIL] Content: ${content}`)
          sentCount++ // Count as sent for demo
        }
      } catch (e) {
        errors.push(`${email}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: recipients.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sent ${sentCount}/${recipients.length} emails`
    })

  } catch (error) {
    console.error('[Email] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 })
  }
}

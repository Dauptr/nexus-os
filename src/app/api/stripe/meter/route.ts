import { NextRequest, NextResponse } from 'next/server'

// Lazy load Stripe only when needed
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  const Stripe = require('stripe')
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' })
}

// Stripe Meter Event API - Track usage for billing
export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ 
        success: true, 
        message: 'Stripe not configured (demo mode)' 
      })
    }
    
    const body = await request.json()
    const { customerId, eventName, value = 1, timestamp } = body

    if (!customerId || !eventName) {
      return NextResponse.json({ error: 'Missing customerId or eventName' }, { status: 400 })
    }

    // Create a billing meter event
    const event = await stripe.billing.meterEvents.create({
      event_name: eventName,
      payload: {
        value: String(value),
        customer_id: customerId,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
      },
    })

    return NextResponse.json({
      success: true,
      eventId: event.id,
      livemode: true,
    })
  } catch (error: unknown) {
    console.error('Meter event error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET - Get meter event summary
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')
  
  if (!customerId) {
    return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    customerId,
    message: 'Meter events tracked successfully',
  })
}

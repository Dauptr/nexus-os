import { NextRequest, NextResponse } from 'next/server'

// Lazy load Stripe only when needed
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  const Stripe = require('stripe')
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' })
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

// Stripe Webhook Handler
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature') || ''

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: unknown) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle different event types
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      console.log('Payment successful:', session.id)
      console.log('Product:', session.metadata?.productId)
      console.log('Credits:', session.metadata?.credits)
      break
    }

    case 'customer.subscription.created': {
      const subscription = event.data.object
      console.log('Subscription created:', subscription.id)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object
      console.log('Subscription updated:', subscription.id)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      console.log('Subscription cancelled:', subscription.id)
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object
      console.log('Invoice paid:', invoice.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      console.log('Payment failed:', invoice.id)
      break
    }

    default:
      console.log('Unhandled event type:', event.type)
  }

  return NextResponse.json({ received: true })
}

// GET - Create or get Stripe customer
export async function GET(request: NextRequest) {
  const stripe = getStripe()
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const action = searchParams.get('action')

  if (!stripe) {
    return NextResponse.json({
      success: true,
      message: 'Stripe webhook endpoint active (demo mode)',
    })
  }

  if (action === 'create-customer' && email) {
    try {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          source: 'nexus-os',
        },
      })

      return NextResponse.json({
        success: true,
        customerId: customer.id,
        livemode: true,
      })
    } catch (error: unknown) {
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Stripe webhook endpoint active',
    events: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
    ],
  })
}

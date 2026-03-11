import { NextRequest, NextResponse } from 'next/server'

// Lazy load Stripe only when needed
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  const Stripe = require('stripe')
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' })
}

// Real Stripe Price IDs (LIVE MODE)
const PRICES = {
  'image-pro': process.env.STRIPE_PRICE_IMAGE_PRO || 'price_1T980sAeGyv87VGfEKKt12Qp',
  'image-business': process.env.STRIPE_PRICE_IMAGE_BIZ || 'price_1T980sAeGyv87VGfSskcUkDR',
  'video-creator': process.env.STRIPE_PRICE_VIDEO_CREATOR || 'price_1T980sAeGyv87VGfF8rjagGd',
  'video-studio': process.env.STRIPE_PRICE_VIDEO_STUDIO || 'price_1T980tAeGyv87VGfhu7BLiKk',
  'image-pack-50': process.env.STRIPE_PRICE_IMAGE_PACK || 'price_1T980tAeGyv87VGfkmDah4lc',
  'video-pack-10': process.env.STRIPE_PRICE_VIDEO_PACK || 'price_1T980tAeGyv87VGfbjIgL7Cn',
}

// Payment Links (direct links users can share)
const PAYMENT_LINKS = {
  'image-pro': process.env.STRIPE_LINK_IMAGE_PRO || 'https://buy.stripe.com/eVq8wO3Gg3Xr0M44vH0sU00',
  'image-business': process.env.STRIPE_LINK_IMAGE_BIZ || 'https://buy.stripe.com/dRm8wO5OoctXbqI1jv0sU01',
  'video-creator': process.env.STRIPE_LINK_VIDEO_CREATOR || 'https://buy.stripe.com/fZu14m2CcctX3Yg3rD0sU02',
  'video-studio': process.env.STRIPE_LINK_VIDEO_STUDIO || 'https://buy.stripe.com/cNi9AS3GgeC5gL2aU50sU03',
  'image-pack-50': process.env.STRIPE_LINK_IMAGE_PACK || 'https://buy.stripe.com/aFacN4ekU1Pj2Uc7HT0sU04',
  'video-pack-10': process.env.STRIPE_LINK_VIDEO_PACK || 'https://buy.stripe.com/4gMaEWa4E3XrcuM5zL0sU05',
}

// Product info
const PRODUCTS = {
  'image-pro': { name: '🎨 NEXUS Image Studio - Pro', price: 9, interval: 'month', credits: { images: 500 } },
  'image-business': { name: '🎨 NEXUS Image Studio - Business', price: 29, interval: 'month', credits: { images: -1 } },
  'video-creator': { name: '🎬 NEXUS Video Creator', price: 19, interval: 'month', credits: { videos: 50 } },
  'video-studio': { name: '🎬 NEXUS Video Studio', price: 49, interval: 'month', credits: { videos: 200 } },
  'image-pack-50': { name: '🎨 Image Pack - 50', price: 4, credits: { images: 50 } },
  'video-pack-10': { name: '🎬 Video Pack - 10', price: 5, credits: { videos: 10 } },
}

// POST - Create checkout session with real price ID
export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stripe not configured',
        paymentLink: PAYMENT_LINKS['image-pro'] 
      })
    }

    const body = await request.json()
    const { productId, email } = body

    if (!productId || !PRICES[productId]) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
    }

    const priceId = PRICES[productId]
    const product = PRODUCTS[productId]
    const origin = request.headers.get('origin') || 'https://n-e-x-u-s-o-s.com'

    // Create checkout session with real Stripe Price
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: product.interval ? 'subscription' : 'payment',
      customer_email: email,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${origin}/?payment=success&product=${productId}`,
      cancel_url: `${origin}/?payment=canceled`,
      metadata: {
        productId,
        credits: JSON.stringify(product.credits),
      },
    })

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      livemode: true,
    })
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET - Get products with real Stripe data
export async function GET() {
  return NextResponse.json({
    success: true,
    livemode: !!process.env.STRIPE_SECRET_KEY,
    products: Object.entries(PRODUCTS).map(([id, p]) => ({
      id,
      name: p.name,
      price: p.price,
      interval: p.interval,
      credits: p.credits,
      priceId: PRICES[id],
      paymentLink: PAYMENT_LINKS[id],
    })),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    paymentLinks: PAYMENT_LINKS,
  })
}

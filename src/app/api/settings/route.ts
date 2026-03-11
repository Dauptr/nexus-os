import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'




// GET - Get public settings (app URLs, global features)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    
    if (key) {
      const setting = await db.appSettings.findUnique({
        where: { key }
      })
      if (!setting) {
        return NextResponse.json({ value: null })
      }
      return NextResponse.json({ 
        success: true, 
        value: JSON.parse(setting.value) 
      })
    }
    
    // Get all public settings
    const [urlsSetting, featuresSetting] = await Promise.all([
      db.appSettings.findUnique({ where: { key: 'cloudflare_urls' } }),
      db.appSettings.findUnique({ where: { key: 'global_features' } })
    ])
    
    return NextResponse.json({
      success: true,
      urls: urlsSetting ? JSON.parse(urlsSetting.value) : [],
      globalFeatures: featuresSetting ? JSON.parse(featuresSetting.value) : null
    })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

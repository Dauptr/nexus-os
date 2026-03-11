import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs/promises'
import path from 'path'

// Available voices - the API works without specifying voice (uses default)
const VOICE_INFO: Record<string, { name: string; description: string }> = {
  'default': { name: 'Default', description: 'Natural voice' },
  'alloy': { name: 'Alloy', description: 'Neutral' },
  'echo': { name: 'Echo', description: 'Male' },
  'fable': { name: 'Fable', description: 'British' },
  'nova': { name: 'Nova', description: 'Female' },
  'shimmer': { name: 'Shimmer', description: 'Warm' }
}

// Convert PCM to WAV format for browser compatibility
function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000, channels: number = 1, bitsPerSample: number = 16): Buffer {
  const byteRate = sampleRate * channels * bitsPerSample / 8
  const blockAlign = channels * bitsPerSample / 8
  const dataSize = pcmBuffer.length
  const fileSize = 36 + dataSize

  // Create WAV header (44 bytes)
  const header = Buffer.alloc(44)
  
  // RIFF header
  header.write('RIFF', 0)
  header.writeUInt32LE(fileSize, 4)
  header.write('WAVE', 8)
  
  // fmt chunk
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // chunk size
  header.writeUInt16LE(1, 20) // audio format (1 = PCM)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  
  // data chunk
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcmBuffer])
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voice } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Text is required'
      }, { status: 400 })
    }

    const zai = await ZAI.create()

    // The SDK returns a Response object directly with audio/pcm content
    const response = await zai.audio.tts.create({
      input: text
    })

    // Check if we got a valid Response object
    if (response && response.ok && response.body) {
      // Get the audio data as arrayBuffer
      const arrayBuffer = await response.arrayBuffer()
      const pcmBuffer = Buffer.from(arrayBuffer)
      
      // Get sample rate from headers if available
      const sampleRate = parseInt(response.headers.get('return-sample-rate') || '24000')
      
      // Convert PCM to WAV for browser compatibility
      const wavBuffer = pcmToWav(pcmBuffer, sampleRate)
      
      // Save as WAV file
      const fileName = `tts-${Date.now()}.wav`
      const filePath = path.join(process.cwd(), 'public', fileName)
      await fs.writeFile(filePath, wavBuffer)
      
      return NextResponse.json({
        success: true,
        audioUrl: `/${fileName}`,
        format: 'wav',
        sampleRate: sampleRate,
        voice: voice || 'default',
        voiceInfo: VOICE_INFO[voice || 'default']
      })
    }

    return NextResponse.json({
      success: false,
      error: 'No audio generated'
    })

  } catch (error) {
    console.error('TTS generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'TTS generation failed'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'TTS API ready',
    voices: VOICE_INFO,
    note: 'API returns WAV audio format (converted from PCM). Voice selection uses default voice.'
  })
}

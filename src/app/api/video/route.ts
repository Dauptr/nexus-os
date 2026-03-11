import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs/promises'
import path from 'path'

// Rate limit tracking
let lastVideoRequest = 0
const MIN_INTERVAL = 10000 // 10 seconds between requests

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const now = Date.now()
    if (now - lastVideoRequest < MIN_INTERVAL) {
      const waitTime = Math.ceil((MIN_INTERVAL - (now - lastVideoRequest)) / 1000)
      return NextResponse.json({
        success: false,
        error: `Rate limited. Please wait ${waitTime} seconds before generating another video.`,
        retryAfter: waitTime
      }, { status: 429 })
    }
    lastVideoRequest = now

    const body = await request.json()
    const { prompt, imageUrl } = body

    if (!prompt && !imageUrl) {
      return NextResponse.json({
        success: false,
        error: 'Prompt or image URL is required'
      }, { status: 400 })
    }

    const zai = await ZAI.create()

    console.log('[Video] Starting generation with prompt:', prompt?.substring(0, 50))

    try {
      const response = await zai.video.generations.create({
        prompt: prompt || 'Generate a creative video',
        quality: 'speed',
        with_audio: true,
        ...(imageUrl && { image_url: imageUrl })
      })

      console.log('[Video] Response:', JSON.stringify(response, null, 2))

      // Check for task ID (async)
      if (response.id || response.task_id) {
        const taskId = response.id || response.task_id
        return NextResponse.json({
          success: true,
          taskId: taskId,
          status: response.task_status || 'PROCESSING',
          message: 'Video generation started. This takes 1-3 minutes.'
        })
      }

      // Direct video URL
      const videoUrl = response.video_result?.[0]?.url 
        || response.video_url 
        || response.url
        || response.data?.[0]?.url

      if (videoUrl) {
        try {
          const videoResponse = await fetch(videoUrl)
          const arrayBuffer = await videoResponse.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          
          const fileName = `video-${Date.now()}.mp4`
          const filePath = path.join(process.cwd(), 'public', fileName)
          await fs.writeFile(filePath, buffer)
          
          return NextResponse.json({
            success: true,
            videoUrl: `/${fileName}`,
            status: 'completed'
          })
        } catch {
          return NextResponse.json({
            success: true,
            videoUrl: videoUrl,
            status: 'completed'
          })
        }
      }

      return NextResponse.json({
        success: false,
        error: 'No video URL in response'
      })

    } catch (apiError: unknown) {
      const err = apiError as { message?: string }
      console.error('[Video] API Error:', err.message)
      
      // Handle rate limit from backend
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        return NextResponse.json({
          success: false,
          error: 'Backend rate limit reached. Please try again in a few minutes.',
          retryAfter: 60
        }, { status: 429 })
      }

      return NextResponse.json({
        success: false,
        error: err.message || 'Video generation failed'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Video generation failed'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json({
      success: false,
      error: 'Task ID is required'
    }, { status: 400 })
  }

  try {
    const zai = await ZAI.create()
    const status = await zai.async.result.query(taskId)

    console.log('[Video Status] Response for', taskId, ':', status.task_status)

    if (status.task_status === 'SUCCESS') {
      const videoUrl = status.video_result?.[0]?.url 
        || status.video_url 
        || status.url

      if (videoUrl) {
        try {
          const videoResponse = await fetch(videoUrl)
          const arrayBuffer = await videoResponse.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          
          const fileName = `video-${taskId}.mp4`
          const filePath = path.join(process.cwd(), 'public', fileName)
          await fs.writeFile(filePath, buffer)
          
          return NextResponse.json({
            success: true,
            taskId,
            status: 'completed',
            videoUrl: `/${fileName}`
          })
        } catch {
          return NextResponse.json({
            success: true,
            taskId,
            status: 'completed',
            videoUrl: videoUrl
          })
        }
      }
      
      return NextResponse.json({
        success: true,
        taskId,
        status: 'completed',
        message: 'Video ready'
      })
    }

    if (status.task_status === 'FAIL') {
      return NextResponse.json({
        success: false,
        taskId,
        status: 'failed',
        error: 'Video generation failed'
      })
    }

    // Still processing
    return NextResponse.json({
      success: true,
      taskId,
      status: 'processing',
      message: 'Video is being generated...'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check status'
    }, { status: 500 })
  }
}

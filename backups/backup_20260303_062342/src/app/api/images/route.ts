import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

// GET - List all images for the current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    const images = await db.generatedImage.findMany({
      where: userId ? { userId } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      images,
    });

  } catch (error: unknown) {
    console.error('Database fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Save a new image (supports base64 and URLs)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { prompt, imageUrl, model = 'dall-e-3', style = 'photorealistic' } = body;

    if (!prompt || !imageUrl) {
      return NextResponse.json(
        { error: 'Prompt and imageUrl are required' },
        { status: 400 }
      );
    }

    // Handle base64 images - they can be very long but SQLite can handle them
    // For production, consider uploading to a storage service
    const image = await db.generatedImage.create({
      data: {
        prompt,
        imageUrl,
        model,
        style,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      image,
    });

  } catch (error: unknown) {
    console.error('Database save error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete an image
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const image = await db.generatedImage.findUnique({
      where: { id },
    });

    if (!image || image.userId !== userId) {
      return NextResponse.json(
        { error: 'Image not found or not authorized' },
        { status: 403 }
      );
    }

    await db.generatedImage.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });

  } catch (error: unknown) {
    console.error('Database delete error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

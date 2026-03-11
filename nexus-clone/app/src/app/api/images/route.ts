import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// GET - List all images
export async function GET() {
  try {
    const images = await db.generatedImage.findMany({
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

// POST - Save a new image
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, imageUrl, model = 'dall-e-3', style = 'photorealistic' } = body;

    if (!prompt || !imageUrl) {
      return NextResponse.json(
        { error: 'Prompt and imageUrl are required' },
        { status: 400 }
      );
    }

    const image = await db.generatedImage.create({
      data: {
        prompt,
        imageUrl,
        model,
        style,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
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

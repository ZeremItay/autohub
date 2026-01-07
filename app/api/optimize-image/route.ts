import { NextRequest, NextResponse } from 'next/server';
import { optimizeImageWithSharp } from '@/lib/utils/image-optimize';

/**
 * API Route for optimizing images using Sharp
 * 
 * POST /api/optimize-image
 * Body: FormData with 'image' file
 * 
 * Returns: Optimized image as buffer
 */
export async function POST(request: NextRequest) {
  try {

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Optimize image using Sharp (local optimization - much faster!)
    const result = await optimizeImageWithSharp(imageBuffer, {
      quality: 82,
      maxWidth: 1920,
      maxHeight: 1080,
      convertToWebP: false, // Keep original format for now
    });

    if (!result.success || !result.data?.buffer) {
      return NextResponse.json(
        { error: result.error || 'Failed to optimize image' },
        { status: 500 }
      );
    }

    // Determine content type based on optimized format
    const contentType = result.data.format === 'webp' 
      ? 'image/webp' 
      : imageFile.type || 'image/jpeg';

    // Return optimized image
    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(result.data.buffer);
    
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': result.data.size?.toString() || '',
        'X-Original-Size': imageFile.size.toString(),
        'X-Optimized-Size': result.data.size?.toString() || '',
        'X-Savings': (imageFile.size - (result.data.size || 0)).toString(),
        'X-Format': result.data.format || 'unknown',
      },
    });
  } catch (error: any) {
    console.error('Error in optimize-image API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


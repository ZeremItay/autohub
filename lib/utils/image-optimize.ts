/**
 * Image Optimization Utility using Sharp
 * 
 * This utility handles image optimization using Sharp (local optimization)
 * Sharp is much faster and doesn't require external API calls
 */

import sharp from 'sharp';

interface OptimizationOptions {
  quality?: number; // Image quality 0-100 (default: 82)
  maxWidth?: number; // Maximum width in pixels (default: 1920)
  maxHeight?: number; // Maximum height in pixels (default: 1080)
  convertToWebP?: boolean; // Convert to WebP format (default: false)
}

interface OptimizationResult {
  success: boolean;
  data?: {
    buffer: Buffer;
    size: number;
    format: string;
  };
  error?: string;
}

/**
 * Optimize an image using Sharp
 * @param imageBuffer - The image buffer to optimize
 * @param options - Optimization options
 * @returns Optimized image buffer
 */
export async function optimizeImageWithSharp(
  imageBuffer: Buffer,
  options?: OptimizationOptions
): Promise<OptimizationResult> {
  try {
    const quality = options?.quality || 82;
    const maxWidth = options?.maxWidth || 1920;
    const maxHeight = options?.maxHeight || 1080;
    const convertToWebP = options?.convertToWebP || false;

    let sharpInstance = sharp(imageBuffer);

    // Resize if needed (maintain aspect ratio)
    sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    // Optimize based on format
    if (convertToWebP) {
      const optimizedBuffer = await sharpInstance
        .webp({ quality })
        .toBuffer();
      
      return {
        success: true,
        data: {
          buffer: optimizedBuffer,
          size: optimizedBuffer.length,
          format: 'webp',
        },
      };
    } else {
      // Keep original format but optimize
      const metadata = await sharpInstance.metadata();
      const format = metadata.format || 'jpeg';

      let optimizedBuffer: Buffer;

      if (format === 'png') {
        optimizedBuffer = await sharpInstance
          .png({ quality, compressionLevel: 9 })
          .toBuffer();
      } else if (format === 'jpeg' || format === 'jpg') {
        optimizedBuffer = await sharpInstance
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      } else {
        // For other formats, just resize and convert to JPEG
        optimizedBuffer = await sharpInstance
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      }

      return {
        success: true,
        data: {
          buffer: optimizedBuffer,
          size: optimizedBuffer.length,
          format: format === 'jpeg' || format === 'jpg' ? 'jpeg' : format,
        },
      };
    }
  } catch (error: any) {
    console.error('Error optimizing image with Sharp:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}


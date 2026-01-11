/**
 * Image Upload Utility with Automatic Optimization
 * 
 * This utility handles image uploads with automatic optimization using Sharp
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Upload and optimize an image to Supabase Storage
 * @param supabase - Supabase client instance (with user session)
 * @param file - The image file to upload
 * @param bucketName - Supabase Storage bucket name
 * @param filePath - Path within the bucket (should NOT include bucket name)
 * @param options - Upload and optimization options
 * @returns Public URL of the uploaded image
 */
export async function uploadAndOptimizeImage(
  supabase: SupabaseClient,
  file: File,
  bucketName: string,
  filePath: string,
  options?: {
    optimize?: boolean; // Whether to optimize the image (default: true)
    quality?: number; // Image quality 0-100 (default: 85)
    convertToWebP?: boolean; // Convert to WebP (default: true)
    maxWidth?: number; // Maximum width (default: 1920)
    maxHeight?: number; // Maximum height (default: 1080)
    cacheControl?: string; // Cache control header (default: '3600')
    upsert?: boolean; // Whether to overwrite existing file (default: true)
  }
): Promise<{ url: string; originalSize: number; optimizedSize: number; savings: number }> {
  
  let fileToUpload = file;
  const originalSize = file.size;
  let optimizedSize = originalSize;

  // Optimize image if optimization is enabled
  // We do this via API route (server-side) for better performance
  const shouldOptimize = options?.optimize !== false;
  
  if (shouldOptimize) {
    try {
      console.log('🔧 Starting image optimization via API...');
      
      // Call our API route for optimization (server-side)
      const formData = new FormData();
      formData.append('image', file);
      
      const optimizeResponse = await fetch('/api/optimize-image', {
        method: 'POST',
        body: formData,
      });

      if (optimizeResponse.ok) {
        const optimizedBlob = await optimizeResponse.blob();
        const optimizedSizeHeader = optimizeResponse.headers.get('X-Optimized-Size');
        optimizedSize = optimizedSizeHeader ? parseInt(optimizedSizeHeader) : optimizedBlob.size;
        
        // Get the format from response headers
        const format = optimizeResponse.headers.get('X-Format') || 'webp';
        const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
        
        // Create new file with WebP type
        fileToUpload = new File([optimizedBlob], newFileName, { 
          type: format === 'webp' ? 'image/webp' : file.type 
        });
        
        const reduction = Math.round((1 - optimizedSize / originalSize) * 100);
        const savings = originalSize - optimizedSize;
        console.log(`✅ Image optimized! Original: ${(originalSize / 1024).toFixed(2)} KB, Optimized: ${(optimizedSize / 1024).toFixed(2)} KB, Saved: ${(savings / 1024).toFixed(2)} KB (${reduction}% reduction), Format: ${format}`);
      } else {
        const errorText = await optimizeResponse.text();
        console.warn('⚠️ Image optimization failed, uploading original:', errorText);
      }
    } catch (error) {
      console.error('❌ Error optimizing image, uploading original:', error);
    }
  }

  // Update filePath to use .webp extension if converted
  let finalFilePath = filePath;
  if (options?.convertToWebP !== false && fileToUpload.type === 'image/webp') {
    finalFilePath = filePath.replace(/\.[^/.]+$/, '') + '.webp';
  }
  
  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(finalFilePath, fileToUpload, {
      cacheControl: options?.cacheControl || '3600',
      upsert: options?.upsert !== false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get public URL (use finalFilePath if it was changed)
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(finalFilePath);

  return {
    url: publicUrl,
    originalSize,
    optimizedSize,
    savings: originalSize - optimizedSize,
  };
}


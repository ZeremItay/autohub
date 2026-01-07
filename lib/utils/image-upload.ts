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
    quality?: number; // Image quality 0-100 (default: 82)
    convertToWebP?: boolean; // Convert to WebP (default: false)
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
        
        fileToUpload = new File([optimizedBlob], file.name, { type: file.type });
        
        const reduction = Math.round((1 - optimizedSize / originalSize) * 100);
        const savings = originalSize - optimizedSize;
        console.log(`✅ Image optimized! Original: ${originalSize} bytes, Optimized: ${optimizedSize} bytes, Saved: ${savings} bytes (${reduction}% reduction)`);
      } else {
        const errorText = await optimizeResponse.text();
        console.warn('⚠️ Image optimization failed, uploading original:', errorText);
      }
    } catch (error) {
      console.error('❌ Error optimizing image, uploading original:', error);
    }
  }

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileToUpload, {
      cacheControl: options?.cacheControl || '3600',
      upsert: options?.upsert !== false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return {
    url: publicUrl,
    originalSize,
    optimizedSize,
    savings: originalSize - optimizedSize,
  };
}


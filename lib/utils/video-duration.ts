/**
 * Utility functions for fetching video duration from URLs
 */

export interface VideoDurationResult {
  duration_minutes: number;
  error?: string;
}

/**
 * Fetches video duration from a video URL (YouTube, Vimeo, or direct video files like S3)
 * @param videoUrl - The video URL
 * @returns Promise with duration in minutes or error
 */
export async function getVideoDuration(videoUrl: string): Promise<VideoDurationResult> {
  if (!videoUrl || typeof videoUrl !== 'string' || videoUrl.trim() === '') {
    return {
      duration_minutes: 0,
      error: 'Invalid video URL'
    };
  }
  
  // For direct video URLs (S3, CDN, etc.), use HTML5 video element
  if (isDirectVideoUrl(videoUrl)) {
    try {
      const durationMinutes = await getDirectVideoDuration(videoUrl);
      return {
        duration_minutes: durationMinutes
      };
    } catch (error: any) {
      console.error('Error fetching direct video duration:', error);
      return {
        duration_minutes: 0,
        error: error.message || 'Failed to load video metadata. Make sure the URL is accessible and has proper CORS headers.'
      };
    }
  }
  
  // For YouTube/Vimeo, use API route
  try {
    const response = await fetch('/api/video/duration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ video_url: videoUrl }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        duration_minutes: 0,
        error: data.error || 'Failed to fetch video duration'
      };
    }
    
    return {
      duration_minutes: data.duration_minutes || 0
    };
  } catch (error: any) {
    console.error('Error fetching video duration:', error);
    return {
      duration_minutes: 0,
      error: error.message || 'Failed to fetch video duration'
    };
  }
}

/**
 * Detects if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

/**
 * Detects if a URL is a Vimeo URL
 */
export function isVimeoUrl(url: string): boolean {
  return /vimeo\.com/.test(url);
}

/**
 * Detects if a URL is a supported video platform
 */
export function isSupportedVideoUrl(url: string): boolean {
  return isYouTubeUrl(url) || isVimeoUrl(url) || isDirectVideoUrl(url);
}

/**
 * Detects if a URL is a direct video file (S3, CDN, etc.)
 */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m3u8'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('s3.amazonaws.com') ||
         lowerUrl.includes('amazonaws.com/s3') ||
         lowerUrl.includes('cloudfront.net');
}

/**
 * Gets video duration from a direct video URL using HTML5 video element
 * This works for S3, CDN, or any direct video file URL
 */
export async function getDirectVideoDuration(videoUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      video.remove();
      reject(new Error('Timeout loading video metadata'));
    }, 10000); // 10 second timeout
    
    video.addEventListener('loadedmetadata', () => {
      clearTimeout(timeout);
      const duration = video.duration; // Duration in seconds
      video.remove();
      resolve(duration / 60); // Convert to minutes
    });
    
    video.addEventListener('error', (e) => {
      clearTimeout(timeout);
      video.remove();
      reject(new Error('Failed to load video: ' + (e.message || 'Unknown error')));
    });
    
    video.src = videoUrl;
  });
}

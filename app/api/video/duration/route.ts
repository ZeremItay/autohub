import { NextRequest, NextResponse } from 'next/server';

// Extract video ID from YouTube URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Extract video ID from Vimeo URL
function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/.*\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Get YouTube video duration
// Note: YouTube oEmbed API doesn't return duration, so we need to use alternative methods
// For production, consider using YouTube Data API v3 (requires API key)
async function getYouTubeDuration(videoId: string): Promise<number | null> {
  try {
    // Method 1: Try YouTube oEmbed (won't have duration, but good for validation)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    try {
      const oembedResponse = await fetch(oembedUrl);
      if (!oembedResponse.ok) {
        // Video doesn't exist or is private
        return null;
      }
    } catch (e) {
      // Continue to try other methods
    }
    
    // Method 2: Try to fetch video page (may fail due to CORS, but worth trying)
    try {
      const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(videoPageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Try to extract from ytInitialPlayerResponse (most reliable)
        const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({[\s\S]*?});/);
        if (playerResponseMatch) {
          try {
            const playerResponse = JSON.parse(playerResponseMatch[1]);
            if (playerResponse.videoDetails?.lengthSeconds) {
              return parseInt(playerResponse.videoDetails.lengthSeconds) / 60; // Convert to minutes
            }
          } catch (e) {
            // Continue to next method
          }
        }
        
        // Try to extract duration from JSON-LD structured data
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (jsonLdMatch) {
          try {
            const jsonLd = JSON.parse(jsonLdMatch[1]);
            if (jsonLd.duration) {
              // ISO 8601 duration format (PT1H2M10S)
              return parseISODuration(jsonLd.duration);
            }
          } catch (e) {
            // Continue to next method
          }
        }
        
        // Try to extract from og:video:duration meta tag
        const ogDurationMatch = html.match(/<meta property="og:video:duration" content="(\d+)">/);
        if (ogDurationMatch) {
          return parseInt(ogDurationMatch[1]) / 60; // Convert to minutes
        }
      }
    } catch (error) {
      // CORS or other fetch error - this is expected in many cases
      console.log('Could not fetch YouTube page directly (CORS or other issue):', error);
    }
    
    // If all methods fail, return null (user can enter manually)
    // Note: For production, consider using YouTube Data API v3 with API key
    return null;
  } catch (error) {
    console.error('Error fetching YouTube duration:', error);
    return null;
  }
}

// Parse ISO 8601 duration (PT1H2M10S) to minutes
function parseISODuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 60 + minutes + seconds / 60;
}

// Get Vimeo video duration using oEmbed API
async function getVimeoDuration(videoId: string): Promise<number | null> {
  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Vimeo oEmbed returns duration in seconds
    if (data.duration) {
      return data.duration / 60; // Convert to minutes
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Vimeo duration:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { video_url } = body;
    
    if (!video_url || typeof video_url !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid video_url' },
        { status: 400 }
      );
    }
    
    // Detect platform and extract video ID
    const youtubeId = extractYouTubeId(video_url);
    const vimeoId = extractVimeoId(video_url);
    
    let durationMinutes: number | null = null;
    
    if (youtubeId) {
      durationMinutes = await getYouTubeDuration(youtubeId);
    } else if (vimeoId) {
      durationMinutes = await getVimeoDuration(vimeoId);
    } else {
      return NextResponse.json(
        { error: 'Unsupported video platform. Please use YouTube or Vimeo URLs.' },
        { status: 400 }
      );
    }
    
    if (durationMinutes === null) {
      return NextResponse.json(
        { error: 'Could not fetch video duration. Please enter it manually.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      duration_minutes: Math.round(durationMinutes * 100) / 100 // Round to 2 decimal places
    });
  } catch (error: any) {
    console.error('Error in video duration API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

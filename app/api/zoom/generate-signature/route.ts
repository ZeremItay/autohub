import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Generate signature for Zoom Meeting SDK
// This must be done server-side for security (SDK Secret should never be exposed to client)
export async function POST(request: NextRequest) {
  try {
    const { meetingNumber } = await request.json();

    if (!meetingNumber) {
      return NextResponse.json(
        { error: 'Missing required field: meetingNumber' },
        { status: 400 }
      );
    }

    // Get SDK Key and Secret from environment variables (server-side only)
    const sdkKey = process.env.ZOOM_SDK_KEY || process.env.NEXT_PUBLIC_ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;
    
    if (!sdkKey) {
      console.error('ZOOM_SDK_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Zoom SDK Key not configured' },
        { status: 500 }
      );
    }
    
    if (!sdkSecret) {
      console.error('ZOOM_SDK_SECRET is not set in environment variables');
      return NextResponse.json(
        { error: 'Zoom SDK Secret not configured' },
        { status: 500 }
      );
    }

    // Generate signature for Zoom Meeting SDK
    // Signature format: base64(sdkKey.meetingNumber.timestamp.hash)
    const timestamp = new Date().getTime() - 30000; // 30 seconds ago (to account for clock skew)
    const msg = Buffer.from(`${sdkKey}${meetingNumber}${timestamp}`).toString('base64');
    const hash = crypto.createHmac('sha256', sdkSecret).update(msg).digest('base64');
    const signature = Buffer.from(`${sdkKey}.${meetingNumber}.${timestamp}.${hash}`).toString('base64');

    return NextResponse.json({ 
      signature,
      sdkKey // Return SDK Key as well (this is safe to expose)
    });
  } catch (error: any) {
    console.error('Error generating Zoom signature:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


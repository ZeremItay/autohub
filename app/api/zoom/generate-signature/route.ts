import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Generate signature for Zoom Meeting SDK
// This must be done server-side for security (SDK Secret should never be exposed to client)
export async function POST(request: NextRequest) {
  // Check if .env.local exists and try to load it manually if env vars are missing
  if (!process.env.ZOOM_CLIENT_ID && !process.env.ZOOM_SDK_KEY) {
    try {
      const envLocalPath = path.join(process.cwd(), '.env.local');
      const envLocalExists = fs.existsSync(envLocalPath);
      
      if (envLocalExists) {
        const envContent = fs.readFileSync(envLocalPath, 'utf-8');
        const envLines = envContent.split('\n');
        
        for (const line of envLines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            if (key === 'ZOOM_CLIENT_ID' || key === 'ZOOM_CLIENT_SECRET' || key === 'ZOOM_SDK_KEY' || key === 'ZOOM_SDK_SECRET') {
              process.env[key] = value;
            }
          }
        }
      }
    } catch (e: any) {
      // Silently ignore errors loading .env.local
    }
  }
  
  try {
    const { meetingNumber } = await request.json();

    if (!meetingNumber) {
      return NextResponse.json(
        { error: 'Missing required field: meetingNumber' },
        { status: 400 }
      );
    }

    // Get SDK Key/Secret or Client ID/Secret from environment variables (server-side only)
    // Support both SDK Key/Secret (legacy) and Client ID/Secret (newer)
    const sdkKey = process.env.ZOOM_SDK_KEY || process.env.ZOOM_CLIENT_ID || process.env.NEXT_PUBLIC_ZOOM_SDK_KEY || process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID;
    const sdkSecret = process.env.ZOOM_SDK_SECRET || process.env.ZOOM_CLIENT_SECRET;
    
    if (!sdkKey) {
      console.error('ZOOM_SDK_KEY or ZOOM_CLIENT_ID is not set in environment variables');
      return NextResponse.json(
        { error: 'Zoom SDK Key/Client ID not configured' },
        { status: 500 }
      );
    }
    
    if (!sdkSecret) {
      console.error('ZOOM_SDK_SECRET or ZOOM_CLIENT_SECRET is not set in environment variables');
      return NextResponse.json(
        { error: 'Zoom SDK Secret/Client Secret not configured' },
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


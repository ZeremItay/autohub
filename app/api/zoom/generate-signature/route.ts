import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Generate signature for Zoom Meeting SDK
// This must be done server-side for security (SDK Secret should never be exposed to client)
export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:6',message:'API route called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
  // #endregion
  
  // Check if .env.local exists and try to load it manually if env vars are missing
  if (!process.env.ZOOM_CLIENT_ID && !process.env.ZOOM_SDK_KEY) {
    try {
      const envLocalPath = path.join(process.cwd(), '.env.local');
      const envLocalExists = fs.existsSync(envLocalPath);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:12',message:'Env vars missing, checking .env.local',data:{envLocalExists,envLocalPath,processCwd:process.cwd()},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      
      if (envLocalExists) {
        const envContent = fs.readFileSync(envLocalPath, 'utf-8');
        const envLines = envContent.split('\n');
        // #region agent log
        const firstLines = envLines.slice(0, 5).map(l => l.substring(0, 50)).join(' | ');
        fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:18',message:'Reading .env.local content',data:{lineCount:envLines.length,hasZOOM_CLIENT_ID:envContent.includes('ZOOM_CLIENT_ID'),hasZOOM_CLIENT_SECRET:envContent.includes('ZOOM_CLIENT_SECRET'),firstLines,contentLength:envContent.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        for (const line of envLines) {
          const trimmed = line.trim();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:29',message:'Processing line',data:{trimmed:trimmed.substring(0,50),isEmpty:!trimmed,isComment:trimmed.startsWith('#')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'I'})}).catch(()=>{});
          // #endregion
          if (!trimmed || trimmed.startsWith('#')) continue;
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:35',message:'Parsed key-value',data:{key,valueLength:value.length,isZoomVar:key.includes('ZOOM')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'I'})}).catch(()=>{});
            // #endregion
            if (key === 'ZOOM_CLIENT_ID' || key === 'ZOOM_CLIENT_SECRET' || key === 'ZOOM_SDK_KEY' || key === 'ZOOM_SDK_SECRET') {
              process.env[key] = value;
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:38',message:'Loaded env var from file',data:{key,valuePrefix:value.substring(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
              // #endregion
            }
          }
        }
      }
    } catch (e: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:35',message:'Error loading .env.local',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
    }
  }
  
  try {
    const { meetingNumber } = await request.json();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:9',message:'Request parsed',data:{hasMeetingNumber:!!meetingNumber,meetingNumber:meetingNumber?.substring?.(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!meetingNumber) {
      return NextResponse.json(
        { error: 'Missing required field: meetingNumber' },
        { status: 400 }
      );
    }

    // Get SDK Key/Secret or Client ID/Secret from environment variables (server-side only)
    // Support both SDK Key/Secret (legacy) and Client ID/Secret (newer)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:19',message:'Before env var check',data:{hasZOOM_SDK_KEY:!!process.env.ZOOM_SDK_KEY,hasZOOM_CLIENT_ID:!!process.env.ZOOM_CLIENT_ID,hasZOOM_CLIENT_SECRET:!!process.env.ZOOM_CLIENT_SECRET,hasNEXT_PUBLIC_ZOOM_CLIENT_ID:!!process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID,ZOOM_CLIENT_ID_value:process.env.ZOOM_CLIENT_ID?.substring?.(0,15)||'undefined',ZOOM_CLIENT_SECRET_set:!!process.env.ZOOM_CLIENT_SECRET},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const sdkKey = process.env.ZOOM_SDK_KEY || process.env.ZOOM_CLIENT_ID || process.env.NEXT_PUBLIC_ZOOM_SDK_KEY || process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID;
    const sdkSecret = process.env.ZOOM_SDK_SECRET || process.env.ZOOM_CLIENT_SECRET;
    
    // Debug: Check what environment variables are loaded
    console.log('🔍 Debug - Environment variables check:');
    console.log('ZOOM_SDK_KEY:', process.env.ZOOM_SDK_KEY ? 'SET' : 'NOT SET');
    console.log('ZOOM_CLIENT_ID:', process.env.ZOOM_CLIENT_ID ? 'SET (' + process.env.ZOOM_CLIENT_ID.substring(0, 10) + '...)' : 'NOT SET');
    console.log('ZOOM_CLIENT_SECRET:', process.env.ZOOM_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('NEXT_PUBLIC_ZOOM_CLIENT_ID:', process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('Final sdkKey:', sdkKey ? 'SET (' + sdkKey.substring(0, 10) + '...)' : 'NOT SET');
    console.log('Final sdkSecret:', sdkSecret ? 'SET' : 'NOT SET');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:30',message:'After env var assignment',data:{hasSdkKey:!!sdkKey,sdkKeyPrefix:sdkKey?.substring?.(0,15)||'undefined',hasSdkSecret:!!sdkSecret},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (!sdkKey) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:32',message:'sdkKey is missing',data:{allEnvVars:{ZOOM_SDK_KEY:!!process.env.ZOOM_SDK_KEY,ZOOM_CLIENT_ID:!!process.env.ZOOM_CLIENT_ID,NEXT_PUBLIC_ZOOM_SDK_KEY:!!process.env.NEXT_PUBLIC_ZOOM_SDK_KEY,NEXT_PUBLIC_ZOOM_CLIENT_ID:!!process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('ZOOM_SDK_KEY or ZOOM_CLIENT_ID is not set in environment variables');
      return NextResponse.json(
        { error: 'Zoom SDK Key/Client ID not configured' },
        { status: 500 }
      );
    }
    
    if (!sdkSecret) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:39',message:'sdkSecret is missing',data:{allEnvVars:{ZOOM_SDK_SECRET:!!process.env.ZOOM_SDK_SECRET,ZOOM_CLIENT_SECRET:!!process.env.ZOOM_CLIENT_SECRET}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/zoom/generate-signature/route.ts:52',message:'Signature generated successfully',data:{signatureLength:signature?.length,sdkKeyPrefix:sdkKey?.substring?.(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

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


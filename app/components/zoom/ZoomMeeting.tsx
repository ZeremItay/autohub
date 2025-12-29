'use client';

import { useEffect, useRef, useState } from 'react';
import { ZoomMtg } from '@zoomus/websdk';

interface ZoomMeetingProps {
  meetingNumber: string; // Zoom Meeting ID
  userName: string;
  userEmail: string;
  passWord?: string; // Meeting password if required
}

export default function ZoomMeeting({
  meetingNumber,
  userName,
  userEmail,
  passWord = ''
}: ZoomMeetingProps) {
  // #region agent log
  {(() => {
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/components/zoom/ZoomMeeting.tsx:18',message:'ZoomMeeting component rendering',data:{hasMeetingNumber:!!meetingNumber,hasZoomMtg:typeof ZoomMtg!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    return null;
  })()}
  // #endregion
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/components/zoom/ZoomMeeting.tsx:24',message:'ZoomMeeting useEffect',data:{meetingNumber,hasZoomMtg:typeof ZoomMtg!=='undefined',ZoomMtgType:typeof ZoomMtg},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!meetingNumber) {
      setError('Missing Zoom Meeting ID');
      setLoading(false);
      return;
    }

    const initializeZoom = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/components/zoom/ZoomMeeting.tsx:32',message:'Before Zoom SDK init',data:{hasZoomMtg:typeof ZoomMtg!=='undefined',hasSetZoomJSLib:typeof ZoomMtg?.setZoomJSLib==='function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Configure Zoom SDK
        if (typeof ZoomMtg === 'undefined') {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/components/zoom/ZoomMeeting.tsx:35',message:'ZoomMtg is undefined',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          throw new Error('Zoom SDK not loaded');
        }
        ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareWebSDK();

        // Get signature from API (SDK Key will be handled server-side)
        const response = await fetch('/api/zoom/generate-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingNumber
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate signature');
        }

        const { signature, sdkKey } = await response.json();

        // Initialize Zoom
        ZoomMtg.init({
          leaveOnPageUnload: true,
          patchJsMedia: true,
          success: () => {
            // Join meeting
            ZoomMtg.join({
              signature: signature,
              sdkKey: sdkKey,
              meetingNumber: meetingNumber,
              passWord: passWord,
              userName: userName,
              userEmail: userEmail,
              success: () => {
                setLoading(false);
                console.log('Successfully joined Zoom meeting');
              },
              error: (err: any) => {
                console.error('Error joining meeting:', err);
                setError('שגיאה בהצטרפות לפגישה. אנא בדוק את פרטי הפגישה.');
                setLoading(false);
              }
            });
          },
          error: (err: any) => {
            console.error('Error initializing Zoom:', err);
            setError('שגיאה באתחול Zoom');
            setLoading(false);
          }
        });
      } catch (err: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/components/zoom/ZoomMeeting.tsx:83',message:'Error in initializeZoom',data:{error:String(err),errorName:err?.name,errorStack:err?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.error('Error initializing Zoom:', err);
        setError(err.message || 'שגיאה באתחול Zoom');
        setLoading(false);
      }
    };

    initializeZoom();

    // Cleanup on unmount
    return () => {
      try {
        ZoomMtg.leave();
      } catch (e) {
        console.error('Error leaving meeting:', e);
      }
    };
  }, [meetingNumber, userName, userEmail, passWord]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-semibold mb-2">שגיאה בטעינת פגישת Zoom</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
        <p className="text-gray-600">טוען פגישת Zoom...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] bg-gray-900 rounded-lg overflow-hidden">
      <div ref={zoomContainerRef} id="zoom-container" className="w-full h-full" />
    </div>
  );
}


'use client';

import { useEffect, useRef, useState } from 'react';
import { ZoomMtg } from '@zoom/meetingsdk';

interface ZoomMeetingProps {
  meetingNumber: string; // Zoom Meeting ID
  userName: string;
  userEmail: string;
  // Password is now handled server-side for security
}

export default function ZoomMeeting({
  meetingNumber,
  userName,
  userEmail
}: ZoomMeetingProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!meetingNumber) {
      setError('Missing Zoom Meeting ID');
      setLoading(false);
      return;
    }

    const initializeMeeting = async () => {
      try {
        // Update meeting settings to disable participant invites
        try {
          await fetch('/api/zoom/update-meeting-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingId: meetingNumber }),
          });
        } catch (err) {
          console.warn('Could not update meeting settings (this is OK):', err);
        }

        // Get signature from server (requires authentication and premium)
        const signatureResponse = await fetch('/api/zoom/generate-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingNumber }),
        });

        if (!signatureResponse.ok) {
          throw new Error('Failed to generate signature');
        }

        const { signature, sdkKey } = await signatureResponse.json();

        if (!signature || !sdkKey) {
          throw new Error('Invalid signature response');
        }

        // Get meeting password from server
        const joinUrlResponse = await fetch('/api/zoom/generate-join-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingNumber,
            userName: userName || 'משתמש',
            userEmail: userEmail || '',
          }),
        });

        if (!joinUrlResponse.ok) {
          throw new Error('Failed to get meeting password');
        }

        const { joinUrl } = await joinUrlResponse.json();
        // Extract password from joinUrl if exists
        const urlParams = new URLSearchParams(joinUrl.split('?')[1]);
        const passWord = urlParams.get('pwd') || '';

        // Initialize Zoom SDK
        ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');

        await ZoomMtg.preLoadWasm();
        await ZoomMtg.prepareWebSDK();

        // Initialize Zoom Meeting
        const siteUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        
        ZoomMtg.init({
          leaveOnPageUnload: true,
          patchJsMedia: true,
          leaveUrl: `${siteUrl}/live-room`,
          success: async () => {
            try {
              // Join meeting
              ZoomMtg.join({
                signature: signature,
                sdkKey: sdkKey,
                meetingNumber: meetingNumber,
                userName: userName || 'משתמש',
                userEmail: userEmail || '',
                passWord: passWord,
                success: () => {
                  console.log('Successfully joined Zoom meeting');
                  setLoading(false);
                },
                error: (err: any) => {
                  console.error('Error joining meeting:', err);
                  setError(err.reason || 'שגיאה בהצטרפות לפגישה');
                  setLoading(false);
                },
              });
            } catch (err: any) {
              console.error('Error joining meeting:', err);
              setError(err.message || 'שגיאה בהצטרפות לפגישה');
              setLoading(false);
            }
          },
          error: (err: any) => {
            console.error('Error initializing Zoom:', err);
            setError(err.reason || 'שגיאה באתחול Zoom');
            setLoading(false);
          },
        });
      } catch (err: any) {
        console.error('Error initializing meeting:', err);
        setError(err.message || 'שגיאה באתחול פגישה');
        setLoading(false);
      }
    };

    initializeMeeting();

    // Cleanup on unmount
    return () => {
      try {
        // Zoom SDK will handle cleanup automatically when page unloads
        // No need to manually call leave() as it's not available in the SDK
      } catch (err) {
        // Ignore cleanup errors
      }
    };
  }, [meetingNumber, userName, userEmail]);

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
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
          <p className="text-white">טוען פגישת Zoom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      <div ref={containerRef} id="zoom-meeting-container" className="w-full h-full" />
    </div>
  );
}

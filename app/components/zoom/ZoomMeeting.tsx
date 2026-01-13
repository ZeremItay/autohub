'use client';

import { useEffect, useRef, useState } from 'react';

interface ZoomMeetingProps {
  meetingNumber: string; // Zoom Meeting ID
  userName: string;
  userEmail: string;
}

export default function ZoomMeeting({
  meetingNumber,
  userName,
  userEmail
}: ZoomMeetingProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Ensure this only runs on client side
    if (typeof window === 'undefined') {
      return;
    }

    if (!meetingNumber) {
      setError('Missing Zoom Meeting ID');
      setLoading(false);
      return;
    }

    const initializeMeeting = async () => {
      try {
        // Get join URL from server (includes password and authentication)
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
          const errorData = await joinUrlResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to get meeting join URL');
        }

        const { joinUrl: url } = await joinUrlResponse.json();
        
        if (!url) {
          throw new Error('Invalid join URL response');
        }

        // URL is already configured correctly from server (using /wc/join/ endpoint)
        setJoinUrl(url);
        setLoading(false);
      } catch (err: any) {
        console.error('Error initializing meeting:', err);
        setError(err.message || 'שגיאה באתחול פגישה');
        setLoading(false);
      }
    };

    // Only initialize if we have all required data
    if (meetingNumber && userName) {
      initializeMeeting();
    } else {
      setError('חסרים פרטים נדרשים להצטרפות לפגישה');
      setLoading(false);
    }
  }, [meetingNumber, userName, userEmail]);

  // Handle iframe load to bypass app redirect
  useEffect(() => {
    if (!iframeRef.current || !joinUrl) return;

    const iframe = iframeRef.current;
    
    const handleLoad = () => {
      try {
        // Try to access iframe content and click "Join from browser" button if it exists
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          // Inject script to auto-click "Join from browser" button
          const script = iframeWindow.document?.createElement('script');
          if (script) {
            script.textContent = `
              (function() {
                setTimeout(function() {
                  // Try to find and click "Join from browser" button
                  const buttons = document.querySelectorAll('button, a');
                  for (let btn of buttons) {
                    const text = btn.textContent || btn.innerText || '';
                    if (text.includes('Join from browser') || text.includes('Join from Browser') || text.includes('Join from your browser')) {
                      btn.click();
                      break;
                    }
                  }
                }, 1000);
              })();
            `;
            iframeWindow.document?.body?.appendChild(script);
          }
        }
      } catch (e) {
        // Cross-origin restrictions - this is expected
        console.log('Cannot access iframe content (expected for Zoom)');
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [joinUrl]);

  if (error) {
    return (
      <div className="absolute inset-0 bg-red-50 border border-red-200 rounded-lg p-6 flex items-center justify-center z-20">
        <div className="text-center">
          <p className="text-red-800 font-semibold mb-2">שגיאה בטעינת פגישת Zoom</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !joinUrl) {
    return (
      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
          <p className="text-white">טוען פגישת Zoom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      <iframe
        ref={iframeRef}
        src={joinUrl}
        className="w-full h-full border-0"
        allow="microphone *; camera *; autoplay *; encrypted-media *; fullscreen; display-capture *; geolocation *"
        allowFullScreen
        title="Zoom Meeting"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}

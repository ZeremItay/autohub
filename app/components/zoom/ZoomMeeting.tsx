'use client';

import { useEffect, useRef, useState } from 'react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!meetingNumber) {
      setError('Missing Zoom Meeting ID');
      setLoading(false);
      return;
    }

    const initializeMeeting = async () => {
      try {
        // Update meeting settings to disable participant invites
        // This ensures participants cannot invite others to the meeting
        try {
          await fetch('/api/zoom/update-meeting-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingId: meetingNumber }),
          });
          // Silently fail if update doesn't work - meeting will still load
        } catch (err) {
          console.warn('Could not update meeting settings (this is OK):', err);
        }

        // Generate Zoom Web Client join URL
        // Using Zoom's web client which doesn't require SDK
        const params = new URLSearchParams({
          role: '0', // 0 = participant
          name: userName || 'משתמש',
          email: userEmail || '',
        });

        if (passWord) {
          params.append('pwd', passWord);
        }

        // Zoom Web Client join URL format
        const joinUrl = `https://zoom.us/wc/join/${meetingNumber}?${params.toString()}`;
        setJoinUrl(joinUrl);
        setLoading(false);
      } catch (err: any) {
        console.error('Error initializing meeting:', err);
        setError(err.message || 'שגיאה באתחול פגישה');
        setLoading(false);
      }
    };

    initializeMeeting();
  }, [meetingNumber, userName, userEmail, passWord]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-semibold mb-2">שגיאה בטעינת פגישת Zoom</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (loading || !joinUrl) {
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
      <iframe
        ref={iframeRef}
        src={joinUrl}
        className="absolute inset-0 w-full h-full border-0"
        allow="microphone *; camera *; fullscreen; autoplay; display-capture"
        title="Zoom Meeting"
      />
    </div>
  );
}

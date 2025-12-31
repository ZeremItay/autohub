'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, ArrowRight, User, CheckCircle, Video, Maximize, Minimize } from 'lucide-react';
import Link from 'next/link';
import { getNextLiveEvent } from '@/lib/queries/events';
import { getCurrentUser, isPremiumUser } from '@/lib/utils/user';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

// Lazy load ZoomMeeting (heavy component, only needed when live event is active)
const ZoomMeeting = dynamic(
  () => import('@/app/components/zoom/ZoomMeeting'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-96 bg-gray-100 rounded animate-pulse flex items-center justify-center">
      <p className="text-gray-500">טוען חדר לייב...</p>
    </div>
  }
);

const eventTypeLabels: Record<string, string> = {
  'live': 'לייב',
  'webinar': 'וובינר',
  'workshop': 'סדנה',
  'qa': 'שאלות ותשובות',
  'other': 'אירוע אחר'
};

export default function LiveRoomPage() {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(0);

  // Detect sidebar width (only when fullscreen and on desktop)
  useEffect(() => {
    if (!isFullscreen) {
      setSidebarWidth(0);
      return;
    }

    const detectSidebar = () => {
      // Only detect on desktop (lg breakpoint and above)
      if (window.innerWidth < 1024) {
        setSidebarWidth(0);
        return;
      }

      // Find the sidebar element (it's an aside with fixed positioning)
      const sidebar = document.querySelector('aside[class*="fixed"][class*="right-0"]') as HTMLElement;
      if (sidebar) {
        const width = sidebar.offsetWidth;
        setSidebarWidth(width);
      } else {
        // Sidebar not found, default to 0
        setSidebarWidth(0);
      }
    };

    // Initial detection
    detectSidebar();

    // Use ResizeObserver to detect sidebar width changes
    const sidebar = document.querySelector('aside[class*="fixed"][class*="right-0"]') as HTMLElement;
    if (sidebar) {
      const resizeObserver = new ResizeObserver(() => {
        detectSidebar();
      });
      resizeObserver.observe(sidebar);

      // Also check periodically in case ResizeObserver doesn't catch class changes
      const interval = setInterval(detectSidebar, 100);

      return () => {
        resizeObserver.disconnect();
        clearInterval(interval);
      };
    }

    // Fallback: check periodically if sidebar not found initially
    const interval = setInterval(detectSidebar, 200);
    return () => clearInterval(interval);
  }, [isFullscreen]);

  useEffect(() => {
    // Load event only once on mount - no polling when event is active
    loadNextLiveEvent();
    checkPremiumAccess();
    
    // No polling interval - once event is loaded, don't refresh to avoid disrupting meeting
  }, []);

  async function loadNextLiveEvent(silent = false) {
    // Only set loading if this is the initial load (not a silent refresh)
    if (!silent) {
      setLoading(true);
    }
    try {
      const { data, error } = await getNextLiveEvent();
      if (error) {
        console.error('Error loading next live event:', error);
        // Only clear event if this is initial load
        if (!silent) {
          setEvent(null);
        }
      } else {
        // Only update event if it's different (to avoid unnecessary re-renders that reload iframe)
        setEvent((prevEvent: any) => {
          // If we already have an event and it's the same, don't update (prevents iframe reload)
          if (prevEvent && data && prevEvent.id === data.id) {
            return prevEvent;
          }
          return data;
        });
      }
    } catch (err) {
      console.error('Error loading next live event:', err);
      // Only clear event if this is initial load
      if (!silent) {
        setEvent(null);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function checkPremiumAccess() {
    setCheckingAccess(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsPremium(false);
        setCheckingAccess(false);
        return;
      }

      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setIsPremium(isPremiumUser(user));
      } else {
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setIsPremium(false);
    } finally {
      setCheckingAccess(false);
    }
  }

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayName = days[date.getDay()];
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatTime(timeString: string): string {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  }

  function formatFullDateTime(dateString: string, timeString: string): string {
    const date = formatDate(dateString);
    const time = formatTime(timeString);
    const dateObj = new Date(dateString);
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayName = days[dateObj.getDay()];
    return `יום ${dayName}, ${date} • ${time}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F52F8E] mx-auto mb-4"></div>
          <p className="text-gray-600">מחפש לייב קרוב...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 sm:p-12">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
                אין לייב קרוב כרגע
              </h1>
              <p className="text-gray-600 mb-6 text-lg">
                החדר לייב יפתח אוטומטית שעה לפני תחילת הלייב הקרוב ביותר.
              </p>
              <div className="space-y-3">
                <Link
                  href="/live-log"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors font-semibold"
                >
                  <Calendar className="w-5 h-5" />
                  <span>צפה ביומן הלייבים</span>
                </Link>
                <div className="text-sm text-gray-500">
                  או חזור ל
                  <Link href="/" className="text-[#F52F8E] hover:underline mr-1">
                    עמוד הבית
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen bg-gray-900 flex flex-col ${isFullscreen ? 'overflow-visible' : 'overflow-hidden'}`}>
      {/* Minimal Header */}
      <div className="bg-gradient-to-b from-pink-600 to-pink-400 relative overflow-hidden flex-shrink-0 z-50">
        <div className="relative px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Back Button and Title */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <Link 
                href="/live-log" 
                className="hover:text-white transition-colors flex items-center gap-1 sm:gap-2 text-white/90 hover:text-white flex-shrink-0"
              >
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base hidden sm:inline">חזרה ליומן</span>
              </Link>
              <span className="mx-1 sm:mx-2 hidden sm:inline text-white/60">•</span>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 rounded-full text-xs sm:text-sm text-white flex-shrink-0">
                {eventTypeLabels[event.event_type] || 'לייב'}
              </span>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white truncate">
                {event.title}
              </h1>
            </div>
            {/* Fullscreen Toggle Button */}
            {event.zoom_meeting_id && !checkingAccess && isPremium && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsFullscreen(!isFullscreen);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white flex-shrink-0 z-50 relative"
                title={isFullscreen ? 'הקטן למסך' : 'הגדל למסך מלא'}
                type="button"
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline text-sm">הקטן</span>
                  </>
                ) : (
                  <>
                    <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline text-sm">מסך מלא</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Zoom Meeting Container */}
      <div className={`flex-1 relative min-h-0 w-full bg-gray-900 ${isFullscreen ? 'overflow-visible' : 'overflow-hidden'}`}>
        {event.zoom_meeting_id && !checkingAccess && (
          <>
            {isPremium ? (
              <div 
                className={`bg-gray-900 overflow-hidden shadow-2xl transition-all duration-300 ease-in-out ${
                  isFullscreen 
                    ? 'absolute top-0 left-0 h-full rounded-none z-30' 
                    : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vh] rounded-lg'
                }`}
                style={isFullscreen ? { 
                  left: '0',
                  right: `${sidebarWidth}px`
                } : undefined}
              >
                <ZoomMeeting
                  meetingNumber={event.zoom_meeting_id}
                  userName={currentUser?.display_name || currentUser?.first_name || 'משתמש'}
                  userEmail={currentUser?.email || ''}
                  passWord={event.zoom_meeting_password || ''}
                />
              </div>
            ) : (
              <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-md text-center">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    🔒 גישה מוגבלת למנויי פרימיום
                  </h3>
                  <p className="text-yellow-700 mb-4">
                    כדי לצפות בפגישת הלייב, עליך להיות מנוי פרימיום.
                  </p>
                  <Link
                    href="/subscription"
                    className="inline-block bg-[#F52F8E] text-white px-6 py-2 rounded-lg hover:bg-[#E01E7A] transition-colors"
                  >
                    שדרג למנוי פרימיום
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


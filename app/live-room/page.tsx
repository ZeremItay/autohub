'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, ArrowRight, User, CheckCircle, Video } from 'lucide-react';
import Link from 'next/link';
import { getNextLiveEvent } from '@/lib/queries/events';
import { getCurrentUser, isPremiumUser } from '@/lib/utils/user';
import ZoomMeeting from '@/app/components/zoom/ZoomMeeting';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/live-room/page.tsx:28',message:'LiveRoomPage useEffect',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    loadNextLiveEvent();
    checkPremiumAccess();
    
    // Refresh every 30 seconds to check for new live events
    const interval = setInterval(() => {
      loadNextLiveEvent();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadNextLiveEvent() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/live-room/page.tsx:loadNextLiveEvent',message:'loadNextLiveEvent called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    setLoading(true);
    try {
      const { data, error } = await getNextLiveEvent();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/live-room/page.tsx:loadNextLiveEvent',message:'After getNextLiveEvent',data:{hasData:!!data,hasError:!!error,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (error) {
        console.error('Error loading next live event:', error);
        setEvent(null);
      } else {
        setEvent(data);
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/live-room/page.tsx:loadNextLiveEvent',message:'Error in loadNextLiveEvent',data:{error:String(err),errorName:err?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Error loading next live event:', err);
      setEvent(null);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-pink-600 to-pink-400 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        <div className="relative px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 lg:py-12">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="mb-4 sm:mb-6 flex items-center gap-2 text-white/90 flex-wrap">
              <Link href="/live-log" className="hover:text-white transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>חזרה ליומן</span>
              </Link>
              <span className="mx-1 sm:mx-2 hidden sm:inline">•</span>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 rounded-full text-xs sm:text-sm">
                {eventTypeLabels[event.event_type] || 'לייב'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
              {event.title}
            </h1>

            {/* Date and Time */}
            <p className="text-base sm:text-lg lg:text-xl text-white/90">
              {formatFullDateTime(event.event_date, event.event_time)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Event Details Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:sticky lg:top-4">
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#F52F8E]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-500">תאריך</p>
                      <p className="font-semibold text-gray-800 text-sm sm:text-base">{formatDate(event.event_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#F52F8E]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-500">שעה</p>
                      <p className="font-semibold text-gray-800 text-sm sm:text-base">{formatTime(event.event_time)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#F52F8E]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-500">מיקום</p>
                      <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{event.location || 'Zoom Meeting'}</p>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/live/${event.id}`}
                  className="w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold transition-colors text-sm sm:text-base bg-gray-100 text-gray-700 hover:bg-gray-200 text-center block"
                >
                  צפה בפרטי האירוע המלאים
                </Link>
              </div>
            </div>

            {/* Right Column - Zoom Meeting */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Zoom Meeting - Premium Only */}
              {event.zoom_meeting_id && !checkingAccess && (
                <>
                  {isPremium ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">פגישת Zoom לייב</h2>
                      <ZoomMeeting
                        meetingNumber={event.zoom_meeting_id}
                        userName={currentUser?.display_name || currentUser?.first_name || 'משתמש'}
                        userEmail={currentUser?.email || ''}
                        passWord={event.zoom_meeting_password || ''}
                      />
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
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
                  )}
                </>
              )}

              {/* About the Event */}
              {event.about_text && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">על האירוע</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{event.about_text}</p>
                </div>
              )}

              {/* What will be learned? */}
              {event.learning_points && event.learning_points.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">מה נלמד?</h2>
                  <ul className="space-y-2 sm:space-y-3">
                    {event.learning_points.map((point: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 sm:gap-3">
                        <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#F52F8E] text-white flex items-center justify-center font-bold text-xs sm:text-sm">
                          {index + 1}
                        </div>
                        <p className="text-sm sm:text-base text-gray-700 pt-0.5 sm:pt-1">{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructors */}
              {event.instructor_name && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">מנחים</h2>
                  <div className="flex items-center gap-3 sm:gap-4">
                    {event.instructor_avatar_url ? (
                      <img
                        src={event.instructor_avatar_url}
                        alt={event.instructor_name}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0">
                        {event.instructor_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-base sm:text-lg">{event.instructor_name}</p>
                      {event.instructor_title && (
                        <p className="text-sm sm:text-base text-gray-600">{event.instructor_title}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Description (fallback) */}
              {!event.about_text && event.description && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">תיאור</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{event.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


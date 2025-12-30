'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, ArrowRight, User, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getEventById } from '@/lib/queries/events';
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

export default function LiveEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadEvent();
      checkPremiumAccess();
    }
  }, [eventId]);

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

  async function loadEvent() {
    setLoading(true);
    try {
      const { data, error } = await getEventById(eventId);
      if (error) {
        console.error('Error loading event:', error);
      } else {
        setEvent(data);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
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
    // Time format is usually HH:MM:SS or HH:MM
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

  async function handleRegister() {
    // TODO: Implement registration logic
    setRegistered(true);
    alert('נרשמת בהצלחה לאירוע!');
  }

  // Check if the event has already started
  function isEventStarted(event: any): boolean {
    if (!event?.event_date || !event?.event_time) return false;
    
    try {
      const dateStr = (event.event_date as any) instanceof Date 
        ? (event.event_date as unknown as Date).toISOString().split('T')[0]
        : event.event_date as string;
      const [hours, minutes] = event.event_time.split(':');
      const eventDateTime = new Date(`${dateStr}T${hours || '00'}:${minutes || '00'}:00`);
      const now = new Date();
      
      return eventDateTime <= now;
    } catch (e) {
      console.error('Error checking if event started:', e);
      return false;
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center py-12">טוען...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">אירוע לא נמצא</h1>
          <Link href="/live" className="text-[#F52F8E] hover:underline">
            חזור ליומן
          </Link>
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
                {eventTypeLabels[event.event_type] || 'אירוע'}
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
                      <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{event.location || 'Google Meet'}</p>
                    </div>
                  </div>
                </div>

                {/* Register/Join/Recording Button */}
                {event.status === 'completed' && event.recording_id ? (
                  <Link
                    href={`/recordings/${event.recording_id}`}
                    className="w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold transition-colors text-sm sm:text-base bg-green-600 text-white hover:bg-green-700 text-center block"
                  >
                    הלייב הסתיים, כאן אפשר לצפות בהקלטה
                  </Link>
                ) : (event.status === 'active' || (isEventStarted(event) && event.zoom_meeting_id)) ? (
                  <Link
                    href="/live-room"
                    className="w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold transition-colors text-sm sm:text-base bg-[#F52F8E] text-white hover:bg-[#E01E7A] text-center block"
                  >
                    הלייב התחיל, כאן מצטרפים
                  </Link>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={registered}
                    className={`w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                      registered
                        ? 'bg-green-500 text-white cursor-not-allowed'
                        : 'bg-[#F52F8E] text-white hover:bg-[#E01E7A]'
                    }`}
                  >
                    {registered ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        נרשמת לאירוע
                      </span>
                    ) : (
                      'הרשמה לאירוע'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Right Column - Event Information */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Zoom Meeting - Premium Only - Only show when event is active or has started */}
              {event.zoom_meeting_id && !checkingAccess && (event.status === 'active' || isEventStarted(event)) && (
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


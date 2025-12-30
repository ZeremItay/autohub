'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Calendar, Clock, MapPin, User, Check } from 'lucide-react';
import Link from 'next/link';
import { getEventById, type Event } from '@/lib/queries/events';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  async function loadEvent() {
    setLoading(true);
    try {
      const { data, error } = await getEventById(eventId);
      if (!error && data) {
        setEvent(data);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const day = dayNames[date.getDay()];
    const dayNum = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}, ${dayNum} ב${month} ${year}`;
  }

  function formatDateShort(dateStr: string) {
    const date = new Date(dateStr);
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatTime(time: string) {
    return time.substring(0, 5); // HH:MM
  }

  function getEventTypeLabel(type: string) {
    const labels: Record<string, string> = {
      'live': 'לייב',
      'webinar': 'וובינר',
      'workshop': 'סדנה',
      'qa': 'Q&A',
      'other': 'אירוע'
    };
    return labels[type] || 'אירוע';
  }

  // Check if the event has already started
  function isEventStarted(event: Event): boolean {
    if (!event.event_date || !event.event_time) return false;
    
    try {
      // Combine date and time strings
      const dateStr = event.event_date instanceof Date 
        ? event.event_date.toISOString().split('T')[0]
        : event.event_date;
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
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto text-center py-12">טוען...</div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto text-center py-12">
            <p className="text-gray-500 text-lg">אירוע לא נמצא</p>
            <Link href="/live-log" className="text-[#F52F8E] hover:underline mt-4 inline-block">
              חזרה ליומן
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner - Pink Gradient */}
      <div className="bg-gradient-to-b from-pink-400 via-pink-500 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
              <Link
                href="/live-log"
                className="text-white/90 hover:text-white text-sm flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>חזרה ליומן</span>
              </Link>
              <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">
                {getEventTypeLabel(event.event_type)}
              </span>
            </div>

            {/* Event Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {event.title}
            </h1>

            {/* Date and Time */}
            <div className="text-white/90 text-lg">
              {formatDate(event.event_date)} • {formatTime(event.event_time)}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-6 flex-col lg:flex-row">
            {/* Left Column - Event Logistics */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
                {/* Date */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">תאריך</h3>
                  <div className="flex items-center gap-2 text-gray-800">
                    <Calendar className="w-5 h-5 text-[#F52F8E]" />
                    <span>{formatDateShort(event.event_date)}</span>
                  </div>
                </div>

                {/* Time */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">שעה</h3>
                  <div className="flex items-center gap-2 text-gray-800">
                    <Clock className="w-5 h-5 text-[#F52F8E]" />
                    <span>{formatTime(event.event_time)}</span>
                  </div>
                </div>

                {/* Location */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">מיקום</h3>
                  <div className="flex items-center gap-2 text-gray-800">
                    <MapPin className="w-5 h-5 text-[#F52F8E]" />
                    <span>{event.location || 'Google Meet'}</span>
                  </div>
                </div>

                {/* Register/Join/Recording Button */}
                {event.status === 'completed' && event.recording_id ? (
                  <Link
                    href={`/recordings/${event.recording_id}`}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-center block"
                  >
                    הלייב הסתיים, כאן אפשר לצפות בהקלטה
                  </Link>
                ) : (event.status === 'active' || (isEventStarted(event) && event.zoom_meeting_id)) ? (
                  <Link
                    href="/live-room"
                    className="w-full px-6 py-3 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors font-semibold text-center block"
                  >
                    הלייב התחיל, כאן מצטרפים
                  </Link>
                ) : (
                  <button className="w-full px-6 py-3 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors font-semibold">
                    הרשמה לאירוע
                  </button>
                )}
              </div>
            </div>

            {/* Right Column - Event Details */}
            <div className="flex-1 space-y-6">
              {/* About the Event */}
              {event.about_text && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">על האירוע</h2>
                  <p className="text-gray-700 leading-relaxed">{event.about_text}</p>
                </div>
              )}

              {/* What will be learned */}
              {event.learning_points && event.learning_points.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">מה נלמד?</h2>
                  <ul className="space-y-3">
                    {event.learning_points.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#F52F8E] text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-semibold">
                          {index + 1}
                        </div>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructor */}
              {event.instructor_name && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">מנחים</h2>
                  <div className="flex items-center gap-4">
                    {event.instructor_avatar_url ? (
                      <img
                        src={event.instructor_avatar_url}
                        alt={event.instructor_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white font-semibold text-xl">
                        {event.instructor_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">{event.instructor_name}</h3>
                      {event.instructor_title && (
                        <p className="text-gray-600">{event.instructor_title}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


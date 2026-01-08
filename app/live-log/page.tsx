'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Plus, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { getUpcomingEvents, getEventsByMonth, type Event } from '@/lib/queries/events';

export default function LiveLogPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    loadEvents();
    loadUpcomingEvents();
  }, [currentYear, currentMonth]);

  async function loadEvents() {
    setLoading(true);
    try {
      const { data, error } = await getEventsByMonth(currentYear, currentMonth + 1);
      if (!error && data) {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUpcomingEvents() {
    try {
      const { data, error } = await getUpcomingEvents(3);
      if (!error && data) {
        setUpcomingEvents(data || []);
      }
    } catch (error) {
      console.error('Error loading upcoming events:', error);
    }
  }

  function goToPreviousMonth() {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  }

  function goToNextMonth() {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  function getEventsForDate(date: Date): Event[] {
    // Convert date to YYYY-MM-DD format using local timezone (not UTC)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return events.filter(event => event.event_date === dateStr);
  }

  function formatTime(time: string) {
    return time.substring(0, 5); // HH:MM
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const monthShort = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
    return {
      day: date.getDate(),
      month: monthNames[date.getMonth()],
      monthShort: monthShort[date.getMonth()],
      year: date.getFullYear()
    };
  }

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const dayNames = ['יום א\'', 'יום ב\'', 'יום ג\'', 'יום ד\'', 'יום ה\'', 'יום ו\'', 'שבת'];
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  // Create calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    calendarDays.push(date);
  }

  // Get all events for list view
  const allEvents = [...events].sort((a, b) => {
    const dateA = new Date(`${a.event_date}T${a.event_time}`).getTime();
    const dateB = new Date(`${b.event_date}T${b.event_time}`).getTime();
    return dateA - dateB;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Title and View Toggle */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">יומן לייבים</h1>
            {/* View Toggle - Mobile Only */}
            <div className="lg:hidden flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#F52F8E] text-white'
                    : 'text-gray-600 hover:text-[#F52F8E]'
                }`}
              >
                רשימה
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-[#F52F8E] text-white'
                    : 'text-gray-600 hover:text-[#F52F8E]'
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-4 sm:gap-6 flex-col lg:flex-row">
            {/* Mobile List View */}
            {viewMode === 'list' && (
              <div className="lg:hidden space-y-4">
                {allEvents.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                    <p className="text-gray-500">אין אירועים החודש</p>
                  </div>
                ) : (
                  allEvents.map((event) => {
                    const dateInfo = formatDate(event.event_date);
                    return (
                      <Link
                        key={event.id}
                        href={`/live/${event.id}`}
                        className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-[#F52F8E] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white font-bold">
                            {new Date(event.event_date).getDate()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 mb-1 text-base">{event.title}</h3>
                            {event.description && (() => {
                              const hasHTML = /<[a-z][\s\S]*>/i.test(event.description);
                              if (hasHTML) {
                                // Strip HTML tags for preview
                                const textContent = event.description.replace(/<[^>]*>/g, '').trim();
                                return (
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{textContent}</p>
                                );
                              }
                              return (
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                              );
                            })()}
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-sm text-gray-500">{formatTime(event.event_time)}</span>
                              <span className="px-2 py-1 bg-[#F52F8E] text-white text-xs font-semibold rounded-full">
                                {dateInfo.monthShort} {dateInfo.day}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}

            {/* Calendar Section */}
            <div className={`flex-1 min-w-0 ${viewMode === 'list' ? 'hidden lg:block' : ''}`}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <button
                      onClick={goToPreviousMonth}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800">
                      {monthNames[currentMonth]} {currentYear}
                    </h2>
                    <button
                      onClick={goToNextMonth}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  <button
                    onClick={goToToday}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors text-sm sm:text-base"
                  >
                    היום
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
                  {dayNames.map((day, index) => (
                    <div key={index} className="text-center text-xs sm:text-sm font-semibold text-gray-600 py-1 sm:py-2">
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.replace('יום ', '')}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return <div key={index} className="aspect-square"></div>;
                    }

                    const dateEvents = getEventsForDate(date);
                    const isToday = isCurrentMonth && 
                      date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear();

                    return (
                      <div
                        key={index}
                        className={`aspect-square border border-gray-200 rounded-lg p-0.5 sm:p-1 ${
                          isToday ? 'bg-yellow-50 border-yellow-300' : 'bg-white'
                        }`}
                      >
                        <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${isToday ? 'text-[#F52F8E]' : 'text-gray-700'}`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-0.5 sm:space-y-1 min-h-0 flex flex-col">
                          {dateEvents.slice(0, 1).map((event) => (
                            <Link
                              key={event.id}
                              href={`/live/${event.id}`}
                              className="block bg-[#F52F8E] text-white text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded hover:bg-[#E01E7A] transition-colors break-words leading-tight flex-1 min-h-0 overflow-hidden"
                              title={`${event.title} - ${formatTime(event.event_time)}`}
                            >
                              <span className="block">
                                {event.title} - {formatTime(event.event_time)}
                              </span>
                            </Link>
                          ))}
                          {dateEvents.length > 1 && (
                            <div className="text-[10px] sm:text-xs text-gray-500">
                              +{dateEvents.length - 1}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Events Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mt-4 sm:mt-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">אירועים עתידיים</h2>
                
                {upcomingEvents.length === 0 ? (
                  <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">אין אירועים קרובים</p>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {upcomingEvents.map((event) => {
                      const dateInfo = formatDate(event.event_date);
                      return (
                        <Link
                          key={event.id}
                          href={`/live/${event.id}`}
                          className="flex items-start gap-2 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-[#F52F8E] transition-colors"
                        >
                          <button className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors flex-shrink-0">
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{event.title}</h3>
                            {event.description && (() => {
                              const hasHTML = /<[a-z][\s\S]*>/i.test(event.description);
                              if (hasHTML) {
                                // Strip HTML tags for preview
                                const textContent = event.description.replace(/<[^>]*>/g, '').trim();
                                return (
                                  <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{textContent}</p>
                                );
                              }
                              return (
                                <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                              );
                            })()}
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                              <span className="text-xs sm:text-sm text-gray-500">{formatTime(event.event_time)}</span>
                              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-[#F52F8E] text-white text-xs font-semibold rounded-full">
                                {dateInfo.monthShort} {dateInfo.day}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


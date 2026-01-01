'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Plus, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { getUpcomingEvents, getEventsByMonth, type Event } from '@/lib/queries/events';
import { formatTime, formatDateObject } from '@/lib/utils/date';
import { logError } from '@/lib/utils/errorHandler';
import { useTheme } from '@/lib/contexts/ThemeContext';
import {
  getCardStyles,
  getTextStyles,
  getButtonStyles,
  getBorderStyles,
  combineStyles
} from '@/lib/utils/themeStyles';

export default function LiveLogPage() {
  const { theme } = useTheme();
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
      logError(error, 'loadEvents');
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
      logError(error, 'loadUpcomingEvents');
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
    <div className="min-h-screen">
      <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Title and View Toggle */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
            <h1 className={`text-2xl sm:text-3xl font-bold ${
              theme === 'light' ? 'text-gray-800' : 'text-white'
            }`}>יומן לייבים</h1>
            {/* View Toggle - Mobile Only */}
            <div className={`lg:hidden flex items-center gap-2 rounded-lg p-1 ${
              theme === 'light' 
                ? 'bg-white border border-gray-300' 
                : 'glass-card border border-white/20'
            }`}>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? theme === 'light'
                      ? 'bg-[#F52F8E] text-white'
                      : 'bg-hot-pink text-white'
                    : theme === 'light'
                      ? 'text-gray-600 hover:text-gray-800'
                      : 'text-gray-300 hover:text-white'
                }`}
              >
                רשימה
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? theme === 'light'
                      ? 'bg-[#F52F8E] text-white'
                      : 'bg-hot-pink text-white'
                    : theme === 'light'
                      ? 'text-gray-600 hover:text-gray-800'
                      : 'text-gray-300 hover:text-white'
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
                  <div className={`rounded-xl p-6 text-center ${
                    theme === 'light' 
                      ? 'bg-white border border-gray-300' 
                      : 'glass-card'
                  }`}>
                    <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>אין אירועים החודש</p>
                  </div>
                ) : (
                  allEvents.map((event) => {
                    const dateInfo = formatDateObject(event.event_date);
                    return (
                      <Link
                        key={event.id}
                        href={`/live/${event.id}`}
                        className={`block rounded-xl p-4 transition-colors ${
                          theme === 'light'
                            ? 'bg-white border border-gray-300 hover:border-[#F52F8E]'
                            : 'glass-card hover:border-hot-pink/60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${
                            theme === 'light'
                              ? 'bg-[#F52F8E]'
                              : 'bg-gradient-to-br from-hot-pink to-rose-500'
                          }`}>
                            {new Date(event.event_date).getDate()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold mb-1 text-base ${
                              theme === 'light' ? 'text-gray-800' : 'text-white'
                            }`}>{event.title}</h3>
                            {event.description && (
                              <p className={`text-sm mb-2 line-clamp-2 ${
                                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                              }`}>{event.description}</p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`text-sm ${
                                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                              }`}>{formatTime(event.event_time)}</span>
                              <span className={`px-2 py-1 text-white text-xs font-semibold rounded-full ${
                                theme === 'light'
                                  ? 'bg-[#F52F8E]'
                                  : 'bg-hot-pink'
                              }`}>
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
              <div className={`rounded-xl p-3 sm:p-4 lg:p-6 ${
                theme === 'light' 
                  ? 'bg-white border border-gray-300' 
                  : 'glass-card'
              }`}>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <button
                      onClick={goToPreviousMonth}
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                        theme === 'light'
                          ? 'text-gray-600 hover:bg-gray-100'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <h2 className={`text-base sm:text-lg lg:text-xl font-semibold ${
                      theme === 'light' ? 'text-gray-800' : 'text-white'
                    }`}>
                      {monthNames[currentMonth]} {currentYear}
                    </h2>
                    <button
                      onClick={goToNextMonth}
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                        theme === 'light'
                          ? 'text-gray-600 hover:bg-gray-100'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  <button
                    onClick={goToToday}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 text-white rounded-lg transition-colors text-sm sm:text-base ${
                      theme === 'light'
                        ? 'bg-[#F52F8E] hover:bg-[#E01E7A]'
                        : 'bg-hot-pink rounded-full hover:bg-rose-500'
                    }`}
                  >
                    היום
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
                  {dayNames.map((day, index) => (
                    <div key={index} className={`text-center text-xs sm:text-sm font-semibold py-1 sm:py-2 ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}>
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.replace('יום ', '')}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return (
                        <div 
                          key={index} 
                          className={`aspect-square ${
                            theme === 'light' 
                              ? 'border border-gray-200 bg-gray-50' 
                              : ''
                          }`}
                        ></div>
                      );
                    }

                    const dateEvents = getEventsForDate(date);
                    const isToday = isCurrentMonth && 
                      date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear();

                    return (
                      <div
                        key={index}
                        className={`aspect-square rounded-lg p-0.5 sm:p-1 ${
                          theme === 'light'
                            ? isToday
                              ? 'bg-pink-50 border-2 border-[#F52F8E]'
                              : 'bg-white border border-gray-300'
                            : isToday
                              ? 'bg-hot-pink/20 border border-hot-pink/50'
                              : 'bg-white/5 border border-white/20'
                        }`}
                      >
                        <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                          theme === 'light'
                            ? isToday
                              ? 'text-[#F52F8E]'
                              : 'text-gray-800'
                            : isToday
                              ? 'text-white'
                              : 'text-gray-100'
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-0.5 sm:space-y-1">
                          {dateEvents.slice(0, 1).map((event) => (
                            <Link
                              key={event.id}
                              href={`/live/${event.id}`}
                              className={`block text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded shadow-md hover:shadow-lg transition-all whitespace-normal break-words ${
                                theme === 'light'
                                  ? 'bg-[#F52F8E] border border-[#F52F8E] hover:bg-[#E01E7A]'
                                  : 'bg-hot-pink border border-hot-pink/50 hover:bg-rose-500'
                              }`}
                              title={`${event.title} - ${formatTime(event.event_time)}`}
                            >
                              <span className="block font-semibold">
                                {event.title} - {formatTime(event.event_time)}
                              </span>
                            </Link>
                          ))}
                          {dateEvents.length > 1 && (
                            <div className={`text-[10px] sm:text-xs ${
                              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                            }`}>
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
              <div className={`rounded-xl p-4 sm:p-6 mt-4 sm:mt-6 ${
                theme === 'light' 
                  ? 'bg-white border border-gray-300' 
                  : 'glass-card'
              }`}>
                <h2 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 ${
                  theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>אירועים עתידיים</h2>
                
                {upcomingEvents.length === 0 ? (
                  <p className={`text-center py-6 sm:py-8 text-sm sm:text-base ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                  }`}>אין אירועים קרובים</p>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {upcomingEvents.map((event) => {
                      const dateInfo = formatDateObject(event.event_date);
                      return (
                        <Link
                          key={event.id}
                          href={`/live/${event.id}`}
                          className={`flex items-start gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg transition-colors ${
                            theme === 'light'
                              ? 'border border-gray-300 hover:border-[#F52F8E] bg-white'
                              : 'border border-white/20 hover:border-hot-pink/60 bg-white/5'
                          }`}
                        >
                          <button className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded transition-colors flex-shrink-0 ${
                            theme === 'light'
                              ? 'border border-gray-300 hover:bg-gray-50'
                              : 'border border-white/20 hover:bg-white/10'
                          }`}>
                            <Plus className={`w-3 h-3 sm:w-4 sm:h-4 ${
                              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                            }`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold mb-1 text-sm sm:text-base ${
                              theme === 'light' ? 'text-gray-800' : 'text-white'
                            }`}>{event.title}</h3>
                            {event.description && (
                              <p className={`text-xs sm:text-sm mb-2 line-clamp-2 ${
                                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                              }`}>{event.description}</p>
                            )}
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                              <span className={`text-xs sm:text-sm ${
                                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                              }`}>{formatTime(event.event_time)}</span>
                              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-white text-xs font-semibold rounded-full ${
                                theme === 'light'
                                  ? 'bg-[#F52F8E]'
                                  : 'bg-hot-pink'
                              }`}>
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


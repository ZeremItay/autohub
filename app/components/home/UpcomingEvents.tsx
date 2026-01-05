'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { type Event } from '@/lib/queries/events';

interface UpcomingEventsProps {
  events: Event[];
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">אירועים עתידיים</h2>
        <Link href="/live-log" className="text-sm text-[#F52F8E] hover:underline">הכל ←</Link>
      </div>
      {events.length === 0 ? (
        <div className="p-4 bg-[#F3F4F6] rounded-lg border border-pink-200">
          <p className="text-sm text-gray-500">כרגע אין אירועים קרובים</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.slice(0, 5).map((event) => (
            <Link
              key={event.id}
              href={`/live/${event.id}`}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <Calendar className="w-5 h-5 text-[#F52F8E] flex-shrink-0 mt-0.5 group-hover:text-[#E01E7A] transition-colors" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 group-hover:text-[#F52F8E] transition-colors">{event.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(event.event_date).toLocaleDateString('he-IL')} • {event.event_time}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}




'use client';

import { 
  MessageSquare,
  Briefcase,
  Video,
  Calendar,
  FileText,
  GraduationCap,
  Megaphone,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

export interface RecentUpdate {
  type: 'forum' | 'project' | 'recording' | 'event' | 'blog' | 'course' | 'post';
  text: string;
  time: string;
  icon: string;
  link?: string;
  id?: string;
  created_at?: string;
}

interface RecentUpdatesProps {
  updates: RecentUpdate[];
  showAllUpdatesLink?: boolean;
  className?: string;
  userIsPremium?: boolean;
}

export default function RecentUpdates({ updates, showAllUpdatesLink = true, className = '', userIsPremium = true }: RecentUpdatesProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">עדכונים אחרונים</h2>
        {showAllUpdatesLink && updates.length > 0 && (
          <Link
            href="/recent-updates"
            className="text-sm text-[#F52F8E] hover:text-[#E01E7A] hover:underline flex items-center gap-1 transition-colors"
          >
            כל העדכונים
            <ChevronLeft className="w-4 h-4" />
          </Link>
        )}
      </div>
      {updates.length === 0 ? (
        <div className="p-4 bg-[#F3F4F6] rounded-lg border border-pink-200">
          <p className="text-sm text-gray-500">מצטערים, לא נמצאה פעילות.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update, index) => {
            const content = (
              <div className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                {update.type === 'forum' && <MessageSquare className="w-5 h-5 text-[#F52F8E] flex-shrink-0 mt-0.5" />}
                {update.type === 'project' && <Briefcase className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />}
                {update.type === 'recording' && <Video className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                {update.type === 'event' && <Calendar className="w-5 h-5 text-[#F52F8E] flex-shrink-0 mt-0.5" />}
                {update.type === 'blog' && <FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                {update.type === 'course' && <GraduationCap className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />}
                {update.type === 'post' && <Megaphone className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{update.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{update.time}</p>
                </div>
              </div>
            );

            if (update.link) {
              // Check if it's a recording link and user is not premium
              if (update.type === 'recording' && !userIsPremium) {
                return (
                  <div 
                    key={update.id || index}
                    onClick={() => {
                      alert('גישה להקלטות זמינה למנויי פרימיום בלבד. אנא שדרג את המנוי שלך כדי לצפות בהקלטות.');
                    }}
                  >
                    {content}
                  </div>
                );
              }
              
              return (
                <Link key={update.id || index} href={update.link}>
                  {content}
                </Link>
              );
            }

            return <div key={update.id || index}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}


'use client';

import { getInitials } from '@/lib/utils/display';
import type { ProfileWithRole } from '@/lib/queries/profiles';

interface OnlineUsersProps {
  users: ProfileWithRole[];
  badges?: Record<string, any>;
}

export function OnlineUsers({ users, badges = {} }: OnlineUsersProps) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">מי מחובר?</h2>
        <div className="p-4 bg-[#F3F4F6] rounded-lg border border-pink-200">
          <p className="text-sm text-gray-500">אין חברים מחוברים כרגע</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">מי מחובר?</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {users.map((user) => {
            const userId = user.user_id || user.id;
            const userBadge = badges[userId];
            
            return (
              <div
                key={user.id || user.user_id}
                className="relative group"
                title={user.display_name || user.nickname || 'משתמש'}
              >
                {user.avatar_url ? (
                  <img
                    src={`${user.avatar_url}?t=${Date.now()}`}
                    alt={user.display_name || 'User'}
                    className="w-10 h-10 rounded-full border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm border-2 border-green-500 cursor-pointer hover:scale-110 transition-transform">
                    {getInitials(user.display_name || user.nickname || 'משתמש')}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
                {userBadge?.badge && (
                  <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg border-2 border-white z-10">
                    <span 
                      style={{ color: userBadge.badge.icon_color || '#FFD700', fontSize: '10px' }}
                      className="leading-none"
                    >
                      {userBadge.badge.icon || '⭐'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500">
          {users.length} {users.length === 1 ? 'חבר מחובר' : 'חברים מחוברים'}
        </p>
      </div>
    </div>
  );
}


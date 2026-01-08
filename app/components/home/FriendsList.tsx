'use client';

import { useState } from 'react';
import { getInitials } from '@/lib/utils/display';
import { formatTimeAgo } from '@/lib/utils/date';
import type { ProfileWithRole } from '@/lib/queries/profiles';

interface FriendsListProps {
  friends: ProfileWithRole[];
  badges?: Record<string, any>;
}

export function FriendsList({ friends, badges = {} }: FriendsListProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'new'>('active');

  const filteredFriends = activeTab === 'active' 
    ? friends.filter((f: any) => f.is_online === true)
    : friends.sort((a: any, b: any) => {
        const aDate = new Date(a.created_at || 0).getTime();
        const bDate = new Date(b.created_at || 0).getTime();
        return bDate - aDate;
      }).slice(0, 10);

  const handleFriendClick = (friendUserId: string) => {
    if (friendUserId && typeof window !== 'undefined') {
      localStorage.setItem('selectedUserId', friendUserId);
      window.location.href = '/profile';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">חברים</h2>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          פעילים
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'new'
              ? 'bg-pink-100 text-[#F52F8E]'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          חדשים
        </button>
      </div>

      {filteredFriends.length === 0 ? (
        <div className="p-4 bg-[#F3F4F6] rounded-lg">
          <p className="text-sm text-gray-500">אין חברים {activeTab === 'active' ? 'פעילים' : 'חדשים'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFriends.slice(0, 10).map((friend: any) => {
            const friendUserId = friend.user_id || friend.id;
            const friendBadge = badges[friendUserId];
            
            return (
              <div 
                key={friend.id || friend.user_id} 
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
                onClick={() => handleFriendClick(friendUserId)}
              >
                <div className="relative">
                  {friend.avatar_url ? (
                    <img 
                      src={`${friend.avatar_url}?t=${Date.now()}`}
                      alt={friend.display_name || 'User'} 
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                      {getInitials(friend.display_name || friend.full_name)}
                    </div>
                  )}
                  {friend.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
                  )}
                  {friendBadge?.badge && (
                    <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg border-2 border-white z-10">
                      <span 
                        style={{ color: friendBadge.badge.icon_color || '#FFD700', fontSize: '10px' }}
                        className="leading-none"
                      >
                        {friendBadge.badge.icon || '⭐'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {friend.display_name || friend.full_name || 'משתמש'}
                  </p>
                  {activeTab === 'new' && friend.created_at && (
                    <p className="text-xs text-gray-500">
                      הצטרף {formatTimeAgo(friend.created_at)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}





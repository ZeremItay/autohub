'use client';

import { useState } from 'react';
import { Heart, Share2, MessageCircle, Trash2, ChevronDown, ChevronUp, Send, Plus, X } from 'lucide-react';
import { CommentsList } from '@/app/components/comments';
import { formatTimeAgo } from '@/lib/utils/date';
import { getInitials } from '@/lib/utils/display';
import { Button } from '@/components/ui/Button';
import type { PostWithProfile } from '@/lib/queries/posts';
import type { PostComment } from '@/lib/queries/post-comments';
import type { UserWithRole } from '@/lib/utils/user';

interface AnnouncementsFeedProps {
  announcements: PostWithProfile[];
  currentUser: UserWithRole | null;
  userIsAdmin: boolean;
  likedPosts: Record<string, boolean>;
  onToggleLike: (postId: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onCreatePost: (content: string, imageUrl?: string) => Promise<void>;
  badges?: Record<string, any>;
}

export function AnnouncementsFeed({
  announcements,
  currentUser,
  userIsAdmin,
  likedPosts,
  onToggleLike,
  onDeletePost,
  onCreatePost,
  badges = {},
}: AnnouncementsFeedProps) {
  const [showPostForm, setShowPostForm] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [postComments, setPostComments] = useState<Record<string, PostComment[]>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    await onCreatePost(newPostContent, newPostImageUrl);
    setNewPostContent('');
    setNewPostImageUrl('');
    setShowPostForm(false);
  };

  const handleToggleComments = async (postId: string) => {
    const isExpanded = expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: !isExpanded }));
    
    if (!isExpanded && !postComments[postId]) {
      // Load comments - this should be passed as a prop or handled by parent
      // For now, we'll leave it empty
    }
  };

  return (
    <main className="flex-1 min-w-0 space-y-4 sm:space-y-6">
      {userIsAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          {!showPostForm ? (
            <Button
              onClick={() => setShowPostForm(true)}
              variant="primary"
              className="w-full"
            >
              <Plus className="w-5 h-5 mr-2" />
              פרסם הודעה חדשה
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">פרסם הודעה חדשה</h3>
                <button
                  onClick={() => {
                    setShowPostForm(false);
                    setNewPostContent('');
                    setNewPostImageUrl('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="מה אתה רוצה לשתף?"
                dir="rtl"
                lang="he"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] resize-none"
                rows={4}
              />
              <input
                type="text"
                value={newPostImageUrl}
                onChange={(e) => setNewPostImageUrl(e.target.value)}
                placeholder="קישור לתמונה (אופציונלי)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E]"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  onClick={() => {
                    setShowPostForm(false);
                    setNewPostContent('');
                    setNewPostImageUrl('');
                  }}
                  variant="secondary"
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim()}
                  variant="primary"
                >
                  <Send className="w-4 h-4 mr-2" />
                  פרסם
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="p-3 sm:p-4 bg-[#F3F4F6] rounded-lg border-l-4 border-[#F52F8E]">
            <p className="text-xs sm:text-sm text-gray-500">מצטערים, לא נמצאה פעילות.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {announcements.map((post) => {
            const postAuthorId = post.user_id || post.profile?.user_id;
            const postAuthorBadge = postAuthorId ? badges[postAuthorId] : null;
            
            return (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex gap-3 sm:gap-4">
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                    {post.profile?.avatar_url ? (
                      <img
                        src={`${post.profile.avatar_url}?t=${Date.now()}`}
                        alt={post.profile.display_name || 'User'}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-lg shadow-pink-500/30 ring-2 ring-white/50"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300 flex items-center justify-center text-white font-semibold shadow-lg shadow-pink-500/30 ring-2 ring-white/50 text-sm sm:text-base">
                        {getInitials(post.profile?.display_name || 'מ')}
                      </div>
                    )}
                    {postAuthorBadge?.badge && (
                      <div className="absolute bottom-0 left-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg border-2 border-white z-10">
                        <span 
                          style={{ color: postAuthorBadge.badge.icon_color || '#FFD700', fontSize: '10px' }}
                          className="leading-none sm:text-xs"
                        >
                          {postAuthorBadge.badge.icon || '⭐'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                          {post.profile?.display_name || 'מנהל'}
                        </h3>
                        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs rounded-full font-medium shadow-md shadow-pink-500/30">
                          מנהל
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">•</span>
                        <span className="text-xs sm:text-sm text-gray-500">{formatTimeAgo(post.created_at)}</span>
                      </div>
                      {currentUser && (currentUser.id === post.user_id || currentUser.user_id === post.user_id) && (
                        <button
                          onClick={() => onDeletePost(post.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-lg hover:bg-red-50"
                          title="מחק פוסט"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                    </div>
                    {(() => {
                      const hasHTML = /<[a-z][\s\S]*>/i.test(post.content);
                      if (hasHTML) {
                        return (
                          <div 
                            className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed prose prose-sm max-w-none [&_p]:mb-3 [&_ul]:list-disc [&_ul]:mr-6 [&_ol]:list-decimal [&_ol]:mr-6 [&_li]:mb-2 [&_strong]:font-bold [&_em]:italic"
                            style={{ direction: 'rtl', textAlign: 'right' }}
                            dangerouslySetInnerHTML={{ __html: post.content }}
                          />
                        );
                      }
                      return (
                        <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed whitespace-pre-line">
                          {post.content}
                        </p>
                      );
                    })()}
                    {(post.image_url || post.media_url) && (
                      <div className="mb-3 sm:mb-4">
                        <img 
                          src={post.image_url || post.media_url} 
                          alt="Post media" 
                          className="w-full rounded-lg max-h-64 sm:max-h-96 object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-3 sm:gap-6 pt-3 sm:pt-4 border-t border-gray-100 flex-wrap">
                      <button 
                        onClick={() => onToggleLike(post.id)}
                        className={`flex items-center gap-1.5 sm:gap-2 transition-all group rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-pink-50 ${
                          likedPosts[post.id] 
                            ? 'text-pink-500' 
                            : 'text-gray-600 hover:text-pink-500'
                        }`}
                      >
                        <Heart 
                          className={`w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform ${
                            likedPosts[post.id] ? 'fill-current' : ''
                          }`} 
                        />
                        <span className="text-xs sm:text-sm font-medium">{post.likes_count || 0}</span>
                      </button>
                      <button 
                        onClick={() => handleToggleComments(post.id)}
                        className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-pink-500 transition-all group rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-pink-50"
                      >
                        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-xs sm:text-sm font-medium">{post.comments_count || 0} תגובות</span>
                        {expandedComments[post.id] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-pink-500 transition-all group rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-pink-50">
                        <Share2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-xs sm:text-sm font-medium">שיתוף</span>
                      </button>
                    </div>

                    {expandedComments[post.id] && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <CommentsList
                          comments={postComments[post.id] || []}
                          currentUser={currentUser || undefined}
                          onSubmitComment={async () => {}}
                          onSubmitReply={async () => {}}
                          onDeleteComment={() => {}}
                          badges={badges}
                          emptyMessage="אין תגובות עדיין. היה הראשון להגיב!"
                          showForm={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}





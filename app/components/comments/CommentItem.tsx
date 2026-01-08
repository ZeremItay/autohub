'use client';

import { Trash2, Heart } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils/date';
import CommentForm from './CommentForm';
import { useState } from 'react';

interface CommentUser {
  id?: string;
  user_id?: string;
  display_name?: string;
  avatar_url?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  role?: {
    name?: string;
  };
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  likes_count?: number;
  user_liked?: boolean;
  user?: CommentUser;
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  currentUser?: {
    id?: string;
    user_id?: string;
    display_name?: string;
    avatar_url?: string;
  };
  onDelete?: (commentId: string) => void;
  onReply?: (commentId: string, text: string) => Promise<void>;
  badge?: {
    icon?: string;
    icon_color?: string;
  };
  showReplies?: boolean;
  isReply?: boolean;
  replyingTo?: string | null;
  onToggleReply?: (commentId: string) => void;
  replyText?: string;
  onReplyTextChange?: (text: string) => void;
  size?: 'sm' | 'md';
}

export default function CommentItem({
  comment,
  currentUser,
  onDelete,
  onReply,
  badge,
  showReplies = true,
  isReply = false,
  replyingTo,
  onToggleReply,
  replyText = '',
  onReplyTextChange,
  size = 'md'
}: CommentItemProps) {
  const commentUserId = comment.user_id || comment.user?.user_id;
  const canDelete = currentUser && (currentUser.id === commentUserId || currentUser.user_id === commentUserId);
  const isReplying = replyingTo === comment.id;
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const [userLiked, setUserLiked] = useState(comment.user_liked || false);
  const [liking, setLiking] = useState(false);

  const displayName = comment.user?.display_name || 
                     comment.user?.first_name || 
                     comment.user?.nickname || 
                     'משתמש';

  const avatarSize = isReply ? 'w-6 h-6' : (size === 'sm' ? 'w-6 h-6' : 'w-8 h-8');
  const textSize = isReply ? 'text-xs' : (size === 'sm' ? 'text-xs' : 'text-sm');
  const gapSize = isReply ? 'gap-2' : (size === 'sm' ? 'gap-2' : 'gap-3');

  const handleReply = async (text: string) => {
    if (onReply) {
      try {
        await onReply(comment.id, text);
        // Close reply form after successful submission
        if (onToggleReply) {
          onToggleReply(comment.id);
        }
      } catch (error) {
        console.error('Error submitting reply:', error);
        // Don't close on error
      }
    }
  };

  const handleLike = async () => {
    if (!currentUser || liking) return;
    
    const userId = currentUser.user_id || currentUser.id;
    if (!userId) return;
    
    setLiking(true);
    try {
      const response = await fetch(`/api/forums/replies/${comment.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json();

      if (response.ok && result.data) {
        const newLiked = result.data.liked;
        setUserLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className={`flex ${gapSize}`}>
      <div className={`relative ${avatarSize} flex-shrink-0`}>
        {comment.user?.avatar_url ? (
          <img
            src={comment.user.avatar_url}
            alt={displayName}
            className={`${avatarSize} rounded-full object-cover`}
            key={`comment-${comment.id}`}
          />
        ) : (
          <div className={`${avatarSize} rounded-full bg-gradient-to-br ${isReply ? 'from-purple-500 to-purple-600' : 'from-blue-500 to-blue-600'} flex items-center justify-center text-white font-semibold ${textSize}`}>
            {displayName.charAt(0) || 'מ'}
          </div>
        )}
        {badge && (
          <div className={`absolute bottom-0 left-0 ${isReply ? 'w-3 h-3' : (size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg ${isReply || size === 'sm' ? 'border border-white' : 'border-2 border-white'} z-10`}>
            <span 
              style={{ color: badge.icon_color || '#FFD700', fontSize: isReply || size === 'sm' ? '6px' : '8px' }}
              className="leading-none"
            >
              {badge.icon || '⭐'}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className={`flex items-center justify-between mb-${isReply ? '1' : '1'}`}>
          <div>
            <h4 className={`font-semibold text-gray-800 ${textSize}`}>
              {displayName}
            </h4>
            {comment.user?.role?.name === 'admin' && (
              <span className="px-2 py-0.5 bg-[#F52F8E] text-white text-xs font-semibold rounded-full">
                אדמין
              </span>
            )}
            <p className={`${textSize} text-gray-500`}>{formatTimeAgo(comment.created_at)}</p>
          </div>
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-red-500 hover:text-red-700 transition-colors"
              title="מחק תגובה"
            >
              <Trash2 className={isReply ? 'w-3 h-3' : 'w-3 h-3'} />
            </button>
          )}
        </div>
        <div 
          className={`text-gray-700 ${textSize} mb-2 prose prose-sm max-w-none`}
          dangerouslySetInnerHTML={{ __html: comment.content }}
          dir="rtl"
        />
        
        {/* Actions */}
        <div className="flex items-center gap-4 mt-2">
          {/* Like Button */}
          {currentUser && (
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-1 ${textSize} transition-colors ${
                userLiked
                  ? 'text-[#F52F8E]'
                  : 'text-gray-500 hover:text-[#F52F8E]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Heart className={isReply ? 'w-3 h-3' : 'w-4 h-4'} fill={userLiked ? 'currentColor' : 'none'} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>
          )}
          
          {/* Reply Button */}
          {currentUser && onReply && onToggleReply && !isReply && (
            <button
              onClick={() => onToggleReply(comment.id)}
              className={`${textSize} text-[#F52F8E] hover:underline`}
            >
              {isReplying ? 'בטל' : 'הגב'}
            </button>
          )}
        </div>

        {/* Reply Form */}
        {isReplying && currentUser && onReply && (
          <div className={`mt-2 ${isReply ? '' : 'pr-4 border-r-2 border-[#F52F8E]'}`}>
            <CommentForm
              onSubmit={handleReply}
              placeholder="כתוב תגובה..."
              buttonText="שלח"
              isReplying={true}
              onCancel={() => onToggleReply && onToggleReply(comment.id)}
              currentUser={currentUser}
              badge={badge}
              size="sm"
            />
          </div>
        )}

        {/* Replies */}
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <div className={`mt-2 ${isReply ? '' : 'pr-4 space-y-2 border-r-2 border-gray-200'}`}>
            {comment.replies.map((reply) => {
              const replyUserId = reply.user_id || reply.user?.user_id;
              const replyBadge = replyUserId && badge ? badge : undefined;
              
              return (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUser={currentUser}
                  onDelete={onDelete}
                  onReply={onReply}
                  badge={replyBadge}
                  showReplies={false}
                  isReply={true}
                  size={size}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


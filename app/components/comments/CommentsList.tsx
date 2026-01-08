'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

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
  user?: CommentUser;
  replies?: Comment[];
}

interface CommentsListProps {
  comments: Comment[];
  currentUser?: {
    id?: string;
    user_id?: string;
    display_name?: string;
    avatar_url?: string;
  };
  onSubmitComment: (text: string) => Promise<void>;
  onSubmitReply?: (commentId: string, text: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => void;
  badges?: Record<string, { badge?: { icon?: string; icon_color?: string } }>;
  emptyMessage?: string;
  showForm?: boolean;
  size?: 'sm' | 'md';
}

export default function CommentsList({
  comments,
  currentUser,
  onSubmitComment,
  onSubmitReply,
  onDeleteComment,
  badges = {},
  emptyMessage = 'אין תגובות עדיין. היה הראשון להגיב!',
  showForm = true,
  size = 'md'
}: CommentsListProps) {
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleToggleReply = (commentId: string) => {
    setReplyingTo(prev => ({
      ...prev,
      [commentId]: prev[commentId] === commentId ? null : commentId
    }));
  };

  const handleReply = async (commentId: string, text: string) => {
    if (onSubmitReply) {
      await onSubmitReply(commentId, text);
      setReplyingTo(prev => ({
        ...prev,
        [commentId]: null
      }));
    }
  };

  const getBadgeForUser = (userId?: string) => {
    if (!userId) return undefined;
    const userBadge = badges[userId];
    return userBadge?.badge;
  };

  const getCurrentUserBadge = () => {
    if (!currentUser) return undefined;
    const userId = currentUser.user_id || currentUser.id;
    return getBadgeForUser(userId);
  };

  const handleFormSubmit = async (text: string) => {
    await onSubmitComment(text);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Add Comment Button / Form */}
      {showForm && currentUser && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          {!isFormOpen ? (
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>תגובה</span>
            </button>
          ) : (
            <CommentForm
              onSubmit={handleFormSubmit}
              placeholder="כתוב תגובה..."
              buttonText="שלח"
              currentUser={currentUser}
              badge={getCurrentUserBadge()}
              size={size}
            />
          )}
        </div>
      )}

      {/* Comments List */}
      {comments && comments.length > 0 ? (
        comments.map((comment) => {
          const commentUserId = comment.user_id || comment.user?.user_id;
          const commentBadge = getBadgeForUser(commentUserId);
          
          return (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              onDelete={onDeleteComment}
              onReply={onSubmitReply ? handleReply : undefined}
              badge={commentBadge}
              showReplies={true}
              replyingTo={replyingTo[comment.id] || null}
              onToggleReply={onSubmitReply ? handleToggleReply : undefined}
              size={size}
            />
          );
        })
      ) : (
        <p className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-gray-500 text-center py-4`}>
          {emptyMessage}
        </p>
      )}
    </div>
  );
}


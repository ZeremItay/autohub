'use client';

import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

interface CommentFormProps {
  onSubmit: (text: string) => Promise<void>;
  placeholder?: string;
  buttonText?: string;
  isReplying?: boolean;
  onCancel?: () => void;
  currentUser?: {
    id?: string;
    user_id?: string;
    display_name?: string;
    avatar_url?: string;
  };
  badge?: {
    icon?: string;
    icon_color?: string;
  };
  size?: 'sm' | 'md';
  initialText?: string;
}

export default function CommentForm({
  onSubmit,
  placeholder = 'כתוב תגובה...',
  buttonText = 'שלח',
  isReplying = false,
  onCancel,
  currentUser,
  badge,
  size = 'md',
  initialText = ''
}: CommentFormProps) {
  // Use lazy initialization to prevent useState from resetting on every render
  const [text, setText] = useState(() => initialText);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevInitialTextRef = useRef<string | undefined>(initialText);
  
  // Update text ONLY when initialText actually changes (e.g., when @mention is added)
  // Use ref to track previous initialText value to avoid updating when user is typing
  useEffect(() => {
    // Only update if initialText actually changed (not just different from current text)
    if (initialText !== undefined && initialText !== prevInitialTextRef.current) {
      setText(initialText);
      prevInitialTextRef.current = initialText;
    }
  }, [initialText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const avatarSize = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const paddingSize = size === 'sm' ? 'px-2 py-1' : 'px-3 py-2';
  const gapSize = size === 'sm' ? 'gap-2' : 'gap-3';

  return (
    <div className={`flex ${gapSize}`}>
      {currentUser && (
        <div className={`relative ${avatarSize} flex-shrink-0`}>
          {currentUser.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.display_name || 'User'}
              className={`${avatarSize} rounded-full object-cover`}
            />
          ) : (
            <div className={`${avatarSize} rounded-full bg-gradient-to-br from-[#F52F8E] to-pink-400 flex items-center justify-center text-white font-semibold ${textSize}`}>
              {currentUser.display_name?.charAt(0) || 'א'}
            </div>
          )}
          {badge && (
            <div className={`absolute bottom-0 left-0 ${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg ${size === 'sm' ? 'border border-white' : 'border-2 border-white'} z-10`}>
              <span 
                style={{ color: badge.icon_color || '#FFD700', fontSize: size === 'sm' ? '6px' : '8px' }}
                className="leading-none"
              >
                {badge.icon || '⭐'}
              </span>
            </div>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex-1">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder={placeholder}
          dir="rtl"
          lang="he"
          className={`w-full ${paddingSize} border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52F8E] resize-none ${textSize} bg-white/5 text-white placeholder:text-gray-400`}
          rows={size === 'sm' ? 2 : 2}
          disabled={loading}
        />
        <div className={`flex items-center justify-end gap-2 ${size === 'sm' ? 'mt-1' : 'mt-2'}`}>
          {isReplying && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={`${paddingSize} ${textSize} text-gray-300 hover:text-white`}
              disabled={loading}
            >
              בטל
            </button>
          )}
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className={`btn-primary flex items-center gap-1 ${paddingSize} ${textSize} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send className={size === 'sm' ? 'w-3 h-3' : 'w-3 h-3'} />
            <span>{buttonText}</span>
          </button>
        </div>
      </form>
    </div>
  );
}


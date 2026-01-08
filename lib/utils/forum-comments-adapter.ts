/**
 * Adapter function to convert forum replies to comments format
 * Used to unify the comments system across the application
 */

interface ForumReply {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  parent_id?: string | null;
  likes_count?: number;
  user_liked?: boolean;
  profile?: {
    user_id?: string;
    display_name?: string;
    avatar_url?: string;
    first_name?: string;
    last_name?: string;
    nickname?: string;
  };
  replies?: ForumReply[];
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  likes_count?: number;
  user_liked?: boolean;
  user?: {
    id?: string;
    user_id?: string;
    display_name?: string;
    avatar_url?: string;
    first_name?: string;
    last_name?: string;
    nickname?: string;
  };
  replies?: Comment[];
}

/**
 * Converts a single forum reply to comment format
 */
function adaptForumReplyToComment(reply: ForumReply): Comment {
  return {
    id: reply.id,
    user_id: reply.user_id,
    content: reply.content,
    created_at: reply.created_at,
    updated_at: reply.updated_at,
    likes_count: reply.likes_count || 0,
    user_liked: reply.user_liked || false,
    user: reply.profile ? {
      id: reply.profile.user_id,
      user_id: reply.profile.user_id,
      display_name: reply.profile.display_name,
      avatar_url: reply.profile.avatar_url,
      first_name: reply.profile.first_name,
      last_name: reply.profile.last_name,
      nickname: reply.profile.nickname
    } : {
      user_id: reply.user_id,
      display_name: 'משתמש',
      avatar_url: undefined
    },
    replies: reply.replies && reply.replies.length > 0
      ? reply.replies.map(adaptForumReplyToComment)
      : undefined
  };
}

/**
 * Converts an array of forum replies to comments format
 * Handles nested replies recursively
 */
export function adaptForumRepliesToComments(replies: ForumReply[]): Comment[] {
  if (!replies || replies.length === 0) {
    return [];
  }
  
  return replies.map(adaptForumReplyToComment);
}


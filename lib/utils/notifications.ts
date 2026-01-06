import { createNotification } from '../queries/notifications';
import { createServerClient } from '../supabase-server';

// Helper function to create notification for comment on recording
export async function notifyRecordingComment(
  recordingId: string,
  recordingTitle: string,
  commenterId: string,
  commenterName: string,
  recordingOwnerId: string
) {
  // Don't notify if user commented on their own recording
  if (commenterId === recordingOwnerId) return;

  return await createNotification({
    user_id: recordingOwnerId,
    type: 'comment',
    title: 'תגובה חדשה על ההקלטה שלך',
    message: `${commenterName} הגיב על ההקלטה "${recordingTitle}"`,
    link: `/recordings/${recordingId}`,
    related_id: recordingId,
    related_type: 'recording',
    is_read: false
  });
}

// Helper function to create notification for reply to comment
export async function notifyCommentReply(
  recordingId: string,
  recordingTitle: string,
  replierId: string,
  replierName: string,
  commentOwnerId: string,
  parentCommentId: string
) {
  // Don't notify if user replied to their own comment
  if (replierId === commentOwnerId) return;

  return await createNotification({
    user_id: commentOwnerId,
    type: 'reply',
    title: 'תגובה לתגובה שלך',
    message: `${replierName} הגיב על התגובה שלך בהקלטה "${recordingTitle}"`,
    link: `/recordings/${recordingId}#comment-${parentCommentId}`,
    related_id: parentCommentId,
    related_type: 'comment',
    is_read: false
  });
}

// Helper function to create notification for forum post reply
export async function notifyForumPostReply(
  postId: string,
  postTitle: string,
  forumId: string,
  replierId: string,
  replierName: string,
  postOwnerId: string
) {
  // Don't notify if user replied to their own post
  if (replierId === postOwnerId) return;

  // Validate forumId - if it's null/undefined, try to get it from the post
  let validForumId = forumId;
  if (!validForumId || validForumId === 'null' || validForumId === 'undefined') {
    // Try to fetch forum_id from the post
    const { supabase } = await import('../supabase');
    const { data: postData } = await supabase
      .from('forum_posts')
      .select('forum_id')
      .eq('id', postId)
      .maybeSingle();
    
    if (postData?.forum_id) {
      validForumId = postData.forum_id;
    } else {
      // If we can't get forum_id, use a fallback link to the forums page
      console.warn(`Could not determine forum_id for post ${postId}, using fallback link`);
      return await createNotification({
        user_id: postOwnerId,
        type: 'forum_reply',
        title: 'תגובה על הפוסט שלך',
        message: `${replierName} הגיב על הפוסט "${postTitle}"`,
        link: `/forums`,
        related_id: postId,
        related_type: 'forum_post',
        is_read: false
      });
    }
  }

  return await createNotification({
    user_id: postOwnerId,
    type: 'forum_reply',
    title: 'תגובה על הפוסט שלך',
    message: `${replierName} הגיב על הפוסט "${postTitle}"`,
    link: `/forums/${validForumId}/posts/${postId}`,
    related_id: postId,
    related_type: 'forum_post',
    is_read: false
  });
}

// Helper function to create notification for comment on post
export async function notifyPostComment(
  postId: string,
  commenterId: string,
  commenterName: string,
  postOwnerId: string,
  isReply: boolean = false,
  parentCommentOwnerId?: string
) {
  // If it's a reply, notify the parent comment owner
  if (isReply && parentCommentOwnerId) {
    // Don't notify if user replied to their own comment
    if (commenterId === parentCommentOwnerId) return;

    return await createNotification({
      user_id: parentCommentOwnerId,
      type: 'reply',
      title: 'תגובה לתגובה שלך',
      message: `${commenterName} הגיב על התגובה שלך`,
      link: `/post/${postId}`,
      related_id: postId,
      related_type: 'comment',
      is_read: false
    });
  }

  // If it's a top-level comment, notify the post owner
  // Don't notify if user commented on their own post
  if (commenterId === postOwnerId) return;

  return await createNotification({
    user_id: postOwnerId,
    type: 'comment',
    title: 'תגובה על הפוסט שלך',
    message: `${commenterName} הגיב על הפוסט שלך`,
    link: `/post/${postId}`,
    related_id: postId,
    related_type: 'post',
    is_read: false
  });
}

// Helper function to create notification for like on post
export async function notifyPostLike(
  postId: string,
  likerId: string,
  likerName: string,
  postOwnerId: string
) {
  // Don't notify if user liked their own post
  if (likerId === postOwnerId) return;

  return await createNotification({
    user_id: postOwnerId,
    type: 'like',
    title: 'לייק על הפוסט שלך',
    message: `${likerName} אהב את הפוסט שלך`,
    link: `/post/${postId}`,
    related_id: postId,
    related_type: 'post',
    is_read: false
  });
}

// Helper function to create notification for mention in content
export async function notifyMention(
  mentionedUserId: string,
  mentionerId: string,
  mentionerName: string,
  content: string,
  link: string,
  relatedId: string,
  relatedType: string
) {
  // Don't notify if user mentioned themselves
  if (mentionerId === mentionedUserId) return;

  // Extract mention from content (look for @username pattern)
  const mentionMatch = content.match(/@(\w+)/);
  if (!mentionMatch) return;

  return await createNotification({
    user_id: mentionedUserId,
    type: 'mention',
    title: 'תייגו אותך',
    message: `${mentionerName} תייג אותך`,
    link,
    related_id: relatedId,
    related_type: relatedType,
    is_read: false
  });
}

// Helper function to check for mentions in text and create notifications
export async function checkAndNotifyMentions(
  content: string,
  mentionerId: string,
  mentionerName: string,
  link: string,
  relatedId: string,
  relatedType: string
) {
  const supabase = createServerClient();
  
  // Find all @mentions in content (Hebrew and English usernames)
  const mentionMatches = content.matchAll(/@([\w\u0590-\u05FF]+)/g);
  const mentionedUsernames = Array.from(mentionMatches, m => m[1]);
  
  if (mentionedUsernames.length === 0) return;

  // Get user IDs for mentioned usernames or display names
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, username, nickname')
    .or(mentionedUsernames.map(u => `username.ilike.${u},display_name.ilike.${u},nickname.ilike.${u}`).join(','));

  if (!profiles || profiles.length === 0) return;

  // Create notifications for each mentioned user
  for (const profile of profiles) {
    const userId = profile.user_id || (profile as any).id;
    if (userId && userId !== mentionerId) {
      await notifyMention(
        userId,
        mentionerId,
        mentionerName,
        content,
        link,
        relatedId,
        relatedType
      );
    }
  }
}


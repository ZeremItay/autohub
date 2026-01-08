import { createNotification } from '../queries/notifications';
import { createServerClient } from '../supabase-server';
import { createClient } from '@supabase/supabase-js';

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
  postOwnerId: string,
  replyContent?: string
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

  const notification = await createNotification({
    user_id: postOwnerId,
    type: 'forum_reply',
    title: 'תגובה על הפוסט שלך',
    message: `${replierName} הגיב על הפוסט "${postTitle}"`,
    link: `/forums/${validForumId}/posts/${postId}`,
    related_id: postId,
    related_type: 'forum_post',
    is_read: false
  });

  // Send email notification (don't fail if email fails)
  try {
    await sendForumReplyEmail(
      postOwnerId,
      postId,
      postTitle,
      validForumId,
      replierName,
      replyContent || ''
    );
  } catch (error) {
    console.error('Error sending forum reply email:', error);
  }

  return notification;
}

// Send email notification for forum post reply
export async function sendForumReplyEmail(
  postOwnerId: string,
  postId: string,
  postTitle: string,
  forumId: string,
  replierName: string,
  replyContent: string
) {
  try {
    // Check if user wants to receive email notifications for forum replies
    const { shouldSendEmail } = await import('../queries/email-preferences');
    const wantsEmail = await shouldSendEmail(postOwnerId, 'forum_reply');
    
    if (!wantsEmail) {
      console.log('User has disabled forum reply email notifications, skipping email');
      return;
    }
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return;
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get post owner email and name
    const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(postOwnerId);
    if (!ownerUser?.user?.email) {
      console.error('Post owner email not found');
      return;
    }

    const { data: ownerProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name, first_name, nickname')
      .eq('user_id', postOwnerId)
      .maybeSingle();

    const ownerName = ownerProfile?.display_name || ownerProfile?.first_name || ownerProfile?.nickname || 'משתמש';

    // Get forum name
    const { data: forum } = await supabaseAdmin
      .from('forums')
      .select('display_name, name')
      .eq('id', forumId)
      .maybeSingle();

    const forumName = forum?.display_name || forum?.name || 'הפורום';

    // Strip HTML tags from reply content for email
    const plainTextContent = replyContent.replace(/<[^>]*>/g, '').trim();
    const truncatedContent = plainTextContent.length > 200 
      ? plainTextContent.substring(0, 200) + '...' 
      : plainTextContent;

    // Build post URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'https://www.autohub.co.il';
    const postUrl = `${siteUrl}/forums/${forumId}/posts/${postId}`;

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>תגובה חדשה על הפוסט שלך - מועדון האוטומטורים</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F52F8E 0%, #E01E7A 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">💬 תגובה חדשה</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              היי ${ownerName},
            </p>
            
            <p style="font-size: 16px; color: #555; margin-bottom: 20px; line-height: 1.6;">
              <strong>${replierName}</strong> ענה לך על הפוסט שפרסמת בפורום <strong>${forumName}</strong>.
            </p>
            
            <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #999; font-weight: bold;">הפוסט:</p>
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: bold;">${postTitle}</p>
            </div>
            
            ${truncatedContent ? `
            <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #999; font-weight: bold;">התגובה:</p>
              <p style="margin: 0; font-size: 15px; color: #555; line-height: 1.6; white-space: pre-wrap;">${truncatedContent}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${postUrl}" 
                 style="display: inline-block; background-color: #F52F8E; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                צפה בפוסט
              </a>
            </div>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px; text-align: center;">
              זהו מייל אוטומטי, אנא אל תשיב למייל זה
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; font-size: 12px; color: #999;">
              © ${new Date().getFullYear()} מועדון האוטומטורים. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return;
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'מועדון האוטומטורים <noreply@autohub.co.il>',
        to: [ownerUser.user.email],
        subject: `${replierName} ענה על הפוסט שלך בפורום ${forumName}`,
        html: emailHtml,
      }),
    });

    const emailData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('❌ Resend API error:', {
        status: resendResponse.status,
        error: emailData
      });
      return;
    }

    console.log('✅ Forum reply email sent successfully via Resend:', {
      to: ownerUser.user.email,
      emailId: emailData.id,
      subject: `${replierName} ענה על הפוסט שלך בפורום ${forumName}`
    });
  } catch (error: any) {
    console.error('Error sending forum reply email:', error);
    // Don't throw - email is not critical
  }
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


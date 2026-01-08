import { createClient } from '@supabase/supabase-js';
import { getUsersForNewProjectNotifications } from '../queries/email-preferences';

// Send email notification to all users who want to receive new project notifications
export async function sendNewProjectEmail(
  projectId: string,
  projectTitle: string,
  projectDescription: string,
  budgetMin?: number | null,
  budgetMax?: number | null,
  budgetCurrency: string = 'ILS'
) {
  try {
    // Get all users who want to receive new project notifications
    const { data: userIds, error: usersError } = await getUsersForNewProjectNotifications();

    if (usersError || !userIds || userIds.length === 0) {
      console.log('No users want to receive new project notifications, skipping emails');
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

    // Get emails for all users
    const userEmails: string[] = [];
    for (const userId of userIds) {
      try {
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (user?.user?.email) {
          userEmails.push(user.user.email);
        }
      } catch (error) {
        console.error(`Error getting email for user ${userId}:`, error);
      }
    }

    if (userEmails.length === 0) {
      console.log('No valid emails found for users who want new project notifications');
      return;
    }

    // Build project URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'https://www.autohub.co.il';
    const projectUrl = `${siteUrl}/projects`;

    // Format budget
    let budgetText = '';
    if (budgetMin !== null && budgetMin !== undefined && budgetMax !== null && budgetMax !== undefined) {
      budgetText = `${budgetMin.toLocaleString('he-IL')} - ${budgetMax.toLocaleString('he-IL')} ${budgetCurrency}`;
    } else if (budgetMin !== null && budgetMin !== undefined) {
      budgetText = `מ-${budgetMin.toLocaleString('he-IL')} ${budgetCurrency}`;
    } else if (budgetMax !== null && budgetMax !== undefined) {
      budgetText = `עד ${budgetMax.toLocaleString('he-IL')} ${budgetCurrency}`;
    }

    // Strip HTML tags from description for email
    const plainTextDescription = projectDescription.replace(/<[^>]*>/g, '').trim();
    const truncatedDescription = plainTextDescription.length > 300 
      ? plainTextDescription.substring(0, 300) + '...' 
      : plainTextDescription;

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>פרויקט חדש עלה - מועדון האוטומטורים</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F52F8E 0%, #E01E7A 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🚀 פרויקט חדש עלה!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              שלום,
            </p>
            
            <p style="font-size: 16px; color: #555; margin-bottom: 20px; line-height: 1.6;">
              פרויקט חדש עלה באתר מועדון האוטומטורים!
            </p>
            
            <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #999; font-weight: bold;">כותרת הפרויקט:</p>
              <p style="margin: 0; font-size: 18px; color: #333; font-weight: bold;">${projectTitle}</p>
            </div>
            
            ${truncatedDescription ? `
            <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #999; font-weight: bold;">תיאור:</p>
              <p style="margin: 0; font-size: 15px; color: #555; line-height: 1.6; white-space: pre-wrap;">${truncatedDescription}</p>
            </div>
            ` : ''}
            
            ${budgetText ? `
            <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #999; font-weight: bold;">תקציב:</p>
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: bold;">${budgetText}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${projectUrl}" 
                 style="display: inline-block; background-color: #F52F8E; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                צפה בפרויקט
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
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
              <a href="${siteUrl}/account" style="color: #F52F8E; text-decoration: none;">לשנות העדפות התראות</a>
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

    // Send to all users in batches (Resend allows up to 50 recipients per request)
    const batchSize = 50;
    for (let i = 0; i < userEmails.length; i += batchSize) {
      const batch = userEmails.slice(i, i + batchSize);
      
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'מועדון האוטומטורים <noreply@autohub.co.il>',
          to: batch,
          subject: `פרויקט חדש עלה: ${projectTitle}`,
          html: emailHtml,
        }),
      });

      const emailData = await resendResponse.json();

      if (!resendResponse.ok) {
        console.error('❌ Resend API error:', {
          status: resendResponse.status,
          error: emailData,
          batchSize: batch.length
        });
      } else {
        console.log(`✅ New project email sent successfully to ${batch.length} users:`, {
          emailIds: emailData.id,
          subject: `פרויקט חדש עלה: ${projectTitle}`
        });
      }
    }
  } catch (error: any) {
    console.error('Error sending new project email:', error);
    // Don't throw - email is not critical
  }
}


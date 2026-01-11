import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { getEventById } from '@/lib/queries/events';
import { getProfileWithRole } from '@/lib/queries/profiles';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, eventId } = body;

    if (!userId || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, eventId' },
        { status: 400 }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await getEventById(eventId);
    
    if (eventError || !event) {
      console.error('Error fetching event:', eventError);
      return NextResponse.json(
        { error: 'Event not found', details: eventError },
        { status: 404 }
      );
    }

    // Get user email from auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      console.error('Error getting user email:', userError);
      return NextResponse.json(
        { error: 'User not found', details: userError },
        { status: 404 }
      );
    }

    const userEmail = user.email;

    if (!userEmail) {
      console.warn('No email found for user:', userId);
      return NextResponse.json(
        { error: 'No email found for user' },
        { status: 404 }
      );
    }

    // Get user profile for display name
    const { data: profile } = await getProfileWithRole(userId);
    const userName = profile?.display_name || profile?.first_name || user.email?.split('@')[0] || 'משתמש';

    // Format date and time
    function formatDate(dateString: string): string {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    function formatTime(timeString: string): string {
      if (!timeString) return '';
      return timeString.substring(0, 5);
    }

    const eventDate = formatDate(event.event_date);
    const eventTime = formatTime(event.event_time);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Build learning points list
    let learningPointsHtml = '';
    if (event.learning_points && event.learning_points.length > 0) {
      learningPointsHtml = `
        <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: bold;">בלייב נדבר על:</h3>
          <ul style="margin: 0; padding-right: 20px; color: #333; line-height: 2;">
            ${event.learning_points.map((point: string) => `<li>${point}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Build about text
    let aboutTextHtml = '';
    if (event.about_text) {
      // Strip HTML tags for plain text version, but keep for HTML
      const aboutText = event.about_text.replace(/<[^>]*>/g, '');
      aboutTextHtml = `
        <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: bold;">על האירוע</h3>
          <p style="margin: 0; font-size: 16px; color: #555; line-height: 1.6; white-space: pre-wrap;">${aboutText}</p>
        </div>
      `;
    }

    // Build instructor info
    let instructorHtml = '';
    if (event.instructor_name) {
      const instructorTitle = event.instructor_title ? ` - ${event.instructor_title}` : '';
      instructorHtml = `
        <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 25px;">
          הוובינר יהיה בהנחיית <strong>${event.instructor_name}${instructorTitle}</strong>
        </p>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>נרשמת בהצלחה לאירוע!</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F52F8E 0%, #E01E7A 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 נרשמת בהצלחה לאירוע!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              שלום ${userName},
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 25px;">
              נרשמת בהצלחה לאירוע <strong>"${event.title}"</strong>!
            </p>
            
            <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;">
                <strong>תאריך:</strong> ${eventDate}
              </p>
              <p style="margin: 0; font-size: 16px; color: #333;">
                <strong>שעה:</strong> ${eventTime}
              </p>
            </div>

            ${aboutTextHtml}

            ${learningPointsHtml}

            ${instructorHtml}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}/live/${eventId}" 
                 style="display: inline-block; background-color: #F52F8E; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                צפייה בפרטי האירוע
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

    // Send email directly via Resend API
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'מועדון האוטומטורים <noreply@autohub.co.il>',
        to: [userEmail],
        subject: `נרשמת בהצלחה לאירוע: ${event.title}`,
        html: emailHtml,
      }),
    });

    const emailData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('❌ Resend API error:', {
        status: resendResponse.status,
        error: emailData
      });
      return NextResponse.json(
        { error: 'Failed to send email', details: emailData },
        { status: 500 }
      );
    }

    console.log('✅ Registration confirmation email sent successfully:', {
      to: userEmail,
      emailId: emailData.id,
      subject: `נרשמת בהצלחה לאירוע: ${event.title}`
    });

    return NextResponse.json({ 
      success: true, 
      emailId: emailData.id 
    });
  } catch (error: any) {
    console.error('Error in send-registration-email API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

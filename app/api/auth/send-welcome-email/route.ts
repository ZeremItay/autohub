import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, userEmail } = body;

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, userEmail' },
        { status: 400 }
      );
    }

    // Get user email and first name from profile
    let email = userEmail;
    let firstName = '';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // Get user email from auth
      if (!email) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
        email = user?.email || userEmail;
      }

      // Get first_name from profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('first_name')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.warn('Error fetching profile for welcome email:', profileError);
      }

      // Prefer first_name from database, fallback to userName from request
      firstName = (profile?.first_name?.trim() || userName?.trim() || '').replace(/\0/g, ''); // Remove null bytes
    } else {
      firstName = (userName?.trim() || '').replace(/\0/g, ''); // Remove null bytes
    }

    if (!email) {
      return NextResponse.json(
        { error: 'No email found for user' },
        { status: 404 }
      );
    }

    // Use first name directly - ensure it's a valid string
    const safeFirstName = firstName && firstName.length > 0 ? firstName : '';
    const greeting = safeFirstName ? `שלום ${safeFirstName}` : 'שלום';
    
    // Log for debugging
    console.log('Welcome email - firstName from DB:', firstName, 'safeFirstName:', safeFirstName, 'greeting:', greeting);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ברוכים הבאים למועדון האוטומטורים!</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F52F8E 0%, #E01E7A 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 ברוכים הבאים למועדון האוטומטורים!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              ${greeting}
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 25px;">
              אנחנו שמחים מאוד שהצטרפת למועדון האוטומטורים! 🚀
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 25px;">
              המטרה של המועדון זה לצמוח ביחד כאנשי אוטומציה, מתחילים ומתקדמים כאחד.
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 15px;">
              חלק מהדברים שאפשר למצוא במועדון:
            </p>
            
            <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <ul style="margin: 0; padding-right: 20px; color: #333; line-height: 2;">
                <li>השתתפות בפורומים מקצועיים</li>
                <li>לצפות בהדרכות והקלטות של לייבים קודמים</li>
                <li>למצוא פרויקטים ולגייס לקוחות</li>
                <li>לגשת לקורסים והדרכות מתקדמות</li>
                <li>להשתתף בלייבים חודשיים עם שאלות ותשובות</li>
                <li>לבנות פרופיל עסקי חזק</li>
                <li>עוד המון דברים שמחכים לך בפנים</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}" 
                 style="display: inline-block; background-color: #F52F8E; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                נכנסים כאן ומכירים את הבית החדש שלך!
              </a>
            </div>
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

    // Send email via internal API route
    const emailResponse = await fetch(`${siteUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'ברוכים הבאים למועדון האוטומטורים! 🎉',
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Email sending failed:', emailData);
      return NextResponse.json(
        { error: 'Failed to send email', details: emailData },
        { status: 500 }
      );
    }

    console.log('✅ Welcome email sent successfully:', {
      to: email,
      emailId: emailData.data?.id
    });

    return NextResponse.json({ 
      success: true, 
      emailId: emailData.data?.id 
    });
  } catch (error: any) {
    console.error('Error in send-welcome-email API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}


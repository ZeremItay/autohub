import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'אימייל נדרש' },
        { status: 400 }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create admin client to generate password reset link
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if user exists by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json(
        { error: 'שגיאה בבדיקת המשתמש' },
        { status: 500 }
      );
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      // Don't reveal if user exists or not for security
      // Return success even if user doesn't exist
      return NextResponse.json({ 
        success: true,
        message: 'אם המשתמש קיים במערכת, נשלח לו מייל לאיפוס סיסמה'
      });
    }

    // Generate password reset link
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/auth/reset-password`;
    
    // Generate recovery token using Supabase Admin API
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: resetUrl
      }
    });

    if (resetError || !resetData) {
      console.error('Error generating reset link:', resetError);
      return NextResponse.json(
        { error: 'שגיאה ביצירת קישור איפוס סיסמה' },
        { status: 500 }
      );
    }

    // Extract the recovery link from the response
    // The generateLink returns properties with action_link which contains the full recovery URL
    // If action_link is not available, we'll use the properties to build the link
    let recoveryLink = resetData.properties?.action_link;
    
    if (!recoveryLink) {
      // Fallback: build the link manually if action_link is not provided
      // Supabase recovery links typically use hash fragments
      const token = resetData.properties?.hashed_token;
      if (token) {
        recoveryLink = `${resetUrl}#access_token=${token}&type=recovery`;
      } else {
        // Last resort: use the redirect URL
        recoveryLink = resetUrl;
      }
    }

    // Get user profile for display name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('display_name, first_name, nickname')
      .eq('user_id', user.id)
      .maybeSingle();

    const userName = profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש';

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>איפוס סיסמה - מועדון האוטומטורים</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F52F8E 0%, #E01E7A 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🔐 איפוס סיסמה</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              שלום ${userName},
            </p>
            
            <p style="font-size: 16px; color: #555; margin-bottom: 20px; line-height: 1.6;">
              קיבלנו בקשה לאיפוס הסיסמה שלך במועדון האוטומטורים.
            </p>
            
            <p style="font-size: 16px; color: #555; margin-bottom: 30px; line-height: 1.6;">
              לחץ על הכפתור למטה כדי ליצור סיסמה חדשה:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${recoveryLink}" 
                 style="display: inline-block; background-color: #F52F8E; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                איפוס סיסמה
              </a>
            </div>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px; line-height: 1.6;">
              אם לא ביקשת לאפס את הסיסמה, תוכל להתעלם מהמייל הזה. הסיסמה שלך לא תשתנה.
            </p>
            
            <p style="font-size: 14px; color: #999; margin-top: 20px; line-height: 1.6;">
              הקישור תקף ל-24 שעות בלבד.
            </p>
            
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
        from: 'מועדון האוטומטורים <onboarding@resend.dev>',
        to: [email],
        subject: 'איפוס סיסמה - מועדון האוטומטורים',
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
        { error: 'שגיאה בשליחת המייל', details: emailData },
        { status: 500 }
      );
    }

    console.log('✅ Password reset email sent successfully via Resend:', {
      to: email,
      emailId: emailData.id,
      subject: 'איפוס סיסמה - מועדון האוטומטורים'
    });

    return NextResponse.json({ 
      success: true,
      message: 'מייל איפוס סיסמה נשלח בהצלחה',
      emailId: emailData.id 
    });
  } catch (error: any) {
    console.error('Error in forgot-password API:', error);
    return NextResponse.json(
      { error: 'שגיאה פנימית בשרת', message: error.message },
      { status: 500 }
    );
  }
}


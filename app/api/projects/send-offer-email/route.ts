import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectOwnerId, projectTitle, offererName, offerAmount, offerCurrency, offerMessage, projectId, offerId } = body;

    if (!projectOwnerId || !projectTitle || !offererName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    // Get project owner's email from auth (requires service role)
    let ownerEmail: string | null = null;
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

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(projectOwnerId);
    
    if (userError || !user) {
      console.error('Error getting user email:', userError);
      return NextResponse.json(
        { error: 'User not found', details: userError },
        { status: 404 }
      );
    }

    ownerEmail = user.email || null;

    if (!ownerEmail) {
      console.warn('No email found for project owner:', projectOwnerId);
      return NextResponse.json(
        { error: 'No email found for project owner' },
        { status: 404 }
      );
    }

    // Get owner profile for display name
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', projectOwnerId)
      .single();

    const ownerName = ownerProfile?.display_name || 'משתמש';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הצעה חדשה לפרויקט שלך</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F52F8E 0%, #E01E7A 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 הצעה חדשה לפרויקט שלך!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              שלום ${ownerName},
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 25px;">
              קיבלת הצעה חדשה לפרויקט שלך <strong>"${projectTitle}"</strong>!
            </p>
            
            <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;">
                <strong>מגיש ההצעה:</strong> ${offererName}
              </p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;">
                <strong>הצעת מחיר:</strong> ₪ ${Number(offerAmount || 0).toLocaleString('he-IL')}
              </p>
              ${offerMessage ? `
                <p style="margin: 10px 0 0 0; font-size: 16px; color: #333;">
                  <strong>הודעה:</strong>
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666; line-height: 1.6; white-space: pre-wrap;">
                  ${offerMessage.replace(/\n/g, '<br>')}
                </p>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}/profile?userId=${projectOwnerId}&tab=projects&projectId=${projectId}&offerId=${offerId || projectId}" 
                 style="display: inline-block; background-color: #F52F8E; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                צפייה בהצעה
              </a>
            </div>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px; text-align: center;">
              זהו מייל אוטומטי, אנא אל תשיב למייל זה
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; font-size: 12px; color: #999;">
              © ${new Date().getFullYear()} AutoHub. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email directly via Resend API (not via internal fetch to avoid issues in production)
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
        to: [ownerEmail],
        subject: `הצעה חדשה לפרויקט "${projectTitle}"`,
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

    console.log('✅ Email sent successfully via Resend:', {
      to: ownerEmail,
      emailId: emailData.id,
      subject: `הצעה חדשה לפרויקט "${projectTitle}"`
    });

    return NextResponse.json({ 
      success: true, 
      emailId: emailData.id 
    });
  } catch (error: any) {
    console.error('Error in send-offer-email API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}


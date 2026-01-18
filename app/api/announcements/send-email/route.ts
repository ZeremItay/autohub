import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { stripHtml } from '@/lib/utils/stripHtml';

export const maxDuration = 300; // 5 minutes for Vercel Pro, 10s for Hobby

export async function POST(request: NextRequest) {
  console.log('📧 [send-email] API called');
  try {
    const body = await request.json();
    const { postId, postContent, postAuthorName, testUserId } = body;
    
    console.log('📧 [send-email] Request body:', { postId, postContentLength: postContent?.length, postAuthorName, testUserId });

    if (!postId || !postContent) {
      console.error('📧 [send-email] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: postId, postContent' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('📧 [send-email] Checking configuration...', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });

    if (!supabaseServiceKey) {
      console.error('📧 [send-email] SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY missing' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get users to send to
    let usersToNotify: Array<{ user_id: string; email: string; display_name: string }> = [];

    if (testUserId) {
      // Test mode - only send to one user
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(testUserId);
      
      if (userError || !user || !user.email) {
        return NextResponse.json(
          { error: 'Test user not found or has no email', details: userError },
          { status: 404 }
        );
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, first_name, nickname')
        .eq('user_id', testUserId)
        .single();

      usersToNotify = [{
        user_id: testUserId,
        email: user.email,
        display_name: profile?.display_name || profile?.first_name || profile?.nickname || 'משתמש'
      }];
    } else {
      // Production mode - get all users
      // Use admin client to bypass RLS policies
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, display_name, first_name, nickname')
        .not('user_id', 'is', null);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return NextResponse.json(
          { error: 'Failed to fetch users', details: profilesError.message },
          { status: 500 }
        );
      }
      
      if (!profiles || profiles.length === 0) {
        console.warn('No profiles found in database');
        return NextResponse.json(
          { error: 'No users found in database', details: 'No profiles returned from query' },
          { status: 404 }
        );
      }
      
      console.log(`Found ${profiles.length} profiles to notify`);

      // Get emails from auth for all users
      const userIds = (profiles || []).map(p => p.user_id).filter(Boolean);
      
      for (const profile of profiles || []) {
        if (!profile.user_id) continue;
        
        try {
          const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
          
          if (!userError && user && user.email) {
            usersToNotify.push({
              user_id: profile.user_id,
              email: user.email,
              display_name: profile.display_name || profile.first_name || profile.nickname || 'משתמש'
            });
          }
        } catch (error) {
          // Skip users that can't be fetched
          console.warn(`Could not fetch user ${profile.user_id}:`, error);
        }
      }
    }

    if (usersToNotify.length === 0) {
      return NextResponse.json(
        { error: 'No users found to notify' },
        { status: 404 }
      );
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://autohub.co.il';
    const postLink = `${siteUrl}/#post-${postId}`;
    const plainTextContent = stripHtml(postContent);
    const authorName = postAuthorName || 'המנהל';

    // Prepare email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הודעה חדשה ממועדון האוטומטורים</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #F52F8E 0%, #E01E7A 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📢 הודעה חדשה ממועדון האוטומטורים</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
              שלום!
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 25px;">
              ${authorName} פרסם הודעה חדשה במועדון האוטומטורים:
            </p>
            
            <div style="background-color: #f8f9fa; border-right: 4px solid #F52F8E; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <div style="color: #333; line-height: 1.8; font-size: 15px;">
                ${postContent}
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${postLink}" 
                 style="display: inline-block; background-color: #F52F8E; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                צפה בהודעה המלאה
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

    // Send emails in batches to avoid rate limiting and timeout
    const results: Array<{ user_id: string; email: string; status: string; error?: any }> = [];
    let successCount = 0;
    let failCount = 0;

    // Send emails in batches to avoid rate limiting
    const batchSize = 20; // Increased batch size for faster sending
    console.log(`📧 [send-email] Starting to send ${usersToNotify.length} emails in batches of ${batchSize}`);
    
    for (let i = 0; i < usersToNotify.length; i += batchSize) {
      const batch = usersToNotify.slice(i, i + batchSize);
      console.log(`📧 [send-email] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(usersToNotify.length / batchSize)} (${batch.length} emails)`);
      
      // Send emails in parallel within each batch
      const batchPromises = batch.map(async (user) => {
        try {
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'מועדון האוטומטורים <noreply@autohub.co.il>',
              to: [user.email],
              subject: `📢 הודעה חדשה ממועדון האוטומטורים`,
              html: emailHtml,
              text: plainTextContent,
            }),
          });

          const emailData = await resendResponse.json();

          if (resendResponse.ok) {
            successCount++;
            results.push({ user_id: user.user_id, email: user.email, status: 'success' });
          } else {
            failCount++;
            results.push({ 
              user_id: user.user_id, 
              email: user.email, 
              status: 'failed', 
              error: emailData 
            });
            console.error(`Failed to send email to ${user.email}:`, emailData);
          }
        } catch (error: any) {
          failCount++;
          results.push({ 
            user_id: user.user_id, 
            email: user.email, 
            status: 'error', 
            error: error.message 
          });
          console.error(`Error sending email to ${user.email}:`, error);
        }
      });

      // Wait for batch to complete before moving to next batch
      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < usersToNotify.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`📧 [send-email] Completed: ${successCount} sent, ${failCount} failed out of ${usersToNotify.length} total`);

    return NextResponse.json({ 
      success: true,
      sent: successCount,
      failed: failCount,
      total: usersToNotify.length,
      results: results.slice(0, 10), // Only return first 10 results to avoid large response
      testMode: !!testUserId
    });
  } catch (error: any) {
    console.error('Error in send-announcement-email API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

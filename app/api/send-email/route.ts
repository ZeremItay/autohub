import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// Helper function to check admin authorization
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
  const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY

  if (apiKey && validApiKey && apiKey === validApiKey) {
    return true
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (!sessionError && session) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('*, roles:role_id (id, name)')
        .eq('user_id', session.user.id)
        .single()

      const role = adminProfile?.roles || adminProfile?.role
      const roleName = typeof role === 'object' ? role?.name : role

      if (roleName === 'admin') {
        return true
      }
    }
  } catch (error) {
    // Session check failed
  }

  return false
}

export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await checkAdminAuth(request)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json();
    const { to, subject, html, text } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'מועדון האוטומטורים <noreply@autohub.co.il>',
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Plain text if not provided
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Resend API error:', {
        status: response.status,
        error: data
      });
      return NextResponse.json(
        { error: 'Failed to send email', details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}


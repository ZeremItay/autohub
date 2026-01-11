import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;
    
    const body = await request.json();
    let { name, email, subject, message, rating, feedback_type, image_url } = body;

    // If user is logged in but name/email are not provided, get them from profile
    if (userId && (!name || !email)) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, first_name, nickname, email')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profileError && profile) {
        // Use profile data if name/email are missing
        if (!name) {
          name = profile.display_name || profile.first_name || profile.nickname || session?.user?.email?.split('@')[0] || 'משתמש';
        }
        if (!email) {
          email = profile.email || session?.user?.email || null;
        }
      } else if (!name) {
        // Fallback to email username if profile not found
        name = session?.user?.email?.split('@')[0] || 'משתמש';
        email = email || session?.user?.email || null;
      }
    }

    // Validate required fields
    // If user is logged in, name will be set from profile above
    // If user is not logged in, name is required
    if (!name || !subject || !message || !rating || !feedback_type) {
      return NextResponse.json(
        { error: 'כל השדות המסומנים ב-* הם חובה' },
        { status: 400 }
      );
    }

    // Insert feedback into database
    const insertData = {
      name,
      email: email || null,
      subject,
      message,
      rating: parseInt(rating),
      feedback_type,
      image_url: image_url || null,
      user_id: userId
    };
    
    const { data, error } = await supabase
      .from('feedbacks')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // Return more detailed error message for debugging
      const errorMessage = error.message || 'שגיאה בשמירת הפידבק. נסה שוב.';
      return NextResponse.json(
        { error: errorMessage, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data, message: 'הפידבק נשלח בהצלחה!' },
      { status: 200 }
    );
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Feedback API error:', error);
    }
    return NextResponse.json(
      { error: 'שגיאה בלתי צפויה. נסה שוב מאוחר יותר.' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const cookieStore = cookies();
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    const body = await request.json();
    const { name, email, subject, message, rating, feedback_type, image_url } = body;

    // Validate required fields
    if (!subject || !message || !rating || !feedback_type) {
      return NextResponse.json(
        { error: 'שדות חובה חסרים: נושא, הודעה, דירוג וסוג פידבק' },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'דירוג חייב להיות בין 1 ל-5' },
        { status: 400 }
      );
    }

    // Insert feedback
    const { data, error } = await supabase
      .from('feedbacks')
      .insert({
        user_id: userId,
        name: name || null,
        email: email || null,
        subject,
        message,
        rating,
        feedback_type,
        image_url: image_url || null,
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting feedback:', error);
      return NextResponse.json(
        { error: 'שגיאה בשמירת הפידבק. נסה שוב.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data, message: 'הפידבק נשלח בהצלחה!' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'שגיאה בלתי צפויה. נסה שוב.' },
      { status: 500 }
    );
  }
}


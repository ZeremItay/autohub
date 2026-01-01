import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Get current user (may be null if not authenticated)
    const supabaseWithSession = createServerClient(cookieStore);
    const { data: { session } } = await supabaseWithSession.auth.getSession();
    const userId = session?.user?.id || null;
    
    // Use service role key to bypass RLS for insert operation
    // We validate the data in code, so it's safe to bypass RLS
    const supabase = createServerClient(); // This will use service role key if available

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
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'שגיאה בלתי צפויה. נסה שוב.' },
      { status: 500 }
    );
  }
}


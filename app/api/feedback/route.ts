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
    const { name, email, subject, message, rating, feedback_type, image_url } = body;

    // Validate required fields
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


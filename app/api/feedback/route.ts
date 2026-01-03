import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    
    // #region agent log
    const sessionCheck = await supabase.auth.getSession();
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/feedback/route.ts:8',message:'Feedback POST - session check',data:{hasSession:!!sessionCheck?.data?.session,hasUser:!!sessionCheck?.data?.session?.user,userId:sessionCheck?.data?.session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const userId = sessionCheck?.data?.session?.user?.id || null;
    
    const body = await request.json();
    const { name, email, subject, message, rating, feedback_type, image_url } = body;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/feedback/route.ts:15',message:'Feedback POST - received data',data:{hasName:!!name,hasSubject:!!subject,hasMessage:!!message,hasRating:!!rating,hasFeedbackType:!!feedback_type,hasImageUrl:!!image_url,hasEmail:!!email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Validate required fields
    if (!name || !subject || !message || !rating || !feedback_type) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/feedback/route.ts:22',message:'Feedback POST - validation failed',data:{name:!!name,subject:!!subject,message:!!message,rating:!!rating,feedback_type:!!feedback_type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/feedback/route.ts:35',message:'Feedback POST - attempting insert',data:{insertData:JSON.stringify(insertData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    const { data, error } = await supabase
      .from('feedbacks')
      .insert(insertData)
      .select()
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/feedback/route.ts:45',message:'Feedback POST - insert result',data:{hasData:!!data,hasError:!!error,errorMessage:error?.message,errorCode:error?.code,errorDetails:error?.details},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/feedback/route.ts:58',message:'Feedback POST - exception',data:{errorMessage:error?.message,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'שגיאה בלתי צפויה. נסה שוב מאוחר יותר.' },
      { status: 500 }
    );
  }
}


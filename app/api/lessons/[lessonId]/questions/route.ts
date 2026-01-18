import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { submitLessonQuestion, getLessonQuestions } from '@/lib/queries/lessons';
import { verifyLessonAccess } from '@/lib/utils/verify-lesson-access';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { lessonId } = await params;
    const { question } = await request.json();
    
    if (!question || question.trim() === '') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // SECURITY: Verify user has access to this lesson before allowing questions
    // Get course_id from lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select('course_id')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const accessResult = await verifyLessonAccess(lessonId, lesson.course_id, userId);
    if (!accessResult.hasAccess) {
      return NextResponse.json(
        { error: 'Access denied. You must be enrolled and have premium access for this lesson.' },
        { status: 403 }
      );
    }
    
    const result = await submitLessonQuestion(lessonId, userId, question);
    
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: result.data });
  } catch (error: any) {
    console.error('Error submitting question:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();
    
    const userId = session?.user?.id;
    const { lessonId } = await params;

    // SECURITY: Verify user has access to this lesson before showing questions
    if (userId) {
      // Get course_id from lesson
      const { data: lesson, error: lessonError } = await supabase
        .from('course_lessons')
        .select('course_id')
        .eq('id', lessonId)
        .maybeSingle();

      if (!lessonError && lesson) {
        const accessResult = await verifyLessonAccess(lessonId, lesson.course_id, userId);
        if (!accessResult.hasAccess) {
          // Return empty array instead of error for GET requests (less intrusive)
          return NextResponse.json({ data: [] });
        }
      }
    }
    
    const result = await getLessonQuestions(lessonId, userId);
    
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: result.data });
  } catch (error: any) {
    console.error('Error getting questions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

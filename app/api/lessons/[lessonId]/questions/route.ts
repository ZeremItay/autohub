import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { submitLessonQuestion, getLessonQuestions } from '@/lib/queries/lessons';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const supabase = createServerClient();
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
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const userId = session?.user?.id;
    const { lessonId } = await params;
    
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

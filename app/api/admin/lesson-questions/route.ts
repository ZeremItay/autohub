import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getAllPendingQuestions, getAllQuestions, answerLessonQuestion, addQAToLesson } from '@/lib/queries/lessons';
import { isAdmin } from '@/lib/utils/user';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role_id, roles:role_id (name)')
      .eq('user_id', userId)
      .maybeSingle();
    
    const userRole = (profile?.roles as any)?.[0]?.name || (profile?.roles as any)?.name;
    const userIsAdmin = userRole === 'admin';
    
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let result;
    if (status === 'pending') {
      result = await getAllPendingQuestions();
    } else {
      result = await getAllQuestions();
    }
    
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: result.data });
  } catch (error: any) {
    console.error('Error getting questions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role_id, roles:role_id (name)')
      .eq('user_id', userId)
      .maybeSingle();
    
    const userRole = (profile?.roles as any)?.[0]?.name || (profile?.roles as any)?.name;
    const userIsAdmin = userRole === 'admin';
    
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { questionId, answer, lessonId, question } = await request.json();
    
    if (!questionId || !answer || !lessonId || !question) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Answer the question
    const answerResult = await answerLessonQuestion(questionId, answer, userId);
    
    if (answerResult.error) {
      return NextResponse.json({ error: answerResult.error.message }, { status: 500 });
    }
    
    // Add Q&A to lesson's qa_section
    const addQAResult = await addQAToLesson(lessonId, question, answer);
    
    if (addQAResult.error) {
      console.error('Error adding Q&A to lesson:', addQAResult.error);
      // Don't fail the request if this fails, the question is already answered
    }
    
    return NextResponse.json({ data: answerResult.data });
  } catch (error: any) {
    console.error('Error answering question:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

import { createServerClient, getSupabaseClient } from '@/lib/supabase-server';
import { supabase } from '@/lib/supabase';

export interface LessonQuestion {
  id: string;
  lesson_id: string;
  user_id: string;
  question: string;
  answer?: string;
  answered_by?: string;
  answered_at?: string;
  status: 'pending' | 'answered';
  created_at: string;
  updated_at: string;
}

// Submit a question about a lesson
export async function submitLessonQuestion(lessonId: string, userId: string, question: string) {
  const supabaseClient = await getSupabaseClient();
  
  const { data, error } = await supabaseClient
    .from('lesson_questions')
    .insert({
      lesson_id: lessonId,
      user_id: userId,
      question: question,
      status: 'pending'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error submitting question:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

// Get questions for a lesson
// If userId is provided and user is not admin, returns only their questions
// If userId is not provided or user is admin, returns all questions
export async function getLessonQuestions(lessonId: string, userId?: string) {
  const supabaseClient = await getSupabaseClient();
  
  let query = supabaseClient
    .from('lesson_questions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });
  
  // If userId is provided, check if user is admin
  if (userId) {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role_id, roles:role_id (name)')
      .eq('user_id', userId)
      .maybeSingle();
    
    const userRole = (profile?.roles as any)?.[0]?.name || (profile?.roles as any)?.name;
    const isAdmin = userRole === 'admin';
    
    // If not admin, only show user's own questions
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error getting lesson questions:', error);
    return { data: [], error };
  }
  
  return { data: data || [], error: null };
}

// Answer a question
export async function answerLessonQuestion(
  questionId: string,
  answer: string,
  answeredBy: string,
  supabaseClient?: any
) {
  const client = supabaseClient || await getSupabaseClient();
  
  const { data, error } = await client
    .from('lesson_questions')
    .update({
      answer: answer,
      answered_by: answeredBy,
      answered_at: new Date().toISOString(),
      status: 'answered'
    })
    .eq('id', questionId)
    .select()
    .single();
  
  if (error) {
    console.error('Error answering question:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

// Add Q&A to lesson's qa_section
export async function addQAToLesson(lessonId: string, question: string, answer: string, supabaseClient?: any) {
  const client = supabaseClient || await getSupabaseClient();
  
  // Get current lesson
  const { data: lesson, error: lessonError } = await client
    .from('course_lessons')
    .select('qa_section')
    .eq('id', lessonId)
    .single();
  
  if (lessonError || !lesson) {
    console.error('Error getting lesson:', lessonError);
    return { data: null, error: lessonError };
  }
  
  // Get current qa_section or initialize as empty array
  const currentQASection = Array.isArray(lesson.qa_section) ? lesson.qa_section : [];
  
  // Add new Q&A item
  const newQAItem = {
    question: question,
    answer: answer
  };
  
  const updatedQASection = [...currentQASection, newQAItem];
  
  // Update lesson with new qa_section
  const { data, error } = await client
    .from('course_lessons')
    .update({
      qa_section: updatedQASection
    })
    .eq('id', lessonId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating lesson qa_section:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

// Get all pending questions (for admin)
export async function getAllPendingQuestions(supabaseClient?: any) {
  const client = supabaseClient || await getSupabaseClient();
  
  const { data, error } = await client
    .from('lesson_questions')
    .select(`
      *,
      lesson:course_lessons (
        id,
        title,
        course_id,
        course:courses (
          id,
          title
        )
      ),
      user:profiles!lesson_questions_user_id_fkey (
        user_id,
        full_name,
        email
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error getting pending questions:', error);
    return { data: [], error };
  }
  
  return { data: data || [], error: null };
}

// Get all questions (for admin)
export async function getAllQuestions(supabaseClient?: any) {
  const client = supabaseClient || await getSupabaseClient();
  
  const { data, error } = await client
    .from('lesson_questions')
    .select(`
      *,
      lesson:course_lessons (
        id,
        title,
        course_id,
        course:courses (
          id,
          title
        )
      ),
      user:profiles!lesson_questions_user_id_fkey (
        user_id,
        full_name,
        email
      ),
      answered_by_profile:profiles!lesson_questions_answered_by_fkey (
        user_id,
        full_name
      )
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error getting all questions:', error);
    return { data: [], error };
  }
  
  return { data: data || [], error: null };
}

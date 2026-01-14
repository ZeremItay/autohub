import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase-server';
import { getLessonById } from '@/lib/queries/courses';
import { isAdmin } from '@/lib/utils/user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/lessons/[lessonId]/route.ts:7',message:'API route called',data:{lessonId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/lessons/[lessonId]/route.ts:15',message:'No session found',data:{lessonId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
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
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/lessons/[lessonId]/route.ts:30',message:'User is not admin',data:{lessonId,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Load lesson from DB with server-side client
    console.log('🔍 API: Loading lesson from DB:', lessonId)
    const { data: lesson, error } = await getLessonById(lessonId, supabase);
    
    if (error) {
      console.error('❌ API: Error loading lesson:', error)
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/lessons/[lessonId]/route.ts:37',message:'Error loading lesson',data:{lessonId,error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!lesson) {
      console.error('❌ API: Lesson not found:', lessonId)
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/lessons/[lessonId]/route.ts:42',message:'Lesson not found',data:{lessonId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    
    console.log('✅ API: Lesson loaded successfully:', {
      lessonId: lesson.id,
      title: lesson.title,
      qa_section_type: typeof lesson.qa_section,
      qa_section_isArray: Array.isArray(lesson.qa_section),
      qa_section_length: Array.isArray(lesson.qa_section) ? lesson.qa_section.length : 'not array',
      qa_section: lesson.qa_section
    })
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/lessons/[lessonId]/route.ts:47',message:'Lesson loaded successfully',data:{lessonId,qa_section_length:Array.isArray(lesson.qa_section)?lesson.qa_section.length:'not array',qa_section:lesson.qa_section},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    return NextResponse.json({ data: lesson });
  } catch (error: any) {
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/admin/lessons/[lessonId]/route.ts:52',message:'Exception in API route',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

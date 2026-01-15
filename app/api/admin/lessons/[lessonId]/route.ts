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
    
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
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
    
    // Load lesson from DB with server-side client
    const { data: lesson, error } = await getLessonById(lessonId, supabase);
    
    if (error) {
      console.error('❌ API: Error loading lesson:', error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!lesson) {
      console.error('❌ API: Lesson not found:', lessonId)
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json({ data: lesson });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

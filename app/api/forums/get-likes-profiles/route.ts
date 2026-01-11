import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Use service role key to bypass RLS (no cookies = service role)
    const supabase = createServerClient();
    
    const body = await request.json();
    const { userIds } = body;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'get-likes-profiles/route.ts:10',message:'API route - received request',data:{userIdsCount:userIds?.length,userIds:userIds?.slice(0,3)},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'M'})}).catch(()=>{});
    // #endregion
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ data: [], error: null }, { status: 200 });
    }
    
    // Use server-side supabase with service role to bypass RLS
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, first_name, last_name, nickname')
      .in('user_id', userIds);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'get-likes-profiles/route.ts:25',message:'API route - query result',data:{dataCount:data?.length,hasError:!!error,errorMessage:error?.message,errorCode:error?.code,errorDetails:error,profiles:data?.map((p:any)=>({user_id:p.user_id,display_name:p.display_name}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'M'})}).catch(()=>{});
    // #endregion
    
    if (error) {
      console.error('Error fetching profiles for likes:', error);
      return NextResponse.json({ data: [], error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: data || [], error: null }, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/forums/get-likes-profiles:', error);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9376a829-ac6f-42e0-8775-b382510aa0ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'get-likes-profiles/route.ts:35',message:'API route - catch error',data:{errorMessage:error?.message,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'M'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ data: [], error: error.message }, { status: 500 });
  }
}

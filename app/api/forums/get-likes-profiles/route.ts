import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Use service role key to bypass RLS (no cookies = service role)
    const supabase = createServerClient();
    
    const body = await request.json();
    const { userIds } = body;
    
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ data: [], error: null }, { status: 200 });
    }
    
    // Use server-side supabase with service role to bypass RLS
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, first_name, last_name, nickname')
      .in('user_id', userIds);
    
    
    if (error) {
      console.error('Error fetching profiles for likes:', error);
      return NextResponse.json({ data: [], error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: data || [], error: null }, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/forums/get-likes-profiles:', error);
    return NextResponse.json({ data: [], error: error.message }, { status: 500 });
  }
}

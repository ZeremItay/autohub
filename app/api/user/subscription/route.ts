import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET - Get current user's active subscription
export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's active subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        roles:role_id (
          id,
          name,
          display_name,
          price,
          description
        ),
        previous_roles:previous_role_id (
          id,
          name,
          display_name
        )
      `)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError) {
      // If no subscription found, that's OK - user might not have one
      if (subscriptionError.code === 'PGRST116') {
        return NextResponse.json({ data: null });
      }
      console.error('Error fetching user subscription:', subscriptionError);
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }

    return NextResponse.json({ data: subscription });
  } catch (error: any) {
    console.error('Error fetching user subscription:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


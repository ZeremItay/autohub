import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET - Get payments for current user
export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get payments for current user with subscription data
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        subscriptions:subscription_id (
          id,
          role_id,
          status,
          start_date,
          end_date,
          roles:role_id (
            id,
            name,
            display_name,
            price
          )
        )
      `)
      .eq('user_id', session.user.id)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching user payments:', paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    return NextResponse.json({ data: payments || [] });
  } catch (error: any) {
    console.error('Error fetching user payments:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


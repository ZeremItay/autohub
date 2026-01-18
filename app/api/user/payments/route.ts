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
    // First, try to get payments with subscription join
    // If join fails due to RLS, we'll get payments without subscription data
    console.log(`[user/payments] Fetching payments for user: ${session.user.id}`);
    
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
      console.error('[user/payments] Error fetching user payments:', {
        error: paymentsError.message,
        code: paymentsError.code,
        details: paymentsError.details,
        hint: paymentsError.hint
      });
      
      // If error is due to RLS on subscriptions join, try without the join
      if (paymentsError.message?.includes('policy') || paymentsError.message?.includes('RLS') || paymentsError.code === '42501') {
        console.warn('[user/payments] RLS issue with subscriptions join, fetching payments without subscription data');
        const { data: paymentsWithoutJoin, error: paymentsError2 } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', session.user.id)
          .order('payment_date', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (paymentsError2) {
          console.error('[user/payments] Error fetching user payments (without join):', paymentsError2);
          return NextResponse.json({ error: paymentsError2.message }, { status: 500 });
        }
        
        console.log(`[user/payments] Found ${paymentsWithoutJoin?.length || 0} payments (without subscription data) for user ${session.user.id}`);
        return NextResponse.json({ data: paymentsWithoutJoin || [] });
      }
      
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    // If payments is null or empty, log for debugging
    if (!payments || payments.length === 0) {
      console.warn(`[user/payments] No payments found for user ${session.user.id}`);
      
      // Debug: Check if there are any payments for this user at all (bypass RLS check)
      // This helps identify if it's an RLS issue or if payments don't exist
      const { data: allPayments, error: debugError } = await supabase
        .from('payments')
        .select('id, user_id, amount, status')
        .eq('user_id', session.user.id)
        .limit(1);
      
      if (debugError) {
        console.error('[user/payments] Debug query error:', debugError);
      } else {
        console.log(`[user/payments] Debug: Found ${allPayments?.length || 0} payments in direct query (may be RLS issue)`);
      }
    } else {
      console.log(`[user/payments] Found ${payments.length} payments for user ${session.user.id}`);
    }

    return NextResponse.json({ data: payments || [] });
  } catch (error: any) {
    console.error('Error fetching user payments:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { extendSubscription } from '@/lib/queries/subscriptions';

// GET - Get all payments with subscription and user data (admin only)
export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = profile.roles || profile.role;
    const roleName = typeof role === 'object' ? role?.name : role;
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get all payments with subscription and user data
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        subscriptions:subscription_id (
          id,
          user_id,
          role_id,
          status,
          start_date,
          end_date,
          roles:role_id (
            id,
            name,
            display_name,
            price
          ),
          profiles:user_id (
            id,
            user_id,
            display_name,
            first_name,
            last_name,
            email
          )
        ),
        profiles:user_id (
          id,
          user_id,
          display_name,
          first_name,
          last_name,
          email
        )
      `)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    return NextResponse.json({ data: payments || [] });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new payment (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = profile.roles || profile.role;
    const roleName = typeof role === 'object' ? role?.name : role;
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { subscription_id, user_id, amount, currency, status, payment_method, payment_date, invoice_url, invoice_number, transaction_id } = body;

    if (!subscription_id || !user_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields: subscription_id, user_id, amount' }, { status: 400 });
    }

    // Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        subscription_id,
        user_id,
        amount: parseFloat(amount),
        currency: currency || 'ILS',
        status: status || 'pending',
        payment_method: payment_method || null,
        payment_date: payment_date || null,
        invoice_url: invoice_url || null,
        invoice_number: invoice_number || null,
        transaction_id: transaction_id || null
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // If payment is completed, activate subscription (if pending) and extend it
    if (status === 'completed') {
      // Get subscription to check its status
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('id, status, end_date')
        .eq('id', subscription_id)
        .single();

      if (!subError && subscription) {
        // Activate subscription if it's pending
        if (subscription.status === 'pending') {
          // Get role_id from subscription to update user's profile
          const { data: subData, error: subDataError } = await supabase
            .from('subscriptions')
            .select('role_id, user_id')
            .eq('id', subscription_id)
            .single();
          
          const { error: activateError } = await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('id', subscription_id);
          
          if (activateError) {
            console.error('Error activating subscription:', activateError);
            // Don't fail the request, just log the error
          } else {
            console.log(`Subscription ${subscription_id} activated`);
            
            // Update user's role_id to the subscription role when activated
            if (!subDataError && subData) {
              const { error: updateRoleError } = await supabase
                .from('profiles')
                .update({ role_id: subData.role_id })
                .eq('user_id', subData.user_id);
              
              if (updateRoleError) {
                console.error('Error updating user role:', updateRoleError);
                // Don't fail the request, just log the error
              } else {
                console.log(`User ${subData.user_id} role updated to ${subData.role_id}`);
              }
            }
          }
        }
        
        // Extend subscription if it's active or was just activated
        if (subscription.status === 'active' || subscription.status === 'pending') {
          const { data: extended, error: extendError } = await extendSubscription(subscription_id, 1);
          
          if (extendError) {
            console.error('Error extending subscription:', extendError);
            // Don't fail the request, just log the error
          } else {
            console.log(`Subscription ${subscription_id} extended by 1 month`);
          }
        }
      }
    }

    return NextResponse.json({ data: payment });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update payment (admin only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = profile.roles || profile.role;
    const roleName = typeof role === 'object' ? role?.name : role;
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    // Update payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // If payment status was updated to 'completed', activate subscription (if pending) and extend it
    if (updates.status === 'completed') {
      // Get subscription to check its status
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('id, status, end_date')
        .eq('id', payment.subscription_id)
        .single();

      if (!subError && subscription) {
        // Activate subscription if it's pending
        if (subscription.status === 'pending') {
          // Get role_id from subscription to update user's profile
          const { data: subData, error: subDataError } = await supabase
            .from('subscriptions')
            .select('role_id, user_id')
            .eq('id', payment.subscription_id)
            .single();
          
          const { error: activateError } = await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('id', subscription.id);
          
          if (activateError) {
            console.error('Error activating subscription:', activateError);
            // Don't fail the request, just log the error
          } else {
            console.log(`Subscription ${subscription.id} activated`);
            
            // Update user's role_id to the subscription role when activated
            if (!subDataError && subData) {
              const { error: updateRoleError } = await supabase
                .from('profiles')
                .update({ role_id: subData.role_id })
                .eq('user_id', subData.user_id);
              
              if (updateRoleError) {
                console.error('Error updating user role:', updateRoleError);
                // Don't fail the request, just log the error
              } else {
                console.log(`User ${subData.user_id} role updated to ${subData.role_id}`);
              }
            }
          }
        }
        
        // Extend subscription if it's active or was just activated
        if (subscription.status === 'active' || subscription.status === 'pending') {
          const { data: extended, error: extendError } = await extendSubscription(subscription.id, 1);
          
          if (extendError) {
            console.error('Error extending subscription:', extendError);
            // Don't fail the request, just log the error
          } else {
            console.log(`Subscription ${subscription.id} extended by 1 month`);
          }
        }
      }
    }

    return NextResponse.json({ data: payment });
  } catch (error: any) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete payment (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Check authorization - get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        roles:role_id (
          id,
          name,
          display_name,
          description
        )
      `)
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = profile.roles || profile.role;
    const roleName = typeof role === 'object' ? role?.name : role;
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    // Delete payment
    const { error: paymentError } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (paymentError) {
      console.error('Error deleting payment:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


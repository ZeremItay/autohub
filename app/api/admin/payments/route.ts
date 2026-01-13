import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { extendSubscription } from '@/lib/queries/subscriptions';

// GET - Get all payments with subscription and user data (admin only)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    
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
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    
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

    if (!subscription_id) {
      return NextResponse.json({ error: 'Missing required field: subscription_id' }, { status: 400 });
    }
    
    // Allow amount to be 0 for free month - check if amount is provided (even if 0)
    if (amount === undefined || amount === null || amount === '') {
      return NextResponse.json({ error: 'Missing required field: amount' }, { status: 400 });
    }
    
    const paymentAmount = parseFloat(amount.toString());
    if (isNaN(paymentAmount)) {
      return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
    }

    // Get user_id from subscription if not provided
    let finalUserId = user_id;
    if (!finalUserId) {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('id', subscription_id)
        .single();

      if (subError || !subscription || !subscription.user_id) {
        return NextResponse.json({ error: 'Subscription not found or missing user_id' }, { status: 404 });
      }

      finalUserId = subscription.user_id;
    }

    // Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        subscription_id,
        user_id: finalUserId,
        amount: paymentAmount,
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
        // Get role_id and user_id from subscription to update user's profile
        const { data: subData, error: subDataError } = await supabase
          .from('subscriptions')
          .select('role_id, user_id')
          .eq('id', subscription_id)
          .single();
        
        // Activate subscription if it's pending
        if (subscription.status === 'pending') {
          const { error: activateError } = await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('id', subscription_id);
          
          if (activateError) {
            console.error('Error activating subscription:', activateError);
            // Don't fail the request, just log the error
          } else {
            console.log(`Subscription ${subscription_id} activated`);
          }
        }
        
        // Always update user's role_id to the subscription role when payment is completed
        // This ensures the user gets the correct role even if subscription was already active
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
        
        // Check if this is the first payment for this subscription
        // Only extend subscription if there are previous completed payments (recurring payment)
        // If this is the first payment, don't extend - subscription was already created with correct end_date
        const { data: previousPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('id')
          .eq('subscription_id', subscription_id)
          .eq('status', 'completed')
          .neq('id', payment.id) // Exclude current payment
          .limit(1);

        // Only extend if there are previous payments (this is a recurring payment)
        if (subscription.status === 'active' || subscription.status === 'pending') {
          if (previousPayments && previousPayments.length > 0) {
            // This is a recurring payment - extend subscription
            const { data: extended, error: extendError } = await extendSubscription(subscription_id, 1);
            
            if (extendError) {
              console.error('Error extending subscription:', extendError);
              // Don't fail the request, just log the error
            } else {
              console.log(`Subscription ${subscription_id} extended by 1 month (recurring payment)`);
            }
          } else {
            // This is the first payment - subscription already created with correct end_date, don't extend
            console.log(`First payment for subscription ${subscription_id} - not extending (subscription already created with correct end_date)`);
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
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    
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

    // Get existing payment to check if it was already completed
    const { data: existingPayment, error: getExistingError } = await supabase
      .from('payments')
      .select('status, subscription_id')
      .eq('id', id)
      .single();

    if (getExistingError || !existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const wasAlreadyCompleted = existingPayment.status === 'completed';
    const isNowCompleted = updates.status === 'completed';
    const isStatusChangeToCompleted = !wasAlreadyCompleted && isNowCompleted;

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
    if (isStatusChangeToCompleted) {
      // Get subscription to check its status
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('id, status, end_date')
        .eq('id', payment.subscription_id)
        .single();

      if (!subError && subscription) {
        // Get role_id and user_id from subscription to update user's profile
        const { data: subData, error: subDataError } = await supabase
          .from('subscriptions')
          .select('role_id, user_id')
          .eq('id', payment.subscription_id)
          .single();
        
        // Activate subscription if it's pending
        if (subscription.status === 'pending') {
          const { error: activateError } = await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('id', subscription.id);
          
          if (activateError) {
            console.error('Error activating subscription:', activateError);
            // Don't fail the request, just log the error
          } else {
            console.log(`Subscription ${subscription.id} activated`);
          }
        }
        
        // Always update user's role_id to the subscription role when payment is completed
        // This ensures the user gets the correct role even if subscription was already active
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
        
        // Check if this is the first payment for this subscription
        // Only extend subscription if there are previous completed payments (recurring payment)
        // If this is the first payment, don't extend - subscription was already created with correct end_date
        const { data: previousPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('id')
          .eq('subscription_id', payment.subscription_id)
          .eq('status', 'completed')
          .neq('id', payment.id) // Exclude current payment
          .limit(1);

        // Only extend if there are previous payments (this is a recurring payment)
        if (subscription.status === 'active' || subscription.status === 'pending') {
          if (previousPayments && previousPayments.length > 0) {
            // This is a recurring payment - extend subscription
            const { data: extended, error: extendError } = await extendSubscription(subscription.id, 1);
            
            if (extendError) {
              console.error('Error extending subscription:', extendError);
              // Don't fail the request, just log the error
            } else {
              console.log(`Subscription ${subscription.id} extended by 1 month (recurring payment)`);
            }
          } else {
            // This is the first payment - subscription already created with correct end_date, don't extend
            console.log(`First payment for subscription ${subscription.id} - not extending (subscription already created with correct end_date)`);
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
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    
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

    // Get payment to check subscription_id and user_id before deleting
    const { data: payment, error: getPaymentError } = await supabase
      .from('payments')
      .select('subscription_id, user_id')
      .eq('id', id)
      .single();

    if (getPaymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const subscriptionId = payment.subscription_id;
    const userId = payment.user_id;

    // Delete payment
    const { error: paymentError } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (paymentError) {
      console.error('Error deleting payment:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // Check if there are any other completed payments for this subscription
    const { data: remainingPayments, error: paymentsCheckError } = await supabase
      .from('payments')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('status', 'completed')
      .limit(1);

    // If no completed payments remain, set subscription to pending and restore user's role to free
    if (!paymentsCheckError && (!remainingPayments || remainingPayments.length === 0)) {
      // Get subscription to get role_id
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('role_id')
        .eq('id', subscriptionId)
        .single();

      if (!subError && subscription) {
        // Update subscription status to pending
        const { error: updateSubError } = await supabase
          .from('subscriptions')
          .update({ status: 'pending' })
          .eq('id', subscriptionId);

        if (updateSubError) {
          console.error('Error updating subscription status:', updateSubError);
          // Don't fail the request, just log
        } else {
          console.log(`Subscription ${subscriptionId} set to pending (no payments)`);
        }

        // Get free role ID
        const { data: freeRole, error: freeRoleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'free')
          .single();

        if (!freeRoleError && freeRole) {
          // Restore user's role to free
          const { error: updateRoleError } = await supabase
            .from('profiles')
            .update({ role_id: freeRole.id })
            .eq('user_id', userId);

          if (updateRoleError) {
            console.error('Error restoring user role:', updateRoleError);
            // Don't fail the request, just log
          } else {
            console.log(`User ${userId} role restored to free`);
          }
        }
      }
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


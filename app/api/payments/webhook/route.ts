import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { extendSubscription } from '@/lib/queries/subscriptions';

// Webhook endpoint for external payment systems to update payments
// This endpoint can be called by external APIs to notify about payment status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      subscription_id, 
      payment_status, 
      amount, 
      currency,
      payment_date, 
      payment_method,
      transaction_id,
      invoice_url,
      invoice_number
    } = body;

    // Validate required fields
    if (!subscription_id || !payment_status || !amount) {
      return NextResponse.json({ 
        error: 'Missing required fields: subscription_id, payment_status, amount' 
      }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get subscription to verify it exists
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, status, end_date, user_id')
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) {
      console.error('Error fetching subscription:', subError);
      return NextResponse.json({ 
        error: 'Subscription not found' 
      }, { status: 404 });
    }

    // Check if payment already exists (by transaction_id if provided)
    let existingPayment = null;
    if (transaction_id) {
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('transaction_id', transaction_id)
        .eq('subscription_id', subscription_id)
        .single();
      
      existingPayment = existing;
    }

    // Create or update payment
    let payment;
    if (existingPayment) {
      // Update existing payment
      const { data: updated, error: updateError } = await supabase
        .from('payments')
        .update({
          status: payment_status,
          amount: parseFloat(amount),
          currency: currency || 'ILS',
          payment_date: payment_date || new Date().toISOString(),
          payment_method: payment_method || null,
          invoice_url: invoice_url || null,
          invoice_number: invoice_number || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPayment.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating payment:', updateError);
        return NextResponse.json({ 
          error: updateError.message 
        }, { status: 500 });
      }

      payment = updated;
    } else {
      // Get user_id from subscription if not provided
      let userId = subscription.user_id;
      if (!userId) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('id', subscription_id)
          .single();
        userId = subData?.user_id || null;
      }

      // Create new payment
      const { data: created, error: createError } = await supabase
        .from('payments')
        .insert({
          subscription_id,
          user_id: userId,
          amount: parseFloat(amount),
          currency: currency || 'ILS',
          status: payment_status,
          payment_date: payment_date || new Date().toISOString(),
          payment_method: payment_method || null,
          transaction_id: transaction_id || null,
          invoice_url: invoice_url || null,
          invoice_number: invoice_number || null
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating payment:', createError);
        return NextResponse.json({ 
          error: createError.message 
        }, { status: 500 });
      }

      payment = created;
    }

    // If payment is completed, activate subscription (if pending) and extend it
    if (payment_status === 'completed') {
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

    return NextResponse.json({ 
      data: payment,
      message: 'Payment processed successfully' 
    });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}


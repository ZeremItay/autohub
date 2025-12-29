import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { checkExpiredSubscriptions, hasRecentPayment, cancelSubscriptionAndRestoreRole } from '@/lib/queries/subscriptions';

// Check subscriptions that have expired and cancel them if no payment
// Can be called by cron job or manually
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get days after warning from query param (default: 3)
    const { searchParams } = new URL(request.url);
    const daysAfterWarning = parseInt(searchParams.get('days_after_warning') || '3');
    const gracePeriodDays = parseInt(searchParams.get('grace_days') || '2');

    // Get subscriptions that need to be downgraded (end_date passed + 5 days total)
    const { data: expiredSubscriptions, error: subsError } = await checkExpiredSubscriptions(daysAfterWarning, gracePeriodDays);

    if (subsError) {
      console.error('Error fetching expired subscriptions:', subsError);
      return NextResponse.json({ error: subsError.message }, { status: 500 });
    }

    const results = [];

    // Process each expired subscription
    for (const subscription of expiredSubscriptions || []) {
      // Check if there's a payment in the last 7 days
      const { hasPayment, error: paymentError } = await hasRecentPayment(subscription.id, 7);

      if (paymentError) {
        console.error(`Error checking payment for subscription ${subscription.id}:`, paymentError);
        continue;
      }

      if (!hasPayment) {
        // Cancel subscription and restore role
        const { error: cancelError } = await cancelSubscriptionAndRestoreRole(subscription.id);

        if (cancelError) {
          console.error(`Error canceling subscription ${subscription.id}:`, cancelError);
          results.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            status: 'error',
            error: cancelError.message
          });
        } else {
          // Create notification for user
          const notificationData = {
            user_id: subscription.user_id,
            type: 'subscription_expired',
            title: 'המנוי שלך פג',
            message: 'המנוי שלך פג עקב חוסר תשלום. הוחזרת למנוי הקודם שלך.',
            link: '/subscription',
            is_read: false
          };

          await supabase
            .from('notifications')
            .insert(notificationData);

          results.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            status: 'cancelled',
            role_restored: true
          });
        }
      } else {
        // Payment was made, extend subscription
        const { data: extended, error: extendError } = await supabase
          .from('subscriptions')
          .update({
            end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
            warning_sent: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
          .select()
          .single();

        if (extendError) {
          console.error(`Error extending subscription ${subscription.id}:`, extendError);
        } else {
          results.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            status: 'extended',
            new_end_date: extended.end_date
          });
        }
      }
    }

    return NextResponse.json({ 
      data: {
        checked: expiredSubscriptions?.length || 0,
        processed: results.length,
        results
      }
    });
  } catch (error: any) {
    console.error('Error checking expired subscriptions:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}


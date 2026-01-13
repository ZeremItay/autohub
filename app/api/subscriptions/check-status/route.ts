import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { checkExpiringSubscriptions, checkExpiredSubscriptions, hasRecentPayment, cancelSubscriptionAndRestoreRole } from '@/lib/queries/subscriptions';

// Combined endpoint to check both expiring and expired subscriptions
// Can be called by cron job or manually
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    
    // Get parameters
    const gracePeriodDays = parseInt(searchParams.get('grace_days') || '2');
    const daysAfterWarning = parseInt(searchParams.get('days_after_warning') || '3');

    const results = {
      expiring: {
        checked: 0,
        warnings_sent: 0,
        results: [] as any[]
      },
      expired: {
        checked: 0,
        processed: 0,
        results: [] as any[]
      }
    };

    // 1. Check expiring subscriptions (send warnings)
    const { data: expiringSubscriptions, error: subsError } = await checkExpiringSubscriptions(gracePeriodDays);

    if (subsError) {
      console.error('Error fetching expiring subscriptions:', subsError);
    } else {
      results.expiring.checked = expiringSubscriptions?.length || 0;

      for (const subscription of expiringSubscriptions || []) {
        const { hasPayment, error: paymentError } = await hasRecentPayment(subscription.id, 30);

        if (paymentError) {
          console.error(`Error checking payment for subscription ${subscription.id}:`, paymentError);
          continue;
        }

        if (!hasPayment && !subscription.warning_sent) {
          const notificationData = {
            user_id: subscription.user_id,
            type: 'subscription_expiring',
            title: 'המנוי שלך עומד לרדת',
            message: `המנוי שלך פג ב-${new Date(subscription.end_date).toLocaleDateString('he-IL')} ולא התקבל תשלום. אם לא יתקבל תשלום תוך 3 ימים, המנוי ירד למנוי הקודם שלך.`,
            link: '/subscription',
            is_read: false
          };

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notificationData);

          if (!notifError) {
            await supabase
              .from('subscriptions')
              .update({ warning_sent: true })
              .eq('id', subscription.id);

            results.expiring.warnings_sent++;
            results.expiring.results.push({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              warning_sent: true
            });
          }
        } else if (hasPayment && subscription.warning_sent) {
          await supabase
            .from('subscriptions')
            .update({ warning_sent: false })
            .eq('id', subscription.id);
        }
      }
    }

    // 2. Check expired subscriptions (cancel if no payment)
    const { data: expiredSubscriptions, error: expiredError } = await checkExpiredSubscriptions(daysAfterWarning, gracePeriodDays);

    if (expiredError) {
      console.error('Error fetching expired subscriptions:', expiredError);
    } else {
      results.expired.checked = expiredSubscriptions?.length || 0;

      for (const subscription of expiredSubscriptions || []) {
        const { hasPayment, error: paymentError } = await hasRecentPayment(subscription.id, 7);

        if (paymentError) {
          console.error(`Error checking payment for subscription ${subscription.id}:`, paymentError);
          continue;
        }

        if (!hasPayment) {
          const { error: cancelError } = await cancelSubscriptionAndRestoreRole(subscription.id);

          if (cancelError) {
            console.error(`Error canceling subscription ${subscription.id}:`, cancelError);
            results.expired.results.push({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              status: 'error',
              error: cancelError.message
            });
          } else {
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

            results.expired.processed++;
            results.expired.results.push({
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

          if (!extendError) {
            results.expired.processed++;
            results.expired.results.push({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              status: 'extended',
              new_end_date: extended.end_date
            });
          }
        }
      }
    }

    return NextResponse.json({ 
      data: results
    });
  } catch (error: any) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

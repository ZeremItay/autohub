import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { checkExpiringSubscriptions, hasRecentPayment } from '@/lib/queries/subscriptions';

// Check subscriptions that are expiring soon and send warnings if needed
// Can be called by cron job or manually
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get grace period days from query param (default: 2)
    const { searchParams } = new URL(request.url);
    const gracePeriodDays = parseInt(searchParams.get('grace_days') || '2');

    // Get subscriptions that need warning (end_date passed + gracePeriodDays days)
    const { data: expiringSubscriptions, error: subsError } = await checkExpiringSubscriptions(gracePeriodDays);

    if (subsError) {
      console.error('Error fetching expiring subscriptions:', subsError);
      return NextResponse.json({ error: subsError.message }, { status: 500 });
    }

    const results = [];

    // Check each subscription
    for (const subscription of expiringSubscriptions || []) {
      // Check if there's a recent payment
      const { hasPayment, error: paymentError } = await hasRecentPayment(subscription.id, 30);

      if (paymentError) {
        console.error(`Error checking payment for subscription ${subscription.id}:`, paymentError);
        continue;
      }

      // If no payment and warning not sent, create notification
      if (!hasPayment && !subscription.warning_sent) {
        // Create notification for user
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

        if (notifError) {
          console.error(`Error creating notification for subscription ${subscription.id}:`, notifError);
        } else {
          // Mark warning as sent
          await supabase
            .from('subscriptions')
            .update({ warning_sent: true })
            .eq('id', subscription.id);

          results.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            warning_sent: true
          });
        }
      } else if (hasPayment) {
        // Reset warning if payment was made
        if (subscription.warning_sent) {
          await supabase
            .from('subscriptions')
            .update({ warning_sent: false })
            .eq('id', subscription.id);
        }
      }
    }

    return NextResponse.json({ 
      data: {
        checked: expiringSubscriptions?.length || 0,
        warnings_sent: results.length,
        results
      }
    });
  } catch (error: any) {
    console.error('Error checking expiring subscriptions:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}


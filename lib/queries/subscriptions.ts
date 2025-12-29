import { supabase } from '../supabase'
import { logError, isNotFoundError } from '../utils/errorHandler'
import { updateProfile } from './profiles'

export interface Subscription {
  id: string
  user_id: string
  role_id: string
  previous_role_id?: string
  status: 'active' | 'cancelled' | 'expired' | 'pending'
  start_date: string
  end_date?: string
  auto_renew: boolean
  warning_sent?: boolean
  created_at?: string
  updated_at?: string
}

// Extend subscription by adding months to end_date
export async function extendSubscription(subscriptionId: string, months: number = 1) {
  try {
    // Get current subscription
    const { data: subscription, error: getError } = await supabase
      .from('subscriptions')
      .select('end_date')
      .eq('id', subscriptionId)
      .single()

    if (getError || !subscription) {
      logError(getError, 'extendSubscription:get');
      return { data: null, error: getError || new Error('Subscription not found') }
    }

    // Calculate new end_date
    const currentEndDate = subscription.end_date ? new Date(subscription.end_date) : new Date()
    const newEndDate = new Date(currentEndDate)
    newEndDate.setMonth(newEndDate.getMonth() + months)

    // Update subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        end_date: newEndDate.toISOString(),
        warning_sent: false, // Reset warning when subscription is extended
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (error) {
      logError(error, 'extendSubscription:update');
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err: any) {
    logError(err, 'extendSubscription:exception');
    return { data: null, error: err }
  }
}

// Get subscriptions that need warning (end_date passed + 2 days, no payment)
export async function checkExpiringSubscriptions(gracePeriodDays: number = 2) {
  try {
    const today = new Date()
    // Calculate the cutoff date: end_date should have passed by at least gracePeriodDays days
    const cutoffDate = new Date(today)
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays)

    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles:user_id (
          id,
          user_id,
          display_name,
          email
        ),
        roles:role_id (
          id,
          name,
          display_name,
          price
        )
      `)
      .eq('status', 'active')
      .lte('end_date', cutoffDate.toISOString()) // end_date passed at least gracePeriodDays days ago
      .order('end_date', { ascending: true })

    if (error) {
      logError(error, 'checkExpiringSubscriptions');
      return { data: null, error }
    }

    return { data: data || [], error: null }
  } catch (err: any) {
    logError(err, 'checkExpiringSubscriptions:exception');
    return { data: null, error: err }
  }
}

// Get subscriptions that need to be downgraded (end_date passed + 5 days total: 2 grace + 3 after warning)
export async function checkExpiredSubscriptions(daysAfterWarning: number = 3, gracePeriodDays: number = 2) {
  try {
    const today = new Date()
    // Calculate cutoff: end_date should have passed by at least (gracePeriodDays + daysAfterWarning) days
    const totalDays = gracePeriodDays + daysAfterWarning
    const cutoffDate = new Date(today)
    cutoffDate.setDate(cutoffDate.getDate() - totalDays)

    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles:user_id (
          id,
          user_id,
          display_name,
          email
        ),
        roles:role_id (
          id,
          name,
          display_name
        )
      `)
      .eq('status', 'active')
      .lte('end_date', cutoffDate.toISOString()) // end_date passed at least totalDays ago
      .order('end_date', { ascending: true })

    if (error) {
      logError(error, 'checkExpiredSubscriptions');
      return { data: null, error }
    }

    return { data: data || [], error: null }
  } catch (err: any) {
    logError(err, 'checkExpiredSubscriptions:exception');
    return { data: null, error: err }
  }
}

// Check if subscription has payment in the last X days
export async function hasRecentPayment(subscriptionId: string, days: number = 30) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('status', 'completed')
      .gte('payment_date', cutoffDate.toISOString())
      .limit(1)

    if (error) {
      // If table doesn't exist or other error, assume no payment
      if (isNotFoundError(error)) {
        return { hasPayment: false, error: null }
      }
      logError(error, 'hasRecentPayment');
      return { hasPayment: false, error }
    }

    return { hasPayment: (data && data.length > 0), error: null }
  } catch (err: any) {
    logError(err, 'hasRecentPayment:exception');
    return { hasPayment: false, error: err }
  }
}

// Cancel subscription and restore user's previous role
export async function cancelSubscriptionAndRestoreRole(subscriptionId: string) {
  try {
    // Get subscription with previous_role_id
    const { data: subscription, error: getError } = await supabase
      .from('subscriptions')
      .select('user_id, previous_role_id, role_id')
      .eq('id', subscriptionId)
      .single()

    if (getError || !subscription) {
      logError(getError, 'cancelSubscriptionAndRestoreRole:get');
      return { error: getError || new Error('Subscription not found') }
    }

    // Determine which role to restore
    let roleToRestore: string | null = subscription.previous_role_id || null

    // If no previous_role_id, get 'free' role
    if (!roleToRestore) {
      const { data: freeRole, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'free')
        .single()

      if (roleError || !freeRole) {
        logError(roleError, 'cancelSubscriptionAndRestoreRole:getFreeRole');
        return { error: roleError || new Error('Free role not found') }
      }

      roleToRestore = freeRole.id
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (updateError) {
      logError(updateError, 'cancelSubscriptionAndRestoreRole:update');
      return { error: updateError }
    }

    // Restore user's role
    const { error: profileError } = await updateProfile(subscription.user_id, {
      role_id: roleToRestore
    })

    if (profileError) {
      logError(profileError, 'cancelSubscriptionAndRestoreRole:restoreRole');
      return { error: profileError }
    }

    return { error: null }
  } catch (err: any) {
    logError(err, 'cancelSubscriptionAndRestoreRole:exception');
    return { error: err }
  }
}

// Get subscription by ID with related data
export async function getSubscriptionById(subscriptionId: string) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles:user_id (
          id,
          user_id,
          display_name,
          email
        ),
        roles:role_id (
          id,
          name,
          display_name,
          price
        ),
        previous_roles:previous_role_id (
          id,
          name,
          display_name
        )
      `)
      .eq('id', subscriptionId)
      .single()

    if (error) {
      if (!isNotFoundError(error)) {
        logError(error, 'getSubscriptionById');
      }
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err: any) {
    logError(err, 'getSubscriptionById:exception');
    return { data: null, error: err }
  }
}


import { supabase } from '../supabase'
import { logError, isNotFoundError } from '../utils/errorHandler'

export interface Payment {
  id: string
  subscription_id: string
  user_id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_method?: string
  payment_date?: string
  invoice_url?: string
  invoice_number?: string
  transaction_id?: string
  created_at?: string
  updated_at?: string
}

// Get all payments (admin only)
export async function getAllPayments() {
  try {
    const { data, error } = await supabase
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
      .order('created_at', { ascending: false })
    
    if (error) {
      logError(error, 'getAllPayments');
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err: any) {
    logError(err, 'getAllPayments:exception');
    return { data: null, error: err }
  }
}

// Get payments by subscription ID
export async function getPaymentsBySubscriptionId(subscriptionId: string) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (error) {
      logError(error, 'getPaymentsBySubscriptionId');
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err: any) {
    logError(err, 'getPaymentsBySubscriptionId:exception');
    return { data: null, error: err }
  }
}

// Get payments by user ID
export async function getPaymentsByUserId(userId: string) {
  try {
    const { data, error } = await supabase
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
      .eq('user_id', userId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (error) {
      logError(error, 'getPaymentsByUserId');
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err: any) {
    logError(err, 'getPaymentsByUserId:exception');
    return { data: null, error: err }
  }
}

// Create payment
export async function createPayment(paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const insertData = {
      ...paymentData,
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('payments')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      logError(error, 'createPayment');
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err: any) {
    logError(err, 'createPayment:exception');
    return { data: null, error: err }
  }
}

// Update payment
export async function updatePayment(paymentId: string, updates: Partial<Payment>) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single()
    
    if (error) {
      if (!isNotFoundError(error)) {
        logError(error, 'updatePayment');
      }
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err: any) {
    logError(err, 'updatePayment:exception');
    return { data: null, error: err }
  }
}

// Delete payment
export async function deletePayment(paymentId: string) {
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)
    
    if (error) {
      if (!isNotFoundError(error)) {
        logError(error, 'deletePayment');
      }
      return { error }
    }
    
    return { error: null }
  } catch (err: any) {
    logError(err, 'deletePayment:exception');
    return { error: err }
  }
}


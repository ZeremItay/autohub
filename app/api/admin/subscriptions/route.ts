import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// GET - Get all subscriptions with user and role data (admin only)
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

    // Get all subscriptions with user and role data
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles:user_id (
          id,
          user_id,
          display_name,
          first_name,
          last_name,
          email
        ),
        roles:role_id (
          id,
          name,
          display_name,
          price
        )
      `)
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      return NextResponse.json({ error: subscriptionsError.message }, { status: 500 });
    }

    // Get payments for each subscription
    const subscriptionsWithPayments = await Promise.all(
      (subscriptions || []).map(async (subscription) => {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('subscription_id', subscription.id)
          .order('payment_date', { ascending: false });

        return {
          ...subscription,
          payments: payments || []
        };
      })
    );

    return NextResponse.json({ data: subscriptionsWithPayments });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new subscription (admin only)
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
    const { data: adminProfile, error: adminProfileError } = await supabase
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

    if (adminProfileError || !adminProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = adminProfile.roles || adminProfile.role;
    const roleName = typeof role === 'object' ? role?.name : role;
    
    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, role_id, status, start_date, end_date, auto_renew } = body;

    if (!user_id || !role_id || !start_date) {
      return NextResponse.json({ error: 'Missing required fields: user_id, role_id, start_date' }, { status: 400 });
    }

    // Validate that role_id is not 'free' or 'admin' - subscriptions are only for paid roles
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('name, price')
      .eq('id', role_id)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json({ error: 'Invalid role_id' }, { status: 400 });
    }

    if (roleData.name === 'free') {
      return NextResponse.json({ 
        error: 'Cannot create subscription for free role. Free users should only have role_id set in profiles.' 
      }, { status: 400 });
    }

    if (roleData.name === 'admin') {
      return NextResponse.json({ 
        error: 'Cannot create subscription for admin role. Admin role is managed separately.' 
      }, { status: 400 });
    }

    if (!roleData.price || roleData.price <= 0) {
      return NextResponse.json({ 
        error: 'Cannot create subscription for role without price. Only paid roles can have subscriptions.' 
      }, { status: 400 });
    }

    // Verify user exists
    const { data: userProfile, error: userProfileError } = await supabase
      .from('profiles')
      .select('role_id')
      .eq('user_id', user_id)
      .single();

    if (userProfileError) {
      console.error('Error fetching user profile:', userProfileError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate end_date if not provided (default: 1 month from start_date)
    let calculatedEndDate = end_date;
    if (!calculatedEndDate) {
      const startDateObj = new Date(start_date);
      startDateObj.setMonth(startDateObj.getMonth() + 1);
      calculatedEndDate = startDateObj.toISOString();
    }

    // Create subscription with 'pending' status if no payment is provided
    // Status will be updated to 'active' when a payment is associated via webhook
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id,
        role_id,
        status: 'pending', // Always start as pending - will be activated when payment is added
        start_date,
        end_date: calculatedEndDate,
        auto_renew: auto_renew !== false
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }

    // Update user's role_id to the new subscription role
    const { error: updateRoleError } = await supabase
      .from('profiles')
      .update({ role_id })
      .eq('user_id', user_id);

    if (updateRoleError) {
      console.error('Error updating user role:', updateRoleError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({ data: subscription });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

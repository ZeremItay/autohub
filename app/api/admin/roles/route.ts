import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET - Get all roles (admin only)
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

    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });

    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    return NextResponse.json({ data: roles });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update role (admin only)
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
    const { id, price, display_name, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Update role
    const updates: any = {};
    if (price !== undefined) updates.price = price;
    if (display_name !== undefined) updates.display_name = display_name;
    if (description !== undefined) updates.description = description;

    const { data: updatedRole, error: updateError } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ data: updatedRole });
  } catch (error: any) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

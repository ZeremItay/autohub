import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// Helper function to check admin authorization
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
  const validApiKey = process.env.ADMIN_API_KEY || process.env.API_KEY

  if (apiKey && validApiKey && apiKey === validApiKey) {
    return true
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (!sessionError && session) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('*, roles:role_id (id, name)')
        .eq('user_id', session.user.id)
        .single()

      const role = adminProfile?.roles || adminProfile?.role
      const roleName = typeof role === 'object' ? role?.name : role

      if (roleName === 'admin') {
        return true
      }
    }
  } catch (error) {
    // Session check failed
  }

  return false
}

// This route creates test users using Supabase Admin API
// Requires SUPABASE_SERVICE_ROLE_KEY in environment variables
export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await checkAdminAuth(request)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.' },
        { status: 500 }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First, ensure roles exist
    let freeRoleId: string | undefined;
    let premiumRoleId: string | undefined;

    // Try to get existing roles
    const { data: existingRoles } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .in('name', ['free', 'premium']);

    if (existingRoles) {
      freeRoleId = existingRoles.find(r => r.name === 'free')?.id;
      premiumRoleId = existingRoles.find(r => r.name === 'premium')?.id;
    }

    // If roles don't exist, create them
    if (!freeRoleId || !premiumRoleId) {
      const { data: newRoles, error: createRolesError } = await supabaseAdmin
        .from('roles')
        .upsert([
          { name: 'free', display_name: 'מנוי חינמי', description: 'מנוי חינמי - גישה בסיסית' },
          { name: 'premium', display_name: 'מנוי פרימיום', description: 'מנוי פרימיום - גישה מלאה' },
          { name: 'admin', display_name: 'מנהל', description: 'מנהל מערכת - גישה מלאה וניהול' }
        ], { onConflict: 'name' })
        .select();

      if (createRolesError) {
        return NextResponse.json(
          { error: `Failed to create roles: ${createRolesError.message}` },
          { status: 500 }
        );
      }

      if (newRoles) {
        freeRoleId = newRoles.find(r => r.name === 'free')?.id;
        premiumRoleId = newRoles.find(r => r.name === 'premium')?.id;
      }
    }

    if (!freeRoleId || !premiumRoleId) {
      return NextResponse.json(
        { error: 'Failed to get role IDs' },
        { status: 500 }
      );
    }

    // Create users using Admin API
    const users = [
      {
        email: 'yossi.cohen@example.com',
        password: 'Test123456!',
        email_confirm: true,
        user_metadata: {
          display_name: 'יוסי כהן',
          nickname: 'יוסי'
        }
      },
      {
        email: 'sara.levi@example.com',
        password: 'Test123456!',
        email_confirm: true,
        user_metadata: {
          display_name: 'שרה לוי',
          nickname: 'שרה'
        }
      }
    ];

    const createdUsers = [];
    const errors = [];

    for (const userData of users) {
      try {
        // Check if user already exists by listing users and filtering by email
        const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        let userId: string | undefined;
        
        if (listError) {
          errors.push({ email: userData.email, error: `Error checking users: ${listError.message}` });
          continue;
        }
        
        // Find user by email
        const existingUser = usersList?.users?.find(u => u.email === userData.email);
        
        if (existingUser) {
          // User exists, use existing ID
          userId = existingUser.id;
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: userData.email_confirm,
            user_metadata: userData.user_metadata
          });

          if (createError) {
            errors.push({ email: userData.email, error: `Failed to create user: ${createError.message}` });
            continue;
          }

          if (!newUser?.user) {
            errors.push({ email: userData.email, error: 'Failed to create user: No user returned' });
            continue;
          }

          userId = newUser.user.id;
        }

        // Determine role based on email
        const roleId = userData.email.includes('sara') ? premiumRoleId : freeRoleId;
        const points = userData.email.includes('sara') ? 500 : 100;

        if (!roleId) {
          errors.push({ 
            email: userData.email, 
            error: `Missing role ID. Free: ${freeRoleId}, Premium: ${premiumRoleId}` 
          });
          continue;
        }

        // First, try to delete existing profile if it exists (to avoid conflicts)
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', userId);

        // Create new profile (using insert instead of upsert for clarity)
        const profileData = {
          user_id: userId,
          display_name: userData.user_metadata.display_name,
          nickname: userData.user_metadata.nickname,
          email: userData.email,
          role_id: roleId,
          points: points,
          is_online: true
        };


        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (profileError) {
          errors.push({ 
            email: userData.email, 
            error: `Profile error: ${profileError.message}`,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code
          });
          console.error(`Profile error for ${userData.email}:`, profileError);
        } else if (profile) {
          createdUsers.push({
            email: userData.email,
            user_id: userId,
            display_name: profile.display_name,
            role: userData.email.includes('sara') ? 'premium' : 'free',
            points: profile.points
          });
        } else {
          errors.push({ email: userData.email, error: 'Profile was not created - no data returned' });
          console.error(`❌ Profile was not created for ${userData.email} - no data returned`);
        }
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        errors.push({ email: userData.email, error: errorMessage });
        console.error(`Unexpected error for ${userData.email}:`, error);
      }
    }

    // Verify profiles were actually created
    if (createdUsers.length > 0) {
      for (const user of createdUsers) {
        const { data: verifyProfile, error: verifyError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', user.user_id)
          .single();
      }
    }

    return NextResponse.json({
      success: createdUsers.length > 0,
      message: createdUsers.length > 0 
        ? `Created ${createdUsers.length} users successfully` 
        : 'Failed to create users',
      users: createdUsers,
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        freeRoleId,
        premiumRoleId,
        totalAttempted: users.length
      }
    });
  } catch (error: any) {
    console.error('Error creating test users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create test users' },
      { status: 500 }
    );
  }
}


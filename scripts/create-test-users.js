/**
 * Script to create test users in Supabase
 * Run with: node scripts/create-test-users.js
 * 
 * Make sure you have SUPABASE_SERVICE_ROLE_KEY in your .env.local file
 */

// Try to load .env.local, but don't fail if it doesn't exist
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, try to read env vars directly
}
const { createClient } = require('@supabase/supabase-js');

async function createTestUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials!');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }

  console.log('🚀 Creating test users...\n');

  // Create admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Ensure roles exist
    console.log('📋 Checking roles...');
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .in('name', ['free', 'premium']);

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message);
      return;
    }

    let freeRoleId = roles?.find(r => r.name === 'free')?.id;
    let premiumRoleId = roles?.find(r => r.name === 'premium')?.id;

    if (!freeRoleId || !premiumRoleId) {
      console.log('📝 Creating roles...');
      const { data: newRoles, error: createRolesError } = await supabaseAdmin
        .from('roles')
        .upsert([
          { name: 'free', display_name: 'מנוי חינמי', description: 'מנוי חינמי - גישה בסיסית' },
          { name: 'premium', display_name: 'מנוי פרימיום', description: 'מנוי פרימיום - גישה מלאה' }
        ], { onConflict: 'name' })
        .select();

      if (createRolesError) {
        console.error('❌ Error creating roles:', createRolesError.message);
        return;
      }

      freeRoleId = newRoles?.find(r => r.name === 'free')?.id;
      premiumRoleId = newRoles?.find(r => r.name === 'premium')?.id;
    }

    console.log('✅ Roles ready\n');

    // Users to create
    const users = [
      {
        email: 'yossi.cohen@example.com',
        password: 'Test123456!',
        display_name: 'יוסי כהן',
        nickname: 'יוסי',
        role_id: freeRoleId,
        points: 100
      },
      {
        email: 'sara.levi@example.com',
        password: 'Test123456!',
        display_name: 'שרה לוי',
        nickname: 'שרה',
        role_id: premiumRoleId,
        points: 500
      }
    ];

    const results = [];

    for (const userData of users) {
      try {
        console.log(`👤 Creating user: ${userData.email}...`);

        // Check if user exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(userData.email);
        
        let userId;
        
        if (existingUser?.user) {
          console.log(`   ℹ️  User already exists, using existing ID`);
          userId = existingUser.user.id;
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: {
              display_name: userData.display_name,
              nickname: userData.nickname
            }
          });

          if (createError) {
            console.error(`   ❌ Error creating user: ${createError.message}`);
            results.push({ email: userData.email, success: false, error: createError.message });
            continue;
          }

          userId = newUser.user.id;
          console.log(`   ✅ User created: ${userId.substring(0, 8)}...`);
        }

        // Create or update profile
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            user_id: userId,
            display_name: userData.display_name,
            nickname: userData.nickname,
            email: userData.email,
            role_id: userData.role_id,
            points: userData.points,
            is_online: true
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (profileError) {
          console.error(`   ❌ Error creating profile: ${profileError.message}`);
          results.push({ email: userData.email, success: false, error: profileError.message });
        } else {
          console.log(`   ✅ Profile created/updated`);
          results.push({
            email: userData.email,
            success: true,
            user_id: userId,
            display_name: profile.display_name,
            role: userData.email.includes('sara') ? 'premium' : 'free',
            points: profile.points
          });
        }
      } catch (error) {
        console.error(`   ❌ Unexpected error: ${error.message}`);
        results.push({ email: userData.email, success: false, error: error.message });
      }
      
      console.log('');
    }

    // Summary
    console.log('📊 Summary:');
    console.log('='.repeat(50));
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.email}`);
        console.log(`   User ID: ${result.user_id.substring(0, 8)}...`);
        console.log(`   Display Name: ${result.display_name}`);
        console.log(`   Role: ${result.role}`);
        console.log(`   Points: ${result.points}`);
      } else {
        console.log(`❌ ${result.email}`);
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Successfully created/updated ${successCount} out of ${users.length} users`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
createTestUsers();


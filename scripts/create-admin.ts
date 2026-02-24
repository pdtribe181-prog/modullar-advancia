#!/usr/bin/env npx tsx
/**
 * Create Admin User Script
 * Sets up the admin user for Advancia PayLedger
 *
 * Usage: npx tsx scripts/create-admin.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = 'admin@advanciapayledger.com';
const ADMIN_PASSWORD = 'AdvanciaAdmin2026!';
const ADMIN_NAME = 'System Administrator';

async function createAdminUser() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔄 Creating admin user...');
  console.log(`   Email: ${ADMIN_EMAIL}`);

  try {
    // Check if admin user already exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .eq('email', ADMIN_EMAIL)
      .single();

    if (existingUser) {
      console.log('ℹ️  Admin user already exists in user_profiles');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Role: ${existingUser.role}`);

      // Update role to admin if needed
      if (existingUser.role !== 'admin') {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ role: 'admin', is_active: true })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('❌ Failed to update role:', updateError.message);
        } else {
          console.log('✅ Role updated to admin');
        }
      }
      return;
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: ADMIN_NAME,
        role: 'admin',
      },
    });

    if (authError) {
      // User might already exist in auth but not in profiles
      if (authError.message.includes('already been registered')) {
        console.log('ℹ️  User exists in Auth, fetching...');

        const { data: users } = await supabase.auth.admin.listUsers();
        const existingAuthUser = users?.users?.find((u) => u.email === ADMIN_EMAIL);

        if (existingAuthUser) {
          // Create profile for existing auth user
          const { error: profileError } = await supabase.from('user_profiles').upsert({
            id: existingAuthUser.id,
            email: ADMIN_EMAIL,
            full_name: ADMIN_NAME,
            role: 'admin',
            is_active: true,
          });

          if (profileError) {
            console.error('❌ Failed to create profile:', profileError.message);
          } else {
            console.log('✅ Admin profile created for existing auth user');
            console.log(`   ID: ${existingAuthUser.id}`);
          }
        }
        return;
      }

      console.error('❌ Failed to create auth user:', authError.message);
      process.exit(1);
    }

    console.log('✅ Auth user created:', authUser.user?.id);

    // Create user profile with admin role
    const { error: profileError } = await supabase.from('user_profiles').upsert({
      id: authUser.user!.id,
      email: ADMIN_EMAIL,
      full_name: ADMIN_NAME,
      role: 'admin',
      is_active: true,
    });

    if (profileError) {
      console.error('❌ Failed to create profile:', profileError.message);
      process.exit(1);
    }

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📋 Admin Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('');
    console.log('⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdminUser();

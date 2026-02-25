/**
 * Create Initial Admin User
 *
 * Creates the first admin user in Supabase Auth + user_profiles.
 * Run once during initial production setup:
 *
 *   npx tsx scripts/create-admin-user.ts
 *
 * Requires environment variables:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * You will be prompted for email and password, or pass them as args:
 *   npx tsx scripts/create-admin-user.ts admin@advanciapayledger.com MySecureP@ss1
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('🔧 Advancia PayLedger — Create Initial Admin User\n');

  // Get credentials from args or prompts
  let email = process.argv[2];
  let password = process.argv[3];
  let fullName = process.argv[4];

  if (!email) {
    email = await prompt('Admin email: ');
  }
  if (!password) {
    password = await prompt('Admin password (min 8 chars, 1 letter, 1 number): ');
  }
  if (!fullName) {
    fullName = await prompt('Full name (optional, press Enter to skip): ');
  }

  // Validate
  if (!email || !email.includes('@')) {
    console.error('❌ Invalid email address');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    process.exit(1);
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    console.error('❌ Password must contain at least one letter and one number');
    process.exit(1);
  }

  console.log(`\nCreating admin user: ${email}...`);

  // Step 1: Create auth user via Supabase Admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: fullName || 'System Administrator',
      role: 'admin',
    },
  });

  if (authError) {
    console.error(`❌ Failed to create auth user: ${authError.message}`);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✅ Auth user created: ${userId}`);

  // Step 2: Create user_profile with admin role
  const { error: profileError } = await supabase.from('user_profiles').upsert(
    {
      id: userId,
      email,
      full_name: fullName || 'System Administrator',
      role: 'admin',
      phone: '9999999999', // Placeholder
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    console.error(`❌ Failed to create profile: ${profileError.message}`);
    console.log(
      '⚠️  Auth user was created but profile failed. You may need to create it manually.'
    );
    process.exit(1);
  }

  console.log('✅ User profile created with admin role');

  // Step 3: Verify
  const { data: verifyData } = await supabase
    .from('user_profiles')
    .select('id, email, role, status')
    .eq('id', userId)
    .single();

  console.log('\n📋 Admin User Summary:');
  console.log(`   ID:     ${verifyData?.id}`);
  console.log(`   Email:  ${verifyData?.email}`);
  console.log(`   Role:   ${verifyData?.role}`);
  console.log(`   Status: ${verifyData?.status}`);
  console.log('\n✅ Done! You can now log in at https://advanciapayledger.com');
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

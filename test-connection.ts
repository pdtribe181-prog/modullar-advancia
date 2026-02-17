// Test connection to Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pikguczsvikzragmrojz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpa2d1Y3pzdmlrenJhZ21yb2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDk1MDQsImV4cCI6MjA4NTk4NTUwNH0.ieMM1Rhvpb0KwxzP_w5wLEIIXu3f-p71oKzxQHXrLcY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  // Test 1: List tables using REST API
  try {
    const { data: providers, error } = await supabase
      .from('providers')
      .select('id')
      .limit(1);

    if (error) {
      console.log('Providers table access:', error.message);
    } else {
      console.log('✅ Providers table accessible');
    }
  } catch (e) {
    console.log('❌ Providers table error:', e);
  }

  // Test 2: Check user_profiles table
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.log('User profiles table access:', error.message);
    } else {
      console.log('✅ User profiles table accessible');
    }
  } catch (e) {
    console.log('❌ User profiles table error:', e);
  }

  // Test 3: Check transactions table
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .limit(1);

    if (error) {
      console.log('Transactions table access:', error.message);
    } else {
      console.log('✅ Transactions table accessible');
    }
  } catch (e) {
    console.log('❌ Transactions table error:', e);
  }

  console.log('\n✅ Supabase connection test complete!');
}

testConnection();

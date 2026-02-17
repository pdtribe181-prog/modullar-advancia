// Supabase Client Configuration
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pikguczsvikzragmrojz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpa2d1Y3pzdmlrenJhZ21yb2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDk1MDQsImV4cCI6MjA4NTk4NTUwNH0.ieMM1Rhvpb0KwxzP_w5wLEIIXu3f-p71oKzxQHXrLcY';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (for admin operations)
export const createServiceClient = (): SupabaseClient => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
  }
  return createClient(supabaseUrl, serviceRoleKey);
};

export default supabase;

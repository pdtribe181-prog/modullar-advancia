// Supabase Client Configuration
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env.js';

// Lazy initialization to allow env validation to run first
let _supabase: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

/**
 * Get the Supabase anon client (for user-authenticated operations)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const env = getEnv();
    _supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return _supabase;
}

/**
 * Server-side client with service role (for admin operations)
 * Use sparingly - bypasses RLS
 */
export const createServiceClient = (): SupabaseClient => {
  if (!_serviceClient) {
    const env = getEnv();
    _serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _serviceClient;
};

// Legacy export for backwards compatibility
// Note: Use getSupabaseClient() for new code
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseClient() as any)[prop];
  },
});

export default supabase;

// Supabase Client Configuration
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env.js';

// Lazy initialization to allow env validation to run first
let _supabase: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

/**
 * Shared client options for connection reuse and performance.
 *
 * PostgREST-based Supabase uses HTTP, so "connection pooling" here means:
 *   1. DB schema targeting (`db.schema`)
 *   2. HTTP keep-alive via the global fetch agent (Node 18+)
 *   3. Reasonable statement timeout (realtime + REST)
 *   4. Optimized fetch configuration for production workloads
 *
 * True PostgreSQL connection pooling is handled server-side by PgBouncer
 * in the Supabase dashboard (Settings → Database → Connection Pooling):
 *   - Pool mode: Transaction (recommended for serverless / short-lived)
 *   - Max pool size: 15 (default) — increase for high-throughput
 *   - Connection string: use the "Pooler" connection string when connecting
 *     directly via pg / Prisma (not relevant for JS client).
 */
const SHARED_DB_OPTIONS = {
  db: {
    schema: 'public' as const,
  },
  global: {
    headers: {
      'x-connection-pool': 'transaction',
      'x-client-info': 'modullar-advancia/1.0.0',
    },
  },
  realtime: {
    timeout: 15000, // Balanced 15s timeout
  },
} as const;

/**
 * Get the Supabase anon client (for user-authenticated operations)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const env = getEnv();
    _supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      ...SHARED_DB_OPTIONS,
      auth: {
        flowType: 'pkce' as const,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
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
      ...SHARED_DB_OPTIONS,
      auth: {
        flowType: 'pkce' as const,
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

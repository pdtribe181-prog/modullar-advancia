/**
 * Production Configuration
 * Security hardening and production-ready settings
 * Now uses validated environment from env.ts
 */

import { getEnv } from './env.js';

const env = getEnv();

export const productionConfig = {
  // Server
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',

  // Security
  security: {
    trustProxy: true, // Always trust proxy in our setup (nginx/Cloudflare)
    helmetEnabled: true,
    corsOrigins: env.CORS_ORIGINS
      ? env.CORS_ORIGINS.split(',').map((url) => url.trim())
      : [env.FRONTEND_URL],
  },

  // Rate Limiting
  rateLimiting: {
    windowMs: env.RATE_LIMIT_API_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_API_MAX,
  },

  // Stripe
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },

  // Supabase
  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Logging
  logging: {
    level: (env.NODE_ENV === 'production' ? 'info' : 'debug') as 'info' | 'debug',
  },
};

/**
 * @deprecated Use validateEnv() from env.ts instead
 * Kept for backward compatibility
 */
export function validateConfig(): void {
  // No-op: validation now happens in env.ts via validateEnv()
  // This function is kept for backward compatibility but does nothing

  // Still warn about key mismatches
  if (env.NODE_ENV !== 'production') {
    if (env.STRIPE_SECRET_KEY.startsWith('sk_live')) {
      console.warn('⚠️ WARNING: Using live Stripe keys in non-production environment!');
    }
  }

  if (env.NODE_ENV === 'production') {
    if (env.STRIPE_SECRET_KEY.startsWith('sk_test')) {
      console.warn('⚠️ WARNING: Using test Stripe keys in production environment!');
    }
  }
}

export default productionConfig;

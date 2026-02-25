/**
 * Production Configuration
 * Security hardening and production-ready settings
 */

export const productionConfig = {
  // Server
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Security
  security: {
    trustProxy: process.env.TRUST_PROXY === 'true',
    helmetEnabled: process.env.HELMET_ENABLED !== 'false',
    corsOrigins: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
      : ['http://localhost:3000', 'http://localhost:5173'],
  },

  // Rate Limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  },
};

// Validate required environment variables
export function validateConfig(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn about production keys in development
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live')) {
      console.warn('⚠️ WARNING: Using live Stripe keys in non-production environment!');
    }
  }

  // Warn about test keys in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test')) {
      console.warn('⚠️ WARNING: Using test Stripe keys in production environment!');
    }
  }
}

export default productionConfig;

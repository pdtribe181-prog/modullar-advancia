import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates all required and optional environment variables at startup
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // Supabase (required)
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_WEBHOOK_SECRET: z.string().optional(), // For database webhook signature verification

  // Stripe (required)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_', 'STRIPE_PUBLISHABLE_KEY must start with pk_'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),

  // Email (optional - gracefully degrade)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Advancia PayLedger <noreply@advanciapayledger.com>'),

  // SMS (Twilio - optional)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Error Tracking (Sentry - optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // Redis / Upstash (optional – gracefully falls back to in-memory)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // Frontend URL (required for redirects)
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL').default('http://localhost:5173'),

  // CORS allowlist (optional, comma-separated). Example:
  // CORS_ORIGINS=https://advanciapayledger.com,https://www.advanciapayledger.com
  CORS_ORIGINS: z.string().optional(),

  // Metrics scrape IP allowlist (optional, comma-separated)
  METRICS_ALLOWED_IPS: z.string().optional(),

  // Rate Limiting (optional - sensible defaults)
  RATE_LIMIT_API_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_API_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_PAYMENT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(60 * 1000), // 1 min
  RATE_LIMIT_PAYMENT_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_SENSITIVE_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(60 * 60 * 1000), // 1 hour
  RATE_LIMIT_SENSITIVE_MAX: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_WEBHOOK_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(60 * 1000), // 1 min
  RATE_LIMIT_WEBHOOK_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_ONBOARDING_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(60 * 60 * 1000), // 1 hour
  RATE_LIMIT_ONBOARDING_MAX: z.coerce.number().int().min(1).default(5),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

/**
 * Validate environment variables at startup
 * Throws detailed error if validation fails
 */
export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return `  - ${path}: ${issue.message}`;
    });

    // Using console.error directly here since logger may not be available yet
    const errorOutput = [
      '\n❌ Environment validation failed:\n',
      errors.join('\n'),
      '\n📋 Check your .env file and ensure all required variables are set.\n',
    ];

    // In development, provide helpful hints
    if (process.env.NODE_ENV !== 'production') {
      errorOutput.push(
        'Required variables:',
        '  SUPABASE_URL=https://your-project.supabase.co',
        '  SUPABASE_ANON_KEY=your-anon-key',
        '  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key',
        '  STRIPE_SECRET_KEY=sk_test_...',
        '  STRIPE_PUBLISHABLE_KEY=pk_test_...',
        '  STRIPE_WEBHOOK_SECRET=whsec_...\n'
      );
    }

    process.stderr.write(errorOutput.join('\n'));

    throw new Error('Environment validation failed');
  }

  validatedEnv = result.data;
  return validatedEnv;
}

/**
 * Get validated environment (must call validateEnv first)
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!getEnv().RESEND_API_KEY;
}

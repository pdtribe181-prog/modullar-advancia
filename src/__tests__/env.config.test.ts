/**
 * Unit tests for environment configuration
 */

import { jest } from '@jest/globals';
import { z } from 'zod';

describe('Environment Configuration', () => {
  // Store original env
  const originalEnv = process.env;

  // Define the schema inline to test schema behavior without actual module
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
    SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
    STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
    STRIPE_PUBLISHABLE_KEY: z
      .string()
      .startsWith('pk_', 'STRIPE_PUBLISHABLE_KEY must start with pk_'),
    STRIPE_WEBHOOK_SECRET: z
      .string()
      .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default('Advancia PayLedger <noreply@advanciapayledger.com>'),
    FRONTEND_URL: z
      .string()
      .url('FRONTEND_URL must be a valid URL')
      .default('http://localhost:5173'),
    CORS_ORIGINS: z.string().optional(),
    RATE_LIMIT_API_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(15 * 60 * 1000),
    RATE_LIMIT_API_MAX: z.coerce.number().int().min(1).default(100),
    RATE_LIMIT_AUTH_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(15 * 60 * 1000),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(10),
    RATE_LIMIT_PAYMENT_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(60 * 1000),
    RATE_LIMIT_PAYMENT_MAX: z.coerce.number().int().min(1).default(10),
    RATE_LIMIT_SENSITIVE_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(60 * 60 * 1000),
    RATE_LIMIT_SENSITIVE_MAX: z.coerce.number().int().min(1).default(20),
    RATE_LIMIT_WEBHOOK_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(60 * 1000),
    RATE_LIMIT_WEBHOOK_MAX: z.coerce.number().int().min(1).default(100),
    RATE_LIMIT_ONBOARDING_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(60 * 60 * 1000),
    RATE_LIMIT_ONBOARDING_MAX: z.coerce.number().int().min(1).default(5),
  });

  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    SUPABASE_URL: 'https://test-project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    STRIPE_SECRET_KEY: 'sk_test_12345',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_12345',
    STRIPE_WEBHOOK_SECRET: 'whsec_12345',
    FRONTEND_URL: 'http://localhost:5173',
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('NODE_ENV validation', () => {
    it('should accept development', () => {
      const result = envSchema.safeParse({ ...validEnv, NODE_ENV: 'development' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
      }
    });

    it('should accept test', () => {
      const result = envSchema.safeParse({ ...validEnv, NODE_ENV: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('test');
      }
    });

    it('should accept production', () => {
      const result = envSchema.safeParse({ ...validEnv, NODE_ENV: 'production' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('production');
      }
    });

    it('should reject invalid NODE_ENV', () => {
      const result = envSchema.safeParse({ ...validEnv, NODE_ENV: 'invalid_env' });
      expect(result.success).toBe(false);
    });

    it('should default to development', () => {
      const { NODE_ENV, ...envWithoutNodeEnv } = validEnv;
      const result = envSchema.safeParse(envWithoutNodeEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
      }
    });
  });

  describe('PORT validation', () => {
    it('should accept valid port numbers', () => {
      const result = envSchema.safeParse({ ...validEnv, PORT: '8080' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(8080);
      }
    });

    it('should coerce string to number', () => {
      const result = envSchema.safeParse({ ...validEnv, PORT: '3000' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.PORT).toBe('number');
      }
    });

    it('should reject port 0', () => {
      const result = envSchema.safeParse({ ...validEnv, PORT: '0' });
      expect(result.success).toBe(false);
    });

    it('should reject port above 65535', () => {
      const result = envSchema.safeParse({ ...validEnv, PORT: '65536' });
      expect(result.success).toBe(false);
    });

    it('should default to 3000', () => {
      const { PORT, ...envWithoutPort } = validEnv;
      const result = envSchema.safeParse(envWithoutPort);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(3000);
      }
    });
  });

  describe('SUPABASE_URL validation', () => {
    it('should accept valid URL', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.SUPABASE_URL).toBe('https://test-project.supabase.co');
      }
    });

    it('should reject invalid URL', () => {
      const result = envSchema.safeParse({ ...validEnv, SUPABASE_URL: 'not-a-url' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('URL');
      }
    });

    it('should reject missing URL', () => {
      const { SUPABASE_URL, ...envWithoutUrl } = validEnv;
      const result = envSchema.safeParse(envWithoutUrl);
      expect(result.success).toBe(false);
    });
  });

  describe('STRIPE_SECRET_KEY validation', () => {
    it('should accept key starting with sk_', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should reject key not starting with sk_', () => {
      const result = envSchema.safeParse({ ...validEnv, STRIPE_SECRET_KEY: 'pk_test_12345' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('sk_');
      }
    });

    it('should accept live key', () => {
      const result = envSchema.safeParse({ ...validEnv, STRIPE_SECRET_KEY: 'sk_live_12345' });
      expect(result.success).toBe(true);
    });
  });

  describe('STRIPE_PUBLISHABLE_KEY validation', () => {
    it('should accept key starting with pk_', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should reject key not starting with pk_', () => {
      const result = envSchema.safeParse({ ...validEnv, STRIPE_PUBLISHABLE_KEY: 'sk_test_12345' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('pk_');
      }
    });
  });

  describe('STRIPE_WEBHOOK_SECRET validation', () => {
    it('should accept key starting with whsec_', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should reject key not starting with whsec_', () => {
      const result = envSchema.safeParse({ ...validEnv, STRIPE_WEBHOOK_SECRET: 'wrong_secret' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('whsec_');
      }
    });
  });

  describe('RESEND_API_KEY validation', () => {
    it('should accept valid API key', () => {
      const result = envSchema.safeParse({ ...validEnv, RESEND_API_KEY: 're_12345' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.RESEND_API_KEY).toBe('re_12345');
      }
    });

    it('should allow missing API key (optional)', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.RESEND_API_KEY).toBeUndefined();
      }
    });
  });

  describe('EMAIL_FROM validation', () => {
    it('should accept custom email from', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EMAIL_FROM: 'Custom <custom@example.com>',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.EMAIL_FROM).toBe('Custom <custom@example.com>');
      }
    });

    it('should use default when not provided', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.EMAIL_FROM).toBe('Advancia PayLedger <noreply@advanciapayledger.com>');
      }
    });
  });

  describe('FRONTEND_URL validation', () => {
    it('should accept valid URL', () => {
      const result = envSchema.safeParse({ ...validEnv, FRONTEND_URL: 'https://app.example.com' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.FRONTEND_URL).toBe('https://app.example.com');
      }
    });

    it('should reject invalid URL', () => {
      const result = envSchema.safeParse({ ...validEnv, FRONTEND_URL: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('should use default when not provided', () => {
      const { FRONTEND_URL, ...envWithoutFrontendUrl } = validEnv;
      const result = envSchema.safeParse(envWithoutFrontendUrl);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.FRONTEND_URL).toBe('http://localhost:5173');
      }
    });
  });

  describe('Rate limit env variables', () => {
    it('should accept custom rate limit values', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        RATE_LIMIT_API_WINDOW_MS: '30000',
        RATE_LIMIT_API_MAX: '50',
        RATE_LIMIT_AUTH_WINDOW_MS: '60000',
        RATE_LIMIT_AUTH_MAX: '3',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.RATE_LIMIT_API_WINDOW_MS).toBe(30000);
        expect(result.data.RATE_LIMIT_API_MAX).toBe(50);
        expect(result.data.RATE_LIMIT_AUTH_WINDOW_MS).toBe(60000);
        expect(result.data.RATE_LIMIT_AUTH_MAX).toBe(3);
      }
    });

    it('should use defaults when not provided', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.RATE_LIMIT_API_WINDOW_MS).toBe(15 * 60 * 1000);
        expect(result.data.RATE_LIMIT_API_MAX).toBe(100);
        expect(result.data.RATE_LIMIT_AUTH_WINDOW_MS).toBe(15 * 60 * 1000);
        expect(result.data.RATE_LIMIT_AUTH_MAX).toBe(10);
        expect(result.data.RATE_LIMIT_PAYMENT_WINDOW_MS).toBe(60 * 1000);
        expect(result.data.RATE_LIMIT_PAYMENT_MAX).toBe(10);
        expect(result.data.RATE_LIMIT_SENSITIVE_WINDOW_MS).toBe(60 * 60 * 1000);
        expect(result.data.RATE_LIMIT_SENSITIVE_MAX).toBe(20);
        expect(result.data.RATE_LIMIT_WEBHOOK_WINDOW_MS).toBe(60 * 1000);
        expect(result.data.RATE_LIMIT_WEBHOOK_MAX).toBe(100);
        expect(result.data.RATE_LIMIT_ONBOARDING_WINDOW_MS).toBe(60 * 60 * 1000);
        expect(result.data.RATE_LIMIT_ONBOARDING_MAX).toBe(5);
      }
    });

    it('should reject window below minimum (1000ms)', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        RATE_LIMIT_API_WINDOW_MS: '500',
      });
      expect(result.success).toBe(false);
    });

    it('should reject max below 1', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        RATE_LIMIT_API_MAX: '0',
      });
      expect(result.success).toBe(false);
    });

    it('should coerce string numbers to numbers', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        RATE_LIMIT_API_WINDOW_MS: '60000',
        RATE_LIMIT_API_MAX: '200',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.RATE_LIMIT_API_WINDOW_MS).toBe('number');
        expect(typeof result.data.RATE_LIMIT_API_MAX).toBe('number');
      }
    });
  });

  describe('Required field validation', () => {
    it('should fail when SUPABASE_ANON_KEY is missing', () => {
      const { SUPABASE_ANON_KEY, ...env } = validEnv;
      const result = envSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should fail when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      const { SUPABASE_SERVICE_ROLE_KEY, ...env } = validEnv;
      const result = envSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should fail when STRIPE_SECRET_KEY is missing', () => {
      const { STRIPE_SECRET_KEY, ...env } = validEnv;
      const result = envSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should fail when STRIPE_PUBLISHABLE_KEY is missing', () => {
      const { STRIPE_PUBLISHABLE_KEY, ...env } = validEnv;
      const result = envSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should fail when STRIPE_WEBHOOK_SECRET is missing', () => {
      const { STRIPE_WEBHOOK_SECRET, ...env } = validEnv;
      const result = envSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });

  describe('Complete validation', () => {
    it('should pass with all valid required fields', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should provide all default values', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        // Check all defaults are set
        expect(result.data.NODE_ENV).toBeDefined();
        expect(result.data.PORT).toBeDefined();
        expect(result.data.EMAIL_FROM).toBeDefined();
        expect(result.data.FRONTEND_URL).toBeDefined();
        expect(result.data.RATE_LIMIT_API_WINDOW_MS).toBeDefined();
        expect(result.data.RATE_LIMIT_API_MAX).toBeDefined();
      }
    });

    it('should have correct types in output', () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.NODE_ENV).toBe('string');
        expect(typeof result.data.PORT).toBe('number');
        expect(typeof result.data.SUPABASE_URL).toBe('string');
        expect(typeof result.data.RATE_LIMIT_API_WINDOW_MS).toBe('number');
      }
    });
  });
});

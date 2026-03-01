/**
 * Config Tests
 * Covers: ai-knowledge-base.ts, production.config.ts
 */
import { jest } from '@jest/globals';

// Save original env
const origEnv = { ...process.env };

afterEach(() => {
  process.env = { ...origEnv };
});

describe('AI Knowledge Base Config', () => {
  it('exports ICD-10 codes mapping', async () => {
    const { icd10Codes } = await import('../config/ai-knowledge-base.js');
    expect(icd10Codes['annual physical']).toBe('Z00.00');
    expect(icd10Codes.hypertension).toBe('I10');
    expect(icd10Codes.diabetes).toBe('E11.9');
  });

  it('exports default fraud response', async () => {
    const { defaultFraudResponse } = await import('../config/ai-knowledge-base.js');
    expect(defaultFraudResponse.riskLevel).toBe('LOW');
    expect(defaultFraudResponse.riskScore).toBe(15);
    expect(defaultFraudResponse.flags).toEqual([]);
    expect(defaultFraudResponse.recommendations).toHaveLength(4);
  });
});

describe('Production Config', () => {
  it('exports production config with validated env', async () => {
    // Ensure minimal required env vars for validateEnv()
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

    const { productionConfig } = await import('../config/production.config.js');
    expect(productionConfig.port).toBeDefined();
    expect(typeof productionConfig.port).toBe('number');
    expect(productionConfig.security).toBeDefined();
    expect(productionConfig.rateLimiting).toBeDefined();
  });

  it('validateConfig is now deprecated (no-op)', async () => {
    // Set minimal env for validateEnv
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

    // validateConfig is now a no-op (validation happens in env.ts)
    const { validateConfig } = await import('../config/production.config.js');
    expect(() => validateConfig()).not.toThrow();
  });

  it('warns about live Stripe keys in non-production', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.STRIPE_SECRET_KEY = 'sk_live_123';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    process.env.NODE_ENV = 'development';

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Need to clear module cache and re-validate to trigger warning
    jest.resetModules();
    await import('../config/env.js'); // Re-validate env
    const { validateConfig } = await import('../config/production.config.js');
    validateConfig();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('live Stripe keys'));
    warnSpy.mockRestore();
  });

  it('warns about test Stripe keys in production', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    process.env.NODE_ENV = 'production';

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Need to clear module cache and re-validate to trigger warning
    jest.resetModules();
    await import('../config/env.js'); // Re-validate env
    const { validateConfig } = await import('../config/production.config.js');
    validateConfig();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('test Stripe keys'));
    warnSpy.mockRestore();
  });
});

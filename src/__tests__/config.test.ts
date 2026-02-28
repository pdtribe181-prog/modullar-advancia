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
  it('exports production config with defaults', async () => {
    const { productionConfig } = await import('../config/production.config.js');
    expect(productionConfig.port).toBeDefined();
    expect(typeof productionConfig.port).toBe('number');
    expect(productionConfig.security).toBeDefined();
    expect(productionConfig.rateLimiting).toBeDefined();
  });

  it('validateConfig throws when required env vars missing', async () => {
    // Remove required vars
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PUBLISHABLE_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    // Force re-import to evaluate validateConfig
    const { validateConfig } = await import('../config/production.config.js');
    expect(() => validateConfig()).toThrow('Missing required environment variables');
  });

  it('validateConfig passes when all required vars set', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

    const { validateConfig } = await import('../config/production.config.js');
    expect(() => validateConfig()).not.toThrow();
  });

  it('warns about live Stripe keys in non-production', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.STRIPE_SECRET_KEY = 'sk_live_123';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    process.env.NODE_ENV = 'development';

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { validateConfig } = await import('../config/production.config.js');
    validateConfig();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('live Stripe keys'));
    warnSpy.mockRestore();
  });

  it('warns about test Stripe keys in production', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    process.env.NODE_ENV = 'production';

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { validateConfig } = await import('../config/production.config.js');
    validateConfig();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('test Stripe keys'));
    warnSpy.mockRestore();
  });
});

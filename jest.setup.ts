// Jest setup file — root shim
// Ensures VS Code Jest extension finds setup regardless of which config it loads
import 'dotenv/config';
import { jest } from '@jest/globals';

// Minimal env so routes that call getEnv() (e.g. stripe, provider) pass validation in CI/local without .env
if (process.env.NODE_ENV === 'test') {
  const defaults: Record<string, string> = {
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://test.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
  };
  Object.entries(defaults).forEach(([k, v]) => {
    if (!process.env[k]) process.env[k] = v;
  });
}

// Make jest available globally for ESM modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).jest = jest;

// Close any open handles after all tests
afterAll(async () => {
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => resolve(), 500);
    timer.unref();
  });
});

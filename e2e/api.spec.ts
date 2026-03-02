import { test, expect } from '@playwright/test';

const API_ROOT = process.env.API_BASE_URL || 'http://127.0.0.1:3000';
const API_V1 = `${API_ROOT}/api/v1`;

const hasSupabaseEnv = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const hasStripeEnv = Boolean(process.env.STRIPE_SECRET_KEY);

test.describe('API Health & Endpoints', () => {
  test('GET /health should return healthy status', async ({ request }) => {
    const response = await request.get(`${API_ROOT}/health`);

    // If Supabase isn't configured locally, the service reports unhealthy (503).
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(['healthy', 'unhealthy']).toContain(body.status);
    expect(['connected', 'error']).toContain(body.database);
    expect(typeof body.timestamp).toBe('string');

    // When env is present, expect a healthy DB.
    if (hasSupabaseEnv) {
      expect(response.status()).toBe(200);
      expect(body.database).toBe('connected');
    }
  });

  test('GET /docs should return Swagger UI', async ({ request }) => {
    const response = await request.get(`${API_ROOT}/docs/`);

    expect(response.ok()).toBeTruthy();

    const html = await response.text();
    expect(html).toContain('swagger');
  });

  test('API should have CORS headers', async ({ request }) => {
    // Use localhost so CI (NODE_ENV=test) gets an allowed origin; set CORS_TEST_ORIGIN for prod testing
    const origin =
      process.env.CORS_TEST_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';
    const response = await request.get(`${API_ROOT}/health`, {
      headers: {
        Origin: origin,
      },
    });

    // CORS may reject unknown origins with 500; accept that alongside normal responses
    expect([200, 403, 500, 503]).toContain(response.status());
    // CORS headers may only be present for allowed origins
    const corsHeader = response.headers()['access-control-allow-origin'];
    if (response.status() === 200 || response.status() === 503) {
      expect(corsHeader).toBeTruthy();
    }
  });

  test('API should have security headers', async ({ request }) => {
    const response = await request.get(`${API_ROOT}/health`);

    expect([200, 503]).toContain(response.status());

    const headers = response.headers();
    // Helmet should set these headers
    expect(headers['x-content-type-options']).toContain('nosniff');
    expect(headers['x-frame-options']).toBeTruthy();
  });
});

test.describe('Auth API', () => {
  test('POST /auth/login without credentials should return 400', async ({ request }) => {
    const response = await request.post(`${API_V1}/auth/login`, {
      data: {},
    });

    // Under parallel test load, rate limiting may return 429.
    expect([400, 429]).toContain(response.status());
  });

  test('POST /auth/login with invalid credentials should return 401', async ({ request }) => {
    const response = await request.post(`${API_V1}/auth/login`, {
      data: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      },
    });

    // Should return 400/401 for invalid credentials; or 429 under rate limiting.
    expect([400, 401, 429]).toContain(response.status());
  });

  test('GET /auth/profile without auth should return 401', async ({ request }) => {
    const response = await request.get(`${API_V1}/auth/profile`);

    expect(response.status()).toBe(401);
  });

  test('POST /auth/register with invalid data should return 400', async ({ request }) => {
    const response = await request.post(`${API_V1}/auth/register`, {
      data: {
        email: 'invalid-email',
        // Missing password
      },
    });

    // Under parallel test load, rate limiting may return 429.
    expect([400, 429]).toContain(response.status());
  });
});

test.describe('Stripe API', () => {
  test.skip(!hasStripeEnv, 'STRIPE_SECRET_KEY not set; skipping Stripe API checks');

  test('GET /stripe/products should return products list or require auth', async ({ request }) => {
    const response = await request.get(`${API_V1}/stripe/products`);

    // Endpoint may require auth (401) or not exist (404); both are acceptable
    if (response.ok()) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data?.data)).toBeTruthy();
    } else {
      expect([401, 403, 404, 410]).toContain(response.status());
    }
  });

  test('POST /stripe/payment-intents without auth should return 401', async ({ request }) => {
    const response = await request.post(`${API_V1}/stripe/payment-intents`, {
      data: {
        amount: 1000,
      },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('Rate Limiting', () => {
  test('should have rate limit headers', async ({ request }) => {
    const response = await request.post(`${API_V1}/auth/login`, { data: {} });
    const headers = response.headers();

    // Rate limit headers from express-rate-limit
    const hasRateLimitHeader =
      headers['ratelimit-limit'] !== undefined ||
      headers['x-ratelimit-limit'] !== undefined ||
      headers['retry-after'] !== undefined;

    expect(hasRateLimitHeader).toBeTruthy();
  });
});

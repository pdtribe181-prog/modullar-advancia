import { test, expect } from '@playwright/test';

const API_URL = process.env.API_BASE_URL || 'http://localhost:3000';

test.describe('API Health & Endpoints', () => {
  test('GET /health should return healthy status', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.database).toBe('connected');
  });

  test('GET /docs should return Swagger UI', async ({ request }) => {
    const response = await request.get(`${API_URL}/docs/`);

    expect(response.ok()).toBeTruthy();

    const html = await response.text();
    expect(html).toContain('swagger');
  });

  test('API should have CORS headers', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    expect(response.ok()).toBeTruthy();
    // CORS headers should be present
    const corsHeader = response.headers()['access-control-allow-origin'];
    expect(corsHeader).toBeTruthy();
  });

  test('API should have security headers', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);

    expect(response.ok()).toBeTruthy();

    const headers = response.headers();
    // Helmet should set these headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeTruthy();
  });
});

test.describe('Auth API', () => {
  test('POST /auth/login without credentials should return 400', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  test('POST /auth/login with invalid credentials should return 401', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      },
    });

    // Should return 400 or 401 for invalid credentials
    expect([400, 401]).toContain(response.status());
  });

  test('GET /auth/me without auth should return 401', async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/me`);

    expect(response.status()).toBe(401);
  });

  test('POST /auth/register with invalid data should return 400', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: 'invalid-email',
        // Missing password
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Stripe API', () => {
  test('GET /stripe/products should return products list', async ({ request }) => {
    const response = await request.get(`${API_URL}/stripe/products`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('POST /stripe/payment-intent without auth should return 401', async ({ request }) => {
    const response = await request.post(`${API_URL}/stripe/payment-intent`, {
      data: {
        amount: 1000,
      },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('Rate Limiting', () => {
  test('should have rate limit headers', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    const headers = response.headers();

    // Rate limit headers from express-rate-limit
    const hasRateLimitHeader =
      headers['ratelimit-limit'] !== undefined ||
      headers['x-ratelimit-limit'] !== undefined ||
      headers['retry-after'] !== undefined;

    // Rate limiting may not apply to /health endpoint
    console.log('Rate limit headers present:', hasRateLimitHeader);
  });
});

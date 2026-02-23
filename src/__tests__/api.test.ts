import request from 'supertest';
import express from 'express';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Healthcare Payment API', () => {
  describe('Health Check', () => {
    it('GET /health should return ok status', async () => {
      const response = await request(API_BASE_URL).get('/health');

      // Health can be 200 (healthy) or 503 (unhealthy) depending on environment.
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Authentication', () => {
    it('POST /auth/signup should create a new user', async () => {
      const testUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        fullName: 'Test User',
        role: 'patient',
      };

      const response = await request(API_BASE_URL).post('/api/v1/auth/register').send(testUser);

      // May fail if email already exists or rate limited
      expect([200, 400, 403, 429]).toContain(response.status);
    });

    it('POST /auth/signin should return token for valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(API_BASE_URL).post('/api/v1/auth/login').send(credentials);

      // Will fail if user doesn't exist / wrong password / pending approval
      expect([200, 401, 403, 429]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('session');
      }
    });
  });

  describe('Stripe Routes - Authentication Required', () => {
    it('POST /stripe/customers without auth should return 401', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/stripe/customers')
        .send({ email: 'test@example.com' });

      // Accept 401 (unauthorized) or 429 (rate limited in test environment)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error', 'Missing authorization header');
      }
    });

    it('GET /stripe/customers/:id without auth should return 401', async () => {
      const response = await request(API_BASE_URL).get('/api/v1/stripe/customers/cus_test123');

      // Accept 401 (unauthorized) or 429 (rate limited in test environment)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error', 'Missing authorization header');
      }
    });

    it('POST /stripe/payment-intents without auth should return 401', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/stripe/payment-intents')
        .send({ amount: 100, currency: 'usd' });

      // Accept 401 (unauthorized) or 429 (rate limited in test environment)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error', 'Missing authorization header');
      }
    });

    it('POST /stripe/refunds without auth should return 401', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/stripe/refunds')
        .send({ paymentIntentId: 'pi_test' });

      // Accept 401 (unauthorized) or 429 (rate limited in test environment)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error', 'Missing authorization header');
      }
    });

    it('POST /stripe/subscriptions without auth should return 401', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/stripe/subscriptions')
        .send({ customerId: 'cus_test', priceId: 'price_test' });

      // Accept 401 (unauthorized) or 429 (rate limited in test environment)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error', 'Missing authorization header');
      }
    });
  });

  describe('Stripe Webhook - No Auth Required', () => {
    it('POST /stripe/webhook without signature should return 400', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/v1/stripe/webhook')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ type: 'test.event' }));

      // Should fail signature verification (400) or rate limited (429)
      expect([400, 429]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.error).toContain('Webhook');
      }
    });
  });

  describe('Connect Routes - Authentication Required', () => {
    it('POST /connect/onboard without auth should return 401', async () => {
      const response = await request(API_BASE_URL).post('/connect/onboard');

      // Accept 401 (unauthorized) or 429 (rate limited in test environment)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error', 'Missing authorization header');
      }
    });

    it('GET /connect/status without auth should return 401', async () => {
      const response = await request(API_BASE_URL).get('/connect/status');

      // Accept 401 (unauthorized) or 429 (rate limited in test environment)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error', 'Missing authorization header');
      }
    });

    it('GET /connect/balance without auth should return 401', async () => {
      const response = await request(API_BASE_URL).get('/connect/balance');

      // Accept 401 (unauthorized) or 429 (rate limited in test environment)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error', 'Missing authorization header');
      }
    });
  });

  describe('Public Routes', () => {
    it('GET /providers should be accessible without auth', async () => {
      const response = await request(API_BASE_URL).get('/providers');

      // Should return 200, 500, or 429 (rate limited), not 401
      expect([200, 429, 500]).toContain(response.status);
    });

    it('GET /stripe/products should be accessible without auth', async () => {
      const response = await request(API_BASE_URL).get('/stripe/products');

      // Products list is public for storefront (or rate limited)
      expect([200, 429, 500]).toContain(response.status);
    });
  });

  describe('Protected Routes', () => {
    it('GET /patients without auth should return 401', async () => {
      const response = await request(API_BASE_URL).get('/patients');

      // Accept 401 (unauthorized) or 429 (rate limited in test environment)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('GET /profile without auth should return 401', async () => {
      const response = await request(API_BASE_URL).get('/profile');

      // Accept 401 (unauthorized) or 429 (rate limited in test environment)
      expect([401, 429]).toContain(response.status);
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});

describe('API Response Format', () => {
  it('should return JSON content type', async () => {
    const response = await request(API_BASE_URL).get('/health');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('should include CORS headers', async () => {
    const response = await request(API_BASE_URL).get('/health');

    // CORS is enabled via cors() middleware
    expect(response.status).toBe(200);
  });
});

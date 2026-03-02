/**
 * Admin API and UI — end-to-end tests
 *
 * API: Admin routes require Bearer token and role=admin. Tests cover 401/403 and,
 * when E2E_ADMIN_TOKEN is set, 200 for /admin/dashboard.
 *
 * UI: /admin redirects to login when not authenticated; when logged in as non-admin
 * redirects to dashboard (RoleGuard). Optional: full admin console flow with
 * E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD.
 */
import { test, expect } from '@playwright/test';

const API_ROOT = process.env.API_BASE_URL || 'http://127.0.0.1:3000';
const API_V1 = `${API_ROOT}/api/v1`;
const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN;

async function dismissCookieConsent(
  page: { getByRole: (role: string, opts: { name: RegExp }) => { isVisible: () => Promise<boolean>; click: () => Promise<void> } }
) {
  const acceptButton = page.getByRole('button', { name: /accept all/i });
  if (await acceptButton.isVisible().catch(() => false)) {
    await acceptButton.click();
  }
}

test.describe('Admin API', () => {
  test('GET /admin/dashboard without auth returns 401', async ({ request }) => {
    const response = await request.get(`${API_V1}/admin/dashboard`);
    expect(response.status()).toBe(401);
  });

  test('GET /admin/dashboard with invalid token returns 401', async ({ request }) => {
    const response = await request.get(`${API_V1}/admin/dashboard`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /admin/dashboard with valid non-admin token returns 403', async ({
    request,
  }) => {
    // Use a token that is valid but not admin (e.g. from login as patient).
    // If we don't have a non-admin token in env, skip or use a known test user.
    const nonAdminToken = process.env.E2E_USER_TOKEN;
    if (!nonAdminToken) {
      test.skip();
      return;
    }
    const response = await request.get(`${API_V1}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${nonAdminToken}` },
    });
    expect(response.status()).toBe(403);
  });

  test('GET /admin/dashboard with admin token returns 200 and data', async ({
    request,
  }) => {
    if (!ADMIN_TOKEN) {
      test.skip();
      return;
    }
    const response = await request.get(`${API_V1}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.overview).toBeDefined();
  });
});

test.describe('Admin Console UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissCookieConsent(page);
  });

  test('visiting /admin when not logged in redirects to login', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /admin/audit-log when not logged in redirects to login', async ({
    page,
  }) => {
    await page.goto('/admin/audit-log');
    await expect(page).toHaveURL(/\/login/);
  });

  test('when logged in as non-admin, /admin redirects to dashboard', async ({
    page,
  }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page.getByText(/dashboard|welcome/i).first()).toBeVisible({
      timeout: 15000,
    });
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('when logged in as admin, admin console loads', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page.getByText(/dashboard|welcome/i).first()).toBeVisible({
      timeout: 15000,
    });
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
    await expect(
      page.getByText(/admin|dashboard|overview|users/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

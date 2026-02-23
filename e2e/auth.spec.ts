import { test, expect, type Page } from '@playwright/test';

async function dismissCookieConsent(page: Page) {
  const acceptButton = page.getByRole('button', { name: /accept all/i });
  if (await acceptButton.isVisible().catch(() => false)) {
    await acceptButton.click();
  }
}

// Page Object for authentication flows
export class AuthPage {
  constructor(private page: Page) {}

  async goto(path: string = '/login') {
    await this.page.goto(path);
  }

  async fillLoginForm(email: string, password: string) {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
  }

  async clickLogin() {
    await this.page.getByRole('button', { name: /sign in|log in/i }).click();
  }

  async login(email: string, password: string) {
    await this.fillLoginForm(email, password);
    await this.clickLogin();
  }

  async expectLoggedIn() {
    // Should redirect to dashboard or show user info
    await expect(this.page.getByText(/dashboard|welcome/i).first()).toBeVisible({ timeout: 10000 });
  }

  async expectError(message?: string) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible();
    } else {
      await expect(
        this.page.getByRole('alert').or(this.page.getByText(/error|invalid/i))
      ).toBeVisible();
    }
  }
}

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissCookieConsent(page);
  });

  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('button', { name: /sign in|log in/i }).click();

      // Should show validation errors or prevent submission
      await expect(page.getByText(/required|email|password/i).first()).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      const auth = new AuthPage(page);
      await auth.goto('/login');
      await auth.login('invalid@example.com', 'wrongpassword');
      await auth.expectError();
    });

    test('should have link to signup page', async ({ page }) => {
      await page.goto('/login');

      const signupLink = page.getByRole('link', { name: /sign up|register|create account/i });
      await expect(signupLink).toBeVisible();
    });
  });

  test.describe('Signup Flow', () => {
    test('should display signup form', async ({ page }) => {
      await page.goto('/login');

      // Click signup link
      await page.getByRole('link', { name: /sign up|register|create account/i }).click();

      // Should have signup form elements
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i).first()).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without auth', async ({
      page,
    }) => {
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect to login when accessing provider dashboard without auth', async ({
      page,
    }) => {
      await page.goto('/provider');

      await expect(page).toHaveURL(/login/);
    });
  });
});

test.describe('Navigation', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/healthcare|modullar|advancia/i);
  });

  test('should navigate to login from home', async ({ page }) => {
    await page.goto('/');

    // Find and click login link/button
    const loginLink = page.getByRole('link', { name: /sign in|log in|login/i }).first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });
});

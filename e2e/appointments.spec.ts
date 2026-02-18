import { test, expect } from '@playwright/test';

test.describe('Appointments', () => {
  test.describe('Appointments Page', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/appointments');

      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Provider Dashboard', () => {
    test('should redirect to login when accessing provider features', async ({ page }) => {
      await page.goto('/provider');

      await expect(page).toHaveURL(/login/);
    });
  });
});

test.describe('User Profile', () => {
  test('should redirect to login when accessing profile', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Security Settings', () => {
  test('should redirect to login when accessing security settings', async ({ page }) => {
    await page.goto('/security');

    await expect(page).toHaveURL(/login/);
  });
});

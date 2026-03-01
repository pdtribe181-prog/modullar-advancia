/// <reference types="node" />
import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

dotenv.config();

export default defineConfig({
  testDir: '../e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.PLAYWRIGHT_WORKERS
    ? Number(process.env.PLAYWRIGHT_WORKERS)
    : process.env.CI
      ? 1
      : 2,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github', {}] as const] : []),
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  // In CI, Playwright starts servers automatically.
  // Locally, start servers yourself before running E2E: npm run dev & cd frontend && npm run dev
  ...(process.env.CI
    ? {
        webServer: [
          {
            command: 'npm run dev',
            url: 'http://127.0.0.1:3000/health',
            reuseExistingServer: false,
            timeout: 120000,
            cwd: '.',
          },
          {
            command: 'npm run dev',
            url: 'http://127.0.0.1:5173',
            reuseExistingServer: false,
            timeout: 120000,
            cwd: './frontend',
          },
        ],
      }
    : {}),
});

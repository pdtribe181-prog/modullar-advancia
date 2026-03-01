/// <reference types="node" />
import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

dotenv.config();

export default defineConfig({
  testDir: '../e2e',
  testMatch: /api\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github', {}] as const] : []),
  ],
  use: {
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
  // Only auto-start server in CI; locally start manually with `npm run dev`
  ...(process.env.CI
    ? {
        webServer: {
          command: 'npm run dev',
          url: 'http://127.0.0.1:3000/health',
          reuseExistingServer: false,
          timeout: 180000,
          cwd: '..',
        },
      }
    : {}),
});

// Jest setup file — root shim
// Ensures VS Code Jest extension finds setup regardless of which config it loads
import 'dotenv/config';
import { jest } from '@jest/globals';

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

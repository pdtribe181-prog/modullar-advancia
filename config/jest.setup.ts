// Jest setup file
import 'dotenv/config';
import { jest } from '@jest/globals';

// Make jest available globally for ESM modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).jest = jest;

// Close any open handles after all tests
afterAll(async () => {
  // Give time for any open handles to close, using .unref() to prevent the
  // timer itself from keeping the worker alive (avoids "failed to exit gracefully")
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => resolve(), 500);
    timer.unref();
  });
});

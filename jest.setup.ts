// Jest setup file
import 'dotenv/config';

// Close any open handles after all tests
afterAll(async () => {
  // Give time for any open handles to close
  await new Promise(resolve => setTimeout(resolve, 500));
});

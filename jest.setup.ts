// Shim: re-exports from config/jest.setup.ts
// Ensures VS Code Jest extension finds setup regardless of which config it loads
export * from './config/jest.setup.js';
import './config/jest.setup.js';

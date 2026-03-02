/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'config/tsconfig.test.json',
        diagnostics: {
          ignoreDiagnostics: [1378],
        },
      },
    ],
  },
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  // Exclude E2E and API integration tests (require running server)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/',
    'e2e\\.test\\.ts$',
    'api\\.test\\.ts$',
  ],
  setupFilesAfterEnv: ['<rootDir>/config/jest.setup.ts'],
  testTimeout: 30000,
  // Recycle workers after 512 MB to prevent stale handles from blocking exit
  workerIdleMemoryLimit: '512MB',
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/types/**', '!src/__tests__/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
  },
};

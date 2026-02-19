/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          target: 'ES2022',
          module: 'ESNext',
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
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/types/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 12,
      branches: 15,
      functions: 15,
      lines: 12,
    },
  },
};

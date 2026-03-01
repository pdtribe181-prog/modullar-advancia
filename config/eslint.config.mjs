import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
        ...globals.jest,
      },
      parserOptions: {
        // Path is relative to this config file in config/, so go up one level
        project: '../tsconfig.eslint.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'migrations/',
      '*.sql',
      '*.js',
      '*.cjs',
      '*.mjs',
      'jest.config.ts',
      'frontend/',
      'scripts/',
      'e2e/',
      'playwright.config.ts',
      'src/**/*.test.ts',
      'src/**/__tests__/**/*',
      '**/*.spec.ts',
    ],
  }
);

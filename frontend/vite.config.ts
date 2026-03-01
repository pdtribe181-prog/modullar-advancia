import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    // Upload source maps to Sentry on production builds
    // Requires SENTRY_AUTH_TOKEN env var (generate at https://sentry.io/settings/auth-tokens/)
    // Set SENTRY_ORG and SENTRY_PROJECT env vars or configure below
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG || 'advancia-payledger',
            project: process.env.SENTRY_PROJECT || 'frontend',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
          }),
        ]
      : []),
  ],
  build: {
    sourcemap: true, // Required for Sentry source maps
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached across all pages
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charting library (large, only used on dashboards)
          'vendor-charts': ['recharts'],
          // Stripe SDKs (only used on payment pages)
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          // Sentry (monitoring, loaded on all pages but rarely changes)
          'vendor-sentry': ['@sentry/react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});

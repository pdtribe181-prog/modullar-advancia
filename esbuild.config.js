import esbuild from 'esbuild';
import { sentryEsbuildPlugin } from '@sentry/esbuild-plugin';

esbuild
  .build({
    entryPoints: ['src/server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist/server.js',
    format: 'esm',
    packages: 'external',
    sourcemap: true,
    plugins: [
      // Only run Sentry plugin if auth token is present
      ...(process.env.SENTRY_AUTH_TOKEN
        ? [
            sentryEsbuildPlugin({
              org: process.env.SENTRY_ORG || 'advancia-payledger',
              project: process.env.SENTRY_PROJECT_BACKEND || 'backend',
              authToken: process.env.SENTRY_AUTH_TOKEN,
              sourcemaps: {
                // Specify the directory containing the source maps
                assets: './dist',
                filesToDeleteAfterUpload: './dist/**/*.map',
              },
            }),
          ]
        : []),
    ],
  })
  .catch(() => process.exit(1));

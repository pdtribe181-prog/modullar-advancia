import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Bake VITE_API_URL into the bundle at build time.
      // Priority: env var set in CI / Cloudflare dashboard > production default.
      // This prevents the empty-string fallback that broke all API calls on live site.
      'import.meta.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL || 'https://api.advanciapayledger.com/api/v1'
      ),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3000',
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
          },
        },
      },
    },
  };
});

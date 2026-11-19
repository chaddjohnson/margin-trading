import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Development: the Vite dev server (loopback only) proxies /api to the Strategy Lab server (npm run serve).
// Production: `npm run build`, then the Strategy Lab server serves dist/ itself (no Vite).
const api = process.env.STRATEGY_LAB_API ?? 'http://127.0.0.1:4317';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5174, proxy: { '/api': { target: api, changeOrigin: false } } },
  build: { outDir: 'dist', sourcemap: true, chunkSizeWarningLimit: 1024 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000
  }
});

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Local-only development server: bound to the loopback interface, no proxy, no external services.
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { outDir: 'dist', sourcemap: true, chunkSizeWarningLimit: 1024 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});

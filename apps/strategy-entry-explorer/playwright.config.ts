import { defineConfig } from '@playwright/test';

// Acceptance walkthrough in the system's Google Chrome (no browser download). The dev server is started on a
// dedicated port so a running `npm start` session is never reused or disturbed.
const port = 5199;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: 'chrome',
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000
  }
});

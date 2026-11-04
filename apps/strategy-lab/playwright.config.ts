import { defineConfig } from '@playwright/test';

// Acceptance walkthrough in the system's Google Chrome against the production server (built UI + API) on port 5299,
// with a fresh temporary state directory (`e2e/serve.ts`). Run `npm run test:e2e` (it builds first).
const port = 5299;

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: 'chrome',
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
    actionTimeout: 15_000
  },
  webServer: {
    command: 'node --experimental-transform-types --disable-warning=ExperimentalWarning e2e/serve.ts',
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});

// Assignment 2 Stage F: a real (headless Chromium) browser check of the DEPLOYED Strategy Lab service — the steps of
// apps/strategy-lab/e2e/portfolio-windows.spec.ts, run against the live server instead of the test server: N/original's
// Research window, then All (dates, label, figures, the post-validation ledger with lots 44–46 and their in-period P&L),
// fill-to-chart navigation on GDX and VGT, the custom continuous window and an isolated (cold-start) window. It writes
// nothing but replay-cache entries (no run is created; checked) and takes no screenshot (no-visuals preference). The token
// is read from a file and never printed.
//   node --no-maglev strategy-lab-browser-check.mjs <base url> <token file> <app dir with node_modules> [--out <json>]
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [base, tokenFile, appDir] = process.argv.slice(2);
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
const require = createRequire(join(appDir, 'package.json'));
const { chromium, expect } = require('@playwright/test');
const token = readFileSync(tokenFile, 'utf8').trim();
const checks = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    checks.push({ name, pass: true, ...(detail === undefined ? {} : { detail }) });
  } catch (e) {
    checks.push({ name, pass: false, error: String(e.message ?? e).split('\n')[0].slice(0, 300) });
  }
};
const browser = await chromium.launch({ channel: 'chrome' }); // as apps/strategy-lab/playwright.config.ts (the system Chrome)
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript((t) => localStorage.setItem('strategy-lab-token', t), token);
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 200)));
const api = async (p) => (await page.request.get(base + p, { headers: { authorization: `Bearer ${token}` } })).json();
const value = async (id) => Number(await page.getByTestId(id).getAttribute('data-value'));
const waitReplay = async () => {
  await expect(page.getByTestId('replay-status')).toHaveAttribute('data-state', 'completed', { timeout: 180_000 });
  await expect(page.getByTestId('portfolio-summary')).toBeVisible();
};
const runsBefore = (await api('/api/runs?limit=500')).length;
const coverage = (await api('/api/portfolios')).coverage;

await check('Research window: 2016-01-04 → 2026-10-30, parity verified, $482,700.73 / DD $20,385.99, no post-validation block', async () => {
  await page.goto(`${base}/#/portfolio/n-original`);
  await expect(page.getByTestId('candidate-title')).toHaveText('N/original');
  await waitReplay();
  await expect(page.getByTestId('window-mode-research')).toBeChecked();
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-to', '2026-10-30');
  await expect(page.getByTestId('parity-badge')).toHaveAttribute('data-parity', 'verified');
  await expect(page.getByTestId('summary-post')).toHaveCount(0);
  return { net: await value('summary-net'), dd: await value('summary-dd') };
});
await check('All: 2016-01-04 → the common complete endpoint, MANUAL POST-VALIDATION, trajectory verified, $477,002.83 / DD $25,794.56, post −$5,697.90, validation $94,669.70', async () => {
  await page.getByTestId('window-mode').locator('label', { hasText: 'All' }).click();
  await expect(page).toHaveURL(/window=all/);
  await waitReplay();
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-from', '2016-01-04');
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-to', coverage.endpoint);
  await expect(page.getByTestId('post-validation-badge')).toBeVisible();
  await expect(page.getByTestId('window-post-note')).toContainText('manual post-validation evaluation');
  await expect(page.getByTestId('parity-badge')).toHaveAttribute('data-parity', 'trajectory-verified');
  await expect(page.getByTestId('period-table').locator('th[data-period=B]')).toBeVisible();
  return {
    endpoint: coverage.endpoint,
    net: await value('summary-net'),
    dd: await value('summary-dd'),
    postNet: await value('summary-post-net'),
    postDd: await value('summary-post-dd'),
    validationNet: await value('summary-validation-net')
  };
});
await check('post-validation ledger: P-44, P-45, P-46 with their in-period P&L beside the lifetime net', async () => {
  await page.getByTestId('ledger-period').selectOption('post');
  const rows = page.locator('[data-testid=ledger] tr[data-position]');
  await expect(rows).toHaveCount(3);
  await expect(page.getByTestId('ledger-period-col')).toContainText('P&L in this period (B)');
  await expect(page.getByTestId('in-period-P-44')).toContainText('carried in');
  await expect(page.locator('[data-testid=ledger] tr[data-position=P-44]')).toContainText('+$5,483.48');
  await expect(page.locator('[data-testid=ledger] tr[data-position=P-45]')).toContainText('protective stop');
  return {
    lots: await rows.evaluateAll((r) => r.map((x) => x.getAttribute('data-position'))),
    p44: await value('in-period-P-44'),
    p45: await value('in-period-P-45'),
    p46: await value('in-period-P-46')
  };
});
await check('fill-to-chart: P-45 exit on GDX (protective stop), P-46 entry on VGT', async () => {
  await page.getByTestId('expand-P-45').click();
  await page.getByTestId('show-fill-GDX:P-45:exit').click();
  await expect(page.getByTestId('symbol-tab-GDX')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-testid=price-chart] .marker[data-event-id="GDX:P-45:exit"]')).toHaveClass(/is-selected/, { timeout: 30_000 });
  await expect(page.getByTestId('selected-event')).toContainText('protective stop');
  await expect(page.locator('[data-testid=price-chart] .marker[data-event-id="GDX:P-44:exit"]')).toBeAttached();
  await page.getByTestId('expand-P-46').click();
  await page.getByTestId('show-fill-VGT:P-46:entry').click();
  await expect(page.getByTestId('symbol-tab-VGT')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-testid=price-chart] .marker[data-event-id="VGT:P-46:entry"]')).toHaveClass(/is-selected/, { timeout: 30_000 });
  await expect(page.locator('[data-testid=price-chart] .marker[data-event-id="VGT:P-46:exit"]')).toBeAttached();
});
await check('custom, continuous history: 2026-11-02 → 2026-11-25 of the one run, −$5,697.90; a To after the data is refused', async () => {
  await page.goto(`${base}/#/portfolio/n-original?window=custom&from=2026-11-02&to=2026-11-25&exec=continuous`);
  await waitReplay();
  await expect(page.getByTestId('window-execution-continuous')).toBeChecked();
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-from', '2026-11-02');
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-to', '2026-11-25');
  const net = await value('summary-reporting-net');
  await page.getByTestId('window-to').fill('2099-12-31');
  await expect(page.getByTestId('window-error')).toContainText('latest common complete session');
  await expect(page.getByTestId('window-apply')).toBeDisabled();
  return { reportingNet: net };
});
await check('custom, isolated window (cold start at 2026-11-02): runs flat from that session, labelled ledger-reconciled only', async () => {
  await page.goto(`${base}/#/portfolio/n-original?window=custom&from=2026-11-02&to=2026-11-25&exec=isolated`);
  await waitReplay();
  await expect(page.getByTestId('window-execution-isolated')).toBeChecked();
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-from', '2026-11-02');
  return { parity: await page.getByTestId('parity-badge').getAttribute('data-parity'), net: await value('summary-net') };
});
await check('no saved run was created by browsing', async () => {
  const after = (await api('/api/runs?limit=500')).length;
  if (after !== runsBefore) throw new Error(`runs ${runsBefore} → ${after}`);
  return { runs: after };
});
await browser.close();
const result = { kind: 'strategy-lab deployed-service browser check', base, t: new Date().toISOString(), coverage, checks, consoleErrors, pass: checks.every((c) => c.pass) };
if (out) writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` ${JSON.stringify(c.detail)}` : ''}${c.error ? ` — ${c.error}` : ''}`);
console.log(result.pass ? 'ALL PASS' : 'FAILED');
process.exitCode = result.pass ? 0 : 1;

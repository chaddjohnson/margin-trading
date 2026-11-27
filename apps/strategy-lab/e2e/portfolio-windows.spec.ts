// Evaluation windows of a pooled candidate in the browser (2026-11-27): N/original on its research window, then on ALL
// available data through the latest common complete session of VGT and GDX — the effective dates, the manual
// post-validation label, the period table, the post-validation ledger (lot 44 carried across the validation end with
// its November P&L distinct from its lifetime net, lots 45 and 46 on the chart) — and a custom continuous window.
// Real data only. Screenshots (the brief asks for them) go to STRATEGY_LAB_SCREENSHOT_DIR when it is set.
import { join } from 'node:path';
import { type Page, expect, test } from '@playwright/test';

import { failOnConsoleProblems, hasData } from './console.ts';

test.skip(!hasData, 'needs the canonical VGT and GDX minute data');
failOnConsoleProblems();

const shots = process.env.STRATEGY_LAB_SCREENSHOT_DIR ?? null;
const shot = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: join(shots, name), fullPage: false });
};
const value = async (page: Page, id: string) => Number(await page.getByTestId(id).getAttribute('data-value'));
const waitReplay = async (page: Page) => {
  await expect(page.getByTestId('replay-status')).toHaveAttribute('data-state', 'completed', { timeout: 120_000 });
  await expect(page.getByTestId('portfolio-summary')).toBeVisible();
};

test('N/original: research window, then all available data with the newly appended trades', async ({ page }) => {
  test.setTimeout(300_000);
  const runsBefore = ((await (await page.request.get('/api/runs?limit=500')).json()) as unknown[]).length;
  const coverage = ((await (await page.request.get('/api/portfolios')).json()) as { coverage: { endpoint: string } }).coverage;
  await page.goto('/#/portfolio/n-original');
  await expect(page.getByTestId('candidate-title')).toHaveText('N/original');
  await waitReplay(page);
  // the research window: the archived benchmark, parity verified, no post-validation figures
  await expect(page.getByTestId('window-mode-research')).toBeChecked();
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-to', '2026-10-30');
  await expect(page.getByTestId('parity-badge')).toHaveAttribute('data-parity', 'verified');
  expect(await value(page, 'summary-net')).toBe(482700.73);
  expect(await value(page, 'summary-dd')).toBe(20385.99);
  await expect(page.getByTestId('summary-post')).toHaveCount(0);
  await expect(page.getByTestId('post-validation-badge')).toHaveCount(0);

  // all available data: one continuous run to the latest common complete session
  await page.getByTestId('window-mode').locator('label', { hasText: 'All' }).click();
  await expect(page).toHaveURL(/window=all/);
  await waitReplay(page);
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-to', coverage.endpoint);
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-from', '2016-01-04');
  await expect(page.getByTestId('post-validation-badge')).toBeVisible();
  await expect(page.getByTestId('window-post-note')).toContainText('manual post-validation evaluation');
  await expect(page.getByTestId('parity-badge')).toHaveAttribute('data-parity', 'trajectory-verified');
  await expect(page.getByTestId('summary-post')).toBeVisible();
  await expect(page.getByTestId('period-table').locator('th[data-period=B]')).toBeVisible();
  if (coverage.endpoint === '2026-11-25') {
    expect(await value(page, 'summary-net')).toBe(477002.83);
    expect(await value(page, 'summary-dd')).toBe(25794.56);
    expect(await value(page, 'summary-post-net')).toBe(-5697.9);
    expect(await value(page, 'summary-post-dd')).toBe(25794.56);
    expect(await value(page, 'summary-validation-net')).toBe(94669.7); // the formal validation window is unchanged
  }
  await shot(page, '01-n-original-all-summary.png');

  // the post-validation ledger: lot 44 carried in (its P&L after 2026-10-30 is not its lifetime net), lots 45 and 46
  await page.getByTestId('ledger-period').selectOption('post');
  const rows = page.locator('[data-testid=ledger] tr[data-position]');
  await expect(rows).toHaveCount(3);
  expect(await rows.evaluateAll((r) => r.map((x) => x.getAttribute('data-position')))).toEqual(['P-44', 'P-45', 'P-46']);
  await expect(page.getByTestId('ledger-period-col')).toContainText('P&L in this period (B)');
  expect(await value(page, 'in-period-P-44')).toBe(11048.24);
  await expect(page.getByTestId('in-period-P-44')).toContainText('carried in');
  await expect(page.locator('[data-testid=ledger] tr[data-position=P-44]')).toContainText('+$5,483.48'); // lifetime net
  expect(await value(page, 'in-period-P-45')).toBe(-16225.15);
  await expect(page.locator('[data-testid=ledger] tr[data-position=P-45]')).toContainText('protective stop');
  expect(await value(page, 'in-period-P-46')).toBe(-520.99);
  await page.getByTestId('ledger').scrollIntoViewIfNeeded();
  await shot(page, '02-n-original-post-validation-ledger.png');

  // lot 45's protective-stop exit on the GDX chart
  await page.getByTestId('expand-P-45').click();
  await page.getByTestId('show-fill-GDX:P-45:exit').click();
  await expect(page.getByTestId('symbol-tab-GDX')).toHaveAttribute('aria-selected', 'true');
  const exit45 = page.locator('[data-testid=price-chart] .marker[data-event-id="GDX:P-45:exit"]');
  await expect(exit45).toHaveClass(/is-selected/, { timeout: 30_000 });
  await expect(page.getByTestId('selected-event')).toContainText('protective stop');
  await expect(page.locator('[data-testid=price-chart] .marker[data-event-id="GDX:P-45:entry"]')).toBeAttached();
  await expect(page.locator('[data-testid=price-chart] .marker[data-event-id="GDX:P-44:exit"]')).toBeAttached();
  await page.getByTestId('portfolio-chart-card').scrollIntoViewIfNeeded();
  await shot(page, '03-n-original-gdx-lot-45-protective-stop.png');

  // lot 46 on the VGT chart
  await page.getByTestId('expand-P-46').click();
  await page.getByTestId('show-fill-VGT:P-46:entry').click();
  await expect(page.getByTestId('symbol-tab-VGT')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-testid=price-chart] .marker[data-event-id="VGT:P-46:entry"]')).toHaveClass(/is-selected/, { timeout: 30_000 });
  await expect(page.locator('[data-testid=price-chart] .marker[data-event-id="VGT:P-46:exit"]')).toBeAttached();
  await shot(page, '04-n-original-vgt-lot-46.png');

  // the post-validation viewport of the equity chart
  await page.getByTestId('period').locator('label', { hasText: 'post-validation' }).click();
  await expect(page.getByTestId('period-post')).toBeChecked();

  // browsing created no saved run
  expect(((await (await page.request.get('/api/runs?limit=500')).json()) as unknown[]).length).toBe(runsBefore);
});

test('a custom continuous window reports its dates of the one run; a link restores it', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/#/portfolio/n-original?window=custom&from=2026-11-02&to=2026-11-25&exec=continuous');
  await waitReplay(page);
  await expect(page.getByTestId('window-custom')).toBeVisible();
  await expect(page.getByTestId('window-execution-continuous')).toBeChecked();
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-from', '2026-11-02');
  await expect(page.getByTestId('window-effective')).toHaveAttribute('data-to', '2026-11-25');
  await expect(page.getByTestId('summary-reporting')).toBeVisible();
  expect(await value(page, 'summary-reporting-net')).toBe(-5697.9);
  // a date after the local data is refused in the form, before any request
  await page.getByTestId('window-to').fill('2099-12-31');
  await expect(page.getByTestId('window-error')).toContainText('latest common complete session');
  await expect(page.getByTestId('window-apply')).toBeDisabled();
});

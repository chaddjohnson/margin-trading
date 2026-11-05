// Growth 1.3.0 optional rules in the browser: the New Test form (the entry-method selector, the breakout's intrinsic
// inputs, the Rise inputs and persistent eligibility not applicable under the breakout, the initial risk stop and
// retention groups, all OFF by default), ONE run with the initial stop and retention (partial-exit markers, the Trades
// list and detail, the Analysis counts, the parameters), and a FAILED Interactive Preview that says plainly the chart
// and Analysis still belong to the previous successful result.

import { type Page, expect, test } from '@playwright/test';

import { hasData } from './console.ts';
import { chooseStrategy, tradingRun } from './helpers.ts';

let problems: string[] = [];
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
});
test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));

async function newGrowthTest(page: Page) {
  await page.goto('/');
  await page.getByTestId('new-test').click();
  await chooseStrategy(page, 'rise-from-recent-low-trading');
  return page.getByRole('dialog');
}

test('the form: entry method, the breakout’s intrinsic inputs, eligibility not applicable, the two exit options OFF', async ({ page }) => {
  const dialog = await newGrowthTest(page);
  const method = page.getByTestId('param-entryMethod');
  await expect(method).toHaveValue('rise_from_recent_low');
  await expect(page.getByTestId('param-advanceFromRecentLowPercent')).toBeVisible();
  await expect(page.getByTestId('param-breakoutSmaSessions')).toHaveCount(0);
  // the two exit options: OFF, their inputs hidden until switched on
  for (const [sw, inputs] of [
    ['initialStopEnabled', ['initialStopAtrSessions', 'initialStopAtrMultiple']],
    ['retentionEnabled', ['retentionSellPercent', 'retentionSmaSessions', 'retentionClosesBelow']]
  ] as const) {
    await expect(page.getByTestId(`param-${sw}`)).not.toBeChecked();
    for (const k of inputs) await expect(page.getByTestId(`param-${k}`)).toHaveCount(0);
    await page.getByTestId(`param-${sw}`).check();
    for (const k of inputs) await expect(page.getByTestId(`param-${k}`)).toBeVisible();
  }
  await expect(page.getByTestId('param-initialStopAtrSessions')).toHaveValue('20');
  await expect(page.getByTestId('param-initialStopAtrMultiple')).toHaveValue('3');
  await expect(page.getByTestId('param-retentionSellPercent')).toHaveValue('50');
  await expect(page.getByTestId('initial-stop-note')).toContainText('higher active level governs');
  await expect(page.getByTestId('retention-note')).toContainText('ONE closed trade');
  await expect(dialog.getByTestId('group-initialStop')).toContainText('Initial risk stop (optional)');
  await expect(dialog.getByTestId('group-retention')).toContainText('Retain part of profitable trend');
  // a bound is enforced in the form
  await page.getByTestId('param-retentionSellPercent').fill('100');
  await expect(dialog).toContainText('Fraction sold at the trailing-stop event: must be between 1 and 99');
  await expect(page.getByTestId('run-submit')).toBeDisabled();
  await page.getByTestId('param-retentionSellPercent').fill('50');
  await expect(page.getByTestId('run-submit')).toBeEnabled();

  // the breakout: its own inputs (intrinsic, separately labelled), the Rise inputs hidden, eligibility disabled
  await page.getByTestId('param-eligibilityEnabled').check();
  await method.selectOption('trend_breakout');
  await expect(page.getByTestId('param-advanceFromRecentLowPercent')).toHaveCount(0);
  await expect(page.getByTestId('param-breakoutSmaSessions')).toHaveValue('50');
  await expect(page.getByTestId('param-breakoutSlopeComparisonSessions')).toHaveValue('40');
  await expect(page.getByTestId('param-breakoutPriorHighSessions')).toHaveValue('20');
  await expect(dialog.getByTestId('group-entry')).toContainText('intrinsic');
  await expect(page.getByTestId('breakout-note')).toContainText('separate, additional gate');
  await expect(page.getByTestId('param-eligibilityEnabled')).toBeDisabled();
  await expect(page.getByTestId('eligibility-not-applicable')).toContainText('Not applicable with the breakout entry method');
  await expect(dialog.getByTestId('group-trend')).toContainText('additional gate');
  // back to the Rise entry: its inputs and eligibility return (drafts kept)
  await method.selectOption('rise_from_recent_low');
  await expect(page.getByTestId('param-advanceFromRecentLowPercent')).toHaveValue('5');
  await expect(page.getByTestId('param-eligibilityEnabled')).toBeEnabled();
  await expect(page.getByTestId('eligibility-not-applicable')).toHaveCount(0);
});

test('(real data) one run with the initial stop and retention: partial exits on the chart, in Trades and Analysis', async ({ page }) => {
  test.skip(!hasData, 'needs the local market data');
  const id = await tradingRun(page, 'E2E optional rules VGT', ['VGT'], {
    advanceFromRecentLowPercent: 8,
    recentLowLookbackBars: 60,
    trailingStopPercent: 4,
    maximumHoldDays: 15,
    initialStopEnabled: true,
    initialStopAtrSessions: 20,
    initialStopAtrMultiple: 3,
    retentionEnabled: true,
    retentionSellPercent: 50,
    retentionSmaSessions: 50,
    retentionClosesBelow: 2
  }, { from: '2016-01-04', to: '2023-12-29' });
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await expect(page.getByTestId('strategy-version')).toHaveText('Growth v1.3.0');
  // the chart: partial exits are executed exits with their own half-filled glyph, named in the legend
  await expect(page.getByTestId('legend-partial')).toBeVisible();
  const events = ((await (await page.request.get(`/api/runs/${id}/events?symbol=VGT`)).json()) as { events: { id: string; kind: string; meta: Record<string, unknown>; tradeId: string | null; t: string }[] }).events;
  const partials = events.filter((e) => e.meta.partial === true);
  expect(partials.length).toBeGreaterThan(0);
  // the Trades list: one row per position, "+ 1 partial" on those with a partial sale; the detail lists the fill
  const table = page.getByTestId('trade-table-A');
  const badge = table.getByTestId('trade-partials').first();
  await expect(badge).toContainText('+ 1 partial');
  await badge.click();
  await expect(page.getByTestId('trade-detail-partial')).toContainText('sold');
  await expect(page.getByTestId('trade-detail-initial-stop')).toContainText('fixed');
  const positions = events.filter((e) => e.kind === 'executed_entry').length;
  await expect(page.getByTestId('trade-count-A')).toHaveText(`${positions} trades`); // positions, not fills
  // Analysis: the optional-rules counts; Parameters: the switches and their inputs
  await expect(page.getByTestId('metric-retention')).toContainText('position(s) with a partial sale');
  await expect(page.getByTestId('metric-initial-stop')).toContainText('protected');
  await expect(page.getByTestId('metric-entry-method')).toContainText('Rise from recent low');
  const params = page.getByTestId('parameters');
  await expect(params).toContainText('Initial risk stop');
  await expect(params).toContainText('Retain part of profitable trend');
  // a partial-exit marker carries the partial flag and its tooltip label
  const marker = page.locator('button.marker[data-partial="true"]').first();
  if (await marker.count()) await expect(marker).toHaveAttribute('aria-label', /Executed exit \(partial\)/);
});

test('(real data) a failed preview says the chart and Analysis still show the previous successful result', async ({ page }) => {
  test.skip(!hasData, 'needs the local market data');
  const id = await tradingRun(page, 'E2E failed preview source', ['VGT'], {}, { from: '2022-01-03', to: '2023-12-29' });
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await page.getByTestId('preview-toggle').click();
  await expect(page.getByTestId('preview-panel')).toBeVisible();
  // the server's answer for this submission: a failed execution (simulated; nothing runs)
  await page.route(/\/api\/previews$/, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ticket: 'T-e2e',
        previewId: `PV-${'0'.repeat(64)}`,
        state: 'failed',
        cacheHit: false,
        coalesced: false,
        progress: null,
        error: 'the runner failed (simulated)',
        timing: { identityMs: 1, executionMs: null, waitedMs: 0 }
      })
    });
  });
  const before = await page.getByTestId('metric-total').first().innerText();
  await page.getByTestId('pv-param-advanceFromRecentLowPercent').fill('9');
  await page.getByTestId('preview-run').click();
  await expect(page.getByTestId('preview-status')).toHaveAttribute('data-state', 'error');
  const banner = page.getByTestId('preview-failed-banner');
  await expect(banner).toContainText('Preview failed — not applied');
  await expect(banner).toContainText(`the saved result ${id}`);
  await expect(banner).toContainText('NOT the configuration that failed');
  await expect(page.getByTestId('preview-error-shown')).toContainText(`still show the saved result ${id}`);
  await expect(page.getByTestId('preview-banner')).toHaveCount(0); // no preview is displayed
  await expect(page.getByTestId('metric-total').first()).toHaveText(before); // the Analysis is unchanged
  // putting the displayed values back clears the error
  await page.getByTestId('preview-reset').click();
  await expect(page.getByTestId('preview-failed-banner')).toHaveCount(0);
});

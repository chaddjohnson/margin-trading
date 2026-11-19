// The trading backtest in the browser: the strategy choice, rule switches with defaults, units and the buffer → hold
// dependency, the hold-off warning, no restriction / reset / optimiser control; then (real data) ONE Run Test with the
// defaults, its executed entry and exit markers, trade ledger and metrics in Eastern time, a clone to X = 6% as a new
// run with the old one unchanged, a hold-off run saved as such, and VGT/GDX isolation of a two-symbol run.

import { type Page, expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { chooseStrategy } from './helpers.ts';

const REPO = join(import.meta.dirname, '..', '..', '..');
const hasData = ['VGT', 'GDX'].every((s) => existsSync(join(REPO, `data/${s}/data.csv`)));

let problems: string[] = [];
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
});
test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));

const openTradingDialog = async (page: Page) => {
  await page.goto('/');
  await expect(page.getByTestId('run-id')).toBeVisible();
  await page.getByTestId('new-test').click();
  await expect(page.getByTestId('strategy-picker')).toHaveAttribute('data-value', 'rise-from-recent-low'); // the signal-only default
  await chooseStrategy(page, 'rise-from-recent-low-trading');
  return page.getByTestId('run-dialog');
};
type Run = {
  id: string;
  status: string;
  variation: { id: string };
  params: { key: string; label: string; value: unknown }[];
  artifact: { sha256: string };
  symbols: string[];
};
const getRun = async (page: Page, id: string) => (await (await page.request.get(`/api/runs/${id}`)).json()) as Run;
const runCount = async (page: Page) =>
  ((await (await page.request.get('/api/runs?limit=500')).json()) as unknown[]).length;
const submitAndWait = async (page: Page, previous: string) => {
  await page.getByTestId('run-submit').click();
  await expect(page.getByTestId('run-id')).not.toHaveText(previous);
  await expect(page.getByTestId('run-status')).toHaveText('completed', { timeout: 120_000 });
  return (await page.getByTestId('run-id').innerText()).trim();
};

test('New test offers the trading backtest with its switches, defaults, units, dependency and warning', async ({
  page
}) => {
  const dialog = await openTradingDialog(page);
  await expect(dialog.getByTestId('strategy-notes')).toContainText('$100,000');
  await expect(page.getByTestId('param-advanceFromRecentLowPercent')).toHaveValue('5');
  await expect(page.getByTestId('param-recentLowLookbackBars')).toHaveValue('20');
  await expect(page.getByTestId('param-resolution')).toHaveValue('1d');
  await expect(page.getByTestId('param-trailingStopPercent')).toHaveValue('7.3');
  await expect(page.getByTestId('param-maximumHoldEnabled')).toBeChecked();
  await expect(page.getByTestId('param-maximumHoldDays')).toHaveValue('8');
  await expect(page.getByTestId('param-intradayLossBufferEnabled')).toBeChecked();
  await expect(page.getByTestId('param-intradayLossBufferPercent')).toHaveValue('2.9');
  await expect(page.getByTestId('param-costBpsPerSide')).toHaveValue('5');
  await expect(dialog.getByTestId('group-exit')).toContainText('always on');
  await expect(dialog.getByTestId('group-exit')).toContainText('calendar days');
  await expect(dialog.getByTestId('group-exit')).toContainText('−$2,900');
  // The trailing stop has no switch; there is no restriction, lower re-entry, reset or optimiser control.
  const inputs = await dialog
    .locator('input, select, button')
    .evaluateAll((els) => els.map((e) => `${(e as HTMLElement).dataset.testid ?? ''} ${e.textContent ?? ''}`));
  expect(inputs.some((t) => /trailingStopEnabled/.test(t))).toBe(false);
  // Growth 1.4.0's Drawdown Recovery Gate filters on the MARKET's decline (not a trade's loss): its one control shown
  // while OFF is exactly its switch; the guard applies to every other control.
  const gate = inputs.filter((t) => t.startsWith('param-drawdownRecoveryGateEnabled '));
  expect(gate).toHaveLength(1);
  expect(
    inputs
      .filter((t) => !gate.includes(t))
      .some((t) => /material|lowerPrice|reentry|recovery|retrace|reference|optimi|sweep|grid/i.test(t))
  ).toBe(false);

  // Hold OFF: the buffer switch is unticked and disabled, both values are kept but not applied, and a warning shows.
  await page.getByTestId('param-maximumHoldEnabled').uncheck();
  await expect(page.getByTestId('param-intradayLossBufferEnabled')).not.toBeChecked();
  await expect(page.getByTestId('param-intradayLossBufferEnabled')).toBeDisabled();
  await expect(page.getByTestId('param-maximumHoldDays')).toBeDisabled();
  await expect(page.getByTestId('param-maximumHoldDays')).toHaveValue('8');
  await expect(dialog.getByTestId('group-exit')).toContainText('saved, not applied');
  await expect(page.getByTestId('hold-off-warning')).toBeVisible();
  await expect(page.getByTestId('run-submit')).toBeEnabled(); // a valid configuration
  // Hold ON again: the buffer can be switched back on; the warning goes away.
  await page.getByTestId('param-maximumHoldEnabled').check();
  await expect(page.getByTestId('param-intradayLossBufferEnabled')).toBeEnabled();
  await page.getByTestId('param-intradayLossBufferEnabled').check();
  await expect(page.getByTestId('hold-off-warning')).toHaveCount(0);
  // Two symbols: independent standalone backtests, said so.
  await page.getByTestId('symbol-GDX').check();
  await expect(page.getByTestId('multi-symbol-note')).toContainText('independent standalone backtests');
  // An invalid value disables Run Test.
  await page.getByTestId('param-trailingStopPercent').fill('0');
  await expect(page.getByTestId('run-submit')).toBeDisabled();
});

test.describe('real data', () => {
  test.skip(!hasData, 'the git-ignored data/ files are not present');

  test('Run Test runs ONE trading backtest: executed markers, trades, metrics in ET; clone 5% → 6% keeps the old run', async ({
    page
  }) => {
    await openTradingDialog(page);
    await page.getByTestId('run-from').fill('2020-01-02');
    await page.getByTestId('run-to').fill('2020-12-31');
    await page.getByTestId('run-title').fill('e2e trading five');
    const before = await runCount(page);
    const previous = (await page.getByTestId('run-id').innerText()).trim();
    const firstId = await submitAndWait(page, previous);
    expect(await runCount(page)).toBe(before + 1); // one configuration, one run
    await expect(page.getByTestId('result-kind')).toContainText('TRADING BACKTEST');
    await expect(page.getByTestId('legend-trading-note')).toBeVisible();
    await expect(page.locator('button.marker[data-kind="executed_entry"]').first()).toBeVisible();
    await expect(page.locator('button.marker[data-kind="executed_exit"]').first()).toBeVisible();
    expect(
      await page
        .locator('button.marker')
        .evaluateAll((bs) => [...new Set(bs.map((b) => (b as HTMLElement).dataset.symbol))])
    ).toEqual(['VGT']);
    const rows = page.locator('[data-testid="trade-table-A"] tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(page.getByTestId('analysis-trading-A')).toBeVisible();
    await expect(page.getByTestId('metric-closed')).not.toHaveText('');
    await expect(page.getByTestId('metric-dd-minute')).toContainText('of $100,000');
    await expect(page.getByTestId('metric-signals')).toContainText(':');
    // A trade row selects its entry: Eastern time with EST/EDT, the fill price and the reason.
    await rows.first().click();
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', /:T-1:entry$/);
    await expect(page.getByTestId('detail-time')).toContainText(/E[SD]T/);
    await expect(page.getByTestId('event-detail')).toContainText('Bought');
    await expect(page.getByTestId('parameters')).toContainText('Maximum losing hold (switch)');
    const first = await getRun(page, firstId);

    // Clone into a new test: same strategy and values, X 5% → 6%.
    await page.getByTestId('clone-run').click();
    await expect(page.getByTestId('strategy-picker')).toHaveAttribute('data-value', 'rise-from-recent-low-trading');
    await expect(page.getByTestId('param-advanceFromRecentLowPercent')).toHaveValue('5');
    await expect(page.getByTestId('param-maximumHoldEnabled')).toBeChecked();
    await page.getByTestId('param-advanceFromRecentLowPercent').fill('6');
    await page.getByTestId('run-title').fill('e2e trading six');
    const secondId = await submitAndWait(page, firstId);
    const second = await getRun(page, secondId);
    expect(second.variation.id).not.toBe(first.variation.id);
    expect(second.params.find((p) => p.key === 'advanceFromRecentLowPercent')!.value).toBe(6);
    const firstAgain = await getRun(page, firstId);
    expect(firstAgain.params).toEqual(first.params); // the old run is unchanged …
    expect(firstAgain.artifact.sha256).toBe(first.artifact.sha256); // … and so are its results
    await page.goto(`/#/run/${firstId}`);
    await expect(page.locator('[data-testid="trade-table-A"] tbody tr').first()).toBeVisible();

    // Hold OFF (and with it the buffer): saved as such, and the run reports open exposure rather than a sale.
    await page.getByTestId('clone-run').click();
    await page.getByTestId('param-maximumHoldEnabled').uncheck();
    await page.getByTestId('run-title').fill('e2e trading hold off');
    const thirdId = await submitAndWait(page, firstId);
    const third = await getRun(page, thirdId);
    expect(third.params.find((p) => p.key === 'maximumHoldEnabled')!.value).toBe('OFF');
    expect(third.params.find((p) => p.key === 'intradayLossBufferEnabled')!.value).toBe('OFF');
    expect(third.params.find((p) => p.key === 'maximumHoldDays')!.label).toMatch(/not applied/);
    await expect(page.getByTestId('parameters')).toContainText('OFF: no loss exit');
    await expect(page.getByTestId('metric-exit-reasons')).not.toContainText('maximum hold');
  });

  test('a two-symbol trading run: each tab shows only its own symbol’s trades and markers', async ({ page }) => {
    await openTradingDialog(page);
    await page.getByTestId('symbol-GDX').check();
    await page.getByTestId('run-from').fill('2021-01-04');
    await page.getByTestId('run-to').fill('2021-12-31');
    await page.getByTestId('run-title').fill('e2e trading two symbols');
    const id = await submitAndWait(page, (await page.getByTestId('run-id').innerText()).trim());
    for (const symbol of ['VGT', 'GDX']) {
      await page.goto(`/#/run/${id}?symbol=${symbol}`);
      await expect(page.locator('button.marker').first()).toBeVisible();
      expect(
        await page
          .locator('button.marker')
          .evaluateAll((bs) => [...new Set(bs.map((b) => (b as HTMLElement).dataset.symbol))])
      ).toEqual([symbol]);
      const trs = page.locator('[data-testid="trade-table-A"] tbody tr');
      if ((await trs.count()) > 0)
        expect(await trs.evaluateAll((rs) => [...new Set(rs.map((r) => (r as HTMLElement).dataset.symbol))])).toEqual([
          symbol
        ]);
      await expect(page.getByTestId(`trading-metrics-${symbol}`)).toBeVisible();
    }
  });
});

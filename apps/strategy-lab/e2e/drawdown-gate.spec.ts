// Growth 1.4.0 Drawdown Recovery Gate in the browser: the New Test form (one switch, OFF by default, its four inputs only
// when ON, the notes, a bound), ONE real-data run with the gate and persistent eligibility ON (the version, the Analysis
// counts, the parameters, a latched entry decided at the gate's release in the Trades list), and the gate in the
// Interactive Preview panel (a registry-driven control; switching it changes the configuration; no saved run created).

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

const INPUTS = ['dipLookbackSessions', 'dipThresholdPercent', 'recoveryRetracementPercent', 'recoveryConfirmationSessions'];
const GATE_ON = {
  drawdownRecoveryGateEnabled: true,
  dipLookbackSessions: 30,
  dipThresholdPercent: 5,
  recoveryRetracementPercent: 70,
  recoveryConfirmationSessions: 2,
  eligibilityEnabled: true,
  eligibilityPolicy: 'time_limited',
  eligibilityMaxAgeSessions: 10
};
const runs = async (page: Page) => ((await (await page.request.get('/api/runs?limit=500')).json()) as { id: string }[]).map((r) => r.id);

test('the form: the Drawdown Recovery Gate OFF by default, its inputs only ON, the notes and a bound', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-test').click();
  await chooseStrategy(page, 'rise-from-recent-low-trading');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('group-drawdownGate')).toContainText('Drawdown Recovery Gate (optional)');
  await expect(dialog.getByTestId('group-drawdownGate')).toContainText('never an entry signal');
  const sw = page.getByTestId('param-drawdownRecoveryGateEnabled');
  await expect(sw).not.toBeChecked();
  for (const k of INPUTS) await expect(page.getByTestId(`param-${k}`)).toHaveCount(0);
  await sw.check();
  await expect(page.getByTestId('param-dipLookbackSessions')).toHaveValue('30');
  await expect(page.getByTestId('param-dipThresholdPercent')).toHaveValue('5');
  await expect(page.getByTestId('param-recoveryRetracementPercent')).toHaveValue('70');
  await expect(page.getByTestId('param-recoveryConfirmationSessions')).toHaveValue('2');
  await expect(page.getByTestId('drawdown-gate-note')).toContainText('never opens a trade by itself');
  await expect(page.getByTestId('drawdown-gate-eligibility-off')).toContainText('never replayed');
  // with persistent eligibility ON the "never replayed" note gives way
  await page.getByTestId('param-eligibilityEnabled').check();
  await expect(page.getByTestId('drawdown-gate-eligibility-off')).toHaveCount(0);
  // bounds: the retracement in (0, 100] (100 allowed), Y = 0 allowed
  await page.getByTestId('param-recoveryRetracementPercent').fill('0');
  await expect(dialog).toContainText('Required retracement (r): must be between 0.1 and 100');
  await expect(page.getByTestId('run-submit')).toBeDisabled();
  await page.getByTestId('param-recoveryRetracementPercent').fill('100');
  await page.getByTestId('param-recoveryConfirmationSessions').fill('0');
  await expect(page.getByTestId('run-submit')).toBeEnabled();
  // OFF again: the inputs are hidden (kept as drafts)
  await sw.uncheck();
  for (const k of INPUTS) await expect(page.getByTestId(`param-${k}`)).toHaveCount(0);
  await sw.check();
  await expect(page.getByTestId('param-recoveryRetracementPercent')).toHaveValue('100');
});

test('(real data) one run with the gate and eligibility ON: Analysis, parameters, a release-decided entry; the preview panel', async ({ page }) => {
  test.skip(!hasData, 'needs the local market data');
  const id = await tradingRun(page, 'E2E drawdown gate VGT', ['VGT'], GATE_ON, { from: '2016-01-04', to: '2017-12-29' });
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await expect(page.getByTestId('strategy-version')).toHaveText('Growth v1.4.0');
  // Analysis: the gate's descriptive counts
  await expect(page.getByTestId('metric-dd-episodes')).toContainText(/^\d+ · \d+ \(\d+\)/);
  await expect(page.getByTestId('metric-dd-deferred')).toContainText(/\d+ of \d+ · \d+/);
  await expect(page.getByTestId('metric-dd-state')).toContainText('recovery required');
  const params = page.getByTestId('parameters');
  await expect(params).toContainText('Drawdown Recovery Gate');
  await expect(params).toContainText('Required retracement (r)');
  // a latched entry decided at the gate's release (VGT 2016-05-27 09:31 ET), labelled in the Trades list
  const events = ((await (await page.request.get(`/api/runs/${id}/events?symbol=VGT`)).json()) as { events: { kind: string; meta: Record<string, unknown> }[] }).events;
  expect(events.some((e) => e.kind === 'executed_entry' && e.meta.via === 'drawdown_release')).toBe(true);
  await expect(page.getByTestId('trade-table-A')).toContainText('at the drawdown-gate release');

  // Interactive Preview: the gate is a registry-driven control of the compact panel
  const before = await runs(page);
  await page.getByTestId('preview-toggle').click();
  const panel = page.getByTestId('preview-panel');
  await expect(panel).toBeVisible();
  const sw = panel.getByTestId('pv-param-drawdownRecoveryGateEnabled');
  await expect(sw).toBeChecked();
  for (const k of INPUTS) await expect(panel.getByTestId(`pv-param-${k}`)).toBeVisible();
  await sw.uncheck();
  for (const k of INPUTS) await expect(panel.getByTestId(`pv-param-${k}`)).toHaveCount(0);
  await expect(page.getByTestId('preview-status')).toHaveAttribute('data-state', 'modified');
  await page.getByTestId('preview-run').click();
  await expect(page.getByTestId('preview-status')).toHaveAttribute('data-state', /ready|cache-hit/, { timeout: 120_000 });
  await expect(page.getByTestId('preview-banner')).toBeVisible();
  // the gate OFF: its Analysis section disappears from the preview's figures
  await expect(page.getByTestId('metric-dd-episodes')).toHaveCount(0);
  expect(await runs(page)).toEqual(before); // a preview never creates a saved run
});

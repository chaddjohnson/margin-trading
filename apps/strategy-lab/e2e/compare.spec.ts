// (real data) The descriptive comparison of two existing runs: continuation ON against an otherwise identical OFF run
// is comparable and shows the metrics side by side with B − A and the non-additivity caveat; a pair that differs in
// its window is flagged as not comparable. Nothing is launched by comparing.

import { expect, test } from '@playwright/test';

import { failOnConsoleProblems, hasData } from './console.ts';
import { tradingRun } from './helpers.ts';

failOnConsoleProblems();

const CLASSIC = { continuationEnabled: true, continuationMethod: 'classic_d1', continuationWindowSessions: 60, classicPullbackPercent: 9, classicReboundPercent: 0.3 };

test('(real data) ON vs OFF: comparable, side by side, non-additive; a different window is flagged', async ({ page }) => {
  test.skip(!hasData, 'needs the local market data');
  const window = { from: '2018-01-02', to: '2020-12-31' };
  const off = await tradingRun(page, 'e2e compare OFF VGT 2018–2020', ['VGT'], {}, window);
  const on = await tradingRun(page, 'e2e compare ON VGT 2018–2020', ['VGT'], CLASSIC, window);
  const other = await tradingRun(page, 'e2e losses VGT 2023', ['VGT']);
  const count = async () => ((await (await page.request.get('/api/runs?limit=500')).json()) as unknown[]).length;
  const runsBefore = await count();
  await page.goto(`/#/run/${off}?symbol=VGT&compare=${on}`);
  const panel = page.getByTestId('comparison');
  await expect(page.getByTestId('comparison-verdict')).toContainText('methodologically comparable');
  await expect(page.getByTestId('comparison-metrics')).toContainText('Total marked net');
  await expect(page.getByTestId('comparison-metrics')).toContainText('Max drawdown, minute marks');
  await expect(page.getByTestId('comparison-nonadditivity')).toContainText('path-dependent counterfactual');
  await expect(panel).toContainText('OFF');
  await expect(panel).toContainText('ON (classic_d1)');
  await page.goto(`/#/run/${off}?symbol=VGT&compare=${other}`);
  await expect(page.getByTestId('comparison-verdict')).toContainText('NOT comparable');
  await expect(page.getByTestId('comparison-mismatches')).toContainText('window');
  expect(await count()).toBe(runsBefore); // comparing never starts a run
});

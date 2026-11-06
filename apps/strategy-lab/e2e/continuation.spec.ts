// Growth continuation entries in the browser: OFF by default; the method choice shows only that method's inputs;
// drafts survive switching; the pullback-band rule is enforced in the form; then (real data) ONE Classic D1 run whose
// continuation entries are attributed in the Trades list and whose research bundle downloads and verifies.

import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readZip } from '../server/zip.ts';
import { failOnConsoleProblems, hasData } from './console.ts';
import { chooseStrategy } from './helpers.ts';

failOnConsoleProblems();

const METHOD_FIELDS: Record<string, string[]> = {
  classic_d1: ['classicPullbackPercent', 'classicReboundPercent'],
  breakout: ['breakoutBufferPercent', 'breakoutFormationBars'],
  shallow_pullback: ['uptrendSmaBars', 'uptrendSlopeBars', 'uptrendMinimumRisePercent', 'pullbackMinimumPercent', 'pullbackMaximumPercent', 'recoveryPercent'],
  ma_cross: ['crossSmaBars', 'crossRisingBars', 'crossMinimumSlopePercent', 'crossMarginPercent']
};

test('the Growth form: continuation OFF by default, method-specific inputs only, drafts kept, band rule enforced', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('run-id')).toBeVisible();
  await page.getByTestId('new-test').click();
  await chooseStrategy(page, 'rise-from-recent-low-trading');
  const dialog = page.getByTestId('run-dialog');
  await expect(dialog.getByRole('combobox', { name: 'Strategy to test' })).toContainText('Growth');
  await expect(dialog).not.toContainText('Rise from recent low (trading backtest)');
  const enable = page.getByTestId('param-continuationEnabled');
  await expect(enable).not.toBeChecked();
  await expect(page.getByTestId('param-continuationMethod')).toHaveCount(0);
  await expect(page.getByTestId('param-continuationWindowSessions')).toHaveCount(0);
  for (const keys of Object.values(METHOD_FIELDS)) for (const k of keys) await expect(page.getByTestId(`param-${k}`)).toHaveCount(0);

  await enable.check();
  await expect(page.getByTestId('param-continuationMethod')).toHaveValue('classic_d1');
  await expect(page.getByTestId('param-continuationWindowSessions')).toHaveValue('60');
  await expect(dialog.getByTestId('group-continuation')).toContainText('trading sessions');
  for (const [method, keys] of Object.entries(METHOD_FIELDS)) {
    await page.getByTestId('param-continuationMethod').selectOption(method);
    for (const [other, otherKeys] of Object.entries(METHOD_FIELDS))
      for (const k of otherKeys) await expect(page.getByTestId(`param-${k}`)).toHaveCount(other === method ? 1 : 0);
    expect(keys.length).toBeGreaterThan(0);
  }
  // a draft of one method survives switching to another and back
  await page.getByTestId('param-continuationMethod').selectOption('classic_d1');
  await page.getByTestId('param-classicPullbackPercent').fill('6');
  await page.getByTestId('param-continuationMethod').selectOption('breakout');
  await page.getByTestId('param-continuationMethod').selectOption('classic_d1');
  await expect(page.getByTestId('param-classicPullbackPercent')).toHaveValue('6');
  // the cross-field rule of the shallow pullback, checked in the form (and on the server)
  await page.getByTestId('param-continuationMethod').selectOption('shallow_pullback');
  await page.getByTestId('param-pullbackMinimumPercent').fill('8');
  await expect(page.getByTestId('cross-errors')).toContainText('minimum pullback must be below the maximum');
  await expect(page.getByTestId('run-submit')).toBeDisabled();
  await page.getByTestId('param-pullbackMinimumPercent').fill('2');
  await expect(page.getByTestId('cross-errors')).toHaveCount(0);
  await enable.uncheck();
  await expect(page.getByTestId('param-continuationMethod')).toHaveCount(0);
  await expect(page.getByTestId('run-submit')).toBeEnabled();
});

test('(real data) one Classic D1 run: attributed continuation entries, applied parameters, a verified bundle', async ({ page }) => {
  test.skip(!hasData, 'needs the local market data');
  await page.goto('/');
  await expect(page.getByTestId('run-id')).toBeVisible();
  const before = (await page.getByTestId('run-id').innerText()).trim();
  await page.getByTestId('new-test').click();
  await chooseStrategy(page, 'rise-from-recent-low-trading');
  await page.getByTestId('param-continuationEnabled').check();
  await page.getByTestId('run-from').fill('2016-01-04');
  await page.getByTestId('run-to').fill('2023-12-29');
  await page.getByTestId('run-title').fill('e2e continuation classic VGT 2016–2023');
  await page.getByTestId('run-submit').click();
  await expect(page.getByTestId('run-id')).not.toHaveText(before);
  await expect(page.getByTestId('run-status')).toHaveText('completed', { timeout: 120_000 });
  const id = (await page.getByTestId('run-id').innerText()).trim();
  await expect(page.getByTestId('strategy-version')).toHaveText('Growth v1.4.0');

  const table = page.getByTestId('trade-table-A');
  await expect(table.getByTestId('trade-origin').filter({ hasText: 'continuation · Classic D1' }).first()).toBeVisible();
  await expect(table.getByTestId('trade-origin').filter({ hasText: 'base Growth' }).first()).toBeVisible();
  const params = page.getByTestId('parameters');
  await expect(params).toContainText('Classic D1: pullback + trailing rebound (classic_d1)');
  await expect(params).toContainText('Continuation entries');

  const download = page.waitForEvent('download');
  await page.getByTestId('export-bundle').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`strategy-lab-${id}.zip`);
  const path = join(mkdtempSync(join(tmpdir(), 'e2e-bundle-')), file.suggestedFilename());
  await file.saveAs(path);
  await expect(page.getByTestId('export-status')).toContainText(`strategy-lab-${id}.zip`);
  const zip = readZip(readFileSync(path));
  const manifest = JSON.parse(zip.get('manifest.json')!.toString()) as { files: Record<string, { sha256: string }> };
  for (const [name, m] of Object.entries(manifest.files))
    expect(createHash('sha256').update(zip.get(name)!).digest('hex'), name).toBe(m.sha256);
  expect(zip.get('continuation-episodes.csv')!.toString()).toContain('classic_d1');
  expect(zip.get('trades.csv')!.toString()).toContain('continuation,classic_d1');
});

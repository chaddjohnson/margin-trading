// The phenotype catalogue: find a phenotype by study/strategy/symbol/role/id, inspect its locked configuration and
// exposure, run ONE test of it (an edit = a derived variation, labelled), see the provenance on the run; and (real
// data) the shared-slot pool phenotype: locked books and start, one allocator replay.

import { expect, test } from '@playwright/test';

import { failOnConsoleProblems, hasData } from './console.ts';

failOnConsoleProblems();

test('catalogue: filter, inspect and run ONE Growth phenotype with an edit (a derived variation)', async ({ page }) => {
  await page.goto('/#/phenotypes');
  const table = page.getByTestId('phenotype-table');
  await expect(table.locator('tbody tr[data-phenotype]')).toHaveCount(6);
  await page.getByTestId('phenotype-filter-role').selectOption('balanced');
  await expect(table.locator('tbody tr[data-phenotype]')).toHaveCount(1);
  await page.getByTestId('phenotype-filter-role').selectOption('');
  await page.getByTestId('phenotype-filter-strategy').selectOption('rise-from-recent-low-trading');
  await expect(table.locator('tbody tr[data-phenotype]')).toHaveCount(5);
  await page.getByTestId('phenotype-search').fill('classic');
  await expect(table.locator('tbody tr[data-phenotype]')).toHaveCount(1);
  await table.locator('tbody tr[data-phenotype]').first().click();
  const detail = page.getByTestId('phenotype-detail');
  await expect(detail).toContainText('growth-demo-2026-11/classic-d1-vgt-1d');
  await expect(page.getByTestId('phenotype-params')).toContainText('Classic D1: pullback + trailing rebound');
  await expect(detail).toContainText('not selected on data');
  await expect(page).toHaveURL(/#\/phenotype\/PH-\d{4}$/);

  await page.getByTestId('run-phenotype').click();
  const dialog = page.getByTestId('run-dialog');
  await expect(dialog.getByRole('heading')).toContainText('Run phenotype PH-');
  await expect(dialog.getByTestId('phenotype-origin')).toContainText('growth-demo-2026-11');
  await expect(page.getByTestId('param-continuationEnabled')).toBeChecked();
  await expect(page.getByTestId('param-continuationMethod')).toHaveValue('classic_d1');
  await expect(page.getByTestId('phenotype-edited')).toHaveCount(0);
  await page.getByTestId('param-classicPullbackPercent').fill('6');
  await expect(page.getByTestId('phenotype-edited')).toContainText('NEW variation derived from');
  await page.getByTestId('run-from').fill('2023-01-03');
  await page.getByTestId('run-to').fill('2023-06-30');
  await page.getByTestId('run-title').fill('e2e phenotype classic edited');
  await page.getByTestId('run-submit').click();
  await expect(page.getByTestId('phenotype-badge')).toHaveText(/PHENOTYPE PH-\d{4} · EDITED/);
  await expect(page.getByTestId('run-phenotype')).toContainText('edited: a derived variation');
  if (hasData) await expect(page.getByTestId('run-status')).toHaveText('completed', { timeout: 120_000 });
  const runId = (await page.getByTestId('run-id').innerText()).trim();
  await page.getByTestId('run-phenotype').getByRole('link').click();
  await expect(page.getByTestId('phenotype-runs')).toContainText(runId);
});

test('(real data) the shared-slot pool phenotype: locked books and start, one allocator replay', async ({ page }) => {
  test.skip(!hasData, 'needs the local market data');
  await page.goto('/#/phenotypes');
  await page.getByTestId('phenotype-filter-strategy').selectOption('study8-d1-pool');
  await page.getByTestId('phenotype-table').locator('tbody tr[data-phenotype]').first().click();
  await expect(page.getByTestId('phenotype-pool')).toContainText('VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d');
  await expect(page.getByTestId('phenotype-capability')).toContainText('one allocator replay');
  await page.getByTestId('run-phenotype').click();
  await expect(page.getByTestId('pool-config')).toContainText('ONE shared funded $100,000 slot');
  await expect(page.getByTestId('run-from')).toBeDisabled();
  await expect(page.getByTestId('run-from')).toHaveValue('2016-01-04');
  await expect(page.getByTestId('param-advanceFromRecentLowPercent')).toHaveCount(0);
  await expect(page.getByTestId('study-test-warning')).toContainText('NOT another independent holdout');
  await page.getByTestId('run-to').fill('2026-10-29');
  await page.getByTestId('run-submit').click();
  await expect(page.getByTestId('run-status')).toHaveText('completed', { timeout: 120_000 });
  await expect(page.getByTestId('result-kind')).toHaveText('SHARED-SLOT POOL · ONE ALLOCATOR REPLAY');
  await expect(page.getByTestId('symbol-tabs')).toContainText('GDX');
  await expect(page.getByTestId('clone-run')).toHaveCount(0); // a pool rerun is repeated from the catalogue only
});

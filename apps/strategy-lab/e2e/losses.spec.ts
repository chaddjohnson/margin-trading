// "Closed losses only" in the Trades list: only closed trades with a recorded net P&L below zero (after costs and
// interest), counts and an empty state, chart markers untouched, a chart-selected trade hidden by the filter explained
// with a one-click way back — for a Growth run and, per symbol, for the imported vg-balanced pool.

import { expect, test } from '@playwright/test';

import { failOnConsoleProblems, hasData } from './console.ts';
import { eventsOf, tradingRun } from './helpers.ts';

failOnConsoleProblems();

const lossesOf = (events: Awaited<ReturnType<typeof eventsOf>>) =>
  events.filter((e) => e.kind === 'executed_exit' && (e.values.find((v) => v.key === 'net')?.value as number) < 0).map((e) => e.tradeId);

test('(real data) Growth: strict realised losers, counts, markers kept, a hidden selection explained', async ({ page }) => {
  test.skip(!hasData, 'needs the local market data');
  const id = await tradingRun(page, 'e2e losses VGT 2023', ['VGT']);
  const events = await eventsOf(page, id, 'VGT');
  const losers = lossesOf(events);
  const total = new Set(events.filter((e) => e.kind === 'executed_entry').map((e) => e.tradeId)).size;
  expect(losers.length).toBeGreaterThan(0);
  await page.goto(`/#/run/${id}?symbol=VGT`);
  await expect(page.getByTestId('trade-count-A')).toHaveText(`${total} trades`);
  const markers = await page.locator('button.marker').count();
  await page.getByTestId('losses-only-A').check();
  await expect(page.getByTestId('trade-count-A')).toHaveText(`${losers.length} of ${total} trades: closed with a net loss`);
  const rows = page.getByTestId('trade-table-A').locator('tbody tr');
  await expect(rows).toHaveCount(losers.length);
  expect(await rows.evaluateAll((rs) => rs.map((r) => (r as HTMLElement).dataset.trade))).toEqual(losers);
  expect(await page.locator('button.marker').count()).toBe(markers); // the chart is not filtered

  // select a PROFITABLE trade from its exit marker: hidden by the filter, explained, one click shows it again
  const winner = events.find((e) => e.kind === 'executed_exit' && (e.values.find((v) => v.key === 'net')?.value as number) > 0)!;
  await page.locator(`button.marker[data-event-id="${winner.id}"]`).click();
  await expect(page.getByTestId('hidden-selection-A')).toContainText(`${winner.tradeId} is hidden`);
  await expect(page.getByTestId('hidden-selection-A')).toContainText('net profit');
  await expect(page.getByTestId('trade-detail')).toHaveAttribute('data-trade-key', `A:VGT:${winner.tradeId}`);
  await page.getByTestId('show-all-A').click();
  await expect(page.getByTestId('losses-only-A')).not.toBeChecked();
  await expect(page.getByTestId('trade-table-A').locator(`tr[data-trade="${winner.tradeId}"]`)).toHaveAttribute('aria-selected', 'true');
  // selection from an entry marker of a loser keeps working while filtered
  await page.getByTestId('losses-only-A').check();
  await page.locator(`button.marker[data-event-id="VGT:${losers[0]}:entry"]`).click();
  await expect(page.getByTestId('trade-table-A').locator(`tr[data-trade="${losers[0]}"]`)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('hidden-selection-A')).toHaveCount(0);
});

test('the imported vg-balanced pool: the filter per symbol, open lot excluded', async ({ page }) => {
  const runs = (await (await page.request.get('/api/runs?q=vg-balanced')).json()) as { id: string; kind: string }[];
  const run = runs.find((r) => r.kind === 'import');
  test.skip(!run, 'no local Study 8 vg-balanced replay to import');
  for (const symbol of ['GDX', 'VGT']) {
    const events = await eventsOf(page, run!.id, symbol);
    const losers = lossesOf(events);
    await page.goto(`/#/run/${run!.id}?symbol=${symbol}`);
    await page.getByTestId('losses-only-A').check();
    const rows = page.getByTestId('trade-table-A').locator('tbody tr[data-trade]');
    await expect(rows).toHaveCount(losers.length);
    expect(await rows.evaluateAll((rs) => rs.map((r) => (r as HTMLElement).dataset.symbol))).toEqual(losers.map(() => symbol));
    if (losers.length === 0) await expect(page.getByTestId('trade-empty-A')).toBeVisible();
  }
});

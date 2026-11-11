// Priority 6 acceptance in the browser: the five pooled portfolio candidates (docs/strategy-lab/POOLED_CANDIDATES.md).
// Real data only (skipped without data/VGT and data/GDX). Each candidate is replayed once by the e2e server (one shared
// $100,000 pool, the research engine) and then served from its replay cache.
import { type Page, expect, test } from '@playwright/test';

import { failOnConsoleProblems, hasData } from './console.ts';
import { chooseChart } from './helpers.ts';

test.skip(!hasData, 'needs the canonical VGT and GDX minute data');
failOnConsoleProblems();

const TARGETS: Record<string, { name: string; net: number; dd: number; val: number; symbols: string[] }> = {
  'l0-primary': { name: 'New L0 primary', net: 479605.18, dd: 20385.99, val: 96883.72, symbols: ['VGT', 'GDX'] },
  'c4-refined': { name: 'C4-refined', net: 452082.36, dd: 19477.66, val: 91512.65, symbols: ['VGT', 'GDX'] },
  c4: { name: 'Original C4', net: 401867.24, dd: 21536.85, val: 99081.34, symbols: ['VGT', 'GDX'] },
  'vgt-d1-g4': { name: 'VGT-only: D1 primary + Growth #4', net: 271525.33, dd: 19534.41, val: 66585.12, symbols: ['VGT'] },
  'vgt-d1-g085': { name: 'VGT-only: D1 primary + Growth 08500a60', net: 252359.65, dd: 19556.63, val: 60551.2, symbols: ['VGT'] }
};

const markers = (page: Page) => page.locator('[data-testid=price-chart] .marker');
const summaryOf = async (page: Page) => ({
  net: Number(await page.getByTestId('summary-net').getAttribute('data-value')),
  dd: Number(await page.getByTestId('summary-dd').getAttribute('data-value')),
  val: Number(await page.getByTestId('summary-validation-net').getAttribute('data-value')),
  positions: await page.getByTestId('summary-positions-count').textContent()
});
/** Chooses a period viewport with the pointer (a segmented control: the label takes the click). */
const choosePeriod = async (page: Page, period: 'all' | 'development' | 'validation') => {
  await page.getByTestId('chart-period').locator('label', { hasText: period === 'all' ? 'Full run' : period === 'development' ? '2016–2024' : '2025–2026' }).click();
  await expect(page.getByTestId(`chart-period-${period}`)).toBeChecked();
};
/** The markers of ONE symbol's chart (after a tab switch the outgoing chart's markers can still be attached). */
const symbolMarkers = (page: Page, sym: string) => page.locator(`[data-testid=price-chart] .marker[data-symbol=${sym}]`);
async function open(page: Page, id: string, symbol?: string) {
  await page.goto(`/#/portfolio/${id}${symbol ? `?symbol=${symbol}` : ''}`);
  await expect(page.getByTestId('candidate-title')).toHaveText(TARGETS[id]!.name);
  await expect(page.getByTestId('portfolio-summary')).toBeVisible({ timeout: 90_000 });
  await expect(markers(page).first()).toBeAttached({ timeout: 30_000 });
}

test('every candidate loads from the selector as ONE pooled replay with the archived figures and its symbol tabs', async ({ page }) => {
  test.setTimeout(300_000);
  const runsBefore = ((await (await page.request.get('/api/runs?limit=500')).json()) as unknown[]).length;
  await page.goto('/');
  await page.getByTestId('view-portfolios').click();
  await expect(page.getByTestId('candidate-selector')).toBeVisible();
  const order = await page.locator('[data-testid=candidate-selector] [role=radio]').evaluateAll((els) => els.map((e) => e.getAttribute('data-candidate')));
  expect(order).toEqual(['l0-primary', 'c4-refined', 'c4', 'vgt-d1-g4', 'vgt-d1-g085']);
  for (const [id, t] of Object.entries(TARGETS)) {
    await page.getByTestId(`candidate-${id}`).click();
    await expect(page.getByTestId(`candidate-${id}`)).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('candidate-title')).toHaveText(t.name);
    await expect(page.getByTestId('portfolio-summary')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('parity-badge')).toHaveAttribute('data-parity', 'verified');
    const s = await summaryOf(page);
    expect([s.net, s.dd, s.val]).toEqual([t.net, t.dd, t.val]);
    const tabs = await page.locator('[data-testid=symbol-tabs] [role=tab]').allTextContents();
    expect(tabs).toEqual(t.symbols);
    // each tab shows that symbol's executed events (both components where both trade it)
    for (const sym of t.symbols) {
      await page.getByTestId(`symbol-tab-${sym}`).click();
      await expect(page.getByTestId(`symbol-tab-${sym}`)).toHaveAttribute('aria-selected', 'true');
      await expect(symbolMarkers(page, sym).first()).toBeAttached({ timeout: 30_000 });
      await expect.poll(() => markers(page).evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-symbol')))])).toEqual([sym]);
      // tab switching never changes the pool's figures
      expect((await summaryOf(page)).net).toBe(t.net);
    }
  }
  // browsing created no saved run
  expect(((await (await page.request.get('/api/runs?limit=500')).json()) as unknown[]).length).toBe(runsBefore);
});

test('VGT tab of a VG candidate holds D1 and Growth trades, distinguished by their frames and the legend', async ({ page }) => {
  await open(page, 'l0-primary', 'VGT');
  const frames = await markers(page).evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-frame')))].sort());
  expect(frames).toEqual(['round', 'square']);
  await expect(page.getByTestId('show-D1')).toBeVisible();
  await expect(page.getByTestId('show-Growth')).toBeVisible();
  // GDX: D1 only (GDX Growth is OFF)
  await page.getByTestId('symbol-tab-GDX').click();
  await expect(symbolMarkers(page, 'GDX').first()).toBeAttached();
  await expect.poll(() => markers(page).evaluateAll((els) => [...new Set(els.map((e) => `${e.getAttribute('data-symbol')}:${e.getAttribute('data-frame')}`))])).toEqual(['GDX:square']);
  await expect(page.getByTestId('show-Growth')).toHaveCount(0);
});

test('08500a60: a real entry, partial exit and final exit match the ledger; the open remainder is marked, never closed', async ({ page }) => {
  await open(page, 'vgt-d1-g085');
  await expect(page.getByTestId('summary-partials')).toHaveText('3');
  // P-1: entry, one partial exit, the final exit — expandable executions in the ledger
  await page.getByTestId('expand-P-1').click();
  const fills = page.getByTestId('fills-P-1').locator('tr[data-fill]');
  await expect(fills).toHaveCount(3);
  expect(await fills.evaluateAll((rows) => rows.map((r) => r.getAttribute('data-fill')))).toEqual(['entry', 'partial', 'final']);
  await expect(page.getByTestId('exits-P-1')).toHaveText('1 partial + final');
  // jump to the partial exit: selected on the chart, half-filled, Growth's round frame; its tooltip matches the ledger
  await page.getByTestId('show-fill-VGT:P-1:partial-1').click();
  const partial = page.locator('[data-testid=price-chart] .marker[data-event-id="VGT:P-1:partial-1"]');
  await expect(partial).toHaveClass(/is-selected/);
  await expect(partial).toHaveAttribute('data-partial', 'true');
  await expect(partial).toHaveAttribute('data-frame', 'round');
  await expect(page.getByTestId('selected-event')).toContainText('Partial exit 1');
  await expect(page.getByTestId('selected-event')).toContainText('position P-1');
  await expect(page.getByTestId('selected-event')).toContainText('471.7294 sh'); // the remaining shares
  await expect(page.getByTestId('selected-event')).toContainText('+$18,019.42'); // this fill's realized P&L
  await expect(page.getByTestId('selected-event')).toContainText('+$44,456.96'); // the whole position's net
  await partial.hover();
  await expect(page.getByTestId('marker-tooltip').getByTestId('tt-fill')).toHaveAttribute('data-action', 'partial');
  await expect(page.getByTestId('marker-tooltip')).toContainText('This fill (realized)');
  await expect(page.getByTestId('marker-tooltip')).toContainText('EST'); // the execution time with its zone
  await page.mouse.move(5, 5);
  // the final exit: a full ▼, distinguishable from the partial one
  await page.getByTestId('show-fill-VGT:P-1:exit').click();
  const final = page.locator('[data-testid=price-chart] .marker[data-event-id="VGT:P-1:exit"]');
  await expect(final).toHaveClass(/is-selected/);
  await expect(final).not.toHaveAttribute('data-partial', 'true');
  await expect(page.getByTestId('selected-event')).toContainText('trend exit');
  // P-26 is open at the endpoint: its partial exit only, the remainder marked, no closing fill
  await page.getByTestId('expand-P-26').click();
  await expect(page.getByTestId('fills-P-26').locator('tr[data-fill]')).toHaveCount(3); // entry, partial, open-remainder note
  await expect(page.getByTestId('fills-P-26').locator('tr[data-fill="final"]')).toHaveCount(0);
  await expect(page.getByTestId('fills-P-26')).toContainText('no closing fill is invented');
  await expect(page.locator('[data-testid=price-chart] .marker[data-event-id="VGT:P-26:exit"]')).toHaveCount(0);
});

test('refused signals are hidden by default, shown only on request, and never become fills or ledger rows', async ({ page }) => {
  await open(page, 'vgt-d1-g4');
  const refusedCount = Number(await page.getByTestId('count-refused').textContent());
  expect(refusedCount).toBe(6);
  await expect(page.getByTestId('show-refused')).not.toBeChecked();
  expect(await markers(page).evaluateAll((els) => els.filter((e) => e.getAttribute('data-kind') === 'rejected_signal').length)).toBe(0);
  const before = await summaryOf(page);
  const ledgerBefore = await page.getByTestId('ledger-count').textContent();
  await page.getByTestId('show-refused').check();
  await page.getByTestId('zoom-all').click();
  await expect.poll(async () => markers(page).evaluateAll((els) => els.filter((e) => e.getAttribute('data-kind') === 'rejected_signal').length)).toBe(refusedCount);
  const refused = page.locator('[data-testid=price-chart] .marker[data-kind=rejected_signal]').first();
  await refused.hover();
  await expect(page.getByTestId('marker-tooltip').getByTestId('tt-refused')).toContainText('NOT executed');
  await expect(page.getByTestId('marker-tooltip').getByTestId('tt-refused')).toContainText('Insufficient pool availability');
  await page.mouse.move(5, 5);
  expect(await summaryOf(page)).toEqual(before);
  await expect(page.getByTestId('ledger-count')).toHaveText(ledgerBefore!);
});

test('visibility toggles and ledger filters change only what is shown; the portfolio figures never move', async ({ page }) => {
  await open(page, 'c4', 'VGT');
  const before = await summaryOf(page);
  const all = await markers(page).count();
  await page.getByTestId('show-D1').uncheck();
  await expect.poll(() => markers(page).count()).toBeLessThan(all);
  expect(await markers(page).evaluateAll((els) => els.every((e) => e.getAttribute('data-frame') === 'round'))).toBe(true);
  await page.getByTestId('show-partial').uncheck();
  await page.getByTestId('show-final').uncheck();
  expect(await markers(page).evaluateAll((els) => els.every((e) => e.getAttribute('data-kind') === 'executed_entry'))).toBe(true);
  expect(await summaryOf(page)).toEqual(before);
  await page.getByTestId('show-D1').check();
  await page.getByTestId('show-final').check();
  await page.getByTestId('show-partial').check();
  await expect.poll(() => markers(page).count()).toBe(all);
  // ledger filters: an explicitly labelled subtotal, the summary unchanged
  await page.getByTestId('ledger-component').selectOption('D1');
  await page.getByTestId('ledger-symbol').selectOption('GDX');
  await expect(page.getByTestId('ledger-subtotal')).toContainText('not the portfolio’s result');
  const rows = page.locator('[data-testid=ledger] tbody tr[data-position]');
  expect(await rows.evaluateAll((r) => r.every((x) => x.getAttribute('data-component') === 'D1' && x.getAttribute('data-symbol') === 'GDX'))).toBe(true);
  expect(await summaryOf(page)).toEqual(before);
  // jump from a GDX ledger row to the chart switches the tab and selects the entry
  const first = await rows.first().getAttribute('data-position');
  await page.getByTestId(`show-${first}`).click();
  await expect(page.getByTestId('symbol-tab-GDX')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator(`[data-testid=price-chart] .marker[data-event-id="GDX:${first}:entry"]`)).toHaveClass(/is-selected/);
  await page.getByTestId('ledger-reset').click();
  await expect(page.getByTestId('ledger-count')).toContainText('= the portfolio’s marked net');
});

test('zoom, intraday line and the validation viewport keep the continuous run (carry-in, unchanged figures)', async ({ page }) => {
  await open(page, 'vgt-d1-g085');
  const before = await summaryOf(page);
  const chart = page.getByTestId('price-chart');
  await expect(chart).toHaveAttribute('data-chart-mode', 'candles');
  await choosePeriod(page, 'validation');
  await expect.poll(async () => Date.parse((await chart.getAttribute('data-view-from')) ?? '')).toBeGreaterThan(Date.parse('2024-12-31T20:00:00Z'));
  expect(await summaryOf(page)).toEqual(before);
  await expect(page.getByTestId('equity-chart')).toBeVisible();
  // the ledger's validation period includes positions carried across the 2024-12-31 close
  await page.getByTestId('ledger-period').selectOption('validation');
  await expect(page.locator('[data-testid=ledger] tbody tr[data-position]')).not.toHaveCount(0);
  await chooseChart(page, 'line');
  await page.getByRole('button', { name: '1M', exact: true }).click();
  await expect
    .poll(async () => Date.parse((await chart.getAttribute('data-view-to'))!) - Date.parse((await chart.getAttribute('data-view-from'))!))
    .toBeLessThan(40 * 86_400_000);
  await choosePeriod(page, 'all');
  expect(await summaryOf(page)).toEqual(before);
});

test('rapid candidate switching never shows one candidate’s figures under another’s name; reload restores from the cache', async ({ page }) => {
  await page.goto('/#/portfolios');
  await page.getByTestId('candidate-c4').click();
  await page.getByTestId('candidate-vgt-d1-g4').click();
  await page.getByTestId('candidate-c4-refined').click();
  await expect(page.getByTestId('candidate-title')).toHaveText('C4-refined');
  await expect(page.getByTestId('portfolio-summary')).toBeVisible({ timeout: 90_000 });
  const s = await summaryOf(page);
  expect([s.net, s.dd, s.val]).toEqual([452082.36, 19477.66, 91512.65]);
  await expect(page.getByTestId('portfolio-view')).toHaveAttribute('data-candidate', 'c4-refined');
  // persistence: the address names the candidate and the tab; a reload shows the same replay from the validated cache
  await page.getByTestId('symbol-tab-GDX').click();
  await expect(page).toHaveURL(/#\/portfolio\/c4-refined\?symbol=GDX$/);
  await page.reload();
  await expect(page.getByTestId('candidate-title')).toHaveText('C4-refined');
  await expect(page.getByTestId('symbol-tab-GDX')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('replay-status')).toContainText('from the replay cache', { timeout: 30_000 });
  await expect(page.getByTestId('show-refused')).not.toBeChecked(); // still OFF by default after a reload
  // the other views still work
  await page.getByTestId('view-runs').click();
  await expect(page.getByTestId('view-runs')).toHaveAttribute('aria-current', 'page');
});

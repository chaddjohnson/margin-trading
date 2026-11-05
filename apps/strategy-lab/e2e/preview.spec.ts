// Interactive Preview in the browser (docs/strategy-lab/INTERACTIVE_PREVIEW.md), on real data in the e2e server's
// temporary state: the hidden-by-default panel beside the chart (bounded height, own scroll, a drawer on narrow
// screens), compact registry-driven controls whose ⓘ popovers show the New Test help text verbatim, the dynamic
// Growth 1.2.0 controls, Enter/Run preview submission (nothing while typing), C1 → C2 → C1 with a cache hit and zero new
// runs, presentation preferences kept across swaps, superseded submissions, selection by stable identity, Save as
// run (fresh, cached, duplicate), Return to saved result, a reload restoring the preview, and non-previewable runs.

import { type Page, expect, test } from '@playwright/test';

import { isActive } from '../shared/params.ts';
import { RISE_FROM_RECENT_LOW_TRADING } from '../shared/strategies.ts';
import { draftOf } from '../src/paramForm.ts';
import { tradingRun } from './helpers.ts';

const G = RISE_FROM_RECENT_LOW_TRADING;
let problems: string[] = [];
let previewPosts = 0;
test.beforeEach(async ({ page }) => {
  problems = [];
  previewPosts = 0;
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/previews') previewPosts++;
  });
});
test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));

const source = (page: Page) => tradingRun(page, 'E2E preview source', ['VGT', 'GDX'], {}, { from: '2022-01-03', to: '2023-12-29' });

async function openPanel(page: Page, runId: string) {
  await page.goto(`/#/run/${runId}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await expect(page.getByTestId('preview-panel')).toHaveCount(0); // hidden by default
  await page.getByTestId('preview-toggle').click();
  await expect(page.getByTestId('preview-panel')).toBeVisible();
  await expect(page.getByTestId('pv-param-advanceFromRecentLowPercent')).toBeVisible();
}

const status = (page: Page) => page.getByTestId('preview-status');
const setX = async (page: Page, x: number) => {
  await page.getByTestId('pv-param-advanceFromRecentLowPercent').fill(String(x));
};
const runs = async (page: Page) => ((await (await page.request.get('/api/runs?limit=500')).json()) as { id: string }[]).map((r) => r.id);
const markerCount = (page: Page, kind: string) => page.locator(`button.marker[data-kind="${kind}"]`).count();

test('the panel: hidden by default, beside the chart, bounded and scrolling, compact with exact help popovers', async ({ page }) => {
  const id = await source(page);
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  const chartWidthClosed = (await page.locator('.chart-host').boundingBox())!.width;
  await openPanel(page, id);
  const toggle = page.getByTestId('preview-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('preview-strategy')).toContainText('Growth');
  await expect(page.getByTestId('preview-version')).toHaveText('v1.2.0');
  await expect(status(page)).toHaveAttribute('data-state', 'saved');
  // beside the chart: the chart narrows, the panel is no taller than the chart section and scrolls by itself
  const panel = (await page.getByTestId('preview-panel').boundingBox())!;
  const main = (await page.locator('.chart-main').boundingBox())!;
  expect((await page.locator('.chart-host').boundingBox())!.width).toBeLessThan(chartWidthClosed - 250);
  expect(panel.width).toBeGreaterThanOrEqual(318);
  expect(panel.width).toBeLessThanOrEqual(382);
  expect(panel.x).toBeGreaterThan(main.x + main.width - 1);
  expect(panel.height).toBeLessThanOrEqual(main.height + 1);
  const body = page.getByTestId('preview-body');
  expect(await body.evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
  // more controls (every optional group ON): the panel keeps its height and its body scrolls instead
  for (const k of ['continuationEnabled', 'trendFilterEnabled', 'eligibilityEnabled']) await page.getByTestId(`pv-param-${k}`).check();
  expect((await page.getByTestId('preview-panel').boundingBox())!.height).toBeCloseTo(panel.height, 0);
  expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight + 50)).toBe(true);
  await page.getByTestId('pv-param-trailingStopPercent').scrollIntoViewIfNeeded();
  expect((await page.locator('.chart-main').boundingBox())!.height).toBeCloseTo(main.height, 0); // the page did not grow
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // labels and controls only: no descriptions, parameter ids or ranges on the panel itself
  const text = await page.getByTestId('preview-panel').innerText();
  expect(text).not.toContain('raised after each session');
  expect(text).not.toContain('trailingStopPercent');
  expect(text).not.toMatch(/Range \d/);
  expect(await page.getByTestId('preview-panel').locator('.field-help').count()).toBe(0);

  // the ⓘ popover holds exactly the New Test help text (keyboard: Enter opens, Escape closes, focus stays)
  const info = page.getByTestId('pv-info-trailingStopPercent');
  await info.focus();
  await page.keyboard.press('Enter');
  const popover = page.getByTestId('pv-info-trailingStopPercent-popover');
  await expect(popover).toBeVisible();
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  const popText = (await popover.innerText()).replace(/^Trailing stop\s*/, '').trim();
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await expect(info).toBeFocused();
  await expect(page.getByTestId('preview-panel')).toBeVisible(); // Escape never closes the desktop panel
  await info.click(); // pointer
  await expect(popover).toBeVisible();
  await page.mouse.click(5, 5); // outside
  await expect(popover).toHaveCount(0);
  await page.getByTestId('new-test').click();
  const dialogHelp = page.getByTestId('run-dialog').locator('label', { has: page.getByTestId('param-trailingStopPercent') }).locator('.field-help');
  // the New Test form of the same strategy (the dialog opens on the signal-only default; choose Growth)
  await page.getByTestId('strategy-picker').click();
  await page.getByTestId(`strategy-option-${G.key}`).click();
  expect((await dialogHelp.innerText()).trim()).toBe(popText);
  await page.getByTestId('run-dialog').getByRole('button', { name: 'Cancel' }).click();

  // closing keeps the page as it was; the toggle reopens it
  await page.getByTestId('preview-close').click();
  await expect(page.getByTestId('preview-panel')).toHaveCount(0);
  await expect(toggle).toBeFocused();
  expect(previewPosts).toBe(0);
});

test('narrow screens: a drawer over the page (the chart keeps its width), Escape closes it', async ({ page }) => {
  const id = await source(page);
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  const before = (await page.locator('.chart-host').boundingBox())!.width;
  await page.getByTestId('preview-toggle').click();
  const panel = page.getByTestId('preview-panel');
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
  expect((await page.locator('.chart-host').boundingBox())!.width).toBe(before);
  const box = (await panel.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(820);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByTestId('pv-param-advanceFromRecentLowPercent').focus();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});

test('dynamic controls: every continuation method, trend method and eligibility policy; the exit dependency; drafts kept', async ({ page }) => {
  const id = await source(page);
  await openPanel(page, id);
  const panel = page.getByTestId('preview-panel');
  // what the panel shows = what the registry says applies (no Growth-specific form code)
  const visibleParams = async () =>
    (await panel.locator('[data-testid^="pv-param-"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.testid!.slice(9)))).sort();
  const draft: Record<string, string | boolean> = { ...draftOf(G, {}) };
  const expected = () =>
    G.params
      .filter((p) => isActive(G, Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, typeof v === 'string' && /^-?\d/.test(v) ? Number(v) : v])), p.key) || (p.whenInactive ?? 'disable') === 'disable')
      .map((p) => p.key)
      .sort();
  expect(await visibleParams()).toEqual(expected());
  for (const [toggle, choice, values] of [
    ['continuationEnabled', 'continuationMethod', ['classic_d1', 'breakout', 'shallow_pullback', 'ma_cross']],
    ['trendFilterEnabled', 'trendMethod', ['price_change', 'regression_slope', 'rising_sma', 'higher_highs_lows', 'momentum']],
    ['eligibilityEnabled', 'eligibilityPolicy', ['time_limited', 'minimum_strength', 'maximum_extension', 'deterioration', 'reset_renew']]
  ] as const) {
    await expect(panel.getByTestId(`pv-param-${choice}`)).toHaveCount(0); // OFF: the method choice is hidden
    await panel.getByTestId(`pv-param-${toggle}`).check();
    draft[toggle] = true;
    for (const v of values) {
      await panel.getByTestId(`pv-param-${choice}`).selectOption(v);
      draft[choice] = v;
      expect(await visibleParams(), `${choice}=${v}`).toEqual(expected());
    }
  }
  // a hidden draft value survives a method switch and the switch going OFF and ON again
  await panel.getByTestId('pv-param-trendMethod').selectOption('price_change');
  await panel.getByTestId('pv-param-trendChangeLookbackSessions').fill('37');
  await panel.getByTestId('pv-param-trendMethod').selectOption('momentum');
  await expect(panel.getByTestId('pv-param-trendChangeLookbackSessions')).toHaveCount(0);
  await panel.getByTestId('pv-param-trendFilterEnabled').uncheck();
  await panel.getByTestId('pv-param-trendFilterEnabled').check();
  await panel.getByTestId('pv-param-trendMethod').selectOption('price_change');
  await expect(panel.getByTestId('pv-param-trendChangeLookbackSessions')).toHaveValue('37');
  // the exit dependency: hold OFF disables its age and the buffer (switched off with it)
  await panel.getByTestId('pv-param-maximumHoldEnabled').uncheck();
  await expect(panel.getByTestId('pv-param-maximumHoldDays')).toBeDisabled();
  await expect(panel.getByTestId('pv-param-intradayLossBufferEnabled')).toBeDisabled();
  await expect(panel.getByTestId('pv-param-intradayLossBufferEnabled')).not.toBeChecked();
  await expect(panel.getByTestId('pv-hold-off-warning')).toBeVisible();
  // an invalid DISABLED value never blocks; an invalid active one does (with the message beside the field)
  await panel.getByTestId('pv-param-maximumHoldEnabled').check();
  await panel.getByTestId('pv-param-maximumHoldDays').fill('0');
  await expect(panel.getByTestId('pv-error-maximumHoldDays')).toBeVisible();
  await expect(page.getByTestId('preview-run')).toBeDisabled();
  await panel.getByTestId('pv-param-maximumHoldEnabled').uncheck();
  await expect(panel.getByTestId('pv-error-maximumHoldDays')).toHaveCount(0);
  await expect(page.getByTestId('preview-run')).toBeEnabled();
  expect(previewPosts).toBe(0); // editing never executes
});

test('C1 → C2 → C1: Enter and Run preview, a cache hit on return, zero new runs, presentation kept, saving, returning', async ({ page }) => {
  test.setTimeout(240_000);
  const id = await source(page);
  const before = await runs(page);
  const sourceRecord = JSON.stringify(await (await page.request.get(`/api/runs/${id}`)).json());
  await openPanel(page, id);
  const savedEntries = await markerCount(page, 'executed_entry');
  // presentation preferences set before any preview
  await page.getByTestId('kind-rejected_signal').uncheck();
  await page.getByTestId('kind-entry_signal').uncheck();
  await page.getByTestId('symbol-tab-GDX').click();
  await expect(page.locator('.run-view')).toHaveAttribute('data-symbol', 'GDX');
  await page.getByRole('button', { name: '3M' }).click();
  const chart = page.getByTestId('price-chart');
  const zoomFrom = await chart.getAttribute('data-view-from');
  await page.getByTestId('trades-card').getByRole('checkbox').first().check(); // closed losses only
  const kinds = async () => page.locator('.legend-kind input').evaluateAll((els) => els.map((e) => [(e as HTMLInputElement).dataset.testid, (e as HTMLInputElement).checked]));
  const kindState = await kinds();

  // C1: X = 10, Enter (no execution while typing)
  await setX(page, 10);
  await expect(status(page)).toHaveAttribute('data-state', 'modified');
  expect(previewPosts).toBe(0);
  await page.getByTestId('pv-param-advanceFromRecentLowPercent').press('Enter');
  await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 120_000 });
  expect(previewPosts).toBe(1);
  await expect(page.getByTestId('preview-banner')).toContainText('TEMPORARY PREVIEW');
  await expect(page.getByTestId('preview-source')).toHaveText(id);
  const c1 = (await page.getByTestId('preview-id').getAttribute('title'))!;
  expect(c1).toMatch(/^PV-[0-9a-f]{64}$/);
  expect(page.url()).toContain(`preview=${c1}`);
  await expect(page.getByTestId('preview-run')).toBeDisabled(); // the displayed configuration
  // every presentation preference survived the swap
  expect(await kinds()).toEqual(kindState);
  await expect(page.locator('.run-view')).toHaveAttribute('data-symbol', 'GDX');
  await expect(chart).toHaveAttribute('data-view-from', zoomFrom!);
  await expect(page.getByTestId('trades-card').getByRole('checkbox').first()).toBeChecked();
  await expect(page.locator('button.marker[data-kind="rejected_signal"]')).toHaveCount(0);

  // C2: X = 7, Run preview
  await setX(page, 7);
  await expect(page.getByTestId('preview-run')).toBeEnabled();
  await page.getByTestId('preview-run').click();
  await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 120_000 });
  const c2 = (await page.getByTestId('preview-id').getAttribute('title'))!;
  expect(c2).not.toBe(c1);

  // back to C1: enabled (not what is displayed), served from the cache
  await setX(page, 10);
  await expect(page.getByTestId('preview-run')).toBeEnabled();
  await page.getByTestId('preview-run').click();
  await expect(status(page)).toHaveAttribute('data-state', 'cache-hit', { timeout: 30_000 });
  await expect(page.getByTestId('preview-origin')).toContainText('cache hit');
  expect(await page.getByTestId('preview-id').getAttribute('title')).toBe(c1);
  expect(previewPosts).toBe(3);
  expect(await runs(page)).toEqual(before); // zero runs, zero sidebar entries
  expect(await kinds()).toEqual(kindState);
  await expect(chart).toHaveAttribute('data-view-from', zoomFrom!);

  // rapid sequential submissions: only the last one is displayed
  for (const x of [11, 12, 13]) {
    await setX(page, x);
    await page.getByTestId('pv-param-advanceFromRecentLowPercent').press('Enter');
  }
  await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 120_000 });
  await expect(page.getByTestId('pv-param-advanceFromRecentLowPercent')).toHaveValue('13');
  const c13 = (await page.getByTestId('preview-id').getAttribute('title'))!;
  const check = (await (await page.request.post('/api/previews', { data: { request: (await (await page.request.get(`/api/previews/${c13}`)).json()).request } })).json()) as { previewId: string; cacheHit: boolean };
  expect(check).toMatchObject({ previewId: c13, cacheHit: true });
  const detail13 = (await (await page.request.get(`/api/previews/${c13}`)).json()) as { preview: { config: { params: Record<string, unknown> } } };
  expect(detail13.preview.config.params.advanceFromRecentLowPercent).toBe(13);
  expect(await runs(page)).toEqual(before);

  // Save as run: from the fresh preview (13), then from a cached one (10), then a confirmed duplicate
  await page.getByTestId('preview-save').click();
  await page.getByTestId('preview-save-title').fill('Saved from preview X13');
  await page.getByTestId('preview-save-confirm').click();
  await expect(page.getByTestId('preview-saved-as')).toBeVisible();
  await expect(page.getByTestId('app-notice')).toContainText('Saved the preview as R-');
  const afterOne = await runs(page);
  expect(afterOne.length).toBe(before.length + 1);
  const saved13 = afterOne.find((r) => !before.includes(r))!;
  await expect(page.getByTestId('sidebar')).toContainText(saved13);
  await setX(page, 10);
  await page.getByTestId('preview-run').click();
  await expect(status(page)).toHaveAttribute('data-state', 'cache-hit', { timeout: 30_000 });
  await page.getByTestId('preview-save').click();
  await page.getByTestId('preview-save-confirm').click();
  await expect(page.getByTestId('preview-saved-as')).toBeVisible();
  expect((await runs(page)).length).toBe(before.length + 2);
  // the same preview again: asked first (no request until confirmed), then a second, deliberate copy
  const posts = previewPosts;
  await page.getByTestId('preview-save').click();
  await expect(page.getByTestId('preview-duplicate')).toContainText('already saved as R-');
  expect((await runs(page)).length).toBe(before.length + 2);
  await page.getByTestId('preview-save-again').click();
  expect(previewPosts).toBe(posts);
  await expect(page.getByTestId('preview-save-form')).toHaveCount(0);
  expect((await runs(page)).length).toBe(before.length + 3);
  // the saved run is a normal run holding exactly the preview's result
  const saved = (await (await page.request.get(`/api/runs/${saved13}`)).json()) as { kind: string; status: string; provenance: { preview: { id: string; sourceRun: string } } };
  expect(saved).toMatchObject({ kind: 'manual', status: 'completed', provenance: { preview: { id: c13, sourceRun: id } } });
  // the source run is unchanged
  expect(JSON.stringify(await (await page.request.get(`/api/runs/${id}`)).json())).toBe(sourceRecord);

  // Return to saved result; a reload of a preview URL restores it from the cache
  await page.getByTestId('preview-return').click();
  await expect(page.getByTestId('preview-banner')).toHaveCount(0);
  expect(page.url()).not.toContain('preview=');
  await page.getByTestId('symbol-tab-VGT').click();
  await page.getByTestId('kind-entry_signal').check();
  await page.getByTestId('zoom-all').click(); // the 3M zoom was kept across every swap; markers render in the view
  await expect.poll(() => markerCount(page, 'executed_entry')).toBe(savedEntries);
  await page.goto(`/#/run/${id}?preview=${c1}`);
  await page.reload(); // a new page: the preview comes back from its validated cache entry
  await expect(page.getByTestId('preview-banner')).toContainText('restored from the cache');
  await expect(page.getByTestId('preview-id')).toHaveAttribute('title', c1);
});

test('after repeated swaps the chart still hovers, links, zooms, measures and pans; a selection is kept only for the same trade', async ({ page }) => {
  test.setTimeout(240_000);
  const id = await source(page);
  await openPanel(page, id);
  // select a trade; after a swap it stays selected exactly when the new result has the same trade (same fills)
  type E = { id: string; kind: string; t: string; price: number | null; linkedEventId: string | null };
  const evs = async (path: string) => ((await (await page.request.get(`${path}/events?symbol=VGT`)).json()) as { events: E[] }).events;
  const fills = (list: E[], entry: E) => {
    const exit = list.find((x) => x.id === entry.linkedEventId);
    return `${entry.t}@${entry.price}|${exit ? `${exit.t}@${exit.price}` : 'open'}`;
  };
  const saved = await evs(`/api/runs/${id}`);
  const entries = saved.filter((e) => e.kind === 'executed_entry');
  const target = entries[2]!;
  const key = fills(saved, target);
  await page.getByTestId('trades-card').locator('tr[data-trade-key]').nth(2).click();
  const selected = page.getByTestId('trades-card').locator('tr[aria-selected="true"]');
  await expect(selected).toHaveCount(1);
  const entryText = await selected.locator('td').nth(2).innerText();
  for (const [param, value] of [
    ['costBpsPerSide', '6'],
    ['advanceFromRecentLowPercent', '12']
  ] as const) {
    await page.getByTestId(`pv-param-${param}`).fill(value);
    await page.getByTestId(`pv-param-${param}`).press('Enter');
    await expect(status(page)).toHaveAttribute('data-state', 'ready', { timeout: 120_000 });
    const pv = (await page.getByTestId('preview-id').getAttribute('title'))!;
    const now = await evs(`/api/previews/${pv}`);
    const same = now.filter((e) => e.kind === 'executed_entry' && fills(now, e) === key);
    if (same.length === 1) {
      await expect(selected).toHaveCount(1);
      expect(await selected.locator('td').nth(2).innerText()).toBe(entryText);
    } else await expect(selected).toHaveCount(0); // never another trade that reuses the ordinal id
  }

  // hover link + tooltip
  const entry = page.locator('button.marker[data-kind="executed_entry"]').first();
  await entry.hover();
  await expect(page.getByTestId('marker-tooltip')).toBeVisible();
  // wheel zoom
  const chart = page.getByTestId('price-chart');
  const at = async (k: 'from' | 'to') => Date.parse((await chart.getAttribute(`data-view-${k}`))!);
  const from0 = await at('from');
  const box = (await page.locator('.chart-host').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 120);
  await expect.poll(() => at('from')).toBeGreaterThan(from0);
  // drag to measure (the read-out exists only while the button is held)
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 5 });
  await expect(page.getByTestId('measure-percent')).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId('measure-percent')).toHaveCount(0);
  // Shift-drag pans without changing the zoom span
  const span = async () => (await at('to')) - (await at('from'));
  const s0 = await span();
  const f1 = await at('from');
  await page.keyboard.down('Shift');
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect.poll(() => at('from')).not.toBe(f1);
  expect(Math.abs((await span()) - s0)).toBeLessThan(60_000); // the zoom span is unchanged (to the minute)
});

test('runs that cannot be previewed say why: the synthetic demo and an imported shared-slot replay', async ({ page }) => {
  const demo = ((await (await page.request.get('/api/runs?q=synthetic%20demo')).json()) as { id: string }[])[0]!.id;
  await page.goto(`/#/run/${demo}`);
  await page.getByTestId('preview-toggle').click();
  await expect(page.getByTestId('preview-unavailable')).toContainText('Synthetic demo run');
  await expect(page.getByTestId('preview-run')).toHaveCount(0);
  const imported = ((await (await page.request.get('/api/runs?limit=500')).json()) as { id: string; kind: string }[]).find((r) => r.kind === 'import');
  test.skip(!imported, 'no Study 8 import in this checkout');
  await page.goto(`/#/run/${imported!.id}`);
  await page.getByTestId('preview-toggle').click();
  await expect(page.getByTestId('preview-unavailable')).toContainText('never substitutes a standalone single-strategy simulation for a shared-capital strategy');
});

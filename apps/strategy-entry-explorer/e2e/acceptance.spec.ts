// The brief's acceptance walkthrough, automated in the system Chrome against a fresh dev server.

import { type Page, expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Dataset, EntryEvent } from '../src/schema/types.ts';

const fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'demo-dataset.v1.json'), 'utf8')
) as Dataset;
const eventById = new Map<string, EntryEvent>(fixture.variations.flatMap((v) => v.events.map((e) => [e.id, e])));

const V1 = 'demo-rebound-5-from-20-low';
const V2 = 'demo-shallow-pullback-2-4';
const V3 = 'demo-breakout-60-high';

let problems: string[] = [];

test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto('/');
  await expect(page.locator('.see-marker').first()).toBeVisible();
});

test.afterEach(() => {
  expect(problems, 'browser console errors or warnings').toEqual([]);
});

const chart = (page: Page) => page.getByTestId('price-chart');

async function chartWindow(page: Page) {
  return [await chart(page).getAttribute('data-view-from'), await chart(page).getAttribute('data-view-to')];
}

/** Ids of every event drawn as a marker in the current window. */
async function drawnIds(page: Page): Promise<string[]> {
  const lists = await page
    .locator('.see-marker')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.eventIds ?? ''));
  return lists.flatMap((l) => l.split(' ').filter(Boolean));
}

async function setWindow(page: Page, from: string, to: string) {
  await page.getByTestId('range-from').fill(from);
  await page.getByTestId('range-to').fill(to);
  await page.getByTestId('range-form').getByRole('button', { name: 'Apply' }).click();
  await expect(chart(page)).toHaveAttribute('data-view-from', from);
  await expect(chart(page)).toHaveAttribute('data-view-to', to);
}

const selectA = (page: Page, id: string) => page.locator(`[data-variation-id="${id}"] .var-main`).click();
const compareB = (page: Page, id: string) => page.locator(`[data-variation-id="${id}"] .var-compare`).click();

async function legendCount(page: Page, role: 'A' | 'B', type: 'signal' | 'executed'): Promise<number> {
  const el = page.getByTestId(`count-${role}-${type}`);
  return (await el.count()) ? Number((await el.innerText()).replace(/,/g, '')) : 0;
}

async function tableInWindow(page: Page): Promise<number> {
  const m = /([\d,]+) in window/.exec(await page.getByTestId('entries-count').innerText());
  return Number(m?.[1]?.replace(/,/g, ''));
}

async function analysisEventsInScope(page: Page): Promise<number> {
  const row = page.getByTestId('metrics-table').locator('tbody tr').first();
  const cells = await row.locator('td:not([data-column="baseline"])').allInnerTexts();
  return cells.reduce((n, t) => n + Number(t.replace(/,/g, '')), 0);
}

test('starts with one command into a populated chart with the demo warning', async ({ page }) => {
  await expect(page.getByTestId('demo-badge')).toHaveText(/DEMO \/ SYNTHETIC DATA/);
  await expect(page.getByTestId('demo-banner')).toContainText('not actual VGT prices');
  await expect(chart(page)).toHaveAttribute('data-price-points', String(fixture.priceSeries.bars.length));
  await expect(page.getByTestId('alignment-status')).toContainText('1,187 of 1,187');
  expect((await drawnIds(page)).length).toBeGreaterThan(50);
  await expect(page.getByRole('link', { name: /backtest/i })).toHaveCount(0);
});

test('variation A shows only its own events on the unchanged price line', async ({ page }) => {
  const instance = await chart(page).getAttribute('data-instance');
  await selectA(page, V3);
  const ids = await drawnIds(page);
  expect(ids.length).toBeGreaterThan(0);
  expect(ids.every((id) => id.startsWith(`${V3}:`))).toBe(true);
  const v3 = fixture.variations.find((v) => v.id === V3)!;
  expect(ids.length).toBe(v3.events.length);
  await expect(chart(page)).toHaveAttribute('data-instance', instance!);
  await expect(chart(page)).toHaveAttribute('data-price-points', String(fixture.priceSeries.bars.length));
});

test('a zoomed 2020–2022 window survives switching variations, and markers switch', async ({ page }) => {
  await selectA(page, V1);
  await setWindow(page, '2020-01-01', '2022-12-31');
  const before = await chartWindow(page);
  await selectA(page, V2);
  await expect(page.locator(`[data-variation-id="${V2}"] .var-main`)).toHaveAttribute('aria-pressed', 'true');
  expect(await chartWindow(page)).toEqual(before);
  const ids = await drawnIds(page);
  expect(ids.every((id) => id.startsWith(`${V2}:`))).toBe(true);
  const expected = fixture.variations
    .find((v) => v.id === V2)!
    .events.filter((e) => e.d >= '2020-01-01' && e.d <= '2022-12-31')
    .map((e) => e.id);
  expect(new Set(ids)).toEqual(new Set(expected));
  expect(ids.length).toBe((await legendCount(page, 'A', 'signal')) + (await legendCount(page, 'A', 'executed')));
});

test('A+B overlay shows both sets distinctly; removing or hiding one keeps the window', async ({ page }) => {
  await selectA(page, V2);
  await setWindow(page, '2020-01-01', '2022-12-31');
  const before = await chartWindow(page);
  await compareB(page, V1);
  await expect(page.locator('.legend-group[data-role="B"]')).toBeVisible();
  const ids = await drawnIds(page);
  expect(ids.some((id) => id.startsWith(`${V1}:`))).toBe(true);
  expect(ids.some((id) => id.startsWith(`${V2}:`))).toBe(true);
  expect(ids.length).toBe(
    (await legendCount(page, 'A', 'signal')) +
      (await legendCount(page, 'A', 'executed')) +
      (await legendCount(page, 'B', 'signal')) +
      (await legendCount(page, 'B', 'executed'))
  );
  // Distinct styling: A markers draw triangles (3 points), B markers diamonds (4 points).
  const shapes = await page
    .locator('.see-marker img')
    .evaluateAll((imgs) => imgs.map((i) => decodeURIComponent((i as HTMLImageElement).src)).join(' '));
  expect(shapes).toContain('#199e70');
  expect(shapes).toContain('#d95926');
  expect(await chartWindow(page)).toEqual(before);

  await page.locator('.legend-group[data-role="A"]').getByRole('button', { name: 'Hide' }).click();
  expect((await drawnIds(page)).every((id) => id.startsWith(`${V1}:`))).toBe(true);
  await page.locator('.legend-group[data-role="A"]').getByRole('button', { name: 'Show' }).click();
  await page.locator('.legend-group[data-role="B"]').getByRole('button', { name: 'Remove B' }).click();
  await expect(page.locator('.legend-group[data-role="B"]')).toHaveCount(0);
  expect((await drawnIds(page)).every((id) => id.startsWith(`${V2}:`))).toBe(true);
  expect(await chartWindow(page)).toEqual(before);
  await expect(page.locator(`[data-variation-id="${V2}"] .var-main`)).toHaveAttribute('aria-pressed', 'true');
});

test('signals / executed / both: markers, legend, summary and table agree', async ({ page }) => {
  await selectA(page, V1);
  await compareB(page, V2);
  await setWindow(page, '2019-01-01', '2023-06-30');
  for (const [label, type] of [
    ['Raw signals', 'signal'],
    ['Executed', 'executed'],
    ['Both', null]
  ] as const) {
    await page.getByTestId('type-filter').getByText(label, { exact: true }).click();
    const ids = await drawnIds(page);
    expect(ids.length, `markers drawn (${label})`).toBeGreaterThan(0);
    if (type) expect(ids.every((id) => eventById.get(id)?.type === type)).toBe(true);
    else expect(new Set(ids.map((id) => eventById.get(id)?.type))).toEqual(new Set(['signal', 'executed']));
    const legend =
      (await legendCount(page, 'A', 'signal')) +
      (await legendCount(page, 'A', 'executed')) +
      (await legendCount(page, 'B', 'signal')) +
      (await legendCount(page, 'B', 'executed'));
    expect(legend, `legend vs markers (${label})`).toBe(ids.length);
    expect(await tableInWindow(page), `table vs markers (${label})`).toBe(ids.length);
    expect(await analysisEventsInScope(page), `analysis vs markers (${label})`).toBe(ids.length);
    await expect(page.getByTestId('entries-table').locator('tbody tr')).toHaveCount(ids.length);
  }
  await expect(page.getByTestId('analysis')).toContainText('not VGT history');
});

test('hovering and clicking a marker shows its true details; a table row locates its marker', async ({ page }) => {
  await selectA(page, V1);
  await setWindow(page, '2021-01-01', '2021-06-30');
  const marker = page.locator('.see-marker:not(.is-stacked)').first();
  const id = ((await marker.getAttribute('data-event-ids')) ?? '').split(' ')[0]!;
  const event = eventById.get(id)!;
  await page.evaluate(() => window.scrollTo(0, 0));
  await marker.hover();
  const tooltip = page.getByTestId('marker-tooltip');
  await expect(tooltip).toContainText(event.d);
  await expect(tooltip).toContainText(event.price.toFixed(2));
  await expect(tooltip).toContainText(event.trigger.summary);

  await marker.click();
  const detail = page.getByTestId('event-detail');
  await expect(detail).toHaveAttribute('data-event-id', id);
  await expect(page.getByTestId('detail-date')).toHaveText(event.d);
  await expect(page.getByTestId('detail-price')).toContainText(event.price.toFixed(2));
  await expect(page.locator(`tr[data-event-id="${id}"]`)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.see-marker.is-selected')).toHaveAttribute(
    'data-event-ids',
    new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  );

  // Pick an event far outside the window from the "All dates" table: the chart pans (same span) to show it.
  const spanBefore = await chartWindow(page);
  await page.getByTestId('entries').getByText('All dates', { exact: true }).click();
  const far = fixture.variations.find((v) => v.id === V1)!.events.find((e) => e.d >= '2024-03-01')!;
  await page.locator(`tr[data-event-id="${far.id}"]`).click();
  await expect(detail).toHaveAttribute('data-event-id', far.id);
  const after = await chartWindow(page);
  expect(after[0]! <= far.d && far.d <= after[1]!).toBe(true);
  const days = (w: (string | null)[]) => (Date.parse(w[1]!) - Date.parse(w[0]!)) / 86_400_000;
  expect(Math.abs(days(after) - days(spanBefore))).toBeLessThanOrEqual(1);
  const selectedMarker = page.locator('.see-marker.is-selected');
  await expect(selectedMarker).toHaveCount(1);
  expect(await selectedMarker.getAttribute('data-event-ids')).toContain(far.id);
  await expect(page.getByTestId('detail-price')).toContainText(far.price.toFixed(2));
});

test('stacked same-bar events are all reachable', async ({ page }) => {
  await selectA(page, V1);
  await compareB(page, V2);
  const stacked = page.locator('.see-marker.is-stacked');
  expect(await stacked.count()).toBeGreaterThan(0);
  const first = stacked.first();
  const ids = ((await first.getAttribute('data-event-ids')) ?? '').split(' ');
  const x = Number(await first.getAttribute('data-x'));
  await setWindow(
    page,
    new Date(x - 20 * 86_400_000).toISOString().slice(0, 10),
    new Date(x + 20 * 86_400_000).toISOString().slice(0, 10)
  );
  const target = page.locator(`.see-marker[data-x="${x}"]`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await target.click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', ids[0]!);
  await expect(page.getByTestId('event-detail')).toContainText(`Events on this bar (${ids.length})`);
  await target.click();
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', ids[1]!);
});

test('keyboard: Tab to a marker and press Enter to select it', async ({ page }) => {
  await selectA(page, V1);
  await setWindow(page, '2021-01-01', '2021-06-30');
  const marker = page.locator('.see-marker').first();
  const id = ((await marker.getAttribute('data-event-ids')) ?? '').split(' ')[0]!;
  await marker.focus();
  await expect(page.getByTestId('marker-tooltip')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', id);
  await expect(page.locator('.see-marker.is-selected')).toBeFocused();
});

test('a reload starts clean without errors, and the layout has no horizontal overflow when narrow', async ({
  page
}) => {
  await page.reload();
  await expect(page.locator('.see-marker').first()).toBeVisible();
  await page.setViewportSize({ width: 820, height: 900 });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

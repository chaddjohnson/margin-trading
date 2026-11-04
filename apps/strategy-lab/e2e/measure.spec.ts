// Drag-to-measure on the price chart: live, snapped to plotted points, chronological in either direction, no zoom or
// pan, cleared by Escape / a click / a click elsewhere / a symbol switch, and existing interactions preserved.

import { type Page, expect, test } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..', '..', '..');
const importsDir = join(REPO, 'state/strategy-lab/imports/study8');
const hasStudy8 =
  existsSync(join(REPO, 'data/VGT/data.csv')) &&
  existsSync(importsDir) &&
  readdirSync(importsDir).some((d) => d.endsWith('-s8-vg-balanced'));

let problems: string[] = [];
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
});
test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));

async function runId(page: Page, q: string) {
  const runs = (await (await page.request.get(`/api/runs?q=${encodeURIComponent(q)}`)).json()) as { id: string }[];
  return runs[0]!.id;
}

/** A point inside the plot area at the given fractions of the chart host (left axis and range selector excluded). */
async function at(page: Page, fx: number, fy = 0.35) {
  const b = (await page.locator('.chart-host').boundingBox())!;
  return { x: b.x + 70 + (b.width - 90) * fx, y: b.y + (b.height - 70) * fy };
}

async function drag(page: Page, from: number, to: number, steps = 8) {
  const a = await at(page, from);
  const b = await at(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}

async function reading(page: Page) {
  const bar = page.getByTestId('measure-bar');
  const num = async (k: string) => Number(await bar.getAttribute(k));
  return {
    startMs: await num('data-start-ms'),
    endMs: await num('data-end-ms'),
    startPrice: await num('data-start-price'),
    endPrice: await num('data-end-price'),
    change: await page.getByTestId('measure-change').innerText(),
    percent: await page.getByTestId('measure-percent').innerText(),
    cls: (await bar.getAttribute('class')) ?? ''
  };
}

const window_ = async (page: Page) => [
  await page.getByTestId('price-chart').getAttribute('data-view-from'),
  await page.getByTestId('price-chart').getAttribute('data-view-to')
];

test('drag measures between snapped plotted points, live, in either direction, without zooming or panning', async ({
  page
}) => {
  const id = await runId(page, 'synthetic demo');
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await page.waitForTimeout(300);
  const before = await window_(page);
  await expect(page.getByTestId('measure-bar')).toContainText('Drag across the chart');

  // Live: the read-out appears and changes while the button is still down.
  const a = await at(page, 0.3);
  const mid = await at(page, 0.45);
  const b = await at(page, 0.65);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(mid.x, mid.y, { steps: 5 });
  await expect(page.getByTestId('measure-percent')).toBeVisible();
  const during = await reading(page);
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await expect.poll(async () => (await reading(page)).endMs).not.toBe(during.endMs);
  await page.mouse.up();

  const fwd = await reading(page);
  expect(fwd.startMs).toBeLessThan(fwd.endMs);
  expect(await window_(page)).toEqual(before); // no zoom, no pan
  // Percent and dollar change are computed from the two snapped prices, start = the earlier point.
  const pct = ((fwd.endPrice - fwd.startPrice) / fwd.startPrice) * 100;
  expect(fwd.percent.replace('−', '-')).toBe(`${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`);
  expect(fwd.change.replace('−', '-')).toBe(
    `${pct > 0 ? '+' : pct < 0 ? '-' : ''}$${Math.abs(fwd.endPrice - fwd.startPrice).toFixed(2)}`
  );
  expect(fwd.cls).toContain(pct > 0 ? 'dir-up' : pct < 0 ? 'dir-down' : 'dir-flat');
  // Snapped to plotted data: both endpoints are points of the plotted series, with their own prices.
  const prices = (await (await page.request.get(`/api/runs/${id}/prices?symbol=DEMO&points=3000`)).json()) as {
    points: [number, number][];
  };
  for (const [t, p] of [
    [fwd.startMs, fwd.startPrice],
    [fwd.endMs, fwd.endPrice]
  ])
    expect(
      prices.points.some(([x, y]) => x === t && y === p),
      `plotted point ${t}`
    ).toBe(true);
  // Overlay: shading, two vertical lines, two dots; it stays after the mouse is released.
  await expect(page.getByTestId('measure-shade')).toBeVisible();
  await expect(page.getByTestId('measure-line')).toHaveCount(2);
  for (const el of await page.getByTestId('measure-dot').all()) await expect(el).toBeVisible();

  // Reverse drag over the same span gives the same chronological measurement.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('measure-bar')).not.toHaveAttribute('data-start-ms', /.+/);
  await drag(page, 0.65, 0.3);
  const rev = await reading(page);
  expect(rev).toEqual(fwd);
  expect(await window_(page)).toEqual(before);
});

test('a click on the chart, a click elsewhere and Escape clear the measurement; zoom buttons and markers still work', async ({
  page
}) => {
  const id = await runId(page, 'synthetic demo');
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  const has = () => page.getByTestId('measure-bar').getAttribute('data-start-ms');

  await drag(page, 0.2, 0.5);
  expect(await has()).not.toBeNull();
  const p = await at(page, 0.8);
  await page.mouse.click(p.x, p.y); // plain click on the chart
  await expect.poll(has).toBeNull();

  await drag(page, 0.2, 0.5);
  expect(await has()).not.toBeNull();
  await page.getByTestId('sidebar').locator('.sidebar-caption').click(); // elsewhere
  await expect.poll(has).toBeNull();

  await drag(page, 0.2, 0.5);
  await page.keyboard.press('Escape');
  await expect.poll(has).toBeNull();

  // Existing interactions: the zoom buttons change the window; markers still select events.
  const before = await window_(page);
  await page.getByRole('button', { name: '1Y', exact: true }).click();
  await expect.poll(() => window_(page)).not.toEqual(before);
  await page.getByTestId('zoom-all').click();
  const mb = (await page.locator('button.marker').first().boundingBox())!;
  await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', /.+/);
  // Hover still shows the crosshair and the tooltip.
  const c = await at(page, 0.5);
  await page.mouse.move(c.x, c.y);
  await expect(page.getByTestId('crosshair')).toBeVisible();
});

test.describe('real intraday data', () => {
  test.skip(!hasStudy8, 'no local data or Study 8 runner output');

  test('Eastern date-times on vg-balanced, and switching symbols clears the measurement', async ({ page }) => {
    const id = await runId(page, 'vg-balanced');
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    const before = await window_(page);
    await drag(page, 0.55, 0.25);
    const m = await reading(page);
    expect(m.startMs).toBeLessThan(m.endMs);
    await expect(page.getByTestId('measure-range')).toHaveText(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} E[SD]T → \d{4}-\d{2}-\d{2} \d{2}:\d{2} E[SD]T$/
    );
    expect(await window_(page)).toEqual(before);
    await page.getByTestId('symbol-tab-GDX').click();
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('measure-bar')).not.toHaveAttribute('data-start-ms', /.+/);
    await expect(page.getByTestId('measure-bar')).toContainText('Drag across the chart');
  });
});

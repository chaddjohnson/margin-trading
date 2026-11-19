// Wheel / trackpad zoom: a two-finger swipe UP (wheel deltaY > 0 with natural scrolling) zooms IN and a swipe DOWN
// zooms OUT, cursor-centred, gradual, bounded, consuming the wheel only while zooming, one step per event (no duplicate
// handler), and compatible with drag-to-measure, the zoom buttons and the markers. Pinch (Ctrl + wheel) keeps the
// browser page-zoom sign. Playwright's mouse.wheel(dx, dy) dispatches a pixel-mode WheelEvent with deltaY = dy.

import { type Page, expect, test } from '@playwright/test';

let problems: string[] = [];
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  const runs = (await (await page.request.get('/api/runs?q=synthetic%20demo')).json()) as { id: string }[];
  await page.goto(`/#/run/${runs[0]!.id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await page.waitForTimeout(300);
});
test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));

const DAY = 86_400_000;
const SWIPE_UP = 100; // deltaY > 0: content scrolls down = fingers move up (natural scrolling)
const SWIPE_DOWN = -100;
const view = async (page: Page) => {
  const f = page.getByTestId('price-chart');
  return [
    Date.parse((await f.getAttribute('data-view-from'))!),
    Date.parse((await f.getAttribute('data-view-to'))!)
  ] as const;
};
const spanOf = async (page: Page) => {
  const [a, b] = await view(page);
  return b - a;
};
const point = async (page: Page, fx: number) => {
  const b = (await page.locator('.chart-host').boundingBox())!;
  return { x: b.x + 70 + (b.width - 90) * fx, y: b.y + (b.height - 70) * 0.35 };
};
/** The date under the cursor, from the crosshair read-out (re-hovered so it reflects the current window). */
const dateAt = async (page: Page, p: { x: number; y: number }) => {
  await page.mouse.move(p.x + 3, p.y);
  await page.mouse.move(p.x, p.y);
  const text = await page.getByTestId('chart-readout').innerText();
  return Date.parse(`${text.slice(0, 10)}T21:00:00Z`);
};
const wheel = async (page: Page, dy: number, n: number) => {
  for (let i = 0; i < n; i++) {
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(250);
};

test('two-finger swipe up zooms in around the cursor, gradually; swipe down zooms out', async ({ page }) => {
  const p = await point(page, 0.4);
  const [a0, b0] = await view(page);
  const t0 = await dateAt(page, p);
  await page.mouse.wheel(0, SWIPE_UP); // one notch
  await page.waitForTimeout(250);
  const [a1, b1] = await view(page);
  expect(b1 - a1).toBeLessThan(b0 - a0);
  // Exactly one step of exp(-100 × 0.0015) ≈ 0.861: a duplicated handler would give ≈ 0.741.
  expect((b1 - a1) / (b0 - a0)).toBeGreaterThan(0.85);
  expect((b1 - a1) / (b0 - a0)).toBeLessThan(0.87);
  await wheel(page, SWIPE_UP, 6);
  const [a2, b2] = await view(page);
  const t2 = await dateAt(page, p);
  expect(Math.abs(t2 - t0)).toBeLessThanOrEqual(2 * DAY); // the date under the cursor stays under the cursor
  expect((t0 - a2) / (b2 - a2)).toBeCloseTo((t0 - a0) / (b0 - a0), 1); // same position within the window
  await wheel(page, SWIPE_DOWN, 3);
  const [a3, b3] = await view(page);
  expect(b3 - a3).toBeGreaterThan(b2 - a2);
  const t3 = await dateAt(page, p);
  expect(Math.abs(t3 - t0)).toBeLessThanOrEqual(2 * DAY); // zooming out is anchored too
});

test('pinch (Ctrl + wheel) keeps the page-zoom sign: deltaY < 0 zooms in, > 0 zooms out', async ({ page }) => {
  const p = await point(page, 0.5);
  await page.mouse.move(p.x, p.y);
  await wheel(page, SWIPE_UP, 4);
  const before = await spanOf(page);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -60); // pinch out
  await page.keyboard.up('Control');
  await expect.poll(() => spanOf(page)).toBeLessThan(before);
  const mid = await spanOf(page);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 60); // pinch in
  await page.keyboard.up('Control');
  await expect.poll(() => spanOf(page)).toBeGreaterThan(mid);
});

test('zoom stops at the minimum span and at the full data range; the page scrolls only when not zooming', async ({
  page
}) => {
  const main = page.getByTestId('main');
  const full = await view(page);
  const p = await point(page, 0.6);
  await page.mouse.move(p.x, p.y);
  // Swipe up until the span stops shrinking; every notch that zoomed was consumed (the page did not scroll).
  for (let i = 0; i < 60; i++) {
    const s0 = await spanOf(page);
    await page.mouse.wheel(0, SWIPE_UP * 4);
    await page.waitForTimeout(40);
    if ((await spanOf(page)) === s0) break;
    expect(await main.evaluate((m) => m.scrollTop)).toBe(0);
  }
  await main.evaluate((m) => (m.scrollTop = 0));
  const [a, b] = await view(page);
  expect(b - a).toBeGreaterThanOrEqual(20 * DAY - 1);
  expect(b - a).toBeLessThan(25 * DAY);
  await page.mouse.move(p.x, p.y);
  await page.mouse.wheel(0, 300); // fully zoomed in: nothing to zoom, so the page scrolls
  await expect.poll(() => main.evaluate((m) => m.scrollTop)).toBeGreaterThan(0);
  expect(await view(page)).toEqual([a, b]);
  await main.evaluate((m) => (m.scrollTop = 0));
  await page.waitForTimeout(100);
  const q = await point(page, 0.6);
  await page.mouse.move(q.x, q.y);
  await wheel(page, SWIPE_DOWN * 4, 60);
  const [c, d] = await view(page);
  expect(c).toBeGreaterThanOrEqual(full[0] - 1);
  expect(d).toBeLessThanOrEqual(full[1] + 1);
  expect(d - c).toBeGreaterThanOrEqual(full[1] - full[0] - 1);
  expect(await main.evaluate((m) => m.scrollTop)).toBe(0);
});

test('after wheel zoom, drag still measures without zooming, and zoom buttons, overview and markers work', async ({
  page
}) => {
  const p = await point(page, 0.5);
  await page.mouse.move(p.x, p.y);
  await wheel(page, SWIPE_UP, 4);
  const zoomed = await view(page);
  const a = await point(page, 0.3);
  const b = await point(page, 0.7);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await expect(page.getByTestId('measure-percent')).toBeVisible();
  expect(await view(page)).toEqual(zoomed);
  // A wheel while the button is still held zooms (around the cursor) and keeps the live measurement.
  await page.mouse.wheel(0, SWIPE_UP);
  await expect.poll(() => spanOf(page)).toBeLessThan(zoomed[1] - zoomed[0]);
  await expect(page.getByTestId('measure-percent')).toBeVisible();
  await page.mouse.up(); // the release clears it
  await expect(page.getByTestId('measure-percent')).toHaveCount(0);
  await page.getByRole('button', { name: '1M', exact: true }).click();
  await expect.poll(() => spanOf(page)).toBeLessThan(40 * DAY);
  await page.getByTestId('zoom-all').click();
  const mb = (await page.locator('button.marker').first().boundingBox())!;
  await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', /.+/);
  // A swipe up over a marker zooms in too (markers sit above the canvas), by exactly one step.
  const before = await spanOf(page);
  await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await page.mouse.wheel(0, SWIPE_UP);
  await expect.poll(() => spanOf(page)).toBeLessThan(before);
  const ratio = (await spanOf(page)) / before;
  expect(ratio).toBeGreaterThan(0.85);
  expect(ratio).toBeLessThan(0.87);
});

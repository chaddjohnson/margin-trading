// Mouse-wheel zoom: cursor-centred, gradual, bounded, consuming the wheel only while zooming, and compatible with
// drag-to-measure, the zoom buttons and the markers.

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
const view = async (page: Page) => {
  const f = page.getByTestId('price-chart');
  return [
    Date.parse((await f.getAttribute('data-view-from'))!),
    Date.parse((await f.getAttribute('data-view-to'))!)
  ] as const;
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

test('wheel up zooms in around the cursor, gradually; wheel down zooms out', async ({ page }) => {
  const p = await point(page, 0.4);
  const [a0, b0] = await view(page);
  const t0 = await dateAt(page, p);
  await page.mouse.wheel(0, -100); // one notch
  await page.waitForTimeout(250);
  const [a1, b1] = await view(page);
  expect(b1 - a1).toBeLessThan(b0 - a0);
  expect(b1 - a1).toBeGreaterThan((b0 - a0) * 0.75); // a small step, not a jump
  await wheel(page, -100, 6);
  const [a2, b2] = await view(page);
  const t2 = await dateAt(page, p);
  expect(Math.abs(t2 - t0)).toBeLessThanOrEqual(2 * DAY); // the date under the cursor stays under the cursor
  expect((t0 - a2) / (b2 - a2)).toBeCloseTo((t0 - a0) / (b0 - a0), 1); // same position within the window
  await wheel(page, 100, 3);
  const [a3, b3] = await view(page);
  expect(b3 - a3).toBeGreaterThan(b2 - a2);
});

test('zoom stops at the minimum span and at the full data range; the page scrolls only when not zooming', async ({
  page
}) => {
  const main = page.getByTestId('main');
  const full = await view(page);
  const p = await point(page, 0.6);
  await page.mouse.move(p.x, p.y);
  await wheel(page, -400, 40);
  const [a, b] = await view(page);
  expect(b - a).toBeGreaterThanOrEqual(20 * DAY - 1);
  expect(b - a).toBeLessThan(25 * DAY);
  expect(await main.evaluate((m) => m.scrollTop)).toBe(0); // zooming consumed the wheel
  await wheel(page, 400, 60);
  const [c, d] = await view(page);
  expect(c).toBeGreaterThanOrEqual(full[0] - 1);
  expect(d).toBeLessThanOrEqual(full[1] + 1);
  expect(d - c).toBeGreaterThanOrEqual(full[1] - full[0] - 1);
  await page.mouse.move(p.x, p.y);
  await page.mouse.wheel(0, 300); // fully zoomed out: nothing to zoom, so the page scrolls
  await expect.poll(() => main.evaluate((m) => m.scrollTop)).toBeGreaterThan(0);
});

test('after wheel zoom, drag still measures without zooming, and zoom buttons, overview and markers work', async ({
  page
}) => {
  const p = await point(page, 0.5);
  await page.mouse.move(p.x, p.y);
  await wheel(page, -100, 4);
  const zoomed = await view(page);
  const a = await point(page, 0.3);
  const b = await point(page, 0.7);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('measure-percent')).toBeVisible();
  expect(await view(page)).toEqual(zoomed);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '1M', exact: true }).click();
  await expect.poll(async () => (await view(page))[1] - (await view(page))[0]).toBeLessThan(40 * DAY);
  await page.getByTestId('zoom-all').click();
  const mb = (await page.locator('button.marker').first().boundingBox())!;
  await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', /.+/);
  // A wheel over a marker zooms too (markers sit above the canvas).
  const before = await view(page);
  await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await page.mouse.wheel(0, -100);
  await expect.poll(async () => (await view(page))[1] - (await view(page))[0]).toBeLessThan(before[1] - before[0]);
});

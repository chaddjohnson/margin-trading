// Drag-to-measure on the price chart: it exists ONLY while the mouse button is held — live, snapped to plotted points,
// chronological in either direction, no zoom or pan — and the release (on or off the chart) or any cancellation
// (Escape, window blur, a missed release) clears all of it at once. Shift-drag panning, the zoom buttons, markers and
// the crosshair are preserved.

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

/** Press at `from`, drag to `to` and keep the button DOWN (the measurement only exists while it is held). */
async function press(page: Page, from: number, to: number, steps = 8) {
  const a = await at(page, from);
  const b = await at(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
}

/** Whether any part of the measurement is on screen: the overlay elements (synchronously) and the read-out. */
const overlayShown = (page: Page) =>
  page.evaluate(() =>
    ['measure-shade', 'measure-line', 'measure-dot'].flatMap((id) =>
      [...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)].filter((e) => !e.hidden).map(() => id)
    )
  );
async function expectCleared(page: Page) {
  expect(await overlayShown(page)).toEqual([]); // the overlay goes with the release itself, not later
  const bar = page.getByTestId('measure-bar');
  await expect(bar).not.toHaveAttribute('data-start-ms', /.+/, { timeout: 250 });
  await expect(page.getByTestId('measure-percent')).toHaveCount(0);
  await expect(bar).toContainText('Hold the mouse button and drag');
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

test('while the button is held the measurement is live, snapped and chronological; releasing clears all of it', async ({
  page
}) => {
  const id = await runId(page, 'synthetic demo');
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await page.waitForTimeout(300);
  const before = await window_(page);
  await expect(page.getByTestId('measure-bar')).toContainText('Hold the mouse button and drag');
  expect(await overlayShown(page)).toEqual([]);

  // Live: the read-out and the overlay appear and follow the pointer while the button is still down.
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
  await expect(page.getByTestId('measure-shade')).toBeVisible();
  await expect(page.getByTestId('measure-line')).toHaveCount(2);
  for (const el of await page.getByTestId('measure-line').all()) await expect(el).toBeVisible();
  for (const el of await page.getByTestId('measure-dot').all()) await expect(el).toBeVisible();
  await expect(page.getByTestId('measure-range')).toContainText('→');

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

  // Release on the chart: the shading, both lines, both dots and the read-out all go at once.
  await page.mouse.up();
  await expectCleared(page);
  expect(await window_(page)).toEqual(before);

  // Reverse drag over the same span gives the same chronological measurement (read while held), then clears.
  await press(page, 0.65, 0.3);
  await expect(page.getByTestId('measure-percent')).toBeVisible();
  const rev = await reading(page);
  expect(rev).toEqual(fwd);
  await page.mouse.up();
  await expectCleared(page);
  expect(await window_(page)).toEqual(before);
});

test('release outside the chart, Escape, window blur and a missed release clear it; a click shows nothing; pan, zoom, markers and the crosshair work', async ({
  page
}) => {
  const id = await runId(page, 'synthetic demo');
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await page.waitForTimeout(300);
  const percent = page.getByTestId('measure-percent');

  // Dragged off the chart onto the sidebar and released there.
  await press(page, 0.6, 0.4);
  await expect(percent).toBeVisible();
  const side = (await page.getByTestId('sidebar').boundingBox())!;
  await page.mouse.move(side.x + side.width / 2, side.y + side.height / 2, { steps: 6 });
  await expect(percent).toBeVisible(); // still held: still measuring
  await page.mouse.up();
  await expectCleared(page);

  // Escape cancels mid-drag; further moves of the same press do not bring it back.
  await press(page, 0.2, 0.5);
  await expect(percent).toBeVisible();
  await page.keyboard.press('Escape');
  await expectCleared(page);
  const further = await at(page, 0.7);
  await page.mouse.move(further.x, further.y, { steps: 4 });
  expect(await overlayShown(page)).toEqual([]);
  await expect(percent).toHaveCount(0);
  await page.mouse.up();
  await expectCleared(page);

  // The window loses focus mid-drag (the release may never arrive): cancelled.
  await press(page, 0.2, 0.5);
  await expect(percent).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expectCleared(page);
  await page.mouse.up();

  // A missed release: the next move reports no button held, so the drag ends and clears.
  await press(page, 0.25, 0.55);
  await expect(percent).toBeVisible();
  await page.evaluate(() =>
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 0, clientX: 600, clientY: 300 }))
  );
  await expectCleared(page);
  await page.mouse.up();

  // A plain click on the chart shows no measurement at all.
  const c = await at(page, 0.5);
  await page.mouse.click(c.x, c.y);
  await expectCleared(page);

  // Shift-drag still pans (after zooming in) and never measures.
  await page.getByRole('button', { name: '1Y', exact: true }).click();
  await page.waitForTimeout(300);
  const zoomed = await window_(page);
  const p0 = await at(page, 0.6);
  const p1 = await at(page, 0.3);
  await page.keyboard.down('Shift');
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.mouse.move(p1.x, p1.y, { steps: 6 });
  expect(await overlayShown(page)).toEqual([]);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect.poll(() => window_(page)).not.toEqual(zoomed);
  await expectCleared(page);

  // Existing interactions: the zoom buttons change the window; markers still select events; hover crosshair.
  const before = await window_(page);
  await page.getByTestId('zoom-all').click();
  await expect.poll(() => window_(page)).not.toEqual(before);
  const mb = (await page.locator('button.marker').first().boundingBox())!;
  await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', /.+/);
  const h = await at(page, 0.5);
  await page.mouse.move(h.x, h.y);
  await expect(page.getByTestId('crosshair')).toBeVisible();
  await expect(page.getByTestId('chart-readout')).not.toHaveText('');
});

test.describe('real intraday data', () => {
  test.skip(!hasStudy8, 'no local data or Study 8 runner output');

  test('Eastern date-times on vg-balanced while held; cleared on release and after a symbol switch', async ({
    page
  }) => {
    const id = await runId(page, 'vg-balanced');
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    const before = await window_(page);
    await press(page, 0.55, 0.25);
    await expect(page.getByTestId('measure-percent')).toBeVisible();
    const m = await reading(page);
    expect(m.startMs).toBeLessThan(m.endMs);
    await expect(page.getByTestId('measure-range')).toHaveText(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} E[SD]T → \d{4}-\d{2}-\d{2} \d{2}:\d{2} E[SD]T$/
    );
    await page.mouse.up();
    await expectCleared(page);
    expect(await window_(page)).toEqual(before);
    await page.getByTestId('symbol-tab-GDX').click();
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    await expectCleared(page);
  });
});

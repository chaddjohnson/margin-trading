// ⌘/Ctrl + drag pans the time axis: dragging left shows later times and right earlier ones, smoothly, at the same zoom,
// clamped to the data, with the overview navigator in step and no measurement overlay. The mode is read at the
// mouse-down and locked until the release; release outside the chart, cancellation and focus loss end the pan; no text
// is selected. A plain drag still measures (and clears on release); wheel zoom, crosshair, markers, tooltips, the zoom
// buttons and the overview keep working. The browser here runs on Linux (Ctrl); macOS (⌘) is emulated in one test.

import { type Page, expect, test } from '@playwright/test';

let problems: string[] = [];
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
});
test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));

const open = async (page: Page) => {
  const runs = (await (await page.request.get('/api/runs?q=synthetic%20demo')).json()) as { id: string }[];
  await page.goto(`/#/run/${runs[0]!.id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await page.waitForTimeout(300);
};
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
const overlayShown = (page: Page) =>
  page.evaluate(() =>
    ['measure-shade', 'measure-line', 'measure-dot'].flatMap((id) =>
      [...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)].filter((e) => !e.hidden).map(() => id)
    )
  );
const noMeasurement = async (page: Page) => {
  expect(await overlayShown(page)).toEqual([]);
  await expect(page.getByTestId('measure-percent')).toHaveCount(0);
  expect(await page.getByTestId('measure-bar').getAttribute('data-start-ms')).toBeNull();
};
/** The overview navigator's left handle as a fraction of its canvas (the range selector maps the full extent). */
const handleFraction = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector('.dygraph-rangesel-fgcanvas')!.getBoundingClientRect();
    const hs = [...document.querySelectorAll<HTMLElement>('.dygraph-rangesel-zoomhandle')].map((h) =>
      h.getBoundingClientRect()
    );
    const left = Math.min(...hs.map((r) => r.x + r.width / 2));
    return (left - c.x) / c.width;
  });
const ctrlDrag = async (page: Page, from: number, to: number, key = 'Control', steps = 10) => {
  const a = await point(page, from);
  const b = await point(page, to);
  await page.keyboard.down(key);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(a.x + ((b.x - a.x) * i) / steps, a.y);
    expect(await overlayShown(page)).toEqual([]); // never a measurement while panning
  }
  await page.mouse.up();
  await page.keyboard.up(key);
  await page.waitForTimeout(150);
};
const zoomTo1Y = async (page: Page) => {
  await page.getByRole('button', { name: '1Y', exact: true }).click();
  await page.waitForTimeout(300);
};

test('Ctrl-drag left shows later times, right earlier; same span; overview in step; no measurement', async ({
  page
}) => {
  await open(page);
  const ext = await view(page); // fully zoomed out: the data's extent
  await zoomTo1Y(page);
  const [a0, b0] = await view(page);
  const span = b0 - a0;
  await expect(page.getByTestId('price-chart')).toContainText('Ctrl-drag pans');

  // Drag left by 20% of the plot: the window moves forward in time by about 20% of the span, live.
  const a = await point(page, 0.6);
  const mid = await point(page, 0.5);
  await page.keyboard.down('Control');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(mid.x, mid.y, { steps: 5 });
  await expect.poll(async () => (await view(page))[0]).toBeGreaterThan(a0); // continuous: before the release
  await expect(page.getByTestId('price-chart')).toHaveAttribute('data-panning', 'true');
  expect(await page.evaluate(() => document.documentElement.classList.contains('chart-panning'))).toBe(true);
  await noMeasurement(page);
  const b = await point(page, 0.4);
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Control');
  await page.waitForTimeout(150);
  const [a1, b1] = await view(page);
  expect(a1).toBeGreaterThan(a0);
  expect(Math.abs(b1 - a1 - span)).toBeLessThanOrEqual(1); // zoom unchanged
  expect(a1 - a0).toBeLessThan(0.3 * span); // about 20% of the span (the plot area is a little narrower than the host)
  expect(a1 - a0).toBeGreaterThan(0.15 * span);
  await expect(page.getByTestId('price-chart')).not.toHaveAttribute('data-panning', /.*/);
  await noMeasurement(page);
  // The overview's handles follow the main chart.
  expect(await handleFraction(page)).toBeCloseTo((a1 - ext[0]) / (ext[1] - ext[0]), 1);

  // Drag right by half as far: earlier times, by half the shift (proportional to the drag), same span.
  await ctrlDrag(page, 0.4, 0.5);
  const [a2, b2] = await view(page);
  expect(a2).toBeLessThan(a1);
  expect((a1 - a2) / (a1 - a0)).toBeCloseTo(0.5, 1);
  expect(Math.abs(b2 - a2 - span)).toBeLessThanOrEqual(1);
  expect(await handleFraction(page)).toBeCloseTo((a2 - ext[0]) / (ext[1] - ext[0]), 1);
});

test('the mode is locked at the mouse-down: releasing Ctrl keeps panning; pressing it mid-measure keeps measuring', async ({
  page
}) => {
  await open(page);
  await zoomTo1Y(page);
  const [a0, b0] = await view(page);
  const p = await point(page, 0.7);
  const q = await point(page, 0.55);
  const r = await point(page, 0.35);
  await page.keyboard.down('Control');
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 5 });
  await page.keyboard.up('Control'); // modifier released mid-drag
  const [a1] = await view(page);
  await page.mouse.move(r.x, r.y, { steps: 5 }); // still panning, still no measurement
  await expect.poll(async () => (await view(page))[0]).toBeGreaterThan(a1);
  await noMeasurement(page);
  await page.mouse.up();
  const [a2, b2] = await view(page);
  expect(a2).toBeGreaterThan(a0);
  expect(Math.abs(b2 - a2 - (b0 - a0))).toBeLessThanOrEqual(1);

  // A plain drag measures; Ctrl pressed during it changes nothing; the release clears the measurement.
  const before = await view(page);
  await page.mouse.move(r.x, r.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 5 });
  await expect(page.getByTestId('measure-percent')).toBeVisible();
  await page.keyboard.down('Control');
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await expect(page.getByTestId('measure-percent')).toBeVisible();
  expect(await view(page)).toEqual(before); // measuring never pans
  await page.mouse.up();
  await page.keyboard.up('Control');
  await noMeasurement(page);
});

test('clamped at the data’s ends at the same zoom; release outside the chart, Escape and focus loss end the pan; no text selected', async ({
  page
}) => {
  await open(page);
  const ext = await view(page);
  await zoomTo1Y(page);
  const [a0, b0] = await view(page);
  const span = b0 - a0;

  const panUntilStill = async (from: number, to: number) => {
    for (let i = 0; i < 40; i++) {
      const v = await view(page);
      await ctrlDrag(page, from, to, 'Control', 3);
      const w = await view(page);
      if (w[0] === v[0] && w[1] === v[1]) return;
    }
    throw new Error('the pan never stopped at an end');
  };
  await panUntilStill(0.05, 0.95); // keep dragging right: the earliest window
  let [a, b] = await view(page);
  expect(Math.abs(a - ext[0])).toBeLessThanOrEqual(1);
  expect(Math.abs(b - a - span)).toBeLessThanOrEqual(1);
  expect(await handleFraction(page)).toBeCloseTo(0, 1);
  await panUntilStill(0.95, 0.05); // keep dragging left: the latest window
  [a, b] = await view(page);
  expect(Math.abs(b - ext[1])).toBeLessThanOrEqual(1);
  expect(Math.abs(b - a - span)).toBeLessThanOrEqual(1);

  // Release outside the chart (over the sidebar's text): the pan ends there; no text is selected.
  await ctrlDrag(page, 0.95, 0.6); // away from the end, so there is room to move
  const start = await point(page, 0.5);
  const side = (await page.getByTestId('sidebar').boundingBox())!;
  await page.keyboard.down('Control');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(side.x + side.width / 2, side.y + 200, { steps: 8 });
  expect(await page.evaluate(() => getComputedStyle(document.body).userSelect)).toBe('none');
  await page.mouse.up();
  await page.keyboard.up('Control');
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
  expect(await page.evaluate(() => document.documentElement.classList.contains('chart-panning'))).toBe(false);
  const ended = await view(page);
  await page.mouse.move(start.x, start.y, { steps: 4 }); // no button: no pan
  expect(await view(page)).toEqual(ended);

  // Focus loss and Escape end a pan in place; later moves of the same press do not pan.
  for (const cancel of ['blur', 'Escape'] as const) {
    await page.keyboard.down('Control');
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    const q = await point(page, 0.35);
    await page.mouse.move(q.x, q.y, { steps: 4 });
    if (cancel === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    else await page.keyboard.press('Escape');
    await page.keyboard.up('Control');
    const stopped = await view(page);
    expect(await page.evaluate(() => document.documentElement.classList.contains('chart-panning'))).toBe(false);
    const r = await point(page, 0.1);
    await page.mouse.move(r.x, r.y, { steps: 4 });
    expect(await view(page)).toEqual(stopped);
    await page.mouse.up();
    await noMeasurement(page);
  }
});

test('after panning: wheel zoom, crosshair, marker tooltips and clicks, zoom buttons and the overview still work', async ({
  page
}) => {
  await open(page);
  await zoomTo1Y(page);
  await ctrlDrag(page, 0.7, 0.4);
  const [a, b] = await view(page);
  // Cursor-centred wheel zoom.
  const p = await point(page, 0.5);
  await page.mouse.move(p.x, p.y);
  await page.mouse.wheel(0, 100);
  await expect.poll(async () => (await view(page))[1] - (await view(page))[0]).toBeLessThan(b - a);
  // Crosshair.
  await page.mouse.move(p.x + 3, p.y);
  await expect(page.getByTestId('crosshair')).toBeVisible();
  await expect(page.getByTestId('chart-readout')).not.toHaveText('');
  // Zoom buttons and the overview: "All" shows everything again; markers show tooltips and select on click.
  await page.getByTestId('zoom-all').click();
  await expect.poll(() => handleFraction(page)).toBeLessThan(0.02);
  const mb = (await page.locator('button.marker').first().boundingBox())!;
  await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await expect(page.getByTestId('marker-tooltip')).toBeVisible();
  await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', /.+/);
  await page.getByRole('button', { name: '3M', exact: true }).click();
  await expect.poll(async () => (await view(page))[1] - (await view(page))[0]).toBeLessThan(100 * 86_400_000);
});

test.describe('macOS', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' });
      Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => ({ platform: 'macOS' }) });
    });
  });

  test('⌘-drag pans (Ctrl-drag does not: Ctrl-click is a right-click on macOS)', async ({ page }) => {
    await open(page);
    await expect(page.getByTestId('price-chart')).toContainText('⌘-drag pans');
    await zoomTo1Y(page);
    const [a0, b0] = await view(page);
    await ctrlDrag(page, 0.6, 0.3, 'Meta');
    const [a1, b1] = await view(page);
    expect(a1).toBeGreaterThan(a0);
    expect(Math.abs(b1 - a1 - (b0 - a0))).toBeLessThanOrEqual(1);
    await noMeasurement(page);
    // With Ctrl on "macOS" the drag is a measurement, not a pan.
    const s = await point(page, 0.3);
    const e = await point(page, 0.6);
    await page.keyboard.down('Control');
    await page.mouse.move(s.x, s.y);
    await page.mouse.down();
    await page.mouse.move(e.x, e.y, { steps: 5 });
    expect(await view(page)).toEqual([a1, b1]);
    await page.mouse.up();
    await page.keyboard.up('Control');
    await noMeasurement(page);
  });
});

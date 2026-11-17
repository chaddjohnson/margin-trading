// Drag-to-measure on the price chart: live while dragging, snapped to plotted points inside the visible window,
// chronological in either direction, no zoom or pan. Since Task 18 (2026-11-18) the measurement stays after the release
// (on or off the chart, a missed release, focus loss) until a plain click on the chart, Escape, the next drag or the
// chart unmounting. The hover read-out has its own row and never covers it, and the overlays line up with the canvas.
// Shift/Ctrl-drag panning, the zoom buttons, markers and the crosshair are preserved.

import { type Page, expect, test } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { CandlesResponse } from '../shared/candles.ts';
import { chooseChart } from './helpers.ts';

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

/** Press at `from`, drag to `to` and keep the button DOWN. */
async function press(page: Page, from: number, to: number, steps = 8) {
  const a = await at(page, from);
  const b = await at(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
}

/** Whether any part of the measurement overlay is on screen. */
const overlayShown = (page: Page) =>
  page.evaluate(() =>
    ['measure-shade', 'measure-line', 'measure-dot'].flatMap((id) =>
      [...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)].filter((e) => !e.hidden).map(() => id)
    )
  );
async function expectCleared(page: Page) {
  expect(await overlayShown(page)).toEqual([]); // the overlay goes at once, not later
  const bar = page.getByTestId('measure-bar');
  await expect(bar).not.toHaveAttribute('data-start-ms', /.+/, { timeout: 250 });
  await expect(page.getByTestId('measure-percent')).toHaveCount(0);
  await expect(bar).toContainText('Drag across the');
}

async function reading(page: Page) {
  const bar = page.getByTestId('measure-bar');
  const num = async (k: string) => Number(await bar.getAttribute(k));
  return {
    startMs: await num('data-start-ms'),
    endMs: await num('data-end-ms'),
    startPrice: await num('data-start-price'),
    endPrice: await num('data-end-price'),
    range: await page.getByTestId('measure-range').innerText(),
    change: await page.getByTestId('measure-change').innerText(),
    percent: await page.getByTestId('measure-percent').innerText(),
    cls: (await bar.getAttribute('class')) ?? ''
  };
}
type Reading = Awaited<ReturnType<typeof reading>>;

/** The measurement after the release: the same reading, the whole overlay still drawn. */
async function expectKept(page: Page, m: Reading) {
  await expect(page.getByTestId('measure-percent')).toBeVisible();
  expect(await reading(page)).toEqual(m);
  expect((await overlayShown(page)).sort()).toEqual(
    ['measure-dot', 'measure-dot', 'measure-line', 'measure-line', 'measure-shade'].sort()
  );
}

/** $ and % recomputed here from the two endpoint prices (start = the earlier point), as the bar prints them. */
function expectArithmetic(m: Reading) {
  const delta = m.endPrice - m.startPrice;
  const pct = (delta / m.startPrice) * 100;
  const sign = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '');
  expect(m.startMs).toBeLessThan(m.endMs);
  expect(m.change).toBe(`${sign(delta)}$${Math.abs(delta).toFixed(2)}`);
  expect(m.percent).toBe(`${sign(pct)}${Math.abs(pct).toFixed(2)}%`);
  expect(m.cls).toContain(delta > 0 ? 'dir-up' : delta < 0 ? 'dir-down' : 'dir-flat');
}

const window_ = async (page: Page) => [
  await page.getByTestId('price-chart').getAttribute('data-view-from'),
  await page.getByTestId('price-chart').getAttribute('data-view-to')
];

/** Rectangles of the measurement's parts, the hover read-out and the chart host, as laid out now. */
const layout = (page: Page) =>
  page.evaluate(() => {
    const r = (el: Element | null) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    const q = (s: string) => document.querySelector(s);
    return {
      parts: ['measure-kind', 'measure-start', 'measure-end', 'measure-change', 'measure-percent'].map((id) => ({
        id,
        rect: r(q(`[data-testid="${id}"]`))
      })),
      bar: r(q('[data-testid="measure-bar"]')),
      readout: r(q('[data-testid="chart-readout"]')),
      readoutText: q('[data-testid="chart-readout"]')!.textContent ?? '',
      frame: r(q('[data-testid="price-chart"]')),
      host: r(q('.chart-host')),
      layer: r(q('[data-testid="marker-layer"]')),
      density: (q('[data-testid="candle-density"]') as HTMLElement | null)?.hidden === false
        ? r(q('[data-testid="candle-density"]'))
        : null
    };
  });
type Rect = { x: number; y: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Nothing covers the measurement: every part is on screen, inside the frame, clear of the read-out and the note. */
async function expectLegible(page: Page) {
  const l = await layout(page);
  for (const p of l.parts) {
    expect(p.rect, p.id).not.toBeNull();
    expect(p.rect!.w, p.id).toBeGreaterThan(0);
    expect(p.rect!.x + p.rect!.w, p.id).toBeLessThanOrEqual(l.frame!.x + l.frame!.w + 0.5);
    expect(overlaps(p.rect!, l.readout!), `${p.id} under the read-out`).toBe(false);
    if (l.density) expect(overlaps(p.rect!, l.density), `${p.id} under the density note`).toBe(false);
    expect(p.rect!.y + p.rect!.h, `${p.id} above the plot`).toBeLessThanOrEqual(l.host!.y + 0.5);
  }
  // the overlay layer is exactly the canvas box: shade, lines and dots never reach the rows above the plot
  for (const k of ['x', 'y', 'w', 'h'] as const) expect(Math.abs(l.layer![k] - l.host![k]), `layer ${k}`).toBeLessThan(0.5);
  return l;
}

test('live while dragging, snapped and chronological; kept after the release; a click, Escape or a new drag replaces it', async ({
  page
}) => {
  const id = await runId(page, 'synthetic demo');
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await page.waitForTimeout(300);
  const before = await window_(page);
  await expect(page.getByTestId('measure-bar')).toContainText('Drag across the chart');
  expect(await overlayShown(page)).toEqual([]);

  // Live: the read-out and the overlay appear and follow the pointer while the button is down.
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
  await expect(page.getByTestId('measure-kind')).toHaveText('Synthetic close → close');
  await expect(page.getByTestId('measure-range')).toHaveText(
    /^\d{4}-\d{2}-\d{2} \(synthetic\) \$\d+\.\d{2} → \d{4}-\d{2}-\d{2} \(synthetic\) \$\d+\.\d{2}$/
  );
  const fwd = await reading(page);
  expectArithmetic(fwd);
  expect(await window_(page)).toEqual(before); // no zoom, no pan
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

  // The release keeps all of it: the read-out (unchanged) and the shading, both lines and both dots.
  await page.mouse.up();
  await expectKept(page, fwd);
  await expectLegible(page);
  await page.mouse.move(b.x - 40, b.y); // hovering elsewhere changes the hover read-out only
  await expect(page.getByTestId('chart-readout')).not.toHaveText('');
  expect(await reading(page)).toEqual(fwd);

  // A plain click on the chart clears it.
  const c = await at(page, 0.5);
  await page.mouse.click(c.x, c.y);
  await expectCleared(page);
  expect(await window_(page)).toEqual(before);

  // Reverse drag over the same span gives the same chronological measurement, kept after the release.
  await press(page, 0.65, 0.3);
  await page.mouse.up();
  await expectKept(page, fwd);

  // Escape clears it.
  await page.keyboard.press('Escape');
  await expectCleared(page);

  // A new drag replaces an existing measurement.
  await press(page, 0.3, 0.65);
  await page.mouse.up();
  await expectKept(page, fwd);
  await press(page, 0.2, 0.4);
  await page.mouse.up();
  const next = await reading(page);
  expect(next.startMs).toBeLessThan(fwd.startMs);
  expect(next.endMs).toBeLessThan(fwd.endMs);
  expectArithmetic(next);
  await page.keyboard.press('Escape');
  await expectCleared(page);
});

test('release off the chart, focus loss and a missed release keep it; Escape mid-drag clears it; pan, zoom, markers and the crosshair work', async ({
  page
}) => {
  const id = await runId(page, 'synthetic demo');
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await page.waitForTimeout(300);
  const percent = page.getByTestId('measure-percent');

  // Dragged off the chart onto the sidebar and released there (left of the plot, so the end stops at the first point
  // in view): the measurement stays as it read when released.
  await press(page, 0.6, 0.4);
  await expect(percent).toBeVisible();
  const side = (await page.getByTestId('sidebar').boundingBox())!;
  await page.mouse.move(side.x + side.width / 2, side.y + side.height / 2, { steps: 6 });
  await expect(percent).toBeVisible(); // still held: still measuring
  const offChart = await reading(page);
  await page.mouse.up();
  await expectKept(page, offChart);
  await page.keyboard.press('Escape');
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

  // The window loses focus mid-drag (the release may never arrive): the drag ends and its measurement stays.
  await press(page, 0.2, 0.5);
  await expect(percent).toBeVisible();
  const blurred = await reading(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const later = await at(page, 0.8);
  await page.mouse.move(later.x, later.y, { steps: 4 }); // no longer dragging: nothing changes
  await expectKept(page, blurred);
  await page.mouse.up();
  await expectKept(page, blurred);
  await page.keyboard.press('Escape');
  await expectCleared(page);

  // A missed release: the next move reports no button held, so the drag ends and keeps its measurement.
  await press(page, 0.25, 0.55);
  await expect(percent).toBeVisible();
  const missed = await reading(page);
  await page.evaluate(() =>
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 0, clientX: 600, clientY: 300 }))
  );
  await expectKept(page, missed);
  await page.mouse.up();
  await expectKept(page, missed);

  // A plain click on the chart clears it, and a click on an empty chart shows nothing.
  const c = await at(page, 0.5);
  await page.mouse.click(c.x, c.y);
  await expectCleared(page);
  await page.mouse.click(c.x, c.y);
  await expectCleared(page);

  // Shift-drag pans (after zooming in) and never measures.
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

  // A Shift-drag pan keeps an existing measurement (same reading; its lines follow the pan).
  await press(page, 0.3, 0.6);
  await page.mouse.up();
  const kept = await reading(page);
  const lineX = () => page.getByTestId('measure-line').first().evaluate((e) => (e as HTMLElement).style.left);
  const x0 = await lineX();
  await page.keyboard.down('Shift');
  await page.mouse.move(p1.x, p1.y);
  await page.mouse.down();
  await page.mouse.move(p0.x, p0.y, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect.poll(lineX).not.toBe(x0);
  expect(await reading(page)).toEqual(kept);
  await page.keyboard.press('Escape');
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

test.describe('real data (Study 8 vg-balanced import, VGT)', () => {
  test.skip(!hasStudy8, 'no local data or Study 8 runner output');

  const study8 = async (page: Page) => {
    const runs = (await (await page.request.get('/api/runs?q=vg-balanced')).json()) as { id: string; kind: string }[];
    return runs.find((r) => r.kind === 'import')!.id;
  };
  const candlesOf = async (page: Page, id: string) =>
    (await (await page.request.get(`/api/runs/${id}/candles?symbol=VGT`)).json()) as CandlesResponse;
  /** The plot as drawn (window, y range, plot area), mapped like Dygraphs' toDomCoords, in page pixels. */
  const geometry = async (page: Page) => {
    const d = await page.getByTestId('price-chart').evaluate((el) => ({ ...(el as HTMLElement).dataset }));
    const host = (await page.locator('.chart-host').boundingBox())!;
    const [ax, ay, aw, ah] = d.area!.split(',').map(Number) as [number, number, number, number];
    const from = Date.parse(d.viewFrom!);
    const to = Date.parse(d.viewTo!);
    const yMin = Number(d.yMin);
    const yMax = Number(d.yMax);
    return {
      from,
      to,
      top: host.y + ay,
      height: ah,
      left: host.x + ax,
      width: aw,
      xPx: (ms: number) => host.x + ax + ((ms - from) / (to - from)) * aw,
      yPx: (p: number) => host.y + ay + ((yMax - p) / (yMax - yMin)) * ah,
      tAt: (px: number) => from + ((px - host.x - ax) / aw) * (to - from)
    };
  };
  const sessionOn = (c: CandlesResponse, date: string) => c.d.findIndex((d) => d >= date);
  /** Whether session i is the one under page x: the nearest in view, give or take the pointer's pixel rounding. */
  const under = (c: CandlesResponse, g: Awaited<ReturnType<typeof geometry>>, i: number, px: number) => {
    const inView = c.x.filter((x) => x >= g.from && x <= g.to).length;
    return i >= 0 && c.x[i]! >= g.from && c.x[i]! <= g.to && Math.abs(g.xPx(c.x[i]!) - px) <= g.width / inView / 2 + 1;
  };
  /** The measured endpoints are candles: their New York dates and their CLOSES, printed with $ in the bar. */
  async function expectCloses(page: Page, c: CandlesResponse) {
    const m = await reading(page);
    const si = c.x.indexOf(m.startMs);
    const ei = c.x.indexOf(m.endMs);
    expect(si, 'start is a session').toBeGreaterThanOrEqual(0);
    expect(ei, 'end is a later session').toBeGreaterThan(si);
    expect(m.startPrice).toBe(c.c[si]);
    expect(m.endPrice).toBe(c.c[ei]);
    await expect(page.getByTestId('measure-start')).toHaveText(`${c.d[si]} close $${c.c[si]!.toFixed(2)}`);
    await expect(page.getByTestId('measure-end')).toHaveText(`${c.d[ei]} close $${c.c[ei]!.toFixed(2)}`);
    expectArithmetic(m);
    return { m, si, ei };
  }
  /** Both dots sit on the measured closes and both lines span exactly the plot (no offset from the bar above). */
  async function expectOverlayOnCloses(page: Page, m: Reading) {
    const g = await geometry(page);
    const dots = await page.getByTestId('measure-dot').evaluateAll((els) =>
      els.map((e) => {
        const b = e.getBoundingClientRect();
        return [b.x + b.width / 2, b.y + b.height / 2] as const;
      })
    );
    const want: [number, number][] = [
      [g.xPx(m.startMs), g.yPx(m.startPrice)],
      [g.xPx(m.endMs), g.yPx(m.endPrice)]
    ];
    for (const [x, y] of want) expect(dots.some(([dx, dy]) => Math.abs(dx - x) < 1.5 && Math.abs(dy - y) < 1.5), `dot at ${x},${y}`).toBe(true);
    for (const line of await page.getByTestId('measure-line').all()) {
      const b = (await line.boundingBox())!;
      expect(Math.abs(b.y - g.top)).toBeLessThan(1);
      expect(Math.abs(b.height - g.height)).toBeLessThan(1);
    }
  }

  test('VGT · Candles · 1D · All: late 2020 → late 2021 reads two dates, two closes, $ and %, never covered by the hover read-out; reverse is identical', async ({
    page
  }) => {
    const id = await study8(page);
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-candles-in-view', /\d{4}/, { timeout: 60_000 });
    await page.getByTestId('zoom-all').click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-candle-density', 'dense');
    const c = await candlesOf(page, id);
    const g = await geometry(page);
    const y = g.top + g.height * 0.45;
    const xs = g.xPx(c.x[sessionOn(c, '2020-10-01')]!);
    const xm = g.xPx(c.x[sessionOn(c, '2021-05-03')]!);
    const xe = g.xPx(c.x[sessionOn(c, '2021-12-13')]!);

    await page.mouse.move(xs, y);
    await page.mouse.down();
    await page.mouse.move(xm, y, { steps: 6 });
    await expect(page.getByTestId('measure-kind')).toHaveText('Daily close → daily close');
    await expect(page.getByTestId('measure-bar')).toHaveAttribute('data-basis', 'daily-close');
    const during = await reading(page);
    await page.mouse.move(xe, y, { steps: 6 });
    await expect.poll(async () => (await reading(page)).endMs).not.toBe(during.endMs); // updates while dragging
    const held = await expectCloses(page, c);
    expect(under(c, g, held.si, xs), `start ${c.d[held.si]} under the press`).toBe(true);
    expect(under(c, g, held.ei, xe), `end ${c.d[held.ei]} under the pointer`).toBe(true);
    expect(c.d[held.si]! >= '2020-09-01' && c.d[held.ei]! >= '2021-11-15' && c.d[held.ei]! <= '2021-12-31').toBe(true);
    expect(held.m.percent).toMatch(/^\+4\d\.\d{2}%$/); // VGT rose ~45 % over that year (checked from the closes above)
    // While held the hovered candle's OHLC has its own row; the measurement stays legible.
    await expect(page.getByTestId('chart-readout')).toContainText('daily OHLC');
    const l = await expectLegible(page);
    expect(l.readoutText).toContain('close vs open');
    expect(await page.getByTestId('measure-bar').innerText()).not.toContain('close vs open');
    await expectOverlayOnCloses(page, held.m);

    // Released: unchanged and still legible; hovering other candles only changes the read-out row.
    await page.mouse.up();
    await expectKept(page, held.m);
    await page.mouse.move(g.xPx(c.x[sessionOn(c, '2023-03-01')]!), y);
    await expect(page.getByTestId('chart-readout')).toContainText('2023-');
    await expectKept(page, held.m);
    await expectLegible(page);

    // Reverse direction over the same two points: the same chronological result.
    await page.keyboard.press('Escape');
    await expectCleared(page);
    await page.mouse.move(xe, y);
    await page.mouse.down();
    await page.mouse.move(xs, y, { steps: 10 });
    await page.mouse.up();
    await expectKept(page, held.m);
  });

  test('VGT candles: the end follows the pointer over markers, the bar and the range selector, stops at the edge of the window; overlays and markers line up with the canvas', async ({
    page
  }) => {
    const id = await study8(page);
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-candles-in-view', /\d/, { timeout: 60_000 });
    await page.getByRole('button', { name: '3Y', exact: true }).click();
    await page.waitForTimeout(400);
    const c = await candlesOf(page, id);
    const g = await geometry(page);
    const markers = await page.locator('button.marker:not([hidden])').evaluateAll((bs) =>
      bs.map((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.y, id: (b as HTMLElement).dataset.eventId!, kind: (b as HTMLElement).dataset.kind! };
      })
    );
    const mk = markers.find((m) => m.x > g.left + g.width * 0.4 && m.x < g.left + g.width * 0.9)!;
    expect(mk, 'a marker in the right half of the 3Y window').toBeTruthy();

    // Markers sit at their recorded prices (anchor = the price; exits above, entries below by their offsets).
    const events = (
      (await (await page.request.get(`/api/runs/${id}/events?symbol=VGT`)).json()) as { events: { id: string; price: number | null }[] }
    ).events;
    for (const m of markers) {
      const e = events.find((x) => x.id === m.id);
      if (!e || e.price === null || (m.kind !== 'executed_entry' && m.kind !== 'executed_exit')) continue;
      const anchor = m.top - (m.kind === 'executed_exit' ? -16 : 2);
      expect(Math.abs(anchor - g.yPx(e.price)), `${m.id} at its price`).toBeLessThan(1.5);
    }

    const y = g.top + g.height * 0.5;
    const x0 = g.left + g.width * 0.2;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    const endUnder = async (px: number) => under(c, g, c.x.indexOf((await reading(page)).endMs), px);
    // over a marker button (the pre-fix code snapped to a session left of the window here)
    await page.mouse.move(mk.x + 2, mk.y + 2, { steps: 6 });
    await expect.poll(() => endUnder(mk.x + 2)).toBe(true);
    expect(under(c, g, c.x.indexOf((await reading(page)).startMs), x0)).toBe(true);
    // over the measurement bar above the plot
    const bar = (await page.getByTestId('measure-bar').boundingBox())!;
    await page.mouse.move(mk.x + 40, bar.y + bar.height / 2, { steps: 3 });
    await expect.poll(() => endUnder(mk.x + 40)).toBe(true);
    // over the range selector below the plot
    const host = (await page.locator('.chart-host').boundingBox())!;
    await page.mouse.move(mk.x + 60, host.y + host.height - 20, { steps: 3 });
    await expect.poll(() => endUnder(mk.x + 60)).toBe(true);
    // past the plot's right edge: the last session in view, never one beyond the window
    await page.mouse.move(host.x + host.width + 30, y, { steps: 4 });
    const last = c.x.filter((x) => x <= g.to).length - 1;
    await expect.poll(async () => (await reading(page)).endMs).toBe(c.x[last]);
    expect(c.x[last]!).toBeGreaterThanOrEqual(g.from);
    // past the left edge: the first session in view (the measurement turns around chronologically)
    await page.mouse.move(host.x - 30, y, { steps: 6 });
    const first = c.x.findIndex((x) => x >= g.from);
    await expect.poll(async () => (await reading(page)).startMs).toBe(c.x[first]);
    await page.mouse.up();
    const m = (await expectCloses(page, c)).m;
    await expectOverlayOnCloses(page, m);
    await page.keyboard.press('Escape');
    await expectCleared(page);
  });

  test('VGT candles: a fall reads negative; zoom, pan and presets keep it; a narrow viewport stays legible; the line measures minute closes; switching clears it', async ({
    page
  }) => {
    const id = await study8(page);
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-candles-in-view', /\d/, { timeout: 60_000 });
    await page.getByRole('button', { name: '3Y', exact: true }).click();
    await page.waitForTimeout(400);
    const c = await candlesOf(page, id);
    let g = await geometry(page);
    const y = g.top + g.height * 0.4;
    // 2021-12-27 → 2022-10-14: VGT's 2022 fall
    await page.mouse.move(g.xPx(c.x[sessionOn(c, '2021-12-27')]!), y);
    await page.mouse.down();
    await page.mouse.move(g.xPx(c.x[sessionOn(c, '2022-10-14')]!), y, { steps: 8 });
    await page.mouse.up();
    const fall = await expectCloses(page, c);
    expect(fall.m.cls).toContain('dir-down');
    expect(fall.m.change).toMatch(/^−\$\d+\.\d{2}$/);
    expect(fall.m.percent).toMatch(/^−3\d\.\d{2}%$/);
    await expectLegible(page);

    // Wheel zoom, Ctrl-drag pan and a preset keep the same reading; the overlay follows the new window.
    const box = (await page.locator('.chart-host').boundingBox())!;
    await page.mouse.move(g.xPx(c.x[fall.si]!) + 30, y);
    await page.mouse.wheel(0, -120); // swipe down: zoom out (both endpoints stay in view)
    await page.waitForTimeout(250);
    await expectKept(page, fall.m);
    await expectOverlayOnCloses(page, fall.m);
    const before = await window_(page);
    await page.keyboard.down('Control');
    await page.mouse.move(box.x + box.width * 0.5, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, y, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up('Control');
    await expect.poll(() => window_(page)).not.toEqual(before);
    expect(await reading(page)).toEqual(fall.m);
    await page.getByRole('button', { name: '1Y', exact: true }).click(); // the endpoints may leave the window
    await page.waitForTimeout(250);
    expect(await reading(page)).toEqual(fall.m);
    await page.keyboard.press('Escape');
    await expectCleared(page);

    // A narrower viewport: the bar may wrap, but nothing covers it and the overlay stays on the canvas.
    await page.setViewportSize({ width: 820, height: 900 });
    await page.getByTestId('zoom-all').click();
    await page.waitForTimeout(400);
    await page.getByTestId('price-chart').scrollIntoViewIfNeeded();
    g = await geometry(page);
    const yn = g.top + g.height * 0.45;
    await page.mouse.move(g.xPx(c.x[sessionOn(c, '2020-10-01')]!), yn);
    await page.mouse.down();
    await page.mouse.move(g.xPx(c.x[sessionOn(c, '2021-12-13')]!), yn, { steps: 8 });
    await expect(page.getByTestId('chart-readout')).toContainText('daily OHLC');
    await expectLegible(page);
    await page.mouse.up();
    const narrow = await expectCloses(page, c);
    await expectLegible(page);
    await expectOverlayOnCloses(page, narrow.m);
    await page.setViewportSize({ width: 1600, height: 1000 });

    // Line · intraday: the chart remounts (the measurement goes); minute closes at Eastern minute times.
    await chooseChart(page, 'line');
    await expectCleared(page);
    await page.getByRole('button', { name: '1M', exact: true }).click();
    await page.waitForTimeout(1200); // the detail fetch (debounced) and redraw
    await press(page, 0.25, 0.7);
    await page.mouse.up();
    await expect(page.getByTestId('measure-bar')).toHaveAttribute('data-basis', 'minute');
    await expect(page.getByTestId('measure-kind')).toHaveText('Minute close → minute close');
    await expect(page.getByTestId('measure-range')).toHaveText(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} E[SD]T \$\d+\.\d{2} → \d{4}-\d{2}-\d{2} \d{2}:\d{2} E[SD]T \$\d+\.\d{2}$/
    );
    const line = await reading(page);
    expectArithmetic(line);
    const [vf, vt] = (await window_(page)).map((s) => Date.parse(s!));
    expect(line.startMs).toBeGreaterThanOrEqual(vf!);
    expect(line.endMs).toBeLessThanOrEqual(vt!);
    await expectLegible(page);
    await chooseChart(page, 'candles');
    await expectCleared(page);
  });

  test('Line · intraday: Eastern date-times; kept after the release; cleared after a symbol switch', async ({ page }) => {
    const id = await study8(page);
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    await chooseChart(page, 'line'); // minute instants are the line's (candles measure close → close)
    const before = await window_(page);
    await press(page, 0.55, 0.25);
    await expect(page.getByTestId('measure-percent')).toBeVisible();
    const m = await reading(page);
    expect(m.startMs).toBeLessThan(m.endMs);
    await expect(page.getByTestId('measure-range')).toHaveText(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} E[SD]T \$\d+\.\d{2} → \d{4}-\d{2}-\d{2} \d{2}:\d{2} E[SD]T \$\d+\.\d{2}$/
    );
    await page.mouse.up();
    await expectKept(page, m);
    expect(await window_(page)).toEqual(before);
    await page.getByTestId('symbol-tab-GDX').click();
    // the new chart's own markers (the outgoing chart's could satisfy a plain "a marker is visible")
    await expect(page.locator('button.marker[data-symbol="GDX"]').first()).toBeVisible({ timeout: 60_000 });
    await expectCleared(page);
  });
});

// "Candles · 1D" (Task 16) in the browser, on the real canonical data: the default chart of a real run, green/red/doji
// pixels and wicks, autoscaling to the highs and lows, the read-out, the chart-type switch (run, symbol, window,
// selection and marker checkboxes kept; no rerun; no refetch), dense intraday markers on their New York session with
// their exact times and prices, clickable clusters, trade selection and links, every gesture (close → close measure,
// Ctrl-drag pan, swipe zoom, double-click, buttons, keyboard), the Study 8 import and a comparison in their own units,
// the synthetic demo (line only), narrow and Interactive Preview layouts, and saved results left unchanged.
import { type Page, expect, test } from '@playwright/test';

import type { CandlesResponse } from '../shared/candles.ts';
import { failOnConsoleProblems, hasData } from './console.ts';
import { chooseChart, type Ev, eventsOf, tradingRun } from './helpers.ts';

failOnConsoleProblems();

const NY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short'
});
const ny = (iso: string) => {
  const p = Object.fromEntries(NY.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, label: `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${p.timeZoneName}` };
};

const candlesOf = async (page: Page, id: string, symbol: string) =>
  (await (await page.request.get(`/api/runs/${id}/candles?symbol=${symbol}`)).json()) as CandlesResponse;

/** The plot as drawn: the window, the y range and the plot area the chart frame reports, mapped like toDomCoords. */
async function geometry(page: Page) {
  const d = await page.getByTestId('price-chart').evaluate((el) => ({ ...(el as HTMLElement).dataset }));
  const [ax, ay, aw, ah] = d.area!.split(',').map(Number) as [number, number, number, number];
  const from = Date.parse(d.viewFrom!);
  const to = Date.parse(d.viewTo!);
  const yMin = Number(d.yMin);
  const yMax = Number(d.yMax);
  return {
    from,
    to,
    yMin,
    yMax,
    area: { x: ax, y: ay, w: aw, h: ah },
    xPx: (ms: number) => ax + ((ms - from) / (to - from)) * aw,
    yPx: (p: number) => ay + ((yMax - p) / (yMax - yMin)) * ah,
    density: d.candleDensity
  };
}

/** Pixels of the main plot canvas at points in the chart host's CSS pixels — ONE readback for all of them. */
const pixels = (page: Page, points: (readonly [number, number])[]) =>
  page.evaluate((pts) => {
    const c = document.querySelector('.chart-host canvas') as HTMLCanvasElement;
    const k = c.width / c.clientWidth;
    const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    return pts.map(([x, y]) => {
      const i = (Math.round(y * k) * c.width + Math.round(x * k)) * 4;
      return { r: data[i]!, g: data[i + 1]!, b: data[i + 2]! };
    });
  }, points);

const view = async (page: Page) => {
  const f = page.getByTestId('price-chart');
  return [Date.parse((await f.getAttribute('data-view-from'))!), Date.parse((await f.getAttribute('data-view-to'))!)] as const;
};

/** Zooms the chart to one week around an event of the given New York date (selected through the event table). */
async function zoomToDate(page: Page, date: string) {
  await page.getByTestId('event-table').getByText('All dates', { exact: true }).click();
  await page.getByLabel('Filter events').fill(date);
  const row = page.locator('[data-testid="event-table"] tbody tr').first();
  await row.click();
  await page.getByRole('button', { name: 'Zoom here' }).click();
  await page.getByRole('button', { name: '1W', exact: true }).click();
  await row.click(); // selecting it again centres the week on it when the zoom left it outside
  await page.getByLabel('Filter events').fill('');
  await page.getByTestId('price-chart').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('price-chart')).toHaveAttribute('data-candle-density', 'bodies');
  await page.waitForTimeout(300);
}

test.describe('daily OHLC candles on real data', () => {
  test.skip(!hasData, 'the git-ignored data/ files are not present');

  test('a real VGT run opens on daily candles: teal-green up, red down, wicks, highs/lows in the axis, a session read-out', async ({
    page
  }) => {
    const id = await tradingRun(page, 'e2e markers VGT 2023', ['VGT']);
    const requests: string[] = [];
    page.on('request', (r) => requests.push(new URL(r.url()).pathname + new URL(r.url()).search));
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    await expect(page.getByTestId('chart-type-candles')).toBeChecked();
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-chart-mode', 'candles');
    await expect(page.getByTestId('legend-candles')).toHaveText(/ VGT \(USD per share, split-adjusted to \d{4}-\d{2}-\d{2} share units\) · daily OHLC$/);
    await expect(page.getByTestId('chart-type-note')).toContainText('one candle per NYSE session');
    // only the daily candles were requested: no minute-line transfer for this view
    expect(requests.filter((u) => u.startsWith(`/api/runs/${id}/candles?symbol=VGT`))).toHaveLength(1);
    expect(requests.filter((u) => u.includes('/prices'))).toEqual([]);

    await page.getByRole('button', { name: '1M', exact: true }).click();
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-candle-density', 'bodies');
    await page.waitForTimeout(300);
    const c = await candlesOf(page, id, 'VGT');
    const g = await geometry(page);
    const inView = c.d.map((_, i) => i).filter((i) => c.x[i]! >= g.from && c.x[i]! <= g.to);
    expect(inView.length).toBeGreaterThan(12);
    // the y axis covers the daily HIGHS and LOWS in view, not only the closes
    expect(g.yMax).toBeGreaterThanOrEqual(Math.max(...inView.map((i) => c.h[i]!)));
    expect(g.yMin).toBeLessThanOrEqual(Math.min(...inView.map((i) => c.l[i]!)));
    expect(Math.max(...inView.map((i) => c.h[i]!))).toBeGreaterThan(Math.max(...inView.map((i) => c.c[i]!)));

    // pixels: the biggest up body is teal inside (hollow), the biggest down body solid red; their wicks in colour
    const biggest = (up: boolean) =>
      inView.filter((i) => (up ? c.c[i]! > c.o[i]! : c.c[i]! < c.o[i]!)).sort((a, b) => Math.abs(c.c[b]! - c.o[b]!) - Math.abs(c.c[a]! - c.o[a]!))[0]!;
    const probes: { up: boolean; body: readonly [number, number]; wick: (readonly [number, number])[] }[] = [];
    for (const up of [true, false]) {
      const i = biggest(up);
      const x = g.xPx(c.x[i]!);
      expect(Math.abs(g.yPx(c.c[i]!) - g.yPx(c.o[i]!))).toBeGreaterThan(6);
      const top = Math.max(c.o[i]!, c.c[i]!);
      const wy = (g.yPx(top) + g.yPx(c.h[i]!)) / 2;
      probes.push({
        up,
        body: [x + 2, g.yPx((c.o[i]! + c.c[i]!) / 2)],
        wick: g.yPx(top) - g.yPx(c.h[i]!) >= 4 ? [-1, 0, 1].map((d) => [Math.round(x) + d, wy] as const) : []
      });
    }
    const read = await pixels(page, probes.flatMap((p) => [p.body, ...p.wick]));
    for (const p of probes) {
      const body = read.shift()!;
      if (p.up) expect(body.g > body.r + 15 && body.b > body.r, JSON.stringify(body)).toBe(true);
      else expect(body.r > 200 && body.g < 120, JSON.stringify(body)).toBe(true);
      const wick = p.wick.map(() => read.shift()!);
      if (wick.length) expect(wick.some((q) => (p.up ? q.g > 120 && q.r < 90 : q.r > 180 && q.g < 120)), JSON.stringify(wick)).toBe(true);
    }

    // hovering a candle reads its session date and O/H/L/C (as served), never a minute time
    const host = (await page.locator('.chart-host').boundingBox())!;
    const i = inView[Math.floor(inView.length / 2)]!;
    await page.mouse.move(host.x + g.xPx(c.x[i]!), host.y + g.area.y + 12);
    const readout = page.getByTestId('chart-readout');
    await expect(readout).toHaveAttribute('data-date', c.d[i]!);
    const money = (v: number) => `\\$${v.toFixed(2).replace('.', '\\.')}`;
    await expect(readout).toHaveText(
      new RegExp(`^${c.d[i]} \\w{3} · daily OHLC · O ${money(c.o[i]!)} H ${money(c.h[i]!)} L ${money(c.l[i]!)} C ${money(c.c[i]!)} · [+−±]\\$`)
    );
    expect(await readout.innerText()).not.toMatch(/\d{2}:\d{2} E[SD]T/);
    await expect(page.getByTestId('crosshair')).toBeVisible();
  });

  test('switching to Line · intraday and back keeps run, symbol, window, selection and marker checkboxes — no rerun, no refetch', async ({
    page
  }) => {
    const id = await tradingRun(page, 'e2e markers VGT GDX 2023', ['VGT', 'GDX']);
    const requests: { method: string; path: string }[] = [];
    page.on('request', (r) => requests.push({ method: r.method(), path: new URL(r.url()).pathname }));
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    await page.getByRole('button', { name: '3M', exact: true }).click();
    await page.waitForTimeout(400);
    await page.getByTestId('kind-rejected_signal').uncheck();
    const marker = page.locator('button.marker:not([data-kind="rejected_signal"])').first();
    await marker.click();
    const selected = await page.getByTestId('event-detail').getAttribute('data-event-id');
    expect(selected).toBeTruthy();
    const before = await view(page);
    const url = page.url();

    await chooseChart(page, 'line');
    await page.waitForTimeout(400);
    expect(page.url()).toBe(url); // same run and symbol (the chart type is not part of the route)
    const after = await view(page);
    expect(Math.abs(after[0] - before[0])).toBeLessThan(1000);
    expect(Math.abs(after[1] - before[1])).toBeLessThan(1000);
    await expect(page.getByTestId('kind-rejected_signal')).not.toBeChecked();
    await expect(page.locator('button.marker[data-kind="rejected_signal"]')).toHaveCount(0);
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', selected!);
    await expect(page.locator('button.marker.is-selected')).toHaveCount(1);
    // the line has the minute read-out and markers at their exact instants (no session attributes)
    const host = (await page.locator('.chart-host').boundingBox())!;
    await page.mouse.move(host.x + host.width * 0.5, host.y + host.height * 0.4);
    await expect(page.getByTestId('chart-readout')).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} E[SD]T · \d/);
    expect(await page.locator('button.marker[data-session]').count()).toBe(0);
    await expect(page.getByTestId('measure-bar')).toHaveAttribute('data-basis', 'minute');

    // back to candles: the same window and state, the candles reused (no second request)
    await chooseChart(page, 'candles');
    await page.waitForTimeout(300);
    const again = await view(page);
    expect(Math.abs(again[0] - before[0])).toBeLessThan(1000);
    await expect(page.getByTestId('kind-rejected_signal')).not.toBeChecked();
    await expect(page.locator('button.marker.is-selected')).toHaveCount(1);
    expect(requests.filter((r) => r.path.endsWith('/candles'))).toHaveLength(1);
    expect(requests.filter((r) => r.method !== 'GET')).toEqual([]); // nothing was run, saved or changed

    // a symbol switch keeps the chart type and the checkboxes
    await page.getByTestId('symbol-tab-GDX').click();
    await expect(page.locator('.run-view')).toHaveAttribute('data-symbol', 'GDX');
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-chart-mode', 'candles');
    await expect(page.getByTestId('kind-rejected_signal')).not.toBeChecked();
    expect(new Set(await page.locator('button.marker').evaluateAll((bs) => bs.map((b) => (b as HTMLElement).dataset.symbol)))).toEqual(
      new Set(['GDX'])
    );

    // keyboard: the chart type is a radio group (arrow keys move and select)
    await page.getByTestId('chart-type-candles').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-chart-mode', 'line');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-chart-mode', 'candles');
  });

  test('dense intraday markers sit on their New York session’s candle with exact times and prices; clusters, trades and links work', async ({
    page
  }) => {
    const id = await tradingRun(
      page,
      'e2e candles dense VGT 2023 Feb–Apr 1m',
      ['VGT'],
      { advanceFromRecentLowPercent: 0.6, trailingStopPercent: 1.2 },
      { from: '2023-02-01', to: '2023-04-28' },
      '1m'
    );
    const events = await eventsOf(page, id, 'VGT');
    expect(events.length).toBeGreaterThan(60);
    const byId = new Map(events.map((e) => [e.id, e]));
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    // every marker: the exact recorded instant, and the session of its New York date
    const rendered = await page.locator('button.marker').evaluateAll((bs) =>
      bs.map((b) => ({ id: (b as HTMLElement).dataset.eventId!, t: (b as HTMLElement).dataset.t!, session: (b as HTMLElement).dataset.session!, label: b.getAttribute('aria-label')! }))
    );
    expect(rendered.length).toBeGreaterThan(40);
    for (const r of rendered) {
      const e = byId.get(r.id)!;
      expect(r.t).toBe(e.t);
      expect(r.session).toBe(ny(e.t).date);
      expect(r.label).toContain(ny(e.t).label);
    }

    // the busiest session: every one of its events is a visible, separate marker, fanned left → right in time order
    const perDay = new Map<string, Ev[]>();
    for (const e of events) perDay.set(ny(e.t).date, [...(perDay.get(ny(e.t).date) ?? []), e]);
    const [busy, busyEvents] = [...perDay.entries()].sort((a, b) => b[1].length - a[1].length)[0]!;
    expect(busyEvents.length).toBeGreaterThan(3);
    await zoomToDate(page, busy);
    const cluster = await page.locator(`button.marker[data-session="${busy}"]`).evaluateAll((bs) =>
      bs.map((b) => ({
        id: (b as HTMLElement).dataset.eventId!,
        left: parseFloat((b as HTMLElement).style.left),
        rank: Number((b as HTMLElement).dataset.cluster!.split('/')[0]),
        n: Number((b as HTMLElement).dataset.cluster!.split('/')[1]),
        hidden: (b as HTMLElement).hidden,
        t: (b as HTMLElement).dataset.t!
      }))
    );
    expect(cluster).toHaveLength(busyEvents.length);
    expect(cluster.every((m) => !m.hidden && m.n === busyEvents.length)).toBe(true);
    const ordered = [...cluster].sort((a, b) => a.rank - b.rank);
    for (let k = 1; k < ordered.length; k++) {
      expect(ordered[k]!.left).toBeGreaterThan(ordered[k - 1]!.left);
      expect(Date.parse(ordered[k]!.t)).toBeGreaterThanOrEqual(Date.parse(ordered[k - 1]!.t));
    }
    // hovering the latest one (on top of the fan): its exact time, and where it sits
    const last = byId.get(ordered.at(-1)!.id)!;
    await page.locator(`button.marker[data-event-id="${last.id}"]`).hover();
    const tip = page.getByTestId('marker-tooltip');
    await expect(tip).toContainText(ny(last.t).label);
    await expect(tip.locator(`.tt-item[data-key="A:${last.id}"] [data-testid="tt-session"]`)).toContainText(
      `Shown on the ${busy} daily candle (${busyEvents.length} of ${busyEvents.length} events that session`
    );
    // a marker inside the fan stays clickable: it selects an event of that session (the exact one, or cycles on)
    await page.mouse.move(5, 5);
    const mid = ordered[Math.floor(ordered.length / 2)]!;
    await page.locator(`button.marker[data-event-id="${mid.id}"]`).dispatchEvent('click');
    const picked = await page.getByTestId('event-detail').getAttribute('data-event-id');
    expect(cluster.map((m) => m.id)).toContain(picked);
    await expect(page.getByTestId('detail-time')).toHaveText(ny(byId.get(picked!)!.t).label);
  });

  test('on candles an exit marker selects its trade; hovering an entry links it to its exit with the net P&L, cleared on leave', async ({
    page
  }) => {
    const id = await tradingRun(page, 'e2e markers VGT 2023', ['VGT']);
    const events = await eventsOf(page, id, 'VGT');
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    const exit = events.find((e) => e.kind === 'executed_exit' && e.tradeId)!;
    // nothing is selected yet, so a click on the exit selects exactly it (overlapping neighbours come after it)
    await page.locator(`button.marker[data-event-id="${exit.id}"]`).dispatchEvent('click');
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', exit.id);
    await expect(page.locator(`[data-testid="trade-table-A"] tr[data-trade="${exit.tradeId}"]`)).toHaveAttribute('aria-selected', 'true');
    const entry = events.find((e) => e.kind === 'executed_entry' && e.tradeId === exit.tradeId)!;
    const entryMarker = page.locator(`button.marker[data-event-id="${entry.id}"]`);
    await entryMarker.dispatchEvent('mouseover');
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-link', /^(profit|loss|flat):visible$/);
    await expect(entryMarker).toHaveClass(/is-linked/);
    await expect(page.locator(`button.marker[data-event-id="${exit.id}"]`)).toHaveClass(/is-linked/);
    await expect(page.getByTestId('trade-link')).toBeVisible();
    await expect(page.getByTestId('marker-tooltip')).toContainText('net');
    await entryMarker.dispatchEvent('mouseout');
    await expect(page.getByTestId('price-chart')).not.toHaveAttribute('data-link', /.*/);
    await expect(page.locator('button.marker.is-linked')).toHaveCount(0);
    await expect(page.getByTestId('trade-link')).toBeHidden();
  });

  test('gestures on candles: drag measures daily CLOSE → CLOSE, Ctrl-drag pans, swipe up zooms in around the cursor, double-click and buttons', async ({
    page
  }) => {
    const id = await tradingRun(page, 'e2e markers VGT 2023', ['VGT']);
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    await page.getByRole('button', { name: '3M', exact: true }).click();
    await page.waitForTimeout(400);
    const c = await candlesOf(page, id, 'VGT');
    const host = (await page.locator('.chart-host').boundingBox())!;
    let g = await geometry(page);
    const at = (fx: number, fy = 0.5) => [host.x + g.area.x + g.area.w * fx, host.y + g.area.y + g.area.h * fy] as const;
    const before = await view(page);

    // measure: both ends snapped to sessions and their CLOSES
    await page.mouse.move(...at(0.6));
    await page.mouse.down();
    await page.mouse.move(...at(0.45), { steps: 4 });
    await page.mouse.move(...at(0.3), { steps: 4 });
    const bar = page.getByTestId('measure-bar');
    await expect(bar).toHaveAttribute('data-basis', 'daily-close');
    await expect(page.getByTestId('measure-kind')).toHaveText('Daily close → daily close');
    await expect(page.getByTestId('measure-range')).toHaveText(/^\d{4}-\d{2}-\d{2} close → \d{4}-\d{2}-\d{2} close$/);
    const [s, e, sp, ep] = await Promise.all(['data-start-ms', 'data-end-ms', 'data-start-price', 'data-end-price'].map((a) => bar.getAttribute(a)));
    const si = c.x.indexOf(Number(s));
    const ei = c.x.indexOf(Number(e));
    expect(si).toBeGreaterThanOrEqual(0);
    expect(ei).toBeGreaterThan(si); // earlier → later, whichever way the drag went
    expect(Number(sp)).toBe(c.c[si]);
    expect(Number(ep)).toBe(c.c[ei]);
    await page.mouse.up();
    await expect(bar).not.toHaveAttribute('data-start-ms', /.*/);
    expect(await view(page)).toEqual(before); // measuring never zooms or pans

    // Ctrl-drag left pans to later dates, same span, no measurement
    await page.mouse.move(...at(0.6));
    await page.keyboard.down('Control');
    await page.mouse.down();
    await page.mouse.move(...at(0.4), { steps: 6 });
    await expect(bar).not.toHaveAttribute('data-start-ms', /.*/);
    await page.mouse.up();
    await page.keyboard.up('Control');
    await page.waitForTimeout(200);
    const panned = await view(page);
    expect(panned[0]).toBeGreaterThan(before[0]);
    expect(Math.abs(panned[1] - panned[0] - (before[1] - before[0]))).toBeLessThan(2);

    // swipe up (deltaY > 0) zooms in around the cursor; swipe down zooms out
    g = await geometry(page);
    const [mx, my] = at(0.25);
    await page.mouse.move(mx, my);
    const tUnder = g.from + 0.25 * (g.to - g.from);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(200);
    const zin = await view(page);
    expect(zin[1] - zin[0]).toBeLessThan(panned[1] - panned[0]);
    expect(Math.abs(zin[0] + 0.25 * (zin[1] - zin[0]) - tUnder)).toBeLessThan(0.01 * (panned[1] - panned[0]));
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(200);
    const zout = await view(page);
    expect(zout[1] - zout[0]).toBeGreaterThan(zin[1] - zin[0]);

    // buttons, the overview navigator, double-click reset
    await page.getByRole('button', { name: '1W', exact: true }).click();
    await page.waitForTimeout(200);
    const w = await view(page);
    expect(Math.round((w[1] - w[0]) / 86_400_000)).toBe(7);
    await expect(page.locator('.dygraph-rangesel-fgcanvas')).toBeVisible();
    await page.mouse.dblclick(...at(0.5));
    await expect(page.getByTestId('zoom-all')).toHaveClass(/is-on/);
  });

  test('the Study 8 vg-balanced import: dense multi-year candles in its own units, one request, per-symbol markers', async ({ page }) => {
    const runs = (await (await page.request.get('/api/runs?q=vg-balanced')).json()) as { id: string; kind: string }[];
    const s8 = runs.find((r) => r.kind === 'import');
    test.skip(!s8, 'no Study 8 runner output was imported');
    const id = s8!.id;
    const detail = (await (await page.request.get(`/api/runs/${id}`)).json()) as {
      priceSource: { basisDate: string; basisBySymbol?: Record<string, string> };
    };
    const requests: string[] = [];
    page.on('request', (r) => requests.push(new URL(r.url()).pathname));
    const started = Date.now();
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-candles-in-view', /\d{4}/, { timeout: 60_000 });
    expect(Date.now() - started).toBeLessThan(30_000);
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-candle-density', 'dense');
    await expect(page.getByTestId('candle-density')).toContainText('too dense for candle bodies');
    expect(requests.filter((p) => p.endsWith('/candles'))).toHaveLength(1);
    expect(requests.filter((p) => p.endsWith('/prices'))).toEqual([]);
    const vgt = await candlesOf(page, id, 'VGT');
    const basis = detail.priceSource.basisBySymbol?.VGT ?? detail.priceSource.basisDate;
    expect(vgt.basisDate).toBe(basis);
    await expect(page.getByTestId('legend-candles')).toContainText(`split-adjusted to ${basis}`);
    const markers = await page.locator('button.marker').evaluateAll((bs) => bs.map((b) => ({ s: (b as HTMLElement).dataset.symbol, t: (b as HTMLElement).dataset.t!, d: (b as HTMLElement).dataset.session! })));
    expect(markers.length).toBeGreaterThan(0);
    expect(new Set(markers.map((m) => m.s))).toEqual(new Set(['VGT']));
    for (const m of markers) expect(m.d).toBe(ny(m.t).date);
    await page.getByTestId('symbol-tab-GDX').click();
    await expect(page.locator('.run-view')).toHaveAttribute('data-symbol', 'GDX');
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    expect(new Set(await page.locator('button.marker').evaluateAll((bs) => bs.map((b) => (b as HTMLElement).dataset.symbol)))).toEqual(new Set(['GDX']));
    // each symbol's recorded fill prices lie within ITS OWN session candle's low–high (same units, no other symbol)
    for (const [sym, cs] of [
      ['VGT', vgt],
      ['GDX', await candlesOf(page, id, 'GDX')]
    ] as const) {
      const fills = (await eventsOf(page, id, sym)).filter((e) => e.kind.startsWith('executed_') && e.price !== null);
      expect(fills.length).toBeGreaterThan(0);
      for (const e of fills) {
        const i = cs.d.indexOf(ny(e.t).date);
        expect(i, `${sym} ${e.id}`).toBeGreaterThanOrEqual(0);
        expect(e.price! >= cs.l[i]! * 0.999 && e.price! <= cs.h[i]! * 1.001, `${sym} ${e.id} ${e.price} in ${cs.l[i]}–${cs.h[i]}`).toBe(true);
      }
    }
  });

  test('comparing runs on candles: only the symbol’s markers of both runs, run B on its sessions too', async ({ page }) => {
    const a = await tradingRun(page, 'e2e markers VGT 2023', ['VGT']);
    const b = await tradingRun(page, 'e2e markers VGT GDX 2023', ['VGT', 'GDX']);
    await page.goto(`/#/run/${a}?symbol=VGT&compare=${b}`);
    await expect(page.locator('button.marker[data-role="B"]').first()).toBeVisible();
    const ms = await page.locator('button.marker').evaluateAll((bs) => bs.map((x) => ({ ...(x as HTMLElement).dataset })));
    expect(new Set(ms.map((m) => m.symbol))).toEqual(new Set(['VGT']));
    expect(new Set(ms.map((m) => m.role))).toEqual(new Set(['A', 'B']));
    for (const m of ms) expect(m.session).toBe(ny(m.t!).date);
  });

  test('narrow screens and the Interactive Preview panel: the candles fit; a preview keeps the chart type and checkboxes', async ({
    page
  }) => {
    const id = await tradingRun(page, 'e2e markers VGT 2023', ['VGT']);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-chart-mode', 'candles');
    await expect(page.getByTestId('chart-type')).toBeVisible();
    const card = (await page.locator('.chart-card').boundingBox())!;
    const frame = (await page.getByTestId('price-chart').boundingBox())!;
    expect(card.x + card.width).toBeLessThanOrEqual(391);
    expect(frame.x + frame.width).toBeLessThanOrEqual(card.x + card.width + 1);

    await page.setViewportSize({ width: 1600, height: 1000 });
    await expect(page.locator('button.marker').first()).toBeVisible();
    const wide = (await geometry(page)).area.w;
    await page.getByTestId('kind-entry_signal').uncheck();
    await page.getByTestId('preview-toggle').click();
    await expect(page.getByTestId('preview-panel')).toBeVisible();
    await expect.poll(async () => (await geometry(page)).area.w).toBeLessThan(wide - 200);
    await page.getByTestId('pv-param-advanceFromRecentLowPercent').fill('6');
    await page.getByTestId('pv-param-advanceFromRecentLowPercent').press('Enter');
    await expect(page.getByTestId('preview-status')).toHaveAttribute('data-state', 'ready', { timeout: 120_000 });
    await expect(page.getByTestId('preview-banner')).toContainText('TEMPORARY PREVIEW');
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-chart-mode', 'candles');
    await expect(page.getByTestId('kind-entry_signal')).not.toBeChecked();
    await expect(page.locator('button.marker[data-kind="entry_signal"]')).toHaveCount(0);
    const pv = new URL(page.url().replace('#', '')).searchParams.get('preview');
    expect(pv).toMatch(/^PV-/);
    const pc = (await (await page.request.get(`/api/previews/${pv}/candles?symbol=VGT`)).json()) as CandlesResponse;
    expect(pc.runId).toBe(pv);
    expect(pc.d.length).toBeGreaterThan(200);
  });

  test('viewing on candles changes no saved result: run, metrics, artifact hash and events are identical afterwards', async ({ page }) => {
    const id = await tradingRun(page, 'e2e markers VGT 2023', ['VGT']);
    const snapshot = async () => [
      await (await page.request.get(`/api/runs/${id}`)).text(),
      await (await page.request.get(`/api/runs/${id}/events?symbol=VGT`)).text()
    ];
    const before = await snapshot();
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    await page.locator('button.marker[data-kind="executed_exit"]').first().click();
    await chooseChart(page, 'line');
    await chooseChart(page, 'candles');
    await page.getByRole('button', { name: '1M', exact: true }).click();
    expect(await snapshot()).toEqual(before);
  });
});

test('the synthetic demo has no genuine OHLC: it stays a line, Candles · 1D is unavailable with the reason, the API refuses', async ({
  page
}) => {
  const runs = (await (await page.request.get('/api/runs?q=synthetic%20demo')).json()) as { id: string; symbols: string[] }[];
  const demo = runs[0]!;
  await page.goto(`/#/run/${demo.id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  await expect(page.getByTestId('price-chart')).toHaveAttribute('data-chart-mode', 'line');
  await expect(page.getByTestId('chart-type-candles')).toBeDisabled();
  await expect(page.getByTestId('chart-type-line')).toBeChecked();
  await expect(page.getByTestId('chart-type-note')).toContainText('synthetic demo has one synthetic close per session');
  const res = await page.request.get(`/api/runs/${demo.id}/candles?symbol=${demo.symbols[0]}`);
  expect(res.status()).toBe(409);
});

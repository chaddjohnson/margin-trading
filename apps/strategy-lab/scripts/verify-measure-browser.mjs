// Task 18 (2026-11-18) browser verification of drag-to-measure, in Chrome (Playwright, channel "chrome"), against a
// running Strategy Lab (default http://127.0.0.1:5299, e.g. `node --experimental-transform-types e2e/serve.ts`, which
// uses a temporary state). Read-only: it drags, hovers, zooms and clicks; it never creates or changes a run.
//
//   node apps/strategy-lab/scripts/verify-measure-browser.mjs [out.json]
//
// For each scenario it records the endpoints the bar shows (dates, prices, $ and %), the values recomputed here from
// the plotted source (the run's /candles response, or the /prices responses the line actually loaded), and layout
// facts: no part of the measurement intersects the hover read-out or the density note, and the overlay layer is the
// canvas box. Exit code 1 when any check fails.
/* global document -- only inside page.evaluate / waitForFunction callbacks, which run in the browser */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(join(app, 'package.json'))('@playwright/test');
const BASE = process.env.BASE ?? 'http://127.0.0.1:5299';
const out = process.argv[2];

const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
  return ok;
};
const sign = (x) => (x > 0 ? '+' : x < 0 ? '−' : '');
const money = (x) => `${sign(x)}$${Math.abs(x).toFixed(2)}`;
const pct = (x) => `${sign(x)}${Math.abs(x).toFixed(2)}%`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const problems = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && problems.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
const pricesSeen = []; // every /prices response the line loaded: [t, price][]
page.on('response', async (r) => {
  if (!new URL(r.url()).pathname.endsWith('/prices')) return;
  try {
    pricesSeen.push(...(await r.json()).points);
  } catch {
    /* aborted detail fetch */
  }
});

const runs = await (await page.request.get(`${BASE}/api/runs?q=vg-balanced`)).json();
const run = runs.find((r) => r.kind === 'import');
if (!run) throw new Error('no Study 8 import in this server');
const RUN = run.id;
const C = await (await page.request.get(`${BASE}/api/runs/${RUN}/candles?symbol=VGT`)).json();
const sessionOn = (date) => C.d.findIndex((d) => d >= date);

const dataset = () => page.getByTestId('price-chart').evaluate((el) => ({ ...el.dataset }));
async function geometry() {
  const d = await dataset();
  const host = await page.locator('.chart-host').boundingBox();
  const [ax, ay, aw, ah] = d.area.split(',').map(Number);
  const from = Date.parse(d.viewFrom);
  const to = Date.parse(d.viewTo);
  return {
    from,
    to,
    top: host.y + ay,
    height: ah,
    left: host.x + ax,
    width: aw,
    xPx: (ms) => host.x + ax + ((ms - from) / (to - from)) * aw,
    yPx: (p) => host.y + ay + ((Number(d.yMax) - p) / (Number(d.yMax) - Number(d.yMin))) * ah,
    density: d.candleDensity,
    inView: Number(d.candlesInView)
  };
}
async function reading() {
  const bar = page.getByTestId('measure-bar');
  if ((await page.getByTestId('measure-percent').count()) === 0) return null;
  const a = (k) => bar.getAttribute(k);
  return {
    basis: await a('data-basis'),
    kind: await page.getByTestId('measure-kind').innerText(),
    start: await page.getByTestId('measure-start').innerText(),
    end: await page.getByTestId('measure-end').innerText(),
    startMs: Number(await a('data-start-ms')),
    endMs: Number(await a('data-end-ms')),
    startPrice: Number(await a('data-start-price')),
    endPrice: Number(await a('data-end-price')),
    change: await page.getByTestId('measure-change').innerText(),
    percent: await page.getByTestId('measure-percent').innerText(),
    direction: ((await bar.getAttribute('class')) ?? '').match(/dir-(\w+)/)?.[1] ?? null
  };
}
const layout = () =>
  page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    const q = (s) => document.querySelector(s);
    const density = q('[data-testid="candle-density"]');
    return {
      parts: ['measure-kind', 'measure-start', 'measure-end', 'measure-change', 'measure-percent'].map((id) => ({ id, rect: r(q(`[data-testid="${id}"]`)) })),
      readout: r(q('[data-testid="chart-readout"]')),
      readoutText: q('[data-testid="chart-readout"]').textContent,
      density: density && !density.hidden ? r(density) : null,
      frame: r(q('[data-testid="price-chart"]')),
      host: r(q('.chart-host')),
      layer: r(q('[data-testid="marker-layer"]')),
      dots: [...document.querySelectorAll('[data-testid="measure-dot"]')].filter((e) => !e.hidden).map((e) => {
        const b = e.getBoundingClientRect();
        return [b.x + b.width / 2, b.y + b.height / 2];
      })
    };
  });
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The layout facts of the current measurement, with the checks applied. */
async function legibility(label) {
  const l = await layout();
  const covered = l.parts.filter((p) => !p.rect || p.rect.w === 0 || overlaps(p.rect, l.readout) || (l.density && overlaps(p.rect, l.density))).map((p) => p.id);
  const outside = l.parts.filter((p) => p.rect && p.rect.x + p.rect.w > l.frame.x + l.frame.w + 0.5).map((p) => p.id);
  const layerOffset = Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(l.layer[k] - l.host[k])));
  check(covered.length === 0, `${label}: covered ${covered}`);
  check(outside.length === 0, `${label}: outside the frame ${outside}`);
  check(layerOffset < 0.5, `${label}: overlay layer offset ${layerOffset}`);
  return { coveredParts: covered, partsOutsideFrame: outside, overlayLayerOffsetPx: +layerOffset.toFixed(3), hoverReadout: l.readoutText };
}

/** Recomputes a candle measurement from the /candles response and checks what the bar shows. */
async function candleRecord(label, extra = {}) {
  const m = await reading();
  if (!check(m !== null, `${label}: no measurement shown`)) return { label, shown: false };
  const si = C.x.indexOf(m.startMs);
  const ei = C.x.indexOf(m.endMs);
  check(si >= 0 && ei > si, `${label}: endpoints are not two sessions in order`);
  const delta = C.c[ei] - C.c[si];
  const p = (delta / C.c[si]) * 100;
  check(m.startPrice === C.c[si] && m.endPrice === C.c[ei], `${label}: prices are not the plotted closes`);
  check(m.start === `${C.d[si]} close $${C.c[si].toFixed(2)}`, `${label}: start label ${m.start}`);
  check(m.end === `${C.d[ei]} close $${C.c[ei].toFixed(2)}`, `${label}: end label ${m.end}`);
  check(m.change === money(delta) && m.percent === pct(p), `${label}: shown ${m.change} ${m.percent} vs ${money(delta)} ${pct(p)}`);
  const g = await geometry();
  const l = await layout();
  const want = [
    [g.xPx(m.startMs), g.yPx(m.startPrice)],
    [g.xPx(m.endMs), g.yPx(m.endPrice)]
  ].filter(([x]) => x >= g.left - 0.5 && x <= g.left + g.width + 0.5);
  const dotErr = Math.max(0, ...want.map(([x, y]) => Math.min(...l.dots.map(([dx, dy]) => Math.hypot(dx - x, dy - y)))));
  check(dotErr < 1.5, `${label}: dots ${dotErr.toFixed(2)} px from the measured closes`);
  return {
    label,
    shown: m,
    plotted: { start: { date: C.d[si], close: C.c[si], factor: C.factor[si] }, end: { date: C.d[ei], close: C.c[ei], factor: C.factor[ei] } },
    independent: { change: +delta.toFixed(6), percent: +p.toFixed(6), changeText: money(delta), percentText: pct(p) },
    window: { from: new Date(g.from).toISOString(), to: new Date(g.to).toISOString(), sessionsInView: g.inView, density: g.density },
    dotsOffMeasuredClosesPx: +dotErr.toFixed(3),
    layout: await legibility(label),
    ...extra
  };
}

async function drag(xa, xb, y, { release = true, steps = 10, during = [] } = {}) {
  await page.mouse.move(xa, y);
  await page.mouse.down();
  const live = [];
  for (const x of during) {
    await page.mouse.move(x, y, { steps: 4 });
    await page.waitForTimeout(60);
    const m = await reading();
    live.push(m && { start: m.start, end: m.end, change: m.change, percent: m.percent });
  }
  await page.mouse.move(xb, y, { steps });
  await page.waitForTimeout(80);
  const held = await reading();
  const heldLayout = held ? await legibility('held') : null;
  if (release) await page.mouse.up();
  await page.waitForTimeout(60);
  return { live, held, heldLayout };
}
const clear = async () => {
  await page.keyboard.press('Escape');
  check((await reading()) === null, 'Escape did not clear');
};

const results = { base: BASE, run: RUN, symbol: 'VGT', sessions: C.d.length, firstSession: C.d[0], lastSession: C.d.at(-1), scenarios: [] };
const add = (r) => results.scenarios.push(r);

// 1. VGT · Candles · 1D · All (the user's view), late 2020 → late 2021, updated live, kept after release; reverse.
await page.goto(`${BASE}/#/run/${RUN}?symbol=VGT`);
await page.waitForFunction(() => /\d{4}/.test(document.querySelector('[data-testid=price-chart]')?.dataset.candlesInView ?? ''), null, { timeout: 60_000 });
await page.getByTestId('zoom-all').click();
await page.waitForTimeout(400);
let g = await geometry();
let y = g.top + g.height * 0.45;
const x2020 = g.xPx(C.x[sessionOn('2020-10-01')]);
const x2021 = g.xPx(C.x[sessionOn('2021-12-13')]);
const d1 = await drag(x2020, x2021, y, { during: [g.xPx(C.x[sessionOn('2021-03-01')]), g.xPx(C.x[sessionOn('2021-08-02')])] });
check(new Set(d1.live.map((m) => m?.end)).size === 2, 'the end did not update while dragging');
check(d1.held !== null && d1.heldLayout.coveredParts.length === 0, 'covered while held');
const fwd = await candleRecord('All · late 2020 → late 2021 (forward, after release)', {
  liveWhileDragging: d1.live,
  heldBeforeRelease: d1.held && { start: d1.held.start, end: d1.held.end, change: d1.held.change, percent: d1.held.percent },
  hoverReadoutWhileHeld: d1.heldLayout?.hoverReadout
});
check(JSON.stringify(d1.held) === JSON.stringify(fwd.shown), 'the release changed the reading');
add(fwd);
await page.mouse.move(g.xPx(C.x[sessionOn('2023-03-01')]), y);
await page.waitForTimeout(80);
const hovered = await layout();
check(JSON.stringify(await reading()) === JSON.stringify(fwd.shown), 'hovering changed the measurement');
add({ label: 'All · hover after release: the read-out row shows the hovered candle, the bar is unchanged', hoverReadout: hovered.readoutText, measurementUnchanged: true, layout: await legibility('hover after release') });
await clear();
await drag(x2021, x2020, y);
const rev = await candleRecord('All · late 2021 → late 2020 (reverse drag)');
check(JSON.stringify(rev.shown) === JSON.stringify(fwd.shown), 'reverse differs from forward');
add({ ...rev, sameAsForward: JSON.stringify(rev.shown) === JSON.stringify(fwd.shown) });

// 2. Clear gestures: a click on the chart clears; Escape clears (already used above).
await page.mouse.click(g.left + g.width * 0.5, y);
await page.waitForTimeout(60);
add({ label: 'All · plain click on the chart clears it', cleared: check((await reading()) === null, 'click did not clear') });

// 3. A second positive interval and a pointer over a marker (3Y window).
await page.getByRole('button', { name: '3Y', exact: true }).click();
await page.waitForTimeout(400);
g = await geometry();
y = g.top + g.height * 0.5;
const markers = await page.locator('button.marker:not([hidden])').evaluateAll((bs) =>
  bs.map((b) => {
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: b.dataset.eventId, session: b.dataset.session };
  })
);
const mk = markers.find((m) => m.x > g.left + g.width * 0.4 && m.x < g.left + g.width * 0.9);
await page.mouse.move(g.left + g.width * 0.2, y);
await page.mouse.down();
await page.mouse.move(mk.x + 2, mk.y + 2, { steps: 8 });
await page.waitForTimeout(80);
const overMarker = await reading();
const endIdx = C.x.indexOf(overMarker.endMs);
const nearestPx = Math.abs(g.xPx(C.x[endIdx]) - (mk.x + 2));
check(endIdx >= 0 && C.x[endIdx] >= g.from && C.x[endIdx] <= g.to && nearestPx <= g.width / g.inView / 2 + 1, 'end over a marker is not the session under the pointer');
await page.mouse.up();
add({ ...(await candleRecord('3Y · pointer released over a trade marker')), marker: mk, endSessionPxFromPointer: +nearestPx.toFixed(3) });
await clear();

// 4. A fall (negative), then zoom, pan and presets keep it.
await drag(g.xPx(C.x[sessionOn('2021-12-27')]), g.xPx(C.x[sessionOn('2022-10-14')]), y);
const fall = await candleRecord('3Y · 2021-12-27 → 2022-10-14 (negative)');
check(fall.shown.direction === 'down' && fall.independent.change < 0, 'the fall is not negative');
add(fall);
await page.mouse.move(g.xPx(C.x[sessionOn('2022-03-01')]), y);
await page.mouse.wheel(0, -120); // zoom out
await page.waitForTimeout(300);
add(await candleRecord('3Y → wheel zoom out: same measurement, overlay on the closes'));
const before = (await dataset()).viewFrom;
await page.keyboard.down('Control');
await page.mouse.move(g.left + g.width * 0.5, y);
await page.mouse.down();
await page.mouse.move(g.left + g.width * 0.4, y, { steps: 6 });
await page.mouse.up();
await page.keyboard.up('Control');
await page.waitForTimeout(300);
check((await dataset()).viewFrom !== before, 'Ctrl-drag did not pan');
add({ ...(await candleRecord('Ctrl-drag pan: same measurement, no new one')), panned: true });
await page.getByRole('button', { name: '1Y', exact: true }).click();
await page.waitForTimeout(300);
const afterPreset = await reading();
check(JSON.stringify(afterPreset) === JSON.stringify(fall.shown), 'the 1Y preset changed the measurement');
add({ label: '1Y preset: the bar still reads the same measurement', shown: afterPreset, window: (await dataset()).viewFrom + ' → ' + (await dataset()).viewTo });
await clear();

// 5. Inside the 1Y window: a fresh drag (positive or negative, whatever the closes give).
g = await geometry();
await drag(g.left + g.width * 0.15, g.left + g.width * 0.8, g.top + g.height * 0.5);
add(await candleRecord('1Y · fresh drag inside the preset window'));
await page.mouse.dblclick(g.left + g.width * 0.5, g.top + g.height * 0.5);
await page.waitForTimeout(300);
add({
  label: 'double-click: zoom reset to All, measurement cleared (two clicks)',
  zoomAll: check(await page.getByTestId('zoom-all').evaluate((b) => b.classList.contains('is-on')), 'double-click did not reset'),
  cleared: check((await reading()) === null, 'double-click left a measurement')
});

// 6. Narrow viewport.
await page.setViewportSize({ width: 820, height: 900 });
await page.waitForTimeout(400);
await page.getByTestId('price-chart').scrollIntoViewIfNeeded();
g = await geometry();
y = g.top + g.height * 0.45;
const dn = await drag(g.xPx(C.x[sessionOn('2020-10-01')]), g.xPx(C.x[sessionOn('2021-12-13')]), y);
add({ ...(await candleRecord('820×900 · All · late 2020 → late 2021')), heldLayout: dn.heldLayout });
await clear();
await page.setViewportSize({ width: 1600, height: 1000 });
await page.waitForTimeout(300);

// 7. Line · intraday: cleared by the switch; minute closes; endpoints are points the line loaded.
await page.getByTestId('chart-type').locator('label', { hasText: 'Line · intraday' }).click();
await page.waitForFunction(() => document.querySelector('[data-testid=price-chart]')?.dataset.chartMode === 'line');
check((await reading()) === null, 'switching to the line kept a measurement');
await page.getByRole('button', { name: '1M', exact: true }).click();
await page.waitForTimeout(1500);
const host = await page.locator('.chart-host').boundingBox();
const lx = (f) => host.x + 70 + (host.width - 90) * f;
const ly = host.y + (host.height - 70) * 0.35;
const dl = await drag(lx(0.2), lx(0.75), ly);
const lm = await reading();
const has = (t, p) => pricesSeen.some(([x, v]) => x === t && v === p);
const ldelta = lm.endPrice - lm.startPrice;
const lpct = (ldelta / lm.startPrice) * 100;
check(lm.basis === 'minute' && lm.kind === 'Minute close → minute close', 'line basis');
check(has(lm.startMs, lm.startPrice) && has(lm.endMs, lm.endPrice), 'line endpoints are not loaded plotted points');
check(lm.change === money(ldelta) && lm.percent === pct(lpct), 'line arithmetic');
add({
  label: 'Line · intraday · 1M: minute close → minute close',
  shown: lm,
  independent: { change: +ldelta.toFixed(6), percent: +lpct.toFixed(6), changeText: money(ldelta), percentText: pct(lpct) },
  endpointsArePlottedPoints: has(lm.startMs, lm.startPrice) && has(lm.endMs, lm.endPrice),
  window: { from: (await dataset()).viewFrom, to: (await dataset()).viewTo },
  layout: dl.heldLayout && (await legibility('line'))
});
await page.getByTestId('chart-type').locator('label', { hasText: 'Candles · 1D' }).click();
await page.waitForFunction(() => document.querySelector('[data-testid=price-chart]')?.dataset.chartMode === 'candles');
add({ label: 'back to Candles · 1D: cleared', cleared: check((await reading()) === null, 'switching back kept a measurement') });

results.consoleProblems = problems;
check(problems.length === 0, `console: ${problems.join(' | ')}`);
results.failures = failures;
results.ok = failures.length === 0;
const json = JSON.stringify(results, null, 1);
if (out) writeFileSync(out, json + '\n');
console.log(json);
await browser.close();
process.exit(results.ok ? 0 : 1);

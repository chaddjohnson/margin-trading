// Trade marker colours: both markers of a trade green for a net profit, red for a net loss, grey for exactly
// breakeven (from the RECORDED net after costs and interest, not prices), blue for an open position whatever its
// unrealized P&L; rejected signals purple; raw signals hollow; shapes kept; the same colours in the legend, the hover
// highlights, the connector, the tooltips and the event table; standalone and imported multi-ETF runs alike.

import { type Page, expect, test } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { expectedTone, eventsOf, renderedMarkers, tradingRun } from './helpers.ts';
import { TRADE_COLOUR_FIXTURE_TITLE } from './trade-colour-fixture.ts';

const REPO = join(import.meta.dirname, '..', '..', '..');
const hasData = ['VGT', 'GDX'].every((s) => existsSync(join(REPO, `data/${s}/data.csv`)));
const importsDir = join(REPO, 'state/strategy-lab/imports/study8');
const hasStudy8 =
  hasData && existsSync(importsDir) && readdirSync(importsDir).some((d) => d.endsWith('-s8-vg-balanced'));

const COLOUR = {
  profit: '#4cc38a',
  loss: '#f07070',
  flat: '#94a3b8',
  open: '#38bdf8',
  rejected: '#a78bfa',
  signal: '#e2e8f0'
} as const;
const RGB = {
  profit: 'rgb(76, 195, 138)',
  loss: 'rgb(240, 112, 112)',
  flat: 'rgb(148, 163, 184)',
  open: 'rgb(56, 189, 248)'
} as const;

let problems: string[] = [];
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
});
test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));

const away = async (page: Page) => {
  const b = (await page.getByTestId('run-header').boundingBox())!;
  await page.mouse.move(b.x + 20, b.y + 10);
};
const hoverMarker = async (page: Page, id: string) => {
  await page.locator(`button.marker[data-event-id="${id}"]`).hover();
};
/** Every executed marker's tone equals its trade's expected tone, and the glyph is filled with that colour. */
async function checkTradeTones(page: Page, events: Awaited<ReturnType<typeof eventsOf>>) {
  const markers = await renderedMarkers(page);
  const executed = markers.filter((m) => m.kind === 'executed_entry' || m.kind === 'executed_exit');
  expect(executed.length).toBeGreaterThan(0);
  for (const m of executed) {
    const ev = events.find((e) => e.id === m.id)!;
    const want = expectedTone(events, ev.tradeId!);
    expect(m.tone, m.id).toBe(want);
    expect(m.svg, m.id).toContain(`fill="${COLOUR[want]}"`);
  }
  for (const m of markers.filter((x) => x.kind === 'rejected_signal')) {
    expect(m.tone).toBe('rejected');
    expect(m.svg).toContain(`stroke="${COLOUR.rejected}"`);
  }
  for (const m of markers.filter((x) => x.kind === 'entry_signal')) {
    expect(m.tone).toBe('signal');
    expect(m.svg).toContain(`stroke="${COLOUR.signal}"`);
    expect(m.svg).toContain('fill="#0b1220"'); // hollow: distinct from every executed marker
  }
  return markers;
}

test('synthetic fixture: profit green, loss red, breakeven grey, open blue, rejected purple, raw signals hollow', async ({
  page
}) => {
  const runs = (await (
    await page.request.get(`/api/runs?q=${encodeURIComponent(TRADE_COLOUR_FIXTURE_TITLE)}`)
  ).json()) as {
    id: string;
  }[];
  const id = runs[0]!.id;
  const events = await eventsOf(page, id, 'DEMO');
  await page.goto(`/#/run/${id}`);
  await expect(page.locator('button.marker').first()).toBeVisible();
  const markers = await checkTradeTones(page, events);
  const tone = (eventId: string) => markers.find((m) => m.id === eventId)?.tone;
  expect([tone('DEMO:T-1:entry'), tone('DEMO:T-1:exit')]).toEqual(['profit', 'profit']);
  expect([tone('DEMO:T-2:entry'), tone('DEMO:T-2:exit')]).toEqual(['loss', 'loss']);
  expect([tone('DEMO:T-3:entry'), tone('DEMO:T-3:exit')]).toEqual(['flat', 'flat']);
  expect(tone('DEMO:T-5:entry')).toBe('open');
  // T-4 exits ABOVE its entry price but its recorded net is negative: red, by the net, not the prices.
  const t4 = (side: string) => events.find((e) => e.id === `DEMO:T-4:${side}`)!.price!;
  expect(t4('exit')).toBeGreaterThan(t4('entry'));
  expect([tone('DEMO:T-4:entry'), tone('DEMO:T-4:exit')]).toEqual(['loss', 'loss']);
  expect(markers.filter((m) => m.kind === 'rejected_signal').map((m) => m.tone)).toEqual(['rejected', 'rejected']);
  expect(markers.filter((m) => m.kind === 'entry_signal').map((m) => m.tone)).toEqual(['signal']);
  // Shapes are kept: entries ▲ (apex up), exits ▼ (apex down).
  for (const m of markers.filter((x) => x.kind === 'executed_entry')) expect(m.svg).toContain('points="7,1 ');
  for (const m of markers.filter((x) => x.kind === 'executed_exit')) expect(m.svg).toContain('points="1,1.5 ');

  // Legend: the outcome key, executed kinds by shape only, rejected purple, signals hollow.
  const legend = page.getByTestId('legend-tones');
  await expect(legend).toContainText('net profit');
  await expect(legend).toContainText('net loss');
  await expect(legend).toContainText('breakeven (net $0)');
  await expect(legend).toContainText('open position');
  for (const [t, rgb] of Object.entries(RGB))
    await expect(legend.locator(`[data-tone="${t}"] .tone-swatch`)).toHaveCSS('background-color', rgb);
  await expect(page.locator('label.legend-kind:has([data-testid="kind-rejected_signal"]) img.glyph')).toHaveAttribute(
    'data-tone',
    'rejected'
  );
  await expect(page.locator('label.legend-kind:has([data-testid="kind-entry_signal"]) img.glyph')).toHaveAttribute(
    'data-tone',
    'signal'
  );

  // Hover: the highlight outline and the connector take the trade's colour; the tooltip glyph matches too.
  for (const [trade, t] of [
    ['T-1', 'profit'],
    ['T-2', 'loss'],
    ['T-3', 'flat']
  ] as const) {
    await hoverMarker(page, `DEMO:${trade}:entry`);
    for (const side of ['entry', 'exit'])
      await expect(page.locator(`button.marker[data-event-id="DEMO:${trade}:${side}"]`)).toHaveCSS(
        'outline-color',
        RGB[t]
      );
    await expect(page.locator('[data-testid="trade-link"] line')).toHaveCSS('stroke', RGB[t]);
    await expect(page.getByTestId('marker-tooltip').locator('img.glyph').first()).toHaveAttribute('data-tone', t);
    await expect(page.getByTestId('tt-link')).toHaveCSS('border-left-color', RGB[t]);
    await away(page);
  }
  await hoverMarker(page, 'DEMO:T-5:entry');
  await expect(page.locator('button.marker[data-event-id="DEMO:T-5:entry"]')).toHaveCSS('outline-color', RGB.open);
  await expect(page.getByTestId('tt-link')).toHaveCSS('border-left-color', RGB.open);
  await away(page);
  // The event table uses the same glyph colours.
  await page.getByTestId('event-table').getByText('All dates', { exact: true }).click();
  await expect(page.locator('[data-testid="event-table"] tr[data-key="A:DEMO:T-3:exit"] img.glyph')).toHaveAttribute(
    'data-tone',
    'flat'
  );
  await expect(page.locator('[data-testid="event-table"] tr[data-key="A:DEMO:T-5:entry"] img.glyph')).toHaveAttribute(
    'data-tone',
    'open'
  );
});

test.describe('real data', () => {
  test.skip(!hasData, 'the git-ignored data/ files are not present');

  test('trading backtest: tones follow each trade’s recorded net; the open position is blue despite a positive unrealized P&L', async ({
    page
  }) => {
    const id = await tradingRun(page, 'e2e markers VGT 2023', ['VGT']);
    const events = await eventsOf(page, id, 'VGT');
    const run = (await (await page.request.get(`/api/runs/${id}`)).json()) as {
      metrics: { perSymbol: { VGT: { pnl: { unrealized: { netUsd: number } } } } };
    };
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    const markers = await checkTradeTones(page, events);
    const tones = new Set(markers.filter((m) => m.kind.startsWith('executed')).map((m) => m.tone));
    expect(tones).toEqual(new Set(['profit', 'loss', 'open']));
    const open = events.find((e) => e.kind === 'executed_entry' && e.meta.open === true)!;
    expect(run.metrics.perSymbol.VGT.pnl.unrealized.netUsd).toBeGreaterThan(0); // a winner on paper …
    expect(markers.find((m) => m.id === open.id)!.tone).toBe('open'); // … still blue, not green
    // Its unrealized P&L text is the neutral open colour as well.
    await page.locator(`[data-testid="trade-table-A"] tr[data-trade="${open.tradeId}"]`).click();
    await page.getByTestId('event-detail').getByRole('button', { name: 'Zoom here' }).click();
    await hoverMarker(page, open.id);
    await expect(page.getByTestId('marker-tooltip').locator('.pnl').first()).toHaveCSS('color', RGB.open);
    await away(page);
  });

  test('comparison: run B keeps the outcome colours, marked by an orange halo; the legend says so', async ({
    page
  }) => {
    const a = await tradingRun(page, 'e2e markers VGT 2023', ['VGT']);
    const b = await tradingRun(page, 'e2e markers VGT GDX 2023', ['VGT', 'GDX']);
    const eventsB = await eventsOf(page, b, 'VGT');
    await page.goto(`/#/run/${a}?symbol=VGT&compare=${b}`);
    await expect(page.locator('button.marker[data-role="B"]').first()).toBeVisible();
    const markers = (await renderedMarkers(page)).filter((m) => m.role === 'B' && m.kind.startsWith('executed'));
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      const ev = eventsB.find((e) => e.id === m.id)!;
      expect(m.tone).toBe(expectedTone(eventsB, ev.tradeId!));
      expect(m.svg).toContain('stroke="#d95926"'); // the run-B halo
    }
    await expect(page.getByTestId('legend-tones')).toContainText('run B (orange halo)');
  });
});

test.describe('imported multi-ETF result (vg-balanced)', () => {
  test.skip(!hasStudy8, 'no local data or Study 8 runner output');

  test('every lot’s markers follow its recorded net, per symbol; the open GDX lot is blue', async ({ page }) => {
    const runs = (await (await page.request.get('/api/runs?q=vg-balanced')).json()) as { id: string }[];
    const id = runs[0]!.id;
    for (const symbol of ['GDX', 'VGT']) {
      const events = await eventsOf(page, id, symbol);
      await page.goto(`/#/run/${id}?symbol=${symbol}`);
      await expect(page.getByTestId('legend')).toContainText(`${symbol} (USD`, { timeout: 60_000 });
      await page.getByTestId('zoom-all').click();
      await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
      const markers = await checkTradeTones(page, events);
      expect(markers.every((m) => m.symbol === symbol)).toBe(true);
      if (symbol === 'GDX') {
        const open = events.find((e) => e.kind === 'executed_entry' && e.meta.open === true)!;
        expect(markers.find((m) => m.id === open.id)!.tone).toBe('open');
      }
    }
  });
});

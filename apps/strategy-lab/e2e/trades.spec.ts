// Trade tooltips, selection and visual linking: both markers of a trade show the same net P&L (realized, or unrealized
// for an open position from the run's recorded mark, or "unavailable"); clicking either marker selects the trade in
// the list (highlighted, scrolled into view, details beneath); hovering either marker highlights both and draws a
// temporary connector in the trade's tone, removed as soon as the pointer leaves; a counterpart outside the view is
// reported without zooming; symbols never mix; the other chart interactions keep working.

import { type Page, expect, test } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..', '..', '..');
const hasData = ['VGT', 'GDX'].every((s) => existsSync(join(REPO, `data/${s}/data.csv`)));
const importsDir = join(REPO, 'state/strategy-lab/imports/study8');
const hasStudy8 =
  hasData && existsSync(importsDir) && readdirSync(importsDir).some((d) => d.endsWith('-s8-vg-balanced'));

let problems: string[] = [];
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
});
test.afterEach(() => expect(problems, 'browser console errors').toEqual([]));

type Ev = {
  id: string;
  kind: string;
  symbol: string;
  tradeId: string | null;
  values: { key: string; value: unknown }[];
  meta: Record<string, unknown>;
};
const money = (x: number) =>
  `${x > 0 ? '+' : x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const val = (e: Ev | undefined, key: string) => e?.values.find((v) => v.key === key)?.value as number | undefined;

/** A completed run of this request (created once per title, then reused). */
async function tradingRun(page: Page, title: string, symbols: string[]) {
  const found = (await (await page.request.get(`/api/runs?q=${encodeURIComponent(title)}`)).json()) as {
    id: string;
    status: string;
  }[];
  let id = found.find((r) => r.status === 'completed')?.id;
  if (!id) {
    const res = await page.request.post('/api/runs', {
      data: {
        strategyKey: 'rise-from-recent-low-trading',
        strategyVersion: '1.0.0',
        params: {
          advanceFromRecentLowPercent: 5,
          recentLowLookbackBars: 20,
          trailingStopPercent: 7.3,
          maximumHoldEnabled: true,
          maximumHoldDays: 8,
          intradayLossBufferEnabled: true,
          intradayLossBufferPercent: 2.9,
          costBpsPerSide: 5
        },
        symbols,
        from: '2023-01-03',
        to: '2023-12-29',
        resolution: '1d',
        title
      }
    });
    id = ((await res.json()) as { id: string }).id;
    await expect
      .poll(async () => ((await (await page.request.get(`/api/runs/${id}`)).json()) as { status: string }).status, {
        timeout: 120_000
      })
      .toBe('completed');
  }
  return id;
}
const eventsOf = async (page: Page, id: string, symbol: string) =>
  ((await (await page.request.get(`/api/runs/${id}/events?symbol=${symbol}`)).json()) as { events: Ev[] }).events;
const marker = (page: Page, eventId: string) => page.locator(`button.marker[data-event-id="${eventId}"]`);
const view = async (page: Page) => [
  await page.getByTestId('price-chart').getAttribute('data-view-from'),
  await page.getByTestId('price-chart').getAttribute('data-view-to')
];
/** Select a trade by its row (this selects its entry), then zoom the chart to 30 days around the entry. */
async function focusTrade(page: Page, tradeId: string) {
  await page.locator(`[data-testid="trade-table-A"] tr[data-trade="${tradeId}"]`).click();
  await page.getByTestId('event-detail').getByRole('button', { name: 'Zoom here' }).click();
  await page.waitForTimeout(400);
}
const linked = (page: Page) =>
  page.locator('button.marker.is-linked').evaluateAll((bs) => bs.map((b) => (b as HTMLElement).dataset.eventId).sort());
const away = async (page: Page) => {
  const b = (await page.getByTestId('run-header').boundingBox())!;
  await page.mouse.move(b.x + 20, b.y + 10);
};

test.describe('trading backtest (real data)', () => {
  test.skip(!hasData, 'the git-ignored data/ files are not present');

  test('entry and exit tooltips show the same trade net P&L; an open position is unrealized from the run’s mark', async ({
    page
  }) => {
    const id = await tradingRun(page, 'e2e trades VGT 2023', ['VGT']);
    const events = await eventsOf(page, id, 'VGT');
    const run = (await (await page.request.get(`/api/runs/${id}`)).json()) as {
      metrics: { perSymbol: { VGT: { pnl: { unrealized: { netUsd: number; markDate: string } } } } };
    };
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    for (const tradeId of ['T-2', 'T-3']) {
      const exit = events.find((e) => e.id === `VGT:${tradeId}:exit`)!;
      const net = val(exit, 'net')!;
      const pct = val(exit, 'netReturn')!;
      const expected = `${money(Math.round(net * 100) / 100)} (${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}%)`;
      await focusTrade(page, tradeId);
      const texts: string[] = [];
      for (const side of ['entry', 'exit']) {
        await marker(page, `VGT:${tradeId}:${side}`).hover();
        const pnl = page.getByTestId('marker-tooltip').getByTestId('tt-pnl').first();
        await expect(pnl).toContainText(expected);
        await expect(pnl).toContainText('realized');
        await expect(pnl.locator('.pnl')).toHaveAttribute('data-tone', net > 0 ? 'profit' : 'loss');
        await expect(pnl.locator('.pnl')).toHaveCSS('color', net > 0 ? 'rgb(76, 195, 138)' : 'rgb(240, 112, 112)');
        // Existing tooltip content is kept: Eastern time, fill price, the reason (with the exit reason on the exit).
        await expect(page.getByTestId('marker-tooltip')).toContainText(/E[SD]T/);
        if (side === 'exit')
          await expect(page.getByTestId('marker-tooltip')).toContainText(/Trailing stop|Maximum losing hold|Buffered/);
        texts.push(await pnl.innerText());
        await away(page);
      }
      expect(texts[0]).toBe(texts[1]); // the same trade-level result on both markers
    }
    // The open position: unrealized, from the run's recorded mark, never shown as realized.
    const open = events.find((e) => e.kind === 'executed_entry' && e.meta.open === true)!;
    const u = run.metrics.perSymbol.VGT.pnl.unrealized;
    await focusTrade(page, open.tradeId!);
    await marker(page, open.id).hover();
    const pnl = page.getByTestId('marker-tooltip').getByTestId('tt-pnl').first();
    await expect(pnl).toContainText(money(Math.round(u.netUsd * 100) / 100));
    await expect(pnl.locator('.pnl-kind')).toHaveText(` unrealized (marked ${u.markDate})`);
    await expect(page.getByTestId('tt-link')).toContainText('still open');
  });

  test('clicking either marker selects the same trade: row highlighted, details beneath, kept across entry ↔ exit', async ({
    page
  }) => {
    const id = await tradingRun(page, 'e2e trades VGT 2023', ['VGT']);
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    await focusTrade(page, 'T-2');
    await page.getByTestId('trade-detail').scrollIntoViewIfNeeded(); // nothing selected yet would read "Select a trade"
    await away(page);
    const row = page.locator('[data-testid="trade-table-A"] tr[data-trade="T-2"]');
    // The exit marker selects the trade (this used to do nothing in the list).
    await page.getByTestId('price-chart').scrollIntoViewIfNeeded();
    await marker(page, 'VGT:T-2:exit').click();
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(row).toHaveClass(/is-selected/);
    await expect(page.getByTestId('trade-detail')).toHaveAttribute('data-trade-key', 'A:VGT:T-2');
    await expect(page.getByTestId('trade-detail')).toContainText('closed');
    await expect(page.getByTestId('trade-detail-pnl')).toBeVisible();
    await expect(page.getByTestId('event-detail')).toHaveAttribute('data-event-id', 'VGT:T-2:exit');
    // Its entry keeps the same trade selected.
    await marker(page, 'VGT:T-2:entry').click();
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('trade-detail')).toHaveAttribute('data-trade-key', 'A:VGT:T-2');
    expect(await page.locator('[data-testid="trade-table-A"] tr[aria-selected="true"]').count()).toBe(1);
    // A different trade's exit moves the selection.
    await focusTrade(page, 'T-3');
    await marker(page, 'VGT:T-3:exit').click();
    await expect(page.locator('[data-testid="trade-table-A"] tr[data-trade="T-3"]')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(row).toHaveAttribute('aria-selected', 'false');
  });

  test('hover links entry ↔ exit (both highlighted, toned connector, summary) and clears at once on leave', async ({
    page
  }) => {
    const id = await tradingRun(page, 'e2e trades VGT 2023', ['VGT']);
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    await focusTrade(page, 'T-3'); // a losing trade held 8 days: both markers in the 30-day view
    await away(page);
    const svg = page.getByTestId('trade-link');
    await expect(svg).toBeHidden();
    for (const side of ['entry', 'exit']) {
      await marker(page, `VGT:T-3:${side}`).hover();
      expect(await linked(page)).toEqual(['VGT:T-3:entry', 'VGT:T-3:exit']);
      await expect(svg).toBeVisible();
      await expect(svg).toHaveClass(/tone-loss/);
      await expect(page.getByTestId('price-chart')).toHaveAttribute('data-link', 'loss:visible');
      // The connector joins the two markers' centres (as they sit on the chart).
      const ends = await page.evaluate(() => {
        const l = document.querySelector('[data-testid="trade-link"] line')!;
        const layer = document.querySelector('[data-testid="marker-layer"]')!.getBoundingClientRect();
        const c = (id: string) => {
          const r = document.querySelector(`button.marker[data-event-id="${id}"]`)!.getBoundingClientRect();
          return [r.x + r.width / 2 - layer.x, r.y + r.height / 2 - layer.y];
        };
        return {
          line: ['x1', 'y1', 'x2', 'y2'].map((a) => Number(l.getAttribute(a))),
          entry: c('VGT:T-3:entry'),
          exit: c('VGT:T-3:exit')
        };
      });
      const [x1, y1, x2, y2] = ends.line;
      const pts = [
        [x1!, y1!],
        [x2!, y2!]
      ].sort((a, b) => a[0]! - b[0]!);
      expect(Math.abs(pts[0]![0]! - ends.entry[0]!)).toBeLessThan(1.5);
      expect(Math.abs(pts[0]![1]! - ends.entry[1]!)).toBeLessThan(1.5);
      expect(Math.abs(pts[1]![0]! - ends.exit[0]!)).toBeLessThan(1.5);
      expect(Math.abs(pts[1]![1]! - ends.exit[1]!)).toBeLessThan(1.5);
      const summary = page.getByTestId('tt-link');
      await expect(summary).toContainText(/entry 2023-04-18 09:30 EDT at \d+\.\d\d/);
      await expect(summary).toContainText(/exit 2023-04-26 .* held \d+\.\d days/);
      await expect(summary).toContainText(/net −\$[\d,]+\.\d\d \(−\d+\.\d\d%\) realized/);
      await expect(summary).not.toContainText('outside');
      // Leaving the marker removes the connector, the highlights and the tooltip at once.
      await away(page);
      expect(await linked(page)).toEqual([]);
      await expect(svg).toBeHidden({ timeout: 200 });
      await expect(page.getByTestId('marker-tooltip')).toHaveCount(0);
      await expect(page.getByTestId('price-chart')).not.toHaveAttribute('data-link', /.*/);
    }
    // A profitable trade's connector has the profit tone (T-1's exit lies beyond the view: the line runs off the edge).
    await focusTrade(page, 'T-1');
    await marker(page, 'VGT:T-1:entry').hover();
    await expect(svg).toBeVisible();
    await expect(svg).toHaveClass(/tone-profit/);
    await away(page);
    // The open position: only its entry is highlighted, no connector, and the summary says it is still open.
    const open = (await eventsOf(page, id, 'VGT')).find((e) => e.kind === 'executed_entry' && e.meta.open === true)!;
    await focusTrade(page, open.tradeId!);
    await marker(page, open.id).hover();
    expect(await linked(page)).toEqual([open.id]);
    await expect(svg).toBeHidden();
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-link', /:open$/);
    await expect(page.getByTestId('tt-link')).toContainText('the position is still open');
    await away(page);
    expect(await linked(page)).toEqual([]);
  });

  test('a counterpart outside the view is reported and the chart is not zoomed to it', async ({ page }) => {
    const id = await tradingRun(page, 'e2e trades VGT 2023', ['VGT']);
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    await focusTrade(page, 'T-1'); // held 61 days: its exit is outside a 30-day window around the entry
    await away(page);
    await expect(marker(page, 'VGT:T-1:exit')).toHaveCount(0);
    const before = await view(page);
    await marker(page, 'VGT:T-1:entry').hover();
    await expect(page.getByTestId('tt-offscreen')).toContainText('The exit is later than the current view');
    await expect(page.getByTestId('price-chart')).toHaveAttribute('data-link', 'profit:after');
    await expect(page.getByTestId('trade-link')).toBeVisible(); // drawn towards the exit, clipped at the plot's edge
    expect(await linked(page)).toEqual(['VGT:T-1:entry']);
    expect(await view(page)).toEqual(before);
    await away(page);
    expect(await view(page)).toEqual(before);
  });

  test('two symbols: each tab pairs only its own markers and lists only its own trades', async ({ page }) => {
    const id = await tradingRun(page, 'e2e trades VGT GDX 2023', ['VGT', 'GDX']);
    for (const symbol of ['VGT', 'GDX']) {
      await page.goto(`/#/run/${id}?symbol=${symbol}`);
      await expect(page.locator('button.marker').first()).toBeVisible();
      const rows = page.locator('[data-testid="trade-table-A"] tbody tr');
      expect(await rows.count()).toBeGreaterThan(0);
      expect(await rows.evaluateAll((rs) => [...new Set(rs.map((r) => (r as HTMLElement).dataset.symbol))])).toEqual([
        symbol
      ]);
      await focusTrade(page, 'T-2');
      await marker(page, `${symbol}:T-2:entry`).hover();
      const ids = await linked(page);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.every((x) => x?.startsWith(`${symbol}:`))).toBe(true);
      await expect(page.getByTestId('marker-tooltip').locator('.tt-item').first()).toHaveAttribute(
        'data-symbol',
        symbol
      );
      await away(page);
    }
  });

  test('chart interactions keep working: crosshair, drag-to-measure, Ctrl-drag pan (no links while dragging), wheel zoom', async ({
    page
  }) => {
    const id = await tradingRun(page, 'e2e trades VGT 2023', ['VGT']);
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    await focusTrade(page, 'T-3');
    await marker(page, 'VGT:T-3:entry').hover();
    await away(page);
    const host = (await page.locator('.chart-host').boundingBox())!;
    const at = (fx: number) => ({ x: host.x + 70 + (host.width - 90) * fx, y: host.y + (host.height - 70) * 0.2 });
    // Crosshair.
    await page.mouse.move(at(0.5).x, at(0.5).y);
    await expect(page.getByTestId('crosshair')).toBeVisible();
    // Drag-to-measure, cleared on release.
    await page.mouse.down();
    await page.mouse.move(at(0.8).x, at(0.8).y, { steps: 6 });
    await expect(page.getByTestId('measure-percent')).toBeVisible();
    await page.mouse.up();
    await expect(page.getByTestId('measure-percent')).toHaveCount(0);
    // Ctrl-drag pans across the markers without tooltips or links.
    const before = await view(page);
    const entry = (await marker(page, 'VGT:T-3:entry').boundingBox())!;
    await page.keyboard.down('Control');
    await page.mouse.move(at(0.9).x, entry.y + entry.height / 2);
    await page.mouse.down();
    await page.mouse.move(at(0.1).x, entry.y + entry.height / 2, { steps: 12 });
    expect(await linked(page)).toEqual([]);
    await expect(page.getByTestId('marker-tooltip')).toHaveCount(0);
    await page.mouse.up();
    await page.keyboard.up('Control');
    await expect.poll(() => view(page)).not.toEqual(before);
    // Wheel zoom.
    const panned = await view(page);
    await page.mouse.move(at(0.5).x, at(0.5).y);
    await page.mouse.wheel(0, 100);
    await expect.poll(() => view(page)).not.toEqual(panned);
  });
});

test.describe('imported multi-ETF result (vg-balanced)', () => {
  test.skip(!hasStudy8, 'no local data or Study 8 runner output');

  test('exit and entry markers select the same lot, P&L as recorded, the open lot unrealized, per symbol only', async ({
    page
  }) => {
    const runs = (await (await page.request.get('/api/runs?q=vg-balanced')).json()) as { id: string }[];
    const id = runs[0]!.id;
    const run = (await (await page.request.get(`/api/runs/${id}`)).json()) as {
      metrics: { trades: { unrealized: number; openLots: number } };
    };
    const gdx = await eventsOf(page, id, 'GDX');
    await page.goto(`/#/run/${id}?symbol=GDX`);
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    const rows = page.locator('[data-testid="trade-table-A"] tbody tr');
    await expect(rows).toHaveCount(42);
    expect(await rows.evaluateAll((rs) => [...new Set(rs.map((r) => (r as HTMLElement).dataset.symbol))])).toEqual([
      'GDX'
    ]);
    // A late closed lot (the list scrolls to it).
    const exits = gdx.filter((e) => e.kind === 'executed_exit');
    const exit = exits.at(-1)!;
    await focusTrade(page, exit.tradeId!);
    await marker(page, exit.id).hover();
    await expect(page.getByTestId('marker-tooltip').getByTestId('tt-pnl').first()).toContainText(
      money(Math.round(val(exit, 'net')! * 100) / 100)
    );
    await marker(page, exit.id).click();
    const row = page.locator(`[data-testid="trade-table-A"] tr[data-trade="${exit.tradeId}"]`);
    await expect(row).toHaveAttribute('aria-selected', 'true');
    const inBox = await row.evaluate((r) => {
      const box = r.closest('.table-scroll')!.getBoundingClientRect();
      const b = r.getBoundingClientRect();
      return b.top >= box.top - 1 && b.bottom <= box.bottom + 1;
    });
    expect(inBox).toBe(true); // scrolled into view inside the list
    await expect(page.getByTestId('trade-detail')).toHaveAttribute('data-trade-key', `A:GDX:${exit.tradeId}`);
    expect(await linked(page)).toEqual([`GDX:${exit.tradeId}:entry`, exit.id].sort());
    await away(page);
    // The pool's single open lot: unrealized, from the import's recorded mark.
    const open = gdx.find((e) => e.kind === 'executed_entry' && e.meta.open === true)!;
    expect(run.metrics.trades.openLots).toBe(1);
    await focusTrade(page, open.tradeId!);
    await marker(page, open.id).hover();
    const pnl = page.getByTestId('marker-tooltip').getByTestId('tt-pnl').first();
    await expect(pnl).toContainText(money(Math.round(run.metrics.trades.unrealized * 100) / 100));
    await expect(pnl.locator('.pnl-kind')).toHaveText(' unrealized');
    await away(page);
    // VGT tab: only VGT's lots and links.
    await page.goto(`/#/run/${id}?symbol=VGT`);
    await expect(page.getByTestId('legend')).toContainText('VGT (USD', { timeout: 60_000 }); // VGT's chart is loaded
    await page.getByTestId('zoom-all').click(); // the GDX zoom was kept: VGT has no lot in it
    await expect(page.locator('button.marker').first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[data-testid="trade-table-A"] tbody tr')).toHaveCount(6);
    // The VGT lot held the shortest time, so both of its markers fit the 30-day view.
    const vgt = (await eventsOf(page, id, 'VGT')) as (Ev & { t: string; linkedEventId: string })[];
    const held = (x: (typeof vgt)[number]) =>
      Date.parse(x.t) - Date.parse(vgt.find((e) => e.id === x.linkedEventId)!.t);
    const vgtExit = vgt.filter((e) => e.kind === 'executed_exit').sort((a, b) => held(a) - held(b))[0]!;
    await focusTrade(page, vgtExit.tradeId!);
    await marker(page, vgtExit.id).click();
    await expect(page.locator(`[data-testid="trade-table-A"] tr[data-trade="${vgtExit.tradeId}"]`)).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await marker(page, vgtExit.id).hover();
    expect((await linked(page)).every((x) => x?.startsWith('VGT:'))).toBe(true);
  });
});

test('synthetic demo: executed entries without a recorded trade show "not recorded", never a made-up P&L', async ({
  page
}) => {
  const runs = (await (await page.request.get('/api/runs?q=synthetic%20demo')).json()) as { id: string }[];
  for (const r of runs.slice(0, 6)) {
    await page.goto(`/#/run/${r.id}`);
    await expect(page.locator('button.marker').first()).toBeVisible();
    const entry = page.locator('button.marker[data-kind="executed_entry"]').first();
    if ((await entry.count()) === 0) continue;
    await entry.hover({ force: true });
    await expect(page.getByTestId('marker-tooltip').getByTestId('tt-pnl').first()).toContainText('not recorded');
    expect(await linked(page)).toEqual([]);
    await expect(page.getByTestId('trades-card')).toHaveCount(0);
    return;
  }
  test.skip(true, 'no synthetic run with executed entries');
});

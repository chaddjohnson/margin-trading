// Shared e2e helpers: a completed trading-backtest run (created once per title in the e2e server's temporary state),
// a run's events for one symbol, and the chart's markers as rendered (event, kind, tone, glyph SVG).
import { type Page, expect } from '@playwright/test';

export type Ev = {
  id: string;
  kind: string;
  t: string;
  price: number | null;
  symbol: string;
  tradeId: string | null;
  linkedEventId: string | null;
  values: { key: string; value: unknown }[];
  meta: Record<string, unknown>;
};

export async function tradingRun(
  page: Page,
  title: string,
  symbols: string[],
  extra: Record<string, unknown> = {},
  window: { from: string; to: string } = { from: '2023-01-03', to: '2023-12-29' },
  resolution: '1d' | '1m' | '5m' = '1d'
) {
  const found = (await (await page.request.get(`/api/runs?q=${encodeURIComponent(title)}`)).json()) as {
    id: string;
    status: string;
  }[];
  const done = found.find((r) => r.status === 'completed');
  if (done) return done.id;
  const res = await page.request.post('/api/runs', {
    data: {
      strategyKey: 'rise-from-recent-low-trading',
      strategyVersion: '1.4.0',
      params: {
        advanceFromRecentLowPercent: 5,
        recentLowLookbackBars: 20,
        trailingStopPercent: 7.3,
        maximumHoldEnabled: true,
        maximumHoldDays: 8,
        intradayLossBufferEnabled: true,
        intradayLossBufferPercent: 2.9,
        costBpsPerSide: 5,
        continuationEnabled: false,
        trendFilterEnabled: false,
        eligibilityEnabled: false,
        entryMethod: 'rise_from_recent_low',
        initialStopEnabled: false,
        retentionEnabled: false,
        drawdownRecoveryGateEnabled: false,
        ...extra
      },
      symbols,
      from: window.from,
      to: window.to,
      resolution,
      title
    }
  });
  const id = ((await res.json()) as { id: string }).id;
  await expect
    .poll(async () => ((await (await page.request.get(`/api/runs/${id}`)).json()) as { status: string }).status, {
      timeout: 120_000
    })
    .toBe('completed');
  return id;
}

/** Chooses a strategy in the New Test rich select (StrategyPicker) with the pointer and checks the submitted value. */
export async function chooseStrategy(page: Page, key: string) {
  const combo = page.getByTestId('strategy-picker');
  if ((await combo.getAttribute('data-value')) === key) return;
  await combo.click();
  await page.getByTestId(`strategy-option-${key}`).click();
  await expect(combo).toHaveAttribute('data-value', key);
  await expect(page.getByTestId('strategy-listbox')).toBeHidden();
}

export const eventsOf = async (page: Page, id: string, symbol: string) =>
  ((await (await page.request.get(`/api/runs/${id}/events?symbol=${symbol}`)).json()) as { events: Ev[] }).events;

export const renderedMarkers = (page: Page) =>
  page.locator('button.marker').evaluateAll((bs) =>
    bs.map((b) => {
      const el = b as HTMLElement;
      const src = el.querySelector('img')!.getAttribute('src')!;
      return {
        id: el.dataset.eventId!,
        kind: el.dataset.kind!,
        role: el.dataset.role!,
        symbol: el.dataset.symbol!,
        tone: el.dataset.tone!,
        svg: decodeURIComponent(src.slice(src.indexOf(',') + 1))
      };
    })
  );

/** The tone a trade's markers must have: the recorded exit net's sign, or "open". */
export const expectedTone = (events: Ev[], tradeId: string) => {
  const entry = events.find((e) => e.tradeId === tradeId && e.kind === 'executed_entry');
  if (entry?.meta.open === true) return 'open';
  const net = events
    .find((e) => e.tradeId === tradeId && e.kind === 'executed_exit')
    ?.values.find((v) => v.key === 'net')?.value as number;
  return net > 0 ? 'profit' : net < 0 ? 'loss' : 'flat';
};

/** Chooses the chart type with the pointer (Candles · 1D is the default for real data) and waits for its chart. */
export async function chooseChart(page: Page, type: 'candles' | 'line') {
  await page.getByTestId('chart-type').locator('label', { hasText: type === 'candles' ? 'Candles · 1D' : 'Line · intraday' }).click();
  await expect(page.getByTestId(`chart-type-${type}`)).toBeChecked();
  await expect(page.getByTestId('price-chart')).toHaveAttribute('data-chart-mode', type);
}

// Synthetic minute series for the engine tests: hand-written bars with exact prices, so every expected fill, fee and
// mark can be computed by hand.
import { dayIndexOf, dayOf } from '../calendar.ts';
import { type ExecutionSettings, scenario } from '../costs.ts';
import { buildDays, runReference } from '../engine.ts';
import { runFast } from '../fast.ts';
import type { D1Params } from '../params.ts';
import { type Series, seriesOfBuffer } from '../snapshot.ts';

export type BarSpec = [string, number, number, number, number, number?]; // [ISO minute, o, h, l, c, quote volume]

export const at = (iso: string) => Date.parse(iso.length === 16 ? `${iso}:00Z` : iso) / 1000;

export const makeSeries = (specs: BarSpec[]): Series => {
  const rows = specs.length;
  const series = seriesOfBuffer(new SharedArrayBuffer(rows * 8 * 8), rows);

  specs.forEach(([iso, o, h, l, c, qv], i) => {
    series.time[i] = at(iso);
    series.open[i] = o;
    series.high[i] = h;
    series.low[i] = l;
    series.close[i] = c;
    series.volume[i] = 1;
    series.quoteVolume[i] = qv ?? 10_000_000;
    series.trades[i] = 1;
  });

  for (let i = 1; i < rows; i++) {
    if (!(series.time[i]! > series.time[i - 1]!)) {
      throw new Error(`fixture bar ${i} (${specs[i]![0]}) is not after the previous one`);
    }
  }

  return series;
};

// A day of one flat bar at 00:00.
export const flat = (date: string, price: number): BarSpec => [`${date}T00:00`, price, price, price, price];

export const baseParams: D1Params = {
  targetPercentChange: 0.1,
  trailingBuyPercentage: 0.02,
  trailingStopPercentage: 0.05,
  maximumHoldDays: 3,
  tickWindowSize: 2,
  intradayLossBuffer: 0.01,
  pullback: 0.05,
  continuationWindow: 3
};

export const settingsOf = (feeBps = 10, impactBps = 0, stopFill: ExecutionSettings['stopFill'] = 'adverse') => ({
  costs: scenario(feeBps, impactBps),
  stopFill,
  minOrderNotional: 10
});

export const runBoth = (
  series: Series,
  armDate: string,
  params: D1Params = baseParams,
  settings: ExecutionSettings = settingsOf(),
  mode: 'cash' | 'fixed' = 'cash'
) => {
  const armStartDay = dayOf(at(`${armDate}T00:00`));
  const window = { label: 'all', startDay: armStartDay, endDay: dayOf(series.time[series.rows - 1]!) + 1 };
  const reference = runReference({
    days: buildDays(series),
    params,
    settings,
    armStartDay,
    mode,
    windows: [window],
    events: true
  });
  const fast = runFast({ series, index: dayIndexOf(series), params, settings, armStartDay, windows: [window] });

  return { reference, fast, window };
};

// Share splits of the canonical minute data. The files hold raw prices (Alpaca `adjustment=raw`), so a split shows
// as a price jump that a backtest would read as a crash and a trading signal. config/market-events/splits.json
// records each split with its issuer source; a partition run (src/lib/evaluation.ts) and the allocator's --dataset
// path forward-adjust: every bar from a split's effective date on has its prices multiplied by the split ratio and
// its volume divided by it, so the whole run is in the share units of its first session. Shares are fractional
// everywhere, so position values, cost bases and P&L are those of holding the multiplied shares, sessions before the
// first split are untouched, and a run that doesn't span a split is unchanged. Per-share distributions on or after
// a split are multiplied by the same ratio (src/multi-etf-allocator/marketEvents.ts). Explicit data files are never
// adjusted.
import fs from 'fs-extra';
import type { MarketSession, Tick } from '#types';
import { isNewYorkDate } from './partitions.ts';

export const splitsFile = 'config/market-events/splits.json';

export interface SplitEvent {
  symbol: string;
  effectiveDate: string; // the first New York session that trades split-adjusted
  ratio: number; // new shares per old share: 8 for an 8-for-1 split, 0.25 for a 1-for-4 reverse split
  source: string; // where the split is documented
}

export interface SplitAdjustment {
  symbol: string;
  effectiveDate: string;
  ratio: number;
}

const symbolPattern = /^[A-Z0-9][A-Z0-9.-]*$/;

export const parseSplits = (text: string, source = splitsFile): SplitEvent[] => {
  const json = JSON.parse(text) as { schemaVersion?: unknown; splits?: unknown };

  if (json.schemaVersion !== 1 || !Array.isArray(json.splits)) {
    throw new Error(`${source}: expected { "schemaVersion": 1, "splits": [...] }`);
  }

  const seen = new Set<string>();

  return json.splits.map((entry: Record<string, unknown>, index) => {
    const where = `${source}: splits[${index}]`;
    const keys = Object.keys(entry).sort().join(',');

    if (keys !== 'effectiveDate,ratio,source,symbol') {
      throw new Error(`${where} must have exactly symbol, effectiveDate, ratio and source; it has ${keys}`);
    }

    if (typeof entry.symbol !== 'string' || !symbolPattern.test(entry.symbol)) {
      throw new Error(`${where}: symbol ${JSON.stringify(entry.symbol)} is not a symbol`);
    }

    if (!isNewYorkDate(entry.effectiveDate)) {
      throw new Error(`${where}: effectiveDate must be a YYYY-MM-DD date`);
    }

    if (typeof entry.ratio !== 'number' || !(entry.ratio > 0) || !Number.isFinite(entry.ratio) || entry.ratio === 1) {
      throw new Error(`${where}: ratio must be a positive number other than 1`);
    }

    if (typeof entry.source !== 'string' || entry.source.length < 10) {
      throw new Error(`${where}: source must document the split`);
    }

    const key = `${entry.symbol} ${entry.effectiveDate}`;

    if (seen.has(key)) {
      throw new Error(`${where}: a second split of ${key}`);
    }

    seen.add(key);
    return entry as unknown as SplitEvent;
  });
};

let cached: SplitEvent[] | undefined;

export const readSplits = (file = splitsFile): SplitEvent[] => {
  if (file !== splitsFile) {
    return parseSplits(fs.readFileSync(file, 'utf8'), file);
  }

  cached ??= fs.pathExistsSync(file) ? parseSplits(fs.readFileSync(file, 'utf8'), file) : [];
  return cached;
};

// The splits of a symbol after `baseDate` and on or before `date`: their product converts a price on `date` into
// the share units of `baseDate`.
export const splitFactor = (splits: readonly SplitEvent[], symbol: string, baseDate: string, date: string) =>
  splits
    .filter((split) => split.symbol === symbol && split.effectiveDate > baseDate && split.effectiveDate <= date)
    .reduce((factor, split) => factor * split.ratio, 1);

const adjustTick = (tick: Tick, factor: number): Tick => ({
  ...tick,
  open: tick.open * factor,
  high: tick.high * factor,
  low: tick.low * factor,
  close: tick.close * factor,
  volume: tick.volume / factor
});

// Sessions in the share units of the first one. Sessions without a split before them are returned as they are (the
// same objects), so a run that doesn't span a split is unchanged.
export const adjustSessionsForSplits = (
  sessions: readonly MarketSession[],
  symbol: string,
  splits: readonly SplitEvent[]
): { sessions: MarketSession[]; applied: SplitAdjustment[] } => {
  const first = sessions[0];
  const last = sessions.at(-1);

  if (!first || !last) {
    return { sessions: [...sessions], applied: [] };
  }

  const applied = splits
    .filter((split) => split.symbol === symbol && split.effectiveDate > first.date && split.effectiveDate <= last.date)
    .map(({ symbol: splitSymbol, effectiveDate, ratio }) => ({ symbol: splitSymbol, effectiveDate, ratio }));

  if (applied.length === 0) {
    return { sessions: [...sessions], applied };
  }

  return {
    sessions: sessions.map((session) => {
      const factor = splitFactor(splits, symbol, first.date, session.date);

      return factor === 1
        ? session
        : {
            ...session,
            bars: session.bars.map((bar) => adjustTick(bar, factor)),
            open: session.open * factor,
            high: session.high * factor,
            low: session.low * factor,
            close: session.close * factor,
            volume: session.volume / factor,
            closingPrint: session.closingPrint === undefined ? undefined : session.closingPrint * factor
          };
    }),
    applied
  };
};

// Split-sized overnight moves of a session series that no recorded split explains: a check for the data audit.
export const unexplainedSplitGaps = (
  sessions: readonly MarketSession[],
  symbol: string,
  splits: readonly SplitEvent[],
  threshold = 0.3
) => {
  const gaps: { date: string; previousClose: number; open: number; ratio: number }[] = [];

  for (let index = 1; index < sessions.length; index++) {
    const previous = sessions[index - 1]!;
    const session = sessions[index]!;
    const factor = splitFactor(splits, symbol, previous.date, session.date);
    const ratio = (session.open * factor) / previous.close;

    if (ratio < 1 - threshold || ratio > 1 / (1 - threshold)) {
      gaps.push({ date: session.date, previousClose: previous.close, open: session.open, ratio });
    }
  }

  return gaps;
};

// The data audit (DATA_AUDIT.md): data quality only. It reads every row of the raw file, but deliberately computes no
// returns, volatility or other market-outcome statistic over the whole history, so the split rule that consumes it
// (./calendar.ts) stays outcome-blind. Price-move counts below are integrity checks (bad prints, spikes, gaps), reported
// as counts and listed outliers, never aggregated into a performance figure.
import { secondsPerDay, secondsPerMinute } from './context.ts';
import type { RawFile } from './raw.ts';

const iso = (seconds: number) => new Date(seconds * 1000).toISOString().replace('.000Z', 'Z');
const dayOf = (seconds: number) => Math.floor(seconds / secondsPerDay);
const dateOfDay = (day: number) => new Date(day * secondsPerDay * 1000).toISOString().slice(0, 10);
const yearOf = (seconds: number) => new Date(seconds * 1000).getUTCFullYear();

interface Ranked<T> {
  limit: number;
  items: (T & { key: number })[];
}

const ranked = <T>(limit: number): Ranked<T> => ({ limit, items: [] });

const offer = <T>(list: Ranked<T>, key: number, item: T) => {
  if (list.items.length < list.limit || key > list.items[list.items.length - 1]!.key) {
    list.items.push({ ...item, key });
    list.items.sort((a, b) => b.key - a.key);

    if (list.items.length > list.limit) {
      list.items.pop();
    }
  }
};

export interface DayCoverage {
  day: number; // UNIX day number (UTC)
  date: string;
  rows: number; // minute rows present (traded or not)
  traded: number; // rows with at least one trade
}

export const auditRaw = (raw: RawFile) => {
  const { time, open, high, low, close, volume, takerBuyQuoteVolume, takerBuyVolume, quoteVolume, trades } =
    raw.columns;
  const n = raw.rows;
  const tolerance = 1e-9;
  const counts = {
    nonMinuteAligned: 0,
    duplicates: 0,
    outOfOrder: 0,
    nonPositivePrice: 0,
    lowAboveOpenOrClose: 0,
    highBelowOpenOrClose: 0,
    highBelowLow: 0,
    negativeVolume: 0,
    nonIntegerTrades: 0,
    zeroTradeRows: 0,
    zeroTradeWithVolume: 0,
    tradesWithZeroVolume: 0,
    zeroTradeFlatAtPreviousClose: 0,
    zeroTradeNotFlatAtPreviousClose: 0,
    vwapChecked: 0,
    vwapOutsideRange: 0,
    takerVwapChecked: 0,
    takerVwapOutsideRange: 0,
    takerVolumeAboveVolume: 0,
    takerQuoteAboveQuote: 0,
    closeMoveAbove2pct: 0,
    closeMoveAbove5pct: 0,
    closeMoveAbove10pct: 0,
    rangeAbove5pct: 0,
    rangeAbove10pct: 0
  };
  const gaps = { count: 0, missingMinutes: 0, atLeast60: 0, atLeast1440: 0 };
  const largestGaps = ranked<{ after: string; before: string; missingMinutes: number; priceJump: number }>(30);
  const largestCloseMoves = ranked<{ time: string; previousClose: number; close: number; afterGapMinutes: number }>(20);
  const largestRanges = ranked<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    trades: number;
  }>(20);
  const largestOpenGaps = ranked<{ time: string; previousClose: number; open: number; afterGapMinutes: number }>(20);
  const days = new Map<number, DayCoverage>();
  const years = new Map<
    number,
    {
      rows: number;
      traded: number;
      zeroTrade: number;
      missingMinutes: number;
      priceDecimals: number;
      volumeDecimals: number;
    }
  >();
  const decimals = (value: number) => {
    for (let k = 0; k <= 10; k++) {
      const scaled = value * 10 ** k;

      if (Math.abs(scaled - Math.round(scaled)) < 1e-6 * Math.max(1, Math.abs(scaled)) * 1e-3) {
        return k;
      }
    }

    return 11;
  };
  let maxQuoteVolume = { value: 0, time: '' };
  let maxTrades = { value: 0, time: '' };

  for (let i = 0; i < n; i++) {
    const t = time[i]!;
    const day = dayOf(t);
    const year = yearOf(t);
    const coverage = days.get(day) ?? { day, date: dateOfDay(day), rows: 0, traded: 0 };
    const yearly = years.get(year) ?? {
      rows: 0,
      traded: 0,
      zeroTrade: 0,
      missingMinutes: 0,
      priceDecimals: 0,
      volumeDecimals: 0
    };

    coverage.rows++;
    yearly.rows++;

    if (t % secondsPerMinute !== 0) {
      counts.nonMinuteAligned++;
    }

    const o = open[i]!;
    const h = high[i]!;
    const l = low[i]!;
    const c = close[i]!;
    const v = volume[i]!;
    const q = quoteVolume[i]!;
    const k = trades[i]!;

    if (o <= 0 || h <= 0 || l <= 0 || c <= 0) {
      counts.nonPositivePrice++;
    }

    if (l > Math.min(o, c) + tolerance) {
      counts.lowAboveOpenOrClose++;
    }

    if (h < Math.max(o, c) - tolerance) {
      counts.highBelowOpenOrClose++;
    }

    if (h < l) {
      counts.highBelowLow++;
    }

    if (v < 0 || q < 0 || takerBuyVolume[i]! < 0 || takerBuyQuoteVolume[i]! < 0) {
      counts.negativeVolume++;
    }

    if (!Number.isInteger(k) || k < 0) {
      counts.nonIntegerTrades++;
    }

    if (k === 0) {
      counts.zeroTradeRows++;
      yearly.zeroTrade++;

      if (v !== 0 || q !== 0) {
        counts.zeroTradeWithVolume++;
      }

      if (i > 0) {
        const p = close[i - 1]!;

        if (o === p && h === p && l === p && c === p) {
          counts.zeroTradeFlatAtPreviousClose++;
        } else {
          counts.zeroTradeNotFlatAtPreviousClose++;
        }
      }
    } else {
      coverage.traded++;
      yearly.traded++;

      if (v === 0) {
        counts.tradesWithZeroVolume++;
      }
    }

    if (v > 0) {
      const vwap = q / v;

      counts.vwapChecked++;

      // The quote volume over the base volume is the minute's volume-weighted price, inside [low, high] up to the
      // rounding of the two volumes (relative 1e-4 here).
      if (vwap < l * (1 - 1e-4) || vwap > h * (1 + 1e-4)) {
        counts.vwapOutsideRange++;
      }

      if (takerBuyVolume[i]! > v * (1 + 1e-9)) {
        counts.takerVolumeAboveVolume++;
      }

      if (takerBuyQuoteVolume[i]! > q * (1 + 1e-9)) {
        counts.takerQuoteAboveQuote++;
      }
    }

    if (takerBuyVolume[i]! > 0) {
      const takerVwap = takerBuyQuoteVolume[i]! / takerBuyVolume[i]!;

      counts.takerVwapChecked++;

      if (takerVwap < l * (1 - 1e-4) || takerVwap > h * (1 + 1e-4)) {
        counts.takerVwapOutsideRange++;
      }
    }

    yearly.priceDecimals = Math.max(yearly.priceDecimals, decimals(c));
    yearly.volumeDecimals = Math.max(yearly.volumeDecimals, decimals(v));

    if (q > maxQuoteVolume.value) {
      maxQuoteVolume = { value: q, time: iso(t) };
    }

    if (k > maxTrades.value) {
      maxTrades = { value: k, time: iso(t) };
    }

    const range = l > 0 ? h / l - 1 : 0;

    if (range > 0.05) {
      counts.rangeAbove5pct++;
    }

    if (range > 0.1) {
      counts.rangeAbove10pct++;
    }

    offer(largestRanges, range, { time: iso(t), open: o, high: h, low: l, close: c, trades: k });

    if (i > 0) {
      const previous = time[i - 1]!;
      const step = t - previous;

      if (step === 0) {
        counts.duplicates++;
      } else if (step < 0) {
        counts.outOfOrder++;
      } else if (step > secondsPerMinute) {
        const missing = step / secondsPerMinute - 1;

        gaps.count++;
        gaps.missingMinutes += missing;
        yearly.missingMinutes += missing;

        if (missing >= 60) {
          gaps.atLeast60++;
        }

        if (missing >= 1440) {
          gaps.atLeast1440++;
        }

        offer(largestGaps, missing, {
          after: iso(previous),
          before: iso(t),
          missingMinutes: missing,
          priceJump: o / close[i - 1]! - 1
        });
      }

      const afterGapMinutes = Math.max(0, step / secondsPerMinute - 1);
      const move = Math.abs(c / close[i - 1]! - 1);

      if (move > 0.02) {
        counts.closeMoveAbove2pct++;
      }

      if (move > 0.05) {
        counts.closeMoveAbove5pct++;
      }

      if (move > 0.1) {
        counts.closeMoveAbove10pct++;
      }

      offer(largestCloseMoves, move, { time: iso(t), previousClose: close[i - 1]!, close: c, afterGapMinutes });
      offer(largestOpenGaps, Math.abs(o / close[i - 1]! - 1), {
        time: iso(t),
        previousClose: close[i - 1]!,
        open: o,
        afterGapMinutes
      });
    }

    days.set(day, coverage);
    years.set(year, yearly);
  }

  // Calendar days with no row at all between the first and the last day.
  const firstDay = dayOf(time[0]!);
  const lastDay = dayOf(time[n - 1]!);
  const coverageList: DayCoverage[] = [];

  for (let day = firstDay; day <= lastDay; day++) {
    coverageList.push(days.get(day) ?? { day, date: dateOfDay(day), rows: 0, traded: 0 });
  }

  const shortDays = coverageList.filter((row) => row.rows < 1440);
  const dayBuckets = {
    full1440: coverageList.filter((row) => row.rows === 1440).length,
    rows1380to1439: coverageList.filter((row) => row.rows >= 1380 && row.rows < 1440).length,
    rows720to1379: coverageList.filter((row) => row.rows >= 720 && row.rows < 1380).length,
    rows1to719: coverageList.filter((row) => row.rows >= 1 && row.rows < 720).length,
    noRows: coverageList.filter((row) => row.rows === 0).length
  };
  const strip = <T extends { key: number }>(list: Ranked<Omit<T, 'key'>>) =>
    list.items.map(({ key, ...rest }) => {
      void key;
      return rest;
    });

  return {
    file: raw.file,
    bytes: raw.bytes,
    sha256: raw.sha256,
    rows: n,
    malformedLines: raw.malformed.length,
    malformedExamples: raw.malformed.slice(0, 5),
    carriageReturns: raw.carriageReturns,
    maxFractionDigits: raw.maxFractionDigits,
    time: {
      unit: time[0]! > 1e9 && time[0]! < 1e10 ? 'seconds' : 'unrecognised',
      first: iso(time[0]!),
      last: iso(time[n - 1]!),
      firstDay: dateOfDay(firstDay),
      lastDay: dateOfDay(lastDay),
      calendarDays: lastDay - firstDay + 1,
      expectedMinutesFirstToLast: (time[n - 1]! - time[0]!) / secondsPerMinute + 1
    },
    counts,
    gaps,
    largestGaps: strip(largestGaps),
    largestCloseMoves: strip(largestCloseMoves),
    largestRanges: strip(largestRanges),
    largestOpenGaps: strip(largestOpenGaps),
    maxQuoteVolume,
    maxTrades,
    dayBuckets,
    shortDays: shortDays.map(({ date, rows, traded }) => ({ date, rows, traded })),
    years: Object.fromEntries([...years.entries()].sort((a, b) => a[0] - b[0])),
    dayCoverage: coverageList
  };
};

export type RawAudit = ReturnType<typeof auditRaw>;

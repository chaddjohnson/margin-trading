// Point-in-time indicators. Every value at session t uses only data known at t's close (VIX: t−1's close,
// because CBOE's VIX close prints after the 4:00 p.m. equity close). NaN means not computable (warm-up,
// missing proxy session). Nothing is forward-filled. tests/features.test.ts checks that changing every
// price after t leaves every feature at t unchanged.

import type { DailyBars, StudyData } from './data.ts';
import { type ReferenceHighs, computeReferenceHighs } from './engine.ts';

export interface FeatureSpec {
  name: string;
  family: 'A_speed' | 'B_volume' | 'C_volatility' | 'D_cross_etf' | 'E_stabilization' | 'candidate';
  formula: string;
  // The direction hypothesised as more dangerous; Phase 3 reports both directions regardless.
  danger: 'high' | 'low';
}

export const featureSpecs: FeatureSpec[] = [
  {
    name: 'dd',
    family: 'A_speed',
    formula: '1 − close_t / refHigh_t (refHigh = max high of the 90 sessions before t)',
    danger: 'high'
  },
  {
    name: 'peakAge',
    family: 'A_speed',
    formula: 't − peakIndex_t: sessions since the reference-high bar',
    danger: 'low'
  },
  { name: 'ddPerSession', family: 'A_speed', formula: 'dd_t / peakAge_t', danger: 'high' },
  { name: 'ret5', family: 'A_speed', formula: 'close_t / close_{t−5} − 1', danger: 'low' },
  { name: 'ret10', family: 'A_speed', formula: 'close_t / close_{t−10} − 1', danger: 'low' },
  { name: 'ret20', family: 'A_speed', formula: 'close_t / close_{t−20} − 1', danger: 'low' },
  {
    name: 'accel5',
    family: 'A_speed',
    formula: 'ret5_t − (close_{t−5} / close_{t−10} − 1): negative = the last 5 sessions fell faster than the 5 before',
    danger: 'low'
  },
  {
    name: 'consecDown',
    family: 'A_speed',
    formula: 'consecutive sessions ending at t with close < previous close',
    danger: 'high'
  },
  { name: 'newLow20', family: 'A_speed', formula: '1 if close_t < min(close_{t−20..t−1})', danger: 'high' },
  { name: 'distSma50', family: 'A_speed', formula: 'close_t / SMA50_t − 1 (SMA of closes t−49..t)', danger: 'low' },
  { name: 'distSma200', family: 'A_speed', formula: 'close_t / SMA200_t − 1', danger: 'low' },
  { name: 'relVol20', family: 'B_volume', formula: 'volume_t / mean(volume_{t−20..t−1})', danger: 'high' },
  { name: 'relVol50', family: 'B_volume', formula: 'volume_t / mean(volume_{t−50..t−1})', danger: 'high' },
  {
    name: 'downVolShare10',
    family: 'B_volume',
    formula: 'sum of volume on down closes / total volume, sessions t−9..t',
    danger: 'high'
  },
  { name: 'relVolMax10', family: 'B_volume', formula: 'max(relVol20_{t−9..t})', danger: 'high' },
  {
    name: 'volSubsiding',
    family: 'B_volume',
    formula: 'mean(relVol20_{t−2..t}) / relVolMax10_t (low = selling volume fading from a spike)',
    danger: 'high'
  },
  { name: 'atr14', family: 'C_volatility', formula: 'Wilder ATR(14) / close_t', danger: 'high' },
  {
    name: 'rv10',
    family: 'C_volatility',
    formula: 'sample stdev of the last 10 daily log returns × √252',
    danger: 'high'
  },
  { name: 'rv20', family: 'C_volatility', formula: 'as rv10 over 20 returns', danger: 'high' },
  { name: 'volRatio', family: 'C_volatility', formula: 'rv10_t / rv60_t (volatility expansion)', danger: 'high' },
  {
    name: 'rv10Change5',
    family: 'C_volatility',
    formula: 'rv10_t / rv10_{t−5} (below 1 = volatility contracting)',
    danger: 'high'
  },
  { name: 'bigDowns20', family: 'C_volatility', formula: 'count of daily returns ≤ −3% in t−19..t', danger: 'high' },
  { name: 'worst1d10', family: 'C_volatility', formula: 'min daily close-to-close return in t−9..t', danger: 'low' },
  { name: 'vixPrev', family: 'C_volatility', formula: 'CBOE VIX close on the session before t', danger: 'high' },
  {
    name: 'vixChange5',
    family: 'C_volatility',
    formula: 'vixPrev_t / VIX close 6 sessions before t − 1',
    danger: 'high'
  },
  {
    name: 'xDdFrac10',
    family: 'D_cross_etf',
    formula: 'share of available proxies (≥3 required) at least 10% below their own 90-session high',
    danger: 'high'
  },
  {
    name: 'xBelowSma50Frac',
    family: 'D_cross_etf',
    formula: 'share of available proxies closing below their own SMA50',
    danger: 'high'
  },
  {
    name: 'xNewLow20Frac',
    family: 'D_cross_etf',
    formula: 'share of available proxies closing below their prior 20-session closing low',
    danger: 'high'
  },
  {
    name: 'spyDd',
    family: 'D_cross_etf',
    formula: 'SPY (or the universe’s broad proxy) drawdown from its own 90-session high',
    danger: 'high'
  },
  {
    name: 'relWeak20',
    family: 'D_cross_etf',
    formula: 'ret20 of the target − ret20 of SPY (negative = target-specific weakness)',
    danger: 'low'
  },
  {
    name: 'lowAge',
    family: 'E_stabilization',
    formula: 't − (latest session holding the lowest close since the reference-high bar); 0 = new closing low today',
    danger: 'low'
  },
  {
    name: 'reboundFromLow',
    family: 'E_stabilization',
    formula: 'close_t / lowest close since the reference-high bar − 1',
    danger: 'low'
  },
  {
    name: 'failedRallies',
    family: 'E_stabilization',
    formula:
      'since the reference-high bar: rebounds of ≥3% off the running closing low that were followed by a new closing low',
    danger: 'high'
  },
  { name: 'upClose', family: 'E_stabilization', formula: '1 if close_t > close_{t−1}', danger: 'low' },
  {
    name: 'candVelocity',
    family: 'candidate',
    formula:
      'sessions from the reference-high bar to the first 10% signal against that bar (the candidate’s drawdown velocity); NaN before the first signal',
    danger: 'low'
  },
  {
    name: 'candAge',
    family: 'candidate',
    formula: 't − first 10% signal session against the current reference-high bar',
    danger: 'low'
  }
];

export type Features = Record<string, Float64Array>;

const nanArray = (length: number) => new Float64Array(length).fill(NaN);

const rollingMean = (values: ArrayLike<number>, window: number, includeCurrent: boolean) => {
  const result = nanArray(values.length);

  for (let t = 0; t < values.length; t++) {
    const end = includeCurrent ? t : t - 1;
    const start = end - window + 1;

    if (start < 0) {
      continue;
    }

    let sum = 0;

    for (let i = start; i <= end; i++) {
      sum += values[i]!;
    }

    result[t] = sum / window;
  }

  return result;
};

const realizedVol = (close: ArrayLike<number>, window: number) => {
  const result = nanArray(close.length);

  for (let t = window; t < close.length; t++) {
    let sum = 0;
    let sumSq = 0;

    for (let i = t - window + 1; i <= t; i++) {
      const r = Math.log(close[i]! / close[i - 1]!);

      sum += r;
      sumSq += r * r;
    }

    const mean = sum / window;
    result[t] = Math.sqrt(Math.max(0, (sumSq - window * mean * mean) / (window - 1)) * 252);
  }

  return result;
};

const ret = (close: ArrayLike<number>, t: number, k: number) => (t - k >= 0 ? close[t]! / close[t - k]! - 1 : NaN);

// Indicators of one series on its own calendar, used for the target and for each proxy.
const ownBasics = (bars: { close: ArrayLike<number>; high: ArrayLike<number> }, lookback: number) => {
  const { close } = bars;
  const refs = computeReferenceHighs(bars.high, lookback);
  const sma50 = rollingMean(close, 50, true);
  const dd = nanArray(close.length);
  const below50 = nanArray(close.length);
  const newLow20 = nanArray(close.length);
  const ret20 = nanArray(close.length);

  for (let t = 1; t < close.length; t++) {
    dd[t] = 1 - close[t]! / refs.value[t]!;
    below50[t] = Number.isNaN(sma50[t]!) ? NaN : close[t]! < sma50[t]! ? 1 : 0;
    ret20[t] = ret(close, t, 20);

    if (t >= 20) {
      let min = Infinity;

      for (let i = t - 20; i < t; i++) {
        min = Math.min(min, close[i]!);
      }

      newLow20[t] = close[t]! < min ? 1 : 0;
    }
  }

  return { refs, dd, below50, newLow20, ret20 };
};

export interface FeatureOptions {
  lookback?: number;
  dip?: number;
  rallyThreshold?: number;
}

export const computeFeatures = (
  data: StudyData,
  options: FeatureOptions = {}
): { features: Features; refs: ReferenceHighs } => {
  const bars: DailyBars = data.vgt;
  const lookback = options.lookback ?? 90;
  const dip = options.dip ?? 0.1;
  const rally = options.rallyThreshold ?? 0.03;
  const n = bars.close.length;
  const { close, high, low, volume } = bars;
  const own = ownBasics(bars, lookback);
  const refs = own.refs;
  const f: Features = {};

  for (const spec of featureSpecs) {
    f[spec.name] = nanArray(n);
  }

  const sma50 = rollingMean(close, 50, true);
  const sma200 = rollingMean(close, 200, true);
  const vol20 = rollingMean(volume, 20, false);
  const vol50 = rollingMean(volume, 50, false);
  const rv10 = realizedVol(close, 10);
  const rv20 = realizedVol(close, 20);
  const rv60 = realizedVol(close, 60);

  // Wilder ATR(14).
  const atr = nanArray(n);
  let atrValue = NaN;
  let trSum = 0;

  for (let t = 1; t < n; t++) {
    const tr = Math.max(high[t]! - low[t]!, Math.abs(high[t]! - close[t - 1]!), Math.abs(low[t]! - close[t - 1]!));

    if (t <= 14) {
      trSum += tr;

      if (t === 14) {
        atrValue = trSum / 14;
      }
    } else {
      atrValue = (atrValue * 13 + tr) / 14;
    }

    atr[t] = atrValue;
  }

  // Candidate tracking: the first 10% signal against each reference-high bar.
  const firstSignalOfPeak = new Map<number, number>();

  for (let t = 1; t < n; t++) {
    const peak = refs.peakIndex[t]!;
    const dd = 1 - close[t]! / refs.value[t]!;

    f.dd![t] = dd;
    f.peakAge![t] = t - peak;
    f.ddPerSession![t] = dd / (t - peak);
    f.ret5![t] = ret(close, t, 5);
    f.ret10![t] = ret(close, t, 10);
    f.ret20![t] = ret(close, t, 20);
    f.accel5![t] = t >= 10 ? ret(close, t, 5) - (close[t - 5]! / close[t - 10]! - 1) : NaN;

    let down = 0;

    for (let i = t; i >= 1 && close[i]! < close[i - 1]!; i--) {
      down++;
    }

    f.consecDown![t] = down;
    f.newLow20![t] = own.newLow20[t]!;
    f.distSma50![t] = close[t]! / sma50[t]! - 1;
    f.distSma200![t] = close[t]! / sma200[t]! - 1;

    f.relVol20![t] = volume[t]! / vol20[t]!;
    f.relVol50![t] = volume[t]! / vol50[t]!;

    if (t >= 10) {
      let downVolume = 0;
      let total = 0;

      for (let i = t - 9; i <= t; i++) {
        total += volume[i]!;

        if (close[i]! < close[i - 1]!) {
          downVolume += volume[i]!;
        }
      }

      f.downVolShare10![t] = downVolume / total;
    }

    if (t >= 9) {
      let max = -Infinity;

      for (let i = t - 9; i <= t; i++) {
        max = Math.max(max, f.relVol20![i]!);
      }

      f.relVolMax10![t] = max;
      f.volSubsiding![t] = t >= 2 ? (f.relVol20![t]! + f.relVol20![t - 1]! + f.relVol20![t - 2]!) / 3 / max : NaN;
    }

    f.atr14![t] = atr[t]! / close[t]!;
    f.rv10![t] = rv10[t]!;
    f.rv20![t] = rv20[t]!;
    f.volRatio![t] = rv10[t]! / rv60[t]!;
    f.rv10Change5![t] = t >= 5 ? rv10[t]! / rv10[t - 5]! : NaN;

    if (t >= 20) {
      let count = 0;

      for (let i = t - 19; i <= t; i++) {
        if (close[i]! / close[i - 1]! - 1 <= -0.03) {
          count++;
        }
      }

      f.bigDowns20![t] = count;
    }

    if (t >= 10) {
      let worst = Infinity;

      for (let i = t - 9; i <= t; i++) {
        worst = Math.min(worst, close[i]! / close[i - 1]! - 1);
      }

      f.worst1d10![t] = worst;
    }

    // Stabilization measures since the reference-high bar.
    let lowest = Infinity;
    let lowestAt = peak;
    let rallied = false;
    let failed = 0;

    for (let i = peak; i <= t; i++) {
      if (close[i]! <= lowest) {
        if (close[i]! < lowest && rallied) {
          failed++;
          rallied = false;
        }

        lowest = close[i]!;
        lowestAt = i;
      } else if (close[i]! >= lowest * (1 + rally)) {
        rallied = true;
      }
    }

    f.lowAge![t] = t - lowestAt;
    f.reboundFromLow![t] = close[t]! / lowest - 1;
    f.failedRallies![t] = failed;
    f.upClose![t] = close[t]! > close[t - 1]! ? 1 : 0;

    if (dd >= dip && !firstSignalOfPeak.has(peak)) {
      firstSignalOfPeak.set(peak, t);
    }

    const first = firstSignalOfPeak.get(peak);

    if (first !== undefined) {
      f.candVelocity![t] = first - peak;
      f.candAge![t] = t - first;
    }
  }

  // Cross-ETF proxies, each on its own calendar, looked up by exact date.
  const proxyBasics = data.proxies.map((proxy) => ({ proxy, basics: ownBasics(proxy.own, lookback) }));
  const broad = proxyBasics.find(({ proxy }) => proxy.symbol === 'SPY');

  for (let t = 1; t < n; t++) {
    let available = 0;
    let dd10 = 0;
    let below = 0;
    let lows = 0;

    for (const { proxy, basics } of proxyBasics) {
      const i = proxy.ownIndex[t]!;

      if (
        i <= 0 ||
        Number.isNaN(basics.dd[i]!) ||
        Number.isNaN(basics.below50[i]!) ||
        Number.isNaN(basics.newLow20[i]!)
      ) {
        continue;
      }

      available++;
      dd10 += basics.dd[i]! >= 0.1 ? 1 : 0;
      below += basics.below50[i]!;
      lows += basics.newLow20[i]!;
    }

    if (available >= 3) {
      f.xDdFrac10![t] = dd10 / available;
      f.xBelowSma50Frac![t] = below / available;
      f.xNewLow20Frac![t] = lows / available;
    }

    if (broad) {
      const i = broad.proxy.ownIndex[t]!;

      if (i > 0) {
        f.spyDd![t] = broad.basics.dd[i]!;
        f.relWeak20![t] = f.ret20![t]! - broad.basics.ret20[i]!;
      }
    }
  }

  // VIX, lagged one session.
  if (data.vix) {
    for (let t = 1; t < n; t++) {
      const previous = data.vix.get(bars.date[t - 1]!);

      if (previous !== undefined) {
        f.vixPrev![t] = previous;
        const older = t >= 6 ? data.vix.get(bars.date[t - 6]!) : undefined;

        f.vixChange5![t] = older !== undefined ? previous / older - 1 : NaN;
      }
    }
  }

  return { features: f, refs };
};

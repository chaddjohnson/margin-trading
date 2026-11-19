// Toy entry rules for the DEMO FIXTURE ONLY. They exist so that every demo event and every number in its trigger
// description is true of the synthetic price series. They are not strategy implementations or research candidates,
// they are never run on market data, and none of their parameters was tuned (the values are round illustrations).
// Real entry mechanisms are a later, separately authorised task (docs/research/growth-entry-discovery/PLAN.md).

import type { ParameterValue } from '../demo-schema/types.ts';
import { type Series, argExtreme, realizedVol, rollingStd, rsi, sma } from './indicators.ts';

export interface RuleContext {
  dates: string[];
  closes: number[];
  lows: number[];
  sma20: Series;
  sma50: Series;
  sma200: Series;
  std20: Series;
  rsi14: Series;
  vol20: Series;
}

export interface RawSignal {
  i: number;
  summary: string;
  values: ParameterValue[];
}

export interface DemoRule {
  id: string;
  code: string;
  name: string;
  family: string;
  summary: string;
  parameters: ParameterValue[];
  detect(ctx: RuleContext): RawSignal[];
}

export function buildContext(dates: string[], closes: number[], lows: number[]): RuleContext {
  return {
    dates,
    closes,
    lows,
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    std20: rollingStd(closes, 20),
    rsi14: rsi(closes, 14),
    vol20: realizedVol(closes, 20)
  };
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const pct = (x: number) => r2(x * 100);
const fmt = (x: number) => x.toFixed(2);
const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(2)}%`;

const pv = (key: string, label: string, value: number | string, unit: ParameterValue['unit']): ParameterValue => ({
  key,
  label,
  value,
  unit
});

const num = (s: Series, i: number) => s[i] as number;
const has = (...v: (number | undefined)[]) => v.every((x) => x !== undefined);

function reboundRule(id: string, code: string, lookback: number, threshold: number): DemoRule {
  return {
    id,
    code,
    name: `${threshold}% rebound from the ${lookback}-session low`,
    family: 'rebound',
    summary: `Close first rises at least ${threshold}% above the lowest close of the last ${lookback} sessions.`,
    parameters: [
      pv('lookback', 'Low lookback', lookback, 'sessions'),
      pv('threshold', 'Rebound', threshold, 'percent')
    ],
    detect({ closes, dates }) {
      const out: RawSignal[] = [];
      const cond = (i: number) => {
        const li = argExtreme(closes, i, lookback, 'min');
        return li !== undefined && (closes[i] as number) >= (closes[li] as number) * (1 + threshold / 100);
      };
      for (let i = lookback; i < closes.length; i++) {
        if (!cond(i) || cond(i - 1)) continue;
        const li = argExtreme(closes, i, lookback, 'min') as number;
        const low = closes[li] as number;
        const rise = pct((closes[i] as number) / low - 1);
        out.push({
          i,
          summary: `Close ${fmt(closes[i] as number)} is ${signed(rise)} above the ${lookback}-session low ${fmt(low)} (${dates[li]})`,
          values: [
            pv('low', `${lookback}-session low`, low, 'price'),
            pv('lowDate', 'Low date', dates[li] as string, 'date'),
            pv('rise', 'Rise from low', rise, 'percent'),
            pv('threshold', 'Threshold', threshold, 'percent'),
            pv('lookback', 'Lookback', lookback, 'sessions')
          ]
        });
      }
      return out;
    }
  };
}

const shallowPullback: DemoRule = {
  id: 'demo-shallow-pullback-2-4',
  code: 'V2',
  name: 'Shallow 2–4% pullback in an uptrend',
  family: 'pullback',
  summary: 'First close 2–4% below the 20-session high while above the 200-session average, 50 above 200.',
  parameters: [
    pv('band', 'Pullback band', '2–4 %', 'text'),
    pv('highLookback', 'High lookback', 20, 'sessions'),
    pv('trend', 'Trend filter', 'close > SMA200, SMA50 > SMA200', 'text')
  ],
  detect({ closes, dates, sma50, sma200 }) {
    const out: RawSignal[] = [];
    const dd = (i: number) => {
      const hi = argExtreme(closes, i, 20, 'max') as number;
      return { hi, dd: pct(1 - (closes[i] as number) / (closes[hi] as number)) };
    };
    for (let i = 200; i < closes.length; i++) {
      if (!has(sma50[i], sma200[i])) continue;
      const c = closes[i] as number;
      if (!(c > num(sma200, i) && num(sma50, i) > num(sma200, i))) continue;
      const now = dd(i);
      if (now.dd < 2 || now.dd > 4 || dd(i - 1).dd >= 2) continue;
      const high = closes[now.hi] as number;
      out.push({
        i,
        summary: `Close ${fmt(c)} is ${fmt(now.dd)}% below the 20-session high ${fmt(high)} (${dates[now.hi]}); SMA200 ${fmt(num(sma200, i))}`,
        values: [
          pv('pullback', 'Pullback from high', now.dd, 'percent'),
          pv('high', '20-session high', high, 'price'),
          pv('highDate', 'High date', dates[now.hi] as string, 'date'),
          pv('sma200', 'SMA200', r2(num(sma200, i)), 'price'),
          pv('sma50', 'SMA50', r2(num(sma50, i)), 'price')
        ]
      });
    }
    return out;
  }
};

const breakout: DemoRule = {
  id: 'demo-breakout-60-high',
  code: 'V3',
  name: 'Breakout above the prior 60-session high',
  family: 'breakout',
  summary: 'Close exceeds the highest close of the prior 60 sessions, set at least 10 sessions earlier (a base).',
  parameters: [pv('lookback', 'High lookback', 60, 'sessions'), pv('base', 'Minimum base', 10, 'sessions')],
  detect({ closes, dates }) {
    const out: RawSignal[] = [];
    for (let i = 61; i < closes.length; i++) {
      const prior = argExtreme(closes, i - 1, 60, 'max') as number;
      const high = closes[prior] as number;
      const c = closes[i] as number;
      const base = i - 1 - prior;
      if (!(c > high) || base < 10) continue;
      const by = pct(c / high - 1);
      out.push({
        i,
        summary: `Close ${fmt(c)} breaks the prior 60-session high ${fmt(high)} (${dates[prior]}, ${base} sessions earlier) by ${signed(by)}`,
        values: [
          pv('priorHigh', 'Prior 60-session high', high, 'price'),
          pv('priorHighDate', 'Prior high date', dates[prior] as string, 'date'),
          pv('base', 'Sessions since that high', base, 'sessions'),
          pv('breakout', 'Breakout margin', by, 'percent')
        ]
      });
    }
    return out;
  }
};

const goldenCross: DemoRule = {
  id: 'demo-ma-cross-50-200',
  code: 'V4',
  name: 'Moving-average crossover (50 over 200)',
  family: 'trend',
  summary: 'The 50-session simple average closes above the 200-session average after being at or below it.',
  parameters: [pv('fast', 'Fast average', 50, 'sessions'), pv('slow', 'Slow average', 200, 'sessions')],
  detect({ closes, sma50, sma200 }) {
    const out: RawSignal[] = [];
    for (let i = 200; i < closes.length; i++) {
      if (!has(sma50[i - 1], sma200[i - 1])) continue;
      if (!(num(sma50, i - 1) <= num(sma200, i - 1) && num(sma50, i) > num(sma200, i))) continue;
      out.push({
        i,
        summary: `SMA50 ${fmt(num(sma50, i))} crosses above SMA200 ${fmt(num(sma200, i))}`,
        values: [pv('sma50', 'SMA50', r2(num(sma50, i)), 'price'), pv('sma200', 'SMA200', r2(num(sma200, i)), 'price')]
      });
    }
    return out;
  }
};

const rsiReclaim: DemoRule = {
  id: 'demo-rsi-reclaim-50-trend',
  code: 'V5',
  name: 'Momentum + trend: RSI(14) reclaims 50',
  family: 'momentum',
  summary: 'RSI(14) closes back above 50 while the close is above the 200-session average.',
  parameters: [
    pv('rsi', 'RSI period', 14, 'sessions'),
    pv('level', 'RSI level', 50, 'index'),
    pv('trend', 'Trend', 200, 'sessions')
  ],
  detect({ closes, rsi14, sma200 }) {
    const out: RawSignal[] = [];
    for (let i = 200; i < closes.length; i++) {
      if (!has(rsi14[i - 1], rsi14[i], sma200[i])) continue;
      const c = closes[i] as number;
      if (!(num(rsi14, i - 1) < 50 && num(rsi14, i) >= 50 && c > num(sma200, i))) continue;
      out.push({
        i,
        summary: `RSI(14) rises from ${fmt(num(rsi14, i - 1))} to ${fmt(num(rsi14, i))}; close ${fmt(c)} above SMA200 ${fmt(num(sma200, i))}`,
        values: [
          pv('rsi', 'RSI(14)', r2(num(rsi14, i)), 'index'),
          pv('rsiPrev', 'RSI(14), prior session', r2(num(rsi14, i - 1)), 'index'),
          pv('sma200', 'SMA200', r2(num(sma200, i)), 'price')
        ]
      });
    }
    return out;
  }
};

const squeeze: DemoRule = {
  id: 'demo-volatility-squeeze-breakout',
  code: 'V6',
  name: 'Volatility squeeze, then a 20-session high',
  family: 'volatility',
  summary: 'A new 20-session closing high while 20-session volatility ranks in the lowest quartile of the past year.',
  parameters: [
    pv('volWindow', 'Volatility window', 20, 'sessions'),
    pv('rankWindow', 'Rank window', 250, 'sessions'),
    pv('maxRank', 'Maximum volatility rank', 25, 'percent'),
    pv('cooldown', 'Cooldown', 10, 'sessions')
  ],
  detect({ closes, dates, vol20 }) {
    const out: RawSignal[] = [];
    let last = -Infinity;
    for (let i = 271; i < closes.length; i++) {
      const v = num(vol20, i - 1);
      let below = 0;
      for (let k = i - 250; k < i; k++) if (num(vol20, k) <= v) below++;
      const rank = pct(below / 250);
      const prior = argExtreme(closes, i - 1, 20, 'max') as number;
      const c = closes[i] as number;
      if (rank > 25 || !(c > (closes[prior] as number)) || i - last < 10) continue;
      last = i;
      out.push({
        i,
        summary: `Close ${fmt(c)} tops the prior 20-session high ${fmt(closes[prior] as number)} (${dates[prior]}); volatility rank ${fmt(rank)}%`,
        values: [
          pv('volRank', 'Volatility rank (past 250)', rank, 'percent'),
          pv('dailyVol', '20-session daily volatility', pct(v), 'percent'),
          pv('priorHigh', 'Prior 20-session high', closes[prior] as number, 'price')
        ]
      });
    }
    return out;
  }
};

const retracement: DemoRule = {
  id: 'demo-half-retracement-after-drawdown',
  code: 'V7',
  name: 'Half retracement after an 8% drawdown',
  family: 'recovery',
  summary: 'After the close falls 8% below its 60-session high, it regains half of the decline.',
  parameters: [
    pv('lookback', 'High lookback', 60, 'sessions'),
    pv('drawdown', 'Arming drawdown', 8, 'percent'),
    pv('retrace', 'Retracement', 50, 'percent')
  ],
  detect({ closes, dates }) {
    const out: RawSignal[] = [];
    let armed = false;
    let peakIdx = -1;
    let troughIdx = -1;
    let lastPeakIdx = -1;
    for (let i = 60; i < closes.length; i++) {
      const hiIdx = argExtreme(closes, i, 60, 'max') as number;
      const c = closes[i] as number;
      if (!armed) {
        if (hiIdx !== lastPeakIdx && c <= (closes[hiIdx] as number) * 0.92) {
          armed = true;
          peakIdx = hiIdx;
          troughIdx = i;
        }
        continue;
      }
      if (c < (closes[troughIdx] as number)) troughIdx = i;
      const peak = closes[peakIdx] as number;
      const trough = closes[troughIdx] as number;
      if (c < trough + 0.5 * (peak - trough)) continue;
      out.push({
        i,
        summary: `Close ${fmt(c)} regains ${fmt(pct((c - trough) / (peak - trough)))}% of the fall from ${fmt(peak)} (${dates[peakIdx]}) to ${fmt(trough)} (${dates[troughIdx]})`,
        values: [
          pv('peak', 'Peak close', peak, 'price'),
          pv('peakDate', 'Peak date', dates[peakIdx] as string, 'date'),
          pv('trough', 'Trough close', trough, 'price'),
          pv('troughDate', 'Trough date', dates[troughIdx] as string, 'date'),
          pv('drawdown', 'Peak-to-trough decline', pct(1 - trough / peak), 'percent'),
          pv('retraced', 'Share of decline regained', pct((c - trough) / (peak - trough)), 'percent')
        ]
      });
      armed = false;
      lastPeakIdx = peakIdx;
    }
    return out;
  }
};

const smaBounce: DemoRule = {
  id: 'demo-sma50-bounce',
  code: 'V8',
  name: 'Bounce off a rising 50-session average',
  family: 'pullback',
  summary: 'A low within 1% of a rising SMA50 in the last 3 sessions, then an up close above it (50 above 200).',
  parameters: [
    pv('touch', 'Touch distance', 1, 'percent'),
    pv('touchWindow', 'Touch window', 3, 'sessions'),
    pv('cooldown', 'Cooldown', 10, 'sessions')
  ],
  detect({ closes, lows, dates, sma50, sma200 }) {
    const out: RawSignal[] = [];
    let last = -Infinity;
    for (let i = 210; i < closes.length; i++) {
      const c = closes[i] as number;
      const s50 = num(sma50, i);
      if (!(s50 > num(sma200, i) && s50 > num(sma50, i - 10))) continue;
      let touch = -1;
      for (let k = i - 3; k < i; k++) if ((lows[k] as number) <= num(sma50, k) * 1.01) touch = k;
      if (touch < 0 || !(c > (closes[i - 1] as number) && c > s50) || i - last < 10) continue;
      last = i;
      const dist = pct((lows[touch] as number) / num(sma50, touch) - 1);
      out.push({
        i,
        summary: `Up close ${fmt(c)} above SMA50 ${fmt(s50)} after the ${dates[touch]} low ${fmt(lows[touch] as number)} came within ${signed(dist)} of it`,
        values: [
          pv('sma50', 'SMA50', r2(s50), 'price'),
          pv('touchDate', 'Touch date', dates[touch] as string, 'date'),
          pv('touchLow', 'Touch low', lows[touch] as number, 'price'),
          pv('distance', 'Low vs SMA50', dist, 'percent')
        ]
      });
    }
    return out;
  }
};

const dualMomentum: DemoRule = {
  id: 'demo-dual-momentum-turn',
  code: 'V9',
  name: 'Dual momentum turn (21 within 126)',
  family: 'momentum',
  summary: 'The 21-session return turns positive while the 126-session return is positive.',
  parameters: [pv('short', 'Short window', 21, 'sessions'), pv('long', 'Long window', 126, 'sessions')],
  detect({ closes }) {
    const out: RawSignal[] = [];
    const ret = (i: number, n: number) => (closes[i] as number) / (closes[i - n] as number) - 1;
    for (let i = 127; i < closes.length; i++) {
      if (!(ret(i - 1, 21) <= 0 && ret(i, 21) > 0 && ret(i, 126) > 0)) continue;
      out.push({
        i,
        summary: `21-session return turns ${signed(pct(ret(i, 21)))} with the 126-session return at ${signed(pct(ret(i, 126)))}`,
        values: [
          pv('r21', '21-session return', pct(ret(i, 21)), 'percent'),
          pv('r126', '126-session return', pct(ret(i, 126)), 'percent')
        ]
      });
    }
    return out;
  }
};

const thrust: DemoRule = {
  id: 'demo-thrust-day',
  code: 'V10',
  name: 'Thrust day above the 50-session average',
  family: 'momentum',
  summary: 'A daily gain of at least 2% that closes above the 50-session average.',
  parameters: [pv('gain', 'Daily gain', 2, 'percent'), pv('cooldown', 'Cooldown', 5, 'sessions')],
  detect({ closes, sma50 }) {
    const out: RawSignal[] = [];
    let last = -Infinity;
    for (let i = 50; i < closes.length; i++) {
      const c = closes[i] as number;
      const g = pct(c / (closes[i - 1] as number) - 1);
      if (g < 2 || !(c > num(sma50, i)) || i - last < 5) continue;
      last = i;
      out.push({
        i,
        summary: `Daily gain ${signed(g)} to ${fmt(c)}, above SMA50 ${fmt(num(sma50, i))}`,
        values: [pv('gain', 'Daily gain', g, 'percent'), pv('sma50', 'SMA50', r2(num(sma50, i)), 'price')]
      });
    }
    return out;
  }
};

const bandReclaim: DemoRule = {
  id: 'demo-lower-band-reclaim',
  code: 'V11',
  name: 'Lower-band reclaim in a rising trend',
  family: 'mean-reversion',
  summary: 'Close returns above the lower Bollinger band (20, 2σ) while the 200-session average is rising.',
  parameters: [
    pv('window', 'Band window', 20, 'sessions'),
    pv('width', 'Band width', 2, 'ratio'),
    pv('slope', 'SMA200 slope window', 20, 'sessions')
  ],
  detect({ closes, sma20, std20, sma200 }) {
    const out: RawSignal[] = [];
    const lower = (i: number) => num(sma20, i) - 2 * num(std20, i);
    for (let i = 220; i < closes.length; i++) {
      const c = closes[i] as number;
      if (!((closes[i - 1] as number) < lower(i - 1) && c >= lower(i) && num(sma200, i) > num(sma200, i - 20)))
        continue;
      out.push({
        i,
        summary: `Close ${fmt(c)} back above the lower band ${fmt(lower(i))} (prior close ${fmt(closes[i - 1] as number)} was below ${fmt(lower(i - 1))})`,
        values: [
          pv('lowerBand', 'Lower band', r2(lower(i)), 'price'),
          pv('sma20', 'SMA20', r2(num(sma20, i)), 'price'),
          pv('sma200', 'SMA200', r2(num(sma200, i)), 'price')
        ]
      });
    }
    return out;
  }
};

export const DEMO_RULES: DemoRule[] = [
  reboundRule('demo-rebound-5-from-20-low', 'V1', 20, 5),
  shallowPullback,
  breakout,
  goldenCross,
  rsiReclaim,
  squeeze,
  retracement,
  smaBounce,
  dualMomentum,
  thrust,
  bandReclaim,
  reboundRule('demo-rebound-10-from-60-low', 'V12', 60, 10)
];

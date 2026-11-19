// D9 (amendment A2): the VGT and GDX price regimes of each training window and slice, from the engine's own session
// closes of door D24 (development data only). Report-only: total return, maximum close-to-close drawdown (peak, trough,
// duration), the worst 15- and 30-calendar-day declines (the exposure window of a D1 lot held to its maximum hold),
// distinct peak-to-trough declines of at least 15% and 20%, and the share of sessions below the 200-session SMA.
import path from 'node:path';
import { openPrefixDoor } from '../../src/vg-d1-growth-joint/data.ts';
import { logDoor, r2, resultsDir, sealJson } from './common.ts';

const door = await openPrefixDoor('D24', 'wfd D9 regimes', true);

logDoor('D24', 'D9 market-regime description (session closes only; development door)', {
  GDX: door.sym.GDX.dataSha256,
  VGT: door.sym.VGT.dataSha256
});

const windows = [
  { name: 'C19 training 2016–2019', from: '2016-01-04', to: '2019-12-31' },
  { name: 'C19 slice 2020–2021', from: '2020-01-02', to: '2021-12-31' },
  { name: 'C21 training 2016–2021', from: '2016-01-04', to: '2021-12-31' },
  { name: 'C21 slice 2022–2023', from: '2022-01-03', to: '2023-12-29' },
  { name: 'C23 training 2016–2023', from: '2016-01-04', to: '2023-12-29' },
  { name: 'C23 slice 2024', from: '2024-01-02', to: '2024-12-31' }
];
const pct = (x: number) => r2(100 * x);

// distinct declines: from a running high, a decline of at least `th` is counted once until a new high is made
const distinctDeclines = (c: number[], th: number) => {
  let hi = c[0]!;
  let lo = c[0]!;
  let n = 0;
  let counted = false;

  for (const x of c) {
    if (x > hi) {
      hi = x;
      lo = x;
      counted = false;
    } else if (x < lo) {
      lo = x;
      if (!counted && 1 - lo / hi >= th) {
        n++;
        counted = true;
      }
    }
  }
  return n;
};

const out = ['VGT', 'GDX'].flatMap((sym) => {
  const ds = door.sym[sym as 'VGT' | 'GDX'].ds;
  const closes = Array.from(ds.sClose as Float64Array);
  const dates = door.dates;
  const t = dates.map((d) => Date.parse(`${d}T00:00:00Z`) / 86400000);
  const sma200 = closes.map((_, i) => (i >= 199 ? closes.slice(i - 199, i + 1).reduce((a, b) => a + b, 0) / 200 : Number.NaN));

  return windows.map((w) => {
    const i0 = dates.indexOf(w.from);
    const i1 = dates.indexOf(w.to);

    if (i0 < 0 || i1 < 0) throw new Error(`${w.from} or ${w.to} is not a session of D24`);

    const c = closes.slice(i0, i1 + 1);
    let peak = c[0]!;
    let peakI = 0;
    let mdd = 0;
    let mddPeak = 0;
    let mddTrough = 0;

    c.forEach((x, k) => {
      if (x > peak) {
        peak = x;
        peakI = k;
      }
      if (1 - x / peak > mdd) {
        mdd = 1 - x / peak;
        mddPeak = peakI;
        mddTrough = k;
      }
    });

    // worst decline over any window of ≤ N calendar days (close at day d versus every close within the previous N days)
    const worstOver = (n: number) => {
      let worst = 0;
      let at = '';

      for (let k = i0; k <= i1; k++)
        for (let j = k - 1; j >= Math.max(0, i0 - 0) && t[k]! - t[j]! <= n; j--) {
          const dd = 1 - closes[k]! / closes[j]!;

          if (dd > worst) {
            worst = dd;
            at = `${dates[j]} → ${dates[k]}`;
          }
        }
      return { decline: pct(worst), window: at };
    };
    const below = c.filter((x, k) => Number.isFinite(sma200[i0 + k]!) && x < sma200[i0 + k]!).length;
    const withSma = c.filter((_, k) => Number.isFinite(sma200[i0 + k]!)).length;

    return {
      symbol: sym,
      window: w.name,
      sessions: c.length,
      totalReturnPct: pct(c.at(-1)! / c[0]! - 1),
      maxDrawdownPct: pct(mdd),
      maxDrawdownPeak: dates[i0 + mddPeak],
      maxDrawdownTrough: dates[i0 + mddTrough],
      maxDrawdownSessions: mddTrough - mddPeak,
      worst15CalendarDays: worstOver(15),
      worst30CalendarDays: worstOver(30),
      distinctDeclines15: distinctDeclines(c, 0.15),
      distinctDeclines20: distinctDeclines(c, 0.2),
      belowSma200Pct: withSma ? pct(below / withSma) : null
    };
  });
});

sealJson(path.join(resultsDir, 'regimes', 'regimes.json'), { stage: 'D9 market regimes (data only)', rows: out, finished: new Date().toISOString() }, 'D9 regimes');
for (const x of out)
  console.log(
    `${x.symbol} ${x.window}: ret ${x.totalReturnPct}%, maxDD ${x.maxDrawdownPct}% (${x.maxDrawdownPeak}→${x.maxDrawdownTrough}, ${x.maxDrawdownSessions} s), worst15d ${x.worst15CalendarDays.decline}% (${x.worst15CalendarDays.window}), worst30d ${x.worst30CalendarDays.decline}%, declines≥15% ${x.distinctDeclines15}, ≥20% ${x.distinctDeclines20}, <SMA200 ${x.belowSma200Pct}%`
  );

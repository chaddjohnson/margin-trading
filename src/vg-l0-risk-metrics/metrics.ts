// Pure risk metrics on the engine-independent ledger (ledger.ts). Definitions: METRIC_SPECIFICATION.md. Nothing here
// reads data, the engine or the clock; every function is deterministic and side-effect free.
//
// The three risk dimensions are kept apart:
//   (1) marked-equity drawdown — the conventional maximum minute drawdown of the marked net (strict tracker, peak 0 at
//       the start), its liquidation-equivalent twin, and the per-lot attribution of a drawdown window;
//   (2) principal loss — per trade (below that trade's funded principal) and per account (below the starting capital,
//       below the banked high-water mark, realized-equity drawdown and loss clusters);
//   (3) profit giveback — per trade (declines of open profit while above break-even) and per portfolio drawdown window.
// Margin-liquidation risk is a separate, account-level model (margin.ts) and never inferred from these.
import type { Ledger, LotLedger, PathPoint } from './ledger.ts';

const pos = (x: number) => (x > 0 ? x : 0);
const neg = (x: number) => (x < 0 ? -x : 0); // the magnitude below zero
const dateOf = (t: number) => (Number.isFinite(t) ? new Date(t * 1000).toISOString().slice(0, 10) : null);

// ----- the portfolio path -----

// Rebuild the marked net M, its liquidation-equivalent twin and the realized ("banked") net R at every marking instant
// from the lots (one funded slot). A closed lot adds a point at its final exit instant (M = R = the realized net).
export const portfolioPath = (L: Ledger): PathPoint[] => {
  const out: PathPoint[] = [{ t: L.startT, date: dateOf(L.startT)!, m: 0, liq: 0, r: 0, lot: null }];
  let before = 0; // realized net of every earlier lot
  let lastT = L.startT;

  L.lots.forEach((lot, i) => {
    if (lot.marks.length && lot.marks[0]!.t < lastT) throw new Error(`lot ${lot.id} starts before the previous lot ended (one slot)`);
    for (const k of lot.marks) {
      out.push({ t: k.t, date: k.date, m: before + k.pnl, liq: before + k.liq, r: before + k.realized, lot: i });
      lastT = k.t;
    }
    if (!lot.open) {
      const f = lot.fills.at(-1)!;

      if (f.t < lastT) throw new Error(`lot ${lot.id}: its exit precedes its last mark`);
      before += lot.net;
      out.push({ t: f.t, date: f.date, m: before, liq: before, r: before, lot: null });
      lastT = f.t;
    } else if (i !== L.lots.length - 1) throw new Error(`lot ${lot.id} is open but not the last lot`);
  });
  return out;
};

// ----- drawdowns (the engine's strict tracker semantics: a new peak only when strictly higher; the first time the
// maximum is reached is the trough; recovery = the first later value ≥ the peak value) -----

export interface Drawdown {
  max: number;
  peakT: number;
  troughT: number;
  recoveryT: number; // NaN when not recovered by the window's end
  peakValue: number;
  troughValue: number;
  peakDate: string | null;
  troughDate: string | null;
  recoveryDate: string | null;
}

export const strictDrawdown = (values: readonly { t: number; v: number }[], start = 0, startT = values[0]?.t ?? 0): Drawdown => {
  let peak = start;
  let peakT = startT;
  let max = 0;
  let ddPeakT = startT;
  let troughT = startT;
  let peakValue = start;
  let troughValue = start;
  let recoveryT = NaN;
  let recovering = false;

  for (const { t, v } of values) {
    if (v > peak) {
      if (recovering && v >= peakValue) {
        recoveryT = t;
        recovering = false;
      }
      peak = v;
      peakT = t;
    }
    if (peak - v > max) {
      max = peak - v;
      ddPeakT = peakT;
      troughT = t;
      peakValue = peak;
      troughValue = v;
      recoveryT = NaN;
      recovering = true;
    }
  }
  // a recovery at exactly the peak value on a later equal (not strictly higher) value
  if (recovering) {
    const after = values.find((x) => x.t > troughT && x.v >= peakValue);

    if (after) recoveryT = after.t;
  }

  return { max, peakT: ddPeakT, troughT, recoveryT, peakValue, troughValue, peakDate: dateOf(ddPeakT), troughDate: dateOf(troughT), recoveryDate: dateOf(recoveryT) };
};

export type Basis = 'marked' | 'liquidation';
const valueOf = (basis: Basis) => (p: PathPoint) => (basis === 'marked' ? p.m : p.liq);

// The points of a window (from, to] in time, with the window's starting value (the last point at or before `from`).
export const windowOf = (pts: readonly PathPoint[], fromT: number, toT: number) => {
  let start = pts[0]!;

  for (const p of pts) if (p.t <= fromT) start = p;
  return { start, points: pts.filter((p) => p.t > fromT && p.t <= toT) };
};

// The conventional marked drawdown (basis 'marked') and its liquidation twin over a window; the peak at the window's
// start is the value at its first instant (a reset drawdown when fromT is a boundary close; the whole-run drawdown when
// fromT precedes the first point, whose value is 0).
export const markedDrawdown = (pts: readonly PathPoint[], basis: Basis = 'marked', fromT = -Infinity, toT = Infinity) => {
  const w = windowOf(pts, fromT, toT);
  const f = valueOf(basis);
  const series = (fromT === -Infinity ? pts : [w.start, ...w.points]).map((p) => ({ t: p.t, v: f(p) }));

  return strictDrawdown(series, series[0]?.v ?? 0, series[0]?.t ?? 0);
};

// Realized-equity drawdown: the strict drawdown of the banked net R (it changes only at fills), with the banked
// high-water mark starting at the window's starting R. Carried open lots contribute nothing until they fill.
export const realizedDrawdown = (pts: readonly PathPoint[], fromT = -Infinity, toT = Infinity) => {
  const w = windowOf(pts, fromT, toT);
  const all = fromT === -Infinity ? pts : [w.start, ...w.points];
  const series: { t: number; v: number }[] = [];

  for (const p of all) if (!series.length || series.at(-1)!.v !== p.r) series.push({ t: p.t, v: p.r });
  return strictDrawdown(series, series[0]?.v ?? 0, series[0]?.t ?? 0);
};

// Banked-capital drawdown: the largest shortfall of the marked (or liquidation) net below the banked high-water mark
// H_R(t) = max(start, max_{u ≤ t} R(u)), where start = 0 for the whole run (the starting capital) or the window's starting
// R. It counts realized erosion and open losses below what had been banked; it never counts a decline of profit that
// was never banked.
export const bankedDrawdown = (pts: readonly PathPoint[], basis: Basis = 'marked', fromT = -Infinity, toT = Infinity) => {
  const w = windowOf(pts, fromT, toT);
  const all = fromT === -Infinity ? pts : [w.start, ...w.points];
  const f = valueOf(basis);
  let h = fromT === -Infinity ? 0 : all[0]!.r;
  let hT = all[0]?.t ?? 0;
  let best = { max: 0, highT: hT, high: h, troughT: hT, troughValue: f(all[0]!) };

  for (const p of all) {
    if (p.r > h) {
      h = p.r;
      hT = p.t;
    }

    const d = h - f(p);

    if (d > best.max) best = { max: d, highT: hT, high: h, troughT: p.t, troughValue: f(p) };
  }
  return { ...best, highDate: dateOf(best.highT), troughDate: dateOf(best.troughT) };
};

// Starting-capital floor shortfall: the deepest marked (or liquidation) net below zero, i.e. account equity below its
// starting capital C0 for any C0 (no contributions or withdrawals exist in the ledger: equity − C0 = the net).
export const floorShortfall = (pts: readonly PathPoint[], basis: Basis = 'marked', fromT = -Infinity, toT = Infinity, floor = 0) => {
  const f = valueOf(basis);
  let worst = { shortfall: 0, t: NaN, value: floor };

  for (const p of pts) {
    if (p.t <= fromT || p.t > toT) continue;

    const s = floor - f(p);

    if (s > worst.shortfall) worst = { shortfall: s, t: p.t, value: f(p) };
  }
  return { ...worst, date: dateOf(worst.t) };
};

// ----- per-lot values and the exact attribution of a drawdown window -----

// The lot's own P&L at instant t: 0 before its first mark (entry), its realized net at or after its final exit, else the
// last mark at or before t.
export const lotValueAt = (lot: LotLedger, t: number, basis: Basis = 'marked'): number => {
  if (!lot.marks.length || t < lot.marks[0]!.t) return 0;
  if (!lot.open && t >= lot.fills.at(-1)!.t) return lot.net;

  let lo = 0;
  let hi = lot.marks.length - 1;

  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;

    if (lot.marks[mid]!.t <= t) lo = mid;
    else hi = mid - 1;
  }

  const k = lot.marks[lo]!;

  return basis === 'marked' ? k.pnl : k.liq;
};

export interface LotAttribution {
  lot: number; // lot id
  book: string;
  entry: string;
  exit: string | null;
  role: 'open at peak' | 'entered in window' | 'open at peak and trough' | 'closed before peak' | 'after trough';
  atPeak: number;
  atTrough: number;
  contribution: number; // atPeak − atTrough (positive = it deepened the drawdown)
  profitGiveback: number; // the decline of its positive part: max(atPeak, 0) − max(atTrough, 0)
  principalLoss: number; // the growth of its negative part: max(−atTrough, 0) − max(−atPeak, 0)
}

// EXACT ATTRIBUTION of a drawdown window [peakT, troughT] on the marked path: with one funded slot,
// M(t) = Σ_lots P_lot(t), hence DD = M(peak) − M(trough) = Σ_lots [P_lot(peak) − P_lot(trough)], and each lot's term
// splits exactly into the change of its positive part (profit given back above its break-even, or — when negative — open
// profit gained) and the change of its negative part (loss below its funded principal, or — when negative — recovered).
// Interest and costs sit inside each lot's P&L. The residual (DD − Σ) is reported and is floating-point only.
export const attributeDrawdown = (L: Ledger, peakT: number, troughT: number, basis: Basis = 'marked') => {
  const rows: LotAttribution[] = [];
  let peakM = 0;
  let troughM = 0;

  for (const lot of L.lots) {
    const a = lotValueAt(lot, peakT, basis);
    const b = lotValueAt(lot, troughT, basis);

    peakM += a;
    troughM += b;
    if (a === b) continue;

    const entryT = lot.marks[0]?.t ?? Infinity;
    const exitT = lot.open ? Infinity : lot.fills.at(-1)!.t;
    const role: LotAttribution['role'] =
      exitT <= peakT ? 'closed before peak' : entryT > troughT ? 'after trough' : entryT <= peakT ? (exitT > troughT ? 'open at peak and trough' : 'open at peak') : 'entered in window';

    rows.push({
      lot: lot.id,
      book: lot.book,
      entry: lot.entryDate,
      exit: lot.open ? null : lot.fills.at(-1)!.date,
      role,
      atPeak: a,
      atTrough: b,
      contribution: a - b,
      profitGiveback: pos(a) - pos(b),
      principalLoss: neg(b) - neg(a)
    });
  }

  const sum = (f: (r: LotAttribution) => number) => rows.reduce((s, r) => s + f(r), 0);
  const total = peakM - troughM;
  const giveback = sum((r) => r.profitGiveback);
  const principal = sum((r) => r.principalLoss);

  return {
    peakT,
    troughT,
    peakDate: dateOf(peakT),
    troughDate: dateOf(troughT),
    total,
    // the two exact parts (they may contain offsets: a lot that gained in the window has a negative giveback term)
    profitGiveback: giveback,
    principalLoss: principal,
    // the gross view: given-back open profit of lots open at the peak; losses below principal; offsets from window gains
    grossGivebackAtPeakLots: sum((r) => (r.role.startsWith('open at peak') ? pos(r.profitGiveback) : 0)),
    grossPrincipalLoss: sum((r) => pos(r.principalLoss)),
    offsets: -sum((r) => Math.min(0, r.profitGiveback) + Math.min(0, r.principalLoss)),
    residual: total - (giveback + principal),
    rows
  };
};

// ----- per-trade risk -----

export interface TradeRisk {
  id: number;
  book: string;
  entry: string;
  exit: string | null;
  reason: string;
  open: boolean;
  days: number; // calendar days from the entry session to the exit (or ledger end)
  principal0: number;
  net: number;
  netPctOfPrincipal: number;
  entryCost: number; // shares0 × (entryPrice − entryRaw)
  // principal loss: the deepest value of the lot's own P&L below zero (below its funded principal), intratrade
  // (every mark) and at the realized exit; 0 when the lot never fell below its principal
  principalLossMarked: number;
  principalLossLiq: number;
  principalLossPct: number; // principalLossLiq ÷ principal0
  principalLossDate: string | null;
  realizedPrincipalLoss: number | null; // max(0, −net) of a closed lot
  canonicalMae: number | null; // the engine's published MAE (min of the lowest mark and the final net; not floored)
  // profit and giveback (marked basis unless stated)
  peakProfit: number; // max(0, the highest lot P&L)
  peakProfitLiq: number;
  peakDate: string | null;
  maxGivebackAboveBreakeven: number; // the largest decline of the positive part from its running maximum
  maxDeclineFromPeak: number; // the largest decline of the lot P&L from its running maximum (total)
  declineAboveBreakeven: number; // that decline's part above break-even …
  declineBelowBreakeven: number; // … and below it (the same quantity as principal loss, never added to giveback)
  givebackToExit: number | null; // closed lots: max(0, peakProfit − max(0, net))
  givebackShareOfPeak: number | null; // maxGivebackAboveBreakeven ÷ peakProfit (null when peakProfit = 0)
}

export const tradeRisk = (lot: LotLedger, endT: number): TradeRisk => {
  const series = lot.marks.map((k) => ({ t: k.t, pnl: k.pnl, liq: k.liq }));

  if (!lot.open) {
    const f = lot.fills.at(-1)!;

    series.push({ t: f.t, pnl: lot.net, liq: lot.net });
  }

  let worstM = 0;
  let worstL = 0;
  let worstT = NaN;
  let peak = 0;
  let peakL = 0;
  let peakT = NaN;
  let runMax = -Infinity;
  let runPosMax = 0;
  let gb = 0;
  let decline = { d: 0, from: 0, to: 0 };

  for (const x of series) {
    if (x.pnl < worstM) worstM = x.pnl;
    if (x.liq < worstL) {
      worstL = x.liq;
      worstT = x.t;
    }
    if (x.pnl > peak) {
      peak = x.pnl;
      peakT = x.t;
    }
    if (x.liq > peakL) peakL = x.liq;
    if (x.pnl > runMax) runMax = x.pnl;
    if (runMax - x.pnl > decline.d) decline = { d: runMax - x.pnl, from: runMax, to: x.pnl };
    if (pos(x.pnl) > runPosMax) runPosMax = pos(x.pnl);
    if (runPosMax - pos(x.pnl) > gb) gb = runPosMax - pos(x.pnl);
  }

  return {
    id: lot.id,
    book: lot.book,
    entry: lot.entryDate,
    exit: lot.open ? null : lot.fills.at(-1)!.date,
    reason: lot.open ? 'open' : lot.fills.at(-1)!.reason,
    open: lot.open,
    days: (Date.parse(`${lot.open ? dateOf(endT) : lot.fills.at(-1)!.date}T00:00:00Z`) - Date.parse(`${lot.entryDate}T00:00:00Z`)) / 86_400_000,
    principal0: lot.principal0,
    net: lot.net,
    netPctOfPrincipal: lot.net / lot.principal0,
    entryCost: lot.shares0 * (lot.entryPrice - lot.entryRaw),
    principalLossMarked: neg(worstM),
    principalLossLiq: neg(worstL),
    principalLossPct: neg(worstL) / lot.principal0,
    principalLossDate: worstL < 0 ? dateOf(worstT) : null,
    realizedPrincipalLoss: lot.open ? null : neg(lot.net),
    canonicalMae: lot.canonicalMae,
    peakProfit: peak,
    peakProfitLiq: peakL,
    peakDate: peak > 0 ? dateOf(peakT) : null,
    maxGivebackAboveBreakeven: gb,
    maxDeclineFromPeak: decline.d,
    declineAboveBreakeven: pos(decline.from) - pos(decline.to),
    declineBelowBreakeven: neg(decline.to) - neg(decline.from),
    givebackToExit: lot.open ? null : pos(peak - pos(lot.net)),
    givebackShareOfPeak: peak > 0 ? gb / peak : null
  };
};

// ----- realized loss clusters (declining episodes of the banked net, intervening profits netted) -----

export interface RealizedEpisode {
  highDate: string; // the exit that set the banked high-water mark
  troughDate: string;
  recoveryDate: string | null; // the first exit regaining the high-water mark (null: not regained by the end)
  depth: number; // high − the lowest banked net in the episode
  lots: number; // lots closed from the high to the trough
  losing: number;
  grossLosses: number; // Σ of losing lots' nets (≤ 0) closed in that span
  grossWins: number; // Σ of winning lots' nets closed in that span (the intervening profits)
  worstLot: number; // the worst closed-lot net in the span
  worstPrincipalLoss: number; // the deepest intratrade principal loss (liquidation) of those lots
  calendarDays: number; // high → trough
  fundedDays: number; // Σ of those lots' holding days
}

export const realizedEpisodes = (L: Ledger): RealizedEpisode[] => {
  const closed = L.lots.filter((l) => !l.open);
  const out: RealizedEpisode[] = [];
  let r = 0;
  let high = 0; // the starting capital is the first high-water mark
  let highDate = L.lots[0]?.entryDate ?? L.endDate;
  let ep: { all: LotLedger[]; low: number; lowDate: string; lowIdx: number } | null = null;
  const finish = (e: NonNullable<typeof ep>, recoveryDate: string | null) => {
    const span = e.all.slice(0, e.lowIdx);
    const risks = span.map((l) => tradeRisk(l, L.endT));

    out.push({
      highDate,
      troughDate: e.lowDate,
      recoveryDate,
      depth: high - e.low,
      lots: span.length,
      losing: span.filter((l) => l.net < 0).length,
      grossLosses: span.filter((l) => l.net < 0).reduce((s, l) => s + l.net, 0),
      grossWins: span.filter((l) => l.net > 0).reduce((s, l) => s + l.net, 0),
      worstLot: Math.min(0, ...span.map((l) => l.net)),
      worstPrincipalLoss: Math.max(0, ...risks.map((x) => x.principalLossLiq)),
      calendarDays: (Date.parse(`${e.lowDate}T00:00:00Z`) - Date.parse(`${highDate}T00:00:00Z`)) / 86_400_000,
      fundedDays: risks.reduce((s, x) => s + x.days, 0)
    });
  };

  for (const l of closed) {
    r += l.net;

    const d = l.fills.at(-1)!.date;

    if (ep) {
      ep.all.push(l);
      if (r < ep.low) {
        ep.low = r;
        ep.lowDate = d;
        ep.lowIdx = ep.all.length;
      }
      if (r >= high) {
        finish(ep, d);
        ep = null;
        high = r;
        highDate = d;
      }
    } else if (r < high) ep = { all: [l], low: r, lowDate: d, lowIdx: 1 };
    else {
      high = r;
      highDate = d;
    }
  }
  if (ep) finish(ep, null);
  return out.sort((a, b) => b.depth - a.depth);
};

// The longest run of consecutive losing closed lots and the run with the largest summed loss.
export const losingStreaks = (L: Ledger) => {
  const closed = L.lots.filter((l) => !l.open);
  let longest = { n: 0, sum: 0, from: '', to: '' };
  let deepest = { n: 0, sum: 0, from: '', to: '' };
  let run = { n: 0, sum: 0, from: '', to: '' };

  for (const l of closed) {
    if (l.net < 0) {
      run = run.n ? { ...run, n: run.n + 1, sum: run.sum + l.net, to: l.fills.at(-1)!.date } : { n: 1, sum: l.net, from: l.entryDate, to: l.fills.at(-1)!.date };
      if (run.n > longest.n) longest = { ...run };
      if (run.sum < deepest.sum) deepest = { ...run };
    } else run = { n: 0, sum: 0, from: '', to: '' };
  }
  return { longest, deepest };
};

// ----- open exposure at an instant (the §5.9 items, kept for the cutoff tables) -----

export const openLotAt = (L: Ledger, t: number) => {
  const lot = L.lots.find((l) => l.marks.length && l.marks[0]!.t <= t && (l.open || l.fills.at(-1)!.t > t));

  if (!lot) return null;

  let k = lot.marks[0]!;

  for (const x of lot.marks) if (x.t <= t) k = x;
  return { lot, mark: k, multiple: (k.shares * k.price) / lot.principal0 };
};

export const quantileSorted = (sorted: readonly number[], q: number) => {
  if (!sorted.length) return NaN;

  const h = (sorted.length - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);

  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!);
};

// Distribution summary: p50/p90/p95 (linear interpolation, the studies' convention), worst, worst-10% mean (k = ⌈0.1 n⌉
// largest), for a "larger is worse" quantity.
export const tail = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const k = Math.ceil(0.1 * s.length);

  return {
    n: s.length,
    median: quantileSorted(s, 0.5),
    p90: quantileSorted(s, 0.9),
    p95: quantileSorted(s, 0.95),
    worst: s.at(-1) ?? NaN,
    worst10Mean: k ? s.slice(-k).reduce((a, b) => a + b, 0) / k : NaN
  };
};

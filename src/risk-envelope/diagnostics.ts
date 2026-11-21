// risk-envelope: the NONBINDING alternative drawdown-policy diagnostics of the risk-envelope pilot (brief Phase D;
// research/vg-l0-risk-envelope-pilot/DIAGNOSTICS_SPEC.md). Pure functions over the portfolio path rebuilt by
// src/vg-l0-risk-metrics/metrics.ts portfolioPath (M = marked net, liq = liquidation net, R = banked net, one funded
// slot, no capital flows). They never enter a search, a gate, a ranking or an exit: they are computed on frozen candidate
// populations and reported beside the primary envelope.
//
//   D1 peak-equity drawdown   equity E(t) = C0 + v(t); peak Ep(t) = the running maximum of E (strict: it moves only to a
//                             strictly higher value; Ep(start) = C0 because v = 0 at the first instant); the metric is
//                             max_t [Ep(t) − E(t)] ÷ Ep(t) — the largest decline as a share of the equity peak it fell
//                             from (a maximum of ratios, NOT the dollar maximum ÷ some peak). Ep ≥ C0 > 0, so it is
//                             always defined. Banked profits stay in the account (no withdrawals), so they raise Ep.
//   D2 capped hybrid          allowance(t) = min(cap × C0, max(floor × C0, slope × Ep(t))); the metric is the largest
//                             utilization max_t [Ep(t) − E(t)] ÷ allowance(t) (≤ 1 passes). Coefficients in whole percent
//                             (illustrative 40 / 30 / 60, NOT approved thresholds). Regimes: Ep ≤ (floor ÷ slope) C0 →
//                             the floor; Ep ≥ (cap ÷ slope) C0 → the cap; between → slope × Ep.
//   D3 component partition    at the conventional maximum drawdown's window [t_p, t_t] (the strict tracker's peak and
//                             first trough), with Mp = v(t_p), Mt = v(t_t) and the banked high H = max(0, max_{u ≤ t_t}
//                             R(u)), the decline [Mt, Mp] is cut at the levels H and 0 (the starting capital) into three
//                             disjoint intervals that add up to the drawdown exactly:
//                               U unbanked-profit giveback   max(0, Mp − max(H, Mt))     (profit never banked, given back)
//                               E banked-profit erosion      max(0, min(Mp, H) − max(0, Mt))
//                               F starting-capital loss      max(0, min(Mp, 0) − Mt)      (equity below C0)
//                             plus, from the lot ledger, the exact LOT-level split of the same window
//                             (metrics.ts attributeDrawdown: giveback above each lot's break-even vs loss below each
//                             lot's funded principal). The two lenses answer different questions and are never added
//                             or subtracted from each other: a lot can be below its own principal while the account is
//                             still above its banked high minus that loss (the loss then shows up as E, not F).
import type { Ledger, PathPoint } from '../vg-l0-risk-metrics/ledger.ts';
import { type Basis, attributeDrawdown, bankedDrawdown, markedDrawdown } from '../vg-l0-risk-metrics/metrics.ts';
import { limitOf } from './policy.ts';

const valueOf = (basis: Basis) => (p: PathPoint) => (basis === 'marked' ? p.m : p.liq);
const dateOf = (t: number) => (Number.isFinite(t) ? new Date(t * 1000).toISOString().slice(0, 10) : null);

const requirePath = (pts: readonly PathPoint[], c0: number) => {
  if (!pts.length) throw new Error('an empty portfolio path');
  if (!(Number.isFinite(c0) && c0 > 0)) throw new Error(`initial allocation ${c0} must be > 0`);
  for (const p of pts)
    if (![p.m, p.liq, p.r].every(Number.isFinite)) throw new Error(`a non-finite path value at ${p.date}`);
};

// D1
export const peakEquityDrawdown = (pts: readonly PathPoint[], c0: number, basis: Basis = 'marked') => {
  requirePath(pts, c0);

  const f = valueOf(basis);
  let peak = c0 + f(pts[0]!);
  let peakT = pts[0]!.t;
  let best = { pct: 0, dollars: 0, peakEquity: peak, peakT, troughT: pts[0]!.t };

  for (const p of pts) {
    const e = c0 + f(p);

    if (e > peak) {
      peak = e;
      peakT = p.t;
    }

    const pct = (peak - e) / peak;

    if (pct > best.pct) best = { pct, dollars: peak - e, peakEquity: peak, peakT, troughT: p.t };
  }
  return { basis, c0, ...best, peakDate: dateOf(best.peakT), troughDate: dateOf(best.troughT) };
};

// D2
export interface HybridCoefficients {
  floorPct: number;
  slopePct: number;
  capPct: number;
}

export const ILLUSTRATIVE_HYBRID: HybridCoefficients = { floorPct: 40, slopePct: 30, capPct: 60 };

export const hybridAllowance = (peakEquity: number, c0: number, k: HybridCoefficients) => {
  if (k.floorPct > k.capPct) throw new Error('the hybrid floor exceeds its cap');
  return Math.min(limitOf(k.capPct, c0), Math.max(limitOf(k.floorPct, c0), (peakEquity * k.slopePct) / 100));
};

export const cappedHybrid = (
  pts: readonly PathPoint[],
  c0: number,
  k: HybridCoefficients = ILLUSTRATIVE_HYBRID,
  basis: Basis = 'marked'
) => {
  requirePath(pts, c0);

  const f = valueOf(basis);
  let peak = c0 + f(pts[0]!);
  let peakT = pts[0]!.t;
  let best = {
    utilization: 0,
    dollars: 0,
    allowance: hybridAllowance(peak, c0, k),
    peakEquity: peak,
    peakT,
    troughT: pts[0]!.t
  };

  for (const p of pts) {
    const e = c0 + f(p);

    if (e > peak) {
      peak = e;
      peakT = p.t;
    }

    const allowance = hybridAllowance(peak, c0, k);
    const u = (peak - e) / allowance;

    if (u > best.utilization)
      best = { utilization: u, dollars: peak - e, allowance, peakEquity: peak, peakT, troughT: p.t };
  }
  return {
    basis,
    c0,
    coefficients: k,
    ...best,
    pass: best.utilization <= 1,
    regime:
      best.allowance === limitOf(k.capPct, c0)
        ? 'cap'
        : best.allowance === limitOf(k.floorPct, c0)
          ? 'floor'
          : 'peak-proportional',
    peakDate: dateOf(best.peakT),
    troughDate: dateOf(best.troughT)
  };
};

// D3 (account-level interval partition; `ledger` adds the exact lot-level attribution of the same window)
export const partitionDrawdown = (mp: number, mt: number, h: number) => {
  if (!(h >= 0)) throw new Error(`the banked high ${h} must be ≥ 0`);
  if (!(mp >= mt)) throw new Error(`a drawdown window needs peak ≥ trough (${mp} < ${mt})`);

  const unbankedGiveback = Math.max(0, mp - Math.max(h, mt));
  const bankedErosion = Math.max(0, Math.min(mp, h) - Math.max(0, mt));
  const capitalLoss = Math.max(0, Math.min(mp, 0) - mt);

  return {
    unbankedGiveback,
    bankedErosion,
    capitalLoss,
    residual: mp - mt - (unbankedGiveback + bankedErosion + capitalLoss)
  };
};

export const componentDrawdown = (pts: readonly PathPoint[], ledger: Ledger | null, basis: Basis = 'marked') => {
  requirePath(pts, 1);

  const dd = markedDrawdown(pts, basis);

  if (dd.max === 0)
    return {
      basis,
      dd: 0,
      window: null,
      account: partitionDrawdown(0, 0, 0),
      lot: null,
      bankedDd: bankedDrawdown(pts, basis).max
    };

  // the tracker's own peak and trough values (several path points can share an instant); H by the trough instant
  let h = 0;

  for (const p of pts) if (p.t <= dd.troughT && p.r > h) h = p.r;

  const mp = dd.peakValue;
  const mt = dd.troughValue;
  const account = partitionDrawdown(mp, mt, h);
  const lot = ledger ? attributeDrawdown(ledger, dd.peakT, dd.troughT, basis) : null;

  return {
    basis,
    dd: dd.max,
    window: { peakDate: dd.peakDate, troughDate: dd.troughDate, peakValue: mp, troughValue: mt, bankedHigh: h },
    account,
    lot: lot && {
      profitGiveback: lot.profitGiveback,
      principalLoss: lot.principalLoss,
      residual: lot.residual,
      lots: lot.rows.length
    },
    bankedDd: bankedDrawdown(pts, basis).max
  };
};

// Period attribution of ONE continuous pooled replay (no reset of any state at a boundary), with the established risk
// metrics of research/vg-l0-risk-metrics/METRIC_SPECIFICATION.md (src/vg-l0-risk-metrics/metrics.ts) on the rebuilt,
// engine-reconciled ledger (src/vg-l0-risk-metrics/engine.ts toLedger / reconcile):
//
// - a period is (from close, to close]: its P&L is the change of the MARKED net M between the two closes, so a
//   position spanning a boundary is attributed by its marks (realized fills plus the open remainder, interest accrued,
//   exit cost not yet charged on open shares);
// - interest and costs are those accrued or paid inside the period; gross trading P&L = net + interest + costs;
// - two drawdowns: the RESET drawdown (the strict tracker restarted at the period's opening close, peak = M there; the
//   standard's period drawdown) and the drawdown measured from the CONTINUOUS peak (the running peak of the whole run,
//   pre-period history included, over troughs inside the period); for a period from the run's start they coincide;
// - banked-capital drawdown with the high-water mark starting at the period's opening banked net R;
// - trade-principal loss PL over the lots active in the period, each with its whole life up to the period's end;
// - lot counts: entered, closed (win rate = closed lots with net > 0 ÷ closed lots), carried in, open at the end.
import type { Door } from '../vg-d1-growth-joint/data.ts';
import type { Ledger, LotLedger, PathPoint } from '../vg-l0-risk-metrics/ledger.ts';
import type { Replay } from '../vg-l0-risk-metrics/engine.ts';
import { bankedDrawdown, lotValueAt, markedDrawdown, portfolioPath, tradeRisk } from '../vg-l0-risk-metrics/metrics.ts';
import { formatNewYorkTime } from '../lib/session.ts';

export const r2 = (x: number) => Math.round(x * 100) / 100;
const iso = (t: number) => (Number.isFinite(t) ? new Date(t * 1000).toISOString() : null);
const et = (t: number) => (Number.isFinite(t) ? formatNewYorkTime(t) : null);

export interface PeriodSpec {
  key: string;
  label: string;
  after: string | null; // the period starts after this session's close (null: at the run's start)
  through: string; // inclusive last session
}

// The close instant of a session of the door.
export const closeOf = (door: Door, date: string) => {
  const i = door.dates.indexOf(date);

  if (i < 0) throw new Error(`${date} is not a session of ${door.name}`);
  return door.sym.VGT.ds.sCloseTime[i]!;
};

// The portfolio values at an instant: the last path point at or before it (0 before the start).
const at = (pts: readonly PathPoint[], t: number) => {
  let lo = 0;
  let hi = pts.length - 1;
  let best: PathPoint | null = null;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;

    if (pts[mid]!.t <= t) {
      best = pts[mid]!;
      lo = mid + 1;
    } else hi = mid - 1;
  }

  return best ?? { t, date: '', m: 0, liq: 0, r: 0, lot: null };
};

const exitT = (l: LotLedger) => (l.open ? Infinity : l.fills.at(-1)!.t);
const lastMarkAtOrBefore = (l: LotLedger, t: number) => {
  let m: LotLedger['marks'][number] | undefined;

  for (const k of l.marks) {
    if (k.t > t) break;
    m = k;
  }
  return m;
};

// A lot's cumulative interest (paid with its fills, plus accrued on the outstanding principal) and costs at instant t.
export const interestAt = (l: LotLedger, t: number) => {
  if (t < l.entryT) return 0;
  if (t >= exitT(l)) return l.interest;

  const paid = l.fills.filter((f) => f.t <= t).reduce((s, f) => s + f.interest, 0);

  return paid + (lastMarkAtOrBefore(l, t)?.interest ?? 0);
};
export const costsAt = (l: LotLedger, t: number) =>
  t < l.entryT
    ? 0
    : l.shares0 * (l.entryPrice - l.entryRaw) +
      l.fills.filter((f) => f.t <= t).reduce((s, f) => s + f.shares * (f.raw - f.price), 0);

// The lot as it stood at instant t (its marks and fills up to t): for the principal loss over a window ending at t.
const lotAsOf = (l: LotLedger, t: number): LotLedger => {
  if (t >= exitT(l)) return l;

  const marks = l.marks.filter((k) => k.t <= t);

  return { ...l, open: true, fills: l.fills.filter((f) => f.t <= t), marks, net: marks.at(-1)?.pnl ?? 0 };
};

// Drawdown of M measured from the continuous running peak (start 0), counting only troughs inside (fromT, toT].
const continuousPeakDrawdown = (pts: readonly PathPoint[], fromT: number, toT: number) => {
  let peak = 0;
  let peakT = pts[0]?.t ?? 0;
  let best = { max: 0, peakT: NaN, troughT: NaN, peakValue: NaN, troughValue: NaN };

  for (const p of pts) {
    if (p.t > toT) break;
    if (p.m > peak) {
      peak = p.m;
      peakT = p.t;
    }
    if (p.t > fromT && peak - p.m > best.max)
      best = { max: peak - p.m, peakT, troughT: p.t, peakValue: peak, troughValue: p.m };
  }
  return best;
};

export const periodMetrics = (L: Ledger, door: Door, spec: PeriodSpec) => {
  const pts = portfolioPath(L);
  const fromT = spec.after === null ? -Infinity : closeOf(door, spec.after);
  const toT = closeOf(door, spec.through);
  const a = spec.after === null ? { m: 0, r: 0, liq: 0 } : at(pts, fromT);
  const b = at(pts, toT);
  const active = L.lots.filter((l) => l.entryT <= toT && exitT(l) > fromT);
  const entered = active.filter((l) => l.entryT > fromT);
  const closed = active.filter((l) => exitT(l) <= toT);
  const carried = active.filter((l) => l.entryT <= fromT);
  const openAtEnd = active.filter((l) => exitT(l) > toT);
  const winners = closed.filter((l) => l.net > 0);
  const interest = L.lots.reduce(
    (s, l) => s + interestAt(l, toT) - (fromT === -Infinity ? 0 : interestAt(l, fromT)),
    0
  );
  const costs = L.lots.reduce((s, l) => s + costsAt(l, toT) - (fromT === -Infinity ? 0 : costsAt(l, fromT)), 0);
  const net = b.m - a.m;
  const reset = markedDrawdown(pts, 'marked', fromT, toT);
  const cont = continuousPeakDrawdown(pts, fromT, toT);
  const banked = bankedDrawdown(pts, 'marked', fromT, toT);
  const risks = active.map((l) => tradeRisk(lotAsOf(l, toT), toT));
  const worst = risks.reduce<(typeof risks)[number] | null>(
    (w, x) => (!w || x.principalLossLiq > w.principalLossLiq ? x : w),
    null
  );

  return {
    key: spec.key,
    label: spec.label,
    after: spec.after,
    through: spec.through,
    window: { fromCloseUtc: iso(fromT), toCloseUtc: iso(toT) },
    markedNetAtStart: r2(a.m),
    markedNetAtEnd: r2(b.m),
    net: r2(net),
    grossTradingPnl: r2(net + interest + costs),
    interest: r2(interest),
    costs: r2(costs),
    realizedPnl: r2(b.r - a.r),
    unrealizedAtStart: r2(a.m - a.r),
    unrealizedAtEnd: r2(b.m - b.r),
    drawdownReset: {
      max: r2(reset.max),
      peak: et(reset.peakT),
      trough: et(reset.troughT),
      basis: 'strict tracker restarted at the period opening close (peak = the marked net there)'
    },
    drawdownFromContinuousPeak: {
      max: r2(cont.max),
      peak: et(cont.peakT),
      trough: et(cont.troughT),
      peakValue: Number.isFinite(cont.peakValue) ? r2(cont.peakValue) : null,
      basis: 'the running peak of the whole continuous run (from 2016), troughs inside the period'
    },
    bankedCapitalDrawdown: {
      max: r2(banked.max),
      high: banked.highDate,
      trough: banked.troughDate,
      basis: 'high-water mark of the banked net starting at the period opening value'
    },
    maxTradePrincipalLoss: worst
      ? {
          lot: worst.id,
          book: worst.book,
          entry: worst.entry,
          loss: r2(worst.principalLossLiq),
          date: worst.principalLossDate,
          basis: 'liquidation basis, whole life to the period end'
        }
      : null,
    lots: {
      active: active.length,
      entered: entered.length,
      closed: closed.length,
      carriedIn: carried.length,
      openAtEnd: openAtEnd.length,
      winners: winners.length,
      losers: closed.length - winners.length,
      winRate: closed.length ? r2((100 * winners.length) / closed.length) : null
    },
    openPositions: openAtEnd.map((l) => {
      const m = lastMarkAtOrBefore(l, toT)!;

      return {
        lot: l.id,
        book: l.book,
        kind: l.kind,
        entry: et(l.entryT),
        entryRaw: l.entryRaw,
        shares: m.shares,
        principal: r2(m.principal),
        markPrice: m.price,
        markedPnl: r2(m.pnl),
        interestAccrued: r2(m.interest),
        liquidationPnl: r2(m.liq)
      };
    })
  };
};

// The lot ledger of a period: every lot active in it, with what the period contributed.
export const periodLedger = (L: Ledger, door: Door, spec: PeriodSpec) => {
  const fromT = spec.after === null ? -Infinity : closeOf(door, spec.after);
  const toT = closeOf(door, spec.through);

  return L.lots
    .filter((l) => l.entryT <= toT && exitT(l) > fromT)
    .map((l) => {
      const risk = tradeRisk(lotAsOf(l, toT), toT);
      const startValue = fromT === -Infinity ? 0 : lotValueAt(l, fromT);
      const endValue = lotValueAt(l, toT);

      return {
        lot: l.id,
        book: l.book,
        symbol: l.symbol,
        kind: l.kind,
        entry: et(l.entryT),
        entryRaw: l.entryRaw,
        entryPrice: l.entryPrice,
        principal: l.principal0,
        shares: l.shares0,
        carriedIn: l.entryT <= fromT,
        exits: l.fills
          .filter((f) => f.t > fromT && f.t <= toT)
          .map((f) => ({
            time: et(f.t),
            reason: f.reason,
            partial: f.partial,
            raw: f.raw,
            price: f.price,
            shares: f.shares,
            net: r2(f.net)
          })),
        status: exitT(l) <= toT ? 'closed' : 'open at the period end',
        lotNet: exitT(l) <= toT ? r2(l.net) : null,
        valueAtPeriodStart: r2(startValue),
        valueAtPeriodEnd: r2(endValue),
        periodPnl: r2(endValue - startValue),
        periodInterest: r2(interestAt(l, toT) - (fromT === -Infinity ? 0 : interestAt(l, fromT))),
        periodCosts: r2(costsAt(l, toT) - (fromT === -Infinity ? 0 : costsAt(l, fromT))),
        principalLoss: r2(risk.principalLossLiq),
        mae:
          l.canonicalMae === null
            ? null
            : r2(Math.min(...l.marks.filter((k) => k.t <= toT).map((k) => k.pnl), exitT(l) <= toT ? l.net : Infinity))
      };
    });
};

// The pool's funding decisions inside a period (granted and refused, with the occupant of a refused one).
export const periodFunding = (r: Replay, door: Door, spec: PeriodSpec) => {
  const fromT = spec.after === null ? -Infinity : closeOf(door, spec.after);
  const toT = closeOf(door, spec.through);

  return r.result.funding
    .filter((f) => f.t > fromT && f.t <= toT)
    .map((f) => ({
      book: f.book,
      trade: f.trade,
      kind: f.kind,
      time: et(f.t),
      price: f.price,
      outcome: f.outcome,
      reason: f.reason,
      occupant: f.occupant || null
    }));
};

// Each book's own (virtual) state at the door's end: its open trade or pending order, if any, and its last decision.
export const bookStates = (r: Replay) =>
  r.books.map((b) => {
    const last = b.trades.at(-1);
    const open = b.trades.filter((t) => t.open || t.eS < 0);

    return {
      book: b.book,
      trades: b.trades.length,
      lastDecision: last ? { trade: last.id, kind: last.kind, time: et(last.dT), price: last.dPrice } : null,
      openOrPending: open.map((t) => ({
        trade: t.id,
        kind: t.kind,
        decision: et(t.dT),
        state: t.eS < 0 ? 'order pending at the end (never filled)' : 'open at the end',
        entry: t.eS < 0 ? null : et(t.eT),
        entryRaw: t.eS < 0 ? null : t.eRaw,
        partialExits: t.fills.length,
        virtualNet: r2(t.vNet)
      }))
    };
  });

// The causal-trajectory check: a run on a longer door equals the run on a shorter one up to the shorter one's end,
// decision for decision (standard §5.1 "causal data access"). Only endpoint-dependent values may differ: a lot open at
// the shorter end is compared by its fills and marks up to that end (its later life and its final net are the longer
// run's), and each book's trade open at that end by its decision and entry.
export const compareTrajectories = (short: { r: Replay; L: Ledger }, long: { r: Replay; L: Ledger }) => {
  const endT = short.L.endT;
  const diffs: string[] = [];
  const same = (what: string, x: unknown, y: unknown) => {
    if (JSON.stringify(x) !== JSON.stringify(y)) diffs.push(what);
  };
  const until = <T extends { t: number }>(xs: readonly T[]) => xs.filter((x) => x.t <= endT);

  same('session calendar', short.r.door.dates, long.r.door.dates.slice(0, short.r.door.dates.length));
  same(
    'portfolio path (every marked, liquidation and banked value)',
    until(portfolioPath(short.L)),
    until(portfolioPath(long.L))
  );
  same(
    'funding decisions',
    short.r.result.funding,
    long.r.result.funding.filter((f) => f.t <= endT)
  );
  short.L.lots.forEach((l, i) => {
    const m = long.L.lots[i];

    if (!m) return diffs.push(`lot ${l.id} missing in the longer run`);
    if (!l.open) same(`closed lot ${l.id}`, l, m);
    else {
      same(
        `open lot ${l.id} entry`,
        [l.book, l.entryT, l.entryRaw, l.entryPrice, l.shares0, l.principal0],
        [m.book, m.entryT, m.entryRaw, m.entryPrice, m.shares0, m.principal0]
      );
      same(`open lot ${l.id} fills and marks to the shorter end`, [l.fills, l.marks], [until(m.fills), until(m.marks)]);
    }
  });
  if (long.L.lots.slice(short.L.lots.length).some((l) => l.entryT <= endT))
    diffs.push('the longer run funds a lot before the shorter end that the shorter run lacks');
  short.r.books.forEach((b, i) => {
    const c = long.r.books[i]!;

    same(`book ${b.book} identity`, b.key, c.key);
    b.trades.forEach((t, j) => {
      const u = c.trades[j];

      if (!u) return diffs.push(`book ${b.book} trade ${t.id} missing in the longer run`);
      if (!t.open && t.eS >= 0) same(`book ${b.book} closed trade ${t.id}`, t, u);
      else {
        // open or pending at the shorter end: the decision, the entry if it was filled by then, and the fills by then
        same(`book ${b.book} trade ${t.id} decision`, [t.kind, t.dS, t.dT, t.dPrice], [u.kind, u.dS, u.dT, u.dPrice]);
        if (t.eS >= 0)
          same(
            `book ${b.book} trade ${t.id} entry`,
            [t.eS, t.eK, t.eT, t.eRaw, t.ePrice],
            [u.eS, u.eK, u.eT, u.eRaw, u.ePrice]
          );
        else if (u.eS >= 0 && u.eT <= endT)
          diffs.push(`book ${b.book} trade ${t.id}: filled by the shorter end only in the longer run`);
        same(`book ${b.book} trade ${t.id} fills to the shorter end`, t.fills, until(u.fills));
      }
    });
    if (c.trades.slice(b.trades.length).some((t) => t.dT <= endT))
      diffs.push(`book ${b.book}: a decision before the shorter end that the shorter run lacks`);
  });
  same('marked net at the shorter end', r2(short.r.result.net), r2(at(portfolioPath(long.L), endT).m));
  same(
    'maximum minute drawdown through the shorter end',
    r2(short.r.result.dd.max),
    r2(markedDrawdown(portfolioPath(long.L), 'marked', -Infinity, endT).max)
  );

  return { identical: diffs.length === 0, differences: diffs, comparedThrough: iso(endT) };
};

// The per-run metric bundle (METRIC_SPECIFICATION.md): every §6 quantity of one reconciled replay, per window, with the
// exact drawdown attribution, the per-trade table, the realized loss clusters, the gap-through-stop fills, and the
// open-lot stop state at each requested close. Pure given the replay; rounded to cents only at the output.
import type { Door } from '../vg-d1-growth-joint/data.ts';
import type { Replay } from './engine.ts';
import type { Ledger, LotLedger, PathPoint } from './ledger.ts';
import {
  attributeDrawdown,
  bankedDrawdown,
  floorShortfall,
  losingStreaks,
  markedDrawdown,
  realizedDrawdown,
  realizedEpisodes,
  tradeRisk,
  windowOf
} from './metrics.ts';
import { bookParamsOf, boundedLossExit, stopStateAt, verifyExit } from './stops.ts';

const c2 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? x ?? null : Math.round(x * 100) / 100);
const round = <T>(v: T): T =>
  (typeof v === 'number' ? c2(v) : Array.isArray(v) ? v.map(round) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round(x)])) : v) as T;

export const closeT = (door: Door, date: string) => {
  const s = door.dates.indexOf(date);

  if (s < 0) throw new Error(`${date} is not a session of ${door.name}`);
  return door.sym.VGT.ds.sCloseTime[s]!;
};

// The lot as it stood at instant toT: marks after toT dropped; an exit after toT undone (the lot is open at toT with its
// last mark as its net). A lot that exited by toT is unchanged.
export const truncateLot = (l: LotLedger, toT: number): LotLedger => {
  if (!l.open && l.fills.at(-1)!.t <= toT) return l;

  const marks = l.marks.filter((m) => m.t <= toT);
  const fills = l.fills.filter((f) => f.t <= toT);

  // the canonical MAE as a run ending at toT would publish it (min of the marks; the final net is the last mark)
  const canonicalMae = marks.length ? marks.reduce((a, m) => Math.min(a, m.pnl), Infinity) : null;

  return { ...l, marks, fills, open: true, net: marks.at(-1)?.pnl ?? 0, canonicalMae };
};

// One window (fromT, toT]: fromT = −∞ for a whole-run window (peak 0 at the start), else a boundary close (reset).
export const windowMetrics = (L: Ledger, pts: readonly PathPoint[], fromT: number, toT: number) => {
  const w = windowOf(pts, fromT, toT);
  const endP = (fromT === -Infinity ? pts.filter((p) => p.t <= toT) : [w.start, ...w.points]).at(-1)!;
  const startP = fromT === -Infinity ? pts[0]! : w.start;
  const dd = markedDrawdown(pts, 'marked', fromT, toT);
  const ddL = markedDrawdown(pts, 'liquidation', fromT, toT);
  const att = dd.max > 0 ? attributeDrawdown(L, dd.peakT, dd.troughT) : null;
  const lotsIn = L.lots.filter((l) => {
    const a = l.marks[0]?.t ?? Infinity;
    const z = l.open ? Infinity : l.fills.at(-1)!.t;

    return a <= toT && z > (fromT === -Infinity ? -Infinity : fromT);
  });
  // a lot still open at the window end is measured on its life up to the window end only (no later mark; amendment A3)
  const trades = lotsIn.map((l) => tradeRisk(truncateLot(l, toT), Math.min(toT, L.endT)));
  const pl = trades.map((t) => t.principalLossLiq).sort((a, b) => a - b);
  const worstPl = trades.reduce<(typeof trades)[number] | null>((a, t) => (!a || t.principalLossLiq > a.principalLossLiq ? t : a), null);
  const worstGb = trades.reduce<(typeof trades)[number] | null>((a, t) => (!a || t.maxGivebackAboveBreakeven > a.maxGivebackAboveBreakeven ? t : a), null);
  const closedIn = trades.filter((t) => !t.open && t.exit !== null);

  return {
    net: endP.m - startP.m,
    realizedChange: endP.r - startP.r,
    endMarked: endP.m,
    endRealized: endP.r,
    dd: { max: dd.max, peak: dd.peakDate, trough: dd.troughDate, recovery: dd.recoveryDate, liquidationMax: ddL.max },
    ddAttribution: att
      ? {
          profitGiveback: att.profitGiveback,
          principalLoss: att.principalLoss,
          residual: att.residual,
          givebackShare: att.total > 0 ? att.profitGiveback / att.total : null,
          lots: att.rows.map((r) => ({ lot: r.lot, book: r.book, entry: r.entry, exit: r.exit, role: r.role, atPeak: r.atPeak, atTrough: r.atTrough, giveback: r.profitGiveback, principalLoss: r.principalLoss }))
        }
      : null,
    floor: { marked: floorShortfall(pts, 'marked', fromT, toT, fromT === -Infinity ? 0 : startP.m), liquidation: floorShortfall(pts, 'liquidation', fromT, toT, fromT === -Infinity ? 0 : startP.liq) },
    realizedDd: (() => {
      const r = realizedDrawdown(pts, fromT, toT);

      return { max: r.max, peak: r.peakDate, trough: r.troughDate, recovery: r.recoveryDate };
    })(),
    bankedDd: { marked: bankedDrawdown(pts, 'marked', fromT, toT), liquidation: bankedDrawdown(pts, 'liquidation', fromT, toT).max },
    trades: {
      lots: trades.length,
      closed: closedIn.length,
      losing: closedIn.filter((t) => t.net < 0).length,
      principalLossMax: pl.at(-1) ?? 0,
      principalLossMaxLot: worstPl ? { lot: worstPl.id, book: worstPl.book, entry: worstPl.entry, exit: worstPl.exit, date: worstPl.principalLossDate, net: worstPl.net } : null,
      principalLossMedian: pl.length ? pl[Math.floor((pl.length - 1) / 2)]! : 0,
      lotsBelowPrincipal: trades.filter((t) => t.principalLossLiq > 0.005).length,
      lotsOver10k: trades.filter((t) => t.principalLossLiq > 10_000).length,
      lotsOver25k: trades.filter((t) => t.principalLossLiq > 25_000).length,
      lotsOver35k: trades.filter((t) => t.principalLossLiq > 35_000).length,
      worstRealized: closedIn.length ? Math.min(...closedIn.map((t) => t.net)) : null,
      worstCanonicalMae: trades.length ? Math.min(...trades.map((t) => t.canonicalMae ?? Infinity)) : null,
      maxGiveback: worstGb ? { amount: worstGb.maxGivebackAboveBreakeven, lot: worstGb.id, book: worstGb.book, entry: worstGb.entry, peakProfit: worstGb.peakProfit, net: worstGb.net } : null,
      sumGiveback: trades.reduce((s, t) => s + t.maxGivebackAboveBreakeven, 0),
      maxPeakProfit: trades.length ? Math.max(...trades.map((t) => t.peakProfit)) : 0
    }
  };
};

export interface BundleOptions {
  windows: Record<string, [string | null, string]>; // name → [boundary date (null: whole run from the start), end date]
  closes: string[]; // dates at which the open lot's stop state and §5.9 items are reported
  episodes?: Record<string, [string, string]>; // name → [first, last] session dates (reset at the close before the first)
}

export const bundleOf = (door: Door, r: Replay, L: Ledger, pts: readonly PathPoint[], o: BundleOptions) => {
  const rate = L.rate;
  const cost = L.costBps;
  const tradesAll = L.lots.map((l) => tradeRisk(l, L.endT));
  const windows = Object.fromEntries(
    Object.entries(o.windows).map(([k, [from, to]]) => [k, windowMetrics(L, pts, from === null ? -Infinity : closeT(door, from), closeT(door, to))])
  );
  const sessionBefore = (date: string) => {
    const s = door.dates.findIndex((d) => d >= date);

    return door.dates[Math.max(0, s - 1)]!;
  };
  const episodes = Object.fromEntries(
    Object.entries(o.episodes ?? {})
      .filter(([, [a]]) => door.dates.includes(a) || door.dates.some((d) => d >= a))
      .filter(([, [, z]]) => z <= door.dates.at(-1)!)
      .map(([k, [a, z]]) => [k, windowMetrics(L, pts, closeT(door, sessionBefore(a)), closeT(door, door.dates.filter((d) => d <= z).at(-1)!))])
  );
  const res = r.result;
  const exposures = o.closes
    .filter((d) => door.dates.includes(d))
    .map((date) => {
      const c = door.dates.indexOf(date);
      const t = closeT(door, date);
      const lot = res.lots.find((l) => l.entryS <= c && (l.open || l.fills.at(-1)!.s > c)) ?? null;
      const net = pts.filter((p) => p.t <= t).at(-1)!.m;

      if (!lot) return { date, net, open: null };

      const st = stopStateAt(door, lot, c, bookParamsOf(r.subject, lot.book), rate, cost);
      const L1 = L.lots.find((x) => x.id === lot.id)!;
      const later = L1.marks.filter((m) => m.t > t);
      const hi = later.reduce<(typeof later)[number] | null>((a, m) => (!a || m.pnl > a.pnl ? m : a), null);
      const lo = later.reduce<(typeof later)[number] | null>((a, m) => (!a || m.pnl < a.pnl ? m : a), null);

      return {
        date,
        net,
        openShareOfNet: net > 0 ? st.marked / net : null,
        open: st,
        after: {
          highest: hi ? { pnl: hi.pnl, date: hi.date } : null,
          lowest: lo ? { pnl: lo.pnl, date: lo.date } : null,
          exit: L1.open ? null : { date: L1.fills.at(-1)!.date, reason: L1.fills.at(-1)!.reason, net: L1.net },
          changeFromClose: (L1.open ? L1.marks.at(-1)!.pnl : L1.net) - st.marked
        }
      };
    });
  const gaps = res.lots
    .map((l) => ({ l, v: verifyExit(door, l, bookParamsOf(r.subject, l.book), rate, cost) }))
    .filter((x) => x.v && x.v.raw < x.v.level - 1e-9)
    .map(({ l, v }) => ({
      lot: l.id,
      book: l.book,
      entry: door.dates[l.entryS],
      exit: door.dates[l.fills.at(-1)!.s],
      reason: v!.reason,
      level: v!.level,
      raw: v!.raw,
      beyondLevelPctOfEntry: (100 * (v!.level - v!.raw)) / l.entryRaw,
      beyondLevelDollars: (l.fills.at(-1)!.shares * (v!.level - v!.raw) * (1 - cost / 10_000)),
      net: l.net
    }))
    .sort((a, b) => b.beyondLevelDollars - a.beyondLevelDollars);
  const verification = res.lots.map((l) => verifyExit(door, l, bookParamsOf(r.subject, l.book), rate, cost)).filter((v) => v !== null);

  return round({
    boundedLossExit: boundedLossExit(r.subject),
    growthExits: (() => {
      const g = bookParamsOf(r.subject, 'G:VGT');

      return { trailingPct: 100 * g.trailing, hold: g.hold, initialStop: g.initialStop, retention: g.retention };
    })(),
    record: { net: r.rec.net, dd: r.rec.dd, lots: r.rec.lots, realized: r.rec.realized, unrealized: r.rec.unrealized, interest: r.rec.interest, costs: r.rec.costs, years: r.rec.years, sessionsHeld: r.rec.sessionsHeld, sessions: r.rec.sessions, utilization: r.rec.sessions ? r.rec.sessionsHeld / r.rec.sessions : null, peakValue: r.rec.peakValue },
    windows,
    episodes,
    exposures,
    realizedEpisodes: realizedEpisodes(L).slice(0, 5),
    losingStreaks: losingStreaks(L),
    gapsThroughStop: gaps.slice(0, 10),
    stopVerification: { checked: verification.length, failed: verification.filter((v) => !v!.ok).length },
    trades: tradesAll
  });
};

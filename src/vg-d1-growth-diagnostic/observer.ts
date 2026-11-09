// The read-only participation observer (PROTOCOL.md §5). It runs Priority 3's canonical evaluation unchanged
// (evaluate.ts `run` with the funding log, then `recordOf`), checks the record against the sealed one, and only then
// derives, from that run's own outputs and the Growth engine's own decision log:
//
// - a funnel per component: availability, raw conditions and crossings, dispositions (taken, gate-blocked, deferred
//   to eligibility, rejected while the virtual book is invested), eligibility and continuation events, virtual trades,
//   pool decisions (granted, refused, by occupant), funded lots, principal-days, holding time, end state;
// - a refusal timeline: for every refused decision, the real lot or reservation holding the slot, its release, the
//   refused virtual trade's own hold, the idle capacity overlapping it, later occupations, the next decision of the
//   book, and the price-based crossings that fell inside the idle overlap (with the gates checked at their own
//   instant, PROTOCOL.md §5.3);
// - the drawdown episode decomposed by lot (reconciled to the tracker), and the first divergence from another ledger.
//
// It never changes an execution state, never invents a fill and never books a hypothetical profit.
import type { SignalBar } from '../entry-signals/bars.ts';
import { scanRiseFromRecentLow } from '../entry-signals/riseFromRecentLow.ts';
import { encode } from '../growth140-vgt-s8m/store.ts';
import type { EntryDecision } from '../growth-trading/riseTrading.ts';
import { secondsPerYear } from '../shared-margin-portfolio/strategy.ts';
import {
  type BookId,
  type VBook,
  type VTrade,
  baseFriction,
  bookIds,
  familyOf,
  growthParamsOf,
  symbolOf
} from '../vg-d1-growth-joint/books.ts';
import type { Sym } from '../vg-d1-growth-joint/context.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { Lot, PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { type Quad, entryOf } from '../vg-d1-growth-joint/space.ts';
import { episodeGap, r2 } from './context.ts';
import { type GrowthRun, sameBook, simulateGrowthWith } from './growthLog.ts';

// ----- equality with a sealed record (the sealed JSON encodes non-finite numbers as strings) -----

export const plain = (v: unknown) => JSON.parse(encode(v)) as unknown;

export const firstDifference = (a: unknown, b: unknown, at = ''): string | null => {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object')
    return `${at || '(root)'}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${at}: array/object`;

  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);

  if (ka.length !== kb.length || ka.some((k) => !kb.includes(k)))
    return `${at}: keys ${ka.join(',')} ≠ ${kb.join(',')}`;
  for (const k of ka) {
    const d = firstDifference((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${at}.${k}`);

    if (d) return d;
  }
  return null;
};

// ----- sessions, intervals and occupancy -----

export interface Interval {
  start: number; // Unix seconds, inclusive
  end: number; // exclusive (Infinity: open at the end)
}

// The slot's occupation by a funded lot: from its decision (the reservation) to its final exit fill.
export const occupancyOf = (lot: Lot): Interval => ({
  start: lot.trade.dT,
  end: lot.open ? Infinity : lot.fills.at(-1)!.t
});

export const covers = (iv: Interval, t: number) => t >= iv.start && t < iv.end;

// Session closes in [from, to) (to = Infinity: through the last session).
export const closesIn = (closeTimes: ArrayLike<number>, last: number, iv: Interval) => {
  const out: number[] = [];

  for (let s = 0; s <= last; s++) if (covers(iv, closeTimes[s]!)) out.push(s);
  return out;
};

// A virtual trade's own hold: from its decision (pending, then invested) to its final exit (Infinity while open; an
// order never filled stays pending to the end).
export const virtualInterval = (v: VTrade): Interval => ({
  start: v.dT,
  end: v.eS < 0 || v.open || v.fills.length === 0 ? Infinity : v.fills.at(-1)!.t
});

// Independent episodes of a sorted list of (start session, end session) items: a new one starts when an item starts
// more than `gap` sessions after the latest end so far.
export const episodeCount = (items: readonly { s: number; e: number }[], gap = episodeGap) => {
  let n = 0;
  let last = -Infinity;

  for (const x of [...items].sort((a, b) => a.s - b.s)) {
    if (x.s - last > gap) n++;
    last = Math.max(last, x.e);
  }

  return n;
};

// ----- the run -----

export interface Observed {
  door: Door;
  quad: Quad;
  options: EvalOptions;
  result: PoolResult;
  books: VBook[];
  rec: Rec;
  growth: Partial<Record<BookId, { run: GrowthRun; key: string }>>;
  occupancy: { lot: Lot; iv: Interval }[];
}

export const growthConfigFor = (q: Quad, s: Sym, o: EvalOptions) => {
  const fr = { ...baseFriction, ...(o.friction ?? {}) };

  return { cfg: { ...q.g[s], costBpsPerSide: fr.costBps }, fr };
};

export const observe = (
  door: Door,
  q: Quad,
  o: EvalOptions,
  counters: { books: number },
  logs = true // false: the pooled run only (draw replays and probes need no Growth decision log)
): Observed => {
  const x = run(door, q, o, true, false);
  const rec = recordOf(door, q, x, o);
  const growth: Observed['growth'] = {};

  for (const b of x.books) {
    if (!logs || familyOf(b.book) !== 'G') continue;

    const s = symbolOf(b.book);
    const { cfg, fr } = growthConfigFor(q, s, o);
    const params = growthParamsOf(cfg, s, door);
    const g = simulateGrowthWith(door.sym[s], params, { friction: fr });

    counters.books++;

    const diff = sameBook(g, b);

    if (diff) throw new Error(`the observer's ${b.book} run differs from the pooled book: ${diff}`);
    growth[b.book] = { run: g, key: b.key };
  }

  return {
    door,
    quad: q,
    options: o,
    result: x.result,
    books: x.books,
    rec,
    growth,
    occupancy: x.result.lots.map((lot) => ({ lot, iv: occupancyOf(lot) }))
  };
};

const occupiedAt = (ob: Observed, t: number) => ob.occupancy.find((x) => covers(x.iv, t)) ?? null;

// The canonical Rise scanner, memoized per window start within a process (it is pure).

const riseCache = new Map<string, ReturnType<typeof scanRiseFromRecentLow>>();
const scanRiseFromRecentLowCached = (
  bars: readonly SignalBar[],
  p: { advanceFromRecentLowPercent: number; recentLowLookbackBars: number },
  first: number
) => {
  const k = `${bars.length}|${bars[0]?.end}|${p.advanceFromRecentLowPercent}|${p.recentLowLookbackBars}|${first}`;
  let v = riseCache.get(k);

  if (!v) {
    v = scanRiseFromRecentLow(bars, p, first);
    riseCache.set(k, v);
    if (riseCache.size > 512) riseCache.delete(riseCache.keys().next().value!);
  }
  return v;
};

// ----- the funnel (one component, over the sessions [from, to]) -----

export interface Funnel {
  book: BookId;
  enabled: boolean;
  entry: string;
  // 1. availability
  sessions: number;
  firstEvaluable: string | null;
  firstCrossing: string | null;
  firstDecision: string | null;
  virtualInvestedSessions: number; // closes at which the virtual book held a position
  virtualPendingSessions: number; // closes between a decision and its fill
  virtualFlatSessions: number;
  // 2. raw conditions and crossings
  conditionSessions: number | null; // Rise: closes at or above the threshold; breakout: closes meeting every condition
  evaluableSessions: number | null;
  crossings: number; // base signals (Rise crossings; breakout sessions); D1: shadow signals
  crossingEpisodes: number;
  // 3. dispositions, filters and eligibility (Growth)
  dispositions: Record<string, number>;
  events: Record<string, number>;
  invalidatedBy: Record<string, number>;
  // the actionable decisions: the virtual trades
  virtualTrades: number;
  virtualBySource: Record<string, number>;
  virtualEpisodes: number;
  virtualNet: number; // descriptive: the virtual trades' own nets on $100,000
  pendingAtEnd: number;
  openAtEnd: number;
  // 4. funding
  decisions: number;
  granted: number;
  refused: number;
  refusedBy: Record<string, number>; // occupant component (or 'order' for a reservation) → refusals
  refusedOther: Record<string, number>; // other refusal reasons (disabled, before the funding start)
  // 5. funded
  lots: number;
  partials: number;
  fundedEpisodes: number;
  principalDays: number;
  heldSessions: number; // closes at which a funded lot of this component was open
  booked: number;
  wins: number;
  losses: number;
  meanHoldDays: number | null;
  fundedOpenAtEnd: number;
}

const inRange = (s: number, r: { from: number; to: number }) => s >= r.from && s <= r.to;

export const funnelOf = (ob: Observed, b: BookId, range = { from: 0, to: ob.result.endIndex }): Funnel => {
  const door = ob.door;
  const ds = door.sym[symbolOf(b)].ds;
  const close = ds.sCloseTime;
  const book = ob.books.find((x) => x.book === b);
  const enabled = ob.options.enabled?.[b] !== false;
  const sessions = range.to - range.from + 1;
  const date = (s: number) => door.dates[s] ?? null;
  const trades = (book?.trades ?? []).filter((v) => inRange(v.dS, range));
  let invested = 0;
  let pending = 0;

  for (const v of book?.trades ?? []) {
    const iv = virtualInterval(v);

    for (let s = range.from; s <= range.to; s++) {
      if (!covers(iv, close[s]!)) continue;
      if (v.eS >= 0 && s >= v.eS) invested++;
      else pending++;
    }
  }

  const g = ob.growth[b]?.run;
  const dispositions: Record<string, number> = {};
  const events: Record<string, number> = {};
  const invalidatedBy: Record<string, number> = {};
  const crossingSessions: number[] = [];
  let conditionSessions: number | null = null;
  let evaluableSessions: number | null = null;
  let firstEvaluable: string | null = null;
  let entry = familyOf(b) === 'D1' ? 'd1' : entryOf(ob.quad.g[symbolOf(b)]);

  if (g) {
    for (const e of g.simulation.log.entries as unknown as {
      event: string;
      session: number;
      disposition?: string;
      reason?: string;
    }[]) {
      if (!inRange(e.session, range)) continue;
      events[e.event] = (events[e.event] ?? 0) + 1;
      if (e.event === 'base_signal') {
        const k = `${e.disposition}${e.reason ? `: ${String(e.reason).split(/[ :—]/)[0]}` : ''}`;

        dispositions[k] = (dispositions[k] ?? 0) + 1;
        crossingSessions.push(e.session);
      }
      if (e.event === 'opportunity_invalidated') {
        const k = String(e.reason ?? '?')
          .split(/[:—]/)[0]!
          .trim();

        invalidatedBy[k] = (invalidatedBy[k] ?? 0) + 1;
      }
    }

    if (g.rise) {
      // conditions per session (1d bars: one bar per session) from the canonical scanner, by difference of windows
      const bars = door.sym[symbolOf(b)].bars;
      const barAt = (s: number) => {
        const i = bars.findIndex((x) => x.sessionIndex >= s);

        return i < 0 ? bars.length : i;
      };
      const params = {
        advanceFromRecentLowPercent: Number(ob.quad.g[symbolOf(b)].advanceFromRecentLowPercent),
        recentLowLookbackBars: Number(ob.quad.g[symbolOf(b)].recentLowLookbackBars)
      };
      const from = g.rise; // the full-window scan (firstEligible = 0)
      const tail = (s: number) =>
        s >= bars.length
          ? { evaluableBars: 0, barsAtOrAboveThreshold: 0 }
          : scanRiseFromRecentLowCached(bars, params, barAt(s));
      const a = range.from === 0 ? from : tail(range.from);
      const z = tail(range.to + 1);

      conditionSessions = a.barsAtOrAboveThreshold - z.barsAtOrAboveThreshold;
      evaluableSessions = a.evaluableBars - z.evaluableBars;
      firstEvaluable = date(bars[Math.max(0, params.recentLowLookbackBars - 1)]?.sessionIndex ?? -1);
      entry = 'rise';
    } else if (g.breakout) {
      const sig = g.breakout.signals.filter((x) => inRange(x.session, range));
      const unavailable = new Set(g.breakout.unavailable.map((u) => u.session));
      let firstOk = -1;

      for (let s = 0; s <= ob.result.endIndex; s++)
        if (!unavailable.has(s)) {
          firstOk = s;
          break;
        }
      conditionSessions = sig.length;
      evaluableSessions = 0;
      for (let s = range.from; s <= range.to; s++) if (!unavailable.has(s)) evaluableSessions++;
      firstEvaluable = firstOk >= 0 ? date(firstOk) : null;
      entry = 'breakout';
    }
  } else if (book) {
    // D1: the shadow book's own signals are its virtual trades (the machine's internal setups are not exported)
    for (const v of trades) crossingSessions.push(v.dS);
  }

  const bySource: Record<string, number> = {};

  if (g) {
    const decided = new Map<number, string>();

    for (const t of g.simulation.trades) {
      const kind = String(t.setupKind);
      const via = g.simulation.gates?.decisionOf(t)?.kind;
      const src =
        kind === 'rise' || kind === 'trend_breakout'
          ? !via || via === 'crossing'
            ? `base ${kind} (at its crossing)`
            : via === 'renewal'
              ? 'eligibility renewal'
              : 'eligibility (latched, later decision)'
          : `continuation ${kind}`;

      decided.set(t.decisionTime, src);
    }
    for (const v of trades) {
      const k = decided.get(v.dT) ?? (v.eS < 0 ? 'pending order' : v.kind);

      bySource[k] = (bySource[k] ?? 0) + 1;
    }
  } else for (const v of trades) bySource[v.kind] = (bySource[v.kind] ?? 0) + 1;

  const funding = ob.result.funding.filter((f) => f.book === b && inRange(f.s, range));
  const refusedBy: Record<string, number> = {};
  const refusedOther: Record<string, number> = {};

  for (const f of funding) {
    if (f.outcome !== 'refused') continue;
    if (f.reason === 'slot occupied') {
      const k = `${f.occupantBook}${/ order /.test(f.occupant) ? ' (reservation)' : ''}`;

      refusedBy[k] = (refusedBy[k] ?? 0) + 1;
    } else refusedOther[f.reason] = (refusedOther[f.reason] ?? 0) + 1;
  }

  const lots = ob.result.lots.filter((l) => l.book === b && inRange(l.entryS, range));
  const closed = lots.filter((l) => !l.open);
  const days = (l: Lot) => (ds.sTime[l.open ? ob.result.endIndex : l.fills.at(-1)!.s]! - ds.sTime[l.entryS]!) / 86400;
  let principalDays = 0;

  for (const l of lots) {
    let p = l.principal0;
    let from = l.entryS;

    for (const f of l.fills) {
      principalDays += (p * (ds.sTime[f.s]! - ds.sTime[from]!)) / 86400;
      p -= f.principal;
      from = f.s;
    }
    if (l.open) principalDays += (p * (ds.sTime[ob.result.endIndex]! - ds.sTime[from]!)) / 86400;
  }

  let held = 0;
  const idx = bookIds.indexOf(b);

  for (let s = range.from; s <= range.to; s++) if (ob.result.heldAtClose[s] === idx) held++;

  const crossings = crossingSessions.length;

  return {
    book: b,
    enabled,
    entry,
    sessions,
    firstEvaluable,
    firstCrossing: crossingSessions.length ? date(Math.min(...crossingSessions)) : null,
    firstDecision: trades[0] ? date(trades[0].dS) : null,
    virtualInvestedSessions: invested,
    virtualPendingSessions: pending,
    virtualFlatSessions: sessions - invested - pending,
    conditionSessions,
    evaluableSessions,
    crossings,
    crossingEpisodes: episodeCount(crossingSessions.map((s) => ({ s, e: s }))),
    dispositions,
    events,
    invalidatedBy,
    virtualTrades: trades.length,
    virtualBySource: bySource,
    virtualEpisodes: episodeCount(
      trades.map((v) => ({
        s: v.dS,
        e: v.eS < 0 || v.open || v.fills.length === 0 ? Infinity : v.fills.at(-1)!.s
      }))
    ),
    virtualNet: r2(trades.reduce((a, v) => a + v.vNet, 0)),
    pendingAtEnd: trades.filter((v) => v.eS < 0).length,
    openAtEnd: trades.filter((v) => v.open).length,
    decisions: funding.length,
    granted: funding.filter((f) => f.outcome === 'granted').length,
    refused: funding.filter((f) => f.outcome === 'refused').length,
    refusedBy,
    refusedOther,
    lots: lots.length,
    partials: lots.reduce((a, l) => a + l.fills.filter((f) => f.partial).length, 0),
    fundedEpisodes: episodeCount(lots.map((l) => ({ s: l.entryS, e: l.open ? Infinity : l.fills.at(-1)!.s }))),
    principalDays: Math.round(principalDays),
    heldSessions: held,
    booked: r2(lots.reduce((a, l) => a + l.net, 0)),
    wins: closed.filter((l) => l.net > 0).length,
    losses: closed.filter((l) => l.net < 0).length,
    meanHoldDays: lots.length ? Math.round((lots.reduce((a, l) => a + days(l), 0) / lots.length) * 10) / 10 : null,
    fundedOpenAtEnd: lots.filter((l) => l.open).length
  };
};

// ----- the pool's own time use -----

export const poolTimeOf = (ob: Observed, range = { from: 0, to: ob.result.endIndex }) => {
  const close = ob.door.sym.VGT.ds.sCloseTime;
  let held = 0;
  let reservedOnly = 0;

  for (let s = range.from; s <= range.to; s++) {
    if (ob.result.heldAtClose[s]! >= 0) held++;
    else if (occupiedAt(ob, close[s]!)) reservedOnly++;
  }

  const sessions = range.to - range.from + 1;

  return { sessions, held, reservedOnly, idle: sessions - held - reservedOnly };
};

// ----- refusals: who held the slot, for how long, and what the refused virtual trade did meanwhile -----

export interface Refusal {
  book: BookId;
  trade: number;
  kind: string;
  decision: string; // date
  decisionT: number;
  decisionS: number;
  virtualEntry: string | null;
  virtualExit: string | null; // null: open at the end or never filled
  virtualNet: number; // descriptive: the refused trade's own net on $100,000
  occupant: BookId | null;
  occupantKind: 'lot' | 'reservation';
  occupantLot: number | null;
  occupantRelease: string | null; // the occupant's final exit (null: still open at the end)
  virtualSessions: number; // closes inside the refused trade's own hold
  blockedSessions: number; // … at which the original occupant still held or reserved the slot
  reoccupiedSessions: number; // … at which another lot held or reserved it
  idleOverlapSessions: number; // … at which nothing held or reserved it (the virtual-state waiting)
  reoccupiedBy: { book: BookId; lot: number; entry: string; exit: string | null }[];
  nextDecision: string | null; // the same component's next decision after this one
  sessionsToNextDecision: number | null; // from the refused trade's virtual exit to that decision
  idleCrossings: IdleCrossing[]; // Growth: the book's raw crossings inside the idle overlap
  idleConditionSessions: number | null; // Rise: idle-overlap closes at or above the threshold
}

export interface IdleCrossing {
  date: string;
  t: number;
  disposition: string; // in the actual run (necessarily rejected or pending: the virtual book was busy)
  gatesAtOwnInstant: string; // pass | blocked: <reason> (eligibility would arm: unresolved) | blocked: <reason>
}

export const refusalsOf = (
  ob: Observed,
  counters: { books: number; gateChecks: number },
  gateChecks = true
): Refusal[] => {
  const door = ob.door;
  const close = door.sym.VGT.ds.sCloseTime;
  const end = ob.result.endIndex;
  const date = (s: number) => door.dates[s]!;
  const dateT = (ds: { sCloseTime: ArrayLike<number> }, t: number) => {
    let s = 0;

    while (s < end && ds.sCloseTime[s]! < t) s++;
    return date(s);
  };
  const out: Refusal[] = [];

  for (const f of ob.result.funding) {
    if (f.outcome !== 'refused' || f.reason !== 'slot occupied') continue;

    const book = ob.books.find((x) => x.book === f.book)!;
    const v = book.trades.find((t) => t.id === f.trade)!;
    const iv = virtualInterval(v);
    const occ = occupiedAt(ob, f.t);

    if (!occ) throw new Error(`${f.book} trade ${f.trade} refused at ${f.t} with nothing occupying the slot`);
    if (occ.lot.book !== f.occupantBook) throw new Error(`${f.book} trade ${f.trade}: occupant mismatch`);

    const sym = symbolOf(f.book);
    const ds = door.sym[sym].ds;
    const vSessions = closesIn(close, end, iv);
    let blocked = 0;
    let reoccupied = 0;
    let idle = 0;
    const by = new Map<number, Refusal['reoccupiedBy'][number]>();
    const idleSet = new Set<number>();

    for (const s of vSessions) {
      const o = occupiedAt(ob, close[s]!);

      if (!o) {
        idle++;
        idleSet.add(s);
      } else if (o.lot === occ.lot) blocked++;
      else {
        reoccupied++;
        by.set(o.lot.id, {
          book: o.lot.book,
          lot: o.lot.id,
          entry: dateT(ds, o.lot.entryT),
          exit: o.lot.open ? null : dateT(door.sym[o.lot.symbol].ds, o.lot.fills.at(-1)!.t)
        });
      }
    }

    const i = book.trades.indexOf(v);
    const next = book.trades[i + 1] ?? null;
    const vExitS = v.eS < 0 || v.open || v.fills.length === 0 ? null : v.fills.at(-1)!.s;
    const crossings: IdleCrossing[] = [];
    let idleCondition: number | null = null;
    const g = ob.growth[f.book];

    if (g && idleSet.size) {
      for (const e of g.run.simulation.log.entries as unknown as {
        event: string;
        session: number;
        t: number;
        disposition?: string;
        reason?: string;
      }[]) {
        if (e.event !== 'base_signal' || !idleSet.has(e.session) || !covers(iv, e.t)) continue;

        let gates = 'not checked';

        if (gateChecks) {
          const { cfg, fr } = growthConfigFor(ob.quad, sym, ob.options);
          const params = growthParamsOf(cfg, sym, door);
          const one = simulateGrowthWith(door.sym[sym], params, {
            friction: fr,
            keep: (d: EntryDecision) => d.time === e.t
          });

          counters.books++;
          counters.gateChecks++;

          const o = one.simulation.outcomes[0];

          gates = !o
            ? 'no decision'
            : o.status === 'filled' || o.status === 'unfilled_at_end'
              ? 'pass'
              : o.status === 'deferred'
                ? `blocked: ${o.reason} (an eligibility opportunity would arm: unresolved)`
                : `blocked: ${o.reason}`;
        }

        crossings.push({
          date: date(e.session),
          t: e.t,
          disposition: `${e.disposition}${e.reason ? `: ${e.reason}` : ''}`,
          gatesAtOwnInstant: gates
        });
      }

      if (g.run.rise) {
        // closes at or above the Rise threshold inside the idle overlap (the scanner's own condition, per session)
        const bars = door.sym[sym].bars;
        const p = {
          advanceFromRecentLowPercent: Number(ob.quad.g[sym].advanceFromRecentLowPercent),
          recentLowLookbackBars: Number(ob.quad.g[sym].recentLowLookbackBars)
        };
        const at = (s: number) => {
          const k = bars.findIndex((x) => x.sessionIndex >= s);

          return k < 0 ? bars.length : k;
        };

        idleCondition = 0;
        for (const s of idleSet) {
          const a = scanRiseFromRecentLowCached(bars, p, at(s));
          const z = s + 1 > end ? { barsAtOrAboveThreshold: 0 } : scanRiseFromRecentLowCached(bars, p, at(s + 1));

          idleCondition += a.barsAtOrAboveThreshold - z.barsAtOrAboveThreshold;
        }
      }
    }

    out.push({
      book: f.book,
      trade: f.trade,
      kind: f.kind,
      decision: date(f.s),
      decisionT: f.t,
      decisionS: f.s,
      virtualEntry: v.eS >= 0 ? date(v.eS) : null,
      virtualExit: vExitS === null ? null : date(vExitS),
      virtualNet: r2(v.vNet),
      occupant: occ.lot.book,
      occupantKind: occ.lot.entryT > f.t ? 'reservation' : 'lot',
      occupantLot: occ.lot.id,
      occupantRelease: occ.lot.open ? null : dateT(door.sym[occ.lot.symbol].ds, occ.lot.fills.at(-1)!.t),
      virtualSessions: vSessions.length,
      blockedSessions: blocked,
      reoccupiedSessions: reoccupied,
      idleOverlapSessions: idle,
      reoccupiedBy: [...by.values()],
      nextDecision: next ? date(next.dS) : null,
      sessionsToNextDecision: next && vExitS !== null ? next.dS - vExitS : null,
      idleCrossings: crossings,
      idleConditionSessions: idleCondition
    });
  }

  return out;
};

// ----- the drawdown episode, decomposed by lot (reconciled to the tracker) -----

const sessionOfTime = (ds: { sCloseTime: ArrayLike<number> }, last: number, t: number) => {
  let lo = 0;
  let hi = last;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;

    if (ds.sCloseTime[mid]! < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

// The marked value of one lot at the tracker instant t (the pool's own order: decisions, exits at t, fills at t, then
// the mark; a bar start marks at that bar's close, a session close at the closing print).
export const lotValueAt = (ob: Observed, lot: Lot, t: number, rate = 0.11) => {
  if (t < lot.entryT) return 0;

  const ds = ob.door.sym[lot.symbol].ds;
  let realized = 0;
  let shares = lot.shares0;
  let principal = lot.principal0;
  let done = false;

  for (const f of lot.fills) {
    if (f.t > t) break;
    realized += f.net;
    if (f.partial) {
      shares = shares - f.shares;
      principal = principal - f.principal;
    } else {
      done = true;
      shares = 0;
      principal = 0;
    }
  }

  if (done) return realized;

  const s = sessionOfTime(ds, ob.result.endIndex, t);
  let price: number;

  if (ds.sCloseTime[s] === t) price = ds.sClose[s]!;
  else {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    let k = -1;

    for (let j = 0; j < count; j++)
      if (ds.bTime[start + j] === t) {
        k = j;
        break;
      }
    if (k < 0) {
      // the lot's symbol did not print at t: its latest print before t
      for (let j = count - 1; j >= 0; j--)
        if (ds.bTime[start + j]! < t) {
          k = j;
          break;
        }
    }
    price = k >= 0 ? ds.bClose[start + k]! : ds.sClose[Math.max(0, s - 1)]!;
  }

  return realized + (shares * price - principal - principal * rate * ((ds.sTime[s]! - lot.entryTs) / secondsPerYear));
};

export interface DdEpisode {
  dd: number;
  peak: string;
  trough: string;
  recovery: string | null;
  reconciled: number; // Σ lot contributions + DD (≈ 0)
  lots: { lot: number; book: BookId; entry: string; exit: string | null; contribution: number; net: number }[];
  dominant: BookId | null;
}

export const ddEpisodeOf = (ob: Observed, rate = 0.11): DdEpisode => {
  const r = ob.result;
  const fmt = (t: number) =>
    Number.isFinite(t) ? new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ') + 'Z' : null;
  const lots = r.lots
    .map((lot) => ({
      lot,
      contribution: lotValueAt(ob, lot, r.dd.troughT, rate) - lotValueAt(ob, lot, r.dd.peakT, rate)
    }))
    .filter((x) => Math.abs(x.contribution) > 1e-9);
  const sum = lots.reduce((a, x) => a + x.contribution, 0);
  const dominant = [...lots].sort((a, b) => a.contribution - b.contribution)[0];

  return {
    dd: r2(r.dd.max),
    peak: fmt(r.dd.peakT)!,
    trough: fmt(r.dd.troughT)!,
    recovery: fmt(r.dd.recoveryT),
    reconciled: Math.round((sum + r.dd.max) * 1e6) / 1e6,
    lots: lots.map((x) => ({
      lot: x.lot.id,
      book: x.lot.book,
      entry: fmt(x.lot.entryT)!,
      exit: x.lot.open ? null : fmt(x.lot.fills.at(-1)!.t),
      contribution: r2(x.contribution),
      net: r2(x.lot.net)
    })),
    dominant: dominant && dominant.contribution < 0 ? dominant.lot.book : null
  };
};

// ----- the first divergence of a ledger from a reference ledger -----

export interface Divergence {
  kind:
    | 'same ledger'
    | 'changed exit (longer hold)'
    | 'changed exit (shorter hold)'
    | 'changed exit (partial sales)'
    | 'admitted (refused in the reference)'
    | 'displaced (refused here)'
    | 'changed signal (new decision)'
    | 'changed signal (reference decision absent)';
  book: BookId | null;
  date: string | null;
  detail: string;
}

const lotKey = (l: Lot) => `${l.book}|${l.entryT}`;
const exitsOf = (l: Lot) => l.fills.map((f) => `${f.t}${f.partial ? 'p' : ''}`).join('/') + (l.open ? '|open' : '');

export const divergenceOf = (ob: Observed, ref: Observed): Divergence => {
  const a = [...ob.result.lots].sort((x, y) => x.entryT - y.entryT || x.id - y.id);
  const b = [...ref.result.lots].sort((x, y) => x.entryT - y.entryT || x.id - y.id);
  const fmt = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
  const refused = (o: Observed, book: BookId, dT: number) =>
    o.result.funding.some((f) => f.book === book && f.t === dT && f.outcome === 'refused');
  const decided = (o: Observed, book: BookId, dT: number) =>
    o.books.find((x) => x.book === book)?.trades.some((t) => t.dT === dT) ?? false;

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];

    if (x && y && lotKey(x) === lotKey(y)) {
      if (exitsOf(x) === exitsOf(y)) continue;

      const ex = x.open ? Infinity : x.fills.at(-1)!.t;
      const ey = y.open ? Infinity : y.fills.at(-1)!.t;

      return {
        kind:
          ex > ey
            ? 'changed exit (longer hold)'
            : ex < ey
              ? 'changed exit (shorter hold)'
              : 'changed exit (partial sales)',
        book: x.book,
        date: fmt(x.entryT),
        detail: `${x.book} lot entered ${fmt(x.entryT)}: exit ${Number.isFinite(ex) ? fmt(ex) : 'open'} vs ${Number.isFinite(ey) ? fmt(ey) : 'open'}`
      };
    }

    // the earlier of the two differing lots decides the kind
    const first = !y || (x && x.entryT < y.entryT) ? { lot: x!, here: true } : { lot: y, here: false };
    const l = first.lot;

    if (first.here)
      return {
        kind: refused(ref, l.book, l.trade.dT)
          ? 'admitted (refused in the reference)'
          : 'changed signal (new decision)',
        book: l.book,
        date: fmt(l.entryT),
        detail: `${l.book} funded ${fmt(l.entryT)} here${decided(ref, l.book, l.trade.dT) ? '' : ' (no such decision in the reference book)'}`
      };

    return {
      kind: refused(ob, l.book, l.trade.dT) ? 'displaced (refused here)' : 'changed signal (reference decision absent)',
      book: l.book,
      date: fmt(l.entryT),
      detail: `the reference's ${l.book} lot of ${fmt(l.entryT)} is not funded here`
    };
  }

  return { kind: 'same ledger', book: null, date: null, detail: '' };
};

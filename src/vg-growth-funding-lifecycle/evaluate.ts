// One evaluation under a lifecycle (PROTOCOL.md §6–§7): the coupled pooled run, Priority 3's compact record (`recordOf`,
// unchanged: net, realized/unrealized, minute DD with its instants, lots, wins/losses, partials, interest, costs,
// per-book booked P&L and principal-days, sessions held, years, periods, ledger signature) and this study's lifecycle
// summary: pool time (held / reserved only / idle closes), the Growth requests by kind and outcome, the L2 retained
// outcomes, and (L0) the unfunded virtual holds with their idle overlap. Centres also keep their ledger, the Growth
// request log and the retained opportunities' transitions.
import type { Dataset } from '../four-family/data.ts';
import { type BookId, type VBook, bookIds, familyOf } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import { runCoupled } from './coupled.ts';
import { type LifeBook, isPhantom, lifeBookOf } from './growthBook.ts';
import type { LifeOutcome, LifeSimulation, Mode, RetainedEnd } from './lifecycle.ts';
import type { VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import { r2 } from './context.ts';

export interface PoolTime {
  sessions: number;
  held: number; // closes at which a funded lot is open
  reservedOnly: number; // closes with an order granted and not yet filled, no lot open
  idle: number; // neither
}

export interface BookSummary {
  records: number; // pool records of the book (L0: its virtual trades; L1/L2: its requests incl. L2 waiting checks)
  granted: number;
  refused: number; // L0: unfunded virtual trades; L1/L2: refused requests
  waiting: number; // L2: reassessments that found the slot occupied (no order)
  byKind: Record<string, { granted: number; refused: number; waiting: number }>; // base | continuation | retained (L0: base | continuation)
  retained: Partial<Record<RetainedEnd, number>>;
  retainedWaits: number;
  lots: number;
  booked: number;
  virtualHolds: { trades: number; closes: number; idleCloses: number }; // L0: refused virtual trades' holds
}

export interface Summary {
  mode: Mode;
  rounds: number;
  growthSims: number;
  pool: PoolTime;
  windows: { development: PoolTime; validation: PoolTime } | null; // FULL runs with the boundary
  periodDd: { dd: number; peak: string | null; trough: string | null; recovery: string | null }[]; // reset DD after each boundary
  books: Partial<Record<BookId, BookSummary>>;
}

const closeTimes = (door: Door) => door.sym.VGT.ds.sCloseTime;
const iso = (t: number) => (Number.isFinite(t) ? new Date(t * 1000).toISOString().slice(0, 16) : null);

// The granted records' reservation spans [decision, fill) (a never-filled order: to the end).
const reservations = (r: PoolResult) => {
  const lots = new Map(r.lots.map((l) => [`${l.book}#${l.trade.id}`, l]));

  return r.funding
    .filter((f) => f.outcome === 'granted')
    .map((f) => {
      const lot = lots.get(`${f.book}#${f.trade}`);

      return { from: f.t, to: lot ? lot.entryT : Infinity };
    });
};

export const poolTimeOf = (door: Door, r: PoolResult, from = 0, to = r.endIndex): PoolTime => {
  const close = closeTimes(door);
  const spans = reservations(r);
  let held = 0;
  let reservedOnly = 0;

  for (let s = from; s <= to; s++) {
    if (r.heldAtClose[s]! >= 0) held++;
    else if (spans.some((x) => close[s]! >= x.from && close[s]! < x.to)) reservedOnly++;
  }

  return { sessions: to - from + 1, held, reservedOnly, idle: to - from + 1 - held - reservedOnly };
};

// An L0 pool record's kind: the virtual trade's setup kind (the base entry or a continuation method).
const l0Kind = (kind: string) => (kind === 'rise' || kind === 'trend_breakout' ? 'base' : 'continuation');

export const summaryOf = (
  door: Door,
  mode: Mode,
  c: {
    books: VBook[];
    result: PoolResult;
    rounds: number;
    growthSims: number;
    life: Partial<Record<BookId, LifeOutcome>>;
  },
  boundary: number | null
): Summary => {
  const r = c.result;
  const close = closeTimes(door);
  const spans = reservations(r);
  const idleAt = (s: number) => r.heldAtClose[s]! < 0 && !spans.some((x) => close[s]! >= x.from && close[s]! < x.to);
  const books: Partial<Record<BookId, BookSummary>> = {};

  for (const b of bookIds) {
    if (familyOf(b) !== 'G') continue;

    const vb = c.books.find((x) => x.book === b);

    if (!vb) continue;

    const recs = r.funding.filter((f) => f.book === b);
    const byKind: BookSummary['byKind'] = {};
    const life = c.life[b];
    const lots = r.lots.filter((l) => l.book === b);
    const s: BookSummary = {
      records: recs.length,
      granted: 0,
      refused: 0,
      waiting: 0,
      byKind,
      retained: {},
      retainedWaits: 0,
      lots: lots.length,
      booked: r2(lots.reduce((a, l) => a + l.net, 0)),
      virtualHolds: { trades: 0, closes: 0, idleCloses: 0 }
    };

    if (mode === 'L0') {
      for (const f of recs) {
        const k = l0Kind(f.kind);
        const x = (byKind[k] ??= { granted: 0, refused: 0, waiting: 0 });

        if (f.outcome === 'granted') {
          s.granted++;
          x.granted++;
        } else {
          s.refused++;
          x.refused++;

          // the refused virtual trade's own hold: decision → final virtual exit (or the end)
          const v = vb.trades.find((t) => t.dT === f.t)!;
          const end = v.fills.length && !v.open ? v.fills.at(-1)!.t : Infinity;

          s.virtualHolds.trades++;
          for (let i = f.s; i <= r.endIndex; i++) {
            if (close[i]! < f.t) continue;
            if (close[i]! > end) break;
            s.virtualHolds.closes++;
            if (idleAt(i)) s.virtualHolds.idleCloses++;
          }
        }
      }
    } else {
      for (const q of life!.requests) {
        const x = (byKind[q.kind] ??= { granted: 0, refused: 0, waiting: 0 });

        x[q.outcome]++;
        s[q.outcome]++;
      }
      for (const x of life!.retained) {
        s.retained[x.end ?? 'end_of_data'] = (s.retained[x.end ?? 'end_of_data'] ?? 0) + 1;
        s.retainedWaits += x.waits;
      }
      if (recs.length !== life!.requests.length) throw new Error(`${b}: pool records differ from requests`);
      if (r.lots.some((l) => isPhantom(l.trade))) throw new Error('a phantom lot');
    }

    books[b] = s;
  }

  return {
    mode,
    rounds: c.rounds,
    growthSims: c.growthSims,
    pool: poolTimeOf(door, r),
    windows:
      boundary === null
        ? null
        : { development: poolTimeOf(door, r, 0, boundary), validation: poolTimeOf(door, r, boundary + 1, r.endIndex) },
    periodDd: r.periods.map((p) => ({
      dd: r2(p.dd.max),
      peak: iso(p.dd.peakT),
      trough: iso(p.dd.troughT),
      recovery: iso(p.dd.recoveryT)
    })),
    books
  };
};

// ----- the centre detail -----

const date = (ds: Dataset, s: number) => ds.dates[s] ?? null;

// The source of each Growth request or lot, by its decision instant: crossing | latched | renewal | release (eligibility),
// breakout (the breakout entry), a continuation method, or retained (L2) — from the book's own simulation.
export const sourcesOf = (sim: LifeSimulation, life: LifeOutcome | null) => {
  const out = new Map<number, string>();
  const g = sim.gates;
  const isBase = (k: string) => k === 'rise' || k === 'trend_breakout';
  const base = (t: VirtualTrade) => {
    const d = g?.decisionOf(t);

    if (d) return d.via === 'drawdown_release' ? 'release' : d.kind;
    return String(t.setupKind) === 'trend_breakout' ? 'breakout' : 'crossing';
  };

  for (const t of sim.trades) out.set(t.decisionTime, isBase(String(t.setupKind)) ? base(t) : String(t.setupKind));
  for (const q of life?.requests ?? [])
    out.set(
      q.t,
      q.kind === 'retained'
        ? 'retained'
        : q.kind === 'continuation'
          ? q.setupKind
          : q.trade
            ? base(q.trade)
            : 'crossing'
    );
  return out;
};

export const ledgerOf = (door: Door, r: PoolResult, sources: Map<BookId, Map<number, string>> = new Map()) =>
  r.lots.map((l) => ({
    lot: l.id,
    book: l.book,
    kind: l.trade.kind,
    source: sources.get(l.book)?.get(l.trade.dT) ?? (l.family === 'D1' ? l.trade.kind : null),
    decision: iso(l.trade.dT),
    entry: iso(l.entryT),
    entryDate: date(door.sym[l.symbol].ds, l.entryS),
    entryRaw: l.entryRaw,
    entryPrice: l.entryPrice,
    principal: r2(l.principal0),
    exits: l.fills.map((f) => ({
      t: iso(f.t),
      date: date(door.sym[l.symbol].ds, f.s),
      raw: f.raw,
      partial: f.partial,
      reason: f.reason,
      net: r2(f.net)
    })),
    open: l.open,
    net: r2(l.net),
    interest: r2(l.interest),
    costs: r2(l.costs)
  }));

export const requestsOf = (door: Door, life: LifeOutcome | undefined, sources?: Map<number, string>) =>
  (life?.requests ?? []).map((q) => ({
    t: iso(q.t),
    date: door.dates[q.s],
    kind: q.kind,
    source: sources?.get(q.t) ?? null,
    setupKind: q.setupKind,
    price: q.price,
    outcome: q.outcome,
    retained: q.retained,
    trade: q.trade?.id ?? null
  }));

export const retainedOf = (door: Door, life: LifeOutcome | undefined) =>
  (life?.retained ?? []).map((x) => ({
    id: x.id,
    origin: x.origin,
    refused: iso(x.refusedTime),
    refusedDate: door.dates[x.refusedSession],
    refusedPrice: x.refusedPrice,
    cap: r2(x.refusedPrice * 1.05 * 1e4) / 1e4,
    policy: x.policy,
    bound: door.dates[x.bound] ?? `session ${x.bound} (past the door)`,
    evaluations: x.evaluations,
    blocked: x.blocked,
    waits: x.waits,
    end: x.end,
    endDate: x.endSession >= 0 ? door.dates[x.endSession] : null,
    endReason: x.endReason,
    entryTrade: x.entryTrade?.id ?? null,
    transitions: x.transitions.map((t) => ({ t: iso(t.t), date: door.dates[t.s], event: t.event, reason: t.reason }))
  }));

export const growthFundingOf = (r: PoolResult) =>
  r.funding
    .filter((f) => familyOf(f.book) === 'G')
    .map((f) => ({ book: f.book, t: iso(f.t), kind: f.kind, outcome: f.outcome, occupant: f.occupant || null }));

// ----- one evaluation -----

export interface Output {
  rec: Rec;
  summary: Summary;
  detail?: {
    ledger: ReturnType<typeof ledgerOf>;
    funding: ReturnType<typeof growthFundingOf>;
    requests: Partial<Record<BookId, ReturnType<typeof requestsOf>>>;
    retained: Partial<Record<BookId, ReturnType<typeof retainedOf>>>;
  };
}

export const evaluateLife = (
  door: Door,
  quad: Quad,
  options: EvalOptions,
  mode: Mode,
  o: { detail?: boolean; boundary?: string | null; noGuess?: boolean } = {}
): Output => {
  const opts: EvalOptions = o.boundary ? { ...options, boundaries: [o.boundary] } : options;
  const c = runCoupled(door, quad, opts, mode, { noGuess: o.noGuess });
  const rec = recordOf(door, quad, { books: c.books, result: c.result }, opts);
  const boundary = o.boundary ? door.dates.indexOf(o.boundary) : null;
  const summary = summaryOf(door, mode, c, boundary);

  if (!o.detail) return { rec, summary };

  // the Growth books' simulations (L0: the lifecycle engine in L0 mode, identical to the canonical books, stage V6)
  const sources = new Map<BookId, Map<number, string>>();

  for (const b of c.books) {
    if (!b.book.startsWith('G:')) continue;

    const sym = b.book.slice(2) as 'GDX' | 'VGT';
    const lb = 'simulation' in b ? (b as LifeBook) : lifeBookOf(door.sym[sym], door, quad.g[sym], 'L0', () => true);

    sources.set(b.book, sourcesOf(lb.simulation, lb.life));
  }

  return {
    rec,
    summary,
    detail: {
      ledger: ledgerOf(door, c.result, sources),
      funding: growthFundingOf(c.result),
      requests: Object.fromEntries(
        Object.entries(c.life).map(([b, l]) => [b, requestsOf(door, l, sources.get(b as BookId))])
      ),
      retained: Object.fromEntries(Object.entries(c.life).map(([b, l]) => [b, retainedOf(door, l)]))
    }
  };
};

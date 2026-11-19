// One complete pooled evaluation (PROTOCOL.md §6–§7): the four virtual books (cached by their own parameters within a
// process, bounded), the pooled replay, and the compact record every search, qualification and report reads.
import { createHash } from 'node:crypto';
import type { Dataset } from '../four-family/data.ts';
import { type PoolOptions, type PoolResult, runPool } from './pool.ts';
import {
  type BookId,
  type Family,
  type Friction,
  type VBook,
  baseFriction,
  bookIds,
  d1KeyOf,
  familyOf,
  growthKeyOf,
  runD1Book,
  runGrowthBook,
  symbolOf
} from './books.ts';
import { type Sym, economics, r2, resources, symbols } from './context.ts';
import { type Door, indexOnOrAfter } from './data.ts';
import { type Quad, quadId } from './space.ts';

// The evaluation's conventions beyond the configuration (all fixed in the study's primary runs).
export interface EvalOptions {
  friction?: Partial<Friction>; // stresses: costs, interest, stop fill, stop slippage
  d1Arm?: 'harmonized' | 'native'; // D1 arming: from 2016-01-04 (each indicator's own history) or Study 8's 2017-06-15
  fundFrom?: string; // the funding start date (default 2016-01-04)
  enabled?: Partial<Record<BookId, boolean>>; // controls, removal reruns (a disabled book is never run or funded)
  wholeShares?: boolean;
  blackouts?: { first: string; last: string }[];
  boundaries?: string[]; // period boundary dates (report: P&L after each boundary close, reset drawdowns)
  tieOrder?: BookId[]; // diagnostics only: an explicit same-instant order (default: the frozen order of `first`)
}

export const enabledKey = (o: EvalOptions) => bookIds.map((b) => (o.enabled?.[b] === false ? 0 : 1)).join('');

export const optionsKey = (o: EvalOptions = {}) => {
  const f = { ...baseFriction, ...(o.friction ?? {}) };
  const parts = [
    `c${f.costBps}`,
    `r${f.rate}`,
    `s${f.stopFill}`,
    `sl${f.stopSlippageBps}`,
    `arm${o.d1Arm ?? 'harmonized'}`,
    `ff${o.fundFrom ?? '-'}`,
    `en${enabledKey(o)}`,
    `ws${o.wholeShares ? 1 : 0}`,
    `bo${(o.blackouts ?? []).map((b) => `${b.first}:${b.last}`).join(';')}`,
    `bd${(o.boundaries ?? []).join(';')}`,
    ...(o.tieOrder ? [`to${o.tieOrder.join(';')}`] : [])
  ];

  return parts.join('|');
};

export const evalKey = (door: string, q: Quad, o: EvalOptions = {}) => `${door}|${optionsKey(o)}|${quadId(q)}`;

// ----- the bounded book cache (per process, per book) -----

class BookCache {
  private readonly map = new Map<string, VBook>();
  hits = 0;
  misses = 0;

  constructor(readonly capacity: number) {}

  get(key: string, make: () => VBook) {
    const v = this.map.get(key);

    if (v) {
      this.hits++;
      this.map.delete(key);
      this.map.set(key, v);
      return v;
    }

    this.misses++;

    const made = make();

    this.map.set(key, made);
    while (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value!);
    return made;
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}

export const caches: Record<BookId, BookCache> = {
  'D1:GDX': new BookCache(resources.bookCacheEntries),
  'D1:VGT': new BookCache(resources.bookCacheEntries),
  'G:GDX': new BookCache(resources.bookCacheEntries),
  'G:VGT': new BookCache(resources.bookCacheEntries)
};

const frictionOf = (o: EvalOptions): Friction => ({ ...baseFriction, ...(o.friction ?? {}) });

// Growth's optional exit rules (initial risk stop, retention) assume stops filled at the stop level: under the
// next-open stress such a Growth book keeps stop-level fills (recorded as not applicable to it).
export const growthNextOpenSupported = (g: Quad['g'][Sym]) =>
  g.initialStopEnabled !== true && g.retentionEnabled !== true;

export const isEnabled = (o: EvalOptions, b: BookId) => o.enabled?.[b] !== false;

export const booksOf = (door: Door, q: Quad, o: EvalOptions = {}): VBook[] => {
  const fr = frictionOf(o);
  const fk = (f: Friction) => `${door.name}|${f.costBps}|${f.rate}|${f.stopFill}|${f.stopSlippageBps}`;
  const out: VBook[] = [];

  for (const b of bookIds) {
    if (!isEnabled(o, b)) continue; // a disabled component is not needed (its decisions would all be refused)

    const s = symbolOf(b);
    const sd = door.sym[s];
    const end = sd.ds.sessionCount - 1;

    if (familyOf(b) === 'D1') {
      const armStart = o.d1Arm === 'native' ? indexOnOrAfter(door, '2017-06-15') : 0;

      out.push(
        caches[b].get(`${fk(fr)}|${armStart}|${d1KeyOf(q.d1[s])}`, () =>
          runD1Book(sd.ds, s, q.d1[s], { armStart, accountingStart: 0, endIndex: end, friction: fr })
        )
      );
    } else {
      const g = q.g[s];
      const gfr: Friction =
        fr.stopFill === 'next-open' && !growthNextOpenSupported(g) ? { ...fr, stopFill: 'stop' } : fr;

      out.push(
        caches[b].get(`${fk(gfr)}|${growthKeyOf(g)}`, () =>
          runGrowthBook(sd, door, g, { friction: gfr, costBps: gfr.costBps })
        )
      );
    }
  }

  return out;
};

export const datasetsOf = (door: Door): Record<Sym, Dataset> => ({ GDX: door.sym.GDX.ds, VGT: door.sym.VGT.ds });

export const poolOptionsOf = (door: Door, o: EvalOptions = {}, detail = false): PoolOptions => ({
  rate: frictionOf(o).rate,
  fundFrom: o.fundFrom ? indexOnOrAfter(door, o.fundFrom) : 0,
  enabled: o.enabled,
  wholeShares: o.wholeShares,
  blackouts: (o.blackouts ?? []).map((b) => ({
    first: indexOnOrAfter(door, b.first),
    last: indexOnOrAfter(door, b.last)
  })),
  tieOrder: o.tieOrder,
  periods: (o.boundaries ?? []).map((d) => {
    const i = door.dates.indexOf(d);

    if (i < 0) throw new Error(`boundary ${d} is not a session of ${door.name}`);
    return i;
  }),
  detail
});

export const run = (door: Door, q: Quad, o: EvalOptions = {}, detail = false, recordMarks = false) => {
  const books = booksOf(door, q, o);
  const result = runPool(datasetsOf(door), books, q.first, {
    ...poolOptionsOf(door, o, detail),
    recordMarks,
    endIndex: door.sessions - 1
  });

  return { books, result };
};

// ----- the compact record -----

export interface CompStats {
  lots: number;
  wins: number;
  losses: number;
  booked: number; // booked P&L (realized + marked remainder), after costs and interest
  principalDays: number; // Σ outstanding principal × calendar days held, $·days
  partials: number; // partial exits (retention), counted apart from full episodes
  open: number;
  decisions: number;
  granted: number;
  refused: number;
}

export interface VStats {
  trades: number;
  net: number;
  dd: number;
  first: string | null;
}

export interface Rec {
  id: string;
  net: number;
  realized: number;
  unrealized: number;
  dd: number;
  ddPeakT: number;
  ddTroughT: number;
  ddRecoveryT: number;
  ddDaily: number;
  lots: number;
  wins: number;
  losses: number;
  partials: number;
  lossSum: number;
  worstLoss: number;
  largestWin: number;
  interest: number;
  costs: number;
  books: Record<BookId, CompStats>;
  fam: Record<Family, CompStats>;
  mixed: boolean; // both families received capital
  funded: BookId[]; // the components that received capital
  sessionsHeld: number;
  peakPrincipal: number;
  peakValue: number;
  years: Record<string, number>;
  periods: { boundary: string; equity: number; after: number; dd: number }[];
  topEpisode: number;
  topEpisodeShare: number;
  episodes: number;
  signature: string; // sha256(16) of the funded-lot ledger
  virtual: Partial<Record<BookId, VStats>>; // the virtual books' standalone figures (absent: disabled)
  sessions: number;
  error?: string;
}

const days = (ds: Dataset, a: number, b: number) => (ds.sTime[b]! - ds.sTime[a]!) / 86400;

export const signatureOf = (r: PoolResult) =>
  createHash('sha256')
    .update(
      r.lots
        .map(
          (l) =>
            `${l.book},${l.entryT},${Math.round(l.principal0 * 100)},${l.fills.map((f) => `${f.t}:${f.partial ? 'p' : 'f'}`).join('/')}${l.open ? ',open' : ''}`
        )
        .join(';')
    )
    .digest('hex')
    .slice(0, 16);

// Pool-level episodes (market moves): funded lots in entry order; a new episode starts when an entry is more than 10
// sessions after the latest exit so far (an open lot continues its episode).
export const episodesOf = (r: PoolResult) => {
  const lots = [...r.lots].sort((a, b) => a.entryT - b.entryT || a.id - b.id);
  const out: { first: number; last: number; net: number; lots: number }[] = [];
  let lastExit = -Infinity;

  for (const l of lots) {
    const exitS = l.open ? Infinity : l.fills.at(-1)!.s;

    if (out.length === 0 || l.entryS - lastExit > 10) out.push({ first: l.entryS, last: exitS, net: 0, lots: 0 });

    const e = out.at(-1)!;

    e.net += l.net;
    e.lots++;
    e.last = Math.max(e.last, exitS);
    lastExit = Math.max(lastExit, exitS);
  }

  return out;
};

export const recordOf = (door: Door, q: Quad, x: ReturnType<typeof run>, o: EvalOptions = {}): Rec => {
  const { result: r, books } = x;
  const ds = door.sym.VGT.ds;
  const comp = (pred: (b: BookId) => boolean): CompStats => {
    const lots = r.lots.filter((l) => pred(l.book));
    const closed = lots.filter((l) => !l.open);
    let principalDays = 0;

    for (const l of lots) {
      let p = l.principal0;
      let from = l.entryS;

      for (const fill of l.fills) {
        principalDays += p * days(ds, from, fill.s);
        p -= fill.principal;
        from = fill.s;
      }
      if (l.open) principalDays += p * days(ds, from, r.endIndex);
    }

    const ids = bookIds.filter(pred);

    return {
      lots: lots.length,
      wins: closed.filter((l) => l.net > 0).length,
      losses: closed.filter((l) => l.net < 0).length,
      booked: r2(lots.reduce((a, l) => a + l.net, 0)),
      principalDays: Math.round(principalDays),
      partials: lots.reduce((a, l) => a + l.fills.filter((f) => f.partial).length, 0),
      open: lots.filter((l) => l.open).length,
      decisions: ids.reduce((a, b) => a + r.decisions[b].total, 0),
      granted: ids.reduce((a, b) => a + r.decisions[b].granted, 0),
      refused: ids.reduce((a, b) => a + r.decisions[b].refused, 0)
    };
  };
  const closed = r.lots.filter((l) => !l.open);
  const losing = closed.filter((l) => l.net < 0);
  const years: Record<string, number> = {};
  let prev = 0;

  for (let s = 0; s <= r.endIndex; s++) {
    const v = r.daily[s]!;

    if (Number.isNaN(v)) continue;

    const y = door.dates[s]!.slice(0, 4);

    years[y] = (years[y] ?? 0) + (v - prev);
    prev = v;
  }

  const eps = episodesOf(r);
  const winners = eps.filter((e) => e.net > 0).sort((a, b) => b.net - a.net);
  const net = r.net;
  const B = Object.fromEntries(bookIds.map((b) => [b, comp((x) => x === b)])) as Record<BookId, CompStats>;
  const F = { D1: comp((b) => familyOf(b) === 'D1'), G: comp((b) => familyOf(b) === 'G') };
  const virtual: Partial<Record<BookId, VStats>> = {};

  for (const b of books)
    virtual[b.book] = {
      trades: b.trades.length,
      net: r2(b.standalone.net),
      dd: r2(b.standalone.minuteDd),
      first: b.firstDecision
    };

  return {
    id: quadId(q),
    net: r2(net),
    realized: r2(r.realized),
    unrealized: r2(r.unrealized),
    dd: r2(r.dd.max),
    ddPeakT: r.dd.peakT,
    ddTroughT: r.dd.troughT,
    ddRecoveryT: r.dd.recoveryT,
    ddDaily: r2(r.ddDaily.max),
    lots: r.lots.length,
    wins: closed.filter((l) => l.net > 0).length,
    losses: losing.length,
    partials: r.lots.reduce((a, l) => a + l.fills.filter((f) => f.partial).length, 0),
    lossSum: r2(losing.reduce((a, l) => a + l.net, 0)),
    worstLoss: r2(Math.min(0, ...r.lots.map((l) => l.net))),
    largestWin: r2(Math.max(0, ...r.lots.map((l) => l.net))),
    interest: r2(r.lots.reduce((a, l) => a + l.interest, 0)),
    costs: r2(r.lots.reduce((a, l) => a + l.costs, 0)),
    books: B,
    fam: F,
    mixed: F.D1.lots > 0 && F.G.lots > 0,
    funded: bookIds.filter((b) => B[b].lots > 0),
    sessionsHeld: r.sessionsHeld,
    peakPrincipal: r2(r.peakPrincipal),
    peakValue: r2(r.peakValue),
    years: Object.fromEntries(Object.entries(years).map(([k, v]) => [k, r2(v)])),
    periods: r.periods.map((p, i) => ({
      boundary: (o.boundaries ?? [])[i] ?? String(p.boundary),
      equity: r2(p.equity),
      after: r2(net - p.equity),
      dd: r2(p.dd.max)
    })),
    topEpisode: r2(winners[0]?.net ?? 0),
    topEpisodeShare: net > 0 && winners[0] ? Math.round((winners[0].net / net) * 1e4) / 1e4 : NaN,
    episodes: eps.length,
    signature: signatureOf(r),
    virtual,
    sessions: door.sessions
  };
};

export const evaluate = (door: Door, q: Quad, o: EvalOptions = {}): Rec => recordOf(door, q, run(door, q, o), o);

export const ceiling = economics.ceiling;
export { symbols };

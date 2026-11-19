// One complete pooled evaluation (PROTOCOL.md §4–§6): both virtual books (cached by their own parameters within a
// process, bounded), the pooled replay, and the compact record every search, qualification and report reads.
import { createHash } from 'node:crypto';
import type { Dataset } from '../four-family/data.ts';
import { type PoolOptions, type PoolResult, runPool } from './allocator.ts';
import {
  type Family,
  type Friction,
  type VBook,
  baseFriction,
  d1KeyOf,
  growthKeyOf,
  runD1Book,
  runGrowthBook
} from './books.ts';
import { economics, r2, resources } from './context.ts';
import { type Door, indexOnOrAfter } from './data.ts';
import { type Joint, jointId } from './space.ts';

// The evaluation's conventions beyond the configuration (all fixed in the study's primary runs).
export interface EvalOptions {
  friction?: Partial<Friction>; // stresses: costs, interest, stop fill, stop slippage
  d1Arm?: 'harmonized' | 'native'; // D1 arming: from 2016-01-04 (each indicator's own history) or Study 8's 2017-06-15
  fundFrom?: string; // the funding start date (default 2016-01-04)
  enabled?: { D1: boolean; G: boolean }; // single-family controls and family removal
  wholeShares?: boolean;
  minimumAllocation?: number;
  blackouts?: { first: string; last: string }[];
  boundaries?: string[]; // period boundary dates (report: P&L after each boundary close, reset drawdowns)
}

export const optionsKey = (o: EvalOptions = {}) => {
  const f = { ...baseFriction, ...(o.friction ?? {}) };
  const parts = [
    `c${f.costBps}`,
    `r${f.rate}`,
    `s${f.stopFill}`,
    `sl${f.stopSlippageBps}`,
    `arm${o.d1Arm ?? 'harmonized'}`,
    `ff${o.fundFrom ?? '-'}`,
    `en${o.enabled ? `${o.enabled.D1 ? 1 : 0}${o.enabled.G ? 1 : 0}` : '11'}`,
    `ws${o.wholeShares ? 1 : 0}`,
    `min${o.minimumAllocation ?? '-'}`,
    `bo${(o.blackouts ?? []).map((b) => `${b.first}:${b.last}`).join(';')}`,
    `bd${(o.boundaries ?? []).join(';')}`
  ];

  return parts.join('|');
};

export const evalKey = (door: string, j: Joint, o: EvalOptions = {}) => `${door}|${optionsKey(o)}|${jointId(j)}`;

// ----- the bounded book cache (per process) -----

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

export const caches = {
  D1: new BookCache(resources.bookCacheEntries),
  G: new BookCache(resources.bookCacheEntries)
};

const frictionOf = (o: EvalOptions): Friction => ({ ...baseFriction, ...(o.friction ?? {}) });

// Growth's optional exit rules (initial risk stop, retention) assume stops filled at the stop level: under the
// next-open stress such a Growth book keeps stop-level fills (recorded as not applicable to it).
export const growthNextOpenSupported = (g: Joint['g']) => g.initialStopEnabled !== true && g.retentionEnabled !== true;

export const booksOf = (door: Door, j: Joint, o: EvalOptions = {}) => {
  const fr = frictionOf(o);
  const gfr: Friction = fr.stopFill === 'next-open' && !growthNextOpenSupported(j.g) ? { ...fr, stopFill: 'stop' } : fr;
  const fk = (f: Friction) => `${door.name}|${f.costBps}|${f.rate}|${f.stopFill}|${f.stopSlippageBps}`;
  const end = door.ds.sessionCount - 1;
  const armStart = o.d1Arm === 'native' ? indexOnOrAfter(door, '2017-06-15') : 0;
  // a disabled family is never funded: its book is not needed (its decisions would all be refused)
  const d1 =
    o.enabled?.D1 === false
      ? null
      : caches.D1.get(`${fk(fr)}|${armStart}|${d1KeyOf(j.d1)}`, () =>
          runD1Book(door.ds, j.d1, { armStart, accountingStart: 0, endIndex: end, friction: fr })
        );
  const g =
    o.enabled?.G === false
      ? null
      : caches.G.get(`${fk(gfr)}|${growthKeyOf(j.g)}`, () =>
          runGrowthBook(door, j.g, { friction: gfr, costBps: gfr.costBps })
        );

  return { d1, g };
};

export const poolOptionsOf = (door: Door, o: EvalOptions = {}, detail = false): PoolOptions => ({
  rate: frictionOf(o).rate,
  fundFrom: o.fundFrom ? indexOnOrAfter(door, o.fundFrom) : 0,
  enabled: o.enabled,
  wholeShares: o.wholeShares,
  minimumAllocation: o.minimumAllocation,
  blackouts: (o.blackouts ?? []).map((b) => ({
    first: indexOnOrAfter(door, b.first),
    last: indexOnOrAfter(door, b.last)
  })),
  periods: (o.boundaries ?? []).map((d) => {
    const i = door.ds.dates.indexOf(d);

    if (i < 0) throw new Error(`boundary ${d} is not a session of ${door.name}`);
    return i;
  }),
  detail
});

export const run = (door: Door, j: Joint, o: EvalOptions = {}, detail = false, recordMarks = false) => {
  const { d1, g } = booksOf(door, j, o);
  const result = runPool(door.ds, d1, g, j.a, {
    ...poolOptionsOf(door, o, detail),
    recordMarks,
    endIndex: door.ds.sessionCount - 1
  });

  return { d1, g, result };
};

// ----- the compact record -----

export interface FamilyStats {
  lots: number;
  wins: number;
  losses: number;
  booked: number; // the family's booked P&L (realized + marked remainder), after costs and interest
  principalDays: number; // Σ outstanding principal × calendar days held, $·days
  partials: number;
  open: number;
  decisions: number;
  granted: number;
  downsized: number;
  refused: number;
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
  lossSum: number; // Σ net of losing closed lots
  worstLoss: number;
  largestWin: number;
  interest: number;
  costs: number;
  fam: Record<Family, FamilyStats>;
  mixed: boolean; // both families received capital
  minimumBinds: number;
  sessionsHeld: number;
  sessionsBoth: number;
  peakPrincipal: number;
  peakValue: number;
  years: Record<string, number>; // marked P&L per calendar year
  periods: { boundary: string; equity: number; after: number; dd: number }[];
  topEpisode: number; // the largest winning pool-level episode's net
  topEpisodeShare: number;
  episodes: number;
  signature: string; // sha256(16) of the funded-lot ledger
  vD1: { trades: number; net: number; dd: number; first: string | null } | null; // the virtual book (null: disabled)
  vG: { trades: number; net: number; dd: number; first: string | null } | null;
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
            `${l.family},${l.entryT},${Math.round(l.principal0 * 100)},${l.fills.map((f) => `${f.t}:${f.partial ? 'p' : 'f'}`).join('/')}${l.open ? ',open' : ''}`
        )
        .join(';')
    )
    .digest('hex')
    .slice(0, 16);

// Pool-level episodes (market moves): funded lots of either family in entry order; a new episode starts when an
// entry is more than 10 sessions after the latest exit so far (an open lot continues its episode).
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

export const recordOf = (door: Door, j: Joint, x: ReturnType<typeof run>, o: EvalOptions = {}): Rec => {
  const { result: r, d1, g } = x;
  const ds = door.ds;
  const fam = (f: Family): FamilyStats => {
    const lots = r.lots.filter((l) => l.family === f);
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

    return {
      lots: lots.length,
      wins: closed.filter((l) => l.net > 0).length,
      losses: closed.filter((l) => l.net < 0).length,
      booked: r2(lots.reduce((a, l) => a + l.net, 0)),
      principalDays: Math.round(principalDays),
      partials: lots.reduce((a, l) => a + l.fills.filter((f) => f.partial).length, 0),
      open: lots.filter((l) => l.open).length,
      decisions: r.decisions[f].total,
      granted: r.decisions[f].granted,
      downsized: r.decisions[f].downsized,
      refused: r.decisions[f].refused
    };
  };
  const closed = r.lots.filter((l) => !l.open);
  const losing = closed.filter((l) => l.net < 0);
  const years: Record<string, number> = {};
  let prev = 0;

  for (let s = 0; s <= r.endIndex; s++) {
    const v = r.daily[s]!;

    if (Number.isNaN(v)) continue;

    const y = ds.dates[s]!.slice(0, 4);

    years[y] = (years[y] ?? 0) + (v - prev);
    prev = v;
  }

  const eps = episodesOf(r);
  const winners = eps.filter((e) => e.net > 0).sort((a, b) => b.net - a.net);
  const net = r.net;
  const F = { D1: fam('D1'), G: fam('G') };

  return {
    id: jointId(j),
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
    lossSum: r2(losing.reduce((a, l) => a + l.net, 0)),
    worstLoss: r2(Math.min(0, ...r.lots.map((l) => l.net))),
    largestWin: r2(Math.max(0, ...r.lots.map((l) => l.net))),
    interest: r2(r.lots.reduce((a, l) => a + l.interest, 0)),
    costs: r2(r.lots.reduce((a, l) => a + l.costs, 0)),
    fam: F,
    mixed: F.D1.lots > 0 && F.G.lots > 0,
    minimumBinds: r.minimumBinds,
    sessionsHeld: r.sessionsHeld,
    sessionsBoth: r.sessionsBoth,
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
    vD1: d1
      ? {
          trades: d1.trades.length,
          net: r2(d1.standalone.net),
          dd: r2(d1.standalone.minuteDd),
          first: d1.firstDecision
        }
      : null,
    vG: g
      ? { trades: g.trades.length, net: r2(g.standalone.net), dd: r2(g.standalone.minuteDd), first: g.firstDecision }
      : null,
    sessions: door.sessions
  };
};

export const evaluate = (door: Door, j: Joint, o: EvalOptions = {}): Rec => recordOf(door, j, run(door, j, o), o);

export const ceiling = economics.ceiling;

// Engineering parity (PROTOCOL.md §15.1): the virtual books and the pooled engine against the canonical engines, trade
// by trade and mark by mark, with ZERO tolerance unless stated.
//
// P1 D1: runD1Book and runPool (D1 books only) against the N-book engine's fixed mode (runNAllocator) on the same
//    Datasets — one book (VGT, GDX) and the two-book VGT + GDX pool (VG #2's configuration: the alphabetical tie order,
//    one slot): every trade's decision/entry/exit time, raw and after-cost prices, reason and net, every lot, the net,
//    the realized P&L, the minute and daily drawdowns and their times; both arming conventions.
// P2 Growth: runGrowthBook / simulateGrowth and runPool (one Growth book) against runRiseTrading + summarizeSimulation
//    (the browser's path) on each symbol — every trade, the daily marks, the net, realized, minute and daily drawdowns.
// P3 Priority 2: every one-symbol D1 + Growth configuration through runPool against Priority 2's frozen pooled engine
//    (src/vgt-d1-growth-joint/evaluate.ts run, architecture A) — net, realized, drawdowns and their times, lots,
//    funding decisions — on VGT (its own symbol) and on GDX.
// P4 cross-symbol pools against the independent reference (reference.ts) — the funded set exactly, money and
//    drawdowns within 1e-6 — and the pool's identities.
import { runRiseTrading, summarizeSimulation } from '../growth-trading/riseTrading.ts';
import { Rng } from '../optimizer/rng.ts';
import { baseNRunConfig, runNAllocator } from '../portfolio-aware-d1/nbook/engine.ts';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { configOfGenome, levelCounts } from '../growth140-vgt-s8m/space.ts';
import { run as p2Run } from '../vgt-d1-growth-joint/evaluate.ts';
import type { Door as P2Door } from '../vgt-d1-growth-joint/data.ts';
import { runPool } from './pool.ts';
import {
  type BookId,
  type D1Grid,
  type VBook,
  d1StrategyParams,
  growthParamsOf,
  runD1Book,
  runGrowthBook,
  simulateGrowth
} from './books.ts';
import { type Sym, economics, seedOf, symbols } from './context.ts';
import { type Door, indexOnOrAfter } from './data.ts';
import { datasetsOf, run } from './evaluate.ts';
import { referencePool } from './reference.ts';
import { type GConfig, type Quad, d1Box, normalize } from './space.ts';

export interface Check {
  name: string;
  pass: boolean;
  detail?: unknown;
}

const eq = (a: number, b: number) => a === b || (Number.isNaN(a) && Number.isNaN(b));

// ----- P1 -----

export const canonicalD1 = (door: Door, grids: Partial<Record<Sym, D1Grid>>, armStart: number) => {
  const syms = (['VGT', 'GDX'] as const).filter((s) => grids[s]); // VG #2's configured book order
  const universe: NUniverse = {
    end: door.dates.at(-1)!,
    dates: door.dates,
    sessionCount: door.sessions,
    instruments: Object.fromEntries(
      syms.map((s) => [s, { symbol: s, file: String(door.name), hash: door.sym[s].dataSha256, ds: door.sym[s].ds }])
    ),
    distributions: [],
    eligibilityIndex: armStart
  };
  const config = baseNRunConfig({
    key: 'parity',
    label: 'parity',
    mode: 'fixed',
    symbols: [...syms],
    phenotypes: Object.fromEntries(
      syms.map((s) => [s, { symbol: s, name: 'parity', params: d1StrategyParams(s, grids[s]!), short: 'parity' }])
    ),
    costBps: economics.costBps,
    fixedPrincipal: economics.budget,
    rate: economics.rate,
    stopFill: economics.stopFill,
    stopSlippageBps: economics.stopSlippageBps,
    eligibilityIndex: armStart,
    accountingStartIndex: 0
  });

  return runNAllocator(universe, config);
};

export const checkD1 = (door: Door, grids: Partial<Record<Sym, D1Grid>>, armStart: number, label: string): Check => {
  const c = canonicalD1(door, grids, armStart);
  const end = door.sessions - 1;
  const books: VBook[] = symbols
    .filter((s) => grids[s])
    .map((s) => runD1Book(door.sym[s].ds, s, grids[s]!, { armStart, accountingStart: 0, endIndex: end }));
  const pool = runPool(datasetsOf(door), books, 'D1', { detail: true });
  const problems: string[] = [];

  for (const b of books) {
    const s = b.book.slice(3);
    const ct = c.trades.filter((t) => t.symbol === s);

    if (b.trades.length !== ct.length) problems.push(`${s} trades ${b.trades.length} vs ${ct.length}`);
    ct.forEach((t, i) => {
      const v = b.trades[i];

      if (!v) return;
      if (
        v.dT !== t.decisionTime ||
        v.eS !== t.entryIndex ||
        (t.entryIndex >= 0 && (v.eT !== t.entryTime || v.eRaw !== t.entryRawPrice || v.ePrice !== t.entryPrice))
      )
        problems.push(`${s} trade ${i + 1} entry`);

      const x = v.fills[0];

      if (
        t.exitIndex >= 0 &&
        (!x || x.t !== t.exitTime || x.raw !== t.exitRawPrice || x.price !== t.exitPrice || x.reason !== t.exitReason)
      )
        problems.push(`${s} trade ${i + 1} exit`);
    });
  }

  const lots = c.lots;

  if (pool.lots.length !== lots.length) problems.push(`lots ${pool.lots.length} vs ${lots.length}`);
  lots.forEach((l, i) => {
    const p = pool.lots[i];

    if (!p) return;
    if (
      p.symbol !== l.symbol ||
      p.entryT !== l.entryTime ||
      p.shares0 !== l.shares ||
      p.principal0 !== l.originalPrincipal
    )
      problems.push(`lot ${i + 1} entry`);
    if (!eq(p.net, l.net) || !eq(p.interest, l.interest)) problems.push(`lot ${i + 1} net ${p.net} vs ${l.net}`);
  });

  const refusedC = c.signals.filter((x) => x.outcome === 'refused').map((x) => `${x.symbol}@${x.decisionTime}`);
  const refusedP = pool.funding
    .filter((f) => f.outcome === 'refused')
    .map((f) => `${f.book.slice(3)}@${f.t}`)
    .sort();

  if ([...refusedC].sort().join() !== refusedP.join()) problems.push('refusals differ');

  const realized = lots.filter((l) => l.exitIndex >= 0).reduce((a, l) => a + l.net, 0);
  const net = lots.reduce((a, l) => a + l.net, 0);

  if (!eq(pool.dd.max, c.minuteDrawdown.maximum))
    problems.push(`minute dd ${pool.dd.max} vs ${c.minuteDrawdown.maximum}`);
  if (!eq(pool.ddDaily.max, c.dailyDrawdown.maximum))
    problems.push(`daily dd ${pool.ddDaily.max} vs ${c.dailyDrawdown.maximum}`);
  if (Math.abs(pool.net - net) > 1e-6) problems.push(`net ${pool.net} vs ${net}`);
  if (Math.abs(pool.realized - realized) > 1e-6) problems.push(`realized ${pool.realized} vs ${realized}`);
  if (pool.dd.peakT !== c.minuteDrawdown.peakTime || pool.dd.troughT !== c.minuteDrawdown.troughTime)
    problems.push('minute dd times');
  if (books.length === 1 && !eq(books[0]!.standalone.minuteDd, c.minuteDrawdown.maximum))
    problems.push('book minute dd');

  return {
    name: `P1 D1 ${label} arm ${door.dates[armStart]}`,
    pass: problems.length === 0,
    detail: {
      problems,
      trades: c.trades.length,
      lots: lots.length,
      refused: refusedC.length,
      net,
      dd: c.minuteDrawdown.maximum
    }
  };
};

export const randomD1 = (n: number, label: string): D1Grid[] => {
  const rng = Rng.from(...seedOf('parity', 'd1', label));

  return Array.from(
    { length: n },
    () => Object.fromEntries(d1Box.map((b) => [b.key, b.min + rng.int(b.max - b.min + 1)])) as unknown as D1Grid
  );
};

// ----- P2 -----

export const canonicalGrowth = (door: Door, s: Sym, config: GConfig) => {
  const sd = door.sym[s];
  const params = growthParamsOf(config, s, door);
  const r = runRiseTrading(s, sd.history, 0, params, sd.dataSha256);

  return { run: r, ...summarizeSimulation(r.simulation, r.ds) };
};

export const checkGrowth = (door: Door, s: Sym, config: GConfig, label: string): Check => {
  const problems: string[] = [];
  const canon = canonicalGrowth(door, s, config);
  const sd = door.sym[s];
  const mine = simulateGrowth(sd, growthParamsOf(config, s, door)).simulation;
  const book = runGrowthBook(sd, door, config);
  const pool = runPool(datasetsOf(door), [book], 'G', { detail: true });
  const cs = canon.run.simulation;

  if (mine.trades.length !== cs.trades.length) problems.push(`trades ${mine.trades.length} vs ${cs.trades.length}`);
  cs.trades.forEach((t, i) => {
    const m = mine.trades[i];

    if (!m) return;
    for (const k of [
      'decisionTime',
      'entryTime',
      'entryRawPrice',
      'entryPrice',
      'exitTime',
      'exitRawPrice',
      'exitPrice',
      'net',
      'interest'
    ] as const)
      if (!eq(m[k] as number, t[k] as number)) problems.push(`trade ${i + 1} ${k} ${m[k]} vs ${t[k]}`);
  });
  if (!eq(mine.minuteDrawdown.maximum, cs.minuteDrawdown.maximum)) problems.push('simulation minute dd');
  if (cs.daily.length !== mine.daily.length || cs.daily.some((d, i) => !eq(d.marked, mine.daily[i]!.marked)))
    problems.push('daily marks');

  const net = canon.metrics.pnl.totalMarkedNetUsd;

  if (!eq(pool.dd.max, cs.minuteDrawdown.maximum))
    problems.push(`pool minute dd ${pool.dd.max} vs ${cs.minuteDrawdown.maximum}`);
  if (!eq(pool.ddDaily.max, cs.dailyDrawdown.maximum))
    problems.push(`pool daily dd ${pool.ddDaily.max} vs ${cs.dailyDrawdown.maximum}`);
  if (!eq(pool.dd.peakT, cs.minuteDrawdown.peakTime) || !eq(pool.dd.troughT, cs.minuteDrawdown.troughTime))
    problems.push('pool dd times');
  if (Math.abs(pool.net - net) > 1e-6) problems.push(`pool net ${pool.net} vs ${net}`);
  if (Math.abs(pool.realized - canon.metrics.pnl.realizedNetUsd) > 1e-6) problems.push('pool realized');
  if (pool.lots.length !== cs.trades.length) problems.push(`pool lots ${pool.lots.length}`);

  for (const d of cs.daily)
    if (!eq(pool.daily[d.index]!, d.marked)) {
      problems.push(`pool daily mark ${d.date}: ${pool.daily[d.index]} vs ${d.marked}`);
      break;
    }

  return {
    name: `P2 Growth ${s} ${label}`,
    pass: problems.length === 0,
    detail: { problems: problems.slice(0, 12), trades: cs.trades.length, net, dd: cs.minuteDrawdown.maximum }
  };
};

export const randomGrowth = (n: number, label: string): GConfig[] => {
  const rng = Rng.from(...seedOf('parity', 'growth', label));
  const out: GConfig[] = [];

  for (let tries = 0; out.length < n && tries < n * 20; tries++) {
    try {
      out.push(configOfGenome(levelCounts.map((k) => rng.int(k))));
    } catch {
      // an invalid combination is skipped (none expected)
    }
  }

  return out;
};

// ----- P3: one-symbol pools against Priority 2's frozen engine -----

export const p2DoorOf = (door: Door, s: Sym): P2Door => ({
  name: door.name as never,
  history: door.sym[s].history,
  ds: door.sym[s].ds,
  bars: door.sym[s].bars,
  dataSha256: door.sym[s].dataSha256,
  from: door.from,
  to: door.to,
  sessions: door.sessions
});

// A one-symbol configuration: D1 and Growth on `s`, the other symbol's books disabled.
export const oneSymbol = (s: Sym, d1: D1Grid, g: GConfig, first: 'D1' | 'G', fill: { d1: D1Grid; g: GConfig }): Quad =>
  normalize({
    d1: { GDX: s === 'GDX' ? d1 : fill.d1, VGT: s === 'VGT' ? d1 : fill.d1 },
    g: { GDX: s === 'GDX' ? g : fill.g, VGT: s === 'VGT' ? g : fill.g },
    first
  });

export const offOther = (s: Sym): Partial<Record<BookId, boolean>> =>
  s === 'VGT' ? { 'D1:GDX': false, 'G:GDX': false } : { 'D1:VGT': false, 'G:VGT': false };

export const checkP2 = (door: Door, s: Sym, q: Quad, label: string): Check => {
  const problems: string[] = [];
  const mine = run(door, q, { enabled: offOther(s) }, true).result;
  const theirs = p2Run(
    p2DoorOf(door, s),
    { d1: q.d1[s], g: q.g[s], a: { arch: 'A', d1Target: 1, gTarget: 1, first: q.first } },
    {},
    true
  ).result;

  for (const k of ['net', 'realized', 'unrealized'] as const)
    if (!eq(mine[k], theirs[k])) problems.push(`${k} ${mine[k]} vs ${theirs[k]}`);
  for (const k of ['max', 'peakT', 'troughT', 'recoveryT'] as const) {
    if (!eq(mine.dd[k], theirs.dd[k])) problems.push(`minute dd ${k} ${mine.dd[k]} vs ${theirs.dd[k]}`);
    if (!eq(mine.ddDaily[k], theirs.ddDaily[k])) problems.push(`daily dd ${k}`);
  }
  if (mine.lots.length !== theirs.lots.length) problems.push(`lots ${mine.lots.length} vs ${theirs.lots.length}`);
  mine.lots.forEach((l, i) => {
    const t = theirs.lots[i];

    if (!t) return;
    if (l.family !== t.family || l.entryT !== t.entryT || !eq(l.net, t.net) || !eq(l.interest, t.interest))
      problems.push(`lot ${i + 1}`);
  });

  const fm = mine.funding.map((f) => `${f.book.slice(0, f.book.indexOf(':'))}@${f.t}:${f.outcome}`);
  const ft = theirs.funding.map((f) => `${f.family}@${f.t}:${f.outcome}`);

  if (fm.join() !== ft.join()) problems.push('funding decisions differ');

  for (let i = 0; i <= mine.endIndex; i++)
    if (!eq(mine.daily[i]!, theirs.daily[i]!)) {
      problems.push(`daily mark ${door.dates[i]}`);
      break;
    }

  return {
    name: `P3 ${s} ${label}`,
    pass: problems.length === 0,
    detail: { problems: problems.slice(0, 12), net: mine.net, dd: mine.dd.max, lots: mine.lots.length }
  };
};

// ----- P4: cross-symbol pools against the independent reference -----

export const checkReference = (
  door: Door,
  q: Quad,
  enabled: Partial<Record<BookId, boolean>>,
  label: string
): Check => {
  const problems: string[] = [];
  const x = run(door, q, { enabled }, true);
  const r = x.result;
  const ref = referencePool(datasetsOf(door), x.books, q.first, { enabled, endIndex: door.sessions - 1 });
  const funded = r.funding.filter((f) => f.outcome === 'granted').map((f) => `${f.book}#${f.trade}`);

  if (funded.join() !== ref.funded.join()) problems.push(`funded ${funded.length} vs ${ref.funded.length}`);
  if (Math.abs(r.net - ref.net) > 1e-6) problems.push(`net ${r.net} vs ${ref.net}`);
  if (Math.abs(r.realized - ref.realized) > 1e-6) problems.push(`realized ${r.realized} vs ${ref.realized}`);
  if (Math.abs(r.dd.max - ref.dd) > 1e-6) problems.push(`minute dd ${r.dd.max} vs ${ref.dd}`);
  if (Math.abs(r.ddDaily.max - ref.ddDaily) > 1e-6) problems.push(`daily dd ${r.ddDaily.max} vs ${ref.ddDaily}`);
  if (r.dd.max > 1e-6 && (r.dd.peakT !== ref.ddPeakT || r.dd.troughT !== ref.ddTroughT)) problems.push('dd times');

  // identities: Σ lots = net; one slot; principal ≤ the budget; a disabled component is never funded; a funded lot
  // tracks its virtual trade exactly (its fills' times and prices)
  const sum = r.lots.reduce((a, l) => a + l.net, 0);

  if (Math.abs(sum - r.net) > 1e-6) problems.push(`Σ lots ${sum} ≠ net ${r.net}`);
  for (let i = 1; i < r.lots.length; i++) {
    const prev = r.lots[i - 1]!;

    if (prev.open || r.lots[i]!.entryT < prev.fills.at(-1)!.t) problems.push('two lots at once');
  }
  if (r.peakPrincipal > economics.budget + 1e-6) problems.push(`principal ${r.peakPrincipal}`);
  for (const l of r.lots) {
    if (enabled[l.book] === false) problems.push(`${l.book} disabled but funded`);
    if (l.entryT !== l.trade.eT || l.entryPrice !== l.trade.ePrice)
      problems.push(`lot ${l.id} entry ≠ its virtual entry`);
    l.fills.forEach((f, i) => {
      const v = l.trade.fills[i]!;

      if (f.t !== v.t || f.price !== v.price || f.partial !== v.partial) problems.push(`lot ${l.id} fill ${i}`);
    });
  }

  return {
    name: `P4 ${label}`,
    pass: problems.length === 0,
    detail: { problems: problems.slice(0, 12), lots: r.lots.length, net: r.net, dd: r.dd.max }
  };
};

export const randomQuads = (n: number, label: string): Quad[] => {
  const rng = Rng.from(...seedOf('parity', 'quad', label));
  const d1 = randomD1(2 * n, `${label}-d1`);
  const g = randomGrowth(2 * n, `${label}-g`);

  return Array.from({ length: n }, (_v, i) =>
    normalize({
      d1: { GDX: d1[2 * i]!, VGT: d1[2 * i + 1]! },
      g: { GDX: g[2 * i]!, VGT: g[2 * i + 1]! },
      first: rng.int(2) === 0 ? 'D1' : 'G'
    })
  );
};

export const nativeArm = (door: Door) => indexOnOrAfter(door, '2017-06-15');

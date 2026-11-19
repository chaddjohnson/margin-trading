// Engineering parity (PROTOCOL.md §9): the virtual books and the pooled engine in single-family mode against the
// canonical engines, trade by trade and mark by mark, with ZERO tolerance unless stated.
//
// P1 D1: runD1Book and runPool(D1 alone) against the N-book engine's fixed mode (runNAllocator with one VGT book) on
//    the same Dataset — every trade's decision/entry/exit time, raw and after-cost prices, reason and net, the net, the
//    realized P&L and the minute and daily drawdowns; for the two D1 controls and random vectors of the D1 box, under
//    both arming conventions.
// P2 Growth: runGrowthBook / simulateGrowth and runPool(Growth alone) against runRiseTrading + summarizeSimulation (the
//    browser's path, growth140-vgt-s8m engine.ts runOf) — every trade, fill, the net, realized, the minute and daily
//    drawdowns and the daily marks; for the two Growth controls and random configurations of the whole Growth space.
// P3 the pool's own identities: B at 100%/100% equals A when no partial sale exists; a disabled family is never
//    funded; the cash identity (Σ lots' net = the pool's net) and the principal cap at every decision.
import { runOf as growthRunOf } from '../growth140-vgt-s8m/engine.ts';
import { Rng } from '../optimizer/rng.ts';
import { baseNRunConfig, runNAllocator } from '../portfolio-aware-d1/nbook/engine.ts';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { configOfGenome, levelCounts } from '../growth140-vgt-s8m/space.ts';
import { runPool } from './allocator.ts';
import { type D1Grid, d1StrategyParams, growthParamsOf, runD1Book, runGrowthBook, simulateGrowth } from './books.ts';
import { economics, seedOf } from './context.ts';
import { type Door, indexOnOrAfter } from './data.ts';
import { type GConfig, d1Box } from './space.ts';

export interface Check {
  name: string;
  pass: boolean;
  detail?: unknown;
}

const eq = (a: number, b: number) => a === b || (Number.isNaN(a) && Number.isNaN(b));

// ----- P1 -----

export const canonicalD1 = (door: Door, grid: D1Grid, armStart: number) => {
  const ds = door.ds;
  const universe: NUniverse = {
    end: ds.dates.at(-1)!,
    dates: ds.dates,
    sessionCount: ds.sessionCount,
    instruments: { VGT: { symbol: 'VGT', file: String(door.name), hash: door.dataSha256, ds } },
    distributions: [],
    eligibilityIndex: armStart
  };
  const config = baseNRunConfig({
    key: 'parity',
    label: 'parity',
    mode: 'fixed',
    symbols: ['VGT'],
    phenotypes: { VGT: { symbol: 'VGT', name: 'parity', params: d1StrategyParams(grid), short: 'parity' } },
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

export const checkD1 = (door: Door, grid: D1Grid, armStart: number, label: string): Check => {
  const c = canonicalD1(door, grid, armStart);
  const end = door.ds.sessionCount - 1;
  const book = runD1Book(door.ds, grid, { armStart, accountingStart: 0, endIndex: end });
  const pool = runPool(door.ds, book, null, { arch: 'A', d1Target: 1, gTarget: 1, first: 'D1' }, { detail: true });
  const problems: string[] = [];
  const lots = c.lots;

  if (book.trades.length !== c.trades.length) problems.push(`trades ${book.trades.length} vs ${c.trades.length}`);
  if (pool.lots.length !== lots.length) problems.push(`lots ${pool.lots.length} vs ${lots.length}`);

  c.trades.forEach((t, i) => {
    const v = book.trades[i];

    if (!v) return;
    if (
      v.dT !== t.decisionTime ||
      v.eS !== t.entryIndex ||
      (t.entryIndex >= 0 && (v.eT !== t.entryTime || v.eRaw !== t.entryRawPrice || v.ePrice !== t.entryPrice))
    )
      problems.push(`trade ${i + 1} entry`);
    const x = v.fills[0];

    if (
      t.exitIndex >= 0 &&
      (!x || x.t !== t.exitTime || x.raw !== t.exitRawPrice || x.price !== t.exitPrice || x.reason !== t.exitReason)
    )
      problems.push(`trade ${i + 1} exit`);
  });
  lots.forEach((l, i) => {
    const p = pool.lots[i];

    if (!p) return;
    if (p.entryT !== l.entryTime || p.shares0 !== l.shares || p.principal0 !== l.originalPrincipal)
      problems.push(`lot ${i + 1} entry`);
    if (!eq(p.net, l.net) || !eq(p.interest, l.interest)) problems.push(`lot ${i + 1} net ${p.net} vs ${l.net}`);
  });

  const realized = lots.filter((l) => l.exitIndex >= 0).reduce((a, l) => a + l.net, 0);
  const net = lots.reduce((a, l) => a + l.net, 0);

  if (!eq(pool.dd.max, c.minuteDrawdown.maximum))
    problems.push(`minute dd ${pool.dd.max} vs ${c.minuteDrawdown.maximum}`);
  if (!eq(pool.ddDaily.max, c.dailyDrawdown.maximum))
    problems.push(`daily dd ${pool.ddDaily.max} vs ${c.dailyDrawdown.maximum}`);
  if (!eq(book.standalone.minuteDd, c.minuteDrawdown.maximum)) problems.push('book minute dd');
  if (Math.abs(pool.net - net) > 1e-6) problems.push(`net ${pool.net} vs ${net}`);
  if (Math.abs(pool.realized - realized) > 1e-6) problems.push(`realized ${pool.realized} vs ${realized}`);
  if (pool.dd.peakT !== c.minuteDrawdown.peakTime || pool.dd.troughT !== c.minuteDrawdown.troughTime)
    problems.push('minute dd times');

  return {
    name: `P1 D1 ${label} arm ${door.ds.dates[armStart]}`,
    pass: problems.length === 0,
    detail: { problems, trades: c.trades.length, lots: lots.length, net, dd: c.minuteDrawdown.maximum }
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

export const checkGrowth = (door: Door, config: GConfig, label: string): Check => {
  const problems: string[] = [];
  const canon = growthRunOf(
    { name: 'fixture', history: door.history, warmup: 0, dataSha256: door.dataSha256, from: door.from, to: door.to },
    config as never
  );
  const params = growthParamsOf(config, door);
  const mine = simulateGrowth(door, params).simulation;
  const book = runGrowthBook(door, config);
  const pool = runPool(door.ds, null, book, { arch: 'A', d1Target: 1, gTarget: 1, first: 'G' }, { detail: true });
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

  for (let s = 0; s < cs.daily.length; s++) {
    const d = cs.daily[s]!;

    if (!eq(pool.daily[d.index]!, d.marked)) {
      problems.push(`pool daily mark ${d.date}: ${pool.daily[d.index]} vs ${d.marked}`);
      break;
    }
  }

  return {
    name: `P2 Growth ${label}`,
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

export const nativeArm = (door: Door) => indexOnOrAfter(door, '2017-06-15');

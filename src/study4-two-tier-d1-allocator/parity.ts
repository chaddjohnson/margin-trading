// The parity gate (PROTOCOL.md §11, §13; ENGINE_CONTRACT.md §10), before the code freeze:
//   B5 parity   — the parity door (B5 members through 2023-12-29): B5, B4 and B1 through Study 4's allocator equal the
//                 sealed training anchors to the cent at 0/2/5/10 bps, the frozen replay and the frozen N-book engine run
//                 on the same bounded data (every lot, mark and drawdown), Study 4's traces equal the frozen traceBook's,
//                 the loaded-bar hashes equal the ranked-preemption door's, and the sealed fold increments and windowed
//                 drawdowns are reproduced.
//   synthetic   — P0 = frozen replayFixedPool on random distinct-symbol pools; P2L = frozen replayPreemptive on random
//                 one-deep/one-shallow pools; fast = independent reference on random pools and policies with quotas per
//                 branch; metamorphic checks.
//   real F20    — fast = reference on ≥ 40 random pools of B5 + shallow books on F20 development data (a separate
//                 process: its own door).
import fs from 'fs-extra';
import { assembleUniverse } from '../multi-etf-allocator/data.ts';
import { baseNRunConfig, runNAllocator, type NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { traceBook, traceSettings } from '../portfolio-aware-d1/trace.ts';
import { replayPreemptive } from '../d1-ranked-preemption/replay.ts';
import { allocationOf } from '../d1-ranked-preemption/allocation.ts';
import type { Dataset } from '../four-family/data.ts';
import { Rng } from '../optimizer/rng.ts';
import { syntheticMarket } from '../study3-vgt-momentum-stage1b/tests/synthetic.ts';
import { withMissingBars } from '../study3-vgt-momentum-stage1b/data.ts';
import { type AllocBook, type AllocResult, type Policy, policyOf, runAllocator } from './allocator.ts';
import { type BookSpec, gridKey, loadB5, paramsOfGrid, phenotypeOf } from './books.ts';
import { type Grid, resultFile, study } from './context.ts';
import { openDoor } from './doors.ts';
import {
  assertNode,
  closureDigest,
  codeHashes,
  developmentEntries,
  nowIso,
  readSealed,
  sha256File,
  writeSealed
} from './records.ts';
import { assertSameAsFrozen, buildTrace, baseSettings } from './trace.ts';

const anchorsFile = 'research/joint-16-etf-d1/results/controls/controls.json';
const rankedDoorFile = 'research/d1-ranked-preemption/results/controls/final/CONTROLS.json';
const foldFiles = {
  'fold-a': 'research/d1-ranked-preemption/results/walkforward/fold-a/VALIDATION.json',
  'fold-b': 'research/d1-ranked-preemption/results/walkforward/fold-b/VALIDATION.json'
};

export interface Check {
  name: string;
  pass: boolean;
  expected?: number | string;
  actual?: number | string;
  difference?: number;
}

const near = (name: string, expected: number, actual: number, tolerance = 0.005): Check => ({
  name,
  pass: Math.abs(expected - actual) <= tolerance,
  expected,
  actual,
  difference: Math.abs(expected - actual)
});

const same = (name: string, expected: unknown, actual: unknown): Check => ({
  name,
  pass: expected === actual || (Number.isNaN(expected) && Number.isNaN(actual)),
  expected: String(expected),
  actual: String(actual)
});

const eq = (a: number, b: number) => a === b || (Number.isNaN(a) && Number.isNaN(b));

// every lot, mark and drawdown of two allocator-shaped results
export const compareRuns = (
  label: string,
  a: {
    net: number;
    minuteDrawdown: { maximum: number; peakTime: number; troughTime: number };
    dailyDrawdown: { maximum: number; peakTime: number; troughTime: number };
    marks: Float64Array;
    lots: { entryIndex: number; exitIndex: number; net: number; entryTime: number; exitTime: number }[];
  },
  b: typeof a
): Check[] => {
  const checks: Check[] = [
    same(`${label} net`, a.net, b.net),
    same(`${label} minute DD`, a.minuteDrawdown.maximum, b.minuteDrawdown.maximum),
    same(`${label} minute DD peak`, a.minuteDrawdown.peakTime, b.minuteDrawdown.peakTime),
    same(`${label} minute DD trough`, a.minuteDrawdown.troughTime, b.minuteDrawdown.troughTime),
    same(`${label} daily DD`, a.dailyDrawdown.maximum, b.dailyDrawdown.maximum),
    same(`${label} lots`, a.lots.length, b.lots.length)
  ];
  let markDiff = 0;

  for (let s = 0; s < Math.min(a.marks.length, b.marks.length); s++) {
    if (!eq(a.marks[s]!, b.marks[s]!)) {
      markDiff++;
    }
  }

  checks.push(same(`${label} marks differing`, 0, markDiff));

  let lotDiff = 0;

  a.lots.forEach((lot, index) => {
    const other = b.lots[index];

    if (
      !other ||
      lot.entryIndex !== other.entryIndex ||
      lot.exitIndex !== other.exitIndex ||
      !eq(lot.net, other.net) ||
      !eq(lot.entryTime, other.entryTime) ||
      !eq(lot.exitTime, other.exitTime)
    ) {
      lotDiff++;
    }
  });
  checks.push(same(`${label} lots differing`, 0, lotDiff));
  return checks;
};

const universeOf = (datasets: Record<string, Dataset>, symbols: string[]): NUniverse => {
  const instruments = Object.fromEntries(
    symbols.map((symbol) => [
      symbol,
      { symbol, file: 'study4-door', hash: datasets[symbol]!.dataHash, ds: datasets[symbol]! }
    ])
  );
  const first = datasets[symbols[0]!]!;
  const assembled = assembleUniverse(instruments as never, [], first.lastDate, {}, study.armingStart);

  return {
    end: assembled.end,
    dates: assembled.dates,
    sessionCount: assembled.sessionCount,
    instruments: instruments as never,
    distributions: [],
    eligibilityIndex: assembled.eligibilityIndex
  };
};

// ----- B5 parity (the parity door) -----

export const parityB5 = async () => {
  assertNode();

  const checks: Check[] = [];
  const b5 = await loadB5();
  const door = await openDoor({ purpose: 'parity', symbols: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'] });
  const sealedDoor = fs.readJsonSync(rankedDoorFile).door.barsSha256 as Record<string, string>;

  for (const [symbol, record] of Object.entries(door.records)) {
    checks.push(
      same(`${symbol} loaded-bar sha256 = ranked-preemption door`, sealedDoor[symbol], record.loadedBarsSha256)
    );
  }

  const anchors = fs.readJsonSync(anchorsFile).training as Record<
    string,
    Record<string, { figures: Record<string, number> }>
  >;
  const pools: Record<string, BookSpec[]> = {
    B5: b5.books,
    B4: b5.books.filter((book) => book.symbol !== 'GDX'),
    B1: b5.books.filter((book) => book.symbol === 'VGT')
  };
  const endIndex = door.sessionCount - 1;
  const universe = universeOf(door.datasets, ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']);

  checks.push(same('arming index (2017-06-15)', universe.eligibilityIndex, door.armStart));

  const runs: Record<string, AllocResult> = {};

  for (const [pool, books] of Object.entries(pools)) {
    for (const cost of [0, 2, 5, 10]) {
      const settings = baseSettings({ costBps: cost });
      const label = `${pool} ${cost} bps`;
      const traces = books.map((book) => {
        const trace = buildTrace(door.datasets[book.symbol]!, book, settings, door.armStart);

        assertSameAsFrozen(door.datasets[book.symbol]!, book, settings, door.armStart, trace);
        return trace;
      });
      const allocBooks: AllocBook[] = books.map((book, index) => ({
        id: book.id,
        symbol: book.symbol,
        tier: 'deep',
        ds: door.datasets[book.symbol]!,
        trace: traces[index]!
      }));
      const config = {
        startIndex: 0,
        endIndex,
        armStart: door.armStart,
        principal: 100000,
        rate: 0.11,
        costBps: cost,
        stopSlippageBps: 0,
        policy: policyOf('P0')
      };
      const tier = runAllocator(allocBooks, { ...config, tieMode: 'tier' });
      const frozenTie = runAllocator(allocBooks, { ...config, tieMode: 'frozen' });
      const frozenTraces = books.map((book) =>
        traceBook(door.datasets[book.symbol]!, phenotypeOf(book), traceSettings(cost), {
          armStart: door.armStart,
          startIndex: 0,
          endIndex,
          splitsSha256: 'study4'
        })
      );
      const replay = replayFixedPool(
        books.map((book, index) => ({
          symbol: book.symbol,
          ds: door.datasets[book.symbol]!,
          trace: frozenTraces[index]!
        })),
        {
          symbols: books.map((book) => book.symbol),
          startIndex: 0,
          endIndex,
          principal: 100000,
          rate: 0.11,
          costBps: cost,
          stopSlippageBps: 0,
          detail: false
        }
      );
      const engine = runNAllocator(
        {
          ...universe,
          instruments: Object.fromEntries(books.map((book) => [book.symbol, universe.instruments[book.symbol]!]))
        },
        baseNRunConfig({
          key: `study4-parity-${label}`,
          label,
          mode: 'fixed',
          symbols: books.map((book) => book.symbol),
          phenotypes: Object.fromEntries(
            books.map((book) => [book.symbol, { ...phenotypeOf(book), params: paramsOfGrid(book.symbol, book.grid) }])
          ),
          costBps: cost,
          fixedPrincipal: 100000,
          rate: 0.11,
          stopFill: 'stop',
          stopSlippageBps: 0,
          eligibilityIndex: universe.eligibilityIndex,
          accountingStartIndex: 0
        })
      );
      const figures = anchors[pool]![`fixed-${cost}`]!.figures;

      runs[label] = tier;
      checks.push(
        near(`${label} net = anchor`, figures.net!, tier.net),
        near(`${label} minute DD = anchor`, figures.minuteDrawdown!, tier.minuteDrawdown.maximum),
        near(`${label} daily DD = anchor`, figures.dailyDrawdown!, tier.dailyDrawdown.maximum),
        same(`${label} lots = anchor`, figures.lots, tier.lots.length),
        same(
          `${label} virtual trades = anchor`,
          figures.virtualTrades,
          traces.reduce((total, trace) => total + trace.trades.length, 0)
        ),
        same(`${label} refused = anchor`, figures.refused, tier.refused),
        near(`${label} interest = anchor`, figures.interest!, tier.interest),
        near(`${label} costs = anchor`, figures.costs!, tier.costs),
        same(`${label} minute DD peak = anchor`, figures.minuteDrawdownPeak, tier.minuteDrawdown.peakTime),
        same(`${label} minute DD trough = anchor`, figures.minuteDrawdownTrough, tier.minuteDrawdown.troughTime),
        ...compareRuns(`${label} tier vs frozen-tie`, tier, frozenTie),
        ...compareRuns(`${label} vs frozen replayFixedPool`, tier, replay),
        same(`${label} vs frozen N-book engine net`, engine.daily.at(-1)!.strategyMark, tier.net),
        same(
          `${label} vs frozen N-book engine minute DD`,
          engine.strategyMinuteDrawdown.maximum,
          tier.minuteDrawdown.maximum
        ),
        same(
          `${label} vs frozen N-book engine daily DD`,
          engine.strategyDailyDrawdown.maximum,
          tier.dailyDrawdown.maximum
        ),
        same(`${label} vs frozen N-book engine lots`, engine.lots.length, tier.lots.length)
      );
    }
  }

  // the sealed fold increments and windowed drawdowns of B5 (5 bps)
  const index = (date: string) => door.dates.indexOf(date);

  for (const [fold, file] of Object.entries(foldFiles)) {
    const validation = fs.readJsonSync(file);
    const a = validation.fixed.A['5'];
    const boundary = index(validation.boundary.date);
    const end = index(validation.validationEnd);
    const books = pools.B5!;
    const settings = baseSettings();
    const allocBooks: AllocBook[] = books.map((book) => ({
      id: book.id,
      symbol: book.symbol,
      tier: 'deep',
      ds: door.datasets[book.symbol]!,
      trace: buildTrace(door.datasets[book.symbol]!, book, settings, door.armStart, 0, end)
    }));
    const run = runAllocator(allocBooks, {
      startIndex: 0,
      endIndex: end,
      armStart: door.armStart,
      principal: 100000,
      rate: 0.11,
      costBps: 5,
      stopSlippageBps: 0,
      policy: policyOf('P0'),
      tieMode: 'tier',
      segments: [boundary]
    });
    const segment = run.segments[0]!;

    checks.push(
      near(
        `B5 ${fold} increment ${validation.boundary.date} → ${validation.validationEnd}`,
        a.validation.net,
        run.liquidation[end]! - run.liquidation[boundary]!
      ),
      near(`B5 ${fold} windowed minute DD`, a.validation.minuteDrawdown, segment.minute.maximum, 0.005),
      near(`B5 ${fold} windowed daily DD`, a.validation.dailyDrawdown, segment.daily.maximum, 0.005)
    );
  }

  const fullB5 = runs['B5 5 bps']!;
  const boundary2021 = index('2021-12-31');

  checks.push(
    near(
      'B5 liquidation mark at 2021-12-31 = fold-a validation net',
      fs.readJsonSync(foldFiles['fold-a']).fixed.A['5'].net,
      fullB5.liquidation[boundary2021]!
    )
  );

  return {
    stage: 'PARITY_B5',
    pass: checks.every((check) => check.pass),
    checks,
    door: { end: door.end, records: door.records },
    anchors: {
      [anchorsFile]: sha256File(anchorsFile),
      [rankedDoorFile]: sha256File(rankedDoorFile),
      ...Object.fromEntries(Object.values(foldFiles).map((file) => [file, sha256File(file)]))
    },
    b5: {
      configFile: b5.configFile,
      frozenCheck: b5.frozenCheck,
      phenotypeFiles: b5.phenotypeFiles,
      books: b5.books.map((book) => ({ id: book.id, grid: gridKey(book.grid) }))
    }
  };
};

// ----- synthetic parity -----

const randomGrid = (rng: Rng, xLo: number, xHi: number): Grid => ({
  targetPercentChange: xLo + rng.int(xHi - xLo + 1),
  trailingBuyPercentage: 1 + rng.int(40),
  trailingStopPercentage: 30 + rng.int(100),
  maximumHoldDays: 3 + rng.int(20),
  tickWindowSize: 20 + rng.int(120),
  intradayLossBuffer: rng.int(60),
  pullback: 30 + rng.int(150),
  continuationWindow: 10 + rng.int(120)
});

export const syntheticMarkets = (count: number, sessions: number, seed: number, sparse: number[]) =>
  Array.from({ length: count }, (_, i) => {
    const base = syntheticMarket(sessions, seed + i);
    const ds = sparse[i % sparse.length]! > 0 ? withMissingBars(base, sparse[i % sparse.length]!, seed * 7 + i) : base;

    ds.id = `synthetic-${seed}-${i}`;
    return ds;
  });

export const paritySyntheticFrozen = () => {
  const checks: Check[] = [];
  const rng = new Rng([4, 4, 4, 4]);
  const markets = syntheticMarkets(8, 650, 1200, [0, 0.3]);
  const counts: Record<string, number> = {};

  // P0 = frozen replayFixedPool (frozen ties, distinct symbols)
  for (let r = 0; r < 60; r++) {
    const n = 1 + rng.int(6);
    const chosen = [...markets.keys()].sort(() => rng.next() - 0.5).slice(0, n);
    const cost = [0, 2, 5, 10][rng.int(4)]!;
    const settings = baseSettings({ costBps: cost });
    const books = chosen.map((i) => ({ symbol: `M${i}`, grid: randomGrid(rng, 30, 250), ds: markets[i]! }));
    const mine = runAllocator(
      books.map((book) => ({
        id: book.symbol,
        symbol: book.symbol,
        tier: rng.next() < 0.5 ? 'deep' : 'shallow',
        ds: book.ds,
        trace: buildTrace(book.ds, book, settings, 100)
      })),
      {
        startIndex: 0,
        endIndex: 649,
        armStart: 100,
        principal: 100000,
        rate: 0.11,
        costBps: cost,
        stopSlippageBps: 0,
        policy: policyOf('P0'),
        tieMode: 'frozen'
      }
    );
    const frozen = replayFixedPool(
      books.map((book) => ({
        symbol: book.symbol,
        ds: book.ds,
        trace: traceBook(book.ds, phenotypeOf({ ...book, id: 'x' }), traceSettings(cost), {
          armStart: 100,
          startIndex: 0,
          endIndex: 649,
          splitsSha256: 'x'
        })
      })),
      {
        symbols: books.map((book) => book.symbol),
        startIndex: 0,
        endIndex: 649,
        principal: 100000,
        rate: 0.11,
        costBps: cost,
        stopSlippageBps: 0,
        detail: false
      }
    );

    checks.push(...compareRuns(`synthetic P0 pool ${r}`, mine, frozen).filter((check) => !check.pass));
    counts.p0Pools = (counts.p0Pools ?? 0) + 1;
  }

  // P2L = frozen replayPreemptive (P1, $0, deep ranked above shallow) on one-deep/one-shallow pools
  const outcomes: Record<string, number> = {};

  for (let r = 0; r < 300; r++) {
    const a = rng.int(markets.length);
    const b = (a + 1 + rng.int(markets.length - 1)) % markets.length;
    const cost = [0, 2, 5, 10][rng.int(4)]!;
    const settings = baseSettings({ costBps: cost });
    const deep = { symbol: `D${a}`, grid: randomGrid(rng, 80, 230), ds: markets[a]! };
    const shallow = { symbol: `S${b}`, grid: randomGrid(rng, 30, 90), ds: markets[b]! };
    const frozenTrace = (book: typeof deep) =>
      traceBook(book.ds, phenotypeOf({ ...book, id: 'x' }), traceSettings(cost), {
        armStart: 100,
        startIndex: 0,
        endIndex: 649,
        splitsSha256: 'x'
      });
    const legacy = replayPreemptive(
      [
        { symbol: deep.symbol, ds: deep.ds, trace: frozenTrace(deep) },
        { symbol: shallow.symbol, ds: shallow.ds, trace: frozenTrace(shallow) }
      ],
      {
        symbols: [deep.symbol, shallow.symbol],
        startIndex: 0,
        endIndex: 649,
        principal: 100000,
        rate: 0.11,
        costBps: cost,
        stopSlippageBps: 0,
        detail: false,
        allocation: allocationOf('P1', { rankingId: 'study4', order: [deep.symbol, shallow.symbol] })
      }
    );
    const mine = runAllocator(
      [
        {
          id: deep.symbol,
          symbol: deep.symbol,
          tier: 'deep',
          ds: deep.ds,
          trace: buildTrace(deep.ds, deep, settings, 100)
        },
        {
          id: shallow.symbol,
          symbol: shallow.symbol,
          tier: 'shallow',
          ds: shallow.ds,
          trace: buildTrace(shallow.ds, shallow, settings, 100)
        }
      ],
      {
        startIndex: 0,
        endIndex: 649,
        armStart: 100,
        principal: 100000,
        rate: 0.11,
        costBps: cost,
        stopSlippageBps: 0,
        policy: policyOf('P2', { replacement: 'legacy' }),
        tieMode: 'tier'
      }
    );

    checks.push(...compareRuns(`P2L pool ${r}`, mine, legacy as never).filter((check) => !check.pass));

    for (const sw of mine.switches) {
      outcomes[sw.outcome] = (outcomes[sw.outcome] ?? 0) + 1;
    }

    for (const p of legacy.preemptions) {
      outcomes[`legacy:${p.outcome}`] = (outcomes[`legacy:${p.outcome}`] ?? 0) + 1;
    }
  }

  checks.push(
    same('P2L executed switches = legacy executed', outcomes['legacy:executed'] ?? 0, outcomes.executed ?? 0),
    { name: 'P2L executed ≥ 20', pass: (outcomes.executed ?? 0) >= 20 },
    {
      name: 'P2L aborted outcomes ≥ 10',
      pass:
        Object.entries(outcomes)
          .filter(([key]) => key.startsWith('aborted'))
          .reduce((total, [, n]) => total + n, 0) >= 10
    }
  );

  return { stage: 'PARITY_SYNTHETIC_FROZEN', pass: checks.every((check) => check.pass), checks, counts, outcomes };
};

export const parityFile = (name: string, digest = closureDigest()) =>
  resultFile('parity', `${name}-${digest.slice(0, 16)}.json`);

export const sealParity = (name: string, body: Record<string, unknown>) => {
  const digest = closureDigest();

  return writeSealed(parityFile(name, digest), {
    ...body,
    codeDigest: digest,
    codeHashes: codeHashes(developmentEntries()),
    at: nowIso()
  });
};

export { readSealed };
export type { Policy };

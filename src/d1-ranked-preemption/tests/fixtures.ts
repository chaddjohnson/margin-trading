// Synthetic universes for the preemption tests: weekday sessions (so a Friday → Monday step carries three days of
// interest), explicit minute closes and slots per security (src/multi-etf-allocator/tests/fixtures.ts builder), and
// the small test D1 phenotype for any symbol. The test phenotype arms on a 10% decline from the 3-session high and
// buys on a 1% rebound; its 5% trailing stop is active only once it would exit at a net profit (net stop policy),
// its 30-day hold and 50% buffer never fire unless a test wants them.
import type { MarketSession } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import { assembleUniverse } from '../../multi-etf-allocator/data.ts';
import {
  type SessionSpec,
  buildSession,
  flat,
  testGrid,
  testPhenotype
} from '../../multi-etf-allocator/tests/fixtures.ts';
import type { Distribution } from '../../shared-margin-portfolio/data.ts';
import { type BookPhenotype, type NUniverse, baseNRunConfig } from '../../portfolio-aware-d1/nbook/engine.ts';
import { traceBook, traceSettings } from '../../portfolio-aware-d1/trace.ts';
import { type Allocation, type PolicyKey, allocationOf } from '../allocation.ts';
import type { PRunConfig } from '../engine.ts';
import type { ReplayBook } from '../replay.ts';

export { flat };
export type { SessionSpec };

// Weekdays from Monday 2020-01-06 (no holidays in the first weeks).
export const weekdays = (count: number, start = '2020-01-06') => {
  const dates: string[] = [];

  for (let time = Date.parse(start); dates.length < count; time += 86400000) {
    const day = new Date(time).getUTCDay();

    if (day !== 0 && day !== 6) {
      dates.push(new Date(time).toISOString().slice(0, 10));
    }
  }

  return dates;
};

export const flats = (count: number, price = 100, bars = 6): SessionSpec[] =>
  Array.from({ length: count }, () => flat(price, bars));

// A universe of any symbols on weekday sessions (every list the same length).
export const weekdayUniverse = (specs: Record<string, SessionSpec[]>, distributions: Distribution[] = []) => {
  const instruments: Record<
    string,
    { symbol: string; file: string; hash: string; ds: ReturnType<typeof fixtureDataset> }
  > = {};
  const length = Object.values(specs)[0]!.length;
  const dates = weekdays(length);
  let end = '';

  for (const [symbol, sessions] of Object.entries(specs)) {
    if (sessions.length !== length) {
      throw new Error(`${symbol} has ${sessions.length} sessions, not ${length}`);
    }

    const built: MarketSession[] = sessions.map((spec, day) => buildSession(dates[day]!, spec));
    const ds = fixtureDataset(built);

    ds.id = `fixture-${symbol}`;
    instruments[symbol] = { symbol, file: 'fixture', hash: 'fixture', ds };
    end = built.at(-1)!.date;
  }

  const assembled = assembleUniverse(instruments as never, distributions, end, {}, dates[0]!);

  return { ...assembled, instruments } as unknown as NUniverse;
};

// A dip that arms from a reference high H (flats at H before it), with the rebound trigger at the end of bar
// `before + 2` and the fill at the next bar's open, `fill`: closes H·0.89 (arms), H·0.88 (trailing low), then the
// fill price on the trigger bar (a rebound ≥ 1%), then `after` bars at the fill price.
export const dipTo = (high: number, fill: number, before = 1, after = 2): SessionSpec => {
  const low = high * 0.88;

  if (!(fill >= low * 1.01 && fill <= high * 0.9)) {
    throw new Error(`dipTo: the fill ${fill} must rebound ≥ 1% from ${low} and stay ≤ ${high * 0.9}`);
  }

  return {
    closes: [
      ...Array.from({ length: before }, () => high),
      high * 0.89,
      low,
      fill,
      ...Array.from({ length: after }, () => fill)
    ]
  };
};

export const triggerBar = (before = 1) => before + 2;

export const bookOf = (symbol: string, grid: Partial<typeof testGrid> = {}): BookPhenotype => {
  const phenotype = testPhenotype('VGT', grid);

  return { symbol, name: 'test', params: { ...phenotype.params, label: `${symbol} test` }, short: phenotype.short };
};

export interface FixtureRun {
  symbols: string[];
  costBps?: number;
  rate?: number;
  policy?: PolicyKey;
  order?: string[]; // priority, highest first
  books?: Record<string, BookPhenotype>;
  mode?: 'fixed' | 'portfolio';
}

export const allocationFor = (run: FixtureRun): Allocation =>
  allocationOf(run.policy ?? 'P0', run.order ? { rankingId: 'test', order: run.order } : undefined);

export const configOf = (run: FixtureRun): PRunConfig => ({
  ...baseNRunConfig({
    key: 'test',
    label: 'test',
    mode: run.mode ?? 'fixed',
    symbols: run.symbols,
    phenotypes: run.books ?? Object.fromEntries(run.symbols.map((symbol) => [symbol, bookOf(symbol)])),
    costBps: run.costBps ?? 0,
    rate: run.rate ?? 0.11,
    initial: { voog: 60000, vgt: 40000 }
  }),
  allocation: allocationFor(run)
});

export const replayBooksOf = (universe: NUniverse, run: FixtureRun): ReplayBook[] => {
  const phenotypes = run.books ?? Object.fromEntries(run.symbols.map((symbol) => [symbol, bookOf(symbol)]));
  const window = {
    armStart: universe.eligibilityIndex,
    startIndex: 0,
    endIndex: universe.sessionCount - 1,
    splitsSha256: 'test'
  };

  return run.symbols.map((symbol) => ({
    symbol,
    ds: universe.instruments[symbol]!.ds,
    trace: traceBook(
      universe.instruments[symbol]!.ds,
      phenotypes[symbol]!,
      traceSettings(run.costBps ?? 0, { rate: run.rate ?? 0.11 }),
      window
    )
  }));
};

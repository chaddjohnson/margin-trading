// Synthetic universes for the allocator tests: consecutive calendar dates, explicit minute closes per security (the
// open of each bar is the previous bar's close unless given), bars at chosen minute slots so that asynchronous files
// and missing minutes can be written down, a closing print unless a session says otherwise, and small D1 parameters
// so that the books arm, buy and exit on short paths.
import type { MarketSession, Tick } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import type { Distribution } from '../../shared-margin-portfolio/data.ts';
import { type Combination, type PhenotypeName, type Security, type Sym, symbols } from '../context.ts';
import { type Universe, assembleUniverse } from '../data.ts';
import { type RunConfig, baseRunConfig } from '../engine.ts';
import { type D1Key, type ResolvedPhenotype, paramsOf, shortLabel } from '../phenotypes.ts';

const secondsPerMinute = 60;
const secondsPerDay = 86400;

export interface SessionSpec {
  closes: number[];
  slots?: number[]; // minute offsets from 9:30 ET (14:30 UTC); default 0, 1, 2, …
  opens?: (number | undefined)[]; // explicit bar opens (gaps)
  closingPrint?: boolean; // default true
}

export const dateOf = (day: number, start = '2020-01-06') =>
  new Date(Date.parse(start) + day * secondsPerDay * 1000).toISOString().slice(0, 10);

export const buildSession = (date: string, spec: SessionSpec): MarketSession => {
  const time = Date.parse(date) / 1000;
  const openTime = time + (14 * 60 + 30) * secondsPerMinute;
  const closeTime = time + 21 * 60 * secondsPerMinute;
  const slots = spec.slots ?? spec.closes.map((_, index) => index);
  const bars: Tick[] = spec.closes.map((close, index) => {
    const open = spec.opens?.[index] ?? (index === 0 ? close : spec.closes[index - 1]!);

    return {
      time: openTime + slots[index]! * secondsPerMinute,
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
      volume: 1000,
      trades: NaN
    };
  });
  const last = spec.closes.at(-1)!;

  return {
    date,
    time,
    openTime,
    closeTime,
    isEarlyClose: false,
    bars,
    open: bars[0]!.open,
    high: Math.max(...bars.map((bar) => bar.high), last),
    low: Math.min(...bars.map((bar) => bar.low), last),
    close: last,
    volume: 1000 * bars.length,
    trades: NaN,
    closingPrint: spec.closingPrint === false ? undefined : last
  };
};

// A flat session at a price, with `count` bars.
export const flat = (price: number, count = 5): SessionSpec => ({ closes: Array.from({ length: count }, () => price) });

// A universe from per-security session lists (every list the same length).
export const universeOf = (
  specs: Partial<Record<Security, SessionSpec[]>>,
  distributions: Distribution[] = []
): Universe => {
  const instruments: Universe['instruments'] = {};
  let end = '';

  for (const [security, sessions] of Object.entries(specs) as [Security, SessionSpec[]][]) {
    const built = sessions.map((spec, day) => buildSession(dateOf(day), spec));
    const ds = fixtureDataset(built);

    ds.id = `fixture-${security}`;
    instruments[security] = { symbol: security, file: 'fixture', hash: 'fixture', ds };
    end = built.at(-1)!.date;
  }

  return assembleUniverse(instruments, distributions, end, {}, dateOf(0));
};

// Small D1 parameters: arm on a 10% decline from the 3-session high, buy on a 1% rebound, 5% stop, a 30-day hold and
// a 50% buffer (so neither loss exit interferes unless a test wants it), 5% pullback within 5 sessions.
export const testGrid: Record<D1Key, number> = {
  targetPercentChange: 100,
  trailingBuyPercentage: 10,
  trailingStopPercentage: 50,
  maximumHoldDays: 30,
  tickWindowSize: 3,
  intradayLossBuffer: 500,
  pullback: 50,
  continuationWindow: 5
};

export const testPhenotype = (symbol: Sym, grid: Partial<Record<D1Key, number>> = {}): ResolvedPhenotype => {
  const full = { ...testGrid, ...grid };

  return {
    symbol,
    name: 'primary' as PhenotypeName,
    file: 'fixture',
    fileHash: 'fixture',
    description: 'test phenotype',
    candidateId: 'test',
    manifestRole: 'test',
    grid: full,
    params: paramsOf(symbol, 'test', full),
    short: shortLabel(full)
  };
};

export const testConfig = (overrides: Partial<RunConfig> & Pick<RunConfig, 'mode'>): RunConfig => {
  const combination: Combination = { VGT: 'primary', XBI: 'primary', XRT: 'primary', KRE: 'primary' };
  const phenotypes = Object.fromEntries(symbols.map((symbol) => [symbol, testPhenotype(symbol)])) as Record<
    Sym,
    ResolvedPhenotype
  >;

  return baseRunConfig({
    key: 'test',
    label: 'test',
    combination,
    phenotypes,
    initial: { voog: 60000, vgt: 40000 },
    ...overrides
  });
};

// The dip-and-rebound session that arms and triggers the test phenotype from a 100 high: arms on the 89 close,
// lowers the trailing low to 88, triggers on the 90 close (≥ 88 × 1.01) at the end of bar `trigger`, and fills at the
// next bar's open (90). `before` flat bars at 100 come first.
export const dipSession = (before = 1, after = 2, fillPrice = 90): SessionSpec => ({
  closes: [...Array.from({ length: before }, () => 100), 89, 88, 90, ...Array.from({ length: after }, () => fillPrice)]
});

// The bar index of the trigger in a dipSession, and of its fill.
export const dipTriggerBar = (before = 1) => before + 2;

// Fast trace replay versus the independently written reference engine (ENGINE_CONTRACT.md §10): every lot, switch
// record, mark and drawdown must be identical. `synthetic` draws random pools, policies, gates, latencies, chained
// schedules and resets on random sparse synthetic markets until every branch quota is met (or the cap is reached and
// the shortfall is recorded); `f20` draws ≥ 40 random pools of B5 + shallow books on F20 development data through the
// F20 development door (its own process).
import { Rng } from '../optimizer/rng.ts';
import { mulberry32 } from '../study3-vgt-momentum/engine.ts';
import { type Bar, type SessionSpec, datasetOf } from '../study3-vgt-momentum/tests/fixtures.ts';
import { syntheticMarket } from '../study3-vgt-momentum-stage1b/tests/synthetic.ts';
import type { Dataset } from '../four-family/data.ts';
import {
  type AllocBook,
  type AllocConfig,
  type AllocResult,
  type Policy,
  policyOf,
  runAllocator
} from './allocator.ts';
import { type BookSpec, loadB5, paramsOfGrid, shallowBand, shallowBounds, volatilityOf } from './books.ts';
import { type Grid, study } from './context.ts';
import { openDoor } from './doors.ts';
import type { Check } from './parity.ts';
import { type RefBook, type RefConfig, type RefPolicy, type RefResult, runReference } from './reference.ts';
import { randomGrid as randomGridIn } from './space.ts';
import { buildTrace, baseSettings } from './trace.ts';

const eq = (a: number, b: number) => a === b || (Number.isNaN(a) && Number.isNaN(b));

export const refPolicyOf = (p: Policy): RefPolicy => ({
  kind: p.kind,
  budget: p.budget,
  filter: p.filter,
  deadline: p.deadline,
  gate: p.gate,
  lambda: p.lambda,
  replacement: p.replacement,
  latency: p.latency
});

export const compareWithReference = (label: string, fast: AllocResult, ref: RefResult): Check[] => {
  const diffs: string[] = [];
  const add = (what: string, a: unknown, b: unknown) => diffs.push(`${what}: fast ${String(a)} ref ${String(b)}`);

  if (!eq(fast.net, ref.net)) add('net', fast.net, ref.net);
  if (!eq(fast.realized, ref.realized)) add('realized', fast.realized, ref.realized);
  if (!eq(fast.minuteDrawdown.maximum, ref.minuteDrawdown.maximum))
    add('minuteDD', fast.minuteDrawdown.maximum, ref.minuteDrawdown.maximum);
  if (!eq(fast.minuteDrawdown.peakTime, ref.minuteDrawdown.peakTime))
    add('minuteDD peak', fast.minuteDrawdown.peakTime, ref.minuteDrawdown.peakTime);
  if (!eq(fast.minuteDrawdown.troughTime, ref.minuteDrawdown.troughTime))
    add('minuteDD trough', fast.minuteDrawdown.troughTime, ref.minuteDrawdown.troughTime);
  if (!eq(fast.dailyDrawdown.maximum, ref.dailyDrawdown.maximum))
    add('dailyDD', fast.dailyDrawdown.maximum, ref.dailyDrawdown.maximum);
  if (fast.decisions !== ref.decisions) add('decisions', fast.decisions, ref.decisions);
  if (fast.granted !== ref.granted) add('granted', fast.granted, ref.granted);
  if (fast.refused !== ref.refused) add('refused', fast.refused, ref.refused);
  if (fast.lots.length !== ref.lots.length) add('lots', fast.lots.length, ref.lots.length);

  fast.lots.forEach((lot, index) => {
    const other = ref.lots[index];

    if (!other) {
      return;
    }

    const fields: [string, unknown, unknown][] = [
      ['book', lot.bookId, other.bookId],
      ['trade', lot.tradeId, other.tradeId],
      ['kind', lot.kind, other.kind],
      ['entryIndex', lot.entryIndex, other.entryIndex],
      ['entryBar', lot.entryBar, other.entryBar],
      ['entryRaw', lot.entryRawPrice, other.entryRawPrice],
      ['exitIndex', lot.exitIndex, other.exitIndex],
      ['exitBar', lot.exitIndex >= 0 ? lot.exitBar : -1, other.exitIndex >= 0 ? other.exitBar : -1],
      ['exitRaw', lot.exitIndex >= 0 ? lot.exitRawPrice : 0, other.exitIndex >= 0 ? other.exitRawPrice : 0],
      ['exitReason', lot.exitIndex >= 0 ? lot.exitReason : 'open', other.exitIndex >= 0 ? other.exitReason : 'open'],
      ['net', lot.net, other.net]
    ];

    for (const [name, a, b] of fields) {
      if (!(a === b || (typeof a === 'number' && typeof b === 'number' && eq(a, b)))) {
        add(`lot ${index} ${name}`, a, b);
      }
    }
  });

  if (fast.switches.length !== ref.switches.length) add('switches', fast.switches.length, ref.switches.length);

  fast.switches.forEach((sw, index) => {
    const other = ref.switches[index];

    if (!other) {
      return;
    }

    const fields: [string, number | string, number | string][] = [
      ['decisionIndex', sw.decisionIndex, other.decisionIndex],
      ['deep', sw.deepBookId, other.deepBookId],
      ['deepTrade', sw.deepTradeId, other.deepTradeId],
      ['shallow', sw.shallowBookId, other.shallowBookId],
      ['outcome', sw.outcome, other.outcome],
      ['saleIndex', sw.saleIndex, other.saleIndex],
      ['saleBar', sw.saleBar, other.saleBar],
      ['saleRaw', sw.saleRawPrice, other.saleRawPrice],
      ['purchaseIndex', sw.purchaseIndex, other.purchaseIndex],
      ['purchaseBar', sw.purchaseBar, other.purchaseBar],
      ['purchaseRaw', sw.purchaseRawPrice, other.purchaseRawPrice]
    ];

    for (const [name, a, b] of fields) {
      if (!(a === b || (typeof a === 'number' && typeof b === 'number' && eq(a, b)))) {
        add(`switch ${index} ${name}`, a, b);
      }
    }
  });

  let markDiff = 0;

  for (let s = 0; s < Math.min(fast.marks.length, ref.marks.length); s++) {
    if (!eq(fast.marks[s]!, ref.marks[s]!)) {
      markDiff++;
    }
  }

  if (markDiff > 0) add('marks differing', markDiff, 0);

  return diffs.length === 0
    ? [{ name: label, pass: true }]
    : [{ name: label, pass: false, expected: 'identical', actual: diffs.slice(0, 8).join('; ') }];
};

// The branch counters behind the quotas.
export const branchesOf = (result: AllocResult, books: readonly { id: string; symbol: string }[]) => {
  const counts: Record<string, number> = {};
  const add = (key: string, n = 1) => {
    counts[key] = (counts[key] ?? 0) + n;
  };
  const symbolOf = new Map(books.map((book) => [book.id, book.symbol]));

  for (const sw of result.switches) {
    add(sw.outcome);

    if (sw.outcome === 'executed' && symbolOf.get(sw.deepBookId) === symbolOf.get(sw.shallowBookId)) add('same-symbol');
    if (sw.saleIndex > sw.decisionIndex) add('overnight');
    if (sw.waited && sw.outcome === 'executed' && sw.saleIndex >= 0) add('P4 forced or recovered');
    if (sw.late && sw.mirrorLotId > 0) add('P0M late');
    if (sw.mirrorKind === 'orphan') add('orphan-mirror');
  }

  for (const lot of result.lots) {
    if (lot.kind === 'mirror') add('mirror lot');
    if (lot.exitReason === 'annual-reset') add('reset');
  }

  add('gate refusal', result.refusalReasons.gate ?? 0);
  return counts;
};

const quotaKeys = [
  'executed',
  'declined',
  'aborted',
  'superseded',
  'cancelled-reservation',
  'stale-replacement',
  'stale-wait',
  'P4 forced or recovered',
  'P0M late',
  'gate refusal',
  'same-symbol',
  'overnight',
  'orphan-mirror',
  'reset'
];

const randomPolicy = (rng: Rng): Policy => {
  const kinds: Policy['kind'][] = ['P0', 'P0M', 'P1', 'P2', 'P3', 'P4'];
  const kind = kinds[rng.int(kinds.length)]!;
  const gate = (['G0', 'G1', 'G1d', 'G2'] as const)[rng.int(4)]!;

  return policyOf(kind, {
    budget: kind === 'P3' ? 250 * rng.int(21) : 0,
    filter: kind === 'P3' && rng.next() < 0.5 ? 'deep' : 'any',
    deadline: kind === 'P4' ? rng.int(2) : 0,
    gate,
    lambda: [0.5, 0.75, 0.9][rng.int(3)]!,
    replacement: kind === 'P2' && rng.next() < 0.3 ? 'legacy' : 'mirror',
    latency: rng.next() < 0.2 ? 300 : 60
  });
};

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

const runBoth = (books: { spec: BookSpec; ds: Dataset }[], config: AllocConfig, armStart: number) => {
  const settings = baseSettings({ costBps: config.costBps, stopSlippageBps: config.stopSlippageBps });
  const allocBooks: AllocBook[] = books.map((book, rank) => ({
    id: book.spec.id,
    symbol: book.spec.symbol,
    tier: book.spec.tier,
    ds: book.ds,
    trace: buildTrace(book.ds, book.spec, settings, armStart, 0, config.endIndex),
    shallowRank: book.spec.tier === 'shallow' ? rank : undefined
  }));
  const fast = runAllocator(allocBooks, config);
  const refBooks: RefBook[] = books.map((book, rank) => ({
    id: book.spec.id,
    symbol: book.spec.symbol,
    tier: book.spec.tier,
    ds: book.ds,
    params: paramsOfGrid(book.spec.symbol, book.spec.grid),
    shallowRank: book.spec.tier === 'shallow' ? rank : undefined
  }));
  const refConfig: RefConfig = {
    startIndex: config.startIndex,
    endIndex: config.endIndex,
    armStart,
    principal: config.principal,
    rate: config.rate,
    costBps: config.costBps,
    stopSlippageBps: config.stopSlippageBps,
    stopFill: 'stop',
    policy: refPolicyOf(config.policy),
    policySchedule: config.policySchedule?.map((item) => ({ from: item.from, policy: refPolicyOf(item.policy) })),
    tieMode: config.tieMode,
    resets: config.resets
  };
  const ref = runReference(refBooks, refConfig);

  return { fast, ref, allocBooks };
};

// ----- harder synthetic markets (no market data) -----
// 'sparse': 390 clock slots with missing minutes (never the first; the price moves through them, so the next bar can
// open through a stop) and some sessions without a closing print; 'short': 30-minute sessions; 'shortSparse': both.
// Sessions are weekdays from 2016-01-04, so every market of a kind shares one calendar.
type Kind = 'dense' | 'sparse' | 'short' | 'shortSparse';

const SESSIONS = 420;

const sparseMarket = (seed: number, slots: number, heavy: boolean) => {
  const random = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(2 * Math.PI * random());
  const specs: SessionSpec[] = [];
  let price = 100;
  let regime = 0;

  for (let s = 0; s < SESSIONS; s++) {
    if (random() < 0.02) {
      regime = Math.floor(random() * 3);
    }

    const drift = [0.0012, 0, -0.0025][regime]!;
    const vol = [0.011, 0.014, 0.025][regime]!;
    const missing = new Set<number>();

    if (heavy) {
      const share = random() * 0.35;

      for (let slot = 1; slot < slots; slot++) {
        if (random() < share) {
          missing.add(slot);
        }
      }
    } else if (random() < 0.25) {
      for (let i = 0, n = 1 + Math.floor(random() * 6); i < n; i++) {
        missing.add(1 + Math.floor(random() * (slots - 1)));
      }
    }

    if (random() < (heavy ? 0.25 : 0.1)) {
      missing.add(slots - 1);
    }

    const step = vol / Math.sqrt(slots);
    let p = price * (1 + gauss() * vol * 0.4);
    const bars: Bar[] = [];

    for (let slot = 0; slot < slots; slot++) {
      const open = p;

      p = p * (1 + drift / slots + step * gauss());

      if (!missing.has(slot)) {
        bars.push([
          open,
          Math.max(open, p) * (1 + Math.abs(gauss()) * step * 0.3),
          Math.min(open, p) * (1 - Math.abs(gauss()) * step * 0.3),
          p
        ]);
      }
    }

    price = p;
    specs.push({
      bars,
      missing: [...missing].sort((a, b) => a - b),
      ...(random() < 0.08 ? { closingPrint: null } : {})
    });
  }

  return datasetOf(specs);
};

const marketCache = new Map<string, Dataset>();

const marketOf = (seed: number, kind: Kind) => {
  const key = `${kind}-${seed}`;
  let ds = marketCache.get(key);

  if (!ds) {
    ds =
      kind === 'dense'
        ? syntheticMarket(SESSIONS, seed)
        : kind === 'short'
          ? syntheticMarket(SESSIONS, seed, 30)
          : sparseMarket(seed, kind === 'sparse' ? 390 : 30, kind === 'shortSparse');
    ds.id = `parity-${key}`;
    marketCache.set(key, ds);
  }

  return ds;
};

const tightGrid = (rng: Rng, tier: 'deep' | 'shallow'): Grid => ({
  targetPercentChange: tier === 'deep' ? 50 + rng.int(61) : 20 + rng.int(31),
  trailingBuyPercentage: 1 + rng.int(20),
  trailingStopPercentage: 20 + rng.int(41),
  maximumHoldDays: 3 + rng.int(5),
  tickWindowSize: 20 + rng.int(21),
  intradayLossBuffer: rng.int(31),
  pullback: 30 + rng.int(91),
  continuationWindow: 10 + rng.int(111)
});

// a deep and a shallow book on the same prices (one symbol, or two names over one dataset: the shallow one sorts first
// in frozen-tie mode) — same-minute decisions, reservation cancels, orphan and intrabar mirror exits
const twinPool = (
  rng: Rng,
  seed: number,
  kind: Kind,
  sameSymbol: boolean,
  late: boolean
): { spec: BookSpec; ds: Dataset }[] => {
  const ds = marketOf(seed, kind);
  const base = tightGrid(rng, 'shallow');
  const shallowGrid = late ? base : { ...base, trailingBuyPercentage: 10 + rng.int(21) };
  const deepGrid = {
    ...shallowGrid,
    targetPercentChange: shallowGrid.targetPercentChange + (late ? 5 + rng.int(26) : 10 + rng.int(41)),
    trailingStopPercentage: shallowGrid.trailingStopPercentage + 1 + rng.int(late ? 3 : 4)
  };
  const shallowSymbol = sameSymbol ? 'D0' : 'A1';

  return [
    { spec: { id: `d:D0:${seed}`, symbol: 'D0', tier: 'deep', grid: deepGrid, origin: 'parity' }, ds },
    {
      spec: {
        id: `s:${shallowSymbol}:${seed}`,
        symbol: shallowSymbol,
        tier: 'shallow',
        grid: shallowGrid,
        origin: 'parity'
      },
      ds
    }
  ];
};

// Orphan pools: the deep book on a market whose bars open away from the previous close (stops are often crossed at a
// minute's open) and the shallow book on a market whose sessions often lose their last minutes and closing print (a
// sale is then carried to the next opening trade, and the mirror purchase lands on a later bar of that session).
const jumpyMarket = (seed: number, early: boolean) => {
  const random = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(2 * Math.PI * random());
  const specs: SessionSpec[] = [];
  const slots = 30;
  let price = 100;

  for (let s = 0; s < SESSIONS; s++) {
    const vol = early ? 0.014 : random() < 0.3 ? 0.06 : 0.025;
    const step = vol / Math.sqrt(slots);
    const missing = new Set<number>();
    const cut = early && random() < 0.85 ? 5 + Math.floor(random() * 16) : 0;

    for (let slot = slots - cut; slot < slots; slot++) {
      missing.add(slot);
    }

    let p = price * (1 + gauss() * vol * 0.4);
    const bars: Bar[] = [];

    for (let slot = 0; slot < slots; slot++) {
      const open = slot === 0 ? p : p * (1 + gauss() * (early ? 0.0005 : 0.01));

      p = open * (1 + step * gauss());

      if (!missing.has(slot)) {
        bars.push([
          open,
          Math.max(open, p) * (1 + Math.abs(gauss()) * step * 0.2),
          Math.min(open, p) * (1 - Math.abs(gauss()) * step * 0.2),
          p
        ]);
      }
    }

    price = p;
    specs.push({ bars, missing: [...missing].sort((a, b) => a - b), ...(cut > 0 ? { closingPrint: null } : {}) });
  }

  const ds = datasetOf(specs);

  ds.id = `parity-${early ? 'early' : 'jumpy'}-${seed}`;
  return ds;
};

// Orphan twins: both books on one jumpy price path, the deep book a little deeper (it decides later in the same dip,
// while the shallow lot is held) with a stop 0.1–0.3 pp wider: the shallow lot's own stop fires inside a bar and the
// deep stop is often crossed at the next bar's open — the late-funded purchase's own print.
const orphanTwin = (rng: Rng, seed: number): { spec: BookSpec; ds: Dataset }[] => {
  const ds = jumpyMarket(seed, false);
  const shallowGrid = {
    ...tightGrid(rng, 'shallow'),
    trailingStopPercentage: 20 + rng.int(6),
    intradayLossBuffer: 60,
    maximumHoldDays: 30
  };
  const deepGrid = {
    ...shallowGrid,
    targetPercentChange: shallowGrid.targetPercentChange + 3 + rng.int(15),
    trailingStopPercentage: shallowGrid.trailingStopPercentage + 1 + rng.int(3)
  };

  return [
    { spec: { id: `d:T${seed}`, symbol: `T${seed}`, tier: 'deep', grid: deepGrid, origin: 'parity' }, ds },
    { spec: { id: `s:T${seed}`, symbol: `T${seed}`, tier: 'shallow', grid: shallowGrid, origin: 'parity' }, ds }
  ];
};

export const orphanTwinForTests = orphanTwin;

const orphanPool = (rng: Rng, seed: number): { spec: BookSpec; ds: Dataset }[] => {
  const deep = jumpyMarket(seed, false);
  const shallow = jumpyMarket(seed + 1, true);
  const deepGrid = {
    ...tightGrid(rng, 'deep'),
    trailingStopPercentage: 20 + rng.int(6),
    maximumHoldDays: 5 + rng.int(10),
    intradayLossBuffer: 60
  };

  return [
    { spec: { id: `d:J${seed}`, symbol: `J${seed}`, tier: 'deep', grid: deepGrid, origin: 'parity' }, ds: deep },
    {
      spec: {
        id: `s:E${seed}`,
        symbol: `E${seed}`,
        tier: 'shallow',
        grid: { ...tightGrid(rng, 'shallow'), maximumHoldDays: 30, trailingStopPercentage: 150 },
        origin: 'parity'
      },
      ds: shallow
    }
  ];
};

export const orphanPoolForTests = orphanPool;
export const SESSIONS_FOR_TESTS = SESSIONS;

export const parityReference = async (
  mode: string,
  debug?: (
    pool: number,
    info: { books: { spec: BookSpec; ds: Dataset }[]; config: AllocConfig; fast: AllocResult; ref: RefResult }
  ) => void
) => {
  const checks: Check[] = [];
  const quotas: Record<string, number> = {};
  let pools = 0;

  if (mode === 'synthetic') {
    const rng = new Rng([7, 1, 7, 1]);
    const kinds: Kind[] = ['dense', 'sparse', 'short', 'shortSparse', 'shortSparse', 'short'];

    for (pools = 0; pools < 6000; pools++) {
      const met = quotaKeys.every((key) => (quotas[key] ?? 0) >= 10);

      if (pools >= 400 && met) {
        break;
      }

      const kind = kinds[pools % kinds.length]!;
      const shape = pools % 5;
      let books: { spec: BookSpec; ds: Dataset }[] = [];
      let tieMode: AllocConfig['tieMode'] = 'tier';

      if (shape === 4) {
        books = orphanTwin(rng, 40000 + 2 * pools);
      } else if (shape === 2 && pools % 2 === 0) {
        books = orphanPool(rng, 30000 + 2 * pools);
      } else if (shape === 3) {
        // a twin pool (half of them late twins); frozen ties for distinct names half the time
        const sameSymbol = rng.next() < 0.5;

        books = twinPool(rng, 20000 + pools, kind === 'dense' ? 'short' : kind, sameSymbol, rng.next() < 0.6);
        tieMode = !sameSymbol && rng.next() < 0.5 ? 'frozen' : 'tier';
      } else {
        const deepCount = 1 + rng.int(3);
        const shallowCount = 1 + rng.int(3);
        const tight = kind === 'short' || kind === 'shortSparse';

        for (let i = 0; i < deepCount + shallowCount; i++) {
          const tier = i < deepCount ? 'deep' : 'shallow';
          const m =
            rng.next() < 0.25 && books.length > 0
              ? Number(books[rng.int(books.length)]!.spec.symbol.slice(1))
              : rng.int(6);
          const grid = tight
            ? tightGrid(rng, tier)
            : tier === 'deep'
              ? randomGrid(rng, 80, 250)
              : randomGrid(rng, 30, 90);
          const symbol = `M${m}`;

          books.push({
            spec: { id: `${tier[0]}${i}:${symbol}`, symbol, tier, grid, origin: 'parity' },
            ds: marketOf(1000 * (pools % 7) + m, kind)
          });
        }
      }

      const cost = [0, 2, 5, 10][rng.int(4)]!;
      const orphanShape = shape === 4 || (shape === 2 && pools % 2 === 0);
      const policy =
        shape === 4 && rng.next() < 0.6
          ? policyOf('P0M')
          : orphanShape && rng.next() < 0.6
            ? policyOf('P1')
            : randomPolicy(rng);
      const chained = !orphanShape && rng.next() < 0.25;
      const config: AllocConfig = {
        startIndex: 0,
        endIndex: SESSIONS - 1,
        armStart: 60,
        principal: 100000,
        rate: 0.11,
        costBps: cost,
        stopSlippageBps: rng.next() < 0.2 ? 25 : 0,
        policy,
        tieMode,
        ...(chained
          ? {
              policySchedule: [{ from: 250, policy: randomPolicy(rng) }],
              resets: rng.next() < 0.5 ? [249, 340] : undefined
            }
          : {})
      };
      const { fast, ref, allocBooks } = runBoth(books, config, 60);
      const failing = compareWithReference(`synthetic pool ${pools}`, fast, ref).filter((check) => !check.pass);

      if (debug && failing.length > 0) {
        debug(pools, { books, config, fast, ref });
      }

      checks.push(...failing);

      for (const [key, n] of Object.entries(branchesOf(fast, allocBooks))) {
        quotas[key] = (quotas[key] ?? 0) + n;
      }
    }
  } else if (mode === 'f20') {
    const b5 = await loadB5();
    const door = await openDoor({ purpose: 'development', window: 'F20', symbols: study.universe });
    const rng = new Rng([2, 0, 2, 0]);
    const endIndex = door.sessionCount - 1;
    const candidates = door.symbols.filter(
      (symbol) =>
        !shallowBand(
          volatilityOf(door.datasets[symbol]!, endIndex),
          b5.books.find((b) => b.symbol === symbol)?.grid.targetPercentChange
        ).empty
    );

    for (pools = 0; pools < 60; pools++) {
      const books: { spec: BookSpec; ds: Dataset }[] = b5.books.map((book) => ({
        spec: book,
        ds: door.datasets[book.symbol]!
      }));
      const shallowCount = 1 + rng.int(3);

      for (let i = 0; i < shallowCount; i++) {
        const symbol = candidates[rng.int(candidates.length)]!;
        const sigma = volatilityOf(door.datasets[symbol]!, endIndex);
        const band = shallowBand(sigma, b5.books.find((b) => b.symbol === symbol)?.grid.targetPercentChange);
        const grid = randomGridIn(rng, shallowBounds(band));

        books.push({
          spec: { id: `S${i}:${symbol}`, symbol, tier: 'shallow', grid, origin: 'parity' },
          ds: door.datasets[symbol]!
        });
      }

      const config: AllocConfig = {
        startIndex: 0,
        endIndex,
        armStart: door.armStart,
        principal: 100000,
        rate: 0.11,
        costBps: 5,
        stopSlippageBps: 0,
        policy: randomPolicy(rng),
        tieMode: 'tier'
      };
      const { fast, ref, allocBooks } = runBoth(books, config, door.armStart);

      checks.push(...compareWithReference(`F20 pool ${pools}`, fast, ref).filter((check) => !check.pass));

      for (const [key, n] of Object.entries(branchesOf(fast, allocBooks))) {
        quotas[key] = (quotas[key] ?? 0) + n;
      }
    }
  } else {
    throw new Error(`unknown parity mode ${mode}`);
  }

  const shortfalls = mode === 'synthetic' ? quotaKeys.filter((key) => (quotas[key] ?? 0) < 10) : [];

  return {
    stage: `PARITY_REFERENCE_${mode.toUpperCase()}`,
    pass: checks.length === 0 && shortfalls.length === 0 && pools >= (mode === 'synthetic' ? 200 : 40),
    pools,
    checks,
    quotas,
    shortfalls
  };
};

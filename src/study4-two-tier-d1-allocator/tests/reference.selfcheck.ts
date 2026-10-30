// Self-check of the Study 4 reference engine (../reference.ts) on synthetic markets only (no market data):
//   1. P0 parity: under P0, tieMode 'frozen' and distinct symbols, the reference equals the frozen
//      replayFixedPool (src/portfolio-aware-d1/replay.ts over traceBook traces) exactly — net, realized, minute and
//      daily drawdown (maximum, peak, trough), every lot (entry/exit index, bar, raw price, shares, interest, net),
//      every mark and the decision counts — on random pools of 1–6 books at 0/2/5/10 bps (dense and sparse markets,
//      and a few next-open stop / stop-slippage runs).
//   2. P2L parity: one deep and one shallow book on distinct symbols, P2L equals the frozen replayPreemptive
//      (P1, $0, deep ranked above shallow) on lots, marks, drawdowns, counts and preemption outcomes.
//   3. Metamorphic: permuting the books' input order changes nothing; a shallow book that never trades reproduces
//      the deep books' P0 result under every policy.
//   4. Branch reachability: every non-P0 policy on random pools mixing deep and shallow books (some sharing a
//      symbol), with identities checked per run; outcome counts per policy are printed.
//   5. Chained accounts: resets, a policy schedule and runoff books, with the identities.
// A plain script: `node --experimental-transform-types --disable-warning=ExperimentalWarning <this file>`.
import type { Dataset } from '../../four-family/data.ts';
import { protocol } from '../../multi-etf-allocator/context.ts';
import { type D1Key, paramsOf } from '../../multi-etf-allocator/phenotypes.ts';
import { policies } from '../../d1-ranked-preemption/allocation.ts';
import { replayPreemptive } from '../../d1-ranked-preemption/replay.ts';
import { replayFixedPool } from '../../portfolio-aware-d1/replay.ts';
import { type TraceSettings, traceBook, traceSettings } from '../../portfolio-aware-d1/trace.ts';
import { timeAt } from '../../shared-margin-portfolio/strategy.ts';
import { mulberry32 } from '../../study3-vgt-momentum/engine.ts';
import { type Bar, type SessionSpec, datasetOf } from '../../study3-vgt-momentum/tests/fixtures.ts';
import { syntheticMarket } from '../../study3-vgt-momentum-stage1b/tests/synthetic.ts';
import {
  type RefBook,
  type RefConfig,
  type RefOutcome,
  type RefPolicy,
  type RefResult,
  runReference
} from '../reference.ts';

const SESSIONS = 420;
const START = 0;
const END = SESSIONS - 1;
const ARM = 70;
const principal = protocol.notional;
const rate = protocol.rate;

const outcomes: RefOutcome[] = [
  'executed',
  'superseded',
  'declined',
  'declined-filter',
  'aborted',
  'aborted-replacement-first',
  'aborted-auction',
  'cancelled-reservation',
  'stale-replacement',
  'stale-before-sale',
  'stale-wait',
  'pending-at-end'
];

// ----- markets -----

const markets = new Map<string, Dataset>();

// Market kinds. 'dense': syntheticMarket (390 one-minute bars and a closing print every session). 'sparse': the same
// generator's model with 390 clock slots but some minutes missing (never the first; the price moves on through them,
// so the next bar can open through a stop) and some sessions without a closing print, so the merged timeline has bars
// other symbols lack and orders can reach the closing print. 'short'
// and 'shortSparse': 30-minute sessions (syntheticMarket's own `minutes` argument, or the sparse model with up to a
// third of the minutes missing), which make session-boundary branches (overnight orders, auction prints, deadlines,
// opening-trade exits) frequent. One kind per pool: identical calendars and close times.
type Kind = 'dense' | 'sparse' | 'short' | 'shortSparse';

const sparseMarket = (sessions: number, seed: number, slots: number, heavy: boolean) => {
  const random = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(2 * Math.PI * random());
  const specs: SessionSpec[] = [];
  let price = 100;
  let regime = 0;

  for (let s = 0; s < sessions; s++) {
    if (random() < 0.02) {
      regime = Math.floor(random() * 3);
    }

    const drift = [0.0012, 0, -0.0025][regime]!;
    const vol = [0.011, 0.014, 0.025][regime]!;
    const missing = new Set<number>();

    if (heavy) {
      const p = random() * 0.35;

      for (let slot = 1; slot < slots; slot++) {
        if (random() < p) {
          missing.add(slot);
        }
      }
    } else if (random() < 0.25) {
      const n = 1 + Math.floor(random() * 6);

      for (let i = 0; i < n; i++) {
        missing.add(1 + Math.floor(random() * (slots - 1)));
      }
    }

    if (random() < (heavy ? 0.25 : 0.1)) {
      missing.add(slots - 1); // the last minute is missing: an order decided a minute earlier reaches the closing print
    }

    const step = vol / Math.sqrt(slots);
    let p = price * (1 + gauss() * vol * 0.4);
    const bars: Bar[] = [];

    // The price moves through a missing minute too: the next bar opens away from the last bar's close.
    for (let slot = 0; slot < slots; slot++) {
      const open = p;

      p = p * (1 + drift / slots + step * gauss());

      if (missing.has(slot)) {
        continue;
      }

      bars.push([
        open,
        Math.max(open, p) * (1 + Math.abs(gauss()) * step * 0.3),
        Math.min(open, p) * (1 - Math.abs(gauss()) * step * 0.3),
        p
      ]);
    }

    price = p;

    const spec: SessionSpec = { bars, missing: [...missing].sort((a, b) => a - b) };

    if (random() < 0.08) {
      spec.closingPrint = null;
    }

    specs.push(spec);
  }

  return datasetOf(specs);
};

const marketOf = (seed: number, kind: Kind) => {
  const key = `${kind}-${seed}`;
  let ds = markets.get(key);

  if (!ds) {
    ds =
      kind === 'dense'
        ? syntheticMarket(SESSIONS, seed)
        : kind === 'short'
          ? syntheticMarket(SESSIONS, seed, 30)
          : sparseMarket(SESSIONS, seed, kind === 'sparse' ? 390 : 30, kind === 'shortSparse');
    ds.id = key;
    markets.set(key, ds);
  }

  return ds;
};

// ----- random D1 vectors on the grid -----

// 'tight' books (branch section): short holds, tight stops and short lookbacks, so that switches meet exits often.
const gridOf = (random: () => number, tier: 'deep' | 'shallow' | 'never', tight: boolean): Record<D1Key, number> => {
  const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));

  if (tight) {
    return {
      targetPercentChange: tier === 'never' ? 999 : tier === 'deep' ? int(50, 110) : int(20, 50),
      trailingBuyPercentage: int(1, 20),
      trailingStopPercentage: int(20, 60),
      maximumHoldDays: int(3, 7),
      tickWindowSize: int(20, 40),
      intradayLossBuffer: int(0, 30),
      pullback: int(30, 120),
      continuationWindow: int(10, 120)
    };
  }

  return {
    targetPercentChange: tier === 'never' ? 999 : tier === 'deep' ? int(70, 180) : int(25, 70),
    trailingBuyPercentage: int(1, 30),
    trailingStopPercentage: int(30, 150),
    maximumHoldDays: int(3, 30),
    tickWindowSize: int(20, 65),
    intradayLossBuffer: int(0, 60),
    pullback: int(30, 200),
    continuationWindow: int(10, 200)
  };
};

let bookSerial = 0;

const bookOf = (
  random: () => number,
  symbol: string,
  ds: Dataset,
  tier: 'deep' | 'shallow',
  never = false,
  tight = false
): RefBook => {
  const id = `${tier[0]}${++bookSerial}:${symbol}`;

  return { id, symbol, tier, ds, params: paramsOf(symbol, id, gridOf(random, never ? 'never' : tier, tight)) };
};

const policy = (kind: RefPolicy['kind'], over: Partial<RefPolicy> = {}): RefPolicy => ({
  kind,
  budget: 0,
  filter: 'any',
  deadline: 0,
  gate: 'G0',
  lambda: 0.75,
  replacement: 'mirror',
  latency: 60,
  ...over
});

const baseConfig = (costBps: number, pol: RefPolicy, tieMode: RefConfig['tieMode'], over: Partial<RefConfig> = {}) =>
  ({
    startIndex: START,
    endIndex: END,
    armStart: ARM,
    principal,
    rate,
    costBps,
    stopSlippageBps: 0,
    stopFill: 'stop',
    policy: pol,
    tieMode,
    ...over
  }) satisfies RefConfig;

// ----- comparison helpers -----

const same = (a: number, b: number) => Object.is(a, b) || (a === 0 && b === 0);

const diff = (label: string, a: unknown, b: unknown, problems: string[]) => {
  if (typeof a === 'number' && typeof b === 'number' ? !same(a, b) : a !== b) {
    problems.push(`${label}: reference ${String(a)} vs frozen ${String(b)}`);
  }
};

interface FrozenLot {
  symbol: string;
  trade: { id: number };
  entryIndex: number;
  entryBar: number;
  entryRawPrice: number;
  exitIndex: number;
  exitBar: number;
  exitRawPrice: number;
  exitReason: string;
  shares: number;
  interest: number;
  net: number;
}

const compareToFrozen = (
  ref: RefResult,
  frozen: {
    net: number;
    realized: number;
    minuteDrawdown: { maximum: number; peakTime: number; troughTime: number };
    dailyDrawdown: { maximum: number; peakTime: number; troughTime: number };
    marks: Float64Array;
    decisions: number;
    granted: number;
    refused: number;
    full?: { lots: unknown[] };
  },
  symbolOf: Map<string, string>,
  checkReasons: boolean
) => {
  const problems: string[] = [];

  diff('net', ref.net, frozen.net, problems);
  diff('realized', ref.realized, frozen.realized, problems);

  for (const key of ['maximum', 'peakTime', 'troughTime'] as const) {
    diff(`minuteDrawdown.${key}`, ref.minuteDrawdown[key], frozen.minuteDrawdown[key], problems);
    diff(`dailyDrawdown.${key}`, ref.dailyDrawdown[key], frozen.dailyDrawdown[key], problems);
  }

  diff('decisions', ref.decisions, frozen.decisions, problems);
  diff('granted', ref.granted, frozen.granted, problems);
  diff('refused', ref.refused, frozen.refused, problems);
  diff('marks.length', ref.marks.length, frozen.marks.length, problems);

  for (let s = 0; s < Math.min(ref.marks.length, frozen.marks.length); s++) {
    if (!same(ref.marks[s]!, frozen.marks[s]!)) {
      problems.push(`mark ${s}: reference ${ref.marks[s]} vs frozen ${frozen.marks[s]}`);
      break;
    }
  }

  const lots = (frozen.full?.lots ?? []) as FrozenLot[];

  diff('lot count', ref.lots.length, lots.length, problems);

  for (let i = 0; i < Math.min(ref.lots.length, lots.length); i++) {
    const a = ref.lots[i]!;
    const b = lots[i]!;

    diff(`lot ${i} symbol`, symbolOf.get(a.bookId), b.symbol, problems);
    diff(`lot ${i} tradeId`, a.tradeId, b.trade.id, problems);

    for (const key of [
      'entryIndex',
      'entryBar',
      'entryRawPrice',
      'exitIndex',
      'exitBar',
      'exitRawPrice',
      'shares',
      'interest',
      'net'
    ] as const) {
      diff(`lot ${i} ${key}`, a[key], b[key], problems);
    }

    if (checkReasons) {
      diff(`lot ${i} exitReason`, a.exitReason, b.exitReason, problems);
    }
  }

  return problems;
};

const window = { armStart: ARM, startIndex: START, endIndex: END, splitsSha256: 'synthetic' };

const replayBooksOf = (books: RefBook[], settings: TraceSettings) =>
  books.map((book) => ({
    symbol: book.symbol,
    ds: book.ds,
    trace: traceBook(
      book.ds,
      { symbol: book.symbol, name: book.id, params: book.params, short: book.id },
      settings,
      window
    )
  }));

// ----- identities per run -----

const eventKey = (ds: Dataset, s: number, k: number) => [s, k >= ds.sBarCount[s]! ? 1 : 0, timeAt(ds, s, k)] as const;

const keyCompare = (a: readonly number[], b: readonly number[]) => a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!;

const identities = (books: RefBook[], config: RefConfig, ref: RefResult) => {
  const problems: string[] = [];
  const byId = new Map(books.map((book) => [book.id, book]));
  let realized = 0;

  ref.lots.forEach((lot, i) => {
    const ds = byId.get(lot.bookId)!.ds;

    if (lot.exitIndex >= 0) {
      realized += lot.net;

      if (keyCompare(eventKey(ds, lot.entryIndex, lot.entryBar), eventKey(ds, lot.exitIndex, lot.exitBar)) > 0) {
        problems.push(`lot ${i} exits before its entry`);
      }
    } else if (i !== ref.lots.length - 1) {
      problems.push(`lot ${i} is open but not the last lot`);
    }

    const next = ref.lots[i + 1];

    if (next && lot.exitIndex >= 0) {
      const nds = byId.get(next.bookId)!.ds;

      if (keyCompare(eventKey(ds, lot.exitIndex, lot.exitBar), eventKey(nds, next.entryIndex, next.entryBar)) > 0) {
        problems.push(`lots ${i} and ${i + 1} overlap`);
      }
    }

    if (lot.kind === 'orphan' && lot.exitIndex >= 0 && lot.exitReason !== 'orphan-mirror') {
      problems.push(`orphan lot ${i} exits by ${lot.exitReason}`);
    }

    if (lot.exitReason === 'priority_preemption' && byId.get(lot.bookId)!.tier !== 'shallow') {
      problems.push(`a deep lot ${i} was preempted`);
    }
  });

  if (!same(realized, ref.realized)) {
    problems.push(`Σ closed lot nets ${realized} ≠ realized ${ref.realized}`);
  }

  const open = ref.lots.at(-1);

  if (!same(ref.net, ref.realized + (open && open.exitIndex < 0 ? open.net : 0))) {
    problems.push('net ≠ realized + open lot');
  }

  if (ref.decisions !== ref.granted + ref.refused) {
    problems.push('decisions ≠ granted + refused');
  }

  for (let s = config.startIndex; s <= config.endIndex; s++) {
    if (!Number.isFinite(ref.marks[s]!)) {
      problems.push(`mark ${s} is not finite`);
      break;
    }
  }

  if (!same(ref.marks[config.endIndex]!, ref.net)) {
    problems.push('the last mark ≠ net');
  }

  for (const sw of ref.switches) {
    if (!outcomes.includes(sw.outcome)) {
      problems.push(`unknown outcome ${sw.outcome}`);
    }

    if (sw.purchaseIndex >= 0 && sw.saleIndex >= 0) {
      const deep = byId.get(sw.deepBookId)!.ds;
      const shallow = byId.get(sw.shallowBookId)!.ds;
      const sale = eventKey(shallow, sw.saleIndex, sw.saleBar);
      const purchase = eventKey(deep, sw.purchaseIndex, sw.purchaseBar);
      let inForce = config.policy;

      for (const entry of [...(config.policySchedule ?? [])].sort((a, b) => a.from - b.from)) {
        if (entry.from <= sw.decisionIndex) {
          inForce = entry.policy;
        }
      }

      const legacy = inForce.replacement === 'legacy';

      if (legacy ? keyCompare(purchase, sale) < 0 : sale[0] === purchase[0] && purchase[2] - sale[2] < 60) {
        problems.push(`switch ${sw.deepBookId}#${sw.deepTradeId}: purchase too soon after the sale`);
      }
    }
  }

  return problems;
};

// Every funded lot against its book's frozen trace (traceBook: the book alone over its own symbol): an exact lot is
// the virtual trade's own fill (and own exit unless preempted or reset); a mirror lot enters after the virtual fill and
// exits exactly at the virtual exit (time, raw price, reason); an orphan enters at the virtual exit's print and is sold
// at the next print; every switch record names a real deep trade and its decision. Exact equality throughout.
const traceCache = new Map<string, ReturnType<typeof traceBook>>();

const traceChecks = (books: RefBook[], config: RefConfig, ref: RefResult) => {
  const problems: string[] = [];
  const settings = traceSettings(config.costBps, {
    stopFill: config.stopFill,
    stopSlippageBps: config.stopSlippageBps
  });
  const tradesOf = new Map<string, ReturnType<typeof traceBook>['trades']>();
  const byId = new Map(books.map((book) => [book.id, book]));

  for (const book of books) {
    const key = `${book.id}|${config.costBps}|${config.stopFill}|${config.stopSlippageBps}`;
    let trace = traceCache.get(key);

    if (!trace) {
      trace = traceBook(
        book.ds,
        { symbol: book.symbol, name: book.id, params: book.params, short: book.id },
        settings,
        {
          armStart: config.armStart,
          startIndex: config.startIndex,
          endIndex: config.endIndex,
          splitsSha256: 'synthetic'
        }
      );
      traceCache.set(key, trace);
    }

    tradesOf.set(book.id, trace.trades);
  }

  ref.lots.forEach((lot, i) => {
    const ds = byId.get(lot.bookId)!.ds;
    const trade = tradesOf.get(lot.bookId)![lot.tradeId - 1];
    const forced = lot.exitReason === 'priority_preemption' || lot.exitReason === 'annual-reset';

    if (!trade || trade.id !== lot.tradeId) {
      problems.push(`lot ${i}: no trade ${lot.bookId}#${lot.tradeId}`);
      return;
    }

    const exitMatches = () =>
      lot.exitIndex === trade.exitIndex &&
      (lot.exitIndex < 0 ||
        (lot.exitBar === trade.exitBar &&
          same(lot.exitRawPrice, trade.exitRawPrice) &&
          lot.exitReason === trade.exitReason));

    if (lot.kind === 'exact') {
      if (
        lot.entryIndex !== trade.entryIndex ||
        lot.entryBar !== trade.entryBar ||
        !same(lot.entryRawPrice, trade.entryRawPrice)
      ) {
        problems.push(`exact lot ${i} does not enter at ${lot.bookId}#${lot.tradeId}'s fill`);
      }

      if (!forced && !exitMatches()) {
        problems.push(`exact lot ${i} does not exit at ${lot.bookId}#${lot.tradeId}'s exit`);
      }
    } else if (lot.kind === 'mirror') {
      if (keyCompare(eventKey(ds, lot.entryIndex, lot.entryBar), eventKey(ds, trade.entryIndex, trade.entryBar)) <= 0) {
        problems.push(`mirror lot ${i} enters at or before the virtual fill`);
      }

      if (lot.exitReason === 'priority_preemption' || (!forced && !exitMatches())) {
        problems.push(`mirror lot ${i} does not exit at the virtual exit`);
      }
    } else {
      if (lot.entryIndex !== trade.exitIndex || lot.entryBar !== trade.exitBar) {
        problems.push(`orphan lot ${i} is not bought at the virtual exit's print`);
      }

      if (lot.exitIndex >= 0 && lot.exitReason === 'orphan-mirror') {
        const count = ds.sBarCount[lot.entryIndex]!;
        const next =
          lot.entryBar + 1 < count
            ? [lot.entryIndex, lot.entryBar + 1]
            : !Number.isNaN(ds.sClosingPrint[lot.entryIndex]!) && lot.entryBar < count
              ? [lot.entryIndex, count]
              : [lot.entryIndex + 1, 0];

        if (lot.exitIndex !== next[0] || lot.exitBar !== next[1]) {
          problems.push(`orphan lot ${i} is not sold at the next print`);
        }
      }
    }
  });

  for (const record of ref.switches) {
    const trade = tradesOf.get(record.deepBookId)![record.deepTradeId - 1];

    if (!trade || trade.decisionIndex !== record.decisionIndex || trade.decisionTime !== record.decisionTime) {
      problems.push(`switch ${record.deepBookId}#${record.deepTradeId} does not match its trade's decision`);
    }
  }

  return problems;
};

// ----- 1. P0 parity -----

const P0 = policy('P0');
let failures = 0;
const report = (label: string, problems: string[]) => {
  if (problems.length > 0) {
    failures++;
    console.log(`FAIL ${label}\n  ${problems.slice(0, 8).join('\n  ')}`);
  }
};

const parityRandom = mulberry32(20261029);
const costs = [0, 2, 5, 10];
let p0Runs = 0;
let p0Pass = 0;
let p0Lots = 0;

const runP0Parity = (label: string, books: RefBook[], costBps: number, over: Partial<TraceSettings> = {}) => {
  const settings = traceSettings(costBps, over);
  const frozen = replayFixedPool(replayBooksOf(books, settings), {
    symbols: books.map((book) => book.symbol),
    startIndex: START,
    endIndex: END,
    principal,
    rate,
    costBps,
    stopSlippageBps: settings.stopSlippageBps,
    detail: true
  });
  const ref = runReference(
    books,
    baseConfig(costBps, P0, 'frozen', { stopFill: settings.stopFill, stopSlippageBps: settings.stopSlippageBps })
  );
  const problems = [
    ...compareToFrozen(ref, frozen, new Map(books.map((book) => [book.id, book.symbol])), true),
    ...identities(books, baseConfig(costBps, P0, 'frozen'), ref)
  ];

  p0Runs++;
  p0Lots += ref.lots.length;

  if (problems.length === 0) {
    p0Pass++;
  }

  report(label, problems);
};

const t0 = Date.now();

const parityKinds: Kind[] = ['dense', 'dense', 'dense', 'sparse', 'short', 'shortSparse'];

for (let i = 0; i < 72; i++) {
  const kind = parityKinds[i % parityKinds.length]!;
  const n = 1 + Math.floor(parityRandom() * 6);
  const books = Array.from({ length: n }, (_, j) =>
    bookOf(parityRandom, `S${j}`, marketOf(1000 + i * 10 + j, kind), parityRandom() < 0.5 ? 'deep' : 'shallow')
  );

  runP0Parity(`P0 parity #${i} (${kind}, ${n} books)`, books, costs[i % 4]!);
}

for (let i = 0; i < 8; i++) {
  const n = 2 + Math.floor(parityRandom() * 4);
  const books = Array.from({ length: n }, (_, j) =>
    bookOf(parityRandom, `N${j}`, marketOf(3000 + i * 10 + j, i % 2 === 1 ? 'shortSparse' : 'dense'), 'shallow')
  );

  runP0Parity(`P0 parity next-open/slippage #${i}`, books, costs[i % 4]!, {
    stopFill: i % 2 === 0 ? 'next-open' : 'stop',
    stopSlippageBps: 3
  });
}

console.log(
  `1. P0 = frozen replayFixedPool: ${p0Pass}/${p0Runs} pools pass (${p0Lots} lots compared; ${Date.now() - t0} ms)`
);

// ----- 2. P2L parity with replayPreemptive (one deep, one shallow) -----

const P2L = policy('P2', { replacement: 'legacy' });
const legacyTally: Record<string, number> = {};
let p2lRuns = 0;
let p2lPass = 0;
const t1 = Date.now();

const p2lKinds: Kind[] = ['dense', 'sparse', 'short', 'shortSparse'];

for (let i = 0; i < 60; i++) {
  const kind = p2lKinds[i % p2lKinds.length]!;
  const tight = i % 2 === 1;
  const costBps = costs[Math.floor(i / 4) % 4]!;
  const deep = bookOf(parityRandom, 'DP', marketOf(5000 + i * 2, kind), 'deep', false, tight);
  // the shallow symbol sorts before the deep one
  const shallow = bookOf(parityRandom, 'AS', marketOf(5001 + i * 2, kind), 'shallow', false, tight);
  const books = [shallow, deep];
  const settings = traceSettings(costBps);
  const frozen = replayPreemptive(replayBooksOf(books, settings), {
    symbols: books.map((book) => book.symbol),
    startIndex: START,
    endIndex: END,
    principal,
    rate,
    costBps,
    stopSlippageBps: 0,
    detail: true,
    allocation: { policy: policies.P1, priority: { rankingId: 'deep>shallow', order: ['DP', 'AS'] } }
  });
  const ref = runReference(books, baseConfig(costBps, P2L, 'tier'));
  const problems = [
    ...compareToFrozen(ref, frozen, new Map(books.map((book) => [book.id, book.symbol])), true),
    ...identities(books, baseConfig(costBps, P2L, 'tier'), ref)
  ];
  const legacyCounts: Record<string, number> = {};
  const refCounts: Record<string, number> = {};

  for (const record of frozen.preemptions) {
    legacyCounts[record.outcome] = (legacyCounts[record.outcome] ?? 0) + 1;
  }

  for (const record of ref.switches) {
    const key = record.outcome.startsWith('aborted') ? 'aborted' : record.outcome;

    if (key !== 'declined') {
      refCounts[key] = (refCounts[key] ?? 0) + 1;
    }

    legacyTally[record.outcome] = (legacyTally[record.outcome] ?? 0) + 1;
  }

  for (const key of new Set([...Object.keys(legacyCounts), ...Object.keys(refCounts)])) {
    diff(`preemptions ${key}`, refCounts[key] ?? 0, legacyCounts[key] ?? 0, problems);
  }

  const declinedHeld = ref.switches.filter((record) => record.outcome === 'declined').length;

  if (declinedHeld < frozen.declines.length) {
    problems.push(`declined ${declinedHeld} < legacy declines ${frozen.declines.length}`);
  }

  p2lRuns++;

  if (problems.length === 0) {
    p2lPass++;
  }

  report(`P2L parity #${i}`, problems);
}

console.log(
  `2. P2L = frozen replayPreemptive (P1, $0, deep > shallow): ${p2lPass}/${p2lRuns} pools pass (${Date.now() - t1} ms); outcomes ${JSON.stringify(legacyTally)}`
);

// ----- pools mixing tiers -----

// 1–3 deep and 1–4 shallow books; unless `distinct`, a shallow book shares a deep book's symbol (35%) or the previous
// book's symbol (15%); shallow symbols starting with 'A' sort before the deep ones (frozen-tie differences).
const mixedPool = (random: () => number, seedBase: number, kind: Kind, tight = false, distinct = false) => {
  const deepCount = 1 + Math.floor(random() * 3);
  const shallowCount = 1 + Math.floor(random() * 4);
  const books: RefBook[] = [];
  let next = 0;

  for (let j = 0; j < deepCount; j++) {
    const symbol = `D${next}`;

    books.push(bookOf(random, symbol, marketOf(seedBase + next++, kind), 'deep', false, tight));
  }

  for (let j = 0; j < shallowCount; j++) {
    const u = random();
    const shareWith = distinct
      ? undefined
      : u < 0.35
        ? books[Math.floor(random() * deepCount)]
        : u < 0.5
          ? books.at(-1)
          : undefined;

    if (shareWith) {
      books.push(bookOf(random, shareWith.symbol, shareWith.ds, 'shallow', false, tight));
    } else {
      const symbol = `${random() < 0.5 ? 'A' : 'T'}${next}`;
      books.push(bookOf(random, symbol, marketOf(seedBase + next++, kind), 'shallow', false, tight));
    }
  }

  return books;
};

const resultSignature = (ref: RefResult) =>
  JSON.stringify({ ...ref, marks: Array.from(ref.marks) }, (_key, value) =>
    typeof value === 'number' && !Number.isFinite(value) ? String(value) : value
  );

// ----- 3. metamorphic -----

let metaRuns = 0;
let metaPass = 0;
const metaRandom = mulberry32(777);
const t2 = Date.now();
const metaPolicies = [policy('P1'), policy('P2'), policy('P4', { deadline: 1 }), policy('P0M'), P2L];

const metaKinds: Kind[] = ['dense', 'sparse', 'short', 'shortSparse'];

for (let i = 0; i < 10; i++) {
  const books = mixedPool(metaRandom, 7000 + i * 10, metaKinds[i % 4]!, i % 2 === 0);
  const pol = metaPolicies[i % metaPolicies.length]!;
  const config = baseConfig(5, pol, 'tier');
  const a = runReference(books, config);
  const shuffled = [...books].reverse();

  [shuffled[0], shuffled[1]] = [shuffled[1]!, shuffled[0]!];

  const b = runReference(shuffled, config);

  metaRuns++;

  if (resultSignature(a) === resultSignature(b)) {
    metaPass++;
  } else {
    report(`permutation #${i} (${pol.kind})`, ['results differ after permuting the input order']);
  }
}

for (let i = 0; i < 10; i++) {
  const n = 1 + Math.floor(metaRandom() * 3);
  const deep = Array.from({ length: n }, (_, j) =>
    bookOf(metaRandom, `K${j}`, marketOf(8000 + i * 10 + j, metaKinds[i % 4]!), 'deep')
  );
  const base = runReference(deep, baseConfig(2, P0, 'tier'));
  const never = bookOf(metaRandom, 'A9', marketOf(8100 + i, metaKinds[i % 4]!), 'shallow', true);
  const pol = metaPolicies[i % metaPolicies.length]!;
  const withNever = runReference([never, ...deep], baseConfig(2, pol, 'tier'));
  const problems: string[] = [];

  if (resultSignature({ ...withNever, switches: [] }) !== resultSignature(base) || withNever.switches.length > 0) {
    problems.push('a never-trading shallow book changed the deep books’ result');
  }

  metaRuns++;

  if (problems.length === 0) {
    metaPass++;
  }

  report(`never-trading shallow #${i} (${pol.kind})`, problems);
}

console.log(
  `3. metamorphic (permutation; never-trading shallow book): ${metaPass}/${metaRuns} pass (${Date.now() - t2} ms)`
);

// ----- 4. branch reachability -----

const branchPolicies: { label: string; pol: RefPolicy }[] = [
  { label: 'P0M', pol: policy('P0M') },
  { label: 'P1', pol: policy('P1') },
  { label: 'P1 latency 360', pol: policy('P1', { latency: 360 }) },
  { label: 'P2', pol: policy('P2') },
  { label: 'P2L', pol: P2L },
  { label: 'P3(500,any)', pol: policy('P3', { budget: 500 }) },
  { label: 'P3(1000,deep)', pol: policy('P3', { budget: 1000, filter: 'deep' }) },
  { label: 'P3(2000,any)', pol: policy('P3', { budget: 2000 }) },
  { label: 'P4(0)', pol: policy('P4', { deadline: 0 }) },
  { label: 'P4(1)', pol: policy('P4', { deadline: 1 }) },
  { label: 'P4(3)', pol: policy('P4', { deadline: 3 }) },
  { label: 'P2+G1', pol: policy('P2', { gate: 'G1' }) },
  { label: 'P2+G1d', pol: policy('P2', { gate: 'G1d' }) },
  { label: 'P2+G2(0.75)', pol: policy('P2', { gate: 'G2', lambda: 0.75 }) },
  { label: 'P1+G2(0.5)', pol: policy('P1', { gate: 'G2', lambda: 0.5 }) }
];
const branchRandom = mulberry32(4242);
// "Twin" pools: a deep and a shallow book on the same price data (one symbol, or two symbol names over one dataset so
// the shallow one sorts first in frozen-tie mode), with a large rebound Y (both books can confirm the same rebound
// minute: same-minute decisions, reservation cancels) and the deep stop slightly wider than the shallow one (the deep
// stop is often hit just after the shallow lot's own stop exit: orphan and intrabar mirror exits under late funding).
// "Late" twins keep a random Y and a closer deep X: the deep book usually decides while the shallow lot is held.
const twinPool = (random: () => number, seed: number, kind: Kind, sameSymbol: boolean, late = false) => {
  const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  const ds = marketOf(seed, kind);
  const base = gridOf(random, 'shallow', true);
  const shallowGrid = late ? base : { ...base, trailingBuyPercentage: int(10, 30) };
  const deepGrid = {
    ...shallowGrid,
    targetPercentChange: shallowGrid.targetPercentChange + (late ? int(5, 30) : int(10, 50)),
    trailingStopPercentage: shallowGrid.trailingStopPercentage + (late ? int(1, 3) : int(1, 4))
  };
  const deepSymbol = 'D0';
  const shallowSymbol = sameSymbol ? 'D0' : 'A1';
  const deepId = `d${++bookSerial}:${deepSymbol}`;
  const shallowId = `s${++bookSerial}:${shallowSymbol}`;

  return [
    { id: deepId, symbol: deepSymbol, tier: 'deep', ds, params: paramsOf(deepSymbol, deepId, deepGrid) },
    {
      id: shallowId,
      symbol: shallowSymbol,
      tier: 'shallow',
      ds,
      params: paramsOf(shallowSymbol, shallowId, shallowGrid)
    }
  ] satisfies RefBook[];
};

const twinRandom = mulberry32(4343);
const lateRandom = mulberry32(4444);
const branchKinds: Kind[] = ['short', 'shortSparse', 'shortSparse', 'sparse', 'dense', 'short'];
const pools: { books: RefBook[]; tieMode: RefConfig['tieMode'] }[] = [
  ...Array.from({ length: 60 }, (_, i) => ({
    books: mixedPool(branchRandom, 9000 + i * 10, branchKinds[i % branchKinds.length]!, i % 3 !== 2, i % 5 === 4),
    tieMode: (i % 5 === 4 ? 'frozen' : 'tier') as RefConfig['tieMode']
  })),
  ...Array.from({ length: 24 }, (_, i) => ({
    books: twinPool(twinRandom, 9900 + i, i % 4 === 0 ? 'short' : 'shortSparse', i % 2 === 0),
    tieMode: (i % 2 === 0 ? 'tier' : 'frozen') as RefConfig['tieMode']
  })),
  ...Array.from({ length: 72 }, (_, i) => ({
    books: twinPool(lateRandom, 9950 + i, i % 3 === 0 ? 'short' : 'shortSparse', i % 2 === 1, true),
    tieMode: 'tier' as RefConfig['tieMode']
  }))
];
const t3 = Date.now();
let branchRuns = 0;
let branchPass = 0;
const extras: Record<string, number> = {};
const bump = (key: string, by = 1) => {
  extras[key] = (extras[key] ?? 0) + by;
};
const table: string[] = [];
const poolResults = new Map<number, RefResult>();

for (const { label, pol } of branchPolicies) {
  const counts: Record<string, number> = {};
  let gateChanged = 0;

  pools.forEach(({ books, tieMode }, i) => {
    const costBps = costs[i % 4]!;
    const config = baseConfig(costBps, pol, tieMode);

    if (config.tieMode === 'frozen' && new Set(books.map((book) => book.symbol)).size !== books.length) {
      config.tieMode = 'tier';
    }

    const ref = runReference(books, config);
    const problems = [...identities(books, config, ref), ...traceChecks(books, config, ref)];
    const byId = new Map(books.map((book) => [book.id, book]));

    branchRuns++;

    if (problems.length === 0) {
      branchPass++;
    }

    report(`branches ${label} pool ${i}`, problems);

    for (const record of ref.switches) {
      counts[record.outcome] = (counts[record.outcome] ?? 0) + 1;

      const deep = byId.get(record.deepBookId)!;
      const shallow = byId.get(record.shallowBookId)!;
      const done = record.outcome === 'executed' || record.outcome === 'superseded';

      if (done && deep.symbol === shallow.symbol) {
        bump('same-symbol switch');
      }

      if (done && record.purchaseIndex > record.decisionIndex) {
        bump('overnight switch');
      }

      if (
        (record.saleIndex >= 0 && record.saleBar >= shallow.ds.sBarCount[record.saleIndex]!) ||
        (record.purchaseIndex >= 0 && record.purchaseBar >= deep.ds.sBarCount[record.purchaseIndex]!)
      ) {
        bump('closing-print switch event');
      }

      if (
        pol.kind === 'P4' &&
        record.outcome !== 'declined' &&
        record.saleIndex === record.decisionIndex + pol.deadline + 1 &&
        record.saleBar === 0
      ) {
        bump(`P4(${pol.deadline}) sale at the deadline print`);
      }

      if (pol.kind === 'P0M' && record.outcome === 'superseded') {
        bump('P0M late funding');
      }
    }

    for (const lot of ref.lots) {
      bump(`lot ${lot.kind}`);

      if (
        lot.kind === 'exact' &&
        byId.get(lot.bookId)!.tier === 'deep' &&
        ref.switches.some(
          (r) => r.purchaseIndex === lot.entryIndex && r.purchaseBar === lot.entryBar && r.deepBookId === lot.bookId
        )
      ) {
        bump('switch bought the exact lot');
      }

      if (lot.exitReason === 'orphan-mirror') {
        bump('orphan-mirror exit');
      }

      if (lot.kind === 'mirror' && lot.exitIndex === lot.entryIndex && lot.exitBar === lot.entryBar) {
        bump('mirror closed inside its purchase bar');
      }
    }

    if (pol.gate !== 'G0') {
      const ungated = runReference(books, { ...config, policy: { ...pol, gate: 'G0' } });

      if (ungated.granted !== ref.granted || ungated.net !== ref.net) {
        gateChanged++;
      }
    }

    if (label === 'P2') {
      poolResults.set(i, ref);
    }
  });

  if (pol.gate !== 'G0') {
    bump(`gate ${pol.gate}${pol.gate === 'G2' ? `(${pol.lambda})` : ''} changed the pool`, gateChanged);
  }

  table.push(
    `  ${label.padEnd(15)} ${outcomes
      .filter((outcome) => counts[outcome])
      .map((outcome) => `${outcome} ${counts[outcome]}`)
      .join(', ')}`
  );
}

console.log(
  `4. branch reachability: ${branchRuns} runs (${pools.length} pools — 60 mixed, 24 twins, 72 late twins — × ${branchPolicies.length} policies), identities and trace checks, ${branchPass}/${branchRuns} pass (${Date.now() - t3} ms)`
);
console.log(table.join('\n'));
console.log(`  other branches: ${JSON.stringify(extras)}`);

// ----- 5. chained accounts -----

const chainRandom = mulberry32(99);
const t4 = Date.now();
let chainRuns = 0;
let chainPass = 0;
const chainTally: Record<string, number> = {};
const yearEnds: number[] = [];
const calendar = marketOf(9000, 'short');

for (let s = START + 1; s < END; s++) {
  if (calendar.sYear[s + 1] !== calendar.sYear[s]) {
    yearEnds.push(s);
  }
}

for (let i = 0; i < 12; i++) {
  const books = mixedPool(chainRandom, 9500 + i * 10, i % 2 === 1 ? 'shortSparse' : 'short', true);
  const boundary = yearEnds[0]!;

  // runoff: one book stops deciding at the boundary; another starts after it
  books[0] = { ...books[0]!, activeTo: boundary };
  books[books.length - 1] = { ...books.at(-1)!, activeFrom: boundary + 1 };

  const config = baseConfig(costs[i % 4]!, policy(i % 2 === 0 ? 'P4' : 'P0M', { deadline: 1 }), 'tier', {
    policySchedule: [{ from: boundary + 1, policy: i % 3 === 0 ? P2L : policy('P1') }],
    ...(i % 2 === 0 ? { resets: yearEnds } : {})
  });
  const ref = runReference(books, config);
  const problems = [...identities(books, config, ref), ...traceChecks(books, config, ref)];

  chainRuns++;

  if (problems.length === 0) {
    chainPass++;
  }

  report(`chained #${i}`, problems);

  for (const lot of ref.lots) {
    if (lot.exitReason === 'annual-reset') {
      chainTally['annual-reset lots'] = (chainTally['annual-reset lots'] ?? 0) + 1;
    }
  }

  for (const record of ref.switches) {
    chainTally[record.outcome] = (chainTally[record.outcome] ?? 0) + 1;
  }
}

console.log(
  `5. chained accounts (resets at ${yearEnds.join(', ')}; policy schedule; runoff): identities and trace checks ${chainPass}/${chainRuns} pass (${Date.now() - t4} ms); ${JSON.stringify(chainTally)}`
);

console.log(failures === 0 ? 'SELF-CHECK PASS' : `SELF-CHECK FAIL (${failures} failing runs)`);
process.exitCode = failures === 0 ? 0 : 1;

// Parity (PROTOCOL.md §12): the Stage 1c fast engine with rules off against Stage 1b's fast engine (imported,
// frozen), inert-but-present rules against the same, and the fast engine against the independent reference on every
// mask, fill mode, delay, schedule convention and financing mode; branch-coverage counters; chronology guards;
// real-data throughput. Only field names, difference counts, |Δ| maxima, counters and timings are recorded — never a
// net, mark, drawdown or P&L level.
import type { Dataset } from '../four-family/data.ts';
import { mulberry32 } from '../study3-vgt-momentum/engine.ts';
import {
  type ExitFamily as BaseExitFamily,
  controlPolicy,
  defaultsOf as baseDefaultsOf,
  entryDefaults,
  exitBoxes,
  policyOf as basePolicyOf
} from '../study3-vgt-momentum-stage1b/catalog.ts';
import { Engine as Stage1bEngine } from '../study3-vgt-momentum-stage1b/engine.ts';
import { ParityTally } from '../study3-vgt-momentum-stage1b/parity.ts';
import { syntheticMarket } from '../study3-vgt-momentum-stage1b/tests/synthetic.ts';
import { datasetOf, randomWalk } from '../study3-vgt-momentum/tests/fixtures.ts';
import { cellOf, defaultsOf, dimsOf, fromUnit, keyOf, policyFromKey } from './catalog.ts';
import { type Mask, cells, histories, log, masks, matrix, seedOf, study } from './context.ts';
import { assertDoor, indexOfDate, loadVgt } from './data.ts';
import { Engine, defaultOptions } from './engine.ts';
import { coverage, poisonedFuture, prefixInvariance, truncatedRunPrefix } from './guards.ts';
import {
  assertFreezes,
  assertPredecessors,
  assertRealRoot,
  assertScope,
  codeManifest,
  manifestHash,
  recordExists,
  writeStage
} from './records.ts';
import { referenceRun } from './reference.ts';
import type { Policy, RunOptions, RunResult, ScheduleItem } from './types.ts';

export { ParityTally };

const close = (a: number, b: number, tolerance: number) =>
  (Number.isNaN(a) && Number.isNaN(b)) ||
  a === b ||
  Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));

export interface ParityOutcome {
  differences: number;
  fields: Record<string, number>;
  maxAbs: number;
}

// Two Stage 1c results (fast against the reference, or fast with rules off against Stage 1b): everything but ids.
// `ruleMetadata` false: the per-trade rule fields (cLevel, cFillBelow, releaseEntry) are left out — an inert rule's run
// may record its armed level without changing anything else.
export const compareRuns = (a: RunResult, b: RunResult, tolerance = 1e-9, ruleMetadata = true): ParityOutcome => {
  const pairs: [string, number, number][] = [
    ['tradeCount', a.trades.length, b.trades.length],
    ['endMark', a.endMark, b.endMark],
    ['endLiquidation', a.endLiquidation, b.endLiquidation],
    ['realized', a.realized, b.realized],
    ['minuteDd', a.minuteDd.maximum, b.minuteDd.maximum],
    ['dailyDd', a.dailyDd, b.dailyDd],
    ['loanDollarDays', a.loanDollarDays, b.loanDollarDays],
    ['grossDollarDays', a.grossDollarDays, b.grossDollarDays],
    ['debitDollarDays', a.debitDollarDays, b.debitDollarDays],
    ['peakGross', a.peakGross, b.peakGross],
    ['sessionsLong', a.sessionsLong, b.sessionsLong],
    ['campaigns', a.campaigns, b.campaigns],
    ['reentries', a.reentries, b.reentries],
    ['reentryOpportunities', a.reentryOpportunities, b.reentryOpportunities],
    ['flatInterest', a.flatInterest, b.flatInterest],
    ['carriedInterest', a.carriedInterest, b.carriedInterest],
    ['transitions', a.transitions.length, b.transitions.length],
    ['windowCount', a.windows.length, b.windows.length]
  ];

  if (ruleMetadata) {
    pairs.push(
      ['aChecks', a.aChecks ?? 0, b.aChecks ?? 0],
      ['aDue', a.aDue ?? 0, b.aDue ?? 0],
      ['aCancelled', a.aCancelled ?? 0, b.aCancelled ?? 0],
      ['bBlocks', a.bBlocks ?? 0, b.bBlocks ?? 0],
      ['cBlocks', a.cBlocks ?? 0, b.cBlocks ?? 0],
      ['bcBoth', a.bcBoth ?? 0, b.bcBoth ?? 0],
      ['cFillsBelow', a.cFillsBelow ?? 0, b.cFillsBelow ?? 0]
    );
  }

  a.windows.forEach((wa, i) => {
    const wb = b.windows[i];

    if (wb) {
      pairs.push(
        ['window.increment', wa.increment, wb.increment],
        ['window.minuteDd', wa.minuteDd.maximum, wb.minuteDd.maximum],
        ['window.dailyDd', wa.dailyDd, wb.dailyDd],
        ['window.interest', wa.interest, wb.interest],
        ['window.grossDollarDays', wa.grossDollarDays, wb.grossDollarDays]
      );
    }
  });

  a.trades.forEach((ta, i) => {
    const tb = b.trades[i];

    if (!tb) {
      return;
    }

    pairs.push(
      ['entryIndex', ta.entryIndex, tb.entryIndex],
      ['entryBar', ta.entryBar, tb.entryBar],
      ['exitIndex', ta.exitIndex, tb.exitIndex],
      ['exitBar', ta.exitBar, tb.exitBar],
      ['entryRaw', ta.entryRaw, tb.entryRaw],
      ['exitRaw', ta.exitRaw, tb.exitRaw],
      ['shares', ta.shares, tb.shares],
      ['trims', ta.trims.length, tb.trims.length],
      ['proceeds', ta.proceeds, tb.proceeds],
      ['net', ta.net, tb.net],
      ['interest', ta.interest, tb.interest],
      ['friction', ta.friction, tb.friction],
      ['priceGain', ta.priceGain, tb.priceGain],
      ['exitReason', ta.exitReason === tb.exitReason ? 0 : 1, 0],
      ['stopComponent', ta.stopComponent === tb.stopComponent ? 0 : 1, 0],
      ['kind', ta.kind === tb.kind ? 0 : 1, 0],
      ['rule', ta.rule === tb.rule ? 0 : 1, 0]
    );

    if (ruleMetadata) {
      pairs.push(
        ['cLevel', 'cLevel' in ta ? ta.cLevel : NaN, 'cLevel' in tb ? tb.cLevel : NaN],
        ['cFillBelow', ('cFillBelow' in ta && ta.cFillBelow) === ('cFillBelow' in tb && tb.cFillBelow) ? 0 : 1, 0],
        [
          'releaseEntry',
          ('releaseEntry' in ta && ta.releaseEntry) === ('releaseEntry' in tb && tb.releaseEntry) ? 0 : 1,
          0
        ]
      );
    }
  });

  if (a.daily && b.daily) {
    pairs.push(['dailyRows', a.daily.length, b.daily.length]);
    a.daily.forEach((row, i) => {
      const other = b.daily![i];

      if (other) {
        pairs.push(
          ['daily.mark', row.mark, other.mark],
          ['daily.liquidation', row.liquidation, other.liquidation],
          ['daily.shares', row.shares, other.shares],
          ['daily.cash', row.cash, other.cash]
        );
      }
    });
  }

  const fields: Record<string, number> = {};
  let differences = 0;
  let maxAbs = 0;

  for (const [name, x, y] of pairs) {
    if (!close(x, y, tolerance)) {
      fields[name] = (fields[name] ?? 0) + 1;
      differences++;
    }

    if (Number.isFinite(x) && Number.isFinite(y)) {
      maxAbs = Math.max(maxAbs, Math.abs(x - y));
    }
  }

  return { differences, fields, maxAbs };
};

// A random cell vector (seeded) in the cell's full box.
const randomVector = (cell: (typeof cells)[number], random: () => number) =>
  Object.fromEntries(dimsOf(cell).map((d) => [d.name, fromUnit(d, random())]));

const sample = <T>(list: T[], random: () => number) => list[Math.floor(random() * list.length)]!;

const entries = Object.keys(matrix.entries);

// The parity sets on one dataset (the fold-A door for the sealed stage; synthetic markets in development).
export const paritySets = (ds: Dataset, e: number, end: number) => {
  const random = mulberry32(seedOf('study3c|parity'));
  const base = (financing: 'net' | 'slot', extra: Partial<RunOptions> = {}): RunOptions => ({
    ...defaultOptions(e, end),
    financing,
    recordDaily: true,
    ...extra
  });
  const off: { id: string; base: Policy | ScheduleItem[]; options: RunOptions }[] = [];
  const reference: { id: string; schedule: Policy | ScheduleItem[]; options: RunOptions }[] = [];
  const inert: { id: string; withRules: Policy; without: Policy; options: RunOptions }[] = [];

  // (a) rules off: every exit family default × 12 entries × both contracts (Stage 1c keys), Stage 1b-keyed defaults,
  // random vectors per family, controls; both financing modes and the stresses
  for (const financing of ['net', 'slot'] as const) {
    for (const cell of cells.filter((c) => c.mask === '000')) {
      const vector = defaultsOf(dimsOf(cell));

      off.push({
        id: `${financing}|${cell.key}|default`,
        base: policyFromKey(keyOf(cell, vector)),
        options: base(financing)
      });
    }

    for (const entry of entries) {
      for (const family of Object.keys(exitBoxes) as BaseExitFamily[]) {
        const policy = basePolicyOf({
          entry: entry as never,
          entryParams: entryDefaults(entry as never),
          exit: { family, params: baseDefaultsOf(exitBoxes[family]) },
          reentry: 'R3F',
          sizing: { kind: 'Z0' }
        });

        off.push({ id: `${financing}|1b|${policy.id}`, base: policy, options: base(financing) });
      }
    }

    for (const name of ['C-SMA', 'C-DON', 'C-TSM', 'C-AL', 'C-ALR', 'C-ALZ1', 'C-STOP', 'C-IDLE']) {
      off.push({ id: `${financing}|${name}`, base: controlPolicy(name), options: base(financing) });
    }
  }

  for (const exit of matrix.exitOrder) {
    for (let j = 0; j < 16; j++) {
      const contract = matrix.exits[exit]!.contracts[j % matrix.exits[exit]!.contracts.length]!;
      const cell = cellOf(sample(entries, random), exit, contract, '000');
      const options = [
        base('net'),
        base('net', { delayMinutes: 1 }),
        base('net', { delayMinutes: 5, stopSlippageBps: 25 }),
        base('slot', { costBps: 10, entrySlippageBps: 25, openSlippageBps: 50 })
      ][j % 4]!;

      off.push({
        id: `random|${cell.key}|${j}`,
        base: policyFromKey(keyOf(cell, randomVector(cell, random))),
        options
      });
    }
  }

  // schedules (S1/S2/S3) with rules off
  const schedulePolicies = () =>
    [0, 1, 2].map(() => {
      const cell = sample(
        cells.filter((c) => c.mask === '000'),
        random
      );

      return policyFromKey(keyOf(cell, randomVector(cell, random)));
    });
  const boundaries = ['2017-12-29', '2018-12-31'].map((d) => ds.dates.indexOf(d)).filter((b) => b > e && b < end);

  for (let j = 0; j < 12; j++) {
    const [p1, p2, p3] = schedulePolicies();
    const schedule: ScheduleItem[] = [
      { index: e, policy: p1! },
      ...boundaries.map((b, i) => ({ index: b, policy: [p2!, p3!][i]! }))
    ];

    for (const transition of ['S1', 'S2', 'S3'] as const) {
      off.push({
        id: `schedule|${j}|${transition}`,
        base: schedule,
        options: base(j % 2 ? 'slot' : 'net', { transition, windows: [e, ...boundaries] })
      });
    }
  }

  // inert-but-present rules: identical to the rule-less policy whenever every rule counter is zero
  for (let j = 0; j < 96; j++) {
    const exit = matrix.exitOrder[j % matrix.exitOrder.length]!;
    const cell = cellOf(sample(entries, random), exit, matrix.exits[exit]!.contracts[0]!, masks[1 + (j % 7)]! as Mask);
    const vector = randomVector(cell, random);
    const zero = cellOf(cell.entry, cell.exit, cell.contract, '000');

    inert.push({
      id: `inert|${cell.key}|${j}`,
      withRules: policyFromKey(keyOf(cell, vector)),
      without: policyFromKey(keyOf(zero, vector)),
      options: base('net')
    });
  }

  // (b) fast = reference: every mask, representative cells, random full-box vectors, fill modes, delays, financing
  for (const mask of masks) {
    for (let j = 0; j < 64; j++) {
      const exit = matrix.exitOrder[j % matrix.exitOrder.length]!;
      const contracts = matrix.exits[exit]!.contracts;
      const cell = cellOf(
        entries[(j + masks.indexOf(mask)) % entries.length]!,
        exit,
        contracts[j % contracts.length]!,
        mask
      );
      const extra: Partial<RunOptions> = [
        {},
        { losingHoldFill: 'open' as const },
        { delayMinutes: 1 },
        { delayMinutes: 5, losingHoldFill: 'open' as const, openSlippageBps: 50 },
        { stopSlippageBps: 25, entrySlippageBps: 10 },
        { costBps: 10 }
      ][j % 6]!;

      reference.push({
        id: `ref|${cell.key}|${j}`,
        schedule: policyFromKey(keyOf(cell, j === 0 ? defaultsOf(dimsOf(cell)) : randomVector(cell, random))),
        options: base(j % 5 === 4 ? 'slot' : 'net', extra)
      });
    }
  }

  for (let j = 0; j < 24; j++) {
    const picks = [0, 1, 2].map(() => {
      const cell = sample(cells, random);

      return policyFromKey(keyOf(cell, randomVector(cell, random)));
    });
    const schedule: ScheduleItem[] = [
      { index: e, policy: picks[0]! },
      ...boundaries.map((b, i) => ({ index: b, policy: picks[1 + i]! }))
    ];
    const transition = (['S1', 'S2', 'S3'] as const)[j % 3]!;

    reference.push({
      id: `ref|schedule|${j}`,
      schedule,
      options: base(j % 4 === 3 ? 'slot' : 'net', {
        transition,
        windows: [e, ...boundaries],
        restrictionCarry: j % 2 ? 'reset' : 'persist',
        ...(j % 5 === 0 ? { losingHoldFill: 'open' as const } : {})
      })
    });
  }

  // always-long schedules (C-AL entries, every policy IN at each boundary): S3 converts, S1 transitions, S2 continues
  const alwaysLong = (id: string, protect?: Policy['protect']): Policy => ({
    ...controlPolicy('C-AL'),
    id,
    exit: { own: false, hard: 0.3, trail: { t: 0.25, ref: 0 } },
    ...(protect ? { protect } : {})
  });

  for (const transition of ['S1', 'S2', 'S3'] as const) {
    const plain: ScheduleItem[] = [
      { index: e, policy: alwaysLong('AL-1') },
      ...boundaries.map((b, i) => ({ index: b, policy: alwaysLong(`AL-${i + 2}`) }))
    ];
    const ruled: ScheduleItem[] = [
      { index: e, policy: alwaysLong('ALR-1', { A: { N: 15 } }) },
      ...boundaries.map((b, i) => ({
        index: b,
        policy: alwaysLong(`ALR-${i + 2}`, i ? { C: { X: 0.02, Y: 0.01 } } : { B: { C: 10 } })
      }))
    ];

    off.push({
      id: `always-long|${transition}`,
      base: plain,
      options: base('net', { transition, windows: [e, ...boundaries] })
    });
    reference.push({
      id: `ref|always-long|${transition}`,
      schedule: ruled,
      options: base('net', { transition, windows: [e, ...boundaries] })
    });
  }

  return { off, reference, inert };
};

export const runParity = (ds: Dataset, e: number, end: number) => {
  const fast = new Engine(ds);
  const stage1b = new Stage1bEngine(ds);
  const { off, reference, inert } = paritySets(ds, e, end);
  const offTally = new ParityTally();
  const inertTally = new ParityTally();
  const referenceTally = new ParityTally();
  const counters: Record<string, number> = {};
  let inertRuns = 0;
  let actedRuns = 0;

  for (const item of off) {
    const a = fast.run(item.base, item.options);
    const b = stage1b.run(item.base as never, item.options) as unknown as RunResult;

    offTally.add(item.id, compareRuns(a, b));
    coverage([a], counters);
  }

  for (const item of inert) {
    const a = fast.run(item.withRules, item.options);

    if (a.aDue === 0 && a.bBlocks + a.bcBoth === 0 && a.cBlocks === 0) {
      inertRuns++;
      inertTally.add(item.id, compareRuns(a, fast.run(item.without, item.options), 1e-9, false));
    } else {
      actedRuns++;
    }

    coverage([a], counters);
  }

  for (const item of reference) {
    const a = fast.run(item.schedule, item.options);
    const b = referenceRun(ds, item.schedule, item.options);

    referenceTally.add(item.id, compareRuns(a, b, 1e-9));
    coverage([a], counters);
  }

  return {
    off: offTally.summary(),
    inert: { ...inertTally.summary(), inertRuns, actedRuns },
    reference: referenceTally.summary(),
    counters
  };
};

// Real-data throughput per entry kind (fold-A door): ms per run, single thread; no result is kept.
const throughput = (ds: Dataset, e: number, end: number) => {
  const engine = new Engine(ds);
  const out: Record<string, number> = {};

  for (const entry of entries) {
    const list = cells.filter((c) => c.entry === entry && c.mask === '111').slice(0, 12);
    const started = performance.now();

    for (const cell of list) {
      engine.run(policyFromKey(keyOf(cell, defaultsOf(dimsOf(cell)))), defaultOptions(e, end));
    }

    out[entry] = (performance.now() - started) / list.length;
  }

  return out;
};

export const stageParity = async () => {
  assertRealRoot();
  assertScope();
  assertPredecessors('parity');
  assertFreezes(false);

  if (recordExists('parity')) {
    throw new Error('refused: parity is sealed');
  }

  const started = Date.now();
  const end = histories.A.developmentEnd;
  const { ds, door } = await loadVgt(end);

  assertDoor(ds, end);

  const e = indexOfDate(ds, study.firstDecisionClose);
  const last = ds.sessionCount - 1;

  log('parity: running the sets on the fold-A door and on two synthetic markets');

  const result = runParity(ds, e, last);
  // the same sets on synthetic markets (no market data): more branches for the coverage union, as Stage 1b's
  // "parity ∪ fixtures"
  const synthetic = [
    runParity(syntheticMarket(800, 41), 250, 799),
    runParity(datasetOf(randomWalk(52, 760, { drift: 0.0009, vol: 0.016, bars: 24 })), 250, 759)
  ];

  for (const other of synthetic) {
    for (const [key, value] of Object.entries(other.counters)) {
      result.counters[key] = (result.counters[key] ?? 0) + value;
    }
  }

  const guardPolicies = cells
    .filter((c) => c.index % 61 === 0)
    .map((c) => policyFromKey(keyOf(c, defaultsOf(dimsOf(c)))));
  const guardRuns = guardPolicies.map((p) => ({ schedule: p, options: defaultOptions(e, last) }));
  const guards = ['2017-12-29', '2018-12-31'].map((date) => {
    const b = indexOfDate(ds, date);

    return {
      prefix: prefixInvariance(ds, b, guardPolicies),
      poisoned: poisonedFuture(ds, b, guardRuns, seedOf(`study3c|poison|${date}`)),
      truncated: truncatedRunPrefix(ds, b, guardRuns)
    };
  });
  const coverageNeeded = [
    'exit:losing hold',
    'exit:stop gap',
    'exit:stop',
    'A cancelled',
    'B block',
    'C block',
    'B+C block',
    'release entry',
    'C fill below',
    'C armed entry',
    'kind:reentry',
    'transition:transition',
    'transition:continue-old',
    'transition:conversion'
  ];
  const missing = coverageNeeded.filter((k) => !(result.counters[k]! > 0));
  const manifest = codeManifest();
  const pass =
    [result, ...synthetic].every(
      (r) => r.off.differences === 0 && r.inert.differences === 0 && r.reference.differences === 0
    ) &&
    guards.every((g) => g.prefix.differences === 0 && g.poisoned.differences === 0 && g.truncated.differences === 0) &&
    missing.length === 0;

  return writeStage('parity', {
    door,
    summary: {
      pass,
      codeManifestHash: manifestHash(manifest),
      off: result.off,
      inert: result.inert,
      reference: result.reference,
      synthetic: synthetic.map((r) => ({ off: r.off, inert: r.inert, reference: r.reference })),
      coverage: result.counters,
      coverageMissing: missing,
      guards,
      throughputMsPerRun: throughput(ds, e, last),
      runtime: { seconds: (Date.now() - started) / 1000, peakRssMb: Math.round(process.resourceUsage().maxRSS / 1024) }
    },
    payloads: {}
  });
};

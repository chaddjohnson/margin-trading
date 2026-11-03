// Stage S (PROTOCOL.md §8–§9): the shortlist, the robustness battery (four costs, folds/regimes/years, concentration,
// one-parameter probes, joint perturbations, one-member exclusions, tie-order sensitivity, the full engine in fixed and
// 20% portfolio mode), the training gates T0–T9, the score S and the mechanical nominations. Training only.
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { type NRunResult, baseNRunConfig, runNAllocator } from '../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { figuresOfRun, interpolate } from '../portfolio-aware-d1/stageC.ts';
import { Rng } from '../optimizer/rng.ts';
import { type Entry, booksOfEntry, feasible } from './archive.ts';
import type { BenchmarkKey } from './benchmarks.ts';
import { log, study } from './context.ts';
import { type Book, type Evaluation, JointEvaluator, canonicalBooks, keyOf } from './evaluator.ts';
import { jaccardDistance } from './genome.ts';
import { qOf } from './refine.ts';
import { type Vector, idOf, jointPerturbation, probesOf, shortLabel } from './space.ts';
import type { IntParams } from '../d1-refinement/families.ts';

const median = (values: readonly number[]) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const quantile = (values: readonly number[], q: number) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))]!;
};

// ----- full-engine runs of a configuration on a loaded window -----

export const engineRun = (
  evaluator: JointEvaluator,
  loaded: LoadedUniverse,
  books: readonly Book[],
  mode: 'fixed' | 'portfolio',
  costBps: number,
  fraction: number = study.fraction,
  label = keyOf(books)
): NRunResult => {
  const canonical = canonicalBooks(books);
  const symbols = canonical.map((book) => book.symbol);
  const phenotypes = Object.fromEntries(canonical.map((book) => [book.symbol, evaluator.phenotype(book)]));
  const config = baseNRunConfig({
    key: `${label}-${mode}-${costBps}bps-f${fraction}`,
    label: `${label}, ${mode}, ${costBps} bps`,
    mode,
    symbols,
    phenotypes,
    costBps,
    fraction,
    eligibilityIndex: loaded.universe.eligibilityIndex,
    accountingStartIndex: loaded.warmup
  });
  const members = [...new Set(mode === 'portfolio' ? ['VOOG', 'VGT', ...symbols] : symbols)];

  return runNAllocator(
    {
      ...loaded.universe,
      instruments: Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!]))
    },
    config
  );
};

export const runFigures = (evaluator: JointEvaluator, result: NRunResult) => {
  const figures = figuresOfRun(result, [], {
    folds: evaluator.folds,
    regimes: evaluator.regimes,
    years: evaluator.years
  });

  return {
    ...figures,
    minuteDrawdownPercentOfLot: figures.minuteDrawdown / study.principal,
    dailyDrawdownPercentOfLot: figures.dailyDrawdown / study.principal
  };
};

// ----- the battery -----

export interface Battery {
  key: string;
  label: string;
  kind: 'refined' | 'contender' | 'archive' | 'benchmark';
  books: { symbol: string; id: string; grid: Vector['grid']; short: string }[];
  costs: Record<string, Evaluation>;
  lots: { symbol: string; decisionTime: number; entryIndex: number; exitIndex: number; net: number; open: boolean }[];
  probes: {
    count: number;
    feasibleShare: number;
    median: number;
    p10: number;
    rows: { symbol: string; key: string; offset: number; net: number; minuteDrawdown: number }[];
  };
  joint: { count: number; feasibleShare: number; p50: number; p25: number; p10: number; nets: number[] };
  exclusions: { symbol: string; net: number; minuteDrawdown: number; marginal: number }[];
  ties: {
    contested: number;
    identityEqual: boolean;
    orders: { label: string; priority: string[]; net: number; minuteDrawdown: number; lots: number }[];
    maxAbsNetChange: number;
  };
  full: {
    fixedParityDifferences: number;
    fixedParityFirst: string[];
    portfolio: ReturnType<typeof runFigures>;
  };
  derived: {
    netPerDrawdown: number;
    foldsPositive: number;
    bestFold: number;
    netMinusBestFold: number;
    netMinusTop2: number;
    bestRegime: string;
    bestRegimeValue: number;
    netMinusBestRegime: number;
    leaveOneRegimeOutMinimum: number;
    positiveRegimes: number;
    positiveYears: number;
    bestYearShare: number;
    top1Share: number;
    top2Share: number;
    largestMemberShare: number;
  };
}

export const runBattery = (
  evaluator: JointEvaluator,
  loaded: LoadedUniverse,
  books: readonly Book[],
  label: string,
  kind: Battery['kind'],
  jointPerturbations: number = study.robustness.jointPerturbations
): Battery => {
  const key = keyOf(books);
  const canonical = canonicalBooks(books);
  const costs: Record<string, Evaluation> = {};
  let base: ReturnType<JointEvaluator['evaluate']> | undefined;

  for (const costBps of study.costsBps) {
    const outcome = evaluator.evaluate(books, costBps);

    costs[costBps] = outcome.evaluation;

    if (costBps === study.principalCostBps) {
      base = outcome;
    }
  }

  const e = costs[study.principalCostBps]!;
  const net = e.net;

  // One-parameter probes of every member.
  const probeRows: Battery['probes']['rows'] = [];

  for (const book of canonical) {
    for (const probe of probesOf(book.vector.grid)) {
      const vector: Vector = { id: idOf(probe.grid as IntParams), grid: probe.grid, origin: 'robustness probe' };
      const probed = books.map((item) => (item.symbol === book.symbol ? { symbol: item.symbol, vector } : item));
      const { evaluation } = evaluator.evaluate(probed, study.principalCostBps);

      probeRows.push({
        symbol: book.symbol,
        key: probe.key,
        offset: probe.offset,
        net: evaluation.net,
        minuteDrawdown: evaluation.minuteDrawdown
      });
    }
  }

  // Joint perturbations: every member, every parameter at once.
  const rng = Rng.from(study.seedLabel, 'joint-perturbation', key);
  const jointRows: { net: number; minuteDrawdown: number }[] = [];

  for (let sample = 0; sample < jointPerturbations; sample++) {
    const perturbed = canonical.map((book) => {
      const grid = jointPerturbation(book.vector.grid, rng);

      return { symbol: book.symbol, vector: { id: idOf(grid as IntParams), grid, origin: 'joint perturbation' } };
    });
    const { evaluation } = evaluator.evaluate(perturbed, study.principalCostBps);

    jointRows.push({ net: evaluation.net, minuteDrawdown: evaluation.minuteDrawdown });
  }

  // One-member exclusions.
  const exclusions = canonical.map((book) => {
    const rest = books.filter((item) => item.symbol !== book.symbol);

    if (rest.length === 0) {
      return { symbol: book.symbol, net: 0, minuteDrawdown: 0, marginal: net };
    }

    const { evaluation } = evaluator.evaluate(rest, study.principalCostBps);

    return {
      symbol: book.symbol,
      net: evaluation.net,
      minuteDrawdown: evaluation.minuteDrawdown,
      marginal: net - evaluation.net
    };
  });

  // Tie order: alphabetical through aliases (must equal the canonical run), reverse alphabetical, two seeded orders.
  const members = [...e.members].sort();
  const orders: { label: string; priority: string[] }[] = [
    { label: 'reverse alphabetical', priority: [...members].reverse() }
  ];

  for (let index = 0; index < study.robustness.tiePermutations; index++) {
    const tieRng = Rng.from(study.seedLabel, 'ties', key, index);
    const priority = [...members];

    for (let i = priority.length - 1; i > 0; i--) {
      const j = tieRng.int(i + 1);

      [priority[i], priority[j]] = [priority[j]!, priority[i]!];
    }

    orders.push({ label: `seeded order ${index + 1}`, priority });
  }

  const identity = evaluator.evaluate(books, study.principalCostBps, members).evaluation;
  const tieRows = orders.map((order) => {
    const { evaluation } = evaluator.evaluate(books, study.principalCostBps, order.priority);

    return { ...order, net: evaluation.net, minuteDrawdown: evaluation.minuteDrawdown, lots: evaluation.lots };
  });

  // The full engine: fixed (field-for-field against the replay) and the 20% portfolio, 5 bps, training.
  const phenotypes = Object.fromEntries(canonical.map((book) => [book.symbol, evaluator.phenotype(book)]));
  const parity = replayAgainstFull(
    loaded,
    canonical.map((book) => book.symbol),
    phenotypes,
    study.principalCostBps
  );
  const portfolio = runFigures(evaluator, engineRun(evaluator, loaded, books, 'portfolio', study.principalCostBps));

  // Derived figures.
  const foldsPositive = e.folds.filter((value) => value > 0).length;
  const bestFold = Math.max(...e.folds);
  const bestRegimeIndex = e.regimes.indexOf(Math.max(...e.regimes));
  const bestRegimeValue = Math.max(0, e.regimes[bestRegimeIndex]!);
  const positiveYears = e.years.filter((value) => value > 0).length;

  return {
    key,
    label,
    kind,
    books: canonical.map((book) => ({
      symbol: book.symbol,
      id: book.vector.id,
      grid: book.vector.grid,
      short: shortLabel(book.vector.grid)
    })),
    costs,
    lots: base!.result.lots.map((lot) => ({
      symbol: lot.symbol,
      decisionTime: lot.decisionTime,
      entryIndex: lot.entryIndex,
      exitIndex: lot.exitIndex,
      net: lot.net,
      open: lot.open
    })),
    probes: {
      count: probeRows.length,
      feasibleShare: probeRows.filter((row) => row.minuteDrawdown <= study.drawdownCeiling).length / probeRows.length,
      median: median(probeRows.map((row) => row.net)),
      p10: quantile(
        probeRows.map((row) => row.net),
        0.1
      ),
      rows: probeRows
    },
    joint: {
      count: jointRows.length,
      feasibleShare: jointRows.filter((row) => row.minuteDrawdown <= study.drawdownCeiling).length / jointRows.length,
      p50: median(jointRows.map((row) => row.net)),
      p25: quantile(
        jointRows.map((row) => row.net),
        0.25
      ),
      p10: quantile(
        jointRows.map((row) => row.net),
        0.1
      ),
      nets: jointRows.map((row) => row.net)
    },
    exclusions,
    ties: {
      contested: e.contested,
      identityEqual: identity.net === e.net && identity.minuteDrawdown === e.minuteDrawdown && identity.lots === e.lots,
      orders: tieRows,
      maxAbsNetChange: Math.max(0, ...tieRows.map((row) => Math.abs(row.net - net)))
    },
    full: {
      fixedParityDifferences: parity.differences.length,
      fixedParityFirst: parity.differences.slice(0, 3),
      portfolio
    },
    derived: {
      netPerDrawdown: e.minuteDrawdown > 0 ? net / e.minuteDrawdown : Infinity,
      foldsPositive,
      bestFold,
      netMinusBestFold: net - bestFold,
      netMinusTop2: net - e.top2,
      bestRegime: evaluator.regimes[bestRegimeIndex]!.key,
      bestRegimeValue,
      netMinusBestRegime: net - bestRegimeValue,
      leaveOneRegimeOutMinimum: Math.min(...e.regimes.map((value) => net - value)),
      positiveRegimes: e.positiveRegimes,
      positiveYears,
      bestYearShare: net > 0 ? Math.max(...e.years) / net : NaN,
      top1Share: net > 0 ? e.top1 / net : NaN,
      top2Share: net > 0 ? e.top2 / net : NaN,
      largestMemberShare: net > 0 ? Math.max(...exclusions.map((row) => row.marginal)) / net : NaN
    }
  };
};

// ----- gates, score, nominations -----

export interface Ladder {
  fraction: number;
  borrowingDollarDays: number;
  endEquity: number;
  dailyPercent: number;
}

export const gatesOf = (battery: Battery, b5: Battery, ladder: readonly Ladder[]) => {
  const g = study.gates;
  const e = battery.costs[study.principalCostBps]!;
  const portfolio = battery.full.portfolio;
  const conditional = portfolio.dailyPercent > g.percentDrawdownIdeal;
  const margin = conditional ? g.conditionalBenchmarkMargin : g.benchmarkMargin;
  const b5Net = b5.costs[study.principalCostBps]!.net;
  const matched = interpolate(
    ladder.map((point) => ({ x: point.borrowingDollarDays, y: point.endEquity })),
    portfolio.borrowingDollarDays
  );
  const gates = {
    T0: battery.full.fixedParityDifferences === 0 && battery.ties.identityEqual,
    T1: e.minuteDrawdown <= study.drawdownCeiling && battery.costs[10]!.minuteDrawdown <= study.drawdownCeiling,
    T2: portfolio.dailyPercent <= g.percentDrawdownCeiling,
    T3:
      battery.costs[0]!.net > 0 &&
      battery.costs[2]!.net > 0 &&
      battery.costs[10]!.net > 0 &&
      battery.costs[10]!.net >= g.costRetention * e.net,
    T4: battery.derived.foldsPositive >= g.minFoldsPositive && battery.derived.netMinusBestFold > 0,
    T5: battery.derived.netMinusTop2 > 0 && battery.derived.netMinusBestRegime > 0,
    T6:
      battery.probes.feasibleShare >= g.plateauFeasibleShare &&
      battery.probes.median >= g.probeMedianShare * e.net &&
      battery.joint.feasibleShare >= g.plateauFeasibleShare &&
      battery.joint.p50 >= g.jointMedianShare * e.net,
    T7: battery.exclusions.every((row) => row.marginal > 0),
    T8:
      e.net >= b5Net + margin &&
      battery.joint.p50 >= b5.joint.p50 + margin &&
      battery.derived.netPerDrawdown >= g.netPerDrawdownShare * b5.derived.netPerDrawdown,
    T9: portfolio.endEquity >= matched.value
  };

  return {
    gates,
    passed: Object.values(gates).every(Boolean),
    conditional,
    margin,
    matched: { value: matched.value, extrapolated: matched.extrapolated },
    score: battery.joint.p50 - study.complexityPenalty * e.books + study.score.regimeBonus * e.positiveRegimes
  };
};

export type Gated = { battery: Battery; outcome: ReturnType<typeof gatesOf> };

export const nominate = (gated: readonly Gated[]) => {
  const passing = gated
    .filter((item) => item.battery.kind !== 'benchmark' && item.outcome.passed)
    .sort((a, b) => b.outcome.score - a.outcome.score || (a.battery.key < b.battery.key ? -1 : 1));
  const d = study.refinement.jaccardDistance;
  const membersOf = (item: Gated) => item.battery.books.map((book) => book.symbol);
  const far = (item: Gated, others: Gated[]) =>
    others.every((other) => jaccardDistance(membersOf(item), membersOf(other)) >= d);
  const primary = passing[0];
  const nominees: { role: string; rule: string; item: Gated }[] = [];

  if (!primary) {
    return { passing, nominees };
  }

  nominees.push({ role: 'primary', rule: 'argmax S', item: primary });

  const alternative1 = passing.find((item) => item !== primary && far(item, [primary]));

  if (alternative1) {
    nominees.push({ role: 'alternative 1', rule: `argmax S with d ≥ ${d} from the primary`, item: alternative1 });
  }

  const chosen = nominees.map((nominee) => nominee.item);
  const compactChosen = chosen.some((item) => item.battery.books.length <= study.refinement.compactBooks);
  const alternative2 = passing.find(
    (item) =>
      !chosen.includes(item) &&
      far(item, chosen) &&
      (compactChosen || item.battery.books.length <= study.refinement.compactBooks)
  );

  if (alternative2) {
    nominees.push({
      role: 'alternative 2',
      rule: compactChosen
        ? `argmax S with d ≥ ${d} from the others (a compact nominee is already chosen)`
        : `argmax S with ≤ ${study.refinement.compactBooks} books and d ≥ ${d} from the others`,
      item: alternative2
    });
  }

  return { passing, nominees };
};

// ----- the shortlist -----

export const buildShortlist = (
  entries: readonly Entry[],
  refined: readonly { slot: number; start: string; result: string }[],
  get: (key: string) => Entry
) => {
  const items: { entry: Entry; kind: Battery['kind']; label: string }[] = [];
  const has = (key: string) => items.some((item) => item.entry.key === key);

  for (const run of refined) {
    if (!has(run.result)) {
      items.push({ entry: get(run.result), kind: 'refined', label: `R${run.slot} (refined c${run.slot})` });
    }
  }

  for (const run of refined) {
    if (!has(run.start)) {
      items.push({ entry: get(run.start), kind: 'contender', label: `C${run.slot} (contender c${run.slot})` });
    }
  }

  const pool = entries.filter(feasible).sort((a, b) => qOf(b) - qOf(a) || (a.key < b.key ? -1 : 1));
  let extra = 0;

  for (const entry of pool) {
    if (items.length >= study.robustness.shortlist || extra >= study.robustness.extraArchive) {
      break;
    }

    if (
      !has(entry.key) &&
      items.every((item) => jaccardDistance(item.entry.e.members, entry.e.members) >= study.refinement.jaccardDistance)
    ) {
      extra++;
      items.push({ entry, kind: 'archive', label: `A${extra} (archive)` });
    }
  }

  return items;
};

export const runShortlist = (
  evaluator: JointEvaluator,
  loaded: LoadedUniverse,
  shortlist: ReturnType<typeof buildShortlist>,
  benchmarks: Record<BenchmarkKey, Book[]>,
  jointPerturbations: number = study.robustness.jointPerturbations
) => {
  const batteries: Battery[] = [];

  for (const key of ['B1', 'B4', 'B5'] as const) {
    batteries.push(runBattery(evaluator, loaded, benchmarks[key], key, 'benchmark', jointPerturbations));
    log(`battery ${key} done`);
  }

  for (const item of shortlist) {
    batteries.push(runBattery(evaluator, loaded, booksOfEntry(item.entry), item.label, item.kind, jointPerturbations));
    log(`battery ${item.label} done (${evaluator.cacheStats().traceBuilds} traces built so far)`);
  }

  const ladder: Ladder[] = study.robustness.ladderFractions.map((fraction) => {
    const figures = runFigures(
      evaluator,
      engineRun(evaluator, loaded, benchmarks.B5, 'portfolio', study.principalCostBps, fraction)
    );

    return {
      fraction,
      borrowingDollarDays: figures.borrowingDollarDays,
      endEquity: figures.endEquity,
      dailyPercent: figures.dailyPercent
    };
  });
  const b5 = batteries.find((battery) => battery.key === keyOf(benchmarks.B5))!;
  const gated: Gated[] = batteries.map((battery) => ({ battery, outcome: gatesOf(battery, b5, ladder) }));

  return { batteries, ladder, gated, ...nominate(gated) };
};

// The nominees on the full engine on training, both modes, four costs (E4 before the freeze).
export const confirmNominees = (
  evaluator: JointEvaluator,
  loaded: LoadedUniverse,
  nominees: readonly { role: string; books: Book[] }[]
) =>
  nominees.map((nominee) => {
    const runs: Record<string, ReturnType<typeof runFigures> & { parityDifferences?: number }> = {};

    for (const mode of ['fixed', 'portfolio'] as const) {
      for (const costBps of study.costsBps) {
        const figures = runFigures(evaluator, engineRun(evaluator, loaded, nominee.books, mode, costBps));

        if (mode === 'fixed') {
          const canonical = canonicalBooks(nominee.books);
          const parity = replayAgainstFull(
            loaded,
            canonical.map((book) => book.symbol),
            Object.fromEntries(canonical.map((book) => [book.symbol, evaluator.phenotype(book)])),
            costBps
          );

          runs[`${mode}-${costBps}`] = { ...figures, parityDifferences: parity.differences.length };
        } else {
          runs[`${mode}-${costBps}`] = figures;
        }
      }
    }

    return { role: nominee.role, key: keyOf(nominee.books), runs };
  });

// The rolling-origin diagnostic (§9, not a gate): does in-sample ranking persist forward inside training?
export const rollingOrigin = (entries: readonly Entry[]) => {
  const pool = entries.filter((entry) => entry.stage === 'D' && feasible(entry));
  const rank = (values: number[]) => {
    const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
    const ranks = new Array<number>(values.length);

    order.forEach((item, position) => {
      ranks[item.index] = position;
    });

    return ranks;
  };
  const spearman = (x: number[], y: number[]) => {
    const rx = rank(x);
    const ry = rank(y);
    const n = x.length;
    const mean = (n - 1) / 2;
    let num = 0;
    let dx = 0;
    let dy = 0;

    for (let i = 0; i < n; i++) {
      num += (rx[i]! - mean) * (ry[i]! - mean);
      dx += (rx[i]! - mean) ** 2;
      dy += (ry[i]! - mean) ** 2;
    }

    return num / Math.sqrt(dx * dy);
  };
  const f1 = pool.map((entry) => entry.e.folds[0]!);
  const f2 = pool.map((entry) => entry.e.folds[1]!);
  const f3 = pool.map((entry) => entry.e.folds[2]!);
  const f12 = pool.map((_, index) => f1[index]! + f2[index]!);
  const f23 = pool.map((_, index) => f2[index]! + f3[index]!);
  const top = Math.max(1, Math.floor(pool.length / 100));
  const topByF12 = pool
    .map((entry, index) => ({ entry, f12: f12[index]!, f3: f3[index]! }))
    .sort((a, b) => b.f12 - a.f12)
    .slice(0, top);

  return {
    configurations: pool.length,
    spearmanF1VsF2F3: spearman(f1, f23),
    spearmanF1F2VsF3: spearman(f12, f3),
    topPercentByF1F2: {
      count: top,
      medianF3: median(topByF12.map((item) => item.f3)),
      archiveMedianF3: median(f3),
      shareWithPositiveF3: topByF12.filter((item) => item.f3 > 0).length / top
    }
  };
};

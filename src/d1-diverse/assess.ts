// Assessment (PROTOCOL.md §13) of a finalist or a benchmark on the round's window: the selection batch `confirm-A`
// (n at 5 and at 10 bps, block marks included, so both J and T are computed from the same draws), the sensitivity
// classes (A2, N2, N3, N0 probes), centres at four costs, smoothed leave-one-out marginals under both scores, member
// evidence and grades, refusals, tie-order sensitivity, boundary coordinates, per-block P&L, the full engine (fixed
// parity at four costs, the 20% portfolio at four costs under both dividend conventions), C0 on the same dates, 16
// portfolio neighbours, capacity, omitted-distribution bounds and labels. `confirm-B` is never computed here.
import { loadDatasetSessions, resolveDataset } from '#lib';
import type { IntParams } from '../d1-refinement/families.ts';
import { nearBenchmark } from '../d1-robust/assess.ts';
import { type EngineSummary, type Evaluation, canonicalBooks, keyOf, runEngine } from '../d1-robust/evaluate.ts';
import type { RobustEvaluator } from '../d1-robust/evaluator.ts';
import { type Book, boundaryCoordinates, gridKeyOf, neighbourOf, vectorOfGrid } from '../d1-robust/neighbourhood.ts';
import { portfolioSpec } from '../d1-robust/promote.ts';
import {
  type NeighbourRecord,
  type NeighbourhoodStats,
  type PairedInterval,
  bootstrapInterval,
  medianOf,
  pairedBootstrap,
  q25Of,
  quantile,
  summarize
} from '../d1-robust/stats.ts';
import { probeParams } from '../multi-etf-d1/space.ts';
import { Rng } from '../optimizer/rng.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { interpolate } from '../portfolio-aware-d1/stageC.ts';
import { type ArmKey, type WindowKey, readJson, study, universeFile, vanguardIssued } from './context.ts';
import { nearReferenceLabel } from './gates.ts';
import { armLibrary } from './library.ts';
import { type InspectedReference, inspectedReferenceBooks, nearReferences } from './references.ts';
import {
  type BlockSpec,
  type DifferenceInterval,
  type RiskReferences,
  type ScoreSet,
  blockPnl,
  pairedScoreDifference,
  scoreDrawsOf,
  scoreOfDraws,
  scoreSetOf,
  temporalNet
} from './scores.ts';

export type ConfigKind = 'finalist' | 'benchmark' | 'reference';

export interface MemberRecord {
  symbol: string;
  virtualTrades: number;
  fundedLots: number;
  netCentre: number;
  regimes: number;
  grade: 'standard' | 'thin';
  marginalJ: number; // S_J,A(C) − S_J,A(C ∖ i)
  marginalT: number;
  withoutNet: number;
  withoutDrawdown: number;
  withoutP50: number;
  refusedBy: Record<string, number>;
  refused: Record<string, number>;
  capacity: { partLot: number; partPortfolio: number; delayedShare: number; fills: number };
  vanguard: boolean;
  lotDays: number;
  omissionBounds: number[]; // lot-days × $100,000 × yield ÷ 365 at 1/3/6%
}

export interface ConfirmDraws {
  net: number[];
  netT: number[];
  drawdown: number[];
}

export interface Assessment {
  key: string;
  label: string;
  kind: ConfigKind;
  arm: ArmKey | 'benchmark' | 'reference';
  books: { symbol: string; id: string; grid: Grid; origin: string }[];
  members: string[];
  centre: Record<string, Evaluation>;
  centreNetT: number;
  blocks: number[];
  confirmA: ScoreSet; // 5 bps
  confirmA10: ScoreSet; // 10 bps
  draws: ConfirmDraws; // confirm-A at 5 bps, by draw index (paired comparisons)
  intervals: {
    p50: ReturnType<typeof bootstrapInterval>;
    q25: ReturnType<typeof bootstrapInterval>;
    p50T: ReturnType<typeof bootstrapInterval>;
  };
  a2: NeighbourhoodStats;
  n2: NeighbourhoodStats;
  n3: Record<string, NeighbourhoodStats>;
  n0: { count: number; feasibleShare: number; median: number; p10: number };
  members_: MemberRecord[];
  ties: { label: string; priority: string[]; net: number; minuteDrawdown: number; lots: number }[];
  identityEqual: boolean;
  maxTieChange: number;
  boundary: number;
  parity: { costBps: number; differences: number; first: string[] }[];
  portfolio: Record<string, EngineSummary>; // `${cost}-${symmetric|frozen}`
  c0: { dailyPercent: number; drawdownOnCandidateDates: number };
  portfolioNeighbours: { dailyPercentMedian: number; dailyPercentMax: number; endEquityMedian: number };
  ladder?: {
    matchedEndEquity: number;
    extrapolated: boolean;
    points: { fraction: number; borrowingDollarDays: number; endEquity: number }[];
  };
  versus?: Record<
    'B4' | 'B5',
    {
      p50: PairedInterval; // ΔP50(net)
      p50T: PairedInterval; // ΔP50(net_T)
      scoreJ: number; // S_J,A(C) − S_J,A(B)
      scoreT: number;
      scoreJInterval: DifferenceInterval; // paired, identical confirm-A draw indices
      scoreTInterval: DifferenceInterval;
    }
  >;
  labels: string[];
}

const evidenceOf = (centre: Evaluation, symbol: string) => ({
  virtualTrades: centre.virtualBySymbol[symbol] ?? 0,
  fundedLots: centre.lotsBySymbol[symbol] ?? 0,
  regimes: centre.regimesBySymbol[symbol] ?? 0
});

// A symbol's regular-minute times and traded dollars through `endDate`, its file checked against this study's audit.
const minuteCache = new Map<string, Promise<{ times: Float64Array; dollars: Float64Array }>>();

const minuteDollars = (symbol: string, endDate: string) => {
  const key = `${symbol}|${endDate}`;
  let found = minuteCache.get(key);

  if (!found) {
    found = loadDatasetSessions({
      dataset: resolveDataset(symbol, 'training'),
      endDate,
      warmupSessions: 0,
      access: 'optimization'
    }).then(async (run) => {
      const audited = (await readJson<{ symbols: Record<string, { dataSha256: string }> }>(universeFile)).symbols[
        symbol
      ]?.dataSha256;

      if (run.report!.dataSha256 !== audited) {
        throw new Error(`${symbol}: the canonical file does not hash to the audited one (capacity read)`);
      }

      const bars = run.history.flatMap((session) => session.bars);

      return {
        times: Float64Array.from(bars, (bar) => bar.time),
        dollars: Float64Array.from(bars, (bar) => bar.close * bar.volume)
      };
    });
    minuteCache.set(key, found);
  }

  return found;
};

export const capacityOf = async (
  symbol: string,
  lots: { symbol: string; decisionTime: number; entryTime: number }[],
  endDate: string,
  portfolioLot: number
) => {
  const own = lots.filter((lot) => lot.symbol === symbol);

  if (own.length === 0) {
    return { partLot: NaN, partPortfolio: NaN, delayedShare: NaN, fills: 0 };
  }

  const { times, dollars } = await minuteDollars(symbol, endDate);
  const lowerBound = (t: number) => {
    let lo = 0;
    let hi = times.length;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;

      if (times[mid]! < t) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    return lo;
  };
  const volumes = own.map((lot) => {
    const minute = lot.decisionTime - 60; // the decision is stamped at the end of its minute
    let total = 0;

    for (let i = lowerBound(minute); i < times.length && times[i]! < minute + study.capacity.windowMinutes * 60; i++) {
      total += dollars[i]!;
    }

    return total;
  });
  const medianVolume = quantile(volumes, 0.5);
  const delayed = own.filter((lot) => lot.entryTime - lot.decisionTime >= study.capacity.delayMinutes * 60).length;

  return {
    partLot: medianVolume > 0 ? study.principal / medianVolume : Infinity,
    partPortfolio: medianVolume > 0 ? portfolioLot / medianVolume : Infinity,
    delayedShare: delayed / own.length,
    fills: own.length
  };
};

export interface AssessContext {
  evaluator: RobustEvaluator;
  window: WindowKey;
  confirmDraws: number;
  references: RiskReferences;
  blocks: BlockSpec;
  benchmarks: Record<'B1' | 'B4' | 'B5', Book[]>;
  universe: readonly string[];
  searchEnd: string;
  capacity?: typeof capacityOf; // injectable for synthetic tests
  inspectedGrids?: Set<string>; // injectable for synthetic tests
  inspectedReferences?: InspectedReference[]; // R1, R4, the October 25 finalist (injectable for synthetic tests)
}

const confirmRecords = async (ctx: AssessContext, configs: Book[][], costBps: number) =>
  ctx.evaluator.neighbourRecords(configs, {
    stage: 'confirm-A',
    cls: 'N1',
    n: ctx.confirmDraws,
    costBps,
    markIndices: ctx.blocks.markIndices
  });

let inspected: Promise<Set<string>> | undefined;
let references: Promise<InspectedReference[]> | undefined;

const referencesOf = () => (references ??= inspectedReferenceBooks());

const inspectedGrids = (ctx: AssessContext) =>
  ctx.inspectedGrids
    ? Promise.resolve(ctx.inspectedGrids)
    : (inspected ??= armLibrary('seeded').then(
        (library) => new Set(library.controls.map((vector) => gridKeyOf(vector.grid)))
      ));

const drawsOf = (records: readonly NeighbourRecord[]): ConfirmDraws => ({
  net: records.map((record) => record.net),
  netT: records.map((record) => temporalNet(record.net, record.markAt)),
  drawdown: records.map((record) => record.drawdown)
});

export const assessConfig = async (
  ctx: AssessContext,
  books: Book[],
  label: string,
  kind: ConfigKind,
  arm: Assessment['arm']
): Promise<Assessment> => {
  const { evaluator } = ctx;
  const canonical = canonicalBooks(books);
  const members = canonical.map((book) => book.symbol).sort();
  const centre: Record<string, Evaluation> = {};

  for (const costBps of study.costsBps) {
    centre[costBps] = (
      await evaluator.centres([canonical], costBps, { withFunded: true, markIndices: ctx.blocks.markIndices })
    )[0]!;
  }

  const five = centre[study.principalCostBps]!;
  const [confirm5] = await confirmRecords(ctx, [canonical], study.principalCostBps);
  const [confirm10] = await confirmRecords(ctx, [canonical], 10);
  const confirmA = scoreSetOf(five.net, five.markAt, confirm5!, members.length, ctx.references);
  const confirmA10 = scoreSetOf(centre[10]!.net, centre[10]!.markAt, confirm10!, members.length, ctx.references);
  const draws = drawsOf(confirm5!);
  const [a2] = await evaluator.neighbourRecords([canonical], {
    stage: 'confirm-A-A2',
    cls: 'N1A2',
    n: study.draws.confirmA2,
    costBps: study.principalCostBps
  });
  const [n2] = await evaluator.neighbourRecords([canonical], {
    stage: 'confirm-A-N2',
    cls: 'N2',
    n: study.draws.confirmN2,
    costBps: study.principalCostBps
  });
  const n3: Record<string, NeighbourhoodStats> = {};

  for (const symbol of members) {
    const [records] = await evaluator.neighbourRecords([canonical], {
      stage: 'confirm-A-N3',
      cls: 'N3',
      n: study.draws.confirmN3PerMember,
      costBps: study.principalCostBps,
      member: [symbol]
    });

    n3[symbol] = summarize(five.net, records!);
  }

  // N0 probes (diagnostic only).
  const probes = canonical.flatMap((book) =>
    probeParams(book.vector.grid as unknown as IntParams).map((probe) =>
      canonical.map((item) =>
        item.symbol === book.symbol
          ? { symbol: item.symbol, vector: vectorOfGrid(probe.params as unknown as Grid, 'probe') }
          : item
      )
    )
  );
  const probeEvaluations = await evaluator.centres(probes, study.principalCostBps);
  const probeNets = probeEvaluations.map((evaluation) => evaluation.net).sort((a, b) => a - b);

  // Leave-one-out marginals under both scores on the same confirm-A draws (the empty pool scores 0).
  const without = members.map((symbol) => canonical.filter((book) => book.symbol !== symbol));
  const nonEmpty = without.filter((item) => item.length > 0);
  const withoutCentres = nonEmpty.length > 0 ? await evaluator.centres(nonEmpty, study.principalCostBps) : [];
  const withoutRecords = nonEmpty.length > 0 ? await confirmRecords(ctx, nonEmpty, study.principalCostBps) : [];
  const portfolio: Record<string, EngineSummary> = {};
  const specs = study.costsBps.flatMap((costBps) =>
    [false, true].map((lotDividends) => portfolioSpec(evaluator, canonical, label, costBps, { lotDividends }))
  );
  const summaries = await evaluator.engines(specs);

  specs.forEach((spec, index) => {
    portfolio[`${spec.costBps}-${spec.lotDividends ? 'frozen' : 'symmetric'}`] = summaries[index]!;
  });

  const portfolioLot = study.fraction * portfolio[`${study.principalCostBps}-symmetric`]!.endEquity;
  const detail = evaluator.replayDetail(canonical, study.principalCostBps);
  const entryTimes = new Map(detail.lots.map((lot) => [`${lot.symbol}@${lot.decisionTime}`, lot.entryTime]));
  const lots = detail.lots.map((lot) => ({
    symbol: lot.symbol,
    decisionTime: lot.decisionTime,
    entryTime: entryTimes.get(`${lot.symbol}@${lot.decisionTime}`) ?? lot.decisionTime
  }));
  // Lot-days for the omission bounds: a lot still open at the window's end counts to the last close.
  const lastClose = (symbol: string) => evaluator.ds(symbol).sCloseTime[evaluator.window.endIndex]!;
  const lotDays = (symbol: string) =>
    detail.lots
      .filter((lot) => lot.symbol === symbol)
      .reduce(
        (total, lot) =>
          total + Math.max(0, (lot.exitIndex >= 0 ? lot.exitTime : lastClose(symbol)) - lot.entryTime) / 86400,
        0
      );
  const memberRecords: MemberRecord[] = [];
  let cursor = 0;

  for (const symbol of members) {
    const rest = canonical.filter((book) => book.symbol !== symbol);
    let marginalJ: number;
    let marginalT: number;
    let withoutNet = 0;
    let withoutDrawdown = 0;
    let withoutP50 = 0;

    if (rest.length === 0) {
      marginalJ = confirmA.j.s;
      marginalT = confirmA.t.s;
    } else {
      const e = withoutCentres[cursor]!;
      const records = withoutRecords[cursor]!;

      cursor++;
      marginalJ = confirmA.j.s - scoreOfDraws(scoreDrawsOf('J', records), rest.length, ctx.references);
      marginalT = confirmA.t.s - scoreOfDraws(scoreDrawsOf('T', records), rest.length, ctx.references);
      withoutNet = e.net;
      withoutDrawdown = e.minuteDrawdown;
      withoutP50 = summarize(e.net, records).p50;
    }

    const evidence = evidenceOf(five, symbol);
    const days = lotDays(symbol);

    memberRecords.push({
      symbol,
      ...evidence,
      netCentre: five.netBySymbol[symbol] ?? 0,
      grade:
        evidence.virtualTrades >= study.gates.memberStandardTrades &&
        evidence.fundedLots >= study.gates.memberStandardLots &&
        evidence.regimes >= study.gates.memberStandardRegimes
          ? 'standard'
          : 'thin',
      marginalJ,
      marginalT,
      withoutNet,
      withoutDrawdown,
      withoutP50,
      refusedBy: Object.fromEntries(
        members.filter((other) => other !== symbol).map((other) => [other, five.refusals[symbol]?.[other] ?? 0])
      ),
      refused: Object.fromEntries(
        members.filter((other) => other !== symbol).map((other) => [other, five.refusals[other]?.[symbol] ?? 0])
      ),
      capacity: await (ctx.capacity ?? capacityOf)(symbol, lots, ctx.searchEnd, portfolioLot),
      vanguard: (vanguardIssued as readonly string[]).includes(symbol),
      lotDays: days,
      omissionBounds: study.dividendBoundYields.map((yieldRate) => (days * study.principal * yieldRate) / 365)
    });
  }

  // Tie orders: identity (alphabetical through aliases), reverse alphabetical, two seeded orders.
  const orders: { label: string; priority: string[] }[] = [
    { label: 'reverse alphabetical', priority: [...members].reverse() }
  ];

  for (let index = 0; index < study.assessment.tiePermutations; index++) {
    const rng = Rng.from(study.seedLabel, ctx.window, 'ties', keyOf(canonical), index);
    const priority = [...members];

    for (let i = priority.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);

      [priority[i], priority[j]] = [priority[j]!, priority[i]!];
    }

    orders.push({ label: `seeded order ${index + 1}`, priority });
  }

  const [identity] = await evaluator.centres([canonical], study.principalCostBps, { priority: members });
  const tieEvaluations = await Promise.all(
    orders.map(
      async (order) => (await evaluator.centres([canonical], study.principalCostBps, { priority: order.priority }))[0]!
    )
  );
  const ties = orders.map((order, index) => ({
    ...order,
    net: tieEvaluations[index]!.net,
    minuteDrawdown: tieEvaluations[index]!.minuteDrawdown,
    lots: tieEvaluations[index]!.lots
  }));

  // Full engine: fixed parity at four costs.
  const phenotypes = evaluator.phenotypes(canonical);
  const parity = study.costsBps.map((costBps) => {
    const outcome = replayAgainstFull(
      evaluator.loaded,
      canonical.map((book) => book.symbol),
      phenotypes,
      costBps
    );

    return { costBps, differences: outcome.differences.length, first: outcome.differences.slice(0, 3) };
  });

  // C0 on the same dates, and the 16-neighbour portfolio check.
  const universe = evaluator.loaded.universe;
  const candidateRun = runEngine(universe, portfolioSpec(evaluator, canonical, label));
  const c0Run = runEngine(universe, { ...portfolioSpec(evaluator, [], 'C0') });
  const peak = candidateRun.dailyPercentDrawdown!;
  const equityAt = (run: typeof c0Run, time: number) =>
    run.daily.find((row) => Object.values(universe.instruments)[0]!.ds.sCloseTime[row.index] === time)?.equity ?? NaN;
  const c0Peak = equityAt(c0Run, peak.peakTime);
  const c0Trough = equityAt(c0Run, peak.troughTime);
  const neighbourDraws = Array.from({ length: study.assessment.portfolioNeighbours }, (_, draw) => draw);
  const portfolioNeighbours = await evaluator.engines(
    neighbourDraws.map((draw) =>
      portfolioSpec(evaluator, neighbourOf(canonical, evaluator.label, 'confirm-A', 'N1', draw), `${label}-pn${draw}`)
    )
  );
  const percents = portfolioNeighbours.map((item) => item.dailyPercent).sort((a, b) => a - b);
  const equities = portfolioNeighbours.map((item) => item.endEquity).sort((a, b) => a - b);
  const labels: string[] = [];
  const portfolioPercent = portfolio[`${study.principalCostBps}-symmetric`]!.dailyPercent;
  const controls = await inspectedGrids(ctx);

  if (books.some((book) => book.vector.origin.startsWith('control:') || controls.has(gridKeyOf(book.vector.grid)))) {
    labels.push('inspected control vector');
  }

  if (
    kind === 'finalist' &&
    (['B1', 'B4', 'B5'] as const).some((key) => nearBenchmark(canonical, ctx.benchmarks[key]))
  ) {
    labels.push('neighbour of an inspected configuration');
  }

  const near = kind === 'finalist' ? nearReferences(canonical, ctx.inspectedReferences ?? (await referencesOf())) : [];

  if (near.length > 0) {
    labels.push(nearReferenceLabel, `near ${near.join(', ')}`);
  }

  if (memberRecords.some((member) => member.grade === 'thin')) {
    labels.push('thin evidence');
  }

  if (boundaryCoordinates(canonical) > study.gates.boundaryShare * 8 * canonical.length) {
    labels.push('box-constrained');
  }

  if (
    memberRecords.some(
      (member) =>
        member.capacity.partLot > study.capacity.participation ||
        member.capacity.delayedShare > study.capacity.delayedShare
    )
  ) {
    labels.push('capacity-limited');
  }

  if (memberRecords.some((member) => member.capacity.partPortfolio > study.capacity.participation)) {
    labels.push('capacity-unverified');
  }

  if (memberRecords.some((member) => member.vanguard)) {
    labels.push('brokerage-constraint pending');
  }

  if (portfolioPercent > study.portfolioDailyIdeal) {
    labels.push('portfolio DD in (30%, 35%]');
  }

  const intervalRng = (statistic: string) =>
    Rng.from(study.seedLabel, ctx.window, 'bootstrap', 'confirm-A', keyOf(canonical), statistic);

  return {
    key: keyOf(canonical),
    label,
    kind,
    arm,
    books: canonical.map((book) => ({
      symbol: book.symbol,
      id: book.vector.id,
      grid: book.vector.grid,
      origin: book.vector.origin
    })),
    members,
    centre,
    centreNetT: temporalNet(five.net, five.markAt),
    blocks: blockPnl(five.markAt!),
    confirmA,
    confirmA10,
    draws,
    intervals: {
      p50: bootstrapInterval(draws.net, medianOf, intervalRng('p50')),
      q25: bootstrapInterval(draws.net, q25Of, intervalRng('q25')),
      p50T: bootstrapInterval(draws.netT, medianOf, intervalRng('p50T'))
    },
    a2: summarize(five.net, a2!),
    n2: summarize(five.net, n2!),
    n3,
    n0: {
      count: probeNets.length,
      feasibleShare:
        probeEvaluations.filter((evaluation) => evaluation.minuteDrawdown <= study.drawdownCeiling).length /
        Math.max(1, probeEvaluations.length),
      median: probeNets[probeNets.length >> 1] ?? NaN,
      p10: probeNets[Math.floor(0.1 * (probeNets.length - 1))] ?? NaN
    },
    members_: memberRecords,
    ties,
    identityEqual:
      identity!.net === five.net && identity!.minuteDrawdown === five.minuteDrawdown && identity!.lots === five.lots,
    maxTieChange: Math.max(0, ...ties.map((tie) => Math.abs(tie.net - five.net))),
    boundary: boundaryCoordinates(canonical),
    parity,
    portfolio,
    c0: {
      dailyPercent: c0Run.dailyPercentDrawdown?.maximumPercent ?? NaN,
      drawdownOnCandidateDates: Number.isFinite(c0Peak) && Number.isFinite(c0Trough) ? 1 - c0Trough / c0Peak : NaN
    },
    portfolioNeighbours: {
      dailyPercentMedian: percents[percents.length >> 1] ?? NaN,
      dailyPercentMax: percents.at(-1) ?? NaN,
      endEquityMedian: equities[equities.length >> 1] ?? NaN
    },
    labels
  };
};

// The paired 90% interval of the score difference between two assessments on identical confirm-A draws (§6.3).
export const scoreDifferenceInterval = (
  score: 'J' | 'T',
  a: Assessment,
  b: Assessment,
  references: RiskReferences,
  window: string
): DifferenceInterval =>
  pairedScoreDifference(
    {
      draws: {
        net: Float64Array.from(score === 'J' ? a.draws.net : a.draws.netT),
        drawdown: Float64Array.from(a.draws.drawdown)
      },
      books: a.members.length
    },
    {
      draws: {
        net: Float64Array.from(score === 'J' ? b.draws.net : b.draws.netT),
        drawdown: Float64Array.from(b.draws.drawdown)
      },
      books: b.members.length
    },
    references,
    Rng.from(study.seedLabel, window, 'bootstrap', 'runner-up', score, a.key, b.key)
  );

// B5's ladder (symmetric dividends) on the window.
export const ladderOf = async (ctx: AssessContext) => {
  const specs = study.assessment.ladderFractions.map((fraction) =>
    portfolioSpec(ctx.evaluator, ctx.benchmarks.B5, `B5-ladder-${fraction}`, study.principalCostBps, { fraction })
  );
  const summaries = await ctx.evaluator.engines(specs);

  return study.assessment.ladderFractions.map((fraction, index) => ({
    fraction,
    borrowingDollarDays: summaries[index]!.borrowingDollarDays,
    endEquity: summaries[index]!.endEquity
  }));
};

// The paired comparisons against B4 and B5 (identical confirm-A draw indices) and the matched-borrowing ladder.
export const attachComparisons = (
  ctx: AssessContext,
  assessment: Assessment,
  benchmarks: Record<'B4' | 'B5', Assessment>,
  ladder: Awaited<ReturnType<typeof ladderOf>>
) => {
  assessment.versus = Object.fromEntries(
    (['B4', 'B5'] as const).map((key) => [
      key,
      {
        p50: pairedBootstrap(
          assessment.draws.net,
          benchmarks[key].draws.net,
          medianOf,
          Rng.from(study.seedLabel, ctx.window, 'bootstrap', 'paired', assessment.key, key, 'net')
        ),
        p50T: pairedBootstrap(
          assessment.draws.netT,
          benchmarks[key].draws.netT,
          medianOf,
          Rng.from(study.seedLabel, ctx.window, 'bootstrap', 'paired', assessment.key, key, 'netT')
        ),
        scoreJ: assessment.confirmA.j.s - benchmarks[key].confirmA.j.s,
        scoreT: assessment.confirmA.t.s - benchmarks[key].confirmA.t.s,
        scoreJInterval: scoreDifferenceInterval('J', assessment, benchmarks[key], ctx.references, ctx.window),
        scoreTInterval: scoreDifferenceInterval('T', assessment, benchmarks[key], ctx.references, ctx.window)
      }
    ])
  ) as Assessment['versus'];

  const own = assessment.portfolio[`${study.principalCostBps}-symmetric`]!;
  const matched = interpolate(
    ladder.map((point) => ({ x: point.borrowingDollarDays, y: point.endEquity })),
    own.borrowingDollarDays
  );

  assessment.ladder = { matchedEndEquity: matched.value, extrapolated: matched.extrapolated, points: ladder };

  if (matched.extrapolated) {
    assessment.labels.push('G7 borrowing comparison extrapolated');
  }
};

// Stage S7 (PROTOCOL.md §12) and the gates, ranking and nominations (§13.2, §14). For each finalist (a refined family
// result) and each benchmark on the round's window: the selection batch N1 'confirm-A' (n = confirmDraws) at 5 and
// 10 bps, the sensitivity classes (A2, N2, N3, N0 probes), centres at four costs, smoothed leave-one-out marginals on
// the same confirm-A draws, refusals and contested ties, tie-order sensitivity, boundary coordinates, paired
// bootstraps against B4 and B5, the full engine (fixed parity field for field at four costs; the 20% portfolio at
// four costs under both dividend conventions), B5's ladder and the matched-borrowing comparison, the C0 drawdown on
// the same dates, the 16-neighbour portfolio check and the capacity measures. 'confirm-B' is never computed here.
import { loadDatasetSessions, resolveDataset } from '#lib';
import { probeParams } from '../multi-etf-d1/space.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { Rng } from '../optimizer/rng.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { interpolate } from '../portfolio-aware-d1/stageC.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import type { Arm } from './archive.ts';
import { type Tier, type WindowKey, readJson, study, universeFile, vanguardIssued } from './context.ts';
import { type EngineSummary, type Evaluation, canonicalBooks, keyOf, runEngine } from './evaluate.ts';
import type { RobustEvaluator } from './evaluator.ts';
import { jaccardDistance } from './genome.ts';
import { roundLibrary } from './library.ts';
import {
  type Book,
  boundaryCoordinates,
  gridKeyOf,
  neighbourOf,
  paramOrder,
  stepUnitOf,
  vectorOfGrid
} from './neighbourhood.ts';
import { portfolioSpec } from './promote.ts';
import {
  type NeighbourhoodStats,
  type PairedInterval,
  type RiskReferences,
  type ScoreParts,
  bootstrapInterval,
  medianOf,
  pairedBootstrap,
  q25Of,
  quantile,
  scoreOf,
  summarize
} from './stats.ts';

export type ConfigKind = 'finalist' | 'benchmark';

export interface MemberRecord {
  symbol: string;
  virtualTrades: number;
  fundedLots: number;
  netCentre: number;
  regimes: number;
  grade: 'standard' | 'thin';
  marginal: number; // S_A(C) − S_A(C ∖ i)
  withoutNet: number;
  withoutDrawdown: number;
  withoutP50: number;
  refusedBy: Record<string, number>; // other members whose lots refused this member's decisions
  refused: Record<string, number>; // this member's lots refused these members' decisions
  capacity: { partLot: number; partPortfolio: number; delayedShare: number; fills: number };
  vanguard: boolean;
}

export interface Assessment {
  key: string;
  label: string;
  kind: ConfigKind;
  arm: Arm;
  provenance: string;
  books: { symbol: string; id: string; grid: Grid; origin: string }[];
  members: string[];
  centre: Record<string, Evaluation>;
  confirmA: NeighbourhoodStats;
  confirmA10: NeighbourhoodStats;
  confirmANets: number[];
  scoreA: ScoreParts;
  intervals: { p50: ReturnType<typeof bootstrapInterval>; q25: ReturnType<typeof bootstrapInterval> };
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
  versus?: Record<'B4' | 'B5', PairedInterval & { scoreDifference: number }>;
  labels: string[];
}

const evidenceOf = (centre: Evaluation, symbol: string) => ({
  virtualTrades: centre.virtualBySymbol[symbol] ?? 0,
  fundedLots: centre.lotsBySymbol[symbol] ?? 0,
  regimes: centre.regimesBySymbol[symbol] ?? 0
});

// A symbol's regular-minute times and traded dollars through `endDate` (read once per process).
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

// Capacity on the window: the dollar volume of the five regular minutes from each funded decision minute, and the
// share of fills two or more minutes after the decision. Reads the member's own bars only through the window's end.
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
  round: WindowKey;
  tier: Tier;
  references: RiskReferences;
  benchmarks: Record<'B1' | 'B4' | 'B5', Book[]>;
  universe: readonly string[];
  searchEnd: string;
  capacity?: typeof capacityOf; // injectable for synthetic tests
}

const confirmStats = async (
  ctx: AssessContext,
  configs: Book[][],
  costBps: number,
  stage = 'confirm-A',
  n = ctx.tier.confirmDraws
) => ctx.evaluator.neighbourRecords(configs, { stage, cls: 'N1', n, costBps });

// §22 labels (amendment 2). A member's grid is an inspected control vector whenever it equals one of the final
// library's controls, whatever origin the archive recorded (the seeded arm's B1/B4/B5 books carry 'benchmark:'
// origins). A configuration is a neighbour of an inspected configuration when it shares at least half its membership
// with B1, B4 or B5 (Jaccard distance < 0.5) and every shared member's grid is within two step units of the
// benchmark's on every coordinate.
let inspected: Promise<Set<string>> | undefined;

const inspectedGrids = () =>
  (inspected ??= roundLibrary('final').then(
    (library) => new Set(library.controls.map((vector) => gridKeyOf(vector.grid)))
  ));

export const nearBenchmark = (books: readonly Book[], benchmark: readonly Book[]) => {
  const members = books.map((book) => book.symbol);
  const benchmarkMembers = benchmark.map((book) => book.symbol);

  if (jaccardDistance(members, benchmarkMembers) >= study.promotion.jaccardDistance) {
    return false;
  }

  return books
    .filter((book) => benchmarkMembers.includes(book.symbol))
    .every((book) => {
      const other = benchmark.find((item) => item.symbol === book.symbol)!.vector.grid;

      return paramOrder.every((key) => Math.abs(book.vector.grid[key] - other[key]) <= 2 * stepUnitOf(key));
    });
};

export const assessConfig = async (
  ctx: AssessContext,
  books: Book[],
  label: string,
  kind: ConfigKind,
  arm: Arm,
  provenance: string
): Promise<Assessment> => {
  const { evaluator } = ctx;
  const canonical = canonicalBooks(books);
  const members = canonical.map((book) => book.symbol).sort();
  const centre: Record<string, Evaluation> = {};

  for (const costBps of study.costsBps) {
    centre[costBps] = (await evaluator.centres([canonical], costBps, { withFunded: true }))[0]!;
  }

  const five = centre[study.principalCostBps]!;
  const [confirm5] = await confirmStats(ctx, [canonical], study.principalCostBps);
  const [confirm10] = await confirmStats(ctx, [canonical], 10);
  const confirmA = summarize(five.net, confirm5!);
  const confirmA10 = summarize(centre[10]!.net, confirm10!);
  const scoreA = scoreOf(confirmA, members.length, ctx.references);
  const nets = confirm5!.map((record) => record.net);
  const [a2] = await evaluator.neighbourRecords([canonical], {
    stage: 'confirm-A-A2',
    cls: 'N1A2',
    n: study.assessment.a2Draws,
    costBps: study.principalCostBps
  });
  const [n2] = await evaluator.neighbourRecords([canonical], {
    stage: 'confirm-A-N2',
    cls: 'N2',
    n: study.assessment.n2Draws,
    costBps: study.principalCostBps
  });
  const n3: Record<string, NeighbourhoodStats> = {};

  for (const symbol of members) {
    const [records] = await evaluator.neighbourRecords([canonical], {
      stage: 'confirm-A-N3',
      cls: 'N3',
      n: study.assessment.n3PerMember,
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

  // Leave-one-out marginals on the same confirm-A draws (the empty pool scores 0).
  const without = members.map((symbol) => canonical.filter((book) => book.symbol !== symbol));
  const nonEmpty = without.filter((item) => item.length > 0);
  const withoutCentres = nonEmpty.length > 0 ? await evaluator.centres(nonEmpty, study.principalCostBps) : [];
  const withoutRecords = nonEmpty.length > 0 ? await confirmStats(ctx, nonEmpty, study.principalCostBps) : [];
  let cursor = 0;
  const window = evaluator.loaded.universe;
  const portfolio: Record<string, EngineSummary> = {};
  const specs = study.costsBps.flatMap((costBps) =>
    [false, true].map((lotDividends) => portfolioSpec(evaluator, canonical, label, costBps, { lotDividends }))
  );
  const summaries = await evaluator.engines(specs);

  specs.forEach((spec, index) => {
    portfolio[`${spec.costBps}-${spec.lotDividends ? 'frozen' : 'symmetric'}`] = summaries[index]!;
  });

  const portfolioLot = study.fraction * portfolio[`${study.principalCostBps}-symmetric`]!.endEquity;
  const lots = (five.funded ?? []).map((item) => {
    const [symbol, time] = item.split('@') as [string, string];

    return { symbol, decisionTime: Number(time) };
  });
  const detail = evaluator.replayDetail(canonical, study.principalCostBps);
  const entryTimes = new Map(detail.lots.map((lot) => [`${lot.symbol}@${lot.decisionTime}`, lot.entryTime]));
  const memberRecords: MemberRecord[] = [];

  for (const symbol of members) {
    const rest = canonical.filter((book) => book.symbol !== symbol);
    let marginal: number;
    let withoutNet = 0;
    let withoutDrawdown = 0;
    let withoutP50 = 0;

    if (rest.length === 0) {
      marginal = scoreA.s;
    } else {
      const e = withoutCentres[cursor]!;
      const records = withoutRecords[cursor]!;
      const stats = summarize(e.net, records);

      cursor++;
      marginal = scoreA.s - scoreOf(stats, rest.length, ctx.references).s;
      withoutNet = e.net;
      withoutDrawdown = e.minuteDrawdown;
      withoutP50 = stats.p50;
    }

    const evidence = evidenceOf(five, symbol);

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
      marginal,
      withoutNet,
      withoutDrawdown,
      withoutP50,
      refusedBy: Object.fromEntries(
        members.filter((other) => other !== symbol).map((other) => [other, five.refusals[symbol]?.[other] ?? 0])
      ),
      refused: Object.fromEntries(
        members.filter((other) => other !== symbol).map((other) => [other, five.refusals[other]?.[symbol] ?? 0])
      ),
      capacity: await (ctx.capacity ?? capacityOf)(
        symbol,
        lots.map((lot) => ({
          ...lot,
          entryTime: entryTimes.get(`${lot.symbol}@${lot.decisionTime}`) ?? lot.decisionTime
        })),
        ctx.searchEnd,
        portfolioLot
      ),
      vanguard: (vanguardIssued as readonly string[]).includes(symbol)
    });
  }

  // Tie orders: identity (alphabetical through aliases), reverse alphabetical, two seeded orders.
  const orders: { label: string; priority: string[] }[] = [
    { label: 'reverse alphabetical', priority: [...members].reverse() }
  ];

  for (let index = 0; index < study.assessment.tiePermutations; index++) {
    const rng = Rng.from(study.seedLabel, ctx.round, 'ties', keyOf(canonical), index);
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
  const candidateRun = runEngine(window, portfolioSpec(evaluator, canonical, label));
  const c0Run = runEngine(window, { ...portfolioSpec(evaluator, [], 'C0') });
  const peak = candidateRun.dailyPercentDrawdown!;
  // The percent tracker stamps its peak and trough with session close times (amendment 2).
  const equityAt = (run: typeof c0Run, time: number) =>
    run.daily.find((row) => Object.values(window.instruments)[0]!.ds.sCloseTime[row.index] === time)?.equity ?? NaN;
  const c0Peak = equityAt(c0Run, peak.peakTime);
  const c0Trough = equityAt(c0Run, peak.troughTime);
  const draws = Array.from({ length: study.assessment.portfolioNeighbours }, (_, draw) => draw);
  const portfolioNeighbours = await evaluator.engines(
    draws.map((draw) =>
      portfolioSpec(evaluator, neighbourOf(canonical, ctx.round, 'confirm-A', 'N1', draw), `${label}-pn${draw}`)
    )
  );
  const percents = portfolioNeighbours.map((item) => item.dailyPercent).sort((a, b) => a - b);
  const equities = portfolioNeighbours.map((item) => item.endEquity).sort((a, b) => a - b);
  const labels: string[] = [];
  const portfolioPercent = portfolio[`${study.principalCostBps}-symmetric`]!.dailyPercent;

  const controls = await inspectedGrids();

  if (books.some((book) => book.vector.origin.startsWith('control:') || controls.has(gridKeyOf(book.vector.grid)))) {
    labels.push('inspected control vector');
  }

  if (
    kind === 'finalist' &&
    (['B1', 'B4', 'B5'] as const).some((key) => nearBenchmark(canonical, ctx.benchmarks[key]))
  ) {
    labels.push('neighbour of an inspected configuration');
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

  return {
    key: keyOf(canonical),
    label,
    kind,
    arm,
    provenance,
    books: canonical.map((book) => ({
      symbol: book.symbol,
      id: book.vector.id,
      grid: book.vector.grid,
      origin: book.vector.origin
    })),
    members,
    centre,
    confirmA,
    confirmA10,
    confirmANets: nets,
    scoreA,
    intervals: {
      p50: bootstrapInterval(
        nets,
        medianOf,
        Rng.from(study.seedLabel, ctx.round, 'bootstrap', 'confirm-A', keyOf(canonical), 'p50')
      ),
      q25: bootstrapInterval(
        nets,
        q25Of,
        Rng.from(study.seedLabel, ctx.round, 'bootstrap', 'confirm-A', keyOf(canonical), 'q25')
      )
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
    labels: portfolioPercent > study.portfolioDailyIdeal ? [...labels, 'portfolio DD in (30%, 35%]'] : labels
  };
};

// B5's ladder (symmetric dividends) on the window, and each finalist's matched-borrowing comparison.
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
        ...pairedBootstrap(
          assessment.confirmANets,
          benchmarks[key].confirmANets,
          medianOf,
          Rng.from(study.seedLabel, ctx.round, 'bootstrap', 'paired', assessment.key, key)
        ),
        scoreDifference: assessment.scoreA.s - benchmarks[key].scoreA.s
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

// ----- gates -----

export interface GateResult {
  gate: string;
  pass: boolean;
  detail: string;
}

export const materialityOf = (assessment: Assessment) =>
  assessment.portfolio[`${study.principalCostBps}-symmetric`]!.dailyPercent > study.portfolioDailyIdeal
    ? study.gates.conditionalMateriality
    : study.gates.materiality;

const fmt = (value: number) => (Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : String(value));

// The final gates G1–G8 (fold = false) or the fold pick gates (fold = true: no G6/G7, the fold activity floor).
export const gatesOf = (assessment: Assessment, universe: readonly string[], fold: boolean): GateResult[] => {
  const five = assessment.centre[study.principalCostBps]!;
  const ten = assessment.centre[10]!;
  const M = materialityOf(assessment);
  const portfolio = assessment.portfolio[`${study.principalCostBps}-symmetric`]!;
  const lotsFloor = fold ? study.gates.foldPoolLots : study.gates.finalPoolLots;
  const yearsFloor = fold ? study.gates.foldPoolYears : study.gates.finalPoolYears;
  const bestRegime = Math.max(0, ...five.regimes);
  const gates: GateResult[] = [
    {
      gate: 'G1',
      pass:
        assessment.parity.every((row) => row.differences === 0) &&
        assessment.identityEqual &&
        assessment.members.every((symbol) => universe.includes(symbol)),
      detail: `parity ${assessment.parity.map((row) => row.differences).join('/')}, identity ${assessment.identityEqual}`
    },
    {
      gate: 'G2',
      pass:
        five.minuteDrawdown <= study.drawdownCeiling &&
        ten.minuteDrawdown <= study.drawdownCeiling &&
        portfolio.dailyPercent <= study.portfolioDailyCeiling,
      detail: `DD@5 ${fmt(five.minuteDrawdown)}, DD@10 ${fmt(ten.minuteDrawdown)}, portfolio ${(100 * portfolio.dailyPercent).toFixed(2)}%`
    },
    {
      gate: 'G3',
      pass:
        five.lots >= lotsFloor &&
        five.lotYears >= yearsFloor &&
        assessment.members_.every((member) => member.marginal > 0),
      detail: `${five.lots} lots in ${five.lotYears} years; marginals ${assessment.members_.map((member) => `${member.symbol} ${fmt(member.marginal)}`).join(', ')}`
    },
    {
      gate: 'G4',
      pass:
        assessment.confirmA10.p50 > 0 &&
        assessment.confirmA10.p50 >= study.gates.costRetention * assessment.confirmA.p50 &&
        [0, 2, 10].every((costBps) => assessment.centre[costBps]!.net > 0),
      detail: `P50@10 ${fmt(assessment.confirmA10.p50)} vs P50@5 ${fmt(assessment.confirmA.p50)}; centre ${[0, 2, 10].map((c) => fmt(assessment.centre[c]!.net)).join('/')}`
    },
    {
      gate: 'G5',
      pass: assessment.confirmA.q25 >= 0 && five.net - five.top2 > 0 && five.net - bestRegime > 0,
      detail: `Q25 ${fmt(assessment.confirmA.q25)}; net − top2 ${fmt(five.net - five.top2)}; net − best regime ${fmt(five.net - bestRegime)}`
    }
  ];

  if (!fold) {
    const versus = assessment.versus!;

    gates.push({
      gate: 'G6',
      pass: (['B4', 'B5'] as const).every(
        (key) => versus[key].estimate >= M && versus[key].lower > 0 && versus[key].scoreDifference >= 0
      ),
      detail: (['B4', 'B5'] as const)
        .map(
          (key) =>
            `${key}: ΔP50 ${fmt(versus[key].estimate)} [${fmt(versus[key].lower)}, ${fmt(versus[key].upper)}], ΔS ${fmt(versus[key].scoreDifference)}`
        )
        .join('; ')
    });
    gates.push({
      gate: 'G7',
      pass: portfolio.endEquity >= assessment.ladder!.matchedEndEquity,
      detail: `end equity ${fmt(portfolio.endEquity)} vs B5 ladder ${fmt(assessment.ladder!.matchedEndEquity)}${assessment.ladder!.extrapolated ? ' (extrapolated)' : ''}`
    });
  }

  gates.push({
    gate: 'G8',
    pass: assessment.maxTieChange <= M,
    detail: `max tie-order change ${fmt(assessment.maxTieChange)}; boundary coordinates ${assessment.boundary} of ${8 * assessment.members.length}`
  });

  return gates;
};

// The Q arm's gates in their centre analogue (fold rounds).
export const centreGatesOf = (
  assessment: Assessment,
  universe: readonly string[],
  centreMarginals: Record<string, number>
): GateResult[] => {
  const five = assessment.centre[study.principalCostBps]!;
  const ten = assessment.centre[10]!;
  const portfolio = assessment.portfolio[`${study.principalCostBps}-symmetric`]!;
  const bestRegime = Math.max(0, ...five.regimes);
  const M = materialityOf(assessment);

  return [
    {
      gate: 'G1',
      pass:
        assessment.parity.every((row) => row.differences === 0) &&
        assessment.identityEqual &&
        assessment.members.every((symbol) => universe.includes(symbol)),
      detail: ''
    },
    {
      gate: 'G2',
      pass:
        five.minuteDrawdown <= study.drawdownCeiling &&
        ten.minuteDrawdown <= study.drawdownCeiling &&
        portfolio.dailyPercent <= study.portfolioDailyCeiling,
      detail: ''
    },
    {
      gate: 'G3',
      pass:
        five.lots >= study.gates.foldPoolLots &&
        five.lotYears >= study.gates.foldPoolYears &&
        Object.values(centreMarginals).every((value) => value > 0),
      detail: Object.entries(centreMarginals)
        .map(([symbol, value]) => `${symbol} ${fmt(value)}`)
        .join(', ')
    },
    {
      gate: 'G4',
      pass:
        ten.net > 0 &&
        ten.net >= study.gates.costRetention * five.net &&
        [0, 2].every((c) => assessment.centre[c]!.net > 0),
      detail: ''
    },
    { gate: 'G5', pass: five.net - five.top2 > 0 && five.net - bestRegime > 0, detail: '' },
    { gate: 'G8', pass: assessment.maxTieChange <= M, detail: '' }
  ];
};

export interface Ranked {
  assessment: Assessment;
  gates: GateResult[];
  pass: boolean;
  value: number;
}

export const rankPassing = (rows: Ranked[]) => {
  const passing = rows.filter((row) => row.pass);
  const order: Ranked[] = [];
  const remaining = [...passing];

  while (remaining.length > 0) {
    const top = Math.max(...remaining.map((row) => row.value));
    const margin = materialityOf(remaining.find((row) => row.value === top)!.assessment) / 2;
    const near = remaining.filter((row) => row.value >= top - margin);

    near.sort(
      (a, b) =>
        a.assessment.members.length - b.assessment.members.length ||
        (a.assessment.provenance === 'unseeded' ? 0 : 1) - (b.assessment.provenance === 'unseeded' ? 0 : 1) ||
        (a.assessment.key < b.assessment.key ? -1 : 1)
    );
    order.push(near[0]!);
    remaining.splice(remaining.indexOf(near[0]!), 1);
  }

  return order;
};

// The Q arm's ranking (§6.4): Q descending, then the centre drawdown ascending, then the key.
export const rankQ = (rows: Ranked[]) =>
  rows
    .filter((row) => row.pass)
    .sort(
      (a, b) =>
        b.value - a.value ||
        a.assessment.centre[study.principalCostBps]!.minuteDrawdown -
          b.assessment.centre[study.principalCostBps]!.minuteDrawdown ||
        (a.assessment.key < b.assessment.key ? -1 : 1)
    );

// §14 nominations: primary (not capacity-limited, not box-constrained), alternate 1 (Jaccard ≥ 0.5 from the primary),
// alternate 2 (≤ 3 books, Jaccard ≥ 0.5 from both; or only the distance when a compact nominee exists).
export const nominate = (order: Ranked[], fold = false) => {
  // A fold's primary is simply the top passing finalist (§13.2); the final round's may not be capacity-limited or
  // box-constrained (§14).
  const primaryEligible = (row: Ranked) =>
    fold || (!row.assessment.labels.includes('capacity-limited') && !row.assessment.labels.includes('box-constrained'));
  const primary = order.find(primaryEligible);
  const nominees: { role: string; row: Ranked; note?: string }[] = [];

  if (primary) {
    nominees.push({ role: 'primary', row: primary });
  }

  const far = (row: Ranked) =>
    nominees.every(
      (nominee) =>
        jaccardDistance(row.assessment.members, nominee.row.assessment.members) >= study.gates.nominationJaccard
    );
  const alt1 = order.find((row) => !nominees.some((nominee) => nominee.row === row) && far(row));

  if (alt1) {
    nominees.push({ role: 'alternate 1', row: alt1 });
  }

  const compactExists = nominees.some((nominee) => nominee.row.assessment.members.length <= study.gates.compactNominee);
  const alt2 = order.find(
    (row) =>
      !nominees.some((nominee) => nominee.row === row) &&
      far(row) &&
      (compactExists || row.assessment.members.length <= study.gates.compactNominee)
  );

  if (alt2) {
    nominees.push({ role: 'alternate 2', row: alt2 });
  }

  // §14: without a primary-eligible finalist the alternates are labelled (amendment 2).
  return nominees.map((nominee) => (primary ? nominee : { ...nominee, note: 'no primary-eligible finalist' }));
};

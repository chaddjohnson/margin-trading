// Study B Track 2 (PROTOCOL.md §6.3–§6.4).
//   track2      — 2a: staged coordinate optimization of the three books (randomized order, four runs, two rounds),
//                 then a joint 24-parameter step; search door (≤ 2021-12-31) only.
//   b-validate  — 2b: the frozen candidate set (Track 1 + Track 2a + DEV-Pareto extras), its validation evidence
//                 (validation door, ≤ 2023-12-29), the gates PG1–PG7, the robust score and the roles.
import { operatorSpace } from '../multi-etf-d1/space.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import {
  execution,
  frozenGrids,
  neighbourhood,
  resultFile,
  restrictedUniverse,
  seedOf,
  stresses,
  studyB
} from './context.ts';
import { assertUniverse, openDoor } from './data.ts';
import { type Books, Evaluator, orderedSymbols, round, settingsWith } from './engine.ts';
import {
  type Grid,
  describe,
  genomeOfGrid,
  gridKey,
  gridOfGenome,
  jointDistance,
  jointGenomeOf,
  jointGridsOf,
  jointNeighbourhoodOf,
  median,
  neighbourhoodOf,
  operatorSpaceFor,
  probesOf,
  sobolGrids,
  vectorId
} from './grid.ts';
import { log, nowIso, readSealed, writeJsonl, writeSealed } from './records.ts';
import { type Candidate, type SearchSummary, runNsga2 } from './search.ts';
import { metricsDigest, summarize } from './studyA.ts';

const symbols = [...restrictedUniverse]; // VGT, KRE, GDX: the joint genome's book order

export const configKey = (books: Books) =>
  orderedSymbols(books)
    .map((symbol) => `${symbol}:${gridKey(books[symbol]!)}`)
    .join(' ');

interface PoolRecord {
  key: string;
  books: Books;
  net: number;
  dd: number;
  lots: Record<string, number>;
  origin: string;
}

class PoolScorer {
  readonly ev: Evaluator;
  readonly seen = new Map<string, PoolRecord>();
  evaluations = 0;

  constructor(ev: Evaluator) {
    this.ev = ev;
  }

  score(books: Books, origin: string): PoolRecord {
    const key = configKey(books);
    const cached = this.seen.get(key);

    if (cached) {
      return cached;
    }

    assertUniverse(orderedSymbols(books));

    const m = this.ev.metrics(books);
    const record: PoolRecord = {
      key,
      books,
      net: m.net,
      dd: m.minuteDrawdown,
      lots: Object.fromEntries(Object.entries(m.bySymbol).map(([symbol, value]) => [symbol, value.lots])),
      origin
    };

    this.evaluations++;
    this.seen.set(key, record);

    return record;
  }
}

const feasible = (record: PoolRecord) => record.dd <= execution.drawdownCeiling;

const candidateOf = (record: PoolRecord, genome: number[], id: string): Candidate<PoolRecord> => ({
  id,
  genome,
  objectives: [-record.net, record.dd],
  violation: Math.max(0, record.dd - execution.drawdownCeiling) / execution.drawdownCeiling,
  origin: record.origin,
  payload: record
});

// The step acceptance rule (§6.3): the first archive configuration (by pool net, ≥ incumbent + $5,000, feasible) whose
// probes are ≥ 75% feasible with a median pool net ≥ the incumbent's.
const accept = (
  scorer: PoolScorer,
  archive: PoolRecord[],
  incumbentNet: number,
  probesFor: (books: Books) => Books[]
) => {
  const { step, probeFeasibleShare } = studyB.track2;
  const ordered = archive
    .filter((record) => feasible(record) && record.net >= incumbentNet + step.minGain)
    .sort((a, b) => b.net - a.net || (a.key < b.key ? -1 : 1));
  const checks = [];

  for (const record of ordered.slice(0, step.maxChecks)) {
    const probes = probesFor(record.books).map((books) => scorer.score(books, 'probe'));
    const share = probes.filter(feasible).length / Math.max(1, probes.length);
    const probeMedian = median(probes.map((probe) => probe.net));
    const passes = share >= probeFeasibleShare && probeMedian >= incumbentNet;

    checks.push({ key: record.key, net: record.net, dd: record.dd, probes: probes.length, share, probeMedian, passes });

    if (passes) {
      return { accepted: record, checks };
    }
  }

  return { accepted: undefined, checks };
};

const bookProbes = (books: Books, symbol: string) =>
  probesOf(books[symbol]!).map((probe) => ({ ...books, [symbol]: probe.grid }));

const jointProbes = (books: Books) => orderedSymbols(books).flatMap((symbol) => bookProbes(books, symbol));

const orderFor = (run: string, firstsTaken: string[]) => {
  const rng = new Rng(deriveSeed(...seedOf('B2', run, 'order')));

  for (let attempt = 0; attempt < 100; attempt++) {
    const order = [...symbols];

    for (let i = order.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);

      [order[i], order[j]] = [order[j]!, order[i]!];
    }

    if (!firstsTaken.includes(order[0]!)) {
      return order;
    }
  }

  throw new Error(`no admissible order for ${run}`);
};

export const runTrack2 = async () => {
  const started = Date.now();
  const track1 = await readSealed<{ configurations: { key: string; books: Books }[] }>(
    resultFile('track1', 'main', 'track1.json')
  );
  const door = await openDoor('search', symbols, 'Track 2a staged/joint optimization');
  const ev = new Evaluator(door);
  const scorer = new PoolScorer(ev);
  const c3: Books = { VGT: frozenGrids.VGT, KRE: frozenGrids.KRE, GDX: frozenGrids.GDX };
  const t1 = (key: string) => track1.configurations.find((configuration) => configuration.key === key)?.books;
  const runsOut: Record<string, any>[] = [];
  const firsts: string[] = [];
  const { track2 } = studyB;

  for (const runSpec of track2.runs) {
    const startBooks = runSpec.start === 'C3' ? c3 : (t1('T1-P') ?? t1('T1-S'));

    if (!startBooks) {
      runsOut.push({ run: runSpec.key, start: runSpec.start, skipped: 'Track 1 selected no vector' });
      continue;
    }

    const order = orderFor(runSpec.key, runSpec.start === 'C3' ? firsts : []);

    if (runSpec.start === 'C3') {
      firsts.push(order[0]!);
    }

    let incumbent = scorer.score({ ...startBooks }, `start:${runSpec.start}`);
    const steps = [];
    let stepIndex = 0;

    for (let roundIndex = 1; roundIndex <= track2.rounds; roundIndex++) {
      for (const symbol of order) {
        stepIndex++;

        const fixed = incumbent.books;
        const archive = new Map<string, Candidate<PoolRecord>>();
        const initialGrids = [
          fixed[symbol]!,
          ...probesOf(fixed[symbol]!).map((probe) => probe.grid),
          ...sobolGrids(track2.step.sobol, 'B2', runSpec.key, stepIndex, 'sobol').grids
        ];
        const initial: Candidate<PoolRecord>[] = [];

        for (const grid of initialGrids) {
          const id = vectorId(grid);

          if (!archive.has(id)) {
            const candidate = candidateOf(
              scorer.score({ ...fixed, [symbol]: grid }, 'step-initial'),
              genomeOfGrid(grid),
              id
            );

            archive.set(id, candidate);
            initial.push(candidate);
          }
        }

        const summary = runNsga2(
          {
            populationSize: track2.step.populationSize,
            maxNewVectors: track2.step.maxNewVectors,
            maxGenerations: track2.step.maxGenerations,
            patience: track2.step.patience,
            tolerance: track2.tolerance,
            seedDiversity: track2.seedDiversity,
            variation: track2.variation,
            reference: [0, execution.drawdownCeiling],
            seed: deriveSeed(...seedOf('B2', runSpec.key, stepIndex, 'nsga2')),
            space: operatorSpace,
            label: `ga:B2:${runSpec.key}:${stepIndex}:${symbol}`
          },
          initial,
          archive,
          (genome) => vectorId(gridOfGenome(genome)),
          (genome, id, origin) =>
            candidateOf(scorer.score({ ...fixed, [symbol]: gridOfGenome(genome) }, origin), genome, id)
        );
        const decision = accept(
          scorer,
          [...archive.values()].map((candidate) => candidate.payload),
          incumbent.net,
          (books) => bookProbes(books, symbol)
        );

        steps.push({
          step: stepIndex,
          round: roundIndex,
          book: symbol,
          incumbent: { net: incumbent.net, dd: incumbent.dd, grid: fixed[symbol], short: describe(fixed[symbol]!) },
          accepted: decision.accepted
            ? {
                net: decision.accepted.net,
                dd: decision.accepted.dd,
                grid: decision.accepted.books[symbol],
                short: describe(decision.accepted.books[symbol]!)
              }
            : null,
          checks: decision.checks,
          summary,
          archiveSize: archive.size
        });

        if (decision.accepted) {
          incumbent = decision.accepted;
        }

        log(
          `B2 ${runSpec.key} step ${stepIndex} ${symbol}: ${decision.accepted ? `accepted ${round(incumbent.net, 0)} dd ${round(incumbent.dd, 0)} ${describe(incumbent.books[symbol]!)}` : 'kept'} (${summary.newVectors} new, ${summary.stopReason})`
        );
      }
    }

    const coordinate = incumbent;

    // The joint step over all 24 parameters.
    const jointSpace = operatorSpaceFor(symbols.length);
    const jointArchive = new Map<string, Candidate<PoolRecord>>();
    const jointIdOf = (genome: number[]) => configKey(jointGridsOf(genome, symbols));
    const jointInitial: Candidate<PoolRecord>[] = [];

    for (const books of [coordinate.books, ...jointProbes(coordinate.books)]) {
      const genome = jointGenomeOf(books, symbols);
      const id = jointIdOf(genome);

      if (!jointArchive.has(id)) {
        const candidate = candidateOf(scorer.score(books, 'joint-initial'), genome, id);

        jointArchive.set(id, candidate);
        jointInitial.push(candidate);
      }
    }

    const jointSummary: SearchSummary = runNsga2(
      {
        populationSize: track2.joint.populationSize,
        maxNewVectors: track2.joint.maxNewVectors,
        maxGenerations: track2.joint.maxGenerations,
        patience: track2.joint.patience,
        tolerance: track2.tolerance,
        seedDiversity: track2.seedDiversity,
        variation: track2.variation,
        reference: [0, execution.drawdownCeiling],
        seed: deriveSeed(...seedOf('B2', runSpec.key, 'joint', 'nsga2')),
        space: jointSpace,
        label: `ga:B2:${runSpec.key}:joint`
      },
      jointInitial,
      jointArchive,
      jointIdOf,
      (genome, id, origin) => candidateOf(scorer.score(jointGridsOf(genome, symbols), origin), genome, id)
    );
    const jointDecision = accept(
      scorer,
      [...jointArchive.values()].map((candidate) => candidate.payload),
      coordinate.net,
      jointProbes
    );
    const joint = jointDecision.accepted ?? coordinate;

    log(
      `B2 ${runSpec.key} joint: ${jointDecision.accepted ? `accepted ${round(joint.net, 0)} dd ${round(joint.dd, 0)}` : 'kept the coordinate result'} (${jointSummary.newVectors} new, ${jointSummary.stopReason})`
    );
    runsOut.push({
      run: runSpec.key,
      start: runSpec.start,
      order,
      steps,
      coordinate: { key: coordinate.key, books: coordinate.books, net: coordinate.net, dd: coordinate.dd },
      joint: {
        key: joint.key,
        books: joint.books,
        net: joint.net,
        dd: joint.dd,
        accepted: Boolean(jointDecision.accepted),
        checks: jointDecision.checks,
        summary: jointSummary
      }
    });
  }

  const archiveRows = [...scorer.seen.values()].map((record) => ({
    key: record.key,
    books: record.books,
    net: record.net,
    dd: record.dd,
    lots: record.lots,
    origin: record.origin
  }));
  const archiveFile = await writeJsonl(resultFile('track2', 'archive.jsonl'), archiveRows);
  const record = await writeSealed(resultFile('track2', 'track2.json'), {
    stage: 'track2a',
    at: nowIso(),
    door: door.key,
    window: { first: door.dates[0], last: door.dates[door.lastIndex] },
    settings: studyB.track2,
    runs: runsOut,
    pathDependence: runsOut.flatMap((a, i) =>
      runsOut.slice(i + 1).flatMap((b) =>
        'joint' in a && 'joint' in b && a.joint && b.joint
          ? [
              {
                a: a.run,
                b: b.run,
                coordinateDistance: jointDistance(a.coordinate.books, b.coordinate.books),
                jointDistance: jointDistance(a.joint.books, b.joint.books)
              }
            ]
          : []
      )
    ),
    evaluations: scorer.evaluations,
    archive: archiveFile,
    traces: ev.traces,
    seconds: (Date.now() - started) / 1000
  });

  log(`Track 2a: ${scorer.evaluations} pool evaluations; ${record.file} ${record.bodyHash.slice(0, 12)}`);
};

// ----- 2b -----

interface CandidateSpec {
  key: string;
  books: Books;
  source: string;
  control: boolean;
}

export const runCandidatesB = async () => {
  const track1 = await readSealed<{ configurations: { key: string; books: Books; status: string }[] }>(
    resultFile('track1', 'main', 'track1.json')
  );
  const track2 = await readSealed<{
    runs: { run: string; coordinate?: { books: Books }; joint?: { books: Books } }[];
  }>(resultFile('track2', 'track2.json'));
  const list: CandidateSpec[] = [];
  const add = (key: string, books: Books, source: string) => {
    if (!list.some((item) => configKey(item.books) === configKey(books))) {
      list.push({ key, books, source, control: false });
    }
  };

  for (const configuration of track1.configurations) {
    add(configuration.key, configuration.books, `Track 1 (${configuration.status})`);
  }

  for (const run of track2.runs) {
    if (run.coordinate) {
      add(`T2-${run.run}-coord`, run.coordinate.books, `Track 2a ${run.run} coordinate result`);
    }

    if (run.joint) {
      add(`T2-${run.run}-joint`, run.joint.books, `Track 2a ${run.run} joint result`);
    }
  }

  // Up to 8 DEV-Pareto extras from the Track 2a archive (§6.4).
  const fs = await import('fs-extra');
  const rows = (await fs.default.readFile(resultFile('track2', 'archive.jsonl'), 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { key: string; books: Books; net: number; dd: number });
  const front = rows
    .filter((row) => row.dd < execution.drawdownCeiling)
    .filter(
      (row) =>
        !rows.some((other) => other.net >= row.net && other.dd <= row.dd && (other.net > row.net || other.dd < row.dd))
    )
    .sort((a, b) => b.net - a.net || (a.key < b.key ? -1 : 1));
  let extras = 0;

  for (const row of front) {
    if (extras >= studyB.candidates.paretoExtra) {
      break;
    }

    if (list.every((item) => jointDistance(item.books, row.books) >= studyB.candidates.paretoDistance)) {
      add(
        `T2-pareto-${extras + 1}`,
        row.books,
        `Track 2a DEV-Pareto archive (net ${round(row.net, 0)}, dd ${round(row.dd, 0)})`
      );
      extras++;
    }
  }

  return writeSealed(resultFile('studyB', 'candidates.json'), {
    stage: 'studyB-candidates',
    at: nowIso(),
    note: 'frozen before the validation door opens for Study B',
    candidates: list.map((item) => ({
      ...item,
      short: Object.fromEntries(Object.entries(item.books).map(([symbol, grid]) => [symbol, describe(grid)]))
    })),
    paretoFrontSize: front.length
  });
};

export const runValidateB = async () => {
  const started = Date.now();
  const { candidates } = await readSealed<{ candidates: CandidateSpec[] }>(resultFile('studyB', 'candidates.json'));
  const door = await openDoor('validation', symbols, 'Study B Track 2b validation evidence');
  const ev = new Evaluator(door);
  const c5Door = await openDoor('validation', ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'], 'Study B control C5 (DEV/VAL)');
  const c5Ev = new Evaluator(c5Door);
  const c5 = c5Ev.metrics({ ...frozenGrids });
  const years = ev.yearsOf;
  const yDev = years.DEV!;
  const yVal = years.VAL!;
  const centres: CandidateSpec[] = [
    ...candidates,
    {
      key: 'C3',
      books: { VGT: frozenGrids.VGT, KRE: frozenGrids.KRE, GDX: frozenGrids.GDX },
      source: 'control',
      control: true
    },
    { key: 'C2', books: { VGT: frozenGrids.VGT, KRE: frozenGrids.KRE }, source: 'control', control: true },
    { key: 'C1', books: { VGT: frozenGrids.VGT }, source: 'control', control: true }
  ];
  const pointOf = (books: Books) => {
    const m = ev.metrics(books);

    return { dev: m.periods.DEV ?? NaN, val: m.periods.VAL ?? NaN, dd: m.minuteDrawdown, net: m.net };
  };
  const evidence = centres.map((centre) => {
    const books = centre.books;
    const memberSymbols = orderedSymbols(books);
    const base = ev.metrics(books);

    for (const symbol of Object.keys(base.bySymbol)) {
      assertUniverse([symbol]);
    }

    const centrePoint = { dev: base.periods.DEV!, val: base.periods.VAL! };
    const costs = Object.fromEntries(
      [0, 2, 10].map((costBps) => {
        const m = ev.metrics(books, settingsWith({ costBps }));

        return [costBps, { net: m.net, dd: m.minuteDrawdown, dev: m.periods.DEV, val: m.periods.VAL }];
      })
    );
    const stress = Object.fromEntries(
      stresses.map(({ key, ...overrides }) => {
        const m = ev.metrics(books, settingsWith(overrides));

        return [key, { net: m.net, dd: m.minuteDrawdown, dev: m.periods.DEV, val: m.periods.VAL }];
      })
    );
    const isolated = ev.metrics(books, settingsWith({ startDate: '2022-01-01' }));
    const joint = jointNeighbourhoodOf(books, memberSymbols, neighbourhood.joint, 1, 'B', centre.key).map(pointOf);
    const perBook = Object.fromEntries(
      memberSymbols.map((symbol) => [
        symbol,
        summarize(
          neighbourhoodOf(books[symbol]!, neighbourhood.perBook, 1, 'B', centre.key, symbol).map((grid) =>
            pointOf({ ...books, [symbol]: grid })
          ),
          centrePoint
        )
      ])
    );
    const jointSummary = summarize(joint, centrePoint);
    const { gates: g } = studyB;
    const gates = {
      PG1: base.minuteDrawdown < execution.drawdownCeiling,
      PG2: jointSummary.ddP90 < g.neighbourP90Ceiling && jointSummary.share35 >= g.neighbourFeasibleShare,
      PG3: centrePoint.val > 0 && jointSummary.valMedian > 0,
      PG4:
        jointSummary.devMedian >= g.jointMedianShare * centrePoint.dev &&
        Object.values(perBook).every((summary) => summary.devMedian >= g.perBookMedianShare * centrePoint.dev),
      PG5: Object.values(stress).every((value) => value.net > 0 && value.dd < execution.drawdownCeiling),
      PG6: Math.max(0, base.bestLot) <= g.largestLotShare * base.net,
      PG7: Object.keys(base.bySymbol).every((symbol) => (restrictedUniverse as readonly string[]).includes(symbol))
    };
    const score = 0.5 * (jointSummary.devMedian / yDev) + 0.5 * (jointSummary.valMedian / yVal);
    const item = {
      key: centre.key,
      source: centre.source,
      control: centre.control,
      books,
      short: Object.fromEntries(Object.entries(books).map(([symbol, grid]) => [symbol, describe(grid as Grid)])),
      centre: { dev: centrePoint.dev, val: centrePoint.val, metrics: metricsDigest(base) },
      costs,
      stress,
      isolatedVal: {
        net: isolated.net,
        dd: isolated.minuteDrawdown,
        ddDaily: isolated.dailyDrawdown,
        lots: isolated.lots
      },
      jointSummary,
      perBook,
      jointPoints: joint,
      gates,
      passes: Object.values(gates).every(Boolean),
      score,
      scorePerDd: score / jointSummary.ddP90
    };

    log(
      `B ${centre.key}: dev ${round(centrePoint.dev, 0)} val ${round(centrePoint.val, 0)} dd ${round(base.minuteDrawdown, 0)} | joint med ${round(jointSummary.devMedian, 0)}/${round(jointSummary.valMedian, 0)} p90dd ${round(jointSummary.ddP90, 0)} share ${jointSummary.share35.toFixed(2)} | ${
        Object.entries(gates)
          .filter(([, ok]) => !ok)
          .map(([k]) => k)
          .join(',') || 'PASS'
      }`
    );

    return item;
  });
  const c3 = evidence.find((item) => item.key === 'C3')!;

  for (const item of evidence) {
    Object.assign(item, {
      beatsC3: item.score > c3.score && item.centre.val >= c3.centre.val,
      valVsC3: item.centre.val - c3.centre.val,
      valVsC5: item.centre.val - (c5.periods.VAL ?? NaN),
      devVsC3: item.centre.dev - c3.centre.dev
    });
  }

  const eligible = evidence.filter((item) => item.passes && !item.control);
  const sorted = (key: (item: (typeof evidence)[number]) => number, descending = true) =>
    [...eligible].sort((a, b) => (descending ? key(b) - key(a) : key(a) - key(b)) || (a.key < b.key ? -1 : 1));
  const picks: { role: string; key: string }[] = [];
  const robust = sorted((item) => item.score)[0];

  if (robust) {
    picks.push({ role: 'B-ROBUST', key: robust.key });

    const balanced = sorted((item) => item.scorePerDd).find((item) => item.key !== robust.key);

    if (balanced) {
      picks.push({ role: 'B-BALANCED', key: balanced.key });
    }

    const defensive = sorted((item) => item.jointSummary.ddP90, false).find(
      (item) =>
        item.score >= studyB.roles.defensiveScoreShare * robust.score && !picks.some((pick) => pick.key === item.key)
    );

    if (defensive) {
      picks.push({ role: 'B-DEFENSIVE', key: defensive.key });
    }
  }

  const record = await writeSealed(resultFile('studyB', 'validation.json'), {
    stage: 'studyB-validation',
    at: nowIso(),
    door: door.key,
    window: { first: door.dates[0], last: door.dates[door.lastIndex] },
    years: { dev: yDev, val: yVal },
    rules: { gates: studyB.gates, roles: studyB.roles, neighbourhood, stresses },
    c5: metricsDigest(c5),
    evidence,
    picks,
    traces: ev.traces,
    seconds: (Date.now() - started) / 1000
  });

  log(`Study B: picks ${JSON.stringify(picks)}; ${record.file} ${record.bodyHash.slice(0, 12)}`);
};

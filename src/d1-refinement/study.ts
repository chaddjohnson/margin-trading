// The study stages: grid sweeps (A1, Track B thresholds, Track C grids), local space-filling + coordinate-wise
// refinement (A2 and the local refinements of Tracks B and C), chronological walk-forward of the selection rule,
// neighbourhood probes and leave-one-recovery-out. Results go under research/vgt-d1-refinement/results/.
import path from 'node:path';
import fs from 'fs-extra';
import { deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import {
  type Data,
  type FitKey,
  formatDollars,
  formatSignedDollars,
  fullSpec,
  option,
  protocol,
  stageDir,
  trainingSpec,
  validationSpec,
  writeJson,
  writeText
} from './context.ts';
import { type EvalSpec, type Metrics, evaluateCandidate } from './evaluate.ts';
import {
  type Family,
  type IntParams,
  type ParamKey,
  candidateId,
  describeParams,
  d1Params,
  familyOf,
  formatValue,
  specs
} from './families.ts';
import { type Evaluator, LocalEvaluator, WorkerPool, makeCaches } from './pool.ts';
import { csvLine, diffTrades, metricsHeader, metricsRow } from './report.ts';

export const makeEvaluator = (args: string[]): Evaluator => {
  const workers = option(args, 'workers');

  return workers === '0' ? new LocalEvaluator() : new WorkerPool({ size: workers ? Number(workers) : undefined });
};

const canonical = (family: Family, params: IntParams) =>
  family.paramKeys.map((key) => `${key}=${params[key]}`).join(',');

const pctOf = (part: number, whole: number) => `${((100 * part) / whole).toFixed(0)}%`;

export interface Row {
  id: string;
  params: IntParams;
  metrics: Metrics;
  origin: string;
}

export const range = (from: number, to: number, step = 1) => {
  const values: number[] = [];

  for (let value = from; value <= to + 1e-9; value += step) {
    values.push(Math.round(value));
  }

  return values;
};

export const product = (lists: Partial<Record<ParamKey, number[]>>): IntParams[] => {
  let out: IntParams[] = [{}];

  for (const [key, values] of Object.entries(lists) as [ParamKey, number[]][]) {
    out = out.flatMap((partial) => values.map((value) => ({ ...partial, [key]: value })));
  }

  return out;
};

export const segmentOf = (metrics: Metrics, label: string) =>
  metrics.segments.find((segment) => segment.label === label);

// The columns every result CSV shares.
export const metricColumns = [
  'net',
  'minute_dd',
  'daily_dd',
  'net_over_dd',
  'entries',
  'wins',
  'losses',
  'worst_trade',
  'worst_streak',
  'worst_excursion',
  'interest',
  'exposure',
  'avg_hold_days',
  'dev_net',
  'reused_net',
  'r2018_19_net',
  'r2020_net',
  'r2021_net',
  'r2022_net',
  'r2022_losses',
  'r2023_net',
  'r2023_entries',
  'r2024_25_net',
  'stop_never_active',
  'signature'
];

export const metricValues = (metrics: Metrics) => [
  metrics.net,
  metrics.minuteDrawdown,
  metrics.dailyDrawdown,
  metrics.minuteDrawdown > 0 ? metrics.net / metrics.minuteDrawdown : NaN,
  metrics.entries,
  metrics.wins,
  metrics.losses,
  metrics.worstTrade,
  metrics.worstEpisodeLoss,
  metrics.worstAdverseExcursion,
  metrics.interest,
  metrics.exposure,
  metrics.averageHoldDays,
  segmentOf(metrics, 'development')?.net,
  segmentOf(metrics, 'reused')?.net,
  segmentOf(metrics, 'r2018_19')?.net,
  segmentOf(metrics, 'r2020')?.net,
  segmentOf(metrics, 'r2021')?.net,
  segmentOf(metrics, 'r2022')?.net,
  segmentOf(metrics, 'r2022')?.losses,
  segmentOf(metrics, 'r2023')?.net,
  segmentOf(metrics, 'r2023')?.entries,
  segmentOf(metrics, 'r2024_25')?.net,
  metrics.stopNeverActiveTrades,
  metrics.signature
];

export const writeRows = async (file: string, family: Family, rows: Row[], keys: ParamKey[] = family.paramKeys) => {
  const lines = [csvLine(['id', 'origin', ...keys, ...metricColumns])];

  for (const row of rows) {
    lines.push(csvLine([row.id, row.origin, ...keys.map((key) => row.params[key]), ...metricValues(row.metrics)]));
  }

  await fs.outputFile(file, `${lines.join('\n')}\n`);
};

export const evaluateRows = async (
  evaluator: Evaluator,
  datasetId: string,
  family: Family,
  spec: EvalSpec,
  paramsList: IntParams[],
  origin: string
): Promise<Row[]> => {
  const metricsList = await evaluator.evaluate(datasetId, family.key, spec, paramsList);

  return paramsList.map((params, index) => ({
    id: candidateId(family, params),
    params,
    metrics: metricsList[index]!,
    origin
  }));
};

export const feasible = (metrics: Metrics) =>
  metrics.minuteDrawdown <= protocol.drawdownCeiling && Number.isFinite(metrics.net);

// The non-dominated rows (maximize net, minimize minute drawdown) among feasible rows with distinct signatures.
export const paretoFront = (rows: Row[]) => {
  const bySignature = new Map<string, Row>();

  for (const row of rows) {
    if (!feasible(row.metrics)) {
      continue;
    }

    const existing = bySignature.get(row.metrics.signature);

    if (!existing) {
      bySignature.set(row.metrics.signature, row);
    }
  }

  const unique = [...bySignature.values()].sort(
    (a, b) => b.metrics.net - a.metrics.net || a.metrics.minuteDrawdown - b.metrics.minuteDrawdown
  );
  const front: Row[] = [];
  let bestDrawdown = Infinity;

  for (const row of unique) {
    if (row.metrics.minuteDrawdown < bestDrawdown) {
      front.push(row);
      bestDrawdown = row.metrics.minuteDrawdown;
    }
  }

  return front;
};

// Selection policies on a set of rows evaluated on one window.
export type Policy = 'maxNet' | 'balanced' | 'lowDd' | 'frequent';

export const policies: Policy[] = ['maxNet', 'balanced', 'lowDd', 'frequent'];

export const policyDescriptions: Record<Policy, string> = {
  maxNet: 'highest net among feasible candidates (minute DD ≤ $35,000)',
  balanced: "highest net with minute DD ≤ $20,000 (D1's drawdown band), else maxNet",
  lowDd: "lowest minute DD among candidates with net ≥ 80% of maxNet's",
  frequent: 'highest net among candidates with at least 1.5 × the reference entry count, else none'
};

export const select = (rows: Row[], policy: Policy, referenceEntries: number): Row | undefined => {
  const ok = rows.filter((row) => feasible(row.metrics));

  if (ok.length === 0) {
    return undefined;
  }

  const byNet = [...ok].sort(
    (a, b) => b.metrics.net - a.metrics.net || a.metrics.minuteDrawdown - b.metrics.minuteDrawdown
  );
  const maxNet = byNet[0]!;

  switch (policy) {
    case 'maxNet':
      return maxNet;
    case 'balanced':
      return byNet.find((row) => row.metrics.minuteDrawdown <= 20000) ?? maxNet;
    case 'lowDd': {
      const eligible = ok.filter((row) => row.metrics.net >= 0.8 * maxNet.metrics.net);

      return eligible.sort(
        (a, b) => a.metrics.minuteDrawdown - b.metrics.minuteDrawdown || b.metrics.net - a.metrics.net
      )[0];
    }
    case 'frequent':
      return byNet.find((row) => row.metrics.entries >= 1.5 * referenceEntries);
  }
};

// A scrambled-Sobol design on a local box (integer grid), deduplicated, with the anchor first.
export const sobolDesign = (
  family: Family,
  box: Partial<Record<ParamKey, [number, number]>>,
  anchor: IntParams,
  samples: number,
  seedLabel: string
) => {
  const keys = Object.keys(box) as ParamKey[];
  const sobol = new Sobol({
    dimensions: keys.length,
    scramble: { seed: deriveSeed('d1-refinement', 'sobol', seedLabel) }
  });
  const seen = new Set<string>();
  const design: IntParams[] = [];
  const push = (params: IntParams) => {
    const key = canonical(family, params);

    if (!seen.has(key)) {
      seen.add(key);
      design.push(params);
    }
  };
  let draws = 0;

  push({ ...anchor });

  while (design.length < samples + 1 && draws < samples * 4) {
    const point = sobol.next();
    const params = { ...anchor };

    keys.forEach((key, dimension) => {
      const [low, high] = box[key]!;

      params[key] = low + Math.floor(point[dimension]! * (high - low + 1));
    });
    draws++;
    push(params);
  }

  return { design, draws, keys };
};

// Coordinate-wise refinement from a start: for each free key, try every grid value inside the box, move to the
// best (by the scalar objective), repeat until no move improves. Deterministic.
export const coordinateRefine = async (
  evaluator: Evaluator,
  datasetId: string,
  family: Family,
  spec: EvalSpec,
  start: IntParams,
  box: Partial<Record<ParamKey, [number, number]>>,
  objective: (metrics: Metrics) => number,
  cache: Map<string, Row>,
  origin: string,
  maxRounds = 6
) => {
  const keys = Object.keys(box) as ParamKey[];
  let current = { ...start };
  let currentRow =
    cache.get(canonical(family, current)) ??
    (await evaluateRows(evaluator, datasetId, family, spec, [current], origin))[0]!;

  cache.set(canonical(family, current), currentRow);

  let rounds = 0;
  let evaluations = 0;

  for (; rounds < maxRounds; rounds++) {
    let improved = false;

    for (const key of keys) {
      const [low, high] = box[key]!;
      const candidates: IntParams[] = [];

      for (let value = low; value <= high; value++) {
        if (value !== current[key]) {
          candidates.push({ ...current, [key]: value });
        }
      }

      const fresh = candidates.filter((params) => !cache.has(canonical(family, params)));
      const rows = await evaluateRows(evaluator, datasetId, family, spec, fresh, origin);

      evaluations += rows.length;

      for (const row of rows) {
        cache.set(canonical(family, row.params), row);
      }

      const best = candidates
        .map((params) => cache.get(canonical(family, params))!)
        .filter((row) => feasible(row.metrics))
        .sort((a, b) => objective(b.metrics) - objective(a.metrics))[0];

      if (best && objective(best.metrics) > objective(currentRow.metrics) + 1e-9) {
        current = best.params;
        currentRow = best;
        improved = true;
      }
    }

    if (!improved) {
      break;
    }
  }

  return { row: currentRow, rounds, evaluations };
};

export const objectives: Record<Policy, (metrics: Metrics) => number> = {
  maxNet: (metrics) => metrics.net,
  // Net penalized by drawdown above $20,000 at two dollars per dollar.
  balanced: (metrics) => metrics.net - 2 * Math.max(0, metrics.minuteDrawdown - 20000),
  // Net per dollar of drawdown, scaled.
  lowDd: (metrics) => (metrics.minuteDrawdown > 0 ? (metrics.net / metrics.minuteDrawdown) * 10000 : metrics.net),
  frequent: (metrics) => metrics.net
};

// One-parameter neighbourhood probes of a candidate on a window: the share of probes within 20% of its net and
// under the ceiling, and the min/max net.
export const neighbourhood = async (
  evaluator: Evaluator,
  datasetId: string,
  family: Family,
  spec: EvalSpec,
  params: IntParams,
  keys: ParamKey[] = family.paramKeys
) => {
  const probes: IntParams[] = [];

  for (const key of keys) {
    const spec = specs[key];

    for (const offset of spec.probes) {
      const value = params[key]! + offset * spec.step;

      if (value >= spec.min && value <= spec.max) {
        probes.push({ ...params, [key]: value });
      }
    }
  }

  const rows = await evaluateRows(evaluator, datasetId, family, spec, probes, 'probe');
  const base = (await evaluateRows(evaluator, datasetId, family, spec, [params], 'anchor'))[0]!;
  const stable = rows.filter(
    (row) => feasible(row.metrics) && Math.abs(row.metrics.net - base.metrics.net) <= 0.2 * Math.abs(base.metrics.net)
  ).length;

  return {
    base,
    probes: rows,
    stability: rows.length > 0 ? stable / rows.length : 1,
    minNet: Math.min(...rows.map((row) => row.metrics.net)),
    maxNet: Math.max(...rows.map((row) => row.metrics.net)),
    maxDrawdown: Math.max(...rows.map((row) => row.metrics.minuteDrawdown)),
    distinctSignatures: new Set(rows.map((row) => row.metrics.signature)).size
  };
};

// ---------------------------------------------------------------------------------------------------------------
// A1: the continuation mechanism alone, Set 2's six parameters frozen at D1's values.
export const a1Sweep = async (data: Data, args: string[]) => {
  const { ds } = data;
  const evaluator = makeEvaluator(args);
  const family = familyOf('d1');
  const dir = stageDir('a1');
  const spec = fullSpec(ds);
  const started = Date.now();

  evaluator.register(ds);

  const grid = product({ pullback: range(60, 120), continuationWindow: range(30, 180) });
  const paramsList = grid.map((overrides) => d1Params(family, overrides));
  const rows = await evaluateRows(evaluator, ds.id, family, spec, paramsList, 'a1-grid');
  const d1Row = rows.find((row) => row.params.pullback === 90 && row.params.continuationWindow === 60)!;
  const d3Row = rows.find((row) => row.params.pullback === 70 && row.params.continuationWindow === 60)!;

  await writeRows(path.join(dir, 'a1_sweep.csv'), family, rows, ['pullback', 'continuationWindow']);

  // Analysis.
  const signatures = new Set(rows.map((row) => row.metrics.signature));
  const front = paretoFront(rows);
  const lines: string[] = [
    '# A1: continuation-only sweep (generated by `npm run d1-refinement -- a1-sweep`)',
    '',
    `Grid: P 6.0%–12.0% in 0.1-point steps (61 values) × W 30–180 sessions (151 values) = ${rows.length} evaluations on the full run, Set 2's six parameters frozen at D1's values. ${signatures.size} distinct trade signatures. ${((Date.now() - started) / 1000).toFixed(0)} s on ${evaluator.description}.`,
    '',
    '## 1. Controls',
    '',
    metricsHeader('Control'),
    metricsRow('D1 (P 9.0% W 60)', d1Row.metrics),
    metricsRow('D3 (P 7.0% W 60)', d3Row.metrics),
    '',
    '## 2. Net by P at W = 60 (every 0.1 point) and the W-dependence at P = 9.0%',
    '',
    '| P | Net | Minute DD | Entries | 2022 net (losses) | 2023 entries | Signature changes from the previous P |',
    '|---|---:|---:|---:|---:|---:|---|'
  ];

  let previous: Row | undefined;

  for (const row of rows
    .filter((row) => row.params.continuationWindow === 60)
    .sort((a, b) => a.params.pullback! - b.params.pullback!)) {
    const r2022 = segmentOf(row.metrics, 'r2022')!;
    const r2023 = segmentOf(row.metrics, 'r2023')!;

    lines.push(
      `| ${formatValue('pullback', row.params.pullback)} | ${formatDollars(row.metrics.net)} | ${formatDollars(row.metrics.minuteDrawdown)} | ${row.metrics.entries} | ${formatSignedDollars(r2022.net)} (${r2022.losses}) | ${r2023.entries} | ${previous && previous.metrics.signature !== row.metrics.signature ? 'yes' : ''} |`
    );
    previous = row;
  }

  lines.push(
    '',
    '| W | Net at P 9.0% | Minute DD | Entries | Net at P 7.0% | Minute DD | Entries | Net at P 8.5% | Minute DD | Entries |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  );

  const wValues = [30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120, 135, 150, 165, 180];

  for (const w of wValues) {
    const at = (p: number) => rows.find((row) => row.params.pullback === p && row.params.continuationWindow === w)!;

    lines.push(
      `| ${w} | ${formatDollars(at(90).metrics.net)} | ${formatDollars(at(90).metrics.minuteDrawdown)} | ${at(90).metrics.entries} | ${formatDollars(at(70).metrics.net)} | ${formatDollars(at(70).metrics.minuteDrawdown)} | ${at(70).metrics.entries} | ${formatDollars(at(85).metrics.net)} | ${formatDollars(at(85).metrics.minuteDrawdown)} | ${at(85).metrics.entries} |`
    );
  }

  // W plateaus: for each P, the W values at which the signature changes.
  lines.push(
    '',
    '## 3. Where W matters',
    '',
    'For each P, the W values at which the trade list changes (the signature boundaries); between boundaries every W gives identical trades.',
    '',
    '| P | Distinct signatures over W 30–180 | Boundaries (W at which trades change) |',
    '|---|---:|---|'
  );

  for (const p of range(60, 120, 5)) {
    const byW = rows
      .filter((row) => row.params.pullback === p)
      .sort((a, b) => a.params.continuationWindow! - b.params.continuationWindow!);
    const boundaries: number[] = [];

    for (let index = 1; index < byW.length; index++) {
      if (byW[index]!.metrics.signature !== byW[index - 1]!.metrics.signature) {
        boundaries.push(byW[index]!.params.continuationWindow!);
      }
    }

    lines.push(
      `| ${formatValue('pullback', p)} | ${new Set(byW.map((row) => row.metrics.signature)).size} | ${boundaries.join(', ') || 'none'} |`
    );
  }

  // Frontier.
  lines.push(
    '',
    '## 4. Feasible frontier (distinct trade lists, non-dominated on net vs minute DD)',
    '',
    metricsHeader('P / W', 'Other (P, W) with the same trades')
  );

  for (const row of front) {
    const same = rows.filter((other) => other.metrics.signature === row.metrics.signature);
    const ps = same.map((other) => other.params.pullback!);
    const ws = same.map((other) => other.params.continuationWindow!);

    lines.push(
      metricsRow(
        `${formatValue('pullback', row.params.pullback)} / ${row.params.continuationWindow}`,
        row.metrics,
        `${same.length} cells: P ${formatValue('pullback', Math.min(...ps))}–${formatValue('pullback', Math.max(...ps))}, W ${Math.min(...ws)}–${Math.max(...ws)}`
      )
    );
  }

  // Candidates by selection policy, plus 2023 participation.
  lines.push(
    '',
    '## 5. Picks by selection policy (full run, in-sample)',
    '',
    '| Policy | P / W | Net | Minute DD | Entries | 2022 net | 2023 entries / net |',
    '|---|---|---:|---:|---:|---:|---|'
  );

  for (const policy of policies) {
    const pick = select(rows, policy, d1Row.metrics.entries);

    if (pick) {
      lines.push(
        `| ${policy} | ${formatValue('pullback', pick.params.pullback)} / ${pick.params.continuationWindow} | ${formatDollars(pick.metrics.net)} | ${formatDollars(pick.metrics.minuteDrawdown)} | ${pick.metrics.entries} | ${formatSignedDollars(segmentOf(pick.metrics, 'r2022')!.net)} | ${segmentOf(pick.metrics, 'r2023')!.entries} / ${formatSignedDollars(segmentOf(pick.metrics, 'r2023')!.net)} |`
      );
    } else {
      lines.push(`| ${policy} | none | | | | | |`);
    }
  }

  const participating = paretoFront(rows.filter((row) => segmentOf(row.metrics, 'r2023')!.entries > 0));

  lines.push(
    '',
    'Best 2023-participating cells (frontier among cells with a 2023 entry):',
    '',
    metricsHeader('P / W', '2023 net')
  );

  for (const row of participating.slice(0, 6)) {
    lines.push(
      metricsRow(
        `${formatValue('pullback', row.params.pullback)} / ${row.params.continuationWindow}`,
        row.metrics,
        formatSignedDollars(segmentOf(row.metrics, 'r2023')!.net)
      )
    );
  }

  // Trade-list changes of the frontier cells against D1.
  const caches = makeCaches(ds);
  const d1Detail = evaluateCandidate(ds, caches, family, d1Row.params, spec, true).detail!;

  lines.push('', '## 6. Trade-list changes against D1 for the frontier cells', '');

  for (const row of front) {
    if (row.metrics.signature === d1Row.metrics.signature) {
      continue;
    }

    const detail = evaluateCandidate(ds, caches, family, row.params, spec, true).detail!;
    const diff = diffTrades(ds, d1Detail.trades, detail.trades);
    const profitOf = (trade: (typeof detail.trades)[number]) =>
      detail.accounting.outcomes[detail.trades.indexOf(trade)]!.profit;
    const d1ProfitOf = (trade: (typeof d1Detail.trades)[number]) =>
      d1Detail.accounting.outcomes[d1Detail.trades.indexOf(trade)]!.profit;

    lines.push(
      `- **P ${formatValue('pullback', row.params.pullback)} / W ${row.params.continuationWindow}** (${formatDollars(row.metrics.net)} / ${formatDollars(row.metrics.minuteDrawdown)}): preserved ${diff.preserved.length}, altered ${diff.altered.length}, gained ${diff.gained.length} (${diff.gained.map((trade) => `${diff.dates(trade)} ${formatSignedDollars(profitOf(trade))}`).join('; ') || 'none'}), lost ${diff.lost.length} (${diff.lost.map((trade) => `${diff.dates(trade)} ${formatSignedDollars(d1ProfitOf(trade))}`).join('; ') || 'none'})${diff.altered.length > 0 ? `; altered: ${diff.altered.map(({ reference, candidate }) => `${diff.dates(reference)} → exit ${candidate.exitIndex < 0 ? 'open' : ds.dates[candidate.exitIndex]}`).join('; ')}` : ''}.`
    );
  }

  await writeText(path.join(dir, 'a1_summary.md'), lines.join('\n'));
  await writeJson(
    path.join(dir, 'a1_front.json'),
    front.map((row) => ({
      id: row.id,
      params: row.params,
      net: row.metrics.net,
      minuteDrawdown: row.metrics.minuteDrawdown,
      entries: row.metrics.entries,
      signature: row.metrics.signature
    }))
  );
  console.info(lines.slice(0, 30).join('\n'));
  console.info(`...\nWritten to ${dir}`);
  await evaluator.close();
};

// ---------------------------------------------------------------------------------------------------------------
// A2: bounded local optimization of the six original parameters around a small A1 shortlist, with the selection
// rule walked forward on the chronological folds, then coordinate-wise refinement of the full-run picks.
export interface Anchor {
  key: string;
  label: string;
  overrides: IntParams;
}

export const a2Anchors: Anchor[] = [
  {
    key: 'd1',
    label: 'D1 (P 9.0% W 60, centre of the 8.5–9.4% plateau)',
    overrides: { pullback: 90, continuationWindow: 60 }
  },
  { key: 'p86', label: 'P 8.6% W 60 (low-DD end of the plateau)', overrides: { pullback: 86, continuationWindow: 60 } },
  { key: 'd3', label: 'D3 (P 7.0% W 60, 2023-participating)', overrides: { pullback: 70, continuationWindow: 60 } },
  {
    key: 'p92w69',
    label: 'P 9.2% W 69 (in-sample maxNet ridge, one 0.1-step wide)',
    overrides: { pullback: 92, continuationWindow: 69 }
  }
];

export const a2Box: Partial<Record<ParamKey, [number, number]>> = {
  targetPercentChange: [200, 250],
  trailingBuyPercentage: [2, 8],
  trailingStopPercentage: [65, 90],
  maximumHoldDays: [6, 16],
  tickWindowSize: [60, 104],
  intradayLossBuffer: [15, 40]
};

export const a2Samples = 4096;

export const minEntriesFor = (ds: Data['ds'], key: FitKey) => {
  const start = Date.parse(ds.dates[protocol.eligibilityIndex]!);
  const endIndex = Math.min(
    ds.sessionCount - 1,
    ds.dates.findLastIndex((date) => date <= protocol.fits.find((fit) => fit.key === key)!.trainEnd)
  );
  const years = ((Date.parse(ds.dates[endIndex]!) - start) / 86400000 + 1) / 365.25;

  return Math.ceil(years);
};

export const boundaryKeys = (params: IntParams, box: Partial<Record<ParamKey, [number, number]>>) =>
  (Object.keys(box) as ParamKey[]).filter((key) => params[key] === box[key]![0] || params[key] === box[key]![1]);

export interface WalkForwardRow {
  anchor: string;
  fold: FitKey;
  policy: Policy;
  pick: IntParams | undefined;
  trainingNet: number | undefined;
  trainingDrawdown: number | undefined;
  validationNet: number | undefined;
  validationDrawdown: number | undefined;
  validationEntries: number | undefined;
  anchorValidationNet: number;
  d1ValidationNet: number;
  d1ValidationDrawdown: number;
}

export const a2Local = async (data: Data, args: string[]) => {
  const { ds } = data;
  const evaluator = makeEvaluator(args);
  const family = familyOf('d1');
  const dir = stageDir('a2');
  const full = fullSpec(ds);
  const folds = protocol.fits.filter((fit) => fit.validation).map((fit) => fit.key) as FitKey[];
  const started = Date.now();
  const d1 = d1Params(family);
  const anchorsArg = option(args, 'anchors');
  const anchors = anchorsArg ? a2Anchors.filter((anchor) => anchorsArg.split(',').includes(anchor.key)) : a2Anchors;
  const samples = Number(option(args, 'samples') ?? a2Samples);
  const walkForward: WalkForwardRow[] = [];
  const summaryLines: string[] = [
    '# A2: bounded local optimization of the six original parameters (generated by `npm run d1-refinement -- a2-local`)',
    '',
    `Box (integer grid): ${(Object.keys(a2Box) as ParamKey[]).map((key) => `${specs[key].short} ${formatValue(key, a2Box[key]![0])}–${formatValue(key, a2Box[key]![1])}`).join(', ')}. Design: scrambled Sobol, ${samples} points plus the anchor, per anchor (seed from 'd1-refinement|sobol|a2-<anchor>'), evaluated on the full run and on the four training windows (through 2019, 2021, 2022, 2023). Selection policies: ${policies.map((policy) => `${policy} = ${policyDescriptions[policy]}`).join('; ')}. Feasibility: minute DD ≤ $35,000 and at least one entry per training year. Coordinate-wise refinement (every grid value of one parameter at a time, inside the box, until no move improves) from each full-run pick, in-sample.`,
    ''
  ];
  const d1Validation = new Map<FitKey, Metrics>();

  evaluator.register(ds);

  for (const fold of folds) {
    d1Validation.set(fold, (await evaluator.evaluate(ds.id, family.key, validationSpec(ds, fold), [d1]))[0]!);
  }

  const refinedAll: {
    anchor: Anchor;
    policy: Policy;
    start: Row;
    refined: Row;
    rounds: number;
    evaluations: number;
    neighbourhood: Awaited<ReturnType<typeof neighbourhood>>;
  }[] = [];
  const designRowsAll: { anchor: string; rows: Row[] }[] = [];

  for (const anchor of anchors) {
    const anchorParams = d1Params(family, anchor.overrides);
    const { design, draws } = sobolDesign(family, a2Box, anchorParams, samples, `a2-${anchor.key}`);
    const fullRows = await evaluateRows(evaluator, ds.id, family, full, design, `a2-${anchor.key}`);
    const anchorRow = fullRows[0]!;

    designRowsAll.push({ anchor: anchor.key, rows: fullRows });
    await writeRows(path.join(dir, `a2_${anchor.key}_full.csv`), family, fullRows);

    summaryLines.push(
      `## Anchor ${anchor.key}: ${anchor.label}`,
      '',
      `${design.length} unique points from ${draws} Sobol draws; ${fullRows.filter((row) => feasible(row.metrics)).length} feasible on the full run; ${new Set(fullRows.map((row) => row.metrics.signature)).size} distinct trade lists.`,
      ''
    );

    // Distribution of the full-run net around the anchor.
    const nets = fullRows.map((row) => row.metrics.net).sort((a, b) => a - b);
    const quantile = (q: number) => nets[Math.min(nets.length - 1, Math.floor(q * nets.length))]!;
    const better = fullRows.filter((row) => feasible(row.metrics) && row.metrics.net > anchorRow.metrics.net).length;
    const betterBoth = fullRows.filter(
      (row) => row.metrics.net > anchorRow.metrics.net && row.metrics.minuteDrawdown <= anchorRow.metrics.minuteDrawdown
    ).length;

    summaryLines.push(
      `Full-run net over the design: min ${formatDollars(nets[0]!)}, 10% ${formatDollars(quantile(0.1))}, median ${formatDollars(quantile(0.5))}, 90% ${formatDollars(quantile(0.9))}, max ${formatDollars(nets.at(-1)!)}; anchor ${formatDollars(anchorRow.metrics.net)} / ${formatDollars(anchorRow.metrics.minuteDrawdown)}. ${better} points (${pctOf(better, fullRows.length)}) beat the anchor's net within the ceiling; ${betterBoth} (${pctOf(betterBoth, fullRows.length)}) beat it on both net and drawdown.`,
      '',
      '### Full-run picks (in-sample) and their coordinate refinement',
      '',
      '| Policy | Pick | Net | Minute DD | Entries | 2022 net (losses) | 2023 e | Refined | Net | Minute DD | Entries | Rounds / evals | Box edges | Stability | Probe net range | Probe max DD |',
      '|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|---:|---|---:|'
    );

    const cache = new Map<string, Row>();

    for (const row of fullRows) {
      cache.set(canonical(family, row.params), row);
    }

    for (const policy of policies) {
      const pick = select(
        fullRows.filter((row) => row.metrics.entries >= minEntriesFor(ds, 'final')),
        policy,
        anchorRow.metrics.entries
      );

      if (!pick) {
        summaryLines.push(`| ${policy} | none | | | | | | | | | | | | | | |`);
        continue;
      }

      const refined = await coordinateRefine(
        evaluator,
        ds.id,
        family,
        full,
        pick.params,
        a2Box,
        objectives[policy],
        cache,
        `a2-${anchor.key}-refine-${policy}`
      );
      const hood = await neighbourhood(
        evaluator,
        ds.id,
        family,
        full,
        refined.row.params,
        Object.keys(a2Box) as ParamKey[]
      );

      refinedAll.push({
        anchor,
        policy,
        start: pick,
        refined: refined.row,
        rounds: refined.rounds,
        evaluations: refined.evaluations,
        neighbourhood: hood
      });
      summaryLines.push(
        `| ${policy} | ${describeParams(family, pick.params, Object.keys(a2Box) as ParamKey[])} | ${formatDollars(pick.metrics.net)} | ${formatDollars(pick.metrics.minuteDrawdown)} | ${pick.metrics.entries} | ${formatSignedDollars(segmentOf(pick.metrics, 'r2022')!.net)} (${segmentOf(pick.metrics, 'r2022')!.losses}) | ${segmentOf(pick.metrics, 'r2023')!.entries} | ${describeParams(family, refined.row.params, Object.keys(a2Box) as ParamKey[])} | ${formatDollars(refined.row.metrics.net)} | ${formatDollars(refined.row.metrics.minuteDrawdown)} | ${refined.row.metrics.entries} | ${refined.rounds} / ${refined.evaluations} | ${
          boundaryKeys(refined.row.params, a2Box)
            .map((key) => specs[key].short)
            .join(' ') || 'none'
        } | ${pctOf(hood.stability, 1)} | ${formatDollars(hood.minNet)}–${formatDollars(hood.maxNet)} | ${formatDollars(hood.maxDrawdown)} |`
      );
    }

    // Walk-forward of the selection rule.
    summaryLines.push(
      '',
      '### Walk-forward of the selection rule',
      '',
      'For each fold the design is evaluated on the training window only; the policy picks; the pick, the anchor and frozen D1 are then run through the validation window (continuous run from the eligibility session, attributed to the window).',
      '',
      '| Fold (train → validate) | Policy | Pick | Training net / DD | Validation net / DD / entries | Anchor validation net | D1 validation net / DD | Pick − D1 |',
      '|---|---|---|---:|---:|---:|---:|---:|'
    );

    for (const fold of folds) {
      const training = trainingSpec(ds, fold);
      const validation = validationSpec(ds, fold);
      const trainingRows = await evaluateRows(evaluator, ds.id, family, training, design, `a2-${anchor.key}-${fold}`);
      const minEntries = minEntriesFor(ds, fold);
      const anchorTraining = trainingRows[0]!;
      const anchorValidation = (await evaluator.evaluate(ds.id, family.key, validation, [anchorParams]))[0]!;
      const d1Val = d1Validation.get(fold)!;
      const fit = protocol.fits.find((candidate) => candidate.key === fold)!;

      await writeRows(path.join(dir, `a2_${anchor.key}_${fold}_training.csv`), family, trainingRows);

      for (const policy of policies) {
        const pick = select(
          trainingRows.filter((row) => row.metrics.entries >= minEntries),
          policy,
          anchorTraining.metrics.entries
        );
        const validated = pick
          ? (await evaluator.evaluate(ds.id, family.key, validation, [pick.params]))[0]!
          : undefined;

        walkForward.push({
          anchor: anchor.key,
          fold,
          policy,
          pick: pick?.params,
          trainingNet: pick?.metrics.net,
          trainingDrawdown: pick?.metrics.minuteDrawdown,
          validationNet: validated?.net,
          validationDrawdown: validated?.minuteDrawdown,
          validationEntries: validated?.entries,
          anchorValidationNet: anchorValidation.net,
          d1ValidationNet: d1Val.net,
          d1ValidationDrawdown: d1Val.minuteDrawdown
        });
        summaryLines.push(
          `| ${fold} (→ ${fit.trainEnd.slice(0, 4)} → ${fit.validation!.start.slice(0, 4)}–${fit.validation!.end.slice(0, 4)}) | ${policy} | ${pick ? describeParams(family, pick.params, Object.keys(a2Box) as ParamKey[]) : 'none'} | ${pick ? `${formatDollars(pick.metrics.net)} / ${formatDollars(pick.metrics.minuteDrawdown)}` : ''} | ${validated ? `${formatSignedDollars(validated.net)} / ${formatDollars(validated.minuteDrawdown)} / ${validated.entries}` : ''} | ${formatSignedDollars(anchorValidation.net)} | ${formatSignedDollars(d1Val.net)} / ${formatDollars(d1Val.minuteDrawdown)} | ${validated ? formatSignedDollars(validated.net - d1Val.net) : ''} |`
        );
      }
    }

    summaryLines.push('');
  }

  // Stitched walk-forward totals per anchor and policy.
  summaryLines.push(
    '## Stitched validation totals (sum over the four folds)',
    '',
    '| Anchor | Policy | Stitched pick net | Stitched D1 net | Folds where the pick beat D1 | Worst pick validation DD | Picks identical across folds |',
    '|---|---|---:|---:|---:|---:|---|'
  );

  for (const anchor of anchors) {
    for (const policy of policies) {
      const rows = walkForward.filter((row) => row.anchor === anchor.key && row.policy === policy);
      const made = rows.filter((row) => row.validationNet !== undefined);
      const stitched = made.reduce((total, row) => total + row.validationNet!, 0);
      const d1Total = rows.reduce((total, row) => total + row.d1ValidationNet, 0);
      const wins = made.filter((row) => row.validationNet! > row.d1ValidationNet).length;
      const picks = new Set(made.map((row) => canonical(family, row.pick!)));

      summaryLines.push(
        `| ${anchor.key} | ${policy} | ${made.length === rows.length ? formatSignedDollars(stitched) : `${formatSignedDollars(stitched)} (${made.length}/${rows.length} folds)`} | ${formatSignedDollars(d1Total)} | ${wins}/${rows.length} | ${made.length > 0 ? formatDollars(Math.max(...made.map((row) => row.validationDrawdown!))) : ''} | ${picks.size === 1 ? 'yes' : `${picks.size} different`} |`
      );
    }
  }

  summaryLines.push('', `Runtime ${((Date.now() - started) / 1000).toFixed(0)} s on ${evaluator.description}.`);

  await writeText(path.join(dir, 'a2_summary.md'), summaryLines.join('\n'));
  await writeJson(path.join(dir, 'a2_walkforward.json'), walkForward);
  await writeJson(
    path.join(dir, 'a2_refined.json'),
    refinedAll.map(({ anchor, policy, start, refined, rounds, evaluations, neighbourhood: hood }) => ({
      anchor: anchor.key,
      policy,
      start: { params: start.params, net: start.metrics.net, minuteDrawdown: start.metrics.minuteDrawdown },
      refined: {
        params: refined.params,
        net: refined.metrics.net,
        minuteDrawdown: refined.metrics.minuteDrawdown,
        entries: refined.metrics.entries,
        signature: refined.metrics.signature
      },
      rounds,
      evaluations,
      stability: hood.stability,
      probeNetRange: [hood.minNet, hood.maxNet],
      probeMaxDrawdown: hood.maxDrawdown
    }))
  );
  await writeJson(
    path.join(dir, 'a2_design_summary.json'),
    designRowsAll.map(({ anchor, rows }) => ({
      anchor,
      points: rows.length,
      feasible: rows.filter((row) => feasible(row.metrics)).length,
      signatures: new Set(rows.map((row) => row.metrics.signature)).size
    }))
  );
  console.info(summaryLines.join('\n'));
  console.info(`\nWritten to ${dir}`);
  await evaluator.close();
};

// The closing stages: the mechanism-only walk-forward (mechanism parameters chosen per fold on the sweep
// lattice with Set 2 frozen), the finalists (full-run metrics, trades, attribution, fill and interest
// sensitivities, neighbourhood stability, leave-one-recovery-out) and the Markdown tables for the reports.
import path from 'node:path';
import fs from 'fs-extra';
import { ReferenceHighCache } from '../four-family/data.ts';
import {
  type Data,
  type FitKey,
  exists,
  formatDollars,
  formatSignedDollars,
  fullSpec,
  protocol,
  readJson,
  stageDir,
  trainingSpec,
  validationSpec,
  writeJson
} from './context.ts';
import { type CandidateResult, runCandidate } from './diagnose.ts';
import { type Metrics, evaluateCandidate } from './evaluate.ts';
import {
  type IntParams,
  describeParams,
  families,
  set2Params,
  singleMechanismKeys,
  specs,
  trades2Params
} from './families.ts';
import { episodeAttribution, episodeMoves, metricsHeader, metricsRow, pct, tradeRows, tradeTable } from './report.ts';
import { type StageResult, type ValidationRow, makeEvaluator, neighbourhood, sweepGrids } from './study.ts';

const writeText = async (file: string, text: string) => {
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, text.endsWith('\n') ? text : `${text}\n`);
};

// Mechanism-only walk-forward: for each fold and mechanism, every sweep lattice point (Set 2 frozen) on the
// training window, the policies' picks, and those picks on the validation window.
export interface MechanismFoldRow {
  fit: FitKey;
  familyKey: string;
  policy: string;
  params: IntParams;
  training: { net: number; minuteDrawdown: number; entries: number };
  validation: { net: number; minuteDrawdown: number; entries: number; wins: number; losses: number };
}

export const mechanismWalkForward = async (data: Data, args: string[]) => {
  const { ds } = data;
  const evaluator = makeEvaluator(args);
  const highs = new ReferenceHighCache(ds);
  const grids = sweepGrids();
  const rows: MechanismFoldRow[] = [];
  const summary = (metrics: Metrics) => ({
    net: metrics.net,
    minuteDrawdown: metrics.minuteDrawdown,
    entries: metrics.entries
  });

  evaluator.register(ds);

  for (const fit of ['fold1', 'fold2', 'fold3'] as FitKey[]) {
    const training = trainingSpec(ds, fit);
    const validation = validationSpec(ds, fit);
    const set2Training = evaluateCandidate(ds, highs, 'base', set2Params(families.base!), training).metrics;
    const set2Validation = evaluateCandidate(ds, highs, 'base', set2Params(families.base!), validation).metrics;

    rows.push({
      fit,
      familyKey: 'set2',
      policy: 'frozen',
      params: set2Params(families.base!),
      training: summary(set2Training),
      validation: { ...summary(set2Validation), wins: set2Validation.wins, losses: set2Validation.losses }
    });

    for (const familyKey of singleMechanismKeys) {
      const family = families[familyKey]!;
      const paramsList = grids[familyKey]!.map((overrides) => set2Params(family, overrides));
      const metricsList = await evaluator.evaluate(ds.id, familyKey, training, paramsList);
      const scored = paramsList
        .map((params, index) => ({ params, metrics: metricsList[index]! }))
        .filter((row) => row.metrics.minuteDrawdown <= protocol.drawdownCeiling)
        .sort((a, b) => b.metrics.net - a.metrics.net || a.metrics.minuteDrawdown - b.metrics.minuteDrawdown);
      const maxNet = scored[0];
      const balanced = scored.find((row) => row.metrics.minuteDrawdown <= 25000);
      const lowDd = maxNet
        ? [...scored]
            .filter((row) => row.metrics.net >= 0.75 * maxNet.metrics.net)
            .sort((a, b) => a.metrics.minuteDrawdown - b.metrics.minuteDrawdown || b.metrics.net - a.metrics.net)[0]
        : undefined;
      // The ten highest-net distinct trade signatures, for the median.
      const top: typeof scored = [];
      const signatures = new Set<string>();

      for (const row of scored) {
        if (!signatures.has(row.metrics.signature)) {
          signatures.add(row.metrics.signature);
          top.push(row);
        }

        if (top.length === 10) {
          break;
        }
      }

      const picks: [string, (typeof scored)[number] | undefined][] = [
        ['maxNet', maxNet],
        ['balanced', balanced],
        ['lowDd', lowDd],
        ...top.map((row, index) => [`top${index + 1}`, row] as [string, (typeof scored)[number]])
      ];

      for (const [policy, pick] of picks) {
        if (!pick) {
          continue;
        }

        const validated = evaluateCandidate(ds, highs, familyKey, pick.params, validation).metrics;

        rows.push({
          fit,
          familyKey,
          policy,
          params: pick.params,
          training: summary(pick.metrics),
          validation: { ...summary(validated), wins: validated.wins, losses: validated.losses }
        });
      }

      console.info(`${fit} ${familyKey}: ${paramsList.length} lattice points on training, picks validated`);
    }
  }

  await writeJson(stageDir('validation', 'mechanism-rows.json'), rows);
  await evaluator.close();
  console.info(`Wrote ${rows.length} mechanism walk-forward rows`);
};

// The finalists: predeclared here after the sweeps and the search (in-sample selections, labelled as such).
export interface Finalist {
  id: string;
  label: string;
  familyKey: string;
  params: IntParams;
  origin: string;
  file?: string; // the runnable source
}

export const finalists = (): Finalist[] => {
  const base = families.base!;
  const list: Finalist[] = [
    {
      id: 'S2',
      label: 'Set 2 (reference)',
      familyKey: 'base',
      params: set2Params(base),
      origin: 'reference',
      file: 'src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts'
    },
    {
      id: 'T2',
      label: 'Trades2 (previous program)',
      familyKey: 'base',
      params: trades2Params(base),
      origin: 'reference',
      file: 'src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts'
    },
    {
      id: 'L365',
      label: 'Set 2 with L 365 (user control)',
      familyKey: 'base',
      params: set2Params(base, { tickWindowSize: 365 }),
      origin: 'control'
    },
    {
      id: 'X20L104',
      label: 'Set 2 with X 20.0% and L 104 (Trades2 entry settings)',
      familyKey: 'base',
      params: set2Params(base, { targetPercentChange: 200, tickWindowSize: 104 }),
      origin: 'control'
    }
  ];
  const add = (id: string, label: string, familyKey: string, overrides: IntParams, origin: string, file: string) =>
    list.push({ id, label, familyKey, params: set2Params(families[familyKey]!, overrides), origin, file });

  // D: post-exit continuation on frozen Set 2 (sweep).
  add(
    'D1',
    'Set 2 + post-exit continuation P 9.0% / W 60',
    'postExit',
    { pullback: 90, continuationWindow: 60 },
    'sweep (in-sample)',
    'src/app/allIn-trailingBuy-postExitContinuation.ts'
  );
  add(
    'D2',
    'Set 2 + post-exit continuation P 8.5% / W 60',
    'postExit',
    { pullback: 85, continuationWindow: 60 },
    'sweep (in-sample)',
    'src/app/allIn-trailingBuy-postExitContinuation.ts'
  );
  add(
    'D3',
    'Set 2 + post-exit continuation P 7.0% / W 60 (2023 participation)',
    'postExit',
    { pullback: 70, continuationWindow: 60 },
    'sweep (in-sample)',
    'src/app/allIn-trailingBuy-postExitContinuation.ts'
  );
  add(
    'D4',
    'Set 2 + post-exit continuation P 10.0% / W 60',
    'postExit',
    { pullback: 100, continuationWindow: 60 },
    'sweep (in-sample)',
    'src/app/allIn-trailingBuy-postExitContinuation.ts'
  );
  add(
    'D5',
    'Set 2 + post-exit continuation P 9.0% / W 120',
    'postExit',
    { pullback: 90, continuationWindow: 120 },
    'sweep (in-sample)',
    'src/app/allIn-trailingBuy-postExitContinuation.ts'
  );
  // B: trough recovery on frozen Set 2 (sweep).
  add(
    'B1',
    'Set 2 + trough recovery T 17.0%, reset 60% (any close), expiry 250',
    'trough',
    { troughRecovery: 170, episodeReset: 600 },
    'sweep (in-sample)',
    'src/app/allIn-trailingBuy-troughRecovery.ts'
  );
  add(
    'B2',
    'Set 2 + trough recovery T 17.0%, reset 50% (flat closes), expiry 250',
    'trough',
    { troughRecovery: 170, episodeReset: 500, resetPolicy: 1 },
    'sweep (in-sample)',
    'src/app/allIn-trailingBuy-troughRecovery.ts'
  );
  add(
    'B3',
    'Set 2 + trough recovery T 15.0%, reset 60% (any close), expiry 250',
    'trough',
    { troughRecovery: 150, episodeReset: 600 },
    'sweep neighbour',
    'src/app/allIn-trailingBuy-troughRecovery.ts'
  );
  add(
    'B4',
    'Set 2 + trough recovery T 10.0%, reset 60% (any close), expiry 250',
    'trough',
    { troughRecovery: 100, episodeReset: 600 },
    'sweep neighbour',
    'src/app/allIn-trailingBuy-troughRecovery.ts'
  );
  // A: anchored arming / latch on frozen Set 2 (sweep).
  add(
    'A1',
    'Set 2 + episode latch U 20.0%, reset 60% (any close), expiry 250',
    'latch',
    { latchDepth: 200, episodeReset: 600 },
    'sweep (in-sample)',
    'src/app/allIn-trailingBuy-episodeLatch.ts'
  );
  add(
    'A2',
    'Set 2 + episode latch U 21.6% (= X), reset 60% (any close), expiry 250',
    'latch',
    { latchDepth: 216, episodeReset: 600 },
    'predeclared A',
    'src/app/allIn-trailingBuy-episodeLatch.ts'
  );
  add(
    'A3',
    'Set 2 + episode latch U 21.6% (= X), reset 100%, expiry 250 (persistent reference)',
    'latch',
    { latchDepth: 216, episodeReset: 1000 },
    'predeclared A',
    'src/app/allIn-trailingBuy-episodeLatch.ts'
  );
  // C: dual mode (sweep best within the ceiling that differs from Set 2).
  add(
    'C1',
    'Set 2 + dual mode X2 15.0% / Y2 3.0%',
    'dual',
    { shallowDepth: 150, shallowRebound: 30 },
    'predeclared C',
    'src/app/allIn-trailingBuy-dualMode.ts'
  );
  // Combinations.
  add(
    'BD1',
    'Set 2 + trough T 17.0% (reset 60%) + post-exit P 9.0% / W 60',
    'troughPostExit',
    { troughRecovery: 170, episodeReset: 600, pullback: 90, continuationWindow: 60 },
    'composition of B1 and D1',
    'src/app/allIn-trailingBuy-troughRecovery-postExitContinuation.ts'
  );
  add(
    'BD2',
    'Set 2 + trough T 16.3% / F 2.0% (reset 72.6%, expiry 207) + post-exit P 8.7% / W 142 (joint final-fit maxNet)',
    'troughPostExit',
    {
      troughRecovery: 163,
      troughRetrace: 20,
      episodeReset: 726,
      episodeExpiry: 207,
      pullback: 87,
      continuationWindow: 142
    },
    'joint search, final fit (in-sample)',
    'src/app/allIn-trailingBuy-troughRecovery-postExitContinuation.ts'
  );

  return list;
};

// Joint-search picks of the final fit, as further (in-sample) finalists.
const finalFitPicks = async (): Promise<Finalist[]> => {
  const list: Finalist[] = [];
  const fileOf: Record<string, string | undefined> = {
    base: 'src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts',
    latch: 'src/app/allIn-trailingBuy-episodeLatch.ts',
    trough: 'src/app/allIn-trailingBuy-troughRecovery.ts',
    dual: 'src/app/allIn-trailingBuy-dualMode.ts',
    postExit: 'src/app/allIn-trailingBuy-postExitContinuation.ts',
    troughPostExit: 'src/app/allIn-trailingBuy-troughRecovery-postExitContinuation.ts',
    latchPostExit: undefined
  };

  for (const familyKey of Object.keys(families)) {
    const file = stageDir('search', 'final', familyKey, 'stage.json');

    if (!(await exists(file))) {
      continue;
    }

    const stage = await readJson<StageResult>(file);
    const seen = new Set<string>();

    for (const pick of stage.picks) {
      if (seen.has(pick.id)) {
        continue;
      }

      seen.add(pick.id);
      list.push({
        id: `J-${familyKey}-${pick.policy}`,
        label: `${familyKey} joint final-fit ${pick.policy}: ${describeParams(families[familyKey]!, pick.params)}`,
        familyKey,
        params: pick.params,
        origin: 'joint search, final fit (in-sample)',
        file: fileOf[familyKey]
      });
    }
  }

  return list;
};

export interface FinalistResult {
  finalist: Finalist;
  full: Metrics;
  nextOpen: Metrics;
  rate8: Metrics;
  rate14: Metrics;
  stability: number;
  probes: number;
  exclusion: { key: string; name: string; netWithout: number; episodeNet: number }[];
  attribution: ReturnType<typeof episodeAttribution>;
  trades: ReturnType<typeof tradeRows>;
}

export const evaluateFinalists = async (data: Data) => {
  const { ds } = data;
  const highs = new ReferenceHighCache(ds);
  const moves = episodeMoves(ds);
  const list = [...finalists(), ...(await finalFitPicks())];
  const results: FinalistResult[] = [];
  const sections: string[] = [];

  for (const finalist of list) {
    const result: CandidateResult = runCandidate(ds, highs, {
      label: finalist.label,
      familyKey: finalist.familyKey,
      params: finalist.params
    });
    const rows = tradeRows(ds, result.detail.trades, result.detail.accounting);
    const attribution = episodeAttribution(rows, moves);
    const nextOpen = evaluateCandidate(
      ds,
      highs,
      finalist.familyKey,
      finalist.params,
      fullSpec(ds, 'next-open')
    ).metrics;
    const rate8 = evaluateCandidate(ds, highs, finalist.familyKey, finalist.params, fullSpec(ds, 'stop', 0.08)).metrics;
    const rate14 = evaluateCandidate(
      ds,
      highs,
      finalist.familyKey,
      finalist.params,
      fullSpec(ds, 'stop', 0.14)
    ).metrics;
    const { stability, probes } = neighbourhood(data, finalist.familyKey, finalist.params, fullSpec(ds));
    const exclusion = attribution.map((row) => ({
      key: row.key,
      name: row.name,
      netWithout: result.metrics.net - row.net,
      episodeNet: row.net
    }));

    results.push({
      finalist,
      full: result.metrics,
      nextOpen,
      rate8,
      rate14,
      stability,
      probes: probes.length,
      exclusion,
      attribution,
      trades: rows
    });
    sections.push(
      [
        `### ${finalist.id}: ${finalist.label}`,
        '',
        `Origin: ${finalist.origin}.${finalist.file ? ` Runnable source: \`${finalist.file}\`.` : ''} Parameters: ${describeParams(families[finalist.familyKey]!, finalist.params)}.`,
        '',
        metricsHeader('Run'),
        metricsRow('stop fills, 11%', result.metrics),
        metricsRow('next-open fills, 11%', nextOpen),
        metricsRow('stop fills, 8%', rate8),
        metricsRow('stop fills, 14%', rate14),
        '',
        `Neighbourhood stability: ${pct(stability, 0)} of ${probes.length} one-parameter probes within 20% of the net and under the ceiling.`,
        '',
        tradeTable(rows),
        '',
        '| Episode | Trades | First entry | Net | Share of the move captured | Worst trade | Net without this episode |',
        '|---|---:|---|---:|---:|---:|---:|',
        ...attribution.map(
          (row) =>
            `| ${row.name} | ${row.trades} | ${row.firstEntry || '—'} | ${formatSignedDollars(row.net)} | ${row.trades > 0 ? pct(row.capturedShare, 0) : '—'} | ${row.trades > 0 ? formatSignedDollars(row.worst) : '—'} | ${formatDollars(result.metrics.net - row.net)} |`
        ),
        ''
      ].join('\n')
    );
    console.info(
      `${finalist.id}: ${formatDollars(result.metrics.net)} / ${formatDollars(result.metrics.minuteDrawdown)}, stability ${pct(stability, 0)}`
    );
  }

  await writeJson(stageDir('finalists', 'finalists.json'), results);
  await writeText(stageDir('finalists', 'finalists.md'), ['# Finalists (generated)', '', ...sections].join('\n'));
  console.info(`Wrote ${stageDir('finalists', 'finalists.md')}`);
};

// Markdown tables for OPTIMIZATION.md and STRATEGY_COMPARISON.md.
export const tables = async (data: Data) => {
  const { ds } = data;
  const dir = stageDir('tables');
  const out: string[] = [];

  // 1. Search stage statistics.
  const stageLines = [
    '| Fit | Family | Unique evaluations | Feasible | Front size | maxNet (training) | balanced | lowDd |',
    '|---|---|---:|---:|---:|---|---|---|'
  ];
  let totalEvaluations = 0;

  for (const fit of protocol.fits.map((fit) => fit.key)) {
    for (const familyKey of Object.keys(families)) {
      const file = stageDir('search', fit, familyKey, 'stage.json');

      if (!(await exists(file))) {
        continue;
      }

      const stage = await readJson<StageResult>(file);
      const pick = (policy: string) => {
        const found = stage.picks.find((candidate) => candidate.policy === policy);

        return found ? `${formatDollars(found.metrics.net)} / ${formatDollars(found.metrics.minuteDrawdown)}` : '—';
      };

      totalEvaluations += stage.stats.unique;
      stageLines.push(
        `| ${fit} | ${familyKey} | ${stage.stats.unique} | ${stage.feasible} | ${stage.front.length} | ${pick('maxNet')} | ${pick('balanced')} | ${pick('lowDd')} |`
      );
    }
  }

  stageLines.push(`| **total** | | **${totalEvaluations}** | | | | | |`);
  out.push('## Joint search stages', '', ...stageLines, '');

  // 2. Joint walk-forward.
  const rows = await readJson<ValidationRow[]>(stageDir('validation', 'rows.json'));
  const folds: FitKey[] = ['fold1', 'fold2', 'fold3'];
  const familyOrder = ['set2', ...Object.keys(families)];
  const wfLines = [
    '| Family | Policy | 2020–2021 | 2022 | 2023 | Stitched | Worst validation DD | Wins vs base |',
    '|---|---|---:|---:|---:|---:|---:|---:|'
  ];
  const cell = (row: ValidationRow | undefined) =>
    row ? `${formatSignedDollars(row.validation.net)} (${row.validation.entries}e)` : '—';
  const verdicts: Record<
    string,
    {
      balancedWins: number;
      stitched: number;
      baseStitched: number;
      worstDd: number;
      baseWorstDd: number;
      medianStitched: number;
      baseMedianStitched: number;
      credited: boolean;
    }
  > = {};
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);

    return sorted.length === 0
      ? NaN
      : sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]!
        : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
  };
  const stitchedMedian = (familyKey: string) =>
    folds.reduce(
      (total, fit) =>
        total +
        median(
          rows
            .filter((row) => row.fit === fit && row.familyKey === familyKey && row.policy.startsWith('top'))
            .map((row) => row.validation.net)
        ),
      0
    );

  for (const familyKey of familyOrder) {
    for (const policy of familyKey === 'set2' ? ['frozen'] : ['maxNet', 'balanced', 'lowDd']) {
      const perFold = folds.map((fit) =>
        rows.find((row) => row.fit === fit && row.familyKey === familyKey && row.policy === policy)
      );
      const stitched = perFold.reduce((total, row) => total + (row?.validation.net ?? 0), 0);
      const worst = Math.max(...perFold.map((row) => row?.validation.minuteDrawdown ?? 0));
      const basePerFold = folds.map((fit) =>
        rows.find((row) => row.fit === fit && row.familyKey === 'base' && row.policy === policy)
      );
      const wins =
        familyKey === 'base' || familyKey === 'set2'
          ? NaN
          : perFold.filter(
              (row, index) => row && basePerFold[index] && row.validation.net > basePerFold[index]!.validation.net
            ).length;

      wfLines.push(
        `| ${familyKey} | ${policy} | ${perFold.map(cell).join(' | ')} | ${formatSignedDollars(stitched)} | ${formatDollars(worst)} | ${Number.isNaN(wins) ? '—' : `${wins}/3`} |`
      );

      if (policy === 'balanced' && familyKey !== 'base' && familyKey !== 'set2') {
        const baseStitched = basePerFold.reduce((total, row) => total + (row?.validation.net ?? 0), 0);
        const baseWorst = Math.max(...basePerFold.map((row) => row?.validation.minuteDrawdown ?? 0));
        const medianStitched = stitchedMedian(familyKey);
        const baseMedianStitched = stitchedMedian('base');

        verdicts[familyKey] = {
          balancedWins: wins,
          stitched,
          baseStitched,
          worstDd: worst,
          baseWorstDd: baseWorst,
          medianStitched,
          baseMedianStitched,
          credited:
            wins >= 2 && stitched > baseStitched && worst <= 1.25 * baseWorst && medianStitched > baseMedianStitched
        };
      }
    }
  }

  const medianLines = ['| Family | 2020–2021 median of top 10 | 2022 | 2023 | Stitched |', '|---|---:|---:|---:|---:|'];

  for (const familyKey of Object.keys(families)) {
    const medians = folds.map((fit) =>
      median(
        rows
          .filter((row) => row.fit === fit && row.familyKey === familyKey && row.policy.startsWith('top'))
          .map((row) => row.validation.net)
      )
    );

    medianLines.push(
      `| ${familyKey} | ${medians.map((value) => formatSignedDollars(value)).join(' | ')} | ${formatSignedDollars(medians.reduce((total, value) => total + value, 0))} |`
    );
  }

  const verdictLines = [
    '| Family | Balanced wins vs base | Stitched (family / base) | Worst DD (family / base) | Median-of-10 stitched (family / base) | Credited |',
    '|---|---:|---|---|---|---|'
  ];

  for (const [familyKey, verdict] of Object.entries(verdicts)) {
    verdictLines.push(
      `| ${familyKey} | ${verdict.balancedWins}/3 | ${formatSignedDollars(verdict.stitched)} / ${formatSignedDollars(verdict.baseStitched)} | ${formatDollars(verdict.worstDd)} / ${formatDollars(verdict.baseWorstDd)} | ${formatSignedDollars(verdict.medianStitched)} / ${formatSignedDollars(verdict.baseMedianStitched)} | ${verdict.credited ? '**yes**' : 'no'} |`
    );
  }

  out.push(
    '## Joint walk-forward (picks on their validation windows)',
    '',
    ...wfLines,
    '',
    ...medianLines,
    '',
    '## Credit rule (PROTOCOL.md section 3.5)',
    '',
    ...verdictLines,
    ''
  );
  await writeJson(path.join(dir, 'verdicts.json'), verdicts);

  // 3. Mechanism-only walk-forward.
  const mechanismFile = stageDir('validation', 'mechanism-rows.json');

  if (await exists(mechanismFile)) {
    const mRows = await readJson<MechanismFoldRow[]>(mechanismFile);
    const mLines = [
      '| Mechanism (Set 2 frozen) | Policy | 2020–2021 | 2022 | 2023 | Stitched | Set 2 frozen stitched | Training picks |',
      '|---|---|---:|---:|---:|---:|---:|---|'
    ];
    const set2Stitched = folds.reduce(
      (total, fit) => total + (mRows.find((row) => row.fit === fit && row.familyKey === 'set2')?.validation.net ?? 0),
      0
    );
    const mCell = (row: MechanismFoldRow | undefined) =>
      row
        ? `${formatSignedDollars(row.validation.net)} (${row.validation.entries}e, DD ${formatDollars(row.validation.minuteDrawdown)})`
        : '—';

    mLines.push(
      `| Set 2 | frozen | ${folds.map((fit) => mCell(mRows.find((row) => row.fit === fit && row.familyKey === 'set2'))).join(' | ')} | ${formatSignedDollars(set2Stitched)} | | |`
    );

    for (const familyKey of singleMechanismKeys) {
      const family = families[familyKey]!;
      const mechanismKeys = family.paramKeys.filter((key) => !families.base!.paramKeys.includes(key));

      for (const policy of ['maxNet', 'balanced', 'lowDd']) {
        const perFold = folds.map((fit) =>
          mRows.find((row) => row.fit === fit && row.familyKey === familyKey && row.policy === policy)
        );
        const stitched = perFold.reduce((total, row) => total + (row?.validation.net ?? 0), 0);
        const picks = perFold
          .map((row) =>
            row
              ? mechanismKeys
                  .map(
                    (key) =>
                      `${specs[key].short} ${specs[key].unit === 'tenths of a percentage point' ? `${(row.params[key]! / 10).toFixed(1)}%` : row.params[key]}`
                  )
                  .join(' ')
              : '—'
          )
          .join('; ');

        mLines.push(
          `| ${familyKey} | ${policy} | ${perFold.map(mCell).join(' | ')} | ${formatSignedDollars(stitched)} | ${formatSignedDollars(set2Stitched)} | ${picks} |`
        );
      }

      const medians = folds.map((fit) =>
        median(
          mRows
            .filter((row) => row.fit === fit && row.familyKey === familyKey && row.policy.startsWith('top'))
            .map((row) => row.validation.net)
        )
      );

      mLines.push(
        `| ${familyKey} | median of top 10 | ${medians.map((value) => formatSignedDollars(value)).join(' | ')} | ${formatSignedDollars(medians.reduce((total, value) => total + value, 0))} | ${formatSignedDollars(set2Stitched)} | |`
      );
    }

    out.push(
      '## Mechanism-only walk-forward (mechanism parameters chosen per fold on the sweep lattice, Set 2 frozen)',
      '',
      ...mLines,
      ''
    );
  }

  // 4. Sweep summaries: the frontier of each mechanism against Set 2 on the full run.
  const sweepLines = [
    '| Mechanism | Lattice points | Identical to Set 2 | Dominating Set 2 (net ≥, DD ≤) | Within the ceiling | With a profitable 2023 trade | Best net within the ceiling | Best net with a profitable 2023 trade |',
    '|---|---:|---:|---:|---:|---:|---|---|'
  ];
  const set2Net = 150630;
  const set2Dd = 21183;

  for (const familyKey of singleMechanismKeys) {
    const file = stageDir('sweeps', `${familyKey}.json`);

    if (!(await exists(file))) {
      continue;
    }

    const sweep =
      await readJson<{ params: IntParams; metrics: Metrics; r2023: { net: number; firstEntry: string } }[]>(file);
    const family = families[familyKey]!;
    const mechanismKeys = family.paramKeys.filter((key) => !families.base!.paramKeys.includes(key));
    const describe = (row: (typeof sweep)[number]) =>
      `${mechanismKeys.map((key) => `${specs[key].short} ${specs[key].unit === 'tenths of a percentage point' ? `${(row.params[key]! / 10).toFixed(1)}%` : row.params[key]}`).join(' ')}: ${formatDollars(row.metrics.net)} / ${formatDollars(row.metrics.minuteDrawdown)}${row.r2023.net !== 0 ? ` (2023: ${row.r2023.firstEntry}, ${formatSignedDollars(row.r2023.net)})` : ''}`;
    const identical = sweep.filter(
      (row) => Math.abs(row.metrics.net - set2Net) < 1 && Math.abs(row.metrics.minuteDrawdown - set2Dd) < 1
    ).length;
    const dominating = sweep.filter(
      (row) =>
        row.metrics.net >= set2Net && row.metrics.minuteDrawdown <= set2Dd && !(Math.abs(row.metrics.net - set2Net) < 1)
    ).length;
    const within = sweep.filter((row) => row.metrics.minuteDrawdown <= protocol.drawdownCeiling);
    const with2023 = sweep.filter((row) => row.r2023.net > 0);
    const best = [...within].sort((a, b) => b.metrics.net - a.metrics.net)[0];
    const best2023 = [...with2023]
      .filter((row) => row.metrics.minuteDrawdown <= protocol.drawdownCeiling)
      .sort((a, b) => b.metrics.net - a.metrics.net)[0];

    sweepLines.push(
      `| ${familyKey} | ${sweep.length} | ${identical} | ${dominating} | ${within.length} | ${with2023.length} | ${best ? describe(best) : '—'} | ${best2023 ? describe(best2023) : '—'} |`
    );
  }

  out.push('## Targeted sweeps against Set 2 ($150,630 / $21,183), full common run', '', ...sweepLines, '');

  // 5. Finalists summary table.
  const finalistsFile = stageDir('finalists', 'finalists.json');

  if (await exists(finalistsFile)) {
    const results = await readJson<FinalistResult[]>(finalistsFile);
    const fLines = [
      '| ID | Candidate | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst streak | Interest | Exposure | Dev net (→ 2023-12-29) | Reused net (2024–25) | next-open net | 8% / 14% net | Stability | 2023 recovery | Net without best episode |',
      '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|---:|'
    ];

    for (const result of results) {
      const dev = result.full.segments.find((segment) => segment.label === 'development')!;
      const reused = result.full.segments.find((segment) => segment.label === 'reused')!;
      const r2023 = result.attribution.find((row) => row.key === 'r2023')!;
      const bestEpisode = [...result.exclusion].sort((a, b) => b.episodeNet - a.episodeNet)[0]!;

      fLines.push(
        `| ${result.finalist.id} | ${result.finalist.label} | ${formatDollars(result.full.net)} | ${formatDollars(result.full.minuteDrawdown)} | ${formatDollars(result.full.dailyDrawdown)} | ${result.full.entries}${result.full.openAtEnd ? ' (1 open)' : ''} | ${result.full.wins}/${result.full.losses} | ${formatDollars(result.full.worstTrade)} | ${formatDollars(result.full.worstEpisodeLoss)} | ${formatDollars(result.full.interest)} | ${pct(result.full.exposure, 0)} | ${formatDollars(dev.net)} | ${formatDollars(reused.net)} | ${formatDollars(result.nextOpen.net)} | ${formatDollars(result.rate8.net)} / ${formatDollars(result.rate14.net)} | ${pct(result.stability, 0)} | ${r2023.trades > 0 ? `${r2023.firstEntry}: ${formatSignedDollars(r2023.net)} (${pct(r2023.capturedShare, 0)})` : 'none'} | ${formatDollars(bestEpisode.netWithout)} (${bestEpisode.key}) |`
      );
    }

    const exclusionLines = [
      '| ID | ' + results[0]!.exclusion.map((row) => row.key).join(' | ') + ' |',
      '|---|' + results[0]!.exclusion.map(() => '---:').join('|') + '|'
    ];

    for (const result of results) {
      exclusionLines.push(
        `| ${result.finalist.id} | ${result.exclusion.map((row) => `${formatSignedDollars(row.episodeNet)} → ${formatDollars(row.netWithout)}`).join(' | ')} |`
      );
    }

    out.push(
      '## Finalists on the full common run',
      '',
      ...fLines,
      '',
      '## Leave-one-recovery-out (episode net → net without it)',
      '',
      ...exclusionLines,
      ''
    );
  }

  await writeText(
    path.join(dir, 'tables.md'),
    ['# Generated tables', '', `Data ${ds.id}, protocol ${protocol.version}.`, '', ...out].join('\n')
  );
  console.info(`Wrote ${path.join(dir, 'tables.md')}`);
};

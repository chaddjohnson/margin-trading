// Reports for the VGT minute optimizer, generated from the persisted run records only (results/<id>/), so
// every table can be rebuilt from the evidence on disk:
//   MINUTE_WALK_FORWARD_RESULTS.md, MINUTE_TOP_CANDIDATES.md, minute_top_candidates.json/.csv,
//   minute_pareto_archive.csv, walk_forward.json
// Refused once the experiment is frozen, so the frozen reports can't change.
import fs from 'fs-extra';
import path from 'node:path';
import type { MinuteParams } from '../app/allIn-minute-optimizable.ts';
import { paretoRanks2d } from '../optimizer/nsga2.ts';
import { describeParams, gridSize } from '../optimizer/params.ts';
import type { MinuteMetrics } from './evaluate.ts';
import {
  type MinuteExperimentConfig,
  type TrainingRecord,
  type ValidationRecord,
  researchDir,
  resultsRoot
} from './experiment.ts';
import { controls, minuteParameterSpace } from './params.ts';

const space = minuteParameterSpace;

export const dollars = (value: number) =>
  Number.isFinite(value)
    ? `${value < 0 ? '-' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`
    : String(value);
export const percent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const tenths = (value: number) => `${(value / 10).toFixed(1)}%`;

export const paramCells = (params: MinuteParams) => [
  tenths(params.dipTenths),
  tenths(params.trailingStopTenths),
  `${params.maximumHoldDays}`,
  `${params.lookbackSessions}`,
  tenths(params.materialLossTenths),
  tenths(params.lowerReentryTenths),
  tenths(params.retraceTenths)
];

export const paramShort = (params: MinuteParams) =>
  `${tenths(params.dipTenths)} / ${tenths(params.trailingStopTenths)} / ${params.maximumHoldDays} d / ${params.lookbackSessions} s / ${tenths(params.materialLossTenths)} / ${tenths(params.lowerReentryTenths)} / ${tenths(params.retraceTenths)}`;

const paramHeader = [
  'Dip',
  'Stop',
  'Hold (cal. days)',
  'Lookback (sessions)',
  'Material loss',
  'Lower re-entry',
  'Reset'
];

const table = (header: string[], rows: (string | number)[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');

export const net = (metrics: MinuteMetrics, bps: number) =>
  metrics.levels.find((level) => level.bps === bps)!.netProfit;
export const minuteDd = (metrics: MinuteMetrics, bps: number) =>
  metrics.levels.find((level) => level.bps === bps)!.minuteDrawdown;
export const dailyDd = (metrics: MinuteMetrics, bps: number) =>
  metrics.levels.find((level) => level.bps === bps)!.dailyDrawdown;

const readJson = async <T>(file: string) => (await fs.readJson(file)) as T;

export interface Loaded {
  config: MinuteExperimentConfig & { codeHash: string; dataset: Record<string, unknown> };
  folds: { training: TrainingRecord; validation: ValidationRecord }[];
  final: TrainingRecord;
  replicates: TrainingRecord[];
  controlRuns: TrainingRecord[];
  replays: Replay[];
  controlDiagnostics?: {
    results: {
      id: string;
      gates: Record<string, boolean>;
      net: number;
      minuteDrawdown: number;
      merit: number;
      netMedian: number;
      netMin: number;
      neighbourNetMin: number;
      drawdownMax: number;
      feasibleShare: number;
      wouldRankAfter: number;
      rankedTopSize: number;
    }[];
  };
}

export interface Replay {
  key: string;
  id: string;
  params: MinuteParams;
  variants: {
    stopFill: 'stop' | 'next-open';
    engineMatchesReference: boolean;
    summary: Record<string, number | string | boolean>;
    costResults: {
      bps: number;
      costs: number;
      netProfit: number;
      maximumDrawdown: number;
      minuteMaximumDrawdown: number;
    }[];
    yearMarks: { year: number; lastDate: string; mark: number; costMarks: number[] }[];
    exposureSessions: number;
  }[];
}

export const loadExperiment = async (id: string): Promise<Loaded> => {
  const root = resultsRoot(id);
  const config = await readJson<Loaded['config']>(path.join(root, 'experiment.json'));
  const folds = [];

  for (const fold of config.protocol.folds.filter((entry) => config.folds.includes(entry.id))) {
    folds.push({
      training: await readJson<TrainingRecord>(path.join(root, fold.id, 'run.json')),
      validation: await readJson<ValidationRecord>(path.join(root, fold.id, 'validation.json'))
    });
  }

  const final = await readJson<TrainingRecord>(path.join(root, config.protocol.final.id, 'run.json'));
  const replicates = [];
  const controlRuns = [];

  for (let replicate = 1; replicate <= config.replicateSeeds; replicate++) {
    replicates.push(await readJson<TrainingRecord>(path.join(root, `replicate-${replicate}`, 'run.json')));
  }

  for (let seed = 0; seed < config.controlSeeds; seed++) {
    for (const sampler of ['sobol', 'random']) {
      controlRuns.push(await readJson<TrainingRecord>(path.join(root, `control-${sampler}-${seed}`, 'run.json')));
    }
  }

  const replays = await readJson<Replay[]>(path.join(root, config.protocol.final.id, 'replays', 'replays.json'));

  const diagnosticsFile = path.join(root, config.protocol.final.id, 'control-diagnostics.json');
  const controlDiagnostics = (await fs.pathExists(diagnosticsFile))
    ? await readJson<NonNullable<Loaded['controlDiagnostics']>>(diagnosticsFile)
    : undefined;

  return { config, folds, final, replicates, controlRuns, replays, controlDiagnostics };
};

// The pre-declared evidence rule for the walk-forward policy against the incumbent (MINUTE_OPTIMIZER_DESIGN.md).
export const walkForwardVerdict = (loaded: Loaded, bps: number) => {
  const rows = loaded.folds.map(({ validation }) => {
    const rankOne = validation.entries.find((entry) => entry.role === 'rank-1');
    const incumbent = validation.entries.find((entry) => entry.id === 'incumbent')!;
    const policy = rankOne ? net(rankOne.metrics, bps) : 0;
    const control = net(incumbent.metrics, bps);

    return { fold: validation.foldId, policy, incumbent: control, advantage: policy - control };
  });
  const policyTotal = rows.reduce((total, row) => total + row.policy, 0);
  const incumbentTotal = rows.reduce((total, row) => total + row.incumbent, 0);
  const advantages = rows.map((row) => row.advantage);
  const largest = Math.max(...advantages);
  const withoutLargest = advantages.reduce((total, value) => total + value, 0) - largest;
  const foldsAtLeast = rows.filter((row) => row.advantage >= 0).length;
  const beats = policyTotal > incumbentTotal && foldsAtLeast >= 3 && withoutLargest > 0;
  const verdict = policyTotal <= 0 ? 'negative' : beats ? 'beats the incumbent' : 'not demonstrated';

  return { bps, rows, policyTotal, incumbentTotal, foldsAtLeast, withoutLargest, verdict };
};

const stabilityScore = (vectors: MinuteParams[]) =>
  space.specs.reduce((total, spec) => {
    const values = vectors.map((params) => params[spec.key]);

    return total + (Math.max(...values) - Math.min(...values)) / (spec.max - spec.min);
  }, 0) / space.specs.length;

const style = (params: MinuteParams) => {
  const dip = params.dipTenths / 10;
  const stop = params.trailingStopTenths / 10;
  const dipStyle = dip < 4 ? 'shallow dip' : dip < 8 ? 'medium dip' : 'deep dip';
  const stopStyle = stop < 3 ? 'tight stop' : stop < 7 ? 'medium stop' : 'wide stop';

  return `${dipStyle}, ${stopStyle}`;
};

// Where the candidate's net P&L crosses the incumbent's as the extra cost per side grows:
// net_c(candidate) - net_c(incumbent) = extraNet - c x extraTurnover.
const breakEven = (candidate: MinuteMetrics, incumbent: MinuteMetrics) => {
  const extraNet = candidate.netProfit - incumbent.netProfit;
  const extraTurnover = candidate.turnover - incumbent.turnover;
  const crossing = extraTurnover === 0 ? NaN : (extraNet / extraTurnover) * 10000;

  if (extraNet > 0) {
    if (extraTurnover <= 0 || crossing > 500) {
      return 'ahead at any cost up to 500 bp';
    }

    return `ahead below ${crossing.toFixed(1)} bp`;
  }

  return extraTurnover < 0 ? `behind at 0 bp; ahead above ${crossing.toFixed(1)} bp` : 'never ahead';
};

export const walkForwardMarkdown = (loaded: Loaded) => {
  const levels = [0, ...loaded.config.settings.costBps];
  const selectionBps = loaded.config.fitness.selectionCostBps;
  const verdicts = levels.map((bps) => walkForwardVerdict(loaded, bps));
  const main = verdicts.find((verdict) => verdict.bps === selectionBps)!;
  const lines: string[] = [];

  lines.push('# VGT minute optimizer: walk-forward results');
  lines.push('');
  lines.push(
    `Experiment \`${loaded.config.id}\`, seed ${loaded.config.seed}. Each fold searched its training window (2016-10-07 to the end of the previous year) with the full budget and the pre-declared selection policy (MINUTE_OPTIMIZER_DESIGN.md), then traded its rank 1, unchanged, on the following calendar year. Every validation year starts flat, with earlier sessions as reference-high history only; an open position at the year end is marked to the last close net of accrued interest. Money is per $100,000 margin allocation at 11% interest. **Selection-cost figures are at ${selectionBps} bp per side** unless a column says otherwise.`
  );
  lines.push('');
  lines.push(
    "> **The comparison is tilted towards the incumbent.** The incumbent (2.5% / 2.1% / 8 d / 78 s / 2.2% / 4.0% / 36.7%) is the daily optimizer's VGT rank 1, fitted on 2014–2023 daily data, so it has seen every validation year below. The walk-forward policy only ever saw data before each year. The deep-dip control (10% / 8% / 15 d / 90 s / 1.0% / 2.0% / 38.0%) was also hand-tuned on VGT over overlapping years."
  );
  lines.push('');
  lines.push('## Verdict (pre-declared rule)');
  lines.push('');
  lines.push(
    `At ${selectionBps} bp/side the walk-forward policy earned **${dollars(main.policyTotal)}** over 2020–2023 against **${dollars(main.incumbentTotal)}** for the incumbent; it was at least as good in ${main.foldsAtLeast} of ${main.rows.length} folds, and the total advantage without the best fold is ${dollars(main.withoutLargest)}. Verdict: **${main.verdict}**.`
  );
  lines.push('');
  lines.push(
    table(
      [
        'Extra cost per side',
        'Policy 2020–23',
        'Incumbent 2020–23',
        'Folds policy ≥ incumbent',
        'Advantage without best fold',
        'Verdict'
      ],
      verdicts.map((verdict) => [
        `${verdict.bps} bp`,
        dollars(verdict.policyTotal),
        dollars(verdict.incumbentTotal),
        `${verdict.foldsAtLeast} / ${verdict.rows.length}`,
        dollars(verdict.withoutLargest),
        verdict.verdict
      ])
    )
  );
  lines.push('');
  lines.push('## Per fold: selected parameters (chosen before the validation year) and validation results');
  lines.push('');
  lines.push(
    table(
      ['Fold', 'Training window', ...paramHeader, 'Origin'],
      loaded.folds.map(({ training }) => {
        const rankOne = training.shortlist[0];

        return [
          training.runId,
          `${training.window.firstDate} → ${training.window.lastDate}`,
          ...(rankOne ? paramCells(rankOne.params) : paramHeader.map(() => '-')),
          rankOne ? rankOne.origin.stage : '-'
        ];
      })
    )
  );
  lines.push('');
  lines.push(
    table(
      [
        'Fold',
        'Strategy',
        'Trades',
        'Exposure',
        'Net 0 bp',
        `Net ${selectionBps} bp`,
        'Net 20 bp',
        'Gross',
        'Interest',
        `Minute DD ${selectionBps} bp`,
        `Daily DD ${selectionBps} bp`,
        `Net ${selectionBps} bp, next-open stops`
      ],
      loaded.folds.flatMap(({ validation }) =>
        validation.entries
          .filter((entry) => entry.role !== 'shortlist')
          .map((entry) => [
            validation.foldId,
            entry.role === 'rank-1' ? '**rank 1**' : entry.id,
            entry.metrics.entries,
            percent(entry.metrics.exposure),
            dollars(entry.metrics.netProfit),
            dollars(net(entry.metrics, selectionBps)),
            dollars(net(entry.metrics, 20)),
            dollars(entry.metrics.grossProfit),
            dollars(entry.metrics.interest),
            dollars(minuteDd(entry.metrics, selectionBps)),
            dollars(dailyDd(entry.metrics, selectionBps)),
            dollars(net(entry.nextOpen, selectionBps))
          ])
      )
    )
  );
  lines.push('');
  lines.push('## In-sample versus out-of-sample');
  lines.push('');
  lines.push(
    "Training P&L is the fold rank 1's result on its own training window, where it was selected (in-sample). Validation is the next year (out-of-sample for the procedure). The incumbent column shows the same windows for the incumbent."
  );
  lines.push('');
  lines.push(
    table(
      [
        'Fold',
        'Rank 1 training net / year',
        'Incumbent training net / year',
        'Rank 1 validation net',
        'Incumbent validation net',
        'Rank 1 training trades / year',
        'Rank 1 validation trades'
      ],
      loaded.folds.map(({ training, validation }) => {
        const rankOne = training.shortlist[0];
        const incumbent = training.controls.find((control) => control.id === 'incumbent')!;
        const validationRankOne = validation.entries.find((entry) => entry.role === 'rank-1');
        const validationIncumbent = validation.entries.find((entry) => entry.id === 'incumbent')!;

        return [
          training.runId,
          rankOne ? dollars(net(rankOne.metrics, selectionBps) / training.window.years) : '-',
          dollars(net(incumbent.metrics, selectionBps) / training.window.years),
          validationRankOne ? dollars(net(validationRankOne.metrics, selectionBps)) : '-',
          dollars(net(validationIncumbent.metrics, selectionBps)),
          rankOne ? (rankOne.metrics.entries / training.window.years).toFixed(1) : '-',
          validationRankOne ? validationRankOne.metrics.entries : '-'
        ];
      })
    )
  );
  lines.push('');
  lines.push('## Fold-to-fold stability of the selected parameters');
  lines.push('');

  const rankOnes = loaded.folds.flatMap(({ training }) =>
    training.shortlist[0] ? [training.shortlist[0].params] : []
  );

  lines.push(
    `Stability score (mean over the seven parameters of the range of the fold rank-1 values divided by the parameter's search range; 0 = identical every year, 1 = spans the whole range): **${stabilityScore(rankOnes).toFixed(2)}**.`
  );
  lines.push('');
  lines.push(
    table(
      ['Parameter', ...loaded.folds.map(({ training }) => training.runId), 'Final run', 'Incumbent'],
      space.specs.map((spec, index) => [
        paramHeader[index]!,
        ...loaded.folds.map(({ training }) =>
          training.shortlist[0] ? paramCells(training.shortlist[0].params)[index]! : '-'
        ),
        loaded.final.shortlist[0] ? paramCells(loaded.final.shortlist[0].params)[index]! : '-',
        paramCells(controls[0].params)[index]!
      ])
    )
  );
  lines.push('');
  lines.push('## The whole shortlist out of sample (diagnostic, not the policy)');
  lines.push('');
  lines.push(
    "The policy trades rank 1 only. As a diagnostic of how much the ranking itself carries, every fold's full shortlist was also run on its validation year:"
  );
  lines.push('');
  lines.push(
    table(
      [
        'Fold',
        'Shortlist size',
        `Median net ${selectionBps} bp`,
        `Best`,
        `Worst`,
        'Beat the incumbent',
        'Rank 1 position by validation net'
      ],
      loaded.folds.map(({ validation }) => {
        const listed = validation.entries.filter((entry) => entry.role !== 'control');
        const nets = listed.map((entry) => net(entry.metrics, selectionBps)).sort((a, b) => a - b);
        const incumbent = net(validation.entries.find((entry) => entry.id === 'incumbent')!.metrics, selectionBps);
        const rankOne = listed.find((entry) => entry.role === 'rank-1');
        const rankOneNet = rankOne ? net(rankOne.metrics, selectionBps) : NaN;
        const middle = nets.length >> 1;
        const median = nets.length ? (nets.length % 2 ? nets[middle]! : (nets[middle - 1]! + nets[middle]!) / 2) : NaN;

        return [
          validation.foldId,
          listed.length,
          dollars(median),
          dollars(nets.at(-1) ?? NaN),
          dollars(nets[0] ?? NaN),
          `${nets.filter((value) => value > incumbent).length} / ${listed.length}`,
          rankOne ? `${nets.filter((value) => value > rankOneNet).length + 1} of ${listed.length}` : '-'
        ];
      })
    )
  );
  lines.push('');
  lines.push('## Search statistics per fold');
  lines.push('');
  lines.push(
    table(
      [
        'Run',
        'Sobol unique / drawn',
        'GA runs (generations, new sims, stop)',
        'Search sims',
        'Total sims incl. probes',
        'Gated',
        'Passed all',
        'Shortlist'
      ],
      [...loaded.folds.map(({ training }) => training), loaded.final].map((training) => [
        training.runId,
        `${training.sampler.unique} / ${training.sampler.drawn}`,
        training.gaRuns.map((run) => `${run.generations}, ${run.newEvaluations}, ${run.stopReason}`).join('; '),
        training.searchSimulations,
        training.simulations,
        training.selection.gated,
        training.selection.passedAll,
        training.shortlist.length
      ])
    )
  );
  lines.push('');
  lines.push(
    "Machine-readable: `walk_forward.json` (this report's numbers), and per fold `results/<experiment>/<fold>/run.json`, `validation.json`, `evaluations.csv.gz` (every evaluated vector) and `validation-trades-*.csv`."
  );
  lines.push('');

  return { markdown: lines.join('\n'), verdicts };
};

export const topCandidatesMarkdown = (loaded: Loaded) => {
  const { final, replays } = loaded;
  const selectionBps = loaded.config.fitness.selectionCostBps;
  const levels = [0, ...loaded.config.settings.costBps];
  const incumbentMetrics = final.controls.find((control) => control.id === 'incumbent')!.metrics;
  const years = incumbentMetrics.years.map((year) => year.year);
  const lines: string[] = [];
  const replayOf = (id: string) => replays.find((replay) => replay.id === id)!;
  const variant = (id: string, stopFill: 'stop' | 'next-open') =>
    replayOf(id).variants.find((entry) => entry.stopFill === stopFill)!;

  lines.push('# VGT minute optimizer: top candidates (pre-holdout)');
  lines.push('');
  lines.push(
    `Final development run \`${final.runId}\`: training window ${final.window.firstDate} → ${final.window.lastDate} (${final.window.sessions} sessions, ${final.window.years.toFixed(2)} years), flat start with 2016-01-04 onwards as reference-high history. Ranked by the pre-declared policy (MINUTE_OPTIMIZER_DESIGN.md) at **${selectionBps} bp per side**. Every figure here is **in-sample** for these candidates: they were chosen on this window. Money is per $100,000 margin allocation.`
  );
  lines.push('');

  const rankOne = final.shortlist[0];

  if (rankOne) {
    lines.push(
      `**Rank 1 (primary candidate, frozen before the final evaluation): \`${rankOne.id}\`, dip ${tenths(rankOne.params.dipTenths)}, stop ${tenths(rankOne.params.trailingStopTenths)}, maximum hold ${rankOne.params.maximumHoldDays} calendar days, lookback ${rankOne.params.lookbackSessions} sessions, material loss ${tenths(rankOne.params.materialLossTenths)}, lower re-entry ${tenths(rankOne.params.lowerReentryTenths)}, reset ${tenths(rankOne.params.retraceTenths)}.**`
    );
    lines.push('');
  }

  lines.push('## Selection summary');
  lines.push('');
  lines.push(
    `${final.searchSimulations.toLocaleString('en-US')} distinct vectors from the search (${final.sampler.unique} Sobol, ${final.gaRuns.map((run) => `GA ${run.run}: ${run.newEvaluations} new over ${run.generations} generations, ${run.stopReason}`).join('; ')}), ${final.simulations.toLocaleString('en-US')} including neighbourhood and perturbation probes. ${final.selection.gated} passed gates G1–G7; ${final.selection.passedAll} of the ${final.selection.pool} pool members passed G8 and were ranked. Gate rejections (a vector can fail several): ${Object.entries(
      final.selection.rejectionCounts
    )
      .map(([key, value]) => `${key} ${value}`)
      .join(', ')}.${final.selection.notes.length ? ` ${final.selection.notes.join(' ')}` : ''}`
  );
  lines.push('');
  lines.push('## Ranked shortlist');
  lines.push('');
  lines.push(
    table(
      [
        'Rank',
        'ID',
        ...paramHeader,
        'Style',
        'Trades',
        'Exposure',
        'Merit (P25 net)',
        'Origin',
        'Inclusion',
        'Same-phenotype dupes'
      ],
      final.shortlist.map((entry) => [
        entry.selection.rank === 1 ? '**1**' : entry.selection.rank,
        `\`${entry.id}\``,
        ...paramCells(entry.params),
        style(entry.params),
        entry.metrics.entries,
        percent(entry.metrics.exposure),
        dollars(entry.selection.merit),
        entry.origin.stage,
        entry.selection.inclusion,
        entry.selection.behaviouralDuplicates
      ])
    )
  );
  lines.push('');
  lines.push('### Profit, costs and risk (development window, literal working-copy replays)');
  lines.push('');
  lines.push(
    'Each row was replayed through `src/app/allIn-minute-optimizable.ts` (the literal copy of `allIn.ts`) and checked field by field against the fast engine. Drawdowns are peak-to-trough falls of the mark to market from $0 at the window start; minute-sampled DD marks every regular-session minute close and the official close, daily DD only the closes.'
  );
  lines.push('');

  const members = [
    ...final.shortlist.map((entry) => ({ label: `${entry.selection.rank}`, id: entry.id, metrics: entry.metrics })),
    ...final.controls.map((control) => ({ label: control.id, id: control.id, metrics: control.metrics }))
  ];

  lines.push(
    table(
      [
        'Rank',
        'Gross (0 bp)',
        'Interest',
        ...levels.map((bps) => `Net ${bps} bp`),
        'Turnover',
        'Minute DD 0 bp',
        'Daily DD 0 bp',
        `Minute DD ${selectionBps} bp`,
        `Daily DD ${selectionBps} bp`,
        'Minute − daily DD',
        'Break-even vs incumbent'
      ],
      members.map((member) => {
        const stop = variant(member.id, 'stop');
        const minute = Number(stop.summary.minuteMaximumDrawdown);
        const daily = Number(stop.summary.maximumDrawdown);
        const selected = stop.costResults.find((level) => level.bps === selectionBps)!;

        return [
          member.label,
          dollars(Number(stop.summary.netProfit) + Number(stop.summary.marginInterest)),
          dollars(Number(stop.summary.marginInterest)),
          ...levels.map((bps) =>
            dollars(
              bps === 0
                ? Number(stop.summary.netProfit)
                : stop.costResults.find((level) => level.bps === bps)!.netProfit
            )
          ),
          dollars(member.metrics.turnover),
          dollars(minute),
          dollars(daily),
          dollars(selected.minuteMaximumDrawdown),
          dollars(selected.maximumDrawdown),
          dollars(minute - daily),
          member.id === 'incumbent' ? '-' : breakEven(member.metrics, incumbentMetrics)
        ];
      })
    )
  );
  lines.push('');
  lines.push(
    "Break-even: the extra cost per side at which the candidate's net P&L equals the incumbent's (costs scale with turnover, so net(c) = net(0) − c × turnover)."
  );
  lines.push('');
  lines.push(
    '### Stop-fill sensitivity (`next-open`: an intraday stop fills at the next observed trade, not the stop price)'
  );
  lines.push('');
  lines.push(
    table(
      [
        'Rank',
        `Net ${selectionBps} bp, stop fill`,
        `Net ${selectionBps} bp, next-open`,
        'Change',
        'Minute DD next-open (0 bp)'
      ],
      members.map((member) => {
        const stop = variant(member.id, 'stop').costResults.find((level) => level.bps === selectionBps)!.netProfit;
        const nextOpenVariant = variant(member.id, 'next-open');
        const nextOpen = nextOpenVariant.costResults.find((level) => level.bps === selectionBps)!.netProfit;

        return [
          member.label,
          dollars(stop),
          dollars(nextOpen),
          dollars(nextOpen - stop),
          dollars(Number(nextOpenVariant.summary.minuteMaximumDrawdown))
        ];
      })
    )
  );
  lines.push('');
  lines.push(`### Net P&L by calendar year at ${selectionBps} bp/side (daily mark to market, open positions included)`);
  lines.push('');

  const yearNet = (metrics: MinuteMetrics, year: number) => {
    const levelIndex = metrics.levels.findIndex((level) => level.bps === selectionBps);
    const entry = metrics.years.find((item) => item.year === year);

    return entry ? entry.net[levelIndex]! : NaN;
  };

  lines.push(
    table(
      ['Rank', ...years.map(String), 'Without 2020', 'Best trade', 'Positive years'],
      members.map((member) => {
        const values = years.map((year) => yearNet(member.metrics, year));
        const total = net(member.metrics, selectionBps);

        return [
          member.label,
          ...values.map(dollars),
          dollars(total - yearNet(member.metrics, 2020)),
          dollars(member.metrics.levels.find((level) => level.bps === selectionBps)!.bestTrade),
          `${values.filter((value) => value >= 0).length} / ${values.length}`
        ];
      })
    )
  );
  lines.push('');
  lines.push('### Parameter-neighbourhood stability');
  lines.push('');
  lines.push(
    'Over the candidate, its 14 one-step neighbours (each parameter moved by its radius: dip and stop ±0.5 pp, hold ±2 days, lookback ±10 sessions, material loss ±0.3 pp, lower re-entry ±0.5 pp, reset ±5 pp) and 16 joint perturbations (all parameters moved at once within those radii). "Same trades" is the share of those 30 vectors that make exactly the candidate\'s trades.'
  );
  lines.push('');
  lines.push(
    table(
      [
        'Rank',
        'P25 net (merit)',
        'Median net',
        'Worst net',
        'Worst one-step neighbour',
        'Median minute DD (one-step)',
        'Worst minute DD (one-step)',
        'Feasible share',
        'Same trades',
        'Bound flags'
      ],
      final.shortlist.map((entry) => {
        const hood = entry.selection.neighbourhood;

        return [
          entry.selection.rank,
          dollars(hood.netP25),
          dollars(hood.netMedian),
          dollars(hood.netMin),
          dollars(hood.neighbourNetMin),
          dollars(hood.drawdownMedian),
          dollars(hood.drawdownMax),
          percent(hood.feasibleShare, 0),
          percent(hood.sameTradesShare, 0),
          entry.boundFlags.length ? entry.boundFlags.join('; ') : '-'
        ];
      })
    )
  );
  lines.push('');
  lines.push('### Trade profile');
  lines.push('');
  lines.push(
    table(
      [
        'Rank',
        'Trades',
        'Win rate',
        'Profit factor',
        'Median trade',
        'Worst trade',
        'Median hold (cal. days)',
        'Stop / gap / max-hold exits',
        'Restrictions (reentries / resets)',
        'No-fill entry decisions'
      ],
      members.map((member) => [
        member.label,
        member.metrics.entries,
        percent(member.metrics.winRate, 0),
        member.metrics.profitFactor === null ? '∞' : Number(member.metrics.profitFactor).toFixed(2),
        dollars(member.metrics.medianTrade),
        dollars(member.metrics.worstTrade),
        member.metrics.medianHoldDays.toFixed(1),
        `${member.metrics.exits.trailingStop} / ${member.metrics.exits.trailingStopGap} / ${member.metrics.exits.maximumHold}`,
        `${member.metrics.restrictions} (${member.metrics.lowerPriceReentries} / ${member.metrics.recoveryResets})`,
        member.metrics.entriesWithoutTrade
      ])
    )
  );
  lines.push('');
  if (loaded.controlDiagnostics) {
    lines.push('## The controls under the same selection policy (diagnostic)');
    lines.push('');
    lines.push(
      'The incumbent and the deep-dip control were scored on this window with exactly the gates and neighbourhood merit used for every candidate (`results/<experiment>/final-2016-2023/control-diagnostics.json`). They were not candidates and this does not change any ranking.'
    );
    lines.push('');
    lines.push(
      table(
        [
          'Control',
          `Net ${selectionBps} bp`,
          `Minute DD ${selectionBps} bp`,
          'Failed gates',
          'Merit (P25 net)',
          'Median net',
          'Worst net',
          'Worst one-step neighbour',
          'Worst one-step minute DD',
          'Feasible share',
          'Ranked candidates with higher merit'
        ],
        loaded.controlDiagnostics.results.map((entry) => [
          entry.id,
          dollars(entry.net),
          dollars(entry.minuteDrawdown),
          Object.entries(entry.gates)
            .filter(([, passed]) => !passed)
            .map(([gate]) => gate)
            .join(', ') || 'none',
          dollars(entry.merit),
          dollars(entry.netMedian),
          dollars(entry.netMin),
          dollars(entry.neighbourNetMin),
          dollars(entry.drawdownMax),
          percent(entry.feasibleShare, 0),
          entry.wouldRankAfter >= entry.rankedTopSize
            ? `all of the top ${entry.rankedTopSize}`
            : `${entry.wouldRankAfter}`
        ])
      )
    );
    lines.push('');
  }

  lines.push('## Seed stability and the Sobol-versus-random control (diagnostics)');
  lines.push('');
  lines.push(
    'The same final-window procedure, rerun with independent master seeds (different Sobol scrambles and GA streams). Not used for selection.'
  );
  lines.push('');
  lines.push(
    table(
      ['Run', 'Rank 1', `Net ${selectionBps} bp`, `Minute DD ${selectionBps} bp`, 'Merit', 'Same rank 1 as main?'],
      [final, ...loaded.replicates].map((run) => {
        const first = run.shortlist[0];

        return [
          run.runId,
          first ? paramShort(first.params) : '-',
          first ? dollars(net(first.metrics, selectionBps)) : '-',
          first ? dollars(minuteDd(first.metrics, selectionBps)) : '-',
          first ? dollars(first.selection.merit) : '-',
          first && rankOne
            ? first.id === rankOne.id
              ? 'yes'
              : first.metrics.signature === rankOne.metrics.signature
                ? 'same trades'
                : 'no'
            : '-'
        ];
      })
    )
  );
  lines.push('');

  const controlRows = (['sobol', 'random'] as const).map((sampler) => {
    const runs = loaded.controlRuns.filter((run) => run.sampler.kind === sampler);
    const stats = (values: number[]) => {
      const mean = values.reduce((total, value) => total + value, 0) / values.length;
      const sd = Math.sqrt(
        values.reduce((total, value) => total + (value - mean) ** 2, 0) / Math.max(1, values.length - 1)
      );

      return { mean, sd };
    };
    const exploration = stats(runs.map((run) => run.hypervolume.exploration));
    const archive = stats(runs.map((run) => run.hypervolume.archive));
    const merit = stats(runs.map((run) => run.shortlist[0]?.selection.merit ?? NaN));

    return [
      sampler,
      runs.length,
      `${exploration.mean.toFixed(4)} ± ${exploration.sd.toFixed(4)}`,
      `${archive.mean.toFixed(4)} ± ${archive.sd.toFixed(4)}`,
      `${dollars(merit.mean)} ± ${dollars(merit.sd)}`
    ];
  });

  lines.push(`Same budget and engine, early stopping off for both arms (${loaded.config.controlSeeds} seeds each):`);
  lines.push('');
  lines.push(
    table(
      ['Initial sampler', 'Seeds', 'Exploration hypervolume', 'Final archive hypervolume', 'Rank-1 merit'],
      controlRows
    )
  );
  lines.push('');
  lines.push(
    'Hypervolume is over feasible (net P&L, minute DD) points at 5 bp/side against the reference (net $0, DD $30,000), in units of the allocation squared.'
  );
  lines.push('');
  lines.push(
    "Files: `minute_top_candidates.json` / `.csv` (full precision), `minute_pareto_archive.csv` (the final run's feasible non-dominated set), `results/<experiment>/final-2016-2023/evaluations.csv.gz` (every evaluated vector), and `results/<experiment>/final-2016-2023/replays/<rank>/{stop,next-open}/` (trades.csv, daily.csv, states.csv, episodes.csv, summary.json from the literal copy)."
  );
  lines.push('');

  return lines.join('\n');
};

const csvCell = (value: unknown) => {
  const text = String(value ?? '');

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const writeReports = async (id: string, log: (line: string) => void) => {
  const root = resultsRoot(id);

  if (await fs.pathExists(path.join(root, 'freeze', 'freeze.json'))) {
    throw new Error(`Experiment ${id} is frozen; its reports can't be regenerated`);
  }

  const loaded = await loadExperiment(id);
  const selectionBps = loaded.config.fitness.selectionCostBps;
  const walkForward = walkForwardMarkdown(loaded);
  const top = topCandidatesMarkdown(loaded);
  const final = loaded.final;
  const candidates = [
    ...final.shortlist.map((entry) => ({
      kind: 'shortlist',
      rank: entry.selection.rank,
      primary: entry.selection.rank === 1,
      id: entry.id,
      params: entry.params,
      description: describeParams(space, entry.params),
      origin: entry.origin,
      selection: entry.selection,
      boundFlags: entry.boundFlags,
      metrics: entry.metrics,
      replays: loaded.replays.find((replay) => replay.id === entry.id)?.variants
    })),
    ...final.controls.map((control) => ({
      kind: 'control',
      rank: null,
      primary: false,
      id: control.id,
      params: control.params,
      description: describeParams(space, control.params),
      metrics: control.metrics,
      replays: loaded.replays.find((replay) => replay.id === control.id)?.variants
    }))
  ];
  const json = {
    experiment: id,
    seed: loaded.config.seed,
    space: space.name,
    window: final.window,
    selectionCostBps: selectionBps,
    generatedFrom: path.join(root, final.runId, 'run.json'),
    candidates
  };
  const csvHeader = [
    'kind',
    'rank',
    'id',
    ...space.specs.map((spec) => spec.key),
    'trades',
    'exposure',
    'gross_0bp',
    'interest',
    'net_0bp',
    ...loaded.config.settings.costBps.map((bps) => `net_${bps}bp`),
    'minute_dd_0bp',
    'daily_dd_0bp',
    `minute_dd_${selectionBps}bp`,
    `daily_dd_${selectionBps}bp`,
    'turnover',
    'merit',
    'origin',
    'signature'
  ];
  const csvRows = candidates.map((candidate) =>
    [
      candidate.kind,
      candidate.rank ?? '',
      candidate.id,
      ...space.specs.map((spec) => candidate.params[spec.key]),
      candidate.metrics.entries,
      candidate.metrics.exposure,
      candidate.metrics.grossProfit,
      candidate.metrics.interest,
      candidate.metrics.netProfit,
      ...loaded.config.settings.costBps.map((bps) => net(candidate.metrics, bps)),
      candidate.metrics.minuteDrawdown,
      candidate.metrics.dailyDrawdown,
      minuteDd(candidate.metrics, selectionBps),
      dailyDd(candidate.metrics, selectionBps),
      candidate.metrics.turnover,
      'selection' in candidate ? candidate.selection!.merit : '',
      'origin' in candidate ? candidate.origin!.stage : '',
      candidate.metrics.signature
    ]
      .map(csvCell)
      .join(',')
  );

  // The final run's feasible non-dominated set, from the persisted evaluation archive.
  const archiveFile = path.join(root, final.runId, 'evaluations.csv.gz');
  const archiveLines = (await import('node:zlib'))
    .gunzipSync(await fs.readFile(archiveFile))
    .toString('utf8')
    .trim()
    .split('\n');
  const archiveHeader = archiveLines[0]!.split(',');
  const column = (name: string) => archiveHeader.indexOf(name);
  const points = archiveLines.slice(1).map((line) => {
    const cells = line.split(',');

    return {
      id: cells[column('id')]!,
      line,
      genome: [],
      objectives: [
        -Number(cells[column(`net_${selectionBps}bp`)]) / 100000,
        Number(cells[column(`minute_dd_${selectionBps}bp`)]) / 100000
      ],
      violation: Number(cells[column('violation')]),
      stage: cells[column('stage')]!
    };
  });
  const searched = points.filter((point) => point.stage !== 'neighborhood' && point.stage !== 'perturbation');
  const ranks = paretoRanks2d(searched);
  const front = searched
    .filter((point) => ranks.get(point.id) === 0)
    .sort((a, b) => a.objectives[0]! - b.objectives[0]!);

  await fs.writeFile(path.join(researchDir, 'MINUTE_WALK_FORWARD_RESULTS.md'), walkForward.markdown);
  await fs.writeFile(path.join(researchDir, 'MINUTE_TOP_CANDIDATES.md'), top);
  await fs.writeFile(path.join(researchDir, 'minute_top_candidates.json'), `${JSON.stringify(json, null, 1)}\n`);
  await fs.writeFile(
    path.join(researchDir, 'minute_top_candidates.csv'),
    `${[csvHeader.join(','), ...csvRows].join('\n')}\n`
  );
  await fs.writeFile(
    path.join(researchDir, 'minute_pareto_archive.csv'),
    `${[archiveLines[0], ...front.map((point) => point.line)].join('\n')}\n`
  );
  await fs.writeFile(
    path.join(researchDir, 'walk_forward.json'),
    `${JSON.stringify(
      {
        experiment: id,
        verdicts: walkForward.verdicts,
        folds: loaded.folds.map(({ training, validation }) => ({
          fold: training.runId,
          training: training.window,
          validation: validation.window,
          rankOne: training.shortlist[0]
            ? { id: training.shortlist[0].id, params: training.shortlist[0].params }
            : null,
          entries: validation.entries.map((entry) => ({
            role: entry.role,
            rank: entry.rank,
            id: entry.id,
            params: entry.params,
            net: entry.metrics.levels.map((level) => ({
              bps: level.bps,
              netProfit: level.netProfit,
              minuteDrawdown: level.minuteDrawdown,
              dailyDrawdown: level.dailyDrawdown
            })),
            nextOpenNet: entry.nextOpen.levels.map((level) => ({ bps: level.bps, netProfit: level.netProfit })),
            trades: entry.metrics.entries,
            exposure: entry.metrics.exposure
          }))
        }))
      },
      null,
      1
    )}\n`
  );
  log(
    `Wrote reports for ${id}: rank 1 ${final.shortlist[0] ? describeParams(space, final.shortlist[0].params) : 'none'}; walk-forward verdict at ${selectionBps} bp: ${walkForward.verdicts.find((verdict) => verdict.bps === selectionBps)!.verdict}`
  );
};

// Grid points per parameter, for the design report.
export const gridPoints = () => space.specs.map((spec) => ({ key: spec.key, points: gridSize(spec) }));

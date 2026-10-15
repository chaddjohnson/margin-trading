// Reports generated from saved run records only; nothing here simulates or reads prices beyond the
// research end. Labels distinguish in-sample (training), development (the 2014-2023 final run, in-sample
// for the shortlisted candidates) and out-of-sample (walk-forward validation years).
import fs from 'fs-extra';
import path from 'node:path';
import { type AllInParams, originalParams } from '../app/allIn-optimizable.ts';
import type { Manifest } from './data/prepare.ts';
import type { Metrics } from './evaluate.ts';
import type { ExperimentConfig, ShortlistCandidate, SymbolRecord, TrainingRunRecord } from './experiment.ts';
import { type ParamSpec, formatParamValue, gridSize } from './params.ts';
import { researchSeries } from './series.ts';
import { requiredUniverse } from './universe.ts';

export interface LoadedSymbol {
  symbol: string;
  record?: SymbolRecord;
  folds: TrainingRunRecord[];
  final?: TrainingRunRecord;
  controls: TrainingRunRecord[];
}

export interface LoadedExperiment {
  outDir: string;
  config: ExperimentConfig;
  symbols: LoadedSymbol[];
  runManifest?: Record<string, unknown>;
}

export const loadExperiment = async (outDir: string): Promise<LoadedExperiment> => {
  const config = (await fs.readJson(path.join(outDir, 'experiment.json'))) as ExperimentConfig;
  const symbols: LoadedSymbol[] = [];

  for (const symbol of config.symbols) {
    const dir = path.join(outDir, symbol);
    const loaded: LoadedSymbol = { symbol, folds: [], controls: [] };
    const recordFile = path.join(dir, 'symbol.json');

    if (await fs.pathExists(recordFile)) {
      loaded.record = (await fs.readJson(recordFile)) as SymbolRecord;
    }

    for (const fold of config.protocol.folds) {
      const file = path.join(dir, fold.id, 'run.json');

      if (await fs.pathExists(file)) {
        loaded.folds.push((await fs.readJson(file)) as TrainingRunRecord);
      }
    }

    const finalFile = path.join(dir, config.protocol.final.id, 'run.json');

    if (await fs.pathExists(finalFile)) {
      loaded.final = (await fs.readJson(finalFile)) as TrainingRunRecord;
    }

    for (let seed = 0; seed < config.controlSeeds; seed++) {
      for (const sampler of ['sobol', 'random']) {
        const file = path.join(dir, `control-${sampler}-${seed}`, 'run.json');

        if (await fs.pathExists(file)) {
          loaded.controls.push((await fs.readJson(file)) as TrainingRunRecord);
        }
      }
    }

    symbols.push(loaded);
  }

  const manifestFile = path.join(outDir, 'run-manifest.json');

  return {
    outDir,
    config,
    symbols,
    runManifest: (await fs.pathExists(manifestFile)) ? await fs.readJson(manifestFile) : undefined
  };
};

export const money = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value)
    ? 'n/a'
    : `${value < 0 ? '-' : ''}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`;

export const percent = (value: number | undefined, digits = 1) =>
  value === undefined || !Number.isFinite(value) ? 'n/a' : `${(value * 100).toFixed(digits)}%`;

const ratio = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : value > 0 ? '∞' : 'n/a');

const groupOf = (symbol: string) =>
  requiredUniverse.find((member) => member.symbol === symbol)?.group ?? 'Supplemental';

const shortLabels: Record<keyof AllInParams, string> = {
  dipTenths: 'dip',
  trailingStopTenths: 'stop',
  maximumHoldDays: 'hold (cal. days)',
  lookbackSessions: 'lookback (sessions)',
  materialLossTenths: 'material loss',
  lowerReentryTenths: 're-entry decline',
  retraceTenths: 'reset retrace'
};

const paramCells = (specs: ParamSpec[], params: AllInParams) =>
  specs.map((spec) => formatParamValue(spec, params[spec.key]));

const compactParams = (specs: ParamSpec[], params: AllInParams) =>
  specs.map((spec) => `${shortLabels[spec.key].split(' ')[0]} ${formatParamValue(spec, params[spec.key])}`).join(', ');

// Sensitivity to assumptions the original does not model, computed from recorded totals (approximate):
// a per-side cost on the $100,000 notional, and margin rates other than 11%.
export const sensitivity = (metrics: Metrics, allocation: number, marginRate = 0.11) => ({
  netAt5bpsPerSide: metrics.netProfit - metrics.entries * 2 * 0.0005 * allocation,
  netAt10bpsPerSide: metrics.netProfit - metrics.entries * 2 * 0.001 * allocation,
  netAtMargin8: metrics.grossProfit - metrics.interest * (0.08 / marginRate),
  netAtMargin14: metrics.grossProfit - metrics.interest * (0.14 / marginRate)
});

const originLabel = (origin: ShortlistCandidate['origin']) =>
  origin.stage === 'ga'
    ? `GA run ${origin.run} gen ${origin.generation}`
    : origin.stage === 'sobol' || origin.stage === 'random'
      ? `${origin.stage} #${origin.index}`
      : origin.stage;

const table = (header: string[], rows: string[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');

const diffFromOriginal = (specs: ParamSpec[], params: AllInParams) => {
  const changes = specs
    .filter((spec) => params[spec.key] !== originalParams[spec.key])
    .map(
      (spec) =>
        `${shortLabels[spec.key]} ${formatParamValue(spec, params[spec.key])} (original ${formatParamValue(spec, originalParams[spec.key])})`
    );

  return changes.length ? changes.join('; ') : 'identical to the original defaults';
};

const candidateRow = (specs: ParamSpec[], entry: ShortlistCandidate, allocation: number) => {
  const metrics = entry.metrics;

  return [
    `${entry.rank}${entry.rank === 1 ? ' (primary)' : ''}`,
    `\`${entry.id}\``,
    ...paramCells(specs, entry.params),
    money(metrics.netProfit),
    money(metrics.grossProfit),
    money(metrics.interest),
    `${money(metrics.maximumDrawdown)} (${percent(metrics.maximumDrawdown / allocation, 0)})`,
    String(metrics.entries),
    percent(metrics.winRate, 0),
    ratio(metrics.profitFactor),
    money(metrics.medianTrade),
    money(metrics.worstTrade),
    percent(metrics.exposure, 0),
    Number.isFinite(metrics.medianHoldDays) ? metrics.medianHoldDays.toFixed(0) : 'n/a',
    percent(entry.positiveYearShare, 0),
    money(entry.merit),
    money(entry.neighbourhood.netMedian),
    String(entry.meritRank),
    String(entry.paretoRank + 1),
    originLabel(entry.origin),
    entry.inclusion
  ];
};

// Bounds that are limits of the parameter's meaning rather than choices: nothing lies beyond them.
const naturalBounds: Partial<Record<keyof AllInParams, { min?: true; max?: true }>> = {
  maximumHoldDays: { min: true },
  materialLossTenths: { min: true },
  lowerReentryTenths: { min: true },
  retraceTenths: { min: true, max: true }
};

// Parameters within one neighbourhood radius of a chosen search bound: the optimum may lie outside the
// searched range.
export const nearBounds = (specs: ParamSpec[], params: AllInParams) =>
  specs.flatMap((spec) => {
    const margin = spec.neighborhoodRadius * spec.step;
    const natural = naturalBounds[spec.key] ?? {};
    const value = params[spec.key];
    const bound =
      value - spec.min < margin && !natural.min
        ? spec.min
        : spec.max - value < margin && !natural.max
          ? spec.max
          : undefined;

    return bound === undefined
      ? []
      : [`${shortLabels[spec.key]} ${formatParamValue(spec, value)} (bound ${formatParamValue(spec, bound)})`];
  });

// ---------------------------------------------------------------------------------------------------------
// Top candidates

export const topCandidatesData = (experiment: LoadedExperiment) => {
  const { config } = experiment;
  const specs = config.space.specs;

  return experiment.symbols.map((symbol) => {
    const final = symbol.final;

    return {
      symbol: symbol.symbol,
      group: groupOf(symbol.symbol),
      status: final ? (final.shortlist.length ? 'ranked' : 'no feasible candidates') : 'not run',
      eligibility: symbol.record?.foldEligibility ?? {},
      developmentWindow: final
        ? {
            start: final.window.firstSession,
            end: final.window.lastSession,
            sessions: final.window.endIndex - final.window.startIndex + 1
          }
        : undefined,
      requestedN: config.selection.topN,
      distinctFeasible: final?.selection.passedAll,
      evaluated: final?.archiveSize,
      gated: final?.selection.gated,
      notes: final?.selection.notes ?? [],
      measureClass: 'development (2014-2023 in-sample for these candidates; not out-of-sample evidence)',
      original: final ? { params: final.baseline.params, metrics: final.baseline.metrics } : undefined,
      candidates: (final?.shortlist ?? []).map((entry) => ({
        symbol: symbol.symbol,
        rank: entry.rank,
        status: entry.rank === 1 ? 'primary (frozen before holdout)' : 'alternative (not independently validated)',
        id: entry.id,
        params: entry.params,
        paramsDisplay: Object.fromEntries(
          specs.map((spec) => [spec.key, formatParamValue(spec, entry.params[spec.key])])
        ),
        origin: entry.origin,
        paretoFront: entry.paretoRank + 1,
        objectives: entry.objectives,
        merit: entry.merit,
        meritRank: entry.meritRank,
        inclusion: entry.inclusion,
        behaviouralDuplicates: entry.behaviouralDuplicates,
        reason: entry.reason,
        positiveYearShare: entry.positiveYearShare,
        neighbourhood: entry.neighbourhood,
        constraintViolation: entry.violation,
        development: entry.metrics,
        sensitivity: sensitivity(entry.metrics, config.fitness.allocation),
        nearBounds: nearBounds(specs, entry.params),
        tradeLog: path.join(config.protocol.final.id, `rank${entry.rank}-${entry.id}-trades.csv`)
      }))
    };
  });
};

export const writeTopCandidates = async (experiment: LoadedExperiment, researchDir: string) => {
  const { config } = experiment;
  const specs = config.space.specs;
  const data = topCandidatesData(experiment);
  const allocation = config.fitness.allocation;
  const relResults = path.relative(researchDir, experiment.outDir);

  await fs.writeFile(
    path.join(researchDir, 'top_candidates.json'),
    `${JSON.stringify({ experiment: config.id, selection: config.selection, fitness: config.fitness, symbols: data }, null, 1)}\n`
  );

  const csvHeader = [
    'symbol',
    'rank',
    'status',
    'id',
    ...specs.map((spec) => spec.key),
    ...specs.map((spec) => `${spec.key}_display`),
    'origin',
    'pareto_front',
    'merit_neighbourhood_p25_net',
    'merit_rank',
    'inclusion',
    'behavioural_duplicates',
    'dev_net_profit',
    'dev_gross_profit',
    'dev_interest',
    'dev_max_drawdown',
    'dev_entries',
    'dev_win_rate',
    'dev_profit_factor',
    'dev_median_trade',
    'dev_worst_trade',
    'dev_exposure',
    'dev_median_hold_days',
    'dev_positive_year_share',
    'nbr_net_median',
    'nbr_drawdown_median',
    'constraint_violation',
    'net_at_5bps_per_side',
    'net_at_margin_14pct',
    'near_bounds',
    'measure_class'
  ];
  const csvLines = [csvHeader.join(',')];

  for (const symbol of data) {
    for (const candidate of symbol.candidates) {
      const metrics = candidate.development;

      csvLines.push(
        [
          symbol.symbol,
          candidate.rank,
          candidate.status,
          candidate.id,
          ...specs.map((spec) => candidate.params[spec.key]),
          ...specs.map((spec) => candidate.paramsDisplay[spec.key]),
          originLabel(candidate.origin),
          candidate.paretoFront,
          candidate.merit,
          candidate.meritRank,
          candidate.inclusion,
          candidate.behaviouralDuplicates,
          metrics.netProfit,
          metrics.grossProfit,
          metrics.interest,
          metrics.maximumDrawdown,
          metrics.entries,
          metrics.winRate,
          metrics.profitFactor,
          metrics.medianTrade,
          metrics.worstTrade,
          metrics.exposure,
          metrics.medianHoldDays,
          candidate.positiveYearShare,
          candidate.neighbourhood.netMedian,
          candidate.neighbourhood.drawdownMedian,
          candidate.constraintViolation,
          candidate.sensitivity.netAt5bpsPerSide,
          candidate.sensitivity.netAtMargin14,
          candidate.nearBounds.join('; '),
          'development-in-sample'
        ]
          .map((value) =>
            typeof value === 'string' && /[",]/.test(value) ? `"${value.replaceAll('"', '""')}"` : String(value)
          )
          .join(',')
      );
    }
  }

  await fs.writeFile(path.join(researchDir, 'top_candidates.csv'), `${csvLines.join('\n')}\n`);

  // Non-dominated archives of the final development runs, all symbols.
  const archiveLines = [
    [
      'symbol',
      'id',
      ...specs.map((spec) => spec.key),
      'net_profit',
      'max_drawdown',
      'entries',
      'interest',
      'origin'
    ].join(',')
  ];

  for (const symbol of experiment.symbols) {
    const file = path.join(experiment.outDir, symbol.symbol, config.protocol.final.id, 'pareto-front.json');

    if (!(await fs.pathExists(file))) {
      continue;
    }

    for (const row of (await fs.readJson(file)) as {
      id: string;
      params: AllInParams;
      netProfit: number;
      maximumDrawdown: number;
      entries: number;
      interest: number;
      origin: ShortlistCandidate['origin'];
    }[]) {
      archiveLines.push(
        [
          symbol.symbol,
          row.id,
          ...specs.map((spec) => row.params[spec.key]),
          row.netProfit,
          row.maximumDrawdown,
          row.entries,
          row.interest,
          originLabel(row.origin)
        ].join(',')
      );
    }
  }

  await fs.writeFile(path.join(researchDir, 'nondominated_archive.csv'), `${archiveLines.join('\n')}\n`);

  const lines: string[] = [];

  lines.push('# Top candidate phenotypes per symbol', '');
  lines.push(
    `Experiment \`${config.id}\`, seed \`${config.seed}\`. Each symbol's shortlist comes from its **final development run on ${config.protocol.final.train.start} to ${config.protocol.final.train.end} only** (${config.search.samples.toLocaleString('en-US')} ${config.search.sampler} candidates, then ${config.search.gaRuns} NSGA-II runs), ranked by the pre-declared policy in [OPTIMIZER_DESIGN.md](OPTIMIZER_DESIGN.md#selection-policy). N = ${config.selection.topN}.`,
    '',
    '**How to read this**',
    '',
    '- **Rank 1 is the primary configuration**, frozen before any 2024–2026 data was read. Ranks 2–N are alternatives: visible, but not independently validated trading systems, and never promoted on holdout results.',
    `- Every metric here is **development-period performance (2014–2023), in-sample for these candidates**. The years 2019–2023 helped choose them, so they are not fresh out-of-sample evidence for any fixed candidate. Out-of-sample evidence is the walk-forward policy result in [WALK_FORWARD_RESULTS.md](WALK_FORWARD_RESULTS.md), which is for the selection procedure, not for these exact vectors.`,
    `- Money is per $${allocation.toLocaleString('en-US')} margin-financed trading allocation, net of 11% simple margin interest, with no commissions or spread (as in the original). Max DD is the largest fall of the daily mark-to-market P&L (unrealized losses and accrued interest included) from its running peak; the percentage is of the allocation. It is a strategy-level figure, not an account or portfolio drawdown.`,
    '- Merit = lower-quartile net P&L over the candidate and its 14 one-step parameter neighbours (robustness). "Nbr median" = their median. Pareto = front on (net P&L, drawdown) among gated candidates (1 = non-dominated). "+yrs" = share of calendar years with non-negative P&L.',
    '- "diversity relaxed" marks an entry added after the distinct-parameter pass came up short: it trades differently but lies within 4 neighbourhood steps of a higher-ranked entry.',
    `- Trade logs: \`${relResults}/<SYMBOL>/${config.protocol.final.id}/rank<k>-<id>-trades.csv\`; rank 1 also has an equity curve (\`rank1-<id>-equity.csv\`). Non-dominated archive: [nondominated_archive.csv](nondominated_archive.csv). Machine-readable: [top_candidates.json](top_candidates.json), [top_candidates.csv](top_candidates.csv).`,
    ''
  );

  lines.push('## All symbols', '');
  lines.push(
    table(
      [
        'Symbol',
        'Group',
        'Status',
        'Distinct feasible',
        'Shortlist',
        'Rank-1 parameters',
        'Rank-1 dev net',
        'Rank-1 dev max DD',
        'Rank-1 trades',
        'Original dev net',
        'Original dev max DD'
      ],
      data.map((symbol) => {
        const first = symbol.candidates[0];

        return [
          symbol.symbol,
          symbol.group,
          symbol.status,
          String(symbol.distinctFeasible ?? '-'),
          `${symbol.candidates.length}/${symbol.requestedN}`,
          first ? compactParams(specs, first.params) : '-',
          money(first?.development.netProfit),
          money(first?.development.maximumDrawdown),
          String(first?.development.entries ?? '-'),
          money(symbol.original?.metrics.netProfit),
          money(symbol.original?.metrics.maximumDrawdown)
        ];
      })
    ),
    ''
  );

  const header = [
    'Rank',
    'ID',
    ...specs.map((spec) => shortLabels[spec.key]),
    'Net',
    'Gross',
    'Interest',
    'Max DD',
    'Trades',
    'Win',
    'PF',
    'Median trade',
    'Worst trade',
    'Exposure',
    'Median hold (d)',
    '+yrs',
    'Merit',
    'Nbr median',
    'Merit rank',
    'Pareto',
    'Origin',
    'Inclusion'
  ];

  for (const symbol of data) {
    const loaded = experiment.symbols.find((entry) => entry.symbol === symbol.symbol)!;
    const final = loaded.final;

    lines.push(`## ${symbol.symbol} (${symbol.group})`, '');

    if (!final) {
      lines.push(`Not run: ${JSON.stringify(symbol.eligibility)}`, '');
      continue;
    }

    lines.push(
      `Development window ${symbol.developmentWindow?.start} to ${symbol.developmentWindow?.end} (${symbol.developmentWindow?.sessions} sessions). ${final.archiveSize.toLocaleString('en-US')} distinct candidates evaluated, ${final.selection.gated.toLocaleString('en-US')} passed the gates, ${final.selection.passedAll} were scored for robustness. Rejections (a candidate can fail several): ${Object.entries(
        final.selection.rejectionCounts
      )
        .map(([gate, count]) => `${gate} ${count.toLocaleString('en-US')}`)
        .join(', ')}.`,
      ''
    );

    if (final.shortlist.length === 0) {
      lines.push('**No candidate passed every gate. There is no primary configuration for this symbol.**', '');
      continue;
    }

    const first = final.shortlist[0]!;

    lines.push(
      `**Primary (rank 1)**: ${compactParams(specs, first.params)}. Versus the original VGT defaults: ${diffFromOriginal(specs, first.params)}.`,
      ''
    );

    const bounded = nearBounds(specs, first.params);

    if (bounded.length) {
      lines.push(
        `> Rank 1 has parameters within one neighbourhood radius of a chosen search bound: ${bounded.join('; ')}. The best value may lie outside the searched range; the bounds were fixed before the run and were not widened afterwards.`,
        ''
      );
    }

    for (const note of final.selection.notes) {
      lines.push(`> ${note}`, '');
    }

    lines.push(
      table(
        header,
        final.shortlist.map((entry) => candidateRow(specs, entry, allocation))
      ),
      ''
    );
    lines.push(
      `Original defaults over the same window (for reference): net ${money(final.baseline.metrics.netProfit)}, max DD ${money(final.baseline.metrics.maximumDrawdown)}, ${final.baseline.metrics.entries} trades, interest ${money(final.baseline.metrics.interest)}.`,
      ''
    );

    const years = [...new Set(final.shortlist.flatMap((entry) => entry.metrics.years.map((year) => year.year)))].sort();

    lines.push('Development net P&L by calendar year (in-sample):', '');
    lines.push(
      table(
        ['Rank', ...years.map(String)],
        [
          ...final.shortlist.map((entry) => [
            String(entry.rank),
            ...years.map((year) => money(entry.metrics.years.find((item) => item.year === year)?.netProfit))
          ]),
          [
            'original',
            ...years.map((year) => money(final.baseline.metrics.years.find((item) => item.year === year)?.netProfit))
          ]
        ]
      ),
      ''
    );

    lines.push('Sensitivity (approximate, from totals; not used for ranking):', '');
    lines.push(
      table(
        ['Rank', 'Net as modeled', '5 bps/side cost', '10 bps/side cost', 'Margin 8%', 'Margin 14%'],
        final.shortlist.map((entry) => {
          const values = sensitivity(entry.metrics, allocation);

          return [
            String(entry.rank),
            money(entry.metrics.netProfit),
            money(values.netAt5bpsPerSide),
            money(values.netAt10bpsPerSide),
            money(values.netAtMargin8),
            money(values.netAtMargin14)
          ];
        })
      ),
      ''
    );

    lines.push('Why each entry is included:', '');

    for (const entry of final.shortlist) {
      lines.push(
        `- **#${entry.rank}** \`${entry.id}\`: ${entry.reason}${entry.behaviouralDuplicates ? ` ${entry.behaviouralDuplicates} other pool members produced exactly the same trades.` : ''}${entry.metrics.entries < 2 * config.fitness.minTradesPerYear * final.window.years ? ' Caveat: few trades.' : ''}`
      );
    }

    lines.push('');
  }

  const text = `${lines.join('\n')}\n`;

  await fs.writeFile(path.join(researchDir, 'TOP_CANDIDATES.md'), text);

  return data;
};

// ---------------------------------------------------------------------------------------------------------
// Walk-forward

const normalizedRange = (spec: ParamSpec, values: number[]) =>
  values.length > 1 ? (Math.max(...values) - Math.min(...values)) / ((gridSize(spec) - 1) * spec.step) : 0;

export const walkForwardData = (experiment: LoadedExperiment) => {
  const { config } = experiment;
  const specs = config.space.specs;

  return experiment.symbols.map((symbol) => {
    const folds = symbol.folds.map((fold) => ({
      fold: fold.runId,
      train: { start: fold.window.firstSession, end: fold.window.lastSession },
      validation: fold.validation
        ? { start: fold.validation.window.firstSession, end: fold.validation.window.lastSession }
        : undefined,
      rank1: fold.shortlist[0] ? { id: fold.shortlist[0].id, params: fold.shortlist[0].params } : undefined,
      inSample: fold.shortlist[0]?.metrics,
      inSampleOriginal: fold.baseline.metrics,
      outOfSample: fold.validation?.rank1?.metrics,
      outOfSampleOriginal: fold.validation?.original,
      outOfSampleShortlist:
        fold.validation?.shortlist.map((entry) => ({
          rank: entry.rank,
          net: entry.metrics.netProfit,
          drawdown: entry.metrics.maximumDrawdown,
          entries: entry.metrics.entries
        })) ?? [],
      policyAbstained: fold.validation?.policyAbstained ?? true,
      shortlistSize: fold.shortlist.length
    }));
    const outOfSample = folds.map((fold) => fold.outOfSample?.netProfit ?? 0);
    const outOfSampleOriginal = folds.map((fold) => fold.outOfSampleOriginal?.netProfit ?? 0);
    const rank1Params = folds.flatMap((fold) => (fold.rank1 ? [fold.rank1.params] : []));
    const stability = Object.fromEntries(
      specs.map((spec) => [
        spec.key,
        {
          values: rank1Params.map((params) => params[spec.key]),
          normalizedRange: normalizedRange(
            spec,
            rank1Params.map((params) => params[spec.key])
          )
        }
      ])
    );
    const stabilityScore = specs.length
      ? specs.reduce((total, spec) => total + stability[spec.key]!.normalizedRange, 0) / specs.length
      : 0;
    const positiveFolds = folds.filter((fold) => (fold.outOfSample?.netProfit ?? 0) > 0).length;
    const policyTotal = outOfSample.reduce((total, value) => total + value, 0);
    const originalTotal = outOfSampleOriginal.reduce((total, value) => total + value, 0);
    const beatOriginal = folds.filter(
      (fold) => (fold.outOfSample?.netProfit ?? 0) > (fold.outOfSampleOriginal?.netProfit ?? 0)
    ).length;
    const evaluatedFolds = folds.filter((fold) => fold.validation).length;
    const consistent =
      evaluatedFolds === config.protocol.folds.length &&
      positiveFolds >= config.protocol.folds.length - 1 &&
      policyTotal > originalTotal &&
      stabilityScore <= 0.3;
    const classification =
      evaluatedFolds === 0
        ? 'not evaluated'
        : consistent
          ? 'consistent out-of-sample evidence'
          : policyTotal > 0
            ? 'mixed'
            : 'insufficient or negative';

    return {
      symbol: symbol.symbol,
      group: groupOf(symbol.symbol),
      folds,
      aggregate: {
        evaluatedFolds,
        policyOutOfSampleNet: policyTotal,
        originalOutOfSampleNet: originalTotal,
        positiveFolds,
        foldsBeatingOriginal: beatOriginal,
        policyTrades: folds.reduce((total, fold) => total + (fold.outOfSample?.entries ?? 0), 0),
        originalTrades: folds.reduce((total, fold) => total + (fold.outOfSampleOriginal?.entries ?? 0), 0),
        worstYearDrawdown: Math.max(0, ...folds.map((fold) => fold.outOfSample?.maximumDrawdown ?? 0)),
        abstentions: folds.filter((fold) => fold.policyAbstained).length
      },
      stability,
      stabilityScore,
      classification
    };
  });
};

const correlationClusters = async (
  manifest: Manifest,
  symbols: string[],
  start: string,
  end: string,
  threshold: number
) => {
  const returns = new Map<string, Map<string, number>>();

  for (const symbol of symbols) {
    if (manifest.entries[symbol]?.status !== 'ok') {
      continue;
    }

    const series = await researchSeries(symbol, manifest, end);
    const map = new Map<string, number>();

    for (let index = 1; index < series.dates.length; index++) {
      const date = series.dates[index]!;

      if (date >= start && date <= end) {
        map.set(date, series.close[index]! / series.close[index - 1]! - 1);
      }
    }

    returns.set(symbol, map);
  }

  const names = [...returns.keys()];
  const correlation = (a: string, b: string) => {
    const x: number[] = [];
    const y: number[] = [];

    for (const [date, value] of returns.get(a)!) {
      const other = returns.get(b)!.get(date);

      if (other !== undefined) {
        x.push(value);
        y.push(other);
      }
    }

    const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
    const mx = mean(x);
    const my = mean(y);
    let sxy = 0;
    let sxx = 0;
    let syy = 0;

    for (let index = 0; index < x.length; index++) {
      sxy += (x[index]! - mx) * (y[index]! - my);
      sxx += (x[index]! - mx) ** 2;
      syy += (y[index]! - my) ** 2;
    }

    return sxy / Math.sqrt(sxx * syy);
  };
  const matrix: Record<string, Record<string, number>> = {};

  for (const a of names) {
    matrix[a] = {};

    for (const b of names) {
      matrix[a]![b] = a === b ? 1 : correlation(a, b);
    }
  }

  // Connected components at the threshold.
  const clusters: string[][] = [];
  const seen = new Set<string>();

  for (const name of names) {
    if (seen.has(name)) {
      continue;
    }

    const cluster: string[] = [];
    const stack = [name];

    seen.add(name);

    while (stack.length) {
      const current = stack.pop()!;

      cluster.push(current);

      for (const other of names) {
        if (!seen.has(other) && matrix[current]![other]! >= threshold) {
          seen.add(other);
          stack.push(other);
        }
      }
    }

    clusters.push(cluster.sort((a, b) => names.indexOf(a) - names.indexOf(b)));
  }

  return { matrix, clusters, threshold };
};

const controlData = (experiment: LoadedExperiment) =>
  experiment.symbols
    .filter((symbol) => symbol.controls.length)
    .map((symbol) => {
      const bySampler = (sampler: string) => symbol.controls.filter((control) => control.search.sampler === sampler);
      const summarize = (runs: TrainingRunRecord[]) => {
        const mean = (values: number[]) =>
          values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
        const sd = (values: number[]) => {
          const m = mean(values);

          return Math.sqrt(
            values.reduce((total, value) => total + (value - m) ** 2, 0) / Math.max(1, values.length - 1)
          );
        };
        const explorationHv = runs.map((run) => run.explorationHypervolume);
        const archiveHv = runs.map((run) => run.archiveHypervolume);
        const merit = runs.map((run) => run.shortlist[0]?.merit ?? NaN).filter(Number.isFinite);
        const best = runs.map((run) => run.bestGatedNet ?? NaN).filter(Number.isFinite);

        return {
          runs: runs.length,
          simulations: mean(runs.map((run) => run.simulations)),
          explorationHypervolume: { mean: mean(explorationHv), sd: sd(explorationHv) },
          archiveHypervolume: { mean: mean(archiveHv), sd: sd(archiveHv) },
          rank1Merit: { mean: mean(merit), sd: sd(merit) },
          bestGatedNet: { mean: mean(best), sd: sd(best) }
        };
      };

      return { symbol: symbol.symbol, sobol: summarize(bySampler('sobol')), random: summarize(bySampler('random')) };
    });

export const writeWalkForward = async (experiment: LoadedExperiment, researchDir: string, manifest: Manifest) => {
  const { config } = experiment;
  const specs = config.space.specs;
  const data = walkForwardData(experiment);
  const controls = controlData(experiment);
  const clusters = await correlationClusters(
    manifest,
    config.symbols,
    config.protocol.final.train.start,
    config.protocol.final.train.end,
    0.85
  );

  await fs.writeFile(
    path.join(researchDir, 'walk_forward.json'),
    `${JSON.stringify({ experiment: config.id, symbols: data, controls, correlation: clusters }, null, 1)}\n`
  );

  const lines: string[] = [];
  const foldNames = config.protocol.folds.map((fold) => fold.id.replace('fold-', ''));

  lines.push('# Walk-forward results', '');
  lines.push(
    `Experiment \`${config.id}\`. For each validation year Y in ${foldNames.join(', ')}, the full search (${config.search.samples.toLocaleString('en-US')} Sobol candidates plus ${config.search.gaRuns} NSGA-II runs) and the selection policy were run on ${config.protocol.folds[0]?.train.start} to Y-1 only; the resulting rank-1 parameters were then simulated on year Y. Each validation year starts flat (no position, no restriction), with earlier sessions used only as reference-high history; a position open on the last session is marked to market net of accrued interest.`,
    '',
    "**What this measures.** These are out-of-sample results for the *selection procedure* (re-optimizing each year), not for any single fixed parameter set. The final shortlist in [TOP_CANDIDATES.md](TOP_CANDIDATES.md) was chosen after using all of 2014–2023, so its 2019–2023 numbers are development (in-sample) numbers and must not be read as this table's out-of-sample results.",
    '',
    "**Evidence classes (declared before the full run).** *Consistent out-of-sample evidence*: all five folds evaluated, at least four with positive out-of-sample P&L, total out-of-sample P&L above the original parameters' total over the same years, and a parameter-stability score ≤ 0.30. *Mixed*: positive total but not all of that. *Insufficient or negative*: total ≤ 0. The stability score is the mean, over the seven parameters, of (max − min of the fold rank-1 values) / (parameter range); 0 = identical every year, 1 = spanning the whole range.",
    ''
  );

  lines.push('## Summary across symbols', '');
  lines.push(
    table(
      [
        'Symbol',
        'Group',
        'Policy OOS net 2019–2023',
        'Original OOS net',
        'Positive folds',
        'Folds beating original',
        'Policy OOS trades',
        'Worst OOS-year max DD',
        'Stability score',
        'Classification'
      ],
      data.map((symbol) => [
        symbol.symbol,
        symbol.group,
        money(symbol.aggregate.policyOutOfSampleNet),
        money(symbol.aggregate.originalOutOfSampleNet),
        `${symbol.aggregate.positiveFolds}/${symbol.aggregate.evaluatedFolds}`,
        `${symbol.aggregate.foldsBeatingOriginal}/${symbol.aggregate.evaluatedFolds}`,
        String(symbol.aggregate.policyTrades),
        money(symbol.aggregate.worstYearDrawdown),
        symbol.stabilityScore.toFixed(2),
        symbol.classification
      ])
    ),
    ''
  );

  const totals = data.reduce(
    (total, symbol) => ({
      policy: total.policy + symbol.aggregate.policyOutOfSampleNet,
      original: total.original + symbol.aggregate.originalOutOfSampleNet,
      beat: total.beat + (symbol.aggregate.policyOutOfSampleNet > symbol.aggregate.originalOutOfSampleNet ? 1 : 0),
      positive: total.positive + (symbol.aggregate.policyOutOfSampleNet > 0 ? 1 : 0),
      consistent: total.consistent + (symbol.classification === 'consistent out-of-sample evidence' ? 1 : 0)
    }),
    { policy: 0, original: 0, beat: 0, positive: 0, consistent: 0 }
  );

  lines.push(
    `Across ${data.length} symbols (measured): the re-optimizing policy earned ${money(totals.policy)} out of sample in total, against ${money(totals.original)} for the unchanged original parameters over the same validation years. The policy beat the original on ${totals.beat} of ${data.length} symbols, was positive on ${totals.positive}, and met the "consistent" bar on ${totals.consistent}.`,
    ''
  );

  lines.push('## Correlation: the symbols are not independent', '');
  lines.push(
    `Daily close-to-close return correlations over ${config.protocol.final.train.start} to ${config.protocol.final.train.end}; symbols joined when any pair in a chain has ρ ≥ ${clusters.threshold}. Agreement within a cluster is close to a single observation, not several.`,
    ''
  );

  for (const cluster of clusters.clusters) {
    lines.push(`- ${cluster.join(', ')}`);
  }

  lines.push('');

  lines.push('## Sobol versus random exploration (control)', '');
  lines.push(
    `On each symbol's final 2014–2023 window, ${config.controlSeeds} independent seeds each of (a) ${config.search.samples.toLocaleString('en-US')} scrambled Sobol candidates and (b) ${config.search.samples.toLocaleString('en-US')} uniform pseudo-random candidates, each followed by the identical NSGA-II (same population, generations and per-run evaluation cap; early stopping off so both use the full budget) and the identical selection. Hypervolume is the area dominated by feasible, profitable points in (net P&L / allocation, drawdown / allocation) with reference point (0, ${config.fitness.drawdownLimit}). Means ± standard deviation across seeds.`,
    ''
  );

  if (controls.length) {
    const pm = (value: { mean: number; sd: number }, scale = 1, digits = 4) =>
      `${(value.mean * scale).toFixed(digits)} ± ${(value.sd * scale).toFixed(digits)}`;

    lines.push(
      table(
        [
          'Symbol',
          'Exploration HV Sobol',
          'Exploration HV random',
          'Final HV Sobol',
          'Final HV random',
          'Rank-1 merit Sobol',
          'Rank-1 merit random',
          'Simulations Sobol / random'
        ],
        controls.map((control) => [
          control.symbol,
          pm(control.sobol.explorationHypervolume),
          pm(control.random.explorationHypervolume),
          pm(control.sobol.archiveHypervolume),
          pm(control.random.archiveHypervolume),
          `${money(control.sobol.rank1Merit.mean)} ± ${money(control.sobol.rank1Merit.sd)}`,
          `${money(control.random.rank1Merit.mean)} ± ${money(control.random.rank1Merit.sd)}`,
          `${Math.round(control.sobol.simulations)} / ${Math.round(control.random.simulations)}`
        ])
      ),
      ''
    );

    const count = (pick: (control: (typeof controls)[number]) => [number, number]) =>
      controls.filter((control) => {
        const [sobol, random] = pick(control);

        return sobol > random;
      }).length;
    const material = (
      pick: (control: (typeof controls)[number]) => [{ mean: number; sd: number }, { mean: number; sd: number }]
    ) =>
      controls.filter((control) => {
        const [sobol, random] = pick(control);
        const se = Math.sqrt((sobol.sd ** 2 + random.sd ** 2) / Math.max(1, config.controlSeeds));

        return Math.abs(sobol.mean - random.mean) > 2 * se;
      }).length;

    lines.push(
      `Sobol had the higher mean on: exploration hypervolume ${count((control) => [control.sobol.explorationHypervolume.mean, control.random.explorationHypervolume.mean])}/${controls.length} symbols, final hypervolume ${count((control) => [control.sobol.archiveHypervolume.mean, control.random.archiveHypervolume.mean])}/${controls.length}, rank-1 merit ${count((control) => [control.sobol.rank1Merit.mean, control.random.rank1Merit.mean])}/${controls.length}. Differences larger than twice their standard error: exploration ${material((control) => [control.sobol.explorationHypervolume, control.random.explorationHypervolume])}, final ${material((control) => [control.sobol.archiveHypervolume, control.random.archiveHypervolume])}, merit ${material((control) => [control.sobol.rank1Merit, control.random.rank1Merit])} (with ${config.controlSeeds} seeds this is a coarse check, not a significance test).`,
      ''
    );
  }

  lines.push('## Per symbol', '');

  for (const symbol of data) {
    lines.push(`### ${symbol.symbol} (${symbol.group}): ${symbol.classification}`, '');

    if (symbol.folds.length === 0) {
      const eligibility = experiment.symbols.find((entry) => entry.symbol === symbol.symbol)?.record?.foldEligibility;

      lines.push(`No folds evaluated. ${eligibility ? JSON.stringify(eligibility) : ''}`, '');
      continue;
    }

    lines.push(
      table(
        [
          'Fold',
          'Training (in-sample)',
          'Rank-1 chosen on training',
          'In-sample net / max DD / trades',
          'OOS year net / max DD / trades',
          'Original OOS net / trades',
          'Shortlist OOS median (N)'
        ],
        symbol.folds.map((fold) => {
          const shortlistNets = fold.outOfSampleShortlist.map((entry) => entry.net).sort((a, b) => a - b);
          const medianNet = shortlistNets.length
            ? shortlistNets[Math.floor((shortlistNets.length - 1) / 2)]
            : undefined;

          return [
            fold.fold,
            `${fold.train.start} – ${fold.train.end}`,
            fold.rank1 ? compactParams(specs, fold.rank1.params) : 'none (policy abstains)',
            fold.inSample
              ? `${money(fold.inSample.netProfit)} / ${money(fold.inSample.maximumDrawdown)} / ${fold.inSample.entries}`
              : '-',
            fold.outOfSample
              ? `${money(fold.outOfSample.netProfit)} / ${money(fold.outOfSample.maximumDrawdown)} / ${fold.outOfSample.entries}`
              : 'no trades (abstained)',
            fold.outOfSampleOriginal
              ? `${money(fold.outOfSampleOriginal.netProfit)} / ${fold.outOfSampleOriginal.entries}`
              : '-',
            `${money(medianNet)} (${shortlistNets.length})`
          ];
        })
      ),
      ''
    );

    lines.push(
      `Out-of-sample total ${money(symbol.aggregate.policyOutOfSampleNet)} from ${symbol.aggregate.policyTrades} trades (original parameters ${money(symbol.aggregate.originalOutOfSampleNet)} from ${symbol.aggregate.originalTrades}). Parameter stability score ${symbol.stabilityScore.toFixed(2)}${symbol.stabilityScore > 0.3 ? ' (**unstable**: the chosen parameters move a lot from year to year, a warning even where P&L looks good)' : ''}:`,
      ''
    );
    lines.push(
      table(
        ['Parameter', ...symbol.folds.map((fold) => fold.fold.replace('fold-', '')), 'Normalized range'],
        specs.map((spec) => [
          shortLabels[spec.key],
          ...symbol.folds.map((fold) => (fold.rank1 ? formatParamValue(spec, fold.rank1.params[spec.key]) : '-')),
          symbol.stability[spec.key]!.normalizedRange.toFixed(2)
        ])
      ),
      ''
    );
    lines.push(
      `Trade logs: \`${path.relative(researchDir, experiment.outDir)}/${symbol.symbol}/fold-<year>/validation-rank1-trades.csv\` (and \`-equity.csv\`, \`validation-original-trades.csv\`).`,
      ''
    );
  }

  lines.push('## Limitations', '');
  lines.push(
    '- **The baseline is not clean either.** The original parameters (10% / 8% / 15 days / 90 sessions / 0.5% / 3% / 38%) were chosen by hand in earlier research on VGT and related ETFs over roughly 2016–2025, so their 2019–2023 results are partly in-sample. That favours the original in this comparison, most for VGT and the funds correlated with it; it does not rescue the re-optimizing policy, which loses to the baseline on most symbols, including ones the baseline was never tuned on.',
    '- **Few independent events.** Each validation year holds a handful of trades for most configurations; one or two trades can decide a year. Year counts of 5 are far too few for statistical confidence.',
    '- **Multiple testing and winner\'s curse.** 21 symbols × 6 training runs × roughly 17,000–20,000 candidates each were searched. Some symbols will look good out of sample by chance, and the correlated clusters above make "several symbols agree" weaker than it sounds.',
    '- **Execution idealization.** Entries fill at the signal close (same-close look-ahead) and stops fill exactly at the stop price; there are no commissions or spread. Configurations with tight stops and many trades are the most exposed to this; see the cost sensitivity in TOP_CANDIDATES.md.',
    '- **Adjusted prices.** Stooq back-adjusts for distributions, so P&L includes dividends as if they were price; see DATA_AUDIT.md.',
    '- **Financing.** A constant 11% simple rate is assumed throughout, as in the original; real margin rates varied a lot between 2014 and 2023.',
    '- **Survivorship.** The symbols were picked in 2026 with hindsight (notably the single stocks).',
    ''
  );

  await fs.writeFile(path.join(researchDir, 'WALK_FORWARD_RESULTS.md'), `${lines.join('\n')}\n`);

  return { data, controls, clusters };
};

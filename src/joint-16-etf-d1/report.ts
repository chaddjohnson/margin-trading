// Generated Markdown tables of the study's records (results/tables/*.md), read by the hand-written reports. Every
// figure comes from a results JSON; nothing is recomputed here.
import fs from 'fs-extra';
import {
  formatCents,
  formatDollars,
  formatSigned,
  log,
  pct,
  readJson,
  stageDir,
  study,
  universe,
  writeText
} from './context.ts';

const table = (header: string[], rows: (string | number)[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map((cell, index) => (index === 0 ? '---' : '---:')).join('|')}|`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');

const exists = (file: string) => fs.pathExists(stageDir(file));

type Json = Record<string, any>;

const auditTables = async () => {
  const audit = await readJson<Json>(stageDir('audit', 'audit.json'));
  const lines = [
    '# Audit tables',
    '',
    `Last common session ${audit.calendar.lastCommon}; calendars identical: ${audit.calendar.identical}; failures ${audit.failures.length}.`,
    ''
  ];

  lines.push(
    table(
      ['ETF', 'sha256', 'Sessions', 'First → last', 'Splits (raw → adjusted overnight)'],
      audit.members.map((member: Json) => [
        member.symbol,
        `\`${member.sha256.slice(0, 16)}\``,
        member.sessions,
        `${member.firstDate} → ${member.lastDate}`,
        member.splits.length
          ? member.splits
              .map(
                (split: Json) =>
                  `${split.ratio}:1 ${split.effectiveDate} (${pct(split.rawOvernight)} → ${pct(split.adjustedOvernight, 2)}, once: ${split.appliedOnce})`
              )
              .join('; ')
          : '—'
      ])
    ),
    '',
    '## Bar coverage (training; counts and volumes only)',
    '',
    table(
      [
        'ETF',
        'Median bars',
        'Minutes with a bar',
        'Sparse sessions',
        'Closing prints',
        'Median gap / p99 / max (min)',
        'Median daily $ volume',
        'Median bar volume'
      ],
      audit.coverage.map((row: Json) => {
        const training = row.byPartition.training;
        const intraday = row.trainingIntraday;

        return [
          row.symbol,
          training.medianBars,
          pct(intraday.minuteShareWithBar),
          `${training.sparseSessions} / ${training.sessions}`,
          training.closingPrints,
          `${intraday.gapMinutes.median} / ${intraday.gapMinutes.p99} / ${intraday.gapMinutes.max}`,
          `$${(training.medianDailyDollarVolume / 1e6).toFixed(0)}M`,
          Math.round(intraday.medianBarVolume)
        ];
      })
    ),
    '',
    '## Bar coverage by partition (median bars; sparse sessions)',
    '',
    table(
      ['ETF', 'Training', 'Holdout', 'Final'],
      audit.coverage.map((row: Json) => [
        row.symbol,
        ...['training', 'holdout', 'final'].map(
          (name) =>
            `${row.byPartition[name].medianBars}; ${row.byPartition[name].sparseSessions} sparse of ${row.byPartition[name].sessions}`
        )
      ])
    )
  );

  return lines.join('\n');
};

const controlTables = async () => {
  const controls = await readJson<Json>(stageDir('controls', 'controls.json'));
  const lines = [
    '# Benchmark reproduction',
    '',
    `Failures: ${controls.failures.length}.`,
    '',
    '## Training (full N-book engine)',
    ''
  ];
  const rows: (string | number)[][] = [];

  for (const key of ['B1', 'B4', 'B5', 'C0']) {
    for (const [run, record] of Object.entries(controls.training[key] as Record<string, Json>)) {
      const figures = record.figures;

      rows.push([
        key,
        run,
        figures.mode === 'portfolio' ? formatCents(figures.endEquity) : formatCents(figures.net),
        formatCents(figures.minuteDrawdown),
        figures.mode === 'portfolio' ? `${pct(figures.dailyPercent, 2)} / ${pct(figures.minutePercent, 2)}` : '—',
        figures.lots,
        record.reference === 'none' ? 'recorded' : `${record.differences.length} differences`
      ]);
    }
  }

  lines.push(
    table(
      [
        'Benchmark',
        'Run',
        'Net (fixed) / ending equity',
        'Minute DD $',
        'Max % DD daily / minute',
        'Lots',
        'Against the previous record'
      ],
      rows
    ),
    '',
    '## Full `all` history (benchmark door)',
    ''
  );

  const allRows: (string | number)[][] = [];

  for (const key of ['B1', 'B4', 'B5', 'C0']) {
    for (const [run, record] of Object.entries(controls.all[key] as Record<string, Json>)) {
      const summary = record.summary;

      allRows.push([
        key,
        run,
        run.startsWith('portfolio') ? formatCents(summary.endEquity) : formatCents(summary.net),
        formatCents(summary.minuteDrawdown),
        formatCents(summary.dailyDrawdown),
        run.startsWith('portfolio') ? `${pct(summary.dailyPercent, 2)} / ${pct(summary.minutePercent, 2)}` : '—',
        summary.lots,
        record.reference === 'none' ? 'recorded' : `${record.differences.length} differences`
      ]);
    }
  }

  lines.push(
    table(
      [
        'Benchmark',
        'Run',
        'Net / ending equity',
        'Minute DD $',
        'Daily DD $',
        'Max % DD daily / minute',
        'Lots',
        'Against the previous record'
      ],
      allRows
    )
  );

  return lines.join('\n');
};

const parityTables = async () => {
  const parity = await readJson<Json>(stageDir('parity', 'parity.json'));
  const groups = new Map<
    string,
    { cases: number; differences: number; full: number[]; fast: number[]; books: Set<number> }
  >();

  for (const record of parity.records as Json[]) {
    const kind =
      record.gate === 'P1'
        ? `P1 ${String(record.case)
            .replace(/\d+ *$/, '')
            .replace(/^[A-Z]+ alone.*/, 'single book')
            .replace(/random (\d+)-book subset.*/, 'random $1-book subsets')}`
        : `${record.gate} ${record.case}`;
    const group = groups.get(kind) ?? { cases: 0, differences: 0, full: [], fast: [], books: new Set<number>() };

    group.cases++;
    group.differences += record.differences > 0 ? 1 : 0;
    group.full.push(record.fullMs);

    if (record.fastMs !== undefined) {
      group.fast.push(record.fastMs);
    }

    group.books.add(record.books);
    groups.set(kind, group);
  }

  const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1] ?? NaN;

  return [
    '# Parity tables',
    '',
    `${parity.records.length} comparisons, ${parity.failures.length} with any difference.`,
    '',
    table(
      ['Group', 'Comparisons', 'With differences', 'Books', 'Median full engine (ms)', 'Median trace + replay (ms)'],
      [...groups.entries()].map(([kind, group]) => [
        kind,
        group.cases,
        group.differences,
        [...group.books].sort((a, b) => a - b).join(', '),
        Math.round(median(group.full)),
        group.fast.length ? Math.round(median(group.fast)) : '—'
      ])
    )
  ].join('\n');
};

const libraryTables = async () => {
  const library = await readJson<Json>(stageDir('library', 'library.json'));

  return [
    '# Library coverage',
    '',
    `${library.vectorsPerEtf} vectors per ETF (${library.sobol.unique} Sobol + ${library.controls.length} controls, ${library.controls.length + library.sobol.unique - library.vectorsPerEtf} duplicates); traced in ${Math.round(library.seconds)} s.`,
    '',
    table(
      [
        'ETF',
        'Vectors',
        'Inert (no training trade)',
        'Closed trades in ≥ 3 years',
        'Virtual trades min / median / max',
        'Signals',
        'Median fill delay (s)',
        'Max fill delay (s)'
      ],
      library.coverage.map((row: Json) => [
        row.symbol,
        row.vectors,
        row.inert,
        row.withClosedTradeInThreeYears,
        `${row.virtualTrades.min} / ${row.virtualTrades.median} / ${row.virtualTrades.max}`,
        row.signals,
        row.fillDelaySeconds.median,
        row.maxFillDelaySeconds
      ])
    ),
    '',
    '## Controls (the same set on every ETF)',
    '',
    table(
      ['Origin', 'ID', 'Source symbol', 'Post-2023 inspected'],
      library.controls.map((control: Json) => [
        control.origin.replace('control:', ''),
        `\`${control.id}\``,
        control.sourceSymbol,
        control.inspectedPostTraining ? 'yes' : 'no'
      ])
    )
  ].join('\n');
};

const coverageTable = (coverage: Json) =>
  table(
    [
      'ETF',
      'Appearances',
      'Feasible',
      'On the Pareto front',
      'Distinct vectors',
      'Library vectors',
      'With a funded lot',
      'Singletons',
      'Shortlisted',
      'Nominated'
    ],
    coverage.perEtf.map((row: Json) => [
      row.symbol,
      row.appearances,
      row.appearancesFeasible,
      row.onParetoFront,
      row.distinctVectors,
      row.distinctLibraryVectors,
      row.appearancesWithFundedLot,
      row.singletons,
      row.shortlisted,
      row.nominated
    ])
  );

const discoveryTables = async () => {
  const discovery = await readJson<Json>(stageDir('discovery', 'discovery.json'));
  const lines = [
    '# Discovery tables',
    '',
    `${discovery.evaluations} unique evaluations in ${Math.round(discovery.seconds)} s; ${discovery.cacheHits} cache hits; ${discovery.coverage.behaviourallyDistinct} behaviourally distinct; ${discovery.coverage.feasible} feasible.`,
    '',
    '## Greedy paths',
    '',
    table(
      [
        'Start',
        'Accepted steps',
        'Evaluations',
        'Final books',
        'Path (additions)',
        'Final net',
        'Final minute DD',
        'Stopped by'
      ],
      discovery.paths.map((path: Json) => [
        path.etf,
        path.steps.length - 1,
        path.evaluations,
        path.steps.at(-1).books,
        path.steps.map((step: Json) => step.added).join(' → '),
        formatDollars(path.steps.at(-1).net),
        formatDollars(path.steps.at(-1).minuteDrawdown),
        path.stoppedBy
      ])
    ),
    '',
    '## Islands',
    '',
    table(
      [
        'Island',
        'Initial population',
        'Generations',
        'New evaluations',
        'Stopped by',
        'Final front size',
        'Final cardinality min / median / max'
      ],
      discovery.islands.map((island: Json) => {
        const last = island.log.at(-1) ?? { frontSize: NaN, cardinality: { min: NaN, median: NaN, max: NaN } };

        return [
          `${island.key} ${island.label}`,
          `${island.initial.unique} (${island.initial.fresh} new)`,
          island.generations,
          island.freshEvaluations,
          island.stoppedBy,
          last.frontSize,
          `${last.cardinality.min} / ${last.cardinality.median} / ${last.cardinality.max}`
        ];
      })
    ),
    '',
    '## Cardinality of every evaluated configuration',
    '',
    table(
      ['Books', 'Evaluations', 'Feasible'],
      discovery.coverage.cardinality.map((row: Json) => [row.books, row.all, row.feasible])
    ),
    '',
    '## Operators (child evaluations by the operator that produced them)',
    '',
    table(
      ['Stage:operator', 'Evaluations'],
      Object.entries(discovery.coverage.operators as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => [key, value])
    ),
    '',
    '## Per-ETF exploration (discovery only)',
    '',
    coverageTable(discovery.coverage)
  ];

  return lines.join('\n');
};

const refineTables = async () => {
  const refine = await readJson<Json>(stageDir('refine', 'refine.json'));
  const lines = [
    '# Refinement tables',
    '',
    `${refine.evaluations} unique refinement evaluations.`,
    '',
    '## Contenders',
    '',
    table(
      ['Slot', 'Rule', 'Members', 'Books', 'Net@5', 'Minute DD', 'Q'],
      refine.contenders.map((contender: Json) => [
        `c${contender.slot}`,
        contender.rule,
        contender.e.members.join(' '),
        contender.e.books,
        formatDollars(contender.e.net),
        formatDollars(contender.e.minuteDrawdown),
        formatDollars(contender.e.net - study.complexityPenalty * contender.e.books)
      ])
    ),
    '',
    '## Refinement runs',
    '',
    table(
      [
        'Slot',
        'Cycles',
        'New evaluations',
        'Accepted (membership / coordinate / joint)',
        'Multi-member moves',
        'Members retuned',
        'Start → result net',
        'Stopped by'
      ],
      refine.runs.map((run: Json) => [
        `c${run.slot}`,
        run.cycles,
        run.freshEvaluations,
        `${run.passes.membership} / ${run.passes.coordinate} / ${run.passes.joint}`,
        run.multiMemberMoves,
        run.membersRetuned.join(' ') || '—',
        run.moves.length
          ? `${formatDollars(refine.contenders.find((c: Json) => c.slot === run.slot).e.net)} → ${formatDollars(run.moves.at(-1).net)}`
          : 'unchanged',
        run.stoppedBy
      ])
    ),
    '',
    '## What refinement changed in the funded pool (5 bps)',
    '',
    table(
      [
        'Slot',
        'Lots before → after',
        'Kept (net change)',
        'Lost (net)',
        'Gained (net)',
        'Gained by symbol',
        'Lost by symbol'
      ],
      refine.runs.map((run: Json) => [
        `c${run.slot}`,
        `${run.lotChanges.before} → ${run.lotChanges.after}`,
        `${run.lotChanges.kept} (${formatSigned(run.lotChanges.keptNetChange)})`,
        `${run.lotChanges.lost} (${formatDollars(run.lotChanges.lostNet)})`,
        `${run.lotChanges.gained} (${formatDollars(run.lotChanges.gainedNet)})`,
        Object.entries(run.lotChanges.gainedBySymbol)
          .map(([s, n]) => `${s} ${n}`)
          .join(', ') || '—',
        Object.entries(run.lotChanges.lostBySymbol)
          .map(([s, n]) => `${s} ${n}`)
          .join(', ') || '—'
      ])
    )
  ];

  for (const run of refine.runs as Json[]) {
    lines.push('', `### c${run.slot} accepted moves`, '');
    lines.push(
      run.moves.length
        ? table(
            ['Cycle', 'Pass', 'Move', 'Books', 'Net@5', 'Minute DD', 'J'],
            run.moves.map((move: Json) => [
              move.cycle,
              move.pass,
              move.operator,
              move.books,
              formatDollars(move.net),
              formatDollars(move.minuteDrawdown),
              formatDollars(move.j)
            ])
          )
        : 'None.'
    );
  }

  return lines.join('\n');
};

const robustTables = async () => {
  const robust = await readJson<Json>(stageDir('robust', 'robust.json'));
  const gated = robust.gated as Json[];
  const lines = [
    '# Robustness tables',
    '',
    `Shortlist ${robust.shortlist.length} configurations plus B1, B4, B5; passing every gate: ${robust.passing.length}; nominees: ${robust.nominees.map((nominee: Json) => `${nominee.role} ${nominee.label}`).join('; ') || 'none'}.`,
    '',
    '## Training figures (fixed $100,000, 5 bps unless stated)',
    '',
    table(
      [
        'Config',
        'Books',
        'Members',
        'Net@5',
        'Net@0 / @2 / @10',
        'Minute DD $ (% of $100k)',
        'Daily DD $',
        'Net ÷ DD',
        'Lots',
        'Folds F1 / F2 / F3',
        'Top-2 lots share',
        'Best regime (share)',
        'P50 joint',
        'Probe median',
        'Score S'
      ],
      gated.map(({ battery, outcome }) => {
        const e = battery.costs[5];

        return [
          battery.label,
          e.books,
          battery.books.map((book: Json) => book.symbol).join(' '),
          formatDollars(e.net),
          `${formatDollars(battery.costs[0].net)} / ${formatDollars(battery.costs[2].net)} / ${formatDollars(battery.costs[10].net)}`,
          `${formatDollars(e.minuteDrawdown)} (${pct(e.minuteDrawdown / study.principal)})`,
          formatDollars(e.dailyDrawdown),
          battery.derived.netPerDrawdown.toFixed(2),
          e.lots,
          e.folds.map((value: number) => formatDollars(value)).join(' / '),
          pct(battery.derived.top2Share),
          `${battery.derived.bestRegime} (${pct(battery.derived.bestRegimeValue / e.net)})`,
          formatDollars(battery.joint.p50),
          formatDollars(battery.probes.median),
          formatDollars(outcome.score)
        ];
      })
    ),
    '',
    '## Portfolio (20%, 5 bps, training) and matched borrowing',
    '',
    table(
      [
        'Config',
        'Ending equity',
        'Max % DD daily / minute',
        'Daily DD $',
        'Borrowing $-days',
        'B5 ladder at the same $-days',
        'Extrapolated'
      ],
      gated.map(({ battery, outcome }) => [
        battery.label,
        formatDollars(battery.full.portfolio.endEquity),
        `${pct(battery.full.portfolio.dailyPercent, 2)} / ${pct(battery.full.portfolio.minutePercent, 2)}`,
        formatDollars(battery.full.portfolio.dailyDrawdown),
        `${(battery.full.portfolio.borrowingDollarDays / 1e6).toFixed(1)}M`,
        formatDollars(outcome.matched.value),
        outcome.matched.extrapolated ? 'yes' : 'no'
      ])
    ),
    '',
    '## Gates (T0–T9) and the score',
    '',
    table(
      ['Config', 'T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'Passed', 'Conditional band'],
      gated.map(({ battery, outcome }) => [
        battery.label,
        ...['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'].map((gate) =>
          outcome.gates[gate] ? '✓' : '✗'
        ),
        outcome.passed ? '**yes**' : 'no',
        outcome.conditional ? 'yes' : 'no'
      ])
    ),
    '',
    '## Exclusions, ties and plateau',
    '',
    table(
      [
        'Config',
        'Smallest member marginal (symbol)',
        'Largest member share',
        'Probe feasible / median ÷ net',
        'Joint feasible / P50 ÷ net / P10',
        'Contested ties',
        'Tie-order max |Δnet|'
      ],
      gated.map(({ battery }) => {
        const smallest = [...battery.exclusions].sort((a: Json, b: Json) => a.marginal - b.marginal)[0];
        const net = battery.costs[5].net;

        return [
          battery.label,
          `${formatSigned(smallest.marginal)} (${smallest.symbol})`,
          pct(battery.derived.largestMemberShare),
          `${pct(battery.probes.feasibleShare)} / ${pct(battery.probes.median / net)}`,
          `${pct(battery.joint.feasibleShare)} / ${pct(battery.joint.p50 / net)} / ${formatDollars(battery.joint.p10)}`,
          battery.ties.contested,
          formatDollars(battery.ties.maxAbsNetChange)
        ];
      })
    ),
    '',
    '## Phenotypes of the shortlisted configurations',
    ''
  ];

  for (const { battery } of gated) {
    lines.push(
      `**${battery.label}** (\`${battery.key}\`)`,
      '',
      table(
        ['ETF', 'Vector', 'Funded lots @5', 'Funded net @5'],
        battery.books.map((book: Json) => [
          book.symbol,
          book.short,
          battery.costs[5].lotsBySymbol[book.symbol] ?? 0,
          formatDollars(battery.costs[5].netBySymbol[book.symbol] ?? 0)
        ])
      ),
      ''
    );
  }

  lines.push(
    '## Rolling-origin diagnostic (discovery archive, not a gate)',
    '',
    '```json',
    JSON.stringify(robust.rollingOrigin, null, 1),
    '```',
    '',
    '## Per-ETF exploration (whole search)',
    '',
    coverageTable(robust.coverage)
  );

  return lines.join('\n');
};

const evaluationTables = async () => {
  const evaluation = await readJson<Json>(stageDir('evaluation', 'evaluation.json'));

  if (!evaluation.summaries) {
    return `# Evaluation\n\n${evaluation.note}`;
  }

  const lines = [
    '# Evaluation tables',
    '',
    `Window ${evaluation.window.first} → ${evaluation.window.last} (${evaluation.window.sessions} sessions); parity ${evaluation.parityPassed ? 'exact' : 'FAILED'}; accepted: ${evaluation.accepted.join(', ') || 'none'}; recommendation: ${evaluation.recommendation}.`,
    ''
  ];
  const keys = Object.keys(evaluation.summaries);
  const segment = (summary: Json, name: string) => summary.segments.find((row: Json) => row.segment === name);

  for (const costBps of study.costsBps) {
    lines.push(`## Fixed $100,000 at ${costBps} bps (strategy P&L by segment of one continuous run)`, '');
    lines.push(
      table(
        [
          'Config',
          'Development',
          'Holdout',
          'Final',
          'Holdout + final',
          'Full',
          'Minute DD $ (all)',
          'Daily DD $ (all)',
          'Lots',
          'Worst lot'
        ],
        keys
          .filter((key) => evaluation.summaries[key][`fixed-${costBps}`])
          .map((key) => {
            const summary = evaluation.summaries[key][`fixed-${costBps}`];

            return [
              key,
              formatDollars(segment(summary, 'development').strategyPnl),
              formatDollars(segment(summary, 'holdout').strategyPnl),
              formatDollars(segment(summary, 'final').strategyPnl),
              formatDollars(segment(summary, 'holdout').strategyPnl + segment(summary, 'final').strategyPnl),
              formatDollars(summary.net),
              formatDollars(summary.minuteDrawdown),
              formatDollars(summary.dailyDrawdown),
              summary.lots,
              formatDollars(summary.worstLot)
            ];
          })
      ),
      ''
    );
  }

  for (const costBps of study.costsBps) {
    lines.push(`## 20% portfolio at ${costBps} bps`, '');
    lines.push(
      table(
        [
          'Config',
          'Ending equity',
          'Development return',
          'Holdout return',
          'Final return',
          'Max % DD daily / minute (all)',
          'Holdout max % DD',
          'Final max % DD',
          'Interest',
          'Lot dividends'
        ],
        keys.map((key) => {
          const summary = evaluation.summaries[key][`portfolio-${costBps}`];

          return [
            key,
            formatDollars(summary.endEquity),
            pct(segment(summary, 'development').equityReturn),
            pct(segment(summary, 'holdout').equityReturn),
            pct(segment(summary, 'final').equityReturn),
            `${pct(summary.dailyPercent, 2)} / ${pct(summary.minutePercent, 2)}`,
            pct(segment(summary, 'holdout').maxPercentDrawdown, 2),
            pct(segment(summary, 'final').maxPercentDrawdown, 2),
            formatDollars(summary.interest),
            formatDollars(summary.extras.lotDividends)
          ];
        })
      ),
      ''
    );
  }

  lines.push('## Acceptance (A1–A6, against B5)', '');
  lines.push(
    table(
      [
        'Nominee',
        'Post-training Δ@5 vs B5',
        'Δ@0 / @2 / @10',
        'Holdout Δ / Final Δ',
        'A1',
        'A2',
        'A3',
        'A4',
        'A5',
        'A6',
        'Accepted',
        'Without top-2 lots'
      ],
      Object.entries(evaluation.comparisons as Record<string, Json>).map(([key, comparison]) => {
        const fixed = comparison.versusB5.fixed;

        return [
          key,
          formatSigned(fixed[5].postTraining),
          `${formatSigned(fixed[0].postTraining)} / ${formatSigned(fixed[2].postTraining)} / ${formatSigned(fixed[10].postTraining)}`,
          `${formatSigned(fixed[5].holdout)} (${comparison.versusB5.holdout}) / ${formatSigned(fixed[5].final)} (${comparison.versusB5.final})`,
          ...['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map((rule) => (comparison.rules[rule] ? '✓' : '✗')),
          comparison.accepted ? '**yes**' : 'no',
          formatSigned(comparison.evidence.postTrainingDeltaWithoutTopTwo)
        ];
      })
    ),
    '',
    '## Against B4 and B1 (fixed, 5 bps)',
    '',
    table(
      ['Nominee', 'vs B4 holdout / final / post', 'vs B1 holdout / final / post'],
      Object.entries(evaluation.comparisons as Record<string, Json>).map(([key, comparison]) => [
        key,
        `${formatSigned(comparison.versusB4.fixed[5].holdout)} / ${formatSigned(comparison.versusB4.fixed[5].final)} / ${formatSigned(comparison.versusB4.fixed[5].postTraining)}`,
        `${formatSigned(comparison.versusB1.fixed[5].holdout)} / ${formatSigned(comparison.versusB1.fixed[5].final)} / ${formatSigned(comparison.versusB1.fixed[5].postTraining)}`
      ])
    ),
    '',
    '## B5 ladder on `all` (5 bps)',
    '',
    table(
      [
        'Fraction',
        'Borrowing $-days',
        'Post-training $-days',
        'Ending equity',
        'Post-training return',
        'Max daily % DD'
      ],
      evaluation.ladder.map((point: Json) => [
        pct(point.fraction, 0),
        `${(point.borrowingDollarDays / 1e6).toFixed(1)}M`,
        `${(point.postTrainingBorrowingDollarDays / 1e6).toFixed(1)}M`,
        formatDollars(point.endEquity),
        pct(point.postTrainingReturn),
        pct(point.dailyPercent, 2)
      ])
    )
  );

  return lines.join('\n');
};

export const writeTables = async () => {
  const generators: [string, string, () => Promise<string>][] = [
    ['audit/audit.json', 'audit.md', auditTables],
    ['controls/controls.json', 'controls.md', controlTables],
    ['parity/parity.json', 'parity.md', parityTables],
    ['library/library.json', 'library.md', libraryTables],
    ['discovery/discovery.json', 'discovery.md', discoveryTables],
    ['refine/refine.json', 'refine.md', refineTables],
    ['robust/robust.json', 'robust.md', robustTables],
    ['evaluation/evaluation.json', 'evaluation.md', evaluationTables]
  ];

  for (const [source, target, generate] of generators) {
    if (await exists(source)) {
      await writeText(stageDir('tables', target), await generate());
      log(`tables/${target} written`);
    }
  }

  void universe;
};

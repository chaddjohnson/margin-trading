// Generated Markdown tables for the study's reports (results/tables/*.md), from the stage records only. The narrative
// reports in research/portfolio-aware-d1-optimization/ quote these tables.
import path from 'node:path';
import fs from 'fs-extra';
import { candidates, formatDollars, formatSigned, log, pct, readJson, stageDir, study, writeText } from './context.ts';
import { type PoolRecord, readPool } from './stageA.ts';
import { feasibleP, feasibleS, median } from './tracks.ts';

const table = (header: string[], rows: (string | number)[][], align?: string[]) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${(align ?? header.map(() => '---')).join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');

const describeGrid = (grid: Record<string, number>) =>
  `X ${(grid.targetPercentChange! / 10).toFixed(1)}% Y ${(grid.trailingBuyPercentage! / 10).toFixed(1)}% stop ${(grid.trailingStopPercentage! / 10).toFixed(1)}% hold ${grid.maximumHoldDays} L ${grid.tickWindowSize} buffer ${(grid.intradayLossBuffer! / 10).toFixed(1)}% P ${(grid.pullback! / 10).toFixed(1)}% W ${grid.continuationWindow}`;

// Spearman rank correlation (average ranks for ties).
export const spearman = (xs: number[], ys: number[]) => {
  const ranks = (values: number[]) => {
    const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
    const result = new Array<number>(values.length);
    let i = 0;

    while (i < order.length) {
      let j = i;

      while (j + 1 < order.length && order[j + 1]!.value === order[i]!.value) {
        j++;
      }

      for (let k = i; k <= j; k++) {
        result[order[k]!.index] = (i + j) / 2 + 1;
      }

      i = j + 1;
    }

    return result;
  };
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;

  for (let index = 0; index < rx.length; index++) {
    num += (rx[index]! - mx) * (ry[index]! - my);
    dx += (rx[index]! - mx) ** 2;
    dy += (ry[index]! - my) ** 2;
  }

  return num / Math.sqrt(dx * dy);
};

export const stageATables = async () => {
  const cost = study.principalCostBps;
  const finalists = await readJson<{
    scores: {
      symbol: string;
      vectors: number;
      feasibleS: number;
      feasibleP: number;
      positiveFeasibleP: number;
      eligible: boolean;
      potential: number;
      breadth: number;
      cost: number;
      standalone: number;
      ranks: Record<string, number>;
      composite: number;
    }[];
    order: string[];
    swaps: string[];
    finalists: string[];
    excluded: { symbol: string; reason: string }[];
  }>(stageDir('stageA', 'finalists.json'));
  const run = await readJson<{
    seconds: number;
    traces: number;
    replays: number;
    s0: Record<string, { net: number; minuteDrawdown: number; lots: number }>;
  }>(stageDir('stageA', 'run.json'));
  const lines: string[] = [`# Stage A tables (generated ${new Date().toISOString()})`, ''];
  const pools: Record<string, PoolRecord[]> = {};

  for (const symbol of candidates) {
    pools[symbol] = await readPool(symbol);
  }

  lines.push(
    `Training 2017-06-15 → 2023-12-29, fixed $100,000, 11% simple interest. S0 (All-lowDd) at 0/2/5/10 bps: ${study.costsBps
      .map(
        (bps) =>
          `${formatDollars(run.s0[bps]!.net)} (DD ${formatDollars(run.s0[bps]!.minuteDrawdown)}, ${run.s0[bps]!.lots} lots)`
      )
      .join('; ')}. ${run.traces} traces and ${run.replays} replays in ${run.seconds.toFixed(0)} s.`,
    '',
    '## 1. The common pool on each candidate (5 bps)',
    '',
    table(
      [
        'ETF',
        'Vectors',
        'S-feasible',
        'P-feasible',
        'P-feasible Δ > 0',
        'Median Δ (P-feasible)',
        'Best standalone net (S-feasible)',
        'Best Δ (P-feasible)',
        'Spearman(standalone net, Δ), all vectors',
        'Spearman, S-feasible'
      ],
      candidates.map((symbol) => {
        const records = pools[symbol]!;
        const at = (record: PoolRecord) => record.results[cost]!;
        const pFeasible = records.filter((record) => feasibleP(at(record).pool));
        const sFeasible = records.filter((record) => feasibleS(at(record).standalone));
        const bestS = Math.max(-Infinity, ...sFeasible.map((record) => at(record).standalone.net));
        const bestP = Math.max(-Infinity, ...pFeasible.map((record) => at(record).pool.delta));

        return [
          symbol,
          records.length,
          sFeasible.length,
          pFeasible.length,
          pFeasible.filter((record) => at(record).pool.delta > 0).length,
          formatSigned(median(pFeasible.map((record) => at(record).pool.delta))),
          formatDollars(bestS),
          formatSigned(bestP),
          spearman(
            records.map((record) => at(record).standalone.net),
            records.map((record) => at(record).pool.delta)
          ).toFixed(2),
          sFeasible.length > 2
            ? spearman(
                sFeasible.map((record) => at(record).standalone.net),
                sFeasible.map((record) => at(record).pool.delta)
              ).toFixed(2)
            : 'n/a'
        ];
      }),
      ['---', '---:', '---:', '---:', '---:', '---:', '---:', '---:', '---:', '---:']
    ),
    '',
    '## 2. Controls (5 bps): standalone net / minute DD / trades — pool Δ / book lots / displaced S0 lots',
    ''
  );

  const controlRows: (string | number)[][] = [];

  for (const symbol of candidates) {
    for (const record of pools[symbol]!.filter((item) => item.vector.origin.startsWith('control:'))) {
      const result = record.results[cost]!;

      controlRows.push([
        symbol,
        record.vector.origin.replace('control:', ''),
        `${formatDollars(result.standalone.net)} / ${formatDollars(result.standalone.minuteDrawdown)} / ${result.standalone.trades}`,
        `${formatSigned(result.pool.delta)} / ${result.pool.lots} / ${result.pool.displacedLots}`
      ]);
    }
  }

  lines.push(table(['ETF', 'Control', 'Standalone', 'Pool'], controlRows), '');

  lines.push(
    '## 3. The finalist rule (PROTOCOL.md §4.7)',
    '',
    table(
      [
        'ETF',
        'Eligible',
        'P-potential (median Δ@5, top 10)',
        'Breadth (regimes Δ > 0)',
        'Cost (median Δ@10)',
        'Standalone (median net@5, top 10 S)',
        'Rank scores P/B/C/S',
        'Composite'
      ],
      finalists.scores.map((score) => [
        score.symbol,
        score.eligible ? 'yes' : 'no',
        formatSigned(score.potential),
        Number.isFinite(score.breadth) ? score.breadth.toFixed(1) : 'n/a',
        formatSigned(score.cost),
        formatDollars(score.standalone),
        score.eligible
          ? ['potential', 'breadth', 'cost', 'standalone']
              .map((key) => (score.ranks[key] ?? NaN).toFixed(2))
              .join(' / ')
          : '',
        Number.isFinite(score.composite) ? score.composite.toFixed(3) : ''
      ])
    ),
    '',
    `Order: ${finalists.order.join(' > ') || 'none'}; priority swaps: ${finalists.swaps.join('; ') || 'none'}. **Finalists: ${finalists.finalists.join(', ') || 'none'}.**`,
    '',
    ...finalists.excluded.map((row) => `- ${row.symbol} not eligible: ${row.reason}.`),
    ''
  );

  for (const symbol of candidates) {
    const records = pools[symbol]!;
    const at = (record: PoolRecord, bps: number = cost) => record.results[bps]!;
    const topP = records
      .filter((record) => feasibleP(at(record).pool))
      .sort((a, b) => at(b).pool.delta - at(a).pool.delta)
      .slice(0, 5);
    const topS = records
      .filter((record) => feasibleS(at(record).standalone))
      .sort((a, b) => at(b).standalone.net - at(a).standalone.net)
      .slice(0, 5);

    lines.push(
      `## ${symbol}: top five vectors of each track (5 bps)`,
      '',
      table(
        [
          'Track',
          'Vector',
          'Origin',
          'Standalone net / DD / trades',
          'Δ@0/2/5/10',
          'Pool DD',
          'Book lots (years)',
          'Displaced / gained S0 lots'
        ],
        [...topS.map((record) => ['S', record]), ...topP.map((record) => ['P', record])].map(([track, item]) => {
          const record = item as PoolRecord;

          return [
            track as string,
            describeGrid(record.vector.grid),
            record.vector.origin,
            `${formatDollars(at(record).standalone.net)} / ${formatDollars(at(record).standalone.minuteDrawdown)} / ${at(record).standalone.trades}`,
            study.costsBps.map((bps) => formatSigned(at(record, bps).pool.delta)).join(' / '),
            formatDollars(at(record).pool.minuteDrawdown),
            `${at(record).pool.lots} (${at(record).pool.lotYears})`,
            `${at(record).pool.displacedLots} / ${at(record).pool.gainedLots}`
          ];
        })
      ),
      ''
    );
  }

  await writeText(stageDir('tables', 'stageA.md'), lines.join('\n'));
  log('tables: stageA.md');
};

export const opportunityTables = async () => {
  const record = await readJson<{
    s0: {
      net: number;
      lots: number;
      virtualTrades: number;
      refused: number;
      eligibleSessions: number;
      busySessions: number;
      occupiedTimeShare: number;
      busyByRegime: { regime: string; sessions: number; busy: number; lots: number }[];
      refusalHolders: Record<string, Record<string, number>>;
      longestIdleGaps: { from: string; to: string; days: number }[];
    };
    candidates: {
      symbol: string;
      episodes: { start: string; trough: string; end: string; depth: number; sessions: number; s0BusyShare: number }[];
      representatives: {
        labels: string[];
        id: string;
        grid: Record<string, number>;
        standaloneNet5: number;
        delta5: number;
        virtualTrades: number;
        counts: { busy: number; idleClean: number; idleDisplacing: number; funded: number };
        byRegime: Record<string, { busy: number; idleClean: number; idleDisplacing: number }>;
        medianHoldDays: number;
        displacedLots: number;
        displacedNet: number;
        gainedLots: number;
      }[];
    }[];
  }>(stageDir('opportunity', 'opportunity.json'));
  const regimes = study.regimes;
  const lines: string[] = [`# Opportunity map tables (generated ${new Date().toISOString()})`, ''];

  lines.push(
    `S0 at 5 bps on training: ${record.s0.lots} funded lots of ${record.s0.virtualTrades} virtual trades (${record.s0.refused} refused), net ${formatDollars(record.s0.net)}; pool holding a lot at the close in ${record.s0.busySessions} of ${record.s0.eligibleSessions} eligible sessions (${pct(record.s0.busySessions / record.s0.eligibleSessions)}), reserved or held ${pct(record.s0.occupiedTimeShare)} of calendar time.`,
    '',
    '## S0 occupancy by regime',
    '',
    table(
      ['Regime', 'Dates', 'Sessions', 'Busy at close', 'Lots entered'],
      record.s0.busyByRegime.map((row) => {
        const regime = regimes.find((item) => item.key === row.regime)!;

        return [
          `${row.regime} ${regime.label}`,
          `${regime.start} → ${regime.end}`,
          row.sessions,
          `${row.busy} (${pct(row.busy / Math.max(1, row.sessions))})`,
          row.lots
        ];
      })
    ),
    '',
    `Refusals by refused book → holder: ${Object.entries(record.s0.refusalHolders)
      .map(
        ([book, holders]) =>
          `${book}: ${Object.entries(holders)
            .map(([holder, count]) => `${holder} ${count}`)
            .join(', ')}`
      )
      .join('; ')}.`,
    '',
    `Longest idle gaps: ${record.s0.longestIdleGaps.map((gap) => `${gap.from.slice(0, 10)} → ${gap.to.slice(0, 10)} (${gap.days.toFixed(0)} d)`).join('; ')}.`,
    ''
  );

  for (const candidate of record.candidates) {
    lines.push(
      `## ${candidate.symbol}`,
      '',
      `Declines ≥ 10% below the 74-session reference high (training): ${candidate.episodes.length}. ${candidate.episodes
        .map(
          (episode) =>
            `${episode.start} → ${episode.end} (trough ${episode.trough}, ${pct(episode.depth)}, S0 busy ${pct(episode.s0BusyShare, 0)})`
        )
        .join('; ')}.`,
      '',
      table(
        [
          'Representative',
          'Vector',
          'Standalone net@5',
          'Δ@5',
          'Virtual trades',
          'Busy / idle-clean / idle-displacing',
          'Funded in the pool',
          'S0 lots displaced (net) / gained',
          'Median hold (days)'
        ],
        candidate.representatives.map((row) => [
          row.labels.join(' / '),
          describeGrid(row.grid),
          formatDollars(row.standaloneNet5),
          formatSigned(row.delta5),
          row.virtualTrades,
          `${row.counts.busy} / ${row.counts.idleClean} / ${row.counts.idleDisplacing}`,
          row.counts.funded,
          `${row.displacedLots} (${formatDollars(row.displacedNet)}) / ${row.gainedLots}`,
          Number.isFinite(row.medianHoldDays) ? row.medianHoldDays.toFixed(0) : 'n/a'
        ])
      ),
      '',
      'By regime (busy / idle-clean / idle-displacing), each representative in the order above:',
      '',
      table(
        ['Regime', ...candidate.representatives.map((_row, index) => `#${index + 1}`)],
        regimes.map((regime) => [
          regime.key,
          ...candidate.representatives.map((row) => {
            const counts = row.byRegime[regime.key];

            return counts ? `${counts.busy}/${counts.idleClean}/${counts.idleDisplacing}` : '';
          })
        ])
      ),
      ''
    );
  }

  await writeText(stageDir('tables', 'opportunity.md'), lines.join('\n'));
  log('tables: opportunity.md');
};

interface SelectionRecord {
  feasibleCount: number;
  shortlist: number;
  checks: {
    id: string;
    origin: string;
    grid: Record<string, number>;
    objective: Record<string, number>;
    drawdown: number;
    foldsPositive: number;
    withoutBestRegime: number;
    probeFeasibleShare: number;
    probeMedian: number;
    netPerDrawdown?: number;
    r: Record<string, boolean>;
    robust: boolean;
  }[];
  selected?: { id: string };
  s0NetPerDrawdown: number;
}

export const stageBTables = async () => {
  const champions = await readJson<{
    finalists: string[];
    evaluatorCounts: { traces: number; replays: number };
    champions: Record<
      string,
      Record<
        'S' | 'P',
        {
          selected: { id: string; origin: string; grid: Record<string, number> } | null;
          feasible: number;
          robustInShortlist: number;
          shortlistChecked: number;
          search: {
            newVectors: number;
            generations: number;
            stopReason: string;
            hypervolume: number[];
            seconds: number;
          };
          fullEngine: { passed: boolean } | null;
        }
      >
    >;
  }>(stageDir('stageB', 'champions.json'));
  const lines: string[] = [`# Stage B tables (generated ${new Date().toISOString()})`, ''];
  const { readEvaluated } = await import('./stageB.ts');

  lines.push(
    '## Searches and robust selections',
    '',
    table(
      [
        'ETF',
        'Track',
        'New vectors',
        'Generations (stop)',
        'Feasible (pool ∪ own)',
        'Robust / checked',
        'Selected',
        'Full engine (E4)'
      ],
      champions.finalists.flatMap((symbol) =>
        (['S', 'P'] as const).map((track) => {
          const row = champions.champions[symbol]![track];

          return [
            symbol,
            track,
            row.search.newVectors,
            `${row.search.generations} (${row.search.stopReason})`,
            row.feasible,
            `${row.robustInShortlist} / ${row.shortlistChecked}`,
            row.selected ? `${row.selected.id} (${row.selected.origin})` : 'none',
            row.fullEngine ? (row.fullEngine.passed ? 'exact' : 'DIFFERS') : '—'
          ];
        })
      )
    ),
    ''
  );

  for (const symbol of champions.finalists) {
    const vectors: { track: 'S' | 'P'; grid: Record<string, number>; id: string }[] = [];

    for (const track of ['S', 'P'] as const) {
      const selection = await readJson<SelectionRecord>(stageDir('stageB', symbol, `track-${track}`, 'selection.json'));

      lines.push(
        `## ${symbol} track ${track}: the shortlist checks (objective = ${track === 'S' ? 'standalone net' : 'pool Δ'})`,
        '',
        table(
          [
            'Vector',
            'Origin',
            'Objective @0/2/5/10',
            'DD@5',
            'Folds > 0',
            'Without best regime',
            'Probes feasible / median',
            'R1 R2 R3 R4 R5',
            'Robust'
          ],
          selection.checks.map((row) => [
            describeGrid(row.grid),
            row.origin,
            study.costsBps.map((bps) => formatSigned(row.objective[bps]!)).join(' / '),
            formatDollars(row.drawdown),
            row.foldsPositive,
            formatSigned(row.withoutBestRegime),
            `${pct(row.probeFeasibleShare, 0)} / ${formatSigned(row.probeMedian)}`,
            ['R1', 'R2', 'R3', 'R4', 'R5'].map((key) => (row.r[key] ? '✓' : '✗')).join(' '),
            row.robust ? (selection.selected?.id === row.id ? '**selected**' : 'yes') : 'no'
          ])
        ),
        ''
      );

      const selected = champions.champions[symbol]![track].selected;

      if (selected) {
        vectors.push({ track, grid: selected.grid, id: selected.id });
      }
    }

    if (vectors.length > 0) {
      const all = [...(await readEvaluated(symbol, 'S')), ...(await readEvaluated(symbol, 'P'))];
      const rows: (string | number)[][] = [];

      for (const vector of vectors) {
        const evaluated = all.find((item) => item.id === vector.id && Object.keys(item.results).length === 4)!;

        for (const bps of study.costsBps) {
          const result = evaluated.results[bps]!;

          rows.push([
            `${vector.track}-vector`,
            bps,
            `${formatDollars(result.standalone.net)} / ${formatDollars(result.standalone.minuteDrawdown)} / ${result.standalone.trades}`,
            `${formatSigned(result.pool.delta)} = ${formatDollars(result.pool.lotsNet)} (${result.pool.lots} lots) + ${formatDollars(result.pool.gainedNet)} (${result.pool.gainedLots} gained) − ${formatDollars(result.pool.displacedNet)} (${result.pool.displacedLots} displaced)`,
            formatDollars(result.pool.minuteDrawdown),
            `${result.pool.episodes.profitable}/${result.pool.episodes.count}`,
            result.pool.folds.map((value) => formatSigned(value)).join(' / ')
          ]);
        }
      }

      lines.push(
        `## ${symbol}: the champions side by side (training, full engine confirmed)`,
        '',
        ...vectors.map((vector) => `- ${vector.track}-vector \`${vector.id}\`: ${describeGrid(vector.grid)}`),
        '',
        table(
          [
            'Vector',
            'bps',
            'Standalone net / DD / trades',
            'Pool Δ = book lots + gained − displaced',
            'Pool DD',
            'Profitable episodes',
            'Δ by fold F1/F2/F3'
          ],
          rows
        ),
        ''
      );
    }
  }

  await writeText(stageDir('tables', 'stageB.md'), lines.join('\n'));
  log('tables: stageB.md');
};

export const stageCTables = async () => {
  const { readStageC } = await import('./stageC.ts');
  const record = await readStageC();
  const lines: string[] = [`# Stage C tables (generated ${new Date().toISOString()})`, ''];
  const keys = record.design.configurations.map((configuration) => configuration.key);

  lines.push(
    '## Configurations',
    '',
    table(
      ['Key', 'Kind', 'Books'],
      record.design.configurations.map((configuration) => [
        configuration.key,
        configuration.kind,
        configuration.books
          .map((book) => (book.grid ? `${book.symbol} ${describeGrid(book.grid)}` : `${book.symbol} ${book.phenotype}`))
          .join('; ')
      ])
    ),
    '',
    `Design notes: ${record.design.notes.join('; ') || 'none'}. Combination: ${JSON.stringify(record.design.combination)}.`,
    '',
    'Substitution candidates (5 bps):',
    '',
    table(
      [
        'Vector',
        'Removed',
        'Conflicts (refused by / displaced)',
        'Triggered',
        'Δ@5 substitution',
        'Δ@5 addition',
        'Qualifies'
      ],
      record.design.substitutionCandidates.map((row) => [
        `${row.track}-${row.symbol}`,
        row.removed,
        `${row.conflicts.refusedBy} / ${row.conflicts.displaced}`,
        row.triggered ? 'yes' : 'no',
        row.delta5 === undefined ? '—' : formatSigned(row.delta5),
        formatSigned(row.additionDelta5),
        row.qualifies ? 'yes' : row.triggered ? 'no' : '—'
      ])
    ),
    '',
    '## Fixed $100,000 pool on training (full engine)',
    '',
    table(
      [
        'Config',
        ...study.costsBps.map((bps) => `Net @${bps} (Δ)`),
        'Minute DD @5',
        'Net ÷ DD @5',
        'Lots (new)',
        'Interest @5'
      ],
      keys.map((key) => {
        const runs = record.runs[key]!;
        const s0 = record.runs.S0!;

        return [
          key,
          ...study.costsBps.map((bps) =>
            key === 'S0'
              ? formatDollars(runs[`fixed-${bps}`]!.net)
              : `${formatDollars(runs[`fixed-${bps}`]!.net)} (${formatSigned(runs[`fixed-${bps}`]!.net - s0[`fixed-${bps}`]!.net)})`
          ),
          formatDollars(runs['fixed-5']!.minuteDrawdown),
          (runs['fixed-5']!.net / runs['fixed-5']!.minuteDrawdown).toFixed(2),
          `${runs['fixed-5']!.lots} (${runs['fixed-5']!.newLots})`,
          formatDollars(runs['fixed-5']!.interest)
        ];
      })
    ),
    '',
    '## 20% portfolio on training (full engine)',
    '',
    table(
      [
        'Config',
        ...study.costsBps.map((bps) => `End equity @${bps} (Δ)`),
        'Max % DD daily / minute @5',
        'Borrowing $-days @5'
      ],
      keys.map((key) => {
        const runs = record.runs[key]!;
        const s0 = record.runs.S0!;

        return [
          key,
          ...study.costsBps.map((bps) =>
            key === 'S0'
              ? formatDollars(runs[`portfolio-${bps}`]!.endEquity)
              : `${formatDollars(runs[`portfolio-${bps}`]!.endEquity)} (${formatSigned(runs[`portfolio-${bps}`]!.endEquity - s0[`portfolio-${bps}`]!.endEquity)})`
          ),
          `${pct(runs['portfolio-5']!.dailyPercent, 2)} / ${pct(runs['portfolio-5']!.minutePercent, 2)}`,
          (runs['portfolio-5']!.borrowingDollarDays / 1e6).toFixed(1) + 'M'
        ];
      })
    ),
    '',
    `S0 ladder (5 bps): ${record.ladder.map((point) => `${pct(point.fraction, 0)} → ${formatDollars(point.endEquity)} at ${(point.borrowingDollarDays / 1e6).toFixed(1)}M $-days`).join('; ')}.`,
    '',
    '## Training gates (PROTOCOL.md §6.1)',
    '',
    table(
      [
        'Config',
        'Δ@0/2/5/10',
        'Folds Δ',
        'Δ − best regime',
        'Portfolio Δ @5',
        'Matched-borrowing Δ',
        'T1 T2 T3 T4 T5',
        'Status'
      ],
      Object.entries(record.gates).map(([key, gate]) => {
        const g = gate as {
          deltas: Record<string, number>;
          foldDeltas: number[];
          withoutBestRegime: number;
          portfolioDelta: number;
          portfolioDeltaShare: number;
          matchedDelta: number;
          matchedExtrapolated: boolean;
          T: Record<string, boolean>;
          nominated: boolean;
        };

        return [
          key,
          study.costsBps.map((bps) => formatSigned(g.deltas[bps]!)).join(' / '),
          g.foldDeltas.map((value) => formatSigned(value)).join(' / '),
          formatSigned(g.withoutBestRegime),
          `${formatSigned(g.portfolioDelta)} (${pct(g.portfolioDeltaShare, 2)})`,
          `${formatSigned(g.matchedDelta)}${g.matchedExtrapolated ? ' (extrapolated)' : ''}`,
          ['T1', 'T2', 'T3', 'T4', 'T5'].map((gateKey) => (g.T[gateKey] ? '✓' : '✗')).join(' '),
          g.nominated ? '**nominated**' : 'comparator'
        ];
      })
    ),
    '',
    `E4 (replay = full engine on every configuration, fixed, four costs): ${record.parityPassed ? 'exact' : 'FAILED'}.`
  );

  await writeText(stageDir('tables', 'stageC.md'), lines.join('\n'));
  log('tables: stageC.md');
};

export const evaluationTables = async () => {
  const record = await readJson<{
    window: { first: string; last: string; sessions: number };
    configurations: { key: string; status: string }[];
    summaries: Record<
      string,
      Record<
        string,
        {
          lots: number;
          net: number;
          interest: number;
          newLots: number;
          minuteDrawdown: number;
          endEquity: number;
          dailyPercent: number;
          minutePercent: number;
          borrowingDollarDays: number;
          segments: {
            segment: string;
            strategyPnl: number;
            equityChange: number;
            lotsEntered: number;
            maxPercentDrawdown: number;
            endEquity: number;
          }[];
        }
      >
    >;
    ladder: { fraction: number; borrowingDollarDays: number; endEquity: number }[];
    comparisons: Record<
      string,
      {
        status: string;
        trainingDelta5: number;
        bySegment: Record<string, Record<string, { fixed: number; portfolio: number }>>;
        postTraining: Record<string, number>;
        portfolioPostTraining5: number;
        holdout: string;
        final: string;
        rules: Record<string, boolean>;
        accepted: boolean;
        matchedBorrowing: { delta: number; extrapolated: boolean };
        bridge: { bySegment: Record<string, { newBook: number; gained: number; displaced: number }>; residual: number };
        distributionBound: Record<
          string,
          { newLotDays: number; perPercentYield: number; breakEvenYield: number | null }
        >;
      }
    >;
    accepted: string[];
    recommendation: string;
    parityPassed: boolean;
  }>(stageDir('evaluation', 'evaluation.json'));
  const keys = record.configurations.map((item) => item.key);
  const segments = ['development', 'holdout', 'final', 'full'];
  const segmentValue = (key: string, run: string, segment: string, field: 'strategyPnl' | 'equityChange') =>
    record.summaries[key]![run]!.segments.find((row) => row.segment === segment)?.[field] ?? NaN;
  const lines: string[] = [`# Evaluation tables (generated ${new Date().toISOString()})`, ''];

  lines.push(
    `One continuous \`all\` run per configuration, ${record.window.first} → ${record.window.last} (${record.window.sessions} sessions), full engine. Segments: development = training (2016-01-05 → 2023-12-29), holdout 2024-01-02 → 2025-10-16, final 2025-10-17 → ${record.window.last}.`,
    '',
    '## Fixed $100,000 pool: strategy P&L by segment (Δ against S0 in brackets)',
    ''
  );

  for (const bps of study.costsBps) {
    lines.push(
      `### ${bps} bps per side`,
      '',
      table(
        ['Config', 'Status', ...segments, 'Minute DD (all)', 'Lots (new)'],
        keys.map((key) => [
          key,
          record.configurations.find((item) => item.key === key)!.status,
          ...segments.map((segment) => {
            const value = segmentValue(key, `fixed-${bps}`, segment, 'strategyPnl');
            const base = segmentValue('S0', `fixed-${bps}`, segment, 'strategyPnl');

            return key === 'S0' ? formatDollars(value) : `${formatDollars(value)} (${formatSigned(value - base)})`;
          }),
          formatDollars(record.summaries[key]![`fixed-${bps}`]!.minuteDrawdown),
          `${record.summaries[key]![`fixed-${bps}`]!.lots} (${record.summaries[key]![`fixed-${bps}`]!.newLots})`
        ])
      ),
      ''
    );
  }

  lines.push('## 20% portfolio: equity change by segment (Δ against S0), drawdowns over the whole run', '');

  for (const bps of study.costsBps) {
    lines.push(
      `### ${bps} bps per side`,
      '',
      table(
        [
          'Config',
          ...segments.map((segment) => `${segment} equity change`),
          'Ending equity',
          'Max % DD daily / minute'
        ],
        keys.map((key) => {
          const run = record.summaries[key]![`portfolio-${bps}`]!;

          return [
            key,
            ...segments.map((segment) => {
              const value = segmentValue(key, `portfolio-${bps}`, segment, 'equityChange');
              const base = segmentValue('S0', `portfolio-${bps}`, segment, 'equityChange');

              return key === 'S0' ? formatDollars(value) : `${formatDollars(value)} (${formatSigned(value - base)})`;
            }),
            formatDollars(run.endEquity),
            `${pct(run.dailyPercent, 2)} / ${pct(run.minutePercent, 2)}`
          ];
        })
      ),
      ''
    );
  }

  lines.push(
    `S0 ladder at 5 bps on all: ${record.ladder.map((point) => `${pct(point.fraction, 0)} → ${formatDollars(point.endEquity)} at ${(point.borrowingDollarDays / 1e6).toFixed(1)}M $-days`).join('; ')}.`,
    '',
    '## Classification and acceptance (fixed, 5 bps; PROTOCOL.md §7)',
    '',
    table(
      [
        'Config',
        'Status',
        'Training Δ@5',
        'Holdout Δ@5',
        'Final Δ@5',
        'Post-training Δ@0/2/5/10',
        'Portfolio post-training Δ@5',
        'Matched-borrowing Δ (all)',
        'Rules',
        'Accepted'
      ],
      Object.entries(record.comparisons).map(([key, row]) => [
        key,
        row.status,
        formatSigned(row.trainingDelta5),
        `${formatSigned(row.bySegment[5]!.holdout!.fixed)} (${row.holdout})`,
        `${formatSigned(row.bySegment[5]!.final!.fixed)} (${row.final})`,
        study.costsBps.map((bps) => formatSigned(row.postTraining[bps]!)).join(' / '),
        formatSigned(row.portfolioPostTraining5),
        `${formatSigned(row.matchedBorrowing.delta)}${row.matchedBorrowing.extrapolated ? ' (extrapolated)' : ''}`,
        Object.entries(row.rules)
          .map(([rule, passed]) => `${rule} ${passed ? '✓' : '✗'}`)
          .join('; '),
        row.accepted ? '**yes**' : 'no'
      ])
    ),
    '',
    '## Trade-attribution bridge (fixed, 5 bps): new book + baseline lots gained − S0 lots displaced',
    '',
    table(
      [
        'Config',
        ...['training', 'holdout', 'final'].map((segment) => `${segment}: new / gained / displaced`),
        'Residual'
      ],
      Object.entries(record.comparisons).map(([key, row]) => [
        key,
        ...['training', 'holdout', 'final'].map((segment) => {
          const part = row.bridge.bySegment[segment]!;

          return `${formatSigned(part.newBook)} / ${formatSigned(part.gained)} / ${formatSigned(part.displaced)}`;
        }),
        row.bridge.residual.toExponential(1)
      ])
    ),
    '',
    '## Omitted candidate distributions (price-only convention), fixed 5 bps',
    '',
    table(
      [
        'Config',
        ...['training', 'holdout', 'final'].map((segment) => `${segment}: lot-days / $ per 1% yield / break-even yield`)
      ],
      Object.entries(record.comparisons).map(([key, row]) => [
        key,
        ...['training', 'holdout', 'final'].map((segment) => {
          const part = row.distributionBound[segment]!;

          return `${part.newLotDays.toFixed(0)} / ${formatDollars(part.perPercentYield)} / ${part.breakEvenYield === null ? '—' : pct(part.breakEvenYield, 1)}`;
        })
      ])
    ),
    '',
    `Accepted: ${record.accepted.join(', ') || 'none'}. Recommendation by the frozen ranking: **${record.recommendation}**. Replay = full engine on every \`all\` run: ${record.parityPassed ? 'exact' : 'FAILED'}.`
  );

  await writeText(stageDir('tables', 'evaluation.md'), lines.join('\n'));
  log('tables: evaluation.md');
};

export const writeTables = async (which: string[]) => {
  if (which.includes('stage-a')) {
    await stageATables();
  }

  if (which.includes('opportunity')) {
    await opportunityTables();
  }

  if (which.includes('stage-b')) {
    await stageBTables();
  }

  if (which.includes('stage-c')) {
    await stageCTables();
  }

  if (which.includes('evaluation')) {
    await evaluationTables();
  }

  await fs.ensureDir(path.join(stageDir('tables')));
};

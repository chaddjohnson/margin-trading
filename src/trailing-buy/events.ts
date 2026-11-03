// Post-holdout, explanatory only (nothing is selected here): per-episode attribution over the whole
// research window 2014-01-02 -> 2026-10-14 for intuitive fixed configurations and the frozen picks,
// grouped by depth, speed and shape; deep-correction detail; entry traces and drawdown curves.
import fs from 'fs-extra';
import { lineChart, traceChart, writeChart } from './charts.ts';
import { finalFold, resultsDir } from './constants.ts';
import { type DetailEntry, detailRuns, episodeComparison, tradesRows } from './detail.ts';
import { type StrategyParams, baselineParams } from './engine.ts';
import { analysisEpisodes } from './episodes.ts';
import { freezeFile } from './freeze.ts';
import { money, percent, signedMoney, table } from './format.ts';
import { describeParams } from './params.ts';
import { foldIndexes, openFullUnchecked, toCsv, writeJson, writeText } from './study.ts';

const fixed = (x: number, y: number): StrategyParams => ({
  ...baselineParams,
  entryMode: 'fixed',
  armTenths: x,
  reboundTenths: y
});

export const runEvents = async () => {
  if (!(await fs.pathExists(`${resultsDir}/holdout/attempts.json`))) {
    throw new Error('Event attribution over the full window is post-holdout reporting; run the holdout first');
  }

  const freeze = await fs.readJson(freezeFile);
  const study = await openFullUnchecked(0);
  const dir = 'events';

  try {
    const byId = Object.fromEntries(
      (freeze.types as { id: string; perFold: Record<string, StrategyParams> }[]).map((type) => [
        type.id,
        type.perFold.FINAL!
      ])
    );
    const entries: DetailEntry[] = [
      { label: 'B0', params: baselineParams },
      { label: 'X10 Y1', params: fixed(100, 10) },
      { label: 'X10 Y2', params: fixed(100, 20) },
      { label: 'X10 Y3', params: fixed(100, 30) },
      { label: 'X10 Y5', params: fixed(100, 50) },
      { label: 'X15 Y2', params: fixed(150, 20) },
      { label: 'X20 Y2', params: fixed(200, 20) },
      { label: 'X15 immediate', params: { ...baselineParams, armTenths: 150 } },
      {
        label: 'ATR X10 K2.0 N14',
        params: { ...baselineParams, entryMode: 'atrSnapshot', atrMultTenths: 20, atrPeriod: 14 }
      },
      ...[
        'P1.balanced',
        'P2xy.balanced',
        'P3snap.balanced',
        'P4.legacy.balanced',
        'P4.fixed.balanced',
        'P4.atr.balanced'
      ].map((id) => ({ label: id, params: byId[id]! }))
    ];
    const first = study.start;
    const last = foldIndexes(study, finalFold).testEnd;
    const runs = detailRuns(study, entries, first, last, first);
    const base = runs[0]!;
    const episodes = analysisEpisodes(study.bars, first, last);
    const attribution = runs.slice(1).flatMap((run) => episodeComparison(study, base, run, episodes, first, last));

    await writeText(`${dir}/episode_attribution_2014_2026.csv`, toCsv(attribution));
    // Daily mark-to-market curves at full precision, one column per run.
    await writeText(
      `${dir}/daily_mtm_2014_2026.csv`,
      toCsv(
        study.bars.date.slice(first, last + 1).map((date, offset) => ({
          date,
          close: study.bars.close[first + offset],
          ...Object.fromEntries(runs.map((run) => [run.label, run.result.mtm[first + offset]]))
        }))
      )
    );
    await writeText(`${dir}/trades_2014_2026.csv`, toCsv(runs.flatMap((run) => tradesRows(study, run))));

    const episodeTable = table(
      [
        'Start',
        'Reference high',
        'Trough (date)',
        'Depth',
        'Descent',
        'Speed',
        'Shape',
        'Failed rallies',
        'Recovered',
        'Period'
      ],
      episodes.map((episode) => [
        study.bars.date[episode.startIndex]!,
        `$${episode.referenceHigh.toFixed(2)}`,
        study.bars.date[episode.troughIndex]!,
        percent(episode.depth),
        `${episode.descentSessions} sessions`,
        episode.speed,
        episode.shape,
        episode.failedRallies,
        episode.recovered ? study.bars.date[episode.endIndex]! : 'no',
        study.bars.date[episode.startIndex]! >= '2023-01-03' ? 'holdout' : 'development'
      ])
    );
    const groupings: { name: string; key: (row: (typeof attribution)[number]) => string }[] = [
      { name: 'depth', key: (row) => row.depthClass },
      { name: 'speed', key: (row) => row.speed },
      { name: 'shape', key: (row) => row.shape }
    ];
    const groupTables = groupings.map((grouping) => {
      const values = [...new Set(attribution.filter((row) => row.block !== 'calm').map(grouping.key))].sort();

      return [
        `\n### By ${grouping.name} (Σ block P&L difference vs B0; blocks better than B0 / blocks)\n`,
        table(
          ['Run', ...values],
          runs.slice(1).map((run) => [
            run.label,
            ...values.map((value) => {
              const rows = attribution.filter(
                (row) => row.candidate === run.label && row.block !== 'calm' && grouping.key(row) === value
              );

              return `${signedMoney(rows.reduce((total, row) => total + row.blockDifference, 0))} (${rows.filter((row) => row.blockDifference > 0).length}/${rows.length})`;
            })
          ])
        )
      ].join('\n');
    });
    const deep = attribution.filter((row) => row.depth >= 0.2);
    const deepTable = table(
      [
        'Episode',
        'Depth / shape',
        'Run',
        'B0 first buy',
        'Run first buy',
        'Run buy vs B0 buy',
        'Run buy above trough',
        'B0 block P&L',
        'Run block P&L',
        'Difference'
      ],
      deep.map((row) => [
        row.block,
        `${percent(row.depth)} ${row.speed} ${row.shape}`,
        row.candidate,
        `${row.baseFirstEntry} $${row.baseEntryPrice.toFixed(2)}`,
        row.candFirstEntry ? `${row.candFirstEntry} $${row.candEntryPrice.toFixed(2)}` : 'none',
        percent(row.relativeEntryPrice),
        percent(row.candEntryAboveTrough),
        money(row.baseBlockPnl),
        money(row.candBlockPnl),
        signedMoney(row.blockDifference)
      ])
    );

    // Entry traces for the named events: B0 vs X = 10%, Y = 3%.
    const charts: string[] = [];
    const trace = runs.find((run) => run.label === 'X10 Y3')!;

    for (const [name, from, to] of [
      ['2018q4', '2018-09-15', '2019-04-30'],
      ['2020', '2020-02-01', '2020-07-31'],
      ['2022', '2022-01-01', '2023-02-28'],
      ['2025', '2025-02-01', '2025-07-31'],
      ['2026', '2026-01-15', '2026-10-14']
    ] as const) {
      const a = study.index(from);
      const b = study.lastIndex(to);
      const marks = (run: typeof trace) => ({
        name: run.label,
        entries: run.result.trades
          .filter((t) => t.entryIndex >= a && t.entryIndex <= b)
          .map((t) => ({ index: t.entryIndex - a, price: t.entryPrice })),
        exits: run.result.trades
          .filter((t) => t.exitIndex >= a && t.exitIndex <= b)
          .map((t) => ({ index: t.exitIndex - a, price: t.exitPrice }))
      });

      charts.push(
        await writeChart(
          `event_trace_${name}`,
          traceChart({
            title: `VGT ${from} → ${to}: where B0 and the X = 10% / Y = 3% trailing entry traded`,
            subtitle: 'Adjusted daily closes; triangles are fills at their actual prices (B0 exits apply to both)',
            dates: study.bars.date.slice(a, b + 1),
            close: study.bars.close.slice(a, b + 1),
            strategies: [marks(base), marks(trace)]
          })
        )
      );
    }

    const underwater = (run: typeof base) => {
      let peak = 0;

      return Array.from(run.result.mtm.slice(first, last + 1)).map((value) => {
        peak = Math.max(peak, value);

        return value - peak;
      });
    };

    charts.push(
      await writeChart(
        'drawdown_curves_2014_2026',
        lineChart({
          title: 'Mark-to-market drawdown from the running peak, 2014-01-02 → 2026-10-14 (close fills, 11%)',
          subtitle:
            'B0 vs the X = 10% / Y = 3% trailing entry and the frozen fully optimized fixed-trailing balanced pick',
          dates: study.bars.date.slice(first, last + 1),
          series: [base, trace, runs.find((run) => run.label === 'P4.fixed.balanced')!].map((run) => ({
            name: run.label,
            values: underwater(run)
          }))
        })
      )
    );

    // Curves: the full period and the holdout (each starting at $0), B0 against representative frozen picks.
    const holdoutFirst = foldIndexes(study, finalFold).testStart;
    const curve = (labels: string[], from: number) =>
      runs
        .filter((run) => labels.includes(run.label))
        .map((run) => {
          const base = from > first ? run.result.mtm[from - 1]! : 0;

          return {
            name: run.label,
            values: Array.from(run.result.mtm.slice(from, last + 1)).map((value) => value - base)
          };
        });

    charts.push(
      await writeChart(
        'holdout_curves_full_period',
        lineChart({
          title: 'Mark-to-market P&L 2014-01-02 → 2026-10-14 (close fills, 11%): B0 vs optimized picks',
          subtitle: 'Parameters frozen on 2014–2022; the holdout starts 2023-01-03',
          dates: study.bars.date.slice(first, last + 1),
          series: curve(['B0', 'P4.legacy.balanced', 'P4.fixed.balanced'], first)
        })
      ),
      await writeChart(
        'holdout_curves',
        lineChart({
          title: 'Holdout MTM P&L 2023-01-03 → 2026-10-14 (continuous attribution, close fills, 11%)',
          subtitle: 'B0 vs the joint X/Y and fully optimized fixed-trailing balanced picks',
          dates: study.bars.date.slice(holdoutFirst, last + 1),
          series: curve(['B0', 'P2xy.balanced', 'P4.fixed.balanced'], holdoutFirst)
        })
      )
    );

    const tables = [
      '## Analysis episodes 2014-01-02 → 2026-10-14 (PROTOCOL.md §10; price-only, never a signal)\n',
      episodeTable,
      '\n## Runs\n',
      table(
        ['Run', 'Parameters', 'Net 2014–2026', 'Max DD', 'Entries'],
        runs.map((run) => [
          run.label,
          describeParams(run.params),
          money(run.metrics.netProfit),
          money(run.metrics.maximumDrawdown),
          run.metrics.entries
        ])
      ),
      '\n## Grouped attribution vs B0, 2014–2026',
      ...groupTables,
      '\n## Corrections of 20% or more: first entries and block P&L\n',
      deepTable
    ].join('\n');

    await writeText(`${dir}/tables.md`, `${tables}\n`);
    await writeJson(`${dir}/summary.json`, {
      charts,
      runs: runs.map((run) => ({
        label: run.label,
        params: run.params,
        net: run.metrics.netProfit,
        dd: run.metrics.maximumDrawdown
      }))
    });

    return { tables };
  } finally {
    await study.close();
  }
};

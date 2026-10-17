// Phase 1: X fixed at 10%, every exit and re-entry setting at B0, the trailing rebound Y swept from 0.5% to
// 8.0% in 0.1-pp steps (the 0.5-pp points are the initial sweep). Walk-forward picks per fold, then the
// development-period detail: entry counts, waits, setups, per-episode attribution, curves, sensitivities.
import { lineChart, writeChart } from './charts.ts';
import { finalFold } from './constants.ts';
import { detailRuns, episodeComparison, metricsRow, setupsRows, tradesRows } from './detail.ts';
import { type StrategyParams, baselineParams, checkedInParams } from './engine.ts';
import { analysisEpisodes } from './episodes.ts';
import { money, percent, signedMoney, table } from './format.ts';
import { type GridSpec, type GridStudy, aggregate, classify, rowsToCsv, runGridFold, runGridStudy } from './grids.ts';
import { describeParams } from './params.ts';
import { type Study, foldIndexes, openDevelopment, toCsv, writeJson, writeText } from './study.ts';

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_value, index) => from + index);

export const fixedAt = (reboundTenths: number, base: StrategyParams = baselineParams): StrategyParams => ({
  ...base,
  entryMode: 'fixed',
  reboundTenths
});

export const phase1Spec: GridSpec = {
  id: 'phase1-fixed-x10',
  base: fixedAt(30),
  dims: [{ key: 'reboundTenths', values: range(5, 80), radius: 3 }]
};

export const writeGridStudy = async (dir: string, grid: GridStudy) => {
  for (const fold of grid.folds) {
    await writeText(`${dir}/grid_${fold.foldId}.csv`, toCsv(rowsToCsv(grid.spec, fold.rows)));
  }

  const picks = grid.folds.map((fold) => ({
    fold: fold.foldId,
    baseline: { net: fold.baseline.netProfit, dd: fold.baseline.maximumDrawdown, entries: fold.baseline.entries },
    front: fold.front.length,
    picks: Object.fromEntries(
      (['profit', 'balanced', 'lowDD'] as const).map((name) => {
        const pick = fold.picks[name];

        return [
          name,
          {
            params: pick.params,
            describe: describeParams(pick.params),
            net: pick.net,
            dd: pick.dd,
            netP25: pick.netP25,
            ddP75: pick.ddP75,
            entries: pick.entries,
            fallback: 'fallback' in pick ? pick.fallback : false
          }
        ];
      })
    )
  }));

  await writeJson(`${dir}/picks.json`, picks);
  await writeText(
    `${dir}/validation.csv`,
    toCsv(
      grid.validations.map((row) => ({
        fold: row.foldId,
        label: row.label,
        params: describeParams(row.params),
        net: row.continuous.netProfit,
        drawdown: row.continuous.maximumDrawdown,
        entries: row.continuous.entries,
        interest: row.continuous.interest,
        timeInMarket: row.continuous.timeInMarket,
        flatNet: row.flat.netProfit,
        flatDrawdown: row.flat.maximumDrawdown,
        flatEntries: row.flat.entries
      }))
    )
  );

  return picks;
};

// The walk-forward table: each pick's validation results per fold and in aggregate, against B0.
export const walkForwardTable = (grid: GridStudy, labels = ['B0', 'profit', 'balanced', 'lowDD']) => {
  const b0 = aggregate(grid.validations, 'B0');
  const rows = labels.map((label) => {
    const agg = aggregate(grid.validations, label);
    const flat = aggregate(grid.validations, label, 'flat');

    return [
      label,
      ...agg.perFold.map((fold) => `${money(fold.net)} / ${money(fold.dd)}`),
      money(agg.net),
      money(agg.worstDrawdown),
      label === 'B0' ? '–' : classify({ net: agg.net, dd: agg.worstDrawdown }, { net: b0.net, dd: b0.worstDrawdown }),
      `${money(flat.net)} / ${money(flat.worstDrawdown)}`
    ];
  });
  const folds = aggregate(grid.validations, 'B0').perFold.map((fold) => `${fold.fold} net / DD`);

  return table(['Pick', ...folds, 'Σ net', 'Worst DD', 'Class vs B0', 'Flat start Σ net / worst DD'], rows);
};

export const picksTable = (grid: GridStudy) =>
  table(
    ['Fold', 'Pick', 'Parameters', 'Training net', 'Training DD', 'Robust net (P25)', 'Robust DD (P75)', 'Entries'],
    grid.folds.flatMap((fold) => [
      [
        fold.foldId,
        'B0',
        describeParams(baselineParams),
        money(fold.baseline.netProfit),
        money(fold.baseline.maximumDrawdown),
        '–',
        '–',
        fold.baseline.entries
      ],
      ...(['profit', 'balanced', 'lowDD'] as const).map((name) => {
        const pick = fold.picks[name];
        const fallback = 'fallback' in pick && pick.fallback ? ' (fallback)' : '';

        return [
          fold.foldId,
          `${name}${fallback}`,
          describeParams(pick.params),
          money(pick.net),
          money(pick.dd),
          money(pick.netP25),
          money(pick.ddP75),
          pick.entries
        ];
      })
    ])
  );

const developmentDetail = async (
  study: Study,
  dir: string,
  entries: { label: string; params: StrategyParams; options?: object }[]
) => {
  const folds = foldIndexes(study, finalFold);
  const first = folds.trainStart;
  const last = folds.trainEnd;
  const runs = detailRuns(study, entries, first, last, first);
  const base = runs.find((run) => run.label === 'B0')!;
  const episodes = analysisEpisodes(study.bars, first, last);
  const attribution = runs
    .filter((run) => run !== base)
    .flatMap((run) => episodeComparison(study, base, run, episodes, first, last));

  await writeText(`${dir}/development_runs.csv`, toCsv(runs.map(metricsRow)));
  await writeText(`${dir}/development_setups.csv`, toCsv(runs.flatMap((run) => setupsRows(study, run))));
  await writeText(`${dir}/development_trades.csv`, toCsv(runs.flatMap((run) => tradesRows(study, run))));
  await writeText(`${dir}/development_episode_attribution.csv`, toCsv(attribution));
  await writeText(
    `${dir}/development_annual.csv`,
    toCsv(
      runs.flatMap((run) => run.metrics.annual.map((year) => ({ label: run.label, year: year.year, pnl: year.pnl })))
    )
  );

  return { runs, attribution, episodes, first, last };
};

export const runPhase1 = async () => {
  const study = await openDevelopment();
  const dir = 'phase1';

  try {
    const grid = await runGridStudy(study, phase1Spec);
    const picks = await writeGridStudy(dir, grid);
    const finalGrid = grid.folds.find((fold) => fold.foldId === 'FINAL')!;
    const finalFolds = foldIndexes(study, finalFold);

    // Sensitivities on development (training window of the FINAL fold).
    const variants: { id: string; spec: GridSpec }[] = [
      { id: 'variantB', spec: { ...phase1Spec, id: 'phase1-variantB', options: { restrictedFill: 'B' } } },
      { id: 'fillHigh', spec: { ...phase1Spec, id: 'phase1-fillHigh', options: { frozenHigh: 'fill' } } },
      {
        id: 'B0c-exits',
        spec: { ...phase1Spec, id: 'phase1-B0c', base: fixedAt(30, checkedInParams), baseline: checkedInParams }
      },
      ...[10, 20, 40].map((sessions) => ({
        id: `maxWait${sessions}`,
        spec: { ...phase1Spec, id: `phase1-maxWait${sessions}`, options: { maxWaitSessions: sessions } }
      }))
    ];
    const variantGrids = [];

    for (const variant of variants) {
      const fold = await runGridFold(study, variant.spec, finalFolds);

      await writeText(`${dir}/variant_${variant.id}_development.csv`, toCsv(rowsToCsv(variant.spec, fold.rows)));
      variantGrids.push({ id: variant.id, fold });
    }

    // Development detail: B0, the 0.5-pp sweep and the FINAL-fold picks.
    const sweep = range(1, 16).map((step) => step * 5);
    const entries = [
      { label: 'B0', params: baselineParams },
      ...sweep.map((value) => ({ label: `Y=${(value / 10).toFixed(1)}%`, params: fixedAt(value) })),
      ...(['profit', 'balanced', 'lowDD'] as const).map((name) => ({
        label: `pick:${name}`,
        params: finalGrid.picks[name].params
      }))
    ];
    const detail = await developmentDetail(study, dir, entries);

    // Charts: net and drawdown across Y on development, and the curves of B0 and the picks.
    const yLabels = finalGrid.rows.map((row) => `${(row.params.reboundTenths / 10).toFixed(1)}%`);
    const b0 = finalGrid.baseline;
    const charts = [
      await writeChart(
        'phase1_net_vs_y',
        lineChart({
          title: 'Net P&L by rebound Y (X = 10%, B0 exits), development 2014–2022',
          subtitle: `Own net and neighbourhood P25 (±0.3 pp); B0 immediate entry = ${money(b0.netProfit)}`,
          dates: yLabels,
          categories: { label: 'Rebound Y', tickEvery: 5 },
          series: [
            { name: 'B0 (immediate)', values: yLabels.map(() => b0.netProfit) },
            { name: 'Trailing net', values: finalGrid.rows.map((row) => row.net) },
            { name: 'Robust P25', values: finalGrid.rows.map((row) => row.netP25) }
          ]
        })
      ),
      await writeChart(
        'phase1_dd_vs_y',
        lineChart({
          title: 'Maximum MTM drawdown by rebound Y (X = 10%, B0 exits), development 2014–2022',
          subtitle: `Own drawdown and neighbourhood P75 (±0.3 pp); B0 = ${money(b0.maximumDrawdown)}`,
          dates: yLabels,
          categories: { label: 'Rebound Y', tickEvery: 5 },
          series: [
            { name: 'B0 (immediate)', values: yLabels.map(() => b0.maximumDrawdown) },
            { name: 'Trailing DD', values: finalGrid.rows.map((row) => row.dd) },
            { name: 'Robust P75', values: finalGrid.rows.map((row) => row.ddP75) }
          ]
        })
      )
    ];
    const curveRuns = detail.runs.filter(
      (run) => run.label === 'B0' || run.label === 'pick:profit' || run.label === 'pick:lowDD'
    );
    const curveDates = study.bars.date.slice(detail.first, detail.last + 1);

    charts.push(
      await writeChart(
        'phase1_curves_development',
        lineChart({
          title: 'Mark-to-market P&L, development 2014–2022: B0 vs Phase 1 picks',
          subtitle: curveRuns
            .map((run) => `${run.label}: ${describeParams(run.params)}`)
            .slice(1)
            .join(' · '),
          dates: curveDates,
          series: curveRuns.map((run) => ({
            name: run.label,
            values: Array.from(run.result.mtm.slice(detail.first, detail.last + 1))
          }))
        })
      )
    );

    // Tables for the report.
    const sweepRows = detail.runs.map((run) => {
      const m = run.metrics;

      return [
        run.label,
        money(m.netProfit),
        money(m.maximumDrawdown),
        money(m.interest),
        m.entries,
        percent(m.winRate, 0),
        percent(m.timeInMarket, 1),
        m.setupsArmed || '–',
        m.setupsCancelled || '–',
        m.setupsPendingAtEnd || '–',
        Number.isFinite(m.meanWaitSessions) ? m.meanWaitSessions.toFixed(1) : '–',
        money(m.worstTradeMark)
      ];
    });
    const attributionSummary = detail.runs
      .filter((run) => run.label !== 'B0')
      .map((run) => {
        const rows = detail.attribution.filter((row) => row.candidate === run.label && row.block !== 'calm');
        const finite = (values: number[]) => values.filter(Number.isFinite);
        const relative = finite(rows.map((row) => row.relativeEntryPrice));
        const above = finite(rows.map((row) => row.candEntryAboveTrough));
        const baseToTrough = finite(rows.map((row) => row.baseEntryToTrough));
        const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN);

        return [
          run.label,
          rows.filter((row) => row.blockDifference > 0).length + ' / ' + rows.length,
          signedMoney(rows.reduce((total, row) => total + row.blockDifference, 0)),
          percent(mean(relative)),
          percent(mean(baseToTrough)),
          percent(mean(above)),
          rows.filter((row) => row.tradeDisappeared).length,
          rows.filter((row) => row.tradeAppeared).length
        ];
      });
    const variantRows = variantGrids.map(({ id, fold }) => {
      const at30 = fold.rows.find((row) => row.params.reboundTenths === 30)!;
      const primary30 = finalGrid.rows.find((row) => row.params.reboundTenths === 30)!;

      return [
        id,
        `${money(fold.baseline.netProfit)} / ${money(fold.baseline.maximumDrawdown)}`,
        `${money(at30.net)} / ${money(at30.dd)}`,
        `${money(primary30.net)} / ${money(primary30.dd)}`,
        `${describeParams(fold.picks.profit.params).match(/Y=[\d.]+%/)?.[0]} ${money(fold.picks.profit.net)} / ${money(fold.picks.profit.dd)}`,
        `${describeParams(fold.picks.lowDD.params).match(/Y=[\d.]+%/)?.[0]} ${money(fold.picks.lowDD.net)} / ${money(fold.picks.lowDD.dd)}`
      ];
    });
    const tables = [
      '## Picks per fold (training windows)\n',
      picksTable(grid),
      '\n## Walk-forward validation (continuous attribution; flat start in the last column)\n',
      walkForwardTable(grid),
      '\n## Development 2014-01-02 → 2022-12-30: the 0.5-pp sweep and the FINAL picks\n',
      table(
        [
          'Run',
          'Net',
          'Max DD',
          'Interest',
          'Entries',
          'Win rate',
          'In market',
          'Setups',
          'Cancelled',
          'Pending at end',
          'Mean wait (sessions)',
          'Worst open-trade mark'
        ],
        sweepRows
      ),
      '\n## Per-episode attribution vs B0 (development; blocks = episode start to next episode start)\n',
      table(
        [
          'Run',
          'Blocks better than B0',
          'Σ block difference',
          'Mean entry vs B0 entry',
          'Mean B0 entry → trough',
          'Mean entry above trough',
          'Trades disappeared',
          'Trades appeared'
        ],
        attributionSummary
      ),
      '\n## Sensitivities on development (Y = 3.0% shown; picks = profit / lowDD)\n',
      table(
        [
          'Variant',
          'Variant baseline net / DD',
          'Variant Y=3.0% net / DD',
          'Primary Y=3.0% net / DD',
          'Variant profit pick',
          'Variant lowDD pick'
        ],
        variantRows
      )
    ].join('\n');

    await writeText(`${dir}/tables.md`, `${tables}\n`);
    await writeJson(`${dir}/summary.json`, {
      spec: { ...phase1Spec, points: grid.points },
      picks,
      walkForward: ['B0', 'profit', 'balanced', 'lowDD'].map((label) => ({
        ...aggregate(grid.validations, label),
        flat: aggregate(grid.validations, label, 'flat')
      })),
      variants: variantGrids.map(({ id, fold }) => ({ id, baseline: fold.baseline, picks: fold.picks })),
      episodes: detail.episodes.map((episode) => ({
        ...episode,
        start: study.bars.date[episode.startIndex],
        end: study.bars.date[episode.endIndex],
        trough: study.bars.date[episode.troughIndex]
      })),
      charts
    });

    return { grid, tables };
  } finally {
    await study.close();
  }
};

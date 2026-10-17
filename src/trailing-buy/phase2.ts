// Phase 2: joint arm drawdown X (7.0%-20.0%) and rebound Y (0.5%-8.0%), exits at B0, on the full 0.1-pp
// grid, with the legacy (immediate) X-only grid as the fair comparator. Walk-forward picks, development
// heatmaps and Pareto views, and the activation-depth analysis by episode speed and depth.
import { heatmap, scatterChart, writeChart } from './charts.ts';
import { finalFold } from './constants.ts';
import { detailRuns, episodeComparison, metricsRow } from './detail.ts';
import { type StrategyParams, baselineParams } from './engine.ts';
import { analysisEpisodes } from './episodes.ts';
import { money, signedMoney, table } from './format.ts';
import { type GridSpec, type GridStudy, aggregate, classify, runGridStudy } from './grids.ts';
import { describeParams } from './params.ts';
import { picksTable, walkForwardTable, writeGridStudy } from './phase1.ts';
import { foldIndexes, openDevelopment, toCsv, writeJson, writeText } from './study.ts';

export const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_value, index) => from + index);

export const phase2Spec: GridSpec = {
  id: 'phase2-fixed-xy',
  base: { ...baselineParams, entryMode: 'fixed', reboundTenths: 30 },
  dims: [
    { key: 'armTenths', values: range(70, 200), radius: 3 },
    { key: 'reboundTenths', values: range(5, 80), radius: 3 }
  ]
};

export const legacyXSpec: GridSpec = {
  id: 'phase2-legacy-x',
  base: baselineParams,
  dims: [{ key: 'armTenths', values: range(70, 200), radius: 3 }]
};

const pct = (tenths: number) => `${(tenths / 10).toFixed(1)}%`;

export const combinedWalkForwardTable = (studies: { name: string; grid: GridStudy }[]) => {
  const b0 = aggregate(studies[0]!.grid.validations, 'B0');
  const rows = [
    [
      'B0',
      '–',
      ...b0.perFold.map((fold) => `${money(fold.net)} / ${money(fold.dd)}`),
      money(b0.net),
      money(b0.worstDrawdown),
      '–'
    ]
  ];

  for (const { name, grid } of studies) {
    for (const label of ['profit', 'balanced', 'lowDD']) {
      const agg = aggregate(grid.validations, label);

      rows.push([
        name,
        label,
        ...agg.perFold.map((fold) => `${money(fold.net)} / ${money(fold.dd)}`),
        money(agg.net),
        money(agg.worstDrawdown),
        classify({ net: agg.net, dd: agg.worstDrawdown }, { net: b0.net, dd: b0.worstDrawdown })
      ]);
    }
  }

  return table(
    ['Family', 'Pick', ...b0.perFold.map((fold) => `${fold.fold} net / DD`), 'Σ net', 'Worst DD', 'Class vs B0'],
    rows
  );
};

export const runPhase2 = async () => {
  const study = await openDevelopment();
  const dir = 'phase2';

  try {
    const xy = await runGridStudy(study, phase2Spec);
    const legacyX = await runGridStudy(study, legacyXSpec);

    await writeGridStudy(`${dir}/xy`, xy);
    await writeGridStudy(`${dir}/legacyX`, legacyX);

    const finalXY = xy.folds.find((fold) => fold.foldId === 'FINAL')!;
    const finalLegacy = legacyX.folds.find((fold) => fold.foldId === 'FINAL')!;
    const b0 = finalXY.baseline;
    const xs = phase2Spec.dims[0]!.values;
    const ys = phase2Spec.dims[1]!.values;
    // Heatmap rows = Y (top = largest), columns = X.
    const cellsOf = (pick: (row: (typeof finalXY.rows)[number]) => number) =>
      [...ys]
        .reverse()
        .map((y) =>
          xs.map((x) => pick(finalXY.rows.find((row) => row.params.armTenths === x && row.params.reboundTenths === y)!))
        );
    const rowOf = (params: StrategyParams) => [...ys].reverse().indexOf(params.reboundTenths);
    const marks = (['profit', 'balanced', 'lowDD'] as const).map((name) => ({
      row: rowOf(finalXY.picks[name].params),
      column: xs.indexOf(finalXY.picks[name].params.armTenths),
      label: name
    }));
    const dedupedMarks = marks.filter(
      (mark, index) => marks.findIndex((other) => other.row === mark.row && other.column === mark.column) === index
    );
    const anchor = { row: rowOf({ ...baselineParams, reboundTenths: 30 }), column: xs.indexOf(100), label: 'X10/Y3' };
    const common = {
      xLabel: 'Arm drawdown X',
      yLabel: 'Rebound Y',
      xValues: xs.map(pct),
      yValues: [...ys].reverse().map(pct),
      xTickEvery: 10,
      yTickEvery: 5,
      marks: [...dedupedMarks, anchor]
    };
    const charts = [
      await writeChart(
        'phase2_heat_net_minus_b0',
        heatmap({
          ...common,
          title: 'Net P&L minus B0, joint X / Y (B0 exits), development 2014–2022',
          subtitle: `Blue = more than B0 (${money(b0.netProfit)}), red = less; ±$60k scale`,
          cells: cellsOf((row) => row.net - b0.netProfit),
          format: (value) => signedMoney(value),
          diverging: { center: 0, span: 60000 }
        })
      ),
      await writeChart(
        'phase2_heat_dd_minus_b0',
        heatmap({
          ...common,
          title: 'Maximum MTM drawdown minus B0, joint X / Y (B0 exits), development 2014–2022',
          subtitle: `Blue = shallower than B0 (${money(b0.maximumDrawdown)}), red = deeper; ±$30k scale`,
          cells: cellsOf((row) => b0.maximumDrawdown - row.dd),
          format: (value) => signedMoney(value),
          diverging: { center: 0, span: 30000 }
        })
      ),
      await writeChart(
        'phase2_heat_robust_net',
        heatmap({
          ...common,
          title: 'Robust net (25th percentile over ±0.3 pp in X and Y) minus B0, development',
          subtitle: 'Plateaus, not points: an isolated spike scores low here',
          cells: cellsOf((row) => row.netP25 - b0.netProfit),
          format: (value) => signedMoney(value),
          diverging: { center: 0, span: 60000 }
        })
      ),
      await writeChart(
        'phase2_pareto_development',
        scatterChart({
          title: 'Net P&L vs maximum drawdown, development 2014–2022 (B0 exits)',
          subtitle: `${finalXY.rows.length.toLocaleString('en-US')} trailing X/Y points and ${finalLegacy.rows.length} immediate-entry X points; B0 and picks labelled`,
          groups: ['Trailing X/Y', 'Immediate X (legacy)', 'B0 / picks'],
          xLabel: 'Maximum MTM drawdown',
          yLabel: 'Net P&L after interest',
          points: [
            ...finalXY.rows.map((row) => ({
              x: row.dd,
              y: row.net,
              group: 0,
              tip: `${describeParams(row.params)}: ${money(row.net)} / ${money(row.dd)}`
            })),
            ...finalLegacy.rows.map((row) => ({
              x: row.dd,
              y: row.net,
              group: 1,
              tip: `${describeParams(row.params)}: ${money(row.net)} / ${money(row.dd)}`
            })),
            {
              x: b0.maximumDrawdown,
              y: b0.netProfit,
              group: 2,
              label: 'B0',
              tip: `B0: ${money(b0.netProfit)} / ${money(b0.maximumDrawdown)}`
            },
            ...(['profit', 'lowDD'] as const).map((name) => ({
              x: finalXY.picks[name].dd,
              y: finalXY.picks[name].net,
              group: 2,
              label: `XY ${name}`,
              tip: `${describeParams(finalXY.picks[name].params)}`
            }))
          ]
        })
      )
    ];

    // Plateau census on development: points whose whole neighbourhood beats B0.
    const census = (grid: typeof finalXY) => ({
      points: grid.rows.length,
      ownBeatsBoth: grid.rows.filter((row) => row.net >= b0.netProfit && row.dd <= b0.maximumDrawdown).length,
      robustBeatsBoth: grid.rows.filter((row) => row.netP25 >= b0.netProfit && row.ddP75 <= b0.maximumDrawdown).length,
      ownNetAbove: grid.rows.filter((row) => row.net >= b0.netProfit).length,
      ownDdBelow: grid.rows.filter((row) => row.dd <= b0.maximumDrawdown).length,
      robustRiskTradeOff: grid.rows.filter(
        (row) => row.netP25 >= 0.9 * b0.netProfit && row.ddP75 <= 0.85 * b0.maximumDrawdown
      ).length
    });
    const plateau = { xy: census(finalXY), legacyX: census(finalLegacy) };

    // Activation depth: X = 10 / 15 / 20% immediate and with Y = 1 / 2 / 3 / 5%, by episode speed and depth.
    const folds = foldIndexes(study, finalFold);
    const depthEntries = [10, 15, 20].flatMap((x) => [
      { label: `legacy X=${x}%`, params: { ...baselineParams, armTenths: x * 10 } },
      ...[10, 20, 30, 50].map((y) => ({
        label: `X=${x}% Y=${y / 10}%`,
        params: { ...baselineParams, entryMode: 'fixed' as const, armTenths: x * 10, reboundTenths: y }
      }))
    ]);
    const runs = detailRuns(
      study,
      [{ label: 'B0', params: baselineParams }, ...depthEntries],
      folds.trainStart,
      folds.trainEnd,
      folds.trainStart
    );
    const episodes = analysisEpisodes(study.bars, folds.trainStart, folds.trainEnd);
    const base = runs[0]!;
    const attribution = runs
      .slice(1)
      .flatMap((run) => episodeComparison(study, base, run, episodes, folds.trainStart, folds.trainEnd));
    const groups = ['fast', 'gradual'].flatMap((speed) =>
      ['10-15%', '15-20%', '20-25%', '>=25%'].map((depthClass) => ({ speed, depthClass }))
    );
    const depthTable = table(
      ['Run', 'Net', 'Max DD', ...groups.map((group) => `${group.speed} ${group.depthClass}`)],
      runs.slice(1).map((run) => [
        run.label,
        money(run.metrics.netProfit),
        money(run.metrics.maximumDrawdown),
        ...groups.map((group) => {
          const rows = attribution.filter(
            (row) => row.candidate === run.label && row.speed === group.speed && row.depthClass === group.depthClass
          );

          return rows.length
            ? `${signedMoney(rows.reduce((total, row) => total + row.blockDifference, 0))} (${rows.length})`
            : '–';
        })
      ])
    );
    const episodeTable = table(
      ['Episode start', 'Trough', 'End', 'Depth', 'Descent (sessions)', 'Speed', 'Shape', 'Failed rallies'],
      episodes.map((episode) => [
        study.bars.date[episode.startIndex]!,
        study.bars.date[episode.troughIndex]!,
        episode.recovered ? study.bars.date[episode.endIndex]! : 'not recovered',
        `${(episode.depth * 100).toFixed(1)}%`,
        episode.descentSessions,
        episode.speed,
        episode.shape,
        episode.failedRallies
      ])
    );

    await writeText(`${dir}/depth_runs.csv`, toCsv(runs.map(metricsRow)));
    await writeText(`${dir}/depth_episode_attribution.csv`, toCsv(attribution));

    const tables = [
      '## Picks per fold: joint X / Y\n',
      picksTable(xy),
      '\n## Picks per fold: immediate entry, X only (legacy comparator)\n',
      picksTable(legacyX),
      '\n## Walk-forward validation (continuous attribution)\n',
      combinedWalkForwardTable([
        { name: 'Trailing X/Y', grid: xy },
        { name: 'Immediate X', grid: legacyX }
      ]),
      '\n## Walk-forward, joint X / Y (with flat-start column)\n',
      walkForwardTable(xy),
      '\n## Plateau census, development (B0 = ' + `${money(b0.netProfit)} / ${money(b0.maximumDrawdown)})\n`,
      table(
        [
          'Grid',
          'Points',
          'Own net ≥ B0',
          'Own DD ≤ B0',
          'Own beats B0 on both',
          'Robust (P25 net, P75 DD) beats B0 on both',
          'Robust risk trade-off'
        ],
        Object.entries(plateau).map(([name, value]) => [
          name,
          value.points,
          value.ownNetAbove,
          value.ownDdBelow,
          value.ownBeatsBoth,
          value.robustBeatsBoth,
          value.robustRiskTradeOff
        ])
      ),
      '\n## Analysis episodes, development\n',
      episodeTable,
      '\n## Activation depth: Σ block P&L difference vs B0 by episode speed and depth (development; number of episodes in brackets)\n',
      depthTable
    ].join('\n');

    await writeText(`${dir}/tables.md`, `${tables}\n`);
    await writeJson(`${dir}/summary.json`, {
      points: { xy: xy.points, legacyX: legacyX.points },
      plateau,
      walkForward: {
        xy: ['B0', 'profit', 'balanced', 'lowDD'].map((label) => aggregate(xy.validations, label)),
        legacyX: ['B0', 'profit', 'balanced', 'lowDD'].map((label) => aggregate(legacyX.validations, label))
      },
      finalPicks: { xy: finalXY.picks, legacyX: finalLegacy.picks },
      charts
    });

    return { tables };
  } finally {
    await study.close();
  }
};

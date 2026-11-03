// Phase 3: ATR-scaled rebound, trigger = trough + K x ATR(N), exits at B0. Snapshot ATR (primary) and
// rolling ATR (robustness) on N in {5, 10, 14, 20, 30}, K 0.5-4.0, X 7.0%-20.0%. Walk-forward picks, the
// continuation test against the fixed-percent picks (PROTOCOL.md section 8), and the effective rebound
// percentage K x ATR / price by market regime.
import fs from 'fs-extra';
import { lineChart, writeChart } from './charts.ts';
import { finalFold, resultsDir } from './constants.ts';
import { baselineParams } from './engine.ts';
import { analysisEpisodes } from './episodes.ts';
import { money, percent, table } from './format.ts';
import { type GridSpec, type GridStudy, aggregate, classify, runGridStudy } from './grids.ts';
import { referenceHighs } from './indicators.ts';
import { quantile } from './selection.ts';
import { picksTable, walkForwardTable, writeGridStudy } from './phase1.ts';
import { combinedWalkForwardTable, phase2Spec, range } from './phase2.ts';
import { foldIndexes, openDevelopment, writeJson, writeText } from './study.ts';

export const atrPeriods = [5, 10, 14, 20, 30];

const atrSpec = (mode: 'atrSnapshot' | 'atrRolling'): GridSpec => ({
  id: `phase3-${mode}`,
  base: { ...baselineParams, entryMode: mode, atrMultTenths: 20, atrPeriod: 14 },
  dims: [
    { key: 'armTenths', values: range(70, 200), radius: 3 },
    { key: 'atrMultTenths', values: range(5, 40), radius: 3 },
    { key: 'atrPeriod', values: atrPeriods, radius: 1 }
  ]
});

// PROTOCOL.md section 8: ATR continues if, for at least 2 of the 3 picks, its walk-forward aggregate is
// Dominant over the same pick of the fixed-percent joint grid.
export const continuationTest = (atr: GridStudy, fixed: GridStudy) => {
  const rows = (['profit', 'balanced', 'lowDD'] as const).map((label) => {
    const a = aggregate(atr.validations, label);
    const f = aggregate(fixed.validations, label);
    const verdict = classify({ net: a.net, dd: a.worstDrawdown }, { net: f.net, dd: f.worstDrawdown });

    return { label, atr: { net: a.net, dd: a.worstDrawdown }, fixed: { net: f.net, dd: f.worstDrawdown }, verdict };
  });

  return { rows, continues: rows.filter((row) => row.verdict === 'Dominant').length >= 2 };
};

export const runPhase3 = async () => {
  const study = await openDevelopment();
  const dir = 'phase3';

  try {
    const snapshot = await runGridStudy(study, atrSpec('atrSnapshot'));
    const rolling = await runGridStudy(study, atrSpec('atrRolling'));
    // The fixed-percent comparator is Phase 2's joint grid, re-run here so both use identical code paths.
    const fixed = await runGridStudy(study, phase2Spec);

    await writeGridStudy(`${dir}/snapshot`, snapshot);
    await writeGridStudy(`${dir}/rolling`, rolling);

    const continuation = continuationTest(snapshot, fixed);
    const rollingVsFixed = continuationTest(rolling, fixed);

    // Effective rebound K x ATR(N)[t-1] / close[t] on sessions at least 10% below the 90-session high,
    // by regime: before the trough of a fast >= 20% episode (crash), of a gradual >= 20% one (bear),
    // of a shallower one (ordinary correction), and after any episode's trough (recovering).
    const folds = foldIndexes(study, finalFold);
    const episodes = analysisEpisodes(study.bars, folds.trainStart, folds.trainEnd);
    const refs = referenceHighs(study.bars.high, 90);
    const regimeOf = (index: number) => {
      const episode = episodes.find((candidate) => index >= candidate.startIndex && index <= candidate.endIndex);

      if (!episode) {
        return undefined;
      }

      if (index > episode.troughIndex) {
        return 'recovering';
      }

      return episode.depth >= 0.2 ? (episode.speed === 'fast' ? 'crash' : 'bear') : 'ordinary';
    };
    const regimes = ['ordinary', 'crash', 'bear', 'recovering'];
    const effective: Record<string, Record<string, { n: number; p10: number; median: number; p90: number }>> = {};

    for (const period of atrPeriods) {
      const atr = study.cache.atr(period);

      for (const regime of regimes) {
        const values: number[] = [];

        for (let index = folds.trainStart; index <= folds.trainEnd; index++) {
          if (1 - study.bars.close[index]! / refs[index]! >= 0.1 && regimeOf(index) === regime) {
            values.push(atr[index - 1]! / study.bars.close[index]!);
          }
        }

        effective[`N=${period}`] ??= {};
        effective[`N=${period}`]![regime] = {
          n: values.length,
          p10: quantile(values, 0.1),
          median: quantile(values, 0.5),
          p90: quantile(values, 0.9)
        };
      }
    }

    const finalSnapshot = snapshot.folds.find((fold) => fold.foldId === 'FINAL')!;
    const finalFixed = fixed.folds.find((fold) => fold.foldId === 'FINAL')!;
    const b0 = finalSnapshot.baseline;
    const census = (rows: typeof finalSnapshot.rows) => ({
      points: rows.length,
      ownNetAbove: rows.filter((row) => row.net >= b0.netProfit).length,
      ownDdBelow: rows.filter((row) => row.dd <= b0.maximumDrawdown).length,
      ownBeatsBoth: rows.filter((row) => row.net >= b0.netProfit && row.dd <= b0.maximumDrawdown).length,
      robustBeatsBoth: rows.filter((row) => row.netP25 >= b0.netProfit && row.ddP75 <= b0.maximumDrawdown).length
    });
    const plateau = {
      snapshot: census(finalSnapshot.rows),
      rolling: census(rolling.folds.find((fold) => fold.foldId === 'FINAL')!.rows),
      fixed: census(finalFixed.rows)
    };

    // Best robust net by N (development), to show whether any period stands out.
    const byPeriod = atrPeriods.map((period) => {
      const rows = finalSnapshot.rows.filter((row) => row.params.atrPeriod === period && row.feasible);
      const best = [...rows].sort((a, b) => b.netP25 - a.netP25)[0]!;
      const lowest = [...rows].sort((a, b) => a.ddP75 - b.ddP75)[0]!;

      return [
        `N=${period}`,
        `X=${(best.params.armTenths / 10).toFixed(1)}% K=${(best.params.atrMultTenths / 10).toFixed(1)}`,
        money(best.net),
        money(best.dd),
        money(best.netP25),
        `X=${(lowest.params.armTenths / 10).toFixed(1)}% K=${(lowest.params.atrMultTenths / 10).toFixed(1)}`,
        money(lowest.net),
        money(lowest.dd),
        money(lowest.ddP75)
      ];
    });

    // Chart: median effective rebound (K = 2) by regime and period.
    const chart = await writeChart(
      'phase3_effective_rebound',
      lineChart({
        title: 'Effective rebound of a K = 2 ATR trigger, sessions ≥ 10% below the 90-session high (2014–2022)',
        subtitle: 'Median of 2 × ATR(N)[t−1] / close[t] by regime; the fixed Y% trigger is a flat line on this chart',
        dates: atrPeriods.map((period) => `N=${period}`),
        categories: { label: 'ATR period', tickEvery: 1 },
        format: (value) => `${(value * 100).toFixed(1)}%`,
        series: ['ordinary', 'crash', 'recovering'].map((regime) => ({
          name: regime,
          values: atrPeriods.map((period) => 2 * effective[`N=${period}`]![regime]!.median)
        }))
      })
    );

    const tables = [
      '## Picks per fold: ATR snapshot\n',
      picksTable(snapshot),
      '\n## Picks per fold: ATR rolling (robustness check)\n',
      picksTable(rolling),
      '\n## Walk-forward validation (continuous attribution)\n',
      combinedWalkForwardTable([
        { name: 'ATR snapshot', grid: snapshot },
        { name: 'ATR rolling', grid: rolling },
        { name: 'Fixed X/Y', grid: fixed }
      ]),
      '\n## Walk-forward, ATR snapshot (with flat-start column)\n',
      walkForwardTable(snapshot),
      '\n## Continuation test (PROTOCOL.md §8): ATR snapshot vs fixed X/Y, same pick\n',
      table(
        ['Pick', 'ATR Σ net / worst DD', 'Fixed Σ net / worst DD', 'ATR class vs fixed'],
        continuation.rows.map((row) => [
          row.label,
          `${money(row.atr.net)} / ${money(row.atr.dd)}`,
          `${money(row.fixed.net)} / ${money(row.fixed.dd)}`,
          row.verdict
        ])
      ),
      `\nATR snapshot continues to Phase 4: **${continuation.continues ? 'yes' : 'no'}**. (Rolling vs fixed, for reference: ${rollingVsFixed.rows.map((row) => `${row.label} ${row.verdict}`).join(', ')}.)\n`,
      '\n## Plateau census, development (B0 = ' + `${money(b0.netProfit)} / ${money(b0.maximumDrawdown)})\n`,
      table(
        ['Grid', 'Points', 'Own net ≥ B0', 'Own DD ≤ B0', 'Own beats B0 on both', 'Robust beats B0 on both'],
        Object.entries(plateau).map(([name, value]) => [
          name,
          value.points,
          value.ownNetAbove,
          value.ownDdBelow,
          value.ownBeatsBoth,
          value.robustBeatsBoth
        ])
      ),
      '\n## Best feasible ATR snapshot point by period, development (highest robust net; lowest robust DD)\n',
      table(
        ['Period', 'Best robust net at', 'Net', 'DD', 'Robust net', 'Lowest robust DD at', 'Net', 'DD', 'Robust DD'],
        byPeriod
      ),
      '\n## Effective rebound K × ATR(N) / close per unit K, sessions ≥ 10% below the 90-session high (development)\n',
      table(
        ['Period', ...regimes.map((regime) => `${regime} median (p10–p90), n`)],
        atrPeriods.map((period) => [
          `N=${period}`,
          ...regimes.map((regime) => {
            const value = effective[`N=${period}`]![regime]!;

            return value.n
              ? `${percent(value.median, 2)} (${percent(value.p10, 2)}–${percent(value.p90, 2)}), ${value.n}`
              : '–';
          })
        ])
      )
    ].join('\n');

    await writeText(`${dir}/tables.md`, `${tables}\n`);
    await writeJson(`${dir}/summary.json`, {
      points: snapshot.points,
      continuation,
      rollingVsFixed,
      plateau,
      effective,
      finalPicks: {
        snapshot: finalSnapshot.picks,
        rolling: rolling.folds.find((fold) => fold.foldId === 'FINAL')!.picks
      },
      walkForward: {
        snapshot: ['B0', 'profit', 'balanced', 'lowDD'].map((label) => aggregate(snapshot.validations, label)),
        rolling: ['B0', 'profit', 'balanced', 'lowDD'].map((label) => aggregate(rolling.validations, label))
      },
      chart
    });
    await fs.writeJson(`${resultsDir}/${dir}/continuation.json`, continuation, { spaces: 1 });

    return { tables, continuation };
  } finally {
    await study.close();
  }
};

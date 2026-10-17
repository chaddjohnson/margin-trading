// Phase 4: a separate Sobol + NSGA-II optimization of every strategy-controlled number for each credible
// entry family (legacy immediate, fixed-percent trailing, ATR-snapshot trailing), with an identical budget,
// on every walk-forward fold and the FINAL (development) fold; robust selection; walk-forward validation of
// the picks and the shortlist; an equal-budget random-sampling diagnostic on the FINAL fold.
import fs from 'fs-extra';
import { scatterChart, writeChart } from './charts.ts';
import { resultsDir } from './constants.ts';
import { type StrategyParams, baselineParams, checkedInParams } from './engine.ts';
import { money, table } from './format.ts';
import { type Validation, aggregate, classify, validate } from './grids.ts';
import { paretoRanks2d } from '../optimizer/nsga2.ts';
import { type Family, type Space, canonicalParams, describeParams, spaces } from './params.ts';
import {
  type Candidate,
  CandidateCache,
  type SearchConfig,
  type SearchOutput,
  runSearch,
  searchConfig
} from './search.ts';
import { type ArchiveSelection, selectFromArchive } from './selection.ts';
import {
  type FoldIndexes,
  type Study,
  developmentFolds,
  foldIndexes,
  openDevelopment,
  runJobs,
  toCsv,
  trainingJob,
  writeJson,
  writeText,
  yearsBetween
} from './study.ts';

export const anchorsOf = (family: Family): { name: string; params: StrategyParams }[] => {
  if (family === 'legacy') {
    return [
      { name: 'B0', params: baselineParams },
      { name: 'B0c', params: checkedInParams }
    ];
  }

  if (family === 'fixed') {
    return [{ name: 'B0 exits, X=10%, Y=3%', params: { ...baselineParams, entryMode: 'fixed', reboundTenths: 30 } }];
  }

  return [
    {
      name: 'B0 exits, X=10%, K=2.0, N=14',
      params: { ...baselineParams, entryMode: 'atrSnapshot', atrMultTenths: 20, atrPeriod: 14 }
    }
  ];
};

export const seedLabels = (family: Family, foldId: string, sampler: SearchConfig['sampler']) => [
  'trailing-buy-entry',
  'v1',
  family,
  foldId,
  sampler
];

export interface FamilyFold {
  family: Family;
  foldId: string;
  sampler: SearchConfig['sampler'];
  folds: FoldIndexes;
  baseline: { net: number; dd: number; entries: number };
  search: SearchOutput;
  archive: Candidate[];
  selection: ArchiveSelection;
}

export const optimizeFamilyFold = async (
  study: Study,
  family: Family,
  folds: FoldIndexes,
  sampler: SearchConfig['sampler'] = 'sobol'
): Promise<FamilyFold> => {
  const space: Space = spaces[family];
  const years = yearsBetween(study, folds.trainStart, folds.trainEnd);
  const cache = new CandidateCache(study.evaluator, space, {
    datasetId: study.datasetId,
    foldId: `${folds.fold.id}-${sampler}`,
    startIndex: folds.trainStart,
    endIndex: folds.trainEnd,
    years
  });
  const [b0] = await runJobs(study, [trainingJob(folds, baselineParams)]);
  const search = await runSearch(
    space,
    cache,
    { ...searchConfig, sampler },
    seedLabels(family, folds.fold.id, sampler),
    anchorsOf(family)
  );
  const archive = [...cache.entries.values()].filter((candidate) => candidate.origin.stage !== 'neighbourhood');
  const baseline = { net: b0!.netProfit, dd: b0!.maximumDrawdown, entries: b0!.entries };
  const selection = await selectFromArchive(space, cache, archive, baseline);

  return { family, foldId: folds.fold.id, sampler, folds, baseline, search, archive, selection };
};

const archiveRows = (result: FamilyFold) => {
  const ranks = paretoRanks2d(result.archive);

  return result.archive.map((candidate) => ({
    id: candidate.id,
    ...Object.fromEntries(spaces[result.family].specs.map((spec) => [spec.key, candidate.params[spec.key]])),
    origin: candidate.origin.stage,
    net: candidate.metrics.netProfit,
    drawdown: candidate.metrics.maximumDrawdown,
    entries: candidate.metrics.entries,
    interest: candidate.metrics.interest,
    timeInMarket: candidate.metrics.timeInMarket,
    violation: candidate.violation,
    paretoRank: ranks.get(candidate.id)
  }));
};

const robustRows = (rows: ArchiveSelection['front']) =>
  rows.map((row) => ({
    id: row.id,
    params: describeParams(row.params),
    canonical: canonicalParams(row.params),
    net: row.net,
    drawdown: row.dd,
    entries: row.entries,
    netP25: row.netP25,
    ddP75: row.ddP75,
    netMin: row.netMin,
    ddMax: row.ddMax,
    neighbours: row.neighbours
  }));

export const familyNames: Record<Family, string> = {
  legacy: 'Optimized legacy',
  fixed: 'Optimized fixed trailing',
  atr: 'Optimized ATR trailing'
};

export const runPhase4 = async (families: Family[]) => {
  const study = await openDevelopment();
  const dir = 'phase4';

  try {
    const jobs = developmentFolds.flatMap((fold) => families.map((family) => ({ family, fold })));
    // Every search has its own seeded RNG and cache, so running them concurrently changes nothing.
    const results = await Promise.all(
      jobs.map(({ family, fold }) => optimizeFamilyFold(study, family, foldIndexes(study, fold)))
    );
    const controls = await Promise.all(
      families.map((family) =>
        optimizeFamilyFold(study, family, foldIndexes(study, developmentFolds.at(-1)!), 'random')
      )
    );
    const validations: (Validation & { family: Family })[] = [];

    for (const result of results) {
      const base = `${dir}/${result.family}/${result.foldId}`;

      await writeJson(`${base}/search.json`, {
        ...result.search,
        baseline: result.baseline,
        feasible: result.selection.feasible,
        neighbourEvaluations: result.selection.neighbourEvaluations
      });
      await writeJson(`${base}/selection.json`, {
        picks: result.selection.picks,
        shortlist: robustRows(result.selection.shortlist),
        front: robustRows(result.selection.front)
      });
      await writeText(`${base}/pool.csv`, toCsv(robustRows(result.selection.pool)));

      if (result.foldId === 'FINAL') {
        await writeText(`${base}/archive.csv`, toCsv(archiveRows(result)));
      }

      if (result.folds.testStart >= 0) {
        const entries = [
          ...(['profit', 'balanced', 'lowDD'] as const).map((name) => ({
            label: name,
            params: result.selection.picks[name].params
          })),
          ...result.selection.shortlist.map((row, index) => ({ label: `shortlist${index + 1}`, params: row.params }))
        ];

        validations.push(
          ...(await validate(study, result.folds, [{ label: 'B0', params: baselineParams }, ...entries])).map(
            (row) => ({ ...row, family: result.family })
          )
        );
      }
    }

    await writeText(
      `${dir}/validation.csv`,
      toCsv(
        validations.map((row) => ({
          family: row.family,
          fold: row.foldId,
          label: row.label,
          params: describeParams(row.params),
          net: row.continuous.netProfit,
          drawdown: row.continuous.maximumDrawdown,
          entries: row.continuous.entries,
          flatNet: row.flat.netProfit,
          flatDrawdown: row.flat.maximumDrawdown
        }))
      )
    );

    for (const control of controls) {
      await writeJson(`${dir}/${control.family}/FINAL-random/search.json`, {
        ...control.search,
        feasible: control.selection.feasible
      });
      await writeJson(`${dir}/${control.family}/FINAL-random/selection.json`, {
        picks: control.selection.picks,
        front: robustRows(control.selection.front)
      });
    }

    // Tables.
    const byFamily = (family: Family) => validations.filter((row) => row.family === family);
    const b0 = aggregate(byFamily(families[0]!), 'B0');
    const legacyAgg = Object.fromEntries(
      (['profit', 'balanced', 'lowDD'] as const).map((label) => [label, aggregate(byFamily('legacy'), label)])
    );
    const wfRows = [
      [
        'B0',
        '–',
        ...b0.perFold.map((fold) => `${money(fold.net)} / ${money(fold.dd)}`),
        money(b0.net),
        money(b0.worstDrawdown),
        '–',
        '–'
      ]
    ];

    for (const family of families) {
      for (const label of ['profit', 'balanced', 'lowDD'] as const) {
        const agg = aggregate(byFamily(family), label);
        const versusLegacy =
          family === 'legacy'
            ? '–'
            : classify(
                { net: agg.net, dd: agg.worstDrawdown },
                { net: legacyAgg[label]!.net, dd: legacyAgg[label]!.worstDrawdown }
              );

        wfRows.push([
          familyNames[family],
          label,
          ...agg.perFold.map((fold) => `${money(fold.net)} / ${money(fold.dd)}`),
          money(agg.net),
          money(agg.worstDrawdown),
          classify({ net: agg.net, dd: agg.worstDrawdown }, { net: b0.net, dd: b0.worstDrawdown }),
          versusLegacy
        ]);
      }
    }

    // Shortlist generalization: how many of each fold's 10 shortlisted candidates beat B0 in validation.
    const shortlistRows = families.flatMap((family) =>
      ['WF1', 'WF2', 'WF3'].map((foldId) => {
        const rows = byFamily(family).filter((row) => row.foldId === foldId);
        const base = rows.find((row) => row.label === 'B0')!;
        const listed = rows.filter((row) => row.label.startsWith('shortlist'));
        const nets = listed.map((row) => row.continuous.netProfit).sort((a, b) => a - b);

        return [
          familyNames[family],
          foldId,
          listed.length,
          listed.filter((row) => row.continuous.netProfit >= base.continuous.netProfit).length,
          listed.filter((row) => row.continuous.maximumDrawdown <= base.continuous.maximumDrawdown).length,
          listed.filter(
            (row) =>
              classify(
                { net: row.continuous.netProfit, dd: row.continuous.maximumDrawdown },
                { net: base.continuous.netProfit, dd: base.continuous.maximumDrawdown }
              ) !== 'Fails'
          ).length,
          `${money(nets[0] ?? NaN)} … ${money(nets.at(-1) ?? NaN)}`,
          money(base.continuous.netProfit)
        ];
      })
    );
    const finals = results.filter((result) => result.foldId === 'FINAL');
    const budgetRows = [...results, ...controls].map((result) => [
      familyNames[result.family],
      result.foldId,
      result.sampler,
      result.search.sampler.unique,
      result.search.gaRuns.map((run) => run.newEvaluations).join(' + '),
      result.search.simulations,
      result.selection.neighbourEvaluations,
      result.search.nominalBudget,
      result.selection.feasible,
      result.search.initialHypervolume.toFixed(4),
      result.search.gaRuns.map((run) => run.hypervolume.at(-1)!.toFixed(4)).join(' / ')
    ]);
    const finalRows = finals.flatMap((result) =>
      result.selection.shortlist.map((row, index) => [
        familyNames[result.family],
        index + 1,
        describeParams(row.params),
        money(row.net),
        money(row.dd),
        money(row.netP25),
        money(row.ddP75),
        row.entries,
        (['profit', 'balanced', 'lowDD'] as const)
          .filter((name) => result.selection.picks[name].id === row.id)
          .join(', ')
      ])
    );
    const charts = [];

    // Pareto chart of the FINAL-fold archives (development training), all families on one axis pair.
    const points = finals.flatMap((result, groupIndex) =>
      result.archive
        .filter((candidate) => candidate.violation === 0)
        .filter((_candidate, index) => index % 3 === 0)
        .map((candidate) => ({
          x: candidate.metrics.maximumDrawdown,
          y: candidate.metrics.netProfit,
          group: groupIndex,
          tip: `${describeParams(candidate.params)}: ${money(candidate.metrics.netProfit)} / ${money(candidate.metrics.maximumDrawdown)}`
        }))
    );

    charts.push(
      await writeChart(
        'phase4_pareto_development',
        scatterChart({
          title: 'Phase 4 archives on the development window (training of the FINAL fold)',
          subtitle:
            'Every third feasible evaluated candidate per family; labelled: each family’s profit and lowDD picks, and B0',
          groups: finals.map((result) => familyNames[result.family]),
          xLabel: 'Maximum MTM drawdown (training)',
          yLabel: 'Net P&L after interest (training)',
          points: [
            ...points,
            ...finals.flatMap((result, groupIndex) =>
              (['profit', 'lowDD'] as const).map((name) => ({
                x: result.selection.picks[name].dd,
                y: result.selection.picks[name].net,
                group: groupIndex,
                label: `${result.family} ${name}`,
                tip: describeParams(result.selection.picks[name].params)
              }))
            ),
            { x: finals[0]!.baseline.dd, y: finals[0]!.baseline.net, group: 0, label: 'B0', tip: 'B0' }
          ]
        })
      )
    );

    const tables = [
      '## Walk-forward validation of the Phase 4 picks (continuous attribution)\n',
      table(
        [
          'Family',
          'Pick',
          ...b0.perFold.map((fold) => `${fold.fold} net / DD`),
          'Σ net',
          'Worst DD',
          'Class vs B0',
          'Class vs optimized legacy (same pick)'
        ],
        wfRows
      ),
      '\n## Shortlist generalization: the 10 shortlisted candidates of each training fold, scored on that fold’s validation window\n',
      table(
        [
          'Family',
          'Fold',
          'Shortlisted',
          'Net ≥ B0',
          'DD ≤ B0',
          'Dominant or risk trade-off vs B0',
          'Validation net range',
          'B0 validation net'
        ],
        shortlistRows
      ),
      '\n## Search budgets and coverage\n',
      table(
        [
          'Family',
          'Fold',
          'Sampler',
          'Unique initial',
          'GA new evaluations',
          'Simulations (search)',
          'Neighbourhood simulations',
          'Nominal budget',
          'Feasible (net > 0, min. activity)',
          'Initial hypervolume',
          'Final GA hypervolume'
        ],
        budgetRows
      ),
      '\n## FINAL fold (development training) shortlists, every parameter\n',
      table(
        [
          'Family',
          '#',
          'Parameters',
          'Training net',
          'Training DD',
          'Robust net (P25)',
          'Robust DD (P75)',
          'Entries',
          'Pick'
        ],
        finalRows
      )
    ].join('\n');

    await writeText(`${dir}/tables.md`, `${tables}\n`);
    await writeJson(`${dir}/summary.json`, {
      families,
      searchConfig,
      walkForward: Object.fromEntries(
        families.map((family) => [
          family,
          ['B0', 'profit', 'balanced', 'lowDD'].map((label) => ({
            ...aggregate(byFamily(family), label),
            flat: aggregate(byFamily(family), label, 'flat')
          }))
        ])
      ),
      finalPicks: Object.fromEntries(
        finals.map((result) => [
          result.family,
          { picks: result.selection.picks, shortlist: result.selection.shortlist, baseline: result.baseline }
        ])
      ),
      randomControl: Object.fromEntries(
        controls.map((control) => [
          control.family,
          {
            initialHypervolume: control.search.initialHypervolume,
            finalHypervolume: control.search.gaRuns.map((run) => run.hypervolume.at(-1)),
            picks: control.selection.picks
          }
        ])
      ),
      charts
    });
    await fs.ensureDir(`${resultsDir}/${dir}`);

    return { tables };
  } finally {
    await study.close();
  }
};

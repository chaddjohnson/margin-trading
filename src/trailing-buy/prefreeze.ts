// Development-only robustness work, run before the freeze: walk-forward scores under every execution model
// and margin rate, development perturbations (acceptance criterion 5), start dates, event-level bootstrap
// over the walk-forward validation blocks, the data-quality variant, the pre-close comparison over
// 2016-2022, and the development named events.
import { type CandidateType, loadCandidateTypes } from './candidates.ts';
import { developmentEnd, finalFold, walkForwardFolds } from './constants.ts';
import { type RunOptions, baselineParams } from './engine.ts';
import { money, signedMoney, table } from './format.ts';
import { windowMetrics } from './metrics.ts';
import { describeParams } from './params.ts';
import { loadPreClose } from './preclose.ts';
import { type Study, foldIndexes, openDevelopment, toCsv, writeJson, writeText } from './study.ts';
import {
  type BlockDifference,
  blockDifferences,
  bootstrap,
  classifyAgainst,
  episodesIn,
  firstSessionOfMonths,
  perturbationScores,
  runOn,
  scenarios,
  startDateScores,
  walkForwardScores,
  withRepairedLow
} from './validation.ts';
import { simulate } from './engine.ts';

export const namedEvents = [
  { id: '2018 Q4', from: '2018-10-01', to: '2019-04-30', fold: 'WF1' },
  { id: '2020', from: '2020-02-19', to: '2020-06-30', fold: 'WF2' },
  { id: '2022', from: '2022-01-03', to: '2022-12-30', fold: 'WF3' },
  { id: 'early 2025', from: '2025-02-18', to: '2025-06-30', fold: 'FINAL' },
  { id: '2026 H1', from: '2026-01-20', to: '2026-05-29', fold: 'FINAL' },
  { id: '2026 H2', from: '2026-06-01', to: '2026-10-14', fold: 'FINAL' }
];

// MTM change of a continuous run from the research start over [from, to].
export const eventPnl = (
  study: Study,
  params: typeof baselineParams,
  from: string,
  to: string,
  options: Partial<RunOptions> = {}
) => {
  const first = study.index(from);
  const last = study.lastIndex(to);
  const result = simulate(study.bars, study.cache, params, study.start, last, { ...options, record: false });
  const metrics = windowMetrics(study.bars, result, first, last);

  return { net: metrics.netProfit, dd: metrics.maximumDrawdown, entries: metrics.entries };
};

export const legacyTwin = (type: CandidateType) => (type.pick === 'baseline' ? undefined : `P4.legacy.${type.pick}`);

export const runPrefreeze = async () => {
  const study = await openDevelopment();
  const dir = 'validation/development';

  try {
    const types = await loadCandidateTypes();
    const candidates = types.filter((type) => type.pick !== 'baseline');
    const finalFolds = foldIndexes(study, finalFold);

    // 1. Walk-forward under every scenario.
    const wf: Record<string, Record<string, Awaited<ReturnType<typeof walkForwardScores>>[string]>> = {};

    for (const scenario of scenarios) {
      wf[scenario.id] = await walkForwardScores(study, types, scenario);
    }

    const wfRows = candidates.map((type) => {
      const cells = scenarios.map((scenario) => {
        const score = wf[scenario.id]![type.id]!;
        const base = wf[scenario.id]!.B0!;

        return `${money(score.net)} / ${money(score.dd)} ${classifyAgainst(score, base) === 'Fails' ? '✗' : '✓'}`;
      });

      return [type.id, ...cells];
    });

    // 2. Perturbations of the FINAL picks on development (criterion 5).
    const b0Dev = await perturbationScores(
      study,
      baselineParams,
      finalFolds.trainStart,
      finalFolds.trainEnd,
      finalFolds.trainStart
    );
    const b0Own = simulate(study.bars, study.cache, baselineParams, finalFolds.trainStart, finalFolds.trainEnd, {
      record: false
    });
    const perturbation: Record<
      string,
      Awaited<ReturnType<typeof perturbationScores>> & { own: { net: number; dd: number }; verdict: string }
    > = {};

    for (const type of candidates) {
      const params = type.perFold.FINAL!;
      const scores = await perturbationScores(
        study,
        params,
        finalFolds.trainStart,
        finalFolds.trainEnd,
        finalFolds.trainStart
      );
      const own = simulate(study.bars, study.cache, params, finalFolds.trainStart, finalFolds.trainEnd, {
        record: false
      });

      perturbation[type.id] = {
        ...scores,
        own: { net: own.netProfit, dd: own.maximumDrawdown },
        verdict: classifyAgainst(
          { net: scores.medianNet, dd: scores.medianDd },
          { net: b0Own.netProfit, dd: b0Own.maximumDrawdown }
        )
      };
    }

    // 3. Start dates (development).
    const starts = firstSessionOfMonths(study, '2014-01', '2015-12');
    const startList = [baselineParams, ...candidates.map((type) => type.perFold.FINAL!)];
    const startScores = await startDateScores(study, startList, starts, finalFolds.trainEnd);
    const startRows = candidates.map((type, index) => {
      const own = startScores[index + 1]!;
      const base = startScores[0]!;
      const beats = own.filter((row, position) => classifyAgainst(row, base[position]!) !== 'Fails').length;
      const nets = own.map((row) => row.net).sort((a, b) => a - b);

      return [
        type.id,
        `${money(nets[0]!)} … ${money(nets.at(-1)!)}`,
        money(nets[Math.floor(nets.length / 2)]!),
        `${beats} / ${own.length}`
      ];
    });
    const baseNets = startScores[0]!.map((row) => row.net).sort((a, b) => a - b);

    // 4. Event-level bootstrap over the walk-forward validation blocks (each fold's own pick).
    const blocks: Record<string, BlockDifference[]> = {};
    const boot: Record<string, ReturnType<typeof bootstrap>> = {};

    for (const type of candidates) {
      blocks[type.id] = walkForwardFolds.flatMap((fold) => {
        const indexes = foldIndexes(study, fold);

        return blockDifferences(
          study,
          type.perFold[fold.id]!,
          fold.id,
          indexes.trainStart,
          indexes.testStart,
          indexes.testEnd,
          episodesIn(study, indexes.testStart, indexes.testEnd)
        );
      });
      boot[type.id] = bootstrap(
        blocks[type.id]!.map((row) => row.difference),
        `wf|${type.id}`
      );
    }

    // 5. Data quality: the 2015-08-24 low repaired, development window.
    const repaired = withRepairedLow(study.bars);
    const quality = [
      { id: 'B0', params: baselineParams },
      ...candidates.map((type) => ({ id: type.id, params: type.perFold.FINAL! }))
    ].map((entry) => {
      const original = runOn(study.bars, entry.params, finalFolds.trainStart, finalFolds.trainEnd);
      const fixed = runOn(repaired, entry.params, finalFolds.trainStart, finalFolds.trainEnd);

      return {
        id: entry.id,
        net: original.netProfit,
        dd: original.maximumDrawdown,
        repairedNet: fixed.netProfit,
        repairedDd: fixed.maximumDrawdown,
        identicalTrades:
          original.trades.length === fixed.trades.length &&
          original.trades.every(
            (trade, index) =>
              trade.entryIndex === fixed.trades[index]!.entryIndex && trade.exitPrice === fixed.trades[index]!.exitPrice
          )
      };
    });

    // 6. Pre-close comparison, 2016-01-04 -> development end (flat start at the minute file's start).
    const preClose = await loadPreClose(study.bars);
    const preStart = study.index(preClose.firstDate);
    const preEnd = study.lastIndex(developmentEnd);
    const executions: { id: string; options: Partial<RunOptions> }[] = [
      { id: 'close', options: {} },
      { id: 'nextOpen', options: { execution: 'nextOpen' } },
      { id: 'preClose', options: { execution: 'preClose', preClosePrice: preClose.price } }
    ];
    const preRows = [
      { id: 'B0', params: baselineParams },
      ...candidates.map((type) => ({ id: type.id, params: type.perFold.FINAL! }))
    ].map((entry) => {
      const cells = executions.map((execution) => {
        const result = simulate(study.bars, study.cache, entry.params, preStart, preEnd, {
          ...execution.options,
          record: false
        });

        return { net: result.netProfit, dd: result.maximumDrawdown, entries: result.trades.length };
      });

      return { id: entry.id, cells };
    });

    // 7. Development named events: the fold's own pick (out of sample) and the FINAL pick (in sample).
    const devEvents = namedEvents.filter((event) => event.fold !== 'FINAL');
    const eventRows = [
      { id: 'B0', type: undefined as CandidateType | undefined },
      ...candidates.map((type) => ({ id: type.id, type }))
    ].map((entry) => [
      entry.id,
      ...devEvents.flatMap((event) => {
        const oos = eventPnl(
          study,
          entry.type ? entry.type.perFold[event.fold]! : baselineParams,
          event.from,
          event.to
        );
        const ins = eventPnl(study, entry.type ? entry.type.perFold.FINAL! : baselineParams, event.from, event.to);

        return [`${money(oos.net)} / ${money(oos.dd)}`, `${money(ins.net)}`];
      })
    ]);

    // Write.
    await writeJson(`${dir}/walk_forward_scenarios.json`, wf);
    await writeJson(`${dir}/perturbations.json`, { B0: b0Dev, candidates: perturbation });
    await writeJson(`${dir}/start_dates.json`, {
      starts: starts.map((index) => study.bars.date[index]),
      B0: startScores[0],
      candidates: Object.fromEntries(candidates.map((type, index) => [type.id, startScores[index + 1]]))
    });
    await writeText(
      `${dir}/wf_blocks.csv`,
      toCsv(Object.entries(blocks).flatMap(([id, rows]) => rows.map((row) => ({ candidateId: id, ...row }))))
    );
    await writeJson(`${dir}/bootstrap_wf.json`, boot);
    await writeJson(`${dir}/data_quality.json`, { repaired: repaired.repaired, rows: quality });
    await writeJson(`${dir}/preclose_development.json`, {
      series: { ...preClose, price: undefined },
      window: [study.bars.date[preStart], study.bars.date[preEnd]],
      rows: preRows
    });

    const tables = [
      '## Walk-forward aggregate under each scenario (Σ net / worst DD over WF1–3; ✓ = Dominant or risk trade-off vs B0 in the same scenario)\n',
      table(
        ['Candidate', ...scenarios.map((scenario) => scenario.id)],
        [
          [
            'B0',
            ...scenarios.map((scenario) => `${money(wf[scenario.id]!.B0!.net)} / ${money(wf[scenario.id]!.B0!.dd)}`)
          ],
          ...wfRows
        ]
      ),
      '\n## Versus the optimized legacy pick of the same name (walk-forward, close @ 11% and next open @ 11%)\n',
      table(
        ['Candidate', 'close: class vs optimized legacy', 'nextOpen: class vs optimized legacy'],
        candidates
          .filter((type) => !type.id.startsWith('P4.legacy'))
          .map((type) => {
            const twin = legacyTwin(type)!;

            return [
              type.id,
              classifyAgainst(wf['close@11%']![type.id]!, wf['close@11%']![twin]!),
              classifyAgainst(wf['nextOpen@11%']![type.id]!, wf['nextOpen@11%']![twin]!)
            ];
          })
      ),
      `\n## Perturbations of the FINAL picks on development (one parameter at a time; B0 own ${money(b0Own.netProfit)} / ${money(b0Own.maximumDrawdown)}; B0's own perturbation median ${money(b0Dev.medianNet)} / ${money(b0Dev.medianDd)})\n`,
      table(
        [
          'Candidate',
          'Own net / DD',
          'Median net / DD of perturbations',
          'P25 net / P75 DD',
          'Worst net / worst DD',
          'Perturbations',
          'Criterion 5 (median vs B0)'
        ],
        candidates.map((type) => {
          const value = perturbation[type.id]!;

          return [
            type.id,
            `${money(value.own.net)} / ${money(value.own.dd)}`,
            `${money(value.medianNet)} / ${money(value.medianDd)}`,
            `${money(value.p25Net)} / ${money(value.p75Dd)}`,
            `${money(value.worstNet)} / ${money(value.worstDd)}`,
            value.rows.length,
            value.verdict
          ];
        })
      ),
      `\n## Start dates: the first session of each month 2014-01 … 2015-12, run to 2022-12-30 (B0 ${money(baseNets[0]!)} … ${money(baseNets.at(-1)!)}, median ${money(baseNets[Math.floor(baseNets.length / 2)]!)})\n`,
      table(
        [
          'Candidate (FINAL pick)',
          'Net range',
          'Median net',
          'Starts where it is Dominant or risk trade-off vs B0 (same start)'
        ],
        startRows
      ),
      '\n## Event-level bootstrap over the walk-forward validation blocks (candidate − B0, 10,000 resamples)\n',
      table(
        ['Candidate', 'Blocks', 'Observed Σ difference', '90% interval of Σ', 'P(Σ > 0)'],
        candidates.map((type) => {
          const value = boot[type.id]!;

          return [
            type.id,
            value.blocks,
            signedMoney(value.observedSum),
            `${signedMoney(value.sum90[0]!)} … ${signedMoney(value.sum90[1]!)}`,
            value.pSumPositive.toFixed(3)
          ];
        })
      ),
      `\n## Data quality: 2015-08-24 low ${repaired.repaired.from} → ${repaired.repaired.to} (development)\n`,
      table(
        ['Run', 'Net / DD', 'Repaired net / DD', 'Same trades'],
        quality.map((row) => [
          row.id,
          `${money(row.net)} / ${money(row.dd)}`,
          `${money(row.repairedNet)} / ${money(row.repairedDd)}`,
          row.identicalTrades ? 'yes' : 'no'
        ])
      ),
      `\n## Execution models, ${study.bars.date[preStart]} → ${study.bars.date[preEnd]} (flat start; FINAL picks, in sample; ${preClose.covered} pre-close prices, mean |pre-close/close − 1| ${(preClose.meanAbsGapToClose * 100).toFixed(2)}%)\n`,
      table(
        ['Run', ...executions.map((execution) => `${execution.id} net / DD`)],
        preRows.map((row) => [row.id, ...row.cells.map((cell) => `${money(cell.net)} / ${money(cell.dd)}`)])
      ),
      '\n## Development named events: MTM P&L (and DD) of the fold’s own pick, out of sample; FINAL pick (in sample) net in the second column\n',
      table(
        ['Run', ...devEvents.flatMap((event) => [`${event.id} (${event.fold} pick)`, `${event.id} FINAL pick`])],
        eventRows
      )
    ].join('\n');

    await writeText(`${dir}/tables.md`, `${tables}\n`);

    return { tables, types };
  } finally {
    await study.close();
  }
};

export const describeType = (type: CandidateType) =>
  Object.fromEntries(Object.entries(type.perFold).map(([fold, params]) => [fold, describeParams(params)]));

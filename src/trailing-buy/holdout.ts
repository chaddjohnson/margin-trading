// The holdout (PROTOCOL.md section 11): refuses to run without the freeze, records every attempt, and
// refuses a second attempt unless given a written reason. Everything that reads prices after 2022-12-30 is
// here: holdout scores of the frozen candidates under every scenario, the acceptance table, holdout start
// dates, perturbations, the holdout event bootstrap and named events, the pre-close model over its full
// coverage, the cross-asset transfer check and the full-period summaries.
import fs from 'fs-extra';
import { type CandidateType } from './candidates.ts';
import {
  crossAssetSymbols,
  finalFold,
  holdoutEnd,
  holdoutStart,
  researchStart,
  resultsDir,
  stooqDir,
  walkForwardFolds
} from './constants.ts';
import { firstIndexOnOrAfter, lastIndexOnOrBefore, loadDaily, sha256Of, sliceBars } from './data.ts';
import { detailRuns, episodeComparison, metricsRow, setupsRows, tradesRows } from './detail.ts';
import { type RunOptions, type StrategyParams, baselineParams, simulate } from './engine.ts';
import { analysisEpisodes } from './episodes.ts';
import { freezeFile } from './freeze.ts';
import { money, percent, signedMoney, table } from './format.ts';
import { IndicatorCache } from './indicators.ts';
import { windowMetrics } from './metrics.ts';
import { describeParams } from './params.ts';
import { loadPreClose } from './preclose.ts';
import { eventPnl, legacyTwin, namedEvents } from './prefreeze.ts';
import { type Study, foldIndexes, openFullUnchecked, toCsv, writeJson, writeText } from './study.ts';
import {
  blockDifferences,
  bootstrap,
  classifyAgainst,
  episodesIn,
  firstSessionOfMonths,
  holdoutScores,
  perturbationScores,
  scenarios,
  startDateScores
} from './validation.ts';

const attemptsFile = `${resultsDir}/holdout/attempts.json`;

const checkFreeze = async (rerunReason?: string) => {
  if (!(await fs.pathExists(freezeFile))) {
    throw new Error('No freeze: run the freeze command first');
  }

  const recorded = (await fs.readFile(`${freezeFile}.sha256`, 'utf8')).split(' ')[0];

  if (sha256Of(await fs.readFile(freezeFile)) !== recorded) {
    throw new Error('freeze.json does not match its recorded hash');
  }

  const attempts: { atUtc: string; reason: string }[] = (await fs.pathExists(attemptsFile))
    ? await fs.readJson(attemptsFile)
    : [];

  if (attempts.length > 0 && !rerunReason) {
    throw new Error(
      `The holdout already ran (${attempts.length} attempt(s)); pass --rerun-reason "<why>" to run it again`
    );
  }

  attempts.push({ atUtc: new Date().toISOString(), reason: rerunReason ?? 'first run' });
  await fs.ensureDir(`${resultsDir}/holdout`);
  await fs.writeJson(attemptsFile, attempts, { spaces: 1 });

  return { freeze: await fs.readJson(freezeFile), attempt: attempts.length };
};

const passes = (verdict: string) => verdict !== 'Fails';

export const runHoldout = async (rerunReason?: string) => {
  const { freeze, attempt } = await checkFreeze(rerunReason);
  const study: Study = await openFullUnchecked();
  const dir = 'holdout';

  try {
    const types: CandidateType[] = freeze.types;
    const candidates = types.filter((type) => type.pick !== 'baseline');
    const byId = Object.fromEntries(types.map((type) => [type.id, type]));
    const folds = foldIndexes(study, finalFold);

    // 1. Holdout scores under every scenario.
    const holdout: Record<string, Awaited<ReturnType<typeof holdoutScores>>> = {};

    for (const scenario of scenarios) {
      holdout[scenario.id] = await holdoutScores(study, types, scenario);
    }

    const score = (scenario: string, id: string, mode: 'continuous' | 'flat' = 'continuous') => {
      const metrics = holdout[scenario]![id]![mode];

      return { net: metrics.netProfit, dd: metrics.maximumDrawdown };
    };

    // 2. The acceptance table (PROTOCOL.md section 9), with the development results from before the freeze.
    const wf = await fs.readJson(`${resultsDir}/validation/development/walk_forward_scenarios.json`);
    const perturbations = (await fs.readJson(`${resultsDir}/validation/development/perturbations.json`)).candidates;
    const acceptance = candidates.map((type) => {
      const wfClass = (scenario: string) => classifyAgainst(wf[scenario][type.id], wf[scenario].B0);
      const hoClass = (scenario: string) => classifyAgainst(score(scenario, type.id), score(scenario, 'B0'));
      const criteria = {
        c1_walkForward: wfClass('close@11%'),
        c2_holdout: hoClass('close@11%'),
        c3_walkForwardNextOpen: wfClass('nextOpen@11%'),
        c3_holdoutNextOpen: hoClass('nextOpen@11%'),
        c4_walkForward8: wfClass('close@8%'),
        c4_walkForward14: wfClass('close@14%'),
        c4_holdout8: hoClass('close@8%'),
        c4_holdout14: hoClass('close@14%'),
        c5_perturbations: perturbations[type.id].verdict as string
      };
      const twin = legacyTwin(type);
      const versusLegacy =
        twin && twin !== type.id && byId[twin]
          ? {
              walkForward: classifyAgainst(wf['close@11%'][type.id], wf['close@11%'][twin]),
              holdout: classifyAgainst(score('close@11%', type.id), score('close@11%', twin))
            }
          : undefined;

      return {
        id: type.id,
        params: describeParams(type.perFold.FINAL!),
        criteria,
        passed: Object.values(criteria).filter(passes).length,
        recommended: Object.values(criteria).every(passes),
        versusLegacy,
        flatStartHoldout:
          hoClass('close@11%') ===
          classifyAgainst(score('close@11%', type.id, 'flat'), score('close@11%', 'B0', 'flat'))
            ? 'same class'
            : 'class changes'
      };
    });

    // 3. Extended shortlists on the holdout (close and next open, continuous).
    const shortlistRows: Record<string, unknown>[] = [];

    for (const [family, members] of Object.entries(
      freeze.shortlists as Record<
        string,
        {
          id: string;
          params: StrategyParams;
          net: number;
          dd: number;
          netP25: number;
          ddP75: number;
          entries: number;
          robustRank: number;
        }[]
      >
    )) {
      const shortTypes = members.map((member, index) => ({
        id: `${family}#${index + 1}`,
        source: '',
        row: '',
        pick: 'profit' as const,
        perFold: { FINAL: member.params }
      }));

      for (const scenario of [scenarios[0]!, scenarios[1]!]) {
        const result = await holdoutScores(study, shortTypes, scenario);

        members.forEach((member, index) => {
          const metrics = result[`${family}#${index + 1}`]!.continuous;

          shortlistRows.push({
            family,
            rank: index + 1,
            robustRank: member.robustRank,
            scenario: scenario.id,
            params: describeParams(member.params),
            trainingNet: member.net,
            trainingDd: member.dd,
            robustNet: member.netP25,
            robustDd: member.ddP75,
            holdoutNet: metrics.netProfit,
            holdoutDd: metrics.maximumDrawdown,
            holdoutEntries: metrics.entries,
            classVsB0: classifyAgainst(
              { net: metrics.netProfit, dd: metrics.maximumDrawdown },
              score(scenario.id, 'B0')
            )
          });
        });
      }
    }

    // 4. Holdout perturbations, start dates, bootstrap and named events of the FINAL picks.
    const holdoutPerturbation: Record<string, Awaited<ReturnType<typeof perturbationScores>>> = {};

    for (const entry of [
      { id: 'B0', params: baselineParams },
      ...candidates.map((type) => ({ id: type.id, params: type.perFold.FINAL! }))
    ]) {
      holdoutPerturbation[entry.id] = await perturbationScores(
        study,
        entry.params,
        folds.testStart,
        folds.testEnd,
        study.start
      );
    }
    const starts = firstSessionOfMonths(study, '2023-01', '2023-12');
    const startList = [baselineParams, ...candidates.map((type) => type.perFold.FINAL!)];
    const startScores = await startDateScores(study, startList, starts, folds.testEnd);
    const episodes = episodesIn(study, folds.testStart, folds.testEnd);
    const holdoutBlocks = Object.fromEntries(
      candidates.map((type) => [
        type.id,
        blockDifferences(study, type.perFold.FINAL!, 'holdout', study.start, folds.testStart, folds.testEnd, episodes)
      ])
    );
    const holdoutBoot = Object.fromEntries(
      candidates.map((type) => [
        type.id,
        bootstrap(
          holdoutBlocks[type.id]!.map((row) => row.difference),
          `holdout|${type.id}`
        )
      ])
    );
    const holdoutEvents = namedEvents.filter((event) => event.fold === 'FINAL');
    const eventRows = [
      { id: 'B0', params: baselineParams },
      ...candidates.map((type) => ({ id: type.id, params: type.perFold.FINAL! }))
    ].map((entry) => ({
      id: entry.id,
      events: holdoutEvents.map((event) => ({
        event: event.id,
        ...eventPnl(study, entry.params, event.from, event.to)
      }))
    }));

    // 5. Pre-close model over its whole coverage, attributed to development and holdout.
    const preClose = await loadPreClose(study.bars);
    const preStart = study.index(preClose.firstDate);
    const preEnd = study.lastIndex(preClose.lastDate);
    const preSplit = study.lastIndex('2022-12-30');
    const executions: { id: string; options: Partial<RunOptions> }[] = [
      { id: 'close', options: {} },
      { id: 'nextOpen', options: { execution: 'nextOpen' } },
      { id: 'preClose', options: { execution: 'preClose', preClosePrice: preClose.price } }
    ];
    const preRows = [
      { id: 'B0', params: baselineParams },
      ...candidates.map((type) => ({ id: type.id, params: type.perFold.FINAL! }))
    ].map((entry) => ({
      id: entry.id,
      cells: executions.map((execution) => {
        const result = simulate(study.bars, study.cache, entry.params, preStart, preEnd, {
          ...execution.options,
          record: false
        });
        const dev = windowMetrics(study.bars, result, preStart, preSplit);
        const ho = windowMetrics(study.bars, result, preSplit + 1, preEnd);

        return {
          execution: execution.id,
          devNet: dev.netProfit,
          devDd: dev.maximumDrawdown,
          holdoutNet: ho.netProfit,
          holdoutDd: ho.maximumDrawdown,
          entries: result.trades.length
        };
      })
    }));

    // 6. Cross-asset transfer check (no re-optimization), 2014-01-02 -> 2026-09-04.
    const crossRows: Record<string, unknown>[] = [];

    for (const symbol of crossAssetSymbols) {
      const raw = await loadDaily(symbol, `${stooqDir}/${symbol}/${symbol}-stooq-daily.csv`);
      const bars = sliceBars(raw, 0, lastIndexOnOrBefore(raw, '2026-09-04'));
      const cache = new IndicatorCache(bars);
      const first = firstIndexOnOrAfter(bars, researchStart);
      const last = bars.date.length - 1;
      const split = lastIndexOnOrBefore(bars, '2022-12-30');

      for (const entry of [
        { id: 'B0', params: baselineParams },
        ...candidates.map((type) => ({ id: type.id, params: type.perFold.FINAL! }))
      ]) {
        const result = simulate(bars, cache, entry.params, first, last, { record: false });
        const dev = windowMetrics(bars, result, first, split);
        const ho = windowMetrics(bars, result, split + 1, last);

        crossRows.push({
          symbol,
          id: entry.id,
          net: result.netProfit,
          dd: result.maximumDrawdown,
          devNet: dev.netProfit,
          devDd: dev.maximumDrawdown,
          holdoutNet: ho.netProfit,
          holdoutDd: ho.maximumDrawdown,
          entries: result.trades.length
        });
      }
    }

    // 7. Full-period (2014-01-02 -> 2026-10-14) recorded runs for the summary rows, holdout-window detail.
    const representative = ['B0', 'B0c', ...candidates.map((type) => type.id)];
    const holdoutRuns = detailRuns(
      study,
      representative.map((id) => ({ label: id, params: byId[id]!.perFold.FINAL! })),
      folds.testStart,
      folds.testEnd,
      study.start
    );
    const fullRuns = detailRuns(
      study,
      representative.map((id) => ({ label: id, params: byId[id]!.perFold.FINAL! })),
      study.start,
      folds.testEnd,
      study.start
    );
    const holdoutNextOpenRuns = detailRuns(
      study,
      representative.map((id) => ({
        label: id,
        params: byId[id]!.perFold.FINAL!,
        options: { execution: 'nextOpen' as const }
      })),
      folds.testStart,
      folds.testEnd,
      study.start
    );
    const base = holdoutRuns[0]!;
    const holdoutAttribution = holdoutRuns
      .slice(2)
      .flatMap((run) =>
        episodeComparison(
          study,
          base,
          run,
          analysisEpisodes(study.bars, folds.testStart, folds.testEnd),
          folds.testStart,
          folds.testEnd
        )
      );

    await writeText(`${dir}/holdout_runs.csv`, toCsv([...holdoutRuns, ...holdoutNextOpenRuns].map(metricsRow)));
    await writeText(`${dir}/full_period_runs.csv`, toCsv(fullRuns.map(metricsRow)));
    await writeText(
      `${dir}/full_period_annual.csv`,
      toCsv(
        fullRuns.flatMap((run) =>
          run.metrics.annual.map((year) => ({ label: run.label, year: year.year, pnl: year.pnl }))
        )
      )
    );
    await writeText(`${dir}/full_period_trades.csv`, toCsv(fullRuns.flatMap((run) => tradesRows(study, run))));
    await writeText(`${dir}/full_period_setups.csv`, toCsv(fullRuns.flatMap((run) => setupsRows(study, run))));
    await writeText(`${dir}/holdout_episode_attribution.csv`, toCsv(holdoutAttribution));
    await writeText(
      `${dir}/holdout_blocks.csv`,
      toCsv(Object.entries(holdoutBlocks).flatMap(([id, rows]) => rows.map((row) => ({ candidateId: id, ...row }))))
    );
    await writeText(`${dir}/shortlists_holdout.csv`, toCsv(shortlistRows));
    await writeText(`${dir}/cross_asset.csv`, toCsv(crossRows));
    await writeJson(`${dir}/scores.json`, holdout);
    await writeJson(`${dir}/acceptance.json`, acceptance);
    await writeJson(`${dir}/perturbations.json`, holdoutPerturbation);
    await writeJson(`${dir}/start_dates.json`, {
      starts: starts.map((index) => study.bars.date[index]),
      rows: Object.fromEntries(
        ['B0', ...candidates.map((type) => type.id)].map((id, index) => [id, startScores[index]])
      )
    });
    await writeJson(`${dir}/bootstrap.json`, holdoutBoot);
    await writeJson(`${dir}/named_events.json`, eventRows);
    await writeJson(`${dir}/preclose.json`, {
      series: { ...preClose, price: undefined },
      window: [study.bars.date[preStart], study.bars.date[preEnd]],
      rows: preRows
    });

    // The holdout and full-period curve charts are drawn by the post-holdout `events` command.
    const charts: string[] = [];

    // Tables.
    const b0Ho = score('close@11%', 'B0');
    const tables = [
      `## Holdout ${holdoutStart} → ${holdoutEnd} (attempt ${attempt}): net / DD under each scenario (continuous attribution; ✓ = Dominant or risk trade-off vs B0 in the same scenario)\n`,
      table(
        ['Candidate', ...scenarios.map((scenario) => scenario.id), 'Flat start close@11%'],
        [
          [
            'B0',
            ...scenarios.map(
              (scenario) => `${money(score(scenario.id, 'B0').net)} / ${money(score(scenario.id, 'B0').dd)}`
            ),
            `${money(score('close@11%', 'B0', 'flat').net)} / ${money(score('close@11%', 'B0', 'flat').dd)}`
          ],
          ...types
            .filter((type) => type.id !== 'B0')
            .map((type) => [
              type.id,
              ...scenarios.map((scenario) => {
                const value = score(scenario.id, type.id);

                return `${money(value.net)} / ${money(value.dd)} ${passes(classifyAgainst(value, score(scenario.id, 'B0'))) ? '✓' : '✗'}`;
              }),
              `${money(score('close@11%', type.id, 'flat').net)} / ${money(score('close@11%', type.id, 'flat').dd)}`
            ])
        ]
      ),
      '\n## Acceptance (PROTOCOL.md §9): every criterion must be Dominant or Risk trade-off\n',
      table(
        [
          'Candidate',
          'C1 WF',
          'C2 holdout',
          'C3 WF next open',
          'C3 holdout next open',
          'C4 WF 8%',
          'C4 WF 14%',
          'C4 holdout 8%',
          'C4 holdout 14%',
          'C5 perturbations',
          'Passed',
          'Recommended',
          'vs optimized legacy (WF / holdout)'
        ],
        acceptance.map((row) => [
          row.id,
          ...Object.values(row.criteria),
          `${row.passed} / 9`,
          row.recommended ? '**yes**' : 'no',
          row.versusLegacy ? `${row.versusLegacy.walkForward} / ${row.versusLegacy.holdout}` : '–'
        ])
      ),
      `\n## Extended Phase 4 shortlists (Amendment 1) on the holdout, close @ 11% (B0 ${money(b0Ho.net)} / ${money(b0Ho.dd)})\n`,
      table(
        [
          'Family',
          '#',
          'Robust rank',
          'Parameters',
          'Training net / DD',
          'Robust net / DD',
          'Holdout net / DD',
          'Holdout entries',
          'Class vs B0'
        ],
        shortlistRows
          .filter((row) => row.scenario === 'close@11%')
          .map((row) => [
            String(row.family),
            Number(row.rank),
            Number(row.robustRank),
            String(row.params),
            `${money(Number(row.trainingNet))} / ${money(Number(row.trainingDd))}`,
            `${money(Number(row.robustNet))} / ${money(Number(row.robustDd))}`,
            `${money(Number(row.holdoutNet))} / ${money(Number(row.holdoutDd))}`,
            Number(row.holdoutEntries),
            String(row.classVsB0)
          ])
      ),
      '\n## Holdout event bootstrap (FINAL pick − B0 per episode block, 10,000 resamples)\n',
      table(
        ['Candidate', 'Blocks', 'Observed Σ', '90% interval of Σ', 'P(Σ > 0)'],
        candidates.map((type) => {
          const value = holdoutBoot[type.id]!;

          return [
            type.id,
            value.blocks,
            signedMoney(value.observedSum),
            `${signedMoney(value.sum90[0]!)} … ${signedMoney(value.sum90[1]!)}`,
            value.pSumPositive.toFixed(3)
          ];
        })
      ),
      '\n## Holdout named events: MTM P&L / DD inside each window (FINAL picks)\n',
      table(
        ['Run', ...holdoutEvents.map((event) => `${event.id} (${event.from} → ${event.to})`)],
        eventRows.map((row) => [row.id, ...row.events.map((event) => `${money(event.net)} / ${money(event.dd)}`)])
      ),
      `\n## Holdout start dates (flat start on the first session of each month of 2023, run to ${holdoutEnd})\n`,
      table(
        ['Run', 'Net range', 'Median net', 'Starts Dominant or risk trade-off vs B0'],
        ['B0', ...candidates.map((type) => type.id)].map((id, index) => {
          const rows = startScores[index]!;
          const nets = rows.map((row) => row.net).sort((a, b) => a - b);
          const beats =
            index === 0
              ? '–'
              : `${rows.filter((row, position) => passes(classifyAgainst(row, startScores[0]![position]!))).length} / ${rows.length}`;

          return [id, `${money(nets[0]!)} … ${money(nets.at(-1)!)}`, money(nets[Math.floor(nets.length / 2)]!), beats];
        })
      ),
      '\n## Holdout perturbations (one parameter at a time, FINAL picks)\n',
      table(
        ['Run', 'Median net / DD', 'P25 net / P75 DD', 'Worst net / DD'],
        Object.entries(holdoutPerturbation).map(([id, value]) => [
          id,
          `${money(value.medianNet)} / ${money(value.medianDd)}`,
          `${money(value.p25Net)} / ${money(value.p75Dd)}`,
          `${money(value.worstNet)} / ${money(value.worstDd)}`
        ])
      ),
      `\n## Execution models over the minute-data coverage ${study.bars.date[preStart]} → ${study.bars.date[preEnd]} (flat start at ${study.bars.date[preStart]}; split at 2022-12-30)\n`,
      table(
        ['Run', ...executions.flatMap((execution) => [`${execution.id} 2016–2022`, `${execution.id} 2023–2025-10`])],
        preRows.map((row) => [
          row.id,
          ...row.cells.flatMap((cell) => [
            `${money(cell.devNet)} / ${money(cell.devDd)}`,
            `${money(cell.holdoutNet)} / ${money(cell.holdoutDd)}`
          ])
        ])
      ),
      '\n## Cross-asset transfer (VGT-frozen parameters, no re-optimization; 2014-01-02 → 2026-09-04; net / DD)\n',
      table(
        ['Run', ...crossAssetSymbols],
        ['B0', ...candidates.map((type) => type.id)].map((id) => [
          id,
          ...crossAssetSymbols.map((symbol) => {
            const row = crossRows.find((candidate) => candidate.symbol === symbol && candidate.id === id)!;
            const baseRow = crossRows.find((candidate) => candidate.symbol === symbol && candidate.id === 'B0')!;
            const mark =
              id === 'B0'
                ? ''
                : passes(
                      classifyAgainst(
                        { net: Number(row.net), dd: Number(row.dd) },
                        { net: Number(baseRow.net), dd: Number(baseRow.dd) }
                      )
                    )
                  ? ' ✓'
                  : ' ✗';

            return `${money(Number(row.net))} / ${money(Number(row.dd))}${mark}`;
          })
        ])
      ),
      '\n## Holdout detail, close @ 11% (continuous attribution; FINAL parameters)\n',
      table(
        [
          'Run',
          'Net',
          'Max DD',
          'DD / $100k',
          'Interest',
          'Entries',
          'Win rate',
          'In market',
          'Worst open-trade mark',
          'Worst low below entry',
          'Setups',
          'Cancelled',
          'Pending at end',
          'Mean wait'
        ],
        holdoutRuns.map((run) => {
          const m = run.metrics;

          return [
            run.label,
            money(m.netProfit),
            money(m.maximumDrawdown),
            percent(m.maximumDrawdown / 100000),
            money(m.interest),
            m.entries,
            percent(m.winRate, 0),
            percent(m.timeInMarket),
            money(m.worstTradeMark),
            percent(m.worstTradeLowDrop),
            m.setupsArmed || '–',
            m.setupsCancelled || '–',
            m.setupsPendingAtEnd || '–',
            Number.isFinite(m.meanWaitSessions) ? m.meanWaitSessions.toFixed(1) : '–'
          ];
        })
      ),
      '\n## Full period 2014-01-02 → 2026-10-14, close @ 11% (FINAL parameters; 2014–2022 in sample for every optimized candidate)\n',
      table(
        [
          'Run',
          'Net',
          'Max DD (peak → trough)',
          'Interest',
          'Entries',
          'Win rate',
          'In market',
          'Worst open-trade mark'
        ],
        fullRuns.map((run) => {
          const m = run.metrics;

          return [
            run.label,
            money(m.netProfit),
            `${money(m.maximumDrawdown)} (${m.drawdownPeakDate} → ${m.drawdownTroughDate})`,
            money(m.interest),
            m.entries,
            percent(m.winRate, 0),
            percent(m.timeInMarket),
            money(m.worstTradeMark)
          ];
        })
      ),
      '\n## Annual MTM P&L (calendar years; trades crossing a year end attributed by their mark-to-market change)\n',
      table(
        ['Run', ...fullRuns[0]!.metrics.annual.map((year) => String(year.year))],
        fullRuns.map((run) => [run.label, ...run.metrics.annual.map((year) => money(year.pnl))])
      )
    ].join('\n');

    await writeText(`${dir}/tables.md`, `${tables}\n`);
    await writeJson(`${dir}/summary.json`, {
      attempt,
      charts,
      walkForwardFolds: walkForwardFolds.map((fold) => fold.id)
    });

    return { tables, acceptance };
  } finally {
    await study.close();
  }
};

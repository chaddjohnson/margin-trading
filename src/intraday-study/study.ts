// Runs the frozen run matrix of PROTOCOL.md §11 and writes every machine-readable output under
// research/vgt-intraday-study/results/. Deterministic: the same inputs give byte-identical files.
import fs from 'fs-extra';
import path from 'node:path';
import type { MarketSession } from '#types';
import type { StopFill } from '../app/allIn.ts';
import {
  type PolicySpec,
  type StopMode,
  costLevelsBps,
  policies,
  policyById,
  primaryCostBps,
  stopFills,
  stopModes,
  windows
} from './constants.ts';
import { type SessionFacts, computeRecentHighs, computeSessionFacts } from './data.ts';
import { type RunResult, type TradeRecord, simulate } from './engine.ts';
import {
  type BandRow,
  type BandSliceRow,
  type Classification,
  type Paired,
  type RunMetrics,
  bandRows,
  bandSlices,
  classify,
  computeLabels,
  formatTime,
  median,
  missedOpportunities,
  pairedComparison,
  runMetrics
} from './analysis.ts';
import { formatNewYorkTime } from '#lib';

export const runKey = (policy: string, stopMode: string, stopFill: string) => `${policy}__${stopMode}__${stopFill}`;

const csvValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? '' : String(value);
  }

  const text = String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Flattens one level of nested records (years, regimes) into dotted columns.
export const toCsv = (rows: object[]) => {
  if (!rows.length) {
    return '';
  }

  const flat = rows.map((row) => {
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [inner, innerValue] of Object.entries(value)) {
          out[`${key}.${inner}`] = innerValue;
        }
      } else {
        out[key] = Array.isArray(value) ? value.join(' ') : value;
      }
    }

    return out;
  });
  const columns = [...new Set(flat.flatMap((row) => Object.keys(row)))];

  return `${[columns.join(','), ...flat.map((row) => columns.map((column) => csvValue(row[column])).join(','))].join('\n')}\n`;
};

const tradeRow = (trade: TradeRecord, costsBps: readonly number[]) => ({
  id: trade.id,
  entry_index: trade.entryIndex,
  exit_index: trade.exitIndex < 0 ? '' : trade.exitIndex,
  entry_date: trade.entryDate,
  exit_date: trade.exitDate,
  recent_high: trade.recentHigh,
  decision_time_et: formatNewYorkTime(trade.decisionTime),
  decision_price: trade.decisionPrice,
  decision_depth: trade.decisionDepth,
  band: trade.band,
  mechanism: trade.mechanism,
  is_final_decision: trade.isFinalDecision,
  entry_time_et: formatNewYorkTime(trade.entryTime),
  entry_price: trade.entryPrice,
  entry_execution: trade.entryExecution,
  entry_session_close: trade.entrySessionClose,
  benchmark_price: trade.benchmarkPrice,
  final_decision_dip: trade.finalDecisionDip,
  lower_price_reentry: trade.isLowerPriceReentry,
  shares: trade.shares,
  investment: trade.investment,
  exit_time_et: Number.isFinite(trade.exitTime) ? formatNewYorkTime(trade.exitTime) : '',
  exit_price: trade.exitPrice,
  exit_reason: trade.exitReason,
  exit_execution: trade.exitExecution,
  exit_stop_price: trade.exitStopPrice,
  maximum_hold_due: trade.isMaximumHoldDue,
  intrasession_stop: trade.isIntrasessionStop,
  same_session: trade.isSameSession,
  calendar_days: trade.calendarDays,
  sessions_held: trade.sessionsHeld,
  minutes_held: trade.minutesHeld,
  interest: trade.interest,
  gross_profit: trade.grossProfit,
  profit_after_interest: trade.profit,
  price_return: trade.priceReturn,
  created_restriction: trade.createdRestriction,
  worst_mark: trade.worstMark,
  worst_mark_time: formatTime(trade.worstMarkTime),
  ...Object.fromEntries(costsBps.map((bps, k) => [`fees_${bps}bp`, trade.fees[k]])),
  ...Object.fromEntries(costsBps.map((bps, k) => [`net_${bps}bp`, trade.net[k]]))
});

const writeRun = async (dir: string, result: RunResult) => {
  await fs.ensureDir(dir);
  await fs.writeFile(
    path.join(dir, 'trades.csv'),
    toCsv(result.trades.map((trade) => tradeRow(trade, result.costsBps)))
  );
  await fs.writeFile(
    path.join(dir, 'daily.csv'),
    toCsv(
      result.daily.map((row) => ({
        index: row.index,
        date: row.date,
        close: row.close,
        borrowed: row.borrowed,
        held: row.held,
        restricted: row.restricted,
        ...Object.fromEntries(result.costsBps.map((bps, k) => [`equity_${bps}bp`, row.equity[k]])),
        ...Object.fromEntries(
          result.costsBps.map((bps, k) => [`minute_dd_to_date_${bps}bp`, row.minuteDrawdownToDate[k]])
        ),
        recent_high: row.recentHigh,
        decision_price: row.decisionPrice,
        signal: row.signal,
        state_signature: row.signature
      }))
    )
  );
  await fs.writeFile(path.join(dir, 'setup_diagnostics.csv'), toCsv(result.diagnostics));
};

export interface WindowSpec {
  id: 'continuous' | 'forward_flat';
  tradeStart: number;
  endIndex: number;
}

export const windowIndexes = (sessions: readonly MarketSession[], start: string, end: string) => ({
  tradeStart: sessions.findIndex((session) => session.date >= start),
  endIndex: sessions.findLastIndex((session) => session.date <= end)
});

// First session of each calendar quarter from 2016-Q4 (the window start) to 2023-Q4.
export const ensembleStarts = (sessions: readonly MarketSession[]) => {
  const starts: number[] = [];

  for (let year = 2016; year <= 2023; year++) {
    for (const month of ['01', '04', '07', '10']) {
      const date = year === 2016 && month === '10' ? windows.continuous.start : `${year}-${month}-01`;

      if (date < windows.continuous.start) {
        continue;
      }

      starts.push(sessions.findIndex((session) => session.date >= date));
    }
  }

  return starts;
};

export interface StudyOutputs {
  metrics: RunMetrics[];
  entryPairs: Paired[];
  stopPairs: Paired[];
  constituentPairs: Paired[];
  bandRows: BandRow[];
  bandSlices: BandSliceRow[];
  classifications: Classification[];
  ensemble: EnsembleRow[];
  missed: ReturnType<typeof missedOpportunities>;
}

export interface EnsembleRow {
  start: string;
  policy: string;
  stopMode: string;
  stopFill: string;
  net0: number;
  net5: number;
  net20: number;
  minuteDrawdown5: number;
  deltaNet5VsClose: number;
  deltaNet5VsDailyStop: number;
}

const constituents: Record<string, string[]> = {
  BAND_STABILIZE: ['STABLE_15', 'STABLE_30', 'REBOUND_05'],
  BAND_PERSIST: ['PERSIST_15', 'PERSIST_30', 'STABLE_30'],
  BAND_LATE_DEEP: ['STABLE_15']
};

export const runStudy = async (
  sessions: readonly MarketSession[],
  outDir: string,
  log: (message: string) => void = () => {}
): Promise<StudyOutputs> => {
  const recentHighs = computeRecentHighs(sessions);
  const labels = computeLabels(sessions);
  const k = costLevelsBps.indexOf(primaryCostBps as (typeof costLevelsBps)[number]);
  const windowSpecs: WindowSpec[] = [
    { id: 'continuous', ...windowIndexes(sessions, windows.continuous.start, windows.continuous.end) },
    { id: 'forward_flat', ...windowIndexes(sessions, windows.forward.start, windows.forward.end) }
  ];
  const facts = new Map<number, SessionFacts>();

  for (let index = windowSpecs[0]!.tradeStart; index <= windowSpecs[0]!.endIndex; index++) {
    facts.set(index, computeSessionFacts(sessions, recentHighs, index));
  }

  await fs.ensureDir(outDir);
  await fs.writeFile(
    path.join(outDir, 'session_facts.csv'),
    toCsv(
      [...facts.values()].map((fact) => ({
        index: fact.index,
        date: fact.date,
        recent_high: fact.recentHigh,
        final_decision_price: fact.finalPrice,
        final_decision_dip: fact.finalDip,
        final_decision_band: fact.finalBand,
        benchmark_fill: fact.benchmark?.price,
        benchmark_execution: fact.benchmark?.execution,
        first_dip_0935_et: Number.isNaN(fact.firstDip0935Time) ? '' : formatNewYorkTime(fact.firstDip0935Time),
        first_dip_0935_band: fact.firstDip0935Band,
        first_dip_1000_et: Number.isNaN(fact.firstDip1000Time) ? '' : formatNewYorkTime(fact.firstDip1000Time),
        first_dip_1000_band: fact.firstDip1000Band,
        max_depth_0935_to_decision: fact.maxDepth,
        max_depth_band: fact.maxDepthBand,
        label_dd15: labels[fact.index]!.dd15,
        label_hivol: labels[fact.index]!.hiVol
      }))
    )
  );

  const results = new Map<string, RunResult>();
  const metricsByKey = new Map<string, RunMetrics[]>();
  const metrics: RunMetrics[] = [];
  const bandOut: BandRow[] = [];
  const sliceOut: BandSliceRow[] = [];

  for (const window of windowSpecs) {
    for (const policy of policies) {
      for (const stopMode of stopModes) {
        for (const stopFill of stopFills) {
          const result = simulate({
            sessions,
            recentHighs,
            tradeStart: window.tradeStart,
            endIndex: window.endIndex,
            policy,
            stopMode,
            stopFill
          });
          const key = `${window.id}/${runKey(policy.id, stopMode, stopFill)}`;
          const meta = { window: window.id, policy: policy.id, stopMode, stopFill };
          const runRows = costLevelsBps.map((_, cost) =>
            runMetrics(meta, result, cost, labels, { devEnd: windows.dev.end, forwardStart: windows.forward.start })
          );

          results.set(key, result);
          metricsByKey.set(key, runRows);
          metrics.push(...runRows);
          await writeRun(path.join(outDir, 'runs', key), result);

          if (window.id === 'continuous') {
            bandOut.push(...bandRows(meta, result, k, facts, sessions));
            sliceOut.push(...bandSlices(meta, result, k, labels));
          }
        }
      }
    }

    log(`ran ${window.id}`);
  }

  // Paired comparisons at every cost level; divergence episodes are kept at the primary cost only.
  const pair = (window: string, variant: string, reference: string, stopFill: string, cost: number) => {
    const vKey = `${window}/${variant}`;
    const rKey = `${window}/${reference}`;
    const result = pairedComparison(
      { window, variant, reference, stopFill },
      results.get(vKey)!,
      results.get(rKey)!,
      metricsByKey.get(vKey)![cost]!,
      metricsByKey.get(rKey)![cost]!,
      cost,
      facts
    );

    return cost === k ? result : { ...result, episodes: [] };
  };
  const entryPairs: Paired[] = [];
  const stopPairs: Paired[] = [];
  const constituentPairs: Paired[] = [];

  for (const window of windowSpecs) {
    for (const stopFill of stopFills) {
      for (let cost = 0; cost < costLevelsBps.length; cost++) {
        for (const policy of policies) {
          for (const stopMode of stopModes) {
            if (policy.id !== 'CLOSE_1M') {
              entryPairs.push(
                pair(
                  window.id,
                  runKey(policy.id, stopMode, stopFill),
                  runKey('CLOSE_1M', stopMode, stopFill),
                  stopFill,
                  cost
                )
              );
            }

            for (const constituent of constituents[policy.id] ?? []) {
              constituentPairs.push(
                pair(
                  window.id,
                  runKey(policy.id, stopMode, stopFill),
                  runKey(constituent, stopMode, stopFill),
                  stopFill,
                  cost
                )
              );
            }
          }

          stopPairs.push(
            pair(
              window.id,
              runKey(policy.id, 'STOP_MINUTE_CAUSAL', stopFill),
              runKey(policy.id, 'STOP_DAILY', stopFill),
              stopFill,
              cost
            )
          );
        }
      }
    }
  }

  log('paired comparisons done');

  // The staggered flat-start ensemble.
  const ensemble: EnsembleRow[] = [];
  const end = windowSpecs[0]!.endIndex;
  const cost5 = k;
  const cost20 = costLevelsBps.indexOf(20);

  for (const start of ensembleStarts(sessions)) {
    const nets = new Map<string, { net0: number; net5: number; net20: number; dd: number }>();

    for (const policy of policies) {
      for (const stopMode of stopModes) {
        for (const stopFill of stopFills) {
          const result = simulate({
            sessions,
            recentHighs,
            tradeStart: start,
            endIndex: end,
            policy,
            stopMode,
            stopFill
          });
          const last = result.daily.at(-1)!;

          nets.set(runKey(policy.id, stopMode, stopFill), {
            net0: last.equity[0]!,
            net5: last.equity[cost5]!,
            net20: last.equity[cost20]!,
            dd: result.minuteDrawdown[cost5]!.maximumDrawdown
          });
        }
      }
    }

    for (const policy of policies) {
      for (const stopMode of stopModes) {
        for (const stopFill of stopFills) {
          const own = nets.get(runKey(policy.id, stopMode, stopFill))!;

          ensemble.push({
            start: sessions[start]!.date,
            policy: policy.id,
            stopMode,
            stopFill,
            net0: own.net0,
            net5: own.net5,
            net20: own.net20,
            minuteDrawdown5: own.dd,
            deltaNet5VsClose: own.net5 - nets.get(runKey('CLOSE_1M', stopMode, stopFill))!.net5,
            deltaNet5VsDailyStop: own.net5 - nets.get(runKey(policy.id, 'STOP_DAILY', stopFill))!.net5
          });
        }
      }
    }
  }

  log('ensemble done');

  const ensembleSummary = (
    policy: string,
    stopMode: StopMode,
    stopFill: StopFill,
    field: 'deltaNet5VsClose' | 'deltaNet5VsDailyStop'
  ) => {
    const values = ensemble
      .filter((row) => row.policy === policy && row.stopMode === stopMode && row.stopFill === stopFill)
      .map((row) => row[field]);

    return { median: median(values), positiveShare: values.filter((value) => value > 0).length / values.length };
  };
  const findPair = (list: Paired[], window: string, variant: string, reference: string, stopFill: string, cost = k) =>
    list.find(
      (item) =>
        item.window === window &&
        item.variant === variant &&
        item.reference === reference &&
        item.stopFill === stopFill &&
        item.costBps === costLevelsBps[cost]
    )!;
  const metricOf = (window: string, key: string, cost = k) => metricsByKey.get(`${window}/${key}`)![cost]!;
  const classifications: Classification[] = [];

  for (const policy of policies) {
    for (const stopMode of stopModes) {
      if (policy.id !== 'CLOSE_1M') {
        const variant = runKey(policy.id, stopMode, 'stop');
        const own = metricOf('continuous', variant);

        classifications.push(
          classify(
            `${policy.id} [${stopMode}]`,
            `CLOSE_1M [${stopMode}]`,
            'continuous',
            {
              stop: findPair(entryPairs, 'continuous', variant, runKey('CLOSE_1M', stopMode, 'stop'), 'stop'),
              nextOpen: findPair(
                entryPairs,
                'continuous',
                runKey(policy.id, stopMode, 'next-open'),
                runKey('CLOSE_1M', stopMode, 'next-open'),
                'next-open'
              )
            },
            {
              holds: own.reversalCaptures >= 10 && own.reversalCaptureNet > 0,
              evidence: `${own.reversalCaptures} reversal captures, $${Math.round(own.reversalCaptureNet)}`
            },
            ensembleSummary(policy.id, stopMode, 'stop', 'deltaNet5VsClose')
          )
        );
      }
    }

    const minuteKey = runKey(policy.id, 'STOP_MINUTE_CAUSAL', 'stop');
    const minute = metricOf('continuous', minuteKey);

    classifications.push(
      classify(
        `${policy.id} [STOP_MINUTE_CAUSAL]`,
        `${policy.id} [STOP_DAILY]`,
        'continuous',
        {
          stop: findPair(stopPairs, 'continuous', minuteKey, runKey(policy.id, 'STOP_DAILY', 'stop'), 'stop'),
          nextOpen: findPair(
            stopPairs,
            'continuous',
            runKey(policy.id, 'STOP_MINUTE_CAUSAL', 'next-open'),
            runKey(policy.id, 'STOP_DAILY', 'next-open'),
            'next-open'
          )
        },
        {
          holds: minute.intrasessionStopExits >= 10,
          evidence: `${minute.intrasessionStopExits} intrasession-stop exits`
        },
        ensembleSummary(policy.id, 'STOP_MINUTE_CAUSAL', 'stop', 'deltaNet5VsDailyStop')
      )
    );
  }

  const missed = missedOpportunities(results.get(`continuous/${runKey('CLOSE_1M', 'STOP_DAILY', 'stop')}`)!, facts);
  const outputs: StudyOutputs = {
    metrics,
    entryPairs,
    stopPairs,
    constituentPairs,
    bandRows: bandOut,
    bandSlices: sliceOut,
    classifications,
    ensemble,
    missed
  };
  const pairRow = ({
    episodes,
    firstDivergence,
    largestPositive,
    largestNegative,
    byType,
    byBand,
    ...rest
  }: Paired) => ({
    ...rest,
    episodes: episodes.length,
    firstDivergenceDate: firstDivergence?.startDate ?? '',
    firstDivergenceType: firstDivergence?.type ?? '',
    largestPositiveDate: largestPositive?.startDate ?? '',
    largestPositive: largestPositive?.contribution ?? 0,
    largestNegativeDate: largestNegative?.startDate ?? '',
    largestNegative: largestNegative?.contribution ?? 0,
    byType: Object.fromEntries(Object.entries(byType).map(([type, value]) => [type, value.sum])),
    byTypeCount: Object.fromEntries(Object.entries(byType).map(([type, value]) => [type, value.count])),
    byBand: Object.fromEntries(Object.entries(byBand).map(([band, value]) => [band, value.sum]))
  });

  await fs.writeFile(path.join(outDir, 'summary.csv'), toCsv(metrics));
  await fs.writeFile(path.join(outDir, 'summary.json'), `${JSON.stringify(metrics, null, 1)}\n`);
  await fs.writeFile(path.join(outDir, 'paired_entry_vs_close.csv'), toCsv(entryPairs.map(pairRow)));
  await fs.writeFile(path.join(outDir, 'paired_minute_vs_daily_stop.csv'), toCsv(stopPairs.map(pairRow)));
  await fs.writeFile(path.join(outDir, 'paired_conditional_vs_constituents.csv'), toCsv(constituentPairs.map(pairRow)));
  await fs.writeFile(
    path.join(outDir, 'divergence_episodes.csv'),
    toCsv(
      [...entryPairs, ...stopPairs, ...constituentPairs]
        .filter((item) => item.episodes.length)
        .flatMap((item) =>
          item.episodes.map((episode) => ({
            window: item.window,
            variant: item.variant,
            reference: item.reference,
            stopFill: item.stopFill,
            costBps: item.costBps,
            ...episode
          }))
        )
    )
  );
  await fs.writeFile(path.join(outDir, 'band_diagnostics.csv'), toCsv(bandOut));
  await fs.writeFile(path.join(outDir, 'band_by_year_and_regime.csv'), toCsv(sliceOut));
  await fs.writeFile(path.join(outDir, 'ensemble.csv'), toCsv(ensemble));
  await fs.writeFile(
    path.join(outDir, 'paired.json'),
    `${JSON.stringify(
      { entry: entryPairs.map(pairRow), stop: stopPairs.map(pairRow), constituents: constituentPairs.map(pairRow) },
      null,
      1
    )}\n`
  );
  await fs.writeFile(path.join(outDir, 'band_diagnostics.json'), `${JSON.stringify(bandOut, null, 1)}\n`);
  await fs.writeFile(path.join(outDir, 'band_by_year_and_regime.json'), `${JSON.stringify(sliceOut, null, 1)}\n`);
  await fs.writeFile(path.join(outDir, 'ensemble.json'), `${JSON.stringify(ensemble, null, 1)}\n`);
  await fs.writeFile(path.join(outDir, 'classification.json'), `${JSON.stringify(classifications, null, 1)}\n`);
  await fs.writeFile(path.join(outDir, 'missed_opportunities.json'), `${JSON.stringify(missed, null, 1)}\n`);

  return outputs;
};

export const describePolicies = (list: readonly PolicySpec[] = policies) =>
  list.map((policy) => ({
    id: policy.id,
    phase: policy.phase,
    family: policy.family,
    description: policy.description
  }));

export { policyById };

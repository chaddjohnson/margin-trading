// The predeclared scenario catalogue (PROTOCOL.md §5.5–§7) and the runner that writes each scenario's outputs.
import path from 'node:path';
import fs from 'fs-extra';
import type { ProgramData } from './data.ts';
import {
  type ScenarioConfig,
  type ScenarioResult,
  type ShadowTrade,
  defaultConfig,
  formatTime,
  runScenario
} from './engine.ts';
import {
  type ScenarioSummary,
  annualRows,
  dailyRecords,
  eventRecords,
  scenarioSummary,
  signalRecords,
  toCsv,
  tradeRecords
} from './metrics.ts';
import type { StrategyKey } from './strategy.ts';

type Factory = () => ScenarioConfig;

const both: StrategyKey[] = ['d1', 'swing'];

export const catalogue: Record<string, Factory> = {
  // Track IV principal scenarios
  A: () =>
    defaultConfig({
      key: 'A',
      label: 'A — buy and hold 60/40, dividends reinvested',
      strategies: [],
      policy: 'single'
    }),
  B: () =>
    defaultConfig({ key: 'B', label: 'B — D1 only, 20% of equity per entry', strategies: ['d1'], policy: 'single' }),
  B2: () =>
    defaultConfig({ key: 'B2', label: 'B2 — gross-breakeven D1, 20%', strategies: ['d1.breakeven'], policy: 'single' }),
  B3: () => defaultConfig({ key: 'B3', label: 'B3 — D1 with P 8.6%, 20%', strategies: ['d1.p86'], policy: 'single' }),
  S: () => defaultConfig({ key: 'S', label: 'S — swing-low only, 20%', strategies: ['swing'], policy: 'single' }),
  // Track II shared-pool policies
  P1: () =>
    defaultConfig({
      key: 'P1',
      label: 'P1 — D1 priority (D1 displaces a swing lot)',
      strategies: both,
      policy: 'd1Priority'
    }),
  P2: () =>
    defaultConfig({
      key: 'P2',
      label: 'P2 — first signal wins (hold semantics)',
      strategies: both,
      policy: 'firstWins'
    }),
  P2c: () =>
    defaultConfig({
      key: 'P2c',
      label: 'P2c — first signal wins, cancel semantics',
      strategies: both,
      policy: 'firstWins',
      semantics: 'cancel'
    }),
  P2s: () =>
    defaultConfig({
      key: 'P2s',
      label: 'P2s — first signal wins, shadow (standalone replay) semantics',
      strategies: both,
      policy: 'firstWins',
      semantics: 'shadow'
    }),
  P3: () => defaultConfig({ key: 'P3', label: 'P3 — dedicated split 10% + 10%', strategies: both, policy: 'split' }),
  P4: () =>
    defaultConfig({
      key: 'P4',
      label: 'P4 — dynamic sharing (unused allowance, no top-ups)',
      strategies: both,
      policy: 'dynamic'
    }),
  'P5-T1': () =>
    defaultConfig({
      key: 'P5-T1',
      label: 'P5-T1 — D1 takeover, continuous position accounting',
      strategies: both,
      policy: 'takeover',
      transfer: 'T1',
      holdClock: 'original'
    }),
  'P5-T2a': () =>
    defaultConfig({
      key: 'P5-T2a',
      label: 'P5-T2a — D1 takeover, exit-reference reset, original hold clock',
      strategies: both,
      policy: 'takeover',
      transfer: 'T2',
      holdClock: 'original'
    }),
  'P5-T2b': () =>
    defaultConfig({
      key: 'P5-T2b',
      label: 'P5-T2b — D1 takeover, exit-reference reset, hold clock restarted',
      strategies: both,
      policy: 'takeover',
      transfer: 'T2',
      holdClock: 'takeover'
    }),
  'P5-T1-B2': () =>
    defaultConfig({
      key: 'P5-T1-B2',
      label: 'P5-T1 with the gross-breakeven D1',
      strategies: ['d1.breakeven', 'swing'],
      policy: 'takeover',
      transfer: 'T1',
      holdClock: 'original'
    }),
  // Core-policy sensitivities and controls
  'B-rebalance': () =>
    defaultConfig({
      key: 'B-rebalance',
      label: 'B with a full 60/40 core rebalance after every exit (sensitivity)',
      strategies: ['d1'],
      policy: 'single',
      corePolicy: 'rebalance'
    }),
  'B-noreinvest': () =>
    defaultConfig({
      key: 'B-noreinvest',
      label: 'B with profits kept in cash (attribution control)',
      strategies: ['d1'],
      policy: 'single',
      corePolicy: 'none'
    }),
  'B-fixed100k': () =>
    defaultConfig({
      key: 'B-fixed100k',
      label: 'Legacy control: fixed $100,000 per entry, profits in cash',
      strategies: ['d1'],
      policy: 'single',
      fixedPrincipal: 100000,
      corePolicy: 'none'
    }),
  'B-whole': () =>
    defaultConfig({
      key: 'B-whole',
      label: 'B with whole shares and residual cash',
      strategies: ['d1'],
      policy: 'single',
      wholeShares: true
    }),
  // Track III sensitivities
  'B-f10': () =>
    defaultConfig({ key: 'B-f10', label: 'B at 10% of equity', strategies: ['d1'], policy: 'single', allocation: 0.1 }),
  'B-f15': () =>
    defaultConfig({
      key: 'B-f15',
      label: 'B at 15% of equity',
      strategies: ['d1'],
      policy: 'single',
      allocation: 0.15
    }),
  'B-f25': () =>
    defaultConfig({
      key: 'B-f25',
      label: 'B at 25% of equity',
      strategies: ['d1'],
      policy: 'single',
      allocation: 0.25
    }),
  'B-r08': () =>
    defaultConfig({ key: 'B-r08', label: 'B at 8% interest', strategies: ['d1'], policy: 'single', rate: 0.08 }),
  'B-r14': () =>
    defaultConfig({ key: 'B-r14', label: 'B at 14% interest', strategies: ['d1'], policy: 'single', rate: 0.14 }),
  'B2-r08': () =>
    defaultConfig({
      key: 'B2-r08',
      label: 'B2 at 8% interest',
      strategies: ['d1.breakeven'],
      policy: 'single',
      rate: 0.08
    }),
  'B2-r14': () =>
    defaultConfig({
      key: 'B2-r14',
      label: 'B2 at 14% interest',
      strategies: ['d1.breakeven'],
      policy: 'single',
      rate: 0.14
    }),
  'B-cost2': () =>
    defaultConfig({
      key: 'B-cost2',
      label: 'B with 2 bps per side on every fill',
      strategies: ['d1'],
      policy: 'single',
      costBps: 2
    }),
  'B-cost5': () =>
    defaultConfig({ key: 'B-cost5', label: 'B with 5 bps per side', strategies: ['d1'], policy: 'single', costBps: 5 }),
  'B-cost10': () =>
    defaultConfig({
      key: 'B-cost10',
      label: 'B with 10 bps per side',
      strategies: ['d1'],
      policy: 'single',
      costBps: 10
    }),
  'B-cost25': () =>
    defaultConfig({
      key: 'B-cost25',
      label: 'B with 25 bps per side (stressed)',
      strategies: ['d1'],
      policy: 'single',
      costBps: 25
    }),
  'B-nextopen': () =>
    defaultConfig({
      key: 'B-nextopen',
      label: 'B with stops filled at the next minute open',
      strategies: ['d1'],
      policy: 'single',
      stopFill: 'next-open'
    }),
  'B-nextopen-slip10': () =>
    defaultConfig({
      key: 'B-nextopen-slip10',
      label: 'B, next-open stop fills 10 bps worse',
      strategies: ['d1'],
      policy: 'single',
      stopFill: 'next-open',
      stopSlippageBps: 10
    }),
  'B-nextopen-slip50': () =>
    defaultConfig({
      key: 'B-nextopen-slip50',
      label: 'B, next-open stop fills 50 bps worse',
      strategies: ['d1'],
      policy: 'single',
      stopFill: 'next-open',
      stopSlippageBps: 50
    }),
  'B-m25': () =>
    defaultConfig({
      key: 'B-m25',
      label: 'B with forced liquidation below 25% equity/LMV',
      strategies: ['d1'],
      policy: 'single',
      maintenance: 0.25
    }),
  'B-m35': () =>
    defaultConfig({
      key: 'B-m35',
      label: 'B with forced liquidation below 35% equity/LMV',
      strategies: ['d1'],
      policy: 'single',
      maintenance: 0.35
    }),
  'B-m50': () =>
    defaultConfig({
      key: 'B-m50',
      label: 'B with forced liquidation below 50% equity/LMV',
      strategies: ['d1'],
      policy: 'single',
      maintenance: 0.5
    }),
  'B2-nextopen': () =>
    defaultConfig({
      key: 'B2-nextopen',
      label: 'B2 with stops filled at the next minute open',
      strategies: ['d1.breakeven'],
      policy: 'single',
      stopFill: 'next-open'
    })
};

export const principalKeys = [
  'A',
  'B',
  'B2',
  'B3',
  'S',
  'P1',
  'P2',
  'P2c',
  'P2s',
  'P3',
  'P4',
  'P5-T1',
  'P5-T2a',
  'P5-T2b',
  'P5-T1-B2',
  'B-rebalance',
  'B-noreinvest',
  'B-fixed100k',
  'B-whole'
];
export const sensitivityKeys = [
  'B-f10',
  'B-f15',
  'B-f25',
  'B-r08',
  'B-r14',
  'B2-r08',
  'B2-r14',
  'B-cost2',
  'B-cost5',
  'B-cost10',
  'B-cost25',
  'B-nextopen',
  'B-nextopen-slip10',
  'B-nextopen-slip50',
  'B-m25',
  'B-m35',
  'B-m50',
  'B2-nextopen'
];

// The standalone trades a shadow-semantics scenario replays: the fixed-$100,000 single-strategy runs under the
// common eligibility (fill minutes and prices don't depend on the size).
export const shadowTradesOf = (
  data: ProgramData,
  keys: StrategyKey[],
  eligibilityIndex: number
): Partial<Record<StrategyKey, ShadowTrade[]>> => {
  const shadows: Partial<Record<StrategyKey, ShadowTrade[]>> = {};

  for (const key of keys) {
    const result = runScenario(
      data,
      defaultConfig({
        key: `shadow-${key}`,
        label: '',
        strategies: [key],
        policy: 'single',
        fixedPrincipal: 100000,
        corePolicy: 'none',
        eligibilityIndex
      })
    );

    shadows[key] = result.lots.map((lot) => ({
      entryIndex: lot.entryIndex,
      entryBar: lot.entryBar,
      entryRawPrice: lot.grossCost / lot.shares,
      entryExecution: lot.entryExecution,
      decisionTime: lot.decisionTime,
      decisionPrice: lot.decisionPrice,
      setupKind: lot.setupKind,
      setupId: lot.setupId,
      exitIndex: lot.exitIndex,
      exitBar: lot.exitBar,
      exitRawPrice: lot.exitRawPrice,
      exitTime: lot.exitTime,
      exitReason: lot.exitReason,
      exitExecution: lot.exitExecution === '' ? 'first trade after decision' : lot.exitExecution
    }));
  }

  return shadows;
};

export const runCatalogueScenario = (data: ProgramData, config: ScenarioConfig): ScenarioResult => {
  const shadows =
    config.semantics === 'shadow' ? shadowTradesOf(data, config.strategies, config.eligibilityIndex) : undefined;

  return runScenario(data, config, shadows);
};

export const compactSignalRecords = (result: ScenarioResult): Record<string, unknown>[] => {
  const rows: Record<string, unknown>[] = [];
  const refused = new Map<
    string,
    { first: ScenarioResult['signals'][number]; last: ScenarioResult['signals'][number]; count: number }
  >();

  for (const signal of result.signals) {
    if (signal.outcome === 'declined') {
      const key = `${signal.strategy}:${signal.setupId}`;
      const entry = refused.get(key);

      if (entry) {
        entry.last = signal;
        entry.count++;
      } else {
        refused.set(key, { first: signal, last: signal, count: 1 });
      }
    }
  }

  for (const signal of result.signals) {
    const key = `${signal.strategy}:${signal.setupId}`;
    const entry = refused.get(key);

    if (signal.outcome === 'declined' && entry && entry.first !== signal) {
      continue;
    }

    rows.push({
      scenario: result.config.key,
      ...signal,
      decisionTime: formatTime(signal.decisionTime),
      refusedMinutes: signal.outcome === 'declined' ? entry!.count : 0,
      lastRefusedTime: signal.outcome === 'declined' ? formatTime(entry!.last.decisionTime) : ''
    });
  }

  return rows;
};

export const writeScenario = async (
  data: ProgramData,
  result: ScenarioResult,
  dir: string,
  baseline?: ScenarioResult
) => {
  const summary = scenarioSummary(data, result, baseline);

  await fs.ensureDir(dir);
  await fs.writeFile(path.join(dir, 'summary.json'), `${JSON.stringify(summary, null, 1)}\n`);
  await fs.writeFile(path.join(dir, 'trades.csv'), toCsv(tradeRecords(data, result)));
  await fs.writeFile(path.join(dir, 'daily.csv'), toCsv(dailyRecords(result)));
  await fs.writeFile(path.join(dir, 'ledger.csv'), toCsv(eventRecords(result)));
  // signals.csv is compact: every granted / takeover / displacement / Reg T row, plus one row per setup refused under
  // the hold semantics (its first refusal, with the count of refused minutes and the last one). The full minute log,
  // one row per refused minute, is signals_minutes.csv (git-ignored; megabytes per shared scenario).
  await fs.writeFile(path.join(dir, 'signals.csv'), toCsv(compactSignalRecords(result)));
  await fs.writeFile(path.join(dir, 'signals_minutes.csv'), toCsv(signalRecords(result)));
  await fs.writeFile(path.join(dir, 'annual.csv'), toCsv(annualRows(data, result)));
  await fs.writeFile(path.join(dir, 'dividends.csv'), toCsv(result.dividends as unknown as Record<string, unknown>[]));
  await fs.writeFile(
    path.join(dir, 'takeovers.csv'),
    toCsv(
      result.takeovers.map(
        (takeover) => ({ ...takeover, date: data.ds.dates[takeover.index] }) as Record<string, unknown>
      )
    )
  );
  await fs.writeFile(
    path.join(dir, 'forced_sales.csv'),
    toCsv(result.forcedSales as unknown as Record<string, unknown>[])
  );

  return summary;
};

export interface CatalogueRun {
  results: Map<string, ScenarioResult>;
  summaries: ScenarioSummary[];
}

export const runKeys = async (
  data: ProgramData,
  keys: string[],
  root: string,
  log = console.info
): Promise<CatalogueRun> => {
  const results = new Map<string, ScenarioResult>();
  const summaries: ScenarioSummary[] = [];
  const baseline = keys.includes('A') ? runCatalogueScenario(data, catalogue.A!()) : undefined;

  for (const key of keys) {
    const factory = catalogue[key];

    if (!factory) {
      throw new Error(`Unknown scenario ${key}`);
    }

    const started = Date.now();
    const result = key === 'A' && baseline ? baseline : runCatalogueScenario(data, factory());
    const summary = await writeScenario(data, result, path.join(root, 'scenarios', key), baseline);

    results.set(key, result);
    summaries.push(summary);
    log(
      `${key}: end equity ${Math.round(summary.end_equity).toLocaleString('en-US')}, strategy net ${Math.round(summary.strategy_net).toLocaleString('en-US')}, ${summary.strategy_trades} trades, daily DD ${Math.round(summary.daily_max_drawdown).toLocaleString('en-US')} (${(100 * summary.daily_max_drawdown_percent).toFixed(1)}%), min eq/LMV ${(100 * summary.min_equity_to_lmv_daily).toFixed(1)}% (${Date.now() - started} ms)`
    );
  }

  return { results, summaries };
};

// The combined machine-readable tables the brief asks for.
export const writeCombined = async (data: ProgramData, run: CatalogueRun, root: string) => {
  const results = [...run.results.values()];

  await fs.writeFile(path.join(root, 'scenario_summary.csv'), toCsv(run.summaries));
  await fs.writeFile(path.join(root, 'scenario_summary.json'), `${JSON.stringify(run.summaries, null, 1)}\n`);
  await fs.writeFile(
    path.join(root, 'annual_portfolio.csv'),
    toCsv(results.flatMap((result) => annualRows(data, result)))
  );
  await fs.writeFile(
    path.join(root, 'shared_margin_trades.csv'),
    toCsv(results.flatMap((result) => tradeRecords(data, result)))
  );
  await fs.writeFile(path.join(root, 'margin_ledger.csv'), toCsv(results.flatMap((result) => eventRecords(result))));

  // Wide daily equity: one column per scenario.
  const dates = results[0]?.daily.map((row) => row.date) ?? [];
  const equityRows = dates.map((date, index) => {
    const row: Record<string, unknown> = { date };

    for (const result of results) {
      row[result.config.key] = result.daily[index]?.equity;
    }

    return row;
  });

  await fs.writeFile(path.join(root, 'portfolio_equity.csv'), toCsv(equityRows));
};

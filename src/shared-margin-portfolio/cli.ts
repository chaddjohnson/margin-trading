// The shared-margin portfolio program's commands: `npm run shared-margin -- <command> [options]`.
//
//   audit                       data facts, hashes, the distribution ledger re-derivation → results/audit/
//   parity [--file-dir <dir>]   the frozen strategies against the D1-refinement engine (and the files' own outputs)
//   run [--keys A,B,...]        the catalogue scenarios → results/scenarios/<key>/ and the combined tables
//   overlap                     Track I from the two standalone runs → results/overlap/
//   stress                      Track III gap, correlated and interest tables → results/stress/
//   audit-ledger [--keys ...]   independent recomputation of each scenario's ledger → results/audit/
//   all                         everything above in order
import path from 'node:path';
import fs from 'fs-extra';
import { auditLedger } from './audit.ts';
import { audit, loadProgramData, type ProgramData } from './data.ts';
import { type ScenarioResult, defaultConfig, runScenario } from './engine.ts';
import { toCsv } from './metrics.ts';
import { analyzeOverlap } from './overlap.ts';
import { compareWithFile, compareWithRefinementEngine, standalone, summarize } from './parity.ts';
import {
  type CatalogueRun,
  catalogue,
  principalKeys,
  runCatalogueScenario,
  runKeys,
  sensitivityKeys,
  writeCombined,
  writeScenario
} from './scenarios.ts';
import { renderTables } from './report.ts';
import { correlatedStress, gapTable, interestSplit } from './stress.ts';
import type { StrategyKey } from './strategy.ts';

export const resultsRoot = 'research/vgt-shared-margin-portfolio/results';

export const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

export const writeJson = async (file: string, value: unknown) =>
  fs.outputFile(file, `${JSON.stringify(value, null, 1)}\n`);

const keysOf = (args: string[], fallback: string[]) => option(args, 'keys')?.split(',') ?? fallback;

const runAudit = async (data: ProgramData) => {
  const report = await audit(data);

  await writeJson(path.join(resultsRoot, 'audit', 'data_audit.json'), report);
  console.info(JSON.stringify(report, null, 1));
};

const runParity = async (data: ProgramData, args: string[]) => {
  const fileDir = option(args, 'file-dir');
  const outcomes = [];

  for (const [key, armStart] of [
    ['d1', 365],
    ['d1.breakeven', 365],
    ['d1.p86', 365],
    ['swing', 365],
    ['swing', 55],
    ['set2', 365]
  ] as [StrategyKey, number][]) {
    for (const [rate, stopFill] of [
      [0.11, 'stop'],
      [0.08, 'stop'],
      [0.14, 'stop'],
      [0.11, 'next-open']
    ] as [number, 'stop' | 'next-open'][]) {
      const outcome = compareWithRefinementEngine(data, key, armStart, rate, stopFill);

      outcomes.push(outcome);
      console.info(
        `${outcome.name}: ${outcome.trades} trades, net ${outcome.net.toFixed(2)}, minute DD ${outcome.minuteDrawdown.toFixed(2)}, daily DD ${outcome.dailyDrawdown.toFixed(2)}; ${outcome.differences.length} differences`
      );

      for (const difference of outcome.differences.slice(0, 10)) {
        console.info(`  ${difference}`);
      }
    }
  }

  if (fileDir) {
    for (const [key, dir, armStart] of [
      ['d1', 'd1', 74],
      ['d1.breakeven', 'bb', 74],
      ['swing', 'swing', 55]
    ] as [StrategyKey, string, number][]) {
      const outcome = await compareWithFile(data, key, path.join(fileDir, dir), armStart);

      outcomes.push(outcome);
      console.info(
        `${outcome.name}: ${outcome.trades} trades, net ${outcome.net.toFixed(2)}, minute DD ${outcome.minuteDrawdown.toFixed(2)}; ${outcome.differences.length} differences`
      );

      for (const difference of outcome.differences.slice(0, 10)) {
        console.info(`  ${difference}`);
      }
    }
  }

  await writeJson(path.join(resultsRoot, 'parity', 'parity.json'), outcomes);

  return outcomes;
};

const runScenarios = async (data: ProgramData, args: string[]): Promise<CatalogueRun> => {
  const keys = keysOf(args, [...principalKeys, ...sensitivityKeys]);
  const run = await runKeys(data, keys, resultsRoot);

  await writeCombined(data, run, resultsRoot);

  return run;
};

const runOverlap = async (data: ProgramData) => {
  const d1 = standalone(data, 'd1', 365);
  const swing = standalone(data, 'swing', 365);
  const analysis = analyzeOverlap(data, d1, swing);
  const dir = path.join(resultsRoot, 'overlap');

  await fs.ensureDir(dir);
  await fs.writeFile(path.join(resultsRoot, 'position_overlaps.csv'), toCsv(analysis.overlaps));
  await fs.writeFile(path.join(resultsRoot, 'competing_signals.csv'), toCsv(analysis.competing));
  await writeJson(path.join(dir, 'overlap_summary.json'), analysis.summary);
  await writeScenario(data, d1, path.join(dir, 'standalone-d1'));
  await writeScenario(data, swing, path.join(dir, 'standalone-swing'));
  console.info(JSON.stringify(analysis.summary, null, 1));
  console.info(`${analysis.overlaps.length} overlapping pairs, ${analysis.competing.length} competing signals`);

  return analysis;
};

const runStress = async (data: ProgramData, run?: CatalogueRun) => {
  const dir = path.join(resultsRoot, 'stress');
  const get = (key: string): ScenarioResult => run?.results.get(key) ?? runCatalogueScenario(data, catalogue[key]!());
  const b = get('B');
  const b2 = get('B2');

  await fs.ensureDir(dir);

  // Gap-through-stop per trade.
  const gaps = [...gapTable(data, b), ...gapTable(data, b2)];

  await fs.writeFile(path.join(dir, 'stress_gaps.csv'), toCsv(gaps));

  // Correlated stress from the balance sheets.
  const correlated = [
    ...correlatedStress(data, b),
    ...correlatedStress(data, get('B-f25')),
    ...correlatedStress(data, get('P3'))
  ];

  await fs.writeFile(path.join(dir, 'stress_correlated.csv'), toCsv(correlated));

  // Interest: financing versus timing.
  const splits = [
    interestSplit(data, b, get('B-r08')),
    interestSplit(data, b, get('B-r14')),
    interestSplit(data, b2, get('B2-r08')),
    interestSplit(data, b2, get('B2-r14'))
  ];

  await fs.writeFile(path.join(dir, 'stress_interest.csv'), toCsv(splits as unknown as Record<string, unknown>[]));

  // Full-path shock re-runs: the whole VGT and VOOG series shifted from the session after the largest lot's entry and
  // after the 2020-03-12 entry, with forced liquidation at 35% and 50%.
  const largest = [...b.lots].sort((x, y) => y.principal - x.principal)[0];
  const march2020 = b.lots.find((lot) => data.ds.dates[lot.entryIndex] === '2020-03-12');
  const anchors = [largest, march2020].filter((lot): lot is NonNullable<typeof lot> => Boolean(lot));
  const shockRows: Record<string, unknown>[] = [];

  for (const lot of anchors) {
    for (const gap of [0.1, 0.2, 0.3]) {
      for (const maintenance of [0.35, 0.5]) {
        const key = `shock-${data.ds.dates[lot.entryIndex + 1]}-g${Math.round(gap * 100)}-m${Math.round(maintenance * 100)}`;
        const result = runScenario(
          data,
          defaultConfig({
            key,
            label: `B with a ${Math.round(gap * 100)}% gap in both ETFs from ${data.ds.dates[lot.entryIndex + 1]} and forced liquidation below ${Math.round(maintenance * 100)}%`,
            strategies: ['d1'],
            policy: 'single',
            maintenance,
            shocks: [{ index: lot.entryIndex + 1, vgt: 1 - gap, voog: 1 - gap }]
          })
        );
        const summary = await writeScenario(data, result, path.join(dir, key), b);
        const shockedLot = result.lots.find((candidate) => candidate.entryIndex === lot.entryIndex);

        shockRows.push({
          key,
          shock_date: data.ds.dates[lot.entryIndex + 1],
          gap,
          maintenance,
          lot_entry: data.ds.dates[lot.entryIndex],
          lot_exit: shockedLot && shockedLot.exitIndex >= 0 ? data.ds.dates[shockedLot.exitIndex] : 'open',
          lot_exit_reason: shockedLot?.exitReason ?? '',
          lot_net: shockedLot?.netProfit ?? NaN,
          forced_sales: result.forcedSales.length,
          end_equity: summary.end_equity,
          end_equity_vs_B: summary.end_equity - b.daily.at(-1)!.equity,
          daily_max_drawdown: summary.daily_max_drawdown,
          daily_max_drawdown_percent: summary.daily_max_drawdown_percent,
          min_equity_to_lmv: summary.min_equity_to_lmv_daily,
          trades: summary.strategy_trades,
          strategy_net: summary.strategy_net
        });
      }
    }
  }

  await fs.writeFile(path.join(dir, 'stress_full_path.csv'), toCsv(shockRows));
  console.info(
    `${gaps.length} gap rows, ${correlated.length} correlated rows, ${shockRows.length} full-path shock runs`
  );
};

const runLedgerAudit = async (data: ProgramData, args: string[], run?: CatalogueRun) => {
  const keys = keysOf(args, principalKeys);
  const reports = [];

  for (const key of keys) {
    const result = run?.results.get(key) ?? runCatalogueScenario(data, catalogue[key]!());
    const report = auditLedger(data, result);

    reports.push(report);
    console.info(
      `${key}: ${report.checks} checks, ${report.failures.length} failures${report.failures.length ? `: ${report.failures.slice(0, 5).join('; ')}` : ''}`
    );
  }

  await writeJson(path.join(resultsRoot, 'audit', 'ledger_audit.json'), reports);

  return reports;
};

const commands: Record<string, (args: string[]) => Promise<void>> = {
  audit: async () => runAudit(await loadProgramData()),
  parity: async (args) => {
    await runParity(await loadProgramData(), args);
  },
  run: async (args) => {
    await runScenarios(await loadProgramData(), args);
  },
  overlap: async () => {
    await runOverlap(await loadProgramData());
  },
  stress: async () => runStress(await loadProgramData()),
  'audit-ledger': async (args) => {
    await runLedgerAudit(await loadProgramData(), args);
  },
  // The matched borrowing-dollar-days passive comparator (PROTOCOL.md §6): a constant VGT margin lot from the first
  // eligible session whose principal × calendar days equals scenario B's realized borrowing-dollar-days, at 11%,
  // added to scenario A's daily equity. Separates the value of D1's timing from the value of extra VGT exposure.
  comparator: async (args) => {
    const data = await loadProgramData();
    const { ds } = data;
    const a = runCatalogueScenario(data, catalogue.A!());
    const b = runCatalogueScenario(data, catalogue[option(args, 'scenario') ?? 'B']!());
    const first = b.config.eligibilityIndex;
    const endIndex = ds.sessionCount - 1;
    const days = (ds.sTime[endIndex]! - ds.sTime[first]!) / 86400;
    const dollarDays = b.lots.reduce((total, lot) => {
      const last = lot.exitIndex >= 0 ? lot.exitIndex : endIndex;

      return total + (lot.principal * (ds.sTime[last]! - lot.entryTimestamp)) / 86400;
    }, 0);
    const principal = dollarDays / days;
    const entryPrice = ds.bOpen[ds.sBarStart[first]!]!;
    const shares = principal / entryPrice;
    const rate = b.config.rate;
    const rows = a.daily.map((row, s) => {
      const held = s >= first;
      const interest = held ? principal * rate * ((ds.sTime[s]! - ds.sTime[first]!) / (365 * 86400)) : 0;
      const lot = held ? shares * row.vgtClose - principal - interest : 0;

      return {
        date: row.date,
        a_equity: row.equity,
        lot_mark: lot,
        comparator_equity: row.equity + lot,
        b_equity: b.daily[s]!.equity
      };
    });
    let peak = -Infinity;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    for (const row of rows) {
      peak = Math.max(peak, row.comparator_equity);

      if (peak - row.comparator_equity > maxDrawdown) {
        maxDrawdown = peak - row.comparator_equity;
        maxDrawdownPercent = maxDrawdown / peak;
      }
    }

    const last = rows.at(-1)!;
    const summary = {
      scenario: b.config.key,
      eligibilityDate: ds.dates[first],
      calendarDays: days,
      borrowingDollarDays: dollarDays,
      constantPrincipal: principal,
      entryPrice,
      shares,
      rate,
      lotMarkAtEnd: last.lot_mark,
      interestAtEnd: principal * rate * (days / 365),
      comparatorEndEquity: last.comparator_equity,
      aEndEquity: last.a_equity,
      bEndEquity: last.b_equity,
      comparatorIncrementOverA: last.comparator_equity - last.a_equity,
      bIncrementOverA: last.b_equity - last.a_equity,
      bStrategyNet: b.lots.reduce((total, lot) => total + lot.netProfit, 0),
      comparatorDailyMaxDrawdown: maxDrawdown,
      comparatorDailyMaxDrawdownPercent: maxDrawdownPercent,
      note: 'Lot dividends are not credited to the comparator lot (they are in B via core VGT), a small understatement of the comparator.'
    };

    await fs.ensureDir(path.join(resultsRoot, 'comparator'));
    await writeJson(path.join(resultsRoot, 'comparator', `matched_borrowing_${b.config.key}.json`), summary);
    await fs.writeFile(path.join(resultsRoot, 'comparator', `matched_borrowing_${b.config.key}.csv`), toCsv(rows));
    console.info(JSON.stringify(summary, null, 1));
  },
  report: async () => {
    const written = await renderTables(resultsRoot);

    console.info(`Wrote ${written.length} tables to ${path.join(resultsRoot, 'tables')}: ${written.join(', ')}`);
  },
  standalone: async (args) => {
    const data = await loadProgramData();
    const key = (option(args, 'strategy') ?? 'd1') as StrategyKey;
    const result = standalone(data, key, Number(option(args, 'arm') ?? 365));

    console.info(JSON.stringify(summarize(result), null, 1));

    for (const lot of result.lots) {
      console.info(
        `${data.ds.dates[lot.entryIndex]} ${lot.entryPrice.toFixed(2)} -> ${lot.exitIndex < 0 ? 'open' : `${data.ds.dates[lot.exitIndex]} ${lot.exitPrice.toFixed(2)} ${lot.exitReason}`} net ${lot.netProfit.toFixed(2)}`
      );
    }
  },
  all: async (args) => {
    const data = await loadProgramData();

    await runAudit(data);
    await runParity(data, args);
    await runOverlap(data);

    const run = await runScenarios(data, args);

    await runStress(data, run);
    await runLedgerAudit(data, args, run);
    await renderTables(resultsRoot);
  }
};

export const run = async (args: string[]) => {
  const [command, ...rest] = args;
  const handler = command ? commands[command] : undefined;

  if (!handler) {
    throw new Error(`Unknown command ${command ?? ''}; commands: ${Object.keys(commands).join(', ')}`);
  }

  await handler(rest);
};

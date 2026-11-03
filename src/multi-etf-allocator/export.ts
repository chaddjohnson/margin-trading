// Writes one run's machine-readable outputs (PROTOCOL.md §10) and the dated file manifest.
import path from 'node:path';
import fs from 'fs-extra';
import { formatTime, sha256File, writeJson } from './context.ts';
import type { RunResult } from './engine.ts';
import { scheduleKeys } from './margin.ts';
import {
  dailyRecords,
  ledgerRecords,
  marginRecords,
  periodRows,
  refusalRecords,
  signalRecords,
  summarize,
  toCsv,
  topApproaches,
  tradeRecords,
  virtualTradeRecords
} from './metrics.ts';
import { provenanceOf } from './phenotypes.ts';

export const writeRun = async (dir: string, result: RunResult) => {
  const summary = summarize(result);
  const isPortfolio = result.config.mode === 'portfolio';
  const write = (name: string, rows: Record<string, unknown>[]) => fs.outputFile(path.join(dir, name), toCsv(rows));

  await write('trades.csv', tradeRecords(result));
  await write('virtual_trades.csv', virtualTradeRecords(result));
  await write('signals.csv', signalRecords(result));
  await write('refusals.csv', refusalRecords(result));
  await write('daily.csv', dailyRecords(result));
  await write('annual.csv', periodRows(result, 'year') as unknown as Record<string, unknown>[]);
  await write('monthly.csv', periodRows(result, 'month') as unknown as Record<string, unknown>[]);

  if (isPortfolio) {
    await write('account_ledger.csv', ledgerRecords(result));
    await write('margin_requirements.csv', marginRecords(result));
    await write(
      'maintenance_events.csv',
      result.maintenanceEvents.map((event) => ({ ...event, time: formatTime(event.time) }))
    );
    await write(
      'forced_liquidations.csv',
      result.forcedLiquidations.map((row) => ({ ...row, time: formatTime(row.time) }))
    );

    const approaches = scheduleKeys
      .filter((schedule) => result.minimum[schedule])
      .flatMap((schedule) => topApproaches(result, schedule));

    await write('closest_approaches.csv', approaches);
    await write(
      'minute_extremes.csv',
      result.daily.map((row) => ({
        date: row.date,
        ...Object.fromEntries(
          Object.entries(row.minuteMinRatio).map(([schedule, ratio]) => [`minute_min_ratio_${schedule}`, ratio])
        )
      }))
    );
  }

  await writeJson(path.join(dir, 'summary.json'), {
    summary,
    config: {
      ...result.config,
      phenotypes: Object.fromEntries(
        result.config.symbols.map((symbol) => [symbol, provenanceOf(result.config.phenotypes[symbol])])
      )
    },
    books: result.books,
    reservationsAtEnd: result.reservationsAtEnd,
    ledgerChecks: result.ledgerChecks,
    dailyDrawdown: result.dailyDrawdown,
    minuteDrawdown: result.minuteDrawdown,
    strategyDailyDrawdown: result.strategyDailyDrawdown,
    strategyMinuteDrawdown: result.strategyMinuteDrawdown
  });

  return summary;
};

// A dated manifest of every file under a directory: path, bytes, sha256.
export const writeManifest = async (root: string, file: string) => {
  const entries: { path: string; bytes: number; sha256: string }[] = [];
  const walk = async (dir: string) => {
    for (const name of (await fs.readdir(dir)).sort()) {
      const full = path.join(dir, name);
      const stat = await fs.stat(full);

      if (stat.isDirectory()) {
        await walk(full);
      } else if (full !== file) {
        entries.push({ path: path.relative(root, full), bytes: stat.size, sha256: await sha256File(full) });
      }
    }
  };

  await walk(root);
  await writeJson(file, { generatedAt: new Date().toISOString(), root, files: entries });

  return entries.length;
};

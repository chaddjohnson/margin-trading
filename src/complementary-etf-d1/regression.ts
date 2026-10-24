// The gate before any new allocator run (PROTOCOL.md §5): on the identical previous horizon, the canonical `--dataset
// all --end 2025-10-13` path reproduces the frozen protocol's four controls exactly: fixed VGT D1 alone, fixed
// All-lowDd shadow, the VGT-only portfolio B and the All-lowDd shadow portfolio. Every CSV the run writes must be
// byte-identical to the committed frozen run's, and the headline figures equal; the separate maximum percentage
// drawdowns of the portfolios are reported with their dates. Read-only on research/multi-etf-allocator/.
import path from 'node:path';
import fs from 'fs-extra';
import { combinationOf, protocol } from '../multi-etf-allocator/context.ts';
import { datasetRunConfig, loadDatasetUniverse, warmupSessionsOf } from '../multi-etf-allocator/dataset.ts';
import { type RunConfig, runAllocator } from '../multi-etf-allocator/engine.ts';
import { writeRun } from '../multi-etf-allocator/export.ts';
import { scenarioBConfig } from '../multi-etf-allocator/parity.ts';
import { allocatorConfig, fixedVgtConfig } from '../multi-etf-allocator/scenarios.ts';
import { formatDollars, log, pct, stageDir, writeJson } from './context.ts';

const frozenRoot = 'research/multi-etf-allocator/results/runs/principal';
const day = (time: number) => (Number.isFinite(time) ? new Date(time * 1000).toISOString().slice(0, 10) : '');

const controls: { key: string; build: () => Promise<RunConfig> }[] = [
  { key: 'F-VGT', build: () => fixedVgtConfig() },
  { key: 'F-all-lowDd-shadow', build: () => allocatorConfig('fixed', combinationOf('all-lowDd'), 'shadow') },
  { key: 'B', build: () => scenarioBConfig() },
  { key: 'C-all-lowDd-shadow', build: () => allocatorConfig('portfolio', combinationOf('all-lowDd'), 'shadow') }
];

export const runRegression = async () => {
  const outcomes = [];

  for (const control of controls) {
    const base = await control.build();
    const members = base.mode === 'portfolio' ? ['VOOG', ...base.symbols] : base.symbols;
    const loaded = await loadDatasetUniverse({
      members: members as RunConfig['symbols'],
      partition: 'all',
      endDate: protocol.commonEnd,
      warmupSessions: warmupSessionsOf(base),
      mode: base.mode
    });
    const result = runAllocator(loaded.universe, datasetRunConfig(base, loaded));
    const dir = stageDir('regression', control.key);
    const summary = await writeRun(dir, result);
    const frozenDir = path.join(frozenRoot, control.key);
    const committed = (await fs.readJson(path.join(frozenDir, 'summary.json'))).summary;
    const csvs = (await fs.readdir(dir)).filter((name) => name.endsWith('.csv'));
    const files = [];

    for (const name of csvs) {
      const frozenFile = path.join(frozenDir, name);
      const exists = await fs.pathExists(frozenFile);

      files.push({
        file: name,
        frozen: exists,
        identical: exists ? (await fs.readFile(path.join(dir, name))).equals(await fs.readFile(frozenFile)) : null
      });
    }

    const fields = [
      'net',
      'realized',
      'unrealized',
      'interest',
      'fundedLots',
      'minuteDrawdown',
      'dailyDrawdown',
      'endEquity'
    ];
    const differences = fields.filter(
      (field) =>
        (summary as unknown as Record<string, number>)[field] !== committed[field] &&
        !(Number.isNaN((summary as unknown as Record<string, number>)[field]) && committed[field] === null)
    );
    const percent = result.dailyPercentDrawdown;
    const minutePercent = result.minutePercentDrawdown;
    const outcome = {
      key: control.key,
      mode: base.mode,
      window: { first: loaded.universe.dates[0], last: loaded.universe.end, splits: loaded.splits },
      summary: Object.fromEntries(
        fields.map((field) => [field, (summary as unknown as Record<string, number>)[field]])
      ),
      committed: Object.fromEntries(fields.map((field) => [field, committed[field]])),
      differences,
      files,
      dailyPercentDrawdown: percent && {
        percent: percent.maximumPercent,
        dollars: percent.dollars,
        peak: day(percent.peakTime),
        trough: day(percent.troughTime),
        recovery: day(percent.recoveryTime)
      },
      minutePercentDrawdown: minutePercent && {
        percent: minutePercent.maximumPercent,
        dollars: minutePercent.dollars,
        peak: day(minutePercent.peakTime),
        trough: day(minutePercent.troughTime)
      },
      largestDollarDailyDrawdown: {
        dollars: result.dailyDrawdown.maximum,
        depthOfThatEpisode: result.dailyDrawdown.maximumPercent,
        peak: day(result.dailyDrawdown.peakTime),
        trough: day(result.dailyDrawdown.troughTime)
      },
      pass: differences.length === 0 && files.every((file) => file.frozen && file.identical)
    };

    outcomes.push(outcome);
    log(
      `${control.key}: net ${formatDollars(summary.net)}${base.mode === 'portfolio' ? `, end equity ${formatDollars(summary.endEquity)}, max % DD daily ${pct(percent!.maximumPercent)} (${outcome.dailyPercentDrawdown!.peak} → ${outcome.dailyPercentDrawdown!.trough}), largest-$ episode depth ${pct(result.dailyDrawdown.maximumPercent)}` : `, minute DD ${formatDollars(summary.minuteDrawdown)}`}; ${files.filter((file) => file.identical).length}/${files.length} CSVs identical; ${differences.length} summary differences`
    );
  }

  await writeJson(stageDir('regression', 'regression.json'), { generatedAt: new Date().toISOString(), outcomes });

  const failed = outcomes.filter((outcome) => !outcome.pass);

  if (failed.length > 0) {
    throw new Error(`Regression gate failed: ${failed.map((outcome) => outcome.key).join(', ')}`);
  }

  return outcomes;
};

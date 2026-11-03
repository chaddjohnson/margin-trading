// The data and corporate-action audit (PROTOCOL.md §2, §13), integrity only: no strategy runs here.
//
// - the repository's own verifiers: datasets, market events (splits and the distribution ledger), legacy archive;
// - per ETF (all 16): sha256, sessions, first and last date, identical calendars (dates, opens, closes), the last
//   common session; every recorded split applied exactly once, no unexplained split-sized gap;
// - per ETF and partition: bar coverage (median bars, sparse and empty sessions, zero-volume bars, closing prints,
//   median daily dollar volume) — counts, never returns;
// - VOOG's sparse minute bars (and every ETF's, for comparison) on training: the share of scheduled minutes with a
//   bar, inter-bar gaps, late first and early last bars;
// - the distribution ledger's coverage; hashes of the inputs and of the study's code; the git state.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import {
  intervalContains,
  loadDatasetSessions,
  readPartitionConfig,
  readSplits,
  resolveDataset,
  unexplainedSplitGaps
} from '#lib';
import type { MarketSession } from '#types';
import { readDistributionLedger } from '../multi-etf-allocator/dataset.ts';
import { log, stageDir, study, universe, writeJson } from './context.ts';
import { gitState, requireProtocolFrozen, sha256File } from './freeze.ts';

const runVerifier = (args: string[]) => {
  const started = Date.now();
  const result = spawnSync('npm', ['run', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  return {
    command: `npm run ${args.join(' ')}`,
    exitCode: result.status,
    seconds: (Date.now() - started) / 1000,
    tail: output.trim().split('\n').slice(-12)
  };
};

const walk = async (dir: string, files: string[] = []) => {
  for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(full, files);
    } else if (entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }

  return files;
};

// The code this study's results depend on: its own files and the reused machinery.
export const studyCodeFiles = async () => [
  ...(await walk('src/joint-16-etf-d1')),
  'src/portfolio-aware-d1/nbook/engine.ts',
  'src/portfolio-aware-d1/nbook/ledger.ts',
  'src/portfolio-aware-d1/nbook/margin.ts',
  'src/portfolio-aware-d1/nbook/universe.ts',
  'src/portfolio-aware-d1/trace.ts',
  'src/portfolio-aware-d1/replay.ts',
  'src/portfolio-aware-d1/compare.ts',
  'src/portfolio-aware-d1/parity.ts',
  'src/portfolio-aware-d1/phenotypes.ts',
  'src/portfolio-aware-d1/stageC.ts',
  'src/portfolio-aware-d1/freeze.ts',
  'src/multi-etf-allocator/engine.ts',
  'src/multi-etf-allocator/ledger.ts',
  'src/multi-etf-allocator/shadow.ts',
  'src/multi-etf-allocator/phenotypes.ts',
  'src/multi-etf-allocator/data.ts',
  'src/multi-etf-allocator/dataset.ts',
  'src/multi-etf-allocator/segments.ts',
  'src/shared-margin-portfolio/strategy.ts',
  'src/four-family/data.ts',
  'src/multi-etf-d1/space.ts',
  'src/multi-etf-d1/context.ts',
  'src/optimizer/nsga2.ts',
  'src/optimizer/sobol.ts',
  'src/optimizer/rng.ts',
  'src/lib/evaluation.ts',
  'src/lib/dataset.ts',
  'src/lib/corporateActions.ts',
  'src/app/allIn-trailingBuy-postExitContinuation.ts'
];

export const inputFiles = [
  'data/partitions.json',
  'config/market-events/splits.json',
  'config/market-events/distributions.csv',
  'config/market-events/distributions.manifest.json',
  'config/allocator/multi-etf-allocator.json',
  'config/phenotypes/D1/VGT.json',
  'config/phenotypes/D1/XBI.json',
  'config/phenotypes/D1/XRT.json',
  'config/phenotypes/D1/KRE.json',
  'config/phenotypes/D1/GDX.json',
  'research/multi-etf-d1/FROZEN_CANDIDATES.json',
  'research/portfolio-aware-d1-optimization/FROZEN_SELECTION.json'
];

export const hashesOf = async (files: readonly string[]) => {
  const hashes: Record<string, string> = {};

  for (const file of files) {
    hashes[file] = await sha256File(file);
  }

  return hashes;
};

export const dataHashes = async () =>
  Object.fromEntries(
    await Promise.all(universe.map(async (symbol) => [symbol, await sha256File(`data/${symbol}/data.csv`)] as const))
  );

const priceFields = (session: MarketSession) => [session.open, session.high, session.low, session.close];

const quantile = (sorted: readonly number[], q: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))]! : NaN;

// Bar coverage of a set of sessions: counts and volumes only.
const coverageOf = (sessions: readonly MarketSession[]) => {
  const bars = sessions.map((session) => session.bars.length).sort((a, b) => a - b);
  const dollars = sessions
    .map((session) => session.bars.reduce((total, bar) => total + bar.close * bar.volume, 0))
    .sort((a, b) => a - b);
  const scheduled = sessions.map((session) => (session.closeTime - session.openTime) / 60);

  return {
    sessions: sessions.length,
    medianBars: quantile(bars, 0.5),
    minimumBars: bars[0] ?? NaN,
    emptySessions: sessions.filter((session) => session.bars.length === 0).length,
    sparseSessions: sessions.filter((session, index) => session.bars.length < 0.5 * scheduled[index]!).length,
    zeroVolumeBars: sessions.reduce(
      (total, session) => total + session.bars.filter((bar) => !(bar.volume > 0)).length,
      0
    ),
    closingPrints: sessions.filter((session) => Number.isFinite(session.closingPrint ?? NaN)).length,
    medianDailyDollarVolume: quantile(dollars, 0.5)
  };
};

// Intraday gaps between consecutive bars (minutes), the share of scheduled minutes with a bar, and late/early edges.
const gapsOf = (sessions: readonly MarketSession[]) => {
  const gaps: number[] = [];
  let minutes = 0;
  let withBar = 0;
  let lateFirst = 0;
  let earlyLast = 0;
  const volumes: number[] = [];

  for (const session of sessions) {
    const scheduled = (session.closeTime - session.openTime) / 60;

    minutes += scheduled;
    withBar += session.bars.length;

    if (session.bars.length === 0) {
      continue;
    }

    if (session.bars[0]!.time - session.openTime > 5 * 60) {
      lateFirst++;
    }

    if (session.closeTime - session.bars.at(-1)!.time > 6 * 60) {
      earlyLast++;
    }

    for (let index = 1; index < session.bars.length; index++) {
      gaps.push((session.bars[index]!.time - session.bars[index - 1]!.time) / 60);
    }

    for (const bar of session.bars) {
      volumes.push(bar.volume);
    }
  }

  gaps.sort((a, b) => a - b);
  volumes.sort((a, b) => a - b);

  return {
    minuteShareWithBar: withBar / minutes,
    gapMinutes: {
      median: quantile(gaps, 0.5),
      p90: quantile(gaps, 0.9),
      p99: quantile(gaps, 0.99),
      max: gaps.at(-1) ?? NaN
    },
    sessionsFirstBarAfter0935: lateFirst,
    sessionsLastBarBefore1554: earlyLast,
    medianBarVolume: quantile(volumes, 0.5)
  };
};

export const runAudit = async () => {
  await requireProtocolFrozen();

  const verifiers = [
    runVerifier(['datasets', '--', 'verify']),
    runVerifier(['market-events', '--', 'verify']),
    runVerifier(['legacy-archive', '--', 'verify'])
  ];

  for (const verifier of verifiers) {
    log(`${verifier.command}: exit ${verifier.exitCode} (${verifier.seconds.toFixed(1)} s)`);
  }

  const splits = readSplits();
  const partitions = readPartitionConfig();
  const previous = (await fs.readJson('research/portfolio-aware-d1-optimization/results/audit/audit.json')) as {
    members: { symbol: string; sha256: string }[];
  };
  const failures: string[] = verifiers
    .filter((verifier) => verifier.exitCode !== 0)
    .map((verifier) => `${verifier.command} exited ${verifier.exitCode}`);
  const members = [];
  const calendars = new Map<string, { date: string; openTime: number; closeTime: number }[]>();
  const coverage = [];

  for (const symbol of universe) {
    const dataset = resolveDataset(symbol, 'all');
    const adjusted = await loadDatasetSessions({ dataset, splits });
    const raw = await loadDatasetSessions({ dataset, splits: [] });
    const sha256 = adjusted.report!.dataSha256!;
    const priorHash = previous.members.find((row) => row.symbol === symbol)?.sha256;
    const splitChecks = splits
      .filter((split) => split.symbol === symbol)
      .map((split) => {
        let mismatches = 0;

        adjusted.sessions.forEach((session, index) => {
          const rawSession = raw.sessions[index]!;
          const factor = session.date >= split.effectiveDate ? split.ratio : 1;
          const expected = priceFields(rawSession).map((value) => value * factor);

          priceFields(session).forEach((value, field) => {
            if (Math.abs(value - expected[field]!) > 1e-9 * Math.abs(expected[field]!)) {
              mismatches++;
            }
          });
        });

        const at = adjusted.sessions.findIndex((session) => session.date >= split.effectiveDate);
        const overnight = (list: MarketSession[], index: number) =>
          index > 0 ? list[index]!.open / list[index - 1]!.close - 1 : NaN;

        return {
          effectiveDate: split.effectiveDate,
          ratio: split.ratio,
          rawOvernight: overnight(raw.sessions, at),
          adjustedOvernight: overnight(adjusted.sessions, at),
          appliedOnce:
            mismatches === 0 &&
            adjusted.report!.splitAdjustments.filter((item) => item.effectiveDate === split.effectiveDate).length === 1,
          priceMismatches: mismatches
        };
      });
    const gaps = unexplainedSplitGaps(raw.sessions, symbol, splits);

    for (const check of splitChecks) {
      if (!check.appliedOnce) {
        failures.push(`${symbol} ${check.effectiveDate}: the split is not applied exactly once`);
      }
    }

    if (gaps.length > 0) {
      failures.push(`${symbol}: ${gaps.length} unexplained split-sized gaps`);
    }

    calendars.set(
      symbol,
      adjusted.sessions.map((session) => ({
        date: session.date,
        openTime: session.openTime,
        closeTime: session.closeTime
      }))
    );

    const byPartition = Object.fromEntries(
      (['training', 'holdout', 'final'] as const).map((name) => [
        name,
        coverageOf(adjusted.sessions.filter((session) => intervalContains(partitions.partitions[name], session.date)))
      ])
    );
    const training = adjusted.sessions.filter((session) => session.date <= study.trainingEnd);

    coverage.push({ symbol, byPartition, trainingIntraday: gapsOf(training) });
    members.push({
      symbol,
      file: dataset.file,
      sha256,
      sameAsPreviousAudit: priorHash === undefined ? 'not in the previous audit' : priorHash === sha256,
      sessions: adjusted.sessions.length,
      firstDate: adjusted.sessions[0]!.date,
      lastDate: adjusted.sessions.at(-1)!.date,
      splits: splitChecks,
      unexplainedGaps: gaps.length
    });
    log(
      `${symbol}: ${adjusted.sessions.length} sessions → ${adjusted.sessions.at(-1)!.date}, ${splitChecks.length} splits`
    );
  }

  const reference = calendars.get('VGT')!;
  const calendarDifferences: string[] = [];

  for (const [symbol, sessions] of calendars) {
    if (sessions.length !== reference.length) {
      calendarDifferences.push(`${symbol}: ${sessions.length} sessions vs VGT ${reference.length}`);
      continue;
    }

    sessions.forEach((session, index) => {
      const other = reference[index]!;

      if (session.date !== other.date || session.openTime !== other.openTime || session.closeTime !== other.closeTime) {
        calendarDifferences.push(`${symbol} ${session.date}: schedule differs from VGT's`);
      }
    });
  }

  failures.push(...calendarDifferences.slice(0, 20));

  const lastCommon = [...calendars.values()].map((sessions) => sessions.at(-1)!.date).sort()[0]!;

  if (lastCommon !== study.expectedLastCommonSession) {
    failures.push(`the last common session is ${lastCommon}, not the expected ${study.expectedLastCommonSession}`);
  }

  const warnings: string[] = [];

  for (const row of coverage) {
    for (const [name, value] of Object.entries(row.byPartition)) {
      if (value.emptySessions > 0) {
        warnings.push(`${row.symbol} ${name}: ${value.emptySessions} sessions without a regular-session bar`);
      }
    }
  }

  const ledger = await readDistributionLedger();
  const distributionCoverage = {
    file: ledger.file,
    sha256: ledger.sha256,
    coverage: ledger.coverage,
    coversLastCommonSession: ledger.coverage.VGT >= lastCommon && ledger.coverage.VOOG >= lastCommon
  };

  if (!distributionCoverage.coversLastCommonSession) {
    failures.push(
      `the distribution ledger covers VGT ${ledger.coverage.VGT}, VOOG ${ledger.coverage.VOOG}, not ${lastCommon}`
    );
  }

  const record = {
    generatedAt: new Date().toISOString(),
    nature: 'integrity only: no strategy result on any window',
    git: gitState(),
    partitions: { file: partitions.file, sha256: partitions.sha256, partitions: partitions.partitions },
    verifiers,
    members,
    calendar: {
      identical: calendarDifferences.length === 0,
      differences: calendarDifferences.slice(0, 20),
      lastCommon
    },
    coverage,
    distributionCoverage,
    splitsRegistry: splits,
    inputs: await hashesOf(inputFiles),
    code: await hashesOf(await studyCodeFiles()),
    warnings,
    failures,
    passed: failures.length === 0
  };

  await writeJson(stageDir('audit', 'audit.json'), record);
  log(`audit: last common session ${lastCommon}; ${failures.length} failures`);

  if (failures.length > 0) {
    throw new Error(`Audit failed: ${failures.slice(0, 5).join('; ')}`);
  }
};

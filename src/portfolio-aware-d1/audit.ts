// The data and corporate-action audit (PROTOCOL.md §2), integrity only: no strategy runs here.
//
// - the repository's own verifiers: `npm run datasets -- verify` (16 canonical files against data/partitions.json),
//   `npm run market-events -- verify` (the distribution ledger and the split registry, no unexplained split-sized
//   move), `npm run legacy-archive -- verify` (the frozen protocol's inputs);
// - per member (VOOG, the four books, the seven candidates): sha256 (and whether it equals the complementary-ETF
//   audit's), sessions, first and last date, identical calendars (dates, opens, closes), the last common session;
// - every recorded split of a member applied exactly once (adjusted prices = raw × ratio from the effective date on,
//   untouched before it), and no unexplained split-sized gap remains;
// - the distribution ledger's coverage against the last common session;
// - training-partition liquidity and sparse sessions per candidate (no returns);
// - hashes of the inputs and of the study's code, and the git state.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { loadDatasetSessions, readPartitionConfig, readSplits, resolveDataset, unexplainedSplitGaps } from '#lib';
import type { MarketSession } from '#types';
import { readDistributionLedger } from '../multi-etf-allocator/dataset.ts';
import { log, stageDir, study, writeJson } from './context.ts';
import { allMembers } from './data.ts';
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

export const studyCodeFiles = async () => {
  const files: string[] = [];
  const walk = async (dir: string) => {
    for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.ts')) {
        files.push(full);
      }
    }
  };

  await walk('src/portfolio-aware-d1');

  return [
    ...files,
    'src/multi-etf-allocator/engine.ts',
    'src/multi-etf-allocator/ledger.ts',
    'src/multi-etf-allocator/shadow.ts',
    'src/multi-etf-allocator/phenotypes.ts',
    'src/multi-etf-allocator/data.ts',
    'src/multi-etf-allocator/dataset.ts',
    'src/shared-margin-portfolio/strategy.ts',
    'src/four-family/data.ts',
    'src/multi-etf-d1/space.ts',
    'src/multi-etf-d1/context.ts',
    'src/optimizer/nsga2.ts',
    'src/optimizer/sobol.ts',
    'src/lib/evaluation.ts',
    'src/lib/dataset.ts',
    'src/lib/corporateActions.ts',
    'src/app/allIn-trailingBuy-postExitContinuation.ts'
  ];
};

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
  'research/multi-etf-d1/FROZEN_CANDIDATES.json'
];

export const hashesOf = async (files: readonly string[]) => {
  const hashes: Record<string, string> = {};

  for (const file of files) {
    hashes[file] = await sha256File(file);
  }

  return hashes;
};

const priceFields = (session: MarketSession) => [session.open, session.high, session.low, session.close];

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
  const prior = (await fs.readJson('research/complementary-etf-d1/results/audit/audit.json')) as {
    coverage: { symbol: string; sha256: string }[];
  };
  const members = [];
  const calendars = new Map<string, MarketSession[]>();
  const failures: string[] = verifiers
    .filter((verifier) => verifier.exitCode !== 0)
    .map((verifier) => `${verifier.command} exited ${verifier.exitCode}`);

  for (const symbol of allMembers) {
    const dataset = resolveDataset(symbol, 'all');
    const adjusted = await loadDatasetSessions({ dataset, splits });
    const raw = await loadDatasetSessions({ dataset, splits: [] });
    const sha256 = adjusted.report!.dataSha256!;
    const priorHash = prior.coverage.find((row) => row.symbol === symbol)?.sha256;
    const ownSplits = splits.filter((split) => split.symbol === symbol);
    const splitChecks = ownSplits.map((split) => {
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
      const overnight = (session: MarketSession[], index: number) =>
        index > 0 ? session[index]!.open / session[index - 1]!.close - 1 : NaN;

      return {
        effectiveDate: split.effectiveDate,
        ratio: split.ratio,
        rawOvernight: overnight(raw.sessions, at),
        adjustedOvernight: overnight(adjusted.sessions, at),
        appliedOnce:
          mismatches === 0 &&
          adjusted.report!.splitAdjustments.filter((a) => a.effectiveDate === split.effectiveDate).length === 1,
        priceMismatches: mismatches
      };
    });
    const gaps = unexplainedSplitGaps(raw.sessions, symbol, splits); // it expects raw prices

    for (const check of splitChecks) {
      if (!check.appliedOnce) {
        failures.push(`${symbol} ${check.effectiveDate}: the split is not applied exactly once`);
      }
    }

    if (gaps.length > 0) {
      failures.push(`${symbol}: ${gaps.length} unexplained split-sized gaps`);
    }

    calendars.set(symbol, adjusted.sessions);
    members.push({
      symbol,
      role: symbol === 'VOOG' ? 'core' : ['VGT', 'XBI', 'XRT', 'KRE'].includes(symbol) ? 'frozen book' : 'candidate',
      file: dataset.file,
      sha256,
      sameAsComplementaryAudit: priorHash === sha256,
      sessions: adjusted.sessions.length,
      firstDate: adjusted.sessions[0]!.date,
      lastDate: adjusted.sessions.at(-1)!.date,
      splits: splitChecks,
      unexplainedGaps: gaps.length
    });
    log(
      `${symbol}: ${adjusted.sessions.length} sessions → ${adjusted.sessions.at(-1)!.date}, ${splitChecks.length} splits checked`
    );
  }

  // Calendars: every member's dates, opens and closes identical.
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

  // Training liquidity and sparse sessions (no returns).
  const liquidity = [];

  for (const symbol of allMembers) {
    const sessions = calendars.get(symbol)!.filter((session) => session.date <= study.trainingEnd);
    const dollars = sessions
      .map((session) => session.bars.reduce((total, bar) => total + bar.close * bar.volume, 0))
      .sort((a, b) => a - b);
    const bars = sessions.map((session) => session.bars.length).sort((a, b) => a - b);

    liquidity.push({
      symbol,
      trainingSessions: sessions.length,
      medianDailyDollarVolume: dollars[dollars.length >> 1],
      medianRegularBars: bars[bars.length >> 1],
      sparseSessions: sessions.filter(
        (session) => session.bars.length < 0.5 * ((session.closeTime - session.openTime) / 60)
      ).length,
      zeroVolumeBars: sessions.reduce(
        (total, session) => total + session.bars.filter((bar) => !(bar.volume > 0)).length,
        0
      )
    });
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

  const partitions = readPartitionConfig();
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
    liquidity,
    distributionCoverage,
    splitsRegistry: splits,
    inputs: await hashesOf(inputFiles),
    code: await hashesOf(await studyCodeFiles()),
    failures,
    passed: failures.length === 0
  };

  await writeJson(stageDir('audit', 'audit.json'), record);
  log(`audit: last common session ${lastCommon}; ${failures.length} failures`);

  if (failures.length > 0) {
    throw new Error(`Audit failed: ${failures.slice(0, 5).join('; ')}`);
  }
};

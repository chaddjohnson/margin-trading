// Command line for the VGT intraday study. Run with
//   node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts intradayStudy <command>
// Commands: verify-protected | golden-master | run | tables | reports | determinism | manifest | all
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { dataFile, policyById, windows } from './constants.ts';
import { computeRecentHighs, loadStudyData, sha256File } from './data.ts';
import { simulate } from './engine.ts';
import { goldenCases, runGoldenCase } from './goldenMaster.ts';
import { legacyFiles } from './legacy.ts';
import { writeTables } from './report.ts';
import { runStudy, windowIndexes } from './study.ts';

export const studyDir = 'research/vgt-intraday-study';
const resultsDir = path.join(studyDir, 'results');
export const protectedFiles = [
  'src/app/allIn.ts',
  'src/app/allin-original.ts',
  dataFile,
  'src/app/allIn-minute-optimizable.ts',
  'src/lib/session.ts',
  'src/lib/csv.ts'
];

const log = (message: string) => console.log(`[${new Date().toISOString()}] ${message}`);

export const readStartHashes = async () => {
  const text = await fs.readFile(path.join(studyDir, 'provenance/protected-hashes-start.txt'), 'utf8');

  return new Map(
    text
      .split('\n')
      .map((line) => line.match(/^([0-9a-f]{64})\s+(\S+)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [match[2]!, match[1]!])
  );
};

export const verifyProtected = async () => {
  const start = await readStartHashes();
  const rows = [];

  for (const file of protectedFiles) {
    const now = await sha256File(file);

    rows.push({ file, start: start.get(file) ?? '', now, unchanged: start.get(file) === now });
  }

  return rows;
};

const assertProtected = async () => {
  const rows = await verifyProtected();
  const changed = rows.filter((row) => !row.unchanged);

  if (changed.length) {
    throw new Error(`Protected files changed since the study started: ${changed.map((row) => row.file).join(', ')}`);
  }
};

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const goldenMaster = async () => {
  await assertProtected();

  const data = await loadStudyData(dataFile);
  const dir = path.join(studyDir, 'baseline/golden');
  const cases = [];

  await fs.remove(dir);

  for (const goldenCase of goldenCases) {
    const result = await runGoldenCase(data.sessions, dataFile, goldenCase, dir);

    log(`${goldenCase.label}: ${result.identical ? 'identical' : 'DIFFERENT'}`);
    cases.push(result);
  }

  // Warm-start code path with the window starting at the file's first tradable session must give the
  // whole-file allIn.ts trades.
  const recentHighs = computeRecentHighs(data.sessions);
  const warmChecks = [];

  for (const stopFill of ['stop', 'next-open'] as const) {
    const result = simulate({
      sessions: data.sessions,
      recentHighs,
      tradeStart: 1,
      endIndex: data.sessions.length - 1,
      policy: policyById('CLOSE_1M'),
      stopMode: 'STOP_DAILY',
      stopFill,
      costsBps: [0]
    });
    const files = legacyFiles(result, data.sessions, { dataFile });
    const original = await fs.readFile(path.join(dir, `whole-file-${stopFill}`, 'allIn', 'trades.csv'), 'utf8');
    const originalSummary = JSON.parse(
      await fs.readFile(path.join(dir, `whole-file-${stopFill}`, 'allIn', 'summary.json'), 'utf8')
    );
    const summary = JSON.parse(files['summary.json']);

    warmChecks.push({
      stopFill,
      tradesIdentical: files['trades.csv'] === original,
      netProfitIdentical: summary.netProfit === originalSummary.netProfit,
      minuteDrawdownIdentical: summary.minuteMaximumDrawdown === originalSummary.minuteMaximumDrawdown,
      dailyDrawdownIdentical: summary.maximumDrawdown === originalSummary.maximumDrawdown
    });
  }

  // The research baseline: warm start from 2016-10-07, against the legacy (cold) start.
  const { tradeStart, endIndex } = windowIndexes(data.sessions, windows.continuous.start, windows.continuous.end);
  const research = [];

  for (const stopFill of ['stop', 'next-open'] as const) {
    const warm = simulate({
      sessions: data.sessions,
      recentHighs,
      tradeStart,
      endIndex,
      policy: policyById('CLOSE_1M'),
      stopMode: 'STOP_DAILY',
      stopFill,
      costsBps: [0, 5]
    });
    const legacy = cases.find((item) => item.label === `legacy-2016-10-07_2025-10-13-${stopFill}`)!.summary;
    const warmSummary = JSON.parse(legacyFiles(warm, data.sessions, { dataFile })['summary.json']);
    const legacyTrades = (
      await fs.readFile(path.join(dir, `legacy-2016-10-07_2025-10-13-${stopFill}`, 'allIn', 'trades.csv'), 'utf8')
    )
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => line.split(','));
    const legacyByDate = new Map(legacyTrades.map((fields) => [fields[2], fields]));
    const firstDifferent = warm.trades.find((trade) => {
      const match = legacyByDate.get(trade.entryDate);

      return !match || Number(match[4]) !== trade.entryPrice || (match[3] || '') !== trade.exitDate;
    });
    const firstSame = warm.trades.findIndex(
      (trade, index) =>
        index > 0 &&
        warm.trades.slice(index).every((later) => {
          const match = legacyByDate.get(later.entryDate);

          return match && Number(match[4]) === later.entryPrice && (match[3] || '') === later.exitDate;
        })
    );

    research.push({
      stopFill,
      warm: {
        firstDate: warmSummary.firstDate,
        closedTrades: warmSummary.closedTrades,
        openAtEnd: warmSummary.openAtEnd,
        netProfit0bp: warmSummary.netProfit,
        netProfit5bp: warm.daily.at(-1)!.equity[1],
        marginInterest: warmSummary.marginInterest,
        dailyDrawdown: warmSummary.maximumDrawdown,
        minuteDrawdown: warmSummary.minuteMaximumDrawdown,
        restrictions: warmSummary.restrictions
      },
      legacy: {
        firstDate: legacy.firstDate,
        closedTrades: legacy.closedTrades,
        openAtEnd: legacy.openAtEnd,
        netProfit0bp: legacy.netProfit,
        marginInterest: legacy.marginInterest,
        dailyDrawdown: legacy.maximumDrawdown,
        minuteDrawdown: legacy.minuteMaximumDrawdown,
        restrictions: legacy.restrictions
      },
      firstDifferentWarmTrade: firstDifferent
        ? { entryDate: firstDifferent.entryDate, entryPrice: firstDifferent.entryPrice }
        : null,
      tradesIdenticalFromEntryDate: firstSame >= 0 ? warm.trades[firstSame]!.entryDate : null
    });
  }

  const report = {
    generatedAtUtc: new Date().toISOString(),
    node: process.version,
    gitHead: git('rev-parse', 'HEAD'),
    dataFile,
    dataSha256: data.hash,
    allInSha256: await sha256File('src/app/allIn.ts'),
    allIdentical:
      cases.every((item) => item.identical) &&
      warmChecks.every((item) => Object.values(item).every((value) => value !== false)),
    cases,
    warmStartCodePathMatchesWholeFile: warmChecks,
    researchBaseline: research
  };

  await fs.writeJson(path.join(studyDir, 'baseline/golden_master.json'), report, { spaces: 1 });

  if (!report.allIdentical) {
    throw new Error('Golden master failed');
  }

  log('golden master: all identical');
};

const run = async (outDir = resultsDir) => {
  await assertProtected();

  const data = await loadStudyData(dataFile);

  await fs.remove(outDir);
  log(`data ${data.hash}, ${data.sessions.length} sessions`);
  await runStudy(data.sessions, outDir, log);
  log(`wrote ${outDir}`);
};

const hashTree = async (dir: string) => {
  const files: string[] = [];
  const walk = async (current: string) => {
    for (const entry of (await fs.readdir(current, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(full);
      } else {
        files.push(full);
      }
    }
  };

  await walk(dir);

  const hashes: Record<string, string> = {};

  for (const file of files) {
    hashes[path.relative(dir, file)] = await sha256File(file);
  }

  return hashes;
};

// Refreshes the generated tables embedded in the written reports: everything between
// `<!-- include: tables/x.md -->` and `<!-- /include -->` is replaced by that file.
const expandReports = async () => {
  for (const name of (await fs.readdir(studyDir)).filter((file) => file.endsWith('.md')).sort()) {
    const file = path.join(studyDir, name);
    const text = await fs.readFile(file, 'utf8');
    const parts = text.split(/(<!-- include: [^ ]+ -->)[\s\S]*?(<!-- \/include -->)/);
    const expanded = [];

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index]!;
      const match = part.match(/^<!-- include: ([^ ]+) -->$/);

      if (match) {
        const included = (await fs.readFile(path.join(studyDir, match[1]!), 'utf8')).trimEnd();

        expanded.push(`${part}\n${included}\n`);
      } else {
        expanded.push(part);
      }
    }

    const result = expanded.join('');

    if (result !== text) {
      await fs.writeFile(file, result);
      log(`refreshed tables in ${name}`);
    }
  }
};

const determinism = async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'intraday-rerun-'));

  await run(tmp);

  const original = await hashTree(resultsDir);
  const rerun = await hashTree(tmp);
  const names = [...new Set([...Object.keys(original), ...Object.keys(rerun)])].sort();
  const different = names.filter((name) => original[name] !== rerun[name]);
  const report = {
    generatedAtUtc: new Date().toISOString(),
    files: names.length,
    identical: different.length === 0,
    different
  };

  await fs.writeJson(path.join(studyDir, 'provenance/determinism.json'), report, { spaces: 1 });
  await fs.remove(tmp);
  log(`determinism: ${report.identical ? 'all files identical' : `${different.length} differ`}`);

  if (!report.identical) {
    throw new Error('Rerun differs');
  }
};

const manifest = async () => {
  const sources = await hashTree('src/intraday-study');
  const results = await hashTree(resultsDir);
  const combined = createHash('sha256').update(JSON.stringify(results)).digest('hex');

  await fs.writeJson(
    path.join(studyDir, 'provenance/manifest.json'),
    {
      generatedAtUtc: new Date().toISOString(),
      node: process.version,
      gitHead: git('rev-parse', 'HEAD'),
      protocolSha256: await sha256File(path.join(studyDir, 'PROTOCOL.md')),
      protected: await verifyProtected(),
      cli: { 'src/app/intradayStudy.ts': await sha256File('src/app/intradayStudy.ts') },
      sources,
      resultsCombinedSha256: combined,
      results
    },
    { spaces: 1 }
  );
  log(`manifest written (${Object.keys(results).length} result files)`);
};

export const main = async (command = 'all') => {
  switch (command) {
    case 'verify-protected': {
      const rows = await verifyProtected();

      console.table(rows);

      if (rows.some((row) => !row.unchanged)) {
        process.exitCode = 1;
      }

      break;
    }
    case 'golden-master':
      await goldenMaster();
      break;
    case 'run':
      await run();
      break;
    case 'determinism':
      await determinism();
      break;
    case 'tables':
      await writeTables(resultsDir, path.join(studyDir, 'tables'));
      break;
    case 'reports':
      await expandReports();
      break;
    case 'manifest':
      await manifest();
      break;
    case 'all':
      await goldenMaster();
      await run();
      await writeTables(resultsDir, path.join(studyDir, 'tables'));
      await expandReports();
      await determinism();
      await manifest();
      break;
    default:
      throw new Error(`Unknown command ${command}`);
  }
};

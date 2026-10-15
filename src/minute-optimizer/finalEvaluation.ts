// The freeze and the one-time final evaluation (2024-01-01 to the last session in the minute file).
//
// freeze: locks the final shortlist, rank 1, the code and data hashes and the pre-holdout reports, and
// snapshots the source. It needs the full experiment, its reports and a passing golden master.
// finalEvaluation: verifies the freeze, takes the only capability that can build a dataset beyond
// 2023-12-31, and evaluates the frozen rank 1 against the unchanged incumbent (and the deep-dip control as
// a labelled diagnostic) once. Nothing is re-ranked. A second run needs --rerun-reason, which is recorded.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import path from 'node:path';
import { type MinuteParams, incumbentParams } from '../app/allIn-minute-optimizable.ts';
import { describeParams } from '../optimizer/params.ts';
import { defaultDataFile, issueUnlockCapability, loadSessions, sha256File, unlockedDataset } from './data.ts';
import { ReferenceHighCache, simulate } from './engine.ts';
import { type MinuteMetrics, summarize } from './evaluate.ts';
import { engineTradesCsv, researchDir, resultsRoot, windowInfo } from './experiment.ts';
import { verifyProtectedFiles } from './goldenMaster.ts';
import { deepDipParams, minuteParameterSpace } from './params.ts';
import { codeHash, environment, resultFiles } from './provenance.ts';
import { comparableFromEngine, comparableFromReference, compareComparables, runReference } from './reference.ts';
import { dollars, loadExperiment, minuteDd, dailyDd, net, paramShort, percent } from './report.ts';

// Taken when this module is first loaded; any other request for it throws.
const capability = issueUnlockCapability();

const frozenReports = [
  'MINUTE_OPTIMIZER_DESIGN.md',
  'MINUTE_WALK_FORWARD_RESULTS.md',
  'MINUTE_TOP_CANDIDATES.md',
  'minute_top_candidates.json',
  'minute_top_candidates.csv',
  'minute_pareto_archive.csv',
  'walk_forward.json'
];

const hashJson = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

interface FreezeRecord {
  experiment: string;
  frozenAtUtc: string;
  rankOne: { id: string; params: MinuteParams; description: string };
  shortlist: { rank: number; id: string; params: MinuteParams }[];
  finalRun: { runId: string; configHash: string; window: unknown };
  folds: { runId: string; configHash: string }[];
  selectionPolicy: unknown;
  codeHash: string;
  codeFiles: string[];
  dataFile: string;
  dataHash: string;
  reportHashes: Record<string, string>;
  protectedFiles: unknown;
  goldenMaster: { fileCases: string; engineCases: string };
  gitHead: string;
}

const freezeFile = (id: string) => path.join(resultsRoot(id), 'freeze', 'freeze.json');
const evaluationDir = (id: string) => path.join(resultsRoot(id), 'final-evaluation');

export const freeze = async (id: string, log: (line: string) => void) => {
  if (await fs.pathExists(freezeFile(id))) {
    throw new Error(`Experiment ${id} is already frozen (${freezeFile(id)})`);
  }

  const protectedFiles = await verifyProtectedFiles();
  const golden = await fs.readJson(path.join(researchDir, 'baseline', 'golden-master.json'));

  if (
    golden.fileCases.identical !== golden.fileCases.total ||
    golden.engineCases.identical !== golden.engineCases.total
  ) {
    throw new Error('The golden master does not pass; refusing to freeze');
  }

  const loaded = await loadExperiment(id);
  const rankOne = loaded.final.shortlist[0];

  if (!rankOne) {
    throw new Error('The final run has no rank-1 candidate');
  }

  const candidatesJson = await fs.readJson(path.join(researchDir, 'minute_top_candidates.json'));

  if (candidatesJson.experiment !== id || candidatesJson.candidates[0]?.id !== rankOne.id) {
    throw new Error('minute_top_candidates.json does not match the final run; run `report` first');
  }

  const reportHashes: Record<string, string> = {};

  for (const report of frozenReports) {
    reportHashes[report] = await sha256File(path.join(researchDir, report));
  }

  const record: FreezeRecord = {
    experiment: id,
    frozenAtUtc: new Date().toISOString(),
    rankOne: {
      id: rankOne.id,
      params: rankOne.params,
      description: describeParams(minuteParameterSpace, rankOne.params)
    },
    shortlist: loaded.final.shortlist.map((entry) => ({
      rank: entry.selection.rank,
      id: entry.id,
      params: entry.params
    })),
    finalRun: { runId: loaded.final.runId, configHash: loaded.final.configHash, window: loaded.final.window },
    folds: loaded.folds.map(({ training }) => ({ runId: training.runId, configHash: training.configHash })),
    selectionPolicy: {
      fitness: loaded.config.fitness,
      selection: loaded.config.selection,
      settings: loaded.config.settings
    },
    codeHash: await codeHash(),
    codeFiles: resultFiles,
    dataFile: defaultDataFile,
    dataHash: await sha256File(defaultDataFile),
    reportHashes,
    protectedFiles,
    goldenMaster: {
      fileCases: `${golden.fileCases.identical}/${golden.fileCases.total}`,
      engineCases: `${golden.engineCases.identical}/${golden.engineCases.total}`
    },
    gitHead: git('rev-parse', 'HEAD')
  };
  const dir = path.dirname(freezeFile(id));

  await fs.ensureDir(path.join(dir, 'source'));

  for (const file of [
    ...resultFiles,
    'src/minute-optimizer/report.ts',
    'src/minute-optimizer/finalEvaluation.ts',
    'src/minute-optimizer/cli.ts'
  ]) {
    await fs.copy(file, path.join(dir, 'source', file));
  }

  for (const report of frozenReports) {
    await fs.copy(path.join(researchDir, report), path.join(dir, 'reports', report));
  }

  await fs.writeFile(freezeFile(id), `${JSON.stringify({ record, selfHash: hashJson(record) }, null, 1)}\n`);
  log(
    `Frozen ${id} at ${record.frozenAtUtc}: rank 1 ${record.rankOne.id} (${record.rankOne.description}); freeze hash ${hashJson(record).slice(0, 16)}`
  );
};

const verifyFreeze = async (id: string) => {
  const { record, selfHash } = (await fs.readJson(freezeFile(id))) as { record: FreezeRecord; selfHash: string };
  const problems: string[] = [];

  if (hashJson(record) !== selfHash) {
    problems.push('freeze.json was edited after the freeze');
  }

  if ((await sha256File(record.dataFile)) !== record.dataHash) {
    problems.push('the minute data file changed after the freeze');
  }

  if ((await codeHash(record.codeFiles)) !== record.codeHash) {
    problems.push('code on the evaluation path changed after the freeze');
  }

  for (const [report, hash] of Object.entries(record.reportHashes)) {
    if ((await sha256File(path.join(researchDir, report))) !== hash) {
      problems.push(`${report} changed after the freeze`);
    }
  }

  const loaded = await loadExperiment(id);

  if (loaded.final.shortlist[0]?.id !== record.rankOne.id || loaded.final.configHash !== record.finalRun.configHash) {
    problems.push('the final run record no longer matches the frozen rank 1');
  }

  await verifyProtectedFiles();

  if (problems.length) {
    throw new Error(`Freeze verification failed: ${problems.join('; ')}`);
  }

  return { record, selfHash };
};

interface MemberResult {
  role: 'frozen rank 1' | 'incumbent' | 'deep-dip (diagnostic)';
  id: string;
  params: MinuteParams;
  stop: MinuteMetrics;
  nextOpen: MinuteMetrics;
  continuous: { start: string; years: { year: number; net: number[] }[]; holdoutNet: number[] };
}

const finalMarkdown = (
  output: {
    attempt: { attempt: number; startedAtUtc: string; reason: string };
    freezeHash: string;
    frozenAtUtc: string;
    window: ReturnType<typeof windowInfo>;
    checks: string[];
    results: MemberResult[];
  },
  earlier: { attempt: number; reason: string }[]
) => {
  const { results, window } = output;
  const levels = [0, 5, 10, 20];
  const [rankOne, incumbent] = results as [MemberResult, MemberResult, MemberResult];
  const lines: string[] = [];
  const yearNet = (metrics: MinuteMetrics, year: number, level: number) =>
    metrics.years.find((entry) => entry.year === year)?.net[level] ?? NaN;

  lines.push('# VGT minute optimizer: final evaluation (2024–2025)');
  lines.push('');
  lines.push(
    '> **Workflow-held-out, historically previously inspected.** These 2024–2025 dates were held out of every search, selection and report in this workflow (enforced in code, and run only after the freeze), but they are **not** pristine out-of-sample data: the same dates have been examined before in earlier daily and minute backtests, and the incumbent itself was chosen by the daily study with 2024–2026 as its own holdout. Only sessions after 2025-10-13 would be genuinely new evidence.'
  );
  lines.push('');
  lines.push(
    `Attempt ${output.attempt.attempt} (${output.attempt.startedAtUtc}, reason: ${output.attempt.reason}). Freeze ${output.frozenAtUtc}, freeze hash \`${output.freezeHash.slice(0, 16)}\`.${earlier.length ? ` Earlier attempts: ${earlier.map((entry) => `${entry.attempt} (${entry.reason})`).join(', ')}.` : ''} Only the frozen rank 1 is evaluated, against the unchanged incumbent; the deep-dip control is shown as a labelled diagnostic. Nothing was re-ranked.`
  );
  lines.push('');
  lines.push(
    `Window ${window.firstDate} → ${window.lastDate} (${window.sessions} sessions, ${window.years.toFixed(2)} years). Flat start on the first session, with all earlier sessions as reference-high history; an open position at the end is marked to the last close net of accrued interest. Money per $100,000 margin allocation at 11% interest. Cash dividends are not modeled (raw Alpaca prices).`
  );
  lines.push('');
  lines.push('## Parameters');
  lines.push('');
  lines.push('| Strategy | Dip / stop / hold / lookback / material loss / lower re-entry / reset |');
  lines.push('|---|---|');
  results.forEach((result) => lines.push(`| ${result.role} (\`${result.id}\`) | ${paramShort(result.params)} |`));
  lines.push('');
  lines.push('## Results (independent flat-start test)');
  lines.push('');
  lines.push(
    `| Strategy | Trades | Exposure | Gross (0 bp) | Interest | ${levels.map((bps) => `Net ${bps} bp`).join(' | ')} | Minute DD 0 bp | Daily DD 0 bp | Minute DD 5 bp | Daily DD 5 bp |`
  );
  lines.push(
    `|${Array(5 + levels.length + 4)
      .fill('---')
      .join('|')}|`
  );
  results.forEach((result) => {
    const metrics = result.stop;

    lines.push(
      `| ${result.role} | ${metrics.entries} | ${percent(metrics.exposure)} | ${dollars(metrics.grossProfit)} | ${dollars(metrics.interest)} | ${levels.map((bps) => dollars(net(metrics, bps))).join(' | ')} | ${dollars(metrics.minuteDrawdown)} | ${dollars(metrics.dailyDrawdown)} | ${dollars(minuteDd(metrics, 5))} | ${dollars(dailyDd(metrics, 5))} |`
    );
  });
  lines.push('');

  const difference = (bps: number) => net(rankOne.stop, bps) - net(incumbent.stop, bps);

  lines.push(
    `Frozen rank 1 minus incumbent: ${levels.map((bps) => `${dollars(difference(bps))} at ${bps} bp`).join(', ')}.`
  );
  lines.push('');
  lines.push('## Execution sensitivity: `next-open` stop fills');
  lines.push('');
  lines.push('| Strategy | Net 0 bp | Net 5 bp | Net 20 bp | Minute DD 0 bp | Change vs stop fill at 5 bp |');
  lines.push('|---|---|---|---|---|---|');
  results.forEach((result) =>
    lines.push(
      `| ${result.role} | ${dollars(net(result.nextOpen, 0))} | ${dollars(net(result.nextOpen, 5))} | ${dollars(net(result.nextOpen, 20))} | ${dollars(result.nextOpen.minuteDrawdown)} | ${dollars(net(result.nextOpen, 5) - net(result.stop, 5))} |`
    )
  );
  lines.push('');
  lines.push('## By calendar year (5 bp/side, daily mark to market)');
  lines.push('');
  lines.push('| Strategy | 2024 | 2025 (to the last session) |');
  lines.push('|---|---|---|');
  results.forEach((result) =>
    lines.push(
      `| ${result.role} | ${dollars(yearNet(result.stop, 2024, 1))} | ${dollars(yearNet(result.stop, 2025, 1))} |`
    )
  );
  lines.push('');
  lines.push('## Additional diagnostic: continuous run from 2016-10-07');
  lines.push('');
  lines.push(
    'The fixed vector run without interruption from 2016-10-07, so a position or restriction can carry across 2023-12-31; 2024–2025 P&L is the change in daily mark-to-market equity between the 2023 year-end close and the last session, never a sum of trades exiting in the window. This is not the primary test.'
  );
  lines.push('');
  lines.push('| Strategy | 2024–2025 net 0 bp | 5 bp | 10 bp | 20 bp |');
  lines.push('|---|---|---|---|---|');
  results.forEach((result) =>
    lines.push(`| ${result.role} | ${result.continuous.holdoutNet.map(dollars).join(' | ')} |`)
  );
  lines.push('');
  lines.push('## Integrity');
  lines.push('');
  lines.push(
    `Every figure above was computed by the fast engine and replayed through the literal working copy of allIn.ts (\`src/app/allIn-minute-optimizable.ts\`); they agree field for field (${output.checks.length} checks). Trade, daily-equity, state and episode files for each strategy and stop fill are in \`results/<experiment>/final-evaluation/<id>/<stop fill>/\`.`
  );
  lines.push('');

  return lines.join('\n');
};

export const finalEvaluation = async (id: string, rerunReason: string | undefined, log: (line: string) => void) => {
  const { record, selfHash } = await verifyFreeze(id);
  const dir = evaluationDir(id);
  const attemptsFile = path.join(dir, 'attempts.json');
  const attempts: { attempt: number; startedAtUtc: string; reason: string }[] = (await fs.pathExists(attemptsFile))
    ? await fs.readJson(attemptsFile)
    : [];

  if (attempts.length > 0 && !rerunReason) {
    throw new Error(
      `The final evaluation has already run ${attempts.length} time(s); a rerun needs --rerun-reason, which is published in the report`
    );
  }

  const attempt = {
    attempt: attempts.length + 1,
    startedAtUtc: new Date().toISOString(),
    reason: rerunReason ?? 'first run'
  };

  await fs.ensureDir(dir);
  await fs.writeFile(attemptsFile, `${JSON.stringify([...attempts, attempt], null, 1)}\n`);

  const sessions = await loadSessions(record.dataFile);
  const dataset = unlockedDataset(sessions, record.dataHash, capability);
  const holdout = windowInfo(dataset, { start: '2024-01-01', end: dataset.lastDate });
  const window = { historyStart: 0, startIndex: holdout.startIndex, endIndex: holdout.endIndex };
  const continuousStart = windowInfo(dataset, { start: '2016-10-07', end: dataset.lastDate });
  const settings = { stopFill: 'stop' as const, costBps: [5, 10, 20] };
  const highs = new ReferenceHighCache(dataset.sHigh);
  const members: { role: MemberResult['role']; id: string; params: MinuteParams }[] = [
    { role: 'frozen rank 1', id: record.rankOne.id, params: record.rankOne.params },
    { role: 'incumbent', id: 'incumbent', params: incumbentParams },
    { role: 'deep-dip (diagnostic)', id: 'deep-dip', params: deepDipParams }
  ];
  const results: MemberResult[] = [];
  const checks: string[] = [];

  for (const member of members) {
    const byFill: Record<string, MinuteMetrics> = {};

    for (const stopFill of ['stop', 'next-open'] as const) {
      const engine = simulate(
        dataset,
        highs.get(member.params.lookbackSessions, 0),
        member.params,
        window,
        { ...settings, stopFill },
        true
      );
      const reference = await runReference(sessions, {
        params: member.params,
        startDate: holdout.start,
        endDate: holdout.end,
        warmup: true,
        stopFill,
        costBps: [...settings.costBps],
        outDir: path.join(dir, `${member.id}`, stopFill)
      });
      const differences = compareComparables(
        comparableFromReference(reference, [...settings.costBps]),
        comparableFromEngine(engine, dataset.dates, holdout.startIndex)
      );

      if (differences.length) {
        throw new Error(
          `Engine and working copy disagree on ${member.id} (${stopFill}): ${differences.slice(0, 5).join('; ')}`
        );
      }

      checks.push(`${member.id} ${stopFill}: engine = literal copy`);
      byFill[stopFill] = summarize(engine);
      await fs.writeFile(
        path.join(dir, `${member.id}`, stopFill, 'engine-trades.csv'),
        engineTradesCsv(engine, dataset.dates)
      );
    }

    // Additional diagnostic: the fixed vector run continuously from 2016-10-07, its 2024-2025 P&L taken as
    // the change in daily mark-to-market equity (positions and restrictions carried across 2023-12-31).
    const continuous = simulate(
      dataset,
      highs.get(member.params.lookbackSessions, 0),
      member.params,
      { historyStart: 0, startIndex: continuousStart.startIndex, endIndex: continuousStart.endIndex },
      settings
    );
    const holdoutYears = continuous.years.filter((year) => year.year >= 2024);

    results.push({
      ...member,
      stop: byFill.stop!,
      nextOpen: byFill['next-open']!,
      continuous: {
        start: continuousStart.firstDate,
        years: continuous.years.map((year) => ({ year: year.year, net: year.net })),
        holdoutNet: [0, 1, 2, 3].map((level) => holdoutYears.reduce((total, year) => total + year.net[level]!, 0))
      }
    });
  }

  const output = {
    experiment: id,
    attempt,
    freezeHash: selfHash,
    frozenAtUtc: record.frozenAtUtc,
    window: holdout,
    dataHash: record.dataHash,
    checks,
    results,
    environment: await environment()
  };

  await fs.writeFile(path.join(dir, 'final-evaluation.json'), `${JSON.stringify(output, null, 1)}\n`);
  await fs.writeFile(path.join(researchDir, 'MINUTE_FINAL_EVALUATION.md'), finalMarkdown(output, attempts));
  log(`Final evaluation attempt ${attempt.attempt} written: ${path.join(researchDir, 'MINUTE_FINAL_EVALUATION.md')}`);
};

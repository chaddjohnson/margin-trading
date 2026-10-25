// `npm run robust-d1 -- ingest <SYMBOL ...>` (PROTOCOL.md §3.3): a thin orchestrator around the repository's own
// tools — scripts/download.sh (Alpaca pagination, appends to data/<SYMBOL>.csv), `npm run datasets -- import` (scan,
// temp file + rename into data/<SYMBOL>/data.csv) and `npm run datasets -- verify` — plus the split-gap rule of
// `npm run market-events -- verify` applied to the one symbol (the full verifier runs once for the batch). Integrity
// metadata only: nothing here reads or computes a strategy result.
//
// Safety (ingestSafety.ts): an attempt log is written before each download so the staging file is attributable; the
// staging file is deleted only by path-validated calls the log authorizes; a newly created unverified data/<SYMBOL>/
// is moved to data/quarantine/, never deleted; an existing canonical file is never touched; the two credentials go
// only into the download child's environment and every captured line is redacted.
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import fs from 'fs-extra';
import {
  canonicalDataFile,
  groupMarketSessions,
  loadCsvMinuteBacktestData,
  readSplits,
  unexplainedSplitGaps
} from '#lib';
import { candidateUniverse, hasFlag, log, nowIso, stageDir, study, writeJson } from './context.ts';
import {
  type Attempt,
  type AttemptLog,
  assertCanonicalDir,
  assertStagingPath,
  childEnvironment,
  classifyFailure,
  credentialsOf,
  mayDeleteAfterVerification,
  mayDeleteForRetry,
  mayQuarantine,
  redact,
  stagingPathOf,
  symbolPattern
} from './ingestSafety.ts';

export interface IngestOptions {
  dataDir: string;
  resultsDir: string;
  downloadScript: string; // scripts/download.sh, or a fixture in the tests
  npmCommand: (args: string[]) => { command: string; args: string[] }; // how the datasets CLI is invoked
  credentials: () => Record<string, string>;
  wait: (seconds: number) => Promise<void>;
  env: NodeJS.ProcessEnv;
  verifyGaps: boolean;
}

export const defaultOptions = (): IngestOptions => ({
  dataDir: 'data',
  resultsDir: stageDir('ingestion'),
  downloadScript: 'scripts/download.sh',
  npmCommand: (args) => ({ command: 'npm', args: ['run', '--silent', ...args] }),
  credentials: () => {
    const text = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : undefined;

    return credentialsOf(process.env, study.ingestion.credentialNames, text);
  },
  wait: (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000)),
  env: process.env,
  verifyGaps: true
});

const attemptLogFile = (options: IngestOptions, symbol: string) =>
  path.join(options.resultsDir, `${symbol}.attempts.json`);

const readAttemptLog = async (options: IngestOptions, symbol: string): Promise<AttemptLog> => {
  const file = attemptLogFile(options, symbol);

  return (await fs.pathExists(file)) ? ((await fs.readJson(file)) as AttemptLog) : { symbol, attempts: [] };
};

const writeAttemptLog = (options: IngestOptions, log_: AttemptLog) =>
  fs.outputJson(attemptLogFile(options, log_.symbol), log_, { spaces: 1 });

// Runs a child process, capturing its output (redacted) into a log file; resolves with the exit code and the text.
const runChild = (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  logFile: string,
  secrets: Record<string, string>
): Promise<{ code: number | null; output: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';

    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', async (code) => {
      const text = redact(output, secrets);

      await fs.outputFile(logFile, text);
      resolve({ code, output: text });
    });
  });

// The staging download's facts, from a streaming read: rows, first/last timestamps, malformed sample.
export const stagingFacts = async (file: string) => {
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  let rows = 0;
  let first = '';
  let last = '';
  let malformed = 0;

  for await (const line of lines) {
    if (line.length === 0) {
      continue;
    }

    rows++;

    if (!first) {
      first = line;
    }

    last = line;

    if (rows <= 1000 && line.split(',').length !== 6) {
      malformed++;
    }
  }

  const timestampOf = (line: string) => line.split(',')[0]?.replace(/"/g, '') ?? '';
  const newYorkDate = (timestamp: string) =>
    timestamp ? new Date(timestamp).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) : '';

  return {
    rows,
    firstTimestamp: timestampOf(first),
    lastTimestamp: timestampOf(last),
    firstDate: newYorkDate(timestampOf(first)),
    lastDate: newYorkDate(timestampOf(last)),
    malformedInFirst1000: malformed
  };
};

const deleteStaging = async (
  options: IngestOptions,
  symbol: string,
  attemptLog: AttemptLog,
  purpose: 'retry' | 'cleanup'
) => {
  const file = assertStagingPath(stagingPathOf(symbol, options.dataDir), symbol, options.dataDir);
  const allowed =
    purpose === 'retry' ? mayDeleteForRetry(attemptLog, symbol) : mayDeleteAfterVerification(attemptLog, symbol);

  if (!allowed) {
    throw new Error(`refused: the attempt log does not authorize deleting ${file} (${purpose})`);
  }

  const stat = await fs.lstat(file);

  if (!stat.isFile()) {
    throw new Error(`refused: ${file} is not a regular file`);
  }

  await fs.remove(file);
};

// Moves a newly created, unverified data/<SYMBOL>/ to data/quarantine/<SYMBOL>-<time>/ with a reason file.
const quarantine = async (options: IngestOptions, symbol: string, attemptLog: AttemptLog, reason: string) => {
  const dir = assertCanonicalDir(path.join(options.dataDir, symbol), symbol, options.dataDir);

  if (!(await fs.pathExists(dir))) {
    return undefined;
  }

  if (!mayQuarantine(attemptLog, symbol)) {
    throw new Error(`refused: ${dir} existed before this attempt; it is never moved`);
  }

  const target = path.join(options.dataDir, 'quarantine', `${symbol}-${nowIso().replace(/[:.]/g, '')}`);

  await fs.mkdirp(path.dirname(target));
  await fs.rename(dir, target);
  await fs.writeJson(path.join(target, 'QUARANTINED.json'), { symbol, reason, at: nowIso() }, { spaces: 1 });

  return target;
};

const splitAudit = async (symbol: string, dataDir: string) => {
  const sessions = groupMarketSessions(await loadCsvMinuteBacktestData(symbol, canonicalDataFile(symbol, dataDir)));
  const splits = readSplits();

  return {
    unexplained: unexplainedSplitGaps(sessions, symbol, splits),
    beyond15: unexplainedSplitGaps(sessions, symbol, splits, study.eligibility.auditGapThreshold),
    registered: splits.filter((split) => split.symbol === symbol)
  };
};

export interface IngestResult {
  symbol: string;
  status: 'exists' | 'verified' | 'blocked' | 'failed';
  reason: string;
  attempts: number;
  staging?: Awaited<ReturnType<typeof stagingFacts>>;
  canonical?: { file: string; sha256: string; report: string; reportSha256: string };
  splitAudit?: Awaited<ReturnType<typeof splitAudit>>;
  quarantinedTo?: string;
}

export const ingestSymbol = async (
  symbol: string,
  options: IngestOptions = defaultOptions()
): Promise<IngestResult> => {
  if (!symbolPattern.test(symbol)) {
    throw new Error(`'${symbol}' is not a symbol`);
  }

  const canonical = canonicalDataFile(symbol, options.dataDir);
  const canonicalDir = path.join(options.dataDir, symbol);
  const staging = stagingPathOf(symbol, options.dataDir);
  const attemptLog = await readAttemptLog(options, symbol);

  if (await fs.pathExists(canonical)) {
    const last = attemptLog.attempts.at(-1);

    if (
      last?.status === 'verified' &&
      (await fs.pathExists(staging)) &&
      mayDeleteAfterVerification(attemptLog, symbol)
    ) {
      await deleteStaging(options, symbol, attemptLog, 'cleanup');
      last.status = 'cleaned';
      await writeAttemptLog(options, attemptLog);
    }

    return {
      symbol,
      status: 'exists',
      reason: `${canonical} exists (never re-ingested)`,
      attempts: attemptLog.attempts.length
    };
  }

  // A leftover directory without a canonical file: quarantine it only if our own failed attempt created it.
  if (await fs.pathExists(canonicalDir)) {
    if (!mayQuarantine(attemptLog, symbol)) {
      return {
        symbol,
        status: 'failed',
        reason: `${canonicalDir} exists without data.csv and is unexplained`,
        attempts: attemptLog.attempts.length
      };
    }

    await quarantine(options, symbol, attemptLog, 'leftover of a failed earlier attempt');
  }

  if ((await fs.pathExists(staging)) && !mayDeleteForRetry(attemptLog, symbol)) {
    return {
      symbol,
      status: 'failed',
      reason: `${staging} exists and is not this orchestrator's incomplete download`,
      attempts: attemptLog.attempts.length
    };
  }

  const secrets = options.credentials();
  const env = childEnvironment(options.env, secrets, options.dataDir);
  let downloaded = false;
  let reason = '';

  for (let attempt = 1; attempt <= study.ingestion.maxAttempts && !downloaded; attempt++) {
    if (await fs.pathExists(staging)) {
      await deleteStaging(options, symbol, attemptLog, 'retry'); // the script appends: a partial file would duplicate
    }

    const entry: Attempt = {
      number: attemptLog.attempts.length + 1,
      startedAt: nowIso(),
      status: 'downloading',
      stagingCreatedByAttempt: true,
      canonicalDirExistedBefore: await fs.pathExists(canonicalDir),
      log: path.join(options.resultsDir, 'logs', `${symbol}.attempt-${attemptLog.attempts.length + 1}.log`)
    };

    attemptLog.attempts.push(entry);
    await writeAttemptLog(options, attemptLog);

    const { code, output } = await runChild(
      'bash',
      [options.downloadScript, symbol, study.ingestion.start, study.ingestion.end],
      env,
      entry.log,
      secrets
    );

    entry.finishedAt = nowIso();

    if (code === 0 && /Download complete/.test(output)) {
      entry.status = 'downloaded';
      downloaded = true;
      await writeAttemptLog(options, attemptLog);
      break;
    }

    entry.status = 'download-failed';
    entry.failureClass = classifyFailure(output, code);
    entry.failure = output.split('\n').filter(Boolean).slice(-3).join(' | ');
    await writeAttemptLog(options, attemptLog);
    reason = `download attempt ${entry.number} failed (${entry.failureClass}): ${entry.failure}`;
    log(`${symbol}: ${reason}`);

    if (entry.failureClass === 'terminal') {
      return { symbol, status: 'failed', reason, attempts: attemptLog.attempts.length };
    }

    if (attempt < study.ingestion.maxAttempts) {
      await options.wait(study.ingestion.retryWaitsSeconds[attempt - 1] ?? 120);
    }
  }

  const entry = attemptLog.attempts.at(-1)!;

  if (!downloaded) {
    return {
      symbol,
      status: 'failed',
      reason: `no complete download in ${study.ingestion.maxAttempts} attempts: ${reason}`,
      attempts: attemptLog.attempts.length
    };
  }

  // Staging sanity (reported; a bar after the study end fails the symbol).
  const facts = await stagingFacts(staging);
  const fail = async (why: string, status: 'failed' | 'blocked' = 'failed'): Promise<IngestResult> => {
    entry.status = status === 'blocked' ? 'blocked' : 'failed';
    entry.failure = why;
    const quarantinedTo = status === 'failed' ? await quarantine(options, symbol, attemptLog, why) : undefined;

    if (quarantinedTo) {
      entry.status = 'quarantined';
    }

    await writeAttemptLog(options, attemptLog);

    return { symbol, status, reason: why, attempts: attemptLog.attempts.length, staging: facts, quarantinedTo };
  };

  if (facts.rows === 0) {
    return fail('the download is empty');
  }

  if (facts.lastDate > study.ingestion.end) {
    return fail(`the download reaches ${facts.lastDate}, after the study end ${study.ingestion.end}`);
  }

  // Import: dry run, then the real import keeping the staging file.
  for (const dryRun of [true, false]) {
    const args = ['datasets', '--', 'import', symbol, dryRun ? '--dry-run' : '--keep-source'];
    const { command, args: full } = options.npmCommand(args);
    const run = await runChild(
      command,
      full,
      { ...options.env, ...Object.fromEntries(Object.keys(secrets).map((name) => [name, ''])) },
      path.join(options.resultsDir, 'logs', `${symbol}.import${dryRun ? '-dry-run' : ''}.log`),
      secrets
    );

    if (run.code !== 0) {
      return fail(`datasets import${dryRun ? ' --dry-run' : ''} failed (exit ${run.code})`);
    }
  }

  entry.status = 'imported';
  await writeAttemptLog(options, attemptLog);

  const verify = options.npmCommand(['datasets', '--', 'verify', symbol]);
  const verified = await runChild(
    verify.command,
    verify.args,
    { ...options.env, ...Object.fromEntries(Object.keys(secrets).map((name) => [name, ''])) },
    path.join(options.resultsDir, 'logs', `${symbol}.verify.log`),
    secrets
  );
  const reportFile = path.join(canonicalDir, 'dataset-report.json');
  const report = (await fs.pathExists(reportFile))
    ? ((await fs.readJson(reportFile)) as { status: string })
    : undefined;

  if (verified.code !== 0 || report?.status !== 'verified') {
    return fail(`datasets verify did not verify ${symbol} (exit ${verified.code}, status ${report?.status})`);
  }

  const gaps = options.verifyGaps ? await splitAudit(symbol, options.dataDir) : undefined;
  const sha = async (file: string) => (await import('../portfolio-aware-d1/freeze.ts')).sha256File(file);
  const result: IngestResult = {
    symbol,
    status: 'verified',
    reason: 'imported and verified',
    attempts: attemptLog.attempts.length,
    staging: facts,
    canonical: {
      file: canonical,
      sha256: await sha(canonical),
      report: reportFile,
      reportSha256: await sha(reportFile)
    },
    splitAudit: gaps
  };

  if (gaps && gaps.unexplained.length > 0) {
    entry.status = 'blocked';
    entry.failure = `${gaps.unexplained.length} unexplained split-sized overnight move(s): register the split(s) with a source`;
    await writeAttemptLog(options, attemptLog);

    return { ...result, status: 'blocked', reason: entry.failure };
  }

  entry.status = 'verified';
  await writeAttemptLog(options, attemptLog);
  await deleteStaging(options, symbol, attemptLog, 'cleanup');
  entry.status = 'cleaned';
  await writeAttemptLog(options, attemptLog);

  return result;
};

// A blocked symbol after its split was registered: re-check the gaps, then clean up the staging file.
export const resolveBlocked = async (symbol: string, options: IngestOptions = defaultOptions()) => {
  const attemptLog = await readAttemptLog(options, symbol);
  const entry = attemptLog.attempts.at(-1);

  if (entry?.status !== 'blocked') {
    throw new Error(`${symbol} is not blocked`);
  }

  const gaps = await splitAudit(symbol, options.dataDir);

  if (gaps.unexplained.length > 0) {
    return { symbol, status: 'blocked' as const, gaps };
  }

  entry.status = 'verified';
  await writeAttemptLog(options, attemptLog);

  if (await fs.pathExists(stagingPathOf(symbol, options.dataDir))) {
    await deleteStaging(options, symbol, attemptLog, 'cleanup');
  }

  entry.status = 'cleaned';
  await writeAttemptLog(options, attemptLog);

  return { symbol, status: 'verified' as const, gaps };
};

export const runIngest = async (args: string[]) => {
  const named = args.filter((arg) => !arg.startsWith('--'));
  const symbols = named.map((symbol) => symbol.toUpperCase());

  for (const symbol of symbols) {
    if (!(candidateUniverse as readonly string[]).includes(symbol)) {
      throw new Error(`${symbol} is not in the protocol's candidate universe (PROTOCOL.md §3.2)`);
    }
  }

  const options = defaultOptions();
  const results: IngestResult[] = [];

  for (const symbol of symbols) {
    const started = Date.now();
    const result = hasFlag(args, 'resolve')
      ? await resolveBlocked(symbol, options)
      : await ingestSymbol(symbol, options);

    results.push(result as IngestResult);
    log(
      `${symbol}: ${result.status} (${((Date.now() - started) / 1000).toFixed(0)} s)${'reason' in result ? ` — ${result.reason}` : ''}`
    );
    await writeJson(
      path.join(options.resultsDir, 'results', `${symbol}${hasFlag(args, 'resolve') ? '.resolve' : ''}.json`),
      {
        at: nowIso(),
        ...result
      }
    );
  }

  return results;
};

// The ingestion orchestrator's safety rules (PROTOCOL.md §3.3), as pure functions so the tests can attack them with
// adversarial paths and dummy credentials:
//
// - the only file it may ever delete is the staging download data/<SYMBOL>.csv of the symbol in progress, and only
//   when its own attempt log records that file as created by an attempt that did not complete (or completed and was
//   then verified, for the final cleanup);
// - a newly created, unverified data/<SYMBOL>/ (the import CLI writes dataset-report.json even on a failed import) is
//   moved to data/quarantine/ — never deleted — and only when the attempt log shows it did not exist before;
// - download failures are classified retryable (429, 5xx, transport) or terminal (401/403, missing credentials);
// - credential values never reach a log: every captured line is redacted, and the child gets a minimal environment.
import path from 'node:path';

export const symbolPattern = /^[A-Z][A-Z0-9]{0,9}$/;

export const stagingPathOf = (symbol: string, dataDir = 'data') => path.join(dataDir, `${symbol}.csv`);

export type AttemptStatus =
  | 'downloading'
  | 'download-failed'
  | 'downloaded'
  | 'imported'
  | 'verified'
  | 'blocked'
  | 'cleaned'
  | 'quarantined'
  | 'failed';

export interface Attempt {
  number: number;
  startedAt: string;
  finishedAt?: string;
  status: AttemptStatus;
  failureClass?: 'retryable' | 'terminal';
  failure?: string;
  stagingCreatedByAttempt: boolean; // the staging file did not exist when this attempt started
  canonicalDirExistedBefore: boolean; // data/<SYMBOL>/ existed when this attempt started
  log: string;
}

export interface AttemptLog {
  symbol: string;
  attempts: Attempt[];
}

// Throws unless `file` is exactly the staging download of `symbol` in `dataDir`.
export const assertStagingPath = (file: string, symbol: string, dataDir = 'data') => {
  if (!symbolPattern.test(symbol)) {
    throw new Error(`'${symbol}' is not a symbol`);
  }

  const expected = path.resolve(stagingPathOf(symbol, dataDir));
  const actual = path.resolve(file);

  if (actual !== expected) {
    throw new Error(`refused: ${file} is not the staging file ${stagingPathOf(symbol, dataDir)} of ${symbol}`);
  }

  const relative = path.relative(path.resolve(dataDir), actual);

  if (relative.includes(path.sep) || relative.startsWith('..') || path.basename(actual) !== `${symbol}.csv`) {
    throw new Error(`refused: ${file} is not directly in ${dataDir}`);
  }

  return actual;
};

// The staging file may be deleted before a retry only when the latest attempt created it and did not complete.
export const mayDeleteForRetry = (attemptLog: AttemptLog, symbol: string) => {
  const last = attemptLog.attempts.at(-1);

  return (
    attemptLog.symbol === symbol &&
    last !== undefined &&
    last.stagingCreatedByAttempt &&
    (last.status === 'download-failed' || last.status === 'downloading')
  );
};

// The staging file may be deleted after the import only when the latest attempt downloaded it and both verifiers
// passed.
export const mayDeleteAfterVerification = (attemptLog: AttemptLog, symbol: string) => {
  const last = attemptLog.attempts.at(-1);

  return (
    attemptLog.symbol === symbol && last !== undefined && last.stagingCreatedByAttempt && last.status === 'verified'
  );
};

// A canonical directory may be quarantined only when the latest attempt created it (it did not exist before).
export const mayQuarantine = (attemptLog: AttemptLog, symbol: string) => {
  const last = attemptLog.attempts.at(-1);

  return attemptLog.symbol === symbol && last !== undefined && !last.canonicalDirExistedBefore;
};

export const assertCanonicalDir = (dir: string, symbol: string, dataDir = 'data') => {
  if (!symbolPattern.test(symbol) || path.resolve(dir) !== path.resolve(path.join(dataDir, symbol))) {
    throw new Error(`refused: ${dir} is not the canonical directory of ${symbol}`);
  }

  return path.resolve(dir);
};

export const classifyFailure = (output: string, exitCode: number | null): 'retryable' | 'terminal' => {
  if (/Set ALPACA_(API|SECRET)_KEY|parameter null or not set/.test(output)) {
    return 'terminal';
  }

  if (/exists; move it away first|Usage: |Dates must be/.test(output)) {
    return 'terminal'; // a refused precondition
  }

  if (/returned error: 40[13]\b|HTTP\/[\d.]+ 40[13]\b|\b40[13] (Unauthorized|Forbidden)/i.test(output)) {
    return 'terminal';
  }

  if (/returned error: (429|5\d\d)\b|HTTP\/[\d.]+ (429|5\d\d)\b/.test(output)) {
    return 'retryable';
  }

  if (
    /curl: \(\d+\)|timed out|Could not resolve|Connection (reset|refused)|SSL|Empty reply|parse error/i.test(output)
  ) {
    return 'retryable';
  }

  return exitCode === null ? 'retryable' : 'retryable';
};

export const redact = (text: string, secrets: Record<string, string | undefined>) => {
  let result = text;

  for (const [name, value] of Object.entries(secrets)) {
    if (value && value.length > 0) {
      result = result.split(value).join(`[REDACTED:${name}]`);
    }
  }

  return result;
};

// The download child's environment: PATH, HOME, LANG, the output directory and the two credentials only.
export const childEnvironment = (
  base: NodeJS.ProcessEnv,
  credentials: Record<string, string>,
  outputDir: string
): NodeJS.ProcessEnv => ({
  PATH: base.PATH ?? '/usr/bin:/bin',
  HOME: base.HOME ?? '',
  LANG: base.LANG ?? 'C',
  OUTPUT_DIR: outputDir,
  ...credentials
});

// Reads the two credential values from the environment (loaded by node --env-file-if-exists) or, failing that, from
// an .env file's lines; never logs them.
export const credentialsOf = (env: NodeJS.ProcessEnv, names: readonly string[], envFileText?: string) => {
  const found: Record<string, string> = {};

  for (const name of names) {
    let value = env[name];

    if (!value && envFileText) {
      const line = envFileText.split('\n').find((candidate) => candidate.startsWith(`${name}=`));

      value = line
        ?.slice(name.length + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
    }

    if (!value) {
      throw new Error(`${name} is not set (terminal: the download needs both Alpaca variables)`);
    }

    found[name] = value;
  }

  return found;
};

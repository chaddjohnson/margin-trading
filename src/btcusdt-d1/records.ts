// Write-once records and the freeze (PROTOCOL.md §10). A sealed record is JSON with a `bodyHash` (sha256 of the
// JSON of everything else); it refuses to be written twice and is verified before anything reads it. The freeze
// binds PROTOCOL.md and the two documents it delegates to, the procedure object, the snapshot, the chronology, the
// study's code manifest and the npm environment; every outcome stage checks them first (`assertFrozen`) and stamps
// its record with the freeze, code and procedure hashes it ran under (`outcomeStamp`).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { study } from './context.ts';

export const files = {
  protocol: path.join(study.researchDir, 'PROTOCOL.md'),
  freeze: path.join(study.researchDir, 'PROTOCOL_FREEZE.json'),
  results: path.join(study.researchDir, 'results'),
  audit: path.join(study.researchDir, 'results', 'audit', 'DATA_AUDIT.json'),
  parity: path.join(study.researchDir, 'results', 'parity', 'PARITY.json'),
  benchmark: path.join(study.researchDir, 'results', 'benchmark', 'BENCHMARK.json'),
  gate: path.join(study.researchDir, 'results', 'PROCEDURE_GATE.json')
};

export const stageFile = (stage: string, name: string) => path.join(files.results, stage, name);

export const sha256 = (value: string | Buffer | Uint8Array) => createHash('sha256').update(value).digest('hex');
export const sha256File = (file: string) => sha256(fs.readFileSync(file));

const replacer = (_key: string, value: unknown) =>
  typeof value === 'number' && !Number.isFinite(value) ? (Number.isNaN(value) ? null : String(value)) : value;

export const jsonSafe = <T>(value: T): T => JSON.parse(JSON.stringify(value, replacer)) as T;
export const hashBody = (body: unknown) => sha256(JSON.stringify(body));

export interface Sealed {
  bodyHash: string;
  [key: string]: unknown;
}

export const writeSealed = (file: string, body: Record<string, unknown>) => {
  if (fs.existsSync(file)) {
    throw new Error(`${file} exists: it is written once and never rewritten`);
  }

  const safe = jsonSafe(body);
  const sealed = { ...safe, bodyHash: hashBody(safe) };

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(sealed, null, 2)}\n`, { flag: 'wx' });

  return sealed as Sealed;
};

export const readSealed = <T = Sealed>(file: string): T & Sealed => {
  if (!fs.existsSync(file)) {
    throw new Error(`${file} does not exist`);
  }

  const sealed = JSON.parse(fs.readFileSync(file, 'utf8')) as Sealed;
  const { bodyHash, ...body } = sealed;

  if (hashBody(body) !== bodyHash) {
    throw new Error(`${file}: the body hash does not verify; the record was changed after it was written`);
  }

  return sealed as T & Sealed;
};

export const writeArchive = (file: string, rows: unknown[]) => {
  if (fs.existsSync(file)) {
    throw new Error(`${file} exists: it is written once and never rewritten`);
  }

  const text = rows.map((row) => JSON.stringify(row, replacer)).join('\n');
  const gz = zlib.gzipSync(Buffer.from(text), { level: 9 });

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, gz, { flag: 'wx' });

  return { file, sha256: sha256(gz), rows: rows.length };
};

// The study's code: every tracked or untracked file under src/btcusdt-d1 (tests included) and the two optimizer
// files it imports read-only, each with its sha256, and their digest.
export const externalCode = ['src/optimizer/rng.ts', 'src/optimizer/sobol.ts'];

export const codeManifest = () => {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'src/btcusdt-d1'], {
    encoding: 'utf8'
  })
    .split('\n')
    .filter((file) => file.endsWith('.ts'));
  const all = [...new Set([...listed, ...externalCode])].sort();
  const hashes = Object.fromEntries(all.map((file) => [file, sha256File(file)]));

  return { files: all.length, digest: sha256(JSON.stringify(hashes)), hashes };
};

export const environment = () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
    scripts: Record<string, string>;
    imports: Record<string, string>;
  };

  return {
    node: process.version,
    script: pkg.scripts['btc-d1'] ?? null,
    importsMap: JSON.stringify(pkg.imports),
    packageLockSha256: sha256File('package-lock.json')
  };
};

// Files whose changes cannot alter any sealed outcome (the CLI dispatcher and the read-only commands, report
// formatting, phenotype writing, the tests): they may change after the freeze (the guard lists them). Every other
// file of the manifest is outcome-critical and must stay byte-identical to the freeze; there is no amendment path:
// a change to it needs a new study.
export const reportOnlyFiles = [
  'src/btcusdt-d1/cli.ts',
  'src/btcusdt-d1/main.ts',
  'src/btcusdt-d1/phenotypes.ts',
  'src/btcusdt-d1/report.ts',
  'src/btcusdt-d1/tables.ts'
];

export const isReportOnly = (file: string) => reportOnlyFiles.includes(file) || file.includes('/tests/');

// The engine closure the parity record must have tested, byte for byte, for the freeze to be written.
export const engineClosure = [
  'src/btcusdt-d1/calendar.ts',
  'src/btcusdt-d1/context.ts',
  'src/btcusdt-d1/costs.ts',
  'src/btcusdt-d1/engine.ts',
  'src/btcusdt-d1/fast.ts',
  'src/btcusdt-d1/mutation.ts',
  'src/btcusdt-d1/params.ts',
  'src/btcusdt-d1/parity.ts',
  'src/btcusdt-d1/raw.ts',
  'src/btcusdt-d1/snapshot.ts',
  'src/optimizer/rng.ts'
];

export const outcomeCode = (hashes: Record<string, string>) => {
  const critical = Object.fromEntries(Object.entries(hashes).filter(([file]) => !isReportOnly(file)));

  return { files: Object.keys(critical).length, digest: sha256(JSON.stringify(critical)), hashes: critical };
};

export const boundDocuments = [
  'research/btcusdt-d1/PROTOCOL.md',
  'research/btcusdt-d1/BTC_CLOCK_AND_EXECUTION.md',
  'research/btcusdt-d1/DATA_AUDIT.md'
];

export interface Freeze extends Sealed {
  frozenAt: string;
  protocol: { file: string; sha256: string };
  documents: Record<string, string>;
  procedureHash: string;
  procedure: unknown;
  snapshot: { seriesSha256: string; rows: number; snapshotPrefixSha256: string; snapshotPrefixBytes: number };
  chronology: unknown;
  code: { files: number; digest: string; hashes: Record<string, string> };
  outcomeCode: { files: number; digest: string; hashes: Record<string, string> };
  environment: ReturnType<typeof environment>;
}

// The guard every outcome stage runs first: the freeze verifies; PROTOCOL.md, the two documents it delegates to and
// the procedure object are unchanged; the canonical series is the frozen snapshot; every outcome-critical code file
// equals the freeze; the npm script, imports map, lockfile and Node version are the frozen ones.
export const assertFrozen = (procedureObject: unknown, seriesSha256: string) => {
  const freeze = readSealed<Freeze>(files.freeze);
  const problems: string[] = [];

  for (const [file, hash] of Object.entries(freeze.documents)) {
    if (!fs.existsSync(file) || sha256File(file) !== hash) {
      problems.push(`${file} changed after the freeze`);
    }
  }

  if (hashBody(jsonSafe(procedureObject)) !== freeze.procedureHash) {
    problems.push('the procedure object (src/btcusdt-d1/protocol.ts) changed after the freeze');
  }

  if (seriesSha256 !== freeze.snapshot.seriesSha256) {
    problems.push('the canonical series is not the frozen snapshot');
  }

  const current = outcomeCode(codeManifest().hashes);

  if (current.digest !== freeze.outcomeCode.digest) {
    const changed = Object.keys({ ...current.hashes, ...freeze.outcomeCode.hashes }).filter(
      (file) => current.hashes[file] !== freeze.outcomeCode.hashes[file]
    );

    problems.push(`outcome-critical code differs from the freeze (${changed.join(', ')})`);
  }

  const env = environment();

  if (env.script !== freeze.environment.script || env.importsMap !== freeze.environment.importsMap) {
    problems.push('the btc-d1 npm script or the imports map changed after the freeze');
  }

  if (env.packageLockSha256 !== freeze.environment.packageLockSha256) {
    problems.push('package-lock.json changed after the freeze');
  }

  if (process.version !== study.node) {
    problems.push(`Node ${process.version} is not the study's ${study.node}`);
  }

  if (problems.length > 0) {
    throw new Error(`The freeze guard refuses to run:\n- ${problems.join('\n- ')}`);
  }

  return freeze;
};

// Report-only files that differ from the freeze (allowed; listed by `verify`).
export const reportOnlyChanges = (freeze: Freeze) => {
  const current = codeManifest().hashes;

  return Object.keys({ ...current, ...freeze.code.hashes }).filter(
    (file) => isReportOnly(file) && current[file] !== freeze.code.hashes[file]
  );
};

// What every outcome record states about the code and protocol it ran under.
export const outcomeStamp = (freeze: Freeze) => ({
  freezeBodyHash: freeze.bodyHash,
  outcomeCodeDigest: freeze.outcomeCode.digest,
  procedureHash: freeze.procedureHash,
  node: process.version
});

export const nowIso = () => new Date().toISOString();

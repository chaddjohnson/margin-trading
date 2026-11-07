// Write-once sealed records (Study 6's writeSealed: { ...body, bodyHash }), the study's code digest, the door log and a
// local hash chain of sealed phases (Study 8's mechanism): every phase appends one entry listing its records with their
// sha256, the door log's digest and the previous entry's hash; `verifyChain` re-hashes everything. A local integrity
// mechanism; the protocol freeze and the selection freeze are additionally committed to git before the next door opens.
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { readSealed, writeCsv, writeJsonl, writeSealed } from '../study6-b5-kre-robustness/records.ts';
import { codeDir, doorsLog, resultFile } from './context.ts';

export { readSealed, writeCsv, writeJsonl, writeSealed };

export const chainFile = resultFile('chain.jsonl');
export const nowIso = () => new Date().toISOString();
export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export const fileSha256 = async (file: string) => sha256(await fs.readFile(file));
export const git = (cmd: string) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
export const log = (line: string) =>
  console.info(`[growth-vgt-study8 ${new Date().toISOString().slice(11, 19)}Z] ${line}`);

// The decision-relevant code outside the namespace: the canonical backtester, the Strategy Lab mapping and registry,
// the Study 8 modules and the optimizer pieces the study imports, and the market events.
export const importedFiles = [
  'src/growth-trading/riseTrading.ts',
  'src/growth-trading/continuation.ts',
  'src/growth-trading/entryGates.ts',
  'src/growth-trading/optionalRules.ts',
  'src/growth-trading/drawdownGate.ts',
  'src/entry-signals/bars.ts',
  'src/entry-signals/riseFromRecentLow.ts',
  'src/multi-etf-allocator/shadow.ts',
  'src/multi-etf-allocator/engine.ts',
  'src/multi-etf-allocator/ledger.ts',
  'src/shared-margin-portfolio/strategy.ts',
  'src/four-family/data.ts',
  'src/lib/session.ts',
  'src/lib/csv.ts',
  'src/lib/calendar.ts',
  'src/lib/corporateActions.ts',
  'src/lib/evaluation.ts',
  'apps/strategy-lab/runner/trading-run.ts',
  'apps/strategy-lab/runner/growth-params.ts',
  'apps/strategy-lab/shared/params.ts',
  'apps/strategy-lab/shared/strategies.ts',
  'src/study8-expanded-regime-d1/context.ts',
  'src/study8-expanded-regime-d1/fitness.ts',
  'src/study8-expanded-regime-d1/stats.ts',
  'src/study8-expanded-regime-d1/search.ts',
  'src/study5-gdx-b5-three-etf/grid.ts',
  'src/study6-b5-kre-robustness/records.ts',
  'src/optimizer/nsga2.ts',
  'src/optimizer/rng.ts',
  'src/optimizer/sobol.ts',
  'config/market-events/splits.json',
  'data/partitions.json'
];

// Report-only code (tables built from sealed records) and the tests are outside the decision digest.
export const REPORT_ONLY = ['report.ts', 'tests/'];

export const codeDigest = async () => {
  const files = (await fs.readdir(codeDir, { recursive: true }))
    .map(String)
    .filter((name) => name.endsWith('.ts') && !REPORT_ONLY.some((prefix) => name.startsWith(prefix)))
    .sort()
    .map((name) => path.join(codeDir, name));
  const hashes: Record<string, string> = {};

  for (const file of [...files, ...importedFiles]) hashes[file] = await fileSha256(file);

  return { digest: sha256(JSON.stringify(hashes)), files: hashes };
};

// The engine digest: everything outside the namespace that decides a result (must never change during the study).
export const engineDigest = async () => {
  const hashes: Record<string, string> = {};

  for (const file of importedFiles) hashes[file] = await fileSha256(file);

  return { digest: sha256(JSON.stringify(hashes)), files: hashes };
};

export interface DoorEntry {
  at: string;
  door: string;
  purpose: string;
  dataSha256: string;
  lastDate: string;
  chainHead: string;
  head: string;
}

export const readDoors = async (): Promise<DoorEntry[]> =>
  (await fs.pathExists(doorsLog))
    ? (await fs.readFile(doorsLog, 'utf8'))
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as DoorEntry)
    : [];

export interface ChainEntry {
  seq: number;
  phase: string;
  at: string;
  head: string;
  files: { file: string; sha256: string }[];
  doors: { lines: number; sha256: string };
  previous: string;
  hash: string;
}

export const readChain = async (): Promise<ChainEntry[]> =>
  (await fs.pathExists(chainFile))
    ? (await fs.readFile(chainFile, 'utf8'))
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as ChainEntry)
    : [];

export const chainHead = async () => (await readChain()).at(-1)?.hash ?? 'genesis';
export const hasPhase = async (phase: string) => (await readChain()).some((entry) => entry.phase === phase);

export const recordDoor = async (door: string, purpose: string, dataSha256: string, lastDate: string) => {
  const entry: DoorEntry = {
    at: nowIso(),
    door,
    purpose,
    dataSha256,
    lastDate,
    chainHead: await chainHead(),
    head: git('rev-parse HEAD')
  };

  await fs.ensureDir(path.dirname(doorsLog));
  await fs.appendFile(doorsLog, `${JSON.stringify(entry)}\n`);
  return entry;
};

const doorsDigest = async () => {
  const text = (await fs.pathExists(doorsLog)) ? await fs.readFile(doorsLog, 'utf8') : '';
  const lines = text.split('\n').filter(Boolean);

  return { lines: lines.length, sha256: sha256(lines.join('\n')) };
};

export const appendChain = async (phase: string, files: string[]) => {
  const chain = await readChain();

  if (chain.some((entry) => entry.phase === phase)) throw new Error(`chain: phase ${phase} is already sealed`);

  const body = {
    seq: chain.length + 1,
    phase,
    at: nowIso(),
    head: git('rev-parse HEAD'),
    files: await Promise.all(files.map(async (file) => ({ file, sha256: await fileSha256(file) }))),
    doors: await doorsDigest(),
    previous: chain.at(-1)?.hash ?? 'genesis'
  };
  const entry: ChainEntry = { ...body, hash: sha256(JSON.stringify(body)) };

  await fs.ensureDir(path.dirname(chainFile));
  await fs.appendFile(chainFile, `${JSON.stringify(entry)}\n`);
  return entry;
};

export const verifyChain = async () => {
  const chain = await readChain();
  const problems: string[] = [];
  let previous = 'genesis';

  for (const entry of chain) {
    const { hash, ...body } = entry;

    if (body.previous !== previous) problems.push(`${entry.phase}: previous link ${body.previous} ≠ ${previous}`);
    if (sha256(JSON.stringify(body)) !== hash) problems.push(`${entry.phase}: entry hash mismatch`);

    for (const { file, sha256: expected } of entry.files) {
      if (!(await fs.pathExists(file))) problems.push(`${entry.phase}: ${file} missing`);
      else if ((await fileSha256(file)) !== expected) problems.push(`${entry.phase}: ${file} changed`);
    }

    previous = hash;
  }

  return { entries: chain.length, head: previous, problems };
};

export const requirePhase = async (phase: string) => {
  if (!(await hasPhase(phase))) throw new Error(`phase ${phase} is not sealed yet`);

  const verified = await verifyChain();

  if (verified.problems.length) throw new Error(`chain verification failed: ${verified.problems.join('; ')}`);
};

// The engine must be exactly the one pinned at the protocol freeze (results/protocol_freeze.json).
export const requireFrozenEngine = async () => {
  const freeze = (await fs.readJson(resultFile('protocol_freeze.json'))) as { engine: { digest: string } };
  const now = await engineDigest();

  if (now.digest !== freeze.engine.digest) {
    const changed = Object.entries(now.files)
      .filter(([file, hash]) => (freeze.engine as unknown as { files: Record<string, string> }).files[file] !== hash)
      .map(([file]) => file);

    throw new Error(`the engine changed since the protocol freeze: ${changed.join(', ')}`);
  }
};

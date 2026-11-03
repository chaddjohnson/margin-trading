// The local tamper-evident record (PROTOCOL.md §3): an append-only hash chain (results/chain.jsonl) and the integrity
// pins. Each chain entry holds the sha256 of every record of its phase, the door log's line count and hash at sealing,
// the previous entry's hash and its own. The pins, fixed at the protocol freeze: this namespace's code, the transitive
// import closure of shared source files plus src/lib, the training projection's 61 files and its manifest, the S0
// records, splits and partitions, and the numeric rulebook. Every stage command verifies the chain and the pins and
// fails closed on any difference; a code change after the freeze is accepted only through `acknowledge-code <ID>`
// after an AMENDMENTS.md entry `## <ID> —`. It is a local integrity mechanism, not a signature or a notarization.
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import {
  amendmentsFile,
  chainFile,
  codeDir,
  doorsLog,
  eligibility,
  execution,
  nowIso,
  periodList,
  projectionRoot,
  radius,
  resultFile,
  s0Rules,
  stresses,
  studyDir,
  trainEnd
} from './context.ts';
import { s1Families, s1Rules } from './s1.ts';
import { assignmentKeys, s2Rules } from './s2.ts';
import { complementarity, halfYearKeys, nb, nominationRules, s3Budget, s3Precision } from './s3.ts';

export const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
export const fileSha256 = async (file: string) => sha256(await fs.readFile(file));

export const freezeFile = resultFile('protocol_freeze.json');
export const reviewFile = path.join(studyDir, 'reviews', 'METHODOLOGY_REVIEW.md');

export interface ChainEntry {
  phase: string;
  at: string;
  files: Record<string, string>;
  doorLog: { lines: number; sha256: string };
  note?: string;
  prev: string;
  hash: string;
}

export const readChain = async (): Promise<ChainEntry[]> =>
  (await fs.pathExists(chainFile))
    ? (await fs.readFile(chainFile, 'utf8'))
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as ChainEntry)
    : [];

const entryHash = (entry: Omit<ChainEntry, 'hash'>) => sha256(JSON.stringify(entry));

const doorLogState = async () => {
  if (!(await fs.pathExists(doorsLog))) return { lines: 0, sha256: sha256('') };

  const text = await fs.readFile(doorsLog, 'utf8');

  return { lines: text.split('\n').filter(Boolean).length, sha256: sha256(text) };
};

export const verifyChain = async () => {
  const chain = await readChain();
  let prev = 'genesis';

  for (const entry of chain) {
    const { hash, ...rest } = entry;

    if (rest.prev !== prev) throw new Error(`chain: ${entry.phase} does not link to its predecessor`);
    if (entryHash(rest) !== hash) throw new Error(`chain: ${entry.phase} entry hash mismatch`);

    for (const [file, digest] of Object.entries(entry.files)) {
      if (!(await fs.pathExists(file)) || (await fileSha256(file)) !== digest) {
        throw new Error(`chain: ${file} (sealed in ${entry.phase}) is missing or changed`);
      }
    }

    prev = hash;
  }

  if (chain.length) {
    const text = (await fs.pathExists(doorsLog)) ? await fs.readFile(doorsLog, 'utf8') : '';
    const lines = text.split('\n').filter(Boolean);

    for (const entry of chain) {
      const prefix = lines
        .slice(0, entry.doorLog.lines)
        .map((l) => `${l}\n`)
        .join('');

      if (sha256(prefix) !== entry.doorLog.sha256)
        throw new Error(`chain: the door log was altered before ${entry.phase}`);
    }
  }

  return chain;
};

export const appendPhase = async (phase: string, files: readonly string[], note?: string) => {
  const chain = await verifyChain();

  if (chain.some((e) => e.phase === phase)) throw new Error(`chain: phase ${phase} is already sealed`);

  const digests: Record<string, string> = {};

  for (const file of [...files].sort()) digests[file] = await fileSha256(file);

  const body: Omit<ChainEntry, 'hash'> = {
    phase,
    at: nowIso(),
    files: digests,
    doorLog: await doorLogState(),
    ...(note ? { note } : {}),
    prev: chain.at(-1)?.hash ?? 'genesis'
  };
  const entry: ChainEntry = { ...body, hash: entryHash(body) };

  await fs.appendFile(chainFile, `${JSON.stringify(entry)}\n`);

  return entry;
};

// Every door-log line must end on or before 2024-12-31 on the training projection (review m15), and only door.ts and
// parity.ts may call the repository loader directly.
export const verifyDoorLog = async () => {
  const text = (await fs.pathExists(doorsLog)) ? await fs.readFile(doorsLog, 'utf8') : '';
  const lines = text
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { end: string; root: string; lastDate: string });
  const bad = lines.filter(
    (l) =>
      !(l.end <= trainEnd) || !(l.lastDate <= trainEnd) || path.normalize(l.root) !== path.normalize(projectionRoot)
  );

  if (bad.length) throw new Error(`door log: ${bad.length} opening(s) outside the training projection door`);

  const callers: string[] = [];
  const loaderCall = new RegExp(['load', 'NUniverse', '\\s*\\(\\s*\\{'].join(''));

  for (const file of (await fs.readdir(codeDir)).filter((f) => f.endsWith('.ts'))) {
    // the call pattern is assembled from parts so that this file does not match itself (amendment E1)
    if (loaderCall.test(await fs.readFile(path.join(codeDir, file), 'utf8'))) callers.push(file);
  }

  if (callers.some((f) => !['door.ts', 'parity.ts'].includes(f)))
    throw new Error(`loader called outside door.ts/parity.ts: ${callers.join(', ')}`);

  return { lines: lines.length, callers };
};

export const hasPhase = async (phase: string) => (await readChain()).some((e) => e.phase === phase);

// ----- integrity pins -----

export const importClosure = async () => {
  const seen = new Set<string>();
  const queue = (await fs.readdir(codeDir, { recursive: true }))
    .map(String)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => path.join(codeDir, name));
  const specifier = /(?:from\s+|import\s*\(\s*)'(\.{1,2}\/[^']+)'/g;

  for (const file of queue) seen.add(file);

  while (queue.length) {
    const file = queue.shift()!;
    const text = await fs.readFile(file, 'utf8');

    for (const match of text.matchAll(specifier)) {
      const target = path.normalize(path.join(path.dirname(file), match[1]!));

      if (!target.endsWith('.ts') || seen.has(target)) continue;
      if (!(await fs.pathExists(target)))
        throw new Error(`import closure: ${file} imports ${target}, which is missing`);

      seen.add(target);
      queue.push(target);
    }
  }

  const lib = (await fs.readdir('src/lib')).filter((f) => f.endsWith('.ts')).map((f) => path.join('src/lib', f));
  // the study's scripts (table builder, S0 and S1 drivers) and package.json are pinned with the code (review M9d)
  const scripts = (await fs.readdir(path.join(studyDir, 'scripts')))
    .filter((f) => /\.(py|sh)$/.test(f))
    .map((f) => path.join(studyDir, 'scripts', f));

  return [...new Set([...seen, ...lib, ...scripts, 'package.json'])].sort();
};

// The numeric rulebook (review M9e): execution, eligibility, radius, stresses, periods, and every stage's budgets,
// neighbourhood families, rules, assignments and nomination rules. A change has no acknowledgement path.
export const constantsSnapshot = () => ({
  execution,
  eligibility,
  radius,
  stresses,
  periodList,
  s0Rules,
  s1: { families: s1Families, rules: s1Rules },
  s2: { rules: s2Rules, assignments: assignmentKeys },
  s3: { budget: s3Budget, precision: s3Precision, nb, complementarity, nominationRules, halfYearKeys }
});

export const pins = async () => {
  const code = Object.fromEntries(
    await Promise.all((await importClosure()).map(async (f) => [f, await fileSha256(f)] as const))
  );
  const projection = (await fs.readJson(resultFile('s0', 'projection.json'))) as {
    files: Record<string, { sha256: string }>;
  };
  const data: Record<string, string> = {};

  for (const symbol of Object.keys(projection.files).sort()) {
    data[path.join(projectionRoot, symbol, 'data.csv')] = await fileSha256(
      path.join(projectionRoot, symbol, 'data.csv')
    );
  }

  for (const file of [
    path.join(projectionRoot, 'partitions.json'),
    'config/market-events/splits.json',
    resultFile('s0', 'projection.json'),
    resultFile('s0', 'symbols.json')
  ]) {
    data[file] = await fileSha256(file);
  }

  return {
    code,
    codeDigest: sha256(JSON.stringify(code)),
    data,
    dataDigest: sha256(JSON.stringify(data)),
    constantsDigest: sha256(JSON.stringify(constantsSnapshot()))
  };
};

type Pins = Awaited<ReturnType<typeof pins>>;

// The pins that currently apply: the freeze's, or the latest acknowledged code amendment's code digest.
const acceptedPins = async (): Promise<{ codeDigest: string; dataDigest: string; constantsDigest: string }> => {
  const freeze = (await fs.readJson(freezeFile)) as { pins: Pins };
  const chain = await readChain();
  const codeEntries = chain.filter((e) => e.phase.startsWith('code-'));
  let codeDigest = freeze.pins.codeDigest;

  if (codeEntries.length) {
    const last = codeEntries.at(-1)!;
    const record = Object.keys(last.files).find((f) => f.endsWith('.json') && f.includes('/freeze/code-'))!;

    codeDigest = ((await fs.readJson(record)) as { codeDigest: string }).codeDigest;
  }

  return { codeDigest, dataDigest: freeze.pins.dataDigest, constantsDigest: freeze.pins.constantsDigest };
};

export const requireIntegrity = async (where: string) => {
  await verifyChain();
  await verifyDoorLog(); // every stage fails closed on a door-log or loader-caller violation (review N8)

  if (!(await hasPhase('protocol'))) throw new Error(`${where}: the protocol is not frozen`);

  const accepted = await acceptedPins();
  const live = await pins();

  if (live.dataDigest !== accepted.dataDigest)
    throw new Error(`${where}: the data pins changed (the study stops; no acknowledgement path)`);
  if (live.constantsDigest !== accepted.constantsDigest) throw new Error(`${where}: the numeric rulebook changed`);
  if (live.codeDigest !== accepted.codeDigest) {
    const changed = Object.keys(live.code).filter((f) => {
      const freeze = fs.readJsonSync(freezeFile) as { pins: Pins };

      return freeze.pins.code[f] !== live.code[f];
    });

    throw new Error(
      `${where}: the code changed since the accepted digest (${changed.slice(0, 6).join(', ')}); write an AMENDMENTS.md entry and run acknowledge-code <ID>`
    );
  }

  return live;
};

export const requirePhase = async (phase: string, where: string) => {
  if (!(await hasPhase(phase))) throw new Error(`${where}: phase ${phase} is not sealed`);
};

export const refusePhase = async (phase: string, where: string) => {
  if (await hasPhase(phase)) throw new Error(`${where}: phase ${phase} is already sealed; this stage does not rerun`);
};

const tarball = (file: string, files: readonly string[]) => {
  fs.ensureDirSync(path.dirname(file));
  execSync(`tar -czf ${JSON.stringify(file)} ${files.map((f) => JSON.stringify(f)).join(' ')}`);
};

export const freezeProtocol = async () => {
  if (await fs.pathExists(freezeFile)) throw new Error('the protocol is already frozen');
  if (!(await fs.pathExists(reviewFile)))
    throw new Error(`${reviewFile} is missing: the methodology review precedes the freeze`);

  const live = await pins();
  const freezeDir = resultFile('freeze');
  const amendmentsSnapshot = path.join(freezeDir, 'AMENDMENTS-protocol.md');
  const codeTar = path.join(freezeDir, 'code-protocol.tar.gz');

  await fs.ensureDir(freezeDir);
  await fs.copyFile(amendmentsFile, amendmentsSnapshot);
  tarball(codeTar, Object.keys(live.code));

  const git = (cmd: string) => execSync(cmd, { encoding: 'utf8' }).trim();
  const record = {
    stage: 'protocol',
    at: nowIso(),
    protocolSha256: await fileSha256(path.join(studyDir, 'PROTOCOL.md')),
    reviewSha256: await fileSha256(reviewFile),
    git: {
      branch: git('git rev-parse --abbrev-ref HEAD'),
      head: git('git rev-parse HEAD'),
      status: git('git status --short')
    },
    node: process.version,
    pins: live,
    constants: constantsSnapshot()
  };

  await fs.outputJson(freezeFile, record, { spaces: 1 });

  const reviewDir = path.join(studyDir, 'reviews');
  const reviews = (await fs.readdir(reviewDir)).filter((f) => f.endsWith('.md')).map((f) => path.join(reviewDir, f));

  return appendPhase('protocol', [
    path.join(studyDir, 'PROTOCOL.md'),
    path.join(studyDir, 'brief', 'ASSIGNMENT.md'),
    freezeFile,
    amendmentsSnapshot,
    codeTar,
    ...reviews,
    resultFile('s0', 'symbols.json'),
    resultFile('s0', 'projection.json'),
    resultFile('s0', 'inventory-pre-refresh.json'),
    resultFile('s0', 'inventory-post-refresh.json'),
    resultFile('pilot', 'pilot.json')
  ]);
};

export const acknowledgeCode = async (id: string) => {
  const text = await fs.readFile(amendmentsFile, 'utf8');

  if (!text.includes(`## ${id} —`)) throw new Error(`AMENDMENTS.md has no entry "## ${id} —"`);

  const frozen = await fs.readFile(resultFile('freeze', 'AMENDMENTS-protocol.md'), 'utf8');

  // an entry that existed at the freeze cannot acknowledge later code (review M9c)
  if (frozen.includes(`## ${id} —`)) throw new Error(`${id} is a pre-freeze entry; write a new AMENDMENTS.md entry`);

  const live = await pins();
  const dir = resultFile('freeze');
  const record = path.join(dir, `code-${id}.json`);
  const snapshot = path.join(dir, `AMENDMENTS-${id}.md`);
  const tar = path.join(dir, `code-${id}.tar.gz`);

  await fs.copyFile(amendmentsFile, snapshot);
  tarball(tar, Object.keys(live.code));
  await fs.outputJson(record, { id, at: nowIso(), codeDigest: live.codeDigest, code: live.code }, { spaces: 1 });

  return appendPhase(`code-${id}`, [record, snapshot, tar]);
};

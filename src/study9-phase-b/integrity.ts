// Integrity pins (PROTOCOL.md §2.3; Study 8's integrity.ts mechanism). The freeze records: the code digest of this
// namespace; the sha256 of every repository source file it imports, transitively, and of the study scripts; the data
// pins (the 13 training-projection files in full, the projection's partitions.json, the splits, and each canonical
// file's byte prefix through the last 2026-10-30 bar); and the numeric rulebook (context.ts constantsSnapshot). After
// the freeze every door and stage calls requireIntegrity(), which fails closed on any difference. A code change is
// accepted only after `acknowledge-code <ID>` (an AMENDMENTS.md entry first). Data and the rulebook have no
// acknowledgement path. Appending sessions after 2026-10-30 to a canonical file leaves its pinned prefix intact (the
// later bytes are reported, never silently used).
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import {
  allSymbols,
  amendmentsFile,
  canonicalRoot,
  codeDir,
  constantsSnapshot,
  freezeDir,
  projectionRoot,
  protocolFreezeFile,
  resultFile,
  sliceDate,
  studyDir
} from './context.ts';
import { sourceClosure } from './closure.ts';
import { appendPhase, codeDigest, fileSha256, readChain, readSealed, sha256, writeSealed } from './records.ts';

export const scriptsDir = path.join(studyDir, 'scripts');

// Every repository source file the namespace imports, transitively, including `#lib`/`#types` (closure.ts; review M1).
export const importClosure = async () =>
  sourceClosure(
    (await fs.readdir(codeDir, { recursive: true }))
      .map(String)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => path.join(codeDir, name))
  );

export const engineDigest = async () => {
  const { engineFiles: pointEngineFiles } = await import('./engine.ts');
  const closure = [...new Set([...(await importClosure()), ...pointEngineFiles(), 'package-lock.json'])].filter(
    (file) => !file.startsWith(`${codeDir}/`)
  );
  const scripts = (await fs.pathExists(scriptsDir))
    ? (await fs.readdir(scriptsDir)).filter((f) => !f.startsWith('.')).map((f) => path.join(scriptsDir, f))
    : [];
  const files: Record<string, string> = {};

  for (const file of [...closure, ...scripts].sort()) files[file] = await fileSha256(file);

  return { digest: sha256(JSON.stringify(files)), files };
};

// The byte length of a file's prefix through the last row of New York date `end` (Phase A's s0 prefix rule).
export const prefixOf = async (file: string, end: string) => {
  const { prefixLengthThrough } = await import('../study9-etf-pool-discovery/s0.ts');
  const bytes = await fs.readFile(file);
  const cut = prefixLengthThrough(bytes, end);

  return {
    bytes: cut.bytes,
    sha256: sha256(bytes.subarray(0, cut.bytes)),
    fileBytes: bytes.length,
    nextDate: cut.nextDate
  };
};

export interface DataPins {
  projection: Record<string, string>; // full-file sha256 of each projection file (physically ends 2024-12-31)
  projectionPartitions: string;
  splits: string;
  canonical: Record<string, { bytes: number; sha256: string }>; // prefix through the last 2026-10-30 bar
}

export const dataPinsNow = async (): Promise<DataPins> => {
  const projection: Record<string, string> = {};
  const canonical: DataPins['canonical'] = {};

  for (const symbol of allSymbols) {
    projection[symbol] = await fileSha256(path.join(projectionRoot, symbol, 'data.csv'));

    const prefix = await prefixOf(path.join(canonicalRoot, symbol, 'data.csv'), sliceDate);

    canonical[symbol] = { bytes: prefix.bytes, sha256: prefix.sha256 };
  }

  return {
    projection,
    projectionPartitions: await fileSha256(path.join(projectionRoot, 'partitions.json')),
    splits: await fileSha256('config/market-events/splits.json'),
    canonical
  };
};

// Checks pinned data without rescanning rows: each canonical file's pinned prefix is re-hashed at its pinned length.
export const checkDataPins = async (pins: DataPins, { canonical }: { canonical: boolean }) => {
  const problems: string[] = [];
  const laterBytes: Record<string, number> = {};

  for (const [symbol, value] of Object.entries(pins.projection)) {
    const actual = await fileSha256(path.join(projectionRoot, symbol, 'data.csv'));

    if (actual !== value) problems.push(`projection ${symbol} ${actual.slice(0, 12)} ≠ ${value.slice(0, 12)}`);
  }

  if ((await fileSha256(path.join(projectionRoot, 'partitions.json'))) !== pins.projectionPartitions)
    problems.push('projection partitions.json');
  if ((await fileSha256('config/market-events/splits.json')) !== pins.splits) problems.push('splits.json');

  if (canonical) {
    for (const [symbol, value] of Object.entries(pins.canonical)) {
      const bytes = await fs.readFile(path.join(canonicalRoot, symbol, 'data.csv'));

      if (bytes.length < value.bytes || sha256(bytes.subarray(0, value.bytes)) !== value.sha256)
        problems.push(`canonical ${symbol} prefix through ${sliceDate}`);
      if (bytes.length > value.bytes) laterBytes[symbol] = bytes.length - value.bytes;
    }
  }

  return { problems, laterBytes };
};

export const constantsDigest = () => sha256(JSON.stringify(constantsSnapshot()));

export const snapshot = async () => ({
  code: await codeDigest(),
  engine: await engineDigest(),
  data: await dataPinsNow(),
  constants: { sha256: constantsDigest(), values: constantsSnapshot() }
});

export type Snapshot = Awaited<ReturnType<typeof snapshot>>;

// A deterministic tarball of the code that decides the study (this namespace and the study scripts).
export const writeCodeTarball = (file: string) => {
  fs.ensureDirSync(path.dirname(file));
  execSync(
    `tar --sort=name --mtime='2026-01-01 00:00:00Z' --owner=0 --group=0 --numeric-owner -cf - ${codeDir} ${scriptsDir} | gzip -n -9 > ${file}`,
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );
};

interface Frozen {
  integrity: Snapshot;
}

const acceptedCode = async (frozen: Frozen) => {
  const accepted = [{ code: frozen.integrity.code.digest, engine: frozen.integrity.engine.digest, by: 'freeze' }];

  for (const entry of await readChain()) {
    if (!entry.phase.startsWith('code-')) continue;

    const ack = await readSealed<{ code: string; engine: string; amendment: string }>(
      resultFile('freeze', `${entry.phase}.json`)
    );

    accepted.push({ code: ack.code, engine: ack.engine, by: ack.amendment });
  }

  return accepted;
};

// `canonical`: also re-check the canonical prefixes (the F24 test door, the post-test stages and verify-chain).
export const requireIntegrity = async (where: string, { canonical = false }: { canonical?: boolean } = {}) => {
  if (!(await fs.pathExists(protocolFreezeFile))) return undefined; // before the freeze (pilot, smoke)

  const frozen = await readSealed<Frozen>(protocolFreezeFile);
  const data = await checkDataPins(frozen.integrity.data, { canonical });

  if (data.problems.length)
    throw new Error(`integrity (${where}): pinned data changed (${data.problems.join('; ')}); the study stops`);

  if (constantsDigest() !== frozen.integrity.constants.sha256)
    throw new Error(
      `integrity (${where}): the numeric rulebook (context.ts) differs from the frozen one; the study stops`
    );

  const code = (await codeDigest()).digest;
  const engine = (await engineDigest()).digest;
  const match = (await acceptedCode(frozen)).find((item) => item.code === code && item.engine === engine);

  if (!match) {
    throw new Error(
      `integrity (${where}): code ${code.slice(0, 12)} / engine ${engine.slice(0, 12)} is neither the frozen digest nor acknowledged (acknowledge-code <ID>)`
    );
  }

  return { code, engine, acceptedBy: match.by, laterBytes: data.laterBytes };
};

export const acknowledgeCode = async (id: string) => {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(id)) throw new Error('acknowledge-code needs an amendment ID such as E1');

  const text = await fs.readFile(amendmentsFile, 'utf8');

  if (!text.includes(`\n## ${id} — `)) throw new Error(`${amendmentsFile} has no entry "## ${id} — …"; write it first`);

  const frozen = await readSealed<{ amendments: { sha256: string } }>(protocolFreezeFile);
  const atFreeze = await fs.readFile(path.join(freezeDir, 'AMENDMENTS-protocol.md'), 'utf8');

  void frozen;
  if (atFreeze.includes(`\n## ${id} — `))
    throw new Error(`amendment ${id} predates the freeze; it cannot acknowledge code`);

  const phase = `code-${id}`;
  const tarball = path.join(freezeDir, `${phase}.tar.gz`);
  const amendments = path.join(freezeDir, `AMENDMENTS-${phase}.md`);
  const record = path.join(freezeDir, `${phase}.json`);

  if (await fs.pathExists(record)) throw new Error(`${record} exists (sealed)`);

  writeCodeTarball(tarball);
  await fs.copy(amendmentsFile, amendments);

  const code = await codeDigest();
  const engine = await engineDigest();

  await writeSealed(record, {
    stage: 'CODE_ACKNOWLEDGEMENT',
    amendment: id,
    code: code.digest,
    engine: engine.digest,
    codeFiles: code.files,
    engineFiles: engine.files,
    tarball: { file: tarball, sha256: await fileSha256(tarball) }
  });

  return appendPhase(phase, [record, tarball, amendments]);
};

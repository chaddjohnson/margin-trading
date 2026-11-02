// Integrity pins (PROTOCOL.md §2.3, review M1/M2). The freeze records the code digest of this namespace, the hashes of
// the shared engine files and of every shared source file the namespace imports (transitively), the full-file sha256 of the five market-data files, the splits, partitions and
// distribution files, and the numeric rulebook (context.ts constantsSnapshot), and stores a tarball of the code. After
// the freeze every door and every stage command calls requireIntegrity(), which fails closed when any of them differs
// from the frozen value. A code change after the freeze is accepted only once acknowledged by `acknowledge-code <ID>`:
// that appends a chain phase `code-<ID>` holding the new digests, a tarball and a snapshot of AMENDMENTS.md (which must
// already contain the entry `## <ID> —`). Data and constants have no acknowledgement path: a change stops the study.
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { bookOrder, codeDir, constantsSnapshot, protocolFreezeFile, resultFile, studyDir } from './context.ts';
import { appendPhase, codeDigest, fileSha256, readChain, readSealed } from './records.ts';
import { sha256 } from '../study5-gdx-b5-three-etf/data.ts';

export const freezeDir = resultFile('freeze');
export const amendmentsFile = `${studyDir}/AMENDMENTS.md`;
export const reviewFile = `${studyDir}/reviews/METHODOLOGY_REVIEW.md`;
export const verificationFile = `${studyDir}/reviews/METHODOLOGY_REVIEW_VERIFICATION.md`;

export const pinnedFiles = () => ({
  ...Object.fromEntries(bookOrder.map((symbol) => [`data/${symbol}/data.csv`, `data/${symbol}/data.csv`])),
  'data/partitions.json': 'data/partitions.json',
  'config/market-events/splits.json': 'config/market-events/splits.json',
  'config/market-events/distributions.csv': 'config/market-events/distributions.csv',
  'config/market-events/distributions.manifest.json': 'config/market-events/distributions.manifest.json'
});

// Every repository source file the study's code imports, transitively (static `from '…'` and dynamic `import('…')`
// specifiers that are relative paths), outside this namespace: the shared engine, designs, statistics, optimizer and
// loaders that decide the study's records (review M1). Resolved from the namespace's own files at call time.
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
        throw new Error(`import closure: ${file} imports ${target}, which does not exist`);

      seen.add(target);
      queue.push(target);
    }
  }

  return [...seen].filter((file) => !file.startsWith(`${codeDir}/`)).sort();
};

export const engineDigest = async () => {
  const { engineFiles } = await import('./evaluate.ts');
  const files: Record<string, string> = {};

  for (const file of [...new Set([...engineFiles, ...(await importClosure())])].sort())
    files[file] = await fileSha256(file);

  return { digest: sha256(JSON.stringify(files)), files };
};

export const dataDigest = async () => {
  const files: Record<string, string> = {};

  for (const file of Object.keys(pinnedFiles())) files[file] = await fileSha256(file);

  return files;
};

export const constantsDigest = () => sha256(JSON.stringify(constantsSnapshot()));

export const snapshot = async () => ({
  code: await codeDigest(),
  engine: await engineDigest(),
  data: await dataDigest(),
  constants: { sha256: constantsDigest(), values: constantsSnapshot() }
});

export type Snapshot = Awaited<ReturnType<typeof snapshot>>;

// A deterministic tarball of the code that decides the study (this namespace, package.json, the study scripts).
export const writeCodeTarball = (file: string) => {
  fs.ensureDirSync(freezeDir);
  execSync(
    `tar --sort=name --mtime='2026-01-01 00:00:00Z' --owner=0 --group=0 --numeric-owner -cf - ${codeDir} package.json ${studyDir}/scripts | gzip -n -9 > ${file}`,
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );
};

interface Frozen {
  integrity: Snapshot;
}

// The code digests accepted after the freeze: the frozen one plus every acknowledged one.
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

export const requireIntegrity = async (where: string) => {
  if (!(await fs.pathExists(protocolFreezeFile))) return undefined; // before the freeze (the timing pilot only)

  const frozen = await readSealed<Frozen>(protocolFreezeFile);
  const data = await dataDigest();

  for (const [file, value] of Object.entries(frozen.integrity.data)) {
    if (data[file] !== value)
      throw new Error(
        `integrity (${where}): ${file} changed since the freeze (${data[file]?.slice(0, 12)} ≠ ${value.slice(0, 12)}); the study stops`
      );
  }

  if (constantsDigest() !== frozen.integrity.constants.sha256) {
    throw new Error(
      `integrity (${where}): the numeric rulebook (context.ts) differs from the frozen one; the study stops`
    );
  }

  const code = (await codeDigest()).digest;
  const engine = (await engineDigest()).digest;
  const accepted = await acceptedCode(frozen);
  const match = accepted.find((item) => item.code === code && item.engine === engine);

  if (!match) {
    throw new Error(
      `integrity (${where}): the code digest ${code.slice(0, 12)} / engine ${engine.slice(0, 12)} is neither the frozen one nor acknowledged by an amendment (acknowledge-code <ID>)`
    );
  }

  return { code, engine, acceptedBy: match.by };
};

export const acknowledgeCode = async (id: string) => {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(id)) throw new Error('acknowledge-code needs an amendment ID such as E3');

  const text = await fs.readFile(amendmentsFile, 'utf8');

  if (!text.includes(`\n## ${id} — `))
    throw new Error(`${amendmentsFile} has no entry "## ${id} — …"; write the amendment first`);

  const { writeSealed } = await import('./records.ts');
  const phase = `code-${id}`;
  const tarball = resultFile('freeze', `${phase}.tar.gz`);
  const amendments = resultFile('freeze', `AMENDMENTS-${phase}.md`);
  const record = resultFile('freeze', `${phase}.json`);

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

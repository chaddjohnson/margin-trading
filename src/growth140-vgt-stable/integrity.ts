// Integrity (PROTOCOL.md §9): the code closure of this namespace (every repository .ts file it imports, transitively —
// the completed study's modules, the Growth engine, the Strategy Lab mapping, the optimizer, the loaders), the door and
// data pins, the protocol freeze, the door log and the seal log. Every stage verifies the pins and fails closed.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { importClosure } from '../growth140-vgt-s8m/integrity.ts';
import { sha256 } from './checkpoint.ts';
import { STUDY, cacheRoot, canonical, codeDir, doorPinsFile, repoRoot, researchDir, resultsDir } from './context.ts';

export const protocolFile = path.join(researchDir, 'PROTOCOL.md');
export const amendmentsFile = path.join(researchDir, 'AMENDMENTS.md');
export const briefFile = path.join(researchDir, 'brief', 'BRIEF.md');
export const freezeFile = path.join(resultsDir, 'protocol_freeze.json');
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const sealLog = path.join(resultsDir, 'seals.jsonl');
export const codeAckFile = path.join(resultsDir, 'code_acks.jsonl');

export const fileSha = (file: string) => sha256(fs.readFileSync(file));
export const git = (...a: string[]) => execFileSync('git', a, { cwd: repoRoot, encoding: 'utf8' }).trim();

export const studyEntries = () =>
  fs
    .readdirSync(codeDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => path.join(codeDir, f));

export const codeManifest = () => {
  const files = importClosure(studyEntries());
  const entries = files.map((f) => [f, sha256(fs.readFileSync(path.join(repoRoot, f)))] as const);
  const digest = (list: readonly (readonly [string, string])[]) => sha256(list.map(([f, h]) => `${f}:${h}`).join('\n'));

  return {
    files: Object.fromEntries(entries),
    studyDigest: digest(entries.filter(([f]) => f.startsWith(`src/${STUDY}/`))),
    closureDigest: digest(entries),
    engineDigest: digest(entries.filter(([f]) => !f.startsWith(`src/${STUDY}/`)))
  };
};

export const dataPins = () => ({
  canonicalSha256: canonical.sha256,
  doorPinsSha256: fileSha(doorPinsFile),
  partitionsSha256: fileSha(canonical.partitionsFile),
  splitsSha256: fileSha(canonical.splitsFile)
});

export interface Freeze {
  study: string;
  frozenAt: string;
  protocolSha256: string;
  amendmentsSha256AtFreeze: string;
  briefSha256: string;
  code: ReturnType<typeof codeManifest>;
  data: Record<string, string>;
  git: { head: string; branch: string };
}

export const readFreeze = (): Freeze | null =>
  fs.existsSync(freezeFile) ? (JSON.parse(fs.readFileSync(freezeFile, 'utf8')) as Freeze) : null;

const jsonl = (file: string): Record<string, any>[] =>
  fs.existsSync(file)
    ? fs
        .readFileSync(file, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];

export const codeAcks = () => jsonl(codeAckFile) as { id: string; closureDigest: string; at: string }[];
export const doorEntries = () => jsonl(doorLog);
export const seals = () => jsonl(sealLog);

// The pins every stage verifies: PROTOCOL.md unchanged since the freeze, the data pins, the code closure equal to the
// freeze's or to an acknowledged amendment's.
export const verifyPins = (options: { allowUnfrozen?: boolean } = {}) => {
  const freeze = readFreeze();

  if (!freeze) {
    if (options.allowUnfrozen)
      return { frozen: false as const, pins: { protocol: 'unfrozen' } as Record<string, string> };
    throw new Error('the protocol is not frozen');
  }

  const protocolSha = fileSha(protocolFile);

  if (protocolSha !== freeze.protocolSha256) throw new Error(`PROTOCOL.md changed after the freeze (${protocolSha})`);

  const d = dataPins();

  for (const [k, v] of Object.entries(freeze.data))
    if (d[k as keyof typeof d] !== v) throw new Error(`data pin ${k} changed`);

  const code = codeManifest();
  const accepted = [freeze.code.closureDigest, ...codeAcks().map((a) => a.closureDigest)];

  if (!accepted.includes(code.closureDigest))
    throw new Error(
      `code closure ${code.closureDigest.slice(0, 16)} differs from the freeze and every acknowledged amendment; record an amendment and run acknowledge-code`
    );

  return {
    frozen: true as const,
    pins: {
      protocol: freeze.protocolSha256,
      code: code.closureDigest,
      engine: code.engineDigest,
      doors: d.doorPinsSha256
    } as Record<string, string>
  };
};

export const logDoor = (entry: Record<string, unknown>) => {
  fs.mkdirSync(path.dirname(doorLog), { recursive: true });
  fs.appendFileSync(doorLog, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
};

// A sealed output: written once, read-only, its sha256 appended to the seal log. A second write is refused.
export const seal = (file: string, value: unknown, stage: string) => {
  if (fs.existsSync(file)) throw new Error(`${file} is sealed`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 1)}\n`);
  fs.renameSync(`${file}.tmp`, file);
  fs.chmodSync(file, 0o444);

  const sha = fileSha(file);

  if (file.startsWith(cacheRoot)) return sha; // pilot outputs (engineering) never enter the study's seal log
  fs.appendFileSync(
    sealLog,
    `${JSON.stringify({ at: new Date().toISOString(), stage, file: path.relative(repoRoot, file), sha256: sha })}\n`
  );
  return sha;
};

export const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`);
};

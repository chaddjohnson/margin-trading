// Integrity pins (PROTOCOL.md §9): the code digest of the study namespace and of every repository source file it
// imports, transitively (the Growth engine, the Strategy Lab mapping, the optimizer, loaders); the data pins; the
// protocol freeze record; the door log. Every stage verifies them and fails closed.
import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from './checkpoint.ts';
import { STUDY, codeDir, data, repoRoot, researchDir, resultsDir } from './context.ts';

const importRe = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const resolveImport = (from: string, spec: string) => {
  if (spec === '#lib') return path.join(repoRoot, 'src/lib/index.ts');
  if (spec === '#types') return path.join(repoRoot, 'src/types/index.ts');
  if (!spec.startsWith('.')) return null; // node: built-ins and packages

  return path.resolve(path.dirname(from), spec);
};

// Every .ts file reachable from the entry points (tests excluded), relative to the repository root.
export const importClosure = (entries: readonly string[]) => {
  const seen = new Set<string>();
  const stack = [...entries];

  while (stack.length) {
    const file = stack.pop()!;

    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);

    const text = fs.readFileSync(file, 'utf8');

    for (const m of text.matchAll(importRe)) {
      const target = resolveImport(file, m[1] ?? m[2]!);

      if (target && target.endsWith('.ts') && !target.includes('/tests/')) stack.push(target);
    }
  }

  return [...seen].map((f) => path.relative(repoRoot, f)).sort();
};

export const studyEntries = () =>
  fs
    .readdirSync(codeDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => path.join(codeDir, f));

export const codeManifest = () => {
  const files = importClosure(studyEntries());
  const entries = files.map((f) => [f, sha256(fs.readFileSync(path.join(repoRoot, f)))] as const);

  return {
    files: Object.fromEntries(entries),
    studyDigest: sha256(
      entries
        .filter(([f]) => f.startsWith(`src/${STUDY}/`))
        .map(([f, h]) => `${f}:${h}`)
        .join('\n')
    ),
    closureDigest: sha256(entries.map(([f, h]) => `${f}:${h}`).join('\n')),
    engineDigest: sha256(
      entries
        .filter(([f]) => !f.startsWith(`src/${STUDY}/`))
        .map(([f, h]) => `${f}:${h}`)
        .join('\n')
    )
  };
};

export const protocolFile = path.join(researchDir, 'PROTOCOL.md');
export const amendmentsFile = path.join(researchDir, 'AMENDMENTS.md');
export const freezeFile = path.join(resultsDir, 'protocol_freeze.json');
export const doorLog = path.join(resultsDir, 'doors.jsonl');

export const fileSha = (file: string) => sha256(fs.readFileSync(file));

export const dataPins = () => ({
  devSha256: data.devSha256,
  partitionsSha256: fileSha(data.partitionsFile),
  splitsSha256: fileSha(data.splitsFile)
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

export const codeAckFile = path.join(resultsDir, 'code_acks.jsonl');

export const codeAcks = (): { id: string; closureDigest: string; at: string }[] =>
  fs.existsSync(codeAckFile)
    ? fs
        .readFileSync(codeAckFile, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];

// The pins every stage verifies: the frozen protocol unchanged, the amendment log append-only from its frozen state,
// the data pins, and the code closure equal to the freeze or to the last acknowledged amendment's (`codeAck`).
export const verifyPins = (options: { allowUnfrozen?: boolean } = {}) => {
  const freeze = readFreeze();

  if (!freeze) {
    if (options.allowUnfrozen) return { frozen: false as const, pins: { protocol: 'unfrozen' } };
    throw new Error('the protocol is not frozen');
  }

  const protocolSha = fileSha(protocolFile);

  if (protocolSha !== freeze.protocolSha256) throw new Error(`PROTOCOL.md changed after the freeze (${protocolSha})`);

  const d = dataPins();

  for (const [k, v] of Object.entries(freeze.data))
    if (d[k as keyof typeof d] !== v) throw new Error(`data pin ${k} changed`);

  const code = codeManifest();
  const acks = codeAcks();
  const accepted = [freeze.code.closureDigest, ...acks.map((a) => a.closureDigest)];

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
      data: data.devSha256
    }
  };
};

export const logDoor = (entry: Record<string, unknown>) => {
  fs.mkdirSync(path.dirname(doorLog), { recursive: true });
  fs.appendFileSync(doorLog, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
};

export const doorEntries = (): Record<string, unknown>[] =>
  fs.existsSync(doorLog)
    ? fs
        .readFileSync(doorLog, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];

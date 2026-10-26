// The prospective shadow comparison's frozen constants (research/prospective-b4-b5-shadow/PROTOCOL.md) and its
// write-once freeze. The freeze binds the protocol text, the B4/B5 pool files and books, the code that runs (the
// transitive import closure of the pools and forward commands), the frozen canonical data and market-event files, the
// conventions, and B4's and B5's state at the cutoff on the frozen `all`.
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';

export const prospective = {
  version: 'prospective-b4-b5-shadow-v1',
  dir: 'research/prospective-b4-b5-shadow',
  cutoff: '2026-10-13',
  firstForwardSession: '2026-10-14',
  pools: ['B4', 'B5'] as const,
  members: ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const,
  principalCostBps: 5,
  frictionScenariosBps: [0, 2, 10],
  rateScenarios: [0.08, 0.14],
  ladderFractions: [0.1, 0.15, 0.2, 0.25],
  annualRate: 0.11,
  evidenceThreshold: { months: 12, lotsPerPool: 20 },
  splitMoveLimit: 0.25, // an overnight move beyond ±25% must be a declared split
  snapshotsRoot: 'data/prospective',
  outputRoot: 'evaluations/pools/forward'
};

export const freezeFileOf = (dir = prospective.dir) => path.join(dir, 'PROTOCOL_FREEZE.json');
export const protocolFileOf = (dir = prospective.dir) => path.join(dir, 'PROTOCOL.md');

export const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');
export const sha256File = async (file: string) => sha256(await fs.readFile(file));
export const hashBody = (body: Record<string, unknown>) => sha256(JSON.stringify(body));

// The transitive closure of relative and #lib/#types imports from the given entry files: the code a command runs.
export const importClosure = async (entries: string[]) => {
  const aliases: Record<string, string> = { '#lib': 'src/lib/index.ts', '#types': 'src/types/index.ts' };
  const seen = new Set<string>();
  const queue = [...entries];

  while (queue.length > 0) {
    const file = path.normalize(queue.pop()!);

    if (seen.has(file)) {
      continue;
    }

    seen.add(file);

    const text = await fs.readFile(file, 'utf8');
    const specifiers = [...text.matchAll(/(?:from\s+|import\s*\(\s*)'([^']+)'/g)].map((match) => match[1]!);

    for (const specifier of specifiers) {
      if (aliases[specifier]) {
        queue.push(aliases[specifier]!);
      } else if (specifier.startsWith('.')) {
        queue.push(path.join(path.dirname(file), specifier));
      }
    }
  }

  return [...seen].sort();
};

export const codeEntries = ['src/app/pools.ts', 'src/pools/cli.ts', 'src/pools/forward/cli.ts'];

export const codeManifest = async (entries = codeEntries) => {
  const files = await importClosure(entries);
  const hashes = Object.fromEntries(
    await Promise.all(files.map(async (file) => [file, await sha256File(file)] as const))
  );

  return { entries, files: hashes, digest: sha256(JSON.stringify(hashes)) };
};

export interface Sealed {
  bodyHash: string;
  [key: string]: unknown;
}

export const writeOnce = async (file: string, body: Record<string, unknown>) => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: it is written once and never rewritten`);
  }

  const safe = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
  const sealed = { ...safe, bodyHash: hashBody(safe) };

  await fs.outputFile(file, `${JSON.stringify(sealed, null, 2)}\n`);

  return sealed as Sealed;
};

export const readSealed = async <T extends { bodyHash: string }>(file: string): Promise<T> => {
  const sealed = (await fs.readJson(file)) as T;
  const { bodyHash, ...body } = sealed;

  if (hashBody(body) !== bodyHash) {
    throw new Error(`${file}: the body hash does not verify; the record was changed after it was written`);
  }

  return sealed;
};

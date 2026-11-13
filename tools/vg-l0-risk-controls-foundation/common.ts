// Shared helpers of the Assignment 1 study tools (research/vg-l0-risk-controls-foundation/): paths, write-once sealed
// records with seals.jsonl, quiet door opening logged in this study's own doors.jsonl, and the pinned loader of the
// frozen New L0. Run every tool from the repository root.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import { checkFullGuard } from '../../src/vg-lifecycle-matched-optimization/doors.ts';
import { canonicalOf, cfgId, gId, quadId } from '../../src/vg-lifecycle-matched-optimization/config.ts';
import { frozenSelectionFile as p3FrozenSelectionFile } from '../../src/vg-d1-growth-joint/context.ts';
import { type Door, openFullDoor, openPrefixDoor } from '../../src/vg-d1-growth-joint/data.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../../src/vg-d1-growth-joint/space.ts';
import { p3 } from '../../src/vg-d1-growth-diagnostic/context.ts';

export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const studyDir = path.join(repoRoot, 'research', 'vg-l0-risk-controls-foundation');
export const resultsDir = path.join(studyDir, 'results');
export const dry = process.argv.includes('--dry');
export const scratch = process.env.RCF_SCRATCH ?? path.join(repoRoot, '.cache', 'vg-l0-risk-controls-foundation', 'dry');
export const rel = (f: string) => path.relative(repoRoot, f);
export const sha256 = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
export const sha256File = (f: string) => sha256(fs.readFileSync(f));
export const head = () => execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim();
export const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

// JSON with non-finite numbers as strings (the repository's sealed-record convention).
export const textOf = (v: unknown) =>
  `${JSON.stringify(
    v,
    (_k, x) => (typeof x === 'number' && !Number.isFinite(x) ? (Number.isNaN(x) ? '__NaN' : x > 0 ? '__Inf' : '__-Inf') : x),
    1
  )}\n`;

// Write once and seal (0444, sha256 appended to results/seals.jsonl). Under --dry: an unsealed copy in the scratch dir.
export const seal = (relPath: string, value: unknown, stage: string) => {
  const text = textOf(value);

  if (dry) {
    const f = path.join(scratch, relPath);

    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, text);
    console.log(`dry: ${rel(f)} (${sha256(text).slice(0, 12)}…)`);
    return { file: f, sha256: sha256(text) };
  }

  const f = path.join(resultsDir, relPath);

  if (fs.existsSync(f)) throw new Error(`${rel(f)} exists: a sealed record is never rewritten`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  fs.chmodSync(f, 0o444);

  const h = sha256File(f);

  fs.appendFileSync(path.join(resultsDir, 'seals.jsonl'), `${JSON.stringify({ t: now(), stage, file: rel(f), sha256: h })}\n`);
  console.log(`sealed ${rel(f)} ${h}`);
  return { file: f, sha256: h };
};

export const logDoor = (door: string, purpose: string, extra: Record<string, unknown> = {}) => {
  const f = dry ? path.join(scratch, 'doors.jsonl') : path.join(resultsDir, 'doors.jsonl');

  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.appendFileSync(f, `${JSON.stringify({ t: now(), door, purpose, pid: process.pid, ...extra })}\n`);
};

export type DoorKey = 'D19' | 'D21' | 'D23' | 'D24' | 'FULL';

// Priority 3's doors, opened quietly (no other study's log is written) and logged here. FULL only under 5B's guard (its
// FROZEN_SELECTION.json sealed, committed, unchanged) and Priority 3's.
export const openDoor = async (name: DoorKey, purpose: string): Promise<Door> => {
  if (name === 'FULL') {
    const guard = checkFullGuard();
    const door = await openFullDoor(purpose, { file: p3FrozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true);

    logDoor('FULL', purpose, { guard5B: guard, sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 } });
    return door;
  }

  const door = await openPrefixDoor(name, purpose, true);

  logDoor(name, purpose, { sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 } });
  return door;
};

// ----- the frozen New L0 (5B FROZEN_SELECTION.json crossTestSubjects[R01], pinned) -----

export const pins = {
  p5bFrozenSelection: {
    file: 'research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json',
    sha256: 'cd223a0d18c44925af7102b98efae1e369899664b8fb07ee2f8a579816255793'
  },
  p5bValidation: {
    file: 'research/vg-lifecycle-matched-optimization/results/validation/validation.json',
    sha256: '8393113915ee91f98e66f3005a84b82cc78686bde9416759ae61a82846cc7afd'
  },
  p5bLedger: {
    file: 'research/vg-lifecycle-matched-optimization/results/diagnostics/ledgers/C24_L0_informed_R1#1_profit/L0/lots.csv'
  }
} as const;

export const readPinned = <T>(src: { file: string; sha256: string }): T => {
  const f = path.join(repoRoot, src.file);
  const h = sha256File(f);

  if (h !== src.sha256) throw new Error(`${src.file}: sha256 ${h} is not the pinned ${src.sha256}`);
  return decode<T>(fs.readFileSync(f, 'utf8'));
};

export const newL0 = (): { quad: Quad; options: EvalOptions; label: string; id: string } => {
  const f = readPinned<{
    arms: { L0: { primary: { label: string; id: string } } };
    crossTestSubjects: { row: string; id: string; quad: Quad; options: EvalOptions; exportedBy: { label: string }[] }[];
  }>(pins.p5bFrozenSelection);
  const r01 = f.crossTestSubjects.find((x) => x.row === 'R01')!;

  if (r01.exportedBy[0]!.label !== 'C24/L0/informed/R1#1 profit' || f.arms.L0.primary.id !== r01.id)
    throw new Error('5B R01 is not the L0 primary');

  const cfg = canonicalOf('V', r01.quad);

  if (cfgId(cfg) !== '67cfdd9b62d1e16f' || quadId(cfg.quad) !== 'a2e385640ca61012' || gId(cfg.quad.g.VGT) !== '6b5f909b30cfa516')
    throw new Error(`New L0 identity ${cfgId(cfg)} / ${quadId(cfg.quad)} / ${gId(cfg.quad.g.VGT)}`);
  if (JSON.stringify(r01.options) !== JSON.stringify({ enabled: { 'G:GDX': false } })) throw new Error('New L0 options');
  return { quad: cfg.quad, options: r01.options, label: r01.exportedBy[0]!.label, id: cfgId(cfg) };
};

// Process memory (reported, not tuned).
export const memory = () => {
  const m = process.memoryUsage();

  return { rssMb: Math.round(m.rss / 2 ** 20), heapUsedMb: Math.round(m.heapUsed / 2 ** 20), externalMb: Math.round(m.external / 2 ** 20), arrayBuffersMb: Math.round(m.arrayBuffers / 2 ** 20) };
};

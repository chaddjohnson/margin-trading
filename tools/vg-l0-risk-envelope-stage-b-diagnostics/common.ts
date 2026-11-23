// RES-BD 1.0.0 shared plumbing (research/vg-l0-risk-envelope-stage-b-diagnostics/PROTOCOL.md): the namespace's paths,
// the non-official purpose check, STREAMING sha256 (the Stage B search archives are 4.4–5.2 GB; fs.readFileSync refuses
// files above 2 GiB — AMENDMENTS D1), verified archive COPIES in git-ignored scratch, a Lab over a copy with a pool
// that REFUSES every evaluation (and counts the refusals), JSON / CSV writers, and this namespace's door opening (Stage
// B's own door guard, logged in THIS namespace's results/doors.jsonl). Stage B's records and caches are never opened
// for writing; an original archive is only ever hashed.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { EvalLab, type PoolLike } from '../../src/gpu-backend/lab.ts';
import { openStudyDoor, type StudyDoor } from '../../src/gpu-backend/doors.ts';
import { encode } from '../../src/growth140-vgt-s8m/store.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { STUDY_ID as STAGE_B_ID, type CutoffKey, cutoffs, researchDir as stageBDir } from '../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { doorGuard } from '../../src/vg-l0-risk-envelope-stage-b/doors.ts';

export const STUDY = 'vg-l0-risk-envelope-stage-b-diagnostics';
export const STUDY_ID = `research/${STUDY}`;
export const PROTOCOL_ID = 'RES-BD';
export const PROTOCOL_VERSION = '1.0.0';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const studyDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(studyDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY); // git-ignored (/.cache/), main disk
export const stageBJobs = path.join(stageBDir, 'cache', 'jobs');

export const purposeOf = (allowed: string[]) => {
  const p = process.env.GPU_POLICY_PURPOSE ?? '';

  if (!allowed.includes(p)) throw new Error(`declare a non-official purpose (GPU_POLICY_PURPOSE=${allowed.join('|')}), got "${p}"`);
  return p;
};

export const utc = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
export const r2 = (x: number) => Math.round(x * 100) / 100;

// ----- hashing (streaming: no 2 GiB limit) -----
export const sha256Stream = (file: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const h = createHash('sha256');

    fs.createReadStream(file, { highWaterMark: 8 << 20 })
      .on('data', (b) => h.update(b))
      .on('error', reject)
      .on('end', () => resolve(h.digest('hex')));
  });
export const sha256Text = (s: string) => createHash('sha256').update(s).digest('hex');
export const sha256Small = (file: string) => {
  if (fs.statSync(file).size > 1 << 30) throw new Error(`${file}: use sha256Stream for large files`);
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
};

// ----- writers (the store's non-finite encoding "__Inf" …; one-space indent, the studies' convention) -----
export const jsonText = (value: unknown, indent: number | undefined = 1) => `${JSON.stringify(JSON.parse(encode(value)), null, indent)}\n`;
export const writeJson = (file: string, value: unknown, indent: number | undefined = 1) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, jsonText(value, indent));
  return sha256Small(file);
};
export const writeJsonGz = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, zlib.gzipSync(jsonText(value, undefined), { level: 9 }));
  return sha256Small(file);
};
export const readJsonGz = <T>(file: string): T => JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8')) as T;
export const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

const csvCell = (v: unknown) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : v > 0 ? 'Inf' : v < 0 ? '-Inf' : 'NaN';
  if (typeof v === 'boolean') return v ? '1' : '0';

  const s = String(v);

  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csvText = (rows: readonly Record<string, unknown>[], columns?: string[]) => {
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];

  return `${[cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n')}\n`;
};
export const writeCsv = (file: string, rows: readonly Record<string, unknown>[], columns?: string[], gzip = false) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const text = csvText(rows, columns);

  fs.writeFileSync(file, gzip ? zlib.gzipSync(text, { level: 9 }) : text);
  return sha256Small(file);
};

// ----- archive copies -----
export const archiveOriginal = (job: string) => path.join(stageBJobs, job, 'archive.sqlite');
export const archiveCopy = (job: string, root = cacheRoot) => path.join(root, 'jobs', job, 'archive.sqlite');
export const baselineFile = path.join(resultsDir, 'verification', 'archives-before.sha256');

// the committed baseline sha256 of every Stage B job archive (taken before any processing)
export const baselineOf = (job: string) => {
  const line = fs
    .readFileSync(baselineFile, 'utf8')
    .split('\n')
    .find((l) => l.endsWith(`  ${job}/archive.sqlite`));

  if (!line) throw new Error(`${job}: no baseline sha256 in ${path.relative(repoRoot, baselineFile)}`);
  return line.split('  ')[0]!;
};

export const integrityCheck = (file: string) => {
  const db = new DatabaseSync(file, { readOnly: true });

  try {
    const rows = db.prepare('PRAGMA integrity_check').all() as { integrity_check: string }[];

    return rows.map((r) => r.integrity_check);
  } finally {
    db.close();
  }
};

// a verified copy: the original must still equal its baseline, the copy must equal the original byte for byte (sha256)
// and pass PRAGMA integrity_check; an existing copy is re-verified, never trusted
export const makeCopy = async (job: string, o: { original?: string; copy?: string; expect?: string; integrity?: boolean } = {}) => {
  const original = o.original ?? archiveOriginal(job);
  const copy = o.copy ?? archiveCopy(job);
  const expect = o.expect ?? baselineOf(job);

  if (!fs.existsSync(original)) throw new Error(`${original}: the original archive is absent`);
  for (const ext of ['-wal', '-shm', '-journal'])
    if (fs.existsSync(original + ext)) throw new Error(`${original}${ext} exists: the archive is not cleanly closed`);

  const before = await sha256Stream(original);

  if (before !== expect) throw new Error(`${job}: the original archive's sha256 ${before} ≠ its baseline ${expect}`);
  if (!fs.existsSync(copy)) {
    fs.mkdirSync(path.dirname(copy), { recursive: true });
    fs.copyFileSync(original, copy);
  }

  const copied = await sha256Stream(copy);

  if (copied !== before) throw new Error(`${copy}: the copy's sha256 ${copied} ≠ the original's ${before}`);

  const integrity = o.integrity === false ? ['skipped'] : integrityCheck(copy);

  if (o.integrity !== false && !(integrity.length === 1 && integrity[0] === 'ok')) throw new Error(`${copy}: integrity_check ${integrity.slice(0, 5).join('; ')}`);
  return { job, original: path.relative(repoRoot, original), copy: path.relative(repoRoot, copy), sha256: before, bytes: fs.statSync(copy).size, integrity: integrity.join(';'), at: utc() };
};

// ----- the refusing pool and the replay Lab -----
export const refusingPool = () => {
  const calls = { run: 0, tasks: 0 };
  const pool: PoolLike = {
    start: async () => undefined,
    run: async (tasks) => {
      calls.run++;
      calls.tasks += tasks.length;
      throw new Error(`archive replay: ${tasks.length} evaluations are not in the archive copy (a replay evaluates nothing)`);
    },
    requestStop: () => undefined,
    stopping: null,
    close: async () => undefined
  };

  return { pool, calls };
};

export const doorPinOf = (door: string) => {
  const pins = (doorSpecs as Record<string, { pins: Record<string, { sha256: string }> }>)[door];

  if (!pins) throw new Error(`${door}: no prefix-door pins`);
  return `GDX:${pins.pins.GDX!.sha256},VGT:${pins.pins.VGT!.sha256}`;
};

// a Lab over the archive COPY of a Stage B job, bound exactly like the official job (Stage B's study id, the job, the
// door and its pin, the sealed backend and code digest — the store refuses any other binding), with the refusing pool
export const replayLab = async (cut: CutoffKey, job: string, binding: { backend: string; codeDigest: string }, root = cacheRoot) => {
  const file = archiveCopy(job, root);

  if (!fs.existsSync(file)) throw new Error(`${file}: make the verified archive copy first`);

  const { pool, calls } = refusingPool();
  const lab = new EvalLab({
    study: STAGE_B_ID,
    job,
    door: cutoffs[cut].door,
    doorPin: doorPinOf(cutoffs[cut].door),
    purpose: `${STUDY_ID} archive replay (no evaluation)`,
    pool,
    backend: binding.backend,
    codeDigest: binding.codeDigest,
    cacheRoot: root
  });

  await lab.open();
  return { lab, calls };
};

// ----- doors: Stage B's own guard (use 'diagnostic'), logged in THIS namespace -----
export const openDiagDoor = async (name: StudyDoor, purpose: string) => {
  if (!['D19', 'D21', 'D24'].includes(name)) throw new Error(`${name}: this diagnostic opens only the training doors D19 / D21 / D24`);
  doorGuard(name, 'diagnostic', purpose);
  return openStudyDoor(STUDY_ID, name, `diagnostic: ${purpose}`);
};

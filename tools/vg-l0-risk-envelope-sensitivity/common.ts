// RES-A 1.0.0 shared plumbing (research/vg-l0-risk-envelope-sensitivity/): paths, the non-official purpose check, JSON / CSV
// writers, and a read-only EvalLab over a COPY of one of the pilot's job archives with a pool that refuses every
// evaluation (the pilot census's archive-replay method: every request must be an archive hit). The pilot's own records and
// caches are never opened for writing; the copies live in .cache/vg-l0-risk-envelope-sensitivity/ (git-ignored).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { EvalLab, type PoolLike } from '../../src/gpu-backend/lab.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { encode } from '../../src/growth140-vgt-s8m/store.ts';
import { STUDY_ID as PILOT_STUDY_ID, cutoffs, type CutoffKey } from '../../src/vg-l0-risk-envelope-pilot/context.ts';

export const STUDY = 'vg-l0-risk-envelope-sensitivity';
export const STUDY_ID = `research/${STUDY}`;
export const PROTOCOL_ID = 'RES-A';
export const PROTOCOL_VERSION = '1.0.0';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const studyDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(studyDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY); // git-ignored (/.cache/)
export const pilotDir = path.join(repoRoot, 'research', 'vg-l0-risk-envelope-pilot');
export const pilotResults = path.join(pilotDir, 'results');
export const pilotCacheJobs = path.join(pilotDir, 'cache', 'jobs');

export const purposeOf = (allowed: string[]) => {
  const p = process.env.GPU_POLICY_PURPOSE ?? '';

  if (!allowed.includes(p)) throw new Error(`declare a non-official purpose (GPU_POLICY_PURPOSE=${allowed.join('|')}), got "${p}"`);
  return p;
};

export const sha256File = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export const sha256Text = (s: string) => createHash('sha256').update(s).digest('hex');

// JSON with the store's non-finite encoding ("__Inf" …), one space indent (the pilot's convention)
export const jsonText = (value: unknown, indent: number | undefined = 1) => `${JSON.stringify(JSON.parse(encode(value)), null, indent)}\n`;
export const writeJson = (file: string, value: unknown, indent: number | undefined = 1) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, jsonText(value, indent));
  return sha256File(file);
};
export const writeJsonGz = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, zlib.gzipSync(jsonText(value, undefined), { level: 9 }));
  return sha256File(file);
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
  return sha256File(file);
};

export const missPool: PoolLike = {
  start: async () => undefined,
  run: async (tasks) => {
    throw new Error(`audit: ${tasks.length} evaluations are not in the archive copy (an archive replay evaluates nothing)`);
  },
  requestStop: () => undefined,
  stopping: null,
  close: async () => undefined
};

export const archiveCopy = (job: string) => path.join(cacheRoot, 'jobs', job, 'archive.sqlite');
export const archiveOriginal = (job: string) => path.join(pilotCacheJobs, job, 'archive.sqlite');

// a Lab over the archive COPY of a pilot job, bound exactly like the official job (study, job, door, door pin, backend,
// code digest — a different binding is refused by the store), with the evaluation-refusing pool
export const replayLab = async (cut: CutoffKey, job: string, binding: { backend: string; codeDigest: string }) => {
  const file = archiveCopy(job);

  if (!fs.existsSync(file)) throw new Error(`${file}: make the archive copy first (sha256-verified copy of ${archiveOriginal(job)})`);

  const pins = doorSpecs[cutoffs[cut].door].pins;
  const lab = new EvalLab({
    study: PILOT_STUDY_ID,
    job,
    door: cutoffs[cut].door,
    doorPin: `GDX:${pins.GDX.sha256},VGT:${pins.VGT.sha256}`,
    purpose: `${STUDY_ID} archive replay (no evaluation)`,
    pool: missPool,
    backend: binding.backend,
    codeDigest: binding.codeDigest,
    cacheRoot
  });

  await lab.open();
  return lab;
};

export const r2 = (x: number) => Math.round(x * 100) / 100;
export const utc = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

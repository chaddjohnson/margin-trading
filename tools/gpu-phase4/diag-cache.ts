// gpu-phase4 (diagnostic, NON-OFFICIAL, purpose parity-test, CPU only): can an earlier task in the same CPU reference
// process change candidate O-fund:coarse:28's record through the per-process book caches (src/d1-risk-controls-rc2/run.ts
// d1Cache2, src/vg-d1-growth-joint/evaluate.ts caches)? For every other task j of the D24-fund parity run (built as
// tools/gpu-phase4/parity.ts builds it): clear every cache, evaluate j, then the candidate, and compare the candidate's
// books / pool / record / envelope hashes with its clean (fresh-cache) hashes. 12 child processes split the j's.
//   GPU_POLICY_PURPOSE=parity-test node --experimental-transform-types tools/gpu-phase4/diag-cache.ts --out <json>
import os from 'node:os';
import { spawn } from 'node:child_process';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { caches } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { d1Cache2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { d1Cache } from '../../src/d1-risk-controls/run.ts';
import { writeJson } from '../../src/gpu-phase4/context.ts';
import { resolveDoor } from '../../src/gpu-phase4/doorSpec.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase4/subjects.ts';
import { type RefTask, reference } from '../../src/gpu-phase4/cpuRefWorker.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const key = opt('key', 'O-fund:coarse:28');
const procs = Number(opt('procs', String(Math.min(12, os.cpus().length))));
const clearAll = () => {
  d1Cache2.clear();
  d1Cache.clear();
  for (const c of Object.values(caches)) c.clear();
};
const build = async () => {
  const door = await resolveDoor({ kind: 'market', name: 'D24' }, 'gpu-phase4 cache diagnostic (CPU only)');
  const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
  const options: EvalOptions = { ...vOptions, fundFrom: at(0.3) };
  const subjects = [...referenceSubjects(), ...randomSubjects(1500, 'O-fund', 'coarse', 0), ...growthStrata(2, 'O-fund-G')];
  const tasks: RefTask[] = subjects.map((s) => ({
    k: s.key,
    quad: s.quad,
    controls: s.controls,
    options,
    detail: true,
    risk: true
  }));

  return { door, tasks };
};
const h = (r: ReturnType<typeof reference>) =>
  r.ok ? JSON.stringify([r.books, r.pool, r.record, r.envelope]) : `error: ${r.error}`;

if (args.includes('--child')) {
  const i = Number(opt('child', '0'));
  const { door, tasks } = await build();
  const idx = tasks.findIndex((t) => t.k === key);

  clearAll();
  const clean = h(reference(door, tasks[idx]!));
  const bad: { j: string; hash: string }[] = [];
  let n = 0;

  for (let j = i; j < tasks.length; j += procs) {
    if (j === idx) continue;
    clearAll();
    reference(door, tasks[j]!);
    const now = h(reference(door, tasks[idx]!));

    n++;
    if (now !== clean) bad.push({ j: tasks[j]!.k, hash: now.slice(0, 200) });
  }
  process.stdout.write(`${JSON.stringify({ child: i, n, clean: clean.slice(0, 200), bad })}\n`);
  process.exit(0);
}

const t0 = new Date().toISOString();
const res = await Promise.all(
  Array.from(
    { length: procs },
    (_v, i) =>
      new Promise<{ child: number; n: number; clean: string; bad: { j: string; hash: string }[] }>((resolve, reject) => {
        const c = spawn(
          process.execPath,
          [
            '--experimental-transform-types',
            '--disable-warning=ExperimentalWarning',
            import.meta.filename,
            '--child',
            String(i),
            '--procs',
            String(procs),
            '--key',
            key
          ],
          { stdio: ['ignore', 'pipe', 'inherit'] }
        );
        let buf = '';

        c.stdout.on('data', (d: Buffer) => (buf += d.toString()));
        c.on('exit', (code) => {
          const line = buf.trim().split('\n').at(-1) ?? '';

          if (code !== 0 || !line.startsWith('{')) reject(new Error(`child ${i} exited ${code}`));
          else resolve(JSON.parse(line));
        });
      })
  )
);
const rec = {
  kind: 'gpu-phase4 diagnostic: single-predecessor cache poisoning of the D24-fund mismatch candidate (CPU)',
  t0,
  t1: new Date().toISOString(),
  key,
  pairs: res.reduce((a, r) => a + r.n, 0),
  cleanHashesAgree: new Set(res.map((r) => r.clean)).size === 1,
  poisoned: res.flatMap((r) => r.bad),
  pass: res.every((r) => r.bad.length === 0)
};

writeJson(opt('out', ''), rec);
console.log(JSON.stringify({ pairs: rec.pairs, cleanHashesAgree: rec.cleanHashesAgree, poisoned: rec.poisoned.length }));

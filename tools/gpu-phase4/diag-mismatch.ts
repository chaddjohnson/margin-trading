// gpu-phase4 (diagnostic, NON-OFFICIAL, purpose parity-test): traces the one parity mismatch of the final campaign's
// run D24-fund (candidate O-fund:coarse:28: books and pooled replay identical, the record hash different, no field
// difference in the in-process re-run). It rebuilds that run's task list exactly as tools/gpu-phase4/parity.ts does
// (--door D24 --options fund --refs --random 1500 --strata 2 --label O-fund --detail --risk) and hashes the candidate's
// books / pool / record / envelope along every path:
//   cpu-fresh      the canonical CPU reference in a fresh process state (the reference function, in process)
//   cpu-sequence   the same after every earlier task of the list in the same process (a worker's history)
//   cpu-pool       the 12-worker CPU reference pool exactly as the campaign ran it (chunks of 4)
//   gpu-batch      the GPU with the whole list in one batch through the host pipeline (as the campaign ran it)
//   gpu-single     the GPU with the candidate alone
// with the binary in GPU_BACKEND_BINARY (the final gb4, or the accepted Phase 3 gb3 for comparison). Writes --out.
//   GPU_POLICY_PURPOSE=parity-test node --experimental-transform-types tools/gpu-phase4/diag-mismatch.ts --out <json> [--key O-fund:coarse:28]
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { writeJson } from '../../src/gpu-phase4/context.ts';
import { resolveDoor } from '../../src/gpu-phase4/doorSpec.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase4/subjects.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-phase4/canon.ts';
import { CpuRefPool } from '../../src/gpu-phase4/cpuRefPool.ts';
import { type RefTask, reference } from '../../src/gpu-phase4/cpuRefWorker.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type TaskResult } from '../../src/gpu-backend/client.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { cacheDir } from '../../src/gpu-phase4/context.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const key = opt('key', 'O-fund:coarse:28');
const out = opt('out', '');
const door = await resolveDoor({ kind: 'market', name: 'D24' }, 'gpu-phase4 diagnostic of the D24-fund mismatch');
const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
const options: EvalOptions = { ...vOptions, fundFrom: at(0.3) };
const subjects = [
  ...referenceSubjects(),
  ...randomSubjects(1500, 'O-fund', 'coarse', 0),
  ...growthStrata(2, 'O-fund-G')
];
const tasks: RefTask[] = subjects.map((s) => ({
  k: s.key,
  quad: s.quad,
  controls: s.controls,
  options,
  detail: true,
  risk: true
}));
const idx = tasks.findIndex((t) => t.k === key);

if (idx < 0) throw new Error(`${key} not in the list`);

const t = tasks[idx]!;
const hashOfRef = (r: ReturnType<typeof reference>) =>
  r.ok ? { books: r.books, pool: r.pool, record: r.record, envelope: r.envelope } : { error: r.error };
const rows: Record<string, unknown> = { key, index: idx, tasks: tasks.length };

// CPU, fresh process state
rows.cpuFresh = hashOfRef(reference(door, t));
const skipCpuPool = args.includes('--skip-cpu-pool');
// CPU, after every earlier task in this process (a worker's history), then the candidate again
for (let i = 0; i < idx; i++) reference(door, tasks[i]!);
rows.cpuSequence = hashOfRef(reference(door, t));
rows.cpuFreshAgain = hashOfRef(reference(door, t));
// the CPU pool, as the campaign ran it
if (!skipCpuPool) {
  const pool = new CpuRefPool(12, { kind: 'market', name: 'D24' });

  await pool.start();
  const res = await pool.run(tasks, 4);

  await pool.close();
  rows.cpuPool = hashOfRef(res[idx] as never);
}
// the GPU
const ds = exportDataset(door, cacheDir);
const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
const info = await server.info();

// the campaign's exact server history: INFO, SMOKE, LOAD, then the batch (--no-smoke to skip the smoke kernel)
if (!args.includes('--no-smoke') && !(await server.smoke()).ok) throw new Error('smoke failed');
await server.load(ds.file);
const pipe = await HostPipeline.start({ door, workers: 8 });
const batchOpts = {
  returnTrades: true,
  returnSeries: true,
  tradeCapD1: 1024,
  tradeCapG: 1024,
  lotCap: 1024,
  fundCap: 4096
};
const gpuHash = (r: TaskResult) =>
  r.status !== 0
    ? { status: r.status }
    : {
        books: canonHash(r.books.map(bookView)),
        pool: canonHash(poolView(r.pool!)),
        record: canonHash(r.record),
        envelope: r.envelope
          ? [
              r.envelope.bankedDdMarked,
              r.envelope.bankedDdLiquidation,
              r.envelope.principalLossMarked,
              r.envelope.principalLossLiquidation
            ]
          : null
      };
const evalGpu = async (list: RefTask[]) => {
  const p = await pipe.prepare(door, list, batchOpts);

  return pipe.complete(p, await server.submit(p), info.uuid, 'full');
};

{
  const b = await evalGpu(tasks);

  rows.gpuBatch = gpuHash(b.results[idx]!);
  rows.gpuBatchRecord = b.results[idx]!.record;
}
{
  const b = await evalGpu([t]);

  rows.gpuSingle = gpuHash(b.results[0]!);
}
{
  const b = await evalGpu(tasks);

  rows.gpuBatchAgain = gpuHash(b.results[idx]!);
}
// repeated batches: every candidate's record hash against the first batch's (a transient-rate probe)
const reps = Number(opt('repeat', '0'));
const firstBatch = new Map<string, string>();
let repDiffs = 0;
const repDiffKeys: string[] = [];

for (let r = 0; r < reps; r++) {
  const b = await evalGpu(tasks);

  for (const x of b.results) {
    const h = JSON.stringify(gpuHash(x));

    if (r === 0) firstBatch.set(x.key, h);
    else if (firstBatch.get(x.key) !== h) {
      repDiffs++;
      if (repDiffKeys.length < 20) repDiffKeys.push(`${r}:${x.key}`);
    }
  }
}
rows.repeat = { batches: reps, candidatesEach: tasks.length, differences: repDiffs, examples: repDiffKeys };
await pipe.close();
await server.close();
rows.binary = { path: serverBinary, sha256: createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex') };
const same = (a: string, b: string) => JSON.stringify(rows[a]) === JSON.stringify(rows[b]);

rows.equal = {
  'cpuFresh=cpuSequence': same('cpuFresh', 'cpuSequence'),
  'cpuFresh=cpuPool': same('cpuFresh', 'cpuPool'),
  'cpuFresh=gpuSingle': same('cpuFresh', 'gpuSingle'),
  'cpuFresh=gpuBatch': same('cpuFresh', 'gpuBatch'),
  'gpuBatch=gpuBatchAgain': same('gpuBatch', 'gpuBatchAgain'),
  'gpuSingle=gpuBatch': same('gpuSingle', 'gpuBatch')
};
// the CPU's own record values, for a field comparison with the GPU batch's
const cpuRec = (await import('../../src/vg-l0-risk-families/evaluate.ts')).evaluateDetail(door, t.quad, t.controls, options);

writeJson(out, { kind: 'gpu-phase4 diagnostic of the D24-fund parity mismatch', t: new Date().toISOString(), ...rows });
fs.writeFileSync(`${out}.records.json`, JSON.stringify({ cpu: cpuRec, gpuBatch: rows.gpuBatchRecord }, null, 1));
delete rows.gpuBatchRecord;
console.log(JSON.stringify({ repeat: rows.repeat, equal: rows.equal, cpuFresh: rows.cpuFresh, cpuPool: rows.cpuPool, gpuBatch: rows.gpuBatch, gpuSingle: rows.gpuSingle }));

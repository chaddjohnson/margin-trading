// S5 benchmarks (PROTOCOL.md §12 G7: only after G2–G6). Equivalent CPU and GPU workloads on the same door, the same
// seeded candidates and the same outputs (every GPU record's hash must equal the CPU record's hash).
//
//   --mode slice   workload F (Growth fixed: New L0's Growth·VGT; random A3 D1 books and RC 2 controls — the shape of
//                  Assignment 2's searches, where the Growth book cache always hits). CPU: the production pool
//                  (12 workers, A3 settings). GPU: the slice at several batch sizes, kernel-only and total time, plus
//                  cold start. Every GPU record's hash is compared with the CPU's.
//   --mode hybrid  workload J (Assignment 3's joint genome: every candidate has its own Growth book). CPU-only: the
//                  production pool. Hybrid: the same pool computes ONLY the Growth books while the GPU evaluates the
//                  D1 books and the pool as batches fill (pipelined); records on the coordinator. Hashes compared.
// nvidia-smi is sampled every 200 ms during GPU phases (utilization, memory, power, temperature, SM clock).
//
//   node --expose-gc --experimental-transform-types tools/gpu-phase1/bench.ts --mode slice --door D24 --n 4096 \
//     --batches 64,256,1024,2048,4096 --workers 12 --out <json>
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { VBook } from '../../src/vg-d1-growth-joint/books.ts';
import { booksOf as p3BooksOf } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { CpuPool, type Task } from '../../src/gpu-phase1/cpuPool.ts';
import { type DoorKey, median, openDoor, seedOf, writeJson } from '../../src/gpu-phase1/context.ts';
import { Rng } from '../../src/optimizer/rng.ts';
import { exportDataset } from '../../src/gpu-phase1/dataset.ts';
import { type EvalItem, GpuEvaluator } from '../../src/gpu-phase1/gpu.ts';
import { type Subject, randomSubjects, referenceSubjects } from '../../src/gpu-phase1/subjects.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);

  return i >= 0 ? args[i + 1]! : d;
};
const mode = opt('mode', 'slice');
const doorName = opt('door', 'D24') as DoorKey;
const n = Number(opt('n', '4096'));
const batches = opt('batches', '64,256,1024,2048,4096').split(',').map(Number);
const workers = Number(opt('workers', '12'));
const reps = Number(opt('reps', '3'));
const hybridBatch = Number(opt('hybrid-batch', '1024'));
const tradeCap = Number(opt('trade-cap', '512'));
const lotCap = Number(opt('lot-cap', '512'));
const vram = Number(opt('vram-budget-mb', '2400'));
const set = opt('set', 'median'); // 'median': uniform A3 genomes; 'heavy': D1 grids from the box's aggressive corner
const out = opt('out', '');

if (!out) throw new Error('--out <json> is required');

const hashRec = (r: unknown) => createHash('sha256').update(JSON.stringify(r)).digest('hex').slice(0, 16);

// nvidia-smi sampler
const sampler = () => {
  const rows: number[][] = [];
  const p = spawn('nvidia-smi', ['--query-gpu=utilization.gpu,memory.used,power.draw,temperature.gpu,clocks.sm', '--format=csv,noheader,nounits', '-lms', '200']);

  p.stdout.on('data', (b: Buffer) => {
    for (const line of b.toString().trim().split('\n')) {
      const v = line.split(',').map((x) => Number(x.trim()));

      if (v.length === 5 && v.every(Number.isFinite)) rows.push([performance.now(), ...v]);
    }
  });
  return {
    stop: (from: number, to: number) => {
      p.kill();

      const xs = rows.filter((r) => r[0]! >= from && r[0]! <= to);
      const col = (i: number) => xs.map((r) => r[i]!);
      const energy = xs.slice(1).reduce((a, r, i) => a + ((r[3]! + xs[i]![3]!) / 2) * ((r[0]! - xs[i]![0]!) / 1000), 0);

      return xs.length
        ? {
            samples: xs.length,
            utilizationPct: { median: median(col(1)), max: Math.max(...col(1)) },
            memoryUsedMiB: { max: Math.max(...col(2)) },
            powerW: { median: median(col(3)), max: Math.max(...col(3)) },
            temperatureC: { max: Math.max(...col(4)) },
            smClockMHz: { median: median(col(5)) },
            energyJ: energy
          }
        : null;
    }
  };
};

const t0 = Date.now();
const tl = performance.now();
const door = await openDoor(doorName, `S5 bench ${mode}`);
const doorMs = performance.now() - tl;
const nl0 = referenceSubjects()[0]!;
// 'heavy' (the worst-case workload): every D1 grid redrawn from the box's high-activity corner — shallow dips
// (X 8–12%), small rebounds (Y 0.1–0.5%), short holds and windows, long continuation windows — so the books trade most
const heavy = (s: Subject, i: number): Subject => {
  const r = new Rng(seedOf('heavy', i));
  const g = () => ({ targetPercentChange: 80 + r.int(41), trailingBuyPercentage: 1 + r.int(5), trailingStopPercentage: 30 + r.int(31), maximumHoldDays: 3 + r.int(6), tickWindowSize: 20 + r.int(21), intradayLossBuffer: r.int(21), pullback: 30 + r.int(31), continuationWindow: 100 + r.int(101) });
  const d1 = { GDX: g(), VGT: g() };

  for (const sym of ['GDX', 'VGT'] as const) if (s.controls?.books[`D1:${sym}`]?.hold?.mode === 'disabled') { d1[sym].maximumHoldDays = 3; d1[sym].intradayLossBuffer = 0; }
  for (const sym of ['GDX', 'VGT'] as const) {
    const h = s.controls?.books[`D1:${sym}`]?.hold;

    if (h?.mode === 'adaptive' && h.extendedHoldDays <= d1[sym].maximumHoldDays) h.extendedHoldDays = d1[sym].maximumHoldDays + 3;
  }
  return { ...s, quad: { ...s.quad, d1 } };
};
const base = randomSubjects(n, mode === 'slice' ? 'GPUBENCH-F' : 'GPUBENCH-J').map((s, i) => (set === 'heavy' ? heavy(structuredClone(s), i) : s));
const subjects: Subject[] = mode === 'slice' ? base.map((s) => ({ ...s, quad: { ...s.quad, g: nl0.quad.g } })) : base;
const toTask = (s: Subject, i: number, t: 'eval' | 'growth' = 'eval'): Task => ({ t, k: `${i}`, quad: s.quad, controls: s.controls, options: vOptions });

// ----- the CPU reference: the production pool -----
const cpuRun = async (label: string, taskType: 'eval' | 'growth') => {
  const pool = new CpuPool({ door: doorName, purpose: `S5 ${label}`, workers });
  const ts = performance.now();

  await pool.start();

  const startMs = performance.now() - ts;

  await pool.run(randomSubjects(4 * workers, 'WARM').map((s, i) => toTask(s, -1 - i, taskType)), () => {});
  return { pool, startMs };
};

const result: Record<string, unknown> = { kind: `gpu-phase1 S5 benchmark (${mode})`, door: doorName, set, n, workers, host: { cpus: os.cpus()[0]?.model, threads: os.cpus().length, loadavg: os.loadavg() }, doorLoadMs: doorMs };
const cpuHash = new Map<number, string>();

{
  const { pool, startMs } = await cpuRun('cpu', 'eval');
  const c0 = performance.now();

  await pool.run(subjects.map((s, i) => toTask(s, i)), (t, h) => cpuHash.set(Number(t.k), h));

  const wall = (performance.now() - c0) / 1000;

  result.cpu = { workers, startSeconds: startMs / 1000, wallSeconds: wall, evalsPerSecond: n / wall, workerStats: await pool.stats() };
  await pool.close();
  console.log(`CPU ${workers} workers: ${(n / wall).toFixed(1)} ev/s`);
}

// ----- the GPU -----
const te = performance.now();
const ds = exportDataset(door, `${doorName}-bench`);
const exportMs = performance.now() - te;
const ts = performance.now();
const gpu = GpuEvaluator.start({ vramBudgetMb: vram });
const info = await gpu.info();
const initMs = performance.now() - ts;
const load = await gpu.load(ds.file);
const coldMs = performance.now() - ts;

result.cold = { datasetExportMs: exportMs, serverStartAndCudaInitMs: initMs, datasetLoadMs: load.uploadMs + load.refHighMs, uploadMs: load.uploadMs, refHighMs: load.refHighMs, totalColdMs: coldMs, deviceDatasetBytes: load.deviceBytes, info };

const items: EvalItem[] = subjects.map((s) => ({ key: String(subjects.indexOf(s)), quad: s.quad, controls: s.controls, options: vOptions }));
let mismatches = 0;
let compared = 0;
const checkHashes = (results: { key: string; status: number; record: unknown }[]) => {
  for (const r of results) {
    compared++;
    if (r.status !== 0 || hashRec(r.record) !== cpuHash.get(Number(r.key))) mismatches++;
  }
};

if (mode === 'slice') {
  // the one Growth book every candidate shares, computed once by the canonical CPU path (its cost reported apart)
  const tg = performance.now();
  const g = p3BooksOf(door, items[0]!.quad, { ...vOptions, enabled: { ...vOptions.enabled, 'D1:GDX': false, 'D1:VGT': false } });
  const growthOnceMs = performance.now() - tg;

  for (const it of items) it.growth = g as VBook[];

  const scaling: Record<string, unknown>[] = [];
  const smi = sampler();

  for (const b of batches) {
    if (b > n) continue;

    const runs: Record<string, number>[] = [];
    // small batches time a proportionate subset (at least 4 batches and 512 candidates); throughput is per processed
    const nb = Math.min(n, Math.max(4 * b, 512));

    for (let r = 0; r <= reps; r++) {
      const w0 = performance.now();
      let kernel = 0,
        d1 = 0,
        poolK = 0,
        h2d = 0,
        d2h = 0,
        server = 0,
        rt = 0,
        enc = 0,
        dec = 0;

      for (let i = 0; i < nb; i += b) {
        const x = await gpu.evaluate(door, items.slice(i, Math.min(i + b, nb)), { returnTrades: false, returnLots: true, returnSeries: false, record: true, tradeCap, lotCap });

        d1 += x.timing.server.d1KernelMs;
        poolK += x.timing.server.poolKernelMs;
        kernel += x.timing.server.d1KernelMs + x.timing.server.poolKernelMs;
        h2d += x.timing.server.h2dMs;
        d2h += x.timing.server.d2hMs;
        server += x.timing.server.totalMs;
        rt += x.timing.roundTripMs;
        enc += x.timing.encodeMs;
        dec += x.timing.decodeMs;
        if (r === 1) checkHashes(x.results);
      }

      const wall = performance.now() - w0;

      runs.push({ rep: r, candidates: nb, wallMs: wall, kernelMs: kernel, d1KernelMs: d1, poolKernelMs: poolK, h2dMs: h2d, d2hMs: d2h, serverTotalMs: server, roundTripMs: rt, encodeMs: enc, decodeAndRecordMs: dec, evalsPerSecond: (nb / wall) * 1000, kernelOnlyEvalsPerSecond: (nb / kernel) * 1000 });
    }

    const steady = runs.slice(1);

    scaling.push({ batch: b, firstCall: runs[0], steady: { wallMs: median(steady.map((x) => x.wallMs!)), kernelMs: median(steady.map((x) => x.kernelMs!)), d1KernelMs: median(steady.map((x) => x.d1KernelMs!)), poolKernelMs: median(steady.map((x) => x.poolKernelMs!)), h2dMs: median(steady.map((x) => x.h2dMs!)), d2hMs: median(steady.map((x) => x.d2hMs!)), roundTripMs: median(steady.map((x) => x.roundTripMs!)), encodeMs: median(steady.map((x) => x.encodeMs!)), decodeAndRecordMs: median(steady.map((x) => x.decodeAndRecordMs!)), evalsPerSecond: median(steady.map((x) => x.evalsPerSecond!)), kernelOnlyEvalsPerSecond: median(steady.map((x) => x.kernelOnlyEvalsPerSecond!)) }, runs });
    console.log(`GPU batch ${b}: ${(scaling.at(-1)!.steady as { evalsPerSecond: number }).evalsPerSecond.toFixed(1)} ev/s total, kernel-only ${(scaling.at(-1)!.steady as { kernelOnlyEvalsPerSecond: number }).kernelOnlyEvalsPerSecond.toFixed(1)} ev/s`);
  }

  result.gpu = { growthOnceMs, scaling, telemetry: smi.stop(0, Infinity) };
} else {
  // hybrid: CPU workers compute Growth books; the GPU evaluates D1 + pool in batches as they fill (pipelined)
  const { pool, startMs } = await cpuRun('hybrid growth', 'growth');
  const ready: EvalItem[] = [];
  let doneGrowth = false;
  let gpuBusyMs = 0;
  let batchesRun = 0;
  const smi = sampler();
  const h0 = performance.now();
  const gpuLoop = (async () => {
    for (;;) {
      if (ready.length >= hybridBatch || (doneGrowth && ready.length)) {
        const part = ready.splice(0, hybridBatch);
        const g0 = performance.now();
        const x = await gpu.evaluate(door, part, { returnTrades: false, returnLots: true, returnSeries: false, record: true, tradeCap, lotCap });

        gpuBusyMs += performance.now() - g0;
        batchesRun++;
        checkHashes(x.results);
      } else if (doneGrowth) return;
      else await new Promise((r) => setTimeout(r, 2));
    }
  })();

  await pool.run(subjects.map((s, i) => toTask(s, i, 'growth')), (t, _h, _ms, g) => {
    const i = Number(t.k);

    ready.push({ ...items[i]!, growth: g as VBook[] });
  });
  doneGrowth = true;
  await gpuLoop;

  const wall = (performance.now() - h0) / 1000;

  result.hybrid = { workers, hybridBatch, startSeconds: startMs / 1000, wallSeconds: wall, evalsPerSecond: n / wall, gpuBusySeconds: gpuBusyMs / 1000, batches: batchesRun, telemetry: smi.stop(h0, Infinity), workerStats: await pool.stats() };
  await pool.close();
  console.log(`hybrid ${workers} workers + GPU: ${(n / wall).toFixed(1)} ev/s (GPU busy ${(gpuBusyMs / 1000).toFixed(1)} s of ${wall.toFixed(1)} s)`);
}

await gpu.close();
result.recordsCompared = compared;
result.recordHashMismatches = mismatches;
result.wallSeconds = (Date.now() - t0) / 1000;
writeJson(out, result);
console.log(`records compared ${compared}, mismatches ${mismatches}; wrote ${out}`);

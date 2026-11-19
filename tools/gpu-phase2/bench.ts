// gpu-phase2 gate B1 (PROTOCOL.md §10; brief §6): NON-OFFICIAL benchmarks (purpose 'benchmark'; timings only, AD7: no
// money figure). On an otherwise idle Apollo:
//   sweep   GPU batch-size sweep per door: wall, server phases (D1, Growth, pool), encode/decode, evaluations/s, device
//           bytes, VRAM in use, power and temperature (1 s nvidia-smi sampling), host RSS;
//   mixes   at the production batch on D24: joint (Assignment 3 genomes), D1-only, Growth-only, detail + risk envelope
//           (the risk-envelope pilot's evaluation), all options;
//   pooled  end-to-end through the attested GpuPool (pipelined), 4 × batch tasks per door;
//   cpu     the 12-worker CPU baseline (Assignment 3's worker semantics, cpuEvalWorker) on the SAME tasks per door/mix;
//   maxb    the largest batch that fits the VRAM budget (attempted, not extrapolated);
//   display the display processes on the RTX 5090 (measured VRAM / utilization; no display change is made).
//   node --expose-gc --experimental-transform-types tools/gpu-phase2/bench.ts --out <json> [--quick]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { incumbents, vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { canonHash } from '../../src/gpu-backend/canon.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { type DoorKey, cacheDir, openDoor, writeJson } from '../../src/gpu-phase2/context.ts';
import { randomSubjects } from '../../src/gpu-phase2/subjects.ts';
import { CpuEvalPool } from '../../src/gpu-phase2/cpuEvalPool.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type Task } from '../../src/gpu-backend/client.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const out = args[args.indexOf('--out') + 1]!;
const quick = args.includes('--quick');
const binarySha = createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex');
const log = (s: string) => console.log(`[bench ${new Date().toISOString().slice(11, 19)}Z] ${s}`);
const smi = (q: string) => execFileSync('nvidia-smi', [`--query-gpu=${q}`, '--format=csv,noheader,nounits']).toString().trim().split(', ');

// a 1 s sampler of the GPU (and host RSS of this process tree)
class Sampler {
  rows: { t: number; util: number; memMiB: number; powerW: number; tempC: number; smClockMHz: number }[] = [];
  private timer: NodeJS.Timeout | null = null;
  start() {
    this.rows = [];
    this.timer = setInterval(() => {
      const [u, m, p, t, c] = smi('utilization.gpu,memory.used,power.draw,temperature.gpu,clocks.sm').map(Number);

      this.rows.push({ t: Date.now(), util: u!, memMiB: m!, powerW: p!, tempC: t!, smClockMHz: c! });
    }, 1000);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    const r = this.rows;
    const max = (f: (x: (typeof r)[number]) => number) => (r.length ? Math.max(...r.map(f)) : null);
    const mean = (f: (x: (typeof r)[number]) => number) => (r.length ? Math.round((r.reduce((a, x) => a + f(x), 0) / r.length) * 10) / 10 : null);

    return { samples: r.length, utilMeanPct: mean((x) => x.util), vramPeakMiB: max((x) => x.memMiB), powerMeanW: mean((x) => x.powerW), powerPeakW: max((x) => x.powerW), tempPeakC: max((x) => x.tempC), smClockMeanMHz: mean((x) => x.smClockMHz) };
  }
}
const sampler = new Sampler();
const rssMiB = () => Math.round(process.memoryUsage().rss / 2 ** 20);
const treeRssMiB = () => {
  try {
    const ps = execFileSync('ps', ['-eo', 'ppid,pid,rss']).toString().trim().split('\n').slice(1).map((l) => l.trim().split(/\s+/).map(Number));
    const kids = new Set([process.pid]);

    for (let changed = true; changed; ) {
      changed = false;
      for (const [pp, p] of ps) if (kids.has(pp!) && !kids.has(p!)) (kids.add(p!), (changed = true));
    }
    return Math.round(ps.filter(([, p]) => kids.has(p!)).reduce((a, [, , r]) => a + r!, 0) / 1024);
  } catch {
    return null;
  }
};

const mixes: Record<string, { options: EvalOptions; detail: boolean; risk?: boolean }> = {
  joint: { options: vOptions, detail: false },
  'd1-only': { options: { enabled: { 'G:GDX': false, 'G:VGT': false } }, detail: false },
  'growth-only': { options: { enabled: { 'D1:GDX': false, 'D1:VGT': false, 'G:GDX': false } }, detail: false },
  'growth-fixed': { options: vOptions, detail: false }, // every candidate carries New L0's Growth·VGT vector (D1 searched)
  'detail+risk': { options: vOptions, detail: true, risk: true },
  'all-options': { options: { enabled: {}, friction: { costBps: 20, rate: 0.14, stopSlippageBps: 25, stopFill: 'next-open' }, d1Arm: 'native', wholeShares: true }, detail: false }
};
const nl0G = incumbents().NL0.quad.g;
const tasksOf = (n: number, label: string, mix = 'joint'): Task[] =>
  randomSubjects(n, label).map((s) => ({ k: s.key, quad: mix === 'growth-fixed' ? { ...s.quad, g: nl0G } : s.quad, controls: s.controls, options: mixes[mix]!.options, detail: mixes[mix]!.detail, risk: mixes[mix]!.risk }));
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const swapUsedMiB = () => {
  const m = fs.readFileSync('/proc/meminfo', 'utf8');
  const v = (k: string) => Number(new RegExp(`${k}:\\s+(\\d+)`).exec(m)?.[1] ?? 0);

  return Math.round((v('SwapTotal') - v('SwapFree')) / 1024);
};
const gpuHashes = new Map<string, string>(); // task key → record hash (GPU), compared with the CPU baseline's

const rec: Record<string, unknown> = {
  kind: 'gpu-phase2 B1 benchmarks (non-official, timings only)',
  t: new Date().toISOString(),
  host: { name: os.hostname(), cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, memGiB: Math.round(os.totalmem() / 2 ** 30) },
  gpu: Object.fromEntries(['name', 'uuid', 'driver_version', 'memory.total', 'power.limit', 'clocks.max.sm'].map((q) => [q, smi(q)[0]])),
  binary: { path: path.relative(process.cwd(), serverBinary), sha256: binarySha },
  node: process.version
};

// ----- display processes on the GPU (measured only) -----
try {
  rec.display = execFileSync('nvidia-smi', ['--query-compute-apps=pid,process_name,used_memory', '--format=csv,noheader']).toString().trim() || 'no compute apps';
  rec.displayGraphics = execFileSync('nvidia-smi', []).toString().split('\n').filter((l) => / G /.test(l)).map((l) => l.replace(/\s+/g, ' ').trim());
  try {
    rec.pmonIdle = execFileSync('nvidia-smi', ['pmon', '-c', '5', '-s', 'um']).toString().trim().split('\n');
  } catch (e) {
    rec.pmonIdle = `unavailable: ${(e as Error).message.slice(0, 200)}`;
  }
  rec.idle = Object.fromEntries(['utilization.gpu', 'memory.used', 'power.draw', 'temperature.gpu', 'clocks.sm'].map((q) => [q, Number(smi(q)[0])]));
} catch (e) {
  rec.display = `unavailable: ${(e as Error).message}`;
}

const doors: DoorKey[] = quick ? ['D24'] : ['D19', 'D24', 'FULL'];
const sizes = quick ? [1, 1024, 8192] : [1, 64, 256, 1024, 2048, 4096, 8192, 16384];
const sweep: unknown[] = [];
const pooled: unknown[] = [];
const cpu: unknown[] = [];
const mixRows: unknown[] = [];

for (const d of doors) {
  const door = await openDoor(d, 'B1 benchmark');
  const ds = exportDataset(door, cacheDir);
  // cold start: server process start → INFO → dataset load → the first 1,024-candidate batch returned
  const c0 = performance.now();
  const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
  const info = await server.info();
  const c1 = performance.now();

  await server.load(ds.file);
  const c2 = performance.now();
  const first = await server.evaluate(door, tasksOf(1024, `BW-${d}`), { record: true });
  const c3 = performance.now();

  rec[`cold-${d}`] = { serverStartMs: Math.round(c1 - c0), datasetLoadMs: Math.round(c2 - c1), firstBatch1024Ms: Math.round(c3 - c2), firstBatchServerMs: Math.round(first.receipt.server.totalMs), datasetBytes: fs.statSync(ds.file).size };
  log(`cold ${d}: ${JSON.stringify(rec[`cold-${d}`])}`);
  for (const n of sizes) {
    const tasks = tasksOf(n, `B-${d}`);
    const reps: { wall: number; r: Awaited<ReturnType<typeof server.evaluate>> }[] = [];

    sampler.start();
    for (let k = 0; k < 3; k++) {
      const t0 = performance.now();
      const r = await server.evaluate(door, tasks, { record: true }, info.uuid);

      reps.push({ wall: performance.now() - t0, r });
    }
    const s = sampler.stop();
    const wall = median(reps.map((x) => x.wall));
    const r = reps.find((x) => x.wall === wall)!.r;
    const hashes = reps.map((x) => canonHash(x.r.results.map((y) => canonHash(y.record))));

    if (n === Math.max(...sizes)) for (const x of r.results) gpuHashes.set(x.key, canonHash(x.record));
    const row = {
      door: d,
      batch: n,
      repetitions: 3,
      wallMsAll: reps.map((x) => Math.round(x.wall)),
      recordsHash: hashes[0],
      repeatIdentical: hashes.every((h) => h === hashes[0]),
      wallMs: Math.round(wall),
      evPerS: Math.round((n / wall) * 1000 * 10) / 10,
      serverMs: Math.round(r.receipt.server.totalMs),
      d1Ms: Math.round(r.receipt.server.d1Ms),
      growthMs: Math.round(r.receipt.server.gMs),
      poolMs: Math.round(r.receipt.server.poolMs),
      encodeMs: Math.round(r.timing.encodeMs),
      decodeMs: Math.round(r.timing.decodeMs),
      deviceMiB: Math.round(r.receipt.server.deviceBytes / 2 ** 20),
      notOk: r.results.filter((x) => x.status !== 0).length,
      hostRssMiB: rssMiB(),
      swapUsedMiB: swapUsedMiB(),
      ...s
    };

    sweep.push(row);
    log(JSON.stringify(row));
  }
  // mixes at the production batch (D24 only)
  if (d === 'D24')
    for (const m of Object.keys(mixes)) {
      const n = quick ? 2048 : 8192;
      const tasks = tasksOf(n, `BM-${m}`, m);

      sampler.start();
      const t0 = performance.now();
      const r = await server.evaluate(door, tasks, { record: true }, info.uuid);
      const wall = performance.now() - t0;

      for (const x of r.results) gpuHashes.set(`${m}|${x.key}`, canonHash(x.record));
      const row = { door: d, mix: m, batch: n, wallMs: Math.round(wall), evPerS: Math.round((n / wall) * 1000 * 10) / 10, serverMs: Math.round(r.receipt.server.totalMs), d1Ms: Math.round(r.receipt.server.d1Ms), growthMs: Math.round(r.receipt.server.gMs), poolMs: Math.round(r.receipt.server.poolMs), encodeMs: Math.round(r.timing.encodeMs), decodeMs: Math.round(r.timing.decodeMs), deviceMiB: Math.round(r.receipt.server.deviceBytes / 2 ** 20), ...sampler.stop() };

      mixRows.push(row);
      log(JSON.stringify(row));
    }
  // end-to-end through the attested pool (pipelined), 4 batches
  {
    const n = quick ? 8192 : 32768;
    const tasks = tasksOf(n, `BP-${d}`);
    const ledger = path.join(cacheDir, `bench-ledger-${d}.jsonl`);
    const pool = new GpuPool({ door, session: null, server, uuid: info.uuid, ledgerFile: ledger, batchSize: 8192, lingerMs: 25 });

    sampler.start();
    const t0 = performance.now();
    let got = 0;

    await pool.run(tasks, () => got++);
    const wall = performance.now() - t0;
    const row = { door: d, tasks: n, batch: 8192, returned: got, wallMs: Math.round(wall), evPerS: Math.round((n / wall) * 1000 * 10) / 10, cpuScored: pool.counters.cpuScored, batches: pool.counters.batches, kernelMs: Math.round(pool.counters.kernelMs), hostRssMiB: rssMiB(), ...sampler.stop() };

    await pool.close();
    fs.rmSync(ledger, { force: true });
    pooled.push(row);
    log(JSON.stringify(row));
  }
  // the largest batch that fits (D24 only): attempted at increasing sizes until the server refuses
  if (d === 'D24' && !quick) {
    const attempts: unknown[] = [];

    for (const n of [24576, 32768, 49152]) {
      try {
        sampler.start();
        const t0 = performance.now();
        const r = await server.evaluate(door, tasksOf(n, `BX-${n}`), { record: true }, info.uuid);
        const wall = performance.now() - t0;

        attempts.push({ batch: n, ok: true, wallMs: Math.round(wall), evPerS: Math.round((n / wall) * 1000 * 10) / 10, deviceMiB: Math.round(r.receipt.server.deviceBytes / 2 ** 20), hostRssMiB: rssMiB(), ...sampler.stop() });
      } catch (e) {
        sampler.stop();
        attempts.push({ batch: n, ok: false, error: (e as Error).message.slice(0, 300) });
        break;
      }
      log(JSON.stringify(attempts.at(-1)));
    }
    rec.maxBatch = attempts;
  }
  await server.close();

  // ----- the CPU baseline: 12 workers, Assignment 3's worker semantics, the SAME task generator -----
  for (const m of d === 'D24' ? Object.keys(mixes) : ['joint']) {
    const n = quick ? 600 : m === 'joint' ? 4800 : 2400;
    const tasks = tasksOf(n, m === 'joint' ? `B-${d}` : `BM-${m}`, m);
    const pool = new CpuEvalPool(12, { kind: 'market', name: d });

    await pool.start();
    const t0 = performance.now();
    let got = 0;
    let peak = 0;
    const timer = setInterval(() => (peak = Math.max(peak, treeRssMiB() ?? 0)), 2000);

    let compared = 0;
    let differ = 0;

    await pool.run(tasks, (t, v) => {
      got++;
      const g = gpuHashes.get(m === 'joint' ? t.k : `${m}|${t.k}`);

      if (g !== undefined) {
        compared++;
        if (g !== canonHash(v)) differ++;
      }
    });
    clearInterval(timer);
    const wall = performance.now() - t0;
    const row = { door: d, mix: m, workers: 12, tasks: n, returned: got, recordsComparedWithGpu: compared, recordsDiffering: differ, wallMs: Math.round(wall), evPerS: Math.round((n / wall) * 1000 * 10) / 10, workerMsPerEval: Math.round((pool.computeMs / n) * 10) / 10, treeRssPeakMiB: peak };

    await pool.close();
    cpu.push(row);
    log(JSON.stringify(row));
  }
}

rec.sweep = sweep;
rec.mixes = mixRows;
rec.pooled = pooled;
rec.cpu = cpu;
rec.finished = new Date().toISOString();
writeJson(out, rec);
log(`written ${out}`);

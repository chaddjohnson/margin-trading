// gpu-phase3 (PROTOCOL.md §4): real optimizer jobs for the engineering benchmarks and identity checks — NON-OFFICIAL
// (purpose benchmark / parity-test). The search code of a completed study runs UNCHANGED on a pool (the GPU pool, or the
// CPU worker pool of the non-official CPU arm), with the job body of that study's stages.ts carried over line for line
// (base islands, extension rounds at barriers with the resource guard, finish):
//
//   --job a3:<C>:<broad1|broad2>   replay of an Assignment 3 broad job (Growth searched jointly; src/vg-l0-full-joint)
//   --job a2:<C>:<base|onset1|onset2>  replay of an Assignment 2 broad job (Growth fixed to New L0's phenotype;
//                                  src/vg-l0-risk-families), compared with its sealed record
//   --job mini                     Assignment 3's broad lane on a reduced, declared schedule (the small-batch control and
//                                  the fixed-seed mini-optimization), --door, --cells, --replicates
//
// Every run writes into research/gpu-phase3/results/optimizer/<run>/<backend>/ only: result.json (lanes, rounds,
// compute), archive-digest.json (every archived record hashed in the store's encoding), receipts.jsonl and
// telemetry.jsonl (GPU), profile.json (wall time, main-thread event-loop utilization, GC, CPU, memory, the pool's phase
// sums). Timings never select or tune anything; nothing here is official optimization evidence.
//
//   node --expose-gc --experimental-transform-types tools/gpu-phase3/replay.ts --backend gpu|cpu --run <name> --job <job>
//     [--batch 8192] [--linger 30] [--host-workers N] [--stop-after N] [--workers 12]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import {
  Lane as A3Lane,
  type Budget as A3Budget,
  type LaneSpec as A3LaneSpec
} from '../../src/vg-l0-full-joint/search.ts';
import {
  budgets as a3Budgets,
  finishReserve as a3Finish,
  perLaneCap as a3Cap
} from '../../src/vg-l0-full-joint/budgets.ts';
import { cellOf as a3CellOf } from '../../src/vg-l0-full-joint/space.ts';
import {
  cellsOfPart as a3CellsOfPart,
  cutoffs as a3Cutoffs,
  type Part as A3Part
} from '../../src/vg-l0-full-joint/stages.ts';
import { codeDigest as a3CodeDigest } from '../../src/vg-l0-full-joint/lab.ts';
import { Lane as A2Lane } from '../../src/vg-l0-risk-families/search.ts';
import {
  budgets as a2Budgets,
  finishReserve as a2Finish,
  perLaneCap as a2Cap
} from '../../src/vg-l0-risk-families/budgets.ts';
import {
  cellsOfPart as a2CellsOfPart,
  cutoffs as a2Cutoffs,
  type Part as A2Part
} from '../../src/vg-l0-risk-families/stages.ts';
import { codeDigest as a2CodeDigest } from '../../src/vg-l0-risk-families/lab.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { cacheDir, openDoor, resultsDir, writeJson } from '../../src/gpu-phase3/context.ts';
import { CpuEvalPool } from '../../src/gpu-phase3/cpuEvalPool.ts';
import { EvalLab, StopRequested } from '../../src/gpu-backend/lab.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { compatManifest } from '../../src/gpu-backend/compat.ts';
import { encode } from '../../src/growth140-vgt-s8m/store.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { A2Lab } from './a2lab.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const backend = opt('backend', 'gpu') as 'gpu' | 'cpu';
const run = opt('run', 'mini');
const job = opt('job', 'mini').split(':');
const family = job[0] as 'a3' | 'a2' | 'mini';
const stopAfter = args.includes('--stop-after') ? Number(opt('stop-after', '0')) : undefined;
const outDir = path.join(resultsDir, 'optimizer', run, backend);
const cacheRoot = path.join(cacheDir, 'replay', run, backend);
const log = (s: string) => console.log(`[replay ${run} ${backend} ${new Date().toISOString().slice(11, 19)}Z] ${s}`);

// the declared mini schedule (Phase 2's G7 schedule): Assignment 3's broad lane at reduced counts
const miniBudget: A3Budget = {
  ...a3Budgets.study.broad,
  screen: Number(opt('screen', '96')),
  promote: 12,
  islands: 2,
  islandsMax: 3,
  population: 8,
  newPerIsland: 24,
  r1: 8,
  r2: 16,
  r2Keep: 4,
  r3: 24,
  r3Keep: 2,
  refineN: 6,
  shortlist: 2,
  generations: 40,
  patience: 4
};

interface Plan {
  door: 'D19' | 'D21' | 'D23' | 'D24';
  cutoff: string;
  specs: { position: string; key: string }[];
  budget: unknown;
  cap: number;
  reserve: number;
  codeDigest: string;
  lanes: (
    lab: never
  ) => {
    spec: { position: string; key: string };
    base(): Promise<unknown>;
    extend(): Promise<unknown>;
    finish(reason: string): Promise<unknown>;
    requested: number;
    lastTrigger?: { fired: boolean } | null;
    atCap: boolean;
    islandWorstCase: number;
  }[];
}

const plan = ((): Plan => {
  if (family === 'a3') {
    const [cut, part] = [job[1]!, job[2]! as A3Part];
    const specs: A3LaneSpec[] = a3CellsOfPart(part).flatMap((c) =>
      Array.from({ length: 2 }, (_v, i) => {
        const key = `${cut}/broad/${c.id}/R${i + 1}`;

        return {
          key,
          seedKey: key,
          position: key,
          stage: 'broad' as const,
          replicate: i + 1,
          cutoff: cut,
          kind: 'indep' as const,
          res: 'coarse' as const,
          cell: c
        };
      })
    );

    return {
      door: a3Cutoffs[cut]!.door as Plan['door'],
      cutoff: cut,
      specs,
      budget: a3Budgets.study.broad,
      cap: specs.length * a3Cap.broad,
      reserve: a3Finish.broad,
      codeDigest: a3CodeDigest(),
      lanes: (lab) => specs.map((s) => new A3Lane(lab, s, a3Budgets.study.broad)) as never
    };
  }
  if (family === 'a2') {
    const [cut, part] = [job[1]!, job[2]! as A2Part];
    const specs = a2CellsOfPart(part).flatMap((cell) =>
      Array.from({ length: 2 }, (_v, i) => {
        const key = `${cut}/broad/${cell.id}/R${i + 1}`;

        return {
          key,
          seedKey: key,
          position: key,
          stage: 'broad' as const,
          replicate: i + 1,
          cutoff: cut,
          kind: 'indep' as const,
          cell
        };
      })
    );

    return {
      door: a2Cutoffs[cut]!.door as Plan['door'],
      cutoff: cut,
      specs,
      budget: a2Budgets.study.broad,
      cap: specs.length * a2Cap.broad,
      reserve: a2Finish.broad,
      codeDigest: a2CodeDigest(),
      lanes: (lab) => specs.map((s) => new A2Lane(lab, s, a2Budgets.study.broad)) as never
    };
  }
  const door = opt('door', 'D19') as Plan['door'];
  const cut = door === 'D19' ? 'C19' : door === 'D21' ? 'C21' : door === 'D23' ? 'C23' : 'C24';
  const cells = opt('cells', 'GA0.VA0,GB1.VD0,GC0.VB1,GD1.VC0,GA1.VD1,GB0.VC1,GC1.VA1,GD0.VB0').split(',');
  const replicates = Number(opt('replicates', '2'));
  const specs: A3LaneSpec[] = cells.flatMap((id) =>
    Array.from({ length: replicates }, (_v, i) => {
      const key = `${cut}/broad/${id}/R${i + 1}`;

      return {
        key,
        seedKey: key,
        position: key,
        stage: 'broad' as const,
        replicate: i + 1,
        cutoff: cut,
        kind: 'indep' as const,
        res: 'coarse' as const,
        cell: a3CellOf(id)
      };
    })
  );

  return {
    door,
    cutoff: cut,
    specs,
    budget: miniBudget,
    cap: specs.length * 1_000_000,
    reserve: a3Finish.broad,
    codeDigest: a3CodeDigest(),
    lanes: (lab) => specs.map((s) => new A3Lane(lab, s, miniBudget)) as never
  };
})();

// ----- profiling: main-thread event-loop utilization, GC, CPU and memory (sampled; never a decision input) -----
const gcByKind: Record<string, { n: number; ms: number }> = {};
const gcObs = new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    const kind = String((e as unknown as { detail?: { kind?: number } }).detail?.kind ?? 'unknown');

    gcByKind[kind] ??= { n: 0, ms: 0 };
    gcByKind[kind].n++;
    gcByKind[kind].ms += e.duration;
  }
});

gcObs.observe({ entryTypes: ['gc'] });
fs.mkdirSync(outDir, { recursive: true });

const samples: Record<string, number | string>[] = [];
let lastElu = performance.eventLoopUtilization();
let lastCpu = process.cpuUsage();
let lastT = performance.now();
const sampler = setInterval(() => {
  const elu = performance.eventLoopUtilization(lastElu);
  const cpu = process.cpuUsage(lastCpu);
  const now = performance.now();
  const m = process.memoryUsage();

  samples.push({
    t: new Date().toISOString(),
    elu: Math.round(elu.utilization * 1000) / 1000,
    cpuCores: Math.round(((cpu.user + cpu.system) / 1000 / (now - lastT)) * 100) / 100,
    rssMiB: Math.round(m.rss / 2 ** 20),
    heapMiB: Math.round(m.heapUsed / 2 ** 20),
    externalMiB: Math.round(m.external / 2 ** 20),
    arrayBuffersMiB: Math.round(m.arrayBuffers / 2 ** 20)
  });
  lastElu = performance.eventLoopUtilization();
  lastCpu = process.cpuUsage();
  lastT = now;
}, 2000);

sampler.unref();

const door = await openDoor(plan.door, `gpu-phase3 replay (${backend}, non-official benchmark / identity)`);
const doorPin = `GDX:${doorSpecs[plan.door].pins.GDX.sha256},VGT:${doorSpecs[plan.door].pins.VGT.sha256}`;
let pool;
let backendId: string;
let serverInfo: Record<string, unknown> | null = null;

if (backend === 'gpu') {
  const ds = exportDataset(door, cacheDir);
  const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
  const info = await server.info();

  if (!(await server.smoke()).ok) throw new Error('smoke failed');
  await server.load(ds.file);
  serverInfo = {
    uuid: info.uuid,
    compatDigest: info.compatDigest,
    binarySha256: createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex'),
    binary: path.relative(process.cwd(), serverBinary)
  };
  backendId = `gpu:${info.uuid}:${(serverInfo.binarySha256 as string).slice(0, 16)}:${compatManifest().digest.slice(0, 16)}`;
  pool = new GpuPool({
    door,
    session: null,
    server,
    uuid: info.uuid,
    ledgerFile: path.join(outDir, 'receipts.jsonl'),
    telemetryFile: path.join(outDir, 'telemetry.jsonl'),
    batchSize: Number(opt('batch', '8192')),
    lingerMs: Number(opt('linger', '30')),
    log,
    ...(args.includes('--host-workers') ? { hostWorkers: Number(opt('host-workers', '0')) } : {})
  } as ConstructorParameters<typeof GpuPool>[0]);
} else {
  backendId = `cpu:${opt('workers', '12')} workers`;
  pool = new CpuEvalPool(Number(opt('workers', '12')), { kind: 'market', name: plan.door });
}

const labOptions = {
  study: 'research/gpu-phase3',
  job: `replay-${run}`,
  door: plan.door,
  doorPin,
  purpose: family === 'mini' ? 'parity-test mini-optimization' : `benchmark: replay of ${job.join(':')}`,
  pool,
  backend: backendId,
  codeDigest: plan.codeDigest,
  cacheRoot,
  stopAfterFresh: stopAfter,
  ...(family === 'mini' ? {} : { maxFresh: plan.cap }),
  log
};
const lab = family === 'a2' ? new A2Lab(labOptions) : new EvalLab(labOptions);

// archive-write time (main thread), measured around the store's write
let storeWriteMs = 0;
let storeWrites = 0;
const storeWrite = lab.store.write.bind(lab.store);

lab.store.write = ((table: string, key: string, value: unknown) => {
  const t = performance.now();

  storeWrite(table as never, key, value as never);
  storeWriteMs += performance.now() - t;
  storeWrites++;
}) as typeof lab.store.write;

await lab.open();

const t0 = Date.now();
const eluAtStart = performance.eventLoopUtilization();
const cpuAtStart = process.cpuUsage();
let record: Record<string, unknown>;

try {
  const lanes = plan.lanes(lab as never);
  const requested = () => lanes.reduce((a, l) => a + l.requested, 0);
  const rounds: unknown[] = [];
  const cap = plan.cap;

  lab.stage = `replay ${run}: base (${lanes.length} lanes)`;
  await Promise.all(lanes.map((l) => l.base()));

  const stops = new Map<string, string>();

  for (let round = 1; ; round++) {
    const live = lanes.filter((l) => !stops.has(l.spec.position));

    if (!live.length) break;

    const row = {
      round,
      positions: [] as { position: string; fired: boolean; extended: boolean; atCap: boolean }[],
      requestedBefore: requested(),
      worstCase: 0,
      decision: ''
    };
    const go: typeof lanes = [];

    for (const l of live) {
      const fired = l.lastTrigger?.fired ?? false;
      const atCap = l.atCap;

      row.positions.push({ position: l.spec.position, fired, extended: fired && !atCap, atCap });
      if (!fired) stops.set(l.spec.position, 'triggers not met');
      else if (atCap)
        stops.set(l.spec.position, 'extension cap reached (a trigger still fired: budget-bound, not converged)');
      else go.push(l);
    }
    row.worstCase = go.reduce((a, l) => a + l.islandWorstCase, 0);
    if (go.length && requested() + row.worstCase + plan.reserve * lanes.length > cap) {
      for (const l of go) stops.set(l.spec.position, 'resource guard (the job cap on fresh simulations)');
      row.decision =
        family === 'a2'
          ? `resource guard: ${requested()} requested + worst case ${row.worstCase} + finishing reserve ${plan.reserve * lanes.length} > cap ${cap}`
          : 'resource guard';
      rounds.push(row);
      break;
    }
    row.decision = go.length ? `extend ${go.length} lane(s)` : 'no lane extends';
    rounds.push(row);
    if (!go.length) break;
    lab.stage = `replay ${run}: extension round ${round}`;
    lab.checkpoint({ extensionRound: round, extending: go.map((l) => l.spec.key) });
    await Promise.all(go.map((l) => l.extend()));
  }

  lab.stage = `replay ${run}: finishing`;

  const results = await Promise.all(
    lanes.map((lane) => lane.finish(stops.get(lane.spec.position) ?? 'triggers not met'))
  );

  record = {
    kind: 'gpu-phase3 optimizer-job replay',
    job: job.join(':'),
    backend,
    backendId,
    server: serverInfo,
    run,
    door: plan.door,
    cutoff: plan.cutoff,
    lanesCount: plan.specs.length,
    budget: plan.budget,
    cap: plan.cap,
    extensionRounds: rounds,
    lanes: results,
    compute: lab.compute,
    minutes: Math.round((Date.now() - t0) / 600) / 100,
    finished: new Date().toISOString()
  };
} catch (error) {
  if (error instanceof StopRequested) {
    await lab.close(`stopped: ${error.reason}`);
    log(`stopped (${error.reason}); resume with the same command`);
    process.exit(75);
  }
  await lab.close(`failed: ${(error as Error).message.split('\n')[0]}`);
  throw error;
}

const wallMs = Date.now() - t0;
const elu = performance.eventLoopUtilization(eluAtStart);
const cpu = process.cpuUsage(cpuAtStart);
// the archive's rows and configs (key → record hash in the store's encoding: ±Infinity and NaN kept distinct), streamed to
// results/raw-large/ as JSONL (git-ignored; a 2-million-row job does not fit in one string) and digested incrementally
const rawDir = path.join(resultsDir, 'raw-large', 'optimizer', run, backend);
const archived = { rows: 0, configs: 0, rowsSha256: '', configsSha256: '' };

lab.store.commit();
fs.mkdirSync(rawDir, { recursive: true });
for (const table of ['points', 'configs'] as const) {
  const file = path.join(rawDir, `${table === 'points' ? 'rows' : 'configs'}.jsonl`);
  const fd = fs.openSync(file, 'w');
  const hashes = new Map<string, string>();

  for (const [k, v] of lab.store.iterate(table)) {
    const h = createHash('sha256').update(encode(v)).digest('hex').slice(0, 20);

    hashes.set(k, h);
    fs.writeSync(fd, `${JSON.stringify([k, h])}\n`);
  }
  fs.closeSync(fd);
  const keys = [...hashes.keys()].sort();
  const d = createHash('sha256');

  keys.forEach((k, i) => d.update(`${i ? '\n' : ''}${k}=${hashes.get(k)}`));
  if (table === 'points') [archived.rows, archived.rowsSha256] = [keys.length, d.digest('hex')];
  else [archived.configs, archived.configsSha256] = [keys.length, d.digest('hex')];
}
await lab.close('job-end');
clearInterval(sampler);
gcObs.disconnect();

// the pool's per-batch phase sums (GPU receipts ledger)
const ledger =
  backend === 'gpu' && fs.existsSync(path.join(outDir, 'receipts.jsonl'))
    ? fs
        .readFileSync(path.join(outDir, 'receipts.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l) as Record<string, number>)
        .filter((r) => 'nonce' in r)
    : [];
const sum = (k: string) => Math.round(ledger.reduce((a, r) => a + (r[k] ?? 0), 0));
const sizes = ledger.map((r) => r.n!).sort((a, b) => a - b);
const profile = {
  kind: 'gpu-phase3 replay profile',
  run,
  job: job.join(':'),
  backend,
  backendId,
  hostWorkers: args.includes('--host-workers') ? Number(opt('host-workers', '0')) : null,
  batchSize: Number(opt('batch', '8192')),
  wallSeconds: Math.round(wallMs / 100) / 10,
  fresh: lab.compute.fresh,
  evaluationsPerSecond: Math.round((lab.compute.fresh / wallMs) * 1000 * 10) / 10,
  mainThread: {
    eventLoopUtilization: Math.round(elu.utilization * 1000) / 1000,
    activeSeconds: Math.round(elu.active / 100) / 10,
    idleSeconds: Math.round(elu.idle / 100) / 10
  },
  processCpuSeconds: { user: Math.round(cpu.user / 1e5) / 10, system: Math.round(cpu.system / 1e5) / 10 },
  archive: { writes: storeWrites, writeSeconds: Math.round(storeWriteMs / 100) / 10 },
  gc: Object.fromEntries(
    Object.entries(gcByKind).map(([k, v]) => [k, { n: v.n, seconds: Math.round(v.ms / 100) / 10 }])
  ),
  batches: ledger.length
    ? {
        n: ledger.length,
        candidates: sizes.reduce((a, b) => a + b, 0),
        median: sizes[Math.floor(sizes.length / 2)],
        min: sizes[0],
        max: sizes.at(-1),
        under1024: sizes.filter((x) => x < 1024).length,
        serverSeconds: sum('serverMs') / 1000,
        encodeSeconds: sum('encodeMs') / 1000,
        decodeSeconds: sum('decodeMs') / 1000,
        batchWallSeconds: sum('wallMs') / 1000
      }
    : null,
  peakRssMiB: Math.max(0, ...samples.map((s) => Number(s.rssMiB))),
  samples
};

writeJson(path.join(outDir, 'result.json'), record);
writeJson(path.join(outDir, 'profile.json'), profile);
writeJson(path.join(outDir, 'archive-digest.json'), archived);
log(
  `done: ${archived.rows} archived evaluations, ${record.minutes} min, ${profile.evaluationsPerSecond} ev/s, main-thread ELU ${profile.mainThread.eventLoopUtilization}`
);

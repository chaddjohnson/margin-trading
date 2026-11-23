// gpu-phase8 (research/gpu-phase8/PROTOCOL.md §5): real optimizer jobs on the automatic JOB ISOLATION of
// src/gpu-jobs/jobs.ts — NON-OFFICIAL (purpose benchmark / parity-test / diagnostic; never official optimization
// evidence). The job body is tools/gpu-phase5/replay.ts's, unchanged — itself tools/gpu-phase3/replay.ts's, the job body
// of each completed study's stages.ts (base islands, extension rounds at barriers with the resource guard, finish) — on
// the accepted GPU pool, or the non-official CPU arm. What changes against Phase 5 is only WHERE a job lives and WHO may
// write it: Phase 5's per-tool pid lock and hand-assembled directories are replaced by openJob:
//
//   --job-name <name>            the job (omitted: a fresh name `<family>-<UTC>-<random>` is allocated and printed);
//                                its records research/gpu-phase8/results/jobs/<name>/ (job.json, events.jsonl,
//                                receipts.jsonl, telemetry.jsonl, result.json, profile.json, archive-digest.json,
//                                complete.json, logs/), its state research/gpu-phase8/cache/jobs/<name>/ (archive,
//                                checkpoint, lock, its own dataset cache dataset/), its key maps under
//                                results/raw-large/jobs/<name>/
//   --resume                     continue the job (its own identity must match; its archive is read back)
//   --shared-dataset <dir>       an explicitly shared dataset cache instead of the job's own
//   --job a3:<C>:<part> | a2:<C>:<part> | mini   as in Phase 3 / 5
//   --backend gpu|cpu --workers N (cpu) --lanes <i>/<k> --stop-after <N> (exit 75) --barrier <dir> --group <k>
//   --batch 8192 --linger 30 --host-workers 8 --vram-budget-mb N --tag <label>
//   --risk                       (GPU Phase 7) every evaluation requests the risk envelope (EvalLab items `risk: true`,
//                                archived under `|risk` keys with { ...record, envelope }); the search code is unchanged
//                                and never reads the envelope, so the job's decisions must equal the plain job's. Part of
//                                the job's identity (a risk job never resumes a plain one). a3 and mini jobs only.
//
// A refused start (JOB_ACTIVE, JOB_EXISTS, JOB_IDENTITY_CONFLICT, …) prints `JOB-REFUSED <code>` and exits 3 before any
// evaluation. Timings never select or tune anything.
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
import { openDoor, resultsDir, writeJson } from '../../src/gpu-phase8/context.ts';
import { EvalLab, StopRequested } from '../../src/gpu-backend/lab.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { compatManifest } from '../../src/gpu-backend/compat.ts';
import { encode } from '../../src/growth140-vgt-s8m/store.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { engineRuntime } from '../../src/gpu-backend/runtime.ts';
import { A2Lab } from '../gpu-phase5/a2lab.ts';
import { JobError, labOptionsOf, openJob, poolFilesOf } from '../../src/gpu-jobs/jobs.ts';
// gpu-phase8: Priority 4's derived lane (both arms) and its spaces — the staged mini-optimization and the Stage B CTRL lane
// replays (OFF parity at the search level)
import { Lane as P4Lane } from '../../src/vg-l0-staged-stop/search.ts';
import { armOf } from '../../src/vg-l0-staged-stop/context.ts';
import { ctrlSpace, expSpace } from '../../src/vg-l0-staged-stop/space.ts';
import { importClosure } from '../../src/vg-l0-full-joint/records.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const purpose = process.env.GPU_POLICY_PURPOSE ?? '';

if (!['benchmark', 'parity-test', 'diagnostic'].includes(purpose))
  throw new Error(
    `gpu-phase8 job: declare a non-official purpose (GPU_POLICY_PURPOSE=benchmark|parity-test|diagnostic), got "${purpose}"`
  );

const backend = opt('backend', 'gpu') as 'gpu' | 'cpu';
const jobSpec = opt('job', 'mini');
const job = jobSpec.split(':');
const family = job[0] as 'a3' | 'a2' | 'mini' | 'p4' | 'sb';
const stopAfter = args.includes('--stop-after') ? Number(opt('stop-after', '0')) : undefined;
const [laneI, laneK] = opt('lanes', '0/1').split('/').map(Number) as [number, number];
const tag = opt('tag', '');
const resume = args.includes('--resume');
const tStart = new Date().toISOString();

if (!(Number.isInteger(laneK) && laneK >= 1 && Number.isInteger(laneI) && laneI >= 0 && laneI < laneK))
  throw new Error(`--lanes ${opt('lanes', '')}: expected i/k with 0 ≤ i < k`);

// ----- the job: identity, ownership, namespaces (src/gpu-jobs/jobs.ts) — nothing is evaluated before it is owned -----
// The definition is what makes two runs the same job (resume) — never a time, a process, a batch size or a worker count
// (those do not change results: Phase 3–5 determinism evidence).
const riskMode = args.includes('--risk');
const definition = {
  tool: 'tools/gpu-phase8/job.ts',
  job: jobSpec,
  lanes: `${laneI}/${laneK}`,
  backend,
  ...(riskMode ? { risk: true } : {}),
  ...(family === 'mini' || family === 'p4'
    ? {
        door: opt('door', 'D19'),
        cells: opt('cells', 'GA0.VA0,GB1.VD0,GC0.VB1,GD1.VC0,GA1.VD1,GB0.VC1,GC1.VA1,GD0.VB0'),
        replicates: Number(opt('replicates', '2')),
        screen: Number(opt('screen', '96'))
      }
    : {})
};
let theJob: ReturnType<typeof openJob>;

try {
  theJob = openJob({
    study: 'research/gpu-phase8',
    ...(args.includes('--job-name') ? { job: opt('job-name', '') } : { label: family }),
    resume,
    identity: definition,
    purpose,
    ...(args.includes('--shared-dataset') ? { datasetCache: { shared: path.resolve(opt('shared-dataset', '')) } } : {})
  });
} catch (e) {
  if (e instanceof JobError) {
    console.log(`JOB-REFUSED ${e.code} ${e.message}`);
    process.exit(3);
  }
  throw e;
}

const J = theJob;
const run = J.name;
const outDir = J.dirs.results;
const log = (s: string) => J.log(`${backend} ${s}`);

log(`job ${J.id}: ${J.resumed ? 'resumed' : 'new'}${J.allocated ? ' (name allocated)' : ''}, instance ${J.instance}, pid ${process.pid}, dataset cache ${J.datasetShared ? `shared ${J.dirs.dataset}` : 'its own'}`);

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
  lanes: (lab: never) => {
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

// gpu-phase8: the digest of Priority 4's lane closure (the p4 and sb families)
const p4CodeDigest = () => {
  const files = importClosure([path.join(process.cwd(), 'src/vg-l0-staged-stop/search.ts'), path.join(process.cwd(), 'src/vg-l0-staged-stop/space.ts')]);

  return createHash('sha256')
    .update(files.map((f) => `${f}:${createHash('sha256').update(fs.readFileSync(f)).digest('hex')}`).join('\n'))
    .digest('hex');
};

// the fixed-total-work partition: lane index i of the full job belongs to part i mod k
const part = <T>(xs: T[]) => xs.filter((_x, i) => i % laneK === laneI);

const plan = ((): Plan => {
  // gpu-phase8: one Stage B CTRL lane (sb:<C>:<cell>:R<r>), replayed by Priority 4's derived lane with the CTRL arm
  // (Assignment 3's space, P0) on Stage B's schedule and lane cap; its result must equal Stage B's sealed lane
  if (family === 'sb') {
    const [cut, cellId, rep] = [job[1]!, job[2]!, job[3]!];
    const r = Number(rep.replace(/^R/, ''));
    const key = `${cut}/broad/${cellId}/R${r}`;
    const spec = { key, seedKey: key, position: key, stage: 'broad' as const, replicate: r, cutoff: cut, kind: 'indep' as const, res: 'coarse' as const, cell: a3CellOf(cellId) };
    const door = ({ C19: 'D19', C21: 'D21', C24: 'D24' } as Record<string, Plan['door']>)[cut]!;

    return {
      door,
      cutoff: cut,
      specs: [spec],
      budget: a3Budgets.study.broad,
      cap: 41_000,
      reserve: a3Finish.broad,
      codeDigest: p4CodeDigest(),
      lanes: (lab) => [new P4Lane(lab, spec, a3Budgets.study.broad, armOf('CTRL', ctrlSpace), 41_000)] as never
    };
  }
  // gpu-phase8: the staged fixed-seed mini-optimization — Priority 4's two arms (CTRL: Assignment 3's space; EXP: + the
  // staged genes) on the declared mini schedule, each lane's position qualified by its arm
  if (family === 'p4') {
    const door = opt('door', 'D19') as Plan['door'];
    const cut = door === 'D19' ? 'C19' : door === 'D21' ? 'C21' : door === 'D23' ? 'C23' : 'C24';
    const cells = opt('cells', 'GA0.VA0,GB0.VD1,GC0.VB1,GD1.VC0').split(',');
    const replicates = Number(opt('replicates', '2'));
    const base = cells.flatMap((id) =>
      Array.from({ length: replicates }, (_v, i) => {
        const key = `${cut}/broad/${id}/R${i + 1}`;

        return { key, seedKey: key, stage: 'broad' as const, replicate: i + 1, cutoff: cut, kind: 'indep' as const, res: 'coarse' as const, cell: a3CellOf(id) };
      })
    );
    const specs = part(base.flatMap((x) => (['CTRL', 'EXP'] as const).map((a) => ({ ...x, position: `${a}:${x.key}`, arm: a }))));

    return {
      door,
      cutoff: cut,
      specs,
      budget: miniBudget,
      cap: specs.length * 1_000_000,
      reserve: a3Finish.broad,
      codeDigest: p4CodeDigest(),
      lanes: (lab) => specs.map((s) => new P4Lane(lab, s, miniBudget, armOf(s.arm, s.arm === 'CTRL' ? ctrlSpace : expSpace), 1_000_000)) as never
    };
  }
  if (family === 'a3') {
    const [cut, jobPart] = [job[1]!, job[2]! as A3Part];
    const specs: A3LaneSpec[] = part(
      a3CellsOfPart(jobPart).flatMap((c) =>
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
      )
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
    const [cut, jobPart] = [job[1]!, job[2]! as A2Part];
    const specs = part(
      a2CellsOfPart(jobPart).flatMap((cell) =>
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
      )
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
  const specs: A3LaneSpec[] = part(
    cells.flatMap((id) =>
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
    )
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

if (!plan.specs.length) throw new Error(`--lanes ${laneI}/${laneK} selects no lane`);

// ----- profiling: main-thread event-loop utilization, GC, CPU, memory and the pool's queue (sampled every second;
// never a decision input) -----
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

const procIo = (pid: number | 'self') => {
  try {
    const kv = Object.fromEntries(
      fs
        .readFileSync(`/proc/${pid}/io`, 'utf8')
        .trim()
        .split('\n')
        .map((l) => l.split(':').map((x) => x.trim()))
    ) as Record<string, string>;

    return { readBytes: Number(kv.read_bytes), writeBytes: Number(kv.write_bytes), wchar: Number(kv.wchar) };
  } catch {
    return null;
  }
};
const procStatus = (pid: number | 'self') => {
  try {
    const s = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const kb = (k: string) => Number(new RegExp(`^${k}:\\s+(\\d+) kB`, 'm').exec(s)?.[1] ?? NaN);
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const f = stat.slice(stat.lastIndexOf(')') + 2).split(' ');

    return {
      vmRssMiB: Math.round(kb('VmRSS') / 1024),
      vmHwmMiB: Math.round(kb('VmHWM') / 1024),
      threads: Number(/^Threads:\s+(\d+)/m.exec(s)?.[1] ?? NaN),
      cpuSeconds: { user: Number(f[11]) / 100, system: Number(f[12]) / 100 } // utime, stime (clock ticks of 10 ms)
    };
  } catch {
    return null;
  }
};

let pool: GpuPool | { queued: number; inFlight: number; counters?: { gpuReturned: number; batches: number } } | null =
  null;
const samples: Record<string, number | string>[] = [];
let lastElu = performance.eventLoopUtilization();
let lastCpu = process.cpuUsage();
let lastT = performance.now();
const sampler = setInterval(() => {
  const elu = performance.eventLoopUtilization(lastElu);
  const cpu = process.cpuUsage(lastCpu);
  const now = performance.now();
  const m = process.memoryUsage();
  const p = pool as GpuPool | null;

  samples.push({
    t: new Date().toISOString(),
    elu: Math.round(elu.utilization * 1000) / 1000,
    cpuCores: Math.round(((cpu.user + cpu.system) / 1000 / (now - lastT)) * 100) / 100,
    rssMiB: Math.round(m.rss / 2 ** 20),
    heapMiB: Math.round(m.heapUsed / 2 ** 20),
    externalMiB: Math.round(m.external / 2 ** 20),
    arrayBuffersMiB: Math.round(m.arrayBuffers / 2 ** 20),
    queued: p?.queued ?? 0,
    inFlight: p?.inFlight ?? 0,
    gpuReturned: p?.counters?.gpuReturned ?? 0,
    batches: p?.counters?.batches ?? 0
  });
  lastElu = performance.eventLoopUtilization();
  lastCpu = process.cpuUsage();
  lastT = now;
}, 1000);

sampler.unref();

const door = await openDoor(plan.door, `gpu-phase8 job ${run} (${backend}, non-official ${purpose})`);
const doorPin = `GDX:${doorSpecs[plan.door].pins.GDX.sha256},VGT:${doorSpecs[plan.door].pins.VGT.sha256}`;
let backendId: string;
let serverInfo: Record<string, unknown> | null = null;
let server: GpuServer | null = null;
const hostWorkers = args.includes('--host-workers') ? Number(opt('host-workers', '0')) : 0;
const batchSize = Number(opt('batch', '8192'));
const vramBudgetMb = args.includes('--vram-budget-mb') ? Number(opt('vram-budget-mb', '0')) : undefined;

if (backend === 'gpu') {
  // the job's dataset cache (its own by default; a declared shared one otherwise) — the unchanged atomic export
  const ds = exportDataset(door, J.dirs.dataset);

  server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib, ...(vramBudgetMb ? { vramBudgetMb } : {}) });

  const info = await server.info();

  if (!(await server.smoke()).ok) throw new Error('smoke failed');
  await server.load(ds.file);
  serverInfo = {
    uuid: info.uuid,
    compatDigest: info.compatDigest,
    binarySha256: createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex'),
    binary: path.relative(process.cwd(), serverBinary),
    pid: server.pid,
    datasetSha256: ds.sha256,
    vramBudgetMb: vramBudgetMb ?? null
  };
  backendId = `gpu:${info.uuid}:${(serverInfo.binarySha256 as string).slice(0, 16)}:${compatManifest().digest.slice(0, 16)}`;
  pool = new GpuPool({
    door,
    session: null,
    server,
    uuid: info.uuid,
    ...poolFilesOf(J),
    batchSize,
    lingerMs: Number(opt('linger', '30')),
    log,
    ...(args.includes('--host-workers') ? { hostWorkers } : {})
  } as ConstructorParameters<typeof GpuPool>[0]);
} else {
  // the non-official CPU arm (parity references only): the study's own CPU worker pool
  const { CpuEvalPool } = (await import('../../src/gpu-phase8/cpuEvalPool.ts' as string)) as {
    CpuEvalPool: new (n: number, d: { kind: string; name: string }) => never;
  };

  backendId = `cpu:${opt('workers', '12')} workers`;
  pool = new CpuEvalPool(Number(opt('workers', '12')), { kind: 'market', name: plan.door });
}

const labOptions = {
  ...labOptionsOf(J), // study, job, owner, cacheRoot: the Lab writes only this job's archive and checkpoint
  door: plan.door,
  doorPin,
  purpose: family === 'mini' || family === 'p4' ? `${purpose}: mini-optimization` : `${purpose}: replay of ${job.join(':')}`,
  pool,
  backend: backendId,
  codeDigest: plan.codeDigest,
  stopAfterFresh: stopAfter,
  ...(family === 'mini' || family === 'p4' ? {} : { maxFresh: plan.cap }),
  log
};
const lab = family === 'a2' ? new A2Lab(labOptions as never) : new EvalLab(labOptions as never);

// --risk: every item requests the risk envelope through the Lab's optional delivery; the search is not changed
if (riskMode) {
  if (family === 'a2') throw new Error('--risk: a3 and mini jobs only (Assignment 2 has its own Lab)');

  const plainEvalMany = lab.evalMany.bind(lab);

  lab.evalMany = ((items: Parameters<EvalLab['evalMany']>[0], tagName?: string) =>
    plainEvalMany(
      items.map((x) => ({ ...x, risk: true })),
      tagName
    )) as typeof lab.evalMany;
}

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

// the host pipeline and telemetry start BEFORE the barrier (the Lab's own first start() is then a no-op), so that the
// measured wall of every job begins with evaluation
if (backend === 'gpu') {
  const gp = pool as GpuPool;

  await gp.start();
  gp.start = async () => {};
}

const tReady = new Date().toISOString();
let barrierWaitMs = 0;

if (args.includes('--barrier')) {
  const dir = opt('barrier', '');
  const group = Number(opt('group', '1'));
  const tb = Date.now();

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${run}.ready`), `${process.pid} ${tReady}\n`);
  J.event('barrier', { dir, group });
  for (;;) {
    const n = fs.readdirSync(dir).filter((f) => f.endsWith('.ready')).length;

    if (n >= group) break;
    if (Date.now() - tb > 600000) throw new Error(`barrier ${dir}: ${n} of ${group} jobs ready after 600 s`);
    await new Promise((r) => setTimeout(r, 20));
  }
  barrierWaitMs = Date.now() - tb;
}

const t0 = Date.now();
const tGo = new Date(t0).toISOString();
const ioAtStart = procIo('self');
const eluAtStart = performance.eventLoopUtilization();
const cpuAtStart = process.cpuUsage();
let record: Record<string, unknown>;
let stopped: string | null = null;

log(
  `start: ${plan.specs.length} lanes (part ${laneI}/${laneK}), batch ${batchSize}, host workers ${hostWorkers}${stopAfter ? `, stop after ${stopAfter} fresh` : ''}${tag ? ` [${tag}]` : ''}`
);
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
    kind: 'gpu-phase8 optimizer job',
    job: job.join(':'),
    lanesPart: `${laneI}/${laneK}`,
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
  if (!(error instanceof StopRequested)) {
    await lab.close(`failed: ${(error as Error).message.split('\n')[0]}`);
    J.release(`failed: ${(error as Error).message.split('\n')[0]!.slice(0, 200)}`);
    throw error;
  }
  stopped = error.reason;
  record = {
    kind: 'gpu-phase8 optimizer job (stopped prefix)',
    job: job.join(':'),
    lanesPart: `${laneI}/${laneK}`,
    backend,
    backendId,
    server: serverInfo,
    run,
    door: plan.door,
    cutoff: plan.cutoff,
    lanesCount: plan.specs.length,
    stopped,
    compute: lab.compute,
    minutes: Math.round((Date.now() - t0) / 600) / 100,
    finished: new Date().toISOString()
  };
}

const wallMs = Date.now() - t0;
const tEnd = new Date().toISOString();
const elu = performance.eventLoopUtilization(eluAtStart);
const cpu = process.cpuUsage(cpuAtStart);
const ioAtEnd = procIo('self');
const serverStatus = server?.pid ? procStatus(server.pid) : null;
const selfStatus = procStatus('self');
// the archive's rows and configs (key → record hash in the store's encoding: ±Infinity and NaN kept distinct), streamed to
// results/raw-large/ as JSONL and digested incrementally (sorted "key=hash" lines joined by newlines, as Phase 3)
const rawDir = path.join(resultsDir, 'raw-large', 'jobs', run);
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
await lab.close(stopped ? `stopped: ${stopped}` : 'job-end');
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
  kind: 'gpu-phase8 job profile',
  jobIdentity: { id: J.id, instance: J.instance, resumed: J.resumed, definitionSha256: J.identity.definitionSha256, datasetShared: J.datasetShared },
  runtime: engineRuntime(), // the JavaScript engine configuration of this job (its host workers share it)
  binary: serverBinary,
  run,
  tag,
  job: job.join(':'),
  lanesPart: `${laneI}/${laneK}`,
  lanes: plan.specs.length,
  backend,
  backendId,
  purpose,
  risk: riskMode,
  stopped,
  stopAfter: stopAfter ?? null,
  hostWorkers,
  batchSize,
  vramBudgetMb: vramBudgetMb ?? null,
  times: { start: tStart, ready: tReady, go: tGo, end: tEnd, barrierWaitSeconds: Math.round(barrierWaitMs / 100) / 10 },
  wallSeconds: Math.round(wallMs / 100) / 10,
  fresh: lab.compute.fresh,
  archiveHits: lab.compute.archiveHits,
  evaluationsPerSecond: Math.round((lab.compute.fresh / wallMs) * 1000 * 10) / 10,
  mainThread: {
    eventLoopUtilization: Math.round(elu.utilization * 1000) / 1000,
    activeSeconds: Math.round(elu.active / 100) / 10,
    idleSeconds: Math.round(elu.idle / 100) / 10
  },
  processCpuSeconds: { user: Math.round(cpu.user / 1e5) / 10, system: Math.round(cpu.system / 1e5) / 10 },
  process: { status: selfStatus, io: ioAtStart && ioAtEnd ? { start: ioAtStart, end: ioAtEnd } : null },
  serverProcess: serverStatus,
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

writeJson(path.join(outDir, stopped ? 'result-stopped.json' : 'result.json'), record);
writeJson(path.join(outDir, stopped ? 'profile-stopped.json' : 'profile.json'), profile);
writeJson(path.join(outDir, stopped ? 'archive-digest-stopped.json' : 'archive-digest.json'), archived);
if (stopped) J.release(`stopped: ${stopped}`);
else {
  J.complete({ rows: archived.rows, rowsSha256: archived.rowsSha256, configsSha256: archived.configsSha256, wallSeconds: profile.wallSeconds });
  J.release('complete');
}
log(
  `${stopped ? 'stopped' : 'done'}: ${archived.rows} archived evaluations, ${record.minutes} min, ${profile.evaluationsPerSecond} ev/s, main-thread ELU ${profile.mainThread.eventLoopUtilization}`
);
if (stopped) process.exit(75);

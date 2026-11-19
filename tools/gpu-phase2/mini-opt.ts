// gpu-phase2 gate G7 (PROTOCOL.md §7, AD8): the fixed-seed, NON-OFFICIAL, parity-only mini-optimization. Assignment 3's
// search code (src/vg-l0-full-joint/search.ts Lane — screen, promotion, rung fitting, NSGA-II islands with extension
// triggers, rungs 2–3, refinement, shortlist — UNCHANGED) runs a bounded broad job with a reduced, declared schedule on
// one door, once with a CPU worker pool and once with the GPU pool, from the same seeds. The job body (base islands,
// then extension rounds at barriers with the resource guard, then finish) is Assignment 3's stages.ts broad job,
// carried over line for line. Outputs: the lane results, every archived record (hash per row), the proposal and config
// tables, the progress checkpoint and the extension rounds; tools/gpu-phase2/mini-opt-compare.ts compares the arms.
//
//   node --expose-gc --experimental-transform-types tools/gpu-phase2/mini-opt.ts --backend gpu|cpu --run <name> \
//     [--door D19] [--cells GA0.VA0,GB1.VD0,...] [--replicates 1] [--stop-after N] [--workers 12]
// --a3-job <cutoff>:<broad1|broad2> replays one of Assignment 3's sealed broad jobs instead (NON-OFFICIAL benchmark and
// identity check): its frozen study schedule (budgets.study.broad), its 32 cells × 2 replicates, its job cap
// (lanes × perLaneCap.broad, also the Lab's maxFresh) and its seed keys — compared with the sealed
// research/vg-l0-full-joint/results/search/<cutoff>/<part>.json by tools/gpu-phase2/a3-replay-compare.ts.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Lane, type LaneSpec } from '../../src/vg-l0-full-joint/search.ts';
import { type Budget } from '../../src/vg-l0-full-joint/search.ts';
import { budgets, finishReserve, perLaneCap } from '../../src/vg-l0-full-joint/budgets.ts';
import { cellOf } from '../../src/vg-l0-full-joint/space.ts';
import { cellsOfPart, cutoffs as a3Cutoffs, type Part } from '../../src/vg-l0-full-joint/stages.ts';
import { codeDigest as a3CodeDigest } from '../../src/vg-l0-full-joint/lab.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { cacheDir, openDoor, resultsDir, writeJson } from '../../src/gpu-phase2/context.ts';
import { CpuEvalPool } from '../../src/gpu-phase2/cpuEvalPool.ts';
import { EvalLab, StopRequested } from '../../src/gpu-backend/lab.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { compatManifest } from '../../src/gpu-backend/compat.ts';
import { encode } from '../../src/growth140-vgt-s8m/store.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const backend = opt('backend', 'gpu') as 'gpu' | 'cpu';
const run = opt('run', 'mini');
const a3Job = args.includes('--a3-job') ? opt('a3-job', '').split(':') : null;
const doorName = (a3Job ? a3Cutoffs[a3Job[0]!]!.door : opt('door', 'D19')) as 'D19' | 'D21' | 'D23' | 'D24';
const cells = a3Job ? cellsOfPart(a3Job[1] as Part).map((c) => c.id) : opt('cells', 'GA0.VA0,GB1.VD0,GC0.VB1,GD1.VC0').split(',');
const replicates = a3Job ? 2 : Number(opt('replicates', '1'));
const stopAfter = args.includes('--stop-after') ? Number(opt('stop-after', '0')) : undefined;
const outDir = path.join(resultsDir, 'optimizer', run, backend);
const cacheRoot = path.join(cacheDir, 'mini-opt', run, backend);
const log = (s: string) => console.log(`[mini-opt ${backend} ${new Date().toISOString().slice(11, 19)}Z] ${s}`);

// the declared mini schedule: Assignment 3's broad lane structure at reduced counts (every stage path exercised)
const miniBudget: Budget = {
  ...budgets.study.broad,
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
const mini: Budget = a3Job ? budgets.study.broad : miniBudget;
const cutoff = a3Job ? a3Job[0]! : doorName === 'D19' ? 'C19' : doorName === 'D21' ? 'C21' : doorName === 'D23' ? 'C23' : 'C24';
const specs: LaneSpec[] = cells.flatMap((id) =>
  Array.from({ length: replicates }, (_v, i) => {
    const key = `${cutoff}/broad/${id}/R${i + 1}`;

    return { key, seedKey: key, position: key, stage: 'broad' as const, replicate: i + 1, cutoff, kind: 'indep' as const, res: 'coarse' as const, cell: cellOf(id) };
  })
);
const door = await openDoor(doorName, `mini-optimization (${backend}, parity-only)`);
const doorPin = `GDX:${doorSpecs[doorName].pins.GDX.sha256},VGT:${doorSpecs[doorName].pins.VGT.sha256}`;
const codeDigest = a3CodeDigest();
let pool;
let backendId: string;

if (backend === 'gpu') {
  const ds = exportDataset(door, cacheDir);
  const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
  const info = await server.info();

  if (!(await server.smoke()).ok) throw new Error('smoke failed');
  await server.load(ds.file);
  backendId = `gpu:${info.uuid}:${createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex').slice(0, 16)}:${compatManifest().digest.slice(0, 16)}`;
  pool = new GpuPool({ door, session: null, server, uuid: info.uuid, ledgerFile: path.join(outDir, 'receipts.jsonl'), telemetryFile: path.join(outDir, 'telemetry.jsonl'), batchSize: Number(opt('batch', '8192')), lingerMs: 30, log });
} else {
  backendId = `cpu:${opt('workers', '12')} workers`;
  pool = new CpuEvalPool(Number(opt('workers', '12')), { kind: 'market', name: doorName });
}

const jobCap = a3Job ? specs.length * perLaneCap.broad : specs.length * 1_000_000;
const lab = new EvalLab({ study: 'research/gpu-phase2', job: `mini-${run}`, door: doorName, doorPin, purpose: a3Job ? `benchmark: replay of Assignment 3 ${a3Job.join(' ')}` : 'parity-test mini-optimization', pool, backend: backendId, codeDigest, cacheRoot, stopAfterFresh: stopAfter, ...(a3Job ? { maxFresh: jobCap } : {}), log });

await lab.open();
fs.mkdirSync(outDir, { recursive: true });

const t0 = Date.now();
let record: Record<string, unknown>;

try {
  // ----- Assignment 3's broad job body (stages.ts), unchanged in its rules -----
  const lanes = specs.map((spec) => new Lane(lab as never, spec, mini));
  const requested = () => lanes.reduce((a, l) => a + l.requested, 0);
  const rounds: unknown[] = [];
  const cap = jobCap;

  lab.stage = `mini ${run}: base (${lanes.length} lanes)`;
  await Promise.all(lanes.map((l) => l.base()));

  const stops = new Map<string, string>();

  for (let round = 1; ; round++) {
    const live = lanes.filter((l) => !stops.has(l.spec.position));

    if (!live.length) break;

    const row = { round, positions: [] as { position: string; fired: boolean; extended: boolean; atCap: boolean }[], requestedBefore: requested(), worstCase: 0, decision: '' };
    const go: Lane[] = [];

    for (const l of live) {
      const fired = l.lastTrigger?.fired ?? false;
      const atCap = l.atCap;

      row.positions.push({ position: l.spec.position, fired, extended: fired && !atCap, atCap });
      if (!fired) stops.set(l.spec.position, 'triggers not met');
      else if (atCap) stops.set(l.spec.position, 'extension cap reached (a trigger still fired: budget-bound, not converged)');
      else go.push(l);
    }
    row.worstCase = go.reduce((a, l) => a + l.islandWorstCase, 0);
    if (go.length && requested() + row.worstCase + finishReserve.broad * lanes.length > cap) {
      for (const l of go) stops.set(l.spec.position, 'resource guard (the job cap on fresh simulations)');
      row.decision = 'resource guard';
      rounds.push(row);
      break;
    }
    row.decision = go.length ? `extend ${go.length} lane(s)` : 'no lane extends';
    rounds.push(row);
    if (!go.length) break;
    lab.stage = `mini ${run}: extension round ${round}`;
    lab.checkpoint({ extensionRound: round, extending: go.map((l) => l.spec.key) });
    await Promise.all(go.map((l) => l.extend()));
  }

  lab.stage = `mini ${run}: finishing`;

  const results = await Promise.all(lanes.map((lane) => lane.finish(stops.get(lane.spec.position) ?? 'triggers not met')));

  record = { kind: a3Job ? 'gpu-phase2 replay of an Assignment 3 job' : 'gpu-phase2 mini-optimization', a3Job: a3Job?.join(':') ?? null, backend, backendId, run, door: doorName, cells, replicates, budget: mini, cap: jobCap, extensionRounds: rounds, lanes: results, compute: lab.compute, minutes: Math.round((Date.now() - t0) / 600) / 100, finished: new Date().toISOString() };
} catch (error) {
  if (error instanceof StopRequested) {
    await lab.close(`stopped: ${error.reason}`);
    log(`stopped (${error.reason}); resume with the same command`);
    process.exit(75);
  }
  await lab.close(`failed: ${(error as Error).message.split('\n')[0]}`);
  throw error;
}

// the archive's rows (key → record hash) and configs, for the comparison
const rows: Record<string, string> = {};
const configs: Record<string, string> = {};

lab.store.commit();
// rows hashed in the store's encoding (±Infinity and NaN kept distinct)
for (const [k, v] of lab.store.iterate('points')) rows[k] = createHash('sha256').update(encode(v)).digest('hex').slice(0, 20);
for (const [k, v] of lab.store.iterate('configs')) configs[k] = createHash('sha256').update(encode(v)).digest('hex').slice(0, 20);
await lab.close('job-end');
writeJson(path.join(outDir, 'result.json'), record);
// the full key → hash dump is large (≈ 14 MB per 30k rows): kept under results/raw-large/ (git-ignored); the committed
// evidence is its digest (sorted "key=hash" lines)
const digestOf = (m: Record<string, string>) => createHash('sha256').update(Object.keys(m).sort().map((k) => `${k}=${m[k]}`).join('\n')).digest('hex');

writeJson(path.join(resultsDir, 'raw-large', 'optimizer', run, backend, 'archive.json'), { rows, configs });
writeJson(path.join(outDir, 'archive-digest.json'), { rows: Object.keys(rows).length, rowsSha256: digestOf(rows), configs: Object.keys(configs).length, configsSha256: digestOf(configs) });
log(`done: ${Object.keys(rows).length} archived evaluations, ${record.minutes} min`);

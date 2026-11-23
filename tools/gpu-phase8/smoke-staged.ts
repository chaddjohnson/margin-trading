// gpu-phase8 (engineering, NON-OFFICIAL, purpose parity-test): a quick staged-stop smoke parity before the campaign —
// New L0 and N/original with fixed staged settings and seeded random Assignment 3 genomes with seeded random valid
// staged configurations (every ON/OFF pattern), the canonical CPU engine (evaluateStaged / runWithStaged) against the
// GPU server binary in GPU_BACKEND_BINARY on one development door: every book trade by trade, the pooled replay and
// the record, zero tolerance. A development aid only; the acceptance evidence is the campaign (chains/final.sh).
//   GPU_POLICY_PURPOSE=parity-test GPU_BACKEND_BINARY=<binary> node --no-maglev --experimental-transform-types \
//     tools/gpu-phase8/smoke-staged.ts --door D24 --random 64
import path from 'node:path';
import { openDoor } from '../../src/vg-d1-growth-joint/data.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { decode, levelsOf } from '../../src/vg-l0-full-joint/space.ts';
import { readJson } from '../../src/vg-l0-full-joint/records.ts';
import type { Cfg } from '../../src/vg-l0-full-joint/space.ts';
import { subjectOfCfg } from '../../src/vg-l0-risk-metrics/engine.ts';
import { evaluateStaged, runWithStaged, tau1Of } from '../../src/d1-risk-controls-rc3/run.ts';
import { type StagedConfig, aMinOf, stagedBooks } from '../../src/staged-stop/config.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-backend/canon.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { serverBinary, toolkitLib, repoRoot } from '../../src/gpu-backend/toolchain.ts';
import { requireEngineRuntime } from '../../src/gpu-backend/runtime.ts';
import { declaredPurpose } from '../../src/gpu-backend/purpose.ts';
import type { Task } from '../../src/gpu-backend/encode.ts';
import { Rng, deriveSeed } from '../../src/optimizer/rng.ts';

requireEngineRuntime('gpu-phase8 staged smoke parity');
if (declaredPurpose() !== 'parity-test') throw new Error('purpose parity-test required');

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const doorName = opt('door', 'D24') as never;
const nRandom = Number(opt('random', '32'));
const door = await openDoor(doorName, 'gpu-phase8 staged smoke parity');
const frozen = readJson<{ newL0: { cfg: Cfg }; finalists: { id: string; cfg: Cfg }[] }>(
  path.join(repoRoot, 'research/vg-l0-full-joint/FROZEN_SELECTION.json')
);
const comparators = [frozen.newL0.cfg, frozen.finalists.find((f) => f.id === 'rc1-f1a8b57cb02455c3')!.cfg];
const randomStaged = (rng: Rng, t1: Partial<Record<(typeof stagedBooks)[number], number>>, pattern: number): StagedConfig | undefined => {
  const books: StagedConfig['books'] = {};

  stagedBooks.forEach((b, i) => {
    if (!(pattern & (1 << i)) || t1[b] === undefined) return;

    const lo = aMinOf(t1[b]!);
    const hi = Math.min(145, t1[b]! - 5);

    books[b] = { activationTenths: lo + rng.int(Math.min(500, lo + 250) - lo + 1), stage2Tenths: 15 + rng.int(hi - 15 + 1) };
  });
  return Object.keys(books).length ? { version: 1, books } : undefined;
};
const tasks: Task[] = [];

comparators.forEach((cfg, j) => {
  const s = subjectOfCfg(cfg);
  const t1 = tau1Of(s.quad, vOptions);
  const rng = new Rng(deriveSeed('gpu-phase8', 'smoke', 'comparator', j));

  for (let p = 0; p < 8; p++) tasks.push({ k: `C${j}:${p}`, quad: s.quad, controls: s.controls, options: vOptions, detail: false, staged: randomStaged(rng, t1, p) });
});

const levels = levelsOf('coarse');

for (let i = 0; i < nRandom; i++) {
  const rng = new Rng(deriveSeed('gpu-phase8', 'smoke', 'random', i));
  const s = subjectOfCfg(decode(levels.map((l) => rng.int(l)), 'coarse'));
  const st = randomStaged(rng, tau1Of(s.quad, vOptions), i % 8);

  tasks.push({ k: `R${i}`, quad: s.quad, controls: s.controls, options: vOptions, detail: i % 4 === 3, staged: st });
}
for (const t of tasks) if (!t.staged) delete t.staged;

const t0 = Date.now();
const cpu = tasks.map((t) => {
  const x = runWithStaged(door, t.quad, t.controls, t.staged, t.options, t.detail, false, { cache: false });
  const rec = evaluateStaged(door, t.quad, t.controls, t.staged, t.options, { cache: false });

  return { books: canonHash(x.books.map(bookView)), pool: canonHash(poolView(x.result)), record: canonHash(t.detail ? undefined : rec) };
});
const cpuS = (Date.now() - t0) / 1000;
const ds = exportDataset(door, path.join(repoRoot, 'research/gpu-phase8/cache/datasets'));
const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
const info = await server.info();

await server.load(ds.file);

const gpu = await server.evaluate(door, tasks, { returnTrades: true, returnSeries: true, tradeCapD1: 1024, tradeCapG: 1024, lotCap: 1024, fundCap: 4096 }, info.uuid);
let same = 0;
const diffs: string[] = [];

tasks.forEach((t, i) => {
  const g = gpu.results[i]!;
  const c = cpu[i]!;
  const gb = g.status === 0 ? canonHash(g.books.map(bookView)) : `status ${g.statusText}`;
  const gp = g.status === 0 ? canonHash(poolView(g.pool!)) : '';
  const gr = g.status === 0 ? canonHash(t.detail ? undefined : g.record) : '';

  if (gb === c.books && gp === c.pool && gr === c.record) same++;
  else diffs.push(`${t.k}: books ${gb === c.books} pool ${gp === c.pool} record ${gr === c.record} staged ${JSON.stringify(t.staged?.books ?? null)}`);
});
await server.close();

// sensitivity: the staged settings must change outcomes (distinct records per comparator) and the counters must move
const distinct = [0, 1].map((j) => new Set(cpu.filter((_c, i) => tasks[i]!.k.startsWith(`C${j}:`)).map((c) => c.pool)).size);
const totals = { arms: 0, stagedExits: 0, placementExits: 0, onBooks: 0 };

for (const r of gpu.results)
  for (const x of Object.values(r.staged ?? {})) {
    totals.onBooks++;
    totals.arms += x.arms;
    totals.stagedExits += x.stagedExits;
    totals.placementExits += x.placementExits;
  }
console.log(
  JSON.stringify(
    { door: doorName, binary: serverBinary, tasks: tasks.length, identical: same, cpuSeconds: cpuS, distinctPooledReplaysPerComparator: distinct, gpuStagedTotals: totals, diffs: diffs.slice(0, 20) },
    null,
    1
  )
);
process.exit(same === tasks.length ? 0 : 1);

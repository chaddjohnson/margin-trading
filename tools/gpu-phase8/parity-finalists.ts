// gpu-phase8 (PROTOCOL.md §6 gate E7): tools/gpu-phase5/parity-finalists.ts with this study's namespace (doors, CPU reference
// workers, dataset cache) and the development door D24 only by default (--doors); every CPU reference runs under
// --no-maglev. Phase 5's header follows.
// gpu-phase5 (copy of tools/gpu-phase3/parity-finalists.ts, this study's namespace) (Phase 2 gate G4 through the parallel host path, --host-workers N, default 8) (reference identities, PROTOCOL.md §5 set R): Assignment 3's 48 sealed finalists
// (research/vg-l0-full-joint/FROZEN_SELECTION.json, read only) on D24 and FULL — every book (trade by trade), the
// pooled replay (every lot and funding decision), the detailed record and the risk-envelope inputs, GPU versus the
// independent CPU reference (the same hashes as tools/gpu-phase2/parity.ts) — and, on D24, the GPU's compact record
// against the sealed C24 centre figures (net and minute drawdown, to the cent). The campaign's --refs covers New L0,
// N/original, IJ1, C4 and C4-refined; this run adds the finalists.
//   node --expose-gc --experimental-transform-types tools/gpu-phase5/parity-finalists.ts --out <json> [--workers 12]
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { subjectOfCfg } from '../../src/vg-l0-risk-metrics/engine.ts';
import { type DoorKey, cacheDir, openDoor, repoRoot, writeJson } from '../../src/gpu-phase8/context.ts';
import { CpuRefPool } from '../../src/gpu-phase8/cpuRefPool.ts';
import type { RefTask } from '../../src/gpu-phase8/cpuRefWorker.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-phase5/canon.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type TaskResult } from '../../src/gpu-backend/client.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { engineRuntime } from '../../src/gpu-backend/runtime.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const out = opt('out', 'research/gpu-phase8/results/parity/finalists.json');
const workers = Number(opt('workers', '12'));
const frozen = JSON.parse(fs.readFileSync(`${repoRoot}/research/vg-l0-full-joint/FROZEN_SELECTION.json`, 'utf8')) as {
  finalists: {
    label: string;
    id: string;
    cfg: Parameters<typeof subjectOfCfg>[0];
    centreNet: number;
    centreDd: number;
  }[];
  newL0: { label: string; id: string; cfg?: Parameters<typeof subjectOfCfg>[0]; centreNet: number; centreDd: number };
};
const finalists = frozen.finalists;
const binarySha = createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex');
const r2 = (x: number) => Math.round(x * 100) / 100;
const gpuHashes = (r: TaskResult) =>
  r.status !== 0
    ? { status: r.status }
    : {
        status: 0,
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
const runs: unknown[] = [];
let pass = true;

// Phase 6 (PROTOCOL.md §7): development door D24 only — the sealed C24 centre figures are D24's; FULL is not opened
for (const doorName of opt('doors', 'D24').split(',') as DoorKey[]) {
  const door = await openDoor(doorName, 'G4 Assignment 3 finalists');
  const ds = exportDataset(door, cacheDir);
  const subjects = finalists.map((f) => ({ f, s: subjectOfCfg(f.cfg) }));
  // the compact record (sealed figures) and the detailed record with the risk inputs
  const tasks: RefTask[] = subjects.flatMap(({ f, s }) => [
    { k: `${f.label}|compact`, quad: s.quad, controls: s.controls, options: vOptions, detail: false },
    { k: `${f.label}|detail`, quad: s.quad, controls: s.controls, options: vOptions, detail: true, risk: true }
  ]);
  const pool = new CpuRefPool(workers, { kind: 'market', name: doorName });

  await pool.start();
  const cpu = await pool.run(tasks, 2);

  await pool.close();
  const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
  const info = await server.info();

  if (!(await server.smoke()).ok) throw new Error('smoke failed');
  await server.load(ds.file);
  const pipe = await HostPipeline.start({ door, workers: Number(opt('host-workers', '8')) });
  const prepared = await pipe.prepare(door, tasks, {
    returnTrades: true,
    returnSeries: true,
    tradeCapD1: 1024,
    tradeCapG: 1024,
    lotCap: 1024,
    fundCap: 4096
  });
  const r = await pipe.complete(prepared, await server.submit(prepared), info.uuid, 'full');

  await pipe.close();

  await server.close();
  const byKey = new Map(r.results.map((x) => [x.key, x]));
  const rows = tasks.map((t) => {
    const c = cpu.find((x) => x.k === t.k)!;
    const g = byKey.get(t.k)!;
    const h = gpuHashes(g);
    const same =
      c.ok &&
      h.status === 0 &&
      c.books === h.books &&
      c.pool === h.pool &&
      c.record === h.record &&
      JSON.stringify(c.envelope ?? null) === JSON.stringify(h.envelope ?? null);
    const f = subjects.find((x) => t.k.startsWith(`${x.f.label}|`))!.f;
    const rec = g.record as { net: number; dd: number };
    const sealed =
      doorName === 'D24' && t.k.endsWith('|compact')
        ? {
            net: f.centreNet,
            dd: f.centreDd,
            gpuNet: r2(rec.net),
            gpuDd: r2(rec.dd),
            equal: r2(rec.net) === f.centreNet && r2(rec.dd) === f.centreDd
          }
        : null;

    if (!same || (sealed && !sealed.equal)) pass = false;
    return { k: t.k, identicalToCpu: same, sealed, trades: c.counts?.trades, lots: c.counts?.lots };
  });

  runs.push({
    door: doorName,
    sessions: door.sessions,
    dataSha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
    tasks: tasks.length,
    identical: rows.filter((x) => x.identicalToCpu).length,
    sealedChecked: rows.filter((x) => x.sealed).length,
    sealedEqual: rows.filter((x) => x.sealed?.equal).length,
    rows
  });
  console.log(
    JSON.stringify({
      door: doorName,
      tasks: tasks.length,
      identical: rows.filter((x) => x.identicalToCpu).length,
      sealedEqual: rows.filter((x) => x.sealed?.equal).length,
      sealedChecked: rows.filter((x) => x.sealed).length
    })
  );
}

writeJson(out, {
  kind: 'gpu-phase8 Assignment 3 finalists parity (host pipeline)',
  runtime: engineRuntime(),
  t: new Date().toISOString(),
  finalists: finalists.length,
  binarySha256: binarySha,
  source: 'research/vg-l0-full-joint/FROZEN_SELECTION.json',
  runs,
  pass
});
process.exitCode = pass ? 0 : 2;

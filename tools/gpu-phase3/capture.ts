// gpu-phase3 (development fixture, NON-OFFICIAL): captures real evaluator batches — the tasks, the batch options, the
// encoded request bytes and the server's raw response — so that the host pipeline (encoding, receipt verification,
// decoding, the canonical record reductions) can be compared offline, without the GPU, against the Phase 2 serial path.
// Captures are git-ignored development data (research/gpu-phase3/cache/captures/); the evidence that counts is the
// final acceptance campaign (PROTOCOL.md §9).
//
//   node --experimental-transform-types tools/gpu-phase3/capture.ts --name <n> --door D19 [--fixture S] --options base
//     --random 4096 [--strata 2] [--refs] [--detail] [--risk] [--trades] [--series] [--growth-first]
import fs from 'node:fs';
import path from 'node:path';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { cacheDir } from '../../src/gpu-phase3/context.ts';
import { type DoorSpec, resolveDoor } from '../../src/gpu-phase3/doorSpec.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase3/subjects.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { type BatchOptions, GpuServer, type Task } from '../../src/gpu-backend/client.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-backend/canon.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { encode } from '../../src/growth140-vgt-s8m/store.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const flag = (k: string) => args.includes(`--${k}`);
const name = opt('name', 'capture');
const spec: DoorSpec = flag('fixture')
  ? { kind: 'fixture', seed: Number(opt('fixture', '0')), sessions: Number(opt('sessions', '420')) }
  : { kind: 'market', name: opt('door', 'D19') as never };
const door = await resolveDoor(spec, 'gpu-phase3 capture (development fixture)');
const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
const optionSets: Record<string, EvalOptions> = {
  base: vOptions,
  periods: { ...vOptions, boundaries: [at(0.75), at(0.25), at(0.5)] },
  blackout: {
    ...vOptions,
    blackouts: [
      { first: at(0.2), last: at(0.27) },
      { first: at(0.6), last: at(0.64) }
    ]
  },
  all: {
    enabled: {},
    friction: { costBps: 20, rate: 0.14, stopSlippageBps: 25, stopFill: 'next-open' },
    d1Arm: 'native',
    fundFrom: at(0.15),
    wholeShares: true,
    blackouts: [{ first: at(0.4), last: at(0.45) }],
    boundaries: [at(0.5), at(0.8)],
    tieOrder: ['G:GDX', 'D1:VGT', 'G:VGT', 'D1:GDX']
  }
};
const optionSet = opt('options', 'base');
const options = optionSets[optionSet]!;
let subjects = [
  ...(flag('refs') ? referenceSubjects() : []),
  ...randomSubjects(Number(opt('random', '0')), `cap-${name}`),
  ...growthStrata(Number(opt('strata', '0')), `cap-${name}-G`)
];

if (optionSet === 'all') {
  const donors = randomSubjects(subjects.length, `cap-${name}-GDX`);

  subjects = subjects.map((s, i) => ({
    ...s,
    quad: { ...s.quad, first: 'G' as const, g: { ...s.quad.g, GDX: donors[i]!.quad.g.VGT } }
  }));
}
if (flag('growth-first')) subjects = subjects.map((s) => ({ ...s, quad: { ...s.quad, first: 'G' as const } }));

const tasks: Task[] = subjects.map((s) => ({
  k: s.key,
  quad: s.quad,
  controls: s.controls,
  options,
  detail: flag('detail'),
  risk: flag('risk')
}));
const o: BatchOptions = { record: true, returnTrades: flag('trades'), returnSeries: flag('series') };
const ds = exportDataset(door, cacheDir);
const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
const info = await server.info();

await server.load(ds.file);

const prepared = server.prepare(door, tasks, o);
const raw = await server.submit(prepared);
const done = server.complete(prepared, raw, info.uuid);
const dir = path.join(cacheDir, 'captures');

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${name}.req.bin`), prepared.enc.buffer);
fs.writeFileSync(path.join(dir, `${name}.res.bin`), raw.payload);
fs.writeFileSync(
  path.join(dir, `${name}.json`),
  encode({
    name,
    door: spec,
    optionSet,
    o,
    uuid: info.uuid,
    nonce: prepared.enc.nonce.toString(16),
    tasks,
    timing: done.timing,
    // the serial (Phase 2) path's canonical hashes of every result, the reference for the offline comparison
    reference: done.results.map((r) => ({
      key: r.key,
      status: r.status,
      features: r.features.toString(16),
      record: canonHash(r.record),
      books: canonHash(r.books.map(bookView)),
      rc: canonHash(r.rc),
      pool: r.pool ? canonHash(poolView(r.pool)) : null,
      envelope: r.envelope ? canonHash(r.envelope) : null
    }))
  })
);
await server.close();
console.log(
  JSON.stringify({ name, n: tasks.length, statuses: [...new Set(done.results.map((r) => r.status))], ...done.timing })
);

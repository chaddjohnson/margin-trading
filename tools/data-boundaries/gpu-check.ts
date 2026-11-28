// A NON-OFFICIAL GPU/CPU boundary check (purpose parity-test; never official optimization evidence, no search): the
// accepted GPU binary (config/gpu-backend/acceptance.json `binary`) evaluates the sealed pooled subjects
// (src/vg-l0-risk-metrics/subjects.ts: New L0, N/original, …) on
//   FULL   Priority 3's door after the append (the verified byte prefix through 2026-10-30), and
//   ALL    the manual door through the latest common complete session,
// and every result is compared bit for bit (canonical hashes of the books, the pooled replay, the record and the risk
// envelope) with the CPU reference of the GPU acceptance studies (src/gpu-phase7/cpuRefWorker.ts reference). On FULL the
// GPU's compact record must also equal the sealed figures. It shows that both paths read the same data through the same
// boundaries; it is not a re-acceptance (the evaluation digest changed, so the official gate refuses by design).
//
//   GPU_POLICY_PURPOSE=parity-test node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
//     --max-old-space-size=12288 tools/data-boundaries/gpu-check.ts --cache <scratch dir> [--out FILE]
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { assertNonOfficialCpuRun } from '../../src/gpu-backend/purpose.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type TaskResult } from '../../src/gpu-backend/client.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { engineRuntime } from '../../src/gpu-backend/runtime.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-phase5/canon.ts';
import { type RefTask, reference } from '../../src/gpu-phase7/cpuRefWorker.ts';
import { openManualDoor, resolveManualWindow } from '../../src/manual-eval/door.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { auditSubjects } from '../../src/vg-l0-risk-metrics/subjects.ts';

const argv = process.argv.slice(2);
const opt = (k: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);
const cache = opt('--cache');
const out = opt('--out');

if (!cache) throw new Error('--cache <scratch dir> is required (the exported GPU datasets go there)');
assertNonOfficialCpuRun('the non-official GPU/CPU boundary check');

const r2 = (x: number) => Math.round(x * 100) / 100;
const binarySha256 = createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex');
const acceptance = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../../config/gpu-backend/acceptance.json'), 'utf8'));
const subjects = auditSubjects();
const gpuHashes = (r: TaskResult) =>
  r.status !== 0
    ? { status: r.status }
    : {
        status: 0,
        books: canonHash(r.books.map(bookView)),
        pool: canonHash(poolView(r.pool!)),
        record: canonHash(r.record),
        envelope: r.envelope
          ? [r.envelope.bankedDdMarked, r.envelope.bankedDdLiquidation, r.envelope.principalLossMarked, r.envelope.principalLossLiquidation]
          : null
      };
const runs: unknown[] = [];
let pass = binarySha256 === acceptance.binary.sha256;

for (const [name, window] of [
  ['FULL', resolveManualWindow({ mode: 'research' })],
  ['ALL', resolveManualWindow({ mode: 'all' })]
] as const) {
  const door = await openManualDoor(window, `non-official GPU/CPU boundary check (${name}); report-only`);
  const ds = exportDataset(door, path.join(cache, name), name);
  const tasks: RefTask[] = subjects.flatMap((s) => [
    { k: `${s.key}|compact`, quad: s.subject.quad, controls: s.subject.controls, options: vOptions, detail: false },
    { k: `${s.key}|detail`, quad: s.subject.quad, controls: s.subject.controls, options: vOptions, detail: true, risk: true }
  ]);
  const cpu = tasks.map((t) => reference(door, t));
  const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
  const info = await server.info();

  if (!(await server.smoke()).ok) throw new Error('smoke failed');
  await server.load(ds.file);

  const pipe = await HostPipeline.start({ door, workers: 4 });
  const prepared = await pipe.prepare(door, tasks, { returnTrades: true, returnSeries: true, tradeCapD1: 1024, tradeCapG: 1024, lotCap: 1024, fundCap: 4096 });
  const r = await pipe.complete(prepared, await server.submit(prepared), info.uuid, 'full');

  await pipe.close();
  await server.close();

  const byKey = new Map(r.results.map((x) => [x.key, x]));
  const rows = tasks.map((t) => {
    const c = cpu.find((x) => x.k === t.k)!;
    const g = byKey.get(t.k)!;
    const h = gpuHashes(g);
    const same = c.ok && h.status === 0 && c.books === h.books && c.pool === h.pool && c.record === h.record && JSON.stringify(c.envelope ?? null) === JSON.stringify(h.envelope ?? null);
    const s = subjects.find((x) => t.k.startsWith(`${x.key}|`))!;
    const rec = g.record as { net: number; dd: number; lots?: number };
    const sealed = name === 'FULL' && t.k.endsWith('|compact') ? { net: s.target.net, dd: s.target.dd, gpuNet: r2(rec.net), gpuDd: r2(rec.dd), equal: r2(rec.net) === s.target.net && r2(rec.dd) === s.target.dd } : null;

    if (!same || (sealed && !sealed.equal)) pass = false;
    return { k: t.k, identicalToCpu: same, gpu: { net: r2(rec.net), dd: r2(rec.dd) }, sealed };
  });

  runs.push({
    door: name,
    window: { from: door.dates[0], to: door.dates.at(-1), sessions: door.sessions },
    dataSha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
    dataset: { sha256: ds.sha256, bytes: fs.statSync(ds.file).size },
    device: info.uuid,
    serverCompatDigest: info.compatDigest,
    tasks: tasks.length,
    identical: rows.filter((x) => x.identicalToCpu).length,
    sealedEqual: rows.filter((x) => x.sealed?.equal).length,
    sealedChecked: rows.filter((x) => x.sealed).length,
    rows
  });
  console.log(JSON.stringify({ door: name, to: door.dates.at(-1), tasks: tasks.length, identical: rows.filter((x) => x.identicalToCpu).length, sealedEqual: rows.filter((x) => x.sealed?.equal).length, dataset: ds.sha256.slice(0, 16) }));
}

const record = {
  kind: 'non-official GPU/CPU boundary check (parity-test; not an acceptance, not official evidence)',
  t: new Date().toISOString(),
  runtime: engineRuntime(),
  binary: { path: path.relative(path.join(import.meta.dirname, '../..'), serverBinary), sha256: binarySha256, accepted: acceptance.binary.sha256, equal: binarySha256 === acceptance.binary.sha256 },
  acceptedFullDataset: 'research/gpu-phase7/cache/FULL.gb2ds (fileSha256 6e977ccd6104acf1…)',
  runs,
  pass
};

if (out) fs.writeFileSync(out, `${JSON.stringify(record, null, 1)}\n`);
console.log(`pass: ${pass}`);
process.exitCode = pass ? 0 : 2;

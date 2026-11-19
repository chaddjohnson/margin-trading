// gpu-phase2 gate P3 (PROTOCOL.md §9; brief §1.2, §4.3): every failure mode must REFUSE or TERMINATE without a single
// candidate evaluated on the CPU and without a plausible-but-wrong result. Three groups:
//   gate     the official gate (openOfficialGpuSession) refuses before any search evaluation;
//   runtime  the attested GpuPool fails the job (checkpointable; CPU-scored stays 0; no result escapes);
//   cli      legacy CPU runners, CPU workers and the preflight refuse official purposes.
// Test hooks run only on a server started with --allow-fault-injection (an official gate refuses such a server).
//   node --experimental-transform-types tools/gpu-phase2/negative.ts --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { incumbents } from '../../src/vg-l0-full-joint/nl0.ts';
import { cacheDir, openDoor, repoRoot, writeJson } from '../../src/gpu-phase2/context.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase2/subjects.ts';
import { fixtureDoor } from '../../src/gpu-phase2/fixtures.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type Task } from '../../src/gpu-backend/client.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { EvalLab } from '../../src/gpu-backend/lab.ts';
import { openOfficialGpuSession, smiUuid } from '../../src/gpu-backend/official.ts';
import { assignment3Domain } from '../../src/gpu-backend/domain.ts';
import { FEATURE } from '../../src/gpu-backend/layout.ts';
import { compatManifest } from '../../src/gpu-backend/compat.ts';
import { checkGpuPolicy } from '../../src/research-standard/gpuPolicy.ts';
import { buildDir, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { canonHash } from '../../src/gpu-backend/canon.ts';

const args = process.argv.slice(2);
const out = args[args.indexOf('--out') + 1]!;
const dev = path.join(buildDir, 'gb2-dev');
const perturbed = path.join(buildDir, 'gb2-perturbed');
const stale = path.join(buildDir, 'gb2-stale');
const door = await openDoor('W-QUIET', 'P3 negative tests');
const ds = exportDataset(door, cacheDir);
const domain = assignment3Domain(incumbents().NL0.quad.d1.VGT);
const tmp = fs.mkdtempSync(path.join(cacheDir, 'negative-'));
const rows: { group: string; name: string; expect: string; observed: string; pass: boolean; cpuScored: number; resultsReturned: number }[] = [];
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const tasksOf = (n: number, label = 'NEG'): Task[] => [...referenceSubjects(), ...randomSubjects(n, label), ...growthStrata(1, `${label}-G`)].map((s) => ({ k: s.key, quad: s.quad, controls: s.controls, options: vOptions, detail: false }));
const record = (group: string, name: string, expect: RegExp, observed: string, cpuScored = 0, resultsReturned = 0, extra = true) => {
  const pass = expect.test(observed) && cpuScored === 0 && extra;

  rows.push({ group, name, expect: expect.source, observed: observed.slice(0, 400), pass, cpuScored, resultsReturned });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${group}] ${name}: ${observed.slice(0, 160)}`);
};
const spec = (o: Partial<Parameters<typeof openOfficialGpuSession>[0]> = {}) => ({
  study: 'research/gpu-phase2',
  runId: 'negative',
  purpose: 'official-optimization',
  door,
  domain,
  plannedBatch: 1024,
  binary: dev,
  cacheDir,
  allowUnaccepted: true,
  parityMiniSet: 4,
  ...o
});
const gate = async (name: string, expect: RegExp, o: Partial<Parameters<typeof openOfficialGpuSession>[0]>) => {
  try {
    const s = await openOfficialGpuSession(spec(o));

    await s.server.close();
    record('gate', name, expect, `OPENED (attestation ${path.basename(s.attestationFile)})`);
  } catch (e) {
    record('gate', name, expect, (e as Error).message);
  }
};

// ----- the official gate -----
await gate('no execution purpose declared', /preflight-purpose/, { purpose: undefined });
await gate('a non-official purpose opening the official gate', /preflight-purpose/, { purpose: 'cpu-reference' });
await gate('no GPU acceptance record (the activation gate)', /preflight-acceptance.*no GPU acceptance record/, { allowUnaccepted: false, acceptanceFile: path.join(tmp, 'none.json') });

const forged = (o: Record<string, unknown>) => {
  const m = compatManifest();
  const f = path.join(tmp, `acceptance-${Math.random().toString(36).slice(2)}.json`);

  fs.writeFileSync(f, JSON.stringify({ kind: 'gpu-backend acceptance', schema: 1, status: 'ACCEPTED', study: 'x', acceptedAt: 'x', standard: {}, compat: m, binary: { path: 'x', sha256: sha(dev) }, device: { uuid: smiUuid(), name: 'x', driver: 'x', cc: 'x' }, capabilities: 'x', domain: {}, evidence: [], blockers: [], ...o }));
  return f;
};
const m0 = compatManifest();

await gate('a forged acceptance with a stale CPU source digest (source-hash mismatch)', /preflight-acceptance.*changed since acceptance/, {
  allowUnaccepted: false,
  acceptanceFile: forged({ compat: { ...m0, cpu: { ...m0.cpu, files: m0.cpu.files.map((f, i) => (i === 3 ? { ...f, sha256: '0'.repeat(64) } : f)) } } })
});
await gate('an acceptance for another binary (resume with the wrong binary)', /preflight-acceptance.*binary sha256/, { allowUnaccepted: false, acceptanceFile: forged({ binary: { path: 'x', sha256: '1'.repeat(64) } }) });
await gate('an acceptance for another GPU (wrong GPU)', /preflight-accepted-device/, { allowUnaccepted: false, acceptanceFile: forged({ device: { uuid: 'GPU-00000000-0000-0000-0000-000000000000', name: 'x', driver: 'x', cc: 'x' } }) });
await gate('CUDA disabled (no GPU visible)', /preflight-server/, { serverEnv: { ...process.env, CUDA_VISIBLE_DEVICES: '' } });
await gate('a stale build (compiled from other sources)', /preflight-compat/, { binary: stale });
await gate('a server with test hooks / fault injection', /preflight-no-test-hooks/, { testHooks: ['--test-corrupt-smoke'] });
await gate('a reachable feature the GPU does not implement (unsupported Growth structure in the domain)', /preflight-capability.*LIFECYCLE_L1_L2/, { domain: { ...domain, features: domain.features | FEATURE.LIFECYCLE_L1_L2 } });
await gate('insufficient VRAM for the planned batch', /preflight-memory/, { plannedBatch: 50_000_000 });
await gate('a wrong kernel (deliberately perturbed build): the parity mini-set refuses', /preflight-parity/, { binary: perturbed });
// the smoke check itself (the gate's no-test-hooks check runs first): the client sees the corrupted kernel result
{
  const s = GpuServer.start({ binary: dev, libDir: toolkitLib, allowFault: true, testHooks: ['--test-corrupt-smoke'] });
  const r = await s.smoke();

  await s.close();
  record('gate', 'a failed smoke kernel (wrong live result)', /smoke ok=false/, `smoke ok=${r.ok} (sum ${r.sum} vs ${r.expected.sum})`);
}
// a resumed run repeats the whole gate (a new attestation before any evaluation)
{
  const a = await openOfficialGpuSession(spec());
  const b = await openOfficialGpuSession(spec());

  await a.server.close();
  await b.server.close();
  record('gate', 'resume/restart repeats the preflight and records a new attestation', /two attestations/, a.attestationFile !== b.attestationFile ? 'two attestations, each before any evaluation' : 'one attestation');
}

// ----- runtime failures of the attested pool -----
const runPool = async (name: string, expect: RegExp, o: { hooks?: string[]; budgetMb?: number; tasks?: Task[]; kill?: boolean; fault?: boolean; batchTimeoutMs?: number; domainFeatures?: bigint; cheat?: boolean; expectUuid?: string; capBase?: number; positive?: boolean }) => {
  const server = GpuServer.start({ binary: dev, libDir: toolkitLib, allowFault: true, testHooks: o.hooks, vramBudgetMb: o.budgetMb });
  const info = await server.info();

  await server.load(ds.file);

  const ledger = path.join(tmp, `${name.replace(/\W+/g, '-')}.jsonl`);
  const pool = new GpuPool({ door, session: null, server, uuid: o.expectUuid ?? info.uuid, ledgerFile: ledger, batchSize: 64, lingerMs: 5, batchTimeoutMs: o.batchTimeoutMs, domainFeatures: o.domainFeatures, capBase: o.capBase });
  const tasks = o.tasks ?? tasksOf(160);
  let returned = 0;
  let observed = '';
  const values = new Map<string, unknown>();

  if (o.cheat) pool.counters.cpuScored++; // a CPU evaluation slipping into the official counters
  if (o.fault) await server.fault().catch((e) => (observed = `fault: ${(e as Error).message} | `)); // a device trap: the server reports and exits
  try {
    const p = pool.run(tasks, (t, v) => {
      returned++;
      values.set(t.k, v);
      if (o.kill && returned === 64) server.kill('SIGKILL');
    });

    await p;
    observed += `completed ${returned}/${tasks.length}; capacity retries ${pool.counters.capacityRetries}; CPU-scored ${pool.counters.cpuScored}`;
  } catch (e) {
    observed += (e as Error).message;
  }
  try {
    await pool.close();
  } catch (e) {
    observed += ` | close: ${(e as Error).message}`;
  }
  record('runtime', name, expect, observed, o.cheat ? 0 : pool.counters.cpuScored, returned, o.positive ? returned === tasks.length : returned < tasks.length || o.cheat === true);
  return values;
};

await runPool('GPU out of memory (VRAM budget exceeded)', /GPU memory/, { budgetMb: 1 });
await runPool('the GPU server killed during a search', /exited|died|SIGKILL/, { kill: true });
await runPool('a corrupted batch response (a bit flipped after the device checksum)', /corrupted transfer/, { hooks: ['--test-corrupt-output'] });
await runPool('device execution counters that disagree (untrustworthy receipt)', /device counters/, { hooks: ['--test-bad-receipt'] });
await runPool('a receipt from another GPU', /receipt from GPU-/, { expectUuid: 'GPU-00000000-0000-0000-0000-000000000000' });
await runPool('a stalled server (heartbeat lost)', /gpu-hang/, { hooks: ['--test-stall-ms', '8000'], batchTimeoutMs: 3000 });
await runPool('a device fault (trap) during the run', /CUDA error|exited|died/, { fault: true });
await runPool('a task outside the attested domain (mid-run capability re-check)', /capability-outside-domain/, { domainFeatures: domain.features & ~FEATURE.G_RETENTION, tasks: growthStrata(2, 'NEG-RET').filter((s) => s.key.includes('retain=on')).map((s) => ({ k: s.key, quad: s.quad, controls: s.controls, options: vOptions, detail: false })) });
await runPool('a CPU-scored evaluation in the official counters (mid-run routing to the CPU)', /cpu-scored/, { cheat: true, tasks: tasksOf(4) });
// a capacity overflow is re-evaluated ON THE GPU and gives the same records as the normal capacities
{
  const small = await runPool('a capacity overflow re-evaluated on the GPU (positive control)', /completed .* capacity retries [1-9]/, { capBase: 4, tasks: tasksOf(24), positive: true });
  const normal = await runPool('the same tasks at normal capacities (reference for the retry)', /completed/, { tasks: tasksOf(24), positive: true });
  const same = [...normal.keys()].every((k) => canonHash(small.get(k)) === canonHash(normal.get(k)));

  record('runtime', 'records after the GPU capacity retry equal the normal run', /identical/, same ? 'identical' : 'differ', 0, 0, true);
}
// a corrupted dataset and invalid timestamps
{
  const bad = path.join(tmp, 'corrupt.gb2ds');
  const b = fs.readFileSync(ds.file);

  b[b.length - 9] ^= 0xff;
  fs.writeFileSync(bad, b);
  const s = GpuServer.start({ binary: dev, libDir: toolkitLib });

  try {
    await s.load(bad);
    record('runtime', 'a corrupted dataset file', /checksum/, 'loaded');
  } catch (e) {
    record('runtime', 'a corrupted dataset file', /checksum/, (e as Error).message);
  }
  await s.close();
  const f = fixtureDoor(99, 120);

  f.sym.VGT.ds.bTime[5] = f.sym.VGT.ds.bTime[5]! + 0.5;
  try {
    exportDataset(f, tmp, 'invalid-times');
    record('runtime', 'invalid (non-integer) timestamps in a door', /non-integer|strictly increasing/, 'exported');
  } catch (e) {
    record('runtime', 'invalid (non-integer) timestamps in a door', /non-integer|strictly increasing/, (e as Error).message);
  }
}
// resume of an archive under another backend / evaluation code (changed fingerprint)
{
  const mk = (backend: string, codeDigest: string) =>
    new EvalLab({ study: 'research/gpu-phase2', job: 'negative-binding', door: 'W-QUIET', doorPin: 'x', purpose: 'test', pool: { start: async () => {}, run: async () => {}, requestStop: () => {}, stopping: null, close: async () => {} }, backend, codeDigest, cacheRoot: tmp });
  const a = mk('gpu:A', 'code-1');

  await a.close();
  for (const [name, b, c] of [['a resume under another GPU binary/backend', 'gpu:B', 'code-1'], ['a resume under changed evaluation code', 'gpu:A', 'code-2']] as const)
    try {
      mk(b, c);
      record('runtime', name, /refused/, 'opened');
    } catch (e) {
      record('runtime', name, /refused/, (e as Error).message);
    }
}

// ----- CLI, CPU workers and the preflight -----
const npm = (script: string, env: Record<string, string>) => spawnSync('npm', ['run', '--silent', script], { cwd: repoRoot, env: { PATH: process.env.PATH!, HOME: process.env.HOME!, ...env }, encoding: 'utf8', timeout: 60000 });
{
  const r = npm('vg-l0fj', {});

  record('cli', 'a legacy CPU optimizer started without a purpose', /purpose-required/, `exit ${r.status}: ${r.stderr}`);
  const r2 = npm('vg-l0fj', { GPU_POLICY_PURPOSE: 'official-optimization' });

  record('cli', 'a legacy CPU optimizer started as official optimization (forced CPU backend)', /cpu-official-refused/, `exit ${r2.status}: ${r2.stderr}`);
  const r3 = npm('optimizer', {});

  record('cli', 'the generic CPU optimizer (app.ts) without a purpose', /purpose-required/, `exit ${r3.status}: ${r3.stderr}`);
  const w = spawnSync(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', path.join(repoRoot, 'src/gpu-phase2/cpuEvalWorker.ts')], { env: { PATH: process.env.PATH!, GPU_POLICY_PURPOSE: 'official-optimization' }, encoding: 'utf8', timeout: 30000 });

  record('cli', 'a CPU evaluation worker started for official optimization (non-GPU evaluation from an optimizer worker)', /cpu-official-refused/, `exit ${w.status}: ${w.stderr}`);
  const reg = { versions: [{ version: '3.0.0', effective: '2026-11-19' }] };
  const p = checkGpuPolicy({ scope: 'optimization', adoptedAt: '2026-11-20T00:00:00Z', evaluationBackend: { policy: 'gpu-required', purpose: 'official-optimization' } }, '3.0.0', reg, { acceptanceFile: path.join(tmp, 'none.json') });

  record('cli', 'the standard preflight of an official 3.0.0 study without an accepted GPU evaluator', /BLOCKED/, p.errors.join('; '));
}

fs.rmSync(tmp, { recursive: true, force: true });
const pass = rows.every((r) => r.pass);

writeJson(out, { kind: 'gpu-phase2 P3 negative tests', t: new Date().toISOString(), binaries: { dev: sha(dev), perturbed: sha(perturbed), stale: sha(stale) }, door: 'W-QUIET', total: rows.length, passed: rows.filter((r) => r.pass).length, pass, rows });
console.log(`${rows.filter((r) => r.pass).length}/${rows.length} negative tests pass`);
process.exitCode = pass ? 0 : 2;

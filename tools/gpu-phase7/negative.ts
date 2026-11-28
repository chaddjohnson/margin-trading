// gpu-phase7 (copy of tools/gpu-phase6/negative.ts, this study's namespace and its own final builds research/gpu-phase7/
// build/gb7-{dev,perturbed,stale}; PROTOCOL.md §6 gate E3). New in Phase 7: the 'risk' group — the risk-envelope delivery
// fails closed (a decoded result without the requested envelope, or with one it did not request, withholds the batch;
// the Lab never archives an invalid envelope), with a positive control. Phase 6's header follows.
// gpu-phase6: New in Phase 6: the
// job cases (an official run without a held job of its study, a released job, a foreign run id or dataset cache, a
// second writer of a job's archive; a gate opened WITH a job records it) and the engine-runtime cases beyond the official
// path (the legacy runner gate, Strategy Lab's server and runners started without --no-maglev). The binaries are the
// accepted Phase 5 builds, read in place (research/gpu-phase5/build/: gb5-dev = the accepted gb5, gb5-perturbed,
// gb5-stale; never written). Phase 5's header follows.
// Phase 5: (copy of tools/gpu-phase3/negative.ts) gate H5: Phase 2's negative tests (tools/gpu-phase2/negative.ts: the official gate
// refuses before any search evaluation; the attested pool fails the job with no CPU-scored evaluation and no result
// escaping; legacy CPU runners, CPU workers and the preflight refuse official purposes) on the final binary, with the
// gate's records in schema 2 and the pool running on the parallel host path, plus the host-path cases: a host worker
// that throws, exits or hangs mid-job, a host path that cannot start, and a pipeline holding another door. Test hooks
// run only on a server started with --allow-fault-injection or a pipeline with allowFaultInjection (an official gate
// refuses both). The source-tamper cases run in a sandbox clone (tools/gpu-phase7/tamper.ts).
//   node --no-maglev --experimental-transform-types tools/gpu-phase7/negative.ts --out <json> [--host-workers 3]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { incumbents } from '../../src/vg-l0-full-joint/nl0.ts';
import { cacheDir, openDoor, repoRoot, writeJson } from '../../src/gpu-phase7/context.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase7/subjects.ts';
import { fixtureDoor } from '../../src/gpu-phase5/fixtures.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type Task, type TaskResult } from '../../src/gpu-backend/client.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { EvalLab, RISK_KEY_SUFFIX, checkEnvelope } from '../../src/gpu-backend/lab.ts';
import { evalKeyOf, quadOf } from '../../src/vg-l0-full-joint/space.ts';
import { incumbentCfg } from '../../src/vg-l0-full-joint/stages.ts';
import { openOfficialGpuSession, smiUuid } from '../../src/gpu-backend/official.ts';
import { engineRuntime } from '../../src/gpu-backend/runtime.ts';
import { assignment3Domain } from '../../src/gpu-backend/domain.ts';
import { FEATURE } from '../../src/gpu-backend/layout.ts';
import { compatManifest, policySources } from '../../src/gpu-backend/compat.ts';
import { headCommit } from '../../src/gpu-backend/acceptance.ts';
import { checkGpuPolicy } from '../../src/research-standard/gpuPolicy.ts';
import { toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { ENFORCEMENT_EXTRAS } from '../../src/gpu-backend/acceptance.ts';
import { JobError, openJob } from '../../src/gpu-jobs/jobs.ts';
import { canonHash } from '../../src/gpu-backend/canon.ts';

// every case declares its own purpose (or none): a purpose in the caller's environment would mask the "no purpose" case
delete process.env.GPU_POLICY_PURPOSE;

const args = process.argv.slice(2);
const out = args[args.indexOf('--out') + 1]!;
// GPU Phase 7: this study's final builds (tools/gpu-phase7/build-final.sh): gb7-dev = the final gb7, gb7-perturbed,
// gb7-stale (GPU_PHASE7_BUILD overrides the directory for development runs only)
const p7build = process.env.GPU_PHASE7_BUILD ?? path.join(repoRoot, 'research', 'gpu-phase7', 'build');
const dev = path.join(p7build, 'gb7-dev');
const perturbed = path.join(p7build, 'gb7-perturbed');
const stale = path.join(p7build, 'gb7-stale');
const hostWorkers = Number(args.includes('--host-workers') ? args[args.indexOf('--host-workers') + 1] : '3');
const door = await openDoor('W-QUIET', 'P6 negative tests');
const ds = exportDataset(door, cacheDir);
const domain = assignment3Domain(incumbents().NL0.quad.d1.VGT);
const tmp = fs.mkdtempSync(path.join(cacheDir, 'negative-'));
const rows: {
  group: string;
  name: string;
  expect: string;
  observed: string;
  pass: boolean;
  cpuScored: number;
  resultsReturned: number;
}[] = [];
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const tasksOf = (n: number, label = 'NEG'): Task[] =>
  [...referenceSubjects(), ...randomSubjects(n, label), ...growthStrata(1, `${label}-G`)].map((s) => ({
    k: s.key,
    quad: s.quad,
    controls: s.controls,
    options: vOptions,
    detail: false
  }));
const record = (
  group: string,
  name: string,
  expect: RegExp,
  observed: string,
  cpuScored = 0,
  resultsReturned = 0,
  extra = true
) => {
  const pass = expect.test(observed) && cpuScored === 0 && extra;

  rows.push({ group, name, expect: expect.source, observed: observed.slice(0, 400), pass, cpuScored, resultsReturned });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${group}] ${name}: ${observed.slice(0, 160)}`);
};
const spec = (o: Partial<Parameters<typeof openOfficialGpuSession>[0]> = {}) => ({
  study: 'research/gpu-phase7',
  runId: 'negative',
  purpose: 'official-optimization',
  door,
  domain,
  plannedBatch: 1024,
  binary: dev,
  cacheDir,
  allowUnaccepted: true,
  parityMiniSet: 4,
  hostWorkers,
  ...o
});
// held jobs of this study for the official cases that pass the acceptance (each case its own job: one owner each)
const jobsRoot = path.join(tmp, 'jobs');
let jobN = 0;
const heldJob = (purpose = 'official-optimization', study = 'research/gpu-phase7') =>
  openJob({
    study,
    job: `neg-${jobN++}`,
    identity: { suite: 'negative', n: jobN },
    purpose,
    cacheRoot: path.join(jobsRoot, 'cache'),
    resultsRoot: path.join(jobsRoot, 'results')
  });
const gate = async (name: string, expect: RegExp, o: Partial<Parameters<typeof openOfficialGpuSession>[0]>) => {
  try {
    const s = await openOfficialGpuSession(spec(o));

    await s.pipeline?.close();
    await s.server.close();
    record('gate', name, expect, `OPENED (attestation ${path.basename(s.attestationFile)})`);
  } catch (e) {
    record('gate', name, expect, (e as Error).message);
  }
};

// ----- the official gate -----
await gate('no execution purpose declared', /preflight-purpose/, { purpose: undefined });
await gate('a non-official purpose opening the official gate', /preflight-purpose/, { purpose: 'cpu-reference' });
await gate('no GPU acceptance record (the activation gate)', /preflight-acceptance.*no GPU acceptance record/, {
  allowUnaccepted: false,
  acceptanceFile: path.join(tmp, 'none.json')
});

const forged = (o: Record<string, unknown>) => {
  const m = compatManifest();
  const f = path.join(tmp, `acceptance-${Math.random().toString(36).slice(2)}.json`);

  fs.writeFileSync(
    f,
    JSON.stringify({
      kind: 'gpu-backend acceptance',
      schema: 2,
      status: 'ACCEPTED',
      study: 'x',
      acceptedAt: 'x',
      standard: {},
      compat: m,
      policy: {
        ...policySources([...ENFORCEMENT_EXTRAS, 'tools/gpu-phase7/negative.ts']),
        generator: 'tools/gpu-phase7/negative.ts'
      },
      source: { commit: headCommit(), tree: '', branch: '' },
      hostPath: { defaultWorkers: hostWorkers, modes: ['serial', 'parallel'] },
      binary: { path: 'x', sha256: sha(dev) },
      device: { uuid: smiUuid(), name: 'x', driver: 'x', cc: 'x' },
      capabilities: 'x',
      domain: {},
      evidence: [],
      blockers: [],
      supersedes: null,
      ...o
    })
  );
  return f;
};
const m0 = compatManifest();

await gate(
  'a forged acceptance with a stale CPU source digest (source-hash mismatch)',
  /preflight-acceptance.*changed since acceptance/,
  {
    allowUnaccepted: false,
    acceptanceFile: forged({
      compat: {
        ...m0,
        cpu: { ...m0.cpu, files: m0.cpu.files.map((f, i) => (i === 3 ? { ...f, sha256: '0'.repeat(64) } : f)) }
      }
    })
  }
);
await gate('an acceptance for another binary (resume with the wrong binary)', /preflight-acceptance.*binary sha256/, {
  allowUnaccepted: false,
  acceptanceFile: forged({ binary: { path: 'x', sha256: '1'.repeat(64) } })
});
await gate('an acceptance for another GPU (wrong GPU)', /preflight-accepted-device/, {
  allowUnaccepted: false,
  job: heldJob(),
  runId: undefined,
  cacheDir: undefined,
  acceptanceFile: forged({
    device: { uuid: 'GPU-00000000-0000-0000-0000-000000000000', name: 'x', driver: 'x', cc: 'x' }
  })
});
await gate('CUDA disabled (no GPU visible)', /preflight-server/, {
  serverEnv: { ...process.env, CUDA_VISIBLE_DEVICES: '' }
});
await gate('a stale build (compiled from other sources)', /preflight-compat/, { binary: stale });
await gate('a server with test hooks / fault injection', /preflight-no-test-hooks/, {
  testHooks: ['--test-corrupt-smoke']
});
await gate(
  'a reachable feature the GPU does not implement (unsupported Growth structure in the domain)',
  /preflight-capability.*LIFECYCLE_L1_L2/,
  { domain: { ...domain, features: domain.features | FEATURE.LIFECYCLE_L1_L2 } }
);
await gate('insufficient VRAM for the planned batch', /preflight-memory/, { plannedBatch: 50_000_000 });
await gate('a wrong kernel (deliberately perturbed build): the parity mini-set refuses', /preflight-parity/, {
  binary: perturbed
});
await gate(
  'a wrong kernel through the serial host path (host workers 0): the parity mini-set refuses',
  /preflight-parity/,
  { binary: perturbed, hostWorkers: 0 }
);
await gate('a host path that cannot start (an invalid worker count)', /preflight-host-path/, { hostWorkers: -1 });
await gate('a schema-1 acceptance record (it pins no enforcement code)', /preflight-acceptance.*schema 1/, {
  allowUnaccepted: false,
  acceptanceFile: forged({ schema: 1 })
});
await gate(
  'a forged acceptance whose enforcement pin differs (the CPU-official refusal changed)',
  /preflight-acceptance.*enforcement code changed.*purpose\.ts/,
  {
    allowUnaccepted: false,
    acceptanceFile: forged({
      policy: (() => {
        const p = policySources([...ENFORCEMENT_EXTRAS, 'tools/gpu-phase7/negative.ts']);
        return {
          ...p,
          generator: 'tools/gpu-phase7/negative.ts',
          files: p.files.map((f) => (f.path === 'src/gpu-backend/purpose.ts' ? { ...f, sha256: '0'.repeat(64) } : f))
        };
      })()
    })
  }
);
await gate(
  'a forged acceptance from another history (its source revision is not an ancestor of HEAD)',
  /preflight-acceptance.*not an ancestor/,
  { allowUnaccepted: false, acceptanceFile: forged({ source: { commit: 'f'.repeat(40), tree: '', branch: '' } }) }
);
// the smoke check itself (the gate's no-test-hooks check runs first): the client sees the corrupted kernel result
{
  const s = GpuServer.start({ binary: dev, libDir: toolkitLib, allowFault: true, testHooks: ['--test-corrupt-smoke'] });
  const r = await s.smoke();

  await s.close();
  record(
    'gate',
    'a failed smoke kernel (wrong live result)',
    /smoke ok=false/,
    `smoke ok=${r.ok} (sum ${r.sum} vs ${r.expected.sum})`
  );
}
// a resumed run repeats the whole gate (a new attestation before any evaluation)
{
  const a = await openOfficialGpuSession(spec());
  const b = await openOfficialGpuSession(spec());

  await a.pipeline?.close();
  await b.pipeline?.close();
  await a.server.close();
  await b.server.close();
  record(
    'gate',
    'resume/restart repeats the preflight and records a new attestation',
    /two attestations/,
    a.attestationFile !== b.attestationFile ? 'two attestations, each before any evaluation' : 'one attestation'
  );
}

// ----- the job (GPU Phase 6): an official run owns an isolated job of its study, held by this process -----
{
  const official = { allowUnaccepted: false, acceptanceFile: forged({}), runId: undefined, cacheDir: undefined };
  const jobGate = async (name: string, expect: RegExp, o: Partial<Parameters<typeof openOfficialGpuSession>[0]>) => {
    try {
      const s = await openOfficialGpuSession(spec({ ...official, ...o }));

      await s.pipeline?.close();
      await s.server.close();
      record('job', name, expect, `OPENED job ${s.attestation.job?.id} (attestation ${path.basename(s.attestationFile)})`);
      return s;
    } catch (e) {
      record('job', name, expect, (e as Error).message);
      return null;
    }
  };

  await jobGate('an official run (accepted record) without a job', /preflight-job: an official run owns an isolated job/, {});
  await jobGate('an official run with a job of another study', /preflight-job: .*belongs to research\/zz-elsewhere/, {
    job: heldJob('official-optimization', 'research/zz-elsewhere')
  });
  {
    const j = heldJob();

    j.release('released before the gate');
    await jobGate('an official run with a job this process released', /preflight-job: .*not held by this process/, { job: j });
  }
  await jobGate('an official run whose run id is not its job', /preflight-job: run id other is not the job's name/, {
    job: heldJob(),
    runId: 'other'
  });
  await jobGate('an official run with another dataset cache than its job', /preflight-job: dataset cache .* is not the job's/, {
    job: heldJob(),
    cacheDir: cacheDir
  });
  await jobGate('an official run with a job opened for a non-official purpose', /preflight-job: .*opened for purpose parity-test/, {
    job: heldJob('parity-test')
  });
  {
    const j = heldJob();
    const s = await jobGate('an official run with its held job opens the gate and records the job', /^OPENED job research\/gpu-phase7\/neg-/, {
      job: j
    });
    const ev = fs.readFileSync(j.files.events, 'utf8');

    record(
      'job',
      'the attestation names the job and the job logs the attestation; the dataset was exported into the job\'s own cache',
      /^job recorded$/,
      // the dataset in the job's own cache is the one attested (by content; the exporter names a window door fixture_<name>)
      s?.attestation.job?.id === j.id &&
      /"event":"attestation"/.test(ev) &&
      fs
        .readdirSync(j.dirs.dataset)
        .some((f) => f.endsWith('.gb2ds') && sha(path.join(j.dirs.dataset, f)) === s.attestation.dataset.sha256)
        ? 'job recorded'
        : `attestation job ${JSON.stringify(s?.attestation.job)}; events ${ev.slice(0, 200)}`
    );
    // a second writer of the job's archive: an EvalLab without the job context on the job's own directory
    try {
      new EvalLab({
        study: 'research/gpu-phase7',
        job: j.name,
        door: 'W-QUIET',
        doorPin: 'x',
        purpose: 'test',
        pool: { start: async () => {}, run: async () => {}, requestStop: () => {}, stopping: null, close: async () => {} },
        backend: 'gpu:x',
        codeDigest: 'x',
        cacheRoot: j.labCacheRoot
      });
      record('job', "a second writer of a held job's archive (an EvalLab without the job)", /JOB_ACTIVE/, 'opened');
    } catch (e) {
      record('job', "a second writer of a held job's archive (an EvalLab without the job)", /JOB_ACTIVE/, (e as Error).message);
    }
    // the same job opened again by another process while held
    const r = spawnSync(
      process.execPath,
      [
        '--no-maglev',
        '--experimental-transform-types',
        '--disable-warning=ExperimentalWarning',
        'src/gpu-jobs/tests/jobChild.ts',
        'job',
        'research/gpu-phase7',
        j.name,
        path.join(jobsRoot, 'cache'),
        path.join(jobsRoot, 'results'),
        '0',
        'resume'
      ],
      { cwd: repoRoot, encoding: 'utf8', timeout: 30000, input: '' }
    );

    record('job', 'the held job opened by another process (resume)', /JOB_ACTIVE/, r.stdout.trim());
    j.release('negative suite');
  }
  try {
    heldJob().release();
    openJob({
      study: 'research/gpu-phase7',
      job: `neg-${jobN - 1}`,
      identity: { suite: 'negative', n: jobN },
      purpose: 'official-optimization',
      cacheRoot: path.join(jobsRoot, 'cache'),
      resultsRoot: path.join(jobsRoot, 'results')
    });
    record('job', 'an existing job reopened as a new job (no resume)', /JOB_EXISTS/, 'opened');
  } catch (e) {
    record('job', 'an existing job reopened as a new job (no resume)', /JOB_EXISTS/, e instanceof JobError ? e.message : String(e));
  }
}

// ----- runtime failures of the attested pool -----
const runPool = async (
  name: string,
  expect: RegExp,
  o: {
    hooks?: string[];
    budgetMb?: number;
    tasks?: Task[];
    kill?: boolean;
    fault?: boolean;
    batchTimeoutMs?: number;
    domainFeatures?: bigint;
    cheat?: boolean;
    expectUuid?: string;
    capBase?: number;
    positive?: boolean;
    hostFault?: 'throw' | 'exit' | 'hang';
    otherDoor?: boolean;
    serial?: boolean;
  }
) => {
  const server = GpuServer.start({
    binary: dev,
    libDir: toolkitLib,
    allowFault: true,
    testHooks: o.hooks,
    vramBudgetMb: o.budgetMb
  });
  const info = await server.info();

  await server.load(ds.file);

  const ledger = path.join(tmp, `${name.replace(/\W+/g, '-')}.jsonl`);
  const pipe = o.serial
    ? null
    : await HostPipeline.start({
        door: o.otherDoor ? { ...door } : door,
        workers: hostWorkers,
        minShard: 8,
        allowFaultInjection: !!o.hostFault,
        opTimeoutMs: 5000
      });
  const pool = new GpuPool({
    door,
    session: null,
    server,
    uuid: o.expectUuid ?? info.uuid,
    ledgerFile: ledger,
    batchSize: 64,
    lingerMs: 5,
    batchTimeoutMs: o.batchTimeoutMs,
    domainFeatures: o.domainFeatures,
    capBase: o.capBase,
    ...(pipe ? { pipeline: pipe } : {})
  });
  const tasks = o.tasks ?? tasksOf(160);
  let returned = 0;
  let observed = '';
  const values = new Map<string, unknown>();

  if (o.cheat) pool.counters.cpuScored++; // a CPU evaluation slipping into the official counters
  if (o.fault) await server.fault().catch((e) => (observed = `fault: ${(e as Error).message} | `)); // a device trap: the server reports and exits
  try {
    const p = pool.run(tasks, (t, v) => {
      if (o.hostFault && returned === 63) pipe!.injectNextDecodeFault(o.hostFault, 1); // the next batch's decode fails in a worker
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
  await pipe?.close();
  record(
    'runtime',
    name,
    expect,
    observed,
    o.cheat ? 0 : pool.counters.cpuScored,
    returned,
    o.positive ? returned === tasks.length : returned < tasks.length || o.cheat === true
  );
  return values;
};

await runPool('GPU out of memory (VRAM budget exceeded)', /GPU memory/, { budgetMb: 1 });
await runPool('the GPU server killed during a search', /exited|died|SIGKILL/, { kill: true });
await runPool('a corrupted batch response (a bit flipped after the device checksum)', /corrupted transfer/, {
  hooks: ['--test-corrupt-output']
});
await runPool('device execution counters that disagree (untrustworthy receipt)', /device counters/, {
  hooks: ['--test-bad-receipt']
});
await runPool('a receipt from another GPU', /receipt from GPU-/, {
  expectUuid: 'GPU-00000000-0000-0000-0000-000000000000'
});
await runPool('a stalled server (heartbeat lost)', /gpu-hang/, {
  hooks: ['--test-stall-ms', '8000'],
  batchTimeoutMs: 3000
});
await runPool('a device fault (trap) during the run', /CUDA error|exited|died/, { fault: true });
await runPool('a task outside the attested domain (mid-run capability re-check)', /capability-outside-domain/, {
  domainFeatures: domain.features & ~FEATURE.G_RETENTION,
  tasks: growthStrata(2, 'NEG-RET')
    .filter((s) => s.key.includes('retain=on'))
    .map((s) => ({ k: s.key, quad: s.quad, controls: s.controls, options: vOptions, detail: false }))
});
await runPool('a CPU-scored evaluation in the official counters (mid-run routing to the CPU)', /cpu-scored/, {
  cheat: true,
  tasks: tasksOf(4)
});
await runPool('a host worker that throws while decoding a batch (mid-job)', /injected decode failure/, {
  hostFault: 'throw'
});
await runPool('a host worker that exits while decoding a batch (mid-job)', /host worker \d+ exited \(7\)/, {
  hostFault: 'exit'
});
await runPool('a host worker that stops answering (mid-job)', /did not answer decode/, { hostFault: 'hang' });
await runPool('a host pipeline holding another door', /another door/, { otherDoor: true });
await runPool(
  'the serial host path still fails closed on a corrupted response (host workers 0)',
  /corrupted transfer/,
  { hooks: ['--test-corrupt-output'], serial: true }
);
// a capacity overflow is re-evaluated ON THE GPU and gives the same records as the normal capacities
{
  const small = await runPool(
    'a capacity overflow re-evaluated on the GPU (positive control)',
    /completed .* capacity retries [1-9]/,
    { capBase: 4, tasks: tasksOf(24), positive: true }
  );
  const normal = await runPool('the same tasks at normal capacities (reference for the retry)', /completed/, {
    tasks: tasksOf(24),
    positive: true
  });
  const same = [...normal.keys()].every((k) => canonHash(small.get(k)) === canonHash(normal.get(k)));

  record(
    'runtime',
    'records after the GPU capacity retry equal the normal run',
    /identical/,
    same ? 'identical' : 'differ',
    0,
    0,
    true
  );
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
    record(
      'runtime',
      'invalid (non-integer) timestamps in a door',
      /non-integer|strictly increasing/,
      (e as Error).message
    );
  }
}
// resume of an archive under another backend / evaluation code (changed fingerprint)
{
  const mk = (backend: string, codeDigest: string) =>
    new EvalLab({
      study: 'research/gpu-phase7',
      job: 'negative-binding',
      door: 'W-QUIET',
      doorPin: 'x',
      purpose: 'test',
      pool: {
        start: async () => {},
        run: async () => {},
        requestStop: () => {},
        stopping: null,
        close: async () => {}
      },
      backend,
      codeDigest,
      cacheRoot: tmp
    });
  const a = mk('gpu:A', 'code-1');

  await a.close();
  for (const [name, b, c] of [
    ['a resume under another GPU binary/backend', 'gpu:B', 'code-1'],
    ['a resume under changed evaluation code', 'gpu:A', 'code-2']
  ] as const)
    try {
      mk(b, c);
      record('runtime', name, /refused/, 'opened');
    } catch (e) {
      record('runtime', name, /refused/, (e as Error).message);
    }
}

// ----- GPU Phase 7: the risk-envelope delivery (group 'risk'): the pool and the Lab never release a record whose
// envelope does not match its request; a decoder fault is simulated by a proxy of the real server's complete() on the
// serial host path (the device ran the real batch; only the decoded results are altered before the pool sees them) -----
{
  const riskCfgs = [incumbentCfg('NL0'), ...randomSubjects(40, 'NEG-RISK').map((s) => s.cfg!)];
  const asTasks = (risk: boolean): Task[] =>
    riskCfgs.map((cfg) => ({
      k: `${evalKeyOf('W-QUIET', cfg, vOptions)}${risk ? RISK_KEY_SUFFIX : ''}`,
      quad: quadOf(cfg),
      controls: cfg.controls,
      options: vOptions,
      detail: false,
      ...(risk ? { risk: true } : {})
    }));
  const tampered = (server: GpuServer, mut: (rs: TaskResult[]) => void) =>
    new Proxy(server, {
      get(target, p) {
        if (p === 'complete')
          return (...a: Parameters<GpuServer['complete']>) => {
            const x = target.complete(...a);

            mut(x.results);
            return x;
          };
        const v = Reflect.get(target, p, target) as unknown;

        return typeof v === 'function' ? (v as (...x: unknown[]) => unknown).bind(target) : v;
      }
    });
  const riskPool = async (name: string, expect: RegExp, tasks: Task[], o: { mut?: (rs: TaskResult[]) => void; positive?: (v: Map<string, unknown>) => boolean } = {}) => {
    const server = GpuServer.start({ binary: dev, libDir: toolkitLib });
    const info = await server.info();

    await server.load(ds.file);

    const pool = new GpuPool({
      door,
      session: null,
      server: o.mut ? tampered(server, o.mut) : server,
      uuid: info.uuid,
      ledgerFile: path.join(tmp, `risk-${name.replace(/\W+/g, '-')}.jsonl`),
      batchSize: 64,
      lingerMs: 5
    });
    const values = new Map<string, unknown>();
    let observed = '';

    try {
      await pool.run(tasks, (t, v) => values.set(t.k, v));
      observed = `completed ${values.size}/${tasks.length}`;
    } catch (e) {
      observed = (e as Error).message;
    }
    try {
      await pool.close();
    } catch (e) {
      observed += ` | close: ${(e as Error).message}`;
    }
    record('risk', name, expect, observed, pool.counters.cpuScored, values.size, o.positive ? values.size === tasks.length && o.positive(values) : values.size === 0);
    return values;
  };

  // positive control: risk and plain tasks in one batch; every risk value = the plain record + a valid envelope
  await riskPool('risk and plain tasks in one batch: envelope delivered only where requested, records unchanged (positive control)', /completed 82\/82/, [...asTasks(true), ...asTasks(false)], {
    positive: (v) =>
      asTasks(false).every((t) => {
        const plain = v.get(t.k) as Record<string, unknown>;
        const risk = v.get(`${t.k}${RISK_KEY_SUFFIX}`) as Record<string, unknown>;
        const { envelope, ...rest } = risk;

        checkEnvelope(envelope, t.k);
        return !('envelope' in plain) && canonHash(rest) === canonHash(plain);
      })
  });
  await riskPool('a risk task whose decoded result lost its envelope', /risk-envelope-mismatch.*requested the risk envelope but none was returned/, asTasks(true), {
    mut: (rs) => rs.forEach((r) => (r.envelope = null))
  });
  await riskPool('a plain task whose decoded result carries an envelope', /risk-envelope-mismatch.*returned a risk envelope it did not request/, asTasks(false), {
    mut: (rs) => rs.forEach((r) => (r.envelope = { bankedDdMarked: 0, bankedDdLiquidation: 0, principalLossMarked: 0, principalLossLiquidation: 0 }))
  });
  // the Lab validates the delivered value: an envelope with a non-finite or inconsistent field is never archived
  for (const [what, bad] of [
    ['a non-finite principal loss', (e: NonNullable<TaskResult['envelope']>) => (e.principalLossLiquidation = NaN)],
    ['a liquidation banked DD below the marked one', (e: NonNullable<TaskResult['envelope']>) => (e.bankedDdLiquidation = e.bankedDdMarked - 1)],
    ['a negative banked DD', (e: NonNullable<TaskResult['envelope']>) => (e.bankedDdMarked = -1)]
  ] as const) {
    const server = GpuServer.start({ binary: dev, libDir: toolkitLib });
    const info = await server.info();

    await server.load(ds.file);

    const pool = new GpuPool({
      door,
      session: null,
      server: tampered(server, (rs) => rs.forEach((r) => r.envelope && bad(r.envelope))),
      uuid: info.uuid,
      ledgerFile: path.join(tmp, `risk-lab-${jobN}.jsonl`),
      batchSize: 64,
      lingerMs: 5
    });
    const labJob = `neg-risk-lab-${jobN++}`;
    const lab = new EvalLab({
      study: 'research/gpu-phase7',
      job: labJob,
      door: 'W-QUIET',
      doorPin: 'negative',
      purpose: 'parity-test: negative',
      pool,
      backend: 'gpu:negative',
      codeDigest: 'negative',
      cacheRoot: path.join(tmp, 'risk-labs')
    });
    let observed = '';

    await lab.open();
    try {
      await lab.evalMany(riskCfgs.map((cfg) => ({ cfg, options: vOptions, risk: true })));
      observed = 'archived';
    } catch (e) {
      observed = (e as Error).message;
    }
    const archived = lab.store.count('points');

    await lab.close().catch(() => undefined);
    record('risk', `the Lab refuses a delivered envelope with ${what} (nothing archived)`, /risk envelope/, observed, 0, archived, archived === 0);
  }
}

// ----- CLI, CPU workers and the preflight -----
const npm = (script: string, env: Record<string, string>) =>
  spawnSync('npm', ['run', '--silent', script], {
    cwd: repoRoot,
    env: { PATH: process.env.PATH!, HOME: process.env.HOME!, ...env },
    encoding: 'utf8',
    timeout: 60000
  });
{
  const r = npm('vg-l0fj', {});

  record(
    'cli',
    'a legacy CPU optimizer started without a purpose',
    /purpose-required/,
    `exit ${r.status}: ${r.stderr}`
  );
  const r2 = npm('vg-l0fj', { GPU_POLICY_PURPOSE: 'official-optimization' });

  record(
    'cli',
    'a legacy CPU optimizer started as official optimization (forced CPU backend)',
    /cpu-official-refused/,
    `exit ${r2.status}: ${r2.stderr}`
  );
  const r3 = npm('optimizer', {});

  record(
    'cli',
    'the generic CPU optimizer (app.ts) without a purpose',
    /purpose-required/,
    `exit ${r3.status}: ${r3.stderr}`
  );
  const w = spawnSync(
    process.execPath,
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      path.join(repoRoot, 'src/gpu-phase7/cpuEvalWorker.ts')
    ],
    { env: { PATH: process.env.PATH!, GPU_POLICY_PURPOSE: 'official-optimization' }, encoding: 'utf8', timeout: 30000 }
  );

  record(
    'cli',
    'a CPU evaluation worker started for official optimization (non-GPU evaluation from an optimizer worker)',
    /cpu-official-refused/,
    `exit ${w.status}: ${w.stderr}`
  );
  const reg = { versions: [{ version: '3.0.0', effective: '2026-11-19' }] };
  const p = checkGpuPolicy(
    {
      scope: 'optimization',
      adoptedAt: '2026-11-20T00:00:00Z',
      evaluationBackend: { policy: 'gpu-required', purpose: 'official-optimization' }
    },
    '3.0.0',
    reg,
    { acceptanceFile: path.join(tmp, 'none.json') }
  );

  record(
    'cli',
    'the standard preflight of an official 3.0.0 study without an accepted GPU evaluator',
    /BLOCKED/,
    p.errors.join('; ')
  );
}

// ----- the engine runtime (GPU Phase 5): the gate and the official runner never run under V8's Maglev -----
{
  const ts = ['--experimental-transform-types', '--disable-warning=ExperimentalWarning'];
  const live = (engine: string[], script: string[], env: Record<string, string>) =>
    spawnSync(process.execPath, [...engine, ...ts, ...script], {
      cwd: repoRoot,
      env: { PATH: process.env.PATH!, HOME: process.env.HOME!, ...env },
      encoding: 'utf8',
      timeout: 120000
    });
  const preflight = ['tools/gpu-backend/official-preflight.ts', '--study', 'research/gpu-phase7', '--door', 'D24'];
  const official = { GPU_POLICY_PURPOSE: 'official-optimization' };
  const a = live([], preflight, official);

  record(
    'engine',
    'the live official gate opened by a process started without --no-maglev',
    /preflight-runtime.*was not started with --no-maglev/,
    `exit ${a.status}: ${a.stderr}`,
    0,
    0,
    a.status === 3
  );
  const b = live(['--no-maglev', '--maglev'], preflight, official);

  record(
    'engine',
    'the live official gate opened by a process that re-enables Maglev after --no-maglev',
    /preflight-runtime/,
    `exit ${b.status}: ${b.stderr}`,
    0,
    0,
    b.status === 3
  );
  const c = live([], ['src/gpu-backend/officialRunner.ts', 'research/gpu-phase7', 'tools/gpu-backend/official-preflight.ts'], official);

  record(
    'engine',
    'the official runner wrapper started without --no-maglev',
    /runtime-maglev/,
    `exit ${c.status}: ${c.stderr}`,
    0,
    0,
    c.status === 3
  );
  // GPU Phase 6: beyond the official path — the legacy runner gate (an npm research script started by hand without the
  // flag, and one re-enabling Maglev), Strategy Lab's server and its runners
  const d = live([], ['src/gpu-backend/legacyRunner.ts', 'vg-l0fj', 'src/vg-l0-full-joint/main.ts'], { GPU_POLICY_PURPOSE: 'cpu-reference' });

  record('engine', 'a legacy CPU runner started without --no-maglev (by hand, bypassing its npm script)', /runtime-maglev/, `exit ${d.status}: ${d.stderr}`, 0, 0, d.status === 3);
  const e = live(['--no-maglev', '--maglev'], ['src/gpu-backend/legacyRunner.ts', 'vg-l0fj', 'src/vg-l0-full-joint/main.ts'], { GPU_POLICY_PURPOSE: 'cpu-reference' });

  record('engine', 'a legacy CPU runner that re-enables Maglev after --no-maglev', /runtime-maglev/, `exit ${e.status}: ${e.stderr}`, 0, 0, e.status === 3);
  const f = live([], ['apps/strategy-lab/server/main.ts'], { STRATEGY_LAB_PORT: '5391', STRATEGY_LAB_STATE_DIR: path.join(tmp, 'sl-state') });

  record('engine', "Strategy Lab's server started without --no-maglev", /runtime-maglev.*Strategy Lab server/, `exit ${f.status}: ${f.stderr}`, 0, 0, f.status !== 0 && !fs.existsSync(path.join(tmp, 'sl-state')));
  for (const runner of ['trading-run', 'entry-signal-run', 'pool-run', 'portfolio-run']) {
    const g = live([], [`apps/strategy-lab/runner/${runner}.ts`, path.join(tmp, 'no-such-run')], {});

    record('engine', `Strategy Lab's runner ${runner} started without --no-maglev`, /runtime-maglev/, `exit ${g.status}: ${g.stderr.slice(-400)}`, 0, 0, g.status !== 0);
  }
  record(
    'engine',
    'this negative suite itself runs without Maglev (its gate cases would otherwise all be refused for the runtime)',
    /^disabled$/,
    engineRuntime().maglev
  );
}

fs.rmSync(tmp, { recursive: true, force: true });
const pass = rows.every((r) => r.pass);

writeJson(out, {
  kind: 'gpu-phase7 negative tests (Phase 2 cases + host path + engine runtime + jobs + runtime beyond the official path)',
  runtime: engineRuntime(),
  t: new Date().toISOString(),
  head: headCommit(),
  hostWorkers,
  binaries: { dev: sha(dev), perturbed: sha(perturbed), stale: sha(stale) },
  door: 'W-QUIET',
  total: rows.length,
  passed: rows.filter((r) => r.pass).length,
  pass,
  rows
});
console.log(`${rows.filter((r) => r.pass).length}/${rows.length} negative tests pass`);
process.exitCode = pass ? 0 : 2;

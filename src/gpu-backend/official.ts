// gpu-backend: THE OFFICIAL OPTIMIZATION GATE (standard 3.0.0 §9) — the single authoritative entry through which any
// official optimization evaluates historical strategies. It is GPU-only and fail-closed:
//
//   1. purpose      the run declares purpose 'official-optimization' explicitly; anything else is refused here
//                   (a non-official run never needs this gate and never counts as official evidence);
//   2. acceptance   config/gpu-backend/acceptance.json exists (schema 2), is ACCEPTED, and still matches the working
//                   tree's compatibility digest (a changed mirrored CPU source or host-path file → refused), every pinned
//                   enforcement file, the Git history (its source revision is an ancestor of HEAD), the binary's sha256
//                   and the device; then, independently of the validator, every pinned file is re-hashed here and must be
//                   committed and unmodified (an official run starts from a commit, which the attestation names);
//   3. server       the accepted binary starts; INFO reports the same compatibility digest (a stale build → refused), the
//                   protocol, and the device UUID that nvidia-smi and the acceptance record name (wrong GPU → refused);
//   4. capability   every feature the WHOLE reachable search domain can generate is in the server's supported set;
//   5. smoke        a live kernel computes a value JavaScript verifies exactly (configuration is not proof of execution);
//   6. memory       free VRAM covers the planned batch with headroom;
//   7. host path    the parallel host path (hostPipeline.ts) starts with the requested number of worker threads, every
//                   worker holding the attested door (digest);
//   8. parity       a precommitted mini-set (the reference identities and seeded genomes) evaluated on the GPU — through
//                   the same host path the run's pool will use — equals the canonical CPU engine bit for bit (CPU replay
//                   as independent verification, never a score);
//   9. attestation  all of the above is written to research/<study>/results/gpu-attestations/<run>-<time>.json.
//
// Any failure throws PolicyError before a single search evaluation; nothing falls back to the CPU. A resumed or
// restarted run passes the whole gate again and records a new attestation (a different binary, source, device or
// configuration is refused by the same checks). At runtime the attested GpuPool (pool.ts) verifies every batch receipt,
// keeps the conservation invariant (submitted = GPU-returned + failed; CPU-scored = 0) and stops on any violation.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { runWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import { evaluate } from '../vg-l0-risk-families/evaluate.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import { incumbents } from '../vg-l0-full-joint/nl0.ts';
import { decode, levelsOf } from '../vg-l0-full-joint/space.ts';
import { subjectOfCfg } from '../vg-l0-risk-metrics/engine.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { checkAcceptance, headCommit, uncommittedPinnedFiles, type AcceptanceRecord } from './acceptance.ts';
import { compatManifest } from './compat.ts';
import { type DomainFeatures } from './domain.ts';
import { exportDataset } from './dataset.ts';
import { GpuServer, type ServerInfo, type Task } from './client.ts';
import { DEFAULT_HOST_WORKERS, HostPipeline } from './hostPipeline.ts';
import { SUPPORTED, featureNames } from './layout.ts';
import { PolicyError, declaredPurpose } from './purpose.ts';
import { bookView, canonHash, poolView } from './canon.ts';
import { repoRoot, serverBinary, toolkitLib } from './toolchain.ts';

export interface OfficialRunSpec {
  study: string; // research/<study>
  runId: string; // the job / run identifier (archive binding)
  purpose?: string; // must be 'official-optimization' (explicit; or GPU_POLICY_PURPOSE)
  door: Door;
  domain: DomainFeatures;
  plannedBatch: number; // candidates per GPU batch the run will submit
  binary?: string;
  acceptanceFile?: string;
  cacheDir: string; // where the GB2 dataset of the door is exported
  parityMiniSet?: number; // seeded genomes beside the reference identities (default 14)
  hostWorkers?: number; // host-path worker threads for the run's pool (default DEFAULT_HOST_WORKERS; 0 = the serial path)
  allowUnaccepted?: boolean; // TESTS ONLY (negative tests and Phase 2's own engineering runs): skip step 2 and record it
  serverEnv?: NodeJS.ProcessEnv; // TESTS ONLY: e.g. CUDA_VISIBLE_DEVICES='' (no GPU)
  testHooks?: string[]; // TESTS ONLY: server fault hooks (the gate then refuses: no-test-hooks)
}

export interface Attestation {
  kind: 'gpu-backend official attestation';
  study: string;
  runId: string;
  purpose: 'official-optimization';
  t: string;
  host: string;
  device: { uuid: string; name: string; driver: number; runtime: number; cc: string; smiUuid: string };
  binary: { path: string; sha256: string };
  compat: { digest: string; serverDigest: string };
  acceptance: { status: string; file: string; sha256: string | null; skippedForTest: boolean };
  source: { head: string; acceptedRevision: string | null; pinnedFiles: number; clean: boolean };
  domain: { name: string; features: string[]; growthStructures: number; d1Structures: number };
  supported: string;
  smoke: { ok: boolean; sum: number; mix: string };
  memory: { freeBytes: number; plannedBytes: number };
  dataset: { door: string; sessions: number; sha256: string; dataSha256: { GDX: string; VGT: string } };
  hostPath: { mode: 'parallel' | 'serial'; workers: number; doorDigest: string | null };
  parity: { subjects: number; identical: number; keys: string[]; hostPath: 'parallel' | 'serial' };
  checks: { name: string; ok: boolean; detail: string }[];
}

export interface OfficialGpuSession {
  server: GpuServer;
  pipeline: HostPipeline | null; // the attested host path (the pool uses it and closes it with the server)
  info: ServerInfo;
  attestation: Attestation;
  attestationFile: string;
  datasetFile: string;
}

const sha256File = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
export const smiUuid = () =>
  execFileSync('nvidia-smi', ['--query-gpu=uuid', '--format=csv,noheader']).toString().trim().split('\n')[0]!;
export const smiTelemetry = () => {
  const q = execFileSync('nvidia-smi', [
    '--query-gpu=uuid,utilization.gpu,memory.used,memory.free,power.draw,temperature.gpu',
    '--format=csv,noheader,nounits'
  ])
    .toString()
    .trim()
    .split('\n')[0]!
    .split(',')
    .map((x) => x.trim());

  return {
    uuid: q[0]!,
    utilizationPct: Number(q[1]),
    memoryUsedMiB: Number(q[2]),
    memoryFreeMiB: Number(q[3]),
    powerW: Number(q[4]),
    temperatureC: Number(q[5])
  };
};

// approximate device bytes of one batch (gb_server.cu's own budget formula with the default capacities)
export const plannedBytes = (n: number, sessions: number) =>
  n * (1016 + 2 * (512 + 512) * 184 + 624 + 8 + 512 * 320 + 2048 * 56 + sessions * 8);

// the precommitted parity mini-set: the reference identities and seeded Assignment 3 genomes (never chosen by outcome)
export const parityMiniSet = (n: number): Task[] => {
  const inc = incumbents();
  const tasks: Task[] = (['NL0', 'IJ1', 'C4', 'C4R'] as const).map((k) => ({
    k: `R:${k}`,
    quad: inc[k].quad,
    controls: null,
    options: vOptions,
    detail: false
  }));
  const levels = levelsOf('coarse');

  for (let i = 0; i < n; i++) {
    const rng = new Rng(deriveSeed('gpu-backend', 'preflight-parity', i));
    const s = subjectOfCfg(
      decode(
        levels.map((l) => rng.int(l)),
        'coarse'
      )
    );

    tasks.push({ k: `P:${i}`, quad: s.quad, controls: s.controls, options: vOptions, detail: false });
  }
  return tasks;
};

export const openOfficialGpuSession = async (spec: OfficialRunSpec): Promise<OfficialGpuSession> => {
  const checks: Attestation['checks'] = [];
  // `detail` explains a refusal; `okDetail` is what the attestation records when the check passes
  const check = (name: string, ok: boolean, detail: string, okDetail = 'ok') => {
    checks.push({ name, ok, detail: ok ? okDetail : detail });
    if (!ok) throw new PolicyError(`preflight-${name}`, detail);
  };

  // 1. purpose
  const purpose = declaredPurpose(spec.purpose);

  check(
    'purpose',
    purpose === 'official-optimization',
    purpose === null
      ? 'no execution purpose declared (official optimization must declare it explicitly)'
      : `purpose ${purpose} is not official optimization; a non-official run must not open the official gate`,
    'official-optimization'
  );

  // 2. acceptance (static: record, sources, evidence, binary)
  const binary = spec.binary ?? serverBinary;
  const acc = checkAcceptance({ file: spec.acceptanceFile, binary });

  if (spec.allowUnaccepted)
    checks.push({
      name: 'acceptance',
      ok: true,
      detail: `SKIPPED FOR A TEST RUN (status ${acc.status}: ${acc.reasons.join('; ')}) — never official evidence`
    });
  else {
    check('acceptance', acc.ok, acc.reasons.join('; '), `ACCEPTED (${acc.record?.study}, ${acc.record?.acceptedAt})`);

    // an independent re-hash of every pinned file (not through the validator) and the commit the run starts from
    const rec = acc.record as AcceptanceRecord;
    const pinnedFiles = [rec.compat.cpu, rec.compat.cuda, rec.compat.host, rec.policy].flatMap((g) => g.files);
    const differ = pinnedFiles
      .filter(
        (f) => !fs.existsSync(path.join(repoRoot, f.path)) || sha256File(path.join(repoRoot, f.path)) !== f.sha256
      )
      .map((f) => f.path);

    check(
      'pins',
      differ.length === 0,
      `pinned files differ from the acceptance record (independent re-hash): ${differ.slice(0, 8).join(', ')}`,
      `${pinnedFiles.length} pinned files re-hashed independently`
    );

    const dirty = uncommittedPinnedFiles(rec);

    check(
      'source',
      dirty.length === 0,
      `pinned files are not committed unmodified (an official run starts from a commit): ${dirty.slice(0, 8).join('; ')}`,
      `HEAD ${headCommit().slice(0, 12)}, accepted revision ${rec.source.commit.slice(0, 12)}`
    );
  }

  // 3. server identity
  check('binary', fs.existsSync(binary), `GPU binary ${binary} missing`, binary);

  const server = GpuServer.start({
    binary,
    libDir: toolkitLib,
    env: spec.serverEnv,
    ...(spec.testHooks ? { allowFault: true, testHooks: spec.testHooks } : {})
  });
  let info: ServerInfo;

  try {
    info = await server.info();
  } catch (e) {
    server.kill();
    throw new PolicyError('preflight-server', `the GPU evaluator did not start or answer: ${(e as Error).message}`);
  }

  let pipeline: HostPipeline | null = null;

  try {
    const compat = compatManifest();
    const smi = smiUuid();

    check(
      'compat',
      info.compatDigest === compat.digest,
      `server built from compatibility digest ${info.compatDigest.slice(0, 16)}, working tree ${compat.digest.slice(0, 16)} (stale build or changed sources)`,
      `server and working tree ${compat.digest.slice(0, 16)}`
    );
    check('device', info.uuid === smi, `server device ${info.uuid} ≠ nvidia-smi ${smi}`, `${info.uuid} (= nvidia-smi)`);
    check(
      'no-test-hooks',
      info.faultInjection === false && !spec.testHooks?.length,
      'the server runs with fault injection / test hooks enabled: never an official evaluator',
      'none enabled'
    );
    if (!spec.allowUnaccepted)
      check(
        'accepted-device',
        info.uuid === (acc.record as AcceptanceRecord).device.uuid,
        `device ${info.uuid} ≠ the accepted ${(acc.record as AcceptanceRecord).device.uuid}`,
        'the accepted device'
      );

    // 4. capability coverage of the whole reachable domain
    const supported = BigInt(`0x${info.supportedFeatures}`);
    const missing = spec.domain.features & ~supported;

    check(
      'capability',
      missing === 0n && (spec.domain.features & ~SUPPORTED) === 0n,
      missing
        ? `the search domain reaches features the GPU does not implement: ${featureNames(missing).join(', ')}`
        : 'ok',
      `${featureNames(spec.domain.features).length} reachable features, all implemented`
    );

    // 5. live kernel execution
    const smoke = await server.smoke();

    check(
      'smoke',
      smoke.ok && smoke.uuid === info.uuid,
      `smoke kernel result ${smoke.sum}/${smoke.mix} ≠ expected ${smoke.expected.sum}/${smoke.expected.mix}`,
      `${smoke.sum}/${smoke.mix} = the CPU's expectation`
    );

    // 6. memory
    const planned = plannedBytes(spec.plannedBatch, spec.door.sessions);

    check(
      'memory',
      info.freeBytes > planned + (1 << 30),
      `free VRAM ${info.freeBytes} < planned batch ${planned} + 1 GiB headroom`,
      `free VRAM ${info.freeBytes} ≥ planned batch ${planned} + 1 GiB headroom`
    );

    // 7. the host path (worker threads holding the attested door)
    const ds = exportDataset(spec.door, spec.cacheDir);

    await server.load(ds.file);

    const workers = spec.hostWorkers ?? DEFAULT_HOST_WORKERS;

    if (workers > 0) {
      try {
        pipeline = await HostPipeline.start({ door: spec.door, workers });
      } catch (e) {
        check('host-path', false, `the host workers did not start with the attested door: ${(e as Error).message}`);
      }
    }
    check(
      'host-path',
      workers === 0 ||
        (pipeline !== null && pipeline.size === workers && !pipeline.faultInjection && pipeline.failed === null),
      `host path: ${pipeline?.size ?? 0} of ${workers} workers ready`,
      workers === 0 ? 'serial (main thread)' : `${workers} worker threads, door digest ${pipeline!.digest.slice(0, 16)}`
    );

    // 8. parity mini-set against the canonical CPU engine, through the run's host path
    const tasks = parityMiniSet(spec.parityMiniSet ?? 14);
    const gpu = pipeline
      ? await (async () => {
          const p = await pipeline!.prepare(spec.door, tasks, { returnTrades: true });

          return pipeline!.complete(p, await server.submit(p), info.uuid, 'full');
        })()
      : await server.evaluate(spec.door, tasks, { returnTrades: true }, info.uuid);
    let identical = 0;

    for (const [i, t] of tasks.entries()) {
      const g = gpu.results[i]!;
      const x = runWithControls2(spec.door, t.quad, t.controls, t.options, false, false, { cache: false });
      const rec = evaluate(spec.door, t.quad, t.controls, t.options);

      if (
        g.status === 0 &&
        canonHash(x.books.map(bookView)) === canonHash(g.books.map(bookView)) &&
        canonHash({ ...poolView(x.result), principalAtClose: 0, valueAtClose: 0, heldAtClose: 0 }) ===
          canonHash({ ...poolView(g.pool!), principalAtClose: 0, valueAtClose: 0, heldAtClose: 0 }) &&
        canonHash(rec) === canonHash(g.record)
      )
        identical++;
    }
    check(
      'parity',
      identical === tasks.length,
      `${tasks.length - identical} of ${tasks.length} precommitted parity subjects differ from the canonical CPU engine`,
      `${identical} of ${tasks.length} precommitted parity subjects identical to the canonical CPU engine`
    );

    // 9. attestation
    const t = new Date().toISOString();
    const att: Attestation = {
      kind: 'gpu-backend official attestation',
      study: spec.study,
      runId: spec.runId,
      purpose: 'official-optimization',
      t,
      host: execFileSync('hostname').toString().trim(),
      device: {
        uuid: info.uuid,
        name: info.device,
        driver: info.driver,
        runtime: info.runtime,
        cc: info.cc,
        smiUuid: smi
      },
      binary: { path: path.relative(repoRoot, binary), sha256: sha256File(binary) },
      compat: { digest: compat.digest, serverDigest: info.compatDigest },
      source: {
        head: headCommit(),
        acceptedRevision: acc.record?.source?.commit ?? null,
        pinnedFiles: acc.record?.policy
          ? [acc.record.compat.cpu, acc.record.compat.cuda, acc.record.compat.host, acc.record.policy].reduce(
              (a, g) => a + g.files.length,
              0
            )
          : 0,
        clean: acc.record?.policy ? uncommittedPinnedFiles(acc.record).length === 0 : false
      },
      acceptance: {
        status: acc.status,
        file: path.relative(repoRoot, spec.acceptanceFile ?? path.join(repoRoot, 'config/gpu-backend/acceptance.json')),
        sha256: acc.record
          ? sha256File(spec.acceptanceFile ?? path.join(repoRoot, 'config/gpu-backend/acceptance.json'))
          : null,
        skippedForTest: Boolean(spec.allowUnaccepted)
      },
      domain: {
        name: spec.domain.name,
        features: featureNames(spec.domain.features),
        growthStructures: spec.domain.growthStructures,
        d1Structures: spec.domain.d1Structures
      },
      supported: info.supportedFeatures,
      smoke: { ok: smoke.ok, sum: smoke.sum, mix: smoke.mix },
      memory: { freeBytes: info.freeBytes, plannedBytes: planned },
      dataset: { door: spec.door.name, sessions: spec.door.sessions, sha256: ds.sha256, dataSha256: ds.dataSha256 },
      hostPath: {
        mode: pipeline ? 'parallel' : 'serial',
        workers: pipeline?.size ?? 0,
        doorDigest: pipeline?.digest ?? null
      },
      parity: {
        subjects: tasks.length,
        identical,
        keys: tasks.map((x) => x.k),
        hostPath: pipeline ? 'parallel' : 'serial'
      },
      checks
    };
    const dir = path.join(repoRoot, spec.study, 'results', 'gpu-attestations');
    const file = path.join(dir, `${spec.runId}-${t.replace(/[:.]/g, '-')}.json`);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(att, null, 1)}\n`);
    return { server, pipeline, info, attestation: att, attestationFile: file, datasetFile: ds.file };
  } catch (e) {
    server.kill();
    await pipeline?.close();
    throw e;
  }
};

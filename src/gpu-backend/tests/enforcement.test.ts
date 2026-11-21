// The enforcement trust boundary (GPU Phase 3, standard 3.0.0 §9.7, §9.10): every file of the GPU backend is either an
// evaluation file (compiled into the binary's digest: it can change a request or a result) or an enforcement file
// (pinned by the acceptance record: it can change who may run what, or how acceptance is judged) — a new worker,
// loader or gate file cannot exist outside the acceptance; and the recorded acceptance re-verifies with the independent
// verifier (tools/gpu-backend/verify-acceptance.sh, Python and git, no code shared with acceptance.ts), which also
// detects a tampered pin, a changed evaluation digest and a modified evidence file.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { hostFiles, policyFiles } from '../compat.ts';
import { ENFORCEMENT_EXTRAS, acceptanceFile, requiredPolicyFiles } from '../acceptance.ts';
import { withEngineFlag, withEngineFlagArgs } from '../runtime.ts';
import { repoRoot } from '../toolchain.ts';

// development tools of the backend that neither run in an official job nor judge acceptance
const devTools = new Set([
  'tools/gpu-backend/check-v8math.ts',
  'tools/gpu-backend/layout-dump.cpp',
  'tools/gpu-backend/v8math-check.cu'
]);

test('every GPU-backend file is classified: evaluation (in the binary digest) or enforcement (pinned by the acceptance)', () => {
  const classified = new Set([...hostFiles, ...policyFiles]);
  const backend = fs
    .readdirSync(path.join(repoRoot, 'src/gpu-backend'), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts'))
    .map((e) => path.relative(repoRoot, path.join(e.parentPath, e.name)));
  const tools = fs.readdirSync(path.join(repoRoot, 'tools/gpu-backend')).map((f) => `tools/gpu-backend/${f}`);
  const loose = [...backend, ...tools].filter((f) => !classified.has(f) && !devTools.has(f));

  assert.deepEqual(
    loose,
    [],
    `unclassified GPU-backend files: ${loose.join(', ')} — add each to hostFiles or policyFiles (src/gpu-backend/compat.ts)`
  );
  for (const f of [...hostFiles, ...policyFiles])
    assert.ok(fs.existsSync(path.join(repoRoot, f)), `${f} is listed but missing`);
  assert.equal(new Set(hostFiles.filter((f) => policyFiles.includes(f))).size, 0, 'a file is in both groups');
  // GPU Phase 6: the job isolation module (src/gpu-jobs/) is enforcement outside src/gpu-backend/ — every one of its
  // files is a required pin of the acceptance record (acceptance.ts ENFORCEMENT_EXTRAS)
  const jobs = fs
    .readdirSync(path.join(repoRoot, 'src/gpu-jobs'), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(repoRoot, path.join(e.parentPath, e.name)));

  assert.deepEqual(
    jobs.filter((f) => !ENFORCEMENT_EXTRAS.includes(f)),
    [],
    'unclassified src/gpu-jobs files: add each to ENFORCEMENT_EXTRAS (src/gpu-backend/acceptance.ts)'
  );
  for (const f of ENFORCEMENT_EXTRAS) assert.ok(fs.existsSync(path.join(repoRoot, f)), `${f} is listed but missing`);
  assert.deepEqual(requiredPolicyFiles(), [...policyFiles, ...ENFORCEMENT_EXTRAS]);
});

test('the recorded acceptance re-verifies independently; a tampered pin, digest or evidence file does not', () => {
  if (!fs.existsSync(acceptanceFile)) return; // no accepted evaluator: the official gate itself is closed
  const record = JSON.parse(fs.readFileSync(acceptanceFile, 'utf8'));

  if (record.schema !== 2) return; // the MERGE GATE (policy.test.ts) refuses a schema-1 record
  const verify = (file: string) =>
    spawnSync('tools/gpu-backend/verify-acceptance.sh', ['--record', file], { cwd: repoRoot, encoding: 'utf8' });
  const ok = verify(path.relative(repoRoot, acceptanceFile));

  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /VERIFIED/);

  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-verify-'));

  try {
    const write = (name: string, x: unknown) => {
      fs.writeFileSync(path.join(d, name), JSON.stringify(x));
      return path.join(d, name);
    };
    const pin = structuredClone(record);

    pin.policy.files = pin.policy.files.map((f: { path: string; sha256: string }) =>
      f.path === 'src/gpu-backend/purpose.ts' ? { ...f, sha256: '0'.repeat(64) } : f
    );
    const a = verify(write('pin.json', pin));

    assert.equal(a.status, 1);
    assert.match(a.stdout, /FAIL policy files/);
    const dig = structuredClone(record);

    dig.compat.digest = 'f'.repeat(64);
    const b = verify(write('digest.json', dig));

    assert.equal(b.status, 1);
    assert.match(b.stdout, /FAIL evaluation digest/);
    if (record.evidence.length) {
      const ev = structuredClone(record);

      ev.evidence[0].sha256 = '0'.repeat(64);
      const c = verify(write('evidence.json', ev));

      assert.equal(c.status, 1);
      assert.match(c.stdout, /FAIL evidence files/);
    }
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

// ----- the engine runtime beyond the official path (GPU Phase 6, research/gpu-phase6/) -----
// Empirical regression tests with V8's own tier probes (--allow-natives-syntax: %ActiveTierIsMaglev): a hot function
// is observed until it is optimized. With the flag it must never run as Maglev code — in the main thread, in worker
// threads started the way the frozen legacy pools start them (an explicit execArgv), in children forked the way frozen
// runners fork them (an explicit execArgv WITHOUT the flag) and in `spawn(process.execPath, …)` children — once the
// legacy runner gate (legacyRunner.ts → installChildEngineGuard) is in front. The controls show that the probe detects
// Maglev, and that without the guard an explicitly forked child of a protected parent does run Maglev code.
const probeSource = `
import { fork, spawn, execFile, spawnSync } from 'node:child_process';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { promisify } from 'node:util';
const isMaglev = new Function('f', 'return %ActiveTierIsMaglev(f)');
const isTurbo = new Function('f', 'return %ActiveTierIsTurbofan(f)');
function hot(a) { let s = 0; for (let i = 0; i < 40; i++) s += (a * i) % 7; return s; }
const observe = () => {
  let maglev = false, turbo = false;
  const t0 = Date.now();
  for (let k = 0; Date.now() - t0 < 4000; k++) {
    hot(k);
    if (k % 500 === 0) { if (isMaglev(hot)) maglev = true; if (isTurbo(hot)) turbo = true; if (turbo && k > 400000) break; }
  }
  return { maglev, turbo };
};
const role = process.argv[2] ?? (isMainThread ? 'main' : workerData.role);
if (!isMainThread) parentPort.postMessage({ role, ...observe() });
else if (role === 'child') {
  const r = { role: process.argv[3], execArgv: process.execArgv, ...observe() };
  if (process.send) { process.send(r); process.disconnect(); } else console.log(JSON.stringify(r));
} else {
  const out = { main: { execArgv: process.execArgv, ...observe() } };
  const worker = (execArgv) => new Promise((res, rej) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { role: 'worker' }, ...(execArgv ? { execArgv } : {}) });
    w.once('message', res); w.once('error', rej);
  });
  out.workerInherited = await worker(null);
  out.workerExplicit = await worker(['--experimental-transform-types', '--disable-warning=ExperimentalWarning']);
  out.forkExplicit = await new Promise((res, rej) => {
    const c = fork(new URL(import.meta.url).pathname, ['child', 'forkExplicit'], { execArgv: ['--allow-natives-syntax', '--expose-gc'] });
    c.once('message', res); c.once('error', rej);
  });
  out.forkInherited = await new Promise((res, rej) => {
    const c = fork(new URL(import.meta.url).pathname, ['child', 'forkInherited']);
    c.once('message', res); c.once('error', rej);
  });
  out.spawn = await new Promise((res) => {
    const c = spawn(process.execPath, ['--allow-natives-syntax', new URL(import.meta.url).pathname, 'child', 'spawn']);
    let s = ''; c.stdout.on('data', (d) => (s += d)); c.on('close', () => res(JSON.parse(s)));
  });
  out.execFilePromisified = JSON.parse((await promisify(execFile)(process.execPath, ['--allow-natives-syntax', new URL(import.meta.url).pathname, 'child', 'execFile'])).stdout);
  out.nonNode = spawnSync('/bin/echo', ['--allow-natives-syntax', 'x'], { encoding: 'utf8' }).stdout.trim();
  console.log('PROBE ' + JSON.stringify(out));
}
`;

const runProbe = (parentEngine: string[], viaLegacyRunner: boolean) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-probe-'));

  try {
    const probe = path.join(d, 'probe.mjs');

    fs.writeFileSync(probe, probeSource);
    const args = viaLegacyRunner
      ? [
          ...parentEngine,
          '--allow-natives-syntax',
          '--experimental-transform-types',
          '--disable-warning=ExperimentalWarning',
          'src/gpu-backend/legacyRunner.ts',
          'engine-probe',
          probe
        ]
      : [...parentEngine, '--allow-natives-syntax', probe];
    const r = spawnSync(process.execPath, args, {
      cwd: repoRoot,
      env: { PATH: process.env.PATH!, GPU_POLICY_PURPOSE: 'diagnostic' },
      encoding: 'utf8',
      timeout: 120_000
    });
    const line = r.stdout.split('\n').find((l) => l.startsWith('PROBE '));

    assert.ok(line, `probe output missing (exit ${r.status}): ${r.stdout.slice(-400)} ${r.stderr.slice(-800)}`);
    return JSON.parse(line.slice(6)) as Record<string, { maglev: boolean; turbo: boolean; execArgv?: string[] }> & {
      nonNode: string;
    };
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
};

test('engine runtime helpers: the flag first and once, script arguments untouched, another Maglev option refused', () => {
  assert.deepEqual(withEngineFlag([]), ['--no-maglev']);
  assert.deepEqual(withEngineFlag(['--expose-gc', '--no-maglev']), ['--no-maglev', '--expose-gc']);
  assert.throws(() => withEngineFlag(['--maglev']), /runtime-maglev/);
  assert.throws(() => withEngineFlag(['--no-maglev', '--stress-maglev']), /runtime-maglev/);
  assert.deepEqual(withEngineFlagArgs(['--expose-gc', 'w.ts', '--maglev-like-script-arg']), [
    '--no-maglev',
    '--expose-gc',
    'w.ts',
    '--maglev-like-script-arg'
  ]);
  assert.deepEqual(withEngineFlagArgs(['-e', 'x']), ['--no-maglev', '-e', 'x']);
  assert.throws(() => withEngineFlagArgs(['--maglev', 'w.ts']), /runtime-maglev/);
});

test('engine runtime (regression): behind the legacy runner gate, no thread or child process runs Maglev code', () => {
  const p = runProbe(['--no-maglev'], true);

  for (const k of ['main', 'workerInherited', 'workerExplicit', 'forkExplicit', 'forkInherited', 'spawn', 'execFilePromisified'])
    assert.equal(p[k]!.maglev, false, `${k} ran Maglev code: ${JSON.stringify(p[k])}`);
  assert.equal(p.main!.turbo, true, 'the probe function reached the optimizing tier (the probe is live)');
  for (const k of ['forkExplicit', 'forkInherited', 'spawn', 'execFilePromisified']) {
    const argv = p[k]!.execArgv!;

    assert.equal(argv.filter((a) => a === '--no-maglev').length, 1, `${k} execArgv ${argv.join(' ')}`);
  }
  // the explicitly forked child keeps its own options; the guard only adds the flag
  assert.ok(p.forkExplicit!.execArgv!.includes('--expose-gc'));
  // a non-Node command is untouched
  assert.equal(p.nonNode, '--allow-natives-syntax x');
});

test('engine runtime (controls): the probe detects Maglev; without the guard an explicitly forked child runs it', () => {
  const unprotected = runProbe([], false);

  assert.equal(unprotected.main!.maglev, true, 'the probe detects Maglev code in an unprotected process');
  const noGuard = runProbe(['--no-maglev'], false);

  assert.equal(noGuard.main!.maglev, false);
  assert.equal(noGuard.workerExplicit!.maglev, false, 'worker threads share the process-wide V8 options');
  assert.equal(noGuard.forkInherited!.maglev, false, 'fork() without execArgv inherits the flag');
  assert.equal(noGuard.forkExplicit!.maglev, true, 'an explicit execArgv drops the flag: the case the guard closes');
  // the legacy runner gate itself refuses an unprotected process before importing anything
  const r = spawnSync(
    process.execPath,
    ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', 'src/gpu-backend/legacyRunner.ts', 'x', 'nothing.ts'],
    { cwd: repoRoot, env: { PATH: process.env.PATH!, GPU_POLICY_PURPOSE: 'diagnostic' }, encoding: 'utf8' }
  );

  assert.equal(r.status, 3);
  assert.match(r.stderr, /runtime-maglev/);
});

// The GPU policy's static enforcement (standard 3.0.0 §9), runnable without a GPU (the repository's merge gate):
// execution purposes; the purpose gate of every legacy CPU runner (and that every npm script that can start one is
// gated); the entrypoint audit (no new search machinery outside the official GPU gate); the acceptance record's
// fail-closed checks (missing, forged, stale sources, changed evidence, wrong binary or device); the preflight's §9 rules;
// the reachable domain's capabilities; and — the merge gate proper — that a recorded GPU acceptance still matches the
// working tree (a changed mirrored CPU source fails here until the CUDA port and its parity evidence are regenerated
// on Apollo). The live checks (a real kernel, the device, the parity mini-set) run in tools/gpu-phase2/negative.ts and
// in every official run's gate.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { PolicyError, assertNonOfficialCpuRun, declaredPurpose } from '../purpose.ts';
import { acceptanceFile, checkAcceptance } from '../acceptance.ts';
import { compatManifest } from '../compat.ts';
import { audit, registryFile, type Registry } from '../entrypoints.ts';
import { checkGpuPolicy } from '../../research-standard/gpuPolicy.ts';
import { SUPPORTED } from '../layout.ts';
import { repoRoot } from '../toolchain.ts';

const node = process.execPath;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-policy-'));

test('purpose: explicit, never defaulted; unknown refused', () => {
  assert.equal(declaredPurpose(null, {}), null);
  assert.equal(declaredPurpose('parity-test', {}), 'parity-test');
  assert.equal(declaredPurpose(null, { GPU_POLICY_PURPOSE: 'cpu-reference' }), 'cpu-reference');
  assert.throws(() => declaredPurpose('auto', {}), PolicyError);
  assert.throws(() => declaredPurpose(null, { GPU_POLICY_PURPOSE: 'gpu-or-cpu' }), PolicyError);
});

test('a CPU runner refuses a missing purpose and official optimization; accepts a declared non-official purpose', () => {
  assert.throws(() => assertNonOfficialCpuRun('x', null, {}), /purpose-required/);
  assert.throws(() => assertNonOfficialCpuRun('x', 'official-optimization', {}), /cpu-official-refused/);
  assert.equal(assertNonOfficialCpuRun('x', null, { GPU_POLICY_PURPOSE: 'diagnostic' }), 'diagnostic');
});

test('the legacy runner wrapper refuses before importing the runner', () => {
  const runner = path.join(repoRoot, 'src/gpu-backend/legacyRunner.ts');
  const run = (env: Record<string, string>) =>
    spawnSync(node, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', runner, 'test-runner', 'src/does-not-exist.ts'], {
      cwd: repoRoot,
      env: { PATH: process.env.PATH!, ...env },
      encoding: 'utf8'
    });

  assert.equal(run({}).status, 3);
  assert.match(run({}).stderr, /purpose-required/);
  assert.equal(run({ GPU_POLICY_PURPOSE: 'official-optimization' }).status, 3);
  assert.match(run({ GPU_POLICY_PURPOSE: 'official-optimization' }).stderr, /cpu-official-refused/);
  // with a non-official purpose it proceeds to import the (missing) module: past the gate
  assert.match(run({ GPU_POLICY_PURPOSE: 'cpu-reference' }).stderr, /non-official CPU run|Cannot find module|ERR_MODULE_NOT_FOUND/);
});

test('every npm script that can start a CPU research runner or optimizer goes through the purpose gate', () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).scripts as Record<string, string>;
  const utilities = new Set(['format', 'preapp', 'app', 'legacy-archive', 'market-events', 'datasets', 'test', 'research-preflight']);
  const ungated = Object.entries(scripts).filter(([k, v]) => !utilities.has(k) && !v.includes('src/gpu-backend/legacyRunner.ts'));

  assert.deepEqual(ungated.map(([k]) => k), [], `ungated scripts: ${ungated.map(([k, v]) => `${k} → ${v}`).join('; ')}`);
  // the utilities evaluate no strategy: formatting, lint/type checks, the app shell, data maintenance, tests, the preflight
  assert.ok(!scripts['research-preflight']!.includes('src/app.ts'));
});

test('entrypoint audit: no search machinery outside the official GPU gate, legacy runners unchanged', () => {
  const r = JSON.parse(fs.readFileSync(registryFile, 'utf8')) as Registry;

  assert.deepEqual(audit(r), []);
  // a new, unregistered optimizer directory is refused
  const dir = path.join(repoRoot, 'src', 'zz-policy-test-optimizer');

  fs.mkdirSync(dir, { recursive: true });
  try {
    fs.writeFileSync(path.join(dir, 'search.ts'), "import { Nsga2 } from '../optimizer/nsga2.ts';\nexport const x = Nsga2;\n");
    assert.match(audit(r).join('\n'), /zz-policy-test-optimizer contains search machinery but neither uses the official GPU gate/);
    // the same directory routed through the official gate is accepted
    fs.writeFileSync(path.join(dir, 'run.ts'), "import { openOfficialGpuSession } from '../gpu-backend/official.ts';\nexport const y = openOfficialGpuSession;\n");
    assert.deepEqual(audit(r), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('acceptance record: missing, forged, stale, changed evidence and wrong binary/device all fail closed', () => {
  const d = tmp();

  try {
    assert.equal(checkAcceptance({ file: path.join(d, 'none.json') }).status, 'MISSING');
    fs.writeFileSync(path.join(d, 'bad.json'), '{ not json');
    assert.equal(checkAcceptance({ file: path.join(d, 'bad.json') }).status, 'INVALID');

    const m = compatManifest();
    const evidence = path.join(d, 'evidence.json');

    fs.writeFileSync(evidence, '{"pass":true}\n');
    const ev = execFileSync('sha256sum', [evidence]).toString().split(' ')[0]!;
    const base = {
      kind: 'gpu-backend acceptance',
      schema: 1,
      status: 'ACCEPTED',
      study: 'research/x',
      acceptedAt: '2026-11-19T00:00:00Z',
      standard: { version: '3.0.0', sha256: '0'.repeat(64) },
      compat: m,
      binary: { path: 'x', sha256: '1'.repeat(64) },
      device: { uuid: 'GPU-test', name: 'test', driver: '0', cc: '0' },
      capabilities: SUPPORTED.toString(16),
      domain: { name: 'test', features: '0' },
      evidence: [{ name: 'e', path: path.relative(repoRoot, evidence), sha256: ev, pass: true }],
      blockers: []
    };
    const write = (name: string, x: unknown) => {
      fs.writeFileSync(path.join(d, name), JSON.stringify(x));
      return path.join(d, name);
    };

    assert.equal(checkAcceptance({ file: write('ok.json', base) }).ok, true);
    // a forged / stale compatibility manifest: one mirrored CPU source with another hash
    const stale = { ...base, compat: { ...m, cpu: { ...m.cpu, files: m.cpu.files.map((f, i) => (i === 0 ? { ...f, sha256: 'f'.repeat(64) } : f)) } } };
    const s = checkAcceptance({ file: write('stale.json', stale) });

    assert.equal(s.ok, false);
    assert.match(s.reasons.join(' '), /changed since acceptance/);
    // a digest that does not match the working tree (a source added to the closure)
    assert.equal(checkAcceptance({ file: write('digest.json', { ...base, compat: { ...m, digest: 'a'.repeat(64) } }) }).ok, false);
    // not accepted
    assert.equal(checkAcceptance({ file: write('na.json', { ...base, status: 'NOT_ACCEPTED', blockers: ['parity'] }) }).status, 'NOT_ACCEPTED');
    // changed evidence
    fs.writeFileSync(evidence, '{"pass":false}\n');
    assert.match(checkAcceptance({ file: path.join(d, 'ok.json') }).reasons.join(' '), /evidence e changed/);
    fs.writeFileSync(evidence, '{"pass":true}\n');
    // wrong binary, wrong device
    assert.match(checkAcceptance({ file: path.join(d, 'ok.json'), binary: evidence }).reasons.join(' '), /binary sha256/);
    assert.match(checkAcceptance({ file: path.join(d, 'ok.json'), uuid: 'GPU-other' }).reasons.join(' '), /device GPU-other/);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test('preflight §9: an official study needs the GPU backend and an accepted evaluator; no evasion by an old pin', () => {
  const reg = { versions: [{ version: '2.2.0', effective: '2026-11-13' }, { version: '3.0.0', effective: '2026-11-19' }] };
  const none = path.join(os.tmpdir(), 'gpu-policy-no-acceptance.json');

  assert.match(checkGpuPolicy({ scope: 'optimization', adoptedAt: '2026-11-20T00:00:00Z' }, '3.0.0', reg, { acceptanceFile: none }).errors.join(' '), /evaluationBackend must be/);
  assert.match(
    checkGpuPolicy({ scope: 'optimization', adoptedAt: '2026-11-20T00:00:00Z', evaluationBackend: { policy: 'gpu-required', purpose: 'official-optimization' } }, '3.0.0', reg, { acceptanceFile: none }).errors.join(' '),
    /BLOCKED/
  );
  assert.match(checkGpuPolicy({ scope: 'optimization', adoptedAt: '2026-11-20T00:00:00Z' }, '2.2.0', reg).errors.join(' '), /pins standard 2.2.0/);
  assert.deepEqual(checkGpuPolicy({ scope: 'optimization', adoptedAt: '2026-11-10T00:00:00Z' }, '2.2.0', reg).errors, []); // a frozen earlier study keeps its pin
  assert.deepEqual(
    checkGpuPolicy({ scope: 'diagnostic', adoptedAt: '2026-11-20T00:00:00Z', evaluationBackend: { policy: 'non-official-cpu', purpose: 'diagnostic', justification: 'replay' } }, '3.0.0', reg).errors,
    []
  );
  assert.match(
    checkGpuPolicy({ scope: 'diagnostic', adoptedAt: '2026-11-20T00:00:00Z', evaluationBackend: { policy: 'non-official-cpu', purpose: 'official-optimization', justification: 'x' } }, '3.0.0', reg).errors.join(' '),
    /non-official purpose/
  );
});

test('the deferred pilot domain reaches only capabilities the evaluator implements', async () => {
  const { riskEnvelopePilotDomain } = await import('../domain.ts');
  const { incumbents } = await import('../../vg-l0-full-joint/nl0.ts');
  const d = riskEnvelopePilotDomain(incumbents().NL0.quad.d1.VGT);

  assert.equal(d.features & ~SUPPORTED, 0n);
  assert.ok(d.growthStructures >= 8000);
});

test('MERGE GATE: a recorded GPU acceptance still matches the working tree (mirrored CPU sources, CUDA, host path)', () => {
  const c = checkAcceptance();

  if (c.status === 'MISSING') {
    // no accepted evaluator yet: official GPU optimization is blocked by the gate itself (nothing to keep in sync)
    assert.equal(fs.existsSync(acceptanceFile), false);
    return;
  }
  assert.equal(
    c.ok,
    true,
    `the GPU acceptance no longer matches this tree — ${c.reasons.join('; ')}. Every change to D1, Growth, the allocator, ` +
      'exits/entries/risk controls or any evaluation dependency needs its CUDA counterpart and fresh Apollo parity evidence ' +
      '(docs/gpu/PARITY_CHECKLIST.md) before it is merged or used for official research.'
  );
});

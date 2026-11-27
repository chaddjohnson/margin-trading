// gpu-phase9 (copy of tools/gpu-phase6/tamper-sandbox.ts; new cases T21–T23 for the Phase 7 risk-envelope delivery: the
// pool's mismatch check, the Lab's envelope validation and the risk key suffix). Phase 6's header follows.
// gpu-phase6 (copy of tools/gpu-phase5/tamper-sandbox.ts, this study's namespace; PROTOCOL.md §6 gate E4; new cases T16–T20 for the
// Phase 6 mechanisms: the job lock, the gate's job requirement, the legacy runner's engine check, the required pins of the
// job module and an unclassified job-module file). Runs INSIDE a throwaway
// clone of the repository created by tools/gpu-phase9/tamper.ts — never in the main checkout. It writes a provisional
// acceptance record for the clone's committed tree (a test fixture, never committed anywhere), a fixture official study
// (research/zz-tamper, scope optimization, GPU-required: only so that the official runner wrapper can be exercised —
// it is not a study and searches nothing), then, case by case: applies one modification, probes every independent
// mechanism in fresh processes (the validator's static check, the live official gate, the official runner wrapper, the
// independent verifier verify-acceptance.sh, the merge-gate tests), restores the file from Git and checks that the clone
// is clean again. Prints one JSON document.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const binary = process.env.GPU_BACKEND_BINARY!;
const node = process.execPath;
// every probe runs without V8's Maglev (src/gpu-backend/runtime.ts): the gate and the runner refuse otherwise
const ts = ['--no-maglev', '--experimental-transform-types', '--disable-warning=ExperimentalWarning'];
const sh = (cmd: string, args: string[], env: Record<string, string> = {}) =>
  spawnSync(cmd, args, { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 900_000 });
const probe = (mode: string) => {
  const r = sh(node, [...ts, 'tools/gpu-phase9/tamper-probe.ts', mode]);

  try {
    return JSON.parse(r.stdout.trim().split('\n').at(-1)!) as Record<string, unknown>;
  } catch {
    return { mode, outcome: 'error', message: `${r.stdout.slice(-300)} ${r.stderr.slice(-300)}` };
  }
};
const verify = (extra: string[] = []) => {
  const r = sh('tools/gpu-backend/verify-acceptance.sh', extra);

  return {
    status: r.status,
    verified: /^VERIFIED$/m.test(r.stdout),
    fails: r.stdout
      .split('\n')
      .filter((l) => l.startsWith('FAIL'))
      .map((l) => l.slice(0, 160))
  };
};
const mergeGate = () => {
  const r = sh(node, [
    ...ts,
    '--test',
    '--test-reporter=tap',
    'src/gpu-backend/tests/policy.test.ts',
    'src/gpu-backend/tests/enforcement.test.ts',
    'src/gpu-jobs/tests/jobs.test.ts'
  ]);

  return {
    pass: /# fail 0/.test(r.stdout),
    failing: r.stdout
      .split('\n')
      .filter((l) => /^not ok/.test(l))
      .map((l) => l.slice(0, 160))
  };
};
const sha = (f: string) =>
  createHash('sha256')
    .update(fs.readFileSync(path.join(root, f)))
    .digest('hex');

// ----- the provisional record for the clone's committed tree (fixture) and the fixture official study -----
const { compatManifest, policySources } = await import(path.join(root, 'src/gpu-backend/compat.ts'));
const { ENFORCEMENT_EXTRAS } = await import(path.join(root, 'src/gpu-backend/acceptance.ts'));
const head = sh('git', ['rev-parse', 'HEAD']).stdout.trim();
const uuid = sh('nvidia-smi', ['--query-gpu=uuid', '--format=csv,noheader']).stdout.trim().split('\n')[0]!;
const generator = 'tools/gpu-phase9/tamper-sandbox.ts';
const writeRecord = (commit = head) => {
  const m = compatManifest();

  fs.writeFileSync(
    path.join(root, 'config/gpu-backend/acceptance.json'),
    `${JSON.stringify({ kind: 'gpu-backend acceptance', schema: 2, status: 'ACCEPTED', study: 'research/zz-tamper (sandbox fixture)', acceptedAt: new Date().toISOString(), standard: { version: '3.0.0', sha256: '' }, compat: { digest: m.digest, cpu: m.cpu, cuda: m.cuda, host: m.host, nvcc: m.nvcc, nvccFlags: m.nvccFlags, protocolVersion: m.protocolVersion, datasetVersion: m.datasetVersion, version: m.version }, policy: { ...policySources([...ENFORCEMENT_EXTRAS, generator]), generator }, source: { commit, tree: '', branch: 'sandbox' }, hostPath: { defaultWorkers: 2, modes: ['serial', 'parallel'] }, binary: { path: path.relative(root, binary), sha256: createHash('sha256').update(fs.readFileSync(binary)).digest('hex') }, device: { uuid, name: '', driver: '', cc: '' }, capabilities: '', domain: { name: '', features: '' }, evidence: [], blockers: [], supersedes: null }, null, 1)}\n`
  );
};

writeRecord();

const reg = JSON.parse(fs.readFileSync(path.join(root, 'docs/research/optimization-standard.versions.json'), 'utf8'));
const std = reg.versions.find((v: { version: string }) => v.version === '3.0.0');
const study = path.join(root, 'research/zz-tamper');

fs.mkdirSync(study, { recursive: true });
fs.writeFileSync(
  path.join(study, 'PROTOCOL.md'),
  `# zz-tamper (sandbox fixture, not a study)\n\nStandard 3.0.0 ${std.sha256}\n`
);
fs.writeFileSync(
  path.join(study, 'run.ts'),
  "import { openOfficialGpuSession } from '../../src/gpu-backend/official.ts';\nvoid openOfficialGpuSession;\nconsole.log('RAN');\n"
);
fs.writeFileSync(
  path.join(study, 'STANDARD_ADOPTION.json'),
  JSON.stringify({
    kind: 'optimization-standard-adoption',
    schema: 1,
    study: 'research/zz-tamper',
    scope: 'optimization',
    standard: { path: 'docs/research/OPTIMIZATION_STANDARD.md', version: '3.0.0', sha256: std.sha256 },
    readAt: new Date(Date.now() - 60000).toISOString().replace(/\.\d+Z$/, 'Z'),
    adoptedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    protocol: { path: 'research/zz-tamper/PROTOCOL.md', sha256: sha('research/zz-tamper/PROTOCOL.md') },
    dateSplit: {
      development: { from: '2016-01-04', to: '2024-12-31' },
      validation: { from: '2025-01-01', to: '2026-10-30' },
      commonCompleteEndpoint: '2026-10-30'
    },
    objective: {
      prioritizes: 'robust-profit',
      primaryRule: 'sandbox fixture',
      roles: ['actual-profit', 'robust-profit', 'balanced']
    },
    risk: { maximumMinuteDrawdown: 35000, principalBudget: 100000, denominator: 'one fixed $100,000 principal budget' },
    budget: { distinctProposals: 1, backendEvaluations: 1, notes: 'sandbox fixture' },
    evaluationBackend: {
      policy: 'gpu-required',
      purpose: 'official-optimization',
      acceptance: 'config/gpu-backend/acceptance.json'
    },
    chronologicalConsequence: 'sandbox fixture',
    deviations: []
  })
);

// ----- the cases -----
interface Case {
  id: string;
  name: string;
  file: string;
  find: string | RegExp;
  replace: string;
  expect: {
    static: 'STALE' | 'ACCEPTED' | 'any';
    gate: 'refused' | 'opened' | 'any';
    runner: 'refused' | 'ran' | 'any';
    verify: boolean;
    mergeGate: boolean;
  };
  regenerate?: boolean; // the tamper is committed together with a regenerated record (the malicious-committer case)
}
const R = { static: 'STALE', gate: 'refused', runner: 'refused', verify: false, mergeGate: false } as const;
const cases: Case[] = [
  {
    id: 'T1',
    name: 'a modified host-worker decoder (results returned in another order)',
    file: 'src/gpu-backend/hostWorker.ts',
    find: "results: m.mode === 'lean' ? results.map(leanResult) : results",
    replace: "results: (m.mode === 'lean' ? results.map(leanResult) : results).reverse()",
    expect: R
  },
  {
    id: 'T2',
    name: 'a modified batch encoder (the request assembly)',
    file: 'src/gpu-backend/batch.ts',
    find: 'buf.writeUInt32LE(o.lotCap ?? 512, h.lotCap!);',
    replace: 'buf.writeUInt32LE(o.lotCap ?? 511, h.lotCap!);',
    expect: R
  },
  {
    id: 'T3',
    name: 'the CPU-official refusal removed (a CPU runner accepts official optimization)',
    file: 'src/gpu-backend/purpose.ts',
    find: "  if (p === 'official-optimization')\n    throw",
    replace: "  if (p === 'never')\n    throw",
    expect: R
  },
  {
    id: 'T4',
    name: 'acceptance verification disabled (the validator always says ACCEPTED)',
    file: 'src/gpu-backend/acceptance.ts',
    find: '  return {\n    ok: reasons.length === 0,',
    replace: '  reasons.length = 0;\n  return {\n    ok: reasons.length === 0,',
    expect: { static: 'ACCEPTED', gate: 'refused', runner: 'any', verify: false, mergeGate: false }
  },
  {
    id: 'T5',
    name: 'the manifest generator altered (a host-path file dropped from the evaluation digest)',
    file: 'src/gpu-backend/compat.ts',
    find: "  'hostWorker.ts',\n  'hostDoor.ts'\n].map",
    replace: "  'hostDoor.ts'\n].map",
    expect: R
  },
  {
    id: 'T6',
    name: 'the official entrypoint altered (the parity mini-set check removed)',
    file: 'src/gpu-backend/official.ts',
    find: "    check(\n      'parity',",
    replace: "    if (false) check(\n      'parity',",
    expect: { static: 'STALE', gate: 'any', runner: 'refused', verify: false, mergeGate: false }
  },
  {
    id: 'T7',
    name: 'the entrypoint registry altered (an unregistered optimizer declared non-official)',
    file: 'config/gpu-backend/entrypoints.json',
    find: '"nonOfficial": {',
    replace: '"nonOfficial": {\n  "zz-new-optimizer": "tamper",',
    expect: R
  },
  {
    id: 'T8',
    name: 'the legacy-runner purpose gate disabled',
    file: 'src/gpu-backend/legacyRunner.ts',
    find: "  const purpose = assertNonOfficialCpuRun(`the legacy CPU runner '${name}'`);",
    replace: "  const purpose = 'cpu-reference';",
    expect: R
  },
  {
    id: 'T9',
    name: 'the preflight §9 rule weakened (no GPU backend or acceptance required)',
    file: 'src/research-standard/gpuPolicy.ts',
    find: '  if (official) {\n    if (!b ||',
    replace: '  if (false) {\n    if (!b ||',
    expect: { ...R, runner: 'any' }
  },
  {
    id: 'T10',
    name: 'the independent verifier altered (it always says VERIFIED)',
    file: 'tools/gpu-backend/verify-acceptance.sh',
    find: 'print(\'VERIFIED\' if not fails else f"NOT VERIFIED ({len(fails)} failure(s))")\nsys.exit(1 if fails else 0)',
    replace: "print('VERIFIED')\nsys.exit(0)",
    expect: { static: 'STALE', gate: 'refused', runner: 'refused', verify: true, mergeGate: false }
  },
  {
    id: 'T11',
    name: 'forced mixed CPU scoring in the pool (a CPU-scored counter bypass)',
    file: 'src/gpu-backend/pool.ts',
    find: '    if (c.cpuScored !== 0)\n',
    replace: '    if (c.cpuScored < 0)\n',
    expect: R
  },
  {
    id: 'T12',
    name: 'a CUDA source changed without a new build and acceptance',
    file: 'src/gpu-backend/cuda/gb_pool.cuh',
    find: /^/,
    replace: '// tamper\n',
    expect: R
  },
  {
    id: 'T13',
    name: 'a new, unclassified GPU-backend file (a loader outside the manifest)',
    file: 'src/gpu-backend/sneakyLoader.ts',
    find: /^/,
    replace: 'export const x = 1;\n',
    expect: { static: 'ACCEPTED', gate: 'any', runner: 'any', verify: true, mergeGate: false }
  },
  {
    id: 'T15',
    name: "the engine-runtime requirement removed (a process running under V8's Maglev is accepted)",
    file: 'src/gpu-backend/runtime.ts',
    find: "  execArgv.includes(ENGINE_FLAG) && execArgv.every((a) => a === ENGINE_FLAG || !/maglev/i.test(a));",
    replace: '  execArgv.length >= 0;',
    expect: R
  },
  {
    id: 'T16',
    name: 'the job ownership lock disabled (a second process could write a job)',
    file: 'src/gpu-jobs/lock.ts',
    find: "      db.exec('PRAGMA journal_mode=DELETE');\n      db.exec('BEGIN EXCLUSIVE');",
    replace: "      db.exec('PRAGMA journal_mode=DELETE');\n      db.exec('BEGIN');",
    expect: R
  },
  {
    id: 'T17',
    name: "the official gate's job requirement removed (an official run without an isolated job)",
    file: 'src/gpu-backend/official.ts',
    find: "      : `an official run owns an isolated job: open it with openJob (src/gpu-jobs/jobs.ts) and pass it as spec.job`;",
    replace: '      : null;',
    expect: { static: 'STALE', gate: 'refused', runner: 'refused', verify: false, mergeGate: false }
  },
  {
    id: 'T18',
    name: "the legacy runner's engine check and child guard removed (a CPU runner under V8's Maglev)",
    file: 'src/gpu-backend/legacyRunner.ts',
    find: "  requireEngineRuntime(`the legacy CPU runner '${name}'`);\n  installChildEngineGuard();\n",
    replace: '',
    expect: R
  },
  {
    id: 'T19',
    name: 'the job module dropped from the required pins of an acceptance record',
    file: 'src/gpu-backend/acceptance.ts',
    find: 'export const requiredPolicyFiles = () => [...policyFiles, ...ENFORCEMENT_EXTRAS];',
    replace: 'export const requiredPolicyFiles = () => [...policyFiles];',
    expect: R
  },
  {
    id: 'T20',
    name: 'a new, unclassified file in the job module (an ownership bypass outside the pins)',
    file: 'src/gpu-jobs/bypass.ts',
    find: /^/,
    replace: 'export const x = 1;\n',
    expect: { static: 'ACCEPTED', gate: 'any', runner: 'any', verify: true, mergeGate: false }
  },
  {
    id: 'T21',
    name: "the pool's risk-envelope mismatch check removed (a risk record could be released without its envelope)",
    file: 'src/gpu-backend/pool.ts',
    find: "      if (mismatch)\n        throw new PolicyError(",
    replace: "      if (mismatch && false)\n        throw new PolicyError(",
    expect: R
  },
  {
    id: 'T22',
    name: "the Lab's envelope validation removed (an invalid or missing envelope could be archived)",
    file: 'src/gpu-backend/lab.ts',
    find: '    if (k.endsWith(RISK_KEY_SUFFIX)) checkEnvelope(env, `${where} ${k}`);',
    replace: '    if (k.endsWith(RISK_KEY_SUFFIX)) void env;',
    expect: R
  },
  {
    id: 'T23',
    name: 'the risk key suffix dropped (risk-bearing and plain records would share one archive identity)',
    file: 'src/gpu-backend/lab.ts',
    find: "export const RISK_KEY_SUFFIX = '|risk';",
    replace: "export const RISK_KEY_SUFFIX = '';",
    expect: R
  },
  {
    id: 'T14',
    name: 'a weakened gate committed with a regenerated record (the malicious-committer case: the parity mini-set shrunk to one seeded genome); only the out-of-band record pin detects it',
    file: 'src/gpu-backend/official.ts',
    find: 'parityMiniSet(spec.parityMiniSet ?? 14)',
    replace: 'parityMiniSet(spec.parityMiniSet ?? 1)',
    regenerate: true,
    expect: { static: 'ACCEPTED', gate: 'any', runner: 'ran', verify: true, mergeGate: true }
  }
];

const baseline = {
  static: probe('static'),
  gate: probe('gate'),
  runner: probe('runner'),
  verify: verify(),
  mergeGate: mergeGate()
};
const baselineOk =
  baseline.static.status === 'ACCEPTED' &&
  baseline.gate.outcome === 'opened' &&
  baseline.runner.outcome === 'ran' &&
  baseline.verify.verified &&
  baseline.mergeGate.pass;
const recordSha = sha('config/gpu-backend/acceptance.json');
const rows: Record<string, unknown>[] = [];

for (const c of cases) {
  const full = path.join(root, c.file);
  const existed = fs.existsSync(full);
  const before = existed ? fs.readFileSync(full, 'utf8') : '';
  const after = typeof c.find === 'string' ? before.replace(c.find, c.replace) : before.replace(c.find, c.replace);
  let applied = after !== before;

  fs.writeFileSync(full, after);
  if (c.regenerate) {
    sh('git', ['-c', 'user.email=tamper@sandbox', '-c', 'user.name=tamper', 'commit', '-qam', 'tamper (sandbox)']);
    writeRecord(sh('git', ['rev-parse', 'HEAD']).stdout.trim()); // a competent forger names the new revision
  }

  const got = {
    static: probe('static'),
    gate: c.id === 'T13' || c.id === 'T14' || c.id === 'T20' ? { outcome: 'not run' } : probe('gate'),
    runner: probe('runner'),
    verify: verify(),
    verifyPinned: verify(['--expect-record-sha256', recordSha]),
    mergeGate: mergeGate()
  };
  const e = c.expect;
  const checks = {
    applied,
    static: e.static === 'any' || got.static.status === e.static,
    gate: e.gate === 'any' || got.gate.outcome === e.gate,
    runner: e.runner === 'any' || got.runner.outcome === e.runner,
    verify: got.verify.verified === e.verify,
    mergeGate: got.mergeGate.pass === e.mergeGate,
    outOfBandPin: got.verifyPinned.verified === false || (!c.regenerate && got.verifyPinned.verified === e.verify)
  };
  // detected: at least one mechanism that is not the modified file itself refuses it
  const detected =
    got.static.status !== 'ACCEPTED' ||
    got.gate.outcome === 'refused' ||
    got.runner.outcome === 'refused' ||
    !got.verify.verified ||
    !got.mergeGate.pass ||
    !got.verifyPinned.verified;

  // restore
  if (c.regenerate) {
    sh('git', ['reset', '-q', '--hard', head]);
    writeRecord();
  } else if (existed) fs.writeFileSync(full, before);
  else fs.rmSync(full);
  applied = applied && true;

  const clean =
    sh('git', ['status', '--porcelain', '--', 'src', 'tools', 'config/gpu-backend/entrypoints.json']).stdout.trim() ===
    '';
  const pass = Object.values(checks).every(Boolean) && detected && clean;

  rows.push({
    id: c.id,
    name: c.name,
    file: c.file,
    expect: c.expect,
    observed: {
      static: got.static.status,
      staticReason: String((got.static.reasons as string[] | undefined)?.[0] ?? '').slice(0, 200),
      gate: got.gate.outcome,
      gateMessage: String(got.gate.message ?? '').slice(0, 200),
      runner: got.runner.outcome,
      runnerMessage: String(got.runner.message ?? '').slice(0, 200),
      verify: got.verify.verified,
      verifyFails: got.verify.fails.slice(0, 3),
      verifyWithOutOfBandPin: got.verifyPinned.verified,
      mergeGate: got.mergeGate.pass,
      mergeGateFailing: got.mergeGate.failing.slice(0, 3)
    },
    checks,
    detected,
    restoredClean: clean,
    pass
  });
  console.error(`${pass ? 'PASS' : 'FAIL'} ${c.id} ${c.name}`);
}

console.log(
  JSON.stringify({
    kind: 'gpu-phase9 tamper suite (sandbox)',
    t: new Date().toISOString(),
    head,
    baseline,
    baselineOk,
    recordSha256: recordSha,
    cases: rows.length,
    passed: rows.filter((r) => r.pass).length,
    pass: baselineOk && rows.every((r) => r.pass),
    rows
  })
);

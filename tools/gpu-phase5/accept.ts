// gpu-phase5: the ACCEPTANCE GENERATOR (PROTOCOL.md §10; standard 3.0.0 §9.9; adapted from tools/gpu-phase3/accept.ts).
// It reads the final campaign's evidence, checks every gate (A1–A9, P1, P5) against the FINAL binary, the working tree
// and its Git revision, and
// writes config/gpu-backend/acceptance.json in schema 2 — ACCEPTED only if every gate passed, otherwise NOT_ACCEPTED
// with the blockers (official optimization stays blocked either way until ACCEPTED). The record pins the evaluation
// manifest (CPU closure, CUDA, host path — the digest compiled into the binary), the enforcement group (every file, and
// this generator), the source revision (HEAD; every pinned file must be committed and unmodified), the binary sha256,
// the device, the capability domain and every evidence file's sha256, and names the record it supersedes. It never
// edits evidence.
//   node --experimental-transform-types tools/gpu-phase5/accept.ts [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { compatManifest, policySources } from '../../src/gpu-backend/compat.ts';
import {
  ACCEPTANCE_SCHEMA,
  acceptanceFile,
  checkAcceptance,
  headCommit,
  uncommittedPinnedFiles,
  type AcceptanceRecord
} from '../../src/gpu-backend/acceptance.ts';
import { riskEnvelopePilotDomain, assignment3Domain } from '../../src/gpu-backend/domain.ts';
import { DEFAULT_HOST_WORKERS } from '../../src/gpu-backend/hostPipeline.ts';
import { SUPPORTED, featureNames } from '../../src/gpu-backend/layout.ts';
import { incumbents } from '../../src/vg-l0-full-joint/nl0.ts';
import { repoRoot, serverBinary } from '../../src/gpu-backend/toolchain.ts';
import { smiUuid } from '../../src/gpu-backend/official.ts';

const dry = process.argv.includes('--dry-run');
const study = 'research/gpu-phase5';
const generator = 'tools/gpu-phase5/accept.ts';
const R = (p: string) => path.join(repoRoot, study, 'results', p);
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
// study records encode ±Infinity / NaN as "__Inf" / "__-Inf" / "__NaN" strings (gpu-phase5/context.ts writeJson)
const read = <T>(f: string): T | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null);
const binarySha = fs.existsSync(serverBinary) ? sha(serverBinary) : 'missing';
const final16 = binarySha.slice(0, 16);
const evidence: AcceptanceRecord['evidence'] = [];
const blockers: string[] = [];
const gate = (name: string, file: string | null, pass: boolean, why: string) => {
  if (file && fs.existsSync(file))
    evidence.push({ name, path: path.relative(repoRoot, file), sha256: sha(file), pass });
  else if (file) blockers.push(`${name}: evidence ${path.relative(repoRoot, file)} missing`);
  if (!pass) blockers.push(`${name}: ${why}`);
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ` — ${why}`}`);
};
const m = compatManifest();
const policy = policySources([generator]);

// A1 identity: the final binary is the server binary, built from this tree, reproducible, with the accepted kernels
// (Phase 3's gb3 = Phase 2's gb2 device code) byte for byte
{
  const f = R('final-binary.json');
  const s = read<{
    binary: { sha256: string };
    compat: { digest: string };
    reproducible: boolean;
    kernels: {
      fatbinIdenticalToPhase3: boolean;
      sassIdenticalToPhase3: boolean;
      fatbinIdenticalToPhase2: boolean;
      sassIdenticalToPhase2: boolean;
    };
  }>(f);

  gate(
    'A1 final binary (reproducible; built from this tree; kernels identical to the accepted Phase 3 and Phase 2 binaries)',
    f,
    !!s &&
      s.binary.sha256 === binarySha &&
      s.compat.digest === m.digest &&
      s.reproducible &&
      s.kernels.fatbinIdenticalToPhase3 &&
      s.kernels.sassIdenticalToPhase3 &&
      s.kernels.fatbinIdenticalToPhase2 &&
      s.kernels.sassIdenticalToPhase2,
    s
      ? `binary ${s.binary.sha256.slice(0, 12)} vs server ${binarySha.slice(0, 12)}, digest ${s.compat.digest.slice(0, 12)} vs tree ${m.digest.slice(0, 12)}, reproducible ${s.reproducible}, kernels P3 ${s.kernels.fatbinIdenticalToPhase3 && s.kernels.sassIdenticalToPhase3}`
      : 'missing'
  );
}
// A2 offline codec / host-path equivalence on Phase 3's captured batches
{
  const f = R('final/offline-check.json');
  const s = read<{ captures: number; failures: number }>(f);

  gate(
    'A2 offline codec and host-pipeline equivalence (Phase 3 captures of real Phase 2 batches)',
    f,
    !!s && s.captures >= 7 && s.failures === 0,
    s ? `${s.captures} captures, ${s.failures} failures` : 'missing'
  );
}
// A3 parity campaign through the final host path, and Assignment 3's sealed finalists
{
  const f = R('parity/final/SUMMARY.json');
  const s = read<{ pass: boolean; build: { binaries: string[] }; totals: { subjects: number; mismatches: number } }>(f);

  gate(
    'A3 parity campaign through the final host path (zero mismatches, coverage, determinism)',
    f,
    !!s && s.pass && s.build.binaries.length === 1 && s.build.binaries[0] === binarySha,
    s
      ? `subjects ${s.totals.subjects}, mismatches ${s.totals.mismatches}, binaries ${s.build.binaries.map((b) => b.slice(0, 12))}`
      : 'missing'
  );
  const g = R('parity/final-finalists.json');
  const t = read<{
    pass: boolean;
    binarySha256: string;
    runs: { door: string; tasks: number; identical: number; sealedChecked: number; sealedEqual: number }[];
  }>(g);

  gate(
    'A3 Assignment 3 sealed finalists (GPU = CPU reference; D24 = sealed figures)',
    g,
    !!t &&
      t.pass &&
      t.binarySha256 === binarySha &&
      t.runs.every((r) => r.identical === r.tasks && r.sealedEqual === r.sealedChecked),
    t ? JSON.stringify(t.runs.map((r) => [r.door, r.identical, r.tasks, r.sealedEqual, r.sealedChecked])) : 'missing'
  );
}
// A4 optimizer identity: sealed-job replays, the fixed-seed mini-optimization (CPU = GPU = resumed), worker counts
{
  const sealedJob = (name: string, file: string) => {
    const f = R(`optimizer/${file}`);
    const s = read<{ identical: boolean; replay: { backend: string } }>(f);

    gate(
      name,
      f,
      !!s && s.identical && s.replay.backend.includes(final16),
      s ? `identical ${s.identical}, backend ${s.replay.backend}` : 'missing'
    );
  };

  sealedJob(
    'A4 Assignment 3 C19 broad1 search replay = sealed record (final binary, host path; run 1)',
    'compare-final-a3-r1-vs-sealed.json'
  );
  sealedJob(
    'A4 Assignment 3 C19 broad1 search replay = sealed record (final binary, host path; run 2)',
    'compare-final-a3-r2-vs-sealed.json'
  );
  sealedJob(
    'A4 Assignment 2 C19 base search replay = sealed record (Growth fixed; final binary, host path)',
    'compare-final-a2-r1-vs-sealed.json'
  );
  {
    const f = R('optimizer/compare-final-a3q.json');
    const s = read<{ identical: boolean; backend: string }>(f);

    gate(
      'A4 Assignment 3 C19 broad qualification replay = sealed evidence (final binary, host path)',
      f,
      !!s && s.identical && s.backend.includes(final16),
      s ? `identical ${s.identical}, backend ${s.backend}` : 'missing'
    );
  }
  for (const [name, file] of [
    ['A4 fixed-seed mini-optimization CPU = GPU (final binary, host path)', 'compare-final-mini-cpu-vs-gpu.json'],
    ['A4 fixed-seed mini-optimization GPU = interrupted + resumed GPU', 'compare-final-mini-gpu-vs-resumed.json'],
    ['A4 fixed-seed mini-optimization host workers 1 = 8 workers', 'compare-final-mini-w1-vs-w8.json'],
    ['A4 fixed-seed mini-optimization serial path (host workers 0) = 8 workers', 'compare-final-mini-w0-vs-w8.json']
  ] as const) {
    const f = R(`optimizer/${file}`);
    const s = read<{ identical: boolean; b: { backend: string } }>(f);

    gate(
      name,
      f,
      !!s && s.identical && s.b.backend.includes(final16),
      s ? `identical ${s.identical}, backend ${s.b.backend}` : 'missing'
    );
  }
}
// A5 sanitizer on the final binary
{
  const f = R('sanitizer-final/sanitizer.json');
  const s = read<{
    binarySha256?: string;
    rows: { tool: string; errors: number | null; subjects: number; identical: number; smoke: boolean }[];
  }>(f);
  const ok =
    !!s &&
    s.binarySha256 === binarySha &&
    ['memcheck', 'racecheck', 'initcheck', 'synccheck'].every((t) => s.rows.some((r) => r.tool === t)) &&
    s.rows.every((r) => r.errors === 0 && r.smoke && r.identical === r.subjects);

  gate(
    'A5 compute-sanitizer (memcheck, racecheck, initcheck, synccheck) on the final binary, requests from the host path',
    f,
    ok,
    s ? JSON.stringify(s.rows.map((r) => [r.tool, r.errors, r.identical, r.subjects])) : 'missing'
  );
}
// A6 negative tests and source-tamper tests on the accepted pinned files (the campaign's runs, or — after an
// enforcement-only change — reruns on a commit whose pinned files equal HEAD's, docs/gpu/PARITY_CHECKLIST.md §2a)
const pinnedPaths = [...m.cpu.files, ...m.cuda.files, ...m.host.files, ...policy.files].map((f) => f.path);
const samePins = (commit: string | undefined) =>
  !!commit &&
  spawnSync('git', ['diff', '--quiet', commit, 'HEAD', '--', ...pinnedPaths], { cwd: repoRoot }).status === 0;
{
  const f = fs.existsSync(R('policy/negative-acceptance.json'))
    ? R('policy/negative-acceptance.json')
    : R('policy/negative-final.json');
  const s = read<{ pass: boolean; total: number; passed: number; head: string; binaries: { dev: string } }>(f);

  gate(
    'A6 negative tests on the accepted pinned files (final binary)',
    f,
    !!s && s.pass && s.binaries.dev === binarySha && samePins(s.head),
    s ? `${s.passed}/${s.total} at ${s.head?.slice(0, 12)}, pinned files equal ${samePins(s.head)}` : 'missing'
  );
  const g = fs.existsSync(R('policy/tamper-acceptance.json'))
    ? R('policy/tamper-acceptance.json')
    : R('policy/tamper-final.json');
  const t = read<{
    pass: boolean;
    cases: number;
    passed: number;
    baselineOk: boolean;
    head?: string;
    mainHead?: string;
  }>(g);
  const th = t?.head ?? t?.mainHead;

  gate(
    'A6 source-tamper tests in a sandbox clone on the accepted pinned files (every mechanism; out-of-band pin)',
    g,
    !!t && t.pass && t.baselineOk && samePins(th),
    t ? `${t.passed}/${t.cases} at ${th?.slice(0, 12)}, pinned files equal ${samePins(th)}` : 'missing'
  );
}
// A7 the bounded reliability run in the Mode A configuration (one or several concurrent processes)
{
  const dir = R('sustained');
  const files = fs.existsSync(path.join(dir, 'summary.json'))
    ? [path.join(dir, 'summary.json')]
    : fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((d) => /^p\d+$/.test(d))
          .map((d) => path.join(dir, d, 'summary.json'))
      : [];

  if (!files.length) gate('A7 bounded 30–35 min reliability run', R('sustained/summary.json'), false, 'missing');
  for (const f of files) {
    const s = read<{
      pass: boolean;
      finished: string | null;
      started: string;
      binary: { sha256: string };
      failures: unknown[];
      parity: { samples: number; mismatches: number };
      repeat: { checks: number; mismatches: number };
      cpuScored: number;
    }>(f);
    const minutes = s?.finished ? (Date.parse(s.finished) - Date.parse(s.started)) / 60000 : 0;

    gate(
      `A7 bounded 30–35 min reliability run (${path.relative(dir, path.dirname(f)) || 'one process'}: no failure, parity samples, repeatability)`,
      f,
      !!s &&
        s.pass &&
        minutes >= 30 &&
        minutes <= 75 &&
        s.binary.sha256 === binarySha &&
        s.failures.length === 0 &&
        s.parity.samples > 0 &&
        s.parity.mismatches === 0 &&
        s.repeat.checks > 0 &&
        s.repeat.mismatches === 0 &&
        s.cpuScored === 0,
      s
        ? `minutes ${minutes.toFixed(1)}, failures ${s.failures.length}, parity ${s.parity.samples}/${s.parity.mismatches}, repeat ${s.repeat.checks}/${s.repeat.mismatches}`
        : 'missing'
    );
  }
}
// A8 repository suite (incl. the root type check, which CC1 fixes: 0 errors required) and Strategy Lab
{
  const f = R('tests/npm-test.json');
  const s = read<{ pass: boolean; summary: string; rootTsc: string }>(f);

  gate('A8 npm test (= baseline + new tests; known failures only)', f, !!s && s.pass, s ? s.summary : 'missing');
  gate(
    'A8 root TypeScript check: 0 errors (the hostPipeline.ts Transferable finding fixed)',
    f,
    !!s && s.rootTsc === 'exit 0',
    s ? s.rootTsc.slice(0, 200) : 'missing'
  );
  const g = R('tests/strategy-lab.json');
  const t = read<{ pass: boolean; summary: string }>(g);

  gate('A8 Strategy Lab regression (CPU engine, suites, state untouched)', g, !!t && t.pass, t ? t.summary : 'missing');
}
// A9 the benchmarks recorded (every group verified) and the regression check of the final binary
{
  const f = R('bench/SUMMARY.json');
  const s = read<{ groups: { group: string; identical: boolean }[] }>(f);

  gate(
    'A9 concurrency and batching benchmarks recorded (every group verified identical)',
    f,
    !!s && s.groups.length > 0 && s.groups.every((g) => g.identical),
    s ? `${s.groups.length} groups` : 'missing'
  );
  const g = R('optimizer/regression.json');
  const t = read<{ pass: boolean; summary: string }>(g);

  gate(
    'A9 final binary regression benchmark (Assignment 3 replay within ±3 % of the accepted engine)',
    g,
    !!t && t.pass,
    t ? t.summary : 'missing'
  );
}
// P1 policy text and P5 enforcement tests (the merge gate, the enforcement coverage, the host pipeline's own tests)
{
  const reg = read<{ current: string; versions: { version: string; sha256: string }[] }>(
    path.join(repoRoot, 'docs/research/optimization-standard.versions.json')
  )!;
  const std = sha(path.join(repoRoot, 'docs/research/OPTIMIZATION_STANDARD.md'));
  const claude = fs.readFileSync(path.join(repoRoot, 'CLAUDE.md'), 'utf8');

  gate(
    'P1 policy text (CLAUDE.md, standard 3.0.0 registered)',
    null,
    reg.current === '3.0.0' &&
      reg.versions.some((v) => v.version === '3.0.0' && v.sha256 === std) &&
      claude.includes('GPU-only official optimization and CPU/GPU parity (MANDATORY'),
    `registry current ${reg.current}`
  );
  const r = spawnSync(
    process.execPath,
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      '--test',
      '--test-reporter=tap',
      'src/gpu-backend/tests/policy.test.ts',
      'src/gpu-backend/tests/layout.test.ts',
      'src/gpu-backend/tests/hostPipeline.test.ts',
      'src/gpu-backend/tests/enforcement.test.ts'
    ],
    { cwd: repoRoot, encoding: 'utf8', timeout: 900_000 }
  );
  const f = R('policy/policy-tests.txt');

  if (!dry) fs.writeFileSync(f, `${r.stdout}\n${r.stderr}`);
  gate(
    'P5 policy, enforcement and host-pipeline tests',
    dry ? null : f,
    /# fail 0/.test(r.stdout) && /# pass [1-9]/.test(r.stdout),
    r.stdout
      .split('\n')
      .filter((l) => /^# (pass|fail)|^not ok/.test(l))
      .join(' ')
  );
}

// the source revision: every pinned file committed and unmodified
const draft = { compat: { cpu: m.cpu, cuda: m.cuda, host: m.host }, policy } as unknown as AcceptanceRecord;
const dirty = uncommittedPinnedFiles(draft);

if (dirty.length) blockers.push(`pinned files are not committed unmodified: ${dirty.slice(0, 8).join('; ')}`);

const uuid = smiUuid();
const grid = incumbents().NL0.quad.d1.VGT;
const domain = riskEnvelopePilotDomain(grid);
const a3 = assignment3Domain(grid);

if ((domain.features & ~SUPPORTED) !== 0n || (a3.features & ~SUPPORTED) !== 0n)
  blockers.push(
    `domain features outside the supported set: ${featureNames((domain.features | a3.features) & ~SUPPORTED).join(', ')}`
  );

const smi = spawnSync('nvidia-smi', ['--query-gpu=name,driver_version,compute_cap', '--format=csv,noheader'], {
  encoding: 'utf8'
})
  .stdout.trim()
  .split(', ');
const stdReg = read<{ versions: { version: string; sha256: string }[] }>(
  path.join(repoRoot, 'docs/research/optimization-standard.versions.json')
)!;
const git = (...a: string[]) => spawnSync('git', a, { cwd: repoRoot, encoding: 'utf8' }).stdout.trim();
// the superseded record: Phase 3's, moved out of config/ when the pinned files changed (CC1–CC3: stale from that commit on,
// so official optimization was blocked during the campaign)
const supersededFile = R('superseded/acceptance-gpu-phase3.json');
const previousFile = fs.existsSync(acceptanceFile) ? acceptanceFile : supersededFile;
const previous = fs.existsSync(previousFile)
  ? (JSON.parse(fs.readFileSync(previousFile, 'utf8')) as { study: string; acceptedAt: string })
  : null;
const record: AcceptanceRecord = {
  kind: 'gpu-backend acceptance',
  schema: ACCEPTANCE_SCHEMA as 2,
  status: blockers.length ? 'NOT_ACCEPTED' : 'ACCEPTED',
  study,
  acceptedAt: new Date().toISOString(),
  standard: { version: '3.0.0', sha256: stdReg.versions.find((v) => v.version === '3.0.0')?.sha256 ?? 'unregistered' },
  compat: {
    digest: m.digest,
    cpu: m.cpu,
    cuda: m.cuda,
    host: m.host,
    nvcc: m.nvcc,
    nvccFlags: m.nvccFlags,
    protocolVersion: m.protocolVersion,
    datasetVersion: m.datasetVersion,
    version: m.version
  },
  policy: { ...policy, generator },
  source: {
    commit: headCommit(),
    tree: git('rev-parse', 'HEAD^{tree}'),
    branch: git('rev-parse', '--abbrev-ref', 'HEAD')
  },
  hostPath: { defaultWorkers: DEFAULT_HOST_WORKERS, modes: ['serial (hostWorkers 0)', 'parallel (worker threads)'] },
  binary: { path: path.relative(repoRoot, serverBinary), sha256: binarySha },
  device: { uuid, name: smi[0] ?? '?', driver: smi[1] ?? '?', cc: smi[2] ?? '?' },
  capabilities: SUPPORTED.toString(16),
  domain: {
    name: 'Assignment 3 genome ∪ risk-envelope pilot domain (NL0 controls grid)',
    features: (domain.features | a3.features).toString(16)
  },
  evidence,
  blockers,
  supersedes: previous ? { study: previous.study, acceptedAt: previous.acceptedAt, sha256: sha(previousFile) } : null
};

console.log(`${record.status}${blockers.length ? `: ${blockers.length} blocker(s)` : ''}`);
if (!dry) {
  fs.mkdirSync(path.dirname(acceptanceFile), { recursive: true });
  fs.writeFileSync(acceptanceFile, `${JSON.stringify(record, null, 1)}\n`);
  const c = checkAcceptance({ binary: serverBinary, uuid });

  console.log(`written ${path.relative(repoRoot, acceptanceFile)}; static check: ${c.status} ${c.reasons.join('; ')}`);
}
process.exitCode = blockers.length ? 2 : 0;

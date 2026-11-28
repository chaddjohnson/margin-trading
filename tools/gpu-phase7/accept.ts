// gpu-phase7: the ACCEPTANCE GENERATOR for the risk-envelope delivery (PROTOCOL.md §6; docs/gpu/PARITY_CHECKLIST.md §2 —
// a FULL cycle: src/gpu-backend/pool.ts and toolchain.ts are in the host group of the evaluation digest, lab.ts in the
// enforcement group; standard 3.0.0 §9.9; adapted from tools/gpu-phase5/accept.ts and tools/gpu-phase6/accept.ts).
//
// FRESH evidence on this study's final binary research/gpu-phase7/build/gb7 (every gate below that names a file of
// research/gpu-phase7/): the final binary (reproducible, kernels byte-identical to the accepted gb5), the parity campaign
// (≥ 100,000 seeded random genomes through the host path, zero tolerance), the sealed finalists, the risk-delivery parity
// R1–R3 (records, envelopes, qualification and rankings, threshold edges, Assignment 3's archived records), the sealed
// optimizer replays (plain, and with the envelope requested), the fixed-seed mini-optimization (CPU = GPU, worker counts,
// stopped and killed + resumed; with the envelope requested CPU = GPU; risk = plain decisions), the qualification and
// ranking parity of the risk mini archives (Q1), the sanitizer, the bounded reliability run, the negative and tamper
// suites on the final pinned files, the repository and Strategy Lab suites, the integrity of historical research.
// CARRIED (valid only because the files they depend on are unchanged, each checked here): Phase 5's root-cause evidence
// of the V8 defect (R1–R3: properties of the JavaScript engine, Node unchanged), the offline codec equivalence (A2: batch,
// encode, client, layout, hostPipeline, hostWorker unchanged), the atomic dataset export (A10: dataset.ts unchanged) and
// Phase 6's job-isolation campaign (E2: src/gpu-jobs/ unchanged) — every file re-hashed against the record in force.
// It writes config/gpu-backend/acceptance.json in schema 2 — ACCEPTED only if every gate passed — and names the
// superseded Phase 6 record (sha256 3610caaf…).
//   node --no-maglev --experimental-transform-types tools/gpu-phase7/accept.ts [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { compatManifest, policySources } from '../../src/gpu-backend/compat.ts';
import {
  ACCEPTANCE_SCHEMA,
  ENFORCEMENT_EXTRAS,
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
import { ENGINE_FLAG, engineRuntime } from '../../src/gpu-backend/runtime.ts';

const dry = process.argv.includes('--dry-run');
const study = 'research/gpu-phase7';
const generator = 'tools/gpu-phase7/accept.ts';
const R = (p: string) => path.join(repoRoot, study, 'results', p);
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read = <T>(f: string): T | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null);
const binarySha = fs.existsSync(serverBinary) ? sha(serverBinary) : 'missing';
const final16 = binarySha.slice(0, 16);
const evidence: AcceptanceRecord['evidence'] = [];
const blockers: string[] = [];
const gate = (name: string, file: string | null, pass: boolean, why: string) => {
  if (file && fs.existsSync(file)) evidence.push({ name, path: path.relative(repoRoot, file), sha256: sha(file), pass });
  else if (file) blockers.push(`${name}: evidence ${path.relative(repoRoot, file)} missing`);
  if (!pass) blockers.push(`${name}: ${why}`);
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ` — ${why}`}`);
};
const m = compatManifest();
const policy = policySources([...ENFORCEMENT_EXTRAS, generator]);

// ----- the superseded record (Phase 6's, in force at baseline; a copy kept in this study before it is replaced) -----
const supersededFile = R('superseded/acceptance-gpu-phase6.json');

if (!fs.existsSync(supersededFile)) {
  const cur = read<AcceptanceRecord>(acceptanceFile);

  if (cur?.study !== 'research/gpu-phase6') throw new Error(`the record in force is not Phase 6's (${cur?.study})`);
  fs.mkdirSync(path.dirname(supersededFile), { recursive: true });
  fs.copyFileSync(acceptanceFile, supersededFile);
}
const p6 = read<AcceptanceRecord>(supersededFile)!;
const P6_SHA = '3610caaf0bfc14ecd5ea75981a69f9316ff9ff6b610d4913b949d36950c884d3';

gate('S0 the superseded record is the accepted Phase 6 record (out-of-repository sha256)', null, sha(supersededFile) === P6_SHA && p6.status === 'ACCEPTED', sha(supersededFile).slice(0, 16));

// ----- S1 the change is exactly the declared one: CPU closure and CUDA unchanged; host group: pool.ts, toolchain.ts -----
{
  const pinOf = (g: { files: { path: string; sha256: string }[] }) => new Map(g.files.map((f) => [f.path, f.sha256]));
  const was = pinOf(p6.compat.host);
  const hostChanged = m.host.files.filter((f) => was.get(f.path) !== f.sha256).map((f) => f.path).sort();

  gate(
    'S1 the evaluation change is exactly the declared one (CPU closure and CUDA sources unchanged; host group: pool.ts and toolchain.ts only)',
    null,
    m.cpu.digest === p6.compat.cpu.digest && m.cuda.digest === p6.compat.cuda.digest && m.host.files.length === p6.compat.host.files.length && JSON.stringify(hostChanged) === JSON.stringify(['src/gpu-backend/pool.ts', 'src/gpu-backend/toolchain.ts']),
    `cpu ${m.cpu.digest === p6.compat.cpu.digest}, cuda ${m.cuda.digest === p6.compat.cuda.digest}, host changed ${hostChanged.join(', ')}`
  );
}

// ----- carried evidence (each with the unchanged-file condition that keeps it valid) -----
{
  const p6pins = new Map([...p6.compat.cpu.files, ...p6.compat.cuda.files, ...p6.compat.host.files, ...p6.policy.files].map((f) => [f.path, f.sha256]));
  const unchanged = (files: string[]) => files.every((f) => fs.existsSync(path.join(repoRoot, f)) && p6pins.get(f) === sha(path.join(repoRoot, f)));
  const codec = ['src/gpu-backend/batch.ts', 'src/gpu-backend/encode.ts', 'src/gpu-backend/client.ts', 'src/gpu-backend/layout.ts', 'src/gpu-backend/hostPipeline.ts', 'src/gpu-backend/hostWorker.ts', 'src/gpu-backend/hostDoor.ts'];
  const sameEngine = engineRuntime().node === p6.runtime?.node && engineRuntime().v8 === p6.runtime?.v8;
  // NOT carried: Phase 5's A10 isolation-under-concurrency run (i6) and every kernel, parity, optimizer, sanitizer and
  // reliability entry — they ran on the earlier pool.ts / binary and are replaced by this study's fresh evidence
  const groups: { re: RegExp; files: string[]; extra: boolean; why: string }[] = [
    { re: /^\[carried from research\/gpu-phase5\] R[123] /, files: codec, extra: sameEngine, why: 'the JavaScript engine (Node v24.21.0 / V8 13.6.233.17) and the codec / host-path files unchanged' },
    { re: /^\[carried from research\/gpu-phase5\] A2 /, files: codec, extra: true, why: 'the codec and host-path files unchanged' },
    { re: /^\[carried from research\/gpu-phase5\] A10 atomic dataset export/, files: ['src/gpu-backend/dataset.ts'], extra: true, why: 'the dataset export unchanged' },
    { re: /^E2 job isolation/, files: ['src/gpu-jobs/jobs.ts', 'src/gpu-jobs/lock.ts', 'src/gpu-jobs/cli.ts'], extra: true, why: 'the job module unchanged' }
  ];
  let n = 0;

  for (const g of groups) {
    const cond = unchanged(g.files) && g.extra;

    for (const e of p6.evidence.filter((x) => g.re.test(x.name))) {
      const f = path.join(repoRoot, e.path);
      const ok = e.pass && cond && fs.existsSync(f) && sha(f) === e.sha256;
      const name = e.name.startsWith('[carried') ? e.name.replace('[carried from research/gpu-phase5]', '[carried from research/gpu-phase5 via gpu-phase6]') : `[carried from research/gpu-phase6] ${e.name}`;

      n++;
      gate(name, f, ok, ok ? '' : `${e.path} changed or missing, or ${g.why} does not hold`);
    }
  }
  gate('S2 the carried set: Phase 5 R1–R3 (5), A2 (1), A10 atomic export (4) and Phase 6 E2 (1) — 11 entries, each with its unchanged-file condition', null, n === 11, `${n} entries`);
}

// ----- A0 the engine runtime of this study's evidence -----
{
  const bad: string[] = [];
  let n = 0;
  const check = (f: string) => {
    const r = read<{ runtime?: { maglev: string } }>(f);

    n++;
    if (r?.runtime?.maglev !== 'disabled') bad.push(path.relative(R(''), f));
  };
  const pdir = R('parity/final');

  for (const x of fs.existsSync(pdir) ? fs.readdirSync(pdir).filter((x) => x.endsWith('.json') && x !== 'SUMMARY.json') : []) check(path.join(pdir, x));
  for (const j of fs.existsSync(R('jobs')) ? fs.readdirSync(R('jobs')).filter((j) => /^(a3|a2|mini)-/.test(j)) : [])
    if (fs.existsSync(R(`jobs/${j}/profile.json`))) check(R(`jobs/${j}/profile.json`));
  for (const f of ['parity/finalists.json', 'policy/negative-final.json', 'qualify/mini-risk.json', 'risk-parity/edge-D21.json', 'risk-parity/edge-D24.json', 'risk-parity/finalists-D24.json', 'risk-parity/random-D19.json']) check(R(f));
  gate(`A0 engine runtime: every parity run, job, the finalists, the risk parity, Q1 and the negative suite ran under ${ENGINE_FLAG}; this generator too`, null, n >= 60 && bad.length === 0 && engineRuntime().maglev === 'disabled', `${n} records; not disabled: ${bad.slice(0, 6).join(', ') || 'none'}`);
}

// ----- B1 the final binary -----
{
  const f = R('final-binary.json');
  const s = read<{ binary: { sha256: string }; compat: { digest: string }; reproducible: boolean; kernels: { fatbinIdenticalToPhase5: boolean; sassIdenticalToPhase5: boolean } }>(f);

  gate(
    'B1 final binary gb7 (reproducible; built from this tree; device code and SASS byte-identical to the accepted gb5)',
    f,
    !!s && s.binary.sha256 === binarySha && s.compat.digest === m.digest && s.reproducible && s.kernels.fatbinIdenticalToPhase5 && s.kernels.sassIdenticalToPhase5,
    s ? `binary ${s.binary.sha256.slice(0, 12)} vs server ${binarySha.slice(0, 12)}, digest ${s.compat.digest.slice(0, 12)} vs ${m.digest.slice(0, 12)}, reproducible ${s.reproducible}` : 'missing'
  );
}

// ----- A1 the parity campaign; A2 the sealed finalists -----
{
  const f = R('parity/final/SUMMARY.json');
  const s = read<{ pass: boolean; build: { binaries: string[] }; totals: { subjects: number; mismatches: number; random?: number; envelopes?: number } }>(f);

  gate(
    'A1 parity campaign through the final host path (every door and option set, ≥ 100,000 seeded random genomes, fixtures, determinism; zero mismatches)',
    f,
    !!s && s.pass && s.build.binaries.length === 1 && s.build.binaries[0] === binarySha && s.totals.mismatches === 0 && s.totals.subjects >= 100_000,
    s ? `subjects ${s.totals.subjects}, mismatches ${s.totals.mismatches}, binaries ${s.build.binaries.map((b) => b.slice(0, 12))}` : 'missing'
  );
  const g = R('parity/finalists.json');
  const t = read<{ pass: boolean; binarySha256: string; runtime?: { maglev: string }; runs: { door: string; tasks: number; identical: number; sealedChecked: number; sealedEqual: number }[] }>(g);

  gate('A2 Assignment 3 sealed finalists on D24: CPU reference (no Maglev) = GPU = sealed C24 figures', g, !!t && t.pass && t.binarySha256 === binarySha && t.runs.length >= 1 && t.runs.every((r) => r.identical === r.tasks && r.sealedChecked > 0 && r.sealedEqual === r.sealedChecked), t ? JSON.stringify(t.runs.map((r) => [r.door, r.identical, r.tasks, r.sealedEqual, r.sealedChecked])) : 'missing');
}

// ----- R1–R3 the risk-envelope delivery parity through the EvalLab (records, envelopes, qualification, rankings) -----
for (const [name, min, edge] of [
  ['edge-D21', 2000, true],
  ['edge-D24', 2000, true],
  ['finalists-D24', 48, false],
  ['random-D19', 1000, false]
] as const) {
  const f = R(`risk-parity/${name}.json`);
  const x = read<{
    pass: boolean;
    build: { binarySha256: string };
    subjects: { total: number };
    r1: { compared: number; differing: number };
    r2: { differing: number; archive: { compared: number; differing: number } };
    r3: { differing: number; rankings: Record<string, { sameQualifiedOrder: boolean; sameConstrainedOrder: boolean }> };
  }>(f);
  const ok =
    !!x &&
    x.pass &&
    x.build.binarySha256 === binarySha &&
    x.subjects.total >= (edge ? min / 2 : min) &&
    x.r1.differing === 0 &&
    x.r2.differing === 0 &&
    x.r2.archive.differing === 0 &&
    (!edge || x.r2.archive.compared >= 1000) &&
    x.r3.differing === 0 &&
    Object.values(x.r3.rankings).every((r) => r.sameQualifiedOrder && r.sameConstrainedOrder);

  gate(
    `R1–R3 risk-delivery parity ${name}: delivered values GPU = CPU, records unchanged by the request${edge ? ' and = Assignment 3’s archived records' : ''}, both policies' decisions and rankings identical`,
    f,
    ok,
    x ? JSON.stringify({ n: x.subjects.total, r1: x.r1.differing, r2: x.r2.differing, archive: x.r2.archive, r3: x.r3.differing }) : 'missing'
  );
}

// ----- A3 sealed optimizer replays (plain, and with the envelope requested: the control-arm invariance) -----
for (const [name, file, strip] of [
  ['A3 Assignment 3 C19 broad1 search replay = sealed record (final binary, host path)', 'compare/a3-plain-vs-sealed.json', false],
  ['A3 Assignment 3 C19 broad1 search replay WITH the risk envelope requested = sealed record (envelopes stripped; every decision identical)', 'compare/a3-risk-vs-sealed.json', true],
  ['A3 Assignment 2 C19 base search replay = sealed record (Growth fixed; final binary, host path)', 'compare/a2-plain-vs-sealed.json', false]
] as const) {
  const f = R(file);
  const s = read<{ identical: boolean; envelopesStripped: number | null; replay: { backend: string } }>(f);

  gate(name, f, !!s && s.identical && s.replay.backend.includes(final16) && (strip ? (s.envelopesStripped ?? 0) > 0 : s.envelopesStripped === null), s ? `identical ${s.identical}, stripped ${s.envelopesStripped}, backend ${s.replay.backend}` : 'missing');
}

// ----- A4 the fixed-seed mini-optimization -----
for (const [name, file, strip] of [
  ['A4 mini-optimization CPU = GPU (final binary, host path)', 'compare/mini-gpu-vs-cpu.json', false],
  ['A4 mini-optimization host workers 1 = 8', 'compare/mini-w1-vs-w8.json', false],
  ['A4 mini-optimization serial path (host workers 0) = 8', 'compare/mini-w0-vs-w8.json', false],
  ['A4 mini-optimization stopped (exit 75) + resumed = uninterrupted', 'compare/mini-stopped-resumed-vs-ref.json', false],
  ['A4 mini-optimization SIGKILLed + resumed = uninterrupted', 'compare/mini-killed-resumed-vs-ref.json', false],
  ['A4 mini-optimization with the risk envelope requested: CPU = GPU (every record and envelope)', 'compare/mini-risk-gpu-vs-cpu.json', false],
  ['A4 mini-optimization with the risk envelope requested = without it (every decision; envelopes stripped)', 'compare/mini-risk-vs-plain.json', true],
  ['A4 two jobs at once on one GPU (plain + risk): the plain job = its isolated reference', 'compare/mini-concurrent-plain-vs-ref.json', false],
  ['A4 two jobs at once on one GPU (plain + risk): the risk job = its isolated reference', 'compare/mini-concurrent-risk-vs-ref.json', false]
] as const) {
  const f = R(file);
  const s = read<{ identical: boolean; envelopesStripped: number | null; a: { backend: string }; b: { backend: string } }>(f);
  const gpuSide = `${s?.a.backend ?? ''} ${s?.b.backend ?? ''}`;

  gate(name, f, !!s && s.identical && gpuSide.includes(final16) && (strip ? (s.envelopesStripped ?? 0) > 0 : s.envelopesStripped === null), s ? `identical ${s.identical}, stripped ${s.envelopesStripped}, backends ${gpuSide}` : 'missing');
}
{
  const f = R('qualify/mini-risk.json');
  const q = read<{ pass: boolean; assessmentsCompared: number; assessmentsDiffering: number; evaluationsWithoutRisk: number }>(f);

  gate('Q1 qualification and ranking parity on the risk mini archives (both policies, every evaluation; CPU = GPU)', f, !!q && q.pass && q.assessmentsCompared >= 20_000 && q.assessmentsDiffering === 0 && q.evaluationsWithoutRisk === 0, q ? JSON.stringify(q) .slice(0, 200) : 'missing');
}

// ----- A5 sanitizer; A6 bounded reliability -----
{
  const f = R('sanitizer-final/sanitizer.json');
  const s = read<{ binarySha256?: string; rows: { tool: string; errors: number | null; subjects: number; identical: number; smoke: boolean }[] }>(f);
  const ok = !!s && s.binarySha256 === binarySha && ['memcheck', 'racecheck', 'initcheck', 'synccheck'].every((t) => s.rows.some((r) => r.tool === t)) && s.rows.every((r) => r.errors === 0 && r.smoke && r.identical === r.subjects);

  gate('A5 compute-sanitizer (memcheck, racecheck, initcheck, synccheck) on the final binary, requests from the host path (risk mode included)', f, ok, s ? JSON.stringify(s.rows.map((r) => [r.tool, r.errors, r.identical, r.subjects])) : 'missing');
}
for (const p of ['p0', 'p1']) {
  const f = R(`sustained/${p}/summary.json`);
  const s = read<{ pass: boolean; finished: string | null; started: string; binary: { sha256: string }; failures: unknown[]; parity: { samples: number; mismatches: number }; repeat: { checks: number; mismatches: number }; cpuScored: number }>(f);
  const minutes = s?.finished ? (Date.parse(s.finished) - Date.parse(s.started)) / 60000 : 0;

  gate(
    `A6 bounded reliability run (${p}, Mode A: two concurrent processes; no failure, CPU parity samples incl. envelopes, repeatability)`,
    f,
    !!s && s.pass && minutes >= 30 && minutes <= 75 && s.binary.sha256 === binarySha && s.failures.length === 0 && s.parity.samples > 0 && s.parity.mismatches === 0 && s.repeat.checks > 0 && s.repeat.mismatches === 0 && s.cpuScored === 0,
    s ? `minutes ${minutes.toFixed(1)}, failures ${s.failures.length}, parity ${s.parity.samples}/${s.parity.mismatches}, repeat ${s.repeat.checks}/${s.repeat.mismatches}` : 'missing'
  );
}

// ----- E3, E4 the negative and tamper suites on the final pinned files -----
const pinnedPaths = [...m.cpu.files, ...m.cuda.files, ...m.host.files, ...policy.files].map((f) => f.path);
const samePins = (commit: string | undefined) => !!commit && spawnSync('git', ['diff', '--quiet', commit, 'HEAD', '--', ...pinnedPaths], { cwd: repoRoot }).status === 0;
{
  const f = R('policy/negative-final.json');
  const s = read<{ pass: boolean; total: number; passed: number; head: string; binaries: { dev: string }; rows: { group: string }[] }>(f);

  gate('E3 negative tests on the final pinned files (final binary; job, runtime and risk-delivery cases included)', f, !!s && s.pass && s.binaries.dev === binarySha && samePins(s.head) && s.rows.filter((r) => r.group === 'job').length >= 10 && s.rows.filter((r) => r.group === 'risk').length >= 6, s ? `${s.passed}/${s.total} at ${s.head.slice(0, 12)}, pins equal ${samePins(s.head)}` : 'missing');
  const g = R('policy/tamper-final.json');
  const t = read<{ pass: boolean; cases: number; passed: number; baselineOk: boolean; head?: string; mainHead?: string; rows: { id: string }[] }>(g);
  const th = t?.head ?? t?.mainHead;

  gate('E4 source-tamper tests in a sandbox clone (T1–T23; out-of-band pin)', g, !!t && t.pass && t.baselineOk && samePins(th) && t.cases >= 23 && ['T21', 'T22', 'T23'].every((id) => t.rows.some((r) => r.id === id)), t ? `${t.passed}/${t.cases} at ${th?.slice(0, 12)}` : 'missing');
}

// ----- E7–E10 suites, Strategy Lab, integrity -----
{
  const p = R('tests/strategy-lab-portfolio-parity.json');
  const x = read<{ pass: boolean; summary: string }>(p);

  gate('E7 Strategy Lab portfolio parity: the five frozen pooled candidates (New L0 among them) = their sealed records (runners under --no-maglev)', p, !!x && x.pass, x ? x.summary : 'missing');
  const f = R('tests/npm-test.json');
  const s = read<{ pass: boolean; summary: string; rootTsc: string }>(f);

  gate('E8 npm test (known failures only; new tests pass)', f, !!s && s.pass, s ? s.summary : 'missing');
  gate('E8 root TypeScript check: 0 errors', f, !!s && s.rootTsc === 'exit 0', s ? s.rootTsc.slice(0, 200) : 'missing');
  const g = R('tests/strategy-lab.json');
  const t = read<{ pass: boolean; summary: string }>(g);

  gate('E9 Strategy Lab (typecheck, lint, Vitest, build, Playwright)', g, !!t && t.pass, t ? t.summary : 'missing');
  const i = R('integrity/integrity.json');
  const n = read<{ pass: boolean; summary: string }>(i);

  gate('E10 historical research files, study preflights, sealed-file modes, the B4/B5 freeze status and the CPU/CUDA groups unchanged', i, !!n && n.pass, n ? n.summary : 'missing');
}

// ----- P1 policy text; P5 the policy, enforcement, layout, host-pipeline, dataset, jobs and risk-envelope tests -----
{
  const reg = read<{ current: string; versions: { version: string; sha256: string }[] }>(path.join(repoRoot, 'docs/research/optimization-standard.versions.json'))!;
  const std = sha(path.join(repoRoot, 'docs/research/OPTIMIZATION_STANDARD.md'));
  const claude = fs.readFileSync(path.join(repoRoot, 'CLAUDE.md'), 'utf8');

  gate('P1 policy text (CLAUDE.md, standard 3.0.0 registered and unchanged)', null, reg.current === '3.0.0' && reg.versions.some((v) => v.version === '3.0.0' && v.sha256 === std) && claude.includes('GPU-only official optimization and CPU/GPU parity (MANDATORY'), `registry current ${reg.current}`);
  const r = spawnSync(
    process.execPath,
    [
      ENGINE_FLAG,
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      '--test',
      '--test-reporter=tap',
      'src/gpu-backend/tests/policy.test.ts',
      'src/gpu-backend/tests/layout.test.ts',
      'src/gpu-backend/tests/hostPipeline.test.ts',
      'src/gpu-backend/tests/enforcement.test.ts',
      'src/gpu-backend/tests/dataset.test.ts',
      'src/gpu-jobs/tests/jobs.test.ts',
      'src/risk-envelope/tests/policy.test.ts',
      'src/risk-envelope/tests/labRisk.test.ts',
      'src/risk-envelope/tests/diagnostics.test.ts'
    ],
    { cwd: repoRoot, encoding: 'utf8', timeout: 900_000 }
  );
  // the tests that check the record in force against the tree can only pass once this record exists (rerun after it)
  const failing = r.stdout.split('\n').filter((l) => /^not ok/.test(l));
  const expectedStale = failing.every((l) => /MERGE GATE|re-verifies independently/.test(l));
  const f = R('policy/policy-tests.txt');

  if (!dry) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, `${r.stdout}\n${r.stderr}`);
  }
  gate('P5 policy, enforcement, layout, host-pipeline, dataset, jobs and risk-envelope tests (before the record: only the record-in-force tests may fail)', dry ? null : f, /# pass [1-9]/.test(r.stdout) && expectedStale && failing.length <= 2, failing.join(' | ') || 'all pass');
}

const draft = { compat: { cpu: m.cpu, cuda: m.cuda, host: m.host }, policy } as unknown as AcceptanceRecord;
const dirty = uncommittedPinnedFiles(draft);

if (dirty.length) blockers.push(`pinned files are not committed unmodified: ${dirty.slice(0, 8).join('; ')}`);

const uuid = smiUuid();
const grid = incumbents().NL0.quad.d1.VGT;
const domain = riskEnvelopePilotDomain(grid);
const a3 = assignment3Domain(grid);

if ((domain.features & ~SUPPORTED) !== 0n || (a3.features & ~SUPPORTED) !== 0n)
  blockers.push(`domain features outside the supported set: ${featureNames((domain.features | a3.features) & ~SUPPORTED).join(', ')}`);
if (uuid !== p6.device.uuid) blockers.push(`device ${uuid} ≠ the accepted ${p6.device.uuid}`);

const stdReg = read<{ versions: { version: string; sha256: string }[] }>(path.join(repoRoot, 'docs/research/optimization-standard.versions.json'))!;
const git = (...a: string[]) => spawnSync('git', a, { cwd: repoRoot, encoding: 'utf8' }).stdout.trim();
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
  source: { commit: headCommit(), tree: git('rev-parse', 'HEAD^{tree}'), branch: git('rev-parse', '--abbrev-ref', 'HEAD') },
  hostPath: { defaultWorkers: DEFAULT_HOST_WORKERS, modes: ['serial (hostWorkers 0)', 'parallel (worker threads)'] },
  binary: { path: path.relative(repoRoot, serverBinary), sha256: binarySha },
  device: p6.device,
  capabilities: SUPPORTED.toString(16),
  domain: {
    name: 'Assignment 3 genome ∪ risk-envelope pilot domain (NL0 controls grid); the risk-envelope inputs delivered to the search through EvalLab items with risk: true (GPU Phase 7)',
    features: (domain.features | a3.features).toString(16)
  },
  runtime: {
    ...engineRuntime(),
    requiredOptions: [ENGINE_FLAG],
    enforcedBy:
      'src/gpu-backend/runtime.ts (official gate, official runner; from GPU Phase 6 also the legacy runner gate with the child-process guard, Strategy Lab server and runners, every npm script)'
  },
  evidence,
  blockers,
  supersedes: { study: p6.study, acceptedAt: p6.acceptedAt, sha256: sha(supersededFile) }
} as AcceptanceRecord;

console.log(`${record.status}${blockers.length ? `: ${blockers.length} blocker(s)` : ''}`);
if (!dry) {
  if (blockers.length) {
    // never replace the record in force with a NOT_ACCEPTED one: the failed draft is kept in this study only
    fs.writeFileSync(R('acceptance-not-accepted.json'), `${JSON.stringify(record, null, 1)}\n`);
    console.log(`blockers: ${blockers.join(' | ')}`);
  } else {
    fs.writeFileSync(acceptanceFile, `${JSON.stringify(record, null, 1)}\n`);
    const c = checkAcceptance({ binary: serverBinary, uuid });

    console.log(`written ${path.relative(repoRoot, acceptanceFile)}; static check: ${c.status} ${c.reasons.join('; ')}`);
  }
}
process.exitCode = blockers.length ? 2 : 0;

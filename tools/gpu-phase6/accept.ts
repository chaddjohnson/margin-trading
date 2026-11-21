// gpu-phase6: the ACCEPTANCE GENERATOR for an ENFORCEMENT-ONLY change (PROTOCOL.md §6; docs/gpu/PARITY_CHECKLIST.md §2a;
// standard 3.0.0 §9.9; adapted from tools/gpu-phase5/accept.ts). It checks gate E1 — no evaluation file and not the
// binary changed since the Phase 5 acceptance — and then CARRIES the Phase 5 record's evaluation evidence (kernel,
// parity campaign, sanitizer, sealed replays, reliability, atomic export: R1–R3, A1–A5, A7, A9, A10), every file re-hashed
// against its Phase 5 pin, while every enforcement gate is FRESH (E0, E2–E10, P1, P5: the engine runtime, the job
// isolation campaign, the negative and tamper suites on the final pinned files, confirmation parity and sealed
// reproduction, the suites, integrity). It writes config/gpu-backend/acceptance.json in schema 2 — ACCEPTED only if every
// gate passed — pinning the evaluation manifest (unchanged), the enforcement group INCLUDING the job module
// (acceptance.ts ENFORCEMENT_EXTRAS) and this generator, the source revision (HEAD; every pinned file committed and
// unmodified), the binary, the device, the domain and every evidence file, and names the superseded Phase 5 record.
//   node --no-maglev --experimental-transform-types tools/gpu-phase6/accept.ts [--dry-run]
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
const study = 'research/gpu-phase6';
const generator = 'tools/gpu-phase6/accept.ts';
const R = (p: string) => path.join(repoRoot, study, 'results', p);
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read = <T>(f: string): T | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null);
const binarySha = fs.existsSync(serverBinary) ? sha(serverBinary) : 'missing';
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
const policy = policySources([...ENFORCEMENT_EXTRAS, generator]);

// the superseded record (Phase 5's, in force on main; a copy kept in this study before it is replaced)
const supersededFile = R('superseded/acceptance-gpu-phase5.json');

if (!fs.existsSync(supersededFile)) {
  const cur = read<AcceptanceRecord>(acceptanceFile);

  if (cur?.study !== 'research/gpu-phase5') throw new Error(`the record in force is not Phase 5's (${cur?.study})`);
  fs.mkdirSync(path.dirname(supersededFile), { recursive: true });
  fs.copyFileSync(acceptanceFile, supersededFile);
}
const p5 = read<AcceptanceRecord>(supersededFile)!;
const P5_SHA = '49e95d7a78fe5823273e9df3d2edc37500a58bad37bf0867b7c4a19f718666b4';

gate('E1 the superseded record is the accepted Phase 5 record (out-of-repository sha256)', null, sha(supersededFile) === P5_SHA && p5.status === 'ACCEPTED', sha(supersededFile).slice(0, 16));

// E1 nothing of the evaluation changed: the digest compiled into the binary, every group, the binary itself
gate(
  'E1 evaluation unchanged since the Phase 5 acceptance (evaluation digest, CPU closure, CUDA, host path, binary)',
  null,
  m.digest === p5.compat.digest &&
    m.cpu.digest === p5.compat.cpu.digest &&
    m.cuda.digest === p5.compat.cuda.digest &&
    m.host.digest === p5.compat.host.digest &&
    binarySha === p5.binary.sha256 &&
    m.digest === '3a6eacdecc4f0a24fbf008c0ef852644969e72dc8ea0af95bd5dc373ebb6033d',
  `digest ${m.digest.slice(0, 16)} vs ${p5.compat.digest.slice(0, 16)}, binary ${binarySha.slice(0, 16)} vs ${p5.binary.sha256.slice(0, 16)}`
);
// the carried evaluation evidence of Phase 5 (valid while every evaluation file and the binary are unchanged, §2a)
const carried = p5.evidence.filter((e) => /^(R[123]|A[123457]|A9|A10) /.test(e.name));

for (const e of carried) {
  const f = path.join(repoRoot, e.path);
  const ok = e.pass && fs.existsSync(f) && sha(f) === e.sha256;

  gate(`[carried from research/gpu-phase5] ${e.name}`, f, ok, ok ? '' : `${e.path} changed or missing`);
}
gate('E1 the carried set: every Phase 5 evaluation-evidence entry (R1–R3, A1–A5, A7, A9, A10)', null, carried.length === 28 && p5.evidence.length - carried.length === 6, `${carried.length} of ${p5.evidence.length} entries`);

// E0 the engine runtime of this study's evidence
{
  const bad: string[] = [];
  let n = 0;
  const jobs = fs.existsSync(R('jobs')) ? fs.readdirSync(R('jobs')).filter((j) => j.startsWith('c')) : [];

  for (const j of jobs) {
    const p = read<{ runtime?: { maglev: string } }>(R(`jobs/${j}/profile.json`));

    n++;
    if (p?.runtime?.maglev !== 'disabled') bad.push(`jobs/${j}`);
  }
  for (const f of ['parity/D24-core.json', 'parity/D19-fund.json', 'parity/S3-all.json', 'parity/finalists.json', 'policy/negative-final.json']) {
    const r = read<{ runtime?: { maglev: string } }>(R(f));

    n++;
    if (r?.runtime?.maglev !== 'disabled') bad.push(f);
  }
  gate(`E0 engine runtime: every job, parity run, the finalists and the negative suite ran under ${ENGINE_FLAG}; this generator too`, null, n >= 14 && bad.length === 0 && engineRuntime().maglev === 'disabled', `${n} records; not disabled: ${bad.join(', ') || 'none'}`);
}
// E2 the job isolation campaign
{
  const f = R('campaign/summary.json');
  const s = read<{ pass: boolean; checks: number; passed: number }>(f);

  gate('E2 job isolation under concurrency: identities, ownership, namespaces, ledgers, datasets, refusals, kill/stop + resume, process audit', f, !!s && s.pass && s.checks >= 100 && s.passed === s.checks, s ? `${s.passed}/${s.checks}` : 'missing');
}
// E3, E4 the negative and tamper suites on the accepted pinned files (a commit whose pinned files equal HEAD's)
const pinnedPaths = [...m.cpu.files, ...m.cuda.files, ...m.host.files, ...policy.files].map((f) => f.path);
const samePins = (commit: string | undefined) =>
  !!commit && spawnSync('git', ['diff', '--quiet', commit, 'HEAD', '--', ...pinnedPaths], { cwd: repoRoot }).status === 0;
{
  const f = R('policy/negative-final.json');
  const s = read<{ pass: boolean; total: number; passed: number; head: string; binaries: { dev: string }; rows: { group: string }[] }>(f);

  gate('E3 negative tests on the final pinned files (accepted binary; job and runtime cases included)', f, !!s && s.pass && s.binaries.dev === binarySha && samePins(s.head) && s.rows.filter((r) => r.group === 'job').length >= 10, s ? `${s.passed}/${s.total} at ${s.head.slice(0, 12)}, pins equal ${samePins(s.head)}` : 'missing');
  const g = R('policy/tamper-final.json');
  const t = read<{ pass: boolean; cases: number; passed: number; baselineOk: boolean; head?: string; mainHead?: string; rows: { id: string }[] }>(g);
  const th = t?.head ?? t?.mainHead;

  gate('E4 source-tamper tests in a sandbox clone (T1–T20; out-of-band pin)', g, !!t && t.pass && t.baselineOk && samePins(th) && t.cases >= 20 && ['T16', 'T17', 'T18', 'T19', 'T20'].every((id) => t.rows.some((r) => r.id === id)), t ? `${t.passed}/${t.cases} at ${th?.slice(0, 12)}` : 'missing');
}
// E5 confirmation parity through the host path
for (const name of ['D24-core', 'D19-fund', 'S3-all']) {
  const f = R(`parity/${name}.json`);
  const x = read<{ result: { pass: boolean; identical: number; mismatches: number }; subjects: { total: number }; build: { binarySha256: string }; runtime?: { maglev: string } }>(f);

  gate(`E5 confirmation parity ${name} (zero mismatches, accepted binary, host path)`, f, !!x && x.result.pass && x.result.mismatches === 0 && x.result.identical === x.subjects.total && x.subjects.total > 0 && x.build.binarySha256 === binarySha, x ? `${x.result.identical}/${x.subjects.total}, mismatches ${x.result.mismatches}` : 'missing');
}
// E6 optimizer identity (sealed replays, CPU = GPU, resumed and concurrent = isolated)
for (const name of ['c3-a3-vs-sealed', 'c4-a3-vs-sealed', 'c4-a2-vs-sealed', 'c4-a3-vs-c3-a3', 'mini-gpu-vs-cpu', 'mini-killed-resumed-vs-ref', 'mini-stopped-resumed-vs-ref', 'mini-shared-a-vs-ref', 'mini-shared-b-vs-ref']) {
  const f = R(`compare/${name}.json`);
  const x = read<{ identical: boolean }>(f);

  gate(`E6 optimizer identity: ${name}`, f, !!x && x.identical === true, x ? `identical ${x.identical}` : 'missing');
}
// E7 sealed CPU results under --no-maglev
{
  const f = R('parity/finalists.json');
  const t = read<{ pass: boolean; binarySha256: string; runtime?: { maglev: string }; runs: { door: string; tasks: number; identical: number; sealedChecked: number; sealedEqual: number }[] }>(f);

  gate('E7 Assignment 3 sealed finalists on D24: CPU reference (no Maglev) = GPU = sealed C24 figures', f, !!t && t.pass && t.binarySha256 === binarySha && t.runtime?.maglev === 'disabled' && t.runs.length >= 1 && t.runs.every((r) => r.identical === r.tasks && r.sealedChecked > 0 && r.sealedEqual === r.sealedChecked), t ? JSON.stringify(t.runs.map((r) => [r.door, r.identical, r.tasks, r.sealedEqual, r.sealedChecked])) : 'missing');
  const g = R('tests/strategy-lab-portfolio-parity.json');
  const p = read<{ pass: boolean; summary: string }>(g);

  gate("E7 Strategy Lab portfolio parity: the five frozen pooled candidates = their sealed records (runners under --no-maglev)", g, !!p && p.pass, p ? p.summary : 'missing');
}
// E8, E9 suites
{
  const f = R('tests/npm-test.json');
  const s = read<{ pass: boolean; summary: string; rootTsc: string }>(f);

  gate('E8 npm test (known failures only; new tests pass)', f, !!s && s.pass, s ? s.summary : 'missing');
  gate('E8 root TypeScript check: 0 errors', f, !!s && s.rootTsc === 'exit 0', s ? s.rootTsc.slice(0, 200) : 'missing');
  const g = R('tests/strategy-lab.json');
  const t = read<{ pass: boolean; summary: string }>(g);

  gate('E9 Strategy Lab (typecheck, lint, Vitest, build, Playwright)', g, !!t && t.pass, t ? t.summary : 'missing');
}
// E10 integrity of historical research files
{
  const f = R('integrity/integrity.json');
  const s = read<{ pass: boolean; summary: string }>(f);

  gate('E10 historical research files, study preflights, sealed-file modes and the B4/B5 freeze status unchanged', f, !!s && s.pass, s ? s.summary : 'missing');
}
// P1 policy text; P5 the policy, enforcement, layout, host-pipeline, dataset and jobs tests
{
  const reg = read<{ current: string; versions: { version: string; sha256: string }[] }>(path.join(repoRoot, 'docs/research/optimization-standard.versions.json'))!;
  const std = sha(path.join(repoRoot, 'docs/research/OPTIMIZATION_STANDARD.md'));
  const claude = fs.readFileSync(path.join(repoRoot, 'CLAUDE.md'), 'utf8');

  gate('P1 policy text (CLAUDE.md, standard 3.0.0 registered)', null, reg.current === '3.0.0' && reg.versions.some((v) => v.version === '3.0.0' && v.sha256 === std) && claude.includes('GPU-only official optimization and CPU/GPU parity (MANDATORY'), `registry current ${reg.current}`);
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
      'src/gpu-jobs/tests/jobs.test.ts'
    ],
    { cwd: repoRoot, encoding: 'utf8', timeout: 900_000 }
  );
  // the two tests that check the record in force against the tree (the merge gate, the independent verifier) can only
  // pass once this record exists: they are rerun after it is written (below) and in the post-merge verification
  const failing = r.stdout.split('\n').filter((l) => /^not ok/.test(l));
  const expectedStale = failing.every((l) => /MERGE GATE|re-verifies independently/.test(l));
  const f = R('policy/policy-tests.txt');

  if (!dry) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, `${r.stdout}\n${r.stderr}`);
  }
  gate('P5 policy, enforcement, layout, host-pipeline, dataset and jobs tests (before the record: only the two record-in-force tests may fail)', dry ? null : f, /# pass [1-9]/.test(r.stdout) && expectedStale && failing.length <= 2, failing.join(' | ') || 'all pass');
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
if (uuid !== p5.device.uuid) blockers.push(`device ${uuid} ≠ the accepted ${p5.device.uuid}`);

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
  device: p5.device,
  capabilities: SUPPORTED.toString(16),
  domain: {
    name: 'Assignment 3 genome ∪ risk-envelope pilot domain (NL0 controls grid)',
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
  supersedes: { study: p5.study, acceptedAt: p5.acceptedAt, sha256: sha(supersededFile) }
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

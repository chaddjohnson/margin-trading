// gpu-phase2: the ACCEPTANCE TOOL (PROTOCOL.md §10; standard 3.0.0 §9.9). It reads the gate evidence of an acceptance
// study, checks every gate of the protocol's verdict (T0, P1-P4, G1-G9) against the FINAL binary and the working
// tree, and writes config/gpu-backend/acceptance.json — status ACCEPTED only if every gate passed, otherwise
// NOT_ACCEPTED with the blockers (official optimization stays blocked either way until ACCEPTED). It never edits
// evidence. The record pins the compatibility manifest, the binary sha256, the device and every evidence file's sha256.
//   node --experimental-transform-types tools/gpu-phase2/accept.ts [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { compatManifest } from '../../src/gpu-backend/compat.ts';
import { acceptanceFile, checkAcceptance, type AcceptanceRecord } from '../../src/gpu-backend/acceptance.ts';
import { riskEnvelopePilotDomain, assignment3Domain } from '../../src/gpu-backend/domain.ts';
import { SUPPORTED, featureNames } from '../../src/gpu-backend/layout.ts';
import { incumbents } from '../../src/vg-l0-full-joint/nl0.ts';
import { repoRoot, serverBinary } from '../../src/gpu-backend/toolchain.ts';
import { smiUuid } from '../../src/gpu-backend/official.ts';

const dry = process.argv.includes('--dry-run');
const study = 'research/gpu-phase2';
const R = (p: string) => path.join(repoRoot, study, 'results', p);
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read = <T>(f: string): T | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null);
const finalRec = read<{ binary: { sha256: string }; compat: { digest: string } }>(R('final-binary.json'));
const binarySha = fs.existsSync(serverBinary) ? sha(serverBinary) : 'missing';
const evidence: AcceptanceRecord['evidence'] = [];
const blockers: string[] = [];
const gate = (name: string, file: string | null, pass: boolean, why: string) => {
  if (file && fs.existsSync(file)) evidence.push({ name, path: path.relative(repoRoot, file), sha256: sha(file), pass });
  if (!pass) blockers.push(`${name}: ${why}`);
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ` — ${why}`}`);
};

// identity: the frozen final binary is the server binary and matches the working tree
if (!finalRec) blockers.push('no sealed final-binary record');
const m = compatManifest();

gate('final binary', R('final-binary.json'), !!finalRec && finalRec.binary.sha256 === binarySha && finalRec.compat.digest === m.digest, `server ${binarySha.slice(0, 12)}, final ${finalRec?.binary.sha256.slice(0, 12)}, tree digest ${m.digest.slice(0, 12)} vs ${finalRec?.compat.digest.slice(0, 12)}`);

// T0 sanitizer on the final binary
{
  const f = R('sanitizer-final/sanitizer.json');
  const s = read<{ binarySha256?: string; rows: { tool: string; errors: number | null; subjects: number; identical: number; smoke: boolean }[] }>(f);
  const ok = !!s && s.binarySha256 === binarySha && ['memcheck', 'racecheck', 'initcheck', 'synccheck'].every((t) => s.rows.some((r) => r.tool === t)) && s.rows.every((r) => r.errors === 0 && r.smoke && r.identical === r.subjects);

  gate('T0 compute-sanitizer (memcheck, racecheck, initcheck, synccheck) on the final binary', f, ok, s ? `rows ${JSON.stringify(s.rows.map((r) => [r.tool, r.errors, r.identical, r.subjects]))} binary ${s.binarySha256?.slice(0, 12)}` : 'missing');
}
// P1 policy text: CLAUDE.md section, standard 3.0.0 registered and current
{
  const reg = read<{ current: string; versions: { version: string; sha256: string }[] }>(path.join(repoRoot, 'docs/research/optimization-standard.versions.json'))!;
  const std = sha(path.join(repoRoot, 'docs/research/OPTIMIZATION_STANDARD.md'));
  const claude = fs.readFileSync(path.join(repoRoot, 'CLAUDE.md'), 'utf8');
  const ok = reg.current === '3.0.0' && reg.versions.some((v) => v.version === '3.0.0' && v.sha256 === std) && claude.includes('GPU-only official optimization and CPU/GPU parity (MANDATORY');

  gate('P1 policy text (CLAUDE.md, standard 3.0.0 registered)', null, ok, `registry current ${reg.current}`);
}
// P2 + P4 + the merge gate: the policy tests
{
  const r = spawnSync(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--test', 'src/gpu-backend/tests/policy.test.ts', 'src/gpu-backend/tests/layout.test.ts'], { cwd: repoRoot, encoding: 'utf8', timeout: 600_000 });
  const f = R('policy/policy-tests.txt');

  if (!dry) fs.writeFileSync(f, `${r.stdout}\n${r.stderr}`);
  const pass = /# fail 0/.test(r.stdout) && /# pass [1-9]/.test(r.stdout);

  gate('P2/P4 policy and merge-gate tests', dry ? null : f, pass, r.stdout.split('\n').filter((l) => /^# (pass|fail)/.test(l)).join(' '));
}
// P3 negative tests on the final binary
{
  const f = R('policy/negative-final.json');
  const s = read<{ pass: boolean; total: number; passed: number; binaries: { dev: string } }>(f);

  gate('P3 negative tests (final binary)', f, !!s && s.pass && s.binaries.dev === binarySha, s ? `${s.passed}/${s.total}, dev binary ${s.binaries.dev.slice(0, 12)}` : 'missing');
}
// G1-G6 parity campaign
{
  const f = R('parity/final/SUMMARY.json');
  const s = read<{ pass: boolean; checks: Record<string, boolean>; build: { binaries: string[] }; totals: { subjects: number; mismatches: number } }>(f);
  const ok = !!s && s.pass && s.build.binaries.length === 1 && s.build.binaries[0] === binarySha;

  gate('G1-G6 parity campaign (zero mismatches, coverage, determinism)', f, ok, s ? `${JSON.stringify(s.checks)} subjects ${s.totals.subjects} mismatches ${s.totals.mismatches} binaries ${s.build.binaries.map((b) => b.slice(0, 12))}` : 'missing');
}
// G7 fixed-seed mini-optimization on the final binary (CPU = GPU, GPU = interrupted + resumed)
{
  const a = R('optimizer/compare-g7f-cpu-vs-gpu.json');
  const b = R('optimizer/compare-g7f-gpu-vs-resumed.json');
  const A = read<{ identical: boolean; b: { backend: string } }>(a);
  const B = read<{ identical: boolean; b: { backend: string } }>(b);
  const final16 = binarySha.slice(0, 16);

  gate('G7 mini-optimization CPU = GPU (final binary)', a, !!A && A.identical && A.b.backend.includes(final16), A ? `identical ${A.identical} backend ${A.b.backend}` : 'missing');
  gate('G7 mini-optimization GPU = interrupted + resumed GPU (final binary)', b, !!B && B.identical && B.b.backend.includes(final16), B ? `identical ${B.identical} backend ${B.b.backend}` : 'missing');
}
// G8 24 h stress
{
  const f = R('stress/summary.json');
  const s = read<{ pass: boolean; finished: string | null; started: string; elapsedHours: number; binary: { sha256: string }; failures: unknown[]; parity: { samples: number; mismatches: number }; repeat: { mismatches: number; checks: number }; cpuScored: number }>(f);
  const ok = !!s && s.pass && !!s.finished && s.elapsedHours >= 24 && s.binary.sha256 === binarySha && s.failures.length === 0 && s.parity.samples > 0 && s.parity.mismatches === 0 && s.repeat.checks > 0 && s.cpuScored === 0;

  gate('G8 ≥ 24 h stress (parity samples, repeatability, no error)', f, ok, s ? `hours ${s.elapsedHours} finished ${s.finished} failures ${s.failures.length} parity ${s.parity.samples}/${s.parity.mismatches} repeat ${s.repeat.checks}/${s.repeat.mismatches}` : 'missing');
}
// G9 repository suite and Strategy Lab
{
  const f = R('tests/npm-test.json');
  const s = read<{ pass: boolean; summary: string }>(f);

  gate('G9 npm test (= baseline + new tests; known failures only)', f, !!s && s.pass, s ? s.summary : 'missing');
  const g = R('tests/strategy-lab.json');
  const t = read<{ pass: boolean; summary: string }>(g);

  gate('G9 Strategy Lab regression (CPU engine, suites, state untouched)', g, !!t && t.pass, t ? t.summary : 'missing');
}

const uuid = smiUuid();
const domain = riskEnvelopePilotDomain(incumbents().NL0.quad.d1.VGT);
const a3 = assignment3Domain(incumbents().NL0.quad.d1.VGT);

if ((domain.features & ~SUPPORTED) !== 0n || (a3.features & ~SUPPORTED) !== 0n) blockers.push(`domain features outside the supported set: ${featureNames((domain.features | a3.features) & ~SUPPORTED).join(', ')}`);

const smi = spawnSync('nvidia-smi', ['--query-gpu=name,driver_version,compute_cap', '--format=csv,noheader'], { encoding: 'utf8' }).stdout.trim().split(', ');
const stdReg = read<{ versions: { version: string; sha256: string }[] }>(path.join(repoRoot, 'docs/research/optimization-standard.versions.json'))!;
const record: AcceptanceRecord = {
  kind: 'gpu-backend acceptance',
  schema: 1,
  status: blockers.length ? 'NOT_ACCEPTED' : 'ACCEPTED',
  study,
  acceptedAt: new Date().toISOString(),
  standard: { version: '3.0.0', sha256: stdReg.versions.find((v) => v.version === '3.0.0')?.sha256 ?? 'unregistered' },
  compat: { digest: m.digest, cpu: m.cpu, cuda: m.cuda, host: m.host, nvcc: m.nvcc, nvccFlags: m.nvccFlags, protocolVersion: m.protocolVersion, datasetVersion: m.datasetVersion },
  binary: { path: path.relative(repoRoot, serverBinary), sha256: binarySha },
  device: { uuid, name: smi[0] ?? '?', driver: smi[1] ?? '?', cc: smi[2] ?? '?' },
  capabilities: SUPPORTED.toString(16),
  domain: { name: 'Assignment 3 genome ∪ risk-envelope pilot domain (NL0 controls grid)', features: (domain.features | a3.features).toString(16) },
  evidence,
  blockers
};

console.log(`${record.status}${blockers.length ? `: ${blockers.length} blocker(s)` : ''}`);
if (!dry) {
  fs.mkdirSync(path.dirname(acceptanceFile), { recursive: true });
  fs.writeFileSync(acceptanceFile, `${JSON.stringify(record, null, 1)}\n`);
  const c = checkAcceptance({ binary: serverBinary, uuid });

  console.log(`written ${path.relative(repoRoot, acceptanceFile)}; static check: ${c.status} ${c.reasons.join('; ')}`);
}
process.exitCode = blockers.length ? 2 : 0;

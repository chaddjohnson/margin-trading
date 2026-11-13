// Writes results/protocol-freeze.json once (PROTOCOL.md §14): the protocol, brief and adoption hashes, HEAD, the door
// pins and the audited authority files. Run from the repository root before any replay; then commit it.
import { execSync } from 'node:child_process';
import path from 'node:path';
import { checkAdoption } from '../../src/research-standard/preflight.ts';
import { STUDY, rel, repoRoot, resultsDir, sealJson, sha256File, studyDir } from './common.ts';

const pre = checkAdoption(path.join('research', STUDY), { repoRoot });

if (!pre.ok) throw new Error(`preflight failed: ${pre.errors.join('; ')}`);

const files = (list: string[]) => Object.fromEntries(list.map((f) => [f, sha256File(path.join(repoRoot, f))]));
const head = execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim();
const dirty = execSync('git status --porcelain', { cwd: repoRoot }).toString().trim();
const doors = Object.fromEntries(
  ['D19', 'D21', 'D23', 'D24'].map((d) => [
    d,
    Object.fromEntries(['GDX', 'VGT'].map((s) => [s, sha256File(path.join(repoRoot, '.cache/vg-d1-growth-joint/doors', `${s}-${d}.csv`))]))
  ])
);

sealJson(
  path.join(resultsDir, 'protocol-freeze.json'),
  {
    stage: 'protocol freeze',
    study: `research/${STUDY}`,
    frozenAt: new Date().toISOString(),
    head,
    workingTree: dirty ? dirty.split('\n') : [],
    preflight: { ok: pre.ok, notices: pre.notices },
    own: files([
      rel(path.join(studyDir, 'PROTOCOL.md')),
      rel(path.join(studyDir, 'STANDARD_ADOPTION.json')),
      rel(path.join(studyDir, 'brief', 'BRIEF.md')),
      'docs/research/OPTIMIZATION_STANDARD.md',
      'docs/research/methods/NEW_L0_METHOD.md'
    ]),
    doors,
    audited: files([
      'research/vg-lifecycle-matched-optimization/PROTOCOL.md',
      'research/vg-lifecycle-matched-optimization/AMENDMENTS.md',
      'research/vg-lifecycle-matched-optimization/results/folds/sequential.json',
      'research/vg-l0-session-hold/PROTOCOL.md',
      'research/vg-l0-session-hold/AMENDMENTS.md',
      'research/vg-l0-session-hold/results/folds/sequential.json',
      'research/vg-l0-shadow-eligibility/PROTOCOL.md',
      'research/vg-l0-shadow-eligibility/AMENDMENTS.md',
      'research/vg-l0-shadow-eligibility/results/folds/sequential.json'
    ]),
    sessionHoldCommit: execSync('git rev-parse refs/heads/research/vg-l0-session-hold', { cwd: repoRoot }).toString().trim(),
    fullDoor: 'never opened (PROTOCOL.md AD2)'
  },
  'protocol freeze'
);
console.log(`frozen at ${head}`);

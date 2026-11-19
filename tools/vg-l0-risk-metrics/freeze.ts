// Freeze the protocol (PROTOCOL.md §11): sha256 of the protocol, amendments, brief, adoption manifest, the audited
// studies' pinned records, the standard and NL0, and the code digest at the freeze. Sealed once.
import path from 'node:path';
import { execSync } from 'node:child_process';
import { requireStandardAdoption } from '../../src/research-standard/preflight.ts';
import { repoRoot, researchDir } from '../../src/vg-l0-risk-metrics/context.ts';
import { rel, sealJson, sha256File } from '../../src/vg-l0-risk-metrics/records.ts';
import { codeDigest, freezeFile } from './common.ts';

requireStandardAdoption(researchDir, { repoRoot });

const pin = (f: string) => ({ file: f, sha256: sha256File(path.join(repoRoot, f)) });
const record = {
  kind: 'vg-l0-risk-metrics protocol freeze',
  frozenAt: new Date().toISOString(),
  head: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
  protocol: pin('research/vg-l0-risk-metrics/PROTOCOL.md'),
  amendments: pin('research/vg-l0-risk-metrics/AMENDMENTS.md'),
  brief: pin('research/vg-l0-risk-metrics/brief/BRIEF.md'),
  adoption: pin('research/vg-l0-risk-metrics/STANDARD_ADOPTION.json'),
  standard: pin('docs/research/OPTIMIZATION_STANDARD.md'),
  nl0: pin('docs/research/methods/NEW_L0_METHOD.md'),
  audited: [
    'research/vg-l0-full-joint/FROZEN_SELECTION.json',
    'research/vg-l0-full-joint/PROTOCOL.md',
    'research/vg-l0-full-joint/results/validation/validation.json',
    'research/vg-l0-full-joint/results/folds/sequential.json',
    'research/vg-l0-full-joint/results/folds/C19/selection.json',
    'research/vg-l0-full-joint/results/folds/C21/selection.json',
    'research/vg-l0-full-joint/results/folds/C23/selection.json',
    'research/vg-l0-full-joint/results/folds/C24/selection.json',
    'research/vg-l0-risk-families/FROZEN_SELECTION.json',
    'research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json',
    'research/vg-lifecycle-matched-optimization/results/validation/validation.json',
    'research/vg-d1-growth-joint/FROZEN_SELECTION.json',
    'data/VGT/data.csv',
    'data/GDX/data.csv',
    'data/VOOG/data.csv'
  ].map(pin),
  code: { ...codeDigest(), note: 'implementation continues after the freeze; every sealed record carries the code digest that produced it' }
};

console.log(rel(freezeFile), sealJson(freezeFile, record, 'protocol freeze'));

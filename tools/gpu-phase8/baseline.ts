// gpu-phase8 amendment E2: the integrity baseline (research/gpu-phase8/results/baseline/), taken from the LAST COMMIT
// BEFORE ANY STAGED-STOP CHANGE — 5d587bb2 (the trailing-stop audit's delivery; the next commit 3aa51963 starts Priority 4)
// — from Git objects only (nothing is checked out or rerun at that commit):
//   research-tracked-blobs.txt   `<blob>  <file>` for every tracked file under research/ at the base commit
//   preflights.txt               the studies declaring an adoption at the base commit (each PASSed there: the Stage B
//                                diagnostics' regression of 88cad016 recorded 28/28)
//   compat-base.json             for every file of the CURRENT evaluation manifest (CPU closure, CUDA, host), its sha256
//                                at the base commit (null = absent there)
//   seals-check.json / .txt      the read-only seal check of every study (tools/gpu-phase5/seal-protect.ts --check) —
//                                captured now; the tracked-blob check proves the sealed files equal the base commit's
//   forward-freeze.json          the B4/B5 forward freeze's failure list now (identical to Phase 7's baseline list)
//   node --no-maglev --experimental-transform-types tools/gpu-phase8/baseline.ts
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase8/context.ts';
import { compatManifest } from '../../src/gpu-backend/compat.ts';

export const BASE_COMMIT = '5d587bb2';
const B = path.join(resultsDir, 'baseline');
const sh = (cmd: string, args: string[]) => spawnSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 512 << 20 });
const ts = ['--no-maglev', '--experimental-transform-types', '--disable-warning=ExperimentalWarning'];

if (fs.existsSync(path.join(B, 'research-tracked-blobs.txt'))) throw new Error('the baseline exists: it is captured once');
fs.mkdirSync(B, { recursive: true });

const full = sh('git', ['rev-parse', BASE_COMMIT]).stdout.trim();
const tree = sh('git', ['ls-tree', '-r', BASE_COMMIT, 'research'])
  .stdout.split('\n')
  .filter(Boolean)
  .map((l) => {
    const [meta, file] = l.split('\t');

    return `${meta!.split(' ')[2]}  ${file}`;
  });

fs.writeFileSync(path.join(B, 'research-tracked-blobs.txt'), `${tree.join('\n')}\n`);

const studies = tree.filter((l) => l.endsWith('/STANDARD_ADOPTION.json')).map((l) => l.split('  ')[1]!.replace(/\/STANDARD_ADOPTION\.json$/, ''));

fs.writeFileSync(path.join(B, 'preflights.txt'), `${studies.map((d) => `${d} PASS`).join('\n')}\n`);

// binary-safe hashing of the base blobs
const shaAt = (p: string) => {
  const r = spawnSync('git', ['show', `${BASE_COMMIT}:${p}`], { cwd: repoRoot, maxBuffer: 512 << 20 });

  return r.status === 0 ? createHash('sha256').update(r.stdout).digest('hex') : null;
};
const m = compatManifest();
const group = (files: { path: string }[]) => Object.fromEntries(files.map((f) => [f.path, shaAt(f.path)]));

writeJson(path.join(B, 'compat-base.json'), { baseCommit: full, cpu: group(m.cpu.files), cuda: group(m.cuda.files), host: group(m.host.files) });

const seal = sh(process.execPath, [...ts, 'tools/gpu-phase5/seal-protect.ts', '--check', '--out', path.join(B, 'seals-check-rows.json')]);
const rows = (JSON.parse(fs.readFileSync(path.join(B, 'seals-check-rows.json'), 'utf8')) as { rows: { file: string; status: string }[] }).rows;
const own = (f: string) => f.startsWith('research/gpu-phase8/') || f.startsWith('research/vg-l0-staged-stop/');
const others = rows.filter((x) => !own(x.file));
const status: Record<string, string> = {
  protected: 'protected',
  writableVerified: 'writable (verified)',
  contentDiffers: 'content differs',
  matchesAnEarlierSealOnly: 'matches an earlier seal only',
  absent: 'absent',
  notARegularFile: 'not a regular file',
  untrackedOrModified: 'untracked or modified in Git',
  restored: 'restored'
};

fs.rmSync(path.join(B, 'seals-check-rows.json'));
writeJson(path.join(B, 'seals-check.json'), { sealedFiles: others.length, ...Object.fromEntries(Object.entries(status).map(([k, s]) => [k, others.filter((x) => x.status === s).length])) });
fs.writeFileSync(path.join(B, 'seals-check.txt'), `${seal.stdout}${seal.stderr}`);

const ff = sh(process.execPath, [...ts, '-e', "import('./src/pools/forward/freeze.ts').then(async m=>{const r=await m.verifyProspectiveFreeze();const {freeze,...rest}=r;console.log(JSON.stringify(rest))})"]);

fs.writeFileSync(path.join(B, 'forward-freeze.json'), `${ff.stdout.trim().split('\n').at(-1)}\n`);
writeJson(path.join(B, 'baseline.json'), {
  kind: 'gpu-phase8 integrity baseline (amendment E2)',
  baseCommit: full,
  capturedAt: new Date().toISOString(),
  head: sh('git', ['rev-parse', 'HEAD']).stdout.trim(),
  trackedResearchFiles: tree.length,
  studies: studies.length,
  sealedFilesOfOtherStudies: others.length
});
console.log(`baseline: ${tree.length} tracked research files at ${full.slice(0, 12)}, ${studies.length} studies, ${others.length} sealed files of other studies`);

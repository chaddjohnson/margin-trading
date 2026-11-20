// gpu-phase5 (copy of tools/gpu-phase3/merge-audit.ts, this study's namespace) Stage 7: the audit of what integrating a branch into `main` brings, written to
// research/gpu-phase5/results/integration/merge-audit.json (read-only git; nothing is changed):
//   - the refs, the merge base, ahead/behind, and whether `main` is an ancestor (a merge then yields exactly the branch tree);
//   - the diff from `main`: added/modified/deleted counts by area, the files `main` already had, the largest files, the
//     total added bytes, archives and binaries, and a credential-pattern scan of every added text file;
//   - the GPU program's own footprint since the commit before GPU Phase 1 (its first commit's parent): every changed path
//     outside the GPU directories, so that "no strategy, fitness or selection change" is checked, not asserted — in
//     particular the canonical CPU evaluation closure (the compatibility manifest's CPU group) and apps/ must be unchanged.
//   node --experimental-transform-types tools/gpu-phase5/merge-audit.ts <branch> [--out <json>]
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { cpuMirrored } from '../../src/gpu-backend/compat.ts';
import { repoRoot, writeJson } from '../../src/gpu-phase5/context.ts';

const branch = process.argv[2] ?? 'research/gpu-phase5';
const out = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]!
  : path.join(repoRoot, 'research/gpu-phase5/results/integration/merge-audit.json');
const git = (...a: string[]) => execFileSync('git', a, { cwd: repoRoot, maxBuffer: 1 << 30 }).toString();
const lines = (s: string) => s.split('\n').filter(Boolean);
const main = git('rev-parse', 'main').trim();
const tip = git('rev-parse', branch).trim();
const base = git('merge-base', 'main', branch).trim();
const [behind, ahead] = git('rev-list', '--left-right', '--count', `main...${branch}`).trim().split(/\s+/).map(Number);
const status = lines(git('diff', '--name-status', 'main', branch, '--')).map((l) => l.split('\t') as [string, string]);
const area = (f: string) => {
  const p = f.split('/');

  return ['research', 'src', 'tools'].includes(p[0]!) ? `${p[0]}/${p[1]}` : p[0]!;
};
const byArea: Record<string, number> = {};

for (const [, f] of status) byArea[area(f)] = (byArea[area(f)] ?? 0) + 1;
const size = (f: string) => Number(git('cat-file', '-s', `${branch}:${f}`).trim());
const added = status.filter(([s]) => s === 'A').map(([, f]) => f);
const sizes = added.map((f) => ({ path: f, bytes: size(f) })).sort((a, b) => b.bytes - a.bytes);
const archives = added.filter((f) => /\.(zip|gz|tar|bin|so|exe|sqlite|db|gb2ds|whl)$/i.test(f));
const secretPattern =
  'BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{32,}|xox[bap]-[A-Za-z0-9-]{20,}';
let secretHits: string[] = [];

try {
  secretHits = lines(git('grep', '-I', '-l', '-E', secretPattern, branch, '--'));
} catch {
  secretHits = []; // git grep exits 1 when nothing matches
}
// the GPU program's footprint: since the parent of GPU Phase 1's first commit
const phase1First = lines(git('log', '--reverse', '--format=%H', `main..${branch}`, '--', 'src/gpu-phase1'))[0]!;
const programBase = git('rev-parse', `${phase1First}^`).trim();
const changedSinceBase = lines(git('diff', '--name-only', programBase, branch, '--'));
const gpuPath = /^(src\/gpu-|tools\/gpu-|research\/gpu-|config\/gpu-backend\/|docs\/gpu\/)/;
const outsideGpu = changedSinceBase.filter((f) => !gpuPath.test(f));
const cpuClosure = cpuMirrored().files.map((f) => f.path);
const cpuClosureChanged = cpuClosure.filter((f) => changedSinceBase.includes(f));
const appsChanged = changedSinceBase.filter((f) => f.startsWith('apps/'));
const srcOutsideGpu = outsideGpu.filter((f) => f.startsWith('src/'));
const rec = {
  kind: 'gpu-phase5 merge audit (read-only)',
  t: new Date().toISOString(),
  refs: { main, branch, tip, mergeBase: base, mainIsAncestor: base === main, behind, ahead },
  diffFromMain: {
    files: status.length,
    byStatus: Object.fromEntries(['A', 'M', 'D', 'R'].map((s) => [s, status.filter(([x]) => x.startsWith(s)).length])),
    modifiedOnMain: status.filter(([s]) => s === 'M').map(([, f]) => f),
    deletedFromMain: status.filter(([s]) => s === 'D').map(([, f]) => f),
    byArea: Object.fromEntries(Object.entries(byArea).sort((a, b) => b[1] - a[1])),
    addedBytes: sizes.reduce((a, x) => a + x.bytes, 0),
    largest: sizes.slice(0, 12),
    filesOver50MB: sizes.filter((x) => x.bytes > 50 * 2 ** 20).map((x) => x.path),
    archivesAndBinaries: {
      count: archives.length,
      kinds: [...new Set(archives.map((f) => f.split('.').pop()))],
      examples: archives.slice(0, 10)
    },
    credentialScan: { pattern: secretPattern, hits: secretHits }
  },
  gpuProgramFootprint: {
    programBase,
    phase1FirstCommit: phase1First,
    changedPaths: changedSinceBase.length,
    outsideGpuDirectories: outsideGpu,
    srcOutsideGpu,
    canonicalCpuClosure: { files: cpuClosure.length, changed: cpuClosureChanged },
    appsChanged
  },
  checks: {
    mainIsAncestor: base === main,
    noFileOver50MB: sizes.every((x) => x.bytes <= 50 * 2 ** 20),
    noCredentialPattern: secretHits.length === 0,
    canonicalCpuClosureUnchangedByGpuProgram: cpuClosureChanged.length === 0,
    appsUnchangedByGpuProgram: appsChanged.length === 0
  }
};

writeJson(out, rec);
console.log(
  JSON.stringify({
    refs: rec.refs,
    files: rec.diffFromMain.files,
    byStatus: rec.diffFromMain.byStatus,
    addedMiB: Math.round(rec.diffFromMain.addedBytes / 2 ** 20),
    outsideGpu: outsideGpu.length,
    srcOutsideGpu,
    checks: rec.checks
  })
);

// gpu-phase5 (PROTOCOL.md §9): the read-only protection of sealed research files. Git does not track the read-only
// bit, so a branch switch that recreates a file leaves it writable (mode 664) while its content is unchanged. This tool
// inventories the sealed files from the studies' OWN manifests — every `research/<study>/results/seals.jsonl` (one JSON
// object per line: `file`, `sha256`) and Priority 3's pin list (src/vg-d1-growth-diagnostic/context.ts `p3.records`, the
// records its guards require to be read-only) — verifies each file's content against its recorded sha256 and, with
// --apply, restores mode 0444 on exactly those files that (1) exist, (2) are regular files (never through a link),
// (3) equal their LATEST recorded sha256 and (4) are tracked by Git and unmodified. Nothing else is touched: no
// directory, no unlisted file, no file whose content does not verify (those are listed for review), never a content
// change.
//   node --experimental-transform-types tools/gpu-phase5/seal-protect.ts --check [--out <json>]     (exit 1 if a verified sealed file is writable)
//   node --experimental-transform-types tools/gpu-phase5/seal-protect.ts --apply --out <json>
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { p3 } from '../../src/vg-d1-growth-diagnostic/context.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const apply = args.includes('--apply');
const out = opt('out', '');
const repoRoot = path.resolve(import.meta.dirname, '../..');
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const git = (a: string[]) => execFileSync('git', a, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 256 << 20 });

// ----- the manifests -----
interface Entry {
  file: string; // repository-relative
  sha256: string;
  manifest: string;
  line: number;
  earlier: string[]; // earlier recorded hashes of the same file (a re-seal)
}

const entries = new Map<string, Entry>();
const manifests: { manifest: string; lines: number; unreadable: number }[] = [];
const researchDir = path.join(repoRoot, 'research');

for (const study of fs.readdirSync(researchDir).sort()) {
  const m = path.join(researchDir, study, 'results', 'seals.jsonl');

  if (!fs.existsSync(m)) continue;
  const rel = path.relative(repoRoot, m);
  let unreadable = 0;
  const lines = fs.readFileSync(m, 'utf8').split('\n').filter(Boolean);

  lines.forEach((l, i) => {
    try {
      const x = JSON.parse(l) as { file?: string; sha256?: string };

      if (typeof x.file !== 'string' || typeof x.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(x.sha256)) {
        unreadable++;
        return;
      }
      const file = path.normalize(x.file);

      if (path.isAbsolute(file) || file.startsWith('..')) {
        unreadable++;
        return;
      }
      const prev = entries.get(file);

      entries.set(file, { file, sha256: x.sha256, manifest: rel, line: i + 1, earlier: prev ? [...prev.earlier, prev.sha256].filter((h) => h !== x.sha256) : [] });
    } catch {
      unreadable++;
    }
  });
  manifests.push({ manifest: rel, lines: lines.length, unreadable });
}
// Priority 3's pinned records (its guards refuse them while writable)
const p3Pins = (p3 as unknown as { records?: Record<string, string> }).records ?? {};
let p3Count = 0;

for (const [rel, hash] of Object.entries(p3Pins)) {
  const file = path.normalize(path.join('research/vg-d1-growth-joint', rel));

  p3Count++;
  if (!entries.has(file)) entries.set(file, { file, sha256: hash, manifest: 'src/vg-d1-growth-diagnostic/context.ts p3.records', line: 0, earlier: [] });
  else if (entries.get(file)!.sha256 !== hash) entries.get(file)!.earlier.push(`p3 pin ${hash}`);
}

// ----- Git state (tracked and unmodified) -----
const tracked = new Set(git(['ls-files', '-z', '--', 'research']).split('\0').filter(Boolean));
const modified = new Set(
  git(['status', '--porcelain', '-z', '--', 'research'])
    .split('\0')
    .filter(Boolean)
    .map((l) => l.slice(3))
);

// ----- classify -----
type Status = 'protected' | 'restored' | 'writable (verified)' | 'content differs' | 'matches an earlier seal only' | 'absent' | 'not a regular file' | 'untracked or modified in Git';
const rows: { file: string; manifest: string; status: Status; mode: string | null; recorded: string; actual: string | null }[] = [];

for (const e of [...entries.values()].sort((a, b) => a.file.localeCompare(b.file))) {
  const full = path.join(repoRoot, e.file);
  let st: fs.Stats;

  try {
    st = fs.lstatSync(full);
  } catch {
    rows.push({ file: e.file, manifest: e.manifest, status: 'absent', mode: null, recorded: e.sha256, actual: null });
    continue;
  }
  const mode = (st.mode & 0o777).toString(8).padStart(3, '0');

  if (!st.isFile()) {
    rows.push({ file: e.file, manifest: e.manifest, status: 'not a regular file', mode, recorded: e.sha256, actual: null });
    continue;
  }
  const actual = sha(full);

  if (actual !== e.sha256) {
    rows.push({ file: e.file, manifest: e.manifest, status: e.earlier.includes(actual) ? 'matches an earlier seal only' : 'content differs', mode, recorded: e.sha256, actual });
    continue;
  }
  if (!tracked.has(e.file) || modified.has(e.file)) {
    rows.push({ file: e.file, manifest: e.manifest, status: 'untracked or modified in Git', mode, recorded: e.sha256, actual });
    continue;
  }
  if ((st.mode & 0o222) === 0) {
    rows.push({ file: e.file, manifest: e.manifest, status: 'protected', mode, recorded: e.sha256, actual });
    continue;
  }
  if (apply) {
    fs.chmodSync(full, 0o444);
    rows.push({ file: e.file, manifest: e.manifest, status: sha(full) === e.sha256 && (fs.statSync(full).mode & 0o777) === 0o444 ? 'restored' : 'content differs', mode: '444', recorded: e.sha256, actual });
  } else rows.push({ file: e.file, manifest: e.manifest, status: 'writable (verified)', mode, recorded: e.sha256, actual });
}

const count = (s: Status) => rows.filter((r) => r.status === s).length;
const byStudy: Record<string, Record<string, number>> = {};

for (const r of rows) {
  const study = r.file.split('/').slice(0, 2).join('/');

  (byStudy[study] ??= {})[r.status] = ((byStudy[study] ??= {})[r.status] ?? 0) + 1;
}

const rec = {
  kind: 'gpu-phase5 sealed-file protection',
  t: new Date().toISOString(),
  mode: apply ? 'apply' : 'check',
  head: git(['rev-parse', 'HEAD']).trim(),
  branch: git(['branch', '--show-current']).trim(),
  manifests: manifests.length,
  manifestLines: manifests.reduce((a, m) => a + m.lines, 0),
  unreadableManifestLines: manifests.reduce((a, m) => a + m.unreadable, 0),
  priority3Pins: p3Count,
  sealedFiles: rows.length,
  protected: count('protected'),
  restored: count('restored'),
  writableVerified: count('writable (verified)'),
  contentDiffers: count('content differs'),
  matchesAnEarlierSealOnly: count('matches an earlier seal only'),
  absent: count('absent'),
  notARegularFile: count('not a regular file'),
  untrackedOrModified: count('untracked or modified in Git'),
  byStudy,
  manifestsRead: manifests,
  needingReview: rows.filter((r) => r.status === 'content differs' || r.status === 'matches an earlier seal only' || r.status === 'not a regular file' || r.status === 'untracked or modified in Git'),
  rows: rows.map((r) => ({ file: r.file, status: r.status, mode: r.mode }))
};

if (out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(rec, null, 1)}\n`);
}
console.log(JSON.stringify({ ...rec, byStudy: undefined, manifestsRead: undefined, rows: undefined, needingReview: rec.needingReview.slice(0, 12) }));
process.exitCode = !apply && rec.writableVerified > 0 ? 1 : 0;

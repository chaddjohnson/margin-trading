// The archive manifest of Priority 4A: the study jobs' SQLite archives (every evaluation, regenerable by rerunning the
// job's command) stay outside git in .cache/gdx-growth-standalone/jobs/; this records each file's size, sha256 and
// recovery path in results/archive-manifest.json. Pilot and bench jobs (`pilot-…`) are excluded. Run after the last job.
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/gdx-growth-standalone/archive-manifest.ts
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const jobs = path.join(repoRoot, '.cache', 'gdx-growth-standalone', 'jobs');
const out = path.join(repoRoot, 'research', 'gdx-growth-standalone', 'results', 'archive-manifest.json');
const sha256 = (file: string) => {
  const h = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.allocUnsafe(1 << 24);

  try {
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);

      if (n === 0) break;
      h.update(buf.subarray(0, n));
    }
  } finally {
    fs.closeSync(fd);
  }
  return h.digest('hex');
};

const rows = fs
  .readdirSync(jobs)
  .filter((j) => !j.startsWith('pilot-'))
  .sort()
  .flatMap((j) => {
    const f = path.join(jobs, j, 'archive.sqlite');

    if (!fs.existsSync(f)) return [];
    return [
      {
        job: j,
        file: path.relative(repoRoot, f),
        bytes: fs.statSync(f).size,
        sha256: sha256(f),
        recovery: `rerun the job's command (RUN_COMMANDS.md): every evaluation is a deterministic function of the frozen code, the door and the configuration`
      }
    ];
  });

fs.writeFileSync(
  out,
  `${JSON.stringify({ kind: 'gdx-growth-standalone archive manifest', written: new Date().toISOString(), note: 'git-ignored, regenerable job archives (SQLite, WAL checkpointed at job end)', archives: rows }, null, 1)}\n`
);
console.log(`${rows.length} archives, ${(rows.reduce((a, r) => a + r.bytes, 0) / 2 ** 30).toFixed(2)} GiB → ${path.relative(repoRoot, out)}`);

// RES-BD 1.0.0 — archive copies and identity checks (PROTOCOL.md §2). Every action is logged in
// research/vg-l0-risk-envelope-stage-b-diagnostics/results/verification/archive-actions.jsonl.
//   copy --job <C2x-search|C2x-qualify>   a verified copy in .cache/…/jobs/<job>/ (original = baseline, copy = original,
//                                         PRAGMA integrity_check = ok)
//   remove --job <job>                    deletes ONLY the scratch copy's directory .cache/…/jobs/<job>/ (after
//                                         re-verifying the original against its baseline); never a Stage B file
//   verify-all                            re-hashes all 12 Stage B job archives against the committed baseline and writes
//                                         results/verification/archives-after.sha256
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/…/archive.ts copy --job C21-search
import fs from 'node:fs';
import path from 'node:path';
import { archiveCopy, archiveOriginal, baselineFile, baselineOf, cacheRoot, makeCopy, purposeOf, repoRoot, resultsDir, sha256Stream, stageBJobs, utc } from './common.ts';

purposeOf(['diagnostic']);

const [cmd, ...rest] = process.argv.slice(2);
const job = rest[rest.indexOf('--job') + 1];
const log = path.join(resultsDir, 'verification', 'archive-actions.jsonl');
const record = (x: Record<string, unknown>) => {
  fs.mkdirSync(path.dirname(log), { recursive: true });
  fs.appendFileSync(log, `${JSON.stringify({ t: utc(), ...x })}\n`);
  console.log(JSON.stringify(x));
};
const jobOk = (j: string | undefined): j is string => typeof j === 'string' && /^C(19|21|24)-(search|qualify)$/.test(j);

if (cmd === 'copy') {
  if (!jobOk(job)) throw new Error('copy --job C19|C21|C24-search|qualify');

  const free = fs.statfsSync(cacheRoot.split('/.cache')[0]!);
  const need = fs.statSync(archiveOriginal(job)).size;
  const avail = free.bavail * free.bsize;

  if (avail < need * 3) throw new Error(`${job}: ${avail} bytes free < 3 × ${need}`);

  const t0 = Date.now();
  const c = await makeCopy(job);

  record({ action: 'copy', ...c, freeBytesBefore: avail, seconds: Math.round((Date.now() - t0) / 1000) });
} else if (cmd === 'remove') {
  if (!jobOk(job)) throw new Error('remove --job C19|C21|C24-search|qualify');

  const dir = path.dirname(archiveCopy(job));

  if (!path.resolve(dir).startsWith(path.resolve(cacheRoot) + path.sep)) throw new Error(`${dir} is outside the scratch root`);
  if (!fs.existsSync(dir)) throw new Error(`${dir}: no copy`);

  const before = await sha256Stream(archiveOriginal(job));

  if (before !== baselineOf(job)) throw new Error(`${job}: the original differs from its baseline; nothing removed`);

  const files = fs.readdirSync(dir).map((f) => ({ file: path.relative(repoRoot, path.join(dir, f)), bytes: fs.statSync(path.join(dir, f)).size }));

  fs.rmSync(dir, { recursive: true });
  record({ action: 'remove scratch copy', job, removed: files, originalSha256: before, originalUnchanged: true });
} else if (cmd === 'verify-all') {
  const base = fs
    .readFileSync(baselineFile, 'utf8')
    .trim()
    .split('\n')
    .map((l) => l.split('  ') as [string, string]);
  const out: string[] = [];
  const changed: string[] = [];

  for (const [sha, rel] of base) {
    const now = await sha256Stream(path.join(stageBJobs, rel));

    out.push(`${now}  ${rel}`);
    if (now !== sha) changed.push(rel);
  }
  fs.writeFileSync(path.join(resultsDir, 'verification', 'archives-after.sha256'), `${out.join('\n')}\n`);
  record({ action: 'verify-all', archives: base.length, unchanged: base.length - changed.length, changed });
  if (changed.length) throw new Error(`changed archives: ${changed.join(', ')}`);
} else throw new Error('usage: archive.ts copy|remove --job <job> | verify-all');

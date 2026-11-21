// gpu-phase4 (PROTOCOL.md §9): correctness of a poolbench group (NON-OFFICIAL; zero tolerance). Every job passed its own
// checks (repeatability across rounds, the canonical CPU sample, CPU-scored 0), every job's hash map (task → canonical
// record hash) is identical to every other job's, and — with --against <group> (the solo reference, or another batch
// size) — identical to that group's. Exit 0 identical, 2 otherwise.
//   node --experimental-transform-types tools/gpu-phase4/verify-pool.ts --group <G> [--against <G0>]
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, writeJson } from '../../src/gpu-phase4/context.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const G = opt('group', '');
const against = opt('against', '');
const groupOf = (g: string) =>
  JSON.parse(fs.readFileSync(path.join(resultsDir, 'bench', g, 'group.json'), 'utf8')) as {
    runs: string[];
    exitStatus: (number | null)[];
  };
const profileOf = (run: string) => {
  const f = path.join(resultsDir, 'pool', run, 'profile.json');

  return fs.existsSync(f)
    ? (JSON.parse(fs.readFileSync(f, 'utf8')) as {
        pass: boolean;
        hashDigest: string;
        repeat: { mismatches: number };
        parity: { samples: number; mismatches: number; cpuErrors: number };
        cpuScored: number;
        tasks: number;
      })
    : null;
};
const g = groupOf(G);
const jobs = g.runs.map((run, i) => {
  const p = profileOf(run);

  return {
    run,
    status: g.exitStatus[i],
    present: p !== null,
    pass: p?.pass ?? false,
    digest: p?.hashDigest ?? null,
    tasks: p?.tasks ?? 0,
    repeatMismatches: p?.repeat.mismatches ?? null,
    parity: p?.parity ?? null,
    cpuScored: p?.cpuScored ?? null
  };
});
const digests = new Set(jobs.map((j) => j.digest));
let reference: string | null = null;

if (against) {
  const r = groupOf(against);

  reference = profileOf(r.runs[0]!)?.hashDigest ?? 'missing';
}

const rec = {
  kind: 'gpu-phase4 poolbench group verification',
  t: new Date().toISOString(),
  group: G,
  against: against || null,
  referenceDigest: reference,
  jobs,
  allJobsIdentical: digests.size === 1 && !digests.has(null),
  identicalToReference: reference === null ? null : digests.size === 1 && digests.has(reference),
  identical:
    jobs.every((j) => j.status === 0 && j.pass) &&
    digests.size === 1 &&
    !digests.has(null) &&
    (reference === null || digests.has(reference))
};

writeJson(path.join(resultsDir, 'bench', G, 'verify.json'), rec);
console.log(JSON.stringify({ group: G, identical: rec.identical, digests: [...digests], reference }));
process.exitCode = rec.identical ? 0 : 2;

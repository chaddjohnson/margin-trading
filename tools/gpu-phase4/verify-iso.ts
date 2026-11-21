// gpu-phase4 isolation tests I3–I5 (PROTOCOL.md §9.3): one poolbench job is made to fail (its GPU server killed, a
// host-worker fault, a VRAM refusal) while a NEIGHBOUR job runs the same workload at the same time. Pass iff the failing
// job failed closed — exit 3, its failure recorded, CPU-scored 0, the failed round's results not all released — and the
// neighbour passed every own check (repeatability, canonical CPU samples, CPU-scored 0) with a hash map identical to the
// solo reference run's.
//   node --experimental-transform-types tools/gpu-phase4/verify-iso.ts --test <id> --failing <run> --neighbour <run>
//     --reference <run> --status <failing exit>,<neighbour exit> --expect "<substring of the failure>" --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, writeJson } from '../../src/gpu-phase4/context.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const prof = (run: string) => {
  const f = path.join(resultsDir, 'pool', run, 'profile.json');

  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as Record<string, unknown>) : null;
};
const [sf, sn] = opt('status', ',')
  .split(',')
  .map((x) => (x === '' ? null : Number(x)));
const failing = prof(opt('failing', ''));
const neighbour = prof(opt('neighbour', ''));
const reference = prof(opt('reference', ''));
const expect = opt('expect', '');
const f = (failing?.failure ?? null) as { round: number; error: string; released: number; cpuScored: number } | null;
const tasks = Number(failing?.tasks ?? 0);
const checks = {
  failingExit3: sf === 3,
  failingRecorded: f !== null && failing?.pass === false,
  failingReason: f !== null && f.error.includes(expect),
  failingCpuScored0: f !== null && f.cpuScored === 0,
  failedRoundNotAllReleased: f !== null && f.released < tasks,
  neighbourExit0: sn === 0,
  neighbourPassed: neighbour?.pass === true,
  neighbourIdenticalToReference:
    neighbour !== null && reference !== null && neighbour.hashDigest === reference.hashDigest && reference.pass === true
};
const rec = {
  kind: 'gpu-phase4 isolation test (failure under concurrency)',
  t: new Date().toISOString(),
  test: opt('test', ''),
  failing: { run: opt('failing', ''), status: sf, failure: f },
  neighbour: {
    run: opt('neighbour', ''),
    status: sn,
    digest: neighbour?.hashDigest ?? null,
    parity: neighbour?.parity ?? null,
    repeat: neighbour?.repeat ?? null
  },
  reference: { run: opt('reference', ''), digest: reference?.hashDigest ?? null },
  checks,
  pass: Object.values(checks).every(Boolean)
};

writeJson(opt('out', ''), rec);
console.log(JSON.stringify({ test: rec.test, pass: rec.pass, checks, error: f?.error }));
process.exitCode = rec.pass ? 0 : 2;

// gpu-phase7: the pilot-shaped throughput benchmark's summary (chains/bench.sh; NON-OFFICIAL, purpose benchmark, after the
// record). For each 8-lane risk job: its profile (wall time, fresh evaluations, rate, batches, RSS) and a per-lane identity
// check against the same lanes of the sealed Assignment 3 job (envelopes stripped; the job-level cap and extension-round
// barrier positions necessarily differ for a slice of 8 of 64 lanes and are not compared). Writes
// research/gpu-phase7/results/bench/benchmark.json. Timings select nothing.
//   node --no-maglev --experimental-transform-types tools/gpu-phase7/bench-summary.ts
import fs from 'node:fs';
import path from 'node:path';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase7/context.ts';

const strip = (x: unknown): unknown =>
  Array.isArray(x)
    ? x.map(strip)
    : x && typeof x === 'object'
      ? Object.fromEntries(
          Object.entries(x)
            .filter(([k]) => k !== 'envelope')
            .map(([k, v]) => [k, strip(v)])
        )
      : x;
const keyOf = (l: Record<string, unknown>) => String(l.key ?? l.lane);
const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>;
const jobs = [
  ['bench-C21-risk-l8', 'C21', 'alone'],
  ['bench-C24-risk-l8', 'C24', 'alone'],
  ['bench-C21-risk-l8-conc', 'C21', 'concurrent with C24'],
  ['bench-C24-risk-l8-conc', 'C24', 'concurrent with C21']
] as const;
const rows = jobs.map(([job, cut, mode]) => {
  const p = readJson(path.join(resultsDir, 'jobs', job, 'profile.json')) as Record<string, unknown> & {
    batches: Record<string, number>;
  };
  const res = strip(readJson(path.join(resultsDir, 'jobs', job, 'result.json'))) as {
    lanes: Record<string, unknown>[];
  };
  const sealed = readJson(path.join(repoRoot, 'research/vg-l0-full-joint/results/search', cut, 'broad1.json')) as {
    lanes: Record<string, unknown>[];
  };
  const byKey = new Map(sealed.lanes.map((l) => [keyOf(l), l]));
  const lanes = res.lanes.map((l) => {
    const s = byKey.get(keyOf(l));

    return { lane: keyOf(l), identicalToSealed: !!s && deepDiff(s, l, '$', [], 20).length === 0 };
  });

  return {
    job,
    cutoff: cut,
    mode,
    lanes: lanes.length,
    fresh: p.fresh,
    archiveHits: p.archiveHits,
    wallSeconds: p.wallSeconds,
    evaluationsPerSecond: p.evaluationsPerSecond,
    hostWorkers: p.hostWorkers,
    batchSize: p.batchSize,
    batches: {
      n: p.batches.n,
      median: p.batches.median,
      under1024: p.batches.under1024,
      serverSeconds: p.batches.serverSeconds
    },
    peakRssMiB: p.peakRssMiB,
    lanesIdenticalToSealed: lanes.every((x) => x.identicalToSealed),
    laneChecks: lanes
  };
});
const conc = rows.filter((r) => r.mode !== 'alone');
const rec = {
  kind: 'gpu-phase7 pilot-shaped throughput benchmark (non-official)',
  t: new Date().toISOString(),
  shape:
    '8 lanes (lanes 0/8 of Assignment 3 broad1), every evaluation with the risk envelope requested, batch 8,192, 8 host workers, final binary gb7',
  rows,
  concurrentPairWallSeconds: Math.max(...conc.map((r) => r.wallSeconds as number)),
  concurrentPairFresh: conc.reduce((a, r) => a + (r.fresh as number), 0),
  aloneVsConcurrentIdentity:
    'results/bench/compare-C21-alone-vs-concurrent.json, compare-C24-alone-vs-concurrent.json (arms mode)'
};

fs.mkdirSync(path.join(resultsDir, 'bench'), { recursive: true });
writeJson(path.join(resultsDir, 'bench', 'benchmark.json'), rec);
for (const r of rows)
  console.log(
    `${r.job}: ${r.fresh} fresh in ${r.wallSeconds} s (${r.evaluationsPerSecond}/s), median batch ${r.batches.median}, lanes = sealed ${r.lanesIdenticalToSealed}`
  );

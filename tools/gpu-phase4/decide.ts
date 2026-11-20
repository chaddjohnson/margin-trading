// gpu-phase4 (PROTOCOL.md §8): the frozen decision rules, applied mechanically to measured group summaries.
//   R2  per k, the allocation (host workers per job) with the highest steady-state aggregate window rate (mean of its
//       runs); within 2 % of it, the allocation with fewer total host workers.
//   R3  Mode A: k* = the smallest k whose best aggregate rate is within 5 % of the maximum over k, provided it exceeds the
//       k = 1 rate by ≥ 10 % in every run of that configuration; otherwise one job at a time.
// Input: the groups of one design (SS on one workload, batch); groups are identified by their summary's config.
//   node --experimental-transform-types tools/gpu-phase4/decide.ts --groups g1,g2,… --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, writeJson } from '../../src/gpu-phase4/context.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const groups = opt('groups', '').split(',').filter(Boolean);
const out = opt('out', '');
const rows = groups.map((g) => {
  const s = JSON.parse(fs.readFileSync(path.join(resultsDir, 'bench', g, 'summary.json'), 'utf8')) as {
    config: { jobs: number; hostWorkersPerJob: number; batch: number };
    window: { aggregateEvPerS: number } | null;
  };

  if (!s.window) throw new Error(`group ${g} has no steady-state window`);
  return { g, k: s.config.jobs, w: s.config.hostWorkersPerJob, b: s.config.batch, rate: s.window.aggregateEvPerS };
});
const byK = new Map<number, Map<number, number[]>>();

for (const r of rows) {
  const m = byK.get(r.k) ?? new Map<number, number[]>();

  m.set(r.w, [...(m.get(r.w) ?? []), r.rate]);
  byK.set(r.k, m);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const perK = [...byK.entries()]
  .sort((a, b) => a[0] - b[0])
  .map(([k, m]) => {
    const alloc = [...m.entries()].map(([w, rs]) => ({ w, totalWorkers: w * k, runs: rs, mean: mean(rs) }));
    const top = Math.max(...alloc.map((a) => a.mean));
    const best = alloc
      .filter((a) => a.mean >= top * 0.98)
      .sort((a, b) => a.totalWorkers - b.totalWorkers || b.mean - a.mean)[0]!;

    return { k, allocations: alloc, best: { w: best.w, mean: best.mean, runs: best.runs } };
  });
const k1 = perK.find((p) => p.k === 1);
let modeA: Record<string, unknown> = { decided: false, reason: 'no k = 1 reference among the groups' };

if (k1) {
  const ref = k1.best.mean;
  const maxRate = Math.max(...perK.map((p) => p.best.mean));
  const candidates = perK.filter((p) => p.best.mean >= maxRate * 0.95).sort((a, b) => a.k - b.k);
  const kStar = candidates[0]!;
  const everyRunAbove = kStar.best.runs.every((r) => r >= ref * 1.1);

  modeA =
    kStar.k > 1 && everyRunAbove
      ? {
          decided: true,
          k: kStar.k,
          hostWorkersPerJob: kStar.best.w,
          aggregate: kStar.best.mean,
          speedupVsK1: kStar.best.mean / ref,
          maxOverK: maxRate,
          rule: 'R3: smallest k within 5 % of the maximum, ≥ 10 % above k = 1 in every run'
        }
      : {
          decided: true,
          k: 1,
          reason:
            kStar.k === 1
              ? 'k = 1 is within 5 % of the maximum'
              : `k = ${kStar.k} is within 5 % of the maximum but not ≥ 10 % above k = 1 in every run`,
          rule: 'R3 → one job at a time'
        };
}

const rec = { kind: 'gpu-phase4 decision (R2, R3)', t: new Date().toISOString(), groups: rows, perK, modeA };

if (out) writeJson(out, rec);
console.log(
  JSON.stringify({
    perK: perK.map((p) => ({ k: p.k, best: p.best, all: p.allocations.map((a) => [a.w, Math.round(a.mean)]) })),
    modeA
  })
);

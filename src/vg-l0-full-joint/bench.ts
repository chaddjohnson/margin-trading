// The pilot's throughput bench (PROTOCOL.md §14; standard §6.3): a representative rung-1 mix — quasi-random full joint
// configurations spread over all 64 cells and their strata (every family, gate, activation, K and Growth stratum), each
// with its 16 joint neighbours (D1, controls and Growth perturbed) — on a development door, after a warm-up batch, at a
// given worker count and Growth cache size. Engineering only: bench labels and job names are never study labels,
// outputs go to the git-ignored cache, and only timings, memory and the share of plausible centres (a cost driver of
// centre-first fidelity) are read — never a net, a drawdown or a ranking.
import fs from 'node:fs';
import path from 'node:path';
import { cacheRoot, log, resources } from './context.ts';
import type { DoorKey } from './doors.ts';
import { withLab } from './lab.ts';
import { vOptions } from './nl0.ts';
import { plausible } from './fitness.ts';
import { type Cfg, allCells, decode, neighbourhood, pinStratum, screenGenomes } from './space.ts';

export const runBench = async (o: { door: DoorKey; centres: number; workers: number; label: string; warm: number }) => {
  const pick = (labels: string[], n: number) => {
    const gs = screenGenomes(n, 'coarse', 'pilot-bench', ...labels);

    return gs.map((g, i) => decode(pinStratum(g, allCells[i % allCells.length]!, Math.floor(i / allCells.length), Math.ceil(n / allCells.length)), 'coarse'));
  };
  const nb = (c: Cfg) => neighbourhood(c, { name: 'r1', n: 16, labels: ['pilot-bench', 'r1', o.door] });
  const items = (cs: Cfg[]) => cs.flatMap((c) => [{ cfg: c, options: vOptions }, ...nb(c).map((p) => ({ cfg: p.cfg, options: vOptions }))]);
  const warm = items(pick(['warm', o.label], o.warm));
  const mainCfgs = pick(['main'], o.centres);
  const main = items(mainCfgs);
  const centreAt = new Set<number>();

  for (let i = 0, at = 0; i < mainCfgs.length; i++) {
    centreAt.add(at);
    at += 1 + nb(mainCfgs[i]!).length;
  }

  const job = `pilot-bench-${o.label}`;

  return withLab({ job, door: o.door, purpose: `pilot bench ${o.label}`, workers: o.workers, memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) }, async (lab) => {
    lab.stage = 'bench warm-up';
    await lab.evalMany(warm, 'warm');

    const t0 = Date.now();
    const ms0 = lab.evalMs;

    lab.stage = 'bench';

    const recs = await lab.evalMany(main, 'main');
    const seconds = (Date.now() - t0) / 1000;
    const centres = recs.filter((_r, i) => centreAt.has(i));
    const fresh = lab.tallies.main?.fresh ?? 0;
    const out = {
      label: o.label,
      door: o.door,
      workers: o.workers,
      d1Cache: resources.d1CacheEntries,
      growthCache: resources.bookCacheEntries,
      gcEvery: resources.gcEveryEvaluations,
      evaluations: main.length,
      fresh,
      seconds,
      perSecond: Math.round((fresh / seconds) * 10) / 10,
      workerMsPerEval: Math.round((lab.evalMs - ms0) / Math.max(1, fresh)),
      peaks: lab.peaks,
      plausibleCentreShare: Math.round((100 * centres.filter((r) => plausible(r)).length) / Math.max(1, centres.length)) / 100
    };

    fs.mkdirSync(path.join(cacheRoot, 'pilot', 'bench'), { recursive: true });
    fs.writeFileSync(path.join(cacheRoot, 'pilot', 'bench', `${o.label}.json`), JSON.stringify(out, null, 1));
    log(`bench ${o.label}: ${fresh} evaluations in ${seconds.toFixed(1)} s = ${out.perSecond}/s (${o.workers} workers)`);
    return out;
  });
};

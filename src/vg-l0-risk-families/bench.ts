// The pilot's throughput bench (PROTOCOL.md §13; standard §6.3): a representative rung-1 mix — quasi-random
// configurations of cells spread over all 196 (every family, gate and activation), each with its 16 joint neighbours —
// on a development door, after a warm-up batch, at a given worker count. Engineering only: bench labels and job names
// are never study labels, outputs go to the git-ignored cache, and only timings, memory and the share of plausible
// centres (a cost driver of centre-first fidelity) are read — never a net, a drawdown or a ranking.
import fs from 'node:fs';
import path from 'node:path';
import { cacheRoot, log, resources } from './context.ts';
import type { DoorKey } from './doors.ts';
import { withLab } from './lab.ts';
import { vOptions } from './nl0.ts';
import { plausible } from './fitness.ts';
import { type Cfg, allCells, decode, neighbourhood, pinStratum, screenGenomes } from './space.ts';

export const runBench = async (o: { door: DoorKey; centres: number; workers: number; label: string; warm: number }) => {
  const step = Math.max(1, Math.floor(allCells.length / Math.max(1, o.centres)));
  const pick = (labels: string[], n: number) => {
    const cells = Array.from({ length: n }, (_v, i) => allCells[(i * step) % allCells.length]!);

    return cells.map((cell, i) => decode(pinStratum(screenGenomes(1, 'pilot-bench', ...labels, cell.id, i)[0]!, cell, i), cell));
  };
  const items = (cs: Cfg[]) =>
    cs.flatMap((c) => [{ cfg: c, options: vOptions }, ...neighbourhood(c, { name: 'r1', n: 16, labels: ['pilot-bench', 'r1', o.door] }).map((p) => ({ cfg: p.cfg, options: vOptions }))]);
  const warm = items(pick(['warm', o.label], o.warm));
  const mainCfgs = pick(['main'], o.centres);
  const main = items(mainCfgs);
  const centreAt = new Set<number>();

  for (let i = 0, at = 0; i < mainCfgs.length; i++) {
    centreAt.add(at);
    at += 1 + neighbourhood(mainCfgs[i]!, { name: 'r1', n: 16, labels: ['pilot-bench', 'r1', o.door] }).length;
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

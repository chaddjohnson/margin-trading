// The pilot's throughput bench (PROTOCOL.md §13; standard §6.3): a representative rung-1 mix — random configurations
// of every V sub-cell (entry methods by stratum), each with its 16 joint neighbours, under the session unit — on a development
// door, after a warm-up batch, at a given worker count and book-cache size. Engineering only: bench labels and job
// names are never study labels, outputs go to the git-ignored cache, and only timings, memory and counts are read.
import fs from 'node:fs';
import path from 'node:path';
import { type Unit, cacheRoot, log } from './context.ts';
import {
  type Cfg,
  cellName,
  cells,
  decode,
  neighbourhood,
  optionsOf,
  pinCell,
  pinStratum,
  screenGenomes
} from './config.ts';
import type { DoorKey } from './doors.ts';
import { withLab } from './lab.ts';

export const runBench = async (o: {
  door: DoorKey;
  centres: number;
  workers: number;
  label: string;
  warm: number;
  units: Unit[];
}) => {
  const perCell = Math.max(1, Math.round(o.centres / cells.length));
  const pick = (labels: string[], n: number) =>
    cells.flatMap((cell) => {
      const out: Cfg[] = [];

      for (const [i, g] of screenGenomes(n * 4, 'coarse', 'pilot-bench', ...labels, cellName(cell)).entries()) {
        if (out.length >= n) break;
        try {
          out.push(decode(pinStratum(pinCell(g, cell), cell, i), 'coarse'));
        } catch {
          // invalid draw
        }
      }
      return out;
    });
  const items = (cs: Cfg[]) =>
    o.units.flatMap((unit) =>
      cs.flatMap((c) => [
        { quad: c.quad, options: optionsOf(c), unit },
        ...neighbourhood(c, { name: 'r1', n: 16, labels: ['pilot-bench', 'r1', o.door] }).map((p) => ({
          quad: p.cfg.quad,
          options: optionsOf(p.cfg),
          unit
        }))
      ])
    );
  const warm = items(pick(['warm', o.label], o.warm));
  const mainCfgs = pick(['main'], perCell);
  const main = items(mainCfgs);
  const centreAt = new Set<number>();

  for (let m = 0, at = 0; m < o.units.length; m++)
    for (let i = 0; i < mainCfgs.length; i++) {
      centreAt.add(at);
      at += 1 + neighbourhood(mainCfgs[i]!, { name: 'r1', n: 16, labels: ['pilot-bench', 'r1', o.door] }).length;
    }

  const job = `pilot-bench-${o.label}`;

  return withLab(
    {
      job,
      door: o.door,
      purpose: `pilot bench ${o.label}`,
      workers: o.workers,
      memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`)
    },
    async (lab) => {
      lab.stage = 'bench warm-up';
      await lab.evalMany(warm, 'warm');

      const t0 = Date.now();
      const ms0 = lab.evalMs;

      lab.stage = 'bench';

      const recs = await lab.evalMany(main, 'main');
      const seconds = (Date.now() - t0) / 1000;
      const centres = recs.filter((_r, i) => centreAt.has(i));
      const out = {
        label: o.label,
        door: o.door,
        units: o.units,
        workers: o.workers,
        bookCache: Number(process.env.VGJ_BOOK_CACHE ?? 48),
        gcEvery: Number(process.env.VGL0SH_GC_EVERY ?? 64),
        evaluations: main.length,
        fresh: lab.tallies.main?.fresh ?? 0,
        seconds,
        perSecond: Math.round(((lab.tallies.main?.fresh ?? 0) / seconds) * 10) / 10,
        workerMsPerEval: Math.round((lab.evalMs - ms0) / Math.max(1, lab.tallies.main?.fresh ?? 1)),
        peaks: lab.peaks,
        centrePlausible: centres.filter((r) => !r.error && r.net > 0 && r.dd <= 35000 && r.mixed).length,
        centresSeen: centres.length
      };

      fs.mkdirSync(path.join(cacheRoot, 'pilot', 'bench'), { recursive: true });
      fs.writeFileSync(path.join(cacheRoot, 'pilot', 'bench', `${o.label}.json`), JSON.stringify(out, null, 1));
      log(`bench ${o.label}: ${out.fresh} evaluations in ${seconds.toFixed(1)} s = ${out.perSecond}/s`);
      return out;
    }
  );
};

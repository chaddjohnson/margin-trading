// The pilot's throughput bench (PROTOCOL.md §13; standard §6.3): a representative rung-1 mix — random GDX books beside
// each arm's frozen anchors, each centre with its 16 whole-portfolio neighbours (common random numbers, so the anchor
// books repeat across centres as they do in the search) — on a development door, after a warm-up batch, at a given
// worker count and book-cache size. Engineering only: bench labels and job names are never study labels, outputs go to
// the git-ignored cache, and only timings, memory and counts are read.
import fs from 'node:fs';
import path from 'node:path';
import { cacheRoot, log } from './context.ts';
import { anchorsOf } from './controls.ts';
import type { DoorKey } from './doors.ts';
import { plausible } from './fitness.ts';
import { withLab } from './lab.ts';
import { randomGdx } from './parity.ts';
import { arms, build, rowsOf } from './space.ts';

export const runBench = async (o: { door: DoorKey; centres: number; workers: number; label: string; warm: number }) => {
  const anchors = anchorsOf();
  const perArm = Math.max(1, Math.round(o.centres / arms.length));
  const pick = (labels: string, n: number) =>
    arms.flatMap((arm) => randomGdx(n, `pilot-bench-${labels}-${arm}`).map((g) => build(anchors[arm], g)));
  const items = (bs: ReturnType<typeof pick>) =>
    bs.flatMap((b) => [
      { quad: b.quad, options: b.options },
      ...rowsOf(b, { name: 'r1', n: 16, labels: ['pilot-bench', 'r1', o.door], scope: 'joint' })
        .filter((r) => !r.dup)
        .map((r) => ({ quad: r.quad, options: r.options }))
    ]);
  const warm = items(pick(`warm-${o.label}`, o.warm));
  const main = pick('main', perArm);
  const mainItems = items(main);
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

      const centres = await lab.evalMany(
        main.map((b) => ({ quad: b.quad, options: b.options })),
        'main:centres'
      );
      const tc = (Date.now() - t0) / 1000;
      const recs = await lab.evalMany(mainItems, 'main');
      const seconds = (Date.now() - t0) / 1000;
      const fresh = (lab.tallies.main?.fresh ?? 0) + (lab.tallies['main:centres']?.fresh ?? 0);
      const out = {
        label: o.label,
        door: o.door,
        workers: o.workers,
        bookCache: Number(process.env.VGJ_BOOK_CACHE ?? 1024),
        gcEvery: Number(process.env.C4G_GC_EVERY ?? 64),
        evaluations: mainItems.length,
        fresh,
        seconds,
        perSecond: Math.round((fresh / seconds) * 10) / 10,
        centresPerSecond: Math.round((main.length / tc) * 10) / 10,
        workerMsPerEval: Math.round((lab.evalMs - ms0) / Math.max(1, fresh)),
        peaks: lab.peaks,
        centrePlausible: Object.fromEntries(
          arms.map((arm) => [
            arm,
            main.filter((b, i) => b.cfg.arm === arm && plausible(anchors[arm], centres[i]!)).length
          ])
        ),
        centresSeen: Object.fromEntries(arms.map((arm) => [arm, main.filter((b) => b.cfg.arm === arm).length])),
        recs: recs.length
      };

      fs.mkdirSync(path.join(cacheRoot, 'pilot', 'bench'), { recursive: true });
      fs.writeFileSync(path.join(cacheRoot, 'pilot', 'bench', `${o.label}.json`), JSON.stringify(out, null, 1));
      log(
        `bench ${o.label}: ${out.fresh} evaluations in ${seconds.toFixed(1)} s = ${out.perSecond}/s (centres ${out.centresPerSecond}/s)`
      );
      return out;
    }
  );
};

// The pilot's throughput bench (engineering only): a rung-1-shaped evaluation mix — random four-component centres of
// every cell, each with its 16 joint neighbours — evaluated on one door with W workers; throughput, CPU, memory and
// archive behaviour are reported, never a configuration's result.
import fs from 'node:fs';
import path from 'node:path';
import { Rng } from '../optimizer/rng.ts';
import { type PrefixDoor, cacheRoot, log, resources, seedOf } from './context.ts';
import { withLab } from './lab.ts';
import { type Quad, cells, decode, gatePairs, levelsOf, neighbourhood, pinCell, pinGates } from './space.ts';

export const benchQuads = (n: number, label = 'bench') => {
  const rng = Rng.from(...seedOf('pilot', label));
  const levels = levelsOf('coarse');
  const out: Quad[] = [];

  for (let i = 0; out.length < n && i < n * 10; i++) {
    const g = pinGates(
      pinCell(
        levels.map((k) => rng.int(k)),
        cells[i % cells.length]!
      ),
      gatePairs[i % gatePairs.length]!
    );

    try {
      out.push(decode(g, 'coarse'));
    } catch {
      // skip
    }
  }

  return out;
};

export const bench = async (door: PrefixDoor, centres: number, workers: number, label: string) => {
  const items: { quad: Quad }[] = [];

  for (const [i, q] of benchQuads(centres, `bench-${label}`).entries())
    items.push(
      { quad: q },
      ...neighbourhood(q, { name: 'r1', n: 16, labels: ['bench', label, i] }).map((p) => ({ quad: p.quad }))
    );

  const warm = benchQuads(workers, `bench-warm-${label}`).map((quad) => ({ quad }));
  const tStart = performance.now();

  await withLab(
    { job: `pilot-bench-${label}-${door}-w${workers}`, door, purpose: 'pilot bench (engineering)', workers },
    async (lab) => {
      // start the workers (and evaluate one configuration each), then time the steady-state mix alone
      await lab.evalMany(warm);

      const startup = (performance.now() - tStart) / 1000;
      const fresh0 = lab.fresh;
      const t0 = performance.now();
      const cpu0 = process.cpuUsage();
      const recs = await lab.evalMany(items);
      const seconds = (performance.now() - t0) / 1000;
      const out = {
        door,
        workers,
        bookCache: resources.bookCacheEntries,
        n: recs.length,
        fresh: lab.fresh - fresh0,
        startupSeconds: Math.round(startup * 10) / 10,
        seconds: Math.round(seconds * 10) / 10,
        perSecond: Math.round(((lab.fresh - fresh0) / seconds) * 10) / 10,
        coordinatorCpuSeconds: Math.round((process.cpuUsage(cpu0).user + process.cpuUsage(cpu0).system) / 1e5) / 10,
        peaks: lab.peaks
      };
      const file = path.join(cacheRoot, 'pilot', 'bench.jsonl');

      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, `${JSON.stringify({ t: new Date().toISOString(), label, ...out })}\n`);
      log(`bench ${JSON.stringify(out)}`);
    }
  );
};

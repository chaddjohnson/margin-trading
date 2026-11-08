// The pilot's throughput bench (engineering only): N fixed random joint configurations of every cell evaluated on one
// door with W workers; throughput, memory and archive behaviour are reported, never a configuration's result.
import fs from 'node:fs';
import path from 'node:path';
import { Rng } from '../optimizer/rng.ts';
import { type PrefixDoor, cacheRoot, log, seedOf } from './context.ts';
import { withLab } from './lab.ts';
import { type Joint, cells, decode, levelsOf, pinCell } from './space.ts';

export const benchJoints = (n: number) => {
  const rng = Rng.from(...seedOf('pilot', 'bench'));
  const levels = levelsOf('coarse');
  const out: Joint[] = [];

  for (let i = 0; out.length < n && i < n * 10; i++) {
    const cell = cells[i % cells.length]!;
    const g = pinCell(
      levels.map((k) => rng.int(k)),
      cell
    );

    try {
      out.push(decode(g, cell.arch, 'coarse'));
    } catch {
      // skip
    }
  }

  return out;
};

export const bench = async (door: PrefixDoor, n: number, workers: number, label: string) => {
  const joints = benchJoints(n);
  const t0 = performance.now();

  await withLab(
    { job: `pilot-bench-${label}-${door}-w${workers}`, door, purpose: 'pilot bench (engineering)', workers },
    async (lab) => {
      const recs = await lab.evalMany(joints.map((joint) => ({ joint })));
      const seconds = (performance.now() - t0) / 1000;
      const out = {
        door,
        workers,
        n: recs.length,
        fresh: lab.fresh,
        seconds: Math.round(seconds * 10) / 10,
        perSecond: Math.round((lab.fresh / seconds) * 10) / 10,
        peaks: lab.peaks
      };
      const file = path.join(cacheRoot, 'pilot', 'bench.jsonl');

      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, `${JSON.stringify({ t: new Date().toISOString(), label, ...out })}\n`);
      log(`bench ${JSON.stringify(out)}`);
    }
  );
};

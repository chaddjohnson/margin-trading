// The pilot's throughput bench (PROTOCOL.md §13; standard §6.3): a representative rung-1 mix — random standalone Growth
// books, each centre with its 8 neighbours (common random numbers) — on one ETF's D24 door, after a warm-up batch, at a
// given worker count and book-cache size. Engineering only: bench labels and job names are never study labels, outputs
// go to the git-ignored cache, and only timings, memory and counts are read.
import fs from 'node:fs';
import path from 'node:path';
import { cacheRoot, log } from './context.ts';
import { doorName } from './doors.ts';
import { plausible } from './fitness.ts';
import { withLab } from './lab.ts';
import { randomG } from './parity.ts';
import { build, rowsOf } from './space.ts';

export const runBench = async (o: { sym: string; centres: number; workers: number; label: string; warm: number }) => {
  const pick = (labels: string, n: number) => randomG(n, `pilot-bench-${labels}`).map((g) => build(g));
  const items = (bs: ReturnType<typeof pick>) =>
    bs.flatMap((b) => [
      { quad: b.quad, options: b.options },
      ...rowsOf(b, { name: 'r1', n: 8, labels: ['pilot-bench', 'r1'] })
        .filter((r) => !r.dup)
        .map((r) => ({ quad: r.built.quad, options: r.built.options }))
    ]);
  const warm = items(pick(`warm-${o.label}`, o.warm));
  const main = pick('main', o.centres);
  const mainItems = items(main);
  const job = `pilot-bench-${o.label}`;

  return withLab(
    {
      job,
      door: doorName(o.sym, 'D24'),
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
        sym: o.sym,
        workers: o.workers,
        startBatch: Number(process.env.GETF_START_BATCH ?? 4),
        bookCache: Number(process.env.VGJ_BOOK_CACHE ?? 256),
        gcEvery: Number(process.env.GETF_GC_EVERY ?? 256),
        evaluations: mainItems.length,
        fresh,
        seconds,
        perSecond: Math.round((fresh / seconds) * 10) / 10,
        centresPerSecond: Math.round((main.length / tc) * 10) / 10,
        workerMsPerEval: Math.round((lab.evalMs - ms0) / Math.max(1, fresh)),
        peaks: lab.peaks,
        centrePlausible: main.filter((_b, i) => plausible(centres[i]!)).length,
        startSeconds: Math.round((t0 - lab.t0) / 100) / 10,
        centresSeen: main.length,
        recs: recs.length
      };

      fs.mkdirSync(path.join(cacheRoot, 'pilot', 'bench'), { recursive: true });
      fs.writeFileSync(path.join(cacheRoot, 'pilot', 'bench', `${o.label}.json`), JSON.stringify(out, null, 1));
      log(
        `bench ${o.label}: ${out.fresh} evaluations in ${seconds.toFixed(1)} s = ${out.perSecond}/s (centres ${out.centresPerSecond}/s); plausible centres ${out.centrePlausible}/${out.centresSeen}`
      );
      return out;
    }
  );
};

// The duplicate-concurrent-key test (brief: "Test duplicate concurrent evaluation keys, the hang fixed in Priority 3C"):
// three concurrent evalMany calls with overlapping keys on one pool must all resolve, with each distinct key evaluated
// once. Engineering only (pilot job name, the cache).
export const runDupKeys = async (o: { sym: string; workers: number; label: string }) => {
  const bs = randomG(24, `pilot-dupkeys-${o.label}`).map((g) => build(g));
  const a = bs.slice(0, 16).map((b) => ({ quad: b.quad, options: b.options }));
  const b = bs.slice(8, 24).map((x) => ({ quad: x.quad, options: x.options }));
  const c = [a[0]!, a[0]!, b[15]!, build(null)].map((x) => ({ quad: x.quad, options: x.options }));
  const job = `pilot-dupkeys-${o.label}`;

  return withLab(
    {
      job,
      door: doorName(o.sym, 'D19'),
      purpose: `pilot duplicate keys ${o.label}`,
      workers: o.workers,
      memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`)
    },
    async (lab) => {
      const t0 = Date.now();
      let timer: NodeJS.Timeout | undefined;
      const watchdog = new Promise<never>((_r, reject) => {
        timer = setTimeout(() => reject(new Error('duplicate-key test timed out (hang)')), 600_000);
        timer.unref();
      });
      const [ra, rb, rc] = await Promise.race([
        Promise.all([lab.evalMany(a, 'a'), lab.evalMany(b, 'b'), lab.evalMany(c, 'c')]),
        watchdog
      ]).finally(() => clearTimeout(timer));
      const distinct = new Set([...a, ...b, ...c].map((x) => JSON.stringify(x))).size;
      const out = {
        resolved: [ra.length, rb.length, rc.length],
        fresh: lab.fresh,
        hits: lab.hits,
        distinctKeys: distinct,
        pass: ra.length === a.length && rb.length === b.length && rc.length === c.length && lab.fresh === distinct,
        seconds: (Date.now() - t0) / 1000
      };

      fs.mkdirSync(path.join(cacheRoot, 'pilot', 'dupkeys'), { recursive: true });
      fs.writeFileSync(path.join(cacheRoot, 'pilot', 'dupkeys', `${o.label}.json`), JSON.stringify(out, null, 1));
      log(`duplicate keys ${o.label}: ${JSON.stringify(out)}`);
      if (!out.pass) throw new Error('duplicate-key test failed');
      return out;
    }
  );
};

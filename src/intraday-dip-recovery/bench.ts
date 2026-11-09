// The pilot bench (PROTOCOL.md §13.3): throughput and memory of the study's real evaluation mix (rung-1 centres of every
// family and cell with 16 neighbours each) on the largest development door, for a worker count and GC cadence.
import { type DoorKey, familyKeys, log } from './context.ts';
import { cgroupMemory, Lab } from './lab.ts';
import { resources } from './resources.ts';
import { designOf, screenOf } from './space.ts';

export const bench = async (o: { door: DoorKey; centres: number; workers: number; gcEvery: number; label: string }) => {
  (resources as { gcEveryEvaluations: number }).gcEveryEvaluations = o.gcEvery;

  const lab = new Lab(`pilot-bench-${o.label}`, o.door, `pilot bench ${o.label}`, { workers: o.workers });
  const t0 = Date.now();

  await lab.start();

  const ready = Date.now();
  const perFamily = Math.ceil(o.centres / 4);
  const specs = familyKeys.flatMap((f) =>
    screenOf(f, Math.ceil(perFamily / 6), ['bench', o.label, f]).points.slice(0, perFamily).flatMap((p) => [
      { ruleSet: f, grid: p.candidate.grid },
      ...designOf(p.candidate, { name: 'r1', n: 16, labels: ['bench', 'r1'] }).draws.map((d) => ({ ruleSet: f, grid: d.candidate.grid }))
    ])
  );
  let peakCg = 0;
  const timer = setInterval(() => {
    const c = cgroupMemory().current;

    if (c > peakCg) peakCg = c;
  }, 500);

  await lab.evaluate(specs);
  clearInterval(timer);

  const done = Date.now();
  const cg = cgroupMemory();
  const cpu = process.cpuUsage();
  const out = {
    label: o.label,
    door: o.door,
    workers: o.workers,
    gcEvery: o.gcEvery,
    evaluations: lab.counters.fresh,
    startupSeconds: (ready - t0) / 1000,
    seconds: (done - ready) / 1000,
    evalsPerSecond: lab.counters.fresh / ((done - ready) / 1000),
    cgroupPeakBytes: Math.max(peakCg, cg.peak || 0),
    cgroupCurrentBytes: cg.current,
    orchestratorCpuSeconds: (cpu.user + cpu.system) / 1e6,
    memorySamples: lab.memoryLog.slice(-3)
  };

  await lab.close();
  log(`bench ${o.label}: ${out.evaluations} evaluations in ${out.seconds.toFixed(1)} s = ${out.evalsPerSecond.toFixed(1)}/s; cgroup peak ${(out.cgroupPeakBytes / 2 ** 30).toFixed(2)} GiB`);
  return out;
};

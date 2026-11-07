// The development-only timing pilot (PROTOCOL.md §7.3): throughput of the canonical backtester through the adapter on
// configurations drawn with the engineering-only seed family ('pilot', …). It records times, counts and memory only —
// never a net, drawdown or gate outcome — so no design choice can depend on performance.
import os from 'node:os';
import fs from 'fs-extra';
import { resultFile, schedule } from './context.ts';
import { Lab, ParallelLab, type DoorView, workerCount } from './lab.ts';
import { activeOf, effectiveOf, screenGenomes } from './space.ts';
import { log, nowIso, writeSealed } from './seal.ts';

export const runPilot = async (view: DoorView) => {
  const out = resultFile('pilot', 'pilot.json');

  if (await fs.pathExists(out)) throw new Error(`${out} exists (sealed)`);

  const genomes = screenGenomes(2048, ['pilot', 'V', 'DEV']);
  const jobs = genomes.map(effectiveOf);
  // single thread, in-process (the first 64)
  const single = new Lab(view);
  const t0 = performance.now();

  for (const job of jobs.slice(0, 64)) single.point(job);

  const singleMs = (performance.now() - t0) / 64;

  log(`pilot: single-thread ${singleMs.toFixed(1)} ms per point`);

  const size = workerCount();
  const lab = new ParallelLab(view, { door: 'development' }, size);
  const t1 = performance.now();

  await lab.points(jobs.slice(0, 32)); // warm the workers (door opening)

  const warm = (performance.now() - t1) / 1000;
  const t2 = performance.now();

  await lab.points(jobs);

  const seconds = (performance.now() - t2) / 1000;
  const perSecond = (jobs.length - 32) / seconds;
  const rss = process.memoryUsage().rss;

  await lab.close();

  // the schedule's point budget (Study 8's V pipeline at s(d)), for the compute estimate
  const r1Points = (schedule.r1Cap + schedule.islands * schedule.newPerIsland) * (1 + schedule.r1);
  const estimate = {
    screen: schedule.screen,
    rung1: r1Points,
    rung2: schedule.r2Keep * (1 + schedule.r2),
    rung3: schedule.r3Keep * (1 + schedule.r3),
    refinement: schedule.refineStarts * schedule.refinePasses * 4 * 16 * (1 + schedule.refineN),
    selection: schedule.shortlist * (1 + 2 * schedule.select.n)
  };
  const totalPoints = Object.values(estimate).reduce((a, b) => a + b, 0);
  const meanActive = genomes.reduce((a, g) => a + activeOf(g).length, 0) / genomes.length;
  const record = await writeSealed(out, {
    stage: 'PILOT',
    at: nowIso(),
    door: {
      door: view.door,
      first: view.sessions[0]!.date,
      last: view.sessions.at(-1)!.date,
      sessions: view.sessions.length
    },
    machine: { cpus: os.availableParallelism(), memoryGb: Math.round(os.totalmem() / 1e9), node: process.version },
    configurations: jobs.length,
    meanActiveNumericGenes: meanActive,
    singleThreadMsPerPoint: singleMs,
    workers: size,
    workerWarmSeconds: warm,
    parallelPointsPerSecond: perSecond,
    mainRssMb: Math.round(rss / 1e6),
    estimate: {
      points: estimate,
      totalPoints,
      wallMinutesAtPilotRate: totalPoints / perSecond / 60,
      wallMinutesIfEightIslands: (totalPoints + 4 * schedule.newPerIsland * (1 + schedule.r1)) / perSecond / 60
    },
    note: 'Throughput only: no net, drawdown, share or gate outcome was computed into this record or printed.'
  });

  log(
    `pilot sealed ${record.file}: ${perSecond.toFixed(1)} points/s on ${size} workers; schedule ≈ ${totalPoints} points ≈ ${(totalPoints / perSecond / 60).toFixed(0)} min`
  );

  return record;
};

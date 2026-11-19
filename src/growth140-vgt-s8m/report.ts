// Memory reports (PROTOCOL.md §3): a summary of each job's 10-second samples (results/memory/<job>.jsonl).
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir } from './context.ts';

const GiB = 2 ** 30;
const MiB = 2 ** 20;
const median = (v: number[]) => {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);

  return s.length ? s[Math.floor((s.length - 1) / 2)]! : NaN;
};
const max = (v: number[]) => v.filter(Number.isFinite).reduce((a, b) => Math.max(a, b), -Infinity);
const r = (x: number, d = 3) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);

export const memorySummary = (job: string) => {
  const file = path.join(resultsDir, 'memory', `${job}.jsonl`);

  if (!fs.existsSync(file)) return null;

  const rows = fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const ready = rows.find((x) => String(x.event).startsWith('workers-ready'));
  const start = rows.find((x) => String(x.event).startsWith('job-start'));
  const steady = rows.filter((x) => !x.event);
  const workerRss = steady.flatMap((x) => x.workerMem.map((w: { rss: number }) => w.rss));
  const workerAb = steady.flatMap((x) => x.workerMem.map((w: { arrayBuffers: number }) => w.arrayBuffers));
  const workerHeap = steady.flatMap((x) => x.workerMem.map((w: { heapUsed: number }) => w.heapUsed));
  const last = rows.at(-1);
  const seconds = (Date.parse(last.t) - Date.parse(rows[0].t)) / 1000;
  const events = last.cgroup.events ?? {};

  return {
    job,
    samples: rows.length,
    seconds: r(seconds, 0),
    workers: ready?.workers ?? last.workers,
    cgroupAtStartGiB: r(start?.cgroup.current / GiB),
    cgroupAfterWorkersReadyGiB: r(ready?.cgroup.current / GiB),
    perWorkerAtReadyMiB: ready ? r(median(ready.workerMem.map((w: { rss: number }) => w.rss)) / MiB, 0) : null,
    perWorkerSteadyMedianMiB: r(median(workerRss) / MiB, 0),
    perWorkerSteadyMaxMiB: r(max(workerRss) / MiB, 0),
    workerHeapUsedMaxMiB: r(max(workerHeap) / MiB, 0),
    workerArrayBuffersMaxMiB: r(max(workerAb) / MiB, 0),
    coordinatorRssMaxMiB: r(max(rows.map((x) => x.coordinator.rss)) / MiB, 0),
    coordinatorHeapUsedMaxMiB: r(max(rows.map((x) => x.coordinator.heapUsed)) / MiB, 0),
    cgroupCurrentMaxGiB: r(max(rows.map((x) => x.cgroup.current)) / GiB),
    cgroupCurrentSteadyMedianGiB: r(median(steady.map((x) => x.cgroup.current)) / GiB),
    cgroupPeakGiB: r(max(rows.map((x) => x.cgroup.peak)) / GiB),
    swapMax: max(rows.map((x) => x.cgroup.swap)),
    memoryEvents: events,
    lruMax: max(rows.map((x) => x.store?.lruSize ?? NaN)),
    lruEvictions: last.store?.lruEvictions ?? null,
    storeDiskReads: last.store?.diskReads ?? null,
    writeBufferMax: max(rows.map((x) => x.store?.pending ?? NaN)),
    queuedMax: max(rows.map((x) => x.queue.queued)),
    inFlightMax: max(rows.map((x) => x.queue.inFlight)),
    freshEvaluations: last.evaluations.fresh,
    archiveHits: last.evaluations.archiveHits,
    freshPerSecond: seconds > 0 ? r(last.evaluations.fresh / seconds, 2) : null
  };
};

export const memoryReport = (jobs: string[]) => jobs.map(memorySummary).filter(Boolean);

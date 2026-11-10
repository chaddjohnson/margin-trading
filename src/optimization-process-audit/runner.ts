// The resumable slice runner (PROTOCOL.md §10): continuous runs on one door with the subject's own slice semantics,
// each result archived as it returns in a SQLite archive bound to this study, the job, the door and its pin and the
// subjects' evaluation digests; one evaluation per key (duplicate keys are removed before dispatch); a rerun of the same
// command replays archived results and computes only the missing ones. SIGTERM / SIGINT request a graceful stop
// (commit, exit 75); an abrupt kill loses at most the uncommitted tail, which the rerun recomputes deterministically.
import path from 'node:path';
import { Store } from '../growth140-vgt-s8m/store.ts';
import { doorSpecs } from '../vg-d1-growth-joint/context.ts';
import { type DoorName, STUDY, cacheRoot, log, resources } from './context.ts';
import { sources } from './sources.ts';
import { type Conf, openDoor, sliceRun } from './subjects.ts';

export const EXIT_STOPPED = 75;

export interface SliceItem {
  key: string; // unique within the job
  conf: Conf;
  marks: boolean; // keep the post-boundary marks (policy choices and published role holders only)
}

export interface SliceResult {
  key: string;
  id: string;
  sliceNet: number;
  sliceDd: number;
  boundaryEquity: number;
  wholeNet: number;
  wholeDd: number;
  wholeRealized: number;
  wholeUnrealized: number;
  lots: number;
  sessionsHeld: number;
  openAtBoundary: string[];
  openAtEnd: string[];
  years: Record<string, number>;
}

export const jobArchive = (job: string, door: DoorName) =>
  new Store(path.join(cacheRoot, 'jobs', job, 'archive.sqlite'), {
    binding: {
      study: STUDY,
      job,
      door,
      doorPin: door === 'FULL' ? 'FULL' : `GDX:${doorSpecs[door].pins.GDX.sha256},VGT:${doorSpecs[door].pins.VGT.sha256}`,
      codeDigest: `3B:${sources['3B'].evaluationDigest()},4A:${sources['4A'].evaluationDigest()}`
    },
    lruCapacity: resources.lruCapacity,
    commitRows: resources.storeCommitRows,
    commitMs: resources.storeCommitMs
  });

export class StopRequested extends Error {}

export const runSlices = async (o: {
  job: string;
  door: DoorName;
  boundary: string;
  purpose: string;
  guard?: { file: string; sha256: string };
  items: readonly SliceItem[];
  onFresh: () => void; // the compute counter (caps enforced there)
  killAfter?: number; // pilot: SIGKILL self after this many fresh runs
  stopAfter?: number; // pilot: request a graceful stop after this many fresh runs
}) => {
  const store = jobArchive(o.job, o.door);
  const unique = new Map<string, SliceItem>();
  let stop: string | null = null;
  const onSignal = (sig: string) => () => {
    stop = sig;
  };

  process.on('SIGTERM', onSignal('SIGTERM'));
  process.on('SIGINT', onSignal('SIGINT'));

  for (const it of o.items) if (!unique.has(it.key)) unique.set(it.key, it);

  const missing = [...unique.values()].filter((it) => !store.read('points', it.key) || (it.marks && !store.read('fits', it.key)));
  let fresh = 0;

  log(`${o.job}: ${o.items.length} items, ${unique.size} unique keys, ${unique.size - missing.length} archived, ${missing.length} to run on ${o.door}`);

  if (missing.length) {
    const door = await openDoor(o.door, o.purpose, o.guard);

    for (const it of missing) {
      if (stop) {
        store.commit();
        store.close();
        throw new StopRequested(stop);
      }

      const x = sliceRun(door, it.conf, o.boundary);

      o.onFresh();
      fresh++;

      const r: SliceResult = {
        key: it.key,
        id: it.conf.id,
        sliceNet: x.rec.periods[0]!.after,
        sliceDd: x.rec.periods[0]!.dd,
        boundaryEquity: x.rec.periods[0]!.equity,
        wholeNet: x.rec.net,
        wholeDd: x.rec.dd,
        wholeRealized: x.rec.realized,
        wholeUnrealized: x.rec.unrealized,
        lots: x.rec.lots,
        sessionsHeld: x.rec.sessionsHeld,
        openAtBoundary: x.openAtBoundary,
        openAtEnd: x.openAtEnd,
        years: x.rec.years
      };

      store.write('points', it.key, r);
      if (it.marks) store.write('fits', it.key, { t: x.t, v: x.v });
      if (o.stopAfter !== undefined && fresh >= o.stopAfter) stop = 'pilot stop-after';
      if (o.killAfter !== undefined && fresh >= o.killAfter) process.kill(process.pid, 'SIGKILL');
    }
  }

  store.commit();

  const results = new Map<string, SliceResult & { t?: number[]; v?: number[] }>();

  for (const it of unique.values()) {
    const r = store.read<SliceResult>('points', it.key);

    if (!r) throw new Error(`${it.key} missing after the run`);

    const m = it.marks ? store.read<{ t: number[]; v: number[] }>('fits', it.key) : undefined;

    results.set(it.key, { ...r, ...(m ?? {}) });
  }

  store.close();
  return { results, fresh, archived: unique.size - missing.length, duplicatesRemoved: o.items.length - unique.size };
};

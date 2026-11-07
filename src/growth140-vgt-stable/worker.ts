// An evaluation worker process (PROTOCOL.md §3.3; the completed study's design): opens its door itself, evaluates one
// configuration per message and returns the compact record (or the on-demand detail). A full GC runs after every
// `gcEvery` evaluations, or when ArrayBuffers exceed `gcBytes`: each canonical run allocates ~28 MB of typed arrays
// that V8 otherwise lets accumulate to several GB per isolate (research/growth140-vgt-s8m/MEMORY.md).
//
//   node --expose-gc --max-old-space-size=<MiB> worker.ts <door> <gcEvery> <gcBytes> [guardFile guardSha256]
//
// A guarded door (a fold's evaluation slice, or FULL) opens only when the guard file exists, is read-only and has the
// expected sha256 (the sealed selection that must precede it).
import fs from 'node:fs';
import { runOf } from '../growth140-vgt-s8m/engine.ts';
import { sha256File } from '../growth140-vgt-s8m/data.ts';
import { drawdownFrom } from '../growth140-vgt-s8m/engine.ts';
import { type DoorName } from './context.ts';
import { openDoor } from './data.ts';
import { detailOf, evaluate } from './engine.ts';
import type { Config } from './space.ts';

const [doorName = '', gcEveryText, gcBytesText, guardFile, guardSha] = process.argv.slice(2);
const gcEvery = Number(gcEveryText);
const gcBytes = Number(gcBytesText);
const gc = (globalThis as { gc?: () => void }).gc;

if (!gc) throw new Error('worker needs --expose-gc');
if (doorName === 'FULL' && !guardFile)
  throw new Error('the FULL door needs its guard (the committed frozen selection)');
if (guardFile) {
  if (!fs.existsSync(guardFile)) throw new Error(`guard ${guardFile} does not exist`);
  if ((fs.statSync(guardFile).mode & 0o222) !== 0) throw new Error(`guard ${guardFile} is writable`);
  if (sha256File(guardFile) !== guardSha) throw new Error(`guard ${guardFile} has another sha256`);
}

const send = (message: unknown) => process.send!(message);
const mem = () => {
  const m = process.memoryUsage();

  return {
    rss: m.rss,
    heapUsed: m.heapUsed,
    heapTotal: m.heapTotal,
    external: m.external,
    arrayBuffers: m.arrayBuffers
  };
};

const started = performance.now();
const door = await openDoor(doorName as DoorName);
let count = 0;
let gcs = 0;

gc();
send({ t: 'ready', loadMs: Math.round(performance.now() - started), mem: mem(), sessions: door.history.length });

// The minute-marked net after a boundary close, relative to the boundary equity (the sequential policies' drawdown).
const marksAfter = (c: Config, boundary: string) => {
  const r = runOf(door, c, { minuteMarks: true });
  const sim = r.run.simulation;
  const b = sim.daily.findIndex((d) => d.date === boundary);

  if (b < 0) throw new Error(`boundary ${boundary} is not a session`);

  const equity = sim.daily[b]!.marked;
  const close = r.run.ds.sCloseTime[sim.daily[b]!.index]!;
  const marks = sim.markChanges!;
  const t: number[] = [];
  const v: number[] = [];

  for (let i = 0; i < marks.t.length; i++)
    if (marks.t[i]! > close) {
      t.push(marks.t[i]!);
      v.push(Math.round((marks.marked[i]! - equity) * 1e6) / 1e6);
    }

  const check = drawdownFrom(r, close, equity, close);

  return {
    boundaryEquity: equity,
    boundaryClose: close,
    t,
    v,
    sliceDrawdown: check.maximum,
    finalEquity: sim.daily.at(-1)!.marked
  };
};

process.on(
  'message',
  (m: {
    t: string;
    k?: string;
    c?: Config;
    detail?: boolean;
    boundary?: string;
    events?: boolean;
    marks?: boolean;
  }) => {
    if (m.t === 'mem') {
      send({ t: 'mem', mem: mem(), count, gcs });
      return;
    }

    if (m.t === 'exit') process.exit(0);

    try {
      const result = m.marks
        ? marksAfter(m.c!, m.boundary!)
        : m.detail
          ? detailOf(door, m.c!, m.boundary, m.events === true)
          : evaluate(door, m.c!);

      count++;
      send({ t: 'res', k: m.k, r: result });
    } catch (error) {
      count++;
      send({ t: 'err', k: m.k, e: String((error as Error).stack ?? error) });
    }

    if (count % gcEvery === 0 || process.memoryUsage().arrayBuffers > gcBytes) {
      gc();
      gcs++;
    }
  }
);

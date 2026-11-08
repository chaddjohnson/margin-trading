// An evaluation worker of this follow-up: opens the D24 development door itself (verified against its pin; logged in
// this study's door log, never Priority 2's), evaluates one joint configuration per message with Priority 2's frozen
// evaluator and returns the compact record. A full GC runs after every `gcEvery` evaluations or above `gcBytes` of
// ArrayBuffers (typed arrays are not bounded by V8's heap limits).
//
//   node --expose-gc --max-old-space-size=<MiB> worker.ts <door> <purpose> <gcEvery> <gcBytes> <killAfter>
import { openPrefixDoor } from '../vgt-d1-growth-joint/data.ts';
import { type EvalOptions, caches, evaluate } from '../vgt-d1-growth-joint/evaluate.ts';
import type { Joint } from '../vgt-d1-growth-joint/space.ts';
import { logDoor } from './records.ts';

const [doorName = '', purpose = '', gcEveryText = '8', gcBytesText = String(256 * 2 ** 20), killText = '0'] =
  process.argv.slice(2);
const gcEvery = Number(gcEveryText);
const gcBytes = Number(gcBytesText);
const killAfter = Number(killText);
const gc = (globalThis as { gc?: () => void }).gc;

if (!gc) throw new Error('worker needs --expose-gc');
if (doorName !== 'D24') throw new Error(`this study's workers open D24 only (asked: ${doorName})`);

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
const door = await openPrefixDoor('D24', `${purpose} (worker)`, true);

logDoor('D24', `${purpose} (worker)`, { sha256: door.dataSha256 });
door.history = new Array(door.history.length); // the minute sessions are not needed once the Dataset exists

let count = 0;
let gcs = 0;

gc();
send({ t: 'ready', loadMs: Math.round(performance.now() - started), mem: mem(), sessions: door.sessions });

process.on('message', (m: { t: string; k?: string; joint?: Joint; options?: EvalOptions }) => {
  if (m.t === 'mem') {
    send({ t: 'mem', mem: mem(), count, gcs, cache: { d1: caches.D1.size, g: caches.G.size } });
    return;
  }

  if (m.t === 'exit') process.exit(0);

  try {
    const record = evaluate(door, m.joint!, m.options ?? {});

    count++;
    send({ t: 'res', k: m.k, r: record });
  } catch (error) {
    count++;
    send({ t: 'err', k: m.k, e: String((error as Error).stack ?? error) });
  }

  if (killAfter > 0 && count >= killAfter) process.kill(process.pid, 'SIGKILL'); // interruption test only

  if (count % gcEvery === 0 || process.memoryUsage().arrayBuffers > gcBytes) {
    gc();
    gcs++;
  }
});

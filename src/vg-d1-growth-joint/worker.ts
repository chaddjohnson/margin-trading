// An evaluation worker process (PROTOCOL.md §13): opens ONE door itself (both symbols; FULL only under the frozen
// selection's guard), evaluates one four-component configuration per message and returns its compact record. Virtual
// books are cached per worker (bounded); a full GC runs after every `gcEvery` evaluations or above `gcBytes` of
// ArrayBuffers (typed arrays are not bounded by V8's heap limits).
//
//   node --expose-gc --max-old-space-size=<MiB> worker.ts <door> <purpose> <gcEvery> <gcBytes> <killAfter> [guard sha]
import type { DoorName } from './context.ts';
import { openDoor } from './data.ts';
import { caches, evaluate } from './evaluate.ts';
import type { EvalOptions } from './evaluate.ts';
import type { Quad } from './space.ts';

const [
  doorName = '',
  purpose = '',
  gcEveryText = '8',
  gcBytesText = String(256 * 2 ** 20),
  killText = '0',
  guardFile,
  guardSha
] = process.argv.slice(2);
const gcEvery = Number(gcEveryText);
const gcBytes = Number(gcBytesText);
const killAfter = Number(killText);
const gc = (globalThis as { gc?: () => void }).gc;

if (!gc) throw new Error('worker needs --expose-gc');

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
const door = await openDoor(
  doorName as DoorName,
  `${purpose} (worker)`,
  guardFile ? { file: guardFile, sha256: guardSha ?? '' } : undefined
);

// the minute sessions are no longer needed once the Datasets and the daily bars exist
for (const s of ['GDX', 'VGT'] as const) door.sym[s].history = new Array(door.sym[s].history.length);

let count = 0;
let gcs = 0;

gc();
send({ t: 'ready', loadMs: Math.round(performance.now() - started), mem: mem(), sessions: door.sessions });

process.on('message', (m: { t: string; k?: string; quad?: Quad; options?: EvalOptions }) => {
  if (m.t === 'mem') {
    send({
      t: 'mem',
      mem: mem(),
      count,
      gcs,
      cache: Object.fromEntries(Object.entries(caches).map(([b, c]) => [b, c.size]))
    });
    return;
  }

  if (m.t === 'exit') process.exit(0);

  try {
    const record = evaluate(door, m.quad!, m.options ?? {});

    count++;
    send({ t: 'res', k: m.k, r: record });
  } catch (error) {
    count++;
    send({ t: 'err', k: m.k, e: String((error as Error).stack ?? error) });
  }

  if (killAfter > 0 && count >= killAfter) process.kill(process.pid, 'SIGKILL'); // pilot: abrupt worker death

  if (count % gcEvery === 0 || process.memoryUsage().arrayBuffers > gcBytes) {
    gc();
    gcs++;
  }
});

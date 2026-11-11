// An evaluation worker process (PROTOCOL.md §13; 4A's worker bound to this study): opens ONE ETF door itself (`SYM:KEY`;
// FULL only behind THIS study's committed frozen selection), evaluates one configuration per message with Priority 3's
// unchanged evaluation (src/vg-d1-growth-joint/evaluate.ts; only the Growth slot enabled, holding the ETF) and returns
// the record with its compute time. Virtual books are cached per worker (bounded, Priority 3's
// caches). A full GC runs every `gcEvery` evaluations or above `gcBytes` of ArrayBuffers (typed arrays are not bounded
// by V8's heap limit).
//
//   node --expose-gc --max-old-space-size=<MiB> worker.ts <door> <purpose> <gcEvery> <gcBytes> <killAfter>
import { caches, evaluate } from '../vg-d1-growth-joint/evaluate.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import { openEtfDoor, parseDoorName } from './doors.ts';

const [doorName = '', purpose = '', gcEveryText = '64', gcBytesText = String(256 * 2 ** 20), killText = '0'] =
  process.argv.slice(2);
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
const { sym, key } = parseDoorName(doorName);
const etf = await openEtfDoor(sym, key, `${purpose} (worker)`);
const door = etf.door;

// the minute sessions are no longer needed once the Dataset and the daily bars exist (both keys hold one object)
door.sym.GDX.history = new Array(door.sym.GDX.history.length);
etf.sessions = [];

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

  const t0 = performance.now();

  try {
    const record = evaluate(door, m.quad!, m.options ?? {});

    count++;
    send({ t: 'res', k: m.k, r: record, ms: performance.now() - t0 });
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

process.on('disconnect', () => process.exit(0));

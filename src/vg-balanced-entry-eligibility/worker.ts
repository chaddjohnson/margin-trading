// An evaluation worker process (PROTOCOL.md §11): opens ONE door itself (FULL with eligibility ON only under the
// sealed selection's guard), resolves the control, evaluates one Spec per message and returns its compact record (or
// the full detail). A full GC runs after every `gcEvery` evaluations or above `gcBytes` of ArrayBuffers.
//
//   node --expose-gc --max-old-space-size=<MiB> worker.ts <door> <purpose> <gcEvery> <gcBytes> [guardFile guardSha256]
import type { DoorName } from './context.ts';
import { resolveControl } from './control.ts';
import { openDoor } from './data.ts';
import { detailOf, recordOf, run } from './evaluate.ts';
import type { Spec } from './specs.ts';

const [doorName = '', purpose = '', gcEveryText = '8', gcBytesText = String(256 * 2 ** 20), guardFile, guardSha] =
  process.argv.slice(2);
const gcEvery = Number(gcEveryText);
const gcBytes = Number(gcBytesText);
const gc = (globalThis as { gc?: () => void }).gc;

if (!gc) throw new Error('worker needs --expose-gc');

const guarded = Boolean(guardFile);
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
const { pool } = await resolveControl();
const door = await openDoor(
  doorName as DoorName,
  `${purpose} (worker)`,
  guarded ? { file: guardFile!, sha256: guardSha! } : undefined
);
let count = 0;
let gcs = 0;

gc();
send({ t: 'ready', loadMs: Math.round(performance.now() - started), mem: mem(), sessions: door.sessions });

process.on('message', (m: { t: string; k?: string; spec?: Spec; detail?: boolean }) => {
  if (m.t === 'mem') {
    send({ t: 'mem', mem: mem(), count, gcs });
    return;
  }

  if (m.t === 'exit') process.exit(0);

  try {
    const spec = m.spec!;
    const on = Object.keys(spec.eligibility).length > 0;

    if (door.door === 'FULL' && on && !guarded)
      throw new Error('FULL with eligibility ON needs the sealed selection guard');

    const t0 = performance.now();
    const result = run(pool, door, spec);
    const seconds = (performance.now() - t0) / 1000;

    count++;
    send({ t: 'res', k: m.k, r: m.detail ? detailOf(door, spec, result) : recordOf(door, spec, result, seconds) });
  } catch (error) {
    count++;
    send({ t: 'err', k: m.k, e: String((error as Error).stack ?? error) });
  }

  if (count % gcEvery === 0 || process.memoryUsage().arrayBuffers > gcBytes) {
    gc();
    gcs++;
  }
});

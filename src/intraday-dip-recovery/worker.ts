// A child-process evaluation worker (PROTOCOL.md §13): opens one door (logged), then evaluates run specs into compact
// records. A full GC runs every `gcEvery` evaluations and whenever ArrayBuffers exceed `gcBytes` (Node's old-space
// limit does not cap typed arrays). `killAfter` > 0 (the pilot only): this worker SIGKILLs itself after that many
// evaluations, to prove the pool fails promptly instead of hanging.
import type { DoorKey } from './context.ts';
import { openFullDoor, openPrefixDoor } from './data.ts';
import { type RunSpec, recOf, run, viewOf } from './evaluate.ts';

const [doorKey, purpose, gcEveryText, gcBytesText, killAfterText, guardSha] = process.argv.slice(2) as [
  DoorKey,
  string,
  string,
  string,
  string,
  string | undefined
];
const gcEvery = Number(gcEveryText);
const gcBytes = Number(gcBytesText);
const killAfter = Number(killAfterText);
const started = Date.now();
const door =
  doorKey === 'FULL'
    ? openFullDoor({ frozenSha256: guardSha ?? '', committed: true }, `${purpose} (worker ${process.pid})`)
    : openPrefixDoor(doorKey, `${purpose} (worker ${process.pid})`);
const view = viewOf(door);
let count = 0;
let gcs = 0;
const gc = (globalThis as { gc?: () => void }).gc;
const mem = () => {
  const m = process.memoryUsage();

  return { rss: m.rss, heapUsed: m.heapUsed, heapTotal: m.heapTotal, external: m.external, arrayBuffers: m.arrayBuffers };
};

process.send!({ t: 'ready', mem: mem(), loadMs: Date.now() - started });

process.on('message', (m: { t: string; k?: string; spec?: RunSpec }) => {
  if (m.t === 'exit') process.exit(0);
  if (m.t === 'mem') {
    process.send!({ t: 'mem', mem: mem(), count, gcs });
    return;
  }

  try {
    const r = recOf(run(view, m.spec!));

    count++;
    if (killAfter > 0 && count >= killAfter) process.kill(process.pid, 'SIGKILL');
    if (gc && (count % gcEvery === 0 || process.memoryUsage().arrayBuffers > gcBytes)) {
      gc();
      gcs++;
    }

    process.send!({ t: 'res', k: m.k, r });
  } catch (error) {
    process.send!({ t: 'err', k: m.k, e: (error as Error).stack ?? String(error) });
  }
});

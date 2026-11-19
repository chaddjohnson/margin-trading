// An evaluation worker process (PROTOCOL.md §3.3): opens its door itself, evaluates one configuration per message and
// returns the compact record. After every `gcEvery` evaluations, or when its ArrayBuffers exceed `gcBytes`, it runs a
// full garbage collection: each canonical run allocates ~28 MB of typed arrays (the engine's per-run dataset) that V8
// otherwise lets accumulate to several GB per isolate before collecting (measured; see MEMORY.md).
//
//   node --expose-gc --max-old-space-size=<MiB> worker.ts <door> <gcEvery> <gcBytes> [frozenSha256]
import fs from 'node:fs';
import path from 'node:path';
import { researchDir } from './context.ts';
import { loadDevelopmentDoor, loadFullDoorUnchecked, sha256File } from './data.ts';
import { type DoorData, detailOf, evaluate } from './engine.ts';
import { fixtureDoor } from './fixture.ts';
import type { Config } from './space.ts';

const [doorName = '', gcEveryText, gcBytesText, frozenSha] = process.argv.slice(2);
const gcEvery = Number(gcEveryText);
const gcBytes = Number(gcBytesText);
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

const open = async (): Promise<DoorData> => {
  if (doorName === 'development') return loadDevelopmentDoor();
  if (doorName.startsWith('fixture')) return fixtureDoor(Number(doorName.split(':')[1] ?? 320));
  if (doorName === 'full') {
    const frozen = path.join(researchDir, 'FROZEN_SELECTION.json');

    if (!fs.existsSync(frozen) || sha256File(frozen) !== frozenSha)
      throw new Error('the full door needs the committed frozen selection (its sha256)');

    return loadFullDoorUnchecked();
  }

  throw new Error(`unknown door ${doorName}`);
};

const started = performance.now();
const door = await open();
let count = 0;
let gcs = 0;

gc();
send({ t: 'ready', loadMs: Math.round(performance.now() - started), mem: mem(), sessions: door.history.length });

process.on('message', (m: { t: string; k?: string; c?: Config; detail?: boolean; boundary?: string }) => {
  if (m.t === 'mem') {
    send({ t: 'mem', mem: mem(), count, gcs });
    return;
  }

  if (m.t === 'exit') {
    process.exit(0);
  }

  try {
    const result = m.detail ? detailOf(door, m.c!, m.boundary) : evaluate(door, m.c!);

    count++;
    send({ t: 'res', k: m.k, r: result });
  } catch (error) {
    send({ t: 'err', k: m.k, e: String((error as Error).stack ?? error) });
  }

  if (count % gcEvery === 0 || process.memoryUsage().arrayBuffers > gcBytes) {
    gc();
    gcs++;
  }
});

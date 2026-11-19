// gpu-backend: the door as a host worker sees it. A worker thread receives a structured clone of the evaluation door
// with each symbol's parsed minute history left out (an array of the same length, never read by the batch codec: the
// CPU engine's Datasets and daily signal bars are what encoding, decoding and the record reductions read). The
// Datasets' typed arrays live on SharedArrayBuffers, so the clone shares them with the main thread instead of copying.
// Both sides compute the same digest of everything the codec can read (names, calendar, the Datasets' fields and arrays,
// the signal bars); a worker whose digest differs is refused before it touches a batch.
import { createHash } from 'node:crypto';
import type { Door } from '../vg-d1-growth-joint/data.ts';

export const workerDoorOf = (door: Door): Door => ({
  ...door,
  sym: Object.fromEntries(
    Object.entries(door.sym).map(([s, sd]) => [s, { ...sd, history: new Array(sd.history.length) }])
  ) as Door['sym']
});

export const doorDigest = (door: Door) => {
  const h = createHash('sha256');
  const put = (x: unknown) => h.update(`${JSON.stringify(x)}\n`);

  put({ name: door.name, from: door.from, to: door.to, sessions: door.sessions, dates: door.dates });
  for (const s of Object.keys(door.sym).sort()) {
    const sd = door.sym[s as keyof Door['sym']];

    put({ symbol: sd.symbol, dataSha256: sd.dataSha256, history: sd.history.length, bars: sd.bars });
    for (const [k, v] of Object.entries(sd.ds).sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (ArrayBuffer.isView(v)) {
        put({ k, type: v.constructor.name, bytes: v.byteLength });
        h.update(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
      } else put({ k, v });
    }
  }
  return h.digest('hex');
};

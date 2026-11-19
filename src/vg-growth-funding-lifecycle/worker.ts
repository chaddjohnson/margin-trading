// A child-process evaluator (jobs.ts): opens its door once, evaluates tasks, forces gc() on a schedule (every
// `gcEvery` evaluations or above 256 MiB of ArrayBuffers: Node's heap limit does not bound typed-array garbage).
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { resources } from './context.ts';
import { type DoorKey, openStudyDoor } from './doors.ts';
import { evaluateLife } from './evaluate.ts';
import type { Task } from './jobs.ts';
import { plain } from './records.ts';

let door: Door | null = null;
let done = 0;
const gc = (globalThis as { gc?: () => void }).gc;

const send = (m: unknown) => process.send!(m);

process.on('message', (m: { type: 'init'; door: DoorKey; purpose: string } | { type: 'task'; task: Task }) => {
  if (m.type === 'init') {
    openStudyDoor(m.door, m.purpose).then(
      (d) => {
        door = d;
        send({ type: 'ready', pid: process.pid });
      },
      (e: unknown) => {
        send({ type: 'fatal', message: String((e as Error)?.stack ?? e) });
        process.exit(1);
      }
    );
    return;
  }

  const t = m.task;
  const t0 = Date.now();

  try {
    if (!door || door.name !== t.door) throw new Error(`task ${t.id} needs door ${t.door}, worker has ${door?.name}`);

    const out = evaluateLife(door, t.quad, t.options, t.mode, {
      detail: t.detail,
      boundary: t.boundary ?? null,
      noGuess: t.noGuess
    });

    send({ type: 'result', id: t.id, ms: Date.now() - t0, out: plain(out) });
  } catch (e) {
    send({ type: 'error', id: t.id, message: String((e as Error)?.stack ?? e) });
  }

  done++;
  if (gc && (done % resources.gcEvery === 0 || process.memoryUsage().arrayBuffers > resources.gcArrayBufferBytes)) gc();
});

process.on('disconnect', () => process.exit(0));

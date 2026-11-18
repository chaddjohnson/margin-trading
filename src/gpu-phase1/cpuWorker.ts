// The CPU reference evaluation worker (S1 baseline, S5 benchmarks): Assignment 3's worker (src/vg-l0-full-joint/
// worker.ts) line for line — one door per process, Assignment 3's single evaluation path (vg-l0-risk-families
// `evaluate` = RC 2's controlled D1 books + Priority 3's Growth books, pool and record), the same bounded book caches
// and the same GC cadence (every `gcEvery` evaluations or above `gcBytes` of ArrayBuffers) — except that the door is
// opened through THIS study's quiet loader (no write to Assignment 3's door log).
//
//   node --expose-gc --max-old-space-size=1536 cpuWorker.ts <door> <purpose> <gcEvery> <gcBytes>
import { createHash } from 'node:crypto';
import { booksOf as p3BooksOf, caches } from '../vg-d1-growth-joint/evaluate.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import type { RiskConfig2 } from '../d1-risk-controls-rc2/config.ts';
import { d1Cache2 } from '../d1-risk-controls-rc2/run.ts';
import { evaluate } from '../vg-l0-risk-families/evaluate.ts';
import { type DoorKey, openDoor } from './context.ts';

const [doorName = '', purpose = '', gcEveryText = '64', gcBytesText = String(256 * 2 ** 20)] = process.argv.slice(2);
const gcEvery = Number(gcEveryText);
const gcBytes = Number(gcBytesText);
const gc = (globalThis as { gc?: () => void }).gc;

if (!gc) throw new Error('worker needs --expose-gc');

d1Cache2.capacity = Number(process.env.GPUP1_D1_CACHE ?? 64);

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
const cpu0 = process.cpuUsage();
const started = performance.now();
const door = await openDoor(doorName as DoorKey, `${purpose} (worker)`, false);

let count = 0;
let gcs = 0;
let gcMs = 0;

gc();
send({ t: 'ready', loadMs: Math.round(performance.now() - started), mem: mem(), sessions: door.sessions });

process.on(
  'message',
  (m: {
    t: string;
    k?: string;
    quad?: Quad;
    controls?: RiskConfig2 | null;
    options?: EvalOptions;
    noCache?: boolean;
  }) => {
    if (m.t === 'mem') {
      const c = process.cpuUsage(cpu0);

      send({
        t: 'mem',
        mem: mem(),
        count,
        gcs,
        gcMs,
        cpuUserMs: c.user / 1000,
        cpuSystemMs: c.system / 1000,
        cache: { ...Object.fromEntries(Object.entries(caches).map(([b, x]) => [b, x.size])), d1: d1Cache2.size }
      });
      return;
    }

    if (m.t === 'exit') process.exit(0);

    if (m.noCache) {
      caches['G:VGT'].clear();
      d1Cache2.clear();
    }

    const t0 = performance.now();

    // the hybrid benchmark's CPU half: only the configuration's Growth books (Priority 3's booksOf with the D1 books
    // disabled — the canonical Growth path and its bounded cache), returned as plain virtual trades
    if (m.t === 'growth') {
      try {
        const o = m.options ?? {};
        const books = p3BooksOf(door, m.quad!, { ...o, enabled: { ...o.enabled, 'D1:GDX': false, 'D1:VGT': false } });

        count++;
        send({
          t: 'res',
          k: m.k,
          g: books.map((b) => ({
            book: b.book,
            key: b.key,
            trades: b.trades,
            signals: b.signals,
            firstDecision: b.firstDecision,
            endIndex: b.endIndex,
            standalone: b.standalone
          })),
          ms: performance.now() - t0
        });
      } catch (error) {
        count++;
        send({ t: 'err', k: m.k, e: String((error as Error).stack ?? error) });
      }
      if (count % gcEvery === 0 || process.memoryUsage().arrayBuffers > gcBytes) {
        gc();
        gcs++;
      }
      return;
    }

    try {
      const record = evaluate(door, m.quad!, m.controls ?? null, m.options ?? {});
      const ms = performance.now() - t0;

      count++;
      // the record's hash only (the benchmark compares outputs, it never reads money figures: AD7)
      send({ t: 'res', k: m.k, h: createHash('sha256').update(JSON.stringify(record)).digest('hex').slice(0, 16), ms });
    } catch (error) {
      count++;
      send({ t: 'err', k: m.k, e: String((error as Error).stack ?? error) });
    }

    if (count % gcEvery === 0 || process.memoryUsage().arrayBuffers > gcBytes) {
      const g0 = performance.now();

      gc();
      gcMs += performance.now() - g0;
      gcs++;
    }
  }
);

process.on('disconnect', () => process.exit(0));

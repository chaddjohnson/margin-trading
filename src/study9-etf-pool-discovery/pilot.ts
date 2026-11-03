// Pre-freeze throughput pilot (PROTOCOL.md header): opens the training door on every eligible ETF and times
// universe loading, trace building and pooled replays. It prints and stores counts and timings only — no net,
// drawdown, share, lot count or any other economic quantity — so no design choice can depend on a result.
import fs from 'fs-extra';
import { nowIso, resultFile } from './context.ts';
import { screenDesign, neighbourhood } from './design.ts';
import { openDoor } from './door.ts';
import { S9Evaluator, baseSettings } from './engine.ts';

export const runPilot = async (symbols: readonly string[]) => {
  const t0 = Date.now();
  const door = await openDoor(symbols, 'pre-freeze throughput pilot (timings only)', { key: 'pilot' });
  const loadMs = Date.now() - t0;
  const rss = process.memoryUsage().rss;
  const ev = new S9Evaluator(door);
  const design = screenDesign();
  const sample = symbols.slice(0, 8);
  let t = Date.now();

  for (const symbol of sample) for (const v of design.slice(0, 8)) ev.trace(symbol, v.grid, baseSettings);

  const traceMs = (Date.now() - t) / (sample.length * 8);
  const pools = [sample.slice(0, 2), sample.slice(0, 3), sample.slice(2, 6), sample.slice(3, 8)];
  const replayMs: Record<string, number> = {};
  const freshMs: Record<string, number> = {};

  for (const pool of pools) {
    const books = Object.fromEntries(pool.map((s, i) => [s, design[i]!.grid]));

    t = Date.now();
    for (let r = 0; r < 20; r++) ev.point(books, baseSettings);
    replayMs[`k${pool.length}`] = (Date.now() - t) / 20;

    const points = neighbourhood(books, { name: 'pilot', n: 16, labels: ['pilot', pool.length] });

    t = Date.now();
    for (const p of points) ev.point(p.books, baseSettings);
    freshMs[`k${pool.length}`] = (Date.now() - t) / points.length;
  }

  const out = {
    at: nowIso(),
    members: symbols.length,
    sessions: door.dates.length,
    first: door.dates[0],
    last: door.dates[door.lastIndex],
    loadSeconds: loadMs / 1000,
    rssGbAfterLoad: rss / 1e9,
    rssGbAtEnd: process.memoryUsage().rss / 1e9,
    designVectors: design.length,
    traceMsPerBook: traceMs,
    cachedReplayMsPerPoint: replayMs,
    freshNeighbourMsPerPoint: freshMs
  };

  await fs.outputJson(resultFile('pilot', 'pilot.json'), out, { spaces: 1 });
  console.info(JSON.stringify(out, null, 1));
};

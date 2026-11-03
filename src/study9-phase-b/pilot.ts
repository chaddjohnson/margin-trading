// The pre-freeze TIMING pilot (PROTOCOL.md header): throughput only, on the 2024-12-31 training door of each of the
// seven memberships. It records the universe load time, the per-book trace time and the time per fresh joint
// neighbour of a 16-point rung-1 family on newly drawn pilot vectors ('pilot' labels, never reused). No net, drawdown,
// share or any other economic quantity is computed into the record or printed. It sets no budget: the budgets are
// Study 8's (s(d) scaling); the pilot only informs the number of parallel jobs and the wall-time estimate.
import fs from 'fs-extra';
import { resultFile, trackBooks, trackKeys } from './context.ts';
import { openDoor } from './door.ts';
import { Lab, P9Evaluator, PointCache } from './engine.ts';
import { fitOf, floorsOf } from './fitness.ts';
import { log, nowIso, writeSealed } from './records.ts';
import { lhsBooks } from './space.ts';

export const runPilot = async () => {
  const out = resultFile('pilot', 'pilot.json');

  if (await fs.pathExists(out)) throw new Error(`${out} exists (the pilot runs once)`);

  const rows: Record<string, unknown>[] = [];

  for (const track of trackKeys) {
    const symbols = trackBooks(track);
    const t0 = Date.now();
    const door = await openDoor('pilot', symbols, `timing pilot ${track} (no economic output)`);
    const loadSeconds = (Date.now() - t0) / 1000;
    const ev = new P9Evaluator(door);
    const lab = new Lab(ev, PointCache.memory(door, `pilot-${track}`));
    const floors = floorsOf(ev.yearsOfRun(), 2017, 2024);
    const centres = lhsBooks(6, symbols, ['pilot', track]).books;
    const t1 = Date.now();

    for (const books of centres)
      for (const symbol of symbols)
        ev.trace(symbol, books[symbol]!, { costBps: 5, rate: 0.11, stopFill: 'stop', stopSlippageBps: 0 });

    const traceMs = (Date.now() - t1) / (centres.length * symbols.length);
    const before = lab.computed;
    const t2 = Date.now();

    for (const books of centres)
      fitOf(lab, books, symbols, { name: 'pilot', n: 16, labels: ['pilot-r1', track] }, floors);

    const points = lab.computed - before;
    const neighbourMs = (Date.now() - t2) / Math.max(1, points);
    const memory = process.memoryUsage().rss / 2 ** 30;

    rows.push({ track, books: symbols.length, loadSeconds, traceMs, points, neighbourMs, rssGb: memory });
    log(
      `pilot ${track}: load ${loadSeconds.toFixed(1)} s, trace ${traceMs.toFixed(1)} ms/book, ${neighbourMs.toFixed(1)} ms per fresh neighbour (${points} points)`
    );
  }

  await writeSealed(out, { stage: 'PILOT', at: nowIso(), note: 'timings only; no economic quantity', rows });
};

// The pre-freeze TIMING pilot (PROTOCOL.md §7.1). It reads the pilot-F24 door (2016-01-04 → 2024-12-31) and measures
// throughput and memory only: trace builds per symbol and fresh joint-neighbour evaluations for every track size (8 to
// 40 dimensions) on random pilot-only vectors. It records NO economic figure (no net, drawdown or share is computed into
// the record or printed); precision budgets reuse Study 7's sealed pilot (rank precision of 16/32/128-point
// neighbourhoods), which is cited, not recomputed.
import { bookOrder, resultFile, tracks } from './context.ts';
import { openDoor } from './data.ts';
import { familyDesign } from './designs.ts';
import { Evaluator, baseSettings } from './evaluate.ts';
import { log, nowIso, writeSealed } from './records.ts';
import { lhsBooks, sobolGrids } from './space.ts';

export const runPilot = async () => {
  const started = Date.now();
  const door = await openDoor('pilot-F24', [...bookOrder], 'pre-freeze timing pilot (no economic output)');
  const loadMs = Date.now() - started;
  const ev = new Evaluator(door);
  const timing: Record<string, number> = {};

  for (const symbol of bookOrder) {
    const { grids } = sobolGrids(30, ['pilot', 'timing', symbol]);
    const t0 = performance.now();

    for (const grid of grids) ev.trace(symbol, grid, baseSettings);

    timing[`trace_${symbol}_ms`] = (performance.now() - t0) / grids.length;
  }

  for (const [track, spec] of Object.entries(tracks)) {
    const symbols = [...spec.books] as string[];
    const centre = lhsBooks(1, symbols, ['pilot', 'centre', track]).books[0]!;
    const points = familyDesign(centre, symbols, { n: 24, labels: ['pilot', 'timing-nbhd', track] });
    const t0 = performance.now();

    for (const point of points) ev.replay(point.books); // fresh traces for every perturbed book; results discarded

    timing[`neighbour_${track}_${symbols.length * 8}D_ms`] = (performance.now() - t0) / points.length;
  }

  const record = await writeSealed(resultFile('pilot', 'pilot.json'), {
    stage: 'PILOT_TIMING',
    at: nowIso(),
    door: { key: door.key, id: door.id, last: door.dates[door.lastIndex], sessions: door.dates.length },
    yearsOfRun: ev.yearsOfRun(),
    loadMs,
    rssMb: Math.round(process.memoryUsage().rss / 1e6),
    timing,
    note: 'timing only; no economic figure computed into this record or printed',
    seconds: (Date.now() - started) / 1000
  });

  log(`timing pilot: ${JSON.stringify(timing)}; ${record.file} ${record.bodyHash.slice(0, 12)}`);
};

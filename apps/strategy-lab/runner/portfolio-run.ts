// The Strategy Lab pooled-candidate runner (Priority 6; evaluation windows 2026-11-27): ONE replay of ONE frozen catalog
// candidate over ONE window, started by the server as a child process with a fixed argument vector:
//
//   node --no-maglev --experimental-transform-types runner/portfolio-run.ts <absolute work directory>
//
// cwd must be the repository root. It reads <work>/request.json (written by the server: the replay id, the candidate id,
// the catalog entry's sha256 and the window request), checks the entry against the committed catalog, plans the window
// with the shared manual-evaluation module (src/manual-eval/execute.ts, the same plan, door and period attribution as
// `npm run manual-eval`):
//   research  Priority 3's FULL door (2016-01-04 → 2026-10-30, the canonical data as their pinned byte prefixes); the
//             figures are checked against the archived targets;
//   all       2016-01-04 → the latest common complete session of VGT and GDX (src/manual-eval/door.ts);
//   custom    [from, to], continuous (one run from 2016-01-04, [from, to] the reporting window) or isolated (flat at from).
// A continuous run that is not the research window is also replayed on FULL and must equal it decision for decision over
// their common span. The replay goes through the research engine (runner/portfolio-bridge.ts) and writes events.json,
// positions.json, equity.json, metrics.json and provenance.json. It fails if the entry changed, the data differ from the
// pins, the window is outside the local data, or any reconciliation fails. Never a formal stage: a window past the
// research validation end is a manual post-validation evaluation.

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type ManualRunRequest, openPlanDoor, planManualRun, researchPlan, researchReference } from '../../../src/manual-eval/execute.ts';
import { p3 } from '../../../src/vg-d1-growth-diagnostic/context.ts';
import { frozenSelectionFile } from '../../../src/vg-d1-growth-joint/context.ts';
import { DEFAULT_CUSTOM_EXECUTION, PORTFOLIO_REPLAY_FORMAT, type PortfolioWindowRequest, REPLAY_ID_RE, normalizeWindowRequest, windowRequestText } from '../shared/portfolio.ts';
import { atomicWrite, writeEvents } from '../server/artifacts.ts';
import { type ReplayOptions, replayCandidate } from './portfolio-bridge.ts';
import { readCatalog } from './portfolio-catalog-read.ts';
import { requireEngineRuntime } from '../../../src/gpu-backend/runtime.ts';

// never under V8's Maglev compiler (GPU Phase 6; the server starts runners with NODE_FLAGS, server/jobs.ts)
requireEngineRuntime('the Strategy Lab runner portfolio-run');

const emit = (o: Record<string, unknown>) => process.stdout.write(`${JSON.stringify(o)}\n`);
const progress = (message: string, fraction: number | null = null) => emit({ type: 'progress', message, fraction });

export interface PortfolioReplayRequest {
  kind: 'pooled-candidate-replay';
  format: number;
  replayId: string;
  candidateId: string;
  entrySha256: string;
  /** Absent in a format-1 request: the research window. */
  window?: PortfolioWindowRequest;
}

const manualRequestOf = (w: PortfolioWindowRequest): ManualRunRequest =>
  w.mode === 'custom' ? { mode: 'custom', from: w.from, to: w.to, execution: w.execution } : { mode: w.mode };

async function main() {
  const work = process.argv[2];
  if (!work) throw new Error('usage: portfolio-run.ts <work directory>');
  const request = JSON.parse(readFileSync(join(work, 'request.json'), 'utf8')) as PortfolioReplayRequest;
  if (request.kind !== 'pooled-candidate-replay' || request.format !== PORTFOLIO_REPLAY_FORMAT)
    throw new Error(`not a pooled-candidate replay request (${String(request.kind)} v${String(request.format)})`);
  if (!REPLAY_ID_RE.test(request.replayId)) throw new Error('invalid replay id');
  const appRoot = fileURLToPath(new URL('..', import.meta.url));
  const repoRoot = join(appRoot, '..', '..');
  const entry = readCatalog(repoRoot).candidates.find((c) => c.id === request.candidateId);
  if (!entry) throw new Error(`unknown candidate ${request.candidateId}`);
  if (entry.entrySha256 !== request.entrySha256) throw new Error(`catalog entry ${entry.id} changed since the request`);

  const window = normalizeWindowRequest(request.window);
  const plan = planManualRun(manualRequestOf(window), DEFAULT_CUSTOM_EXECUTION);
  const purpose = `Strategy Lab pooled-candidate replay ${entry.id}, ${windowRequestText(window)} (read-only; manual evaluation)`;
  const t0 = Date.now();
  // The research-window reference of a continuous non-research run (FULL, the archived benchmark).
  let reference: ReplayOptions['reference'];
  if (researchReference(plan)) {
    progress('loading the research window (FULL door, 2016-01-04 → 2026-10-30) for the trajectory check', 0.05);
    const rp = researchPlan();
    const fullDoor = await openPlanDoor(rp, purpose);
    progress(`replaying ${entry.name} on the research window (reference)`, 0.35);
    const ref = replayCandidate(fullDoor, entry, request.replayId, { plan: rp });
    reference = { evaluation: ref.evaluation, parity: ref.metrics.parity };
  }
  progress(
    `loading the canonical VGT and GDX minute data (${plan.simulation.from} → ${plan.simulation.to}${window.mode === 'research' ? ', FULL door' : ''})`,
    reference ? 0.45 : 0.05
  );
  const door = await openPlanDoor(plan, purpose);
  if (window.mode === 'research' && door.name !== 'FULL') throw new Error(`the research window must be the FULL door, not ${door.name}`);
  const loadMs = Date.now() - t0;
  progress(`replaying ${entry.name}: the research engine, one shared $100,000 pool`, 0.75);
  const t1 = Date.now();
  const a = replayCandidate(door, entry, request.replayId, { plan, reference });
  const replayMs = Date.now() - t1;
  progress('writing the replay artifacts', 0.95);
  const json = (o: unknown) => `${JSON.stringify(o)}\n`;
  const eventsSha = writeEvents(work, request.replayId, a.events);
  atomicWrite(join(work, 'positions.json'), json({ replayId: request.replayId, positions: a.positions }));
  atomicWrite(join(work, 'equity.json'), json({ replayId: request.replayId, ...a.equity }));
  atomicWrite(join(work, 'metrics.json'), json(a.metrics));
  atomicWrite(
    join(work, 'provenance.json'),
    json({
      request,
      candidate: { id: entry.id, name: entry.name, entrySha256: entry.entrySha256 },
      window: { requested: window, execution: plan.execution, label: plan.label, simulation: a.metrics.window.simulation, reporting: a.metrics.window.reporting, coverage: plan.reporting.endpoint },
      door: { name: door.name, from: door.from, to: door.to, sessions: door.sessions },
      data: { VGT: door.sym.VGT.dataSha256, GDX: door.sym.GDX.dataSha256 },
      basisBySymbol: Object.fromEntries(entry.symbols.map((s) => [s, door.from])),
      engine: {
        path: entry.engine.path,
        kind: entry.engine.kind ?? 'runLife-L0',
        door: entry.engine.door,
        options: entry.engine.options,
        guard: { file: relative(repoRoot, frozenSelectionFile), sha256: p3.frozenSelectionSha256 }
      },
      timing: { loadMs, replayMs },
      node: process.version
    })
  );
  emit({ type: 'done', events: a.events.length, eventsSha256: eventsSha, parity: a.metrics.parity.status });
}

main().catch((e: unknown) => {
  emit({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  process.exitCode = 1;
});

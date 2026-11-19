// The Strategy Lab pooled-candidate runner (Priority 6): ONE replay of ONE frozen catalog candidate, started by the
// server as a child process with a fixed argument vector:
//
//   node --experimental-transform-types runner/portfolio-run.ts <absolute work directory>
//
// cwd must be the repository root. It reads <work>/request.json (written by the server: the replay id, the candidate id
// and the catalog entry's sha256), checks the entry against the committed catalog, opens Priority 3's FULL door
// (2016-01-04 → 2026-10-30, the canonical data pinned by sha256; read-only, no door log), replays the candidate through
// the research engine (runner/portfolio-bridge.ts) and writes events.json, positions.json, equity.json, metrics.json and
// provenance.json. It fails if the entry changed, the data differ from the pins, or any reconciliation fails.

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { p3 } from '../../../src/vg-d1-growth-diagnostic/context.ts';
import { frozenSelectionFile } from '../../../src/vg-d1-growth-joint/context.ts';
import { openFullDoor } from '../../../src/vg-d1-growth-joint/data.ts';
import { PORTFOLIO_REPLAY_FORMAT, REPLAY_ID_RE } from '../shared/portfolio.ts';
import { atomicWrite, writeEvents } from '../server/artifacts.ts';
import { replayCandidate } from './portfolio-bridge.ts';
import { readCatalog } from './portfolio-catalog-read.ts';

const emit = (o: Record<string, unknown>) => process.stdout.write(`${JSON.stringify(o)}\n`);
const progress = (message: string, fraction: number | null = null) => emit({ type: 'progress', message, fraction });

export interface PortfolioReplayRequest {
  kind: 'pooled-candidate-replay';
  format: number;
  replayId: string;
  candidateId: string;
  entrySha256: string;
}

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

  progress('loading the canonical VGT and GDX minute data (FULL door, 2016-01-04 → 2026-10-30)', 0.05);
  const t0 = Date.now();
  const door = await openFullDoor(
    `Strategy Lab pooled-candidate replay ${entry.id} (read-only)`,
    { file: frozenSelectionFile, sha256: p3.frozenSelectionSha256 },
    true
  );
  const loadMs = Date.now() - t0;
  progress(`replaying ${entry.name}: the research engine, one shared $100,000 pool`, 0.7);
  const t1 = Date.now();
  const a = replayCandidate(door, entry, request.replayId);
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
      door: { name: door.name, from: door.from, to: door.to, sessions: door.sessions },
      data: { VGT: door.sym.VGT.dataSha256, GDX: door.sym.GDX.dataSha256 },
      basisBySymbol: Object.fromEntries(entry.symbols.map((s) => [s, door.from])),
      engine: {
        path: entry.engine.path,
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

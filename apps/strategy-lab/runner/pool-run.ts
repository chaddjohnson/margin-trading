// The Strategy Lab shared-slot pool runner: ONE rerun of ONE sealed Study 8 phenotype (a catalogue phenotype of
// execution kind `shared-slot pool`), started by the server as a child process with a fixed argument vector:
//
//   node --experimental-transform-types runner/pool-run.ts <absolute run directory>
//
// cwd must be the repository root. It reads <run dir>/request.json (built and validated by the server from the frozen
// phenotype: the sealed alias and id, the end date, the sealed 5 bps), and runs the UNCHANGED Study 8 local runner
// (src/study8-runners/: resolveAlias → runFor → the pools engine, one funded $100,000 slot, shadow books, first
// executable signal wins) into <run dir>/study8/. Nothing of Study 8 is modified or re-implemented: no new allocator,
// no per-symbol standalone backtests, no summing. The runner's lots.json and the refused decisions of signals.csv are
// turned into contract events by the importer's own conversion (importers/study8.ts study8Events), so a rerun to the
// sealed end equals the imported vg-balanced run event for event. The run FAILS if the Study 8 export check fails, if
// the replay is reconcilable with the sealed record but does not reconcile, or if a granted decision has no lot.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveAlias } from '../../../src/study8-runners/resolve.ts';
import { runFor } from '../../../src/study8-runners/run.ts';
import { type Lot, parseCsv, study8Events } from '../importers/study8.ts';
import { atomicWrite, writeEvents } from '../server/artifacts.ts';

const emit = (o: Record<string, unknown>) => process.stdout.write(`${JSON.stringify(o)}\n`);
const progress = (message: string, fraction: number | null = null) => emit({ type: 'progress', message, fraction });
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

export interface PoolRerunRequest {
  runId: string;
  kind: 'study8-pool-rerun';
  strategyKey: 'study8-d1-pool';
  strategyVersion: 'pools-engine';
  phenotypeId: string;
  alias: string;
  sealedId: string;
  end: string;
  costBps: number;
  symbols: string[];
}

async function main() {
  const runDir = process.argv[2];
  if (!runDir) throw new Error('usage: pool-run.ts <run directory>');
  const request = JSON.parse(readFileSync(join(runDir, 'request.json'), 'utf8')) as PoolRerunRequest;
  if (request.kind !== 'study8-pool-rerun' || request.strategyKey !== 'study8-d1-pool')
    throw new Error(`not a Study 8 pool rerun request (${request.kind})`);
  if (!/^s8-[a-z0-9-]{1,40}$/.test(request.alias)) throw new Error(`refusing alias ${request.alias}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.end)) throw new Error('end: YYYY-MM-DD');

  progress(`resolving ${request.alias} from the sealed Study 8 records`, 0.05);
  const resolved = await resolveAlias(request.alias);
  if (resolved.sealedId !== request.sealedId)
    throw new Error(`${request.alias} resolves to ${resolved.sealedId}, not the phenotype's sealed ${request.sealedId}`);

  const outDir = join(runDir, 'study8');
  progress('running the unchanged Study 8 runner: the pools engine, one funded $100,000 slot', 0.15);
  const outcome = await runFor(resolved, { end: request.end, costBps: request.costBps, outDir });
  if (!outcome.exports.pass) throw new Error('the Study 8 runner’s export check failed');
  const rec = outcome.reconciliation as { applicable: boolean; pass?: boolean; reason?: string; scope?: string };
  if (rec.applicable && rec.pass !== true) throw new Error('the replay does not reconcile with the sealed Study 8 record');

  progress('converting the runner’s lots and funding decisions into events', 0.85);
  const runner = JSON.parse(readFileSync(join(outDir, 'runner.json'), 'utf8'));
  const lotsFile = JSON.parse(readFileSync(join(outDir, 'lots.json'), 'utf8')) as {
    lots: Lot[];
    unavailable: Record<string, string>;
  };
  const signals = parseCsv(readFileSync(join(outDir, 'signals.csv'), 'utf8'));
  const lots = lotsFile.lots;
  const granted = signals.filter((s) => s.outcome === 'granted');
  const refused = signals.filter((s) => s.outcome === 'refused');
  if (granted.length !== lots.length)
    throw new Error(`signals.csv has ${granted.length} granted decisions for ${lots.length} lots`);
  granted.forEach((g, i) => {
    const l = lots[i]!;
    if (g.symbol !== l.symbol || g.decisionUtc !== l.decisionTimeUtc)
      throw new Error(`granted decision ${i + 1} (${g.symbol} ${g.decisionUtc}) ≠ lot ${l.trade} decision`);
  });
  const symbols = Object.keys(runner.vectorIds as Record<string, string>).sort();
  if (JSON.stringify(symbols) !== JSON.stringify([...request.symbols].sort()))
    throw new Error(`the pool's books ${symbols.join('+')} differ from the request's symbols`);

  const { events, bySymbol } = study8Events(request.runId, lots, refused, symbols);
  const eventsSha = writeEvents(runDir, request.runId, events);
  const s = runner.summary;
  const json = (o: unknown) => `${JSON.stringify(o, null, 2)}\n`;
  atomicWrite(
    join(runDir, 'metrics.json'),
    json({
      kind: 'pool rerun',
      disclaimer: String(runner.label),
      semantics:
        'ONE allocator replay of the sealed Study 8 phenotype: one shared funded $100,000 slot across its books (first executable signal wins, no preemption). The per-symbol figures are the books’ lots inside that one pool, never independent backtests, and are never summed into anything else.',
      source: 'Study 8 local runner (unchanged), runner.json summary',
      reconciliation: rec.applicable
        ? { applicable: true, pass: rec.pass, scope: rec.scope }
        : { applicable: false, reason: rec.reason },
      trades: {
        net: s.net,
        realized: s.realized,
        unrealized: s.unrealized,
        interest: s.interest,
        friction: s.friction,
        lots: lots.length,
        openLots: lots.filter((l) => l.status === 'open').length,
        refusedSignals: refused.length
      },
      drawdown: { minuteUsd: s.maxDrawdown ?? null },
      perSymbol: bySymbol,
      unavailable: lotsFile.unavailable
    })
  );
  const files = Object.fromEntries(
    readdirSync(outDir)
      .sort()
      .map((f) => [f, sha(join(outDir, f))])
  );
  atomicWrite(join(runDir, 'study8-output.json'), json({ directory: 'study8/', sha256: files }));
  const appRoot = fileURLToPath(new URL('..', import.meta.url));
  const repoRoot = join(appRoot, '..', '..');
  atomicWrite(
    join(runDir, 'provenance.json'),
    json({
      request,
      basisBySymbol: Object.fromEntries(symbols.map((x) => [x, runner.window.first])),
      window: runner.window,
      study8: runner.study8,
      sealedId: runner.sealedId,
      config: runner.config,
      phenotypeFiles: runner.phenotypeFiles,
      dataFiles: runner.dataFiles,
      reproducibility: runner.reproducibility,
      conventions: runner.conventions,
      engine: { runner: 'src/study8-runners (unchanged)', strategyLab: 'apps/strategy-lab/runner/pool-run.ts' },
      node: process.version
    })
  );
  emit({ type: 'done', events: events.length, eventsSha256: eventsSha, runDir: relative(repoRoot, runDir) });
}

main().catch((e: unknown) => {
  emit({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  process.exitCode = 1;
});

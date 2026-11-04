// Imports a Study 8 local-runner output (npm run study8-run -- run <alias> --end 2026-10-29 --out <dir>) into Strategy
// Lab as a read-only run with real entry AND exit events. Read-only towards every strategy: it only reads the runner's
// files and the study's sealed records. It refuses unless:
//   1. the runner reconciled the run with the sealed F24 test record (runner.json reconciliation: applicable, pass, no
//      lot mismatches) — i.e. the replay reproduced the frozen result trade by trade;
//   2. an INDEPENDENT check here agrees: lot count, and every lot's symbol, New York entry/exit minute and net (to the
//      cent) against research/study8-expanded-regime-d1/results/test/F24/test-lots.jsonl.gz;
//   3. every granted funding decision in signals.csv matches a lot's decision (symbol and minute).
// Usage: node --experimental-transform-types apps/strategy-lab/importers/study8.ts <runner output dir> [--force-new]

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

import type { LabEvent, LabValue } from '../shared/contract.ts';
import { validateEvents } from '../shared/validate-events.ts';
import { atomicWrite, runDirName, writeEvents, writeManifest } from '../server/artifacts.ts';
import { type Config, loadConfig } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { Repo } from '../server/repo.ts';

const SEALED_LOTS = 'research/study8-expanded-regime-d1/results/test/F24/test-lots.jsonl.gz';

interface Lot {
  trade: number;
  lot: number;
  symbol: string;
  status: 'closed' | 'open';
  entrySetup: string;
  decisionTimeUtc: string;
  decisionPrice: number;
  entryTimeUtc: string;
  entryTimeNewYork: string;
  entryFillReason: string;
  entryFillPrice: number;
  entryPriceAfterFriction: number;
  shares: number;
  principal: number;
  exitTimeUtc: string;
  exitTimeNewYork: string;
  exitReason: string;
  exitFillReason: string;
  exitFillPrice: number | '';
  asOfSession: string;
  asOfMarkPrice: number | '';
  sessionsHeld: number;
  grossPnl: number;
  totalFriction: number;
  marginInterest: number;
  net: number;
  maeDollars: number;
  maeTimeUtc: string;
  mfeDollars: number | '';
  mfeStatus: string;
  sameMinuteCandidates: number;
  signalsRefusedWhileHeld: number;
}

interface SealedLot {
  symbol: string;
  entry: string;
  exit: string;
  net: number;
  open: boolean;
}

export interface ImportReport {
  runId: string;
  alias: string;
  lots: number;
  entries: number;
  exits: number;
  rejected: number;
  bySymbol: Record<string, { entries: number; exits: number; rejected: number }>;
  checks: string[];
}

const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const isoZ = (s: string) => new Date(s).toISOString().replace('.000Z', 'Z');

function parseCsv(text: string): Record<string, string>[] {
  const [head, ...lines] = text.trim().split('\n');
  const cols = head!.split(',');
  return lines.map((l) => {
    const cells = l.split(',');
    if (cells.length !== cols.length) throw new Error(`signals.csv: unexpected row ${l}`);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]!]));
  });
}

export function importStudy8(
  cfg: Config,
  repo: Repo,
  sourceDir: string,
  opts: { forceNew?: boolean } = {}
): ImportReport {
  const dir = isAbsolute(sourceDir) ? sourceDir : resolve(process.cwd(), sourceDir);
  for (const f of ['runner.json', 'lots.json', 'signals.csv'])
    if (!existsSync(join(dir, f))) throw new Error(`${dir} has no ${f}: not a Study 8 runner output`);
  const runner = JSON.parse(readFileSync(join(dir, 'runner.json'), 'utf8'));
  const lotsFile = JSON.parse(readFileSync(join(dir, 'lots.json'), 'utf8')) as {
    lots: Lot[];
    unavailable: Record<string, string>;
  };
  const signals = parseCsv(readFileSync(join(dir, 'signals.csv'), 'utf8'));
  const lots = lotsFile.lots;
  const checks: string[] = [];

  // 1. The runner's own reconciliation with the sealed record.
  if (runner.kind !== 'study8-local-run' || typeof runner.alias !== 'string' || !runner.alias.startsWith('s8-'))
    throw new Error('not a Study 8 alias run');
  const rec = runner.reconciliation;
  if (!rec?.applicable || rec.pass !== true || !Array.isArray(rec.lots?.mismatches) || rec.lots.mismatches.length !== 0)
    throw new Error(
      `the runner did not reconcile this run with the sealed record (applicable ${rec?.applicable}, pass ${rec?.pass}); refusing to import an unverified replay`
    );
  checks.push(
    `runner reconciliation: ${rec.scope}; ${rec.lots.compared} lots compared, 0 mismatches; source ${rec.source}`
  );

  // 2. Independent check against the sealed lot ledger.
  const sealedPath = join(cfg.repoRoot, SEALED_LOTS);
  const holders = gunzipSync(readFileSync(sealedPath))
    .toString('utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { who: string; lots: SealedLot[] });
  const holder = holders.find((h) => h.who.endsWith(`/${runner.sealedId}`));
  if (!holder) throw new Error(`the sealed record has no holder ${runner.sealedId}`);
  if (holder.lots.length !== lots.length) throw new Error(`lot count ${lots.length} ≠ sealed ${holder.lots.length}`);
  lots.forEach((l, i) => {
    const s = holder.lots[i]!;
    const entry = l.entryTimeNewYork.replace(/ ET$/, '');
    const exit = l.status === 'open' ? '' : l.exitTimeNewYork.replace(/ ET$/, '');
    if (
      s.symbol !== l.symbol ||
      s.entry !== entry ||
      s.exit !== exit ||
      Math.abs(s.net - l.net) > 0.005 ||
      s.open !== (l.status === 'open')
    )
      throw new Error(
        `lot ${i + 1} differs from the sealed record (${l.symbol} ${entry}→${exit} ${l.net} vs ${s.symbol} ${s.entry}→${s.exit} ${s.net})`
      );
  });
  checks.push(
    `independent check: ${lots.length} lots match ${SEALED_LOTS} holder ${holder.who} (symbol, NY entry/exit minute, net to the cent, open flag)`
  );

  // 3. Funding decisions: granted ↔ lots.
  const granted = signals.filter((s) => s.outcome === 'granted');
  const refused = signals.filter((s) => s.outcome === 'refused');
  if (granted.length !== lots.length)
    throw new Error(`signals.csv has ${granted.length} granted decisions for ${lots.length} lots`);
  granted.forEach((g, i) => {
    const l = lots[i]!;
    if (g.symbol !== l.symbol || g.decisionUtc !== l.decisionTimeUtc)
      throw new Error(
        `granted decision ${i + 1} (${g.symbol} ${g.decisionUtc}) ≠ lot ${l.trade} decision (${l.symbol} ${l.decisionTimeUtc})`
      );
  });
  if (signals.some((s) => s.outcome !== 'granted' && s.outcome !== 'refused'))
    throw new Error('signals.csv: unknown outcome');
  checks.push(
    `signals.csv: ${granted.length} granted decisions match the lots' decisions; ${refused.length} refused decisions recorded`
  );

  const sources = {
    'runner.json': sha(join(dir, 'runner.json')),
    'lots.json': sha(join(dir, 'lots.json')),
    'signals.csv': sha(join(dir, 'signals.csv')),
    [SEALED_LOTS]: sha(sealedPath)
  };
  const dup = repo.db
    .prepare("SELECT public_id FROM runs WHERE kind = 'import' AND provenance_json LIKE ?")
    .get(`%${sources['lots.json']}%`) as { public_id: string } | undefined;
  if (dup && !opts.forceNew) throw new Error(`already imported as ${dup.public_id} (pass --force-new to import again)`);

  const symbols = Object.keys(runner.vectorIds as Record<string, string>).sort();
  const exp = repo.ensureExperiment(
    'study8-imports',
    'Study 8 imports',
    'Read-only imports of Study 8 local-runner replays (reconciled with the sealed F24 record).'
  );
  const strat = repo.ensureStrategy({
    key: 'study8-d1-pool',
    version: 'pools-engine',
    title: 'Study 8 D1 shared-slot pool (pools engine)',
    kind: 'trades',
    runnable: false,
    description:
      'D1 books on one funded $100,000 slot (src/study8-runners/, src/portfolio-aware-d1/nbook/). Imported, not executable from Strategy Lab.',
    params: null,
    sourceRef: 'src/study8-runners/'
  });
  const params: LabValue[] = [
    { key: 'sealedId', label: 'Sealed configuration', value: runner.sealedId, unit: 'text' },
    {
      key: 'config',
      label: 'Research pool config',
      value: `${runner.config.file} (sha256 ${String(runner.config.sha256).slice(0, 12)}…)`,
      unit: 'text'
    },
    ...Object.entries(runner.books as Record<string, Record<string, number>>).flatMap(([sym, book]) =>
      Object.entries(book).map(([k, v]) => ({
        key: `${sym}.${k}`,
        label: `${sym} ${k} (engine encoding)`,
        value: v,
        unit: 'index' as const
      }))
    )
  ];
  const variation = repo.findOrCreateVariation({
    strategyId: strat.id,
    experimentId: exp.id,
    params,
    canonical: String(runner.sealedId),
    title: `Study 8 #${runner.trainingRank} ${String(runner.study8?.track ?? '')} ${String(runner.study8?.role ?? '')} — ${runner.sealedId}`,
    origin: 'import',
    parentVariationId: null
  });
  const c = runner.conventions;
  const assumptions: LabValue[] = [
    {
      key: 'mode',
      label: 'Pool mode',
      value: `${c.mode}, policy ${c.policy}, ${c.fundedSlots} funded slot, $${c.notionalPerTrade} per trade, compounding ${c.compounding}`,
      unit: 'text'
    },
    { key: 'cost', label: 'Friction (bps per side)', value: c.costBpsPerSide, unit: 'count' },
    { key: 'interest', label: 'Margin interest', value: `${c.annualRate * 100}% ${c.interestMethod}`, unit: 'text' },
    { key: 'stops', label: 'Stop fills', value: `${c.stopFill}, slippage ${c.stopSlippageBps} bps`, unit: 'text' },
    {
      key: 'units',
      label: 'Price units',
      value: 'first-session share units (VGT 8:1 split on 2026-04-21 forward-adjusted)',
      unit: 'text'
    },
    { key: 'label', label: 'Status', value: String(runner.label), unit: 'text' }
  ];

  const run = repo.createRun({
    variationId: variation.id,
    title: `vg-balanced (${runner.alias}) — Study 8 #${runner.trainingRank} replay to ${runner.window.last}`,
    kind: 'import',
    status: 'running',
    dataOrigin: 'real',
    symbols,
    window: {
      from: runner.window.first,
      to: runner.window.last,
      resolution: '1m',
      partition: 'all (trained 2016–2024; one-time test 2025-01-02 → 2026-10-29)'
    },
    params,
    assumptions,
    request: null,
    priceSource: { kind: 'market', basisDate: runner.window.first },
    provenance: {
      importedFrom: relative(cfg.repoRoot, dir),
      sourceSha256: sources,
      alias: runner.alias,
      sealedId: runner.sealedId,
      study8: runner.study8,
      runnerReproducibility: runner.reproducibility,
      reconciliation: { scope: rec.scope, source: rec.source, lotsCompared: rec.lots.compared, pass: rec.pass },
      checks,
      unavailable: lotsFile.unavailable
    },
    codeRevision: null
  });

  try {
    return finishImport();
  } catch (e) {
    repo.finishUnsuccessfully(run.id, 'failed', `Import failed: ${(e as Error).message}`, null);
    throw e;
  }

  function finishImport(): ImportReport {
    const events: LabEvent[] = [];
    const bySymbol: ImportReport['bySymbol'] = Object.fromEntries(
      symbols.map((s) => [s, { entries: 0, exits: 0, rejected: 0 }])
    );
    for (const l of lots) {
      const tradeId = `T-${l.trade}`;
      const entryId = `${l.symbol}:${tradeId}:entry`;
      const exitId = `${l.symbol}:${tradeId}:exit`;
      const open = l.status === 'open';
      events.push({
        id: entryId,
        runId: run.publicId,
        symbol: l.symbol,
        kind: 'executed_entry',
        t: isoZ(l.entryTimeUtc),
        timePrecision: 'minute',
        timeMeaning:
          'start of the minute bar the engine filled in (fills at minute-bar prices); decision at the end of the signal minute',
        price: l.entryFillPrice,
        priceBasis: 'fill',
        reason: `${l.entrySetup} setup; ${l.entryFillReason}`,
        values: [
          { key: 'decisionTime', label: 'Decision time', value: isoZ(l.decisionTimeUtc), unit: 'datetime' },
          { key: 'decisionPrice', label: 'Decision price', value: l.decisionPrice, unit: 'price' },
          {
            key: 'priceAfterFriction',
            label: 'Entry price after friction',
            value: l.entryPriceAfterFriction,
            unit: 'price'
          },
          { key: 'shares', label: 'Shares (first-session units)', value: l.shares, unit: 'count' },
          { key: 'principal', label: 'Principal', value: l.principal, unit: 'usd' },
          {
            key: 'sameMinuteCandidates',
            label: 'Same-minute candidates',
            value: l.sameMinuteCandidates,
            unit: 'count'
          },
          {
            key: 'refusedWhileHeld',
            label: 'Signals refused while held',
            value: l.signalsRefusedWhileHeld,
            unit: 'count'
          }
        ],
        tradeId,
        linkedEventId: open ? null : exitId,
        meta: { lot: l.lot, open, entrySetup: l.entrySetup }
      });
      bySymbol[l.symbol]!.entries++;
      if (open) continue;
      events.push({
        id: exitId,
        runId: run.publicId,
        symbol: l.symbol,
        kind: 'executed_exit',
        t: isoZ(l.exitTimeUtc),
        timePrecision: 'minute',
        timeMeaning: 'start of the minute bar the engine filled in (fills at minute-bar prices)',
        price: l.exitFillPrice === '' ? null : l.exitFillPrice,
        priceBasis: l.exitFillPrice === '' ? 'unknown' : 'fill',
        reason: `${l.exitReason}; ${l.exitFillReason}`,
        values: [
          { key: 'net', label: 'Net P&L of the lot (as reported)', value: l.net, unit: 'usd' },
          { key: 'gross', label: 'Gross P&L', value: l.grossPnl, unit: 'usd' },
          { key: 'interest', label: 'Margin interest', value: l.marginInterest, unit: 'usd' },
          { key: 'friction', label: 'Friction', value: l.totalFriction, unit: 'usd' },
          { key: 'sessionsHeld', label: 'Sessions held', value: l.sessionsHeld, unit: 'sessions' },
          { key: 'mae', label: 'MAE (engine marks)', value: l.maeDollars, unit: 'usd' },
          { key: 'mfe', label: `MFE (${l.mfeStatus})`, value: l.mfeDollars === '' ? null : l.mfeDollars, unit: 'usd' }
        ],
        tradeId,
        linkedEventId: entryId,
        meta: { lot: l.lot, exitReason: l.exitReason }
      });
      bySymbol[l.symbol]!.exits++;
    }
    for (const [i, s] of refused.entries()) {
      events.push({
        id: `${s.symbol}:rejected:${i + 1}`,
        runId: run.publicId,
        symbol: s.symbol!,
        kind: 'rejected_signal',
        t: isoZ(s.decisionUtc!),
        timePrecision: 'minute',
        timeMeaning: 'end of the signal minute (the funding decision); not executed',
        price: null,
        priceBasis: 'unknown',
        reason: `Refused: ${s.reason || 'no reason recorded'}${s.occupiedBy ? ` (slot held by lot ${s.occupiedBy})` : ''}`,
        values: [
          { key: 'phenotype', label: 'Book', value: s.phenotype ?? null, unit: 'text' },
          { key: 'repeatedRefusals', label: 'Repeated refusals', value: Number(s.repeatedRefusals ?? 0), unit: 'count' }
        ],
        tradeId: null,
        linkedEventId: null,
        meta: { occupiedBy: s.occupiedBy || null }
      });
      bySymbol[s.symbol!]!.rejected++;
    }
    const errors = validateEvents(events, run.publicId, symbols);
    if (errors.length) throw new Error(`imported events violate the contract: ${errors.slice(0, 3).join('; ')}`);

    const relDir = runDirName(run.publicId);
    const runDir = join(cfg.stateDir, relDir);
    const eventsSha = writeEvents(runDir, run.publicId, events);
    const s = runner.summary;
    const metrics = {
      kind: 'imported trades',
      disclaimer: String(runner.label),
      source: 'Study 8 local runner summary (runner.json), reconciled with the sealed F24 record',
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
      perSymbol: bySymbol
    };
    atomicWrite(join(runDir, 'metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`);
    atomicWrite(
      join(runDir, 'import.json'),
      `${JSON.stringify({ sourceDir: relative(cfg.repoRoot, dir), sources, checks }, null, 2)}\n`
    );
    writeManifest(runDir, ['events.json', 'metrics.json', 'import.json']);
    repo.complete(run.id, {
      eventCount: events.length,
      artifactDir: relDir,
      artifactSha256: eventsSha,
      metrics,
      provenance: repo.runDetail(run.publicId)!.provenance,
      priceSource: { kind: 'market', basisDate: runner.window.first }
    });
    return {
      runId: run.publicId,
      alias: runner.alias,
      lots: lots.length,
      entries: lots.length,
      exits: lots.filter((l) => l.status !== 'open').length,
      rejected: refused.length,
      bySymbol,
      checks
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir) {
    console.error('usage: importers/study8.ts <Study 8 runner output dir> [--force-new]');
    process.exit(2);
  }
  const cfg = loadConfig();
  const db = openDb(cfg.dbFile);
  try {
    const report = importStudy8(cfg, new Repo(db), dir, { forceNew: args.includes('--force-new') });
    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(`import refused: ${(e as Error).message}`);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

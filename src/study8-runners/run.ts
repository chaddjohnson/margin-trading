// Running resolved Study 8 aliases through the UNCHANGED pools engine: loadPoolUniverse → runPoolOn (runNAllocator, the
// authoritative N-book engine) → runRecordOf → writeRunRecord (src/pools/run.ts, report.ts, trades.ts), as
// `npm run pools -- fixed` and the Study 7 runner do.
//
// The Study 7 runner's tested helpers are reused unchanged: cost validation, the summary row, reproducibility metadata
// and the to-the-cent, lot-by-lot reconciliation.
//
// This module only:
// - picks the window (by default the latest common COMPLETE session, data.ts) and the friction;
// - writes into a new output directory under evaluations/study8-runs/;
// - adds the per-lot audit ledger and diagnostics (lots.ts), the five data files' provenance and the run time;
// - prints a summary.
// No trading logic lives here.
import crypto from 'node:crypto';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import fs from 'fs-extra';
import { type PoolRunOptions, loadPoolUniverse, runPoolOn } from '../pools/run.ts';
import { type PoolRunRecord, formatReport, runRecordOf, writeRunRecord } from '../pools/report.ts';
import { type Reconciliation, reconcile } from '../study7-runners/reconcile.ts';
import { newOutputDir, reproducibility as study7Reproducibility, summaryRowOf } from '../study7-runners/run.ts';
import {
  type DataStatus,
  type FileProvenance,
  dataStatus,
  study8LastSession,
  study8Pins,
  validateEnd
} from './data.ts';
import { type Diagnostics, diagnosticsOf, exportCheck, lotRowsOf, writeLots } from './lots.ts';
import { UsageError } from './aliases.ts';
import { sealedCostBps, sealedEnd, type Study8Resolved } from './resolve.ts';

export const outputsRoot = 'evaluations/study8-runs';
export const retrospectiveLabel =
  'RETROSPECTIVE: every session through 2026-10-29 was inspected before Study 8, and the Study 8 candidates were selected on 2016–2024 and evaluated once on 2025-01-02 → 2026-10-29 (a closed door on previously inspected history). These runs are neither independent validation nor prospective monitoring. RESEARCH ONLY — NOT DEPLOYED.';

// The extra label of a run that reaches past the sealed W29 endpoint.
export const newDataLabel = (last: string) =>
  last > study8LastSession
    ? `NEW LOCAL DATA: sessions after ${study8LastSession} (here through ${last}) were appended after Study 8 and are not part of any Study 8 record. Figures that include them are an unreviewed backtest on newer bars — not validated, not prospective, not reconciled.`
    : '';

const stamp = () =>
  new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');

// Creates `dir` atomically (its parent may exist): false if it already exists, so two runs can never share one.
const reserve = async (dir: string) => {
  await fs.ensureDir(path.dirname(dir));

  try {
    await fs.mkdir(dir);

    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;

    throw error;
  }
};

// A new, unique output directory, created here: an explicit --out must not exist; a default one goes under
// evaluations/study8-runs/ with a numeric suffix if another run (even a concurrent one) took the name.
export const outputDir = async (explicit: string | undefined, label: string) => {
  if (explicit !== undefined) {
    const dir = await newOutputDir(explicit, label);

    if (!(await reserve(dir)))
      throw new UsageError(`--out ${explicit} already exists; runs never overwrite earlier output`);

    return dir;
  }

  const base = path.join(outputsRoot, `${stamp()}-${label}`);

  for (let n = 1; ; n++) {
    const dir = n === 1 ? base : `${base}-${n}`;

    // outputsRoot is outside research/, config/, data/ and src/ (writeRunRecord re-checks every run directory)
    if (await reserve(dir)) return dir;
  }
};

// Removes a reserved output directory that a failed run left empty.
export const releaseIfEmpty = async (dir: string) => {
  if ((await fs.pathExists(dir)) && (await fs.readdir(dir)).length === 0) await fs.remove(dir);
};

const sha256 = (text: string | Buffer) => crypto.createHash('sha256').update(text).digest('hex');
const sha256File = async (file: string) => sha256(await fs.readFile(file));
const runnerFiles = [
  'src/study8-runners/aliases.ts',
  'src/study8-runners/resolve.ts',
  'src/study8-runners/data.ts',
  'src/study8-runners/lots.ts',
  'src/study8-runners/run.ts',
  'src/study8-runners/main.ts'
];

export const reproducibility = async () => {
  const base = await study7Reproducibility();

  return {
    ...base,
    // one fingerprint of the engine files whose (16-hex) hashes are listed under `engine`
    engineDigest: sha256(JSON.stringify(base.engine)),
    study8Runner: Object.fromEntries(
      await Promise.all(runnerFiles.map(async (file) => [file, (await sha256File(file)).slice(0, 16)]))
    )
  };
};

// The market-event inputs next to the data, with Study 8's pins.
const marketEventFiles = [
  'data/partitions.json',
  'config/market-events/splits.json',
  'config/market-events/distributions.csv'
];

const marketEvents = async () => {
  const pins = await study8Pins();

  return Promise.all(
    marketEventFiles.map(async (file) => {
      const hash = (await fs.pathExists(file)) ? await sha256File(file) : 'missing';

      return {
        file,
        sha256: hash,
        study8Pin: pins[file] ?? null,
        equalsStudy8Pin: pins[file] === hash,
        ...(file.endsWith('distributions.csv')
          ? { use: 'loaded, but fixed-pool runs book no distributions (the engine books them in portfolio mode only)' }
          : {})
      };
    })
  );
};

const cents = (value: number) => Math.round(value * 100) / 100;

// Study 7's reconciliation (identical convention: run to 2026-10-29, 5 bps, 11%, stops at the stop, $100k slot),
// pointed at the sealed Study 8 record; a member without a sealed ledger is compared on its totals only.
export const reconcileStudy8 = (
  resolved: Study8Resolved,
  record: PoolRunRecord,
  run: { lastSession: string; costBps: number }
): Reconciliation & { scope?: string } => {
  if (resolved.study8.kind === 'study7')
    return { ...reconcile(resolved, record, run), scope: "Study 7's sealed final door" };
  if (!resolved.sealed) return { applicable: false, reason: 'no sealed Study 8 record for this configuration' };
  if (run.lastSession !== sealedEnd || run.costBps !== sealedCostBps) {
    return {
      applicable: false,
      reason: `the sealed Study 8 figures are for the run to ${sealedEnd} at ${sealedCostBps} bps per side, 11%, stops at the stop; this run ends ${run.lastSession} at ${run.costBps} bps`
    };
  }

  const base = reconcile(resolved, record, run);

  if (!base.applicable) return base;

  if (resolved.sealed.ledgerSealed === false) {
    const totals = base.totals!;

    return {
      ...base,
      source: resolved.sealed.source,
      lots: { compared: 0, mismatches: [] },
      scope:
        'totals only (the sealed F24 record keeps funded-lot ledgers for role holders and controls, not for other shortlist members)',
      pass: totals.every((row) => row.pass) && (base.anchors ?? []).every((row) => row.pass)
    };
  }

  return { ...base, source: resolved.sealed.source, scope: 'totals and trade by trade' };
};

export interface RunOutcome {
  resolved: Study8Resolved;
  record: PoolRunRecord;
  reconciliation: Reconciliation & { scope?: string };
  outDir: string;
  row: Record<string, unknown>;
  diagnostics: Diagnostics;
  exports: Awaited<ReturnType<typeof exportCheck>>;
  data: DataStatus;
  latestCommonSession: string;
  requestedEnd: string;
  seconds: { total: number; engine: number };
}

const money = (value: number) =>
  Number.isFinite(value)
    ? `${value <= -0.005 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'n/a';
const pct = (value: number) => (Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : 'n/a');
const pad = (text: string, width: number) => text.padStart(width);

const study8StatusText = (file: FileProvenance) =>
  file.study8Status === 'exact'
    ? '= Study 8 pinned file'
    : file.study8Status === 'appended'
      ? `= Study 8 pinned file + ${file.appendedBytes.toLocaleString('en-US')} appended bytes (pinned prefix verified)`
      : file.study8Status === 'differs'
        ? 'DIFFERS from the Study 8 pinned file (not a pure append: history changed)'
        : 'no Study 8 pin';

// The five canonical files, whichever the strategy reads.
export const dataLines = (data: DataStatus, read: readonly string[]) =>
  Object.values(data).map((file) =>
    file.present
      ? `    ${file.symbol.padEnd(4)} ${read.includes(file.symbol) ? 'read' : '    '} sha256 ${file.sha256.slice(0, 16)}… ${file.bytes.toLocaleString('en-US')} B, ${file.rows.toLocaleString('en-US')} rows; last bar ${file.lastBarNewYork}; latest complete session ${file.latestCompleteSession}${file.incomplete ? ` (${file.incomplete.date} incomplete: bars only to ${file.incomplete.lastBarNewYork})` : ''}${file.beyondCalendar ? ' (bars after the shared NYSE calendar end 2026-12-31 ignored)' : ''}; ${study8StatusText(file)}${file.datasetReport ? `; dataset-report ${file.datasetReport.status}${file.datasetReport.sha256Matches ? ' (same sha256)' : ' (for an earlier version of the file)'}` : ''}`
      : `    ${file.symbol.padEnd(4)} MISSING (${file.file})`
  );

export const summaryText = (outcome: RunOutcome) => {
  const { resolved, record, reconciliation, diagnostics: d, exports, data } = outcome;
  const f = record.figures;
  const t = record.tradeLedger.totals;
  const notional = record.run.notionalPerTrade;
  const read = Object.keys(resolved.books);
  const years = record.years.map((row) => [
    row.period,
    money(row.strategyChange),
    money(row.interest),
    String(row.lotsEntered)
  ]);
  const monthsByYear = new Map<string, Map<string, number>>();

  for (const row of record.months) {
    const [year, month] = row.period.split('-') as [string, string];

    if (!monthsByYear.has(year)) monthsByYear.set(year, new Map());
    monthsByYear.get(year)!.set(month, row.strategyChange);
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const k = (value: number | undefined) =>
    value === undefined ? '' : `${value < -0.5 ? '−' : ''}${Math.abs(value / 1000).toFixed(1)}k`;
  const newData = newDataLabel(record.data.last);
  const lines = [
    `=== ${resolved.spec.alias} — ${resolved.spec.title}`,
    `  ${resolved.spec.status === 'frozen' ? 'FROZEN' : 'RESEARCH ONLY — NOT DEPLOYED'} · ${resolved.study8.note}`,
    `  books: ${Object.entries(resolved.vectorIds)
      .map(([s, id]) => `${s} ${id}`)
      .join(
        ', '
      )}; config ${resolved.configFile} (sha256 ${record.pool.fileSha256.slice(0, 16)}…; algorithmic hash ${record.pool.configHash.slice(0, 16)}…)`,
    `  window ${record.data.first} → ${record.data.last} (arming ${record.data.firstEligible}; ${record.data.sessions.toLocaleString('en-US')} sessions); requested end ${outcome.requestedEnd === outcome.latestCommonSession ? `${outcome.requestedEnd} = the latest common complete session of ${read.join(', ')}` : outcome.requestedEnd}`,
    `  fixed $${notional.toLocaleString('en-US')} single slot, no compounding; ${record.run.costBpsPerSide} bps PER SIDE; ${pct(record.run.annualRate)} simple interest (365-day); stops at the stop`,
    '',
    '  P&L',
    `    net ${money(f.net)} = realized ${money(f.realized)} + unrealized ${money(f.unrealized)} (open lots marked at the last close; ${f.openLots} open)`,
    `    gross ${money(t.grossBeforeCosts)} − friction ${money(f.frictionDollars)} − margin interest ${money(f.interest)} = ${money(t.totalNet)}`,
    `    funded lots ${f.fundedLots} (${f.closedLots} closed, ${f.openLots} open); closed: ${d.wins} won, ${d.losses} lost${d.flat ? `, ${d.flat} flat` : ''} (win rate ${pct(d.winRate)}; profit factor ${Number.isFinite(d.profitFactor) ? d.profitFactor.toFixed(2) : 'n/a'}); largest win ${money(d.largestWin)}, largest loss ${money(d.largestLoss)}`,
    '',
    `  DRAWDOWNS (marked P&L from its running peak; % of the $${notional.toLocaleString('en-US')} slot)`,
    `    max MINUTE ${money(d.drawdowns.minute.dollars)} = ${pct(d.drawdowns.minute.percentOf100k)} (peak ${d.drawdowns.minute.peakNewYork}, trough ${d.drawdowns.minute.troughNewYork}, recovered ${d.drawdowns.minute.recoveredNewYork})`,
    `    max DAILY  ${money(d.drawdowns.daily.dollars)} = ${pct(d.drawdowns.daily.percentOf100k)} (peak ${d.drawdowns.daily.peakSession}, trough ${d.drawdowns.daily.troughSession}, recovered ${d.drawdowns.daily.recoveredSession})`,
    '',
    '  BY ETF (lots, closed/open, won/lost, gross, interest, friction, net, signals of that book refused)',
    ...Object.entries(d.bySymbol).map(
      ([s, r]) =>
        `    ${s.padEnd(4)} ${pad(String(r.lots), 3)}  ${pad(`${r.closed}/${r.open}`, 6)}  ${pad(`${r.wins}/${r.losses}`, 6)}  ${pad(money(r.gross), 13)}  ${pad(money(r.interest), 11)}  ${pad(money(r.friction), 10)}  ${pad(money(r.net), 13)}  ${pad(String(r.signalsRefused), 3)}`
    ),
    '',
    '  EXECUTION AND RISK',
    `    signals: ${d.signals.virtualTrades} shadow-book trades → ${d.signals.decisions} funding decisions: ${d.signals.funded} funded, ${d.signals.refused} refused (${
      Object.entries(d.signals.refusalReasons as Record<string, number>)
        .map(([reason, n]) => `${n} ${reason}`)
        .join(', ') || 'none'
    }); ${d.signals.sameMinuteDecisions} same-minute decisions`,
    `    occupancy: a lot held on ${d.occupancy.sessionsHoldingALot} of ${d.occupancy.sessionsFromFirstEligible} sessions from arming (${pct(d.occupancy.timeInMarket)}); max simultaneous lots ${d.occupancy.maxSimultaneousFundedLots}; overlapping lots ${d.occupancy.overlappingLots}`,
    `    exits: ${
      Object.entries(d.exitReasons)
        .map(([reason, r]) => `${reason} ${r.lots} (${money(r.net)})`)
        .join('; ') || 'none'
    }`,
    `    exit fills: ${
      Object.entries(d.exitFillReasons)
        .map(([reason, n]) => `${reason} ${n}`)
        .join('; ') || 'none'
    }; entry fills: ${Object.entries(d.entryFillReasons)
      .map(([reason, n]) => `${reason} ${n}`)
      .join('; ')}; setups: ${Object.entries(d.entrySetups)
      .map(([setup, n]) => `${setup} ${n}`)
      .join('; ')}`,
    `    holding (closed lots): mean ${d.averageCalendarDaysHeld.toFixed(1)} / median ${d.medianCalendarDaysHeld.toFixed(1)} / longest ${d.longestCalendarDaysHeld.toFixed(1)} calendar days`,
    `    MAE worst ${money(d.worstMae)}, median ${money(d.medianMae)}; MFE best ${money(d.bestMfe)}, median ${money(d.medianMfe)} (MFE replay verified on ${d.mfeVerifiedLots} of ${f.fundedLots} lots)`,
    '',
    '  BY YEAR (marked P&L change; one continuous run)',
    ...years.map(
      ([year, net, interest, lots]) =>
        `    ${year}  ${pad(net!, 13)}  interest ${pad(interest!, 11)}  lots entered ${pad(lots!, 3)}`
    ),
    '',
    '  BY MONTH (marked P&L change, $ thousands)',
    `    year  ${monthNames.map((m) => m.padStart(7)).join('')}`,
    ...[...monthsByYear.entries()].map(
      ([year, months]) =>
        `    ${year}  ${monthNames.map((_m, i) => k(months.get(String(i + 1).padStart(2, '0'))).padStart(7)).join('')}`
    ),
    '',
    `  DATA (latest common complete session of the five files ${
      Object.values(data)
        .filter((file): file is FileProvenance => file.present)
        .map((file) => file.latestCompleteSession!)
        .sort()[0]
    }; this run reads ${read.join(', ')})`,
    ...dataLines(data, read),
    `    distributions/splits: see runner.json marketEvents (fixed-pool runs book no distributions)`,
    `  ENGINE: digest ${outcome.row.engineDigest ? String(outcome.row.engineDigest).slice(0, 16) : ''}… (unchanged pools engine); phenotype files ${record.books.map((b) => `${b.symbol} ${b.phenotypeFileSha256.slice(0, 12)}…`).join(', ')}; Node ${process.version}`,
    `  RUNTIME ${outcome.seconds.total.toFixed(1)} s (engine ${outcome.seconds.engine.toFixed(1)} s)`,
    reconciliation.applicable
      ? `  RECONCILIATION (${reconciliation.scope}): ${reconciliation.pass ? 'PASS' : 'FAIL'} — ${reconciliation
          .totals!.map((t) => `${t.name} ${t.pass ? '=' : `≠ (sealed ${t.sealed}, run ${t.run})`}`)
          .join(
            '; '
          )}${reconciliation.lots!.compared ? `; ${reconciliation.lots!.compared} lots compared, ${reconciliation.lots!.mismatches.length} mismatches` : ''}`
      : `  RECONCILIATION: not applicable (${reconciliation.reason})`,
    `  EXPORT CHECK (lots.csv, lots.json, trades.csv, yearly.csv, monthly.csv re-read): ${exports.pass ? 'PASS' : 'FAIL'} — ${exports.checks.length} checks${
      exports.pass
        ? ''
        : `: ${exports.checks
            .filter((c) => !c.pass)
            .map((c) => `${c.name} (expected ${c.expected}, got ${c.actual})`)
            .join('; ')}`
    }`,
    `  ${retrospectiveLabel}`,
    ...(newData ? [`  ${newData}`] : [])
  ];

  return `${lines.join('\n')}\n`;
};

export const runResolved = async (
  resolved: Study8Resolved,
  options: { end: string; costBps: number; outDir: string; latestCommonSession: string }
): Promise<RunOutcome> => {
  const started = performance.now();
  const { pool } = resolved;
  const poolOptions: PoolRunOptions = {
    mode: 'fixed',
    dataset: 'all',
    costBps: options.costBps,
    dividends: pool.config.portfolio.dividends,
    end: options.end
  };
  const loaded = await loadPoolUniverse(pool, poolOptions);
  const lastSession = loaded.universe.dates.at(-1)!;
  const engineStarted = performance.now();
  const result = runPoolOn(pool, loaded, poolOptions);
  const engineSeconds = (performance.now() - engineStarted) / 1000;
  const record = await runRecordOf(pool, loaded, result, poolOptions, options.outDir);

  await writeRunRecord(record, result);

  const reconciliation = reconcileStudy8(resolved, record, { lastSession, costBps: options.costBps });
  const rows = lotRowsOf(result, record);
  const diagnostics = diagnosticsOf(rows, record, result);
  const data = await dataStatus();
  const repro = await reproducibility();

  await writeLots(options.outDir, rows, {
    alias: resolved.spec.alias,
    window: { first: record.data.first, last: record.data.last },
    costBpsPerSide: options.costBps,
    notionalPerTrade: record.run.notionalPerTrade,
    annualRate: record.run.annualRate
  });

  const exports = await exportCheck(options.outDir, record);
  const seconds = { total: (performance.now() - started) / 1000, engine: engineSeconds };
  const partial = {
    resolved,
    record,
    reconciliation,
    outDir: options.outDir,
    diagnostics,
    exports,
    data,
    latestCommonSession: options.latestCommonSession,
    requestedEnd: options.end,
    seconds
  };
  const row = {
    ...summaryRowOf(partial as never),
    grossBeforeCosts: record.tradeLedger.totals.grossBeforeCosts,
    winRate: diagnostics.winRate,
    profitFactor: diagnostics.profitFactor,
    mfeVerifiedLots: diagnostics.mfeVerifiedLots,
    latestCommonSession: options.latestCommonSession,
    newData: record.data.last > study8LastSession,
    exportCheck: exports.pass ? 'PASS' : 'FAIL',
    engineDigest: repro.engineDigest,
    configSha256: record.pool.fileSha256,
    runtimeSeconds: Math.round(seconds.total * 10) / 10,
    study8: resolved.study8.note,
    testStatus: resolved.study8.testStatus ?? ''
  };
  const label = [retrospectiveLabel, newDataLabel(record.data.last)].filter(Boolean).join(' ');

  await fs.writeJson(
    path.join(options.outDir, 'runner.json'),
    {
      kind: 'study8-local-run',
      generatedAt: new Date().toISOString(),
      label,
      alias: resolved.spec.alias,
      title: resolved.spec.title,
      status: resolved.spec.status,
      study8: resolved.study8,
      trainingRank: resolved.rank ?? null,
      sealedId: resolved.sealedId,
      vectorIds: resolved.vectorIds,
      books: resolved.books,
      config: { file: resolved.configFile, sha256: record.pool.fileSha256, algorithmicHash: record.pool.configHash },
      phenotypeFiles: record.books.map((book) => ({
        symbol: book.symbol,
        phenotype: book.phenotype,
        file: book.phenotypeFile,
        sha256: book.phenotypeFileSha256
      })),
      window: {
        first: record.data.first,
        last: record.data.last,
        requestedEnd: options.end,
        latestCommonCompleteSession: options.latestCommonSession,
        firstEligible: record.data.firstEligible,
        sessions: record.data.sessions,
        afterStudy8: record.data.last > study8LastSession
      },
      conventions: record.run,
      data: record.data.members,
      dataFiles: data,
      marketEvents: await marketEvents(),
      summary: row,
      diagnostics,
      reconciliation,
      exportCheck: exports,
      runtimeSeconds: seconds,
      // the study's door log is not appended to (a user run must not modify the study's records); this file is the
      // run's provenance
      provenance: {
        sealedPhase: 'test-F24 (verified in the local hash chain before resolving)',
        net: cents(record.figures.net)
      },
      reproducibility: repro
    },
    { spaces: 2 }
  );
  await fs.outputFile(path.join(options.outDir, 'runner-summary.txt'), summaryText({ ...partial, row }));

  return { ...partial, row };
};

export const runFor = async (resolved: Study8Resolved, options: { end?: string; costBps: number; outDir?: string }) => {
  const symbols = Object.keys(resolved.books);
  const latestCommonSession = await validateEnd(undefined, symbols);
  const end = await validateEnd(options.end, symbols);
  const outDir = await outputDir(options.outDir, `run-${resolved.spec.alias}`);

  try {
    return await runResolved(resolved, { end, costBps: options.costBps, outDir, latestCommonSession });
  } catch (error) {
    await releaseIfEmpty(outDir);
    throw error;
  }
};

export { formatReport };

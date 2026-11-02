// Running resolved Study 8 aliases through the UNCHANGED pools engine: loadPoolUniverse → runPoolOn (runNAllocator, the
// authoritative N-book engine) → runRecordOf → writeRunRecord (src/pools/run.ts, report.ts, trades.ts), as
// `npm run pools -- fixed` and the Study 7 runner do. The Study 7 runner's tested helpers are reused unchanged: end
// and cost validation, data dates, the summary row, reproducibility metadata and the to-the-cent, lot-by-lot
// reconciliation. This module only picks the window and friction, writes into a new output directory under
// evaluations/study8-runs/, attaches the Study 8 provenance and prints a summary. No trading logic lives here.
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { type PoolRunOptions, loadPoolUniverse, runPoolOn } from '../pools/run.ts';
import { type PoolRunRecord, formatReport, runRecordOf, writeRunRecord } from '../pools/report.ts';
import { type Reconciliation, reconcile } from '../study7-runners/reconcile.ts';
import {
  newOutputDir,
  reproducibility as study7Reproducibility,
  summaryRowOf,
  validateEnd
} from '../study7-runners/run.ts';
import { sealedCostBps, sealedEnd, type Study8Resolved } from './resolve.ts';

export const outputsRoot = 'evaluations/study8-runs';
export const retrospectiveLabel =
  'RETROSPECTIVE: every session through 2026-10-29 was inspected before Study 8, and the Study 8 candidates were selected on 2016–2024 and evaluated once on 2025-01-02 → 2026-10-29 (a closed door on previously inspected history). These runs are neither independent validation nor prospective monitoring. RESEARCH ONLY — NOT DEPLOYED.';

const stamp = () =>
  new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');

// A new, unique output directory: an explicit --out must not exist; a default one goes under evaluations/study8-runs/.
export const outputDir = async (explicit: string | undefined, label: string) => {
  if (explicit !== undefined) return newOutputDir(explicit, label);

  const base = path.join(outputsRoot, `${stamp()}-${label}`);
  let dir = base;

  for (let n = 2; await fs.pathExists(dir); n++) dir = `${base}-${n}`;

  return newOutputDir(dir, label);
};

const sha256File = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');
const runnerFiles = [
  'src/study8-runners/aliases.ts',
  'src/study8-runners/resolve.ts',
  'src/study8-runners/run.ts',
  'src/study8-runners/main.ts'
];

export const reproducibility = async () => ({
  ...(await study7Reproducibility()),
  study8Runner: Object.fromEntries(
    await Promise.all(runnerFiles.map(async (file) => [file, (await sha256File(file)).slice(0, 16)]))
  )
});

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
}

const money = (value: number) =>
  `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (value: number) => `${(value * 100).toFixed(2)}%`;

export const summaryText = (outcome: Omit<RunOutcome, 'row'>) => {
  const { resolved, record, reconciliation } = outcome;
  const f = record.figures;
  const ledger = record.tradeLedger.bySymbol as Record<
    string,
    { trades: number; net: number; interest: number; friction: number }
  >;
  const lines = [
    `=== ${resolved.spec.alias} — ${resolved.spec.title}`,
    `  ${resolved.spec.status === 'frozen' ? 'FROZEN' : 'RESEARCH ONLY — NOT DEPLOYED'} · ${resolved.study8.note}`,
    `  books: ${Object.entries(resolved.vectorIds)
      .map(([s, id]) => `${s} ${id}`)
      .join(', ')}; config ${resolved.configFile}`,
    `  window ${record.data.first} → ${record.data.last} (arming ${record.data.firstEligible}); fixed $${record.run.notionalPerTrade.toLocaleString('en-US')} single slot, no compounding; ${record.run.costBpsPerSide} bps PER SIDE; ${pct(record.run.annualRate)} simple interest (365-day); stops at the stop`,
    `  net ${money(f.net)} = realized ${money(f.realized)} + unrealized ${money(f.unrealized)} (open lots marked at the last close; ${f.openLots} open)`,
    `  margin interest ${money(f.interest)}; friction ${money(f.frictionDollars)}; funded lots ${f.fundedLots} (${f.closedLots} closed, ${f.openLots} open); refused signals ${f.refused}; time in market ${pct(f.timeInMarket)}`,
    `  max MINUTE drawdown ${money(f.minuteDrawdown)} (${pct(f.minuteDrawdown / record.run.notionalPerTrade)} of $100k); max DAILY drawdown ${money(f.dailyDrawdown)}`,
    '  by symbol (lots, net, interest, friction):',
    ...Object.entries(ledger).map(
      ([s, r]) =>
        `    ${s.padEnd(4)} ${String(r.trades).padStart(4)}  ${money(r.net).padStart(14)}  ${money(r.interest).padStart(12)}  ${money(r.friction).padStart(11)}`
    ),
    reconciliation.applicable
      ? `  reconciliation (${reconciliation.scope}): ${reconciliation.pass ? 'PASS' : 'FAIL'} — ${reconciliation
          .totals!.map((t) => `${t.name} ${t.pass ? '=' : `≠ (sealed ${t.sealed}, run ${t.run})`}`)
          .join(
            '; '
          )}${reconciliation.lots!.compared ? `; ${reconciliation.lots!.compared} lots compared, ${reconciliation.lots!.mismatches.length} mismatches` : ''}`
      : `  reconciliation: not applicable (${reconciliation.reason})`,
    `  ${retrospectiveLabel}`
  ];

  return `${lines.join('\n')}\n`;
};

export const runResolved = async (
  resolved: Study8Resolved,
  options: { end: string; costBps: number; outDir: string }
): Promise<RunOutcome> => {
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
  const result = runPoolOn(pool, loaded, poolOptions);
  const record = await runRecordOf(pool, loaded, result, poolOptions, options.outDir);

  await writeRunRecord(record, result);

  const reconciliation = reconcileStudy8(resolved, record, { lastSession, costBps: options.costBps });
  const partial = { resolved, record, reconciliation, outDir: options.outDir };
  const row = {
    ...summaryRowOf(partial as never),
    study8: resolved.study8.note,
    testStatus: resolved.study8.testStatus ?? ''
  };

  await fs.writeJson(
    path.join(options.outDir, 'runner.json'),
    {
      kind: 'study8-local-run',
      generatedAt: new Date().toISOString(),
      label: retrospectiveLabel,
      alias: resolved.spec.alias,
      title: resolved.spec.title,
      status: resolved.spec.status,
      study8: resolved.study8,
      trainingRank: resolved.rank ?? null,
      sealedId: resolved.sealedId,
      vectorIds: resolved.vectorIds,
      books: resolved.books,
      config: { file: resolved.configFile, sha256: record.pool.fileSha256 },
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
        firstEligible: record.data.firstEligible,
        sessions: record.data.sessions
      },
      conventions: record.run,
      data: record.data.members,
      summary: row,
      reconciliation,
      // the study's door log is not appended to (a user run must not modify the study's records); this file is the
      // run's provenance
      provenance: {
        sealedPhase: 'test-F24 (verified in the local hash chain before resolving)',
        net: cents(record.figures.net)
      },
      reproducibility: await reproducibility()
    },
    { spaces: 2 }
  );
  await fs.outputFile(path.join(options.outDir, 'runner-summary.txt'), summaryText(partial));

  return { ...partial, row };
};

export const runFor = async (resolved: Study8Resolved, options: { end?: string; costBps: number; outDir?: string }) => {
  const end = await validateEnd(options.end, Object.keys(resolved.books));
  const outDir = await outputDir(options.outDir, `run-${resolved.spec.alias}`);

  return runResolved(resolved, { end, costBps: options.costBps, outDir });
};

export { formatReport };

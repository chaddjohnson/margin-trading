// Running resolved aliases through the UNCHANGED pools engine: loadPoolUniverse → runPoolOn (runNAllocator, the
// authoritative N-book engine) → runRecordOf → writeRunRecord (src/pools/run.ts, report.ts, trades.ts) — the same path as
// `npm run pools -- fixed` and the Study 5/6/7 research-pool runners. This module only chooses one common window and
// friction for every strategy, writes into a new unique output directory, adds reproducibility metadata and the
// reconciliation against the sealed Study 7 record, and prints a summary. No trading logic lives here.
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { type PoolRunOptions, loadPoolUniverse, runPoolOn } from '../pools/run.ts';
import {
  type PoolRunRecord,
  assertOutsideResearch,
  formatReport,
  runRecordOf,
  writeRunRecord
} from '../pools/report.ts';
import { UsageError } from './aliases.ts';
import { type Reconciliation, reconcile } from './reconcile.ts';
import { type Resolved, resolveAlias } from './resolve.ts';

export const outputsRoot = 'evaluations/study7-runs';
export const universeSymbols = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;
export const firstEligibleDate = '2017-06-15';
export const retrospectiveLabel =
  'RETROSPECTIVE: every session through 2026-10-29 was inspected by Studies 1–7 (and the Study 7 nominees were selected on 2017–2023). These runs are neither independent validation nor prospective monitoring.';

const sha256File = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');
const git = (command: string) => {
  try {
    return execSync(`git ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

// The last New York date in each member's canonical minute file (its final bar).
export const lastDataDates = async (symbols: readonly string[] = universeSymbols) => {
  const out: Record<string, { file: string; present: boolean; lastBarUtc: string; lastDate: string; bytes: number }> =
    {};

  for (const symbol of symbols) {
    const file = `data/${symbol}/data.csv`;

    if (!(await fs.pathExists(file))) {
      out[symbol] = { file, present: false, lastBarUtc: '', lastDate: '', bytes: 0 };
      continue;
    }

    const { size } = await fs.stat(file);
    const handle = await fs.open(file, 'r');
    const length = Math.min(size, 4096);
    const buffer = Buffer.alloc(length);

    await fs.read(handle, buffer, 0, length, size - length);
    await fs.close(handle);

    const line = buffer.toString('utf8').trim().split('\n').at(-1)!;
    const stamp = line.split(',')[0]!.replace(/"/g, '');
    const lastDate = new Date(stamp).toLocaleDateString('sv-SE', { timeZone: 'America/New_York' });

    out[symbol] = { file, present: true, lastBarUtc: stamp, lastDate, bytes: size };
  }

  return out;
};

// The latest New York date covered by every member's data (the default end of every run).
export const commonLastDate = async (symbols: readonly string[] = universeSymbols) => {
  const dates = await lastDataDates(symbols);
  const missing = Object.entries(dates)
    .filter(([, d]) => !d.present)
    .map(([s]) => s);

  if (missing.length) throw new UsageError(`missing canonical data for ${missing.join(', ')} (data/<SYMBOL>/data.csv)`);

  return Object.values(dates)
    .map((d) => d.lastDate)
    .sort()[0]!;
};

export const validateEnd = async (end: string | undefined, symbols: readonly string[]) => {
  const latest = await commonLastDate(symbols);

  if (end === undefined) return latest;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || Number.isNaN(Date.parse(end)))
    throw new UsageError(`--end must be YYYY-MM-DD, not "${end}"`);
  if (end > latest)
    throw new UsageError(
      `--end ${end} is after the latest common data (${latest}); nothing after ${latest} exists locally`
    );
  if (end <= firstEligibleDate)
    throw new UsageError(`--end ${end} must be after the first eligible session ${firstEligibleDate}`);

  return end;
};

export const parseCostBps = (raw: string | undefined) => {
  if (raw === undefined) return 5;

  const value = Number(raw);

  if (!(raw.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 100)) {
    throw new UsageError(`--cost-bps must be a number of basis points PER SIDE from 0 to 100, not "${raw}"`);
  }

  return value;
};

const stamp = () =>
  new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');

// A new, unique output directory: an explicit --out must not exist; a default one gets a numeric suffix if needed.
const assertWritable = (dir: string) => {
  try {
    assertOutsideResearch(dir);
  } catch (error) {
    throw new UsageError((error as Error).message);
  }
};

export const newOutputDir = async (explicit: string | undefined, label: string) => {
  if (explicit !== undefined) {
    assertWritable(explicit);

    if (await fs.pathExists(explicit))
      throw new UsageError(`--out ${explicit} already exists; runs never overwrite earlier output`);

    return explicit;
  }

  const base = path.join(outputsRoot, `${stamp()}-${label}`);
  let dir = base;

  for (let n = 2; await fs.pathExists(dir); n++) dir = `${base}-${n}`;

  assertWritable(dir);

  return dir;
};

const engineFiles = [
  'src/portfolio-aware-d1/nbook/engine.ts',
  'src/portfolio-aware-d1/nbook/ledger.ts',
  'src/portfolio-aware-d1/nbook/margin.ts',
  'src/portfolio-aware-d1/nbook/universe.ts',
  'src/multi-etf-allocator/shadow.ts',
  'src/shared-margin-portfolio/strategy.ts',
  'src/four-family/data.ts',
  'src/pools/run.ts',
  'src/pools/report.ts',
  'src/pools/trades.ts',
  'src/pools/load.ts',
  'src/pools/schema.ts',
  'src/study7-runners/aliases.ts',
  'src/study7-runners/resolve.ts',
  'src/study7-runners/reconcile.ts',
  'src/study7-runners/run.ts'
];

export const reproducibility = async () => ({
  git: {
    commit: git('rev-parse HEAD'),
    branch: git('branch --show-current'),
    uncommittedRunnerFiles: git(
      'status --porcelain -- src package.json config/research-pools config/pools config/phenotypes'
    )
      .split('\n')
      .filter(Boolean)
  },
  node: process.version,
  engine: Object.fromEntries(
    await Promise.all(engineFiles.map(async (file) => [file, (await sha256File(file)).slice(0, 16)]))
  )
});

const money = (value: number) =>
  `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (value: number) => `${(value * 100).toFixed(2)}%`;

export interface RunOutcome {
  resolved: Resolved;
  record: PoolRunRecord;
  reconciliation: Reconciliation;
  outDir: string;
  row: Record<string, unknown>;
}

const bySymbolOf = (record: PoolRunRecord) => {
  const ledger = record.tradeLedger.bySymbol as Record<
    string,
    { trades: number; net: number; interest: number; friction: number; profitable?: number }
  >;
  const refusals = record.figures.refusalReasons as Record<string, number>;

  return Object.fromEntries(
    Object.entries(ledger).map(([symbol, item]) => [
      symbol,
      {
        lots: item.trades,
        net: item.net,
        interest: item.interest,
        friction: item.friction,
        signalsRefusedWhileThisBookHeldTheSlot: refusals[`pool occupied by the ${symbol} lot`] ?? 0
      }
    ])
  );
};

export const summaryRowOf = (outcome: Omit<RunOutcome, 'row'>) => {
  const { resolved, record, reconciliation } = outcome;
  const f = record.figures;

  return {
    alias: resolved.spec.alias,
    rank: resolved.rank ?? '',
    status: resolved.spec.status,
    symbols: Object.keys(resolved.books).join('+'),
    sealedId: resolved.sealedId,
    vectorIds: Object.entries(resolved.vectorIds)
      .map(([s, id]) => `${s}:${id}`)
      .join(' '),
    config: resolved.configFile,
    first: record.data.first,
    last: record.data.last,
    costBpsPerSide: record.run.costBpsPerSide,
    annualRate: record.run.annualRate,
    net: f.net,
    realized: f.realized,
    unrealized: f.unrealized,
    interest: f.interest,
    friction: f.frictionDollars,
    minuteDrawdown: f.minuteDrawdown,
    minuteDrawdownPctOf100k: f.minuteDrawdown / record.run.notionalPerTrade,
    dailyDrawdown: f.dailyDrawdown,
    dailyDrawdownPctOf100k: f.dailyDrawdown / record.run.notionalPerTrade,
    fundedLots: f.fundedLots,
    closedLots: f.closedLots,
    openLots: f.openLots,
    virtualTrades: f.virtualTrades,
    refusedSignals: f.refused,
    timeInMarket: f.timeInMarket,
    reconciliation: reconciliation.applicable ? (reconciliation.pass ? 'PASS' : 'FAIL') : 'n/a',
    outDir: outcome.outDir
  };
};

export const summaryText = (outcome: Omit<RunOutcome, 'row'>) => {
  const { resolved, record, reconciliation } = outcome;
  const f = record.figures;
  const rows = bySymbolOf(record);
  const lines = [
    `=== ${resolved.spec.alias} — ${resolved.spec.title}`,
    `  ${resolved.spec.status === 'frozen' ? 'FROZEN' : 'RESEARCH ONLY'}${resolved.rank ? ` · Study 7 sealed rank #${resolved.rank}` : ''} · sealed ID ${resolved.sealedId}`,
    `  books: ${Object.entries(resolved.vectorIds)
      .map(([s, id]) => `${s} ${id}`)
      .join(', ')}; config ${resolved.configFile}`,
    `  ${resolved.spec.note}`,
    `  window ${record.data.first} → ${record.data.last} (arming ${record.data.firstEligible}); fixed $${record.run.notionalPerTrade.toLocaleString('en-US')} single slot, no compounding; ${record.run.costBpsPerSide} bps PER SIDE; ${pct(record.run.annualRate)} simple interest (365-day); stops at the stop`,
    `  net ${money(f.net)} = realized ${money(f.realized)} + unrealized ${money(f.unrealized)} (open lots marked at the last close; ${f.openLots} open)`,
    `  margin interest ${money(f.interest)}; friction ${money(f.frictionDollars)}; funded lots ${f.fundedLots} (${f.closedLots} closed, ${f.openLots} open); virtual trades ${f.virtualTrades}; refused signals ${f.refused}; time in market ${pct(f.timeInMarket)}`,
    `  max MINUTE drawdown ${money(f.minuteDrawdown)} (${pct(f.minuteDrawdown / record.run.notionalPerTrade)} of $100k); max DAILY drawdown ${money(f.dailyDrawdown)} (${pct(f.dailyDrawdown / record.run.notionalPerTrade)} of $100k)`,
    '  by symbol (lots, net, interest, friction, signals refused while that book held the slot):',
    ...Object.entries(rows).map(
      ([s, r]) =>
        `    ${s.padEnd(4)} ${String(r.lots).padStart(4)}  ${money(r.net).padStart(14)}  ${money(r.interest).padStart(12)}  ${money(r.friction).padStart(11)}  ${String(r.signalsRefusedWhileThisBookHeldTheSlot).padStart(4)}`
    ),
    reconciliation.applicable
      ? `  reconciliation vs the sealed Study 7 final door: ${reconciliation.pass ? 'PASS' : 'FAIL'} — ${reconciliation.totals!.map((t) => `${t.name} ${t.pass ? '=' : `≠ (sealed ${t.sealed}, run ${t.run})`}`).join('; ')}; ${reconciliation.lots!.compared} lots compared, ${reconciliation.lots!.mismatches.length} mismatches${reconciliation.anchors!.length ? `; ${reconciliation.anchors!.map((a) => `${a.name} ${a.expected} ${a.pass ? '=' : `≠ ${a.run}`}`).join('; ')}` : ''}`
      : `  reconciliation: not applicable (${reconciliation.reason})`,
    `  ${retrospectiveLabel}`
  ];

  return `${lines.join('\n')}\n`;
};

export const runResolved = async (
  resolved: Resolved,
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

  const reconciliation = reconcile(resolved, record, { lastSession, costBps: options.costBps });
  const partial = { resolved, record, reconciliation, outDir: options.outDir };
  const row = summaryRowOf(partial);

  await fs.writeJson(
    path.join(options.outDir, 'runner.json'),
    {
      kind: 'study7-local-run',
      generatedAt: new Date().toISOString(),
      label: retrospectiveLabel,
      alias: resolved.spec.alias,
      title: resolved.spec.title,
      status: resolved.spec.status,
      rank: resolved.rank ?? null,
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
      bySymbol: bySymbolOf(record),
      reconciliation,
      reproducibility: await reproducibility()
    },
    { spaces: 2 }
  );
  await fs.outputFile(path.join(options.outDir, 'runner-summary.txt'), summaryText(partial));

  return { ...partial, row };
};

export const runAlias = async (alias: string, options: { end?: string; costBps: number; outDir?: string }) => {
  const resolved = await resolveAlias(alias);
  const end = await validateEnd(options.end, Object.keys(resolved.books));
  const outDir = await newOutputDir(options.outDir, `run-${alias}`);

  return runResolved(resolved, { end, costBps: options.costBps, outDir });
};

export { formatReport };

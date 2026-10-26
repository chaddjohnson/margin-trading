// The readable report, the summary JSON (schema `pool-run` v1) and the CSV files of one pool run, and the check of the
// run against the pool's frozen regression anchors. A fixed-pool drawdown percentage is of the constant notional
// ($100,000); a portfolio percentage is of the running peak of marked equity.
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import type { NRunResult } from '../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import type { LoadedPool } from './load.ts';
import { type PoolRunOptions, dailyRows, figuresOf, periodRows, signalRows } from './run.ts';

export const evaluationsRoot = 'evaluations/pools';

const money = (value: number) =>
  Number.isFinite(value)
    ? `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'n/a';
const pct = (value: number, digits = 2) => (Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : 'n/a');
const cents = (value: number) => Math.round(value * 100) / 100;
const sha256File = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

export const runKey = (pool: LoadedPool, options: PoolRunOptions) =>
  [
    pool.config.id,
    options.mode,
    `${options.costBps}bps`,
    ...(options.mode === 'portfolio' ? [options.dividends] : []),
    ...(options.end ? [`to-${options.end}`] : [])
  ].join('-');

export const defaultOutDir = (pool: LoadedPool, options: PoolRunOptions) =>
  path.join(evaluationsRoot, options.dataset, runKey(pool, options));

export const assertOutsideResearch = (dir: string) => {
  const relative = path.relative(process.cwd(), path.resolve(dir));

  if (relative === 'research' || relative.startsWith(`research${path.sep}`) || relative.startsWith('config')) {
    throw new Error(`refused: ${dir} is inside research/ or config/; pool runs write under ${evaluationsRoot}/`);
  }
};

// The data the run read, each file's hash, and whether it is the frozen `all` the regression anchors were taken on.
export const dataRecordOf = (pool: LoadedPool, loaded: LoadedUniverse) => {
  const pins = (pool.config.regressionAnchors?.dataSha256 ?? {}) as Record<string, string>;
  const members = Object.fromEntries(
    Object.entries(loaded.windows).map(([symbol, window]) => [
      symbol,
      {
        file: window.dataFile,
        sha256: window.dataSha256 ?? '',
        first: window.evaluation.firstDate,
        last: window.evaluation.lastDate,
        sessions: window.evaluation.sessions,
        frozenPin: pins[symbol] ?? null,
        matchesFrozen: pins[symbol] === window.dataSha256,
        splitAdjustments: window.splitAdjustments
      }
    ])
  );
  const first = Object.values(loaded.windows)[0]!;
  const anchorsEnd = pool.config.regressionAnchors?.end as string | undefined;
  const frozenAll =
    loaded.partition === 'all' &&
    loaded.endDate === undefined &&
    Object.values(members).every((member) => member.matchesFrozen) &&
    loaded.universe.end === anchorsEnd;

  return {
    partition: loaded.partition,
    partitionsFile: first.partitionsFile,
    partitionsSha256: first.partitionsSha256,
    first: loaded.universe.dates[loaded.warmup],
    last: loaded.universe.end,
    sessions: loaded.universe.sessionCount - loaded.warmup,
    warmupSessions: loaded.warmup,
    firstEligible: loaded.universe.dates[loaded.universe.eligibilityIndex],
    timeZone: 'America/New_York (NYSE sessions; regular minutes)',
    members,
    distributions: {
      file: loaded.distributions.file,
      sha256: loaded.distributions.sha256,
      coverage: loaded.distributions.coverage
    },
    frozenAll,
    frozenAllNote: frozenAll
      ? `these are the frozen canonical files ending ${anchorsEnd}; the regression anchors apply`
      : 'NOT the frozen canonical all (a different file hash, end date or partition); the regression anchors do not apply'
  };
};

// Each anchor of the pool that this run can check, to the cent.
export const anchorChecks = (
  pool: LoadedPool,
  options: PoolRunOptions,
  figures: ReturnType<typeof figuresOf>,
  frozenAll: boolean
) => {
  const anchors = pool.config.regressionAnchors as
    { costBpsPerSide: number; fixed?: Record<string, number>; portfolioFrozen?: Record<string, number> } | undefined;

  if (!anchors || !frozenAll || options.costBps !== anchors.costBpsPerSide) {
    return {
      applicable: false,
      reason: 'anchors apply only to the frozen all at 5 bps',
      checks: [] as { name: string; expected: number; actual: number; pass: boolean }[]
    };
  }

  const checks: { name: string; expected: number; actual: number; pass: boolean }[] = [];
  const add = (name: string, expected: number | undefined, actual: number, exactCount = false) => {
    if (expected !== undefined) {
      checks.push({
        name,
        expected,
        actual: exactCount ? actual : cents(actual),
        pass: exactCount ? expected === actual : expected === cents(actual)
      });
    }
  };

  if (options.mode === 'fixed' && anchors.fixed) {
    add('fixed net', anchors.fixed.net, figures.summary.net);
    add('fixed max minute drawdown', anchors.fixed.minuteDrawdown, figures.summary.minuteDrawdown);
    add('fixed funded lots', anchors.fixed.lots, figures.summary.lots, true);
    add('fixed virtual trades', anchors.fixed.virtualTrades, figures.summary.virtualTrades, true);
  }

  if (options.mode === 'portfolio' && options.dividends === 'frozen' && anchors.portfolioFrozen) {
    add('portfolio end equity (frozen dividends)', anchors.portfolioFrozen.endEquity, figures.summary.endEquity);
    checks.push({
      name: 'portfolio max daily % drawdown (to 0.01%)',
      expected: anchors.portfolioFrozen.dailyPercent!,
      actual: Math.round(figures.summary.dailyPercent * 10000) / 10000,
      pass: anchors.portfolioFrozen.dailyPercent === Math.round(figures.summary.dailyPercent * 10000) / 10000
    });
  }

  return {
    applicable: checks.length > 0,
    reason: checks.length > 0 ? '' : 'no anchor for this mode/convention',
    checks
  };
};

const table = (headers: string[], rows: (string | number)[][]) => {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index]).length))
  );
  const line = (cells: (string | number)[]) =>
    cells.map((cell, index) => String(cell).padStart(widths[index]!)).join('  ');

  return [line(headers), ...rows.map(line)].map((text) => `    ${text}`).join('\n');
};

export const formatReport = (record: PoolRunRecord) => {
  const { pool, run, data, figures: f, anchors, years } = record;
  const fixed = run.mode === 'fixed';
  const lines = [
    `Pool ${pool.id} — ${pool.name}  [${pool.role}]`,
    `  status: ${pool.status}`,
    `  config: ${pool.file} (sha256 ${pool.fileSha256.slice(0, 12)}…; algorithmic hash ${pool.configHash.slice(0, 12)}…)`,
    `  books (${record.frozenCheck}):`,
    ...record.books.map(
      (book) =>
        `    ${book.symbol.padEnd(4)} ${book.phenotype.padEnd(15)} ${book.short}  [${book.phenotypeFile} sha256 ${book.phenotypeFileSha256.slice(0, 12)}…; ${book.candidateId}; grid ${book.parametersSha256.slice(0, 12)}…]`
    ),
    '',
    fixed
      ? `Run: FIXED pool — one shared funded slot, ${money(run.notionalPerTrade)} on every funded trade (constant, never compounded; at most one funded lot or reservation at a time); the books monitor signals concurrently under the frozen shadow policy (same-minute decisions in alphabetical symbol order)`
      : `Run: PORTFOLIO — $${(run.initialEquity ?? 0).toLocaleString('en-US')} core (${run.core}), each funded trade borrows ${pct(run.borrowedFraction ?? NaN, 0)} of marked equity (one shared slot, shadow policy); profits reinvested 60/40 VOOG/VGT, losses funded by core sales; dividends: ${run.dividends}`,
    `  friction ${run.costBpsPerSide} bps per side on every fill (commission $0); margin interest ${pct(run.annualRate, 2)} simple, 365-day year; stops fill at the stop`,
    `Data: ${data.partition} — ${data.first} → ${data.last}, ${data.sessions.toLocaleString('en-US')} sessions (${data.timeZone}); first eligible session ${data.firstEligible}`,
    ...Object.entries(data.members).map(
      ([symbol, member]) =>
        `    ${symbol.padEnd(4)} ${member.file} sha256 ${member.sha256.slice(0, 12)}… ${member.matchesFrozen ? '(= frozen all)' : member.frozenPin ? '(DIFFERS from the frozen all)' : ''}${member.splitAdjustments.length ? ` splits: ${member.splitAdjustments.map((split) => `${split.effectiveDate} ×${split.ratio}`).join(', ')} (forward-adjusted)` : ''}`
    ),
    `  ${data.frozenAllNote}`,
    '',
    `Activity: ${f.virtualTrades} virtual trades → ${f.decisions} pool decisions: ${f.granted} funded, ${f.refused} refused (${
      Object.entries(f.refusalReasons)
        .map(([reason, count]) => `${count} ${reason}`)
        .join(', ') || 'none'
    }); ${f.sameMinuteDecisions} same-minute decisions`,
    `  funded lots ${f.fundedLots} (closed ${f.closedLots}, open ${f.openLots}${f.openPosition.length ? `: ${f.openPosition.map((lot) => `${lot.symbol} since ${lot.entryUtc}, marked ${money(lot.markNet)}`).join('; ')}` : ''})`,
    ...(fixed
      ? [
          `  notional: ${money(f.notionalPerTrade)} on every lot (${f.notionalViolations} exceptions); overlapping lots ${f.overlappingLots}; max simultaneous funded lots ${f.maxSimultaneousFundedLots}`
        ]
      : []),
    `  time in market ${pct(f.timeInMarket, 1)} of the ${f.sessions.toLocaleString('en-US')} sessions from the first eligible one; borrowing dollar-days ${Math.round(f.borrowingDollarDays).toLocaleString('en-US')} → strategy net per $1M borrowing-dollar-days ${money(f.netPerMillionBorrowingDollarDays)}`,
    `P&L (strategy): realized ${money(f.realized)} + unrealized ${money(f.unrealized)} = net ${money(f.net)}, after margin interest ${money(f.interest)} and friction ${money(f.frictionDollars)}; worst lot ${money(f.worstLot)}`,
    ...(fixed
      ? [
          `Risk (fixed pool, % of the ${money(f.notionalPerTrade)} notional):`,
          `  max MINUTE-sampled drawdown ${money(f.minuteDrawdown)} = ${pct(f.minuteDrawdownPercentOfNotional!)} (peak ${f.minuteDrawdownPeakUtc}, trough ${f.minuteDrawdownTroughUtc})`,
          `  max DAILY (close) drawdown  ${money(f.dailyDrawdown)} = ${pct(f.dailyDrawdownPercentOfNotional!)}`
        ]
      : [
          `Portfolio: equity ${money(f.initialEquity!)} → ${money(f.endEquity!)} (× ${(f.endEquity! / f.initialEquity!).toFixed(2)}); dividends credited ${money(f.cumulativeDividends!)}`,
          `  max DAILY % drawdown of marked equity ${pct(f.dailyPercentDrawdown!)} (peak ${f.dailyPercentPeakUtc}, trough ${f.dailyPercentTroughUtc}); max MINUTE % drawdown ${pct(f.minutePercentDrawdown!)}`,
          `  dollar drawdowns: minute ${money(f.minuteDrawdown)}, daily ${money(f.dailyDrawdown)}`
        ]),
    '',
    'By calendar year (one continuous run; state carried across years):',
    table(
      fixed ? ['year', 'strategy', 'interest', 'lots'] : ['year', 'equity change', 'strategy', 'interest', 'lots'],
      years.map((row) =>
        fixed
          ? [row.period, money(row.strategyChange), money(row.interest), row.lotsEntered]
          : [row.period, money(row.equityChange), money(row.strategyChange), money(row.interest), row.lotsEntered]
      )
    ),
    'By book:',
    table(
      ['symbol', 'lots', 'wins', 'net', 'lot-days', 'refused'],
      Object.entries(f.bySymbol).map(([symbol, item]) => [
        symbol,
        item.lots,
        item.wins,
        money(item.net),
        Math.round(item.lotDays),
        item.refusals
      ])
    ),
    '',
    anchors.applicable
      ? `Regression anchors (frozen controls): ${anchors.checks.map((check) => `${check.name} ${check.pass ? 'PASS' : `FAIL (expected ${check.expected}, got ${check.actual})`}`).join('; ')}`
      : `Regression anchors: not checked (${anchors.reason})`,
    `Outputs: ${record.outDir}/ (report.txt, summary.json, lots.csv, signals.csv, daily.csv, yearly.csv, monthly.csv)`,
    'These are inspected historical figures, not expected future returns.'
  ];

  return `${lines.join('\n')}\n`;
};

export type PoolRunRecord = Awaited<ReturnType<typeof runRecordOf>>;

export const runRecordOf = async (
  pool: LoadedPool,
  loaded: LoadedUniverse,
  result: NRunResult,
  options: PoolRunOptions,
  outDir: string
) => {
  const computed = figuresOf(pool, loaded, result, options);
  const data = dataRecordOf(pool, loaded);
  const initialEquity = pool.config.portfolio.initialCore.VOOG + pool.config.portfolio.initialCore.VGT;
  const base = options.mode === 'portfolio' ? initialEquity : 0;

  return {
    schemaVersion: 1,
    kind: 'pool-run',
    generatedAt: new Date().toISOString(),
    node: process.version,
    pool: {
      id: pool.config.id,
      name: pool.config.name,
      role: pool.config.role,
      status: pool.config.status,
      file: pool.config.file,
      fileSha256: await sha256File(pool.config.file),
      configHash: pool.config.configHash
    },
    books: pool.config.books.map((book) => ({
      symbol: book.symbol,
      phenotype: book.phenotype,
      phenotypeFile: book.phenotypeFile,
      phenotypeFileSha256: pool.phenotypeFiles[book.symbol]!.sha256,
      candidateId: book.candidateId,
      parametersSha256: book.parametersSha256,
      grid: book.grid,
      short: pool.phenotypes[book.symbol]!.short
    })),
    frozenCheck: pool.frozenCheck,
    run: {
      mode: options.mode,
      dataset: options.dataset,
      end: options.end ?? null,
      costBpsPerSide: options.costBps,
      commission: 0,
      policy: pool.config.funding.policy,
      fundedSlots: pool.config.funding.fundedSlots,
      notionalPerTrade: pool.config.funding.notionalPerTrade,
      compounding: false,
      annualRate: pool.config.interest.annualRate,
      interestMethod: 'simple, 365-day year',
      stopFill: pool.config.execution.stopFill,
      stopSlippageBps: pool.config.execution.stopSlippageBps,
      ...(options.mode === 'portfolio'
        ? {
            initialEquity,
            core: `VOOG $${pool.config.portfolio.initialCore.VOOG.toLocaleString('en-US')} / VGT $${pool.config.portfolio.initialCore.VGT.toLocaleString('en-US')}`,
            borrowedFraction: pool.config.portfolio.borrowedFraction,
            dividends: options.dividends
          }
        : {})
    },
    data,
    figures: computed.figures,
    summary: computed.summary,
    anchors: anchorChecks(pool, options, computed, data.frozenAll),
    years: periodRows(result, (date) => date.slice(0, 4), base),
    months: periodRows(result, (date) => date.slice(0, 7), base),
    lots: computed.lots,
    outDir
  };
};

export const writeRunRecord = async (record: PoolRunRecord, result: NRunResult) => {
  const dir = record.outDir;

  assertOutsideResearch(dir);
  await fs.ensureDir(dir);

  const { lots, years, months, ...summary } = record;

  await fs.outputFile(path.join(dir, 'report.txt'), formatReport(record));
  await fs.writeJson(path.join(dir, 'summary.json'), { ...summary, years, months }, { spaces: 2 });
  await fs.outputFile(path.join(dir, 'lots.csv'), toCsv(lots));
  await fs.outputFile(path.join(dir, 'signals.csv'), toCsv(signalRows(result)));
  await fs.outputFile(path.join(dir, 'daily.csv'), toCsv(dailyRows(result)));
  await fs.outputFile(path.join(dir, 'yearly.csv'), toCsv(years));
  await fs.outputFile(path.join(dir, 'monthly.csv'), toCsv(months));
};

// `npm run pools -- <command>`: named D1 shared-pool configurations (config/pools/<ID>.json) on the canonical data.
//
//   list                                  the pools, and the research-only archives (never runnable here)
//   show <ID>                             a pool's books, phenotype references, hashes, funding and anchors
//   validate                              load every pool (schema, phenotype pins, frozen-book equality)
//   fixed <ID> [options]                  fixed pool: one shared slot, a constant $100,000 per funded trade
//   portfolio <ID> [options]              the $300,000 60/40 VOOG/VGT portfolio borrowing 20% of marked equity
//   compare <ID> <ID> [options]           both pools on identical data, capital, interest and costs
//   costs <ID> [options]                  the pool at each of its sensitivity costs (0/2/5/10 bps per side)
//   verify [<ID> …]                       the regression to the frozen controls and ledgers (B4, B5)
//   research list|show <ID>|verify        the 15 research-only diverse-d1 finalists (metadata only)
//   forward status|freeze|import|report   the prospective shadow comparison (research/prospective-b4-b5-shadow/)
//
// Options: --dataset all|training|holdout|final (default all: every row of data/<SYMBOL>/data.csv), --cost-bps N
// (default the pool's 5), --end YYYY-MM-DD (a diagnostic endpoint), --dividends frozen|symmetric (portfolio; default
// the pool's), --mode fixed|portfolio|both (compare/costs), --out DIR, --json. Outputs go under evaluations/pools/.
import path from 'node:path';
import fs from 'fs-extra';
import { loadPool, listPoolIds } from './load.ts';
import {
  defaultOutDir,
  formatReport,
  runRecordOf,
  writeRunRecord,
  type PoolRunRecord,
  assertOutsideResearch,
  evaluationsRoot
} from './report.ts';
import { type PoolMode, type PoolRunOptions, loadPoolUniverse, poolDatasets, runPoolOn } from './run.ts';
import { runVerify } from './verify.ts';

const log = (line: string) => console.info(`[pools] ${line}`);

export const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

const positionals = (args: string[]) => {
  const values: string[] = [];

  for (let index = 0; index < args.length; index++) {
    if (args[index]!.startsWith('--')) {
      index += args[index] === '--json' ? 0 : 1;
    } else {
      values.push(args[index]!);
    }
  }

  return values;
};

export const runOptionsOf = (
  args: string[],
  mode: PoolMode,
  defaults: { costBps: number; dividends: 'frozen' | 'symmetric' }
): PoolRunOptions => {
  const dataset = (option(args, 'dataset') ?? 'all') as PoolRunOptions['dataset'];
  const cost = option(args, 'cost-bps');
  const costBps = cost === undefined ? defaults.costBps : Number(cost);
  const dividends = (option(args, 'dividends') ?? defaults.dividends) as PoolRunOptions['dividends'];
  const end = option(args, 'end');

  if (!poolDatasets.includes(dataset)) {
    throw new Error(
      `--dataset must be one of ${poolDatasets.join(', ')} (the prospective data is read only by \`forward\`)`
    );
  }

  if (!(Number.isFinite(costBps) && costBps >= 0 && costBps <= 100)) {
    throw new Error('--cost-bps must be a number of basis points per side from 0 to 100');
  }

  if (dividends !== 'frozen' && dividends !== 'symmetric') {
    throw new Error('--dividends must be frozen or symmetric');
  }

  if (end !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error('--end must be YYYY-MM-DD');
  }

  return { mode, dataset, costBps, dividends, ...(end ? { end } : {}) };
};

const runOne = async (id: string, mode: PoolMode, args: string[]) => {
  const pool = await loadPool(id);
  const options = runOptionsOf(args, mode, {
    costBps: pool.config.costs.bpsPerSide,
    dividends: pool.config.portfolio.dividends
  });
  const outDir = option(args, 'out') ?? defaultOutDir(pool, options);

  assertOutsideResearch(outDir);
  log(`${id} ${mode}: loading ${options.dataset}…`);

  const loaded = await loadPoolUniverse(pool, options);
  const result = runPoolOn(pool, loaded, options);
  const record = await runRecordOf(pool, loaded, result, options, outDir);

  await writeRunRecord(record, result);

  return record;
};

const printRecord = (record: PoolRunRecord, args: string[]) => {
  if (args.includes('--json')) {
    const rest: Partial<PoolRunRecord> = { ...record };

    delete rest.trades;
    delete rest.tradeLedgerText;
    delete rest.months;
    console.log(JSON.stringify(rest, null, 2));
  } else {
    process.stdout.write(formatReport(record));
  }
};

const money = (value: number) =>
  Number.isFinite(value)
    ? `${value <= -0.5 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : 'n/a';
const pct = (value: number) => (Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : 'n/a');

// Two runs side by side: summary deltas and aligned yearly/monthly series.
export const comparisonOf = (a: PoolRunRecord, b: PoolRunRecord) => {
  const rows: [string, number, number, (value: number) => string][] = [
    ['strategy net', a.figures.net, b.figures.net, money],
    ['realized', a.figures.realized, b.figures.realized, money],
    ['unrealized (open at end)', a.figures.unrealized, b.figures.unrealized, money],
    ['margin interest', a.figures.interest, b.figures.interest, money],
    ['friction', a.figures.frictionDollars, b.figures.frictionDollars, money],
    ['funded lots', a.figures.fundedLots, b.figures.fundedLots, String],
    ['refused decisions', a.figures.refused, b.figures.refused, String],
    ['time in market', a.figures.timeInMarket, b.figures.timeInMarket, pct],
    [
      'borrowing dollar-days',
      a.figures.borrowingDollarDays,
      b.figures.borrowingDollarDays,
      (value) => Math.round(value).toLocaleString('en-US')
    ],
    [
      'net per $1M borrowing-dollar-days',
      a.figures.netPerMillionBorrowingDollarDays,
      b.figures.netPerMillionBorrowingDollarDays,
      money
    ],
    ['max minute drawdown ($)', a.figures.minuteDrawdown, b.figures.minuteDrawdown, money],
    ['max daily drawdown ($)', a.figures.dailyDrawdown, b.figures.dailyDrawdown, money],
    ...(a.run.mode === 'portfolio'
      ? ([
          ['end equity', a.figures.endEquity!, b.figures.endEquity!, money],
          ['max daily % drawdown', a.figures.dailyPercentDrawdown!, b.figures.dailyPercentDrawdown!, pct],
          ['max minute % drawdown', a.figures.minutePercentDrawdown!, b.figures.minutePercentDrawdown!, pct]
        ] as [string, number, number, (value: number) => string][])
      : [])
  ];
  const align = (key: 'years' | 'months') => {
    const periods = [...new Set([...a[key], ...b[key]].map((row) => row.period))].sort();

    return periods.map((period) => {
      const left = a[key].find((row) => row.period === period);
      const right = b[key].find((row) => row.period === period);
      const value = (row: typeof left) => (a.run.mode === 'portfolio' ? row?.equityChange : row?.strategyChange) ?? 0;

      return {
        period,
        [a.pool.id]: value(left),
        [b.pool.id]: value(right),
        difference: value(right) - value(left),
        [`${a.pool.id} lots`]: left?.lotsEntered ?? 0,
        [`${b.pool.id} lots`]: right?.lotsEntered ?? 0
      };
    });
  };

  return {
    summary: rows.map(([name, left, right, format]) => ({
      name,
      [a.pool.id]: left,
      [b.pool.id]: right,
      difference: right - left,
      formatted: [format(left), format(right), format(right - left)]
    })),
    years: align('years'),
    months: align('months')
  };
};

const formatComparison = (a: PoolRunRecord, b: PoolRunRecord, comparison: ReturnType<typeof comparisonOf>) => {
  const width = Math.max(...comparison.summary.map((row) => row.name.length));
  const lines = [
    `Compare ${a.pool.id} vs ${b.pool.id} — ${a.run.mode}, ${a.data.partition} ${a.data.first} → ${a.data.last}, ${a.run.costBpsPerSide} bps per side, ${pct(a.run.annualRate)} simple interest${a.run.mode === 'fixed' ? `, ${money(a.run.notionalPerTrade)} per funded trade` : `, dividends ${a.run.dividends}`}`,
    `  ${''.padEnd(width)}  ${a.pool.id.padStart(16)}  ${b.pool.id.padStart(16)}  ${`${b.pool.id} − ${a.pool.id}`.padStart(16)}`,
    ...comparison.summary.map(
      (row) => `  ${row.name.padEnd(width)}  ${row.formatted.map((cell) => cell.padStart(16)).join('  ')}`
    ),
    '',
    `  by year (${a.run.mode === 'portfolio' ? 'equity change' : 'strategy mark change'}):`,
    ...comparison.years.map(
      (row) =>
        `    ${row.period}  ${money(row[a.pool.id] as number).padStart(14)}  ${money(row[b.pool.id] as number).padStart(14)}  ${money(row.difference as number).padStart(14)}`
    ),
    '',
    `  monthly series: monthly.csv; each run's full report: ${a.outDir}/, ${b.outDir}/`,
    '  Inspected historical figures on the same observations; not expected future returns.'
  ];

  return `${lines.join('\n')}\n`;
};

const compare = async (args: string[]) => {
  const [first, second] = positionals(args).slice(1);

  if (!first || !second) {
    throw new Error('usage: compare <ID> <ID> [--mode fixed|portfolio|both] [--dataset all] [--cost-bps N]');
  }

  const modes: PoolMode[] =
    (option(args, 'mode') ?? 'both') === 'both' ? ['fixed', 'portfolio'] : [option(args, 'mode') as PoolMode];

  for (const mode of modes) {
    if (mode !== 'fixed' && mode !== 'portfolio') {
      throw new Error('--mode must be fixed, portfolio or both');
    }

    const forwarded = args.filter((_, index) => !(args[index] === '--out' || args[index - 1] === '--out'));
    const outBase = option(args, 'out');
    const runArgs = (id: string) =>
      outBase ? [...forwarded, '--out', path.join(outBase, `${id}-${mode}`)] : forwarded;
    const a = await runOne(first, mode, runArgs(first));
    const b = await runOne(second, mode, runArgs(second));

    if (
      a.run.costBpsPerSide !== b.run.costBpsPerSide ||
      a.data.first !== b.data.first ||
      a.data.last !== b.data.last ||
      a.run.annualRate !== b.run.annualRate
    ) {
      throw new Error('the two runs differ in cost, window or interest; a comparison needs identical conditions');
    }

    const comparison = comparisonOf(a, b);
    const compareName = `compare-${first}-${second}-${mode}-${a.run.costBpsPerSide}bps`;
    const outDir = outBase ? path.join(outBase, compareName) : path.join(evaluationsRoot, a.run.dataset, compareName);

    assertOutsideResearch(outDir);

    const text = formatComparison(a, b, comparison);
    const { toCsv } = await import('../multi-etf-allocator/metrics.ts');

    await fs.outputFile(path.join(outDir, 'compare.txt'), text);
    await fs.writeJson(
      path.join(outDir, 'compare.json'),
      {
        schemaVersion: 1,
        kind: 'pool-compare',
        generatedAt: new Date().toISOString(),
        mode,
        runs: [a.outDir, b.outDir],
        ...comparison
      },
      { spaces: 2 }
    );
    await fs.outputFile(path.join(outDir, 'monthly.csv'), toCsv(comparison.months));
    await fs.outputFile(path.join(outDir, 'yearly.csv'), toCsv(comparison.years));
    process.stdout.write(text);
    log(`→ ${outDir}/`);
  }
};

const costs = async (args: string[]) => {
  const [id] = positionals(args).slice(1);

  if (!id) {
    throw new Error('usage: costs <ID> [--mode fixed|portfolio] [--dataset all]');
  }

  const pool = await loadPool(id);
  const mode = (option(args, 'mode') ?? 'fixed') as PoolMode;

  if (mode !== 'fixed' && mode !== 'portfolio') {
    throw new Error('--mode must be fixed or portfolio');
  }
  const rows: string[] = [];

  for (const costBps of pool.config.costs.sensitivityBps) {
    const outBase = option(args, 'out');
    const record = await runOne(id, mode, [
      ...args.filter(
        (item, index) =>
          !['--cost-bps', '--out'].includes(item) && !['--cost-bps', '--out'].includes(args[index - 1] ?? '')
      ),
      '--cost-bps',
      String(costBps),
      ...(outBase ? ['--out', path.join(outBase, `${id}-${mode}-${costBps}bps`)] : [])
    ]);

    rows.push(
      `  ${String(costBps).padStart(3)} bps  net ${money(record.figures.net).padStart(12)}  minute DD ${money(record.figures.minuteDrawdown).padStart(10)}  daily DD ${money(record.figures.dailyDrawdown).padStart(10)}  lots ${record.figures.fundedLots}${mode === 'portfolio' ? `  end equity ${money(record.figures.endEquity!)}  daily % DD ${pct(record.figures.dailyPercentDrawdown!)}` : ''}  → ${record.outDir}/`
    );
  }

  process.stdout.write(
    `Cost sensitivity of ${id} (${mode}, per side; the pool config is unchanged):\n${rows.join('\n')}\n`
  );
};

const show = async (id: string) => {
  const pool = await loadPool(id);
  const { config } = pool;

  console.log(`${config.id} — ${config.name}  [${config.role}]`);
  console.log(`  ${config.status}`);
  console.log(`  file ${config.file}; algorithmic hash ${config.configHash}`);
  console.log(`  ${config.description}`);
  console.log(`  books (${pool.frozenCheck}):`);

  for (const book of config.books) {
    console.log(`    ${book.symbol.padEnd(4)} ${book.phenotype.padEnd(15)} ${pool.phenotypes[book.symbol]!.short}`);
    console.log(
      `         ${book.phenotypeFile} (sha256 ${pool.phenotypeFiles[book.symbol]!.sha256}); candidate ${book.candidateId}; grid sha256 ${book.parametersSha256}`
    );
  }

  console.log(
    `  funding: ${config.funding.policy} policy, ${config.funding.fundedSlots} funded slot, $${config.funding.notionalPerTrade.toLocaleString('en-US')} per funded trade, compounding ${config.funding.compounding}`
  );
  console.log(
    `  interest ${pct(config.interest.annualRate)} ${config.interest.method}, ${config.interest.dayCount}-day year; costs ${config.costs.bpsPerSide} bps per side (sensitivity ${config.costs.sensitivityBps.join('/')}), commission $${config.costs.commission}`
  );
  console.log(
    `  portfolio: core VOOG $${config.portfolio.initialCore.VOOG.toLocaleString('en-US')} / VGT $${config.portfolio.initialCore.VGT.toLocaleString('en-US')}, borrowed fraction ${config.portfolio.borrowedFraction}, dividends ${config.portfolio.dividends}`
  );
  console.log(`  frozen reference: ${JSON.stringify(config.frozenReference ?? null)}`);
  console.log(`  regression anchors: ${JSON.stringify(config.regressionAnchors ?? null)}`);
};

export const run = async (args: string[]) => {
  const [command] = positionals(args);

  switch (command) {
    case 'list': {
      for (const id of await listPoolIds()) {
        const pool = await loadPool(id);

        console.log(
          `${id.padEnd(4)} ${pool.config.role.padEnd(42)} ${pool.config.name}  (${pool.config.books.map((book) => `${book.symbol} ${book.phenotype}`).join(', ')})`
        );
      }

      const { listResearchCatalogs } = await import('./research.ts');

      for (const line of await listResearchCatalogs()) {
        console.log(line);
      }

      break;
    }

    case 'show': {
      const [, id] = positionals(args);

      if (!id) {
        throw new Error('usage: show <ID>');
      }

      await show(id);
      break;
    }

    case 'validate': {
      for (const id of await listPoolIds()) {
        const pool = await loadPool(id);

        log(
          `${id}: valid; ${pool.config.books.length} books; ${pool.frozenCheck}; hash ${pool.config.configHash.slice(0, 16)}…`
        );
      }

      break;
    }

    case 'fixed':
    case 'portfolio': {
      const [, id] = positionals(args);

      if (!id) {
        throw new Error(
          `usage: ${command} <ID> [--dataset all] [--cost-bps N] [--end YYYY-MM-DD] [--out DIR] [--json]`
        );
      }

      const record = await runOne(id, command, args);

      printRecord(record, args);
      log(`→ ${record.outDir}/`);
      break;
    }

    case 'compare':
      await compare(args);
      break;

    case 'costs':
      await costs(args);
      break;

    case 'verify': {
      const { record, file } = await runVerify(positionals(args).slice(1));

      for (const result of record.results) {
        for (const check of result.checks) {
          log(`${result.pool} ${check.pass ? 'PASS' : 'FAIL'} ${check.name} (${check.detail})`);
        }
      }

      log(`${record.passed ? 'all checks passed' : `${record.failures.length} FAILED`} → ${file}`);

      if (!record.passed) {
        throw new Error(`verify failed: ${record.failures.slice(0, 3).join('; ')}`);
      }

      break;
    }

    case 'research': {
      const { runResearch } = await import('./research.ts');

      await runResearch(positionals(args).slice(1), args);
      break;
    }

    case 'forward': {
      const { runForward } = await import('./forward/cli.ts');

      await runForward(positionals(args).slice(1), args);
      break;
    }

    default:
      throw new Error(`unknown command ${command ?? ''}; see src/pools/cli.ts or docs/pools/README.md`);
  }
};

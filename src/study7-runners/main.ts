// Study 7 local strategy runners (execution tooling only). From the repository root, with Node v24.21.0:
//
//   npm run study7-run -- list
//   npm run study7-run -- run <alias> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--quiet]
//   npm run study7-run -- compare <alias> <alias> … | --all [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]
//
// Defaults: the latest New York date covered by every member's local data, 5 bps PER SIDE, 11% simple interest, the
// fixed $100,000 single slot. Every run goes through the unchanged pools engine (see run.ts) and writes a new directory
// under evaluations/study7-runs/ (never overwritten). See src/study7-runners/README.md.
import path from 'node:path';
import fs from 'fs-extra';
import { UsageError, aliases, specOf } from './aliases.ts';
import { resolveAlias } from './resolve.ts';
import {
  type RunOutcome,
  commonLastDate,
  formatReport,
  lastDataDates,
  newOutputDir,
  parseCostBps,
  reproducibility,
  retrospectiveLabel,
  runAlias,
  runResolved,
  summaryText,
  validateEnd
} from './run.ts';

const usage = `usage:
  npm run study7-run -- list
  npm run study7-run -- run <alias> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--quiet]
  npm run study7-run -- compare <alias> <alias> … [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]
  npm run study7-run -- compare --all [--end …] [--cost-bps …] [--out …]   (the 11 required aliases)
--cost-bps is per side (default 5); --end defaults to the latest date covered by every member's local data.`;

const valueFlags = new Set(['--end', '--cost-bps', '--out']);
const boolFlags = new Set(['--quiet', '--all']);

const parse = (args: string[]) => {
  const flags: Record<string, string> = {};
  const bools = new Set<string>();
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (valueFlags.has(arg)) {
      const value = args[++i];

      if (value === undefined || value.startsWith('--')) throw new UsageError(`${arg} needs a value`);

      flags[arg.slice(2)] = value;
    } else if (boolFlags.has(arg)) {
      bools.add(arg.slice(2));
    } else if (arg.startsWith('--')) {
      throw new UsageError(`unknown option ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return { flags, bools, positional };
};

const money = (value: number) =>
  `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

// Columns whose every cell is a number, an amount or a percentage are right-aligned; text columns left-aligned.
const table = (headers: string[], rows: string[][]) => {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const numeric = headers.map((_h, i) => rows.every((r) => /^[−$#\d.,%() —-]+$/.test(r[i]!)));

  return [headers, headers.map((_h, i) => '-'.repeat(widths[i]!)), ...rows]
    .map((r) =>
      r
        .map((c, i) => (numeric[i] ? c.padStart(widths[i]!) : c.padEnd(widths[i]!)))
        .join('  ')
        .trimEnd()
    )
    .join('\n');
};

const list = async () => {
  const dates = await lastDataDates();
  const rows: string[][] = [];

  for (const spec of aliases) {
    const resolved = await resolveAlias(spec.alias);
    const symbols = Object.keys(resolved.books);

    rows.push([
      spec.alias + (spec.optional ? ' (optional)' : ''),
      resolved.rank ? `#${resolved.rank}` : '—',
      symbols.join('+'),
      spec.status === 'frozen' ? 'frozen' : 'research only',
      resolved.sealedId,
      Object.entries(resolved.vectorIds)
        .map(([s, id]) => `${s}:${id}`)
        .join(' '),
      path.basename(resolved.configFile, '.json'),
      symbols.every((s) => dates[s]?.present)
        ? `ok → ${symbols.map((s) => dates[s]!.lastDate).sort()[0]}`
        : `MISSING ${symbols.filter((s) => !dates[s]?.present).join(',')}`
    ]);
  }

  console.log(table(['alias', 'rank', 'symbols', 'status', 'sealed ID', 'vector IDs', 'config', 'local data'], rows));
  console.log(
    `\nlocal data (last bar → New York date): ${Object.entries(dates)
      .map(([s, d]) => `${s} ${d.present ? `${d.lastBarUtc} → ${d.lastDate}` : 'missing'}`)
      .join('; ')}`
  );
  console.log(`default end (common last date): ${await commonLastDate()}`);
  console.log(
    'Ranks are the sealed Study 7 ranking (FROZEN_SELECTION.json). "GDX standalone" has four distinct strategies here: gdx-profit, gdx-balanced, gdx-robust (new Study 7 vectors) and gdx-portfolio-aware (the existing B5 GDX book).'
  );
  console.log(retrospectiveLabel);
};

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const compare = async (names: string[], flags: Record<string, string>) => {
  if (new Set(names).size !== names.length) throw new UsageError('compare: an alias is listed twice');
  if (names.length < 2) throw new UsageError('compare needs at least two aliases (or --all)');

  const resolvedList = [];

  for (const name of names) resolvedList.push(await resolveAlias(name));

  const symbols = [...new Set(resolvedList.flatMap((r) => Object.keys(r.books)))];
  const end = await validateEnd(flags.end, symbols);
  const costBps = parseCostBps(flags['cost-bps']);
  const outDir = await newOutputDir(flags.out, 'compare');
  const conventions = resolvedList.map((r) =>
    JSON.stringify({
      notional: r.pool.config.funding.notionalPerTrade,
      slots: r.pool.config.funding.fundedSlots,
      rate: r.pool.config.interest.annualRate,
      stopFill: r.pool.config.execution.stopFill,
      slippage: r.pool.config.execution.stopSlippageBps,
      eligible: r.pool.config.execution.firstEligibleDate
    })
  );

  if (new Set(conventions).size !== 1)
    throw new Error(
      `compare refused: the configurations do not share one convention: ${[...new Set(conventions)].join(' vs ')}`
    );

  const outcomes: RunOutcome[] = [];

  for (const resolved of resolvedList) {
    const outcome = await runResolved(resolved, { end, costBps, outDir: path.join(outDir, resolved.spec.alias) });

    outcomes.push(outcome);
    process.stdout.write(summaryText(outcome));
  }

  const windows = new Set(
    outcomes.map(
      (o) => `${o.record.data.first}→${o.record.data.last}|${o.record.run.costBpsPerSide}|${o.record.run.annualRate}`
    )
  );

  if (windows.size !== 1)
    throw new Error(`compare: runs ended on different windows/frictions: ${[...windows].join(', ')}`);

  const rows = outcomes.map((o) => o.row);
  const headers = Object.keys(rows[0]!);

  await fs.outputFile(
    path.join(outDir, 'compare.csv'),
    `${[headers.join(','), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(','))].join('\n')}\n`
  );

  const display = table(
    [
      'alias',
      'status',
      'rank',
      'symbols',
      'net',
      'realized',
      'unrealized',
      'interest',
      'friction',
      'minute DD',
      '% $100k',
      'daily DD',
      'lots (open)',
      'refused',
      'in market',
      'reconcile'
    ],
    outcomes.map((o) => {
      const r = o.row as Record<string, number | string>;

      return [
        String(r.alias),
        String(r.status),
        r.rank ? `#${r.rank}` : '—',
        String(r.symbols),
        money(r.net as number),
        money(r.realized as number),
        money(r.unrealized as number),
        money(r.interest as number),
        money(r.friction as number),
        money(r.minuteDrawdown as number),
        pct(r.minuteDrawdownPctOf100k as number),
        money(r.dailyDrawdown as number),
        `${r.fundedLots} (${r.openLots})`,
        String(r.refusedSignals),
        pct(r.timeInMarket as number),
        String(r.reconciliation)
      ];
    })
  );
  const header = `Comparison — one window ${outcomes[0]!.record.data.first} → ${outcomes[0]!.record.data.last} (arming ${outcomes[0]!.record.data.firstEligible}), ${costBps} bps PER SIDE, ${(outcomes[0]!.record.run.annualRate * 100).toFixed(0)}% simple interest, fixed $100,000 single slot, stops at the stop; unchanged pools engine.`;

  await fs.outputFile(
    path.join(outDir, 'compare.md'),
    `${header}\n\n\`\`\`\n${display}\n\`\`\`\n\n${retrospectiveLabel}\n`
  );
  await fs.writeJson(
    path.join(outDir, 'compare.json'),
    {
      kind: 'study7-local-compare',
      generatedAt: new Date().toISOString(),
      label: retrospectiveLabel,
      window: { first: outcomes[0]!.record.data.first, last: outcomes[0]!.record.data.last, requestedEnd: end },
      costBpsPerSide: costBps,
      conventions: JSON.parse(conventions[0]!),
      data: outcomes.find(
        (o) =>
          Object.keys(o.record.data.members).length ===
          Math.max(...outcomes.map((x) => Object.keys(x.record.data.members).length))
      )!.record.data.members,
      rows,
      reproducibility: await reproducibility()
    },
    { spaces: 2 }
  );

  console.log(
    `\n${header}\n${display}\n\nOutputs: ${outDir}/ (compare.csv, compare.json, compare.md; one folder per alias with report.txt, trades.csv, trades.json, summary.json, runner.json, signals.csv, daily.csv)`
  );
  console.log(retrospectiveLabel);

  if (outcomes.some((o) => o.reconciliation.applicable && !o.reconciliation.pass))
    throw new Error('a reconciliation against the sealed Study 7 record FAILED (see above)');
};

const main = async () => {
  if (process.version !== 'v24.21.0')
    throw new UsageError(`Node v24.21.0 required (running ${process.version}); see .node-version`);

  const [command, ...rest] = process.argv.slice(2);
  const { flags, bools, positional } = parse(rest);

  switch (command) {
    case 'list':
      if (positional.length || Object.keys(flags).length) throw new UsageError('list takes no arguments');
      await list();
      break;
    case 'run': {
      if (positional.length !== 1) throw new UsageError(`run takes exactly one alias\n${usage}`);

      specOf(positional[0]!);

      const outcome = await runAlias(positional[0]!, {
        ...(flags.end ? { end: flags.end } : {}),
        costBps: parseCostBps(flags['cost-bps']),
        ...(flags.out ? { outDir: flags.out } : {})
      });

      if (!bools.has('quiet')) process.stdout.write(formatReport(outcome.record));
      process.stdout.write(`\n${summaryText(outcome)}`);
      console.log(
        `Outputs: ${outcome.outDir}/ (report.txt, trades.csv, trades.json, summary.json, runner.json, runner-summary.txt, signals.csv, daily.csv, yearly.csv, monthly.csv)`
      );

      if (outcome.reconciliation.applicable && !outcome.reconciliation.pass)
        throw new Error('reconciliation against the sealed Study 7 record FAILED (see above)');
      break;
    }
    case 'compare': {
      const names = bools.has('all') ? aliases.filter((a) => !a.optional).map((a) => a.alias) : positional;

      if (bools.has('all') && positional.length) throw new UsageError('compare --all takes no aliases');

      names.forEach((name) => specOf(name));
      await compare(names, flags);
      break;
    }
    case undefined:
    case 'help':
    case '--help':
      console.log(usage);
      break;
    default:
      throw new UsageError(`unknown command "${command}"\n${usage}`);
  }
};

main().catch((error: unknown) => {
  console.error(`study7-run: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
});

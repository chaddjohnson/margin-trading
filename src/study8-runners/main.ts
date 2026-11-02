// Study 8 local strategy runner (execution tooling only). From the Study 8 branch's repository root, Node v24.21.0:
//
//   npm run study8-run -- list
//   npm run study8-run -- run <alias> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--quiet]
//   npm run study8-run -- compare <alias> <alias> … | --all [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]
//
// Defaults: the latest New York date covered by every member's local data, 5 bps PER SIDE, 11% simple interest, the
// fixed $100,000 single slot. Every run goes through the unchanged pools engine (run.ts) into a new directory under
// evaluations/study8-runs/ (never overwritten). See src/study8-runners/README.md.
import path from 'node:path';
import fs from 'fs-extra';
import { lastDataDates, parseCostBps, validateEnd } from '../study7-runners/run.ts';
import {
  UsageError,
  compareAll,
  frozenSubsets,
  parseAlias,
  roleNames,
  study7AliasNames,
  trackOf,
  trackSlugs
} from './aliases.ts';
import { type Study8Resolved, resolveAlias, sealedManifests } from './resolve.ts';
import {
  type RunOutcome,
  formatReport,
  outputDir,
  reproducibility,
  retrospectiveLabel,
  runFor,
  runResolved,
  summaryText
} from './run.ts';

const usage = `usage:
  npm run study8-run -- list
  npm run study8-run -- run <alias> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--quiet]
  npm run study8-run -- compare <alias> <alias> … [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]
  npm run study8-run -- compare --all [--end …] [--cost-bps …] [--out …]   (${compareAll.join(', ')})
Study 8 aliases: s8-<track>-<profit|robust|balanced|extra1|extra2|best|N>, track ${trackSlugs.join('|')}; frozen: ${Object.keys(frozenSubsets).join(', ')} and the Study 7 runner aliases.
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
const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const list = async () => {
  const { selection } = await sealedManifests();
  const dates = await lastDataDates();
  const names = [
    ...trackSlugs.flatMap((slug) => [`s8-${slug}-best`, ...roleNames.map((role) => `s8-${slug}-${role}`)]),
    ...trackSlugs.flatMap((slug) =>
      (selection.testPlan.F24?.shortlists ?? [])
        .filter((m) => m.track === trackOf[slug])
        .map((m) => `s8-${slug}-${m.order}`)
    ),
    ...Object.keys(frozenSubsets),
    ...study7AliasNames
  ];
  const rows: string[][] = [];

  for (const name of names) {
    let resolved: Study8Resolved;

    try {
      resolved = await resolveAlias(name);
    } catch (error) {
      if (error instanceof UsageError && /no .* role holder/.test(error.message)) {
        rows.push([name, '—', '—', 'empty role (no qualified candidate)', '—', '—']);
        continue;
      }

      throw error;
    }

    const symbols = Object.keys(resolved.books);

    rows.push([
      name,
      resolved.study8.kind === 'study7'
        ? resolved.rank
          ? `S7 #${resolved.rank}`
          : '—'
        : resolved.rank
          ? `#${resolved.rank}`
          : '—',
      symbols.join('+'),
      resolved.spec.status === 'frozen'
        ? 'frozen'
        : resolved.study8.kind === 'study7'
          ? 'Study 7 runner (research only)'
          : `research; T gates ${(resolved.study8.testStatus ?? '').toUpperCase()}`,
      path.basename(resolved.configFile, '.json'),
      symbols.every((s) => dates[s]?.present)
        ? `ok → ${symbols.map((s) => dates[s]!.lastDate).sort()[0]}`
        : `MISSING ${symbols.filter((s) => !dates[s]?.present).join(',')}`
    ]);
  }

  console.log(table(['alias', 'F24 rank', 'symbols', 'status', 'config', 'local data'], rows));
  console.log(
    "\nF24 rank = the sealed training-only Study 8 ranking (S7 #n = Study 7's sealed rank). s8-<track>-best follows the frozen nomination rule within the track: its top-ranked F24 role holder that the one-time test did not fail (else its top-ranked holder; else its shortlist member 1). Study 7 aliases are resolved and reconciled by the Study 7 runner."
  );
  console.log(retrospectiveLabel);
};

const compare = async (names: string[], flags: Record<string, string>) => {
  if (new Set(names).size !== names.length) throw new UsageError('compare: an alias is listed twice');
  if (names.length < 2) throw new UsageError('compare needs at least two aliases (or --all)');

  const resolvedList: Study8Resolved[] = [];

  for (const name of names) resolvedList.push(await resolveAlias(name));

  const symbols = [...new Set(resolvedList.flatMap((r) => Object.keys(r.books)))];
  const end = await validateEnd(flags.end, symbols);
  const costBps = parseCostBps(flags['cost-bps']);
  const outDir = await outputDir(flags.out, 'compare');
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
      'F24 rank',
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
        o.resolved.spec.status === 'frozen'
          ? 'frozen'
          : o.resolved.study8.kind === 'study7'
            ? 'Study 7'
            : `T ${String(o.resolved.study8.testStatus ?? '').toUpperCase()}`,
        o.resolved.study8.kind === 'study7' ? (r.rank ? `S7 #${r.rank}` : '—') : r.rank ? `#${r.rank}` : '—',
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
  const first = outcomes[0]!.record;
  const header = `Comparison — one window ${first.data.first} → ${first.data.last} (arming ${first.data.firstEligible}), ${costBps} bps PER SIDE, ${(first.run.annualRate * 100).toFixed(0)}% simple interest, fixed $100,000 single slot, stops at the stop; unchanged pools engine.`;

  await fs.outputFile(
    path.join(outDir, 'compare.md'),
    `${header}\n\n\`\`\`\n${display}\n\`\`\`\n\n${retrospectiveLabel}\n`
  );
  await fs.writeJson(
    path.join(outDir, 'compare.json'),
    {
      kind: 'study8-local-compare',
      generatedAt: new Date().toISOString(),
      label: retrospectiveLabel,
      window: { first: first.data.first, last: first.data.last, requestedEnd: end },
      costBpsPerSide: costBps,
      conventions: JSON.parse(conventions[0]!),
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
    throw new Error('a reconciliation against a sealed record FAILED (see above)');
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

      parseAlias(positional[0]!);

      const outcome = await runFor(await resolveAlias(positional[0]!), {
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
        throw new Error('reconciliation against the sealed record FAILED (see above)');
      break;
    }
    case 'compare': {
      const names = bools.has('all') ? compareAll : positional;

      if (bools.has('all') && positional.length) throw new UsageError('compare --all takes no aliases');

      names.forEach((name) => parseAlias(name));
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
  console.error(`study8-run: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
});

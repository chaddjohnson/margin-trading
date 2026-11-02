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
import { parseCostBps } from '../study7-runners/run.ts';
import { type FileProvenance, dataStatus, latestCommonSession, validateEnd } from './data.ts';
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
  dataLines,
  formatReport,
  newDataLabel,
  outputDir,
  releaseIfEmpty,
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
--cost-bps is per side (default 5); --end defaults to the latest session that every member's local file holds completely
(a bar at or after its 4:00 p.m. close, 1:00 p.m. on early-close days); an explicit later or incomplete date is refused.`;

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
  const data = await dataStatus();
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
      symbols.every((s) => data[s]?.present)
        ? `ok → ${symbols.map((s) => (data[s] as FileProvenance).latestCompleteSession).sort()[0]}`
        : `MISSING ${symbols.filter((s) => !data[s]?.present).join(',')}`
    ]);
  }

  console.log(table(['alias', 'F24 rank', 'symbols', 'status', 'config', 'latest complete session'], rows));
  console.log(
    "\nF24 rank = the sealed training-only Study 8 ranking (S7 #n = Study 7's sealed rank). s8-<track>-best follows the frozen nomination rule within the track: its top-ranked F24 role holder that the one-time test did not fail (else its top-ranked holder; else its shortlist member 1). Study 7 aliases are resolved and reconciled by the Study 7 runner."
  );
  console.log(retrospectiveLabel);
};

const compare = async (names: string[], flags: Record<string, string>) => {
  if (new Set(names).size !== names.length) throw new UsageError('compare: an alias is listed twice');
  if (names.length < 2) throw new UsageError('compare needs at least two aliases (or --all)');

  const started = Date.now();
  const resolvedList: Study8Resolved[] = [];

  for (const name of names) resolvedList.push(await resolveAlias(name));

  // one common cutoff: the latest session that every file any of the strategies reads holds completely
  const symbols = [...new Set(resolvedList.flatMap((r) => Object.keys(r.books)))];
  const common = await latestCommonSession(symbols);
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

  try {
    for (const resolved of resolvedList) {
      const outcome = await runResolved(resolved, {
        end,
        costBps,
        outDir: path.join(outDir, resolved.spec.alias),
        latestCommonSession: common.latest
      });

      outcomes.push(outcome);
      process.stdout.write(`${summaryText(outcome)}\n`);
    }
  } catch (error) {
    await releaseIfEmpty(outDir);
    throw error;
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
      'gross',
      'interest',
      'friction',
      'minute DD',
      '% $100k',
      'daily DD',
      '% $100k',
      'lots (open)',
      'refused',
      'in market',
      'reconcile',
      'export'
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
        money(r.grossBeforeCosts as number),
        money(r.interest as number),
        money(r.friction as number),
        money(r.minuteDrawdown as number),
        pct(r.minuteDrawdownPctOf100k as number),
        money(r.dailyDrawdown as number),
        pct(r.dailyDrawdownPctOf100k as number),
        `${r.fundedLots} (${r.openLots})`,
        String(r.refusedSignals),
        pct(r.timeInMarket as number),
        String(r.reconciliation),
        String(r.exportCheck)
      ];
    })
  );

  // side by side: the marked P&L change of each calendar year (one continuous run per strategy)
  const periods = [...new Set(outcomes.flatMap((o) => o.record.years.map((y) => y.period)))].sort();
  const yearly = periods.map((period) =>
    Object.fromEntries([
      ['year', period],
      ...outcomes.map((o) => [
        o.resolved.spec.alias,
        o.record.years.find((y) => y.period === period)?.strategyChange ?? 0
      ])
    ])
  );
  const yearlyDisplay = table(
    ['year', ...outcomes.map((o) => o.resolved.spec.alias)],
    [
      ...yearly.map((row) => [String(row.year), ...outcomes.map((o) => money(row[o.resolved.spec.alias] as number))]),
      ['total', ...outcomes.map((o) => money(o.record.figures.net))]
    ]
  );

  await fs.outputFile(
    path.join(outDir, 'compare-yearly.csv'),
    `${['year', ...outcomes.map((o) => o.resolved.spec.alias)].join(',')}\n${yearly
      .map((row) => [row.year, ...outcomes.map((o) => row[o.resolved.spec.alias])].map(csvCell).join(','))
      .join('\n')}\n`
  );

  const first = outcomes[0]!.record;
  const data = outcomes[0]!.data;
  const repro = await reproducibility();
  const header = `Comparison — one window ${first.data.first} → ${first.data.last} (arming ${first.data.firstEligible}), ${costBps} bps PER SIDE, ${(first.run.annualRate * 100).toFixed(0)}% simple interest, fixed $100,000 single slot, stops at the stop; unchanged pools engine.`;
  const cutoff = `Common cutoff: ${end === common.latest ? `${end} = the latest session that every file read (${symbols.join(', ')}) holds completely (limited by ${common.limitedBy.join(', ')})` : `${end} (requested; the latest common complete session is ${common.latest})`}.`;
  const provenance = [
    'Data files (all five; "read" = used by at least one strategy here):',
    ...dataLines(data, symbols),
    `Engine digest ${String(repro.engineDigest).slice(0, 16)}…; git ${repro.git.commit.slice(0, 12)} (${repro.git.branch}); Node ${process.version}; total runtime ${((Date.now() - started) / 1000).toFixed(1)} s.`
  ].join('\n');
  const labels = [retrospectiveLabel, newDataLabel(first.data.last)].filter(Boolean).join('\n');

  await fs.outputFile(
    path.join(outDir, 'compare.md'),
    `${header}\n${cutoff}\n\n\`\`\`\n${display}\n\`\`\`\n\nBy calendar year (marked P&L change):\n\n\`\`\`\n${yearlyDisplay}\n\`\`\`\n\n\`\`\`\n${provenance}\n\`\`\`\n\nPer strategy: ${outcomes.map((o) => `${o.resolved.spec.alias}/`).join(', ')} (runner-summary.txt, lots.txt, lots.csv, trades.csv, report.txt, …)\n\n${labels}\n`
  );
  await fs.writeJson(
    path.join(outDir, 'compare.json'),
    {
      kind: 'study8-local-compare',
      generatedAt: new Date().toISOString(),
      label: labels.replace('\n', ' '),
      aliases: names,
      window: {
        first: first.data.first,
        last: first.data.last,
        requestedEnd: end,
        latestCommonCompleteSession: common.latest,
        limitedBy: common.limitedBy
      },
      costBpsPerSide: costBps,
      conventions: JSON.parse(conventions[0]!),
      rows,
      yearly,
      dataFiles: data,
      runtimeSeconds: (Date.now() - started) / 1000,
      reproducibility: repro
    },
    { spaces: 2 }
  );

  console.log(
    `\n${header}\n${cutoff}\n${display}\n\nBy calendar year (marked P&L change):\n${yearlyDisplay}\n\n${provenance}\n\nOutputs: ${outDir}/ (compare.md, compare.csv, compare-yearly.csv, compare.json; one folder per alias with runner-summary.txt, lots.txt, lots.csv, lots.json, trades.csv, trades.json, report.txt, summary.json, runner.json, signals.csv, daily.csv, monthly.csv, yearly.csv)`
  );
  console.log(labels);

  if (outcomes.some((o) => o.reconciliation.applicable && !o.reconciliation.pass))
    throw new Error('a reconciliation against a sealed record FAILED (see above)');
  if (outcomes.some((o) => !o.exports.pass)) throw new Error('an export check FAILED (see above)');
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
        `Outputs: ${outcome.outDir}/ (runner-summary.txt, lots.txt, lots.csv, lots.json, trades.csv, trades.json, report.txt, summary.json, runner.json, signals.csv, daily.csv, monthly.csv, yearly.csv)`
      );

      if (outcome.reconciliation.applicable && !outcome.reconciliation.pass)
        throw new Error('reconciliation against the sealed record FAILED (see above)');
      if (!outcome.exports.pass) throw new Error('the export check FAILED (see above)');
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

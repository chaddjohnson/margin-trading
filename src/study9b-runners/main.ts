// Study 9 Phase B local strategy runner (execution tooling only; Study 8's runner CLI, ported). From the repository
// root, Node v24.21.0:
//
//   npm run study9b-run -- list
//   npm run study9b-run -- run <alias> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--quiet]
//   npm run study9b-run -- compare <alias> <alias> … | --all [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]
//   npm run study9b-run -- research-configs     (once, after the sealed F24 test: writes the S9B-* research pools)
//
// Defaults: the latest New York date covered completely by every member's local file, 5 bps PER SIDE, 11% simple
// interest, the fixed $100,000 single slot. Every run goes through the unchanged pools engine (run.ts) into a new
// directory under evaluations/study9b-runs/ (never overwritten). See src/study9b-runners/README.md.
import path from 'node:path';
import fs from 'fs-extra';
import { parseCostBps } from '../study7-runners/run.ts';
import { type FileProvenance, dataStatus } from '../study8-runners/data.ts';
import { latestCommonSession, validateEnd } from './data.ts';
import { allSymbols, tracks } from '../study9-phase-b/context.ts';
import { UsageError, compareAll, parseAlias, roleNames, trackOf, trackSlugs } from './aliases.ts';
import { writeResearchConfigs } from './configs.ts';
import { type PhaseBResolved, compareAllAliases, resolveAlias, sealedManifests } from './resolve.ts';
import {
  type RunOutcome,
  dataLines,
  formatReport,
  newDataLabel,
  outputDir,
  releaseIfEmpty,
  reproducibility,
  comparatorLabel,
  retrospectiveLabel,
  runFor,
  runResolved,
  summaryText
} from './run.ts';

type Study8Resolved = PhaseBResolved;

const usage = `usage:
  npm run study9b-run -- list
  npm run study9b-run -- run <alias> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--quiet]
  npm run study9b-run -- compare <alias> <alias> … [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]
  npm run study9b-run -- compare --all [--end …] [--cost-bps …] [--out …]   (${compareAll.join(', ')}; a track best that does not exist is skipped)
  npm run study9b-run -- research-configs
Phase B aliases: s9b-<track>-<profit|robust|balanced|extra1|extra2|best|1…6>, s9b-rank-<n>, s9b-nominee; track ${trackSlugs.join('|')}.
Comparators (delegated to the Study 8 runner, unchanged): s8-vg-balanced (VG #2, the primary comparator), s8-vg-profit, every s8-… alias, vxr-frozen, vxrg-frozen and the Study 7 runner aliases (vgt-primary = B1, b5-frozen = B5, …).
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
  const data = await dataStatus('data', allSymbols);
  const names = [
    's9b-nominee',
    ...trackSlugs.flatMap((slug) => [`s9b-${slug}-best`, ...roleNames.map((role) => `s9b-${slug}-${role}`)]),
    ...trackSlugs.flatMap((slug) =>
      (selection.testPlan.F24?.shortlists ?? [])
        .filter((m) => m.track === trackOf[slug])
        .map((m) => `s9b-${slug}-${m.order}`)
    ),
    's8-vg-balanced',
    's8-vg-profit',
    'vgt-primary',
    'b5-frozen'
  ];
  const rows: string[][] = [];

  for (const name of names) {
    let resolved: Study8Resolved;

    try {
      resolved = await resolveAlias(name);
    } catch (error) {
      if (error instanceof UsageError && /no best candidate/.test(error.message)) {
        rows.push([name, '—', '—', '—', '—', 'none (every F24 holder failed)', '—', '—']);
        continue;
      }

      if (error instanceof UsageError && /no .* role holder|no research nomination/.test(error.message)) {
        rows.push([name, '—', '—', '—', '—', 'none (empty role or no nomination)', '—', '—']);
        continue;
      }

      throw error;
    }

    const symbols = Object.keys(resolved.books);
    const p = resolved.phaseB;

    rows.push([
      name,
      p
        ? p.track
        : resolved.study8.kind === 'study7'
          ? 'Study 7 control'
          : `Study 8 ${resolved.study8.track ?? ''}`.trim(),
      p ? tracks[p.track as keyof typeof tracks].books.join('+') : symbols.join('+'),
      p?.role ?? resolved.study8.role ?? '—',
      p?.trainingRank ? `#${p.trainingRank}` : resolved.rank ? `${p ? '' : 'S8 '}#${resolved.rank}` : '—',
      resolved.spec.status === 'frozen'
        ? 'frozen control'
        : `RESEARCH ONLY; T ${(p?.testStatus ?? resolved.study8.testStatus ?? '').toUpperCase() || 'n/a'}`,
      path.basename(resolved.configFile, '.json'),
      symbols.every((s) => data[s]?.present)
        ? `ok → ${symbols.map((s) => (data[s] as FileProvenance).latestCompleteSession).sort()[0]}`
        : `MISSING ${symbols.filter((s) => !data[s]?.present).join(',')}`
    ]);
  }

  console.log(
    table(
      ['alias', 'track', 'ETF membership', 'role', 'F24 training rank', 'status', 'config', 'latest complete session'],
      rows
    )
  );
  console.log(
    "\nF24 training rank = the sealed training-only Phase B ranking (S8 #n = Study 8's). s9b-<track>-best follows the frozen nomination rule within the track: its top-ranked F24 role holder that the one-time test did not fail; a track whose holders all failed has none (refused, never substituted; compare --all skips it). s9b-nominee = the mechanical primary nominee (the top non-failed F24 holder), if any. Comparators are resolved and reconciled by the Study 8 runner."
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
      'rank',
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
          : o.resolved.phaseB
            ? `S9B T ${o.resolved.phaseB.testStatus.toUpperCase()}`
            : o.resolved.study8.kind === 'study7'
              ? 'Study 7'
              : `S8 T ${String(o.resolved.study8.testStatus ?? '').toUpperCase()}`,
        o.resolved.phaseB
          ? r.rank
            ? `#${r.rank}`
            : '—'
          : r.rank
            ? `${o.resolved.study8.kind === 'study7' ? 'S7' : 'S8'} #${r.rank}`
            : '—',
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
  const header = `Study 9 Phase B comparison — one window ${first.data.first} → ${first.data.last} (arming ${first.data.firstEligible}), ${costBps} bps PER SIDE, ${(first.run.annualRate * 100).toFixed(0)}% simple interest, fixed $100,000 single slot, stops at the stop; unchanged pools engine.`;
  const cutoff = `Common cutoff: ${end === common.latest ? `${end} = the latest session that every file read (${symbols.join(', ')}) holds completely (limited by ${common.limitedBy.join(', ')})` : `${end} (requested; the latest common complete session is ${common.latest})`}.`;
  const provenance = [
    'Data files (the study\'s 13; "read" = used by at least one strategy here):',
    ...dataLines(data, symbols),
    `Engine digest ${String(repro.engineDigest).slice(0, 16)}…; git ${repro.git.commit.slice(0, 12)} (${repro.git.branch}); Node ${process.version}; total runtime ${((Date.now() - started) / 1000).toFixed(1)} s.`
  ].join('\n');
  const labels = [
    retrospectiveLabel,
    outcomes.some((o) => !o.resolved.phaseB) ? comparatorLabel : '',
    newDataLabel(first.data.last)
  ]
    .filter(Boolean)
    .join('\n');

  await fs.outputFile(
    path.join(outDir, 'compare.md'),
    `${header}\n${cutoff}\n\n\`\`\`\n${display}\n\`\`\`\n\nBy calendar year (marked P&L change):\n\n\`\`\`\n${yearlyDisplay}\n\`\`\`\n\n\`\`\`\n${provenance}\n\`\`\`\n\nPer strategy: ${outcomes.map((o) => `${o.resolved.spec.alias}/`).join(', ')} (runner-summary.txt, lots.txt, lots.csv, trades.csv, report.txt, …)\n\n${labels}\n`
  );
  await fs.writeJson(
    path.join(outDir, 'compare.json'),
    {
      kind: 'study9b-local-compare',
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
    case 'research-configs': {
      if (positional.length || Object.keys(flags).length) throw new UsageError('research-configs takes no arguments');

      const written = await writeResearchConfigs();

      console.log(`research configurations written (${written.length} files):\n${written.join('\n')}`);
      break;
    }
    case 'compare': {
      const names = bools.has('all') ? await compareAllAliases() : positional;

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
  console.error(`study9b-run: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
});

// The study's command line: `npm run ranked-preemption -- <command> …` (research/d1-ranked-preemption/README.md lists
// every command). Stage commands are write-once and refuse to rerun a sealed stage; the read-only commands (list,
// show, fixed, portfolio, compare, preemptions, prospective, verify) never write into research/ or config/.
import path from 'node:path';
import fs from 'fs-extra';
import { loadPool } from '../pools/load.ts';
import { runRecordOf, formatReport, writeRunRecord } from '../pools/report.ts';
import { type PoolRunOptions } from '../pools/run.ts';
import { formatTradeLedger, reconcileLedger, tradeLedgerOf } from '../pools/trades.ts';
import { summaryOf as runSummaryOf } from '../joint-16-etf-d1/figures.ts';
import { type PolicyKey, allocationOf, policyKeys, resolvePriority } from './allocation.ts';
import { runAudit } from './audit.ts';
import { runBenchmark } from './benchmark.ts';
import {
  type FoldKey,
  type RankingKey,
  type WindowKey,
  evaluationsRoot,
  foldKeys,
  frozenSelectionFile,
  formatDollars,
  hasFlag,
  option,
  rankingKeys,
  readJson,
  researchRoot,
  resultsRoot,
  standaloneRoot,
  study,
  windowKeys,
  writeJson,
  writeText
} from './context.ts';
import { readControls, runControls } from './controls.ts';
import { allowedEndOf, benchmarkUniverse, historicalUniverse, inspectionUniverse } from './data.ts';
import { runDiagnostic } from './diagnostic.ts';
import type { PRunResult } from './engine.ts';
import { runHistoricalCheck, registrationFile, runSelection } from './final.ts';
import { appendAmendment, isSealed, readSealed, sha256File } from './freeze.ts';
import { freezeCode, freezeProtocol } from './freezes.ts';
import { verifyCodeFreeze, verifyProtocolFreeze } from './guard.ts';
import { incumbentBooks } from './incumbents.ts';
import { runJoint } from './joint.ts';
import { runParity } from './parity.ts';
import { readRanking, rankingFile, recheckRankings, runRankings } from './ranking.ts';
import { allocationOfPool, booksOfPool, exportPools, listResearchPools, loadResearchPool } from './researchPools.ts';
import { engineRun, fixedFigures, portfolioFigures } from './runs.ts';
import { runStageA } from './standalone.ts';
import { renderTables } from './tables.ts';
import { runPicks, runProcedureGate, runValidation, validationFile } from './walkforward.ts';

export const usage = `npm run ranked-preemption -- <command> [options]

Read-only commands (outputs under ${evaluationsRoot}/, never research/ or config/):
  list                                   comparators, standalone phenotypes, rankings, research pools, statuses
  show <id>                              a research pool (RP-…), ranking:<window>:<R1|R2>, standalone:<window>:<SYMBOL>
  fixed <id> [--end YYYY-MM-DD] [--cost-bps N] [--policy P0|P0R|P1|P1-B250|P1-B500] [--ranking <window>/<R1|R2>]
                                         fixed $100,000 pool with the full funded-trade ledger; <id> = B4 | B5 | B1 |
                                         RP-… | standalone:<window>:<SYMBOL>. B4/B5/B1 under P0 default to \`all\`;
                                         everything else is limited to its window's training data
  portfolio <id> [same options]          the 20% portfolio (frozen dividend convention)
  compare [--window fold-a|fold-b|final] A/B/C/D × R1/R2 from the sealed records (training; validation for folds)
  preemptions <id> [same options]        every preemption, denial and abort, and the collision matrix
  prospective                            the new-study prospective registration and its observation count
  verify                                 freezes, sealed records, rankings, research pools, B4/B5 and the prospective freeze
  tables                                 Markdown tables from the sealed records → results/tables/ (read-only)

Stage commands (write-once; each refuses to rerun a sealed stage):
  audit | benchmark [--workers N] | freeze-protocol | parity | freeze-code
  standalone --window W | rank --window W | recheck-rankings --window W | diagnostic --window W
  joint --window W | controls --window W
  picks --window fold-a|fold-b | validate --fold fold-a|fold-b | procedure-gate | select | historical-check
  export-pools --window W
  amend --stage S --change "…" --reason "…" --review "…" --affected a,b
`;

const windowOf = (args: string[], name = 'window'): WindowKey => {
  const value = option(args, name);

  if (!value || !(windowKeys as readonly string[]).includes(value)) {
    throw new Error(`--${name} must be one of ${windowKeys.join(', ')}`);
  }

  return value as WindowKey;
};

const foldOf = (args: string[], name: string): FoldKey => {
  const value = option(args, name);

  if (!value || !(foldKeys as readonly string[]).includes(value)) {
    throw new Error(`--${name} must be one of ${foldKeys.join(', ')}`);
  }

  return value as FoldKey;
};

const workersOf = (args: string[]) => {
  const value = option(args, 'workers');

  return value ? { workers: Number(value) } : {};
};

// ----- running a configuration for the read-only commands -----

interface Target {
  id: string;
  books: ReturnType<typeof booksOfPool>;
  allocation: ReturnType<typeof allocationOfPool>;
  door: 'benchmark' | 'inspection' | 'historical'; // every load goes through an audited door (PROTOCOL.md §4.4)
  window?: WindowKey;
  end: string | undefined;
  label: string;
  incumbent?: 'B4' | 'B5';
}

const resolveTarget = async (id: string, args: string[]): Promise<Target> => {
  const policy = option(args, 'policy') as PolicyKey | undefined;
  const end = option(args, 'end');

  if (policy && !policyKeys.includes(policy)) {
    throw new Error(`--policy must be one of ${policyKeys.join(', ')}`);
  }

  if (id === 'B4' || id === 'B5' || id === 'B1') {
    const incumbents = await incumbentBooks();
    const books = incumbents[id];
    const rankingArg = option(args, 'ranking');

    if (!policy || policy === 'P0') {
      return {
        id,
        books,
        allocation: allocationOf('P0'),
        door: 'benchmark',
        end,
        label: `${id} unchanged (P0)`,
        ...(id !== 'B1' ? { incumbent: id } : {})
      };
    }

    const [window, metric] = (rankingArg ?? '').split('/') as [WindowKey, RankingKey];

    if (!(windowKeys as readonly string[]).includes(window) || !(rankingKeys as readonly string[]).includes(metric)) {
      throw new Error(`--policy ${policy} needs --ranking <window>/<R1|R2>, e.g. --ranking final/R1`);
    }

    const ranking = await readRanking(window, metric);

    return {
      id: `${id}-${policy}-${window}-${metric}`,
      books,
      allocation: allocationOf(
        policy,
        resolvePriority(
          `${window}/${metric}#${ranking.bodyHash.slice(0, 16)}`,
          ranking.order,
          books.map((book) => book.symbol),
          Object.fromEntries(ranking.entries.map((entry) => [entry.symbol, entry.score]))
        )
      ),
      door: 'inspection',
      window,
      end: end ?? study.windows[window].searchEnd,
      label: `${id} vectors under ${policy} with the frozen ${window} ${metric} (a new configuration: training data only)`
    };
  }

  if (id.startsWith('standalone:')) {
    const [, window, symbol] = id.split(':') as [string, WindowKey, string];
    const profile = await readJson<{
      representative: { grid: ReturnType<typeof booksOfPool>[number]['vector']['grid']; candidateId: string } | null;
    }>(path.join(standaloneRoot, window, `${symbol}.json`));

    if (!profile.representative) {
      throw new Error(`${id} has no representative (unrankable)`);
    }

    return {
      id: id.replaceAll(':', '-'),
      books: [
        { symbol, vector: { id: profile.representative.candidateId, grid: profile.representative.grid, origin: id } }
      ],
      allocation: allocationOf('P0'),
      door: 'inspection',
      window,
      end: end ?? study.windows[window].searchEnd,
      label: `standalone representative ${symbol} (${window})`
    };
  }

  const { pool } = await loadResearchPool(id);

  if (pool.status !== 'research-only') {
    return {
      id,
      books: booksOfPool(pool),
      allocation: allocationOfPool(pool, policy),
      door: 'historical',
      end,
      label: pool.label
    };
  }

  if (end && end > (await allowedEndOf(pool.window))) {
    throw new Error(
      `${id} is research-only: it may read through ${await allowedEndOf(pool.window)} only (no evaluation after 2023-12-29)`
    );
  }

  return {
    id,
    books: booksOfPool(pool),
    allocation: allocationOfPool(pool, policy),
    door: 'inspection',
    window: pool.window,
    end: end ?? study.windows[pool.window].searchEnd,
    label: pool.label
  };
};

const loadFor = async (target: Target, mode: 'fixed' | 'portfolio') => {
  const symbols = target.books.map((book) => book.symbol);
  const members = mode === 'portfolio' ? [...new Set(['VOOG', 'VGT', ...symbols])] : symbols;

  if (target.door === 'benchmark') {
    return benchmarkUniverse(members, target.end);
  }

  if (target.door === 'historical') {
    return historicalUniverse(members);
  }

  return inspectionUniverse(target.window!, members, target.end);
};

const preemptionLines = (result: PRunResult) => {
  if (result.preemptions.length === 0 && result.declines.length === 0) {
    return ['Preemptions: none'];
  }

  const iso = (seconds: number) =>
    Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString().slice(0, 16) : '';

  return [
    `Preemptions (${result.preemptions.length}; declined at the decision: ${result.declines.length}):`,
    '  # | decision (UTC) | source → target | positions | estimate net | outcome | sold (UTC) | fill | fill net | reason',
    ...result.preemptions.map(
      (p) =>
        `  ${p.id} | ${iso(p.decisionTime)} | ${p.sourceSymbol} lot ${p.sourceLotId} → ${p.targetSymbol} | ${p.sourcePosition + 1}→${p.targetPosition + 1} | ${p.estimateNet.toFixed(2)} | ${p.outcome} | ${iso(p.executionTime)} | ${Number.isFinite(p.executionRawPrice) ? p.executionRawPrice.toFixed(4) : ''} | ${Number.isFinite(p.executionNet) ? p.executionNet.toFixed(2) : ''} | ${p.reason}`
    ),
    ...result.declines.map(
      (d) =>
        `  declined | ${iso(d.decisionTime)} | ${d.sourceSymbol} lot ${d.sourceLotId} → ${d.targetSymbol} | estimate ${d.estimateNet.toFixed(2)} < threshold`
    )
  ];
};

const collisionLines = (result: PRunResult) => {
  const table: Record<string, Record<string, number>> = {};
  const funded: Record<string, number> = {};
  const refused: Record<string, number> = {};

  for (const signal of result.signals) {
    if (signal.outcome === 'granted') {
      funded[signal.symbol] = (funded[signal.symbol] ?? 0) + 1;
      continue;
    }

    refused[signal.symbol] = (refused[signal.symbol] ?? 0) + 1;

    const holder = signal.occupiedBy.split(' ')[0] ?? '';

    table[signal.symbol] ??= {};
    table[signal.symbol]![holder] = (table[signal.symbol]![holder] ?? 0) + 1;
  }

  return [
    'Signals per book (granted = funded or switch started; refused = blocked):',
    ...Object.keys({ ...funded, ...refused })
      .sort()
      .map(
        (symbol) =>
          `  ${symbol}: granted ${funded[symbol] ?? 0}, refused ${refused[symbol] ?? 0}${
            table[symbol]
              ? ` (held by ${Object.entries(table[symbol]!)
                  .map(([h, n]) => `${h} ${n}`)
                  .join(', ')})`
              : ''
          }`
      )
  ];
};

const runTarget = async (id: string, args: string[], mode: 'fixed' | 'portfolio', extra: 'ledger' | 'preemptions') => {
  const target = await resolveTarget(id, args);
  const costBps = Number(option(args, 'cost-bps') ?? study.principalCostBps);
  const loaded = await loadFor(target, mode);
  const outDir = path.join(
    evaluationsRoot,
    `${target.id}-${mode}-${costBps}bps${target.end ? `-to-${target.end}` : ''}`
  );

  // B4/B5 unchanged: the pools' own report (the frozen contract), on the derived engine's P0 run (= the frozen engine)
  if (target.incumbent && target.allocation.policy.key === 'P0') {
    const pool = await loadPool(target.incumbent);
    const options: PoolRunOptions = {
      mode,
      dataset: 'all',
      costBps,
      dividends: 'frozen',
      ...(target.end ? { end: target.end } : {})
    };
    const result = engineRun(loaded, target.books, mode, costBps, target.allocation, {
      phenotypes: pool.phenotypes,
      key: `${pool.config.id}-${mode}-${costBps}bps`
    });
    const record = await runRecordOf(pool, loaded, result, options, outDir);

    await writeRunRecord(record, result);
    console.log(formatReport(record));
    console.log(
      `(the same run as \`npm run pools -- ${mode} ${target.incumbent}${costBps !== 5 ? ` --cost-bps ${costBps}` : ''}\`; files in ${outDir})`
    );
    return;
  }

  const result = engineRun(loaded, target.books, mode, costBps, target.allocation);
  const summary = runSummaryOf(result);
  const ledger = tradeLedgerOf(result);
  const reconciliation = await reconcileLedger(ledger, summary, {
    applicable: false,
    controlKey: `${mode}-${costBps}`
  });
  const lines = [
    `${target.label} — ${target.id}`,
    `  books: ${target.books.map((book) => `${book.symbol} ${book.vector.id}`).join(', ')}`,
    `  allocation: ${target.allocation.policy.key}${target.allocation.priority ? ` (priority ${target.allocation.priority.order.join(' > ')}; ${target.allocation.priority.rankingId})` : ''}`,
    `  data: ${loaded.partition} ${loaded.universe.dates[0]} → ${loaded.universe.end} (${loaded.universe.sessionCount} sessions); ${mode}; ${costBps} bps per side; 11% simple interest`,
    ''
  ];

  if (mode === 'portfolio') {
    const pf = portfolioFigures(result);

    lines.push(
      `Portfolio: $300,000 core (60/40 VOOG/VGT), 20% of marked equity per funded trade, frozen dividends`,
      `  end equity ${formatDollars(pf.endEquity)}; max daily % drawdown ${(pf.dailyPercentDrawdown * 100).toFixed(2)}%`,
      `  strategy net ${formatDollars(pf.strategyNet)}; borrowing dollar-days ${pf.borrowingDollarDays.toFixed(0)}; productivity ${pf.productivity.toFixed(2)} per $1M dollar-days`,
      ''
    );
  } else {
    const figures = fixedFigures(result);

    lines.push(
      `Fixed $100,000 pool: net ${formatDollars(figures.engineNet)} (liquidation-equivalent ${formatDollars(figures.net)}); max minute drawdown ${formatDollars(figures.minuteDrawdown)} (${((figures.minuteDrawdown / study.principal) * 100).toFixed(2)}% of $100,000); max daily drawdown ${formatDollars(figures.dailyDrawdown)} (${((figures.dailyDrawdown / study.principal) * 100).toFixed(2)}%)`,
      ''
    );
  }

  if (extra === 'ledger') {
    lines.push(
      formatTradeLedger(ledger, {
        notional: mode === 'fixed' ? study.principal : NaN,
        costBps,
        minuteDrawdown: summary.minuteDrawdown,
        minuteDrawdownPeakUtc: new Date(summary.minuteDrawdownPeak * 1000).toISOString(),
        minuteDrawdownTroughUtc: new Date(summary.minuteDrawdownTrough * 1000).toISOString(),
        annualRate: study.rate,
        dailyDrawdown: summary.dailyDrawdown,
        reconciliation
      }),
      ''
    );
  }

  lines.push(...preemptionLines(result), '', ...collisionLines(result));

  const text = lines.join('\n');

  await fs.ensureDir(outDir);
  await writeText(path.join(outDir, 'report.txt'), text);
  await writeJson(path.join(outDir, 'trades.json'), {
    schema: 'ranked-preemption-trades',
    version: 1,
    ...ledger,
    reconciliation
  });
  await writeText(
    path.join(outDir, 'trades.csv'),
    [
      Object.keys(ledger.rows[0] ?? { trade: 0 }).join(','),
      ...ledger.rows.map((row) =>
        Object.values(row)
          .map((v) => JSON.stringify(v ?? ''))
          .join(',')
      )
    ].join('\n')
  );
  await writeJson(path.join(outDir, 'preemptions.json'), {
    preemptions: result.preemptions,
    declines: result.declines
  });
  console.log(text);
  console.log(`\nfiles: ${outDir}/{report.txt,trades.csv,trades.json,preemptions.json}`);
};

// ----- compare, list, show, verify, prospective -----

const money = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value) ? 'n/a' : formatDollars(value);

const compare = async (args: string[]) => {
  const windows = option(args, 'window') ? [windowOf(args)] : windowKeys;

  for (const window of windows) {
    if (!(await isSealed(path.join(resultsRoot, 'controls', window, 'CONTROLS.json')))) {
      console.log(`${window}: controls not sealed yet`);
      continue;
    }

    const controls = await readControls(window);
    const validation =
      window !== 'final' && (await isSealed(validationFile(window as FoldKey)))
        ? await readSealed<{
            bodyHash: string;
            [key: string]: unknown;
            fixed: Record<
              string,
              Record<string, { validation: { net: number; minuteDrawdown: number; lots: number } }>
            >;
          }>(validationFile(window as FoldKey))
        : undefined;

    console.log(
      `\n${window} — training ${study.firstSession} → ${study.windows[window].searchEnd} (E0, fixed $100k, 5 bps)${validation ? `; validation ${study.windows[window].validationStart} → ${study.windows[window].validationEnd} (E2)` : ''}`
    );
    console.log(
      '  id            net     minute DD  lots  preempt(ex/sup/ab/dec)  0bps net   10bps net  portfolio end / daily DD' +
        (validation ? '   | V net   V minute DD  V lots' : '')
    );

    for (const configuration of controls.configurations) {
      const m = controls.fixed[configuration.id]!['5']!;
      const pf = controls.portfolio[configuration.id];
      const v = validation?.fixed[configuration.id]?.['5']?.validation;

      console.log(
        `  ${configuration.id.padEnd(12)} ${money(m.net).padStart(10)} ${money(m.minuteDrawdown).padStart(10)} ${String(m.lots).padStart(5)}  ${`${m.preemptions.executed}/${m.preemptions.superseded}/${m.preemptions.aborted}/${m.preemptions.declined}`.padStart(14)}  ${money(controls.fixed[configuration.id]!['0']?.net).padStart(10)} ${money(controls.fixed[configuration.id]!['10']?.net).padStart(10)}  ${pf ? `${money(pf.endEquity)} / ${(pf.dailyPercentDrawdown * 100).toFixed(2)}%` : ''}${v ? `   | ${money(v.net).padStart(9)} ${money(v.minuteDrawdown).padStart(10)} ${String(v.lots).padStart(5)}` : ''}`
      );
    }
  }
};

const list = async () => {
  console.log('Frozen comparators (unchanged; npm run pools -- fixed B4|B5):');

  for (const id of ['B4', 'B5']) {
    const pool = await loadPool(id);

    console.log(`  ${id}  ${pool.config.role}: ${pool.config.books.map((book) => book.symbol).join(' ')}`);
  }

  for (const window of windowKeys) {
    const dir = path.join(standaloneRoot, window);

    if (await fs.pathExists(dir)) {
      const profiles = (await fs.readdir(dir)).filter((name) => name.endsWith('.json'));

      console.log(
        `Standalone ${window}: ${profiles.length} profiles (${dir}/<SYMBOL>.json), phenotypes in ${dir}/phenotypes/`
      );
    }

    for (const key of rankingKeys) {
      if (await fs.pathExists(rankingFile(window, key))) {
        const ranking = await readRanking(window, key);

        console.log(
          `  ranking ${window}/${key} (${ranking.bodyHash.slice(0, 12)}): ${ranking.order.slice(0, 10).join(' ')} …`
        );
      }
    }
  }

  const pools = await listResearchPools();

  console.log(`Research pools (${pools.length}; config/research-pools/d1-ranked-preemption/):`);

  for (const entry of pools) {
    const { pool } = await loadResearchPool(entry.id);

    console.log(
      `  ${entry.id.padEnd(22)} ${pool.status.padEnd(14)} ${pool.allocation.key.padEnd(4)} ${pool.books.map((book) => book.symbol).join(' ')}`
    );
  }

  console.log(
    `Prospective registration: ${(await fs.pathExists(registrationFile)) ? registrationFile : 'none (no eligible frozen candidate)'}`
  );
};

const show = async (id: string) => {
  if (id.startsWith('ranking:')) {
    const [, window, key] = id.split(':') as [string, WindowKey, RankingKey];
    const ranking = await readRanking(window, key);

    console.log(`${window}/${key} (${ranking.bodyHash}): ${ranking.definition}`);

    for (const entry of ranking.entries) {
      console.log(
        `  ${String(entry.position).padStart(2)} ${entry.symbol.padEnd(5)} ${entry.score === null ? 'unrankable' : entry.score.toFixed(2).padStart(10)}  trades ${entry.trades}  ${entry.sample}${entry.credible ? '' : ' (non-credible representative)'}  ${entry.status}`
      );
    }

    return;
  }

  if (id.startsWith('standalone:')) {
    const [, window, symbol] = id.split(':') as [string, WindowKey, string];

    console.log(JSON.stringify(await readJson(path.join(standaloneRoot, window, `${symbol}.json`)), null, 1));
    return;
  }

  const { pool, file } = await loadResearchPool(id);

  console.log(
    `${pool.id} (${file}) — ${pool.status}\n  ${pool.label}\n  allocation ${pool.allocation.policy} (threshold $${pool.allocation.thresholdDollars})`
  );
  console.log(
    `  ranking ${pool.ranking ? `${pool.ranking.id} ${pool.ranking.order.join(' > ')} (${pool.ranking.bodyHash.slice(0, 12)})` : 'none'}`
  );

  for (const book of pool.books) {
    console.log(`  ${book.symbol} ${book.candidateId}: ${book.description}`);
  }
};

const sealedNames = new Set([
  'PROTOCOL_FREEZE.json',
  'code_freeze.json',
  'PARITY.json',
  'STAGE_A.json',
  'R1.json',
  'R2.json',
  'DIAGNOSTIC.json',
  'JOINT.json',
  'CONTROLS.json',
  'PICKS.json',
  'VALIDATION.json',
  'PROCEDURE_GATE.json',
  'FROZEN_SELECTION.json',
  'HISTORICAL_CHECK.json',
  'PROSPECTIVE_REGISTRATION.json'
]);

const verify = async () => {
  const lines: string[] = [];
  const check = async (name: string, work: () => Promise<unknown>) => {
    try {
      await work();
      lines.push(`  ok   ${name}`);
    } catch (error) {
      lines.push(`  FAIL ${name}: ${(error as Error).message}`);
    }
  };

  await check('protocol freeze and its bound files', () => verifyProtocolFreeze());
  await check('code freeze (or the latest amendment)', () => verifyCodeFreeze());

  const sealedFiles: string[] = [];
  const walk = async (dir: string) => {
    for (const name of await fs.readdir(dir)) {
      const full = path.join(dir, name);

      if ((await fs.stat(full)).isDirectory()) {
        await walk(full);
      } else if (sealedNames.has(name) && !full.includes(`${path.sep}standalone${path.sep}`)) {
        sealedFiles.push(full);
      }
    }
  };

  await walk(researchRoot);

  for (const file of sealedFiles) {
    await check(`sealed ${file}`, () => readSealed(file));
  }

  // every standalone profile, phenotype and archive file equals the hash its sealed Stage A record holds
  for (const window of windowKeys) {
    const stageA = path.join(resultsRoot, 'standalone', window, 'STAGE_A.json');

    if (await fs.pathExists(stageA)) {
      await check(`Stage A ${window} files`, async () => {
        const record = await readSealed<{
          bodyHash: string;
          files: Record<string, string>;
          archive: { file: string; sha256: string };
        }>(stageA);

        for (const [file, hash] of [...Object.entries(record.files), [record.archive.file, record.archive.sha256]]) {
          if ((await sha256File(file!)) !== hash) {
            throw new Error(`${file} changed after Stage A was sealed`);
          }
        }
      });
    }
  }

  for (const entry of await listResearchPools()) {
    await check(`research pool ${entry.id}`, () => loadResearchPool(entry.id));
  }

  const baselineFile = `${researchRoot}/results/baseline/config.sha256`;
  const baseline = (await fs.pathExists(baselineFile))
    ? (await fs.readFile(baselineFile, 'utf8')).split('\n').filter(Boolean)
    : [];

  for (const line of baseline) {
    const [hash, file] = line.split(/\s+/) as [string, string];

    if (file === 'package.json') {
      continue; // one script added by this study
    }

    await check(`unchanged ${file}`, async () => {
      if ((await sha256File(file)) !== hash) {
        throw new Error('changed since the study began');
      }
    });
  }

  console.log(['Verification:', ...lines].join('\n'));

  if (lines.some((line) => line.startsWith('  FAIL'))) {
    throw new Error('verification failed');
  }
};

const prospective = async () => {
  if (await fs.pathExists(registrationFile)) {
    const registration = await readSealed(registrationFile);

    console.log(
      `Registered candidate: ${JSON.stringify(registration.candidate)}\nCutoff 2026-10-13; prospective observation count = 0 (no verified bar after the cutoff exists in this repository).`
    );
  } else {
    const selection = (await fs.pathExists(frozenSelectionFile)) ? await readSealed(frozenSelectionFile) : undefined;

    console.log(
      `No new-study prospective registration${selection ? ` (${String(selection.decision)})` : ' (the selection is not sealed yet)'}.\nProspective observation count = 0. The B4/B5 prospective comparison is separate: npm run pools -- forward status`
    );
  }
};

export const runCli = async (args: string[]) => {
  const [command, ...rest] = args;

  switch (command) {
    case 'audit':
      return void (await runAudit());
    case 'benchmark':
      return void (await runBenchmark(workersOf(rest)));
    case 'freeze-protocol':
      return void (await freezeProtocol());
    case 'parity':
      return void (await runParity());
    case 'freeze-code':
      return void (await freezeCode());
    case 'standalone':
      return void (await runStageA(windowOf(rest), workersOf(rest)));
    case 'rank':
      return void (await runRankings(windowOf(rest)));
    case 'recheck-rankings':
      return void (await recheckRankings(windowOf(rest)));
    case 'diagnostic':
      return void (await runDiagnostic(windowOf(rest)));
    case 'joint':
      return void (await runJoint(windowOf(rest), workersOf(rest)));
    case 'controls':
      return void (await runControls(windowOf(rest), workersOf(rest)));
    case 'picks':
      return void (await runPicks(foldOf(rest, 'window')));
    case 'validate':
      return void (await runValidation(foldOf(rest, 'fold'), workersOf(rest)));
    case 'procedure-gate':
      return void (await runProcedureGate());
    case 'select':
      return void (await runSelection());
    case 'historical-check':
      return void (await runHistoricalCheck(workersOf(rest)));
    case 'export-pools':
      return void (await exportPools(windowOf(rest)));
    case 'amend': {
      const stage = option(rest, 'stage');
      const change = option(rest, 'change');
      const reason = option(rest, 'reason');
      const review = option(rest, 'review');

      if (!stage || !change || !reason || !review) {
        throw new Error('amend needs --stage, --change, --reason and --review');
      }

      const amendment = await appendAmendment({
        stage,
        change,
        reason,
        review,
        affected: (option(rest, 'affected') ?? '').split(',').filter(Boolean)
      });

      return void console.log(`amendment ${amendment.index} recorded (${amendment.hash.slice(0, 12)})`);
    }
    case 'tables': {
      const written = await renderTables();

      return void console.log(written.join('\n'));
    }
    case 'list':
      return list();
    case 'show':
      return show(rest[0] ?? '');
    case 'fixed':
      return runTarget(rest[0] ?? '', rest.slice(1), 'fixed', 'ledger');
    case 'portfolio':
      return runTarget(rest[0] ?? '', rest.slice(1), 'portfolio', 'ledger');
    case 'preemptions':
      return runTarget(rest[0] ?? '', rest.slice(1), hasFlag(rest, 'portfolio') ? 'portfolio' : 'fixed', 'preemptions');
    case 'compare':
      return compare(rest);
    case 'prospective':
      return prospective();
    case 'verify':
      return verify();
    default:
      console.log(usage);

      if (command && command !== 'help' && command !== '--help') {
        throw new Error(`Unknown command ${command}`);
      }
  }
};

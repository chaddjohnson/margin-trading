// Report regeneration from the JSON results, without reopening any selection: coverage of the search, the
// walk-forward of the rule, the development comparison, robustness, the holdout comparison (when the holdout has
// run) and the descriptive cross-sector trade chronology. Output: results/tables/*.md.
import path from 'node:path';
import fs from 'fs-extra';
import {
  type Ticker,
  formatDollars,
  formatSignedDollars,
  frozenCandidatesFile,
  log,
  protocol,
  readJson,
  stageDir,
  tickers,
  writeText
} from './context.ts';
import type { Manifest } from './freeze.ts';
import { holdoutFile } from './holdout.ts';
import type { ContenderResult } from './holdout.ts';
import type { SearchRecord } from './search.ts';
import type { Policy, TickerSelection } from './selection.ts';
import { box } from './space.ts';

const tablesDir = stageDir('tables');
const policies: Policy[] = ['primary', 'lowDd', 'maxNet'];

interface Loaded {
  selections: Record<string, TickerSelection>;
  searches: Record<string, SearchRecord>;
  manifest?: Manifest;
  holdout?: {
    attempt: { attempt: number; startedAt: string; rerunReason: string | null };
    manifestHash: string;
    tickers: Record<
      string,
      { holdoutStartDate: string; holdoutEndDate: string; holdoutSessions: number; contenders: ContenderResult[] }
    >;
  };
}

const load = async (): Promise<Loaded> => {
  const selections: Record<string, TickerSelection> = {};
  const searches: Record<string, SearchRecord> = {};

  for (const ticker of tickers) {
    const selectionFile = stageDir('selection', ticker, 'selection.json');
    const searchFile = stageDir('search', ticker, 'search.json');

    if (await fs.pathExists(selectionFile)) {
      selections[ticker] = await readJson(selectionFile);
    }

    if (await fs.pathExists(searchFile)) {
      searches[ticker] = await readJson(searchFile);
    }
  }

  return {
    selections,
    searches,
    manifest: (await fs.pathExists(frozenCandidatesFile)) ? await readJson(frozenCandidatesFile) : undefined,
    holdout: (await fs.pathExists(holdoutFile)) ? await readJson(holdoutFile) : undefined
  };
};

const boundaryHits = (params: Record<string, number | undefined>) =>
  box
    .filter((spec) => params[spec.key] === spec.min || params[spec.key] === spec.max)
    .map((spec) => `${spec.short} at ${params[spec.key] === spec.min ? 'min' : 'max'}`)
    .join(', ');

const coverageTable = (loaded: Loaded) => {
  const lines = [
    '# Search coverage (generated from results/search/*/search.json and results/selection/*/selection.json)',
    '',
    '| Ticker | Sobol unique / requested | GA per fold: generations, new simulations, stop | Candidates | Simulations | Final fold: feasible / beating D1 / distinct signatures | Probed (final) | Nominations | Box-edge parameters of nominations |',
    '|---|---|---|---:|---:|---|---:|---:|---|'
  ];

  for (const ticker of tickers) {
    const search = loaded.searches[ticker];
    const selection = loaded.selections[ticker];

    if (!search || !selection) {
      lines.push(`| ${ticker} | not run | | | | | | | |`);
      continue;
    }

    const finalFold = search.selections.find((fold) => fold.fold === 'final');

    lines.push(
      `| ${ticker} | ${search.sobol.unique} / ${search.sobol.requested} | ${search.ga.map((summary) => `${summary.fold}: ${summary.generations} gen, ${summary.newEvaluations}, ${summary.stopReason}`).join('; ')} | ${search.candidates.toLocaleString('en-US')} | ${search.simulations.toLocaleString('en-US')} | ${finalFold ? `${finalFold.feasible} / ${finalFold.beatingD1} / ${finalFold.distinctSignatures}` : ''} | ${finalFold?.probed.length ?? ''} | ${selection.nominations.length} | ${selection.nominations.map((nomination) => `${nomination.role}: ${boundaryHits(nomination.params) || 'none'}`).join('; ')} |`
    );
  }

  lines.push('');
  lines.push('Per-fold selection detail (training view of each pick; "none" with the reason):');
  lines.push('');
  lines.push('| Ticker | Fold | Pool | Feasible | Beating D1 | primary | lowDd | maxNet |');
  lines.push('|---|---|---:|---:|---:|---|---|---|');

  for (const ticker of tickers) {
    const search = loaded.searches[ticker];

    for (const fold of search?.selections ?? []) {
      lines.push(
        `| ${ticker} | ${fold.fold} | ${fold.pool} | ${fold.feasible} | ${fold.beatingD1} | ${fold.policies
          .map((policy) =>
            policy.pick
              ? `${policy.pick.description}: ${formatDollars(policy.pick.train.net)} / DD ${formatDollars(policy.pick.train.minuteDrawdown)} / ${policy.pick.train.entries}e; plateau ${(policy.pick.plateau.feasibleShare * 100).toFixed(0)}% / ${(policy.pick.plateau.medianNetShare * 100).toFixed(0)}%`
              : `none (${policy.reason})`
          )
          .join(' | ')} |`
      );
    }
  }

  return lines.join('\n');
};

const walkForwardTable = (loaded: Loaded) => {
  const lines = [
    '# Walk-forward of the selection rule (validation-window net / minute DD / entries; picks chosen on the training window only)',
    '',
    '| Ticker | Fold | Validation | D1 | primary | lowDd | maxNet |',
    '|---|---|---|---|---|---|---|'
  ];
  const cell = (view?: { net: number; minuteDrawdown: number; entries: number }) =>
    view && Number.isFinite(view.net)
      ? `${formatDollars(view.net)} / ${formatDollars(view.minuteDrawdown)} / ${view.entries}e`
      : 'none';

  for (const ticker of tickers) {
    const selection = loaded.selections[ticker];

    for (const fold of selection?.walkForward.folds ?? []) {
      lines.push(
        `| ${ticker} | ${fold.fold} | ${fold.validationStart} → ${fold.validationEnd} | ${cell(fold.d1Validation)} | ${fold.picks.map((pick) => (pick.id ? cell(pick.validation) : 'none')).join(' | ')} |`
      );
    }
  }

  lines.push('');
  lines.push(
    '| Ticker | D1 stitched | primary stitched (folds ≥ D1 / folds with a pick) | lowDd stitched | maxNet stitched |'
  );
  lines.push('|---|---:|---|---|---|');

  for (const ticker of tickers) {
    const selection = loaded.selections[ticker];

    if (!selection) {
      continue;
    }

    const stitched = selection.walkForward.stitched;

    lines.push(
      `| ${ticker} | ${formatDollars(stitched.primary.d1Net)} | ${policies.map((policy) => `${formatDollars(stitched[policy].net)} (${stitched[policy].foldsBeatingD1}/${stitched[policy].folds}; ${stitched[policy].pass ? 'pass' : 'fail'})`).join(' | ')} |`
    );
  }

  return lines.join('\n');
};

const developmentTable = (loaded: Loaded) => {
  const lines = [
    '# Development comparison: frozen D1 versus the nominations (2017-06-15 → 2023-12-29)',
    '',
    '| Ticker | Role | Parameters | Net | Δ vs D1 | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau | Sparse | WF pass |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|'
  ];

  for (const ticker of tickers) {
    const selection = loaded.selections[ticker];

    if (!selection) {
      continue;
    }

    const c = selection.control;

    lines.push(
      `| ${ticker} | control (D1) | ${c.description} | ${formatDollars(c.net)} | — | ${formatDollars(c.minuteDrawdown)} | ${formatDollars(c.dailyDrawdown)} | ${c.entries}${c.openAtEnd ? ' (1 open)' : ''} | ${c.wins}/${c.losses} | ${formatDollars(c.worstTrade)} | ${formatDollars(c.worstAdverseExcursion)} | ${formatDollars(c.bestTrade)} | ${formatDollars(c.netWithoutBestTrade)} | ${formatDollars(c.interest)} | ${(c.exposure * 100).toFixed(0)}% | ${c.averageHoldDays.toFixed(0)} d | — | ${c.closedTrades < protocol.sparseTrades ? 'yes' : 'no'} | — |`
    );

    for (const nomination of selection.nominations) {
      const m = nomination.metrics;

      lines.push(
        `| ${ticker} | ${nomination.role} | ${nomination.description} | ${formatDollars(m.net)} | ${formatSignedDollars(m.net - c.net)} | ${formatDollars(m.minuteDrawdown)} | ${formatDollars(m.dailyDrawdown)} | ${m.entries}${m.openAtEnd ? ' (1 open)' : ''} | ${m.wins}/${m.losses} | ${formatDollars(m.worstTrade)} | ${formatDollars(m.worstAdverseExcursion)} | ${formatDollars(m.bestTrade)} | ${formatDollars(m.netWithoutBestTrade)} | ${formatDollars(m.interest)} | ${(m.exposure * 100).toFixed(0)}% | ${m.averageHoldDays.toFixed(0)} d | ${nomination.plateau.pass ? 'pass' : 'fail'} (${(nomination.plateau.feasibleShare * 100).toFixed(0)}% / ${(nomination.plateau.medianNetShare * 100).toFixed(0)}% / min ${(nomination.plateau.minNetShare * 100).toFixed(0)}%) | ${nomination.sparse ? 'yes' : 'no'} | ${selection.walkForward.stitched[nomination.policy].pass ? 'yes' : 'no'} |`
      );
    }

    if (selection.nominations.length === 0) {
      lines.push(`| ${ticker} | — | no defensible candidate | | | | | | | | | | | | | | | | |`);
    }
  }

  return lines.join('\n');
};

const holdoutComparison = (loaded: Loaded) => {
  if (!loaded.holdout) {
    return '# Holdout comparison\n\nThe holdout has not run.';
  }

  const { holdout } = loaded;
  const lines = [
    `# Development versus holdout (holdout attempt ${holdout.attempt.attempt}, manifest ${holdout.manifestHash})`,
    '',
    '| Ticker | Role | Parameters | Dev net | Dev minute DD | Dev entries | Holdout net | Holdout minute DD | Holdout entries | Holdout W/L | Holdout Δ vs D1 | Dev Δ vs D1 | Generalized? | Combined net | Combined minute DD |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|'
  ];

  for (const ticker of tickers) {
    const result = holdout.tickers[ticker];
    const selection = loaded.selections[ticker];

    if (!result || !selection) {
      continue;
    }

    const control = result.contenders.find((contender) => contender.role === 'control')!;

    for (const contender of result.contenders) {
      const devDelta = contender.development.net - control.development.net;
      const holdoutDelta = contender.holdout.net - control.holdout.net;
      const generalized =
        contender.role === 'control'
          ? '—'
          : devDelta > 0 && holdoutDelta > 0
            ? 'yes (both positive)'
            : devDelta > 0 && holdoutDelta <= 0
              ? 'no (dev gain, holdout loss)'
              : 'n/a';

      lines.push(
        `| ${ticker} | ${contender.role} | ${contender.description} | ${formatDollars(contender.development.net)} | ${formatDollars(contender.development.minuteDrawdown)} | ${contender.development.entries} | ${formatDollars(contender.holdout.net)} | ${formatDollars(contender.holdout.minuteDrawdown)} | ${contender.holdout.entries}${contender.holdout.openAtEnd ? ' (1 open)' : ''} | ${contender.holdout.wins}/${contender.holdout.losses} | ${contender.role === 'control' ? '—' : formatSignedDollars(holdoutDelta)} | ${contender.role === 'control' ? '—' : formatSignedDollars(devDelta)} | ${generalized} | ${formatDollars(contender.combined.net)} | ${formatDollars(contender.base.minuteDrawdown)} |`
      );
    }
  }

  return lines.join('\n');
};

const robustnessTable = (loaded: Loaded) => {
  const lines = [
    '# Robustness: plateau, concentration, sparse evidence and the predeclared sensitivities',
    '',
    '| Ticker | Role | Dev net | Dev DD | Closed trades | Net w/o best / net | Worst trade | Worst excursion | Max losing streak | Plateau feasible / median / min | Sparse |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|'
  ];

  for (const ticker of tickers) {
    const selection = loaded.selections[ticker];

    if (!selection) {
      continue;
    }

    const c = selection.control;

    lines.push(
      `| ${ticker} | control (D1) | ${formatDollars(c.net)} | ${formatDollars(c.minuteDrawdown)} | ${c.closedTrades} | ${c.net > 0 ? `${((c.netWithoutBestTrade / c.net) * 100).toFixed(0)}%` : 'n/a'} | ${formatDollars(c.worstTrade)} | ${formatDollars(c.worstAdverseExcursion)} | ${c.maximumLosingStreak} | — | ${c.closedTrades < protocol.sparseTrades ? 'yes' : 'no'} |`
    );

    for (const nomination of selection.nominations) {
      const m = nomination.metrics;

      lines.push(
        `| ${ticker} | ${nomination.role} | ${formatDollars(m.net)} | ${formatDollars(m.minuteDrawdown)} | ${m.closedTrades} | ${m.net > 0 ? `${((m.netWithoutBestTrade / m.net) * 100).toFixed(0)}%` : 'n/a'} | ${formatDollars(m.worstTrade)} | ${formatDollars(m.worstAdverseExcursion)} | ${m.maximumLosingStreak} | ${(nomination.plateau.feasibleShare * 100).toFixed(0)}% / ${(nomination.plateau.medianNetShare * 100).toFixed(0)}% / ${(nomination.plateau.minNetShare * 100).toFixed(0)}% | ${nomination.sparse ? 'yes' : 'no'} |`
      );
    }
  }

  if (loaded.holdout) {
    const keys = Object.keys(Object.values(loaded.holdout.tickers)[0]?.contenders[0]?.sensitivities ?? {});

    lines.push('');
    lines.push(
      '## Sensitivities (net / minute DD / entries; development window and holdout window of the same continuous run)'
    );
    lines.push('');
    lines.push(`| Ticker | Role | Window | base | ${keys.join(' | ')} |`);
    lines.push(`|---|---|---|---|${keys.map(() => '---').join('|')}|`);

    const cell = (view: { net: number; minuteDrawdown: number; entries: number }) =>
      `${formatDollars(view.net)} / ${formatDollars(view.minuteDrawdown)} / ${view.entries}e`;

    for (const ticker of tickers) {
      for (const contender of loaded.holdout.tickers[ticker]?.contenders ?? []) {
        lines.push(
          `| ${ticker} | ${contender.role} | development | ${cell(contender.development)} | ${keys.map((key) => cell(contender.sensitivities[key]!.development)).join(' | ')} |`
        );
        lines.push(
          `| ${ticker} | ${contender.role} | holdout | ${cell(contender.holdout)} | ${keys.map((key) => cell(contender.sensitivities[key]!.holdout)).join(' | ')} |`
        );
      }
    }
  }

  return lines.join('\n');
};

interface TradeRow {
  ticker: string;
  role: string;
  entryDate: string;
  exitDate: string;
  reason: string;
  net: number;
  window: string;
}

const readTrades = async (file: string, ticker: string, role: string): Promise<TradeRow[]> => {
  if (!(await fs.pathExists(file))) {
    return [];
  }

  const [header, ...rows] = (await fs.readFile(file, 'utf8')).trim().split('\n');
  const columns = header!.split(',');
  const column = (name: string) => columns.indexOf(name);

  return rows.map((line) => {
    const cells = line.split(',');

    return {
      ticker,
      role,
      entryDate: cells[column('entry_date')]!,
      exitDate: cells[column('exit_date')]!,
      reason: cells[column('reason')]!,
      net: Number(cells[column('net_profit')]),
      window: cells[column('window')]!
    };
  });
};

// Descriptive chronology for later cross-ETF research: every entry of the control and the primary of each ticker,
// and the count of tickers simultaneously long on each month, for the development run and (when present) the
// holdout run. No allocation is simulated here.
const crossSectorChronology = async (loaded: Loaded) => {
  const lines = ['# Cross-sector trade chronology (descriptive; no shared-capital simulation)', ''];

  for (const role of ['control', 'primary']) {
    const rows: TradeRow[] = [];

    for (const ticker of tickers) {
      const holdoutTrades = path.join(stageDir('holdout', ticker, role), 'trades.csv');
      const developmentTrades = path.join(stageDir('selection', ticker, role), 'trades.csv');
      const file = (await fs.pathExists(holdoutTrades)) ? holdoutTrades : developmentTrades;

      rows.push(...(await readTrades(file, ticker, role)));
    }

    rows.sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.ticker.localeCompare(b.ticker));
    lines.push(
      `## ${role === 'control' ? 'Frozen D1 (control)' : 'Primary nominations'} — entries in chronological order${loaded.holdout ? ' (development and holdout)' : ' (development only)'}`
    );
    lines.push('');
    lines.push('| Entry | Ticker | Exit | Reason | Net | Window | Other tickers long at entry |');
    lines.push('|---|---|---|---|---:|---|---|');

    for (const row of rows) {
      const concurrent = rows
        .filter(
          (other) =>
            other !== row &&
            other.ticker !== row.ticker &&
            other.entryDate <= row.entryDate &&
            (other.exitDate === '' || other.exitDate >= row.entryDate)
        )
        .map((other) => other.ticker);

      lines.push(
        `| ${row.entryDate} | ${row.ticker} | ${row.exitDate || 'open'} | ${row.reason} | ${formatSignedDollars(row.net)} | ${row.window} | ${concurrent.join(' ') || '—'} |`
      );
    }

    // Monthly concurrency.
    const months = new Map<string, Set<string>>();

    for (const row of rows) {
      const start = row.entryDate.slice(0, 7);
      const end = (row.exitDate || '2025-12-31').slice(0, 7);

      for (let month = start; month <= end;) {
        if (!months.has(month)) {
          months.set(month, new Set());
        }

        months.get(month)!.add(row.ticker);

        const [year, monthNumber] = month.split('-').map(Number) as [number, number];

        month = monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, '0')}`;
      }
    }

    const busy = [...months.entries()].filter(([, set]) => set.size >= 3).sort(([a], [b]) => a.localeCompare(b));

    lines.push('');
    lines.push(
      `Months with at least three tickers long at some point: ${busy.length > 0 ? busy.map(([month, set]) => `${month} (${[...set].sort().join(' ')})`).join('; ') : 'none'}.`
    );
    lines.push('');
  }

  return lines.join('\n');
};

export const runReport = async () => {
  const loaded = await load();

  await writeText(path.join(tablesDir, 'optimization_coverage.md'), coverageTable(loaded));
  await writeText(path.join(tablesDir, 'walkforward.md'), walkForwardTable(loaded));
  await writeText(path.join(tablesDir, 'development_comparison.md'), developmentTable(loaded));
  await writeText(path.join(tablesDir, 'holdout_comparison.md'), holdoutComparison(loaded));
  await writeText(path.join(tablesDir, 'robustness.md'), robustnessTable(loaded));
  await writeText(path.join(tablesDir, 'cross_sector_chronology.md'), await crossSectorChronology(loaded));
  log(
    `Wrote ${tablesDir} (${Object.keys(loaded.selections).length} selections, holdout ${loaded.holdout ? 'present' : 'absent'}, manifest ${loaded.manifest ? loaded.manifest.manifestHash : 'absent'})`
  );
};

export const tickerList: readonly Ticker[] = tickers;

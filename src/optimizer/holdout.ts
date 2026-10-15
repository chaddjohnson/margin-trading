// Freeze, final holdout and historical stress test.
//
// This module holds the only capability that can read sessions after the research end. It uses it only
// after verifying the freeze record: its own hash, the hashes of the frozen reports, the shortlist order in
// every final run record (no re-ranking), and the data hashes. The holdout evaluates each symbol's frozen
// rank-1 candidate once (plus the original parameters as a labelled baseline); ranks 2-N are never run on
// the holdout. A second holdout run is refused unless a reason is given, and the reason is recorded.
import fs from 'fs-extra';
import path from 'node:path';
import { type AllInParams, originalParams } from '../app/allIn-optimizable.ts';
import { type Manifest, sha256 } from './data/prepare.ts';
import { type DatasetArrays, type Metrics, ReferenceHighCache, simulateWindow, summarize } from './evaluate.ts';
import { equityCsv, tradesCsv } from './experiment.ts';
import { describeParams, formatParamValue } from './params.ts';
import { environment, stableHash } from './provenance.ts';
import {
  type LoadedExperiment,
  loadExperiment,
  money,
  percent,
  writeTopCandidates,
  writeWalkForward
} from './report.ts';
import {
  HoldoutLockedError,
  type Series,
  firstIndexOnOrAfter,
  issueHoldoutCapability,
  lastIndexOnOrBefore,
  researchSeries,
  unlockedSeries
} from './series.ts';

const capability = issueHoldoutCapability();

export const frozenReports = [
  'TOP_CANDIDATES.md',
  'top_candidates.json',
  'top_candidates.csv',
  'WALK_FORWARD_RESULTS.md',
  'walk_forward.json'
];

export interface FreezeRecord {
  frozenAtUtc: string;
  experiment: string;
  experimentConfigHash: string;
  environment: Awaited<ReturnType<typeof environment>>;
  protocol: LoadedExperiment['config']['protocol'];
  selectionPolicy: LoadedExperiment['config']['selection'];
  fitness: LoadedExperiment['config']['fitness'];
  search: LoadedExperiment['config']['search'];
  seed: string;
  data: Record<string, string>; // processed file sha256 per symbol
  symbols: Record<
    string,
    {
      finalRunConfigHash?: string;
      rank1?: { id: string; params: AllInParams };
      shortlist: { rank: number; id: string; params: AllInParams }[];
      status: string;
    }
  >;
  reportHashes: Record<string, string>;
}

const freezeDir = (outDir: string) => path.join(outDir, 'freeze');
const holdoutDir = (outDir: string) => path.join(outDir, 'holdout');

export const freeze = async (
  researchDir: string,
  outDir: string,
  manifest: Manifest,
  options: { replaceReason?: string; log?: (line: string) => void } = {}
) => {
  const log = options.log ?? (() => {});

  if (await fs.pathExists(path.join(holdoutDir(outDir), 'holdout.json'))) {
    throw new HoldoutLockedError('The holdout has already been run; the freeze cannot be replaced.');
  }

  const freezeFile = path.join(freezeDir(outDir), 'freeze.json');

  if ((await fs.pathExists(freezeFile)) && !options.replaceReason) {
    throw new Error(`${freezeFile} exists; pass a reason to replace it (allowed only before the holdout runs).`);
  }

  const experiment = await loadExperiment(outDir);
  const missing = experiment.symbols.filter((symbol) => !symbol.final);

  if (missing.length) {
    log(`Freezing without final runs for: ${missing.map((symbol) => symbol.symbol).join(', ')} (they get no primary).`);
  }

  await writeTopCandidates(experiment, researchDir);
  await writeWalkForward(experiment, researchDir, manifest);

  const reportHashes: Record<string, string> = {};

  for (const name of frozenReports) {
    reportHashes[name] = sha256(await fs.readFile(path.join(researchDir, name)));
  }

  const record: FreezeRecord = {
    frozenAtUtc: new Date().toISOString(),
    experiment: experiment.config.id,
    experimentConfigHash: stableHash(experiment.config),
    environment: await environment(),
    protocol: experiment.config.protocol,
    selectionPolicy: experiment.config.selection,
    fitness: experiment.config.fitness,
    search: experiment.config.search,
    seed: experiment.config.seed,
    data: Object.fromEntries(
      experiment.config.symbols.map((symbol) => [symbol, manifest.entries[symbol]?.processed?.sha256 ?? 'missing'])
    ),
    symbols: Object.fromEntries(
      experiment.symbols.map((symbol) => [
        symbol.symbol,
        {
          finalRunConfigHash: symbol.final?.configHash,
          rank1: symbol.final?.shortlist[0]
            ? { id: symbol.final.shortlist[0].id, params: symbol.final.shortlist[0].params }
            : undefined,
          shortlist: (symbol.final?.shortlist ?? []).map((entry) => ({
            rank: entry.rank,
            id: entry.id,
            params: entry.params
          })),
          status: symbol.final ? (symbol.final.shortlist.length ? 'ranked' : 'no feasible candidates') : 'not run'
        }
      ])
    ),
    reportHashes
  };

  await fs.ensureDir(freezeDir(outDir));

  if (await fs.pathExists(freezeFile)) {
    const history = path.join(freezeDir(outDir), `freeze-replaced-${Date.now()}.json`);

    await fs.move(freezeFile, history);
    await fs.appendFile(
      path.join(freezeDir(outDir), 'replacements.log'),
      `${new Date().toISOString()} ${options.replaceReason}\n`
    );
  }

  const text = `${JSON.stringify(record, null, 1)}\n`;

  await fs.writeFile(freezeFile, text);
  await fs.writeFile(path.join(freezeDir(outDir), 'freeze.sha256'), `${sha256(text)}  freeze.json\n`);
  log(`Frozen ${Object.keys(record.symbols).length} symbols; freeze.json sha256 ${sha256(text)}`);

  return record;
};

// Throws unless the freeze record, the frozen reports and the final shortlists are exactly as frozen.
export const verifyFreeze = async (researchDir: string, outDir: string, manifest: Manifest) => {
  const freezeFile = path.join(freezeDir(outDir), 'freeze.json');

  if (!(await fs.pathExists(freezeFile))) {
    throw new HoldoutLockedError('No freeze record: run `freeze` after the final development runs.');
  }

  const text = await fs.readFile(freezeFile, 'utf8');
  const expected = (await fs.readFile(path.join(freezeDir(outDir), 'freeze.sha256'), 'utf8')).split(/\s+/)[0];

  if (sha256(text) !== expected) {
    throw new HoldoutLockedError('freeze.json does not match freeze.sha256');
  }

  const record = JSON.parse(text) as FreezeRecord;

  for (const [name, hash] of Object.entries(record.reportHashes)) {
    const file = path.join(researchDir, name);

    if (!(await fs.pathExists(file)) || sha256(await fs.readFile(file)) !== hash) {
      throw new HoldoutLockedError(`${name} changed after the freeze`);
    }
  }

  const experiment = await loadExperiment(outDir);

  for (const symbol of experiment.symbols) {
    const frozen = record.symbols[symbol.symbol];
    const current = (symbol.final?.shortlist ?? []).map((entry) => `${entry.rank}:${entry.id}`).join(',');
    const atFreeze = (frozen?.shortlist ?? []).map((entry) => `${entry.rank}:${entry.id}`).join(',');

    if (current !== atFreeze || symbol.final?.configHash !== frozen?.finalRunConfigHash) {
      throw new HoldoutLockedError(`${symbol.symbol}: the final shortlist differs from the frozen one`);
    }

    const dataHash = manifest.entries[symbol.symbol]?.processed?.sha256 ?? 'missing';

    if (dataHash !== record.data[symbol.symbol]) {
      throw new HoldoutLockedError(`${symbol.symbol}: the processed data changed after the freeze`);
    }
  }

  return { record, experiment };
};

const datasetOf = (series: Series): DatasetArrays => ({
  id: `${series.symbol}:unlocked`,
  symbol: series.symbol,
  time: series.time,
  open: series.open,
  high: series.high,
  low: series.low,
  close: series.close,
  years: series.years
});

interface WindowResult {
  window: { start: string; end: string; startIndex: number; endIndex: number; sessions: number };
  rank1?: { id: string; params: AllInParams; metrics: Metrics };
  original: Metrics;
}

const runWindow = async (
  series: Series,
  startIndex: number,
  endIndex: number,
  rank1: { id: string; params: AllInParams } | undefined,
  dir: string
): Promise<WindowResult> => {
  const dataset = datasetOf(series);
  const highs = new ReferenceHighCache(series.high);
  const window = { startIndex, endIndex };
  const write = async (name: string, params: AllInParams) => {
    const result = simulateWindow(dataset, highs, params, window, { detail: true });

    await fs.ensureDir(dir);
    await fs.writeFile(path.join(dir, `${name}-trades.csv`), tradesCsv(result));
    await fs.writeFile(path.join(dir, `${name}-equity.csv`), equityCsv(result));

    return summarize(result);
  };

  return {
    window: {
      start: series.dates[startIndex] ?? '',
      end: series.dates[endIndex] ?? '',
      startIndex,
      endIndex,
      sessions: endIndex - startIndex + 1
    },
    rank1: rank1 ? { ...rank1, metrics: await write('rank1', rank1.params) } : undefined,
    original: await write('original', originalParams)
  };
};

// Structural checks of the holdout sessions, run only after the unlock.
const holdoutDataChecks = (series: Series, startIndex: number, endIndex: number) => {
  let invalid = 0;
  const jumps: string[] = [];

  for (let index = startIndex; index <= endIndex; index++) {
    const [open, high, low, close] = [
      series.open[index]!,
      series.high[index]!,
      series.low[index]!,
      series.close[index]!
    ];

    if (
      !(open > 0 && high > 0 && low > 0 && close > 0) ||
      low > Math.min(open, close) ||
      high < Math.max(open, close)
    ) {
      invalid++;
    }

    const change = close / series.close[index - 1]! - 1;

    if (Math.abs(change) > 0.25) {
      jumps.push(`${series.dates[index]} ${(change * 100).toFixed(1)}%`);
    }
  }

  return { invalidBars: invalid, jumpsAbove25Percent: jumps };
};

export interface HoldoutResult {
  ranAtUtc: string;
  attempt: number;
  rerunReason: string | null;
  freezeSha256: string;
  frozenAtUtc: string;
  protocol: FreezeRecord['protocol']['holdout'];
  symbols: Record<string, WindowResult & { dataChecks: ReturnType<typeof holdoutDataChecks>; lastDataDate: string }>;
}

const metricCells = (metrics: Metrics | undefined) =>
  metrics
    ? [
        money(metrics.netProfit),
        money(metrics.grossProfit),
        money(metrics.interest),
        money(metrics.maximumDrawdown),
        String(metrics.entries),
        percent(metrics.winRate, 0),
        Number.isFinite(metrics.profitFactor)
          ? metrics.profitFactor.toFixed(2)
          : metrics.profitFactor > 0
            ? '∞'
            : 'n/a',
        money(metrics.medianTrade),
        money(metrics.worstTrade),
        percent(metrics.exposure, 0),
        Number.isFinite(metrics.medianHoldDays) ? metrics.medianHoldDays.toFixed(0) : 'n/a'
      ]
    : Array(11).fill('-');

const metricHeader = [
  'Net',
  'Gross',
  'Interest',
  'Max DD',
  'Trades',
  'Win',
  'PF',
  'Median trade',
  'Worst trade',
  'Exposure',
  'Median hold (d)'
];

const table = (header: string[], rows: string[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');

const writeHoldoutReport = async (
  researchDir: string,
  outDir: string,
  experiment: LoadedExperiment,
  record: FreezeRecord,
  result: HoldoutResult
) => {
  const specs = experiment.config.space.specs;
  const lines: string[] = [];
  const entries = Object.entries(result.symbols);
  const lastDates = [...new Set(entries.map(([, value]) => value.lastDataDate))];

  lines.push('# Final holdout results', '');
  lines.push(
    `Run ${result.ranAtUtc} (attempt ${result.attempt}${result.rerunReason ? `, re-run because: ${result.rerunReason}` : ''}) against the freeze recorded ${record.frozenAtUtc} (freeze.json sha256 \`${result.freezeSha256}\`, code ${record.environment.gitHead.slice(0, 10)}${record.environment.gitDirty ? ' plus uncommitted changes' : ''}, code hash \`${record.environment.codeHash.slice(0, 16)}\`).`,
    '',
    '**Read this first**',
    '',
    `- Each symbol's **rank-1** parameters were frozen before any session after ${record.protocol.researchEnd} was read, and were run on the holdout **once**. Ranks 2–N were not run on the holdout and nothing here re-ranks them.`,
    `- The holdout runs from the first session on or after ${record.protocol.holdout.start} to the last available session (${lastDates.join(', ')}). The data came from Stooq's bulk archive dated 2026-09-09, because live Stooq downloads were blocked (DATA_AUDIT.md), so it stops short of mid-October 2026.`,
    '- **2024–2026 is not pristine evidence.** You studied this strategy on parts of this period before this workflow existed. It was untouched *within this optimization workflow*, but only data arriving after today is a genuinely new test.',
    '- Each symbol starts flat on the first holdout session (2023 sessions serve only as reference-high history). A position open at the end is marked to the last close, net of accrued interest. Money is per $100,000 margin allocation at 11% simple interest, without commissions or spread; entries fill at the signal close.',
    '- The original-parameter rows are a labelled baseline, not a selection input.',
    ''
  );

  lines.push('## Summary', '');
  lines.push(
    table(
      [
        'Symbol',
        'Rank-1 parameters',
        'Window',
        'Rank-1 net',
        'Rank-1 max DD',
        'Rank-1 trades',
        'Original net',
        'Original max DD',
        'Original trades'
      ],
      entries.map(([symbol, value]) => [
        symbol,
        value.rank1 ? describeParams(experiment.config.space, value.rank1.params) : 'none frozen',
        `${value.window.start} – ${value.window.end}`,
        money(value.rank1?.metrics.netProfit),
        money(value.rank1?.metrics.maximumDrawdown),
        String(value.rank1?.metrics.entries ?? '-'),
        money(value.original.netProfit),
        money(value.original.maximumDrawdown),
        String(value.original.entries)
      ])
    ),
    ''
  );

  const withRank1 = entries.filter(([, value]) => value.rank1);
  const positive = withRank1.filter(([, value]) => value.rank1!.metrics.netProfit > 0).length;
  const beat = withRank1.filter(([, value]) => value.rank1!.metrics.netProfit > value.original.netProfit).length;
  const total = withRank1.reduce((sum, [, value]) => sum + value.rank1!.metrics.netProfit, 0);
  const totalOriginal = withRank1.reduce((sum, [, value]) => sum + value.original.netProfit, 0);

  lines.push(
    `Measured: rank-1 was profitable on ${positive} of ${withRank1.length} symbols and beat the original parameters on ${beat}. Summed over symbols: rank-1 ${money(total)} versus original ${money(totalOriginal)} (a sum of separate $100,000 allocations, not a portfolio).`,
    ''
  );

  lines.push('## Per symbol', '');

  for (const [symbol, value] of entries) {
    lines.push(`### ${symbol}`, '');

    if (value.rank1) {
      lines.push(
        `Frozen rank 1 \`${value.rank1.id}\`: ${specs.map((spec) => `${spec.key} ${formatParamValue(spec, value.rank1!.params[spec.key])}`).join(', ')}.`,
        ''
      );
    }

    lines.push(
      table(
        ['Parameters', ...metricHeader],
        [
          ['rank 1 (frozen)', ...metricCells(value.rank1?.metrics)],
          ['original defaults', ...metricCells(value.original)]
        ]
      ),
      ''
    );

    const years = [
      ...new Set([...(value.rank1?.metrics.years ?? []), ...value.original.years].map((year) => year.year))
    ].sort();

    lines.push(
      table(
        ['By calendar year (net / max DD)', ...years.map(String)],
        [
          [
            'rank 1',
            ...years.map((year) => {
              const item = value.rank1?.metrics.years.find((entry) => entry.year === year);

              return item ? `${money(item.netProfit)} / ${money(item.maximumDrawdown)}` : '-';
            })
          ],
          [
            'original',
            ...years.map((year) => {
              const item = value.original.years.find((entry) => entry.year === year);

              return item ? `${money(item.netProfit)} / ${money(item.maximumDrawdown)}` : '-';
            })
          ]
        ]
      ),
      ''
    );

    if (value.dataChecks.invalidBars || value.dataChecks.jumpsAbove25Percent.length) {
      lines.push(
        `Data checks on the holdout sessions: ${value.dataChecks.invalidBars} invalid bars; moves above 25%: ${value.dataChecks.jumpsAbove25Percent.join(', ') || 'none'}.`,
        ''
      );
    }

    lines.push(
      `Trades and equity: \`${path.relative(researchDir, outDir)}/holdout/${symbol}/rank1-trades.csv\`, \`rank1-equity.csv\`.`,
      ''
    );
  }

  await fs.writeFile(path.join(researchDir, 'FINAL_HOLDOUT_RESULTS.md'), `${lines.join('\n')}\n`);
};

export const runHoldout = async (
  researchDir: string,
  outDir: string,
  manifest: Manifest,
  options: { rerunReason?: string; log?: (line: string) => void } = {}
) => {
  const log = options.log ?? (() => {});
  const { record, experiment } = await verifyFreeze(researchDir, outDir, manifest);
  const resultFile = path.join(holdoutDir(outDir), 'holdout.json');
  let attempt = 1;

  if (await fs.pathExists(resultFile)) {
    if (!options.rerunReason) {
      throw new HoldoutLockedError(
        'The holdout has already been run once. Re-running it is allowed only to fix a real implementation bug: pass --rerun-reason "..." and disclose it.'
      );
    }

    const previous = (await fs.readJson(resultFile)) as { attempt: number };

    attempt = previous.attempt + 1;
    await fs.move(resultFile, path.join(holdoutDir(outDir), `holdout-attempt-${previous.attempt}.json`));
  }

  const protocol = record.protocol;
  const symbols: Record<
    string,
    WindowResult & { dataChecks: ReturnType<typeof holdoutDataChecks>; lastDataDate: string }
  > = {};

  for (const symbol of experiment.config.symbols) {
    const series = await unlockedSeries(symbol, manifest, capability);
    const startIndex = firstIndexOnOrAfter(series, protocol.holdout.start);
    const endIndex =
      protocol.holdout.end === 'latest' ? series.dates.length - 1 : lastIndexOnOrBefore(series, protocol.holdout.end);

    if (endIndex < startIndex) {
      log(`${symbol}: no holdout sessions`);
      continue;
    }

    const rank1 = record.symbols[symbol]?.rank1;

    symbols[symbol] = {
      ...(await runWindow(series, startIndex, endIndex, rank1, path.join(holdoutDir(outDir), symbol))),
      dataChecks: holdoutDataChecks(series, startIndex, endIndex),
      lastDataDate: series.dates.at(-1) ?? ''
    };
    log(
      `${symbol}: holdout ${symbols[symbol]!.window.start}..${symbols[symbol]!.window.end} rank 1 ${rank1 ? money(symbols[symbol]!.rank1!.metrics.netProfit) : 'none'}`
    );
  }

  const result: HoldoutResult = {
    ranAtUtc: new Date().toISOString(),
    attempt,
    rerunReason: options.rerunReason ?? null,
    freezeSha256: sha256(await fs.readFile(path.join(freezeDir(outDir), 'freeze.json'))),
    frozenAtUtc: record.frozenAtUtc,
    protocol: protocol.holdout,
    symbols
  };

  await fs.ensureDir(holdoutDir(outDir));
  await fs.writeFile(resultFile, `${JSON.stringify(result, null, 1)}\n`);
  await writeHoldoutReport(researchDir, outDir, experiment, record, result);

  return result;
};

// The optional pre-2014 stress test, after the freeze. Each symbol's window starts once both the rank-1
// and the original lookbacks have full history, so they're compared over the same sessions.
export const runStress = async (
  researchDir: string,
  outDir: string,
  manifest: Manifest,
  log: (line: string) => void = () => {}
) => {
  const { record, experiment } = await verifyFreeze(researchDir, outDir, manifest);
  const protocol = record.protocol;
  const symbols: Record<string, (WindowResult & { note: string }) | { unavailable: string }> = {};

  for (const symbol of experiment.config.symbols) {
    const series = await researchSeries(symbol, manifest, protocol.researchEnd);
    const rank1 = record.symbols[symbol]?.rank1;
    const lookback = Math.max(originalParams.lookbackSessions, rank1?.params.lookbackSessions ?? 0);
    const firstInWindow = firstIndexOnOrAfter(series, protocol.stress.start);
    const startIndex = Math.max(firstInWindow, lookback);
    const endIndex = lastIndexOnOrBefore(series, protocol.stress.end);

    if (endIndex - startIndex < 20) {
      symbols[symbol] = {
        unavailable: `fewer than 20 sessions with full lookback history before ${protocol.stress.end}`
      };
      log(`${symbol}: stress unavailable`);
      continue;
    }

    symbols[symbol] = {
      ...(await runWindow(series, startIndex, endIndex, rank1, path.join(outDir, 'stress', symbol))),
      note:
        startIndex > firstInWindow
          ? `starts ${series.dates[startIndex]}, after ${lookback} sessions of history`
          : 'full window'
    };
    log(`${symbol}: stress ${series.dates[startIndex]}..${series.dates[endIndex]}`);
  }

  const result = { ranAtUtc: new Date().toISOString(), protocol: protocol.stress, symbols };

  await fs.ensureDir(path.join(outDir, 'stress'));
  await fs.writeFile(path.join(outDir, 'stress', 'stress.json'), `${JSON.stringify(result, null, 1)}\n`);

  const lines: string[] = [];

  lines.push('# Historical stress test (2005–2013)', '');
  lines.push(
    'Informational only: run after the freeze and never used to optimize, select or reject anything. Each symbol starts flat once both the frozen rank-1 and the original lookbacks have full history (the bulk archive starts most ETFs on 2005-02-25), so the two are compared over the same sessions. Rank 1 was chosen on 2014–2023, so this is out of sample for it, but in a very different regime (2008–2009).',
    ''
  );
  lines.push(
    table(
      [
        'Symbol',
        'Window',
        'Rank-1 net',
        'Rank-1 max DD',
        'Rank-1 trades',
        'Original net',
        'Original max DD',
        'Original trades',
        'Note'
      ],
      Object.entries(symbols).map(([symbol, value]) =>
        'unavailable' in value
          ? [symbol, '-', '-', '-', '-', '-', '-', '-', `unavailable: ${value.unavailable}`]
          : [
              symbol,
              `${value.window.start} – ${value.window.end}`,
              money(value.rank1?.metrics.netProfit),
              money(value.rank1?.metrics.maximumDrawdown),
              String(value.rank1?.metrics.entries ?? '-'),
              money(value.original.netProfit),
              money(value.original.maximumDrawdown),
              String(value.original.entries),
              value.note
            ]
      )
    ),
    ''
  );

  await fs.writeFile(path.join(researchDir, 'STRESS_TEST_RESULTS.md'), `${lines.join('\n')}\n`);

  return result;
};

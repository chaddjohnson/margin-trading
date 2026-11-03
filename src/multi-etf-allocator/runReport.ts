// The readable console report of one allocator run (`fixed` or `portfolio`, frozen or --dataset), in the manner of the
// standalone D1 strategy reports, and the run's drawdowns as a record. The report only formats: every figure comes
// from the run's summary, its per-symbol attribution, its period attribution (segments.ts) and the engine's trackers.
//
// Drawdowns are reported twice, as two independent maxima that are generally different episodes: the largest fall in
// dollars (the engine's Tracker, whose `maximumPercent` is that episode's depth) and the largest fall in percent of
// the running peak (PercentTracker), at the daily closes and at every minute mark. In the fixed mode the pool is
// constant, so a percent of the pool is a capital-allocation reference and the two maxima are the same episode.
import { formatNewYorkTime } from '#lib';
import { combinationKey, combinationLabel, formatDate, formatDollars, pct, symbols } from './context.ts';
import type { DrawdownStats, PercentDrawdownStats, RunConfig, RunResult } from './engine.ts';
import { type Summary, attribution } from './metrics.ts';
import type { SegmentRow } from './segments.ts';

export interface DrawdownEpisode {
  dollars: number;
  percent: number; // of the running peak (portfolio) or of the fixed allocation (fixed); see percentBasis
  peak: string;
  trough: string;
  recovery: string; // '' while not recovered by the end
  peakValue: number;
  troughValue: number;
}

export interface RunDrawdowns {
  basis: string;
  // What `percent` is a share of: the running peak of marked portfolio equity (a true peak-to-trough percentage) or
  // the fixed trading allocation (a capital-allocation reference, the same episode as the dollar maximum).
  percentBasis: 'peak-to-trough' | 'allocation';
  allocation?: number; // fixed: the pool
  daily: { largestDollar: DrawdownEpisode; largestPercent: DrawdownEpisode };
  minute: { largestDollar: DrawdownEpisode; largestPercent: DrawdownEpisode };
}

const minuteTime = (timestamp: number) => (Number.isFinite(timestamp) ? formatNewYorkTime(timestamp) : '');

const dollarEpisode = (
  stats: DrawdownStats,
  format: (timestamp: number) => string,
  percent: number
): DrawdownEpisode => ({
  dollars: stats.maximum,
  percent,
  peak: format(stats.peakTime),
  trough: format(stats.troughTime),
  recovery: format(stats.recoveryTime),
  peakValue: stats.peakValue,
  troughValue: stats.troughValue
});

const percentEpisode = (stats: PercentDrawdownStats, format: (timestamp: number) => string): DrawdownEpisode => ({
  dollars: stats.dollars,
  percent: stats.maximumPercent,
  peak: format(stats.peakTime),
  trough: format(stats.troughTime),
  recovery: format(stats.recoveryTime),
  peakValue: stats.peakValue,
  troughValue: stats.troughValue
});

export const runDrawdowns = (result: RunResult): RunDrawdowns => {
  const { config } = result;

  if (config.mode === 'portfolio') {
    return {
      basis: 'marked portfolio equity; percent of the running peak',
      percentBasis: 'peak-to-trough',
      daily: {
        largestDollar: dollarEpisode(result.dailyDrawdown, formatDate, result.dailyDrawdown.maximumPercent),
        largestPercent: percentEpisode(result.dailyPercentDrawdown!, formatDate)
      },
      minute: {
        largestDollar: dollarEpisode(result.minuteDrawdown, minuteTime, result.minuteDrawdown.maximumPercent),
        largestPercent: percentEpisode(result.minutePercentDrawdown!, minuteTime)
      }
    };
  }

  const daily = dollarEpisode(result.dailyDrawdown, formatDate, result.dailyDrawdown.maximum / config.fixedPrincipal);
  const minute = dollarEpisode(
    result.minuteDrawdown,
    minuteTime,
    result.minuteDrawdown.maximum / config.fixedPrincipal
  );

  return {
    basis: `strategy P&L of the fixed ${formatDollars(config.fixedPrincipal)} pool; percent of that trading allocation, not a peak-to-trough percentage`,
    percentBasis: 'allocation',
    allocation: config.fixedPrincipal,
    daily: { largestDollar: daily, largestPercent: daily },
    minute: { largestDollar: minute, largestPercent: minute }
  };
};

export const strategyName = (config: RunConfig) => {
  const books =
    config.symbols.length === symbols.length
      ? combinationLabel(combinationKey(config.combination)).replace(/^all-/, 'All-')
      : `${config.symbols.join('+')} D1`;

  return `${books} ${config.policy}`;
};

// A plain text table: the first `left` columns left-aligned, the others right-aligned.
export const textTable = (header: string[], rows: string[][], left = 1) => {
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column]!.length)));
  const line = (cells: string[]) =>
    cells
      .map((cell, column) => (column < left ? cell.padEnd(widths[column]!) : cell.padStart(widths[column]!)))
      .join('  ')
      .trimEnd();

  return [line(header), line(widths.map((width) => '-'.repeat(width))), ...rows.map(line)];
};

const span = (episode: DrawdownEpisode) =>
  `${episode.peak} → ${episode.trough}, ${episode.recovery ? `recovered ${episode.recovery}` : 'not recovered by the end'}`;

const count = (value: number) => value.toLocaleString('en-US');

// A percentage with thousands separators (1,120.6%).
const groupedPct = (fraction: number) =>
  Number.isFinite(fraction)
    ? `${(fraction * 100).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : 'n/a';

export interface RunReportInput {
  result: RunResult;
  summary: Summary;
  dataset?: string; // the --dataset partition; absent for the frozen protocol inputs
  segments?: SegmentRow[];
  outDir?: string;
}

export const formatRunReport = ({ result, summary, dataset, segments, outDir }: RunReportInput): string => {
  const { config } = result;
  const portfolio = config.mode === 'portfolio';
  const drawdowns = runDrawdowns(result);
  const lines: string[] = [];
  const add = (...more: string[]) => lines.push(...more);

  add(
    `Strategy: ${strategyName(config)} (${summary.phenotypes})`,
    portfolio
      ? `Mode: 20% portfolio: ${formatDollars(summary.startEquity)} core (VOOG ${formatDollars(config.initial.voog)}, VGT ${formatDollars(config.initial.vgt)}), each funded lot borrows ${pct(config.fraction, 0)} of equity`
      : `Mode: fixed ${formatDollars(config.fixedPrincipal)} pool: one funded lot at a time, strategy P&L only (no core portfolio)`,
    `Dataset: ${dataset ?? 'frozen protocol inputs (the archived files)'}`,
    `Period: ${summary.start} to ${summary.end} (${count(summary.sessions - 1)} sessions after the start close, ${summary.spanYears.toFixed(2)} years)`
  );

  if (portfolio) {
    add(
      `Starting portfolio: ${formatDollars(summary.startEquity)}`,
      `Ending portfolio: ${formatDollars(summary.endEquity)}`,
      `Total portfolio return: ${groupedPct(summary.totalReturn)}`,
      `CAGR: ${pct(summary.cagr)}`
    );
  }

  const profit = portfolio ? 'margin profit' : 'profit';

  add(
    '',
    `Funded trades: ${summary.fundedLots} (${summary.closed} closed, ${summary.openAtEnd} open at the end) of ${summary.virtualTrades} virtual trades; ${summary.signalsRefused} signals refused`,
    `Closed trades: ${summary.closed}`,
    `Winning trades: ${summary.wins}`,
    `Losing trades: ${summary.losses}`,
    `Realized ${profit}: ${formatDollars(summary.realized)}`,
    `Unrealized ${profit}: ${formatDollars(summary.unrealized)}`,
    `Total net ${profit}: ${formatDollars(summary.net)}`,
    `Margin interest: ${formatDollars(summary.interest)}`
  );

  if (portfolio) {
    add(`Dividends: ${formatDollars(summary.dividends)} (core and lots)`);
  }

  const dd = (fraction: number) => pct(fraction, 2);

  if (portfolio) {
    const below = (episode: DrawdownEpisode) =>
      `${dd(episode.percent)} below its ${formatDollars(episode.peakValue)} peak`;
    const from = (episode: DrawdownEpisode) =>
      `${formatDollars(episode.dollars)} from a ${formatDollars(episode.peakValue)} peak`;

    add(
      '',
      `Maximum portfolio daily drawdown ($): ${formatDollars(drawdowns.daily.largestDollar.dollars)} (${below(drawdowns.daily.largestDollar)}), ${span(drawdowns.daily.largestDollar)}`,
      `Maximum portfolio daily drawdown (peak-to-trough %): ${dd(drawdowns.daily.largestPercent.percent)} (${from(drawdowns.daily.largestPercent)}), ${span(drawdowns.daily.largestPercent)}`,
      `Maximum portfolio minute drawdown ($): ${formatDollars(drawdowns.minute.largestDollar.dollars)} (${below(drawdowns.minute.largestDollar)}), ${span(drawdowns.minute.largestDollar)}`,
      `Maximum portfolio minute drawdown (peak-to-trough %): ${dd(drawdowns.minute.largestPercent.percent)} (${from(drawdowns.minute.largestPercent)}), ${span(drawdowns.minute.largestPercent)}`,
      'Percent basis: peak-to-trough falls of marked portfolio equity (the portfolio has no fixed trading allocation). The dollar and percent maxima are measured independently: the percent after a dollar maximum is that episode’s own depth, not the maximum percentage drawdown.',
      `Margin strategy drawdown (realized + unrealized net of interest): ${formatDollars(summary.strategyDailyDrawdown)} daily, ${formatDollars(summary.strategyMinuteDrawdown)} minute (dollars only: lots borrow ${pct(config.fraction, 0)} of equity, so there is no fixed allocation to express them against)`,
      `Lowest equity / long market value: ${summary.minEquityToLmvDaily.toFixed(3)} (${summary.minEquityToLmvDailyDate}); maximum gross exposure ${summary.maxGrossExposure.toFixed(3)} (${summary.maxGrossExposureDate}); margin calls ${summary.calls}; forced sales ${summary.forcedSales}`
    );
  } else {
    const allocation = `of ${formatDollars(config.fixedPrincipal)} allocation`;

    add(
      '',
      `Maximum drawdown (daily): ${formatDollars(drawdowns.daily.largestDollar.dollars)} (${dd(drawdowns.daily.largestDollar.percent)} ${allocation}), ${span(drawdowns.daily.largestDollar)}`,
      `Maximum drawdown (minute): ${formatDollars(drawdowns.minute.largestDollar.dollars)} (${dd(drawdowns.minute.largestDollar.percent)} ${allocation}), ${span(drawdowns.minute.largestDollar)}`,
      `Percent basis: the fixed ${formatDollars(config.fixedPrincipal)} trading allocation, a capital-allocation reference, not a peak-to-trough drawdown of account equity; with a constant allocation the largest dollar and percent drawdowns are the same episode.`
    );
  }

  const bySymbol = attribution(result);

  add(
    '',
    'By symbol (funded lots):',
    ...textTable(
      [
        'Symbol',
        'Phenotype',
        'Funded',
        'Open',
        'Wins',
        'Losses',
        'Realized',
        'Unrealized',
        'Net',
        'Interest',
        'Refused'
      ],
      [
        ...bySymbol.map((row) => [
          row.symbol,
          row.phenotype,
          String(row.funded),
          String(row.fundedOpen),
          String(row.wins),
          String(row.losses),
          formatDollars(row.realized),
          formatDollars(row.unrealized),
          formatDollars(row.net),
          formatDollars(row.interest),
          String(row.refusedSignals)
        ]),
        [
          'Total',
          '',
          String(summary.fundedLots),
          String(summary.openAtEnd),
          String(summary.wins),
          String(summary.losses),
          formatDollars(summary.realized),
          formatDollars(summary.unrealized),
          formatDollars(summary.net),
          formatDollars(summary.interest),
          String(summary.signalsRefused)
        ]
      ],
      2
    ).map((line) => `  ${line}`)
  );

  if (segments?.length) {
    add(
      '',
      'Periods of the one continuous run (data/partitions.json; training reported as development; nothing resets at a boundary):',
      ...textTable(
        portfolio
          ? [
              'Period',
              'From',
              'To',
              'Start equity',
              'End equity',
              'Return',
              'Strategy P&L',
              'Interest',
              'Dividends',
              'Lots'
            ]
          : ['Period', 'From', 'To', 'Strategy P&L', 'Interest', 'Lots'],
        segments.map((row) => [
          row.segment,
          row.firstDate,
          row.lastDate,
          ...(portfolio
            ? [formatDollars(row.startEquity), formatDollars(row.endEquity), groupedPct(row.equityReturn)]
            : []),
          formatDollars(row.strategyPnl),
          formatDollars(row.interest),
          ...(portfolio ? [formatDollars(row.dividends)] : []),
          `${row.lotsEntered} in / ${row.lotsExited} out`
        ])
      ).map((line) => `  ${line}`),
      '',
      `Daily drawdowns within each period (${portfolio ? 'marked portfolio equity; percent of its peak' : `strategy P&L; percent of the ${formatDollars(config.fixedPrincipal)} allocation`}):`,
      ...textTable(
        portfolio
          ? ['Period', 'Largest $ DD', 'Its depth', 'Peak → trough', 'Max peak-to-trough %', 'Its $', 'Peak → trough']
          : ['Period', 'Largest $ DD', '% of allocation', 'Peak → trough'],
        segments.map((row) => [
          row.segment,
          formatDollars(row.maxDrawdown),
          dd(portfolio ? row.maxDrawdownPercent : row.maxDrawdown / config.fixedPrincipal),
          row.maxDrawdown > 0 ? `${row.drawdownPeak} → ${row.drawdownTrough}` : '',
          ...(portfolio
            ? [
                dd(row.maxPercentDrawdown),
                formatDollars(row.maxPercentDrawdownDollars),
                row.maxPercentDrawdown > 0 ? `${row.percentDrawdownPeak} → ${row.percentDrawdownTrough}` : ''
              ]
            : [])
        ])
      ).map((line) => `  ${line}`)
    );
  }

  if (outDir) {
    add(
      '',
      `Machine-readable results: ${outDir} (summary.json, trades.csv, daily.csv${portfolio ? ', account_ledger.csv' : ''}, …)`
    );
  }

  return `${lines.join('\n')}\n`;
};

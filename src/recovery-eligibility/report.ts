// Table helpers shared by the diagnostic and optimization commands: trade lists, recovery-episode attribution
// and metric rows as Markdown, so that every number in the reports is machine-generated.
import { formatNewYorkTime } from '#lib';
import type { Dataset } from '../four-family/data.ts';
import type { AccountingResult } from '../trailing-buy-variants/accounting.ts';
import { formatDollars, formatSignedDollars } from './context.ts';
import type { Trade } from './engine.ts';
import type { Metrics } from './evaluate.ts';

export const pct = (fraction: number, digits = 1) => `${(fraction * 100).toFixed(digits)}%`;
export const price = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '');
export const ny = (time: number) => (Number.isFinite(time) ? formatNewYorkTime(time) : '');

// The market's recovery episodes used for attribution, by entry date. Each has a trough window and a peak
// window; the move is measured from the lowest close in the trough window to the highest close in the peak
// window, both computed from the data.
export interface EpisodeSpec {
  key: string;
  name: string;
  start: string; // trades entered in [start, end] belong to the episode
  end: string;
  troughStart: string;
  troughEnd: string;
  peakStart: string;
  peakEnd: string;
}

export const recoveryEpisodes: EpisodeSpec[] = [
  {
    key: 'r2019',
    name: '2018 Q4 correction → 2019 recovery',
    start: '2018-10-01',
    end: '2019-09-30',
    troughStart: '2018-10-01',
    troughEnd: '2019-01-31',
    peakStart: '2019-02-01',
    peakEnd: '2019-07-31'
  },
  {
    key: 'r2020',
    name: '2020 COVID crash → recovery',
    start: '2020-02-01',
    end: '2020-12-31',
    troughStart: '2020-02-15',
    troughEnd: '2020-04-15',
    peakStart: '2020-04-16',
    peakEnd: '2020-09-30'
  },
  {
    key: 'bear2022',
    name: '2022 bear market (rallies and failures)',
    start: '2021-11-01',
    end: '2022-12-14',
    troughStart: '2022-06-01',
    troughEnd: '2022-10-31',
    peakStart: '2021-11-01',
    peakEnd: '2022-01-31'
  },
  {
    key: 'r2023',
    name: '2022-12 trough → 2023 recovery',
    start: '2022-12-15',
    end: '2023-09-15',
    troughStart: '2022-12-15',
    troughEnd: '2023-01-31',
    peakStart: '2023-02-01',
    peakEnd: '2023-08-31'
  },
  {
    key: 'r2024',
    name: '2023 Q4 dip → 2024 advance',
    start: '2023-09-16',
    end: '2024-12-31',
    troughStart: '2023-09-16',
    troughEnd: '2023-11-30',
    peakStart: '2023-12-01',
    peakEnd: '2024-07-31'
  },
  {
    key: 'r2025',
    name: '2025 tariff crash → recovery (open at the end)',
    start: '2025-01-01',
    end: '2025-12-31',
    troughStart: '2025-02-15',
    troughEnd: '2025-05-15',
    peakStart: '2025-05-16',
    peakEnd: '2025-12-31'
  }
];

export interface EpisodeMove {
  key: string;
  name: string;
  troughDate: string;
  trough: number;
  peakDate: string;
  peak: number;
  move: number; // peak / trough - 1
}

export const episodeMoves = (ds: Dataset): EpisodeMove[] =>
  recoveryEpisodes.map((episode) => {
    let trough = Infinity;
    let troughDate = '';
    let peak = -Infinity;
    let peakDate = '';

    for (let s = 0; s < ds.sessionCount; s++) {
      const date = ds.dates[s]!;

      if (date >= episode.troughStart && date <= episode.troughEnd && ds.sClose[s]! < trough) {
        trough = ds.sClose[s]!;
        troughDate = date;
      }

      if (date >= episode.peakStart && date <= episode.peakEnd && ds.sClose[s]! > peak) {
        peak = ds.sClose[s]!;
        peakDate = date;
      }
    }

    return { key: episode.key, name: episode.name, troughDate, trough, peakDate, peak, move: peak / trough - 1 };
  });

export const episodeOf = (date: string) =>
  recoveryEpisodes.find((episode) => date >= episode.start && date <= episode.end)?.key ?? 'other';

export interface TradeRow {
  index: number;
  kind: string;
  entryDate: string;
  entryTime: string;
  entryPrice: number;
  exitDate: string;
  exitTime: string;
  exitPrice: number;
  reason: string;
  holdDays: number;
  interest: number;
  profit: number;
  isOpen: boolean;
  referenceHigh: number;
  anchorHigh: number;
  activationDate: string;
  activationPrice: number;
  depthAtActivation: number; // below the anchor
  trailingLow: number;
  episode: string;
}

export const tradeRows = (ds: Dataset, trades: Trade[], accounting: AccountingResult): TradeRow[] =>
  trades.map((trade, index) => {
    const outcome = accounting.outcomes[index]!;

    return {
      index: index + 1,
      kind: trade.kind,
      entryDate: ds.dates[trade.entryIndex]!,
      entryTime: ny(trade.entryTime),
      entryPrice: trade.entryPrice,
      exitDate: trade.exitIndex < 0 ? '' : ds.dates[trade.exitIndex]!,
      exitTime: trade.exitIndex < 0 ? '' : ny(trade.exitTime),
      exitPrice: trade.exitIndex < 0 ? ds.sClose[ds.sessionCount - 1]! : trade.exitPrice,
      reason: trade.reason,
      holdDays: outcome.holdDays,
      interest: outcome.interest,
      profit: outcome.profit,
      isOpen: outcome.isOpen,
      referenceHigh: trade.referenceHigh,
      anchorHigh: trade.anchorHigh,
      activationDate: ds.dates[trade.activationIndex]!,
      activationPrice: trade.activationPrice,
      depthAtActivation: 1 - trade.activationPrice / trade.anchorHigh,
      trailingLow: trade.trailingLow,
      episode: episodeOf(ds.dates[trade.entryIndex]!)
    };
  });

export const tradeTable = (rows: TradeRow[], withKind = true) => {
  const lines = [
    `| # |${withKind ? ' Path |' : ''} Armed (close, depth from anchor) | Entry | Exit | Reason | Days | Interest | Net | Episode |`,
    `|---|${withKind ? '---|' : ''}---|---|---|---|---:|---:|---:|---|`
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.index} |${withKind ? ` ${row.kind} |` : ''} ${row.activationDate} ${price(row.activationPrice)} (${pct(row.depthAtActivation)} below ${price(row.anchorHigh)}) | ${row.entryTime} ${price(row.entryPrice)} | ${row.isOpen ? `open (marked ${price(row.exitPrice)})` : `${row.exitTime} ${price(row.exitPrice)}`} | ${row.reason} | ${row.holdDays} | ${formatDollars(row.interest)} | ${formatSignedDollars(row.profit)} | ${row.episode} |`
    );
  }

  return lines.join('\n');
};

// Net by recovery episode, with the first entry and the share of the episode's move captured by the trades
// entered in it (sum over trades of exit/entry - 1, divided by the episode's trough-to-peak move).
export const episodeAttribution = (rows: TradeRow[], moves: EpisodeMove[]) =>
  moves.map((move) => {
    const inEpisode = rows.filter((row) => row.episode === move.key);
    const net = inEpisode.reduce((total, row) => total + row.profit, 0);
    const captured = inEpisode.reduce((total, row) => total + (row.exitPrice / row.entryPrice - 1), 0);
    const first = inEpisode[0];

    return {
      key: move.key,
      name: move.name,
      trades: inEpisode.length,
      net,
      firstEntry: first ? `${first.entryDate} ${price(first.entryPrice)}` : '',
      capturedShare: move.move > 0 ? captured / move.move : 0,
      worst: inEpisode.length > 0 ? Math.min(...inEpisode.map((row) => row.profit)) : 0
    };
  });

export const metricsRow = (label: string, metrics: Metrics, extra = '') =>
  `| ${label} | ${formatDollars(metrics.net)} | ${formatDollars(metrics.minuteDrawdown)} | ${formatDollars(metrics.dailyDrawdown)} | ${metrics.entries}${metrics.openAtEnd ? ' (1 open)' : ''} | ${metrics.wins}/${metrics.losses} | ${formatDollars(metrics.worstTrade)} | ${formatDollars(metrics.worstEpisodeLoss)} | ${formatDollars(metrics.interest)} | ${pct(metrics.exposure)} |${extra ? ` ${extra} |` : ''}`;

export const metricsHeader = (label: string, extra = '') =>
  `| ${label} | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst streak | Interest | Exposure |${extra ? ` ${extra} |` : ''}\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|${extra ? '---|' : ''}`;

export const csvLine = (values: (string | number | boolean)[]) =>
  values
    .map((value) => (typeof value === 'number' ? (Number.isFinite(value) ? String(value) : '') : String(value)))
    .join(',');

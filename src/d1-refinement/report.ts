// Table helpers shared by the commands: trade lists, recovery-episode attribution, regime rows and metric rows
// as Markdown, so that every number in the reports is machine-generated.
import { formatNewYorkTime } from '#lib';
import type { Dataset } from '../four-family/data.ts';
import type { AccountingResult } from '../trailing-buy-variants/accounting.ts';
import { formatDollars, formatSignedDollars } from './context.ts';
import type { Trade } from './engine.ts';
import type { Metrics } from './evaluate.ts';

export const pct = (fraction: number, digits = 1) =>
  Number.isFinite(fraction) ? `${(fraction * 100).toFixed(digits)}%` : '';
export const price = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '');
export const ny = (time: number) => (Number.isFinite(time) ? formatNewYorkTime(time) : '');

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

// The same episodes as the recovery-eligibility program, so attributions are comparable across programs.
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
  move: number;
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
  depthAtActivation: number;
  trailingLow: number;
  episode: string;
  stopFirstActive: string;
  stopActiveSessions: number;
  stopSwitchOffSessions: number;
  exitStopPrice: number;
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
      activationDate: trade.activationIndex >= 0 ? ds.dates[trade.activationIndex]! : '',
      activationPrice: trade.activationPrice,
      depthAtActivation: 1 - trade.activationPrice / trade.anchorHigh,
      trailingLow: trade.trailingLow,
      episode: episodeOf(ds.dates[trade.entryIndex]!),
      stopFirstActive: trade.stopFirstActiveIndex >= 0 ? ds.dates[trade.stopFirstActiveIndex]! : 'never',
      stopActiveSessions: trade.stopActiveSessions,
      stopSwitchOffSessions: trade.stopSwitchOffSessions,
      exitStopPrice: trade.exitStopPrice
    };
  });

export const tradeTable = (rows: TradeRow[], withStop = false) => {
  const lines = [
    `| # | Path | Armed (close, from anchor) | Entry | Exit | Reason | Days | Interest | Net | Episode |${withStop ? ' Stop first active | Active / off sessions |' : ''}`,
    `|---|---|---|---|---|---|---:|---:|---:|---|${withStop ? '---|---:|' : ''}`
  ];

  for (const row of rows) {
    const depth = Number.isFinite(row.depthAtActivation)
      ? ` (${pct(Math.abs(row.depthAtActivation))} ${row.depthAtActivation >= 0 ? 'below' : 'above'} ${price(row.anchorHigh)})`
      : '';

    lines.push(
      `| ${row.index} | ${row.kind} | ${row.activationDate} ${price(row.activationPrice)}${depth} | ${row.entryTime} ${price(row.entryPrice)} | ${row.isOpen ? `open (marked ${price(row.exitPrice)})` : `${row.exitTime} ${price(row.exitPrice)}`} | ${row.reason} | ${Math.round(row.holdDays)} | ${formatDollars(row.interest)} | ${formatSignedDollars(row.profit)} | ${row.episode} |${withStop ? ` ${row.stopFirstActive} | ${row.stopActiveSessions} / ${row.stopSwitchOffSessions} |` : ''}`
    );
  }

  return lines.join('\n');
};

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

export const attributionTable = (rows: TradeRow[], moves: EpisodeMove[]) => {
  const lines = [
    '| Episode | Trades | Net | First entry | Share of the move captured | Worst trade |',
    '|---|---:|---:|---|---:|---:|'
  ];

  for (const row of episodeAttribution(rows, moves)) {
    lines.push(
      `| ${row.name} | ${row.trades} | ${formatSignedDollars(row.net)} | ${row.firstEntry} | ${pct(row.capturedShare, 0)} | ${row.trades > 0 ? formatSignedDollars(row.worst) : ''} |`
    );
  }

  const other = rows.filter((row) => row.episode === 'other');

  lines.push(
    `| other periods | ${other.length} | ${formatSignedDollars(other.reduce((total, row) => total + row.profit, 0))} | ${other[0] ? `${other[0].entryDate} ${price(other[0].entryPrice)}` : ''} | | ${other.length > 0 ? formatSignedDollars(Math.min(...other.map((row) => row.profit))) : ''} |`
  );

  return lines.join('\n');
};

export const metricsHeader = (label: string, extra = '') =>
  `| ${label} | Net | Minute DD | Daily DD | Net/DD | Entries | W/L | Worst trade | Worst streak | Worst excursion | Interest | Exposure | Avg hold |${extra ? ` ${extra} |` : ''}\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|${extra ? '---|' : ''}`;

export const metricsRow = (label: string, metrics: Metrics, extra = '') =>
  `| ${label} | ${formatDollars(metrics.net)} | ${formatDollars(metrics.minuteDrawdown)} | ${formatDollars(metrics.dailyDrawdown)} | ${metrics.minuteDrawdown > 0 ? (metrics.net / metrics.minuteDrawdown).toFixed(2) : '—'} | ${metrics.entries}${metrics.openAtEnd ? ' (1 open)' : ''} | ${metrics.wins}/${metrics.losses} | ${formatDollars(metrics.worstTrade)} | ${formatDollars(metrics.worstEpisodeLoss)} | ${formatDollars(metrics.worstAdverseExcursion)} | ${formatDollars(metrics.interest)} | ${pct(metrics.exposure, 0)} | ${metrics.averageHoldDays.toFixed(0)} d |${extra ? ` ${extra} |` : ''}`;

// Net, drawdown and trade count per named segment, as one row per segment.
export const segmentTable = (metricsList: { label: string; metrics: Metrics }[], segmentLabels: string[]) => {
  const lines = [
    `| Window | ${metricsList.map((entry) => entry.label).join(' | ')} |`,
    `|---|${metricsList.map(() => '---:').join('|')}|`
  ];

  for (const label of segmentLabels) {
    const cells = metricsList.map(({ metrics }) => {
      const segment = metrics.segments.find((candidate) => candidate.label === label);

      if (!segment) {
        return '';
      }

      return segment.entries === 0 && segment.exits === 0
        ? `no trades (${formatSignedDollars(segment.net)})`
        : `${formatSignedDollars(segment.net)} / DD ${formatDollars(segment.minuteDrawdown)} / ${segment.entries}e ${segment.wins}w ${segment.losses}l`;
    });

    lines.push(`| ${label} | ${cells.join(' | ')} |`);
  }

  return lines.join('\n');
};

export const csvLine = (values: (string | number | boolean | undefined)[]) =>
  values
    .map((value) =>
      value === undefined
        ? ''
        : typeof value === 'number'
          ? Number.isFinite(value)
            ? String(value)
            : ''
          : String(value)
    )
    .join(',');

// Which trades of `candidate` are the same as a trade of `reference` (same entry session, minute and price, same
// exit), which are altered (same entry, different exit), gained (no such entry) and which reference trades are lost.
export const diffTrades = (ds: Dataset, reference: Trade[], candidate: Trade[]) => {
  const entryKey = (trade: Trade) => `${trade.entryIndex}|${trade.entryBar}|${trade.entryPrice.toFixed(6)}`;
  const exitKey = (trade: Trade) => `${trade.exitIndex}|${trade.exitBar}|${trade.exitPrice.toFixed(6)}|${trade.reason}`;
  const referenceByEntry = new Map(reference.map((trade) => [entryKey(trade), trade]));
  const candidateByEntry = new Map(candidate.map((trade) => [entryKey(trade), trade]));
  const preserved: Trade[] = [];
  const altered: { reference: Trade; candidate: Trade }[] = [];
  const gained: Trade[] = [];
  const lost: Trade[] = [];

  for (const trade of candidate) {
    const match = referenceByEntry.get(entryKey(trade));

    if (!match) {
      gained.push(trade);
    } else if (exitKey(match) === exitKey(trade)) {
      preserved.push(trade);
    } else {
      altered.push({ reference: match, candidate: trade });
    }
  }

  for (const trade of reference) {
    if (!candidateByEntry.has(entryKey(trade))) {
      lost.push(trade);
    }
  }

  return {
    preserved,
    altered,
    gained,
    lost,
    dates: (trade: Trade) =>
      `${ds.dates[trade.entryIndex]} → ${trade.exitIndex < 0 ? 'open' : ds.dates[trade.exitIndex]}`
  };
};

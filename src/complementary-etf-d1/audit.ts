// The data and corporate-action audit (PROTOCOL.md §1–§2; DATA_AND_CORPORATE_ACTION_AUDIT.md): integrity facts of
// the 16 canonical files over every partition. It reads prices for data quality and corporate actions only and
// computes no strategy result on any window.
//
// - coverage: the `npm run datasets -- verify` report of each file (rows, per-partition rows and hashes, order,
//   duplicates, malformed rows, missing sessions, bars on closed days, early closes, sparse sessions), checked to
//   cover every row exactly once by training ‖ holdout ‖ final;
// - splits: each recorded split before and after the forward adjustment (overnight move, minute volume, the depth a
//   74-session reference high would read on the effective date);
// - discontinuities: overnight moves of the split-adjusted series of at least `gapThreshold`, classified as
//   market-wide when at least `marketWide` of the 16 files moved by `concurrentMove` the same night; single-minute
//   jumps; and shifts of the median daily volume (split-adjusted) between the 20 sessions before and after a date;
// - liquidity: median regular bars per session and median daily dollar volume per partition.
import path from 'node:path';
import fs from 'fs-extra';
import { loadDatasetSessions, readPartitionConfig, readSplits, resolveDataset, splitFactor } from '#lib';
import type { MarketSession } from '#types';
import { auditSymbols, log, pct, stageDir, writeJson, writeText } from './context.ts';
import { loadAllForAudit } from './data.ts';

const gapThreshold = 0.08;
const concurrentMove = 0.04;
const marketWide = 4;
const minuteJump = 0.08;
const volumeWindow = 20;
const volumeShift = 3;
const referenceLookback = 74;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

interface DatasetReportFile {
  status: string;
  after: { rows: number; sha256: string; firstTimestamp: string; lastTimestamp: string };
  scan: {
    dataRows: number;
    partitions: Record<string, { rows: number; firstDate: string; lastDate: string; sha256: string }>;
    malformed: { count: number };
    outOfOrder: { count: number };
    duplicates: { count: number };
    outOfRange: { count: number };
    unalignedSeconds: { count: number };
    inconsistentPrices: { count: number };
    audit: {
      firstDate: string;
      lastDate: string;
      expectedSessions: number;
      sessionsWithRegularBars: number;
      missingSessions: string[];
      sessionsOnClosedDays: string[];
      extendedHoursBars: number;
      earlyCloseLateBars: { date: string; bars: number }[];
      coverage: { median: number; below50: number; below90: number };
    };
  };
  anomalies: string[];
  errors: string[];
}

const partitionOf = (date: string, config: ReturnType<typeof readPartitionConfig>) =>
  (['training', 'holdout', 'final'] as const).find((name) => {
    const { start, end } = config.partitions[name];

    return (start === null || date >= start) && (end === null || date <= end);
  }) ?? 'outside';

const overnight = (sessions: MarketSession[], index: number) => sessions[index]!.open / sessions[index - 1]!.close - 1;

// The depth below the highest high of the previous `lookback` sessions at a session's low.
const depthAt = (sessions: MarketSession[], index: number, lookback = referenceLookback) => {
  let high = -Infinity;

  for (let s = Math.max(0, index - lookback); s < index; s++) {
    high = Math.max(high, sessions[s]!.high);
  }

  return 1 - sessions[index]!.low / high;
};

const medianMinuteVolume = (sessions: MarketSession[]) =>
  median(sessions.flatMap((session) => session.bars.map((bar) => bar.volume)));

// The window of a split check: enough sessions before the effective date for the 74-session reference high and the
// volume medians, and the volume window after it.
const splitWindow = (effectiveDate: string) => {
  const day = 86400000;
  const date = (offset: number) => new Date(Date.parse(effectiveDate) + offset * day).toISOString().slice(0, 10);

  return { startDate: date(-180), endDate: date(45) };
};

const checkSplit = async (
  split: ReturnType<typeof readSplits>[number],
  config: ReturnType<typeof readPartitionConfig>
) => {
  const splits = readSplits();
  const window = splitWindow(split.effectiveDate);
  const dataset = resolveDataset(split.symbol, 'all');
  const raw = (await loadDatasetSessions({ dataset, ...window, splits: [] })).sessions;
  const sessions = (await loadDatasetSessions({ dataset, ...window, splits })).sessions;
  const index = raw.findIndex((session) => session.date === split.effectiveDate);
  const before = raw.slice(Math.max(0, index - volumeWindow), index);
  const after = raw.slice(index, index + volumeWindow);
  const afterAdjusted = sessions.slice(index, index + volumeWindow);

  return {
    symbol: split.symbol,
    effectiveDate: split.effectiveDate,
    ratio: split.ratio,
    partition: partitionOf(split.effectiveDate, config),
    previousClose: raw[index - 1]!.close,
    rawOpen: raw[index]!.open,
    rawOvernight: overnight(raw, index),
    adjustedOpen: sessions[index]!.open,
    adjustedOvernight: overnight(sessions, index),
    rawDepthBelow74High: depthAt(raw, index),
    adjustedDepthBelow74High: depthAt(sessions, index),
    medianMinuteVolumeBefore: medianMinuteVolume(before),
    medianMinuteVolumeAfterRaw: medianMinuteVolume(after),
    medianMinuteVolumeAfterAdjusted: medianMinuteVolume(afterAdjusted),
    dollarVolumeBefore: median(before.map((session) => session.volume * session.close)),
    dollarVolumeAfter: median(afterAdjusted.map((session) => session.volume * session.close)),
    // The adjusted ÷ raw price on the effective date must equal the registry's factor from the window's first session.
    adjustmentFactor: sessions[index]!.close / raw[index]!.close,
    expectedFactor: splitFactor(splits, split.symbol, raw[0]!.date, split.effectiveDate)
  };
};

interface Gap {
  symbol: string;
  date: string;
  partition: string;
  previousClose: number;
  open: number;
  move: number;
  closeToClose: number;
  filesMovingFourPercent: number;
  classification: 'market-wide' | 'idiosyncratic';
}

// One file's integrity facts from its split-adjusted sessions; the sessions are not kept.
const scanFile = (symbol: string, sessions: MarketSession[], config: ReturnType<typeof readPartitionConfig>) => {
  const moves: { date: string; move: number }[] = [];
  const gaps: Gap[] = [];
  const jumps = [];
  const volumeShifts: {
    symbol: string;
    date: string;
    partition: string;
    ratio: number;
    firstDate: string;
    lastDate: string;
  }[] = [];
  const liquidity = [];

  for (let index = 1; index < sessions.length; index++) {
    const session = sessions[index]!;
    const move = overnight(sessions, index);

    moves.push({ date: session.date, move });

    if (Math.abs(move) >= gapThreshold) {
      gaps.push({
        symbol,
        date: session.date,
        partition: partitionOf(session.date, config),
        previousClose: sessions[index - 1]!.close,
        open: session.open,
        move,
        closeToClose: session.close / sessions[index - 1]!.close - 1,
        filesMovingFourPercent: 0,
        classification: 'idiosyncratic'
      });
    }

    for (let bar = 1; bar < session.bars.length; bar++) {
      const change = session.bars[bar]!.close / session.bars[bar - 1]!.close - 1;

      if (Math.abs(change) >= minuteJump) {
        jumps.push({
          symbol,
          date: session.date,
          partition: partitionOf(session.date, config),
          time: new Date(session.bars[bar]!.time * 1000).toISOString(),
          from: session.bars[bar - 1]!.close,
          to: session.bars[bar]!.close,
          change
        });
      }
    }
  }

  // Volume regimes: shifts of the median daily volume, runs of consecutive flagged dates collapsed to their most
  // extreme day.
  let previous = -2;

  for (let index = volumeWindow; index + volumeWindow <= sessions.length; index++) {
    const before = median(sessions.slice(index - volumeWindow, index).map((session) => session.volume));
    const after = median(sessions.slice(index, index + volumeWindow).map((session) => session.volume));
    const ratio = after / before;

    if (!(ratio >= volumeShift || ratio <= 1 / volumeShift)) {
      continue;
    }

    const date = sessions[index]!.date;
    const last = volumeShifts.at(-1);

    if (last && index - previous <= 1) {
      last.lastDate = date;

      if (Math.abs(Math.log(ratio)) > Math.abs(Math.log(last.ratio))) {
        last.ratio = ratio;
        last.date = date;
        last.partition = partitionOf(date, config);
      }
    } else {
      volumeShifts.push({ symbol, date, partition: partitionOf(date, config), ratio, firstDate: date, lastDate: date });
    }

    previous = index;
  }

  for (const name of ['training', 'holdout', 'final'] as const) {
    const inside = sessions.filter((session) => partitionOf(session.date, config) === name);

    liquidity.push({
      symbol,
      partition: name,
      sessions: inside.length,
      medianBarsPerSession: median(inside.map((session) => session.bars.length)),
      medianDailyDollarVolume: median(inside.map((session) => session.volume * session.close)),
      medianClose: median(inside.map((session) => session.close))
    });
  }

  return { moves, gaps, jumps, volumeShifts, liquidity };
};

export const runAudit = async () => {
  const config = readPartitionConfig();
  const splits = readSplits();
  const coverage = [];
  const gaps: Gap[] = [];
  const jumps = [];
  const volumeShifts = [];
  const liquidity = [];
  const moveByDate = new Map<string, number>(); // the number of files that moved ≥ concurrentMove overnight

  for (const symbol of auditSymbols) {
    const loaded = await loadAllForAudit(symbol);
    const scanned = scanFile(symbol, loaded.sessions, config);
    const report = (await fs.readJson(path.join('data', symbol, 'dataset-report.json'))) as DatasetReportFile;
    const { scan } = report;
    const partitionRows = ['training', 'holdout', 'final'].map((name) => scan.partitions[name]?.rows ?? 0);

    for (const { date, move } of scanned.moves) {
      if (Math.abs(move) >= concurrentMove) {
        moveByDate.set(date, (moveByDate.get(date) ?? 0) + 1);
      }
    }

    gaps.push(...scanned.gaps);
    jumps.push(...scanned.jumps);
    volumeShifts.push(...scanned.volumeShifts);
    liquidity.push(...scanned.liquidity);
    coverage.push({
      symbol,
      status: report.status,
      sha256: report.after.sha256,
      hashMatchesLoaded: report.after.sha256 === loaded.dataHash,
      sessionsLoaded: loaded.sessions.length,
      splitAdjustments: loaded.report.splitAdjustments,
      rows: scan.dataRows,
      partitions: scan.partitions,
      everyRowOncePartitioned: partitionRows.reduce((total, rows) => total + rows, 0) === scan.dataRows,
      malformed: scan.malformed.count,
      outOfOrder: scan.outOfOrder.count,
      duplicates: scan.duplicates.count,
      outOfRange: scan.outOfRange.count,
      unalignedSeconds: scan.unalignedSeconds.count,
      inconsistentPrices: scan.inconsistentPrices.count,
      firstDate: scan.audit.firstDate,
      lastDate: scan.audit.lastDate,
      expectedSessions: scan.audit.expectedSessions,
      sessionsWithRegularBars: scan.audit.sessionsWithRegularBars,
      missingSessions: scan.audit.missingSessions,
      sessionsOnClosedDays: scan.audit.sessionsOnClosedDays,
      extendedHoursBars: scan.audit.extendedHoursBars,
      earlyCloseDaysWithLateBars: scan.audit.earlyCloseLateBars.length,
      sparseSessionsBelow50: scan.audit.coverage.below50,
      sessionsBelow90: scan.audit.coverage.below90,
      anomalies: report.anomalies,
      errors: report.errors
    });
    log(
      `${symbol}: ${loaded.sessions.length} sessions, ${loaded.report.splitAdjustments.length} split(s) adjusted, ${scanned.gaps.length} gaps ≥ ${pct(gapThreshold, 0)}`
    );
  }

  for (const gap of gaps) {
    gap.filesMovingFourPercent = moveByDate.get(gap.date) ?? 0;
    gap.classification = gap.filesMovingFourPercent >= marketWide ? 'market-wide' : 'idiosyncratic';
  }

  const splitChecks = [];

  for (const split of splits) {
    splitChecks.push(await checkSplit(split, config));
  }

  const record = {
    generatedAt: new Date().toISOString(),
    partitionsFile: config.file,
    partitionsSha256: config.sha256,
    splitsFile: 'config/market-events/splits.json',
    thresholds: { gapThreshold, concurrentMove, marketWide, minuteJump, volumeWindow, volumeShift, referenceLookback },
    coverage,
    splits: splitChecks,
    gaps,
    jumps,
    volumeShifts,
    liquidity
  };
  const dir = stageDir('audit');

  await writeJson(path.join(dir, 'audit.json'), record);
  await writeText(path.join(dir, 'AUDIT_TABLES.md'), auditTables(record));
  log(
    `audit: ${coverage.length} files, ${splitChecks.length} splits, ${gaps.length} overnight gaps ≥ ${pct(gapThreshold, 0)} (${gaps.filter((gap) => gap.classification === 'idiosyncratic').length} idiosyncratic), ${jumps.length} minute jumps, ${volumeShifts.length} volume shifts → ${dir}`
  );

  return record;
};

type AuditRecord = Awaited<ReturnType<typeof runAudit>>;

const money = (value: number) => `$${(value / 1e6).toFixed(1)}M`;

export function auditTables(record: Omit<AuditRecord, never>) {
  const lines = [
    `# Audit tables (generated ${record.generatedAt})`,
    '',
    `data/partitions.json sha256 \`${record.partitionsSha256}\`. Integrity facts only: no strategy result on any window.`,
    '',
    '## Coverage (npm run datasets -- verify)',
    '',
    '| Symbol | Status | Rows | training / holdout / final rows | Every row once | Sessions (expected) | Missing | On closed days | Sparse (<50%) | Malformed / order / dup | First → last | sha256 |',
    '|---|---|---:|---|---|---|---:|---:|---:|---|---|---|',
    ...record.coverage.map(
      (row) =>
        `| ${row.symbol} | ${row.status} | ${row.rows.toLocaleString('en-US')} | ${['training', 'holdout', 'final'].map((name) => row.partitions[name]!.rows.toLocaleString('en-US')).join(' / ')} | ${row.everyRowOncePartitioned ? 'yes' : 'NO'} | ${row.sessionsWithRegularBars} (${row.expectedSessions}) | ${row.missingSessions.length} | ${row.sessionsOnClosedDays.length} | ${row.sparseSessionsBelow50} | ${row.malformed} / ${row.outOfOrder} / ${row.duplicates} | ${row.firstDate} → ${row.lastDate} | \`${row.sha256.slice(0, 16)}…\` |`
    ),
    '',
    '## Recorded splits before and after the forward adjustment',
    '',
    '| Symbol | Effective | Ratio | Partition | Raw close → open | Raw overnight | Adjusted overnight | Depth below 74-session high, raw → adjusted | Median minute volume before / after raw / after adjusted | Median daily $ volume before / after | Factor (expected) |',
    '|---|---|---:|---|---|---:|---:|---|---|---|---|',
    ...record.splits.map(
      (row) =>
        `| ${row.symbol} | ${row.effectiveDate} | ${row.ratio} | ${row.partition} | ${row.previousClose} → ${row.rawOpen} | ${pct(row.rawOvernight, 2)} | ${pct(row.adjustedOvernight, 2)} | ${pct(row.rawDepthBelow74High)} → ${pct(row.adjustedDepthBelow74High)} | ${Math.round(row.medianMinuteVolumeBefore)} / ${Math.round(row.medianMinuteVolumeAfterRaw)} / ${Math.round(row.medianMinuteVolumeAfterAdjusted)} | ${money(row.dollarVolumeBefore)} / ${money(row.dollarVolumeAfter)} | ${row.adjustmentFactor.toPrecision(6)} (${row.expectedFactor}) |`
    ),
    '',
    `## Overnight moves ≥ ${pct(record.thresholds.gapThreshold, 0)} of the split-adjusted series`,
    '',
    `Market-wide: at least ${record.thresholds.marketWide} of the 16 files moved ≥ ${pct(record.thresholds.concurrentMove, 0)} overnight the same night.`,
    '',
    '| Symbol | Date | Partition | Prev close → open | Overnight | Close to close | Files moving ≥ 4% | Class |',
    '|---|---|---|---|---:|---:|---:|---|',
    ...record.gaps.map(
      (row) =>
        `| ${row.symbol} | ${row.date} | ${row.partition} | ${row.previousClose.toFixed(4)} → ${row.open.toFixed(4)} | ${pct(row.move, 2)} | ${pct(row.closeToClose, 2)} | ${row.filesMovingFourPercent} | ${row.classification} |`
    ),
    '',
    `## Single-minute moves ≥ ${pct(record.thresholds.minuteJump, 0)} (regular session)`,
    '',
    '| Symbol | Date | Partition | Time (UTC) | From → to | Change |',
    '|---|---|---|---|---|---:|',
    ...record.jumps.map(
      (row) =>
        `| ${row.symbol} | ${row.date} | ${row.partition} | ${row.time} | ${row.from} → ${row.to} | ${pct(row.change, 2)} |`
    ),
    '',
    `## Shifts of the median daily volume (${record.thresholds.volumeWindow} sessions after ÷ before, ≥ ${record.thresholds.volumeShift}× or ≤ 1/${record.thresholds.volumeShift})`,
    '',
    '| Symbol | Most extreme date | Flagged run | Partition | Ratio |',
    '|---|---|---|---|---:|',
    ...record.volumeShifts.map(
      (row) =>
        `| ${row.symbol} | ${row.date} | ${row.firstDate} → ${row.lastDate} | ${row.partition} | ${row.ratio.toFixed(2)} |`
    ),
    '',
    '## Liquidity per partition',
    '',
    '| Symbol | Partition | Sessions | Median regular bars | Median daily $ volume | Median close (run units) |',
    '|---|---|---:|---:|---:|---:|',
    ...record.liquidity.map(
      (row) =>
        `| ${row.symbol} | ${row.partition} | ${row.sessions} | ${row.medianBarsPerSession} | ${money(row.medianDailyDollarVolume)} | ${row.medianClose.toFixed(2)} |`
    )
  ];

  return lines.join('\n');
}

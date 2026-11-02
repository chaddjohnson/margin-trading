// S0 (PROTOCOL.md §5): the data and universe audit of the refreshed files, and the physically truncated training
// projection that every later stage reads. No strategy runs here and no P&L, return or ranking is computed.
//
//   audit      every data/<SYMBOL>/data.csv (64 files): the d1-robust D1–D5 rules re-dated to this refresh, plus
//              quality measures (sparse sessions by year, stale and zero-volume bars, first regular bar at 09:30 New
//              York, early-close and extended-hours bars, liquidity, $100k lot size against minute volume). Price
//              moves are listed for the training window only; after 2024 only counts and structure are reported.
//   project    data/vintages/study9-train-2024/<SYMBOL>/data.csv = the canonical file's exact bytes through the last
//              row of New York date 2024-12-31 (a byte prefix, verified by hash), read-only, plus partitions.json.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import {
  canonicalDataFile,
  groupMarketSessions,
  loadCsvMinuteBacktestData,
  nyseEarlyCloses,
  nyseHolidays,
  readSplits,
  unexplainedSplitGaps
} from '#lib';
import { newYorkDateAndMinute } from '../data-partition/scan.ts';
import { structure } from '../d1-robust/audit.ts';
import { median, quantile } from '../d1-robust/stats.ts';
import {
  canonicalRoot,
  clusterOf,
  latestCompleteSession,
  nowIso,
  priorVintageRoot,
  projectionRoot,
  resultFile,
  s0Rules,
  trainEnd,
  universeRegistry
} from './context.ts';

const sha256Of = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

export const canonicalUniverse = async (): Promise<{ eligible: string[]; late: string[]; excluded: string[] }> => {
  const registry = (await fs.readJson(universeRegistry)) as { eligible: string[]; late: string[]; excluded: string[] };

  return { eligible: registry.eligible, late: registry.late, excluded: registry.excluded };
};

interface Session {
  date: string;
  open: number;
  close: number;
  bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[];
}

const scheduledMinutes = (date: string, earlyCloses: ReadonlySet<string>) => (earlyCloses.has(date) ? 210 : 390);

export interface SymbolAudit {
  symbol: string;
  canonical: boolean;
  cluster: string;
  structure: { kind: string; excluded: boolean; note: string } | null;
  file: { sha256: string; bytes: number; rows: number };
  priorVintage: { sha256: string; bytes: number; prefixMatches: boolean } | null;
  datasetReport: { status: string; sha256Matches: boolean };
  firstSession: string;
  lastSession: string;
  lastBarNewYork: string;
  sessions: number;
  expectedSessions: number;
  missingSessions: string[];
  sessionsOnClosedDays: string[];
  newSessionsInRefresh: number;
  coverageMedianTraining: number;
  coverageMedianAll: number;
  sparseByYear: Record<string, number>;
  sparsePost2024: number;
  firstBarAt0930Share: number; // regular sessions whose first regular bar is 09:30 New York
  flatBarShareTraining: number; // regular bars with open = high = low = close
  zeroVolumeBars: number;
  staleSessionsTraining: number; // ≥ 30 regular bars and a single distinct close
  extendedHoursBars: number;
  earlyCloseLateBarDays: number;
  medianDollarVolumeTraining: number;
  p10DollarVolumeTraining: number;
  medianDollarVolumePost2024: number;
  medianBarsPerSessionTraining: number;
  lotShareOfMedianMinuteDollarVolume: number; // $100,000 ÷ the training median per-bar dollar volume
  splitsRegistered: { effectiveDate: string; ratio: number }[];
  unexplainedSplitSizedTraining: { date: string; ratio: number }[];
  unexplainedSplitSizedPost2024: number; // count only
  movesBeyond15Training: { date: string; ratio: number }[];
  rules: Record<'D1' | 'D2' | 'D3' | 'D4' | 'D5', boolean>;
  eligible: boolean;
  reasons: string[];
  quality: 'good' | 'thin' | 'sparse';
}

export const auditSymbol = async (symbol: string, canonicalSet: ReadonlySet<string>): Promise<SymbolAudit> => {
  const file = canonicalDataFile(symbol, canonicalRoot);
  const bytes = await fs.readFile(file);
  const reportFile = path.join(canonicalRoot, symbol, 'dataset-report.json');
  const report = (await fs.readJson(reportFile)) as {
    status: string;
    after?: { sha256: string };
    scan: {
      audit: {
        expectedSessions: number;
        missingSessions: string[];
        sessionsOnClosedDays: string[];
        extendedHoursBars: number;
        earlyCloseLateBars: { date: string; bars: number }[];
      };
    };
  };
  const sha256 = sha256Of(bytes);
  const priorFile = path.join(priorVintageRoot, symbol, 'data.csv');
  let priorVintage: SymbolAudit['priorVintage'] = null;

  if (await fs.pathExists(priorFile)) {
    const prior = await fs.readFile(priorFile);

    priorVintage = {
      sha256: sha256Of(prior),
      bytes: prior.length,
      prefixMatches: bytes.length >= prior.length && sha256Of(bytes.subarray(0, prior.length)) === sha256Of(prior)
    };
  }

  const sessions = groupMarketSessions(await loadCsvMinuteBacktestData(symbol, file)) as unknown as Session[];
  const splits = readSplits();
  const training = sessions.filter((s) => s.date <= trainEnd);
  const post = sessions.filter((s) => s.date > trainEnd);
  const coverage = (s: Session) => s.bars.length / scheduledMinutes(s.date, nyseEarlyCloses);
  const dollar = (s: Session) => s.bars.reduce((total, bar) => total + bar.close * bar.volume, 0);
  const sparseByYear: Record<string, number> = {};

  for (const s of training) {
    if (coverage(s) < s0Rules.sparseCoverage)
      sparseByYear[s.date.slice(0, 4)] = (sparseByYear[s.date.slice(0, 4)] ?? 0) + 1;
  }

  let flat = 0;
  let trainingBars = 0;
  let zeroVolume = 0;
  let stale = 0;
  let firstAt0930 = 0;
  const barDollars: number[] = [];

  for (const s of sessions) {
    const first = s.bars[0];

    if (first && newYorkDateAndMinute(first.time).minute === 9 * 60 + 30) firstAt0930++;

    for (const bar of s.bars) {
      if (bar.volume === 0) zeroVolume++;
    }

    if (s.date <= trainEnd) {
      const closes = new Set<number>();

      for (const bar of s.bars) {
        trainingBars++;
        if (bar.open === bar.high && bar.high === bar.low && bar.low === bar.close) flat++;
        closes.add(bar.close);
        barDollars.push(bar.close * bar.volume);
      }

      if (s.bars.length >= 30 && closes.size === 1) stale++;
    }
  }

  const allGaps = unexplainedSplitGaps(sessions as never, symbol, splits, s0Rules.splitSizedMove);
  const trainingGaps = allGaps.filter((gap) => gap.date <= trainEnd);
  const moves15 = unexplainedSplitGaps(training as never, symbol, splits, s0Rules.auditMove);
  const dollars = training.map(dollar);
  const audit = report.scan.audit;
  const lastSession = sessions.at(-1)?.date ?? '';
  const lastBar = sessions.at(-1)?.bars.at(-1);
  const record: SymbolAudit = {
    symbol,
    canonical: canonicalSet.has(symbol),
    cluster: clusterOf(symbol),
    structure: structure[symbol]
      ? { kind: structure[symbol]!.kind, excluded: structure[symbol]!.excluded, note: structure[symbol]!.note }
      : null,
    file: { sha256, bytes: bytes.length, rows: bytes.toString('latin1').split('\n').filter(Boolean).length },
    priorVintage,
    datasetReport: { status: report.status, sha256Matches: report.after?.sha256 === sha256 },
    firstSession: sessions[0]?.date ?? '',
    lastSession,
    lastBarNewYork: lastBar
      ? `${newYorkDateAndMinute(lastBar.time).date} ${String(Math.floor(newYorkDateAndMinute(lastBar.time).minute / 60)).padStart(2, '0')}:${String(newYorkDateAndMinute(lastBar.time).minute % 60).padStart(2, '0')}`
      : '',
    sessions: sessions.length,
    expectedSessions: audit.expectedSessions,
    missingSessions: audit.missingSessions,
    sessionsOnClosedDays: audit.sessionsOnClosedDays,
    newSessionsInRefresh: 0,
    coverageMedianTraining: median(training.map(coverage)),
    coverageMedianAll: median(sessions.map(coverage)),
    sparseByYear,
    sparsePost2024: post.filter((s) => coverage(s) < s0Rules.sparseCoverage).length,
    firstBarAt0930Share: sessions.length ? firstAt0930 / sessions.length : NaN,
    flatBarShareTraining: trainingBars ? flat / trainingBars : NaN,
    zeroVolumeBars: zeroVolume,
    staleSessionsTraining: stale,
    extendedHoursBars: audit.extendedHoursBars,
    earlyCloseLateBarDays: audit.earlyCloseLateBars.length,
    medianDollarVolumeTraining: median(dollars),
    p10DollarVolumeTraining: quantile(dollars, 0.1),
    medianDollarVolumePost2024: median(post.map(dollar)),
    medianBarsPerSessionTraining: median(training.map((s) => s.bars.length)),
    lotShareOfMedianMinuteDollarVolume: 100000 / median(barDollars),
    splitsRegistered: splits
      .filter((split) => split.symbol === symbol)
      .map((split) => ({ effectiveDate: split.effectiveDate, ratio: split.ratio })),
    unexplainedSplitSizedTraining: trainingGaps.map((gap) => ({ date: gap.date, ratio: gap.ratio })),
    unexplainedSplitSizedPost2024: allGaps.length - trainingGaps.length,
    movesBeyond15Training: moves15.map((gap) => ({ date: gap.date, ratio: gap.ratio })),
    rules: { D1: false, D2: false, D3: false, D4: false, D5: false },
    eligible: false,
    reasons: [],
    quality: 'good'
  };

  record.rules.D1 =
    record.firstSession === s0Rules.expectedFirstDate &&
    record.lastSession === s0Rules.expectedLastDate &&
    audit.missingSessions.length === 0 &&
    audit.sessionsOnClosedDays.length === 0;
  record.rules.D2 = report.status === 'verified' && record.datasetReport.sha256Matches;
  record.rules.D3 = allGaps.length === 0;
  record.rules.D4 = record.structure !== null && !record.structure.excluded;
  record.rules.D5 =
    record.medianDollarVolumeTraining >= s0Rules.minimumMedianDollarVolume &&
    record.coverageMedianTraining >= s0Rules.minimumMedianCoverage;

  if (!record.rules.D1)
    record.reasons.push(
      `D1: ${record.firstSession} → ${record.lastSession}, ${audit.missingSessions.length} missing (${audit.missingSessions.slice(0, 4).join(', ')})`
    );
  if (!record.rules.D2) record.reasons.push(`D2: dataset report ${report.status}`);
  if (!record.rules.D3)
    record.reasons.push(
      `D3: ${trainingGaps.length} unexplained split-sized moves to 2024, ${record.unexplainedSplitSizedPost2024} after`
    );
  if (!record.rules.D4) record.reasons.push(`D4: ${record.structure?.kind ?? 'unclassified'}`);
  if (!record.rules.D5)
    record.reasons.push(
      `D5: median $${(record.medianDollarVolumeTraining / 1e6).toFixed(1)}M, coverage ${(100 * record.coverageMedianTraining).toFixed(1)}%`
    );
  if (priorVintage && !priorVintage.prefixMatches) record.reasons.push('the refresh changed the prior vintage bytes');
  if (!record.canonical) record.reasons.push('not in the canonical 61 (universe.json)');

  record.eligible = record.canonical && Object.values(record.rules).every(Boolean) && record.reasons.length === 0;
  const sparseTraining = Object.values(sparseByYear).reduce((a, b) => a + b, 0);

  record.quality =
    record.coverageMedianTraining < 0.75 || sparseTraining > 400
      ? 'sparse'
      : record.medianDollarVolumeTraining < 50e6
        ? 'thin'
        : 'good';

  return record;
};

export const runAudit = async () => {
  const universe = await canonicalUniverse();
  const canonicalSet = new Set(universe.eligible);
  const symbols = (await fs.readdir(canonicalRoot))
    .filter((name) => /^[A-Z]+$/.test(name) && fs.existsSync(path.join(canonicalRoot, name, 'data.csv')))
    .sort();
  const prior = (await fs.readJson(path.join(priorVintageRoot, 'inventory-pre-refresh.json'))) as {
    files: Record<string, { lastRow: string }>;
  };
  const records: SymbolAudit[] = [];

  for (const symbol of symbols) {
    const record = await auditSymbol(symbol, canonicalSet);
    const priorLast = prior.files[symbol]?.lastRow.slice(1, 11) ?? '';
    let added = 0;

    for (let t = Date.parse(priorLast) + 86400000; t <= Date.parse(record.lastSession); t += 86400000) {
      const date = new Date(t).toISOString().slice(0, 10);
      const day = new Date(t).getUTCDay();

      if (day !== 0 && day !== 6 && !nyseHolidays.has(date)) added++;
    }

    record.newSessionsInRefresh = added;
    records.push(record);
    console.info(
      `${symbol.padEnd(5)} ${record.eligible ? 'eligible' : 'NOT ELIGIBLE'} ${record.firstSession}→${record.lastSession} +${added} sessions; ${record.reasons.join('; ')}`
    );
  }

  const out = {
    at: nowIso(),
    latestCompleteSession,
    rules: s0Rules,
    universeRegistry: { file: universeRegistry, sha256: sha256Of(await fs.readFile(universeRegistry)) },
    canonical: universe,
    eligible: records.filter((r) => r.eligible).map((r) => r.symbol),
    notEligible: records.filter((r) => !r.eligible).map((r) => ({ symbol: r.symbol, reasons: r.reasons })),
    records
  };

  await fs.outputJson(resultFile('s0', 'symbols.json'), out, { spaces: 1 });
  console.info(`\n${out.eligible.length} eligible of ${records.length}; → ${resultFile('s0', 'symbols.json')}`);

  return out;
};

// The byte length of the prefix of `text` holding every row whose New York date is ≤ `end` (rows are ascending).
export const prefixLengthThrough = (bytes: Buffer, end: string) => {
  let offset = 0;
  let last = '';

  while (offset < bytes.length) {
    const newline = bytes.indexOf(10, offset);
    const stop = newline < 0 ? bytes.length : newline + 1;
    const line = bytes.subarray(offset, stop).toString('latin1');
    const time = Date.parse(line.slice(1, line.indexOf('"', 1))) / 1000;
    const date = newYorkDateAndMinute(time).date;

    if (date > end) return { bytes: offset, lastRow: last.trimEnd(), nextDate: date };

    last = line;
    offset = stop;
  }

  return { bytes: offset, lastRow: last.trimEnd(), nextDate: null as string | null };
};

export const runProjection = async (symbols: readonly string[]) => {
  if (await fs.pathExists(projectionRoot)) throw new Error(`${projectionRoot} exists; the projection is write-once`);

  await fs.ensureDir(projectionRoot);
  await fs.copyFile(path.join(canonicalRoot, 'partitions.json'), path.join(projectionRoot, 'partitions.json'));

  const files: Record<string, unknown> = {};

  for (const symbol of symbols) {
    const source = canonicalDataFile(symbol, canonicalRoot);
    const bytes = await fs.readFile(source);
    const cut = prefixLengthThrough(bytes, trainEnd);
    const prefix = bytes.subarray(0, cut.bytes);
    const target = path.join(projectionRoot, symbol, 'data.csv');

    if (!cut.nextDate || cut.nextDate < '2025-01-02') throw new Error(`${symbol}: no row after ${trainEnd}`);
    if (!cut.lastRow.length) throw new Error(`${symbol}: empty projection`);

    await fs.outputFile(target, prefix, { flag: 'wx' });

    const written = await fs.readFile(target);

    if (sha256Of(written) !== sha256Of(prefix) || !bytes.subarray(0, written.length).equals(written)) {
      throw new Error(`${symbol}: the projection is not a byte prefix of the canonical file`);
    }

    await fs.chmod(target, 0o444);
    files[symbol] = {
      sha256: sha256Of(written),
      bytes: written.length,
      rows: written.toString('latin1').split('\n').filter(Boolean).length,
      lastRow: cut.lastRow,
      nextCanonicalDate: cut.nextDate,
      canonicalSha256: sha256Of(bytes),
      canonicalBytes: bytes.length
    };
    console.info(`${symbol}: ${written.length} bytes through ${trainEnd} (next canonical row ${cut.nextDate})`);
  }

  const manifest = {
    at: nowIso(),
    root: projectionRoot,
    end: trainEnd,
    partitionsSha256: sha256Of(await fs.readFile(path.join(projectionRoot, 'partitions.json'))),
    files
  };

  await fs.outputJson(resultFile('s0', 'projection.json'), manifest, { spaces: 1 });
  await fs.outputJson(path.join(projectionRoot, 'projection.json'), manifest, { spaces: 1 });

  return manifest;
};

// `npm run robust-d1 -- audit` (PROTOCOL.md §3.4): the eligibility audit of every candidate symbol — the 16 existing
// datasets and the ingested Tier 1/Tier 2 symbols — under ONE set of integrity and tradability rules, from the
// verified canonical files only (no strategy is run, no P&L is computed):
//
//   D1 history          first regular-session bar on the 2016-01-04 session, a bar on every NYSE session to 2026-10-13
//   D2 integrity        `datasets -- verify` status verified (read from dataset-report.json, re-run by the caller)
//   D3 corporate action no split-sized (30%) overnight move without a registered split; moves beyond ±15% listed
//   D4 structure        the predeclared structural classification below (leveraged/inverse/VIX/single-commodity
//                       futures/ETN, or an objective or asset-class change inside the window, excludes)
//   D5 tradability      training median regular-session daily dollar volume ≥ $10M; median minute coverage ≥ 25%
//
// The result is results/audit/universe.json, frozen with the protocol.
import path from 'node:path';
import fs from 'fs-extra';
import {
  canonicalDataFile,
  groupMarketSessions,
  loadCsvMinuteBacktestData,
  readSplits,
  unexplainedSplitGaps
} from '#lib';
import { sha256File } from '../portfolio-aware-d1/freeze.ts';
import {
  categoryOf,
  candidateUniverse,
  existingSymbols,
  log,
  nowIso,
  protocolFreezeFile,
  stageDir,
  study,
  tier1Symbols,
  tier2Symbols,
  universeFile,
  vanguardIssued,
  writeJson
} from './context.ts';
import { median, quantile } from './stats.ts';

// D4: the structural classification, declared before the audit for every candidate (issuer fund descriptions; not an
// exhaustive review of every index-methodology document — a limitation stated in the audit report).
export const structure: Record<string, { kind: string; issuer: string; excluded: boolean; note: string }> = {
  ...Object.fromEntries(
    candidateUniverse.map((symbol) => [
      symbol,
      { kind: 'index equity ETF', issuer: '', excluded: false, note: 'unleveraged, long-only, physically replicated' }
    ])
  ),
  TLT: { kind: 'Treasury bond ETF', issuer: 'iShares', excluded: false, note: 'unleveraged; monthly distributions' },
  IEF: { kind: 'Treasury bond ETF', issuer: 'iShares', excluded: false, note: 'unleveraged; monthly distributions' },
  SHY: { kind: 'Treasury bond ETF', issuer: 'iShares', excluded: false, note: 'unleveraged; monthly distributions' },
  EDV: {
    kind: 'Treasury STRIPS ETF',
    issuer: 'Vanguard',
    excluded: false,
    note: 'unleveraged; quarterly distributions'
  },
  TIP: { kind: 'TIPS ETF', issuer: 'iShares', excluded: false, note: 'unleveraged; inflation-linked' },
  AGG: { kind: 'aggregate bond ETF', issuer: 'iShares', excluded: false, note: 'unleveraged; monthly distributions' },
  LQD: { kind: 'corporate bond ETF', issuer: 'iShares', excluded: false, note: 'unleveraged; monthly distributions' },
  HYG: { kind: 'high-yield bond ETF', issuer: 'iShares', excluded: false, note: 'unleveraged; monthly distributions' },
  EMB: {
    kind: 'EM sovereign bond ETF',
    issuer: 'iShares',
    excluded: false,
    note: 'unleveraged; monthly distributions'
  },
  GLD: { kind: 'physical gold trust', issuer: 'SPDR', excluded: false, note: 'grantor trust; no distributions' },
  IAU: { kind: 'physical gold trust', issuer: 'iShares', excluded: false, note: 'grantor trust; no distributions' },
  SLV: { kind: 'physical silver trust', issuer: 'iShares', excluded: false, note: 'grantor trust; no distributions' },
  DBC: {
    kind: 'diversified commodity futures fund',
    issuer: 'Invesco',
    excluded: false,
    note: 'multi-commodity futures with an optimum-yield roll; not single-commodity (kept under PROTOCOL D4 with the roll-yield caveat)'
  }
};

const regularDollarVolume = (session: { bars: { close: number; volume: number }[] }) =>
  session.bars.reduce((total, bar) => total + bar.close * bar.volume, 0);

const tierOf = (symbol: string) =>
  (existingSymbols as readonly string[]).includes(symbol)
    ? 'existing'
    : (tier1Symbols as readonly string[]).includes(symbol)
      ? 'tier1'
      : (tier2Symbols as readonly string[]).includes(symbol)
        ? 'tier2'
        : 'none';

export interface SymbolAudit {
  symbol: string;
  tier: string;
  category: string;
  source: string;
  present: boolean;
  status: string;
  firstDate: string;
  lastDate: string;
  sessions: number;
  expectedSessions: number;
  missingSessions: number;
  sessionsOnClosedDays: number;
  rows: number;
  dataSha256: string;
  reportSha256: string;
  coverageMedian: number;
  trainingMedianDollarVolume: number;
  trainingP10DollarVolume: number;
  trainingMedianBarsPerSession: number;
  trainingMedianSharesPerBar: number;
  splitsRegistered: { effectiveDate: string; ratio: number }[];
  unexplainedSplitGaps: { date: string; ratio: number }[];
  overnightMovesBeyond15: { date: string; ratio: number }[];
  structure: (typeof structure)[string];
  vanguardIssued: boolean;
  rules: Record<'D1' | 'D2' | 'D3' | 'D4' | 'D5', boolean>;
  eligible: boolean;
  cohort: 'eligible' | 'late' | 'excluded' | 'not ingested';
  reasons: string[];
}

export const auditSymbol = async (symbol: string, dataDir = 'data'): Promise<SymbolAudit> => {
  const file = canonicalDataFile(symbol, dataDir);
  const reportFile = path.join(dataDir, symbol, 'dataset-report.json');
  const base: SymbolAudit = {
    symbol,
    tier: tierOf(symbol),
    category: categoryOf[symbol] ?? 'none',
    source: 'Alpaca v2 stocks bars, 1Min, SIP feed, adjustment=raw (scripts/download.sh)',
    present: false,
    status: 'missing',
    firstDate: '',
    lastDate: '',
    sessions: 0,
    expectedSessions: 0,
    missingSessions: 0,
    sessionsOnClosedDays: 0,
    rows: 0,
    dataSha256: '',
    reportSha256: '',
    coverageMedian: NaN,
    trainingMedianDollarVolume: NaN,
    trainingP10DollarVolume: NaN,
    trainingMedianBarsPerSession: NaN,
    trainingMedianSharesPerBar: NaN,
    splitsRegistered: [],
    unexplainedSplitGaps: [],
    overnightMovesBeyond15: [],
    structure: structure[symbol]!,
    vanguardIssued: (vanguardIssued as readonly string[]).includes(symbol),
    rules: { D1: false, D2: false, D3: false, D4: false, D5: false },
    eligible: false,
    cohort: 'not ingested',
    reasons: []
  };

  if (!(await fs.pathExists(file)) || !(await fs.pathExists(reportFile))) {
    return { ...base, reasons: ['no verified canonical file (see INGESTION_RUNS.md)'] };
  }

  const report = (await fs.readJson(reportFile)) as {
    status: string;
    after: { rows: number; sha256: string };
    scan: {
      audit: {
        firstDate: string;
        lastDate: string;
        expectedSessions: number;
        sessionsWithRegularBars: number;
        missingSessions: string[];
        sessionsOnClosedDays: string[];
        coverage: { median: number };
      };
    };
  };
  const audit = report.scan.audit;
  const sessions = groupMarketSessions(await loadCsvMinuteBacktestData(symbol, file));
  const splits = readSplits();
  const training = sessions.filter(
    (session) => session.date >= study.firstSession && session.date <= study.trainingEnd
  );
  const dollarVolumes = training.map(regularDollarVolume);
  const record: SymbolAudit = {
    ...base,
    present: true,
    status: report.status,
    firstDate: sessions[0]?.date ?? '',
    lastDate: sessions.at(-1)?.date ?? '',
    sessions: sessions.length,
    expectedSessions: audit.expectedSessions,
    missingSessions: audit.missingSessions.length,
    sessionsOnClosedDays: audit.sessionsOnClosedDays.length,
    rows: report.after.rows,
    dataSha256: await sha256File(file),
    reportSha256: await sha256File(reportFile),
    coverageMedian: audit.coverage.median,
    trainingMedianDollarVolume: median(dollarVolumes),
    trainingP10DollarVolume: quantile(dollarVolumes, 0.1),
    trainingMedianBarsPerSession: median(training.map((session) => session.bars.length)),
    trainingMedianSharesPerBar: median(training.flatMap((session) => session.bars.map((bar) => bar.volume))),
    splitsRegistered: splits
      .filter((split) => split.symbol === symbol)
      .map((split) => ({ effectiveDate: split.effectiveDate, ratio: split.ratio })),
    unexplainedSplitGaps: unexplainedSplitGaps(sessions, symbol, splits).map((gap) => ({
      date: gap.date,
      ratio: gap.ratio
    })),
    overnightMovesBeyond15: unexplainedSplitGaps(sessions, symbol, splits, study.eligibility.auditGapThreshold).map(
      (gap) => ({ date: gap.date, ratio: gap.ratio })
    )
  };

  if (report.after.sha256 !== record.dataSha256) {
    record.reasons.push('the canonical file does not hash to its verified report');
  }

  const { expectedFirstDate, expectedLastDate, minimumMedianDollarVolume, minimumMedianCoverage } = study.eligibility;

  record.rules.D1 =
    record.firstDate === expectedFirstDate &&
    record.lastDate === expectedLastDate &&
    audit.missingSessions.length === 0 &&
    audit.sessionsOnClosedDays.length === 0;
  record.rules.D2 = report.status === 'verified' && report.after.sha256 === record.dataSha256;
  record.rules.D3 = record.unexplainedSplitGaps.length === 0;
  record.rules.D4 = !record.structure.excluded;
  record.rules.D5 =
    record.trainingMedianDollarVolume >= minimumMedianDollarVolume && record.coverageMedian >= minimumMedianCoverage;

  if (!record.rules.D1) {
    record.reasons.push(
      `D1: first ${record.firstDate}, last ${record.lastDate}, ${audit.missingSessions.length} missing sessions${
        audit.missingSessions.length ? ` (${audit.missingSessions.slice(0, 5).join(', ')})` : ''
      }`
    );
  }

  if (!record.rules.D2) {
    record.reasons.push(`D2: datasets verify status ${report.status}`);
  }

  if (!record.rules.D3) {
    record.reasons.push(
      `D3: unexplained split-sized moves ${record.unexplainedSplitGaps.map((gap) => `${gap.date} ×${gap.ratio.toFixed(4)}`).join(', ')}`
    );
  }

  if (!record.rules.D4) {
    record.reasons.push(`D4: ${record.structure.kind} (${record.structure.note})`);
  }

  if (!record.rules.D5) {
    record.reasons.push(
      `D5: median daily dollar volume $${(record.trainingMedianDollarVolume / 1e6).toFixed(1)}M, median minute coverage ${(100 * record.coverageMedian).toFixed(1)}%`
    );
  }

  record.eligible = Object.values(record.rules).every(Boolean) && record.reasons.length === 0;
  record.cohort = record.eligible
    ? 'eligible'
    : !record.rules.D1 && record.firstDate > expectedFirstDate && record.rules.D2 && record.rules.D3 && record.rules.D4
      ? 'late'
      : 'excluded';

  return record;
};

export const runAudit = async () => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: this record is frozen and is never rewritten`);
  }

  const records: SymbolAudit[] = [];

  for (const symbol of candidateUniverse) {
    const started = Date.now();
    const record = await auditSymbol(symbol);

    records.push(record);
    log(
      `audit ${symbol}: ${record.cohort}${record.reasons.length ? ` — ${record.reasons.join('; ')}` : ''} (${((Date.now() - started) / 1000).toFixed(1)} s)`
    );
  }

  const eligible = records.filter((record) => record.eligible).map((record) => record.symbol);
  const sessionCounts = new Set(records.filter((record) => record.eligible).map((record) => record.sessions));

  if (sessionCounts.size > 1) {
    throw new Error(`Eligible symbols have different session counts: ${[...sessionCounts].join(', ')}`);
  }

  await writeJson(universeFile, {
    generatedAt: nowIso(),
    rules: study.eligibility,
    calendar: {
      first: study.eligibility.expectedFirstDate,
      last: study.eligibility.expectedLastDate,
      sessions: [...sessionCounts][0]
    },
    eligible,
    late: records.filter((record) => record.cohort === 'late').map((record) => record.symbol),
    excluded: records.filter((record) => record.cohort === 'excluded').map((record) => record.symbol),
    notIngested: records.filter((record) => record.cohort === 'not ingested').map((record) => record.symbol),
    byCategory: Object.fromEntries(
      [...new Set(records.map((record) => record.category))].map((category) => [
        category,
        records.filter((record) => record.category === category && record.eligible).map((record) => record.symbol)
      ])
    ),
    symbols: Object.fromEntries(records.map((record) => [record.symbol, record]))
  });
  log(`audit: ${eligible.length} eligible of ${records.length} candidates → ${universeFile}`);

  return records;
};

export const auditDir = stageDir('audit');

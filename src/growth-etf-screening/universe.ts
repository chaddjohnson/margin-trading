// The universe and data audit (PROTOCOL.md §3; brief "Universe and data audit"). Written BEFORE any performance
// screening: no strategy is run here, no return is ranked.
//
// INVENTORY. Every directory data/<SYMBOL>/ holding a canonical data.csv with its dataset report (64 at the brief's
// preparation). BTCUSDT and non-symbol directories are outside the study.
//
// ELIGIBILITY (frozen; Study 9 S0's rules D1–D5, research/study9-etf-pool-discovery/DATA_AND_UNIVERSE_AUDIT.md §3,
// re-checked on today's files, which are byte-identical to the files Study 9 audited):
//   D1 history: the first regular bar on 2016-01-04 and a regular bar on every NYSE session through 2026-10-30 (none on a
//      closed day) — timestamps only (the dataset report's calendar audit);
//   D2 integrity: `datasets verify` status verified and the file's sha256 equal to its report;
//   D3 corporate actions: no split-sized (≥ 30%) overnight move without a registered split (Study 9's whole-file record),
//      re-checked here on the split-adjusted DEVELOPMENT sessions only (2016–2024; nothing later is read before the
//      frozen selection);
//   D4 structure: no leveraged, inverse, volatility, single-commodity-futures or ETN product (Study 9's classification);
//   D5 tradability and marks: development median regular-session daily dollar volume ≥ $10M and development median
//      minute coverage ≥ 25% (canonical intraday marks adequate for minute drawdown).
// A symbol failing any rule goes to the separate UNTESTED list with its reason. Labels "sparse" and "thin" are
// descriptive (Study 9's), never exclusions. VGT and GDX are controls, not discoveries.
import fs from 'node:fs';
import path from 'node:path';
import type { MarketSession } from '#types';
import { readSplits, unexplainedSplitGaps } from '../lib/corporateActions.ts';
import { doorManifestFile, r2, repoRoot, universeFile } from './context.ts';
import { buildSymbolDoors, canonicalFile, loadEtfSessions, splitsPin } from './doors.ts';
import { isSealed, readJson, rel, sealJson, sha256File } from './records.ts';

// The brief's inventory list (verified against data/ — a directory missing from it or an extra one is reported).
export const briefInventory =
  'AGG DBC EDV EEM EFA EMB EWJ EWW EWY EWZ FXI GDX GDXJ GLD HYG IAU IBB IEF IEMG IGV IJH IJR ILF INDA IWD IWF IWM IWN IYT KBE KIE KRE LQD MTUM OIH QUAL RSP SHY SLV SMH SPLV TIP TLT USMV VGK VGT VIG VOOG VPU XBI XHB XLB XLE XLF XLI XLK XLP XLRE XLU XLV XLY XME XOP XRT'.split(
    ' '
  );

export const controls = ['VGT', 'GDX'] as const;

// Identification labels (fund names as commonly published by their issuers; issuer and structure from the repository's
// universe records). They identify the ticker; no claim is made from them.
export const fundNames: Record<string, string> = {
  AGG: 'iShares Core U.S. Aggregate Bond ETF',
  DBC: 'Invesco DB Commodity Index Tracking Fund',
  EDV: 'Vanguard Extended Duration Treasury ETF',
  EEM: 'iShares MSCI Emerging Markets ETF',
  EFA: 'iShares MSCI EAFE ETF',
  EMB: 'iShares J.P. Morgan USD Emerging Markets Bond ETF',
  EWJ: 'iShares MSCI Japan ETF',
  EWW: 'iShares MSCI Mexico ETF',
  EWY: 'iShares MSCI South Korea ETF',
  EWZ: 'iShares MSCI Brazil ETF',
  FXI: 'iShares China Large-Cap ETF',
  GDX: 'VanEck Gold Miners ETF',
  GDXJ: 'VanEck Junior Gold Miners ETF',
  GLD: 'SPDR Gold Shares',
  HYG: 'iShares iBoxx $ High Yield Corporate Bond ETF',
  IAU: 'iShares Gold Trust',
  IBB: 'iShares Biotechnology ETF',
  IEF: 'iShares 7-10 Year Treasury Bond ETF',
  IEMG: 'iShares Core MSCI Emerging Markets ETF',
  IGV: 'iShares Expanded Tech-Software Sector ETF',
  IJH: 'iShares Core S&P Mid-Cap ETF',
  IJR: 'iShares Core S&P Small-Cap ETF',
  ILF: 'iShares Latin America 40 ETF',
  INDA: 'iShares MSCI India ETF',
  IWD: 'iShares Russell 1000 Value ETF',
  IWF: 'iShares Russell 1000 Growth ETF',
  IWM: 'iShares Russell 2000 ETF',
  IWN: 'iShares Russell 2000 Value ETF',
  IYT: 'iShares U.S. Transportation ETF',
  KBE: 'SPDR S&P Bank ETF',
  KIE: 'SPDR S&P Insurance ETF',
  KRE: 'SPDR S&P Regional Banking ETF',
  LQD: 'iShares iBoxx $ Investment Grade Corporate Bond ETF',
  MTUM: 'iShares MSCI USA Momentum Factor ETF',
  OIH: 'VanEck Oil Services ETF',
  QUAL: 'iShares MSCI USA Quality Factor ETF',
  RSP: 'Invesco S&P 500 Equal Weight ETF',
  SHY: 'iShares 1-3 Year Treasury Bond ETF',
  SLV: 'iShares Silver Trust',
  SMH: 'VanEck Semiconductor ETF',
  SPLV: 'Invesco S&P 500 Low Volatility ETF',
  TIP: 'iShares TIPS Bond ETF',
  TLT: 'iShares 20+ Year Treasury Bond ETF',
  USMV: 'iShares MSCI USA Min Vol Factor ETF',
  VGK: 'Vanguard FTSE Europe ETF',
  VGT: 'Vanguard Information Technology ETF',
  VIG: 'Vanguard Dividend Appreciation ETF',
  VOOG: 'Vanguard S&P 500 Growth ETF',
  VPU: 'Vanguard Utilities ETF',
  XBI: 'SPDR S&P Biotech ETF',
  XHB: 'SPDR S&P Homebuilders ETF',
  XLB: 'Materials Select Sector SPDR Fund',
  XLE: 'Energy Select Sector SPDR Fund',
  XLF: 'Financial Select Sector SPDR Fund',
  XLI: 'Industrial Select Sector SPDR Fund',
  XLK: 'Technology Select Sector SPDR Fund',
  XLP: 'Consumer Staples Select Sector SPDR Fund',
  XLRE: 'Real Estate Select Sector SPDR Fund',
  XLU: 'Utilities Select Sector SPDR Fund',
  XLV: 'Health Care Select Sector SPDR Fund',
  XLY: 'Consumer Discretionary Select Sector SPDR Fund',
  XME: 'SPDR S&P Metals & Mining ETF',
  XOP: 'SPDR S&P Oil & Gas Exploration & Production ETF',
  XRT: 'SPDR S&P Retail ETF'
};

// Broad asset class (descriptive).
export const assetClassOf = (cluster: string) =>
  cluster === 'rates-credit'
    ? 'bonds'
    : cluster === 'precious-metals' || cluster === 'broad-commodities'
      ? 'commodity / precious metals'
      : 'equity';

// Close substitutes and overlapping exposures (predeclared; descriptive; for the report and the shortlist's one-per-group
// rule, which uses the clusters). A pair here shares most of its exposure or index family; their results are not
// independent confirmations of each other.
export const substitutes: Record<string, string[]> = {
  GLD: ['IAU'],
  IAU: ['GLD'],
  VGT: ['XLK', 'IGV', 'SMH', 'IWF', 'VOOG'],
  XLK: ['VGT', 'IGV', 'SMH', 'IWF', 'VOOG'],
  IGV: ['VGT', 'XLK'],
  SMH: ['VGT', 'XLK'],
  IWF: ['VOOG', 'VGT', 'XLK', 'MTUM', 'QUAL'],
  VOOG: ['IWF', 'VGT', 'XLK', 'MTUM'],
  MTUM: ['IWF', 'VOOG', 'QUAL'],
  QUAL: ['MTUM', 'IWF', 'VIG'],
  EEM: ['IEMG'],
  IEMG: ['EEM'],
  IWM: ['IJR', 'IWN'],
  IJR: ['IWM', 'IWN', 'IJH'],
  IWN: ['IWM', 'IJR'],
  IJH: ['IJR', 'RSP'],
  KRE: ['KBE'],
  KBE: ['KRE', 'XLF'],
  XLF: ['KBE', 'KIE'],
  KIE: ['XLF'],
  XLE: ['XOP'],
  XOP: ['XLE'],
  TLT: ['EDV', 'IEF'],
  EDV: ['TLT'],
  IEF: ['TLT', 'AGG'],
  AGG: ['IEF', 'LQD'],
  LQD: ['AGG', 'HYG'],
  HYG: ['LQD', 'EMB'],
  SHY: ['IEF'],
  USMV: ['SPLV'],
  SPLV: ['USMV'],
  IBB: ['XBI', 'XLV'],
  XBI: ['IBB'],
  XLV: ['IBB'],
  XLU: ['VPU'],
  VPU: ['XLU'],
  EWW: ['ILF'],
  EWZ: ['ILF'],
  ILF: ['EWZ', 'EWW'],
  XME: ['XLB'],
  XLB: ['XME'],
  IWD: ['RSP', 'VIG'],
  RSP: ['IWD', 'IJH'],
  VIG: ['IWD', 'QUAL'],
  XLY: ['XRT', 'XHB'],
  XRT: ['XLY'],
  XHB: ['XLY']
};

interface Study9Record {
  symbol: string;
  canonical: boolean;
  cluster: string;
  structure: { kind: string; excluded: boolean; note?: string };
  file: { sha256: string; bytes: number; rows: number };
  firstSession: string;
  lastSession: string;
  sessions: number;
  expectedSessions: number;
  missingSessions: string[];
  sessionsOnClosedDays: string[];
  coverageMedianTraining: number;
  sparseByYear: Record<string, number>;
  sparsePost2024: number;
  zeroVolumeBars: number;
  staleSessionsTraining: number;
  medianDollarVolumeTraining: number;
  medianBarsPerSessionTraining: number;
  lotShareOfMedianMinuteDollarVolume: number;
  splitsRegistered: { effectiveDate: string; ratio: number }[];
  unexplainedSplitSizedTraining: unknown[];
  unexplainedSplitSizedPost2024: number;
  movesBeyond15Training: unknown[];
  rules: Record<'D1' | 'D2' | 'D3' | 'D4' | 'D5', boolean>;
  eligible: boolean;
  reasons: string[];
  quality: string;
}

const study9File = path.join(repoRoot, 'research/study9-etf-pool-discovery/results/s0/symbols.json');
const robustUniverseFile = path.join(repoRoot, 'research/d1-robust-pool-discovery/results/audit/universe.json');

// The research that previously examined a symbol (any family, any window): the research directories whose REPORT.md or
// README.md names it as a word. A coarse, documented heuristic; it shows exposure, not the windows examined.
export const priorExposure = (symbols: readonly string[]) => {
  const out: Record<string, string[]> = Object.fromEntries(symbols.map((s) => [s, []]));
  const root = path.join(repoRoot, 'research');

  for (const study of fs.readdirSync(root).sort()) {
    if (study === 'growth-etf-screening') continue;

    const texts = ['REPORT.md', 'README.md']
      .map((f) => path.join(root, study, f))
      .filter((f) => fs.existsSync(f))
      .map((f) => fs.readFileSync(f, 'utf8'))
      .join('\n');

    if (!texts) continue;
    for (const s of symbols) if (new RegExp(`\\b${s}\\b`).test(texts)) out[s]!.push(study);
  }
  return out;
};

// The development-only integrity scan of one ETF's split-adjusted D24 sessions (2016-01-04 → 2024-12-31).
export const developmentScan = (sessions: readonly MarketSession[], sym: string) => {
  const splits = readSplits();
  const raw = unexplainedSplitGaps(sessions, sym, []); // after adjustment, nothing may look like a split
  const overnight: { date: string; move: number }[] = [];
  let barJumps = 0;
  const barJumpDays = new Set<string>();
  let nonPositive = 0;
  let sparse = 0;
  const bars: number[] = [];
  let maxBarMove = 0;

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i]!;

    if (i > 0) {
      const m = s.open / sessions[i - 1]!.close - 1;

      if (Math.abs(m) >= 0.15) overnight.push({ date: s.date, move: Math.round(m * 1e4) / 1e4 });
    }
    bars.push(s.bars.length);
    if (s.bars.length < (s.closeTime - s.openTime) / 60 / 2) sparse++; // fewer than half its scheduled regular minutes
    for (let k = 0; k < s.bars.length; k++) {
      const b = s.bars[k]!;

      if (!(b.open > 0 && b.high > 0 && b.low > 0 && b.close > 0)) nonPositive++;
      if (k > 0) {
        const m = Math.abs(b.close / s.bars[k - 1]!.close - 1);

        maxBarMove = Math.max(maxBarMove, m);
        if (m >= 0.15) {
          barJumps++;
          barJumpDays.add(s.date);
        }
      }
    }
  }

  bars.sort((a, b) => a - b);
  return {
    sessions: sessions.length,
    unexplainedSplitSized: raw.map((g) => ({ date: g.date, ratio: Math.round(g.ratio * 1e4) / 1e4 })),
    registeredSplitsInDevelopment: splits
      .filter((x) => x.symbol === sym && x.effectiveDate > '2016-01-04' && x.effectiveDate <= '2024-12-31')
      .map((x) => ({ effectiveDate: x.effectiveDate, ratio: x.ratio })),
    overnightMovesBeyond15: overnight,
    barToBarMovesBeyond15: barJumps,
    barToBarMoveDays: [...barJumpDays],
    maxBarToBarMove: Math.round(maxBarMove * 1e4) / 1e4,
    nonPositivePrices: nonPositive,
    sessionsBelowHalfMinutes: sparse,
    medianBarsPerSession: bars[Math.floor(bars.length / 2)] ?? 0
  };
};

export interface UniverseRow {
  symbol: string;
  name: string;
  issuer: string | null;
  structure: string;
  structureNote: string | null;
  cluster: string;
  assetClass: string;
  control: boolean;
  source: string;
  file: { path: string; sha256: string; bytes: number; rows: number };
  history: {
    firstTimestamp: string;
    lastTimestamp: string;
    firstSession: string;
    lastSession: string;
    expectedSessions: number;
    sessionsWithRegularBars: number;
    missingSessions: string[];
  };
  development: {
    sessions: number;
    medianCoverage: number;
    medianDollarVolume: number;
    sparseSessions: number;
    medianBarsPerSession: number;
    lotShareOfMedianMinuteDollarVolume: number;
  } | null;
  validationCompleteByMetadata: boolean;
  quality: string;
  corporateActions: {
    development: { effectiveDate: string; ratio: number }[];
    validation: { effectiveDate: string; ratio: number }[];
  };
  priceConvention: string;
  study9: { rules: Record<string, boolean>; eligible: boolean; reasons: string[] } | null;
  rules: Record<'D1' | 'D2' | 'D3' | 'D4' | 'D5', boolean>;
  eligible: boolean;
  exclusion: string | null;
  substitutes: string[];
  priorExposure: string[];
  developmentScan: ReturnType<typeof developmentScan> | null;
}

// The universe stage: inventory → Study 9 rules re-checked on today's files → doors built and sealed for the
// rule-eligible symbols → the development-only scan (D3 on split-adjusted 2016–2024 sessions) → the sealed manifest.
export const buildUniverse = async () => {
  if (fs.existsSync(universeFile)) throw new Error(`${rel(universeFile)} exists: the universe is sealed`);

  const dirs = fs
    .readdirSync(path.join(repoRoot, 'data'))
    .filter((d) => /^[A-Z]{2,6}$/.test(d) && fs.existsSync(canonicalFile(d)))
    .sort();
  const inventory = dirs.filter((d) => d !== 'BTCUSDT');
  const s9 = readJson<{ records: Study9Record[] }>(study9File);
  const s9By = new Map(s9.records.map((r) => [r.symbol, r]));
  const robust = readJson<{
    symbols: Record<string, { symbol: string; structure?: { issuer?: string }; source?: string }>;
  }>(robustUniverseFile);
  const robustBy = new Map(Object.values(robust.symbols).map((r) => [r.symbol, r]));
  const splits = readSplits();
  const exposure = priorExposure(inventory);
  const rows: UniverseRow[] = [];

  for (const sym of inventory) {
    const report = readJson<{
      status: string;
      after: { sha256: string; bytes: number; rows: number; firstTimestamp: string; lastTimestamp: string };
      scan: {
        audit: {
          firstDate: string;
          lastDate: string;
          expectedSessions: number;
          sessionsWithRegularBars: number;
          missingSessions: string[];
          sessionsOnClosedDays: string[];
        };
      };
    }>(path.join(repoRoot, 'data', sym, 'dataset-report.json'));
    const sha = sha256File(canonicalFile(sym));
    const r9 = s9By.get(sym) ?? null;
    const a = report.scan.audit;
    const d1 =
      a.firstDate === '2016-01-04' &&
      a.lastDate === '2026-10-30' &&
      a.missingSessions.length === 0 &&
      a.sessionsOnClosedDays.length === 0 &&
      a.expectedSessions === a.sessionsWithRegularBars;
    const d2 = report.status === 'verified' && report.after.sha256 === sha && (r9 ? r9.file.sha256 === sha : false);
    const d4 = r9 ? r9.rules.D4 && !r9.structure.excluded : false;
    const d5 = r9 ? r9.medianDollarVolumeTraining >= 10_000_000 && r9.coverageMedianTraining >= 0.25 : false;
    const d3prior = r9
      ? r9.rules.D3 && r9.unexplainedSplitSizedPost2024 === 0 && r9.unexplainedSplitSizedTraining.length === 0
      : false;
    const symSplits = splits.filter((x) => x.symbol === sym);

    rows.push({
      symbol: sym,
      name: fundNames[sym] ?? sym,
      issuer: robustBy.get(sym)?.structure?.issuer ?? null,
      structure: r9?.structure.kind ?? 'unclassified',
      structureNote: r9?.structure.note ?? null,
      cluster: r9?.cluster ?? 'none',
      assetClass: assetClassOf(r9?.cluster ?? 'none'),
      control: (controls as readonly string[]).includes(sym),
      source:
        robustBy.get(sym)?.source ?? 'Alpaca v2 stocks bars, 1Min, SIP feed, adjustment=raw (scripts/download.sh)',
      file: { path: rel(canonicalFile(sym)), sha256: sha, bytes: report.after.bytes, rows: report.after.rows },
      history: {
        firstTimestamp: report.after.firstTimestamp,
        lastTimestamp: report.after.lastTimestamp,
        firstSession: a.firstDate,
        lastSession: a.lastDate,
        expectedSessions: a.expectedSessions,
        sessionsWithRegularBars: a.sessionsWithRegularBars,
        missingSessions: a.missingSessions
      },
      development: r9
        ? {
            sessions: 2264,
            medianCoverage: Math.round(r9.coverageMedianTraining * 1e4) / 1e4,
            medianDollarVolume: Math.round(r9.medianDollarVolumeTraining),
            sparseSessions: Object.values(r9.sparseByYear).reduce((x, y) => x + y, 0) - r9.sparsePost2024,
            medianBarsPerSession: r9.medianBarsPerSessionTraining,
            lotShareOfMedianMinuteDollarVolume: Math.round(r9.lotShareOfMedianMinuteDollarVolume * 1e4) / 1e4
          }
        : null,
      validationCompleteByMetadata: d1,
      quality: r9?.quality ?? 'unknown',
      corporateActions: {
        development: symSplits
          .filter((x) => x.effectiveDate <= '2024-12-31')
          .map((x) => ({ effectiveDate: x.effectiveDate, ratio: x.ratio })),
        validation: symSplits
          .filter((x) => x.effectiveDate > '2024-12-31')
          .map((x) => ({ effectiveDate: x.effectiveDate, ratio: x.ratio }))
      },
      priceConvention:
        'raw SIP minute prices, forward split adjustment from config/market-events/splits.json (later prices × ratio); price only — no dividends or distributions',
      study9: r9 ? { rules: r9.rules, eligible: r9.eligible, reasons: r9.reasons } : null,
      rules: { D1: d1, D2: d2, D3: d3prior, D4: d4, D5: d5 },
      eligible: false,
      exclusion: null,
      substitutes: substitutes[sym] ?? [],
      priorExposure: exposure[sym] ?? [],
      developmentScan: null
    });
  }

  // doors for every symbol passing D1, D2, D4, D5 and Study 9's whole-file D3
  const candidates = rows.filter((r) => Object.values(r.rules).every(Boolean));
  const manifest = {
    kind: 'growth-etf-screening door manifest (byte-prefix doors D19/D21/D23/D24 per eligible ETF)',
    splits: splitsPin(),
    symbols: {} as Record<string, ReturnType<typeof buildSymbolDoors>>
  };

  for (const r of candidates) manifest.symbols[r.symbol] = buildSymbolDoors(r.symbol, r.file.sha256);
  if (!isSealed(doorManifestFile)) sealJson(doorManifestFile, manifest, 'doors');

  // the development-only re-check of D3 (and the integrity scan) on the split-adjusted D24 sessions
  let calendar: string[] | null = null;

  for (const r of candidates) {
    const x = await loadEtfSessions(r.symbol, 'D24');
    const dates = x.sessions.map((s) => s.date);

    if (calendar === null) calendar = dates;
    else if (dates.length !== calendar.length || dates.some((d, i) => d !== calendar![i]))
      throw new Error(`${r.symbol}: the D24 calendar differs from the first symbol's`);
    r.developmentScan = developmentScan(x.sessions, r.symbol);
    if (r.developmentScan.unexplainedSplitSized.length > 0 || r.developmentScan.nonPositivePrices > 0)
      r.rules.D3 = false;
  }

  for (const r of rows) {
    const failed = Object.entries(r.rules)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    r.eligible = failed.length === 0;
    r.exclusion = r.eligible
      ? null
      : failed
          .map((k) =>
            k === 'D1'
              ? `D1 history: ${r.history.firstSession} → ${r.history.lastSession}, ${r.history.missingSessions.length} missing NYSE session(s)${r.history.missingSessions.length ? ` (${r.history.missingSessions.join(', ')})` : ''}`
              : k === 'D2'
                ? 'D2 integrity'
                : k === 'D3'
                  ? 'D3 unexplained split-sized move or non-positive price'
                  : k === 'D4'
                    ? `D4 structure (${r.structure})`
                    : 'D5 tradability / minute coverage'
          )
          .join('; ');
  }

  const eligible = rows.filter((r) => r.eligible).map((r) => r.symbol);
  const value = {
    kind: 'growth-etf-screening universe manifest (written before any performance screening)',
    written: new Date().toISOString(),
    inventory: {
      found: inventory,
      brief: briefInventory,
      missingFromData: briefInventory.filter((s) => !inventory.includes(s)),
      notInBrief: inventory.filter((s) => !briefInventory.includes(s))
    },
    rules: {
      D1: 'first regular bar 2016-01-04; a regular bar on every NYSE session through 2026-10-30; none on a closed day (timestamps only)',
      D2: 'datasets verify status verified; file sha256 = its dataset report = Study 9 S0 record',
      D3: 'no split-sized (≥ 30%) overnight move without a registered split: Study 9 S0 whole file; re-checked here on split-adjusted development sessions; no non-positive price',
      D4: 'no leveraged, inverse, volatility, single-commodity-futures or ETN product (Study 9 S0 classification)',
      D5: 'development median regular-session daily dollar volume ≥ $10,000,000 and development median minute coverage ≥ 25% (Study 9 S0)'
    },
    sources: {
      study9: { file: rel(study9File), sha256: sha256File(study9File) },
      robustUniverse: { file: rel(robustUniverseFile), sha256: sha256File(robustUniverseFile) },
      doors: { file: rel(doorManifestFile), sha256: sha256File(doorManifestFile) },
      splits: splitsPin()
    },
    commonCalendar: {
      development: { first: calendar?.[0], last: calendar?.at(-1), sessions: calendar?.length },
      endpoint: '2026-10-30',
      fullSessions: 2723,
      validationSessions: 459,
      how: 'every eligible file: dataset report calendar audit 2016-01-04 → 2026-10-30 with 0 missing sessions (timestamps only); development calendars identical session by session on the D24 doors'
    },
    eligible,
    controls: [...controls],
    untested: rows.filter((r) => !r.eligible).map((r) => ({ symbol: r.symbol, reason: r.exclusion })),
    clusters: Object.fromEntries(
      [...new Set(rows.filter((r) => r.eligible).map((r) => r.cluster))]
        .sort()
        .map((c) => [c, rows.filter((r) => r.eligible && r.cluster === c).map((r) => r.symbol)])
    ),
    limitations: [
      'The universe is the repository’s present inventory: survivorship and availability bias (funds that closed or were never downloaded are absent).',
      'Every eligible ETF was examined before by D1 studies over 2016–2026; Growth (this engine) was examined only on VGT and GDX (and XBI in engine checks). 2025–2026 is previously examined history, not an untouched holdout.',
      'Price only: dividends, distributions and special distributions appear as price drops while a position is held; bond and high-distribution funds are therefore understated relative to total return.',
      'Index methodology and constituent changes inside 2016–2026 (e.g. sector reclassifications) are part of each fund’s history and are not adjusted.'
    ],
    rows: rows.map((r) => ({
      ...r,
      development: r.development && { ...r.development, medianDollarVolume: r2(r.development.medianDollarVolume) }
    }))
  };

  sealJson(universeFile, value, 'universe');
  return value;
};

// Amendment R1 (before any performance screening; AMENDMENTS.md R1): every overnight move ≥ 15% the development scan
// listed, classified, and the eligible universe reduced by the symbols whose move is an unadjusted corporate action
// (a discontinuity of the price-only convention, not a market move). Written as its own sealed record; the sealed
// universe manifest is never rewritten.
export const r1File = () =>
  path.join(repoRoot, 'research/growth-etf-screening/results/universe/R1-corporate-action-discontinuities.json');

export const r1Classification: Record<string, { kind: 'market' | 'corporate action'; note: string }> = {
  'EWZ 2017-05-18': {
    kind: 'market',
    note: 'Brazil political crisis (the Temer recording); no corporate action registered or documented'
  },
  'EWZ 2020-03-12': { kind: 'market', note: 'COVID-19 crash' },
  'EWZ 2020-03-13': { kind: 'market', note: 'COVID-19 crash rebound' },
  'EWZ 2020-03-16': { kind: 'market', note: 'COVID-19 crash' },
  'ILF 2020-03-16': { kind: 'market', note: 'COVID-19 crash' },
  'XLE 2020-03-09': { kind: 'market', note: 'oil price war and COVID-19 crash' },
  'XLF 2020-03-16': { kind: 'market', note: 'COVID-19 crash' },
  'XOP 2020-03-09': { kind: 'market', note: 'oil price war and COVID-19 crash' },
  'XOP 2020-03-10': { kind: 'market', note: 'oil price war rebound' },
  'XLF 2016-09-19': {
    kind: 'corporate action',
    note: 'special dividend in kind of 0.139146 XLRE shares ($4.44356 per XLF share as of 2016-09-16), ex-date 2016-09-19 (OCC/MIAX information memo 39575, https://miaxglobal.com/sites/default/files/alert-files/XLF_Distribution_39575.pdf; State Street announcement 2016-06-08) — the GICS real-estate carve-out. Close 2016-09-16 $23.62 → open 2016-09-19 $19.35 (−18.1%). The repository registers no adjustment for it (config/market-events covers splits for all symbols and distributions for VGT/VOOG only).'
  }
};

export const sealR1 = () => {
  const u = readJson<{ eligible: string[]; rows: UniverseRow[] }>(universeFile);
  const moves = u.rows.flatMap((r) =>
    (r.developmentScan?.overnightMovesBeyond15 ?? []).map((m) => {
      const key = `${r.symbol} ${m.date}`;
      const c = r1Classification[key];

      if (!c) throw new Error(`unclassified development move ${key}`);
      return { symbol: r.symbol, date: m.date, move: m.move, ...c };
    })
  );
  const excluded = [...new Set(moves.filter((m) => m.kind === 'corporate action').map((m) => m.symbol))];
  const value = {
    kind: 'growth-etf-screening universe amendment R1 (before any performance screening)',
    written: new Date().toISOString(),
    universeManifest: { file: rel(universeFile), sha256: sha256File(universeFile) },
    rule: 'D3b (this study): no unadjusted corporate-action discontinuity in development — an overnight move ≥ 15% (Study 9’s audit threshold) that coincides with a documented split, special distribution or spin-off not represented in the canonical price convention. Market moves stay; nothing is interpolated or adjusted.',
    moves,
    excluded: excluded.map((s) => ({
      symbol: s,
      reason: `D3b: ${moves
        .filter((m) => m.symbol === s && m.kind === 'corporate action')
        .map((m) => `${m.date} ${(100 * m.move).toFixed(2)}% — ${m.note}`)
        .join('; ')}`
    })),
    eligible: u.eligible.filter((s) => !excluded.includes(s))
  };

  sealJson(r1File(), value, 'universe R1');
  return value;
};

// The study's eligible universe (the R1 record; alphabetical) and its controls.
export const eligibleSymbols = (): string[] => {
  const f = r1File();

  if (!isSealed(f)) throw new Error('the universe amendment R1 is not sealed');
  return [...readJson<{ eligible: string[] }>(f).eligible].sort();
};
export const isControl = (sym: string) => (controls as readonly string[]).includes(sym);
export const clusterOf = (sym: string): string => {
  const u = readJson<{ rows: { symbol: string; cluster: string }[] }>(universeFile);

  return u.rows.find((r) => r.symbol === sym)?.cluster ?? 'none';
};

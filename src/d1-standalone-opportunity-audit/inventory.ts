// Stage A of this audit (PROTOCOL.md §4): the read-only census of the ranked-preemption study's 61 × 3 standalone
// records. Every figure comes from a stored, hash-verified source file (the sealed STAGE_A.json of each window, the
// per-symbol profiles, the library phenotype files, the compact archive, the sealed rankings, picks and validations);
// nothing is re-run and no missing figure is invented. Derived columns (shares, per-day ratios, year counts) are pure
// arithmetic on stored fields and are labelled as such.
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import fs from 'fs-extra';
import { readSealed } from '../d1-ranked-preemption/freeze.ts';
import {
  type WindowKey,
  clusterOf,
  controlInstrument,
  foldKeys,
  readJson,
  semiconductorFunds,
  sourceResults,
  sourceStandaloneRoot,
  sourceUniverseFile,
  vgtPrimaryFinalWindow,
  windowKeys,
  windows
} from './context.ts';

export type Grid = Record<
  | 'targetPercentChange'
  | 'trailingBuyPercentage'
  | 'trailingStopPercentage'
  | 'maximumHoldDays'
  | 'tickWindowSize'
  | 'intradayLossBuffer'
  | 'pullback'
  | 'continuationWindow',
  number
>;

export interface StoredMetrics {
  trades: number;
  closed: number;
  open: number;
  net: number;
  bestTrade: number | null;
  secondTrade: number | null;
  thirdTrade: number | null;
  worstTrade: number | null;
  meanNet: number | null;
  medianNet: number | null;
  wins: number;
  losses: number;
  lossSum: number;
  occupiedDays: number;
  netPerDay: number | null;
  interest: number;
  friction: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  yearly: Record<string, number>;
  bestYearShare: number | null;
  score: number;
  credible: boolean;
  signature: string;
  gridKey: string;
}

interface Profile {
  symbol: string;
  window: WindowKey;
  status: string;
  uncertain: boolean;
  sample: string;
  reasons: string[];
  minTrades: number;
  eligibleYears: number;
  evaluated: number;
  credibleVectors: number;
  idleShare: number | null;
  representative: {
    credible: boolean;
    candidateId: string;
    grid: Grid;
    parameters: Record<string, string | number>;
    metrics: StoredMetrics;
    neighbourhood?: { draws: number; median: number; credibleShare: number; scores: number[] };
    phenotypeFile: string;
    phenotypeSha256: string;
  } | null;
  library: { role: string; file: string; sha256: string; candidateId: string }[];
  neighbourhoodChecked: {
    candidateId: string;
    grid: string;
    score: number;
    net: number;
    trades: number;
    median: number;
    credibleShare: number;
  }[];
  data: { dataSha256: string; loadedBarsSha256: string };
}

interface PhenotypeFile {
  id: string;
  window: WindowKey;
  symbol: string;
  role: string;
  candidateId: string;
  grid: Grid;
  description: string;
  training: { searchEnd: string; lastLoaded: string; dataSha256: string; loadedBarsSha256: string };
  metrics: StoredMetrics;
  neighbourhood?: { draws: number; median: number; credibleShare: number; scores: number[] };
}

interface UniverseSymbol {
  category: string;
  tier: string;
  dataSha256: string;
  coverageMedian: number;
  trainingMedianDollarVolume: number;
  trainingP10DollarVolume: number;
  trainingMedianBarsPerSession: number;
  splitsRegistered: { effectiveDate: string; ratio: number }[];
  firstDate: string;
  lastDate: string;
  sessions: number;
  missingSessions: number;
}

const sha256File = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

const quantile = (values: readonly number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);

  return sorted[low]! + (sorted[high]! - sorted[low]!) * (position - low);
};

export const median = (values: readonly number[]) => quantile(values, 0.5);
export { quantile };

// Pure arithmetic on stored fields (every input is a stored metric of the same vector).
export const derivedOf = (metrics: StoredMetrics) => {
  const net = metrics.net;
  const top = [metrics.bestTrade, metrics.secondTrade, metrics.thirdTrade].map((value) => Math.max(0, value ?? 0));
  const years = Object.entries(metrics.yearly);

  return {
    top1Share: net > 0 ? top[0]! / net : null,
    top3Share: net > 0 ? (top[0]! + top[1]! + top[2]!) / net : null,
    netPerTrade: metrics.trades > 0 ? net / metrics.trades : null,
    netPerOccupiedDay: metrics.occupiedDays > 0 ? net / metrics.occupiedDays : null,
    // borrowing dollar-days of a $100,000 slot = occupied calendar days × $100,000
    netPerMillionDollarDays: metrics.occupiedDays > 0 ? (net / (metrics.occupiedDays * 100000)) * 1e6 : null,
    interestShareOfGross:
      net + metrics.interest + metrics.friction > 0
        ? metrics.interest / (net + metrics.interest + metrics.friction)
        : null,
    exitYears: years.length,
    yearsPositive: years.filter(([, value]) => value > 0).length,
    yearsWith10k: years.filter(([, value]) => value >= 10000).length,
    winRate: metrics.trades > 0 ? metrics.wins / metrics.trades : null
  };
};

export interface CensusRow {
  symbol: string;
  window: WindowKey;
  searchEnd: string;
  cluster: string;
  category: string;
  tier: string;
  semiconductor: boolean;
  controlInstrument: boolean;
  liquidity: { coverageMedian: number; medianDollarVolume: number; p10DollarVolume: number; barsPerSession: number };
  splits: { effectiveDate: string; ratio: number }[];
  data: { dataSha256: string; loadedBarsSha256: string; auditedDataSha256: string; matchesAudit: boolean };
  status: string;
  uncertain: boolean;
  sample: string;
  reasons: string[];
  minTrades: number;
  eligibleYears: number;
  evaluated: number;
  credibleVectors: number;
  credibleFraction: number;
  sobol: { evaluated: number; credible: number; positive: number; credibleShare: number; positiveShare: number };
  representative: null | {
    candidateId: string;
    description: string;
    grid: Grid;
    phenotypeFile: string;
    phenotypeSha256: string;
    sha256Verified: boolean;
    metrics: StoredMetrics;
    derived: ReturnType<typeof derivedOf>;
    neighbourhood: null | {
      draws: number;
      medianJ: number;
      p10J: number;
      minJ: number;
      credibleShare: number;
      credibleDraws: number;
    };
  };
  library: {
    role: string;
    candidateId: string;
    file: string;
    sha256: string;
    sha256Verified: boolean;
    grid: Grid;
    description: string;
    metrics: StoredMetrics;
    derived: ReturnType<typeof derivedOf>;
  }[];
  checked: Profile['neighbourhoodChecked'];
  ranks: { R1: number | null; R2: number | null };
  pooledFolds: { procedure: string; window: WindowKey; member: boolean }[];
  unavailable: string[];
}

// Metrics the source study never stored for a standalone vector (they must be computed, never assumed).
export const unavailableMetrics = [
  'per-trade ledger (dates, entry/exit prices, exit reasons) — only aggregates and nets by exit year are stored',
  'MAE/MFE and intratrade adverse excursion',
  'episode-level breadth (which correction/recovery each trade belongs to)',
  'portfolio-mode (20% of marked equity) results',
  'cost/interest stress beyond 5 bps per side and 11%',
  'fold validation of the standalone vector itself (only pooled configurations were validated)',
  'neighbourhood nets: the 16 stored draws hold J_s scores (net − best trade − DD excess over $20,000), not nets'
];

// The compact archive (every evaluated vector, one JSON line each): Sobol-stage counts per symbol.
export const sobolCountsOf = async (window: WindowKey) => {
  const file = sourceResults('standalone', window, 'archive.jsonl.gz');
  const lines = gunzipSync(await fs.readFile(file))
    .toString('utf8')
    .split('\n');
  const counts = new Map<string, { evaluated: number; credible: number; positive: number }>();
  let rows = 0;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    rows++;

    const row = JSON.parse(line) as { stage: string; symbol: string; credible: boolean; net: number };

    if (row.stage !== 'sobol') {
      continue;
    }

    const entry = counts.get(row.symbol) ?? { evaluated: 0, credible: 0, positive: 0 };

    entry.evaluated++;
    entry.credible += row.credible ? 1 : 0;
    entry.positive += row.net > 0 ? 1 : 0;
    counts.set(row.symbol, entry);
  }

  return { counts, rows, sha256: await sha256File(file) };
};

interface SealedStageA {
  window: WindowKey;
  evaluations: number;
  counts: Record<string, number>;
  minTrades: number;
  files: Record<string, string>;
  archive: { file: string; sha256: string; rows: number };
  door: { endDate: string; lastDate: string; sessions: number; barsSha256: Record<string, string> };
  bodyHash: string;
}

interface RankingRecord {
  entries: { symbol: string; position: number }[];
  bodyHash: string;
}

interface PicksRecord {
  configurations: Record<string, { members?: string[]; books?: { symbol: string }[] }> | unknown[];
}

const membersOfConfiguration = (configuration: unknown): string[] => {
  const value = configuration as { members?: string[]; books?: { symbol: string }[] };

  return value.members ?? value.books?.map((book) => book.symbol) ?? [];
};

// Every check a reader can repeat: sealed bodies, file hashes, archive hash and row count, phenotype hashes.
export interface SourceCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export const buildCensus = async () => {
  const universe = await readJson<{ eligible: string[]; symbols: Record<string, UniverseSymbol> }>(sourceUniverseFile);
  const eligible = [...universe.eligible].sort();
  const checks: SourceCheck[] = [];
  const rows: CensusRow[] = [];
  const stageRecords: Record<string, { bodyHash: string; evaluations: number; counts: Record<string, number> }> = {};

  checks.push({
    name: 'universe: 61 eligible symbols',
    pass: eligible.length === 61,
    detail: `${eligible.length} eligible in ${sourceUniverseFile}`
  });

  for (const window of windowKeys) {
    const stageFile = sourceResults('standalone', window, 'STAGE_A.json');
    const stage = await readSealed<SealedStageA & { [key: string]: unknown }>(stageFile);

    stageRecords[window] = { bodyHash: stage.bodyHash, evaluations: stage.evaluations, counts: stage.counts };
    checks.push({ name: `${window}: STAGE_A.json body hash verifies`, pass: true, detail: stage.bodyHash });
    checks.push({
      name: `${window}: door ends at the search end`,
      pass: stage.door.endDate === windows[window].searchEnd && stage.door.lastDate === windows[window].searchEnd,
      detail: `${stage.door.endDate} / last ${stage.door.lastDate}, ${stage.door.sessions} sessions`
    });

    let mismatched = 0;

    for (const [file, expected] of Object.entries(stage.files)) {
      if ((await sha256File(file)) !== expected) {
        mismatched++;
      }
    }

    checks.push({
      name: `${window}: every profile and phenotype file hashes as sealed`,
      pass: mismatched === 0,
      detail: `${Object.keys(stage.files).length} files, ${mismatched} mismatched`
    });

    const sobol = await sobolCountsOf(window);

    checks.push({
      name: `${window}: archive hash and row count as sealed`,
      pass: sobol.sha256 === stage.archive.sha256 && sobol.rows === stage.archive.rows,
      detail: `${sobol.rows} rows, sha256 ${sobol.sha256.slice(0, 12)}`
    });

    const ranking = async (key: 'R1' | 'R2') => {
      const record = await readSealed<RankingRecord & { [key: string]: unknown }>(
        path.join('research/d1-ranked-preemption/rankings', window, `${key}.json`)
      );

      return new Map(record.entries.map((entry) => [entry.symbol, entry.position]));
    };
    const r1 = await ranking('R1');
    const r2 = await ranking('R2');

    // Pooled configurations of the window (fold picks; the final window's controls), for membership only.
    const pooled: { procedure: string; members: string[] }[] = [];

    if (window !== 'final') {
      const picks = await readSealed<PicksRecord & { bodyHash: string; [key: string]: unknown }>(
        sourceResults('walkforward', window, 'PICKS.json')
      );
      const configurations = picks.configurations as Record<string, unknown> | unknown[];
      const entries = Array.isArray(configurations)
        ? configurations.map((value) => [String((value as { id?: string }).id), value] as const)
        : Object.entries(configurations);

      // The four principal procedures (C = standalone-ranked assembly, D = joint search) under R1 and R2.
      for (const [id, configuration] of entries) {
        if (['C-R1', 'C-R2', 'D-R1', 'D-R2'].includes(id)) {
          pooled.push({ procedure: id, members: membersOfConfiguration(configuration) });
        }
      }
    }

    for (const symbol of eligible) {
      const profile = await readJson<Profile>(path.join(sourceStandaloneRoot, window, `${symbol}.json`));
      const info = universe.symbols[symbol]!;
      const counts = sobol.counts.get(symbol) ?? { evaluated: 0, credible: 0, positive: 0 };
      const representative = profile.representative;
      let representativeRow: CensusRow['representative'] = null;

      if (representative) {
        const scores = representative.neighbourhood?.scores ?? [];
        const file = representative.phenotypeFile;
        const phenotype = await readJson<PhenotypeFile>(file);

        representativeRow = {
          candidateId: representative.candidateId,
          description: phenotype.description,
          grid: representative.grid,
          phenotypeFile: file,
          phenotypeSha256: representative.phenotypeSha256,
          sha256Verified: (await sha256File(file)) === representative.phenotypeSha256,
          metrics: representative.metrics,
          derived: derivedOf(representative.metrics),
          neighbourhood: representative.neighbourhood
            ? {
                draws: representative.neighbourhood.draws,
                medianJ: representative.neighbourhood.median,
                p10J: quantile(scores, 0.1),
                minJ: Math.min(...scores),
                credibleShare: representative.neighbourhood.credibleShare,
                credibleDraws: Math.round(
                  representative.neighbourhood.credibleShare * representative.neighbourhood.draws
                )
              }
            : null
        };
      }

      const library: CensusRow['library'] = [];

      for (const entry of profile.library) {
        const phenotype = await readJson<PhenotypeFile>(entry.file);

        library.push({
          role: entry.role,
          candidateId: entry.candidateId,
          file: entry.file,
          sha256: entry.sha256,
          sha256Verified: (await sha256File(entry.file)) === entry.sha256,
          grid: phenotype.grid,
          description: phenotype.description,
          metrics: phenotype.metrics,
          derived: derivedOf(phenotype.metrics)
        });
      }

      rows.push({
        symbol,
        window,
        searchEnd: windows[window].searchEnd,
        cluster: clusterOf(symbol),
        category: info.category,
        tier: info.tier,
        semiconductor: semiconductorFunds.includes(symbol),
        controlInstrument: symbol === controlInstrument,
        liquidity: {
          coverageMedian: info.coverageMedian,
          medianDollarVolume: info.trainingMedianDollarVolume,
          p10DollarVolume: info.trainingP10DollarVolume,
          barsPerSession: info.trainingMedianBarsPerSession
        },
        splits: info.splitsRegistered,
        data: {
          dataSha256: profile.data.dataSha256,
          loadedBarsSha256: profile.data.loadedBarsSha256,
          auditedDataSha256: info.dataSha256,
          matchesAudit: profile.data.dataSha256 === info.dataSha256
        },
        status: profile.status,
        uncertain: profile.uncertain,
        sample: profile.sample,
        reasons: profile.reasons,
        minTrades: profile.minTrades,
        eligibleYears: profile.eligibleYears,
        evaluated: profile.evaluated,
        credibleVectors: profile.credibleVectors,
        credibleFraction: profile.evaluated > 0 ? profile.credibleVectors / profile.evaluated : 0,
        sobol: {
          ...counts,
          credibleShare: counts.evaluated > 0 ? counts.credible / counts.evaluated : 0,
          positiveShare: counts.evaluated > 0 ? counts.positive / counts.evaluated : 0
        },
        representative: representativeRow,
        library,
        checked: profile.neighbourhoodChecked,
        ranks: { R1: r1.get(symbol) ?? null, R2: r2.get(symbol) ?? null },
        pooledFolds: pooled.map((configuration) => ({
          procedure: configuration.procedure,
          window,
          member: configuration.members.includes(symbol)
        })),
        unavailable: unavailableMetrics
      });
    }
  }

  const libraryUnverified = rows.flatMap((row) => row.library).filter((entry) => !entry.sha256Verified).length;
  const representativeUnverified = rows.filter((row) => row.representative && !row.representative.sha256Verified);

  checks.push({
    name: 'every library and representative phenotype file hashes as its profile records',
    pass: libraryUnverified === 0 && representativeUnverified.length === 0,
    detail: `${rows.flatMap((row) => row.library).length} library files, ${libraryUnverified} unverified`
  });
  checks.push({
    name: 'every profile’s data hash equals the audited universe',
    pass: rows.every((row) => row.data.matchesAudit),
    detail: `${rows.filter((row) => !row.data.matchesAudit).length} mismatches`
  });
  const controls = await readSealed<{
    fixed: Record<string, Record<string, { net: number; heldDays: number }>>;
    bodyHash: string;
  }>(sourceResults('controls', 'final', 'CONTROLS.json'));
  const b1 = controls.fixed.B1?.['5'];

  checks.push({
    name: 'the shortlist anchor equals the sealed same-window VGT primary control (CONTROLS.json final, B1, 5 bps)',
    pass: b1?.net === vgtPrimaryFinalWindow.net && b1?.heldDays === vgtPrimaryFinalWindow.heldDays,
    detail: `stored net ${b1?.net}, held days ${b1?.heldDays}`
  });

  return { rows, checks, stageRecords, eligible, folds: foldKeys };
};

export type Census = Awaited<ReturnType<typeof buildCensus>>;

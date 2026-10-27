// The D1 standalone ETF opportunity-capture and robustness audit (research/d1-standalone-etf-opportunity-audit/
// PROTOCOL.md): every constant of the protocol declared here, so the code and the protocol can be compared line by
// line. The fixed/portfolio conventions, distance rules, legal grid, Latin hypercube and the 19 cost scenarios are the
// completed B4/B5 audit's (src/b4-b5-robustness/context.ts), imported read-only. The data doors are the ranked-
// preemption study's own (src/d1-ranked-preemption/data.ts), so its restrictions apply unchanged. Nothing in this study
// writes to config/, data/, an earlier research/ study or any file bound by the prospective B4/B5 freeze; every
// vector run here is diagnostic-only and research-only.
import path from 'node:path';

export {
  base,
  costScenarios,
  distancesOf,
  formatDollars,
  hasFlag,
  jsonReplacer,
  legal,
  nowIso,
  offsetLabels,
  option,
  percentKeys,
  readJson,
  requireNode24,
  scenarioById,
  shortNames,
  writeJson,
  writeText
} from '../b4-b5-robustness/context.ts';
export type { CostScenario, OffsetLabel } from '../b4-b5-robustness/context.ts';

// The study's root may be redirected to a scratch tree by the tests only (never by a study run).
const testRoot = process.env.STANDALONE_OPPORTUNITY_ROOT;

export const studyLabel = 'd1-standalone-etf-opportunity-audit-v1';
export const researchRoot = testRoot ?? 'research/d1-standalone-etf-opportunity-audit';
export const resultsRoot = path.join(researchRoot, 'results');
export const resultDir = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const protocolFreezeFile = path.join(researchRoot, 'PROTOCOL_FREEZE.json');
export const shortlistFile = path.join(researchRoot, 'SHORTLIST.json');
export const briefFile = path.join(researchRoot, 'brief', 'BRIEF.md');
export const templatesRoot = path.join(researchRoot, 'templates');
export const evaluationsRoot = 'evaluations/standalone-opportunity-audit'; // git-ignored CLI outputs
export const contextFile = 'src/d1-standalone-opportunity-audit/context.ts';
export const codeRoot = 'src/d1-standalone-opportunity-audit';

export const log = (line: string) => console.info(`[standalone-opportunity] ${line}`);

// ----- the source study (read-only) -----

export const sourceRoot = 'research/d1-ranked-preemption';
export const sourceStandaloneRoot = path.join(sourceRoot, 'standalone');
export const sourceResults = (...parts: string[]) => path.join(sourceRoot, 'results', ...parts);
export const sourceUniverseFile = sourceResults('audit', 'universe.json');
export const sourceProtocolFreeze = path.join(sourceRoot, 'PROTOCOL_FREEZE.json');

export type WindowKey = 'fold-a' | 'fold-b' | 'final';
export type FoldKey = 'fold-a' | 'fold-b';
export const windowKeys: readonly WindowKey[] = ['fold-a', 'fold-b', 'final'];
export const foldKeys: readonly FoldKey[] = ['fold-a', 'fold-b'];

// The source study's windows (src/d1-ranked-preemption/context.ts study.windows), restated so a drift is caught.
export const windows: Record<WindowKey, { searchEnd: string; validationStart?: string; validationEnd?: string }> = {
  'fold-a': { searchEnd: '2020-06-30', validationStart: '2020-07-01', validationEnd: '2021-12-31' },
  'fold-b': { searchEnd: '2021-12-31', validationStart: '2022-01-01', validationEnd: '2023-12-29' },
  final: { searchEnd: '2023-12-29' }
};

// The authorized horizon of every final-window research phenotype (and of the common-window incumbents): nothing
// after this session is ever loaded for a research phenotype (PROTOCOL.md §3).
export const candidateCutoff = '2023-12-29';
export const firstSession = '2016-01-04';
export const armingDate = '2017-06-15';
export const fullHistoryEnd = '2026-10-13';

// ----- the incumbents (unchanged; PROTOCOL.md §2) -----

export const incumbentPhenotypeFile = 'config/phenotypes/D1/VGT.json';
export const incumbentGrid = {
  targetPercentChange: 216,
  trailingBuyPercentage: 3,
  trailingStopPercentage: 73,
  maximumHoldDays: 8,
  tickWindowSize: 74,
  intradayLossBuffer: 29,
  pullback: 90,
  continuationWindow: 60
} as const;
export const poolMembers = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;

// The brief's full-history anchors (2016-01-04 → 2026-10-13, 5 bps, 11%): cents for money, 0.01 pp for percentages.
export const fullHistoryAnchors = {
  S: { net: 176260.47, minuteDrawdown: 19534.41, lots: 21, endEquity: 2958025.76, daily: 0.3278, minute: 0.3521 },
  B4: { net: 284244.74, minuteDrawdown: 28659.34, lots: 76, endEquity: 3608484.05, daily: 0.3465, minute: 0.3701 },
  B5: { net: 486207.77, minuteDrawdown: 26509.97, lots: 94, endEquity: 5410976.72, daily: 0.2967, minute: 0.3109 },
  C0: { endEquity: 2279768.98, daily: 0.3389, minute: 0.3576 }
};

// The source study's stored same-window control of VGT primary (CONTROLS.json final, B1 at 5 bps): the shortlist
// rule's anchors (PROTOCOL.md §5).
export const vgtPrimaryFinalWindow = { net: 135359.0411970347, heldDays: 917 };

// ----- the user's holdings constraint and the control instrument (PROTOCOL.md §5) -----

export const semiconductorFunds: readonly string[] = ['SMH'];
export const controlInstrument = 'VGT';

// Economic-exposure clusters for the shortlist's diversity rule (at most one ETF per cluster in the core slots).
// Predeclared from what each fund holds, never from results.
export const clusters: Record<string, readonly string[]> = {
  'us-tech-growth': ['VGT', 'XLK', 'IGV', 'SMH', 'IWF', 'MTUM', 'VOOG', 'QUAL'],
  'us-broad-size-factor': ['RSP', 'IJH', 'IJR', 'IWM', 'IWN', 'IWD', 'USMV', 'SPLV', 'VIG'],
  'us-financials': ['XLF', 'KBE', 'KRE', 'KIE'],
  'us-cyclical': ['XHB', 'XRT', 'XLY', 'IYT', 'XLI'],
  'us-defensive': ['XLP', 'XLU', 'VPU'],
  'us-healthcare-biotech': ['XLV', 'IBB', 'XBI'],
  energy: ['XLE', 'XOP'],
  'materials-metals-mining': ['XLB', 'XME'],
  'precious-metals': ['GLD', 'IAU', 'SLV', 'GDX'],
  'broad-commodities': ['DBC'],
  'em-latam': ['EWZ', 'EWW', 'ILF'],
  'em-asia': ['FXI', 'INDA', 'EWY'],
  'em-broad': ['EEM', 'IEMG'],
  'developed-ex-us': ['EFA', 'EWJ', 'VGK'],
  'rates-credit': ['AGG', 'IEF', 'SHY', 'TIP', 'TLT', 'EDV', 'LQD', 'HYG', 'EMB']
};

export const clusterOf = (symbol: string) => {
  const found = Object.entries(clusters).find(([, members]) => members.includes(symbol));

  if (!found) {
    throw new Error(`${symbol} has no predeclared cluster`);
  }

  return found[0];
};

// Clusters whose funds are usually defensive in equity crashes: the contrast slot draws from them (PROTOCOL.md §5.4).
export const contrastClusters: readonly string[] = ['rates-credit', 'us-defensive'];

// ----- the shortlist rule (PROTOCOL.md §5) -----

export const shortlistRule = {
  neighbourhoodCredibleShareGate: 0.5, // G2: ≥ 8 of the 16 stored draws credible
  merit: { high: 0.75, mid: 0.5 }, // S1: final net ÷ VGT primary's same-window net
  efficiency: { high: 1.0, mid: 0.75 }, // S2: net per occupied day ÷ VGT primary's
  resilience: { high: 15 / 16, mid: 12 / 16 }, // S3: stored neighbourhood credible share
  breadthYearNet: 10000, // S5: an exit year with ≥ $10,000 net counts as a profitable period (2 if ≥ 2 such years)
  meritShare: 1.0, // merit slots: stored final net ≥ VGT primary's stored same-window net
  downside: {
    high: { minuteDrawdown: 20000, worstTrade: -7500 },
    mid: { minuteDrawdown: 27500, worstTrade: -10000 }
  }, // S6
  coreSlots: 10, // merit and diversity picks together; the sparse and contrast slots may add up to two more
  maximumSymbols: 12,
  sparseTrades: 10, // the sparse slot: < 10 trades (the source study's "uncertain" label)
  maximumPerEtf: 2 // the representative and library alternative-1
};

// ----- designs (PROTOCOL.md §6) -----

export const jointSamples = 64;
export const jointSeeds = [1, 2] as const;
// Common random numbers: every phenotype draws its two hypercubes from the completed VGT audit's stream (labels
// 'vgt-standalone-joint', 'VGT-primary', seed), so every phenotype's samples sit at the same relative positions inside
// its own intervals (a paired comparison), and VGT primary's samples are exactly the vectors that audit ran.
export const jointStream = ['vgt-standalone-joint', 'VGT-primary'] as const;

// ----- the episode catalog (PROTOCOL.md §7) -----

export const episodes = {
  reversal: 0.1, // zigzag: a peak is confirmed by a 10% fall from it, a trough by a 10% rise from it
  bands: [0.1, 0.15, 0.2, 0.3] as const, // depth bands [10,15), [15,20), [20,30), ≥ 30%
  major: 0.2, // a major episode: depth ≥ 20%
  familyTroughWindow: 126, // a family: the episodes whose troughs fall within 126 sessions of the family's first trough
  independentGapSessions: 252 // independent events: dip families whose anchor troughs are ≥ 252 sessions apart
};

// ----- interpretation (PROTOCOL.md §9) -----

export const flagThresholds = {
  tailLot: -10000, // F2: a lot losing more than $10,000 …
  tailMae: -0.25, // … or an intratrade adverse excursion beyond −25%
  ddCeiling: 35000, // F3: fixed minute DD above $35,000 (base or C1)
  portfolioDaily: 0.35, // F3: portfolio max daily DD above 35%
  portfolioPreferred: 0.3,
  neighbourCapture: 0.5, // F4: median share of the base's dip-captured major families also dip-captured by a joint sample
  winnerPersistence: 0.25, // F5 (winner parameter-dependence): < 25% of joint samples keep ≥ 50% of the top winner's reference net
  costFall: 0.5, // F6: net falls > 50% at C1, or ≤ 0 under f10, f20 or C1
  coverage: 0.75, // F7: minute coverage below 75% …
  dollarVolume: 50e6, // … or training median dollar volume below $50M
  profitableShare: 0.75, // F9: the 128 pooled joint samples < 75% profitable …
  retention: 0.5, // … or their median retention < 50%
  neighbourhoodDdShare: 0.75, // F10: < 75% of the 128 joint samples with minute DD ≤ $35,000 (or median portfolio daily DD > 35%)
  dipDepthShare: 0.5, // a dip entry: in the decline phase, or at least 50% of the episode's depth below its peak
  lowLots: 30 // annotation only: fewer than 30 lots
};

export const sha256Of = async (file: string) => {
  const { createHash } = await import('node:crypto');
  const { readFile } = await import('node:fs/promises');

  return createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
};

// The eight-ETF D1 parameter program (research/multi-etf-d1): the fixed settings of PROTOCOL.md, the result paths
// and the small helpers every command shares. Every date boundary, budget, bound and selection constant of the
// protocol is declared here, so that the code and the protocol document can be compared line by line.
import path from 'node:path';
import fs from 'fs-extra';
import type { StopFill } from '../d1-refinement/engine.ts';
import type { ParamKey } from '../d1-refinement/families.ts';

export const tickers = ['XBI', 'IWM', 'XRT', 'KRE', 'XLY', 'IWN', 'XLF', 'XLE'] as const;
export type Ticker = (typeof tickers)[number];

export const researchRoot = 'research/multi-etf-d1';
export const resultsRoot = path.join(researchRoot, 'results');
export const stageDir = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const frozenCandidatesFile = path.join(researchRoot, 'FROZEN_CANDIDATES.json');
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');

export interface Fold {
  key: string;
  trainEnd: string; // the last calendar date of the training window (resolved to the last session on or before it)
  validation?: { start: string; end: string };
}

// A bounded parameter domain on the d1-refinement integer grid (tenths of a percentage point, days or sessions).
export interface BoxSpec {
  key: ParamKey;
  short: string;
  min: number;
  max: number;
  probes: number[]; // one-parameter perturbations (grid units) for the plateau check
  rationale: string;
}

export const protocol = {
  version: 'multi-etf-d1-protocol-v1',
  dataFile: (ticker: string) => `data/${ticker}/${ticker}-2016-2025-1-minute.csv`,
  // The regression control: the original VGT dataset and the prior verified figures of the unchanged D1 file.
  reference: {
    symbol: 'VGT',
    dataFile: 'data/VGT/VGT-2016-2025-1-minute.csv',
    dataHash: '600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f',
    net: 183043.82,
    minuteDrawdown: 19330.69,
    entries: 20
  },
  d1Source: 'src/app/allIn-trailingBuy-postExitContinuation.ts',
  // Common first eligible session for every ticker: the D1 convention of the previous programs (session 365 of the
  // VGT file). Every lookback of the search (L <= 250) is complete well before it, and it keeps the September 2016
  // XLF distribution out of every arming decision.
  eligibilityDate: '2017-06-15',
  // Development: everything on or before the last session of 2023. Holdout: the first session of 2024 through the
  // last session common to the eight files (2025-10-16), fixed by the data audit before any strategy run.
  developmentEnd: '2023-12-31',
  holdout: { start: '2024-01-01', end: '2025-12-31' },
  stopFill: 'stop' as StopFill,
  marginInterestRate: 0.11,
  investment: 100000,
  drawdownCeiling: 35000, // in-development screening constraint on the minute-sampled drawdown
  preferredDrawdown: 25000, // the primary pick prefers candidates in this band when one exists
  minEntriesPerYear: 0.75, // feasibility: at least ceil(0.75 x years) entries on the window judged
  sparseTrades: 10, // fewer closed trades than this on the development window: "insufficient evidence"
  folds: [
    { key: 'fold1', trainEnd: '2019-12-31', validation: { start: '2020-01-01', end: '2020-12-31' } },
    { key: 'fold2', trainEnd: '2020-12-31', validation: { start: '2021-01-01', end: '2021-12-31' } },
    { key: 'fold3', trainEnd: '2021-12-31', validation: { start: '2022-01-01', end: '2022-12-31' } },
    { key: 'fold4', trainEnd: '2022-12-31', validation: { start: '2023-01-01', end: '2023-12-31' } },
    { key: 'final', trainEnd: '2023-12-31' }
  ] as Fold[],
  // The common search box (every ticker, the same bounds). Percentages in tenths of a point; see PROTOCOL.md.
  box: [
    {
      key: 'targetPercentChange',
      short: 'X',
      min: 80,
      max: 300,
      probes: [-10, -5, 5, 10],
      rationale:
        '8.0%-30.0%: the deepest development-window declines from the rolling 74-session high range from 34% (XLY) to 62% (XLE), with 2018 and 2022 declines of 20-37% on every ticker; the lower end admits ordinary sector pullbacks, the upper end still arms in 2020 on every ticker and is the engine grid ceiling (30.0%).'
    },
    {
      key: 'trailingBuyPercentage',
      short: 'Y',
      min: 1,
      max: 50,
      probes: [-2, -1, 1, 2],
      rationale: '0.1%-5.0%: from an almost immediate rebound confirmation to a rebound larger than a typical day.'
    },
    {
      key: 'trailingStopPercentage',
      short: 'stop',
      min: 30,
      max: 150,
      probes: [-10, -5, 5, 10],
      rationale: '3.0%-15.0%: tighter than one day of sector-ETF noise up to twice D1 (7.3%).'
    },
    {
      key: 'maximumHoldDays',
      short: 'hold',
      min: 3,
      max: 30,
      probes: [-2, -1, 1, 2],
      rationale: '3-30 calendar days before the loss exits apply (D1: 8).'
    },
    {
      key: 'tickWindowSize',
      short: 'L',
      min: 20,
      max: 250,
      probes: [-10, -5, 5, 10],
      rationale:
        '20-250 sessions of reference high (D1: 74); 250 is one trading year, complete by the eligibility session.'
    },
    {
      key: 'intradayLossBuffer',
      short: 'buffer',
      min: 0,
      max: 60,
      probes: [-10, -5, 5, 10],
      rationale:
        '0.0%-6.0% net loss for the buffered intraday exit (D1: 2.9%); 0% sells at the first net loss from the hold day.'
    },
    {
      key: 'pullback',
      short: 'P',
      min: 30,
      max: 200,
      probes: [-10, -5, 5, 10],
      rationale: '3.0%-20.0% pullback from the post-exit high (D1: 9.0%).'
    },
    {
      key: 'continuationWindow',
      short: 'W',
      min: 10,
      max: 200,
      probes: [-20, -10, 10, 20],
      rationale: '10-200 sessions of continuation window after a profitable exit (D1: 60).'
    }
  ] as BoxSpec[],
  search: {
    sobolSamples: 4096, // unique quantized candidates per ticker (the upper budget of the brief)
    populationSize: 96,
    generations: 40,
    maxEvaluationsPerFold: 3000, // new simulations per NSGA-II fold
    crossoverProbability: 0.9,
    crossoverEta: 15,
    mutationEta: 20,
    earlyStopPatience: 12,
    earlyStopTolerance: 1e-4,
    seedDiversity: 0.02
  },
  selection: {
    shortlistSize: 10, // candidates probed per policy per fold, extended by 10 while none passes
    maxShortlist: 30,
    plateauFeasibleShare: 0.75, // share of in-box probes that must stay feasible
    plateauMedianShare: 0.7, // the median probe net must reach this share of the candidate's net
    lowDdNetShare: 0.75 // the low-drawdown alternate keeps at least this share of the primary's net
  },
  // Predeclared cost sensitivities on the frozen finalists (per side, fraction of the fill) and the adverse fill.
  costSensitivities: [0.0002, 0.0005, 0.001],
  sensitivityStopFill: 'next-open' as StopFill
} as const;

export const d1Keys: ParamKey[] = protocol.box.map((spec) => spec.key);

export const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

export const hasFlag = (args: string[], name: string) => args.includes(`--${name}`);

export const tickersOf = (args: string[]): Ticker[] => {
  const given = option(args, 'symbols')
    ?.split(',')
    .map((value) => value.trim().toUpperCase());

  if (!given) {
    return [...tickers];
  }

  for (const value of given) {
    if (!tickers.includes(value as Ticker)) {
      throw new Error(`Unknown ticker ${value}; the program covers ${tickers.join(', ')}`);
    }
  }

  return given as Ticker[];
};

export const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T;

export const writeJson = async (file: string, value: unknown) =>
  fs.outputFile(file, `${JSON.stringify(value, null, 1)}\n`);

export const writeText = async (file: string, text: string) =>
  fs.outputFile(file, text.endsWith('\n') ? text : `${text}\n`);

export const exists = (file: string) => fs.pathExists(file);

export const formatDollars = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const formatSignedDollars = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : '+'}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const pct = (fraction: number, digits = 1) =>
  Number.isFinite(fraction) ? `${(fraction * 100).toFixed(digits)}%` : '';

export const log = (line: string) => console.info(`[multi-etf-d1] ${line}`);

export const nowIso = () => new Date().toISOString();

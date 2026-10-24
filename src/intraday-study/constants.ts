// Fixed constants and the frozen policy catalogue of the VGT intraday study
// (research/vgt-intraday-study/PROTOCOL.md). The seven strategy values are the incumbent's, read from
// src/app/allIn.ts, and are never varied. Nothing here is tuned.

import { type FrozenSource, legacyMinuteFile } from '#lib';

export const secondsPerMinute = 60;
export const secondsPerDay = 24 * 60 * 60;

// The incumbent's constants, with the same literals as src/app/allIn.ts so every expression yields the same
// doubles.
export const incumbent = {
  tickWindowSize: 78,
  investmentAmount: 100000,
  targetPercentChange: 0.025,
  trailingStopPercentage: 0.021,
  maximumHoldDays: 8,
  marginInterestRate: 0.11,
  materialLossThreshold: 0.022,
  lowerPriceReentry: 0.04,
  retraceFraction: 0.367
} as const;

// The study input, data/VGT/VGT-2016-2025-1-minute.csv, from the verified legacy archive (src/lib/archive.ts);
// the study's own hash check still applies. New work reads the dataset partitions instead (src/lib/dataset.ts).
export const dataFile = legacyMinuteFile('VGT');
export const symbol = 'VGT';

export const costLevelsBps = [0, 5, 10, 20] as const;
export const primaryCostBps = 5;
export const minuteDrawdownGate = 30000;
export const materialProfit = 5000;
export const materialDrawdown = 5000;

export type StopMode = 'STOP_DAILY' | 'STOP_MINUTE_CAUSAL';
export const stopModes: readonly StopMode[] = ['STOP_DAILY', 'STOP_MINUTE_CAUSAL'];
export const stopFills = ['stop', 'next-open'] as const;

export type Band = 'SHALLOW' | 'MODERATE' | 'DEEP' | 'EXTREME';
export const bands: readonly Band[] = ['SHALLOW', 'MODERATE', 'DEEP', 'EXTREME'];

// Depth below the reference high at a decision, d = 1 - close / recentHigh, for a price that already
// qualifies (d >= 2.5%).
export const bandOf = (depth: number): Band =>
  depth < 0.05 ? 'SHALLOW' : depth < 0.1 ? 'MODERATE' : depth < 0.15 ? 'DEEP' : 'EXTREME';

export type Mechanism =
  | { kind: 'close' }
  | { kind: 'first' }
  | { kind: 'persist'; minutes: number }
  | { kind: 'stable'; minutes: number }
  | { kind: 'rebound'; fraction: number }
  | { kind: 'stableRebound'; minutes: number; fraction: number };

export interface PolicySpec {
  id: string;
  phase: 1 | 3;
  family: 'CONTROL' | 'FIRST' | 'PERSIST' | 'STABLE' | 'REBOUND' | 'BAND';
  description: string;
  // Earliest decision, in New York minutes after midnight, for intraday events; null for CLOSE_1M only.
  earliestMinute: number | null;
  // An unconditional mechanism, or one mechanism per band (conditional policies).
  mechanism?: Mechanism;
  byBand?: Record<Band, Mechanism>;
}

const close: Mechanism = { kind: 'close' };
const stable15: Mechanism = { kind: 'stable', minutes: 15 };
const stable30: Mechanism = { kind: 'stable', minutes: 30 };

export const policies: readonly PolicySpec[] = [
  {
    id: 'CLOSE_1M',
    phase: 1,
    family: 'CONTROL',
    description: 'incumbent: one decision a minute before the close',
    earliestMinute: null,
    mechanism: close
  },
  {
    id: 'FIRST_0935',
    phase: 1,
    family: 'FIRST',
    description: 'first qualifying completed minute from 09:35',
    earliestMinute: 9 * 60 + 35,
    mechanism: { kind: 'first' }
  },
  {
    id: 'FIRST_1000',
    phase: 1,
    family: 'FIRST',
    description: 'first qualifying completed minute from 10:00',
    earliestMinute: 10 * 60,
    mechanism: { kind: 'first' }
  },
  {
    id: 'FIRST_1200',
    phase: 1,
    family: 'FIRST',
    description: 'first qualifying completed minute from 12:00',
    earliestMinute: 12 * 60,
    mechanism: { kind: 'first' }
  },
  {
    id: 'FIRST_1400',
    phase: 1,
    family: 'FIRST',
    description: 'first qualifying completed minute from 14:00',
    earliestMinute: 14 * 60,
    mechanism: { kind: 'first' }
  },
  {
    id: 'PERSIST_15',
    phase: 1,
    family: 'PERSIST',
    description: '15 consecutive qualifying minutes, from 10:00',
    earliestMinute: 10 * 60,
    mechanism: { kind: 'persist', minutes: 15 }
  },
  {
    id: 'PERSIST_30',
    phase: 1,
    family: 'PERSIST',
    description: '30 consecutive qualifying minutes, from 10:00',
    earliestMinute: 10 * 60,
    mechanism: { kind: 'persist', minutes: 30 }
  },
  {
    id: 'STABLE_15',
    phase: 1,
    family: 'STABLE',
    description: 'no new low for 15 minutes after the first qualifying minute, from 10:00',
    earliestMinute: 10 * 60,
    mechanism: stable15
  },
  {
    id: 'STABLE_30',
    phase: 1,
    family: 'STABLE',
    description: 'no new low for 30 minutes after the first qualifying minute, from 10:00',
    earliestMinute: 10 * 60,
    mechanism: stable30
  },
  {
    id: 'REBOUND_03',
    phase: 1,
    family: 'REBOUND',
    description: 'close 0.3% above the episode trough while still qualifying, from 10:00',
    earliestMinute: 10 * 60,
    mechanism: { kind: 'rebound', fraction: 0.003 }
  },
  {
    id: 'REBOUND_05',
    phase: 1,
    family: 'REBOUND',
    description: 'close 0.5% above the episode trough while still qualifying, from 10:00',
    earliestMinute: 10 * 60,
    mechanism: { kind: 'rebound', fraction: 0.005 }
  },
  {
    id: 'BAND_STABILIZE',
    phase: 3,
    family: 'BAND',
    description: 'SHALLOW close; MODERATE STABLE_15; DEEP STABLE_30; EXTREME STABLE_30 and REBOUND_05',
    earliestMinute: 10 * 60,
    byBand: {
      SHALLOW: close,
      MODERATE: stable15,
      DEEP: stable30,
      EXTREME: { kind: 'stableRebound', minutes: 30, fraction: 0.005 }
    }
  },
  {
    id: 'BAND_PERSIST',
    phase: 3,
    family: 'BAND',
    description: 'SHALLOW close; MODERATE PERSIST_15; DEEP PERSIST_30; EXTREME STABLE_30',
    earliestMinute: 10 * 60,
    byBand: {
      SHALLOW: close,
      MODERATE: { kind: 'persist', minutes: 15 },
      DEEP: { kind: 'persist', minutes: 30 },
      EXTREME: stable30
    }
  },
  {
    id: 'BAND_LATE_DEEP',
    phase: 3,
    family: 'BAND',
    description: 'SHALLOW close; MODERATE STABLE_15; DEEP close; EXTREME close',
    earliestMinute: 10 * 60,
    byBand: { SHALLOW: close, MODERATE: stable15, DEEP: close, EXTREME: close }
  }
];

export const policyById = (id: string) => {
  const policy = policies.find((candidate) => candidate.id === id);

  if (!policy) {
    throw new Error(`Unknown policy ${id}`);
  }

  return policy;
};

export const windows = {
  continuous: { start: '2016-10-07', end: '2025-10-13' },
  dev: { start: '2016-10-07', end: '2023-12-29' },
  forward: { start: '2024-01-02', end: '2025-10-13' }
} as const;

export const regimes = [
  { id: 'Q4_2018', start: '2018-10-01', end: '2018-12-31' },
  { id: 'COVID_2020', start: '2020-02-01', end: '2020-04-30' },
  { id: 'Y2022', start: '2022-01-01', end: '2022-12-31' },
  { id: 'SPRING_2025', start: '2025-02-01', end: '2025-04-30' }
] as const;

// The incumbent as the study ran it: src/app/allIn.ts at git a1600985, which the golden master runs (verified by
// sha256, src/lib/frozenSource.ts). The live file was changed deliberately after the study (new constants, the dataset
// plumbing); the helpers the engine imports from it are unchanged.
export const incumbentSource: FrozenSource = {
  file: 'src/app/allIn.ts',
  revision: 'a1600985',
  sha256: '71c5c327e8ef018066ad598ccc8532f68d28fa387b16577815f6782cf9ba70de'
};

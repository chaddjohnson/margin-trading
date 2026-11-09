// Short-term VGT dip recovery, Phase 1 (research/intraday-dip-recovery-vgt/PROTOCOL.md): the study's constants. The
// doors, chronology, economics, the parameter grid, the rule ladder (L0–L5) and the four structural families (F1–F4).
// Budgets and the resource contract live in budgets.ts and resources below; both are frozen with the protocol.
import path from 'node:path';

export const STUDY = 'intraday-dip-recovery-vgt';
export const studyDir = path.join('research', STUDY);
export const resultsDir = path.join(studyDir, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsDir, ...parts);
export const codeDir = 'src/intraday-dip-recovery';
export const cacheDir = path.join('.cache', STUDY);
export const protocolFile = path.join(studyDir, 'PROTOCOL.md');
export const amendmentsFile = path.join(studyDir, 'AMENDMENTS.md');
export const briefFile = path.join(studyDir, 'brief', 'BRIEF.md');
export const sealsLog = resultFile('seals.jsonl');
export const doorsLog = resultFile('doors.jsonl');
export const symbol = 'VGT';

// Every seed: deriveSeed('intraday-dip-recovery-vgt', ...labels).
export const seedOf = (...labels: (string | number)[]) => [STUDY, ...labels] as (string | number)[];

export const log = (message: string) => console.log(`[dip ${new Date().toISOString().slice(11, 19)}Z] ${message}`);

// §3 the canonical file and its physical doors. Each development door is a byte prefix of the file holding every row
// whose New York date is ≤ the door's last session; the pins equal Priority 2/3's VGT pins
// (src/vg-d1-growth-joint/context.ts doorSpecs) and D24 equals research/intraday-d1-vgt's development door. They are
// re-verified by size, sha256, row count and last-row time before any row is parsed.
export const dataFile = 'data/VGT/data.csv';
export const dataSha256 = '2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e';
export const dataBytes = 53395054;
export const dataRows = 935608;

export type DoorKey = 'P18' | 'D19' | 'D21' | 'D23' | 'D24' | 'FULL';

export interface PrefixDoor {
  key: Exclude<DoorKey, 'FULL'>;
  last: string; // the door's last New York date
  bytes: number;
  rows: number;
  sha256: string;
  lastRowUtc: string;
  sessions: number;
}

export const prefixDoors: Record<Exclude<DoorKey, 'FULL'>, PrefixDoor> = {
  // The pilot's pseudo-fold door (engineering only, never a study record): a prefix inside D19 through 2018-12-31.
  P18: {
    key: 'P18',
    last: '2018-12-31',
    bytes: 13701461,
    rows: 238132,
    sha256: 'ade20705224c62f87979c6a023e25c17b9c82352990cf8911962b496bb238277',
    lastRowUtc: '2018-12-31T21:28:00Z',
    sessions: 754
  },
  D19: {
    key: 'D19',
    last: '2019-12-31',
    bytes: 18374863,
    rows: 319486,
    sha256: 'a2e4c721eee98fd0ad1f96f413c99c953b3804fdfe033c4e44e866d31dce81d1',
    lastRowUtc: '2019-12-31T21:00:00Z',
    sessions: 1006
  },
  D21: {
    key: 'D21',
    last: '2021-12-31',
    bytes: 28414685,
    rows: 495874,
    sha256: '681742034cde1b9d52580b50b8f0c7f02d3c6bc54b9428f3f427a788f9a2a60e',
    lastRowUtc: '2021-12-31T21:57:00Z',
    sessions: 1511
  },
  D23: {
    key: 'D23',
    last: '2023-12-29',
    bytes: 37879762,
    rows: 663135,
    sha256: '920f3a20299b3241759fcc70b15045f4634ff3b7d423125c8abe87edbb5a812c',
    lastRowUtc: '2023-12-29T21:28:00Z',
    sessions: 2012
  },
  D24: {
    key: 'D24',
    last: '2024-12-31',
    bytes: 42469694,
    rows: 743918,
    sha256: 'c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb',
    lastRowUtc: '2024-12-31T21:11:00Z',
    sessions: 2264
  }
};

// §3 chronology. Accounting from the first session; one common arming date for every candidate and control (the
// first session with ≥ 10 sessions of history, the grid's longest lookback; research/intraday-d1-vgt's convention).
export const chronology = {
  firstSession: '2016-01-04',
  armFrom: '2016-02-01',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-01',
  validationFirstSession: '2025-01-02',
  endpoint: '2026-10-30', // the measured common complete endpoint (results/data/coverage.json)
  developmentYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  validationYears: [2025, 2026]
};

// §4 the earlier cutoffs and the C24 cutoff: training door, the evaluation door and the slice.
export interface Cutoff {
  key: 'P18' | 'C19' | 'C21' | 'C23' | 'C24';
  door: Exclude<DoorKey, 'FULL'>;
  end: string; // the last training session
  evalDoor: DoorKey;
  slice: [string, string]; // first and last session of the evaluation slice
}

export const cutoffs: Record<Cutoff['key'], Cutoff> = {
  P18: { key: 'P18', door: 'P18', end: '2018-12-31', evalDoor: 'D19', slice: ['2019-01-02', '2019-12-31'] }, // pilot
  C19: { key: 'C19', door: 'D19', end: '2019-12-31', evalDoor: 'D21', slice: ['2020-01-02', '2021-12-31'] },
  C21: { key: 'C21', door: 'D21', end: '2021-12-31', evalDoor: 'D23', slice: ['2022-01-03', '2023-12-29'] },
  C23: { key: 'C23', door: 'D23', end: '2023-12-29', evalDoor: 'D24', slice: ['2024-01-02', '2024-12-31'] },
  C24: { key: 'C24', door: 'D24', end: '2024-12-31', evalDoor: 'FULL', slice: ['2025-01-02', '2026-10-30'] }
};

// §5 economics. One fixed $100,000 notional per entry (no compounding), 11% simple interest on a 365-day year by
// calendar days between session dates (zero for a same-session round trip), 5 bps per side as the primary execution
// friction (in the entry price, so shares and every net test see it; on the exit price), stops at the stop level or
// the opening trade of a minute that opens through it, no stop slippage.
export const execution = {
  principal: 100_000,
  rate: 0.11,
  costBps: 5,
  stopFill: 'stop' as const,
  stopSlippageBps: 0,
  ceiling: 35_000
};

// §5 report-only stresses and cost scenarios (full causal replays; costs move decisions where nets are tested).
export const stresses = [
  { key: 'bps0', costBps: 0 },
  { key: 'bps2', costBps: 2 },
  { key: 'bps10', costBps: 10 },
  { key: 'bps20', costBps: 20 },
  { key: 'rate14', rate: 0.14 },
  { key: 'nextOpen', stopFill: 'next-open' as const },
  { key: 'slip25', stopSlippageBps: 25 },
  { key: 'minuteLow', stopFill: 'minute-low' as const }
] as const;

// §2 the rule switches. Every ladder rung and family is one setting of these five.
export interface Rules {
  stopWhileLosing: boolean; // false: D1's profit-conditioned activation, decided before each period
  samePeriod: boolean; // exits in the entry period; new entries after an exit within a period
  holdBuffer: boolean; // the maximum losing hold H and the buffered loss U
  continuation: boolean; // D1's post-profit continuation (P, W)
  ratchet: 'period' | 'minute'; // the stop's high: once per period, or after every completed minute
}

export const ladder: Record<'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5', Rules> = {
  L0: { stopWhileLosing: false, samePeriod: false, holdBuffer: true, continuation: true, ratchet: 'period' },
  L1: { stopWhileLosing: true, samePeriod: false, holdBuffer: true, continuation: true, ratchet: 'period' },
  L2: { stopWhileLosing: true, samePeriod: true, holdBuffer: true, continuation: true, ratchet: 'period' },
  L3: { stopWhileLosing: true, samePeriod: true, holdBuffer: false, continuation: true, ratchet: 'period' },
  L4: { stopWhileLosing: true, samePeriod: true, holdBuffer: false, continuation: false, ratchet: 'period' },
  L5: { stopWhileLosing: true, samePeriod: true, holdBuffer: false, continuation: false, ratchet: 'minute' }
};

export type FamilyKey = 'F1' | 'F2' | 'F3' | 'F4';
export const familyKeys: readonly FamilyKey[] = ['F1', 'F2', 'F3', 'F4'];

export const families: Record<FamilyKey, Rules & { name: string }> = {
  F1: { name: 'CORE', stopWhileLosing: true, samePeriod: true, holdBuffer: false, continuation: false, ratchet: 'minute' },
  F2: { name: 'CORE+C', stopWhileLosing: true, samePeriod: true, holdBuffer: false, continuation: true, ratchet: 'minute' },
  F3: { name: 'CORE+H/U', stopWhileLosing: true, samePeriod: true, holdBuffer: true, continuation: false, ratchet: 'minute' },
  F4: { name: 'CORE+C+H/U', stopWhileLosing: true, samePeriod: true, holdBuffer: true, continuation: true, ratchet: 'minute' }
};

export const rulesKey = (r: Rules) =>
  `${r.stopWhileLosing ? 'S' : 's'}${r.samePeriod ? 'P' : 'p'}${r.holdBuffer ? 'H' : 'h'}${r.continuation ? 'C' : 'c'}${r.ratchet === 'minute' ? 'M' : 'B'}`;

// §6 the grid. A vector is one integer index per key; values come from these tables only. The X, Y, S, H, L, U, P, W
// formulas are research/intraday-d1-vgt's (src/intraday-d1/context.ts), extended upward for X, Y and S, so every
// intraday-D1 vector is exactly representable at the same index; B adds the 1-minute level below that study's levels.
export type Key = 'B' | 'X' | 'Y' | 'S' | 'H' | 'L' | 'U' | 'P' | 'W';
export const keys: readonly Key[] = ['B', 'X', 'Y', 'S', 'H', 'L', 'U', 'P', 'W'];

export interface Axis {
  key: Key;
  name: string;
  unit: string;
  size: number;
  radius: number; // the neighbourhood radius in grid steps
  value: (index: number) => number;
  rationale: string;
}

const geometric = (base: number, ratio: number, digits: number) => (index: number) =>
  Number((base * ratio ** index).toFixed(digits));

export const periodLevels = [1, 5, 10, 15, 30, 65, 130] as const;

export const axes: Record<Key, Axis> = {
  B: {
    key: 'B',
    name: 'period length',
    unit: 'regular-session minutes per period (ordinal level)',
    size: periodLevels.length,
    radius: 1,
    value: (i) => periodLevels[i]!,
    rationale: 'the clock of the reference high, the hold and the continuation window: 1 minute to 130 (three periods a day)'
  },
  X: {
    key: 'X',
    name: 'dip from the reference high',
    unit: 'fraction',
    size: 80,
    radius: 3,
    value: geometric(0.001, 1.06, 7),
    rationale: '0.10% to 9.98% in 6% steps; intraday-D1 stopped at 4.96%, where its best region sat on the bound'
  },
  Y: {
    key: 'Y',
    name: 'rebound from the trailing low',
    unit: 'fraction',
    size: 80,
    radius: 3,
    value: geometric(0.0002, 1.06, 7),
    rationale: '0.02% (one median minute range) to 2.0% in 6% steps (intraday-D1: to 0.99%)'
  },
  S: {
    key: 'S',
    name: 'protective trailing stop',
    unit: 'fraction below the post-entry high',
    size: 80,
    radius: 3,
    value: geometric(0.0005, 1.06, 7),
    rationale: '0.05% to 4.99% in 6% steps (intraday-D1: to 2.48%); an unconditional stop needs room after deep dips'
  },
  H: {
    key: 'H',
    name: 'maximum losing hold',
    unit: 'scheduled regular-session minutes between period starts',
    size: 71,
    radius: 2,
    value: geometric(5, 1.1, 2),
    rationale: '5 to 3,949 trading minutes (≈ 10 sessions) in 10% steps (intraday-D1)'
  },
  L: {
    key: 'L',
    name: 'reference-high lookback',
    unit: 'regular-session minutes → the previous max(1, round(L/B)) periods',
    size: 64,
    radius: 2,
    value: geometric(10, 1.1, 2),
    rationale: '10 to 4,053 trading minutes (≈ 10 sessions) in 10% steps (intraday-D1)'
  },
  U: {
    key: 'U',
    name: 'buffered loss after the hold',
    unit: 'fraction of the investment',
    size: 151,
    radius: 5,
    value: (i) => Number((i / 10000).toFixed(4)),
    rationale: '0 to 1.50% in 1 bp steps (intraday-D1)'
  },
  P: {
    key: 'P',
    name: 'continuation pullback',
    unit: 'fraction below the post-exit high',
    size: 68,
    radius: 3,
    value: geometric(0.0005, 1.06, 7),
    rationale: '0.05% to 2.48% in 6% steps (intraday-D1)'
  },
  W: {
    key: 'W',
    name: 'continuation window',
    unit: 'regular-session minutes → max(1, round(W/B)) periods',
    size: 64,
    radius: 2,
    value: geometric(10, 1.1, 2),
    rationale: '10 to 4,053 trading minutes in 10% steps (intraday-D1)'
  }
};

// The genes each family uses; the others are inactive (canonical index 0, never part of identity).
export const activeKeys: Record<FamilyKey, readonly Key[]> = {
  F1: ['B', 'X', 'Y', 'S', 'L'],
  F2: ['B', 'X', 'Y', 'S', 'L', 'P', 'W'],
  F3: ['B', 'X', 'Y', 'S', 'L', 'H', 'U'],
  F4: ['B', 'X', 'Y', 'S', 'L', 'H', 'U', 'P', 'W']
};

// §7 protected strata: dip depth × lookback time scale (6 cells per family).
export const depthStrata = [
  { key: 'shallow', from: 0, to: 39, label: 'X < 1%' },
  { key: 'medium', from: 40, to: 58, label: '1% ≤ X < 3%' },
  { key: 'deep', from: 59, to: 79, label: 'X ≥ 3%' }
] as const;
// The scale stratum uses the effective lookback max(1, round(L/B)) × B (space.ts cellOf); the index ranges only guide
// the screen's draws (a draw whose canonical form falls in another cell is redrawn).
export const scaleStrata = [
  { key: 'intraday', from: 0, to: 39, label: 'effective lookback ≤ 390 minutes (within a session)' },
  { key: 'multi', from: 37, to: 63, label: 'effective lookback > 390 minutes (more than a session)' }
] as const;

// The daily D1 `primary` (config/phenotypes/D1/VGT.json), the native and harmonized control (never selectable).
export const dailyPrimary = {
  targetPercentChange: 0.216,
  trailingBuyPercentage: 0.003,
  trailingStopPercentage: 0.073,
  maximumHoldDays: 8,
  tickWindowSize: 74,
  intradayLossBuffer: 0.029,
  pullback: 0.09,
  continuationWindow: 60
};

// The completed intraday-D1 study's frozen shortlist (research/intraday-d1-vgt/results/qualify/qualification.json,
// sealed; "infeasible on training" fillers, no role holder), as indexes of that study's grid (B levels 5…130).
export const intradayD1Shortlist = [
  { id: 'id-5.1v.e.1f.1y.t.1y.6.1f', b: 5, x: 67, y: 14, s: 51, h: 70, l: 29, u: 70, p: 6, w: 51 },
  { id: 'id-5.1v.a.1f.1y.s.1q.6.1r', b: 5, x: 67, y: 10, s: 51, h: 70, l: 28, u: 62, p: 6, w: 63 },
  { id: 'id-5.1v.e.1f.1y.r.2o.5.1f', b: 5, x: 67, y: 14, s: 51, h: 70, l: 27, u: 96, p: 5, w: 51 },
  { id: 'id-5.1v.d.1f.1y.l.1f.4.1h', b: 5, x: 67, y: 13, s: 51, h: 70, l: 21, u: 51, p: 4, w: 53 }
] as const;

// Development-only diagnostics of the same study (results/report/diagnostics.json): the most profitable genuinely
// intraday archive configuration and the best configuration of each period length. Informed seeds, not incumbents.
export const intradayD1Diagnostics = [
  'id-2.k.1v.19.1q.19.1b.v.1p', // intradayRegion (B15, X 0.32%)
  'id-0.1p.17.1q.1r.9.2b.17.1f', // bestPerB B5
  'id-1.1o.11.1r.1t.9.23.19.17', // bestPerB B10
  'id-2.1s.1i.1p.1s.h.1c.14.16', // bestPerB B15
  'id-3.1p.15.1h.1s.5.1.h.k', // bestPerB B30
  'id-4.1u.1l.1r.1m.r.2.l.1o', // bestPerB B65
  'id-5.1v.a.1d.1y.i.2i.i.1n' // bestPerB B130
] as const;

// The B4/B5 robustness audit (research/b4-b5-robustness-audit/PROTOCOL.md): every constant of the frozen protocol —
// the distance rules, the legal grid, the sampling seeds, the cost scenarios, the regime windows and the gate
// thresholds — declared here so the code and the protocol can be compared line by line. Nothing in this study writes to
// config/, data/ or any file bound by the prospective B4/B5 freeze; every variant is diagnostic-only.
import path from 'node:path';
import { specs } from '../d1-refinement/families.ts';
import type { D1Key } from '../multi-etf-allocator/phenotypes.ts';

export {
  formatDollars,
  formatSigned,
  hasFlag,
  jsonReplacer,
  nowIso,
  option,
  readJson,
  writeJson,
  writeText
} from '../portfolio-aware-d1/context.ts';

export const studyLabel = 'b4-b5-robustness-audit-v1';
export const researchRoot = 'research/b4-b5-robustness-audit';
export const resultsRoot = path.join(researchRoot, 'results');
export const resultDir = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const protocolFreezeFile = path.join(researchRoot, 'PROTOCOL_FREEZE.json');
export const protocolSha256 = '739134130ef2f058303422dda0cb90abff16372c8bdb19bb8757dbfabd2d95bf';
export const templatesRoot = path.join(researchRoot, 'templates');

export const poolIds = ['B4', 'B5'] as const;
export type PoolId = (typeof poolIds)[number];

// The pools' frozen run conventions (config/pools/B4.json, B5.json), restated so a drift is caught by the tests.
export const base = {
  rate: 0.11,
  costBps: 5,
  stopSlippageBps: 0,
  stopFill: 'stop' as const,
  dividends: 'frozen' as const,
  notional: 100000,
  initialEquity: 300000,
  borrowedFraction: 0.2,
  firstEligibleDate: '2017-06-15',
  first: '2016-01-04',
  end: '2026-10-13',
  sessions: 2710
};

// The regression anchors (PROTOCOL.md §2): cents for money, 0.01 pp for percentages.
export const anchors: Record<
  PoolId,
  { net: number; minuteDrawdown: number; lots: number; endEquity: number; dailyPercent: number }
> = {
  B4: { net: 284244.74, minuteDrawdown: 28659.34, lots: 76, endEquity: 3608484.05, dailyPercent: 0.3465 },
  B5: { net: 486207.77, minuteDrawdown: 26509.97, lots: 94, endEquity: 5410976.72, dailyPercent: 0.2967 }
};

// ----- Workstream A: distances and the legal grid (PROTOCOL.md §3) -----

export const percentKeys: ReadonlySet<D1Key> = new Set([
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'intradayLossBuffer',
  'pullback'
]);

export const shortNames: Record<D1Key, string> = {
  targetPercentChange: 'X',
  trailingBuyPercentage: 'Y',
  trailingStopPercentage: 'stop',
  maximumHoldDays: 'hold',
  tickWindowSize: 'L',
  intradayLossBuffer: 'buffer',
  pullback: 'P',
  continuationWindow: 'W'
};

// The engine's admissible grid (src/d1-refinement/families.ts), in grid units.
export const legal = (key: D1Key) => ({ min: specs[key].min, max: specs[key].max });

// Half-up rounding to the grid (tenths of a point, or whole days/sessions).
export const roundHalfUp = (value: number) => Math.floor(value + 0.5 + 1e-9);

// Small and moderate distances of one frozen value v, in grid units.
export const distancesOf = (key: D1Key, v: number): { small: number; moderate: number; rule: string } => {
  if (percentKeys.has(key)) {
    if (v >= 20) {
      return { small: 5, moderate: 10, rule: '±0.5 / ±1.0 pp' };
    }

    return {
      small: Math.max(1, roundHalfUp(0.25 * v)),
      moderate: Math.max(2, roundHalfUp(0.5 * v)),
      rule: 'v < 2.0%: ±max(0.1 pp, 25%·v) / ±max(0.2 pp, 50%·v)'
    };
  }

  const small = Math.max(1, roundHalfUp(0.1 * v));

  return { small, moderate: Math.max(small + 1, roundHalfUp(0.2 * v)), rule: '±max(1, 10%·v) / ±max(s+1, 20%·v)' };
};

export const offsetLabels = ['-m', '-s', '+s', '+m'] as const;
export type OffsetLabel = (typeof offsetLabels)[number];

// The supplementary boundary probes: upward X points outside the grid (excluded from every gate statistic).
export const boundaryProbes: { symbol: string; key: D1Key }[] = [
  { symbol: 'XBI', key: 'targetPercentChange' },
  { symbol: 'KRE', key: 'targetPercentChange' }
];

export const jointSamples = 64;
export const jointSeeds = [1, 2] as const;
export const bookSamples = 32;

// ----- Workstream D: cost scenarios (PROTOCOL.md §6) -----

export interface CostScenario {
  id: string;
  label: string;
  rate: number;
  costBps: number;
  feeBps: number; // the fee/spread layer of costBps
  slippageBps: number; // the additional fill slippage layer of costBps
  stopSlippageBps: number;
  stopFill: 'stop' | 'next-open';
  group: 'base' | 'rate' | 'friction' | 'stop' | 'combined';
}

const scenario = (
  id: string,
  label: string,
  group: CostScenario['group'],
  rate: number,
  feeBps: number,
  slippageBps: number,
  stopSlippageBps = 0,
  stopFill: CostScenario['stopFill'] = 'stop'
): CostScenario => ({
  id,
  label,
  group,
  rate,
  costBps: feeBps + slippageBps,
  feeBps,
  slippageBps,
  stopSlippageBps,
  stopFill
});

export const costScenarios: CostScenario[] = [
  scenario('base', 'base: 11%, 5 bps', 'base', 0.11, 5, 0),
  scenario('r08', 'financing 8%', 'rate', 0.08, 5, 0),
  scenario('r14', 'financing 14%', 'rate', 0.14, 5, 0),
  scenario('r18', 'financing 18%', 'rate', 0.18, 5, 0),
  scenario('f00', 'friction 0 bps/side', 'friction', 0.11, 0, 0),
  scenario('f02', 'friction 2 bps/side', 'friction', 0.11, 2, 0),
  scenario('f10', 'friction 10 bps/side (10 fee, or 5 fee + 5 slippage)', 'friction', 0.11, 10, 0),
  scenario('f15', 'friction 15 bps/side (5 fee + 10 slippage)', 'friction', 0.11, 5, 10),
  scenario('f20', 'friction 20 bps/side (20 fee, or 10 fee + 10 slippage)', 'friction', 0.11, 20, 0),
  scenario('f30', 'friction 30 bps/side (5 fee + 25 slippage)', 'friction', 0.11, 5, 25),
  scenario('f45', 'friction 45 bps/side (20 fee + 25 slippage)', 'friction', 0.11, 20, 25),
  scenario('s10', 'stop overshoot 10 bps', 'stop', 0.11, 5, 0, 10),
  scenario('s25', 'stop overshoot 25 bps', 'stop', 0.11, 5, 0, 25),
  scenario('s50', 'stop overshoot 50 bps', 'stop', 0.11, 5, 0, 50),
  scenario('s100', 'stop overshoot 100 bps', 'stop', 0.11, 5, 0, 100),
  scenario('nxo', 'stops fill at the next trade after the trigger minute', 'stop', 0.11, 5, 0, 0, 'next-open'),
  scenario('C1', 'combined: 14% + 10 fee + 10 slippage', 'combined', 0.14, 10, 10),
  scenario('C2', 'combined: 18% + 20 fee + 25 slippage', 'combined', 0.18, 20, 25),
  scenario('C3', 'combined: 18% + 20 fee + 25 slippage + 50 bps stop overshoot', 'combined', 0.18, 20, 25, 50)
];

export const scenarioById = (id: string) => {
  const found = costScenarios.find((item) => item.id === id);

  if (!found) {
    throw new Error(`no cost scenario ${id}`);
  }

  return found;
};

// ----- Workstream B: regimes (PROTOCOL.md §4), close to close -----

export interface Window {
  id: string;
  label: string;
  from: string; // the close attribution starts from (exclusive)
  to: string; // the close attribution ends at (inclusive)
  kind: 'stress' | 'rebound' | 'calendar' | 'correction';
  regime?: string;
}

export const regimeWindows: Window[] = [
  { id: 'R1s', regime: 'R1', label: '2018 Q4 selloff — stress', from: '2018-10-01', to: '2018-12-24', kind: 'stress' },
  {
    id: 'R1r',
    regime: 'R1',
    label: '2018 Q4 selloff — rebound',
    from: '2018-12-24',
    to: '2019-04-23',
    kind: 'rebound'
  },
  { id: 'R2s', regime: 'R2', label: '2020 crash — stress', from: '2020-02-19', to: '2020-03-23', kind: 'stress' },
  { id: 'R2r', regime: 'R2', label: '2020 crash — rebound', from: '2020-03-23', to: '2020-07-02', kind: 'rebound' },
  { id: 'R3s', regime: 'R3', label: '2022 bear market — stress', from: '2021-12-27', to: '2022-10-14', kind: 'stress' },
  {
    id: 'R3r',
    regime: 'R3',
    label: '2022 bear market — rebound',
    from: '2022-10-14',
    to: '2024-03-20',
    kind: 'rebound'
  },
  { id: 'R4s', regime: 'R4', label: '2025 selloff — stress', from: '2025-02-19', to: '2025-04-08', kind: 'stress' },
  { id: 'R4r', regime: 'R4', label: '2025 selloff — rebound', from: '2025-04-08', to: '2025-06-24', kind: 'rebound' },
  { id: 'Y2023', label: '2023 recovery (calendar 2023)', from: '2022-12-30', to: '2023-12-29', kind: 'calendar' },
  { id: 'Y2026', label: '2026 partial (to 2026-10-13)', from: '2025-12-31', to: '2026-10-13', kind: 'calendar' },
  { id: 'K1', label: '≥10% correction 2020-09', from: '2020-09-02', to: '2020-09-23', kind: 'correction' },
  { id: 'K2', label: '≥10% correction 2024-07/08', from: '2024-07-10', to: '2024-08-05', kind: 'correction' },
  { id: 'K3', label: '≥10% correction 2025-10 → 2026-03', from: '2025-10-29', to: '2026-03-30', kind: 'correction' }
];

// ----- Workstream F and gates (PROTOCOL.md §8, §10) -----

export const schedules = ['U35', 'U50', 'U60', 'L50', 'L60', 'G50', 'G60'] as const;

export const gates = {
  stabilityProfitableShare: 0.75,
  stabilityMedianRatio: 0.5,
  concentrationShare: 0.5,
  gdxSmallCostScenarios: ['r14', 'f10', 'f15', 's25', 'C1'],
  gdxSingleShare: 0.5,
  riskPreferred: 0.3,
  riskTolerance: 0.35,
  riskScenarios: ['base', 'C1', 'C2', 'C3'],
  moderateCostScenarios: ['r14', 'f15', 'f20', 'C1'],
  costFallShare: 0.5,
  accountingTolerance: 0.01
};

export const bootstrap = { blockLength: 21, resamples: 5000 };

// Node 24 is required (.node-version); the study refuses to run elsewhere so a record never mixes runtimes.
export const requireNode24 = () => {
  if (!process.version.startsWith('v24.')) {
    throw new Error(`Node ${process.version}: this study runs on v24.21.0 (.node-version)`);
  }
};

// Fixed settings of the VGT drawdown-regime / entry-risk study (research/vgt-drawdown-entry-risk).

export const researchDir = 'research/vgt-drawdown-entry-risk';
export const resultsDir = `${researchDir}/results`;
export const chartsDir = `${researchDir}/charts`;

// The primary VGT series: Stooq history extended through 2026-10-13 (equal to data/VGT/VGT-2016-2026.csv
// over that file's range). See BASELINE_AUDIT.md.
export const vgtFile = 'data/VGT/VGT-2005-2026.csv';
export const stooqFile = (symbol: string) => `data/stooq/processed/${symbol}/${symbol}-stooq-daily.csv`;
export const vixFile = `${researchDir}/data/raw/cboe/VIX_History.csv`;

// Research calendar. Warm-up history before studyStart only feeds indicators and the reference high.
export const studyStart = '2014-01-02';
export const developmentEnd = '2022-12-30';
export const holdoutStart = '2023-01-03';
// The pre-2014 VGT history is an external stress test only, never used for selection.
export const stressStart = '2006-01-03';
export const stressEnd = '2013-12-31';

// Cross-ETF confirmation proxies for VGT (labelled breadth proxies, not constituent breadth). IWN, the
// Russell 2000 Value ETF, is the only small-cap series available.
export const proxySymbols = ['QQQ', 'SOXX', 'IGV', 'SPY', 'IWN'];
// External robustness ETFs, tested with frozen rules only.
export const robustnessSymbols = ['QQQ', 'VOOG', 'SOXX', 'IGV', 'XLY', 'IWN'];

export interface StrategySettings {
  investment: number; // margin borrowed per position
  marginRate: number; // annual simple interest
  dip: number; // entry drawdown from the reference high
  trailingStop: number;
  maximumHoldDays: number; // calendar days
  lookback: number; // sessions in the reference-high window
  materialLoss: number; // price loss that restricts re-entry
  lowerReentry: number; // extra decline below the loss exit required to re-enter
  retrace: number; // recovery fraction that resets the restriction
  costBps: number; // per-side cost applied to fills (P&L only; decisions use market prices)
}

export const baselineSettings: Readonly<StrategySettings> = Object.freeze({
  investment: 100000,
  marginRate: 0.11,
  dip: 0.1,
  trailingStop: 0.08,
  maximumHoldDays: 15,
  lookback: 90,
  materialLoss: 0.005,
  lowerReentry: 0.03,
  retrace: 0.38,
  costBps: 0
});

// Event-study thresholds and horizons.
export const severeThresholds = [0.15, 0.2, 0.25, 0.3];
export const labelHorizons = [10, 20, 40, 60];
export const maeHorizons = [5, 10, 15, 20, 40, 60];
export const primaryThreshold = 0.2;
export const primaryHorizon = 40;

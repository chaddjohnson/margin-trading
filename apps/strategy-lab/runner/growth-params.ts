// The mapping from a Growth run request (flat schema values, shared/strategies.ts) to the engine's parameters
// (src/growth-trading/riseTrading.ts). Shared by the trading runner, the replay tool and the tests.
//
// A request is read with the schema of ITS OWN version: 1.0.0 has no continuation and no entry gates (all OFF); 1.1.0
// has continuation but no entry gates (both OFF); 1.2.0 has all three; 1.3.0 adds the entry-method selector (Rise |
// trend breakout), the initial risk stop and trend retention (absent before 1.3.0: the Rise entry, both OFF). Only
// effective values are executed (shared/params.ts), so a stored draft of another method or policy — or a value whose
// switch is OFF — can never leak into the run, and a request that carries ONLY the effective values (what Interactive
// Preview executes) maps to the same engine parameters as one that also carries those drafts.

import { isSignalResolution } from '../../../src/entry-signals/bars.ts';
import type { ContinuationConfig, ContinuationMethod } from '../../../src/growth-trading/continuation.ts';
import type {
  EligibilityConfig,
  EligibilityPolicy,
  TrendFilterConfig,
  TrendMethod
} from '../../../src/growth-trading/entryGates.ts';
import type {
  BreakoutEntryConfig,
  EntryMethod,
  InitialStopConfig,
  RetentionConfig
} from '../../../src/growth-trading/optionalRules.ts';
import type { RiseTradingParams } from '../../../src/growth-trading/riseTrading.ts';
import type { LabRunRequest, ParamValue } from '../shared/contract.ts';
import { effectiveParams } from '../shared/params.ts';
import { findStrategy } from '../shared/strategies.ts';

const effectiveOf = (request: LabRunRequest): Record<string, ParamValue> => {
  const spec = findStrategy(request.strategyKey, request.strategyVersion);
  if (!spec) throw new Error(`unknown strategy ${request.strategyKey}@${request.strategyVersion}`);
  return effectiveParams(spec, request.params);
};

// The continuation configuration a request EXECUTES. A legacy 1.0.0 request has no continuation fields: OFF.
export const continuationOf = (request: LabRunRequest): ContinuationConfig | null => {
  const p = effectiveOf(request);
  if (p.continuationEnabled !== true) return null;
  const n = (k: string) => p[k] as number;
  const windowSessions = n('continuationWindowSessions');
  switch (p.continuationMethod as ContinuationMethod) {
    case 'classic_d1':
      return { method: 'classic_d1', windowSessions, pullbackPercent: n('classicPullbackPercent'), reboundPercent: n('classicReboundPercent') };
    case 'breakout':
      return { method: 'breakout', windowSessions, bufferPercent: n('breakoutBufferPercent'), formationBars: n('breakoutFormationBars') };
    case 'shallow_pullback':
      return {
        method: 'shallow_pullback',
        windowSessions,
        smaBars: n('uptrendSmaBars'),
        slopeBars: n('uptrendSlopeBars'),
        minimumRisePercent: n('uptrendMinimumRisePercent'),
        pullbackMinimumPercent: n('pullbackMinimumPercent'),
        pullbackMaximumPercent: n('pullbackMaximumPercent'),
        recoveryPercent: n('recoveryPercent')
      };
    case 'ma_cross':
      return {
        method: 'ma_cross',
        windowSessions,
        smaBars: n('crossSmaBars'),
        risingBars: n('crossRisingBars'),
        minimumSlopePercent: n('crossMinimumSlopePercent'),
        marginPercent: n('crossMarginPercent')
      };
    default:
      throw new Error(`unknown continuation method ${String(p.continuationMethod)}`);
  }
};

// The entry trend filter a request executes (1.2.0; absent in earlier versions: OFF).
export const trendFilterOf = (request: LabRunRequest): TrendFilterConfig | null => {
  const p = effectiveOf(request);
  if (p.trendFilterEnabled !== true) return null;
  const n = (k: string) => p[k] as number;
  switch (p.trendMethod as TrendMethod) {
    case 'price_change':
      return { method: 'price_change', lookbackSessions: n('trendChangeLookbackSessions'), minimumReturnPercent: n('trendChangeMinimumReturnPercent') };
    case 'regression_slope':
      return { method: 'regression_slope', lookbackSessions: n('trendSlopeLookbackSessions'), minimumSlopePercent: n('trendSlopeMinimumPercent') };
    case 'rising_sma':
      return { method: 'rising_sma', movingAverageSessions: n('trendSmaSessions'), slopeComparisonSessions: n('trendSmaComparisonSessions') };
    case 'higher_highs_lows':
      return {
        method: 'higher_highs_lows',
        lookbackSessions: n('trendStructureLookbackSessions'),
        minimumStructureIncreasePercent: n('trendStructureMinimumIncreasePercent')
      };
    case 'momentum':
      return {
        method: 'momentum',
        shortLookbackSessions: n('trendMomentumShortSessions'),
        longLookbackSessions: n('trendMomentumLongSessions'),
        minimumShortReturnPercent: n('trendMomentumMinimumShortReturnPercent'),
        minimumLongReturnPercent: n('trendMomentumMinimumLongReturnPercent')
      };
    default:
      throw new Error(`unknown trend method ${String(p.trendMethod)}`);
  }
};

// The persistent entry eligibility a request executes (1.2.0; absent in earlier versions: OFF).
export const eligibilityOf = (request: LabRunRequest): EligibilityConfig | null => {
  const p = effectiveOf(request);
  if (p.eligibilityEnabled !== true) return null;
  const n = (k: string) => p[k] as number;
  const maxAgeSessions = n('eligibilityMaxAgeSessions');
  switch (p.eligibilityPolicy as EligibilityPolicy) {
    case 'time_limited':
      return { policy: 'time_limited', maxAgeSessions };
    case 'minimum_strength':
      return { policy: 'minimum_strength', maxAgeSessions, minimumAdvancePercent: n('eligibilityMinimumAdvancePercent') };
    case 'maximum_extension':
      return { policy: 'maximum_extension', maxAgeSessions, maximumExtensionPercent: n('eligibilityMaximumExtensionPercent') };
    case 'deterioration':
      return { policy: 'deterioration', maxAgeSessions, deteriorationDropPercent: n('eligibilityDeteriorationDropPercent') };
    case 'reset_renew':
      return {
        policy: 'reset_renew',
        maxAgeSessions,
        resetDropPercent: n('eligibilityResetDropPercent'),
        renewalReboundPercent: n('eligibilityRenewalReboundPercent')
      };
    default:
      throw new Error(`unknown eligibility policy ${String(p.eligibilityPolicy)}`);
  }
};

// 1.3.0: the base entry method a request executes (absent in earlier versions: the Rise entry).
export const entryMethodOf = (request: LabRunRequest): EntryMethod =>
  (effectiveOf(request).entryMethod as EntryMethod | undefined) ?? 'rise_from_recent_low';

// 1.3.0: the trend-breakout inputs (null with the Rise entry).
export const breakoutOf = (request: LabRunRequest): BreakoutEntryConfig | null => {
  const p = effectiveOf(request);
  if (p.entryMethod !== 'trend_breakout') return null;
  return {
    smaSessions: p.breakoutSmaSessions as number,
    slopeComparisonSessions: p.breakoutSlopeComparisonSessions as number,
    priorHighSessions: p.breakoutPriorHighSessions as number
  };
};

// 1.3.0: the initial risk stop (absent in earlier versions: OFF).
export const initialStopOf = (request: LabRunRequest): InitialStopConfig | null => {
  const p = effectiveOf(request);
  if (p.initialStopEnabled !== true) return null;
  return { atrSessions: p.initialStopAtrSessions as number, atrMultiple: p.initialStopAtrMultiple as number };
};

// 1.3.0: trend retention (absent in earlier versions: OFF).
export const retentionOf = (request: LabRunRequest): RetentionConfig | null => {
  const p = effectiveOf(request);
  if (p.retentionEnabled !== true) return null;
  return {
    sellPercent: p.retentionSellPercent as number,
    smaSessions: p.retentionSmaSessions as number,
    closesBelow: p.retentionClosesBelow as number
  };
};

// Every engine value comes from the EFFECTIVE values: a value whose switch is OFF is absent there and is passed as
// NaN (never read by the engine: exitParamsOf uses ∞ for an OFF hold or buffer), and a switch that does not apply is
// OFF. A stored 1.0.0–1.2.0 request with its drafts and the same request reduced to its effective values therefore
// execute identically — the "intraday-loss buffer OFF" preview failure of 1.2.0 cannot recur.
export const paramsOf = (request: LabRunRequest): RiseTradingParams => {
  const p = effectiveOf(request);
  if (!isSignalResolution(request.resolution)) throw new Error(`unsupported resolution ${request.resolution}`);
  const n = (k: string) => (typeof p[k] === 'number' ? (p[k] as number) : NaN);
  const method = entryMethodOf(request);
  const breakout = breakoutOf(request);
  const initialStop = initialStopOf(request);
  const retention = retentionOf(request);
  return {
    advanceFromRecentLowPercent: n('advanceFromRecentLowPercent'),
    recentLowLookbackBars: n('recentLowLookbackBars'),
    resolution: request.resolution,
    trailingStopPercent: n('trailingStopPercent'),
    maximumHoldEnabled: p.maximumHoldEnabled === true,
    maximumHoldDays: n('maximumHoldDays'),
    intradayLossBufferEnabled: p.intradayLossBufferEnabled === true,
    intradayLossBufferPercent: n('intradayLossBufferPercent'),
    costBpsPerSide: n('costBpsPerSide'),
    continuation: continuationOf(request),
    trendFilter: trendFilterOf(request),
    eligibility: eligibilityOf(request),
    // 1.3.0 fields only when they differ from the earlier versions' behaviour (so a legacy request maps exactly as before)
    ...(method !== 'rise_from_recent_low' ? { entryMethod: method, breakout } : {}),
    ...(initialStop ? { initialStop } : {}),
    ...(retention ? { retention } : {})
  };
};

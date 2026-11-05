// The mapping from a Growth run request (flat schema values, shared/strategies.ts) to the engine's parameters
// (src/growth-trading/riseTrading.ts). Shared by the trading runner, the replay tool and the tests.
//
// A request is read with the schema of ITS OWN version: 1.0.0 has no continuation and no entry gates (all OFF); 1.1.0
// has continuation but no entry gates (both OFF); 1.2.0 has all three. Only effective values are executed
// (shared/params.ts), so a stored draft of another method or policy can never leak into the run.

import { isSignalResolution } from '../../../src/entry-signals/bars.ts';
import type { ContinuationConfig, ContinuationMethod } from '../../../src/growth-trading/continuation.ts';
import type {
  EligibilityConfig,
  EligibilityPolicy,
  TrendFilterConfig,
  TrendMethod
} from '../../../src/growth-trading/entryGates.ts';
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

export const paramsOf = (request: LabRunRequest): RiseTradingParams => {
  const p = request.params;
  if (!isSignalResolution(request.resolution)) throw new Error(`unsupported resolution ${request.resolution}`);
  return {
    advanceFromRecentLowPercent: p.advanceFromRecentLowPercent as number,
    recentLowLookbackBars: p.recentLowLookbackBars as number,
    resolution: request.resolution,
    trailingStopPercent: p.trailingStopPercent as number,
    maximumHoldEnabled: p.maximumHoldEnabled as boolean,
    maximumHoldDays: p.maximumHoldDays as number,
    intradayLossBufferEnabled: p.intradayLossBufferEnabled as boolean,
    intradayLossBufferPercent: p.intradayLossBufferPercent as number,
    costBpsPerSide: p.costBpsPerSide as number,
    continuation: continuationOf(request),
    trendFilter: trendFilterOf(request),
    eligibility: eligibilityOf(request)
  };
};

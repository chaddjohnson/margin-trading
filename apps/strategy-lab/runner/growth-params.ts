// The mapping from a Growth run request (flat schema values, shared/strategies.ts) to the engine's parameters
// (src/growth-trading/riseTrading.ts). Shared by the trading runner, the replay tool and the tests.

import { isSignalResolution } from '../../../src/entry-signals/bars.ts';
import type { ContinuationConfig, ContinuationMethod } from '../../../src/growth-trading/continuation.ts';
import { type RiseTradingParams, STRATEGY_VERSION } from '../../../src/growth-trading/riseTrading.ts';
import type { LabRunRequest } from '../shared/contract.ts';
import { effectiveParams } from '../shared/params.ts';
import { RISE_FROM_RECENT_LOW_TRADING } from '../shared/strategies.ts';

// The continuation configuration a request EXECUTES: its effective values only (shared/params.ts), so a stored draft of
// another method can never leak into the run. A legacy 1.0.0 request has no continuation fields: continuation OFF.
export const continuationOf = (request: LabRunRequest): ContinuationConfig | null => {
  if (request.strategyVersion !== STRATEGY_VERSION) return null;
  const p = effectiveParams(RISE_FROM_RECENT_LOW_TRADING, request.params);
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
    continuation: continuationOf(request)
  };
};


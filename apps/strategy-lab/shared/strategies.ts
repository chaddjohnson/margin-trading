// Registry of the strategies Strategy Lab can execute as a manual single test, with their parameter schemas. Pure
// data and validation (no engine code), so the browser form and the server validator share one definition.

import type { LabRunRequest, ParamSpec, ParamValue, Resolution, StrategySpec } from './contract.ts';

export const RISE_FROM_RECENT_LOW: StrategySpec = {
  key: 'rise-from-recent-low',
  version: '1.0.0',
  title: 'Rise from recent low (entry signal)',
  kind: 'entry_signal',
  runnable: true,
  description:
    'Signal-only. Fires once, on the completed bar whose close first rises to at least X% above the lowest low of ' +
    'the last N completed bars (this bar included), after having been below that level on the previous bar. It ' +
    'rearms only after the advance falls back below X%. No exits, no positions, no P&L.',
  params: [
    {
      key: 'advanceFromRecentLowPercent',
      label: 'Advance from recent low (X)',
      description:
        'Minimum rise of the completed bar’s close above the rolling low, in percent. The signal fires on the first ' +
        'bar at or above this level after a bar below it.',
      type: 'number',
      unit: 'percent',
      default: 5,
      min: 0.1,
      max: 100,
      step: 0.1
    },
    {
      key: 'recentLowLookbackBars',
      label: 'Recent-low lookback (N)',
      description:
        'Number of completed bars of the selected resolution in the rolling low, the current bar included. Counts ' +
        'bars present in the data (session gaps and missing minutes are not imputed).',
      type: 'integer',
      unit: 'bars',
      default: 20,
      min: 2,
      max: 5000,
      step: 1
    }
  ],
  resolutions: ['1d', '60m', '30m', '15m', '5m', '1m'],
  defaultResolution: '1d'
};

// The growth-following trading backtest: the SAME scanner and signals as above as its only entry, executed all-in/flat
// with the D1 exit manager (src/growth-trading/riseTrading.ts, docs/strategy-lab/GROWTH_TRADING.md). Defaults: the
// registered VGT D1 baseline exits (config/phenotypes/D1/VGT.json `primary`), illustrative — not optimised.
export const RISE_FROM_RECENT_LOW_TRADING: StrategySpec = {
  key: 'rise-from-recent-low-trading',
  version: '1.0.0',
  title: 'Rise from recent low (trading backtest)',
  kind: 'trades',
  runnable: true,
  description:
    'Trading backtest. Buys (all-in, one position, $100,000 fixed notional) on each Rise-from-Recent-Low signal while ' +
    'flat, at the next eligible trade after the signal bar completes; signals while invested are recorded as ' +
    'ignored. Exits: the D1 profit-conditional trailing stop, plus (optional) the maximum losing hold and the ' +
    'buffered intraday-loss exit. Re-entry needs only a fresh signal: no lower-price test, loss restriction or reset.',
  params: [
    { ...RISE_FROM_RECENT_LOW.params[0]!, group: 'entry' },
    { ...RISE_FROM_RECENT_LOW.params[1]!, group: 'entry' },
    {
      key: 'trailingStopPercent',
      label: 'Trailing stop',
      description:
        'Always on. The stop sits this far below the highest price since the fill (raised after each session, never ' +
        'lowered) and is ACTIVE only on sessions where selling at the stop would be profitable after interest; a ' +
        'losing position has no active stop. Fills at the stop price, or at the opening trade after a gap through it.',
      type: 'number',
      unit: 'percent',
      default: 7.3,
      min: 0.1,
      max: 50,
      step: 0.1,
      group: 'exit'
    },
    {
      key: 'maximumHoldEnabled',
      label: 'Maximum losing hold',
      description:
        'From the given calendar-day age, a position whose opening trade shows a net loss (after interest) is sold at ' +
        'the next trade after the open. A profitable position may stay longer. Off: no loss exit at all.',
      type: 'boolean',
      unit: 'text',
      default: true,
      min: 0,
      max: 1,
      step: 1,
      group: 'exit'
    },
    {
      key: 'maximumHoldDays',
      label: 'Maximum losing hold age',
      description: 'Calendar days from the fill session’s date (weekends and holidays count).',
      type: 'integer',
      unit: 'days',
      default: 8,
      min: 1,
      max: 3650,
      step: 1,
      group: 'exit',
      dependsOn: 'maximumHoldEnabled'
    },
    {
      key: 'intradayLossBufferEnabled',
      label: 'Buffered intraday-loss exit',
      description:
        'Only from the maximum-hold age: sells after the first completed minute whose close puts the net P&L (after ' +
        'interest) at or below −buffer × $100,000, at the next eligible trade. Requires the maximum losing hold.',
      type: 'boolean',
      unit: 'text',
      default: true,
      min: 0,
      max: 1,
      step: 1,
      group: 'exit',
      dependsOn: 'maximumHoldEnabled'
    },
    {
      key: 'intradayLossBufferPercent',
      label: 'Intraday loss buffer',
      description:
        'Percent of the $100,000 invested notional, on net P&L after interest — not a price decline (2.9% = −$2,900).',
      type: 'number',
      unit: 'percent',
      default: 2.9,
      min: 0,
      max: 50,
      step: 0.1,
      group: 'exit',
      dependsOn: 'intradayLossBufferEnabled'
    },
    {
      key: 'costBpsPerSide',
      label: 'Transaction cost per side',
      description: 'Charged on every fill (5 bps = the Study 8 pools convention). No separate commission.',
      type: 'number',
      unit: 'bps',
      default: 5,
      min: 0,
      max: 100,
      step: 0.5,
      group: 'execution'
    }
  ],
  resolutions: RISE_FROM_RECENT_LOW.resolutions,
  defaultResolution: '1d',
  notes: [
    'Fixed $100,000 notional per trade, never compounded; 11% simple annual margin interest per calendar day (365-day year).',
    'Stops fill at the stop price (no extra slippage) or at the gapped opening trade; minute-bar prices, no bid-ask spread.',
    'A position never exits on its entry session; an open position at the end is marked at the last close (not closed).',
    'Several symbols = independent standalone backtests, one per symbol, never summed or shared-capital.'
  ]
};

export const RUNNABLE_STRATEGIES: readonly StrategySpec[] = [RISE_FROM_RECENT_LOW, RISE_FROM_RECENT_LOW_TRADING];

export function findStrategy(key: string, version: string): StrategySpec | undefined {
  return RUNNABLE_STRATEGIES.find((s) => s.key === key && s.version === version);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SYMBOL = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;
export const MAX_SYMBOLS_PER_RUN = 8;
export const MAX_TITLE_LENGTH = 160;

export function validateParam(spec: ParamSpec, value: unknown): string | null {
  if (spec.type === 'boolean') return typeof value === 'boolean' ? null : `${spec.label}: must be on or off (true/false)`;
  if (typeof value !== 'number' || !Number.isFinite(value)) return `${spec.label}: must be a number`;
  if (spec.type === 'integer' && !Number.isInteger(value)) return `${spec.label}: must be a whole number`;
  if (value < spec.min || value > spec.max) return `${spec.label}: must be between ${spec.min} and ${spec.max}`;
  return null;
}

/** Rules across parameters (beyond each parameter's own range). */
export function crossParamErrors(spec: StrategySpec, params: Record<string, unknown>): string[] {
  if (spec.key === RISE_FROM_RECENT_LOW_TRADING.key && params.intradayLossBufferEnabled === true && params.maximumHoldEnabled === false)
    return [
      'Buffered intraday-loss exit: it applies only from the maximum losing-hold age — switch it off, or switch the maximum losing hold on'
    ];
  return [];
}

/** Whether a parameter is applied: its switch chain (dependsOn) is all on. */
export function isParamApplied(spec: StrategySpec, params: Record<string, unknown>, key: string): boolean {
  const p = spec.params.find((x) => x.key === key);
  if (!p?.dependsOn) return true;
  return params[p.dependsOn] === true && isParamApplied(spec, params, p.dependsOn);
}

/** Validates a manual run request against the registry. Returns the errors (empty when valid). */
export function validateRunRequest(req: unknown, knownSymbols: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  if (typeof req !== 'object' || req === null || Array.isArray(req)) return ['request: must be a JSON object'];
  const r = req as Record<string, unknown>;
  const allowed = new Set([
    'strategyKey',
    'strategyVersion',
    'params',
    'symbols',
    'from',
    'to',
    'resolution',
    'title',
    'parentVariation'
  ]);
  for (const k of Object.keys(r)) if (!allowed.has(k)) errors.push(`request: unknown field "${k}"`);

  const spec =
    typeof r.strategyKey === 'string' && typeof r.strategyVersion === 'string'
      ? findStrategy(r.strategyKey, r.strategyVersion)
      : undefined;
  if (!spec) return [...errors, 'strategy: unknown or not runnable'];

  const params = r.params;
  if (typeof params !== 'object' || params === null || Array.isArray(params)) errors.push('params: must be an object');
  else {
    const p = params as Record<string, unknown>;
    for (const k of Object.keys(p))
      if (!spec.params.some((s) => s.key === k)) errors.push(`params: unknown parameter "${k}"`);
    for (const s of spec.params) {
      const e = validateParam(s, p[s.key]);
      if (e) errors.push(e);
    }
    errors.push(...crossParamErrors(spec, p));
  }

  if (!Array.isArray(r.symbols) || r.symbols.length === 0) errors.push('symbols: choose at least one symbol');
  else {
    if (r.symbols.length > MAX_SYMBOLS_PER_RUN) errors.push(`symbols: at most ${MAX_SYMBOLS_PER_RUN} per run`);
    if (new Set(r.symbols).size !== r.symbols.length) errors.push('symbols: duplicates');
    for (const s of r.symbols)
      if (typeof s !== 'string' || !SYMBOL.test(s)) errors.push(`symbols: "${String(s)}" is not a symbol`);
      else if (!knownSymbols.has(s)) errors.push(`symbols: no local data for ${s}`);
  }

  for (const k of ['from', 'to'] as const) {
    const v = r[k];
    if (typeof v !== 'string' || !DATE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`)))
      errors.push(`${k}: must be a YYYY-MM-DD date`);
  }
  if (typeof r.from === 'string' && typeof r.to === 'string' && r.from > r.to)
    errors.push('from: must not be after to');

  if (!spec.resolutions.includes(r.resolution as Resolution))
    errors.push(`resolution: one of ${spec.resolutions.join(', ')}`);

  if (r.title !== undefined && (typeof r.title !== 'string' || r.title.length > MAX_TITLE_LENGTH))
    errors.push(`title: text of at most ${MAX_TITLE_LENGTH} characters`);

  if (
    r.parentVariation !== undefined &&
    (typeof r.parentVariation !== 'string' || !/^V-\d{6,12}$/.test(r.parentVariation))
  )
    errors.push('parentVariation: a variation id such as V-000001');

  return errors;
}

export function isValidRunRequest(req: unknown, knownSymbols: ReadonlySet<string>): req is LabRunRequest {
  return validateRunRequest(req, knownSymbols).length === 0;
}

/** Canonical JSON of a parameter set (sorted keys) — the identity of a variation together with the strategy version. */
export function canonicalParams(params: Record<string, ParamValue>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(params).sort(([a], [b]) => (a < b ? -1 : 1))));
}

export function defaultParams(spec: StrategySpec): Record<string, ParamValue> {
  return Object.fromEntries(spec.params.map((p: ParamSpec) => [p.key, p.default]));
}

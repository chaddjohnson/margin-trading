// Registry of every Strategy Lab strategy version with its parameter schema (version 2, shared/params.ts). Pure data and
// validation (no engine code), so the browser form, the server, the runners and the phenotype importer share one
// definition.
//
// Strategy versions:
// - rise-from-recent-low@1.0.0           "Rise from recent low (entry signal)": signal-only, New Test.
// - rise-from-recent-low-trading@1.1.0   "Growth": the trading backtest with optional continuation entries, New Test.
// - rise-from-recent-low-trading@1.0.0   "Growth" (legacy): the pre-continuation version. Not launchable; its runs
//                                        replay as 1.1.0 with continuation OFF (identical; tests/offParity).
// - study8-d1-pool@pools-engine          the Study 8 D1 shared-slot pool: imported runs, and phenotype reruns only.
// - demo-toy-rules@1.0.0                 the synthetic demo: read-only.
// Display names are metadata: the keys and versions above never change (docs/strategy-lab/CONTRACTS.md).

import type {
  LabRunRequest,
  NumericParamSpec,
  ParamConstraint,
  ParamSpec,
  Predicate,
  Resolution,
  StrategySpec
} from './contract.ts';
import { validateParams } from './params.ts';

export {
  canonicalParams,
  defaultParams,
  effectiveParams,
  isActive,
  validateParams,
  validateValue,
  variationIdentity
} from './params.ts';

const RESOLUTIONS: Resolution[] = ['1d', '60m', '30m', '15m', '5m', '1m'];

const X_PARAM: NumericParamSpec = {
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
};
const N_PARAM: NumericParamSpec = {
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
};

export const RISE_FROM_RECENT_LOW: StrategySpec = {
  key: 'rise-from-recent-low',
  version: '1.0.0',
  title: 'Rise from recent low (entry signal)',
  kind: 'entry_signal',
  launch: 'form',
  runnable: true,
  description:
    'Signal-only. Fires once, on the completed bar whose close first rises to at least X% above the lowest low of ' +
    'the last N completed bars (this bar included), after having been below that level on the previous bar. It ' +
    'rearms only after the advance falls back below X%. No exits, no positions, no P&L.',
  schemaVersion: 2,
  params: [X_PARAM, N_PARAM],
  groups: [],
  constraints: [],
  identity: 'effective',
  resolutions: RESOLUTIONS,
  defaultResolution: '1d'
};

const on = (param: string): Predicate => ({ param, equals: true });

const GROWTH_GROUPS = [
  { key: 'entry', title: 'Entry — Rise from recent low (unchanged scanner)' },
  { key: 'exit', title: 'Exits' },
  {
    key: 'continuation',
    title: 'Continuation entries (optional)',
    description:
      'An additional entry when flat after a realised net-profitable exit, inside a window of W trading sessions. ' +
      'OFF reproduces the version without continuation exactly. Defaults are illustrative, not optimised.'
  },
  { key: 'execution', title: 'Execution' }
];

// The parameters of Growth 1.0.0, in their 1.0.0 order (the frozen legacy schema).
const GROWTH_BASE_PARAMS: ParamSpec[] = [
  { ...X_PARAM, group: 'entry' },
  { ...N_PARAM, group: 'entry' },
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
    activeWhen: on('maximumHoldEnabled'),
    whenInactive: 'disable'
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
    group: 'exit',
    activeWhen: on('maximumHoldEnabled'),
    whenInactive: 'disable'
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
    activeWhen: on('intradayLossBufferEnabled'),
    whenInactive: 'disable'
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
];

const BUFFER_NEEDS_HOLD: ParamConstraint = {
  kind: 'requires',
  id: 'buffer-requires-hold',
  if: on('intradayLossBufferEnabled'),
  then: on('maximumHoldEnabled'),
  message:
    'Buffered intraday-loss exit: it applies only from the maximum losing-hold age — switch it off, or switch the maximum losing hold on'
};

const method = (m: string): Predicate => ({ param: 'continuationMethod', equals: m });
const continuationParam = (p: Omit<NumericParamSpec, 'group' | 'whenInactive'>, m: string): NumericParamSpec => ({
  ...p,
  group: 'continuation',
  activeWhen: method(m),
  whenInactive: 'hide'
});

// The continuation dimensions of Growth 1.1.0 (src/growth-trading/continuation.ts; docs/strategy-lab/GROWTH_CONTINUATION.md).
const CONTINUATION_PARAMS: ParamSpec[] = [
  {
    key: 'continuationEnabled',
    label: 'Enable continuation entries',
    description:
      'OFF (default): only the base Rise entry, exactly as before. ON: after a realised net-profitable exit (net > 0 ' +
      'after costs and interest), the selected method may add ONE entry while flat, inside the window. A base entry ' +
      'has priority and closes the window.',
    type: 'boolean',
    unit: 'text',
    default: false,
    group: 'continuation'
  },
  {
    key: 'continuationMethod',
    label: 'Continuation method',
    description: 'How a continuation entry is recognised after the profitable exit (only the chosen method’s inputs apply).',
    type: 'enum',
    unit: 'text',
    default: 'classic_d1',
    options: [
      {
        value: 'classic_d1',
        label: 'Classic D1: pullback + trailing rebound',
        description:
          'D1’s own mechanics, on completed 1-minute bars at every resolution: a minute closing ≥ P below the post-exit high arms a trailing buy that fires on a Y rebound from its trailing low.'
      },
      {
        value: 'breakout',
        label: 'Breakout above post-exit high',
        description:
          'After at least F completed bars, a bar closing more than b% above every high since the exit (the exit fill included, the bar’s own high excluded).'
      },
      {
        value: 'shallow_pullback',
        label: 'Shallow pullback + recovery in an uptrend',
        description:
          'While a longer SMA is rising: a close pmin–pmax% below the post-exit high arms; a close R% above the lowest close since then triggers; deeper than pmax ends the window.'
      },
      {
        value: 'ma_cross',
        label: 'Cross above a rising moving average',
        description:
          'The previous bar closed at or below its SMA, this bar closes above it (plus a margin), and the SMA is higher than M bars ago.'
      }
    ],
    group: 'continuation',
    activeWhen: on('continuationEnabled'),
    whenInactive: 'hide'
  },
  {
    key: 'continuationWindowSessions',
    label: 'Continuation window (W)',
    description:
      'Trading sessions after the qualifying exit’s session: eligible sessions s0+1 … s0+W inclusive; the window expires after the close of s0+W.',
    type: 'integer',
    unit: 'sessions',
    default: 60,
    min: 1,
    max: 500,
    step: 1,
    group: 'continuation',
    activeWhen: on('continuationEnabled'),
    whenInactive: 'hide'
  },
  continuationParam(
    {
      key: 'classicPullbackPercent',
      label: 'Pullback depth (P)',
      description: 'A completed minute closing at or below post-exit high × (1 − P) arms the trailing buy (D1 shipped: 9%).',
      type: 'number',
      unit: 'percent',
      default: 9,
      min: 0.1,
      max: 50,
      step: 0.1
    },
    'classic_d1'
  ),
  continuationParam(
    {
      key: 'classicReboundPercent',
      label: 'Trailing rebound (Y)',
      description: 'The armed setup buys when a minute closes at or above trailing low × (1 + Y) (D1 shipped: 0.3%).',
      type: 'number',
      unit: 'percent',
      default: 0.3,
      min: 0.01,
      max: 20,
      step: 0.01
    },
    'classic_d1'
  ),
  continuationParam(
    {
      key: 'breakoutBufferPercent',
      label: 'Breakout buffer (b)',
      description: 'A completed bar must close strictly above post-exit high × (1 + b).',
      type: 'number',
      unit: 'percent',
      default: 1,
      min: 0,
      max: 20,
      step: 0.1
    },
    'breakout'
  ),
  continuationParam(
    {
      key: 'breakoutFormationBars',
      label: 'Formation bars (F)',
      description: 'Completed eligible bars that must form the post-exit high before a breakout can trigger (≥ 1).',
      type: 'integer',
      unit: 'bars',
      default: 1,
      min: 1,
      max: 500,
      step: 1
    },
    'breakout'
  ),
  continuationParam(
    {
      key: 'uptrendSmaBars',
      label: 'Uptrend SMA length (L)',
      description: 'Simple moving average of completed closes of the run resolution that defines the uptrend.',
      type: 'integer',
      unit: 'bars',
      default: 50,
      min: 2,
      max: 1000,
      step: 1
    },
    'shallow_pullback'
  ),
  continuationParam(
    {
      key: 'uptrendSlopeBars',
      label: 'Uptrend slope period (M)',
      description: 'Uptrend = SMA now above the SMA M bars earlier × (1 + r). Required at arming and at the trigger.',
      type: 'integer',
      unit: 'bars',
      default: 10,
      min: 1,
      max: 500,
      step: 1
    },
    'shallow_pullback'
  ),
  continuationParam(
    {
      key: 'uptrendMinimumRisePercent',
      label: 'Uptrend minimum rise (r)',
      description: 'How much higher the SMA must be than M bars earlier (0 = strictly higher).',
      type: 'number',
      unit: 'percent',
      default: 0,
      min: 0,
      max: 50,
      step: 0.1
    },
    'shallow_pullback'
  ),
  continuationParam(
    {
      key: 'pullbackMinimumPercent',
      label: 'Minimum pullback (pmin)',
      description: 'A close at least this far below the post-exit high (and not deeper than pmax) arms the setup.',
      type: 'number',
      unit: 'percent',
      default: 2,
      min: 0.1,
      max: 50,
      step: 0.1
    },
    'shallow_pullback'
  ),
  continuationParam(
    {
      key: 'pullbackMaximumPercent',
      label: 'Maximum pullback (pmax)',
      description: 'A close deeper than this below the post-exit high ends the window: the pullback is not shallow.',
      type: 'number',
      unit: 'percent',
      default: 8,
      min: 0.2,
      max: 90,
      step: 0.1
    },
    'shallow_pullback'
  ),
  continuationParam(
    {
      key: 'recoveryPercent',
      label: 'Recovery from the trough (R)',
      description: 'Triggers on a close at or above the lowest close since arming × (1 + R), in an uptrend.',
      type: 'number',
      unit: 'percent',
      default: 1,
      min: 0.01,
      max: 20,
      step: 0.01
    },
    'shallow_pullback'
  ),
  continuationParam(
    {
      key: 'crossSmaBars',
      label: 'Moving-average length (L)',
      description: 'Simple moving average of completed closes of the run resolution (the candidate bar included).',
      type: 'integer',
      unit: 'bars',
      default: 20,
      min: 2,
      max: 1000,
      step: 1
    },
    'ma_cross'
  ),
  continuationParam(
    {
      key: 'crossRisingBars',
      label: 'Rising period (M)',
      description: 'The SMA must be above its value M bars earlier × (1 + s).',
      type: 'integer',
      unit: 'bars',
      default: 5,
      min: 1,
      max: 500,
      step: 1
    },
    'ma_cross'
  ),
  continuationParam(
    {
      key: 'crossMinimumSlopePercent',
      label: 'Minimum SMA rise (s)',
      description: 'How much higher the SMA must be than M bars earlier (0 = strictly higher).',
      type: 'number',
      unit: 'percent',
      default: 0,
      min: 0,
      max: 50,
      step: 0.1
    },
    'ma_cross'
  ),
  continuationParam(
    {
      key: 'crossMarginPercent',
      label: 'Cross margin (m)',
      description: 'The close must be strictly above SMA × (1 + m); the previous close at or below its own SMA.',
      type: 'number',
      unit: 'percent',
      default: 0,
      min: 0,
      max: 20,
      step: 0.1
    },
    'ma_cross'
  )
];

export const CONTINUATION_PARAM_KEYS = CONTINUATION_PARAMS.map((p) => p.key);

const GROWTH_NOTES = [
  'Fixed $100,000 notional per trade, never compounded; 11% simple annual margin interest per calendar day (365-day year).',
  'Stops fill at the stop price (no extra slippage) or at the gapped opening trade; minute-bar prices, no bid-ask spread.',
  'A position never exits on its entry session; an open position at the end is marked at the last close (not closed).',
  'Several symbols = independent standalone backtests, one per symbol, never summed or shared-capital.'
];

const GROWTH_DESCRIPTION =
  'Trading backtest. Buys (all-in, one position, $100,000 fixed notional) on each Rise-from-Recent-Low signal while ' +
  'flat, at the next eligible trade after the signal bar completes; signals while invested are recorded as ' +
  'ignored. Exits: the D1 profit-conditional trailing stop, plus (optional) the maximum losing hold and the ' +
  'buffered intraday-loss exit. Re-entry needs only a fresh signal: no lower-price test, loss restriction or reset.';

export const GROWTH_TITLE = 'Growth';
export const GROWTH_FORMER_TITLE = 'Rise from recent low (trading backtest)';

/** Growth, the current version: the 1.0.0 parameters plus the optional continuation entries (OFF by default). */
export const RISE_FROM_RECENT_LOW_TRADING: StrategySpec = {
  key: 'rise-from-recent-low-trading',
  version: '1.1.0',
  title: GROWTH_TITLE,
  kind: 'trades',
  launch: 'form',
  runnable: true,
  description: `${GROWTH_DESCRIPTION} Optional continuation entries after a profitable exit (four methods; OFF by default).`,
  schemaVersion: 2,
  params: [...GROWTH_BASE_PARAMS.slice(0, -1), ...CONTINUATION_PARAMS, GROWTH_BASE_PARAMS.at(-1)!],
  groups: GROWTH_GROUPS,
  constraints: [
    BUFFER_NEEDS_HOLD,
    {
      kind: 'less',
      id: 'pullback-band',
      a: 'pullbackMinimumPercent',
      b: 'pullbackMaximumPercent',
      message: 'Shallow pullback: the minimum pullback must be below the maximum pullback'
    }
  ],
  identity: 'effective',
  resolutions: RESOLUTIONS,
  defaultResolution: '1d',
  notes: [
    ...GROWTH_NOTES,
    'Continuation (when ON): Classic D1 reads completed 1-minute bars at every resolution; the other methods read completed bars of the selected resolution. Decisions at bar ends; fills at the next eligible trade.'
  ],
  formerTitles: [GROWTH_FORMER_TITLE]
};

/** Growth 1.0.0 (legacy, frozen): its runs are historical facts; it replays as 1.1.0 with continuation OFF. */
export const RISE_FROM_RECENT_LOW_TRADING_1_0_0: StrategySpec = {
  key: 'rise-from-recent-low-trading',
  version: '1.0.0',
  title: GROWTH_TITLE,
  kind: 'trades',
  launch: 'none',
  runnable: false,
  description: `${GROWTH_DESCRIPTION} (Version 1.0.0, before continuation entries.)`,
  schemaVersion: 2,
  params: GROWTH_BASE_PARAMS,
  groups: GROWTH_GROUPS.filter((g) => g.key !== 'continuation'),
  constraints: [BUFFER_NEEDS_HOLD],
  identity: 'all-values',
  resolutions: RESOLUTIONS,
  defaultResolution: '1d',
  notes: GROWTH_NOTES,
  formerTitles: [GROWTH_FORMER_TITLE],
  legacy: {
    supersededBy: '1.1.0',
    replay:
      'version 1.1.0 with continuation OFF reproduces every 1.0.0 signal, fill, exit, mark and metric exactly (src/growth-trading/tests/offParity.test.ts); a clone starts a 1.1.0 test with continuation OFF'
  }
};

export const STUDY8_POOL: StrategySpec = {
  key: 'study8-d1-pool',
  version: 'pools-engine',
  title: 'Study 8 D1 shared-slot pool (pools engine)',
  kind: 'trades',
  launch: 'phenotype',
  runnable: true,
  description:
    'D1 books on one funded $100,000 slot (src/study8-runners/, src/portfolio-aware-d1/nbook/). Imported replays, and ' +
    'single reruns of a sealed Study 8 phenotype through the unchanged Study 8 runner. Its configuration is the sealed ' +
    'book vectors, not form parameters.',
  schemaVersion: 2,
  params: [],
  groups: [],
  constraints: [],
  identity: 'effective',
  resolutions: ['1m'],
  defaultResolution: '1m',
  notes: [
    'One allocator replay with ONE shared funded $100,000 slot: never independent per-symbol backtests, never a sum of standalone results.',
    'Accounting from the close of 2016-01-04, arming on 2017-06-15 (fixed by the Study 8 contract); 5 bps per side; 11%; stops at the stop.'
  ]
};

export const DEMO_TOY_RULES: StrategySpec = {
  key: 'demo-toy-rules',
  version: '1.0.0',
  title: 'Demo toy rules (synthetic)',
  kind: 'entry_signal',
  launch: 'none',
  runnable: false,
  description: 'Twelve toy rules that make the synthetic fixture internally consistent. Not research candidates.',
  schemaVersion: 2,
  params: [],
  groups: [],
  constraints: [],
  identity: 'effective',
  resolutions: ['1d'],
  defaultResolution: '1d'
};

/** Every registered strategy version. */
export const STRATEGY_REGISTRY: readonly StrategySpec[] = [
  RISE_FROM_RECENT_LOW,
  RISE_FROM_RECENT_LOW_TRADING,
  RISE_FROM_RECENT_LOW_TRADING_1_0_0,
  STUDY8_POOL,
  DEMO_TOY_RULES
];

/** The strategies the New Test form offers (one configuration per Run Test). */
export const RUNNABLE_STRATEGIES: readonly StrategySpec[] = STRATEGY_REGISTRY.filter((s) => s.launch === 'form');

export function findStrategy(key: string, version: string): StrategySpec | undefined {
  return STRATEGY_REGISTRY.find((s) => s.key === key && s.version === version);
}

/** The current form-launchable version of a strategy key (what a clone of any of its versions starts from). */
export function currentVersionOf(key: string): StrategySpec | undefined {
  return RUNNABLE_STRATEGIES.find((s) => s.key === key);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SYMBOL = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;
export const MAX_SYMBOLS_PER_RUN = 8;
export const MAX_TITLE_LENGTH = 160;

/**
 * Validates a manual run request against the registry. `launch` = which launch mode is allowed: the New Test form
 * (`form`) or a catalogue phenotype rerun (`phenotype`, which also admits the form strategies). Returns the errors.
 */
export function validateRunRequest(
  req: unknown,
  knownSymbols: ReadonlySet<string>,
  launch: 'form' | 'phenotype' = 'form'
): string[] {
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
    'parentVariation',
    ...(launch === 'phenotype' ? ['phenotypeId'] : [])
  ]);
  for (const k of Object.keys(r)) if (!allowed.has(k)) errors.push(`request: unknown field "${k}"`);

  const spec =
    typeof r.strategyKey === 'string' && typeof r.strategyVersion === 'string'
      ? findStrategy(r.strategyKey, r.strategyVersion)
      : undefined;
  if (!spec || !(spec.launch === 'form' || (launch === 'phenotype' && spec.launch === 'phenotype'))) {
    const legacy = spec?.legacy ? ` (superseded by ${spec.legacy.supersededBy}: ${spec.legacy.replay})` : '';
    return [...errors, `strategy: unknown or not runnable${legacy}`];
  }

  const params = r.params;
  if (typeof params !== 'object' || params === null || Array.isArray(params)) errors.push('params: must be an object');
  else errors.push(...validateParams(spec, params as Record<string, unknown>));

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

  if (r.phenotypeId !== undefined && (typeof r.phenotypeId !== 'string' || !/^PH-\d{4,12}$/.test(r.phenotypeId)))
    errors.push('phenotypeId: a phenotype id such as PH-0001');

  return errors;
}

export function isValidRunRequest(req: unknown, knownSymbols: ReadonlySet<string>): req is LabRunRequest {
  return validateRunRequest(req, knownSymbols).length === 0;
}

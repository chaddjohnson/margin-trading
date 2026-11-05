// Registry of every Strategy Lab strategy version with its parameter schema (version 2, shared/params.ts). Pure data and
// validation (no engine code), so the browser form, the server, the runners and the phenotype importer share one
// definition.
//
// Strategy versions:
// - rise-from-recent-low@1.0.0           "Rise from recent low (entry signal)": signal-only, New Test.
// - rise-from-recent-low-trading@1.2.0   "Growth": the trading backtest with optional continuation entries, an optional
//                                        entry trend filter and optional persistent entry eligibility, New Test.
// - rise-from-recent-low-trading@1.1.0   "Growth" (legacy): before the entry gates. Not offered by New Test; its catalogue
//                                        phenotypes stay runnable; its runs replay as 1.2.0 with both gates OFF
//                                        (identical; src/growth-trading/tests/offParity-1.1.0.test.ts).
// - rise-from-recent-low-trading@1.0.0   "Growth" (legacy): the pre-continuation version. Not launchable; its runs
//                                        replay as 1.2.0 with continuation and both gates OFF (identical; tests/offParity).
// - study8-d1-pool@pools-engine          the Study 8 D1 shared-slot pool: imported runs, and phenotype reruns only.
// - demo-toy-rules@1.0.0                 the synthetic demo: read-only.
// Display names are metadata: the keys and versions above never change (docs/strategy-lab/CONTRACTS.md).

import type {
  GroupNote,
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

// The groups of Growth 1.1.0 (frozen with its legacy schema).
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

// ----- Growth 1.2.0: the entry trend filter and persistent entry eligibility (src/growth-trading/entryGates.ts;
// docs/strategy-lab/GROWTH_ENTRY_GATES.md). Every bound and default lives here; the form, the server, the runner and
// future CLI optimisers read the same definitions. Defaults are illustrative, not optimised. -----

const trendMethod = (m: string): Predicate => ({ param: 'trendMethod', equals: m });
const trendParam = (p: Omit<NumericParamSpec, 'group' | 'whenInactive'>, m: string): NumericParamSpec => ({
  ...p,
  group: 'trend',
  activeWhen: trendMethod(m),
  whenInactive: 'hide'
});
const SESSIONS_NOTE = 'Trading sessions of the data (NYSE sessions present), whatever the bar resolution.';

const TREND_PARAMS: ParamSpec[] = [
  {
    key: 'trendFilterEnabled',
    label: 'Entry trend filter',
    description:
      'Block new Growth entries when the selected recent-price trend condition is not satisfied. OFF (default): exactly ' +
      'the version without the filter. ON: every Growth entry decision (the base crossing, a latched opportunity, a ' +
      'renewal, a continuation trigger) is checked at its decision instant; exits are never filtered. A blocked decision ' +
      'is recorded with its values, not traded.',
    type: 'boolean',
    unit: 'text',
    default: false,
    group: 'trend'
  },
  {
    key: 'trendMethod',
    label: 'Trend method',
    description:
      'How the recent trend is judged. Observations: the decision bar’s close (latest) and the closes of completed ' +
      'earlier sessions; highs/lows of the current session only up to the decision. Not enough history = blocked.',
    type: 'enum',
    unit: 'text',
    default: 'price_change',
    options: [
      {
        value: 'price_change',
        label: 'A — N-session price change',
        description:
          'Allows when the decision price is at least m% above the close N trading sessions back (a simple endpoint comparison).'
      },
      {
        value: 'regression_slope',
        label: 'B — Regression trend slope',
        description:
          'Least-squares line through the log prices of the last N sessions (N + 1 points, the decision price last); allows when its rise over the N sessions, e^(slope × N) − 1, is at least the minimum. A flat series is exactly 0%.'
      },
      {
        value: 'rising_sma',
        label: 'C — Rising moving average',
        description:
          'Allows when the price is above its N-session simple average AND that average is strictly higher than K sessions earlier.'
      },
      {
        value: 'higher_highs_lows',
        label: 'D — Higher highs and higher lows',
        description:
          'Splits the last N sessions into an older and a newer half (odd N: the middle one is left out); allows when the newer half has both a higher high and a higher low (by at least m%). A simple two-window structure proxy, not swing pivots.'
      },
      {
        value: 'momentum',
        label: 'E — Short-/long-term momentum',
        description:
          'Allows when the return over S sessions reaches its minimum AND the return over L sessions reaches its own (which may be negative: a tolerated longer-term decline during a recovery).'
      }
    ],
    group: 'trend',
    activeWhen: on('trendFilterEnabled'),
    whenInactive: 'hide'
  },
  trendParam(
    {
      key: 'trendChangeLookbackSessions',
      label: 'Lookback (N)',
      description: `The reference close is N sessions before the decision session. ${SESSIONS_NOTE}`,
      type: 'integer',
      unit: 'sessions',
      default: 20,
      min: 1,
      max: 500,
      step: 1,
      search: { min: 5, max: 120, step: 5 }
    },
    'price_change'
  ),
  trendParam(
    {
      key: 'trendChangeMinimumReturnPercent',
      label: 'Minimum return (m)',
      description: 'Decision price ≥ reference close × (1 + m). 0 = not below; negative values tolerate a decline.',
      type: 'number',
      unit: 'percent',
      default: 0,
      min: -50,
      max: 50,
      step: 0.1,
      search: { min: -5, max: 10, step: 0.5 }
    },
    'price_change'
  ),
  trendParam(
    {
      key: 'trendSlopeLookbackSessions',
      label: 'Regression window (N)',
      description: `N + 1 points: the closes of the N previous sessions and the decision price. ${SESSIONS_NOTE}`,
      type: 'integer',
      unit: 'sessions',
      default: 20,
      min: 2,
      max: 500,
      step: 1,
      search: { min: 5, max: 120, step: 5 }
    },
    'regression_slope'
  ),
  trendParam(
    {
      key: 'trendSlopeMinimumPercent',
      label: 'Minimum fitted rise',
      description: 'The fitted rise over the N sessions, (e^(slope × N) − 1) × 100, must be at least this (0 admits a flat line).',
      type: 'number',
      unit: 'percent',
      default: 0,
      min: -50,
      max: 50,
      step: 0.1,
      search: { min: -5, max: 10, step: 0.5 }
    },
    'regression_slope'
  ),
  trendParam(
    {
      key: 'trendSmaSessions',
      label: 'Moving-average length (N)',
      description: `Simple average of the decision price and the closes of the N − 1 previous sessions. ${SESSIONS_NOTE}`,
      type: 'integer',
      unit: 'sessions',
      default: 50,
      min: 2,
      max: 500,
      step: 1,
      search: { min: 10, max: 200, step: 10 }
    },
    'rising_sma'
  ),
  trendParam(
    {
      key: 'trendSmaComparisonSessions',
      label: 'Slope comparison (K)',
      description: 'The average must be strictly higher than its value at the close K sessions earlier.',
      type: 'integer',
      unit: 'sessions',
      default: 5,
      min: 1,
      max: 250,
      step: 1,
      search: { min: 1, max: 30, step: 1 }
    },
    'rising_sma'
  ),
  trendParam(
    {
      key: 'trendStructureLookbackSessions',
      label: 'Structure window (N)',
      description: `N sessions (the current one up to the decision included), split into two halves of ⌊N/2⌋. ${SESSIONS_NOTE}`,
      type: 'integer',
      unit: 'sessions',
      default: 20,
      min: 2,
      max: 500,
      step: 1,
      search: { min: 4, max: 120, step: 2 }
    },
    'higher_highs_lows'
  ),
  trendParam(
    {
      key: 'trendStructureMinimumIncreasePercent',
      label: 'Minimum structure increase (m)',
      description: 'The newer high and the newer low must exceed the older ones by more than m% (0 = strictly higher).',
      type: 'number',
      unit: 'percent',
      default: 0,
      min: 0,
      max: 20,
      step: 0.1,
      search: { min: 0, max: 5, step: 0.25 }
    },
    'higher_highs_lows'
  ),
  trendParam(
    {
      key: 'trendMomentumShortSessions',
      label: 'Short lookback (S)',
      description: `Return of the decision price over S sessions. ${SESSIONS_NOTE} S must be below L.`,
      type: 'integer',
      unit: 'sessions',
      default: 5,
      min: 1,
      max: 250,
      step: 1,
      search: { min: 2, max: 30, step: 1 }
    },
    'momentum'
  ),
  trendParam(
    {
      key: 'trendMomentumLongSessions',
      label: 'Long lookback (L)',
      description: 'Return of the decision price over L sessions (L > S).',
      type: 'integer',
      unit: 'sessions',
      default: 60,
      min: 2,
      max: 500,
      step: 1,
      search: { min: 20, max: 250, step: 10 }
    },
    'momentum'
  ),
  trendParam(
    {
      key: 'trendMomentumMinimumShortReturnPercent',
      label: 'Minimum short return',
      description: 'Decision price ≥ close S sessions back × (1 + this).',
      type: 'number',
      unit: 'percent',
      default: 0,
      min: -50,
      max: 50,
      step: 0.1,
      search: { min: -2, max: 10, step: 0.5 }
    },
    'momentum'
  ),
  trendParam(
    {
      key: 'trendMomentumMinimumLongReturnPercent',
      label: 'Minimum long return',
      description: 'Decision price ≥ close L sessions back × (1 + this). A negative value tolerates a longer-term decline (e.g. −5%).',
      type: 'number',
      unit: 'percent',
      default: 0,
      min: -50,
      max: 50,
      step: 0.1,
      search: { min: -15, max: 10, step: 0.5 }
    },
    'momentum'
  )
];

const policy = (m: string): Predicate => ({ param: 'eligibilityPolicy', equals: m });
const eligibilityParam = (p: Omit<NumericParamSpec, 'group' | 'whenInactive'>, m: string): NumericParamSpec => ({
  ...p,
  group: 'eligibility',
  activeWhen: policy(m),
  whenInactive: 'hide'
});

const ELIGIBILITY_PARAMS: ParamSpec[] = [
  {
    key: 'eligibilityEnabled',
    label: 'Persistent entry eligibility',
    description:
      'A qualifying Growth signal can remain available for a limited time, allowing later entry if its conditions are ' +
      'still met (for example, when a trend filter turns favourable or a future shared-capital allocator frees the ' +
      'slot). Never a retroactive fill at the original signal price. OFF (default): a signal not taken is gone.',
    type: 'boolean',
    unit: 'text',
    default: false,
    group: 'eligibility'
  },
  {
    key: 'eligibilityPolicy',
    label: 'Eligibility policy',
    description: 'What keeps an armed opportunity valid while it waits (every policy is bounded by the maximum age).',
    type: 'enum',
    unit: 'text',
    default: 'time_limited',
    options: [
      {
        value: 'time_limited',
        label: '1 — Time-limited opportunity',
        description:
          'Valid while each completed bar still satisfies the original Rise predicate (close ≥ X% over the rolling N-bar low); invalidated when it does not.'
      },
      {
        value: 'minimum_strength',
        label: '2 — Minimum trend strength',
        description:
          'Valid while the close stays at least a% above the FIXED recent low recorded at the signal (no drift when the rolling low moves); invalidated below it.'
      },
      {
        value: 'maximum_extension',
        label: '3 — Maximum price extension',
        description:
          'As 1, and the decision price must not exceed the original signal price by more than e%: beyond it the opportunity is invalidated (no late chasing, no reactivation).'
      },
      {
        value: 'deterioration',
        label: '4 — Trend-deterioration invalidation',
        description:
          'As 1, and cancelled when a close falls d% below the highest completed-bar close since arming; a recovery does not revive it.'
      },
      {
        value: 'reset_renew',
        label: '5 — Reset and renew after a fresh recovery',
        description:
          'As 1; after an unconsumed opportunity expires or is invalidated, a close D% below its signal price resets, and the first later close R% above the lowest close since then — with the Rise predicate true — is a renewal signal with its own bounded opportunity.'
      }
    ],
    group: 'eligibility',
    activeWhen: on('eligibilityEnabled'),
    whenInactive: 'hide'
  },
  {
    key: 'eligibilityMaxAgeSessions',
    label: 'Maximum opportunity age (W)',
    description:
      'Trading sessions. The signal’s session is day 0; decisions are allowed through session origin + W inclusive; the ' +
      'opportunity expires after that session’s close. Applies to every policy (no unbounded eligibility).',
    type: 'integer',
    unit: 'sessions',
    default: 10,
    min: 1,
    max: 120,
    step: 1,
    search: { min: 1, max: 30, step: 1 },
    group: 'eligibility',
    activeWhen: on('eligibilityEnabled'),
    whenInactive: 'hide'
  },
  eligibilityParam(
    {
      key: 'eligibilityMinimumAdvancePercent',
      label: 'Minimum advance over the signal’s low (a)',
      description:
        'Close ≥ the recent low fixed at the signal × (1 + a), checked from the signal bar on. Above X, a crossing whose own advance is smaller is invalidated at once.',
      type: 'number',
      unit: 'percent',
      default: 3,
      min: 0,
      max: 100,
      step: 0.1,
      search: { min: 0, max: 10, step: 0.5 }
    },
    'minimum_strength'
  ),
  eligibilityParam(
    {
      key: 'eligibilityMaximumExtensionPercent',
      label: 'Maximum extension above the signal price (e)',
      description: 'Decision price ≤ the original signal price × (1 + e); a close beyond it invalidates the opportunity.',
      type: 'number',
      unit: 'percent',
      default: 3,
      min: 0.1,
      max: 50,
      step: 0.1,
      search: { min: 0.5, max: 10, step: 0.5 }
    },
    'maximum_extension'
  ),
  eligibilityParam(
    {
      key: 'eligibilityDeteriorationDropPercent',
      label: 'Deterioration drop (d)',
      description: 'Cancelled when a completed-bar close is at or below the highest close since arming × (1 − d).',
      type: 'number',
      unit: 'percent',
      default: 3,
      min: 0.1,
      max: 50,
      step: 0.1,
      search: { min: 0.5, max: 10, step: 0.5 }
    },
    'deterioration'
  ),
  eligibilityParam(
    {
      key: 'eligibilityResetDropPercent',
      label: 'Reset drop (D)',
      description: 'After an unconsumed opportunity ends: a later close at or below its signal price × (1 − D) arms the renewal watch.',
      type: 'number',
      unit: 'percent',
      default: 3,
      min: 0.1,
      max: 50,
      step: 0.1,
      search: { min: 1, max: 10, step: 0.5 }
    },
    'reset_renew'
  ),
  eligibilityParam(
    {
      key: 'eligibilityRenewalReboundPercent',
      label: 'Renewal rebound (R)',
      description:
        'The first later close at or above the lowest close since the reset × (1 + R) ends the watch; it renews only if the Rise predicate holds on that bar. The watch lasts at most W sessions.',
      type: 'number',
      unit: 'percent',
      default: 2,
      min: 0.1,
      max: 50,
      step: 0.1,
      search: { min: 0.5, max: 10, step: 0.5 }
    },
    'reset_renew'
  )
];

export const TREND_PARAM_KEYS = TREND_PARAMS.map((p) => p.key);
export const ELIGIBILITY_PARAM_KEYS = ELIGIBILITY_PARAMS.map((p) => p.key);

// Growth 1.2.0: the 1.1.0 groups with the two entry gates after the entry.
const GROWTH_GROUPS_1_2_0 = [
  GROWTH_GROUPS[0]!,
  {
    key: 'trend',
    title: 'Entry trend filter (optional)',
    description:
      'Blocks new Growth entries when the selected recent-price trend condition is not satisfied. Lookbacks count trading sessions, whatever the bar resolution. OFF reproduces Growth without the filter exactly. Defaults are illustrative, not optimised; a trend rule is not evidence of safer trading.'
  },
  {
    key: 'eligibility',
    title: 'Persistent entry eligibility (optional)',
    description:
      'Keeps a qualifying Growth signal available for a bounded number of trading sessions, so that it can still be entered later at the then-current price if its policy stays satisfied. OFF reproduces Growth without it exactly.'
  },
  ...GROWTH_GROUPS.slice(1)
];

// Value-dependent explanations and warnings in the form (display metadata; not part of the stored schema).
const GROWTH_GROUP_NOTES: GroupNote[] = [
  {
    id: 'hold-off-warning',
    group: 'exit',
    when: { param: 'maximumHoldEnabled', equals: false },
    tone: 'warn',
    text: 'Maximum losing hold is OFF: a losing position has no exit — the trailing stop only becomes active while selling at it would be profitable after interest — so a loser can stay open indefinitely. It is reported as an open position marked at the last close, never as a fabricated sale.'
  },
  {
    id: 'continuation-note',
    group: 'continuation',
    when: on('continuationEnabled'),
    tone: 'muted',
    text: 'Only the selected method’s inputs apply; the others keep their drafts and are not executed. A base Growth entry has priority at the same instant and closes the window.'
  }
];
const GATE_NOTES: GroupNote[] = [
  {
    id: 'trend-note',
    group: 'trend',
    when: { all: [on('trendFilterEnabled'), { param: 'eligibilityEnabled', equals: false }] },
    tone: 'muted',
    text: 'With persistent eligibility OFF a blocked crossing stays blocked: no later entry is made when the trend turns favourable. A trigger of a continuation method that is blocked ends its window.'
  },
  {
    id: 'eligibility-note',
    group: 'eligibility',
    when: on('eligibilityEnabled'),
    tone: 'muted',
    text: 'Signal = the raw Rise crossing (recorded once). Armed opportunity = that signal kept available — not an order, no capital reserved — for at most W sessions while its policy holds. Filtered = a decision the trend filter blocked (recorded with its values; the opportunity keeps waiting). Entry = an actual order, filled at the next eligible trade at the then-current price. Signals while invested arm nothing. Without a trend filter nothing blocks a standalone Growth run, so every opportunity is taken at once (identical to OFF).'
  }
];

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

const PULLBACK_BAND: ParamConstraint = {
  kind: 'less',
  id: 'pullback-band',
  a: 'pullbackMinimumPercent',
  b: 'pullbackMaximumPercent',
  message: 'Shallow pullback: the minimum pullback must be below the maximum pullback'
};
const CONTINUATION_NOTE =
  'Continuation (when ON): Classic D1 reads completed 1-minute bars at every resolution; the other methods read completed bars of the selected resolution. Decisions at bar ends; fills at the next eligible trade.';

/**
 * Growth, the current version (1.2.0): the 1.1.0 parameters plus the optional entry trend filter and the optional
 * persistent entry eligibility, both OFF by default (OFF = 1.1.0 exactly).
 */
export const RISE_FROM_RECENT_LOW_TRADING: StrategySpec = {
  key: 'rise-from-recent-low-trading',
  version: '1.2.0',
  title: GROWTH_TITLE,
  kind: 'trades',
  launch: 'form',
  runnable: true,
  description: `${GROWTH_DESCRIPTION} Optional: continuation entries after a profitable exit (four methods), an entry trend filter (five methods) and persistent entry eligibility (five bounded policies) — all OFF by default.`,
  schemaVersion: 2,
  params: [
    ...GROWTH_BASE_PARAMS.slice(0, 2),
    ...TREND_PARAMS,
    ...ELIGIBILITY_PARAMS,
    ...GROWTH_BASE_PARAMS.slice(2, -1),
    ...CONTINUATION_PARAMS,
    GROWTH_BASE_PARAMS.at(-1)!
  ],
  groups: GROWTH_GROUPS_1_2_0,
  constraints: [
    BUFFER_NEEDS_HOLD,
    PULLBACK_BAND,
    {
      kind: 'less',
      id: 'momentum-short-long',
      a: 'trendMomentumShortSessions',
      b: 'trendMomentumLongSessions',
      message: 'Momentum trend filter: the short lookback S must be below the long lookback L'
    }
  ],
  identity: 'effective',
  resolutions: RESOLUTIONS,
  defaultResolution: '1d',
  notes: [
    ...GROWTH_NOTES,
    CONTINUATION_NOTE,
    'Entry trend filter / persistent eligibility (when ON): decisions at completed bar ends, trend windows in trading sessions; a later (latched) entry fills at the next eligible trade at the then-current price.'
  ],
  formerTitles: [GROWTH_FORMER_TITLE],
  groupNotes: [...GROWTH_GROUP_NOTES, ...GATE_NOTES]
};

/**
 * Growth 1.1.0 (legacy, frozen): its runs are historical facts; New Test no longer offers it, but its catalogue
 * phenotypes stay runnable as single tests. It replays as 1.2.0 with the trend filter and eligibility OFF.
 */
export const RISE_FROM_RECENT_LOW_TRADING_1_1_0: StrategySpec = {
  key: 'rise-from-recent-low-trading',
  version: '1.1.0',
  title: GROWTH_TITLE,
  kind: 'trades',
  launch: 'phenotype',
  runnable: true,
  description: `${GROWTH_DESCRIPTION} Optional continuation entries after a profitable exit (four methods; OFF by default). (Version 1.1.0, before the entry trend filter and persistent eligibility.)`,
  schemaVersion: 2,
  params: [...GROWTH_BASE_PARAMS.slice(0, -1), ...CONTINUATION_PARAMS, GROWTH_BASE_PARAMS.at(-1)!],
  groups: GROWTH_GROUPS,
  constraints: [BUFFER_NEEDS_HOLD, PULLBACK_BAND],
  identity: 'effective',
  resolutions: RESOLUTIONS,
  defaultResolution: '1d',
  notes: [...GROWTH_NOTES, CONTINUATION_NOTE],
  formerTitles: [GROWTH_FORMER_TITLE],
  groupNotes: GROWTH_GROUP_NOTES,
  legacy: {
    supersededBy: '1.2.0',
    replay:
      'version 1.2.0 with the entry trend filter and persistent eligibility OFF reproduces every 1.1.0 signal, fill, exit, continuation episode, decision-log entry, mark and metric exactly (src/growth-trading/tests/offParity-1.1.0.test.ts); its catalogue phenotypes rerun as 1.1.0 configurations; a clone starts a 1.2.0 test with both OFF'
  }
};

/** Growth 1.0.0 (legacy, frozen): its runs are historical facts; it replays as 1.2.0 with continuation and both gates OFF. */
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
  groupNotes: GROWTH_GROUP_NOTES.filter((n) => n.group !== 'continuation'),
  legacy: {
    supersededBy: '1.2.0',
    replay:
      'version 1.2.0 with continuation, the entry trend filter and persistent eligibility OFF reproduces every 1.0.0 signal, fill, exit, mark and metric exactly (src/growth-trading/tests/offParity.test.ts); a clone starts a 1.2.0 test with all of them OFF'
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
  RISE_FROM_RECENT_LOW_TRADING_1_1_0,
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

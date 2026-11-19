// Creating runs: manual single tests (validated, then queued for the runner) and the seeding of the synthetic demo.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { readPartitionConfig } from '../../../src/lib/partitions.ts';
import type { LabRunRequest, LabValue, StrategySpec } from '../shared/contract.ts';
import { RESOLUTION_LABEL } from '../shared/contract.ts';
import { effectiveParams, isActive, optionLabel, paramOf, paramSnapshot, schemaOf, variationIdentity } from '../shared/params.ts';
import type { PhenotypeRecord } from '../shared/phenotypes.ts';
import { findStrategy, RISE_FROM_RECENT_LOW_TRADING, STUDY8_POOL, validateRunRequest } from '../shared/strategies.ts';
import type { PoolRerunRequest } from '../runner/pool-run.ts';
import { atomicWrite, runDirName } from './artifacts.ts';
import type { Config } from './config.ts';
import type { Jobs } from './jobs.ts';
import type { MarketPrices } from './prices.ts';
import type { Repo } from './repo.ts';

export const GROWTH_EXPERIMENT = {
  slug: 'growth-entry-discovery',
  title: 'Growth Entry Discovery',
  description:
    'Signal-only entry mechanisms that try to participate in sustained rises (docs/research/growth-entry-discovery/PLAN.md).'
};

const SOURCE_PATHS = ['src/entry-signals', 'src/lib', 'apps/strategy-lab/runner', 'apps/strategy-lab/shared'];
// A shared-slot pool rerun executes the unchanged Study 8 runner and pools engine.
export const POOL_SOURCE_PATHS = [
  'apps/strategy-lab/runner',
  'apps/strategy-lab/shared',
  'apps/strategy-lab/importers',
  'src/study8-runners',
  'src/study7-runners',
  'src/pools',
  'src/portfolio-aware-d1',
  'src/multi-etf-allocator',
  'src/shared-margin-portfolio',
  'src/lib'
];
// The trading backtest also executes the D1 book, exit manager, fill primitives, trackers and fixed ledger.
const TRADING_SOURCE_PATHS = [
  ...SOURCE_PATHS,
  'src/growth-trading',
  'src/multi-etf-allocator/shadow.ts',
  'src/multi-etf-allocator/engine.ts',
  'src/multi-etf-allocator/ledger.ts',
  'src/shared-margin-portfolio/strategy.ts',
  'src/four-family/data.ts'
];

/** HEAD and the uncommitted state of the code a run executes (fixed git arguments, no user input). */
export function codeRevision(repoRoot: string, paths: readonly string[] = SOURCE_PATHS): Record<string, unknown> {
  const git = (args: string[]) =>
    execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', timeout: 10_000 }).trim();
  try {
    const dirty = git(['status', '--porcelain', '--', ...paths])
      .split('\n')
      .filter(Boolean);
    return {
      commit: git(['rev-parse', 'HEAD']),
      branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
      dirty,
      paths
    };
  } catch (e) {
    return { commit: null, error: (e as Error).message.slice(0, 200) };
  }
}

/** Which data partitions (data/partitions.json) an inclusive date window touches — recorded, and shown to the user. */
export function partitionsTouched(repoRoot: string, from: string, to: string): string {
  const cfg = readPartitionConfig(join(repoRoot, 'data'));
  const names = (['training', 'holdout', 'final'] as const).filter((p) => {
    const { start, end } = cfg.partitions[p];
    return (end === null || from <= end) && (start === null || to >= start);
  });
  return names.join('+') || 'outside partitions';
}

export interface Profile {
  sourceRef: string;
  sourcePaths: readonly string[];
  params: LabValue[]; // the run's snapshot (inactive saved values labelled)
  variationParams: LabValue[]; // the variation's: the effective configuration
  title: string;
  assumptions: LabValue[];
}

const text = (key: string, label: string, value: string): LabValue => ({ key, label, value, unit: 'text' });

// The signal-only strategy: exactly the snapshot, title and assumptions it has always recorded.
function signalOnlyProfile(spec: StrategySpec, req: LabRunRequest): Profile {
  const params: LabValue[] = [
    ...spec.params.map((p) => ({ key: p.key, label: p.label, value: req.params[p.key]!, unit: p.unit })),
    { key: 'resolution', label: 'Bar resolution', value: req.resolution, unit: 'text' as const }
  ];
  return {
    sourceRef: 'src/entry-signals/riseFromRecentLow.ts',
    sourcePaths: SOURCE_PATHS,
    params,
    variationParams: params,
    title: `X ${req.params.advanceFromRecentLowPercent}% · N ${req.params.recentLowLookbackBars} bars · ${req.resolution}`,
    assumptions: [
      {
        key: 'signalOnly',
        label: 'Signal-only',
        value: 'no orders, fills, exits, positions, costs or P&L',
        unit: 'text'
      }
    ]
  };
}

const pct = (v: unknown) => `${String(v)}%`;

// The continuation part of the title and assumptions (Growth 1.1.0). Absent / OFF = the base Growth behaviour.
function continuationText(spec: StrategySpec, p: Record<string, unknown>) {
  if (p.continuationEnabled !== true)
    return {
      title: 'continuation off',
      assumption:
        p.entryMethod === 'trend_breakout'
          ? 'OFF: only the base trend-breakout entry'
          : 'OFF: only the base Rise entry (identical to the version without continuation entries)'
    };
  const m = String(p.continuationMethod);
  const w = `W ${String(p.continuationWindowSessions)}`;
  const label = optionLabel(paramOf(spec, 'continuationMethod')!, m);
  const detail: Record<string, [string, string]> = {
    classic_d1: [
      `D1 ${w} P ${pct(p.classicPullbackPercent)} Y ${pct(p.classicReboundPercent)}`,
      `D1 mechanics on completed 1-minute bars: H = the exit fill, raised after each later session by its high; a minute closing at or below H × (1 − ${pct(p.classicPullbackPercent)}) arms a trailing buy (arming closes the window; the arming minute never buys), which buys when a minute closes at or above its trailing low × (1 + ${pct(p.classicReboundPercent)}); the armed setup persists (D1) until it fires or a base entry cancels it`
    ],
    breakout: [
      `breakout ${w} b ${pct(p.breakoutBufferPercent)} F ${String(p.breakoutFormationBars)}`,
      `after ${String(p.breakoutFormationBars)} completed eligible bar(s), a bar closing strictly above H × (1 + ${pct(p.breakoutBufferPercent)}); H = the exit fill raised by each completed eligible bar's high after it is evaluated (a bar never sees its own high)`
    ],
    shallow_pullback: [
      `shallow ${w} SMA ${String(p.uptrendSmaBars)}/${String(p.uptrendSlopeBars)} pullback ${pct(p.pullbackMinimumPercent)}–${pct(p.pullbackMaximumPercent)} R ${pct(p.recoveryPercent)}`,
      `uptrend = SMA${String(p.uptrendSmaBars)} above its value ${String(p.uptrendSlopeBars)} bars earlier × (1 + ${pct(p.uptrendMinimumRisePercent)}), at arming and at the trigger; a close ${pct(p.pullbackMinimumPercent)}–${pct(p.pullbackMaximumPercent)} below H arms (H freezes); deeper than ${pct(p.pullbackMaximumPercent)} ends the window; a close at or above the lowest close since arming × (1 + ${pct(p.recoveryPercent)}) triggers`
    ],
    ma_cross: [
      `MA cross ${w} SMA ${String(p.crossSmaBars)} rising ${String(p.crossRisingBars)} m ${pct(p.crossMarginPercent)}`,
      `the previous bar closed at or below its SMA${String(p.crossSmaBars)}, this bar closes strictly above SMA × (1 + ${pct(p.crossMarginPercent)}), and the SMA is above its value ${String(p.crossRisingBars)} bars earlier × (1 + ${pct(p.crossMinimumSlopePercent)}); one trigger per window`
    ]
  };
  const [title, rule] = detail[m] ?? [m, m];
  return {
    title: `continuation ${title}`,
    assumption: `ON — ${label}: ${rule}. Window: a realised net-profitable exit (net > 0 after costs and interest) opens eligible sessions s0+1 … s0+${String(p.continuationWindowSessions)}; evaluated only while flat with no order; a base entry has priority and closes it; decisions at bar ends, fills at the next eligible trade`
  };
}

// The entry trend filter and persistent eligibility (Growth 1.2.0) in the title and assumptions. Absent (older versions)
// or OFF = Growth without them.
function gateTexts(spec: StrategySpec, p: Record<string, unknown>, resolution: string) {
  const trendOn = p.trendFilterEnabled === true && isActive(spec, p, 'trendMethod');
  const eligibilityOn = p.eligibilityEnabled === true && isActive(spec, p, 'eligibilityPolicy');
  const n = (k: string) => String(p[k]);
  const trendRules: Record<string, [string, string]> = {
    price_change: [
      `A N ${n('trendChangeLookbackSessions')} ≥ ${pct(p.trendChangeMinimumReturnPercent)}`,
      `the decision price at least ${pct(p.trendChangeMinimumReturnPercent)} above the close ${n('trendChangeLookbackSessions')} trading sessions back`
    ],
    regression_slope: [
      `B N ${n('trendSlopeLookbackSessions')} ≥ ${pct(p.trendSlopeMinimumPercent)}`,
      `the least-squares fit of log prices over the last ${n('trendSlopeLookbackSessions')} sessions (decision price last) rising at least ${pct(p.trendSlopeMinimumPercent)} over that span`
    ],
    rising_sma: [
      `C SMA ${n('trendSmaSessions')}/${n('trendSmaComparisonSessions')}`,
      `the decision price strictly above its ${n('trendSmaSessions')}-session SMA, and that SMA strictly above its value ${n('trendSmaComparisonSessions')} sessions earlier`
    ],
    higher_highs_lows: [
      `D N ${n('trendStructureLookbackSessions')} m ${pct(p.trendStructureMinimumIncreasePercent)}`,
      `over the last ${n('trendStructureLookbackSessions')} sessions (the current one up to the decision), the newer half with a higher high and a higher low than the older half (by more than ${pct(p.trendStructureMinimumIncreasePercent)}; odd N: the middle session excluded)`
    ],
    momentum: [
      `E S ${n('trendMomentumShortSessions')} ≥ ${pct(p.trendMomentumMinimumShortReturnPercent)} L ${n('trendMomentumLongSessions')} ≥ ${pct(p.trendMomentumMinimumLongReturnPercent)}`,
      `the return over ${n('trendMomentumShortSessions')} sessions at least ${pct(p.trendMomentumMinimumShortReturnPercent)} AND over ${n('trendMomentumLongSessions')} sessions at least ${pct(p.trendMomentumMinimumLongReturnPercent)}`
    ]
  };
  const policyRules: Record<string, [string, string]> = {
    time_limited: ['1', 'valid while each completed bar still satisfies the original Rise predicate (close ≥ X% over the rolling N-bar low)'],
    minimum_strength: [
      `2 a ${pct(p.eligibilityMinimumAdvancePercent)}`,
      `valid while the close stays at least ${pct(p.eligibilityMinimumAdvancePercent)} above the recent low FIXED at the signal`
    ],
    maximum_extension: [
      `3 e ${pct(p.eligibilityMaximumExtensionPercent)}`,
      `the Rise predicate, and the decision price at most ${pct(p.eligibilityMaximumExtensionPercent)} above the original signal price (beyond it: invalidated)`
    ],
    deterioration: [
      `4 d ${pct(p.eligibilityDeteriorationDropPercent)}`,
      `the Rise predicate, and cancelled when a close falls ${pct(p.eligibilityDeteriorationDropPercent)} below the highest close since arming`
    ],
    reset_renew: [
      `5 D ${pct(p.eligibilityResetDropPercent)} R ${pct(p.eligibilityRenewalReboundPercent)}`,
      `the Rise predicate; after an unconsumed opportunity ends, a close ${pct(p.eligibilityResetDropPercent)} below its signal price resets and the first close ${pct(p.eligibilityRenewalReboundPercent)} above the lowest close since then (with the predicate true, within W sessions) renews it as a new opportunity`
    ]
  };
  const [trendTitle, trendRule] = trendOn ? (trendRules[String(p.trendMethod)] ?? [n('trendMethod'), n('trendMethod')]) : ['', ''];
  const [policyTitle, policyRule] = eligibilityOn ? (policyRules[String(p.eligibilityPolicy)] ?? [n('eligibilityPolicy'), n('eligibilityPolicy')]) : ['', ''];
  return {
    titles: [
      ...(trendOn ? [`trend ${trendTitle}`] : []),
      ...(eligibilityOn ? [`latch ${policyTitle} W ${n('eligibilityMaxAgeSessions')}`] : [])
    ],
    assumptions: [
      text(
        'trendFilter',
        'Entry trend filter',
        trendOn
          ? `ON — ${optionLabel(paramOf(spec, 'trendMethod')!, p.trendMethod)}: allows ${trendRule}. Checked at every Growth entry decision (the base crossing, a latched opportunity, a renewal signal, a continuation trigger) with data complete at the decision — the decision bar's close and completed earlier TRADING SESSIONS, whatever the bar resolution; not enough history blocks (insufficient_history); exits are never filtered; a blocked decision is recorded with its values, not traded`
          : spec.params.some((x) => x.key === 'trendFilterEnabled')
            ? 'OFF: every entry decision is taken as without the filter (identical to Growth 1.1.0)'
            : 'not part of this strategy version (OFF)'
      ),
      text(
        'eligibility',
        'Persistent entry eligibility',
        p.entryMethod === 'trend_breakout'
          ? 'not applicable: persistent eligibility is Rise-specific; with the trend-breakout entry a signal not taken at its own decision is gone (its inputs, if any, are a saved draft, not executed)'
          : eligibilityOn
          ? `ON — ${optionLabel(paramOf(spec, 'eligibilityPolicy')!, p.eligibilityPolicy)}, maximum age ${n('eligibilityMaxAgeSessions')} trading sessions (the signal session is day 0; decisions through origin + W inclusive; expired after that close): ${policyRule}. A raw crossing met while flat arms ONE opportunity (not an order, no capital reserved), re-evaluated at each completed ${resolution} bar while flat with no order; a later entry fills at the next eligible trade at the then-current price, never at the signal price; signals while invested arm nothing; no repeated entries from one opportunity. Without a trend filter nothing blocks a standalone run, so every opportunity is taken at once`
          : spec.params.some((x) => x.key === 'eligibilityEnabled')
            ? 'OFF: a signal not taken at its own decision is gone (identical to Growth 1.1.0)'
            : 'not part of this strategy version (OFF)'
      )
    ]
  };
}

// Growth 1.3.0: the entry method, the initial risk stop and trend retention in the title and assumptions. Absent
// (earlier versions) = the Rise entry with both OFF, and the earlier versions' texts are unchanged.
function optionalRuleTexts(spec: StrategySpec, p: Record<string, unknown>) {
  const has = spec.params.some((x) => x.key === 'entryMethod');
  const breakout = p.entryMethod === 'trend_breakout';
  const stop = p.initialStopEnabled === true && isActive(spec, p, 'initialStopAtrSessions');
  const retain = p.retentionEnabled === true && isActive(spec, p, 'retentionSellPercent');
  const n = (k: string) => String(p[k]);
  return {
    has,
    entryTitle: breakout
      ? [`breakout SMA ${n('breakoutSmaSessions')}/${n('breakoutSlopeComparisonSessions')} high ${n('breakoutPriorHighSessions')}`]
      : [`X ${n('advanceFromRecentLowPercent')}%`, `N ${n('recentLowLookbackBars')} bars`],
    titles: [
      ...(stop ? [`initial stop ${n('initialStopAtrMultiple')}×ATR${n('initialStopAtrSessions')}`] : []),
      ...(retain ? [`retain ${n('retentionSellPercent')}%→${n('retentionClosesBelow')}× < SMA ${n('retentionSmaSessions')}`] : [])
    ],
    entry: breakout
      ? `the trend-breakout entry (the Rise scanner is not used): at a completed daily close, close strictly above its ${n('breakoutSmaSessions')}-session SMA, that SMA strictly above its value ${n('breakoutSlopeComparisonSessions')} sessions earlier (both intrinsic to the method, whatever the optional trend filter), and close strictly above the highest high of the ${n('breakoutPriorHighSessions')} preceding sessions (the signal session excluded); decided at the scheduled close, filled at the next session’s opening trade; each qualifying close is its own signal, never replayed; not enough history is recorded per session`
      : 'the unchanged Rise-from-Recent-Low signal (the base entry), decided when the signal bar completes; filled at the next eligible trade (a daily signal: the next session’s opening trade)',
    assumptions: has
      ? [
          text(
            'initialStop',
            'Initial risk stop',
            stop
              ? `ON — fill − ${n('initialStopAtrMultiple')} × ATR(${n('initialStopAtrSessions')}), ATR = simple mean of the true ranges (max(high, previous close) − min(low, previous close)) of the ${n('initialStopAtrSessions')} sessions completed before the fill session; fixed for the position, active from the fill (also on the entry session) whatever the profit, interest or age; gaps fill at the opening trade, a minute crossing it at the stop (assumed); the higher active stop governs; an entry without the ATR history is blocked and recorded`
              : 'OFF (identical to Growth 1.2.0)'
          ),
          text(
            'retention',
            'Retain part of profitable trend',
            retain
              ? `ON — at the first profit trailing-stop event sell ${n('retentionSellPercent')}% of the shares (once); the remainder exits after ${n('retentionClosesBelow')} consecutive completed close(s) strictly below SMA(${n('retentionSmaSessions')}) (the partial-sale session’s close counted first), at the next eligible trade; the initial risk stop, the maximum losing hold and the buffered loss keep applying to the remainder on its remaining principal; a full exit due at the same trade takes precedence over the partial sale; one position = one closed trade when its last share is sold`
              : 'OFF (identical to Growth 1.2.0)'
          )
        ]
      : []
  };
}

// Growth 1.4.0: the Drawdown Recovery Gate in the title and assumptions. Absent (earlier versions) = OFF, and their
// texts are unchanged.
function drawdownGateTexts(spec: StrategySpec, p: Record<string, unknown>) {
  const has = spec.params.some((x) => x.key === 'drawdownRecoveryGateEnabled');
  const on = p.drawdownRecoveryGateEnabled === true && isActive(spec, p, 'dipLookbackSessions');
  const n = (k: string) => String(p[k]);
  return {
    titles: on
      ? [`drawdown gate N ${n('dipLookbackSessions')} d ${n('dipThresholdPercent')}% r ${n('recoveryRetracementPercent')}% Y ${n('recoveryConfirmationSessions')}`]
      : [],
    assumptions: has
      ? [
          text(
            'drawdownGate',
            'Drawdown Recovery Gate',
            on
              ? `ON — a filter on every Growth entry decision (never a signal; exits never filtered), on completed regular-session one-minute closes and the closing print whatever the bar resolution: a dip episode starts when a close is at least ${n('dipThresholdPercent')}% below the highest EARLIER close of the current session and the ${n('dipLookbackSessions')} before it (the peak precedes the trough; the window only discovers, it never expires an episode); entries are blocked until a close reaches trough + ${n('recoveryRetracementPercent')}% × (peak − trough) and every later observation (minute closes, opening trades, closing prints) stays at or above it for ${n('recoveryConfirmationSessions')} trading-session interval(s), to the same New York time (0 = at once), or until a close regains the peak (resolved: a fresh detection epoch); a lower trough restarts it; while the discovery window reaches before the loaded data the gate blocks; with persistent eligibility ON an armed opportunity it blocked may be decided at the confirming minute and fills at the next eligible trade, with it OFF a blocked signal is never replayed`
              : 'OFF (identical to Growth 1.3.0)'
          )
        ]
      : []
  };
}

// The trading backtest: every value as entered (a switch as ON/OFF, a choice by its label; an inactive value is saved
// and marked "not applied"), and the effective rules spelled out in the assumptions. The variation keeps the effective
// configuration only.
function tradingProfile(spec: StrategySpec, req: LabRunRequest): Profile {
  const p = req.params;
  const hold = isActive(spec, p, 'maximumHoldDays');
  const buffer = isActive(spec, p, 'intradayLossBufferPercent');
  const continuation = continuationText(spec, p);
  const gates = gateTexts(spec, p, req.resolution);
  const optional = optionalRuleTexts(spec, p);
  const drawdown = drawdownGateTexts(spec, p);
  const resolution = { key: 'resolution', label: 'Bar resolution', value: req.resolution, unit: 'text' as const };
  const params: LabValue[] = [...paramSnapshot(spec, p), resolution];
  const variationParams: LabValue[] = [...paramSnapshot(spec, effectiveParams(spec, p)), resolution];
  const title = [
    'Growth',
    ...optional.entryTitle,
    req.resolution,
    `stop ${p.trailingStopPercent}%`,
    hold ? `hold ${p.maximumHoldDays}d` : 'hold off',
    buffer ? `buffer ${p.intradayLossBufferPercent}%` : 'buffer off',
    `${p.costBpsPerSide} bps`,
    continuation.title,
    ...gates.titles,
    ...optional.titles,
    ...drawdown.titles
  ].join(' · ');
  const assumptions: LabValue[] = [
    text(
      'kind',
      'Trading backtest',
      'executed entries and exits with P&L; each symbol an independent standalone backtest, never summed or shared-capital; not comparable with a shared-slot pool such as vg-balanced'
    ),
    text('entry', 'Entry', optional.entry),
    text('continuation', 'Continuation entries', continuation.assumption),
    ...(spec.params.some((x) => x.key === 'trendFilterEnabled') ? gates.assumptions : []),
    ...optional.assumptions,
    ...drawdown.assumptions,
    text(
      'position',
      'Position',
      'all-in or flat: one position, $100,000 fixed notional per trade, no pyramiding, never compounded'
    ),
    text(
      'reentry',
      'Re-entry',
      'a fresh signal after an exit (also later in the exit session); signals while invested or with an order pending are ignored, never replayed; no lower-price test, loss restriction, cooldown or reset'
    ),
    text(
      'stop',
      'Trailing stop (always on)',
      `${p.trailingStopPercent}% below the post-entry high (raised after each session); active only while selling at the stop would be profitable after interest; fills at the stop price, or at the opening trade after a gap`
    ),
    text(
      'hold',
      'Maximum losing hold',
      hold
        ? `ON: from ${p.maximumHoldDays} calendar days, a losing opening trade (net after interest) sells at the next trade`
        : 'OFF: no loss exit — a losing position (whose stop is inactive) can stay open indefinitely; it is reported as open, marked at the last close'
    ),
    text(
      'buffer',
      'Buffered intraday loss',
      buffer
        ? `ON: from the hold age, the first completed minute whose close puts net P&L after interest at or below −$${((p.intradayLossBufferPercent as number) * 1000).toLocaleString('en-US')} sells at the next eligible trade`
        : hold
          ? 'OFF'
          : 'OFF (it applies only from the maximum-hold age, which is off)'
    ),
    text(
      'interest',
      'Margin interest',
      '11% simple annual on the $100,000, per calendar day between the entry and exit session dates (365-day year); accrued, not paid, on an open position'
    ),
    text('costs', 'Costs', `${p.costBpsPerSide} bps per side on every fill; $0 commission; no bid-ask spread`),
    text(
      'fills',
      'Fill prices',
      'observed minute-bar opening trades and closing prints as proxies; a stop crossed within a minute fills at the stop price (assumed; could be worse)'
    ),
    text(
      'marks',
      'Marks and drawdowns',
      'realized net + the open position marked net of interest at every minute close and session close (exit cost not charged); drawdown % = of the $100,000 notional'
    )
  ];
  return {
    sourceRef: 'src/growth-trading/riseTrading.ts',
    sourcePaths: TRADING_SOURCE_PATHS,
    params,
    variationParams,
    title,
    assumptions
  };
}

/** A form strategy's run profile (parameter snapshot, variation parameters, title, assumptions, code paths). */
export const runProfile = (spec: StrategySpec, req: LabRunRequest): Profile =>
  spec.key === RISE_FROM_RECENT_LOW_TRADING.key ? tradingProfile(spec, req) : signalOnlyProfile(spec, req);

// Recorded for every manual run (after the strategy's own assumptions), as they always were.
export function dataAssumptions(req: LabRunRequest, partition: string): LabValue[] {
  const common: LabValue[] = [
    {
      key: 'bars',
      label: 'Bars',
      value: `${RESOLUTION_LABEL[req.resolution]}, regular session (09:30–16:00 ET), split-adjusted forward to the first loaded session`,
      unit: 'text'
    },
    {
      key: 'signalTime',
      label: 'Signal time',
      value: 'the end of the completed signal bar (first knowable)',
      unit: 'text'
    },
    {
      key: 'lookback',
      label: 'Lookback',
      value: 'counts bars present in the data, the signal bar included',
      unit: 'text'
    },
    {
      key: 'trigger',
      label: 'Trigger',
      value: 'edge: previous bar below its threshold, signal bar at/above; rearms after a bar below',
      unit: 'text'
    }
  ];
  const outcomes: LabValue[] =
    req.strategyKey === RISE_FROM_RECENT_LOW_TRADING.key
      ? []
      : [
          {
            key: 'outcomes',
            label: 'Forward outcomes',
            value:
              'returns after 5/21/63 sessions, MFE/MAE and targets over 63 sessions, inside the window only; censored = null',
            unit: 'text'
          }
        ];
  return [
    ...common,
    ...outcomes,
    {
      key: 'access',
      label: 'Data access',
      value: `manual evaluation of ${partition} dates (src/lib/evaluation.ts)`,
      unit: 'text'
    }
  ];
}

export class LabService {
  private symbolCache: { at: number; names: Set<string> } | null = null;

  constructor(
    private repo: Repo,
    private cfg: Config,
    private jobs: Jobs,
    private prices: MarketPrices
  ) {}

  knownSymbols(): Set<string> {
    if (!this.symbolCache || Date.now() - this.symbolCache.at > 60_000)
      this.symbolCache = { at: Date.now(), names: new Set(this.prices.symbols().map((s) => s.symbol)) };
    return this.symbolCache.names;
  }

  /** One manual test of one configuration. Never a sweep: exactly one parameter set per request. */
  createManualRun(body: unknown): { errors: string[] } | { runId: string } {
    const errors = validateRunRequest(body, this.knownSymbols());
    if (errors.length) return { errors };
    return this.queueFormRun(body as LabRunRequest, GROWTH_EXPERIMENT, {
      createdBy: 'Strategy Lab manual Run Test'
    });
  }

  // A run of a form strategy (signal-only or Growth): its profile, variation, run row and request.json.
  private queueFormRun(
    req: LabRunRequest,
    experiment: { slug: string; title: string; description: string },
    provenance: Record<string, unknown>,
    phenotypeId: number | null = null
  ): { runId: string } {
    const spec = findStrategy(req.strategyKey, req.strategyVersion)!;
    const exp = this.repo.ensureExperiment(experiment.slug, experiment.title, experiment.description);
    const profile = runProfile(spec, req);
    const strat = this.ensureRegistered(spec, profile.sourceRef);
    const canonical = variationIdentity(spec, req.params, req.resolution);
    const parent = req.parentVariation ? this.repo.variationIdOf(req.parentVariation) : null;
    const variation = this.repo.findOrCreateVariation({
      strategyId: strat.id,
      experimentId: exp.id,
      params: profile.variationParams,
      canonical,
      title: profile.title,
      origin: 'manual',
      parentVariationId: parent
    });
    const partition = partitionsTouched(this.cfg.repoRoot, req.from, req.to);
    const assumptions = [...profile.assumptions, ...dataAssumptions(req, partition)];
    const run = this.repo.createRun({
      variationId: variation.id,
      title: req.title?.trim() || '',
      kind: 'manual',
      status: 'queued',
      dataOrigin: 'real',
      symbols: req.symbols,
      window: { from: req.from, to: req.to, resolution: req.resolution, partition },
      params: profile.params,
      assumptions,
      request: req,
      priceSource: { kind: 'market', basisDate: req.from },
      provenance: { ...provenance, variation: variation.publicId, variationCreated: variation.created },
      codeRevision: codeRevision(this.cfg.repoRoot, profile.sourcePaths),
      phenotypeId
    });
    atomicWrite(
      join(this.cfg.stateDir, runDirName(run.publicId), 'request.json'),
      `${JSON.stringify({ runId: run.publicId, ...req }, null, 2)}\n`
    );
    this.jobs.enqueue(run.id, run.publicId);
    return { runId: run.publicId };
  }

  /** The strategy row of a registry version (created on first use; display metadata kept current). */
  ensureRegistered(spec: StrategySpec, sourceRef: string) {
    return this.repo.ensureStrategy({
      key: spec.key,
      version: spec.version,
      title: spec.title,
      kind: spec.kind,
      runnable: spec.launch === 'form',
      description: spec.description,
      schema: schemaOf(spec),
      sourceRef
    });
  }

  // ----- the phenotype catalogue: capabilities and single reruns (never a search) -----

  /** Whether and how a phenotype can run here, decided from the registry and this checkout — never simulated. */
  capabilityOf(ph: NonNullable<ReturnType<Repo['phenotypeDetail']>>): PhenotypeCapability {
    const spec = findStrategy(ph.strategy.key, ph.strategy.version);
    if (!spec) return { runnable: false, reason: `strategy ${ph.strategy.key}@${ph.strategy.version} is not registered here` };
    if (ph.executionKind === 'shared-slot pool') {
      const pool = (ph.record as { pool?: { runner?: string; config?: { file: string } } }).pool;
      if (spec.launch !== 'phenotype' || pool?.runner !== 'study8')
        return { runnable: false, reason: 'no registered runner executes this pool under its real allocator contract' };
      const missing = [...STUDY8_RECORDS, pool.config!.file].filter((f) => !existsSync(join(this.cfg.repoRoot, f)));
      if (missing.length)
        return { runnable: false, reason: `view-only: the sealed Study 8 records are missing in this checkout (${missing.join(', ')})` };
      const absent = ph.symbols.filter((x) => !this.knownSymbols().has(x));
      if (absent.length) return { runnable: false, reason: `view-only: no local data for ${absent.join(', ')}` };
      return {
        runnable: true,
        runner: 'study8-pool',
        reason:
          'one allocator replay through the unchanged Study 8 runner (one shared funded $100,000 slot); start fixed at 2016-01-04 (the Study 8 contract); choose the end; parameters, symbols and costs are locked to the sealed configuration',
        locked: ['params', 'symbols', 'from', 'resolution', 'costs'],
        fixedFrom: '2016-01-04'
      };
    }
    // A superseded Growth version keeps its phenotypes runnable as ITSELF: its configuration replays on the current
    // engine with the later options OFF (proven identical by the OFF parity tests), never reinterpreted.
    const legacyGrowth = spec.launch === 'phenotype' && spec.kind === 'trades' && Boolean(spec.legacy);
    if (spec.launch !== 'form' && !legacyGrowth)
      return { runnable: false, reason: `${spec.key}@${spec.version} is not launchable (legacy or read-only)` };
    const base =
      ph.executionKind === 'independent-symbol batch'
        ? 'one standalone backtest per symbol in ONE run (independent $100,000 books, never summed); edits make a derived variation'
        : 'one standalone backtest; edits (parameters, resolution) make a new variation derived from the frozen phenotype';
    return {
      runnable: true,
      runner: spec.kind === 'trades' ? 'growth-trading' : 'entry-signal',
      reason: legacyGrowth
        ? `${base}; a ${spec.version} configuration, rerun as ${spec.version} (${spec.legacy!.replay.split(';')[0]}). To try the newer options on it, clone the result into a New test`
        : base,
      locked: []
    };
  }

  /** ONE run of ONE catalogue phenotype (optionally with edits, which make a derived variation). */
  createPhenotypeRun(publicId: string, body: unknown): { errors: string[] } | { runId: string } | null {
    const ph = this.repo.phenotypeDetail(publicId);
    if (!ph) return null;
    const cap = this.capabilityOf(ph);
    if (!cap.runnable) return { errors: [`phenotype ${publicId} cannot run here: ${cap.reason}`] };
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return { errors: ['request: must be a JSON object'] };
    const b = body as Record<string, unknown>;
    const allowed = new Set(['title', 'from', 'to', 'symbols', 'params', 'resolution']);
    const unknown = Object.keys(b).filter((k) => !allowed.has(k));
    if (unknown.length) return { errors: unknown.map((k) => `request: unknown field "${k}"`) };
    const record = ph.record as unknown as PhenotypeRecord;
    const origin = {
      id: ph.id,
      key: ph.key,
      study: ph.studyRef,
      role: ph.role,
      rank: ph.rank,
      recordSha256: ph.recordSha256,
      import: ph.import.id,
      exposure: record.data?.exposure ?? null
    };
    if (ph.executionKind === 'shared-slot pool') return this.createPoolRun(ph, record, b, origin);

    const params = { ...(record.params ?? {}), ...((b.params as Record<string, unknown> | undefined) ?? {}) };
    const req: LabRunRequest = {
      strategyKey: ph.strategy.key,
      strategyVersion: ph.strategy.version,
      params: params as LabRunRequest['params'],
      symbols: (b.symbols as string[] | undefined) ?? ph.symbols,
      from: b.from as string,
      to: b.to as string,
      resolution: (b.resolution as LabRunRequest['resolution'] | undefined) ?? record.resolution!,
      ...(typeof b.title === 'string' && b.title.trim() ? { title: b.title.trim() } : {}),
      phenotypeId: ph.id
    };
    const errors = validateRunRequest(req, this.knownSymbols(), 'phenotype');
    if (errors.length) return { errors };
    const spec = findStrategy(req.strategyKey, req.strategyVersion)!;
    const editedKeys = [
      ...Object.keys({ ...effectiveParams(spec, req.params), ...(record.params ?? {}) }).filter(
        (k) => effectiveParams(spec, req.params)[k] !== record.params?.[k]
      ),
      ...(req.resolution !== record.resolution ? ['resolution'] : [])
    ];
    return this.queueFormRun(
      req,
      PHENOTYPE_EXPERIMENT,
      {
        createdBy: 'Strategy Lab phenotype rerun (one configuration)',
        phenotype: origin,
        phenotypeEdited: editedKeys.length > 0,
        editedKeys,
        symbolsChanged: JSON.stringify([...req.symbols].sort()) !== JSON.stringify([...ph.symbols].sort())
      },
      ph.internalId
    );
  }

  private createPoolRun(
    ph: NonNullable<ReturnType<Repo['phenotypeDetail']>>,
    record: PhenotypeRecord,
    b: Record<string, unknown>,
    origin: Record<string, unknown>
  ): { errors: string[] } | { runId: string } {
    const pool = record.pool!;
    const errors: string[] = [];
    if (b.params !== undefined) errors.push('params: a shared-slot pool phenotype runs its sealed configuration only');
    if (b.resolution !== undefined) errors.push('resolution: fixed (1-minute pools engine)');
    if (b.symbols !== undefined && JSON.stringify([...(b.symbols as string[])].sort()) !== JSON.stringify(ph.symbols))
      errors.push(`symbols: fixed to the pool's books ${ph.symbols.join('+')} (never independent symbol tests)`);
    if (b.from !== undefined && b.from !== pool.fixedStart) errors.push(`from: fixed at ${pool.fixedStart} by the Study 8 contract`);
    if (typeof b.to !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.to) || b.to < '2017-06-15')
      errors.push('to: a YYYY-MM-DD end date after the 2017-06-15 arming');
    if (b.title !== undefined && (typeof b.title !== 'string' || b.title.length > 160)) errors.push('title: at most 160 characters');
    if (errors.length) return { errors };
    const spec = STUDY8_POOL;
    const exp = this.repo.ensureExperiment(PHENOTYPE_EXPERIMENT.slug, PHENOTYPE_EXPERIMENT.title, PHENOTYPE_EXPERIMENT.description);
    const strat = this.ensureRegistered(spec, 'src/study8-runners/');
    const books: LabValue[] = [
      text('sealedId', 'Sealed configuration', pool.sealedId),
      text('alias', 'Study 8 alias', pool.alias),
      text('config', 'Research pool config', `${pool.config.file} (sha256 ${pool.config.sha256.slice(0, 12)}…)`),
      ...Object.entries(pool.books).flatMap(([sym, book]) =>
        Object.entries(book).map(([k, v]) => ({ key: `${sym}.${k}`, label: `${sym} ${k} (engine encoding)`, value: v, unit: 'index' as const }))
      )
    ];
    const variation = this.repo.findOrCreateVariation({
      strategyId: strat.id,
      experimentId: exp.id,
      params: books,
      canonical: pool.sealedId,
      title: `${ph.name} (rerun)`,
      origin: 'manual',
      parentVariationId: null
    });
    const to = b.to as string;
    const partition = partitionsTouched(this.cfg.repoRoot, pool.fixedStart, to);
    const assumptions: LabValue[] = [
      text('semantics', 'Shared-slot pool', 'ONE allocator replay: one funded $100,000 slot shared by the books, first executable signal wins, no preemption; never independent per-symbol backtests, never summed standalone results'),
      text('runner', 'Runner', 'the unchanged Study 8 local runner (src/study8-runners/) and pools engine; Strategy Lab converts its lots and funding decisions into events'),
      text('window', 'Window', `accounting from the close of ${pool.fixedStart}, arming on 2017-06-15 (fixed by the Study 8 contract), to ${to}`),
      text('costs', 'Costs', `${record.execution.costBpsPerSide} bps per side (sealed), 11% simple interest, stops at the stop or the gapped open`),
      text('reconciliation', 'Reconciliation', `with the sealed F24 record only for the sealed run (to 2026-10-29 at 5 bps); otherwise reported as not applicable`),
      text('exposure', 'Data exposure', record.data.exposure)
    ];
    const request: Omit<PoolRerunRequest, 'runId'> = {
      kind: 'study8-pool-rerun',
      strategyKey: 'study8-d1-pool',
      strategyVersion: 'pools-engine',
      phenotypeId: ph.id,
      alias: pool.alias,
      sealedId: pool.sealedId,
      end: to,
      costBps: record.execution.costBpsPerSide,
      symbols: ph.symbols
    };
    const run = this.repo.createRun({
      variationId: variation.id,
      title: typeof b.title === 'string' && b.title.trim() ? b.title.trim() : '',
      kind: 'manual',
      status: 'queued',
      dataOrigin: 'real',
      symbols: ph.symbols,
      window: { from: pool.fixedStart, to, resolution: '1m', partition },
      params: books,
      assumptions,
      request,
      priceSource: { kind: 'market', basisDate: pool.fixedStart },
      provenance: { createdBy: 'Strategy Lab phenotype rerun (shared-slot pool)', phenotype: origin, phenotypeEdited: false, variation: variation.publicId },
      codeRevision: codeRevision(this.cfg.repoRoot, POOL_SOURCE_PATHS),
      phenotypeId: ph.internalId
    });
    atomicWrite(
      join(this.cfg.stateDir, runDirName(run.publicId), 'request.json'),
      `${JSON.stringify({ runId: run.publicId, ...request }, null, 2)}\n`
    );
    this.jobs.enqueue(run.id, run.publicId);
    return { runId: run.publicId };
  }
}

export interface PhenotypeCapability {
  runnable: boolean;
  runner?: 'growth-trading' | 'entry-signal' | 'study8-pool';
  reason: string;
  locked?: string[];
  fixedFrom?: string;
}

const STUDY8_RECORDS = [
  'research/study8-expanded-regime-d1/FROZEN_SELECTION.json',
  'research/study8-expanded-regime-d1/results/test/F24/test.json',
  'research/study8-expanded-regime-d1/results/test/F24/test-lots.jsonl.gz'
];

export const PHENOTYPE_EXPERIMENT = {
  slug: 'phenotype-reruns',
  title: 'Phenotype reruns',
  description:
    'Single manual reruns of frozen catalogue phenotypes (one configuration per action; never a search). Each run records its phenotype and study.'
};

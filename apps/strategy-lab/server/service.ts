// Creating runs: manual single tests (validated, then queued for the runner) and the seeding of the synthetic demo.

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { readPartitionConfig } from '../../../src/lib/partitions.ts';
import type { LabRunRequest, LabValue, StrategySpec } from '../shared/contract.ts';
import { RESOLUTION_LABEL } from '../shared/contract.ts';
import {
  canonicalParams,
  findStrategy,
  isParamApplied,
  RISE_FROM_RECENT_LOW_TRADING,
  validateRunRequest
} from '../shared/strategies.ts';
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

interface Profile {
  sourceRef: string;
  sourcePaths: readonly string[];
  params: LabValue[];
  title: string;
  assumptions: LabValue[];
}

const text = (key: string, label: string, value: string): LabValue => ({ key, label, value, unit: 'text' });

// The signal-only strategy: exactly the snapshot, title and assumptions it has always recorded.
function signalOnlyProfile(spec: StrategySpec, req: LabRunRequest): Profile {
  return {
    sourceRef: 'src/entry-signals/riseFromRecentLow.ts',
    sourcePaths: SOURCE_PATHS,
    params: [
      ...spec.params.map((p) => ({ key: p.key, label: p.label, value: req.params[p.key]!, unit: p.unit })),
      { key: 'resolution', label: 'Bar resolution', value: req.resolution, unit: 'text' as const }
    ],
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

// The trading backtest: every value as entered (a switch as ON/OFF; an input whose switch is off is saved and marked
// "not applied"), and the effective rules spelled out in the assumptions.
function tradingProfile(spec: StrategySpec, req: LabRunRequest): Profile {
  const p = req.params;
  const applied = (key: string) => isParamApplied(spec, p, key);
  const hold = p.maximumHoldEnabled === true;
  const buffer = hold && p.intradayLossBufferEnabled === true;
  const params: LabValue[] = [
    ...spec.params.map((s): LabValue => {
      const value = p[s.key]!;
      if (s.type === 'boolean') return text(s.key, `${s.label} (switch)`, value === true ? 'ON' : 'OFF');
      return {
        key: s.key,
        label: applied(s.key) ? s.label : `${s.label} — saved, not applied (switch off)`,
        value: value as number,
        unit: s.unit
      };
    }),
    text('resolution', 'Bar resolution', req.resolution)
  ];
  const title = [
    'Trading',
    `X ${p.advanceFromRecentLowPercent}%`,
    `N ${p.recentLowLookbackBars} bars`,
    req.resolution,
    `stop ${p.trailingStopPercent}%`,
    hold ? `hold ${p.maximumHoldDays}d` : 'hold off',
    buffer ? `buffer ${p.intradayLossBufferPercent}%` : 'buffer off',
    `${p.costBpsPerSide} bps`
  ].join(' · ');
  const assumptions: LabValue[] = [
    text(
      'kind',
      'Trading backtest',
      'executed entries and exits with P&L; each symbol an independent standalone backtest, never summed or shared-capital; not comparable with a shared-slot pool such as vg-balanced'
    ),
    text(
      'entry',
      'Entry',
      'only the unchanged Rise-from-Recent-Low signal, decided when the signal bar completes; filled at the next eligible trade (a daily signal: the next session’s opening trade)'
    ),
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
    title,
    assumptions
  };
}

// Recorded for every manual run (after the strategy's own assumptions), as they always were.
function dataAssumptions(req: LabRunRequest, partition: string): LabValue[] {
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
    const req = body as LabRunRequest;
    const spec = findStrategy(req.strategyKey, req.strategyVersion)!;
    const exp = this.repo.ensureExperiment(
      GROWTH_EXPERIMENT.slug,
      GROWTH_EXPERIMENT.title,
      GROWTH_EXPERIMENT.description
    );
    const profile = spec.key === RISE_FROM_RECENT_LOW_TRADING.key ? tradingProfile(spec, req) : signalOnlyProfile(spec, req);
    const strat = this.repo.ensureStrategy({
      key: spec.key,
      version: spec.version,
      title: spec.title,
      kind: spec.kind,
      runnable: true,
      description: spec.description,
      params: spec.params,
      sourceRef: profile.sourceRef
    });
    const canonical = canonicalParams({ ...req.params }) + `|${req.resolution}`;
    const parent = req.parentVariation ? this.repo.variationIdOf(req.parentVariation) : null;
    const variation = this.repo.findOrCreateVariation({
      strategyId: strat.id,
      experimentId: exp.id,
      params: profile.params,
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
      provenance: {
        createdBy: 'Strategy Lab manual Run Test',
        variation: variation.publicId,
        variationCreated: variation.created
      },
      codeRevision: codeRevision(this.cfg.repoRoot, profile.sourcePaths)
    });
    atomicWrite(
      join(this.cfg.stateDir, runDirName(run.publicId), 'request.json'),
      `${JSON.stringify({ runId: run.publicId, ...req }, null, 2)}\n`
    );
    this.jobs.enqueue(run.id, run.publicId);
    return { runId: run.publicId };
  }
}

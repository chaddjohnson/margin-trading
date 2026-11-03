// Which src/app/ entry points take phenotypes, and how. Every entry point is listed exactly once, either as
// compatible (with the architecture whose parameters it takes, the parameters it may ignore and why) or with the
// reason it doesn't take phenotypes (tests/registry.test.ts keeps this complete, and the matrix in
// config/phenotypes/COMPATIBILITY.md is generated from it).
//
// A compatible strategy file is never edited: injection.ts derives a parameter-injectable module from its source.
// A parameter of the architecture is either applied (the file declares it, as `const name = literal;` or
// `const name = nameOption ?? literal;`) or explicitly ignorable here; any other gap makes the phenotype
// incompatible with the file and the run is refused.

export interface CompatibleStrategy {
  script: string; // src/app/<script>.ts, as `npm run app -- <script>`
  architecture: string;
  summary: string;
  // The warm-up test before arming, where the first eligible session of an execution profile is added.
  armingGuard: string;
  // Architecture parameters the file has no use for, each with the reason. Ignoring is reported on every run.
  ignorable: Record<string, string>;
  // The file's own mechanism constants, which no phenotype of the architecture sets: they keep the file's
  // values, and the run reports them.
  strategyConstants: string[];
}

export type EntryPointCategory = 'strategy' | 'optimizer' | 'research' | 'portfolio' | 'utility';

export interface IncompatibleEntryPoint {
  script: string;
  category: EntryPointCategory;
  reason: string;
}

// The positional arguments every compatible file's default export takes (`npm run app -- <script> <symbol>
// [start date] [end date] [data file] [output dir] [stop fill] [trailing buy percentage] [intraday loss
// buffer]`). The last two set phenotype parameters, so they conflict with --phenotype.
export const positionalArguments = [
  'symbol',
  'startDate',
  'endDate',
  'dataFile',
  'outDir',
  'stopFill',
  'trailingBuyPercentage',
  'intradayLossBuffer'
] as const;

export const phenotypePositionals: Record<number, string> = { 6: 'trailingBuyPercentage', 7: 'intradayLossBuffer' };

// The execution constants a profile can set in every compatible file.
export const executionConstants = ['investmentAmount', 'marginInterestRate'] as const;

const d1Guard = 'if (warmup + index < tickWindowSize) {';
const file4Guard = 'if (warmup + index < tickWindowSize || !isDip(bar.close)) {';
const noContinuation = 'the file has no post-exit continuation mechanism';
const noContinuationIgnorable = { pullback: noContinuation, continuationWindow: noContinuation };

export const compatibleStrategies: CompatibleStrategy[] = [
  {
    script: 'allIn-trailingBuy-postExitContinuation',
    architecture: 'D1',
    summary: 'D1 itself: file 4 plus post-exit continuation',
    armingGuard: d1Guard,
    ignorable: {},
    strategyConstants: []
  },
  {
    script: 'allIn-trailingBuy-postExitContinuation-stopGrossThreshold',
    architecture: 'D1',
    summary: 'D1 with the stop active once the post-entry high is activationGain above entry (gross)',
    armingGuard: d1Guard,
    ignorable: {},
    strategyConstants: ['activationGain']
  },
  {
    script: 'allIn-trailingBuy-postExitContinuation-stopGrossBreakeven',
    architecture: 'D1',
    summary: 'D1 with the stop active once its level is at or above the entry price (gross breakeven)',
    armingGuard: d1Guard,
    ignorable: {},
    strategyConstants: []
  },
  {
    script: 'allIn-trailingBuy-postExitContinuation-stopTwoStage',
    architecture: 'D1',
    summary: 'D1 with an earlyStop protective stop until the D1 stop becomes active',
    armingGuard: d1Guard,
    ignorable: {},
    strategyConstants: ['earlyStop']
  },
  {
    script: 'allIn-trailingBuy-postExitContinuation-stopAlways',
    architecture: 'D1',
    summary: 'D1 with the trailing stop always active',
    armingGuard: d1Guard,
    ignorable: {},
    strategyConstants: []
  },
  {
    script: 'allIn-trailingBuy-troughRecovery-postExitContinuation',
    architecture: 'D1',
    summary: 'D1 plus recovery-from-trough arming',
    armingGuard: d1Guard,
    ignorable: {},
    strategyConstants: [
      'troughRecovery',
      'troughRetrace',
      'episodeReset',
      'episodeExpiry',
      'anchorPolicy',
      'resetPolicy'
    ]
  },
  {
    script: 'allIn-trailingBuy-bufferedLoss-noReentry',
    architecture: 'D1',
    summary: 'file 4: the D1 core without post-exit continuation',
    armingGuard: file4Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: []
  },
  {
    script: 'allIn-trailingBuy-troughRecovery',
    architecture: 'D1',
    summary: 'file 4 plus recovery-from-trough arming',
    armingGuard: d1Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: [
      'troughRecovery',
      'troughRetrace',
      'episodeReset',
      'episodeExpiry',
      'anchorPolicy',
      'resetPolicy'
    ]
  },
  {
    script: 'allIn-trailingBuy-dualMode',
    architecture: 'D1',
    summary: 'file 4 plus a shallow (X2, Y2) entry path',
    armingGuard: d1Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: ['shallowDepth', 'shallowRebound']
  },
  {
    script: 'allIn-trailingBuy-episodeLatch',
    architecture: 'D1',
    summary: 'file 4 plus the correction-episode latch',
    armingGuard: d1Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: ['latchDepth', 'episodeReset', 'episodeExpiry', 'anchorPolicy', 'resetPolicy']
  },
  {
    script: 'allIn-trailingBuy-depthRebound',
    architecture: 'D1',
    summary: 'file 4 with a correction-depth-adjusted rebound',
    armingGuard: file4Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: ['reboundDepthSlope']
  },
  {
    script: 'allIn-trailingBuy-episodeBudget',
    architecture: 'D1',
    summary: 'file 4 plus a correction-episode loss budget',
    armingGuard: file4Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: ['episodeLossBudget', 'episodeResetRetrace']
  },
  {
    script: 'allIn-trailingBuy-invalidation',
    architecture: 'D1',
    summary: 'file 4 plus a failed-recovery invalidation exit',
    armingGuard: file4Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: ['invalidationBuffer']
  },
  {
    script: 'allIn-trailingBuy-persistence',
    architecture: 'D1',
    summary: 'file 4 with a rebound-persistence confirmation',
    armingGuard: file4Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: ['confirmMinutes']
  },
  {
    script: 'allIn-trailingBuy-progressHold',
    architecture: 'D1',
    summary: 'file 4 with a progress-based hold extension',
    armingGuard: file4Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: ['progressThreshold', 'holdExtensionDays']
  },
  {
    script: 'allIn-trailingBuy-staged',
    architecture: 'D1',
    summary: 'file 4 buying in two legs (initialFraction, then the rest after addTrigger)',
    armingGuard: file4Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: ['initialFraction', 'addTrigger']
  },
  {
    script: 'allIn-trailingBuy-bufferedLoss',
    architecture: 'D1',
    summary: 'the D1 core with the re-entry restriction after a material loss, without post-exit continuation',
    armingGuard: file4Guard,
    ignorable: noContinuationIgnorable,
    strategyConstants: ['materialLossThreshold', 'lowerPriceReentry', 'retraceFraction']
  }
];

export const incompatibleEntryPoints: IncompatibleEntryPoint[] = [
  {
    script: 'allIn',
    category: 'strategy',
    reason:
      'a different architecture: an immediate buy on a 10% dip (no trailing buy, no buffered intraday loss exit) with a re-entry restriction'
  },
  {
    script: 'allIn-original',
    category: 'strategy',
    reason: 'the original daily-bar strategy: no trailing buy, no buffered intraday loss exit'
  },
  {
    script: 'allIn-trailingBuy',
    category: 'strategy',
    reason:
      'no buffered intraday loss exit, so D1 intradayLossBuffer would be dropped (it is a core exit, not ignorable); it also adds a re-entry restriction'
  },
  {
    script: 'allIn-trailingBuy-noReentry',
    category: 'strategy',
    reason: 'no buffered intraday loss exit, so D1 intradayLossBuffer would be dropped (a core exit, not ignorable)'
  },
  {
    script: 'allIn-trailingBuy-alwaysArmed',
    category: 'strategy',
    reason:
      'a no-dip entry architecture (C1): X and the reference high only appear in its reports, so D1 X and L would have no effect; it needs its own architecture entry'
  },
  {
    script: 'allIn-trailingBuy-swingLow',
    category: 'strategy',
    reason:
      'a no-dip entry architecture (C2, swingLookback/swingProximity): D1 X and L would have no effect; it needs its own architecture entry'
  },
  {
    script: 'allIn-trailingBuy-D1-swingLow-P2s',
    category: 'portfolio',
    reason:
      'a fixed two-strategy portfolio runner on the shared-margin engine, whose strategy settings come from src/shared-margin-portfolio/; not a single-strategy file'
  },
  {
    script: 'allIn-trailingBuy-swingLow-standalone',
    category: 'portfolio',
    reason: 'a wrapper around the P2s runner on the shared-margin engine (its swing-low leg alone)'
  },
  {
    script: 'allIn-optimizable',
    category: 'optimizer',
    reason: "the daily-bar optimizer's parameterized engine: its parameter vector comes from the optimizer"
  },
  {
    script: 'allIn-minute-optimizable',
    category: 'optimizer',
    reason: "the minute optimizer's parameterized engine: its parameter vector comes from the optimizer"
  },
  { script: 'ladderUp', category: 'strategy', reason: 'a different strategy (laddered buys) with no arguments' },
  { script: 'ladderDown', category: 'strategy', reason: 'a different strategy (laddered buys) with no arguments' },
  { script: 'optimizer', category: 'optimizer', reason: 'optimizer command line' },
  { script: 'minuteOptimizer', category: 'optimizer', reason: 'optimizer command line' },
  { script: 'fourFamily', category: 'research', reason: 'research program command line' },
  { script: 'trailingBuy', category: 'research', reason: 'research program command line' },
  { script: 'trailingBuyVariants', category: 'research', reason: 'research program command line' },
  { script: 'recoveryEligibility', category: 'research', reason: 'research program command line' },
  { script: 'd1Refinement', category: 'research', reason: 'research program command line' },
  { script: 'sharedMargin', category: 'research', reason: 'research program command line' },
  { script: 'multiEtfD1', category: 'research', reason: 'research program command line' },
  { script: 'multiEtfAllocator', category: 'research', reason: 'research program command line' },
  { script: 'complementaryEtfD1', category: 'research', reason: 'research program command line' },
  { script: 'portfolioAwareD1', category: 'research', reason: 'research program command line' },
  { script: 'joint16EtfD1', category: 'research', reason: 'research program command line' },
  { script: 'robustD1', category: 'research', reason: 'research program command line' },
  { script: 'diverseD1', category: 'research', reason: 'research program command line' },
  { script: 'intradayStudy', category: 'research', reason: 'research program command line' },
  {
    script: 'phenotypes',
    category: 'utility',
    reason: 'the phenotype registry utility itself (list, validate, matrix)'
  },
  {
    script: 'pools',
    category: 'utility',
    reason:
      'named shared-pool configurations (config/pools/) and their prospective comparison; pools, not single phenotypes'
  },
  {
    script: 'datasets',
    category: 'utility',
    reason: 'the canonical dataset migration and verification script (npm run datasets), not a strategy'
  },
  {
    script: 'marketEvents',
    category: 'utility',
    reason: 'the split and distribution ledger tool (npm run market-events), not a strategy'
  },
  {
    script: 'legacyArchive',
    category: 'utility',
    reason: 'the legacy research-input archive builder (npm run legacy-archive), not a strategy'
  }
];

export const strategyFileOf = (script: string) => `src/app/${script}.ts`;

export const compatibleStrategyOf = (script: string) => compatibleStrategies.find((entry) => entry.script === script);

export const incompatibleEntryPointOf = (script: string) =>
  incompatibleEntryPoints.find((entry) => entry.script === script);

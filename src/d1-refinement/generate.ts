// Generates the runnable strategy files of the program under src/app/ by exact-once substitutions on the shipped
// sources: the four stop-activation alternatives from the D1 file (src/app/allIn-trailingBuy-postExitContinuation.ts),
// the two standalone no-dip entries from file 4 (src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts). The sources
// are never modified; `npm run d1-refinement -- generate` rewrites only the files listed here; parity.ts checks each
// against the engine.
import fs from 'fs-extra';
import type { StopPolicy } from './engine.ts';

export const d1Source = 'src/app/allIn-trailingBuy-postExitContinuation.ts';
export const file4Source = 'src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts';

export interface GeneratedFile {
  key: string; // family key
  file: string;
  source: string;
  kind: 'stop' | 'entry';
  policy?: StopPolicy;
  // The constants the file ships with (fractions / whole numbers).
  constants: Record<string, number>;
  // The warm-up guard line of the arming loop, for the parity copies' injected arming start.
  armingGuard: string;
}

export const generatedFiles: GeneratedFile[] = [
  {
    key: 'd1.gross',
    file: 'src/app/allIn-trailingBuy-postExitContinuation-stopGrossThreshold.ts',
    source: d1Source,
    kind: 'stop',
    policy: 'gross',
    constants: { activationGain: 0.08 },
    armingGuard: 'if (index < tickWindowSize) {'
  },
  {
    key: 'd1.breakeven',
    file: 'src/app/allIn-trailingBuy-postExitContinuation-stopGrossBreakeven.ts',
    source: d1Source,
    kind: 'stop',
    policy: 'breakeven',
    constants: {},
    armingGuard: 'if (index < tickWindowSize) {'
  },
  {
    key: 'd1.twoStage',
    file: 'src/app/allIn-trailingBuy-postExitContinuation-stopTwoStage.ts',
    source: d1Source,
    kind: 'stop',
    policy: 'twoStage',
    constants: { earlyStop: 0.1 },
    armingGuard: 'if (index < tickWindowSize) {'
  },
  {
    key: 'd1.always',
    file: 'src/app/allIn-trailingBuy-postExitContinuation-stopAlways.ts',
    source: d1Source,
    kind: 'stop',
    policy: 'always',
    constants: {},
    armingGuard: 'if (index < tickWindowSize) {'
  },
  {
    key: 'always',
    file: 'src/app/allIn-trailingBuy-alwaysArmed.ts',
    source: file4Source,
    kind: 'entry',
    // The in-sample 'balanced' refinement of Track C (research/vgt-d1-refinement/NO_DIP_ENTRY_MECHANISMS.md).
    constants: {
      trailingBuyPercentage: 0.103,
      trailingStopPercentage: 0.073,
      maximumHoldDays: 9,
      intradayLossBuffer: 0.016
    },
    armingGuard: 'if (index < tickWindowSize) {'
  },
  {
    key: 'swing',
    file: 'src/app/allIn-trailingBuy-swingLow.ts',
    source: file4Source,
    kind: 'entry',
    constants: {
      swingLookback: 55,
      swingProximity: 0,
      trailingBuyPercentage: 0.006,
      trailingStopPercentage: 0.04,
      maximumHoldDays: 26,
      intradayLossBuffer: 0.004
    },
    armingGuard: 'if (index < swingLookback || bar.close > rollingLow * (1 + swingProximity)) {'
  }
];

const pct = (fraction: number) => `${Number((fraction * 100).toFixed(4))}%`;

const once = (text: string, from: string, to: string, label: string, file: string) => {
  const matches = text.split(from).length - 1;

  if (matches !== 1) {
    throw new Error(`${file}: expected exactly one ${label}, found ${matches}`);
  }

  return text.replace(from, () => to);
};

const d1Provenance = `// Generated from allIn-trailingBuy-bufferedLoss-noReentry.ts (file 4) by src/recovery-eligibility/generate.ts:
// file 4 plus the mechanism below. Entries through the deep path, the rebound, the fills, the exits, interest,
// accounting and reports are file 4's; the mechanism adds a way for a flat strategy to arm without a fresh
// X decline from the rolling reference high. The research engine (src/recovery-eligibility/engine.ts)
// reproduces this file (parity.ts).`;

interface StopSnippets {
  title: string;
  header: string;
  constants: string;
  entryLatch: string;
  sessionLatch: string;
  eligibility: string;
  summary: string;
  suffix: string;
}

const stopSnippets = (policy: StopPolicy, constants: Record<string, number>): StopSnippets => {
  switch (policy) {
    case 'gross':
      return {
        title: 'gross-price-profit stop activation (B-A)',
        header: `// Stop activation B-A, gross-price-profit threshold: the trailing stop (post-entry high x (1 - trailingStopPercentage),
// updated once a day after each session, never lowered) may execute only once the post-entry high has reached
// entry x (1 + activationGain), tested at the same daily update as the stop level. The activation is a LATCH: it
// replaces file 4's test that a fill at the stop would net a profit after interest, and since the post-entry high
// never falls it is irreversible by construction. It is not a take-profit: nothing sells at the threshold and the
// stop follows every later high. Current constant: activation gain ${pct(constants.activationGain!)}.`,
        constants: `\n  const activationGain = ${constants.activationGain}; // appreciation of the post-entry high over the entry that activates the trailing stop`,
        entryLatch: `\n        stopActivated = postEntryHigh >= position.entryPrice * (1 + activationGain);`,
        sessionLatch: `\n        stopActivated = stopActivated || postEntryHigh >= position.entryPrice * (1 + activationGain);`,
        eligibility: `      // Stop policy B-A: eligible once the activation latch is set; the level is the trailing stop itself.
      const isStopActive = stopActivated;
      const effectiveStop = stopPrice;
`,
        summary: `\n  console.info(\n    \`Stop activation: gross threshold, latched once the post-entry high reaches entry x (1 + \${formatPercent(activationGain)}); no net-profit test\`\n  );`,
        suffix: '-stop-gross${percentName(activationGain)}'
      };
    case 'breakeven':
      return {
        title: 'gross-breakeven stop activation (B-B)',
        header: `// Stop activation B-B, gross breakeven: the trailing stop (post-entry high x (1 - trailingStopPercentage), updated
// once a day after each session, never lowered) may execute only once its level has reached the entry price
// (postEntryHigh x (1 - trailingStopPercentage) >= entryPrice, tested at the same daily update as the level). The
// activation is a LATCH, irreversible by construction since the level never falls; it replaces file 4's test that a
// fill at the stop would net a profit after interest, so a latched stop can still sell at a net loss once interest
// has accrued. Not a take-profit: the stop follows every later high.`,
        constants: '',
        entryLatch: `\n        stopActivated = stopPrice >= position.entryPrice;`,
        sessionLatch: `\n        stopActivated = stopActivated || stopPrice >= position.entryPrice;`,
        eligibility: `      // Stop policy B-B: eligible once the gross-breakeven latch is set; the level is the trailing stop itself.
      const isStopActive = stopActivated;
      const effectiveStop = stopPrice;
`,
        summary: `\n  console.info('Stop activation: gross breakeven, latched once the stop level reaches the entry price; no net-profit test');`,
        suffix: '-stop-breakeven'
      };
    case 'twoStage':
      return {
        title: 'two-stage protection (B-C)',
        header: `// Stop activation B-C, two-stage protection. EARLY stage, from the session after the entry: a fixed protective
// stop at entry x (1 - earlyStop) executes like the trailing stop (at the opening trade when the session gaps
// through it, else at the first minute that trades through it). ESTABLISHED stage, once the trailing stop level
// (post-entry high x (1 - trailingStopPercentage), updated once a day, never lowered) has reached the entry
// price at a daily update: the trailing stop executes whatever the net result; the transition is irreversible.
// Neither stage tests net profit after interest; the maximum-hold and buffered-loss exits are unchanged. Not a
// take-profit: the stop follows every later high. Current constant: early stop ${pct(constants.earlyStop!)}.`,
        constants: `\n  const earlyStop = ${constants.earlyStop}; // protective stop below the entry in the EARLY stage`,
        entryLatch: `\n        stopActivated = stopPrice >= position.entryPrice;`,
        sessionLatch: `\n        stopActivated = stopActivated || stopPrice >= position.entryPrice;`,
        eligibility: `      // Stop policy B-C: always eligible; the level is the protective stop until the trailing stop's level has reached
      // the entry price (ESTABLISHED), then the trailing stop.
      const isStopActive = true;
      const effectiveStop = stopActivated ? stopPrice : position.entryPrice * (1 - earlyStop);
`,
        summary: `\n  console.info(\n    \`Stop activation: two-stage, protective stop \${formatPercent(earlyStop)} below the entry until the trailing stop level reaches the entry price, then the trailing stop; \${protectiveStopExits} protective-stop exits\`\n  );`,
        suffix: '-stop-two-stage${percentName(earlyStop)}'
      };
    case 'always':
      return {
        title: 'always-active trailing stop (B-D)',
        header: `// Stop activation B-D, always active: the trailing stop (post-entry high x (1 - trailingStopPercentage) from the
// fill's minute onwards on the entry session, then updated once a day after each session, never lowered) may
// execute from the session after the entry whatever the position's net result. File 4's test that a fill at the
// stop would net a profit after interest is removed; the maximum-hold and buffered-loss exits are unchanged.`,
        constants: '',
        entryLatch: '',
        sessionLatch: '',
        eligibility: `      // Stop policy B-D: always eligible; the level is the trailing stop itself.
      const isStopActive = true;
      const effectiveStop = stopPrice;
`,
        summary: `\n  console.info('Stop activation: always active from the session after the entry; no net-profit test');`,
        suffix: '-stop-always'
      };
    default:
      throw new Error(`No runnable file for the ${policy} policy`);
  }
};

export const generateStopFile = (source: string, spec: GeneratedFile) => {
  const snippets = stopSnippets(spec.policy!, spec.constants);
  const latched = spec.policy !== 'always';
  let text = source;
  const replace = (from: string, to: string, label: string) => {
    text = once(text, from, to, label, spec.file);
  };

  // Header.
  replace(
    `// All in on a trailing buy after a deep dip, with a buffered intraday loss exit, no re-entry restriction, and
// post-exit continuation
//
${d1Provenance}`,
    `// All in on a trailing buy after a deep dip, with a buffered intraday loss exit, no re-entry restriction,
// post-exit continuation, and ${snippets.title}
//
// Generated from allIn-trailingBuy-postExitContinuation.ts (D1) by src/d1-refinement/generate.ts: D1 with its
// trailing stop's eligibility rule replaced by the policy below. Entries, the continuation window, the stop level,
// the fills, the other exits, interest, accounting and reports are D1's. The research engine
// (src/d1-refinement/engine.ts) reproduces this file (parity.ts). Do not edit D1 through this file.
//
${snippets.header}
//
${d1Provenance}`,
    'header'
  );

  if (spec.policy === 'twoStage') {
    replace(
      `export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap' | 'buffered intraday loss';`,
      `export type ExitReason =
  | 'maximum hold'
  | 'trailing stop'
  | 'trailing stop gap'
  | 'buffered intraday loss'
  | 'protective stop'
  | 'protective stop gap';`,
      'exit reasons'
    );
  }

  // The exit functions take the eligibility decision from the caller.
  replace(
    `  // Set before the session from the post-entry high through the previous session.
  stopPrice: number;`,
    `  // The level the stop executes at this session (the trailing stop, or the policy's protective stop).
  stopPrice: number;
  // Whether the stop may execute this session, decided before the open by the stop policy in \`runAllIn\`.
  isStopActive: boolean;`,
    'session exit options'
  );
  replace(
    `  maximumHoldDays,
  stopFill
}: SessionExitOptions): SessionExit | undefined => {`,
    `  maximumHoldDays,
  stopFill,
  isStopActive
}: SessionExitOptions): SessionExit | undefined => {`,
    'evaluateSessionExit parameters'
  );
  replace(
    `  // Before the open: the stop is active for this session only if filling at the stop price would be
  // profitable after interest through the session. Nothing from the session's own prices is used, and
  // the decision is made afresh each session, so growing interest can leave the stop inactive.
  const isStopActive = profitAt(stopPrice) > 0;
`,
    `  // Before the open: whether the stop may execute this session comes from the stop policy (isStopActive),
  // decided in \`runAllIn\` from the previous session's level and the position's state; nothing from the
  // session's own prices is used.
`,
    'evaluateSessionExit activation'
  );
  replace(
    `  const { position, session, stopPrice, interest, maximumHoldDays, intradayLossBuffer, pendingSignal } = options;
  const exit = evaluateSessionExit(options);
  const profitAt = (price: number) => position.shares * price - position.investment - interest;
  const isStopActive = profitAt(stopPrice) > 0;
`,
    `  const { position, session, stopPrice, isStopActive, interest, maximumHoldDays, intradayLossBuffer, pendingSignal } =
    options;
  const exit = evaluateSessionExit(options);
  const profitAt = (price: number) => position.shares * price - position.investment - interest;
`,
    'evaluateBufferedSessionExit activation'
  );

  // Constants and state.
  if (snippets.constants) {
    replace(
      `  const continuationWindow: number = 60; // sessions after a profitable exit during which the pullback can arm`,
      `  const continuationWindow: number = 60; // sessions after a profitable exit during which the pullback can arm${snippets.constants}`,
      'policy constant'
    );
  }

  if (latched) {
    replace(
      `  let stopPrice = 0;\n`,
      `  let stopPrice = 0;\n  let stopActivated = false; // the stop policy's activation latch for the open position\n`,
      'stop state'
    );
  }

  if (spec.policy === 'twoStage') {
    replace(
      `  let entriesWithoutTrade = 0;\n`,
      `  let entriesWithoutTrade = 0;\n  let protectiveStopExits = 0;\n`,
      'protective counter'
    );
  }

  // The daily updates.
  replace(
    `        stopPrice = postEntryHigh * (1 - trailingStopPercentage);
`,
    `        stopPrice = postEntryHigh * (1 - trailingStopPercentage);${snippets.entryLatch}
`,
    'entry stop update'
  );
  replace(
    `        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
        postEntryLow = Math.min(postEntryLow, session.low);`,
    `        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
        postEntryLow = Math.min(postEntryLow, session.low);${snippets.sessionLatch}`,
    'session stop update'
  );

  // The eligibility decision before the exits.
  replace(
    `      const interest = calculateInterest(position, session.time);

      const outcome = evaluateBufferedSessionExit({
        position,
        session,
        stopPrice,
        interest,`,
    `      const interest = calculateInterest(position, session.time);

${snippets.eligibility}
      const outcome = evaluateBufferedSessionExit({
        position,
        session,
        stopPrice: effectiveStop,
        isStopActive,
        interest,`,
    'exit evaluation'
  );

  if (spec.policy === 'twoStage') {
    replace(
      `      exit = outcome.exit;
      pendingBufferedExit = outcome.pendingSignal;
`,
      `      exit = outcome.exit;
      pendingBufferedExit = outcome.pendingSignal;

      // In the EARLY stage the level that executed was the protective stop, not the trailing stop.
      if (exit && !stopActivated && (exit.reason === 'trailing stop' || exit.reason === 'trailing stop gap')) {
        exit = { ...exit, reason: exit.reason === 'trailing stop' ? 'protective stop' : 'protective stop gap' };
        protectiveStopExits++;
      }
`,
      'protective relabel'
    );
    replace(
      `    'buffered intraday loss': \`net loss of at least \${formatPercent(intradayLossBuffer)} of the investment at a completed minute's close from day \${maximumHoldDays}, sold at the next trade\`
  };`,
      `    'buffered intraday loss': \`net loss of at least \${formatPercent(intradayLossBuffer)} of the investment at a completed minute's close from day \${maximumHoldDays}, sold at the next trade\`,
    'protective stop': \`protective stop \${formatPercent(earlyStop)} below the entry (EARLY stage)\`,
    'protective stop gap': \`protective stop \${formatPercent(earlyStop)} below the entry (EARLY stage), filled at the opening trade after a gap down\`
  };`,
      'exit reason descriptions'
    );
  }

  // Reports.
  replace(
    `  console.info(\`Trailing stop percentage: \${formatPercent(trailingStopPercentage)}\`);`,
    `  console.info(\`Trailing stop percentage: \${formatPercent(trailingStopPercentage)}\`);${snippets.summary}`,
    'summary'
  );
  replace('-window${continuationWindow}`;', `-window\${continuationWindow}${snippets.suffix}\`;`, 'strategy name');

  return text;
};

const file4Title = `// All in on a trailing buy after a 10% dip, with a buffered intraday loss exit and without any re-entry
// restriction after a loss
//`;

export const generateEntryFile = (source: string, spec: GeneratedFile) => {
  let text = source;
  const replace = (from: string, to: string, label: string) => {
    text = once(text, from, to, label, spec.file);
  };
  const { constants } = spec;
  const isSwing = spec.key === 'swing';

  replace(
    file4Title,
    isSwing
      ? `// All in on a swing trailing buy: a new rolling low arms, a rebound buys; no decline-from-high test (C2)
//
// Generated from allIn-trailingBuy-bufferedLoss-noReentry.ts (file 4) by src/d1-refinement/generate.ts: file 4
// with its arming condition replaced. ENTRY: when flat with no setup, a completed minute closing at or below the
// lowest session low of the previous swingLookback sessions x (1 + swingProximity) ARMS a trailing buy (the
// rolling low never includes the current session, so the level is known before the open); the setup then follows
// the lowest later minute low and buys once a completed minute closes at least Y (trailingBuyPercentage, the
// swing rebound) above it. No X decline from a reference high is required; X and the L-session reference high
// remain in the reports only. Exits, fills, interest, accounting and reports are file 4's. The research engine
// (src/d1-refinement/engine.ts, entry mode 'swing') reproduces this file (parity.ts). Shipped constants: K ${constants.swingLookback}
// sessions, proximity ${pct(constants.swingProximity!)}, rebound ${pct(constants.trailingBuyPercentage!)}, stop ${pct(constants.trailingStopPercentage!)}, hold ${constants.maximumHoldDays} days, buffer ${pct(constants.intradayLossBuffer!)} (an in-sample pick of
// research/vgt-d1-refinement/NO_DIP_ENTRY_MECHANISMS.md; the architecture was not credited).
//
// Below: file 4's own description, whose entry paragraph no longer applies.
//`
      : `// All in on an always-armed trailing buy: no dip required, a rebound from the low since arming buys (C1)
//
// Generated from allIn-trailingBuy-bufferedLoss-noReentry.ts (file 4) by src/d1-refinement/generate.ts: file 4
// with its arming condition removed. ENTRY: when flat with no setup, the first completed minute (from the warm-up
// session onwards, and from the session after an exit) ARMS a trailing buy at its close; the setup then follows
// the lowest later minute low and buys once a completed minute closes at least Y (trailingBuyPercentage, the
// rebound) above it. The low therefore starts at the arming close and never resets while armed; a rising market
// buys as soon as a close is Y above the running minimum. No X decline from a reference high is required; X and
// the L-session reference high remain in the reports only, and L is kept as the warm-up. Exits, fills, interest,
// accounting and reports are file 4's. The research engine (src/d1-refinement/engine.ts, entry mode 'always')
// reproduces this file (parity.ts). Shipped constants: rebound ${pct(constants.trailingBuyPercentage!)}, stop ${pct(constants.trailingStopPercentage!)}, hold ${constants.maximumHoldDays} days,
// buffer ${pct(constants.intradayLossBuffer!)} (an in-sample pick of research/vgt-d1-refinement/NO_DIP_ENTRY_MECHANISMS.md; the architecture
// was not credited).
//
// Below: file 4's own description, whose entry paragraph no longer applies.
//`,
    'header'
  );

  // Shipped exit constants and the rebound default.
  const literal = (name: string, value: number, comment: string) => {
    const pattern = new RegExp(`  const ${name} = ([0-9.]+); //[^\\n]*`);
    const match = text.match(pattern);

    if (!match) {
      throw new Error(`${spec.file}: no ${name} constant`);
    }

    text = text.replace(pattern, () => `  const ${name} = ${value}; // ${comment}`);
  };

  literal('trailingStopPercentage', constants.trailingStopPercentage!, 'drop from the post-entry high');
  literal('maximumHoldDays', constants.maximumHoldDays!, 'days before a losing position is sold');

  const optionDefault = (name: string, value: number, comment: string) => {
    const pattern = new RegExp(`  const ${name} = ${name}Option \\?\\? ([0-9.]+); //[^\\n]*`);

    if (!pattern.test(text)) {
      throw new Error(`${spec.file}: no ${name} option default`);
    }

    text = text.replace(pattern, () => `  const ${name} = ${name}Option ?? ${value}; // ${comment}`);
  };

  optionDefault(
    'trailingBuyPercentage',
    constants.trailingBuyPercentage!,
    isSwing
      ? 'Y: the swing rebound that buys, above the trailing low'
      : 'Y: the rebound that buys, above the low since arming'
  );
  optionDefault(
    'intradayLossBuffer',
    constants.intradayLossBuffer!,
    `${pct(constants.intradayLossBuffer!)} of the investment`
  );

  if (isSwing) {
    replace(
      `  const tickWindowSize = 74;\n`,
      `  const tickWindowSize = 74; // reports only: the reference high is no longer an entry condition\n`,
      'lookback constant'
    );
    text = text.replace(
      /( {2}const intradayLossBuffer = intradayLossBufferOption \?\? [0-9.]+; \/\/[^\n]*\n)/,
      (match) =>
        `${match}  const swingLookback = ${constants.swingLookback}; // sessions in the rolling low that arms\n  const swingProximity = ${constants.swingProximity}; // closes within this fraction above the rolling low also arm\n`
    );
    replace(
      `    const recentHigh = Math.max(...sessionWindow.map((windowSession) => windowSession.high));\n`,
      `    const recentHigh = Math.max(...sessionWindow.map((windowSession) => windowSession.high));
    // The swing path's rolling low: the lowest session low of the previous swingLookback sessions, never this one.
    const rollingLow = Math.min(
      ...sessions.slice(Math.max(0, index - swingLookback), index).map((windowSession) => windowSession.low)
    );\n`,
      'rolling low'
    );
    replace(
      `            // Warmup: nothing arms until the previous 90 sessions are all available.
            if (index < tickWindowSize || !isDip(bar.close)) {
              continue;
            }`,
      `            // Warmup: nothing arms until the previous swingLookback sessions are all available. Swing path: a close at
            // or below the rolling low x (1 + swingProximity) arms; no decline from a reference high is tested.
            if (index < swingLookback || bar.close > rollingLow * (1 + swingProximity)) {
              continue;
            }`,
      'arming condition'
    );
    replace(
      `\${formatPercent(1 - bar.close / recentHigh)} below the reference high of \${formatPrice(recentHigh)}; it buys`,
      `\${formatPercent(Math.abs(1 - bar.close / rollingLow))} \${bar.close <= rollingLow ? 'below' : 'above'} the \${swingLookback}-session rolling low of \${formatPrice(rollingLow)}; it buys`,
      'arming message'
    );
    replace(
      `  console.info(\`Trailing stop percentage: \${formatPercent(trailingStopPercentage)}\`);`,
      `  console.info(\`Trailing stop percentage: \${formatPercent(trailingStopPercentage)}\`);
  console.info(
    \`Swing entry: arms on a close at or below the \${swingLookback}-session rolling low x (1 + \${formatPercent(swingProximity)}); no decline-from-high test (X and the reference high are reported only)\`
  );`,
      'summary'
    );
    replace(
      '-no-reentry-restriction`;',
      '-no-reentry-restriction-swing${swingLookback}-proximity${percentName(swingProximity)}`;',
      'strategy name'
    );
  } else {
    replace(
      `  const tickWindowSize = 74;\n`,
      `  const tickWindowSize = 74; // warm-up sessions before the first arming; the reference high is reported only\n`,
      'lookback constant'
    );
    replace(
      `            // Warmup: nothing arms until the previous 90 sessions are all available.
            if (index < tickWindowSize || !isDip(bar.close)) {
              continue;
            }`,
      `            // Warmup: nothing arms before the warm-up sessions. Always armed: the first completed minute while flat
            // with no setup arms at its close; no dip from a reference high is tested.
            if (index < tickWindowSize) {
              continue;
            }`,
      'arming condition'
    );
    replace(
      `\${formatPercent(1 - bar.close / recentHigh)} below the reference high of \${formatPrice(recentHigh)}; it buys`,
      `on the first eligible minute (always armed; the reference high of \${formatPrice(recentHigh)} is reported only); it buys`,
      'arming message'
    );
    replace(
      `  console.info(\`Trailing stop percentage: \${formatPercent(trailingStopPercentage)}\`);`,
      `  console.info(\`Trailing stop percentage: \${formatPercent(trailingStopPercentage)}\`);
  console.info('Always-armed entry: the first completed minute while flat arms; no dip test (X and the reference high are reported only)');`,
      'summary'
    );
    replace('-no-reentry-restriction`;', '-no-reentry-restriction-always-armed`;', 'strategy name');
  }

  return text;
};

export const generateFile = (source: string, spec: GeneratedFile) =>
  spec.kind === 'stop' ? generateStopFile(source, spec) : generateEntryFile(source, spec);

export const generateAll = async (only?: string[]) => {
  const written: { file: string; bytes: number }[] = [];

  for (const spec of generatedFiles) {
    if (only && !only.includes(spec.key)) {
      continue;
    }

    const source = await fs.readFile(spec.source, 'utf8');
    const text = generateFile(source, spec);

    await fs.writeFile(spec.file, text);
    written.push({ file: spec.file, bytes: text.length });
  }

  return written;
};

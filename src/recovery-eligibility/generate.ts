// Generates the runnable mechanism strategy files under src/app/ from file 4
// (src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts): each is the source with a fixed list of exact-once
// substitutions that add one entry-eligibility mechanism (or a combination), its constants near the top of
// `runAllIn`, its state, its arming path, its session-end bookkeeping, and its columns in the reports. The
// original is never modified. `npm run recovery-eligibility -- generate` rewrites the files; parity.ts checks
// them against the engine.
import fs from 'fs-extra';
import type { MechanismKey } from './families.ts';

export const sourceFile = 'src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts';

export interface GeneratedFile {
  key: string; // family key
  file: string;
  mechanisms: MechanismKey[];
  alias: string;
}

export const generatedFiles: GeneratedFile[] = [
  {
    key: 'latch',
    file: 'src/app/allIn-trailingBuy-episodeLatch.ts',
    mechanisms: ['latch'],
    alias: 'runAllInTrailingBuyEpisodeLatch'
  },
  {
    key: 'trough',
    file: 'src/app/allIn-trailingBuy-troughRecovery.ts',
    mechanisms: ['trough'],
    alias: 'runAllInTrailingBuyTroughRecovery'
  },
  {
    key: 'dual',
    file: 'src/app/allIn-trailingBuy-dualMode.ts',
    mechanisms: ['dual'],
    alias: 'runAllInTrailingBuyDualMode'
  },
  {
    key: 'postExit',
    file: 'src/app/allIn-trailingBuy-postExitContinuation.ts',
    mechanisms: ['postExit'],
    alias: 'runAllInTrailingBuyPostExitContinuation'
  },
  {
    key: 'troughPostExit',
    file: 'src/app/allIn-trailingBuy-troughRecovery-postExitContinuation.ts',
    mechanisms: ['trough', 'postExit'],
    alias: 'runAllInTrailingBuyTroughRecoveryPostExitContinuation'
  }
];

// The constants each file ships with (fractions and whole numbers), in source order. Set by the program's
// final recommendations (RECOMMENDATIONS.md); the user edits them in the file.
export interface MechanismConstants {
  latchDepth?: number;
  troughRecovery?: number;
  troughRetrace?: number;
  episodeReset?: number;
  resetPolicy?: number;
  episodeExpiry?: number;
  anchorPolicy?: number;
  shallowDepth?: number;
  shallowRebound?: number;
  pullback?: number;
  continuationWindow?: number;
}

export const defaultConstants: Record<string, MechanismConstants> = {
  latch: { latchDepth: 0.2, episodeReset: 0.6, resetPolicy: 0, episodeExpiry: 250, anchorPolicy: 0 },
  trough: {
    troughRecovery: 0.17,
    troughRetrace: 0,
    episodeReset: 0.6,
    resetPolicy: 0,
    episodeExpiry: 250,
    anchorPolicy: 0
  },
  dual: { shallowDepth: 0.1, shallowRebound: 0.03 },
  postExit: { pullback: 0.09, continuationWindow: 60 },
  troughPostExit: {
    troughRecovery: 0.17,
    troughRetrace: 0,
    episodeReset: 0.6,
    resetPolicy: 0,
    episodeExpiry: 250,
    anchorPolicy: 0,
    pullback: 0.09,
    continuationWindow: 60
  }
};

const pct = (fraction: number) => `${Number((fraction * 100).toFixed(4))}%`;

const headerOf = (mechanisms: MechanismKey[], constants: MechanismConstants) => {
  const parts: string[] = [];

  if (mechanisms.includes('latch')) {
    parts.push(
      `// Correction-episode latch: a deep arming (the X decline from the rolling reference high) starts a correction
// EPISODE that remembers an anchor high (the rolling reference high at the deep arming; with anchorPolicy 0 the
// highest reference high of the episode's deep armings, with 1 the latest) and its trough (the lowest session
// low since). The episode ends when a session close recovers episodeReset of the decline from the anchor to the
// trough (tested at every close with resetPolicy 0, or only at closes with no position open with 1), or
// episodeExpiry sessions after its last deep arming. While the episode is active and the strategy is flat with
// no setup, a completed minute closing at or below anchor x (1 - latchDepth) ARMS a trailing buy even though
// the rolling reference high has decayed; latchDepth = X is the "persistent correction reference" (mechanism A
// of research/vgt-recovery-eligibility), a shallower latchDepth the eligibility latch (mechanism E). Current
// constants: latch depth ${pct(constants.latchDepth!)}, reset ${pct(constants.episodeReset!)} (policy ${constants.resetPolicy}), expiry ${constants.episodeExpiry} sessions.`
    );
  }

  if (mechanisms.includes('trough')) {
    parts.push(
      `// Recovery-from-trough eligibility: a deep arming (the X decline from the rolling reference high) starts a
// correction EPISODE that remembers an anchor high (the rolling reference high at the deep arming; with
// anchorPolicy 0 the highest reference high of the episode's deep armings, with 1 the latest) and its trough
// (the lowest session low since, known through the previous session). The episode ends when a session close
// recovers episodeReset of the decline from the anchor to the trough (tested at every close with resetPolicy 0,
// or only at closes with no position open with 1), or episodeExpiry sessions after its last deep arming. While
// the episode is active and the strategy is flat with no setup, a completed minute closing at least
// troughRecovery above the trough (and, when troughRetrace > 0, at least that fraction of the decline back)
// ARMS a trailing buy, once per trough: another such arming needs a lower trough first (mechanism B of
// research/vgt-recovery-eligibility). Current constants: recovery ${pct(constants.troughRecovery!)}, retrace ${pct(constants.troughRetrace!)}, reset ${pct(constants.episodeReset!)} (policy ${constants.resetPolicy}), expiry ${constants.episodeExpiry} sessions.`
    );
  }

  if (mechanisms.includes('dual')) {
    parts.push(
      `// Dual-mode entry: besides the deep path (X), a completed minute closing at least shallowDepth (X2) below the
// rolling reference high ARMS a shallow trailing buy that buys on a shallowRebound (Y2) rebound from its
// trailing low. The deep path has precedence on the same minute, and a shallow setup whose minute close
// reaches the X level is re-armed as a deep one at that close, so the deep path behaves exactly as without the
// shallow one (mechanism C of research/vgt-recovery-eligibility). Current constants: X2 ${pct(constants.shallowDepth!)}, Y2 ${pct(constants.shallowRebound!)}.`
    );
  }

  if (mechanisms.includes('postExit')) {
    parts.push(
      `// Post-exit continuation: a profitable exit opens a continuation WINDOW of continuationWindow sessions. The
// window tracks the post-exit high (the exit price, then the highest session high of the later sessions). While
// the window is open and the strategy is flat with no setup, a completed minute closing at or below the
// post-exit high x (1 - pullback) ARMS a trailing buy; any arming, or the window's last session, closes the
// window (mechanism D of research/vgt-recovery-eligibility). Current constants: pullback ${pct(constants.pullback!)}, window ${constants.continuationWindow} sessions.`
    );
  }

  return parts.join('\n//\n');
};

export const generateMechanismFile = async (
  spec: GeneratedFile,
  constants: MechanismConstants = defaultConstants[spec.key]!
) => {
  const source = await fs.readFile(sourceFile, 'utf8');
  let copy = source;
  const once = (from: string, to: string, label: string) => {
    const matches = copy.split(from).length - 1;

    if (matches !== 1) {
      throw new Error(`${spec.file}: expected exactly one ${label}, found ${matches}`);
    }

    copy = copy.replace(from, () => to);
  };
  const { mechanisms } = spec;
  const has = (key: MechanismKey) => mechanisms.includes(key);
  const usesEpisode = has('latch') || has('trough');
  const kinds = [
    "'deep'",
    ...(has('latch') ? ["'latch'"] : []),
    ...(has('trough') ? ["'trough'"] : []),
    ...(has('dual') ? ["'shallow'"] : []),
    ...(has('postExit') ? ["'continuation'"] : [])
  ];
  const names: Record<MechanismKey, string> = {
    latch: 'correction-episode latch',
    trough: 'recovery-from-trough eligibility',
    dual: 'dual-mode entry',
    postExit: 'post-exit continuation'
  };
  const title = mechanisms.map((mechanism) => names[mechanism]).join(' + ');

  // Header.
  once(
    `// All in on a trailing buy after a 10% dip, with a buffered intraday loss exit and without any re-entry
// restriction after a loss
//
// A copy of allIn-trailingBuy.ts with both variants' changes:`,
    `// All in on a trailing buy after a deep dip, with a buffered intraday loss exit, no re-entry restriction, and
// ${title}
//
// Generated from allIn-trailingBuy-bufferedLoss-noReentry.ts (file 4) by src/recovery-eligibility/generate.ts:
// file 4 plus the mechanism below. Entries through the deep path, the rebound, the fills, the exits, interest,
// accounting and reports are file 4's; the mechanism adds a way for a flat strategy to arm without a fresh
// X decline from the rolling reference high. The research engine (src/recovery-eligibility/engine.ts)
// reproduces this file (parity.ts).
//
${headerOf(mechanisms, constants)}
//
// Below: file 4's own description.
//
// A copy of allIn-trailingBuy.ts with both variants' changes:`,
    'header'
  );

  // Types.
  once(
    `export type SetupStatus = 'armed' | 'pending' | 'filled' | 'cancelled';`,
    `export type SetupStatus = 'armed' | 'pending' | 'filled' | 'cancelled';

// Which path armed a setup.
export type SetupKind = ${kinds.join(' | ')};`,
    'setup status type'
  );
  once(
    `  referenceHigh: number; // the 90-session reference high, frozen at activation
  xLevel: number; // referenceHigh * (1 - X)`,
    `  referenceHigh: number; // the 90-session reference high, frozen at activation
  xLevel: number; // referenceHigh * (1 - X)
  kind: SetupKind; // which path armed the setup
  anchorHigh: number; // the level the activation was measured from (the reference high for the deep path)`,
    'setup fields'
  );
  once(
    `  referenceHigh: number; // frozen at activation
  trailingLow: number;
  trailingLowTime: number;
  reboundTrigger: number;
  signalIndex: number; // session index of the rebound signal`,
    `  referenceHigh: number; // frozen at activation
  setupKind: SetupKind;
  anchorHigh: number;
  trailingLow: number;
  trailingLowTime: number;
  reboundTrigger: number;
  signalIndex: number; // session index of the rebound signal`,
    'entry fill fields'
  );

  // Constants.
  const constantLines: string[] = [];
  const checks: string[] = [];
  const fraction = (name: keyof MechanismConstants, comment: string) => {
    constantLines.push(`  const ${name} = ${constants[name]}; // ${comment}`);
    checks.push(`  if (!Number.isFinite(${name}) || ${name} < 0 || ${name} >= 1) {
    throw new Error(\`The ${name} \${${name}} must be at least 0 and below 1\`);
  }
`);
  };
  const whole = (name: keyof MechanismConstants, comment: string, min: number, max: number) => {
    constantLines.push(`  const ${name}: number = ${constants[name]}; // ${comment}`);
    checks.push(`  if (!Number.isInteger(${name}) || ${name} < ${min} || ${name} > ${max}) {
    throw new Error(\`The ${name} \${${name}} must be a whole number from ${min} to ${max}\`);
  }
`);
  };

  if (has('latch')) {
    fraction('latchDepth', 'decline below the episode anchor that re-arms while the episode is active');
  }

  if (has('trough')) {
    fraction('troughRecovery', 'rise above the episode trough (through the previous session) that arms');
    fraction('troughRetrace', 'fraction of the anchor-to-trough decline that must also be recovered (0: unused)');
  }

  if (usesEpisode) {
    constantLines.push(
      `  const episodeReset = ${constants.episodeReset}; // recovery of the anchor-to-trough decline, at a session close, that ends the episode`
    );
    checks.push(`  if (!Number.isFinite(episodeReset) || episodeReset <= 0 || episodeReset > 1) {
    throw new Error(\`The episode reset \${episodeReset} must be above 0 and at most 1\`);
  }
`);
    whole(
      'resetPolicy',
      '0: the reset is tested at every session close; 1: only at closes with no position open',
      0,
      1
    );
    whole('episodeExpiry', "sessions after the episode's last deep arming that end it", 1, 100000);
    whole(
      'anchorPolicy',
      "0: the anchor is the highest reference high of the episode's deep armings; 1: the latest",
      0,
      1
    );
  }

  if (has('dual')) {
    fraction('shallowDepth', 'X2: a shallower decline from the reference high that arms a shallow setup');
    fraction('shallowRebound', 'Y2: the rebound from the trailing low that buys a shallow setup');
    checks.push(`  if (!(shallowRebound > 0)) {
    throw new Error('The shallow rebound must be positive');
  }
`);
  }

  if (has('postExit')) {
    fraction('pullback', 'decline from the post-exit high that arms within the continuation window');
    whole('continuationWindow', 'sessions after a profitable exit during which the pullback can arm', 1, 100000);
  }

  once(
    `  const intradayLossBuffer = intradayLossBufferOption ?? 0.029; // 2.9% of the investment: $2,900 on $100,000
`,
    `  const intradayLossBuffer = intradayLossBufferOption ?? 0.029; // 2.9% of the investment: $2,900 on $100,000
${constantLines.join('\n')}
`,
    'buffer constant'
  );
  once(
    `  const percentName = (fraction: number) => Number((fraction * 100).toFixed(4));`,
    `${checks.join('\n')}  const percentName = (fraction: number) => Number((fraction * 100).toFixed(4));`,
    'percent name'
  );

  const nameParts: string[] = [];

  if (has('latch')) {
    nameParts.push('-latch${percentName(latchDepth)}-reset${percentName(episodeReset)}-expiry${episodeExpiry}');
  }

  if (has('trough')) {
    nameParts.push(
      '-trough${percentName(troughRecovery)}-retrace${percentName(troughRetrace)}-reset${percentName(episodeReset)}-expiry${episodeExpiry}'
    );
  }

  if (has('dual')) {
    nameParts.push('-shallow${percentName(shallowDepth)}-rebound${percentName(shallowRebound)}');
  }

  if (has('postExit')) {
    nameParts.push('-pullback${percentName(pullback)}-window${continuationWindow}');
  }

  once(
    'buffered-loss${percentName(intradayLossBuffer)}-no-reentry-restriction`;',
    `buffered-loss\${percentName(intradayLossBuffer)}-no-reentry-restriction${nameParts.join('')}\`;`,
    'strategy name'
  );

  // State.
  const stateLines: string[] = [
    `  // Setups armed by each path.
  const activationsByKind: Record<SetupKind, number> = { ${kinds.map((kind) => `${kind.replace(/'/g, '')}: 0`).join(', ')} };`
  ];

  if (usesEpisode) {
    stateLines.push(`  // The correction episode: its anchor high, its trough through the previous session, its last deep arming.
  let episodeActive = false;
  let episodeHigh = 0;
  let episodeLow = Infinity;
  let episodeLastArm = -1;
  let episodesStarted = 0;
  let episodeResets = 0;
  let episodeExpiries = 0;`);
  }

  if (has('trough')) {
    stateLines.push(`  // One trough arming per trough: re-enabled only by a lower trough.
  let troughEnabled = false;
  let troughUsed = Infinity;`);
  }

  if (has('postExit')) {
    stateLines.push(`  // The continuation window after a profitable exit: the post-exit high and the exit session.
  let continuationActive = false;
  let continuationHigh = 0;
  let continuationStart = -1;
  let continuationWindows = 0;
  let continuationExpiries = 0;`);
  }

  if (has('dual')) {
    stateLines.push(`  let shallowUpgrades = 0;
  const reboundOf = (kind: SetupKind) => (kind === 'shallow' ? shallowRebound : trailingBuyPercentage);`);
  }

  if (usesEpisode) {
    stateLines.push(`  // A deep arming starts the episode, or refreshes an active one.
  const recogniseDeepCorrection = (index: number, recentHigh: number, close: number) => {
    if (!episodeActive) {
      episodeActive = true;
      episodeHigh = recentHigh;
      episodeLow = close;${has('trough') ? '\n      troughEnabled = true;\n      troughUsed = Infinity;' : ''}
      episodesStarted++;
    } else {
      episodeHigh = anchorPolicy === 1 ? recentHigh : Math.max(episodeHigh, recentHigh);
      episodeLow = Math.min(episodeLow, close);
    }

    episodeLastArm = index;
  };`);
  }

  once(
    `  const setups: TrailingBuySetup[] = [];
`,
    `  const setups: TrailingBuySetup[] = [];
${stateLines.join('\n')}
`,
    'setups state'
  );

  // Daily rows.
  once(
    `    reboundTrigger: number | '';
  }[] = [];`,
    `    reboundTrigger: number | '';
    setupKind: SetupKind | '';
    anchorHigh: number | '';
    episodeActive: boolean;
    episodeHigh: number | '';
    episodeLow: number | '';
    continuationActive: boolean;
    continuationHigh: number | '';
  }[] = [];`,
    'daily row type'
  );
  once(
    `        reboundTrigger: ''
      });
      return;`,
    `        reboundTrigger: '',
        setupKind: '',
        anchorHigh: '',
        episodeActive: false,
        episodeHigh: '',
        episodeLow: '',
        continuationActive: false,
        continuationHigh: ''
      });
      return;`,
    'first daily row'
  );
  once(
    `      reboundTrigger: setup?.reboundTrigger ?? ''
    });
  });`,
    `      reboundTrigger: setup?.reboundTrigger ?? '',
      setupKind: setup?.kind ?? '',
      anchorHigh: setup?.anchorHigh ?? '',
      episodeActive: ${usesEpisode ? 'episodeActive' : 'false'},
      episodeHigh: ${usesEpisode ? "episodeActive ? episodeHigh : ''" : "''"},
      episodeLow: ${usesEpisode ? "episodeActive ? episodeLow : ''" : "''"},
      continuationActive: ${has('postExit') ? 'continuationActive' : 'false'},
      continuationHigh: ${has('postExit') ? "continuationActive ? continuationHigh : ''" : "''"}
    });
  });`,
    'last daily row'
  );

  // Arming: the deep path first, then the mechanisms in a fixed order of precedence.
  const conditions: string[] = [];

  if (has('latch')) {
    conditions.push(`            } else if (episodeActive && bar.close <= episodeHigh * (1 - latchDepth)) {
              kind = 'latch';
              anchorHigh = episodeHigh;`);
  }

  if (has('trough')) {
    conditions.push(`            } else if (
              episodeActive &&
              troughEnabled &&
              bar.close >= episodeLow * (1 + troughRecovery) &&
              (troughRetrace === 0 || bar.close >= episodeLow + troughRetrace * (episodeHigh - episodeLow))
            ) {
              kind = 'trough';
              anchorHigh = episodeLow;`);
  }

  if (has('dual')) {
    conditions.push(`            } else if (1 - bar.close / recentHigh >= shallowDepth) {
              kind = 'shallow';`);
  }

  if (has('postExit')) {
    conditions.push(`            } else if (
              continuationActive &&
              index > continuationStart &&
              index - continuationStart <= continuationWindow &&
              bar.close <= continuationHigh * (1 - pullback)
            ) {
              kind = 'continuation';
              anchorHigh = continuationHigh;`);
  }

  once(
    `            // Warmup: nothing arms until the previous 90 sessions are all available.
            if (index < tickWindowSize || !isDip(bar.close)) {
              continue;
            }
`,
    `            // Warmup: nothing arms until the previous L sessions are all available.
            if (index < tickWindowSize) {
              continue;
            }

            // The deep path first, then the mechanism.
            let kind: SetupKind | undefined;
            let anchorHigh = recentHigh;

            if (isDip(bar.close)) {
              kind = 'deep';
${conditions.join('\n')}
            }

            if (!kind) {
              continue;
            }
`,
    'arming guard'
  );
  once(
    `              referenceHigh: recentHigh,
              xLevel,
              restrictedAtActivation: false,`,
    `              referenceHigh: recentHigh,
              xLevel,
              kind,
              anchorHigh,
              restrictedAtActivation: false,`,
    'setup literal'
  );

  if (has('dual')) {
    once(
      `              reboundTrigger: bar.close * (1 + trailingBuyPercentage),`,
      `              reboundTrigger: bar.close * (1 + reboundOf(kind)),`,
      'activation rebound trigger'
    );
  }

  const bookkeeping: string[] = ['            activationsByKind[kind]++;'];

  if (usesEpisode) {
    bookkeeping.push(`
            if (kind === 'deep') {
              recogniseDeepCorrection(index, recentHigh, bar.close);
            }`);
  }

  if (has('trough')) {
    bookkeeping.push(`
            if (kind === 'trough') {
              troughEnabled = false;
              troughUsed = episodeLow;
            }`);
  }

  if (has('postExit')) {
    bookkeeping.push(`
            // Any arming ends the continuation window.
            continuationActive = false;`);
  }

  once(
    `            setups.push(setup);
            decisionPrice = bar.close;
            console.info(
              \`Trailing buy \${setup.id} armed at \${formatNewYorkTime(decisionTime)} on the \${formatNewYorkTime(bar.time)} minute's close of \${formatPrice(bar.close)}, \${formatPercent(1 - bar.close / recentHigh)} below the reference high of \${formatPrice(recentHigh)}; it buys on a close at or above \${formatPrice(setup.reboundTrigger)}\`
            );`,
    `            setups.push(setup);
            decisionPrice = bar.close;
${bookkeeping.join('\n')}
            console.info(
              \`Trailing buy \${setup.id} (\${kind}) armed at \${formatNewYorkTime(decisionTime)} on the \${formatNewYorkTime(bar.time)} minute's close of \${formatPrice(bar.close)}, \${formatPercent(Math.abs(1 - bar.close / anchorHigh))} \${bar.close <= anchorHigh ? 'below' : 'above'} the \${kind === 'deep' ? 'reference high' : 'anchor'} of \${formatPrice(anchorHigh)}; it buys on a close at or above \${formatPrice(setup.reboundTrigger)}\`
            );`,
    'activation log'
  );

  if (has('dual')) {
    once(
      `          // Armed: the completed minute lowers the trailing low, then its close is tested against the
          // rebound trigger from that low.
          if (bar.low < setup.trailingLow) {`,
      `          // A shallow setup reaching the deep level becomes a deep one, armed afresh at this close, so that
          // the deep path behaves exactly as without the shallow one.
          if (setup.kind === 'shallow' && isDip(bar.close)) {
            setup.kind = 'deep';
            setup.statusReason = 'upgraded';
            setup.activationIndex = index;
            setup.activationDate = session.date;
            setup.activationBarTime = bar.time;
            setup.activationTime = decisionTime;
            setup.activationPrice = bar.close;
            setup.referenceHigh = recentHigh;
            setup.xLevel = xLevel;
            setup.anchorHigh = recentHigh;
            setup.trailingLow = bar.close;
            setup.trailingLowTime = bar.time;
            setup.reboundTrigger = bar.close * (1 + trailingBuyPercentage);
            shallowUpgrades++;
            activationsByKind.deep++;
            decisionPrice = bar.close;
            console.info(
              \`Trailing buy \${setup.id} re-armed as deep at \${formatNewYorkTime(decisionTime)} on the \${formatNewYorkTime(bar.time)} minute's close of \${formatPrice(bar.close)}, \${formatPercent(1 - bar.close / recentHigh)} below the reference high of \${formatPrice(recentHigh)}\`
            );
            continue;
          }

          // Armed: the completed minute lowers the trailing low, then its close is tested against the
          // rebound trigger from that low.
          if (bar.low < setup.trailingLow) {`,
      'armed branch'
    );
    once(
      `          setup.reboundTrigger = setup.trailingLow * (1 + trailingBuyPercentage);`,
      `          setup.reboundTrigger = setup.trailingLow * (1 + reboundOf(setup.kind));`,
      'rebound trigger'
    );
  }

  // The entry fill record.
  once(
    `          referenceHigh: setup.referenceHigh,
          trailingLow: rebound.trailingLow,`,
    `          referenceHigh: setup.referenceHigh,
          setupKind: setup.kind,
          anchorHigh: setup.anchorHigh,
          trailingLow: rebound.trailingLow,`,
    'entry fill record'
  );

  // The exit: a profitable exit opens the continuation window.
  if (has('postExit')) {
    once(
      `        realizedProfit += position.profit;
`,
      `        realizedProfit += position.profit;

        // A profitable exit opens the continuation window from the exit price.
        if (position.profit > 0) {
          continuationActive = true;
          continuationHigh = exit.price;
          continuationStart = index;
          continuationWindows++;
        }
`,
      'exit hook'
    );
  }

  // The session's end.
  const sessionEnd: string[] = [];

  if (usesEpisode) {
    sessionEnd.push(`    // End of the session: the episode's trough, reset and expiry.
    if (episodeActive) {
      episodeLow = Math.min(episodeLow, session.low);
${has('trough') ? '\n      if (!troughEnabled && episodeLow < troughUsed) {\n        troughEnabled = true;\n      }\n' : ''}
      if ((resetPolicy === 0 || !openPosition) && session.close >= episodeLow + episodeReset * (episodeHigh - episodeLow)) {
        episodeActive = false;
        episodeResets++;
        console.info(
          \`Episode ended on \${session.date}: the close of \${formatPrice(session.close)} recovered \${formatPercent(episodeReset)} of the decline from \${formatPrice(episodeHigh)} to \${formatPrice(episodeLow)}\\n\`
        );
      } else if (index - episodeLastArm > episodeExpiry) {
        episodeActive = false;
        episodeExpiries++;
        console.info(\`Episode expired on \${session.date}, \${episodeExpiry} sessions after its last deep arming\\n\`);
      }
    }
`);
  }

  if (has('postExit')) {
    sessionEnd.push(`    // End of the session: the continuation window's high and expiry.
    if (continuationActive) {
      if (index > continuationStart) {
        continuationHigh = Math.max(continuationHigh, session.high);
      }

      if (index - continuationStart >= continuationWindow) {
        continuationActive = false;
        continuationExpiries++;
      }
    }
`);
  }

  once(
    `    dailyDrawdown.update(markedProfit, session.time);
`,
    `    dailyDrawdown.update(markedProfit, session.time);

${sessionEnd.join('\n')}`,
    'session end'
  );

  // Reports.
  once(
    `buffer_signal_time,buffer_signal_price,buffer_signal_net_profit,buffer_threshold,buffer_exit_pending'`,
    `buffer_signal_time,buffer_signal_price,buffer_signal_net_profit,buffer_threshold,buffer_exit_pending,setup_kind,anchor_high'`,
    'trades header'
  );
  once(
    `          isOpen && Boolean(pendingBufferedExit)
        ].join(',')`,
    `          isOpen && Boolean(pendingBufferedExit),
          entryFill?.setupKind ?? '',
          entryFill?.anchorHigh ?? ''
        ].join(',')`,
    'trades row'
  );
  once(
    `'index,date,close,borrowed,mtm_pnl,recent_high,decision_price,signal,x_level,entry_state,restricted,setup_id,trailing_low,rebound_trigger'`,
    `'index,date,close,borrowed,mtm_pnl,recent_high,decision_price,signal,x_level,entry_state,restricted,setup_id,trailing_low,rebound_trigger,setup_kind,anchor_high,episode_active,episode_high,episode_low,continuation_active,continuation_high'`,
    'daily header'
  );
  once(
    `          row.reboundTrigger
        ].join(',')`,
    `          row.reboundTrigger,
          row.setupKind,
          row.anchorHigh,
          row.episodeActive,
          row.episodeHigh,
          row.episodeLow,
          row.continuationActive,
          row.continuationHigh
        ].join(',')`,
    'daily row'
  );
  once(
    `fill_execution,wait_minutes,wait_sessions,end_index,end_date'`,
    `fill_execution,wait_minutes,wait_sessions,end_index,end_date,kind,anchor_high'`,
    'setups header'
  );
  once(
    `          row.endDate ?? ''
        ].join(',')`,
    `          row.endDate ?? '',
          row.kind,
          row.anchorHigh
        ].join(',')`,
    'setups row'
  );

  const summaryFields: string[] = [`      mechanisms: ${JSON.stringify(mechanisms)},`, '      activationsByKind,'];

  if (has('latch')) {
    summaryFields.push('      latchDepth,');
  }

  if (has('trough')) {
    summaryFields.push('      troughRecovery,', '      troughRetrace,');
  }

  if (usesEpisode) {
    summaryFields.push(
      '      episodeReset,',
      '      resetPolicy,',
      '      episodeExpiry,',
      '      anchorPolicy,',
      '      episodesStarted,',
      '      episodeResets,',
      '      episodeExpiries,'
    );
  }

  if (has('dual')) {
    summaryFields.push('      shallowDepth,', '      shallowRebound,', '      shallowUpgrades,');
  }

  if (has('postExit')) {
    summaryFields.push(
      '      pullback,',
      '      continuationWindow,',
      '      continuationWindows,',
      '      continuationExpiries,'
    );
  }

  once(
    `      bufferedLossExits,
      pendingBufferedExitAtEnd: pendingBufferedExit`,
    `      bufferedLossExits,
${summaryFields.join('\n')}
      pendingBufferedExitAtEnd: pendingBufferedExit`,
    'summary'
  );

  const summaryLogs: string[] = [];

  if (has('latch')) {
    summaryLogs.push(
      "  console.info(\n    `Correction-episode latch: depth ${formatPercent(latchDepth)} below the anchor, reset at ${formatPercent(episodeReset)} of the decline (${resetPolicy === 0 ? 'any close' : 'flat closes only'}), expiry ${episodeExpiry} sessions, anchor ${anchorPolicy === 0 ? 'highest' : 'latest'}; ${episodesStarted} episodes, ${episodeResets} resets, ${episodeExpiries} expiries; ${activationsByKind.latch} latch armings`\n  );"
    );
  }

  if (has('trough')) {
    summaryLogs.push(
      "  console.info(\n    `Recovery-from-trough eligibility: ${formatPercent(troughRecovery)} above the trough${troughRetrace > 0 ? ` and ${formatPercent(troughRetrace)} of the decline recovered` : ''}, reset at ${formatPercent(episodeReset)} of the decline (${resetPolicy === 0 ? 'any close' : 'flat closes only'}), expiry ${episodeExpiry} sessions, anchor ${anchorPolicy === 0 ? 'highest' : 'latest'}; ${episodesStarted} episodes, ${episodeResets} resets, ${episodeExpiries} expiries; ${activationsByKind.trough} trough armings`\n  );"
    );
  }

  if (has('dual')) {
    summaryLogs.push(
      '  console.info(\n    `Dual-mode entry: shallow setups at ${formatPercent(shallowDepth)} below the reference high buying on a ${formatPercent(shallowRebound)} rebound; ${activationsByKind.shallow} shallow armings, ${shallowUpgrades} upgraded to deep`\n  );'
    );
  }

  if (has('postExit')) {
    summaryLogs.push(
      '  console.info(\n    `Post-exit continuation: ${formatPercent(pullback)} pullback from the post-exit high within ${continuationWindow} sessions of a profitable exit; ${continuationWindows} windows, ${continuationExpiries} expired, ${activationsByKind.continuation} continuation armings`\n  );'
    );
  }

  once(
    `  console.info(
    'Reentry restriction: none (no material-loss restriction, lower re-entry level or recovery reset; no re-entry on an exit session)'
  );`,
    `  console.info(
    'Reentry restriction: none (no material-loss restriction, lower re-entry level or recovery reset; no re-entry on an exit session)'
  );
${summaryLogs.join('\n')}`,
    'summary log'
  );

  // The alias and the run comment.
  once(
    `export const runAllInTrailingBuyBufferedLossNoReentry = runAllIn;`,
    `export const ${spec.alias} = runAllIn;`,
    'alias'
  );
  once(
    '// Run with `npm run app allIn-trailingBuy-bufferedLoss-noReentry [symbol]',
    `// Run with \`npm run app ${spec.file.replace('src/app/', '').replace('.ts', '')} [symbol]`,
    'run comment'
  );
  once(
    '// allIn-trailingBuy-bufferedLoss-noReentry VGT 2016-10-07 2025-10-13 - - stop 0.03 0.005`. The arguments are',
    `// ${spec.file.replace('src/app/', '').replace('.ts', '')} VGT 2016-10-07 2025-10-13 - - stop 0.003 0.029\`. The arguments are`,
    'run example'
  );

  await fs.writeFile(spec.file, copy);

  return spec;
};

export const generateAll = async (constantsByKey: Record<string, MechanismConstants> = defaultConstants) => {
  const results: GeneratedFile[] = [];

  for (const spec of generatedFiles) {
    results.push(await generateMechanismFile(spec, constantsByKey[spec.key]));
  }

  return results;
};

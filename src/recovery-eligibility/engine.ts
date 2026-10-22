// The decision engine of the recovery-eligibility program: the architecture of
// src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts (file 4: a trailing buy armed by an X decline from the
// rolling L-session reference high, bought on a Y rebound from the trailing low, exited by a trailing stop, the
// maximum-hold loss exit and the buffered intraday loss exit, with no re-entry restriction) plus four optional
// entry-eligibility mechanisms, each behind a flag with its own parameters
// (research/vgt-recovery-eligibility/MECHANISMS.md):
//   latch      correction-episode latch: while an episode is active (it starts at a deep arming and remembers
//              the episode's reference high and trough; it ends when a session close recovers `episodeReset`
//              of the decline, tested at every close or only at flat closes, or `episodeExpiry` sessions after
//              its last deep arming), a flat strategy re-arms on a close at or below the episode high x
//              (1 - latchDepth), even though the rolling high has decayed. latchDepth = X is the "persistent
//              correction reference" (mechanism A); latchDepth < X is the eligibility latch (E).
//   trough     recovery-from-trough: while an episode is active, a flat strategy arms on a close at least
//              troughRecovery above the episode trough through the previous session (and, optionally, at least
//              troughRetrace of the decline back), once per trough (mechanism B).
//   dual       dual-mode entry: a second, shallower arming level X2 with its own rebound Y2; the deep path has
//              precedence and a shallow setup upgrades to a deep one when the X level is reached (mechanism C).
//   postExit   post-exit continuation: after a profitable exit, for a bounded window of sessions, a pullback of
//              `pullback` from the post-exit high arms a trailing buy (mechanism D).
// With every flag off the engine is file 4 statement for statement (tests/equivalence.test.ts asserts identical
// trades and accounting to the trailing-buy-variants engine, which was verified against the file). The engine
// only decides trades; profit, interest and drawdowns come from the trailing-buy-variants accounting.
import type { Dataset } from '../four-family/data.ts';

const secondsPerMinute = 60;
const secondsPerDay = 24 * 60 * 60;
const secondsPerYear = 365 * secondsPerDay;

export type StopFill = 'stop' | 'next-open';

export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap' | 'buffered intraday loss';

export type ExecutionPrice =
  | 'first trade after decision'
  | 'closing print'
  | 'opening trade'
  | 'stop level'
  | 'minute open through stop'
  | 'trigger minute close';

export type SetupKind = 'deep' | 'latch' | 'trough' | 'shallow' | 'continuation';

export interface Mechanisms {
  latch: boolean;
  trough: boolean;
  dual: boolean;
  postExit: boolean;
}

export const noMechanisms: Mechanisms = { latch: false, trough: false, dual: false, postExit: false };

// Fractions and whole numbers, as the strategy files use them. A parameter of a mechanism that is off is NaN
// and never read.
export interface Params {
  targetPercentChange: number; // X
  trailingBuyPercentage: number; // Y
  trailingStopPercentage: number;
  maximumHoldDays: number;
  tickWindowSize: number; // L
  intradayLossBuffer: number;
  // Episode (latch and trough): a session close that recovers `episodeReset` of the decline from the episode
  // high to the episode trough ends the episode, as does `episodeExpiry` sessions since its last deep arming.
  episodeReset: number;
  episodeExpiry: number;
  anchorPolicy: number; // 0: the episode high is the highest reference high of its deep armings; 1: the latest
  resetPolicy: number; // 0: the reset is tested at every session close; 1: only at closes with no position open
  latchDepth: number; // latch: decline below the episode high that re-arms
  troughRecovery: number; // trough: rise above the episode trough that arms
  troughRetrace: number; // trough: fraction of the decline recovered that must also hold (0: unused)
  shallowDepth: number; // dual: X2
  shallowRebound: number; // dual: Y2
  pullback: number; // postExit: decline from the post-exit high that arms
  continuationWindow: number; // postExit: sessions after the exit during which the pullback can arm
}

export interface RunSettings {
  stopFill: StopFill;
  marginInterestRate: number;
  investment: number;
  firstIndex: number;
  armStart: number;
  endIndex: number;
}

export interface Trade {
  setupId: number;
  kind: SetupKind;
  entryIndex: number;
  entryBar: number;
  entryTime: number;
  entryPrice: number;
  entryExecution: ExecutionPrice;
  entryTimestamp: number; // the fill session's midnight UTC
  decisionTime: number;
  decisionPrice: number;
  signalIndex: number;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number; // the rolling reference high at activation
  anchorHigh: number; // the level the activation was measured from (episode high, post-exit high, ...)
  trailingLow: number;
  reboundTrigger: number;
  investment: number;
  shares: number;
  exitIndex: number; // -1 while open
  exitBar: number;
  exitTime: number;
  exitPrice: number;
  exitExecution: ExecutionPrice | '';
  reason: ExitReason | 'open';
  exitStopPrice: number;
  maximumHoldDue: boolean;
  bufferSignalTime: number; // NaN unless a buffered-loss exit (the decision minute's end)
  bufferSignalPrice: number;
}

export interface SetupRecord {
  id: number;
  kind: SetupKind;
  status: 'armed' | 'pending' | 'filled';
  statusReason: string;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  anchorHigh: number;
  trailingLow: number;
  signalIndex: number;
  signalTime: number;
  signalPrice: number;
  carriedOvernight: boolean;
  fillIndex: number;
  fillTime: number;
  fillPrice: number;
  endIndex: number;
}

// The state at a session's close, for the diagnostic traces.
export interface SessionTrace {
  index: number;
  recentHigh: number;
  xLevel: number;
  close: number;
  low: number;
  minClose: number;
  entryState: 'FLAT' | 'ARMED' | 'PENDING_FILL' | 'LONG';
  setupKind: SetupKind | '';
  trailingLow: number;
  reboundTrigger: number;
  episodeActive: boolean;
  episodeHigh: number;
  episodeLow: number;
  episodeLastArm: number;
  continuationActive: boolean;
  continuationHigh: number;
  continuationStart: number;
}

export interface EngineCounts {
  setupActivations: number;
  setupFills: number;
  armedAtEnd: number;
  pendingAtEnd: number;
  reboundSignals: number;
  overnightOrders: number;
  entriesWithoutTrade: number;
  losingExits: number;
  bufferedLossExits: number;
  pendingBufferedExitAtEnd: boolean;
  activationsByKind: Record<SetupKind, number>;
  fillsByKind: Record<SetupKind, number>;
  episodesStarted: number;
  episodeResets: number;
  episodeExpiries: number;
  shallowUpgrades: number;
  continuationWindows: number;
  continuationExpiries: number;
}

export interface EngineResult {
  trades: Trade[];
  counts: EngineCounts;
  setups?: SetupRecord[];
  trace?: SessionTrace[];
}

interface ExitDecision {
  reason: ExitReason;
  price: number;
  time: number;
  barIndex: number;
  execution: ExecutionPrice;
  isMaximumHoldDue: boolean;
  signalTime: number;
  signalPrice: number;
}

const kindCounts = (): Record<SetupKind, number> => ({ deep: 0, latch: 0, trough: 0, shallow: 0, continuation: 0 });

export const simulate = (
  ds: Dataset,
  referenceHighs: Float64Array,
  mechanisms: Mechanisms,
  params: Params,
  settings: RunSettings,
  detail = false
): EngineResult => {
  const { firstIndex, armStart, endIndex, stopFill, marginInterestRate, investment } = settings;
  const {
    targetPercentChange,
    trailingBuyPercentage,
    trailingStopPercentage,
    maximumHoldDays,
    intradayLossBuffer,
    episodeReset,
    episodeExpiry,
    anchorPolicy,
    resetPolicy,
    latchDepth,
    troughRecovery,
    troughRetrace,
    shallowDepth,
    shallowRebound,
    pullback,
    continuationWindow
  } = params;
  const { latch, trough, dual, postExit } = mechanisms;
  const usesEpisode = latch || trough;
  const { sTime, sCloseTime, sOpen, sHigh, sLow, sClose, sClosingPrint, sBarStart, sBarCount, sMinClose } = ds;
  const { bTime, bOpen, bHigh, bLow, bClose } = ds;

  if (firstIndex < 0 || endIndex >= ds.sessionCount || endIndex < firstIndex) {
    throw new Error(`Run ${firstIndex}..${endIndex} is outside the dataset`);
  }

  const firstTradeFrom = (s: number, time: number) => {
    const start = sBarStart[s]!;
    const count = sBarCount[s]!;

    for (let k = 0; k < count; k++) {
      if (bTime[start + k]! >= time) {
        return k;
      }
    }

    return Number.isNaN(sClosingPrint[s]!) ? -1 : count;
  };

  const firstTradeAfterDecision = (s: number, decisionTime: number) => {
    const k = firstTradeFrom(s, decisionTime);

    return k === sBarCount[s]! && decisionTime >= sCloseTime[s]! ? -1 : k;
  };

  const priceAt = (s: number, k: number) => (k < sBarCount[s]! ? bOpen[sBarStart[s]! + k]! : sClosingPrint[s]!);
  const timeAt = (s: number, k: number) => (k < sBarCount[s]! ? bTime[sBarStart[s]! + k]! : sCloseTime[s]!);
  const tradeExecution = (s: number, k: number): ExecutionPrice =>
    k < sBarCount[s]! ? 'first trade after decision' : 'closing print';

  const trades: Trade[] = [];
  const setups: SetupRecord[] | undefined = detail ? [] : undefined;
  const trace: SessionTrace[] | undefined = detail ? [] : undefined;
  const counts: EngineCounts = {
    setupActivations: 0,
    setupFills: 0,
    armedAtEnd: 0,
    pendingAtEnd: 0,
    reboundSignals: 0,
    overnightOrders: 0,
    entriesWithoutTrade: 0,
    losingExits: 0,
    bufferedLossExits: 0,
    pendingBufferedExitAtEnd: false,
    activationsByKind: kindCounts(),
    fillsByKind: kindCounts(),
    episodesStarted: 0,
    episodeResets: 0,
    episodeExpiries: 0,
    shallowUpgrades: 0,
    continuationWindows: 0,
    continuationExpiries: 0
  };

  // The open position.
  let position: Trade | undefined;
  let postEntryHigh = 0;
  let stopPrice = 0;

  // The setup: 0 none, 1 armed, 2 pending.
  let setupStatus = 0;
  let setupId = 0;
  let setupKind: SetupKind = 'deep';
  let setupActivationIndex = 0;
  let setupActivationTime = 0;
  let setupActivationPrice = 0;
  let setupReferenceHigh = 0;
  let setupAnchorHigh = 0;
  let setupTrailingLow = 0;
  let setupTrigger = 0;
  let signalIndex = 0;
  let signalTime = 0;
  let signalPrice = 0;
  let signalTrigger = 0;
  let signalTrailingLow = 0;
  let signalCarried = false;
  let setupRecord: SetupRecord | undefined;

  // A buffered-loss sale waiting for the next session's opening trade.
  let pendingSignalTime = NaN;
  let pendingSignalPrice = NaN;

  // The correction episode (latch, trough).
  let episodeActive = false;
  let episodeHigh = 0;
  let episodeLow = Infinity; // the trough through the previous session, from session lows
  let episodeLastArm = -1;
  let troughEnabled = false; // trough: one arming per trough
  let troughUsed = Infinity;

  // The post-exit continuation window (postExit).
  let continuationActive = false;
  let continuationHigh = 0; // the exit price, then the highest session high after the exit session
  let continuationStart = -1;

  const reboundOf = (kind: SetupKind) => (kind === 'shallow' ? shallowRebound : trailingBuyPercentage);

  const endSetup = (status: SetupRecord['status'], reason: string, index: number) => {
    if (setupRecord) {
      setupRecord.status = status;
      setupRecord.statusReason = reason;
      setupRecord.endIndex = index;
    }

    setupStatus = 0;
    setupRecord = undefined;
  };

  // A deep arming starts the episode, or refreshes an active one.
  const recogniseDeepCorrection = (s: number, recentHigh: number, close: number) => {
    if (!usesEpisode) {
      return;
    }

    if (!episodeActive) {
      episodeActive = true;
      episodeHigh = recentHigh;
      episodeLow = close;
      troughEnabled = trough;
      troughUsed = Infinity;
      counts.episodesStarted++;
    } else {
      episodeHigh = anchorPolicy === 1 ? recentHigh : Math.max(episodeHigh, recentHigh);
      episodeLow = Math.min(episodeLow, close);
    }

    episodeLastArm = s;
  };

  const arm = (
    kind: SetupKind,
    s: number,
    decisionTime: number,
    close: number,
    recentHigh: number,
    anchorHigh: number
  ) => {
    setupStatus = 1;
    setupId++;
    setupKind = kind;
    setupActivationIndex = s;
    setupActivationTime = decisionTime;
    setupActivationPrice = close;
    setupReferenceHigh = recentHigh;
    setupAnchorHigh = anchorHigh;
    setupTrailingLow = close;
    setupTrigger = close * (1 + reboundOf(kind));
    signalCarried = false;
    counts.setupActivations++;
    counts.activationsByKind[kind]++;

    if (continuationActive) {
      // Any arming ends the continuation window: the window is for a flat strategy with nothing in motion.
      continuationActive = false;
    }

    if (setups) {
      setupRecord = {
        id: setupId,
        kind,
        status: 'armed',
        statusReason: '',
        activationIndex: s,
        activationTime: decisionTime,
        activationPrice: close,
        referenceHigh: recentHigh,
        anchorHigh,
        trailingLow: close,
        signalIndex: -1,
        signalTime: NaN,
        signalPrice: NaN,
        carriedOvernight: false,
        fillIndex: -1,
        fillTime: NaN,
        fillPrice: NaN,
        endIndex: -1
      };
      setups.push(setupRecord);
    }
  };

  // The exits for the position open at the start of session s, as file 4's evaluateBufferedSessionExit. A
  // buffered sale without an eligible trade is left pending through the outer variables.
  const evaluateExit = (s: number, open: Trade): ExitDecision | undefined => {
    const interest = open.investment * marginInterestRate * ((sTime[s]! - open.entryTimestamp) / secondsPerYear);
    const start = sBarStart[s]!;
    const count = sBarCount[s]!;
    const profitAt = (price: number) => open.shares * price - open.investment - interest;
    const isStopActive = profitAt(stopPrice) > 0;
    const daysHeld = (sTime[s]! - open.entryTimestamp) / secondsPerDay;
    const isMaximumHoldDue = daysHeld >= maximumHoldDays && profitAt(sOpen[s]!) < 0;
    const pendingTime = pendingSignalTime;
    const pendingPrice = pendingSignalPrice;
    const decision = (
      reason: ExitReason,
      k: number,
      execution: ExecutionPrice,
      price = priceAt(s, k)
    ): ExitDecision => ({
      reason,
      price,
      time: timeAt(s, k),
      barIndex: k,
      execution,
      isMaximumHoldDue,
      signalTime: NaN,
      signalPrice: NaN
    });

    pendingSignalTime = NaN;
    pendingSignalPrice = NaN;

    // At the open: a resting stop gapped through takes the opening trade, even from a pending sale.
    if (isStopActive && sOpen[s]! <= stopPrice) {
      return decision('trailing stop gap', 0, 'opening trade', sOpen[s]!);
    }

    // A sale left pending by an earlier session fills at this session's opening trade, ahead of the maximum
    // hold, which is only decided on that trade.
    if (!Number.isNaN(pendingTime)) {
      const k = firstTradeAfterDecision(s, pendingTime);

      if (k >= 0) {
        return {
          ...decision('buffered intraday loss', k, 'opening trade'),
          signalTime: pendingTime,
          signalPrice: pendingPrice
        };
      }
    }

    // Just after the open: the maximum hold sells at the next observed trade.
    if (isMaximumHoldDue) {
      const k = firstTradeFrom(s, bTime[start]! + secondsPerMinute);

      return k < 0 ? undefined : decision('maximum hold', k, tradeExecution(s, k));
    }

    // During the session: the first minute that reaches an active stop.
    let stopExit: ExitDecision | undefined;
    let stopIndex = -1;

    if (isStopActive) {
      for (let k = 0; k < count; k++) {
        if (bOpen[start + k]! <= stopPrice) {
          stopIndex = k;
          stopExit = decision('trailing stop', k, 'minute open through stop', bOpen[start + k]!);
          break;
        }

        if (bLow[start + k]! <= stopPrice) {
          stopIndex = k;

          if (stopFill === 'stop') {
            stopExit = decision('trailing stop', k, 'stop level', stopPrice);
          } else {
            const next = firstTradeFrom(s, bTime[start + k]! + secondsPerMinute);

            stopExit =
              next >= 0
                ? decision('trailing stop', next, tradeExecution(s, next))
                : {
                    ...decision('trailing stop', k, 'trigger minute close', bClose[start + k]!),
                    time: bTime[start + k]!
                  };
          }

          break;
        }
      }
    }

    // The buffered loss once the maximum hold applies: the first completed minute whose close reaches it.
    if (daysHeld < maximumHoldDays) {
      return stopExit;
    }

    const threshold = -open.investment * intradayLossBuffer;
    let signalBar = -1;

    for (let k = 0; k < count; k++) {
      if (profitAt(bClose[start + k]!) <= threshold) {
        signalBar = k;
        break;
      }
    }

    if (signalBar < 0) {
      return stopExit;
    }

    // The stop wins if it triggers in the signal minute or earlier, or at the same opening trade.
    if (
      stopExit &&
      stopIndex >= 0 &&
      (stopIndex <= signalBar || (stopIndex === signalBar + 1 && bOpen[start + stopIndex]! <= stopPrice))
    ) {
      return stopExit;
    }

    const decisionTime = bTime[start + signalBar]! + secondsPerMinute;
    const k = firstTradeAfterDecision(s, decisionTime);

    if (k < 0) {
      pendingSignalTime = decisionTime;
      pendingSignalPrice = bClose[start + signalBar]!;

      return undefined;
    }

    return {
      ...decision('buffered intraday loss', k, tradeExecution(s, k)),
      signalTime: decisionTime,
      signalPrice: bClose[start + signalBar]!
    };
  };

  for (let s = firstIndex; s <= endIndex; s++) {
    const recentHigh = referenceHighs[s]!;
    const xLevel = recentHigh * (1 - targetPercentChange);

    if (s === firstIndex) {
      trace?.push({
        index: s,
        recentHigh,
        xLevel,
        close: sClose[s]!,
        low: sLow[s]!,
        minClose: sMinClose[s]!,
        entryState: 'FLAT',
        setupKind: '',
        trailingLow: NaN,
        reboundTrigger: NaN,
        episodeActive: false,
        episodeHigh: NaN,
        episodeLow: NaN,
        episodeLastArm: -1,
        continuationActive: false,
        continuationHigh: NaN,
        continuationStart: -1
      });
      continue;
    }

    const start = sBarStart[s]!;
    const count = sBarCount[s]!;
    const isDip = (price: number) => 1 - price / recentHigh >= targetPercentChange;
    const openAtStart = position;
    let fillBar = -1;
    let fillExecution: ExecutionPrice = 'first trade after decision';

    // Entries: only on sessions that start flat.
    if (!openAtStart) {
      if (setupStatus === 2) {
        const k = firstTradeAfterDecision(s, signalTime);

        if (k >= 0) {
          fillBar = k;
          fillExecution = k === 0 ? 'opening trade' : tradeExecution(s, k);
        }
      } else {
        // Whether any minute of this session could arm, from the session's lowest close and its high, so
        // that sessions with no setup and nothing to arm are skipped.
        const eligible = s >= armStart;
        const couldArm =
          eligible &&
          (isDip(sMinClose[s]!) ||
            (latch && episodeActive && sMinClose[s]! <= episodeHigh * (1 - latchDepth)) ||
            (trough && episodeActive && troughEnabled && sHigh[s]! >= episodeLow * (1 + troughRecovery)) ||
            (dual && 1 - sMinClose[s]! / recentHigh >= shallowDepth) ||
            (postExit &&
              continuationActive &&
              s > continuationStart &&
              s - continuationStart <= continuationWindow &&
              sMinClose[s]! <= continuationHigh * (1 - pullback)));

        if (setupStatus === 1 || couldArm) {
          for (let k = 0; k < count; k++) {
            const close = bClose[start + k]!;
            const decisionTime = bTime[start + k]! + secondsPerMinute;

            if (setupStatus === 0) {
              if (!eligible) {
                continue;
              }

              // The deep path first, then the mechanisms in a fixed order of precedence.
              if (isDip(close)) {
                arm('deep', s, decisionTime, close, recentHigh, recentHigh);
                recogniseDeepCorrection(s, recentHigh, close);
              } else if (latch && episodeActive && close <= episodeHigh * (1 - latchDepth)) {
                arm('latch', s, decisionTime, close, recentHigh, episodeHigh);
              } else if (
                trough &&
                episodeActive &&
                troughEnabled &&
                close >= episodeLow * (1 + troughRecovery) &&
                (troughRetrace === 0 || close >= episodeLow + troughRetrace * (episodeHigh - episodeLow))
              ) {
                arm('trough', s, decisionTime, close, recentHigh, episodeLow);
                troughEnabled = false;
                troughUsed = episodeLow;
              } else if (dual && 1 - close / recentHigh >= shallowDepth) {
                arm('shallow', s, decisionTime, close, recentHigh, recentHigh);
              } else if (
                postExit &&
                continuationActive &&
                s > continuationStart &&
                s - continuationStart <= continuationWindow &&
                close <= continuationHigh * (1 - pullback)
              ) {
                arm('continuation', s, decisionTime, close, recentHigh, continuationHigh);
              } else {
                continue;
              }

              continue;
            }

            // A shallow setup reaching the deep level becomes a deep one, armed afresh at this close, so that
            // the deep path behaves exactly as without the shallow one.
            if (dual && (setupKind as SetupKind) === 'shallow' && isDip(close)) {
              setupKind = 'deep';
              setupActivationIndex = s;
              setupActivationTime = decisionTime;
              setupActivationPrice = close;
              setupReferenceHigh = recentHigh;
              setupAnchorHigh = recentHigh;
              setupTrailingLow = close;
              setupTrigger = close * (1 + trailingBuyPercentage);
              counts.shallowUpgrades++;
              counts.activationsByKind.deep++;
              recogniseDeepCorrection(s, recentHigh, close);

              if (setupRecord) {
                setupRecord.kind = 'deep';
                setupRecord.statusReason = 'upgraded';
                setupRecord.activationIndex = s;
                setupRecord.activationTime = decisionTime;
                setupRecord.activationPrice = close;
                setupRecord.referenceHigh = recentHigh;
                setupRecord.anchorHigh = recentHigh;
              }

              continue;
            }

            // Armed: the completed minute lowers the trailing low, then its close is tested against the
            // rebound trigger from that low.
            const low = bLow[start + k]!;

            if (low < setupTrailingLow) {
              setupTrailingLow = low;
            }

            setupTrigger = setupTrailingLow * (1 + reboundOf(setupKind));

            if (close < setupTrigger) {
              continue;
            }

            setupStatus = 2;
            signalIndex = s;
            signalTime = decisionTime;
            signalPrice = close;
            signalTrigger = setupTrigger;
            signalTrailingLow = setupTrailingLow;
            counts.reboundSignals++;

            const fill = firstTradeAfterDecision(s, decisionTime);

            if (fill >= 0) {
              fillBar = fill;
              fillExecution = tradeExecution(s, fill);
            }

            break;
          }
        }
      }

      if (setupRecord) {
        setupRecord.trailingLow = setupTrailingLow;

        if (setupStatus === 2) {
          setupRecord.status = 'pending';
          setupRecord.signalIndex = signalIndex;
          setupRecord.signalTime = signalTime;
          setupRecord.signalPrice = signalPrice;
        }
      }

      if (fillBar >= 0 && setupStatus === 2) {
        const price = priceAt(s, fillBar);
        const trade: Trade = {
          setupId,
          kind: setupKind,
          entryIndex: s,
          entryBar: fillBar,
          entryTime: timeAt(s, fillBar),
          entryPrice: price,
          entryExecution: fillExecution,
          entryTimestamp: sTime[s]!,
          decisionTime: signalTime,
          decisionPrice: signalPrice,
          signalIndex,
          activationIndex: setupActivationIndex,
          activationTime: setupActivationTime,
          activationPrice: setupActivationPrice,
          referenceHigh: setupReferenceHigh,
          anchorHigh: setupAnchorHigh,
          trailingLow: signalTrailingLow,
          reboundTrigger: signalTrigger,
          investment,
          shares: investment / price,
          exitIndex: -1,
          exitBar: -1,
          exitTime: NaN,
          exitPrice: NaN,
          exitExecution: '',
          reason: 'open',
          exitStopPrice: NaN,
          maximumHoldDue: false,
          bufferSignalTime: NaN,
          bufferSignalPrice: NaN
        };

        trades.push(trade);
        position = trade;
        counts.setupFills++;
        counts.fillsByKind[setupKind]++;

        if (setupRecord) {
          setupRecord.fillIndex = s;
          setupRecord.fillTime = trade.entryTime;
          setupRecord.fillPrice = price;
          setupRecord.carriedOvernight = signalCarried;
        }

        endSetup('filled', 'filled', s);

        // The high and the stop for the next session, from the fill onwards only.
        let high = Math.max(price, sClose[s]!);

        for (let k = fillBar; k < count; k++) {
          high = Math.max(high, bHigh[start + k]!);
        }

        postEntryHigh = high;
        stopPrice = postEntryHigh * (1 - trailingStopPercentage);
      } else if (setupStatus === 2 && !signalCarried) {
        signalCarried = true;
        counts.overnightOrders++;

        if (setupRecord) {
          setupRecord.carriedOvernight = true;
        }
      }
    }

    // Exits: only for a position open at the start of the session.
    if (openAtStart) {
      const exit = evaluateExit(s, openAtStart);

      if (exit) {
        const interest =
          openAtStart.investment * marginInterestRate * ((sTime[s]! - openAtStart.entryTimestamp) / secondsPerYear);
        const profit = openAtStart.shares * exit.price - openAtStart.investment - interest;

        openAtStart.exitIndex = s;
        openAtStart.exitBar = exit.barIndex;
        openAtStart.exitTime = exit.time;
        openAtStart.exitPrice = exit.price;
        openAtStart.exitExecution = exit.execution;
        openAtStart.reason = exit.reason;
        openAtStart.exitStopPrice = stopPrice;
        openAtStart.maximumHoldDue = exit.isMaximumHoldDue;
        openAtStart.bufferSignalTime = exit.signalTime;
        openAtStart.bufferSignalPrice = exit.signalPrice;
        position = undefined;

        if (exit.reason === 'buffered intraday loss') {
          counts.bufferedLossExits++;
        }

        if (profit < 0) {
          counts.losingExits++;
        }

        // A profitable exit opens the continuation window from the exit price.
        if (postExit && profit > 0) {
          continuationActive = true;
          continuationHigh = exit.price;
          continuationStart = s;
          counts.continuationWindows++;
        }
      } else {
        postEntryHigh = Math.max(postEntryHigh, sHigh[s]!);
        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
      }
    }

    // End of the session: the episode's trough, reset and expiry.
    if (episodeActive) {
      episodeLow = Math.min(episodeLow, sLow[s]!);

      if (trough && !troughEnabled && episodeLow < troughUsed) {
        troughEnabled = true;
      }

      if ((resetPolicy === 0 || !position) && sClose[s]! >= episodeLow + episodeReset * (episodeHigh - episodeLow)) {
        episodeActive = false;
        counts.episodeResets++;
      } else if (s - episodeLastArm > episodeExpiry) {
        episodeActive = false;
        counts.episodeExpiries++;
      }
    }

    // End of the session: the continuation window's high and expiry.
    if (continuationActive) {
      if (s > continuationStart) {
        continuationHigh = Math.max(continuationHigh, sHigh[s]!);
      }

      if (s - continuationStart >= continuationWindow) {
        continuationActive = false;
        counts.continuationExpiries++;
      }
    }

    trace?.push({
      index: s,
      recentHigh,
      xLevel,
      close: sClose[s]!,
      low: sLow[s]!,
      minClose: sMinClose[s]!,
      entryState: position ? 'LONG' : setupStatus === 0 ? 'FLAT' : setupStatus === 2 ? 'PENDING_FILL' : 'ARMED',
      setupKind: setupStatus === 0 ? '' : setupKind,
      trailingLow: setupStatus === 0 ? NaN : setupTrailingLow,
      reboundTrigger: setupStatus === 0 ? NaN : setupTrigger,
      episodeActive,
      episodeHigh: episodeActive ? episodeHigh : NaN,
      episodeLow: episodeActive ? episodeLow : NaN,
      episodeLastArm: episodeActive ? episodeLastArm : -1,
      continuationActive,
      continuationHigh: continuationActive ? continuationHigh : NaN,
      continuationStart: continuationActive ? continuationStart : -1
    });
  }

  if (setupStatus !== 0) {
    if (setupStatus === 2) {
      counts.entriesWithoutTrade++;
      counts.pendingAtEnd = 1;
    } else {
      counts.armedAtEnd = 1;
    }

    if (setupRecord) {
      setupRecord.statusReason = setupStatus === 2 ? 'pending_at_end' : 'armed_at_end';
    }
  }

  counts.pendingBufferedExitAtEnd = Boolean(position) && !Number.isNaN(pendingSignalTime);

  return { trades, counts, setups, trace };
};

// The study's strategy engine: the incumbent src/app/allIn.ts session loop, generalized to the frozen entry
// policies and the two stop models of PROTOCOL.md, with fees as an accounting overlay. With CLOSE_1M,
// STOP_DAILY and 0 bp it reproduces allIn.ts output for output (BASELINE_EQUIVALENCE.md). The STOP_DAILY
// exit is the incumbent's own exported evaluateSessionExit.
import type { BacktestPosition, MarketSession } from '#types';
import { PositionType } from '#types';
import {
  type EntryFill,
  type Episode,
  type ExitReason,
  type Fill,
  type SessionExit,
  type StateLogRow,
  type StopFill,
  evaluateSessionExit
} from '../app/allIn.ts';
import { type Band, type PolicySpec, type StopMode, costLevelsBps, incumbent, secondsPerDay } from './constants.ts';
import { computeSessionFacts, finalDecision, isDip } from './data.ts';
import { evaluateMinuteSessionExit } from './exits.ts';
import { type EntryDecision, scanEntry } from './policies.ts';

const {
  investmentAmount,
  trailingStopPercentage,
  maximumHoldDays,
  marginInterestRate,
  materialLossThreshold,
  lowerPriceReentry,
  retraceFraction
} = incumbent;

export interface RunInput {
  sessions: readonly MarketSession[];
  recentHighs: Float64Array;
  // First tradable session index (at least 1) and the last session index, inclusive.
  tradeStart: number;
  endIndex: number;
  // allIn.ts with a start date: the array starts at the window, session 0 is skipped but still gets a
  // daily row, and the drawdown trackers start at session 0.
  legacy?: boolean;
  policy: PolicySpec;
  stopMode: StopMode;
  stopFill: StopFill;
  costsBps?: readonly number[];
}

export interface TradeRecord {
  id: number;
  entryIndex: number;
  exitIndex: number; // -1 while open at the end
  entryDate: string;
  exitDate: string;
  recentHigh: number;
  decisionTime: number;
  decisionBarIndex: number;
  decisionPrice: number;
  decisionDepth: number;
  band: Band;
  mechanism: string;
  isFinalDecision: boolean;
  entryTime: number;
  entryPrice: number;
  entryExecution: string;
  entryBarIndex: number;
  entrySessionClose: number;
  // The incumbent-style fill on the entry session, and whether that session's final decision qualified.
  benchmarkPrice: number;
  finalDecisionDip: boolean;
  isLowerPriceReentry: boolean;
  shares: number;
  investment: number;
  exitTime: number;
  exitPrice: number;
  exitReason: ExitReason | 'open';
  exitExecution: string;
  exitStopPrice: number;
  isMaximumHoldDue: boolean | '';
  isIntrasessionStop: boolean;
  isSameSession: boolean;
  interest: number;
  grossProfit: number; // shares * exit - investment
  profit: number; // after interest, as the incumbent
  priceReturn: number;
  createdRestriction: boolean;
  fees: number[]; // per cost level
  net: number[]; // per cost level
  sessionsHeld: number;
  calendarDays: number;
  minutesHeld: number;
  worstMark: number; // lowest minute mark of the trade's own profit after interest, at 0 bp
  worstMarkTime: number;
}

export interface DailyRow {
  index: number;
  date: string;
  close: number;
  borrowed: number;
  mtmProfit: number; // 0 bp, exactly as allIn.ts
  equity: number[]; // per cost level, net of fees and an assumed liquidation fee
  recentHigh: number;
  decisionPrice: number;
  signal: boolean;
  held: boolean; // a position was held during some part of the session
  restricted: boolean; // at the session's end
  signature: string;
  minuteDrawdownToDate: number[]; // per cost level, the running maximum since the run's start
}

export interface SessionDiagnostic {
  index: number;
  date: string;
  restrictedAtStart: boolean;
  setupBarIndex: number;
  setupBand: Band | '';
  blocked: number;
  eligibleBars: number;
  entered: boolean;
  unfilled: boolean;
}

export interface Drawdown {
  maximumDrawdown: number;
  peakTimestamp: number;
  troughTimestamp: number;
}

export interface RunResult {
  input: Omit<RunInput, 'sessions' | 'recentHighs'>;
  costsBps: readonly number[];
  trades: TradeRecord[];
  daily: DailyRow[];
  stateLog: StateLogRow[];
  episodes: Episode[];
  diagnostics: SessionDiagnostic[];
  minuteDrawdown: Drawdown[];
  dailyDrawdown: Drawdown[];
  entriesWithoutTrade: number;
  realizedProfit: number;
  firstIndex: number;
  // allIn.ts-format records for the golden master.
  legacyEntryFills: Map<TradeRecord, EntryFill>;
}

const createDrawdownTracker = (startTimestamp: number) => {
  const tracker = {
    peakProfit: 0,
    peakTimestamp: startTimestamp,
    maximumDrawdown: 0,
    drawdownPeakTimestamp: startTimestamp,
    drawdownTroughTimestamp: startTimestamp,
    update: (markedProfit: number, timestamp: number) => {
      if (markedProfit > tracker.peakProfit) {
        tracker.peakProfit = markedProfit;
        tracker.peakTimestamp = timestamp;
      }

      if (tracker.peakProfit - markedProfit > tracker.maximumDrawdown) {
        tracker.maximumDrawdown = tracker.peakProfit - markedProfit;
        tracker.drawdownPeakTimestamp = tracker.peakTimestamp;
        tracker.drawdownTroughTimestamp = timestamp;
      }
    }
  };

  return tracker;
};

interface Restriction {
  lossExitPrice: number;
  referenceHigh: number;
  lowerLevel: number;
  episodeLow: number;
}

type State = 'NORMAL' | 'RESTRICTED';

interface OpenTrade {
  position: BacktestPosition;
  record: TradeRecord;
  stopPrice: number;
  highSinceEntry: number;
}

export const calculateInterest = (position: BacktestPosition, timestamp: number) => {
  const yearsHeld = (timestamp - position.entryTimestamp) / (365 * secondsPerDay);

  return position.investment * marginInterestRate * yearsHeld;
};

const resetLevelOf = (current: Restriction) =>
  current.episodeLow + retraceFraction * (current.referenceHigh - current.episodeLow);

export const simulate = (input: RunInput): RunResult => {
  const { sessions, recentHighs, tradeStart, endIndex, legacy = false, policy, stopMode, stopFill } = input;
  const costsBps = input.costsBps ?? costLevelsBps;
  const rates = costsBps.map((bps) => bps / 10000);
  const firstIndex = legacy ? 0 : tradeStart;
  const trades: TradeRecord[] = [];
  const daily: DailyRow[] = [];
  const stateLog: StateLogRow[] = [];
  const episodes: Episode[] = [];
  const diagnostics: SessionDiagnostic[] = [];
  const legacyEntryFills = new Map<TradeRecord, EntryFill>();
  const minuteTrackers = rates.map(() => createDrawdownTracker(sessions[firstIndex]?.bars[0]?.time ?? 0));
  const dailyTrackers = rates.map(() => createDrawdownTracker(sessions[firstIndex]?.time ?? 0));
  const feesPaid = rates.map(() => 0);
  let realizedProfit = 0;
  let entriesWithoutTrade = 0;
  let open: OpenTrade | undefined;
  let restriction: Restriction | undefined;
  let episode: Episode | undefined;

  const logState = (
    index: number,
    session: MarketSession,
    decisionPrice: number,
    prevState: State,
    newState: State,
    reason: string,
    signal: boolean,
    entryExecuted: boolean,
    exitReason = '',
    tradeProfit: number | '' = '',
    priceReturn: number | '' = '',
    current = restriction
  ) => {
    stateLog.push({
      index,
      date: session.date,
      prevState,
      newState,
      reason,
      exitReason,
      tradeProfit,
      priceReturn,
      lossExitPrice: current?.lossExitPrice ?? '',
      refHigh: current?.referenceHigh ?? '',
      lowerLevel: current?.lowerLevel ?? '',
      episodeLow: current?.episodeLow ?? '',
      resetLevel: current ? resetLevelOf(current) : '',
      close: session.close,
      decisionPrice,
      signal,
      entryExecuted
    });
  };

  // The incumbent's re-entry gate at one decision price.
  const gate = (decisionPrice: number) => {
    if (!restriction) {
      return true;
    }

    const provisional = { ...restriction, episodeLow: Math.min(restriction.episodeLow, decisionPrice) };

    return !(decisionPrice >= resetLevelOf(provisional) || decisionPrice > restriction.lowerLevel);
  };

  for (let index = firstIndex; index <= endIndex; index++) {
    const session = sessions[index]!;
    const recentHigh = recentHighs[index]!;
    const final = finalDecision(session);
    const decisionPrice = final.price;
    const signal = isDip(decisionPrice, recentHigh);

    if (index < tradeStart) {
      // allIn.ts skips its first session but still records it.
      daily.push({
        index,
        date: session.date,
        close: session.close,
        borrowed: 0,
        mtmProfit: 0,
        equity: rates.map(() => 0),
        recentHigh,
        decisionPrice,
        signal: false,
        held: false,
        restricted: false,
        signature: 'flat|-',
        minuteDrawdownToDate: rates.map(() => 0)
      });
      continue;
    }

    const heldAtStart = open;
    const realizedAtStart = realizedProfit;
    const feesAtStart = [...feesPaid];
    let entered: OpenTrade | undefined;
    let entryFees: number[] = rates.map(() => 0);
    let exit: SessionExit | undefined;
    let entryBlocked = false;
    let consumed: { restriction: Restriction; episode: Episode } | undefined;

    // Entries: only in a session that starts flat, at most once.
    if (!heldAtStart) {
      const restrictedAtStart = Boolean(restriction);
      const scan = scanEntry(policy, session, recentHigh, gate);
      const decision: EntryDecision | undefined = scan.entry;

      entryBlocked = scan.blocked > 0 && !decision;

      if (decision && !decision.fill) {
        entriesWithoutTrade++;
      }

      if (scan.setupBarIndex >= 0 || scan.blocked > 0 || decision) {
        diagnostics.push({
          index,
          date: session.date,
          restrictedAtStart,
          setupBarIndex: scan.setupBarIndex,
          setupBand: scan.setupBand,
          blocked: scan.blocked,
          eligibleBars: scan.eligibleBars,
          entered: Boolean(decision?.fill),
          unfilled: Boolean(decision && !decision.fill)
        });
      }

      if (decision?.fill) {
        const fill: Fill = decision.fill;
        const shares = investmentAmount / fill.price;
        const position: BacktestPosition = {
          isOpen: true,
          symbol: 'VGT',
          type: PositionType.Long,
          shares,
          investment: investmentAmount,
          entryTimestamp: session.time,
          entryPrice: fill.price
        };
        const facts = computeSessionFacts(sessions, recentHighs, index);
        const record: TradeRecord = {
          id: trades.length,
          entryIndex: index,
          exitIndex: -1,
          entryDate: session.date,
          exitDate: '',
          recentHigh,
          decisionTime: decision.decisionTime,
          decisionBarIndex: decision.barIndex,
          decisionPrice: decision.decisionPrice,
          decisionDepth: decision.depth,
          band: decision.band,
          mechanism: decision.mechanism,
          isFinalDecision: decision.isFinalDecision,
          entryTime: fill.time,
          entryPrice: fill.price,
          entryExecution: fill.execution,
          entryBarIndex: fill.barIndex,
          entrySessionClose: session.close,
          benchmarkPrice: facts.benchmark?.price ?? NaN,
          finalDecisionDip: facts.finalDip,
          isLowerPriceReentry: Boolean(restriction),
          shares,
          investment: investmentAmount,
          exitTime: NaN,
          exitPrice: NaN,
          exitReason: 'open',
          exitExecution: '',
          exitStopPrice: NaN,
          isMaximumHoldDue: '',
          isIntrasessionStop: false,
          isSameSession: false,
          interest: 0,
          grossProfit: 0,
          profit: 0,
          priceReturn: 0,
          createdRestriction: false,
          fees: [],
          net: [],
          sessionsHeld: 0,
          calendarDays: 0,
          minutesHeld: 0,
          worstMark: Infinity,
          worstMarkTime: NaN
        };
        // The entry session's high and stop, from the fill onwards only.
        const laterBars = session.bars.slice(fill.barIndex);
        const postEntryHigh = Math.max(fill.price, session.close, ...laterBars.map((bar) => bar.high));

        entered = {
          position,
          record,
          stopPrice: postEntryHigh * (1 - trailingStopPercentage),
          highSinceEntry: postEntryHigh
        };
        trades.push(record);
        legacyEntryFills.set(record, {
          ...fill,
          decisionTime: decision.decisionTime,
          decisionPrice: decision.decisionPrice,
          sessionClose: session.close
        });
        entryFees = rates.map((rate) => rate * investmentAmount);
        entryFees.forEach((fee, k) => (feesPaid[k]! += fee));

        if (restriction && episode) {
          consumed = { restriction, episode };
          restriction = undefined;
          episode = undefined;
        }
      }
    }

    // Exits of the position held at the start, or, with the minute stop, of today's entry after its fill.
    const exiting = heldAtStart ?? (stopMode === 'STOP_MINUTE_CAUSAL' ? entered : undefined);
    let stopAtExit = NaN;
    let isIntrasessionStop = false;

    if (exiting) {
      const { position } = exiting;
      const interest = calculateInterest(position, session.time);

      if (stopMode === 'STOP_DAILY') {
        exit = evaluateSessionExit({
          position,
          session,
          stopPrice: exiting.stopPrice,
          interest,
          maximumHoldDays,
          stopFill
        });
        stopAtExit = exiting.stopPrice;

        if (!exit) {
          exiting.highSinceEntry = Math.max(exiting.highSinceEntry, session.high);
          exiting.stopPrice = Math.max(exiting.stopPrice, exiting.highSinceEntry * (1 - trailingStopPercentage));
        }
      } else {
        const isEntrySession = exiting === entered;
        const result = evaluateMinuteSessionExit({
          position,
          session,
          stopPrice: isEntrySession ? exiting.record.entryPrice * (1 - trailingStopPercentage) : exiting.stopPrice,
          highSinceEntry: isEntrySession ? exiting.record.entryPrice : exiting.highSinceEntry,
          interest,
          stopFill,
          entryBarIndex: isEntrySession ? exiting.record.entryBarIndex : undefined
        });

        exit = result.exit;
        stopAtExit = result.stopAtExit;
        isIntrasessionStop = result.isIntrasessionStop;

        if (!exit) {
          exiting.stopPrice = result.stopPrice;
          exiting.highSinceEntry = result.highSinceEntry;
        }
      }

      if (exit) {
        const { record } = exiting;
        const profit = position.shares * exit.price - position.investment - interest;

        position.isOpen = false;
        position.exitTimestamp = session.time;
        position.exitPrice = exit.price;
        position.interest = interest;
        position.profit = profit;
        realizedProfit += profit;

        const exitFees = rates.map((rate) => rate * position.shares * exit!.price);

        exitFees.forEach((fee, k) => (feesPaid[k]! += fee));

        const priceReturn = exit.price / position.entryPrice - 1;

        Object.assign(record, {
          exitIndex: index,
          exitDate: session.date,
          exitTime: exit.time,
          exitPrice: exit.price,
          exitReason: exit.reason,
          exitExecution: exit.execution,
          exitStopPrice: stopAtExit,
          isMaximumHoldDue: exit.isMaximumHoldDue,
          isIntrasessionStop,
          isSameSession: exiting === entered,
          interest,
          grossProfit: position.shares * exit.price - position.investment,
          profit,
          priceReturn,
          fees: rates.map((rate, k) => rate * position.investment + exitFees[k]!),
          net: rates.map((rate, k) => profit - rate * position.investment - exitFees[k]!),
          calendarDays: (session.time - position.entryTimestamp) / secondsPerDay
        });

        if (priceReturn <= -materialLossThreshold) {
          record.createdRestriction = true;
          restriction = {
            lossExitPrice: exit.price,
            referenceHigh: record.recentHigh,
            lowerLevel: exit.price * (1 - lowerPriceReentry),
            episodeLow: session.close
          };
          episode = {
            exitIndex: index,
            exitDate: session.date,
            exitReason: exit.reason,
            loss: profit,
            priceReturn,
            lossExitPrice: exit.price,
            losingEntryPrice: position.entryPrice,
            referenceHigh: record.recentHigh,
            episodeLow: session.close,
            resolution: '',
            resolutionDate: ''
          };
          episodes.push(episode);
          logState(
            index,
            session,
            decisionPrice,
            'NORMAL',
            'RESTRICTED',
            'losing_exit',
            signal,
            false,
            exit.reason,
            profit,
            priceReturn
          );
        } else if (profit < 0) {
          logState(
            index,
            session,
            decisionPrice,
            'NORMAL',
            'NORMAL',
            'loss_not_restricted',
            signal,
            false,
            exit.reason,
            profit,
            priceReturn
          );
        } else {
          logState(
            index,
            session,
            decisionPrice,
            'NORMAL',
            'NORMAL',
            'profitable_exit',
            signal,
            false,
            exit.reason,
            profit,
            priceReturn
          );
        }
      }
    }

    // Minute-sampled marks: each regular minute's close, then the official close. A position counts from
    // its fill's minute until its exit's minute.
    const sessionTrade = heldAtStart ?? entered;
    const heldFrom = heldAtStart ? 0 : (entered?.record.entryBarIndex ?? Infinity);
    const heldUntil = exit?.barIndex ?? Infinity;
    const barCount = session.bars.length;

    for (let barIndex = 0; barIndex <= barCount; barIndex++) {
      const time = barIndex < barCount ? session.bars[barIndex]!.time : session.closeTime;
      const price = barIndex < barCount ? session.bars[barIndex]!.close : session.close;
      const isHeld = sessionTrade !== undefined && barIndex >= heldFrom && barIndex < heldUntil;
      const realized = barIndex >= heldUntil ? realizedProfit : realizedAtStart;
      const unrealized = isHeld
        ? sessionTrade.position.shares * price -
          sessionTrade.position.investment -
          calculateInterest(sessionTrade.position, session.time)
        : 0;
      const marked = realized + (isHeld ? unrealized : 0);

      if (isHeld) {
        const record = sessionTrade.record;

        if (unrealized < record.worstMark) {
          record.worstMark = unrealized;
          record.worstMarkTime = time;
        }

        if (barIndex < barCount) {
          record.minutesHeld++;
        }
      }

      rates.forEach((rate, k) => {
        const fees =
          barIndex >= heldUntil
            ? feesPaid[k]!
            : entered && barIndex >= heldFrom
              ? feesAtStart[k]! + entryFees[k]!
              : feesAtStart[k]!;
        const liquidation = isHeld ? rate * sessionTrade.position.shares * price : 0;

        minuteTrackers[k]!.update(marked - fees - liquidation, time);
      });
    }

    if (sessionTrade && heldFrom <= barCount) {
      sessionTrade.record.sessionsHeld++;
    }

    // Daily mark at the close.
    const openTrade = [heldAtStart, entered].find((trade) => trade?.position.isOpen);
    const markedProfit =
      realizedProfit +
      (openTrade
        ? openTrade.position.shares * session.close -
          openTrade.position.investment -
          calculateInterest(openTrade.position, session.time)
        : 0);
    const equity = rates.map(
      (rate, k) => markedProfit - feesPaid[k]! - (openTrade ? rate * openTrade.position.shares * session.close : 0)
    );

    equity.forEach((value, k) => dailyTrackers[k]!.update(value, session.time));
    open = openTrade;

    // End of the session: resolve the restriction (allIn.ts order). An entry while restricted cleared it.
    if (consumed) {
      consumed.restriction.episodeLow = Math.min(consumed.restriction.episodeLow, session.close);
      consumed.episode.episodeLow = consumed.restriction.episodeLow;
      logState(
        index,
        session,
        decisionPrice,
        'RESTRICTED',
        'NORMAL',
        'lower_price_reentry',
        signal,
        true,
        '',
        '',
        '',
        consumed.restriction
      );
      consumed.episode.resolution = 'lower_price_reentry';
      consumed.episode.resolutionDate = session.date;
    } else if (entered) {
      logState(index, session, decisionPrice, 'NORMAL', 'NORMAL', 'normal_entry', signal, true);
    }

    if (restriction && episode) {
      restriction.episodeLow = Math.min(restriction.episodeLow, session.close);
      episode.episodeLow = restriction.episodeLow;

      if (!openTrade && session.close >= resetLevelOf(restriction)) {
        logState(index, session, decisionPrice, 'RESTRICTED', 'NORMAL', 'recovery_reset', signal, false);
        episode.resolution = 'recovery_reset';
        episode.resolutionDate = session.date;
        restriction = undefined;
        episode = undefined;
      } else {
        logState(
          index,
          session,
          decisionPrice,
          'RESTRICTED',
          'RESTRICTED',
          entryBlocked ? 'entry_blocked' : 'restricted',
          signal,
          false
        );

        if (index === endIndex) {
          episode.resolution = 'unresolved_at_end';
          episode.resolutionDate = session.date;
        }
      }
    }

    daily.push({
      index,
      date: session.date,
      close: session.close,
      borrowed: openTrade ? openTrade.position.investment : 0,
      mtmProfit: markedProfit,
      equity,
      recentHigh,
      decisionPrice,
      signal,
      held: sessionTrade !== undefined && heldFrom <= barCount,
      restricted: Boolean(restriction),
      signature: `${openTrade ? `${openTrade.record.entryIndex}:${openTrade.position.entryPrice}:${openTrade.stopPrice}` : 'flat'}|${
        restriction ? `${restriction.lossExitPrice}:${restriction.referenceHigh}:${restriction.episodeLow}` : '-'
      }`,
      minuteDrawdownToDate: minuteTrackers.map((tracker) => tracker.maximumDrawdown)
    });
  }

  // A position still open at the end is marked at the last close, net of interest and an assumed
  // liquidation fee.
  const lastSession = sessions[endIndex]!;

  if (open) {
    const { position, record } = open;
    const interest = calculateInterest(position, lastSession.time);
    const profit = position.shares * lastSession.close - position.investment - interest;
    const exitFees = rates.map((rate) => rate * position.shares * lastSession.close);

    Object.assign(record, {
      exitPrice: lastSession.close,
      interest,
      grossProfit: position.shares * lastSession.close - position.investment,
      profit,
      priceReturn: lastSession.close / position.entryPrice - 1,
      fees: rates.map((rate, k) => rate * position.investment + exitFees[k]!),
      net: rates.map((rate, k) => profit - rate * position.investment - exitFees[k]!),
      calendarDays: (lastSession.time - position.entryTimestamp) / secondsPerDay
    });
  }

  const toDrawdown = (tracker: ReturnType<typeof createDrawdownTracker>): Drawdown => ({
    maximumDrawdown: tracker.maximumDrawdown,
    peakTimestamp: tracker.drawdownPeakTimestamp,
    troughTimestamp: tracker.drawdownTroughTimestamp
  });

  return {
    input: { tradeStart, endIndex, legacy, policy, stopMode, stopFill, costsBps },
    costsBps,
    trades,
    daily,
    stateLog,
    episodes,
    diagnostics,
    minuteDrawdown: minuteTrackers.map(toDrawdown),
    dailyDrawdown: dailyTrackers.map(toDrawdown),
    entriesWithoutTrade,
    realizedProfit,
    firstIndex,
    legacyEntryFills
  };
};

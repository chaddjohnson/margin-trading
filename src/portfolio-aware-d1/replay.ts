// The fixed-$100,000 shared pool replayed from cached book traces (./trace.ts) instead of re-running every book over
// every minute. The allocator's decisions are causal by construction: the traces' events are consumed strictly in the
// engine's chronological order (session; the session's bar minutes in time order, then its closing print; within a
// minute the virtual exits, then the virtual fills, then the rebound decisions in the tie order), and a decision is
// answered from the pool's state at that moment only (an open lot or a pending reservation refuses it). A trade's
// later fields (fill, exit, P&L) are read only when its own fill or exit event is reached; nothing stored about the
// future reaches a decision. The funded lots are then booked by the frozen FixedLedger and marked exactly where the
// engine marks them: at every bar of the held lot's own symbol, at its exit minute, and at every close; the minute
// and daily trackers are the frozen Tracker's strict updates. With `detail` the result carries everything the engine
// returns in fixed mode (signal records, daily rows, labelled virtual trades); parity.ts proves the two equal.
import type { Dataset } from '../four-family/data.ts';
import { type DrawdownStats, Tracker } from '../multi-etf-allocator/engine.ts';
import { FixedLedger, type RealLot } from '../multi-etf-allocator/ledger.ts';
import type { ScheduleKey } from '../multi-etf-allocator/margin.ts';
import type { VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import { priceAt, secondsPerMinute, timeAt } from '../shared-margin-portfolio/strategy.ts';
import {
  type NDailyRow,
  type NRunResult,
  type NSignalRecord,
  bookOrderOf,
  lotKeysOf,
  tieOrderOf
} from './nbook/engine.ts';
import type { Lot, Prices } from './nbook/ledger.ts';
import { emptyValuesOf, lmvOf, securitiesOf } from './nbook/margin.ts';
import type { BookTrace } from './trace.ts';

export interface ReplayBook {
  symbol: string;
  ds: Dataset;
  trace: BookTrace;
}

export interface ReplayConfig {
  symbols: string[]; // the books, in the configuration's order (the first one's calendar and first bar start the run)
  startIndex: number;
  endIndex: number;
  principal: number;
  rate: number;
  costBps: number;
  stopSlippageBps: number;
  passiveSchedules?: readonly ScheduleKey[];
  detail: boolean;
}

export interface ReplayLotSummary {
  id: number;
  symbol: string;
  tradeId: number;
  decisionTime: number;
  entryIndex: number;
  exitIndex: number; // -1 while open at the end
  entryTime: number;
  exitTime: number;
  net: number;
  interest: number;
  costs: number; // per-side costs paid on the entry and (if closed) the exit
  open: boolean;
}

export interface Refusal {
  decider: string; // the book whose decision was refused
  holder: string; // the book whose lot or pending order held the pool
  decisionIndex: number;
  tradeId: number;
}

export interface ReplayResult {
  net: number; // realized + unrealized at the end
  realized: number;
  unrealized: number;
  interest: number; // paid + accrued on open lots at the end
  minuteDrawdown: DrawdownStats;
  dailyDrawdown: DrawdownStats;
  marks: Float64Array; // strategy mark (realized + unrealized) at each session's close, by session index
  lots: ReplayLotSummary[];
  decisions: number;
  granted: number;
  refused: number;
  sameMinuteDecisions: number;
  refusals: Refusal[];
  heldSessions: number; // sessions with a lot open at the close or any minute
  heldDays: number; // calendar days of borrowing (principal × days ÷ principal)
  // With detail: the engine's fixed-mode result, field for field.
  full?: Omit<NRunResult, 'config' | 'universe'>;
}

interface Event {
  s: number;
  close: 0 | 1;
  t: number;
  phase: 0 | 1 | 2; // exit, fill, decision
  rank: number;
  book: number;
  trade: VirtualTrade;
}

const barTime = (ds: Dataset, s: number, k: number) => ds.bTime[ds.sBarStart[s]! + k]!;

// The latest bar of `ds` in session s starting at or before T, or -1.
const lastBarAtOrBefore = (ds: Dataset, s: number, T: number) => {
  const start = ds.sBarStart[s]!;
  let lo = 0;
  let hi = ds.sBarCount[s]! - 1;
  let found = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;

    if (ds.bTime[start + mid]! <= T) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return found;
};

export const replayFixedPool = (books: ReplayBook[], config: ReplayConfig): ReplayResult => {
  const { startIndex, endIndex, detail } = config;
  const bySymbol = new Map(books.map((book) => [book.symbol, book]));

  for (const symbol of config.symbols) {
    const book = bySymbol.get(symbol);

    if (!book) {
      throw new Error(`replay: no trace for the ${symbol} book`);
    }

    if (book.trace.startIndex !== startIndex || book.trace.endIndex !== endIndex) {
      throw new Error(`replay: the ${symbol} trace covers ${book.trace.startIndex}..${book.trace.endIndex}`);
    }

    if (book.trace.settings.costBps !== config.costBps || book.trace.settings.rate !== config.rate) {
      throw new Error(`replay: the ${symbol} trace was built for other execution settings`);
    }
  }

  const order = bookOrderOf(config.symbols);
  const ties = tieOrderOf(config.symbols);
  const ordered = order.map((symbol) => bySymbol.get(symbol)!);
  const anyDs = bySymbol.get(config.symbols[0]!)!.ds;
  const dates = anyDs.dates;
  const sTime = anyDs.sTime;
  const closeTimes = anyDs.sCloseTime;
  const securities = securitiesOf(config.symbols);
  const lotKeys = lotKeysOf(config.symbols);

  // ----- the events, in the engine's order -----

  const events: Event[] = [];

  ordered.forEach((book, bookIndex) => {
    const { ds } = book;
    const tieRank = ties.indexOf(book.symbol);

    for (const trade of book.trace.trades) {
      events.push({
        s: trade.decisionIndex,
        close: 0,
        t: barTime(ds, trade.decisionIndex, trade.decisionBar),
        phase: 2,
        rank: tieRank,
        book: bookIndex,
        trade
      });

      if (trade.entryIndex >= 0) {
        const isClose = trade.entryBar >= ds.sBarCount[trade.entryIndex]!;

        events.push({
          s: trade.entryIndex,
          close: isClose ? 1 : 0,
          t: isClose ? 0 : barTime(ds, trade.entryIndex, trade.entryBar),
          phase: 1,
          rank: bookIndex,
          book: bookIndex,
          trade
        });
      }

      if (trade.exitIndex >= 0) {
        const isClose = trade.exitBar >= ds.sBarCount[trade.exitIndex]!;

        events.push({
          s: trade.exitIndex,
          close: isClose ? 1 : 0,
          t: isClose ? 0 : barTime(ds, trade.exitIndex, trade.exitBar),
          phase: 0,
          rank: bookIndex,
          book: bookIndex,
          trade
        });
      }
    }
  });

  events.sort((a, b) => a.s - b.s || a.close - b.close || a.t - b.t || a.phase - b.phase || a.rank - b.rank);

  // ----- the allocator: one pool, one lot or reservation at a time -----

  interface Funded {
    trade: VirtualTrade;
    book: number;
    lotId: number;
  }

  const funded: Funded[] = [];
  const signalRecords: NSignalRecord[] = [];
  const recordTrades: VirtualTrade[] = [];
  const decisionsAt = new Map<string, number>();
  const refusals: Refusal[] = [];
  let reservation: Funded | undefined;
  let holding: Funded | undefined;
  let granted = 0;
  let refused = 0;

  for (const event of events) {
    if (event.phase === 2) {
      const key = `${event.s}:${event.t}`;

      decisionsAt.set(key, (decisionsAt.get(key) ?? 0) + 1);
    }
  }

  for (const event of events) {
    if (event.phase === 0) {
      if (holding && holding.trade === event.trade) {
        holding = undefined;
      }

      continue;
    }

    if (event.phase === 1) {
      if (reservation && reservation.trade === event.trade) {
        holding = reservation;
        reservation = undefined;
      }

      continue;
    }

    const parts = [
      ...(holding ? [`${ordered[holding.book]!.symbol} lot ${holding.lotId}`] : []),
      ...(reservation ? [`${ordered[reservation.book]!.symbol} pending order`] : [])
    ];
    const label = parts.join('+');
    const grant = parts.length === 0;
    const book = ordered[event.book]!;

    if (grant) {
      reservation = { trade: event.trade, book: event.book, lotId: funded.length + 1 };
      funded.push(reservation);
      granted++;
    } else {
      refused++;
      refusals.push({
        decider: book.symbol,
        holder: ordered[(holding ?? reservation)!.book]!.symbol,
        decisionIndex: event.s,
        tradeId: event.trade.id
      });
    }

    if (detail) {
      const staleSeconds: Partial<Record<string, number>> = {};
      const decisionTime = event.trade.decisionTime;

      for (const symbol of config.symbols) {
        const other = bySymbol.get(symbol)!.ds;
        const k = lastBarAtOrBefore(other, event.s, event.t);

        staleSeconds[symbol] =
          decisionTime - (k >= 0 ? barTime(other, event.s, k) + secondsPerMinute : closeTimes[event.s - 1]!);
      }

      signalRecords.push({
        repeatedRefusals: 0,
        symbol: book.symbol,
        phenotype: book.trace.phenotype,
        index: event.s,
        date: dates[event.s]!,
        barIndex: event.trade.decisionBar,
        decisionTime,
        decisionPrice: event.trade.decisionPrice,
        setupId: event.trade.setupId,
        setupKind: event.trade.setupKind,
        outcome: grant ? 'granted' : 'refused',
        reason: grant ? '' : `pool occupied (${label})`,
        sameMinuteCandidates: decisionsAt.get(`${event.s}:${event.t}`)!,
        occupiedBy: grant ? '' : label,
        equityAtDecision: NaN,
        principal: config.principal,
        regTMaximum: NaN,
        houseMaximum: NaN,
        maximumU50: NaN,
        maximumU60: NaN,
        maximumL60: NaN,
        maximumG60: NaN,
        staleSeconds
      });
      recordTrades.push(event.trade);
    }
  }

  let sameMinuteDecisions = 0;

  for (const count of decisionsAt.values()) {
    if (count > 1) {
      sameMinuteDecisions += count;
    }
  }

  // ----- the ledger and the marks, session by session -----

  const ledger = new FixedLedger(config.rate, config.costBps);
  const firstBarTime = anyDs.bTime[anyDs.sBarStart[startIndex]!]!;
  const minuteTracker = new Tracker(0, firstBarTime);
  const equityTracker = new Tracker(0, sTime[startIndex]!);
  const marks = new Float64Array(anyDs.sessionCount).fill(NaN);
  const daily: NDailyRow[] = [];
  const lotOf = new Map<VirtualTrade, RealLot>();
  let next = 0; // the next funded trade to open
  let open: { lot: RealLot; f: Funded; ds: Dataset } | undefined;
  let heldSessions = 0;

  marks[startIndex] = 0;

  const openLot = (f: Funded, s: number, k: number) => {
    const ds = ordered[f.book]!.ds;
    const trade = f.trade;
    const raw = priceAt(ds, s, k);
    const price = ledger.buyPrice(raw);
    const lot = ledger.openLot({
      id: f.lotId,
      symbol: ordered[f.book]!.symbol as RealLot['symbol'],
      trade,
      slot: 0,
      shares: config.principal / price,
      entryIndex: s,
      entryBar: k,
      entryTime: timeAt(ds, s, k),
      entryRawPrice: raw,
      entryPrice: price,
      entryExecution: trade.entryExecution,
      entryTimestamp: sTime[s]!,
      decisionIndex: trade.decisionIndex,
      decisionTime: trade.decisionTime,
      decisionPrice: trade.decisionPrice,
      equityAtDecision: NaN,
      fraction: NaN,
      originalPrincipal: config.principal,
      principal: config.principal,
      accruedBefore: 0,
      accrualStart: sTime[s]!,
      posted: 0,
      accrued: 0,
      repaidByCore: 0,
      dividends: 0
    });

    lotOf.set(trade, lot);
    open = { lot, f, ds };
  };

  const closeLot = (s: number) => {
    const { lot, f } = open!;
    const trade = f.trade;
    const isStop = trade.exitReason === 'trailing stop' || trade.exitReason === 'trailing stop gap';

    ledger.closeLot(lot, {
      index: s,
      bar: trade.exitBar,
      time: trade.exitTime,
      rawPrice: trade.exitRawPrice,
      reason: trade.exitReason,
      execution: trade.exitExecution,
      sessionTime: sTime[s]!,
      extraSlippage: isStop ? config.stopSlippageBps / 10000 : 0
    });
    open = undefined;
  };

  const markLot = (lot: RealLot, price: number, s: number, time: number) => {
    const mark = ledger.mark(lot, price, sTime[s]!);

    lot.heldMarks++;

    if (mark < lot.worstMark) {
      lot.worstMark = mark;
      lot.worstMarkTime = time;
    }

    return mark;
  };

  const fillsAt = (f: Funded | undefined, s: number) =>
    f !== undefined && f.trade.entryIndex === s ? f.trade.entryBar : -1;

  for (let s = startIndex + 1; s <= endIndex; s++) {
    let held = Boolean(open);

    // The bar minutes: the held lot's own bars until its exit; a later funded lot from its fill bar.
    for (;;) {
      if (open) {
        markBars(s, open.lot.entryIndex === s ? open.lot.entryBar : 0);

        if (open) {
          break; // still held at the session's last bar
        }

        continue; // exited at a bar: a later funded lot may fill in this session
      }

      const candidate = funded[next];
      const k = fillsAt(candidate, s);

      if (k < 0 || k >= ordered[candidate!.book]!.ds.sBarCount[s]!) {
        break;
      }

      next++;
      openLot(candidate!, s, k);
      held = true;
    }

    // The close: a closing-print exit, then a closing-print fill, then the marks at the close.
    if (open && open.f.trade.exitIndex === s) {
      closeLot(s);
    }

    if (!open) {
      const candidate = funded[next];
      const k = fillsAt(candidate, s);

      if (k >= 0) {
        next++;
        openLot(candidate!, s, k);
        held = true;
      }
    }

    let unrealized = 0;

    if (open) {
      const close = open.ds.sClose[s]!;

      unrealized = markLot(open.lot, close, s, closeTimes[s]!);
    }

    minuteTracker.updateStrict(ledger.realized + unrealized, closeTimes[s]!);
    equityTracker.updateStrict(ledger.realized + unrealized, sTime[s]!);
    marks[s] = ledger.realized + unrealized;

    if (held) {
      heldSessions++;
    }

    if (detail) {
      daily.push(dailyRowFixed(s, unrealized));
    }
  }

  // The bars of the held lot in session s from bar `from` on; returns after its exit or at the session's end.
  function markBars(s: number, from: number) {
    const { lot, f, ds } = open!;
    const trade = f.trade;
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const exitBar = trade.exitIndex === s ? trade.exitBar : Infinity;

    for (let k = from; k < count; k++) {
      const T = ds.bTime[start + k]!;

      if (k === exitBar) {
        closeLot(s);
        minuteTracker.updateStrict(ledger.realized, T);

        return;
      }

      minuteTracker.updateStrict(ledger.realized + markLot(lot, ds.bClose[start + k]!, s, T), T);
    }
  }

  // ----- the end -----

  const lastSessionTime = sTime[endIndex]!;

  if (open) {
    const { lot, ds } = open;
    const close = ds.sClose[endIndex]!;

    lot.exitRawPrice = close;
    lot.interest = ledger.lotInterest(lot, lastSessionTime);
    lot.gross = lot.shares * close - lot.originalPrincipal;
    lot.net = lot.gross - lot.interest;
  }

  const unrealizedAtEnd = ledger.open.reduce((total, lot) => total + lot.net, 0);
  const lots: ReplayLotSummary[] = ledger.lots.map((lot) => ({
    id: lot.id,
    symbol: lot.symbol,
    tradeId: lot.trade.id,
    decisionTime: lot.decisionTime,
    entryIndex: lot.entryIndex,
    exitIndex: lot.exitIndex,
    entryTime: lot.entryTime,
    exitTime: lot.exitTime,
    net: lot.net,
    interest: lot.interest,
    costs:
      lot.shares * (lot.entryPrice - lot.entryRawPrice) +
      (lot.exitIndex >= 0 ? lot.shares * (lot.exitRawPrice - lot.exitPrice) : 0),
    open: lot.exitIndex < 0
  }));
  const heldDays = ledger.lots.reduce(
    (total, lot) =>
      total + ((lot.exitIndex >= 0 ? sTime[lot.exitIndex]! : lastSessionTime) - lot.entryTimestamp) / 86400,
    0
  );
  const result: ReplayResult = {
    net: ledger.realized + unrealizedAtEnd,
    realized: ledger.realized,
    unrealized: unrealizedAtEnd,
    interest: ledger.lots.reduce((total, lot) => total + lot.interest, 0),
    minuteDrawdown: minuteTracker.stats(),
    dailyDrawdown: equityTracker.stats(),
    marks,
    lots,
    decisions: granted + refused,
    granted,
    refused,
    sameMinuteDecisions,
    refusals,
    heldSessions,
    heldDays
  };

  if (detail) {
    const grantedTrades = new Set(funded.map((f) => f.trade));
    const labelled = new Map<VirtualTrade, VirtualTrade>();
    const trades = ordered.flatMap((book) =>
      book.trace.trades.map((trade) => {
        const lot = lotOf.get(trade);
        const copy = {
          ...trade,
          allocator: grantedTrades.has(trade) ? 'granted' : 'refused',
          fundedLotId: lot ? lot.id : -1
        } as VirtualTrade;

        labelled.set(trade, copy);
        return copy;
      })
    );

    signalRecords.forEach((record, index) => {
      record.trade = labelled.get(recordTrades[index]!)!;
    });
    const passive = config.passiveSchedules ?? ['U35', 'U50', 'U60', 'L50', 'L60', 'G50', 'G60'];

    result.full = {
      endIndex,
      trades,
      lots: ledger.lots as unknown as Lot[],
      signals: signalRecords,
      events: [],
      daily,
      dividends: [],
      dailyDrawdown: equityTracker.stats(),
      minuteDrawdown: minuteTracker.stats(),
      strategyDailyDrawdown: equityTracker.stats(),
      strategyMinuteDrawdown: minuteTracker.stats(),
      approaches: [],
      minimum: Object.fromEntries(
        passive.map((schedule) => [
          schedule,
          { ratio: Infinity, time: NaN, excess: Infinity, excessTime: NaN, dailyRatio: Infinity }
        ])
      ),
      marginMarks: 0,
      minutesBelow: Object.fromEntries(passive.map((schedule) => [schedule, { warning: 0, critical: 0 }])),
      reservationsAtEnd: reservation
        ? [
            {
              symbol: ordered[reservation.book]!.symbol,
              principal: config.principal,
              decisionTime: reservation.trade.decisionTime
            }
          ]
        : [],
      ledgerChecks: { events: 0, poolChecks: granted + refused },
      books: ordered.map((book) => ({
        symbol: book.symbol,
        phenotype: book.trace.phenotype,
        setups: book.trace.setups,
        signals: book.trace.signals,
        armedAtEnd: book.trace.armedAtEnd,
        pendingAtEnd: book.trace.pendingAtEnd
      }))
    };
  }

  return result;

  function dailyRowFixed(s: number, unrealized: number): NDailyRow {
    const sessionTime = sTime[s]!;
    const closes = Object.fromEntries(securities.map((security) => [security, NaN])) as Prices;

    for (const symbol of config.symbols) {
      closes[symbol] = bySymbol.get(symbol)!.ds.sClose[s]!;
    }

    const mv = emptyValuesOf(securities);
    const lotShares = Object.fromEntries(lotKeys.map((key) => [key, 0])) as Record<string, number>;

    for (const lot of ledger.open) {
      mv[lot.symbol] = mv[lot.symbol]! + lot.shares * closes[lot.symbol]!;
      lotShares[lot.symbol] = lotShares[lot.symbol]! + lot.shares;
    }

    const interestLiability = ledger.open.reduce((total, lot) => total + ledger.lotInterest(lot, sessionTime), 0);

    return {
      index: s,
      date: dates[s]!,
      closes,
      voogShares: 0,
      vgtCoreShares: 0,
      lotShares,
      mv,
      cash: 0,
      receivables: 0,
      principal: ledger.open.reduce((total, lot) => total + lot.principal, 0),
      interestLiability,
      fundingPayable: 0,
      lmv: lmvOf(securities, mv),
      equity: ledger.realized + unrealized,
      equityToLmv: NaN,
      debtToEquity: NaN,
      grossExposure: NaN,
      realized: ledger.realized,
      unrealized,
      strategyMark: ledger.realized + unrealized,
      cumulativeInterest: ledger.interestPaid + interestLiability,
      cumulativeDividends: 0,
      coreTurnover: 0,
      openLots: ledger.open.length,
      owners: ledger.open.map((lot) => lot.symbol).join('+'),
      required: {},
      minuteMinRatio: {},
      minutesBelowWarning: {},
      minutesBelowCritical: {}
    };
  }
};

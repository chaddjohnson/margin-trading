// The study's derived fixed-pool replay (research/d1-ranked-preemption/PROTOCOL.md §5): the frozen trace replay
// src/portfolio-aware-d1/replay.ts `replayFixedPool` with the allocation option of ./engine.ts. Under shadow semantics
// a book's virtual trades never depend on the allocator, so its cached trace (src/portfolio-aware-d1/trace.ts, used
// unchanged) is its virtual-trade sequence in every allocator run, preemptive or not; only which trades are funded
// and when a funded lot is sold change. parity.ts proves this replay equal to the derived engine trade for trade,
// signal for signal, mark for mark, under P0, P0R and P1, and under P0 equal to the frozen replay.
//
// One chronological pass answers the allocator: the traces' events in the engine's order (session; the bar minutes
// in time order, then the closing print; within a minute the virtual exits, then a pending preemption's sale, then
// the virtual fills, then the rebound decisions — alphabetically under P0, in the priority order under P0R/P1). A
// decision reads only the pool's state at that moment and the last prices of that moment; a pending preemption's sale
// is an event inserted at the incumbent's first trade at or after the decision and resolved there from that trade's
// price. Nothing stored about the future (a trade's later fill, exit or P&L) reaches a decision. A second pass books
// the funded lots in the frozen FixedLedger and marks them where the engine marks them.
import type { Dataset } from '../four-family/data.ts';
import { type DrawdownStats, Tracker } from '../multi-etf-allocator/engine.ts';
import { FixedLedger, type RealLot } from '../multi-etf-allocator/ledger.ts';
import type { VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import {
  type ExecutionPrice,
  type ExitReason,
  firstTradeAfterDecision,
  priceAt,
  secondsPerMinute,
  timeAt
} from '../shared-margin-portfolio/strategy.ts';
import {
  type NDailyRow,
  type NRunResult,
  type NSignalRecord,
  bookOrderOf,
  lotKeysOf,
  tieOrderOf
} from '../portfolio-aware-d1/nbook/engine.ts';
import type { Lot, Prices } from '../portfolio-aware-d1/nbook/ledger.ts';
import { emptyValuesOf, lmvOf, securitiesOf } from '../portfolio-aware-d1/nbook/margin.ts';
import type { ReplayBook, ReplayConfig, ReplayLotSummary, Refusal } from '../portfolio-aware-d1/replay.ts';
import {
  type Allocation,
  type Priority,
  fixedLiquidation,
  p0Allocation,
  preemptionReason,
  priorityPositions
} from './allocation.ts';
import type { PreemptionDecline, PreemptionRecord } from './engine.ts';

export type { ReplayBook };

export interface PReplayConfig extends ReplayConfig {
  allocation?: Allocation;
  // Session indices whose close starts a windowed drawdown (peak reset to the mark at that close), e.g. a fold's
  // last search session: the validation drawdown.
  windowStarts?: readonly number[];
  // P0 diagnostic: every decision refused while a funded lot alone holds the pool, with the rank tests of these
  // rankings and the preemption that P1 would have attempted at that moment (descriptive; never feeds a decision).
  diagnose?: readonly Priority[];
}

export interface PLotSummary extends ReplayLotSummary {
  exitReason: string;
  preemptionId: number; // the preemption that sold it, or 0
  gross: number; // after both frictions, before interest
  liquidationNet: number; // closed: the net; open: the net if sold at the last close after the exit friction
}

export interface OverlapRecord {
  decisionIndex: number;
  decisionTime: number;
  decider: string;
  deciderTradeId: number;
  holder: string;
  holderLotId: number;
  holderTradeId: number;
  heldSessions: number;
  heldDays: number;
  sinceFundedEntryDays: number;
  sameMinute: number;
  higher: Record<string, boolean>; // ranking id → the decider strictly above the holder
  estimatePrice: number;
  estimateNet: number;
  liquidationIndex: number; // the holder's first trade at or after the decision (-1: none before the end)
  liquidationTime: number;
  fillNet: number; // the holder's net at that trade
  holderExitsFirst: boolean; // the holder's own exit comes at or before that trade
  deciderFillsFirst: boolean; // the decider's virtual order fills before that trade
  sameAuctionPrint: boolean; // the decider's fill would be the same auction print as that trade (P1 aborts)
  actionable: Record<string, boolean>; // ranking id → P1 would have sold the holder here (rank, estimate, fill, order)
  // Hindsight (descriptive only; never a decision input): the decider's virtual trade net and the holder lot's
  // remaining net from the decision's estimate to its own exit.
  hindsightDeciderNet: number;
  hindsightHolderNet: number;
}

export interface PReplayResult {
  net: number;
  realized: number;
  unrealized: number;
  interest: number;
  minuteDrawdown: DrawdownStats;
  dailyDrawdown: DrawdownStats;
  marks: Float64Array;
  lots: PLotSummary[];
  decisions: number;
  granted: number;
  refused: number;
  sameMinuteDecisions: number;
  refusals: Refusal[];
  heldSessions: number;
  heldDays: number;
  preemptions: PreemptionRecord[];
  declines: PreemptionDecline[];
  // startExitFriction: the exit friction of a lot open at the window's start close (its liquidation convention)
  windowed: {
    startIndex: number;
    startExitFriction: number;
    minuteDrawdown: DrawdownStats;
    dailyDrawdown: DrawdownStats;
  }[];
  overlaps: OverlapRecord[];
  full?: Omit<NRunResult, 'config' | 'universe'>;
}

interface Event {
  s: number;
  close: 0 | 1;
  t: number;
  phase: 0 | 0.5 | 1 | 2; // exit, preemption sale, fill, decision
  rank: number;
  book: number;
  trade: VirtualTrade;
}

const barTime = (ds: Dataset, s: number, k: number) => ds.bTime[ds.sBarStart[s]! + k]!;

// Own-exit executions priced inside a bar rather than at its open (as ./engine.ts).
const intrabarExecutions = new Set<ExecutionPrice | ''>(['stop level', 'trigger minute close']);

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

// The last price of `ds` at a decision made at the end of the bar starting at T in session s: the close of its
// latest bar at or before T, else the previous session's close (the engine's `lastClose` at that moment).
export const lastPriceAt = (ds: Dataset, s: number, T: number) => {
  const k = lastBarAtOrBefore(ds, s, T);

  return k >= 0 ? ds.bClose[ds.sBarStart[s]! + k]! : ds.sClose[s - 1]!;
};

// The first trade of `ds` at or after a decision time: the same session's first bar at or after it, else its
// closing print if the decision precedes the close, else the next sessions' first trade (as an order carried
// overnight fills). -1 when none exists through endIndex.
export const firstTradeFromDecision = (ds: Dataset, s: number, decisionTime: number, endIndex: number) => {
  for (let index = s; index <= endIndex; index++) {
    const k = firstTradeAfterDecision(ds, index, decisionTime);

    if (k >= 0) {
      return { index, bar: k };
    }
  }

  return undefined;
};

const sameEvent = (a: Pick<Event, 's' | 'close' | 't'>, b: Pick<Event, 's' | 'close' | 't'>) =>
  a.s === b.s && a.close === b.close && a.t === b.t;

const keyLess = (a: Pick<Event, 's' | 'close' | 't' | 'phase'>, b: Pick<Event, 's' | 'close' | 't' | 'phase'>) =>
  a.s - b.s || a.close - b.close || a.t - b.t || a.phase - b.phase;

const eventKeyOf = (ds: Dataset, s: number, k: number, phase: Event['phase']) => {
  const isClose = k >= ds.sBarCount[s]!;

  return { s, close: (isClose ? 1 : 0) as 0 | 1, t: isClose ? 0 : barTime(ds, s, k), phase };
};

export const replayPreemptive = (books: ReplayBook[], config: PReplayConfig): PReplayResult => {
  const { startIndex, endIndex, detail } = config;
  const allocation = config.allocation ?? p0Allocation;
  const policy = allocation.policy;
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
  const positions =
    policy.rankedTies || policy.preemption
      ? priorityPositions(config.symbols, allocation.priority!)
      : new Map<string, number>();
  const ordered = order.map((symbol) => bySymbol.get(symbol)!);
  const anyDs = bySymbol.get(config.symbols[0]!)!.ds;
  const dates = anyDs.dates;
  const sTime = anyDs.sTime;
  const closeTimes = anyDs.sCloseTime;
  const securities = securitiesOf(config.symbols);
  const lotKeys = lotKeysOf(config.symbols);
  const buyPrice = (raw: number) => raw * (1 + config.costBps / 10000);
  const diagnosePositions = (config.diagnose ?? []).map((priority) => ({
    id: priority.rankingId,
    positions: priorityPositions(config.symbols, priority)
  }));

  // ----- the events, in the engine's order -----

  const events: Event[] = [];

  ordered.forEach((book, bookIndex) => {
    const { ds } = book;
    const decisionRank = policy.rankedTies ? positions.get(book.symbol)! : ties.indexOf(book.symbol);

    for (const trade of book.trace.trades) {
      events.push({
        s: trade.decisionIndex,
        close: 0,
        t: barTime(ds, trade.decisionIndex, trade.decisionBar),
        phase: 2,
        rank: decisionRank,
        book: bookIndex,
        trade
      });

      if (trade.entryIndex >= 0) {
        events.push({
          ...eventKeyOf(ds, trade.entryIndex, trade.entryBar, 1),
          rank: bookIndex,
          book: bookIndex,
          trade
        });
      }

      if (trade.exitIndex >= 0) {
        events.push({ ...eventKeyOf(ds, trade.exitIndex, trade.exitBar, 0), rank: bookIndex, book: bookIndex, trade });
      }
    }
  });

  events.sort((a, b) => keyLess(a, b) || a.rank - b.rank);

  // ----- the allocator: one pool, one lot or reservation at a time; P1 preemption -----

  interface ExitOverride {
    s: number;
    bar: number;
    time: number;
    raw: number;
    execution: ExecutionPrice;
    preemptionId: number;
  }

  interface Funded {
    trade: VirtualTrade;
    book: number;
    lotId: number;
    exit?: ExitOverride;
  }

  interface Pending {
    record: PreemptionRecord;
    holding: Funded;
    replacement: { trade: VirtualTrade; book: number };
    sale?: { s: number; bar: number; key: ReturnType<typeof eventKeyOf> };
    signal?: NSignalRecord;
  }

  const funded: Funded[] = [];
  const signalRecords: NSignalRecord[] = [];
  const recordTrades: VirtualTrade[] = [];
  const decisionsAt = new Map<string, number>();
  const refusals: Refusal[] = [];
  const preemptions: PreemptionRecord[] = [];
  const declines: PreemptionDecline[] = [];
  const overlaps: OverlapRecord[] = [];
  const refusedTrades = new Set<VirtualTrade>();
  const ownExitAborts = new Set<number>(); // preemptions aborted after the incumbent's own exit (its virtual is closed)
  let reservation: Funded | undefined;
  let holding: Funded | undefined;
  let pending: Pending | undefined;
  let granted = 0;
  let refused = 0;
  let lastFundedEntry = NaN;

  for (const event of events) {
    if (event.phase === 2) {
      const key = `${event.s}:${event.t}`;

      decisionsAt.set(key, (decisionsAt.get(key) ?? 0) + 1);
    }
  }

  const symbolOf = (book: number) => ordered[book]!.symbol;
  const dsOf = (book: number) => ordered[book]!.ds;

  // The funded lot's shares, principal and interest start, as the ledger will book them.
  const lotLikeOf = (f: Funded) => {
    const ds = dsOf(f.book);
    const price = buyPrice(priceAt(ds, f.trade.entryIndex, f.trade.entryBar));

    return {
      shares: config.principal / price,
      principal: config.principal,
      entryTimestamp: sTime[f.trade.entryIndex]!,
      entryRawPrice: priceAt(ds, f.trade.entryIndex, f.trade.entryBar),
      entryPrice: price,
      entryTime: timeAt(ds, f.trade.entryIndex, f.trade.entryBar)
    };
  };

  const liquidation = (f: Funded, raw: number, s: number) =>
    fixedLiquidation(lotLikeOf(f), raw, sTime[s]!, config.rate, config.costBps);

  const fundReplacement = (outcome: 'executed' | 'superseded') => {
    const p = pending!;

    p.record.outcome = outcome;
    reservation = { trade: p.replacement.trade, book: p.replacement.book, lotId: funded.length + 1 };
    funded.push(reservation);
    p.record.replacementLotId = reservation.lotId;
    pending = undefined;
  };

  const abort = (reason: string) => {
    const p = pending!;

    p.record.outcome = 'aborted';
    p.record.reason = reason;
    refusedTrades.add(p.replacement.trade);

    if (p.signal) {
      p.signal.outcome = 'refused';
      p.signal.reason = `preemption aborted: ${reason}`;
    }

    granted--;
    refused++;
    refusals.push({
      decider: symbolOf(p.replacement.book),
      holder: symbolOf(p.holding.book),
      decisionIndex: p.record.decisionIndex,
      tradeId: p.replacement.trade.id
    });
    pending = undefined;
  };

  // The pending sale at its trade: sold if the net there is at least the threshold, else the switch aborts.
  // The replacement's fill is this very event and the event is an auction print (the closing print, or the opening
  // trade of a session after the decision's): the purchase cannot be contingent on the sale there; the switch aborts.
  const sameAuctionPrint = (key: { s: number; close: 0 | 1; t: number }) => {
    const p = pending!;
    const trade = p.replacement.trade;

    if (trade.entryIndex < 0) {
      return false;
    }

    const fill = eventKeyOf(dsOf(p.replacement.book), trade.entryIndex, trade.entryBar, 1);

    return (
      fill.s === key.s &&
      fill.close === key.close &&
      fill.t === key.t &&
      (fill.close === 1 || (trade.entryBar === 0 && trade.entryIndex > p.record.decisionIndex))
    );
  };

  const sell = () => {
    const p = pending!;
    const { s, bar } = p.sale!;
    const ds = dsOf(p.holding.book);
    const raw = priceAt(ds, s, bar);
    const time = timeAt(ds, s, bar);

    if (sameAuctionPrint(p.sale!.key)) {
      abort(`the sale and ${symbolOf(p.replacement.book)}'s fill would be the same auction print`);
      return;
    }

    const fill = liquidation(p.holding, raw, s);
    const record = p.record;
    const lot = lotLikeOf(p.holding);

    record.executionIndex = s;
    record.executionDate = dates[s]!;
    record.executionTime = time;
    record.executionBar = bar;
    record.executionRawPrice = raw;
    record.executionPrice = fill.price;
    record.executionNet = fill.net;
    record.executionInterest = fill.interest;
    record.executionGross = fill.proceeds - lot.principal;
    record.exitFriction = lot.shares * (raw - fill.price);

    if (!(fill.net >= policy.thresholdDollars)) {
      abort(`the liquidation net at the fill ${fill.net.toFixed(2)} < ${policy.thresholdDollars}`);
      return;
    }

    const isClose = bar >= ds.sBarCount[s]!;

    p.holding.exit = {
      s,
      bar,
      time,
      raw,
      execution: isClose ? 'closing print' : 'first trade after decision',
      preemptionId: record.id
    };
    holding = undefined;
    record.releasedPrincipal = config.principal;
    record.reason = `${symbolOf(p.holding.book)} lot ${p.holding.lotId} sold at ${raw} for net ${fill.net.toFixed(2)}`;
    fundReplacement('executed');
  };

  for (const event of events) {
    if (pending?.sale && keyLess(pending.sale.key, event) < 0) {
      sell();
    }

    if (event.phase === 0) {
      // The incumbent's own exit fills inside its sale bar (a stop level): the sale at the bar's open comes first.
      if (
        pending?.sale &&
        pending.holding.trade === event.trade &&
        intrabarExecutions.has(event.trade.exitExecution) &&
        pending.sale.key.s === event.s &&
        pending.sale.key.close === event.close &&
        pending.sale.key.t === event.t
      ) {
        sell();
      }

      if (holding && holding.trade === event.trade) {
        holding = undefined;

        if (pending && pending.holding.trade === event.trade) {
          if (sameAuctionPrint(event)) {
            ownExitAborts.add(pending.record.id);
            abort(
              `${symbolOf(event.book)}'s own exit and ${symbolOf(pending.replacement.book)}'s fill would be the same auction print`
            );
          } else {
            pending.record.reason = `${symbolOf(event.book)} lot ${pending.holding.lotId} exited first on its own rule (${event.trade.exitReason})`;
            pending.record.releasedPrincipal = config.principal;
            fundReplacement('superseded');
          }
        }
      }

      continue;
    }

    if (event.phase === 1) {
      if (pending && pending.replacement.trade === event.trade) {
        abort(`${symbolOf(event.book)}'s order filled before ${symbolOf(pending.holding.book)} could be sold`);
      }

      if (reservation && reservation.trade === event.trade) {
        holding = reservation;
        reservation = undefined;
        lastFundedEntry = timeAt(dsOf(holding.book), event.trade.entryIndex, event.trade.entryBar);
      }

      continue;
    }

    const parts = [
      ...(holding ? [`${symbolOf(holding.book)} lot ${holding.lotId}`] : []),
      ...(reservation ? [`${symbolOf(reservation.book)} pending order`] : []),
      ...(pending ? [`${symbolOf(pending.replacement.book)} preemption pending`] : [])
    ];
    const label = parts.join('+');
    let grant = parts.length === 0;
    let reason = grant ? '' : `pool occupied (${label})`;
    const book = ordered[event.book]!;
    const decisionTime = event.trade.decisionTime;
    let preempting = false;

    if (holding && !reservation && !pending && (policy.preemption || diagnosePositions.length > 0)) {
      const holder = holding;
      const holderDs = dsOf(holder.book);
      const higher = positions.size > 0 && positions.get(book.symbol)! < positions.get(symbolOf(holder.book))!;
      const estimatePrice = lastPriceAt(holderDs, event.s, event.t);
      const estimate = liquidation(holder, estimatePrice, event.s);
      const lot = lotLikeOf(holder);

      if (diagnosePositions.length > 0) {
        const point = firstTradeFromDecision(holderDs, event.s, decisionTime, endIndex);
        const saleKey = point ? eventKeyOf(holderDs, point.index, point.bar, 0.5) : undefined;
        const fillNet = point ? liquidation(holder, priceAt(holderDs, point.index, point.bar), point.index).net : NaN;
        const holderTrade = holder.trade;
        const holderExitKey =
          holderTrade.exitIndex >= 0 ? eventKeyOf(holderDs, holderTrade.exitIndex, holderTrade.exitBar, 0) : undefined;
        // as P1: an own exit inside the sale bar (a stop level) does not come first; the sale at the open does
        const holderExitsFirst = Boolean(
          holderExitKey &&
          (!saleKey ||
            (keyLess(holderExitKey, saleKey) < 0 &&
              !(sameEvent(holderExitKey, saleKey) && intrabarExecutions.has(holderTrade.exitExecution))))
        );
        const deciderTrade = event.trade;
        const deciderFillKey =
          deciderTrade.entryIndex >= 0
            ? eventKeyOf(book.ds, deciderTrade.entryIndex, deciderTrade.entryBar, 1)
            : undefined;
        const deciderFillsFirst = Boolean(deciderFillKey && (!saleKey || keyLess(deciderFillKey, saleKey) < 0));
        const sameAuction = Boolean(
          saleKey &&
          deciderFillKey &&
          sameEvent(saleKey, deciderFillKey) &&
          (deciderFillKey.close === 1 || (deciderTrade.entryBar === 0 && deciderTrade.entryIndex > event.s))
        );
        const higherBy = Object.fromEntries(
          diagnosePositions.map(({ id, positions: p }) => [id, p.get(book.symbol)! < p.get(symbolOf(holder.book))!])
        );
        const remaining =
          holderTrade.exitIndex >= 0 ? liquidation(holder, holderTrade.exitRawPrice, holderTrade.exitIndex).net : NaN;

        overlaps.push({
          decisionIndex: event.s,
          decisionTime,
          decider: book.symbol,
          deciderTradeId: deciderTrade.id,
          holder: symbolOf(holder.book),
          holderLotId: holder.lotId,
          holderTradeId: holderTrade.id,
          heldSessions: event.s - holderTrade.entryIndex,
          heldDays: (decisionTime - lot.entryTime) / 86400,
          sinceFundedEntryDays: (decisionTime - lastFundedEntry) / 86400,
          sameMinute: decisionsAt.get(`${event.s}:${event.t}`)!,
          higher: higherBy,
          estimatePrice,
          estimateNet: estimate.net,
          liquidationIndex: point?.index ?? -1,
          liquidationTime: point ? timeAt(holderDs, point.index, point.bar) : NaN,
          fillNet,
          holderExitsFirst,
          deciderFillsFirst,
          sameAuctionPrint: sameAuction,
          actionable: Object.fromEntries(
            diagnosePositions.map(({ id }) => [
              id,
              higherBy[id]! &&
                estimate.net >= 0 &&
                Boolean(point) &&
                fillNet >= 0 &&
                !holderExitsFirst &&
                !deciderFillsFirst &&
                !sameAuction
            ])
          ),
          hindsightDeciderNet: deciderTrade.entryIndex >= 0 ? deciderTrade.net : NaN,
          hindsightHolderNet: remaining - estimate.net
        });
      }

      if (policy.preemption) {
        if (!higher) {
          reason = `${reason}; no preemption: ${book.symbol} is not above ${symbolOf(holder.book)} in ${allocation.priority!.rankingId}`;
        } else if (!(estimate.net >= policy.thresholdDollars)) {
          declines.push({
            decisionIndex: event.s,
            decisionTime,
            targetSymbol: book.symbol,
            sourceSymbol: symbolOf(holder.book),
            sourceLotId: holder.lotId,
            estimatePrice,
            estimateNet: estimate.net
          });
          reason = `${reason}; preemption declined: ${symbolOf(holder.book)} lot ${holder.lotId} liquidation net ${estimate.net.toFixed(2)} < ${policy.thresholdDollars}`;
        } else {
          preempting = true;
          grant = true;
          reason = `preemption pending (${symbolOf(holder.book)} lot ${holder.lotId}, estimated net ${estimate.net.toFixed(2)})`;

          const point = firstTradeFromDecision(holderDs, event.s, decisionTime, endIndex);
          const record: PreemptionRecord = {
            id: preemptions.length + 1,
            decisionIndex: event.s,
            decisionDate: dates[event.s]!,
            decisionTime,
            sourceSymbol: symbolOf(holder.book),
            sourceLotId: holder.lotId,
            sourceTradeId: holder.trade.id,
            sourcePosition: positions.get(symbolOf(holder.book))!,
            sourceScore: allocation.priority!.scores?.[symbolOf(holder.book)] ?? null,
            targetSymbol: book.symbol,
            targetTradeId: event.trade.id,
            targetPosition: positions.get(book.symbol)!,
            targetScore: allocation.priority!.scores?.[book.symbol] ?? null,
            heldSessions: event.s - holder.trade.entryIndex,
            heldDays: (decisionTime - lot.entryTime) / 86400,
            estimatePrice,
            estimateNet: estimate.net,
            estimateInterest: estimate.interest,
            threshold: policy.thresholdDollars,
            outcome: 'pending',
            reason: '',
            executionIndex: -1,
            executionDate: '',
            executionTime: NaN,
            executionBar: -1,
            executionRawPrice: NaN,
            executionPrice: NaN,
            executionNet: NaN,
            executionInterest: NaN,
            executionGross: NaN,
            entryFriction: lot.shares * (lot.entryPrice - lot.entryRawPrice),
            exitFriction: NaN,
            releasedPrincipal: 0,
            replacementPrincipal: config.principal,
            replacementLotId: -1,
            incumbentVirtualOpen: true,
            targetVirtualState: 'PENDING_FILL'
          };

          preemptions.push(record);
          pending = {
            record,
            holding: holder,
            replacement: { trade: event.trade, book: event.book },
            ...(point
              ? { sale: { s: point.index, bar: point.bar, key: eventKeyOf(holderDs, point.index, point.bar, 0.5) } }
              : {})
          };
        }
      }
    }

    if (grant) {
      if (!preempting) {
        reservation = { trade: event.trade, book: event.book, lotId: funded.length + 1 };
        funded.push(reservation);
      }

      granted++;
    } else {
      refused++;
      refusedTrades.add(event.trade);
      refusals.push({
        decider: book.symbol,
        holder: holding
          ? symbolOf(holding.book)
          : reservation
            ? symbolOf(reservation.book)
            : symbolOf(pending!.replacement.book),
        decisionIndex: event.s,
        tradeId: event.trade.id
      });
    }

    if (detail) {
      const staleSeconds: Partial<Record<string, number>> = {};

      for (const symbol of config.symbols) {
        const other = bySymbol.get(symbol)!.ds;
        const k = lastBarAtOrBefore(other, event.s, event.t);

        staleSeconds[symbol] =
          decisionTime - (k >= 0 ? barTime(other, event.s, k) + secondsPerMinute : closeTimes[event.s - 1]!);
      }

      const record: NSignalRecord = {
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
        reason,
        sameMinuteCandidates: decisionsAt.get(`${event.s}:${event.t}`)!,
        occupiedBy: label,
        equityAtDecision: NaN,
        principal: config.principal,
        regTMaximum: NaN,
        houseMaximum: NaN,
        maximumU50: NaN,
        maximumU60: NaN,
        maximumL60: NaN,
        maximumG60: NaN,
        staleSeconds
      };

      signalRecords.push(record);
      recordTrades.push(event.trade);

      if (preempting) {
        pending!.signal = record;
      }
    }
  }

  // A sale due after the last event, then a preemption still pending when the data end.
  if (pending?.sale) {
    sell();
  }

  if (pending) {
    abort('the data end before the incumbent could be sold');
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
  const windowStarts = [...new Set(config.windowStarts ?? [])].sort((a, b) => a - b);
  const windowed: { startIndex: number; startExitFriction: number; minute: Tracker; daily: Tracker }[] = [];
  let next = 0; // the next funded trade to open
  let open: { lot: RealLot; f: Funded; ds: Dataset } | undefined;
  let heldSessions = 0;

  marks[startIndex] = 0;

  for (const index of windowStarts) {
    if (!(index > startIndex && index < endIndex)) {
      throw new Error(`replay: a window cannot start at session ${index}`);
    }
  }

  const minuteUpdate = (value: number, time: number) => {
    minuteTracker.updateStrict(value, time);

    for (const window of windowed) {
      window.minute.updateStrict(value, time);
    }
  };

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

  const exitIndexOf = (f: Funded) => (f.exit ? f.exit.s : f.trade.exitIndex);
  const exitBarOf = (f: Funded) => (f.exit ? f.exit.bar : f.trade.exitBar);

  const closeLot = (s: number) => {
    const { lot, f } = open!;
    const trade = f.trade;

    if (f.exit) {
      ledger.closeLot(lot, {
        index: s,
        bar: f.exit.bar,
        time: f.exit.time,
        rawPrice: f.exit.raw,
        reason: preemptionReason as ExitReason,
        execution: f.exit.execution,
        sessionTime: sTime[s]!,
        extraSlippage: 0
      });
    } else {
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
    }

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

  // The next funded lot fills in session s at a bar starting at T (a replacement bought in the minute its
  // incumbent was sold, or after an own exit that superseded a preemption: the engine marks that minute once).
  const fillsAtTime = (s: number, T: number) => {
    const candidate = funded[next];
    const k = fillsAt(candidate, s);

    return k >= 0 && k < dsOf(candidate!.book).sBarCount[s]! && barTime(dsOf(candidate!.book), s, k) === T;
  };

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
    if (open && exitIndexOf(open.f) === s) {
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

    minuteUpdate(ledger.realized + unrealized, closeTimes[s]!);
    equityTracker.updateStrict(ledger.realized + unrealized, sTime[s]!);

    for (const window of windowed) {
      window.daily.updateStrict(ledger.realized + unrealized, sTime[s]!);
    }

    marks[s] = ledger.realized + unrealized;

    if (windowStarts.includes(s)) {
      const close = open ? open.ds.sClose[s]! : 0;

      windowed.push({
        startIndex: s,
        startExitFriction: open ? open.lot.shares * close - open.lot.shares * ledger.sellPrice(close) : 0,
        minute: new Tracker(marks[s]!, closeTimes[s]!),
        daily: new Tracker(marks[s]!, sTime[s]!)
      });
    }

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
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const exitBar = exitIndexOf(f) === s ? exitBarOf(f) : Infinity;

    for (let k = from; k < count; k++) {
      const T = ds.bTime[start + k]!;

      if (k === exitBar) {
        closeLot(s);

        if (!fillsAtTime(s, T)) {
          minuteUpdate(ledger.realized, T);
        }

        return;
      }

      minuteUpdate(ledger.realized + markLot(lot, ds.bClose[start + k]!, s, T), T);
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

  // The incumbent book's virtual position at the resolution: still open unless its own exit superseded the switch.
  // The replacement lot exists only if its order filled before the end.
  for (const record of preemptions) {
    record.incumbentVirtualOpen = record.outcome !== 'superseded' && !ownExitAborts.has(record.id);
    record.targetVirtualState = '';

    if (!ledger.lots.some((lot) => lot.id === record.replacementLotId)) {
      record.replacementLotId = -1;
    }
  }

  const unrealizedAtEnd = ledger.open.reduce((total, lot) => total + lot.net, 0);
  const preemptionOf = new Map(funded.filter((f) => f.exit).map((f) => [f.trade, f.exit!.preemptionId]));
  const lots: PLotSummary[] = ledger.lots.map((lot) => ({
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
    open: lot.exitIndex < 0,
    exitReason: lot.exitReason,
    preemptionId: preemptionOf.get(lot.trade) ?? 0,
    gross: lot.gross,
    liquidationNet:
      lot.exitIndex >= 0
        ? lot.net
        : fixedLiquidation(lot, lot.exitRawPrice, lastSessionTime, config.rate, config.costBps).net
  }));
  const heldDays = ledger.lots.reduce(
    (total, lot) =>
      total + ((lot.exitIndex >= 0 ? sTime[lot.exitIndex]! : lastSessionTime) - lot.entryTimestamp) / 86400,
    0
  );
  const result: PReplayResult = {
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
    heldDays,
    preemptions,
    declines,
    windowed: windowed.map((window) => ({
      startIndex: window.startIndex,
      startExitFriction: window.startExitFriction,
      minuteDrawdown: window.minute.stats(),
      dailyDrawdown: window.daily.stats()
    })),
    overlaps
  };

  if (detail) {
    const fundedTrades = new Set(funded.map((f) => f.trade));
    const labelled = new Map<VirtualTrade, VirtualTrade>();
    const trades = ordered.flatMap((book) =>
      book.trace.trades.map((trade) => {
        const lot = lotOf.get(trade);
        const copy = {
          ...trade,
          allocator: fundedTrades.has(trade) && !refusedTrades.has(trade) ? 'granted' : 'refused',
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
    const unfilled = reservation;

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
      reservationsAtEnd: unfilled
        ? [
            {
              symbol: ordered[unfilled.book]!.symbol,
              principal: config.principal,
              decisionTime: unfilled.trade.decisionTime
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

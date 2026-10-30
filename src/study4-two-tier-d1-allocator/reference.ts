// Study 4 — the independent REFERENCE ENGINE (oracle) of the two-tier one-slot pool
// (research/study4-two-tier-d1-allocator/ENGINE_CONTRACT.md, revision 2; PROTOCOL.md §6).
//
// Written from the contract alone, without the fast trace replay's code. It does not replay traces: it drives live
// frozen ShadowBooks (src/multi-etf-allocator/shadow.ts) minute by minute over the merged timeline of every book's
// symbol, in the frozen N-book engine's per-bar order (src/portfolio-aware-d1/nbook/engine.ts runNAllocator): per
// session beginSession; per bar time all virtual exits, then all virtual fills, then every completed minute's rebound
// test (signals collected, then answered in priority order); at the close the closing-print exits and fills; then
// afterSession; finish at the end. Every book commits every signal (shadow semantics: commit(signal, s, label), the
// label never changes the book). The pool state machine, policies, gates, switches and the ledger are this file's own
// code; only the frozen helpers firstTradeAfterDecision, priceAt, timeAt, computeReferenceHighs, Tracker and
// ShadowBook are shared.
//
// Event order at one bar time T (contract §3, with this engine's phase names):
//   phase 0  virtual exits of every book (book order); a funded consequence happens here unless the exit is intrabar
//   phase 1  due switch events: a switch sale, a mirror purchase, an orphan's sale, a reset carry sale
//   phase 1b funded consequences of intrabar virtual exits ('stop level', 'trigger minute close'), which happen
//            inside the bar after its opening trade (the intrabar exception)
//   phase 2  virtual fills (book order), funding a reservation
//   phase 3  P4 minute checks of the minute starting at T, then the decisions stamped T + 60 s in priority order
//   marks    once, if the bar time touched the funded lot (frozen convention)
// At the close: the P4 deadline, closing-print exits, closing-print switch events, closing-print fills, the annual
// reset, afterSession, then the close mark.
//
// AMBIGUITIES RESOLVED (most literal reading chosen; every one is a convention of this oracle):
//  A1  Book order for exits and fills (§3 "book order") = the decision priority order (tier mode: deep by symbol then
//      id, then shallow by shallowRank, symbol, id; frozen mode: alphabetical by symbol). It decides only labels when a
//      shallow lot's own exit and the deep trade's exit share a bar time under SALE (deep first → stale-before-sale).
//  A2  granted/refused: a switch that starts (SALE, WAIT, LATE) and a reservation cancel count as granted at the
//      decision; declined / declined-filter are refused; every aborted* outcome converts the grant into a refusal (as
//      the legacy replay does); stale-*, pending-at-end and a P2L replacement dropped by a reset stay granted. A
//      cancelled shallow reservation keeps its own grant.
//  A3  Switch records exist only for deep decisions (active book, non-P0 policy in force) that meet a plain
//      HELD(shallow lot) or RESERVED(shallow order). A deep decision during SALE/BUY/WAIT/LATE, or against a lot with
//      a pending orphan or reset sale, is refused without a record. Under P2L a shallow reservation is not cancelled:
//      the deep decision is refused and recorded 'declined'.
//  A4  Decision-test estimate: shares × p × (1 − c) − principal − interest (task formula, left-to-right). The fill
//      test uses the booked sale net shares × (raw × (1 − c)) − principal − interest, and the booked net is asserted
//      equal to it. P4's recovery check uses the estimate formula at the minute's close.
//  A5  The P3 deep-path filter applies only to P3 (contract wording; EXPERIMENT_MATRIX lists filters only under P3),
//      and is tested before the budget: a non-deep setup is 'declined-filter' whatever its estimate.
//  A6  P0M late funding (LATE, then the lot's own exit, then a purchase) is labelled 'superseded'. Outcome labels are
//      final states: a purchase cancelled after a sale or an own exit is 'stale-replacement' (sale* fields keep the
//      fill that freed the slot); a purchase made after a sale is 'executed', after an own exit 'superseded'.
//  A7  sale* fields describe a fill that freed the slot (forced sale or own exit); aborted* records keep -1/NaN even
//      when an own exit freed the slot (P2L own-exit auction abort). purchase* fields describe the replacement's fill
//      (mirror, exact or orphan purchase; P2L: the deep order's own fill when it happens in the window).
//  A8  Orphan mirror: the lot is sold at the deep symbol's next print after the purchase print: the next bar, else that
//      session's closing print if it exists, else the next session's first trade (not the +60 s decision rule).
//  A9  P4 deadline: at the start of the close processing of session (decision session + D) a still-waiting switch
//      becomes a SALE at the next session's first trade, so a closing-print exit of that session counts against the
//      SALE (own exit → superseded; deep exit → stale-before-sale), not the WAIT. A recovery sale fills at
//      firstTradeAfterDecision(shallow, s, minute end) carried to later sessions; checks run on shallow bars starting
//      after the decision bar, in sessions up to the deadline session.
//  A10 End of window: SALE/WAIT/LATE leave the lot held (marked at the last close) → 'pending-at-end'; BUY →
//      'pending-at-end' (purchase cancelled); P2L SALE still pending → 'aborted' (legacy rule); a reservation (also a
//      P2L replacement) stays a reported reservation.
//  A11 Reset: pending SALE/BUY/WAIT/LATE switch records become 'pending-at-end'. The reset sale has exitReason
//      'annual-reset' (also for the non-executable sClose mark of a session without a closing print; exitBar = bar
//      count). A lot filled at that very closing print is detached from its virtual trade and sold at the next
//      session's first trade of its symbol (phase 1); until then the pool is HELD and refuses decisions.
//  A12 The purchase is at or before the deep trade's virtual fill only if it lands on the fill's bar (purchase decision
//      time ≥ deep decision time + 60 s, fills monotone): then it is the exact lot. If it would ever come earlier than
//      the virtual fill (unreachable on minute-aligned bars) the purchase waits for the virtual fill as an exact lot.
//  A13 G2 reference high = computeReferenceHighs(ds, L) with firstIndex 0 (the D1 machine's own level); the last price
//      is the latest bar of the deep symbol starting at or before the decision bar's start, else sClose[s − 1].
//      G1/G1d read the live machine: a setup (armed or pending) with activationTime ≤ the decision time.
//  A14 Inactive books (outside activeFrom..activeTo) still commit their signals (traces unchanged) but are not
//      offered, not counted and not counted by G1/G1d/G2. The policy in force for a decision is the last schedule
//      entry with from ≤ the decision session (else config.policy); a switch keeps the policy it started under.
//  A15 Ownership identity: books sharing a symbol must share its dataset (same id); calendars (sTime) must be
//      identical; tieMode 'frozen' requires distinct symbols. Policy latency must be > 0 s.
//  A16 Exit classification (the contract's lists are not exhaustive): intrabar = execution 'stop level' or 'trigger
//      minute close'; own-print trigger = reason 'trailing stop gap' or execution 'minute open through stop'; every
//      other exit (including the next-open trailing stop's 'first trade after decision' fill and the pending
//      buffered loss at the opening trade) has a trigger known before its print, so at a sale's print it supersedes
//      the sale and at a purchase's print it makes the purchase stale.
//  A17 The minute tracker starts at the first bar of session startIndex of books[0].ds, and close marks use
//      books[0].ds.sCloseTime (as the frozen replay uses its first symbol's calendar).
//  A18 (added by the study lead after the fast-vs-reference comparison, amendment A3; the only change to this file
//      after its author's hand-back): a deep exit at a pending sale's own print whose trigger is that print (gap stop,
//      minute open through the stop) does not cancel the sale — the order is already out (contract §5.3: "ends
//      before the sale's event"); the purchase then finds the deep trade ended (stale-replacement). The author's
//      version cancelled the sale, using the print's information (the sale-side twin of review finding R2-1).
import type { Dataset } from '../four-family/data.ts';
import { computeReferenceHighs } from '../four-family/data.ts';
import type { PhenotypeName, Sym } from '../multi-etf-allocator/context.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { ShadowBook, type VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import {
  type ExitDecision,
  type ReboundSignal,
  type StrategyParams,
  firstTradeAfterDecision,
  priceAt,
  timeAt
} from '../shared-margin-portfolio/strategy.ts';

export interface RefPolicy {
  kind: 'P0' | 'P0M' | 'P1' | 'P2' | 'P3' | 'P4';
  budget: number;
  filter: 'any' | 'deep';
  deadline: number;
  gate: 'G0' | 'G1' | 'G1d' | 'G2';
  lambda: number;
  replacement: 'mirror' | 'legacy';
  latency: number;
}

export interface RefBook {
  id: string;
  symbol: string;
  tier: 'deep' | 'shallow';
  ds: Dataset;
  params: StrategyParams;
  shallowRank?: number;
  activeFrom?: number;
  activeTo?: number;
}

export interface RefConfig {
  startIndex: number;
  endIndex: number;
  armStart: number;
  principal: number;
  rate: number;
  costBps: number;
  stopSlippageBps: number;
  stopFill: 'stop' | 'next-open';
  policy: RefPolicy;
  policySchedule?: { from: number; policy: RefPolicy }[];
  tieMode: 'tier' | 'frozen';
  resets?: number[];
}

export interface RefLot {
  bookId: string;
  tradeId: number;
  kind: 'exact' | 'mirror' | 'orphan';
  entryIndex: number;
  entryBar: number;
  entryRawPrice: number;
  exitIndex: number;
  exitBar: number;
  exitRawPrice: number;
  exitReason: string;
  shares: number;
  interest: number;
  net: number;
}

export type RefOutcome =
  | 'executed'
  | 'superseded'
  | 'declined'
  | 'declined-filter'
  | 'aborted'
  | 'aborted-replacement-first'
  | 'aborted-auction'
  | 'cancelled-reservation'
  | 'stale-replacement'
  | 'stale-before-sale'
  | 'stale-wait'
  | 'pending-at-end';

export interface RefSwitch {
  decisionIndex: number;
  decisionTime: number;
  deepBookId: string;
  deepTradeId: number;
  shallowBookId: string;
  outcome: RefOutcome;
  saleIndex: number;
  saleBar: number;
  saleRawPrice: number;
  purchaseIndex: number;
  purchaseBar: number;
  purchaseRawPrice: number;
}

export interface RefDrawdown {
  maximum: number;
  peakTime: number;
  troughTime: number;
}

export interface RefResult {
  lots: RefLot[];
  switches: RefSwitch[];
  net: number;
  realized: number;
  minuteDrawdown: RefDrawdown;
  dailyDrawdown: RefDrawdown;
  marks: Float64Array;
  decisions: number;
  granted: number;
  refused: number;
}

// ----- internal state -----

interface Point {
  s: number; // session
  k: number; // bar index; the bar count = the closing print
}

interface Member {
  ref: RefBook;
  book: ShadowBook;
  symbol: string;
  ds: Dataset;
  tier: 'deep' | 'shallow';
}

interface Holding {
  member: Member; // the book whose virtual trade the lot funds
  trade: VirtualTrade;
  ds: Dataset;
  symbol: string;
  shares: number;
  record: RefLot;
  forced?: { at: Point | undefined; reason: string }; // orphan or reset carry: sold at `at`, detached from its trade
}

interface Switch {
  record: RefSwitch;
  policy: RefPolicy;
  legacy: boolean; // P2L mechanics
  deep: Member;
  trade: VirtualTrade; // the deep decision's virtual trade
  threshold: number | undefined; // fill-test threshold; undefined: market order
  decisionBarStart: number;
  deadline: number; // P4: the last session of the wait
  freedBy: 'sale' | 'own' | undefined;
}

type Pool =
  | { tag: 'IDLE' }
  | { tag: 'RESERVED'; member: Member; trade: VirtualTrade; sw: Switch | undefined }
  | { tag: 'HELD'; lot: Holding }
  | { tag: 'SALE'; lot: Holding; sw: Switch; at: Point | undefined }
  | { tag: 'BUY'; sw: Switch; at: Point | undefined; orphan: boolean }
  | { tag: 'WAIT'; lot: Holding; sw: Switch }
  | { tag: 'LATE'; lot: Holding; sw: Switch };

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const isIntrabar = (d: ExitDecision) => d.execution === 'stop level' || d.execution === 'trigger minute close';

// The exit's trigger is the print itself (a purchase at that print cannot have known it).
const isOwnPrintTrigger = (d: ExitDecision) =>
  d.reason === 'trailing stop gap' || d.execution === 'minute open through stop';

const isStopReason = (reason: string) => reason === 'trailing stop' || reason === 'trailing stop gap';

export const runReference = (books: RefBook[], config: RefConfig): RefResult => {
  const { startIndex, endIndex, armStart, principal, rate, costBps, stopSlippageBps } = config;

  if (books.length === 0) {
    throw new Error('reference: no books');
  }

  const cal = books[0]!.ds;

  if (!(startIndex >= 0 && startIndex < endIndex && armStart >= startIndex && endIndex < cal.sessionCount)) {
    throw new Error(`reference: bad window ${startIndex}..${endIndex}, arming ${armStart}`);
  }

  // ----- members, datasets, orders -----

  const datasetBySymbol = new Map<string, Dataset>();
  const ids = new Set<string>();

  for (const book of books) {
    if (ids.has(book.id)) {
      throw new Error(`reference: duplicate book id ${book.id}`);
    }

    ids.add(book.id);

    if (book.ds.sessionCount !== cal.sessionCount) {
      throw new Error(`reference: ${book.id} has another calendar`);
    }

    for (let s = 0; s < cal.sessionCount; s++) {
      if (book.ds.sTime[s] !== cal.sTime[s]) {
        throw new Error(`reference: ${book.id} has another calendar at session ${s}`);
      }
    }

    const known = datasetBySymbol.get(book.symbol);

    if (known && known !== book.ds && (known.id !== book.ds.id || known.barCount !== book.ds.barCount)) {
      throw new Error(`reference: two datasets for ${book.symbol}`);
    }

    if (!known) {
      datasetBySymbol.set(book.symbol, book.ds);
    }
  }

  if (config.tieMode === 'frozen' && datasetBySymbol.size !== books.length) {
    throw new Error('reference: frozen-tie mode needs distinct symbols');
  }

  const members: Member[] = books.map((ref) => ({
    ref,
    symbol: ref.symbol,
    ds: datasetBySymbol.get(ref.symbol)!,
    tier: ref.tier,
    book: new ShadowBook(
      ref.symbol as Sym,
      ref.id as PhenotypeName,
      datasetBySymbol.get(ref.symbol)!,
      ref.params,
      { notional: principal, rate, stopFill: config.stopFill, costBps, stopSlippageBps },
      armStart
    )
  }));
  const bySymbolThenId = (a: Member, b: Member) => compareText(a.symbol, b.symbol) || compareText(a.ref.id, b.ref.id);
  const rankOf = (m: Member) => m.ref.shallowRank ?? Infinity;
  const ordered: Member[] =
    config.tieMode === 'frozen'
      ? [...members].sort(bySymbolThenId)
      : [
          ...members.filter((m) => m.tier === 'deep').sort(bySymbolThenId),
          ...members
            .filter((m) => m.tier === 'shallow')
            .sort((a, b) => (rankOf(a) === rankOf(b) ? 0 : rankOf(a) < rankOf(b) ? -1 : 1) || bySymbolThenId(a, b))
        ];
  const deepMembers = ordered.filter((m) => m.tier === 'deep');
  const symbols = [...datasetBySymbol.keys()];
  const symbolDatasets = symbols.map((symbol) => datasetBySymbol.get(symbol)!);
  const referenceHighs = new Map<Member, Float64Array>();

  for (const m of deepMembers) {
    referenceHighs.set(m, computeReferenceHighs(m.ds, m.ref.params.tickWindowSize));
  }

  const schedule = [...(config.policySchedule ?? [])].sort((a, b) => a.from - b.from);

  for (const policy of [config.policy, ...schedule.map((entry) => entry.policy)]) {
    if (!(policy.latency > 0) || !(policy.deadline >= 0) || !(policy.budget >= 0)) {
      throw new Error(`reference: bad policy ${JSON.stringify(policy)}`);
    }
  }
  const policyAt = (s: number) => {
    let policy = config.policy;

    for (const entry of schedule) {
      if (entry.from <= s) {
        policy = entry.policy;
      }
    }

    return policy;
  };
  const isActive = (m: Member, s: number) => (m.ref.activeFrom ?? -Infinity) <= s && s <= (m.ref.activeTo ?? Infinity);
  const resets = new Set(config.resets ?? []);

  // ----- ledger -----

  const c = costBps / 10000;
  const slip = stopSlippageBps / 10000;
  const sTime = cal.sTime;
  const interestOf = (entryIndex: number, s: number) =>
    principal * rate * ((sTime[s]! - sTime[entryIndex]!) / (365 * 86400));
  const lots: RefLot[] = [];
  const switches: RefSwitch[] = [];
  let realized = 0;
  let lotEventNow = false; // a lot opened or closed at the current bar time
  let decisions = 0;
  let granted = 0;
  let refused = 0;
  let pool: Pool = { tag: 'IDLE' };

  const openHolding = (member: Member, trade: VirtualTrade, kind: RefLot['kind'], s: number, k: number): Holding => {
    const ds = member.ds;
    const raw = priceAt(ds, s, k);
    const entryPrice = raw * (1 + c);
    const shares = principal / entryPrice;
    const record: RefLot = {
      bookId: member.ref.id,
      tradeId: trade.id,
      kind,
      entryIndex: s,
      entryBar: k,
      entryRawPrice: raw,
      exitIndex: -1,
      exitBar: -1,
      exitRawPrice: NaN,
      exitReason: 'open',
      shares,
      interest: 0,
      net: 0
    };

    lots.push(record);
    lotEventNow = true;

    return { member, trade, ds, symbol: member.symbol, shares, record };
  };

  const closeHolding = (lot: Holding, s: number, k: number, raw: number, reason: string, isStop: boolean) => {
    const exitPrice = raw * (1 - c) * (isStop ? 1 - slip : 1);
    const interest = interestOf(lot.record.entryIndex, s);
    const net = lot.shares * exitPrice - principal - interest;

    lot.record.exitIndex = s;
    lot.record.exitBar = k;
    lot.record.exitRawPrice = raw;
    lot.record.exitReason = reason;
    lot.record.interest = interest;
    lot.record.net = net;
    realized += net;
    lotEventNow = true;

    return net;
  };

  const markOf = (lot: Holding, price: number, s: number) =>
    lot.shares * price - principal - interestOf(lot.record.entryIndex, s);

  const estimateOf = (lot: Holding, price: number, s: number) =>
    lot.shares * price * (1 - c) - principal - interestOf(lot.record.entryIndex, s);

  // ----- small helpers -----

  const barTimeOf = (ds: Dataset, s: number, k: number) => ds.bTime[ds.sBarStart[s]! + k]!;

  // The first trade at or after a decision time (frozen rule), carried to later sessions' first trade.
  const firstTradeOnOrAfter = (ds: Dataset, s: number, time: number): Point | undefined => {
    for (let i = s; i <= endIndex; i++) {
      const k = firstTradeAfterDecision(ds, i, time);

      if (k >= 0) {
        return { s: i, k };
      }
    }

    return undefined;
  };

  // The next print after the one at (s, k): the next bar, else the closing print, else the next session's first trade.
  const nextPrintAfter = (ds: Dataset, s: number, k: number): Point | undefined => {
    const count = ds.sBarCount[s]!;

    if (k + 1 < count) {
      return { s, k: k + 1 };
    }

    if (k < count && !Number.isNaN(ds.sClosingPrint[s]!)) {
      return { s, k: count };
    }

    return s + 1 <= endIndex ? { s: s + 1, k: 0 } : undefined;
  };

  const heldLot = (): Holding | undefined =>
    pool.tag === 'HELD' || pool.tag === 'SALE' || pool.tag === 'WAIT' || pool.tag === 'LATE' ? pool.lot : undefined;

  const pendingSwitch = (): Switch | undefined =>
    pool.tag === 'SALE' || pool.tag === 'BUY' || pool.tag === 'WAIT' || pool.tag === 'LATE' ? pool.sw : undefined;

  const abortSwitch = (sw: Switch, outcome: RefOutcome) => {
    sw.record.outcome = outcome;
    granted--;
    refused++;
  };

  const lastClose = new Map<string, number>();

  // The deep book's own order for the switch's trade fills at this very print (P2L).
  const replacementFillsAt = (sw: Switch, s: number, isClose: boolean, T: number) => {
    const order = sw.deep.book.order;

    if (!order || order.trade !== sw.trade || order.fillBar < 0) {
      return false;
    }

    const count = sw.deep.ds.sBarCount[s]!;

    return isClose ? order.fillBar === count : order.fillBar < count && barTimeOf(sw.deep.ds, s, order.fillBar) === T;
  };

  const isAuctionFill = (sw: Switch, s: number, isClose: boolean) =>
    isClose || (sw.deep.book.order!.fillBar === 0 && s > sw.record.decisionIndex);

  // The slot is free after a sale or an own exit at (s, k) of `ds`: the replacement is decided (§5.4, §5.5).
  const afterRelease = (sw: Switch, ds: Dataset, s: number, k: number, raw: number, by: 'sale' | 'own') => {
    sw.freedBy = by;

    if (sw.legacy) {
      const isClose = k >= ds.sBarCount[s]!;

      if (by === 'own' && replacementFillsAt(sw, s, isClose, isClose ? NaN : barTimeOf(ds, s, k))) {
        if (isAuctionFill(sw, s, isClose)) {
          abortSwitch(sw, 'aborted-auction');
          pool = { tag: 'IDLE' };
          return;
        }
      }

      sw.record.saleIndex = s;
      sw.record.saleBar = k;
      sw.record.saleRawPrice = raw;
      sw.record.outcome = by === 'sale' ? 'executed' : 'superseded';
      pool = { tag: 'RESERVED', member: sw.deep, trade: sw.trade, sw };
      return;
    }

    sw.record.saleIndex = s;
    sw.record.saleBar = k;
    sw.record.saleRawPrice = raw;

    // A18: the deep trade already ended (at the print that freed the slot): no purchase
    if (sw.trade.exitIndex >= 0) {
      sw.record.outcome = 'stale-replacement';
      pool = { tag: 'IDLE' };
      return;
    }

    const decided = timeAt(ds, s, k) + sw.policy.latency;

    pool = { tag: 'BUY', sw, at: firstTradeOnOrAfter(sw.deep.ds, s, decided), orphan: false };
  };

  // ----- funded consequences of book events -----

  const onVirtualExit = (trade: VirtualTrade, s: number, d: ExitDecision, intrabarPhase: boolean) => {
    const lot = heldLot();

    // The funded lot's own virtual trade exits.
    if (lot && lot.trade === trade && !lot.forced) {
      closeHolding(lot, s, d.barIndex, d.price, d.reason, isStopReason(d.reason));

      if (pool.tag === 'HELD') {
        pool = { tag: 'IDLE' };
      } else {
        // SALE, WAIT (supersession) or LATE (late funding): the replacement follows from the own exit's fill.
        afterRelease(pendingSwitch()!, lot.ds, s, d.barIndex, d.price, 'own');
      }

      return;
    }

    // The deep trade of a pending switch exits.
    const sw = pendingSwitch();

    if (!sw || sw.trade !== trade) {
      return;
    }

    switch (pool.tag) {
      case 'SALE':
        // A18: a deep exit at the sale's own print whose trigger is that print does not cancel the sale (the order is
        // already out; contract §5.3 "ends before the sale's event", amendment A3)
        if (
          !intrabarPhase &&
          pool.at &&
          pool.at.s === s &&
          isOwnPrintTrigger(d) &&
          timeAt(pool.lot.ds, pool.at.s, pool.at.k) === timeAt(sw.deep.ds, s, d.barIndex)
        ) {
          return;
        }

        sw.record.outcome = 'stale-before-sale';
        pool = { tag: 'HELD', lot: pool.lot };
        return;
      case 'WAIT':
        sw.record.outcome = 'stale-wait';
        pool = { tag: 'HELD', lot: pool.lot };
        return;
      case 'LATE':
        sw.record.outcome = 'stale-replacement';
        pool = { tag: 'HELD', lot: pool.lot };
        return;
      case 'BUY':
        if (!intrabarPhase && pool.at && pool.at.s === s && pool.at.k === d.barIndex && isOwnPrintTrigger(d)) {
          pool.orphan = true; // the purchase at this print executes, then the lot is sold at the next print
        } else {
          sw.record.outcome = 'stale-replacement';
          pool = { tag: 'IDLE' };
        }
        return;
      default:
        return;
    }
  };

  const onVirtualFill = (member: Member, trade: VirtualTrade, s: number, k: number) => {
    if (pool.tag === 'RESERVED' && pool.trade === trade) {
      const lot = openHolding(member, trade, 'exact', s, k);

      if (pool.sw) {
        pool.sw.record.purchaseIndex = s;
        pool.sw.record.purchaseBar = k;
        pool.sw.record.purchaseRawPrice = lot.record.entryRawPrice;

        if (!pool.sw.legacy) {
          pool.sw.record.outcome = pool.sw.freedBy === 'sale' ? 'executed' : 'superseded';
        }
      }

      pool = { tag: 'HELD', lot };
      return;
    }

    if (pool.tag === 'SALE' && pool.sw.legacy && pool.sw.trade === trade) {
      abortSwitch(pool.sw, 'aborted-replacement-first');
      pool = { tag: 'HELD', lot: pool.lot };
    }
  };

  // ----- due switch events at a print -----

  const resolveSale = (lot: Holding, sw: Switch, s: number, k: number) => {
    const ds = lot.ds;
    const isClose = k >= ds.sBarCount[s]!;
    const raw = priceAt(ds, s, k);

    if (sw.legacy && replacementFillsAt(sw, s, isClose, isClose ? NaN : barTimeOf(ds, s, k))) {
      if (isAuctionFill(sw, s, isClose)) {
        abortSwitch(sw, 'aborted-auction');
        pool = { tag: 'HELD', lot };
        return;
      }
    }

    let tested = NaN;

    if (sw.threshold !== undefined) {
      tested = lot.shares * (raw * (1 - c)) - principal - interestOf(lot.record.entryIndex, s);

      if (!(tested >= sw.threshold)) {
        abortSwitch(sw, 'aborted');
        pool = { tag: 'HELD', lot };
        return;
      }
    }

    const net = closeHolding(lot, s, k, raw, 'priority_preemption', false);

    if (sw.threshold !== undefined && net !== tested) {
      throw new Error(`reference: booked sale net ${net} differs from the tested net ${tested}`);
    }

    afterRelease(sw, ds, s, k, raw, 'sale');
  };

  const resolvePurchase = (sw: Switch, orphan: boolean, s: number, k: number) => {
    const member = sw.deep;
    const outcome: RefOutcome = sw.freedBy === 'sale' ? 'executed' : 'superseded';

    if (orphan) {
      const lot = openHolding(member, sw.trade, 'orphan', s, k);

      lot.forced = { at: nextPrintAfter(member.ds, s, k), reason: 'orphan-mirror' };
      sw.record.purchaseIndex = s;
      sw.record.purchaseBar = k;
      sw.record.purchaseRawPrice = lot.record.entryRawPrice;
      sw.record.outcome = outcome;
      pool = { tag: 'HELD', lot };
      return;
    }

    let kind: RefLot['kind'] = 'mirror';

    if (sw.trade.entryIndex < 0) {
      const order = member.book.order;

      if (order && order.trade === sw.trade && order.fillBar === k) {
        kind = 'exact'; // the purchase is at the deep trade's own fill print
      } else {
        pool = { tag: 'RESERVED', member, trade: sw.trade, sw }; // (A12) unreachable on minute-aligned bars
        return;
      }
    }

    const lot = openHolding(member, sw.trade, kind, s, k);

    sw.record.purchaseIndex = s;
    sw.record.purchaseBar = k;
    sw.record.purchaseRawPrice = lot.record.entryRawPrice;
    sw.record.outcome = outcome;
    pool = { tag: 'HELD', lot };
  };

  // Every switch event due at this print (bar time T, or the close when `closing`), in state order.
  const runDueEvents = (s: number, barOf: (symbol: string, ds: Dataset) => number | undefined) => {
    for (let guard = 0; guard < 16; guard++) {
      let at: Point | undefined;
      let ds: Dataset;
      let symbol: string;

      if (pool.tag === 'SALE') {
        at = pool.at;
        ds = pool.lot.ds;
        symbol = pool.lot.symbol;
      } else if (pool.tag === 'BUY') {
        at = pool.at;
        ds = pool.sw.deep.ds;
        symbol = pool.sw.deep.symbol;
      } else if (pool.tag === 'HELD' && pool.lot.forced) {
        at = pool.lot.forced.at;
        ds = pool.lot.ds;
        symbol = pool.lot.symbol;
      } else {
        return;
      }

      const k = barOf(symbol, ds);

      if (!at || at.s !== s || k === undefined || at.k !== k) {
        return;
      }

      if (pool.tag === 'SALE') {
        resolveSale(pool.lot, pool.sw, s, k);
      } else if (pool.tag === 'BUY') {
        resolvePurchase(pool.sw, pool.orphan, s, k);
      } else if (pool.tag === 'HELD') {
        const lot = pool.lot;

        closeHolding(lot, s, k, priceAt(ds, s, k), lot.forced!.reason, false);
        pool = { tag: 'IDLE' };
      }
    }

    throw new Error('reference: switch events do not settle');
  };

  // ----- gates (shallow decisions) -----

  const gateRefuses = (policy: RefPolicy, s: number, decisionTime: number) => {
    if (policy.gate === 'G0') {
      return false;
    }

    for (const m of deepMembers) {
      if (!isActive(m, s)) {
        continue;
      }

      if (policy.gate === 'G1' || policy.gate === 'G1d') {
        const setup = m.book.machine.setup;

        if (setup && setup.activationTime <= decisionTime && (policy.gate === 'G1' || setup.kind === 'deep')) {
          return true;
        }

        continue;
      }

      const lookback = m.ref.params.tickWindowSize;

      if (s >= Math.max(lookback, armStart)) {
        const high = referenceHighs.get(m)![s]!;
        const price = lastClose.get(m.symbol)!;

        if (price <= high * (1 - policy.lambda * m.ref.params.targetPercentChange)) {
          return true;
        }
      }
    }

    return false;
  };

  // ----- decisions -----

  const newRecord = (m: Member, trade: VirtualTrade, shallow: Member, s: number): RefSwitch => {
    const record: RefSwitch = {
      decisionIndex: s,
      decisionTime: trade.decisionTime,
      deepBookId: m.ref.id,
      deepTradeId: trade.id,
      shallowBookId: shallow.ref.id,
      outcome: 'pending-at-end',
      saleIndex: -1,
      saleBar: -1,
      saleRawPrice: NaN,
      purchaseIndex: -1,
      purchaseBar: -1,
      purchaseRawPrice: NaN
    };

    switches.push(record);

    return record;
  };

  const decide = (m: Member, signal: ReboundSignal, s: number, T: number) => {
    if (!isActive(m, s)) {
      m.book.commit(signal, s, 'refused');
      return;
    }

    decisions++;

    const policy = policyAt(s);

    if (m.tier === 'shallow') {
      const grant = pool.tag === 'IDLE' && !gateRefuses(policy, s, signal.decisionTime);
      const trade = m.book.commit(signal, s, grant ? 'granted' : 'refused');

      if (grant) {
        granted++;
        pool = { tag: 'RESERVED', member: m, trade, sw: undefined };
      } else {
        refused++;
      }

      return;
    }

    if (pool.tag === 'IDLE') {
      const trade = m.book.commit(signal, s, 'granted');

      granted++;
      pool = { tag: 'RESERVED', member: m, trade, sw: undefined };
      return;
    }

    const legacy = policy.kind === 'P2' && policy.replacement === 'legacy';

    if (policy.kind !== 'P0' && pool.tag === 'RESERVED' && pool.member.tier === 'shallow') {
      if (legacy) {
        const trade = m.book.commit(signal, s, 'refused');

        newRecord(m, trade, pool.member, s).outcome = 'declined';
        refused++;
        return;
      }

      const shallow = pool.member;
      const trade = m.book.commit(signal, s, 'granted');

      newRecord(m, trade, shallow, s).outcome = 'cancelled-reservation';
      granted++;
      pool = { tag: 'RESERVED', member: m, trade, sw: undefined };
      return;
    }

    if (policy.kind !== 'P0' && pool.tag === 'HELD' && pool.lot.member.tier === 'shallow' && !pool.lot.forced) {
      const lot = pool.lot;
      const estimate = estimateOf(lot, lastClose.get(lot.symbol)!, s);
      let next: 'SALE' | 'WAIT' | 'LATE' | 'declined' | 'declined-filter';
      let threshold: number | undefined;

      switch (policy.kind) {
        case 'P0M':
          next = 'LATE';
          break;
        case 'P1':
          next = 'SALE';
          break;
        case 'P2':
          next = estimate >= 0 ? 'SALE' : 'declined';
          threshold = 0;
          break;
        case 'P3':
          if (policy.filter === 'deep' && signal.setup.kind !== 'deep') {
            next = 'declined-filter';
          } else {
            next = estimate >= -policy.budget ? 'SALE' : 'declined';
          }

          threshold = -policy.budget;
          break;
        case 'P4':
          next = estimate >= 0 ? 'SALE' : 'WAIT';
          break;
      }

      const declined = next === 'declined' || next === 'declined-filter';
      const trade = m.book.commit(signal, s, declined ? 'refused' : 'granted');
      const record = newRecord(m, trade, lot.member, s);

      if (declined) {
        record.outcome = next as RefOutcome;
        refused++;
        return;
      }

      granted++;

      const sw: Switch = {
        record,
        policy,
        legacy,
        deep: m,
        trade,
        threshold,
        decisionBarStart: T,
        deadline: s + policy.deadline,
        freedBy: undefined
      };

      if (next === 'SALE') {
        pool = { tag: 'SALE', lot, sw, at: firstTradeOnOrAfter(lot.ds, s, signal.decisionTime) };
      } else if (next === 'WAIT') {
        pool = { tag: 'WAIT', lot, sw };
      } else {
        pool = { tag: 'LATE', lot, sw };
      }

      return;
    }

    m.book.commit(signal, s, 'refused');
    refused++;
  };

  // P4: the minute of the shallow symbol starting at T completes; a breakeven-or-better close sends the sale.
  const waitCheck = (s: number, T: number, present: Map<string, number>) => {
    if (pool.tag !== 'WAIT') {
      return;
    }

    const { lot, sw } = pool;
    const k = present.get(lot.symbol);

    if (k === undefined || s > sw.deadline || !(s > sw.record.decisionIndex || T > sw.decisionBarStart)) {
      return;
    }

    const close = lot.ds.bClose[lot.ds.sBarStart[s]! + k]!;

    if (estimateOf(lot, close, s) >= 0) {
      pool = { tag: 'SALE', lot, sw, at: firstTradeOnOrAfter(lot.ds, s, T + 60) };
    }
  };

  // ----- the annual reset at a year-end close -----

  const annualReset = (s: number) => {
    const sw = pendingSwitch();

    if (sw) {
      sw.record.outcome = 'pending-at-end';
    }

    const lot = heldLot();

    pool = { tag: 'IDLE' };

    if (!lot) {
      return;
    }

    const count = lot.ds.sBarCount[s]!;

    if (lot.record.entryIndex === s && lot.record.entryBar === count) {
      lot.forced = { at: firstTradeOnOrAfter(lot.ds, s + 1, lot.ds.sCloseTime[s]!), reason: 'annual-reset' };
      pool = { tag: 'HELD', lot };
      return;
    }

    const print = lot.ds.sClosingPrint[s]!;

    closeHolding(lot, s, count, Number.isNaN(print) ? lot.ds.sClose[s]! : print, 'annual-reset', false);
  };

  // ----- the sessions -----

  const minuteTracker = new Tracker(0, cal.bTime[cal.sBarStart[startIndex]!]!);
  const dailyTracker = new Tracker(0, sTime[startIndex]!);
  const marks = new Float64Array(cal.sessionCount).fill(NaN);
  const cursor = new Int32Array(symbols.length);
  const present = new Map<string, number>();

  marks[startIndex] = 0;

  for (let s = startIndex + 1; s <= endIndex; s++) {
    for (const m of ordered) {
      m.book.beginSession(s);
    }

    for (let i = 0; i < symbols.length; i++) {
      cursor[i] = 0;
      lastClose.set(symbols[i]!, symbolDatasets[i]!.sClose[s - 1]!);
    }

    for (;;) {
      let T = Infinity;

      for (let i = 0; i < symbols.length; i++) {
        const ds = symbolDatasets[i]!;

        if (cursor[i]! < ds.sBarCount[s]!) {
          T = Math.min(T, barTimeOf(ds, s, cursor[i]!));
        }
      }

      if (T === Infinity) {
        break;
      }

      present.clear();

      for (let i = 0; i < symbols.length; i++) {
        const ds = symbolDatasets[i]!;

        if (cursor[i]! < ds.sBarCount[s]! && barTimeOf(ds, s, cursor[i]!) === T) {
          present.set(symbols[i]!, cursor[i]!);
        }
      }

      const lotAtStart = heldLot();

      lotEventNow = false;

      // phase 0: virtual exits; intrabar ones are funded after the bar's opening trade
      const intrabar: { trade: VirtualTrade; d: ExitDecision }[] = [];

      for (const m of ordered) {
        const k = present.get(m.symbol);
        const d = k === undefined ? undefined : m.book.exitAt(k);

        if (d) {
          const trade = m.book.close(s, d);

          if (isIntrabar(d)) {
            intrabar.push({ trade, d });
          } else {
            onVirtualExit(trade, s, d, false);
          }
        }
      }

      // phase 1: switch sales and purchases, orphan and reset-carry sales due at this print
      runDueEvents(s, (symbol) => present.get(symbol));

      // phase 1b: intrabar exits
      for (const { trade, d } of intrabar) {
        onVirtualExit(trade, s, d, true);
      }

      // phase 2: virtual fills
      for (const m of ordered) {
        const k = present.get(m.symbol);

        if (k !== undefined && m.book.fillAt(k)) {
          const trade = m.book.open(s, k);

          onVirtualFill(m, trade, s, k);
        }
      }

      for (const [symbol, k] of present) {
        const ds = datasetBySymbol.get(symbol)!;

        lastClose.set(symbol, ds.bClose[ds.sBarStart[s]! + k]!);
      }

      // phase 3: P4 minute checks, then the decisions of the minute starting at T
      waitCheck(s, T, present);

      const signals: { m: Member; signal: ReboundSignal }[] = [];

      for (const m of ordered) {
        const k = present.get(m.symbol);
        const signal = k === undefined ? undefined : m.book.processBar(s, k);

        if (signal) {
          signals.push({ m, signal });
        }
      }

      for (const { m, signal } of signals) {
        decide(m, signal, s, T);
      }

      // marks: the held lot's own bars, its exit bar (realized) and any bar where a lot opened or closed
      if (lotEventNow || (lotAtStart && present.has(lotAtStart.symbol))) {
        const lot = heldLot();
        let value = realized;

        if (lot) {
          const k = present.get(lot.symbol);

          if (k === undefined) {
            throw new Error('reference: a mark without the held lot’s bar');
          }

          value = realized + markOf(lot, lot.ds.bClose[lot.ds.sBarStart[s]! + k]!, s);
        }

        minuteTracker.updateStrict(value, T);
      }

      for (let i = 0; i < symbols.length; i++) {
        if (present.has(symbols[i]!)) {
          cursor[i]!++;
        }
      }
    }

    // ----- the close -----

    lotEventNow = false;

    // P4: after the last minute of the deadline session a waiting switch sends its forced sale (next session's first
    // trade). (`pool` is mutated inside closures; the cast stops control-flow narrowing from the loop above.)
    const waiting = pool as Pool;

    if (waiting.tag === 'WAIT' && s >= waiting.sw.deadline) {
      pool = {
        tag: 'SALE',
        lot: waiting.lot,
        sw: waiting.sw,
        at: firstTradeOnOrAfter(waiting.lot.ds, s + 1, -Infinity)
      };
    }

    for (const m of ordered) {
      const d = m.book.exitAt(m.ds.sBarCount[s]!);

      if (d) {
        onVirtualExit(m.book.close(s, d), s, d, false);
      }
    }

    runDueEvents(s, (_symbol, ds) => ds.sBarCount[s]!);

    for (const m of ordered) {
      const count = m.ds.sBarCount[s]!;

      if (m.book.fillAt(count)) {
        onVirtualFill(m, m.book.open(s, count), s, count);
      }
    }

    if (resets.has(s)) {
      annualReset(s);
    }

    for (const m of ordered) {
      m.book.afterSession(s);
    }

    const lot = heldLot();
    const value = lot ? realized + markOf(lot, lot.ds.sClose[s]!, s) : realized;

    marks[s] = value;
    minuteTracker.updateStrict(value, cal.sCloseTime[s]!);
    dailyTracker.updateStrict(value, sTime[s]!);
  }

  // ----- the end -----

  for (const m of ordered) {
    m.book.finish(endIndex);
  }

  const sw = pendingSwitch();

  if (sw) {
    if (pool.tag === 'SALE' && sw.legacy) {
      abortSwitch(sw, 'aborted');
    } else {
      sw.record.outcome = 'pending-at-end';
    }
  }

  const lot = heldLot();
  let unrealized = 0;

  if (lot) {
    const close = lot.ds.sClose[endIndex]!;
    const interest = interestOf(lot.record.entryIndex, endIndex);

    lot.record.exitRawPrice = close;
    lot.record.interest = interest;
    lot.record.net = lot.shares * close - principal - interest;
    unrealized = lot.record.net;
  }

  const minute = minuteTracker.stats();
  const daily = dailyTracker.stats();

  return {
    lots,
    switches,
    net: realized + unrealized,
    realized,
    minuteDrawdown: { maximum: minute.maximum, peakTime: minute.peakTime, troughTime: minute.troughTime },
    dailyDrawdown: { maximum: daily.maximum, peakTime: daily.peakTime, troughTime: daily.troughTime },
    marks,
    decisions,
    granted,
    refused
  };
};

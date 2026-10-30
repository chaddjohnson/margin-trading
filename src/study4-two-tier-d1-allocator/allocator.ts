// The two-tier shared-pool allocator as a trace replay (ENGINE_CONTRACT.md, revision 2). Pass 1 consumes the books'
// trace events in the engine's chronological order — session; bar times, then the close; at one time: virtual exits,
// due switch sales and purchases, virtual fills, then the completed minute's P4 checks and decisions in priority order
// — and answers each decision from the pool's state at that moment only. A trade's later fields are read only at its
// own events; switch prices are read from the bars at the switch's own event. Pass 2 books the funded lots with the
// frozen FixedLedger formulas and marks them exactly where the frozen replay marks them (every bar of the held lot's
// symbol, its exit minute, every close) with the frozen strict-peak Tracker. Under P0 with frozen ties and distinct
// symbols it reproduces src/portfolio-aware-d1/replay.ts exactly (parity tests).
import type { Dataset } from '../four-family/data.ts';
import { type DrawdownStats, Tracker } from '../multi-etf-allocator/engine.ts';
import type { VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import { firstTradeAfterDecision, priceAt, timeAt } from '../shared-margin-portfolio/strategy.ts';
import type { Tier } from './books.ts';
import { type Trace, referenceHighs } from './trace.ts';

const secondsPerYear = 365 * 86400;

export type PolicyKind = 'P0' | 'P0M' | 'P1' | 'P2' | 'P3' | 'P4';
export type Gate = 'G0' | 'G1' | 'G1d' | 'G2';

export interface Policy {
  kind: PolicyKind;
  budget: number; // P3: the loss budget in dollars (threshold −budget)
  filter: 'any' | 'deep'; // P3: deep-path decisions only
  deadline: number; // P4: sessions after the decision's session
  gate: Gate;
  lambda: number; // G2
  replacement: 'mirror' | 'legacy'; // legacy with P2 = P2L
  latency: number; // seconds: the mirror purchase is decided at the sale bar start + latency
}

export const policyOf = (kind: PolicyKind, overrides: Partial<Policy> = {}): Policy => ({
  kind,
  budget: 0,
  filter: 'any',
  deadline: 0,
  gate: 'G0',
  lambda: 0.75,
  replacement: 'mirror',
  latency: 60,
  ...overrides
});

export const policyLabel = (p: Policy) => {
  const base =
    p.kind === 'P2' && p.replacement === 'legacy'
      ? 'P2L'
      : p.kind === 'P3'
        ? `P3(${p.budget},${p.filter})`
        : p.kind === 'P4'
          ? `P4(${p.deadline})`
          : p.kind;
  const extras = [
    p.gate !== 'G0' ? (p.gate === 'G2' ? `G2(${p.lambda})` : p.gate) : '',
    p.replacement === 'legacy' && p.kind !== 'P2' ? 'legacy' : '',
    p.latency !== 60 ? `lat${p.latency}` : ''
  ].filter(Boolean);

  return [base, ...extras].join('+');
};

export interface AllocBook {
  id: string;
  symbol: string;
  tier: Tier;
  ds: Dataset;
  trace: Trace;
  shallowRank?: number; // the shallow priority order (lower first); default by symbol then id
  activeFrom?: number; // decisions offered from this session index (chained accounts)
  activeTo?: number; // through this session index
}

export interface AllocConfig {
  startIndex: number;
  endIndex: number;
  armStart?: number; // the arming session index (gate G2 never refuses before max(L, armStart))
  principal: number;
  rate: number;
  costBps: number;
  stopSlippageBps: number;
  policy: Policy;
  policySchedule?: { from: number; policy: Policy }[]; // chained: the policy in force from a session index on
  tieMode: 'tier' | 'frozen';
  resets?: number[]; // chained reset mode: sessions at whose close the held lot is liquidated
  segments?: number[]; // boundary sessions: windowed drawdowns start at their close
}

export type LotKind = 'exact' | 'mirror' | 'orphan';

export interface LotRecord {
  id: number;
  bookId: string;
  symbol: string;
  tier: Tier;
  tradeId: number;
  kind: LotKind;
  setupKind: string;
  decisionIndex: number;
  decisionTime: number;
  entryIndex: number;
  entryBar: number;
  entryTime: number;
  entryRawPrice: number;
  entryPrice: number;
  shares: number;
  exitIndex: number; // -1 while open at the end
  exitBar: number;
  exitTime: number;
  exitRawPrice: number;
  exitPrice: number;
  exitReason: string;
  interest: number;
  net: number;
  costs: number;
  worstMark: number;
  open: boolean;
  switchId: number; // the switch that bought (mirror) or sold (preempted) it, else -1
  virtualEntryRawPrice: number; // mirror/orphan: the virtual trade's own fill
  virtualEntryTime: number;
  virtualNet: number; // the virtual trade's own net
}

export type SwitchOutcome =
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

export interface SwitchRecord {
  id: number;
  policy: string;
  decisionIndex: number;
  decisionTime: number;
  deepBookId: string;
  deepTradeId: number;
  deepSetupKind: string;
  shallowBookId: string;
  shallowLotId: number; // -1 for a cancelled reservation
  estimatePrice: number;
  estimateNet: number;
  outcome: SwitchOutcome;
  waited: boolean; // P4 entered WAIT
  late: boolean; // P0M late funding
  saleIndex: number;
  saleBar: number;
  saleTime: number;
  saleRawPrice: number;
  saleNet: number; // the shallow lot's realized net at the sale (or its own exit when superseded)
  attemptIndex: number; // an aborted sale's attempted fill (sale* stay −1/NaN for aborted outcomes)
  attemptBar: number;
  attemptRawPrice: number;
  attemptNet: number;
  purchaseIndex: number;
  purchaseBar: number;
  purchaseTime: number;
  purchaseRawPrice: number;
  mirrorLotId: number;
  mirrorKind: LotKind | '';
}

export interface SegmentStats {
  from: number; // the boundary session (its close starts the trackers)
  startMark: number;
  startLiquidation: number;
  endMark: number;
  endLiquidation: number;
  minute: DrawdownStats;
  daily: DrawdownStats;
}

export interface AllocResult {
  net: number;
  realized: number;
  unrealized: number;
  interest: number;
  costs: number;
  minuteDrawdown: DrawdownStats;
  dailyDrawdown: DrawdownStats;
  marks: Float64Array; // strategy mark at each close (frozen convention: open lots at the close, no exit friction)
  liquidation: Float64Array; // liquidation mark at each close (exit friction deducted)
  segments: SegmentStats[];
  lots: LotRecord[];
  switches: SwitchRecord[];
  decisions: number;
  granted: number;
  refused: number;
  refusalReasons: Record<string, number>;
  heldSessions: number;
  heldDays: number;
  reservationsAtEnd: number;
}

// ----- events -----

const PH_EXIT = 0;
const PH_SWITCH = 1;
const PH_INTRABAR_EXIT = 1.5; // exits filled inside their bar, after its opening trade (the intrabar exception)
const PH_FILL = 2;
const PH_DECIDE = 4;
const PH_RESET = 9;

type EvKind = 'exit' | 'fill' | 'decision' | 'sale' | 'buy' | 'forced' | 'watch' | 'reset';

interface Ev {
  s: number;
  close: number; // 0 bar minute, 1 the close
  t: number; // bar start (0 at the close)
  phase: number;
  rank: number;
  kind: EvKind;
  book: number;
  trade?: VirtualTrade;
  k?: number; // bar index of a switch event in its symbol's session (count = the closing print)
  token?: number; // the pending state it belongs to
}

const cmp = (a: Ev, b: Ev) => a.s - b.s || a.close - b.close || a.t - b.t || a.phase - b.phase || a.rank - b.rank;
const sameTime = (a: { s: number; close: number; t: number }, b: { s: number; close: number; t: number }) =>
  a.s === b.s && a.close === b.close && a.t === b.t;

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

// The last traded price of `ds` known at the end of the minute starting at t in session s: the close of its latest
// bar starting at or before t, else the previous session's close.
export const lastPriceAt = (ds: Dataset, s: number, t: number) => {
  const k = lastBarAtOrBefore(ds, s, t);

  return k >= 0 ? ds.bClose[ds.sBarStart[s]! + k]! : ds.sClose[s - 1]!;
};

// The fill of an order decided at `time` in session s (firstTradeAfterDecision), carried to later sessions' first
// trade, through endIndex: { s, k } (k = count: the closing print) or undefined.
const fillFrom = (ds: Dataset, s: number, time: number, endIndex: number) => {
  for (let i = s; i <= endIndex; i++) {
    const k = firstTradeAfterDecision(ds, i, time);

    if (k >= 0) {
      return { s: i, k };
    }
  }

  return undefined;
};

const eventAt = (ds: Dataset, s: number, k: number) =>
  k >= ds.sBarCount[s]! ? { close: 1, t: 0 } : { close: 0, t: barTime(ds, s, k) };

// How a virtual exit at the purchase's own event relates to the purchase (ENGINE_CONTRACT §5.4).
const exitAtPurchase = (trade: VirtualTrade, atClose: boolean): 'known' | 'print' | 'intrabar' => {
  if (trade.exitExecution === 'stop level' || trade.exitExecution === 'trigger minute close') {
    return 'intrabar';
  }

  if (atClose || trade.exitReason === 'maximum hold' || trade.exitReason === 'buffered intraday loss') {
    return 'known';
  }

  if (trade.exitReason === 'trailing stop gap' || trade.exitExecution === 'minute open through stop') {
    return 'print';
  }

  if (trade.exitReason === 'trailing stop' && trade.exitExecution === 'first trade after decision') {
    return 'known'; // a next-open stop fill: triggered in an earlier minute
  }

  throw new Error(`allocator: unclassified exit ${trade.exitReason}/${trade.exitExecution} at a purchase`);
};

interface Plan {
  id: number;
  book: number;
  trade: VirtualTrade;
  kind: LotKind;
  entryIndex: number;
  entryBar: number;
  shares: number;
  entryRaw: number;
  entryTimestamp: number;
  exitIndex: number; // the trade's own exit, or a switch sale / forced exit
  exitBar: number;
  exitRaw: number;
  exitReason: string;
  exitIsStop: boolean;
  switchId: number; // the switch that bought it (mirror/orphan)
  saleSwitchId: number; // the switch that sold it
  closed: boolean;
  forced: boolean; // a forced exit (orphan sale, reset at the next opening trade) is scheduled
}

interface SwitchBase {
  token: number;
  sw: SwitchRecord;
  deep: number;
  deepTrade: VirtualTrade;
}

type Pending =
  | (SwitchBase & { type: 'sale'; at: Ev; test: boolean; threshold: number })
  | (SwitchBase & { type: 'buy'; at: Ev })
  | (SwitchBase & { type: 'wait'; lastSession: number })
  | (SwitchBase & { type: 'late' });

export const runAllocator = (books: readonly AllocBook[], config: AllocConfig): AllocResult => {
  const { startIndex, endIndex, principal, rate, costBps } = config;
  const cost = costBps / 10000;
  const slip = config.stopSlippageBps / 10000;
  const armStart = config.armStart ?? 0;

  if (books.length === 0) {
    throw new Error('allocator: no books');
  }

  const ids = new Set<string>();

  for (const book of books) {
    if (ids.has(book.id)) {
      throw new Error(`allocator: duplicate book id ${book.id}`);
    }

    ids.add(book.id);

    if (book.ds.sessionCount <= endIndex) {
      throw new Error(`allocator: ${book.id}'s data end before session ${endIndex}`);
    }
  }

  const anyDs = books[0]!.ds;
  const sTime = anyDs.sTime;

  // ----- priority ranks of same-minute decisions -----
  const tieRank = new Map<number, number>();
  const pad = (n: number) => String(Math.max(0, Math.min(999999, Math.floor(n)))).padStart(6, '0');

  if (config.tieMode === 'frozen') {
    const symbols = books.map((book) => book.symbol);

    if (new Set(symbols).size !== symbols.length) {
      throw new Error('allocator: frozen ties need distinct symbols');
    }

    const sorted = [...symbols].sort();

    books.forEach((book, index) => tieRank.set(index, sorted.indexOf(book.symbol)));
  } else {
    const order = books
      .map((book, index) => ({
        index,
        key:
          book.tier === 'deep'
            ? `0|${book.symbol}|${book.id}`
            : `1|${pad(book.shallowRank ?? 999999)}|${book.symbol}|${book.id}`
      }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

    order.forEach((entry, rank) => tieRank.set(entry.index, rank));
  }

  const schedule = (config.policySchedule ?? []).slice().sort((a, b) => a.from - b.from);
  const policyAt = (s: number) => {
    let policy = config.policy;

    for (const item of schedule) {
      if (item.from <= s) {
        policy = item.policy;
      }
    }

    return policy;
  };

  // ----- static events -----
  const events: Ev[] = [];

  books.forEach((book, b) => {
    const { ds } = book;
    const from = book.activeFrom ?? -Infinity;
    const to = book.activeTo ?? Infinity;

    for (const trade of book.trace.trades) {
      if (trade.decisionIndex > endIndex) {
        continue;
      }

      if (trade.decisionIndex > startIndex && trade.decisionIndex >= from && trade.decisionIndex <= to) {
        events.push({
          s: trade.decisionIndex,
          close: 0,
          t: barTime(ds, trade.decisionIndex, trade.decisionBar),
          phase: PH_DECIDE,
          rank: tieRank.get(b)!,
          kind: 'decision',
          book: b,
          trade
        });
      }

      if (trade.entryIndex >= 0 && trade.entryIndex <= endIndex) {
        events.push({
          s: trade.entryIndex,
          ...eventAt(ds, trade.entryIndex, trade.entryBar),
          phase: PH_FILL,
          rank: tieRank.get(b)!,
          kind: 'fill',
          book: b,
          trade
        });
      }

      if (trade.exitIndex >= 0 && trade.exitIndex <= endIndex) {
        events.push({
          s: trade.exitIndex,
          ...eventAt(ds, trade.exitIndex, trade.exitBar),
          phase:
            trade.exitExecution === 'stop level' || trade.exitExecution === 'trigger minute close'
              ? PH_INTRABAR_EXIT
              : PH_EXIT,
          rank: tieRank.get(b)!,
          kind: 'exit',
          book: b,
          trade
        });
      }
    }
  });

  for (const s of config.resets ?? []) {
    if (s > startIndex && s <= endIndex) {
      events.push({ s, close: 1, t: 0, phase: PH_RESET, rank: 0, kind: 'reset', book: -1 });
    }
  }

  events.sort(cmp);

  // dynamic events (switch sales and purchases, forced exits, P4 checks), kept sorted
  const dynamic: Ev[] = [];
  const pushDynamic = (event: Ev) => {
    let lo = 0;
    let hi = dynamic.length;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;

      if (cmp(dynamic[mid]!, event) <= 0) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    dynamic.splice(lo, 0, event);
  };

  // ----- allocator state -----
  const plans: Plan[] = [];
  const switches: SwitchRecord[] = [];
  const refusalReasons: Record<string, number> = {};
  let holding: Plan | undefined;
  let reservation: { book: number; trade: VirtualTrade; sw?: SwitchRecord } | undefined;
  let pending: Pending | undefined;
  let token = 0;
  let decisions = 0;
  let granted = 0;
  let refused = 0;
  const filled = new Set<VirtualTrade>();
  const exited = new Set<VirtualTrade>();

  const refuse = (reason: string) => {
    refused++;
    refusalReasons[reason] = (refusalReasons[reason] ?? 0) + 1;
  };
  // an aborted switch converts its decision's grant into a refusal (the legacy replay's counting)
  const abortGrant = () => {
    granted--;
    refuse('aborted');
  };

  const interestThrough = (entryTimestamp: number, s: number) =>
    principal * rate * ((sTime[s]! - entryTimestamp) / secondsPerYear);
  const liquidationNet = (plan: Plan, raw: number, s: number) =>
    plan.shares * (raw * (1 - cost)) - principal - interestThrough(plan.entryTimestamp, s);

  const openPlan = (b: number, trade: VirtualTrade, kind: LotKind, s: number, k: number, switchId = -1) => {
    const ds = books[b]!.ds;
    const raw = priceAt(ds, s, k);
    const plan: Plan = {
      id: plans.length + 1,
      book: b,
      trade,
      kind,
      entryIndex: s,
      entryBar: k,
      shares: principal / (raw * (1 + cost)),
      entryRaw: raw,
      entryTimestamp: sTime[s]!,
      exitIndex: trade.exitIndex,
      exitBar: trade.exitBar,
      exitRaw: trade.exitRawPrice,
      exitReason: trade.exitReason,
      exitIsStop: trade.exitReason === 'trailing stop' || trade.exitReason === 'trailing stop gap',
      switchId,
      saleSwitchId: -1,
      closed: false,
      forced: false
    };

    plans.push(plan);
    return plan;
  };

  // the plan leaves by a forced exit at (s, k) of its own symbol
  const setForcedExit = (plan: Plan, s: number, k: number, reason: string, switchId: number) => {
    plan.exitIndex = s;
    plan.exitBar = k;
    plan.exitRaw = priceAt(books[plan.book]!.ds, s, k);
    plan.exitReason = reason;
    plan.exitIsStop = false;
    plan.saleSwitchId = switchId;
  };

  const newSwitch = (
    event: Ev,
    policy: Policy,
    shallowLotId: number,
    shallowBookId: string,
    estimatePrice: number,
    estimateNet: number
  ): SwitchRecord => {
    const record: SwitchRecord = {
      id: switches.length + 1,
      policy: policyLabel(policy),
      decisionIndex: event.s,
      decisionTime: event.trade!.decisionTime,
      deepBookId: books[event.book]!.id,
      deepTradeId: event.trade!.id,
      deepSetupKind: event.trade!.setupKind,
      shallowBookId,
      shallowLotId,
      estimatePrice,
      estimateNet,
      outcome: 'pending-at-end',
      waited: false,
      late: false,
      saleIndex: -1,
      saleBar: -1,
      saleTime: NaN,
      saleRawPrice: NaN,
      saleNet: NaN,
      attemptIndex: -1,
      attemptBar: -1,
      attemptRawPrice: NaN,
      attemptNet: NaN,
      purchaseIndex: -1,
      purchaseBar: -1,
      purchaseTime: NaN,
      purchaseRawPrice: NaN,
      mirrorLotId: -1,
      mirrorKind: ''
    };

    switches.push(record);
    return record;
  };

  // The mirror purchase of the deep trade once the shallow lot left by a fill at `fillTime` in session s.
  const schedulePurchase = (base: SwitchBase, policy: Policy, s: number, fillTime: number, atClose: boolean) => {
    const ds = books[base.deep]!.ds;
    const at = atClose
      ? s + 1 <= endIndex
        ? fillFrom(ds, s + 1, sTime[s + 1]!, endIndex)
        : undefined
      : fillFrom(ds, s, fillTime + policy.latency, endIndex);

    if (exited.has(base.deepTrade)) {
      base.sw.outcome = 'stale-replacement'; // the deep trade ended at the print that freed the slot
      pending = undefined;
      return;
    }

    if (!at) {
      base.sw.outcome = 'pending-at-end'; // the window ends before the purchase (pool idle; the sale stands)
      pending = undefined;
      return;
    }

    const event: Ev = {
      s: at.s,
      ...eventAt(ds, at.s, at.k),
      phase: PH_SWITCH,
      rank: 0,
      kind: 'buy',
      book: base.deep,
      k: at.k,
      token: ++token
    };

    pending = { ...base, type: 'buy', token, at: event };
    pushDynamic(event);
  };

  const scheduleSale = (base: Omit<SwitchBase, 'token'>, time: number, s: number, test: boolean, threshold: number) => {
    const ds = books[holding!.book]!.ds;
    const at = fillFrom(ds, s, time, endIndex);

    if (!at) {
      base.sw.outcome = 'pending-at-end';
      pending = undefined;
      return;
    }

    const event: Ev = {
      s: at.s,
      ...eventAt(ds, at.s, at.k),
      phase: PH_SWITCH,
      rank: 0,
      kind: 'sale',
      book: holding!.book,
      k: at.k,
      token: ++token
    };

    pending = { ...base, type: 'sale', token, at: event, test, threshold };
    pushDynamic(event);
  };

  // A forced exit of the held plan at (s, k) of its symbol (orphan sale, or a reset of a closing-print entry).
  const scheduleForced = (plan: Plan, s: number, k: number, reason: string) => {
    const ds = books[plan.book]!.ds;

    setForcedExit(plan, s, k, reason, -1);
    plan.forced = true;
    pushDynamic({
      s,
      ...eventAt(ds, s, k),
      phase: PH_SWITCH,
      rank: 0,
      kind: 'forced',
      book: plan.book,
      k,
      token: plan.id
    });
  };

  const scheduleOrphanSale = (plan: Plan) => {
    const ds = books[plan.book]!.ds;
    const s = plan.entryIndex;
    const count = ds.sBarCount[s]!;
    const at =
      plan.entryBar + 1 < count
        ? { s, k: plan.entryBar + 1 }
        : plan.entryBar < count && !Number.isNaN(ds.sClosingPrint[s]!)
          ? { s, k: count }
          : s + 1 <= endIndex
            ? fillFrom(ds, s + 1, sTime[s + 1]!, endIndex)
            : undefined;

    plan.kind = 'orphan';

    if (!at) {
      // no later trade in the window: the lot stays open, marked at the last close
      plan.exitIndex = -1;
      plan.exitBar = -1;
      plan.exitRaw = NaN;
      plan.exitReason = 'open';
      plan.exitIsStop = false;
      plan.forced = true;
      return;
    }

    scheduleForced(plan, at.s, at.k, 'orphan-mirror');
  };

  // The sale of the held shallow lot at (s, k) of its symbol.
  const executeSale = (p: Extract<Pending, { type: 'sale' }>, s: number, k: number, policy: Policy) => {
    const plan = holding!;
    const ds = books[plan.book]!.ds;
    const raw = priceAt(ds, s, k);
    const net = liquidationNet(plan, raw, s);
    const sw = p.sw;

    const clearSale = () => {
      sw.attemptIndex = s;
      sw.attemptBar = k;
      sw.attemptRawPrice = raw;
      sw.attemptNet = net;
      sw.saleIndex = -1;
      sw.saleBar = -1;
      sw.saleTime = NaN;
      sw.saleRawPrice = NaN;
      sw.saleNet = NaN;
    };

    sw.saleIndex = s;
    sw.saleBar = k;
    sw.saleTime = timeAt(ds, s, k);
    sw.saleRawPrice = raw;
    sw.saleNet = net;

    const saleEv = { s, ...eventAt(ds, s, k) };

    if (policy.replacement === 'legacy') {
      const dsDeep = books[p.deep]!.ds;
      const trade = p.deepTrade;

      if (filled.has(trade)) {
        clearSale();
        sw.outcome = 'aborted-replacement-first';
        abortGrant();
        pending = undefined;
        return false;
      }

      if (
        trade.entryIndex >= 0 &&
        sameTime({ s: trade.entryIndex, ...eventAt(dsDeep, trade.entryIndex, trade.entryBar) }, saleEv)
      ) {
        const auction =
          trade.entryBar >= dsDeep.sBarCount[trade.entryIndex]! ||
          (trade.entryBar === 0 && trade.entryIndex > trade.decisionIndex);

        if (auction) {
          clearSale();
          sw.outcome = 'aborted-auction';
          abortGrant();
          pending = undefined;
          return false;
        }
      }
    }

    if (p.test && net < p.threshold) {
      clearSale();
      sw.outcome = 'aborted';
      abortGrant();
      pending = undefined;
      return false;
    }

    sw.outcome = 'executed';
    setForcedExit(plan, s, k, 'priority_preemption', sw.id);
    plan.closed = true;
    holding = undefined;

    if (policy.replacement === 'legacy') {
      reservation = { book: p.deep, trade: p.deepTrade, sw };
      pending = undefined;
    } else {
      schedulePurchase(p, policy, s, sw.saleTime, k >= ds.sBarCount[s]!);
    }

    return true;
  };

  // P4: the next minute check of the shallow symbol after bar k of session s, or the forced sale at the deadline.
  const scheduleWatch = (p: Extract<Pending, { type: 'wait' }>, s: number, kNext: number) => {
    const ds = books[holding!.book]!.ds;
    let i = s;
    let k = kNext;

    while (i <= endIndex && i <= p.lastSession) {
      if (k < ds.sBarCount[i]!) {
        pushDynamic({
          s: i,
          close: 0,
          t: barTime(ds, i, k),
          phase: PH_DECIDE,
          rank: -1,
          kind: 'watch',
          book: holding!.book,
          k,
          token: p.token
        });
        return;
      }

      i++;
      k = 0;
    }

    // the deadline passed without recovery: a forced sale at the next session's first trade
    const at =
      p.lastSession + 1 <= endIndex ? fillFrom(ds, p.lastSession + 1, sTime[p.lastSession + 1]!, endIndex) : undefined;

    if (!at) {
      p.sw.outcome = 'pending-at-end';
      pending = undefined;
      return;
    }

    const event: Ev = {
      s: at.s,
      ...eventAt(ds, at.s, at.k),
      phase: PH_SWITCH,
      rank: 0,
      kind: 'sale',
      book: holding!.book,
      k: at.k,
      token: ++token
    };

    pending = {
      token,
      sw: p.sw,
      deep: p.deep,
      deepTrade: p.deepTrade,
      type: 'sale',
      at: event,
      test: false,
      threshold: -Infinity
    };
    pushDynamic(event);
  };

  // gates for a shallow decision at the end of the minute starting at t in session s
  const deepBooks = books.filter((book) => book.tier === 'deep');
  const isActive = (book: AllocBook, s: number) =>
    (book.activeFrom === undefined || s >= book.activeFrom) && (book.activeTo === undefined || s <= book.activeTo);
  const gateRefuses = (policy: Policy, s: number, t: number, decisionTime: number) => {
    if (policy.gate === 'G0') {
      return false;
    }

    for (const book of deepBooks) {
      if (!isActive(book, s)) {
        continue;
      }

      if (policy.gate === 'G1' || policy.gate === 'G1d') {
        for (const span of book.trace.spans) {
          // armed at or before the decision, its virtual fill not yet processed (a fill at a bar start after t)
          if ((policy.gate === 'G1' || span.kind === 'deep') && span.from <= decisionTime && span.to > t) {
            return true;
          }
        }
      } else if (s >= Math.max(book.trace.lookback, armStart)) {
        const high = referenceHighs(book.ds, book.trace.lookback)[s]!;

        if (Number.isFinite(high) && lastPriceAt(book.ds, s, t) <= high * (1 - policy.lambda * book.trace.x)) {
          return true;
        }
      }
    }

    return false;
  };

  // ----- pass 1: the event loop -----
  let i = 0;

  for (;;) {
    let event: Ev | undefined;

    if (dynamic.length > 0 && (i >= events.length || cmp(dynamic[0]!, events[i]!) <= 0)) {
      event = dynamic.shift()!;
    } else if (i < events.length) {
      event = events[i++]!;
    } else {
      break;
    }

    switch (event.kind) {
      case 'exit': {
        const trade = event.trade!;

        exited.add(trade);
        const tradeDs = books[event.book]!.ds;

        if (holding && holding.trade === trade && !holding.closed && !holding.forced) {
          const plan = holding;

          // a sale due at this bar's open comes before an own exit inside the bar
          if (
            pending?.type === 'sale' &&
            sameTime(pending.at, event) &&
            (trade.exitExecution === 'stop level' || trade.exitExecution === 'trigger minute close')
          ) {
            const p = pending;
            const sold = executeSale(p, p.at.s, p.at.k!, policyAt(p.sw.decisionIndex));

            p.at.token = -1;

            if (sold) {
              break;
            }
          }

          // the lot leaves on its own rule
          plan.closed = true;
          holding = undefined;

          if (pending && (pending.type === 'sale' || pending.type === 'wait' || pending.type === 'late')) {
            const p = pending;
            const policy = policyAt(p.sw.decisionIndex);
            const atClose = trade.exitBar >= tradeDs.sBarCount[trade.exitIndex]!;

            p.sw.outcome = 'superseded';
            p.sw.saleIndex = trade.exitIndex;
            p.sw.saleBar = trade.exitBar;
            p.sw.saleTime = trade.exitTime;
            p.sw.saleRawPrice = trade.exitRawPrice;
            p.sw.saleNet =
              plan.shares * (trade.exitRawPrice * (1 - cost) * (plan.exitIsStop ? 1 - slip : 1)) -
              principal -
              interestThrough(plan.entryTimestamp, trade.exitIndex);

            if (p.type === 'sale') {
              p.at.token = -1;
            }

            if (policy.replacement === 'legacy') {
              const dsDeep = books[p.deep]!.ds;
              const deep = p.deepTrade;
              const auction =
                deep.entryIndex >= 0 &&
                sameTime({ s: deep.entryIndex, ...eventAt(dsDeep, deep.entryIndex, deep.entryBar) }, event) &&
                (deep.entryBar >= dsDeep.sBarCount[deep.entryIndex]! ||
                  (deep.entryBar === 0 && deep.entryIndex > deep.decisionIndex));

              if (filled.has(deep) || auction) {
                p.sw.outcome = filled.has(deep) ? 'aborted-replacement-first' : 'aborted-auction';
                p.sw.saleIndex = -1;
                p.sw.saleBar = -1;
                p.sw.saleTime = NaN;
                p.sw.saleRawPrice = NaN;
                p.sw.saleNet = NaN;
                abortGrant();
                pending = undefined;
              } else {
                reservation = { book: p.deep, trade: deep, sw: p.sw };
                pending = undefined;
              }
            } else {
              schedulePurchase(p, policy, trade.exitIndex, trade.exitTime, atClose);
            }
          }
        } else if (holding && holding.trade === trade && holding.forced) {
          // a closing-print entry awaiting its reset sale, or an orphan: the own exit at that print supersedes
          if (holding.exitIndex === trade.exitIndex && holding.exitBar === trade.exitBar) {
            holding.exitReason = trade.exitReason;
            holding.exitIsStop = trade.exitReason === 'trailing stop' || trade.exitReason === 'trailing stop gap';
            holding.exitRaw = trade.exitRawPrice;
            holding.closed = true;
            holding = undefined;
          }
        }

        if (pending && pending.deepTrade === trade) {
          const p = pending;

          if (p.type === 'buy') {
            if (sameTime(p.at, event)) {
              const how = exitAtPurchase(trade, event.close === 1);

              if (how === 'known') {
                p.sw.outcome = 'stale-replacement';
                p.at.token = -1;
                pending = undefined;
              } else {
                // the purchase executes at this print; the lot then leaves
                const plan = openPlan(p.deep, trade, 'mirror', p.at.s, p.at.k!, p.sw.id);

                p.at.token = -1;
                p.sw.purchaseIndex = p.at.s;
                p.sw.purchaseBar = p.at.k!;
                p.sw.purchaseTime = timeAt(books[p.deep]!.ds, p.at.s, p.at.k!);
                p.sw.purchaseRawPrice = plan.entryRaw;
                p.sw.mirrorLotId = plan.id;
                pending = undefined;

                if (how === 'intrabar') {
                  plan.closed = true; // closes at the virtual exit's price inside this bar
                  p.sw.mirrorKind = 'mirror';
                } else {
                  holding = plan;
                  scheduleOrphanSale(plan);
                  p.sw.mirrorKind = 'orphan';
                }
              }
            } else {
              p.sw.outcome = 'stale-replacement';
              p.at.token = -1;
              pending = undefined;
            }
          } else if (
            p.type === 'sale' &&
            sameTime(p.at, event) &&
            exitAtPurchase(trade, event.close === 1) !== 'known'
          ) {
            // the deep trade ends at the sale's own print by a trigger that is that print: the sale order is already
            // out and executes (the purchase then finds the deep trade gone: stale-replacement); a trigger known before
            // the print cancels the sale (below)
          } else {
            p.sw.outcome =
              p.type === 'wait' ? 'stale-wait' : p.type === 'late' ? 'stale-replacement' : 'stale-before-sale';

            if (p.type === 'sale') {
              p.at.token = -1;
            }

            pending = undefined;
          }
        }

        break;
      }

      case 'fill': {
        const trade = event.trade!;

        filled.add(trade);

        if (reservation && reservation.trade === trade) {
          holding = openPlan(
            reservation.book,
            trade,
            'exact',
            trade.entryIndex,
            trade.entryBar,
            reservation.sw?.id ?? -1
          );

          // a P2L replacement: its own fill is the switch's purchase
          if (reservation.sw) {
            const sw = reservation.sw;

            sw.purchaseIndex = trade.entryIndex;
            sw.purchaseBar = trade.entryBar;
            sw.purchaseTime = trade.entryTime;
            sw.purchaseRawPrice = holding.entryRaw;
            sw.mirrorLotId = holding.id;
            sw.mirrorKind = 'exact';
          }

          reservation = undefined;
        }

        break;
      }

      case 'sale': {
        if (!pending || pending.type !== 'sale' || pending.token !== event.token || !holding) {
          break;
        }

        executeSale(pending, event.s, event.k!, policyAt(pending.sw.decisionIndex));
        break;
      }

      case 'buy': {
        if (!pending || pending.type !== 'buy' || pending.token !== event.token) {
          break;
        }

        const p = pending;
        const exact = p.deepTrade.entryIndex === event.s && p.deepTrade.entryBar === event.k;
        const plan = openPlan(p.deep, p.deepTrade, exact ? 'exact' : 'mirror', event.s, event.k!, p.sw.id);

        holding = plan;
        p.sw.purchaseIndex = event.s;
        p.sw.purchaseBar = event.k!;
        p.sw.purchaseTime = timeAt(books[p.deep]!.ds, event.s, event.k!);
        p.sw.purchaseRawPrice = plan.entryRaw;
        p.sw.mirrorLotId = plan.id;
        p.sw.mirrorKind = plan.kind;
        pending = undefined;
        break;
      }

      case 'forced': {
        if (holding && holding.id === event.token && holding.forced && !holding.closed) {
          holding.closed = true;
          holding = undefined;
        }

        break;
      }

      case 'watch': {
        if (!pending || pending.type !== 'wait' || pending.token !== event.token || !holding) {
          break;
        }

        const p = pending;
        const ds = books[holding.book]!.ds;
        const close = ds.bClose[ds.sBarStart[event.s]! + event.k!]!;

        if (liquidationNet(holding, close, event.s) >= 0) {
          scheduleSale(p, barTime(ds, event.s, event.k!) + 60, event.s, false, -Infinity);
        } else {
          scheduleWatch(p, event.s, event.k! + 1);
        }

        break;
      }

      case 'reset': {
        if (pending) {
          pending.sw.outcome = 'pending-at-end';

          if (pending.type === 'sale' || pending.type === 'buy') {
            pending.at.token = -1;
          }

          pending = undefined;
        }

        reservation = undefined;

        if (holding && !holding.forced) {
          const ds = books[holding.book]!.ds;
          const count = ds.sBarCount[event.s]!;

          if (holding.entryIndex === event.s && holding.entryBar >= count) {
            // filled at this very closing print: sold at the next session's first trade
            const at = event.s + 1 <= endIndex ? fillFrom(ds, event.s + 1, sTime[event.s + 1]!, endIndex) : undefined;

            if (at) {
              scheduleForced(holding, at.s, at.k, 'annual-reset');
            }
          } else {
            const plan = holding;

            plan.exitIndex = event.s;
            plan.exitBar = count;
            plan.exitRaw = ds.sClose[event.s]!;
            plan.exitReason = 'annual-reset';
            plan.exitIsStop = false;
            plan.closed = true;
            holding = undefined;
          }
        }

        break;
      }

      case 'decision': {
        const trade = event.trade!;
        const book = books[event.book]!;
        const policy = policyAt(event.s);

        decisions++;

        if (pending || (holding && holding.forced)) {
          refuse('pending switch');
          break;
        }

        if (holding) {
          const held = books[holding.book]!;

          if (book.tier === 'deep' && held.tier === 'shallow' && policy.kind !== 'P0') {
            const price = lastPriceAt(held.ds, event.s, event.t);
            const estimate = liquidationNet(holding, price, event.s);
            const sw = newSwitch(event, policy, holding.id, held.id, price, estimate);
            const base = { sw, deep: event.book, deepTrade: trade };

            if (policy.kind === 'P3' && policy.filter === 'deep' && trade.setupKind !== 'deep') {
              sw.outcome = 'declined-filter';
              refuse('declined');
              break;
            }

            if (policy.kind === 'P0M') {
              sw.late = true;
              pending = { ...base, type: 'late', token: ++token };
              granted++;
              break;
            }

            if (policy.kind === 'P4' && estimate < 0) {
              sw.waited = true;
              pending = { ...base, type: 'wait', token: ++token, lastSession: event.s + policy.deadline };
              granted++;
              scheduleWatch(pending, event.s, lastBarAtOrBefore(held.ds, event.s, event.t) + 1);
              break;
            }

            const threshold = policy.kind === 'P3' ? -policy.budget : policy.kind === 'P2' ? 0 : -Infinity;

            if (estimate < threshold) {
              sw.outcome = 'declined';
              refuse('declined');
              break;
            }

            granted++;
            scheduleSale(base, trade.decisionTime, event.s, policy.kind === 'P2' || policy.kind === 'P3', threshold);
            break;
          }

          refuse('occupied');
          break;
        }

        if (reservation) {
          const held = books[reservation.book]!;

          if (
            book.tier === 'deep' &&
            held.tier === 'shallow' &&
            policy.kind !== 'P0' &&
            policy.replacement !== 'legacy'
          ) {
            const sw = newSwitch(event, policy, -1, held.id, NaN, NaN);

            sw.outcome = 'cancelled-reservation';
            reservation = { book: event.book, trade };
            granted++;
            break;
          }

          if (book.tier === 'deep' && held.tier === 'shallow' && policy.kind !== 'P0') {
            // P2L never cancels a reservation: the deep decision is declined (recorded)
            newSwitch(event, policy, -1, held.id, NaN, NaN).outcome = 'declined';
            refuse('declined');
            break;
          }

          refuse('pending order');
          break;
        }

        if (book.tier === 'shallow' && gateRefuses(policy, event.s, event.t, trade.decisionTime)) {
          refuse('gate');
          break;
        }

        reservation = { book: event.book, trade };
        granted++;
        break;
      }
    }
  }

  // the end of the window: a pending SALE, WAIT, LATE or BUY is 'pending-at-end' (a purchase is cancelled); a P2L sale
  // still pending aborts (the legacy end-of-data rule)
  if (pending) {
    if (pending.type === 'sale' && policyAt(pending.sw.decisionIndex).replacement === 'legacy') {
      pending.sw.outcome = 'aborted';
      abortGrant();
    } else {
      pending.sw.outcome = 'pending-at-end';
    }
  }

  // ----- pass 2: the ledger and the marks -----
  return bookPlans(books, config, plans, switches, {
    decisions,
    granted,
    refused,
    refusalReasons,
    reservationsAtEnd: reservation ? 1 : 0
  });
};

const bookPlans = (
  books: readonly AllocBook[],
  config: AllocConfig,
  plans: Plan[],
  switches: SwitchRecord[],
  counts: {
    decisions: number;
    granted: number;
    refused: number;
    refusalReasons: Record<string, number>;
    reservationsAtEnd: number;
  }
): AllocResult => {
  const { startIndex, endIndex, principal, rate, costBps } = config;
  const cost = costBps / 10000;
  const slip = config.stopSlippageBps / 10000;
  const anyDs = books[0]!.ds;
  const sTime = anyDs.sTime;
  const closeTimes = anyDs.sCloseTime;
  const firstBarTime = anyDs.bTime[anyDs.sBarStart[startIndex]!]!;
  const minuteTracker = new Tracker(0, firstBarTime);
  const dailyTracker = new Tracker(0, sTime[startIndex]!);
  const marks = new Float64Array(anyDs.sessionCount).fill(NaN);
  const liquidation = new Float64Array(anyDs.sessionCount).fill(NaN);
  const segmentStarts = new Set(config.segments ?? []);
  const segments: { from: number; startMark: number; startLiquidation: number; minute: Tracker; daily: Tracker }[] = [];
  const lots: LotRecord[] = [];
  let realized = 0;
  let interestPaid = 0;
  let costsPaid = 0;
  let heldSessions = 0;
  let next = 0;

  interface Open {
    plan: Plan;
    ds: Dataset;
    record: LotRecord;
  }

  let open: Open | undefined;

  marks[startIndex] = 0;
  liquidation[startIndex] = 0;

  if (segmentStarts.has(startIndex)) {
    segments.push({
      from: startIndex,
      startMark: 0,
      startLiquidation: 0,
      minute: new Tracker(0, closeTimes[startIndex]!),
      daily: new Tracker(0, sTime[startIndex]!)
    });
  }

  const update = (value: number, time: number) => {
    minuteTracker.updateStrict(value, time);

    for (const segment of segments) {
      segment.minute.updateStrict(value, time);
    }
  };

  const interestOf = (plan: Plan, s: number) => principal * rate * ((sTime[s]! - plan.entryTimestamp) / secondsPerYear);

  const openLot = (plan: Plan) => {
    const book = books[plan.book]!;
    const entryPrice = plan.entryRaw * (1 + cost);
    const record: LotRecord = {
      id: plan.id,
      bookId: book.id,
      symbol: book.symbol,
      tier: book.tier,
      tradeId: plan.trade.id,
      kind: plan.kind,
      setupKind: plan.trade.setupKind,
      decisionIndex: plan.trade.decisionIndex,
      decisionTime: plan.trade.decisionTime,
      entryIndex: plan.entryIndex,
      entryBar: plan.entryBar,
      entryTime: timeAt(book.ds, plan.entryIndex, plan.entryBar),
      entryRawPrice: plan.entryRaw,
      entryPrice,
      shares: plan.shares,
      exitIndex: -1,
      exitBar: -1,
      exitTime: NaN,
      exitRawPrice: NaN,
      exitPrice: NaN,
      exitReason: 'open',
      interest: 0,
      net: 0,
      costs: plan.shares * (entryPrice - plan.entryRaw),
      worstMark: 0,
      open: true,
      switchId: plan.kind !== 'exact' ? plan.switchId : -1,
      virtualEntryRawPrice: plan.trade.entryRawPrice,
      virtualEntryTime: plan.trade.entryTime,
      virtualNet: plan.trade.net
    };

    lots.push(record);
    open = { plan, ds: book.ds, record };
  };

  const closeLot = () => {
    const { plan, record, ds } = open!;
    const s = plan.exitIndex;
    const exitPrice = plan.exitRaw * (1 - cost) * (plan.exitIsStop ? 1 - slip : 1);
    const interest = interestOf(plan, s);
    const net = plan.shares * exitPrice - principal - interest;

    record.exitIndex = s;
    record.exitBar = plan.exitBar;
    record.exitTime = timeAt(ds, s, plan.exitBar);
    record.exitRawPrice = plan.exitRaw;
    record.exitPrice = exitPrice;
    record.exitReason = plan.exitReason;
    record.interest = interest;
    record.net = net;
    record.costs += plan.shares * (plan.exitRaw - exitPrice);
    record.open = false;

    if (plan.exitReason === 'priority_preemption') {
      record.switchId = plan.saleSwitchId;
    }

    realized += net;
    interestPaid += interest;
    costsPaid += record.costs;
    open = undefined;
  };

  const markLot = (price: number, s: number, time: number) => {
    const { plan, record } = open!;
    const mark = plan.shares * price - principal - interestOf(plan, s);

    if (mark < record.worstMark) {
      record.worstMark = mark;
    }

    return mark;
  };

  const exitsAtBar = (plan: Plan, s: number) => (plan.exitIndex === s ? plan.exitBar : Infinity);

  const markBars = (s: number, from: number) => {
    const { plan, ds } = open!;
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const exitBar = exitsAtBar(plan, s);

    for (let k = from; k < count; k++) {
      const T = ds.bTime[start + k]!;

      if (k === exitBar) {
        closeLot();
        update(realized, T);
        return;
      }

      update(realized + markLot(ds.bClose[start + k]!, s, T), T);
    }
  };

  const fillsAt = (plan: Plan | undefined, s: number) =>
    plan !== undefined && plan.entryIndex === s ? plan.entryBar : -1;

  for (let s = startIndex + 1; s <= endIndex; s++) {
    let held = Boolean(open);

    for (;;) {
      if (open) {
        markBars(s, open.plan.entryIndex === s ? open.plan.entryBar : 0);

        if (open) {
          break;
        }

        continue;
      }

      const candidate = plans[next];
      const k = fillsAt(candidate, s);

      if (k < 0 || k >= books[candidate!.book]!.ds.sBarCount[s]!) {
        break;
      }

      next++;
      openLot(candidate!);
      held = true;
    }

    if (open && open.plan.exitIndex === s) {
      closeLot();
    }

    if (!open) {
      const candidate = plans[next];
      const k = fillsAt(candidate, s);

      if (k >= 0) {
        next++;
        openLot(candidate!);
        held = true;

        if (open && (open as Open).plan.exitIndex === s) {
          closeLot(); // a reset at the close of a closing-print entry
        }
      }
    }

    let unrealized = 0;
    let liquidationValue = 0;

    if (open) {
      const close = open.ds.sClose[s]!;

      unrealized = markLot(close, s, closeTimes[s]!);
      liquidationValue = open.plan.shares * close * (1 - cost) - principal - interestOf(open.plan, s);
    }

    update(realized + unrealized, closeTimes[s]!);
    dailyTracker.updateStrict(realized + unrealized, sTime[s]!);

    for (const segment of segments) {
      segment.daily.updateStrict(realized + unrealized, sTime[s]!);
    }

    marks[s] = realized + unrealized;
    liquidation[s] = realized + liquidationValue;

    if (segmentStarts.has(s)) {
      segments.push({
        from: s,
        startMark: marks[s]!,
        startLiquidation: liquidation[s]!,
        minute: new Tracker(marks[s]!, closeTimes[s]!),
        daily: new Tracker(marks[s]!, sTime[s]!)
      });
    }

    if (held) {
      heldSessions++;
    }
  }

  // the end: an open lot is marked at the last close (no exit friction)
  let unrealizedAtEnd = 0;

  if (open) {
    const { plan, record, ds } = open;
    const close = ds.sClose[endIndex]!;
    const interest = interestOf(plan, endIndex);

    record.exitRawPrice = close;
    record.interest = interest;
    record.net = plan.shares * close - principal - interest;
    unrealizedAtEnd = record.net;
    costsPaid += record.costs;
  }

  const lastSessionTime = sTime[endIndex]!;
  const heldDays = lots.reduce(
    (total, lot) =>
      total + ((lot.exitIndex >= 0 ? sTime[lot.exitIndex]! : lastSessionTime) - sTime[lot.entryIndex]!) / 86400,
    0
  );

  return {
    net: realized + unrealizedAtEnd,
    realized,
    unrealized: unrealizedAtEnd,
    interest: lots.reduce((total, lot) => total + lot.interest, 0),
    costs: costsPaid,
    minuteDrawdown: minuteTracker.stats(),
    dailyDrawdown: dailyTracker.stats(),
    marks,
    liquidation,
    segments: segments.map((segment) => ({
      from: segment.from,
      startMark: segment.startMark,
      startLiquidation: segment.startLiquidation,
      endMark: marks[endIndex]!,
      endLiquidation: liquidation[endIndex]!,
      minute: segment.minute.stats(),
      daily: segment.daily.stats()
    })),
    lots,
    switches,
    decisions: counts.decisions,
    granted: counts.granted,
    refused: counts.refused,
    refusalReasons: counts.refusalReasons,
    heldSessions,
    heldDays,
    reservationsAtEnd: counts.reservationsAtEnd
  };

  void interestPaid;
};

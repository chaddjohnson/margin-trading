// The shadow-capable pooled replay (PROTOCOL.md §5): Priority 3's runPool (src/vg-d1-growth-joint/pool.ts, sha256
// 8f5f2ec0…, unchanged and still used by every earlier study) copied statement for statement, plus the EXPERIMENTAL,
// allocator-level SHADOW-POSITION ENTRY ELIGIBILITY, each insertion marked `SHADOW`. Priority 3's files are not edited
// (their executable identity stays the historical one). With every toggle OFF (the default) no SHADOW code runs: the
// result equals runPool's field for field (tests/allocator.test.ts; stage V parity).
//
// The four kinds of object (never mixed):
//   1. a REJECTED ENTRY SIGNAL — a virtual decision of a book refused at its own instant because the one slot was
//      occupied or reserved ("slot occupied");
//   2. its HYPOTHETICAL SHADOW POSITION — the book's own virtual trade, which the book keeps under its canonical rules
//      (L0: a refusal never feeds back) from the decision to its final virtual exit;
//   3. PERSISTENT ELIGIBILITY — while that hypothetical trade is still open, the refused opportunity may compete for
//      capital whenever the slot is released (an eligibility EPISODE; ON only for books whose toggle is ON);
//   4. an ACTUAL FUNDED POSITION — a lot of the one slot: either granted at its own decision (it mirrors the virtual
//      trade, Priority 3's rule) or a DELAYED REAL ENTRY granted to an eligible episode, which is a NEW position with
//      completely independent state (position.ts: its own fill, shares, costs, interest, trailing stop, hold clock,
//      initial stop and retention), whose exits never follow the hypothetical trade.
//
// THE RULES (frozen before any search; PROTOCOL.md §5.2):
//   - an episode starts at a refusal with reason "slot occupied" of a book whose toggle is ON (also when the occupant is
//     the book's own delayed lot or order); each book has at most one live episode (a book decides only when its
//     virtual trade has exited, so a second refusal while the first hypothetical trade is open is impossible: asserted);
//   - it ends (a) at its hypothetical trade's final virtual exit (eligibility = [decision time, final exit time)), (b)
//     when it is consumed by a delayed real entry, or (c) at the door's end; there is no other expiry, no price guard
//     and no re-check of the entry predicates (the open hypothetical position IS the eligibility);
//   - a RELEASE is the final exit of the funded lot at bar k of session s of its symbol; the release is known at the end
//     of that minute: the release check instant D = the bar's start + 60 s (the closing print: the session's close);
//   - at D, decisions stamped ≤ D are taken first in the frozen tie order (FRESH SIGNALS FIRST: Priority 3's rule for a
//     fresh decision is unchanged); then, if the slot is still free and D lies in a fundable session (funding start,
//     blackouts), the live episodes whose hypothetical trade is still open strictly after D compete in the SAME frozen
//     same-instant tie order (D1 first, then GDX before VGT: D1:GDX, D1:VGT, G:GDX, G:VGT); the first is granted, the
//     others stay live (they may compete at the next release); an episode whose hypothetical exit is at or before D has
//     ended (a hypothetical exit at the release instant is not open);
//   - a granted delayed entry reserves the slot like any order and fills at its book's own fill rule from D (the first
//     trade of its symbol at or after D; the closing print only before the close; else the next session's first trade);
//     its funded lot is then managed only by its own independent state (fills from position.ts);
//   - a delayed entry never preempts or displaces a funded position; the one-slot rule is unchanged; a decision refused
//     while a delayed lot or order holds the slot is recorded as DISPLACED by it.
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { secondsPerYear } from '../shared-margin-portfolio/strategy.ts';
import type { Dataset } from '../four-family/data.ts';
import { type Sym, economics, symbols } from '../vg-d1-growth-joint/context.ts';
import { type BookId, type VBook, type VFill, type VTrade, familyOf, symbolOf } from '../vg-d1-growth-joint/books.ts';
import {
  type DrawdownView,
  type FundingRecord,
  type Lot,
  type LotFill,
  type PoolOptions,
  type PoolResult,
  type Priority,
  tieOrderOf
} from '../vg-d1-growth-joint/pool.ts';
import type { RealPath } from './position.ts';

export { tieOrderOf };
export type { DrawdownView, FundingRecord, Lot, LotFill, PoolOptions, PoolResult, Priority };

// The N-book engine's book order for exits and fills (VGT before the others, then alphabetically): with one funded
// slot it never changes a result, it only fixes the order of the ledger.
const exitOrder: Sym[] = ['VGT', 'GDX'];

// ----- SHADOW: configuration and records -----

export type Toggles = Partial<Record<BookId, boolean>>;

export interface ShadowOptions {
  toggles: Toggles; // the books whose refused entries establish eligibility episodes (absent/false: OFF)
  // the delayed real entry of a book from an order at (session s, instant D): position.ts on the book's own exit
  // configuration (built by the evaluation, which knows each book's parameters and friction)
  realPath: (book: BookId, s: number, D: number) => RealPath;
}

export const anyToggle = (t: Toggles | undefined) => Boolean(t && Object.values(t).some(Boolean));

export interface ReleaseLoss {
  D: number; // the release check instant
  reason:
    'competing fresh entry' | 'higher-priority shadow' | 'blackout' | 'before the funding start' | 'not executable';
  winner: string; // the book that took the slot ('' when none)
}

export interface ShadowEpisode {
  index: number;
  book: BookId;
  trade: number; // the virtual (hypothetical) trade id
  kind: string;
  dS: number; // the original signal: decision session, time and price
  dT: number;
  dPrice: number;
  occupant: string; // the capital-pool occupant at the refusal
  occupantBook: BookId | null;
  occupantDelayed: boolean; // the occupant was a delayed lot or order
  ownOccupant: boolean; // the occupant was this book's own delayed lot or order
  hyp: {
    eS: number; // the hypothetical entry (−1: never filled before the door's end)
    eT: number;
    ePrice: number;
    xS: number; // the hypothetical final exit (−1: open at the door's end)
    xT: number; // its time (Infinity while open at the end)
    xPrice: number;
    xReason: string;
    vNet: number; // the hypothetical trade's own net on the $100,000 notional (marked at the end while open)
  };
  releases: number; // release checks it took part in while live
  losses: ReleaseLoss[];
  end: { reason: 'hypothetical exit' | 'consumed' | 'door end'; t: number };
  persistedToRelease: boolean; // live at at least one release check (capital became available while it was open)
  delayed: null | {
    D: number;
    decisionS: number;
    decisionPrice: number;
    lotId: number; // the funded lot (−1: pending at the end, or blocked)
    blocked: string | null;
    eS: number;
    eT: number;
    eRaw: number;
    ePrice: number;
    waitSessions: number; // sessions from the refused decision to the delayed decision
    waitDays: number; // calendar days (decision time to D)
  };
}

export interface DelayedLotInfo {
  episode: number;
  displaced: { book: BookId; trade: number; dT: number; vNet: number }[]; // refusals while it held the slot
}

export interface ShadowResult {
  toggles: Toggles;
  episodes: ShadowEpisode[];
  releaseChecks: number;
  delayedLots: Map<number, DelayedLotInfo>; // lot id → its episode and displaced decisions
}

export type ShadowPoolResult = PoolResult & { shadow?: ShadowResult };

const view = (t: Tracker): DrawdownView => {
  const s = t.stats();

  return { max: s.maximum, peakT: s.peakTime, troughT: s.troughTime, recoveryT: s.recoveryTime };
};

const allBooks: BookId[] = ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'];

// The time at which a release by a fill at (s, k) of `ds` is known: the end of that minute, or the close.
export const releaseInstant = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bTime[ds.sBarStart[s]! + k]! + 60 : ds.sCloseTime[s]!;

// The hypothetical trade's final exit time (Infinity while open at the end or never filled).
const finalExitOf = (v: VTrade) => {
  const last = v.fills.at(-1);

  return last && !last.partial ? last : null;
};

export const runShadowPool = (
  datasets: Record<Sym, Dataset>,
  books: readonly VBook[],
  first: Priority,
  options: PoolOptions = {},
  shadowOptions?: ShadowOptions
): ShadowPoolResult => {
  const budget = options.budget ?? economics.budget;
  const rate = options.rate ?? economics.rate;
  const enabled = (b: BookId) => options.enabled?.[b] !== false;
  const order = (options.tieOrder ?? tieOrderOf(first)).filter((b) => books.some((x) => x.book === b));

  if (options.tieOrder && new Set(options.tieOrder).size !== 4)
    throw new Error('a tie order names all four books once');
  const bookOf = new Map(books.map((b) => [b.book, b]));

  if (bookOf.size !== books.length) throw new Error('a book is given twice');

  // the instruments of the timeline: the symbols that have a book (the N-book engine's market securities)
  const syms = symbols.filter((s) => books.some((b) => symbolOf(b.book) === s));
  const ref = datasets[syms[0] ?? 'VGT'];
  const sessionCount = ref.sessionCount;
  const endIndex = Math.min(options.endIndex ?? Math.max(0, ...books.map((b) => b.endIndex)), sessionCount - 1);
  const origin = options.originIndex ?? 0;
  const fundFrom = options.fundFrom ?? 0;
  const detail = options.detail ?? false;
  const cursor = new Map<BookId, number>(order.map((b) => [b, 0]));
  const lists = new Map<BookId, VTrade[]>(order.map((b) => [b, bookOf.get(b)!.trades]));
  const lots: Lot[] = [];
  const funding: FundingRecord[] = [];
  const decisions = Object.fromEntries(allBooks.map((b) => [b, { total: 0, granted: 0, refused: 0 }])) as Record<
    BookId,
    { total: number; granted: number; refused: number }
  >;
  const refusals: Record<string, number> = {};
  let open: Lot | null = null; // the one funded slot
  let reserved: VTrade | null = null; // a granted order awaiting its fill
  let realized = 0;
  let lotId = 0;
  let marks = 0;
  let nextExit = 0; // index of the open lot's next exit fill

  // SHADOW: state (inert unless a toggle is ON)
  const shadowOn = anyToggle(shadowOptions?.toggles);
  const toggles: Toggles = shadowOn ? { ...shadowOptions!.toggles } : {};
  const episodes: ShadowEpisode[] = [];
  const live = new Map<BookId, ShadowEpisode>(); // ≤ 1 live episode per book
  const delayedTrades = new Map<VTrade, ShadowEpisode>(); // a delayed order/lot's trade → its episode
  const delayedLots = new Map<number, DelayedLotInfo>();
  let pendingRelease = Infinity; // the next release check instant
  let pendingReleaseS = -1; // its session (the release fill's session: D ≤ that session's close)
  let releaseChecks = 0;
  const delayedInfoOfTrade = new Map<VTrade, DelayedLotInfo>();

  if (shadowOn) {
    for (const b of Object.keys(toggles) as BookId[])
      if (!allBooks.includes(b)) throw new Error(`unknown book ${b} in the shadow toggles`);
  }

  const blackedOut = (s: number) => (options.blackouts ?? []).some((b) => s >= b.first && s <= b.last);
  const occupant = () =>
    open
      ? `${open.book} lot ${open.id} ($${open.principal.toFixed(2)})`
      : reserved
        ? `${reserved.book} order ($${budget.toFixed(2)})`
        : '';

  // SHADOW: an episode's hypothetical trade is open strictly after `t`
  const hypOpenAfter = (ep: ShadowEpisode, t: number) => ep.hyp.xT > t;

  // SHADOW: a refusal of an eligible book opens an episode
  const openEpisode = (b: BookId, trade: VTrade) => {
    const prev = live.get(b);

    if (prev) {
      if (hypOpenAfter(prev, trade.dT))
        throw new Error(`${b}: a second refused decision (trade ${trade.id}) while episode ${prev.index} is open`);
      prev.end = { reason: 'hypothetical exit', t: prev.hyp.xT };
      live.delete(b);
    }

    const x = finalExitOf(trade);
    const occ: VTrade | null = open ? (open as Lot).trade : reserved;
    const ep: ShadowEpisode = {
      index: episodes.length,
      book: b,
      trade: trade.id,
      kind: trade.kind,
      dS: trade.dS,
      dT: trade.dT,
      dPrice: trade.dPrice,
      occupant: occupant(),
      occupantBook: open?.book ?? reserved?.book ?? null,
      occupantDelayed: occ !== null && delayedTrades.has(occ),
      ownOccupant: occ !== null && delayedTrades.has(occ) && occ.book === b,
      hyp: {
        eS: trade.eS,
        eT: trade.eT,
        ePrice: trade.ePrice,
        xS: x ? x.s : -1,
        xT: x ? x.t : Infinity,
        xPrice: x ? x.price : NaN,
        xReason: x ? x.reason : trade.eS < 0 ? 'never filled' : 'open at the end',
        vNet: trade.vNet
      },
      releases: 0,
      losses: [],
      end: { reason: 'door end', t: Infinity },
      persistedToRelease: false,
      delayed: null
    };

    episodes.push(ep);
    live.set(b, ep);
  };

  const decide = (b: BookId, trade: VTrade) => {
    const d = decisions[b];
    let reason = '';
    let grant = 0;

    d.total++;

    if (!enabled(b)) reason = 'component disabled';
    else if (trade.dS < fundFrom) reason = 'before the funding start';
    else if (blackedOut(trade.dS)) reason = 'blackout';
    else if (
      (open?.book === b && !(shadowOn && delayedTrades.has(open.trade))) ||
      (reserved?.book === b && !(shadowOn && delayedTrades.has(reserved)))
    )
      throw new Error(`${b} decided while it holds a lot or an order (trade ${trade.id})`);
    else if (open || reserved) reason = 'slot occupied';
    else grant = budget;

    if (grant > 0) d.granted++;
    else {
      d.refused++;
      refusals[reason] = (refusals[reason] ?? 0) + 1;
    }

    if (detail)
      funding.push({
        book: b,
        trade: trade.id,
        kind: trade.kind,
        s: trade.dS,
        t: trade.dT,
        price: trade.dPrice,
        grant,
        outcome: grant > 0 ? 'granted' : 'refused',
        reason,
        occupant: occupant(),
        occupantBook: open?.book ?? reserved?.book ?? null
      });

    if (grant > 0) reserved = trade;
    else if (shadowOn && reason === 'slot occupied') {
      // SHADOW: a decision refused while a delayed lot or order holds the slot was displaced by it
      const occ: VTrade = open ? (open as Lot).trade : reserved!;
      const info = delayedInfoOfTrade.get(occ);

      if (info) info.displaced.push({ book: b, trade: trade.id, dT: trade.dT, vNet: trade.vNet });
      if (toggles[b]) openEpisode(b, trade);
    }
  };

  // SHADOW: the release check at D (after every decision stamped ≤ D)
  const releaseCheck = (D: number) => {
    const s = pendingReleaseS;

    pendingRelease = Infinity;
    pendingReleaseS = -1;
    releaseChecks++;

    const candidates: ShadowEpisode[] = [];

    for (const b of order) {
      const ep = live.get(b);

      if (!ep) continue;
      if (!hypOpenAfter(ep, D)) {
        ep.end = { reason: 'hypothetical exit', t: ep.hyp.xT };
        live.delete(b);
        continue;
      }
      ep.releases++;
      ep.persistedToRelease = true;
      candidates.push(ep);
    }

    if (candidates.length === 0) return;

    const loseAll = (reason: ReleaseLoss['reason'], winner: string) => {
      for (const ep of candidates) ep.losses.push({ D, reason, winner });
    };

    if (open || reserved) return loseAll('competing fresh entry', (open as Lot | null)?.book ?? reserved!.book);

    if (s < fundFrom) return loseAll('before the funding start', '');
    if (blackedOut(s)) return loseAll('blackout', '');

    for (let i = 0; i < candidates.length; i++) {
      const ep = candidates[i]!;
      const path = shadowOptions!.realPath(ep.book, s, D);
      const dsB = datasets[symbolOf(ep.book)];

      if (path.blocked) {
        ep.losses.push({ D, reason: 'not executable', winner: '' });
        continue;
      }

      // granted: the delayed real entry (a new position; the episode is consumed)
      const trade: VTrade = {
        book: ep.book,
        id: -(ep.index + 1),
        kind: `delayed:${ep.kind}`,
        dS: s,
        dT: D,
        dPrice: path.decisionPrice,
        eS: path.eS,
        eK: path.eK,
        eT: path.eT,
        eRaw: path.eRaw,
        ePrice: path.ePrice,
        fills: path.fills,
        open: path.open,
        vNet: path.net,
        vInterest: path.interest
      };

      ep.delayed = {
        D,
        decisionS: s,
        decisionPrice: path.decisionPrice,
        lotId: -1,
        blocked: null,
        eS: path.eS,
        eT: path.eT,
        eRaw: path.eRaw,
        ePrice: path.ePrice,
        waitSessions: s - ep.dS,
        waitDays: (dsB.sTime[s]! - dsB.sTime[ep.dS]!) / 86400
      };
      ep.end = { reason: 'consumed', t: D };
      live.delete(ep.book);
      delayedTrades.set(trade, ep);

      const info: DelayedLotInfo = { episode: ep.index, displaced: [] };

      delayedInfoOfTrade.set(trade, info);
      reserved = trade;
      for (const other of candidates.slice(i + 1))
        other.losses.push({ D, reason: 'higher-priority shadow', winner: ep.book });
      return;
    }
  };

  // every decision of every book stamped ≤ t, in time order; the same instant → the tie order
  // SHADOW: a pending release check at D runs after the decisions stamped ≤ D (fresh signals first)
  const decideUntil = (t: number) => {
    for (;;) {
      let best: BookId | null = null;
      let bestT = Infinity;

      for (const b of order) {
        const tr = lists.get(b)![cursor.get(b)!];

        if (tr && tr.dT <= t && tr.dT < bestT) {
          best = b;
          bestT = tr.dT;
        }
      }

      if (shadowOn && pendingRelease <= t && pendingRelease < bestT) {
        releaseCheck(pendingRelease);
        continue;
      }

      if (!best) return;

      const i = cursor.get(best)!;

      cursor.set(best, i + 1);
      decide(best, lists.get(best)![i]!);
    }
  };

  const nextDecisionTime = () => {
    let t = Infinity;

    for (const b of order) {
      const tr = lists.get(b)![cursor.get(b)!];

      if (tr && tr.dT < t) t = tr.dT;
    }
    return shadowOn ? Math.min(t, pendingRelease) : t;
  };

  const openLot = (trade: VTrade) => {
    reserved = null;

    const ds = datasets[symbolOf(trade.book)];
    let shares = budget / trade.ePrice;
    let principal = budget;

    if (options.wholeShares) {
      shares = Math.floor(shares + 1e-9);
      principal = shares * trade.ePrice;
    }

    if (!(shares > 0)) return;

    const lot: Lot = {
      id: ++lotId,
      book: trade.book,
      family: familyOf(trade.book),
      symbol: symbolOf(trade.book),
      trade,
      principal0: principal,
      shares0: shares,
      shares,
      principal,
      entryS: trade.eS,
      entryT: trade.eT,
      entryRaw: trade.eRaw,
      entryPrice: trade.ePrice,
      entryTs: ds.sTime[trade.eS]!,
      fills: [],
      realized: 0,
      interest: 0,
      open: true,
      net: 0,
      unrealized: 0,
      costs: shares * (trade.ePrice - trade.eRaw),
      worst: Infinity,
      worstT: NaN,
      best: -Infinity,
      bestT: NaN
    };

    lots.push(lot);
    open = lot;
    nextExit = 0;

    // SHADOW: a delayed lot is linked to its episode
    if (shadowOn) {
      const ep = delayedTrades.get(trade);

      if (ep) {
        ep.delayed!.lotId = lot.id;
        delayedLots.set(lot.id, delayedInfoOfTrade.get(trade)!);
      }
    }
  };

  const exitFill = (lot: Lot, f: VFill) => {
    const sTime = datasets[lot.symbol].sTime[f.s]!;
    const sold = f.partial
      ? options.wholeShares
        ? Math.floor(lot.shares * f.f + 1e-9)
        : lot.shares * f.f
      : lot.shares;
    const repaid = f.partial ? (options.wholeShares ? sold * lot.entryPrice : lot.principal * f.f) : lot.principal;
    const interest = repaid * rate * ((sTime - lot.entryTs) / secondsPerYear);
    const proceeds = sold * f.price;
    const net = proceeds - repaid - interest;

    lot.fills.push({
      s: f.s,
      k: f.k,
      t: f.t,
      raw: f.raw,
      price: f.price,
      partial: f.partial,
      shares: sold,
      principal: repaid,
      interest,
      proceeds,
      net,
      reason: f.reason
    });
    lot.realized += net;
    lot.interest += interest;
    lot.costs += sold * (f.raw - f.price);
    realized += net;

    if (f.partial) {
      lot.shares = lot.shares - sold;
      lot.principal = lot.principal - repaid;
    } else {
      lot.shares = 0;
      lot.principal = 0;
      lot.open = false;
      lot.net = lot.realized;
      open = null;
      // SHADOW: the slot is released; the check runs at the end of the release minute (or at the close)
      if (shadowOn) {
        pendingRelease = releaseInstant(datasets[lot.symbol], f.s, f.k);
        pendingReleaseS = f.s;
      }
    }
  };

  // the open lot's exit fills due at (s, k) of its symbol (in book order; a lot's fills are in time order)
  const exitsAt = (s: number, sym: Sym, k: number) => {
    while (open && open.symbol === sym) {
      const f = open.trade.fills[nextExit];

      if (!f || f.s !== s || f.k !== k) return;
      nextExit++;
      exitFill(open, f);
    }
  };

  // ----- the timeline -----

  const minute = new Tracker(0, ref.bTime[ref.sBarStart[origin]!]!);
  const sessionT = new Tracker(0, ref.sTime[origin]!);
  const boundaries = [...(options.periods ?? [])].sort((a, b) => a - b);
  const periodTrackers: { boundary: number; equity: number; tracker: Tracker | null }[] = boundaries.map((b) => ({
    boundary: b,
    equity: NaN,
    tracker: null
  }));
  const daily = new Float64Array(sessionCount).fill(NaN);
  const principalAtClose = new Float64Array(sessionCount);
  const valueAtClose = new Float64Array(sessionCount);
  const heldAtClose = new Int8Array(sessionCount).fill(-1);
  const bookIndex = new Map(tieOrderOf('D1').map((b, i) => [b, i]));
  let peakPrincipal = 0;
  let peakValue = 0;
  let sessionsHeld = 0;

  const markOf = (lot: Lot, price: number, sTime: number) =>
    lot.shares * price - lot.principal - lot.principal * rate * ((sTime - lot.entryTs) / secondsPerYear);
  const lotMark = (lot: Lot, price: number, sTime: number, t: number) => {
    const m = lot.realized + markOf(lot, price, sTime);

    if (m < lot.worst) {
      lot.worst = m;
      lot.worstT = t;
    }
    if (m > lot.best) {
      lot.best = m;
      lot.bestT = t;
    }
  };
  const markChanges = options.recordMarks ? { t: [] as number[], v: [] as number[] } : null;
  const record = (value: number, t: number) => {
    if (markChanges && markChanges.v.at(-1) !== value) {
      markChanges.t.push(t);
      markChanges.v.push(value);
    }
    minute.updateStrict(value, t);
    for (const p of periodTrackers) if (p.tracker) p.tracker.updateStrict(value, t);
    marks++;
  };

  const ix = new Map<Sym, number>(); // the next bar index of each symbol in the current session

  for (let s = origin; s <= endIndex; s++) {
    const sTime = ref.sTime[s]!;
    const closeTime = ref.sCloseTime[s]!;
    let held = open !== null;
    const noDecision = nextDecisionTime() > closeTime;
    // Flat with nothing reserved and no decision before the close: nothing can happen inside the session.
    const skipBars = !open && !reserved && noDecision;
    // Held, quiet: no decision, no fill and no exit of the funded lot inside the session — its symbol's regular
    // minutes are marked in a tight loop with the same expressions (bit-identical marks).
    const lotNow = open as Lot | null;
    const quiet =
      lotNow !== null &&
      noDecision &&
      !reserved &&
      !(lotNow.trade.fills[nextExit] && lotNow.trade.fills[nextExit]!.s === s);

    if (quiet && lotNow) {
      const ds = datasets[lotNow.symbol];
      const start = ds.sBarStart[s]!;
      const count = ds.sBarCount[s]!;
      const interest = lotNow.principal * rate * ((sTime - lotNow.entryTs) / secondsPerYear);

      if (lotNow.principal > peakPrincipal) peakPrincipal = lotNow.principal;

      for (let k = 0; k < count; k++) {
        const price = ds.bClose[start + k]!;
        const mv = lotNow.shares * price;

        if (mv > peakValue) peakValue = mv;
        if (detail) lotMark(lotNow, price, sTime, ds.bTime[start + k]!);
        record(realized + (mv - lotNow.principal - interest), ds.bTime[start + k]!);
      }
    } else if (!skipBars) {
      for (const sym of syms) ix.set(sym, 0);

      for (;;) {
        // the next bar start of either symbol
        let T = Infinity;

        for (const sym of syms) {
          const ds = datasets[sym];
          const k = ix.get(sym)!;

          if (k < ds.sBarCount[s]!) T = Math.min(T, ds.bTime[ds.sBarStart[s]! + k]!);
        }

        if (T === Infinity) break;

        const heldBefore: Sym | null = open ? (open as Lot).symbol : null;

        decideUntil(T);

        // the symbols printing at T, in the exit/fill book order
        let markHeld = false;

        for (const sym of exitOrder) {
          if (!syms.includes(sym)) continue;

          const ds = datasets[sym];
          const k = ix.get(sym)!;

          if (!(k < ds.sBarCount[s]! && ds.bTime[ds.sBarStart[s]! + k] === T)) continue;
          exitsAt(s, sym, k);
        }

        for (const sym of exitOrder) {
          if (!syms.includes(sym)) continue;

          const ds = datasets[sym];
          const k = ix.get(sym)!;

          if (!(k < ds.sBarCount[s]! && ds.bTime[ds.sBarStart[s]! + k] === T)) continue;

          const r = reserved as VTrade | null;

          if (r && symbolOf(r.book) === sym && r.eS === s && r.eK === k) {
            openLot(r);
            // a funded lot's exits at its own fill bar (the initial risk stop may act in the fill minute)
            exitsAt(s, sym, k);
          }
        }

        // the mark: a held (before or after) lot's symbol prints at T
        const lotAfter = open as Lot | null;

        for (const sym of syms) {
          const ds = datasets[sym];
          const k = ix.get(sym)!;

          if (!(k < ds.sBarCount[s]! && ds.bTime[ds.sBarStart[s]! + k] === T)) continue;
          if (sym === heldBefore || sym === lotAfter?.symbol) markHeld = true;
        }

        if (lotAfter) held = true;

        if (markHeld) {
          let value = realized;

          if (lotAfter) {
            const ds = datasets[lotAfter.symbol];
            const price = ds.bClose[ds.sBarStart[s]! + ix.get(lotAfter.symbol)!]!;
            const mv = lotAfter.shares * price;

            if (mv > peakValue) peakValue = mv;
            if (lotAfter.principal > peakPrincipal) peakPrincipal = lotAfter.principal;
            if (detail) lotMark(lotAfter, price, sTime, T);
            value += markOf(lotAfter, price, sTime);
          }

          record(value, T);
        }

        for (const sym of syms) {
          const ds = datasets[sym];
          const k = ix.get(sym)!;

          if (k < ds.sBarCount[s]! && ds.bTime[ds.sBarStart[s]! + k] === T) ix.set(sym, k + 1);
        }
      }

      // the close: decisions stamped ≤ the close, the closing-print exits and fills of each symbol
      decideUntil(closeTime);

      for (const sym of exitOrder) if (syms.includes(sym)) exitsAt(s, sym, datasets[sym].sBarCount[s]!);
      for (const sym of exitOrder) {
        if (!syms.includes(sym)) continue;

        const r = reserved as VTrade | null;
        const count = datasets[sym].sBarCount[s]!;

        if (r && symbolOf(r.book) === sym && r.eS === s && r.eK === count) {
          openLot(r);
          exitsAt(s, sym, count);
        }
      }
    }

    const lotClose = open as Lot | null;
    let closeValue = realized;

    if (lotClose) {
      const price = datasets[lotClose.symbol].sClose[s]!;
      const mv = lotClose.shares * price;

      if (mv > peakValue) peakValue = mv;
      if (lotClose.principal > peakPrincipal) peakPrincipal = lotClose.principal;
      if (detail) lotMark(lotClose, price, sTime, closeTime);
      closeValue += markOf(lotClose, price, sTime);
      valueAtClose[s] = mv;
      principalAtClose[s] = lotClose.principal;
      heldAtClose[s] = bookIndex.get(lotClose.book)!;
      held = true;
    }

    record(closeValue, closeTime);
    sessionT.updateStrict(closeValue, sTime);
    daily[s] = closeValue;
    if (held) sessionsHeld++;

    // a period starts after its boundary's close: its tracker's peak is the marked net at that close
    for (const p of periodTrackers)
      if (p.boundary === s) {
        p.equity = closeValue;
        p.tracker = new Tracker(closeValue, closeTime);
      }
  }

  // the end: the open lot marked at the last close with its accrued interest (no exit cost)
  let unrealized = 0;
  const last = open as Lot | null;

  if (last) {
    const ds = datasets[last.symbol];
    const accrued = last.principal * rate * ((ds.sTime[endIndex]! - last.entryTs) / secondsPerYear);
    const mark = last.shares * ds.sClose[endIndex]! - last.principal - accrued;

    last.unrealized = mark;
    last.interest += accrued;
    last.net = last.realized + mark;
    unrealized = mark;
    if (last.trade.fills[nextExit] && last.trade.fills[nextExit]!.s <= endIndex)
      throw new Error(`an exit fill was skipped (lot ${last.id})`);
  }

  const result: ShadowPoolResult = {
    endIndex,
    net: realized + unrealized,
    realized,
    unrealized,
    dd: view(minute),
    ddDaily: view(sessionT),
    periods: periodTrackers.map((p) => ({
      boundary: p.boundary,
      equity: p.equity,
      dd: p.tracker ? view(p.tracker) : { max: 0, peakT: NaN, troughT: NaN, recoveryT: NaN }
    })),
    lots,
    funding,
    daily,
    principalAtClose,
    valueAtClose,
    heldAtClose,
    peakPrincipal,
    peakValue,
    sessionsHeld,
    decisions,
    refusals,
    marks,
    markChanges
  };

  // SHADOW: the episodes' ends (a live episode whose hypothetical trade exited by the end ended there)
  if (shadowOn) {
    const endT = ref.sCloseTime[endIndex]!;

    for (const ep of live.values())
      ep.end = ep.hyp.xT <= endT ? { reason: 'hypothetical exit', t: ep.hyp.xT } : { reason: 'door end', t: endT };
    result.shadow = { toggles, episodes, releaseChecks, delayedLots };
  }

  return result;
};

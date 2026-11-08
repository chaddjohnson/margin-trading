// The pooled replay (PROTOCOL.md §6): one chronological minute timeline over the door's common sessions — each session's
// minute bars of both symbols merged by time — one $100,000 principal ledger and ONE exclusive funded slot
// (architecture A), the four virtual books as signal sources.
//
// FUNDING. A virtual trade can be funded only at its own decision (time dT) and only from its own fill on: nothing is
// funded later, replayed or topped up, and a refusal never feeds back into the book (the book keeps its virtual trade,
// waits for its virtual exit and decides again only under its own canonical rules; capital freed in between does not
// revive the refused trade). At dT the allocator decides once from the state known at dT, before any trade stamped dT:
// grant $100,000 iff no lot is open and no order is reserved; otherwise refuse ("slot occupied"). A retained Growth
// remainder after a partial exit keeps the slot until its final exit; repaid principal stays idle. No preemption, no
// forced switch, no ranking. Same-instant decisions are taken in the frozen tie order: the families in the declared
// priority (D1-first or Growth-first), then the symbols alphabetically (GDX, VGT — the shadow policy's order, VG #2's
// native order). A granted decision reserves its principal until its fill (the book's own fill rule: the next trade of
// its symbol after dT), then opens the funded lot.
//
// THE FUNDED LOT. Its own principal P, shares P ÷ (fill price after cost) (fractional, the canonical convention), its
// own interest from its fill session on its outstanding principal, and the virtual trade's exit fills (every exit rule
// of both families is scale-invariant, so a funded lot exits exactly when and where its virtual lot does, with the same
// fractions). Fills use the canonical formulas (FixedLedger / ShadowBook / PositionRules): proceeds = shares × price;
// interest = principal × rate × calendar days ÷ 365; net = proceeds − principal − interest.
//
// ORDER AT ONE INSTANT T (a bar start of either symbol, or the session close): decisions stamped ≤ T (tie order), then
// the exits (and partial sales) at T of the symbol(s) printing at T, then the fills at T (then a new lot's exits due in
// its own fill minute), then the mark. Marks: realized + the open lot (shares × its symbol's latest price − outstanding
// principal − its interest to the session date), into strict trackers at every minute at which the held (or just
// closed or opened) lot's symbol prints, and at every session close — the N-book engine's fixed-mode marking
// (src/portfolio-aware-d1/nbook/engine.ts markFixed: a lot is re-marked when its own symbol prints). With one symbol
// this is exactly src/vgt-d1-growth-joint/allocator.ts runPool under A.
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { secondsPerYear } from '../shared-margin-portfolio/strategy.ts';
import type { Dataset } from '../four-family/data.ts';
import { type Sym, economics, symbols } from './context.ts';
import { type BookId, type Family, type VBook, type VFill, type VTrade, familyOf, symbolOf } from './books.ts';

export type Priority = 'D1' | 'G';

export const tieOrderOf = (first: Priority): BookId[] =>
  first === 'D1' ? ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'] : ['G:GDX', 'G:VGT', 'D1:GDX', 'D1:VGT'];

// The N-book engine's book order for exits and fills (VGT before the others, then alphabetically): with one funded
// slot it never changes a result, it only fixes the order of the ledger.
const exitOrder: Sym[] = ['VGT', 'GDX'];

export interface PoolOptions {
  budget?: number;
  rate?: number;
  wholeShares?: boolean; // report-only sensitivity: shares rounded down to whole shares
  fundFrom?: number; // session index: no decision before it is funded (the funding start)
  blackouts?: readonly { first: number; last: number }[]; // diagnostics: no new funding in these sessions
  enabled?: Partial<Record<BookId, boolean>>; // a disabled component is never funded (single-family controls, removal)
  endIndex?: number;
  originIndex?: number; // the trackers' origin session (default 0)
  periods?: readonly number[]; // boundary session indices (period minute drawdowns reset at each boundary close)
  detail?: boolean; // keep the funding log, lots' marks and daily rows
  recordMarks?: boolean; // keep every change of the minute-marked net (t, value) — slices and charts only
}

export interface FundingRecord {
  book: BookId;
  trade: number;
  kind: string;
  s: number;
  t: number;
  price: number;
  grant: number;
  outcome: 'granted' | 'refused';
  reason: string;
  occupant: string;
  occupantBook: BookId | null;
}

export interface LotFill {
  s: number;
  k: number;
  t: number;
  raw: number;
  price: number;
  partial: boolean;
  shares: number;
  principal: number;
  interest: number;
  proceeds: number;
  net: number;
  reason: string;
}

export interface Lot {
  id: number;
  book: BookId;
  family: Family;
  symbol: Sym;
  trade: VTrade;
  principal0: number;
  shares0: number;
  shares: number; // outstanding
  principal: number; // outstanding
  entryS: number;
  entryT: number;
  entryRaw: number;
  entryPrice: number;
  entryTs: number; // the entry session's midnight UTC (interest accrues from here)
  fills: LotFill[];
  realized: number;
  interest: number;
  open: boolean;
  net: number;
  unrealized: number;
  costs: number;
  worst: number; // MAE: the lowest mark of this lot (realized fills + remainder), dollars
  worstT: number;
  best: number;
  bestT: number;
}

export interface DrawdownView {
  max: number;
  peakT: number;
  troughT: number;
  recoveryT: number;
}

export interface Decisions {
  total: number;
  granted: number;
  refused: number;
}

export interface PoolResult {
  endIndex: number;
  net: number;
  realized: number;
  unrealized: number;
  dd: DrawdownView;
  ddDaily: DrawdownView;
  periods: { boundary: number; equity: number; dd: DrawdownView }[];
  lots: Lot[];
  funding: FundingRecord[];
  daily: Float64Array; // marked net at each session close
  principalAtClose: Float64Array;
  valueAtClose: Float64Array;
  heldAtClose: Int8Array; // the book index (tie order D1-first) of the lot open at the close, −1 when flat
  peakPrincipal: number;
  peakValue: number;
  sessionsHeld: number;
  decisions: Record<BookId, Decisions>;
  refusals: Record<string, number>;
  marks: number;
  markChanges: { t: number[]; v: number[] } | null;
}

const view = (t: Tracker): DrawdownView => {
  const s = t.stats();

  return { max: s.maximum, peakT: s.peakTime, troughT: s.troughTime, recoveryT: s.recoveryTime };
};

const allBooks: BookId[] = ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'];

export const runPool = (
  datasets: Record<Sym, Dataset>,
  books: readonly VBook[],
  first: Priority,
  options: PoolOptions = {}
): PoolResult => {
  const budget = options.budget ?? economics.budget;
  const rate = options.rate ?? economics.rate;
  const enabled = (b: BookId) => options.enabled?.[b] !== false;
  const order = tieOrderOf(first).filter((b) => books.some((x) => x.book === b));
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
    Decisions
  >;
  const refusals: Record<string, number> = {};
  let open: Lot | null = null; // the one funded slot
  let reserved: VTrade | null = null; // a granted order awaiting its fill
  let realized = 0;
  let lotId = 0;
  let marks = 0;
  let nextExit = 0; // index of the open lot's next exit fill

  const blackedOut = (s: number) => (options.blackouts ?? []).some((b) => s >= b.first && s <= b.last);
  const occupant = () =>
    open
      ? `${open.book} lot ${open.id} ($${open.principal.toFixed(2)})`
      : reserved
        ? `${reserved.book} order ($${budget.toFixed(2)})`
        : '';

  const decide = (b: BookId, trade: VTrade) => {
    const d = decisions[b];
    let reason = '';
    let grant = 0;

    d.total++;

    if (!enabled(b)) reason = 'component disabled';
    else if (trade.dS < fundFrom) reason = 'before the funding start';
    else if (blackedOut(trade.dS)) reason = 'blackout';
    else if (open?.book === b || reserved?.book === b)
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
  };

  // every decision of every book stamped ≤ t, in time order; the same instant → the tie order
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
    return t;
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

  return {
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
};

// The pooled replay (PROTOCOL.md §4): one chronological minute timeline over the door's VGT sessions, one $100,000
// principal ledger, the two families' virtual books as signal sources.
//
// FUNDING. A virtual trade can be funded only at its own decision (time dT) and only from its own fill on: nothing is
// funded later, replayed or topped up. At dT the allocator decides once — grant, downsize or refuse — from the state
// known at dT (open lots, their outstanding principal, pending reservations), before any trade stamped dT:
//   A (exclusive slot): grant $100,000 iff no lot is open and no order is reserved (a retained Growth remainder keeps
//     the slot until its final exit; repaid principal stays idle).
//   B (shared residual capacity): capacity = $100,000 − outstanding principal − reservations; demand = the family's
//     target × $100,000; grant min(demand, capacity) iff ≥ the minimum executable allocation, else refuse.
// Same-instant decisions of the two families are taken in the configuration's priority order (D1-first or
// Growth-first); a family never has two decisions at one instant. A granted decision reserves its principal until the
// fill (the first trade after dT, the book's own fill rule), then opens the funded lot.
//
// THE FUNDED LOT. Its own principal P, shares P ÷ (fill price after cost) (fractional, the canonical convention), its
// own interest from its fill session on its outstanding principal, and the virtual trade's exit fills: every exit
// rule of both families is scale-invariant (the net-profit stop, the losing hold and the buffered loss compare
// shares × price − principal − interest with 0 or with −principal × buffer; retention sells a fraction of the current
// shares and principal), so the funded lot exits exactly when and where its virtual lot does, with the same fractions.
// A partial sale repays its share of the principal at once (capacity under B; idle under A). Fills use the
// canonical formulas (FixedLedger / ShadowBook / PositionRules): proceeds = shares × price; interest = principal ×
// rate × calendar days ÷ 365; net = proceeds − principal − interest.
//
// ORDER AT ONE INSTANT (both canonical engines' order): decisions stamped ≤ t, then the exits (and partial sales) at
// t, then the fills at t, then the mark at that minute's close (the closing print at the close). Marks: realized +
// Σ open lots (shares × price − outstanding principal − its interest to the session date), strict trackers per
// minute (every regular minute of a session in which a lot is held) and per session close.
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { secondsPerYear } from '../shared-margin-portfolio/strategy.ts';
import { economics } from './context.ts';
import type { Family, VBook, VTrade } from './books.ts';
import type { Dataset } from '../four-family/data.ts';

export type Arch = 'A' | 'B';
export type Priority = 'D1' | 'G';

export interface Allocation {
  arch: Arch;
  d1Target: number; // fraction of the budget (B only; A funds $100,000)
  gTarget: number;
  first: Priority; // same-instant priority
}

export interface PoolOptions {
  budget?: number;
  minimumAllocation?: number; // B: the smallest admissible principal
  rate?: number;
  wholeShares?: boolean; // report-only sensitivity: shares rounded down to whole shares
  fundFrom?: number; // session index: no decision before it is funded (the funding start)
  blackouts?: readonly { first: number; last: number }[]; // diagnostics: no new funding in these sessions
  enabled?: { D1: boolean; G: boolean }; // a disabled family is never funded (single-family controls, removal)
  endIndex?: number; // last session (default: the books' end)
  originIndex?: number; // the trackers' origin session (default 0)
  periods?: readonly number[]; // boundary session indices (period minute drawdowns reset at each boundary close)
  detail?: boolean; // keep the funding log, lots and daily rows
  recordMarks?: boolean; // keep every change of the minute-marked net (t, value) — slices and charts only
}

export const defaults = {
  minimumAllocation: 10_000
};

export interface FundingRecord {
  family: Family;
  trade: number;
  kind: string;
  s: number;
  t: number;
  price: number;
  demand: number;
  capacity: number;
  grant: number;
  outcome: 'granted' | 'downsized' | 'refused';
  reason: string;
  occupant: string;
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
  family: Family;
  trade: VTrade;
  principal0: number; // at the fill
  shares0: number;
  shares: number; // outstanding
  principal: number; // outstanding
  entryS: number;
  entryT: number;
  entryRaw: number;
  entryPrice: number;
  entryTs: number; // the entry session's midnight UTC (interest accrues from here)
  fills: LotFill[];
  realized: number; // Σ fills' net
  interest: number; // Σ fills' interest (+ accrued on the remainder at the end while open)
  open: boolean;
  net: number; // realized + the remainder's mark at the end
  unrealized: number;
  costs: number; // entry and exit friction in dollars (the fills' share of both)
  worst: number; // MAE: the lowest mark of this lot (its realized fills + remainder), dollars
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

export interface PoolResult {
  endIndex: number;
  net: number;
  realized: number;
  unrealized: number;
  dd: DrawdownView; // maximum minute drawdown of the marked net
  ddDaily: DrawdownView;
  periods: { boundary: number; equity: number; dd: DrawdownView }[];
  lots: Lot[];
  funding: FundingRecord[];
  daily: Float64Array; // marked net at each session close (index = session)
  principalAtClose: Float64Array;
  valueAtClose: Float64Array; // Σ shares × close at each session close
  peakPrincipal: number;
  peakValue: number; // the largest market value of the funded shares at any mark
  sessionsHeld: number; // sessions with a lot open at some point
  sessionsBoth: number; // sessions with both families' lots open at some point
  decisions: Record<Family, { total: number; granted: number; downsized: number; refused: number }>;
  refusals: Record<string, number>; // by reason
  minimumBinds: number; // B: refusals because capacity < the minimum allocation (but > 0)
  marks: number;
  markChanges: { t: number[]; v: number[] } | null;
}

const view = (t: Tracker): DrawdownView => {
  const s = t.stats();

  return { max: s.maximum, peakT: s.peakTime, troughT: s.troughTime, recoveryT: s.recoveryTime };
};

interface Ev {
  lot: Lot;
  fill: VTrade['fills'][number];
}

export const runPool = (
  ds: Dataset,
  d1: VBook | null,
  g: VBook | null,
  alloc: Allocation,
  options: PoolOptions = {}
) => {
  const budget = options.budget ?? economics.budget;
  const minimum = options.minimumAllocation ?? defaults.minimumAllocation;
  const rate = options.rate ?? economics.rate;
  const enabled = options.enabled ?? { D1: true, G: true };
  const endIndex = Math.min(options.endIndex ?? Math.max(d1?.endIndex ?? 0, g?.endIndex ?? 0), ds.sessionCount - 1);
  const origin = options.originIndex ?? 0;
  const fundFrom = options.fundFrom ?? 0;
  const detail = options.detail ?? false;
  const books: Record<Family, VBook | null> = { D1: d1, G: g };
  const order: Family[] = alloc.first === 'D1' ? ['D1', 'G'] : ['G', 'D1'];

  // decision cursors per family (each book's trades are in strictly ascending decision time)
  const cursor: Record<Family, number> = { D1: 0, G: 0 };
  const list: Record<Family, VTrade[]> = { D1: d1?.trades ?? [], G: g?.trades ?? [] };
  const open: Lot[] = []; // in opening order
  const reserved = new Map<VTrade, { family: Family; principal: number }>();
  const lots: Lot[] = [];
  const funding: FundingRecord[] = [];
  const exitsAt = new Map<number, Ev[]>(); // key s * 1024 + k → exit fills due (in book order)
  const exitSessions = new Set<number>(); // sessions holding an exit fill of a funded lot
  const lotOfTrade = new Map<VTrade, Lot>();
  const decisions = {
    D1: { total: 0, granted: 0, downsized: 0, refused: 0 },
    G: { total: 0, granted: 0, downsized: 0, refused: 0 }
  };
  const refusals: Record<string, number> = {};
  let minimumBinds = 0;
  let realized = 0;
  let lotId = 0;
  let marks = 0;

  const outstanding = () => {
    let p = 0;

    for (const lot of open) p += lot.principal;
    for (const r of reserved.values()) p += r.principal;
    return p;
  };
  const occupantOf = () =>
    [
      ...open.map((lot) => `${lot.family} lot ${lot.id} ($${lot.principal.toFixed(2)})`),
      ...[...reserved.values()].map((r) => `${r.family} order ($${r.principal.toFixed(2)})`)
    ].join(' + ');
  const blackedOut = (s: number) => (options.blackouts ?? []).some((b) => s >= b.first && s <= b.last);

  const decide = (family: Family, trade: VTrade) => {
    const d = decisions[family];
    const target = alloc.arch === 'A' ? 1 : family === 'D1' ? alloc.d1Target : alloc.gTarget;
    const demand = target * budget;
    const used = outstanding();
    const capacity = Math.max(0, budget - used);
    let grant = 0;
    let reason = '';

    d.total++;

    if (!enabled[family]) reason = 'family disabled';
    else if (trade.dS < fundFrom) reason = 'before the funding start';
    else if (blackedOut(trade.dS)) reason = 'blackout';
    else if (open.some((lot) => lot.family === family) || [...reserved.values()].some((r) => r.family === family))
      throw new Error(`${family} decided while it holds a lot or an order (trade ${trade.id})`);
    else if (alloc.arch === 'A') {
      if (open.length || reserved.size) reason = 'slot occupied';
      else grant = budget;
    } else {
      const want = Math.min(demand, capacity);

      if (capacity <= 1e-6) reason = 'no capacity';
      else if (want < minimum - 1e-6) {
        reason = 'below the minimum allocation';
        minimumBinds++;
      } else grant = want;
    }

    const outcome: FundingRecord['outcome'] = grant <= 0 ? 'refused' : grant < demand - 1e-6 ? 'downsized' : 'granted';

    if (outcome === 'refused') {
      d.refused++;
      refusals[reason] = (refusals[reason] ?? 0) + 1;
    } else if (outcome === 'downsized') d.downsized++;
    else d.granted++;

    if (detail)
      funding.push({
        family,
        trade: trade.id,
        kind: trade.kind,
        s: trade.dS,
        t: trade.dT,
        price: trade.dPrice,
        demand,
        capacity,
        grant,
        outcome,
        reason,
        occupant: occupantOf()
      });

    if (grant > 0) reserved.set(trade, { family, principal: grant });
  };

  // all decisions of both families stamped ≤ t, in time order; same instant → priority order
  const decideUntil = (t: number) => {
    for (;;) {
      let best: Family | null = null;
      let bestT = Infinity;

      for (const f of order) {
        const tr = list[f][cursor[f]];

        if (tr && tr.dT <= t && tr.dT < bestT) {
          best = f;
          bestT = tr.dT;
        }
      }

      if (!best) return;
      decide(best, list[best][cursor[best]++]!);
    }
  };

  const key = (s: number, k: number) => s * 1024 + k;

  const openLot = (trade: VTrade, family: Family) => {
    const r = reserved.get(trade)!;

    reserved.delete(trade);

    let shares = r.principal / trade.ePrice;
    let principal = r.principal;

    if (options.wholeShares) {
      shares = Math.floor(shares + 1e-9);
      principal = shares * trade.ePrice;
    }

    if (!(shares > 0)) return;

    const lot: Lot = {
      id: ++lotId,
      family,
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
    open.push(lot);
    lotOfTrade.set(trade, lot);

    for (const fill of trade.fills) {
      const kk = key(fill.s, fill.k);

      exitSessions.add(fill.s);
      const list2 = exitsAt.get(kk);

      if (list2) list2.push({ lot, fill });
      else exitsAt.set(kk, [{ lot, fill }]);
    }
  };

  const exitFill = (lot: Lot, f: VTrade['fills'][number]) => {
    const sTime = ds.sTime[f.s]!;
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
      open.splice(open.indexOf(lot), 1);
    }
  };

  // ----- the timeline -----

  const minute = new Tracker(0, ds.bTime[ds.sBarStart[origin]!]!);
  const sessionT = new Tracker(0, ds.sTime[origin]!);
  const boundaries = [...(options.periods ?? [])].sort((a, b) => a - b);
  const periodTrackers: { boundary: number; equity: number; tracker: Tracker | null }[] = boundaries.map((b) => ({
    boundary: b,
    equity: NaN,
    tracker: null
  }));
  const daily = new Float64Array(ds.sessionCount).fill(NaN);
  const principalAtClose = new Float64Array(ds.sessionCount);
  const valueAtClose = new Float64Array(ds.sessionCount);
  let peakPrincipal = 0;
  let peakValue = 0;
  let sessionsHeld = 0;
  let sessionsBoth = 0;

  const markValue = (price: number, sTime: number) => {
    let v = realized;

    for (const lot of open)
      v += lot.shares * price - lot.principal - lot.principal * rate * ((sTime - lot.entryTs) / secondsPerYear);
    return v;
  };
  const lotMarks = (price: number, sTime: number, t: number) => {
    for (const lot of open) {
      const m =
        lot.realized +
        (lot.shares * price - lot.principal - lot.principal * rate * ((sTime - lot.entryTs) / secondsPerYear));

      if (m < lot.worst) {
        lot.worst = m;
        lot.worstT = t;
      }
      if (m > lot.best) {
        lot.best = m;
        lot.bestT = t;
      }
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

  const nextDecisionTime = () => {
    let t = Infinity;

    for (const f of order) {
      const tr = list[f][cursor[f]];

      if (tr && tr.dT < t) t = tr.dT;
    }
    return t;
  };

  for (let s = origin; s <= endIndex; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const sTime = ds.sTime[s]!;
    let held = open.length > 0;
    let both = open.length > 1;
    // Flat with nothing reserved and no decision before the close: no trade, no fill and no change of the marked
    // value can happen inside the session (a flat mark is constant, a no-op for the strict trackers).
    const noDecision = nextDecisionTime() > ds.sCloseTime[s]!;
    const skipBars = open.length === 0 && reserved.size === 0 && noDecision;
    // Held, but quiet: no decision, no fill and no exit inside the session. Its regular minutes are marked in a tight
    // loop with the same per-lot expressions in the same order (bit-identical marks); the close goes through the
    // general path below.
    const quiet =
      open.length > 0 && noDecision && !exitSessions.has(s) && ![...reserved.keys()].some((tr) => tr.eS === s);

    if (quiet) {
      const ints = open.map((lot) => lot.principal * rate * ((sTime - lot.entryTs) / secondsPerYear));
      const p = outstanding();

      if (p > peakPrincipal) peakPrincipal = p;
      if (open.length > 1) both = true;

      for (let k = 0; k < count; k++) {
        const price = ds.bClose[start + k]!;
        const t = ds.bTime[start + k]!;
        let v = realized;
        let mv = 0;

        for (let i = 0; i < open.length; i++) {
          const lot = open[i]!;

          v += lot.shares * price - lot.principal - ints[i]!;
          mv += lot.shares * price;
        }

        if (mv > peakValue) peakValue = mv;
        if (detail) lotMarks(price, sTime, t);
        record(v, t);
      }
    }

    for (let k = skipBars || quiet ? count : 0; k <= count; k++) {
      const t = k < count ? ds.bTime[start + k]! : ds.sCloseTime[s]!;
      const heldBefore = open.length > 0;

      decideUntil(t);

      const due = exitsAt.get(key(s, k));

      if (due) {
        for (const ev of due) exitFill(ev.lot, ev.fill);
        exitsAt.delete(key(s, k));
      }

      if (reserved.size)
        for (const [trade, r] of [...reserved]) {
          if (trade.eS === s && trade.eK === k) {
            openLot(trade, r.family);

            // a funded lot's exits at its own fill bar (the initial risk stop may act in the fill minute)
            const again = exitsAt.get(key(s, k));

            if (again) {
              for (const ev of again) exitFill(ev.lot, ev.fill);
              exitsAt.delete(key(s, k));
            }
          }
        }

      if (open.length) {
        held = true;
        if (open.length > 1) both = true;
      }

      if (heldBefore || open.length) {
        const price = k < count ? ds.bClose[start + k]! : ds.sClose[s]!;
        let value = 0;

        for (const lot of open) value += lot.shares * price;
        if (value > peakValue) peakValue = value;

        const p = outstanding();

        if (p > peakPrincipal) peakPrincipal = p;
        if (detail) lotMarks(price, sTime, t);
        if (k < count) record(markValue(price, sTime), t);
      }
    }

    const closeValue = markValue(ds.sClose[s]!, sTime);

    record(closeValue, ds.sCloseTime[s]!);
    sessionT.updateStrict(closeValue, sTime);
    daily[s] = closeValue;

    let mv = 0;
    let pr = 0;

    for (const lot of open) {
      mv += lot.shares * ds.sClose[s]!;
      pr += lot.principal;
    }

    valueAtClose[s] = mv;
    principalAtClose[s] = pr;
    if (held) sessionsHeld++;
    if (both) sessionsBoth++;

    // a period starts after its boundary's close: its tracker's peak is the marked net at that close
    for (const p of periodTrackers)
      if (p.boundary === s) {
        p.equity = closeValue;
        p.tracker = new Tracker(closeValue, ds.sCloseTime[s]!);
      }
  }

  // the end: open lots marked at the last close with their accrued interest (no exit cost)
  const lastTime = ds.sTime[endIndex]!;
  const lastClose = ds.sClose[endIndex]!;
  let unrealized = 0;

  for (const lot of open) {
    const accrued = lot.principal * rate * ((lastTime - lot.entryTs) / secondsPerYear);
    const mark = lot.shares * lastClose - lot.principal - accrued;

    lot.unrealized = mark;
    lot.interest += accrued;
    lot.net = lot.realized + mark;
    unrealized += mark;
  }

  if (exitsAt.size) {
    // a funded lot's exit fill beyond the replay's end is impossible when the books end with it
    for (const evs of exitsAt.values())
      for (const ev of evs) if (ev.fill.s <= endIndex) throw new Error(`an exit fill was skipped (lot ${ev.lot.id})`);
  }

  void books;

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
    peakPrincipal,
    peakValue,
    sessionsHeld,
    sessionsBoth,
    decisions,
    refusals,
    minimumBinds,
    marks,
    markChanges
  } satisfies PoolResult;
};

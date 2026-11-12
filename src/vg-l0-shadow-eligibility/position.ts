// The INDEPENDENT REAL POSITION of a delayed shadow-eligibility entry (PROTOCOL.md §5.3): a fresh position of one book,
// placed by an order at a delayed decision instant D and managed from its own fill by the book's own, UNCHANGED exit
// machinery — exactly the canonical components the virtual books use:
//   D1      the frozen ShadowBook (src/multi-etf-allocator/shadow.ts) and its ExitManager (the net-profit trailing
//           stop from the post-fill high, the maximum-hold loss exit at the open, the buffered intraday loss and its
//           overnight carry), driven in runD1Book's per-session order (beginSession; per bar the exit, then the fill;
//           afterSession);
//   Growth  the same ShadowBook with Growth's exit parameters (exitParamsOf) and, when the initial risk stop or trend
//           retention is ON, the canonical PositionRules (src/growth-trading/optionalRules.ts), driven in
//           simulateTrading's order (the exits due at a bar, partial sales first; the fill, then the rules' fill-minute
//           exits; afterSession of the book, then of the rules).
// Nothing is inherited from the shadow (hypothetical) trade: the entry time and price, shares, cost basis, trailing
// stop, holding-period clock, interest, initial-stop level and retention state all start at the delayed fill. The
// delayed order fills like every order of the book: at the first trade at or after D (the closing print only for a
// decision before the close; otherwise the next session's first trade). Growth's initial-stop availability is checked
// at D exactly as for any Growth order (an unavailable stop blocks the entry: never entered without its protection).
//
// The harness never arms the entry machine and never produces a signal; it only places the one order and manages the one
// position until its final exit or the door's end. Parity (tests/position.test.ts): re-simulated from each virtual
// trade's own decision, it reproduces every virtual trade of both families exactly (entry, fills, prices, reasons).
import type { Dataset } from '../four-family/data.ts';
import { DecisionLog } from '../growth-trading/continuation.ts';
import { PositionRules, type PositionRulesRuntime } from '../growth-trading/optionalRules.ts';
import { lastMinuteBefore } from '../growth-trading/riseTrading.ts';
import type { PhenotypeName } from '../multi-etf-allocator/context.ts';
import { type BookSettings, type VirtualTrade, ShadowBook } from '../multi-etf-allocator/shadow.ts';
import type { ReboundSignal, Setup, StrategyParams } from '../shared-margin-portfolio/strategy.ts';
import type { Family, VFill } from '../vg-d1-growth-joint/books.ts';
import type { Sym } from '../vg-d1-growth-joint/context.ts';

// What a fresh real position of one book needs: its family's exit configuration on the door's dataset.
export type RealSpec =
  | { family: 'D1'; sym: Sym; ds: Dataset; params: StrategyParams; settings: BookSettings }
  | {
      family: 'G';
      sym: Sym;
      ds: Dataset;
      exit: StrategyParams;
      settings: BookSettings;
      rules: PositionRulesRuntime | null;
      sellFraction: number; // retention's partial-sale fraction of the current shares (1 without retention)
    };

export interface RealPath {
  family: Family;
  decisionS: number;
  decisionT: number;
  decisionPrice: number; // the last completed minute's close at or before D (informational)
  blocked: string | null; // the order could not be placed (Growth: initial risk stop unavailable)
  eS: number; // −1: no executable trade before the door's end (the order stays pending)
  eK: number;
  eT: number;
  eRaw: number;
  ePrice: number; // after the per-side cost
  fills: VFill[]; // the real position's own exits, in order (partial-only or empty while open at the end)
  open: boolean; // filled and still (partly) open at the door's end
  net: number; // the position's own net on the book's $100,000 notional (marked at the last close while open)
  interest: number;
}

// The decision price known at D in session s: the last completed minute's close, else the previous close.
export const priceKnownAt = (ds: Dataset, s: number, time: number) => {
  if (time >= ds.sCloseTime[s]!) return ds.sClose[s]!;

  const k = lastMinuteBefore(ds, s, time);

  return k >= 0 ? ds.bClose[ds.sBarStart[s]! + k]! : s > 0 ? ds.sClose[s - 1]! : NaN;
};

const signalAt = (ds: Dataset, s: number, time: number, price: number): ReboundSignal => {
  const setup: Setup = {
    id: 1,
    kind: 'deep', // recorded by ShadowBook only; this harness never arms the machine
    activationIndex: s,
    activationTime: time,
    activationPrice: price,
    referenceHigh: NaN,
    anchorHigh: NaN,
    trailingLow: NaN,
    trailingLowTime: NaN,
    reboundTrigger: NaN,
    declinedSignals: 0,
    status: 'armed',
    endIndex: -1
  };

  return {
    setup,
    index: s,
    barIndex: lastMinuteBefore(ds, s, time),
    decisionTime: time,
    decisionPrice: price,
    trigger: NaN,
    trailingLow: NaN
  };
};

// A fresh position of `spec`'s book from an order placed at (s0, D), managed until its final exit or `endIndex`.
export const realPathOf = (spec: RealSpec, s0: number, D: number, endIndex: number): RealPath => {
  const ds = spec.ds;

  if (!(s0 >= 0 && s0 <= endIndex && endIndex < ds.sessionCount)) throw new Error(`session ${s0} outside the door`);
  if (!(D > ds.sTime[s0]! && D <= ds.sCloseTime[s0]!))
    throw new Error(`a delayed decision at ${D} is not inside its session ${ds.dates[s0]}`);

  const decisionPrice = priceKnownAt(ds, s0, D);
  const out: RealPath = {
    family: spec.family,
    decisionS: s0,
    decisionT: D,
    decisionPrice,
    blocked: null,
    eS: -1,
    eK: -1,
    eT: NaN,
    eRaw: NaN,
    ePrice: NaN,
    fills: [],
    open: false,
    net: 0,
    interest: 0
  };
  // the entry machine never arms (armStart past the data) and processBar is never called
  const book = new ShadowBook(
    spec.sym as never, // a label only inside the shadow book (Priority 3's books pass GDX the same way)
    (spec.family === 'D1' ? 'd1' : 'rise-from-recent-low-trading') as PhenotypeName,
    ds,
    spec.family === 'D1' ? spec.params : spec.exit,
    spec.settings,
    ds.sessionCount
  );
  const rules =
    spec.family === 'G' && spec.rules && (spec.rules.initialStop || spec.rules.retention)
      ? new PositionRules(ds, spec.rules, book, spec.exit, spec.settings, new DecisionLog())
      : null;

  if (rules?.initialStop) {
    const check = rules.protection(s0, D)!;

    if (!check.pass) {
      out.blocked = `${check.reason}: ${check.text}`;
      return out;
    }
  }

  let trade: VirtualTrade | null = null;
  let done = false;

  // Growth with rules: simulateTrading's exitsAt (partial sales first; at most two fills at one bar)
  const exitsWithRules = (s: number, k: number) => {
    for (let guard = 0; guard < 3; guard++) {
      const exit = book.exitAt(k);

      if (!exit) return;
      if (rules!.instructionOf(exit)?.partial) {
        rules!.partialSale(s, exit);
        continue;
      }

      const position = book.position!;
      const sharesSold = position.lot.shares;
      const principalRepaid = position.lot.investment;
      const closed = book.close(s, exit);

      rules!.finalize(closed, s, exit, sharesSold, principalRepaid);
      done = true;
      return;
    }

    throw new Error(`more than two exit fills at one bar (${ds.dates[s]} bar ${k})`);
  };
  const exitsAt = (s: number, k: number) => {
    if (rules) return exitsWithRules(s, k);

    const exit = book.exitAt(k);

    if (exit) {
      book.close(s, exit);
      done = true;
    }
  };

  for (let s = s0; s <= endIndex && !done; s++) {
    const count = ds.sBarCount[s]!;

    book.beginSession(s);

    if (s === s0) {
      trade = book.commit(signalAt(ds, s0, D, decisionPrice), s0, 'granted');
      rules?.attach(trade, s0, D);
    }

    for (let k = 0; k <= count && !done; k++) {
      exitsAt(s, k);
      if (done) break;

      if (book.fillAt(k)) {
        const filled = book.open(s, k);

        if (rules) {
          rules.onFill(filled, s, k);
          exitsAt(s, k);
        }
      }
    }

    book.afterSession(s);
    rules?.afterSession(s);
  }

  if (!done) {
    book.finish(endIndex);
    rules?.finish(endIndex);
  }

  const t = trade!;

  if (t.entryIndex < 0) return out; // no executable trade before the door's end: the order stays pending

  out.eS = t.entryIndex;
  out.eK = t.entryBar;
  out.eT = t.entryTime;
  out.eRaw = t.entryRawPrice;
  out.ePrice = t.entryPrice;
  out.net = t.net;
  out.interest = t.interest;

  const pos = rules?.positionOf(t);

  if (pos && pos.fills.length > 0) {
    for (const x of pos.fills)
      out.fills.push({
        s: x.session,
        k: x.bar,
        t: x.time,
        raw: x.rawPrice,
        price: x.price,
        partial: x.partial,
        f: x.partial ? (spec.family === 'G' ? spec.sellFraction : 1) : 1,
        reason: String(x.reason)
      });
  } else if (t.exitIndex >= 0) {
    out.fills.push({
      s: t.exitIndex,
      k: t.exitBar,
      t: t.exitTime,
      raw: t.exitRawPrice,
      price: t.exitPrice,
      partial: false,
      f: 1,
      reason: String(t.exitReason)
    });
  }

  out.open = t.exitIndex < 0;
  return out;
};

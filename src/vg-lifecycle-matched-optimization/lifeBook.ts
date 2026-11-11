// The lifecycle Growth book of this study (AMENDMENTS.md A1): Priority 5A's `lifeBookOf`
// (src/vg-growth-funding-lifecycle/growthBook.ts), unchanged and called as is, plus ONE completion of an end-of-door case
// 5A's runs never met.
//
// THE CASE. Under L2 a retained refused opportunity is reassessed at a completed close; when the allocator answers
// "available" the book places an order for the next eligible trade. If that close is the door's LAST session, the order is
// never filled. 5A's book records a canonical order left unfilled at the door's end (from the simulation's log entries),
// but not an L2 retained order, so the granted request had no pool record and the coupled run failed its consistency
// check ("N requests but N−1 pool records") — found by this study's C19 search (D19, 2019-12-31).
//
// THE COMPLETION. A granted request without a record whose order is unfilled and was decided at the door's last session
// becomes its record exactly as 5A records a canonical order unfilled at the end (no fill, eS = −1: it reserves the slot
// from its decision to the end; nothing follows it). Any other granted request without a record still throws (an explicit
// engine failure). With no such request the book is 5A's, record for record (stage V re-verifies it).
import type { VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import { type Friction, type GrowthConfig, type VTrade, bookId } from '../vg-d1-growth-joint/books.ts';
import type { SymDoor } from '../vg-d1-growth-joint/data.ts';
import { type LifeBook, lifeBookOf as p5aLifeBookOf } from '../vg-growth-funding-lifecycle/growthBook.ts';
import type { Ask, Mode } from '../vg-growth-funding-lifecycle/lifecycle.ts';

export type { LifeBook };

export const completions = { endOfDoorOrders: 0 }; // per process (reported by the stage V check)

export const lifeBookOf = (
  sd: SymDoor,
  window: { from: string; to: string },
  config: GrowthConfig,
  mode: Mode,
  ask: Ask,
  options: { friction?: Friction; costBps?: number } = {}
): LifeBook => {
  const b = p5aLifeBookOf(sd, window, config, mode, ask, options);
  const sim = b.simulation;
  const recorded = new Set(b.trades.map((t) => t.dT));
  const added: VTrade[] = [];

  for (const q of sim.life?.requests ?? []) {
    if (q.outcome !== 'granted' || recorded.has(q.t)) continue;

    const trade = q.trade as VirtualTrade | null;

    if (!trade || trade.entryIndex >= 0 || q.s !== sim.endSession)
      throw new Error(
        `${b.book}: a granted ${q.kind} request at session ${q.s} has no record and is not an order unfilled at the door's end`
      );

    // 5A's record of an order unfilled at the door's end (growthBook.ts `add` with no position and no exit)
    added.push({
      book: bookId('G', sd.symbol),
      id: trade.id,
      kind: String(trade.setupKind),
      dS: trade.decisionIndex,
      dT: trade.decisionTime,
      dPrice: trade.decisionPrice,
      eS: -1,
      eK: -1,
      eT: NaN,
      eRaw: NaN,
      ePrice: NaN,
      fills: [],
      open: false,
      vNet: trade.net,
      vInterest: trade.interest
    });
  }

  if (!added.length) return b;

  completions.endOfDoorOrders += added.length;

  const trades = [...b.trades, ...added].sort((x, y) => x.dT - y.dT || x.id - y.id);

  for (let i = 1; i < trades.length; i++)
    if (trades[i]!.dT <= trades[i - 1]!.dT) throw new Error(`${b.book}: requests are not strictly ordered`);

  return { ...b, trades, signals: trades.length };
};

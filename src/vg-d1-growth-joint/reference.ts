// An independent, deliberately simple reference of the pooled replay under architecture A (PROTOCOL.md §15.1 P4), for
// the configurations no canonical engine covers (cross-symbol D1 + Growth pools, the Growth pair). It shares no code
// path with pool.ts's timeline:
//
// - funding: all decisions of the enabled books sorted by (decision time, tie order); a decision is granted iff the
//   slot is free at it — the previous funded trade's final exit is processed strictly before the decision's
//   processing instant (decisions at an instant precede that instant's exits) — and refused otherwise;
// - money: a funded lot under A is $100,000 = the books' notional, so its net is computed fill by fill with the
//   canonical formulas from the virtual trade;
// - marks: each funded lot's own mark stream (every bar of its symbol from its fill bar through its final exit bar, and
//   every session close while it is held), the session closes while flat, merged by time into strict trackers.
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { secondsPerYear } from '../shared-margin-portfolio/strategy.ts';
import type { Dataset } from '../four-family/data.ts';
import { type Sym, economics } from './context.ts';
import { type BookId, type VBook, type VTrade, symbolOf } from './books.ts';
import { type Priority, tieOrderOf } from './pool.ts';

const timeOf = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bTime[ds.sBarStart[s]! + k]! : ds.sCloseTime[s]!;

export interface ReferenceResult {
  funded: string[]; // `${book}#${trade id}` in funding order
  refused: string[];
  net: number;
  realized: number;
  dd: number;
  ddPeakT: number;
  ddTroughT: number;
  ddDaily: number;
}

export const referencePool = (
  datasets: Record<Sym, Dataset>,
  books: readonly VBook[],
  first: Priority,
  options: { enabled?: Partial<Record<BookId, boolean>>; fundFrom?: number; endIndex: number }
): ReferenceResult => {
  const rate = economics.rate;
  const budget = economics.budget;
  const tie = tieOrderOf(first);
  const all = books
    .flatMap((b) => b.trades.map((t) => ({ t, rank: tie.indexOf(b.book) })))
    .sort((a, b) => a.t.dT - b.t.dT || a.rank - b.rank);
  const ref = datasets.VGT;
  // the union instants of a session: every bar start of either symbol that has a book, then the close
  const syms = [...new Set(books.map((b) => symbolOf(b.book)))];
  const processAt = (dT: number, s: number) => {
    let T = Infinity;

    for (const sym of syms) {
      const ds = datasets[sym];

      for (let k = 0; k < ds.sBarCount[s]!; k++) {
        const t = ds.bTime[ds.sBarStart[s]! + k]!;

        if (t >= dT) {
          T = Math.min(T, t);
          break;
        }
      }
    }

    return Math.min(T, ref.sCloseTime[s]!);
  };
  const funded: { t: VTrade; fill: number; exit: number }[] = [];
  const refused: string[] = [];
  let busyUntil = -Infinity; // the processing instant of the last funded trade's final exit (Infinity: still held)

  for (const { t } of all) {
    const key = `${t.book}#${t.id}`;
    const at = processAt(t.dT, t.dS);

    if (options.enabled?.[t.book] === false || t.dS < (options.fundFrom ?? 0) || !(busyUntil < at)) {
      refused.push(key);
      continue;
    }

    const ds = datasets[symbolOf(t.book)];
    const fill = t.eS >= 0 ? timeOf(ds, t.eS, t.eK) : Infinity;
    const last = t.fills.at(-1);
    const exit = t.eS < 0 || !last || last.partial || last.s > options.endIndex ? Infinity : timeOf(ds, last.s, last.k);

    funded.push({ t, fill, exit });
    busyUntil = exit;
  }

  // money and the marks of every funded lot
  type Mark = { t: number; v: number; close: boolean };
  const marks: Mark[] = [];
  let realized = 0;
  let unrealized = 0;
  const heldSessions = new Set<number>();
  const lotEnds: { t: number; cumulative: number }[] = [];

  for (const f of funded) {
    if (f.t.eS < 0) continue;

    const sym = symbolOf(f.t.book);
    const ds = datasets[sym];
    let shares = budget / f.t.ePrice;
    let principal = budget;
    const entryTs = ds.sTime[f.t.eS]!;
    let lotRealized = 0;
    const before = realized;
    let fi = 0;
    const fills = f.t.fills.filter((x) => x.s <= options.endIndex);
    const lastS = fills.length && !fills.at(-1)!.partial ? fills.at(-1)!.s : options.endIndex;

    for (let s = f.t.eS; s <= lastS; s++) {
      heldSessions.add(s);

      const count = ds.sBarCount[s]!;
      const sTime = ds.sTime[s]!;
      const k0 = s === f.t.eS ? f.t.eK : 0;

      for (let k = k0; k <= count; k++) {
        // the lot's fills at (s, k)
        while (fi < fills.length && fills[fi]!.s === s && fills[fi]!.k === k) {
          const x = fills[fi++]!;
          const sold = x.partial ? shares * x.f : shares;
          const repaid = x.partial ? principal * x.f : principal;
          const interest = repaid * rate * ((ds.sTime[x.s]! - entryTs) / secondsPerYear);

          lotRealized += sold * x.price - repaid - interest;
          shares -= sold;
          principal -= repaid;
          if (!x.partial) {
            shares = 0;
            principal = 0;
          }
        }

        const price = k < count ? ds.bClose[ds.sBarStart[s]! + k]! : ds.sClose[s]!;
        const remainder =
          shares > 0 ? shares * price - principal - principal * rate * ((sTime - entryTs) / secondsPerYear) : 0;

        marks.push({ t: timeOf(ds, s, k), v: before + lotRealized + remainder, close: k === count });
        if (shares === 0) {
          lotEnds.push({ t: timeOf(ds, s, k), cumulative: before + lotRealized });
          break;
        }
      }
    }

    realized += lotRealized;

    if (shares > 0) {
      const sTime = ds.sTime[options.endIndex]!;

      unrealized =
        shares * ds.sClose[options.endIndex]! - principal - principal * rate * ((sTime - entryTs) / secondsPerYear);
    }
  }

  // the closes while flat: the realized total of the lots whose final exit came at or before that close
  const closeTimes = new Set(marks.filter((m) => m.close).map((m) => m.t));
  const exits = lotEnds.sort((a, b) => a.t - b.t);
  let ei = 0;
  let flat = 0;

  for (let s = 0; s <= options.endIndex; s++) {
    const t = ref.sCloseTime[s]!;

    while (ei < exits.length && exits[ei]!.t <= t) flat = exits[ei++]!.cumulative;
    if (closeTimes.has(t)) continue;
    marks.push({ t, v: flat, close: true });
  }

  marks.sort((a, b) => a.t - b.t);

  const minute = new Tracker(0, ref.bTime[ref.sBarStart[0]!]!);
  const daily = new Tracker(0, ref.sTime[0]!);

  for (const m of marks) {
    minute.updateStrict(m.v, m.t);
    if (m.close) {
      const s = ref.sCloseTime.indexOf(m.t);

      daily.updateStrict(m.v, ref.sTime[s]!);
    }
  }

  const ms = minute.stats();

  void heldSessions;

  return {
    funded: funded.map((f) => `${f.t.book}#${f.t.id}`),
    refused,
    net: realized + unrealized,
    realized,
    dd: ms.maximum,
    ddPeakT: ms.peakTime,
    ddTroughT: ms.troughTime,
    ddDaily: daily.stats().maximum
  };
};

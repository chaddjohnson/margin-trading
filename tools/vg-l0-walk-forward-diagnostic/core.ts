// The replay analysis core (PROTOCOL.md §6 D3, D4, D6, D8; gate G3). Engine-agnostic: each audited study's own `run`
// and `recordOf` are injected, so the trading-session study's code can be loaded from its own commit. Nothing here
// changes a strategy, an allocator or a rule; it only reads the pooled replay's lots, funding log and minute marks.
import { episodesOf } from './episodes.ts';
import { isoDay, isoMin, r2 } from './common.ts';

// the slices of the Priority 3 pooled result this core reads (structurally typed: every audited engine returns them)
export interface Fill {
  s: number;
  t: number;
  price: number;
  partial: boolean;
  principal: number;
  net: number;
  reason: string;
}
export interface LotLike {
  id: number;
  book: string;
  trade: { kind: string; dT: number; dPrice: number };
  principal0: number;
  entryS: number;
  entryT: number;
  entryPrice: number;
  fills: Fill[];
  realized: number;
  interest: number;
  open: boolean;
  net: number;
  unrealized: number;
  costs: number;
  worst: number;
  worstT: number;
  best: number;
  bestT: number;
}
export interface FundingLike {
  book: string;
  kind: string;
  s: number;
  t: number;
  outcome: 'granted' | 'refused';
  reason: string;
  occupant: string;
  occupantBook: string | null;
}
export interface ResultLike {
  lots: LotLike[];
  funding: FundingLike[];
  daily: Float64Array;
  heldAtClose: Int8Array;
  markChanges: { t: number[]; v: number[] } | null;
}
export interface DoorLike {
  name: string;
  dates: string[];
  sessions: number;
  sym: Record<string, { ds: { sCloseTime: Float64Array | number[]; sTime: Float64Array | number[] } }>;
}

const tieBooks = ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'];

// the marked net at time t (the last mark at or before t; strict: before t)
const equityFn = (t: readonly number[], v: readonly number[]) => (x: number, strict = false) => {
  let lo = 0;
  let hi = t.length - 1;
  let k = -1;

  while (lo <= hi) {
    const m = (lo + hi) >> 1;

    if (strict ? t[m]! < x : t[m]! <= x) {
      k = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return k < 0 ? 0 : v[k]!;
};

const lotRow = (l: LotLike, b: number) => {
  const last = l.fills.at(-1);
  const exitT = l.open || !last ? Number.NaN : last.t;

  return {
    id: l.id,
    book: l.book,
    kind: l.trade.kind,
    decision: isoMin(l.trade.dT),
    entry: isoMin(l.entryT),
    entryPrice: r2(l.entryPrice),
    principal: r2(l.principal0),
    exit: l.open ? 'open' : isoMin(exitT),
    exitReasons: [...new Set(l.fills.map((f) => f.reason))].join(' + ') || (l.open ? 'open' : ''),
    partials: l.fills.filter((f) => f.partial).length,
    calendarDays: l.open || !last ? null : r2((exitT - l.entryT) / 86400),
    sessions: l.open || !last ? null : last.s - l.entryS,
    net: r2(l.net),
    returnPct: r2((100 * l.net) / l.principal0),
    interest: r2(l.interest),
    costs: r2(l.costs),
    mae: r2(l.worst),
    maeAt: isoMin(l.worstT),
    mfe: r2(l.best),
    carriedIntoSlice: l.entryS <= b
  };
};

// Lot contributions to one drawdown window [peakT, troughT]. One funded slot: the window is partitioned at the entries
// of lots that start inside it; each segment's change of the marked net belongs to the lot entering at its start (the
// first segment: the lot open at the peak, else 'flat'). The contributions sum exactly to −depth.
const windowContributions = (
  lots: LotLike[],
  E: ReturnType<typeof equityFn>,
  peakT: number,
  troughT: number
) => {
  const inside = lots.filter((l) => l.entryT > peakT && l.entryT <= troughT).sort((a, b) => a.entryT - b.entryT);
  const openAtPeak = lots.find((l) => l.entryT <= peakT && (l.open || l.fills.at(-1)!.t > peakT));
  const starts = [{ t: peakT, lot: openAtPeak ?? null, first: true }, ...inside.map((l) => ({ t: l.entryT, lot: l, first: false }))];

  return starts.map((s, j) => {
    const from = s.first ? E(peakT) : E(s.t, true);
    const next = starts[j + 1];
    const to = next ? E(next.t, true) : E(troughT);

    return {
      lot: s.lot ? s.lot.id : null,
      book: s.lot ? s.lot.book : 'flat',
      entry: s.lot ? isoMin(s.lot.entryT) : '—',
      change: r2(to - from),
      lotNet: s.lot ? r2(s.lot.net) : 0,
      lotMae: s.lot ? r2(s.lot.worst) : 0,
      exit: s.lot ? (s.lot.open ? 'open' : isoMin(s.lot.fills.at(-1)!.t)) : '—',
      exitReasons: s.lot ? [...new Set(s.lot.fills.map((f) => f.reason))].join(' + ') : ''
    };
  });
};

export const sliceAnalysis = (door: DoorLike, r: ResultLike, boundary: string, top = 4) => {
  const b = door.dates.indexOf(boundary);

  if (b < 0) throw new Error(`${boundary} is not a session of ${door.name}`);

  const equity = r.daily[b]!;
  const after = Number(door.sym.VGT!.ds.sCloseTime[b]!);
  const m = r.markChanges!;
  const t: number[] = [];
  const v: number[] = [];

  for (let i = 0; i < m.t.length; i++)
    if (m.t[i]! > after) {
      t.push(m.t[i]!);
      v.push(m.v[i]! - equity);
    }

  const E = equityFn(t, v);
  const sliceLots = r.lots.filter((l) => l.open || l.fills.at(-1)!.s > b);
  const eps = episodesOf(t, v, after).slice(0, top);
  const refusals = r.funding.filter((f) => f.outcome === 'refused' && f.s > b);
  const held: Record<string, number> = { flat: 0 };
  const end = door.sessions - 1;

  for (let s = b + 1; s <= end; s++) {
    const k = r.heldAtClose[s]!;
    const name = k < 0 ? 'flat' : tieBooks[k]!;

    held[name] = (held[name] ?? 0) + 1;
  }

  const byPair: Record<string, number> = {};

  for (const f of refusals) {
    const k = `${f.book} ← ${f.occupantBook ?? f.occupant}`;

    byPair[k] = (byPair[k] ?? 0) + 1;
  }

  // lots open across the boundary: their mark at the boundary (counted in the training net) and their slice change
  const carried = sliceLots
    .filter((l) => l.entryS <= b)
    .map((l) => {
      const nextEntry = sliceLots.filter((x) => x.entryT > l.entryT).reduce((a, x) => Math.min(a, x.entryT), Infinity);
      const inSlice = Number.isFinite(nextEntry) ? E(nextEntry, true) : E(Infinity);

      return {
        lot: l.id,
        book: l.book,
        entry: isoMin(l.entryT),
        exit: l.open ? 'open' : isoMin(l.fills.at(-1)!.t),
        net: r2(l.net),
        markAtBoundary: r2(l.net - inSlice),
        sliceChange: r2(inSlice)
      };
    });

  return {
    boundary,
    boundaryEquity: r2(equity),
    carried,
    sliceNet: r2(v.at(-1) ?? 0),
    sessions: end - b,
    occupancy: held,
    lots: sliceLots.map((l) => lotRow(l, b)),
    lotsByBook: Object.fromEntries(
      tieBooks.map((bk) => {
        const ls = sliceLots.filter((l) => l.book === bk);

        return [
          bk,
          {
            lots: ls.length,
            net: r2(ls.reduce((a, l) => a + l.net, 0)),
            losses: ls.filter((l) => l.net < 0).length,
            worst: r2(Math.min(0, ...ls.map((l) => l.net))),
            worstMae: r2(Math.min(0, ...ls.map((l) => l.worst)))
          }
        ];
      })
    ),
    refusals: { total: refusals.length, byPair },
    episodes: eps.map((e) => {
      const contrib = windowContributions(sliceLots, E, e.peakT, e.troughT);
      const inWindow = refusals.filter((f) => f.t > e.peakT && f.t <= e.troughT);

      return {
        peak: isoMin(e.peakT),
        trough: isoMin(e.troughT),
        recovery: isoMin(e.recoveryT),
        depth: r2(e.depth),
        peakValue: r2(e.peak),
        troughValue: r2(e.trough),
        contributions: contrib,
        unattributed: r2(-e.depth - contrib.reduce((a, c) => a + c.change, 0)),
        refusalsInWindow: inWindow.map((f) => ({ t: isoMin(f.t), book: f.book, kind: f.kind, occupant: f.occupantBook ?? f.occupant }))
      };
    })
  };
};

// Training-period features from the same continuous run (lots entered at or before the boundary).
export const trainingAnalysis = (r: ResultLike, b: number) => {
  const ls = r.lots.filter((l) => l.entryS <= b);
  const nets = ls.map((l) => l.net);

  return {
    lots: ls.length,
    lossLots: nets.filter((x) => x < 0).length,
    worstLot: r2(Math.min(0, ...nets)),
    worstMae: r2(Math.min(0, ...ls.map((l) => l.worst))),
    lotsBelow10k: nets.filter((x) => x < -10000).length,
    maeBelow20k: ls.filter((l) => l.worst < -20000).length,
    byBook: Object.fromEntries(
      tieBooks.map((bk) => {
        const x = ls.filter((l) => l.book === bk);

        return [bk, { lots: x.length, net: r2(x.reduce((a, l) => a + l.net, 0)), worst: r2(Math.min(0, ...x.map((l) => l.net))), worstMae: r2(Math.min(0, ...x.map((l) => l.worst))) }];
      })
    ),
    firstEntry: ls.length ? isoDay(Math.min(...ls.map((l) => l.entryT))) : null
  };
};

// Field-by-field comparison of a recomputed record with a sealed one (non-finite values compared in their sealed form).
export const compareRecords = (mine: Record<string, unknown>, sealed: Record<string, unknown>) => {
  const norm = (x: unknown) =>
    JSON.stringify(x, (_k, y) =>
      typeof y === 'number' && !Number.isFinite(y) ? (Number.isNaN(y) ? '__NaN' : y > 0 ? '__Inf' : '__-Inf') : y
    );
  const keys = [...new Set([...Object.keys(mine), ...Object.keys(sealed)])];
  const diffs = keys.filter((k) => norm(mine[k]) !== norm(sealed[k]));

  return { fields: keys.length, diffs };
};

// Pool metrics, B5 preservation and idle-capital attribution (PROTOCOL.md §9). Everything is computed from an
// allocator result and, for preservation and attribution, the unchanged B5 run on the same window and settings.
import type { AllocResult, LotRecord } from './allocator.ts';

export interface Interval {
  from: number;
  to: number;
}

// B5's slot intervals: from each funded decision (the reservation) to the lot's exit (Infinity while open).
export const slotIntervals = (b5: AllocResult): Interval[] =>
  b5.lots.map((lot) => ({ from: lot.decisionTime, to: lot.exitIndex >= 0 ? lot.exitTime : Infinity }));

const overlaps = (a: Interval, b: Interval) => a.from < b.to && b.from < a.to;

export interface Preservation {
  b5Lots: number;
  b5Profitable: number;
  b5ProfitableNet: number;
  exact: number;
  delayed: number;
  altered: number;
  missed: number;
  missedNet: number; // B5 net of the profitable lots missed
  countWeighted: number; // (exact + delayed) profitable ÷ profitable
  pnlWeighted: number; // Σ min(candidate, B5) over exact + delayed profitable ÷ Σ B5 profitable net
  retention: number; // the same, also crediting matched-altered lots
  topMissed: number; // of B5's `top` largest winning lots: missed (frozen) or missed and not altered (reoptimized)
  gained: number; // lots of unchanged B5 books funded by the candidate but refused by B5
  gainedNet: number;
  delayedNetChange: number; // Σ (mirror net − B5 net) over delayed lots
}

// PROTOCOL.md §9.3: one-to-one matching by book identity and virtual trade id; matched-altered only for B5 symbols
// whose B5 book is not in the candidate (reoptimized or removed), by the first unmatched deep lot of that symbol
// overlapping the B5 lot's holding interval.
export const preservationOf = (
  candidate: AllocResult,
  b5: AllocResult,
  options: { from?: number; to?: number; top?: number } = {}
): Preservation => {
  const from = options.from ?? -Infinity;
  const to = options.to ?? Infinity;
  const top = options.top ?? 5;
  const inWindow = (lot: LotRecord) => lot.entryTime >= from && lot.entryTime <= to;
  const byTrade = new Map<string, LotRecord>();
  const candidateBooks = new Set(candidate.lots.map((lot) => lot.bookId));

  for (const lot of candidate.lots) {
    byTrade.set(`${lot.bookId}#${lot.tradeId}`, lot);
  }

  const b5Keys = new Set(b5.lots.map((lot) => `${lot.bookId}#${lot.tradeId}`));
  const used = new Set<LotRecord>();
  const result: Preservation = {
    b5Lots: 0,
    b5Profitable: 0,
    b5ProfitableNet: 0,
    exact: 0,
    delayed: 0,
    altered: 0,
    missed: 0,
    missedNet: 0,
    countWeighted: 1,
    pnlWeighted: 1,
    retention: 1,
    topMissed: 0,
    gained: 0,
    gainedNet: 0,
    delayedNetChange: 0
  };
  let preservedProfitable = 0;
  let credit = 0;
  let creditAltered = 0;
  const window = b5.lots.filter(inWindow);
  const topLots = new Set(
    window
      .filter((lot) => lot.net > 0)
      .sort((a, b) => b.net - a.net)
      .slice(0, top)
  );

  for (const lot of window) {
    result.b5Lots++;

    const profitable = lot.net > 0;
    const match = byTrade.get(`${lot.bookId}#${lot.tradeId}`);
    let status: 'exact' | 'delayed' | 'altered' | 'missed' = 'missed';
    let net = 0;

    if (match && match.kind === 'exact') {
      status = 'exact';
      net = match.net;
    } else if (match) {
      status = 'delayed';
      net = match.net;
      result.delayedNetChange += match.net - lot.net;
    } else if (!candidateBooks.has(lot.bookId)) {
      const span = { from: lot.entryTime, to: lot.exitIndex >= 0 ? lot.exitTime : Infinity };
      const altered = candidate.lots.find(
        (other) =>
          !used.has(other) &&
          other.symbol === lot.symbol &&
          other.tier === 'deep' &&
          other.bookId !== lot.bookId &&
          overlaps(span, { from: other.entryTime, to: other.exitIndex >= 0 ? other.exitTime : Infinity })
      );

      if (altered) {
        used.add(altered);
        status = 'altered';
        net = altered.net;
      }
    }

    result[status === 'missed' ? 'missed' : status]++;

    if (status === 'missed' && profitable) {
      result.missedNet += lot.net;
    }

    if (topLots.has(lot) && status === 'missed') {
      result.topMissed++;
    }

    if (profitable) {
      result.b5Profitable++;
      result.b5ProfitableNet += lot.net;

      if (status === 'exact' || status === 'delayed') {
        preservedProfitable++;
        credit += Math.min(net, lot.net);
      } else if (status === 'altered') {
        creditAltered += Math.min(net, lot.net);
      }
    }
  }

  for (const lot of candidate.lots.filter(inWindow)) {
    if (lot.bookId.startsWith('B5:') && !b5Keys.has(`${lot.bookId}#${lot.tradeId}`)) {
      result.gained++;
      result.gainedNet += lot.net;
    }
  }

  result.countWeighted = result.b5Profitable > 0 ? preservedProfitable / result.b5Profitable : 1;
  result.pnlWeighted = result.b5ProfitableNet > 0 ? credit / result.b5ProfitableNet : 1;
  result.retention = result.b5ProfitableNet > 0 ? (credit + creditAltered) / result.b5ProfitableNet : 1;
  return result;
};

// Paired contributions (PROTOCOL.md §9.4): each candidate lot's net minus its matched B5 lot's net (one-to-one by book
// and trade, else 0), and −net for each B5 lot the candidate did not fund; with the entry session for clustering.
export const pairedContributions = (candidate: AllocResult, b5: AllocResult) => {
  const b5ByTrade = new Map(b5.lots.map((lot) => [`${lot.bookId}#${lot.tradeId}`, lot]));
  const matched = new Set<string>();
  const rows: { session: number; symbol: string; contribution: number; kind: string }[] = [];

  for (const lot of candidate.lots) {
    const key = `${lot.bookId}#${lot.tradeId}`;
    const twin = b5ByTrade.get(key);

    if (twin) {
      matched.add(key);
    }

    rows.push({
      session: lot.entryIndex,
      symbol: lot.symbol,
      contribution: lot.net - (twin?.net ?? 0),
      kind: twin ? 'paired' : 'new'
    });
  }

  for (const lot of b5.lots) {
    if (!matched.has(`${lot.bookId}#${lot.tradeId}`)) {
      rows.push({ session: lot.entryIndex, symbol: lot.symbol, contribution: -lot.net, kind: 'missed' });
    }
  }

  return rows;
};

export type IdleClass = 'idle-clean' | 'idle-then-conflicting' | 'busy-start';

export interface Attribution {
  shallowLots: number;
  shallowNet: number;
  idleClean: { lots: number; net: number };
  idleThenConflicting: { lots: number; net: number };
  busyStart: { lots: number; net: number };
  preempted: { lots: number; net: number };
}

export const classifyLot = (lot: LotRecord, b5Slots: Interval[]): IdleClass => {
  const span = { from: lot.decisionTime, to: lot.exitIndex >= 0 ? lot.exitTime : Infinity };

  if (b5Slots.some((slot) => slot.from <= span.from && span.from < slot.to)) {
    return 'busy-start';
  }

  return b5Slots.some((slot) => overlaps(span, slot)) ? 'idle-then-conflicting' : 'idle-clean';
};

export const attributionOf = (
  candidate: AllocResult,
  b5: AllocResult,
  from = -Infinity,
  to = Infinity
): Attribution => {
  const slots = slotIntervals(b5);
  const out: Attribution = {
    shallowLots: 0,
    shallowNet: 0,
    idleClean: { lots: 0, net: 0 },
    idleThenConflicting: { lots: 0, net: 0 },
    busyStart: { lots: 0, net: 0 },
    preempted: { lots: 0, net: 0 }
  };

  for (const lot of candidate.lots) {
    if (lot.tier !== 'shallow' || lot.entryTime < from || lot.entryTime > to) {
      continue;
    }

    out.shallowLots++;
    out.shallowNet += lot.net;

    const cls = classifyLot(lot, slots);
    const bucket =
      cls === 'idle-clean' ? out.idleClean : cls === 'idle-then-conflicting' ? out.idleThenConflicting : out.busyStart;

    bucket.lots++;
    bucket.net += lot.net;

    if (lot.exitReason === 'priority_preemption') {
      out.preempted.lots++;
      out.preempted.net += lot.net;
    }
  }

  return out;
};

export interface Compact {
  net: number;
  minuteDD: number;
  dailyDD: number;
  lots: number;
  shallowLots: number;
  shallowNet: number;
  deepNet: number;
  mirrorLots: number;
  switchesExecuted: number;
  switchesDeclined: number;
  switchesAborted: number;
  forcedLosses: number; // count of executed sales at a loss
  forcedLossNet: number;
  interest: number;
  costs: number;
  heldDays: number;
  worstLot: number;
  decisions: number;
  refused: number;
}

export const compactOf = (result: AllocResult): Compact => {
  let shallowLots = 0;
  let shallowNet = 0;
  let deepNet = 0;
  let mirrorLots = 0;
  let worstLot = 0;

  for (const lot of result.lots) {
    if (lot.tier === 'shallow') {
      shallowLots++;
      shallowNet += lot.net;
    } else {
      deepNet += lot.net;
    }

    if (lot.kind === 'mirror') {
      mirrorLots++;
    }

    worstLot = Math.min(worstLot, lot.net);
  }

  const executed = result.switches.filter((sw) => sw.outcome === 'executed');

  return {
    net: result.net,
    minuteDD: result.minuteDrawdown.maximum,
    dailyDD: result.dailyDrawdown.maximum,
    lots: result.lots.length,
    shallowLots,
    shallowNet,
    deepNet,
    mirrorLots,
    switchesExecuted: executed.length,
    switchesDeclined: result.switches.filter((sw) => sw.outcome.startsWith('declined')).length,
    switchesAborted: result.switches.filter((sw) => sw.outcome.startsWith('aborted')).length,
    forcedLosses: executed.filter((sw) => sw.saleNet < 0).length,
    forcedLossNet: executed.reduce((total, sw) => total + Math.min(0, sw.saleNet), 0),
    interest: result.interest,
    costs: result.costs,
    heldDays: result.heldDays,
    worstLot,
    decisions: result.decisions,
    refused: result.refused
  };
};

// Liquidation-mark increments between boundary sessions (exit friction at both ends; PROTOCOL.md §9.1).
export const incrementsOf = (result: AllocResult, boundaries: number[]) =>
  boundaries.slice(1).map((end, index) => result.liquidation[end]! - result.liquidation[boundaries[index]!]!);

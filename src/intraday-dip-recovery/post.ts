// Slices, the sequential procedure, validation windows, year tables, trade ledgers and concentration (PROTOCOL.md §10,
// §11, §14, §15). Every run is ONE continuous causal run from the first session: nothing is liquidated or reset at a
// boundary; window P&L is the change of the marked net between boundary closes; reset drawdowns restart at the
// boundary close with the peak = the marked net there.
import { formatNewYorkTime } from '#lib';
import { execution } from './context.ts';
import type { DoorView, RunSpec } from './evaluate.ts';
import { run } from './evaluate.ts';
import type { Lot, RunResult } from './engine.ts';

const iso = (t: number) => (Number.isFinite(t) ? new Date(t * 1000).toISOString().replace('.000Z', 'Z') : '');

export const lastSessionOn = (view: DoorView, date: string) => {
  let k = -1;

  view.door.sessions.forEach((s, n) => {
    if (s.date <= date) k = n;
  });

  return k;
};

// One slice after a cutoff close, from a continuous run (the run ends at the door's end).
export const sliceOf = (view: DoorView, spec: RunSpec, cutoffDate: string, endDate: string) => {
  const cut = lastSessionOn(view, cutoffDate);
  const end = lastSessionOn(view, endDate);
  const r = run(view, { ...spec, endSession: end, segmentEnds: [cut], marks: true });
  const atCut = r.dailyMarks[cut]!;
  const atEnd = r.dailyMarks[end]!;
  const cutClose = view.door.sessions[cut]!.closeTime;
  const crossing = r.lots.filter((l) => l.entryTime <= cutClose && (l.open || l.exitTime > cutClose));

  return {
    cutoffSession: view.door.sessions[cut]!.date,
    endSession: view.door.sessions[end]!.date,
    markAtCutoff: atCut,
    markAtEnd: atEnd,
    net: atEnd - atCut,
    resetDd: r.segments[1]!.drawdown,
    wholeDd: r.minuteDrawdown,
    lotsInSlice: r.lots.filter((l) => l.entryTime > cutClose).length,
    crossing: crossing.length,
    openAtCutoff: crossing.length > 0,
    openAtEnd: r.lots.some((l) => l.open),
    result: r,
    cut,
    end
  };
};

export type Slice = ReturnType<typeof sliceOf>;

// The sequential procedure: the fold primaries trade their slices in turn (flat where a fold has none); each slice's
// marks come from that primary's own continuous run (every minute mark after the cutoff close, offset to the chain);
// a switch between different configurations at a boundary is charged 5 bps on $100,000 for each open lot it closes
// (the outgoing primary is long at its slice's end) or adopts (the incoming primary is long at its cutoff close). The
// chained net and the strict minute drawdown of the chained marks are reported.
export const sequentialOf = (parts: { cutoff: string; id: string | null; slice: Slice | null; cutCloseTime: number }[]) => {
  const charge = (execution.costBps / 10000) * execution.principal;
  let base = 0;
  let peak = 0;
  let peakAt = '';
  let dd = 0;
  let ddPeakAt = '';
  let ddTroughAt = '';
  let charges = 0;
  const rows: Record<string, unknown>[] = [];
  const update = (value: number, at: string) => {
    if (value > peak) {
      peak = value;
      peakAt = at;
    }

    if (peak - value > dd) {
      dd = peak - value;
      ddPeakAt = peakAt;
      ddTroughAt = at;
    }
  };

  parts.forEach((p, n) => {
    const prev = parts[n - 1];
    let switchCost = 0;

    if (prev && prev.id !== p.id) {
      if (prev.slice?.openAtEnd) switchCost += charge;
      if (p.slice?.openAtCutoff) switchCost += charge;
    }

    base -= switchCost;
    charges += switchCost;
    update(base, `${p.cutoff} boundary`);

    if (p.slice) {
      const m = p.slice.result.marks!;
      const start = p.slice.markAtCutoff;

      for (let k = 0; k < m.count; k++) if (m.time[k]! > p.cutCloseTime) update(base + (m.value[k]! - start), iso(m.time[k]!));

      base += p.slice.net;
    }

    rows.push({ cutoff: p.cutoff, primary: p.id, sliceNet: p.slice?.net ?? 0, sliceResetDd: p.slice?.resetDd.maximum ?? 0, switchCost, cumulative: base });
  });

  return { rows, net: base, charges, minuteDd: dd, ddPeakAt, ddTroughAt };
};

// Windows of a continuous FULL run (validation): development to the 2024 close, 2025, 2026 (partial), validation, and
// the reset and whole-run drawdowns; per-year marked P&L with in-year reset drawdowns.
export const windowsOf = (view: DoorView, spec: RunSpec, boundaryYears = { development: '2024', first: '2025' }) => {
  const ends = view.yearEnds;
  const r = run(view, { ...spec, segmentEnds: ends });
  const sessionOfYear = (y: string) => ends.find((e) => view.door.sessions[e]!.date.startsWith(y))!;
  const d24 = sessionOfYear(boundaryYears.development);
  const d25 = sessionOfYear(boundaryYears.first);
  const markAt = (s: number) => r.dailyMarks[s]!;
  const years = ends.map((e, n) => {
    const y = view.door.sessions[e]!.date.slice(0, 4);
    const prev = n === 0 ? 0 : markAt(ends[n - 1]!);
    const seg = r.segments[n]!;

    return { year: y, net: markAt(e) - prev, resetDd: seg.drawdown.maximum, lotsEntered: r.lots.filter((l) => view.door.sessions[l.entrySession]!.date.startsWith(y)).length };
  });
  // the validation reset drawdown: a dedicated run with one boundary at the 2024 close
  const v = run(view, { ...spec, segmentEnds: [d24] });
  const boundary = view.door.sessions[d24]!.closeTime;

  return {
    development: markAt(d24),
    y2025: markAt(d25) - markAt(d24),
    y2026: r.net - markAt(d25),
    validation: r.net - markAt(d24),
    validationRealized: r.realized - r.lots.filter((l) => !l.open && l.exitTime <= boundary).reduce((t, l) => t + l.net, 0),
    validationResetDd: v.segments[1]!.drawdown,
    wholeRunDd: r.minuteDrawdown,
    full: r.net,
    lotsAfterBoundary: r.lots.filter((l) => l.entryTime > boundary).length,
    crossingBoundary: r.lots.filter((l) => l.entryTime <= boundary && (l.open || l.exitTime > boundary)).length,
    openAtEnd: r.lots.some((l) => l.open),
    years,
    result: r
  };
};

// The per-trade ledger (UTC and New York times; the signal and the fill; money; MAE/MFE; capacity).
export const ledgerOf = (view: DoorView, r: RunResult) => {
  const { bars, sessions } = view.market;
  const volume = view.door.volume;

  return r.lots.map((l: Lot) => {
    const fillBar = Math.min(l.entryBar, bars.count - 1);
    const dollarVolume = l.entryBar < bars.count && l.entryExecution !== 'closing print' ? volume[fillBar]! * bars.close[fillBar]! : NaN;
    // the causal liquidity proxy: the median dollar volume of the 30 bars before the decision
    const prior: number[] = [];

    for (let b = fillBar - 1; b >= 0 && prior.length < 30; b--) if (bars.time[b]! < l.decisionTime) prior.push(volume[b]! * bars.close[b]!);

    prior.sort((a, b) => a - b);

    const causal = prior.length ? prior[prior.length >> 1]! : NaN;
    const holdMinutes = l.open ? NaN : (l.exitTime - l.entryTime) / 60;

    return {
      id: l.id,
      path: l.setupKind,
      armedUtc: iso(l.activationTime - 60),
      signalUtc: iso(l.decisionTime),
      signalPrice: l.decisionPrice,
      entryUtc: iso(l.entryTime),
      entryEt: formatNewYorkTime(l.entryTime),
      entryDate: sessions.date[l.entrySession],
      entryExecution: l.entryExecution,
      entryRaw: l.entryRaw,
      entryPrice: l.entryPrice,
      exitUtc: l.open ? '' : iso(l.exitTime),
      exitEt: l.open ? '' : formatNewYorkTime(l.exitTime),
      exitDate: l.open ? '' : sessions.date[l.exitSession],
      exitReason: l.open ? 'open at the end (marked)' : l.exitReason,
      exitExecution: l.exitExecution,
      exitRaw: l.exitRaw,
      exitPrice: l.exitPrice,
      stopAtExit: l.stopAtExit,
      shares: l.shares,
      gross: l.gross,
      friction: l.costs,
      interest: l.interest,
      net: l.net,
      realized: l.open ? 0 : l.net,
      marked: l.open ? l.net : 0,
      mae: l.mae,
      mfe: l.mfe,
      holdMinutes,
      sameSession: !l.open && l.exitSession === l.entrySession,
      overnight: !l.open && l.exitSession !== l.entrySession,
      fillMinuteDollarVolume: dollarVolume,
      participationFillMinute: execution.principal / dollarVolume,
      causalMedianDollarVolume30: causal,
      participationCausal: execution.principal / causal,
      capacityFlag: execution.principal / causal > 0.1 ? 'over 10% of the causal median minute dollar volume' : ''
    };
  });
};

export const yearTableOf = (view: DoorView, r: RunResult) => {
  const years = new Map<string, { trades: number; wins: number; gross: number; costs: number; interest: number; net: number; worst: number; best: number }>();

  for (const l of r.lots) {
    const y = view.door.sessions[l.entrySession]!.date.slice(0, 4);
    const row = years.get(y) ?? { trades: 0, wins: 0, gross: 0, costs: 0, interest: 0, net: 0, worst: 0, best: 0 };

    row.trades++;
    if (l.net > 0) row.wins++;
    row.gross += l.gross + l.costs;
    row.costs += l.costs;
    row.interest += l.interest;
    row.net += l.net;
    row.worst = Math.min(row.worst, l.net);
    row.best = Math.max(row.best, l.net);
    years.set(y, row);
  }

  return [...years.entries()].sort().map(([year, v]) => ({ year, ...v, preCostGross: v.gross }));
};

// Concentration: independent episodes = calendar months with an entry (predeclared, causal: the month is known when the
// entry is made); the top episode = the month whose entered lots earned the most; the blackout rerun bars new funding in
// that month's sessions and changes nothing else.
export const concentrationOf = (view: DoorView, spec: RunSpec, r: RunResult) => {
  const months = new Map<string, number>();

  for (const l of r.lots) {
    const m = view.door.sessions[l.entrySession]!.date.slice(0, 7);

    months.set(m, (months.get(m) ?? 0) + l.net);
  }

  const ranked = [...months.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  let blackout: Record<string, unknown> | null = null;

  if (top) {
    const first = view.door.sessions.findIndex((s) => s.date.startsWith(top[0]));
    const last = lastSessionOn(view, `${top[0]}-31`);
    const b = run(view, { ...spec, blackout: [first, last] });

    blackout = { month: top[0], monthNet: top[1], net: b.net, dd: b.minuteDrawdown.maximum, lots: b.lots.length, refused: b.refused, change: b.net - r.net };
  }

  const nets = r.lots.map((l) => l.net).sort((a, b) => b - a);
  const total = r.net;

  return {
    episodes: months.size,
    years: new Set([...months.keys()].map((m) => m.slice(0, 4))).size,
    topEpisode: top ? { month: top[0], net: top[1], share: total !== 0 ? top[1] / total : NaN } : null,
    topTradeShare: total !== 0 && nets.length ? nets[0]! / total : NaN,
    top5TradeShare: total !== 0 ? nets.slice(0, 5).reduce((t, v) => t + v, 0) / total : NaN,
    worstTrade: nets.length ? nets[nets.length - 1]! : 0,
    longestLosingStreak: r.lots.reduce(
      (acc, l) => (l.net < 0 ? { cur: acc.cur + 1, max: Math.max(acc.max, acc.cur + 1) } : { cur: 0, max: acc.max }),
      { cur: 0, max: 0 }
    ).max,
    profitFactor: (() => {
      const w = r.lots.filter((l) => l.net > 0).reduce((t, l) => t + l.net, 0);
      const lo = -r.lots.filter((l) => l.net < 0).reduce((t, l) => t + l.net, 0);

      return lo > 0 ? w / lo : Infinity;
    })(),
    blackout
  };
};

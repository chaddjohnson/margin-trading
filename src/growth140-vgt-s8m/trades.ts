// Trade-level comparison with #4 inside one window (PROTOCOL.md §8.3), the predeclared one-to-one matching rule:
//
// 1. Winners are CLOSED trades with net > 0 (an open position is reported separately, never matched).
// 2. A candidate winner and a #4 winner can be matched when their holding intervals [entry session, exit session]
//    share at least one session. Pairs are matched one-to-one greedily by: larger shared sessions, then smaller
//    |entry-session difference|, then earlier #4 entry, then earlier candidate entry.
// 3. A matched pair is RETAINED when both the entry and the exit sessions differ by ≤ 3 sessions, else RETIMED.
// 4. An unmatched candidate winner that overlaps a #4 winner already matched is an EXTRA ENTRY into that #4 move;
//    one that overlaps only #4 losing trades is a NEW WIN ON A #4 LOSING MOVE; one that overlaps no #4 trade is part of
//    a GENUINELY NEW WINNING MOVE. New moves are counted as the candidate's episodes (gap > 10 sessions) holding such
//    winners; a second such winner in the same episode is an extra entry into a new move.
// 5. Unmatched #4 winners are LOST, listed with their net.
// 6. Evidence is SPARSE (reported as inconclusive) when #4 has fewer than 5 winners in the window or fewer than 3 pairs
//    are matched.
import { episodeGap } from './context.ts';
import type { TradeRow } from './engine.ts';

const overlap = (a: TradeRow, b: TradeRow) => {
  const lo = Math.max(a.entryIndex, b.entryIndex);
  const hi = Math.min(a.exitIndex, b.exitIndex);

  return hi >= lo ? hi - lo + 1 : 0;
};

export const winnersOf = (trades: readonly TradeRow[]) => trades.filter((t) => t.status === 'closed' && t.net > 0);

export const matchWinners = (candidate: readonly TradeRow[], control: readonly TradeRow[]) => {
  const cw = winnersOf(candidate);
  const fw = winnersOf(control);
  const fClosed = control.filter((t) => t.status === 'closed');
  const pairs: { c: TradeRow; f: TradeRow; shared: number }[] = [];

  for (const c of cw)
    for (const f of fw) {
      const shared = overlap(c, f);

      if (shared > 0) pairs.push({ c, f, shared });
    }

  pairs.sort(
    (a, b) =>
      b.shared - a.shared ||
      Math.abs(a.c.entryIndex - a.f.entryIndex) - Math.abs(b.c.entryIndex - b.f.entryIndex) ||
      a.f.entryIndex - b.f.entryIndex ||
      a.c.entryIndex - b.c.entryIndex
  );

  const usedC = new Set<number>();
  const usedF = new Set<number>();
  const matched: {
    candidate: number;
    control: number;
    shared: number;
    kind: 'retained' | 'retimed';
    entryShift: number;
    exitShift: number;
    candidateNet: number;
    controlNet: number;
  }[] = [];

  for (const p of pairs) {
    if (usedC.has(p.c.n) || usedF.has(p.f.n)) continue;
    usedC.add(p.c.n);
    usedF.add(p.f.n);

    const entryShift = p.c.entryIndex - p.f.entryIndex;
    const exitShift = p.c.exitIndex - p.f.exitIndex;

    matched.push({
      candidate: p.c.n,
      control: p.f.n,
      shared: p.shared,
      kind: Math.abs(entryShift) <= 3 && Math.abs(exitShift) <= 3 ? 'retained' : 'retimed',
      entryShift,
      exitShift,
      candidateNet: p.c.net,
      controlNet: p.f.net
    });
  }

  const extraInControlMove: number[] = [];
  const newOnControlLoser: number[] = [];
  const newMoveWinners: TradeRow[] = [];

  for (const c of cw) {
    if (usedC.has(c.n)) continue;
    if (fw.some((f) => overlap(c, f) > 0)) extraInControlMove.push(c.n);
    else if (
      fClosed.some((f) => overlap(c, f) > 0) ||
      control.some((f) => f.status === 'open' && c.exitIndex >= f.entryIndex)
    )
      newOnControlLoser.push(c.n);
    else newMoveWinners.push(c);
  }

  // genuinely new moves: the candidate's episodes that hold such winners
  const episodeOf = new Map<number, number>();
  let episode = 0;
  let lastExit = -Infinity;

  for (const t of candidate) {
    if (t.entryIndex - lastExit > episodeGap) episode++;
    episodeOf.set(t.n, episode);
    lastExit = t.status === 'open' ? Infinity : t.exitIndex;
  }

  const newMoves = new Map<number, number[]>();

  for (const t of newMoveWinners)
    newMoves.set(episodeOf.get(t.n)!, [...(newMoves.get(episodeOf.get(t.n)!) ?? []), t.n]);

  const lost = fw
    .filter((f) => !usedF.has(f.n))
    .map((f) => ({ control: f.n, entryDate: f.entryDate, exitDate: f.exitDate, net: f.net }));
  const losses = (ts: readonly TradeRow[]) => ts.filter((t) => t.status === 'closed' && t.net < 0);

  return {
    candidateWinners: cw.length,
    controlWinners: fw.length,
    retained: matched.filter((m) => m.kind === 'retained').length,
    retimed: matched.filter((m) => m.kind === 'retimed').length,
    matched,
    extraEntriesInControlMoves: extraInControlMove,
    newWinsOnControlLosingMoves: newOnControlLoser,
    newWinningMoves: newMoves.size,
    newMoveWinners: newMoveWinners.map((t) => t.n),
    extraEntriesInNewMoves: newMoveWinners.length - newMoves.size,
    lostControlWinners: lost,
    lostControlWinnersNet: lost.reduce((a, l) => a + l.net, 0),
    candidateLosses: losses(candidate).length,
    controlLosses: losses(control).length,
    candidateLossSum: losses(candidate).reduce((a, t) => a + t.net, 0),
    controlLossSum: losses(control).reduce((a, t) => a + t.net, 0),
    sparse: fw.length < 5 || matched.length < 3
  };
};

// Ledger Jaccard on entry sessions (the extra-role distinctness rule).
export const ledgerJaccard = (a: readonly TradeRow[], b: readonly TradeRow[]) => {
  const x = new Set(a.map((t) => t.entryDate));
  const y = new Set(b.map((t) => t.entryDate));
  const inter = [...x].filter((d) => y.has(d)).length;
  const union = new Set([...x, ...y]).size;

  return union ? inter / union : 1;
};

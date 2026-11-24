// The sequential path of a procedure and its frozen verdict (PROTOCOL.md §11.2; standard §1.8) — Assignment 3's
// semantics (src/vg-l0-full-joint/folds.ts runSequential): the fold primaries chained over 2020–2021, 2022–2023 and 2024,
// each slice the primary's OWN continuous run from 2016-01-04 with the cutoff close as its boundary (state, open lots and
// marks preserved), its path taken relative to its boundary equity; 5 bps of $100,000 per open lot closed or adopted at a
// switch (none when the same configuration continues); a fold without a primary is flat (it closes the previous
// primary's open lots).
//
// THE DRAWDOWN (adaptation AD4). Assignment 3 tracked the concatenated MINUTE marks of the slices (CPU minute mark
// changes). The accepted GPU path returns no minute mark series (markChanges null; ≤ 16 period boundaries per
// evaluation; lots without their intraday best), and a CPU-scored official statistic is forbidden (standard §9.2). The
// verdict therefore uses the strict drawdown of the chain over EVERY MARK THE GPU OBSERVES EXACTLY:
//   D = max over slices k of max( DD_k , P_<k − (O_k + m_k) )
//   DD_k  the slice's exact MINUTE reset drawdown (the GPU period tracker restarted at the cutoff close: every
//         intra-slice minute mark);
//   O_k   the chain's offset at slice k (Σ earlier slice nets − every switch charge so far, the charge of slice k included);
//   P_<k  the running maximum of the chain over every earlier observed mark: 0 at the start and every session close of
//         every earlier slice (exact: the GPU period equities of 16-boundary evaluations at every session close);
//   m_k   the minimum of slice k's observed marks relative to its boundary: every session close, and the exact minute
//         minimum of every lot that lives inside the slice (realized base + the lot's MAE, from the detailed record; a lot
//         carried over the boundary counts only when its MAE date is after the boundary).
// Each term is an exact mark of the chain, so D is a lower bound of Assignment 3's minute statistic that differs from it
// only by a cross-boundary peak or trough inside a session that no session close or lot minimum shows. The CPU reference
// computation of the exact minute chain is reported beside it, non-official (purpose cpu-reference), never the verdict.
import { ceiling } from './context.ts';

export interface SliceLot {
  book: string;
  entry: string; // session date
  exit: string | null; // session date; null = open at the slice's door end
  net: number;
  mae: number; // min(the lowest minute mark during the lot's life, its final net)
  maeAt: string | null;
}

export interface SliceRow {
  label: string;
  id: string;
  boundary: string; // the cutoff close (session date)
  boundaryEquity: number; // the marked net at the cutoff close (absolute)
  sliceNet: number; // the marked net at the slice end − boundaryEquity
  sliceDd: number; // the minute reset drawdown from the cutoff close
  closes: { date: string; equity: number }[]; // the marked net at every session close of the slice (absolute), in order
  lots: SliceLot[]; // every funded lot of the run (the detailed record's rows), in pool order
}

export const openAtBoundary = (r: SliceRow) => r.lots.filter((l) => l.entry <= r.boundary && (l.exit === null || l.exit > r.boundary)).length;
export const openAtEnd = (r: SliceRow) => r.lots.filter((l) => l.exit === null).length;

// slice k's observed marks relative to its boundary equity: its session closes and the exact lot minima inside it
export const sliceMarks = (r: SliceRow) => {
  const closes = r.closes.filter((c) => c.date > r.boundary).map((c) => c.equity - r.boundaryEquity);
  let base = 0; // the realized level before each lot (Σ nets of earlier lots; one exclusive slot)
  const lotMinima: number[] = [];

  for (const l of r.lots) {
    const inside = l.entry > r.boundary || (l.exit === null || l.exit > r.boundary ? (l.maeAt ?? '') > r.boundary : false);

    if (inside && (l.exit === null || l.exit > r.boundary)) lotMinima.push(base + l.mae - r.boundaryEquity);
    base += l.net;
  }

  const all = [...closes, ...lotMinima];

  return { closes, lotMinima, min: all.length ? Math.min(...all) : 0, max: closes.length ? Math.max(...closes) : 0, end: closes.at(-1) ?? 0 };
};

export interface ChainPart {
  fold: string;
  label: string | null;
  id: string | null;
  sliceNet: number;
  sliceDd: number;
  charge: number;
  offset: number; // O_k
  priorPeak: number; // P_<k
  minimum: number; // m_k
  crossTerm: number; // P_<k − (O_k + m_k)
}

export const charge = 0.0005 * 100_000; // 5 bps of the $100,000 slot per open lot closed or adopted at a switch

export const chain = (folds: readonly string[], rows: readonly (SliceRow | null)[]) => {
  const parts: ChainPart[] = [];
  let offset = 0;
  let peak = 0; // the chain's running maximum over observed marks (the tracker starts at 0)
  let prev: SliceRow | null = null;
  let dd = 0;
  let where = '';

  folds.forEach((fold, k) => {
    const row = rows[k] ?? null;
    let ch = 0;

    if (row && prev && prev.id !== row.id) ch = charge * (openAtEnd(prev) + openAtBoundary(row));
    if (!row && prev) ch = charge * openAtEnd(prev);
    offset -= ch;

    if (!row) {
      parts.push({ fold, label: null, id: null, sliceNet: 0, sliceDd: 0, charge: ch, offset, priorPeak: peak, minimum: 0, crossTerm: Math.max(0, peak - offset) });
      if (peak - offset > dd) {
        dd = peak - offset;
        where = `${fold} (flat; switch charge)`;
      }
      prev = null;
      return;
    }

    const m = sliceMarks(row);
    const cross = peak - (offset + m.min);

    if (row.sliceDd > dd) {
      dd = row.sliceDd;
      where = `${fold} (minute reset drawdown inside the slice)`;
    }
    if (cross > dd) {
      dd = cross;
      where = `${fold} (from an earlier peak across the boundary)`;
    }
    parts.push({ fold, label: row.label, id: row.id, sliceNet: row.sliceNet, sliceDd: row.sliceDd, charge: ch, offset, priorPeak: peak, minimum: m.min, crossTerm: cross });
    for (const c of m.closes) peak = Math.max(peak, offset + c);
    offset += row.sliceNet;
    prev = row;
  });

  const charges = parts.reduce((a, p) => a + p.charge, 0);
  const net = parts.reduce((a, p) => a + p.sliceNet, 0) - charges;

  return { parts, charges, net, drawdown: dd, drawdownAt: where, withinCeiling: dd <= ceiling };
};

export const verdictOf = (folds: readonly string[], labels: readonly (string | null)[], c: ReturnType<typeof chain>) =>
  labels.some((l) => l === null)
    ? `chronologically incomplete: ${folds.filter((_f, i) => labels[i] === null).join(', ')} had no qualified candidate (flat) — no chronological support`
    : c.net > 0 && c.withinCeiling
      ? 'supported (every fold produced a primary; sequential net > 0 and sequential drawdown ≤ $35,000)'
      : 'unsupported (sequential net ≤ 0 or sequential drawdown > $35,000)';

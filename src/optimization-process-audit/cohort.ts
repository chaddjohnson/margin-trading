// The hindsight cohort K(s, c) (PROTOCOL.md §7.4; development-only, deterministic, frozen before any non-published
// next-slice outcome). Universe: every configuration fitted in the subject's independent search job of the cutoff
// (the archive scan) plus the sealed independent shortlist. Strata S, R3, R2, F, P, U; quotas; within a stratum,
// round-robin over the subject's cells and evenly spaced training-profit ranks ⌊i·n/k⌋ (the top always included).
import { type HistCut, budgets } from './context.ts';
import { type Stage, laneSets, stageOf } from './inventory.ts';
import { type ScanRow, readScan } from './scan.ts';
import type { SubjectKey } from './sources.ts';
import { independentSet } from './subjects.ts';

export type Stratum = Exclude<Stage, 'M'>;
export const strata: Stratum[] = ['S', 'R3', 'R2', 'F', 'P', 'U'];

export interface CohortMember {
  id: string;
  stratum: Stratum;
  cell: string;
  label: string | null; // the sealed shortlist label (S only)
  qualified: boolean | null; // S only
  profitRankInStratum: number; // 1 = highest training centre net within its stratum and cell
  training: Pick<ScanRow, 'net' | 'dd' | 'lots' | 'episodes' | 'topEpisodeShare' | 'exBestYear' | 'sessionsHeld' | 'signature'> & {
    r1Robust: number | null;
    r1P90Dd: number | null;
    r1Worst2Dd: number | null;
    r1Distinct: number | null;
  };
}

// The quotas: S in full; R = total − |S|; U gets 8; R − 8 split equally over R3, R2, F, P (first strata take the odd
// units); a shortfall passes on in the order R3 → R2 → F → P → U.
export const quotasOf = (sSize: number, available: Record<Stratum, number>, total = budgets.cohortPerCut) => {
  const rest = Math.max(0, total - sSize);
  const u = Math.min(8, rest);
  const body = rest - u;
  const base = Math.floor(body / 4);
  const odd = body - 4 * base;
  const planned: Record<Stratum, number> = { S: sSize, R3: base + (odd > 0 ? 1 : 0), R2: base + (odd > 1 ? 1 : 0), F: base + (odd > 2 ? 1 : 0), P: base, U: u };
  const taken: Record<Stratum, number> = { S: sSize, R3: 0, R2: 0, F: 0, P: 0, U: 0 };
  let carry = 0;

  for (const st of ['R3', 'R2', 'F', 'P', 'U'] as const) {
    const want = planned[st] + carry;

    taken[st] = Math.min(want, available[st]);
    carry = want - taken[st];
  }

  return { planned, taken, unused: carry };
};

// k picks from n members sorted by training centre net (descending, ties by identity): ranks ⌊i·n/k⌋.
export const rankPicks = (n: number, k: number) => {
  const out: number[] = [];

  for (let i = 0; i < Math.min(k, n); i++) out.push(Math.floor((i * n) / Math.min(k, n)));
  return out;
};

// Spread k over cells round-robin in cell order, a cell's shortfall passing to the others.
export const cellQuotas = (cells: { cell: string; n: number }[], k: number) => {
  const q: Record<string, number> = Object.fromEntries(cells.map((c) => [c.cell, 0]));
  let left = k;

  while (left > 0) {
    let progressed = false;

    for (const c of cells) {
      if (left === 0) break;
      if (q[c.cell]! < c.n) {
        q[c.cell]!++;
        left--;
        progressed = true;
      }
    }

    if (!progressed) break;
  }

  return q;
};

const byNet = (a: ScanRow, b: ScanRow) => b.net - a.net || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export const buildCohort = (s: SubjectKey, cut: HistCut) => {
  const rows = readScan(s, cut);
  const sets = laneSets(s, cut);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const indep = independentSet(s, cut);
  const pools: Record<Stratum, ScanRow[]> = { S: [], R3: [], R2: [], F: [], P: [], U: [] };
  let unmeasured = 0;

  for (const r of rows) {
    const st = stageOf(r, sets);

    if (st === 'M') unmeasured++;
    else pools[st].push(r);
  }

  // S is the sealed qualification set (every shortlisted member), in full
  const sMembers: CohortMember[] = indep.map((e) => {
    const r = byId.get(e.id);

    if (!r) throw new Error(`${s} ${cut}: shortlisted ${e.label} is not in the archive scan`);
    return memberOf(r, 'S', e.label, e.qualified, 0);
  });
  const avail = Object.fromEntries(strata.map((st) => [st, pools[st].length])) as Record<Stratum, number>;
  const quotas = quotasOf(sMembers.length, avail);
  const out: CohortMember[] = [...sMembers];

  for (const st of ['R3', 'R2', 'F', 'P', 'U'] as const) {
    const k = quotas.taken[st];

    if (k === 0) continue;

    const cells = [...new Set(pools[st].map((r) => r.cell))].sort();
    const byCell = Object.fromEntries(cells.map((c) => [c, pools[st].filter((r) => r.cell === c).sort(byNet)]));
    const cq = cellQuotas(cells.map((c) => ({ cell: c, n: byCell[c]!.length })), k);

    for (const c of cells)
      for (const rank of rankPicks(byCell[c]!.length, cq[c]!)) out.push(memberOf(byCell[c]![rank]!, st, null, null, rank + 1));
  }

  if (new Set(out.map((m) => m.id)).size !== out.length) throw new Error(`${s} ${cut}: duplicate cohort identity`);

  return {
    members: out,
    quotas,
    available: avail,
    unmeasuredExcluded: unmeasured,
    duplicateLedgers: out.length - new Set(out.map((m) => m.training.signature)).size
  };
};

const memberOf = (r: ScanRow, stratum: Stratum, label: string | null, qualified: boolean | null, rank: number): CohortMember => ({
  id: r.id,
  stratum,
  cell: r.cell,
  label,
  qualified,
  profitRankInStratum: rank,
  training: {
    net: r.net,
    dd: r.dd,
    lots: r.lots,
    episodes: r.episodes,
    topEpisodeShare: r.topEpisodeShare,
    exBestYear: r.exBestYear,
    sessionsHeld: r.sessionsHeld,
    signature: r.signature,
    r1Robust: r.nb?.robust ?? null,
    r1P90Dd: r.nb?.p90Dd ?? null,
    r1Worst2Dd: r.nb?.worst2Dd ?? null,
    r1Distinct: r.nb?.distinct ?? null
  }
});

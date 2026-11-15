// Track N's informed seeds (PROTOCOL.md §7.4; brief §3.2): the four verified lineage incumbents (New L0, IJ1, C4,
// C4-refined: nl0.ts) projected onto every D1 risk-control structure through a PRECOMMITTED control-parameter seed grid.
//
// One informed lane per FAMILY PAIR (16) and replicate (4): its 16 projected seeds = 4 incumbents × the 4 gate states of
// the pair. Seed (incumbent i, gate state j) takes the incumbent's own D1 vectors and Growth·VGT, the cell (pair, gate
// state j), and from the grid
//   GDX level a = (i + j) mod 4,   VGT level b = (i + 2j + 1) mod 4   (each level 4 times per book and lane)
//   level:              0     1     2     3
//   d   (tenths)       80   120   160   200     protective-stop distance 8–20% (B, C, D)
//   hx  (days)       h+3   h+9  h+15  h+21     adaptive extended hold over the book's hold h, ≤ 60 (D)
//   g   (tenths)       20    40    70   100     adaptive progress 2–10% (D)
//   K                   1     2     3     4     decline gate losses
//   r   (tenths)      300   500   700   900     gate recovery 30–90% of the decline
//   c   (sessions)     20    60   120   240     gate cooldown
//   activation: GDX entry-day iff (i + j) is odd; VGT entry-day iff (i + ⌊j / 2⌋) is odd (each combination once per
//   incumbent; 8 of 16 seeds per book).
// A book whose gate is OFF in its gate state keeps its grid K, r and c as DORMANT genome values (an island or a
// refinement switch that turns the gate ON starts there). Focus seeds (NL0's focused investigation, two per lane): New L0
// at gate state (R − 1) mod 4 and C4-refined at gate state (R + 1) mod 4 — across the 4 replicates each covers every gate
// state once, so the focus is not concentrated on New L0's own (ungated, legacy) structure.
import { type Sym, symbols } from './context.ts';
import { type IncumbentKey, incumbentKeys, incumbents } from './nl0.ts';
import {
  type Cfg,
  type CtlValues,
  type PairId,
  cellOfPairGate,
  ctlIndex,
  ctlOffset,
  encode,
  gateStates,
  pinPair,
  project
} from './space.ts';
import type { Seed } from './search.ts';

export const seedGrid = {
  d: [80, 120, 160, 200],
  hxOver: [3, 9, 15, 21],
  g: [20, 40, 70, 100],
  k: [1, 2, 3, 4],
  r: [300, 500, 700, 900],
  c: [20, 60, 120, 240]
} as const;

export const informedReplicates = 4;
export const focusOf = (replicate: number): { key: IncumbentKey; gateState: number }[] => [
  { key: 'NL0', gateState: (replicate - 1) % 4 },
  { key: 'C4R', gateState: (replicate + 1) % 4 }
];

const gridValues = (level: number, hold: number): CtlValues => ({
  d: seedGrid.d[level],
  hx: Math.min(60, hold + seedGrid.hxOver[level]!),
  g: seedGrid.g[level],
  k: seedGrid.k[level],
  r: seedGrid.r[level],
  c: seedGrid.c[level]
});

export interface ProjectedSeed extends Seed {
  incumbent: IncumbentKey;
  gateState: number;
  levels: Record<Sym, number>;
}

export const projectedSeeds = (pair: PairId, replicate: number): ProjectedSeed[] => {
  const inc = incumbents();
  const focus = focusOf(replicate);
  const out: ProjectedSeed[] = [];

  incumbentKeys.forEach((key, i) => {
    for (let j = 0; j < gateStates.length; j++) {
      const cell = cellOfPairGate(pair, j);
      const q = inc[key].quad;
      const levels: Record<Sym, number> = { GDX: (i + j) % 4, VGT: (i + 2 * j + 1) % 4 };
      const ctl = { GDX: gridValues(levels.GDX, q.d1.GDX.maximumHoldDays), VGT: gridValues(levels.VGT, q.d1.VGT.maximumHoldDays) };
      const entryDay = { GDX: (i + j) % 2 === 1, VGT: (i + Math.floor(j / 2)) % 2 === 1 };
      const cfg: Cfg = project(q, cell, ctl, entryDay);
      const genome = pinPair(encode(cfg, 'fine'), pair);

      // the dormant gate controls of a gate-OFF book: the grid's K, r, c
      for (const s of symbols)
        if (!cell[s].gate)
          for (const k of ['k', 'r', 'c'] as const) {
            const box = { k: [1, 1], r: [100, 10], c: [5, 1] }[k]!;

            genome[ctlOffset[s] + ctlIndex(k)] = (ctl[s][k]! - box[0]!) / box[1]!;
          }

      out.push({
        label: `${key}@${cell.id}`,
        cfg,
        genome,
        focus: focus.some((f) => f.key === key && f.gateState === j),
        incumbent: key,
        gateState: j,
        levels
      });
    }
  });

  return out;
};

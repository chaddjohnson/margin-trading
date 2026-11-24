// Track N's informed seeds (PROTOCOL.md §7.4): N/original ONLY (brief §3.1: "Seed precisely from N/original"; New L0 and
// I1 are benchmarks, never seeds), projected onto every D1 family pair through Assignment 3's informed machinery
// (src/vg-l0-full-joint/informed.ts, adapted from four incumbents to one).
//
// One informed lane per FAMILY PAIR (16) and replicate: its 16 projected seeds = N/original's own D1 vectors and
// Growth·VGT on each of the pair's 4 gate states j × 4 control variants v:
//   v = 0  NATIVE — each control value N/original's own where its book has it (GDX: d 159, hx 28, g 70, K 3, r 700, c 60;
//          VGT: d 120); a missing one from Assignment 3's precommitted grid at GDX level (0 + j) mod 4, VGT level
//          (0 + 2j + 1) mod 4; activations N/original's own (next-session on both books). In pair GD.VB at gate state 1
//          (GDX gate ON, VGT OFF) this is N/original EXACTLY (tested);
//   v = 1–3 GRID — every control value from Assignment 3's grid at GDX level (v + j) mod 4 and VGT level (v + 2j + 1) mod 4
//          (its formula with the incumbent index i := v), activation GDX entry-day iff (v + j) odd and VGT entry-day iff
//          (v + ⌊j / 2⌋) odd (Assignment 3's formula, i := v).
// A gate-OFF book keeps its K, r, c as DORMANT genome values (an island or refinement switch that turns the gate ON starts
// there). Duplicates (books whose family has no control, e.g. family A) are dropped by the lane's design de-duplication.
// Focus seeds (NL0's focused investigation, two per lane): the NATIVE projection at gate state (1 + R − 1) mod 4 and at
// (1 + R + 1) mod 4 (1 = N/original's own gate state), so that across four replicates each covers every gate state and,
// in N/original's own pair GD.VB, N/original itself is a focus seed in every odd replicate.
import { type Sym, symbols } from '../vg-l0-full-joint/context.ts';
import { seedGrid } from '../vg-l0-full-joint/informed.ts';
import {
  type Cfg,
  type CtlValues,
  type PairId,
  cellOfPairGate,
  controlValuesOf,
  ctlIndex,
  ctlOffset,
  encode,
  entryDayOf,
  gateStates,
  pinPair,
  project,
  quadOf
} from '../vg-l0-full-joint/space.ts';
import type { Seed } from '../vg-l0-risk-envelope-pilot/search.ts';
import { references } from './incumbents.ts';

export const nativeGateState = 1; // N/original's cell GD1.VB0: GDX gate ON, VGT gate OFF = gateStates[1]
export const variants = [0, 1, 2, 3] as const;

const gridValues = (level: number, hold: number): CtlValues => ({
  d: seedGrid.d[level],
  hx: Math.min(60, hold + seedGrid.hxOver[level]!),
  g: seedGrid.g[level],
  k: seedGrid.k[level],
  r: seedGrid.r[level],
  c: seedGrid.c[level]
});

export const focusGateStates = (replicate: number) => [(nativeGateState + replicate - 1) % 4, (nativeGateState + replicate + 1) % 4];

export interface ProjectedSeed extends Seed {
  gateState: number;
  variant: number;
  levels: Record<Sym, number>;
}

export const projectedSeeds = (pair: PairId, replicate: number): ProjectedSeed[] => {
  const n = references().NORIG.cfg;
  const q = quadOf(n);
  const native = { GDX: controlValuesOf(n, 'GDX'), VGT: controlValuesOf(n, 'VGT') };
  const nativeAct = { GDX: entryDayOf(n, 'GDX'), VGT: entryDayOf(n, 'VGT') };
  const focus = focusGateStates(replicate);
  const out: ProjectedSeed[] = [];

  for (const v of variants)
    for (let j = 0; j < gateStates.length; j++) {
      const cell = cellOfPairGate(pair, j);
      const levels: Record<Sym, number> = { GDX: (v + j) % 4, VGT: (v + 2 * j + 1) % 4 };
      const grid = { GDX: gridValues(levels.GDX, q.d1.GDX.maximumHoldDays), VGT: gridValues(levels.VGT, q.d1.VGT.maximumHoldDays) };
      const ctl = v === 0 ? { GDX: { ...grid.GDX, ...native.GDX }, VGT: { ...grid.VGT, ...native.VGT } } : grid;
      const entryDay = v === 0 ? nativeAct : { GDX: (v + j) % 2 === 1, VGT: (v + Math.floor(j / 2)) % 2 === 1 };
      const cfg: Cfg = project(q, cell, ctl, entryDay);
      const genome = pinPair(encode(cfg, 'fine'), pair);

      // the dormant gate controls of a gate-OFF book: its projected K, r, c
      for (const s of symbols)
        if (!cell[s].gate)
          for (const k of ['k', 'r', 'c'] as const) {
            const box = { k: [1, 1], r: [100, 10], c: [5, 1] }[k]!;

            genome[ctlOffset[s] + ctlIndex(k)] = (ctl[s][k]! - box[0]!) / box[1]!;
          }

      out.push({
        label: `N/original${v === 0 ? '' : `~grid${v}`}@${cell.id}`,
        cfg,
        genome,
        focus: v === 0 && focus.includes(j),
        gateState: j,
        variant: v,
        levels
      });
    }

  return out;
};

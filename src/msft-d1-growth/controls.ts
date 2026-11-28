// External controls (PROTOCOL.md §4; brief Phase 0 "Historical benchmarks and scope" and Phase 2 "Research comparators":
// "If any transfer or informed references are used for descriptive control runs, clearly isolate and label them and do not
// let them contaminate independent chronology"). The frozen VGT references New L0 and N/original (read from
// Assignment 3's sealed FROZEN_SELECTION.json through Priority 5's references(), sha256-pinned) are applied UNCHANGED to
// MSFT: their D1·VGT book (vector, RC 2 controls, activation) as D1·MSFT and their Growth·VGT book as Growth·MSFT — in
// arm D (D1 alone), arm G (Growth alone) and arm J (both, one slot). They are qualified with the study's instrument at
// every cutoff, reported beside the arm's members, and NEVER a member of a population, a seed, a finalist or a primary.
import { cellOf as a3CellOf } from '../vg-l0-full-joint/space.ts';
import { references, type RefKey } from '../vg-l0-n-successor/incumbents.ts';
import type { ArmKey } from './context.ts';
import type { Member } from './qualify.ts';
import { type Cfg, cellIdOf, cellOf, cfgOf, controlValuesOf, entryDayOf, exitsOptions, istopOptions, structureOf } from './space.ts';

export const controlKeys: readonly RefKey[] = ['NL0', 'NORIG'];
export const controlArms: readonly Extract<ArmKey, 'D' | 'G' | 'J'>[] = ['D', 'G', 'J'];

export const projectReference = (key: RefKey, arm: Extract<ArmKey, 'D' | 'G' | 'J'>): Cfg => {
  const ref = references()[key];
  const vgt = a3CellOf(ref.cfg.cell).VGT;
  const st = structureOf(ref.cfg.g);
  const exits = exitsOptions.indexOf(st.exits);
  const istop = istopOptions.indexOf(st.istop);
  const cell = cellOf(cellIdOf(arm, { d1: vgt, exits, istop }));

  return cfgOf(cell, { ...ref.cfg.d1.VGT }, controlValuesOf(ref.cfg, 'VGT'), entryDayOf(ref.cfg, 'VGT'), ref.cfg.g);
};

export const controlLabel = (key: RefKey, arm: ArmKey) => `control: ${references()[key].label} on MSFT (arm ${arm}; external VGT phenotype)`;

export const controlMembers = (arm: Extract<ArmKey, 'D' | 'G' | 'J'>): Member[] =>
  controlKeys.map((key) => ({
    label: controlLabel(key, arm),
    arm,
    lane: 'control',
    stage: 'control',
    replicate: null,
    cfg: projectReference(key, arm),
    pick: `${references()[key].label}'s VGT ${arm === 'D' ? 'D1 book' : arm === 'G' ? 'Growth book' : 'D1 and Growth books'} applied unchanged to MSFT (${references()[key].source}); external control, never a member`,
    sources: [{ label: controlLabel(key, arm), lane: 'control', pick: references()[key].label }]
  }));

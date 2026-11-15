// The frozen New L0 and its verified lineage incumbents (reference method NL0 1.0.0 §1.1–§1.2), read from Priority 5B's
// sealed FROZEN_SELECTION.json (sha256-pinned) — never rebuilt from prose:
//   R01 New L0       67cfdd9b62d1e16f  C24/L0/informed/R1#1 profit (the reference; Priority 3 quad a2e385640ca61012)
//   R14 IJ1          940fdaf770eedc9d  Priority 3B informed-joint#1 profit (5B C24/L2/informed/R2#1)
//   R20 C4           2f49a1cc226b4ece  VG #2 + VGT Growth #4 (5B control C4)
//   R21 C4-refined   0f017f0ab9b26f24  3B C24/informed-fixed#1 profit (5B control C4R)
// Each is the V structure: D1·GDX + D1·VGT + Growth·VGT, Growth·GDX OFF (Priority 3's placeholder 1af5b55987a56e2f), D1
// first. Each identity is checked against 5B's cfgId and Priority 3's quadId; the options must be Growth·GDX disabled.
// In this study ALL THREE phenotype vectors are free: the incumbents are controls at every cutoff (never selectable in
// Track I) and the informed seeds of Track N (C24 only), where they are also members of the informed selectable set
// (standard §3.2, the qualifying-incumbent rule).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { decode } from '../growth140-vgt-s8m/store.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { type GConfig, type Quad, gId, quadId } from '../vg-d1-growth-joint/space.ts';
import { canonicalOf as p5bCanonicalOf, cfgId as p5bCfgId, placeholder } from '../vg-lifecycle-matched-optimization/config.ts';
import { repoRoot } from './context.ts';

export const p5bFrozenSelection = {
  file: 'research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json',
  sha256: 'cd223a0d18c44925af7102b98efae1e369899664b8fb07ee2f8a579816255793'
} as const;

export type IncumbentKey = 'NL0' | 'IJ1' | 'C4' | 'C4R';
export const incumbentKeys: readonly IncumbentKey[] = ['NL0', 'IJ1', 'C4', 'C4R'];

export const incumbentSpec: Record<IncumbentKey, { row: string; cfg5B: string; quadP3: string; label: string }> = {
  NL0: { row: 'R01', cfg5B: '67cfdd9b62d1e16f', quadP3: 'a2e385640ca61012', label: 'New L0 (5B C24/L0/informed/R1#1 profit)' },
  IJ1: { row: 'R14', cfg5B: '940fdaf770eedc9d', quadP3: '354aa9850b2cb48e', label: 'IJ1 (3B informed-joint#1 profit)' },
  C4: { row: 'R20', cfg5B: '2f49a1cc226b4ece', quadP3: 'f324035d15f69610', label: 'C4 (VG #2 + VGT Growth #4)' },
  C4R: { row: 'R21', cfg5B: '0f017f0ab9b26f24', quadP3: '07443ffaeef41e85', label: 'C4-refined (3B C24/informed-fixed#1 profit)' }
};

export const newL0Identity = {
  label: 'C24/L0/informed/R1#1 profit',
  cfg5B: '67cfdd9b62d1e16f',
  quadP3: 'a2e385640ca61012',
  growthVgt: '6b5f909b30cfa516',
  growthGdxPlaceholder: '1af5b55987a56e2f'
} as const;

// the V structure: Growth·GDX disabled (never run or funded)
export const vOptions: EvalOptions = { enabled: { 'G:GDX': false } };

export interface Incumbent {
  key: IncumbentKey;
  label: string;
  quad: Quad;
  growthVgtId: string;
}

let cached: Record<IncumbentKey, Incumbent> | null = null;

export const incumbents = (): Record<IncumbentKey, Incumbent> => {
  if (cached) return cached;

  const f = path.join(repoRoot, p5bFrozenSelection.file);
  const text = fs.readFileSync(f, 'utf8');
  const sha = createHash('sha256').update(text).digest('hex');

  if (sha !== p5bFrozenSelection.sha256) throw new Error(`${p5bFrozenSelection.file}: sha256 ${sha} is not the pin`);

  const m = decode<{
    arms: { L0: { primary: { label: string; id: string } } };
    crossTestSubjects: { row: string; id: string; quad: Quad; options: EvalOptions; exportedBy: { label: string }[] }[];
  }>(text);
  const out = {} as Record<IncumbentKey, Incumbent>;

  for (const key of incumbentKeys) {
    const spec = incumbentSpec[key];
    const row = m.crossTestSubjects.find((x) => x.row === spec.row);

    if (!row || row.id !== spec.cfg5B) throw new Error(`5B ${spec.row} is not ${key} (${row?.id})`);
    if (p5bCfgId(p5bCanonicalOf('V', row.quad)) !== spec.cfg5B) throw new Error(`${key}: 5B's cfgId of the quad is not ${spec.cfg5B}`);
    if (quadId(row.quad) !== spec.quadP3) throw new Error(`${key}: Priority 3 quad id ${quadId(row.quad)} ≠ ${spec.quadP3}`);
    if (gId(row.quad.g.GDX) !== gId(placeholder)) throw new Error(`${key}: Growth·GDX is not the placeholder`);
    if (row.quad.first !== 'D1') throw new Error(`${key}: not D1 first`);
    if (JSON.stringify(row.options) !== JSON.stringify(vOptions)) throw new Error(`${key}: options ${JSON.stringify(row.options)}`);
    out[key] = { key, label: spec.label, quad: row.quad, growthVgtId: gId(row.quad.g.VGT) };
  }

  const r01 = m.crossTestSubjects.find((x) => x.row === 'R01')!;

  if (r01.exportedBy[0]!.label !== newL0Identity.label || m.arms.L0.primary.id !== r01.id) throw new Error('5B R01 is not New L0');
  if (out.NL0.growthVgtId !== newL0Identity.growthVgt) throw new Error('New L0’s Growth·VGT identity differs');

  cached = out;
  return out;
};

export const newL0 = () => ({ quad: incumbents().NL0.quad, options: vOptions, label: newL0Identity.label });

// Priority 3's disabled Growth·GDX placeholder (every configuration of this study carries it; never run or funded).
export const gdxPlaceholder = (): GConfig => placeholder;

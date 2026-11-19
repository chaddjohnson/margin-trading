// The frozen New L0 (reference method NL0 1.0.0 §1.1) read from Priority 5B's sealed FROZEN_SELECTION.json
// (crossTestSubjects[R01] = arms.L0.primary), sha256-pinned and identity-checked: D1·VGT + D1·GDX + Growth·VGT in one
// $100,000 slot, Growth·GDX OFF (its placeholder vector). Its Growth·VGT phenotype `6b5f909b30cfa516` is FROZEN in this
// study (brief §2.3): every configuration's quad carries New L0's two Growth vectors unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { decode } from '../growth140-vgt-s8m/store.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { type GConfig, type Quad, gId, quadId } from '../vg-d1-growth-joint/space.ts';
import { repoRoot } from './context.ts';

export const p5bFrozenSelection = {
  file: 'research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json',
  sha256: 'cd223a0d18c44925af7102b98efae1e369899664b8fb07ee2f8a579816255793'
} as const;

export const newL0Identity = {
  label: 'C24/L0/informed/R1#1 profit',
  cfg5B: '67cfdd9b62d1e16f',
  quadP3: 'a2e385640ca61012',
  growthVgt: '6b5f909b30cfa516',
  growthGdxPlaceholder: '1af5b55987a56e2f'
} as const;

// New L0's structure: Growth·GDX disabled (never run or funded)
export const vOptions: EvalOptions = { enabled: { 'G:GDX': false } };

let cached: { quad: Quad; options: EvalOptions; label: string } | null = null;

export const newL0 = () => {
  if (cached) return cached;

  const f = path.join(repoRoot, p5bFrozenSelection.file);
  const text = fs.readFileSync(f, 'utf8');
  const sha = createHash('sha256').update(text).digest('hex');

  if (sha !== p5bFrozenSelection.sha256) throw new Error(`${p5bFrozenSelection.file}: sha256 ${sha} is not the pin`);

  const m = decode<{
    arms: { L0: { primary: { label: string; id: string } } };
    crossTestSubjects: { row: string; id: string; quad: Quad; options: EvalOptions; exportedBy: { label: string }[] }[];
  }>(text);
  const r01 = m.crossTestSubjects.find((x) => x.row === 'R01')!;

  if (r01.exportedBy[0]!.label !== newL0Identity.label || m.arms.L0.primary.id !== r01.id || r01.id !== newL0Identity.cfg5B)
    throw new Error('5B R01 is not New L0');
  if (quadId(r01.quad) !== newL0Identity.quadP3) throw new Error(`New L0's quad id is ${quadId(r01.quad)}`);
  if (gId(r01.quad.g.VGT) !== newL0Identity.growthVgt) throw new Error('New L0’s Growth·VGT identity differs');
  if (gId(r01.quad.g.GDX) !== newL0Identity.growthGdxPlaceholder) throw new Error('New L0’s Growth·GDX is not the placeholder');
  if (JSON.stringify(r01.options) !== JSON.stringify(vOptions)) throw new Error(`New L0's options ${JSON.stringify(r01.options)}`);

  cached = { quad: r01.quad, options: r01.options, label: newL0Identity.label };
  return cached;
};

// The frozen Growth books of every configuration (Growth·GDX: the disabled placeholder; Growth·VGT: New L0's).
export const fixedGrowth = (): { GDX: GConfig; VGT: GConfig } => newL0().quad.g;

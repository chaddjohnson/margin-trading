// The frozen perturbation instruments (PROTOCOL.md §8).
//
// CORE (the brief §8): Priority 3's own 384-draw development instrument, reconstructed exactly (3A's `rowsOf`, checked
// against space.ts `neighbourhood` on every use): the confirmation family (3 × 128 Latin-hypercube rows, labels
// ('confirm', rep, 'C24'), common random numbers across centres; scope joint for pools with D1, g for Growth-only
// pools, scale 1; duplicates across reps dropped), plus its half-radius ('small', 'C24') and 1.5×-radius ('wide',
// 'C24') families of 128. The SAME effective draws are evaluated under L0, L1 and L2 (paired).
//
// STANDALONE (the brief §8): one common family-level instrument for a single Growth book, identical for the three
// books: 50 Latin-hypercube columns, one per Growth numeric input (the input's own column whatever the symbol, so the
// same input moves by the same u in every subject), seeds deriveSeed(STUDY, 'nbhd', 'standalone', family, rep); every
// ACTIVE numeric input moves by u × scale × its radius (10% of its range, growth140-vgt-stable's radius), rounded to
// its fine grid and clipped to its box widened to include the centre (the clip count reported); categorical inputs
// fixed; inactive inputs untouched; repaired and reduced to the effective configuration; duplicates of the centre or of
// earlier draws dropped. Families: confirm 3 × 128 (scale 1), small 128 (0.5), wide 128 (1.5).
import { Rng } from '../optimizer/rng.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import {
  type Config as GConfig,
  configId,
  effectiveOf,
  numericGenes,
  perturb,
  repair,
  structureOf
} from '../growth140-vgt-stable/space.ts';
import { type NFamily, type Quad, normalize, quadId } from '../vg-d1-growth-joint/space.ts';
import { type Row, rowsOf } from '../vg-d1-growth-diagnostic/risk.ts';
import { seedOf } from './context.ts';
import type { Subject } from './subjects.ts';

export type FamilyName = 'confirm' | 'small' | 'wide';
export const familyNames: readonly FamilyName[] = ['confirm', 'small', 'wide'];

export interface Draw {
  family: FamilyName;
  rep: number;
  row: number;
  id: string; // the draw's quadId
  quad: Quad;
  clipped: number;
}

// ----- core: Priority 3's instrument -----

export const coreFamilies = (s: Pick<Subject, 'need'>, cutoff = 'C24'): Record<FamilyName, NFamily[]> => {
  const scope = s.need === 'G' ? 'g' : 'joint';

  return {
    confirm: [1, 2, 3].map((rep) => ({ name: 'confirm', n: 128, labels: ['confirm', rep, cutoff], scope, scale: 1 })),
    small: [{ name: 'small', n: 128, labels: ['small', cutoff], scope, scale: 0.5 }],
    wide: [{ name: 'wide', n: 128, labels: ['wide', cutoff], scope, scale: 1.5 }]
  };
};

// The pooled draws of one family (duplicates across reps dropped, as qualify.ts and 3A pooled them).
export const coreDraws = (s: Pick<Subject, 'need' | 'quad'>, family: FamilyName): Draw[] => {
  const seen = new Set<string>();
  const out: Draw[] = [];

  coreFamilies(s)[family].forEach((f, i) => {
    for (const r of rowsOf(s.quad, f) as Row[]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({ family, rep: i + 1, row: r.row, id: r.id, quad: r.quad, clipped: r.clipped });
    }
  });

  return out;
};

// ----- standalone: the common family-level instrument -----

const standaloneScale: Record<FamilyName, number> = { confirm: 1, small: 0.5, wide: 1.5 };
const standaloneReps: Record<FamilyName, number[]> = { confirm: [1, 2, 3], small: [1], wide: [1] };
export const standaloneN = 128;

const unitCache = new Map<string, number[][]>();

export const standaloneUnits = (family: FamilyName, rep: number) => {
  const key = `${family}|${rep}`;
  let u = unitCache.get(key);

  if (!u) {
    u = latinOffsets(standaloneN, numericGenes.length, new Rng(seedOf('nbhd', 'standalone', family, rep)));
    unitCache.set(key, u);
  }
  return u;
};

export interface GrowthDraw {
  family: FamilyName;
  rep: number;
  row: number;
  config: GConfig;
  gid: string;
  clipped: number;
}

export const growthDraws = (centre: GConfig, family: FamilyName): GrowthDraw[] => {
  const st = structureOf(centre);
  const active = numericGenes.map((gene, i) => [gene, i] as const).filter(([gene]) => gene.active(st));
  const seen = new Set<string>([configId(centre)]);
  const out: GrowthDraw[] = [];

  for (const rep of standaloneReps[family])
    standaloneUnits(family, rep).forEach((u, row) => {
      const c: GConfig = { ...centre };
      let clipped = 0;

      for (const [gene, col] of active) {
        const p = perturb(gene, centre[gene.key] as number, u[col]!, 'clip', standaloneScale[family]);

        c[gene.key] = p.value;
        if (p.clipped) clipped++;
      }

      let config: GConfig;

      try {
        config = effectiveOf(repair(c));
      } catch {
        return;
      }

      const gid = configId(config);

      if (seen.has(gid)) return;
      seen.add(gid);
      out.push({ family, rep, row, config, gid, clipped });
    });

  return out;
};

// A standalone subject's draws as pool configurations (the other Growth slot keeps the placeholder, D1 disabled).
export const standaloneDraws = (s: Pick<Subject, 'quad' | 'enabled'>, family: FamilyName): Draw[] => {
  const sym = s.enabled.includes('G:GDX') ? 'GDX' : 'VGT';

  return growthDraws(s.quad.g[sym], family).map((d) => {
    const quad = normalize({ ...s.quad, g: { ...s.quad.g, [sym]: d.config } });

    return { family, rep: d.rep, row: d.row, id: quadId(quad), quad, clipped: d.clipped };
  });
};

// The active numeric inputs a family moves (dimensionality disclosure).
export const activeInputs = (s: Pick<Subject, 'quad' | 'enabled'>) =>
  s.enabled.map((b) => {
    const sym = b.slice(b.indexOf(':') + 1) as 'GDX' | 'VGT';

    return {
      book: b,
      inputs: b.startsWith('D1') ? 8 : numericGenes.filter((g) => g.active(structureOf(s.quad.g[sym]))).length
    };
  });

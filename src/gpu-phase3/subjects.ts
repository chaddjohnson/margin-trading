// gpu-phase3 subject sets (PROTOCOL.md §5). Every set is rebuilt identically from sealed records or seeds; nothing is
// chosen by an outcome (AD7).
//   R  the frozen reference identities (New L0, N/original via Phase 1's sealed-record readers; IJ1, C4, C4-refined via
//      Assignment 3's nl0.ts incumbents)
//   A  uniform random Assignment 3 genomes (`decode`, coarse or fine grid), this study's seeds
//   G  Growth-structure strata: a random genome with one structural gene forced to each of its values
//   B  Phase 1's branch-heavy D1 designs; N  Assignment 3 neighbourhoods of the R set
import { Rng } from '../optimizer/rng.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import type { RiskConfig2 } from '../d1-risk-controls-rc2/config.ts';
import { type Cfg, decode, gStructOffset, levelsOf, structuralGenes } from '../vg-l0-full-joint/space.ts';
import { subjectOfCfg } from '../vg-l0-risk-metrics/engine.ts';
import { incumbents } from '../vg-l0-full-joint/nl0.ts';
import {
  branchHeavySubjects as p1Branch,
  neighbourSubjects as p1Neighbours,
  referenceSubjects as p1Refs
} from '../gpu-phase1/subjects.ts';
import { seedOf } from './context.ts';

export interface Subject {
  key: string;
  set: 'R' | 'A' | 'G' | 'B' | 'N';
  quad: Quad;
  controls: RiskConfig2 | null;
  cfg?: Cfg;
}

export const referenceSubjects = (): Subject[] => {
  const p1 = p1Refs().map((s) => ({ ...s, set: 'R' as const }));
  const inc = incumbents();
  const more = (['IJ1', 'C4', 'C4R'] as const).map((k) => ({
    key: `R:${k}`,
    set: 'R' as const,
    quad: inc[k].quad,
    controls: null
  }));

  return [...p1, ...more];
};

export const genomeSubject = (genome: number[], res: 'coarse' | 'fine', key: string, set: Subject['set']): Subject => {
  const cfg = decode(genome, res);
  const s = subjectOfCfg(cfg);

  return { key, set, quad: s.quad, controls: s.controls, cfg };
};

export const randomSubjects = (n: number, label = 'A', res: 'coarse' | 'fine' = 'coarse', from = 0): Subject[] => {
  const levels = levelsOf(res);
  const out: Subject[] = [];

  for (let i = from; i < from + n; i++) {
    const rng = new Rng(seedOf(label, res, i));

    out.push(
      genomeSubject(
        levels.map((l) => rng.int(l)),
        res,
        `${label}:${res}:${i}`,
        'A'
      )
    );
  }
  return out;
};

// every value of every Growth structural gene, `per` random genomes each (the rest of the genome random)
export const growthStrata = (per: number, label = 'G', res: 'coarse' | 'fine' = 'coarse'): Subject[] => {
  const levels = levelsOf(res);
  const out: Subject[] = [];

  structuralGenes.forEach((sg, gi) => {
    sg.options.forEach((opt, v) => {
      for (let i = 0; i < per; i++) {
        const rng = new Rng(seedOf(label, res, sg.key, opt, i));
        const genome = levels.map((l) => rng.int(l));

        genome[gStructOffset + gi] = v;
        // a breakout entry makes eligibility inactive; force the Rise entry when the stratum is an eligibility policy
        if (sg.key === 'elig' && v > 0) genome[gStructOffset + structuralGenes.findIndex((x) => x.key === 'entry')] = 0;
        out.push(genomeSubject(genome, res, `${label}:${sg.key}=${opt}:${i}`, 'G'));
      }
    });
  });
  return out;
};

export const branchHeavySubjects = (refQuad: Quad): Subject[] =>
  p1Branch(refQuad).map((s) => ({ ...s, set: 'B' as const }));
export const neighbourSubjects = (refs: Subject[], n: number): Subject[] =>
  p1Neighbours(refs.filter((r) => r.cfg).map((r) => ({ ...r, set: 'R' as const })) as never, n).map((s) => ({
    ...s,
    set: 'N' as const
  }));

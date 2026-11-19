// The neighbourhood-risk diagnosis (PROTOCOL.md §7): Priority 3's perturbation instruments reconstructed exactly
// (seed labels, radii, clipping, inactive inputs, deduplication), their archived evaluations read back and checked
// against the sealed statistics, the report-only tail statistics of standard 1.1.0 §5.8, the per-input association of
// the multivariate draws with drawdown, and the frozen one-factor and two-factor probes.
import { perturb as gPerturb } from '../growth140-vgt-stable/space.ts';
import { d1Keys } from '../vg-d1-growth-joint/books.ts';
import { type Sym, symbols } from '../vg-d1-growth-joint/context.ts';
import { evalKey, type EvalOptions, type Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Nb, nbStats, quantile } from '../vg-d1-growth-joint/fitness.ts';
import {
  type NFamily,
  type Quad,
  type Scope,
  d1Box,
  d1Radius,
  neighbourhood,
  normalize,
  numericGenes,
  quadId,
  radiusValue,
  scopeBooks,
  structureOf,
  unitsOf
} from '../vg-d1-growth-joint/space.ts';
import { economics, r2 } from './context.ts';
import type { Subject } from './subjects.ts';

// ----- the instrument, row by row (space.ts neighbourhood with the Latin-hypercube row kept) -----

// The unit columns of space.ts (D1·GDX 0–7, D1·VGT 8–15, Growth·GDX 16–65, Growth·VGT 66–115).
const unitCol = { d1: { GDX: 0, VGT: 8 }, g: { GDX: 16, VGT: 66 } } as const;

export interface Input {
  book: 'D1:GDX' | 'D1:VGT' | 'G:GDX' | 'G:VGT';
  key: string;
  column: number;
  active: boolean; // false: inactive under the book's structure (never moved)
  enabled: boolean; // false: the book is disabled in this subject (moved, but behaviourally inert)
}

export interface Row {
  row: number; // the Latin-hypercube row (0-based) within its family
  quad: Quad;
  id: string;
  clipped: number;
  u: number[]; // the 116 unit offsets of the row
}

export const inputsOf = (centre: Quad, scope: Scope, enabled: readonly string[]): Input[] => {
  const sc = scopeBooks(scope);
  const out: Input[] = [];

  for (const s of symbols) {
    if (sc.d1[s])
      d1Box.forEach((box, i) =>
        out.push({
          book: `D1:${s}`,
          key: box.key,
          column: unitCol.d1[s] + i,
          active: true,
          enabled: enabled.includes(`D1:${s}`)
        })
      );
    if (sc.g[s]) {
      const st = structureOf(centre.g[s]);

      numericGenes.forEach((gene, i) =>
        out.push({
          book: `G:${s}`,
          key: gene.key,
          column: unitCol.g[s] + i,
          active: gene.active(st),
          enabled: enabled.includes(`G:${s}`)
        })
      );
    }
  }

  return out;
};

// Exactly space.ts `neighbourhood` (same units, same order, same rounding, clipping, normalization and duplicate
// rule), keeping each surviving point's row and unit vector. Checked against `neighbourhood` itself on every use.
export const rowsOf = (centre: Quad, family: NFamily): Row[] => {
  const scope = scopeBooks(family.scope ?? 'joint');
  const scale = family.scale ?? 1;
  const units = unitsOf(family.n, family.labels);
  const seen = new Set<string>([quadId(centre)]);
  const out: Row[] = [];

  units.forEach((u, row) => {
    let clipped = 0;
    const d1 = { GDX: { ...centre.d1.GDX }, VGT: { ...centre.d1.VGT } };
    const g = { GDX: { ...centre.g.GDX }, VGT: { ...centre.g.VGT } };

    for (const s of symbols) {
      if (scope.d1[s])
        d1Box.forEach((box, i) => {
          const c = centre.d1[s][box.key];
          const lo = Math.min(box.min, c);
          const hi = Math.max(box.max, c);
          const v = c + Math.round(u[unitCol.d1[s] + i]! * scale * d1Radius[box.key]);

          d1[s][box.key] = v < lo ? lo : v > hi ? hi : v;
          if (v < lo || v > hi) clipped++;
        });
      if (scope.g[s]) {
        const st = structureOf(centre.g[s]);

        numericGenes.forEach((gene, i) => {
          if (!gene.active(st)) return;

          const p = gPerturb(gene, centre.g[s][gene.key] as number, u[unitCol.g[s] + i]!, 'clip', scale);

          g[s][gene.key] = p.value;
          if (p.clipped) clipped++;
        });
      }
    }

    let quad: Quad;

    try {
      quad = normalize({ d1, g, first: centre.first });
    } catch {
      return;
    }

    const id = quadId(quad);

    if (seen.has(id)) return;
    seen.add(id);
    out.push({ row, quad, id, clipped, u });
  });

  const ref = neighbourhood(centre, family);

  if (ref.length !== out.length || ref.some((p, i) => p.id !== out[i]!.id || p.clipped !== out[i]!.clipped))
    throw new Error('the row reconstruction differs from space.ts neighbourhood');
  return out;
};

// The confirmation family of qualify.ts: 3 × 128 independent draws, pooled, duplicates across reps dropped.
export const familiesOf = (s: Subject, cutoff = 'C24') => {
  const base: Scope = s.need === 'G' ? 'g' : 'joint';
  const fam = (name: string, labels: (string | number)[], scope: Scope, scale = 1, n = 128): NFamily => ({
    name,
    n,
    labels,
    scope,
    scale
  });
  const out: Record<string, NFamily[]> = {
    confirm: [1, 2, 3].map((rep) => fam('confirm', ['confirm', rep, cutoff], base)),
    small: [fam('small', ['small', cutoff], base, 0.5)],
    wide: [fam('wide', ['wide', cutoff], base, 1.5)]
  };

  for (const sc of Object.keys(s.evidence.scopes ?? {}) as Scope[])
    out[`scope:${sc}`] = [fam(sc, ['scope', sc, cutoff], sc)];
  return out;
};

export interface Draw extends Row {
  family: string;
  rep: number;
  rec: Rec;
}

export const pooledDraws = (s: Subject, fams: NFamily[], family: string, read: (q: Quad, o: EvalOptions) => Rec) => {
  const seen = new Set<string>();
  const out: Draw[] = [];

  fams.forEach((f, rep) => {
    for (const r of rowsOf(s.quad, f)) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({ ...r, family, rep: rep + 1, rec: read(r.quad, s.options) });
    }
  });

  return out;
};

export const archivedReader = (arc: { point(key: string): Rec | undefined }) => (q: Quad, o: EvalOptions) => {
  const r = arc.point(evalKey('D24', q, o));

  if (!r) throw new Error(`draw ${quadId(q)} is missing from the archive`);
  return r;
};

// ----- report-only tail statistics (standard 1.1.0 §0.3, §5.8) -----

export const wilson = (k: number, n: number, z = 1.959964) => {
  if (n === 0) return [NaN, NaN];

  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));

  return [(c - h) / d, (c + h) / d];
};

// A distribution-free 95% interval for the 0.9 quantile from order statistics (binomial ranks).
export const quantileInterval = (sorted: readonly number[], q = 0.9, z = 1.959964) => {
  const n = sorted.length;
  const sd = Math.sqrt(n * q * (1 - q));
  const lo = Math.max(1, Math.floor(n * q - z * sd));
  const hi = Math.min(n, Math.ceil(n * q + z * sd) + 1);

  return [sorted[lo - 1]!, sorted[hi - 1]!];
};

export interface Tail {
  n: number;
  centreDd: number;
  centreNet: number;
  medianDd: number;
  p90Dd: number;
  p90Interval: number[];
  p95Dd: number;
  worst10Mean: number; // the mean of the ⌈0.1 n⌉ largest drawdowns
  worst10K: number;
  worstDd: number;
  breaches: number;
  breachShare: number;
  breachInterval: number[];
  meanExcess: number;
  breachLedgers: number; // distinct funded-lot ledgers among the breaching draws
  sameAsCentre: number;
  clipped: number;
  medianNet: number;
  p10Net: number;
  p90Net: number;
  meanNet: number;
  worstNet: number;
  positiveShare: number;
}

export const tailOf = (centre: Rec, draws: readonly { rec: Rec; clipped: number }[]): Tail => {
  const dds = draws.map((d) => d.rec.dd).sort((a, b) => a - b);
  const nets = draws.map((d) => d.rec.net).sort((a, b) => a - b);
  const n = dds.length;
  const k = Math.ceil(0.1 * n);
  const worst = dds.slice(n - k);
  const breaching = draws.filter((d) => d.rec.dd > economics.ceiling);

  return {
    n,
    centreDd: centre.dd,
    centreNet: centre.net,
    medianDd: r2(quantile(dds, 0.5)),
    p90Dd: r2(quantile(dds, 0.9)),
    p90Interval: quantileInterval(dds).map(r2),
    p95Dd: r2(quantile(dds, 0.95)),
    worst10Mean: r2(worst.reduce((a, b) => a + b, 0) / k),
    worst10K: k,
    worstDd: r2(dds.at(-1)!),
    breaches: breaching.length,
    breachShare: Math.round((breaching.length / n) * 1e4) / 1e4,
    breachInterval: wilson(breaching.length, n).map((x) => Math.round(x * 1e4) / 1e4),
    meanExcess: breaching.length
      ? r2(breaching.reduce((a, d) => a + d.rec.dd - economics.ceiling, 0) / breaching.length)
      : 0,
    breachLedgers: new Set(breaching.map((d) => d.rec.signature)).size,
    sameAsCentre: draws.filter((d) => d.rec.signature === centre.signature).length,
    clipped: draws.filter((d) => d.clipped > 0).length,
    medianNet: r2(quantile(nets, 0.5)),
    p10Net: r2(quantile(nets, 0.1)),
    p90Net: r2(quantile(nets, 0.9)),
    meanNet: r2(nets.reduce((a, b) => a + b, 0) / n),
    worstNet: r2(nets[0]!),
    positiveShare: Math.round((nets.filter((x) => x > 0).length / n) * 1e4) / 1e4
  };
};

// The sealed statistics must be reproduced exactly by the reconstructed draws.
export const sealedMatches = (centre: Rec, draws: readonly Draw[], sealed: Nb) => {
  const mine = nbStats(
    centre,
    draws.map((d) => d.rec),
    draws.map((d) => d.clipped)
  );

  return JSON.stringify(mine) === JSON.stringify(sealed) ? null : { mine, sealed };
};

// ----- association of each input with drawdown across the multivariate draws (descriptive) -----

const ranks = (xs: readonly number[]) => {
  const idx = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);

  for (let i = 0; i < idx.length;) {
    let j = i;

    while (j + 1 < idx.length && idx[j + 1]![0] === idx[i]![0]) j++;
    for (let k = i; k <= j; k++) r[idx[k]![1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
};

export const spearman = (x: readonly number[], y: readonly number[]) => {
  const rx = ranks(x);
  const ry = ranks(y);
  const n = x.length;
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;

  for (let i = 0; i < n; i++) {
    sxy += (rx[i]! - mx) * (ry[i]! - my);
    sxx += (rx[i]! - mx) ** 2;
    syy += (ry[i]! - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
};

export const associationOf = (inputs: readonly Input[], draws: readonly Draw[]) =>
  inputs
    .filter((x) => x.active)
    .map((x) => {
      const u = draws.map((d) => d.u[x.column]!);
      const dd = draws.map((d) => d.rec.dd);
      const third = (pred: (v: number) => boolean) => {
        const sel = draws.filter((d) => pred(d.u[x.column]!));

        return {
          n: sel.length,
          breachShare: sel.length
            ? Math.round((sel.filter((d) => d.rec.dd > economics.ceiling).length / sel.length) * 1e4) / 1e4
            : 0
        };
      };

      return {
        book: x.book,
        key: x.key,
        enabled: x.enabled,
        rho: Math.round(spearman(u, dd) * 1e4) / 1e4,
        low: third((v) => v < -1 / 3),
        mid: third((v) => v >= -1 / 3 && v <= 1 / 3),
        high: third((v) => v > 1 / 3)
      };
    })
    .sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));

// ----- the frozen probes (PROTOCOL.md §7.4): one input moved by u × the instrument's radius, everything else fixed -----

export interface Probe {
  subject: string;
  set: string;
  book: string;
  key: string;
  u: number;
  key2?: string;
  u2?: number;
  quad: Quad;
  id: string;
  value: number;
  value2?: number;
  clipped: boolean;
}

export const moveInput = (
  centre: Quad,
  book: string,
  key: string,
  u: number
): { quad: Quad; value: number; clipped: boolean } => {
  const s = book.slice(book.indexOf(':') + 1) as Sym;

  if (book.startsWith('D1')) {
    const box = d1Box.find((b) => b.key === key)!;
    const c = centre.d1[s][box.key];
    const lo = Math.min(box.min, c);
    const hi = Math.max(box.max, c);
    const v0 = c + Math.round(u * d1Radius[box.key]);
    const v = v0 < lo ? lo : v0 > hi ? hi : v0;

    return {
      quad: normalize({ ...centre, d1: { ...centre.d1, [s]: { ...centre.d1[s], [key]: v } } }),
      value: v,
      clipped: v !== v0
    };
  }

  const gene = numericGenes.find((g) => g.key === key)!;
  const p = gPerturb(gene, centre.g[s][gene.key] as number, u, 'clip', 1);

  return {
    quad: normalize({ ...centre, g: { ...centre.g, [s]: { ...centre.g[s], [key]: p.value } } }),
    value: p.value,
    clipped: p.clipped
  };
};

export const radiusOf = (book: string, key: string) =>
  book.startsWith('D1')
    ? d1Radius[key as (typeof d1Keys)[number]]
    : radiusValue(numericGenes.find((g) => g.key === key)!);

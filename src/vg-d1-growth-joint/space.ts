// The four-component space (PROTOCOL.md §7): every configuration encodes ALL active parameters of the four books —
// D1·GDX, D1·VGT (D1's eight registered parameters each), Growth·GDX, Growth·VGT (Growth 1.4.0's 8 structural and 50
// conditional numeric genes each, growth140-vgt-s8m / growth140-vgt-stable's genes, boxes, grids and browser identity,
// reused unchanged) — and the same-instant family priority (D1-first | Growth-first). The architecture is A (one
// exclusive funded slot) throughout; there are no allocation genes.
//
// The identity is sha256 of the four canonical vectors (D1 grids, Growth browser identities) in book order and the
// priority: two genomes that differ only in inactive genes are one configuration, evaluated once. Behaviourally
// identical configurations (the same funded-lot ledger) are grouped by their ledger signature in the reports.
import { createHash } from 'node:crypto';
import { Rng } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { protocol as d1Protocol } from '../multi-etf-d1/context.ts';
import {
  type Config as GConfig,
  type Structure,
  activeGenes,
  configDistance as gDistance,
  configId as gId,
  configOfFine,
  configOfGenome,
  effectiveOf,
  fineGenomeOf,
  fineLevels,
  fineStepOf,
  genomeOf,
  levelCounts,
  numericGenes,
  perturb as gPerturb,
  radiusValue,
  repair,
  roundStep,
  structuralGenes,
  structureOf
} from '../growth140-vgt-stable/space.ts';
import { type D1Grid, d1Keys } from './books.ts';
import type { Priority } from './pool.ts';
import { type Sym, seedOf, symbols } from './context.ts';

export type { GConfig, Structure };
export { activeGenes, effectiveOf, fineStepOf, gId, numericGenes, radiusValue, roundStep, structuralGenes, structureOf };

export interface Quad {
  d1: Record<Sym, D1Grid>;
  g: Record<Sym, GConfig>;
  first: Priority;
}

// ----- D1 -----

export const d1Box = d1Protocol.box.map((b) => ({ key: b.key as keyof D1Grid, min: b.min, max: b.max }));

if (d1Box.map((b) => b.key).join() !== d1Keys.join()) throw new Error('D1 box order differs from the D1 keys');

// Study 8's N1 neighbourhood radius in grid units (Priority 2's): X ±10, Y ±2, stop ±10, hold ±2, L ±10, buffer ±10,
// P ±10, W ±20.
export const d1Radius: Record<keyof D1Grid, number> = {
  targetPercentChange: 10,
  trailingBuyPercentage: 2,
  trailingStopPercentage: 10,
  maximumHoldDays: 2,
  tickWindowSize: 10,
  intradayLossBuffer: 10,
  pullback: 10,
  continuationWindow: 20
};

export const d1Levels = d1Box.map((b) => b.max - b.min + 1);
export const d1OfIndices = (ix: readonly number[]): D1Grid =>
  Object.fromEntries(d1Box.map((b, i) => [b.key, b.min + ix[i]!])) as unknown as D1Grid;
export const d1Indices = (g: D1Grid) => d1Box.map((b) => g[b.key] - b.min);
export const d1InBox = (g: D1Grid) =>
  d1Box.every((b) => Number.isInteger(g[b.key]) && g[b.key] >= b.min && g[b.key] <= b.max);

// The placeholder D1 vector of a Growth-only configuration (D1 disabled: never run, never funded).
export const d1Placeholder: D1Grid = d1OfIndices(d1Box.map(() => 0));

// ----- identity -----

export const priorities: Priority[] = ['D1', 'G'];

export const quadCanonical = (q: Quad) =>
  [
    ...symbols.map((s) => `D1·${s}:${d1Keys.map((k) => q.d1[s][k]).join(',')}`),
    ...symbols.map((s) => `G·${s}:${gId(q.g[s])}`),
    `first:${q.first}`
  ].join('#');
export const quadId = (q: Quad) => createHash('sha256').update(quadCanonical(q)).digest('hex').slice(0, 16);

export const normalize = (q: Quad): Quad => ({
  d1: { GDX: { ...q.d1.GDX }, VGT: { ...q.d1.VGT } },
  g: { GDX: effectiveOf(repair({ ...q.g.GDX })), VGT: effectiveOf(repair({ ...q.g.VGT })) },
  first: q.first
});

// ----- cells (the protected strata): Growth·GDX entry × Growth·VGT entry -----

export type Entry = 'rise' | 'breakout';
export interface CellKey {
  GDX: Entry;
  VGT: Entry;
}

export const entries: Entry[] = ['rise', 'breakout'];
export const cells: CellKey[] = entries.flatMap((GDX) => entries.map((VGT) => ({ GDX, VGT })));
export const cellName = (c: CellKey) => `GDX-${c.GDX}_VGT-${c.VGT}`;
export const entryOf = (g: GConfig): Entry => (g.entryMethod === 'trend_breakout' ? 'breakout' : 'rise');
export const cellOf = (q: Quad): CellKey => ({ GDX: entryOf(q.g.GDX), VGT: entryOf(q.g.VGT) });

// The gate pair: the screen's protected sub-strata within a cell (round-robin) and a shortlist slot.
export const gatePairs = [
  ['off', 'off'],
  ['off', 'on'],
  ['on', 'off'],
  ['on', 'on']
] as const;
export const gateOf = (g: GConfig) => (g.drawdownRecoveryGateEnabled === true ? 'on' : 'off');
export const gatePairOf = (q: Quad) => `${gateOf(q.g.GDX)}/${gateOf(q.g.VGT)}`;

// The structural class (coverage tables and slots): the cell, the gate pair, each Growth book's exit structure and
// switches, and the priority.
export const classOf = (q: Quad) => {
  const sg = structureOf(q.g.GDX);
  const sv = structureOf(q.g.VGT);
  const exits = (s: Structure) =>
    `${s.exits === 'hold_off' ? 'hold off' : 'hold on'}${s.retain === 'on' ? ', retain' : ''}${s.istop === 'on' ? ', istop' : ''}`;

  return {
    cell: cellName(cellOf(q)),
    gates: gatePairOf(q),
    gdxExits: exits(sg),
    vgtExits: exits(sv),
    gdxSwitches: `trend ${sg.trend}, elig ${sg.elig}, cont ${sg.cont}`,
    vgtSwitches: `trend ${sv.trend}, elig ${sv.elig}, cont ${sv.cont}`,
    retain: `${sg.retain}/${sv.retain}`,
    elig: `${sg.elig !== 'off' ? 'on' : 'off'}/${sv.elig !== 'off' ? 'on' : 'off'}`,
    first: q.first
  };
};

export const classKey = (q: Quad) => {
  const c = classOf(q);

  return `${c.cell}|gates ${c.gates}|retain ${c.retain}|elig ${c.elig}`;
};

// ----- the genome -----
//
// categorical (17): [Growth·GDX structural (8)] [Growth·VGT structural (8)] [first (1)]
// ordinal (116):    [D1·GDX (8)] [D1·VGT (8)] [Growth·GDX numeric (50)] [Growth·VGT numeric (50)]
// The entry genes are the cell's (pinned within a cell's screen and islands).

const nS = structuralGenes.length; // 8
const nG = numericGenes.length; // 50
const nD = d1Box.length; // 8

export const nCat = 2 * nS + 1;
export const nNum = 2 * nD + 2 * nG;
export type Genome = number[];
export type Resolution = 'coarse' | 'fine';

export const catLevels = [
  ...structuralGenes.map((s) => s.options.length),
  ...structuralGenes.map((s) => s.options.length),
  priorities.length
];
const gNumLevels = (res: Resolution) => (res === 'coarse' ? levelCounts : fineLevels).slice(nS);
export const numLevels = (res: Resolution) => [...d1Levels, ...d1Levels, ...gNumLevels(res), ...gNumLevels(res)];
export const levelsOf = (res: Resolution) => [...catLevels, ...numLevels(res)];

const entryIndex = structuralGenes.findIndex((s) => s.key === 'entry');
const gateIndex = structuralGenes.findIndex((s) => s.key === 'gate');

export const entryGene: Record<Sym, number> = { GDX: entryIndex, VGT: nS + entryIndex };
export const gateGene: Record<Sym, number> = { GDX: gateIndex, VGT: nS + gateIndex };
export const firstGene = 2 * nS;
// offsets of the ordinal blocks within the genome
export const d1Offset: Record<Sym, number> = { GDX: nCat, VGT: nCat + nD };
export const gOffset: Record<Sym, number> = { GDX: nCat + 2 * nD, VGT: nCat + 2 * nD + nG };
export const gStructOffset: Record<Sym, number> = { GDX: 0, VGT: nS };

export const pinCell = (g: Genome, cell: CellKey) => {
  for (const s of symbols) g[entryGene[s]] = cell[s] === 'rise' ? 0 : 1;
  return g;
};

export const pinGates = (g: Genome, pair: readonly ['off' | 'on', 'off' | 'on']) => {
  g[gateGene.GDX] = pair[0] === 'on' ? 1 : 0;
  g[gateGene.VGT] = pair[1] === 'on' ? 1 : 0;
  return g;
};

const gOfGenome = (g: Genome, s: Sym, res: Resolution): GConfig => {
  const struct = g.slice(gStructOffset[s], gStructOffset[s] + nS);
  const num = g.slice(gOffset[s], gOffset[s] + nG);

  return res === 'coarse' ? configOfGenome([...struct, ...num]) : configOfFine([...struct, ...num]);
};

export const decode = (g: Genome, res: Resolution): Quad =>
  normalize({
    d1: {
      GDX: d1OfIndices(g.slice(d1Offset.GDX, d1Offset.GDX + nD)),
      VGT: d1OfIndices(g.slice(d1Offset.VGT, d1Offset.VGT + nD))
    },
    g: { GDX: gOfGenome(g, 'GDX', res), VGT: gOfGenome(g, 'VGT', res) },
    first: priorities[g[firstGene]!]!
  });

export const encode = (q: Quad, res: Resolution): Genome => {
  const gg = (s: Sym) => (res === 'coarse' ? genomeOf(q.g[s]) : fineGenomeOf(q.g[s]));
  const a = gg('GDX');
  const b = gg('VGT');

  return [
    ...a.slice(0, nS),
    ...b.slice(0, nS),
    priorities.indexOf(q.first),
    ...d1Indices(q.d1.GDX),
    ...d1Indices(q.d1.VGT),
    ...a.slice(nS),
    ...b.slice(nS)
  ];
};

// ----- the screen: a Latin supercube of scrambled Sobol blocks (≤ 16 dimensions each) over the whole genome -----

export const screenGenomes = (n: number, res: Resolution, ...labels: (string | number)[]): Genome[] => {
  const levels = levelsOf(res);
  const blocks: number[] = [];

  for (let left = levels.length; left > 0; left -= 16) blocks.push(Math.min(16, left));

  const columns = blocks.map((dims, b) => {
    const sobol = new Sobol({ dimensions: dims, scramble: { seed: seedOf(...labels, 'block', b) } });
    const points = Array.from({ length: n }, () => sobol.next());

    if (b > 0) {
      const rng = Rng.from(...seedOf(...labels, 'permute', b));

      for (let i = n - 1; i > 0; i--) {
        const k = rng.int(i + 1);

        [points[i], points[k]] = [points[k]!, points[i]!];
      }
    }

    return points;
  });

  return Array.from({ length: n }, (_v, i) => {
    const u = columns.flatMap((c) => c[i]!);

    return u.map((x, gene) => Math.min(levels[gene]! - 1, Math.floor(x * levels[gene]!)));
  });
};

// ----- distance: normalized L∞ over the active numeric coordinates of the four books; 1 across structures -----

export const quadDistance = (a: Quad, b: Quad) => {
  if (a.first !== b.first) return 1;

  let d = 0;

  for (const s of symbols) {
    const g = gDistance(a.g[s], b.g[s]);

    if (g >= 1) return 1;
    d = Math.max(d, g);
    for (const box of d1Box) d = Math.max(d, Math.abs(a.d1[s][box.key] - b.d1[s][box.key]) / (box.max - box.min));
  }

  return d;
};

// ----- neighbourhoods (PROTOCOL.md §10) -----

// Which books' numeric inputs a family perturbs.
export type Scope = 'joint' | 'd1' | 'g' | 'vgt' | 'gdx' | 'D1:GDX' | 'D1:VGT' | 'G:GDX' | 'G:VGT';

export const scopeBooks = (scope: Scope) => {
  const all = { d1: { GDX: true, VGT: true }, g: { GDX: true, VGT: true } };

  switch (scope) {
    case 'joint':
      return all;
    case 'd1':
      return { d1: { GDX: true, VGT: true }, g: { GDX: false, VGT: false } };
    case 'g':
      return { d1: { GDX: false, VGT: false }, g: { GDX: true, VGT: true } };
    case 'vgt':
      return { d1: { GDX: false, VGT: true }, g: { GDX: false, VGT: true } };
    case 'gdx':
      return { d1: { GDX: true, VGT: false }, g: { GDX: true, VGT: false } };
    default: {
      const s = scope.slice(scope.indexOf(':') + 1) as Sym;
      const fam = scope.startsWith('D1') ? 'd1' : 'g';
      const out = { d1: { GDX: false, VGT: false }, g: { GDX: false, VGT: false } };

      out[fam][s] = true;
      return out;
    }
  }
};

export interface NFamily {
  name: string;
  n: number;
  labels: (string | number)[];
  scope?: Scope;
  scale?: number;
}

// unit columns: D1·GDX (8), D1·VGT (8), Growth·GDX (50), Growth·VGT (50) — every numeric input has its own column
export const unitColumns = nNum; // 116
const unitCol = {
  d1: { GDX: 0, VGT: nD },
  g: { GDX: 2 * nD, VGT: 2 * nD + nG }
};
const unitCache = new Map<string, number[][]>();

export const unitsOf = (n: number, labels: (string | number)[]) => {
  const key = `${n}|${labels.join('|')}`;
  let units = unitCache.get(key);

  if (!units) {
    units = latinOffsets(n, unitColumns, new Rng(seedOf('nbhd', ...labels)));
    unitCache.set(key, units);
    if (unitCache.size > 128) unitCache.delete(unitCache.keys().next().value!);
  }

  return units;
};

export interface NeighbourPoint {
  quad: Quad;
  id: string;
  clipped: number;
}

const clipD1 = (box: (typeof d1Box)[number], centre: number, v: number) => {
  const lo = Math.min(box.min, centre);
  const hi = Math.max(box.max, centre);

  return v < lo ? { v: lo, clipped: true } : v > hi ? { v: hi, clipped: true } : { v, clipped: false };
};

// The unique neighbours of a centre under one family (common random numbers across centres): every active numeric
// coordinate of the family's scope moves by u × scale × radius, rounded to its grid, clipped to its box (widened to
// include the centre); categorical genes stay fixed. Duplicates of the centre or of earlier points are dropped.
export const neighbourhood = (centre: Quad, family: NFamily): NeighbourPoint[] => {
  const scope = scopeBooks(family.scope ?? 'joint');
  const scale = family.scale ?? 1;
  const units = unitsOf(family.n, family.labels);
  const active = Object.fromEntries(
    symbols.map((s) => [
      s,
      numericGenes.map((gene, i) => [gene, i] as const).filter(([gene]) => gene.active(structureOf(centre.g[s])))
    ])
  ) as Record<Sym, (readonly [(typeof numericGenes)[number], number])[]>;
  const seen = new Set<string>([quadId(centre)]);
  const out: NeighbourPoint[] = [];

  for (const u of units) {
    let clipped = 0;
    const d1 = { GDX: { ...centre.d1.GDX }, VGT: { ...centre.d1.VGT } };
    const g = { GDX: { ...centre.g.GDX }, VGT: { ...centre.g.VGT } };

    for (const s of symbols) {
      if (scope.d1[s])
        d1Box.forEach((box, i) => {
          const c = clipD1(
            box,
            centre.d1[s][box.key],
            centre.d1[s][box.key] + Math.round(u[unitCol.d1[s] + i]! * scale * d1Radius[box.key])
          );

          d1[s][box.key] = c.v;
          if (c.clipped) clipped++;
        });

      if (scope.g[s])
        for (const [gene, i] of active[s]) {
          const p = gPerturb(gene, centre.g[s][gene.key] as number, u[unitCol.g[s] + i]!, 'clip', scale);

          g[s][gene.key] = p.value;
          if (p.clipped) clipped++;
        }
    }

    let quad: Quad;

    try {
      quad = normalize({ d1, g, first: centre.first });
    } catch {
      continue;
    }

    const id = quadId(quad);

    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ quad, id, clipped });
  }

  return out;
};

// ----- local moves (refinement): every active numeric input of the movable books by ±R/2 and ±R, the priority
// flipped, and every enabled optional Growth rule of each Growth book switched OFF -----

export const movesOf = (q: Quad, movable: { d1: boolean; g: boolean } = { d1: true, g: true }): Quad[] => {
  const out: Quad[] = [];
  const add = (m: Quad) => {
    try {
      out.push(normalize(m));
    } catch {
      // an invalid move is not a move
    }
  };
  const withD1 = (s: Sym, d: D1Grid): Quad => ({ ...q, d1: { ...q.d1, [s]: d } });
  const withG = (s: Sym, c: GConfig): Quad => ({ ...q, g: { ...q.g, [s]: c } });

  for (const s of symbols) {
    if (movable.d1)
      for (const box of d1Box)
        for (const f of [0.5, 1])
          for (const sign of [-1, 1]) {
            const v = q.d1[s][box.key] + sign * Math.max(1, Math.round(f * d1Radius[box.key]));

            if (v >= box.min && v <= box.max) add(withD1(s, { ...q.d1[s], [box.key]: v }));
          }

    if (!movable.g) continue;

    const st = structureOf(q.g[s]);

    for (const gene of activeGenes(st)) {
      const step = fineStepOf(gene);

      for (const f of [0.5, 1])
        for (const sign of [-1, 1]) {
          const v = roundStep(
            (q.g[s][gene.key] as number) + sign * Math.max(step, roundStep(f * radiusValue(gene), step)),
            step
          );

          if (v < gene.min - 1e-9 || v > gene.max + 1e-9) continue;
          add(withG(s, { ...q.g[s], [gene.key]: v }));
        }
    }

    const off: [boolean, string][] = [
      [st.trend !== 'off', 'trendFilterEnabled'],
      [st.elig !== 'off', 'eligibilityEnabled'],
      [st.gate === 'on', 'drawdownRecoveryGateEnabled'],
      [st.istop === 'on', 'initialStopEnabled'],
      [st.retain === 'on', 'retentionEnabled'],
      [st.cont !== 'off', 'continuationEnabled'],
      [st.exits === 'hold_on_buffer_on', 'intradayLossBufferEnabled']
    ];

    for (const [on, key] of off) if (on) add(withG(s, { ...q.g[s], [key]: false }));
  }

  if (movable.d1 && movable.g) add({ ...q, first: q.first === 'D1' ? 'G' : 'D1' });

  const self = quadId(q);

  return [...new Map(out.map((m) => [quadId(m), m])).values()].filter((m) => quadId(m) !== self);
};

export const describeG = (c: GConfig) =>
  Object.entries(c)
    .filter(([k]) => k !== 'costBpsPerSide')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

export const describeQuad = (q: Quad) =>
  symbols
    .map((s) => `D1·${s}[${d1Keys.map((k) => q.d1[s][k]).join(',')}]`)
    .concat(symbols.map((s) => `G·${s}{${describeG(q.g[s])}}`))
    .concat([`first ${q.first}`])
    .join(' ');

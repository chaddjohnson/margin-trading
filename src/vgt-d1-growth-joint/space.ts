// The joint space (PROTOCOL.md §5): every candidate encodes ALL active D1 parameters, ALL active Growth 1.4.0
// parameters and the allocation architecture with its parameters.
//
// - D1: the eight registered parameters on the registry's integer grid (tenths of a percentage point, calendar days,
//   sessions) inside the common D1 box (src/multi-etf-d1/context.ts, Study 8's box). All eight are always active.
// - Growth: growth140-vgt-s8m's 8 structural and 50 conditional numeric genes with their boxes, on the coarse grid
//   (independent screen and islands) or the fine schema grid (informed lane, refinement, neighbourhoods), decoded and
//   identified by the browser's own effective-parameter identity (src/growth140-vgt-stable/space.ts, unchanged).
// - Allocation: architecture A | B; under B the two initial target sizes on {25, 50, 75, 100}% of $100,000; the
//   same-instant priority D1-first | Growth-first. Inactive allocation genes (A's targets) do not change the identity.
//
// The joint identity is sha256 of the canonical D1 vector, the Growth identity and the canonical allocation: two
// genomes that differ only in inactive genes are one configuration, evaluated once. Behaviourally identical
// configurations (the same funded-lot ledger) are grouped by their ledger signature in the reports.
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
import type { Allocation, Arch, Priority } from './allocator.ts';
import { seedOf } from './context.ts';

export type { GConfig, Structure };
export { activeGenes, effectiveOf, fineStepOf, numericGenes, radiusValue, roundStep, structuralGenes, structureOf };

export interface Joint {
  d1: D1Grid;
  g: GConfig;
  a: Allocation;
}

// ----- D1 -----

export const d1Box = d1Protocol.box.map((b) => ({ key: b.key as keyof D1Grid, min: b.min, max: b.max }));

if (d1Box.map((b) => b.key).join() !== d1Keys.join()) throw new Error('D1 box order differs from the D1 keys');

// Study 8's N1 neighbourhood radius in grid units (PROTOCOL.md §6.1): X ±10, Y ±2, stop ±10, hold ±2, L ±10,
// buffer ±10, P ±10, W ±20.
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

// ----- allocation -----

export const targets = [0.25, 0.5, 0.75, 1] as const;
export const archs: Arch[] = ['A', 'B'];
export const priorities: Priority[] = ['D1', 'G'];

export const canonicalAlloc = (a: Allocation): Allocation =>
  a.arch === 'A' ? { arch: 'A', d1Target: 1, gTarget: 1, first: a.first } : { ...a };

export const allocKey = (a: Allocation) =>
  a.arch === 'A' ? `A|${a.first}` : `B|${a.d1Target}|${a.gTarget}|${a.first}`;

// ----- the joint identity -----

export const jointCanonical = (j: Joint) =>
  `${d1Keys.map((k) => j.d1[k]).join(',')}#${gId(j.g)}#${allocKey(canonicalAlloc(j.a))}`;
export const jointId = (j: Joint) => createHash('sha256').update(jointCanonical(j)).digest('hex').slice(0, 16);

export const normalize = (j: Joint): Joint => ({
  d1: { ...j.d1 },
  g: effectiveOf(repair({ ...j.g })),
  a: canonicalAlloc(j.a)
});

// ----- cells (the protected strata, PROTOCOL.md §6.2): architecture × Growth entry × recovery gate -----

export type Entry = 'rise' | 'breakout';
export interface CellKey {
  arch: Arch;
  entry: Entry;
  gate: 'off' | 'on';
}

export const cells: CellKey[] = archs.flatMap((arch) =>
  (['rise', 'breakout'] as Entry[]).flatMap((entry) => (['off', 'on'] as const).map((gate) => ({ arch, entry, gate })))
);
export const cellName = (c: CellKey) => `${c.arch}/${c.entry}/${c.gate}`;
export const cellOf = (j: Joint): CellKey => ({
  arch: j.a.arch,
  entry: j.g.entryMethod === 'trend_breakout' ? 'breakout' : 'rise',
  gate: j.g.drawdownRecoveryGateEnabled === true ? 'on' : 'off'
});

// The structural class (for slots and reports): the cell plus the exit structure and the switches.
export const classOf = (j: Joint) => {
  const s = structureOf(j.g);

  return {
    cell: cellName(cellOf(j)),
    hold: s.exits === 'hold_off' ? 'off' : 'on',
    retain: s.retain,
    istop: s.istop,
    trend: s.trend,
    elig: s.elig,
    cont: s.cont,
    targets: j.a.arch === 'B' ? `${j.a.d1Target}/${j.a.gTarget}` : '—',
    first: j.a.first
  };
};

// ----- the genome -----
//
// [Growth structural (8)] [first (1)] [D1 indices (8)] [Growth numeric (50)] [d1Target, gTarget (2)]
// Categorical: the first 9 (uniform crossover, random reset); ordinal: the other 60 (SBX, polynomial mutation on grid
// indices). The architecture is the cell's (fixed within a cell), as are the entry and the gate genes.

export const nCat = structuralGenes.length + 1;
export const nNum = d1Box.length + numericGenes.length + 2;
export type Genome = number[];
export type Resolution = 'coarse' | 'fine';

export const catLevels = [...structuralGenes.map((s) => s.options.length), priorities.length];
export const numLevels = (res: Resolution) => [
  ...d1Levels,
  ...(res === 'coarse' ? levelCounts : fineLevels).slice(structuralGenes.length),
  targets.length,
  targets.length
];
export const levelsOf = (res: Resolution) => [...catLevels, ...numLevels(res)];

export const entryGene = structuralGenes.findIndex((s) => s.key === 'entry');
export const gateGene = structuralGenes.findIndex((s) => s.key === 'gate');

export const pinCell = (g: Genome, cell: CellKey) => {
  g[entryGene] = cell.entry === 'rise' ? 0 : 1;
  g[gateGene] = cell.gate === 'on' ? 1 : 0;
  return g;
};

export const decode = (g: Genome, arch: Arch, res: Resolution): Joint => {
  const struct = g.slice(0, structuralGenes.length);
  const first = priorities[g[structuralGenes.length]!]!;
  const d1 = d1OfIndices(g.slice(nCat, nCat + d1Box.length));
  const gNum = g.slice(nCat + d1Box.length, nCat + d1Box.length + numericGenes.length);
  const gc = res === 'coarse' ? configOfGenome([...struct, ...gNum]) : configOfFine([...struct, ...gNum]);
  const t = g.slice(nCat + d1Box.length + numericGenes.length);
  const a: Allocation = { arch, d1Target: targets[t[0]!]!, gTarget: targets[t[1]!]!, first };

  return normalize({ d1, g: gc, a });
};

export const encode = (j: Joint, res: Resolution): Genome => {
  const gg = res === 'coarse' ? genomeOf(j.g) : fineGenomeOf(j.g);
  const struct = gg.slice(0, structuralGenes.length);
  const gNum = gg.slice(structuralGenes.length);
  const ti = (x: number) => Math.max(0, targets.indexOf(x as (typeof targets)[number]));

  return [
    ...struct,
    priorities.indexOf(j.a.first),
    ...d1Indices(j.d1),
    ...gNum,
    j.a.arch === 'B' ? ti(j.a.d1Target) : targets.length - 1,
    j.a.arch === 'B' ? ti(j.a.gTarget) : targets.length - 1
  ];
};

// ----- the independent screen: a Latin supercube of scrambled Sobol blocks over the whole genome -----

export const screenGenomes = (n: number, cell: CellKey, res: Resolution, ...labels: (string | number)[]): Genome[] => {
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

    return pinCell(
      u.map((x, gene) => Math.min(levels[gene]! - 1, Math.floor(x * levels[gene]!))),
      cell
    );
  });
};

// ----- distance -----

// Normalized L∞ over the active numeric coordinates; 1 between different structures, cells or priorities.
export const jointDistance = (a: Joint, b: Joint) => {
  if (cellName(cellOf(a)) !== cellName(cellOf(b)) || a.a.first !== b.a.first) return 1;

  const g = gDistance(a.g, b.g);

  if (g >= 1) return 1;

  let d = g;

  for (const box of d1Box) d = Math.max(d, Math.abs(a.d1[box.key] - b.d1[box.key]) / (box.max - box.min));
  if (a.a.arch === 'B') {
    d = Math.max(d, Math.abs(a.a.d1Target - b.a.d1Target) / 0.75, Math.abs(a.a.gTarget - b.a.gTarget) / 0.75);
  }
  return d;
};

// ----- neighbourhoods (PROTOCOL.md §6.1) -----

export type Scope = 'joint' | 'd1' | 'g' | 'alloc';

export interface Family {
  name: string;
  n: number;
  labels: (string | number)[];
  scope?: Scope;
  scale?: number;
}

export const unitColumns = d1Box.length + numericGenes.length + 2; // 60
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
  joint: Joint;
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
export const neighbourhood = (centre: Joint, family: Family): NeighbourPoint[] => {
  const scope = family.scope ?? 'joint';
  const scale = family.scale ?? 1;
  const units = unitsOf(family.n, family.labels);
  const s = structureOf(centre.g);
  const gActive = numericGenes.map((gene, i) => [gene, i] as const).filter(([gene]) => gene.active(s));
  const seen = new Set<string>([jointId(centre)]);
  const out: NeighbourPoint[] = [];

  for (const u of units) {
    let clipped = 0;
    const d1 = { ...centre.d1 };
    const g: GConfig = { ...centre.g };
    const a: Allocation = { ...centre.a };

    if (scope === 'joint' || scope === 'd1')
      d1Box.forEach((box, i) => {
        const c = clipD1(box, centre.d1[box.key], centre.d1[box.key] + Math.round(u[i]! * scale * d1Radius[box.key]));

        d1[box.key] = c.v;
        if (c.clipped) clipped++;
      });

    if (scope === 'joint' || scope === 'g')
      for (const [gene, i] of gActive) {
        const p = gPerturb(gene, centre.g[gene.key] as number, u[d1Box.length + i]!, 'clip', scale);

        g[gene.key] = p.value;
        if (p.clipped) clipped++;
      }

    if ((scope === 'joint' || scope === 'alloc') && centre.a.arch === 'B') {
      const col = d1Box.length + numericGenes.length;
      const move = (x: number, uu: number) => {
        const ix = targets.indexOf(x as (typeof targets)[number]) + Math.round(uu * scale);

        if (ix < 0 || ix >= targets.length) clipped++;
        return targets[Math.min(targets.length - 1, Math.max(0, ix))]!;
      };

      a.d1Target = move(centre.a.d1Target, u[col]!);
      a.gTarget = move(centre.a.gTarget, u[col + 1]!);
    }

    let joint: Joint;

    try {
      joint = normalize({ d1, g, a });
    } catch {
      continue;
    }

    const id = jointId(joint);

    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ joint, id, clipped });
  }

  return out;
};

// ----- local moves (refinement): every active numeric input of both families by ±R/2 and ±R, each target by one
// grid step, the priority flipped, and every enabled optional Growth rule switched OFF -----

export const movesOf = (j: Joint): Joint[] => {
  const out: Joint[] = [];
  const add = (m: Joint) => {
    try {
      out.push(normalize(m));
    } catch {
      // an invalid move is not a move
    }
  };

  for (const box of d1Box)
    for (const f of [0.5, 1])
      for (const sign of [-1, 1]) {
        const v = j.d1[box.key] + sign * Math.max(1, Math.round(f * d1Radius[box.key]));

        if (v >= box.min && v <= box.max) add({ ...j, d1: { ...j.d1, [box.key]: v } });
      }

  const s = structureOf(j.g);

  for (const gene of activeGenes(s)) {
    const step = fineStepOf(gene);

    for (const f of [0.5, 1])
      for (const sign of [-1, 1]) {
        const v = roundStep(
          (j.g[gene.key] as number) + sign * Math.max(step, roundStep(f * radiusValue(gene), step)),
          step
        );

        if (v < gene.min - 1e-9 || v > gene.max + 1e-9) continue;
        add({ ...j, g: { ...j.g, [gene.key]: v } });
      }
  }

  if (j.a.arch === 'B')
    for (const key of ['d1Target', 'gTarget'] as const)
      for (const sign of [-1, 1]) {
        const ix = targets.indexOf(j.a[key] as (typeof targets)[number]) + sign;

        if (ix >= 0 && ix < targets.length) add({ ...j, a: { ...j.a, [key]: targets[ix]! } });
      }

  add({ ...j, a: { ...j.a, first: j.a.first === 'D1' ? 'G' : 'D1' } });

  const off: [boolean, string][] = [
    [s.trend !== 'off', 'trendFilterEnabled'],
    [s.elig !== 'off', 'eligibilityEnabled'],
    [s.istop === 'on', 'initialStopEnabled'],
    [s.retain === 'on', 'retentionEnabled'],
    [s.cont !== 'off', 'continuationEnabled'],
    [s.exits === 'hold_on_buffer_on', 'intradayLossBufferEnabled']
  ];

  for (const [on, key] of off) if (on) add({ ...j, g: { ...j.g, [key]: false } });

  const self = jointId(j);

  return [...new Map(out.map((m) => [jointId(m), m])).values()].filter((m) => jointId(m) !== self);
};

export const describeJoint = (j: Joint) =>
  `D1[${d1Keys.map((k) => j.d1[k]).join(',')}] G{${Object.entries(j.g)
    .filter(([k]) => k !== 'costBpsPerSide')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')}} ${allocKey(j.a)}`;

export { gId as growthId };

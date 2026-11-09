// The parameter space (PROTOCOL.md §6, §8): grid vectors, canonical identity, the engine parameters a vector stands
// for, the stratified scrambled-Sobol screen, Latin-hypercube fillers and neighbourhood designs, and the normalized L∞
// distance every distinctness rule uses.
//
// Canonical identity: a family's inactive genes are 0; the lookback L and the continuation window W are behaviourally
// equal for every index giving the same number of previous periods max(1, round(minutes/B)), so each class is
// represented by the index whose value is nearest (in log terms) to that count × B (ties: the lower index). H is kept
// as given (its comparison against the period clock is not a function of a period count alone around early closes).
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import {
  type FamilyKey,
  type Key,
  activeKeys,
  axes,
  depthStrata,
  intradayD1Diagnostics,
  intradayD1Shortlist,
  keys,
  periodLevels,
  scaleStrata,
  seedOf
} from './context.ts';
import type { Params } from './engine.ts';

export type Grid = Record<Key, number>;

export interface Candidate {
  family: FamilyKey;
  grid: Grid; // canonical
}

export const zeroGrid = (): Grid => ({ B: 0, X: 0, Y: 0, S: 0, H: 0, L: 0, U: 0, P: 0, W: 0 });

export const periodsFor = (minutes: number, periodMinutes: number) => Math.max(1, Math.round(minutes / periodMinutes));

// Per B level: the representative index of every L/W index (the same table serves both: identical axes).
const representative: number[][] = periodLevels.map((B) => {
  const size = axes.L.size;
  const classOf = Array.from({ length: size }, (_v, k) => periodsFor(axes.L.value(k), B));
  const rep: number[] = [];

  for (let k = 0; k < size; k++) {
    const target = Math.log(classOf[k]! * B);
    let best = -1;
    let bestDistance = Infinity;

    for (let j = 0; j < size; j++) {
      if (classOf[j] !== classOf[k]) continue;

      const d = Math.abs(Math.log(axes.L.value(j)) - target);

      if (d < bestDistance - 1e-12) {
        best = j;
        bestDistance = d;
      }
    }

    rep.push(best);
  }

  return rep;
});

if (axes.L.size !== axes.W.size || axes.L.value(7) !== axes.W.value(7)) throw new Error('L and W axes must be identical');

export const canonical = (family: FamilyKey, grid: Grid): Grid => {
  const active = activeKeys[family];
  const out = zeroGrid();

  for (const key of active) {
    const v = grid[key];

    if (!Number.isInteger(v) || v < 0 || v >= axes[key].size) throw new Error(`${family} ${key}=${v} is outside the grid`);

    out[key] = v;
  }

  out.L = representative[out.B]![out.L]!;
  if (active.includes('W')) out.W = representative[out.B]![out.W]!;

  return out;
};

export const gridKey = (grid: Grid) => keys.map((k) => grid[k]).join('/');
export const idOf = (c: Candidate) => `${c.family}-${keys.map((k) => c.grid[k].toString(36)).join('.')}`;
export const candidateOf = (family: FamilyKey, grid: Grid): Candidate => ({ family, grid: canonical(family, grid) });

export const parseId = (id: string): Candidate => {
  const [family, body] = id.split('-') as [FamilyKey, string];
  const parts = body.split('.').map((p) => parseInt(p, 36));
  const grid = Object.fromEntries(keys.map((k, i) => [k, parts[i]!])) as Grid;

  return candidateOf(family, grid);
};

export const valueOf = (grid: Grid, key: Key) => axes[key].value(grid[key]);

export const paramsOf = (c: Candidate): Params => {
  const g = c.grid;
  const B = valueOf(g, 'B');

  return {
    X: valueOf(g, 'X'),
    Y: valueOf(g, 'Y'),
    S: valueOf(g, 'S'),
    holdSeconds: valueOf(g, 'H') * 60,
    lookbackPeriods: periodsFor(valueOf(g, 'L'), B),
    buffer: valueOf(g, 'U'),
    pullback: valueOf(g, 'P'),
    continuationPeriods: periodsFor(valueOf(g, 'W'), B)
  };
};

const pct = (f: number) => `${Number((f * 100).toFixed(4))}%`;

export const describe = (c: Candidate) => {
  const g = c.grid;
  const a = activeKeys[c.family];
  const parts = [`${c.family} B${valueOf(g, 'B')}`, `X${pct(valueOf(g, 'X'))}`, `Y${pct(valueOf(g, 'Y'))}`];

  parts.push(`S${pct(valueOf(g, 'S'))}`, `L${valueOf(g, 'L')}m`);
  if (a.includes('H')) parts.push(`H${valueOf(g, 'H')}m`, `U${pct(valueOf(g, 'U'))}`);
  if (a.includes('P')) parts.push(`P${pct(valueOf(g, 'P'))}`, `W${valueOf(g, 'W')}m`);

  return parts.join(' ');
};

export const valuesOf = (c: Candidate) =>
  Object.fromEntries(activeKeys[c.family].map((k) => [k, valueOf(c.grid, k)])) as Partial<Record<Key, number>>;

// research/intraday-d1-vgt vectors (its id: B level index 0..5 for 5…130, then X Y S H L U P W in base 36) on this grid.
export const fromIntradayD1 = (id: string): Grid => {
  const [b, x, y, s, h, l, u, p, w] = id.slice(3).split('.').map((t) => parseInt(t, 36)) as number[];

  return { B: b! + 1, X: x!, Y: y!, S: s!, H: h!, L: l!, U: u!, P: p!, W: w! };
};

export const incumbentGrids = intradayD1Shortlist.map((v) => ({
  id: v.id,
  grid: { B: v.b + 1, X: v.x, Y: v.y, S: v.s, H: v.h, L: v.l, U: v.u, P: v.p, W: v.w } as Grid
}));
export const diagnosticGrids = intradayD1Diagnostics.map((id) => ({ id, grid: fromIntradayD1(id) }));

// Strata (protected cells): dip depth (X) × lookback scale — the EFFECTIVE lookback, the previous periods' span
// max(1, round(L/B)) × B: within a session (≤ 390 minutes) or longer.
export const effectiveLookback = (grid: Grid) => {
  const B = valueOf(grid, 'B');

  return periodsFor(valueOf(grid, 'L'), B) * B;
};

export const cellOf = (grid: Grid) => {
  const depth = depthStrata.find((d) => grid.X >= d.from && grid.X <= d.to)!.key;
  const scale = effectiveLookback(grid) <= 390 ? 'intraday' : 'multi';

  return `${depth}/${scale}`;
};
export const cells = depthStrata.flatMap((d) => scaleStrata.map((s) => ({ key: `${d.key}/${s.key}`, depth: d, scale: s })));

// The stratified screen: `perCell` unique canonical candidates per cell, scrambled Sobol over the family's active
// genes, X and L restricted to the cell's ranges.
export const screenOf = (family: FamilyKey, perCell: number, labels: (string | number)[]) => {
  const active = activeKeys[family];
  const out: { candidate: Candidate; cell: string }[] = [];
  const seen = new Set<string>();
  let drawn = 0;

  for (const cell of cells) {
    const sobol = new Sobol({ dimensions: active.length, scramble: { seed: deriveSeed(...seedOf(...labels, cell.key)) } });
    let got = 0;
    let tries = 0;

    while (got < perCell && tries < perCell * 64) {
      const u = sobol.next();
      const grid = zeroGrid();

      active.forEach((key, d) => {
        const lo = key === 'X' ? cell.depth.from : key === 'L' ? cell.scale.from : 0;
        const hi = key === 'X' ? cell.depth.to : key === 'L' ? cell.scale.to : axes[key].size - 1;

        grid[key] = Math.min(hi, lo + Math.floor(u[d]! * (hi - lo + 1)));
      });

      const candidate = candidateOf(family, grid);
      const id = idOf(candidate);

      tries++;
      drawn++;

      if (seen.has(id) || cellOf(candidate.grid) !== cell.key) continue;

      seen.add(id);
      out.push({ candidate, cell: cell.key });
      got++;
    }
  }

  return { points: out, drawn };
};

// Latin-hypercube fillers inside one cell (island top-ups cycle the cells).
export const fillerOf = (family: FamilyKey, cellKey: string, n: number, labels: (string | number)[]) => {
  const cell = cells.find((c) => c.key === cellKey)!;
  const active = activeKeys[family];

  return latinOffsets(n, active.length, new Rng(deriveSeed(...seedOf(...labels)))).map((unit) => {
    const grid = zeroGrid();

    active.forEach((key, d) => {
      const lo = key === 'X' ? cell.depth.from : key === 'L' ? cell.scale.from : 0;
      const hi = key === 'X' ? cell.depth.to : key === 'L' ? cell.scale.to : axes[key].size - 1;

      grid[key] = Math.min(hi, lo + Math.floor(((unit[d]! + 1) / 2) * (hi - lo + 1)));
    });

    return candidateOf(family, grid);
  });
};

// Neighbourhood designs (standard §5.3): one Latin hypercube of u ∈ [−1, 1] over all nine genes per seed family
// (common random numbers across centres); a centre uses the columns of its active genes in the family's scope;
// coordinate = centre + round(u × scale × radius), clipped to the grid (the box always contains the centre); then
// canonicalized; draws equal to the centre or to an earlier draw are dropped (counted).
export interface DesignFamily {
  name: string;
  n: number;
  labels: (string | number)[];
  scale?: number;
  scope?: readonly Key[]; // default: every active gene
}

export interface Draw {
  candidate: Candidate;
  clipped: number; // coordinates clipped
}

const designCache = new Map<string, number[][]>();

const offsetsOf = (family: DesignFamily) => {
  const k = JSON.stringify([family.n, family.labels]);
  let cached = designCache.get(k);

  if (!cached) {
    cached = latinOffsets(family.n, keys.length, new Rng(deriveSeed(...seedOf(...family.labels))));
    designCache.set(k, cached);
  }

  return cached;
};

export const designOf = (centre: Candidate, family: DesignFamily) => {
  const scope = (family.scope ?? keys).filter((k) => activeKeys[centre.family].includes(k));
  const scale = family.scale ?? 1;
  const seen = new Set<string>([idOf(centre)]);
  const draws: Draw[] = [];
  let duplicates = 0;
  let clippedTotal = 0;

  for (const unit of offsetsOf(family)) {
    const grid = { ...centre.grid };
    let clipped = 0;

    for (const key of scope) {
      const d = keys.indexOf(key);
      const raw = centre.grid[key] + Math.round(unit[d]! * scale * axes[key].radius);
      const max = axes[key].size - 1;

      if (raw < 0 || raw > max) clipped++;
      grid[key] = Math.min(max, Math.max(0, raw));
    }

    const candidate = candidateOf(centre.family, grid);
    const id = idOf(candidate);

    clippedTotal += clipped;

    if (seen.has(id)) {
      duplicates++;
      continue;
    }

    seen.add(id);
    draws.push({ candidate, clipped });
  }

  return { draws, duplicates, clipped: clippedTotal, scope };
};

// Normalized L∞ over the union of active genes (a gene inactive in one of the two counts as 0 there).
export const distance = (a: Candidate, b: Candidate) =>
  keys.reduce((m, k) => Math.max(m, Math.abs(a.grid[k] - b.grid[k]) / (axes[k].size - 1)), 0) +
  (a.family === b.family ? 0 : 1);

// The repository's NSGA-II operators work on grid indices through a ParameterSpace over a family's active genes.
export const operatorSpaceOf = (family: FamilyKey): ParameterSpace => ({
  name: `dip-${family}`,
  specs: activeKeys[family].map((key) => ({
    key: key as never,
    label: key,
    unit: 'sessions' as const,
    min: 0,
    max: axes[key].size - 1,
    step: 1,
    neighborhoodRadius: axes[key].radius,
    rationale: axes[key].rationale
  }))
});

export const genomeOf = (c: Candidate) => activeKeys[c.family].map((k) => c.grid[k]);
export const fromGenome = (family: FamilyKey, genome: readonly number[]): Candidate => {
  const grid = zeroGrid();

  activeKeys[family].forEach((k, d) => {
    grid[k] = Math.min(axes[k].size - 1, Math.max(0, Math.round(genome[d]!)));
  });

  return candidateOf(family, grid);
};

// Refinement moves: every active gene ±⌈r/2⌉ and ±r (Study 8's probes).
export const movesOf = (c: Candidate) => {
  const out: { candidate: Candidate; move: string }[] = [];
  const seen = new Set<string>([idOf(c)]);

  for (const key of activeKeys[c.family]) {
    const r = axes[key].radius;

    for (const step of [-r, -Math.ceil(r / 2), Math.ceil(r / 2), r]) {
      const v = c.grid[key] + step;

      if (v < 0 || v >= axes[key].size) continue;

      const candidate = candidateOf(c.family, { ...c.grid, [key]: v });
      const id = idOf(candidate);

      if (seen.has(id)) continue;

      seen.add(id);
      out.push({ candidate, move: `${key}${step > 0 ? '+' : ''}${step}` });
    }
  }

  return out;
};

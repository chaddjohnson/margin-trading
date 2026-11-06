// The intraday grid (PROTOCOL.md §4) and Study 8's grid machinery on it: genomes (one integer index per key), the
// engine parameters a grid vector stands for, the scrambled-Sobol screen (S8/space.ts:52-76), the Latin-hypercube
// neighbourhood designs in the Study 5/6 "clip" and "inbox" forms (S8/designs.ts, study6 designs.ts:61-100), and the
// normalized L∞ distance every distinctness rule uses.
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { type Grid, type Key, axes, keys, seedOf } from './context.ts';
import type { EngineParams } from './engine.ts';

export type Genome = number[];

export const genomeOf = (grid: Grid): Genome => keys.map((key) => grid[key]);
export const gridOf = (genome: readonly number[]): Grid =>
  Object.fromEntries(keys.map((key, d) => [key, genome[d]!])) as Grid;
export const gridKey = (grid: Grid) => keys.map((key) => grid[key]).join('/');
export const configId = (grid: Grid) => `id-${keys.map((key) => grid[key].toString(36)).join('.')}`;

export const inBox = (grid: Grid) =>
  keys.every((key) => Number.isInteger(grid[key]) && grid[key] >= 0 && grid[key] < axes[key].size);

export interface Values {
  periodMinutes: number;
  targetPercentChange: number;
  trailingBuyPercentage: number;
  trailingStopPercentage: number;
  maximumHoldMinutes: number;
  lookbackMinutes: number;
  intradayLossBuffer: number;
  pullback: number;
  continuationMinutes: number;
}

export const valuesOf = (grid: Grid): Values => {
  if (!inBox(grid)) throw new Error(`grid vector ${gridKey(grid)} is outside the box`);

  return Object.fromEntries(keys.map((key) => [key, axes[key].value(grid[key])])) as unknown as Values;
};

// Minutes → periods as D1 counts sessions: the previous round(minutes / B) periods, at least one.
export const periodsFor = (minutes: number, periodMinutes: number) => Math.max(1, Math.round(minutes / periodMinutes));

export const engineParamsOf = (values: Values): EngineParams => ({
  targetPercentChange: values.targetPercentChange,
  trailingBuyPercentage: values.trailingBuyPercentage,
  trailingStopPercentage: values.trailingStopPercentage,
  holdSeconds: values.maximumHoldMinutes * 60,
  lookbackPeriods: periodsFor(values.lookbackMinutes, values.periodMinutes),
  intradayLossBuffer: values.intradayLossBuffer,
  pullback: values.pullback,
  continuationPeriods: periodsFor(values.continuationMinutes, values.periodMinutes)
});

const percent = (fraction: number) => `${Number((fraction * 100).toFixed(4))}%`;

export const describe = (grid: Grid) => {
  const v = valuesOf(grid);

  return `B${v.periodMinutes} X${percent(v.targetPercentChange)} Y${percent(v.trailingBuyPercentage)} S${percent(v.trailingStopPercentage)} H${v.maximumHoldMinutes}m L${v.lookbackMinutes}m U${percent(v.intradayLossBuffer)} P${percent(v.pullback)} W${v.continuationMinutes}m`;
};

// The repository's NSGA-II operators work on grid indices through a ParameterSpace: here min 0, max size − 1, step 1.
export const operatorSpace: ParameterSpace = {
  name: 'intraday-d1-vgt-9',
  specs: keys.map((key) => ({
    key: key as never,
    label: key,
    unit: 'sessions' as const,
    min: 0,
    max: axes[key].size - 1,
    step: 1,
    neighborhoodRadius: axes[key].radius,
    rationale: axes[key].rationale
  }))
};

// Normalized L∞: max over keys of |Δ index| ÷ (size − 1) (study6 designs.ts:226-235).
export const distance = (a: Grid, b: Grid) =>
  keys.reduce((max, key) => Math.max(max, Math.abs(a[key] - b[key]) / (axes[key].size - 1)), 0);

// Study 8's screen: a scrambled Sobol stream of unique grid vectors, floor(u · size), at most 64 × draws.
export const sobolGrids = (samples: number, labels: (string | number)[]) => {
  const sobol = new Sobol({ dimensions: keys.length, scramble: { seed: deriveSeed(...seedOf(...labels)) } });
  const seen = new Set<string>();
  const grids: Grid[] = [];
  let drawn = 0;

  while (grids.length < samples && drawn < samples * 64) {
    const point = sobol.next();
    const grid = gridOf(keys.map((key, d) => Math.min(axes[key].size - 1, Math.floor(point[d]! * axes[key].size))));
    const k = gridKey(grid);

    drawn++;

    if (!seen.has(k)) {
      seen.add(k);
      grids.push(grid);
    }
  }

  return { grids, drawn };
};

// A Latin hypercube over the whole box (the GA's short-population filler, S8/search.ts:449-466).
export const lhsGrids = (samples: number, labels: (string | number)[]) =>
  latinOffsets(samples, keys.length, new Rng(deriveSeed(...seedOf(...labels)))).map((unit) =>
    gridOf(keys.map((key, d) => Math.min(axes[key].size - 1, Math.floor(((unit[d]! + 1) / 2) * axes[key].size))))
  );

export type Mode = 'clip' | 'inbox';

export interface Family {
  name: string; // e.g. 'r1', 'select1'
  n: number;
  labels: (string | number)[];
  mode?: Mode;
  scale?: number;
}

export interface DesignPoint {
  index: number;
  grid: Grid;
  clipped: { key: Key; bound: 'min' | 'max' }[];
}

// Study 6's coordinate rule (designs.ts:61-77), unchanged, on this grid.
const coordinate = (centre: number, u: number, key: Key, mode: Mode, scale: number) => {
  const { size, radius } = axes[key];
  const max = size - 1;

  if (mode === 'clip') {
    const raw = centre + Math.round(u * scale * radius);

    return {
      value: Math.min(max, Math.max(0, raw)),
      clipped: raw > max ? ('max' as const) : raw < 0 ? ('min' as const) : undefined
    };
  }

  const lo = Math.max(0, centre - Math.round(scale * radius));
  const hi = Math.min(max, centre + Math.round(scale * radius));

  return { value: Math.round(lo + ((u + 1) / 2) * (hi - lo)), clipped: undefined };
};

// The family's design: offsets depend only on the labels (common random numbers across centres).
export const design = (centre: Grid, family: Family): DesignPoint[] =>
  latinOffsets(family.n, keys.length, new Rng(deriveSeed(...seedOf(...family.labels)))).map((unit, index) => {
    const grid = { ...centre };
    const clipped: DesignPoint['clipped'] = [];

    keys.forEach((key, d) => {
      const c = coordinate(centre[key], unit[d]!, key, family.mode ?? 'clip', family.scale ?? 1);

      grid[key] = c.value;
      if (c.clipped) clipped.push({ key, bound: c.clipped });
    });

    return { index, grid, clipped };
  });

// Points equal to the centre or to an earlier point dropped (S8/designs.ts:88-105).
export const uniquePoints = (points: readonly DesignPoint[], centre: Grid) => {
  const seen = new Set<string>([gridKey(centre)]);

  return points.filter((point) => {
    const k = gridKey(point.grid);

    if (seen.has(k)) return false;

    seen.add(k);
    return true;
  });
};

// Coordinates within r of a bound (S8/evidence.ts:60-70): they trigger the in-box pair Q2b.
export const nearBound = (grid: Grid) =>
  keys.filter((key) => grid[key] < axes[key].radius || axes[key].size - 1 - grid[key] < axes[key].radius);

export const atBound = (grid: Grid) => keys.filter((key) => grid[key] === 0 || grid[key] === axes[key].size - 1);

// The configuration space (PROTOCOL.md §6). A configuration is ONE Growth 1.4.0 book alone on one ETF and the fixed
// $100,000 budget, or CASH (no book; the zero reference, never selectable). The genome is growth140's: 8 structural and
// 50 conditional numeric genes on the canonical boxes at the schema's FINE step (src/growth140-vgt-stable/space.ts,
// boxes from src/growth140-vgt-s8m/space.ts), identical for every ETF; every transfer vector is exactly representable.
//
// IDENTITY. The Growth vector's own canonical identity (growth140's configId of the effective vector, e.g. #4
// 420cd989e4fa7749): inactive genes never create a second configuration. The symbol is part of every evaluation key
// (the door), never of the configuration's identity, so one vector on two ETFs has one id and two records.
//
// EVALUATION SHAPE. Priority 3's quad with the Growth slot (`GDX` key) holding the vector and every other book disabled
// (Priority 3's placeholders, never run or funded) — 4A's standalone shape; the slot holds the ETF's door (doors.ts).
//
// NEIGHBOURHOODS (§8). One Latin hypercube of u ∈ [−1, 1] over the 50 numeric columns per seed family (this study's
// namespace), common random numbers across every centre of a cutoff and EVERY ETF (the matched instrument): every ACTIVE
// numeric input moves by u × scale × radius (10% of its box), rounded to its fine step and clipped to the box widened to
// include the centre (clipping counted); categorical inputs fixed; inactive inputs untouched; orders repaired; rows equal
// to the centre or to an earlier row are dropped from the statistics.
import { Rng } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import {
  type Config as GConfig,
  activeGenes,
  configDistance,
  configId as gId,
  configOfFine,
  effectiveOf,
  fineGenomeOf,
  fineLevels,
  perturb as gPerturb,
  repair,
  structuralGenes,
  numericGenes,
  structureOf
} from '../growth140-vgt-stable/space.ts';
import { type BookId, bookIds } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { type Quad, d1Placeholder, normalize } from '../vg-d1-growth-joint/space.ts';
import { seedOf } from './context.ts';

export type { GConfig, Quad };
export { gId, structureOf, numericGenes, structuralGenes, activeGenes };

// Priority 3's placeholder Growth vector (a disabled book; identity 1af5b55987a56e2f) — the VGT key of the quad.
export const gPlaceholder: GConfig = effectiveOf({
  entryMethod: 'rise_from_recent_low',
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 20,
  trendFilterEnabled: false,
  eligibilityEnabled: false,
  drawdownRecoveryGateEnabled: false,
  trailingStopPercent: 7.3,
  maximumHoldEnabled: true,
  maximumHoldDays: 8,
  intradayLossBufferEnabled: true,
  intradayLossBufferPercent: 2.9,
  initialStopEnabled: false,
  retentionEnabled: false,
  continuationEnabled: false,
  costBpsPerSide: 5
} as GConfig);

if (gId(gPlaceholder) !== '1af5b55987a56e2f') throw new Error(`the placeholder's identity is ${gId(gPlaceholder)}`);

export const canonicalG = (g: GConfig) => effectiveOf(repair({ ...g }));
export const CASH_ID = 'cash';

export interface Built {
  g: GConfig | null; // null: cash
  quad: Quad;
  options: EvalOptions;
  id: string;
}

const disabledExceptSlot = (on: boolean): EvalOptions => ({
  enabled: Object.fromEntries(bookIds.filter((b) => b !== 'G:GDX' || !on).map((b) => [b, false])) as Partial<
    Record<BookId, boolean>
  >
});

export const build = (g: GConfig | null): Built => {
  const c = g === null ? null : canonicalG(g);

  return {
    g: c,
    quad: normalize({
      d1: { GDX: { ...d1Placeholder }, VGT: { ...d1Placeholder } },
      g: { GDX: c ?? gPlaceholder, VGT: gPlaceholder },
      first: 'D1'
    }),
    options: disabledExceptSlot(c !== null),
    id: c === null ? CASH_ID : gId(c)
  };
};

// ----- cells and screen strata (4A's) -----

export type Entry = 'rise' | 'breakout';
export const entries: Entry[] = ['rise', 'breakout'];
export const entryOf = (g: GConfig): Entry => (g.entryMethod === 'trend_breakout' ? 'breakout' : 'rise');

const sIndex = (key: string) => structuralGenes.findIndex((s) => s.key === key);
export const gene = {
  entry: sIndex('entry'),
  trend: sIndex('trend'),
  elig: sIndex('elig'),
  gate: sIndex('gate'),
  exits: sIndex('exits'),
  istop: sIndex('istop'),
  retain: sIndex('retain'),
  cont: sIndex('cont')
};
export const nS = structuralGenes.length; // 8
export const nG = numericGenes.length; // 50

// The protected screen strata within an entry cell (round-robin): recovery gate off/on × trend filter off/on × (Rise
// only) eligibility off/on × maximum losing hold off/on × initial stop off/on × retention off/on — 64 Rise strata, 32
// breakout strata. An "on" stratum keeps the quasi-random method, policy or buffer if it is one, otherwise takes method
// 1 + (round mod its count). Continuation (off | 4 methods), the trailing stop and every numeric input stay quasi-random.
export const strataDims = (entry: Entry) =>
  ['gate', 'trend', ...(entry === 'rise' ? (['elig'] as const) : []), 'exits', 'istop', 'retain'] as (
    'gate' | 'trend' | 'elig' | 'exits' | 'istop' | 'retain'
  )[];
export const strataCount = (entry: Entry) => 2 ** strataDims(entry).length;

export const pinEntry = (g: number[], entry: Entry) => {
  g[gene.entry] = entry === 'rise' ? 0 : 1;
  return g;
};

export const pinStratum = (g: number[], entry: Entry, i: number) => {
  const dims = strataDims(entry);
  const k = i % 2 ** dims.length;
  const round = Math.floor(i / 2 ** dims.length);

  dims.forEach((d, bit) => {
    const on = ((k >> bit) & 1) === 1;
    const levels = structuralGenes[gene[d]]!.options.length;

    if (d === 'gate' || d === 'istop' || d === 'retain') g[gene[d]] = on ? 1 : 0;
    else if (!on) g[gene[d]] = 0;
    else if (g[gene[d]] === 0) g[gene[d]] = 1 + (round % (levels - 1));
  });
  return g;
};

// ----- the genome (fine resolution) -----

export type Genome = number[];
export const levels = fineLevels; // 8 structural + 50 numeric
export const decodeG = (g: Genome): GConfig => configOfFine(g);
export const encodeG = (c: GConfig): Genome => fineGenomeOf(c);

export const onFineGrid = (c: GConfig) => {
  try {
    return gId(decodeG(encodeG(c))) === gId(canonicalG(c));
  } catch {
    return false;
  }
};

// The screen: a Latin supercube of scrambled Sobol blocks (≤ 16 dimensions each) over the 58 genes, this study's seeds.
export const screenGenomes = (n: number, ...labels: (string | number)[]): Genome[] => {
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

    return u.map((x, k) => Math.min(levels[k]! - 1, Math.floor(x * levels[k]!)));
  });
};

// ----- distance and classes -----

export const gDistance = (a: GConfig | null, b: GConfig | null) =>
  a === null || b === null ? (a === b ? 0 : 1) : configDistance(a, b);

export const classOf = (g: GConfig | null) => {
  if (!g) return 'CASH';

  const s = structureOf(g);

  return [
    entryOf(g),
    `gate ${s.gate}`,
    `trend ${s.trend}`,
    `elig ${s.elig}`,
    s.exits,
    `istop ${s.istop}`,
    `retain ${s.retain}`,
    `cont ${s.cont}`
  ].join('|');
};

export const coarseClassOf = (g: GConfig | null) => {
  if (!g) return 'CASH';

  const s = structureOf(g);

  return `${entryOf(g)}|gate ${s.gate}|trend ${s.trend === 'off' ? 'off' : 'on'}|elig ${s.elig === 'off' ? 'off' : 'on'}|hold ${s.exits === 'hold_off' ? 'off' : 'on'}|istop ${s.istop}|retain ${s.retain}`;
};

// ----- neighbourhoods -----

export interface NFamily {
  name: string;
  n: number;
  labels: (string | number)[];
  scale?: number;
}

const unitCache = new Map<string, number[][]>();

export const unitsOf = (n: number, labels: (string | number)[]) => {
  const key = `${n}|${labels.join('|')}`;
  let units = unitCache.get(key);

  if (!units) {
    units = latinOffsets(n, nG, new Rng(seedOf('nbhd', ...labels)));
    unitCache.set(key, units);
    if (unitCache.size > 256) unitCache.delete(unitCache.keys().next().value!);
  }

  return units;
};

export interface Row {
  row: number;
  built: Built;
  id: string;
  clipped: number;
  dup: boolean; // equal to the centre or to an earlier row (dropped from the statistics, kept for pairing)
}

export const rowsOf = (centre: Built, family: NFamily, units = unitsOf(family.n, family.labels)): Row[] => {
  if (!centre.g) throw new Error('cash has no neighbourhood');

  const scale = family.scale ?? 1;
  const g0 = centre.g;
  const st = structureOf(g0);
  const active = numericGenes.map((g, i) => [g, i] as const).filter(([g]) => g.active(st));
  const seen = new Set<string>([centre.id]);

  return units.map((u, row) => {
    let clipped = 0;
    const g: GConfig = { ...g0 };

    for (const [gn, i] of active) {
      const p = gPerturb(gn, g0[gn.key] as number, u[i]!, 'clip', scale);

      g[gn.key] = p.value;
      if (p.clipped) clipped++;
    }

    const built = build(g);
    const dup = seen.has(built.id);

    seen.add(built.id);
    return { row, built, id: built.id, clipped, dup };
  });
};

// The number of active numeric inputs (dimension disclosure).
export const activeInputs = (g: GConfig) => numericGenes.filter((gn) => gn.active(structureOf(g))).length;

// The report-only categorical toggles: every enabled optional rule OFF.
export const toggles = (g: GConfig): Record<string, GConfig> => {
  const s = structureOf(g);
  const out: Record<string, GConfig> = {};
  const add = (name: string, key: string) => {
    try {
      out[name] = canonicalG({ ...g, [key]: false });
    } catch {
      // not a valid alternative
    }
  };

  if (s.retain === 'on') add('retention OFF', 'retentionEnabled');
  if (s.gate === 'on') add('recovery gate OFF', 'drawdownRecoveryGateEnabled');
  if (s.trend !== 'off') add('trend filter OFF', 'trendFilterEnabled');
  if (s.elig !== 'off') add('eligibility OFF', 'eligibilityEnabled');
  if (s.istop === 'on') add('initial stop OFF', 'initialStopEnabled');
  if (s.cont !== 'off') add('continuation OFF', 'continuationEnabled');
  if (s.exits === 'hold_on_buffer_on') add('loss buffer OFF', 'intradayLossBufferEnabled');
  return out;
};

export const describeG = (g: GConfig) =>
  Object.entries(g)
    .filter(([k]) => k !== 'costBpsPerSide')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

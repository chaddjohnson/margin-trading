// The configuration space (PROTOCOL.md §6) — reference method NL0 1.0.0's (5B's src/vg-lifecycle-matched-optimization/
// config.ts, itself Priority 3B's), with its identities, genome, grids, boxes and neighbourhoods unchanged (so a 5B or 3B
// configuration has the same cfgId here). A configuration is VG #2's architecture — two D1 books (D1·GDX, D1·VGT, always
// enabled) and a Growth inclusion choice; THIS STUDY FIXES THE INCLUSION TO V (Growth·VGT only, Growth·GDX OFF: New L0's
// structure). The genome keeps the inclusion gene so that identities stay 5B's; it is pinned to V everywhere.
//
// CELLS. 5B's three protected structure cells (V, G, B) chose the strategy combination; with the combination fixed they
// are omitted and their budgets reassigned through their own schedules to three V SUB-CELLS (budgets.ts): V1 (5B's V
// schedule), V2 (5B's G schedule) and V3 (5B's B schedule). Inside every sub-cell the structure is V: the screen strata
// are V's six (Growth·VGT's entry × gate × eligibility), and the both-Growth protections of 5B's B cell do not apply.
//
// CANONICAL IDENTITY. A disabled Growth book carries Priority 3's placeholder vector (identity 1af5b55987a56e2f) and is
// never run or funded; `first` is always 'D1'. The identity is sha256 of the inclusion choice and Priority 3's canonical
// quad text, so inactive genes never create a second configuration. Priority 3's quadId is kept beside it.
//
// THE MAXIMUM HOLD. D1's `maximumHoldDays` (box 3–30, radius ±2, step 1) and Growth's `maximumHoldDays` (box 3–30, step
// 1, active with the hold ON) keep their numeric boxes and grids; under the study's search unit they are read as NYSE
// trading sessions (unit.ts), under 'cal' as calendar days.
import { createHash } from 'node:crypto';
import { Rng } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { type BookId, type D1Grid, bookIds, d1Keys } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import {
  type GConfig,
  type Genome as P3Genome,
  type Quad,
  type Resolution,
  activeGenes,
  catLevels as p3CatLevels,
  d1Box,
  d1Radius,
  decode as p3Decode,
  effectiveOf,
  encode as p3Encode,
  entryGene as p3EntryGene,
  fineStepOf,
  firstGene as p3FirstGene,
  gId,
  gateGene as p3GateGene,
  gStructOffset,
  levelsOf as p3LevelsOf,
  nCat as p3NCat,
  normalize,
  numericGenes,
  numLevels as p3NumLevels,
  quadCanonical,
  quadDistance,
  quadId,
  radiusValue,
  roundStep,
  structuralGenes,
  structureOf
} from '../vg-d1-growth-joint/space.ts';
import { perturb as gPerturb } from '../growth140-vgt-stable/space.ts';
import { type Sym, seedOf, symbols } from './context.ts';

export type { GConfig, Quad, Resolution };
export { d1Box, d1Radius, fineStepOf, numericGenes, radiusValue, roundStep, structureOf, quadId, gId };

// ----- the inclusion choice -----

export const incs = ['V', 'G', 'B'] as const;
export type Inc = (typeof incs)[number];
export const incLabel: Record<Inc, string> = {
  V: 'VGT Growth only',
  G: 'GDX Growth only',
  B: 'both Growth books'
};
export const growthOn = (inc: Inc, s: Sym) => inc === 'B' || (inc === 'V' ? s === 'VGT' : s === 'GDX');
export const enabledOf = (inc: Inc): BookId[] =>
  bookIds.filter((b) => b.startsWith('D1:') || growthOn(inc, b.slice(2) as Sym));
export const optionsOfInc = (inc: Inc): EvalOptions =>
  inc === 'B' ? {} : { enabled: { [inc === 'V' ? 'G:GDX' : 'G:VGT']: false } as Partial<Record<BookId, boolean>> };
export const incOfEnabled = (enabled: readonly BookId[]): Inc | null => {
  if (!enabled.includes('D1:GDX') || !enabled.includes('D1:VGT')) return null;

  const g = enabled.includes('G:GDX');
  const v = enabled.includes('G:VGT');

  return g && v ? 'B' : v ? 'V' : g ? 'G' : null;
};

// Priority 3's placeholder Growth vector (its controls' disabled books; identity 1af5b55987a56e2f).
export const placeholder: GConfig = effectiveOf({
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

if (gId(placeholder) !== '1af5b55987a56e2f') throw new Error(`the placeholder's identity is ${gId(placeholder)}`);

export interface Cfg {
  inc: Inc;
  quad: Quad; // canonical: disabled Growth book = placeholder, first = 'D1'
}

export const canonicalOf = (inc: Inc, q: Quad): Cfg => ({
  inc,
  quad: normalize({
    d1: { GDX: { ...q.d1.GDX }, VGT: { ...q.d1.VGT } },
    g: {
      GDX: growthOn(inc, 'GDX') ? q.g.GDX : placeholder,
      VGT: growthOn(inc, 'VGT') ? q.g.VGT : placeholder
    },
    first: 'D1'
  })
});

export const cfgCanonical = (c: Cfg) => `inc:${c.inc}#${quadCanonical(c.quad)}`;
export const cfgId = (c: Cfg) => createHash('sha256').update(cfgCanonical(c)).digest('hex').slice(0, 16);
export const optionsOf = (c: Cfg): EvalOptions => optionsOfInc(c.inc);
export const sameCfg = (a: Cfg, b: Cfg) => cfgId(a) === cfgId(b);

// ----- cells (the three protected Growth structures of the brief): V, G and B. D1·GDX and D1·VGT are enabled in all.
// Inside a cell the entry methods of the enabled Growth books are NOT pinned: Rise and breakout are protected by the
// screen strata (round-robin), by a reserved promotion share per entry pattern and by an "entry alternative" shortlist
// slot (search.ts), so the islands can evolve every gene of the structure. -----

export type Entry = 'rise' | 'breakout';
export const entries: Entry[] = ['rise', 'breakout'];
export type Sub = 'V1' | 'V2' | 'V3';
export interface CellKey {
  inc: Inc;
  sub?: Sub; // a lane's V sub-cell (its budget schedule); a configuration's own cell has none
}

// The study's structure (New L0's): V. The three independent sub-cells carry 5B's V, G and B schedules.
export const studyInc: Inc = 'V';
export const subs: readonly Sub[] = ['V1', 'V2', 'V3'];
export const cells: CellKey[] = subs.map((sub) => ({ inc: studyInc, sub }));
export const cellName = (c: CellKey) => c.sub ?? c.inc;
export const entryOf = (g: GConfig): Entry => (g.entryMethod === 'trend_breakout' ? 'breakout' : 'rise');
export const cellOf = (c: Cfg): CellKey => ({ inc: c.inc });

// The entry pattern of a configuration: each enabled Growth book's entry method (e.g. "GDX-rise/VGT-breakout").
export const entryPatternOf = (c: Cfg) =>
  symbols
    .filter((s) => growthOn(c.inc, s))
    .map((s) => `${s}-${entryOf(c.quad.g[s])}`)
    .join('/');
export const entryPatternsOf = (inc: Inc) => {
  const books = symbols.filter((s) => growthOn(inc, s));

  return books.reduce<string[]>(
    (acc, s) => acc.flatMap((p) => entries.map((e) => (p ? `${p}/` : '') + `${s}-${e}`)),
    ['']
  );
};

const onOff = (b: boolean) => (b ? 'on' : 'off');
const gateOf = (g: GConfig) => onOff(g.drawdownRecoveryGateEnabled === true);
const eligOf = (g: GConfig) => onOff(g.eligibilityEnabled === true);
const bookTag = (c: Cfg, s: Sym, f: (g: GConfig) => string) => (growthOn(c.inc, s) ? f(c.quad.g[s]) : '-');

// The structural class (coverage tables): per enabled Growth book its entry, gate, eligibility, exits and switches.
export const classOf = (c: Cfg) => {
  const ex = (g: GConfig) => {
    const s = structureOf(g);

    return `${s.exits === 'hold_off' ? 'hold-off' : 'hold-on'}${s.retain === 'on' ? '+retain' : ''}${s.istop === 'on' ? '+istop' : ''}`;
  };

  return {
    inc: c.inc,
    cell: cellName(cellOf(c)),
    entries: entryPatternOf(c),
    gates: `${bookTag(c, 'GDX', gateOf)}/${bookTag(c, 'VGT', gateOf)}`,
    elig: `${bookTag(c, 'GDX', eligOf)}/${bookTag(c, 'VGT', eligOf)}`,
    exits: `${bookTag(c, 'GDX', ex)}/${bookTag(c, 'VGT', ex)}`,
    trend: `${bookTag(c, 'GDX', (g) => structureOf(g).trend)}/${bookTag(c, 'VGT', (g) => structureOf(g).trend)}`,
    cont: `${bookTag(c, 'GDX', (g) => structureOf(g).cont)}/${bookTag(c, 'VGT', (g) => structureOf(g).cont)}`
  };
};

// The coverage key (structure, entries, gates, eligibility, exits) and the trigger key of the extension rule's "new
// feasible behaviour": a new funded-component pattern at the centre within the cell (which D1 and Growth books
// receive capital).
export const classKey = (c: Cfg) => {
  const k = classOf(c);

  return `${k.cell}|${k.entries}|gates ${k.gates}|elig ${k.elig}|exits ${k.exits}`;
};
export const triggerKey = (c: Cfg, funded: readonly string[]) =>
  `${cellName(cellOf(c))}|funded ${[...funded].sort().join('+')}`;

// ----- the genome -----

export type Genome = number[];
export const incGene = 0;
const off = 1; // Priority 3's genome starts at index 1
export const nCat = 1 + p3NCat; // 18
export const catLevels = [incs.length, ...p3CatLevels];
export const numLevels = (res: Resolution) => p3NumLevels(res);
export const levelsOf = (res: Resolution) => [incs.length, ...p3LevelsOf(res)];
export const firstGene = off + p3FirstGene;
export const entryGene: Record<Sym, number> = { GDX: off + p3EntryGene.GDX, VGT: off + p3EntryGene.VGT };
export const gateGene: Record<Sym, number> = { GDX: off + p3GateGene.GDX, VGT: off + p3GateGene.VGT };
const eligIndex = structuralGenes.findIndex((s) => s.key === 'elig');

export const eligGene: Record<Sym, number> = {
  GDX: off + gStructOffset.GDX + eligIndex,
  VGT: off + gStructOffset.VGT + eligIndex
};
export const d1GeneOffset: Record<Sym, number> = { GDX: nCat, VGT: nCat + d1Box.length };
export const gGeneOffset: Record<Sym, number> = {
  GDX: nCat + 2 * d1Box.length,
  VGT: nCat + 2 * d1Box.length + numericGenes.length
};

export const decode = (g: Genome, res: Resolution): Cfg => {
  const inc = incs[g[incGene]!];

  if (!inc) throw new Error(`inclusion gene ${g[incGene]}`);

  const rest = g.slice(off);

  rest[p3FirstGene] = 0; // D1 first (fixed)
  return canonicalOf(inc, p3Decode(rest, res));
};

// The genome of a configuration; `dormant` supplies the vector a disabled book keeps in the genome (an informed seed's
// real vector), otherwise the placeholder.
export const encode = (c: Cfg, res: Resolution, dormant?: Partial<Record<Sym, GConfig>>): Genome => {
  const q: Quad = {
    ...c.quad,
    g: {
      GDX: growthOn(c.inc, 'GDX') ? c.quad.g.GDX : (dormant?.GDX ?? c.quad.g.GDX),
      VGT: growthOn(c.inc, 'VGT') ? c.quad.g.VGT : (dormant?.VGT ?? c.quad.g.VGT)
    },
    first: 'D1'
  };

  return [incs.indexOf(c.inc), ...p3Encode(q, res)];
};

export const pinCell = (g: Genome, cell: CellKey) => {
  g[incGene] = incs.indexOf(cell.inc);
  g[firstGene] = 0;
  return g;
};

// The screen's protected strata inside a cell, per enabled Growth book (GDX first): its entry method, its recovery
// gate (off/on) and, for a Rise book, persistent eligibility (off/on: an "on" stratum keeps the quasi-random policy if
// it is one, otherwise takes policy 1 + (stratum round mod 5)) — six options per book:
//   rise·gate off·elig off, rise·off·on, rise·on·off, rise·on·on, breakout·gate off, breakout·gate on.
// Round-robin over the 6^(enabled Growth books) strata (V and G: 6; B: 36).
export const bookStrata = [
  { entry: 'rise', gate: false, elig: false },
  { entry: 'rise', gate: false, elig: true },
  { entry: 'rise', gate: true, elig: false },
  { entry: 'rise', gate: true, elig: true },
  { entry: 'breakout', gate: false, elig: false },
  { entry: 'breakout', gate: true, elig: false }
] as const;

export const strataOf = (cell: CellKey) => {
  const books = symbols.filter((s) => growthOn(cell.inc, s));

  return { books, count: bookStrata.length ** books.length };
};

export const pinStratum = (g: Genome, cell: CellKey, i: number) => {
  const { books, count } = strataOf(cell);
  let k = i % count;
  const round = Math.floor(i / count);

  for (const s of books) {
    const st = bookStrata[k % bookStrata.length]!;

    k = Math.floor(k / bookStrata.length);
    g[entryGene[s]] = st.entry === 'rise' ? 0 : 1;
    g[gateGene[s]] = st.gate ? 1 : 0;
    if (!st.elig) g[eligGene[s]] = 0;
    else if (g[eligGene[s]] === 0) g[eligGene[s]] = 1 + (round % 5);
  }
  return g;
};

// ----- quasi-random screens (Latin supercube of scrambled Sobol blocks, this study's seed namespace) -----

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

// ----- distance: normalized L∞ over the enabled books' active numeric coordinates; 1 across structures -----

export const cfgDistance = (a: Cfg, b: Cfg) => (a.inc !== b.inc ? 1 : quadDistance(a.quad, b.quad));

// ----- neighbourhoods (PROTOCOL.md §8) -----
//
// A family = n Latin-hypercube rows of u ∈ [−1, 1] over the 116 numeric columns (D1·GDX 8, D1·VGT 8, Growth·GDX 50,
// Growth·VGT 50; one column per input, common random numbers across a cutoff's centres). A neighbour moves every
// active numeric input of the scope's ENABLED books by u × scale × radius (D1: Study 8's N1 radius in grid units;
// Growth: 10% of the box in value units, rounded to the fine step), clipped to the box widened to include the centre;
// categorical inputs and the inclusion stay fixed; a disabled book is never moved (it is inert); duplicates of the
// centre or of earlier rows are dropped.

export type Scope = 'joint' | 'd1' | 'g' | 'vgt' | 'gdx';
export const scopeOf = (scope: Scope, inc: Inc) => {
  const d1 = { GDX: scope === 'joint' || scope === 'd1' || scope === 'gdx', VGT: scope !== 'g' && scope !== 'gdx' };

  if (scope === 'd1') d1.VGT = true;

  const g = {
    GDX: growthOn(inc, 'GDX') && (scope === 'joint' || scope === 'g' || scope === 'gdx'),
    VGT: growthOn(inc, 'VGT') && (scope === 'joint' || scope === 'g' || scope === 'vgt')
  };

  return { d1, g };
};

export interface NFamily {
  name: string;
  n: number;
  labels: (string | number)[];
  scope?: Scope;
  scale?: number;
}

const nD = d1Box.length;
const nG = numericGenes.length;
export const unitColumns = 2 * nD + 2 * nG; // 116
const unitCol = { d1: { GDX: 0, VGT: nD }, g: { GDX: 2 * nD, VGT: 2 * nD + nG } };
const unitCache = new Map<string, number[][]>();

export const unitsOf = (n: number, labels: (string | number)[]) => {
  const key = `${n}|${labels.join('|')}`;
  let units = unitCache.get(key);

  if (!units) {
    units = latinOffsets(n, unitColumns, new Rng(seedOf('nbhd', ...labels)));
    unitCache.set(key, units);
    if (unitCache.size > 256) unitCache.delete(unitCache.keys().next().value!);
  }

  return units;
};

export interface NeighbourPoint {
  cfg: Cfg;
  id: string;
  clipped: number;
}

const clip = (lo0: number, hi0: number, centre: number, v: number) => {
  const lo = Math.min(lo0, centre);
  const hi = Math.max(hi0, centre);

  return v < lo ? { v: lo, clipped: true } : v > hi ? { v: hi, clipped: true } : { v, clipped: false };
};

export const neighbourhood = (centre: Cfg, family: NFamily, units = unitsOf(family.n, family.labels)) => {
  const scope = scopeOf(family.scope ?? 'joint', centre.inc);
  const scale = family.scale ?? 1;
  const active = Object.fromEntries(
    symbols.map((s) => [
      s,
      numericGenes.map((gene, i) => [gene, i] as const).filter(([gene]) => gene.active(structureOf(centre.quad.g[s])))
    ])
  ) as Record<Sym, (readonly [(typeof numericGenes)[number], number])[]>;
  const seen = new Set<string>([cfgId(centre)]);
  const out: NeighbourPoint[] = [];

  for (const u of units) {
    let clipped = 0;
    const d1 = { GDX: { ...centre.quad.d1.GDX }, VGT: { ...centre.quad.d1.VGT } };
    const g = { GDX: { ...centre.quad.g.GDX }, VGT: { ...centre.quad.g.VGT } };

    for (const s of symbols) {
      if (scope.d1[s])
        d1Box.forEach((box, i) => {
          const c = clip(
            box.min,
            box.max,
            centre.quad.d1[s][box.key],
            centre.quad.d1[s][box.key] + Math.round(u[unitCol.d1[s] + i]! * scale * d1Radius[box.key])
          );

          d1[s][box.key] = c.v;
          if (c.clipped) clipped++;
        });

      if (scope.g[s])
        for (const [gene, i] of active[s]) {
          const p = gPerturb(gene, centre.quad.g[s][gene.key] as number, u[unitCol.g[s] + i]!, 'clip', scale);

          g[s][gene.key] = p.value;
          if (p.clipped) clipped++;
        }
    }

    let cfg: Cfg;

    try {
      cfg = canonicalOf(centre.inc, { d1, g, first: 'D1' });
    } catch {
      continue;
    }

    const id = cfgId(cfg);

    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ cfg, id, clipped });
  }

  return out;
};

// The number of active numeric inputs a scope moves (dimension disclosure).
export const activeInputs = (c: Cfg, scope: Scope = 'joint') => {
  const sc = scopeOf(scope, c.inc);
  let n = 0;

  for (const s of symbols) {
    if (sc.d1[s]) n += nD;
    if (sc.g[s]) n += numericGenes.filter((gene) => gene.active(structureOf(c.quad.g[s]))).length;
  }
  return n;
};

// ----- local moves (refinement): every active numeric input of the movable enabled books by ±R/2 and ±R, and every
// enabled optional Growth rule of each enabled Growth book switched OFF; `movable.inc` (the informed lanes only) adds
// the inclusion alternatives that keep a real vector (B → V, B → G; V/G → B with a supplied partner). The independent
// lanes keep their protected structure: a refinement move never changes the inclusion there. -----

export const movesOf = (
  c: Cfg,
  movable: { d1: boolean; g: boolean; inc: boolean } = { d1: true, g: true, inc: true },
  partners: Partial<Record<Sym, GConfig>> = {}
): Cfg[] => {
  const out: Cfg[] = [];
  const add = (inc: Inc, q: Quad) => {
    try {
      out.push(canonicalOf(inc, q));
    } catch {
      // an invalid move is not a move
    }
  };
  const q = c.quad;

  for (const s of symbols) {
    if (movable.d1)
      for (const box of d1Box)
        for (const f of [0.5, 1])
          for (const sign of [-1, 1]) {
            const v = q.d1[s][box.key] + sign * Math.max(1, Math.round(f * d1Radius[box.key]));

            if (v >= box.min && v <= box.max) add(c.inc, { ...q, d1: { ...q.d1, [s]: { ...q.d1[s], [box.key]: v } } });
          }

    if (!movable.g || !growthOn(c.inc, s)) continue;

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
          add(c.inc, { ...q, g: { ...q.g, [s]: { ...q.g[s], [gene.key]: v } } });
        }
    }

    const offKeys: [boolean, string][] = [
      [st.trend !== 'off', 'trendFilterEnabled'],
      [st.elig !== 'off', 'eligibilityEnabled'],
      [st.gate === 'on', 'drawdownRecoveryGateEnabled'],
      [st.istop === 'on', 'initialStopEnabled'],
      [st.retain === 'on', 'retentionEnabled'],
      [st.cont !== 'off', 'continuationEnabled'],
      [st.exits === 'hold_on_buffer_on', 'intradayLossBufferEnabled']
    ];

    for (const [on, key] of offKeys) if (on) add(c.inc, { ...q, g: { ...q.g, [s]: { ...q.g[s], [key]: false } } });
  }

  if (movable.g && movable.inc) {
    if (c.inc === 'B') {
      add('V', q);
      add('G', q);
    } else {
      const other: Sym = c.inc === 'V' ? 'GDX' : 'VGT';
      const partner = partners[other];

      if (partner) add('B', { ...q, g: { ...q.g, [other]: partner } });
    }
  }

  const self = cfgId(c);

  return [...new Map(out.map((m) => [cfgId(m), m])).values()].filter((m) => cfgId(m) !== self);
};

export const describeG = (g: GConfig) =>
  Object.entries(g)
    .filter(([k]) => k !== 'costBpsPerSide')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

export const describeCfg = (c: Cfg) =>
  [
    `inclusion ${c.inc} (${incLabel[c.inc]})`,
    ...symbols.map((s) => `D1·${s}[${d1Keys.map((k) => c.quad.d1[s][k]).join(',')}]`),
    ...symbols.filter((s) => growthOn(c.inc, s)).map((s) => `G·${s}{${describeG(c.quad.g[s])}}`)
  ].join(' ');

// Whether a D1 vector and a Growth vector sit exactly on the grids the search uses (incumbent representability).
export const onFineGrid = (c: Cfg) => {
  try {
    const back = decode(encode(c, 'fine'), 'fine');

    return cfgId(back) === cfgId(c);
  } catch {
    return false;
  }
};

export type { D1Grid, P3Genome };

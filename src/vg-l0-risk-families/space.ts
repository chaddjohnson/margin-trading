// The configuration space (PROTOCOL.md §6): the structural cells, the genome of one cell, canonical identity,
// distance, quasi-random screens, neighbourhoods and refinement moves.
//
// STRUCTURE. Each D1 book (D1·GDX, D1·VGT) takes one of 14 structures: family A (legacy: no protective stop, legacy
// calendar hold), B (protective stop, legacy hold), C (protective stop, hold disabled) or D (protective stop, adaptive
// progress-extended hold), × the decline gate OFF/ON, × for B/C/D the stop's activation (RC 2: next-session, entry-day).
// Code: family letter + gate digit + 'e' for entry-day (A0 … D1e). A portfolio CELL is a pair of book structures,
// `G<gdx>.V<vgt>`: 14 × 14 = 196 cells; the 64 BASE cells use next-session activation only (RC 1 mechanics); the 132
// ONSET cells contain at least one entry-day book. Growth·VGT is New L0's (frozen); Growth·GDX is disabled.
//
// GENOME (one cell; 28 ordinal genes, no categorical gene — the structure is pinned by the cell):
//   [D1·GDX 8][D1·VGT 8][GDX controls 6][VGT controls 6]
// D1 genes: Study 8's box and integer grid (X, Y, stop, buffer, P in tenths of a point; hold in calendar days; L, W in
// sessions) — NL0 uses this one grid at both resolutions. Control genes (one grid, the D1 convention):
//   d  protective-stop distance  30–250 tenths (3.0–25.0%), step 1
//   hx adaptive extended hold    6–60 calendar days, step 1; repaired to ≥ the book's hold + 3
//   g  adaptive progress         10–150 tenths (1.0–15.0%), step 1
//   k  gate losses K             1–4, step 1 (protected by the screen strata; fixed in neighbourhoods)
//   r  gate recovery             100–1000 tenths (10–100% of the decline), step 10 (1 point)
//   c  gate cooldown             5–250 sessions, step 1
// A gene is ACTIVE in a cell iff its book's structure uses it (d: B/C/D; hx, g: D; k, r, c: gate ON; the D1 hold and
// buffer are inactive under C). Inactive genes are pinned at index 0 (never varied, never perturbed) and masked in the
// identity (RC 1/RC 2 identities mask the hold and buffer under a disabled hold; an absent control has no gene).
//
// IDENTITY. cfgId = RC 2's riskId2 of the quad (the D1 pair + New L0's two Growth vectors) and the canonical controls:
// Priority 3's quadId for the legacy cell, "rc1-…" for an RC 1 configuration, "rc2-…" with an entry-day book. The
// controls determine the cell, so no two cells share an identity.
import { Rng } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import type { D1Grid } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { type Quad, d1Box, d1Radius } from '../vg-d1-growth-joint/space.ts';
import {
  type D1RiskControls2,
  type RiskConfig2,
  canonicalConfig2,
  riskEvalKey2,
  riskId2
} from '../d1-risk-controls-rc2/config.ts';
import { type Sym, seedOf, symbols } from './context.ts';
import { fixedGrowth } from './nl0.ts';

export type { D1Grid, Quad, RiskConfig2 };
export { d1Box, d1Radius };

// ----- structures and cells -----

export type Family = 'A' | 'B' | 'C' | 'D';
export const families: readonly Family[] = ['A', 'B', 'C', 'D'];
export interface BookStructure {
  family: Family;
  gate: boolean;
  entryDay: boolean; // B/C/D only
}

export const bookStructures: readonly BookStructure[] = families.flatMap((family) =>
  (family === 'A' ? [false] : [false, true]).flatMap((entryDay) =>
    [false, true].map((gate) => ({ family, gate, entryDay }))
  )
);
export const codeOf = (b: BookStructure) => `${b.family}${b.gate ? 1 : 0}${b.entryDay ? 'e' : ''}`;
export const structureOfCode = (code: string): BookStructure => {
  const b = bookStructures.find((x) => codeOf(x) === code);

  if (!b) throw new Error(`book structure ${code}`);
  return b;
};

export type CellId = string;
export interface Cell {
  id: CellId;
  GDX: BookStructure;
  VGT: BookStructure;
  base: boolean; // RC 1 mechanics (next-session activation everywhere): one of the 64 base cells
}

export const cellIdOf = (gdx: BookStructure, vgt: BookStructure) => `G${codeOf(gdx)}.V${codeOf(vgt)}`;
export const allCells: readonly Cell[] = bookStructures.flatMap((GDX) =>
  bookStructures.map((VGT) => ({ id: cellIdOf(GDX, VGT), GDX, VGT, base: !GDX.entryDay && !VGT.entryDay }))
);
export const baseCells = allCells.filter((c) => c.base);
export const onsetCells = allCells.filter((c) => !c.base);
export const legacyCellId = 'GA0.VA0';
export const cellOf = (id: CellId): Cell => {
  const c = allCells.find((x) => x.id === id);

  if (!c) throw new Error(`cell ${id}`);
  return c;
};

if (bookStructures.length !== 14 || allCells.length !== 196 || baseCells.length !== 64 || onsetCells.length !== 132)
  throw new Error('the cell design is not 14 × 14 = 196 (64 base + 132 onset)');

// The base counterpart of a cell (every entry-day book back to next-session): the activation study's pairing.
export const baseCounterpart = (c: Cell): CellId =>
  cellIdOf({ ...c.GDX, entryDay: false }, { ...c.VGT, entryDay: false });

// ----- the genome -----

export const controlKeys = ['d', 'hx', 'g', 'k', 'r', 'c'] as const;
export type ControlKey = (typeof controlKeys)[number];
export interface GeneBox {
  key: string;
  min: number;
  max: number;
  step: number;
  radius: number; // the neighbourhood radius in grid units (0: fixed in neighbourhoods)
}

export const controlBox: Record<ControlKey, GeneBox> = {
  d: { key: 'd', min: 30, max: 250, step: 1, radius: 10 },
  hx: { key: 'hx', min: 6, max: 60, step: 1, radius: 2 },
  g: { key: 'g', min: 10, max: 150, step: 1, radius: 10 },
  k: { key: 'k', min: 1, max: 4, step: 1, radius: 0 },
  r: { key: 'r', min: 100, max: 1000, step: 10, radius: 5 },
  c: { key: 'c', min: 5, max: 250, step: 1, radius: 10 }
};
export const adaptiveMargin = 3; // the extended hold exceeds the book's hold by at least 3 calendar days

const nD = d1Box.length; // 8
const nC = controlKeys.length; // 6
export const nGenes = 2 * nD + 2 * nC; // 28
export const d1Offset: Record<Sym, number> = { GDX: 0, VGT: nD };
export const ctlOffset: Record<Sym, number> = { GDX: 2 * nD, VGT: 2 * nD + nC };

export const genes: GeneBox[] = [
  ...d1Box.map((b) => ({ key: `GDX.${b.key}`, min: b.min, max: b.max, step: 1, radius: d1Radius[b.key] })),
  ...d1Box.map((b) => ({ key: `VGT.${b.key}`, min: b.min, max: b.max, step: 1, radius: d1Radius[b.key] })),
  ...controlKeys.map((k) => ({ ...controlBox[k], key: `GDX.${k}` })),
  ...controlKeys.map((k) => ({ ...controlBox[k], key: `VGT.${k}` }))
];
export const levels = genes.map((g) => Math.round((g.max - g.min) / g.step) + 1);
export const valueOf = (i: number, idx: number) => genes[i]!.min + idx * genes[i]!.step;
export const indexOf = (i: number, value: number) => {
  const idx = (value - genes[i]!.min) / genes[i]!.step;

  if (!Number.isInteger(idx) || idx < 0 || idx >= levels[i]!) throw new Error(`${genes[i]!.key} = ${value} is off its grid`);
  return idx;
};

export type Genome = number[];

const holdIndex = d1Box.findIndex((b) => b.key === 'maximumHoldDays');
const bufferIndex = d1Box.findIndex((b) => b.key === 'intradayLossBuffer');
const ctlIndex = (k: ControlKey) => controlKeys.indexOf(k);

// The active genes of a cell (genome indices).
export const activeGenes = (cell: Cell): number[] => {
  const out: number[] = [];

  for (const s of symbols) {
    const b = cell[s];

    for (let i = 0; i < nD; i++) if (!(b.family === 'C' && (i === holdIndex || i === bufferIndex))) out.push(d1Offset[s] + i);
    if (b.family !== 'A') out.push(ctlOffset[s] + ctlIndex('d'));
    if (b.family === 'D') out.push(ctlOffset[s] + ctlIndex('hx'), ctlOffset[s] + ctlIndex('g'));
    if (b.gate) out.push(ctlOffset[s] + ctlIndex('k'), ctlOffset[s] + ctlIndex('r'), ctlOffset[s] + ctlIndex('c'));
  }
  return out.sort((a, b) => a - b);
};
const activeCache = new Map<CellId, Set<number>>();
export const activeSet = (cell: Cell) => {
  let s = activeCache.get(cell.id);

  if (!s) activeCache.set(cell.id, (s = new Set(activeGenes(cell))));
  return s;
};

// ----- configurations -----

export interface Cfg {
  cell: CellId;
  d1: Record<Sym, D1Grid>;
  controls: RiskConfig2 | null; // canonical (null: the legacy cell)
}

const bookControls = (b: BookStructure, d1: D1Grid, v: (k: ControlKey) => number): D1RiskControls2 | undefined => {
  const c: D1RiskControls2 = {};

  if (b.family !== 'A')
    c.protectiveStop = { mode: 'on', stopDistanceTenths: v('d'), ...(b.entryDay ? { activation: 'entry-day' as const } : {}) };
  if (b.family === 'C') c.hold = { mode: 'disabled' };
  if (b.family === 'D')
    c.hold = {
      mode: 'adaptive',
      extendedHoldDays: Math.max(v('hx'), d1.maximumHoldDays + adaptiveMargin),
      progressTenths: v('g')
    };
  if (b.gate) c.declineGate = { mode: 'on', losses: v('k'), recoveryTenths: v('r'), maxBlockSessions: v('c') };
  return Object.keys(c).length ? c : undefined;
};

// Decodes a genome inside a cell: inactive genes are ignored (the D1 hold and buffer of a C book take their box minimum,
// behaviourally inert and masked in the identity); the adaptive bound is repaired to ≥ hold + 3.
export const decode = (g: Genome, cell: Cell): Cfg => {
  const active = activeSet(cell);
  const val = (i: number) => valueOf(i, active.has(i) ? g[i]! : 0);
  const d1 = {} as Record<Sym, D1Grid>;
  const books: RiskConfig2['books'] = {};

  for (const s of symbols) {
    d1[s] = Object.fromEntries(d1Box.map((b, i) => [b.key, val(d1Offset[s] + i)])) as unknown as D1Grid;

    const c = bookControls(cell[s], d1[s], (k) => val(ctlOffset[s] + ctlIndex(k)));

    if (c) books[`D1:${s}`] = c;
  }

  return { cell: cell.id, d1, controls: canonicalConfig2({ version: 2, books }) };
};

// The control values of a configuration's book (inactive: undefined).
export const controlValuesOf = (cfg: Cfg, s: Sym): Partial<Record<ControlKey, number>> => {
  const c = cfg.controls?.books[`D1:${s}`];
  const out: Partial<Record<ControlKey, number>> = {};

  if (c?.protectiveStop?.mode === 'on') out.d = c.protectiveStop.stopDistanceTenths;
  if (c?.hold?.mode === 'adaptive') {
    out.hx = c.hold.extendedHoldDays;
    out.g = c.hold.progressTenths;
  }
  if (c?.declineGate?.mode === 'on') {
    out.k = c.declineGate.losses;
    out.r = c.declineGate.recoveryTenths;
    out.c = c.declineGate.maxBlockSessions;
  }
  return out;
};

export const encode = (cfg: Cfg): Genome => {
  const cell = cellOf(cfg.cell);
  const active = activeSet(cell);
  const g: Genome = new Array<number>(nGenes).fill(0);

  for (const s of symbols) {
    d1Box.forEach((b, i) => {
      if (active.has(d1Offset[s] + i)) g[d1Offset[s] + i] = indexOf(d1Offset[s] + i, cfg.d1[s][b.key]);
    });

    const v = controlValuesOf(cfg, s);

    controlKeys.forEach((k, i) => {
      if (active.has(ctlOffset[s] + i)) g[ctlOffset[s] + i] = indexOf(ctlOffset[s] + i, v[k]!);
    });
  }
  return g;
};

// The structure a configuration's controls express (consistency with its cell).
export const cellOfControls = (controls: RiskConfig2 | null): CellId => {
  const of = (s: Sym): BookStructure => {
    const c = controls?.books[`D1:${s}`];
    const stop = c?.protectiveStop?.mode === 'on';
    const family: Family = !stop ? 'A' : c?.hold?.mode === 'disabled' ? 'C' : c?.hold?.mode === 'adaptive' ? 'D' : 'B';

    if (!stop && c?.hold && c.hold.mode !== 'legacy') throw new Error('a hold policy without the stop is outside the A–D families');
    return {
      family,
      gate: c?.declineGate?.mode === 'on',
      entryDay: stop && c?.protectiveStop?.mode === 'on' && c.protectiveStop.activation === 'entry-day'
    };
  };

  return cellIdOf(of('GDX'), of('VGT'));
};

export const quadOf = (cfg: Cfg): Quad => ({ d1: cfg.d1, g: fixedGrowth(), first: 'D1' });
export const cfgId = (cfg: Cfg) => riskId2(quadOf(cfg), cfg.controls);
export const evalKeyOf = (door: string, cfg: Cfg, o: EvalOptions) => riskEvalKey2(door, quadOf(cfg), o, cfg.controls);
export const canonicalCfg = (cfg: Cfg): Cfg => decode(encode(cfg), cellOf(cfg.cell));
export const sameCfg = (a: Cfg, b: Cfg) => cfgId(a) === cfgId(b);

export const describeCfg = (cfg: Cfg) =>
  `${cfg.cell} D1·GDX[${d1Box.map((b) => cfg.d1.GDX[b.key]).join(',')}] D1·VGT[${d1Box.map((b) => cfg.d1.VGT[b.key]).join(',')}] ${JSON.stringify(cfg.controls?.books ?? {})}`;

// ----- distance: normalized L∞ over the active genes of one cell; 1 across cells -----

export const cfgDistance = (a: Cfg, b: Cfg) => {
  if (a.cell !== b.cell) return 1;

  const ga = encode(a);
  const gb = encode(b);
  let d = 0;

  for (const i of activeSet(cellOf(a.cell))) d = Math.max(d, Math.abs(ga[i]! - gb[i]!) / Math.max(1, levels[i]! - 1));
  return d;
};

// ----- quasi-random screens (Latin supercube of scrambled Sobol blocks of ≤ 16 genes; NL0's construction) -----

export const screenGenomes = (n: number, ...labels: (string | number)[]): Genome[] => {
  const blocks: number[] = [];

  for (let left = nGenes; left > 0; left -= 16) blocks.push(Math.min(16, left));

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

// The screen's protected strata inside a cell: the gate's K of each gated book (GDX first) cycles fastest, so every K
// value (and every K pair) gets the same number of screened proposals; inactive genes are pinned at 0.
export const strataCount = (cell: Cell) => 4 ** symbols.filter((s) => cell[s].gate).length;
export const pinCell = (g: Genome, cell: Cell) => {
  const active = activeSet(cell);

  for (let i = 0; i < nGenes; i++) if (!active.has(i)) g[i] = 0;
  return g;
};
export const pinStratum = (g: Genome, cell: Cell, i: number) => {
  let t = i % strataCount(cell);

  for (const s of symbols)
    if (cell[s].gate) {
      g[ctlOffset[s] + ctlIndex('k')] = t % 4;
      t = Math.floor(t / 4);
    }
  return pinCell(g, cell);
};

// ----- neighbourhoods (PROTOCOL.md §8) -----
//
// A family = n Latin-hypercube rows of u ∈ [−1, 1] over the 28 gene columns (one column per gene; common random numbers
// across a cutoff's centres). A neighbour moves every ACTIVE gene of the scope with a radius by round(u × scale ×
// radius) grid units, clipped to the box (widened to include the centre); K and inactive genes never move; the adaptive
// bound is repaired (≥ hold + 3); duplicates of the centre or of earlier rows are dropped.

export type Scope = 'joint' | 'gdx' | 'vgt' | 'd1' | 'controls';
const inScope = (i: number, scope: Scope) => {
  const sym: Sym = i < nD || (i >= ctlOffset.GDX && i < ctlOffset.VGT) ? 'GDX' : 'VGT';
  const isD1 = i < 2 * nD;

  return scope === 'joint' || (scope === 'gdx' && sym === 'GDX') || (scope === 'vgt' && sym === 'VGT') || (scope === 'd1' && isD1) || (scope === 'controls' && !isD1);
};

export interface NFamily {
  name: string;
  n: number;
  labels: (string | number)[];
  scope?: Scope;
  scale?: number;
}

const unitCache = new Map<string, number[][]>();

export const unitsOf = (n: number, labels: (string | number)[]) => {
  const key = `${n}|${labels.join('|')}`;
  let units = unitCache.get(key);

  if (!units) {
    units = latinOffsets(n, nGenes, new Rng(seedOf('nbhd', ...labels)));
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

export const neighbourhood = (centre: Cfg, family: NFamily, units = unitsOf(family.n, family.labels)): NeighbourPoint[] => {
  const cell = cellOf(centre.cell);
  const scope = family.scope ?? 'joint';
  const scale = family.scale ?? 1;
  const g0 = encode(centre);
  const moving = [...activeSet(cell)].filter((i) => genes[i]!.radius > 0 && inScope(i, scope));
  const seen = new Set<string>([cfgId(centre)]);
  const out: NeighbourPoint[] = [];

  for (const u of units) {
    const g = [...g0];
    let clipped = 0;

    for (const i of moving) {
      const v = g0[i]! + Math.round(u[i]! * scale * genes[i]!.radius);
      const lo = Math.min(0, g0[i]!);
      const hi = Math.max(levels[i]! - 1, g0[i]!);

      g[i] = v < lo ? lo : v > hi ? hi : v;
      if (v < lo || v > hi) clipped++;
    }

    const cfg = decode(g, cell);
    const id = cfgId(cfg);

    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ cfg, id, clipped });
  }

  return out;
};

export const activeInputs = (cfg: Cfg, scope: Scope = 'joint') =>
  [...activeSet(cellOf(cfg.cell))].filter((i) => inScope(i, scope)).length;

// ----- refinement moves: every active gene with a radius by ±R/2 and ±R grid units (NL0's moves), and K ± 1 of a gated
// book (K has no neighbourhood radius); the structure never moves (the cell is fixed); repaired and de-duplicated -----

export const movesOf = (c: Cfg): Cfg[] => {
  const cell = cellOf(c.cell);
  const g0 = encode(c);
  const out = new Map<string, Cfg>();
  const self = cfgId(c);
  const add = (g: Genome) => {
    const m = decode(g, cell);
    const id = cfgId(m);

    if (id !== self && !out.has(id)) out.set(id, m);
  };

  for (const i of activeSet(cell)) {
    const R = genes[i]!.radius;
    const steps = R > 0 ? [0.5, 1].map((f) => Math.max(1, Math.round(f * R))) : [1];

    for (const step of [...new Set(steps)])
      for (const sign of [-1, 1]) {
        const v = g0[i]! + sign * step;

        if (v < 0 || v >= levels[i]!) continue;

        const g = [...g0];

        g[i] = v;
        add(g);
      }
  }

  return [...out.values()];
};

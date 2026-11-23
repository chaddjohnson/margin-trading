// The search spaces of the two arms (RULE_SPECIFICATION.md §6; PROTOCOL.md §5), as SpaceDef objects that this study's
// lane (search.ts, derived mechanically from Stage B's lane) reads through `this.sp`:
//
//   ctrlSpace  Assignment 3's space (src/vg-l0-full-joint/space.ts) — the very functions, unchanged: a CTRL lane is
//              Stage B's CTRL lane (gate R: the sealed lanes reproduce);
//   expSpace   the same 92 genes plus the S1 staged stop: 3 categorical switches (D1·GDX, D1·VGT, Growth·VGT) and 6
//              ordinal genes (activation a, stage-2 distance t2 per book; tenths of a point; coarse step 5, fine step 1).
//
// EXP GENOME: [A3 categorical 0–13][switches 14–16][A3 ordinal → 17–94][a, t2 of GDX, VGT, G → 95–100]. An EXP
// configuration is Assignment 3's Cfg plus `staged` (absent when every switch is OFF: then it IS the CTRL configuration —
// the same object shape, identity, key and neighbourhood). Every decode, perturbation and move repairs the staged genes
// against the configuration's own τ₁ (t2 ≤ t1 − 5, then a ≥ aMin(t1); src/staged-stop/config.ts repairBook).
//
// Shared genes keep CTRL's random numbers: the screen's 92 genes are Assignment 3's screen; the neighbourhood's 78
// columns are Assignment 3's Latin rows; only the staged genes draw from this study's own streams. Each screen holds
// every ON/OFF pattern of the three switches equally often (a seeded balanced permutation). Informed lanes use a
// restricted space (restrictedSpace): the genes outside the lane's free set are held at the centre's values.
import { Rng } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { d1Box, d1Radius } from '../vg-d1-growth-joint/space.ts';
import { perturb as gPerturb } from '../growth140-vgt-stable/space.ts';
import * as A3 from '../vg-l0-full-joint/space.ts';
import {
  type Cell,
  type Cfg,
  type CtlValues,
  type NFamily,
  type NeighbourPoint,
  type PairId,
  type Resolution,
  type Scope,
  cellOf,
  cfgOf,
  controlBox,
  controlKeys,
  controlValuesOf,
  ctlIndex,
  ctlOffset,
  d1Offset,
  entryDayOf,
  numericGenes,
  protectedFamily,
  structureOf,
  unitsOf
} from '../vg-l0-full-joint/space.ts';
import { symbols } from '../vg-l0-full-joint/context.ts';
import { maxMoves as a3MaxMoves } from '../vg-l0-full-joint/budgets.ts';
import {
  type StagedBook,
  type StagedBookConfig,
  type StagedConfig,
  canonicalStaged,
  repairBook,
  stagedBooks,
  stagedId,
  stagedLimits,
  tau1TenthsOfD1,
  tau1TenthsOfGrowth
} from '../staged-stop/config.ts';
import { seedOf } from './context.ts';

export type { Cell, Cfg, PairId, Resolution };
export type PCfg = Cfg & { staged?: StagedConfig | null };

export interface SpaceDef {
  name: string;
  nCat: number;
  nGenes: number;
  maxMoves: number;
  levelsOf: (res: Resolution) => number[];
  decode: (g: readonly number[], res: Resolution) => PCfg;
  encode: (c: PCfg, res: Resolution, dormant?: readonly number[]) => number[];
  cfgId: (c: PCfg) => string;
  cfgDistance: (a: PCfg, b: PCfg) => number;
  classKeyOf: (c: PCfg) => string;
  controlPatternOf: (c: PCfg) => string;
  activeOrdinal: (c: PCfg) => number[];
  neighbourhood: (c: PCfg, fam: NFamily, units?: number[][]) => (NeighbourPoint & { cfg: PCfg })[];
  movesOf: (c: PCfg, o?: { gateSwitches?: boolean }) => PCfg[];
  screenGenomes: (n: number, res: Resolution, ...labels: (string | number)[]) => number[][];
  pinStratum: (g: number[], cell: Cell, i: number, n: number) => number[];
  pinCell: (g: number[], cell: Cell) => number[];
  pinnedOfCell: (cell: Cell) => Set<number>;
  pinPair: (g: number[], p: PairId) => number[];
  pinnedOfPair: (p: PairId) => Set<number>;
}

// ----- CTRL: Assignment 3, the very functions -----

export const ctrlSpace: SpaceDef = {
  name: 'ctrl (Assignment 3)',
  nCat: A3.nCat,
  nGenes: A3.nGenes,
  maxMoves: a3MaxMoves,
  levelsOf: A3.levelsOf,
  decode: A3.decode,
  encode: A3.encode,
  cfgId: A3.cfgId,
  cfgDistance: A3.cfgDistance,
  classKeyOf: A3.classKeyOf,
  controlPatternOf: A3.controlPatternOf,
  activeOrdinal: A3.activeOrdinal,
  neighbourhood: A3.neighbourhood,
  movesOf: A3.movesOf,
  screenGenomes: A3.screenGenomes,
  pinStratum: A3.pinStratum,
  pinCell: A3.pinCell,
  pinnedOfCell: A3.pinnedOfCell,
  pinPair: A3.pinPair,
  pinnedOfPair: A3.pinnedOfPair
};

// ----- the staged genes -----

export const stagedSlots: readonly { book: StagedBook; sym: 'GDX' | 'VGT' | 'G' }[] = [
  { book: 'D1:GDX', sym: 'GDX' },
  { book: 'D1:VGT', sym: 'VGT' },
  { book: 'G:VGT', sym: 'G' }
];
const A3_CAT = A3.nCat; // 14
const N_SW = 3;
export const EXP_CAT = A3_CAT + N_SW; // 17
const A3_ORD = A3.nGenes - A3.nCat; // 78
const ST_ORD0 = EXP_CAT + A3_ORD; // 95
export const EXP_GENES = ST_ORD0 + 2 * N_SW; // 101
export const switchGene = (j: number) => A3_CAT + j;
export const actGeneOf = (j: number) => ST_ORD0 + 2 * j;
export const t2GeneOf = (j: number) => ST_ORD0 + 2 * j + 1;
// an Assignment 3 genome index → the EXP index
export const expIndexOf = (i: number) => (i < A3_CAT ? i : i + N_SW);

const stepOf = (res: Resolution) => (res === 'coarse' ? 5 : 1);
const levelsOfBox = (box: { min: number; max: number }, res: Resolution) =>
  Math.round((box.max - box.min) / stepOf(res)) + 1;
const actBox = stagedLimits.activation;
const t2Box = stagedLimits.stage2;
const valueAt = (box: { min: number }, idx: number, res: Resolution) => box.min + idx * stepOf(res);
const indexOfValue = (box: { min: number; max: number }, v: number, res: Resolution) =>
  Math.min(levelsOfBox(box, res) - 1, Math.max(0, Math.round((v - box.min) / stepOf(res))));
const midLevel = (box: { min: number; max: number }, res: Resolution) => Math.floor((levelsOfBox(box, res) - 1) / 2);

export const toA3 = (g: readonly number[]) => [...g.slice(0, A3_CAT), ...g.slice(EXP_CAT, ST_ORD0)];
const fromA3 = (a3: readonly number[], sw: readonly number[], ords: readonly number[]) => [
  ...a3.slice(0, A3_CAT),
  ...sw,
  ...a3.slice(A3_CAT),
  ...ords
];

export const tau1OfCfg = (c: Cfg): Record<StagedBook, number> => ({
  'D1:GDX': tau1TenthsOfD1(c.d1.GDX.trailingStopPercentage),
  'D1:VGT': tau1TenthsOfD1(c.d1.VGT.trailingStopPercentage),
  'G:VGT': tau1TenthsOfGrowth(c.g.trailingStopPercent as number)
});

export const stagedOf = (c: PCfg) => canonicalStaged(c.staged);
export const baseOf = (c: PCfg): Cfg => {
  if (!('staged' in c)) return c;

  const { staged: _s, ...b } = c;

  return b as Cfg;
};
// the configuration with its staged stop (OFF: the base object itself, no `staged` key)
export const withStaged = (base: Cfg, st: StagedConfig | null): PCfg => (st ? { ...base, staged: st } : base);

// repair every ON book against the base configuration's τ₁ (deterministic); null when no book is ON
export const repairStaged = (base: Cfg, st: StagedConfig | null): { st: StagedConfig | null; repaired: number } => {
  const c = canonicalStaged(st);

  if (!c) return { st: null, repaired: 0 };

  const t1 = tau1OfCfg(base);
  const books: StagedConfig['books'] = {};
  let repaired = 0;

  for (const b of stagedBooks) {
    const x = c.books[b];

    if (!x) continue;

    const r = repairBook(x, t1[b]);

    books[b] = r.value;
    if (r.repaired) repaired++;
  }
  return { st: { version: 1, books }, repaired };
};

export const stagedPatternOf = (c: PCfg) => {
  const st = stagedOf(c);
  const on = stagedSlots.filter((s) => st?.books[s.book]).map((s) => s.sym);

  return on.length ? on.join('+') : 'off';
};

const decodeStaged = (g: readonly number[], res: Resolution, base: Cfg): StagedConfig | null => {
  const books: StagedConfig['books'] = {};

  stagedSlots.forEach((s, j) => {
    if (g[switchGene(j)] !== 1) return;
    books[s.book] = {
      activationTenths: valueAt(actBox, g[actGeneOf(j)]!, res),
      stage2Tenths: valueAt(t2Box, g[t2GeneOf(j)]!, res)
    };
  });
  return repairStaged(base, Object.keys(books).length ? { version: 1, books } : null).st;
};

// ----- the neighbourhood of an EXP configuration with some book ON (Assignment 3's construction, its 78 columns and
// rows unchanged, plus the staged columns from this study's stream). A configuration with every book OFF uses Assignment
// 3's neighbourhood itself. The base part below is Assignment 3's neighbourhood loop statement for statement (a test
// compares it with Assignment 3's on every scope and scale). -----

const holdIndex = d1Box.findIndex((b) => b.key === 'maximumHoldDays');
const bufferIndex = d1Box.findIndex((b) => b.key === 'intradayLossBuffer');
const nD = d1Box.length;
const nC = controlKeys.length;
const ctlLevels = controlKeys.map((k) => Math.round((controlBox[k].max - controlBox[k].min) / controlBox[k].step) + 1);
const ctlValue = (k: (typeof controlKeys)[number], idx: number) => controlBox[k].min + idx * controlBox[k].step;
const ctlIdx = (k: (typeof controlKeys)[number], value: number) => {
  const idx = (value - controlBox[k].min) / controlBox[k].step;

  if (!Number.isInteger(idx) || idx < 0 || idx >= ctlLevels[ctlIndex(k)]!)
    throw new Error(`${k} = ${value} is off its grid`);
  return idx;
};
const d1Active = (s: 'GDX' | 'VGT', b: Cell['GDX']) => {
  const out: number[] = [];

  for (let i = 0; i < nD; i++)
    if (!(b.family === 'C' && (i === holdIndex || i === bufferIndex))) out.push(d1Offset[s] + i);
  return out;
};
const ctlActive = (s: 'GDX' | 'VGT', b: Cell['GDX']) => {
  const out: number[] = [];

  if (b.family !== 'A') out.push(ctlOffset[s] + ctlIndex('d'));
  if (b.family === 'D') out.push(ctlOffset[s] + ctlIndex('hx'), ctlOffset[s] + ctlIndex('g'));
  if (b.gate) out.push(ctlOffset[s] + ctlIndex('k'), ctlOffset[s] + ctlIndex('r'), ctlOffset[s] + ctlIndex('c'));
  return out;
};
const unitCol = { d1: { GDX: 0, VGT: nD }, ctl: { GDX: 2 * nD, VGT: 2 * nD + nC }, g: 2 * nD + 2 * nC };
const clipInt = (lo0: number, hi0: number, centre: number, v: number) => {
  const lo = Math.min(lo0, centre);
  const hi = Math.max(hi0, centre);

  return v < lo ? { v: lo, clipped: true } : v > hi ? { v: hi, clipped: true } : { v, clipped: false };
};

// one row of Assignment 3's neighbourhood: the perturbed base configuration (null: invalid) and its clip count
export const baseRow = (
  centre: Cfg,
  u: readonly number[],
  scope: Scope,
  scale: number
): { cfg: Cfg; clipped: number } | null => {
  const cell = cellOf(centre.cell);
  const moveD1 = scope === 'joint' || scope === 'd1';
  const moveCtl = scope === 'joint' || scope === 'controls';
  const moveG = scope === 'joint' || scope === 'growth';
  const st = structureOf(centre.g);
  const gActive = numericGenes.map((gene, i) => [gene, i] as const).filter(([gene]) => gene.active(st));
  const v0 = { GDX: controlValuesOf(centre, 'GDX'), VGT: controlValuesOf(centre, 'VGT') };
  const act = { GDX: entryDayOf(centre, 'GDX'), VGT: entryDayOf(centre, 'VGT') };
  let clipped = 0;
  const d1 = { GDX: { ...centre.d1.GDX }, VGT: { ...centre.d1.VGT } };
  const ctl: Record<'GDX' | 'VGT', CtlValues> = { GDX: { ...v0.GDX }, VGT: { ...v0.VGT } };
  const g = { ...centre.g };

  for (const s of symbols) {
    if (moveD1)
      for (const i of d1Active(s, cell[s])) {
        const k = i - d1Offset[s];
        const box = d1Box[k]!;
        const c = clipInt(
          box.min,
          box.max,
          centre.d1[s][box.key],
          centre.d1[s][box.key] + Math.round(u[unitCol.d1[s] + k]! * scale * d1Radius[box.key])
        );

        d1[s][box.key] = c.v;
        if (c.clipped) clipped++;
      }

    if (moveCtl)
      for (const i of ctlActive(s, cell[s])) {
        const j = i - ctlOffset[s];
        const key = controlKeys[j]!;
        const box = controlBox[key];

        if (box.radius === 0) continue;

        const idx0 = ctlIdx(key, v0[s][key]!);
        const c = clipInt(0, ctlLevels[j]! - 1, idx0, idx0 + Math.round(u[unitCol.ctl[s] + j]! * scale * box.radius));

        ctl[s][key] = ctlValue(key, c.v);
        if (c.clipped) clipped++;
      }
  }

  if (moveG)
    for (const [gene, i] of gActive) {
      const p = gPerturb(gene, centre.g[gene.key] as number, u[unitCol.g + i]!, 'clip', scale);

      g[gene.key] = p.value;
      if (p.clipped) clipped++;
    }

  try {
    return { cfg: cfgOf(cell, d1, ctl, act, g), clipped };
  } catch {
    return null;
  }
};

// the staged columns: 6 Latin columns (a, t2 per book) from this study's stream, keyed by the family's labels
const stagedUnitCache = new Map<string, number[][]>();
export const stagedUnitsOf = (n: number, labels: (string | number)[]) => {
  const key = `${n}|${labels.join('|')}`;
  let units = stagedUnitCache.get(key);

  if (!units) {
    units = latinOffsets(n, 2 * N_SW, new Rng(seedOf('nbhd-staged', ...labels)));
    stagedUnitCache.set(key, units);
    if (stagedUnitCache.size > 256) stagedUnitCache.delete(stagedUnitCache.keys().next().value!);
  }
  return units;
};
export const stagedRadius = { activation: 20, stage2: 5 } as const;

const expNeighbourhood = (centre: PCfg, family: NFamily, units?: number[][]): (NeighbourPoint & { cfg: PCfg })[] => {
  const st = stagedOf(centre);

  if (!st) return A3.neighbourhood(baseOf(centre), family, units);

  const base = baseOf(centre);
  const rows = units ?? unitsOf(family.n, family.labels);
  const srows = stagedUnitsOf(rows.length, family.labels);
  const scope = family.scope ?? 'joint';
  const scale = family.scale ?? 1;
  const moveSt = scope === 'joint';
  const seen = new Set<string>([expSpace.cfgId(centre)]);
  const out: (NeighbourPoint & { cfg: PCfg })[] = [];

  rows.forEach((u, r) => {
    const b = baseRow(base, u, scope, scale);

    if (!b) return;

    let clipped = b.clipped;
    const books: StagedConfig['books'] = {};

    stagedSlots.forEach((s, j) => {
      const x = st.books[s.book];

      if (!x) return;
      if (!moveSt) {
        books[s.book] = { ...x };
        return;
      }

      const a = clipInt(
        actBox.min,
        actBox.max,
        x.activationTenths,
        x.activationTenths + Math.round(srows[r]![2 * j]! * scale * stagedRadius.activation)
      );
      const t = clipInt(
        t2Box.min,
        t2Box.max,
        x.stage2Tenths,
        x.stage2Tenths + Math.round(srows[r]![2 * j + 1]! * scale * stagedRadius.stage2)
      );

      if (a.clipped) clipped++;
      if (t.clipped) clipped++;
      books[s.book] = { activationTenths: a.v, stage2Tenths: t.v };
    });

    const cfg = withStaged(b.cfg, repairStaged(b.cfg, { version: 1, books }).st);
    const id = expSpace.cfgId(cfg);

    if (seen.has(id)) return;
    seen.add(id);
    out.push({ cfg, id, clipped });
  });

  return out;
};

// ----- refinement moves: Assignment 3's moves of the base (staged genes kept, repaired), each ON book's a ± {10, 20}
// and t2 ± {3, 5} (Assignment 3's max(1, round(f × R)), f ∈ {½, 1}), and each ON book switched OFF -----

const steps = (R: number) => [...new Set([0.5, 1].map((f) => Math.max(1, Math.round(f * R))))];
export const expMaxMoves = a3MaxMoves + N_SW * (2 * 4) + N_SW; // 230 + 24 + 3 = 257

const expMovesOf = (c: PCfg, o: { gateSwitches?: boolean } = {}): PCfg[] => {
  const st = stagedOf(c);

  if (!st) return A3.movesOf(baseOf(c), o);

  const base = baseOf(c);
  const self = expSpace.cfgId(c);
  const out = new Map<string, PCfg>();
  const add = (m: PCfg) => {
    const id = expSpace.cfgId(m);

    if (id !== self && !out.has(id)) out.set(id, m);
  };

  for (const m of A3.movesOf(base, o)) add(withStaged(m, repairStaged(m, st).st));
  stagedSlots.forEach((s) => {
    const x = st.books[s.book];

    if (!x) return;
    for (const step of steps(stagedRadius.activation))
      for (const sign of [-1, 1]) {
        const v = x.activationTenths + sign * step;

        if (v >= actBox.min && v <= actBox.max)
          add(
            withStaged(
              base,
              repairStaged(base, { version: 1, books: { ...st.books, [s.book]: { ...x, activationTenths: v } } }).st
            )
          );
      }
    for (const step of steps(stagedRadius.stage2))
      for (const sign of [-1, 1]) {
        const v = x.stage2Tenths + sign * step;

        if (v >= t2Box.min && v <= t2Box.max)
          add(
            withStaged(
              base,
              repairStaged(base, { version: 1, books: { ...st.books, [s.book]: { ...x, stage2Tenths: v } } }).st
            )
          );
      }
  });
  for (const s of stagedSlots) {
    if (!st.books[s.book]) continue;

    const books = { ...st.books };

    delete books[s.book];
    add(withStaged(base, canonicalStaged({ version: 1, books })));
  }
  return [...out.values()];
};

// ----- screens: Assignment 3's screen for the 92 shared genes; the switches from a seeded balanced pattern sequence
// (every ON/OFF pattern equally often); the 6 staged ordinals from this study's scrambled Sobol stream -----

export const balancedPatterns = (n: number, ...labels: (string | number)[]) => {
  const rng = new Rng(seedOf('staged-patterns', ...labels));
  const seq: number[] = [];

  for (let c = 0; c < Math.floor(n / 8); c++) seq.push(0, 1, 2, 3, 4, 5, 6, 7);

  const tail = [0, 1, 2, 3, 4, 5, 6, 7];

  for (let i = tail.length - 1; i > 0; i--) {
    const k = rng.int(i + 1);

    [tail[i], tail[k]] = [tail[k]!, tail[i]!];
  }
  seq.push(...tail.slice(0, n % 8));
  for (let i = seq.length - 1; i > 0; i--) {
    const k = rng.int(i + 1);

    [seq[i], seq[k]] = [seq[k]!, seq[i]!];
  }
  return seq;
};

const expScreen = (n: number, res: Resolution, ...labels: (string | number)[]): number[][] => {
  const a3 = A3.screenGenomes(n, res, ...labels);
  const patterns = balancedPatterns(n, ...labels);
  const sobol = new Sobol({ dimensions: 2 * N_SW, scramble: { seed: seedOf('staged-screen', ...labels) } });
  const al = levelsOfBox(actBox, res);
  const tl = levelsOfBox(t2Box, res);

  return a3.map((g, i) => {
    const u = sobol.next();
    const sw = [0, 1, 2].map((j) => (patterns[i]! >> j) & 1);
    const ords = [0, 1, 2].flatMap((j) => [
      Math.min(al - 1, Math.floor(u[2 * j]! * al)),
      Math.min(tl - 1, Math.floor(u[2 * j + 1]! * tl))
    ]);

    return fromA3(g, sw, ords);
  });
};

const mapSet = (s: Set<number>) => new Set([...s].map(expIndexOf));
const onA3 = (g: number[], f: (a: number[]) => number[]) => {
  const a = f(toA3(g));

  for (let i = 0; i < A3_CAT; i++) g[i] = a[i]!;
  for (let i = A3_CAT; i < a.length; i++) g[i + N_SW] = a[i]!;
  return g;
};

export const expSpace: SpaceDef = {
  name: 'exp (Assignment 3 + staged-stop@1)',
  nCat: EXP_CAT,
  nGenes: EXP_GENES,
  maxMoves: expMaxMoves,
  levelsOf: (res) => {
    const a3 = A3.levelsOf(res);
    const al = levelsOfBox(actBox, res);
    const tl = levelsOfBox(t2Box, res);

    return fromA3(a3, [2, 2, 2], [al, tl, al, tl, al, tl]);
  },
  decode: (g, res) => {
    const base = A3.decode(toA3(g), res);

    return withStaged(base, decodeStaged(g, res, base));
  },
  encode: (c, res, dormant) => {
    const a3 = A3.encode(baseOf(c), res, dormant ? toA3(dormant) : undefined);
    const st = stagedOf(c);
    const sw: number[] = [];
    const ords: number[] = [];

    stagedSlots.forEach((s, j) => {
      const x = st?.books[s.book];

      sw.push(x ? 1 : 0);
      ords.push(
        x ? indexOfValue(actBox, x.activationTenths, res) : (dormant?.[actGeneOf(j)] ?? midLevel(actBox, res)),
        x ? indexOfValue(t2Box, x.stage2Tenths, res) : (dormant?.[t2GeneOf(j)] ?? midLevel(t2Box, res))
      );
    });
    return fromA3(a3, sw, ords);
  },
  cfgId: (c) => stagedId(A3.cfgId(baseOf(c)), stagedOf(c)),
  cfgDistance: (a, b) => {
    if (stagedPatternOf(a) !== stagedPatternOf(b)) return 1;

    let d = A3.cfgDistance(baseOf(a), baseOf(b));

    if (d >= 1) return 1;

    const sa = stagedOf(a);
    const sb = stagedOf(b);

    for (const s of stagedSlots) {
      const x = sa?.books[s.book];
      const y = sb?.books[s.book];

      if (!x || !y) continue;
      d = Math.max(
        d,
        Math.abs(x.activationTenths - y.activationTenths) / (actBox.max - actBox.min),
        Math.abs(x.stage2Tenths - y.stage2Tenths) / (t2Box.max - t2Box.min)
      );
    }
    return d;
  },
  classKeyOf: (c) => `${A3.classKeyOf(baseOf(c))}|st:${stagedPatternOf(c)}`,
  controlPatternOf: (c) => [A3.controlPatternOf(baseOf(c)), `st:${stagedPatternOf(c)}`].filter(Boolean).join('|'),
  activeOrdinal: (c) => {
    const st = stagedOf(c);
    const out = A3.activeOrdinal(baseOf(c)).map(expIndexOf);

    stagedSlots.forEach((s, j) => {
      if (st?.books[s.book]) out.push(actGeneOf(j), t2GeneOf(j));
    });
    return out.sort((a, b) => a - b);
  },
  neighbourhood: (c, fam, units) => expNeighbourhood(c, fam, units),
  movesOf: (c, o) => expMovesOf(c, o),
  screenGenomes: expScreen,
  pinStratum: (g, cell, i, n) => onA3(g, (a) => A3.pinStratum(a, cell, i, n)),
  pinCell: (g, cell) => onA3(g, (a) => A3.pinCell(a, cell)),
  pinnedOfCell: (cell) => mapSet(A3.pinnedOfCell(cell)),
  pinPair: (g, p) => onA3(g, (a) => A3.pinPair(a, p)),
  pinnedOfPair: (p) => mapSet(A3.pinnedOfPair(p))
};

// ----- informed lanes: a restricted space around a fixed centre (PROTOCOL.md §5.3). The genes outside `free` are held
// at the centre genome's values: pins restore them, neighbourhoods and moves are projected onto the free genes
// (encode → pin → decode, with the base space's repairs) and de-duplicated. The lane runs as an `informed` lane on the
// centre's family pair; its gate genes are pinned unless free. -----

export const restrictedSpace = (
  sp: SpaceDef,
  centre: PCfg,
  free: ReadonlySet<number>,
  res: Resolution,
  name: string
): SpaceDef => {
  const g0 = sp.encode(centre, res);
  const pinned = new Set<number>();

  for (let i = 0; i < sp.nGenes; i++) if (!free.has(i)) pinned.add(i);

  const pin = (g: number[]) => {
    for (const i of pinned) g[i] = g0[i]!;
    return g;
  };
  const project = (c: PCfg): PCfg | null => {
    try {
      return sp.decode(pin(sp.encode(c, res, g0)), res);
    } catch {
      return null;
    }
  };
  const dedupe = <T extends { cfg: PCfg }>(xs: T[], self: string) => {
    const seen = new Set<string>([self]);
    const out: (T & { id: string })[] = [];

    for (const x of xs) {
      const id = sp.cfgId(x.cfg);

      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ ...x, id });
    }
    return out;
  };

  return {
    ...sp,
    name: `${sp.name}, restricted: ${name}`,
    neighbourhood: (c, fam, units) =>
      dedupe(
        sp
          .neighbourhood(c, fam, units)
          .map((p) => ({ ...p, cfg: project(p.cfg) }))
          .filter((p): p is typeof p & { cfg: PCfg } => p.cfg !== null),
        sp.cfgId(c)
      ),
    movesOf: (c, o) =>
      dedupe(
        sp
          .movesOf(c, o)
          .map((m) => ({ cfg: project(m) }))
          .filter((p): p is { cfg: PCfg } => p.cfg !== null),
        sp.cfgId(c)
      ).map((x) => x.cfg),
    screenGenomes: (n, r, ...labels) => sp.screenGenomes(n, r, ...labels).map(pin),
    pinCell: (g) => pin(g),
    pinnedOfCell: () => pinned,
    pinPair: (g) => pin(g),
    pinnedOfPair: () => pinned
  };
};

export const a3GenesOf = (keys: readonly string[]) =>
  keys.map((k) => {
    const i = A3.geneKeys.indexOf(k);

    if (i < 0) throw new Error(`unknown Assignment 3 gene ${k}`);
    return i;
  });
export { A3 };
export type { StagedBookConfig };

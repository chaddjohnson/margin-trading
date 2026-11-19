// The configuration space (PROTOCOL.md §6): the 64 structural cells, the full joint genome (both D1 books, their RC 2
// risk controls and Growth·VGT's complete Growth 1.4.0 genome), canonical identity, distance, the protected screen strata,
// quasi-random screens, neighbourhoods, refinement moves and the projection of a fixed phenotype onto a structure.
//
// STRUCTURE. Each D1 book (D1·GDX, D1·VGT) takes one of four families — A (legacy: no protective stop, legacy calendar
// hold), B (protective stop, legacy hold), C (protective stop, hold disabled), D (protective stop, adaptive
// progress-extended hold) — × the prolonged-decline entry gate OFF/ON: 8 book structures, code family letter + gate digit
// (A0 … D1). A portfolio CELL is a pair `G<gdx>.V<vgt>`: 8 × 8 = 64 cells (4 × 4 families × 2 × 2 gates). The protective
// stop's ACTIVATION (RC 2: next-session / entry-day) is NOT a cell dimension: it is a per-book categorical gene, active
// only on a B/C/D book (brief §2.1). Family C never runs without the stop (C requires it by construction).
// Growth·VGT is searched in full (8 structural + 50 conditional numeric genes); Growth·GDX is OFF (Priority 3's
// placeholder, never run or funded); D1 first.
//
// GENOME (one layout for every lane; inactive genes are masked in the identity and never perturbed):
//   categorical (14): [fam GDX, fam VGT (4 each)] [gate GDX, gate VGT (2 each)] [activation GDX, VGT (2 each)]
//                     [Growth·VGT structural (8): entry, trend, elig, gate, exits, istop, retain, cont]
//   ordinal (78):     [D1·GDX 8][D1·VGT 8][controls GDX 6][controls VGT 6][Growth·VGT numeric 50]
// D1 genes: Study 8's box and integer grid (one grid at both resolutions). Control genes (Assignment 2's audited boxes,
// unchanged): d 30–250 tenths, hx 6–60 days (repaired to ≥ hold + 3), g 10–150 tenths, K 1–4, r 100–1000 tenths step 10,
// c 5–250 sessions. Growth numeric genes: growth140's boxes, COARSE grid (the independent screens and islands) or FINE
// grid (the schema step: the informed lane, refinement and every neighbourhood) — NL0 1.0.0 §3.2.
// A gene is ACTIVE iff its book's structure uses it: d on B/C/D; hx, g on D; K, r, c with the gate ON; the D1 hold and
// buffer except under C; activation on B/C/D; a Growth numeric gene iff Growth's own structure activates it.
//
// IDENTITY. cfgId = RC 2's riskId2 of the quad (the D1 pair, Growth·GDX's placeholder, the configuration's Growth·VGT,
// D1 first) and the canonical controls: Priority 3's quadId for a legacy configuration (New L0 = a2e385640ca61012), "rc1-…"
// for next-session controls, "rc2-…" with an entry-day book. The Growth vector enters through its browser identity (the
// canonical effective parameters), so inactive Growth genes never create a second configuration; the controls determine
// the cell, so no two cells share an identity.
import { Rng } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import type { D1Grid } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { type Quad, d1Box, d1Radius } from '../vg-d1-growth-joint/space.ts';
import {
  type Config as GConfig,
  type NumGene,
  type Structure,
  configDistance as gDistance,
  configId as gId,
  configOfFine,
  configOfGenome,
  effectiveOf,
  fineGenomeOf,
  fineLevels,
  fineStepOf,
  genomeOf as coarseGenomeOf,
  levelCounts,
  numericGenes,
  perturb as gPerturb,
  radiusValue,
  repair,
  roundStep,
  structuralGenes,
  structureOf
} from '../growth140-vgt-stable/space.ts';
import {
  type D1RiskControls2,
  type RiskConfig2,
  canonicalConfig2,
  riskEvalKey2,
  riskId2
} from '../d1-risk-controls-rc2/config.ts';
import { type Sym, seedOf, symbols } from './context.ts';
import { gdxPlaceholder } from './nl0.ts';

export type { D1Grid, GConfig, Quad, RiskConfig2, Structure };
export { d1Box, d1Radius, gId, numericGenes, structuralGenes, structureOf };

export type Resolution = 'coarse' | 'fine';

// ----- structures and cells -----

export type Family = 'A' | 'B' | 'C' | 'D';
export const families: readonly Family[] = ['A', 'B', 'C', 'D'];
export interface BookStructure {
  family: Family;
  gate: boolean;
}

export const bookStructures: readonly BookStructure[] = families.flatMap((family) => [false, true].map((gate) => ({ family, gate })));
export const codeOf = (b: BookStructure) => `${b.family}${b.gate ? 1 : 0}`;
export const protectedFamily = (f: Family) => f !== 'A';

export type CellId = string;
export interface Cell {
  id: CellId;
  GDX: BookStructure;
  VGT: BookStructure;
}

export const cellIdOf = (gdx: BookStructure, vgt: BookStructure) => `G${codeOf(gdx)}.V${codeOf(vgt)}`;
export const allCells: readonly Cell[] = bookStructures.flatMap((GDX) => bookStructures.map((VGT) => ({ id: cellIdOf(GDX, VGT), GDX, VGT })));
export const legacyCellId = 'GA0.VA0';
const cellIndex = new Map(allCells.map((c) => [c.id, c]));
export const cellOf = (id: CellId): Cell => {
  const c = cellIndex.get(id);

  if (!c) throw new Error(`cell ${id}`);
  return c;
};

if (bookStructures.length !== 8 || allCells.length !== 64) throw new Error('the cell design is not 8 × 8 = 64');

// The family pair of a cell (Track N's lane structure: the families pinned, the gates free).
export type PairId = string;
export const pairOf = (c: Cell): PairId => `G${c.GDX.family}.V${c.VGT.family}`;
export const allPairs: readonly PairId[] = families.flatMap((g) => families.map((v) => `G${g}.V${v}`));
export const familiesOfPair = (p: PairId): Record<Sym, Family> => ({ GDX: p[1] as Family, VGT: p[4] as Family });
export const gateStates = [
  [false, false],
  [true, false],
  [false, true],
  [true, true]
] as const;
export const cellOfPairGate = (p: PairId, i: number): Cell => {
  const f = familiesOfPair(p);
  const [gg, gv] = gateStates[i]!;

  return cellOf(cellIdOf({ family: f.GDX, gate: gg }, { family: f.VGT, gate: gv }));
};

// ----- the genome -----

export const controlKeys = ['d', 'hx', 'g', 'k', 'r', 'c'] as const;
export type ControlKey = (typeof controlKeys)[number];
export type CtlValues = Partial<Record<ControlKey, number>>;
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

const nS = structuralGenes.length; // 8
const nG = numericGenes.length; // 50
const nD = d1Box.length; // 8
const nC = controlKeys.length; // 6

if (nS !== 8 || nG !== 50) throw new Error(`Growth 1.4.0's genome is ${nS} + ${nG}, not 8 + 50`);

export const famGene: Record<Sym, number> = { GDX: 0, VGT: 1 };
export const gateGene: Record<Sym, number> = { GDX: 2, VGT: 3 };
export const actGene: Record<Sym, number> = { GDX: 4, VGT: 5 };
export const gStructOffset = 6;
export const nCat = 6 + nS; // 14
export const d1Offset: Record<Sym, number> = { GDX: nCat, VGT: nCat + nD };
export const ctlOffset: Record<Sym, number> = { GDX: nCat + 2 * nD, VGT: nCat + 2 * nD + nC };
export const gNumOffset = nCat + 2 * nD + 2 * nC; // 58
export const nGenes = gNumOffset + nG; // 92
export const nNum = nGenes - nCat; // 78
export const growthEntryGene = gStructOffset + structuralGenes.findIndex((s) => s.key === 'entry');
export const growthGateGene = gStructOffset + structuralGenes.findIndex((s) => s.key === 'gate');
export const growthEligGene = gStructOffset + structuralGenes.findIndex((s) => s.key === 'elig');

const ctlLevels = controlKeys.map((k) => Math.round((controlBox[k].max - controlBox[k].min) / controlBox[k].step) + 1);
const d1Levels = d1Box.map((b) => b.max - b.min + 1);
const catLevels = [4, 4, 2, 2, 2, 2, ...structuralGenes.map((s) => s.options.length)];
const gNumLevels = (res: Resolution) => (res === 'coarse' ? levelCounts : fineLevels).slice(nS);

export const levelsOf = (res: Resolution): number[] => [...catLevels, ...d1Levels, ...d1Levels, ...ctlLevels, ...ctlLevels, ...gNumLevels(res)];
export const geneKeys: string[] = [
  'fam.GDX',
  'fam.VGT',
  'gate.GDX',
  'gate.VGT',
  'act.GDX',
  'act.VGT',
  ...structuralGenes.map((s) => `G.${s.key}`),
  ...d1Box.map((b) => `GDX.${b.key}`),
  ...d1Box.map((b) => `VGT.${b.key}`),
  ...controlKeys.map((k) => `GDX.${k}`),
  ...controlKeys.map((k) => `VGT.${k}`),
  ...numericGenes.map((g) => `G.${g.key}`)
];

if (geneKeys.length !== nGenes || levelsOf('coarse').length !== nGenes || levelsOf('fine').length !== nGenes)
  throw new Error('the genome layout is inconsistent');

const holdIndex = d1Box.findIndex((b) => b.key === 'maximumHoldDays');
const bufferIndex = d1Box.findIndex((b) => b.key === 'intradayLossBuffer');
export const ctlIndex = (k: ControlKey) => controlKeys.indexOf(k);
const ctlValue = (k: ControlKey, idx: number) => controlBox[k].min + idx * controlBox[k].step;
const ctlIdx = (k: ControlKey, value: number) => {
  const idx = (value - controlBox[k].min) / controlBox[k].step;

  if (!Number.isInteger(idx) || idx < 0 || idx >= ctlLevels[ctlIndex(k)]!) throw new Error(`${k} = ${value} is off its grid`);
  return idx;
};

// The active D1 and control genes of a book structure (genome indices); the activation gene is active on B/C/D.
const d1Active = (s: Sym, b: BookStructure) => {
  const out: number[] = [];

  for (let i = 0; i < nD; i++) if (!(b.family === 'C' && (i === holdIndex || i === bufferIndex))) out.push(d1Offset[s] + i);
  return out;
};
const ctlActive = (s: Sym, b: BookStructure) => {
  const out: number[] = [];

  if (b.family !== 'A') out.push(ctlOffset[s] + ctlIndex('d'));
  if (b.family === 'D') out.push(ctlOffset[s] + ctlIndex('hx'), ctlOffset[s] + ctlIndex('g'));
  if (b.gate) out.push(ctlOffset[s] + ctlIndex('k'), ctlOffset[s] + ctlIndex('r'), ctlOffset[s] + ctlIndex('c'));
  return out;
};
// the gate-dependent control genes (dormant when the gate is OFF; Track N keeps them for gate switches)
export const gateCtlGenes = (s: Sym) => (['k', 'r', 'c'] as const).map((k) => ctlOffset[s] + ctlIndex(k));

// ----- configurations -----

export interface Cfg {
  cell: CellId;
  d1: Record<Sym, D1Grid>;
  controls: RiskConfig2 | null; // canonical (null: legacy — the cell GA0.VA0)
  g: GConfig; // Growth·VGT (effective, canonical)
}

const bookControls = (b: BookStructure, d1: D1Grid, v: CtlValues, entryDay: boolean): D1RiskControls2 | undefined => {
  const c: D1RiskControls2 = {};
  const need = (k: ControlKey) => {
    const x = v[k];

    if (x === undefined) throw new Error(`control ${k} is required by the structure`);
    return x;
  };

  if (b.family !== 'A') c.protectiveStop = { mode: 'on', stopDistanceTenths: need('d'), ...(entryDay ? { activation: 'entry-day' as const } : {}) };
  if (b.family === 'C') c.hold = { mode: 'disabled' };
  if (b.family === 'D')
    c.hold = { mode: 'adaptive', extendedHoldDays: Math.max(need('hx'), d1.maximumHoldDays + adaptiveMargin), progressTenths: need('g') };
  if (b.gate) c.declineGate = { mode: 'on', losses: need('k'), recoveryTenths: need('r'), maxBlockSessions: need('c') };
  return Object.keys(c).length ? c : undefined;
};

const canonicalGrowth = (g: GConfig): GConfig => effectiveOf(repair({ ...g }));

// The one constructor of a configuration: a C book's inert D1 hold and buffer take their box minimum (masked in the
// identity); the adaptive bound is repaired to ≥ hold + 3; an A book's activation is ignored; Growth is canonicalized.
export const cfgOf = (cell: Cell, d1: Record<Sym, D1Grid>, ctl: Record<Sym, CtlValues>, entryDay: Record<Sym, boolean>, g: GConfig): Cfg => {
  const outD1 = {} as Record<Sym, D1Grid>;
  const books: RiskConfig2['books'] = {};

  for (const s of symbols) {
    const b = cell[s];
    const v = { ...d1[s] };

    if (b.family === 'C') {
      v.maximumHoldDays = d1Box[holdIndex]!.min;
      v.intradayLossBuffer = d1Box[bufferIndex]!.min;
    }
    outD1[s] = v;

    const c = bookControls(b, v, ctl[s], entryDay[s] && protectedFamily(b.family));

    if (c) books[`D1:${s}`] = c;
  }

  return { cell: cell.id, d1: outD1, controls: canonicalConfig2({ version: 2, books }), g: canonicalGrowth(g) };
};

// The control values and activation of a configuration's book (inactive: undefined / false).
export const controlValuesOf = (cfg: Cfg, s: Sym): CtlValues => {
  const c = cfg.controls?.books[`D1:${s}`];
  const out: CtlValues = {};

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
export const entryDayOf = (cfg: Cfg, s: Sym) => {
  const ps = cfg.controls?.books[`D1:${s}`]?.protectiveStop;

  return ps?.mode === 'on' && ps.activation === 'entry-day';
};

// The structure the controls express (consistency with the cell).
export const cellOfControls = (controls: RiskConfig2 | null): CellId => {
  const of = (s: Sym): BookStructure => {
    const c = controls?.books[`D1:${s}`];
    const stop = c?.protectiveStop?.mode === 'on';
    const family: Family = !stop ? 'A' : c?.hold?.mode === 'disabled' ? 'C' : c?.hold?.mode === 'adaptive' ? 'D' : 'B';

    if (!stop && c?.hold && c.hold.mode !== 'legacy') throw new Error('a hold policy without the stop is outside the A–D families');
    return { family, gate: c?.declineGate?.mode === 'on' };
  };

  return cellIdOf(of('GDX'), of('VGT'));
};

// ----- decode / encode -----

const gGenomeOf = (g: GConfig, res: Resolution) => (res === 'coarse' ? coarseGenomeOf(g) : fineGenomeOf(g));
const gOfGenome = (genome: number[], res: Resolution): GConfig =>
  res === 'coarse' ? configOfGenome(genome) : configOfFine(genome);

// Decodes a genome: the structure from the family and gate genes, every inactive gene ignored.
export const decode = (g: readonly number[], res: Resolution): Cfg => {
  const fam = (s: Sym) => families[g[famGene[s]]!]!;
  const cell = cellOf(cellIdOf({ family: fam('GDX'), gate: g[gateGene.GDX] === 1 }, { family: fam('VGT'), gate: g[gateGene.VGT] === 1 }));
  const d1 = {} as Record<Sym, D1Grid>;
  const ctl = {} as Record<Sym, CtlValues>;
  const act = {} as Record<Sym, boolean>;

  for (const s of symbols) {
    d1[s] = Object.fromEntries(d1Box.map((b, i) => [b.key, b.min + g[d1Offset[s] + i]!])) as unknown as D1Grid;
    ctl[s] = Object.fromEntries(controlKeys.map((k) => [k, ctlValue(k, g[ctlOffset[s] + ctlIndex(k)]!)])) as CtlValues;
    act[s] = g[actGene[s]] === 1;
  }

  const growth = gOfGenome([...g.slice(gStructOffset, gStructOffset + nS), ...g.slice(gNumOffset, gNumOffset + nG)], res);

  return cfgOf(cell, d1, ctl, act, growth);
};

// The genome of a configuration. Inactive genes take `dormant`'s values when given (a seed's or a parent's genome: the
// dormant gate controls and Growth inputs an informed island may switch on), else index 0 (D1, controls) or the middle
// level (Growth, the growth140 convention).
export const encode = (cfg: Cfg, res: Resolution, dormant?: readonly number[]): number[] => {
  const cell = cellOf(cfg.cell);
  const out = new Array<number>(nGenes).fill(0);
  const gg = gGenomeOf(cfg.g, res);
  const st = structureOf(cfg.g);

  for (const s of symbols) {
    const b = cell[s];

    out[famGene[s]] = families.indexOf(b.family);
    out[gateGene[s]] = b.gate ? 1 : 0;
    out[actGene[s]] = entryDayOf(cfg, s) ? 1 : 0;
    if (!protectedFamily(b.family) && dormant) out[actGene[s]] = dormant[actGene[s]]!;

    const d1A = new Set(d1Active(s, b));

    d1Box.forEach((box, i) => {
      const at = d1Offset[s] + i;

      out[at] = d1A.has(at) ? cfg.d1[s][box.key] - box.min : (dormant?.[at] ?? 0);
    });

    const cA = new Set(ctlActive(s, b));
    const v = controlValuesOf(cfg, s);

    controlKeys.forEach((k, i) => {
      const at = ctlOffset[s] + i;

      out[at] = cA.has(at) ? ctlIdx(k, v[k]!) : (dormant?.[at] ?? 0);
    });
  }

  for (let i = 0; i < nS; i++) out[gStructOffset + i] = gg[i]!;
  numericGenes.forEach((gene, i) => {
    out[gNumOffset + i] = gene.active(st) || !dormant ? gg[nS + i]! : dormant[gNumOffset + i]!;
  });

  return out;
};

// The active genes of a decoded configuration (genome indices): categorical genes of the structure that matter, and
// every active ordinal gene (for mutation, distance and coverage).
export const activeOrdinal = (cfg: Cfg): number[] => {
  const cell = cellOf(cfg.cell);
  const st = structureOf(cfg.g);
  const out: number[] = [];

  for (const s of symbols) out.push(...d1Active(s, cell[s]), ...ctlActive(s, cell[s]));
  numericGenes.forEach((gene, i) => {
    if (gene.active(st)) out.push(gNumOffset + i);
  });
  return out.sort((a, b) => a - b);
};

export const quadOf = (cfg: Cfg): Quad => ({ d1: cfg.d1, g: { GDX: gdxPlaceholder(), VGT: cfg.g }, first: 'D1' });
export const cfgId = (cfg: Cfg) => riskId2(quadOf(cfg), cfg.controls);
export const evalKeyOf = (door: string, cfg: Cfg, o: EvalOptions) => riskEvalKey2(door, quadOf(cfg), o, cfg.controls);
export const sameCfg = (a: Cfg, b: Cfg) => cfgId(a) === cfgId(b);
// a configuration read back from JSON is canonical again (serialization round trip)
export const canonicalCfg = (cfg: Cfg): Cfg =>
  cfgOf(
    cellOf(cfg.cell),
    cfg.d1,
    { GDX: controlValuesOf(cfg, 'GDX'), VGT: controlValuesOf(cfg, 'VGT') },
    { GDX: entryDayOf(cfg, 'GDX'), VGT: entryDayOf(cfg, 'VGT') },
    cfg.g
  );

// ----- patterns (coverage, promotion shares, shortlist slots, triggers) -----

export type GEntry = 'rise' | 'breakout';
export const gEntryOf = (cfg: Cfg): GEntry => (cfg.g.entryMethod === 'trend_breakout' ? 'breakout' : 'rise');
export const gGateOf = (cfg: Cfg) => (cfg.g.drawdownRecoveryGateEnabled === true ? 'on' : 'off');
// the K of each gated D1 book and the activation of each protected one, e.g. "GDXK2/VGTe" ('' when none applies)
export const kPatternOf = (cfg: Cfg) =>
  symbols
    .map((s) => {
      const k = controlValuesOf(cfg, s).k;

      return k === undefined ? '' : `${s}K${k}`;
    })
    .filter(Boolean)
    .join('/');
export const actPatternOf = (cfg: Cfg) =>
  symbols
    .filter((s) => protectedFamily(cellOf(cfg.cell)[s].family))
    .map((s) => `${s}${entryDayOf(cfg, s) ? 'e' : 'n'}`)
    .join('/');
export const controlPatternOf = (cfg: Cfg) => [kPatternOf(cfg), actPatternOf(cfg)].filter(Boolean).join('|');
// Growth's structural stratum (NL0's six per book)
export const gStratumOf = (cfg: Cfg) => {
  const s = structureOf(cfg.g);

  return s.entry === 'trend_breakout' ? `breakout·gate ${s.gate}` : `rise·gate ${s.gate}·elig ${s.elig === 'off' ? 'off' : 'on'}`;
};
export const classKeyOf = (cfg: Cfg) => `${cfg.cell}|${controlPatternOf(cfg) || '-'}|G ${gStratumOf(cfg)}`;

export const describeCfg = (cfg: Cfg) =>
  `${cfg.cell} D1·GDX[${d1Box.map((b) => cfg.d1.GDX[b.key]).join(',')}] D1·VGT[${d1Box.map((b) => cfg.d1.VGT[b.key]).join(',')}] ${JSON.stringify(cfg.controls?.books ?? {})} G·VGT ${gId(cfg.g)} {${Object.entries(cfg.g)
    .filter(([k]) => k !== 'costBpsPerSide')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')}}`;

// ----- distance: normalized L∞ over the active numeric coordinates; 1 across cells, activation patterns or Growth
// structures (categorical differences) -----

export const cfgDistance = (a: Cfg, b: Cfg) => {
  if (a.cell !== b.cell || actPatternOf(a) !== actPatternOf(b)) return 1;

  const gd = gDistance(a.g, b.g);

  if (gd >= 1) return 1;

  const cell = cellOf(a.cell);
  let d = gd;

  for (const s of symbols) {
    for (const i of d1Active(s, cell[s])) {
      const box = d1Box[i - d1Offset[s]]!;

      d = Math.max(d, Math.abs(a.d1[s][box.key] - b.d1[s][box.key]) / (box.max - box.min));
    }

    const va = controlValuesOf(a, s);
    const vb = controlValuesOf(b, s);

    for (const k of controlKeys)
      if (va[k] !== undefined && vb[k] !== undefined) d = Math.max(d, Math.abs(va[k]! - vb[k]!) / (controlBox[k].max - controlBox[k].min));
  }

  return d;
};

// ----- pinning (the lane's fixed structure and its never-varied inactive genes) -----

// Track I and stage-2 refinement: the whole cell is fixed; inactive D1 and control genes and an A book's activation are
// pinned at 0 (they never vary); Growth's inactive inputs stay dormant (Growth's structure is free in a lane).
export const pinnedOfCell = (cell: Cell): Set<number> => {
  const p = new Set<number>([famGene.GDX, famGene.VGT, gateGene.GDX, gateGene.VGT]);

  for (const s of symbols) {
    const d1A = new Set(d1Active(s, cell[s]));
    const cA = new Set(ctlActive(s, cell[s]));

    for (let i = 0; i < nD; i++) if (!d1A.has(d1Offset[s] + i)) p.add(d1Offset[s] + i);
    for (let i = 0; i < nC; i++) if (!cA.has(ctlOffset[s] + i)) p.add(ctlOffset[s] + i);
    if (!protectedFamily(cell[s].family)) p.add(actGene[s]);
  }
  return p;
};

export const pinCell = (g: number[], cell: Cell) => {
  for (const s of symbols) {
    g[famGene[s]] = families.indexOf(cell[s].family);
    g[gateGene[s]] = cell[s].gate ? 1 : 0;
  }
  for (const i of pinnedOfCell(cell)) if (i >= nCat || i === actGene.GDX || i === actGene.VGT) g[i] = 0;
  return g;
};

// Track N: the family pair is fixed; the gates are free categorical genes; the gate controls K, r, c are dormant when
// their gate is OFF (kept for a later switch); the family-dependent inactive genes are pinned.
export const pinnedOfPair = (p: PairId): Set<number> => {
  const f = familiesOfPair(p);
  const out = new Set<number>([famGene.GDX, famGene.VGT]);

  for (const s of symbols) {
    const b = { family: f[s], gate: true };
    const d1A = new Set(d1Active(s, b));
    const cA = new Set(ctlActive(s, b));

    for (let i = 0; i < nD; i++) if (!d1A.has(d1Offset[s] + i)) out.add(d1Offset[s] + i);
    for (let i = 0; i < nC; i++) if (!cA.has(ctlOffset[s] + i)) out.add(ctlOffset[s] + i);
    if (!protectedFamily(f[s])) out.add(actGene[s]);
  }
  return out;
};

export const pinPair = (g: number[], p: PairId) => {
  const f = familiesOfPair(p);

  for (const s of symbols) g[famGene[s]] = families.indexOf(f[s]);
  for (const i of pinnedOfPair(p)) if (i !== famGene.GDX && i !== famGene.VGT) g[i] = 0;
  return g;
};

// ----- quasi-random screens (Latin supercube of scrambled Sobol blocks of ≤ 16 genes; NL0's construction) -----

export const screenGenomes = (n: number, res: Resolution, ...labels: (string | number)[]): number[][] => {
  const levels = levelsOf(res);
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

// ----- the protected screen strata of a cell (PROTOCOL.md §7.1) -----
//
// Factors: the activation of each protected book (2 levels), the gate's K of each gated book (4 levels), and Growth·VGT's
// structural stratum (NL0's six: rise·gate off·elig off, rise·off·on, rise·on·off, rise·on·on, breakout·gate off,
// breakout·on). P = the product of the levels (6 … 384). A screen of n proposals takes floor(n / P) full cycles of every
// stratum (mixed-radix order, activation fastest, then K, then Growth) and then a remainder of n mod P strata chosen
// GREEDILY for balance: each next stratum minimizes the sum of its factor levels' current counts (ties: the sum of its
// pairwise counts, then the stratum index). Every stratum gets ≥ floor(n / P) proposals and every level of every factor
// as nearly the same count as the integers allow. The Growth eligibility stratum "elig on" keeps a quasi-random policy
// when the screen drew one, else takes policy 1 + (that Growth stratum's occurrence count mod 5).

export const growthStrata = [
  { entry: 'rise', gate: false, elig: false },
  { entry: 'rise', gate: false, elig: true },
  { entry: 'rise', gate: true, elig: false },
  { entry: 'rise', gate: true, elig: true },
  { entry: 'breakout', gate: false, elig: false },
  { entry: 'breakout', gate: true, elig: false }
] as const;

export interface Factor {
  name: string;
  levels: number;
  gene: number; // the genome index it pins (activation, K, or the Growth stratum marker -1)
}

export const strataFactors = (cell: Cell): Factor[] => {
  const out: Factor[] = [];

  for (const s of symbols) if (protectedFamily(cell[s].family)) out.push({ name: `act ${s}`, levels: 2, gene: actGene[s] });
  for (const s of symbols) if (cell[s].gate) out.push({ name: `K ${s}`, levels: 4, gene: ctlOffset[s] + ctlIndex('k') });
  out.push({ name: 'Growth stratum', levels: growthStrata.length, gene: -1 });
  return out;
};

export const strataCount = (cell: Cell) => strataFactors(cell).reduce((a, f) => a * f.levels, 1);

const levelsOfStratum = (t: number, fs: readonly Factor[]) => {
  const out: number[] = [];
  let x = t;

  for (const f of fs) {
    out.push(x % f.levels);
    x = Math.floor(x / f.levels);
  }
  return out;
};

const strataCache = new Map<string, number[]>();

// The stratum of each of n screen positions (deterministic; independent of the seeds).
export const strataSequence = (cell: Cell, n: number): number[] => {
  const key = `${cell.id}|${n}`;
  const hit = strataCache.get(key);

  if (hit) return hit;

  const fs = strataFactors(cell);
  const P = fs.reduce((a, f) => a * f.levels, 1);
  const lv = Array.from({ length: P }, (_v, t) => levelsOfStratum(t, fs));
  const seq: number[] = [];

  for (let c = 0; c < Math.floor(n / P); c++) for (let t = 0; t < P; t++) seq.push(t);

  const marg = fs.map((f) => new Array<number>(f.levels).fill(0));
  const pair = new Map<string, number>();
  const pairKey = (a: number, la: number, b: number, lb: number) => `${a}:${la}|${b}:${lb}`;
  const used = new Set<number>();

  for (let k = 0; k < n % P; k++) {
    let best = -1;
    let bestM = Infinity;
    let bestP = Infinity;

    for (let t = 0; t < P; t++) {
      if (used.has(t)) continue;

      const l = lv[t]!;
      const m = l.reduce((a, x, f) => a + marg[f]![x]!, 0);
      let pp = 0;

      for (let a = 0; a < fs.length; a++) for (let b = a + 1; b < fs.length; b++) pp += pair.get(pairKey(a, l[a]!, b, l[b]!)) ?? 0;
      if (m < bestM || (m === bestM && pp < bestP)) {
        best = t;
        bestM = m;
        bestP = pp;
      }
    }

    used.add(best);
    seq.push(best);

    const l = lv[best]!;

    l.forEach((x, f) => marg[f]![x]!++);
    for (let a = 0; a < fs.length; a++)
      for (let b = a + 1; b < fs.length; b++) pair.set(pairKey(a, l[a]!, b, l[b]!), (pair.get(pairKey(a, l[a]!, b, l[b]!)) ?? 0) + 1);
  }

  strataCache.set(key, seq);
  if (strataCache.size > 512) strataCache.delete(strataCache.keys().next().value!);
  return seq;
};

// Pins screen position i of an n-proposal screen of the cell to its stratum (and the cell).
export const pinStratum = (g: number[], cell: Cell, i: number, n: number) => {
  pinCell(g, cell);

  const fs = strataFactors(cell);
  const seq = strataSequence(cell, n);
  const t = seq[i % seq.length]!;
  const l = levelsOfStratum(t, fs);

  fs.forEach((f, j) => {
    if (f.gene >= 0) g[f.gene] = l[j]!;
    else {
      const st = growthStrata[l[j]!]!;
      const occurrence = seq.slice(0, i % seq.length).filter((x) => levelsOfStratum(x, fs)[j] === l[j]).length;

      g[growthEntryGene] = st.entry === 'rise' ? 0 : 1;
      g[growthGateGene] = st.gate ? 1 : 0;
      if (!st.elig) g[growthEligGene] = 0;
      else if (g[growthEligGene] === 0) g[growthEligGene] = 1 + (occurrence % 5);
    }
  });
  return g;
};

// ----- neighbourhoods (PROTOCOL.md §9) -----
//
// A family = n Latin-hypercube rows of u ∈ [−1, 1] over the 78 numeric columns (D1·GDX 8, D1·VGT 8, controls GDX 6,
// controls VGT 6, Growth·VGT 50; common random numbers across a cutoff's centres). A neighbour moves every ACTIVE numeric
// input of the scope: D1 and control genes by round(u × scale × radius) grid units (D1: Study 8's N1; controls: §6.2; K
// never moves), Growth inputs by u × scale × 10% of the box in value units rounded to the fine step (growth140's
// perturbation); each clipped to its box widened to include the centre; categorical inputs (cell, activation, Growth
// structure) stay fixed; the adaptive bound is repaired; duplicates of the centre or of earlier rows are dropped.

export type Scope = 'joint' | 'd1' | 'controls' | 'growth';

export interface NFamily {
  name: string;
  n: number;
  labels: (string | number)[];
  scope?: Scope;
  scale?: number;
}

const unitCol = { d1: { GDX: 0, VGT: nD }, ctl: { GDX: 2 * nD, VGT: 2 * nD + nC }, g: 2 * nD + 2 * nC };
export const unitColumns = nNum; // 78
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

const clipInt = (lo0: number, hi0: number, centre: number, v: number) => {
  const lo = Math.min(lo0, centre);
  const hi = Math.max(hi0, centre);

  return v < lo ? { v: lo, clipped: true } : v > hi ? { v: hi, clipped: true } : { v, clipped: false };
};

export const neighbourhood = (centre: Cfg, family: NFamily, units = unitsOf(family.n, family.labels)): NeighbourPoint[] => {
  const cell = cellOf(centre.cell);
  const scope = family.scope ?? 'joint';
  const scale = family.scale ?? 1;
  const moveD1 = scope === 'joint' || scope === 'd1';
  const moveCtl = scope === 'joint' || scope === 'controls';
  const moveG = scope === 'joint' || scope === 'growth';
  const st = structureOf(centre.g);
  const gActive = numericGenes.map((gene, i) => [gene, i] as const).filter(([gene]) => gene.active(st));
  const v0 = { GDX: controlValuesOf(centre, 'GDX'), VGT: controlValuesOf(centre, 'VGT') };
  const act = { GDX: entryDayOf(centre, 'GDX'), VGT: entryDayOf(centre, 'VGT') };
  const seen = new Set<string>([cfgId(centre)]);
  const out: NeighbourPoint[] = [];

  for (const u of units) {
    let clipped = 0;
    const d1 = { GDX: { ...centre.d1.GDX }, VGT: { ...centre.d1.VGT } };
    const ctl = { GDX: { ...v0.GDX }, VGT: { ...v0.VGT } };
    const g: GConfig = { ...centre.g };

    for (const s of symbols) {
      if (moveD1)
        for (const i of d1Active(s, cell[s])) {
          const k = i - d1Offset[s];
          const box = d1Box[k]!;
          const c = clipInt(box.min, box.max, centre.d1[s][box.key], centre.d1[s][box.key] + Math.round(u[unitCol.d1[s] + k]! * scale * d1Radius[box.key]));

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

    let cfg: Cfg;

    try {
      cfg = cfgOf(cell, d1, ctl, act, g);
    } catch {
      continue; // an invalid perturbation is not a neighbour (none expected: the boxes keep every constraint)
    }

    const id = cfgId(cfg);

    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ cfg, id, clipped });
  }

  return out;
};

// The number of active numeric inputs a scope moves (dimension disclosure).
export const activeInputs = (cfg: Cfg, scope: Scope = 'joint') => {
  const cell = cellOf(cfg.cell);
  const st = structureOf(cfg.g);
  let n = 0;

  for (const s of symbols) {
    if (scope === 'joint' || scope === 'd1') n += d1Active(s, cell[s]).length;
    if (scope === 'joint' || scope === 'controls')
      n += ctlActive(s, cell[s]).filter((i) => controlBox[controlKeys[i - ctlOffset[s]]!].radius > 0).length;
  }
  if (scope === 'joint' || scope === 'growth') n += numericGenes.filter((gene) => gene.active(st)).length;
  return n;
};

// The active inputs of a configuration that sit on a bound of their box (boundary disclosure).
export const boundaryInputs = (cfg: Cfg): string[] => {
  const cell = cellOf(cfg.cell);
  const st = structureOf(cfg.g);
  const out: string[] = [];

  for (const s of symbols) {
    for (const i of d1Active(s, cell[s])) {
      const box = d1Box[i - d1Offset[s]]!;
      const v = cfg.d1[s][box.key];

      if (v === box.min || v === box.max) out.push(`${s}.${box.key}=${v}`);
    }

    const v = controlValuesOf(cfg, s);

    for (const k of controlKeys) if (v[k] !== undefined && (v[k] === controlBox[k].min || v[k] === controlBox[k].max)) out.push(`${s}.${k}=${v[k]}`);
  }
  for (const gene of numericGenes) {
    if (!gene.active(st)) continue;

    const v = cfg.g[gene.key] as number;

    if (Math.abs(v - gene.min) < 1e-9 || Math.abs(v - gene.max) < 1e-9) out.push(`G.${gene.key}=${v}`);
  }
  return out;
};

// ----- refinement moves (NL0's): every active D1 and control gene with a radius by ±R/2 and ±R grid units, K ± 1, every
// active Growth input by ±R/2 and ±R (fine step), every enabled optional Growth rule switched OFF, and each protected
// book's activation switched; in Track N (`gateSwitches`) also each D1 book's decline gate switched (ON with K 2,
// r 500, c 60 — the middle level of the informed seed grid). The cell never moves in Track I. Repaired, de-duplicated,
// the centre excluded. -----

export const gateOnDefaults: CtlValues = { k: 2, r: 500, c: 60 };

export const movesOf = (c: Cfg, o: { gateSwitches?: boolean } = {}): Cfg[] => {
  const cell = cellOf(c.cell);
  const out = new Map<string, Cfg>();
  const self = cfgId(c);
  const base = {
    d1: { GDX: { ...c.d1.GDX }, VGT: { ...c.d1.VGT } },
    ctl: { GDX: controlValuesOf(c, 'GDX'), VGT: controlValuesOf(c, 'VGT') },
    act: { GDX: entryDayOf(c, 'GDX'), VGT: entryDayOf(c, 'VGT') },
    g: c.g
  };
  const add = (x: typeof base, onCell: Cell = cell) => {
    try {
      const m = cfgOf(onCell, x.d1, x.ctl, x.act, x.g);
      const id = cfgId(m);

      if (id !== self && !out.has(id)) out.set(id, m);
    } catch {
      // an invalid move is not a move
    }
  };
  const steps = (R: number) => [...new Set([0.5, 1].map((f) => Math.max(1, Math.round(f * R))))];

  for (const s of symbols) {
    for (const i of d1Active(s, cell[s])) {
      const box = d1Box[i - d1Offset[s]]!;

      for (const step of steps(d1Radius[box.key]))
        for (const sign of [-1, 1]) {
          const v = c.d1[s][box.key] + sign * step;

          if (v >= box.min && v <= box.max) add({ ...base, d1: { ...base.d1, [s]: { ...base.d1[s], [box.key]: v } } });
        }
    }

    for (const i of ctlActive(s, cell[s])) {
      const key = controlKeys[i - ctlOffset[s]]!;
      const box = controlBox[key];
      const idx0 = ctlIdx(key, base.ctl[s][key]!);

      for (const step of box.radius > 0 ? steps(box.radius) : [1])
        for (const sign of [-1, 1]) {
          const idx = idx0 + sign * step;

          if (idx >= 0 && idx < ctlLevels[ctlIndex(key)]!) add({ ...base, ctl: { ...base.ctl, [s]: { ...base.ctl[s], [key]: ctlValue(key, idx) } } });
        }
    }

    if (protectedFamily(cell[s].family)) add({ ...base, act: { ...base.act, [s]: !base.act[s] } });

    if (o.gateSwitches) {
      const flipped = cellOf(cellIdOf(s === 'GDX' ? { ...cell.GDX, gate: !cell.GDX.gate } : cell.GDX, s === 'VGT' ? { ...cell.VGT, gate: !cell.VGT.gate } : cell.VGT));

      add({ ...base, ctl: { ...base.ctl, [s]: cell[s].gate ? base.ctl[s] : { ...base.ctl[s], ...gateOnDefaults } } }, flipped);
    }
  }

  const st = structureOf(c.g);

  for (const gene of numericGenes) {
    if (!gene.active(st)) continue;

    const step = fineStepOf(gene);

    for (const f of [0.5, 1])
      for (const sign of [-1, 1]) {
        const v = roundStep((c.g[gene.key] as number) + sign * Math.max(step, roundStep(f * radiusValue(gene), step)), step);

        if (v < gene.min - 1e-9 || v > gene.max + 1e-9) continue;
        add({ ...base, g: { ...c.g, [gene.key]: v } });
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

  for (const [on, key] of off) if (on) add({ ...base, g: { ...c.g, [key]: false } });

  return [...out.values()];
};

// ----- projection of a fixed phenotype onto a structure (Track N's seeds; the ablations) -----

// The incumbent's D1 vectors and Growth·VGT on the cell, with the given control values and activations (a C book's hold
// and buffer become inert; the adaptive bound is repaired).
export const project = (quad: Quad, cell: Cell, ctl: Record<Sym, CtlValues>, entryDay: Record<Sym, boolean>): Cfg =>
  cfgOf(cell, quad.d1, ctl, entryDay, quad.g.VGT);

export type { NumGene };

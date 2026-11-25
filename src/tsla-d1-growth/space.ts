// The TSLA configuration space (PROTOCOL.md §6): Assignment 3's genome semantics (src/vg-l0-full-joint/space.ts: Study 8's
// D1 box and grid, Assignment 2's RC 2 control families and boxes, Growth 1.4.0's complete genome on growth140's boxes,
// coarse and fine grids, canonical identity, NL0's screen strata, neighbourhood instrument and refinement moves),
// restricted to the ONE trading slot (the engine's VGT slot = TSLA; context.ts) and organized in per-ARM CELLS. Every
// configuration is an Assignment 3 configuration built by Assignment 3's own constructor (cfgOf: canonical controls,
// inert genes at their box minimum, Growth canonicalized) — so the GPU Lab, the CPU engine, the identities (riskId2) and
// the archive keys are exactly the accepted ones — with `cell` replaced by this study's cell id.
//
// GENOME (75 genes, one layout for every arm; a gene outside an arm is pinned and never varies):
//   categorical (11): [fam (A–D)] [decline gate] [activation] [Growth structural ×8: entry, trend, elig, gate, exits,
//                     istop, retain, cont]
//   ordinal (64):     [D1 ×8 (Study 8's box)] [controls ×6: d, hx, g, K, r, c] [Growth numeric ×50 (coarse | fine)]
// The GDX engine slot is fixed and disabled: D1·GDX = the D1 box minima (family A, no controls), Growth·GDX = Priority 3's
// placeholder (quadOf), never run or funded.
//
// CELLS (the protected structures; a lane pins one):
//   D.<f><g>          arm D (D1 standalone): the D1 family f ∈ A–D and decline gate g ∈ 0/1 — 8 cells. Growth is OFF
//                     (disabled; its genes pinned to the placeholder G0).
//   G.h<e>.s<i>       arm G (Growth standalone): Growth's exit-protection structure — maximum-hold switch e ∈ {0 hold off,
//                     1 hold on & buffer off, 2 hold on & buffer on} × initial ATR stop i ∈ {0 off, 1 on} — 6 cells.
//                     G.h0.s0 is the UNRESTRICTED (open-ended) Growth structure: no maximum hold and no initial stop, so a
//                     lot losing money has no exit until its net-profit trailing stop arms (brief §3). D1 is OFF.
//   J.<f><g>.h<e>.s<i> arm J (joint): 8 × 6 = 48 cells; both TSLA books trade in the one slot.
//   C.<f><g>.h<e>.s<i> arm C (fixed combinations): the J structure of a pair of standalone selections (never searched).
//   S.<k>.h<e>.s<i>   arm S (sequential): the frozen D1 finalist <k> (registered: its structure, vector, controls and
//                     activation never vary) × the 6 Growth cells.
// Each cell fixes its structural genes; every other gene of the arm's books (the activation of a protected D1 book, the
// gate's K, the rest of Growth's structure, every active numeric input) is searched.
import { Rng } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { d1Levels } from '../vg-d1-growth-joint/space.ts';
import {
  type BookStructure,
  type Cfg,
  type ControlKey,
  type CtlValues,
  type D1Grid,
  type Family as D1Family,
  type GConfig,
  type NFamily,
  type NeighbourPoint,
  type Resolution,
  type Scope,
  adaptiveMargin,
  cellIdOf as a3CellIdOf,
  cellOf as a3CellOf,
  cfgId,
  cfgOf as a3CfgOf,
  codeOf,
  controlBox,
  controlKeys,
  controlValuesOf,
  d1Box,
  d1Radius,
  entryDayOf,
  evalKeyOf,
  families,
  gEntryOf,
  gGateOf,
  gId,
  gStratumOf,
  growthStrata,
  numericGenes,
  protectedFamily,
  quadOf,
  structuralGenes,
  structureOf
} from '../vg-l0-full-joint/space.ts';
import {
  configDistance as gDistance,
  configOfFine,
  configOfGenome,
  effectiveOf,
  fineGenomeOf,
  fineLevels,
  fineStepOf,
  genomeOf as coarseGenomeOf,
  levelCounts,
  perturb as gPerturb,
  radiusValue,
  repair,
  roundStep
} from '../growth140-vgt-stable/space.ts';
import { type ArmKey, seedOf } from './context.ts';

export type { BookStructure, Cfg, CtlValues, D1Grid, GConfig, NFamily, NeighbourPoint, Resolution, Scope };
export { cfgId, controlValuesOf, d1Box, entryDayOf, evalKeyOf, gEntryOf, gGateOf, gId, gStratumOf, numericGenes, quadOf, structuralGenes, structureOf };

// ----- the genome layout -----

const nS = structuralGenes.length; // 8
const nG = numericGenes.length; // 50
const nD = d1Box.length; // 8
const nC = controlKeys.length; // 6

if (nS !== 8 || nG !== 50 || nD !== 8 || nC !== 6) throw new Error('the genome sizes are not 8 + 50 + 8 + 6');

export const famGene = 0;
export const gateGene = 1;
export const actGene = 2;
export const gStructOffset = 3;
export const nCat = 3 + nS; // 11
export const d1Offset = nCat; // 11
export const ctlOffset = nCat + nD; // 19
export const gNumOffset = nCat + nD + nC; // 25
export const nGenes = gNumOffset + nG; // 75
export const nNum = nGenes - nCat; // 64
const sIdx = (key: string) => structuralGenes.findIndex((s) => s.key === key);
export const growthEntryGene = gStructOffset + sIdx('entry');
export const growthGateGene = gStructOffset + sIdx('gate');
export const growthEligGene = gStructOffset + sIdx('elig');
export const exitsGene = gStructOffset + sIdx('exits');
export const istopGene = gStructOffset + sIdx('istop');
export const exitsOptions = structuralGenes[sIdx('exits')]!.options as readonly string[];
export const istopOptions = structuralGenes[sIdx('istop')]!.options as readonly string[];

if (exitsOptions.join() !== 'hold_off,hold_on_buffer_off,hold_on_buffer_on' || istopOptions.join() !== 'off,on')
  throw new Error('the Growth exit-protection options changed');

const ctlLevels = controlKeys.map((k) => Math.round((controlBox[k].max - controlBox[k].min) / controlBox[k].step) + 1);
const ctlIndex = (k: ControlKey) => controlKeys.indexOf(k);
const ctlValue = (k: ControlKey, idx: number) => controlBox[k].min + idx * controlBox[k].step;
const ctlIdx = (k: ControlKey, value: number) => {
  const idx = (value - controlBox[k].min) / controlBox[k].step;

  if (!Number.isInteger(idx) || idx < 0 || idx >= ctlLevels[ctlIndex(k)]!) throw new Error(`${k} = ${value} is off its grid`);
  return idx;
};
const catLevels = [4, 2, 2, ...structuralGenes.map((s) => s.options.length)];
const gNumLevels = (res: Resolution) => (res === 'coarse' ? levelCounts : fineLevels).slice(nS);

export const levelsOf = (res: Resolution): number[] => [...catLevels, ...d1Levels, ...ctlLevels, ...gNumLevels(res)];
export const geneKeys: string[] = [
  'fam',
  'gate',
  'act',
  ...structuralGenes.map((s) => `G.${s.key}`),
  ...d1Box.map((b) => `D1.${b.key}`),
  ...controlKeys.map((k) => `ctl.${k}`),
  ...numericGenes.map((g) => `G.${g.key}`)
];

if (geneKeys.length !== nGenes || levelsOf('coarse').length !== nGenes || levelsOf('fine').length !== nGenes)
  throw new Error('the genome layout is inconsistent');

const holdIndex = d1Box.findIndex((b) => b.key === 'maximumHoldDays');
const bufferIndex = d1Box.findIndex((b) => b.key === 'intradayLossBuffer');

// the active D1 and control genes of a D1 book structure (Assignment 3's d1Active / ctlActive on one book)
const d1Active = (b: BookStructure) => {
  const out: number[] = [];

  for (let i = 0; i < nD; i++) if (!(b.family === 'C' && (i === holdIndex || i === bufferIndex))) out.push(d1Offset + i);
  return out;
};
const ctlActive = (b: BookStructure) => {
  const out: number[] = [];

  if (b.family !== 'A') out.push(ctlOffset + ctlIndex('d'));
  if (b.family === 'D') out.push(ctlOffset + ctlIndex('hx'), ctlOffset + ctlIndex('g'));
  if (b.gate) out.push(ctlOffset + ctlIndex('k'), ctlOffset + ctlIndex('r'), ctlOffset + ctlIndex('c'));
  return out;
};

// ----- fixed parts -----

const A0: BookStructure = { family: 'A', gate: false };
const minD1 = (): D1Grid => Object.fromEntries(d1Box.map((b) => [b.key, b.min])) as unknown as D1Grid;
// D1·GDX (disabled engine slot) and D1·TSLA when D1 is OFF (arm G): the box minima, family A
export const inertD1 = minD1();
// Growth·TSLA when Growth is OFF (arm D): the decode of the all-zero genome (rise entry; every switch off), canonical
const zerosG = new Array<number>(nS + nG).fill(0);
export const growthOff: GConfig = effectiveOf(repair({ ...configOfGenome(zerosG) }));

// ----- cells -----

export interface FrozenD1 {
  key: string; // e.g. F1
  label: string; // the D arm member it was frozen from
  structure: BookStructure;
  d1: D1Grid;
  ctl: CtlValues;
  entryDay: boolean;
}

export interface Cell {
  id: string;
  arm: ArmKey;
  d1: BookStructure | null; // D, J, C (S: the frozen finalist's)
  exits: number | null; // G, J, C, S
  istop: number | null; // G, J, C, S
  frozen: FrozenD1 | null; // S
}

const frozenRegistry = new Map<string, FrozenD1>();
const sameFrozen = (a: FrozenD1, b: FrozenD1) => JSON.stringify(a) === JSON.stringify(b);

// Registers a frozen D1 finalist (arm S). Re-registering a key with a different phenotype is refused.
export const registerFrozen = (f: FrozenD1) => {
  const prev = frozenRegistry.get(f.key);

  if (prev && !sameFrozen(prev, f)) throw new Error(`frozen D1 ${f.key} is already registered with another phenotype`);
  frozenRegistry.set(f.key, f);
};
export const frozenOf = (key: string) => {
  const f = frozenRegistry.get(key);

  if (!f) throw new Error(`frozen D1 ${key} is not registered`);
  return f;
};

const d1Code = (b: BookStructure) => codeOf(b); // e.g. B1
const growthCode = (e: number, i: number) => `h${e}.s${i}`;
const parseD1Code = (s: string): BookStructure => {
  const m = /^([ABCD])([01])$/.exec(s);

  if (!m) throw new Error(`D1 structure code ${s}`);
  return { family: m[1] as D1Family, gate: m[2] === '1' };
};
const parseGrowthCode = (s: string) => {
  const m = /^h([012])\.s([01])$/.exec(s);

  if (!m) throw new Error(`Growth protection code ${s}`);
  return { exits: Number(m[1]), istop: Number(m[2]) };
};

export const cellIdOf = (arm: ArmKey, o: { d1?: BookStructure; exits?: number; istop?: number; frozen?: string }) => {
  switch (arm) {
    case 'D':
      return `D.${d1Code(o.d1!)}`;
    case 'G':
      return `G.${growthCode(o.exits!, o.istop!)}`;
    case 'J':
    case 'C':
      return `${arm}.${d1Code(o.d1!)}.${growthCode(o.exits!, o.istop!)}`;
    case 'S':
      return `S.${o.frozen!}.${growthCode(o.exits!, o.istop!)}`;
  }
};

const cellCache = new Map<string, Cell>();

export const cellOf = (id: string): Cell => {
  const hit = cellCache.get(id);

  if (hit && (hit.arm !== 'S' || sameFrozen(hit.frozen!, frozenOf(hit.frozen!.key)))) return hit;

  const parts = id.split('.');
  const arm = parts[0] as ArmKey;
  let cell: Cell;

  if (arm === 'D' && parts.length === 2) cell = { id, arm, d1: parseD1Code(parts[1]!), exits: null, istop: null, frozen: null };
  else if (arm === 'G' && parts.length === 3) {
    const g = parseGrowthCode(`${parts[1]}.${parts[2]}`);

    cell = { id, arm, d1: null, exits: g.exits, istop: g.istop, frozen: null };
  } else if ((arm === 'J' || arm === 'C') && parts.length === 4) {
    const g = parseGrowthCode(`${parts[2]}.${parts[3]}`);

    cell = { id, arm, d1: parseD1Code(parts[1]!), exits: g.exits, istop: g.istop, frozen: null };
  } else if (arm === 'S' && parts.length === 4) {
    const g = parseGrowthCode(`${parts[2]}.${parts[3]}`);
    const f = frozenOf(parts[1]!);

    cell = { id, arm, d1: f.structure, exits: g.exits, istop: g.istop, frozen: f };
  } else throw new Error(`cell ${id}`);

  if (cellIdOf(arm, { d1: cell.d1 ?? undefined, exits: cell.exits ?? undefined, istop: cell.istop ?? undefined, frozen: cell.frozen?.key }) !== id)
    throw new Error(`cell ${id} is not canonical`);
  cellCache.set(id, cell);
  return cell;
};

export const armOfCell = (id: string) => id.split('.')[0] as ArmKey;
export const hasD1 = (arm: ArmKey) => arm !== 'G';
export const hasGrowth = (arm: ArmKey) => arm !== 'D';
// the D1 genes a lane of the arm may vary (S: the D1 finalist is frozen)
const d1Free = (arm: ArmKey) => arm === 'D' || arm === 'J' || arm === 'C';

export const d1Structures: readonly BookStructure[] = families.flatMap((family) => [false, true].map((gate) => ({ family, gate })));
export const growthCells: readonly { exits: number; istop: number }[] = [0, 1, 2].flatMap((exits) => [0, 1].map((istop) => ({ exits, istop })));
export const cellsOfArm = (arm: Exclude<ArmKey, 'S'>): Cell[] =>
  arm === 'D'
    ? d1Structures.map((d1) => cellOf(cellIdOf('D', { d1 })))
    : arm === 'G'
      ? growthCells.map((g) => cellOf(cellIdOf('G', g)))
      : d1Structures.flatMap((d1) => growthCells.map((g) => cellOf(cellIdOf(arm, { d1, ...g }))));
export const sequentialCells = (frozenKey: string): Cell[] => growthCells.map((g) => cellOf(cellIdOf('S', { frozen: frozenKey, ...g })));
export const unrestrictedGrowth = (c: Cell) => c.exits === 0 && c.istop === 0;
export const growthProtectionOf = (exits: number, istop: number) =>
  exits === 0 && istop === 0 ? 'unrestricted (no maximum hold, no initial stop)' : `${exitsOptions[exits]}, initial stop ${istopOptions[istop]}`;

if (cellsOfArm('D').length !== 8 || cellsOfArm('G').length !== 6 || cellsOfArm('J').length !== 48) throw new Error('the cell design is not 8 / 6 / 48');

// ----- configurations -----

// THE constructor: Assignment 3's cfgOf on the engine's two slots (GDX inert and disabled, TSLA in the VGT slot), with
// this study's cell id. Arm D carries Growth OFF (growthOff), arm G D1 OFF (inertD1, family A).
export const cfgOf = (cell: Cell, d1: D1Grid, ctl: CtlValues, entryDay: boolean, g: GConfig): Cfg => {
  const arm = cell.arm;
  const structure = arm === 'G' ? A0 : cell.d1!;
  const a3cell = a3CellOf(a3CellIdOf(A0, structure));
  const x = a3CfgOf(
    a3cell,
    { GDX: inertD1, VGT: arm === 'G' ? inertD1 : d1 },
    { GDX: {}, VGT: arm === 'G' ? {} : ctl },
    { GDX: false, VGT: arm === 'G' ? false : entryDay },
    arm === 'D' ? growthOff : g
  );

  return { ...x, cell: cell.id };
};

// the parts of a configuration (the TSLA slot)
export const partsOf = (cfg: Cfg) => ({
  d1: { ...cfg.d1.VGT },
  ctl: controlValuesOf(cfg, 'VGT'),
  entryDay: entryDayOf(cfg, 'VGT'),
  g: cfg.g
});

// a configuration read back from JSON is canonical again (serialization round trip)
export const canonicalCfg = (cfg: Cfg): Cfg => {
  const p = partsOf(cfg);

  return cfgOf(cellOf(cfg.cell), p.d1, p.ctl, p.entryDay, p.g);
};

// The frozen D1 of an arm-D (or any D1-bearing) configuration.
export const frozenFrom = (key: string, label: string, cfg: Cfg): FrozenD1 => {
  const c = cellOf(cfg.cell);

  if (!c.d1) throw new Error(`${label}: no D1 book to freeze`);

  const p = partsOf(cfg);

  return { key, label, structure: c.d1, d1: p.d1, ctl: p.ctl, entryDay: protectedFamily(c.d1.family) && p.entryDay };
};

// A pair (arm C): the D1 of a D1-bearing configuration and the Growth of a Growth-bearing one.
export const pairCfg = (d1From: Cfg, gFrom: Cfg): Cfg => {
  const d = cellOf(d1From.cell);
  const g = cellOf(gFrom.cell);

  if (!d.d1 || g.exits === null || g.istop === null) throw new Error('a pair needs a D1 configuration and a Growth configuration');

  const p = partsOf(d1From);

  return cfgOf(cellOf(cellIdOf('C', { d1: d.d1, exits: g.exits, istop: g.istop })), p.d1, p.ctl, p.entryDay, gFrom.g);
};

// ----- decode / encode -----

const gGenomeOf = (g: GConfig, res: Resolution) => (res === 'coarse' ? coarseGenomeOf(g) : fineGenomeOf(g));
const gOfGenome = (genome: number[], res: Resolution): GConfig => (res === 'coarse' ? configOfGenome(genome) : configOfFine(genome));

// Decodes a genome in a lane's cell: the D1 structure from the family and gate genes (D, J, C), the Growth protection from
// the exits and istop genes (G, J, C, S); arm S takes its D1 from the registered frozen finalist; inactive genes ignored.
export const decode = (g: readonly number[], res: Resolution, lane: Cell): Cfg => {
  const arm = lane.arm;
  const structure: BookStructure | null =
    arm === 'D' || arm === 'J' || arm === 'C' ? { family: families[g[famGene]!]!, gate: g[gateGene] === 1 } : arm === 'S' ? lane.frozen!.structure : null;
  const exits = hasGrowth(arm) ? g[exitsGene]! : undefined;
  const istop = hasGrowth(arm) ? g[istopGene]! : undefined;
  const cell = cellOf(cellIdOf(arm, { d1: structure ?? undefined, exits, istop, frozen: lane.frozen?.key }));
  const d1 =
    arm === 'S'
      ? lane.frozen!.d1
      : (Object.fromEntries(d1Box.map((b, i) => [b.key, b.min + g[d1Offset + i]!])) as unknown as D1Grid);
  const ctl = arm === 'S' ? lane.frozen!.ctl : (Object.fromEntries(controlKeys.map((k) => [k, ctlValue(k, g[ctlOffset + ctlIndex(k)]!)])) as CtlValues);
  const act = arm === 'S' ? lane.frozen!.entryDay : g[actGene] === 1;
  const growth = hasGrowth(arm) ? gOfGenome([...g.slice(gStructOffset, gStructOffset + nS), ...g.slice(gNumOffset, gNumOffset + nG)], res) : growthOff;

  return cfgOf(cell, d1, ctl, act, growth);
};

// The genome of a configuration. Inactive genes take `dormant`'s values when given, else index 0 (D1, controls) or the
// Growth genome's own value (Assignment 3's convention).
export const encode = (cfg: Cfg, res: Resolution, dormant?: readonly number[]): number[] => {
  const cell = cellOf(cfg.cell);
  const arm = cell.arm;
  const out = new Array<number>(nGenes).fill(0);
  const gg = gGenomeOf(cfg.g, res);
  const st = structureOf(cfg.g);
  const b = arm === 'G' ? A0 : cell.d1!;
  const p = partsOf(cfg);

  out[famGene] = families.indexOf(b.family);
  out[gateGene] = b.gate ? 1 : 0;
  out[actGene] = p.entryDay ? 1 : 0;
  if (!protectedFamily(b.family) && dormant && arm !== 'G' && arm !== 'S') out[actGene] = dormant[actGene]!;

  const d1A = new Set(arm === 'G' ? [] : d1Active(b));

  d1Box.forEach((box, i) => {
    const at = d1Offset + i;

    out[at] = d1A.has(at) ? p.d1[box.key] - box.min : arm === 'G' || arm === 'S' ? 0 : (dormant?.[at] ?? 0);
  });

  const cA = new Set(arm === 'G' ? [] : ctlActive(b));

  controlKeys.forEach((k, i) => {
    const at = ctlOffset + i;

    out[at] = cA.has(at) ? ctlIdx(k, p.ctl[k]!) : arm === 'G' || arm === 'S' ? 0 : (dormant?.[at] ?? 0);
  });

  for (let i = 0; i < nS; i++) out[gStructOffset + i] = arm === 'D' ? 0 : gg[i]!;
  numericGenes.forEach((gene, i) => {
    out[gNumOffset + i] = arm === 'D' ? 0 : gene.active(st) || !dormant ? gg[nS + i]! : dormant[gNumOffset + i]!;
  });

  return out;
};

// The ordinal genes a lane of the configuration's arm may vary (for mutation): the free D1 book's active D1 and control
// genes (D, J, C) and Growth's active numeric inputs (G, J, C, S).
export const activeOrdinal = (cfg: Cfg): number[] => {
  const cell = cellOf(cfg.cell);
  const out: number[] = [];

  if (d1Free(cell.arm)) out.push(...d1Active(cell.d1!), ...ctlActive(cell.d1!));
  if (hasGrowth(cell.arm)) {
    const st = structureOf(cfg.g);

    numericGenes.forEach((gene, i) => {
      if (gene.active(st)) out.push(gNumOffset + i);
    });
  }
  return out.sort((a, c) => a - c);
};

// ----- patterns (coverage, promotion shares, shortlist slots, triggers) -----

// the decline gate's K and the activation of the TSLA D1 book, e.g. "K2|e" ('' when none applies or D1 is off)
export const kPatternOf = (cfg: Cfg) => {
  const arm = armOfCell(cfg.cell);

  if (!hasD1(arm)) return '';

  const k = controlValuesOf(cfg, 'VGT').k;

  return k === undefined ? '' : `K${k}`;
};
export const actPatternOf = (cfg: Cfg) => {
  const c = cellOf(cfg.cell);

  if (!hasD1(c.arm) || !protectedFamily(c.d1!.family)) return '';
  return entryDayOf(cfg, 'VGT') ? 'e' : 'n';
};
export const controlPatternOf = (cfg: Cfg) => [kPatternOf(cfg), actPatternOf(cfg)].filter(Boolean).join('|');
export const growthStratumOf = (cfg: Cfg) => (hasGrowth(armOfCell(cfg.cell)) ? gStratumOf(cfg) : '-');
export const classKeyOf = (cfg: Cfg) => `${cfg.cell}|${controlPatternOf(cfg) || '-'}|G ${growthStratumOf(cfg)}`;

export const describeCfg = (cfg: Cfg) => {
  const c = cellOf(cfg.cell);
  const p = partsOf(cfg);
  const d1 = hasD1(c.arm) ? `D1·TSLA[${d1Box.map((b) => p.d1[b.key]).join(',')}] ${JSON.stringify(cfg.controls?.books ?? {})}` : 'D1 off';
  const g = hasGrowth(c.arm)
    ? `Growth·TSLA ${gId(cfg.g)} {${Object.entries(cfg.g)
        .filter(([k]) => k !== 'costBpsPerSide')
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}}`
    : 'Growth off';

  return `${cfg.cell} ${d1} ${g}`;
};

// ----- distance: normalized L∞ over the active numeric coordinates; 1 across cells or activation patterns -----

export const cfgDistance = (a: Cfg, b: Cfg) => {
  if (a.cell !== b.cell || actPatternOf(a) !== actPatternOf(b)) return 1;

  const cell = cellOf(a.cell);
  let d = 0;

  if (hasGrowth(cell.arm)) {
    d = gDistance(a.g, b.g);
    if (d >= 1) return 1;
  }
  if (hasD1(cell.arm)) {
    const pa = partsOf(a);
    const pb = partsOf(b);

    for (const i of d1Active(cell.d1!)) {
      const box = d1Box[i - d1Offset]!;

      d = Math.max(d, Math.abs(pa.d1[box.key] - pb.d1[box.key]) / (box.max - box.min));
    }
    for (const k of controlKeys)
      if (pa.ctl[k] !== undefined && pb.ctl[k] !== undefined) d = Math.max(d, Math.abs(pa.ctl[k]! - pb.ctl[k]!) / (controlBox[k].max - controlBox[k].min));
  }
  return d;
};

// ----- pinning (the lane's fixed structure and every gene outside its arm) -----

export const pinnedOfCell = (cell: Cell): Set<number> => {
  const p = new Set<number>([famGene, gateGene]);
  const arm = cell.arm;
  const allD1 = () => {
    p.add(actGene);
    for (let i = 0; i < nD; i++) p.add(d1Offset + i);
    for (let i = 0; i < nC; i++) p.add(ctlOffset + i);
  };

  if (arm === 'G' || arm === 'S') allD1();
  else {
    const d1A = new Set(d1Active(cell.d1!));
    const cA = new Set(ctlActive(cell.d1!));

    for (let i = 0; i < nD; i++) if (!d1A.has(d1Offset + i)) p.add(d1Offset + i);
    for (let i = 0; i < nC; i++) if (!cA.has(ctlOffset + i)) p.add(ctlOffset + i);
    if (!protectedFamily(cell.d1!.family)) p.add(actGene);
  }
  if (arm === 'D') {
    for (let i = 0; i < nS; i++) p.add(gStructOffset + i);
    for (let i = 0; i < nG; i++) p.add(gNumOffset + i);
  } else {
    p.add(exitsGene);
    p.add(istopGene);
  }
  return p;
};

let frozenGenomeCache = new Map<string, number[]>();

const frozenGenome = (f: FrozenD1) => {
  const k = JSON.stringify(f);
  let g = frozenGenomeCache.get(k);

  if (!g) {
    g = encode(cfgOf(cellOf(cellIdOf('D', { d1: f.structure })), f.d1, f.ctl, f.entryDay, growthOff), 'coarse');
    if (frozenGenomeCache.size > 64) frozenGenomeCache = new Map();
    frozenGenomeCache.set(k, g);
  }
  return g;
};

export const pinCell = (g: number[], cell: Cell) => {
  const arm = cell.arm;

  if (arm === 'G') {
    g[famGene] = 0;
    g[gateGene] = 0;
    g[actGene] = 0;
    for (let i = 0; i < nD + nC; i++) g[d1Offset + i] = 0;
  } else if (arm === 'S') {
    const fg = frozenGenome(cell.frozen!);

    g[famGene] = fg[famGene]!;
    g[gateGene] = fg[gateGene]!;
    g[actGene] = fg[actGene]!;
    for (let i = 0; i < nD + nC; i++) g[d1Offset + i] = fg[d1Offset + i]!;
  } else {
    g[famGene] = families.indexOf(cell.d1!.family);
    g[gateGene] = cell.d1!.gate ? 1 : 0;
    for (const i of pinnedOfCell(cell)) if (i === actGene || (i >= d1Offset && i < gNumOffset)) g[i] = 0;
  }
  if (arm === 'D') for (let i = 0; i < nS; i++) g[gStructOffset + i] = 0;
  if (arm === 'D') for (let i = 0; i < nG; i++) g[gNumOffset + i] = 0;
  if (arm !== 'D') {
    g[exitsGene] = cell.exits!;
    g[istopGene] = cell.istop!;
  }
  return g;
};

// The informed (Track N) machinery of Assignment 3's lane is not used by this study (no incumbent-informed lane):
// its functions exist only so that the derived lane links, and refuse.
export type PairId = string;
export const gateStates = [] as const;
const noInformed = (): never => {
  throw new Error('P6-TSLA has no incumbent-informed (pair) lanes');
};
export const pairOf = (_c: Cell): PairId => noInformed();
export const cellOfPairGate = (_p: PairId, _i: number): Cell => noInformed();
export const pinnedOfPair = (_p: PairId): Set<number> => noInformed();
export const pinPair = (_g: number[], _p: PairId): number[] => noInformed();

// ----- quasi-random screens (NL0's Latin supercube of scrambled Sobol blocks of ≤ 16 genes; this study's seeds) -----

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

// ----- the protected screen strata of a cell (Assignment 3's construction) -----
// Factors: the activation of a protected D1 book (2), the gate's K (4) — arms D, J, C — and Growth's structural stratum
// (NL0's six) — arms G, J, C, S. A screen of n proposals takes floor(n / P) full cycles of every stratum and a greedily
// balanced remainder (Assignment 3's rule, unchanged).

export interface Factor {
  name: string;
  levels: number;
  gene: number; // the genome index it pins (activation, K) or −1 for the Growth stratum
}

export const strataFactors = (cell: Cell): Factor[] => {
  const out: Factor[] = [];

  if (d1Free(cell.arm)) {
    if (protectedFamily(cell.d1!.family)) out.push({ name: 'act', levels: 2, gene: actGene });
    if (cell.d1!.gate) out.push({ name: 'K', levels: 4, gene: ctlOffset + ctlIndex('k') });
  }
  if (hasGrowth(cell.arm)) out.push({ name: 'Growth stratum', levels: growthStrata.length, gene: -1 });
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

export const strataSequence = (cell: Cell, n: number): number[] => {
  const fs = strataFactors(cell);
  const key = `${fs.map((f) => `${f.name}:${f.levels}`).join(',')}|${n}`;
  const hit = strataCache.get(key);

  if (hit) return hit;

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

export const pinStratum = (g: number[], cell: Cell, i: number, n: number) => {
  pinCell(g, cell);

  const fs = strataFactors(cell);

  if (!fs.length) return g;

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

// ----- neighbourhoods (Assignment 3's instrument on the TSLA slot) -----
// A family = n Latin-hypercube rows of u ∈ [−1, 1] over the 64 numeric columns (D1 8, controls 6, Growth 50; common random
// numbers across a cutoff's centres AND arms: the labels never contain the arm, the cell or the stage). A neighbour moves
// every ACTIVE numeric input of the configuration's trading books (arm D: D1 and controls; G: Growth; J, C, S: all — the
// measurement of the pooled configuration, the frozen D1 of arm S included): D1 genes by round(u × scale × Study 8's N1
// radius) grid units, controls by Assignment 2's radii (K never moves), Growth by u × scale × 10 % of the box in value
// units rounded to the fine step; each clipped to its box widened to include the centre; categorical inputs fixed; the
// adaptive bound repaired; duplicates of the centre or of earlier rows dropped.

const unitCol = { d1: 0, ctl: nD, g: nD + nC };
export const unitColumns = nNum; // 64
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

const clipInt = (lo0: number, hi0: number, centre: number, v: number) => {
  const lo = Math.min(lo0, centre);
  const hi = Math.max(hi0, centre);

  return v < lo ? { v: lo, clipped: true } : v > hi ? { v: hi, clipped: true } : { v, clipped: false };
};

const perturbed = (centre: Cfg, family: NFamily, units: number[][], d1Moves: boolean): NeighbourPoint[] => {
  const cell = cellOf(centre.cell);
  const scope = family.scope ?? 'joint';
  const scale = family.scale ?? 1;
  const moveD1 = d1Moves && hasD1(cell.arm) && (scope === 'joint' || scope === 'd1');
  const moveCtl = d1Moves && hasD1(cell.arm) && (scope === 'joint' || scope === 'controls');
  const moveG = hasGrowth(cell.arm) && (scope === 'joint' || scope === 'growth');
  const st = structureOf(centre.g);
  const gActive = numericGenes.map((gene, i) => [gene, i] as const).filter(([gene]) => gene.active(st));
  const p0 = partsOf(centre);
  const b = cell.arm === 'G' ? A0 : cell.d1!;
  const seen = new Set<string>([cfgId(centre)]);
  const out: NeighbourPoint[] = [];

  for (const u of units) {
    let clipped = 0;
    const d1 = { ...p0.d1 };
    const ctl = { ...p0.ctl };
    const g: GConfig = { ...centre.g };

    if (moveD1)
      for (const i of d1Active(b)) {
        const k = i - d1Offset;
        const box = d1Box[k]!;
        const c = clipInt(box.min, box.max, p0.d1[box.key], p0.d1[box.key] + Math.round(u[unitCol.d1 + k]! * scale * d1Radius[box.key]));

        d1[box.key] = c.v;
        if (c.clipped) clipped++;
      }

    if (moveCtl)
      for (const i of ctlActive(b)) {
        const j = i - ctlOffset;
        const key = controlKeys[j]!;
        const box = controlBox[key];

        if (box.radius === 0) continue;

        const idx0 = ctlIdx(key, p0.ctl[key]!);
        const c = clipInt(0, ctlLevels[j]! - 1, idx0, idx0 + Math.round(u[unitCol.ctl + j]! * scale * box.radius));

        ctl[key] = ctlValue(key, c.v);
        if (c.clipped) clipped++;
      }

    if (moveG)
      for (const [gene, i] of gActive) {
        const p = gPerturb(gene, centre.g[gene.key] as number, u[unitCol.g + i]!, 'clip', scale);

        g[gene.key] = p.value;
        if (p.clipped) clipped++;
      }

    let cfg: Cfg;

    try {
      cfg = cfgOf(cell, d1, ctl, p0.entryDay, g);
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

// the MEASUREMENT neighbourhood (rung fits, refinement fits, qualification): every active input of the trading books
export const neighbourhood = (centre: Cfg, family: NFamily, units = unitsOf(family.n, family.labels)): NeighbourPoint[] =>
  perturbed(centre, family, units, true);

// the DESIGN neighbourhood of a seeded lane (new centres around a seed): as the measurement one, except that in arm S
// the frozen D1 finalist never moves (brief §6 Stage E: "Do not let D1 drift during the Growth step")
export const designNeighbourhood = (centre: Cfg, family: NFamily, units = unitsOf(family.n, family.labels)): NeighbourPoint[] =>
  perturbed(centre, family, units, cellOf(centre.cell).arm !== 'S');

// The number of active numeric inputs a scope moves (dimension disclosure).
export const activeInputs = (cfg: Cfg, scope: Scope = 'joint') => {
  const cell = cellOf(cfg.cell);
  const st = structureOf(cfg.g);
  let n = 0;

  if (hasD1(cell.arm)) {
    const b = cell.d1!;

    if (scope === 'joint' || scope === 'd1') n += d1Active(b).length;
    if (scope === 'joint' || scope === 'controls') n += ctlActive(b).filter((i) => controlBox[controlKeys[i - ctlOffset]!].radius > 0).length;
  }
  if (hasGrowth(cell.arm) && (scope === 'joint' || scope === 'growth')) n += numericGenes.filter((gene) => gene.active(st)).length;
  return n;
};

// The active inputs of a configuration that sit on a bound of their box (boundary disclosure).
export const boundaryInputs = (cfg: Cfg): string[] => {
  const cell = cellOf(cfg.cell);
  const out: string[] = [];

  if (hasD1(cell.arm)) {
    const p = partsOf(cfg);

    for (const i of d1Active(cell.d1!)) {
      const box = d1Box[i - d1Offset]!;
      const v = p.d1[box.key];

      if (v === box.min || v === box.max) out.push(`D1.${box.key}=${v}`);
    }
    for (const k of controlKeys) if (p.ctl[k] !== undefined && (p.ctl[k] === controlBox[k].min || p.ctl[k] === controlBox[k].max)) out.push(`ctl.${k}=${p.ctl[k]}`);
  }
  if (hasGrowth(cell.arm)) {
    const st = structureOf(cfg.g);

    for (const gene of numericGenes) {
      if (!gene.active(st)) continue;

      const v = cfg.g[gene.key] as number;

      if (Math.abs(v - gene.min) < 1e-9 || Math.abs(v - gene.max) < 1e-9) out.push(`G.${gene.key}=${v}`);
    }
  }
  return out;
};

// ----- refinement moves (NL0's, within the lane's cell): every free active D1 and control gene with a radius by ±R/2 and
// ±R grid units, K ± 1, a protected book's activation switched (arms D, J, C); every active Growth input by ±R/2 and ±R
// (fine step) and every enabled optional Growth rule switched OFF except the two that define the cell (the initial stop,
// the intraday loss buffer) (arms G, J, C, S). The frozen D1 of arm S never moves. Repaired, de-duplicated, the centre
// excluded. -----

export const maxMoves = 230; // Assignment 3's bound (the TSLA move sets are smaller)

export const movesOf = (c: Cfg, o: { gateSwitches?: boolean } = {}): Cfg[] => {
  if (o.gateSwitches) noInformed();

  const cell = cellOf(c.cell);
  const out = new Map<string, Cfg>();
  const self = cfgId(c);
  const base = partsOf(c);
  const add = (x: typeof base) => {
    try {
      const m = cfgOf(cell, x.d1, x.ctl, x.entryDay, x.g);
      const id = cfgId(m);

      if (id !== self && !out.has(id)) out.set(id, m);
    } catch {
      // an invalid move is not a move
    }
  };
  const steps = (R: number) => [...new Set([0.5, 1].map((f) => Math.max(1, Math.round(f * R))))];

  if (d1Free(cell.arm)) {
    const b = cell.d1!;

    for (const i of d1Active(b)) {
      const box = d1Box[i - d1Offset]!;

      for (const step of steps(d1Radius[box.key]))
        for (const sign of [-1, 1]) {
          const v = base.d1[box.key] + sign * step;

          if (v >= box.min && v <= box.max) add({ ...base, d1: { ...base.d1, [box.key]: v } });
        }
    }

    for (const i of ctlActive(b)) {
      const key = controlKeys[i - ctlOffset]!;
      const box = controlBox[key];
      const idx0 = ctlIdx(key, base.ctl[key]!);

      for (const step of box.radius > 0 ? steps(box.radius) : [1])
        for (const sign of [-1, 1]) {
          const idx = idx0 + sign * step;

          if (idx >= 0 && idx < ctlLevels[ctlIndex(key)]!) add({ ...base, ctl: { ...base.ctl, [key]: ctlValue(key, idx) } });
        }
    }

    if (protectedFamily(b.family)) add({ ...base, entryDay: !base.entryDay });
  }

  if (hasGrowth(cell.arm)) {
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

    const offs: [boolean, string][] = [
      [st.trend !== 'off', 'trendFilterEnabled'],
      [st.elig !== 'off', 'eligibilityEnabled'],
      [st.gate === 'on', 'drawdownRecoveryGateEnabled'],
      [st.retain === 'on', 'retentionEnabled'],
      [st.cont !== 'off', 'continuationEnabled']
    ];

    for (const [on, key] of offs) if (on) add({ ...base, g: { ...c.g, [key]: false } });
  }

  const moves = [...out.values()];

  for (const m of moves) if (m.cell !== c.cell) throw new Error(`a refinement move left the cell ${c.cell}`);
  return moves;
};

export { adaptiveMargin, controlBox, controlKeys, d1Radius, families, growthStrata, protectedFamily };

// The 4A configuration space (PROTOCOL.md §6). A configuration is ONE Growth·GDX book alone on the fixed $100,000
// budget: OFF (cash, the zero reference: no book enabled, never selectable) or ON with a Growth 1.4.0 vector on growth140's
// 8 structural and 50 conditional numeric genes and canonical boxes, at the schema's FINE step (0.1 percentage point, 1
// session or bar), so Appendix A and every predeclared prior GDX vector is exactly representable. D1·GDX, D1·VGT and
// Growth·VGT are disabled (Priority 3's placeholder vectors, never run or funded).
//
// IDENTITY. The configuration's Priority 3 quad and its enabled mask: id = sha256(16) of the mask and the canonical quad
// text (3C's pointId). Inactive genes never create a second configuration; the GDX vector's own browser identity
// (`gId`, e.g. Appendix A 07cac3329fc7a520) is kept beside it.
//
// NEIGHBOURHOODS (§8). One Latin hypercube of u ∈ [−1, 1] per seed family over Priority 3's 116 numeric columns (only the
// 50 Growth·GDX columns are ever used here), common random numbers across every centre of a cutoff: every ACTIVE numeric
// GDX input moves by u × scale × radius (10% of its box), rounded to its fine step and clipped to the box widened to
// include the centre; categorical inputs fixed; inactive inputs untouched; orders repaired. Rows are kept with their
// index; statistics drop duplicates of the centre or of earlier rows (standard §5.3).
import { createHash } from 'node:crypto';
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
  fineStepOf,
  numericGenes,
  perturb as gPerturb,
  radiusValue,
  repair,
  roundStep,
  structuralGenes,
  structureOf
} from '../growth140-vgt-stable/space.ts';
import { type BookId, type D1Grid, bookIds } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import {
  type Quad,
  d1Box,
  d1Placeholder,
  d1Radius,
  normalize,
  quadCanonical,
  quadId
} from '../vg-d1-growth-joint/space.ts';
import { type Sym, seedOf, symbols } from './context.ts';

export type { GConfig, Quad, D1Grid };
export { gId, quadId, normalize, structureOf, numericGenes, structuralGenes, d1Box, d1Placeholder };

// ----- the one arm: standalone GDX -----

export const arms = ['S'] as const;
export type Arm = (typeof arms)[number];
export const armLabel: Record<Arm, string> = { S: 'Growth·GDX alone on one fixed $100,000 budget' };
export const baselineLabel: Record<Arm, string> = { S: 'cash (no position)' };

// The frozen "anchors" of the arm: none (every other book disabled, Priority 3's D1 placeholders).
export interface Anchor {
  arm: Arm;
  d1: Record<Sym, D1Grid>;
  vgt: GConfig; // Priority 3's placeholder (Growth·VGT disabled)
  books: BookId[]; // the enabled anchor books: none
}

// Priority 3's placeholder Growth vector (a disabled Growth book; identity 1af5b55987a56e2f).
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

export const anchorS: Anchor = {
  arm: 'S',
  d1: { GDX: { ...d1Placeholder }, VGT: { ...d1Placeholder } },
  vgt: gPlaceholder,
  books: []
};

export interface Cfg {
  arm: Arm;
  gdx: GConfig | null; // null: Growth·GDX OFF (the baseline)
}

export const canonicalGdx = (g: GConfig) => effectiveOf(repair({ ...g }));

export const enabledOfCfg = (a: Anchor, c: Pick<Cfg, 'gdx'>): BookId[] =>
  bookIds.filter((b) => a.books.includes(b) || (b === 'G:GDX' && c.gdx !== null));

export const optionsOfEnabled = (enabled: readonly BookId[]): EvalOptions => {
  const off = bookIds.filter((b) => !enabled.includes(b));

  return off.length
    ? { enabled: Object.fromEntries(off.map((b) => [b, false])) as Partial<Record<BookId, boolean>> }
    : {};
};

export const quadOf = (a: Anchor, gdx: GConfig | null): Quad =>
  normalize({
    d1: { GDX: { ...a.d1.GDX }, VGT: { ...a.d1.VGT } },
    g: { GDX: gdx ?? gPlaceholder, VGT: a.vgt },
    first: 'D1'
  });

export const enabledKeyOf = (enabled: readonly BookId[]) => bookIds.map((b) => (enabled.includes(b) ? 1 : 0)).join('');
export const pointId = (enabled: readonly BookId[], q: Quad) =>
  createHash('sha256')
    .update(`en${enabledKeyOf(enabled)}#${quadCanonical(q)}`)
    .digest('hex')
    .slice(0, 16);

export interface Built {
  cfg: Cfg;
  quad: Quad;
  enabled: BookId[];
  options: EvalOptions;
  id: string;
  p3Id: string;
}

export const build = (a: Anchor, gdx: GConfig | null): Built => {
  const g = gdx === null ? null : canonicalGdx(gdx);
  const quad = quadOf(a, g);
  const enabled = enabledOfCfg(a, { gdx: g });

  return {
    cfg: { arm: a.arm, gdx: g },
    quad,
    enabled,
    options: optionsOfEnabled(enabled),
    id: pointId(enabled, quad),
    p3Id: quadId(quad)
  };
};

// ----- cells and screen strata -----

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

// The protected screen strata within an entry cell (round-robin; brief: protect Rise and breakout and meaningful
// combinations of drawdown-recovery gating, trend filtering, native persistent eligibility (Rise only), losing-hold
// limits, initial-stop structure and trend retention / partial exits, OFF alternatives included): recovery gate off/on ×
// trend filter off/on × (Rise only) eligibility off/on × maximum losing hold off/on × initial stop off/on × retention
// off/on — 64 Rise strata, 32 breakout strata. An "on" stratum keeps the quasi-random method, policy or buffer if it is
// one, otherwise takes method 1 + (round mod its count). Continuation (off | 4 methods), the trailing stop (mandatory)
// and every numeric input stay quasi-random and are reported per class.
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

// ----- the GDX genome (fine resolution; growth140-vgt-stable's configOfFine / fineGenomeOf) -----

export type Genome = number[];
export const levels = fineLevels; // 8 structural + 50 numeric
export const decodeGdx = (g: Genome): GConfig => configOfFine(g);
export const encodeGdx = (c: GConfig): Genome => fineGenomeOf(c);

// Whether a GDX vector sits exactly on the fine grid (seed representability).
export const onFineGrid = (c: GConfig) => {
  try {
    return gId(decodeGdx(encodeGdx(c))) === gId(canonicalGdx(c));
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

// ----- distance (normalized L∞ over the active GDX inputs; 1 across structures or against the baseline) -----

export const gdxDistance = (a: GConfig | null, b: GConfig | null) =>
  a === null || b === null ? (a === b ? 0 : 1) : configDistance(a, b);

// The structural class of a GDX book (coverage tables, the shortlist's slots).
export const classOf = (g: GConfig | null) => {
  if (!g) return 'GDX OFF';

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
  if (!g) return 'GDX OFF';

  const s = structureOf(g);

  return `${entryOf(g)}|gate ${s.gate}|trend ${s.trend === 'off' ? 'off' : 'on'}|elig ${s.elig === 'off' ? 'off' : 'on'}|hold ${s.exits === 'hold_off' ? 'off' : 'on'}|istop ${s.istop}|retain ${s.retain}`;
};

// The stratum of a GDX book (the screen's protected cells; coverage tables).
export const stratumOf = coarseClassOf;

// ----- neighbourhoods -----

export type Scope = 'joint' | 'gdx' | 'anchors';

export interface NFamily {
  name: string;
  n: number;
  labels: (string | number)[];
  scope: Scope;
  scale?: number;
}

const nD = d1Box.length;
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

export interface Row {
  row: number;
  quad: Quad;
  options: EvalOptions;
  id: string;
  clipped: number;
  dup: boolean; // equal to the centre or to an earlier row (dropped from the statistics, kept for pairing)
}

const clip = (lo0: number, hi0: number, centre: number, v: number) => {
  const lo = Math.min(lo0, centre);
  const hi = Math.max(hi0, centre);

  return v < lo ? { v: lo, clipped: true } : v > hi ? { v: hi, clipped: true } : { v, clipped: false };
};

// Which books a scope moves, given the enabled books (a disabled book is never moved: it is inert).
export const scopeMoves = (scope: Scope, enabled: readonly BookId[]) =>
  bookIds.filter(
    (b) => enabled.includes(b) && (scope === 'joint' || (scope === 'gdx' ? b === 'G:GDX' : b !== 'G:GDX'))
  );

export const rowsOf = (centre: Built, family: NFamily, units = unitsOf(family.n, family.labels)): Row[] => {
  const moves = scopeMoves(family.scope, centre.enabled);
  const scale = family.scale ?? 1;
  const q0 = centre.quad;
  const active = Object.fromEntries(
    symbols.map((s) => [s, numericGenes.map((g, i) => [g, i] as const).filter(([g]) => g.active(structureOf(q0.g[s])))])
  ) as Record<Sym, (readonly [(typeof numericGenes)[number], number])[]>;
  const seen = new Set<string>([centre.id]);

  return units.map((u, row) => {
    let clipped = 0;
    const d1 = { GDX: { ...q0.d1.GDX }, VGT: { ...q0.d1.VGT } };
    const g = { GDX: { ...q0.g.GDX }, VGT: { ...q0.g.VGT } };

    for (const s of symbols) {
      if (moves.includes(`D1:${s}`))
        d1Box.forEach((box, i) => {
          const c = clip(
            box.min,
            box.max,
            q0.d1[s][box.key],
            q0.d1[s][box.key] + Math.round(u[unitCol.d1[s] + i]! * scale * d1Radius[box.key])
          );

          d1[s][box.key] = c.v;
          if (c.clipped) clipped++;
        });

      if (moves.includes(`G:${s}`))
        for (const [gene_, i] of active[s]) {
          const p = gPerturb(gene_, q0.g[s][gene_.key] as number, u[unitCol.g[s] + i]!, 'clip', scale);

          g[s][gene_.key] = p.value;
          if (p.clipped) clipped++;
        }
    }

    const quad = normalize({ d1, g, first: q0.first });
    const id = pointId(centre.enabled, quad);
    const dup = seen.has(id);

    seen.add(id);
    return { row, quad, options: centre.options, id, clipped, dup };
  });
};

// The number of active numeric inputs a scope moves (dimension disclosure).
export const activeInputs = (centre: Built, scope: Scope) => {
  let n = 0;

  for (const b of scopeMoves(scope, centre.enabled)) {
    const s = b.slice(b.indexOf(':') + 1) as Sym;

    n += b.startsWith('D1:') ? nD : numericGenes.filter((g) => g.active(structureOf(centre.quad.g[s]))).length;
  }
  return n;
};

// ----- local moves (refinement; GDX only): every active GDX input ±R/2 and ±R (fine step, inside the box) and every
// enabled optional GDX rule switched OFF -----

export const gdxMoves = (g: GConfig): GConfig[] => {
  const out: GConfig[] = [];
  const s = structureOf(g);
  const add = (m: GConfig) => {
    try {
      out.push(canonicalGdx(m));
    } catch {
      // an invalid move is not a move
    }
  };

  for (const gn of activeGenes(s)) {
    const step = fineStepOf(gn);

    for (const f of [0.5, 1])
      for (const sign of [-1, 1]) {
        const v = roundStep((g[gn.key] as number) + sign * Math.max(step, roundStep(f * radiusValue(gn), step)), step);

        if (v < gn.min - 1e-9 || v > gn.max + 1e-9) continue;
        add({ ...g, [gn.key]: v });
      }
  }

  const off: [boolean, string][] = [
    [s.trend !== 'off', 'trendFilterEnabled'],
    [s.elig !== 'off', 'eligibilityEnabled'],
    [s.gate === 'on', 'drawdownRecoveryGateEnabled'],
    [s.istop === 'on', 'initialStopEnabled'],
    [s.retain === 'on', 'retentionEnabled'],
    [s.cont !== 'off', 'continuationEnabled'],
    [s.exits === 'hold_on_buffer_on', 'intradayLossBufferEnabled']
  ];

  for (const [on, key] of off) if (on) add({ ...g, [key]: false });

  const self = gId(canonicalGdx(g));

  return [...new Map(out.map((m) => [gId(m), m])).values()].filter((m) => gId(m) !== self);
};

// The report-only categorical toggles of a partner: every enabled optional GDX rule OFF.
export const gdxToggles = (g: GConfig): Record<string, GConfig> => {
  const s = structureOf(g);
  const out: Record<string, GConfig> = {};
  const add = (name: string, key: string) => {
    try {
      out[name] = canonicalGdx({ ...g, [key]: false });
    } catch {
      // not a valid alternative
    }
  };

  if (s.retain === 'on') add('G·GDX retention OFF', 'retentionEnabled');
  if (s.gate === 'on') add('G·GDX recovery gate OFF', 'drawdownRecoveryGateEnabled');
  if (s.trend !== 'off') add('G·GDX trend filter OFF', 'trendFilterEnabled');
  if (s.elig !== 'off') add('G·GDX eligibility OFF', 'eligibilityEnabled');
  if (s.istop === 'on') add('G·GDX initial stop OFF', 'initialStopEnabled');
  if (s.cont !== 'off') add('G·GDX continuation OFF', 'continuationEnabled');
  if (s.exits === 'hold_on_buffer_on') add('G·GDX loss buffer OFF', 'intradayLossBufferEnabled');
  return out;
};

export const describeG = (g: GConfig) =>
  Object.entries(g)
    .filter(([k]) => k !== 'costBpsPerSide')
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

// The standalone configuration of a GDX vector (null: cash, no book enabled).
export const buildS = (gdx: GConfig | null): Built => build(anchorS, gdx);

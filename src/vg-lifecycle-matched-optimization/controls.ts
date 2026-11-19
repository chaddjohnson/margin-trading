// The controls, the 5A mechanism controls and the informed seeds (PROTOCOL.md §4): every exact vector, enabled mask and
// sealed development centre is read from sealed, sha256-pinned records — never rebuilt from prose:
// - Priority 5A's verified subject loader (src/vg-growth-funding-lifecycle/subjects.ts: Priority 3's pinned records and
//   CONTROL_MANIFEST.json via Priority 3A's loader): D, C4, C85, E, A, B, IP, GP85 (and 5A's sealed L0/L1/L2 centres,
//   the lifecycle reproduction targets);
// - Priority 3B's FROZEN_SELECTION.json (pinned): C4-refined (`C24/informed-fixed#1 profit`) and the three 3B seeds.
// Each is mapped to a configuration (inclusion choice + canonical quad) whose identity must equal the published one, so
// the configuration evaluated here IS the archived phenotype.
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../growth140-vgt-s8m/store.ts';
import { type BookId, d1StrategyParams, growthParamsOf } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Subject, loadSubjects } from '../vg-growth-funding-lifecycle/subjects.ts';
import { type Mode, type Sym, repoRoot, symbols } from './context.ts';
import {
  type Cfg,
  type GConfig,
  type Inc,
  canonicalOf,
  cfgId,
  encode,
  gId,
  growthOn,
  incOfEnabled,
  placeholder,
  quadId
} from './config.ts';
import { sha256File } from './records.ts';
import type { Seed } from './search.ts';

export const growth = {
  g4: '420cd989e4fa7749',
  g085: '08500a60ec56cfae',
  appA: '07cac3329fc7a520',
  c4RefinedVgt: 'c3c1c0d56c4ee3b0'
} as const;

// The pinned sealed sources.
export const sources = {
  p3bFrozenSelection: {
    file: 'research/vg-d1-growth-expanded/FROZEN_SELECTION.json',
    sha256: 'f76299683bcb92a9175864daaf3b46f1aab62879a14aeda49a7f9ad3f5bf422e'
  },
  p5aCentres: {
    file: 'research/vg-growth-funding-lifecycle/results/development/centres.json',
    sha256: '09afda78f6fa40fb18a43557e4e24a3bf7fe159c148cc6858b72b2c31785feb8'
  }
} as const;

export const readPinned = <T>(src: { file: string; sha256: string }): T => {
  const file = path.join(repoRoot, src.file);
  const sha = sha256File(file);

  if (sha !== src.sha256) throw new Error(`${src.file}: sha256 ${sha} is not the pinned ${src.sha256}`);
  return decode<T>(fs.readFileSync(file, 'utf8'));
};

export interface Control {
  key: string;
  label: string;
  role: 'benchmark' | 'control' | 'd1-only' | 'mechanism';
  selectable: boolean; // a member of the C24 final selectable set under the same gates and primary rule
  cfg: Cfg | null; // null: not a configuration of this space (the D1-only pool, a Growth-only pool)
  quad: Subject['quad'];
  options: EvalOptions;
  p3Id: string; // Priority 3 quadId of the exact phenotype
  enabled: BookId[];
  source: string;
  sealedL0: { net: number; dd: number; lots: number } | null; // the sealed development centre (L0)
}

// The exact controls (brief "Portfolio scope and controls") and the 5A mechanism controls that exercised refusals.
export const controlKeys: { key: string; label: string; role: Control['role']; selectable: boolean }[] = [
  { key: 'C4', label: 'C4: VG #2 + VGT Growth #4; GDX Growth OFF', role: 'benchmark', selectable: true },
  {
    key: 'C4R',
    label: 'C4-refined: 3B C24/informed-fixed#1 profit — VG #2 D1 unchanged + refined VGT Growth; GDX Growth OFF',
    role: 'benchmark',
    selectable: true
  },
  { key: 'D', label: 'D: VG #2 Balanced S8-VG-F24-3 D1 only (VGT + GDX); Growth OFF', role: 'd1-only', selectable: false },
  { key: 'C85', label: 'C85: VG #2 + VGT Growth 08500a60; GDX Growth OFF', role: 'control', selectable: true },
  { key: 'E', label: 'E: VG #2 + existing GDX Growth (Appendix A); VGT Growth OFF', role: 'control', selectable: true },
  { key: 'A', label: 'A: VG #2 + VGT Growth #4 + existing GDX Growth (both Growth symbols)', role: 'control', selectable: true },
  { key: 'B', label: 'B: VG #2 + VGT Growth 08500a60 + existing GDX Growth (both Growth symbols)', role: 'control', selectable: true },
  { key: 'IP', label: 'Priority 3 informed primary 575545f4 (5A mechanism control: breakout re-requests)', role: 'mechanism', selectable: false },
  { key: 'GP85', label: 'Growth only: VGT 08500a60 + Appendix A (5A mechanism control: both Growth symbols, L2 entry)', role: 'mechanism', selectable: false }
];

// The 5A subjects whose sealed L0/L1/L2 development centres stage V reproduces through this study's path.
export const p5aReproductionKeys = ['D', 'C4', 'C85', 'E', 'A', 'B', 'IP', 'GP85'] as const;

const cfgOfSubject = (s: Subject): Cfg | null => {
  const inc = incOfEnabled(s.enabled);

  if (!inc) return null;

  const c = canonicalOf(inc, s.quad);

  if (s.quad.first === 'D1' && quadId(c.quad) !== s.id)
    throw new Error(`${s.key}: the canonical configuration ${quadId(c.quad)} is not the archived ${s.id}`);
  return c;
};

const optionsOfEnabled = (inc: Inc): EvalOptions =>
  inc === 'B' ? {} : { enabled: { [inc === 'V' ? 'G:GDX' : 'G:VGT']: false } as Partial<Record<BookId, boolean>> };

// A 3B frozen-selection member as a configuration of this space (its identity must be 3B's).
interface P3bMember {
  label: string;
  id: string;
  inc: Inc;
  net: number;
  dd: number;
  lots: number;
  qualified: boolean;
  settings: {
    inclusion: Inc;
    priority3QuadId: string;
    d1: Record<Sym, { grid: Cfg['quad']['d1']['GDX'] }>;
    growth: Record<Sym, { enabled: boolean; effective?: GConfig; identity?: string }>;
  };
}

export const p3bMembers = {
  C4R: { label: 'C24/informed-fixed#1 profit', id: '0f017f0ab9b26f24', p3Id: '07443ffaeef41e85' },
  IJ1: { label: 'C24/informed-joint#1 profit', id: '940fdaf770eedc9d', p3Id: null },
  IJ3: { label: 'C24/informed-joint#3 both Growth funded', id: 'f6b797363d32ec8b', p3Id: null },
  GB1: { label: 'C24/indep/G_GDX-breakout#1 profit', id: '043d1cab196c7f78', p3Id: null }
} as const;

export const p3bCfg = (key: keyof typeof p3bMembers) => {
  const want = p3bMembers[key];
  const sel = readPinned<{ finalSet: P3bMember[] }>(sources.p3bFrozenSelection);
  const m = sel.finalSet.find((x) => x.label === want.label);

  if (!m) throw new Error(`3B member ${want.label} not found`);
  if (m.id !== want.id) throw new Error(`3B member ${want.label}: id ${m.id} ≠ ${want.id}`);

  const inc = m.settings.inclusion;
  const cfg = canonicalOf(inc, {
    d1: { GDX: { ...m.settings.d1.GDX.grid }, VGT: { ...m.settings.d1.VGT.grid } },
    g: {
      GDX: growthOn(inc, 'GDX') ? m.settings.growth.GDX.effective! : placeholder,
      VGT: growthOn(inc, 'VGT') ? m.settings.growth.VGT.effective! : placeholder
    },
    first: 'D1'
  });

  if (cfgId(cfg) !== want.id) throw new Error(`3B member ${want.label}: rebuilt id ${cfgId(cfg)} ≠ ${want.id}`);
  if (quadId(cfg.quad) !== m.settings.priority3QuadId) throw new Error(`3B member ${want.label}: quad id`);
  if (want.p3Id && quadId(cfg.quad) !== want.p3Id) throw new Error(`3B member ${want.label}: not ${want.p3Id}`);
  return { cfg, member: m };
};

let cache: { subjects: Subject[]; controls: Control[] } | null = null;

export const loadControls = () => {
  if (cache) return cache;

  const subjects = loadSubjects();
  const byKey = new Map(subjects.map((s) => [s.key, s]));
  const c4r = p3bCfg('C4R');
  const controls = controlKeys.map((k): Control => {
    if (k.key === 'C4R')
      return {
        ...k,
        cfg: c4r.cfg,
        quad: c4r.cfg.quad,
        options: optionsOfEnabled('V'),
        p3Id: quadId(c4r.cfg.quad),
        enabled: ['D1:GDX', 'D1:VGT', 'G:VGT'],
        source: `${sources.p3bFrozenSelection.file} finalSet "${c4r.member.label}"`,
        sealedL0: { net: c4r.member.net, dd: c4r.member.dd, lots: c4r.member.lots }
      };

    const s = byKey.get(k.key);

    if (!s) throw new Error(`subject ${k.key} missing`);
    return {
      ...k,
      cfg: cfgOfSubject(s),
      quad: s.quad,
      options: s.options,
      p3Id: s.id,
      enabled: s.enabled,
      source: `Priority 5A subject ${s.key} (${s.p3Key ? `Priority 3 ${s.p3Key}` : 'new in 5A'})`,
      sealedL0: s.sealedCentre ? { net: s.sealedCentre.net, dd: s.sealedCentre.dd, lots: s.sealedCentre.lots } : null
    };
  });
  const c = (key: string) => controls.find((x) => x.key === key)!;
  const g = (key: string, sym: Sym) => gId(c(key).quad.g[sym]);

  // the brief's identities
  if (c('C4').p3Id !== 'f324035d15f69610') throw new Error('C4 is not f324035d15f69610');
  if (c('C4R').p3Id !== '07443ffaeef41e85') throw new Error('C4-refined is not 07443ffaeef41e85');
  if (c('D').p3Id !== '7a377d49c2b9aa55') throw new Error('D is not 7a377d49c2b9aa55');
  if (g('C4', 'VGT') !== growth.g4 || g('A', 'VGT') !== growth.g4) throw new Error('Growth #4 identity');
  if (g('C4R', 'VGT') !== growth.c4RefinedVgt) throw new Error('C4-refined VGT Growth identity');
  if (g('C85', 'VGT') !== growth.g085 || g('B', 'VGT') !== growth.g085) throw new Error('Growth 08500a60 identity');
  if (g('E', 'GDX') !== growth.appA || g('A', 'GDX') !== growth.appA || g('B', 'GDX') !== growth.appA)
    throw new Error('Appendix A identity');
  for (const k of ['C4', 'C4R', 'C85', 'E', 'A', 'B'])
    if (JSON.stringify(c(k).quad.d1) !== JSON.stringify(c('D').quad.d1)) throw new Error(`${k}: its D1 books are not VG #2's`);
  if (c('C4').cfg?.inc !== 'V' || c('C4R').cfg?.inc !== 'V' || c('E').cfg?.inc !== 'G' || c('A').cfg?.inc !== 'B')
    throw new Error('control inclusion choices');

  cache = { subjects, controls };
  return cache;
};

export const controlOf = (key: string) => {
  const x = loadControls().controls.find((c) => c.key === key);

  if (!x) throw new Error(`control ${key} missing`);
  return x;
};

export const vg2D1 = () => controlOf('D').quad.d1;

// The 5A sealed development centres (L0, L1, L2) of the reproduction subjects.
export const p5aCentres = () =>
  readPinned<{ centres: Record<string, { id: string; modes: Record<Mode, { rec: Rec }> }> }>(sources.p5aCentres).centres;

// ----- the informed seeds (brief: centred on C4, C4-refined and a small predeclared set of structurally diverse existing
// combinations), identical in all three arms; each seed enters unchanged with its own D1 vectors, in its own inclusion
// choice. C4 and C4-refined are the focus seeds (focused designs and refinement starts). -----

export const informedSeedKeys = [
  { key: 'C4', why: 'V, Rise #4 with trend filter and initial stop; the user-preferred benchmark (focus)', focus: true },
  { key: 'C4R', why: 'V, refined #4 relative (trend filter and initial stop OFF); the user-considered favourite (focus)', focus: true },
  { key: 'C85', why: 'V, a different VGT Rise phenotype (08500a60)', focus: false },
  { key: 'E', why: 'G, existing GDX Rise Growth (Appendix A)', focus: false },
  { key: 'A', why: 'B, both Growth symbols (#4 + Appendix A); refusals exercised in 5A', focus: false },
  { key: 'IJ1', why: 'V with refined D1 books (3B formal primary)', focus: false },
  { key: 'IJ3', why: 'B with all four books funded (3B informed-joint#3)', focus: false },
  { key: 'GB1', why: 'G with a GDX breakout entry (3B independent G actual-profit holder)', focus: false },
  { key: 'IP', why: 'B with a VGT breakout entry (Priority 3 informed primary; breakout re-requests in 5A)', focus: false }
] as const;

export const seedCfg = (key: string): Cfg => {
  if (key === 'IJ1' || key === 'IJ3' || key === 'GB1') return p3bCfg(key).cfg;

  const x = controlOf(key);

  if (!x.cfg) throw new Error(`seed ${key} is not a configuration of this space`);
  return x.cfg;
};

export const informedSeeds = (): Seed[] => {
  const out = informedSeedKeys.map((k) => {
    const cfg = seedCfg(k.key);

    return { label: k.key, cfg, genome: encode(cfg, 'fine'), focus: k.focus };
  });

  if (new Set(out.map((s) => cfgId(s.cfg))).size !== out.length) throw new Error('duplicate informed seeds');
  return out;
};

// The Growth partners an informed refinement may add when it switches a V or G configuration to B (Priority 3B's):
// Appendix A on GDX; #4 and 08500a60 on VGT.
export const partners = () => ({
  GDX: [controlOf('A').quad.g.GDX],
  VGT: [controlOf('A').quad.g.VGT, controlOf('B').quad.g.VGT]
});

// ----- complete effective settings (brief "Final evaluation and delivery": complete parameters) -----

export const lifecycleLabels: Record<Mode, string> = {
  L0: 'L0 — current virtual-book model: a refused Growth entry becomes an unfunded virtual position and waits for its virtual exit; funding never feeds back; virtual continuation rights kept',
  L1: 'L1 — actual funding: a refused Growth request leaves no order or position and consumes that attempted opportunity; later entries require fresh canonical opportunities; continuation only from actual funded exits',
  L2: 'L2 — L1 plus at most one preserved refused base opportunity per Growth book (20 sessions, 5% price extension; native expiry, invalidation, supersession, gates, daily reassessment, current-price execution)'
};

export const allocatorSettings = (mode: Mode) => ({
  growthLifecycle: lifecycleLabels[mode],
  d1Lifecycle: 'canonical shadow book in every arm (refusals never feed back into D1)',
  architecture: 'A: one exclusive funded slot',
  principalBudget: 100_000,
  compounding: false,
  preemption: false,
  simultaneousFundedPositions: false,
  partialExitReleasesSlot: false,
  sameInstantOrder: ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'],
  costBpsPerSide: 5,
  commission: 0,
  interest: '11% simple annual on outstanding principal, calendar days / 365',
  stopFill: 'at the stop or the gapped open; no extra slippage',
  shares: 'fractional',
  fundingFrom: '2016-01-04',
  d1Arming: 'harmonized: from the first session (each D1 machine arms once its reference high exists)',
  d1DelayedEligibility: false
});

export const settingsOf = (c: Cfg, mode: Mode) => {
  const window = { from: '2016-01-04', to: '2024-12-31' };

  return {
    id: cfgId(c),
    priority3QuadId: quadId(c.quad),
    inclusion: c.inc,
    lifecycle: mode,
    enabled: (['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'] as const).filter(
      (b) => b.startsWith('D1:') || growthOn(c.inc, b.slice(2) as Sym)
    ),
    d1: Object.fromEntries(
      symbols.map((s) => [
        s,
        { grid: c.quad.d1[s], unit: 'tenths of a percentage point / days / sessions', strategyParams: d1StrategyParams(s, c.quad.d1[s]) }
      ])
    ),
    growth: Object.fromEntries(
      symbols.map((s) => [
        s,
        growthOn(c.inc, s)
          ? { enabled: true, identity: gId(c.quad.g[s]), effective: c.quad.g[s], engineParams: growthParamsOf(c.quad.g[s], s, window) }
          : { enabled: false, placeholderIdentity: gId(c.quad.g[s]), note: 'disabled: never run or funded (placeholder vector)' }
      ])
    ),
    allocator: allocatorSettings(mode)
  };
};

export const controlManifest = () => {
  const { controls } = loadControls();

  return {
    kind: 'vg-lifecycle-matched-optimization control manifest',
    sources: {
      ...sources,
      p5aLoader:
        "Priority 5A's verified loader (src/vg-growth-funding-lifecycle/subjects.ts) over Priority 3's sha256-pinned records and CONTROL_MANIFEST.json"
    },
    growthIdentities: growth,
    controls: controls.map((c) => ({
      key: c.key,
      label: c.label,
      role: c.role,
      selectable: c.selectable,
      priority3Id: c.p3Id,
      id: c.cfg ? cfgId(c.cfg) : null,
      enabled: c.enabled,
      source: c.source,
      settings: c.cfg ? settingsOf(c.cfg, 'L0') : { quad: c.quad, options: c.options },
      sealedDevelopmentCentreL0: c.sealedL0
    })),
    p5aReproduction: p5aReproductionKeys,
    informedSeeds: informedSeedKeys.map((k) => {
      const cfg = seedCfg(k.key);

      return { key: k.key, why: k.why, focus: k.focus, id: cfgId(cfg), priority3QuadId: quadId(cfg.quad), inclusion: cfg.inc, settings: settingsOf(cfg, 'L0') };
    }),
    partners: Object.fromEntries(Object.entries(partners()).map(([s, l]) => [s, l.map((x) => gId(x))])),
    c4Refined: (() => {
      const r = controlOf('C4R').quad.g.VGT;
      const o = controlOf('C4').quad.g.VGT;
      const keys = [...new Set([...Object.keys(r), ...Object.keys(o)])].sort();

      return {
        alias: 'C4-refined = Priority 3B C24/informed-fixed#1 profit (not informed-joint#1)',
        differencesFromGrowth4: keys
          .filter((k) => JSON.stringify((r as Record<string, unknown>)[k]) !== JSON.stringify((o as Record<string, unknown>)[k]))
          .map((k) => ({ setting: k, growth4: (o as Record<string, unknown>)[k] ?? '(inactive)', c4Refined: (r as Record<string, unknown>)[k] ?? '(inactive)' }))
      };
    })()
  };
};

export type { Inc };

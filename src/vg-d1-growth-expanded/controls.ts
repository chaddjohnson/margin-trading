// The controls, historical comparisons and informed seeds (PROTOCOL.md §4): every exact vector, enabled mask and sealed
// development centre is read from Priority 5A's verified subject loader (src/vg-growth-funding-lifecycle/subjects.ts:
// Priority 3's sha256-pinned qualification records and CONTROL_MANIFEST.json via Priority 3A's loader) — never rebuilt
// from prose. Each is mapped to a 3B configuration (inclusion choice + canonical quad) and checked: the canonical quad
// must hash to the subject's own Priority 3 identity, so the configuration evaluated here IS the archived phenotype.
import { type Subject, loadSubjects } from '../vg-growth-funding-lifecycle/subjects.ts';
import { type BookId, d1StrategyParams, growthParamsOf } from '../vg-d1-growth-joint/books.ts';
import { type Sym, symbols } from './context.ts';
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
  incs,
  quadId
} from './config.ts';
import type { Seed } from './search.ts';

export const growth = {
  g4: '420cd989e4fa7749',
  g085: '08500a60ec56cfae',
  appA: '07cac3329fc7a520'
} as const;

export interface Control {
  key: string;
  label: string;
  role: 'benchmark' | 'control' | 'd1-only' | 'historical' | 'smaller-universe';
  selectable: boolean; // a member of the final selectable set under the same gates and primary rule
  cfg: Cfg | null; // null: not a 3B configuration (D1-only, VGT-only)
  subject: Subject;
  p3Id: string; // Priority 3 quadId of the exact phenotype
  enabled: BookId[];
}

// The keys of the exact controls (brief §4) and the historical comparisons (Priority 3's primaries; brief §4 "retain
// Priority 3's informed and independent primaries as historical comparisons").
export const controlKeys: { key: string; label: string; role: Control['role']; selectable: boolean }[] = [
  { key: 'C4', label: 'C4: VG #2 + VGT Growth #4; GDX Growth OFF (preferred benchmark)', role: 'benchmark', selectable: true },
  { key: 'E', label: 'E: VG #2 + existing GDX Growth (Appendix A); VGT Growth OFF', role: 'control', selectable: true },
  { key: 'A', label: 'A: VG #2 + VGT Growth #4 + existing GDX Growth', role: 'control', selectable: true },
  { key: 'B', label: 'B: VG #2 + VGT Growth 08500a60 + existing GDX Growth', role: 'control', selectable: true },
  { key: 'C85', label: 'C85: VG #2 + VGT Growth 08500a60; GDX Growth OFF', role: 'control', selectable: true },
  { key: 'D', label: 'D: VG #2 D1 only', role: 'd1-only', selectable: false },
  { key: 'IP', label: 'Priority 3 informed primary (575545f4)', role: 'historical', selectable: false },
  { key: 'XP', label: 'Priority 3 independent primary (86d25530)', role: 'historical', selectable: false },
  { key: 'SP', label: 'Priority 3 staged primary (d3bc1484)', role: 'historical', selectable: false },
  { key: 'V4', label: 'VGT only: shipped D1 primary + Growth #4 (Priority 2)', role: 'smaller-universe', selectable: false },
  { key: 'V85', label: 'VGT only: shipped D1 primary + Growth 08500a60 (Priority 2)', role: 'smaller-universe', selectable: false }
];

const cfgOfSubject = (s: Subject): Cfg | null => {
  const inc = incOfEnabled(s.enabled);

  if (!inc) return null;

  const c = canonicalOf(inc, s.quad);

  // the canonical configuration must BE the archived phenotype (same quad identity), except for a subject whose
  // stored order is Growth-first (never a control)
  if (s.quad.first === 'D1' && quadId(c.quad) !== s.id)
    throw new Error(`${s.key}: the canonical configuration ${quadId(c.quad)} is not the archived ${s.id}`);
  return c;
};

let cache: { subjects: Subject[]; controls: Control[] } | null = null;

export const loadControls = () => {
  if (cache) return cache;

  const subjects = loadSubjects();
  const byKey = new Map(subjects.map((s) => [s.key, s]));
  const controls = controlKeys.map((k): Control => {
    const s = byKey.get(k.key);

    if (!s) throw new Error(`subject ${k.key} missing`);

    return {
      key: k.key,
      label: k.label,
      role: k.role,
      selectable: k.selectable,
      cfg: cfgOfSubject(s),
      subject: s,
      p3Id: s.id,
      enabled: s.enabled
    };
  });
  const c = (key: string) => controls.find((x) => x.key === key)!;
  const g = (key: string, sym: Sym) => gId(c(key).subject.quad.g[sym]);

  // the brief's identities (§4)
  if (c('C4').p3Id !== 'f324035d15f69610') throw new Error('C4 is not f324035d15f69610');
  if (g('C4', 'VGT') !== growth.g4 || g('A', 'VGT') !== growth.g4) throw new Error('Growth #4 identity');
  if (g('C85', 'VGT') !== growth.g085 || g('B', 'VGT') !== growth.g085) throw new Error('Growth 08500a60 identity');
  if (g('E', 'GDX') !== growth.appA || g('A', 'GDX') !== growth.appA || g('B', 'GDX') !== growth.appA)
    throw new Error('Appendix A identity');
  for (const k of ['C4', 'C85', 'E', 'A', 'B'])
    if (JSON.stringify(c(k).subject.quad.d1) !== JSON.stringify(c('D').subject.quad.d1))
      throw new Error(`${k}: its D1 books are not VG #2's`);
  if (c('C4').cfg?.inc !== 'V' || c('C85').cfg?.inc !== 'V' || c('E').cfg?.inc !== 'G' || c('A').cfg?.inc !== 'B')
    throw new Error('control inclusion choices');

  cache = { subjects, controls };
  return cache;
};

export const vg2D1 = () => loadControls().controls.find((x) => x.key === 'D')!.subject.quad.d1;

// The informed seed sources (brief §5): the exact controls C4, C85, E, A, B and Priority 3's development-selected
// candidates — its informed, independent and staged primaries, its 15 distinct independent finalists and its 12
// Growth-pair finalists (Growth-only pairs, combined here with D1 books). Every source enters in each inclusion variant
// its Growth books allow (both, VGT only, GDX only); a disabled book's real vector stays in the seed's genome (dormant).
export const seedSources = () => {
  const { subjects } = loadControls();
  const order = ['C4', 'C85', 'E', 'A', 'B', 'IP', 'XP', 'SP'];
  const finalists = subjects.filter((s) => /^[GI]\d\d$/.test(s.key)).map((s) => s.key);

  return [...order, ...finalists].map((k) => subjects.find((s) => s.key === k)!);
};

const variantsOf = (s: Subject): Inc[] => {
  const g = s.enabled.includes('G:GDX');
  const v = s.enabled.includes('G:VGT');

  return g && v ? ['B', 'V', 'G'] : v ? ['V'] : g ? ['G'] : [];
};

// mode 'fixed': every seed carries VG #2's D1 vectors; 'joint': a source's own D1 vectors where it has D1 books (VG #2's
// for the Growth-only pairs).
export const informedSeeds = (mode: 'fixed' | 'joint'): Seed[] => {
  const vg2 = vg2D1();
  const out: Seed[] = [];
  const seen = new Set<string>();

  for (const s of seedSources()) {
    const hasD1 = s.enabled.includes('D1:GDX') && s.enabled.includes('D1:VGT');
    const d1 = mode === 'fixed' || !hasD1 ? vg2 : s.quad.d1;

    for (const inc of variantsOf(s)) {
      const cfg = canonicalOf(inc, { ...s.quad, d1, first: 'D1' });
      const id = cfgId(cfg);

      if (seen.has(id)) continue;
      seen.add(id);

      const dormant: Partial<Record<Sym, GConfig>> = {};

      for (const sym of symbols) if (!growthOn(inc, sym) && s.enabled.includes(`G:${sym}`)) dormant[sym] = s.quad.g[sym];
      out.push({
        label: `${s.key}${inc === incOfEnabled(['D1:GDX', 'D1:VGT', ...s.enabled.filter((b) => b.startsWith('G:'))]) ? '' : ` as ${inc}`}${mode === 'fixed' && hasD1 && JSON.stringify(s.quad.d1) !== JSON.stringify(vg2) ? ' (VG #2 D1)' : ''}${!hasD1 ? ' (+ VG #2 D1)' : ''}`,
        cfg,
        genome: encode(cfg, 'fine', dormant),
        focus: s.key === 'C4' && inc === 'V'
      });
    }
  }

  if (out.filter((x) => x.focus).length !== 1) throw new Error('exactly one focus seed (C4) expected');
  return out;
};

// The Growth partners an informed refinement may add when it switches a V or G configuration to B: the existing
// incumbents' vectors (Appendix A on GDX; #4 and 08500a60 on VGT).
export const partners = () => {
  const { controls } = loadControls();
  const c = (key: string) => controls.find((x) => x.key === key)!.subject.quad;

  return { GDX: [c('A').g.GDX], VGT: [c('A').g.VGT, c('B').g.VGT] };
};

export { incs };

// ----- complete effective settings (brief §10: every frozen member, control and inclusion choice) -----

export const allocatorSettings = {
  lifecycle: 'L0 (current virtual-book model: a refused entry keeps its virtual trade; funding never feeds back)',
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
};

export const settingsOf = (c: Cfg) => {
  const window = { from: '2016-01-04', to: '2024-12-31' };

  return {
    id: cfgId(c),
    priority3QuadId: quadId(c.quad),
    inclusion: c.inc,
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
    allocator: allocatorSettings
  };
};

export const controlManifest = () => {
  const { controls } = loadControls();

  return {
    kind: 'vg-d1-growth-expanded control manifest',
    source:
      "Priority 5A's verified loader (src/vg-growth-funding-lifecycle/subjects.ts) over Priority 3's sha256-pinned records (src/vg-d1-growth-diagnostic/context.ts p3.records) and CONTROL_MANIFEST.json",
    growthIdentities: growth,
    controls: controls.map((c) => ({
      key: c.key,
      label: c.label,
      role: c.role,
      selectable: c.selectable,
      priority3Id: c.p3Id,
      enabled: c.enabled,
      settings: c.cfg ? settingsOf(c.cfg) : { quad: c.subject.quad, options: c.subject.options, allocator: allocatorSettings },
      sealedDevelopmentCentre: c.subject.sealedCentre
        ? { net: c.subject.sealedCentre.net, dd: c.subject.sealedCentre.dd, lots: c.subject.sealedCentre.lots }
        : null
    })),
    informedSeeds: Object.fromEntries(
      (['fixed', 'joint'] as const).map((m) => [
        m,
        informedSeeds(m).map((s) => ({ label: s.label, id: cfgId(s.cfg), inclusion: s.cfg.inc, focus: !!s.focus }))
      ])
    ),
    partners: Object.fromEntries(Object.entries(partners()).map(([s, l]) => [s, l.map((g) => gId(g))]))
  };
};

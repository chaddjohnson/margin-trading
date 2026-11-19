// The controls and the informed seeds (PROTOCOL.md §4). Every exact vector is read from sealed, sha256-pinned records —
// never rebuilt from prose (the trading-session study's loader, unchanged in substance):
// - New L0 (NL0): Priority 5B's FROZEN_SELECTION.json `crossTestSubjects[R01]` (= `arms.L0.primary`,
//   `C24/L0/informed/R1#1 profit`), pinned by sha256; its identities are checked in code;
// - C4, C4-refined, C85, D, and the 5B seeds IJ1, IJ3, IP: through 5B's own verified loader
//   (src/vg-lifecycle-matched-optimization/controls.ts: Priority 5A's subjects over Priority 3's pinned records, and
//   Priority 3B's pinned FROZEN_SELECTION.json), unchanged.
// Each is a configuration of the V structure (inclusion choice + canonical quad) whose identity must equal the
// published one, so the configuration evaluated here IS the archived phenotype.
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../growth140-vgt-s8m/store.ts';
import { type BookId, d1StrategyParams, growthParamsOf } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import {
  controlOf as p5bControlOf,
  growth as p5bGrowth,
  p3bCfg,
  sources as p5bSources
} from '../vg-lifecycle-matched-optimization/controls.ts';
import { STUDY, type Sym, repoRoot, symbols } from './context.ts';
import {
  type Cfg,
  type Inc,
  canonicalOf,
  cfgId,
  encode,
  gId,
  growthOn,
  onFineGrid,
  optionsOf,
  placeholder,
  quadId,
  studyInc,
  withSh
} from './config.ts';
import { type Sh, allSh, offSh, shLabel } from './evaluate.ts';
import { sha256File } from './records.ts';
import type { Seed } from './search.ts';

export const growth = { ...p5bGrowth, newL0Vgt: '6b5f909b30cfa516' } as const;

// The pinned sealed sources (5B's, plus 5B's frozen selection for New L0).
export const sources = {
  ...p5bSources,
  p5bFrozenSelection: {
    file: 'research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json',
    sha256: 'cd223a0d18c44925af7102b98efae1e369899664b8fb07ee2f8a579816255793'
  }
} as const;

export const readPinned = <T>(src: { file: string; sha256: string }): T => {
  const file = path.join(repoRoot, src.file);
  const sha = sha256File(file);

  if (sha !== src.sha256) throw new Error(`${src.file}: sha256 ${sha} is not the pinned ${src.sha256}`);
  return decode<T>(fs.readFileSync(file, 'utf8'));
};

// ----- New L0 -----

export const newL0 = () => {
  const f = readPinned<{
    arms: { L0: { primary: { label: string; id: string } } };
    crossTestSubjects: {
      row: string;
      id: string;
      quad: Cfg['quad'];
      options: EvalOptions;
      exportedBy: { label: string }[];
    }[];
  }>(sources.p5bFrozenSelection);
  const r01 = f.crossTestSubjects.find((x) => x.row === 'R01')!;

  if (r01.exportedBy[0]!.label !== 'C24/L0/informed/R1#1 profit' || f.arms.L0.primary.id !== r01.id)
    throw new Error('5B R01 is not the L0 primary');

  const cfg = canonicalOf('V', r01.quad);

  if (
    cfgId(cfg) !== '67cfdd9b62d1e16f' ||
    quadId(cfg.quad) !== 'a2e385640ca61012' ||
    gId(cfg.quad.g.VGT) !== growth.newL0Vgt
  )
    throw new Error(`New L0 identity ${cfgId(cfg)} / ${quadId(cfg.quad)} / ${gId(cfg.quad.g.VGT)}`);
  if (JSON.stringify(r01.options) !== JSON.stringify({ enabled: { 'G:GDX': false } }))
    throw new Error('New L0 options');
  return { cfg, label: r01.exportedBy[0]!.label };
};

// ----- the controls -----

export interface Control {
  key: string;
  label: string;
  role: 'baseline' | 'fixed-toggles' | 'benchmark' | 'control' | 'd1-only';
  selectable: boolean; // a member of the C24 final selectable set under the same gates and rule
  cfg: Cfg;
  options?: EvalOptions; // D: every Growth book disabled
  source: string;
}

// New L0 under each of the 8 toggle combinations (the fixed-parameter comparison, PROTOCOL.md §9): 'NL0' = all OFF
// (the frozen control A); 'NL0/sh<bits>' = the same phenotype with those toggles ON (no re-optimization). Every one is a
// member of the final selectable set (the qualifying-incumbent fallback; a fixed-toggle variant is a valid outcome).
export const nl0Key = (sh: Sh) => (sh === offSh ? 'NL0' : `NL0/sh${sh}`);

export const controlKeys: { key: string; label: string; role: Control['role']; selectable: boolean; sh: Sh }[] = [
  ...allSh.map((sh) => ({
    key: nl0Key(sh),
    label:
      sh === offSh
        ? 'New L0 primary: 5B C24/L0/informed/R1#1 profit (D1·VGT + D1·GDX + VGT Growth 6b5f909b; GDX Growth OFF), every toggle OFF'
        : `New L0, fixed parameters, shadow eligibility ON for ${shLabel(sh)}`,
    role: (sh === offSh ? 'baseline' : 'fixed-toggles') as Control['role'],
    selectable: true,
    sh
  })),
  { key: 'C4', label: 'C4: VG #2 + VGT Growth #4; GDX Growth OFF', role: 'benchmark', selectable: true, sh: offSh },
  {
    key: 'C4R',
    label: 'C4-refined: 3B C24/informed-fixed#1 profit — VG #2 D1 + refined VGT Growth; GDX Growth OFF',
    role: 'benchmark',
    selectable: true,
    sh: offSh
  },
  {
    key: 'C85',
    label: 'C85: VG #2 + VGT Growth 08500a60; GDX Growth OFF',
    role: 'control',
    selectable: true,
    sh: offSh
  },
  {
    key: 'IJ1',
    label: '3B informed-joint#1 profit (3B formal primary; 5B L2 primary; the New L0 lineage seed)',
    role: 'control',
    selectable: false,
    sh: offSh
  },
  {
    key: 'D',
    label: 'D: VG #2 Balanced S8-VG-F24-3 D1 only (VGT + GDX); Growth OFF',
    role: 'd1-only',
    selectable: false,
    sh: offSh
  }
];

let cache: Control[] | null = null;

export const loadControls = (): Control[] => {
  if (cache) return cache;

  const nl0 = newL0();
  const src5b = (k: string) =>
    `5B control ${k} (src/vg-lifecycle-matched-optimization/controls.ts, its pinned sources)`;
  const cfgOf = (key: string): { cfg: Cfg; options?: EvalOptions; source: string } => {
    if (key.startsWith('NL0'))
      return { cfg: nl0.cfg, source: `${sources.p5bFrozenSelection.file} crossTestSubjects[R01] (${nl0.label})` };
    if (key === 'IJ1')
      return {
        cfg: p3bCfg('IJ1').cfg as Cfg,
        source: `${p5bSources.p3bFrozenSelection.file} finalSet "C24/informed-joint#1 profit"`
      };

    const c = p5bControlOf(key);

    if (key === 'D') {
      // VG #2's D1 books alone: this study's D structure (both Growth books disabled: placeholders, never run)
      return {
        cfg: canonicalOf('D', { d1: c.quad.d1, g: { GDX: placeholder, VGT: placeholder }, first: 'D1' }),
        source: src5b(key)
      };
    }
    if (!c.cfg) throw new Error(`control ${key} is not a configuration`);
    return { cfg: c.cfg as Cfg, source: src5b(key) };
  };

  cache = controlKeys.map(({ sh, ...k }) => {
    const x = cfgOf(k.key);

    return { ...k, ...x, cfg: withSh(x.cfg, sh) };
  });

  const c = (key: string) => cache!.find((x) => x.key === key)!;

  if (quadId(c('C4').cfg.quad) !== 'f324035d15f69610') throw new Error('C4 is not f324035d15f69610');
  if (quadId(c('C4R').cfg.quad) !== '07443ffaeef41e85') throw new Error('C4-refined is not 07443ffaeef41e85');
  if (gId(c('C4').cfg.quad.g.VGT) !== growth.g4 || gId(c('C85').cfg.quad.g.VGT) !== growth.g085)
    throw new Error('Growth identities');
  if (gId(c('C4R').cfg.quad.g.VGT) !== growth.c4RefinedVgt) throw new Error('C4-refined VGT Growth identity');
  if (cfgId(c('IJ1').cfg) !== '940fdaf770eedc9d') throw new Error('IJ1 identity');
  for (const x of cache) {
    if (x.cfg.inc !== (x.role === 'd1-only' ? 'D' : studyInc))
      throw new Error(`control ${x.key}: inclusion ${x.cfg.inc}`);
    if (!onFineGrid(x.cfg)) throw new Error(`control ${x.key} is not on the fine grid`);
  }
  if (cfgId(c('NL0').cfg) !== '67cfdd9b62d1e16f') throw new Error('New L0 (all OFF) keeps its 5B identity');
  return cache;
};

export const controlOf = (key: string) => {
  const x = loadControls().find((c) => c.key === key);

  if (!x) throw new Error(`control ${key} missing`);
  return x;
};

export const optionsOfControl = (c: Control): EvalOptions => c.options ?? optionsOf(c.cfg);

// ----- the informed seeds (PROTOCOL.md §4.2). 5B's nine seeds restricted to the V structure: its V seeds unchanged; its B
// seeds projected to V by 5B's own informed inclusion move (B → V keeps the D1 books and the VGT Growth vector); its G
// seeds have no VGT Growth book and cannot be projected. New L0 is added as a focus seed (the brief's incumbent; 5B's
// focus seeds were its incumbents C4 and C4-refined, which stay focus seeds). -----

export const informedSeedKeys = [
  { key: 'C4', source: '5B seed C4 (V), unchanged', focus: true },
  { key: 'C4R', source: '5B seed C4R (V), unchanged', focus: true },
  { key: 'C85', source: '5B seed C85 (V), unchanged', focus: false },
  { key: 'IJ1', source: '5B seed IJ1 (V), unchanged', focus: false },
  {
    key: 'IJ3:V',
    source: '5B seed IJ3 (B) projected to V (its D1 books + its VGT Growth; GDX Growth OFF)',
    focus: false
  },
  {
    key: 'IP:V',
    source: '5B seed IP (B) projected to V (its D1 books + its VGT breakout Growth; GDX Growth OFF)',
    focus: false
  },
  { key: 'NL0', source: 'New L0 (5B L0 primary), the brief’s incumbent — added as a focus seed', focus: true }
] as const;

// 5B seeds outside the retained structure (recorded, not used)
export const omittedSeeds = [
  { key: 'A', why: '5B seed A (B: VG #2 + #4 + Appendix A) projects to V as C4 — a duplicate of seed C4' },
  { key: 'E', why: '5B seed E (G: VG #2 + Appendix A) has no VGT Growth book: no V projection' },
  { key: 'GB1', why: '5B seed GB1 (G: 3B indep/G_GDX-breakout#1) has no VGT Growth book: no V projection' }
] as const;

export const projectToV = (c: { inc: Inc; quad: Cfg['quad'] }): Cfg => canonicalOf('V', c.quad);

export const seedCfg = (key: string): Cfg => {
  if (key === 'IJ3:V') return projectToV(p3bCfg('IJ3').cfg as Cfg);
  if (key === 'IP:V') return projectToV(p5bControlOf('IP').cfg as Cfg);
  return controlOf(key).cfg;
};

// A1 (informed joint): the trading-session study's informed seed set, unchanged (5B's V seeds, its B seeds projected to
// V, New L0 as a third focus seed), every toggle OFF (the lane adds each seed's other toggle combinations).
export const informedSeeds = (): Seed[] => {
  const out = informedSeedKeys.map((k) => {
    const cfg = seedCfg(k.key);

    return { label: k.key, cfg, genome: encode(cfg, 'fine'), focus: k.focus };
  });

  if (new Set(out.map((s) => cfgId(s.cfg))).size !== out.length) throw new Error('duplicate informed seeds');
  for (const s of out)
    if (s.cfg.inc !== studyInc || !onFineGrid(s.cfg))
      throw new Error(`seed ${s.label}: not a fine-grid V configuration`);
  if (cfgId(projectToV(p5bControlOf('A').cfg as Cfg)) !== cfgId(controlOf('C4').cfg))
    throw new Error('A → V is not C4');
  return out;
};

// A2 step d1 (informed D1 pair): the distinct D1 pairs of the A1 seeds as D configurations (Growth OFF); focus = VG #2
// Balanced's pair (C4's and C4-refined's D1 books: the incumbent D1 pair) and New L0's pair.
export const informedD1Seeds = (): Seed[] => {
  const out: Seed[] = [];

  for (const k of informedSeedKeys) {
    const cfg = canonicalOf('D', seedCfg(k.key).quad);

    if (out.some((x) => cfgId(x.cfg) === cfgId(cfg))) continue;
    out.push({
      label: `${k.key === 'C4R' || k.key === 'C85' ? 'C4' : k.key}:D1`,
      cfg,
      genome: encode(cfg, 'fine'),
      focus: k.key === 'C4' || k.key === 'NL0'
    });
  }

  if (out.length !== 5) throw new Error(`expected 5 distinct informed D1 pairs, found ${out.length}`);
  return out;
};

// A2 step g (informed Growth beside a frozen D1 finalist): the distinct Growth·VGT vectors of the A1 seeds placed on the
// finalist's D1 books and toggles; focus = the focus seeds' Growth (#4, C4-refined's, New L0's).
export const informedGrowthSeeds = (finalist: Cfg): Seed[] => {
  const out: Seed[] = [];

  for (const k of informedSeedKeys) {
    const q = seedCfg(k.key).quad;
    const cfg = canonicalOf('V', { ...q, d1: finalist.quad.d1 }, `${finalist.sh.slice(0, 2)}0`);

    if (out.some((x) => cfgId(x.cfg) === cfgId(cfg))) continue;
    out.push({ label: `${k.key}:G`, cfg, genome: encode(cfg, 'fine'), focus: k.focus });
  }

  if (out.length !== 7) throw new Error(`expected 7 distinct informed Growth vectors, found ${out.length}`);
  return out;
};

// ----- complete effective settings -----

export const allocatorSettings = (sh: Sh) => ({
  shadowEligibility: {
    toggles: { 'D1:GDX': sh[0] === '1', 'D1:VGT': sh[1] === '1', 'G:VGT': sh[2] === '1' },
    rule: 'EXPERIMENTAL (allocator.ts): a refused entry of a toggled book stays eligible while its hypothetical (virtual) trade is open; at a capital release (the end of the release minute) live episodes compete after fresh signals, in the frozen tie order; a delayed real entry is a new position with independent state (position.ts)'
  },
  maximumHoldUnit: 'calendar days between session dates (the frozen default; unchanged)',
  growthLifecycle:
    'L0 — current virtual-book model: a refused Growth entry becomes an unfunded virtual position and waits for its virtual exit; funding never feeds back; virtual continuation rights kept',
  d1Lifecycle: 'canonical shadow book (refusals never feed back into D1)',
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
  d1Arming: 'harmonized: from the first session (each D1 machine arms once its reference high exists)'
});

export const settingsOf = (c: Cfg, options?: EvalOptions) => {
  const window = { from: '2016-01-04', to: '2024-12-31' };
  const enabled = (['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'] as BookId[]).filter(
    (b) => (b.startsWith('D1:') || growthOn(c.inc, b.slice(2) as Sym)) && options?.enabled?.[b] !== false
  );

  return {
    id: cfgId(c),
    priority3QuadId: quadId(c.quad),
    inclusion: c.inc,
    toggles: c.sh,
    enabled,
    d1: Object.fromEntries(
      symbols.map((s) => [
        s,
        {
          grid: c.quad.d1[s],
          unit: 'tenths of a percentage point; maximumHoldDays in calendar days; L and W in sessions',
          strategyParams: d1StrategyParams(s, c.quad.d1[s])
        }
      ])
    ),
    growth: Object.fromEntries(
      symbols.map((s) => [
        s,
        growthOn(c.inc, s) && options?.enabled?.[`G:${s}` as BookId] !== false
          ? {
              enabled: true,
              identity: gId(c.quad.g[s]),
              effective: c.quad.g[s],
              engineParams: growthParamsOf(c.quad.g[s], s, window)
            }
          : {
              enabled: false,
              placeholderIdentity: gId(c.quad.g[s]),
              note: 'disabled: never run or funded (placeholder vector)'
            }
      ])
    ),
    allocator: allocatorSettings(c.sh)
  };
};

export const controlManifest = () => {
  const controls = loadControls();

  return {
    kind: `${STUDY} control manifest`,
    sources,
    growthIdentities: growth,
    controls: controls.map((c) => ({
      key: c.key,
      label: c.label,
      role: c.role,
      selectable: c.selectable,
      id: cfgId(c.cfg),
      priority3Id: quadId(c.cfg.quad),
      source: c.source,
      toggles: c.cfg.sh,
      options: optionsOfControl(c),
      settings: settingsOf(c.cfg, optionsOfControl(c))
    })),
    informedSeeds: informedSeedKeys.map((k) => {
      const cfg = seedCfg(k.key);

      return {
        key: k.key,
        source: k.source,
        focus: k.focus,
        id: cfgId(cfg),
        priority3QuadId: quadId(cfg.quad),
        inclusion: cfg.inc,
        settings: settingsOf(cfg)
      };
    }),
    informedD1Seeds: informedD1Seeds().map((x) => ({
      label: x.label,
      focus: !!x.focus,
      id: cfgId(x.cfg),
      d1: x.cfg.quad.d1
    })),
    informedGrowthSeeds: informedGrowthSeeds(controlOf('NL0').cfg).map((x) => ({
      label: x.label,
      focus: !!x.focus,
      growthIdentity: gId(x.cfg.quad.g.VGT),
      note: 'placed on each frozen D1 finalist (shown here on New L0’s D1 pair)'
    })),
    omittedSeeds
  };
};

export type { Inc };
export { offSh };

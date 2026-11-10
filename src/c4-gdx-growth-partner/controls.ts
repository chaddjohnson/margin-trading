// The anchors, controls and informed GDX seeds (PROTOCOL.md §4, §7.2). Every vector is read from sealed records —
// never rebuilt from prose:
//   - VG #2's D1 vectors, Growth #4, Appendix A and the Priority 3 controls (C4, A, E, D, S4, GP4) from Priority 5A's
//     verified loader (src/vg-growth-funding-lifecycle/subjects.ts over Priority 3's sha256-pinned records);
//   - C4-refined from Priority 3B's sealed and committed FROZEN_SELECTION.json (`C24/informed-fixed#1 profit`, its
//     complete effective vector and flags), pinned by sha256;
//   - the informed GDX seeds from the sealed selection records of Priority 3 and Priority 3B (pinned by sha256), with
//     their provenance cutoff: an earlier-cutoff repeat may use only seeds whose own selection used data through that
//     cutoff; the final cutoff C24 adds Appendix A (browser-chosen with 2016–2026 in view) and the 3B C24 members.
// Each control's configuration is built through this study's configuration path and must hash to its own published
// Priority 3 identity, so the configuration evaluated here IS the archived phenotype.
import fs from 'node:fs';
import path from 'node:path';
import { type Subject, loadSubjects } from '../vg-growth-funding-lifecycle/subjects.ts';
import { type BookId, d1StrategyParams, growthParamsOf } from '../vg-d1-growth-joint/books.ts';
import { repoRoot, symbols } from './context.ts';
import {
  type Anchor,
  type Arm,
  type Built,
  type GConfig,
  type Quad,
  arms,
  build,
  canonicalGdx,
  d1Placeholder,
  gId,
  onFineGrid,
  quadId
} from './space.ts';
import { sha256File } from './records.ts';

export const growth = { g4: '420cd989e4fa7749', appA: '07cac3329fc7a520' } as const;

// The sealed source records (sha256-pinned).
export const sources = {
  p3bFrozenSelection: {
    file: 'research/vg-d1-growth-expanded/FROZEN_SELECTION.json',
    sha256: 'f76299683bcb92a9175864daaf3b46f1aab62879a14aeda49a7f9ad3f5bf422e'
  },
  p3bValidation: {
    file: 'research/vg-d1-growth-expanded/results/validation/validation.json',
    sha256: 'e7e467ded3f7d8e2529d92249d5f44b10fe7a8cdac1ce22cba336f0c5f451425'
  },
  p3bSelection: {
    C19: {
      file: 'research/vg-d1-growth-expanded/results/folds/C19/selection.json',
      sha256: '8ad0f610209d69c55ee211e2a9a239849e5bb5c5ac114b59bda1510b7e14bf9c'
    },
    C21: {
      file: 'research/vg-d1-growth-expanded/results/folds/C21/selection.json',
      sha256: '49f6bae75333679bd6df309d3936b2e7171bfb900b8a7db37811969a5996d28b'
    },
    C23: {
      file: 'research/vg-d1-growth-expanded/results/folds/C23/selection.json',
      sha256: 'ef9b5bd50bce4564ecf2900183344c3bf89db14d6a185db3a16bccd149bf9724'
    },
    C24: {
      file: 'research/vg-d1-growth-expanded/results/folds/C24/selection.json',
      sha256: '4b17acc44097550516f781ee20eb6155971121b05b5157b70e7e8bb1ead88b30'
    }
  },
  p3Selection: {
    C19: {
      file: 'research/vg-d1-growth-joint/results/folds/C19/selection.json',
      sha256: 'e7b8def9fc02558179d466e05c4ece3281063a98d5ad64173a811180e6f3e922'
    },
    C21: {
      file: 'research/vg-d1-growth-joint/results/folds/C21/selection.json',
      sha256: '65159c767f1cf093594f08de4b2b826a179bc664323625fa151742db78061154'
    },
    C23: {
      file: 'research/vg-d1-growth-joint/results/folds/C23/selection.json',
      sha256: 'bdb782a55d9019bd061673dfa2c5328e214e201a2f39c3ed2797790b32c05701'
    }
  },
  p5aCentres: {
    file: 'research/vg-growth-funding-lifecycle/results/development/centres.json',
    sha256: '09afda78f6fa40fb18a43557e4e24a3bf7fe159c148cc6858b72b2c31785feb8'
  }
} as const;

export const readPinned = <T>(src: { file: string; sha256: string }): T => {
  const f = path.join(repoRoot, src.file);
  const sha = sha256File(f);

  if (sha !== src.sha256) throw new Error(`${src.file} changed: ${sha}`);
  return JSON.parse(fs.readFileSync(f, 'utf8')) as T;
};

// C4-refined: Priority 3B's `C24/informed-fixed#1 profit` (an alias in this study, not a new phenotype).
export const c4Refined = {
  label3B: 'C24/informed-fixed#1 profit',
  id3B: '0f017f0ab9b26f24',
  p3Id: '07443ffaeef41e85',
  targets: {
    development: { net: 360569.71, dd: 17280.74 },
    validation: { pnl: 91512.65, dd: 19477.66 },
    full: { net: 452082.36, dd: 19477.66 },
    p3bConfirmation: { p10: 222241.29, p90Dd: 24708.71 }
  }
} as const;

export const c4Targets = {
  id: 'f324035d15f69610',
  development: { net: 302785.91, dd: 17332.09 },
  validation: { pnl: 99081.34, dd: 21536.85 },
  full: { net: 401867.24, dd: 21536.85 },
  p3bConfirmation: { p10: 204977.07, p90Dd: 24519.07 }
} as const;

interface FrozenMember {
  label: string;
  id: string;
  inc: string;
  qualified: boolean;
  net: number;
  dd: number;
  confirmP10: number;
  confirmP90Dd: number;
  settings: {
    priority3QuadId: string;
    enabled: BookId[];
    d1: Record<'GDX' | 'VGT', { grid: Quad['d1']['GDX'] }>;
    growth: Record<'GDX' | 'VGT', { enabled: boolean; effective?: GConfig; identity?: string }>;
  };
}

export interface Control {
  key: string;
  label: string;
  arm: Arm | null; // the arm it belongs to (null: contextual)
  role: 'baseline' | 'control' | 'context';
  selectable: boolean; // a member of its arm's selectable set (the baseline and the arm's App A control)
  built: Built | null; // null: built with its own options (D)
  quad: Quad;
  options: Built['options'];
  enabled: BookId[];
  p3Id: string;
  provenance: string;
}

let cache: {
  anchors: Record<Arm, Anchor>;
  controls: Control[];
  subjects: Subject[];
  refined: FrozenMember;
  appA: GConfig;
} | null = null;

export const loadControls = () => {
  if (cache) return cache;

  const subjects = loadSubjects();
  const s = (key: string) => {
    const x = subjects.find((y) => y.key === key);

    if (!x) throw new Error(`subject ${key} missing`);
    return x;
  };
  const C4 = s('C4');
  const A = s('A');
  const E = s('E');
  const D = s('D');
  const S4 = s('S4');
  const GP4 = s('GP4');
  const vg2 = D.quad.d1;
  const g4 = C4.quad.g.VGT;
  const appA = A.quad.g.GDX;

  // the brief's identities
  if (C4.id !== c4Targets.id) throw new Error('C4 is not f324035d15f69610');
  if (gId(g4) !== growth.g4 || gId(S4.quad.g.VGT) !== growth.g4 || gId(GP4.quad.g.VGT) !== growth.g4)
    throw new Error('VGT Growth #4 identity');
  if (gId(appA) !== growth.appA || gId(E.quad.g.GDX) !== growth.appA || gId(GP4.quad.g.GDX) !== growth.appA)
    throw new Error('Appendix A identity');
  for (const x of [C4, A, E])
    if (JSON.stringify(x.quad.d1) !== JSON.stringify(vg2)) throw new Error(`${x.key}: its D1 books are not VG #2's`);

  // C4-refined from 3B's sealed frozen selection: the complete vector and every flag
  const fz = readPinned<{ finalSet: FrozenMember[] }>(sources.p3bFrozenSelection);
  const refined = fz.finalSet.find((m) => m.label === c4Refined.label3B);

  if (!refined) throw new Error(`${c4Refined.label3B} missing from 3B's frozen selection`);
  if (refined.id !== c4Refined.id3B || refined.settings.priority3QuadId !== c4Refined.p3Id || !refined.qualified)
    throw new Error('C4-refined identity or 3B verdict');
  if (refined.settings.enabled.join() !== 'D1:GDX,D1:VGT,G:VGT')
    throw new Error('C4-refined is not a VGT-Growth-only pool');
  for (const sym of symbols)
    if (JSON.stringify(refined.settings.d1[sym].grid) !== JSON.stringify(vg2[sym]))
      throw new Error(`C4-refined's D1·${sym} is not VG #2's`);
  if (refined.net !== c4Refined.targets.development.net || refined.dd !== c4Refined.targets.development.dd)
    throw new Error('C4-refined development centre');
  if (
    refined.confirmP10 !== c4Refined.targets.p3bConfirmation.p10 ||
    refined.confirmP90Dd !== c4Refined.targets.p3bConfirmation.p90Dd
  )
    throw new Error('C4-refined 3B confirmation statistics');

  const rVgt = canonicalGdx(refined.settings.growth.VGT.effective!);

  if (rVgt.trendFilterEnabled !== false || rVgt.trailingStopPercent !== 5.7)
    throw new Error('C4-refined VGT: trend OFF, 5.7%');

  const anchors: Record<Arm, Anchor> = {
    R: { arm: 'R', d1: vg2, vgt: rVgt, books: ['D1:GDX', 'D1:VGT', 'G:VGT'] },
    O: { arm: 'O', d1: vg2, vgt: g4, books: ['D1:GDX', 'D1:VGT', 'G:VGT'] },
    G: { arm: 'G', d1: { GDX: d1Placeholder, VGT: d1Placeholder }, vgt: g4, books: ['G:VGT'] }
  };

  const R0 = build(anchors.R, null);
  const O0 = build(anchors.O, null);
  const G0 = build(anchors.G, null);
  const RA = build(anchors.R, appA);
  const OA = build(anchors.O, appA);
  const GA = build(anchors.G, appA);

  // the configuration path reproduces every published identity
  const ids: [string, string, string][] = [
    ['C4-refined', R0.p3Id, c4Refined.p3Id],
    ['C4', O0.p3Id, C4.id],
    ['S4', G0.p3Id, S4.id],
    ['A', OA.p3Id, A.id],
    ['GP4', GA.p3Id, GP4.id]
  ];

  for (const [k, mine, target] of ids)
    if (mine !== target) throw new Error(`${k}: ${mine} is not the archived ${target}`);
  if (quadId(E.quad) !== E.id) throw new Error('E identity');

  const controls: Control[] = [
    ctl(
      'R0',
      'C4-refined (3B C24/informed-fixed#1 profit; GDX Growth OFF) — baseline R',
      'R',
      'baseline',
      R0,
      `Priority 3B ${sources.p3bFrozenSelection.file}`
    ),
    ctl(
      'RA',
      'C4-refined + existing GDX Growth (Appendix A) — the newly combined control, frozen before evaluation',
      'R',
      'control',
      RA,
      'built here from C4-refined and Appendix A'
    ),
    ctl(
      'O0',
      'C4: VG #2 + VGT Growth #4; GDX Growth OFF — baseline O',
      'O',
      'baseline',
      O0,
      'Priority 3 control C (f324035d15f69610)'
    ),
    ctl(
      'OA',
      'A: VG #2 + VGT Growth #4 + existing GDX Growth (Appendix A)',
      'O',
      'control',
      OA,
      'Priority 3 control A (d4cde31356e2306a)'
    ),
    ctl(
      'G0',
      'VGT Growth #4 alone (no D1) — baseline G',
      'G',
      'baseline',
      G0,
      'Priority 5A subject S4 (90f84e00063dcc76)'
    ),
    ctl(
      'GA',
      'Growth only: VGT Growth #4 + existing GDX Growth (Appendix A)',
      'G',
      'control',
      GA,
      'Priority 3 control GP4 (0f17bddbd7f63a56)'
    ),
    {
      key: 'E',
      label: 'E: VG #2 + existing GDX Growth (Appendix A); VGT Growth OFF (contextual)',
      arm: null,
      role: 'context',
      selectable: false,
      built: null,
      quad: E.quad,
      options: E.options,
      enabled: E.enabled,
      p3Id: E.id,
      provenance: 'Priority 5A subject E (c45f4efa028203e9)'
    },
    {
      key: 'D',
      label: 'D: VG #2 D1 only (contextual)',
      arm: null,
      role: 'context',
      selectable: false,
      built: null,
      quad: D.quad,
      options: D.options,
      enabled: D.enabled,
      p3Id: D.id,
      provenance: 'Priority 3 control D (7a377d49c2b9aa55)'
    }
  ];

  cache = { anchors, controls, subjects, refined, appA };
  return cache;
};

function ctl(
  key: string,
  label: string,
  arm: Arm,
  role: 'baseline' | 'control',
  b: Built,
  provenance: string
): Control {
  return {
    key,
    label,
    arm,
    role,
    selectable: true,
    built: b,
    quad: b.quad,
    options: b.options,
    enabled: b.enabled,
    p3Id: b.p3Id,
    provenance
  };
}

export const anchorsOf = () => loadControls().anchors;
export const baselineOf = (arm: Arm) => loadControls().controls.find((c) => c.arm === arm && c.role === 'baseline')!;

// ----- informed GDX seeds (PROTOCOL.md §7.2) -----

export interface Seed {
  label: string;
  gdx: GConfig;
  source: string; // provenance (study, cutoff, label)
  cutoff: string; // the latest data its own selection used ('2024' for C24 sources; 'browser 2016–2026' for Appendix A)
}

interface EvidenceLike {
  label: string;
  enabled?: BookId[];
  inc?: string;
  quad?: Quad;
  cfg?: { inc: string; quad: Quad };
}

const gdxOfEvidence = (e: EvidenceLike): GConfig | null => {
  if (e.cfg) return e.cfg.inc === 'G' || e.cfg.inc === 'B' ? e.cfg.quad.g.GDX : null;
  if (e.quad && e.enabled?.includes('G:GDX')) return e.quad.g.GDX;
  return null;
};

export const seedsAt = (cutoff: string, auditSeeds: Seed[] = []): Seed[] => {
  const out: Seed[] = [];
  const seen = new Set<string>();
  const add = (label: string, g: GConfig, source: string, provenance: string) => {
    const c = canonicalGdx(g);
    const id = gId(c);

    if (seen.has(id)) return;
    if (!onFineGrid(c)) throw new Error(`seed ${label} (${id}) is not on the fine grid`);
    seen.add(id);
    out.push({ label, gdx: c, source, cutoff: provenance });
  };
  const { subjects, appA } = loadControls();

  if (cutoff === 'C24') {
    add('Appendix A', appA, 'Priority 3 control (browser-chosen)', 'browser, 2016–2026 in view');
    for (const x of subjects)
      if ((x.group === 'mechanism' || x.group === 'finalist') && x.enabled.includes('G:GDX'))
        add(`P3 ${x.key}`, x.quad.g.GDX, `Priority 3 ${x.label}`, '2016–2024');
    const sel = readPinned<{ evidence: EvidenceLike[] }>(sources.p3bSelection.C24);

    for (const e of sel.evidence) {
      const g = gdxOfEvidence(e);

      if (g) add(`3B ${e.label}`, g, `Priority 3B C24 selection: ${e.label}`, '2016–2024');
    }
    for (const a of auditSeeds) add(a.label, a.gdx, a.source, a.cutoff);
  } else {
    const key = cutoff as 'C19' | 'C21' | 'C23';
    const end = { C19: '2016–2019', C21: '2016–2021', C23: '2016–2023' }[key];

    if (!end) throw new Error(`no seed provenance rule for ${cutoff}`);
    for (const [study, src] of [
      ['P3', sources.p3Selection[key]],
      ['3B', sources.p3bSelection[key]]
    ] as const) {
      const sel = readPinned<{ evidence: EvidenceLike[] }>(src);

      for (const e of sel.evidence) {
        const g = gdxOfEvidence(e);

        if (g)
          add(
            `${study} ${e.label}`,
            g,
            `${study === 'P3' ? 'Priority 3' : 'Priority 3B'} ${key} independent selection: ${e.label}`,
            end
          );
      }
    }
  }

  return out;
};

// ----- complete effective settings -----

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

export const settingsOf = (b: Pick<Built, 'quad' | 'enabled' | 'id' | 'p3Id'>) => {
  const window = { from: '2016-01-04', to: '2024-12-31' };

  return {
    id: b.id,
    priority3QuadId: b.p3Id,
    enabled: b.enabled,
    d1: Object.fromEntries(
      symbols.map((s) => [
        s,
        b.enabled.includes(`D1:${s}`)
          ? {
              enabled: true,
              grid: b.quad.d1[s],
              unit: 'tenths of a percentage point / days / sessions',
              strategyParams: d1StrategyParams(s, b.quad.d1[s])
            }
          : { enabled: false, note: 'disabled: never run or funded (placeholder vector)' }
      ])
    ),
    growth: Object.fromEntries(
      symbols.map((s) => [
        s,
        b.enabled.includes(`G:${s}`)
          ? {
              enabled: true,
              identity: gId(b.quad.g[s]),
              effective: b.quad.g[s],
              engineParams: growthParamsOf(b.quad.g[s], s, window)
            }
          : {
              enabled: false,
              placeholderIdentity: gId(b.quad.g[s]),
              note: 'disabled: never run or funded (placeholder vector)'
            }
      ])
    ),
    allocator: allocatorSettings
  };
};

export const controlManifest = () => {
  const { controls, anchors, refined } = loadControls();
  const seeds = Object.fromEntries(
    ['C19', 'C21', 'C23', 'C24'].map((c) => [
      c,
      seedsAt(c).map((x) => ({ label: x.label, id: gId(x.gdx), source: x.source, provenance: x.cutoff }))
    ])
  );

  return {
    kind: 'c4-gdx-growth-partner control manifest',
    sources,
    growthIdentities: { ...growth, c4RefinedVgt: gId(anchors.R.vgt) },
    c4Refined: {
      ...c4Refined,
      verified3B: {
        label: refined.label,
        id: refined.id,
        qualified: refined.qualified,
        net: refined.net,
        dd: refined.dd
      },
      vgtEffective: anchors.R.vgt,
      differencesFromGrowth4: Object.fromEntries(
        [...new Set([...Object.keys(anchors.R.vgt), ...Object.keys(anchors.O.vgt)])]
          .filter((k) => JSON.stringify(anchors.R.vgt[k]) !== JSON.stringify(anchors.O.vgt[k]))
          .map((k) => [k, { growth4: anchors.O.vgt[k] ?? '(inactive)', c4Refined: anchors.R.vgt[k] ?? '(inactive)' }])
      )
    },
    anchors: Object.fromEntries(arms.map((a) => [a, { books: anchors[a].books, vgtIdentity: gId(anchors[a].vgt) }])),
    controls: controls.map((c) => ({
      key: c.key,
      label: c.label,
      arm: c.arm,
      role: c.role,
      selectable: c.selectable,
      priority3Id: c.p3Id,
      id: c.built?.id ?? null,
      enabled: c.enabled,
      provenance: c.provenance,
      settings: c.built ? settingsOf(c.built) : { quad: c.quad, options: c.options, allocator: allocatorSettings }
    })),
    seeds,
    note: 'RA (C4-refined + Appendix A) is frozen here before any evaluation of it in this study.'
  };
};

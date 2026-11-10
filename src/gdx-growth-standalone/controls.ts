// The controls and the informed seeds (PROTOCOL.md §4, §7.2). Every vector is read from sealed, sha256-pinned records —
// never rebuilt from report prose:
//   - Appendix A (07cac3329fc7a520): Priority 3's sealed CONTROL_MANIFEST.json (incumbents.appendixA.effective; its
//     sha256 is Priority 3A's pin), the browser transcription mapped to Growth 1.4.0 with every value explicit. Its 2016–2024
//     standalone centre is Priority 5A's sealed L0 centre of "SG alone" (E2); its native full-history target
//     ($141,157.37 / $17,709.96 / 19 trades, flat) is compared at the frozen final stage only.
//   - The PREDECLARED PRIOR SET (brief: "a small, predeclared set of existing GDX Growth vectors from Priorities 3B and 3C
//     … selected from documented development roles / structural diversity, not known validation winners"), by a
//     mechanical rule on the sealed C24 role sets (development roles only; no validation figure is read):
//       (a) Priority 3C: every distinct GDX vector holding a formal role (actual-profit, robust-profit, balanced,
//           lower-drawdown) in the C24 role sets of arms R, O and G (FROZEN_SELECTION.json `roles`);
//       (b) Priority 3B: every distinct GDX vector holding a formal role in the C24 inclusion-G and inclusion-B role sets
//           whose GDX book was funded at its development centre (a book that never traded has no GDX behaviour to
//           test standalone); the 3B rows give the breakout family its representatives.
//     They are labelled research controls and informed seeds, never approved additions (the user declined 3C's partner).
//   - Cash (no position): the zero-profit, zero-DD reference, never selectable.
// Every vector must be exactly representable on the fine grid (checked).
import fs from 'node:fs';
import path from 'node:path';
import { readP3 } from '../vg-d1-growth-diagnostic/records.ts';
import { growthParamsOf } from '../vg-d1-growth-joint/books.ts';
import { chronology, repoRoot } from './context.ts';
import { sha256File } from './records.ts';
import {
  type Built,
  type GConfig,
  buildS,
  canonicalGdx,
  classOf,
  describeG,
  entryOf,
  gId,
  onFineGrid
} from './space.ts';

export const appendixAId = '07cac3329fc7a520';

// Appendix A's native standalone full-history target (Priority 3's brief Appendix A; Priority 3 and 5A reproduced it).
export const appendixATarget = {
  window: ['2016-01-04', '2026-10-30'],
  net: 141157.37,
  minuteDd: 17709.96,
  closedTrades: 19,
  wins: 17,
  losses: 2,
  open: 0
} as const;

// Its 2016–2024 standalone centre (Priority 5A's sealed L0 centre of "SG alone", the development parity target).
export const appendixADevelopment = { net: 53816.5, dd: 17709.96, lots: 13 } as const;

export const sources = {
  p3ControlManifest: {
    file: 'research/vg-d1-growth-joint/CONTROL_MANIFEST.json',
    sha256: '0f40efd76aec8ec10a504fb2cf508891a572061df51db065363a910fb68adaa1'
  },
  p3cFrozenSelection: {
    file: 'research/c4-gdx-growth-partner/FROZEN_SELECTION.json',
    sha256: 'ef1da770c0f15d8c81f4d7fe24cd7886d729b4f6c597e6ea75ae65247820031e'
  },
  p3bFrozenSelection: {
    file: 'research/vg-d1-growth-expanded/FROZEN_SELECTION.json',
    sha256: 'f76299683bcb92a9175864daaf3b46f1aab62879a14aeda49a7f9ad3f5bf422e'
  },
  p5aCentres: {
    file: 'research/vg-growth-funding-lifecycle/results/development/centres.json',
    sha256: '09afda78f6fa40fb18a43557e4e24a3bf7fe159c148cc6858b72b2c31785feb8'
  },
  p5aStandalone: {
    file: 'research/vg-growth-funding-lifecycle/results/development/standalone.json',
    sha256: '35f28d1851c1cec5872d414c3283423ebb513056324c32b48c69648ba05e7154'
  }
} as const;

export const readPinned = <T>(src: { file: string; sha256: string }): T => {
  const f = path.join(repoRoot, src.file);
  const sha = sha256File(f);

  if (sha !== src.sha256) throw new Error(`${src.file} changed: ${sha}`);
  return JSON.parse(fs.readFileSync(f, 'utf8')) as T;
};

export interface Control {
  key: string; // A (Appendix A), P01…, CASH
  label: string;
  role: 'exact control' | 'prior control' | 'cash reference';
  selectable: boolean; // members of the informed comparison (C24); never of the independent lane
  gdx: GConfig | null;
  gdxId: string | null;
  built: Built;
  provenance: string;
  source: { file: string; sha256: string; path: string } | null;
}

export interface Seed {
  label: string;
  gdx: GConfig;
  source: string;
  cutoff: string; // the provenance: the data its own selection used ('2016–2026 browser' or 'C24 (2016–2024)')
}

interface P3cMember {
  label: string;
  arm: string | null;
  gdxId: string | null;
  settings: { growth: { GDX: { enabled: boolean; identity?: string; effective?: GConfig } } };
}

interface P3bMember {
  label: string;
  lotsBy: Record<string, number>;
  settings: { growth: { GDX: { enabled: boolean; identity?: string; effective?: GConfig } } };
}

const roleNames = ['actual-profit', 'robust-profit', 'balanced', 'lower-drawdown'] as const;

// The predeclared prior set, by the frozen rule above (deterministic order: 3C arms R, O, G then 3B G, B; roles in
// the standard's order; first occurrence keeps its label).
export const priorSet = () => {
  const p3c = readPinned<{
    roles: Record<string, { roles: Record<string, string | null> }>;
    frozenMembers: P3cMember[];
  }>(sources.p3cFrozenSelection);
  const p3b = readPinned<{ roles: Record<string, { roles: Record<string, string | null> }>; finalSet: P3bMember[] }>(
    sources.p3bFrozenSelection
  );
  const out: { gdx: GConfig; id: string; from: string; roles: string[]; source: Control['source'] }[] = [];
  const add = (g: GConfig, from: string, role: string, src: Control['source']) => {
    const c = canonicalGdx(g);
    const id = gId(c);
    const prior = out.find((x) => x.id === id);

    if (id === appendixAId) return; // Appendix A is the exact control, not a prior
    if (prior) prior.roles.push(`${from} ${role}`);
    else out.push({ gdx: c, id, from, roles: [`${from} ${role}`], source: src });
  };

  for (const arm of ['R', 'O', 'G'])
    for (const role of roleNames) {
      const label = p3c.roles[arm]!.roles[role];
      const m = p3c.frozenMembers.find((x) => x.label === label && x.arm === arm);
      const g = m?.settings.growth.GDX;

      if (!label || !m || !g?.enabled || !g.effective) continue;
      if (g.identity !== gId(canonicalGdx(g.effective))) throw new Error(`3C ${label}: identity mismatch`);
      add(g.effective, `3C ${arm}`, role, {
        ...sources.p3cFrozenSelection,
        path: `frozenMembers[label=${label}].settings.growth.GDX.effective`
      });
    }

  for (const set of ['inclusion G', 'inclusion B'])
    for (const role of roleNames) {
      const label = p3b.roles[set]!.roles[role];
      const m = p3b.finalSet.find((x) => x.label === label);
      const g = m?.settings.growth.GDX;

      if (!label || !m || !g?.enabled || !g.effective) continue;
      if ((m.lotsBy['G:GDX'] ?? 0) === 0) continue; // never funded at its development centre
      if (g.identity !== gId(canonicalGdx(g.effective))) throw new Error(`3B ${label}: identity mismatch`);
      add(g.effective, `3B ${set}`, role, {
        ...sources.p3bFrozenSelection,
        path: `finalSet[label=${label}].settings.growth.GDX.effective`
      });
    }

  return out;
};

export const appendixA = (): { gdx: GConfig; source: NonNullable<Control['source']> } => {
  const cm = readP3<{ incumbents: { appendixA: { id: string; effective: GConfig } } }>('CONTROL_MANIFEST.json');
  const g = canonicalGdx(cm.incumbents.appendixA.effective);

  if (gId(g) !== appendixAId || cm.incumbents.appendixA.id !== appendixAId)
    throw new Error(`Appendix A identity ${gId(g)}`);
  return { gdx: g, source: { ...sources.p3ControlManifest, path: 'incumbents.appendixA.effective' } };
};

export const loadControls = (): Control[] => {
  const a = appendixA();
  const out: Control[] = [
    {
      key: 'A',
      label: 'control: Appendix A',
      role: 'exact control',
      selectable: true,
      gdx: a.gdx,
      gdxId: appendixAId,
      built: buildS(a.gdx),
      provenance:
        "browser-selected (Priority 3 brief Appendix A, the user's GDX Growth trial ledger, preview PV-3a29…/R-000040) with 2016-01-04 → 2026-10-30 in view: informed; never an independent seed",
      source: a.source
    }
  ];

  priorSet().forEach((p, i) => {
    const key = `P${String(i + 1).padStart(2, '0')}`;

    out.push({
      key,
      label: `control: ${key} ${p.from} ${p.roles[0]!.split(' ').at(-1)}`,
      role: 'prior control',
      selectable: true,
      gdx: p.gdx,
      gdxId: p.id,
      built: buildS(p.gdx),
      provenance: `${p.roles.join('; ')} — a GDX book selected in a pooled study on 2016–2024 beside anchors chosen with later data in view: informed; never an independent seed`,
      source: p.source
    });
  });

  out.push({
    key: 'CASH',
    label: 'reference: cash (no position)',
    role: 'cash reference',
    selectable: false,
    gdx: null,
    gdxId: null,
    built: buildS(null),
    provenance: 'the zero-profit, zero-drawdown reference (brief "Exact scope, controls and accounting")',
    source: null
  });

  for (const c of out)
    if (c.gdx && !onFineGrid(c.gdx)) throw new Error(`${c.label} is not exactly representable on the fine grid`);
  return out;
};

// The informed lane's seeds (C24 only): Appendix A and the prior set, unchanged.
export const informedSeeds = (): Seed[] =>
  loadControls()
    .filter((c) => c.gdx)
    .map((c) => ({
      label: c.label.replace(/^control: /, ''),
      gdx: c.gdx!,
      source: c.source ? `${c.source.file} ${c.source.path}` : 'none',
      cutoff:
        c.key === 'A'
          ? 'browser, 2016–2026 in view'
          : 'C24 pooled selection (2016–2024; anchors chosen with later data)'
    }));

// The complete settings of a configuration (every effective input of the GDX book, inactive inputs absent; the engine
// parameters it maps to; the disabled books).
export const settingsOf = (b: Pick<Built, 'id' | 'p3Id' | 'quad' | 'enabled'>) => {
  const g = b.enabled.includes('G:GDX') ? b.quad.g.GDX : null;

  return {
    id: b.id,
    priority3QuadId: b.p3Id,
    enabled: b.enabled,
    disabled: 'D1·GDX, D1·VGT and Growth·VGT disabled (Priority 3 placeholders, never run or funded)',
    growthGdx: g
      ? {
          identity: gId(g),
          entry: entryOf(g),
          class: classOf(g),
          effective: g,
          inactive:
            'every Growth 1.4.0 input absent from `effective` is inactive under this structure (the browser effectiveParams); its value cannot change behaviour or identity',
          engineParams: growthParamsOf(g, 'GDX', { from: chronology.firstSession, to: chronology.developmentEnd }),
          text: describeG(g)
        }
      : null,
    economics: {
      budget: 100_000,
      costBpsPerSide: 5,
      commission: 0,
      interest: '11% simple, 365-day',
      compounding: false
    }
  };
};

// The control manifest (sealed before any evaluation of the study): every control's complete effective settings,
// provenance and source pin, the prior-set rule and the informed seeds.
export const controlManifest = () => {
  const controls = loadControls();

  return {
    kind: 'gdx-growth-standalone control manifest',
    writtenAt: new Date().toISOString(),
    sources,
    appendixA: { id: appendixAId, developmentTarget: appendixADevelopment, nativeFullHistoryTarget: appendixATarget },
    priorRule:
      '(a) Priority 3C: every distinct GDX vector holding a formal role (actual-profit, robust-profit, balanced, lower-drawdown) in the sealed C24 role sets of arms R, O, G; (b) Priority 3B: every distinct GDX vector holding a formal role in the sealed C24 inclusion-G and inclusion-B role sets whose GDX book was funded at its development centre. Development roles only; no validation figure read; Appendix A excluded (it is the exact control).',
    controls: controls.map((c) => ({
      key: c.key,
      label: c.label,
      role: c.role,
      selectable: c.selectable,
      gdxId: c.gdxId,
      class: classOf(c.gdx),
      provenance: c.provenance,
      source: c.source,
      settings: settingsOf(c.built)
    })),
    informedSeeds: informedSeeds().map((s) => ({ label: s.label, id: gId(s.gdx), provenance: s.cutoff }))
  };
};

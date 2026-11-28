// The GDX incumbents (PROTOCOL.md §4; brief Phase 1.2 and Phase 3 item 3): exact, versioned, sourced phenotypes of the
// program's earlier GDX research, projected UNCHANGED onto the study's trading slot (context.ts). They are
//   - controls at every cutoff: qualified with the study's instrument beside each arm's members, replayed on every slice
//     and in the validation (descriptive; never members of the independent populations D, G, C, J, S);
//   - at C24 only, members of the INFORMED populations D+ and G+ (standard §3.2: the qualifying incumbents are members of
//     the selectable set under the same gates and the same primary rule) and the seeds of the informed lanes (§4.4).
// They were all chosen with 2016–2026 (or 2016–2024 beside VGT anchors chosen with later data) in view: informed, never an
// independent seed, never chronological evidence.
//
// GDX D1 incumbents — read ONLY from Assignment 3's sealed, sha256-pinned FROZEN_SELECTION.json (through the pin of
// Priority 5's incumbents.ts):
//   NORIG  N/original's D1·GDX book (A3 `C24/informed/GD.VB/R2#1 profit`, rc1-f1a8b57cb02455c3, cell GD1: family D with
//          the decline gate; its RC 2 controls): THE FIXED ABLATION of the brief (N/original with both VGT books disabled,
//          its exact GDX D1 phenotype unchanged — gate E3 proves the projection equals that native ablation)
//   NL0    New L0's D1·GDX book (5B `C24/L0/informed/R1#1 profit`, a2e385640ca61012, cell GA0: no controls)
//   VG2    VG #2 Balanced's D1·GDX book `d1-7b99d2833d`, carried unchanged by A3's `incumbent: C4` (f324035d15f69610, cell
//          GA0), under the harmonized conventions (arming from 2016-01-04)
// GDX Growth incumbents — read ONLY from 4A's sealed, sha256-pinned FROZEN_SELECTION.json (`export4B`, 4A's own frozen
// export set for the GDX-only D1 + Growth study):
//   G4A1   `C24/indep-rise#1 profit` (4A's primary; 8931194df7e7030d)
//   G4A2   `C24/informed#2 robust` (4A's robust-profit; 73b989f585758ccb)
//   P08    `control: P08 3C G robust-profit` (97c5f01b151f7e1c)
//   P09    `control: P09 3C G lower-drawdown` (64f0d3125db3228e)
//   APXA   `control: Appendix A` (07cac3329fc7a520; browser-selected with 2016–2026 in view)
// Joint controls (arm J; descriptive only): N/original's GDX D1 book with each GDX Growth incumbent in the one slot.
import fs from 'node:fs';
import path from 'node:path';
import { type Cfg as A3Cfg, canonicalCfg as a3CanonicalCfg, cellOf as a3CellOf, cfgId as a3CfgId, cellOfControls } from '../vg-l0-full-joint/space.ts';
import { a3FrozenSelection, references } from '../vg-l0-n-successor/incumbents.ts';
import { effectiveOf, repair } from '../growth140-vgt-stable/space.ts';
import { type ArmKey, repoRoot } from './context.ts';
import type { Member } from './qualify.ts';
import { isSealed, sha256File } from './records.ts';
import {
  type Cfg,
  type GConfig,
  cellIdOf,
  cellOf,
  cfgOf,
  controlValuesOf,
  entryDayOf,
  exitsOptions,
  gId,
  inertD1,
  istopOptions,
  pairCfg,
  structureOf
} from './space.ts';

export const sources = {
  a3: { file: path.relative(repoRoot, a3FrozenSelection.file), sha256: a3FrozenSelection.sha256 },
  gdx4a: { file: 'research/gdx-growth-standalone/FROZEN_SELECTION.json', sha256: '5d2621541ccb378e8f0451f0da99420b94d55967b9e160c1cfe2628619632558' }
} as const;

const readPinned = <T>(src: { file: string; sha256: string }): T => {
  const f = path.join(repoRoot, src.file);

  if (!isSealed(f)) throw new Error(`${src.file} is not sealed (read-only)`);
  if (sha256File(f) !== src.sha256) throw new Error(`${src.file} differs from its pin ${src.sha256.slice(0, 12)}`);
  return JSON.parse(fs.readFileSync(f, 'utf8')) as T;
};

export type D1Key = 'NORIG' | 'NL0' | 'VG2';
export type GKey = 'G4A1' | 'G4A2' | 'P08' | 'P09' | 'APXA';
export const d1Keys: readonly D1Key[] = ['NORIG', 'NL0', 'VG2'];
export const gKeys: readonly GKey[] = ['G4A1', 'G4A2', 'P08', 'P09', 'APXA'];

const d1Spec: Record<D1Key, { name: string; a3Label: string; id: string; provenance: string }> = {
  NORIG: {
    name: 'N/original GDX D1 (ablation)',
    a3Label: 'C24/informed/GD.VB/R2#1 profit',
    id: 'rc1-f1a8b57cb02455c3',
    provenance: 'N/original (Assignment 3 informed C24 primary; chosen with 2016–2026 in view): its D1·GDX book with its RC 2 controls; N/original with both VGT books disabled'
  },
  NL0: {
    name: 'New L0 GDX D1',
    a3Label: 'newL0 (5B C24/L0/informed/R1#1 profit)',
    id: 'a2e385640ca61012',
    provenance: 'New L0 (5B L0 informed C24 primary; the immutable original benchmark): its D1·GDX book, no controls'
  },
  VG2: {
    name: 'VG #2 GDX D1',
    a3Label: 'incumbent: C4',
    id: 'f324035d15f69610',
    provenance: 'VG #2 Balanced (Study 8 S8-VG-F24-3) D1·GDX book d1-7b99d2833d, as carried by C4 in Assignment 3’s sealed record (harmonized conventions)'
  }
};
const gSpec: Record<GKey, { name: string; label4a: string; gdxId: string }> = {
  G4A1: { name: '4A primary indep-rise#1', label4a: 'C24/indep-rise#1 profit', gdxId: '8931194df7e7030d' },
  G4A2: { name: '4A informed#2 robust', label4a: 'C24/informed#2 robust', gdxId: '73b989f585758ccb' },
  P08: { name: '4A/3C P08', label4a: 'control: P08 3C G robust-profit', gdxId: '97c5f01b151f7e1c' },
  P09: { name: '4A/3C P09', label4a: 'control: P09 3C G lower-drawdown', gdxId: '64f0d3125db3228e' },
  APXA: { name: 'Appendix A', label4a: 'control: Appendix A', gdxId: '07cac3329fc7a520' }
};

// the source configuration of a GDX D1 incumbent (Assignment 3's representation, verified by identity)
export const d1Source = (k: D1Key): A3Cfg => {
  const spec = d1Spec[k];

  if (k === 'NORIG' || k === 'NL0') {
    const ref = references()[k];

    if (ref.id !== spec.id) throw new Error(`${k}: identity ${ref.id} ≠ ${spec.id}`);
    return ref.cfg;
  }

  const fs0 = readPinned<{ finalists: { label: string; id: string; cfg: A3Cfg }[] }>(sources.a3);
  const row = fs0.finalists.find((x) => x.label === spec.a3Label && x.id === spec.id);

  if (!row) throw new Error(`${k}: ${spec.a3Label} is not in Assignment 3's frozen selection`);

  const cfg = a3CanonicalCfg(row.cfg);

  if (a3CfgId(cfg) !== spec.id) throw new Error(`${k}: identity ${a3CfgId(cfg)} ≠ ${spec.id}`);
  if (cellOfControls(cfg.controls) !== cfg.cell) throw new Error(`${k}: controls express ${cellOfControls(cfg.controls)} ≠ ${cfg.cell}`);
  return cfg;
};

// the source Growth configuration of a GDX Growth incumbent (4A's effective settings, verified by identity)
export const gSource = (k: GKey): GConfig => {
  const spec = gSpec[k];
  const f = readPinned<{ export4B: { label: string; settings: { growthGdx: { identity: string; effective: GConfig } } }[] }>(sources.gdx4a);
  const row = f.export4B.find((x) => x.label === spec.label4a);

  if (!row) throw new Error(`${k}: ${spec.label4a} is not in 4A's export set`);
  if (row.settings.growthGdx.identity !== spec.gdxId) throw new Error(`${k}: 4A identity ${row.settings.growthGdx.identity} ≠ ${spec.gdxId}`);

  const g = effectiveOf(repair({ ...row.settings.growthGdx.effective }));

  if (gId(g) !== spec.gdxId) throw new Error(`${k}: canonical identity ${gId(g)} ≠ ${spec.gdxId}`);
  return g;
};

// the GDX D1 book of a source configuration projected onto the trading slot (vector, RC 2 controls, activation unchanged)
const d1Parts = (k: D1Key) => {
  const src = d1Source(k);

  return { structure: a3CellOf(src.cell).GDX, d1: { ...src.d1.GDX }, ctl: controlValuesOf(src, 'GDX'), entryDay: entryDayOf(src, 'GDX') };
};
const gCellOf = (g: GConfig) => {
  const st = structureOf(g);

  return { exits: exitsOptions.indexOf(st.exits), istop: istopOptions.indexOf(st.istop) };
};

export const d1Incumbent = (k: D1Key): Cfg => {
  const p = d1Parts(k);

  return cfgOf(cellOf(cellIdOf('D', { d1: p.structure })), p.d1, p.ctl, p.entryDay, d1Source(k).g);
};
export const gIncumbent = (k: GKey): Cfg => {
  const g = gSource(k);

  return cfgOf(cellOf(cellIdOf('G', gCellOf(g))), inertD1, {}, false, g);
};
// a joint control: the D1 book of a D1 incumbent and the Growth book of a Growth incumbent in arm J's cell (pairCfg's
// construction in J's cell, so the control is qualified with arm J's options and instrument)
export const jIncumbent = (d: D1Key, gk: GKey): Cfg => {
  const p = d1Parts(d);
  const g = gSource(gk);
  const c = pairCfg(d1Incumbent(d), gIncumbent(gk)); // validates the parts (a D1 book and a Growth book)

  return cfgOf(cellOf(cellIdOf('J', { d1: p.structure, ...gCellOf(g) })), c.d1.VGT, controlValuesOf(c, 'VGT'), entryDayOf(c, 'VGT'), g);
};

export const controlArms: readonly Extract<ArmKey, 'D' | 'G' | 'J'>[] = ['D', 'G', 'J'];
const jPairs: readonly [D1Key, GKey][] = gKeys.map((g) => ['NORIG', g] as [D1Key, GKey]);

export const controlLabel = {
  D: (k: D1Key) => `control: ${d1Spec[k].name}`,
  G: (k: GKey) => `control: ${gSpec[k].name}`,
  J: (d: D1Key, g: GKey) => `control: ${d1Spec[d].name} + ${gSpec[g].name}`
};
const member = (label: string, arm: ArmKey, cfg: Cfg, pick: string): Member => ({
  label,
  arm,
  lane: 'control',
  stage: 'control',
  replicate: null,
  cfg,
  pick,
  sources: [{ label, lane: 'control', pick }]
});

export const controlMembers = (arm: Extract<ArmKey, 'D' | 'G' | 'J'>): Member[] =>
  arm === 'D'
    ? d1Keys.map((k) => member(controlLabel.D(k), 'D', d1Incumbent(k), `${d1Spec[k].provenance}; ${sources.a3.file} (${sources.a3.sha256.slice(0, 16)}…) ${d1Spec[k].a3Label}`))
    : arm === 'G'
      ? gKeys.map((k) => member(controlLabel.G(k), 'G', gIncumbent(k), `4A export set ${gSpec[k].label4a} (${gSpec[k].gdxId}); ${sources.gdx4a.file} (${sources.gdx4a.sha256.slice(0, 16)}…)`))
      : jPairs.map(([d, g]) => member(controlLabel.J(d, g), 'J', jIncumbent(d, g), `${d1Spec[d].name} with ${gSpec[g].name} in one slot (D1 first); descriptive joint control`));

// the informed seeds of an arm at C24 (arms D and G): every incumbent of the arm, grouped by its cell
export const informedSeedsOf = (arm: 'D' | 'G'): { cell: string; seeds: { label: string; cfg: Cfg }[] }[] => {
  const ms = controlMembers(arm);
  const byCell = new Map<string, { label: string; cfg: Cfg }[]>();

  for (const m of ms) {
    const list = byCell.get(m.cfg.cell) ?? [];

    list.push({ label: m.label, cfg: m.cfg });
    byCell.set(m.cfg.cell, list);
  }
  return [...byCell.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([cell, seeds]) => ({ cell, seeds }));
};

// the incumbent records for reports (exact source, identity, cell)
export const incumbentManifest = () => ({
  sources,
  d1: d1Keys.map((k) => ({ key: k, label: controlLabel.D(k), ...d1Spec[k], cell: d1Incumbent(k).cell, cfg: d1Incumbent(k) })),
  growth: gKeys.map((k) => ({ key: k, label: controlLabel.G(k), ...gSpec[k], cell: gIncumbent(k).cell, cfg: gIncumbent(k) })),
  joint: jPairs.map(([d, g]) => ({ label: controlLabel.J(d, g), d1: d, g, cell: jIncumbent(d, g).cell }))
});

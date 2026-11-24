// The frozen references (PROTOCOL.md §2, §4), read ONLY from Assignment 3's sealed, sha256-pinned FROZEN_SELECTION.json:
//   N/original — Assignment 3 `C24/informed/GD.VB/R2#1 profit`, id rc1-f1a8b57cb02455c3, cell GD1.VB0: the primary of
//                Assignment 3's populations N and U under NL0's original rule; the preferred research incumbent, Track N's
//                only seed, and the qualifying-incumbent fallback of populations N and U (standard §3.2);
//   New L0     — 5B `C24/L0/informed/R1#1 profit`, Priority 3 quad a2e385640ca61012, legacy cell GA0.VA0 (no controls):
//                the immutable original benchmark; a descriptive control at every cutoff and an incumbent member of N/U.
// I1 (Priority 4's S1-enabled informed EXP primary) cannot run on this S1-free engine: it is reported only from its own
// sealed Priority 4 records (research/vg-l0-staged-stop on branch research/vg-l0-staged-trailing-stop), never evaluated.
import fs from 'node:fs';
import path from 'node:path';
import { type Cfg, canonicalCfg, cellOfControls, cfgId } from '../vg-l0-full-joint/space.ts';
import { repoRoot } from './context.ts';
import { isSealed, sha256File } from './records.ts';

export const a3FrozenSelection = {
  file: path.join(repoRoot, 'research', 'vg-l0-full-joint', 'FROZEN_SELECTION.json'),
  sha256: '4080d4b1ca4db93296876f009307ce7cd055e1ab04f16133f7761c40a288f2d7'
};

export type RefKey = 'NORIG' | 'NL0';
export interface Reference {
  key: RefKey;
  label: string;
  id: string;
  source: string;
  cfg: Cfg;
  sealed: { development: { net: number; dd: number; lots: number }; full: { net: number; dd: number; lots: number; signature: string } };
}

export const referenceSpec: Record<RefKey, { label: string; id: string; a3Label: string; development: Reference['sealed']['development']; full: Reference['sealed']['full'] }> = {
  NORIG: {
    label: 'N/original',
    id: 'rc1-f1a8b57cb02455c3',
    a3Label: 'C24/informed/GD.VB/R2#1 profit',
    development: { net: 388031.02, dd: 19459.83, lots: 32 },
    full: { net: 482700.73, dd: 20385.99, lots: 44, signature: '54d1c2e07c2dbbfd' }
  },
  NL0: {
    label: 'New L0',
    id: 'a2e385640ca61012',
    a3Label: 'control: New L0',
    development: { net: 382721.46, dd: 19459.83, lots: 34 },
    full: { net: 479605.18, dd: 20385.99, lots: 46, signature: '7b17578108747911' }
  }
};

let cache: Record<RefKey, Reference> | null = null;

export const references = (): Record<RefKey, Reference> => {
  if (cache) return cache;

  const f = a3FrozenSelection.file;

  if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed (read-only)`);
  if (sha256File(f) !== a3FrozenSelection.sha256) throw new Error(`${path.relative(repoRoot, f)} differs from its pin ${a3FrozenSelection.sha256.slice(0, 12)}`);

  const fs0 = JSON.parse(fs.readFileSync(f, 'utf8')) as { finalists: { label: string; id: string; cfg: Cfg }[]; newL0: { label: string; id: string; cfg: Cfg } };
  const out = {} as Record<RefKey, Reference>;

  for (const key of ['NORIG', 'NL0'] as const) {
    const spec = referenceSpec[key];
    const row = key === 'NL0' ? fs0.newL0 : fs0.finalists.find((x) => x.id === spec.id && x.label === spec.a3Label);

    if (!row) throw new Error(`${spec.label}: not in Assignment 3's frozen selection`);

    const cfg = canonicalCfg(row.cfg);

    if (cfgId(cfg) !== spec.id) throw new Error(`${spec.label}: identity ${cfgId(cfg)} ≠ ${spec.id}`);
    if (cellOfControls(cfg.controls) !== cfg.cell) throw new Error(`${spec.label}: controls express ${cellOfControls(cfg.controls)} ≠ ${cfg.cell}`);
    out[key] = {
      key,
      label: spec.label,
      id: spec.id,
      source: `research/vg-l0-full-joint/FROZEN_SELECTION.json (${a3FrozenSelection.sha256.slice(0, 16)}…) ${spec.a3Label}`,
      cfg,
      sealed: { development: spec.development, full: spec.full }
    };
  }

  cache = out;
  return out;
};

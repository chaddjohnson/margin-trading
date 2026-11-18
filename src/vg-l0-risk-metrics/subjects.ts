// The audited subjects (PROTOCOL.md §4), read from the completed studies' sealed records with their sha256 pinned —
// never rebuilt from prose — with their provenance labels and their sealed FULL parity targets.
import path from 'node:path';
import { incumbents } from '../vg-l0-full-joint/nl0.ts';
import { placeholder } from '../vg-lifecycle-matched-optimization/config.ts';
import type { Cfg } from '../vg-l0-full-joint/space.ts';
import type { RiskConfig2 } from '../d1-risk-controls-rc2/config.ts';
import type { D1Grid } from '../vg-d1-growth-joint/books.ts';
import { fullJoint, repoRoot } from './context.ts';
import { subjectOfCfg, type Subject } from './engine.ts';
import { readPinned } from './records.ts';

export const pins = {
  a3Frozen: { file: fullJoint.frozenSelection, sha256: fullJoint.frozenSelectionSha256 },
  a3Validation: { file: path.join(fullJoint.dir, 'results/validation/validation.json'), sha256: '05cddeebad2142f44bfab156860406adbaf697f041a8432c671cfef5b71a5408' },
  a2Frozen: { file: path.join(repoRoot, 'research/vg-l0-risk-families/FROZEN_SELECTION.json'), sha256: '4174ae535ca25dd96a86c06d22420a8ce685ffcabb643e2e04f764211938a143' },
  a2Validation: { file: path.join(repoRoot, 'research/vg-l0-risk-families/results/validation/validation.json'), sha256: '730dc7802c9852343fc163077d80d569dd358fd4390f678efb6d2e0569e31655' }
} as const;

export interface ParityTarget {
  net: number;
  dd: number;
  lots: number;
  developmentNet: number;
  validationPnl: number;
  resetValidationDd: number;
}

export interface AuditSubject {
  key: string; // short name used in tables
  label: string; // the sealed label
  provenance: string;
  subject: Subject;
  cfg: Cfg | null; // Assignment 3's canonical configuration (null for Assignment 2 rows, whose Growth·VGT is New L0's)
  target: ParityTarget;
}

type A3Frozen = { finalists: { label: string; cfg: Cfg; why: string[]; track: string }[]; newL0: { cfg: Cfg }; procedures: { population: string; selector: string; primary: string | null }[] };
type ValRows = { newL0: ParityTarget; rows: (ParityTarget & { label: string })[] };

const a3Short: Record<string, string> = {
  'C24/informed/GD.VB/R2#1 profit': 'N/original',
  'C24/informed/GB.VD/R2#4 best GB0.VD1': 'N/RA1',
  'C24/refine/GA0.VA0/R2#6 profit order': 'L/RA1',
  'C24/refine/GA0.VA0/R2#1 profit': 'L/original',
  'C24/refine/GD1.VC1/R2#1 profit': 'F/original',
  'C24/refine/GB0.VB1/R2#1 profit': 'F/RA1',
  'C24/refine/GB0.VB1/R2#3 control alternative': 'B/RA1',
  'incumbent: C4': 'C4',
  'incumbent: C4R': 'C4-refined'
};

export const keySubjects = ['New L0', 'N/original', 'N/RA1', 'L/RA1', 'L/original', 'F/original', 'F/RA1', 'B/RA1', 'A2 F/RA1', 'A2 F/original'] as const;

export const auditSubjects = (): AuditSubject[] => {
  const fz = readPinned<A3Frozen>(pins.a3Frozen.file, pins.a3Frozen.sha256);
  const val = readPinned<ValRows>(pins.a3Validation.file, pins.a3Validation.sha256);
  const nl0 = incumbents().NL0; // 5B R01, identity-checked against 5B's cfgId and Priority 3's quadId
  const out: AuditSubject[] = [
    {
      key: 'New L0',
      label: 'New L0 (5B C24/L0/informed/R1#1 profit)',
      provenance: 'frozen official baseline; incumbent-informed (5B informed lane); chosen with later data',
      subject: { quad: nl0.quad, controls: null },
      cfg: fz.newL0.cfg,
      target: val.newL0
    }
  ];

  for (const f of fz.finalists) {
    if (f.label === 'incumbent: New L0') continue;

    const t = val.rows.find((r) => r.label === f.label);

    if (!t) throw new Error(`no validation row for ${f.label}`);
    out.push({
      key: a3Short[f.label] ?? f.label,
      label: f.label,
      provenance: f.track === 'N' ? 'Assignment 3 Track N: incumbent-informed; no independent chronological test' : 'Assignment 3 Track I: independent search (C24 evidence)',
      subject: subjectOfCfg(f.cfg),
      cfg: f.cfg,
      target: t
    });
  }

  const a2 = readPinned<{ twoByTwoPrimaries: Record<string, string>; finalists: { label: string; cfg: { cell: string; d1: Record<'GDX' | 'VGT', D1Grid>; controls: RiskConfig2 | null } }[] }>(pins.a2Frozen.file, pins.a2Frozen.sha256);
  const a2val = readPinned<ValRows>(pins.a2Validation.file, pins.a2Validation.sha256);
  const a2Short: Record<string, string> = { 'all × RA1': 'A2 F/RA1', 'all × original': 'A2 F/original', 'legacy × original': 'A2 L/original' };

  for (const [k, label] of Object.entries(a2.twoByTwoPrimaries)) {
    if (!a2Short[k]) continue;

    const f = a2.finalists.find((x) => x.label === label)!;
    const t = a2val.rows.find((r) => r.label === label)!;

    out.push({
      key: a2Short[k]!,
      label: `Assignment 2 ${label}`,
      provenance: 'Assignment 2 C24 primary: D1 searched independently, Growth·VGT frozen at New L0’s (conditional)',
      subject: { quad: { d1: f.cfg.d1, g: { GDX: placeholder, VGT: nl0.quad.g.VGT }, first: 'D1' }, controls: f.cfg.controls },
      cfg: null,
      target: t
    });
  }

  return out;
};

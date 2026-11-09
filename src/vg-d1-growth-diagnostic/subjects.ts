// The frozen subjects (PROTOCOL.md §3): every member of Priority 3's sealed C24 qualification record and of its sealed
// Growth-pair qualification record, with its exact configuration, enabled components and sealed centre record — read
// from those records (verified by sha256), never transcribed or inferred from summaries.
import { type BookId, bookIds } from '../vg-d1-growth-joint/books.ts';
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import type { Evidence } from '../vg-d1-growth-joint/qualify.ts';
import { type Quad, normalize, quadId } from '../vg-d1-growth-joint/space.ts';
import { readP3 } from './records.ts';

export interface Subject {
  key: string; // this study's short key (A, B, C, D, GP4, GP085, IP, XP, SP, G01…G12, I01…I16, …)
  label: string; // Priority 3's label
  group: string;
  id: string;
  quad: Quad;
  options: EvalOptions;
  enabled: BookId[];
  need: 'mixed' | 'G';
  source: string; // the sealed record it comes from
  evidence: Evidence; // the sealed qualification evidence (centre, confirmation, scopes, toggles, removals)
  full: boolean; // replayed on FULL (the frozen retrospective subjects)
}

// Labels of the named subjects (the brief §2).
export const named: Record<string, { label: string; group: string; full: boolean }> = {
  A: { label: 'control: VG #2 + Growth #4 (VGT) + Appendix A (GDX)', group: 'unchanged four-component', full: true },
  B: {
    label: 'control: VG #2 + Growth 08500a60 (VGT) + Appendix A (GDX)',
    group: 'unchanged four-component',
    full: true
  },
  C: { label: 'control: VG #2 + Growth #4 (VGT) — three components', group: 'three-component control', full: true },
  D: { label: 'control: VG #2 Balanced (D1·GDX + D1·VGT)', group: 'D1-only control', full: true },
  GP4: { label: 'control: Growth pair: #4 (VGT) + Appendix A (GDX)', group: 'Growth-only control', full: true },
  GP085: {
    label: 'control: Growth pair: 08500a60 (VGT) + Appendix A (GDX)',
    group: 'Growth-only control',
    full: true
  },
  IP: { label: 'C24/informed#1 profit', group: 'informed primary (final primary)', full: true },
  XP: { label: 'C24/indep/GDX-rise_VGT-rise#1 profit', group: 'independent primary', full: true },
  SP: {
    label: 'staged: VG #2 + C24/gpair/GDX-breakout_VGT-rise#3 profit order',
    group: 'staged primary',
    full: true
  }
};

const optionsOf = (enabled: readonly BookId[]): EvalOptions => {
  const off = bookIds.filter((b) => !enabled.includes(b));

  return off.length ? { enabled: Object.fromEntries(off.map((b) => [b, false])) } : {};
};

interface SelectionRecord {
  evidence: Evidence[];
}

export const loadSubjects = (): Subject[] => {
  const c24 = readP3<SelectionRecord>('results/folds/C24/selection.json');
  const gp = readP3<SelectionRecord>('results/gpair/C24/selection.json');
  const out: Subject[] = [];
  const byLabel = new Map<string, { e: Evidence; source: string }>();

  for (const e of c24.evidence) byLabel.set(e.label, { e, source: 'results/folds/C24/selection.json' });
  for (const e of gp.evidence) byLabel.set(e.label, { e, source: 'results/gpair/C24/selection.json' });

  const add = (key: string, e: Evidence, source: string, group: string, full: boolean) => {
    const quad = normalize(e.quad);

    if (quadId(quad) !== e.id) throw new Error(`${e.label}: the sealed quad does not hash to its id ${e.id}`);
    out.push({
      key,
      label: e.label,
      group,
      id: e.id,
      quad,
      options: optionsOf(e.enabled),
      enabled: e.enabled,
      need: e.kind === 'gpair' || e.enabled.every((b) => b.startsWith('G:')) ? 'G' : 'mixed',
      source,
      evidence: e,
      full
    });
  };

  for (const [key, n] of Object.entries(named)) {
    const x = byLabel.get(n.label);

    if (!x) throw new Error(`subject ${key} (${n.label}) is not in the sealed records`);
    add(key, x.e, x.source, n.group, n.full);
  }

  const used = new Set(out.map((s) => s.label));
  let g = 0;
  let i = 0;
  let o = 0;

  for (const e of gp.evidence)
    if (e.kind === 'gpair')
      add(
        `G${String(++g).padStart(2, '0')}`,
        e,
        'results/gpair/C24/selection.json',
        'Growth-pair shortlist (arm B)',
        false
      );
  for (const e of c24.evidence)
    if (e.kind === 'indep')
      add(
        `I${String(++i).padStart(2, '0')}`,
        e,
        'results/folds/C24/selection.json',
        'independent C24 finalist (arm D)',
        false
      );
  for (const e of c24.evidence)
    if (!used.has(e.label) && e.kind !== 'indep')
      add(
        `O${String(++o).padStart(2, '0')}`,
        e,
        'results/folds/C24/selection.json',
        `other C24 member (${e.kind})`,
        false
      );

  if (g !== 12 || i !== 16)
    throw new Error(`expected 12 Growth-pair and 16 independent finalists, found ${g} and ${i}`);
  return out;
};

// VG #2's native convention (Study 8: D1 arming 2017-06-15), the bridge to the harmonized control D.
export const nativeOptions = (d: Subject): EvalOptions => ({ ...d.options, d1Arm: 'native' });

export const sealedCentre = (s: Subject): Rec => s.evidence.centre;

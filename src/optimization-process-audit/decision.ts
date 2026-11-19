// The frozen decision rule (PROTOCOL.md §7.5) and the futility rule (§7.6), as pure functions.
import { economics } from './context.ts';
import type { SubjectKey } from './sources.ts';

export interface PolicyPath {
  slices: { fold: string; label: string | null; sliceNet: number; sliceDd: number }[];
  net: number;
  sequentialDd: number;
}

export interface SubjectVerdict {
  M1: boolean;
  M2: boolean;
  M3: boolean;
  M4: boolean;
  all: boolean;
  slicesNotWorse: number;
  newBreaches: string[];
  invested: number;
  identicalToP0: boolean;
}

export const subjectVerdict = (p: PolicyPath, p0: PolicyPath): SubjectVerdict => {
  const ceiling = economics.ceiling;
  const notWorse = p.slices.filter((x, i) => x.sliceNet >= p0.slices[i]!.sliceNet).length;
  const newBreaches = p.slices.filter((x, i) => x.sliceDd > ceiling && p0.slices[i]!.sliceDd <= ceiling).map((x) => x.fold);
  const invested = p.slices.filter((x) => x.label !== null).length;
  const M1 = p.sequentialDd <= ceiling;
  const M2 = p.net > Math.max(p0.net, 0);
  const M3 = notWorse >= 2 && newBreaches.length === 0;
  const M4 = invested >= 2;

  return {
    M1,
    M2,
    M3,
    M4,
    all: M1 && M2 && M3 && M4,
    slicesNotWorse: notWorse,
    newBreaches,
    invested,
    identicalToP0: p.slices.every((x, i) => x.label === p0.slices[i]!.label)
  };
};

export type Classification = 'merits further confirmation' | 'one-subject signal' | 'risk-only change' | 'no demonstrated improvement';

export const classify = (v: Record<SubjectKey, SubjectVerdict>): Classification => {
  const ks = Object.keys(v) as SubjectKey[];
  const allIn = ks.filter((k) => v[k].all).length;

  if (allIn === ks.length) return 'merits further confirmation';
  if (allIn === 1) return 'one-subject signal';
  if (ks.every((k) => v[k].M1) && ks.some((k) => !v[k].M2)) return 'risk-only change';
  return 'no demonstrated improvement';
};

// §7.6: FULL opens only if at least one experimental policy merits further confirmation.
export const futile = (classes: Classification[]) => !classes.includes('merits further confirmation');

// §8: a policy that merits further confirmation is consistent in 2025–2026 iff in both subjects its primary-universe
// choice passes V1–V3 and in at least one subject its validation P&L ≥ P0's.
export const consistentInValidation = (
  rows: Record<SubjectKey, { p: { pnl: number; resetDd: number; wholeDd: number } | null; p0: { pnl: number } | null }>
) => {
  const ks = Object.keys(rows) as SubjectKey[];
  const pass = (x: { pnl: number; resetDd: number; wholeDd: number } | null) =>
    !!x && x.pnl > 0 && x.resetDd <= economics.ceiling && x.wholeDd <= economics.ceiling;

  return ks.every((k) => pass(rows[k].p)) && ks.some((k) => (rows[k].p?.pnl ?? -Infinity) >= (rows[k].p0?.pnl ?? Infinity));
};

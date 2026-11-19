// Qualification, roles and the fold's selected configuration (PROTOCOL.md §7), identical at every cutoff. Pure
// functions over evaluation records; nothing here runs the engine.
import { ceiling, etfSets } from './context.ts';
import type { EvalRecord } from './evaluate.ts';
import { type Cell, type Spec, label, specId } from './specs.ts';

export const quantile = (values: readonly number[], q: number) => {
  if (values.length === 0) return NaN;

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
};

export const median = (values: readonly number[]) => quantile(values, 0.5);

export interface NeighbourhoodStats {
  n: number;
  unique: number; // distinct specs
  medianDelta: number;
  p10Delta: number;
  p90Delta: number;
  maxDd: number;
  p90Dd: number;
  shareBelowCeiling: number;
  distinctSignatures: number;
  shareUnchangedVsOff: number;
  shareSameAsCentre: number;
}

export const neighbourhoodStats = (
  points: readonly EvalRecord[],
  off: EvalRecord,
  centre: EvalRecord
): NeighbourhoodStats => {
  const deltas = points.map((p) => p.net - off.net);
  const dds = points.map((p) => p.dd);

  return {
    n: points.length,
    unique: new Set(points.map((p) => specId(p.spec))).size,
    medianDelta: median(deltas),
    p10Delta: quantile(deltas, 0.1),
    p90Delta: quantile(deltas, 0.9),
    maxDd: Math.max(...dds),
    p90Dd: quantile(dds, 0.9),
    shareBelowCeiling: points.filter((p) => p.dd < ceiling).length / points.length,
    distinctSignatures: new Set(points.map((p) => p.signature)).size,
    shareUnchangedVsOff: points.filter((p) => p.signature === off.signature).length / points.length,
    shareSameAsCentre: points.filter((p) => p.signature === centre.signature).length / points.length
  };
};

export interface Candidate {
  key: string;
  label: string;
  set: string;
  cells: Partial<Record<'VGT' | 'GDX', Cell>>;
  spec: Spec;
  net: number;
  dd: number;
  delta: number;
  ddDelta: number;
  late: number;
  changed: boolean;
  signature: string;
  explore: NeighbourhoodStats;
  confirm: NeighbourhoodStats | null;
  checks: Record<string, boolean>;
  exploratoryEligible: boolean;
  qualified: boolean;
  roles: string[];
  canonicalRank: number;
}

const setRank = (set: string) => {
  const i = (etfSets as readonly string[]).indexOf(set);

  return i < 0 ? etfSets.length : i;
};

export const candidateOf = (
  spec: Spec,
  set: string,
  record: EvalRecord,
  off: EvalRecord,
  explore: readonly EvalRecord[],
  confirm: readonly EvalRecord[] | null,
  canonicalRank: number
): Candidate => {
  const delta = record.net - off.net;
  const changed = record.signature !== off.signature;
  const x = neighbourhoodStats(explore, off, record);
  const c = confirm ? neighbourhoodStats(confirm, off, record) : null;
  const checks: Record<string, boolean> = {
    changed,
    deltaPositive: delta > 0,
    ddBelowCeiling: record.dd < ceiling,
    exploreMedianPositive: x.medianDelta > 0,
    exploreAllBelowCeiling: x.maxDd < ceiling,
    ...(c ? { confirmMedianPositive: c.medianDelta > 0, confirmShareBelowCeiling: c.shareBelowCeiling >= 0.9 } : {})
  };
  const exploratoryEligible =
    checks.changed! &&
    checks.deltaPositive! &&
    checks.ddBelowCeiling! &&
    checks.exploreMedianPositive! &&
    checks.exploreAllBelowCeiling!;

  return {
    key: specId(spec),
    label: label(spec),
    set,
    cells: spec.eligibility,
    spec,
    net: record.net,
    dd: record.dd,
    delta,
    ddDelta: record.dd - off.dd,
    late: record.late,
    changed,
    signature: record.signature,
    explore: x,
    confirm: c,
    checks,
    exploratoryEligible,
    qualified: exploratoryEligible && c !== null && checks.confirmMedianPositive! && checks.confirmShareBelowCeiling!,
    roles: [],
    canonicalRank
  };
};

// Ties: larger Δ, smaller dd, then canonical order (S: VGT, GDX, VGT+GDX; smaller A; smaller E).
const tieBreak = (a: Candidate, b: Candidate) => b.delta - a.delta || a.dd - b.dd || a.canonicalRank - b.canonicalRank;

export const assignRoles = (candidates: Candidate[]) => {
  const qualified = candidates.filter((c) => c.qualified);
  const roles: Record<string, Candidate | null> = { 'high-profit': null, balanced: null, 'lower-drawdown': null };

  if (qualified.length === 0) return { roles, priority: [] as Candidate[], selected: null as Candidate | null };

  const highProfit = [...qualified].sort((a, b) => b.explore.medianDelta - a.explore.medianDelta || tieBreak(a, b))[0]!;
  const balanced = [...qualified].sort(
    (a, b) => b.delta - Math.max(0, b.ddDelta) - (a.delta - Math.max(0, a.ddDelta)) || tieBreak(a, b)
  )[0]!;
  const lowerDd = [...qualified].sort(
    (a, b) => a.dd - b.dd || b.explore.medianDelta - a.explore.medianDelta || a.canonicalRank - b.canonicalRank
  )[0]!;

  roles['high-profit'] = highProfit;
  roles.balanced = balanced;
  roles['lower-drawdown'] = lowerDd;

  for (const [role, holder] of Object.entries(roles)) holder!.roles.push(role);

  const priority = [...new Set([highProfit, balanced, lowerDd])];

  return { roles, priority, selected: highProfit };
};

export const canonicalRankOf = (set: string, cell: Cell, ages: readonly number[], es: readonly number[]) =>
  setRank(set) * 1000 + ages.indexOf(cell.A) * 10 + es.indexOf(cell.e);

// The refinement trigger (PROTOCOL.md §6): both single-ETF sets have exploratory-eligible members.
export const refinementTrigger = (candidates: readonly Candidate[]) => {
  const top = (set: string) =>
    candidates
      .filter((c) => c.set === set && c.exploratoryEligible)
      .sort((a, b) => b.explore.medianDelta - a.explore.medianDelta || tieBreak(a, b))
      .slice(0, 3);
  const vgt = top('VGT');
  const gdx = top('GDX');

  return { triggered: vgt.length > 0 && gdx.length > 0, vgt, gdx };
};

// The profit/drawdown frontier: no other configuration has ≥ net and ≤ dd with one strictly better.
export const frontier = <T extends { net: number; dd: number }>(rows: readonly T[]) =>
  rows.filter(
    (row) =>
      !rows.some((other) => other.net >= row.net && other.dd <= row.dd && (other.net > row.net || other.dd < row.dd))
  );

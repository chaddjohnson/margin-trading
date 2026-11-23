// The precommitted statistics of PROTOCOL.md §1 and §9 — pure functions, frozen with the protocol (tests/stats.test.ts).
//   pairs       per (cutoff, cell, replicate): D = V(EXP lane) − V(CTRL lane) (V = $0 without a qualified member)
//   bootstrap   B = 100,000 resamples STRATIFIED by cell (each resample draws each cell's replicates with replacement);
//               L90 / U90 = the 0.10 / 0.90 quantiles of the bootstrap means (linear interpolation, the repository's
//               quantile); Rng.from('vg-l0-staged-stop', 'bootstrap', <statistic>, <cutoff>)
//   material    mean D ≥ $10,000 and L90 > 0
//   risk NI     U90 of each paired risk difference < its margin (+$2,500; +2 points of breach share); clearly worse: L90 > margin
//   mechanism   ≥ 50 % of EXP representatives use S1, and the ON representatives' advantage over their all-OFF projections
//               has an unstratified bootstrap L90 > 0 — at C21 and C24
//   label       PROTOCOL.md §1.4, in that order
import { Rng } from '../optimizer/rng.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { wilson } from '../vg-d1-growth-diagnostic/risk.ts';
import { STUDY } from './context.ts';

export const margins = {
  material: 10_000,
  riskDollar: 2_500,
  riskBreachShare: 0.02,
  stagedUse: 0.5,
  intervalDd: 5_000,
  bootstrap: 100_000
};

export interface Pair<T = number> {
  cutoff: string;
  cell: string;
  replicate: number;
  ctrl: T;
  exp: T;
}

export const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);

// the B bootstrap means, sorted (groups: one array per stratum, in a fixed order)
export const bootstrapMeans = (
  groups: readonly (readonly number[])[],
  b: number,
  labels: readonly (string | number)[]
) => {
  const rng = Rng.from(STUDY, 'bootstrap', ...labels);
  const n = groups.reduce((a, g) => a + g.length, 0);
  const out = new Float64Array(b);

  for (let i = 0; i < b; i++) {
    let s = 0;

    for (const g of groups) for (let j = 0; j < g.length; j++) s += g[rng.int(g.length)]!;
    out[i] = s / n;
  }
  out.sort();
  return out;
};

export interface Summary {
  n: number;
  mean: number;
  l90: number;
  u90: number;
  perCell: Record<string, { n: number; mean: number }>;
  signs: { positive: number; zero: number; negative: number };
  unstratified: { l90: number; u90: number };
}

// a paired difference summary, stratified by cell
export const summarize = (
  rows: readonly { cell: string; d: number }[],
  labels: readonly (string | number)[],
  b = margins.bootstrap
): Summary => {
  const cells = [...new Set(rows.map((r) => r.cell))].sort();
  const groups = cells.map((c) => rows.filter((r) => r.cell === c).map((r) => r.d));
  const xs = rows.map((r) => r.d);

  if (!xs.length)
    return {
      n: 0,
      mean: NaN,
      l90: NaN,
      u90: NaN,
      perCell: {},
      signs: { positive: 0, zero: 0, negative: 0 },
      unstratified: { l90: NaN, u90: NaN }
    };

  const means = Array.from(bootstrapMeans(groups, b, labels));
  const flat = Array.from(bootstrapMeans([xs], b, [...labels, 'unstratified']));
  const perCell: Summary['perCell'] = {};

  cells.forEach((c, i) => (perCell[c] = { n: groups[i]!.length, mean: mean(groups[i]!) }));
  return {
    n: xs.length,
    mean: mean(xs),
    l90: quantile(means, 0.1),
    u90: quantile(means, 0.9),
    perCell,
    signs: {
      positive: xs.filter((x) => x > 0).length,
      zero: xs.filter((x) => x === 0).length,
      negative: xs.filter((x) => x < 0).length
    },
    unstratified: { l90: quantile(flat, 0.1), u90: quantile(flat, 0.9) }
  };
};

// ----- the primary statistic -----

export const pairsOf = (
  cutoff: string,
  ctrl: readonly { cell: string; replicate: number; value: number }[],
  exp: readonly { cell: string; replicate: number; value: number }[]
) => {
  const key = (x: { cell: string; replicate: number }) => `${x.cell}/R${x.replicate}`;
  const e = new Map(exp.map((x) => [key(x), x]));

  if (ctrl.length !== exp.length || ctrl.some((c) => !e.has(key(c))))
    throw new Error(`${cutoff}: the two arms' lanes are not paired`);
  return ctrl
    .map((c) => ({
      cutoff,
      cell: c.cell,
      replicate: c.replicate,
      ctrl: c.value,
      exp: e.get(key(c))!.value,
      d: e.get(key(c))!.value - c.value
    }))
    .sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : a.replicate - b.replicate));
};

export const primaryOf = (cutoff: string, ps: readonly { cell: string; d: number; ctrl: number; exp: number }[]) => {
  const s = summarize(ps, ['D', cutoff]);

  return {
    cutoff,
    ...s,
    zeroLanes: { ctrl: ps.filter((p) => p.ctrl === 0).length, exp: ps.filter((p) => p.exp === 0).length },
    material: s.mean >= margins.material && s.l90 > 0,
    harmful: s.u90 < 0
  };
};
export type Primary = ReturnType<typeof primaryOf>;

// ----- risk non-inferiority (§1.2): paired differences on the representatives -----

export type RiskMetric = 'centreDd' | 'confirmP90Dd' | 'breachShare' | 'principalLossLiq' | 'bankedDdLiq';
export const riskMetrics: readonly RiskMetric[] = [
  'centreDd',
  'confirmP90Dd',
  'breachShare',
  'principalLossLiq',
  'bankedDdLiq'
];
export const riskMargin = (m: RiskMetric) => (m === 'breachShare' ? margins.riskBreachShare : margins.riskDollar);

export const riskOf = (
  cutoff: string,
  rows: readonly { cell: string; ctrl: Record<RiskMetric, number> | null; exp: Record<RiskMetric, number> | null }[]
) => {
  const both = rows.filter((r) => r.ctrl && r.exp);
  const out = {} as Record<RiskMetric, Summary & { margin: number; nonInferior: boolean; clearlyWorse: boolean }>;

  for (const m of riskMetrics) {
    const s = summarize(
      both.map((r) => ({ cell: r.cell, d: r.exp![m] - r.ctrl![m] })),
      ['risk', m, cutoff]
    );

    out[m] = {
      ...s,
      margin: riskMargin(m),
      nonInferior: s.n > 0 && s.u90 < riskMargin(m),
      clearlyWorse: s.n > 0 && s.l90 > riskMargin(m)
    };
  }
  return {
    cutoff,
    pairsWithBothRepresentatives: both.length,
    pairsExcluded: rows.length - both.length,
    metrics: out,
    nonInferior: riskMetrics.every((m) => out[m].nonInferior),
    clearlyWorse: riskMetrics.some((m) => out[m].clearlyWorse)
  };
};
export type Risk = ReturnType<typeof riskOf>;

// ----- mechanism (§1.3) -----

export const mechanismOf = (
  cutoff: string,
  reps: readonly { lane: string; on: boolean; advantage: number | null }[] // advantage = centre net − its all-OFF projection's
) => {
  const n = reps.length;
  const on = reps.filter((r) => r.on);
  const adv = on.filter((r) => r.advantage !== null).map((r) => r.advantage!);
  const w = n ? wilson(on.length, n) : null;
  const flat = adv.length ? Array.from(bootstrapMeans([adv], margins.bootstrap, ['mechanism', cutoff])) : [];
  const l90 = flat.length ? quantile(flat, 0.1) : NaN;

  return {
    cutoff,
    representatives: n,
    on: on.length,
    share: n ? on.length / n : NaN,
    wilson95: w,
    advantage: { n: adv.length, mean: mean(adv), l90, u90: flat.length ? quantile(flat, 0.9) : NaN },
    usesS1: n > 0 && on.length / n >= margins.stagedUse,
    positiveAdvantage: adv.length > 0 && l90 > 0,
    confirmed: n > 0 && on.length / n >= margins.stagedUse && adv.length > 0 && l90 > 0
  };
};
export type Mechanism = ReturnType<typeof mechanismOf>;

// ----- the chronological verdict (§9.3) -----

export const chronologicalVerdict = (
  folds: readonly { cutoff: string; primary: boolean; intervalNet: number | null; intervalDd: number | null }[]
) => {
  const every = folds.length === 3 && folds.every((f) => f.primary && f.intervalNet !== null && f.intervalDd !== null);
  const net = every ? folds.reduce((a, f) => a + f.intervalNet!, 0) : null;
  const dd = every ? Math.max(...folds.map((f) => f.intervalDd!)) : null;

  return {
    folds,
    sequentialNet: net,
    largestIntervalDd: dd,
    supported: every && net! > 0 && dd! <= 35_000,
    consequence:
      'no chronological support: the final selection is not a deployment-qualified candidate without an explicit user decision'
  };
};

// ----- the outcome label (§1.4) -----

export const outcomeLabel = (r: {
  primary: { C21: Primary | null; C24: Primary | null };
  risk: { C21: Risk | null; C24: Risk | null };
  mechanism: { C21: Mechanism | null; C24: Mechanism | null };
  budgetBound: boolean; // > 25 % of either arm's lanes at C21 or C24 budget-bound after the extension block
  expChronologicallySupported: boolean;
}) => {
  const { primary: p, risk: k, mechanism: m } = r;

  if (!p.C21 || !p.C24 || !k.C21 || !k.C24 || !m.C21 || !m.C24)
    return { label: 'incomplete', reason: 'a primary cutoff was not computed' };
  if (p.C21.harmful || p.C24.harmful || k.C21.clearlyWorse || k.C24.clearlyWorse)
    return {
      label: 'harmful',
      reason: `U90(D) < 0 at ${[p.C21.harmful && 'C21', p.C24.harmful && 'C24'].filter(Boolean).join(', ') || 'neither'}; a risk margin clearly worse at ${[k.C21.clearlyWorse && 'C21', k.C24.clearlyWorse && 'C24'].filter(Boolean).join(', ') || 'neither'}`
    };
  if (r.budgetBound)
    return { label: 'inconclusive', reason: 'more than 25 % of an arm’s lanes budget-bound after the extension block' };
  if (p.C21.material && p.C24.material) {
    if (!(m.C21.confirmed && m.C24.confirmed))
      return { label: 'search-path effect', reason: 'material improvement, mechanism not confirmed' };
    if (k.C21.nonInferior && k.C24.nonInferior && r.expChronologicallySupported)
      return {
        label: 'beneficial',
        reason: 'material at C21 and C24, mechanism confirmed, risk non-inferior, chronologically supported'
      };
    return {
      label: 'trade-off',
      reason: `material and mechanism confirmed; risk non-inferior C21 ${k.C21.nonInferior}, C24 ${k.C24.nonInferior}; chronologically supported ${r.expChronologicallySupported}`
    };
  }
  if (p.C21.material !== p.C24.material)
    return {
      label: 'inconclusive',
      reason: `material at ${p.C21.material ? 'C21' : 'C24'} only (the primary cutoffs disagree)`
    };
  return {
    label: 'no material difference',
    reason: 'the material-improvement condition fails at both primary cutoffs'
  };
};

// ----- the paired interval tests (§9.2) -----

export const intervalDdOf = (cutoff: string, rows: readonly { cell: string; d: number }[]) => {
  const s = summarize(rows, ['interval DD', cutoff]);

  return { cutoff, ...s, nonInferior: s.n > 0 && s.u90 < margins.intervalDd };
};
export const intervalNetOf = (cutoff: string, rows: readonly { cell: string; d: number }[]) => ({
  cutoff,
  ...summarize(rows, ['interval net', cutoff])
});

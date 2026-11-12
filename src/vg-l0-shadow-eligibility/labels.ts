// The frozen comparison labels and the effect decompositions (PROTOCOL.md §11): pure functions of development and fold
// evidence only (everything sealed before the validation door opens). Validation figures are reported beside the
// labels and never change them. The structure is reference method NL0's (5B's labels.ts) as the trading-session study
// applied it, here to this study's comparisons:
//   A — New L0, frozen parameters, every toggle OFF (the historical control);
//   F(sh) — New L0, frozen parameters, toggles sh (the fixed-parameter comparison: no re-optimization);
//   P(T) — track T's frozen primary (A1, A2, B1, B2), and the study's nominee (the final selectable set's primary).
//
//   band = $2,500 (2.5% of the fixed budget, 5B's): a report-only materiality band, not a risk tolerance or a gate.
//
//   Dev (C24 development; one instrument for every row — the same confirmation draws for every member):
//     ΔF = X centre net − Y centre net; ΔP10 = X confirmation p10 − Y's;
//     replication (only where X is a searched selection): the share of X's track's replicates (its final step's) whose
//     seed-level actual-profit holder (by centre net) beats Y's centre net by more than the band must reach two thirds
//     (the trading-session study's 4 of 6, generalized: ⌈2R/3⌉ of R);
//     '+' iff ΔF > band, ΔP10 ≥ −band (and the replication when it applies); '−' iff ΔF < −band and ΔP10 ≤ band;
//     '0' iff |ΔF| ≤ band; otherwise 'mixed'.
//   Risk: 'worse' iff X's confirmation p90 DD > Y's + band or X's centre DD > Y's + band; 'better' iff X's confirmation
//     p90 DD < Y's − band and X's centre DD ≤ Y's + band; else 'same'.
//   Chron (only where both sides have an independent sequential path 2020–2024: B1 vs B2; and a fresh track's path
//     against the original NL0 procedure's (5B's L0 arm, sealed: −$29,358.01, DD $67,214.22, unsupported)): '+' iff X's
//     path is supported and (Y's is not, or X's net > Y's + band); '−' iff (Y's supported and X's not) or (the same
//     verdict and X's net < Y's − band); else '0'. A failed path is never positive evidence.
//
//   Label (first match; Chron '0' where it does not apply):
//     repeatable improvement — Dev '+', Chron '+', Risk not 'worse';
//     harmful — (Dev '−' and Chron not '+') or (Chron '−' and Dev not '+') or (Dev '0', Chron '0', Risk 'worse');
//     no material difference — Dev '0', Chron '0', Risk 'same';
//     conditional profit/risk trade-off — (Dev '+' and Chron not '−') or (Dev '0' and (Chron '+' or Risk 'better'));
//     inconclusive — everything else.
//   Without a chronological test, a Dev '+' with Risk not 'worse' reads "development improvement (no chronological
//   test)": the label 'conditional profit/risk trade-off' is then reported with that qualifier.

export const band = 2500;

export type Sign = '+' | '−' | '0' | 'mixed';
export type RiskSign = 'better' | 'worse' | 'same';
export type Label =
  | 'repeatable improvement'
  | 'conditional profit/risk trade-off'
  | 'no material difference'
  | 'harmful'
  | 'inconclusive';

export interface PrimaryEvidence {
  net: number;
  dd: number;
  confirmP10: number;
  confirmP90Dd: number;
}

export interface Sequential {
  verdict: 'supported' | 'unsupported' | 'incomplete';
  net: number;
  dd: number;
}

export const replicationNeeded = (replicates: number) => Math.ceil((2 * replicates) / 3);

export const devSign = (x: PrimaryEvidence | null, y: PrimaryEvidence | null, replicateBests?: number[]): Sign => {
  if (!x && !y) return '0';
  if (x && !y) return '+';
  if (!x && y) return '−';

  const dF = x!.net - y!.net;
  const dP10 = x!.confirmP10 - y!.confirmP10;
  const replicated = replicateBests
    ? replicateBests.filter((b) => b - y!.net > band).length >= replicationNeeded(replicateBests.length)
    : true;

  if (dF > band && dP10 >= -band && replicated) return '+';
  if (dF < -band && dP10 <= band) return '−';
  if (Math.abs(dF) <= band) return '0';
  return 'mixed';
};

export const riskSign = (x: PrimaryEvidence | null, y: PrimaryEvidence | null): RiskSign => {
  if (!x || !y) return 'same';
  if (x.confirmP90Dd > y.confirmP90Dd + band || x.dd > y.dd + band) return 'worse';
  if (x.confirmP90Dd < y.confirmP90Dd - band && x.dd <= y.dd + band) return 'better';
  return 'same';
};

export const chronSign = (x: Sequential, y: Sequential): Sign => {
  const xs = x.verdict === 'supported';
  const ys = y.verdict === 'supported';

  if (xs && (!ys || x.net > y.net + band)) return '+';
  if ((ys && !xs) || (x.verdict === y.verdict && x.net < y.net - band)) return '−';
  return '0';
};

export const labelOf = (dev: Sign, chron: Sign, risk: RiskSign): Label => {
  if (dev === '+' && chron === '+' && risk !== 'worse') return 'repeatable improvement';
  if (
    (dev === '−' && chron !== '+') ||
    (chron === '−' && dev !== '+') ||
    (dev === '0' && chron === '0' && risk === 'worse')
  )
    return 'harmful';
  if (dev === '0' && chron === '0' && risk === 'same') return 'no material difference';
  if ((dev === '+' && chron !== '−') || (dev === '0' && (chron === '+' || risk === 'better')))
    return 'conditional profit/risk trade-off';
  return 'inconclusive';
};

export const comparisonLabel = (
  x: PrimaryEvidence | null,
  y: PrimaryEvidence | null,
  o: { replicateBests?: number[]; chron?: { x: Sequential; y: Sequential } } = {}
) => {
  const dev = devSign(x, y, o.replicateBests);
  const chron: Sign = o.chron ? chronSign(o.chron.x, o.chron.y) : '0';
  const risk = riskSign(x, y);
  const label = labelOf(dev, chron, risk);
  const qualifier =
    !o.chron && dev === '+' && risk !== 'worse' ? 'development improvement (no chronological test applies)' : null;

  return { dev, chron, chronApplies: !!o.chron, risk, label, qualifier };
};

// ----- the 2 × 2 decomposition (report-only): phenotypes pA (New L0) and pX (a selection's) under the toggles OFF ('000')
// and the selection's own toggles t:
//   total = v(pX, t) − v(pA, 000) = X − A; toggles = v(pA, t) − v(pA, 000) (the eligibility effect on New L0's fixed
//   parameters); parameters = v(pX, 000) − v(pA, 000) (the phenotype effect without eligibility);
//   interaction = total − toggles − parameters; eligibility within X = v(pX, t) − v(pX, 000) = toggles + interaction.
// Driver (report-only): 'no material total effect' iff |total| ≤ band; otherwise the component of largest magnitude.

export interface Cells {
  pAoff: number;
  pAt: number;
  pXoff: number;
  pXt: number;
}

export const decompose = (c: Cells) => {
  const total = c.pXt - c.pAoff;
  const toggles = c.pAt - c.pAoff;
  const parameters = c.pXoff - c.pAoff;
  const interaction = total - toggles - parameters;
  const parts = { toggles, parameters, interaction };
  const driver =
    Math.abs(total) <= band
      ? 'no material total effect'
      : (Object.entries(parts).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]![0] as keyof typeof parts);
  const r = (x: number) => Math.round(x * 100) / 100;

  return {
    total: r(total),
    toggles: r(toggles),
    parameters: r(parameters),
    interaction: r(interaction),
    eligibilityWithinX: r(c.pXt - c.pXoff),
    driver
  };
};

// The 2³ factorial of the fixed-parameter comparison (report-only): main effects and interactions of the three toggles
// on New L0's phenotype, from the eight cells v(sh): the standard Yates contrasts divided by 4 (the average effect of
// switching a factor ON across the other factors' settings), plus each toggle's effect alone (from '000').
export const factorial = (v: Record<string, number>) => {
  const f = (bits: string) => v[bits]!;
  const sign = (bits: string, mask: number[]) => mask.reduce((p, i) => p * (bits[i] === '1' ? 1 : -1), 1);
  const cells = ['000', '100', '010', '001', '110', '101', '011', '111'];
  const contrast = (mask: number[]) => cells.reduce((a, b) => a + sign(b, mask) * f(b), 0) / 4;
  const r = (x: number) => Math.round(x * 100) / 100;

  return {
    alone: { 'D1·GDX': r(f('100') - f('000')), 'D1·VGT': r(f('010') - f('000')), 'Growth·VGT': r(f('001') - f('000')) },
    main: { 'D1·GDX': r(contrast([0])), 'D1·VGT': r(contrast([1])), 'Growth·VGT': r(contrast([2])) },
    interactions: {
      'D1·GDX × D1·VGT': r(contrast([0, 1])),
      'D1·GDX × Growth·VGT': r(contrast([0, 2])),
      'D1·VGT × Growth·VGT': r(contrast([1, 2])),
      'all three': r(contrast([0, 1, 2]))
    }
  };
};

// Search variability (report-only): an effect is "within search variability" iff it does not exceed the spread of the
// informed replicates' seed-level bests (max − min).
export const withinSearchVariability = (effect: number, replicateBests: number[]) =>
  replicateBests.length > 1 && Math.abs(effect) <= Math.max(...replicateBests) - Math.min(...replicateBests);

// Episode concentration (report-only): with each phenotype's own leading winning episode blacked out (no new funding
// inside it, a causal rerun), the effect keeps its sign and at least half its size, or it is "concentrated in one
// episode".
export const concentratedInEpisode = (total: number, totalWithoutEpisodes: number) =>
  Math.abs(total) > band &&
  (Math.sign(totalWithoutEpisodes) !== Math.sign(total) || Math.abs(totalWithoutEpisodes) < 0.5 * Math.abs(total));

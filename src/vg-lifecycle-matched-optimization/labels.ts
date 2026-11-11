// The frozen evidence labels and the effect decomposition (PROTOCOL.md §11), pure functions of development and fold
// evidence only (everything sealed before the validation door opens). Validation figures are reported beside the label
// and never change it.
//
// For an arm X ∈ {L1, L2} against L0 (the freshly optimized L0 arm):
//
//   B = $2,500 (2.5% of the fixed budget): a report-only materiality band, not a risk tolerance or a gate.
//
//   Dev (C24 development; the arms' final primaries, matched-seed replicates):
//     ΔF = X final primary centre net − L0 final primary centre net; ΔR_r = X replicate-r independent best (the
//     actual-profit holder of replicate r's qualified independent members) − L0's (r = 1, 2; a missing best is −∞, two
//     missing bests differ by 0); ΔP10 = X final primary confirmation p10 − L0's.
//     '+' iff ΔF > B, ΔR_1 > 0, ΔR_2 > 0 and ΔP10 ≥ −B;  '−' iff ΔF < −B, ΔR_1 < 0, ΔR_2 < 0 and ΔP10 ≤ +B;
//     '0' iff |ΔF| ≤ B;  otherwise 'mixed'. (No final primary in either arm: '0'; only in X: '+'; only in L0: '−'.)
//   Risk (development drawdowns of the final primaries): 'worse' iff X's confirmation p90 DD > L0's + B or X's centre DD
//     > L0's + B; 'better' iff X's confirmation p90 DD < L0's − B and X's centre DD ≤ L0's + B; else 'same'.
//   Chron (the independent sequential paths 2020–2024, each arm's own): '+' iff X's verdict is "supported" and (L0's is
//     not, or X's sequential net > L0's + B); '−' iff (L0 supported and X not) or (the same verdict and X's sequential
//     net < L0's − B); else '0'. A failed path is never positive evidence.
//
//   Label (first match):
//     repeatable improvement — Dev '+', Chron '+', Risk not 'worse';
//     harmful — (Dev '−' and Chron not '+') or (Chron '−' and Dev not '+') or (Dev '0', Chron '0', Risk 'worse');
//     no material difference — Dev '0', Chron '0', Risk 'same';
//     conditional profit/risk trade-off — (Dev '+' and Chron not '−') or (Dev '0' and (Chron '+' or Risk 'better'));
//     inconclusive — everything else (replicates disagree; development and chronology point opposite ways).

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

export interface ArmEvidence {
  finalPrimary: PrimaryEvidence | null;
  replicateBest: [number | null, number | null]; // C24 independent replicate R1, R2 actual-profit centre nets
  sequential: { verdict: 'supported' | 'unsupported' | 'incomplete'; net: number; dd: number };
}

const diffOrInf = (x: number | null, l0: number | null) =>
  x === null && l0 === null ? 0 : x === null ? -Infinity : l0 === null ? Infinity : x - l0;

export const devSign = (x: ArmEvidence, l0: ArmEvidence): Sign => {
  const a = x.finalPrimary;
  const b = l0.finalPrimary;

  if (!a && !b) return '0';
  if (a && !b) return '+';
  if (!a && b) return '−';

  const dF = a!.net - b!.net;
  const dR = [diffOrInf(x.replicateBest[0], l0.replicateBest[0]), diffOrInf(x.replicateBest[1], l0.replicateBest[1])];
  const dP10 = a!.confirmP10 - b!.confirmP10;

  if (dF > band && dR.every((d) => d > 0) && dP10 >= -band) return '+';
  if (dF < -band && dR.every((d) => d < 0) && dP10 <= band) return '−';
  if (Math.abs(dF) <= band) return '0';
  return 'mixed';
};

export const riskSign = (x: ArmEvidence, l0: ArmEvidence): RiskSign => {
  const a = x.finalPrimary;
  const b = l0.finalPrimary;

  if (!a || !b) return 'same';
  if (a.confirmP90Dd > b.confirmP90Dd + band || a.dd > b.dd + band) return 'worse';
  if (a.confirmP90Dd < b.confirmP90Dd - band && a.dd <= b.dd + band) return 'better';
  return 'same';
};

export const chronSign = (x: ArmEvidence, l0: ArmEvidence): Sign => {
  const xs = x.sequential.verdict === 'supported';
  const ls = l0.sequential.verdict === 'supported';

  if (xs && (!ls || x.sequential.net > l0.sequential.net + band)) return '+';
  if ((ls && !xs) || (x.sequential.verdict === l0.sequential.verdict && x.sequential.net < l0.sequential.net - band))
    return '−';
  return '0';
};

export const labelOf = (dev: Sign, chron: Sign, risk: RiskSign): Label => {
  if (dev === '+' && chron === '+' && risk !== 'worse') return 'repeatable improvement';
  if ((dev === '−' && chron !== '+') || (chron === '−' && dev !== '+') || (dev === '0' && chron === '0' && risk === 'worse'))
    return 'harmful';
  if (dev === '0' && chron === '0' && risk === 'same') return 'no material difference';
  if ((dev === '+' && chron !== '−') || (dev === '0' && (chron === '+' || risk === 'better')))
    return 'conditional profit/risk trade-off';
  return 'inconclusive';
};

export const evidenceLabel = (x: ArmEvidence, l0: ArmEvidence) => {
  const dev = devSign(x, l0);
  const chron = chronSign(x, l0);
  const risk = riskSign(x, l0);

  return { dev, chron, risk, label: labelOf(dev, chron, risk) };
};

// ----- the 2 × 2 decomposition (report-only): phenotypes p0 (L0's) and pX (X's) under lifecycles L0 and X -----
//   total = v(pX, X) − v(p0, L0); lifecycle = v(p0, X) − v(p0, L0); phenotype = v(pX, L0) − v(p0, L0);
//   interaction = total − lifecycle − phenotype = v(pX, X) − v(pX, L0) − v(p0, X) + v(p0, L0).
// Driver (report-only): 'no material total effect' iff |total| ≤ B; otherwise the component of largest magnitude.

export interface Cells {
  p0L0: number;
  p0X: number;
  pXL0: number;
  pXX: number;
}

export const decompose = (c: Cells) => {
  const total = c.pXX - c.p0L0;
  const lifecycle = c.p0X - c.p0L0;
  const phenotype = c.pXL0 - c.p0L0;
  const interaction = total - lifecycle - phenotype;
  const parts = { lifecycle, phenotype, interaction };
  const driver =
    Math.abs(total) <= band
      ? 'no material total effect'
      : (Object.entries(parts).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]![0] as keyof typeof parts);
  const r = (x: number) => Math.round(x * 100) / 100;

  return { total: r(total), lifecycle: r(lifecycle), phenotype: r(phenotype), interaction: r(interaction), driver };
};

// Search variability (report-only): the total effect is "within search variability" iff it does not exceed the larger
// of the two arms' replicate spreads |R1 best − R2 best|.
export const withinSearchVariability = (total: number, spreads: number[]) =>
  Math.abs(total) <= Math.max(0, ...spreads.filter((s) => Number.isFinite(s)));

// Episode concentration (report-only): with each phenotype's own leading winning episode blacked out (no new funding
// inside it, a causal rerun), the total effect keeps its sign and at least half its size, or it is "concentrated in one
// episode".
export const concentratedInEpisode = (total: number, totalWithoutEpisodes: number) =>
  Math.abs(total) > band && (Math.sign(totalWithoutEpisodes) !== Math.sign(total) || Math.abs(totalWithoutEpisodes) < 0.5 * Math.abs(total));

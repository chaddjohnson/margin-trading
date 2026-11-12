// The frozen comparison labels and the effect decomposition (PROTOCOL.md §11): pure functions of development and fold
// evidence only (everything sealed before the validation door opens). Validation figures are reported beside the
// labels and never change them. The structure is reference method NL0's (5B's labels.ts), applied to the brief's three
// configurations instead of 5B's lifecycle arms:
//   A — New L0, frozen parameters, calendar-day holds (the historical control);
//   B — New L0, the same parameters, trading-session holds (no re-optimization);
//   C — this study's frozen primary: re-optimized under trading-session holds.
//
//   band = $2,500 (2.5% of the fixed budget, 5B's): a report-only materiality band, not a risk tolerance or a gate.
//
//   Dev (C24 development; one instrument for every row — the same confirmation draws under both units):
//     ΔF = X centre net − Y centre net; ΔP10 = X confirmation p10 − Y's;
//     replication (only where X is a searched selection): the share of the 6 informed replicates whose seed-level
//     actual-profit holder (by centre net) beats Y's centre net by more than the band — 5B required every replicate to
//     agree; with 6 replicates the frozen rule is a majority of at least 4;
//     '+' iff ΔF > band, ΔP10 ≥ −band (and replication ≥ 4 / 6 when it applies); '−' iff ΔF < −band and ΔP10 ≤ band;
//     '0' iff |ΔF| ≤ band; otherwise 'mixed'. (No C: '0' against B or A, and the label says so.)
//   Risk: 'worse' iff X's confirmation p90 DD > Y's + band or X's centre DD > Y's + band; 'better' iff X's confirmation
//     p90 DD < Y's − band and X's centre DD ≤ Y's + band; else 'same'.
//   Chron (C vs A only: the procedures' own independent sequential paths 2020–2024 — the session study's against the
//     original 5B L0 arm's, sealed: −$29,358.01, DD $67,214.22, unsupported): '+' iff the session path is supported and
//     (the original is not, or its net > the original's + band); '−' iff (the original supported and the session path
//     not) or (the same verdict and the session net < the original's − band); else '0'. A failed path is never
//     positive evidence. (The original path had 1/3 of this study's search effort; disclosed, not corrected.)
//
//   Label (first match; Chron '0' where it does not apply):
//     repeatable improvement — Dev '+', Chron '+', Risk not 'worse';
//     harmful — (Dev '−' and Chron not '+') or (Chron '−' and Dev not '+') or (Dev '0', Chron '0', Risk 'worse');
//     no material difference — Dev '0', Chron '0', Risk 'same';
//     conditional profit/risk trade-off — (Dev '+' and Chron not '−') or (Dev '0' and (Chron '+' or Risk 'better'));
//     inconclusive — everything else.
//   For B vs A and C vs B (no procedure path) a Dev '+' with Risk not 'worse' reads "development improvement (no
//   chronological test)": the label 'conditional profit/risk trade-off' is then reported with that qualifier.

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

export const replicationNeeded = 4; // of 6 informed replicates

export const devSign = (x: PrimaryEvidence | null, y: PrimaryEvidence | null, replicateBests?: number[]): Sign => {
  if (!x && !y) return '0';
  if (x && !y) return '+';
  if (!x && y) return '−';

  const dF = x!.net - y!.net;
  const dP10 = x!.confirmP10 - y!.confirmP10;
  const replicated = replicateBests
    ? replicateBests.filter((b) => b - y!.net > band).length >= replicationNeeded
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

// ----- the 2 × 2 decomposition (report-only): phenotypes pA (New L0) and pC (C's) under the units cal and ses -----
//   total = v(pC, ses) − v(pA, cal) = C − A; unit = v(pA, ses) − v(pA, cal) = B − A (the convention effect);
//   phenotype = v(pC, cal) − v(pA, cal); interaction = total − unit − phenotype;
//   re-optimization = C − B = phenotype + interaction.
// Driver (report-only): 'no material total effect' iff |total| ≤ band; otherwise the component of largest magnitude.

export interface Cells {
  pAcal: number;
  pAses: number;
  pCcal: number;
  pCses: number;
}

export const decompose = (c: Cells) => {
  const total = c.pCses - c.pAcal;
  const unit = c.pAses - c.pAcal;
  const phenotype = c.pCcal - c.pAcal;
  const interaction = total - unit - phenotype;
  const parts = { unit, phenotype, interaction };
  const driver =
    Math.abs(total) <= band
      ? 'no material total effect'
      : (Object.entries(parts).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]![0] as keyof typeof parts);
  const r = (x: number) => Math.round(x * 100) / 100;

  return {
    total: r(total),
    unit: r(unit),
    phenotype: r(phenotype),
    interaction: r(interaction),
    reoptimization: r(c.pCses - c.pAses),
    driver
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

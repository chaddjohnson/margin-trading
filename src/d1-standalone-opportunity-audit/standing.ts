// The predeclared interpretation (PROTOCOL.md §7 capture definitions used by the flags, §10 flags and standing), as
// pure functions of per-phenotype summaries. Bound by the protocol freeze: no flag, threshold, tie rule or standing
// can change after outcomes are seen. Concentration (top-trade share) enters nothing here.
import { flagThresholds } from './context.ts';

// ----- the inputs one phenotype contributes -----

export interface SeedStats {
  medianNet: number;
  shareProfitable: number;
}

export interface FoldEvidence {
  fold: string;
  increment5: number; // V at 5 bps
  lotsEntered: number; // lots entered after the boundary
  openAtBoundary: number; // lots open across the boundary
}

export interface PhenotypeSummary {
  id: string;
  isControl: boolean; // VGT primary (registered) or the procedure-matched VGT research representative
  hindsightFolds: boolean; // VGT primary: its fold increments were obtained with hindsight
  baseNet: number;
  baseMinuteDrawdown: number;
  c1Net: number;
  c1MinuteDrawdown: number;
  f10Net: number;
  f20Net: number;
  basePortfolioDaily: number;
  worstLot: number;
  worstMae: number;
  accountingMaxError: number;
  eligibleMajorFamilies: number;
  dipFamilies: number; // independent dip events: eligible families with base dip net > 0 whose anchor troughs are
  // ≥ 252 sessions apart (F1 and the families axis)
  eligibleFamilies: number;
  majorDipFamilies: number; // eligible major families with base dip-capture net > 0 (the set M of F4)
  neighbourMajorCapture: number; // median over the 128 joint samples of the share of M each also dip-captures
  winnerKeptShare: number | null; // share of joint samples keeping ≥ 50% of the top winner's reference net
  pooled: SeedStats & { medianRetention: number; shareDdWithinCeiling: number; medianPortfolioDaily: number };
  seeds: [SeedStats, SeedStats];
  liquidityConcern: boolean;
  folds: FoldEvidence[]; // empty: no fold representative
  foldsExpected: number;
}

export type F4Status = 'pass' | 'raised' | 'insufficient';
export type F8Status = 'pass' | 'negative' | 'no evidence' | 'not assessable (hindsight)';

export interface Flags {
  F1: boolean; // few independent dip captures / insufficient episodes
  F2: boolean; // tail losses
  F3: boolean; // drawdown (base, C1, portfolio)
  F4: F4Status; // the neighbourhood misses the base's major-family captures
  F5: boolean; // winner parameter-dependence
  F6: boolean; // cost-driven path instability
  F7: boolean; // liquidity / data (never blocking)
  F8: F8Status; // temporal evidence ('negative' blocks; 'no evidence' is reported)
  F9: boolean; // neighbourhood profitability / retention fragility
  F10: boolean; // neighbourhood drawdown
}

export const flagsOf = (summary: PhenotypeSummary): Flags => {
  const t = flagThresholds;
  const foldStatus = (): F8Status => {
    if (summary.hindsightFolds) {
      return 'not assessable (hindsight)';
    }

    if (summary.folds.some((fold) => fold.increment5 < 0)) {
      return 'negative';
    }

    if (
      summary.folds.length < summary.foldsExpected ||
      summary.folds.some((fold) => fold.lotsEntered === 0 && fold.openAtBoundary === 0)
    ) {
      return 'no evidence';
    }

    return 'pass';
  };

  return {
    F1: summary.dipFamilies < 2 || summary.eligibleMajorFamilies < 2,
    F2: summary.worstLot < t.tailLot || summary.worstMae < t.tailMae,
    F3:
      summary.baseMinuteDrawdown > t.ddCeiling ||
      summary.c1MinuteDrawdown > t.ddCeiling ||
      summary.basePortfolioDaily > t.portfolioDaily,
    F4:
      summary.majorDipFamilies < 2
        ? 'insufficient'
        : summary.neighbourMajorCapture < t.neighbourCapture
          ? 'raised'
          : 'pass',
    F5: summary.winnerKeptShare === null || summary.winnerKeptShare < t.winnerPersistence,
    F6:
      summary.f10Net <= 0 || summary.f20Net <= 0 || summary.c1Net <= 0 || summary.c1Net < t.costFall * summary.baseNet,
    F7: summary.liquidityConcern,
    F8: foldStatus(),
    F9: summary.pooled.shareProfitable < t.profitableShare || summary.pooled.medianRetention < t.retention,
    F10:
      summary.pooled.shareDdWithinCeiling < t.neighbourhoodDdShare ||
      summary.pooled.medianPortfolioDaily > t.portfolioDaily
  };
};

export const blockingOf = (flags: Flags) => [
  ...(['F1', 'F2', 'F3', 'F5', 'F6', 'F9', 'F10'] as const).filter((flag) => flags[flag]),
  ...(flags.F4 !== 'pass' ? [`F4 (${flags.F4})`] : []),
  ...(flags.F8 === 'negative' ? ['F8 (negative)'] : [])
];

export const unsupportedOf = (summary: PhenotypeSummary) =>
  summary.baseNet <= 0 ||
  summary.c1Net <= 0 ||
  summary.pooled.medianNet <= 0 ||
  summary.pooled.shareProfitable < 0.5 ||
  summary.baseMinuteDrawdown > flagThresholds.ddCeiling ||
  summary.accountingMaxError > 0.01;

// ----- the comparison axes against a control (PROTOCOL.md §10) -----

export interface Axis {
  met: boolean; // at least as good on the pooled 128 and on each seed
  strictly: boolean; // strictly better on the pooled 128 and on each seed
}

const axisOf = (ours: readonly number[], theirs: readonly number[]): Axis => ({
  met: ours.every((value, index) => value >= theirs[index]!),
  strictly: ours.every((value, index) => value > theirs[index]!)
});

export const axesOf = (candidate: PhenotypeSummary, control: PhenotypeSummary) => {
  const axes = {
    jointMedianNet: axisOf(
      [candidate.pooled.medianNet, ...candidate.seeds.map((seed) => seed.medianNet)],
      [control.pooled.medianNet, ...control.seeds.map((seed) => seed.medianNet)]
    ),
    jointProfitableShare: axisOf(
      [candidate.pooled.shareProfitable, ...candidate.seeds.map((seed) => seed.shareProfitable)],
      [control.pooled.shareProfitable, ...control.seeds.map((seed) => seed.shareProfitable)]
    ),
    dipFamilies: axisOf([candidate.dipFamilies], [control.dipFamilies])
  };
  const met = Object.values(axes).filter((axis) => axis.met).length;
  const strictly = Object.values(axes).filter((axis) => axis.strictly).length;

  return { axes, met, strictly };
};

export type Standing =
  '(i) compelling research-only standalone alternative' | '(ii) interesting but weakly evidenced' | '(iii) unsupported';

// The standing of one phenotype against VGT primary (the brief's control); "stronger" also needs the
// procedure-matched VGT control (VGT's own final-window research representative).
export const standingOf = (
  summary: PhenotypeSummary,
  vgtPrimary: PhenotypeSummary,
  procedureMatched: PhenotypeSummary
) => {
  const flags = flagsOf(summary);
  const blocking = blockingOf(flags);
  const unsupported = unsupportedOf(summary);
  const versusPrimary = axesOf(summary, vgtPrimary);
  const versusMatched = axesOf(summary, procedureMatched);
  const standing: Standing = unsupported
    ? '(iii) unsupported'
    : blocking.length === 0 && versusPrimary.met >= 2
      ? '(i) compelling research-only standalone alternative'
      : '(ii) interesting but weakly evidenced';
  // Period-correct support (review N2): at least one fold with V > 0 and none negative.
  const temporalSupport =
    summary.folds.some((fold) => fold.increment5 > 0) && !summary.folds.some((fold) => fold.increment5 < 0);
  const stronger =
    !summary.isControl &&
    standing.startsWith('(i)') &&
    temporalSupport &&
    versusPrimary.met === 3 &&
    versusPrimary.strictly >= 1 &&
    versusMatched.met >= 2 &&
    !flags.F7;

  return { flags, blocking, unsupported, versusPrimary, versusMatched, standing, stronger, temporalSupport };
};

// ETF level (PROTOCOL.md §10): the representative's standing; (i) also needs alternative-1, when it exists, not to be
// (iii). The better of the two never promotes an ETF.
export const etfStandingOf = (
  representative: ReturnType<typeof standingOf>,
  alternative?: ReturnType<typeof standingOf>
) => {
  const corroborated = !alternative || !alternative.standing.startsWith('(iii)');
  const standing: Standing =
    representative.standing.startsWith('(i)') && !corroborated
      ? '(ii) interesting but weakly evidenced'
      : representative.standing;

  return {
    standing,
    corroborated,
    stronger: representative.stronger && standing.startsWith('(i)'),
    observation: standing.startsWith('(i)')
  };
};

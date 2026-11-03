// The frozen verdict rubric (PROTOCOL.md §11), applied in order to the sealed fold and robustness figures.
import { chainWindows, type WindowPath } from './ledgers.ts';

export interface FoldFigures {
  fold: string;
  defined: boolean;
  V: number;
  windowMinuteDrawdown: number;
  lotsEnteredOrCarried: number;
  dollarDays: number;
  calendarDays: number;
  path: WindowPath;
  stresses: { tenBps: number; rate14: number; slip25: number; delay1: number };
  stressDrawdowns: { tenBps: number; rate14: number; slip25: number; delay1: number }; // window minute DD
}

export interface ControlFigures {
  id: string;
  V: Record<string, number>;
  windowMinuteDrawdown: Record<string, number>;
}

export interface CandidateRobustness {
  id: string;
  r1: number; // net at 10 bps
  r2: number; // net at 14%
  r3: number; // share of joint draws with net > 0 and minute DD <= 35,000
  r4: number; // net with 25 bps stop slippage
  r5: number; // net with a +1 minute delay
  r6: number; // minute DD (baseline)
}

export const materiality = 2000;

export const evaluateRubric = (input: {
  folds: FoldFigures[];
  alr: Record<string, number>; // C-ALR's V per fold
  controls: ControlFigures[]; // C-SMA, C-DON, C-TSM
  hPick?: CandidateRobustness;
  dPick?: CandidateRobustness;
  ddReference: number;
}) => {
  const { folds, ddReference } = input;
  const V = folds.map((f) => (f.defined ? f.V : 0));
  const sum = V.reduce((a, b) => a + b, 0);
  const positive = V.filter((v) => v >= materiality).length;
  const undefinedFolds = folds.filter((f) => !f.defined).length;
  const noLot = folds.filter((f) => !f.defined || f.lotsEnteredOrCarried === 0).length;
  const pi = chainWindows(folds.filter((f) => f.defined).map((f) => f.path));
  const maxWindowDd = Math.max(0, ...folds.filter((f) => f.defined).map((f) => f.windowMinuteDrawdown));
  const T = {
    i: sum >= 20000,
    ii: positive >= 3,
    iii: folds.every((f) => !f.defined || f.windowMinuteDrawdown <= ddReference),
    iv: Math.min(...V) >= -15000,
    v: pi.minuteDrawdown <= ddReference
  };
  const tPass = T.i && T.ii && T.iii && T.iv && T.v;
  const excess = folds.map((f, i) => {
    const exposure = f.defined && f.calendarDays > 0 ? f.dollarDays / (100000 * f.calendarDays) : 0;

    return {
      fold: f.fold,
      exposure,
      benchmark: exposure * input.alr[f.fold]!,
      excess: V[i]! - exposure * input.alr[f.fold]!
    };
  });
  const E = {
    sumExcess: excess.reduce((a, b) => a + b.excess, 0),
    positiveExcess: excess.filter((x) => x.excess >= materiality).length
  };
  const ePass = E.sumExcess >= 10000 && E.positiveExcess >= 2;
  const stressSums = {
    tenBps: folds.reduce((a, f) => a + (f.defined ? f.stresses.tenBps : 0), 0),
    rate14: folds.reduce((a, f) => a + (f.defined ? f.stresses.rate14 : 0), 0),
    slip25: folds.reduce((a, f) => a + (f.defined ? f.stresses.slip25 : 0), 0),
    delay1: folds.reduce((a, f) => a + (f.defined ? f.stresses.delay1 : 0), 0)
  };
  // R0: Σ V_F > 0 under each stress, and every stressed window minute drawdown ≤ the reference.
  const r0 =
    Object.values(stressSums).every((x) => x > 0) &&
    folds.every((f) => !f.defined || Object.values(f.stressDrawdowns).every((dd) => dd <= ddReference));
  const candidateOk = (c?: CandidateRobustness) =>
    Boolean(c) && c!.r1 > 0 && c!.r2 > 0 && c!.r3 >= 0.75 && c!.r4 > 0 && c!.r5 > 0 && c!.r6 <= ddReference;
  const rPass = r0 && Boolean(input.hPick) && candidateOk(input.hPick) && candidateOk(input.dPick);
  const K = input.controls.map((c) => {
    const controlSum = Object.values(c.V).reduce((a, b) => a + b, 0);
    const controlDd = Math.max(0, ...Object.values(c.windowMinuteDrawdown));
    const ddOk = controlDd > ddReference ? maxWindowDd <= ddReference : maxWindowDd <= controlDd;

    return { id: c.id, controlSum, difference: sum - controlSum, controlDd, exceeds: sum - controlSum >= 5000 && ddOk };
  });
  const kAll = K.length === 3 && K.every((k) => k.exceeds);
  let label: string;

  if (undefinedFolds >= 2) {
    label = 'no acceptable candidates';
  } else if (noLot >= 2) {
    label = 'insufficient evidence';
  } else if (!tPass) {
    label = 'no demonstrated standalone edge';
  } else if (!ePass) {
    label = 'positive retrospective net explained by exposure; no demonstrated timing edge';
  } else if (!rPass) {
    label = 'no demonstrated standalone edge (fragile)';
  } else if (!kAll) {
    label = 'promising standalone value, no demonstrated advantage over conventional trend controls (unvalidated)';
  } else {
    label = 'promising but unvalidated';
  }

  return {
    label,
    V,
    sum,
    positiveWindows: positive,
    undefinedFolds,
    windowsWithoutLot: noLot,
    T,
    tPass,
    pi,
    excess,
    E,
    ePass,
    R: {
      r0,
      stressSums,
      hPick: input.hPick,
      dPick: input.dPick,
      hOk: candidateOk(input.hPick),
      dOk: candidateOk(input.dPick)
    },
    rPass,
    K,
    kAll
  };
};

// Descriptive family labels (PROTOCOL.md §11).
export const familyLabel = (values: (number | undefined)[]) => {
  const defined = values.filter((v): v is number => v !== undefined);

  if (defined.length < 2) {
    return 'insufficient';
  }

  const sum = defined.reduce((a, b) => a + b, 0);
  const positive = defined.filter((v) => v >= materiality).length;

  return sum <= 0 ? 'negative' : positive >= 3 ? 'positive in ≥ 3 windows' : 'regime-dependent';
};

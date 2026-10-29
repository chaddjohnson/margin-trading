// The frozen verdict rubric (PROTOCOL.md §11) applied to sealed records only: validity (parity, guards, anchors,
// ledger identities and executability), evidence, risk, profit, 2022 protection with trend retention against Π1-off,
// exposure-matched excess and controls, perturbed paths, stresses, winner/giveback dependence, the S2/reset
// requirement, the labels and qualifiers, the protection-value statements and the nomination; every item for every
// path, with near misses.
import { matrix, rubric, study } from './context.ts';
import { median, quantile } from './metrics.ts';
import {
  assertFreezes,
  assertPredecessors,
  assertRealRoot,
  assertScope,
  readPayload,
  readRecord,
  recordExists,
  writeStage
} from './records.ts';
import { runtimeInfo } from './stages.ts';

interface SealedWindow {
  increment: number;
  minuteDd: { maximum: number };
  grossDollarDays: number;
  calendarDays: number;
  interest: number;
  sessionsLong: number;
  sessions: number;
  boundary: number;
  end: number;
}

interface SealedTrade {
  id: number;
  kind: string;
  rule: string;
  policy: string;
  campaign: number;
  entryIndex: number;
  entryBar: number;
  exitIndex: number;
  exitBar: number;
  entryTime: number;
  exitTime: number;
  exitReason: string;
  proceeds: number;
  principal: number;
  interest: number;
  net: number;
  priceGain: number;
  friction: number;
  trims: { proceeds: number; repaid: number }[];
  entryDate: string;
  exitDate: string | null;
}

export interface SealedPath {
  summary: { sessionsLong: number; sessions: number };
  end: number;
  carriedInterest: number;
  minuteDd: { maximum: number };
  windows: SealedWindow[];
  trades: SealedTrade[];
  daily: { liquidation: number; shares: number }[];
  contributions: { trade: number; campaign: number; policy: string; contribution: number }[];
  givebacks: { campaign: string; giveback: number; peak: number; final: number }[];
  counters: Record<string, number>;
}

interface Compact {
  windows: { increment: number; minuteDd: number }[];
  end: number;
  minuteDd: number;
}

interface Leg {
  t0: number;
  t1: number;
  from: string;
  to: string;
  gain: number;
}

const near = (a: number, b: number, tolerance = 1e-9) =>
  Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));

// (a) on one ledger: identities (i), (ii), (iii), (v), (vii) and the executability assertions.
export const ledgerChecks = (p: SealedPath, carriedInterest: number) => {
  const problems: string[] = [];
  const sumNets = p.trades.reduce((a, t) => a + t.net, 0);

  if (!near(sumNets - carriedInterest, p.end)) {
    problems.push('identity (i)');
  }

  for (const t of p.trades) {
    if (!near(t.proceeds - t.principal - t.interest, t.net)) {
      problems.push(`identity (ii) proceeds: trade ${t.id}`);
    }

    if (!near(t.priceGain - t.friction - t.interest, t.net)) {
      problems.push(`identity (ii) price gain: trade ${t.id}`);
    }

    let loan = t.principal;

    for (const trim of t.trims) {
      if (!near(trim.repaid, Math.min(loan, trim.proceeds))) {
        problems.push(`identity (iii): trade ${t.id}`);
      }

      loan -= trim.repaid;
    }
  }

  for (let i = 1; i < p.trades.length; i++) {
    const a = p.trades[i - 1]!;
    const b = p.trades[i]!;

    if (b.rule === 'resize') {
      continue;
    }

    if (a.exitIndex < 0 || b.entryTime < a.exitTime || (b.entryIndex === a.exitIndex && b.kind !== 'conversion')) {
      problems.push(`executability: trade ${b.id}`);
    }
  }

  for (const row of p.daily) {
    if (row.shares < 0) {
      problems.push('identity (vii)');
      break;
    }
  }

  if (
    !near(
      p.windows.reduce((a, w) => a + w.increment, 0),
      p.end
    )
  ) {
    problems.push('identity (v)');
  }

  return problems;
};

const ownExits = (p: SealedPath) =>
  p.trades.filter((t) => t.exitIndex >= 0 && t.exitReason !== 'transition' && t.exitReason !== 'conversion').length;
const windowOf = (p: SealedPath, index: number) => p.windows.findIndex((w) => index > w.boundary && index <= w.end);

// A path's largest up-leg contribution: its liquidation-mark change over (max(t0, first), t1] of each leg.
export const legNets = (p: SealedPath, legs: Leg[], first: number) =>
  legs
    .filter((leg) => leg.t1 > first)
    .map((leg) => {
      const at = (s: number) => p.daily[s - first]?.liquidation ?? 0;

      return at(leg.t1) - at(Math.max(leg.t0, first));
    });

export const itemsOf = (
  p: SealedPath,
  context: {
    calr: SealedPath;
    controls: Record<string, { flat: number; reset: number }>;
    undefinedPicks: number;
    legs: Leg[];
    first: number;
    off?: SealedPath; // the knock-out comparator (Π1-off) for item (d)
    activeRules?: boolean[]; // per window: whether that window's pick has an active rule
    perturbed?: Compact[];
    stresses?: Record<string, Compact>;
  }
) => {
  const W = p.windows.map((w) => w.increment);
  const sum = W.reduce((a, v) => a + v, 0);
  const firstEntries = p.trades.filter((t) => t.kind === 'first' && t.rule !== 'adoption');
  const longShare = p.summary.sessions > 0 ? p.summary.sessionsLong / p.summary.sessions : 0;
  const evidence = {
    ownRuleExits: ownExits(p),
    firstEntries: firstEntries.length,
    firstEntryWindows: new Set(firstEntries.map((t) => windowOf(p, t.entryIndex)).filter((w) => w >= 0)).size,
    positionWindows: p.windows.filter((w) => w.sessionsLong > 0).length,
    longShare,
    undefinedPicks: context.undefinedPicks
  };
  const ePass =
    evidence.ownRuleExits >= rubric.minOwnExits &&
    evidence.firstEntries >= rubric.minFirstEntries &&
    evidence.firstEntryWindows >= rubric.minFirstEntryWindows &&
    evidence.positionWindows >= rubric.minWindowsWithPosition &&
    longShare >= rubric.minLongShare &&
    evidence.undefinedPicks <= 1;
  const risk = { windowDd: p.windows.map((w) => w.minuteDd.maximum), chainDd: p.minuteDd.maximum };
  const cPass = risk.windowDd.every((x) => x <= rubric.windowDd) && risk.chainDd <= rubric.chainDd;
  const profit = { W, sum, positive: W.filter((w) => w >= rubric.positiveWindow).length, min: Math.min(...W) };
  const bPass = sum >= rubric.sumMin && profit.positive >= rubric.positiveWindowsMin && profit.min >= rubric.minWindow;

  // (d) against the knock-out comparator, with the edge-case table
  let d: Record<string, unknown> | null = null;
  let dPass: boolean | null = null;

  if (context.off && context.activeRules) {
    const offW = context.off.windows.map((w) => w.increment);
    const cActive = context.activeRules[2]!;
    const d1 = cActive ? W[2]! >= offW[2]! + rubric.protection2022Margin || W[2]! >= rubric.flatTolerance2022 : null; // protection not applicable
    const trendWindows = [0, 1, 3].filter((i) => context.activeRules![i]);
    const trendSum = trendWindows.reduce((a, i) => a + W[i]!, 0);
    const trendOff = trendWindows.reduce((a, i) => a + offW[i]!, 0);
    // retention: Σ W(Π1) ≥ Σ W(off) − (1 − 0.75) |Σ W(off)|
    const d2 = trendWindows.length ? trendSum >= trendOff - (1 - rubric.trendRetention) * Math.abs(trendOff) : null;

    d = { cActive, W2022: W[2], off2022: offW[2], d1, trendWindows, trendSum, trendOff, d2 };
    dPass = (d1 ?? true) && (d2 ?? true);
  }

  const benchmark = p.windows.map((w, i) => {
    const calr = context.calr.windows[i]!;
    const fMv = w.calendarDays > 0 ? w.grossDollarDays / w.calendarDays / study.principal : 0;

    return { fMv, B: fMv * (calr.increment + calr.interest) - w.interest };
  });
  const excess = W.map((w, i) => w - benchmark[i]!.B);
  const controlMargins = Object.fromEntries(
    rubric.controls.map((name) => [name, sum - Math.max(context.controls[name]!.flat, context.controls[name]!.reset)])
  );
  const g = {
    benchmark,
    excess,
    sumExcess: excess.reduce((a, v) => a + v, 0),
    excessWindows: excess.filter((x) => x >= rubric.excessWindow).length,
    controlMargins
  };
  const gPass =
    g.sumExcess >= rubric.excessSumMin &&
    g.excessWindows >= rubric.excessWindowsMin &&
    Object.values(controlMargins).every((m) => m >= rubric.controlMargin);

  // (f) perturbed paths
  let f: Record<string, unknown> | null = null;
  let fPass: boolean | null = null;

  if (context.perturbed) {
    const ok =
      context.perturbed.filter((x) => x.end > 0 && x.minuteDd <= rubric.chainDd).length / context.perturbed.length;
    const med = median(context.perturbed.map((x) => x.end));

    f = {
      shareOk: ok,
      median: med,
      p10: quantile(
        context.perturbed.map((x) => x.end),
        0.1
      )
    };
    fPass = ok >= rubric.perturbedShareMin && med >= rubric.perturbedMedianShare * sum;
  }

  // (h) stresses
  let h: Record<string, unknown> | null = null;
  let hPass: boolean | null = null;

  if (context.stresses) {
    const rows = Object.fromEntries(
      rubric.stresses.map((name) => {
        const s = context.stresses![name]!;

        return [name, { end: s.end, chainDd: s.minuteDd, windowDd: Math.max(...s.windows.map((w) => w.minuteDd)) }];
      })
    );

    h = rows;
    hPass = Object.values(rows).every(
      (r) => r.end >= rubric.stressSumMin && r.chainDd <= rubric.chainDd && r.windowDd <= rubric.windowDd
    );
  }

  // (e2) winner / giveback dependence
  const campaignContribution = new Map<string, number>();

  for (const row of p.contributions) {
    const key = `${row.policy}#${row.campaign}`;

    campaignContribution.set(key, (campaignContribution.get(key) ?? 0) + row.contribution);
  }

  const largestCampaign = Math.max(0, ...campaignContribution.values());
  const legs = legNets(p, context.legs, context.first);
  const largestLeg = Math.max(0, ...legs);
  const material = p.givebacks.filter((x) => x.peak >= rubric.givebackPeakMin);
  const totalPeak = material.reduce((a, x) => a + x.peak, 0);
  const totalGiveback = material.reduce((a, x) => a + Math.max(0, x.giveback), 0);
  const e2 = {
    largestCampaign,
    sumMinusCampaign: sum - largestCampaign,
    largestLeg,
    sumMinusLeg: sum - largestLeg,
    givebackShare: totalPeak > 0 ? totalGiveback / totalPeak : null
  };
  const e2Pass =
    e2.sumMinusCampaign >= rubric.winnerMargin &&
    e2.sumMinusLeg >= rubric.winnerMargin &&
    (e2.givebackShare === null || e2.givebackShare <= rubric.givebackShareMax);

  return { evidence, ePass, risk, cPass, profit, bPass, d, dPass, g, gPass, f, fPass, h, hPass, e2, e2Pass };
};

type Items = ReturnType<typeof itemsOf>;

export const labelOf = (items: Items, aPass: boolean, s2?: Items, reset?: Items) => {
  if (!aPass) {
    return { label: 'invalid', failed: ['a'] };
  }

  if (!items.ePass) {
    return { label: 'insufficient evidence', failed: ['e'] };
  }

  if (!items.cPass) {
    return { label: 'risk-incompatible', failed: ['c'] };
  }

  const failed = [
    ...(items.bPass ? [] : ['b']),
    ...(items.dPass === false ? ['d'] : []),
    ...(items.gPass ? [] : ['g']),
    ...(items.fPass === false ? ['f'] : []),
    ...(items.hPass === false ? ['h'] : []),
    ...(items.e2Pass ? [] : ['e2'])
  ];

  if (failed.length) {
    return { label: 'no demonstrated edge', failed };
  }

  for (const [name, other] of [
    ['S2', s2],
    ['reset', reset]
  ] as const) {
    if (other && !(other.bPass && other.cPass && other.gPass)) {
      return { label: 'no demonstrated edge (transition-convention-dependent)', failed: [name] };
    }
  }

  return { label: 'historically promising but unvalidated', failed: [] };
};

// Near misses: failing thresholds within the predeclared band (10%).
const nearMisses = (items: Items) => {
  const band = rubric.nearMissBand;
  const out: string[] = [];
  const check = (name: string, value: number, threshold: number, higherIsBetter: boolean) => {
    const fails = higherIsBetter ? value < threshold : value > threshold;
    const within = Math.abs(value - threshold) <= band * Math.max(1, Math.abs(threshold));

    if (fails && within) {
      out.push(`${name}: ${value.toFixed(2)} vs ${threshold}`);
    }
  };

  check('(b) Σ W', items.profit.sum, rubric.sumMin, true);
  check('(b) min W', items.profit.min, rubric.minWindow, true);
  check('(c) chained DD', items.risk.chainDd, rubric.chainDd, false);
  items.risk.windowDd.forEach((x, i) => check(`(c) window ${i} DD`, x, rubric.windowDd, false));
  check('(g) Σ excess', items.g.sumExcess, rubric.excessSumMin, true);

  for (const [name, m] of Object.entries(items.g.controlMargins)) {
    check(`(g) margin over ${name}`, m, rubric.controlMargin, true);
  }

  check('(e2) Σ − campaign', items.e2.sumMinusCampaign, rubric.winnerMargin, true);
  check('(e2) Σ − leg', items.e2.sumMinusLeg, rubric.winnerMargin, true);

  return out;
};

export interface AnalysisInput {
  parityPass: boolean;
  guardFailures: number;
  paths: Record<string, SealedPath>;
  picks: { rod: ({ mask: string } | null)[]; net: ({ mask: string } | null)[] };
  nullPaths: Record<string, Compact[]>;
  perturbed: Record<string, Compact[]>;
  stresses: Record<string, Record<string, Compact>>;
  legs: Leg[];
  evaluations: number;
}

export const analysisCore = (input: AnalysisInput) => {
  const { paths, picks, nullPaths, perturbed, stresses, legs } = input;
  const parity = { pass: input.parityPass };
  const evaluate = { guardFailures: input.guardFailures };
  const first = paths.Pi1!.windows[0]!.boundary;
  const controls = Object.fromEntries(
    rubric.controls.map((name) => [name, { flat: paths[`${name}|flat`]!.end, reset: paths[`${name}|reset`]!.end }])
  );
  const calr = paths['C-ALR|flat']!;
  const undefinedOf = (list: unknown[]) => list.filter((x) => !x).length;
  const activeRules = picks.rod.map((k) => !!k && k.mask !== '000');
  const stressOf = (label: string) =>
    Object.fromEntries(Object.entries(stresses).map(([name, row]) => [name, row[label]!]));
  const base = { calr, controls, legs, first };
  const pi1 = itemsOf(paths.Pi1!, {
    ...base,
    undefinedPicks: undefinedOf(picks.rod),
    off: paths['Pi1-sub-000'],
    activeRules,
    perturbed: perturbed.Pi1,
    stresses: stressOf('Pi1')
  });
  const s2 = itemsOf(paths['Pi1-S2']!, { ...base, undefinedPicks: undefinedOf(picks.rod) });
  const reset = itemsOf(paths['Pi1-reset']!, { ...base, undefinedPicks: undefinedOf(picks.rod) });
  const net = itemsOf(paths['Pi-NET']!, {
    ...base,
    undefinedPicks: undefinedOf(picks.net),
    off: paths['Pi-NET-off'],
    activeRules: picks.net.map((k) => !!k && k.mask !== '000'),
    perturbed: perturbed['Pi-NET'],
    stresses: stressOf('Pi-NET')
  });
  const ledgerProblems = Object.fromEntries(
    Object.entries(paths).map(([name, p]) => [name, ledgerChecks(p, p.carriedInterest)])
  );
  const aPass =
    parity.pass && evaluate.guardFailures === 0 && Object.values(ledgerProblems).every((list) => list.length === 0);
  const verdict = labelOf(pi1, aPass, s2, reset);
  const netLabel = labelOf(net, aPass);
  const deepNull = (nullPaths.deep ?? []).map((x) => x.end);
  const nullMedian = deepNull.length ? median(deepNull) : NaN;
  const selectionIndistinguishable = Number.isFinite(nullMedian) && pi1.profit.sum < nullMedian;
  let label = verdict.label;

  if (label === 'historically promising but unvalidated' && netLabel.label !== label) {
    label += ' (objective-dependent)';
  }

  if (selectionIndistinguishable) {
    label += ' (selection-indistinguishable)';
  }

  // protection-value statements
  const off = paths['Pi1-sub-000']!;
  const paired = (perturbed.Pi1 ?? []).map((x, j) => x.end > (perturbed['Pi1-off']?.[j]?.end ?? Infinity));
  const pairedShare = paired.length ? paired.filter(Boolean).length / paired.length : NaN;
  const primary = {
    deltaSum: paths.Pi1!.end - off.end,
    deltaDd: paths.Pi1!.minuteDd.maximum - off.minuteDd.maximum,
    pairedShare,
    holds:
      paths.Pi1!.end - off.end >= rubric.protectionValueMargin &&
      paths.Pi1!.minuteDd.maximum <= off.minuteDd.maximum &&
      pairedShare >= rubric.pairedPerturbedShare
  };
  const p000 = paths['Pi-000']!;
  const procedure = {
    deltaSum: paths.Pi1!.end - p000.end,
    deltaDd: paths.Pi1!.minuteDd.maximum - p000.minuteDd.maximum,
    holds:
      paths.Pi1!.end - p000.end >= rubric.protectionValueMargin && paths.Pi1!.minuteDd.maximum <= p000.minuteDd.maximum
  };
  const fp = matrix.masks
    .filter((m) => m !== '000')
    .map((m) => {
      const p = paths[`Pi-FP-gated-${m}`]!;

      return {
        mask: m,
        deltaSum: p.end - p000.end,
        deltaDd: p.minuteDd.maximum - p000.minuteDd.maximum,
        holds: p.end - p000.end >= rubric.protectionValueMargin && p.minuteDd.maximum <= p000.minuteDd.maximum
      };
    });
  const y2022 = {
    holds:
      pi1.dPass === true &&
      activeRules[2] === true &&
      paths.Pi1!.windows[2]!.increment - off.windows[2]!.increment >= rubric.protection2022Margin
  };
  const nominate =
    verdict.label === 'historically promising but unvalidated' &&
    !selectionIndistinguishable &&
    netLabel.label === verdict.label;
  const descriptive = Object.fromEntries(
    Object.entries(paths)
      .filter(([name]) => !name.includes('|') && name !== 'Stage1b-Pi1')
      .map(([name, p]) => {
        const items = itemsOf(p, { ...base, undefinedPicks: 0 });

        return [name, { label: labelOf(items, aPass), items, nearMisses: nearMisses(items) }];
      })
  );
  const evaluations = input.evaluations;

  return {
    summary: {
      label,
      verdict,
      netLabel,
      aPass,
      selection: {
        nullMedian,
        pi1Sum: pi1.profit.sum,
        selectionIndistinguishable,
        nullPercentile: deepNull.filter((x) => x <= pi1.profit.sum).length / Math.max(1, deepNull.length)
      },
      protection: {
        primary,
        procedure,
        fixedParent: { holds: fp.filter((x) => x.holds).length, of: fp.length, rows: fp },
        y2022
      },
      nomination: nominate ? 'P*_H' : 'none',
      evaluations,
      items: { Pi1: pi1, 'Pi1-S2': s2, 'Pi1-reset': reset, 'Pi-NET': net },
      nearMisses: nearMisses(pi1)
    },
    payloads: { ledgerProblems, descriptive }
  };
};

export const stageAnalysis = () => {
  assertRealRoot();
  assertScope();
  assertPredecessors('analysis');
  assertFreezes(true);

  if (recordExists('analysis')) {
    throw new Error('refused: analysis is sealed');
  }

  const started = Date.now();
  const core = analysisCore({
    parityPass: (readRecord('parity').summary as { pass: boolean }).pass,
    guardFailures: (readRecord('evaluate').summary as { guardFailures: number }).guardFailures,
    paths: readPayload<Record<string, SealedPath>>('evaluate', 'paths'),
    picks: readPayload<AnalysisInput['picks']>('evaluate', 'picks'),
    nullPaths: readPayload<Record<string, Compact[]>>('evaluate', 'nulls'),
    perturbed: readPayload<Record<string, Compact[]>>('robustness', 'perturbed'),
    stresses: readPayload<Record<string, Record<string, Compact>>>('robustness', 'stresses'),
    legs: readPayload<Leg[]>('robustness', 'legs'),
    evaluations:
      ['develop-A', 'develop-B', 'develop-C', 'develop-D', 'develop-H'].reduce(
        (a, s) => a + ((readRecord(s).summary as { used: number }).used ?? 0),
        0
      ) +
      (readRecord('evaluate').summary as { evaluations: number }).evaluations +
      (readRecord('robustness').summary as { evaluations: number }).evaluations
  });

  return writeStage('analysis', {
    summary: { ...core.summary, runtime: runtimeInfo(started, 0) },
    payloads: core.payloads
  });
};

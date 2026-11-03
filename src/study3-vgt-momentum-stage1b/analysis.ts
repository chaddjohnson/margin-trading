// The frozen verdict rubric (PROTOCOL.md §11) applied to sealed records only: identities and executability on every
// sealed path ledger, the evidence gate, risk, profit, financing-neutral exposure-matched excess, controls (continuous
// and annual reset), perturbed paths and stresses, winner/giveback dependence, the S2 requirement, labels, the
// nomination; plus Stage 1's own T and E items on Stage 1's executable path (descriptive).
import { rubric, study } from './context.ts';
import {
  readPayload,
  readRecord,
  recordExists,
  writeStage,
  assertPredecessors,
  assertRealRoot,
  assertScope,
  assertFreezes
} from './records.ts';
import { runtimeInfo } from './stages.ts';

interface SealedWindow {
  increment: number;
  minuteDd: { maximum: number };
  grossDollarDays: number;
  calendarDays: number;
  interest: number;
  sessionsLong: number;
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
  exitIndex: number;
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
}

interface SealedPath {
  windows: SealedWindow[];
  trades: SealedTrade[];
  contributions: { trade: number; campaign: number; policy: string; contribution: number }[];
  campaigns: { campaign: string; giveback: number; peak: number; final: number; from: number; to: number }[];
  events: { kind: string; S: number }[];
  flatInterest: number;
  carriedInterest: number;
  endLiquidation: number;
  minuteDd: { maximum: number };
}

const near = (a: number, b: number, tolerance = 1e-6) =>
  Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));

// (a) on one ledger: identities (i)–(iv), (vii) and the executability assertions.
export const ledgerChecks = (p: SealedPath) => {
  const problems: string[] = [];
  const sumNets = p.trades.reduce((a, t) => a + t.net, 0);

  if (!near(sumNets - p.carriedInterest, p.endLiquidation, 1e-9)) {
    problems.push('identity (i): Σ nets − carried-balance interest ≠ end liquidation');
  }

  for (const t of p.trades) {
    if (!near(t.proceeds - t.principal - t.interest, t.net, 1e-9)) {
      problems.push(`identity (ii) proceeds: trade ${t.id}`);
    }

    if (!near(t.priceGain - t.friction - t.interest, t.net, 1e-9)) {
      problems.push(`identity (ii) price gain: trade ${t.id}`);
    }

    let loan = t.principal;

    for (const trim of t.trims) {
      if (!near(trim.repaid, Math.min(loan, trim.proceeds), 1e-9)) {
        problems.push(`identity (iii): trade ${t.id}`);
      }

      loan -= trim.repaid;
    }
  }

  for (let i = 1; i < p.trades.length; i++) {
    const a = p.trades[i - 1]!;
    const b = p.trades[i]!;

    // ZR (C-ALR) re-sizes at each month's first opening trade: exempt from the one-entry rule (PROTOCOL.md §4.4)
    if (b.rule === 'resize') {
      continue;
    }

    if (a.exitIndex < 0 || b.entryTime < a.exitTime || (b.entryIndex === a.exitIndex && b.kind !== 'conversion')) {
      problems.push(`executability: trade ${b.id} overlaps or enters in the exit session of ${a.id}`);
    }
  }

  for (const ev of p.events) {
    if ((ev.kind === 'entry' || ev.kind === 'trim' || ev.kind === 'conversion') && !(ev.S > 0)) {
      problems.push('identity (vii): S ≤ 0 while long');
    }
  }

  const sumWindows = p.windows.reduce((a, w) => a + w.increment, 0);

  if (!near(sumWindows, p.endLiquidation, 1e-9)) {
    problems.push('identity (v): Σ W ≠ end liquidation');
  }

  return problems;
};

const ownRuleExits = (p: SealedPath) =>
  p.trades.filter((t) => t.exitIndex >= 0 && t.exitReason !== 'transition' && t.exitReason !== 'conversion').length;

const windowOf = (p: SealedPath, index: number) => p.windows.findIndex((w) => index > w.boundary && index <= w.end);

export const itemsOf = (
  p: SealedPath,
  context: {
    calr: SealedPath;
    controls: Record<string, { flat: number; reset: number }>;
    undefinedPicks: number;
    legNets?: number[];
    perturbed?: { shareOk: number; median: number };
    stresses?: Record<string, { end: number; minuteDd: number }>;
  }
) => {
  const W = p.windows.map((w) => w.increment);
  const sum = W.reduce((a, v) => a + v, 0);
  // first entries decided at an adoption close are boundary mechanics, not evidence (PROTOCOL.md §11 (d))
  const firstEntries = p.trades.filter((t) => t.kind === 'first' && t.rule !== 'adoption');
  const firstWindows = new Set(firstEntries.map((t) => windowOf(p, t.entryIndex)).filter((w) => w >= 0));
  const positionWindows = p.windows.filter((w) => w.sessionsLong > 0).length;
  const d = {
    ownRuleExits: ownRuleExits(p),
    firstEntries: firstEntries.length,
    firstEntryWindows: firstWindows.size,
    positionWindows,
    undefinedPicks: context.undefinedPicks
  };
  const dPass =
    d.ownRuleExits >= rubric.minClosedTrades &&
    d.firstEntries >= 4 &&
    d.firstEntryWindows >= 3 &&
    d.positionWindows >= rubric.minWindowsWithPosition &&
    d.undefinedPicks <= 1;
  const c = { windowDd: p.windows.map((w) => w.minuteDd.maximum), chainDd: p.minuteDd.maximum };
  const cPass = c.windowDd.every((x) => x <= rubric.windowDd) && c.chainDd <= rubric.chainDd;
  const b = { W, sum, positive: W.filter((w) => w >= rubric.positiveWindow).length, min: Math.min(...W) };
  const bPass = sum >= rubric.sumMin && b.positive >= rubric.positiveWindowsMin && b.min >= rubric.minWindow;
  const benchmark = p.windows.map((w, i) => {
    const calr = context.calr.windows[i]!;
    const fMv = w.calendarDays > 0 ? w.grossDollarDays / w.calendarDays / study.principal : 0;
    const priceMinusFriction = calr.increment + calr.interest;

    return { fMv, B: fMv * priceMinusFriction - w.interest, diagnosticV10: fMv * calr.increment };
  });
  const excess = W.map((w, i) => w - benchmark[i]!.B);
  const controlMargins = Object.fromEntries(
    rubric.controls.map((name) => [name, sum - Math.max(context.controls[name]!.flat, context.controls[name]!.reset)])
  );
  const e = {
    benchmark,
    excess,
    sumExcess: excess.reduce((a, v) => a + v, 0),
    excessWindows: excess.filter((x) => x >= rubric.excessWindow).length,
    controlMargins
  };
  const ePass =
    e.sumExcess >= rubric.excessSumMin &&
    e.excessWindows >= rubric.excessWindowsMin &&
    Object.values(controlMargins).every((m) => m >= rubric.controlMargin);
  const campaignContribution = new Map<string, number>();

  for (const row of p.contributions) {
    const key = `${row.policy}#${row.campaign}`;

    campaignContribution.set(key, (campaignContribution.get(key) ?? 0) + row.contribution);
  }

  const largestCampaign = Math.max(0, ...campaignContribution.values());
  const largestLeg = context.legNets && context.legNets.length ? Math.max(0, ...context.legNets) : 0;
  const largestGiveback = Math.max(0, ...p.campaigns.map((x) => x.giveback));
  const material = p.campaigns.filter((x) => x.peak >= 5000);
  const totalPeak = material.reduce((a, x) => a + x.peak, 0);
  const totalGiveback = material.reduce((a, x) => a + Math.max(0, x.giveback), 0);
  const g = {
    largestCampaign,
    sumMinusCampaign: sum - largestCampaign,
    largestLeg,
    sumMinusLeg: sum - largestLeg,
    largestGiveback,
    givebackShare: totalPeak > 0 ? totalGiveback / totalPeak : null
  };
  // giveback: Σ giveback / Σ peak over campaigns peaking at ≥ $5,000 must not exceed 0.5
  const gPass =
    g.sumMinusCampaign >= 5000 && g.sumMinusLeg >= 5000 && (g.givebackShare === null || g.givebackShare <= 0.5);
  const f = context.perturbed
    ? {
        perturbedShareOk: context.perturbed.shareOk,
        perturbedMedian: context.perturbed.median,
        medianRetention: sum !== 0 ? context.perturbed.median / sum : null,
        stresses: context.stresses ?? {}
      }
    : undefined;
  // (f): perturbed paths, and under each of the four stresses Σ W ≥ +$10,000 with chained minute DD ≤ $35,000
  const fPass = f
    ? f.perturbedShareOk >= 0.75 &&
      context.perturbed!.median >= 0.5 * sum &&
      Object.keys(f.stresses).length === 4 &&
      Object.values(f.stresses).every((v) => v.end >= 10000 && v.minuteDd <= 35000)
    : null;

  return { b, bPass, c, cPass, d, dPass, e, ePass, f, fPass, g, gPass };
};

export const labelOf = (items: ReturnType<typeof itemsOf>, aPass: boolean, s2?: ReturnType<typeof itemsOf>) => {
  if (!aPass) {
    return { label: 'invalid', failed: ['a'] };
  }

  if (!items.dPass) {
    return { label: 'insufficient evidence', failed: ['d'] };
  }

  if (!items.cPass) {
    return { label: 'risk-incompatible', failed: ['c'] };
  }

  const failed = [
    ...(items.bPass ? [] : ['b']),
    ...(items.ePass ? [] : ['e']),
    ...(items.fPass === false ? ['f'] : []),
    ...(items.gPass ? [] : ['g'])
  ];

  if (failed.length) {
    return { label: 'no demonstrated edge', failed };
  }

  if (s2 && !(s2.bPass && s2.cPass && s2.ePass)) {
    return {
      label: 'no demonstrated edge (transition-convention-dependent)',
      failed: ['S2:' + [s2.bPass ? '' : 'b', s2.cPass ? '' : 'c', s2.ePass ? '' : 'e'].filter(Boolean).join(',')]
    };
  }

  return { label: 'historically promising but unvalidated', failed: [] };
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
  const parity = readRecord('parity').summary as { pass: boolean };
  const evaluate = readRecord('evaluate').summary as {
    bmarks: { equal: boolean }[];
    guards: { differences: number }[];
    parity: { differences: number };
  };
  const runs = readPayload<Record<string, SealedPath & { policies: { policy: string }[] }>>('evaluate', 'runs');
  const legs = readPayload<{ stats: Record<string, { net: number }[]> }>('evaluate', 'legs');
  const robustness = readRecord('robustness').summary as {
    perturbed: { shareOk: number; median: number };
    perturbedNet: { shareOk: number; median: number };
    netStresses: { name: string; end: number; minuteDd: number }[];
    stresses: { name: string; pi1: { end: number; minuteDd: number } }[];
  };
  const repairPaths = readPayload<Record<string, SealedPath>>('repair', 'paths');
  const repairCalr = readPayload<{ windows: { increment: number; interest: number; minuteDd: number }[] }>(
    'repair',
    'calrSlot'
  );
  const develop = ['A', 'B', 'C', 'D'].map(
    (h) => readRecord(`develop-${h}`).summary as { picks: Record<string, unknown> }
  );
  const undefinedOf = (kind: string) => develop.filter((d) => !d.picks[kind]).length;
  const ledgerProblems = Object.fromEntries(Object.entries(runs).map(([name, p]) => [name, ledgerChecks(p)]));
  const aPass =
    parity.pass &&
    evaluate.parity.differences === 0 &&
    evaluate.guards.every((g) => g.differences === 0) &&
    evaluate.bmarks.every((b) => b.equal) &&
    Object.values(ledgerProblems).every((list) => list.length === 0);
  const controlsFor = (reset = 'reset') =>
    Object.fromEntries(
      rubric.controls.map((name) => [
        name,
        { flat: runs[`${name}|flat`]!.endLiquidation, reset: runs[`${name}|${reset}`]!.endLiquidation }
      ])
    );
  const stressNames = ['costBps=10', 'rate=0.14', 'stopSlippageBps=25', 'delayMinutes=1'];
  const stresses = Object.fromEntries(
    robustness.stresses
      .filter((s) => stressNames.includes(s.name))
      .map((s) => [s.name, { end: s.pi1.end, minuteDd: s.pi1.minuteDd }])
  );
  const netStresses = Object.fromEntries(
    robustness.netStresses.map((s) => [s.name, { end: s.end, minuteDd: s.minuteDd }])
  );
  const calr = runs['C-ALR|flat']!;
  const legNets = (name: string) => (legs.stats[name] ?? []).map((l) => l.net);
  const items: Record<string, ReturnType<typeof itemsOf>> = {};

  items['Pi1-S1'] = itemsOf(runs['Pi1-S1']!, {
    calr,
    controls: controlsFor(),
    undefinedPicks: undefinedOf('rod'),
    legNets: legNets('Pi1-S1'),
    perturbed: robustness.perturbed,
    stresses
  });
  items['Pi1-S2'] = itemsOf(runs['Pi1-S2']!, {
    calr,
    controls: controlsFor(),
    undefinedPicks: undefinedOf('rod'),
    legNets: legNets('Pi1-S2')
  });

  // Π-NET on the same items as Π1 (its own perturbed paths, stresses and annual-reset controls); the other paths are
  // descriptive and their (f) is not computed
  items['Pi-NET'] = itemsOf(runs['Pi-NET']!, {
    calr,
    controls: controlsFor('reset-net'),
    undefinedPicks: undefinedOf('net'),
    legNets: legNets('Pi-NET'),
    perturbed: robustness.perturbedNet,
    stresses: netStresses
  });

  for (const name of ['Pi1-S3', 'Pi-P0', 'Pi-noE06', 'static-A']) {
    const kind = name === 'Pi-P0' ? 'p0' : name === 'Pi-noE06' ? 'noE06' : 'rod';

    items[name] = itemsOf(runs[name]!, { calr, controls: controlsFor(), undefinedPicks: undefinedOf(kind) });
  }

  const primary = labelOf(items['Pi1-S1']!, aPass, items['Pi1-S2']);
  const netLabel = labelOf(items['Pi-NET']!, aPass);
  const qualified =
    primary.label === 'historically promising but unvalidated' && netLabel.label !== primary.label
      ? `${primary.label} (objective-dependent)`
      : primary.label;
  const descriptive = Object.fromEntries(
    ['Pi1-S2', 'Pi1-S3', 'Pi-NET', 'Pi-P0', 'Pi-noE06', 'static-A'].map((name) => [name, labelOf(items[name]!, aPass)])
  );

  // Stage 1's executable paths: Stage 1b items (descriptive) and Stage 1's own T and E items
  const stage1 = Object.fromEntries(
    Object.entries(repairPaths).map(([name, p]) => {
      const V = p.windows.map((w) => w.increment);
      const sum = V.reduce((a, v) => a + v, 0);
      const T = {
        i: sum >= 20000,
        ii: V.filter((v) => v >= 2000).length >= 3,
        iii: p.windows.every((w) => w.minuteDd.maximum <= 35000),
        iv: Math.min(...V) >= -15000,
        v: p.minuteDd.maximum <= 35000
      };
      const excess = p.windows.map((w, i) => {
        const fL =
          w.calendarDays > 0
            ? (w as unknown as { loanDollarDays: number }).loanDollarDays / (study.principal * w.calendarDays)
            : 0;

        return V[i]! - fL * repairCalr.windows[i]!.increment;
      });
      const E = { sumExcess: excess.reduce((a, v) => a + v, 0), windows: excess.filter((x) => x >= 2000).length };

      return [
        name,
        {
          V,
          sum,
          chainDd: p.minuteDd.maximum,
          T,
          tPass: Object.values(T).every(Boolean),
          E,
          ePass: E.sumExcess >= 10000 && E.windows >= 2,
          ledger: ledgerChecks(p)
        }
      ];
    })
  );
  const hPick = (readRecord('develop-H').summary as { picks: { rod: unknown } }).picks.rod;
  const nomination = primary.label === 'historically promising but unvalidated' && hPick ? hPick : 'none';

  return writeStage('analysis', {
    summary: {
      label: qualified,
      primary,
      netLabel,
      descriptive,
      items,
      aPass,
      ledgerProblems,
      stage1,
      nomination,
      runtime: runtimeInfo(started, 0)
    },
    payloads: {}
  });
};

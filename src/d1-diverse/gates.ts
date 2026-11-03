// Gates, ranking, fold picks and final nominations (PROTOCOL.md §14.2, §15). Every J/T rule reads the procedure's own
// score on the confirm-A draws (net for J, net_T for T); the member gate G3 uses the same marginal definition as the
// pruning pass (§12.2), as a point estimate on the independent confirm-A batch. Ranking has no tie window: the score
// decides unless it is equal to the cent (then Q25 of the procedure's net, then fewer books, then the key).
import { jaccardDistance } from '../d1-robust/genome.ts';
import type { Assessment } from './assess.ts';
import { type ArmKey, armSpecs, study } from './context.ts';
import { compareRankable } from './scores.ts';

export interface GateResult {
  gate: string;
  pass: boolean;
  detail: string;
}

export type Procedure = 'J' | 'T';

const fmt = (value: number) => (Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : String(value));

export const materialityOf = (assessment: Assessment) =>
  assessment.portfolio[`${study.principalCostBps}-symmetric`]!.dailyPercent > study.portfolioDailyIdeal
    ? study.gates.conditionalMateriality
    : study.gates.materiality;

const setOf = (assessment: Assessment, procedure: Procedure, ten = false) => {
  const set = ten ? assessment.confirmA10 : assessment.confirmA;

  return procedure === 'J' ? { nb: set.nbJ, score: set.j } : { nb: set.nbT, score: set.t };
};

export const procedureValue = (assessment: Assessment, procedure: Procedure) => setOf(assessment, procedure).score.s;

export const marginalOf = (member: Assessment['members_'][number], procedure: Procedure) =>
  procedure === 'J' ? member.marginalJ : member.marginalT;

// G1–G5, G8 (fold) or G1–G8 (final) for procedure J or T.
export const gatesOf = (
  assessment: Assessment,
  universe: readonly string[],
  procedure: Procedure,
  fold: boolean
): GateResult[] => {
  const five = assessment.centre[study.principalCostBps]!;
  const ten = assessment.centre[10]!;
  const portfolio = assessment.portfolio[`${study.principalCostBps}-symmetric`]!;
  // G4 and G5 are economic cost and tail checks of the actual P&L distribution, identical for both procedures (net,
  // not net_T): the procedures differ only in their score (ranking, credible floor, G3, G6), PROTOCOL §14.2.
  const actual = setOf(assessment, 'J');
  const actual10 = setOf(assessment, 'J', true);
  const lotsFloor = fold ? study.gates.foldPoolLots : study.gates.finalPoolLots;
  const yearsFloor = fold ? study.gates.foldPoolYears : study.gates.finalPoolYears;
  const bestRegime = Math.max(0, ...five.regimes);
  const boundaryLimit = study.gates.boundaryShare * 8 * assessment.members.length;
  const gates: GateResult[] = [
    {
      gate: 'G1',
      pass:
        assessment.parity.every((row) => row.differences === 0) &&
        assessment.identityEqual &&
        assessment.members.every((symbol) => universe.includes(symbol)),
      detail: `parity ${assessment.parity.map((row) => row.differences).join('/')}, identity ${assessment.identityEqual}`
    },
    {
      gate: 'G2',
      pass:
        five.minuteDrawdown <= study.drawdownCeiling &&
        ten.minuteDrawdown <= study.drawdownCeiling &&
        portfolio.dailyPercent <= study.portfolioDailyCeiling,
      detail: `DD@5 ${fmt(five.minuteDrawdown)}, DD@10 ${fmt(ten.minuteDrawdown)}, portfolio ${(100 * portfolio.dailyPercent).toFixed(2)}%`
    },
    {
      gate: 'G3',
      pass:
        five.lots >= lotsFloor &&
        five.lotYears >= yearsFloor &&
        assessment.members_.every((member) => marginalOf(member, procedure) > 0),
      detail: `${five.lots} lots in ${five.lotYears} years; ${procedure}-marginals ${assessment.members_.map((member) => `${member.symbol} ${fmt(marginalOf(member, procedure))}`).join(', ')}`
    },
    {
      gate: 'G4',
      pass:
        actual10.nb.p50 > 0 &&
        actual10.nb.p50 >= study.gates.costRetention * actual.nb.p50 &&
        [0, 2, 10].every((costBps) => assessment.centre[costBps]!.net > 0),
      detail: `P50(net)@10 ${fmt(actual10.nb.p50)} vs @5 ${fmt(actual.nb.p50)}; centre ${[0, 2, 10].map((c) => fmt(assessment.centre[c]!.net)).join('/')}`
    },
    {
      gate: 'G5',
      pass: actual.nb.q25 >= 0 && five.net - five.top2 > 0 && five.net - bestRegime > 0,
      detail: `Q25(net) ${fmt(actual.nb.q25)}; net − top2 ${fmt(five.net - five.top2)}; net − best regime ${fmt(five.net - bestRegime)}`
    }
  ];

  if (!fold) {
    const versus = assessment.versus!;
    const M = materialityOf(assessment);

    gates.push({
      gate: 'G6',
      pass: (['B4', 'B5'] as const).every((key) => {
        const delta = procedure === 'J' ? versus[key].p50 : versus[key].p50T;
        const scoreDifference = procedure === 'J' ? versus[key].scoreJ : versus[key].scoreT;

        return delta.estimate >= M && delta.lower > 0 && scoreDifference >= 0;
      }),
      detail: (['B4', 'B5'] as const)
        .map((key) => {
          const delta = procedure === 'J' ? versus[key].p50 : versus[key].p50T;
          const scoreDifference = procedure === 'J' ? versus[key].scoreJ : versus[key].scoreT;

          return `${key}: ΔP50 ${fmt(delta.estimate)} [${fmt(delta.lower)}, ${fmt(delta.upper)}], ΔS ${fmt(scoreDifference)} (M ${fmt(M)})`;
        })
        .join('; ')
    });
    gates.push({
      gate: 'G7',
      pass: portfolio.endEquity >= assessment.ladder!.matchedEndEquity,
      detail: `end equity ${fmt(portfolio.endEquity)} vs B5 ladder ${fmt(assessment.ladder!.matchedEndEquity)}${assessment.ladder!.extrapolated ? ' (extrapolated)' : ''}`
    });
  }

  gates.push({
    gate: 'G8',
    pass: assessment.maxTieChange <= study.gates.tieOrderChange,
    detail: `max tie-order change ${fmt(assessment.maxTieChange)}; boundary coordinates ${assessment.boundary} of ${8 * assessment.members.length}${assessment.boundary > boundaryLimit ? ' (box-constrained)' : ''}`
  });

  return gates;
};

// The Q arm's gates in their centre analogue (folds).
export const centreGatesOf = (
  assessment: Assessment,
  universe: readonly string[],
  centreMarginals: Record<string, number>
): GateResult[] => {
  const five = assessment.centre[study.principalCostBps]!;
  const ten = assessment.centre[10]!;
  const portfolio = assessment.portfolio[`${study.principalCostBps}-symmetric`]!;
  const bestRegime = Math.max(0, ...five.regimes);

  return [
    {
      gate: 'G1',
      pass:
        assessment.parity.every((row) => row.differences === 0) &&
        assessment.identityEqual &&
        assessment.members.every((symbol) => universe.includes(symbol)),
      detail: `parity ${assessment.parity.map((row) => row.differences).join('/')}`
    },
    {
      gate: 'G2',
      pass:
        five.minuteDrawdown <= study.drawdownCeiling &&
        ten.minuteDrawdown <= study.drawdownCeiling &&
        portfolio.dailyPercent <= study.portfolioDailyCeiling,
      detail: `DD@5 ${fmt(five.minuteDrawdown)}, DD@10 ${fmt(ten.minuteDrawdown)}, portfolio ${(100 * portfolio.dailyPercent).toFixed(2)}%`
    },
    {
      gate: 'G3',
      pass:
        five.lots >= study.gates.foldPoolLots &&
        five.lotYears >= study.gates.foldPoolYears &&
        Object.values(centreMarginals).every((value) => value > 0),
      detail: Object.entries(centreMarginals)
        .map(([symbol, value]) => `${symbol} ${fmt(value)}`)
        .join(', ')
    },
    {
      gate: 'G4',
      pass:
        ten.net > 0 &&
        ten.net >= study.gates.costRetention * five.net &&
        [0, 2].every((c) => assessment.centre[c]!.net > 0),
      detail: `centre ${[0, 2, 5, 10].map((c) => fmt(assessment.centre[c]!.net)).join('/')}`
    },
    {
      gate: 'G5',
      pass: five.net - five.top2 > 0 && five.net - bestRegime > 0,
      detail: `net − top2 ${fmt(five.net - five.top2)}; net − best regime ${fmt(five.net - bestRegime)}`
    },
    {
      gate: 'G8',
      pass: assessment.maxTieChange <= study.gates.tieOrderChange,
      detail: `max tie-order change ${fmt(assessment.maxTieChange)}`
    }
  ];
};

export interface Ranked {
  assessment: Assessment;
  arm: ArmKey;
  gates: GateResult[];
  pass: boolean;
  value: number; // the procedure's confirm-A score (Q arm: Q at the centre)
}

// §6.3: the score decides unless equal to the cent; then Q25 of the procedure's net (Q: −centre DD), fewer books, key.
export const rankRows = (rows: readonly Ranked[], procedure: Procedure | 'Q') =>
  [...rows].sort((a, b) =>
    compareRankable(
      {
        key: a.assessment.key,
        feasible: true,
        violation: 0,
        value: a.value,
        tie:
          procedure === 'Q'
            ? -a.assessment.centre[study.principalCostBps]!.minuteDrawdown
            : setOf(a.assessment, procedure).nb.q25,
        books: a.assessment.members.length
      },
      {
        key: b.assessment.key,
        feasible: true,
        violation: 0,
        value: b.value,
        tie:
          procedure === 'Q'
            ? -b.assessment.centre[study.principalCostBps]!.minuteDrawdown
            : setOf(b.assessment, procedure).nb.q25,
        books: b.assessment.members.length
      }
    )
  );

export interface Nominee {
  role: 'primary' | 'alternate 1' | 'alternate 2';
  row: Ranked;
  note?: string;
}

const isPrimaryEligible = (row: Ranked) =>
  !row.assessment.labels.includes('capacity-limited') && !row.assessment.labels.includes('box-constrained');

// The label of a finalist that is (a near-copy of) R1, R4 or the October 25 finalist (§2.10, §15.3).
export const nearReferenceLabel = 'near an inspected non-advancing reference (R1/R4/October 25 finalist)';

// Fold picks (§14.2): primary = the top passing finalist; alternates by distance. Final nominations (§15.3): the primary
// must come from the procedure's UNSEEDED arm and be primary-eligible; alternates from either arm, seeded ones labelled;
// a near-copy of an inspected non-advancing reference is never nominated (its post-2023 history is already known).
export const pick = (order: readonly Ranked[], mode: 'fold' | 'final'): Nominee[] => {
  const passing = order.filter(
    (row) => row.pass && (mode === 'fold' || !row.assessment.labels.includes(nearReferenceLabel))
  );
  const primary =
    mode === 'fold'
      ? passing[0]
      : passing.find((row) => armSpecs[row.arm].start === 'unseeded' && isPrimaryEligible(row));
  const nominees: Nominee[] = [];

  if (primary) {
    nominees.push({ role: 'primary', row: primary });
  }

  const far = (row: Ranked) =>
    nominees.every(
      (nominee) =>
        jaccardDistance(row.assessment.members, nominee.row.assessment.members) >= study.gates.nominationJaccard
    );
  const unused = (row: Ranked) => !nominees.some((nominee) => nominee.row === row);
  const alt1 = passing.find((row) => unused(row) && far(row));

  if (alt1) {
    nominees.push({ role: 'alternate 1', row: alt1 });
  }

  const alt2 = passing.find(
    (row) => unused(row) && far(row) && row.assessment.members.length <= study.gates.compactNominee
  );

  if (alt2) {
    nominees.push({ role: 'alternate 2', row: alt2 });
  }

  return nominees.map((nominee) => {
    const notes: string[] = [];

    if (mode === 'final' && !primary) {
      notes.push('no primary-eligible finalist');
    }

    if (armSpecs[nominee.row.arm].start === 'seeded') {
      notes.push('seeded from inspected benchmarks — start not walk-forward testable');
    }

    return notes.length > 0 ? { ...nominee, note: notes.join('; ') } : nominee;
  });
};

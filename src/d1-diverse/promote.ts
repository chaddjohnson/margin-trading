// Promotion of one arm (PROTOCOL.md §10–§11): the credible set of the arm's archive, leader clustering, and the
// shortlist slots filled in order by the best leader satisfying each slot. For each slot the family's top members (arm
// ranking) are re-evaluated — N1 `promo` (block marks), centres at 0/2/10 bps, the full-engine 20% portfolio at 5 bps
// (symmetric) — and the representative is the best of them passing F1 at 5 and 10 bps and F-P; if none passes, the
// slot passes to the next qualifying leader (≤ 3 attempts). An unfillable non-quality slot is replaced by one extra
// quality slot. Every family's fate and every dismissal is recorded. Nothing is pooled across arms.
import type { Evaluation } from '../d1-robust/evaluate.ts';
import type { RobustEvaluator } from '../d1-robust/evaluator.ts';
import type { Book } from '../d1-robust/neighbourhood.ts';
import { portfolioSpec } from '../d1-robust/promote.ts';
import { type ArmArchive, type Entry, booksOfEntry } from './archive.ts';
import { type ArmClass, type ArmKey, armSpecs, study } from './context.ts';
import { type Family, featuresOf, isCredible, leaderClusters, satisfiesSlot, slotKindOf } from './families.ts';
import {
  type BlockSpec,
  type RiskReferences,
  type ScoreSet,
  compareRankable,
  qOf,
  scoreSetOf,
  scoreValue
} from './scores.ts';

export interface Reevaluated {
  key: string;
  books: Book[];
  members: string[];
  centre: Record<string, Evaluation>; // 0, 2, 5, 10 bps
  set?: ScoreSet; // promo draws
  q: number;
  value: number;
  portfolio: { dailyPercent: number; minutePercent: number; endEquity: number; borrowingDollarDays: number };
  feasible: boolean;
  failures: string[];
}

export interface PromotedFamily {
  slot: string;
  attempt: number;
  family: number;
  familySize: number;
  leader: string;
  representative: Reevaluated;
  tried: Reevaluated[];
}

export interface PromotionRecord {
  arm: ArmKey;
  credible: number;
  families: {
    family: number;
    size: number;
    leader: string;
    members: string[];
    value: number;
    fate: string; // 'promoted (slot)', 'failed promotion feasibility (slot)', 'not reached by any slot'
  }[];
  slots: { slot: string; outcome: string; family?: number; attempts: number }[];
  promoted: PromotedFamily[];
}

export interface PromotionSpec {
  arm: ArmKey;
  armClass: ArmClass;
  draws: number;
  membersPerFamily: number;
  references: RiskReferences;
  blocks: BlockSpec;
}

export const reevaluate = async (
  evaluator: RobustEvaluator,
  entries: Entry[],
  spec: PromotionSpec
): Promise<Reevaluated[]> => {
  const score = armSpecs[spec.arm].score;
  const books = entries.map((entry) => booksOfEntry(entry));
  const centres: Record<number, Evaluation[]> = {};

  for (const costBps of study.costsBps) {
    centres[costBps] = await evaluator.centres(books, costBps, {
      withFunded: costBps === study.principalCostBps,
      ...(costBps === study.principalCostBps ? { markIndices: spec.blocks.markIndices } : {})
    });
  }

  const neighbourhoods =
    score !== 'Q'
      ? await evaluator.neighbourRecords(books, {
          stage: 'promo',
          cls: 'N1',
          n: spec.draws,
          costBps: study.principalCostBps,
          markIndices: spec.blocks.markIndices
        })
      : [];
  const portfolios = await evaluator.engines(
    books.map((item, index) => portfolioSpec(evaluator, item, `promo-${index}`))
  );

  return entries.map((entry, index) => {
    const centre = Object.fromEntries(study.costsBps.map((costBps) => [costBps, centres[costBps]![index]!]));
    const five = centre[study.principalCostBps]!;
    const set =
      score !== 'Q'
        ? scoreSetOf(five.net, five.markAt, neighbourhoods[index]!, five.books, spec.references)
        : undefined;
    const portfolio = portfolios[index]!;
    const failures: string[] = [];

    if (five.minuteDrawdown > study.drawdownCeiling) {
      failures.push('F1 at 5 bps');
    }

    if (centre[10]!.minuteDrawdown > study.drawdownCeiling) {
      failures.push('F1 at 10 bps');
    }

    if (!(portfolio.dailyPercent <= study.portfolioDailyCeiling)) {
      failures.push('F-P portfolio daily % DD');
    }

    return {
      key: entry.key,
      books: books[index]!,
      members: [...five.members].sort(),
      centre,
      ...(set ? { set } : {}),
      q: qOf(five.net, five.books),
      value: failures.length > 0 ? -Infinity : scoreValue(score, set, five.net, five.books),
      portfolio: {
        dailyPercent: portfolio.dailyPercent,
        minutePercent: portfolio.minutePercent,
        endEquity: portfolio.endEquity,
        borrowingDollarDays: portfolio.borrowingDollarDays
      },
      feasible: failures.length === 0,
      failures
    };
  });
};

const rankReevaluated = (score: 'J' | 'T' | 'Q') => (a: Reevaluated, b: Reevaluated) =>
  compareRankable(
    {
      key: a.key,
      feasible: a.feasible,
      violation: 0,
      value: a.value,
      tie:
        score === 'Q'
          ? -a.centre[study.principalCostBps]!.minuteDrawdown
          : score === 'J'
            ? a.set!.nbJ.q25
            : a.set!.nbT.q25,
      books: a.members.length
    },
    {
      key: b.key,
      feasible: b.feasible,
      violation: 0,
      value: b.value,
      tie:
        score === 'Q'
          ? -b.centre[study.principalCostBps]!.minuteDrawdown
          : score === 'J'
            ? b.set!.nbJ.q25
            : b.set!.nbT.q25,
      books: b.members.length
    }
  );

export const familiesOfArchive = (archive: ArmArchive, armClass: ArmClass) => {
  const credible = archive.ranked().filter((entry) => isCredible(entry, armClass));
  const features = credible.map((entry) => ({ ...featuresOf(entry), entry }));

  return { credible, families: leaderClusters(features) as Family<(typeof features)[number]>[] };
};

// `reeval` is injectable for synthetic tests.
export const promoteArm = async (
  archive: ArmArchive,
  spec: PromotionSpec,
  reeval: (entries: Entry[]) => Promise<Reevaluated[]>
): Promise<PromotionRecord> => {
  const score = armSpecs[spec.arm].score;
  const { credible, families } = familiesOfArchive(archive, spec.armClass);
  const fate = new Map<number, string>();
  const slots = [...study.shortlist[spec.armClass]];
  const slotRecords: PromotionRecord['slots'] = [];
  const promoted: PromotedFamily[] = [];
  const consumed = new Set<number>();
  let extraQuality = slots.filter((slot) => slotKindOf(slot) === 'quality').length;

  for (let s = 0; s < slots.length; s++) {
    const slot = slots[s]!;
    let attempts = 0;
    let filled = false;

    while (attempts < study.promotion.attemptsPerSlot) {
      const chosenLeaders = promoted.map((item) => families[item.family]!.leader.members);
      const family = families.find(
        (candidate) => !consumed.has(candidate.index) && satisfiesSlot(slot, candidate.leader.members, chosenLeaders)
      );

      if (!family) {
        break;
      }

      consumed.add(family.index);
      attempts++;

      const top = family.members.slice(0, spec.membersPerFamily).map((item) => item.entry);
      const tried = (await reeval(top)).sort(rankReevaluated(score));
      const representative = tried.find((item) => item.feasible);

      if (representative) {
        promoted.push({
          slot,
          attempt: attempts,
          family: family.index,
          familySize: family.members.length,
          leader: family.leader.key,
          representative,
          tried
        });
        fate.set(family.index, `promoted (${slot})`);
        filled = true;
        break;
      }

      fate.set(
        family.index,
        `failed promotion feasibility (${slot}): ${tried.map((item) => item.failures.join(' + ')).join('; ')}`
      );
    }

    slotRecords.push({
      slot,
      outcome: filled
        ? 'filled'
        : attempts === 0
          ? 'unfillable (no qualifying leader)'
          : `failed after ${attempts} attempts`,
      ...(filled ? { family: promoted.at(-1)!.family } : {}),
      attempts
    });

    if (!filled && attempts === 0 && slotKindOf(slot) !== 'quality') {
      extraQuality++;
      slots.push(`Q${extraQuality}`);
    }
  }

  return {
    arm: spec.arm,
    credible: credible.length,
    families: families.map((family) => ({
      family: family.index,
      size: family.members.length,
      leader: family.leader.key,
      members: [...family.leader.members],
      value: family.leader.entry.value,
      fate: fate.get(family.index) ?? 'not reached by any slot'
    })),
    slots: slotRecords,
    promoted
  };
};

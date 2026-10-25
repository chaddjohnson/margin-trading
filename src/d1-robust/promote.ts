// Stage S5 (PROTOCOL.md §10): promotion of distinct families. The top configurations of the arm's centre-feasible
// archive (final round: both arms pooled, provenance kept) are re-evaluated — arm J at n_promo common-random-number
// draws ('promo'), centres at 0/2/10 bps, the full-engine 20% portfolio at 5 bps (symmetric dividends) — then F1 at 5
// and 10 bps and F-P are required. Families are single-linkage components of (Jaccard distance < 0.5, funded-trade
// overlap ≥ 0.5, regime Spearman ≥ 0.7); the representative is the best by the arm's ranking; at most eight families
// are promoted under the diversity rules.
import { type Arm, type Entry, booksOfEntry } from './archive.ts';
import { type Tier, type WindowKey, study } from './context.ts';
import type { EngineSpec, Evaluation } from './evaluate.ts';
import type { RobustEvaluator } from './evaluator.ts';
import { jaccardDistance } from './genome.ts';
import type { Book } from './neighbourhood.ts';
import {
  type NeighbourhoodStats,
  type RiskReferences,
  type ScoreParts,
  scoreOf,
  spearman,
  summarize
} from './stats.ts';

export interface Promoted {
  key: string;
  arm: Arm;
  provenance: string; // the archive it came from ('fold', 'unseeded', 'seeded')
  books: Book[];
  members: string[];
  discovery: { rankValue: number; score?: ScoreParts; nb?: NeighbourhoodStats };
  centre: Record<string, Evaluation>; // by cost
  nb?: NeighbourhoodStats; // at n_promo
  score?: ScoreParts;
  q: number;
  rankValue: number;
  portfolio: { dailyPercent: number; minutePercent: number; endEquity: number; borrowingDollarDays: number };
  feasible: boolean;
  failures: string[];
  funded: string[];
  family?: number;
  required?: string; // the diversity rule that promoted it
}

export const portfolioSpec = (
  evaluator: RobustEvaluator,
  books: readonly Book[],
  label: string,
  costBps: number = study.principalCostBps,
  options: { fraction?: number; lotDividends?: boolean } = {}
): EngineSpec => ({
  label,
  mode: 'portfolio',
  books: books.map((book) => ({
    symbol: book.symbol,
    phenotype: evaluator.phenotypes([book])[book.symbol]!
  })),
  costBps,
  fraction: options.fraction ?? study.fraction,
  lotDividends: options.lotDividends ?? false,
  eligibilityIndex: evaluator.window.armStart,
  accountingStartIndex: evaluator.window.startIndex
});

export const promotionRank = (a: Promoted, b: Promoted) =>
  a.feasible !== b.feasible
    ? a.feasible
      ? -1
      : 1
    : b.rankValue - a.rankValue || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

// Re-evaluates candidates at promotion depth (both arms use this; arm Q has no neighbourhood).
export const reevaluate = async (
  evaluator: RobustEvaluator,
  candidates: { entry: Entry; provenance: string }[],
  spec: { arm: Arm; draws: number; references: RiskReferences; stage: string }
): Promise<Promoted[]> => {
  const books = candidates.map((candidate) => booksOfEntry(candidate.entry));
  const centres: Record<number, Evaluation[]> = {};

  for (const costBps of study.costsBps) {
    centres[costBps] = await evaluator.centres(books, costBps, { withFunded: costBps === study.principalCostBps });
  }

  const neighbourhoods =
    spec.arm === 'J'
      ? await evaluator.neighbourRecords(books, {
          stage: spec.stage,
          cls: 'N1',
          n: spec.draws,
          costBps: study.principalCostBps
        })
      : [];
  const portfolios = await evaluator.engines(
    books.map((item, index) => portfolioSpec(evaluator, item, `promo-${index}`))
  );

  return candidates.map((candidate, index) => {
    const centre = Object.fromEntries(study.costsBps.map((costBps) => [costBps, centres[costBps]![index]!]));
    const five = centre[study.principalCostBps]!;
    const nb = spec.arm === 'J' ? summarize(five.net, neighbourhoods[index]!) : undefined;
    const score = nb ? scoreOf(nb, five.books, spec.references) : undefined;
    const q = five.net - study.complexityPenalty * five.books;
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
      key: candidate.entry.key,
      arm: spec.arm,
      provenance: candidate.provenance,
      books: books[index]!,
      members: five.members.slice().sort(),
      discovery: { rankValue: candidate.entry.rankValue, score: candidate.entry.score, nb: candidate.entry.nb },
      centre,
      ...(nb ? { nb, score } : {}),
      q,
      rankValue: failures.length > 0 ? -Infinity : spec.arm === 'J' ? score!.s : q,
      portfolio: {
        dailyPercent: portfolio.dailyPercent,
        minutePercent: portfolio.minutePercent,
        endEquity: portfolio.endEquity,
        borrowingDollarDays: portfolio.borrowingDollarDays
      },
      feasible: failures.length === 0,
      failures,
      funded: five.funded ?? []
    } as Promoted;
  });
};

export const fundedOverlap = (a: readonly string[], b: readonly string[]) => {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const right = new Set(b);

  return a.filter((item) => right.has(item)).length / Math.min(a.length, b.length);
};

export const linked = (a: Promoted, b: Promoted) =>
  jaccardDistance(a.members, b.members) < study.promotion.jaccardDistance &&
  fundedOverlap(a.funded, b.funded) >= study.promotion.fundedOverlap &&
  spearman(a.centre[study.principalCostBps]!.regimes, b.centre[study.principalCostBps]!.regimes) >=
    study.promotion.regimeCorrelation;

// Single-linkage components, numbered in the order of their best member.
export const familiesOf = (items: Promoted[]) => {
  const ordered = [...items].sort(promotionRank);
  const parent = ordered.map((_, index) => index);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));

  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      if (linked(ordered[i]!, ordered[j]!)) {
        const a = find(i);
        const b = find(j);

        if (a !== b) {
          parent[Math.max(a, b)] = Math.min(a, b);
        }
      }
    }
  }

  const roots = new Map<number, number>();

  ordered.forEach((item, index) => {
    const root = find(index);

    if (!roots.has(root)) {
      roots.set(root, roots.size);
    }

    item.family = roots.get(root);
  });

  return Array.from({ length: roots.size }, (_, family) => ordered.filter((item) => item.family === family));
};

// The promotion order of family representatives: repeatedly the remaining representative with the highest value,
// except that among those within $12,500 of it the smaller membership, then the unseeded arm, then the key wins.
export const promotionOrder = (representatives: Promoted[]) => {
  const remaining = representatives.filter((item) => item.feasible);
  const order: Promoted[] = [];

  while (remaining.length > 0) {
    const top = Math.max(...remaining.map((item) => item.rankValue));
    const near = remaining.filter((item) => item.rankValue >= top - study.promotion.tieMargin);

    near.sort(
      (a, b) =>
        a.members.length - b.members.length ||
        (a.provenance === 'unseeded' ? 0 : 1) - (b.provenance === 'unseeded' ? 0 : 1) ||
        (a.key < b.key ? -1 : 1)
    );
    order.push(near[0]!);
    remaining.splice(remaining.indexOf(near[0]!), 1);
  }

  return order;
};

const b5Members = ['GDX', 'KRE', 'VGT', 'XBI', 'XRT'];

// §10 (4)–§11: the refined set holds the first `refineCount` families in promotion order, except that it must hold a
// compact family (≤ 3 books) and a family far from B5 (Jaccard ≥ 0.75) whenever a feasible one exists, and in the
// final round an unseeded family among its first three; a required family replaces the lowest-ordered family that
// no earlier requirement placed, and is never evicted itself. The promoted list (at most eight) is the refined set
// followed by the next families in order.
export const promoteFamilies = (representatives: Promoted[], round: WindowKey, refineCount: number) => {
  const order = promotionOrder(representatives);
  const refined = order.slice(0, refineCount);
  const notes: string[] = [];
  const place = (label: string, candidate: Promoted) => {
    const victim = [...refined].reverse().find((item) => !item.required);

    if (refined.length < refineCount) {
      refined.push(candidate);
    } else if (victim) {
      refined.splice(refined.indexOf(victim), 1, candidate);
    } else {
      notes.push(`${label}: no slot without a required family; not placed`);
      return false;
    }

    return true;
  };
  const ensure = (label: string, test: (item: Promoted) => boolean) => {
    const present = refined.find(test);

    if (present) {
      return;
    }

    const candidate = order.find((item) => test(item) && !refined.includes(item));

    if (!candidate) {
      notes.push(`${label}: no feasible family qualifies`);
      return;
    }

    if (place(label, candidate)) {
      candidate.required = label;
      notes.push(`${label}: ${candidate.key} refined by the diversity rule`);
    }
  };

  ensure('compact (≤ 3 books)', (item) => item.members.length <= study.promotion.compactBooks);
  ensure(
    'far from B5 (Jaccard ≥ 0.75)',
    (item) => jaccardDistance(item.members, b5Members) >= study.promotion.farFromB5
  );
  refined.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  if (round === 'final' && refined.length > 0 && !refined.slice(0, 3).some((item) => item.provenance === 'unseeded')) {
    const candidate =
      refined.find((item) => item.provenance === 'unseeded') ?? order.find((item) => item.provenance === 'unseeded');

    if (!candidate) {
      notes.push('unseeded among the top three: no feasible unseeded family');
    } else {
      if (refined.includes(candidate)) {
        refined.splice(refined.indexOf(candidate), 1);
      } else if (refined.length >= refineCount) {
        const victim = [...refined].reverse().find((item) => !item.required);

        if (victim) {
          refined.splice(refined.indexOf(victim), 1);
        }
      }

      if (refined.length < refineCount) {
        refined.splice(Math.min(2, refined.length), 0, candidate);
        candidate.required ??= 'unseeded among the top three';
        notes.push(`unseeded among the top three: ${candidate.key} placed at position ${Math.min(3, refined.length)}`);
      } else {
        notes.push('unseeded among the top three: every slot holds a required family; not placed');
      }
    }
  }

  const promoted = [...refined, ...order.filter((item) => !refined.includes(item))].slice(
    0,
    Math.max(study.promotion.maxFamilies, refined.length)
  );

  return { refined, promoted, order, notes };
};

export const promotionTop = (tier: Tier) => tier.promotionTop;

// Families (PROTOCOL.md §10) and the shortlist slots (§11), per arm, never pooled across arms. The credible set is the
// arm's centre-feasible entries with a positive arm score and the gate's activity floor. Families are formed by
// leader-ordered complete linkage: walking the credible set in the arm's ranking order, an entry joins the FIRST family
// whose leader AND every current member it is close to (membership Jaccard distance < 0.5 AND funded-trade overlap
// ≥ 0.5 AND regime-attribution Spearman ≥ 0.7), else it founds a new family as its leader. Every family is therefore
// pairwise close, so a chain A~B~C with A ≁ C can never put A and C in one family, whatever the ranking order.
// Pure functions.
import { jaccardDistance } from '../d1-robust/genome.ts';
import { spearman } from '../d1-robust/stats.ts';
import type { Entry } from './archive.ts';
import { type ArmClass, study } from './context.ts';

export const isCredible = (entry: Entry, armClass: ArmClass) =>
  entry.feasible &&
  entry.value > 0 &&
  entry.c.lots >= study.credible.lots[armClass] &&
  entry.c.lotYears >= study.credible.years[armClass];

// Shared funded (symbol, decision minute) pairs ÷ the smaller lot count (two empty ledgers: identical, 1).
export const fundedOverlap = (a: readonly string[], b: readonly string[]) => {
  if (a.length === 0 || b.length === 0) {
    return a.length === b.length ? 1 : 0;
  }

  const left = new Set(a);
  let shared = 0;

  for (const item of new Set(b)) {
    if (left.has(item)) {
      shared++;
    }
  }

  return shared / Math.min(left.size, new Set(b).size);
};

export interface Closeness {
  jaccard: number;
  overlap: number;
  correlation: number; // NaN when undefined (a constant vector)
  close: boolean;
}

export interface FamilyFeatures {
  key: string;
  members: readonly string[];
  funded: readonly string[];
  regimes: readonly number[];
}

export const featuresOf = (entry: Entry): FamilyFeatures => ({
  key: entry.key,
  members: entry.c.members,
  funded: entry.c.funded,
  regimes: entry.c.regimes
});

// Each item's member set, funded set and regime ranks are built once (complete linkage compares many pairs). The
// cached correlation equals the October 25 study's `spearman` (average ranks for ties; NaN for a constant vector).
interface Cached {
  members: Set<string>;
  funded: Set<string>;
  ranks: Float64Array;
  centred: Float64Array;
  norm: number;
}

const cache = new WeakMap<FamilyFeatures, Cached>();

const ranksOf = (values: readonly number[]) => {
  const order = values.map((value, index) => ({ value, index })).sort((x, y) => x.value - y.value);
  const result = new Float64Array(values.length);
  let i = 0;

  while (i < order.length) {
    let j = i;

    while (j + 1 < order.length && order[j + 1]!.value === order[i]!.value) {
      j++;
    }

    for (let k = i; k <= j; k++) {
      result[order[k]!.index] = (i + j) / 2 + 1;
    }

    i = j + 1;
  }

  return result;
};

const cachedOf = (item: FamilyFeatures): Cached => {
  let found = cache.get(item);

  if (!found) {
    const ranks = ranksOf(item.regimes);
    const mean = ranks.reduce((total, value) => total + value, 0) / Math.max(1, ranks.length);
    const centred = ranks.map((value) => value - mean);

    found = {
      members: new Set(item.members),
      funded: new Set(item.funded),
      ranks,
      centred,
      norm: Math.sqrt(centred.reduce((total, value) => total + value * value, 0))
    };
    cache.set(item, found);
  }

  return found;
};

export const memberJaccard = (a: FamilyFeatures, b: FamilyFeatures) => {
  const left = cachedOf(a).members;
  const right = cachedOf(b).members;
  let shared = 0;

  for (const symbol of left) {
    if (right.has(symbol)) {
      shared++;
    }
  }

  const union = left.size + right.size - shared;

  return union === 0 ? 0 : 1 - shared / union;
};

export const regimeCorrelation = (a: FamilyFeatures, b: FamilyFeatures) => {
  const x = cachedOf(a);
  const y = cachedOf(b);

  if (x.centred.length !== y.centred.length || x.centred.length < 2 || x.norm === 0 || y.norm === 0) {
    return NaN;
  }

  let num = 0;

  for (let i = 0; i < x.centred.length; i++) {
    num += x.centred[i]! * y.centred[i]!;
  }

  return num / (x.norm * y.norm);
};

const cachedOverlap = (a: FamilyFeatures, b: FamilyFeatures) => {
  const left = cachedOf(a).funded;
  const right = cachedOf(b).funded;

  if (left.size === 0 || right.size === 0) {
    return left.size === right.size ? 1 : 0;
  }

  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  let shared = 0;

  for (const item of small) {
    if (large.has(item)) {
      shared++;
    }
  }

  return shared / small.size;
};

export const closenessOf = (a: FamilyFeatures, b: FamilyFeatures): Closeness => {
  const jaccard = memberJaccard(a, b);
  const { jaccardDistance: maxJaccard, fundedOverlap: minOverlap, regimeCorrelation: minCorrelation } = study.closeness;

  if (!(jaccard < maxJaccard)) {
    return { jaccard, overlap: NaN, correlation: NaN, close: false };
  }

  const correlation = regimeCorrelation(a, b);

  if (!(Number.isFinite(correlation) && correlation >= minCorrelation)) {
    return { jaccard, overlap: NaN, correlation, close: false };
  }

  const overlap = cachedOverlap(a, b);

  return { jaccard, overlap, correlation, close: overlap >= minOverlap };
};

// The uncached definitions, for the equivalence test.
export const reference = { fundedOverlap, spearman, jaccardDistance };

export interface Family<T extends FamilyFeatures = FamilyFeatures> {
  index: number;
  leader: T;
  members: T[]; // leader first, then the joiners in ranking order
}

const closeToFamily = (item: FamilyFeatures, family: Family) =>
  closenessOf(item, family.leader).close &&
  family.members.every((member) => member === family.leader || closenessOf(item, member).close);

// Leader-ordered complete linkage over items already in ranking order (best first).
export const leaderClusters = <T extends FamilyFeatures>(ordered: readonly T[]): Family<T>[] => {
  const families: Family<T>[] = [];

  for (const item of ordered) {
    const home = families.find((family) => closeToFamily(item, family as Family));

    if (home) {
      home.members.push(item);
    } else {
      families.push({ index: families.length, leader: item, members: [item] });
    }
  }

  return families;
};

// ----- §11 slot predicates -----

export type SlotKind = 'quality' | 'compact' | 'medium' | 'broad' | 'incumbent-free' | 'far';

export const slotKindOf = (slot: string): SlotKind => (/^Q\d+$/.test(slot) ? 'quality' : (slot as SlotKind));

export const satisfiesSlot = (slot: string, members: readonly string[], chosen: readonly (readonly string[])[]) => {
  const { compactMax, mediumMin, mediumMax, broadMin, farJaccard } = study.slotRules;

  switch (slotKindOf(slot)) {
    case 'quality':
      return true;
    case 'compact':
      return members.length <= compactMax;
    case 'medium':
      return members.length >= mediumMin && members.length <= mediumMax;
    case 'broad':
      return members.length >= broadMin;
    case 'incumbent-free':
      return !members.some((symbol) => (study.b5Members as readonly string[]).includes(symbol));
    case 'far':
      return chosen.every((other) => jaccardDistance(members, other) >= farJaccard);
  }
};

// Behavioural fingerprints and trade-path families (PROTOCOL.md §6.2; LIBRARY_SELECTION_RULES.md §2).
//
// A candidate's training trade path is its list of lots (entry session, exit-or-end session). Two paths are compared
// by the larger of two distances, so both the holding windows and the entries must agree:
//   1 − Jaccard(held sessions)                    held = every session from an entry through its exit (inclusive);
//   1 − Dice(entries, matched within ±3 sessions)  greedy chronological matching of entry sessions.
// Families are bounded-diameter (complete-linkage) clusters: a candidate joins the first family (in creation order)
// whose every member is within the diameter, else it starts a new family. Candidates are visited by training net
// (descending, then grid key), so no score of any arm orders the partition. No single-linkage chaining can occur:
// every pair inside a family is within the diameter by construction.
import { rules } from './context.ts';

export interface Path {
  entries: Int32Array; // sorted entry session indices
  exits: Int32Array; // exit (or end) session index per lot, same order
  held: Uint32Array; // bitset of held sessions
  heldCount: number;
}

export const pathOf = (intervals: readonly number[], sessions: number): Path => {
  const pairs: [number, number][] = [];

  for (let index = 0; index < intervals.length; index += 2) {
    pairs.push([intervals[index]!, intervals[index + 1]!]);
  }

  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const held = new Uint32Array(Math.ceil(sessions / 32));

  for (const [entry, exit] of pairs) {
    for (let s = entry; s <= exit; s++) {
      held[s >>> 5]! |= 1 << (s & 31);
    }
  }

  return {
    entries: Int32Array.from(pairs.map((pair) => pair[0])),
    exits: Int32Array.from(pairs.map((pair) => pair[1])),
    held,
    heldCount: popcountAll(held)
  };
};

const popcount = (value: number) => {
  let v = value - ((value >>> 1) & 0x55555555);

  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

const popcountAll = (bits: Uint32Array) => {
  let total = 0;

  for (let index = 0; index < bits.length; index++) {
    total += popcount(bits[index]!);
  }

  return total;
};

export const heldJaccard = (a: Path, b: Path) => {
  let both = 0;

  for (let index = 0; index < a.held.length; index++) {
    both += popcount(a.held[index]! & b.held[index]!);
  }

  const union = a.heldCount + b.heldCount - both;

  return union === 0 ? 1 : both / union;
};

// Greedy chronological matching of two sorted entry lists within ±tolerance sessions.
export const entryDice = (a: Path, b: Path, tolerance: number = rules.entryTolerance) => {
  const n = a.entries.length;
  const m = b.entries.length;

  if (n + m === 0) {
    return 1;
  }

  let i = 0;
  let j = 0;
  let matches = 0;

  while (i < n && j < m) {
    const diff = a.entries[i]! - b.entries[j]!;

    if (Math.abs(diff) <= tolerance) {
      matches++;
      i++;
      j++;
    } else if (diff < 0) {
      i++;
    } else {
      j++;
    }
  }

  return (2 * matches) / (n + m);
};

export const pathDistance = (a: Path, b: Path) => Math.max(1 - heldJaccard(a, b), 1 - entryDice(a, b));

export interface Member {
  key: string; // grid key (unique within a pool)
  net: number;
  path: Path;
}

export interface Family {
  id: number; // creation order, 0-based
  members: number[]; // indices into the candidate list, in joining order (the first is the family's seed)
}

// Bounded-diameter first-fit clustering in the order: net descending, then grid key.
export const clusterFamilies = (candidates: readonly Member[], diameter: number = rules.familyDiameter) => {
  const order = candidates
    .map((_, index) => index)
    .sort((x, y) => candidates[y]!.net - candidates[x]!.net || (candidates[x]!.key < candidates[y]!.key ? -1 : 1));
  const families: Family[] = [];
  const familyOf = new Int32Array(candidates.length).fill(-1);

  for (const index of order) {
    const path = candidates[index]!.path;
    let placed = -1;

    for (const family of families) {
      let fits = true;

      for (const member of family.members) {
        if (pathDistance(path, candidates[member]!.path) > diameter) {
          fits = false;
          break;
        }
      }

      if (fits) {
        placed = family.id;
        break;
      }
    }

    if (placed < 0) {
      placed = families.length;
      families.push({ id: placed, members: [] });
    }

    families[placed]!.members.push(index);
    familyOf[index] = placed;
  }

  return { families, familyOf };
};

// The family medoid: the member with the smallest sum of distances to the others (ties: higher net, then grid key).
export const medoidOf = (candidates: readonly Member[], family: Family) => {
  let best = family.members[0]!;
  let bestSum = Infinity;

  for (const member of family.members) {
    let sum = 0;

    for (const other of family.members) {
      if (other !== member) {
        sum += pathDistance(candidates[member]!.path, candidates[other]!.path);
      }
    }

    const better =
      sum < bestSum - 1e-12 ||
      (Math.abs(sum - bestSum) <= 1e-12 &&
        (candidates[member]!.net > candidates[best]!.net ||
          (candidates[member]!.net === candidates[best]!.net && candidates[member]!.key < candidates[best]!.key)));

    if (better) {
      best = member;
      bestSum = sum;
    }
  }

  return best;
};

// The largest pairwise distance inside a family (≤ the diameter by construction; reported as a check).
export const diameterOf = (candidates: readonly Member[], family: Family) => {
  let worst = 0;

  for (let x = 0; x < family.members.length; x++) {
    for (let y = x + 1; y < family.members.length; y++) {
      worst = Math.max(worst, pathDistance(candidates[family.members[x]!]!.path, candidates[family.members[y]!]!.path));
    }
  }

  return worst;
};

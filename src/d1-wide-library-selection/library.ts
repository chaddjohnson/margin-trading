// Libraries and training-only selections (PROTOCOL.md §6–§7; LIBRARY_SELECTION_RULES.md). For one fold and one
// candidate pool, per ETF:
//
//   families   bounded-diameter clusters of the credible trade paths (./families.ts);
//   A0r        the source's narrow rule on this pool: the top 8 credible vectors by J_s with distinct trade
//              signatures, each measured by the 16 source neighbourhood draws (J_nb = median J_s); representative =
//              the highest J_nb; nominee iff J_nb > 0 and J_s > 0 (the source's survivor rule); library = the
//              representative and, from the top 32 by J_s, greedily each vector whose entry sessions are at Jaccard
//              distance ≥ 0.5 from all chosen, at most 4;
//   A1(K)      the K families with the highest J_s (each family's highest-J_s member); nominee = the highest J_nb
//              (16 draws) among them, iff J_nb > 0 and J_s > 0;
//   A2(K)      the K families with the highest T (each family's highest-T member; T = net − DD excess over $20,000 −
//              worst-lot loss beyond $10,000, no best-trade deduction); nominee = the highest T_nb (median T over the
//              same 16 draws) among members with entries in ≥ 2 calendar years, iff T_nb > 0 (ties: net per occupied
//              day);
//   A3(K)      the K families with the largest space-filling support (Sobol members; each family's medoid); nominee
//              = among members whose 48 draws (32 N1 + 16 N1A2) are ≥ 75% profitable and ≥ 75% within $35,000
//              minute DD, whose worst lot ≥ −$15,000 and whose entries fall in ≥ 2 eligible training catalog
//              families, the highest P25 of the 48 draw nets, iff P25 > 0.
//
// Everything reads the fold's training door only (the universe the Fast evaluator holds). Deterministic: no clock,
// no randomness beyond the seeded draw streams.
import { phaseOf, catalogOf } from '../d1-standalone-opportunity-audit/events.ts';
import type { Episode } from '../d1-standalone-opportunity-audit/events.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { type Fold, type LibraryArm, type LibraryK, libraryArms, libraryKs, rules, study } from './context.ts';
import { type Candidate, byJs, byKey, byT } from './candidates.ts';
import { type Path, clusterFamilies, medoidOf, pathDistance, pathOf } from './families.ts';
import { type Fast, type Grid, gridKeyOf, jsOf, tOf } from './fast.ts';
import { median, quantile, share } from './stats.ts';

export interface DrawSummary {
  n1: { key: string; net: number; dd: number; worst: number; js: number; t: number; credible: boolean }[];
  a2: { key: string; net: number; dd: number; worst: number; js: number; t: number; credible: boolean }[];
}

export interface MemberRecord {
  key: string;
  grid: Grid;
  provenance: Candidate['provenance'];
  stage: Candidate['stage'];
  origin: string;
  trades: number;
  net: number;
  best: number;
  worst: number;
  dd: number;
  ddDaily: number;
  interest: number;
  friction: number;
  netPerDay: number;
  js: number;
  t: number;
  entryYears: number;
  catalogFamilies: number; // distinct eligible training catalog families with an entry
  family: number;
  familySize: number;
  familySupport: number; // Sobol (space-filling) members of the family
  jnb?: number; // median J_s of N1 draws 0..15
  tnb?: number; // median T of N1 draws 0..15
  nbCredibleShare?: number;
  a3?: { draws: number; profitableShare: number; ddShare: number; p25: number; median: number };
}

export interface Nominee {
  key: string;
  score: number; // the arm's own final score (J_nb, T_nb or P25)
  training: { net: number; js: number; t: number; dd: number; trades: number };
}

export interface ArmLibrary {
  library: string[]; // keys, K = 64 order (every smaller K is a prefix)
  nominees: Record<string, Nominee | null>; // by K
  eligible: Record<string, number>; // members passing the arm's nominee filters, by K
}

export interface SymbolSelection {
  symbol: string;
  pool: string;
  evaluated: number;
  credible: number;
  uniqueSignatures: number;
  families: number;
  familySizes: { max: number; median: number; singletons: number };
  largestFamilyShareOfTop32: number; // share of the top 32 credible vectors by J_s inside the largest such family
  a0r: {
    checked: { key: string; js: number; jnb: number; credibleShare: number; signature: string }[];
    representative: string | null;
    representativeCredible: boolean;
    survivor: boolean;
    library: string[];
    nominee: Nominee | null;
  };
  arms: Record<LibraryArm, ArmLibrary>;
  penaltyDisplaced: Prepared['penaltyDisplaced'];
  members: Record<string, MemberRecord>;
}

export const trainingCatalog = (loaded: LoadedUniverse, symbol: string) => {
  const universe = loaded.universe;
  const ds = universe.instruments[symbol]!.ds;

  return catalogOf(symbol, universe.dates, ds.sClose, universe.eligibilityIndex, universe.dates.length - 1);
};

const catalogFamiliesOf = (catalog: readonly Episode[], intervals: readonly number[]) => {
  const families = new Set<string>();

  for (let index = 0; index < intervals.length; index += 2) {
    const { episode } = phaseOf(catalog, intervals[index]!);

    if (episode?.eligible) {
      families.add(episode.family);
    }
  }

  return families.size;
};

const entrySessions = (intervals: readonly number[]) => intervals.filter((_, index) => index % 2 === 0);

const jaccardDistance = (a: readonly number[], b: readonly number[]) => {
  const left = new Set(a);
  const right = new Set(b);
  let both = 0;

  for (const value of left) {
    if (right.has(value)) {
      both++;
    }
  }

  const union = left.size + right.size - both;

  return union === 0 ? 0 : 1 - both / union;
};

interface Prepared {
  symbol: string;
  all: Candidate[];
  credible: Candidate[];
  paths: Path[];
  familyOf: Int32Array;
  families: { id: number; members: number[] }[];
  catalog: Episode[];
  a0rChecked: Candidate[];
  libs: Record<LibraryArm, Candidate[]>; // K = 64 libraries
  penaltyDisplaced: { key: string; jPrime: number; js: number; family: number }[]; // the best-trade-penalty audit
  familySize: Map<string, number>;
  familySupport: Map<string, number>;
  familyIndex: Map<string, number>;
}

const isSobol = (candidate: Candidate) => candidate.stage === 'sobol' || candidate.stage === 'new-sobol';

export const prepareSymbol = (loaded: LoadedUniverse, symbol: string, pool: readonly Candidate[]): Prepared => {
  const sessions = loaded.universe.sessionCount;
  const seen = new Set<string>();
  const all = pool.filter((candidate) => {
    if (candidate.symbol !== symbol || seen.has(candidate.key)) {
      return false;
    }

    seen.add(candidate.key);
    return true;
  });
  const credible = all.filter((candidate) => candidate.credible).sort(byKey);
  const paths = credible.map((candidate) => pathOf(candidate.intervals!, sessions));
  const memberList = credible.map((candidate, index) => ({
    key: candidate.key,
    net: candidate.net,
    path: paths[index]!
  }));
  const { families, familyOf } = clusterFamilies(memberList);
  const familySize = new Map<string, number>();
  const familySupport = new Map<string, number>();
  const familyIndex = new Map<string, number>();

  // support, order-independent (PROTOCOL.md §6.2): the credible space-filling (Sobol) vectors of the pool within the
  // family diameter of the family's medoid — not the family's own member count, which the first-fit order inflates
  const sobolIndices = credible
    .map((candidate, index) => (isSobol(candidate) ? index : -1))
    .filter((index) => index >= 0);
  const medoids = families.map((family) => medoidOf(memberList, family));
  const supportOf = families.map(
    (_, f) =>
      sobolIndices.filter((index) => pathDistance(paths[medoids[f]!]!, paths[index]!) <= rules.supportRadius).length
  );

  for (const family of families) {
    const support = supportOf[family.id]!;

    for (const member of family.members) {
      familySize.set(credible[member]!.key, family.members.length);
      familySupport.set(credible[member]!.key, support);
      familyIndex.set(credible[member]!.key, family.id);
    }
  }

  // A0r's checked set: the top 8 credible by J_s with distinct trade signatures (the source's rule).
  const signatures = new Set<string>();
  const a0rChecked = [...credible]
    .sort(byJs)
    .filter((candidate) => {
      if (signatures.has(candidate.signature)) {
        return false;
      }

      signatures.add(candidate.signature);
      return true;
    })
    .slice(0, rules.narrowChecked);
  // A1n (descriptive ablation): the top 64 credible by J_s with distinct trade signatures, no family deduplication
  const a1nSeen = new Set<string>();
  const a1n = [...credible]
    .sort(byJs)
    .filter((candidate) => {
      if (a1nSeen.has(candidate.signature)) {
        return false;
      }

      a1nSeen.add(candidate.signature);
      return true;
    })
    .slice(0, libraryKs.at(-1)!);

  const best = (members: number[], order: (a: Candidate, b: Candidate) => number) =>
    members.map((member) => credible[member]!).sort(order)[0]!;
  const a1 = families.map((family) => best(family.members, byJs)).sort(byJs);
  const a2 = families.map((family) => best(family.members, byT)).sort(byT);
  const a3 = families
    .map((family) => ({ candidate: credible[medoids[family.id]!]!, support: supportOf[family.id]! }))
    .sort(
      (a, b) =>
        b.support - a.support ||
        (Number.isFinite(b.candidate.worst) ? b.candidate.worst : 0) -
          (Number.isFinite(a.candidate.worst) ? a.candidate.worst : 0) ||
        byKey(a.candidate, b.candidate)
    )
    .map((entry) => entry.candidate);
  const kMax = libraryKs.at(-1)!;
  // The best-trade-penalty audit (PROTOCOL.md §4.4): J′ = net − max(0, minute DD − $20,000) is J_s without the
  // best-trade term; a family is displaced by that term iff it is among the top 4 families by J′ (each family's best-J′
  // member) but not among the top 4 by J_s (each family's best-J_s member).
  const jPrime = (candidate: Candidate) => candidate.net - Math.max(0, candidate.dd - study.ddPenaltyFrom);
  const byJPrime = (a: Candidate, b: Candidate) => jPrime(b) - jPrime(a) || byKey(a, b);
  const topJs = new Set(a1.slice(0, rules.narrowLibraryMax).map((candidate) => familyIndex.get(candidate.key)!));
  const penaltyDisplaced = families
    .map((family) => best(family.members, byJPrime))
    .sort(byJPrime)
    .slice(0, rules.narrowLibraryMax)
    .filter((candidate) => !topJs.has(familyIndex.get(candidate.key)!))
    .map((candidate) => ({
      key: candidate.key,
      jPrime: jPrime(candidate),
      js: candidate.js,
      family: familyIndex.get(candidate.key)!
    }));

  return {
    symbol,
    all,
    credible,
    paths,
    familyOf,
    families,
    catalog: trainingCatalog(loaded, symbol),
    a0rChecked,
    libs: { A1: a1.slice(0, kMax), A1n: a1n, A2: a2.slice(0, kMax), A3: a3.slice(0, kMax) },
    penaltyDisplaced,
    familySize,
    familySupport,
    familyIndex
  };
};

// Every draw a prepared symbol needs: N1 0..15 for A0r's checked set and the A1, A1n and A2 libraries, N1 0..31 and
// N1A2 0..15 for the A3 library.
export const drawPlan = (fast: Fast, fold: Pick<Fold, 'drawStage'>, prepared: Prepared) => {
  const plan = new Map<string, { centre: string; cls: 'N1' | 'N1A2'; index: number; grid: Grid }[]>();
  const add = (candidate: Candidate, cls: 'N1' | 'N1A2', count: number) => {
    const list = plan.get(candidate.key) ?? [];
    const have = new Set(list.map((item) => `${item.cls}:${item.index}`));
    const wanted = Array.from({ length: count }, (_, index) => index).filter((index) => !have.has(`${cls}:${index}`));

    for (const draw of fast.drawGrids(prepared.symbol, candidate.grid, fold.drawStage, cls, wanted)) {
      list.push({ centre: candidate.key, cls, index: draw.index, grid: draw.grid });
    }

    plan.set(candidate.key, list);
  };

  for (const candidate of [...prepared.a0rChecked, ...prepared.libs.A1, ...prepared.libs.A1n, ...prepared.libs.A2]) {
    add(candidate, 'N1', rules.draws);
  }

  for (const candidate of prepared.libs.A3) {
    add(candidate, 'N1', rules.a3Draws);
    add(candidate, 'N1A2', rules.a3DrawsA2);
  }

  return plan;
};

type DrawPlan = ReturnType<typeof drawPlan>;
type DrawResults = Map<string, { net: number; dd: number; worst: number; js: number; t: number; credible: boolean }>;

// Evaluate every distinct draw grid of every symbol once.
export const evaluateDraws = async (fast: Fast, plans: readonly { symbol: string; plan: DrawPlan }[]) => {
  const unique = new Map<string, { symbol: string; grid: Grid }>();

  for (const { symbol, plan } of plans) {
    for (const list of plan.values()) {
      for (const item of list) {
        unique.set(`${symbol}|${gridKeyOf(item.grid)}`, { symbol, grid: item.grid });
      }
    }
  }

  const items = [...unique.entries()];
  const results: DrawResults = new Map();
  const chunk = 8192;

  for (let offset = 0; offset < items.length; offset += chunk) {
    const part = items.slice(offset, offset + chunk);
    const metrics = await fast.standalone(part.map(([, item]) => item));

    part.forEach(([key], index) => {
      const m = metrics[index]!;

      results.set(key, {
        net: m.net,
        dd: m.minuteDrawdown,
        worst: m.worstTrade,
        js: jsOf(m),
        t: tOf(m),
        credible: m.credible
      });
    });
  }

  return { results, evaluated: items.length };
};

const memberOf = (prepared: Prepared, candidate: Candidate): MemberRecord => ({
  key: candidate.key,
  grid: candidate.grid,
  provenance: candidate.provenance,
  stage: candidate.stage,
  origin: candidate.origin,
  trades: candidate.trades,
  net: candidate.net,
  best: candidate.best,
  worst: candidate.worst,
  dd: candidate.dd,
  ddDaily: candidate.ddDaily,
  interest: candidate.interest,
  friction: candidate.friction,
  netPerDay: candidate.netPerDay,
  js: candidate.js,
  t: candidate.t,
  entryYears: candidate.entryYears ?? 0,
  catalogFamilies: catalogFamiliesOf(prepared.catalog, candidate.intervals ?? []),
  family: prepared.familyIndex.get(candidate.key) ?? -1,
  familySize: prepared.familySize.get(candidate.key) ?? 0,
  familySupport: prepared.familySupport.get(candidate.key) ?? 0
});

const nomineeOf = (member: MemberRecord, score: number): Nominee => ({
  key: member.key,
  score,
  training: { net: member.net, js: member.js, t: member.t, dd: member.dd, trades: member.trades }
});

export const selectSymbol = (prepared: Prepared, pool: string, plan: DrawPlan, draws: DrawResults): SymbolSelection => {
  const members: Record<string, MemberRecord> = {};
  const drawsOf = (key: string, cls: 'N1' | 'N1A2', count: number) =>
    (plan.get(key) ?? [])
      .filter((item) => item.cls === cls && item.index < count)
      .sort((a, b) => a.index - b.index)
      .map((item) => {
        const result = draws.get(`${prepared.symbol}|${gridKeyOf(item.grid)}`);

        if (!result) {
          throw new Error(`${prepared.symbol} ${key}: draw ${cls}:${item.index} was not evaluated`);
        }

        return result;
      });
  const ensure = (candidate: Candidate) => {
    let member = members[candidate.key];

    if (!member) {
      member = memberOf(prepared, candidate);
      members[candidate.key] = member;
    }

    return member;
  };
  const withNb = (candidate: Candidate) => {
    const member = ensure(candidate);
    const n1 = drawsOf(candidate.key, 'N1', rules.draws);

    if (n1.length !== rules.draws) {
      throw new Error(`${prepared.symbol} ${candidate.key}: ${n1.length} of ${rules.draws} N1 draws`);
    }

    member.jnb = median(n1.map((d) => d.js));
    member.tnb = median(n1.map((d) => d.t));
    member.nbCredibleShare = share(n1, (d) => d.credible);
    return member;
  };

  // ----- A0r -----
  const checked = prepared.a0rChecked.map((candidate) => ({ candidate, member: withNb(candidate) }));
  let representative: Candidate | undefined;
  let representativeCredible = false;

  if (checked.length > 0) {
    representative = [...checked].sort(
      (a, b) => b.member.jnb! - a.member.jnb! || b.candidate.js - a.candidate.js || byKey(a.candidate, b.candidate)
    )[0]!.candidate;
    representativeCredible = true;
  } else {
    representative = prepared.all.filter((candidate) => candidate.trades >= 1).sort(byJs)[0];
  }

  const library: Candidate[] = representativeCredible && representative ? [representative] : [];

  if (representativeCredible && representative) {
    for (const candidate of [...prepared.credible].sort(byJs).slice(0, rules.narrowLibraryPool)) {
      if (library.length >= rules.narrowLibraryMax) {
        break;
      }

      if (candidate.key === representative.key) {
        continue;
      }

      if (
        library.every(
          (chosen) =>
            jaccardDistance(entrySessions(chosen.intervals!), entrySessions(candidate.intervals!)) >=
            rules.narrowJaccard
        )
      ) {
        library.push(candidate);
      }
    }
  }

  const repMember = representativeCredible && representative ? members[representative.key]! : undefined;
  const survivor = Boolean(repMember && repMember.jnb! > 0 && repMember.js > 0);

  for (const candidate of library) {
    ensure(candidate);
  }

  // ----- A1, A1n (descriptive), A2, A3 -----
  const arms = {} as Record<LibraryArm, ArmLibrary>;

  for (const arm of libraryArms) {
    const lib = prepared.libs[arm];
    const scored = lib.map((candidate) => {
      if (arm === 'A3') {
        const member = ensure(candidate);
        const all = [
          ...drawsOf(candidate.key, 'N1', rules.a3Draws),
          ...drawsOf(candidate.key, 'N1A2', rules.a3DrawsA2)
        ];

        if (all.length !== rules.a3Draws + rules.a3DrawsA2) {
          throw new Error(`${prepared.symbol} ${candidate.key}: ${all.length} A3 draws`);
        }

        member.a3 = {
          draws: all.length,
          profitableShare: share(all, (d) => d.net > 0),
          ddShare: share(all, (d) => d.dd <= study.ddCeiling),
          p25: quantile(
            all.map((d) => d.net),
            rules.a3Quantile
          ),
          median: median(all.map((d) => d.net))
        };

        const eligible =
          member.a3.profitableShare >= rules.a3ProfitableShare &&
          member.a3.ddShare >= rules.a3DdShare &&
          (Number.isFinite(member.worst) ? member.worst : 0) >= rules.a3WorstLot &&
          member.catalogFamilies >= rules.a3MinFamilies;

        return { member, eligible, score: member.a3.p25, tie: member.a3.median };
      }

      const member = withNb(candidate);

      if (arm === 'A1' || arm === 'A1n') {
        return { member, eligible: member.jnb! > 0 && member.js > 0, score: member.jnb!, tie: member.js };
      }

      return {
        member,
        eligible: member.entryYears >= rules.a2MinEntryYears && member.tnb! > 0,
        score: member.tnb!,
        tie: member.netPerDay
      };
    });
    const nominees: Record<string, Nominee | null> = {};
    const eligibleCounts: Record<string, number> = {};

    for (const k of libraryKs) {
      const window = scored.slice(0, k);
      const eligible = window.filter((entry) => entry.eligible && entry.score > 0);
      const best = [...eligible].sort(
        (a, b) => b.score - a.score || b.tie - a.tie || (a.member.key < b.member.key ? -1 : 1)
      )[0];

      nominees[String(k)] = best ? nomineeOf(best.member, best.score) : null;
      eligibleCounts[String(k)] = eligible.length;
    }

    arms[arm] = { library: lib.map((candidate) => candidate.key), nominees, eligible: eligibleCounts };
  }

  // the penalty-displaced families' best-J′ members are evaluated too (the discarded-group audit)
  for (const entry of prepared.penaltyDisplaced) {
    ensure(prepared.credible.find((candidate) => candidate.key === entry.key)!);
  }

  // the largest family's share of the top 32 credible vectors by J_s (the dominance trigger, T-b)
  const top32 = [...prepared.credible].sort(byJs).slice(0, 32);
  const counts = new Map<number, number>();

  for (const candidate of top32) {
    const family = prepared.familyIndex.get(candidate.key)!;

    counts.set(family, (counts.get(family) ?? 0) + 1);
  }

  const sizes = prepared.families.map((family) => family.members.length).sort((a, b) => a - b);

  return {
    symbol: prepared.symbol,
    pool,
    evaluated: prepared.all.length,
    credible: prepared.credible.length,
    uniqueSignatures: new Set(prepared.credible.map((candidate) => candidate.signature)).size,
    families: prepared.families.length,
    familySizes: {
      max: sizes.at(-1) ?? 0,
      median: sizes.length > 0 ? median(sizes) : 0,
      singletons: sizes.filter((size) => size === 1).length
    },
    largestFamilyShareOfTop32: top32.length > 0 ? Math.max(...counts.values()) / top32.length : NaN,
    a0r: {
      checked: checked.map(({ candidate, member }) => ({
        key: candidate.key,
        js: candidate.js,
        jnb: member.jnb!,
        credibleShare: member.nbCredibleShare!,
        signature: candidate.signature
      })),
      representative: representative?.key ?? null,
      representativeCredible,
      survivor,
      library: library.map((candidate) => candidate.key),
      nominee: survivor && repMember ? nomineeOf(repMember, repMember.jnb!) : null
    },
    arms,
    penaltyDisplaced: prepared.penaltyDisplaced,
    members
  };
};

export type { LibraryK };

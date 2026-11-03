// S3 (PROTOCOL.md §8): actual one-slot replays of 2–5 book pools, training door only, fixed generic vectors.
//
//   screen   per family × size stratum (16 strata), a hard budget of 96 proposals (72 primary, 24 exploratory):
//            exhaustive enumeration where the family has ≤ 96 valid pools, else exhaustive over the family's S2
//            candidate list when it holds ≤ 72 pools, else a round-robin beam (48 children, from the stratum k−1's 12
//            best) and round-robin swaps (24, from the stratum's 6 best); then 24 exploratory pools (12 uniform, 12
//            cluster-diverse with a protected or weak-but-distinct member). Every proposal is replayed under the nine
//            assignments (α, β, γ1–γ4, δ1, δ2, ε; duplicates by configuration evaluated once) with a 16-point N1
//            neighbourhood each (s3-nb16), and its best assignment's leave-one-out subsets are replayed at the centre.
//            Non-exhaustive strata also screen 48 uniform null pools (outside the budget, never nominated).
//   mid      the 12 best of each stratum plus its next 3 exploratory proposals: the two best distinct configurations
//            re-measured with 64 independent points (s3-nb64), ordered on those 64.
//   high     the 6 best by the mid order plus the next best exploratory proposal: the best configuration on Study 8's
//            instrument per pool (one joint Latin hypercube of 3 × 128 points seeded by the pool), the complementarity
//            test (I1 every leave-one-out subset on the same points; I2 every book's centre leave-one-out Δ > 0), the
//            Q7 stresses, Q8 and in-box Q2b (report-only), per-book probes, every subset at the centre (Shapley-style,
//            conditional on the vectors), period, year and event concentration. The incumbents and the Study 8 track
//            sets get the same.
//   nominate ≤ 3 per stratum among complementarity-qualified pools (2 by robust profit/yr + 1 exploration slot by
//            cluster diversity); the queue, PBO, TD1–TD3, the null-reference standing and the two Phase B batches.
import path from 'node:path';
import fs from 'fs-extra';
import { pboOf } from '../d1-robust/pbo.ts';
import { box } from '../multi-etf-d1/space.ts';
import { Rng } from '../optimizer/rng.ts';
import { type Grid, d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import type { ReplayResult } from '../portfolio-aware-d1/replay.ts';
import { settingsWith } from '../study8-expanded-regime-d1/evaluate.ts';
import { median, spearman } from '../study8-expanded-regime-d1/stats.ts';
import {
  type Family,
  anchorG,
  anchorV,
  clusterOf,
  eligibility,
  families,
  familyOf,
  nowIso,
  poolSizes,
  radius,
  resultFile,
  smoke,
  stresses
} from './context.ts';
import {
  type DesignPoint,
  type Family as NbFamily,
  ex2020Stats,
  fitOf,
  foldPairs,
  jointNeighbourhood,
  periodRobust,
  periodStats,
  periodYears,
  restrict,
  robustProfit,
  seedValue,
  summarize,
  uniquePoints,
  wilsonLower
} from './design.ts';
import { openDoor } from './door.ts';
import { type Books, Lab, type PointRecord, PointCache, S9Evaluator, configId, orderedOf } from './engine.ts';
import { constrainedCompare } from './s1.ts';
import { type AssignmentKey, assignmentKeys, s2File } from './s2.ts';

export const s3Dir = resultFile('s3');
export const s3Budget = smoke
  ? {
      perStratum: 12,
      primary: 9,
      beam: 6,
      swap: 3,
      exploreUniform: 2,
      exploreDiverse: 1,
      beamParents: 3,
      swapPools: 2,
      nullPools: 4
    }
  : {
      perStratum: 96,
      primary: 72,
      beam: 48,
      swap: 24,
      exploreUniform: 12,
      exploreDiverse: 12,
      beamParents: 12,
      swapPools: 6,
      nullPools: 48
    };
export const s3Precision = smoke
  ? { midTop: 2, midExplore: 1, midAssignments: 2, highTop: 1, highExplore: 1 }
  : { midTop: 12, midExplore: 3, midAssignments: 2, highTop: 6, highExplore: 1 };
const n = (full: number, toy: number) => (smoke ? toy : full);
export const nb = {
  screen: { name: 's3-nb16', n: n(16, 4), labels: ['s3', 'nb16'] } as NbFamily,
  mid: { name: 's3-nb64', n: n(64, 8), labels: ['s3', 'nb64'] } as NbFamily,
  high: [1, 2, 3].map((rep) => ({ name: `s3-hi#${rep}`, n: n(128, 8), labels: ['s3', 'hi', rep] }) as NbFamily),
  inbox: [1, 2].map((rep) => ({ name: `s3-inbox#${rep}`, n: n(128, 8), labels: ['s3', 'inbox', rep] }) as NbFamily),
  book: { name: 's3-book64', n: n(64, 8), labels: ['s3', 'book64'] } as NbFamily
};
// I1: every book must add at least this much decisive robust profit/yr against its leave-one-out subset (the
// refinement threshold of Study 8 §7.1); I2: every book's centre leave-one-out Δnet/yr > 0.
export const complementarity = { marginPerYear: 1000 };
export const halfYearKeys = [2018, 2019, 2020, 2021, 2022, 2023, 2024].flatMap((year) => [`${year}H1`, `${year}H2`]);

export type Stream =
  'exhaustive' | 'exhaustive-C' | 'beam' | 'swap' | 'explore-uniform' | 'explore-diverse' | 'reference' | 'null';

export interface Proposal {
  id: string;
  members: string[];
  family: Family;
  size: number;
  stream: Stream;
  parent?: string;
  proxyMembers: string[]; // members that are direct duplicates of VGT or GDX (labelled)
}

interface S2Record {
  assignments: Record<AssignmentKey, Record<string, { id: string; grid: Grid }>>;
  candidateLists: Record<Family, { primary: string[]; seeds: string[]; exploratory: string[] }>;
  groupOf: Record<string, string>;
  directProxies: Record<string, string[]>;
  forbidden: Record<Family, string[]>;
  redundantDecisions: Record<string, Record<string, string>>;
  protectedList: { cluster: string; symbol: string }[];
  weakDistinct: { symbol: string }[];
  events: {
    alpha: { marketWide: { firstSession: number; lastSession: number; first: string; last: string; id: string }[] };
  };
}

export const readS2 = async () => (await fs.readJson(s2File)) as S2Record;

export const poolId = (members: readonly string[]) => orderedOf(members).join('+');

const validFor = (family: Family, members: readonly string[]) =>
  familyOf(members) === family && new Set(members).size === members.length;
// One member per opportunity-source group, except that a redundant proxy kept on replay evidence (S2) may sit beside
// its own anchor: it counts as its own key, so at most one kept proxy per group (review verification N1).
export const dupOk = (
  members: readonly string[],
  groupOf: Record<string, string>,
  keptProxies: ReadonlySet<string> = new Set()
) =>
  new Set(members.map((s) => (keptProxies.has(s) ? `${groupOf[s]}#kept-proxy` : groupOf[s]))).size === members.length;
const keptProxiesOf = (s2: S2Record, family: Family) =>
  new Set(
    Object.entries(s2.redundantDecisions?.[family] ?? {})
      .filter(([, decision]) => decision.startsWith('kept'))
      .map(([symbol]) => symbol)
  );
const anchorsOf = (family: Family) =>
  family === 'V' ? [anchorV] : family === 'G' ? [anchorG] : family === 'VG' ? [anchorV, anchorG] : [];
const proxiesIn = (members: readonly string[], s2: S2Record) =>
  members.filter((s) => (s2.directProxies[anchorV] ?? []).includes(s) || (s2.directProxies[anchorG] ?? []).includes(s));
const combinations = <T>(items: readonly T[], k: number): T[][] => {
  if (k === 0) return [[]];
  if (items.length < k) return [];

  const [head, ...rest] = items as [T, ...T[]];

  return [...combinations(rest, k - 1).map((c) => [head, ...c]), ...combinations(rest, k)];
};
const proposalOf = (members: string[], family: Family, stream: Stream, s2: S2Record, parent?: string): Proposal => ({
  id: poolId(members),
  members: orderedOf(members),
  family,
  size: members.length,
  stream,
  ...(parent ? { parent } : {}),
  proxyMembers: proxiesIn(members, s2)
});

// ----- screening evaluation -----

const booksUnder = (members: readonly string[], s2: S2Record, key: AssignmentKey): Books =>
  Object.fromEntries(members.map((s) => [s, s2.assignments[key][s]!.grid]));

const yearsCache = new WeakMap<Lab, { early: number; late: number; ex2020: number }>();
const yearsOf = (lab: Lab) => {
  let years = yearsCache.get(lab);

  if (!years) {
    years = {
      early: periodYears(lab, 'EARLY'),
      late: periodYears(lab, 'LATE'),
      ex2020: lab.ev.yearsOfRun() - periodYears(lab, '2020')
    };
    yearsCache.set(lab, years);
  }

  return years;
};

const fitSummary = (lab: Lab, fit: ReturnType<typeof fitOf>) => {
  const years = yearsOf(lab);
  const early = periodStats(fit.records, 'EARLY');
  const late = periodStats(fit.records, 'LATE');

  return {
    n: fit.nb.n,
    share: fit.nb.share,
    wilsonLower: wilsonLower(fit.nb.share, fit.nb.n),
    medianPerYear: fit.nb.medianPerYear,
    p10PerYear: fit.nb.p10PerYear,
    robustPerYear: fit.nb.robustPerYear,
    p90Dd: fit.nb.p90Dd,
    worstDd: fit.nb.worstDd,
    profitable: fit.nb.profitable,
    medianLots: fit.nb.medianLots,
    violation: fit.violation,
    parts: Object.fromEntries(Object.entries(fit.parts).filter(([, v]) => v > 0)),
    clippedPoints: fit.clippedPoints,
    early,
    late,
    earlyRobustPerYear: early.robust / years.early,
    lateRobustPerYear: late.robust / years.late,
    nbPeriods: periodRobust(fit.records),
    nbHalfYears: periodRobust(fit.records, halfYearKeys),
    ex2020: ex2020Stats(fit.records),
    ex2020RobustPerYear: ex2020Stats(fit.records).robust / years.ex2020
  };
};

export type FitSummary = ReturnType<typeof fitSummary>;

const centreSummary = (r: PointRecord, y: number) => ({
  net: r.net,
  perYear: r.net / y,
  realized: r.realized,
  unrealized: r.unrealized,
  interest: r.interest,
  costs: r.costs,
  dd: r.dd,
  ddDaily: r.ddDaily,
  lots: r.lots,
  episodes: r.episodes,
  lotYears: r.lotYears,
  heldDays: r.heldDays,
  occupancy: r.occupancy,
  perCapitalYear: r.perCapitalYear,
  top1Share: Number.isFinite(r.top1Share) ? r.top1Share : null,
  bestYear: r.bestYear,
  bestYearKey: r.bestYearKey,
  bestYearShare: r.net > 0 ? r.bestYear / r.net : null,
  refused: r.refused,
  refusalsBy: r.refusalsBy,
  books: r.books,
  periods: r.periods,
  signature: r.signature
});

export type CentreSummary = ReturnType<typeof centreSummary>;

export interface AssignmentEval {
  assignment: AssignmentKey;
  id: string;
  duplicateOf?: AssignmentKey;
  centre: CentreSummary;
  fit: FitSummary;
}

type Lot = ReplayResult['lots'][number];
const lotKey = (l: Lot) => `${l.symbol}|${l.entryTime}|${l.exitTime}`;
const episodesOf = (lots: readonly Lot[]) => {
  let episodes = 0;
  let previousExit = -Infinity;

  for (const lot of [...lots].sort((a, b) => a.entryIndex - b.entryIndex)) {
    if (lot.entryIndex - previousExit > 10) episodes++;
    previousExit = lot.exitIndex >= 0 ? lot.exitIndex : Infinity;
  }

  return episodes;
};

// The brief's per-proposal contention metrics (review M8): the pool and each leave-one-out subset at the centre.
export const leaveOneOut = (lab: Lab, books: Books) => {
  const symbols = orderedOf(Object.keys(books));
  const y = lab.ev.yearsOfRun();
  const full = lab.ev.replay(books);
  const fullRecord = lab.ev.recordOf(full);
  const fullKeys = new Set(full.lots.map(lotKey));
  const perBook: Record<string, Record<string, number>> = {};

  for (const s of symbols) {
    const own = full.lots.filter((l) => l.symbol === s);
    const entry: Record<string, number> = {
      lots: own.length,
      net: own.reduce((t, l) => t + l.net, 0),
      episodes: episodesOf(own),
      refused: full.refusals.filter((r) => r.decider === s).length,
      causedRefusals: full.refusals.filter((r) => r.holder === s && r.decider !== s).length
    };

    if (symbols.length > 1) {
      const sub = lab.ev.replay(Object.fromEntries(symbols.filter((x) => x !== s).map((x) => [x, books[x]!])));
      const subRecord = lab.ev.recordOf(sub);
      const subKeys = new Set(sub.lots.map(lotKey));
      const displaced = sub.lots.filter((l) => !fullKeys.has(lotKey(l)));
      const added = full.lots.filter((l) => l.symbol !== s && !subKeys.has(lotKey(l)));

      Object.assign(entry, {
        deltaPerYear: (fullRecord.net - subRecord.net) / y,
        deltaDd: fullRecord.dd - subRecord.dd,
        deltaInterest: fullRecord.interest - subRecord.interest,
        incrementalLots: full.lots.length - sub.lots.length,
        displacedOthersLots: displaced.length,
        displacedOthersNet: displaced.reduce((t, l) => t + l.net, 0),
        addedOthersLots: added.length,
        addedOthersNet: added.reduce((t, l) => t + l.net, 0)
      });
    }

    perBook[s] = entry;
  }

  return { perBook, sameMinuteDecisions: full.sameMinuteDecisions, refused: full.refused, granted: full.granted };
};

export interface Screened extends Proposal {
  evals: AssignmentEval[];
  uniqueAssignments: number;
  best: AssignmentKey;
  feasibleAssignments: number;
  bestRobustPerYear: number;
  medianRobustPerYear: number;
  key: { violation: number; robust: number; p90Dd: number; id: string };
  loo: ReturnType<typeof leaveOneOut>;
}

const keyOfEval = (e: AssignmentEval) => ({
  violation: e.fit.violation,
  robust: e.fit.robustPerYear,
  p90Dd: e.fit.p90Dd,
  id: e.id
});

export const screenProposal = (lab: Lab, proposal: Proposal, s2: S2Record, withLoo = true): Screened => {
  const y = lab.ev.yearsOfRun();
  const seen = new Map<string, AssignmentEval>();
  const evals = assignmentKeys.map((key) => {
    const books = booksUnder(proposal.members, s2, key);
    const id = configId(books);
    const prior = seen.get(id);

    if (prior) return { ...prior, assignment: key, duplicateOf: prior.assignment };

    const fit = fitOf(lab, books, [nb.screen]);
    const e: AssignmentEval = {
      assignment: key,
      id,
      centre: centreSummary(fit.centreRecord, y),
      fit: fitSummary(lab, fit)
    };

    seen.set(id, e);
    return e;
  });
  const unique = evals.filter((e) => !e.duplicateOf);
  const best = [...unique].sort((a, b) => constrainedCompare(keyOfEval(a), keyOfEval(b)))[0]!;

  return {
    ...proposal,
    evals,
    uniqueAssignments: unique.length,
    best: best.assignment,
    feasibleAssignments: unique.filter((e) => e.fit.violation === 0).length,
    bestRobustPerYear: best.fit.robustPerYear,
    medianRobustPerYear: median(unique.map((e) => e.fit.robustPerYear)),
    key: { ...keyOfEval(best), id: proposal.id },
    loo: withLoo
      ? leaveOneOut(lab, booksUnder(proposal.members, s2, best.assignment))
      : { perBook: {}, sameMinuteDecisions: 0, refused: 0, granted: 0 }
  };
};

export const byScreen = (a: Screened, b: Screened) => constrainedCompare(a.key, b.key);

// ----- proposal generation -----

export const stratumFile = (family: Family, size: number) => path.join(s3Dir, 'screen', `${family}${size}.json`);

// the symbols a family's pools may contain: the universe without the family's forbidden symbols (review M3)
const allowedOf = (family: Family, universe: readonly string[], s2: S2Record) =>
  universe.filter((s) => !(s2.forbidden[family] ?? []).includes(s));

const othersOf = (family: Family, allowed: readonly string[]) =>
  allowed.filter((s) => !anchorsOf(family).includes(s) && s !== anchorV && s !== anchorG);

const allValid = (family: Family, size: number, allowed: readonly string[]) =>
  combinations(othersOf(family, allowed), size - anchorsOf(family).length).map((rest) => [
    ...anchorsOf(family),
    ...rest
  ]);

const countValid = (family: Family, size: number, allowed: readonly string[]) => {
  const total = othersOf(family, allowed).length;
  const r = size - anchorsOf(family).length;
  let c = 1;

  for (let i = 0; i < r; i++) c = (c * (total - i)) / (i + 1);
  return Math.round(c);
};

export const candidatesOf = (s2: S2Record, family: Family) => {
  const list = s2.candidateLists[family];

  return [...list.seeds, ...list.primary, ...list.exploratory];
};

const randomPool = (rng: Rng, family: Family, size: number, allowed: readonly string[]) => {
  const anchors = anchorsOf(family);
  const pool = othersOf(family, allowed);
  const picked = new Set<string>();

  while (picked.size < size - anchors.length) picked.add(pool[rng.int(pool.length)]!);

  return [...anchors, ...picked];
};

const exploratory = (
  family: Family,
  size: number,
  allowed: readonly string[],
  s2: S2Record,
  taken: Set<string>
): Proposal[] => {
  const out: Proposal[] = [];
  const special = new Set([...s2.protectedList.map((p) => p.symbol), ...s2.weakDistinct.map((w) => w.symbol)]);

  for (const stream of ['explore-uniform', 'explore-diverse'] as const) {
    const rng = new Rng(seedValue(['s3', 'explore', stream, family, size]));
    const target = stream === 'explore-uniform' ? s3Budget.exploreUniform : s3Budget.exploreDiverse;
    let made = 0;

    for (let tries = 0; made < target && tries < 20000; tries++) {
      const members = randomPool(rng, family, size, allowed);
      const id = poolId(members);
      const rest = members.filter((s) => !anchorsOf(family).includes(s));

      if (taken.has(id) || !validFor(family, members)) continue;
      if (stream === 'explore-diverse') {
        if (new Set(rest.map(clusterOf)).size !== rest.length) continue;
        if (!rest.some((s) => special.has(s))) continue;
      }

      taken.add(id);
      out.push(proposalOf(members, family, stream, s2));
      made++;
    }
  }

  return out;
};

// Round-robin over lists: round r takes each list's next untaken item, in list order (review M1).
const roundRobin = (lists: Proposal[][], limit: number, taken: Set<string>) => {
  const out: Proposal[] = [];
  const cursor = lists.map(() => 0);
  let progress = true;

  while (out.length < limit && progress) {
    progress = false;

    for (let i = 0; i < lists.length && out.length < limit; i++) {
      const list = lists[i]!;

      while (cursor[i]! < list.length && taken.has(list[cursor[i]!]!.id)) cursor[i]!++;

      if (cursor[i]! < list.length) {
        const p = list[cursor[i]!]!;

        cursor[i]!++;
        taken.add(p.id);
        out.push(p);
        progress = true;
      }
    }
  }

  return out;
};

export interface NullPool {
  id: string;
  source: 'null' | 'proposal'; // exhaustive strata: every proposal is the null
  bestRobustPerYear: number; // the screening statistic (16 points, best of ≤ 9)
  independent64: number; // the best configuration's robust/yr on 64 independent points (like-for-like, review N9)
  feasibleAssignments: number;
  violation: number;
}

export interface StratumRecord {
  stage: 's3-screen';
  family: Family;
  size: number;
  at: string;
  validPools: number;
  plan: string;
  candidates: string[];
  proposals: Screened[];
  nullPools: NullPool[];
  counts: Record<string, number>;
  rejectedChildren: Record<string, number>; // over every parent's and pool's candidate children, reached or not
  unusedBudget: number;
  compute: { points: number; replays: number; seconds: number };
}

export const runStratum = async (
  lab: Lab,
  s2: S2Record,
  universe: readonly string[],
  family: Family,
  size: number
): Promise<StratumRecord> => {
  const file = stratumFile(family, size);

  if (await fs.pathExists(file)) return (await fs.readJson(file)) as StratumRecord;

  const started = Date.now();
  const points0 = lab.computed;
  const replays0 = lab.ev.replays;
  const allowed = allowedOf(family, universe, s2);
  const validPools = countValid(family, size, allowed);
  const candidates = candidatesOf(s2, family).filter((c) => allowed.includes(c));
  const primaryList = [...s2.candidateLists[family].seeds, ...s2.candidateLists[family].primary].filter((c) =>
    allowed.includes(c)
  );
  const exploreList = s2.candidateLists[family].exploratory.filter((c) => allowed.includes(c));
  const taken = new Set<string>();
  const skipped: Record<string, number> = {};
  const skip = (reason: string) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
    return undefined;
  };
  const screened: Screened[] = [];
  const evaluate = (proposals: Proposal[]) => {
    for (const p of proposals) screened.push(screenProposal(lab, p, s2));
  };
  const anchors = anchorsOf(family);
  const kept = keptProxiesOf(s2, family);
  let plan: string;
  let exhaustive = false;

  if (validPools <= s3Budget.perStratum) {
    plan = `exhaustive: all ${validPools} valid pools`;
    exhaustive = true;
    evaluate(
      allValid(family, size, allowed).map((members) => {
        taken.add(poolId(members));
        return proposalOf(members, family, 'exhaustive', s2);
      })
    );
  } else {
    const inC = combinations(candidates, size - anchors.length)
      .map((rest) => [...anchors, ...rest])
      .filter((members) => validFor(family, members) && dupOk(members, s2.groupOf, kept));

    if (inC.length <= s3Budget.primary) {
      plan = `exhaustive over the ${candidates.length} S2 candidates (${inC.length} pools) + exploratory`;
      evaluate(
        inC.map((members) => {
          taken.add(poolId(members));
          return proposalOf(members, family, 'exhaustive-C', s2);
        })
      );
    } else {
      plan = `round-robin beam ${s3Budget.beam} + swaps ${s3Budget.swap} over the ${candidates.length} S2 candidates + exploratory`;

      // parents: the stratum k − 1's best; without one, the family's base set (N: each candidate alone)
      const parentFile = stratumFile(family, size - 1);
      const parents: { id: string; members: string[] }[] = (await fs.pathExists(parentFile))
        ? [...((await fs.readJson(parentFile)) as StratumRecord).proposals]
            .sort(byScreen)
            .slice(0, s3Budget.beamParents)
        : anchors.length
          ? [{ id: poolId(anchors), members: anchors }]
          : candidates.slice(0, s3Budget.beamParents).map((c) => ({ id: c, members: [c] }));
      const admissible = (members: string[], parent: string, stream: Stream) => {
        if (!validFor(family, members)) return skip('invalid family');
        if (!dupOk(members, s2.groupOf, kept)) return skip('two members of one group');
        if (taken.has(poolId(members))) return skip('already proposed');

        return proposalOf(members, family, stream, s2, parent);
      };
      // each parent's children: its best primary child, its best exploratory child, then the rest in list order
      const childLists = parents.map((parent) => {
        const childrenOf = (list: string[]) =>
          list
            .filter((c) => !parent.members.includes(c))
            .map((c) => admissible([...parent.members, c], parent.id, 'beam'))
            .filter((x): x is Proposal => x !== undefined);
        const p = childrenOf(primaryList);
        const e = childrenOf(exploreList);

        return [...p.slice(0, 1), ...e.slice(0, 1), ...p.slice(1), ...e.slice(1)];
      });

      evaluate(roundRobin(childLists, s3Budget.beam, taken));

      const top = [...screened].sort(byScreen).slice(0, s3Budget.swapPools);
      const rankOf = (s: string) => {
        const i = candidates.indexOf(s);

        return i < 0 ? Infinity : i;
      };
      const swapLists = top.map((pool) =>
        pool.members
          .filter((s) => !anchors.includes(s))
          .sort((a, b) => rankOf(b) - rankOf(a) || (a < b ? -1 : 1))
          .flatMap((m) =>
            candidates
              .filter((c) => !pool.members.includes(c))
              .map((c) => admissible([...pool.members.filter((s) => s !== m), c], pool.id, 'swap'))
          )
          .filter((x): x is Proposal => x !== undefined)
      );

      evaluate(roundRobin(swapLists, s3Budget.swap, taken));
    }

    evaluate(exploratory(family, size, allowed, s2, taken));
  }

  // the null reference (review M2): uniform valid pools screened identically; exhaustive strata are their own null
  const nullPools: NullPool[] = [];
  const independent64 = (p: Screened) => fitOf(lab, booksUnder(p.members, s2, p.best), [nb.mid]).nb.robustPerYear;

  if (exhaustive) {
    for (const p of screened) {
      nullPools.push({
        id: p.id,
        source: 'proposal',
        bestRobustPerYear: p.bestRobustPerYear,
        independent64: independent64(p),
        feasibleAssignments: p.feasibleAssignments,
        violation: p.key.violation
      });
    }
  } else {
    const rng = new Rng(seedValue(['s3', 'null', family, size]));
    const drawn = new Set<string>();

    for (let tries = 0; nullPools.length < s3Budget.nullPools && tries < 50000; tries++) {
      const members = randomPool(rng, family, size, allowed);
      const id = poolId(members);

      if (drawn.has(id) || !validFor(family, members)) continue;

      drawn.add(id);

      const p = screenProposal(lab, proposalOf(members, family, 'null', s2), s2, false);

      nullPools.push({
        id,
        source: 'null',
        independent64: independent64(p),
        bestRobustPerYear: p.bestRobustPerYear,
        feasibleAssignments: p.feasibleAssignments,
        violation: p.key.violation
      });
    }
  }

  const counts: Record<string, number> = {};

  for (const p of screened) counts[p.stream] = (counts[p.stream] ?? 0) + 1;

  const record: StratumRecord = {
    stage: 's3-screen',
    family,
    size,
    at: nowIso(),
    validPools,
    plan,
    candidates,
    proposals: screened.sort(byScreen),
    nullPools,
    counts,
    rejectedChildren: skipped,
    unusedBudget: s3Budget.perStratum - screened.length,
    compute: {
      points: lab.computed - points0,
      replays: lab.ev.replays - replays0,
      seconds: (Date.now() - started) / 1000
    }
  };

  await fs.outputJson(`${file}.tmp`, record);
  await fs.rename(`${file}.tmp`, file);
  lab.cache.flushSync();

  return record;
};

// ----- shared lab -----

export const openLab = async (universe: readonly string[], purpose: string, cacheName: string) => {
  const door = await openDoor(universe, purpose, { key: 's3' });
  const ev = new S9Evaluator(door, 60000);

  return new Lab(ev, await PointCache.open(door, resultFile('cache', 's3', `${cacheName}.jsonl`)));
};

// One process per family (`--family F`); sizes run in order 2 → 5 because beams read size k − 1.
export const runScreen = async (universe: readonly string[], only: readonly Family[] = families) => {
  const s2 = await readS2();
  const lab = await openLab(
    universe,
    `S3 screen ${only.join(',')} (training door, generic vectors)`,
    `screen-${only.join('')}`
  );

  for (const size of poolSizes) {
    for (const family of only) {
      const record = await runStratum(lab, s2, universe, family, size);

      console.info(
        `S3 screen ${family}${size}: ${record.proposals.length} proposals + ${record.nullPools.length} null (${record.plan}) in ${record.compute.seconds.toFixed(0)} s`
      );
    }
  }
};

// ----- reference pools and frozen incumbents -----

export const referencePools: { key: string; members: string[]; note: string }[] = [
  { key: 'ref-VG', members: ['VGT', 'GDX'], note: 'Study 8 track VG set' },
  { key: 'ref-VXR', members: ['VGT', 'XBI', 'XRT'], note: 'Study 8 track VXR set' },
  { key: 'ref-VXRG', members: ['VGT', 'XBI', 'XRT', 'GDX'], note: 'Study 8 track VXRG set' },
  { key: 'ref-VXRKG', members: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'], note: 'Study 8 track VXRKG set (B5 books)' }
];

// ----- mid and high precision -----

export interface Mid {
  id: string;
  family: Family;
  size: number;
  stream: Stream;
  members: string[];
  assignments: { assignment: AssignmentKey; id: string; nb64: FitSummary; pooled80: FitSummary }[];
  best: AssignmentKey;
  key: { violation: number; robust: number; p90Dd: number; id: string };
}

const fitKey = (f: FitSummary, id: string) => ({ violation: f.violation, robust: f.robustPerYear, p90Dd: f.p90Dd, id });

export const midOf = (lab: Lab, s2: S2Record, p: Screened): Mid => {
  const chosen = p.evals
    .filter((e) => !e.duplicateOf)
    .sort((a, b) => constrainedCompare(keyOfEval(a), keyOfEval(b)))
    .slice(0, s3Precision.midAssignments);
  const assignments = chosen.map((e) => {
    const books = booksUnder(p.members, s2, e.assignment);

    return {
      assignment: e.assignment,
      id: e.id,
      nb64: fitSummary(lab, fitOf(lab, books, [nb.mid])),
      pooled80: fitSummary(lab, fitOf(lab, books, [nb.screen, nb.mid]))
    };
  });
  // ordered on the independent 64 points (review m2); the pooled 80 is reported
  const best = [...assignments].sort((a, b) => constrainedCompare(fitKey(a.nb64, a.id), fitKey(b.nb64, b.id)))[0]!;

  return {
    id: p.id,
    family: p.family,
    size: p.size,
    stream: p.stream,
    members: p.members,
    assignments,
    best: best.assignment,
    key: { ...fitKey(best.nb64, best.id), id: p.id }
  };
};

export const band = (share: number) =>
  share >= 0.95
    ? 'preferred (≥ 95%)'
    : share >= 0.93
      ? 'conditional (93–95%)'
      : share >= 0.9
        ? 'diagnostic (90–93%)'
        : 'below 90% (fails C2)';
const bandEdge = (share: number) => (share >= 0.95 ? 0.95 : share >= 0.93 ? 0.93 : share >= 0.9 ? 0.9 : 0);

// Exact subsets at the centre (conditional on the fixed vectors): v(∅) = 0.
export const subsetsOf = (lab: Lab, books: Books) => {
  const symbols = orderedOf(Object.keys(books));
  const y = lab.ev.yearsOfRun();
  const value: Record<
    string,
    { net: number; perYear: number; dd: number; lots: number; bookLots: Record<string, number> }
  > = { '': { net: 0, perYear: 0, dd: 0, lots: 0, bookLots: {} } };

  for (let mask = 1; mask < 1 << symbols.length; mask++) {
    const subset = symbols.filter((_s, i) => mask & (1 << i));
    const r = lab.point(Object.fromEntries(subset.map((s) => [s, books[s]!])));

    value[subset.join('+')] = {
      net: r.net,
      perYear: r.net / y,
      dd: r.dd,
      lots: r.lots,
      bookLots: Object.fromEntries(Object.entries(r.books).map(([s, b]) => [s, b.lots]))
    };
  }

  const keyOf = (subset: string[]) => orderedOf(subset).join('+');
  const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1));
  const k = symbols.length;
  const shapley: Record<string, number> = {};
  const leaveOneOutCentre: Record<string, { deltaPerYear: number; deltaDd: number }> = {};
  const full = value[keyOf(symbols)]!;

  for (const s of symbols) {
    const others = symbols.filter((x) => x !== s);
    let phi = 0;

    for (let mask = 0; mask < 1 << others.length; mask++) {
      const subset = others.filter((_x, i) => mask & (1 << i));
      const weight = (factorial(subset.length) * factorial(k - subset.length - 1)) / factorial(k);

      phi += weight * (value[keyOf([...subset, s])]!.perYear - value[keyOf(subset)]!.perYear);
    }

    shapley[s] = phi;

    const without = value[keyOf(others)]!;

    leaveOneOutCentre[s] = { deltaPerYear: full.perYear - without.perYear, deltaDd: full.dd - without.dd };
  }

  return {
    value,
    shapley,
    leaveOneOut: leaveOneOutCentre,
    standalone: Object.fromEntries(symbols.map((s) => [s, value[s]!]))
  };
};

const nearBound = (books: Books) =>
  orderedOf(Object.keys(books)).flatMap((symbol) =>
    d1Keys
      .filter((key, d) => {
        const spec = box[d]!;
        const value = books[symbol]![key];

        return value - spec.min < radius[key] || spec.max - value < radius[key];
      })
      .map((key) => `${symbol}.${key}`)
  );

export const highOf = (
  lab: Lab,
  books: Books,
  meta: Record<string, unknown> & { poolKey: string },
  windows: { firstSession: number; lastSession: number; id: string }[]
) => {
  const y = lab.ev.yearsOfRun();
  const symbols = orderedOf(Object.keys(books));
  // the decisive set: one joint LHS per pool (Study 8's instrument), 3 × 128, pooled and unique
  const designPoints: DesignPoint[] = nb.high.flatMap((family) => jointNeighbourhood(books, family, meta.poolKey));
  const fit = fitOf(lab, books, nb.high, undefined, undefined, { key: meta.poolKey, points: designPoints });
  const decisive = fitSummary(lab, fit);
  const perRep = nb.high.map((family) =>
    fitSummary(lab, fitOf(lab, books, [family], undefined, undefined, { key: meta.poolKey }))
  );
  const stress = Object.fromEntries(
    stresses.map((s) => {
      const r = lab.point(books, settingsWith(s));

      return [s.key, { net: r.net, dd: r.dd, lots: r.lots, pass: r.net > 0 && r.dd < eligibility.ceiling }];
    })
  );
  const subsets = symbols.length <= 5 ? subsetsOf(lab, books) : null;
  // I1: every leave-one-out subset measured on the pool's own decisive points, restricted to the subset
  const i1: Record<string, { subsetRobustPerYear: number; marginPerYear: number; subsetN: number; pass: boolean }> =
    symbols.length > 1
      ? Object.fromEntries(
          symbols.map((s) => {
            const rest = symbols.filter((x) => x !== s);
            const subBooks = Object.fromEntries(rest.map((x) => [x, books[x]!]));
            const subPoints = uniquePoints(
              fit.points.map((p) => restrict(p, rest)),
              subBooks
            );
            const records = subPoints.map((p) => lab.point(p.books));
            const subRobust = robustProfit(summarize(records)) / y;

            return [
              s,
              {
                subsetRobustPerYear: subRobust,
                marginPerYear: decisive.robustPerYear - subRobust,
                subsetN: records.length,
                pass: decisive.robustPerYear - subRobust >= complementarity.marginPerYear
              }
            ];
          })
        )
      : {};
  const i2 = subsets
    ? Object.fromEntries(Object.entries(subsets.leaveOneOut).map(([s, v]) => [s, { ...v, pass: v.deltaPerYear > 0 }]))
    : {};
  const i1Pass = Object.values(i1).every((v) => v.pass);
  const i2Pass = Object.values(i2).every((v) => v.pass);
  const bounds = nearBound(books);
  let q2b: { n: number; share: number; p90Dd: number; pass: boolean } | null = null;

  if (bounds.length) {
    const f = fitSummary(lab, fitOf(lab, books, nb.inbox, undefined, undefined, { key: meta.poolKey, mode: 'inbox' }));

    q2b = {
      n: f.n,
      share: f.share,
      p90Dd: f.p90Dd,
      pass: f.share >= eligibility.share && f.p90Dd < eligibility.ceiling
    };
  }

  const perBook =
    symbols.length > 1
      ? Object.fromEntries(
          symbols.map((s) => {
            const f = fitSummary(lab, fitOf(lab, books, [nb.book], undefined, [s]));

            return [
              s,
              { share: f.share, robustPerYear: f.robustPerYear, p90Dd: f.p90Dd, medianPerYear: f.medianPerYear }
            ];
          })
        )
      : {};
  const centre = centreSummary(fit.centreRecord, y);
  const result = lab.ev.replay(books);
  const lotRows = result.lots.map((l) => ({
    symbol: l.symbol,
    entry: lab.door.dates[l.entryIndex],
    exit: l.exitIndex >= 0 ? lab.door.dates[l.exitIndex] : null,
    net: Math.round(l.net * 100) / 100,
    // an event window runs from the family's first to its last decision session, plus 5 sessions for fills after
    // the last decision (PROTOCOL.md §7.4)
    event: windows.find((w) => l.entryIndex >= w.firstSession && l.entryIndex <= w.lastSession + 5)?.id ?? null
  }));
  const byEvent: Record<string, number> = {};

  for (const l of lotRows) if (l.event) byEvent[l.event] = (byEvent[l.event] ?? 0) + l.net;

  const eventNet = Object.values(byEvent).reduce((t, v) => t + v, 0);
  const topEvent = Object.entries(byEvent).sort((a, b) => b[1] - a[1])[0];
  const q7 = Object.values(stress).every((s) => s.pass);

  return {
    ...meta,
    id: configId(books),
    members: symbols,
    books,
    centre,
    decisive,
    objectives: [centre.perYear, decisive.medianPerYear, decisive.p10PerYear, decisive.p90Dd],
    perRep,
    band: band(decisive.share),
    bandUncertain: decisive.wilsonLower < bandEdge(decisive.share), // review m17
    stress,
    q7,
    q8: {
      ratio: centre.net > 0 ? (decisive.medianPerYear * y) / centre.net : null,
      pass: centre.net > 0 && decisive.medianPerYear * y >= eligibility.plateau * centre.net // Study 8's Q8 (N4)
    },
    q2b,
    nearBound: bounds,
    complementarity: { i1, i2, i1Pass, i2Pass, pass: symbols.length > 1 && i1Pass && i2Pass },
    perBook,
    subsets,
    loo: leaveOneOut(lab, books),
    concentration: {
      bestYearShare: centre.bestYearShare,
      top1Share: centre.top1Share,
      m2020Share: centre.net > 0 ? (centre.periods.M2020 ?? 0) / centre.net : null,
      r2022Share: centre.net > 0 ? (centre.periods.R2022 ?? 0) / centre.net : null,
      marketWideEventShare: centre.net > 0 ? eventNet / centre.net : null,
      topEvent: topEvent
        ? { id: topEvent[0], net: topEvent[1], share: centre.net > 0 ? topEvent[1] / centre.net : null }
        : null
    },
    timeSplit: {
      centreEarly: centre.periods.EARLY ?? null,
      centreLate: centre.periods.LATE ?? null,
      nbEarlyPerYear: decisive.earlyRobustPerYear,
      nbLatePerYear: decisive.lateRobustPerYear,
      bothHalvesPositive: (decisive.early.median ?? 0) > 0 && (decisive.late.median ?? 0) > 0,
      ex2020: decisive.ex2020
    },
    lots: lotRows
  };
};

export type High = ReturnType<typeof highOf>;

export const allStrata = () => poolSizes.flatMap((size) => families.map((family) => ({ family, size })));

export type HighPart = Family | 'C';
export const highParts: readonly HighPart[] = [...families, 'C'];
export const midFile = (part: HighPart) => path.join(s3Dir, `mid-${part}.json`);
export const highFile = (part: HighPart) => path.join(s3Dir, `high-${part}.json`);

// One part per family (its strata) plus part C (the Study 8 track sets and the incumbents).
export const runMidHigh = async (
  universe: readonly string[],
  part: HighPart,
  frozen: { key: string; books: Books; note: string }[]
) => {
  if (await fs.pathExists(highFile(part)))
    throw new Error(`${highFile(part)} exists; the mid/high stage is write-once`);

  const s2 = await readS2();
  const lab = await openLab(universe, `S3 mid/high precision part ${part} (training door)`, `midhigh-${part}`);
  const strata = await Promise.all(
    allStrata().map(async ({ family, size }) => (await fs.readJson(stratumFile(family, size))) as StratumRecord)
  );
  const windows = s2.events.alpha.marketWide;
  const mids: Mid[] = [];
  const highs: High[] = [];
  const byMid = (a: Mid, b: Mid) => constrainedCompare(a.key, b.key);

  if (part !== 'C') {
    for (const stratum of strata.filter((s) => s.family === part)) {
      const ordered = [...stratum.proposals].sort(byScreen);
      const chosen = new Map<string, Screened>();

      for (const p of ordered.slice(0, s3Precision.midTop)) chosen.set(p.id, p);
      // the exploratory picks are additional (review m19)
      for (const p of ordered
        .filter((q) => q.stream.startsWith('explore') && !chosen.has(q.id))
        .slice(0, s3Precision.midExplore))
        chosen.set(p.id, p);

      const stratumMids = [...chosen.values()].map((p) => midOf(lab, s2, p));

      mids.push(...stratumMids);

      const midOrder = [...stratumMids].sort(byMid);
      const top = new Map<string, Mid>();

      for (const m of midOrder.slice(0, s3Precision.highTop)) top.set(m.id, m);
      for (const m of midOrder
        .filter((q) => q.stream.startsWith('explore') && !top.has(q.id))
        .slice(0, s3Precision.highExplore))
        top.set(m.id, m);

      for (const m of top.values()) {
        highs.push(
          highOf(
            lab,
            booksUnder(m.members, s2, m.best),
            {
              kind: 'proposal',
              poolKey: m.id,
              pool: m.id,
              family: stratum.family,
              size: stratum.size,
              stream: m.stream,
              assignment: m.best,
              midRobustPerYear: m.key.robust
            },
            windows
          )
        );
      }

      lab.cache.flushSync();
      console.info(`S3 mid/high ${stratum.family}${stratum.size}: ${chosen.size} mid, ${top.size} high`);
    }
  } else {
    for (const ref of referencePools) {
      const existing = strata.flatMap((s) => s.proposals).find((p) => p.id === poolId(ref.members));
      const screen =
        existing ?? screenProposal(lab, proposalOf([...ref.members], familyOf(ref.members), 'reference', s2), s2);
      const m = midOf(lab, s2, screen);

      mids.push(m);
      highs.push(
        highOf(
          lab,
          booksUnder(m.members, s2, m.best),
          {
            kind: 'reference',
            poolKey: m.id,
            pool: m.id,
            key: ref.key,
            note: ref.note,
            family: m.family,
            size: m.size,
            stream: m.stream,
            assignment: m.best,
            screen: { bestRobustPerYear: screen.bestRobustPerYear, feasibleAssignments: screen.feasibleAssignments }
          },
          windows
        )
      );
    }

    for (const f of frozen) {
      highs.push(
        highOf(
          lab,
          f.books,
          {
            kind: 'incumbent',
            poolKey: poolId(Object.keys(f.books)),
            key: f.key,
            note: f.note,
            family: familyOf(Object.keys(f.books)),
            size: Object.keys(f.books).length
          },
          windows
        )
      );
      console.info(`S3 high comparator ${f.key}`);
    }
  }

  lab.cache.flushSync();
  await fs.outputJson(midFile(part), { stage: 's3-mid', part, at: nowIso(), mids });
  await fs.outputJson(`${highFile(part)}.tmp`, {
    stage: 's3-high',
    part,
    at: nowIso(),
    highs,
    compute: { points: lab.computed, replays: lab.ev.replays }
  });
  await fs.rename(`${highFile(part)}.tmp`, highFile(part));
};

// ----- nomination, queue, PBO, time diagnostics, Phase B batches -----

export const nominationRules = {
  perStratum: 3,
  batch: 8,
  batchPerFamilyMax: 3,
  nearIdenticalSymmetricDifference: 2, // a pool differing by ≤ 1 member from a chosen one is skipped (review m4)
  batchBMinDifferent: 2,
  queueMaxViolation: 0.25
};

const symmetricDifference = (a: readonly string[], b: readonly string[]) =>
  a.filter((x) => !b.includes(x)).length + b.filter((x) => !a.includes(x)).length;
const study8TrackSets = referencePools.map((r) => poolId(r.members));
const dominates = (a: number[], b: number[]) => {
  const better = [a[0]! >= b[0]!, a[1]! >= b[1]!, a[2]! >= b[2]!, a[3]! <= b[3]!];
  const strict = [a[0]! > b[0]!, a[1]! > b[1]!, a[2]! > b[2]!, a[3]! < b[3]!];

  return better.every(Boolean) && strict.some(Boolean);
};
const finiteOr = (v: number | undefined, fallback: number) => (v !== undefined && Number.isFinite(v) ? v : fallback);

// The nomination, queue, diagnostics and batch rules as a pure function of the sealed records (unit-tested).
export const nominate = (strata: StratumRecord[], highs: High[], mids: Mid[]) => {
  type P = High & { family: Family; size: number; stream: Stream; pool: string };
  const proposals = highs.filter((h) => (h as { kind?: string }).kind === 'proposal') as P[];
  const rp = (h: High) => h.decisive.robustPerYear;
  const feasible = (h: High) => h.decisive.violation === 0 && h.centre.dd < eligibility.ceiling && h.q7;
  const qualified = (h: High) => feasible(h) && h.complementarity.pass;
  const nominations: (P & { slot: string; nonDominated: boolean })[] = [];
  const trackSetControls: Record<string, unknown>[] = [];
  const queue: Record<string, unknown>[] = [];

  for (const { family, size } of allStrata()) {
    const mine = proposals
      .filter((h) => h.family === family && h.size === size)
      .sort((a, b) => rp(b) - rp(a) || (a.pool < b.pool ? -1 : 1));
    const nonDominated = (h: P) => !mine.some((o) => o !== h && dominates(o.objectives, h.objectives));
    const eligibleNow = mine.filter((h) => !study8TrackSets.includes(h.pool));

    for (const h of mine.filter((x) => study8TrackSets.includes(x.pool))) {
      trackSetControls.push({
        pool: h.pool,
        family,
        size,
        robustPerYear: rp(h),
        share: h.decisive.share,
        feasible: feasible(h),
        complementarity: h.complementarity.pass,
        note: 'Study 8 track set: a control, never a slot or a batch member'
      });
    }

    const ok = eligibleNow.filter(qualified);
    const picked: (P & { slot: string })[] = ok.slice(0, 2).map((h, i) => ({ ...h, slot: `profit-${i + 1}` }));
    // the exploration slot by a non-profit criterion (review M5): most distinct clusters, then share, then profit
    const explore = ok
      .filter((h) => h.stream.startsWith('explore') && !picked.some((p) => p.pool === h.pool))
      .sort(
        (a, b) =>
          new Set(b.members.map(clusterOf)).size - new Set(a.members.map(clusterOf)).size ||
          b.decisive.share - a.decisive.share ||
          rp(b) - rp(a) ||
          (a.pool < b.pool ? -1 : 1)
      )[0];
    const next = ok.find((h) => !picked.some((p) => p.pool === h.pool));
    const third = explore ? { ...explore, slot: 'exploration' } : next ? { ...next, slot: 'profit-3' } : undefined;

    if (third) picked.push(third);
    for (const p of picked) nominations.push({ ...p, nonDominated: nonDominated(p) });

    const bestNominated = picked.length ? Math.max(...picked.map(rp)) : -Infinity;

    for (const h of eligibleNow) {
      if (picked.some((p) => p.pool === h.pool)) continue;

      const reasons = [
        ...(h.decisive.violation > 0 ? [`violates ${Object.keys(h.decisive.parts).join(',')}`] : []),
        ...(h.centre.dd >= eligibility.ceiling ? ['centre DD ≥ $35k'] : []),
        ...(!h.q7 ? ['fails Q7'] : []),
        ...(!h.complementarity.i1Pass ? ['fails I1 (a book adds < $1,000/yr robust)'] : []),
        ...(!h.complementarity.i2Pass ? ['fails I2 (a book has centre LOO Δ ≤ 0)'] : []),
        ...(qualified(h) ? ['qualified, not nominated (slot limit)'] : [])
      ];

      if (
        rp(h) >= bestNominated ||
        h.stream.startsWith('explore') ||
        (feasible(h) && !h.complementarity.pass) ||
        (h.decisive.violation > 0 && h.decisive.violation <= nominationRules.queueMaxViolation)
      ) {
        queue.push({
          pool: h.pool,
          family,
          size,
          stream: h.stream,
          robustPerYear: rp(h),
          share: h.decisive.share,
          p90Dd: h.decisive.p90Dd,
          centreDd: h.centre.dd,
          violation: h.decisive.violation,
          q7: h.q7,
          complementarity: h.complementarity.pass,
          reasons
        });
      }
    }
  }

  // diagnostics per stratum: PBO (neighbourhood robust half-year blocks; and centre P&L, labelled), TD2, TD3
  const mean = (v: number[]) => v.reduce((t, x) => t + x, 0) / Math.max(1, v.length);
  const td3 = (evals: AssignmentEval[]) =>
    foldPairs.map(([fold, nextYear]) => {
      const a = evals.map((e) => e.fit.nbPeriods[fold] ?? NaN);
      const b = evals.map((e) => e.fit.nbPeriods[nextYear] ?? NaN);
      const order = evals
        .map((_e, i) => i)
        .sort((x, z) => finiteOr(a[z], -Infinity) - finiteOr(a[x], -Infinity) || x - z);
      const top = order.slice(0, Math.min(10, order.length));

      return {
        fold,
        next: nextYear,
        spearman: evals.length >= 3 ? spearman(a, b) : null,
        topLift: mean(top.map((i) => finiteOr(b[i], 0))) - mean(b.map((v) => finiteOr(v, 0)))
      };
    });
  const diagnostics = strata.map((s) => {
    const seen = new Set<string>();
    const uniqueEvals = s.proposals.flatMap((p) =>
      p.evals.filter((e) => {
        const key = `${p.id}#${e.id}`;

        if (e.duplicateOf || seen.has(key)) return false;

        seen.add(key);
        return true;
      })
    );
    const nbMatrix = uniqueEvals.map((e) => halfYearKeys.map((h) => finiteOr(e.fit.nbHalfYears[h], 0)));
    const centreMatrix = uniqueEvals.map((e) => halfYearKeys.map((h) => e.centre.periods[h] ?? 0));
    const pbo = nbMatrix.length >= 2 ? pboOf(nbMatrix, halfYearKeys.length) : { pbo: NaN, splits: 0 };
    const pboCentre = centreMatrix.length >= 2 ? pboOf(centreMatrix, halfYearKeys.length) : { pbo: NaN, splits: 0 };
    const bestEvals = s.proposals.map((p) => p.evals.find((e) => e.assignment === p.best)!);
    const alphaEvals = s.proposals.map((p) => p.evals.find((e) => e.assignment === 'alpha')!);

    return {
      family: s.family,
      size: s.size,
      proposals: s.proposals.length,
      configs: uniqueEvals.length,
      pbo: pbo.pbo,
      pboCentre: pboCentre.pbo,
      splits: pbo.splits,
      pboNote: s.plan.startsWith('round-robin') ? 'adaptive stratum (beam/swap): PBO is a lower bound' : '',
      td2SpearmanBest:
        bestEvals.length >= 3
          ? spearman(
              bestEvals.map((e) => e.fit.earlyRobustPerYear),
              bestEvals.map((e) => e.fit.lateRobustPerYear)
            )
          : null,
      td2SpearmanAlpha:
        alphaEvals.length >= 3
          ? spearman(
              alphaEvals.map((e) => e.fit.earlyRobustPerYear),
              alphaEvals.map((e) => e.fit.lateRobustPerYear)
            )
          : null,
      td3Best: td3(bestEvals),
      td3Alpha: td3(alphaEvals),
      feasibleProposals: s.proposals.filter((p) => p.feasibleAssignments > 0).length,
      nullPools: s.nullPools.filter((p) => p.source === 'null').length,
      compute: s.compute
    };
  });

  // the null-reference standing of each nomination: its independent 64-point robust/yr against the stratum's null
  // distribution of the screening statistic (exhaustive strata: every proposal of the stratum)
  const midBy = new Map(mids.map((m) => [m.id, m]));
  const nullStanding = nominations.map((nom) => {
    const stratum = strata.find((s) => s.family === nom.family && s.size === nom.size)!;
    // like-for-like (review N9): the nominee's and every null pool's best configuration on 64 independent points
    const reference = stratum.nullPools.map((p) => p.independent64);
    const m = midBy.get(nom.pool)!;
    const independent = m.assignments.find((a) => a.assignment === m.best)!.nb64.robustPerYear;

    return {
      pool: nom.pool,
      independent64: independent,
      nullN: reference.length,
      percentile: reference.filter((v) => v < independent).length / Math.max(1, reference.length),
      nullMedian: median(reference),
      source: stratum.nullPools[0]?.source === 'proposal' ? 'all proposals (exhaustive stratum)' : 'uniform null pools'
    };
  });

  // Phase B first batches (≤ 8): A profit-first, B diversity-first; only complementarity-qualified nominations
  type N = (typeof nominations)[number];
  const ranked = [...nominations].sort((a, b) => rp(b) - rp(a) || (a.pool < b.pool ? -1 : 1));
  const take = (order: N[], firstPass: (chosen: N[], x: N) => boolean) => {
    const chosen: N[] = [];
    const ok = (x: N) =>
      !chosen.some((c) => c.pool === x.pool) &&
      chosen.filter((c) => c.family === x.family).length < nominationRules.batchPerFamilyMax &&
      !chosen.some(
        (c) => symmetricDifference(c.members, x.members) <= nominationRules.nearIdenticalSymmetricDifference
      );

    for (const x of order) if (chosen.length < nominationRules.batch && firstPass(chosen, x) && ok(x)) chosen.push(x);
    for (const x of order) if (chosen.length < nominationRules.batch && ok(x)) chosen.push(x);

    return chosen;
  };
  const batchA = take(ranked, (chosen, x) => !chosen.some((c) => c.family === x.family));
  const clustersOf = (x: N) => new Set(x.members.map(clusterOf));
  const diverseOrder = [...ranked].sort(
    (a, b) => clustersOf(b).size - clustersOf(a).size || rp(b) - rp(a) || (a.pool < b.pool ? -1 : 1)
  );
  let batchB = take(
    diverseOrder,
    (chosen, x) => !chosen.some((c) => c.family === x.family) || !chosen.some((c) => c.size === x.size)
  );
  let batchBNote = '';
  const differing = () => batchB.filter((b) => !batchA.some((a) => a.pool === b.pool)).length;

  // B must differ from A by ≥ 2 pools (review M2): B's lowest-ranked shared members are replaced by nominations outside
  // A while any fit the caps; otherwise the remaining identity is stated
  if (differing() < nominationRules.batchBMinDifferent) {
    const outsideA = diverseOrder.filter((x) => !batchA.some((a) => a.pool === x.pool));
    const shared = batchB.filter((b) => batchA.some((a) => a.pool === b.pool)).reverse();
    let need = nominationRules.batchBMinDifferent - differing();

    for (const drop of shared) {
      if (need <= 0) break;

      const candidate = outsideA.find(
        (x) =>
          !batchB.includes(x) &&
          batchB.filter((c) => c !== drop && c.family === x.family).length < nominationRules.batchPerFamilyMax &&
          !batchB.some(
            (c) =>
              c !== drop &&
              symmetricDifference(c.members, x.members) <= nominationRules.nearIdenticalSymmetricDifference
          )
      );

      if (!candidate) break;

      batchB = batchB.map((c) => (c === drop ? candidate : c));
      need--;
    }

    if (differing() < nominationRules.batchBMinDifferent) {
      batchBNote = `Batch B differs from A by only ${differing()} pool(s): too few qualified nominations outside A`;
    }
  }

  const familiesNominated = new Set(nominations.map((x) => x.family));
  const summaryOf = (x: N) => ({
    pool: x.pool,
    family: x.family,
    size: x.size,
    stream: x.stream,
    slot: x.slot,
    assignment: (x as unknown as { assignment: string }).assignment,
    members: x.members,
    robustPerYear: rp(x),
    share: x.decisive.share,
    wilsonLower: x.decisive.wilsonLower,
    band: x.band,
    bandUncertain: x.bandUncertain,
    p90Dd: x.decisive.p90Dd,
    centrePerYear: x.centre.perYear,
    centreDd: x.centre.dd,
    nonDominated: x.nonDominated,
    minMarginPerYear: Math.min(...Object.values(x.complementarity.i1).map((v) => v.marginPerYear))
  });
  return {
    rules: { ...nominationRules, complementarity },
    counts: {
      strata: strata.length,
      proposals: strata.reduce((t, s) => t + s.proposals.length, 0),
      uniqueConfigurations: diagnostics.reduce((t, d) => t + d.configs, 0),
      nullPools: strata.reduce((t, s) => t + s.nullPools.filter((p) => p.source === 'null').length, 0),
      highEvaluated: proposals.length,
      qualified: proposals.filter(qualified).length,
      feasible: proposals.filter(feasible).length,
      nominations: nominations.length,
      perFamilyTrials: Object.fromEntries(
        families.map((f) => [
          f,
          strata
            .filter((s) => s.family === f)
            .reduce((t, s) => t + s.proposals.reduce((u, p) => u + p.uniqueAssignments, 0), 0)
        ])
      ),
      screenPoints: strata.reduce((t, s) => t + s.compute.points, 0),
      screenReplays: strata.reduce((t, s) => t + s.compute.replays, 0)
    },
    negativeFamilies: families.filter((f) => !familiesNominated.has(f)),
    nominations: nominations.map(summaryOf),
    trackSetControls,
    queue,
    diagnostics,
    nullStanding,
    batchA: batchA.map(summaryOf),
    batchB: batchB.map(summaryOf),
    batchBNote
  };
};

export const runNominate = async () => {
  const strata = await Promise.all(
    allStrata().map(async ({ family, size }) => (await fs.readJson(stratumFile(family, size))) as StratumRecord)
  );
  const highs = (
    await Promise.all(highParts.map(async (part) => ((await fs.readJson(highFile(part))) as { highs: High[] }).highs))
  ).flat();
  const mids = (
    await Promise.all(highParts.map(async (part) => ((await fs.readJson(midFile(part))) as { mids: Mid[] }).mids))
  ).flat();
  const out = { stage: 's3-nominate', at: nowIso(), ...nominate(strata, highs, mids) };

  await fs.outputJson(path.join(s3Dir, 'nominations.json'), out, { spaces: 1 });

  return out;
};

// S2 (PROTOCOL.md §7): signal timing, collision and complementarity on the training door, with fixed generic vectors.
//
//   1. Vector assignments (pool-independent: a book has the same vector in every pool): α = each ETF's best plausible
//      vector of design half A (S1 menu), β = of half B, γ1–γ4 = seeded uniform draws from its four-vector menu,
//      δ1–δ2 = seeded uniform draws from all its plausible vectors, ε = its lowest-occupancy plausible top-16 vector.
//   2. Standalone timelines under α and β: decisions, entries, holding intervals, daily marks.
//   3. Pairwise matrices (all 1,830 pairs, α and β): Study 2's ±5-session one-to-one decision match share (each
//      direction), entry-in-holding collision share, median signed timing offset of matched decisions, daily
//      close-to-close return correlation, daily D1 equity (mark change) correlation.
//   4. Event families (Study 2's anchor clusters: 10-session window, no chaining; market-wide ≥ 10 ETFs) over all
//      61 ETFs' decisions, per assignment; independent events = anchors ≥ 252 sessions apart.
//   5. Opportunity-source groups (near-duplicates): complete-linkage groups (one cluster, ≤ 3 members) of the pairs
//      with return correlation ≥ 0.95, or (min match share ≥ 0.80 under both α and β and correlation ≥ 0.80); the
//      single-linkage components are reported only. Direct anchor proxies: forbidden or redundant per family.
//   6. Anchor contention: the actual one-slot replay of each family anchor policy alone and with each candidate added
//      (V = {VGT}, G = {GDX}, VG = {VGT, GDX}, N = three training-only generic seed anchors), under α and β.
//   7. Candidate lists (≤ 12 per family): 9 primary by mean marginal Δnet/yr (risk-filtered, one per group; for N the
//      three seeds plus 6 by marginal score against the seeds) and 3 exploratory by distinctness from the anchors.
import path from 'node:path';
import fs from 'fs-extra';
import { anchorClusters, independentCount } from '../d1-signal-capital-complementarity/events.ts';
import { matchDecisions } from '../d1-signal-capital-complementarity/pairs.ts';
import type { ReplayResult } from '../portfolio-aware-d1/replay.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { Rng } from '../optimizer/rng.ts';
import { median } from '../study8-expanded-regime-d1/stats.ts';
import { type Family, anchorG, anchorV, clusterOf, families, nowIso, resultFile } from './context.ts';
import { screenDesign, seedValue } from './design.ts';
import { type S9Door, openDoor } from './door.ts';
import { type Books, type PointRecord, S9Evaluator, baseSettings, vectorId } from './engine.ts';
import { constrainedCompare, s1File } from './s1.ts';

export const s2File = resultFile('s2', 's2.json');
// α, β, γ1–γ4 come from each ETF's standalone menu; δ1, δ2 and ε are not standalone-selected (review M5): δj is a
// seeded uniform draw from the ETF's plausible vectors among all 64, ε its lowest-occupancy plausible vector among its
// 16 best (final order). All nine are pool-independent and count equally in every pool.
export const assignmentKeys = [
  'alpha',
  'beta',
  'gamma1',
  'gamma2',
  'gamma3',
  'gamma4',
  'delta1',
  'delta2',
  'epsilon'
] as const;
export type AssignmentKey = (typeof assignmentKeys)[number];
export const s2Rules = {
  matchSessions: 5,
  familyWindow: 10,
  marketWide: 10,
  independentGap: 252,
  duplicateCorrelation: 0.95,
  duplicateMatch: 0.8,
  duplicateMatchCorrelation: 0.8,
  maxGroup: 3, // complete-linkage groups inside one repository cluster, at most 3 members (review C1)
  primaryPerFamily: 9,
  seeds: 3,
  exploratoryPerFamily: 3,
  candidatesPerFamily: 12
};

export interface S1Record {
  symbol: string;
  vectors: {
    index: number;
    half: 'A' | 'B';
    id: string;
    grid: Grid;
    plausible: boolean;
    final: { violation: number; robustPerYear: number; p90Dd: number };
    centre: { occupancy: number };
  }[];
  menu: Record<'A' | 'B', { index: number; id: string; rank: number; plausible: boolean }[]>;
  summary: {
    bestRobustPerYear: number;
    bestFeasible: boolean;
    plausible: number;
    feasibleFinal: number;
    feasible16: number;
  };
}

export const readS1 = async (symbols: readonly string[]) => {
  const out: Record<string, S1Record> = {};

  for (const symbol of symbols) out[symbol] = (await fs.readJson(s1File(symbol))) as S1Record;

  return out;
};

// S1 opportunity score: the best Study 8-feasible final robust profit/yr among the 64 vectors (−Infinity if none).
export const opportunityOf = (record: S1Record) =>
  Math.max(-Infinity, ...record.vectors.filter((v) => v.final.violation === 0).map((v) => v.final.robustPerYear));

export const assignmentsOf = (s1: Record<string, S1Record>) => {
  const design = screenDesign();
  const gridOf = (index: number) => design[index]!.grid;
  const out = Object.fromEntries(assignmentKeys.map((key) => [key, {} as Record<string, Grid>])) as Record<
    AssignmentKey,
    Record<string, Grid>
  >;

  for (const [symbol, record] of Object.entries(s1)) {
    const menu = [...record.menu.A, ...record.menu.B];

    out.alpha[symbol] = gridOf(record.menu.A[0]!.index);
    out.beta[symbol] = gridOf(record.menu.B[0]!.index);

    for (const j of [1, 2, 3, 4]) {
      const pick = new Rng(seedValue(['assign', j, symbol])).int(menu.length);

      out[`gamma${j}` as AssignmentKey][symbol] = gridOf(menu[pick]!.index);
    }

    const plausibleAll = record.vectors.filter((v) => v.plausible);
    const pickFrom = plausibleAll.length ? plausibleAll : record.vectors;

    for (const j of [1, 2]) {
      const pick = new Rng(seedValue(['assign', 'delta', j, symbol])).int(pickFrom.length);

      out[`delta${j}` as AssignmentKey][symbol] = gridOf(pickFrom[pick]!.index);
    }

    const top16 = record.vectors.slice(0, 16);
    const calm = [...(top16.some((v) => v.plausible) ? top16.filter((v) => v.plausible) : top16)].sort(
      (a, b) => a.centre.occupancy - b.centre.occupancy || a.index - b.index
    )[0]!;

    out.epsilon[symbol] = gridOf(calm.index);
  }

  return out;
};

interface Timeline {
  symbol: string;
  decisions: { time: number; session: number }[];
  entries: number[]; // entry times of filled trades
  holding: [number, number][]; // [entry, exit] times (exit = end of door while open)
  trades: { decisionIndex: number; entryTime: number; exitTime: number; net: number }[];
  marks: Float64Array;
  record: PointRecord;
}

const timelineOf = (ev: S9Evaluator, door: S9Door, symbol: string, grid: Grid): Timeline => {
  const trace = ev.trace(symbol, grid, baseSettings);
  const result = ev.replay({ [symbol]: grid });
  const endTime = door.loaded.universe.instruments[symbol]!.ds.sCloseTime[door.lastIndex]!;
  const filled = trace.trades.filter((t) => t.entryIndex >= 0);

  return {
    symbol,
    decisions: trace.trades.map((t) => ({ time: t.decisionTime, session: t.decisionIndex })),
    entries: filled.map((t) => t.entryTime),
    holding: filled.map((t) => [t.entryTime, t.exitIndex >= 0 ? t.exitTime : endTime] as [number, number]),
    trades: filled.map((t) => ({
      decisionIndex: t.decisionIndex,
      entryTime: t.entryTime,
      exitTime: t.exitIndex >= 0 ? t.exitTime : endTime,
      net: t.net
    })),
    marks: result.marks,
    record: ev.recordOf(result)
  };
};

const pearson = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  const n = Math.min(a.length, b.length);
  let sa = 0;
  let sb = 0;

  for (let i = 0; i < n; i++) {
    sa += a[i]!;
    sb += b[i]!;
  }

  const ma = sa / n;
  const mb = sb / n;
  let num = 0;
  let da = 0;
  let db = 0;

  for (let i = 0; i < n; i++) {
    num += (a[i]! - ma) * (b[i]! - mb);
    da += (a[i]! - ma) ** 2;
    db += (b[i]! - mb) ** 2;
  }

  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : null;
};

const inside = (time: number, intervals: readonly [number, number][]) =>
  intervals.some(([a, b]) => time >= a && time <= b);

// Complete-linkage groups (review C1): edges strongest first (by `strength`, lexicographic, then ids); two groups merge
// only if every pair of the merged group is an edge, all members share one cluster and the group stays ≤ maxGroup.
export const completeLinkage = (
  symbols: readonly string[],
  edges: readonly { a: string; b: string; strength: number[] }[],
  clusterOf: (symbol: string) => string,
  maxGroup: number
) => {
  const edgeSet = new Set(edges.flatMap((e) => [`${e.a}|${e.b}`, `${e.b}|${e.a}`]));
  const isEdge = (x: string, y: string) => edgeSet.has(`${x}|${y}`);
  const sorted = [...edges].sort((x, y) => {
    for (let i = 0; i < Math.max(x.strength.length, y.strength.length); i++) {
      const d = (y.strength[i] ?? 0) - (x.strength[i] ?? 0);

      if (d) return d;
    }

    return `${x.a}|${x.b}` < `${y.a}|${y.b}` ? -1 : 1;
  });
  const member = Object.fromEntries(symbols.map((s) => [s, [s]])) as Record<string, string[]>;
  const rejectedMerges: { a: string; b: string; reason: string }[] = [];

  for (const e of sorted) {
    const ga = member[e.a]!;
    const gb = member[e.b]!;

    if (ga === gb) continue;

    const merged = [...ga, ...gb];
    const reason =
      merged.length > maxGroup
        ? 'size'
        : new Set(merged.map(clusterOf)).size > 1
          ? 'cross-cluster'
          : !merged.every((x) => merged.every((y) => x === y || isEdge(x, y)))
            ? 'not complete'
            : '';

    if (reason) {
      rejectedMerges.push({ a: e.a, b: e.b, reason });
      continue;
    }

    for (const x of merged) member[x] = merged;
  }

  const groups = [...new Set(Object.values(member))]
    .map((members) => [...members].sort())
    .sort((x, y) => (x[0]! < y[0]! ? -1 : 1));

  return { groups, rejectedMerges, isEdge };
};

export const runS2 = async (symbols: readonly string[]) => {
  if (await fs.pathExists(s2File)) throw new Error(`${s2File} exists; S2 is write-once`);

  const started = Date.now();
  const s1 = await readS1(symbols);
  const assignments = assignmentsOf(s1);
  const door = await openDoor(symbols, 'S2 timing, collision and contention (all eligible ETFs)', { key: 's2' });
  const ev = new S9Evaluator(door);
  const first = door.eligibilityIndex;
  const last = door.lastIndex;

  // 2. timelines
  const timelines: Record<'alpha' | 'beta', Record<string, Timeline>> = { alpha: {}, beta: {} };

  for (const key of ['alpha', 'beta'] as const) {
    for (const symbol of symbols) timelines[key][symbol] = timelineOf(ev, door, symbol, assignments[key][symbol]!);
  }

  // daily log returns (split-adjusted closes) and daily mark changes, arming session → end
  const returns: Record<string, Float64Array> = {};

  for (const symbol of symbols) {
    const close = door.loaded.universe.instruments[symbol]!.ds.sClose;
    const out = new Float64Array(last - first);

    for (let s = first + 1; s <= last; s++) out[s - first - 1] = Math.log(close[s]! / close[s - 1]!);
    returns[symbol] = out;
  }

  const markChanges = (marks: Float64Array) => {
    const out = new Float64Array(last - first);

    for (let s = first + 1; s <= last; s++) out[s - first - 1] = marks[s]! - marks[s - 1]!;
    return out;
  };

  // 3. pairwise matrices
  const pairs: Record<string, unknown>[] = [];
  const pairIndex = new Map<string, Record<string, number | null>>();

  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const a = symbols[i]!;
      const b = symbols[j]!;
      const row: Record<string, number | null | string> = { a, b, returnCorr: pearson(returns[a]!, returns[b]!) };

      for (const key of ['alpha', 'beta'] as const) {
        const ta = timelines[key][a]!;
        const tb = timelines[key][b]!;
        const matches = matchDecisions(ta.decisions, tb.decisions, {
          sessions: s2Rules.matchSessions,
          exactMinute: false
        });
        const shareA = ta.decisions.length && tb.decisions.length ? matches.length / ta.decisions.length : null;
        const shareB = ta.decisions.length && tb.decisions.length ? matches.length / tb.decisions.length : null;

        row[`${key}DecA`] = ta.decisions.length;
        row[`${key}DecB`] = tb.decisions.length;
        row[`${key}MatchAB`] = shareA;
        row[`${key}MatchBA`] = shareB;
        row[`${key}MatchMin`] = shareA === null || shareB === null ? null : Math.min(shareA, shareB);
        row[`${key}Offset`] = matches.length ? median(matches.map((m) => m.b.session - m.a.session)) : null;
        row[`${key}CollideAB`] = ta.entries.length
          ? ta.entries.filter((t) => inside(t, tb.holding)).length / ta.entries.length
          : null;
        row[`${key}CollideBA`] = tb.entries.length
          ? tb.entries.filter((t) => inside(t, ta.holding)).length / tb.entries.length
          : null;
        row[`${key}EquityCorr`] =
          ta.record.lots > 0 && tb.record.lots > 0 ? pearson(markChanges(ta.marks), markChanges(tb.marks)) : null;
      }

      pairs.push(row);
      pairIndex.set(`${a}|${b}`, row as Record<string, number | null>);
      pairIndex.set(`${b}|${a}`, {
        ...(row as Record<string, number | null>),
        alphaMatchAB: row.alphaMatchBA as number | null,
        alphaMatchBA: row.alphaMatchAB as number | null,
        betaMatchAB: row.betaMatchBA as number | null,
        betaMatchBA: row.betaMatchAB as number | null
      });
    }
  }

  const pairOf = (a: string, b: string) => pairIndex.get(`${a}|${b}`)!;

  // 4. event families per assignment
  const eventsOf = (key: 'alpha' | 'beta') => {
    const items = symbols.flatMap((symbol) =>
      timelines[key][symbol]!.decisions.map((d) => ({ symbol, time: d.time, session: d.session }))
    );
    const clusters = anchorClusters(items, s2Rules.familyWindow, key === 'alpha' ? 'A' : 'B');
    const marketWide = clusters.filter((c) => c.symbols.length >= s2Rules.marketWide);
    const perSymbol = Object.fromEntries(
      symbols.map((symbol) => {
        const mine = clusters.filter((c) => c.items.some((item) => item.symbol === symbol));
        const decisions = items.filter((item) => item.symbol === symbol).length;
        const inWide = marketWide.reduce(
          (total, c) => total + c.items.filter((item) => item.symbol === symbol).length,
          0
        );
        const solo = mine.filter((c) => c.symbols.length === 1).length;

        return [
          symbol,
          {
            decisions,
            families: mine.length,
            marketWideShare: decisions ? inWide / decisions : null,
            soloFamilies: solo,
            independentEvents: independentCount(
              mine.map((c) => c.anchorSession),
              s2Rules.independentGap
            )
          }
        ];
      })
    );

    return {
      clusters: clusters.length,
      marketWide: marketWide.map((c) => ({
        id: c.id,
        first: door.dates[c.anchorSession],
        last: door.dates[c.lastSession],
        firstSession: c.anchorSession,
        lastSession: c.lastSession,
        etfs: c.symbols.length,
        decisions: c.items.length
      })),
      decisions: items.length,
      inMarketWide: marketWide.reduce((t, c) => t + c.items.length, 0),
      solo: clusters.filter((c) => c.symbols.length === 1).length,
      perSymbol
    };
  };
  const events = { alpha: eventsOf('alpha'), beta: eventsOf('beta') };

  // 5. opportunity-source groups
  const edges = pairs.filter((p) => {
    const corr = (p.returnCorr as number | null) ?? 0;
    const both =
      ((p.alphaMatchMin as number | null) ?? 0) >= s2Rules.duplicateMatch &&
      ((p.betaMatchMin as number | null) ?? 0) >= s2Rules.duplicateMatch;

    return corr >= s2Rules.duplicateCorrelation || (both && corr >= s2Rules.duplicateMatchCorrelation);
  });
  // Single-linkage components (reported only) and complete-linkage groups (used): an edge joins two groups only if
  // every pair of the merged group is itself an edge, all members share one repository cluster and the group stays
  // ≤ 3 members; edges are taken strongest first (return correlation, then the smaller of the α/β match shares).
  const parent = Object.fromEntries(symbols.map((s) => [s, s]));
  const find = (s: string): string => (parent[s] === s ? s : (parent[s] = find(parent[s]!)));

  for (const e of edges) parent[find(e.a as string)] = find(e.b as string);

  const componentMembers: Record<string, string[]> = {};

  for (const s of symbols) (componentMembers[find(s)] ??= []).push(s);

  const components = Object.values(componentMembers)
    .filter((m) => m.length > 1)
    .map((m) => m.sort());
  const edgeSet = new Set(edges.flatMap((e) => [`${e.a}|${e.b}`, `${e.b}|${e.a}`]));
  const isEdge = (x: string, y: string) => edgeSet.has(`${x}|${y}`);
  const { groups, rejectedMerges } = completeLinkage(
    symbols,
    edges.map((e) => ({
      a: e.a as string,
      b: e.b as string,
      strength: [
        (e.returnCorr as number | null) ?? 0,
        Math.min((e.alphaMatchMin as number | null) ?? 0, (e.betaMatchMin as number | null) ?? 0)
      ]
    })),
    clusterOf,
    s2Rules.maxGroup
  );
  const groupOf = Object.fromEntries(
    groups.flatMap((members, g) => members.map((s) => [s, `S${String(g + 1).padStart(2, '0')}`]))
  );
  // direct proxies: a duplicate edge to the anchor itself (never the whole component)
  const directProxies = (anchor: string) => symbols.filter((s) => s !== anchor && isEdge(s, anchor));

  // 6. anchor contention replays
  const opportunity = Object.fromEntries(symbols.map((s) => [s, opportunityOf(s1[s]!)]));
  const proxyV = directProxies(anchorV);
  const proxyG = directProxies(anchorG);
  // forbidden in every stream of a family (review M3): the anchors and the direct proxies of an anchor the family must
  // not contain (N: both; V: GDX's; G: VGT's). Proxies of an anchor the family contains are "redundant" and are
  // decided by the replay evidence below.
  const forbidden: Record<Family, string[]> = {
    V: [anchorG, ...proxyG],
    G: [anchorV, ...proxyV],
    VG: [],
    N: [anchorV, anchorG, ...proxyV, ...proxyG]
  };
  const redundant: Record<Family, string[]> = { V: proxyV, G: proxyG, VG: [...proxyV, ...proxyG], N: [] };
  const seedList: string[] = [];
  const seedClusters = new Set<string>([clusterOf(anchorV), clusterOf(anchorG)]); // seeds never from the anchors' clusters
  const seedGroups = new Set<string>();

  // ETFs ordered by their best S1 vector under the constrained order (feasible first by robust profit/yr, then
  // infeasible by violation), so the seeds and the protected list exist even when few ETFs have a feasible vector
  const bestKey = (s: string) => {
    const v = s1[s]!.vectors[0]!;

    return { violation: v.final.violation, robust: v.final.robustPerYear, p90Dd: v.final.p90Dd, id: s };
  };
  const etfCompare = (a: string, b: string) => constrainedCompare(bestKey(a), bestKey(b));

  for (const s of [...symbols].filter((s) => !forbidden.N.includes(s)).sort(etfCompare)) {
    if (seedList.length >= s2Rules.seeds) break;
    if (seedClusters.has(clusterOf(s)) || seedGroups.has(groupOf[s]!)) continue;

    seedList.push(s);
    seedClusters.add(clusterOf(s));
    seedGroups.add(groupOf[s]!);
  }

  const anchorPolicies: { family: Family; key: string; books: string[] }[] = [
    { family: 'V', key: 'V', books: [anchorV] },
    { family: 'G', key: 'G', books: [anchorG] },
    { family: 'VG', key: 'VG', books: [anchorV, anchorG] },
    ...seedList.map((s, i) => ({ family: 'N' as Family, key: `N${i + 1}`, books: [s] }))
  ];
  const lotKey = (l: { symbol: string; entryTime: number; exitTime: number }) =>
    `${l.symbol}|${l.entryTime}|${l.exitTime}`;
  const contention: Record<string, unknown>[] = [];
  const marginal: Record<string, Record<string, number[]>> = {}; // policy family → candidate → Δnet/yr list
  const marginalBy: Record<string, Record<string, Record<string, number[]>>> = {}; // family → candidate → assignment
  const riskOk: Record<string, Record<string, boolean>> = {};
  const y = ev.yearsOfRun();
  const wideWindows = events.alpha.marketWide.map((c) => [c.firstSession, c.lastSession] as [number, number]);

  for (const policy of anchorPolicies) {
    for (const key of ['alpha', 'beta'] as const) {
      const anchorBooks: Books = Object.fromEntries(policy.books.map((s) => [s, assignments[key][s]!]));
      const base: ReplayResult = ev.replay(anchorBooks);
      const baseRecord = ev.recordOf(base);
      const baseKeys = new Set(base.lots.map(lotKey));
      const busy = base.lots.map((l) => [l.entryTime, l.exitIndex >= 0 ? l.exitTime : Infinity] as [number, number]);

      for (const c of symbols) {
        if (policy.books.includes(c)) continue;

        const books: Books = { ...anchorBooks, [c]: assignments[key][c]! };
        const result = ev.replay(books);
        const record = ev.recordOf(result);
        const keys = new Set(result.lots.map(lotKey));
        const anchorLots = result.lots.filter((l) => l.symbol !== c);
        const cLots = result.lots.filter((l) => l.symbol === c);
        const displaced = base.lots.filter((l) => !keys.has(lotKey(l)));
        const addedAnchor = anchorLots.filter((l) => !baseKeys.has(lotKey(l)));
        const cTrades = timelines[key][c]!.trades;
        const idle = cTrades.filter((t) => !inside(t.entryTime, busy));
        const inWide = cLots.filter((l) => wideWindows.some(([a, b]) => l.entryIndex >= a && l.entryIndex <= b + 5));
        const delta = (record.net - baseRecord.net) / y;

        contention.push({
          family: policy.family,
          policy: policy.key,
          anchor: policy.books.join('+'),
          assignment: key,
          candidate: c,
          group: groupOf[c],
          baseNet: baseRecord.net,
          net: record.net,
          deltaNetPerYear: delta,
          baseDd: baseRecord.dd,
          dd: record.dd,
          deltaDd: record.dd - baseRecord.dd,
          deltaDdDaily: record.ddDaily - baseRecord.ddDaily,
          baseLots: baseRecord.lots,
          lots: record.lots,
          candidateLots: cLots.length,
          candidateNet: cLots.reduce((t, l) => t + l.net, 0),
          candidateLotsInMarketWide: inWide.length,
          candidateRefused: result.refusals.filter((r) => r.decider === c).length,
          anchorRefusedByCandidate: result.refusals.filter((r) => r.holder === c && r.decider !== c).length,
          displacedAnchorLots: displaced.length,
          displacedAnchorNet: displaced.reduce((t, l) => t + l.net, 0),
          addedAnchorLots: addedAnchor.length,
          addedAnchorNet: addedAnchor.reduce((t, l) => t + l.net, 0),
          deltaInterest: record.interest - baseRecord.interest,
          deltaCosts: record.costs - baseRecord.costs,
          deltaHeldDays: record.heldDays - baseRecord.heldDays,
          deltaOccupancy: record.occupancy - baseRecord.occupancy,
          candidateVirtualTrades: cTrades.length,
          candidateIdleEntries: idle.length,
          candidateIdleShare: cTrades.length ? idle.length / cTrades.length : null,
          candidateIdleStandaloneNet: idle.reduce((t, x) => t + x.net, 0)
        });
        ((marginal[policy.family] ??= {})[c] ??= []).push(delta);
        (((marginalBy[policy.family] ??= {})[c] ??= {})[key] ??= []).push(delta);
        (riskOk[policy.family] ??= {})[c] = (riskOk[policy.family]![c] ?? false) || record.dd < 35000;
      }
    }
  }

  // 7. candidate lists
  const anchorish = new Set([anchorV, anchorG, ...proxyV, ...proxyG]); // never protected (review m14)
  const protectedList = Object.entries(
    symbols
      .filter((s) => !anchorish.has(s))
      .reduce<Record<string, string>>((best, s) => {
        const cluster = clusterOf(s);
        const current = best[cluster];

        if (current === undefined || etfCompare(s, current) < 0) best[cluster] = s;
        return best;
      }, {})
  )
    .map(([cluster, symbol]) => ({ cluster, symbol }))
    .sort((a, b) => (a.cluster < b.cluster ? -1 : 1));
  const anchorBooksOf = (family: Family) =>
    family === 'V' ? [anchorV] : family === 'G' ? [anchorG] : family === 'VG' ? [anchorV, anchorG] : seedList;
  const distinctness = (c: string, family: Family) => {
    const others = anchorBooksOf(family).filter((a) => a !== c);
    const overlaps = others.map((a) => {
      const p = pairOf(c, a);

      return Math.max((p.alphaMatchAB as number | null) ?? 0, (p.alphaMatchBA as number | null) ?? 0);
    });

    return 1 - (overlaps.length ? overlaps.reduce((t, v) => t + v, 0) / overlaps.length : 0);
  };
  const weakDistinct = symbols
    .filter((s) => !Number.isFinite(opportunity[s]!))
    .map((s) => ({
      symbol: s,
      cluster: clusterOf(s),
      plausibleVectors: s1[s]!.summary.plausible,
      marketWideShare: events.alpha.perSymbol[s]!.marketWideShare,
      distinctFromVG: Math.min(distinctness(s, 'V'), distinctness(s, 'G'))
    }))
    .filter((w) => w.plausibleVectors > 0 && w.distinctFromVG >= 0.5)
    .sort((a, b) => b.distinctFromVG - a.distinctFromVG || (a.symbol < b.symbol ? -1 : 1));
  const candidateLists: Record<
    Family,
    {
      primary: string[];
      riskFlagged: string[];
      seeds: string[];
      exploratory: string[];
      scores: Record<string, unknown>;
    }
  > = {} as never;
  const redundantDecisions: Record<string, Record<string, string>> = {};

  for (const family of families) {
    const scores = Object.fromEntries(
      Object.entries(marginal[family] ?? {}).map(([c, list]) => [c, list.reduce((t, v) => t + v, 0) / list.length])
    );
    // a redundant proxy stays a candidate only if its replay adds net under α or β (review C1)
    const redundantOut = redundant[family].filter((c) => {
      const by = marginalBy[family]?.[c];
      const mean = (list: number[] | undefined) => (list?.length ? list.reduce((t, v) => t + v, 0) / list.length : 0);

      return mean(by?.alpha) <= 0 && mean(by?.beta) <= 0;
    });
    const excluded = new Set([anchorV, anchorG, ...forbidden[family], ...redundantOut]);

    redundantDecisions[family] = Object.fromEntries(
      redundant[family].map((c) => [c, redundantOut.includes(c) ? 'excluded (no replay gain)' : 'kept (replay gain)'])
    );

    const eligibleC = symbols.filter((s) => !excluded.has(s) && !(family === 'N' && seedList.includes(s)));
    const ranked = eligibleC
      .filter((c) => scores[c] !== undefined && riskOk[family]?.[c])
      .sort((a, b) => scores[b]! - scores[a]! || etfCompare(a, b));
    const flagged = eligibleC
      .filter((c) => scores[c] !== undefined && !riskOk[family]?.[c])
      .sort((a, b) => scores[b]! - scores[a]! || etfCompare(a, b));
    const seeds = family === 'N' ? [...seedList] : [];
    const usedGroups = new Set(seeds.map((s) => groupOf[s]!));
    const primary: string[] = [];
    const quota = s2Rules.primaryPerFamily - seeds.length;

    const riskFlagged: string[] = [];

    // risk-filtered first; a shortfall is filled with risk-flagged candidates (combined centre DD ≥ $35k in every
    // anchor replay), labelled, so a dangerous fixed vector alone does not remove an ETF from joint optimization
    for (const [list, flag] of [
      [ranked, false],
      [flagged, true]
    ] as const) {
      for (const c of list) {
        if (primary.length >= quota) break;
        if (usedGroups.has(groupOf[c]!)) continue;

        primary.push(c);
        usedGroups.add(groupOf[c]!);
        if (flag) riskFlagged.push(c);
      }
    }

    const chosen = new Set([...seeds, ...primary]);
    const chosenClusters = new Set([...chosen].map(clusterOf));
    const pool = [...new Set([...protectedList.map((p) => p.symbol), ...weakDistinct.map((w) => w.symbol)])]
      .filter((s) => !chosen.has(s) && !excluded.has(s))
      .sort(
        (a, b) =>
          distinctness(b, family) - distinctness(a, family) ||
          (events.alpha.perSymbol[a]!.marketWideShare ?? 1) - (events.alpha.perSymbol[b]!.marketWideShare ?? 1) ||
          (a < b ? -1 : 1)
      );
    const exploratory: string[] = [];

    for (const pass of [0, 1]) {
      for (const s of pool) {
        if (exploratory.length >= s2Rules.exploratoryPerFamily) break;
        if (exploratory.includes(s)) continue;
        if (pass === 0 && chosenClusters.has(clusterOf(s))) continue;

        exploratory.push(s);
        chosenClusters.add(clusterOf(s));
      }
    }

    candidateLists[family] = {
      riskFlagged,
      primary,
      seeds,
      exploratory,
      scores: Object.fromEntries(
        [...seeds, ...primary, ...exploratory].map((c) => [
          c,
          {
            marginalNetPerYear: scores[c] ?? null,
            riskOk: riskOk[family]?.[c] ?? null,
            opportunity: opportunity[c],
            distinctness: distinctness(c, family),
            group: groupOf[c],
            cluster: clusterOf(c),
            proxyOf: proxyV.includes(c) ? anchorV : proxyG.includes(c) ? anchorG : null
          }
        ])
      )
    };
  }

  const record = {
    stage: 's2',
    at: nowIso(),
    door: { id: door.id, end: door.end, first: door.dates[0], last: door.dates[last], sessions: door.dates.length },
    rules: s2Rules,
    assignments: Object.fromEntries(
      assignmentKeys.map((key) => [
        key,
        Object.fromEntries(symbols.map((s) => [s, { id: vectorId(assignments[key][s]!), grid: assignments[key][s] }]))
      ])
    ),
    standalone: Object.fromEntries(
      (['alpha', 'beta'] as const).map((key) => [
        key,
        Object.fromEntries(
          symbols.map((s) => {
            const r = timelines[key][s]!.record;

            return [
              s,
              {
                net: r.net,
                dd: r.dd,
                ddDaily: r.ddDaily,
                lots: r.lots,
                episodes: r.episodes,
                occupancy: r.occupancy,
                heldDays: r.heldDays,
                decisions: timelines[key][s]!.decisions.length,
                interest: r.interest,
                costs: r.costs
              }
            ];
          })
        )
      ])
    ),
    pairs,
    events,
    groups: groups.map((members) => ({ id: groupOf[members[0]!], members })),
    components: components.map((members) => ({ size: members.length, members })),
    rejectedMerges,
    directProxies: { [anchorV]: proxyV, [anchorG]: proxyG },
    forbidden,
    redundant,
    redundantDecisions,
    groupOf,
    duplicateEdges: edges.map((e) => ({
      a: e.a,
      b: e.b,
      returnCorr: e.returnCorr,
      alphaMatchMin: e.alphaMatchMin,
      betaMatchMin: e.betaMatchMin
    })),
    anchorProxies: { [anchorV]: proxyV, [anchorG]: proxyG },
    opportunity,
    seeds: seedList,
    anchorPolicies,
    contention,
    protectedList,
    weakDistinct,
    candidateLists,
    compute: { seconds: (Date.now() - started) / 1000, replays: ev.replays, traces: ev.traceBuilds }
  };

  await fs.outputJson(`${s2File}.tmp`, record);
  await fs.rename(`${s2File}.tmp`, s2File);
  console.info(
    `S2 complete in ${record.compute.seconds.toFixed(0)} s (${ev.replays} replays) → ${path.relative('.', s2File)}`
  );

  return record;
};

// Every workstream's figures (PROTOCOL.md §5–§11) from the stored records of this study and of the completed B4/B5
// audit (read-only): parameter stability with the matched 8-D pairing (P), execution paths (E), trades, years, regimes
// and the bootstrap (T), costs (C), portfolio risk and capital efficiency (R), the warning flags and the predeclared
// decisions. It writes results/analysis.json and the CSV tables. The only strategy runs are the four base portfolio
// re-executions of §9 (VGT duplication), each checked equal to its stored record.
import fs from 'fs-extra';
import { d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { loadAuditUniverse } from '../b4-b5-robustness/cli.ts';
import {
  episodesOf,
  excursionOf,
  median,
  percentileRank,
  quantile,
  recostLot,
  stationaryBootstrap
} from '../b4-b5-robustness/analysis.ts';
import { type DailyRecord, type LotRecord, type RunMetrics, metricsOf, runSpec } from '../b4-b5-robustness/run.ts';
import { baseRun, controlRun, oatPoints } from '../b4-b5-robustness/specs.ts';
import type { Family as PriorFamily } from '../b4-b5-robustness/specs.ts';
import { readDetail as readPriorDetail, readFamily as readPriorFamily } from '../b4-b5-robustness/store.ts';
import { newYork } from '../pools/run.ts';
import {
  type PoolId,
  base,
  costScenarios,
  flags,
  jointSeeds,
  nowIso,
  pairedPools,
  priorGates,
  priorRoot,
  protocolSha256,
  regimeWindows,
  resultDir,
  schedules,
  shortNames,
  studyLabel,
  writeJson,
  writeText
} from './context.ts';
import {
  type Standalone,
  asPriorSpec,
  families,
  jointDesign,
  loadFrozenPools,
  loadStandalones,
  pairedDesign,
  standaloneBaseRun,
  vgtOatPoints
} from './specs.ts';
import { readAll, readDetail, recordFields, toCsv } from './store.ts';

type M = RunMetrics;
type Brief = M['lotsBrief'][number];
type Mode = 'fixed' | 'portfolio';

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
const share = (values: readonly boolean[]) => (values.length ? values.filter(Boolean).length / values.length : NaN);
const yearOf = (date: string) => date.slice(0, 4);
const two = (index: number) => String(index).padStart(2, '0');
// The New York (exchange) calendar date of a UTC epoch second, so an after-hours time stays on its session.
const isoDate = (seconds: number) => (Number.isFinite(seconds) && seconds > 0 ? newYork(seconds).slice(0, 10) : '');
const stopReasons = new Set(['trailing stop', 'trailing stop gap']);

// ----- record keys -----

const sKey = (id: string, rest: string) => `s:${id}:${rest}`;
const priorKeys = {
  scenario: (pool: PoolId, id: string, mode: Mode) => `cost:${pool}:${id}:${mode}`,
  oat: (pool: PoolId, key: string, offset: string, mode: Mode) => `oat:${pool}:VGT:${key}:${offset}:${mode}`,
  book: (pool: PoolId, symbol: string, index: number, mode: Mode) => `book:${pool}:${symbol}:${two(index)}:${mode}`,
  joint: (pool: PoolId, seed: number, index: number, mode: Mode) => `joint:${pool}:s${seed}:${two(index)}:${mode}`,
  ablation: (pool: PoolId, symbol: string, mode: Mode) => `ablation:${pool}:-${symbol}:${mode}`,
  control: 'control:C0:portfolio'
};

const take = (map: Map<string, M>, key: string) => {
  const found = map.get(key);

  if (!found) {
    throw new Error(`no stored run ${key}`);
  }

  return found;
};

// ----- lot paths -----

export const lotIdentity = (lot: { symbol: string; decisionTime: number; exitTime: number; exitReason: string }) =>
  `${lot.symbol}@${lot.decisionTime}>${Number.isFinite(lot.exitTime) ? lot.exitTime : 'open'}:${lot.exitReason}`;

// The share of a frozen configuration's funded lots present unchanged in a run, and what was added or removed (a lot
// with the same decision but another exit counts as removed + added, and as one changed exit).
export const pathChange = (frozen: readonly Brief[], run: readonly Brief[], symbols?: (symbol: string) => boolean) => {
  const keep = (lots: readonly Brief[]) => (symbols ? lots.filter((lot) => symbols(lot.symbol)) : [...lots]);
  const a = keep(frozen);
  const b = keep(run);
  const aKeys = new Set(a.map(lotIdentity));
  const bKeys = new Set(b.map(lotIdentity));
  const removed = a.filter((lot) => !bKeys.has(lotIdentity(lot)));
  const added = b.filter((lot) => !aKeys.has(lotIdentity(lot)));
  const decisions = new Set(b.map((lot) => `${lot.symbol}@${lot.decisionTime}`));

  return {
    frozenLots: a.length,
    runLots: b.length,
    kept: a.length - removed.length,
    preserved: a.length ? (a.length - removed.length) / a.length : NaN,
    removed,
    added,
    exitChanged: removed.filter((lot) => decisions.has(`${lot.symbol}@${lot.decisionTime}`)).length
  };
};

// ----- distributions -----

const dist = (values: number[]) => ({
  n: values.length,
  median: median(values),
  p10: quantile(values, 0.1),
  p90: quantile(values, 0.9),
  min: values.length ? Math.min(...values) : NaN,
  max: values.length ? Math.max(...values) : NaN
});

// ----- small helpers -----

const correlation = (x: number[], y: number[]) => {
  const mx = sum(x) / x.length;
  const my = sum(y) / y.length;
  const cov = sum(x.map((value, index) => (value - mx) * (y[index]! - my)));
  const sx = Math.sqrt(sum(x.map((value) => (value - mx) ** 2)));
  const sy = Math.sqrt(sum(y.map((value) => (value - my) ** 2)));

  return sx > 0 && sy > 0 ? cov / (sx * sy) : NaN;
};

// The share of a frozen lot list whose entry session (symbol and entry date) recurs in a run, whatever the exit.
const entryPreserved = (frozen: readonly Brief[], run: readonly Brief[]) => {
  const entries = new Set(run.map((lot) => `${lot.symbol}@${lot.entryDate}`));

  return frozen.length
    ? frozen.filter((lot) => entries.has(`${lot.symbol}@${lot.entryDate}`)).length / frozen.length
    : NaN;
};

const flatten = (value: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, Array.isArray(inner) ? inner.join(' | ') : inner])
  );

const tally = (labels: string[]) => {
  const counts: Record<string, number> = {};

  for (const label of labels) {
    counts[label] = (counts[label] ?? 0) + 1;
  }

  return counts;
};

interface Item {
  label: string;
  fixed: M;
  portfolio?: M;
  lots?: Brief[]; // the funded lots (fixed), when known
  values?: Record<string, number>;
}

interface Frozen {
  fixed: M;
  portfolio: M;
  lots: Brief[];
}

export const designStats = (
  label: string,
  items: Item[],
  frozen: Frozen,
  c0EndEquity: number,
  regimeOf: (t: number) => string
) => {
  const nets = items.map((item) => item.fixed.net);
  const retention = nets.map((net) => net / frozen.fixed.net);
  const deltas = nets.map((net) => net - frozen.fixed.net);
  const withLots = items.filter((item) => item.lots);
  const preserved = withLots.map((item) => pathChange(frozen.lots, item.lots!).preserved);
  const portfolios = items.filter((item) => item.portfolio).map((item) => item.portfolio!);
  const daily = portfolios.map((p) => p.dailyPercent);
  const minute = portfolios.map((p) => p.minutePercent);
  const frozenDailyRegime = regimeOf(frozen.portfolio.dailyPercentTrough);
  const frozenFixedRegime = regimeOf(frozen.fixed.minuteDDTrough);

  return {
    label,
    n: items.length,
    net: dist(nets),
    retention: dist(retention),
    delta: dist(deltas),
    shareProfitable: share(nets.map((net) => net > 0)),
    shareHalf: share(retention.map((value) => value >= 0.5)),
    shareAbove: share(nets.map((net) => net > frozen.fixed.net)),
    shareEqual: share(nets.map((net) => Math.abs(net - frozen.fixed.net) < 0.005)),
    frozenPercentile: percentileRank(nets, frozen.fixed.net),
    minuteDD: dist(items.map((item) => item.fixed.minuteDD)),
    worstLot: Math.min(...items.map((item) => item.fixed.worstLot)),
    netPerDD: dist(items.map((item) => item.fixed.net / item.fixed.minuteDD)),
    lots: dist(items.map((item) => item.fixed.lots)),
    preserved: withLots.length ? dist(preserved) : null,
    sharePathUnchanged: withLots.length ? share(preserved.map((value) => value === 1)) : NaN,
    shareLotSetUnchanged: share(items.map((item) => item.fixed.lotSetHash === frozen.fixed.lotSetHash)),
    portfolio: portfolios.length
      ? {
          n: portfolios.length,
          endEquity: dist(portfolios.map((p) => p.endEquity)),
          incremental: dist(portfolios.map((p) => p.endEquity - c0EndEquity)),
          shareBeatsC0: share(portfolios.map((p) => p.endEquity > c0EndEquity)),
          frozenPercentile: percentileRank(
            portfolios.map((p) => p.endEquity),
            frozen.portfolio.endEquity
          ),
          daily: dist(daily),
          minute: dist(minute),
          dailyShift: median(daily) - frozen.portfolio.dailyPercent,
          shareDaily30: share(daily.map((value) => value > 0.3)),
          shareDaily35: share(daily.map((value) => value > 0.35)),
          shareMinute30: share(minute.map((value) => value > 0.3)),
          shareMinute35: share(minute.map((value) => value > 0.35)),
          worstEpisodeAsFrozen: share(portfolios.map((p) => regimeOf(p.dailyPercentTrough) === frozenDailyRegime)),
          worstEpisodes: tally(portfolios.map((p) => regimeOf(p.dailyPercentTrough)))
        }
      : null,
    fixedWorstEpisodeAsFrozen: share(items.map((item) => regimeOf(item.fixed.minuteDDTrough) === frozenFixedRegime)),
    fixedWorstEpisodes: tally(items.map((item) => regimeOf(item.fixed.minuteDDTrough))),
    frozenDailyRegime,
    frozenFixedRegime
  };
};

export type DesignStats = ReturnType<typeof designStats>;

// ----- the (b) comparison rule (PROTOCOL.md §11b) -----

// One matched item: S better, pool better, or a tie when the difference is within the item's band.
export const itemOutcome = (row: { s: number; p: number; higher: boolean; tie: number }) => {
  const difference = row.higher ? row.s - row.p : row.p - row.s;

  return Math.abs(difference) <= row.tie ? 'tie' : difference > 0 ? 'S better' : 'pool better';
};

// The tally: "S more robust" needs ≥ 5 items better and ≤ 2 worse; "pool more robust" the reverse.
export const tallyOf = (rows: readonly { outcome: string }[]) => {
  const sBetter = rows.filter((row) => row.outcome === 'S better').length;
  const pBetter = rows.filter((row) => row.outcome === 'pool better').length;
  const verdict =
    sBetter >= 5 && pBetter <= 2
      ? 'S more robust on matched tests'
      : pBetter >= 5 && sBetter <= 2
        ? 'pool more robust on matched tests'
        : 'no clear difference';

  return { sBetter, pBetter, verdict };
};

// ----- trades -----

export const tradeStats = (lots: LotRecord[]) => {
  const nets = lots.map((lot) => lot.net);
  const wins = lots.filter((lot) => lot.net > 0);
  const losses = lots.filter((lot) => lot.net <= 0);
  const total = sum(nets);
  const winsNet = sum(wins.map((lot) => lot.net));
  const lossNet = sum(losses.filter((lot) => lot.net < 0).map((lot) => lot.net));
  const sortedWins = [...wins].sort((a, b) => b.net - a.net);
  const top = (n: number) => sum(sortedWins.slice(0, n).map((lot) => lot.net));
  const byReason: Record<string, { count: number; wins: number; net: number }> = {};

  for (const lot of lots) {
    byReason[lot.exitReason] ??= { count: 0, wins: 0, net: 0 };
    byReason[lot.exitReason]!.count++;
    byReason[lot.exitReason]!.wins += lot.net > 0 ? 1 : 0;
    byReason[lot.exitReason]!.net += lot.net;
  }

  return {
    lots: lots.length,
    wins: wins.length,
    losses: losses.length,
    winRate: lots.length ? wins.length / lots.length : NaN,
    gross: sum(lots.map((lot) => lot.gross)),
    interest: sum(lots.map((lot) => lot.interest)),
    friction: sum(lots.map((lot) => lot.friction)),
    net: total,
    profitFactor: lossNet < 0 ? winsNet / -lossNet : null,
    medianNet: median(nets),
    meanNet: lots.length ? total / lots.length : NaN,
    best: Math.max(...nets),
    worst: Math.min(...nets),
    holdingSessions: dist(lots.filter((lot) => lot.exitIndex >= 0).map((lot) => lot.exitIndex - lot.entryIndex)),
    lotDays: dist(lots.map((lot) => lot.lotDays)),
    totalLotDays: sum(lots.map((lot) => lot.lotDays)),
    top1: top(1) / total,
    top3: top(3) / total,
    top5: top(5) / total,
    top10: top(10) / total,
    excludingTop: Object.fromEntries([1, 3, 5, 10].map((n) => [n, total - top(n)])),
    byReason,
    profitableStops: lots.filter((lot) => stopReasons.has(lot.exitReason) && lot.net > 0).length,
    losingStops: lots.filter((lot) => stopReasons.has(lot.exitReason) && lot.net <= 0).length,
    maxHoldLosers: lots.filter((lot) => lot.exitReason === 'maximum hold' && lot.net <= 0).length,
    maxHoldWinners: lots.filter((lot) => lot.exitReason === 'maximum hold' && lot.net > 0).length,
    open: lots.filter((lot) => lot.exitIndex < 0).length
  };
};

// ----- the analysis -----

export const analyze = async () => {
  const started = Date.now();
  const universe = await loadAuditUniverse();
  const dates = universe.dates;
  const indexOfDate = (date: string) => {
    const index = dates.indexOf(date);

    if (index < 0) {
      throw new Error(`${date} is not a session`);
    }

    return index;
  };
  const regimeOf = (seconds: number) => {
    const date = isoDate(seconds);

    if (!date) {
      return 'none';
    }

    const index = indexOfDate(date);
    const window = regimeWindows.find(
      (item) => item.regime && index > indexOfDate(item.from) && index <= indexOfDate(item.to)
    );

    return window ? `${window.regime} ${window.kind}` : `other ${yearOf(date)}`;
  };
  const pools = await loadFrozenPools();
  const standalones = await loadStandalones();
  const ours = await readAll(families);
  const priorFamilies: PriorFamily[] = ['base', 'control', 'dividends', 'cost', 'ablation', 'oat', 'joint', 'book'];
  const prior = new Map<string, M>();

  for (const family of priorFamilies) {
    for (const [key, metrics] of await readPriorFamily(family)) {
      prior.set(key, metrics);
    }
  }

  const out: Record<string, unknown> = {
    schema: 'vgt-standalone-robustness-analysis-v1',
    generatedAt: nowIso(),
    protocolSha256,
    window: { first: base.first, end: base.end, sessions: dates.length, firstEligible: base.firstEligibleDate }
  };
  const c0 = take(prior, priorKeys.control);
  const csv = async (name: string, rows: Record<string, unknown>[]) =>
    fs.outputFile(resultDir(`${name}.csv`), toCsv(rows));

  // ---------- 0. the pooled path re-executions equal the prior records ----------
  const reexecution: { key: string; prior: string; equal: boolean }[] = [];
  const stripped = (metrics: M) => JSON.stringify(recordFields(metrics));

  for (const [key, metrics] of ours) {
    if (metrics.family !== ('p-path' as never)) {
      continue;
    }

    const priorKey = String(metrics.meta.priorKey);
    const reference = take(prior, priorKey);

    reexecution.push({ key, prior: priorKey, equal: stripped(metrics) === stripped(reference) });
  }

  if (reexecution.length !== 130 || reexecution.some((row) => !row.equal)) {
    throw new Error(
      `pooled path re-executions: ${reexecution.filter((row) => row.equal).length}/${reexecution.length} equal to the prior records; the path comparison stops`
    );
  }

  out.reexecution = { runs: reexecution.length, allEqual: true };

  // ---------- frozen references ----------
  const s = standalones[0]! as Standalone;
  const S = {
    fixed: take(ours, sKey(s.id, 'cost:base:fixed')),
    portfolio: take(ours, sKey(s.id, 'cost:base:portfolio'))
  };
  const sFrozen: Frozen = { ...S, lots: S.fixed.lotsBrief };
  const poolFrozen = Object.fromEntries(
    pairedPools.map((pool) => [
      pool,
      {
        fixed: take(prior, priorKeys.scenario(pool, 'base', 'fixed')),
        portfolio: take(prior, priorKeys.scenario(pool, 'base', 'portfolio')),
        lots: take(ours, `p:${pool}:base:fixed`).lotsBrief
      } satisfies Frozen
    ])
  ) as Record<PoolId, Frozen>;

  // ================= P: parameter stability =================
  const P: Record<string, unknown> = {};
  const oat = vgtOatPoints(pools).filter((point) => point.feasible);
  const oatRows = oat.map((point) => {
    const row: Record<string, unknown> = {
      parameter: shortNames[point.key],
      key: point.key,
      offset: point.offset,
      frozen: point.frozen,
      value: point.value
    };
    const sf = take(ours, sKey(s.id, `oat:${point.key}:${point.offset}:fixed`));
    const sp = take(ours, sKey(s.id, `oat:${point.key}:${point.offset}:portfolio`));
    const sPath = pathChange(sFrozen.lots, sf.lotsBrief);

    Object.assign(row, {
      'S.net': sf.net,
      'S.retention': sf.net / S.fixed.net,
      'S.delta': sf.net - S.fixed.net,
      'S.lots': sf.lots,
      'S.preserved': sPath.preserved,
      'S.added': sPath.added.length,
      'S.removed': sPath.removed.length,
      'S.minuteDD': sf.minuteDD,
      'S.endEquity': sp.endEquity,
      'S.dailyPercent': sp.dailyPercent,
      'S.minutePercent': sp.minutePercent
    });

    for (const pool of pairedPools) {
      const pf = take(prior, priorKeys.oat(pool, point.key, point.offset, 'fixed'));
      const pp = take(prior, priorKeys.oat(pool, point.key, point.offset, 'portfolio'));
      const path = take(ours, `p:${pool}:oat:${point.key}:${point.offset}:fixed`).lotsBrief;
      const all = pathChange(poolFrozen[pool].lots, path);
      const vgt = pathChange(poolFrozen[pool].lots, path, (symbol) => symbol === 'VGT');
      const others = pathChange(poolFrozen[pool].lots, path, (symbol) => symbol !== 'VGT');
      const dVgt = (pf.bySymbol.VGT?.net ?? 0) - (poolFrozen[pool].fixed.bySymbol.VGT?.net ?? 0);

      Object.assign(row, {
        [`${pool}.net`]: pf.net,
        [`${pool}.retention`]: pf.net / poolFrozen[pool].fixed.net,
        [`${pool}.delta`]: pf.net - poolFrozen[pool].fixed.net,
        [`${pool}.deltaVgt`]: dVgt,
        [`${pool}.deltaOthers`]: pf.net - poolFrozen[pool].fixed.net - dVgt,
        [`${pool}.vgtLots`]: pf.bySymbol.VGT?.lots ?? 0,
        [`${pool}.preserved`]: all.preserved,
        [`${pool}.vgtPreserved`]: vgt.preserved,
        [`${pool}.othersAdded`]: others.added.length,
        [`${pool}.othersRemoved`]: others.removed.length,
        [`${pool}.minuteDD`]: pf.minuteDD,
        [`${pool}.endEquity`]: pp.endEquity,
        [`${pool}.dailyPercent`]: pp.dailyPercent,
        [`${pool}.minutePercent`]: pp.minutePercent
      });
    }

    return row;
  });

  P.oat = oatRows;
  await csv('P_oat', oatRows);

  // Designs.
  const designs: DesignStats[] = [];
  const sItems = (prefix: string, count: number, valuesOf?: (index: number) => Record<string, number>): Item[] =>
    Array.from({ length: count }, (_, index) => {
      const fixed = take(ours, sKey(s.id, `${prefix}:${two(index)}:fixed`));

      return {
        label: `${prefix}:${two(index)}`,
        fixed,
        portfolio: take(ours, sKey(s.id, `${prefix}:${two(index)}:portfolio`)),
        lots: fixed.lotsBrief,
        values: valuesOf?.(index)
      };
    });
  const oatItems = (which: 'S' | PoolId): Item[] =>
    oat.map((point) => {
      if (which === 'S') {
        const fixed = take(ours, sKey(s.id, `oat:${point.key}:${point.offset}:fixed`));

        return {
          label: `${point.key}:${point.offset}`,
          fixed,
          portfolio: take(ours, sKey(s.id, `oat:${point.key}:${point.offset}:portfolio`)),
          lots: fixed.lotsBrief
        };
      }

      return {
        label: `${point.key}:${point.offset}`,
        fixed: take(prior, priorKeys.oat(which, point.key, point.offset, 'fixed')),
        portfolio: take(prior, priorKeys.oat(which, point.key, point.offset, 'portfolio')),
        lots: take(ours, `p:${which}:oat:${point.key}:${point.offset}:fixed`).lotsBrief
      };
    });
  const pooledBookItems = (pool: PoolId, symbol: string): Item[] =>
    Array.from({ length: symbol === 'VGT' ? 32 : 32 }, (_, index) => ({
      label: `book:${pool}:${symbol}:${two(index)}`,
      fixed: take(prior, priorKeys.book(pool, symbol, index, 'fixed')),
      portfolio: take(prior, priorKeys.book(pool, symbol, index, 'portfolio')),
      lots: symbol === 'VGT' ? take(ours, `p:${pool}:book:VGT:${two(index)}:fixed`).lotsBrief : undefined
    }));
  const pooledJointItems = (pool: PoolId, seed: number): Item[] =>
    Array.from({ length: 64 }, (_, index) => ({
      label: `joint:${pool}:s${seed}:${two(index)}`,
      fixed: take(prior, priorKeys.joint(pool, seed, index, 'fixed')),
      portfolio: take(prior, priorKeys.joint(pool, seed, index, 'portfolio'))
    }));
  const stat = (label: string, items: Item[], frozen: Frozen) => {
    const result = designStats(label, items, frozen, c0.endEquity, regimeOf);

    designs.push(result);

    return result;
  };
  const pairedValues = Object.fromEntries(
    pairedPools.map((pool) => {
      const { dimensions, samples } = pairedDesign(pools, pool);

      return [
        pool,
        (index: number) => Object.fromEntries(dimensions.map((d, k) => [shortNames[d.key], samples[index]![k]!]))
      ];
    })
  ) as Record<PoolId, (index: number) => Record<string, number>>;

  const sOat = stat('S: OAT (32 VGT points)', oatItems('S'), sFrozen);
  const sPaired: Record<string, DesignStats> = {};
  const poolBook: Record<string, DesignStats> = {};
  const poolOat: Record<string, DesignStats> = {};

  for (const pool of pairedPools) {
    sPaired[pool] = stat(
      `S: matched 8-D, ${pool} VGT design (32)`,
      sItems(`paired:${pool}`, 32, pairedValues[pool]),
      sFrozen
    );
  }

  const sPairedAll = stat(
    'S: matched 8-D, both designs (64)',
    [...sItems('paired:B4', 32), ...sItems('paired:B5', 32)],
    sFrozen
  );
  const sJoint = jointSeeds.map((seed) =>
    stat(`S: joint 8-D, seed ${seed} (64)`, sItems(`joint:s${seed}`, 64), sFrozen)
  );
  stat('S: joint 8-D, both seeds (128)', [...sItems('joint:s1', 64), ...sItems('joint:s2', 64)], sFrozen);

  for (const pool of pairedPools) {
    poolOat[pool] = stat(`${pool}: OAT of the VGT book (32)`, oatItems(pool), poolFrozen[pool]);
    poolBook[pool] = stat(`${pool}: 8-D, VGT book only (32)`, pooledBookItems(pool, 'VGT'), poolFrozen[pool]);
  }

  for (const pool of pairedPools) {
    for (const symbol of pools[pool].books.map((book) => book.symbol).filter((symbol) => symbol !== 'VGT')) {
      stat(`${pool}: 8-D, ${symbol} book only (32; context)`, pooledBookItems(pool, symbol), poolFrozen[pool]);
    }
  }

  const poolJoint: Record<string, DesignStats[]> = {};

  for (const pool of pairedPools) {
    const dims = pool === 'B4' ? 32 : 40;

    poolJoint[pool] = jointSeeds.map((seed) =>
      stat(`${pool}: system-level joint ${dims}-D, seed ${seed} (64)`, pooledJointItems(pool, seed), poolFrozen[pool])
    );
  }

  P.designs = designs;
  await csv(
    'P_designs',
    designs.map((d) => ({
      design: d.label,
      n: d.n,
      medianNet: d.net.median,
      p10Net: d.net.p10,
      p90Net: d.net.p90,
      worstNet: d.net.min,
      medianRetention: d.retention.median,
      p10Retention: d.retention.p10,
      worstRetention: d.retention.min,
      p10Delta: d.delta.p10,
      shareProfitable: d.shareProfitable,
      shareHalf: d.shareHalf,
      shareAbove: d.shareAbove,
      frozenPercentile: d.frozenPercentile,
      medianMinuteDD: d.minuteDD.median,
      medianPreserved: d.preserved?.median ?? NaN,
      medianEndEquity: d.portfolio?.endEquity.median ?? NaN,
      medianDailyPercent: d.portfolio?.daily.median ?? NaN,
      maxDailyPercent: d.portfolio?.daily.max ?? NaN,
      shareDaily30: d.portfolio?.shareDaily30 ?? NaN,
      shareDaily35: d.portfolio?.shareDaily35 ?? NaN,
      medianMinutePercent: d.portfolio?.minute.median ?? NaN,
      shareMinute35: d.portfolio?.shareMinute35 ?? NaN
    }))
  );

  // The paired table: the same VGT vector standalone and inside its pool.
  const pairedRows: Record<string, unknown>[] = [];

  for (const pool of pairedPools) {
    for (let index = 0; index < 32; index++) {
      const sf = take(ours, sKey(s.id, `paired:${pool}:${two(index)}:fixed`));
      const sp = take(ours, sKey(s.id, `paired:${pool}:${two(index)}:portfolio`));
      const pf = take(prior, priorKeys.book(pool, 'VGT', index, 'fixed'));
      const pp = take(prior, priorKeys.book(pool, 'VGT', index, 'portfolio'));
      const path = take(ours, `p:${pool}:book:VGT:${two(index)}:fixed`).lotsBrief;
      const dVgt = (pf.bySymbol.VGT?.net ?? 0) - (poolFrozen[pool].fixed.bySymbol.VGT?.net ?? 0);
      const sPath = pathChange(sFrozen.lots, sf.lotsBrief);
      const pPath = pathChange(poolFrozen[pool].lots, path);
      const vgtFunded = path.filter((lot) => lot.symbol === 'VGT').map(lotIdentity);
      const sLots = new Set(sf.lotsBrief.map(lotIdentity));

      pairedRows.push({
        design: pool,
        sample: index,
        ...Object.fromEntries(Object.entries(pairedValues[pool](index)).map(([k, v]) => [`p.${k}`, v])),
        'S.net': sf.net,
        'S.retention': sf.net / S.fixed.net,
        'S.delta': sf.net - S.fixed.net,
        'S.lots': sf.lots,
        'S.preserved': sPath.preserved,
        'S.minuteDD': sf.minuteDD,
        'S.endEquity': sp.endEquity,
        'S.dailyPercent': sp.dailyPercent,
        'S.minutePercent': sp.minutePercent,
        'pool.net': pf.net,
        'pool.retention': pf.net / poolFrozen[pool].fixed.net,
        'pool.delta': pf.net - poolFrozen[pool].fixed.net,
        'pool.deltaVgt': dVgt,
        'pool.deltaOthers': pf.net - poolFrozen[pool].fixed.net - dVgt,
        'pool.vgtLots': pf.bySymbol.VGT?.lots ?? 0,
        'pool.vgtFundedOfStandalone': vgtFunded.filter((id) => sLots.has(id)).length,
        'pool.preserved': pPath.preserved,
        // Supplementary (amendment A1, not predeclared, not in the (b) tally): the VGT book's own funded lots only, and
        // entry-session preservation (same symbol and entry date, whatever the exit).
        'pool.vgtPreserved': pathChange(poolFrozen[pool].lots, path, (symbol) => symbol === 'VGT').preserved,
        'S.entryPreserved': entryPreserved(sFrozen.lots, sf.lotsBrief),
        'pool.vgtEntryPreserved': entryPreserved(
          poolFrozen[pool].lots.filter((lot) => lot.symbol === 'VGT'),
          path.filter((lot) => lot.symbol === 'VGT')
        ),
        'pool.minuteDD': pf.minuteDD,
        'pool.endEquity': pp.endEquity,
        'pool.dailyPercent': pp.dailyPercent,
        'pool.minutePercent': pp.minutePercent,
        'S.minus.pool.retention': sf.net / S.fixed.net - pf.net / poolFrozen[pool].fixed.net
      });
    }
  }

  P.paired = pairedRows;
  await csv('P_paired', pairedRows);

  // Paired summary: within-pair differences, and the share of the pool's own VGT funded lots that are standalone lots.
  P.pairedSummary = Object.fromEntries(
    pairedPools.map((pool) => {
      const rows = pairedRows.filter((row) => row.design === pool);
      const n = (key: string) => rows.map((row) => row[key] as number);

      return [
        pool,
        {
          retentionDifference: dist(n('S.minus.pool.retention')),
          shareSRetentionHigher: share(n('S.minus.pool.retention').map((value) => value > 0)),
          deltaVgt: dist(n('pool.deltaVgt')),
          deltaOthers: dist(n('pool.deltaOthers')),
          shareOthersLose: share(n('pool.deltaOthers').map((value) => value < 0)),
          vgtLots: dist(n('pool.vgtLots')),
          vgtFundedAreStandaloneLots: share(
            rows.map((row) => (row['pool.vgtFundedOfStandalone'] as number) === (row['pool.vgtLots'] as number))
          ),
          correlationOfDeltas: correlation(n('S.delta'), n('pool.delta')),
          supplementary: {
            note: 'amendment A1: post hoc, descriptive, not part of the predeclared (b) tally',
            sPreserved: dist(n('S.preserved')),
            poolVgtPreserved: dist(n('pool.vgtPreserved')),
            sEntryPreserved: dist(n('S.entryPreserved')),
            poolVgtEntryPreserved: dist(n('pool.vgtEntryPreserved'))
          }
        }
      ];
    })
  );

  // The joint samples (with their parameter values).
  const jointRows: Record<string, unknown>[] = [];

  for (const seed of jointSeeds) {
    const { dimensions, samples } = jointDesign(s, seed);

    for (let index = 0; index < 64; index++) {
      const sf = take(ours, sKey(s.id, `joint:s${seed}:${two(index)}:fixed`));
      const sp = take(ours, sKey(s.id, `joint:s${seed}:${two(index)}:portfolio`));
      const vgt = sf.meta;

      jointRows.push({
        seed,
        sample: index,
        ...Object.fromEntries(dimensions.map((d, k) => [`p.${shortNames[d.key]}`, samples[index]![k]!])),
        specHash: sf.specHash,
        net: sf.net,
        retention: sf.net / S.fixed.net,
        lots: sf.lots,
        preserved: pathChange(sFrozen.lots, sf.lotsBrief).preserved,
        minuteDD: sf.minuteDD,
        worstLot: sf.worstLot,
        endEquity: sp.endEquity,
        dailyPercent: sp.dailyPercent,
        minutePercent: sp.minutePercent,
        design: String(vgt.design)
      });
    }
  }

  await csv('P_joint_samples', jointRows);

  // ---------- (b) matched comparison items ----------
  const sC1 = take(ours, sKey(s.id, 'cost:C1:fixed'));
  const items = (pool: PoolId) => {
    const sp = sPaired[pool]!;
    const pb = poolBook[pool]!;
    const pC1 = take(prior, priorKeys.scenario(pool, 'C1', 'fixed'));
    const rows = [
      {
        id: 'b1',
        label: 'paired 8-D median retention',
        s: sp.retention.median,
        p: pb.retention.median,
        higher: true,
        tie: flags.retentionTie
      },
      {
        id: 'b2',
        label: 'paired 8-D P10 retention',
        s: sp.retention.p10,
        p: pb.retention.p10,
        higher: true,
        tie: flags.retentionTie
      },
      {
        id: 'b3',
        label: 'paired 8-D worst retention',
        s: sp.retention.min,
        p: pb.retention.min,
        higher: true,
        tie: flags.retentionTie
      },
      {
        id: 'b4',
        label: 'OAT worst retention (32 VGT points)',
        s: sOat.retention.min,
        p: poolOat[pool]!.retention.min,
        higher: true,
        tie: flags.retentionTie
      },
      {
        id: 'b5',
        label: 'paired 8-D P10 of Δ$ vs own frozen',
        s: sp.delta.p10,
        p: pb.delta.p10,
        higher: true,
        tie: 2500
      },
      {
        id: 'b6',
        label: 'paired 8-D median lot-path preservation',
        s: sp.preserved!.median,
        p: pb.preserved!.median,
        higher: true,
        tie: flags.retentionTie
      },
      {
        id: 'b7',
        label: 'C1 fixed net ÷ base fixed net',
        s: sC1.net / S.fixed.net,
        p: pC1.net / poolFrozen[pool].fixed.net,
        higher: true,
        tie: flags.retentionTie
      },
      {
        id: 'b8',
        label: 'paired 8-D median portfolio daily % DD − own frozen',
        s: sp.portfolio!.dailyShift,
        p: pb.portfolio!.dailyShift,
        higher: false,
        tie: flags.drawdownTie
      }
    ].map((row) => ({ ...row, outcome: itemOutcome(row) }));
    const { sBetter, pBetter, verdict } = tallyOf(rows);

    // Sensitivity (amendment A1): the verdict with b6 left out (b6 compares the whole pool's lots, diluted by the
    // unperturbed books). The predeclared verdict above stays the reported one.
    const without = rows.filter((row) => row.id !== 'b6');
    const sWithout = without.filter((row) => row.outcome === 'S better').length;
    const pWithout = without.filter((row) => row.outcome === 'pool better').length;

    return {
      pool,
      rows,
      sBetter,
      pBetter,
      ties: rows.length - sBetter - pBetter,
      verdict,
      withoutB6: { sBetter: sWithout, pBetter: pWithout, ties: without.length - sWithout - pWithout }
    };
  };

  P.matched = { B5: items('B5'), B4: items('B4') };
  out.P = P;

  // ================= E: execution paths =================
  const E: Record<string, unknown> = {};
  const sDetail = await readDetail(sKey(s.id, 'cost:base:fixed'));
  const sPortfolioDetail = await readDetail(sKey(s.id, 'cost:base:portfolio'));
  const priorDetail = Object.fromEntries(
    await Promise.all(
      pairedPools.map(async (pool) => [
        pool,
        {
          fixed: await readPriorDetail(priorKeys.scenario(pool, 'base', 'fixed')),
          portfolio: await readPriorDetail(priorKeys.scenario(pool, 'base', 'portfolio'))
        }
      ])
    )
  ) as Record<
    PoolId,
    { fixed: Awaited<ReturnType<typeof readPriorDetail>>; portfolio: Awaited<ReturnType<typeof readPriorDetail>> }
  >;
  const c0Detail = await readPriorDetail(priorKeys.control);
  const frozenPathRows = sDetail.lots.map((lot, index) => {
    const row: Record<string, unknown> = {
      lot: index + 1,
      entry: newYork(lot.entryTime),
      exit: newYork(lot.exitTime),
      exitReason: lot.exitReason,
      net: lot.net
    };

    for (const pool of pairedPools) {
      const poolLots = poolFrozen[pool].lots;
      const funded = poolLots.find((other) => other.symbol === 'VGT' && other.decisionTime === lot.decisionTime);
      const holder = funded
        ? undefined
        : poolLots.find(
            (other) =>
              other.decisionTime <= lot.decisionTime &&
              (!Number.isFinite(other.exitTime) || other.exitTime >= lot.decisionTime)
          );

      row[`${pool}.funded`] = funded ? 'yes' : 'no';
      row[`${pool}.holder`] = funded
        ? ''
        : holder
          ? `${holder.symbol} ${holder.entryDate}→${holder.exitDate}`
          : 'none found';
      row[`${pool}.holderNet`] = holder ? holder.net : NaN;
    }

    return row;
  });

  E.frozenPaths = frozenPathRows;

  // The prior base runs' refusals by holder (read-only).
  const refusals = Object.fromEntries(
    await Promise.all(
      pairedPools.map(async (pool) => [
        pool,
        (await fs.readJson(`${priorRoot}/results/detail/cost_${pool}_base_fixed/refusals.json`)) as {
          symbol: string;
          holder: string;
          count: number;
        }[]
      ])
    )
  ) as Record<PoolId, { symbol: string; holder: string; count: number }[]>;
  const blocked = Object.fromEntries(
    pairedPools.map((pool) => {
      const rows = frozenPathRows.filter((row) => row[`${pool}.funded`] === 'no');
      const holders = new Map<string, number>();

      for (const row of rows) {
        holders.set(String(row[`${pool}.holder`]), row[`${pool}.holderNet`] as number);
      }

      return [
        pool,
        {
          blocked: rows.length,
          blockedNet: sum(rows.map((row) => row.net as number)),
          fundedNet: sum(
            frozenPathRows.filter((row) => row[`${pool}.funded`] === 'yes').map((row) => row.net as number)
          ),
          holderLots: holders.size,
          holderNet: sum([...holders.values()].filter(Number.isFinite)),
          poolVgtNet: poolFrozen[pool].fixed.bySymbol.VGT?.net ?? 0,
          poolVgtLots: poolFrozen[pool].fixed.bySymbol.VGT?.lots ?? 0,
          refusals: refusals[pool]
        }
      ];
    })
  );

  E.blocked = blocked;
  await csv('E_frozen_paths', frozenPathRows);

  // Predeclared traced examples.
  const traced = (
    ['targetPercentChange:-m', 'targetPercentChange:+m', 'maximumHoldDays:-m', 'pullback:+m'] as const
  ).map((id) => {
    const [key, offset] = id.split(':') as [string, string];
    const sRun = take(ours, sKey(s.id, `oat:${key}:${offset}:fixed`));
    const sPath = pathChange(sFrozen.lots, sRun.lotsBrief);
    const point = oat.find((item) => item.key === key && item.offset === offset)!;
    const describe = (lots: Brief[]) =>
      lots.map(
        (lot) => `${lot.symbol} ${lot.entryDate}→${lot.exitDate || 'open'} ${lot.exitReason} ${Math.round(lot.net)}`
      );
    const result: Record<string, unknown> = {
      id,
      parameter: shortNames[key as never],
      value: point.value,
      S: {
        net: sRun.net,
        delta: sRun.net - S.fixed.net,
        removed: describe(sPath.removed),
        added: describe(sPath.added),
        exitChanged: sPath.exitChanged
      }
    };

    for (const pool of pairedPools) {
      const pRun = take(ours, `p:${pool}:oat:${key}:${offset}:fixed`);
      const vgt = pathChange(poolFrozen[pool].lots, pRun.lotsBrief, (symbol) => symbol === 'VGT');
      const others = pathChange(poolFrozen[pool].lots, pRun.lotsBrief, (symbol) => symbol !== 'VGT');
      const dVgt = (pRun.bySymbol.VGT?.net ?? 0) - (poolFrozen[pool].fixed.bySymbol.VGT?.net ?? 0);

      result[pool] = {
        net: pRun.net,
        delta: pRun.net - poolFrozen[pool].fixed.net,
        deltaVgt: dVgt,
        deltaOthers: pRun.net - poolFrozen[pool].fixed.net - dVgt,
        vgtRemoved: describe(vgt.removed),
        vgtAdded: describe(vgt.added),
        othersRemoved: describe(others.removed),
        othersAdded: describe(others.added)
      };
    }

    return result;
  });

  E.traced = traced;
  await csv(
    'E_traced',
    traced.flatMap((example) =>
      (['S', ...pairedPools] as const).map((who) => ({
        example: example.id,
        structure: who,
        ...flatten(example[who] as Record<string, unknown>)
      }))
    )
  );
  out.E = E;

  // ================= T: trades, years, regimes =================
  const T: Record<string, unknown> = {};
  const excursions = new Map(sDetail.lots.map((lot) => [lot.id, excursionOf(universe, lot)]));
  let cumulative = 0;
  const ledger = (lots: LotRecord[], mode: Mode) => {
    let running = 0;

    return lots.map((lot) => {
      running += lot.net;
      const excursion = excursionOf(universe, lot);

      return {
        strategy: `D1 standalone ${s.id}`,
        mode,
        symbol: lot.symbol,
        entryTime: newYork(lot.entryTime),
        exitTime: lot.exitIndex >= 0 ? newYork(lot.exitTime) : 'open',
        entryFill: lot.entryRawPrice,
        exitFill: lot.exitRawPrice,
        shares: lot.shares,
        principal: lot.principal,
        exitReason: lot.exitReason,
        gross: lot.gross,
        interest: lot.interest,
        friction: lot.friction,
        net: lot.net,
        cumulativeNet: running,
        maePercent: excursion.maePercent,
        mfePercent: excursion.mfePercent,
        maeDollars: excursion.maeDollars,
        mfeDollars: excursion.mfeDollars,
        worstMark: lot.worstMark,
        holdingSessions: lot.exitIndex - lot.entryIndex,
        lotDays: lot.lotDays,
        dividends: lot.dividends
      };
    });
  };
  const fixedLedger = ledger(sDetail.lots, 'fixed');

  await csv(`T_trades_${s.id}_fixed`, fixedLedger);
  await csv(`T_trades_${s.id}_portfolio`, ledger(sPortfolioDetail.lots, 'portfolio'));
  await fs.outputFile(resultDir(`T_trades_${s.id}_fixed.json`), `${JSON.stringify(fixedLedger, null, 1)}\n`);
  cumulative = fixedLedger.at(-1)?.cumulativeNet ?? 0;

  const sTrades = tradeStats(sDetail.lots);
  const poolTrades = Object.fromEntries(pairedPools.map((pool) => [pool, tradeStats(priorDetail[pool].fixed.lots)]));
  const maeValues = [...excursions.values()];

  T.trades = {
    S: {
      ...sTrades,
      cumulative,
      mae: dist(maeValues.map((e) => e.maePercent)),
      mfe: dist(maeValues.map((e) => e.mfePercent)),
      worstMae: Math.min(...maeValues.map((e) => e.maePercent)),
      worstMaeDollars: Math.min(...maeValues.map((e) => e.maeDollars)),
      worstMark: Math.min(...sDetail.lots.map((lot) => lot.worstMark))
    },
    B4: poolTrades.B4,
    B5: poolTrades.B5,
    poolVgtBook: Object.fromEntries(
      pairedPools.map((pool) => [pool, tradeStats(priorDetail[pool].fixed.lots.filter((lot) => lot.symbol === 'VGT'))])
    )
  };

  // Years (fixed marked-to-market and portfolio equity).
  const valueAt = (
    daily: DailyRecord[],
    index: number,
    field: 'strategyMark' | 'equity' | 'cumulativeInterest',
    start: number
  ) => (index === 0 ? start : daily[index - 1]![field]);
  const years = [...new Set(dates.map(yearOf))];
  const lastIndexOfYear = (year: string) =>
    dates.reduce((last, date, index) => (yearOf(date) === year ? index : last), -1);
  const series = {
    S: { fixed: sDetail.daily, portfolio: sPortfolioDetail.daily, lots: sDetail.lots },
    B4: {
      fixed: priorDetail.B4.fixed.daily,
      portfolio: priorDetail.B4.portfolio.daily,
      lots: priorDetail.B4.fixed.lots
    },
    B5: {
      fixed: priorDetail.B5.fixed.daily,
      portfolio: priorDetail.B5.portfolio.daily,
      lots: priorDetail.B5.fixed.lots
    }
  };
  const yearRows = years.map((year) => {
    const to = lastIndexOfYear(year);
    const from = year === years[0] ? 0 : lastIndexOfYear(String(Number(year) - 1));
    const row: Record<string, unknown> = {
      year,
      note:
        year === '2016'
          ? 'no trading (arming 2017-06-15)'
          : year === '2017'
            ? 'partial eligibility'
            : year === '2026'
              ? 'partial: to 2026-10-13'
              : ''
    };

    for (const [who, data] of Object.entries(series)) {
      row[`${who}.fixed`] =
        valueAt(data.fixed, to, 'strategyMark', 0) -
        (year === years[0] ? 0 : valueAt(data.fixed, from, 'strategyMark', 0));
      row[`${who}.lotsEntered`] = data.lots.filter((lot) => yearOf(lot.entryDate) === year).length;
      row[`${who}.portfolioReturn`] =
        valueAt(data.portfolio, to, 'equity', base.initialEquity) /
          (year === years[0] ? base.initialEquity : valueAt(data.portfolio, from, 'equity', base.initialEquity)) -
        1;
    }

    row['C0.portfolioReturn'] =
      valueAt(c0Detail.daily, to, 'equity', base.initialEquity) /
        (year === years[0] ? base.initialEquity : valueAt(c0Detail.daily, from, 'equity', base.initialEquity)) -
      1;

    return row;
  });
  const yearSummary = (who: 'S' | 'B4' | 'B5', total: number) => {
    const changes = yearRows.map((row) => ({ year: row.year as string, change: row[`${who}.fixed`] as number }));
    const sorted = [...changes].sort((a, b) => b.change - a.change);
    // The worst year among eligible years with activity (2016 cannot trade; a year with no lot and no mark change says
    // nothing).
    const active = changes.filter(
      (row) =>
        Number(row.year) >= 2017 &&
        (row.change !== 0 || (yearRows.find((y) => y.year === row.year)![`${who}.lotsEntered`] as number) > 0)
    );
    const worst = [...active].sort((a, b) => a.change - b.change)[0]!;

    return {
      top1: { year: sorted[0]!.year, change: sorted[0]!.change, share: sorted[0]!.change / total },
      top2: { years: [sorted[0]!.year, sorted[1]!.year], share: (sorted[0]!.change + sorted[1]!.change) / total },
      worst,
      negativeYears: changes.filter((row) => row.change < 0).map((row) => row.year),
      noEntryYears: yearRows
        .filter((row) => Number(row.year) >= 2017 && (row[`${who}.lotsEntered`] as number) === 0)
        .map((row) => row.year as string),
      named: Object.fromEntries(
        ['2020', '2022', '2023', '2025', '2026'].map((year) => {
          const change = changes.find((row) => row.year === year)!.change;

          return [year, { change, share: change / total, leaveOut: total - change }];
        })
      ),
      leaveOneOut: Object.fromEntries(changes.map((row) => [row.year, total - row.change]))
    };
  };

  T.years = {
    rows: yearRows,
    S: yearSummary('S', S.fixed.net),
    B4: yearSummary('B4', poolFrozen.B4.fixed.net),
    B5: yearSummary('B5', poolFrozen.B5.fixed.net)
  };
  await csv('T_years', yearRows);

  // Regimes.
  const regimeRows = regimeWindows.map((window) => {
    const from = indexOfDate(window.from);
    const to = indexOfDate(window.to);
    const row: Record<string, unknown> = {
      id: window.id,
      label: window.label,
      kind: window.kind,
      from: window.from,
      to: window.to
    };

    for (const [who, data] of Object.entries(series)) {
      const entered = data.lots.filter((lot) => lot.entryIndex > from && lot.entryIndex <= to);

      row[`${who}.fixedChange`] =
        valueAt(data.fixed, to, 'strategyMark', 0) - valueAt(data.fixed, from, 'strategyMark', 0);
      row[`${who}.interest`] =
        valueAt(data.fixed, to, 'cumulativeInterest', 0) - valueAt(data.fixed, from, 'cumulativeInterest', 0);
      row[`${who}.lotsEntered`] = entered.length;
      row[`${who}.portfolioReturn`] =
        valueAt(data.portfolio, to, 'equity', base.initialEquity) /
          valueAt(data.portfolio, from, 'equity', base.initialEquity) -
        1;

      if (who === 'S') {
        row['S.worstMaePercent'] = entered.length
          ? Math.min(...entered.map((lot) => excursions.get(lot.id)!.maePercent))
          : NaN;
      }
    }

    row['C0.portfolioReturn'] =
      valueAt(c0Detail.daily, to, 'equity', base.initialEquity) /
        valueAt(c0Detail.daily, from, 'equity', base.initialEquity) -
      1;

    for (const who of ['S', 'B4', 'B5']) {
      row[`${who}.portfolioExcessOverC0`] =
        (row[`${who}.portfolioReturn`] as number) - (row['C0.portfolioReturn'] as number);
    }

    return row;
  });
  const regimeIds = [...new Set(regimeWindows.filter((w) => w.regime).map((w) => w.regime!))];

  T.regimes = {
    rows: regimeRows,
    byRegime: regimeIds.map((regime) => {
      const rows = regimeRows.filter((row) => regimeWindows.find((w) => w.id === row.id)?.regime === regime);

      return Object.fromEntries([
        ['regime', regime],
        ...(['S', 'B4', 'B5'] as const).map((who) => [
          `${who}.fixedChange`,
          sum(rows.map((row) => row[`${who}.fixedChange`] as number))
        ])
      ]);
    })
  };
  T.regimes = {
    ...(T.regimes as object),
    largestRegimeShare: Object.fromEntries(
      (['S', 'B4', 'B5'] as const).map((who) => {
        const totals = (T.regimes as { byRegime: Record<string, number>[] }).byRegime.map(
          (row) => row[`${who}.fixedChange`]!
        );
        const total = who === 'S' ? S.fixed.net : poolFrozen[who].fixed.net;

        return [who, Math.max(...totals) / total];
      })
    )
  };
  await csv('T_regimes', regimeRows);

  // Pool context: the VGT book's funded net and the prior leave-one-book-out.
  T.poolContext = Object.fromEntries(
    pairedPools.map((pool) => {
      const ablFixed = take(prior, priorKeys.ablation(pool, 'VGT', 'fixed'));
      const ablPortfolio = take(prior, priorKeys.ablation(pool, 'VGT', 'portfolio'));

      return [
        pool,
        {
          vgtFundedLots: poolFrozen[pool].fixed.bySymbol.VGT?.lots ?? 0,
          vgtFundedNet: poolFrozen[pool].fixed.bySymbol.VGT?.net ?? 0,
          vgtShareOfPoolNet: (poolFrozen[pool].fixed.bySymbol.VGT?.net ?? 0) / poolFrozen[pool].fixed.net,
          withoutVgtFixedNet: ablFixed.net,
          vgtFixedIncrement: poolFrozen[pool].fixed.net - ablFixed.net,
          withoutVgtEndEquity: ablPortfolio.endEquity,
          vgtPortfolioIncrement: poolFrozen[pool].portfolio.endEquity - ablPortfolio.endEquity,
          withoutVgtDailyPercent: ablPortfolio.dailyPercent,
          withoutVgtLots: ablFixed.lots,
          withoutVgtBySymbol: ablFixed.bySymbol
        }
      ];
    })
  );

  // Bootstrap (paired, in-sample only).
  const eligibility = universe.eligibilityIndex;
  const changes = (daily: DailyRecord[]) =>
    daily
      .map((row, i) => ({ index: row.index, change: row.strategyMark - (i === 0 ? 0 : daily[i - 1]!.strategyMark) }))
      .filter((row) => row.index >= eligibility)
      .map((row) => row.change);
  const sChanges = changes(sDetail.daily);
  const b4Changes = changes(priorDetail.B4.fixed.daily);
  const b5Changes = changes(priorDetail.B5.fixed.daily);

  if (
    sChanges.length !== dates.length - eligibility ||
    b4Changes.length !== sChanges.length ||
    b5Changes.length !== sChanges.length
  ) {
    throw new Error(`the bootstrap series hold ${sChanges.length} sessions, not ${dates.length - eligibility}`);
  }

  const b4MinusS = b4Changes.map((value, index) => value - sChanges[index]!);
  const b5MinusS = b5Changes.map((value, index) => value - sChanges[index]!);
  const boot = stationaryBootstrap(
    [sChanges, b4Changes, b5Changes, b4MinusS, b5MinusS],
    21,
    5000,
    new Rng(deriveSeed(studyLabel, 'bootstrap'))
  );
  const bootSummary = (values: number[], actual: number) => ({
    actual,
    median: median(values),
    p05: quantile(values, 0.05),
    p25: quantile(values, 0.25),
    p75: quantile(values, 0.75),
    p95: quantile(values, 0.95),
    shareNonPositive: share(values.map((value) => value <= 0))
  });

  T.bootstrap = {
    sessions: sChanges.length,
    blockLength: 21,
    resamples: 5000,
    S: bootSummary(boot[0]!, sum(sChanges)),
    B4: bootSummary(boot[1]!, sum(b4Changes)),
    B5: bootSummary(boot[2]!, sum(b5Changes)),
    'B4-S': bootSummary(boot[3]!, sum(b4MinusS)),
    'B5-S': bootSummary(boot[4]!, sum(b5MinusS))
  };
  out.T = T;

  // ================= C: costs =================
  const C: Record<string, unknown> = {};
  const costRows: Record<string, unknown>[] = [];
  const baseLots: Record<string, LotRecord[]> = {
    S: sDetail.lots,
    B4: priorDetail.B4.fixed.lots,
    B5: priorDetail.B5.fixed.lots
  };

  for (const scenario of costScenarios) {
    for (const who of ['S', 'B4', 'B5'] as const) {
      const fixed =
        who === 'S'
          ? take(ours, sKey(s.id, `cost:${scenario.id}:fixed`))
          : take(prior, priorKeys.scenario(who, scenario.id, 'fixed'));
      const portfolio =
        who === 'S'
          ? take(ours, sKey(s.id, `cost:${scenario.id}:portfolio`))
          : take(prior, priorKeys.scenario(who, scenario.id, 'portfolio'));
      const frozen = who === 'S' ? S : poolFrozen[who];
      const path = pathChange(frozen.fixed.lotsBrief, fixed.lotsBrief);
      const recost = sum(baseLots[who]!.map((lot) => recostLot(lot, scenario)));

      costRows.push({
        scenario: scenario.id,
        label: scenario.label,
        group: scenario.group,
        structure: who,
        rate: scenario.rate,
        costBps: scenario.costBps,
        stopSlippageBps: scenario.stopSlippageBps,
        stopFill: scenario.stopFill,
        fixedNet: fixed.net,
        fixedChange: fixed.net / frozen.fixed.net - 1,
        lots: fixed.lots,
        lotsAdded: path.added.length,
        lotsRemoved: path.removed.length,
        exitChanged: path.exitChanged,
        sameTradeRecost: recost,
        pathEffect: fixed.net - recost,
        minuteDD: fixed.minuteDD,
        netPerMinuteDD: fixed.net / fixed.minuteDD,
        netPerMinuteDDChange: fixed.net / fixed.minuteDD / (frozen.fixed.net / frozen.fixed.minuteDD) - 1,
        interest: fixed.interest,
        friction: fixed.friction,
        endEquity: portfolio.endEquity,
        incremental: portfolio.endEquity - c0.endEquity,
        dailyPercent: portfolio.dailyPercent,
        minutePercent: portfolio.minutePercent
      });
    }
  }

  C.rows = costRows;
  await csv('C_costs', costRows);
  out.C = C;

  // ================= R: portfolio risk and capital efficiency =================
  const R: Record<string, unknown> = {};
  const portfolioOf = (who: string, m: M, daily: DailyRecord[]) => {
    const values = daily.map((row) => row.equity);
    const episodes = episodesOf(dates.slice(1), values, base.initialEquity, dates[0]!)
      .sort((a, b) => b.depthPercent - a.depthPercent)
      .slice(0, 5);

    return {
      who,
      endEquity: m.endEquity,
      totalReturn: m.totalReturn,
      cagr: m.cagr,
      incremental: m.endEquity - c0.endEquity,
      incrementalCagr: m.cagr - c0.cagr,
      dailyPercent: m.dailyPercent,
      dailyPercentDollars: m.dailyPercentDollars,
      dailyPercentPeak: isoDate(m.dailyPercentPeak),
      dailyPercentTrough: isoDate(m.dailyPercentTrough),
      dailyPercentRecovery: isoDate(m.dailyPercentRecovery),
      minutePercent: m.minutePercent,
      minutePercentDollars: m.minutePercentDollars,
      minutePercentPeak: isoDate(m.minutePercentPeak),
      minutePercentTrough: isoDate(m.minutePercentTrough),
      dailyDollarDD: m.dailyDD,
      minuteDollarDD: m.minuteDD,
      incrementalDaily: m.dailyPercent - c0.dailyPercent,
      incrementalMinute: m.minutePercent - c0.minutePercent,
      lots: m.lots,
      strategyNet: m.net,
      interest: m.interest,
      maxPrincipal: m.maxPrincipal,
      maxDebtToEquity: m.maxDebtToEquity,
      timeFunded: m.sessionsEligible ? m.sessionsHeld / m.sessionsEligible : 0,
      borrowingDollarDays: m.borrowingDollarDays,
      incrementalPerMillionDollarDays:
        m.borrowingDollarDays > 0 ? ((m.endEquity - c0.endEquity) / m.borrowingDollarDays) * 1e6 : NaN,
      incrementalCagrPerDailyPoint: m.dailyPercent > 0 ? (m.cagr - c0.cagr) / (m.dailyPercent * 100) : NaN,
      cagrPerDailyDD: m.dailyPercent > 0 ? m.cagr / m.dailyPercent : NaN,
      minimum: m.minimum,
      episodes
    };
  };
  const portfolioRows = [
    portfolioOf('S', S.portfolio, sPortfolioDetail.daily),
    portfolioOf('B4', poolFrozen.B4.portfolio, priorDetail.B4.portfolio.daily),
    portfolioOf('B5', poolFrozen.B5.portfolio, priorDetail.B5.portfolio.daily),
    portfolioOf('C0', c0, c0Detail.daily)
  ];
  const fixedEfficiency = Object.fromEntries(
    [['S', S.fixed], ...pairedPools.map((pool) => [pool, poolFrozen[pool].fixed] as const)].map(([who, m]) => [
      who,
      {
        net: (m as M).net,
        lots: (m as M).lots,
        lotDays: (m as M).lotDays,
        exposure: (m as M).sessionsHeld / (m as M).sessionsEligible,
        borrowingDollarDays: (m as M).borrowingDollarDays,
        netPerMillionDollarDays: ((m as M).net / (m as M).borrowingDollarDays) * 1e6,
        netPerLot: (m as M).net / (m as M).lots,
        minuteDD: (m as M).minuteDD,
        dailyDD: (m as M).dailyDD,
        netPerMinuteDD: (m as M).net / (m as M).minuteDD,
        worstLot: (m as M).worstLot,
        bestLot: (m as M).bestLot,
        profitFactor: (m as M).profitFactor,
        signals: (m as M).signals,
        refused: (m as M).refused,
        virtualTrades: (m as M).virtualTrades
      }
    ])
  );

  R.portfolio = portfolioRows;
  R.fixed = fixedEfficiency;
  R.sStress = ['C1', 'C2', 'C3'].map((id) => {
    const m = take(ours, sKey(s.id, `cost:${id}:portfolio`));

    return {
      scenario: id,
      endEquity: m.endEquity,
      incremental: m.endEquity - c0.endEquity,
      dailyPercent: m.dailyPercent,
      minutePercent: m.minutePercent
    };
  });

  const symmetric = take(ours, sKey(s.id, 'dividends:symmetric:portfolio'));

  R.sSymmetric = {
    endEquity: symmetric.endEquity,
    incremental: symmetric.endEquity - c0.endEquity,
    dailyPercent: symmetric.dailyPercent,
    minutePercent: symmetric.minutePercent,
    lotDividends: S.portfolio.lotDividends
  };

  // VGT duplication: the base portfolio runs re-executed (checked equal to their stored records).
  const duplication: Record<string, unknown> = {};
  const reruns: [string, ReturnType<typeof asPriorSpec>, M][] = [
    ['S', asPriorSpec(standaloneBaseRun(s, 'portfolio')), S.portfolio],
    ['B4', baseRun(pools.B4, 'portfolio'), poolFrozen.B4.portfolio],
    ['B5', baseRun(pools.B5, 'portfolio'), poolFrozen.B5.portfolio],
    ['C0', controlRun(), c0]
  ];

  for (const [who, spec, stored] of reruns) {
    const result = runSpec(universe, spec);
    const metrics = metricsOf(result, spec);

    if (stripped(metrics as M) !== stripped(stored)) {
      throw new Error(`${who}: the re-executed base portfolio differs from its stored record`);
    }

    const rows = result.daily.map((row) => {
      const close = row.closes.VGT ?? 0;
      const core = row.vgtCoreShares * close;
      const lot = (row.lotShares.VGT ?? 0) * close;

      return { core, lot, lmv: row.lmv, equity: row.equity, open: row.openLots > 0 };
    });
    const shareOf = (row: (typeof rows)[number]) => (row.core + row.lot) / row.lmv;
    const withLot = rows.filter((row) => row.lot > 0);

    duplication[who] = {
      meanVgtShareOfLmv: sum(rows.map(shareOf)) / rows.length,
      maxVgtShareOfLmv: Math.max(...rows.map(shareOf)),
      meanVgtShareWhileVgtLotOpen: withLot.length ? sum(withLot.map(shareOf)) / withLot.length : NaN,
      maxVgtExposureToEquity: Math.max(...rows.map((row) => (row.core + row.lot) / row.equity)),
      sessionsWithVgtLot: withLot.length,
      maxVgtLotToEquity: Math.max(0, ...rows.map((row) => row.lot / row.equity))
    };
  }

  R.duplication = duplication;
  await csv(
    'R_portfolio',
    portfolioRows.map((row) => ({
      ...Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'minimum' && key !== 'episodes')),
      ...Object.fromEntries(schedules.map((schedule) => [`min.${schedule}`, row.minimum[schedule]?.ratio]))
    }))
  );
  await csv(
    'R_episodes',
    portfolioRows.flatMap((row) => row.episodes.map((episode, rank) => ({ who: row.who, rank: rank + 1, ...episode })))
  );
  out.R = R;

  // ================= flags =================
  const flagsOf = (who: 'S' | PoolId) => {
    const fixed = who === 'S' ? S.fixed : poolFrozen[who].fixed;
    const trades = who === 'S' ? sTrades : poolTrades[who]!;
    const yearsOf = (T.years as Record<string, ReturnType<typeof yearSummary>>)[who]!;
    const cost = (id: string) => costRows.find((row) => row.scenario === id && row.structure === who)!;
    const port = portfolioRows.find((row) => row.who === who)!;
    const riskRuns = priorGates.riskScenarios.map((id) => cost(id));
    const maxDaily = Math.max(...riskRuns.map((row) => row.dailyPercent as number));
    const maxMinute = Math.max(...riskRuns.map((row) => row.minutePercent as number));
    const matchedDesigns = who === 'S' ? [sPairedAll, sJoint[0]!] : [poolBook[who]!];
    const systemDesigns = who === 'S' ? [] : [poolJoint[who]![0]!];
    const w4 = (d: DesignStats) =>
      d.shareProfitable < flags.stabilityProfitableShare || d.retention.median < flags.stabilityMedianRatio;
    const w7 = (d: DesignStats) => (d.portfolio?.daily.median ?? 0) > flags.neighbourhoodDrawdown;

    return {
      W1: {
        raised: yearsOf.top1.share > flags.concentrationShare || trades.top3 > flags.concentrationShare,
        topYear: yearsOf.top1,
        top3: trades.top3
      },
      W2: { raised: fixed.lots < flags.lowLotCount, lots: fixed.lots, noEntryYears: yearsOf.noEntryYears },
      W3: {
        raised:
          priorGates.moderateCostScenarios.some(
            (id) => (cost(id).fixedNet as number) <= 0 || (cost(id).incremental as number) <= 0
          ) ||
          -(cost('C1').fixedChange as number) > priorGates.costFallShare ||
          -(cost('C1').netPerMinuteDDChange as number) > priorGates.costFallShare,
        c1Change: cost('C1').fixedChange,
        c1NetPerDDChange: cost('C1').netPerMinuteDDChange,
        minModerateNet: Math.min(...priorGates.moderateCostScenarios.map((id) => cost(id).fixedNet as number)),
        minModerateIncremental: Math.min(
          ...priorGates.moderateCostScenarios.map((id) => cost(id).incremental as number)
        )
      },
      W4: {
        raised: matchedDesigns.some(w4),
        matched: matchedDesigns.map((d) => ({
          design: d.label,
          shareProfitable: d.shareProfitable,
          medianRetention: d.retention.median,
          raised: w4(d)
        })),
        systemLevel: systemDesigns.map((d) => ({
          design: d.label,
          shareProfitable: d.shareProfitable,
          medianRetention: d.retention.median,
          raised: w4(d)
        }))
      },
      W5: {
        D35: maxDaily > priorGates.riskTolerance || maxMinute > priorGates.riskTolerance,
        D30: maxDaily > priorGates.riskPreferred || maxMinute > priorGates.riskPreferred,
        Dplus: port.dailyPercent > c0.dailyPercent || port.minutePercent > c0.minutePercent,
        maxDaily,
        maxMinute,
        baseDaily: port.dailyPercent,
        baseMinute: port.minutePercent
      },
      W6: { raised: true },
      W7: {
        raised: matchedDesigns.some(w7),
        matched: matchedDesigns.map((d) => ({
          design: d.label,
          medianDaily: d.portfolio?.daily.median,
          raised: w7(d)
        })),
        systemLevel: systemDesigns.map((d) => ({
          design: d.label,
          medianDaily: d.portfolio?.daily.median,
          raised: w7(d)
        }))
      }
    };
  };
  const flagSets = { S: flagsOf('S'), B4: flagsOf('B4'), B5: flagsOf('B5') };

  out.flags = flagSets;

  // ================= decisions (PROTOCOL.md §11) =================
  const sCost = (id: string) => costRows.find((row) => row.scenario === id && row.structure === 'S')!;
  const aConditions = {
    baseFixedPositive: S.fixed.net > 0,
    c1c2c3FixedPositive: ['C1', 'C2', 'C3'].every((id) => (sCost(id).fixedNet as number) > 0),
    pairedProfitable: sPairedAll.shareProfitable >= flags.stabilityProfitableShare,
    jointProfitable: sJoint[0]!.shareProfitable >= flags.stabilityProfitableShare,
    portfolioIncrementalBase: S.portfolio.endEquity - c0.endEquity > 0,
    portfolioIncrementalC1: (sCost('C1').incremental as number) > 0
  };
  // No accounting flag: the baseline passed (anchors, controls, CLI parity, identities) and every re-execution equalled
  // its record (both re-execution checks throw above on any difference).
  const accountingPassed =
    (JSON.parse(await fs.readFile(resultDir('baseline', 'baseline.json'), 'utf8')) as { passed: boolean }).passed ===
      true && reexecution.every((row) => row.equal);
  const aHolds = Object.values(aConditions).every(Boolean);
  const a = aHolds
    ? flagSets.S.W1.raised || flagSets.S.W2.raised
      ? 'plausible but thinly evidenced'
      : 'plausible'
    : 'not supported';
  const cConditions = {
    a: aHolds,
    accounting: accountingPassed,
    matchedMedianDailyWithinC0Plus2pp: (sPairedAll.portfolio!.daily.median as number) <= c0.dailyPercent + 0.02
  };
  const c = Object.values(cConditions).every(Boolean)
    ? 'merits prospective observation'
    : 'does not merit prospective observation';
  const sJ = sJoint[0]!;
  const b5J = poolJoint.B5![0]!;
  const sInc = {
    frozen: S.portfolio.endEquity - c0.endEquity,
    neighbourhood: sJ.portfolio!.endEquity.median - c0.endEquity
  };
  const b5Inc = {
    frozen: poolFrozen.B5.portfolio.endEquity - c0.endEquity,
    neighbourhood: b5J.portfolio!.endEquity.median - c0.endEquity
  };
  const b5Rule = {
    wealthFrozen: b5Inc.frozen > sInc.frozen,
    wealthNeighbourhood: b5Inc.neighbourhood > sInc.neighbourhood,
    drawdown: b5J.portfolio!.daily.median <= sJ.portfolio!.daily.median + 0.01,
    notSMoreRobust: (P.matched as Record<string, { verdict: string }>).B5!.verdict !== 'S more robust on matched tests'
  };
  const sEff = fixedEfficiency.S!.netPerMillionDollarDays;
  const b5Eff = fixedEfficiency.B5!.netPerMillionDollarDays;
  const sRule = {
    drawdown: sJ.portfolio!.daily.median < b5J.portfolio!.daily.median - 0.01,
    wealthPositive: sInc.frozen > 0 && sInc.neighbourhood > 0,
    sMoreRobust: (P.matched as Record<string, { verdict: string }>).B5!.verdict === 'S more robust on matched tests',
    efficiency: sEff >= b5Eff
  };
  const overall = Object.values(b5Rule).every(Boolean)
    ? 'B5 preferable'
    : Object.values(sRule).every(Boolean)
      ? 'standalone VGT preferable for prospective observation'
      : c === 'merits prospective observation'
        ? 'both worth parallel observation'
        : 'insufficient evidence to choose';

  // Reported sensitivity (not a rule): the same two rules on the seed-2 joint designs.
  const seed2 = (() => {
    const sJ2 = sJoint[1]!;
    const b5J2 = poolJoint.B5![1]!;
    const s2Inc = sJ2.portfolio!.endEquity.median - c0.endEquity;
    const b52Inc = b5J2.portfolio!.endEquity.median - c0.endEquity;

    return {
      sMedianDaily: sJ2.portfolio!.daily.median,
      b5MedianDaily: b5J2.portfolio!.daily.median,
      sIncremental: s2Inc,
      b5Incremental: b52Inc,
      b5Rule: {
        ...b5Rule,
        wealthNeighbourhood: b52Inc > s2Inc,
        drawdown: b5J2.portfolio!.daily.median <= sJ2.portfolio!.daily.median + 0.01
      },
      sRule: {
        ...sRule,
        drawdown: sJ2.portfolio!.daily.median < b5J2.portfolio!.daily.median - 0.01,
        wealthPositive: sInc.frozen > 0 && s2Inc > 0
      }
    };
  })();

  out.decisions = {
    seed2Sensitivity: seed2,
    a: { outcome: a, conditions: aConditions },
    b: {
      B5: (P.matched as Record<string, { verdict: string }>).B5!.verdict,
      B4: (P.matched as Record<string, { verdict: string }>).B4!.verdict
    },
    c: { outcome: c, conditions: cConditions },
    overall: {
      outcome: overall,
      b5Rule,
      sRule,
      inputs: {
        sIncremental: sInc,
        b5Incremental: b5Inc,
        sNeighbourhoodMedianDaily: sJ.portfolio!.daily.median,
        b5NeighbourhoodMedianDaily: b5J.portfolio!.daily.median,
        sNetPerMillionDollarDays: sEff,
        b5NetPerMillionDollarDays: b5Eff
      }
    }
  };

  out.seconds = Math.round((Date.now() - started) / 1000);
  await writeJson(resultDir('analysis.json'), out);
  await writeText(resultDir('analysis.done'), `${nowIso()}\n`);
  console.log(`[analyze] ${resultDir('analysis.json')} (${out.seconds} s); overall: ${overall}`);
  void d1Keys;
  void oatPoints;
};

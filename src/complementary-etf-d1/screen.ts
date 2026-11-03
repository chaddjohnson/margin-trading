// Stage A (PROTOCOL.md §3): the training-only, daily-proxy opportunity screen of the seven candidates against the exact
// pool occupancy of the All-lowDd shadow fixed-$100,000 run on the canonical training partition. Every price comes
// from loadTraining (access 'optimization': the training partition only, refused otherwise before reading). The
// proxies are daily-close sketches of a D1-like dip purchase, not D1 fills; their returns are retrospective
// diagnostics that rank the candidates by the predeclared rubric and select at most two.
import path from 'node:path';
import type { MarketSession } from '#types';
import { combinationOf } from '../multi-etf-allocator/context.ts';
import { datasetRunConfig, loadDatasetUniverse, warmupSessionsOf } from '../multi-etf-allocator/dataset.ts';
import { type RunResult, runAllocator } from '../multi-etf-allocator/engine.ts';
import { writeRun } from '../multi-etf-allocator/export.ts';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import { allocatorConfig } from '../multi-etf-allocator/scenarios.ts';
import {
  type Candidate,
  baselineBooks,
  candidates,
  formatDollars,
  highPriority,
  log,
  pct,
  readJson,
  stageDir,
  study,
  writeJson,
  writeText
} from './context.ts';
import { loadTraining } from './data.ts';
import { requireProtocolFrozen } from './freeze.ts';

const secondsPerDay = 86400;
const { screen } = study;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length === 0 ? NaN : sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

// The highest session high of the previous `lookback` sessions (-Infinity before any).
export const referenceHighs = (sessions: MarketSession[], lookback: number) =>
  sessions.map((_, s) => {
    let high = -Infinity;

    for (let k = Math.max(0, s - lookback); k < s; k++) {
      high = Math.max(high, sessions[k]!.high);
    }

    return high;
  });

export interface Episode {
  startDate: string;
  reference: number;
  troughDate: string;
  trough: number;
  depth: number;
  band: string;
  endDate: string;
  end: 'recovered' | 'censored at 250 sessions' | 'open at window end';
  sessionsToTrough: number;
  forward: Record<string, number>; // close k sessions after the start ÷ the start close − 1 (retrospective)
}

const bandOf = (depth: number) =>
  screen.bands.find((band) => depth >= band.min && depth < band.max)?.label ?? 'below 10%';

// Episodes from the first eligible session `from` to the last session (PROTOCOL.md §3).
export const findEpisodes = (sessions: MarketSession[], highs: number[], from: number): Episode[] => {
  const episodes: Episode[] = [];
  let s = from;

  while (s < sessions.length) {
    if (!(sessions[s]!.low <= (1 - screen.episodeStart) * highs[s]!)) {
      s++;
      continue;
    }

    const start = s;
    const reference = highs[s]!;
    let trough = sessions[s]!.low;
    let troughIndex = s;
    let end = sessions.length - 1;
    let how: Episode['end'] = 'open at window end';

    for (let k = s + 1; k < sessions.length; k++) {
      if (sessions[k]!.low < trough) {
        trough = sessions[k]!.low;
        troughIndex = k;
      }

      if (sessions[k]!.close >= (1 - screen.episodeRecovery) * reference) {
        end = k;
        how = 'recovered';
        break;
      }

      if (k - start >= screen.episodeMaxSessions) {
        end = k;
        how = 'censored at 250 sessions';
        break;
      }
    }

    const depth = 1 - trough / reference;

    episodes.push({
      startDate: sessions[start]!.date,
      reference,
      troughDate: sessions[troughIndex]!.date,
      trough,
      depth,
      band: bandOf(depth),
      endDate: sessions[end]!.date,
      end: how,
      sessionsToTrough: troughIndex - start,
      forward: Object.fromEntries(
        screen.reboundHorizons.map((horizon) => [
          String(horizon),
          start + horizon < sessions.length ? sessions[start + horizon]!.close / sessions[start]!.close - 1 : NaN
        ])
      )
    });
    s = end + 1;
  }

  return episodes;
};

export interface ProxyTrade {
  proxy: string;
  armDate: string;
  entryIndex: number;
  entryDate: string;
  entryClose: number;
  exitIndex: number;
  exitDate: string;
  exitClose: number;
  exitReason: 'stop' | 'hold' | 'open at window end';
  days: number;
  gross: number; // return on the close prices
  interest: number;
  net0: number;
  net5: number;
}

type ProxySpec = (typeof screen.proxies)[number];

const proxyNet = (entry: number, exit: number, days: number, bps: number) => {
  const cost = bps / 10000;

  return (
    study.principal * ((exit * (1 - cost)) / (entry * (1 + cost)) - 1) - study.principal * study.rate * (days / 365)
  );
};

// The proxy trades of one spec (PROTOCOL.md §3), one at a time, from session `from`.
export const proxyTrades = (sessions: MarketSession[], highs: number[], from: number, spec: ProxySpec) => {
  const trades: ProxyTrade[] = [];
  let armedAt = -1;
  let lowestClose = Infinity;
  let s = from;

  const close = (entryIndex: number, exitIndex: number, reason: ProxyTrade['exitReason'], armIndex: number) => {
    const entryClose = sessions[entryIndex]!.close;
    const exitClose = sessions[exitIndex]!.close;
    const days = (sessions[exitIndex]!.time - sessions[entryIndex]!.time) / secondsPerDay;

    trades.push({
      proxy: spec.key,
      armDate: sessions[armIndex]!.date,
      entryIndex,
      entryDate: sessions[entryIndex]!.date,
      entryClose,
      exitIndex,
      exitDate: sessions[exitIndex]!.date,
      exitClose,
      exitReason: reason,
      days,
      gross: exitClose / entryClose - 1,
      interest: study.principal * study.rate * (days / 365),
      net0: proxyNet(entryClose, exitClose, days, 0),
      net5: proxyNet(entryClose, exitClose, days, screen.costBps)
    });
  };

  while (s < sessions.length) {
    const session = sessions[s]!;

    if (armedAt < 0) {
      if (session.low <= (1 - spec.armDepth) * highs[s]!) {
        armedAt = s;
        lowestClose = session.close;
      }

      s++;
      continue;
    }

    if (session.close >= lowestClose * (1 + spec.rebound)) {
      // Buy at this close; hold until the stop close or the holdSessions-th session after entry.
      const entryIndex = s;
      const armIndex = armedAt;
      let exitIndex = -1;
      let reason: ProxyTrade['exitReason'] = 'open at window end';

      for (let k = entryIndex + 1; k < sessions.length; k++) {
        if (sessions[k]!.close <= session.close * (1 - spec.stop)) {
          exitIndex = k;
          reason = 'stop';
          break;
        }

        if (k - entryIndex >= spec.holdSessions) {
          exitIndex = k;
          reason = 'hold';
          break;
        }
      }

      close(entryIndex, exitIndex < 0 ? sessions.length - 1 : exitIndex, reason, armIndex);
      armedAt = -1;
      lowestClose = Infinity;
      s = (exitIndex < 0 ? sessions.length : exitIndex) + 1;
      continue;
    }

    lowestClose = Math.min(lowestClose, session.close);
    s++;
  }

  return trades;
};

// ----- the baseline pool -----

export interface Interval {
  symbol: string;
  start: number;
  end: number;
  net: number;
}

const fundedIntervals = (result: RunResult): Interval[] =>
  result.lots.map((lot) => ({
    symbol: lot.symbol,
    start: lot.decisionTime,
    end: lot.exitIndex >= 0 ? lot.exitTime : Infinity,
    net: lot.net
  }));

const refusedVirtualIntervals = (result: RunResult): Interval[] =>
  result.signals
    .filter((signal) => signal.outcome === 'refused' && signal.trade && signal.trade.entryIndex >= 0)
    .map((signal) => ({
      symbol: signal.symbol,
      start: signal.trade!.decisionTime,
      end: signal.trade!.exitIndex >= 0 ? signal.trade!.exitTime : Infinity,
      net: signal.trade!.net
    }));

// The baseline pool: All-lowDd shadow, fixed $100,000, canonical training partition.
export const baselinePool = async () => {
  const base = await allocatorConfig('fixed', combinationOf('all-lowDd'), 'shadow');
  const loaded = await loadDatasetUniverse({
    members: base.symbols,
    partition: 'training',
    warmupSessions: warmupSessionsOf(base),
    mode: 'fixed'
  });
  const config = datasetRunConfig(base, loaded);
  const baseline = runAllocator(loaded.universe, config);

  return { config, baseline, funded: fundedIntervals(baseline), refused: refusedVirtualIntervals(baseline) };
};

export interface Timing {
  idleAtEntry: boolean;
  blocked: { symbol: string; decision: string; net: number }[];
  overlapsFunded: Record<string, boolean>;
  overlapsRefusedVirtual: boolean;
  clean: boolean;
}

export const timingOf = (
  trade: ProxyTrade,
  sessions: MarketSession[],
  funded: Interval[],
  refused: Interval[]
): Timing => {
  const entryTime = sessions[trade.entryIndex]!.closeTime;
  const exitTime = sessions[trade.exitIndex]!.closeTime;
  const overlaps = (interval: Interval) => interval.start < exitTime && interval.end > entryTime;
  const idleAtEntry = !funded.some((interval) => interval.start <= entryTime && interval.end > entryTime);
  const blocked = funded
    .filter((interval) => interval.start > entryTime && interval.start <= exitTime)
    .map((interval) => ({
      symbol: interval.symbol,
      decision: new Date(interval.start * 1000).toISOString(),
      net: interval.net
    }));

  return {
    idleAtEntry,
    blocked,
    overlapsFunded: Object.fromEntries(
      baselineBooks.map((symbol) => [
        symbol,
        funded.some((interval) => interval.symbol === symbol && overlaps(interval))
      ])
    ),
    overlapsRefusedVirtual: refused.some(overlaps),
    clean: idleAtEntry && blocked.length === 0
  };
};

const correlation = (a: number[], b: number[]) => {
  const n = Math.min(a.length, b.length);
  const meanA = a.slice(0, n).reduce((total, value) => total + value, 0) / n;
  const meanB = b.slice(0, n).reduce((total, value) => total + value, 0) / n;
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;

  for (let i = 0; i < n; i++) {
    covariance += (a[i]! - meanA) * (b[i]! - meanB);
    varianceA += (a[i]! - meanA) ** 2;
    varianceB += (b[i]! - meanB) ** 2;
  }

  return covariance / Math.sqrt(varianceA * varianceB);
};

const returnsOf = (sessions: MarketSession[]) =>
  sessions.slice(1).map((session, index) => session.close / sessions[index]!.close - 1);

// Rank scores: the best value 1, the worst 0, linear in rank, ties averaged.
export const rankScores = (values: number[]) => {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value);
  const scores = new Array<number>(values.length).fill(0);
  const span = Math.max(1, values.length - 1);

  for (let i = 0; i < order.length;) {
    let j = i;

    while (j + 1 < order.length && order[j + 1]!.value === order[i]!.value) {
      j++;
    }

    const average = (i + j) / 2;

    for (let k = i; k <= j; k++) {
      scores[order[k]!.index] = 1 - average / span;
    }

    i = j + 1;
  }

  return scores;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const proxyStats = (trades: ProxyTrade[], timings: Timing[]) => {
  const clean = trades.filter((_, index) => timings[index]!.clean);
  const cleanNet5 = clean.map((trade) => trade.net5);
  const best = cleanNet5.length > 0 ? Math.max(...cleanNet5) : 0;
  const positive = trades.map((trade) => trade.net5).filter((value) => value > 0);

  return {
    trades: trades.length,
    years: new Set(trades.map((trade) => trade.entryDate.slice(0, 4))).size,
    idleAtEntry: timings.filter((timing) => timing.idleAtEntry).length,
    clean: clean.length,
    cleanShare: trades.length > 0 ? clean.length / trades.length : 0,
    blockedLots: sum(timings.map((timing) => timing.blocked.length)),
    blockedVgtLots: sum(timings.map((timing) => timing.blocked.filter((lot) => lot.symbol === 'VGT').length)),
    blockedNet: sum(timings.flatMap((timing) => timing.blocked.map((lot) => lot.net))),
    overlapsFunded: Object.fromEntries(
      baselineBooks.map((symbol) => [symbol, timings.filter((timing) => timing.overlapsFunded[symbol]).length])
    ),
    overlapsRefusedVirtual: timings.filter((timing) => timing.overlapsRefusedVirtual).length,
    net0: sum(trades.map((trade) => trade.net0)),
    net5: sum(trades.map((trade) => trade.net5)),
    interest: sum(trades.map((trade) => trade.interest)),
    wins5: trades.filter((trade) => trade.net5 > 0).length,
    worst5: trades.length > 0 ? Math.min(...trades.map((trade) => trade.net5)) : 0,
    bestShareOfPositive: positive.length > 0 ? Math.max(...positive) / sum(positive) : NaN,
    cleanNet0: sum(clean.map((trade) => trade.net0)),
    cleanNet5: sum(cleanNet5),
    cleanNet5WithoutBest: sum(cleanNet5) - best,
    cleanYears: new Set(clean.map((trade) => trade.entryDate.slice(0, 4))).size
  };
};

// The data gate from the audit (results/audit/audit.json): the file verified with every row in exactly one partition,
// no malformed, out-of-order or duplicate row and no missing session, and each of its recorded splits leaving an
// adjusted overnight move within ±10% at exactly the registry's factor.
interface AuditFacts {
  coverage: {
    symbol: string;
    status: string;
    hashMatchesLoaded: boolean;
    everyRowOncePartitioned: boolean;
    malformed: number;
    outOfOrder: number;
    duplicates: number;
    missingSessions: string[];
  }[];
  splits: { symbol: string; adjustedOvernight: number; adjustmentFactor: number; expectedFactor: number }[];
}

export const dataGate = (audit: AuditFacts, symbol: string) => {
  const file = audit.coverage.find((row) => row.symbol === symbol);

  return (
    file !== undefined &&
    file.status === 'verified' &&
    file.hashMatchesLoaded &&
    file.everyRowOncePartitioned &&
    file.malformed + file.outOfOrder + file.duplicates === 0 &&
    file.missingSessions.length === 0 &&
    audit.splits
      .filter((split) => split.symbol === symbol)
      .every(
        (split) =>
          Math.abs(split.adjustedOvernight) < 0.1 && Math.abs(split.adjustmentFactor / split.expectedFactor - 1) < 1e-9
      )
  );
};

export const runScreen = async () => {
  await requireProtocolFrozen();

  const dir = stageDir('stageA');
  const audit = await readJson<AuditFacts>(stageDir('audit', 'audit.json'));

  const { config, baseline, funded, refused } = await baselinePool();
  const baselineSummary = await writeRun(path.join(dir, 'baseline-fixed-training'), baseline);

  log(
    `baseline All-lowDd fixed training: ${baselineSummary.fundedLots} lots, net ${formatDollars(baselineSummary.net)}, ${refused.length} refused virtual trades`
  );

  // Daily returns of the core and the books, for the secondary correlations.
  const reference: Record<string, number[]> = {};
  const referenceDates: Record<string, string[]> = {};

  for (const symbol of ['VOOG', ...baselineBooks]) {
    const { sessions } = await loadTraining(symbol);

    reference[symbol] = returnsOf(sessions);
    referenceDates[symbol] = sessions.map((session) => session.date);
  }

  const rows = [];
  const returnsByCandidate: Record<string, number[]> = {};

  for (const symbol of candidates) {
    const { sessions, report, dataHash } = await loadTraining(symbol);
    const eligibility = sessions.findIndex((session) => session.date >= study.eligibilityDate);

    if (sessions[eligibility]?.date !== study.eligibilityDate) {
      throw new Error(`${symbol}: no session on the eligibility date ${study.eligibilityDate}`);
    }

    if (sessions.map((session) => session.date).join() !== referenceDates.VOOG!.join()) {
      throw new Error(`${symbol}: its training calendar differs from VOOG's`);
    }

    const highs = referenceHighs(sessions, screen.lookback);
    const longHighs = referenceHighs(sessions, screen.lookbackSensitivity);
    const episodes = findEpisodes(sessions, highs, eligibility);
    const longEpisodes = findEpisodes(sessions, longHighs, eligibility);
    const proxies = Object.fromEntries(
      screen.proxies.map((spec) => {
        const trades = proxyTrades(sessions, highs, eligibility, spec);
        const timings = trades.map((trade) => timingOf(trade, sessions, funded, refused));

        return [spec.key, { trades, timings, stats: proxyStats(trades, timings) }];
      })
    );
    const longP15 = (() => {
      const trades = proxyTrades(sessions, longHighs, eligibility, screen.proxies[0]);
      const timings = trades.map((trade) => timingOf(trade, sessions, funded, refused));

      return proxyStats(trades, timings);
    })();
    const deep = episodes.filter((episode) => episode.depth >= 0.15);
    const returns = returnsOf(sessions);
    const dollarVolume = median(sessions.map((session) => session.volume * session.close));

    returnsByCandidate[symbol] = returns;

    const p15 = proxies.p15!.stats;
    const gates = {
      data: dataGate(audit, symbol),
      liquidity: dollarVolume >= screen.gates.minMedianDollarVolume,
      breadth: p15.trades >= screen.gates.minProxyTrades && p15.years >= screen.gates.minProxyYears,
      timing: p15.clean >= screen.gates.minCleanProxies,
      economics: p15.cleanNet5 > 0 && p15.cleanNet5WithoutBest > 0
    };

    rows.push({
      symbol,
      priority: (highPriority as readonly string[]).includes(symbol) ? 'high' : 'lower',
      dataHash,
      sessions: sessions.length,
      firstDate: sessions[0]!.date,
      lastDate: sessions.at(-1)!.date,
      splitAdjustments: report.splitAdjustments,
      medianDailyDollarVolume: dollarVolume,
      medianBarsPerSession: median(sessions.map((session) => session.bars.length)),
      episodes,
      episodeCounts: Object.fromEntries(
        screen.bands.map((band) => [band.label, episodes.filter((episode) => episode.band === band.label).length])
      ),
      deepEpisodes: deep.length,
      deepEpisodeYears: new Set(deep.map((episode) => episode.startDate.slice(0, 4))).size,
      deepestEpisode: episodes.reduce((worst, episode) => Math.max(worst, episode.depth), 0),
      longLookback: {
        episodes: longEpisodes.length,
        deepEpisodes: longEpisodes.filter((episode) => episode.depth >= 0.15).length,
        p15: longP15
      },
      proxies: Object.fromEntries(
        Object.entries(proxies).map(([key, value]) => [
          key,
          {
            stats: value.stats,
            trades: value.trades.map((trade, index) => ({ ...trade, timing: value.timings[index] }))
          }
        ])
      ),
      correlations: Object.fromEntries(
        ['VOOG', ...baselineBooks].map((other) => [other, correlation(returns, reference[other]!)])
      ),
      gates,
      passes: Object.values(gates).every(Boolean)
    });
    log(
      `${symbol}: ${episodes.length} episodes (${deep.length} ≥ 15% in ${new Set(deep.map((e) => e.startDate.slice(0, 4))).size} years); p15 ${p15.trades} proxies, ${p15.clean} clean, clean net ${formatDollars(p15.cleanNet5)} (${formatDollars(p15.cleanNet5WithoutBest)} without the best); gates ${
        Object.entries(gates)
          .filter(([, pass]) => !pass)
          .map(([name]) => name)
          .join(', ') || 'all pass'
      }`
    );
  }

  // Rank scores and the composite (PROTOCOL.md §3).
  const timingScores = rankScores(
    rows.map((row) => row.proxies.p15!.stats.clean + row.proxies.p15!.stats.cleanShare / 10)
  );
  const breadthScores = rankScores(rows.map((row) => row.deepEpisodeYears + row.deepEpisodes / 1000));
  const economicsScores = rankScores(rows.map((row) => row.proxies.p15!.stats.cleanNet5WithoutBest));
  const scored = rows.map((row, index) => ({
    ...row,
    scores: {
      timing: timingScores[index]!,
      breadth: breadthScores[index]!,
      economics: economicsScores[index]!,
      composite:
        screen.weights.timing * timingScores[index]! +
        screen.weights.breadth * breadthScores[index]! +
        screen.weights.economics * economicsScores[index]!
    }
  }));
  const candidateCorrelations = Object.fromEntries(
    candidates.map((a) => [
      a,
      Object.fromEntries(candidates.map((b) => [b, correlation(returnsByCandidate[a]!, returnsByCandidate[b]!)]))
    ])
  ) as Record<Candidate, Record<Candidate, number>>;

  // Slot-by-slot selection.
  const selected: Candidate[] = [];
  const decisions: string[] = [];
  const passing = scored.filter((row) => row.passes).sort((a, b) => b.scores.composite - a.scores.composite);
  const redundant = (symbol: Candidate) =>
    selected.find((other) => candidateCorrelations[symbol][other] > screen.redundancyCorrelation);

  while (selected.length < screen.maxSelections) {
    const available = passing.filter(
      (row) => !selected.includes(row.symbol as Candidate) && !redundant(row.symbol as Candidate)
    );
    const high = available.find((row) => row.priority === 'high');
    const lower = available.find((row) => row.priority === 'lower');

    if (!high && !lower) {
      break;
    }

    const pick =
      lower && (!high || lower.scores.composite >= high.scores.composite + screen.lowerPriorityMargin) ? lower : high!;

    selected.push(pick.symbol as Candidate);
    decisions.push(
      `slot ${selected.length}: ${pick.symbol} (composite ${pick.scores.composite.toFixed(3)}${high && lower ? `; best high-priority ${high.symbol} ${high.scores.composite.toFixed(3)}, best lower-priority ${lower.symbol} ${lower.scores.composite.toFixed(3)}` : ''})`
    );
  }

  for (const row of scored) {
    if (selected.includes(row.symbol as Candidate)) {
      continue;
    }

    const failed = Object.entries(row.gates)
      .filter(([, pass]) => !pass)
      .map(([name]) => name);
    const other = redundant(row.symbol as Candidate);

    decisions.push(
      `${row.symbol} not selected: ${failed.length > 0 ? `fails ${failed.join(', ')}` : other ? `redundant with ${other} (correlation ${candidateCorrelations[row.symbol as Candidate][other].toFixed(2)})` : 'passes, outranked'}`
    );
  }

  const record = {
    generatedAt: new Date().toISOString(),
    protocol: 'PROTOCOL.md §3',
    window: { first: study.eligibilityDate, last: study.trainingEnd },
    baseline: {
      key: config.key,
      summary: baselineSummary,
      fundedLots: funded.length,
      refusedVirtualTrades: refused.length,
      dir: path.join(dir, 'baseline-fixed-training')
    },
    rows: scored,
    candidateCorrelations,
    selected,
    decisions
  };

  await writeJson(path.join(dir, 'screen.json'), record);

  for (const row of scored) {
    for (const [key, proxy] of Object.entries(row.proxies)) {
      await writeText(
        path.join(dir, 'proxies', `${row.symbol}-${key}.csv`),
        toCsv(
          proxy.trades.map((trade) => ({
            symbol: row.symbol,
            proxy: key,
            arm_date: trade.armDate,
            entry_date: trade.entryDate,
            entry_close: trade.entryClose,
            exit_date: trade.exitDate,
            exit_close: trade.exitClose,
            exit_reason: trade.exitReason,
            days: trade.days,
            gross: trade.gross,
            interest: trade.interest,
            net_0bps: trade.net0,
            net_5bps: trade.net5,
            idle_at_entry: trade.timing!.idleAtEntry,
            blocked_lots: trade
              .timing!.blocked.map((lot) => `${lot.symbol} ${lot.decision} ${lot.net.toFixed(0)}`)
              .join('; '),
            overlaps_vgt: trade.timing!.overlapsFunded.VGT,
            overlaps_xbi: trade.timing!.overlapsFunded.XBI,
            overlaps_xrt: trade.timing!.overlapsFunded.XRT,
            overlaps_kre: trade.timing!.overlapsFunded.KRE,
            overlaps_refused_virtual: trade.timing!.overlapsRefusedVirtual,
            clean: trade.timing!.clean
          }))
        )
      );
    }

    await writeText(
      path.join(dir, 'episodes', `${row.symbol}.csv`),
      toCsv(
        row.episodes.map((episode) => ({
          symbol: row.symbol,
          start: episode.startDate,
          trough: episode.troughDate,
          end: episode.endDate,
          how: episode.end,
          depth: episode.depth,
          band: episode.band,
          sessions_to_trough: episode.sessionsToTrough,
          forward_5: episode.forward['5'],
          forward_10: episode.forward['10'],
          forward_20: episode.forward['20']
        }))
      )
    );
  }

  await writeText(path.join(dir, 'SCREEN_TABLES.md'), screenTables(record));
  log(`selected: ${selected.join(', ') || 'none'}`);

  return record;
};

type ScreenRecord = Awaited<ReturnType<typeof runScreen>>;

export function screenTables(record: Omit<ScreenRecord, never>) {
  const rows = record.rows;
  const stat = (row: (typeof rows)[number], key = 'p15') => row.proxies[key]!.stats;

  return [
    `# Stage A screen tables (generated ${record.generatedAt})`,
    '',
    `Window ${record.window.first} → ${record.window.last} (training partition). Baseline pool: ${record.baseline.key}, ${record.baseline.fundedLots} funded lots, net ${formatDollars(record.baseline.summary.net)}, ${record.baseline.refusedVirtualTrades} refused virtual trades. Daily proxies, not D1 fills; returns are retrospective diagnostics.`,
    '',
    '## Episodes (74-session reference high)',
    '',
    '| ETF | Priority | 10–15% | 15–20% | 20–30% | 30%+ | Episodes ≥ 15% | Years with one | Deepest | L = 230: episodes (≥ 15%) |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|',
    ...rows.map(
      (row) =>
        `| ${row.symbol} | ${row.priority} | ${row.episodeCounts['10–15%']} | ${row.episodeCounts['15–20%']} | ${row.episodeCounts['20–30%']} | ${row.episodeCounts['30%+']} | ${row.deepEpisodes} | ${row.deepEpisodeYears} | ${pct(row.deepestEpisode)} | ${row.longLookback.episodes} (${row.longLookback.deepEpisodes}) |`
    ),
    '',
    '## Proxy p15 against the baseline pool (5 bps per side, 11% interest)',
    '',
    '| ETF | Proxies (years) | Idle at entry | Clean | Blocks lots (VGT) | Blocked baseline net | Overlap VGT / XBI / XRT / KRE funded | Overlap refused virtual | Net all | Clean net | Clean net w/o best | Wins | Worst | Best share of gains |',
    '|---|---|---:|---:|---|---:|---|---:|---:|---:|---:|---:|---:|---:|',
    ...rows.map((row) => {
      const s = stat(row);

      return `| ${row.symbol} | ${s.trades} (${s.years}) | ${s.idleAtEntry} | ${s.clean} | ${s.blockedLots} (${s.blockedVgtLots}) | ${formatDollars(s.blockedNet)} | ${baselineBooks.map((symbol) => s.overlapsFunded[symbol]).join(' / ')} | ${s.overlapsRefusedVirtual} | ${formatDollars(s.net5)} | ${formatDollars(s.cleanNet5)} | ${formatDollars(s.cleanNet5WithoutBest)} | ${s.wins5}/${s.trades} | ${formatDollars(s.worst5)} | ${pct(s.bestShareOfPositive, 0)} |`;
    }),
    '',
    '## Sensitivities: proxy p20, and p15 on the 230-session reference high',
    '',
    '| ETF | p20 proxies | p20 clean | p20 clean net (5 bps) | p15/L230 proxies | p15/L230 clean | p15/L230 clean net |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...rows.map((row) => {
      const p20 = stat(row, 'p20');
      const long = row.longLookback.p15;

      return `| ${row.symbol} | ${p20.trades} | ${p20.clean} | ${formatDollars(p20.cleanNet5)} | ${long.trades} | ${long.clean} | ${formatDollars(long.cleanNet5)} |`;
    }),
    '',
    '## Liquidity and correlations (training daily returns; secondary descriptors)',
    '',
    '| ETF | Median daily $ volume | Median bars | Splits adjusted | ρ VOOG | ρ VGT | ρ XBI | ρ XRT | ρ KRE |',
    '|---|---:|---:|---|---:|---:|---:|---:|---:|',
    ...rows.map(
      (row) =>
        `| ${row.symbol} | $${(row.medianDailyDollarVolume / 1e6).toFixed(0)}M | ${row.medianBarsPerSession} | ${row.splitAdjustments.map((split) => `${split.ratio}:1 ${split.effectiveDate}`).join(', ') || 'none'} | ${['VOOG', ...baselineBooks].map((other) => row.correlations[other]!.toFixed(2)).join(' | ')} |`
    ),
    '',
    '## Gates, rank scores and the composite',
    '',
    '| ETF | Priority | Data | Liquidity | Breadth | Timing | Economics | T | B | E | Composite |',
    '|---|---|---|---|---|---|---|---:|---:|---:|---:|',
    ...[...rows]
      .sort((a, b) => b.scores.composite - a.scores.composite)
      .map(
        (row) =>
          `| ${row.symbol} | ${row.priority} | ${['data', 'liquidity', 'breadth', 'timing', 'economics'].map((gate) => (row.gates[gate as keyof typeof row.gates] ? 'pass' : '**fail**')).join(' | ')} | ${row.scores.timing.toFixed(2)} | ${row.scores.breadth.toFixed(2)} | ${row.scores.economics.toFixed(2)} | ${row.scores.composite.toFixed(3)} |`
      ),
    '',
    '## Candidate correlations (training daily returns)',
    '',
    `| | ${candidates.join(' | ')} |`,
    `|---|${candidates.map(() => '---:').join('|')}|`,
    ...candidates.map(
      (a) => `| ${a} | ${candidates.map((b) => record.candidateCorrelations[a][b].toFixed(2)).join(' | ')} |`
    ),
    '',
    '## Selection',
    '',
    `Selected: **${record.selected.join(', ') || 'none'}**`,
    '',
    ...record.decisions.map((decision) => `- ${decision}`)
  ].join('\n');
}

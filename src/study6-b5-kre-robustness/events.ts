// A7 — representative failure episodes and their causal walkthroughs (PROTOCOL.md §6.7). The representative scenarios
// are chosen by the predeclared rule (breaches grouped by the calendar quarter of their minute-DD trough; up to five
// episodes from the pooled KRE N1 clip set, up to three more from joint N1 clip rep 1; the breach closest to the centre
// represents its episode). For each: the earliest divergence from frozen B5 (virtual trades and funded ledger), the
// occupancy chain, the peak and trough with the lot held at each, the exact lot decomposition of the drawdown, and the
// same interval in frozen B5. Every breach scenario of the two sets gets a mechanism class.
import type { RealLot } from '../multi-etf-allocator/ledger.ts';
import type { VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import { d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { bookOrder, resultFile } from './context.ts';
import { openDoor } from './data.ts';
import { type Books, type DesignPoint, normalizedDistance, uniqueMask } from './designs.ts';
import { Lab, type MinuteSeries, ceiling, lotContributions, minuteSeries, newYork, quarterOf } from './evaluate.ts';
import { log, nowIso, writeCsv, writeSealed } from './records.ts';
import { type NamedSet, bookSets, frozenB5, jointSets } from './sets.ts';

const five = [...bookOrder];

interface Scenario {
  set: string;
  design: 'kre' | 'joint';
  index: number;
  books: Books;
  dd: number;
  trough: number; // seconds
  quarter: string;
  distance: number;
}

const lotLabel = (lot: RealLot) => `${lot.symbol} ${newYork(lot.entryTime)}`;
const tradeKey = (trade: VirtualTrade) => `${trade.symbol}|${trade.decisionTime}|${trade.entryTime}|${trade.exitTime}`;

const traceOf = (lab: Lab, symbol: string, grid: Books[string]) =>
  lab.ev.trace(symbol, grid, { costBps: 5, rate: 0.11, stopFill: 'stop', stopSlippageBps: 0 });

const describeTrade = (trade: VirtualTrade | undefined) =>
  trade
    ? `${trade.symbol} setup ${newYork(trade.activationTime)} decision ${newYork(trade.decisionTime)} fill ${newYork(trade.entryTime)} exit ${newYork(trade.exitTime)} (${trade.exitReason})`
    : 'none';

const tradeDivergence = (lab: Lab, centre: Books, books: Books) => {
  const found: { time: number; symbol: string; kind: string; centre: string; perturbed: string }[] = [];

  for (const symbol of five) {
    if (!books[symbol] || JSON.stringify(centre[symbol]) === JSON.stringify(books[symbol])) {
      continue;
    }

    const a = traceOf(lab, symbol, centre[symbol]!).trades;
    const b = traceOf(lab, symbol, books[symbol]!).trades;
    const count = Math.max(a.length, b.length);

    for (let i = 0; i < count; i++) {
      const x = a[i];
      const y = b[i];

      if (x && y && tradeKey(x) === tradeKey(y) && x.exitReason === y.exitReason) {
        continue;
      }

      const kind =
        !x || !y
          ? 'trade count'
          : x.activationTime !== y.activationTime
            ? 'arming'
            : x.decisionTime !== y.decisionTime
              ? 'entry decision'
              : x.entryTime !== y.entryTime
                ? 'fill'
                : 'exit';
      const time = Math.min(
        ...[x, y]
          .filter((trade): trade is VirtualTrade => Boolean(trade))
          .map((trade) =>
            kind === 'arming'
              ? trade.activationTime
              : kind === 'exit'
                ? trade.exitTime || trade.entryTime
                : trade.decisionTime
          )
      );

      found.push({ time, symbol, kind, centre: describeTrade(x), perturbed: describeTrade(y) });
      break;
    }
  }

  return found.sort((p, q) => p.time - q.time);
};

const ledgerKey = (lot: RealLot) => `${lot.symbol}|${lot.entryTime}`;

const ledgerDivergence = (centreLots: RealLot[], lots: RealLot[]) => {
  const count = Math.max(centreLots.length, lots.length);

  for (let i = 0; i < count; i++) {
    const a = centreLots[i];
    const b = lots[i];

    if (a && b && ledgerKey(a) === ledgerKey(b) && a.exitTime === b.exitTime) {
      continue;
    }

    return {
      ordinal: i + 1,
      time: Math.min(a?.decisionTime ?? Infinity, b?.decisionTime ?? Infinity),
      centre: a ? `${lotLabel(a)} → ${newYork(a.exitTime)} net ${a.net.toFixed(2)}` : 'none',
      perturbed: b ? `${lotLabel(b)} → ${newYork(b.exitTime)} net ${b.net.toFixed(2)}` : 'none',
      kind: !a
        ? 'extra lot funded'
        : !b
          ? 'lot no longer funded'
          : a.symbol !== b.symbol
            ? 'different book funded'
            : 'same book, different lot'
    };
  }

  return undefined;
};

const classify = (series: MinuteSeries, centreLots: RealLot[]) => {
  const { rows } = lotContributions(series, series.peakIndex, series.troughIndex);
  const decline = rows.filter((row) => row.contribution < 0).reduce((total, row) => total - row.contribution, 0);
  const centreKeys = new Set(centreLots.map((lot) => `${lot.symbol}|${lot.entryTime}|${lot.exitTime}`));
  const share = (filter: (row: (typeof rows)[number]) => boolean) =>
    decline > 0
      ? rows.filter((row) => row.contribution < 0 && filter(row)).reduce((t, row) => t - row.contribution, 0) / decline
      : 0;
  const kreShare = share((row) => row.symbol === 'KRE');
  const newOtherShare = share(
    (row) => row.symbol !== 'KRE' && !centreKeys.has(`${row.symbol}|${row.entryTime}|${row.exitTime}`)
  );
  const sharedShare = share((row) => centreKeys.has(`${row.symbol}|${row.entryTime}|${row.exitTime}`));
  const gapShare = share((row) => /gap/.test(String(row.exitReason)));
  const mechanism =
    kreShare >= 0.5
      ? 'KRE own excursion'
      : newOtherShare >= 0.5
        ? 'enabled/displaced ETF'
        : sharedShare >= 0.5
          ? 'shared-lot path dependence'
          : 'compound';

  return { mechanism, kreShare, newOtherShare, sharedShare, gapFlag: gapShare >= 0.25, gapShare, rows };
};

export const runEvents = async () => {
  const started = Date.now();
  const door = await openDoor('diag', five, 'A7 events W29', 'W29');
  const lab = new Lab(door);
  const b5 = frozenB5();
  const centreRun = lab.replay(b5, undefined, true);
  const centreSeries = minuteSeries(lab, centreRun, b5);
  const centreLots = centreSeries.lots;

  if (!centreSeries.matchesTracker) {
    throw new Error(
      `the minute series of frozen B5 does not reproduce the tracker (${centreSeries.maximum} vs ${centreSeries.trackerMaximum})`
    );
  }

  // The breach scenarios of the pooled KRE N1 clip set and joint N1 clip rep 1.
  const kreSets: NamedSet[] = bookSets(b5, ['book-clip'], ['KRE']);
  const joint1 = jointSets(b5, ['joint-clip']).filter((set) => set.rep === 1);
  const scenarios: Scenario[] = [];
  const collect = (sets: NamedSet[], design: 'kre' | 'joint') => {
    const points: DesignPoint[] = sets.flatMap((set) => set.points);
    const unique = uniqueMask(points, b5);
    let offset = 0;

    for (const set of sets) {
      set.points.forEach((point, index) => {
        if (!unique[offset + index]) {
          return;
        }

        const record = lab.point(point.books);

        if (record.dd >= ceiling) {
          const trough = Date.parse(record.ddTrough) / 1000;

          scenarios.push({
            set: set.id,
            design,
            index,
            books: point.books,
            dd: record.dd,
            trough,
            quarter: quarterOf(trough),
            distance: normalizedDistance(point.books, b5, five)
          });
        }
      });
      offset += set.points.length;
    }
  };

  collect(kreSets, 'kre');
  collect(joint1, 'joint');

  // Mechanism classes of every breach scenario.
  const classRows: Record<string, unknown>[] = [];
  const detailed = new Map<string, { series: MinuteSeries; lots: RealLot[] }>();

  for (const scenario of scenarios) {
    const run = lab.replay(scenario.books, undefined, true);
    const series = minuteSeries(lab, run, scenario.books);
    const verdict = classify(series, centreLots);

    detailed.set(`${scenario.set}#${scenario.index}`, { series, lots: series.lots });
    classRows.push({
      set: scenario.set,
      design: scenario.design,
      index: scenario.index,
      dd: scenario.dd,
      quarter: scenario.quarter,
      peak: newYork(series.points[series.peakIndex]?.time ?? 0),
      trough: newYork(series.points[series.troughIndex]?.time ?? 0),
      seriesMatchesTracker: series.matchesTracker,
      mechanism: verdict.mechanism,
      kreShare: Math.round(verdict.kreShare * 1e4) / 1e4,
      newOtherShare: Math.round(verdict.newOtherShare * 1e4) / 1e4,
      sharedShare: Math.round(verdict.sharedShare * 1e4) / 1e4,
      gapFlag: verdict.gapFlag,
      distance: Math.round(scenario.distance * 1e4) / 1e4
    });
  }

  // Episode selection (§6.7).
  const rank = (design: 'kre' | 'joint') => {
    const byQuarter = new Map<string, Scenario[]>();

    for (const scenario of scenarios.filter((item) => item.design === design)) {
      byQuarter.set(scenario.quarter, [...(byQuarter.get(scenario.quarter) ?? []), scenario]);
    }

    return [...byQuarter.entries()]
      .map(([quarter, members]) => ({
        quarter,
        count: members.length,
        maxDd: Math.max(...members.map((member) => member.dd)),
        representative: [...members].sort(
          (a, b) => a.distance - b.distance || (a.set < b.set ? -1 : a.set > b.set ? 1 : a.index - b.index)
        )[0]!
      }))
      .sort((a, b) => b.count - a.count || b.maxDd - a.maxDd);
  };
  const kreEpisodes = rank('kre').slice(0, 5);
  const taken = new Set(kreEpisodes.map((episode) => episode.quarter));
  const jointEpisodes = rank('joint')
    .filter((episode) => !taken.has(episode.quarter))
    .slice(0, 3);
  const episodes = [
    ...kreEpisodes.map((episode) => ({ ...episode, source: 'KRE N1 clip (pooled reps 1–5)' })),
    ...jointEpisodes.map((episode) => ({ ...episode, source: 'joint N1 clip rep 1' }))
  ];
  const walkthroughs = episodes.map((episode) => {
    const scenario = episode.representative;
    const { series, lots } = detailed.get(`${scenario.set}#${scenario.index}`)!;
    const peak = series.points[series.peakIndex]!;
    const trough = series.points[series.troughIndex]!;
    const contributions = lotContributions(series, series.peakIndex, series.troughIndex);
    // The same interval in frozen B5 (its marks at the scenario's peak and trough times).
    const at = (time: number) => {
      let index = -1;

      for (let i = 0; i < centreSeries.points.length && centreSeries.points[i]!.time <= time; i++) {
        index = i;
      }

      return index;
    };
    const centrePeak = at(peak.time);
    const centreTrough = at(trough.time);
    const centreInterval = lotContributions(centreSeries, centrePeak, centreTrough);
    const divergence = tradeDivergence(lab, b5, scenario.books);
    const ledger = ledgerDivergence(centreLots, lots);
    const centreKeys = new Set(centreLots.map((lot) => `${lot.symbol}|${lot.entryTime}|${lot.exitTime}`));
    const lotKeys = new Set(lots.map((lot) => `${lot.symbol}|${lot.entryTime}|${lot.exitTime}`));
    const fromTime = Math.min(divergence[0]?.time ?? Infinity, ledger?.time ?? Infinity);
    const chain = [
      ...lots
        .filter((lot) => lot.decisionTime >= fromTime - 1 && lot.entryTime <= trough.time)
        .map((lot) => ({
          lot: lotLabel(lot),
          exit: newYork(lot.exitTime),
          exitReason: lot.exitReason,
          net: Math.round(lot.net * 100) / 100,
          status: centreKeys.has(`${lot.symbol}|${lot.entryTime}|${lot.exitTime}`)
            ? 'shared with frozen B5'
            : 'new (not in frozen B5)'
        })),
      ...centreLots
        .filter(
          (lot) =>
            lot.decisionTime >= fromTime - 1 &&
            lot.entryTime <= trough.time &&
            !lotKeys.has(`${lot.symbol}|${lot.entryTime}|${lot.exitTime}`)
        )
        .map((lot) => ({
          lot: lotLabel(lot),
          exit: newYork(lot.exitTime),
          exitReason: lot.exitReason,
          net: Math.round(lot.net * 100) / 100,
          status: 'displaced (frozen B5 only)'
        }))
    ].sort((a, b) => (a.lot.slice(4) < b.lot.slice(4) ? -1 : 1));
    const changed = Object.fromEntries(
      five
        .filter((symbol) => JSON.stringify(scenario.books[symbol]) !== JSON.stringify(b5[symbol]))
        .map((symbol) => [
          symbol,
          Object.fromEntries(
            d1Keys
              .filter((key) => scenario.books[symbol]![key] !== b5[symbol]![key])
              .map((key) => [key, `${b5[symbol]![key]} → ${scenario.books[symbol]![key]}`])
          )
        ])
    );
    const heldAt = (point: (typeof series.points)[number]) => {
      const lot = lots.find((item) => item.id === point.openLot);

      return lot
        ? { lot: lotLabel(lot), unrealized: Math.round(point.unrealized * 100) / 100 }
        : { lot: 'flat', unrealized: 0 };
    };

    return {
      episode: episode.quarter,
      source: episode.source,
      breachScenariosInEpisode: episode.count,
      maxDdInEpisode: episode.maxDd,
      representative: { set: scenario.set, index: scenario.index, distance: scenario.distance, dd: scenario.dd },
      changedParameters: changed,
      earliestDivergence: { virtualTrades: divergence, fundedLedger: ledger },
      occupancyChain: chain,
      peak: { time: newYork(peak.time), value: peak.value, realized: peak.realized, held: heldAt(peak) },
      trough: { time: newYork(trough.time), value: trough.value, realized: trough.realized, held: heldAt(trough) },
      drawdown: peak.value - trough.value,
      lotDecomposition: contributions.rows.map((row) => ({
        lot: `${row.symbol} ${newYork(row.entryTime)}`,
        exit: newYork(row.exitTime),
        exitReason: row.exitReason,
        contribution: Math.round(row.contribution * 100) / 100,
        inFrozenB5: centreKeys.has(`${row.symbol}|${row.entryTime}|${row.exitTime}`)
      })),
      decompositionResidual: contributions.residual,
      frozenB5SameInterval: {
        change: centreInterval.change,
        lots: centreInterval.rows.map((row) => ({
          lot: `${row.symbol} ${newYork(row.entryTime)}`,
          contribution: Math.round(row.contribution * 100) / 100
        }))
      },
      mechanism: classRows.find((row) => row.set === scenario.set && row.index === scenario.index)!
    };
  });
  const mechanismCounts = (design: 'kre' | 'joint') => {
    const counts: Record<string, number> = {};

    for (const row of classRows.filter((item) => item.design === design)) {
      counts[row.mechanism as string] = (counts[row.mechanism as string] ?? 0) + 1;
    }

    return counts;
  };
  const centreEpisodes = (await import('./evaluate.ts')).drawdownEpisodes(centreSeries, 5).map((episode) => ({
    peak: newYork(centreSeries.points[episode.peakIndex]!.time),
    trough: newYork(centreSeries.points[episode.troughIndex]!.time),
    recovery: episode.recoveryIndex >= 0 ? newYork(centreSeries.points[episode.recoveryIndex]!.time) : 'not recovered',
    depth: episode.depth,
    lots: lotContributions(centreSeries, episode.peakIndex, episode.troughIndex).rows.map((row) => ({
      lot: `${row.symbol} ${newYork(row.entryTime)}`,
      contribution: Math.round(row.contribution * 100) / 100
    }))
  }));
  const file = await writeCsv(resultFile('partA', 'A7', 'breach-classes.csv'), classRows);
  const record = await writeSealed(resultFile('partA', 'A7-events.json'), {
    stage: 'A7-events',
    at: nowIso(),
    centre: {
      dd: centreSeries.maximum,
      seriesMatchesTracker: centreSeries.matchesTracker,
      peak: newYork(centreSeries.points[centreSeries.peakIndex]!.time),
      trough: newYork(centreSeries.points[centreSeries.troughIndex]!.time),
      topEpisodes: centreEpisodes
    },
    breachScenarios: {
      kre: scenarios.filter((s) => s.design === 'kre').length,
      joint: scenarios.filter((s) => s.design === 'joint').length
    },
    allSeriesMatchTracker: classRows.every((row) => row.seriesMatchesTracker === true),
    mechanismCounts: { kre: mechanismCounts('kre'), joint: mechanismCounts('joint') },
    episodeRanking: {
      kre: rank('kre').map(({ representative, ...rest }) => ({
        ...rest,
        representative: `${representative.set}#${representative.index}`
      })),
      joint: rank('joint').map(({ representative, ...rest }) => ({
        ...rest,
        representative: `${representative.set}#${representative.index}`
      }))
    },
    walkthroughs,
    file,
    seconds: (Date.now() - started) / 1000
  });

  log(
    `A7: ${scenarios.length} breach scenarios, ${walkthroughs.length} walkthroughs; ${record.file} ${record.bodyHash.slice(0, 12)}`
  );

  return walkthroughs.map((walk) => walk.representative);
};

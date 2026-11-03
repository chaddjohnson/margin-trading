// Level D (PROTOCOL.md §6): per view-window timelines, baseline occupancy, first-order classification and the per-ETF
// counts and economics. Descriptive only: nothing here is a pooled counterfactual (Level C is replay.ts).
import type { Dataset } from '../four-family/data.ts';
import { type BaselineKey, type WindowSpec, levelD } from './context.ts';
import { type Cluster, type Item, anchorClusters, independentCount, isShock, regimeOf } from './events.ts';
import { type Classified, type GateTrade, classify, firstOrderOf } from './gate.ts';
import type { MinuteGrid } from './grid.ts';
import { type Interval, clip, complementOf, lengthOf, normalize } from './intervals.ts';
import { type TradeRecord, gateTradeOf } from './ledger.ts';
import type { SetupRecord } from './observer.ts';
import type { SymbolTimeline } from './pairs.ts';

export interface WindowIndex {
  first: number; // first decision session index
  end: number; // last session index (the data end)
  boundary: number; // the boundary session index, −1 for a whole run
  span: Interval; // coordinates [first's open, end's close)
}

export const windowIndexOf = (dates: readonly string[], grid: MinuteGrid, window: WindowSpec): WindowIndex => {
  const first = dates.findIndex((date) => date >= window.firstDecision);
  const end = dates.length - 1;

  if (first < 0 || dates[end] !== window.dataEnd) {
    throw new Error(`${window.key}: the run's sessions do not cover ${window.firstDecision} → ${window.dataEnd}`);
  }

  const boundary = window.boundary ? dates.indexOf(window.boundary) : -1;

  if (window.boundary && boundary !== first - 1) {
    throw new Error(`${window.key}: the boundary ${window.boundary} is not the session before ${window.firstDecision}`);
  }

  return { first, end, boundary, span: grid.span(first, end) };
};

export const inWindow = (trade: Pick<TradeRecord, 'decisionIndex'>, w: WindowIndex) =>
  trade.decisionIndex >= w.first && trade.decisionIndex <= w.end;

export const holdingInterval = (grid: MinuteGrid, trade: TradeRecord): Interval => [
  grid.coordinate(trade.decisionTime),
  trade.open ? grid.total : grid.coordinate(trade.exitTime)
];

export const timelineOf = (
  symbol: string,
  member: boolean,
  trades: readonly TradeRecord[],
  setups: readonly SetupRecord[],
  grid: MinuteGrid,
  ds: Pick<Dataset, 'sClose'>,
  w: WindowIndex
): SymbolTimeline => {
  const armEpisodes: Interval[] = setups
    .map(
      (setup) =>
        [
          grid.coordinate(setup.activationTime),
          !Number.isFinite(setup.signalTime) ? grid.total : grid.coordinate(setup.signalTime)
        ] as Interval
    )
    .map(([a, b]) => [Math.max(a, w.span[0]), Math.min(b, w.span[1])] as Interval)
    .filter(([a, b]) => b > a);
  const returns = new Float64Array(w.end - w.first + 1);

  for (let s = w.first; s <= w.end; s++) {
    returns[s - w.first] = Math.log(ds.sClose[s]! / ds.sClose[s - 1]!);
  }

  return {
    symbol,
    member,
    decisions: trades
      .filter((trade) => inWindow(trade, w))
      .map((trade) => ({ time: trade.decisionTime, session: trade.decisionIndex })),
    armed: normalize(armEpisodes),
    armEpisodes,
    holding: clip(
      trades.map((trade) => holdingInterval(grid, trade)),
      w.span
    ),
    returns
  };
};

// ----- baseline occupancy -----

export interface Occupancy {
  baseline: BaselineKey;
  window: string;
  minutes: number;
  heldMinutes: number;
  reservedMinutes: number;
  idleMinutes: number;
  heldShare: number;
  reservedShare: number;
  idleShare: number;
  sessions: number;
  sessionsWithLotAtClose: number;
  lots: number;
  idleStretches: { start: string; end: string; sessions: number; minutes: number }[];
}

export const occupancyOf = (
  baseline: BaselineKey,
  windowKey: string,
  funded: readonly TradeRecord[],
  daily: readonly { index: number; date: string; openLots: number }[],
  grid: MinuteGrid,
  w: WindowIndex
): Occupancy => {
  const reserved = clip(
    funded.map(
      (trade) =>
        [
          grid.coordinate(trade.decisionTime),
          trade.entryIndex >= 0 ? grid.coordinate(trade.entryTime) : grid.total
        ] as Interval
    ),
    w.span
  );
  const held = clip(
    funded
      .filter((trade) => trade.entryIndex >= 0)
      .map(
        (trade) =>
          [grid.coordinate(trade.entryTime), trade.open ? grid.total : grid.coordinate(trade.exitTime)] as Interval
      ),
    w.span
  );
  const holding = normalize([...reserved, ...held]);
  const idle = complementOf(holding, w.span);
  const minutes = w.span[1] - w.span[0];
  const rows = daily.filter((row) => row.index >= w.first && row.index <= w.end);
  const sessionOf = (coordinate: number) => {
    // the session whose span contains the coordinate
    let lo = 0;
    let hi = grid.sessionCount - 1;

    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;

      if (grid.before[mid]! <= coordinate) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    return lo;
  };
  const stretches = idle
    .map(([a, b]) => {
      const s0 = sessionOf(a);
      const s1 = sessionOf(Math.max(a, b - 1e-9));

      return { start: grid.dates[s0]!, end: grid.dates[s1]!, sessions: s1 - s0 + 1, minutes: b - a };
    })
    .sort((x, y) => y.minutes - x.minutes);

  return {
    baseline,
    window: windowKey,
    minutes,
    heldMinutes: lengthOf(held),
    reservedMinutes: lengthOf(reserved),
    idleMinutes: lengthOf(idle),
    heldShare: lengthOf(held) / minutes,
    reservedShare: lengthOf(reserved) / minutes,
    idleShare: lengthOf(idle) / minutes,
    sessions: rows.length,
    sessionsWithLotAtClose: rows.filter((row) => row.openLots > 0).length,
    lots: funded.filter((trade) => inWindow(trade, w)).length,
    idleStretches: stretches
  };
};

// ----- cross-ETF families and within-ETF episodes -----

export interface DecisionItem extends Item {
  key: string;
}

export const familiesOfView = (
  trades: readonly TradeRecord[],
  w: WindowIndex,
  window = levelD.familyWindow,
  prefix = 'F'
): Cluster<DecisionItem>[] =>
  anchorClusters(
    trades
      .filter((trade) => inWindow(trade, w))
      .map((trade) => ({
        symbol: trade.symbol,
        time: trade.decisionTime,
        session: trade.decisionIndex,
        key: `${trade.symbol}@${trade.decisionTime}`
      })),
    window,
    prefix
  );

export const familyIndex = (families: readonly Cluster<DecisionItem>[]) => {
  const index = new Map<string, Cluster<DecisionItem>>();

  for (const family of families) {
    for (const item of family.items) {
      index.set(item.key, family);
    }
  }

  return index;
};

// ----- per-ETF summary against one baseline -----

export interface ClassTotals {
  count: number;
  wins: number;
  losses: number;
  gross: number;
  interest: number;
  friction: number;
  net: number;
  occupiedDays: number;
  netPerOccupiedDay: number | null;
  worst: number | null;
  worstMae: number | null;
}

const totalsOf = (trades: readonly TradeRecord[]): ClassTotals => {
  const sum = (pick: (trade: TradeRecord) => number) =>
    trades.reduce((total, trade) => total + (Number.isFinite(pick(trade)) ? pick(trade) : 0), 0);
  const occupiedDays = sum((trade) => trade.occupiedDays);
  const net = sum((trade) => trade.net);

  return {
    count: trades.length,
    wins: trades.filter((trade) => trade.net > 0).length,
    losses: trades.filter((trade) => trade.net <= 0).length,
    gross: sum((trade) => trade.gross),
    interest: sum((trade) => trade.interest),
    friction: sum((trade) => trade.friction),
    net,
    occupiedDays,
    netPerOccupiedDay: occupiedDays > 0 ? net / occupiedDays : null,
    worst: trades.length > 0 ? Math.min(...trades.map((trade) => trade.net)) : null,
    worstMae:
      trades.length > 0
        ? Math.min(...trades.map((trade) => (Number.isFinite(trade.maeDollars) ? trade.maeDollars : 0)))
        : null
  };
};

export interface SymbolSummary {
  symbol: string;
  member: boolean;
  decisions: number;
  fills: number;
  closed: number;
  open: number;
  wins: number;
  losses: number;
  setupsArmed: number;
  deepSetups: number;
  continuationSetups: number;
  all: ClassTotals;
  busy: ClassTotals;
  busyHeld: number;
  busyReserved: number;
  busyDuringProfitableHolding: number;
  busyDuringLosingHolding: number;
  busyHolders: Record<string, number>;
  idleClean: ClassTotals;
  idleDisplacing: ClassTotals;
  firstOrder: { idleNet: number; displacedNet: number; delta: number; displaced: number };
  years: number;
  idleCleanYears: string[];
  idleCleanRegimes: Record<string, number>;
  idleCleanShock: number;
  idleCleanOffShock: number;
  idleCleanPositiveOffShock: number;
  families: number;
  soloFamilies: number;
  idleCleanFamilies: number;
  independentIdleClean: number;
  independentIdleCleanPositive: number;
  largestFamilyShareOfIdleCleanNet: number | null;
  idleCleanNetWithoutBestEpisode: number | null;
  positiveNetShareCompeting: number | null; // share of positive lot net in busy or idle-displacing trades
  classified: {
    key: string;
    class: string;
    holder?: string;
    holderState?: string;
    displaced: string[];
    family?: string;
  }[];
}

export const summarize = (
  symbol: string,
  member: boolean,
  trades: readonly TradeRecord[],
  setups: readonly SetupRecord[],
  funded: readonly GateTrade[],
  families: Map<string, Cluster<DecisionItem>>,
  dates: readonly string[],
  w: WindowIndex
): SymbolSummary => {
  const windowTrades = trades.filter((trade) => inWindow(trade, w));
  const classified: Classified[] = classify(windowTrades.map(gateTradeOf), funded);
  const byKey = new Map(windowTrades.map((trade) => [`${trade.symbol}@${trade.decisionTime}`, trade]));
  const pick = (cls: string) =>
    classified.filter((item) => item.class === cls).map((item) => byKey.get(item.trade.key)!);
  const busy = classified.filter((item) => item.class === 'busy');
  const idleClean = pick('idle-clean');
  const familyOf = (trade: TradeRecord) => families.get(`${trade.symbol}@${trade.decisionTime}`);
  const cleanFamilies = new Map<string, Cluster<DecisionItem>>();

  for (const trade of idleClean) {
    const family = familyOf(trade);

    if (family) {
      cleanFamilies.set(family.id, family);
    }
  }

  const positiveClean = idleClean.filter((trade) => trade.net > 0);
  const positiveFamilies = new Map<string, Cluster<DecisionItem>>();

  for (const trade of positiveClean) {
    const family = familyOf(trade);

    if (family) {
      positiveFamilies.set(family.id, family);
    }
  }

  const symbolFamilies = new Map<string, Cluster<DecisionItem>>();

  for (const trade of windowTrades) {
    const family = familyOf(trade);

    if (family) {
      symbolFamilies.set(family.id, family);
    }
  }

  // Concentration and the best-episode sensitivity (within-ETF signal episodes of the idle-clean trades).
  const cleanNet = idleClean.reduce((total, trade) => total + trade.net, 0);
  const familyNets = new Map<string, number>();

  for (const trade of idleClean) {
    const id = familyOf(trade)?.id ?? 'none';

    familyNets.set(id, (familyNets.get(id) ?? 0) + trade.net);
  }

  const positiveFamilyNet = [...familyNets.values()].filter((value) => value > 0);
  const episodes = anchorClusters(
    idleClean.map((trade) => ({ symbol, time: trade.decisionTime, session: trade.decisionIndex, net: trade.net })),
    levelD.episodeWindow,
    'E'
  );
  const episodeNets = episodes.map((episode) => episode.items.reduce((total, item) => total + item.net, 0));
  const best = episodeNets.length > 0 ? Math.max(...episodeNets) : null;
  const regimesOf: Record<string, number> = {};

  for (const trade of idleClean) {
    const regime = regimeOf(dates[trade.decisionIndex]!);

    regimesOf[regime] = (regimesOf[regime] ?? 0) + 1;
  }

  const positiveNet = windowTrades.filter((trade) => trade.net > 0).reduce((total, trade) => total + trade.net, 0);
  const competingPositive = classified
    .filter((item) => item.class !== 'idle-clean')
    .map((item) => byKey.get(item.trade.key)!)
    .filter((trade) => trade.net > 0)
    .reduce((total, trade) => total + trade.net, 0);
  const firstOrder = firstOrderOf(classified);
  const holders: Record<string, number> = {};

  for (const item of busy) {
    holders[item.holder!.symbol] = (holders[item.holder!.symbol] ?? 0) + 1;
  }

  const setupsInWindow = setups.filter((setup) => setup.activationIndex >= w.first && setup.activationIndex <= w.end);

  return {
    symbol,
    member,
    decisions: windowTrades.length,
    fills: windowTrades.filter((trade) => trade.entryIndex >= 0).length,
    closed: windowTrades.filter((trade) => !trade.open).length,
    open: windowTrades.filter((trade) => trade.open).length,
    wins: windowTrades.filter((trade) => trade.net > 0).length,
    losses: windowTrades.filter((trade) => trade.net <= 0).length,
    setupsArmed: setupsInWindow.length,
    deepSetups: setupsInWindow.filter((setup) => setup.kind === 'deep').length,
    continuationSetups: setupsInWindow.filter((setup) => setup.kind === 'continuation').length,
    all: totalsOf(windowTrades),
    busy: totalsOf(pick('busy')),
    busyHeld: busy.filter((item) => item.holderState === 'held by lot').length,
    busyReserved: busy.filter((item) => item.holderState === 'reserved').length,
    busyDuringProfitableHolding: busy.filter((item) => item.holder!.net > 0).length,
    busyDuringLosingHolding: busy.filter((item) => item.holder!.net <= 0).length,
    busyHolders: holders,
    idleClean: totalsOf(idleClean),
    idleDisplacing: totalsOf(pick('idle-displacing')),
    firstOrder: {
      idleNet: firstOrder.idleNet,
      displacedNet: firstOrder.displacedNet,
      delta: firstOrder.delta,
      displaced: firstOrder.displacedKeys.length
    },
    years: new Set(windowTrades.map((trade) => dates[trade.decisionIndex]!.slice(0, 4))).size,
    idleCleanYears: [...new Set(idleClean.map((trade) => dates[trade.decisionIndex]!.slice(0, 4)))].sort(),
    idleCleanRegimes: regimesOf,
    idleCleanShock: idleClean.filter((trade) => isShock(regimeOf(dates[trade.decisionIndex]!))).length,
    idleCleanOffShock: idleClean.filter((trade) => !isShock(regimeOf(dates[trade.decisionIndex]!))).length,
    idleCleanPositiveOffShock: idleClean.filter(
      (trade) => trade.net > 0 && !isShock(regimeOf(dates[trade.decisionIndex]!))
    ).length,
    families: symbolFamilies.size,
    soloFamilies: [...symbolFamilies.values()].filter((family) => family.symbols.length === 1).length,
    idleCleanFamilies: cleanFamilies.size,
    independentIdleClean: independentCount([...cleanFamilies.values()].map((family) => family.anchorSession)),
    independentIdleCleanPositive: independentCount(
      [...positiveFamilies.values()].map((family) => family.anchorSession)
    ),
    largestFamilyShareOfIdleCleanNet:
      positiveFamilyNet.length > 0
        ? Math.max(...positiveFamilyNet) / positiveFamilyNet.reduce((a, b) => a + b, 0)
        : null,
    idleCleanNetWithoutBestEpisode: best === null ? null : cleanNet - best,
    positiveNetShareCompeting: positiveNet > 0 ? competingPositive / positiveNet : null,
    classified: classified.map((item) => ({
      key: item.trade.key,
      class: item.class,
      holder: item.holder?.key,
      holderState: item.holderState,
      displaced: item.displaced.map((b) => b.key),
      family: families.get(item.trade.key)?.id
    }))
  };
};

// The Level D flags of PROTOCOL.md §9.1 (computed on U-T).
export const flagsOf = (summary: SymbolSummary, minClean: number, minIndependent: number) => ({
  T: summary.idleClean.count >= minClean && summary.independentIdleClean >= minIndependent,
  E: summary.idleClean.count > 0 && summary.idleClean.net > 0,
  breadth: summary.independentIdleCleanPositive >= minIndependent
});

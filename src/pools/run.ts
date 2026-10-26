// One run of a named pool on the canonical data: fixed (one shared funded slot, a constant notional per funded trade,
// never compounded) or portfolio (the 60/40 VOOG/VGT core, each funded trade borrowing a fraction of marked equity).
// The engine, the loader and the summary are exactly those that reproduced the frozen B4/B5 controls
// (src/portfolio-aware-d1/nbook/, src/joint-16-etf-d1/figures.ts summaryOf); this module only wires a pool config
// into them and derives the extra accounting the reports show. Nothing here writes a file.
import { lotDays, summaryOf } from '../joint-16-etf-d1/figures.ts';
import { type NRunResult, baseNRunConfig, runNAllocator } from '../portfolio-aware-d1/nbook/engine.ts';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import type { DatasetPartition, SplitEvent } from '#lib';
import type { DistributionLedger } from '../multi-etf-allocator/dataset.ts';
import type { LoadedPool } from './load.ts';

export type PoolMode = 'fixed' | 'portfolio';
export type Dividends = 'frozen' | 'symmetric';

export const poolDatasets = ['all', 'training', 'holdout', 'final'] as const;

export interface PoolRunOptions {
  mode: PoolMode;
  dataset: (typeof poolDatasets)[number];
  costBps: number;
  dividends: Dividends; // portfolio only: whether open VGT lots receive VGT distributions ('frozen') or not
  end?: string; // a diagnostic endpoint inside the dataset
  root?: string; // the data root (data/ by default)
  splits?: readonly SplitEvent[]; // default config/market-events/splits.json (forward runs add declared events)
  ledger?: DistributionLedger; // default config/market-events/distributions.csv (forward runs may add rows)
  rate?: number; // reporting-only scenario override of the pool's annual rate
  borrowedFraction?: number; // reporting-only scenario override of the portfolio's borrowed fraction
}

export const membersOf = (pool: LoadedPool, mode: PoolMode) => {
  const symbols = pool.config.books.map((book) => book.symbol);

  return mode === 'portfolio' ? [...new Set(['VOOG', 'VGT', ...symbols])] : symbols;
};

// An isolated holdout or final window starts flat after a warm-up of the books' longest lookback (as the
// portfolio-aware runner does); `all` and `training` start at the data's first session.
export const loadPoolUniverse = async (pool: LoadedPool, options: PoolRunOptions): Promise<LoadedUniverse> => {
  const warmup = Math.max(...Object.values(pool.phenotypes).map((book) => book.params.tickWindowSize));
  const loaded = await loadNUniverse({
    members: membersOf(pool, options.mode),
    partition: options.dataset as DatasetPartition,
    access: 'manual evaluation',
    warmupSessions: options.dataset === 'holdout' || options.dataset === 'final' ? warmup : 0,
    endDate: options.end,
    root: options.root,
    ...(options.splits ? { splits: options.splits } : {}),
    ...(options.ledger ? { ledger: options.ledger } : {})
  });
  const { dates, eligibilityIndex } = loaded.universe;
  const eligible = pool.config.execution.firstEligibleDate;

  if (dates[eligibilityIndex]! < eligible || (eligibilityIndex > 0 && dates[eligibilityIndex - 1]! >= eligible)) {
    throw new Error(`the universe's first eligible session ${dates[eligibilityIndex]} does not follow ${eligible}`);
  }

  return loaded;
};

export const runPoolOn = (pool: LoadedPool, loaded: LoadedUniverse, options: PoolRunOptions): NRunResult => {
  const { config } = pool;
  const members = membersOf(pool, options.mode);

  return runNAllocator(
    {
      ...loaded.universe,
      instruments: Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!]))
    },
    baseNRunConfig({
      key: `${config.id}-${options.mode}-${options.costBps}bps`,
      label: `${config.id} ${options.mode} ${options.costBps} bps`,
      mode: options.mode,
      symbols: config.books.map((book) => book.symbol),
      phenotypes: pool.phenotypes,
      costBps: options.costBps,
      fraction: options.borrowedFraction ?? config.portfolio.borrowedFraction,
      fixedPrincipal: config.funding.notionalPerTrade,
      rate: options.rate ?? config.interest.annualRate,
      stopFill: config.execution.stopFill,
      stopSlippageBps: config.execution.stopSlippageBps,
      lotDividends: options.dividends === 'frozen',
      initial: { voog: config.portfolio.initialCore.VOOG, vgt: config.portfolio.initialCore.VGT },
      eligibilityIndex: loaded.universe.eligibilityIndex,
      accountingStartIndex: loaded.warmup
    })
  );
};

const iso = (seconds: number) => (seconds > 0 ? new Date(seconds * 1000).toISOString() : '');

// New York wall-clock time of a UTC epoch second (the exchange's time zone).
export const newYork = (seconds: number) =>
  seconds > 0
    ? new Date(seconds * 1000)
        .toLocaleString('sv-SE', { timeZone: 'America/New_York', hour12: false })
        .replace(' ', 'T')
    : '';

// The per-lot ledger: prices before and after the per-side friction, shares, interest, friction dollars, marks.
export const lotRows = (result: NRunResult) => {
  const refusedBy = new Map<number, { count: number; symbols: Set<string> }>();

  for (const signal of result.signals) {
    if (signal.outcome !== 'refused') {
      continue;
    }

    const holder = result.lots.find(
      (lot) => lot.decisionTime <= signal.decisionTime && (lot.exitIndex < 0 || lot.exitTime >= signal.decisionTime)
    );

    if (holder) {
      const entry = refusedBy.get(holder.id) ?? { count: 0, symbols: new Set<string>() };

      entry.count++;
      entry.symbols.add(signal.symbol);
      refusedBy.set(holder.id, entry);
    }
  }

  const grants = new Map(
    result.signals
      .filter((signal) => signal.outcome === 'granted')
      .map((signal) => [`${signal.symbol}@${signal.decisionTime}`, signal])
  );

  return result.lots.map((lot) => {
    const open = lot.exitIndex < 0;
    const entryFriction = lot.shares * (lot.entryPrice - lot.entryRawPrice);
    const exitFriction = open ? 0 : lot.shares * (lot.exitRawPrice - lot.exitPrice);
    const grant = grants.get(`${lot.symbol}@${lot.decisionTime}`);
    const refused = refusedBy.get(lot.id);

    return {
      lot: lot.id,
      symbol: lot.symbol,
      phenotype: lot.trade.phenotype,
      virtualTrade: lot.trade.id,
      setup: lot.trade.setupKind,
      decisionUtc: iso(lot.decisionTime),
      decisionNewYork: newYork(lot.decisionTime),
      entryUtc: iso(lot.entryTime),
      entryNewYork: newYork(lot.entryTime),
      entryRawPrice: lot.entryRawPrice,
      entryPrice: lot.entryPrice,
      shares: lot.shares,
      principal: lot.originalPrincipal,
      exitUtc: open ? '' : iso(lot.exitTime),
      exitNewYork: open ? '' : newYork(lot.exitTime),
      exitRawPrice: open ? '' : lot.exitRawPrice,
      exitPrice: open ? '' : lot.exitPrice,
      exitReason: open ? 'open' : lot.exitReason,
      status: open ? 'open (marked at the last close)' : 'realized',
      lotDays: lotDays(result, lot),
      interest: lot.interest,
      frictionDollars: entryFriction + exitFriction,
      gross: lot.gross,
      net: lot.net,
      worstMark: lot.worstMark,
      worstMarkUtc: iso(lot.worstMarkTime),
      dividends: lot.dividends,
      sameMinuteCandidates: grant?.sameMinuteCandidates ?? '',
      refusedWhileHeld: refused?.count ?? 0,
      refusedSymbols: refused ? [...refused.symbols].sort().join(' ') : ''
    };
  });
};

export const signalRows = (result: NRunResult) =>
  result.signals.map((signal) => ({
    symbol: signal.symbol,
    phenotype: signal.phenotype,
    decisionUtc: iso(signal.decisionTime),
    decisionNewYork: newYork(signal.decisionTime),
    outcome: signal.outcome,
    reason: signal.reason,
    sameMinuteCandidates: signal.sameMinuteCandidates,
    occupiedBy: signal.occupiedBy,
    repeatedRefusals: signal.repeatedRefusals
  }));

export const dailyRows = (result: NRunResult) =>
  result.daily.map((row) => ({
    date: row.date,
    strategyMark: row.strategyMark,
    realized: row.realized,
    unrealized: row.unrealized,
    cumulativeInterest: row.cumulativeInterest,
    openLots: row.openLots,
    owners: row.owners,
    ...(result.config.mode === 'portfolio'
      ? {
          equity: row.equity,
          principal: row.principal,
          voogShares: row.voogShares,
          vgtCoreShares: row.vgtCoreShares,
          cumulativeDividends: row.cumulativeDividends
        }
      : {})
  }));

// The calendar-year attribution of one continuous run (state carried across years).
export const periodRows = (result: NRunResult, key: (date: string) => string, initialEquity = 0) => {
  const rows: {
    period: string;
    first: string;
    last: string;
    strategyChange: number;
    equityChange: number;
    lotsEntered: number;
    interest: number;
  }[] = [];
  const { daily } = result;
  const start = result.config.accountingStartIndex ?? 0;
  let previous = start > 0 ? daily[start - 1]! : undefined;

  for (let index = start; index < daily.length; index++) {
    const row = daily[index]!;
    const period = key(row.date);
    let current = rows.at(-1);

    if (!current || current.period !== period) {
      current = {
        period,
        first: row.date,
        last: row.date,
        strategyChange: 0,
        equityChange: 0,
        lotsEntered: 0,
        interest: 0
      };
      rows.push(current);
    }

    current.last = row.date;
    current.strategyChange += row.strategyMark - (previous?.strategyMark ?? 0);
    current.equityChange += row.equity - (previous?.equity ?? initialEquity);
    current.interest += row.cumulativeInterest - (previous?.cumulativeInterest ?? 0);
    previous = row;
  }

  for (const lot of result.lots) {
    const date = result.universe.dates[lot.entryIndex]!;
    const row = rows.find((item) => item.first <= date && date <= item.last);

    if (row) {
      row.lotsEntered++;
    }
  }

  return rows;
};

export const figuresOf = (pool: LoadedPool, loaded: LoadedUniverse, result: NRunResult, options: PoolRunOptions) => {
  const summary = summaryOf(result);
  const lots = lotRows(result);
  const notional = pool.config.funding.notionalPerTrade;
  const closed = result.lots.filter((lot) => lot.exitIndex >= 0);
  const open = result.lots.filter((lot) => lot.exitIndex < 0);
  const refused = result.signals.filter((signal) => signal.outcome === 'refused');
  const refusalReasons: Record<string, number> = {};

  // "pool occupied (VGT lot 10)" → "pool occupied by a VGT lot"; "pool occupied (KRE pending order)" → "… order".
  for (const signal of refused) {
    const holder = signal.reason.match(/^(.*?) \((\S+) (lot|pending order)/);
    const reason = holder
      ? `${holder[1]} by a ${holder[2]} ${holder[3] === 'lot' ? 'lot' : 'pending order'}`
      : signal.reason;

    refusalReasons[reason] = (refusalReasons[reason] ?? 0) + 1;
  }

  // The single funded slot: every lot carries the same notional and no two lots overlap.
  const ordered = [...result.lots].sort((a, b) => a.entryTime - b.entryTime);
  const overlaps = ordered.filter(
    (lot, index) => index > 0 && (ordered[index - 1]!.exitIndex < 0 || ordered[index - 1]!.exitTime > lot.decisionTime)
  ).length;
  const notionalViolations = result.lots.filter((lot) => lot.originalPrincipal !== notional).length;
  // Time in market counts the sessions from the first eligible one (no book can trade before it).
  const eligibleDate = loaded.universe.dates[Math.max(loaded.universe.eligibilityIndex, loaded.warmup)]!;
  const eligibleRows = result.daily.filter((row) => row.date >= eligibleDate);
  const sessions = eligibleRows.length;
  const heldSessions = eligibleRows.filter((row) => row.openLots > 0).length;
  const bySymbol: Record<string, { lots: number; net: number; wins: number; lotDays: number; refusals: number }> = {};

  for (const book of pool.config.books) {
    bySymbol[book.symbol] = { lots: 0, net: 0, wins: 0, lotDays: 0, refusals: 0 };
  }

  for (const lot of result.lots) {
    const item = bySymbol[lot.symbol]!;

    item.lots++;
    item.net += lot.net;
    item.wins += lot.net > 0 ? 1 : 0;
    item.lotDays += lotDays(result, lot);
  }

  for (const signal of refused) {
    bySymbol[signal.symbol]!.refusals++;
  }

  const last = result.daily.at(-1)!;
  const portfolio = options.mode === 'portfolio';

  return {
    summary,
    figures: {
      virtualTrades: result.trades.length,
      decisions: result.signals.length,
      granted: result.signals.length - refused.length,
      refused: refused.length,
      refusalReasons,
      sameMinuteDecisions: result.signals.filter((signal) => signal.sameMinuteCandidates > 1).length,
      fundedLots: result.lots.length,
      closedLots: closed.length,
      openLots: open.length,
      openPosition: open.map((lot) => ({
        symbol: lot.symbol,
        entryUtc: iso(lot.entryTime),
        entryPrice: lot.entryPrice,
        shares: lot.shares,
        markNet: lot.net
      })),
      realized: closed.reduce((total, lot) => total + lot.net, 0),
      unrealized: open.reduce((total, lot) => total + lot.net, 0),
      net: summary.net,
      interest: summary.interest,
      frictionDollars: lots.reduce((total, lot) => total + lot.frictionDollars, 0),
      costBpsPerSide: options.costBps,
      notionalPerTrade: notional,
      notionalViolations,
      overlappingLots: overlaps,
      maxSimultaneousFundedLots: Math.max(0, ...result.daily.map((row) => row.openLots)),
      sessions,
      heldSessions,
      timeInMarket: sessions > 0 ? heldSessions / sessions : 0,
      borrowingDollarDays: summary.borrowingDollarDays,
      netPerMillionBorrowingDollarDays:
        summary.borrowingDollarDays > 0 ? (summary.net / summary.borrowingDollarDays) * 1e6 : NaN,
      minuteDrawdown: summary.minuteDrawdown,
      minuteDrawdownPeakUtc: iso(summary.minuteDrawdownPeak),
      minuteDrawdownTroughUtc: iso(summary.minuteDrawdownTrough),
      dailyDrawdown: summary.dailyDrawdown,
      initialEquity: portfolio ? pool.config.portfolio.initialCore.VOOG + pool.config.portfolio.initialCore.VGT : NaN,
      endEquity: portfolio ? last.equity : NaN,
      dailyPercentDrawdown: portfolio ? summary.dailyPercent : NaN,
      dailyPercentPeakUtc: portfolio ? iso(summary.dailyPercentPeak) : '',
      dailyPercentTroughUtc: portfolio ? iso(summary.dailyPercentTrough) : '',
      minutePercentDrawdown: portfolio ? summary.minutePercent : NaN,
      cumulativeDividends: portfolio ? last.cumulativeDividends : 0,
      dividends: portfolio ? options.dividends : 'none (fixed pool: price-only lots)',
      minuteDrawdownPercentOfNotional: portfolio ? NaN : summary.minuteDrawdown / notional,
      dailyDrawdownPercentOfNotional: portfolio ? NaN : summary.dailyDrawdown / notional,
      worstLot: summary.worstLot,
      bySymbol
    },
    lots
  };
};

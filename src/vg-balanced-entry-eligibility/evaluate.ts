// One evaluation (PROTOCOL.md §6–§10): a Spec on an opened door through the adapter, reduced to a compact record (the
// figures every stage needs, the funded-lot signature and a compact lot list for matching) or, on demand, the full
// detail (every funded lot, late trade, opportunity, transition, refused signal and daily mark).
import { createHash } from 'node:crypto';
import type { LoadedPool } from '../pools/load.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import type { BookPhenotype } from '../portfolio-aware-d1/nbook/engine.ts';
import { chronology, notional, reportPeriods, symbols } from './context.ts';
import { controlConfig } from './control.ts';
import type { OpenedDoor } from './data.ts';
import { type VRunResult, runVariant } from './engine.ts';
import { type Spec, applySpec } from './specs.ts';

const iso = (seconds: number) =>
  Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : '';
const cents = (value: number) => Math.round(value * 100);

export const configOf = (pool: LoadedPool, door: OpenedDoor, spec: Spec) => {
  const phenotypes: Record<string, BookPhenotype> | undefined = spec.d1
    ? Object.fromEntries(
        symbols.map((symbol) => [symbol, candidateBook(symbol, pool.phenotypes[symbol]!.name, spec.d1![symbol])])
      )
    : undefined;
  const base = controlConfig(pool, door.loaded, {
    ...(spec.friction?.costBps !== undefined ? { costBps: spec.friction.costBps } : {}),
    ...(spec.friction?.rate !== undefined ? { rate: spec.friction.rate } : {}),
    ...(spec.friction?.stopFill ? { stopFill: spec.friction.stopFill } : {}),
    ...(spec.friction?.stopSlippageBps !== undefined ? { stopSlippageBps: spec.friction.stopSlippageBps } : {}),
    ...(phenotypes ? { phenotypes } : {})
  });

  return { ...applySpec(base, spec), periods: reportPeriods };
};

export const run = (pool: LoadedPool, door: OpenedDoor, spec: Spec) =>
  runVariant(door.loaded.universe, configOf(pool, door, spec));

export const signatureOf = (result: Pick<VRunResult, 'lots'>) =>
  createHash('sha256')
    .update(
      result.lots
        .map(
          (lot) =>
            `${lot.symbol}|${lot.entryTime}|${lot.exitIndex >= 0 ? lot.exitTime : 'open'}|${lot.exitReason}|${cents(lot.net)}`
        )
        .join('\n')
    )
    .digest('hex');

const isLate = (lot: VRunResult['lots'][number]) => 'opportunityId' in lot.trade;

// Marked-equity change over a period and its reset minute drawdown.
export const periodFigures = (result: VRunResult) => {
  const { daily } = result;
  const out: Record<
    string,
    {
      first: string;
      last: string;
      pnl: number;
      startValue: number;
      endValue: number;
      dd: number;
      ddPeakUtc: string;
      ddTroughUtc: string;
      sessions: number;
      lotsEntered: number;
      lateEntered: number;
    }
  > = {};
  const dates = result.universe.dates;

  for (const period of reportPeriods) {
    const inside = daily.filter((row) => row.date >= period.first && row.date <= period.last);

    if (inside.length === 0) continue;

    const before = daily.filter((row) => row.date < period.first).at(-1);
    const startValue = before?.strategyMark ?? 0;
    const endValue = inside.at(-1)!.strategyMark;
    const tracker = result.periodDrawdowns[period.name];
    const entered = result.lots.filter((lot) => {
      const date = dates[lot.entryIndex]!;

      return date >= period.first && date <= period.last;
    });

    out[period.name] = {
      first: inside[0]!.date,
      last: inside.at(-1)!.date,
      pnl: endValue - startValue,
      startValue,
      endValue,
      dd: tracker?.maximum ?? NaN,
      ddPeakUtc: iso(tracker?.peakTime ?? NaN),
      ddTroughUtc: iso(tracker?.troughTime ?? NaN),
      sessions: inside.length,
      lotsEntered: entered.length,
      lateEntered: entered.filter(isLate).length
    };
  }

  return out;
};

export interface EvalRecord {
  spec: Spec;
  door: string;
  lastSession: string;
  net: number;
  realized: number;
  unrealized: number;
  grossBeforeCosts: number;
  friction: number;
  interest: number;
  dd: number;
  ddPeakUtc: string;
  ddTroughUtc: string;
  ddRecoveryUtc: string;
  dailyDd: number;
  lots: number;
  openLots: number;
  wins: number;
  losses: number;
  totalLosses: number;
  largestWin: number;
  largestLoss: number;
  late: number;
  lateNet: number;
  bySymbol: Record<string, { lots: number; net: number; late: number; lateNet: number; refusals: number }>;
  signals: number;
  refusals: number;
  heldSessions: number;
  eligibleSessions: number;
  exposure: number;
  lotDays: number;
  periods: ReturnType<typeof periodFigures>;
  transitions: Record<string, number>;
  opportunities: {
    armed: number;
    filled: number;
    expired: number;
    cancelledShadow: number;
    cancelledInvalid: number;
    liveAtEnd: number;
  };
  signature: string;
  compactLots: {
    symbol: string;
    late: boolean;
    entryUtc: string;
    exitUtc: string;
    exitReason: string;
    net: number;
    decisionUtc: string;
    originUtc: string;
  }[];
  seconds: number;
}

export const recordOf = (door: OpenedDoor, spec: Spec, result: VRunResult, seconds: number): EvalRecord => {
  const closed = result.lots.filter((lot) => lot.exitIndex >= 0);
  const open = result.lots.filter((lot) => lot.exitIndex < 0);
  const realized = closed.reduce((total, lot) => total + lot.net, 0);
  const unrealized = open.reduce((total, lot) => total + lot.net, 0);
  const friction = result.lots.reduce(
    (total, lot) =>
      total +
      lot.shares * (lot.entryPrice - lot.entryRawPrice) +
      (lot.exitIndex >= 0 ? lot.shares * (lot.exitRawPrice - lot.exitPrice) : 0),
    0
  );
  const grossBeforeCosts = result.lots.reduce(
    (total, lot) => total + lot.shares * (lot.exitRawPrice - lot.entryRawPrice),
    0
  );
  const interest = result.lots.reduce((total, lot) => total + lot.interest, 0);
  const nets = closed.map((lot) => lot.net);
  const dates = result.universe.dates;
  const eligibleDate = dates[result.config.eligibilityIndex ?? result.universe.eligibilityIndex]!;
  const eligibleRows = result.daily.filter((row) => row.date >= eligibleDate);
  const late = result.lots.filter(isLate);
  const bySymbol: EvalRecord['bySymbol'] = {};

  for (const symbol of symbols) {
    const mine = result.lots.filter((lot) => lot.symbol === symbol);
    const myLate = mine.filter(isLate);

    bySymbol[symbol] = {
      lots: mine.length,
      net: mine.reduce((total, lot) => total + lot.net, 0),
      late: myLate.length,
      lateNet: myLate.reduce((total, lot) => total + lot.net, 0),
      refusals: result.signals.filter((signal) => signal.symbol === symbol && signal.outcome === 'refused').length
    };
  }

  const transitions: Record<string, number> = {};

  for (const t of result.transitions) transitions[t.kind] = (transitions[t.kind] ?? 0) + 1;

  const end = result.universe.dates[result.endIndex]!;
  const lastTime = result.universe.instruments.VGT!.ds.sCloseTime[result.endIndex]!;
  const lotDays = result.lots.reduce(
    (total, lot) => total + ((lot.exitIndex >= 0 ? lot.exitTime : lastTime) - lot.entryTime) / 86400,
    0
  );

  return {
    spec,
    door: door.door,
    lastSession: end,
    net: realized + unrealized,
    realized,
    unrealized,
    grossBeforeCosts,
    friction,
    interest,
    dd: result.minuteDrawdown.maximum,
    ddPeakUtc: iso(result.minuteDrawdown.peakTime),
    ddTroughUtc: iso(result.minuteDrawdown.troughTime),
    ddRecoveryUtc: iso(result.minuteDrawdown.recoveryTime),
    dailyDd: result.dailyDrawdown.maximum,
    lots: result.lots.length,
    openLots: open.length,
    wins: nets.filter((n) => n > 0).length,
    losses: nets.filter((n) => n < 0).length,
    totalLosses: nets.filter((n) => n < 0).reduce((a, b) => a + b, 0),
    largestWin: nets.length ? Math.max(...nets) : 0,
    largestLoss: nets.length ? Math.min(...nets) : 0,
    late: late.length,
    lateNet: late.reduce((total, lot) => total + lot.net, 0),
    bySymbol,
    signals: result.signals.length,
    refusals: result.signals.filter((signal) => signal.outcome === 'refused').length,
    heldSessions: eligibleRows.filter((row) => row.openLots > 0).length,
    eligibleSessions: eligibleRows.length,
    exposure: eligibleRows.length ? eligibleRows.filter((row) => row.openLots > 0).length / eligibleRows.length : 0,
    lotDays,
    periods: periodFigures(result),
    transitions,
    opportunities: {
      armed: result.opportunities.length,
      filled: result.opportunities.filter((o) => o.status === 'filled').length,
      expired: result.opportunities.filter((o) => o.status === 'expired').length,
      cancelledShadow: result.opportunities.filter(
        (o) => o.status === 'cancelled' && o.endReason.startsWith('originating')
      ).length,
      cancelledInvalid: result.opportunities.filter(
        (o) => o.status === 'cancelled' && o.endReason.startsWith('setup invalidated')
      ).length,
      liveAtEnd: result.opportunities.filter((o) => o.status === 'live at end' || o.status === 'selected').length
    },
    signature: signatureOf(result),
    compactLots: result.lots.map((lot) => ({
      symbol: lot.symbol,
      late: isLate(lot),
      entryUtc: iso(lot.entryTime),
      exitUtc: lot.exitIndex >= 0 ? iso(lot.exitTime) : 'open',
      exitReason: lot.exitIndex >= 0 ? lot.exitReason : 'open',
      net: lot.net,
      decisionUtc: iso(lot.decisionTime),
      originUtc: isLate(lot) ? iso((lot.trade as unknown as { originTime: number }).originTime) : ''
    })),
    seconds
  };
};

// The full detail of one evaluation (selected configurations only).
export const detailOf = (door: OpenedDoor, spec: Spec, result: VRunResult) => {
  const dates = result.universe.dates;
  const ds = (symbol: string) => result.universe.instruments[symbol]!.ds;

  return {
    record: recordOf(door, spec, result, NaN),
    lots: result.lots.map((lot) => {
      const trade = lot.trade as unknown as Record<string, number>;
      const late = 'opportunityId' in lot.trade;

      return {
        lot: lot.id,
        symbol: lot.symbol,
        kind: late ? 'late (delayed entry)' : 'fresh',
        setup: lot.trade.setupKind,
        setupId: lot.trade.setupId,
        opportunity: late ? trade.opportunityId : '',
        originDecisionUtc: late ? iso(trade.originTime!) : '',
        originDecisionPrice: late ? trade.originPrice : '',
        originTrigger: late ? trade.originTrigger : '',
        ageAtDecisionSessions: late ? trade.ageAtDecision : '',
        decisionUtc: iso(lot.decisionTime),
        decisionPrice: lot.decisionPrice,
        entryUtc: iso(lot.entryTime),
        entryDate: dates[lot.entryIndex],
        entryExecution: lot.entryExecution,
        entryRawPrice: lot.entryRawPrice,
        entryPrice: lot.entryPrice,
        shares: lot.shares,
        principal: lot.originalPrincipal,
        exitUtc: lot.exitIndex >= 0 ? iso(lot.exitTime) : 'open',
        exitDate: lot.exitIndex >= 0 ? dates[lot.exitIndex] : '',
        exitReason: lot.exitIndex >= 0 ? lot.exitReason : 'open',
        exitExecution: lot.exitIndex >= 0 ? lot.exitExecution : '',
        exitRawPrice: lot.exitRawPrice,
        exitPrice: lot.exitIndex >= 0 ? lot.exitPrice : '',
        sessionsHeld: (lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex) - lot.entryIndex,
        calendarDaysHeld:
          ((lot.exitIndex >= 0 ? lot.exitTime : ds(lot.symbol).sCloseTime[result.endIndex]!) - lot.entryTime) / 86400,
        grossPnl: lot.gross,
        interest: lot.interest,
        friction:
          lot.shares * (lot.entryPrice - lot.entryRawPrice) +
          (lot.exitIndex >= 0 ? lot.shares * (lot.exitRawPrice - lot.exitPrice) : 0),
        net: lot.net,
        status: lot.exitIndex >= 0 ? 'realized' : 'open (marked at the last close)',
        mae: lot.worstMark,
        maeUtc: iso(lot.worstMarkTime),
        notional
      };
    }),
    opportunities: result.opportunities.map((o) => ({
      ...o,
      originUtc: iso(o.originTime),
      endUtc: iso(o.endTime),
      firstFreeUtc: iso(o.firstFreeTime),
      selectedUtc: iso(o.selectedTime)
    })),
    transitions: result.transitions.map((t) => ({ ...t, utc: iso(t.time) })),
    refused: result.signals
      .filter((signal) => signal.outcome === 'refused')
      .map((signal) => ({
        symbol: signal.symbol,
        setupKind: signal.setupKind,
        setupId: signal.setupId,
        decisionUtc: iso(signal.decisionTime),
        decisionPrice: signal.decisionPrice,
        reason: signal.reason,
        occupiedBy: signal.occupiedBy
      })),
    daily: result.daily.map((row) => ({
      date: row.date,
      equity: row.strategyMark,
      realized: row.realized,
      unrealized: row.unrealized,
      openLots: row.openLots,
      owners: row.owners
    })),
    minuteDrawdown: {
      ...result.minuteDrawdown,
      peakUtc: iso(result.minuteDrawdown.peakTime),
      troughUtc: iso(result.minuteDrawdown.troughTime),
      recoveryUtc: iso(result.minuteDrawdown.recoveryTime)
    },
    window: { first: dates[0], last: dates[result.endIndex], validationStart: chronology.validationStart }
  };
};

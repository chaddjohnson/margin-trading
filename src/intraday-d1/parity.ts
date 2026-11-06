// Parity P1 (RULE_PARITY_DESIGN.md §5): the engine in session-clock mode, costs 0, no arming date, against the
// canonical D1 file run on the same bytes. The comparison reads the D1 file's own trades.csv and summary.json.
import fs from 'fs-extra';
import { simulate, type ExecutionSettings, type StopFill, type RunResult } from './engine.ts';
import type { Market } from './periods.ts';
import { sessionClock } from './periods.ts';
import type { MarketSession } from '#types';
import { dailyPrimary, execution } from './context.ts';

export interface D1Trade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  reason: string;
  interest: number;
  profit: number;
  entryTime: string;
  exitTime: string;
  entryExecution: string;
  exitExecution: string;
  setupKind: string;
}

export const readD1Trades = (file: string): D1Trade[] => {
  const [header, ...rows] = fs.readFileSync(file, 'utf8').trim().split('\n');
  const columns = header!.split(',');
  const at = (row: string[], name: string) => row[columns.indexOf(name)]!;

  return rows.map((line) => {
    const row = line.split(',');

    return {
      entryDate: at(row, 'entry_date'),
      exitDate: at(row, 'exit_date'),
      entryPrice: Number(at(row, 'entry_price')),
      exitPrice: Number(at(row, 'exit_price')),
      reason: at(row, 'reason'),
      interest: Number(at(row, 'interest')),
      profit: Number(at(row, 'profit')),
      entryTime: at(row, 'entry_time'),
      exitTime: at(row, 'exit_time'),
      entryExecution: at(row, 'entry_execution'),
      exitExecution: at(row, 'exit_execution'),
      setupKind: at(row, 'setup_kind')
    };
  });
};

export const dailyPrimaryParams = {
  targetPercentChange: dailyPrimary.targetPercentChange,
  trailingBuyPercentage: dailyPrimary.trailingBuyPercentage,
  trailingStopPercentage: dailyPrimary.trailingStopPercentage,
  holdSeconds: dailyPrimary.maximumHoldDays * 86400,
  lookbackPeriods: dailyPrimary.tickWindowSize,
  intradayLossBuffer: dailyPrimary.intradayLossBuffer,
  pullback: dailyPrimary.pullback,
  continuationPeriods: dailyPrimary.continuationWindow
};

export const parityRun = (market: Market, sessions: readonly MarketSession[], stopFill: StopFill): RunResult => {
  const settings: ExecutionSettings = {
    principal: execution.principal,
    rate: execution.rate,
    costBps: 0,
    stopFill,
    stopSlippageBps: 0
  };

  return simulate(market, sessionClock(market, sessions), dailyPrimaryParams, settings, {
    armFromSession: 0,
    endSession: sessions.length - 1
  });
};

const iso = (t: number) => new Date(t * 1000).toISOString();

// Every mismatch between the engine's lots and the D1 file's trades (empty = identical).
export const compareWithD1 = (result: RunResult, sessions: readonly MarketSession[], trades: D1Trade[]) => {
  const problems: string[] = [];
  const closed = result.lots.filter((lot) => !lot.open);

  if (closed.length !== trades.length) {
    problems.push(`closed lots ${closed.length} vs D1 trades ${trades.length}`);
  }

  closed.forEach((lot, index) => {
    const trade = trades[index];

    if (!trade) return;

    const checks: [string, unknown, unknown][] = [
      ['entry date', sessions[lot.entrySession]!.date, trade.entryDate],
      ['exit date', sessions[lot.exitSession]!.date, trade.exitDate],
      ['entry time', iso(lot.entryTime), trade.entryTime],
      ['exit time', iso(lot.exitTime), trade.exitTime],
      ['entry price', lot.entryPrice, trade.entryPrice],
      ['exit price', lot.exitPrice, trade.exitPrice],
      ['reason', lot.exitReason, trade.reason],
      ['entry execution', lot.entryExecution, trade.entryExecution],
      ['exit execution', lot.exitExecution, trade.exitExecution],
      ['kind', lot.setupKind, trade.setupKind],
      ['interest', lot.interest, trade.interest],
      ['profit', lot.net, trade.profit]
    ];

    for (const [name, mine, theirs] of checks) {
      const equal = typeof mine === 'number' ? Object.is(mine, theirs) || mine === theirs : mine === theirs;

      if (!equal) problems.push(`trade ${index + 1} ${name}: engine ${String(mine)} vs D1 ${String(theirs)}`);
    }
  });

  return problems;
};

// Parity P2/P3: the engine against Study 8's own per-book trace (src/portfolio-aware-d1/trace.ts `traceBook`: the
// verified ShadowBook and D1 machines with Study 8's cost convention). For the intraday clock every period is fed to
// the machines as a "session" whose timestamp is the trading-minute clock, so the machines' calendar-day hold becomes
// the hold in trading time; interest must then be 0 (the machines would count it on that clock). For the session
// clock the timestamps are the calendar ones and interest is compared too.
import type { Clock } from './periods.ts';
import type { EngineParams, ExecutionSettings as Settings, Lot } from './engine.ts';
import { fixtureDataset } from '../four-family/data.ts';
import { traceBook } from '../portfolio-aware-d1/trace.ts';
import type { StrategyParams } from '../shared-margin-portfolio/strategy.ts';
import type { Tick } from '#types';

export const periodSessions = (market: Market, sessions: readonly MarketSession[], clock: Clock): MarketSession[] => {
  const { bars } = market;
  const out: MarketSession[] = [];

  for (let p = 0; p < clock.count; p++) {
    const s = clock.session[p]!;
    const ticks: Tick[] = [];

    for (let b = clock.barStart[p]!; b < clock.barEnd[p]!; b++) {
      ticks.push({
        time: bars.time[b]!,
        open: bars.open[b]!,
        high: bars.high[b]!,
        low: bars.low[b]!,
        close: bars.close[b]!,
        volume: 0,
        trades: NaN
      });
    }

    const print = clock.closingPrint[p]!;

    out.push({
      ...ticks[0]!,
      date: sessions[s]!.date,
      time: clock.t[p]!,
      openTime: sessions[s]!.openTime,
      closeTime: clock.closeTime[p]!,
      isEarlyClose: sessions[s]!.isEarlyClose,
      bars: ticks,
      ...(Number.isNaN(print) ? {} : { closingPrint: print }),
      open: clock.open[p]!,
      high: clock.high[p]!,
      low: clock.low[p]!,
      close: clock.close[p]!,
      volume: 0
    });
  }

  return out;
};

export const machineParams = (params: EngineParams): StrategyParams => ({
  key: 'd1',
  label: 'intraday parity',
  entryMode: 'deep',
  postExit: true,
  stopPolicy: 'net',
  targetPercentChange: params.targetPercentChange,
  tickWindowSize: params.lookbackPeriods,
  trailingBuyPercentage: params.trailingBuyPercentage,
  trailingStopPercentage: params.trailingStopPercentage,
  maximumHoldDays: params.holdSeconds / 86400,
  intradayLossBuffer: params.intradayLossBuffer,
  pullback: params.pullback,
  continuationWindow: params.continuationPeriods,
  swingLookback: NaN,
  swingProximity: NaN
});

// Runs both and lists every difference (empty = identical, compared with Object.is).
export const compareWithStudy8Trace = (
  market: Market,
  sessions: readonly MarketSession[],
  clock: Clock,
  params: EngineParams,
  settings: Settings,
  armFromSession: number
) => {
  if (settings.stopFill === 'minute-low') throw new Error('the Study 8 machines have no minute-low fill');

  const asSessions = clock.name === 'session' ? [...sessions] : periodSessions(market, sessions, clock);
  const ds = fixtureDataset(asSessions);
  const armPeriod = clock.firstOfSession[armFromSession]!;
  const trace = traceBook(
    ds,
    { symbol: 'VGT', name: 'primary', params: machineParams(params), short: 'parity' },
    {
      costBps: settings.costBps,
      rate: settings.rate,
      stopFill: settings.stopFill,
      stopSlippageBps: settings.stopSlippageBps,
      notional: settings.principal
    },
    { armStart: armPeriod, startIndex: 0, endIndex: asSessions.length - 1, splitsSha256: '' }
  );
  const mine = simulate(market, clock, params, settings, { armFromSession, endSession: sessions.length - 1 });
  const problems: string[] = [];
  // Study 8's trace records a trade at the decision; one decided in the run's last period and never filled
  // (entryIndex −1) is the engine's (and D1's) "pending at end" setup, never a lot (amendment A1).
  const unfilled = trace.trades.filter((t) => t.entryIndex < 0);
  const theirs = trace.trades.filter((t) => t.entryIndex >= 0);

  if (unfilled.length !== (mine.setupsAtEnd === 'pending' ? 1 : 0)) {
    problems.push(`unfilled orders at the end: Study 8 trace ${unfilled.length}, engine pending ${mine.setupsAtEnd}`);
  }

  if (mine.lots.length !== theirs.length) problems.push(`lots ${mine.lots.length} vs Study 8 trace ${theirs.length}`);

  mine.lots.forEach((lot: Lot, index) => {
    const t = theirs[index];

    if (!t) return;

    const checks: [string, number | string, number | string][] = [
      ['entry period', lot.entryPeriod, t.entryIndex],
      ['entry time', lot.entryTime, t.entryTime],
      ['entry raw', lot.entryRaw, t.entryRawPrice],
      ['entry price', lot.entryPrice, t.entryPrice],
      ['kind', lot.setupKind, t.setupKind],
      ['exit period', lot.open ? -1 : lot.exitPeriod, t.exitIndex],
      ['exit time', lot.open ? NaN : lot.exitTime, t.exitTime],
      ['exit raw', lot.exitRaw, t.exitRawPrice],
      ['exit price', lot.open ? NaN : lot.exitPrice, t.exitPrice],
      ['reason', lot.open ? 'open' : lot.exitReason, t.exitReason],
      ['interest', lot.interest, t.interest],
      ['net', lot.net, t.net]
    ];

    for (const [name, a, b] of checks) {
      if (!Object.is(a, b)) problems.push(`lot ${index + 1} ${name}: engine ${String(a)} vs Study 8 ${String(b)}`);
    }
  });

  return { problems, lots: mine.lots.length, net: mine.net };
};

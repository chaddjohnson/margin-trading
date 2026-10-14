// Independent validation of the minute implementation of src/app/allIn.ts.
//
// 1. Synthetic checks of evaluateSessionExit and firstTradeFrom, one per exit path.
// 2. An independent re-simulation from the raw minute file: its own line parsing, New York time from the
//    US daylight-saving rule instead of Intl, its own session grouping and its own strategy loop. Every
//    trade, the restriction episodes, the daily mark to market and both drawdowns must match the run's
//    output files.
// 3. Chronological assertions on the run's output against the raw bars: entry decision and fill minutes,
//    the 90-session reference high, stop levels and activation, stop triggers, maximum-hold exits,
//    interest, material-loss classification, recovery resets and the open position at the end.
//
// Usage: node --experimental-transform-types scripts/validate.ts <minute csv> <run output dir> <report json> [stop fill]
import type { BacktestPosition, MarketSession, Tick } from '#types';
import { PositionType } from '#types';
import { evaluateSessionExit, firstTradeFrom } from '../../../../src/app/allIn.ts';
import fs from 'fs-extra';

const [, , minuteFile = '', runDir = '', reportFile = '', stopFill = 'stop'] = process.argv;
const failures: string[] = [];
const checks: Record<string, number> = {};
const check = (name: string, condition: boolean, detail: string) => {
  checks[name] = (checks[name] ?? 0) + 1;

  if (!condition) {
    failures.push(`${name}: ${detail}`);
  }
};
const close = (a: number, b: number, tolerance = 1e-6) => Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b));

// 1. Synthetic exit paths. One share bought at 100 for 100 (shares are scaled by 1000 for readability).
{
  const position: BacktestPosition = {
    isOpen: true,
    symbol: 'TEST',
    type: PositionType.Long,
    shares: 1000,
    investment: 100000,
    entryTimestamp: 0,
    entryPrice: 100
  };
  const day = 86400;
  const bar = (minute: number, open: number, high: number, low: number, closePrice: number): Tick => ({
    time: 20 * day + 14 * 3600 + minute * 60,
    open,
    high,
    low,
    close: closePrice,
    volume: 100,
    trades: NaN
  });
  const sessionOf = (bars: Tick[], closingPrint?: number, daysAfterEntry = 20): MarketSession => ({
    date: 'test',
    time: daysAfterEntry * day,
    openTime: bars[0]!.time,
    closeTime: bars[0]!.time + 390 * 60,
    isEarlyClose: false,
    bars,
    closingPrint,
    open: bars[0]!.open,
    high: Math.max(...bars.map((b) => b.high)),
    low: Math.min(...bars.map((b) => b.low)),
    close: closingPrint ?? bars.at(-1)!.close,
    volume: 0,
    trades: NaN
  });
  const run = (session: MarketSession, stopPrice: number, interest = 0, fill: 'stop' | 'next-open' = 'stop') =>
    evaluateSessionExit({ position, session, stopPrice, interest, maximumHoldDays: 15, stopFill: fill });

  // Gap through an active stop fills at the opening trade.
  const gap = run(sessionOf([bar(0, 104, 106, 103, 105), bar(1, 105, 105, 104, 104)]), 105);
  check('synthetic', gap?.reason === 'trailing stop gap' && gap.price === 104 && gap.barIndex === 0, 'gap');
  // A gap below breakeven with the maximum hold also due: the resting stop still fills at the open.
  const gapDue = run(sessionOf([bar(0, 99, 100, 98, 99), bar(1, 98, 98, 97, 97)]), 101);
  check('synthetic', gapDue?.reason === 'trailing stop gap' && gapDue.isMaximumHoldDue, 'gap with maximum hold due');
  // Maximum hold with the stop inactive (stop below breakeven): sells at the next minute's open.
  const hold = run(sessionOf([bar(0, 99, 99.5, 98.5, 99), bar(2, 98.7, 99, 98, 98.2)]), 92);
  check(
    'synthetic',
    hold?.reason === 'maximum hold' && hold.price === 98.7 && hold.barIndex === 1,
    'maximum hold fills at the next minute with trades'
  );
  // Not yet 15 days: no maximum hold.
  check('synthetic', run(sessionOf([bar(0, 99, 99.5, 98.5, 99)], undefined, 14), 92) === undefined, 'under 15 days');
  // A profitable open: no maximum hold, even after 15 days.
  check('synthetic', run(sessionOf([bar(0, 100.5, 101, 100, 100.2)]), 92) === undefined, 'profitable open');
  // Maximum hold with no later trade at all: no exit that session.
  check('synthetic', run(sessionOf([bar(0, 99, 99.5, 98.5, 99)]), 92) === undefined, 'no trade after the open');
  // Maximum hold with only the closing print after the open.
  const holdPrint = run(sessionOf([bar(0, 99, 99.5, 98.5, 99)], 98.9), 92);
  check('synthetic', holdPrint?.execution === 'closing print' && holdPrint.price === 98.9, 'maximum hold at print');
  // Intraday trigger in a minute that opened above the stop: stop level, or the next minute's open.
  const bars = [bar(0, 110, 111, 109, 110), bar(1, 109, 109.5, 107.5, 108), bar(3, 107.8, 108, 107, 107.2)];
  const atStop = run(sessionOf(bars), 108);
  const nextOpen = run(sessionOf(bars), 108, 0, 'next-open');
  check('synthetic', atStop?.price === 108 && atStop.execution === 'stop level' && atStop.barIndex === 1, 'stop');
  check('synthetic', nextOpen?.price === 107.8 && nextOpen.barIndex === 2, 'next-open stop fill');
  // A minute that opened through the stop fills at its open.
  const through = run(sessionOf([bar(0, 110, 111, 109, 109.2), bar(1, 107.5, 108, 107, 107.6)]), 108);
  check('synthetic', through?.price === 107.5 && through.execution === 'minute open through stop', 'through');
  // An inactive stop (below breakeven after interest) never fills, even when the low reaches it.
  check('synthetic', run(sessionOf(bars, undefined, 5), 108, 9000) === undefined, 'inactive stop');
  // The entry fill: the first minute at or after the decision, then the closing print, then nothing.
  const late = sessionOf([bar(0, 100, 100, 100, 100), bar(388, 101, 101, 101, 101)], 101.5);
  check('synthetic', firstTradeFrom(late, late.closeTime - 60)?.execution === 'closing print', 'entry at print');
  check('synthetic', firstTradeFrom(sessionOf([bar(0, 1, 1, 1, 1)]), late.closeTime - 60) === undefined, 'none');
}

// 2. Independent re-simulation.
const earlyCloses = new Set(
  '2016-11-25 2017-07-03 2017-11-24 2018-07-03 2018-11-23 2018-12-24 2019-07-03 2019-11-29 2019-12-24 2020-11-27 2020-12-24 2021-11-26 2022-11-25 2023-07-03 2023-11-24 2024-07-03 2024-11-29 2024-12-24 2025-07-03'.split(
    ' '
  )
);

// US daylight-saving time since 2007: from 2:00 a.m. local on the second Sunday of March (7:00 UTC) to
// 2:00 a.m. local on the first Sunday of November (6:00 UTC).
const nthSunday = (year: number, month: number, n: number) => {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();

  return 1 + ((7 - first) % 7) + 7 * (n - 1);
};
const offsetOf = (t: number) => {
  const year = new Date(t * 1000).getUTCFullYear();
  const start = Date.UTC(year, 2, nthSunday(year, 2, 2), 7) / 1000;
  const end = Date.UTC(year, 10, nthSunday(year, 10, 1), 6) / 1000;

  return t >= start && t < end ? -4 * 3600 : -5 * 3600;
};

interface Bar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

interface Session {
  date: string;
  dayTime: number;
  closeTime: number;
  bars: Bar[];
  print?: number;
  high: number;
  low: number;
  closePrice: number;
}

const summary = JSON.parse(await fs.readFile(`${runDir}/summary.json`, 'utf8'));
const sessionsByDate = new Map<string, Session>();

for (const line of (await fs.readFile(minuteFile, 'utf8')).trim().split('\n')) {
  const [stamp, o, h, l, c] = line.split(',');
  const t = Date.parse(stamp!.replaceAll('"', '')) / 1000;
  const local = t + offsetOf(t);
  const date = new Date(local * 1000).toISOString().slice(0, 10);
  const minute = Math.round((local % 86400) / 60);
  const closeMinute = earlyCloses.has(date) ? 780 : 960;

  if (minute < 570 || minute > closeMinute) {
    continue;
  }

  let session = sessionsByDate.get(date);

  if (!session) {
    if (minute === closeMinute) {
      continue;
    }

    session = {
      date,
      dayTime: Date.parse(date) / 1000,
      closeTime: t + (closeMinute - minute) * 60,
      bars: [],
      high: -Infinity,
      low: Infinity,
      closePrice: NaN
    };
    sessionsByDate.set(date, session);
  }

  if (minute === closeMinute) {
    session.print = Number(o);
  } else {
    session.bars.push({ t, o: Number(o), h: Number(h), l: Number(l), c: Number(c) });
  }
}

const sessions = [...sessionsByDate.values()].filter(
  (session) => session.date >= summary.firstDate && session.date <= summary.lastDate
);

for (const session of sessions) {
  session.closePrice = session.print ?? session.bars.at(-1)!.c;
  session.high = Math.max(session.closePrice, ...session.bars.map((bar) => bar.h));
  session.low = Math.min(session.closePrice, ...session.bars.map((bar) => bar.l));
}

interface Trade {
  entryDate: string;
  entryTime: number;
  entryPrice: number;
  shares: number;
  refHigh: number;
  exitDate?: string;
  exitTime?: number;
  exitPrice?: number;
  reason?: string;
  interest?: number;
  profit?: number;
}

const trades: Trade[] = [];
const restrictionEvents: string[] = [];
const dailyMarks: number[] = [];
const drawdown = () => {
  let peak = 0;
  let maximum = 0;

  return {
    add: (value: number) => {
      peak = Math.max(peak, value);
      maximum = Math.max(maximum, peak - value);
    },
    get: () => maximum
  };
};
const dailyDrawdown = drawdown();
const minuteDrawdown = drawdown();
let restriction: { lossExit: number; ref: number; lower: number; low: number } | undefined;
let position: Trade | undefined;
let postHigh = 0;
let stop = 0;
let realized = 0;
const interestOf = (trade: Trade, dayTime: number) =>
  ((100000 * 0.11 * (dayTime - Date.parse(trade.entryDate) / 1000)) / 86400) * (1 / 365);
const firstFrom = (session: Session, time: number) => {
  const index = session.bars.findIndex((bar) => bar.t >= time);

  if (index >= 0) {
    return { price: session.bars[index]!.o, time: session.bars[index]!.t, index };
  }

  return session.print === undefined
    ? undefined
    : { price: session.print, time: session.closeTime, index: session.bars.length };
};

sessions.forEach((session, i) => {
  const recentHigh = Math.max(...sessions.slice(Math.max(0, i - 90), i).map((s) => s.high));
  const decisionTime = session.closeTime - 60;
  const decisionBar = session.bars.filter((bar) => bar.t + 60 <= decisionTime).at(-1);
  const decisionPrice = decisionBar ? decisionBar.c : NaN;

  if (i === 0) {
    dailyMarks.push(0);
    return;
  }

  const held = position;
  const realizedBefore = realized;
  let entered: Trade | undefined;
  let entryIndex = Infinity;
  let exitIndex = Infinity;

  if (!held && 1 - decisionPrice / recentHigh >= 0.1) {
    let allowed = true;

    if (restriction) {
      const low = Math.min(restriction.low, decisionPrice);

      allowed = !(decisionPrice >= low + 0.38 * (restriction.ref - low) || decisionPrice > restriction.lower);
    }

    const fill = allowed ? firstFrom(session, decisionTime) : undefined;

    if (fill) {
      entered = {
        entryDate: session.date,
        entryTime: fill.time,
        entryPrice: fill.price,
        shares: 100000 / fill.price,
        refHigh: recentHigh
      };
      trades.push(entered);
      position = entered;
      entryIndex = fill.index;
      postHigh = Math.max(fill.price, session.closePrice, ...session.bars.slice(fill.index).map((bar) => bar.h));
      stop = postHigh * 0.92;
    }
  }

  if (held) {
    const interest = interestOf(held, session.dayTime);
    const profitAt = (price: number) => held.shares * price - 100000 - interest;
    const active = profitAt(stop) > 0;
    const open = session.bars[0]!.o;
    const days = (session.dayTime - Date.parse(held.entryDate) / 1000) / 86400;
    let exit: { price: number; time: number; index: number; reason: string } | undefined;

    if (active && open <= stop) {
      exit = { price: open, time: session.bars[0]!.t, index: 0, reason: 'trailing stop gap' };
    } else if (days >= 15 && profitAt(open) < 0) {
      const fill = firstFrom(session, session.bars[0]!.t + 60);

      exit = fill && { ...fill, reason: 'maximum hold' };
    } else if (active) {
      for (const [index, bar] of session.bars.entries()) {
        if (bar.o <= stop) {
          exit = { price: bar.o, time: bar.t, index, reason: 'trailing stop' };
        } else if (bar.l <= stop) {
          const next = firstFrom(session, bar.t + 60);

          exit =
            stopFill === 'stop'
              ? { price: stop, time: bar.t, index, reason: 'trailing stop' }
              : { ...(next ?? { price: bar.c, time: bar.t, index }), reason: 'trailing stop' };
        }

        if (exit) {
          break;
        }
      }
    }

    if (exit) {
      Object.assign(held, {
        exitDate: session.date,
        exitTime: exit.time,
        exitPrice: exit.price,
        reason: exit.reason,
        interest,
        profit: profitAt(exit.price)
      });
      realized += held.profit!;
      position = undefined;
      exitIndex = exit.index;

      if (exit.price / held.entryPrice - 1 <= -0.005) {
        restriction = { lossExit: exit.price, ref: held.refHigh, lower: exit.price * 0.97, low: session.closePrice };
        restrictionEvents.push(`${session.date} restricted`);
      }
    } else {
      postHigh = Math.max(postHigh, session.high);
      stop = Math.max(stop, postHigh * 0.92);
    }
  }

  const sessionTrade = held ?? entered;
  const from = held ? 0 : entryIndex;
  const marks = [...session.bars.map((bar) => bar.c), session.closePrice];

  marks.forEach((price, index) => {
    const isHeld = sessionTrade && index >= from && index < exitIndex;
    const value =
      (index >= exitIndex ? realized : realizedBefore) +
      (isHeld ? sessionTrade.shares * price - 100000 - interestOf(sessionTrade, session.dayTime) : 0);

    minuteDrawdown.add(value);
  });

  const mark =
    realized + (position ? position.shares * session.closePrice - 100000 - interestOf(position, session.dayTime) : 0);

  dailyMarks.push(mark);
  dailyDrawdown.add(mark);

  if (restriction) {
    restriction.low = Math.min(restriction.low, session.closePrice);

    if (entered) {
      restrictionEvents.push(`${session.date} lower_price_reentry`);
      restriction = undefined;
    } else if (!position && session.closePrice >= restriction.low + 0.38 * (restriction.ref - restriction.low)) {
      restrictionEvents.push(`${session.date} recovery_reset`);
      restriction = undefined;
    }
  }
});

// Compare with the run's output.
const readCsv = async (file: string) => {
  const [header, ...rows] = (await fs.readFile(file, 'utf8')).trim().split('\n');
  const keys = header!.split(',');

  return rows.map((row) => Object.fromEntries(row.split(',').map((value, index) => [keys[index]!, value])));
};
const runTrades = await readCsv(`${runDir}/trades.csv`);
const runStates = await readCsv(`${runDir}/states.csv`);
const runDaily = await readCsv(`${runDir}/daily.csv`);
const iso = (t?: number) => (t === undefined ? '' : new Date(t * 1000).toISOString());

check('resimulation trade count', runTrades.length === trades.length, `${runTrades.length} vs ${trades.length}`);
trades.forEach((trade, index) => {
  const row = runTrades[index];
  const label = `trade ${index + 1} entered ${trade.entryDate}`;

  check('resimulation entry', row?.entry_date === trade.entryDate, `${label}: date ${row?.entry_date}`);
  check('resimulation entry', row?.entry_time === iso(trade.entryTime), `${label}: time ${row?.entry_time}`);
  check('resimulation entry', close(Number(row?.entry_price), trade.entryPrice), `${label}: price`);

  if (trade.exitDate) {
    check('resimulation exit', row?.exit_date === trade.exitDate, `${label}: exit date ${row?.exit_date}`);
    check('resimulation exit', row?.exit_time === iso(trade.exitTime), `${label}: exit time ${row?.exit_time}`);
    check('resimulation exit', close(Number(row?.exit_price), trade.exitPrice!), `${label}: exit price`);
    check('resimulation exit', row?.reason === trade.reason, `${label}: reason ${row?.reason} vs ${trade.reason}`);
    check('resimulation interest', close(Number(row?.interest), trade.interest!), `${label}: interest`);
    check('resimulation profit', close(Number(row?.profit), trade.profit!), `${label}: profit`);
  } else {
    check('resimulation open at end', row?.reason === 'open', `${label}: still open`);
  }
});

const runEvents = runStates
  .filter((row) => ['losing_exit', 'lower_price_reentry', 'recovery_reset'].includes(row.reason!))
  .map((row) => `${row.date} ${row.reason === 'losing_exit' ? 'restricted' : row.reason}`);

check('resimulation restriction events', runEvents.join() === restrictionEvents.join(), runEvents.join(' '));
check('resimulation daily marks', runDaily.length === dailyMarks.length, 'daily row count');
runDaily.forEach((row, index) =>
  check('resimulation daily marks', close(Number(row.mtm_pnl), dailyMarks[index]!), `daily ${row.date}`)
);
check('resimulation daily drawdown', close(summary.maximumDrawdown, dailyDrawdown.get()), 'daily drawdown');
check('resimulation minute drawdown', close(summary.minuteMaximumDrawdown, minuteDrawdown.get()), 'minute drawdown');
check('resimulation net profit', close(summary.netProfit, Number(runDaily.at(-1)!.mtm_pnl)), 'net profit = last mark');

// 3. Chronological assertions on the run's output against the raw bars.
const sessionIndex = new Map(sessions.map((session, index) => [session.date, index]));
const etMinute = (t: number) => new Date((t + offsetOf(t)) * 1000).toISOString().slice(11, 16);
const entryMinutes: Record<string, number> = {};

for (const row of runTrades) {
  const session = sessions[sessionIndex.get(row.entry_date!)!]!;
  const entryTime = Date.parse(row.entry_time!) / 1000;
  const decisionTime = Date.parse(row.decision_time!) / 1000;
  const decisionBar = session.bars.filter((bar) => bar.t + 60 <= decisionTime).at(-1)!;
  const i = sessionIndex.get(row.entry_date!)!;
  const window = sessions.slice(Math.max(0, i - 90), i);
  const recentHigh = Math.max(...window.map((s) => s.high));

  entryMinutes[etMinute(entryTime)] = (entryMinutes[etMinute(entryTime)] ?? 0) + 1;
  check('entry decision one minute before the close', decisionTime === session.closeTime - 60, row.entry_date!);
  check('entry uses completed minutes only', decisionBar.t + 60 <= decisionTime, row.entry_date!);
  check('entry decision price', close(Number(row.decision_price), decisionBar.c), row.entry_date!);
  check(
    'entry fill after decision, before close',
    entryTime >= decisionTime && entryTime <= session.closeTime,
    row.entry_date!
  );
  check('entry 90-session window', window.length === Math.min(90, i), row.entry_date!);
  check('entry signal', 1 - decisionBar.c / recentHigh >= 0.1, row.entry_date!);
  check(
    'entry not on an exit session',
    !runTrades.some((other) => other.exit_date === row.entry_date),
    row.entry_date!
  );

  if (row.reason === 'open') {
    const last = sessions.at(-1)!;
    const interest = interestOf({ entryDate: row.entry_date! } as Trade, last.dayTime);

    check('open position marked at the last close', close(Number(row.exit_price), last.closePrice), row.entry_date!);
    check('open position interest', close(Number(row.interest), interest), row.entry_date!);
    continue;
  }

  const exitSession = sessions[sessionIndex.get(row.exit_date!)!]!;
  const exitTime = Date.parse(row.exit_time!) / 1000;
  const shares = Number(row.shares);
  const days = (exitSession.dayTime - session.dayTime) / 86400;
  const interest = (100000 * 0.11 * days) / 365;
  const stopPrice = Number(row.exit_stop_price);
  // The stop from the post-entry high through the session before the exit.
  const highs = [
    Number(row.entry_price),
    session.closePrice,
    ...session.bars.filter((bar) => bar.t >= entryTime).map((bar) => bar.h),
    ...sessions.slice(sessionIndex.get(row.entry_date!)! + 1, sessionIndex.get(row.exit_date!)!).map((s) => s.high)
  ];

  check('interest per calendar day', close(Number(row.interest), interest), row.entry_date!);
  check('stop level from earlier sessions only', close(stopPrice, Math.max(...highs) * 0.92), row.entry_date!);
  check(
    'exit within the regular session',
    exitTime >= exitSession.bars[0]!.t && exitTime <= exitSession.closeTime,
    row.exit_date!
  );

  if (row.reason === 'maximum hold') {
    const opening = exitSession.bars[0]!;

    check('maximum hold after 15 calendar days', days >= 15, row.exit_date!);
    check('maximum hold loses at the opening trade', shares * opening.o - 100000 - interest < 0, row.exit_date!);
    check('maximum hold fills after the opening minute', exitTime >= opening.t + 60, row.exit_date!);
  } else {
    check('stop active before the session', shares * stopPrice - 100000 - interest > 0, row.exit_date!);

    const triggerIndex = exitSession.bars.findIndex((bar) => bar.l <= stopPrice);

    check(
      'stop triggers in the first minute that reaches it',
      exitSession.bars[triggerIndex]!.t === exitTime || stopFill === 'next-open',
      row.exit_date!
    );
  }

  const priceReturn = Number(row.exit_price) / Number(row.entry_price) - 1;
  const restricted = runStates.some((state) => state.date === row.exit_date && state.reason === 'losing_exit');

  check('material-loss classification', restricted === priceReturn <= -0.005, row.exit_date!);
}

for (const state of runStates.filter((row) => row.reason === 'recovery_reset')) {
  const s = sessions[sessionIndex.get(state.date!)!]!;

  check('recovery reset on a close at or above the level', s.closePrice >= Number(state.reset_level), state.date!);
}

// Sessions: daylight-saving offsets agree with Intl for every regular-session bar, via the lib grouping
// whose open times the run used.
const { groupMarketSessions, loadCsvMinuteBacktestData } = await import('#lib');
const libSessions = groupMarketSessions(await loadCsvMinuteBacktestData('VGT', minuteFile)).filter(
  (session) => session.date >= summary.firstDate && session.date <= summary.lastDate
);

check('sessions', libSessions.length === sessions.length, `${libSessions.length} vs ${sessions.length}`);
libSessions.forEach((libSession, index) => {
  const own = sessions[index]!;

  check('session dates', libSession.date === own.date, libSession.date);
  check('session close times (DST and early closes)', libSession.closeTime === own.closeTime, libSession.date);
  check('session bars', libSession.bars.length === own.bars.length, libSession.date);
  check('session close', libSession.close === own.closePrice, libSession.date);
});

const report = { minuteFile, runDir, stopFill, checks, failures, entryMinutesEt: entryMinutes };

await fs.writeFile(reportFile, `${JSON.stringify(report, null, 1)}\n`);
console.info(`${Object.values(checks).reduce((a, b) => a + b, 0)} checks, ${failures.length} failures`);
console.info(JSON.stringify(entryMinutes));
failures.slice(0, 30).forEach((failure) => console.info(`FAIL ${failure}`));
process.exitCode = failures.length ? 1 : 0;

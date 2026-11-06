// The period clock (research/intraday-d1-vgt/audit/RULE_PARITY_DESIGN.md §2). Each regular session (as
// `groupMarketSessions` defines it: 09:30 ET to the scheduled close, plus the closing print) is cut into clock-aligned
// blocks of B regular-session minutes from 09:30; a block without a bar is not a period; the session's last period runs
// to the scheduled close and holds the closing print (its high and low include it and its close is it), exactly as
// D1's session does. With the `session` clock every period is a whole session and the engine is D1.
//
// Two clocks are attached to every period: `t`, the maximum hold's clock (the session clock: UTC midnight of the New
// York date, so differences are calendar days as in D1; an intraday clock: cumulative SCHEDULED regular-session
// seconds before the period's start, so overnight and closed days do not count), and `sessionTime`, the session's
// UTC midnight, on which interest always counts calendar days, as in D1.
import type { MarketSession } from '#types';

export interface Bars {
  count: number;
  time: Float64Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
}

export interface SessionTable {
  count: number;
  date: string[];
  time: Float64Array; // UTC midnight of the New York date
  closeTime: Float64Array;
  close: Float64Array; // closing print, else the last minute's close
  year: Int16Array;
  barStart: Int32Array;
  barEnd: Int32Array;
}

export interface Clock {
  name: string; // 'session' or 'B<minutes>'
  minutes: number; // NaN for the session clock
  count: number;
  session: Int32Array;
  isLast: Uint8Array; // the session's last period (holds the closing print)
  barStart: Int32Array; // [barStart, barEnd) into Bars
  barEnd: Int32Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
  closingPrint: Float64Array; // NaN unless the session's last period with a closing print
  closeTime: Float64Array; // the block's end (the scheduled close for the session's last period)
  t: Float64Array; // the hold clock, seconds
  firstOfSession: Int32Array; // per session: its first period index
}

export interface Market {
  bars: Bars;
  sessions: SessionTable;
  clocks: Map<string, Clock>;
}

export const buildMarket = (sessions: readonly MarketSession[]): Market => {
  const barCount = sessions.reduce((total, session) => total + session.bars.length, 0);
  const bars: Bars = {
    count: barCount,
    time: new Float64Array(barCount),
    open: new Float64Array(barCount),
    high: new Float64Array(barCount),
    low: new Float64Array(barCount),
    close: new Float64Array(barCount)
  };
  const table: SessionTable = {
    count: sessions.length,
    date: sessions.map((session) => session.date),
    time: new Float64Array(sessions.length),
    closeTime: new Float64Array(sessions.length),
    close: new Float64Array(sessions.length),
    year: new Int16Array(sessions.length),
    barStart: new Int32Array(sessions.length),
    barEnd: new Int32Array(sessions.length)
  };
  let k = 0;

  sessions.forEach((session, s) => {
    if (session.bars.length === 0) {
      throw new Error(`session ${session.date} has no regular-session bar`);
    }

    table.time[s] = session.time;
    table.closeTime[s] = session.closeTime;
    table.close[s] = session.close;
    table.year[s] = Number(session.date.slice(0, 4));
    table.barStart[s] = k;

    for (const bar of session.bars) {
      bars.time[k] = bar.time;
      bars.open[k] = bar.open;
      bars.high[k] = bar.high;
      bars.low[k] = bar.low;
      bars.close[k] = bar.close;
      k++;
    }

    table.barEnd[s] = k;
  });

  return { bars, sessions: table, clocks: new Map() };
};

interface Draft {
  session: number;
  isLast: boolean;
  barStart: number;
  barEnd: number;
  closeTime: number;
  t: number;
}

const assemble = (
  name: string,
  minutes: number,
  market: Market,
  sessions: readonly MarketSession[],
  drafts: Draft[]
) => {
  const n = drafts.length;
  const clock: Clock = {
    name,
    minutes,
    count: n,
    session: new Int32Array(n),
    isLast: new Uint8Array(n),
    barStart: new Int32Array(n),
    barEnd: new Int32Array(n),
    open: new Float64Array(n),
    high: new Float64Array(n),
    low: new Float64Array(n),
    close: new Float64Array(n),
    closingPrint: new Float64Array(n),
    closeTime: new Float64Array(n),
    t: new Float64Array(n),
    firstOfSession: new Int32Array(market.sessions.count).fill(-1)
  };
  const { bars } = market;

  drafts.forEach((draft, p) => {
    const print = draft.isLast ? sessions[draft.session]!.closingPrint : undefined;
    let high = -Infinity;
    let low = Infinity;

    for (let b = draft.barStart; b < draft.barEnd; b++) {
      if (bars.high[b]! > high) high = bars.high[b]!;
      if (bars.low[b]! < low) low = bars.low[b]!;
    }

    if (print !== undefined) {
      high = Math.max(high, print);
      low = Math.min(low, print);
    }

    clock.session[p] = draft.session;
    clock.isLast[p] = draft.isLast ? 1 : 0;
    clock.barStart[p] = draft.barStart;
    clock.barEnd[p] = draft.barEnd;
    clock.open[p] = bars.open[draft.barStart]!;
    clock.high[p] = high;
    clock.low[p] = low;
    clock.close[p] = print ?? bars.close[draft.barEnd - 1]!;
    clock.closingPrint[p] = print ?? NaN;
    clock.closeTime[p] = draft.closeTime;
    clock.t[p] = draft.t;

    if (clock.firstOfSession[draft.session] === -1) {
      clock.firstOfSession[draft.session] = p;
    }
  });

  return clock;
};

// One period per session: the parity clock. Its values equal the MarketSession's (open, high, low, close).
export const sessionClock = (market: Market, sessions: readonly MarketSession[]): Clock => {
  const cached = market.clocks.get('session');

  if (cached) return cached;

  const drafts = sessions.map((session, s) => ({
    session: s,
    isLast: true,
    barStart: market.sessions.barStart[s]!,
    barEnd: market.sessions.barEnd[s]!,
    closeTime: session.closeTime,
    t: session.time
  }));
  const clock = assemble('session', NaN, market, sessions, drafts);

  sessions.forEach((session, p) => {
    if (clock.open[p] !== session.open || clock.high[p] !== session.high || clock.low[p] !== session.low) {
      throw new Error(`session clock: period ${p} (${session.date}) differs from its MarketSession`);
    }
  });

  market.clocks.set('session', clock);
  return clock;
};

// Clock-aligned B-minute periods.
export const minuteClock = (market: Market, sessions: readonly MarketSession[], minutes: number): Clock => {
  const name = `B${minutes}`;
  const cached = market.clocks.get(name);

  if (cached) return cached;

  if (!Number.isInteger(minutes) || minutes < 1) {
    throw new Error(`period length ${minutes} must be a whole number of minutes`);
  }

  const drafts: Draft[] = [];
  const length = minutes * 60;
  let tradingSeconds = 0; // scheduled regular-session seconds before the current session

  sessions.forEach((session, s) => {
    const scheduled = session.closeTime - session.openTime;
    const start = market.sessions.barStart[s]!;
    const end = market.sessions.barEnd[s]!;
    const first = drafts.length;
    let b = start;

    while (b < end) {
      const block = Math.floor((market.bars.time[b]! - session.openTime) / length);

      if (block < 0 || market.bars.time[b]! >= session.closeTime) {
        throw new Error(`bar at ${market.bars.time[b]} lies outside the regular session of ${session.date}`);
      }

      let e = b + 1;

      while (e < end && Math.floor((market.bars.time[e]! - session.openTime) / length) === block) e++;

      drafts.push({
        session: s,
        isLast: false,
        barStart: b,
        barEnd: e,
        closeTime: Math.min(session.openTime + (block + 1) * length, session.closeTime),
        t: tradingSeconds + block * length
      });
      b = e;
    }

    const last = drafts[drafts.length - 1]!;

    if (drafts.length === first) {
      throw new Error(`session ${session.date} produced no period`);
    }

    last.isLast = true;
    last.closeTime = session.closeTime;
    tradingSeconds += scheduled;
  });

  const clock = assemble(name, minutes, market, sessions, drafts);

  market.clocks.set(name, clock);
  return clock;
};

// An independent reference implementation of PROTOCOL.md §5's rules (the oracle of parity P8): a plain transcription of
// the written rules, minute by minute, with a brute-force reference high, explicit next-trade orders and no fast path,
// caching or shared state with engine.ts. It is slow (O(Lp) per period) and is run on short windows and synthetic data.
import type { Clock, Market } from '../intraday-d1/periods.ts';
import type { Rules } from './context.ts';
import type { Params, Settings } from './engine.ts';

export interface RefLot {
  kind: 'deep' | 'continuation';
  entryBar: number;
  entryTime: number;
  entryRaw: number;
  exitBar: number; // −1 while open
  exitTime: number;
  exitRaw: number;
  reason: string;
  net: number;
  interest: number;
}

export interface RefResult {
  lots: RefLot[];
  net: number;
  realized: number;
  minuteDd: number;
  dailyMarks: Map<number, number>;
}

type Order = { kind: 'hold' | 'stop' | 'buffered'; decisionTime: number; anyPrint: boolean };

interface RefPos {
  lot: RefLot;
  shares: number;
  entrySession: number;
  entryPeriod: number;
  stopHigh: number;
  stop: number;
}

export const referenceSimulate = (
  market: Market,
  clock: Clock,
  rules: Rules,
  p: Params,
  settings: Settings,
  armFrom: number,
  endSession: number
): RefResult => {
  const { bars, sessions } = market;
  const N = settings.principal;
  const cin = 1 + settings.costBps / 10000;
  const cout = 1 - settings.costBps / 10000;
  const slip = 1 - settings.stopSlippageBps / 10000;
  const lots: RefLot[] = [];
  const marks: number[] = [];
  const dailyMarks = new Map<number, number>();
  let realized = 0;
  let pos: RefPos | null = null;
  let setup: null | { kind: 'deep' | 'continuation'; low: number; pending: boolean; decisionTime: number } = null;
  let carriedBuffered: number | null = null;
  let carriedOrder: Order | null = null; // L2+: an exit order still unfilled at its period's end
  const cont = { active: false, high: 0, start: -1 };
  const days = (a: number, b: number) => (sessions.time[b]! - sessions.time[a]!) / (365 * 86400);
  const interestOf = (s: number) => (pos ? N * settings.rate * days(pos.entrySession, s) : 0);
  let last = 0;

  for (let q = 0; q < clock.count; q++) if (clock.session[q]! <= endSession) last = q;

  const sell = (price: number, t: number, bar: number, reason: string, s: number, period: number) => {
    const isStop = reason === 'trailing stop' || reason === 'trailing stop gap';
    const proceeds = pos!.shares * price * cout * (isStop ? slip : 1);
    const interest = interestOf(s);
    const lot = pos!.lot;

    lot.exitBar = bar;
    lot.exitTime = t;
    lot.exitRaw = price;
    lot.reason = reason;
    lot.interest = interest;
    lot.net = proceeds - N - interest;
    realized += lot.net;
    pos = null;

    if (lot.net > 0) {
      cont.active = true;
      cont.high = price;
      cont.start = period;
    }
  };

  for (let i = 1; i <= last; i++) {
    const s = clock.session[i]!;
    let refHigh = -Infinity;

    for (let q = Math.max(0, i - p.lookbackPeriods); q < i; q++) refHigh = Math.max(refHigh, clock.high[q]!);

    const canArm = i >= p.lookbackPeriods && s >= armFrom;
    const startPos = pos as RefPos | null;
    const startInterest = interestOf(s);
    const active = startPos ? rules.stopWhileLosing || startPos.shares * startPos.stop - N - startInterest > 0 : false;
    const held = startPos ? clock.t[i]! - clock.t[startPos.entryPeriod]! : 0;
    const maxDue =
      !!startPos && rules.holdBuffer && held >= p.holdSeconds && startPos.shares * clock.open[i]! - N - startInterest < 0;
    let suspended = maxDue; // the maximum hold suspends the intraday stop of the position held at the start
    let order: Order | null = null;
    let exitedThisPeriod = false;
    const contOpen = () =>
      rules.continuation && cont.active && (rules.samePeriod ? i >= cont.start : i > cont.start) && i - cont.start <= p.continuationPeriods;
    const b0 = clock.barStart[i]!;
    const b1 = clock.barEnd[i]!;
    const isLast = clock.isLast[i] === 1;
    const print = clock.closingPrint[i]!;
    const closeTime = clock.closeTime[i]!;
    let periodHigh = -Infinity; // while held, for a position entered in this period (the period ratchet)
    const mayEnter = () => !pos && (rules.samePeriod || (!startPos && !exitedThisPeriod));
    const mayExit = () => !!pos && (rules.samePeriod || pos === startPos);

    for (let b = b0; b < b1; b++) {
      const o = bars.open[b]!;
      const h = bars.high[b]!;
      const l = bars.low[b]!;
      const c = bars.close[b]!;

      if (mayEnter() && setup?.pending) {
        const shares = N / (o * cin);
        const lot: RefLot = { kind: setup.kind, entryBar: b, entryTime: bars.time[b]!, entryRaw: o, exitBar: -1, exitTime: NaN, exitRaw: NaN, reason: '', net: 0, interest: 0 };

        lots.push(lot);
        pos = { lot, shares, entrySession: s, entryPeriod: i, stopHigh: o, stop: o * (1 - p.S) };
        periodHigh = o;
        setup = null;
      }

      if (mayExit()) {
        const fromStart = pos === startPos;
        const act = fromStart ? active : rules.stopWhileLosing;

        if (fromStart && b === b0) {
          if (act && o <= pos!.stop) sell(o, bars.time[b]!, b, 'trailing stop gap', s, i);
          else if (carriedOrder?.kind === 'stop') sell(o, bars.time[b]!, b, 'trailing stop', s, i);
          else if (carriedBuffered !== null) sell(o, bars.time[b]!, b, 'buffered intraday loss', s, i);
          else if (carriedOrder?.kind === 'hold') sell(o, bars.time[b]!, b, 'maximum hold', s, i);
          else if (maxDue) order = { kind: 'hold', decisionTime: bars.time[b]! + 60, anyPrint: true };
          if (!pos) {
            carriedBuffered = null;
            carriedOrder = null;
          }
        } else if (order && bars.time[b]! >= order.decisionTime) {
          if (order.kind === 'hold') sell(o, bars.time[b]!, b, 'maximum hold', s, i);
          else if (order.kind === 'stop') sell(o, bars.time[b]!, b, 'trailing stop', s, i);
          else if (act && o <= pos!.stop) sell(o, bars.time[b]!, b, 'trailing stop', s, i);
          else sell(o, bars.time[b]!, b, 'buffered intraday loss', s, i);
          order = null;
          suspended = false;
        }

        if (pos && !(suspended && pos === startPos) && !order && act) {
          if (o <= pos.stop) sell(o, bars.time[b]!, b, 'trailing stop', s, i);
          else if (l <= pos.stop) {
            if (settings.stopFill === 'stop') sell(pos.stop, bars.time[b]!, b, 'trailing stop', s, i);
            else if (settings.stopFill === 'minute-low') sell(l, bars.time[b]!, b, 'trailing stop', s, i);
            else if (b + 1 < b1 || (isLast && !Number.isNaN(print)) || rules.samePeriod)
              order = { kind: 'stop', decisionTime: bars.time[b]! + 60, anyPrint: true };
            else sell(c, bars.time[b]!, b, 'trailing stop', s, i);
          }
        }

        if (
          pos &&
          pos === startPos &&
          !order &&
          rules.holdBuffer &&
          !maxDue &&
          held >= p.holdSeconds &&
          pos.shares * c - N - startInterest <= -N * p.buffer
        ) {
          const t = bars.time[b]! + 60;

          if (b + 1 < b1 || (isLast && !Number.isNaN(print) && t < closeTime)) order = { kind: 'buffered', decisionTime: t, anyPrint: false };
          else carriedBuffered = t;
        }

        if (!pos) exitedThisPeriod = true;
      }

      if (mayEnter() && !setup?.pending) {
        if (!setup) {
          if (canArm) {
            if (1 - c / refHigh >= p.X) setup = { kind: 'deep', low: c, pending: false, decisionTime: NaN };
            else if (contOpen() && c <= cont.high * (1 - p.pullback)) setup = { kind: 'continuation', low: c, pending: false, decisionTime: NaN };
            if (setup) cont.active = false;
          }
        } else {
          setup.low = Math.min(setup.low, l);

          if (c >= setup.low * (1 + p.Y)) {
            setup.pending = true;
            setup.decisionTime = bars.time[b]! + 60;
          }
        }
      }

      if (pos) {
        periodHigh = Math.max(periodHigh, h);
        if (rules.ratchet === 'minute' && h > pos.stopHigh) {
          pos.stopHigh = h;
          pos.stop = Math.max(pos.stop, h * (1 - p.S));
        }
        marks.push(realized + (pos.shares * c - N - interestOf(s)));
      } else marks.push(realized);
    }

    // The closing print.
    if (isLast && !Number.isNaN(print)) {
      if (pos && order && (order.anyPrint || order.decisionTime < closeTime)) {
        sell(print, closeTime, b1, order.kind === 'hold' ? 'maximum hold' : order.kind === 'stop' ? 'trailing stop' : 'buffered intraday loss', s, i);
        order = null;
      } else if (!pos && mayEnter() && setup?.pending && setup.decisionTime < closeTime) {
        const shares = N / (print * cin);
        const lot: RefLot = { kind: setup.kind, entryBar: b1, entryTime: closeTime, entryRaw: print, exitBar: -1, exitTime: NaN, exitRaw: NaN, reason: '', net: 0, interest: 0 };

        lots.push(lot);
        pos = { lot, shares, entrySession: s, entryPeriod: i, stopHigh: print, stop: print * (1 - p.S) };
        periodHigh = print;
        setup = null;
      }

      if (pos) {
        periodHigh = Math.max(periodHigh, print);
        if (rules.ratchet === 'minute' && print > pos.stopHigh) {
          pos.stopHigh = print;
          pos.stop = Math.max(pos.stop, print * (1 - p.S));
        }
      }
    }

    // L2+: an unfilled stop or maximum-hold order waits for the next trade (the next period's opening trade).
    carriedOrder = rules.samePeriod && pos && order && order.kind !== 'buffered' ? order : null;

    if (pos && rules.ratchet === 'period') {
      const hi = pos.entryPeriod === i ? Math.max(periodHigh, clock.close[i]!) : clock.high[i]!;

      pos.stopHigh = Math.max(pos.stopHigh, hi);
      pos.stop = Math.max(pos.stop, pos.stopHigh * (1 - p.S));
    }

    if (isLast) {
      const v = realized + (pos ? pos.shares * clock.close[i]! - N - interestOf(s) : 0);

      marks.push(v);
      dailyMarks.set(s, v);
    }

    if (cont.active) {
      if (i > cont.start) cont.high = Math.max(cont.high, clock.high[i]!);
      if (i - cont.start >= p.continuationPeriods) cont.active = false;
    }
  }

  let unrealized = 0;

  if (pos) {
    const lastSession = clock.session[last]!;

    unrealized = pos.shares * clock.close[last]! - N - interestOf(lastSession);
    pos.lot.net = unrealized;
  }

  let peak = 0;
  let dd = 0;

  for (const m of marks) {
    if (m > peak) peak = m;
    if (peak - m > dd) dd = peak - m;
  }

  return { lots, net: realized + unrealized, realized, minuteDd: dd, dailyMarks };
};

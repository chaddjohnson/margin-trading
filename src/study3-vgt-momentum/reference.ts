// An independent, deliberately slow restatement of the rules (PROTOCOL.md §3, MECHANISM_CATALOG.json) used only to
// check the fast engine (engine.ts) trade by trade. It shares no signal or position code with the engine: every
// feature is recomputed from the raw closes at each decision with plain loops, every family's state machine is
// restated from the catalog text, and the session is walked minute by minute with explicit, ordered events. Only the
// fill primitives (D1's own firstTradeAfterDecision / priceAt), which define the execution convention, are shared.
import type { Dataset } from '../four-family/data.ts';
import { firstTradeAfterDecision, firstTradeFrom, priceAt } from '../shared-margin-portfolio/strategy.ts';
import type { RunOptions, StrategySpec } from './engine.ts';

const YEAR = 365 * 86400;

export interface RefTrade {
  entryIndex: number;
  entryBar: number;
  entryRaw: number;
  exitIndex: number;
  exitBar: number;
  exitRaw: number;
  exitReason: string;
  shares: number;
  principal: number;
  interest: number;
  net: number;
  rule: string;
  kind: string;
}

export interface RefResult {
  trades: RefTrade[];
  endLiquidation: number;
  minuteDrawdown: number;
  dailyMarks: number[];
}

// ----- naive features from the raw arrays -----

const closesOf = (ds: Dataset) => Array.from(ds.sClose);
const maxRange = (a: number[], from: number, to: number) => {
  let m = a[from]!;

  for (let i = from + 1; i <= to; i++) {
    if (a[i]! > m) m = a[i]!;
  }

  return m;
};
const minRange = (a: number[], from: number, to: number) => {
  let m = a[from]!;

  for (let i = from + 1; i <= to; i++) {
    if (a[i]! < m) m = a[i]!;
  }

  return m;
};
const logReturn = (c: number[], i: number) => Math.log(c[i]! / c[i - 1]!);
const sdOfReturns = (c: number[], from: number, to: number) => {
  // sample sd of r_i, i = from..to
  const n = to - from + 1;
  let sum = 0;

  for (let i = from; i <= to; i++) sum += logReturn(c, i);

  const mean = sum / n;
  let sq = 0;

  for (let i = from; i <= to; i++) {
    const d = logReturn(c, i) - mean;

    sq += d * d;
  }

  return Math.sqrt(sq / (n - 1));
};

// ----- family state restated per session -----

interface FamilyStepper {
  // the family's view at the close of s: level state, a trigger, own OUT, a recorded level
  step(s: number): { state?: boolean; trigger?: boolean; out?: boolean; level?: number };
}

const stepperOf = (ds: Dataset, spec: StrategySpec): FamilyStepper => {
  const c = closesOf(ds);
  const h = Array.from(ds.sHigh);
  const l = Array.from(ds.sLow);
  const p = spec.params;
  const lowClose20Out = (s: number) => s >= 20 && c[s]! < minRange(c, s - 20, s - 1);
  let on = false;

  switch (spec.signal) {
    case 'E01':
      return {
        step(s) {
          if (s >= 249) {
            const dd = 1 - c[s]! / maxRange(c, s - 249, s);

            if (!on && dd <= p.d_in!) on = true;
            else if (on && dd >= p.d_in! + p.d_gap!) on = false;
          }

          return { state: on };
        }
      };
    case 'E02':
      return {
        step(s) {
          if (s >= p.N!) {
            const a = (252 / p.N!) * Math.log(c[s]! / c[s - p.N!]!);

            if (!on && a >= p.a_in!) on = true;
            else if (on && a < p.a_in! - p.a_gap!) on = false;
          }

          return { state: on };
        }
      };
    case 'E03':
      return {
        step(s) {
          const N = p.N!;

          if (s >= N) {
            let path = 0;

            for (let i = s - N + 1; i <= s; i++) path += Math.abs(c[i]! - c[i - 1]!);

            const er = path === 0 ? 0 : (c[s]! - c[s - N]!) / path;
            const a = (252 / N) * Math.log(c[s]! / c[s - N]!);

            if (!on && er >= p.e_in! && a >= 0.11) on = true;
            else if (on && er <= p.e_in! - p.e_gap!) on = false;
          }

          return { state: on };
        }
      };
    case 'E04': {
      let up = 0;
      let down = 0;

      return {
        step(s) {
          if (s >= 61) {
            const z = logReturn(c, s) / sdOfReturns(c, s - 60, s - 1);

            if (Number.isFinite(z)) {
              up = Math.max(0, up + z - p.kappa!);
              down = Math.max(0, down - z - p.kappa!);

              if (!on && up >= p.h_in!) {
                on = true;
                down = 0;
              } else if (on && down >= p.h_out!) {
                on = false;
                up = 0;
              }
            }
          }

          return { state: on };
        }
      };
    }
    case 'E05': {
      // zigzag on closes
      let direction = 0; // 0 undetermined, +1 seeking a high after a low, -1 seeking a low after a high
      let hi = c[0]!;
      let lo = c[0]!;
      let floor = NaN;

      return {
        step(s) {
          let trigger = false;

          if (s >= 1) {
            const x = c[s]!;

            if (direction === 0) {
              hi = Math.max(hi, x);
              lo = Math.min(lo, x);

              if (x >= lo * (1 + p.theta!)) {
                floor = lo;
                direction = 1;
                hi = x;
              } else if (x <= hi * (1 - p.theta!)) {
                direction = -1;
                lo = x;
              }
            } else if (direction === 1) {
              hi = Math.max(hi, x);

              if (x <= hi * (1 - p.theta!)) {
                direction = -1;
                lo = x;
              }
            } else {
              lo = Math.min(lo, x);

              if (x >= lo * (1 + p.theta!)) {
                trigger = !Number.isNaN(floor) && lo > floor;
                floor = lo;
                direction = 1;
                hi = x;
              }
            }
          }

          return { trigger, out: !Number.isNaN(floor) && c[s]! < floor * (1 - p.b!) };
        }
      };
    }
    case 'E06':
      return {
        step(s) {
          const N = p.N!;
          const s20 = s >= 20 ? sdOfReturns(c, s - 19, s) * Math.sqrt(252) : NaN;
          const s10 = s >= 10 ? sdOfReturns(c, s - 9, s) * Math.sqrt(252) : NaN;

          if (!on && s >= N && s20 <= p.v_in! && c[s]! > c[s - N]!) on = true;
          else if (on && (s10 >= p.v_in! + p.v_gap! || (s >= N && c[s]! < c[s - N]!))) on = false;

          return { state: on };
        }
      };
    case 'E07': {
      let pendingAt = -1;
      let ref = 0;

      return {
        step(s) {
          let trigger = false;

          if (pendingAt < 0) {
            if (s >= p.N! && c[s]! > maxRange(c, s - p.N!, s - 1)) {
              if (p.A === 0) trigger = true;
              else {
                pendingAt = s;
                ref = maxRange(c, s - p.N!, s - 1);
              }
            }
          } else if (c[s]! < ref) pendingAt = -1;
          else if (s - pendingAt >= p.A!) {
            trigger = true;
            pendingAt = -1;
          }

          return { trigger, out: lowClose20Out(s) };
        }
      };
    }
    case 'E08':
      return {
        step(s) {
          if (s < p.N!) return { trigger: false };

          const top = maxRange(h, s - p.N!, s - 1);
          const bottom = minRange(l, s - p.N!, s - 1);

          return (top - bottom) / bottom <= p.c! && c[s]! > top ? { trigger: true, level: bottom } : { trigger: false };
        }
      };
    case 'E09':
    case 'E10':
      return { step: (s) => ({ out: lowClose20Out(s) }) };
    case 'E11': {
      let peak = 0;

      return {
        step(s) {
          if (!on && s >= 249 && c[s]! >= maxRange(c, s - 249, s)) {
            on = true;
            peak = c[s]!;
          } else if (on) {
            peak = Math.max(peak, c[s]!);

            if (1 - c[s]! / peak >= p.D!) on = false;
          }

          return { out: !on, trigger: on && s >= p.n! && c[s]! > maxRange(c, s - p.n!, s - 1) };
        }
      };
    }
    case 'E12':
      return {
        step(s) {
          if (s < 249) return { trigger: false };

          // latest index of the 250-session maximum close
          let arg = s - 249;

          for (let i = s - 248; i <= s; i++) if (c[i]! >= c[arg]!) arg = i;

          const uptrend = c[s]! >= (1 + p.u!) * minRange(c, s - 125, s) && arg >= s - 62;

          if (!uptrend || !(c[s]! > h[s - 1]!)) return { trigger: false };

          let pulled = false;

          for (let j = s - 9; j <= s; j++) if (c[j]! <= (1 - p.p!) * maxRange(c, j - 19, j)) pulled = true;

          return pulled ? { trigger: true, level: minRange(c, s - 9, s) } : { trigger: false };
        }
      };
    case 'X-CS':
      return {
        step(s) {
          const N = p.N!;

          if (s >= N - 1) {
            let sum = 0;

            for (let i = s - N + 1; i <= s; i++) {
              const range = h[i]! - l[i]!;

              sum += range === 0 ? 0.5 : (c[i]! - l[i]!) / range;
            }

            const m = sum / N;

            if (!on && s >= N && m >= p.c_in! && c[s]! > c[s - N]!) on = true;
            else if (on && m <= p.c_out!) on = false;
          }

          return { state: on };
        }
      };
    case 'C-SMA':
      return {
        step(s) {
          if (s >= 199) {
            let sum = 0;

            for (let i = s - 199; i <= s; i++) sum += c[i]!;

            const sma = sum / 200;

            if (c[s]! > sma) on = true;
            else if (c[s]! < sma) on = false;
          }

          return { state: on };
        }
      };
    case 'C-DON':
      return {
        step: (s) => ({ trigger: s >= 55 && c[s]! > maxRange(c, s - 55, s - 1), out: lowClose20Out(s) })
      };
    case 'C-TSM':
      return {
        step(s) {
          if (s >= 250 && ds.dates[s]!.slice(0, 7) !== ds.dates[s - 1]!.slice(0, 7)) on = c[s]! > c[s - 250]!;

          return { state: on };
        }
      };
    case 'C-AL':
      return { step: () => ({ state: true }) };
    default:
      return { step: () => ({ state: false }) };
  }
};

// ----- the walk -----

// C-ALR restated from the catalog: hold exactly $100,000 / open of VGT, re-sized at the first trade (+ delay) of each
// month's first session; each month's segment books shares × (price − segment start price), friction on the shares
// traded at the re-size only, and interest on $100,000 from the segment's first session; the horizon sells everything.
const referenceAlr = (ds: Dataset, o: RunOptions): RefResult => {
  const bps = o.costBps / 10000;
  const trades: RefTrade[] = [];
  const dailyMarks: number[] = [];
  let realized = 0;
  let current: { start: number; bar: number; price: number; shares: number; friction: number } | null = null;
  let peak = 0;
  let maxDd = 0;
  const owed = (from: number, to: number) => o.principal * o.rate * ((ds.sTime[to]! - ds.sTime[from]!) / YEAR);
  const value = (s: number, price: number) =>
    realized + (current ? current.shares * (price - current.price) - current.friction - owed(current.start, s) : 0);
  const see = (v: number) => {
    if (v > peak) peak = v;
    if (peak - v > maxDd) maxDd = peak - v;
  };

  for (let s = o.firstDecisionIndex; s <= o.endIndex; s++) {
    const first = ds.sBarStart[s]!;
    const bars = ds.sBarCount[s]!;

    if (s > o.firstDecisionIndex) {
      const newMonth = ds.dates[s]!.slice(0, 7) !== ds.dates[s - 1]!.slice(0, 7);
      const at = o.delayMinutes > 0 ? firstTradeFrom(ds, s, ds.bTime[first]! + o.delayMinutes * 60) : 0;

      for (let k = 0; k < bars; k++) {
        if (k === at && (current === null || newMonth)) {
          const price = ds.bOpen[first + k]!;
          const target = o.principal / price;
          const traded = Math.abs(target - (current?.shares ?? 0));

          if (current) {
            const gain = current.shares * (price - current.price);
            const interest = owed(current.start, s);
            const net = gain - current.friction - interest;

            trades.push({
              entryIndex: current.start,
              entryBar: current.bar,
              entryRaw: current.price,
              exitIndex: s,
              exitBar: k,
              exitRaw: price,
              exitReason: 'resize',
              shares: current.shares,
              principal: o.principal,
              interest,
              net,
              rule: trades.length === 0 ? 'fresh' : 'resize',
              kind: trades.length === 0 ? 'first' : 'reentry'
            });
            realized += net;
          }

          current = { start: s, bar: k, price, shares: target, friction: traded * price * bps };
        }

        if (current) see(value(s, ds.bClose[first + k]!));
      }
    }

    if (current) see(value(s, ds.sClose[s]!));
    dailyMarks.push(value(s, ds.sClose[s]!));
  }

  let endLiquidation = realized;

  if (current) {
    const close = ds.sClose[o.endIndex]!;
    const interest = owed(current.start, o.endIndex);
    const net = current.shares * (close - current.price) - current.friction - current.shares * close * bps - interest;

    trades.push({
      entryIndex: current.start,
      entryBar: current.bar,
      entryRaw: current.price,
      exitIndex: -1,
      exitBar: -1,
      exitRaw: close,
      exitReason: 'open',
      shares: current.shares,
      principal: o.principal,
      interest,
      net,
      rule: trades.length === 0 ? 'fresh' : 'resize',
      kind: trades.length === 0 ? 'first' : 'reentry'
    });
    endLiquidation += net;
  }

  return { trades, endLiquidation, minuteDrawdown: maxDd, dailyMarks };
};

export const referenceRun = (ds: Dataset, spec: StrategySpec, o: RunOptions): RefResult => {
  if (spec.signal === 'C-ALR') {
    return referenceAlr(ds, o);
  }

  if (spec.sizing === 'Z2' || spec.randomEntry || spec.invertState || spec.weekly) {
    throw new Error('the reference covers Z0/Z1, the panel, the controls and the exits; not Z2, placebos or A2');
  }

  const c = closesOf(ds);
  const x = spec.exit;
  const stepper = stepperOf(ds, spec);
  const isLevel = ['E01', 'E02', 'E03', 'E04', 'E06', 'X-CS', 'C-SMA', 'C-TSM', 'C-AL'].includes(spec.signal);
  const isIntraday = spec.signal === 'E09' || spec.signal === 'E10';
  const hasLevel = spec.signal === 'E08' || spec.signal === 'E12';
  const lots = spec.sizing === 'Z1' ? 3 : 1;
  const unit = o.principal / lots;
  const trades: (RefTrade & { entryPriceNet?: number })[] = [];
  const dailyMarks: number[] = [];
  let realized = 0;
  // the position: lots, the first fill, the high reference, the stop, stage/probation flags, recorded level
  type Held = {
    lots: (RefTrade & { entryPriceNet: number })[];
    first: number;
    hc: number;
    stop: number;
    stage: number;
    promoted: boolean;
    level: number;
    at: number;
    sawOut: boolean; // the own-OUT condition held at a close while long
  };
  // (declared through `as` so that closures' assignments are not narrowed away)
  let held = null as Held | null;
  let order = null as { atOpen: boolean; time: number; rule: string; kind: string; level: number } | null;
  let closeExit = null as string | null;
  let addLot = false;
  let camp = null as { high: number; trough: number; exitAt: number; level: number } | null;
  // the minute rule's running reference: from the exit minute on (from the first decision session's minutes at the
  // start), firing only from the following session
  let refOn = isIntraday;
  let refVal = spec.signal === 'E09' ? Infinity : -Infinity;
  let refFrom = o.firstDecisionIndex + 1;

  if (isIntraday) {
    const e0 = o.firstDecisionIndex;

    for (let k = 0; k < ds.sBarCount[e0]!; k++) {
      const b = ds.sBarStart[e0]! + k;

      refVal = spec.signal === 'E09' ? Math.min(refVal, ds.bLow[b]!) : Math.max(refVal, ds.bHigh[b]!);
    }
  }

  let peak = 0;
  let maxDd = 0;
  const buyAt = (raw: number) => raw * (1 + o.entrySlippageBps / 10000) * (1 + o.costBps / 10000);
  const sellAt = (raw: number, stop: boolean) =>
    raw * (1 - (stop ? o.stopSlippageBps : 0) / 10000) * (1 - o.costBps / 10000);
  const interest = (principal: number, from: number, to: number) =>
    principal * o.rate * ((ds.sTime[to]! - ds.sTime[from]!) / YEAR);
  const mark = (s: number, price: number) =>
    realized +
    (held
      ? held.lots.reduce((v, t) => v + t.shares * price - t.principal - interest(t.principal, t.entryIndex, s), 0)
      : 0);
  const observe = (value: number) => {
    if (value > peak) peak = value;
    if (peak - value > maxDd) maxDd = peak - value;
  };
  let volMax = -Infinity;
  const stopOf = (s: number) => {
    const h = held!;
    const parts: number[] = [];

    if (x.probation) {
      return h.promoted ? h.hc * (1 - x.probation.trail) : h.first * (1 - x.probation.q);
    }

    if (x.profitStages) {
      parts.push(h.first * (1 - 0.06));
      if (h.stage >= 1) parts.push(h.first * 1.002);
      if (h.stage >= 2) parts.push(h.hc * (1 - (h.stage >= 3 ? 0.05 : 0.08)));
      return Math.max(...parts);
    }

    if (x.hard !== undefined) parts.push(h.first * (1 - x.hard));
    if (x.trail !== undefined) parts.push(h.hc * (1 - x.trail));
    if (x.catastrophic !== undefined) parts.push(h.hc * (1 - x.catastrophic));
    if (x.volTrail) {
      const N = x.volTrail.atrN;
      let sum = 0;

      for (let i = s - N + 1; i <= s; i++) {
        sum +=
          i === 0 ? ds.sHigh[0]! - ds.sLow[0]! : Math.max(ds.sHigh[i]!, c[i - 1]!) - Math.min(ds.sLow[i]!, c[i - 1]!);
      }

      const atr = s >= N - 1 ? sum / N : NaN;
      const dist = Number.isFinite(atr)
        ? Math.min(x.volTrail.max, Math.max(x.volTrail.min, (x.volTrail.k * atr) / h.hc))
        : x.volTrail.max;

      volMax = Math.max(volMax, h.hc * (1 - dist));
      parts.push(volMax);
    }

    return parts.length ? Math.max(...parts) : -Infinity;
  };
  const floorStepper = x.floor
    ? stepperOf(ds, { ...spec, signal: 'E05', params: { theta: x.floor.theta, b: x.floor.b } })
    : null;
  const views: ReturnType<FamilyStepper['step']>[] = [];
  const floorViews: boolean[] = [];

  for (let s = 0; s <= o.endIndex; s++) {
    views.push(stepper.step(s));
    floorViews.push(floorStepper ? Boolean(floorStepper.step(s).out) : false);
  }

  const ownOut = (s: number, level: number) =>
    isLevel ? !views[s]!.state : hasLevel ? c[s]! < level : Boolean(views[s]!.out);
  const enter = (s: number, k: number, info: { rule: string; kind: string; level: number }) => {
    const raw = priceAt(ds, s, k);
    const make = (rule: string) => {
      const price = buyAt(raw);

      return {
        entryIndex: s,
        entryBar: k,
        entryRaw: raw,
        exitIndex: -1,
        exitBar: -1,
        exitRaw: NaN,
        exitReason: 'open',
        shares: unit / price,
        principal: unit,
        interest: 0,
        net: 0,
        rule,
        kind: info.kind,
        entryPriceNet: price
      };
    };
    const lot = make(info.rule);

    trades.push(lot);
    held = {
      lots: [lot],
      first: raw,
      hc: raw,
      stop: 0,
      stage: 0,
      promoted: false,
      level: info.level,
      at: s,
      sawOut: false
    };
    volMax = -Infinity;
    held.stop = stopOf(s - 1); // only completed sessions are known at the fill
    camp = null;
    return make;
  };
  const exitAll = (s: number, k: number, raw: number, reason: string) => {
    const isStop = reason === 'stop' || reason === 'stop gap';

    for (const t of held!.lots) {
      t.exitIndex = s;
      t.exitBar = k;
      t.exitRaw = raw;
      t.exitReason = reason;
      t.interest = interest(t.principal, t.entryIndex, s);
      t.net = t.shares * sellAt(raw, isStop) - t.principal - t.interest;
      realized += t.net;
    }

    const last = held!;

    camp =
      reason === 'own out' || last.sawOut ? null : { high: last.hc, trough: Infinity, exitAt: s, level: last.level };
    held = null;
    closeExit = null;
    addLot = false;

    if (isIntraday) {
      refOn = true;
      refVal = spec.signal === 'E09' ? Infinity : last.hc;
      refFrom = s + 1;
    }
  };
  // with a delay a triggered stop fills at the first trade at or after the trigger minute + delay
  const stopAt = (s: number, k: number, raw: number): [number, number] => {
    if (o.delayMinutes <= 0) return [k, raw];

    const first = ds.sBarStart[s]!;
    const kd = firstTradeFrom(ds, s, ds.bTime[first + k]! + o.delayMinutes * 60);

    return kd >= 0 ? [kd, priceAt(ds, s, kd)] : [ds.sBarCount[s]! - 1, ds.bClose[first + ds.sBarCount[s]! - 1]!];
  };

  for (let s = o.firstDecisionIndex; s <= o.endIndex; s++) {
    const first = ds.sBarStart[s]!;
    const bars = ds.sBarCount[s]!;
    let hadExit = false;
    let hadEntry = false;

    if (s > o.firstDecisionIndex) {
      const t0 = ds.bTime[first]!;
      const dk = o.delayMinutes > 0 ? firstTradeFrom(ds, s, t0 + o.delayMinutes * 60) : 0;
      let fillBar = -1;
      let fillInfo: { rule: string; kind: string; level: number } | null = null;

      if (!held && order) {
        fillBar = dk; // an opening fill, a carried minute decision included, waits the delay from the open
        fillInfo = { rule: order.rule, kind: order.kind, level: order.level };
      }

      let make: ((rule: string) => RefTrade & { entryPriceNet: number }) | null = null;

      for (let k = 0; k <= bars; k++) {
        const b = first + k;
        const print = k === bars;

        if (held && closeExit && k === dk) {
          exitAll(s, k, priceAt(ds, s, k), k === 0 && !print && ds.bOpen[b]! <= held.stop ? 'stop gap' : closeExit);
          hadExit = true;
          observe(realized);
        }

        if (held && !print) {
          if (ds.bOpen[b]! <= held.stop) {
            const [kk, raw] = stopAt(s, k, ds.bOpen[b]!);

            exitAll(s, kk, raw, k === 0 ? 'stop gap' : 'stop');
            hadExit = true;
            observe(realized);
          } else if (ds.bLow[b]! <= held.stop) {
            const [kk, raw] = stopAt(s, k, held.stop);

            exitAll(s, kk, raw, 'stop');
            hadExit = true;
            observe(realized);
          }
        }

        if (!held && !hadExit && !hadEntry && fillInfo && k === fillBar) {
          make = enter(s, k, fillInfo);
          order = null;
          hadEntry = true;

          if (!print && ds.bLow[b]! <= held!.stop) {
            const [kk, raw] = stopAt(s, k, held!.stop);

            exitAll(s, kk, raw, 'stop');
            hadExit = true;
            observe(realized);
          }
        }

        if (held && addLot && k === dk) {
          const builder =
            make ??
            ((rule: string) => {
              const raw = priceAt(ds, s, k);
              const price = buyAt(raw);

              return {
                entryIndex: s,
                entryBar: k,
                entryRaw: raw,
                exitIndex: -1,
                exitBar: -1,
                exitRaw: NaN,
                exitReason: 'open',
                shares: unit / price,
                principal: unit,
                interest: 0,
                net: 0,
                rule,
                kind: held!.lots[0]!.kind,
                entryPriceNet: price
              };
            });
          const lot = builder('tranche');

          trades.push(lot);
          held.lots.push(lot);
          addLot = false;
        }

        if (!held && !order && refOn && !print && isIntraday) {
          const may = !hadEntry && s >= refFrom && !(camp && spec.reentry === 'R5');
          let fire = false;

          if (spec.signal === 'E09') {
            refVal = Math.min(refVal, ds.bLow[b]!);
            fire = may && ds.bClose[b]! >= refVal * (1 + spec.params.Y!);
          } else {
            fire = may && ds.bClose[b]! > refVal * (1 + spec.params.Yb!);
            refVal = Math.max(refVal, ds.bHigh[b]!);
          }

          if (fire) {
            const time = ds.bTime[b]! + 60 + o.delayMinutes * 60;
            const fill = firstTradeAfterDecision(ds, s, time);
            const kind = camp ? 'reentry' : 'first';

            refOn = false;

            if (fill >= 0) {
              fillBar = fill;
              fillInfo = { rule: 'minute', kind, level: NaN };
            } else {
              order = { atOpen: false, time, rule: 'minute', kind, level: NaN };
            }
          }
        }

        if (held && !print) observe(mark(s, ds.bClose[b]!));
      }
    }

    // the close
    if (held) {
      const h = held;

      observe(mark(s, c[s]!));
      h.hc = Math.max(h.hc, c[s]!);
      if (ownOut(s, h.level)) h.sawOut = true;

      if (x.profitStages) {
        const g = c[s]! / h.first - 1;

        h.stage = Math.max(h.stage, g >= 0.25 ? 3 : g >= 0.1 ? 2 : g >= 0.04 ? 1 : 0);
      }

      if (x.probation && !h.promoted && c[s]! >= h.first * (1 + x.probation.g)) h.promoted = true;

      const age = s - h.at + 1;
      let why: string | null = null;

      if (x.ownOut && ownOut(s, h.level)) why = 'own out';
      else if (x.trendLow && s >= x.trendLow && c[s]! < minRange(c, s - x.trendLow, s - 1)) why = 'trend';
      else if (
        x.andPrice !== undefined &&
        c[s]! <= h.hc * (1 - x.andPrice) &&
        s >= 20 &&
        c[s]! < minRange(c, s - 20, s - 1)
      )
        why = 'trend';
      else if (x.floor && floorViews[s]) why = 'structural';

      if (!why && x.maxHold !== undefined && age >= x.maxHold) why = 'max hold';
      else if (
        !why &&
        x.stall &&
        s - h.at >= x.stall.T &&
        c[s]! < c[s - x.stall.T]! * (1 + (x.stall.T * 0.11) / 252 + x.stall.margin)
      )
        why = 'stall';
      else if (!why && x.probation && !h.promoted && age >= x.probation.P) why = 'probation';

      if (why) closeExit = why;
      else if (spec.sizing === 'Z1' && h.lots.length < 3 && c[s]! >= h.first * (1 + 0.03 * h.lots.length))
        addLot = true;

      h.stop = stopOf(s);
    } else if (!order) {
      if (camp) {
        if (ownOut(s, camp.level)) camp = null;
        else camp.trough = Math.min(camp.trough, c[s]!);
      }

      const sma50ok =
        spec.exhaustion === undefined ||
        (s >= 49 && c[s]! / (c.slice(s - 49, s + 1).reduce((a, v) => a + v, 0) / 50) - 1 <= spec.exhaustion);

      if (s < o.endIndex && sma50ok) {
        const v = views[s]!;
        let decided: { rule: string; kind: string; level: number } | null = null;
        const level = hasLevel && v.level !== undefined ? v.level : NaN;

        if (camp) {
          const r = spec.reentry;
          const ok =
            r === 'R0' ||
            (r === 'R2' && s - camp.exitAt >= 10) ||
            ((r === 'R3' || r === 'R3F') && c[s]! > camp.high) ||
            (r === 'R4' && c[s]! >= camp.trough + 0.5 * (camp.high - camp.trough));

          if (ok) decided = { rule: r, kind: 'reentry', level: camp.level };
          else if (!isLevel && !isIntraday && v.trigger && r !== 'R5')
            decided = { rule: 'fresh', kind: 'reentry', level }; // inside the live campaign, with the new references
        } else if (isLevel ? v.state : !isIntraday && v.trigger) {
          decided = { rule: 'fresh', kind: 'first', level };
        }

        if (decided) {
          if (decided.kind === 'first') camp = null;

          order = { atOpen: true, time: 0, ...decided };
          refOn = false;
        }
      }
    }

    dailyMarks.push(
      realized +
        (held
          ? held.lots.reduce((v, t) => v + t.shares * c[s]! - t.principal - interest(t.principal, t.entryIndex, s), 0)
          : 0)
    );
  }

  let endLiquidation = realized;

  if (held) {
    for (const t of held.lots) {
      t.exitRaw = c[o.endIndex]!;
      t.interest = interest(t.principal, t.entryIndex, o.endIndex);
      t.net = t.shares * c[o.endIndex]! * (1 - o.costBps / 10000) - t.principal - t.interest;
      endLiquidation += t.net;
    }
  }

  return {
    trades,
    endLiquidation,
    minuteDrawdown: maxDd,
    dailyMarks
  };
};

// Executable paths and their ledgers (PROTOCOL.md §5, §9, §11): the S1/S2/S3 schedule of four fold picks (C-IDLE for
// an undefined pick), the controls' annual-reset paths, Stage 1's non-executable splice with exactly chained minute
// marks, per-trade and per-campaign window contributions, campaign giveback, transition P&L and up-leg capture.
import type { Dataset } from '../four-family/data.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { type Leg, upLegs } from '../study3-vgt-momentum/ledgers.ts';
import { controlPolicy } from './catalog.ts';
import { folds, histories, study } from './context.ts';
import { indexOfDate } from './data.ts';
import type { Engine } from './engine.ts';
import type { Policy, RunOptions, RunResult, ScheduleItem, SizingSpec, Trade, Transition } from './types.ts';

export const boundaries = (ds: Dataset) => folds.map((f) => indexOfDate(ds, histories[f].window![0]));

export const idlePolicy = (): Policy => controlPolicy('C-IDLE');

// The executable schedule: the fold-F policy from b_F's close; an undefined pick is C-IDLE (PROTOCOL.md §5.2).
export const pathSchedule = (ds: Dataset, picks: (Policy | undefined)[]): ScheduleItem[] =>
  boundaries(ds).map((index, i) => ({ index, policy: picks[i] ?? idlePolicy() }));

export const pathOptions = (ds: Dataset, base: RunOptions, transition: Transition): RunOptions => {
  const b = boundaries(ds);

  return {
    ...base,
    firstDecisionIndex: b[0]!,
    endIndex: indexOfDate(ds, study.dataCap),
    windows: b,
    recordDaily: true,
    transition
  };
};

export const runPath = (engine: Engine, picks: (Policy | undefined)[], base: RunOptions, transition: Transition) =>
  engine.run(pathSchedule(engine.ds, picks), pathOptions(engine.ds, base, transition));

// A control's annual-reset path: the control re-adopted at every boundary (forced S1 liquidation and re-entry on its
// own signal), with the sizing of Π1's policy in each window.
export const controlResetSchedule = (ds: Dataset, control: string, sizings: SizingSpec[]): ScheduleItem[] =>
  boundaries(ds).map((index, i) => {
    const policy = controlPolicy(control);

    return {
      index,
      policy: {
        ...policy,
        id: `${control}@${folds[i]}`,
        sizing: policy.sizing.kind === 'ZR' ? policy.sizing : (sizings[i] ?? { kind: 'Z0' })
      }
    };
  });

// ----- contributions, campaigns, giveback -----

export interface Contribution {
  trade: number;
  campaign: number;
  policy: string;
  kind: Trade['kind'];
  window: number;
  carried: boolean;
  startValue: number; // the trade's liquidation value at b (0 if not open)
  endValue: number; // its net (exited) or liquidation value at e
  contribution: number;
  exitReason: string;
}

// Per window and trade: contribution = value at min(exit, e) - value at b, from the daily rows (open trade's
// liquidation value = liquidation - realized) and the trade nets.
export const contributions = (run: RunResult, firstIndex: number): Contribution[] => {
  const daily = run.daily!;
  const rows: Contribution[] = [];
  const valueAt = (s: number) => {
    const row = daily[s - firstIndex]!;

    return { trade: row.openTrade, value: row.liquidation - row.realized };
  };

  for (const [w, window] of run.windows.entries()) {
    const b = valueAt(window.boundary);
    const e = valueAt(window.end);

    for (const trade of run.trades) {
      const exitIndex = trade.exitIndex < 0 ? Infinity : trade.exitIndex;
      const openAtB = b.trade === trade.id;
      const touches = openAtB || (trade.entryIndex > window.boundary && trade.entryIndex <= window.end);

      if (!touches) {
        continue;
      }

      const startValue = openAtB ? b.value : 0;
      const endValue = exitIndex <= window.end ? trade.net : e.trade === trade.id ? e.value : trade.net;

      rows.push({
        trade: trade.id,
        campaign: trade.campaign,
        policy: trade.policy,
        kind: trade.kind,
        window: w,
        carried: openAtB,
        startValue,
        endValue,
        contribution: endValue - startValue,
        exitReason: exitIndex <= window.end ? trade.exitReason : 'open at window end'
      });
    }
  }

  return rows;
};

// A campaign's cumulative P&L at each close (realised nets of its closed trades + the open trade's liquidation
// value); giveback = its peak - its final value (PROTOCOL.md §3.3).
export const campaignGivebacks = (run: RunResult, firstIndex: number) => {
  const daily = run.daily!;
  const byId = new Map(run.trades.map((t) => [t.id, t]));
  const state = new Map<string, { closed: number; peak: number; last: number; from: number; to: number }>();
  const key = (t: Trade) => `${t.policy}#${t.campaign}`;

  for (let i = 0; i < daily.length; i++) {
    const s = firstIndex + i;
    const row = daily[i]!;

    for (const t of run.trades) {
      if (t.exitIndex === s) {
        const c = state.get(key(t)) ?? { closed: 0, peak: -Infinity, last: 0, from: t.entryIndex, to: s };

        c.closed += t.net;
        c.last = c.closed;
        c.peak = Math.max(c.peak, c.last);
        c.to = s;
        state.set(key(t), c);
      }
    }

    if (row.openTrade) {
      const t = byId.get(row.openTrade)!;
      const c = state.get(key(t)) ?? { closed: 0, peak: -Infinity, last: 0, from: t.entryIndex, to: s };

      c.last = c.closed + (row.liquidation - row.realized);
      c.peak = Math.max(c.peak, c.last);
      c.to = s;
      state.set(key(t), c);
    }
  }

  return [...state.entries()].map(([id, c]) => ({
    campaign: id,
    from: c.from,
    to: c.to,
    peak: c.peak,
    final: c.last,
    giveback: c.peak - c.last
  }));
};

// ----- Stage 1's splice: chained window minute marks (exact) -----

export interface MarkStream {
  times: number[];
  values: number[];
}

export const chainStreams = (windows: { boundaryMark: number; endMark: number; stream: MarkStream }[]) => {
  const tracker = new Tracker(0, 0);
  let value = 0;

  for (const w of windows) {
    const offset = value - w.boundaryMark;

    w.stream.values.forEach((v, i) => tracker.updateStrict(v + offset, w.stream.times[i]!));
    value = w.endMark + offset;
  }

  return { minuteDrawdown: tracker.stats().maximum, end: value };
};

// ----- up-legs (Stage 1 §13 zigzag, imported) and capture -----

export const legsOf = (ds: Dataset, firstIndex: number, endIndex: number): Leg[] => upLegs(ds, firstIndex, endIndex);

// Capture of a leg: Σ over held share segments (split at trims) of shares × (end − start) / (B0 × leg gain), with
// start = the segment's raw start if after t0 else C_t0 and end = its raw end if by t1 else C_t1.
export const legCapture = (ds: Dataset, leg: Leg, run: RunResult, firstIndex: number, endIndex: number) => {
  const C = ds.sClose;
  const { t0, t1 } = leg;
  let gain = 0;
  let firstEntry = -1;

  for (const t of run.trades) {
    const points: { index: number; raw: number }[] = [
      { index: t.entryIndex, raw: t.entryRaw },
      ...t.trims.map((x) => ({ index: x.index, raw: x.raw })),
      { index: t.exitIndex < 0 ? endIndex : t.exitIndex, raw: t.exitIndex < 0 ? C[endIndex]! : t.exitRaw }
    ];
    let shares = t.shares;

    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;

      if (b.index > t0 && a.index <= t1) {
        const start = a.index > t0 ? a.raw : C[t0]!;
        const end = b.index <= t1 ? b.raw : C[t1]!;

        gain += shares * (end - start);
      }

      shares -= i < t.trims.length ? t.trims[i]!.shares : 0;
    }

    if (t.entryIndex > t0 && t.entryIndex <= t1 && firstEntry < 0) {
      firstEntry = t.entryIndex;
    }
  }

  const daily = run.daily!;
  let idle = 0;

  for (let s = t0 + 1; s <= t1; s++) {
    if ((daily[s - firstIndex]?.shares ?? 0) === 0) {
      idle++;
    }
  }

  const mark = (s: number) => daily[Math.max(0, s - firstIndex)]?.liquidation ?? 0;

  return {
    from: leg.from,
    to: leg.to,
    legGain: leg.gain,
    capture: gain / (study.principal * leg.gain),
    entryDelay: firstEntry < 0 ? null : firstEntry - t0,
    idleShare: idle / (t1 - t0),
    net: mark(t1) - mark(Math.max(t0, firstIndex))
  };
};

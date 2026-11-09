// One evaluation = one complete causal replay of one configuration under one rule set and one execution setting on
// one door (standard §0.3 "backend evaluation"). `Rec` is the compact record the search, the neighbourhoods and the
// archive keep; `detailOf` adds what the reports need for centres.
import { createHash } from 'node:crypto';
import { buildMarket, minuteClock, sessionClock } from '../intraday-d1/periods.ts';
import type { Market } from '../intraday-d1/periods.ts';
import { type FamilyKey, type Rules, chronology, execution, families, ladder } from './context.ts';
import type { Door } from './data.ts';
import { type Lot, type RunResult, type Settings, type StopFill, simulate } from './engine.ts';
import { type Candidate, type Grid, paramsOf, valueOf } from './space.ts';

export type RuleSet = FamilyKey | keyof typeof ladder;
export const rulesOf = (r: RuleSet): Rules => (r in families ? families[r as FamilyKey] : ladder[r as keyof typeof ladder]);

export interface SettingsSpec {
  costBps?: number;
  rate?: number;
  stopFill?: StopFill;
  stopSlippageBps?: number;
}

export const settingsOf = (spec: SettingsSpec = {}): Settings => ({
  principal: execution.principal,
  rate: spec.rate ?? execution.rate,
  costBps: spec.costBps ?? execution.costBps,
  stopFill: spec.stopFill ?? execution.stopFill,
  stopSlippageBps: spec.stopSlippageBps ?? execution.stopSlippageBps
});

export const settingsKey = (spec: SettingsSpec = {}) => {
  const s = settingsOf(spec);

  return `c${s.costBps}r${s.rate}f${s.stopFill}s${s.stopSlippageBps}`;
};

export interface DoorView {
  door: Door;
  market: Market;
  armFrom: number;
  end: number;
  yearEnds: number[]; // the last session of each calendar year (reset trackers)
}

export const viewOf = (door: Door): DoorView => {
  const market = buildMarket(door.sessions);
  const armFrom = door.sessions.findIndex((s) => s.date >= chronology.armFrom);
  const yearEnds: number[] = [];

  door.sessions.forEach((s, k) => {
    const next = door.sessions[k + 1];

    if (!next || next.date.slice(0, 4) !== s.date.slice(0, 4)) yearEnds.push(k);
  });

  return { door, market, armFrom, end: door.sessions.length - 1, yearEnds };
};

export const sessionIndex = (view: DoorView, date: string) => {
  const k = view.door.sessions.findIndex((s) => s.date === date);

  if (k < 0) throw new Error(`session ${date} is not on door ${view.door.key}`);

  return k;
};

export interface RunSpec {
  ruleSet: RuleSet;
  grid: Grid;
  settings?: SettingsSpec;
  endSession?: number;
  blackout?: [number, number];
  segmentEnds?: number[];
  marks?: boolean;
}

export const run = (view: DoorView, spec: RunSpec): RunResult => {
  const c: Candidate = { family: 'F4', grid: spec.grid };
  const B = valueOf(spec.grid, 'B');
  const clock = minuteClock(view.market, view.door.sessions, B);

  return simulate(
    view.market,
    clock,
    rulesOf(spec.ruleSet),
    paramsOf(c),
    settingsOf(spec.settings),
    {
      armFromSession: view.armFrom,
      endSession: spec.endSession ?? view.end,
      ...(spec.blackout ? { blackout: spec.blackout } : {}),
      ...(spec.segmentEnds ? { segmentEnds: spec.segmentEnds } : {})
    },
    { marks: spec.marks ?? false }
  );
};

// The daily D1 control on the session clock (the L0 engine with the session clock is D1: parity P1).
export const runDaily = (
  view: DoorView,
  settings: SettingsSpec,
  arm: 'native' | 'harmonized',
  extra: { endSession?: number; segmentEnds?: number[]; marks?: boolean } = {}
) => {
  return simulate(
    view.market,
    sessionClock(view.market, view.door.sessions),
    ladder.L0,
    dailyParams,
    settingsOf(settings),
    {
      armFromSession: arm === 'native' ? 0 : view.armFrom,
      endSession: extra.endSession ?? view.end,
      ...(extra.segmentEnds ? { segmentEnds: extra.segmentEnds } : {})
    },
    { marks: extra.marks ?? false }
  );
};

export const dailyParams = {
  X: 0.216,
  Y: 0.003,
  S: 0.073,
  holdSeconds: 8 * 86400,
  lookbackPeriods: 74,
  buffer: 0.029,
  pullback: 0.09,
  continuationPeriods: 60
};

// The ledger signature: the funded lots' (entry bar, exit bar, exit reason) — behaviourally identical configurations
// share it.
export const signatureOf = (lots: readonly Lot[]) => {
  const h = createHash('sha1');

  for (const l of lots) h.update(`${l.entryBar}:${l.exitBar}:${l.exitReason};`);

  return h.digest('hex').slice(0, 16);
};

export interface Rec {
  net: number;
  realized: number;
  unrealized: number;
  dd: number; // maximum minute drawdown
  lots: number;
  wins: number;
  sameSession: number; // round trips closed in their entry session
  interest: number;
  costs: number;
  gross: number; // Σ lot gross (after costs, before interest)
  medianHold: number; // wall-clock minutes per lot (median)
  medianDepth: number; // median entry depth below its anchor (1 − activation ÷ anchor high)
  worst: number; // the worst lot's net
  best: number;
  open: boolean;
  sig: string;
}

const median = (v: number[]) => {
  if (v.length === 0) return 0;

  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;

  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export const recOf = (r: RunResult): Rec => {
  let wins = 0;
  let same = 0;
  let gross = 0;
  let worst = 0;
  let best = 0;
  const holds: number[] = [];
  const depths: number[] = [];

  for (const l of r.lots) {
    if (l.net > 0) wins++;
    if (!l.open && l.exitSession === l.entrySession) same++;
    gross += l.gross;
    if (l.net < worst) worst = l.net;
    if (l.net > best) best = l.net;
    if (!l.open) holds.push((l.exitTime - l.entryTime) / 60);
    depths.push(1 - l.activationPrice / l.anchorHigh);
  }

  return {
    net: r.net,
    realized: r.realized,
    unrealized: r.unrealized,
    dd: r.minuteDrawdown.maximum,
    lots: r.lots.length,
    wins,
    sameSession: same,
    interest: r.interest,
    costs: r.costs,
    gross,
    medianHold: median(holds),
    medianDepth: median(depths),
    worst,
    best,
    open: r.lots.at(-1)?.open ?? false,
    sig: signatureOf(r.lots)
  };
};

export const yearsOf = (view: DoorView) => (view.end - view.armFrom + 1) / 252;

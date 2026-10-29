// The engine-facing types shared by the fast engine (engine.ts) and the independent reference (reference.ts):
// a policy (entry, exit components, re-entry rule, sizing), a schedule of policies for executable paths, the run
// options and the result (trades with trims, daily rows, drawdowns, exposure). PROTOCOL.md §3–§5 define the meaning.
import type { Params, SignalId } from '../study3-vgt-momentum/signals.ts';

export type ReentryRule = 'R3F' | 'RN' | 'RF' | 'R0' | 'RC10' | 'RP50' | 'RS' | 'RFL' | 'REF' | 'RPM';

// Stop components (resting, recomputed at each close, never lowered) and close-decided exit rules.
export interface ExitSpec {
  own: boolean; // exit at the next open when the entry's own OUT holds at `ownConsecutive` consecutive held closes
  ownConsecutive?: number; // XO's c (default 1)
  hard?: number; // E (1 - h)
  trail?: { t: number; ref: 0 | 1 }; // ref 0: Hc (1 - t); ref 1: Hh (1 - t)
  catastrophic?: number; // Hc (1 - cat)
  vol?: { k: number; n: number; dmin: number; dmax: number }; // Hc (1 - clamp(k ATR_n / Hc, dmin, dmax)), ratcheted
  floor?: { theta: number; b: number; arm: boolean }; // XS: next open when C < F (1 - b); arm: only after a held close above it
  trendLow?: number; // XT: next open when C < min(C_{s-N..s-1})
  ratchet?: { g: number; t2: number }; // XT: once Hc >= E (1 + g), Hc (1 - t2)
  retain?: { a: number; rho: number }; // XRP: once Hc >= E (1 + a), E + rho (Hc - E)
  giveback?: { A: number; G: number }; // XRD: once P* >= A, the price at which P = P* - G
  damage?: { p: number; N: number; mode: 0 | 1 | 2 }; // XD: close-decided (N = 0: no trend damage; p = 1: no price damage)
  stall?: { T: number; m: number; d: number; hurdle: 'financing' | 'sessions' }; // XP: close-decided ('sessions': Stage 1 X6b)
  stale?: { U: number; d: number }; // XU: next open when sessions since the last new Hc >= U and C <= Hc (1 - d)
  maxHold?: number; // XM: next open at the close of the M-th session held
  expTrail?: { t0: number; gamma: number; tmin: number }; // XE
  d1net?: { t: number }; // B-D1N: Hh (1 - t), only when >= the break-even price
}

export type SizingSpec =
  | { kind: 'Z0' }
  | { kind: 'Z1'; band: number } // monthly trim to B0 when G > B0 (1 + band)
  | { kind: 'Z2'; u: number; v: number } // trim to B0 (1 + v) when G >= B0 (1 + u)
  | { kind: 'Z3'; G: number } // no trim; adds a giveback component with A = G
  | { kind: 'ZR' }; // C-ALR's monthly reset (Stage 1's frozen always-long reference)

export interface Policy {
  id: string;
  entry: SignalId; // a Stage 1 family or control
  entryParams: Params;
  exit: ExitSpec;
  reentry: ReentryRule;
  sizing: SizingSpec;
}

export type Transition = 'S1' | 'S2' | 'S3';

export interface ScheduleItem {
  index: number; // the boundary session b: this policy is selected with data <= b and active from b's close
  policy: Policy;
}

export type Financing = 'net' | 'slot'; // net-debit (primary) or Stage 1's fixed-slot convention (parity)

export interface RunOptions {
  financing: Financing;
  costBps: number;
  rate: number;
  principal: number;
  stopSlippageBps: number;
  entrySlippageBps: number;
  openSlippageBps: number; // extra adverse slippage on every opening-trade fill (stress)
  delayMinutes: number;
  firstDecisionIndex: number; // the first close that may decide; accounting from its close (mark 0)
  endIndex: number;
  windows?: number[]; // window boundary sessions b0 < b1 < ... (marks restart at each); the last window ends at endIndex
  recordDaily?: boolean;
  transition?: Transition; // for a schedule with more than one item (default S1)
  markSink?: (value: number, time: number) => void; // receives every minute-drawdown mark (diagnostics only)
}

export type ExitReason =
  | 'own out'
  | 'structural'
  | 'trend'
  | 'damage'
  | 'stall'
  | 'max hold'
  | 'stale'
  | 'stop'
  | 'stop gap'
  | 'transition'
  | 'conversion'
  | 'resize'
  | 'open';

export type StopComponent =
  'hard' | 'trail' | 'catastrophic' | 'vol' | 'ratchet' | 'retain' | 'giveback' | 'exp' | 'd1net' | '';

export interface Trim {
  index: number;
  bar: number;
  raw: number;
  price: number;
  shares: number;
  proceeds: number;
  repaid: number; // principal repaid (min(L, proceeds))
}

export interface Trade {
  id: number;
  policy: string;
  campaign: number;
  kind: 'first' | 'reentry' | 'conversion';
  rule: string; // fresh, R-rule, minute, conversion, resize (ZR segments)
  entryIndex: number;
  entryBar: number;
  entryTime: number;
  entryRaw: number;
  entryPrice: number; // average cost per share
  shares: number; // shares at entry
  principal: number; // borrowed at entry
  trims: Trim[];
  exitIndex: number; // -1 while open at the end
  exitBar: number;
  exitTime: number;
  exitRaw: number;
  exitPrice: number;
  exitShares: number;
  exitReason: ExitReason;
  stopComponent: StopComponent;
  stopLevel: number;
  gapFlag: '' | 'gap' | 'level above prior close';
  shortfall: number; // stop level - fill (stop exits)
  proceeds: number; // all sale proceeds (trims + final; at liquidation for an open trade)
  priceGain: number; // sum over sold shares of shares x (raw - entryRaw); a ZR segment: shares x (exit - basis)
  friction: number;
  interest: number;
  net: number; // proceeds - principal - interest (an open trade: at liquidation)
  sessionsHeld: number;
  calendarDays: number;
  maeLow: number;
  mfeHigh: number;
  highClose: number; // Hc at exit
  peakProfit: number; // max open profit P at held closes
  peakGross: number; // max S x C at held closes
}

export interface AccountEvent {
  index: number;
  bar: number;
  kind: 'entry' | 'trim' | 'exit' | 'transition' | 'conversion' | 'end';
  trade: number;
  raw: number;
  shares: number; // traded
  cash: number; // proceeds (+) or cost (-)
  M: number; // principal cash balance after the event
  L: number; // the open trade's principal after the event
  debit: number; // max(-M, 0)
  interest: number; // account interest accrued to the event's session
  S: number; // shares held after the event
  G: number; // S x raw
  mark: number; // M + S x raw - interest
}

export interface DailyRow {
  mark: number;
  liquidation: number;
  shares: number;
  loan: number;
  gross: number; // S x close
  cash: number; // the principal cash balance M
  realized: number; // closed trades' nets less the carried-balance interest so far (liquidation − realized = the open trade's liquidation value)
  openTrade: number; // id of the trade open at the close, 0 if flat
}

export interface DrawdownStats {
  maximum: number;
  peakTime: number;
  troughTime: number;
  peakValue: number;
  troughValue: number;
}

export interface WindowResult {
  boundary: number;
  end: number;
  startMark: number;
  startLiquidation: number;
  endMark: number;
  endLiquidation: number;
  increment: number; // endLiquidation - startLiquidation
  minuteDd: DrawdownStats;
  dailyDd: number;
  grossDollarDays: number;
  loanDollarDays: number;
  debitDollarDays: number;
  calendarDays: number;
  peakGross: number;
  sessionsLong: number;
  sessions: number;
  interest: number; // interest accrued inside the window
}

export interface RunResult {
  trades: Trade[];
  realized: number;
  endMark: number;
  endLiquidation: number;
  minuteDd: DrawdownStats;
  dailyDd: number;
  windows: WindowResult[];
  sessionsLong: number;
  sessions: number;
  grossDollarDays: number;
  loanDollarDays: number;
  calendarDays: number;
  peakGross: number;
  campaigns: number;
  reentries: number;
  reentryOpportunities: number;
  yearsHeld: number;
  transitions: { index: number; kind: string; detail: string }[];
  flatInterest: number; // net-debit account interest accrued while flat (part of carriedInterest)
  carriedInterest: number; // net-debit account interest − Σ trade interest (0 in fixed-slot mode)
  debitDollarDays: number;
  daily?: DailyRow[];
  events?: AccountEvent[];
  pathHash: string;
}

// The exit side of a D1 position with risk controls (SPECIFICATION.md §4–§5): the frozen ExitManager, unchanged and
// called first, plus
// - the unconditional protective loss stop: level L = the entry fill's raw price × (1 − d/1000), immutable, active at
//   every session the position is open at the start (the D1 convention: never on the entry session), triggered at
//   price ≤ L with the trailing stop's own fill conventions (gap → opening trade; minute open through L → that open;
//   minute low through L → L under the `stop` fill, the next minute's open under `next-open`);
// - the maximum-hold policy: legacy (the book's calendar days), disabled (∞; the loss buffer, which only applies from
//   the hold age, never acts either) or adaptive (progress-extended: H(s) = the extended bound once the post-entry high
//   through the previous session reaches the entry fill's raw price × (1 + g), else the base hold; latched).
//
// The legacy decision (with the effective hold) and the protective trigger are combined by the precedence of
// SPECIFICATION.md §4.1. With the stop off and the legacy hold, `evaluate` returns the frozen decision unchanged.
import type { Dataset } from '../four-family/data.ts';
import {
  type ExecutionPrice,
  type ExitDecision,
  type ExitReason,
  type ExitSettings,
  type LotState,
  type StrategyParams,
  ExitManager,
  firstTradeFrom,
  interestOn,
  secondsPerDay,
  secondsPerMinute,
  tradeExecution
} from '../shared-margin-portfolio/strategy.ts';

export const protectiveReasons = ['protective stop', 'protective stop gap'] as const;
export type ProtectiveReason = (typeof protectiveReasons)[number];
export const isProtective = (reason: string): reason is ProtectiveReason =>
  (protectiveReasons as readonly string[]).includes(reason);

export type HoldRuntime =
  | { mode: 'legacy'; days: number }
  | { mode: 'disabled' }
  | { mode: 'adaptive'; baseDays: number; extendedDays: number; progressPrice: number };

export interface ExitPolicy {
  protectiveLevel: number | null; // raw price; null = off
  hold: HoldRuntime;
}

// The first protective trigger of session s (the trailing stop's conventions with level L): the kind ('gap' at the
// opening trade, 'open' a minute opening at or below L, 'low' a minute trading down to L), the trigger minute and the fill.
export interface ProtectiveTrigger {
  kind: 'gap' | 'open' | 'low';
  triggerK: number;
  barIndex: number;
  price: number;
  time: number;
  execution: ExecutionPrice;
}

export const protectiveTrigger = (
  ds: Dataset,
  s: number,
  level: number,
  stopFill: ExitSettings['stopFill']
): ProtectiveTrigger | undefined => {
  const start = ds.sBarStart[s]!;
  const count = ds.sBarCount[s]!;
  const at = (k: number) => (k < count ? ds.bTime[start + k]! : ds.sCloseTime[s]!);
  const priceOf = (k: number) => (k < count ? ds.bOpen[start + k]! : ds.sClosingPrint[s]!);

  if (ds.sOpen[s]! <= level)
    return { kind: 'gap', triggerK: 0, barIndex: 0, price: ds.sOpen[s]!, time: at(0), execution: 'opening trade' };

  for (let k = 0; k < count; k++) {
    if (ds.bOpen[start + k]! <= level)
      return {
        kind: 'open',
        triggerK: k,
        barIndex: k,
        price: ds.bOpen[start + k]!,
        time: at(k),
        execution: 'minute open through stop'
      };

    if (ds.bLow[start + k]! <= level) {
      if (stopFill === 'stop')
        return { kind: 'low', triggerK: k, barIndex: k, price: level, time: at(k), execution: 'stop level' };

      const next = firstTradeFrom(ds, s, ds.bTime[start + k]! + secondsPerMinute);

      return next >= 0
        ? { kind: 'low', triggerK: k, barIndex: next, price: priceOf(next), time: at(next), execution: tradeExecution(ds, s, next) }
        : {
            kind: 'low',
            triggerK: k,
            barIndex: k,
            price: ds.bClose[start + k]!,
            time: ds.bTime[start + k]!,
            execution: 'trigger minute close'
          };
    }
  }

  return undefined;
};

// The first minute at which a resting stop at `level` is reached (open or low), or -1: the trigger minute of a legacy
// trailing-stop decision.
const firstReach = (ds: Dataset, s: number, level: number) => {
  const start = ds.sBarStart[s]!;
  const count = ds.sBarCount[s]!;

  for (let k = 0; k < count; k++) if (ds.bOpen[start + k]! <= level || ds.bLow[start + k]! <= level) return k;
  return -1;
};

export class RiskExitManager extends ExitManager {
  extendedFrom = -1; // adaptive: the session from which the extended hold applies (latched), -1 = not extended
  effectiveHold = NaN; // the hold applied at the latest evaluated session (calendar days; Infinity when disabled)

  constructor(
    ds: Dataset,
    params: StrategyParams,
    settings: ExitSettings,
    readonly policy: ExitPolicy
  ) {
    // A private copy: the effective hold of each session is written into it before the frozen evaluate reads it.
    super(ds, { ...params }, settings);
    if (policy.hold.mode === 'legacy' && policy.hold.days !== params.maximumHoldDays)
      throw new Error('the legacy hold is the book’s own maximumHoldDays');
  }

  // H(s), read before the session from the post-entry high through the previous session (SPECIFICATION.md §5.1).
  holdAt(s: number) {
    const h = this.policy.hold;

    if (h.mode === 'legacy') return h.days;
    if (h.mode === 'disabled') return Infinity;
    if (this.extendedFrom < 0 && this.postEntryHigh >= h.progressPrice) this.extendedFrom = s;
    return this.extendedFrom >= 0 ? h.extendedDays : h.baseDays;
  }

  override evaluate(lot: LotState, s: number): ExitDecision | undefined {
    const { ds } = this;
    const hold = this.holdAt(s);

    this.effectiveHold = hold;
    this.params.maximumHoldDays = hold;

    const legacy = super.evaluate(lot, s);
    const level = this.policy.protectiveLevel;

    if (level === null) return legacy;

    const p = protectiveTrigger(ds, s, level, this.settings.stopFill);

    if (!p) return legacy;

    const start = ds.sBarStart[s]!;
    const interest = interestOn(lot, this.settings.marginInterestRate, ds.sTime[s]!);
    const daysHeld = (ds.sTime[s]! - lot.holdTimestamp) / secondsPerDay;
    const protective = (): ExitDecision => {
      // the position exits here: a buffered sale carried by the legacy decision is void
      this.pendingSignalTime = NaN;
      this.pendingSignalPrice = NaN;

      return {
        reason: (p.kind === 'gap' ? 'protective stop gap' : 'protective stop') as ExitReason,
        barIndex: p.barIndex,
        price: p.price,
        time: p.time,
        execution: p.execution,
        isMaximumHoldDue: daysHeld >= hold && lot.shares * ds.sOpen[s]! - lot.investment - interest < 0,
        signalTime: NaN,
        signalPrice: NaN,
        stopPrice: this.stopPrice,
        stopActive: this.isStopActive(lot, s)
      };
    };
    // 1. an active trailing stop gapped through keeps the opening trade (legacy); else the protective gap takes it
    if (legacy?.reason === 'trailing stop gap') return legacy;
    if (p.kind === 'gap') return protective();

    if (!legacy) {
      // a buffered sale carried overnight from signal minute kS of this session: the stop wins if reached by then
      if (!Number.isNaN(this.pendingSignalTime)) {
        const kS = ds.bTime.subarray(start, start + ds.sBarCount[s]!).indexOf(this.pendingSignalTime - secondsPerMinute);

        if (kS < 0) throw new Error('the carried sale’s signal minute is not in its session');
        return p.triggerK <= kS || (p.triggerK === kS + 1 && p.kind === 'open') ? protective() : undefined;
      }
      return protective();
    }

    switch (legacy.reason) {
      case 'buffered intraday loss': {
        // 2. a sale carried from an earlier session fills at the opening trade first
        if (legacy.signalTime < ds.bTime[start]!) return legacy;

        // 6. the buffered loss decided in this session: the legacy stop-versus-buffer comparison
        const kS = ds.bTime.subarray(start, start + ds.sBarCount[s]!).indexOf(legacy.signalTime - secondsPerMinute);

        if (kS < 0) throw new Error('the buffered sale’s signal minute is not in its session');
        return p.triggerK <= kS || (p.triggerK === kS + 1 && p.kind === 'open') ? protective() : legacy;
      }
      case 'maximum hold':
        // 3. the hold's order was decided at the open and fills at bar k_H; an earlier stop minute wins
        return p.triggerK < legacy.barIndex ? protective() : legacy;
      case 'trailing stop': {
        // 4. an active trailing stop lies above L, so it is reached first; the earlier trigger minute wins, ties legacy
        const kT = firstReach(ds, s, this.stopPrice);

        return kT >= 0 && p.triggerK < kT ? protective() : legacy;
      }
      default:
        throw new Error(`unexpected legacy exit ${legacy.reason}`);
    }
  }
}

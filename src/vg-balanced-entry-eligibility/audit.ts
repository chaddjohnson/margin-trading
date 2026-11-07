// Phase A (PROTOCOL.md §5; the brief's "Audit missed opportunities before implementing a search"): the control's
// refusal ledger on the development door D24 only. For every refused signal: its ETF, setup, decision, the occupying
// lot, the first subsequent availability of the slot, the opportunity's age then, the price movement in between,
// whether its shadow trade is still open, competing fresh signals, and a FIRST-ORDER band check per bounded case
// (ignoring the capital cascade a delayed lot would cause). Eventual paths (later closes, the shadow trade's own
// outcome) are descriptive only and labelled so: no rule reads them, and a refused shadow trade's profit is not what a
// delayed entry could have earned.
import type { Dataset } from '../four-family/data.ts';
import type { NRunResult } from '../portfolio-aware-d1/nbook/engine.ts';
import { ages, extensions } from './context.ts';

const iso = (seconds: number) =>
  Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : '';
const newYork = (seconds: number) =>
  Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000)
        .toLocaleString('sv-SE', { timeZone: 'America/New_York', hour12: false })
        .replace(' ', 'T')
    : '';

// The (session, bar) of the first bar of `ds` at or after `time` from session s (the closing print is not a bar).
const barAtOrAfter = (ds: Dataset, s: number, time: number, last: number) => {
  for (let i = s; i <= last; i++) {
    const start = ds.sBarStart[i]!;
    const count = ds.sBarCount[i]!;

    for (let k = 0; k < count; k++) {
      if (ds.bTime[start + k]! >= time) return { s: i, k };
    }
  }

  return undefined;
};

export interface AuditRow {
  refusal: number;
  symbol: string;
  setupId: number;
  setupKind: string;
  decisionIndex: number;
  decisionUtc: string;
  decisionNewYork: string;
  decisionPrice: number;
  trigger: number;
  trailingLow: number;
  reason: string;
  occupant: string; // 'lot' | 'pending order'
  occupyingLot: number;
  occupyingSymbol: string;
  occupyingEntryUtc: string;
  occupyingExitUtc: string;
  occupyingExitReason: string;
  sameOccupantRefusals: number;
  availabilityUtc: string; // the first minute of the refused ETF evaluated on a free slot
  availabilityNewYork: string;
  ageAtAvailability: number; // sessions since the origin session
  calendarDaysToAvailability: number;
  closeAtAvailability: number;
  changeVsDecisionPrice: number; // close at availability ÷ decision price − 1
  aboveTriggerAtAvailability: boolean;
  invalidatedBeforeAvailability: boolean; // a minute low below the trailing low after the origin, through availability
  invalidationUtc: string;
  shadowOpenAtAvailability: boolean;
  shadowExitUtc: string;
  shadowExitReason: string;
  shadowSessionsHeld: number;
  nextFreshSignalUtc: string; // the control's next signal after the slot freed
  nextFreshSignalSymbol: string;
  nextFreshSignalOutcome: string;
  sessionsFromAvailabilityToNextFresh: number;
  sameMinuteCompetition: boolean;
  // first-order band check per (A, E): the first minute that would revalidate, or ''
  firstOrder: Record<
    string,
    { selectable: boolean; ageAtSelection: number; selectionUtc: string; close: number; endedBy: string }
  >;
  // descriptive only (eventual path; never read by a rule)
  descriptive: {
    closeChange: Record<string, number>; // close after n sessions ÷ decision price − 1
    maxHighChange20: number;
    minLowChange20: number;
    shadowNetHypothetical: number; // the refused shadow trade's own net: NOT an achievable delayed-entry profit
  };
}

export const auditRefusals = (result: NRunResult) => {
  const { universe } = result;
  const dates = universe.dates;
  const last = result.endIndex;
  const lotsById = new Map(result.lots.map((lot) => [lot.id, lot]));
  const granted = result.signals.filter((signal) => signal.outcome === 'granted');
  const refused = result.signals.filter((signal) => signal.outcome === 'refused');
  const rows: AuditRow[] = [];

  refused.forEach((signal, index) => {
    const ds = universe.instruments[signal.symbol]!.ds;
    const trade = signal.trade!;
    const match = /^(\S+) (lot (\d+)|pending order)$/.exec(signal.occupiedBy);

    if (!match) throw new Error(`refusal ${index + 1}: occupant "${signal.occupiedBy}"`);

    const occupant = match[2]!.startsWith('lot') ? 'lot' : 'pending order';
    const occupyingSymbol = match[1]!;
    const lot =
      occupant === 'lot'
        ? lotsById.get(Number(match[3]))!
        : lotsById.get(
            granted.filter((g) => g.symbol === occupyingSymbol && g.decisionTime <= signal.decisionTime).at(-1)!.trade!
              .fundedLotId
          )!;
    const freed = lot.exitIndex >= 0;
    const exitCount = freed ? universe.instruments[lot.symbol]!.ds.sBarCount[lot.exitIndex]! : 0;
    // A closing-print exit frees the slot for the next session's first minute; otherwise from the exit minute on.
    const fromTime = !freed
      ? Infinity
      : lot.exitBar >= exitCount
        ? (ds.sTime[lot.exitIndex + 1] ?? Infinity)
        : lot.exitTime;
    const at = Number.isFinite(fromTime) ? barAtOrAfter(ds, lot.exitIndex, fromTime, last) : undefined;
    const availabilityBarTime = at ? ds.bTime[ds.sBarStart[at.s]! + at.k]! : NaN;
    const closeAt = at ? ds.bClose[ds.sBarStart[at.s]! + at.k]! : NaN;
    const shadowOpenAt = (barTime: number) => trade.exitIndex < 0 || trade.exitTime > barTime;

    // The first minute low below the trailing low, from the bar after the origin bar.
    let invalidation = NaN;

    for (let i = signal.index; i <= last && Number.isNaN(invalidation); i++) {
      const start = ds.sBarStart[i]!;

      for (let k = i === signal.index ? signal.barIndex + 1 : 0; k < ds.sBarCount[i]!; k++) {
        if (ds.bLow[start + k]! < trade.trailingLow) {
          invalidation = ds.bTime[start + k]!;
          break;
        }
      }
    }

    const next = result.signals.find((other) => Number.isFinite(fromTime) && other.decisionTime > fromTime);
    const nextGrant = granted.find((other) => Number.isFinite(fromTime) && other.decisionTime > fromTime);
    const sameOccupant = refused.filter((other) => other.occupiedBy === signal.occupiedBy).length;
    const firstOrder: AuditRow['firstOrder'] = {};

    for (const A of ages) {
      for (const E of extensions) {
        const key = `A${A}-E${Math.round(E * 100)}`;
        const cap = signal.decisionPrice * (1 + E);
        let outcome = { selectable: false, ageAtSelection: NaN, selectionUtc: '', close: NaN, endedBy: '' };

        if (!at) {
          outcome.endedBy = 'slot never freed in the window';
        } else {
          scan: for (let i = at.s; i <= last; i++) {
            if (i - signal.index > A) {
              outcome.endedBy = `expired (age > ${A})`;
              break;
            }

            const start = ds.sBarStart[i]!;

            for (let k = i === at.s ? at.k : 0; k < ds.sBarCount[i]!; k++) {
              const barTime = ds.bTime[start + k]!;

              if (!shadowOpenAt(barTime)) {
                outcome.endedBy = 'shadow trade closed';
                break scan;
              }

              if (!Number.isNaN(invalidation) && invalidation <= barTime) {
                outcome.endedBy = 'invalidated (low below the trailing low)';
                break scan;
              }

              if (nextGrant && nextGrant.decisionTime <= barTime + 60) {
                outcome.endedBy = 'a fresh control signal took the slot';
                break scan;
              }

              const close = ds.bClose[start + k]!;

              if (close >= trade.trigger && close <= cap) {
                outcome = {
                  selectable: true,
                  ageAtSelection: i - signal.index,
                  selectionUtc: iso(barTime + 60),
                  close,
                  endedBy: ''
                };
                break scan;
              }
            }
          }
        }

        firstOrder[key] = outcome;
      }
    }

    const closeChange: Record<string, number> = {};

    for (const n of [1, 3, 5, 10, 20]) {
      const i = signal.index + n;

      closeChange[`+${n}`] = i <= last ? ds.sClose[i]! / signal.decisionPrice - 1 : NaN;
    }

    let maxHigh = -Infinity;
    let minLow = Infinity;

    for (let i = signal.index; i <= Math.min(last, signal.index + 20); i++) {
      maxHigh = Math.max(maxHigh, ds.sHigh[i]!);
      minLow = Math.min(minLow, ds.sLow[i]!);
    }

    rows.push({
      refusal: index + 1,
      symbol: signal.symbol,
      setupId: signal.setupId,
      setupKind: signal.setupKind,
      decisionIndex: signal.index,
      decisionUtc: iso(signal.decisionTime),
      decisionNewYork: newYork(signal.decisionTime),
      decisionPrice: signal.decisionPrice,
      trigger: trade.trigger,
      trailingLow: trade.trailingLow,
      reason: signal.reason,
      occupant,
      occupyingLot: lot.id,
      occupyingSymbol: lot.symbol,
      occupyingEntryUtc: iso(lot.entryTime),
      occupyingExitUtc: freed ? iso(lot.exitTime) : 'open at the door end',
      occupyingExitReason: freed ? lot.exitReason : 'open',
      sameOccupantRefusals: sameOccupant,
      availabilityUtc: at ? iso(availabilityBarTime) : '',
      availabilityNewYork: at ? newYork(availabilityBarTime) : '',
      ageAtAvailability: at ? at.s - signal.index : NaN,
      calendarDaysToAvailability: at ? (availabilityBarTime - signal.decisionTime) / 86400 : NaN,
      closeAtAvailability: closeAt,
      changeVsDecisionPrice: closeAt / signal.decisionPrice - 1,
      aboveTriggerAtAvailability: closeAt >= trade.trigger,
      invalidatedBeforeAvailability:
        !Number.isNaN(invalidation) && at !== undefined && invalidation <= availabilityBarTime,
      invalidationUtc: iso(invalidation),
      shadowOpenAtAvailability: at !== undefined && shadowOpenAt(availabilityBarTime),
      shadowExitUtc: trade.exitIndex >= 0 ? iso(trade.exitTime) : 'open',
      shadowExitReason: trade.exitReason,
      shadowSessionsHeld: trade.exitIndex >= 0 ? trade.exitIndex - trade.entryIndex : NaN,
      nextFreshSignalUtc: next ? iso(next.decisionTime) : '',
      nextFreshSignalSymbol: next?.symbol ?? '',
      nextFreshSignalOutcome: next?.outcome ?? '',
      sessionsFromAvailabilityToNextFresh: next && at ? next.index - at.s : NaN,
      sameMinuteCompetition: Boolean(next && at && next.decisionTime === availabilityBarTime + 60),
      firstOrder,
      descriptive: {
        closeChange,
        maxHighChange20: maxHigh / signal.decisionPrice - 1,
        minLowChange20: minLow / signal.decisionPrice - 1,
        shadowNetHypothetical: trade.net
      }
    });
  });

  const within = Object.fromEntries(
    [1, 3, 5, 10, 20].map((n) => [
      n,
      {
        available: rows.filter((row) => row.ageAtAvailability <= n).length,
        availableShadowOpen: rows.filter((row) => row.ageAtAvailability <= n && row.shadowOpenAtAvailability).length,
        availableShadowOpenNotInvalidated: rows.filter(
          (row) => row.ageAtAvailability <= n && row.shadowOpenAtAvailability && !row.invalidatedBeforeAvailability
        ).length
      }
    ])
  );
  const cases = Object.fromEntries(
    Object.keys(rows[0]?.firstOrder ?? {}).map((key) => [
      key,
      {
        VGT: rows.filter((row) => row.symbol === 'VGT' && row.firstOrder[key]!.selectable).length,
        GDX: rows.filter((row) => row.symbol === 'GDX' && row.firstOrder[key]!.selectable).length
      }
    ])
  );

  return {
    window: { first: dates[0]!, last: dates[last]! },
    signals: result.signals.length,
    refusals: rows.length,
    byReason: {
      'pool occupied by a lot': rows.filter((row) => row.occupant === 'lot').length,
      'pool reserved by a pending order': rows.filter((row) => row.occupant === 'pending order').length,
      other: result.signals.filter((s) => s.outcome === 'refused' && !/^pool (occupied|reserved)/.test(s.reason)).length
    },
    bySymbol: {
      VGT: rows.filter((row) => row.symbol === 'VGT').length,
      GDX: rows.filter((row) => row.symbol === 'GDX').length
    },
    distinctOccupants: new Set(rows.map((row) => row.occupyingLot)).size,
    within,
    firstOrderCases: cases,
    rows
  };
};

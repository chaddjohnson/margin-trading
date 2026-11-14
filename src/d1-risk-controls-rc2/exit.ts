// The entry-day protective trigger (SPECIFICATION_RC2.md §2): the first price observation of the fill's own session that
// is DEMONSTRABLY AFTER THE FILL and reaches the immutable protective level L, with RC 1's fill conventions.
//
// The existing fill mechanism (src/shared-margin-portfolio/strategy.ts firstTradeAfterDecision / priceAt) fills an entry
// at the OPENING PRINT of a regular-session minute k (the first trade at or after the decision; for an order carried
// overnight, the session's first minute) or at the session's CLOSING PRINT (k = the bar count). Hence:
//   - fill at a minute's opening print (k < count): that print is the first trade of minute k, so every other trade of
//     minute k is at or after the fill. A minute-k low ≤ L lies strictly below the fill price e (L < e), so it is a
//     DIFFERENT, LATER trade: eligible. Minute k's own open is the fill itself (never ≤ L). Every later minute j > k is
//     eligible in full: its opening print first (a minute opening at or below L fills at that open), then its low.
//   - fill at the closing print: no regular-session observation follows; the stop first acts at the next session (as
//     in next-session mode). The closing print itself is never a stop observation (RC 1's convention for every stop).
//   - minutes BEFORE the fill minute are never read, whatever their lows (no pre-fill information).
// Fill conventions (RC 1, unchanged): a minute opening at or below L fills at that open ('minute open through stop'); a
// low reaching L fills at L under the `stop` fill ('stop level'), or at the next minute's open / the closing print under
// `next-open` (else that minute's close, 'trigger minute close'). The trigger is inclusive (price ≤ L). There is no
// session-open gap case on the entry day: the session opened before (or at) the fill.
import type { Dataset } from '../four-family/data.ts';
import type { ExitSettings } from '../shared-margin-portfolio/strategy.ts';
import { firstTradeFrom, secondsPerMinute, tradeExecution } from '../shared-margin-portfolio/strategy.ts';
import type { ProtectiveTrigger } from '../d1-risk-controls/exit.ts';

export const entryDayTrigger = (
  ds: Dataset,
  s: number,
  fillK: number,
  level: number,
  stopFill: ExitSettings['stopFill']
): ProtectiveTrigger | undefined => {
  const start = ds.sBarStart[s]!;
  const count = ds.sBarCount[s]!;

  if (fillK < 0 || fillK >= count) return undefined; // a closing-print fill (or none): nothing observable follows
  if (!(level < ds.bOpen[start + fillK]!)) throw new Error('the protective level is not below the fill price');

  const priceOf = (k: number) => (k < count ? ds.bOpen[start + k]! : ds.sClosingPrint[s]!);
  const timeOf = (k: number) => (k < count ? ds.bTime[start + k]! : ds.sCloseTime[s]!);

  for (let k = fillK; k < count; k++) {
    if (k > fillK && ds.bOpen[start + k]! <= level)
      return {
        kind: 'open',
        triggerK: k,
        barIndex: k,
        price: ds.bOpen[start + k]!,
        time: ds.bTime[start + k]!,
        execution: 'minute open through stop'
      };

    if (ds.bLow[start + k]! <= level) {
      if (stopFill === 'stop')
        return { kind: 'low', triggerK: k, barIndex: k, price: level, time: ds.bTime[start + k]!, execution: 'stop level' };

      const next = firstTradeFrom(ds, s, ds.bTime[start + k]! + secondsPerMinute);

      return next >= 0
        ? { kind: 'low', triggerK: k, barIndex: next, price: priceOf(next), time: timeOf(next), execution: tradeExecution(ds, s, next) }
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

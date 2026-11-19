// Alignment of entry events to price bars. The chart can only anchor a marker to a bar, so every event is either
// placed on the bar its policy names or reported as unaligned — never moved to a nearby, unrelated bar.
//
//   exact         the event's instant equals a bar's timestamp (to the millisecond). The demo fixture uses this.
//   session-date  daily bars only: the event is placed on the bar of its session date (`d`), e.g. an intraday
//                 signal shown on that session's daily bar. Reserved for future minute-signal / daily-chart datasets.

import type { EntryEvent, PriceBar } from './types.ts';

export type AlignmentPolicy = 'exact' | 'session-date';

export interface AlignmentResult {
  policy: AlignmentPolicy;
  /** Event id → bar index. */
  barIndexByEventId: Map<string, number>;
  /** Events that matched no bar under the policy; they are listed in the UI but never drawn. */
  unaligned: EntryEvent[];
}

export function alignEvents(
  bars: readonly PriceBar[],
  interval: '1d' | '1m',
  events: Iterable<EntryEvent>,
  policy: AlignmentPolicy
): AlignmentResult {
  if (policy === 'session-date' && interval !== '1d')
    throw new Error('the session-date alignment policy needs daily bars');

  const index = new Map<number | string, number>();
  bars.forEach((b, i) => index.set(policy === 'exact' ? Date.parse(b.t) : b.d, i));

  const barIndexByEventId = new Map<string, number>();
  const unaligned: EntryEvent[] = [];
  for (const e of events) {
    const i = index.get(policy === 'exact' ? Date.parse(e.t) : e.d);
    if (i === undefined) unaligned.push(e);
    else barIndexByEventId.set(e.id, i);
  }
  return { policy, barIndexByEventId, unaligned };
}

// The demo's ILLUSTRATIVE execution model: it only shows that a raw signal and an executed entry are different
// things. One all-in position at a time; when flat, a signal is executed at the close of the next session; the
// position then counts as occupied for a fixed number of sessions (a placeholder, NOT an exit policy); signals that
// arrive while it is occupied — or on the last session, with no next session to fill in — are not executed.

import type { EntryEvent, ExecutionModel, ParameterValue } from '../demo-schema/types.ts';
import type { Session } from './calendar.ts';
import type { RawSignal } from './rules.ts';

export const FILL_DELAY_SESSIONS = 1;
export const OCCUPANCY_SESSIONS = 30;

export const demoExecutionModel: ExecutionModel = {
  id: 'demo-single-position-occupancy',
  label: 'Illustrative single-position occupancy',
  isIllustrative: true,
  description:
    'One all-in position at a time. When flat, a signal is executed at the close of the next session; the position ' +
    `then counts as occupied for ${OCCUPANCY_SESSIONS} sessions (a placeholder, not an exit policy). Signals while it ` +
    'is occupied, and a signal on the last session of the data, are not executed. Not a trading or portfolio simulation.',
  parameters: [
    { key: 'fillDelay', label: 'Fill delay', value: FILL_DELAY_SESSIONS, unit: 'sessions' },
    { key: 'occupancy', label: 'Occupancy placeholder', value: OCCUPANCY_SESSIONS, unit: 'sessions' },
    { key: 'fillPrice', label: 'Fill price', value: 'close of the fill session', unit: 'text' }
  ]
};

export function applyExecution(
  variationId: string,
  signals: RawSignal[],
  sessions: Session[],
  closes: number[]
): EntryEvent[] {
  const events: EntryEvent[] = [];
  let freeFrom = 0; // first session index at which a new signal may be executed
  for (const s of signals) {
    const sess = sessions[s.i] as Session;
    const signal: EntryEvent = {
      id: `${variationId}:signal:${sess.d}`,
      variationId,
      type: 'signal',
      t: sess.t,
      d: sess.d,
      price: closes[s.i] as number,
      priceBasis: 'bar-close',
      trigger: { summary: s.summary, values: s.values }
    };
    const fillIdx = s.i + FILL_DELAY_SESSIONS;
    if (s.i < freeFrom) {
      const occupiedSince = sessions[freeFrom - OCCUPANCY_SESSIONS] as Session;
      const occupiedThrough = sessions[Math.min(freeFrom - 1, sessions.length - 1)] as Session;
      signal.execution = {
        status: 'not-executed',
        reason: `position occupied (entered ${occupiedSince.d}, placeholder occupancy through ${occupiedThrough.d})`
      };
      events.push(signal);
      continue;
    }
    if (fillIdx >= sessions.length) {
      signal.execution = { status: 'not-executed', reason: 'no next session in the data to fill in' };
      events.push(signal);
      continue;
    }
    const fill = sessions[fillIdx] as Session;
    const occupancyEnd = sessions[Math.min(fillIdx + OCCUPANCY_SESSIONS - 1, sessions.length - 1)] as Session;
    const executed: EntryEvent = {
      id: `${variationId}:executed:${fill.d}`,
      variationId,
      type: 'executed',
      t: fill.t,
      d: fill.d,
      price: closes[fillIdx] as number,
      priceBasis: 'bar-close',
      trigger: {
        summary: `Illustrative fill at the ${fill.d} close, ${FILL_DELAY_SESSIONS} session after the ${sess.d} signal`,
        values: [
          { key: 'signalDate', label: 'Signal date', value: sess.d, unit: 'date' },
          { key: 'signalPrice', label: 'Signal close', value: closes[s.i] as number, unit: 'price' },
          { key: 'fillDelay', label: 'Fill delay', value: FILL_DELAY_SESSIONS, unit: 'sessions' },
          { key: 'occupancyEnd', label: 'Placeholder occupancy through', value: occupancyEnd.d, unit: 'date' },
          ...s.values.filter((v): v is ParameterValue => v.unit !== 'text').slice(0, 2)
        ]
      },
      linkedEventId: signal.id
    };
    signal.execution = { status: 'executed' };
    signal.linkedEventId = executed.id;
    events.push(signal, executed);
    freeFrom = fillIdx + OCCUPANCY_SESSIONS;
  }
  return events;
}

// Validation of events against the contract (shared/contract.ts). Runner output and importer output are both checked
// before a run is marked completed, so the UI never receives malformed or mislabelled events.

import { EVENT_KINDS, type LabEvent } from './contract.ts';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const PRECISIONS = new Set(['minute', 'session-close', 'day', 'unknown']);
const BASES = new Set(['bar-close', 'fill', 'decision', 'unknown']);

export function validateEvents(events: unknown, runId: string, symbols: readonly string[]): string[] {
  const errors: string[] = [];
  if (!Array.isArray(events)) return ['events: must be an array'];
  const ids = new Set<string>();
  const byId = new Map<string, LabEvent>();
  events.forEach((raw, i) => {
    if (errors.length >= 50) return;
    const e = raw as LabEvent;
    const at = `events[${i}]`;
    if (typeof e !== 'object' || e === null) return errors.push(`${at}: not an object`);
    if (typeof e.id !== 'string' || !e.id) errors.push(`${at}.id: required`);
    else if (ids.has(e.id)) errors.push(`${at}.id: duplicate ${e.id}`);
    else {
      ids.add(e.id);
      byId.set(e.id, e);
    }
    if (e.runId !== runId) errors.push(`${at}.runId: must be ${runId}`);
    if (!symbols.includes(e.symbol)) errors.push(`${at}.symbol: ${String(e.symbol)} is not a symbol of the run`);
    if (!EVENT_KINDS.includes(e.kind)) errors.push(`${at}.kind: unknown ${String(e.kind)}`);
    if (typeof e.t !== 'string' || !ISO.test(e.t)) errors.push(`${at}.t: must be an ISO 8601 UTC instant`);
    if (!PRECISIONS.has(e.timePrecision)) errors.push(`${at}.timePrecision: invalid`);
    if (typeof e.timeMeaning !== 'string' || !e.timeMeaning) errors.push(`${at}.timeMeaning: required`);
    if (e.price !== null && !(typeof e.price === 'number' && Number.isFinite(e.price) && e.price > 0))
      errors.push(`${at}.price: a positive number or null (unknown)`);
    if (!BASES.has(e.priceBasis)) errors.push(`${at}.priceBasis: invalid`);
    if (e.price === null && e.priceBasis !== 'unknown')
      errors.push(`${at}.priceBasis: must be "unknown" when price is null`);
    if (!Array.isArray(e.values)) errors.push(`${at}.values: must be an array`);
    if (typeof e.meta !== 'object' || e.meta === null || Array.isArray(e.meta))
      errors.push(`${at}.meta: must be an object`);
  });
  for (const e of byId.values()) {
    if (e.linkedEventId === null || e.linkedEventId === undefined) continue;
    const other = byId.get(e.linkedEventId);
    if (!other) errors.push(`event ${e.id}: linked event ${e.linkedEventId} is missing`);
    else if (other.symbol !== e.symbol) errors.push(`event ${e.id}: linked event is on another symbol`);
  }
  return errors;
}

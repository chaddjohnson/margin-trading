// Derived views of the state: which events are drawn, which fall inside the chart's window, how same-bar events are
// grouped, and the counts shown in the legend, summary and table (all computed from the same lists so they agree).

import type { ExplorerModel, PlacedEvent, VariationModel } from '../data/model.ts';
import type { EntryEventType } from '../schema/types.ts';
import { type DrawSpec, type Role, roleOf, typeIncluded } from './explorer.ts';

export interface DisplayEvent {
  event: PlacedEvent;
  role: Role;
}

/** A visible window [from, to] in chart x units (ms); null means the whole series. */
export type XRange = readonly [number, number] | null;

/** Events drawn at one bar. Items are ordered A before B, signal before executed. */
export interface Cluster {
  x: number;
  barIndex: number;
  items: DisplayEvent[];
}

export interface RoleCounts {
  total: Record<EntryEventType, number>;
  inView: Record<EntryEventType, number>;
}

export function activeVariations(
  model: ExplorerModel,
  state: Pick<DrawSpec, 'primaryId' | 'compareId'>
): { role: Role; vm: VariationModel }[] {
  const out: { role: Role; vm: VariationModel }[] = [];
  const a = model.variationById.get(state.primaryId);
  if (a) out.push({ role: 'A', vm: a });
  const b = state.compareId ? model.variationById.get(state.compareId) : undefined;
  if (b) out.push({ role: 'B', vm: b });
  return out;
}

const roleOrder: Record<Role, number> = { A: 0, B: 1 };
const typeOrder: Record<EntryEventType, number> = { signal: 0, executed: 1 };

export function compareDisplay(a: DisplayEvent, b: DisplayEvent): number {
  return (
    a.event.x - b.event.x || roleOrder[a.role] - roleOrder[b.role] || typeOrder[a.event.type] - typeOrder[b.event.type]
  );
}

/** Every event currently drawn on the chart (all dates), in time order. */
export function displayEvents(model: ExplorerModel, state: DrawSpec): DisplayEvent[] {
  const out: DisplayEvent[] = [];
  for (const { vm } of activeVariations(model, state))
    for (const event of vm.events) {
      const role = roleOf(state, event);
      if (role) out.push({ event, role });
    }
  return out.sort(compareDisplay);
}

export function inRange(x: number, range: XRange): boolean {
  return range === null || (x >= range[0] && x <= range[1]);
}

export function clusterEvents(events: readonly DisplayEvent[]): Cluster[] {
  const byX = new Map<number, Cluster>();
  for (const d of events) {
    let c = byX.get(d.event.x);
    if (!c) {
      c = { x: d.event.x, barIndex: d.event.barIndex, items: [] };
      byX.set(d.event.x, c);
    }
    c.items.push(d);
  }
  const out = [...byX.values()].sort((a, b) => a.x - b.x);
  for (const c of out) c.items.sort(compareDisplay);
  return out;
}

/** Counts per role over the active variations, honouring the type filter, for all dates and for the window. */
export function roleCounts(model: ExplorerModel, state: DrawSpec, range: XRange): Partial<Record<Role, RoleCounts>> {
  const out: Partial<Record<Role, RoleCounts>> = {};
  for (const { role, vm } of activeVariations(model, state)) {
    const c: RoleCounts = { total: { signal: 0, executed: 0 }, inView: { signal: 0, executed: 0 } };
    for (const e of vm.events) {
      if (!typeIncluded(state.typeFilter, e.type)) continue;
      c.total[e.type]++;
      if (inRange(e.x, range)) c.inView[e.type]++;
    }
    out[role] = c;
  }
  return out;
}

/** Index of the first value ≥ x (or > x when `strict`) in an ascending array. */
function bound(values: readonly number[], x: number, strict: boolean): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const v = values[mid] as number;
    if (strict ? v <= x : v < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The first and last bar indexes inside a window (inclusive), or null when it holds no bar. */
export function barSpan(model: ExplorerModel, range: XRange): [number, number] | null {
  const t = model.barTimes;
  if (t.length === 0) return null;
  if (range === null) return [0, t.length - 1];
  const first = bound(t, range[0], false);
  const last = bound(t, range[1], true) - 1;
  return first <= last ? [first, last] : null;
}

/** Text search over a variation's code, name, family, summary and id (case-insensitive, all words must match). */
export function matchesVariation(vm: VariationModel, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const v = vm.variation;
  const hay = `${v.code} ${v.name} ${v.family} ${v.summary} ${v.id}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

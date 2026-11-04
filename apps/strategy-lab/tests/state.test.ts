import { describe, expect, it } from 'vitest';

import { buildModel } from '../src/data/model.ts';
import { type Action, type ExplorerState, createReducer, initialState } from '../src/state/explorer.ts';
import { barSpan, clusterEvents, displayEvents, matchesVariation, roleCounts } from '../src/state/selectors.ts';
import { readFixture } from './helpers.ts';

const model = buildModel(readFixture());
const reduce = createReducer(model);
const run = (...actions: Action[]): ExplorerState => actions.reduce(reduce, initialState(model));
const [V1, V2, V3] = model.variations.map((v) => v.variation.id) as [string, string, string];

describe('explorer reducer', () => {
  it('starts with the first variation as A, no B, both event types', () => {
    const s = initialState(model);
    expect(s.primaryId).toBe(V1);
    expect(s.compareId).toBeNull();
    expect(s.typeFilter).toBe('both');
  });

  it('selecting A never touches B, and B can never equal A', () => {
    let s = run({ type: 'toggleCompare', id: V2 }, { type: 'selectPrimary', id: V3 });
    expect([s.primaryId, s.compareId]).toEqual([V3, V2]);
    s = reduce(s, { type: 'toggleCompare', id: V3 });
    expect(s.compareId).toBe(V2);
    // Promoting B to A leaves no B rather than silently re-pointing it.
    s = reduce(s, { type: 'selectPrimary', id: V2 });
    expect([s.primaryId, s.compareId]).toEqual([V2, null]);
  });

  it('toggles, swaps and removes the comparison without losing A', () => {
    let s = run({ type: 'toggleCompare', id: V2 });
    expect(s.compareId).toBe(V2);
    s = reduce(s, { type: 'swap' });
    expect([s.primaryId, s.compareId]).toEqual([V2, V1]);
    s = reduce(s, { type: 'toggleCompare', id: V1 });
    expect([s.primaryId, s.compareId]).toEqual([V2, null]);
    s = reduce(s, { type: 'clearCompare' });
    expect(s.primaryId).toBe(V2);
  });

  it('ignores unknown ids', () => {
    const s = run(
      { type: 'selectPrimary', id: 'nope' },
      { type: 'toggleCompare', id: 'nope' },
      { type: 'selectEvent', id: 'nope' }
    );
    expect([s.primaryId, s.compareId, s.selectedEventId]).toEqual([V1, null, null]);
  });

  it('drops the selected event when it stops being drawn', () => {
    const vm = model.variationById.get(V1)!;
    const signal = vm.events.find((e) => e.type === 'signal')!;
    let s = run({ type: 'selectEvent', id: signal.id });
    expect(s.selectedEventId).toBe(signal.id);
    expect(reduce(s, { type: 'setTypeFilter', filter: 'executed' }).selectedEventId).toBeNull();
    expect(reduce(s, { type: 'toggleVisible', role: 'A' }).selectedEventId).toBeNull();
    expect(reduce(s, { type: 'selectPrimary', id: V2 }).selectedEventId).toBeNull();
    // Filters and searches that do not hide it keep it.
    s = reduce(s, { type: 'setTypeFilter', filter: 'signals' });
    s = reduce(s, { type: 'setTableQuery', query: 'zzz' });
    expect(s.selectedEventId).toBe(signal.id);
  });

  it('sorts by a column and flips direction on a second click', () => {
    let s = run({ type: 'sortBy', key: 'price' });
    expect(s.sort).toEqual({ key: 'price', dir: 'asc' });
    s = reduce(s, { type: 'sortBy', key: 'price' });
    expect(s.sort).toEqual({ key: 'price', dir: 'desc' });
  });
});

describe('selectors', () => {
  it('draws only the active variations’ events, honouring the type filter', () => {
    const a = model.variationById.get(V1)!;
    const b = model.variationById.get(V2)!;
    let s = run({ type: 'toggleCompare', id: V2 });
    expect(displayEvents(model, s).length).toBe(a.events.length + b.events.length);
    s = reduce(s, { type: 'setTypeFilter', filter: 'executed' });
    const drawn = displayEvents(model, s);
    expect(drawn.every((d) => d.event.type === 'executed')).toBe(true);
    expect(drawn.length).toBe(a.counts.executed + b.counts.executed);
    s = reduce(s, { type: 'toggleVisible', role: 'B' });
    expect(displayEvents(model, s).every((d) => d.role === 'A')).toBe(true);
  });

  it('counts total and in-window events consistently with what is drawn', () => {
    const s = run({ type: 'toggleCompare', id: V2 }, { type: 'setTypeFilter', filter: 'signals' });
    const range = [Date.parse('2020-01-01T00:00:00Z'), Date.parse('2022-12-31T23:59:59Z')] as const;
    const counts = roleCounts(model, s, range);
    const drawn = displayEvents(model, s);
    const inView = drawn.filter((d) => d.event.x >= range[0] && d.event.x <= range[1]);
    expect(counts.A!.total.signal + counts.B!.total.signal).toBe(drawn.length);
    expect(counts.A!.inView.signal + counts.B!.inView.signal).toBe(inView.length);
    expect(counts.A!.inView.executed).toBe(0);
    expect(counts.A!.inView.signal).toBeLessThan(counts.A!.total.signal);
  });

  it('groups same-bar events into one cluster, A before B and signal before executed', () => {
    const s = run({ type: 'toggleCompare', id: V2 });
    const drawn = displayEvents(model, s);
    const clusters = clusterEvents(drawn);
    expect(clusters.reduce((n, c) => n + c.items.length, 0)).toBe(drawn.length);
    expect(new Set(clusters.map((c) => c.x)).size).toBe(clusters.length);
    const multi = clusters.filter((c) => c.items.length > 1);
    expect(multi.length).toBeGreaterThan(0);
    for (const c of multi) {
      const order = c.items.map((d) => `${d.role}${d.event.type === 'signal' ? 0 : 1}`);
      expect(order).toEqual([...order].sort());
      expect(c.items.every((d) => d.event.x === c.x)).toBe(true);
    }
  });

  it('finds the bars inside a window', () => {
    const t = model.barTimes;
    expect(barSpan(model, null)).toEqual([0, t.length - 1]);
    expect(barSpan(model, [t[10]!, t[20]!])).toEqual([10, 20]);
    expect(barSpan(model, [t[10]! + 1, t[20]! - 1])).toEqual([11, 19]);
    expect(barSpan(model, [t[10]! + 1, t[10]! + 2])).toBeNull();
  });

  it('searches variations by any word of code, name, family or summary', () => {
    const vm = model.variationById.get(V1)!;
    expect(matchesVariation(vm, 'rebound low')).toBe(true);
    expect(matchesVariation(vm, 'v1')).toBe(true);
    expect(matchesVariation(vm, 'breakout')).toBe(false);
  });
});

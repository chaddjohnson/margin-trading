// The in-memory model the UI works with: a validated dataset plus indexes and each event's chart position. Built once
// per dataset; nothing here depends on which variation is selected.

import { type AlignmentPolicy, alignEvents } from '../schema/align.ts';
import type { Dataset, EntryEvent, EntryEventType, Variation } from '../schema/types.ts';

/** An event placed on the chart: `x` is its bar's timestamp in ms (the chart's x value), `barIndex` its bar. */
export type PlacedEvent = EntryEvent & { x: number; barIndex: number };

export interface VariationModel {
  variation: Variation;
  /** Aligned events in time order (ties: signal before executed, then id). */
  events: PlacedEvent[];
  counts: Record<EntryEventType, number>;
}

export interface ExplorerModel {
  dataset: Dataset;
  timeZone: string;
  /** Bar timestamps (ms) and closes, index-aligned with dataset.priceSeries.bars. */
  barTimes: number[];
  closes: number[];
  variations: VariationModel[];
  variationById: Map<string, VariationModel>;
  eventById: Map<string, PlacedEvent>;
  alignment: { policy: AlignmentPolicy; aligned: number; unaligned: EntryEvent[] };
}

const typeOrder: Record<EntryEventType, number> = { signal: 0, executed: 1 };

export function compareEvents(a: PlacedEvent, b: PlacedEvent): number {
  return a.x - b.x || typeOrder[a.type] - typeOrder[b.type] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function buildModel(dataset: Dataset, policy: AlignmentPolicy = 'exact'): ExplorerModel {
  const bars = dataset.priceSeries.bars;
  const barTimes = bars.map((b) => Date.parse(b.t));
  const closes = bars.map((b) => b.c);
  const all = dataset.variations.flatMap((v) => v.events);
  const alignment = alignEvents(bars, dataset.priceSeries.interval, all, policy);

  const eventById = new Map<string, PlacedEvent>();
  const variations = dataset.variations.map((variation): VariationModel => {
    const events: PlacedEvent[] = [];
    for (const e of variation.events) {
      const barIndex = alignment.barIndexByEventId.get(e.id);
      if (barIndex === undefined) continue;
      const placed: PlacedEvent = { ...e, x: barTimes[barIndex] as number, barIndex };
      events.push(placed);
      eventById.set(e.id, placed);
    }
    events.sort(compareEvents);
    const counts = { signal: 0, executed: 0 };
    for (const e of events) counts[e.type]++;
    return { variation, events, counts };
  });

  return {
    dataset,
    timeZone: dataset.instrument.exchangeTimezone,
    barTimes,
    closes,
    variations,
    variationById: new Map(variations.map((v) => [v.variation.id, v])),
    eventById,
    alignment: { policy, aligned: alignment.barIndexByEventId.size, unaligned: alignment.unaligned }
  };
}

// The browser's pooled-portfolio model (src/portfolio.ts) and marker frames: visibility toggles and ledger filters only
// select what is shown — the aggregate figures come from the replay's metrics alone; refused signals are hidden by
// default; partially exited positions count once; periods are viewports; D1 / Growth markers are distinguishable in
// shape (frame) while every existing marker renders exactly as before.
import './repo-cwd.ts';
import { describe, expect, it } from 'vitest';

import { convertReplay } from '../runner/portfolio-bridge.ts';
import { glyphSvg } from '../src/chart/markers.ts';
import {
  activeInValidation,
  bookedSubtotal,
  carriedIn,
  DEFAULT_LEDGER_FILTER,
  DEFAULT_VISIBILITY,
  eventClassOf,
  filterPositions,
  FRAME_OF,
  isFiltered,
  periodWindow,
  portfolioTotals,
  visibleEvents
} from '../src/portfolio.ts';
import { syntheticCalendar, syntheticEntry, syntheticResult } from './portfolio-fixture.ts';

const replay = () => {
  const { result } = syntheticResult();
  return convertReplay({ calendar: syntheticCalendar, result, record: { lots: 2, signature: 's' }, entry: syntheticEntry, replayId: `PR-${'b'.repeat(64)}` });
};

describe('pooled portfolio model (browser)', () => {
  it('shows funded executions by default and hides refused signals until switched on', () => {
    const { events } = replay();
    expect(DEFAULT_VISIBILITY.refused).toBe(false);
    const shown = visibleEvents(events, DEFAULT_VISIBILITY);
    expect(shown.map((e) => eventClassOf(e)).sort()).toEqual(['entry', 'entry', 'final', 'partial']);
    expect(shown.some((e) => e.kind === 'rejected_signal')).toBe(false);
    const withRefused = visibleEvents(events, { ...DEFAULT_VISIBILITY, refused: true });
    expect(withRefused.filter((e) => e.kind === 'rejected_signal')).toHaveLength(1);
  });

  it('component and event-class toggles change what is visible — never the aggregate figures', () => {
    const a = replay();
    const before = JSON.stringify(portfolioTotals(a.metrics));
    const onlyGrowth = visibleEvents(a.events, { ...DEFAULT_VISIBILITY, components: { D1: false, Growth: true } });
    expect(onlyGrowth.every((e) => e.meta?.component === 'Growth')).toBe(true);
    const noPartials = visibleEvents(a.events, { ...DEFAULT_VISIBILITY, partial: false });
    expect(noPartials.some((e) => e.meta?.partial === true)).toBe(false);
    expect(noPartials.some((e) => e.id === 'VGT:P-1:exit')).toBe(true);
    const nothing = visibleEvents(a.events, { components: { D1: false, Growth: false }, entry: false, partial: false, final: false, refused: false });
    expect(nothing).toEqual([]);
    // the summary is a function of the metrics only: identical whatever is visible or filtered
    expect(JSON.stringify(portfolioTotals(a.metrics))).toBe(before);
    expect(portfolioTotals(a.metrics).positions).toBe(2);
    expect(portfolioTotals(a.metrics).net).toBe(a.metrics.full.net);
  });

  it('filters the ledger by symbol, component, status and period, with an explicitly separate subtotal', () => {
    const { positions, metrics } = replay();
    expect(isFiltered(DEFAULT_LEDGER_FILTER)).toBe(false);
    expect(filterPositions(positions, DEFAULT_LEDGER_FILTER)).toHaveLength(2);
    expect(filterPositions(positions, { ...DEFAULT_LEDGER_FILTER, symbol: 'GDX' }).map((p) => p.id)).toEqual(['P-2']);
    expect(filterPositions(positions, { ...DEFAULT_LEDGER_FILTER, component: 'Growth' }).map((p) => p.id)).toEqual(['P-1']);
    expect(filterPositions(positions, { ...DEFAULT_LEDGER_FILTER, status: 'open' }).map((p) => p.id)).toEqual(['P-2']);
    // validation viewport: the position carried across the 2024-12-31 close is included (carry-in), not restarted
    const val = filterPositions(positions, { ...DEFAULT_LEDGER_FILTER, period: 'validation' });
    expect(val.map((p) => p.id)).toEqual(['P-1', 'P-2']);
    expect(carriedIn(positions[0]!)).toBe(true);
    expect(activeInValidation(positions[0]!)).toBe(true);
    expect(filterPositions(positions, { ...DEFAULT_LEDGER_FILTER, period: 'development' }).map((p) => p.id)).toEqual(['P-1']);
    const sub = bookedSubtotal(filterPositions(positions, { ...DEFAULT_LEDGER_FILTER, component: 'D1' }));
    expect(sub.positions).toBe(1);
    expect(bookedSubtotal(positions).net).toBeCloseTo(metrics.full.net, 2);
    // a partially exited position is one row, one position
    expect(bookedSubtotal(positions)).toMatchObject({ positions: 2, partialExits: 1, open: 1 });
  });

  it('turns periods into viewports of the one run', () => {
    const { equity } = replay();
    expect(periodWindow('all', equity.closeMs, equity.dates)).toBeNull();
    const dev = periodWindow('development', equity.closeMs, equity.dates)!;
    const val = periodWindow('validation', equity.closeMs, equity.dates)!;
    expect(dev[1]).toBe(Date.parse('2024-12-31T21:00:00Z'));
    expect(val[0]).toBe(dev[1] + 1);
    expect(val[1]).toBe(equity.closeMs.at(-1));
  });

  it('distinguishes D1 and Growth markers by a frame and leaves every existing glyph unchanged', () => {
    expect(FRAME_OF).toEqual({ D1: 'square', Growth: 'round' });
    const plain = glyphSvg('executed_exit', 'A', 'profit', 14, true);
    expect(plain).toBe(glyphSvg('executed_exit', 'A', 'profit', 14, true, null));
    expect(plain).not.toContain('data-frame');
    const d1 = glyphSvg('executed_exit', 'A', 'profit', 18, true, 'square');
    const g = glyphSvg('executed_exit', 'A', 'profit', 18, true, 'round');
    expect(d1).toContain('data-frame="square"');
    expect(d1).toContain('<rect');
    expect(g).toContain('data-frame="round"');
    expect(g).toContain('<circle');
    expect(d1).not.toBe(g);
    // partial and final exits differ inside the frame too (half-filled vs filled)
    expect(glyphSvg('executed_exit', 'A', 'profit', 18, false, 'round')).not.toBe(g);
  });
});

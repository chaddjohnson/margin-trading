// The pooled replay bridge (runner/portfolio-bridge.ts) on a synthetic engine result: funded executions only, stable
// position and event ids, partial and final exits with their remaining shares and principal and the finance split,
// open positions never closed by an invented fill, refusals only as rejected signals (and only "slot occupied"), a
// granted-but-unfilled order reported and never an entry, and every aggregate reconciled with the engine.
import './repo-cwd.ts';
import { describe, expect, it } from 'vitest';

import { convertReplay } from '../runner/portfolio-bridge.ts';
import { validateEvents } from '../shared/validate-events.ts';
import { syntheticCalendar, syntheticEntry, syntheticResult } from './portfolio-fixture.ts';

const RID = `PR-${'a'.repeat(64)}`;
const convert = (variant: 'open' | 'pending' = 'open', patch?: (r: ReturnType<typeof syntheticResult>['result']) => void) => {
  const { result } = syntheticResult(variant);
  patch?.(result);
  return convertReplay({ calendar: syntheticCalendar, result, record: { lots: result.lots.length, signature: 'synthetic' }, entry: syntheticEntry, replayId: RID });
};

describe('pooled replay bridge (synthetic engine result)', () => {
  it('emits contract-valid events: executed entries, partial and final exits, linked by stable position ids', () => {
    const a = convert();
    expect(validateEvents(a.events, RID, ['VGT', 'GDX'])).toEqual([]);
    const ids = a.events.map((e) => e.id).sort();
    expect(ids).toEqual(
      ['GDX:P-2:entry', 'VGT:P-1:entry', 'VGT:P-1:exit', 'VGT:P-1:partial-1', 'VGT:refused:D1:VGT:7'].sort()
    );
    const entry = a.events.find((e) => e.id === 'VGT:P-1:entry')!;
    const partial = a.events.find((e) => e.id === 'VGT:P-1:partial-1')!;
    const final = a.events.find((e) => e.id === 'VGT:P-1:exit')!;
    expect(entry.linkedEventId).toBe(final.id);
    expect(final.linkedEventId).toBe(entry.id);
    expect(partial.linkedEventId).toBe(entry.id);
    expect(partial.meta).toMatchObject({ partial: true, component: 'Growth', position: 'P-1', book: 'G:VGT' });
    expect(final.meta?.partial).toBeUndefined();
    expect(entry.meta).toMatchObject({ component: 'Growth', open: false, partialFills: 1 });
    // a closing-print fill keeps its session-close precision
    expect(final.timePrecision).toBe('session-close');
    expect(entry.timePrecision).toBe('minute');
  });

  it('counts a partially exited position once, with its remaining shares, principal and the finance split per fill', () => {
    const { positions, metrics } = convert();
    expect(positions).toHaveLength(2);
    const p1 = positions[0]!;
    expect(p1.fills.map((f) => f.kind)).toEqual(['entry', 'partial', 'final']);
    const [e, part, fin] = p1.fills;
    expect(part!.shares).toBeCloseTo(e!.shares / 2, 9);
    expect(part!.sharesAfter).toBeCloseTo(e!.shares / 2, 9);
    expect(part!.principalRepaid).toBe(50_000);
    expect(part!.principalAfter).toBe(50_000);
    expect(fin!.sharesAfter).toBe(0);
    expect(fin!.principalAfter).toBe(0);
    // interest only on the repaid principal, from the entry session to the fill session
    expect(part!.interest).toBeCloseTo(50_000 * 0.11 * (3 / 365), 9);
    expect(fin!.interest).toBeCloseTo(50_000 * 0.11 * (6 / 365), 9);
    expect(p1.net).toBeCloseTo(part!.fillNet! + fin!.fillNet!, 9);
    expect(p1.partialExits).toBe(1);
    expect(metrics.full).toMatchObject({ positions: 2, closedPositions: 1, openPositions: 1, partialExits: 1, exitFills: 2 });
    // the attribution of Growth·VGT is ONE position, not two winning trades
    expect(metrics.attribution.find((x) => x.book === 'G:VGT')).toMatchObject({ positions: 1, partialExits: 1 });
  });

  it('keeps an open position open at the endpoint with its mark — no closing fill is invented', () => {
    const { positions, events } = convert();
    const p2 = positions[1]!;
    expect(p2.status).toBe('open');
    expect(p2.fills).toHaveLength(1);
    expect(p2.unrealized).not.toBe(0);
    expect(p2.net).toBe(p2.unrealized);
    expect(events.filter((e) => e.symbol === 'GDX' && e.kind === 'executed_exit')).toHaveLength(0);
    const entry = events.find((e) => e.id === 'GDX:P-2:entry')!;
    expect(entry.meta?.open).toBe(true);
    expect(entry.linkedEventId).toBeNull();
    expect(entry.values.find((v) => v.key === 'positionNet')?.value).toBe(p2.net);
  });

  it('shows refusals only as rejected signals with the occupant — never fills, positions or P&L', () => {
    const { events, positions, metrics } = convert();
    const refused = events.filter((e) => e.kind === 'rejected_signal');
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ symbol: 'VGT', tradeId: null, linkedEventId: null, priceBasis: 'decision' });
    expect(refused[0]!.meta).toMatchObject({ refused: true, component: 'D1', reasonCode: 'slot_occupied', occupantBook: 'G:VGT' });
    expect(refused[0]!.reason).toMatch(/insufficient pool availability/);
    expect(positions.some((p) => p.book === 'D1:VGT')).toBe(false);
    expect(metrics.refusals).toEqual({ slotOccupied: 1, byBook: { 'D1:VGT': 1 } });
    // other refusal reasons (a disabled component, a funding start, a blackout) are not executable signals here
    expect(() =>
      convert('open', (r) => {
        r.funding[1]!.reason = 'component disabled';
      })
    ).toThrow(/refusal reason/);
  });

  it('reports a granted order still unfilled at the endpoint as pending — never an executed entry', () => {
    const a = convert('pending');
    expect(a.metrics.pending).toEqual([
      expect.objectContaining({ book: 'D1:VGT', component: 'D1', symbol: 'VGT', setup: 'deep' })
    ]);
    expect(a.events.filter((e) => e.kind === 'executed_entry').map((e) => e.id).sort()).toEqual(['GDX:P-2:entry', 'VGT:P-1:entry']);
    expect(a.positions).toHaveLength(2);
    expect(a.metrics.full.openPositions).toBe(0);
  });

  it('measures the periods of ONE continuous run: carry-in, the validation change and the reset drawdown', () => {
    const { metrics, equity, positions } = convert();
    const { result } = syntheticResult();
    expect(metrics.validation.carriedIn).toEqual(['P-1']); // entered in 2024, closed in 2025
    expect(metrics.validation.positionsEntered).toBe(1);
    expect(metrics.development.positionsEntered).toBe(1);
    expect(metrics.validation.net).toBeCloseTo(result.net - result.periods[0]!.equity, 2);
    expect(metrics.validation.realizedChange + metrics.validation.unrealizedChange).toBeCloseTo(metrics.validation.net, 1);
    expect(metrics.full.minuteDd.usd).toBeCloseTo(result.dd.max, 2);
    expect(Math.max(...equity.drawdown)).toBeCloseTo(result.dd.max, 2);
    expect(metrics.full.minuteDd.pctOfPrincipal).toBeCloseTo((result.dd.max / 100_000) * 100, 3);
    expect(equity.marked.at(-1)).toBeCloseTo(result.net, 2);
    expect(positions.reduce((a, p) => a + p.net, 0)).toBeCloseTo(metrics.full.net, 2);
  });

  it('fails closed when the engine’s figures do not reconcile', () => {
    expect(() =>
      convert('open', (r) => {
        r.net += 1;
      })
    ).toThrow(/Σ position net|last close mark/);
    expect(() =>
      convert('open', (r) => {
        r.dd.max += 5;
      })
    ).toThrow(/minute drawdown/);
    expect(() =>
      convert('open', (r) => {
        r.lots[0]!.fills[0]!.net += 3;
      })
    ).toThrow(/fills .* realized/);
    expect(() =>
      convert('open', (r) => {
        r.markChanges = null;
      })
    ).toThrow(/no minute marks/);
  });
});

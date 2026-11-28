// Pure window helpers (2026-11-27): the canonical window request of a pooled replay (shared/portfolio.ts), the effective
// window of a saved run or preview (shared/run-window.ts) and the period bounds / viewports of the portfolio model
// (src/portfolio.ts). No data, no server.
import { describe, expect, it } from 'vitest';

import { normalizeWindowRequest, RESEARCH_WINDOW, windowRequestText } from '../shared/portfolio.ts';
import type { PortfolioPosition } from '../shared/portfolio.ts';
import { effectiveWindowOf, shownWindowOf } from '../shared/run-window.ts';
import { activeAfterValidation, activeInReporting, activeInValidation, BENCHMARK_BOUNDS, boundsOf, filterPositions, DEFAULT_LEDGER_FILTER, periodWindow } from '../src/portfolio.ts';

describe('the window request of a pooled replay', () => {
  it('defaults to the research window, so an older request or link keeps the archived benchmark', () => {
    expect(normalizeWindowRequest(undefined)).toEqual(RESEARCH_WINDOW);
    expect(normalizeWindowRequest(null)).toEqual({ mode: 'research' });
    expect(normalizeWindowRequest({ mode: 'all' })).toEqual({ mode: 'all' });
  });
  it('fills a custom window’s execution with the continuous default and keeps an explicit isolated one', () => {
    expect(normalizeWindowRequest({ mode: 'custom', from: '2025-01-02', to: '2026-11-25' })).toEqual({ mode: 'custom', from: '2025-01-02', to: '2026-11-25', execution: 'continuous' });
    expect(normalizeWindowRequest({ mode: 'custom', from: '2025-01-02', to: '2026-11-25', execution: 'isolated' }).mode).toBe('custom');
    expect(windowRequestText({ mode: 'custom', from: '2025-01-02', to: '2026-11-25', execution: 'isolated' })).toBe('custom 2025-01-02 → 2026-11-25 (isolated)');
  });
  it('refuses unknown modes, fields and executions, malformed or reversed dates, and dates on research/all', () => {
    for (const bad of [
      { mode: 'later' },
      'all',
      [],
      { mode: 'all', to: '2026-11-25' },
      { mode: 'research', execution: 'isolated' },
      { mode: 'custom', from: '2025-01-02' },
      { mode: 'custom', from: '2025-13-02', to: '2026-11-25' },
      { mode: 'custom', from: '2026-11-25', to: '2026-11-02' },
      { mode: 'custom', from: '2025-01-02', to: '2026-11-25', execution: 'warm' },
      { mode: 'custom', from: '2025-01-02', to: '2026-11-25', extra: 1 }
    ])
      expect(() => normalizeWindowRequest(bad)).toThrow();
  });
});

describe('the effective window of a run (its runner’s provenance)', () => {
  const run = (to: string, symbols: Record<string, unknown>) => ({ window: { from: '2016-01-04', to }, provenance: { runner: { symbols } } });
  it('shows the evaluated sessions when the requested end lay after the data', () => {
    const e = effectiveWindowOf(
      run('2026-12-31', {
        VGT: { evaluation: { firstDate: '2016-01-04', lastDate: '2026-10-30', sessions: 2723 }, warmup: { sessions: 30, firstDate: '2015-11-17' } },
        GDX: { evaluation: { firstDate: '2016-01-04', lastDate: '2026-10-29', sessions: 2722 }, warmup: { sessions: 30, firstDate: '2015-11-17' } }
      })
    );
    expect(e.effective).toEqual({ from: '2016-01-04', to: '2026-10-30' });
    expect(e.differs).toBe(true);
    expect(shownWindowOf(e)).toEqual({ from: '2016-01-04', to: '2026-10-30' });
    expect(e.bySymbol.map((x) => [x.symbol, x.to, x.sessions, x.warmupSessions])).toEqual([
      ['VGT', '2026-10-30', 2723, 30],
      ['GDX', '2026-10-29', 2722, 30]
    ]);
  });
  it('agrees with the request when the run evaluated exactly it', () => {
    const e = effectiveWindowOf(run('2026-10-30', { VGT: { evaluation: { firstDate: '2016-01-04', lastDate: '2026-10-30', sessions: 2723 } } }));
    expect(e.differs).toBe(false);
  });
  it('reads the pool runner’s window, and falls back to the request when nothing was recorded', () => {
    expect(effectiveWindowOf({ window: { from: '2016-01-04', to: '2026-12-31' }, provenance: { runner: { window: { first: '2016-01-04', last: '2026-10-29' } } } }).effective).toEqual({ from: '2016-01-04', to: '2026-10-29' });
    const none = effectiveWindowOf({ window: { from: '2016-01-04', to: '2026-10-30' }, provenance: {} });
    expect(none.effective).toBeNull();
    expect(none.differs).toBe(false);
    expect(shownWindowOf(none)).toEqual({ from: '2016-01-04', to: '2026-10-30' });
  });
});

describe('period bounds and viewports of an extended pooled replay', () => {
  const pos = (id: string, entry: string, exit: string | null): PortfolioPosition =>
    ({ id, status: exit ? 'closed' : 'open', symbol: 'GDX', component: 'D1', fills: [{ t: entry }, ...(exit ? [{ t: exit }] : [])] }) as unknown as PortfolioPosition;
  const window = {
    from: '2016-01-04',
    to: '2026-11-25',
    boundary: '2024-12-31',
    validationFrom: '2025-01-02',
    sessions: 2741,
    requested: { mode: 'all' as const },
    execution: 'continuous' as const,
    simulation: { from: '2016-01-04', to: '2026-11-25', sessions: 2741 },
    reporting: { from: '2016-01-04', to: '2026-11-25', sessions: 2741 },
    research: { from: '2016-01-04', to: '2026-10-30', boundary: '2024-12-31', validationEnd: '2026-10-30', source: 'test' },
    coverage: { endpoint: '2026-11-25', limitedBy: ['GDX', 'VGT'], files: [] },
    postValidation: true,
    label: 'MANUAL POST-VALIDATION EVALUATION'
  };
  const b = boundsOf({ window });
  const p44 = pos('P-44', '2026-10-23T13:33:00Z', '2026-11-10T16:20:00Z'); // carried across the validation end
  const p45 = pos('P-45', '2026-11-12T14:33:00Z', '2026-11-20T16:01:00Z'); // after it
  const p40 = pos('P-40', '2026-05-01T14:00:00Z', '2026-06-01T14:00:00Z'); // inside validation
  it('validation is bounded by the validation end; post-validation includes the position carried across it', () => {
    expect([p44, p45, p40].map((p) => activeInValidation(p, b))).toEqual([true, false, true]);
    expect([p44, p45, p40].map((p) => activeAfterValidation(p, b))).toEqual([true, true, false]);
    expect(filterPositions([p44, p45, p40], { ...DEFAULT_LEDGER_FILTER, period: 'post' }, b).map((p) => p.id)).toEqual(['P-44', 'P-45']);
    // the research window's bounds keep the earlier behaviour (validation = everything after 2024-12-31)
    expect([p44, p45, p40].map((p) => activeInValidation(p, BENCHMARK_BOUNDS))).toEqual([true, true, true]);
  });
  it('a continuous reporting window selects the positions active in it', () => {
    const rb = boundsOf({ window: { ...window, requested: { mode: 'custom', from: '2026-11-02', to: '2026-11-25', execution: 'continuous' }, reporting: { from: '2026-11-02', to: '2026-11-25', sessions: 18 } } });
    expect([p44, p45, p40].map((p) => activeInReporting(p, rb))).toEqual([true, true, false]);
  });
  it('viewports: validation ends at the validation end; post and reporting start after it', () => {
    const dates = ['2024-12-30', '2024-12-31', '2025-01-02', '2026-10-29', '2026-10-30', '2026-11-02', '2026-11-25'];
    const closeMs = dates.map((d) => Date.parse(`${d}T21:00:00Z`));
    const o = { validationEnd: '2026-10-30', reportingFrom: '2026-11-02' };
    expect(periodWindow('validation', closeMs, dates, o)).toEqual([closeMs[1]! + 1, closeMs[4]!]);
    expect(periodWindow('post', closeMs, dates, o)).toEqual([closeMs[4]! + 1, closeMs[6]!]);
    expect(periodWindow('reporting', closeMs, dates, o)).toEqual([closeMs[4]! + 1, closeMs[6]!]);
    expect(periodWindow('post', closeMs, dates)).toBeNull();
    expect(periodWindow('validation', closeMs, dates)).toEqual([closeMs[1]! + 1, closeMs[6]!]);
  });
});

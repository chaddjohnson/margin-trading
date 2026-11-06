// The browser's pure Interactive Preview logic (src/preview/model.ts, src/paramForm.ts): the draft's canonical
// configuration (effective values only), validation that ignores inactive values, when "Run preview" is enabled, and
// selection matching across executions by stable identity (never by the ordinal T-n id).

import { describe, expect, it } from 'vitest';

import type { LabEvent } from '../shared/contract.ts';
import { previewConfigKey } from '../shared/preview.ts';
import { paramOf } from '../shared/params.ts';
import { findStrategy, RISE_FROM_RECENT_LOW, RISE_FROM_RECENT_LOW_TRADING } from '../shared/strategies.ts';
import { draftOf, withValue } from '../src/paramForm.ts';
import { draftState, matchSelection, runDisabledReason, stableKeyOf } from '../src/preview/model.ts';

const G = RISE_FROM_RECENT_LOW_TRADING;
const W = { symbols: ['VGT'], from: '2016-01-04', to: '2023-12-29', resolution: '1d' as const };
const base = () => draftOf(G, {});

describe('draft → canonical configuration', () => {
  it('executes the effective values only; hidden and disabled drafts never change the key', () => {
    const d = base();
    const s0 = draftState(G, d, W);
    expect(s0.valid).toBe(true);
    expect(Object.keys(s0.config!.params)).not.toContain('trendMethod'); // the filter is OFF
    const hidden = { ...d, trendMethod: 'momentum', breakoutBufferPercent: '9' };
    expect(draftState(G, hidden, W).key).toBe(s0.key);
    expect(draftState(G, { ...d, advanceFromRecentLowPercent: '10' }, W).key).not.toBe(s0.key);
    expect(draftState(G, { ...d, advanceFromRecentLowPercent: '5.0' }, W).key).toBe(s0.key);
    expect(draftState(G, d, { ...W, from: '2016-01-05' }).key).not.toBe(s0.key);
    expect(draftState(G, d, { ...W, resolution: '60m' }).key).not.toBe(s0.key);
  });

  it('an invalid inactive value does not block; an invalid active one, an empty one, a cross rule or dates do', () => {
    const off = withValue(G, base(), paramOf(G, 'maximumHoldEnabled')!, false);
    // the cascade: switching the hold off also switches the buffer (which applies only with it) off
    expect(off.intradayLossBufferEnabled).toBe(false);
    expect(draftState(G, { ...off, maximumHoldDays: '-3', intradayLossBufferPercent: 'x' }, W).valid).toBe(true);
    const bad = draftState(G, { ...base(), advanceFromRecentLowPercent: '0' }, W);
    expect(bad.valid).toBe(false);
    expect(bad.fieldErrors.advanceFromRecentLowPercent).toMatch(/between/);
    expect(draftState(G, { ...base(), recentLowLookbackBars: '' }, W).fieldErrors.recentLowLookbackBars).toMatch(/required/);
    const momentum = { ...base(), trendFilterEnabled: true, trendMethod: 'momentum', trendMomentumShortSessions: '80', trendMomentumLongSessions: '40' };
    expect(draftState(G, momentum, W).formErrors.join()).toMatch(/short/i);
    expect(draftState(G, base(), { ...W, from: '2024-01-01', to: '2023-01-01' }).formErrors).toContain('From: must not be after To');
    expect(draftState(G, base(), { ...W, from: '2016-13-45' }).valid).toBe(false);
  });

  it('shows the dependent parameters of every method and policy (registry-driven, no Growth-specific code)', () => {
    const methods = paramOf(G, 'continuationMethod')!;
    const trend = paramOf(G, 'trendMethod')!;
    const policy = paramOf(G, 'eligibilityPolicy')!;
    expect(methods.type === 'enum' && methods.options.map((o) => o.value)).toEqual(['classic_d1', 'breakout', 'shallow_pullback', 'ma_cross']);
    expect(trend.type === 'enum' && trend.options.length).toBe(5);
    expect(policy.type === 'enum' && policy.options.length).toBe(5);
    expect(findStrategy(G.key, G.version)).toBe(G);
    // Growth 1.3.0: the entry-method selector and the two exit options are registry data like the others
    const entry = paramOf(G, 'entryMethod')!;
    expect(entry.type === 'enum' && entry.options.map((o) => o.value)).toEqual(['rise_from_recent_low', 'trend_breakout']);
    expect(G.groups.map((g) => g.key)).toEqual(['entry', 'trend', 'eligibility', 'drawdownGate', 'exit', 'initialStop', 'retention', 'continuation', 'execution']);
    expect(draftState(RISE_FROM_RECENT_LOW, draftOf(RISE_FROM_RECENT_LOW, {}), W).config!.params).toEqual({
      advanceFromRecentLowPercent: 5,
      recentLowLookbackBars: 20
    });
  });
});

describe('Run preview enablement', () => {
  const k = (x: number) => previewConfigKey({ strategyKey: G.key, strategyVersion: G.version, params: { x }, ...W });
  it('disabled for the displayed configuration, an invalid draft, or the same configuration running; enabled otherwise', () => {
    expect(runDisabledReason({ valid: true, draftKey: k(1), displayedKey: k(1), runningKey: null })).toMatch(/what the chart shows/);
    expect(runDisabledReason({ valid: false, draftKey: null, displayedKey: k(1), runningKey: null })).toMatch(/Fix/);
    expect(runDisabledReason({ valid: true, draftKey: k(2), displayedKey: k(1), runningKey: k(2) })).toMatch(/running/);
    // a previously executed (cached) configuration that is not displayed now is submittable
    expect(runDisabledReason({ valid: true, draftKey: k(2), displayedKey: k(1), runningKey: null })).toBeNull();
    // another configuration while one runs supersedes it
    expect(runDisabledReason({ valid: true, draftKey: k(3), displayedKey: k(1), runningKey: k(2) })).toBeNull();
  });
});

describe('selection across executions', () => {
  const ev = (id: string, kind: LabEvent['kind'], t: string, price: number, link: string | null = null, tradeId: string | null = null): LabEvent => ({
    id,
    runId: 'X',
    symbol: 'VGT',
    kind,
    t,
    timePrecision: 'minute',
    timeMeaning: 'm',
    price,
    priceBasis: 'fill',
    reason: null,
    values: [],
    tradeId,
    linkedEventId: link,
    meta: {}
  });
  const tradeA = [ev('VGT:T-7:entry', 'executed_entry', '2020-03-02T14:31:00Z', 100, 'VGT:T-7:exit', 'T-7'), ev('VGT:T-7:exit', 'executed_exit', '2020-03-09T14:31:00Z', 95, 'VGT:T-7:entry', 'T-7')];
  it('keeps a trade only when the same fills exist (its ordinal id may differ); never another trade with the same id', () => {
    const renumbered = [ev('VGT:T-5:entry', 'executed_entry', '2020-03-02T14:31:00Z', 100, 'VGT:T-5:exit', 'T-5'), ev('VGT:T-5:exit', 'executed_exit', '2020-03-09T14:31:00Z', 95, 'VGT:T-5:entry', 'T-5')];
    expect(matchSelection(tradeA[0]!, tradeA, renumbered)?.id).toBe('VGT:T-5:entry');
    const sameIdOtherTrade = [ev('VGT:T-7:entry', 'executed_entry', '2020-05-04T14:31:00Z', 120, 'VGT:T-7:exit', 'T-7'), ev('VGT:T-7:exit', 'executed_exit', '2020-05-11T14:31:00Z', 118, 'VGT:T-7:entry', 'T-7')];
    expect(matchSelection(tradeA[0]!, tradeA, sameIdOtherTrade)).toBeNull();
    // same entry, different exit (an exit parameter changed): a different trade
    const otherExit = [tradeA[0]!, ev('VGT:T-7:exit', 'executed_exit', '2020-03-12T14:31:00Z', 97, 'VGT:T-7:entry', 'T-7')];
    expect(matchSelection(tradeA[0]!, tradeA, otherExit)).toBeNull();
    expect(stableKeyOf(tradeA[1]!, tradeA)).toBe(stableKeyOf(tradeA[0]!, tradeA).replace('executed_entry|', 'executed_exit|'));
    const signal = ev('VGT:entry_signal:2020-03-02T21:00:00Z', 'entry_signal', '2020-03-02T21:00:00Z', 101);
    expect(matchSelection(signal, [signal], [signal])?.id).toBe(signal.id);
    expect(matchSelection(signal, [signal], [{ ...signal, price: 102 }])).toBeNull();
  });
});

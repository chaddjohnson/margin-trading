// The unified parameter schema (version 2, shared/params.ts) of every strategy: applicability chains, enum choices and
// nested conditions, server-side validation of active and inactive values, cross-field constraints, effective-value
// variation identity (and the unchanged identities of the stored variations), the run snapshot, and the optimisation
// search-space introspection with valid candidate sampling (smoke checks only: nothing here optimises).

import { describe, expect, it } from 'vitest';

import type { ParamValue } from '../shared/contract.ts';
import {
  constraintErrors,
  defaultParams,
  effectiveParams,
  evalPredicate,
  isActive,
  paramSnapshot,
  sampleCandidate,
  schemaOf,
  searchSpaceOf,
  seededRandom,
  validateParams,
  variationIdentity
} from '../shared/params.ts';
import {
  CONTINUATION_PARAM_KEYS,
  RISE_FROM_RECENT_LOW,
  RISE_FROM_RECENT_LOW_TRADING as G,
  RISE_FROM_RECENT_LOW_TRADING_1_0_0 as LEGACY,
  STRATEGY_REGISTRY,
  validateRunRequest
} from '../shared/strategies.ts';

const growth = (over: Record<string, ParamValue> = {}) => ({ ...defaultParams(G), ...over });
const on = (method: string, over: Record<string, ParamValue> = {}) =>
  growth({ continuationEnabled: true, continuationMethod: method, ...over });
const METHOD_KEYS: Record<string, string[]> = {
  classic_d1: ['classicPullbackPercent', 'classicReboundPercent'],
  breakout: ['breakoutBufferPercent', 'breakoutFormationBars'],
  shallow_pullback: ['uptrendSmaBars', 'uptrendSlopeBars', 'uptrendMinimumRisePercent', 'pullbackMinimumPercent', 'pullbackMaximumPercent', 'recoveryPercent'],
  ma_cross: ['crossSmaBars', 'crossRisingBars', 'crossMinimumSlopePercent', 'crossMarginPercent']
};

describe('every strategy uses the one schema', () => {
  it('registers each stored strategy version with a version-2 schema object', () => {
    for (const s of STRATEGY_REGISTRY) {
      const schema = schemaOf(s);
      expect(schema.schemaVersion).toBe(2);
      expect(['effective', 'all-values']).toContain(schema.identity);
      for (const p of s.params) {
        expect(['number', 'integer', 'boolean', 'enum']).toContain(p.type);
        if (p.group) expect(s.groups.map((g) => g.key)).toContain(p.group);
        if (p.type === 'number' || p.type === 'integer') expect(p.min <= p.default && p.default <= p.max).toBe(true);
        if (p.type === 'enum') expect(p.options.map((o) => o.value)).toContain(p.default);
      }
    }
    expect(LEGACY.identity).toBe('all-values');
    expect(G.identity).toBe('effective');
  });

  it('continuation is OFF by default, an enum picks the method, and only that method’s inputs apply', () => {
    const d = growth();
    expect(d.continuationEnabled).toBe(false);
    for (const k of CONTINUATION_PARAM_KEYS.filter((k) => k !== 'continuationEnabled')) expect(isActive(G, d, k)).toBe(false);
    for (const [method, keys] of Object.entries(METHOD_KEYS)) {
      const v = on(method);
      expect(isActive(G, v, 'continuationMethod')).toBe(true);
      expect(isActive(G, v, 'continuationWindowSessions')).toBe(true);
      for (const [other, otherKeys] of Object.entries(METHOD_KEYS))
        for (const k of otherKeys) expect(isActive(G, v, k), `${method}: ${k}`).toBe(other === method);
      expect(Object.keys(effectiveParams(G, v)).filter((k) => CONTINUATION_PARAM_KEYS.includes(k)).sort()).toEqual(
        ['continuationEnabled', 'continuationMethod', 'continuationWindowSessions', ...keys].sort()
      );
    }
    // the chain: a method's inputs do not apply while the master switch is off, whatever the method value says
    expect(isActive(G, growth({ continuationMethod: 'breakout' }), 'breakoutBufferPercent')).toBe(false);
  });

  it('nested predicates evaluate all/any/not/in', () => {
    const v = { a: true, m: 'x', n: 3 };
    expect(evalPredicate({ all: [{ param: 'a', equals: true }, { param: 'm', in: ['x', 'y'] }] }, v)).toBe(true);
    expect(evalPredicate({ any: [{ param: 'a', equals: false }, { not: { param: 'n', equals: 4 } }] }, v)).toBe(true);
    expect(evalPredicate({ not: { param: 'm', in: ['x'] } }, v)).toBe(false);
  });
});

describe('validation (the same code in the form and on the server)', () => {
  const req = (params: Record<string, unknown>) => ({
    strategyKey: G.key,
    strategyVersion: G.version,
    params,
    symbols: ['VGT'],
    from: '2020-01-02',
    to: '2020-12-31',
    resolution: '1d'
  });
  const known = new Set(['VGT']);

  it('accepts OFF and every method with its defaults; refuses an unknown method, a missing active value, a bad inactive draft', () => {
    expect(validateRunRequest(req(growth()), known)).toEqual([]);
    for (const m of Object.keys(METHOD_KEYS)) expect(validateRunRequest(req(on(m)), known)).toEqual([]);
    expect(validateRunRequest(req(on('macd')), known).join()).toMatch(/one of classic_d1, breakout, shallow_pullback, ma_cross/);
    const missing = Object.fromEntries(Object.entries(on('breakout')).filter(([k]) => k !== 'breakoutBufferPercent'));
    expect(validateRunRequest(req(missing), known).join()).toMatch(/Breakout buffer \(b\): must be a number/);
    // an inactive value may be absent …
    const lean = effectiveParams(G, on('breakout'));
    expect(validateRunRequest(req(lean), known)).toEqual([]);
    // … but a present one must still be valid (it is stored as a saved draft)
    expect(validateRunRequest(req(on('breakout', { recoveryPercent: -1 })), known).join()).toMatch(/saved, not applied/);
    expect(validateRunRequest(req(growth({ continuationEnabled: 'yes' as unknown as boolean })), known).join()).toMatch(
      /must be on or off/
    );
  });

  it('cross-field constraints: buffer needs hold (always); the pullback band only while shallow_pullback applies', () => {
    expect(constraintErrors(G, growth({ maximumHoldEnabled: false, intradayLossBufferEnabled: true }))).toHaveLength(1);
    const band = { pullbackMinimumPercent: 8, pullbackMaximumPercent: 8 };
    expect(constraintErrors(G, on('shallow_pullback', band))).toEqual([
      'Shallow pullback: the minimum pullback must be below the maximum pullback'
    ]);
    expect(constraintErrors(G, on('breakout', band))).toEqual([]); // the band does not apply to another method
    expect(constraintErrors(G, growth(band))).toEqual([]);
    expect(validateParams(G, on('shallow_pullback', band)).join()).toMatch(/minimum pullback must be below/);
  });
});

describe('effective-value identity, snapshots and stored identities', () => {
  it('inactive drafts do not multiply variations; active differences do', () => {
    const id = (v: Record<string, ParamValue>) => variationIdentity(G, v, '1d');
    expect(id(growth({ breakoutBufferPercent: 3 }))).toBe(id(growth()));
    expect(id(on('breakout', { classicPullbackPercent: 4 }))).toBe(id(on('breakout')));
    expect(id(on('breakout', { breakoutBufferPercent: 3 }))).not.toBe(id(on('breakout')));
    expect(id(on('classic_d1'))).not.toBe(id(on('breakout')));
    expect(id(growth({ maximumHoldEnabled: false, maximumHoldDays: 30, intradayLossBufferEnabled: false }))).toBe(
      id(growth({ maximumHoldEnabled: false, maximumHoldDays: 8, intradayLossBufferEnabled: false }))
    );
    expect(variationIdentity(G, growth(), '60m')).not.toBe(id(growth()));
  });

  it('reproduces the stored canonical identities of the signal-only and the legacy Growth 1.0.0 variations', () => {
    // V-000014 (signal-only) and V-000017 (Growth 1.0.0, hold off) of the live database, as stored by migration 0001 code.
    expect(variationIdentity(RISE_FROM_RECENT_LOW, { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 20 }, '1d')).toBe(
      '{"advanceFromRecentLowPercent":5,"recentLowLookbackBars":20}|1d'
    );
    expect(
      variationIdentity(
        LEGACY,
        { ...defaultParams(LEGACY), recentLowLookbackBars: 90, maximumHoldEnabled: false, intradayLossBufferEnabled: false },
        '1d'
      )
    ).toBe(
      '{"advanceFromRecentLowPercent":5,"costBpsPerSide":5,"intradayLossBufferEnabled":false,"intradayLossBufferPercent":2.9,"maximumHoldDays":8,"maximumHoldEnabled":false,"recentLowLookbackBars":90,"trailingStopPercent":7.3}|1d'
    );
  });

  it('the snapshot labels inactive values "saved, not applied" and shows choices by label', () => {
    const snap = paramSnapshot(G, on('breakout', { classicPullbackPercent: 4 }));
    const by = (k: string) => snap.find((v) => v.key === k)!;
    expect(by('continuationEnabled').value).toBe('ON');
    expect(by('continuationMethod').value).toBe('Breakout above post-exit high (breakout)');
    expect(by('breakoutBufferPercent').label).not.toMatch(/not applied/);
    expect(by('classicPullbackPercent').label).toMatch(/saved, not applied/);
  });
});

describe('optimisation-domain introspection (smoke checks, no optimiser)', () => {
  it('describes every dimension with its legal domain and when it applies', () => {
    const space = searchSpaceOf(G, ['advanceFromRecentLowPercent', 'recentLowLookbackBars']);
    const dim = (k: string) => space.dimensions.find((d) => d.key === k)!;
    expect(space.dimensions.some((d) => d.key === 'advanceFromRecentLowPercent')).toBe(false);
    expect(dim('continuationEnabled').domain).toEqual({ values: [false, true] });
    expect(dim('continuationMethod').domain).toEqual({ values: ['classic_d1', 'breakout', 'shallow_pullback', 'ma_cross'] });
    expect(dim('continuationMethod').activeWhen).toEqual({ param: 'continuationEnabled', equals: true });
    expect(dim('breakoutBufferPercent').activeWhen).toEqual({ param: 'continuationMethod', equals: 'breakout' });
    expect(dim('classicPullbackPercent').domain).toMatchObject({ min: 0.1, max: 50, step: 0.1, scale: 'linear' });
    expect(space.constraints.map((c) => c.id)).toEqual(['buffer-requires-hold', 'pullback-band', 'momentum-short-long']);
  });

  it('samples only valid effective candidates (no inactive dimension), deterministically per seed', () => {
    const rnd = seededRandom(20261104);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const c = sampleCandidate(G, rnd, { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 20 });
      expect(validateParams(G, c)).toEqual([]);
      expect(Object.keys(effectiveParams(G, c)).sort()).toEqual(Object.keys(c).sort());
      seen.add(c.continuationEnabled === true ? String(c.continuationMethod) : 'off');
    }
    expect([...seen].sort()).toEqual(['breakout', 'classic_d1', 'ma_cross', 'off', 'shallow_pullback']);
    expect(sampleCandidate(G, seededRandom(7))).toEqual(sampleCandidate(G, seededRandom(7)));
    const forced = sampleCandidate(G, seededRandom(1), { continuationEnabled: true, continuationMethod: 'shallow_pullback' });
    expect((forced.pullbackMinimumPercent as number) < (forced.pullbackMaximumPercent as number)).toBe(true);
  });
});

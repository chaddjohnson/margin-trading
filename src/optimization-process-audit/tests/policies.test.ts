// The frozen policies (POLICIES.md): determinism, ties, admissibility and no-selection, and training-only inputs (a
// policy touching a confirmation field or any field outside the §6 menu throws).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Features } from '../mechanism.ts';
import { P0, P1, P2, P3, allPolicies } from '../policies.ts';

const f = (label: string, o: { net: number; robust?: number; dd?: number; w10?: number; exBy?: number; without?: number }): Features =>
  ({
    subject: '4A',
    cut: 'C19',
    label,
    id: label,
    cell: 'rise',
    roles: [],
    centre: { net: o.net, dd: o.dd ?? 10_000, lots: 1, episodes: 1, topEpisode: 0, topEpisodeShare: 0, years: {}, exBestYear: 0, worstYear: 0, positiveYears: 0, years_n: 0, sessionsHeld: 0 },
    select: { n: 256, robust: o.robust ?? 0, median: 0, p10: 0, p90Dd: 0, p95Dd: 0, worst10Mean: o.w10 ?? 20_000, worstDd: 0, breachShare: 0, breachInterval: [0, 0], distinct: 256, sameAsCentre: 0, clipped: 0, exBestYearMedian: o.exBy ?? 0, exBestYearP10: 0, topEpisodeShareMedian: 0, lotsMedian: 1, zeroLotDraws: 0 },
    causal: { window: null, episodeNet: 0, lots: 0, netWithout: o.without ?? o.net, ddWithout: 0, arithmetic: 0 },
    confirmQualificationOnly: { p10: 0, p90Dd: 0 }
  }) as Features;

// Throws on any read of a field outside the §6 feature menu (confirmation included).
const guarded = (x: Features): Features => {
  const allowed: Record<string, Set<string> | true> = { label: true, id: true, subject: true, cut: true, cell: true, roles: true, centre: true, select: true, causal: true };

  return new Proxy(x, {
    get(t, k) {
      if (typeof k === 'string' && !(k in allowed)) throw new Error(`policy read a forbidden field: ${k}`);
      return (t as unknown as Record<string | symbol, unknown>)[k];
    }
  });
};

describe('frozen policies', () => {
  const e = [
    f('a', { net: 100, robust: 5, w10: 40_000, exBy: 10, without: 20 }),
    f('b', { net: 90, robust: 9, w10: 30_000, exBy: 50, without: 60 }),
    f('c', { net: 90, robust: 9, w10: 34_000, exBy: 50, without: 60, dd: 9_000 }),
    f('d', { net: 80, robust: 1, w10: 10_000, exBy: 70, without: 30 })
  ];

  it('P0 is the profit order; P1 skips a heavy tail; P2/P3 follow their scores; ties end in the profit order', () => {
    assert.equal(P0.choose(e).label, 'a');
    assert.equal(P1.choose(e).label, 'c'); // b and c tie on net and robust; c has the lower centre DD
    assert.equal(P2.choose(e).label, 'd');
    assert.equal(P3.choose(e).label, 'c');
  });

  it('is independent of the input order', () => {
    for (const p of allPolicies()) assert.equal(p.choose([...e].reverse()).label, p.choose(e).label, p.key);
  });

  it('P1 abstains when no member is admissible; every policy abstains on an empty set', () => {
    assert.equal(P1.choose([f('x', { net: 1, w10: 35_000.01 })]).label, null);
    assert.equal(P1.choose([f('x', { net: 1, w10: 35_000 })]).label, 'x');
    for (const p of allPolicies()) assert.equal(p.choose([]).label, null, p.key);
  });

  it('reads only the §6 feature menu (never a confirmation field)', () => {
    for (const p of allPolicies()) assert.doesNotThrow(() => p.choose(e.map(guarded)), p.key);
    assert.throws(() => (guarded(e[0]!) as unknown as { confirmQualificationOnly: unknown }).confirmQualificationOnly);
  });
});

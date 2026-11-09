// The four-component space and the selection rules (PROTOCOL.md §15.2): identities ignore inactive genes; decoding
// and encoding round-trip on the fine grid with the incumbents exactly representable; the screen pins the cell and the
// gate pairs; neighbourhoods are deterministic, honour their scopes and never move categorical genes; the
// actual-profit order and its frozen tie-break; the roles and the no-qualified fallback; participation labels.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { appendixA, briefD1, briefG085 } from '../controls.ts';
import { control4 } from '../../growth140-vgt-s8m/space.ts';
import { profitOrder } from '../fitness.ts';
import { participationOf, removalsOf, rolesOf, togglesOf } from '../qualify.ts';
import type { Evidence } from '../qualify.ts';
import type { Rec } from '../evaluate.ts';
import {
  cellOf,
  decode,
  encode,
  entryOf,
  gatePairOf,
  gatePairs,
  movesOf,
  neighbourhood,
  normalize,
  pinCell,
  pinGates,
  quadId,
  screenGenomes,
  structureOf
} from '../space.ts';

const vg2 = { GDX: briefD1.vg2GDX, VGT: briefD1.vg2VGT };
const q0 = normalize({ d1: vg2, g: { GDX: appendixA, VGT: control4 }, first: 'D1' });

describe('identity and the genome', () => {
  test('inactive genes never change the identity; every book and the priority do', () => {
    const extra = normalize({ ...q0, g: { ...q0.g, VGT: { ...q0.g.VGT, retentionSellPercent: 70 } } }); // retention OFF

    assert.equal(quadId(extra), quadId(q0));
    assert.notEqual(quadId(normalize({ ...q0, first: 'G' })), quadId(q0));
    assert.notEqual(quadId(normalize({ ...q0, g: { GDX: control4, VGT: appendixA } })), quadId(q0));
    assert.notEqual(
      quadId(normalize({ ...q0, d1: { GDX: vg2.VGT, VGT: vg2.GDX } })),
      quadId(q0),
      'the symbol of a vector is part of the identity'
    );
  });

  test('the incumbents are exactly representable on the fine grid (decode ∘ encode = identity)', () => {
    for (const q of [q0, normalize({ d1: vg2, g: { GDX: appendixA, VGT: briefG085 }, first: 'G' })])
      assert.equal(quadId(decode(encode(q, 'fine'), 'fine')), quadId(q));
  });

  test('the screen pins the cell and cycles the four gate pairs', () => {
    const cell = { GDX: 'breakout' as const, VGT: 'rise' as const };
    const gs = screenGenomes(16, 'coarse', 'test', 'screen').map((g, i) => pinGates(pinCell(g, cell), gatePairs[i % 4]!));
    const qs = gs.map((g) => decode(g, 'coarse'));

    for (const [i, q] of qs.entries()) {
      assert.deepEqual(cellOf(q), cell);
      assert.equal(gatePairOf(q), gatePairs[i % 4]!.join('/'));
    }
    assert.deepEqual(screenGenomes(8, 'coarse', 'x'), screenGenomes(8, 'coarse', 'x'), 'deterministic');
  });
});

describe('neighbourhoods and moves', () => {
  test('deterministic, unique, scoped; categorical genes and inactive books fixed', () => {
    const a = neighbourhood(q0, { name: 'n', n: 64, labels: ['t', 1], scope: 'gdx' });
    const b = neighbourhood(q0, { name: 'n', n: 64, labels: ['t', 1], scope: 'gdx' });

    assert.deepEqual(
      a.map((p) => p.id),
      b.map((p) => p.id)
    );
    assert.equal(new Set(a.map((p) => p.id)).size, a.length);
    for (const p of a) {
      assert.deepEqual(p.quad.d1.VGT, q0.d1.VGT, 'the VGT D1 book is not in the GDX scope');
      assert.deepEqual(p.quad.g.VGT, q0.g.VGT, 'the VGT Growth book is not in the GDX scope');
      assert.equal(p.quad.first, q0.first);
      assert.equal(entryOf(p.quad.g.GDX), entryOf(q0.g.GDX));
      assert.deepEqual(structureOf(p.quad.g.GDX), structureOf(q0.g.GDX));
    }

    for (const p of neighbourhood(q0, { name: 'n', n: 32, labels: ['t', 2], scope: 'd1' })) assert.deepEqual(p.quad.g, q0.g);
  });

  test('refinement moves: numeric steps of every book, the flipped priority, optional rules OFF; Growth-only lanes keep D1', () => {
    const m = movesOf(q0);
    const gOnly = movesOf(q0, { d1: false, g: true });

    assert.ok(m.some((x) => x.first !== q0.first));
    assert.ok(m.some((x) => x.g.GDX.drawdownRecoveryGateEnabled === false));
    assert.ok(m.some((x) => x.d1.GDX.tickWindowSize !== q0.d1.GDX.tickWindowSize));
    for (const x of gOnly) {
      assert.deepEqual(x.d1, q0.d1);
      assert.equal(x.first, q0.first);
    }
    assert.ok(!m.some((x) => quadId(x) === quadId(q0)));
  });
});

// ----- selection rules -----

const rec = (net: number, dd: number, lots: Partial<Record<string, number>> = {}): Rec =>
  ({
    net,
    dd,
    mixed: (lots['D1:GDX'] ?? 0) + (lots['D1:VGT'] ?? 0) > 0 && (lots['G:GDX'] ?? 0) + (lots['G:VGT'] ?? 0) > 0,
    books: Object.fromEntries(
      ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'].map((b) => [b, { lots: lots[b] ?? 0, principalDays: (lots[b] ?? 0) * 1000 }])
    ),
    fam: {
      D1: { lots: (lots['D1:GDX'] ?? 0) + (lots['D1:VGT'] ?? 0), principalDays: ((lots['D1:GDX'] ?? 0) + (lots['D1:VGT'] ?? 0)) * 1000 },
      G: { lots: (lots['G:GDX'] ?? 0) + (lots['G:VGT'] ?? 0), principalDays: ((lots['G:GDX'] ?? 0) + (lots['G:VGT'] ?? 0)) * 1000 }
    }
  }) as unknown as Rec;

const ev = (label: string, net: number, robust: number, p90: number, qualified = true, dd = 20000): Evidence =>
  ({
    label,
    qualified,
    centre: { net, dd },
    select: { robust, p90Dd: p90, p10: robust / 2 }
  }) as unknown as Evidence;

describe('the primary rule and the roles', () => {
  test('actual profit first; ties by the higher robust net, the lower drawdown, then the label', () => {
    const o = profitOrder([
      { label: 'b', net: 100, robust: 50, dd: 10 },
      { label: 'a', net: 100, robust: 50, dd: 10 },
      { label: 'c', net: 100, robust: 60, dd: 30 },
      { label: 'd', net: 100, robust: 60, dd: 20 },
      { label: 'e', net: 120, robust: 1, dd: 34000 }
    ]);

    assert.deepEqual(
      o.map((x) => x.label),
      ['e', 'd', 'c', 'a', 'b']
    );
  });

  test('roles on the selection families; an unqualified member is never ranked; no qualified member → no primary', () => {
    const r = rolesOf('t', [
      ev('high', 300000, 100000, 34000),
      ev('robust', 200000, 180000, 30000),
      ev('calm', 150000, 120000, 15000),
      ev('excluded', 900000, 900000, 1000, false)
    ]);

    assert.equal(r.roles['actual-profit'], 'high');
    assert.equal(r.roles['robust-profit'], 'robust');
    assert.equal(r.roles.balanced, 'calm');
    assert.equal(r.roles['lower-drawdown'], 'calm');
    assert.ok(!r.ranked.some((x) => x.label === 'excluded'));
    assert.equal(rolesOf('none', [ev('x', 1, 1, 1, false)]).roles['actual-profit'], null);
  });

  test('participation labels: disabled, unfunded and token components; token and single families', () => {
    const p = participationOf(rec(1, 1, { 'D1:GDX': 40, 'D1:VGT': 1, 'G:VGT': 20 }), ['D1:GDX', 'D1:VGT', 'G:VGT']);

    assert.equal(p.per['G:GDX'], 'disabled');
    assert.equal(p.per['D1:VGT'], 'token');
    assert.equal(p.per['D1:GDX'], 'funded');
    assert.equal(p.fam, 'mixed');
    assert.equal(participationOf(rec(1, 1, { 'D1:GDX': 99, 'G:VGT': 1 }), ['D1:GDX', 'G:VGT']).fam, 'token');
    assert.equal(participationOf(rec(1, 1, { 'D1:GDX': 9 }), ['D1:GDX', 'G:GDX']).fam, 'single-family');
  });

  test('removals and toggles are restricted to the enabled components', () => {
    const all = removalsOf(['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT']);

    assert.deepEqual(Object.keys(all), [
      'without D1',
      'without Growth',
      'without GDX',
      'without VGT',
      'without D1:GDX',
      'without D1:VGT',
      'without G:GDX',
      'without G:VGT'
    ]);
    assert.deepEqual(Object.keys(removalsOf(['D1:GDX', 'D1:VGT'])), ['without GDX', 'without VGT']);
    assert.ok(!Object.keys(togglesOf(q0, ['D1:GDX', 'D1:VGT'])).includes('priority flipped'));
    assert.ok(Object.keys(togglesOf(q0, ['D1:GDX', 'G:GDX'])).includes('G·GDX recovery gate OFF'));
    assert.ok(!Object.keys(togglesOf(q0, ['D1:GDX', 'G:GDX'])).some((k) => k.startsWith('G·VGT')));
  });
});

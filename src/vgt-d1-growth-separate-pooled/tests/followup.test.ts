// The follow-up's own logic: the pair is resolved from Priority 2's committed records (never a substitute), the six
// cases and the comparators are what the protocol lists, the neighbour families are deterministic, and the
// comparison's reconciliation and scaling-versus-path decomposition hold on synthetic books. No market data is read.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildData } from '../../shared-margin-portfolio/tests/fixtures.ts';
import type { Dataset } from '../../four-family/data.ts';
import { type Allocation, runPool } from '../../vgt-d1-growth-joint/allocator.ts';
import type { VBook, VTrade } from '../../vgt-d1-growth-joint/books.ts';
import { briefD1, briefG085 } from '../../vgt-d1-growth-joint/controls.ts';
import { fixtureDoorOf } from '../../vgt-d1-growth-joint/data.ts';
import { recordOf } from '../../vgt-d1-growth-joint/evaluate.ts';
import { matchLots } from '../../vgt-d1-growth-joint/post.ts';
import { growthId, jointId, normalize } from '../../vgt-d1-growth-joint/space.ts';
import { scalingOf, viewOf, windowsOf } from '../compare.ts';
import { p2 } from '../context.ts';
import { casesOf, comparatorsOf, familiesOf, loadP2, resolvePair } from '../manifest.ts';

describe('the frozen pair and the manifest', () => {
  const { frozen, d1, g } = resolvePair();
  const cases = casesOf({ d1, g });
  const comparators = comparatorsOf(frozen);

  test('the pair is the two optimized single-family selections, unchanged', () => {
    assert.equal(d1.label, p2.d1Label);
    assert.equal(g.label, p2.gLabel);
    assert.deepEqual(Object.values(d1.joint.d1), [239, 10, 120, 25, 48, 42, 31, 96]);
    assert.equal(g.joint.g.entryMethod, 'trend_breakout');
    for (const c of cases) {
      assert.deepEqual(c.joint.d1, d1.joint.d1);
      assert.equal(growthId(c.joint.g), growthId(g.joint.g));
    }
  });

  test('six distinct cases, the primary first, none equal to a comparator', () => {
    assert.deepEqual(
      cases.map((c) => c.key),
      [
        'A · D1-first',
        'A · Growth-first',
        'B 100/100 · D1-first',
        'B 100/100 · Growth-first',
        'B 50/50 · D1-first',
        'B 50/50 · Growth-first'
      ]
    );
    assert.equal(new Set(cases.map((c) => c.id)).size, 6);
    assert.equal(cases[0]!.role, 'primary diagnostic');
    for (const c of comparators) assert.ok(!cases.some((x) => x.id === c.id), c.key);
    assert.deepEqual(cases[4]!.joint.a, { arch: 'B', d1Target: 0.5, gTarget: 0.5, first: 'D1' });
  });

  test("every comparator's sealed sources exist", () => {
    const { selection, validation } = loadP2();

    assert.equal(comparators.length, 12);
    for (const c of comparators) {
      assert.ok(
        selection.evidence.some((e) => e.label === c.source!.development),
        c.key
      );
      assert.ok(
        validation.rows.some((r) => r.label === c.source!.validation),
        c.key
      );
    }
  });

  test('neighbour families are deterministic and match the instrument sizes', () => {
    const a = familiesOf(cases[0]!.joint);
    const b = familiesOf(cases[0]!.joint);

    assert.deepEqual(a, b);
    assert.deepEqual(
      a.map((f) => [f.name, f.n]),
      [
        ['select1', 128],
        ['select2', 128],
        ['confirm1', 128],
        ['confirm2', 128],
        ['confirm3', 128],
        ['d1', 128],
        ['g', 128],
        ['small', 128],
        ['wide', 128]
      ]
    );
    assert.ok(familiesOf(cases[2]!.joint).some((f) => f.name === 'alloc' && f.n === 32));
  });
});

// ----- synthetic books (the shape of Priority 2's allocator tests) -----

const bt = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bTime[ds.sBarStart[s]! + k]! : ds.sCloseTime[s]!;
const px = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bOpen[ds.sBarStart[s]! + k]! : ds.sClosingPrint[s]!;
const trade = (
  ds: Dataset,
  id: number,
  dS: number,
  e: [number, number],
  fills: { s: number; k: number }[]
): VTrade => ({
  family: 'D1',
  id,
  kind: 'deep',
  dS,
  dT: bt(ds, dS, 0) + 60,
  dPrice: 100,
  eS: e[0],
  eK: e[1],
  eT: bt(ds, e[0], e[1]),
  eRaw: px(ds, e[0], e[1]),
  ePrice: px(ds, e[0], e[1]),
  fills: fills.map((x) => ({
    s: x.s,
    k: x.k,
    t: bt(ds, x.s, x.k),
    raw: px(ds, x.s, x.k),
    price: px(ds, x.s, x.k),
    partial: false,
    f: 1,
    reason: 'trailing stop'
  })),
  open: fills.length === 0,
  vNet: 0,
  vInterest: 0
});
const book = (trades: VTrade[], end: number): VBook => ({
  family: 'D1',
  key: 'D1',
  trades,
  signals: trades.length,
  firstDecision: null,
  endIndex: end,
  standalone: { net: 0, realized: 0, minuteDd: 0, dailyDd: 0 }
});
const A: Allocation = { arch: 'A', d1Target: 1, gTarget: 1, first: 'D1' };
const B50: Allocation = { arch: 'B', d1Target: 0.5, gTarget: 0.5, first: 'D1' };

describe('the comparison logic on synthetic books', () => {
  const data = buildData(
    Array.from({ length: 40 }, (_v, s) => ({ closes: [100 + s, 101 + s, 102 + s, 103 + s, 104 + s] }))
  );
  const full = fixtureDoorOf('full', data.vgtSessions);
  const dev = fixtureDoorOf('dev', data.vgtSessions.slice(0, 21));
  const b = full.ds.dates[20]!;
  const joint = normalize({ d1: briefD1.primary, g: briefG085, a: A });
  const fullBook = book(
    [trade(full.ds, 1, 2, [2, 1], [{ s: 8, k: 2 }]), trade(full.ds, 2, 15, [15, 1], [{ s: 30, k: 3 }])],
    full.ds.sessionCount - 1
  );
  const devBook = book(
    [trade(dev.ds, 1, 2, [2, 1], [{ s: 8, k: 2 }]), trade(dev.ds, 2, 15, [15, 1], [])],
    dev.ds.sessionCount - 1
  );
  const runOf = (door: typeof full, vb: VBook, a: Allocation, periods: number[]) => {
    const result = runPool(door.ds, vb, null, a, { detail: true, periods, endIndex: door.ds.sessionCount - 1 });
    const x = { result, d1: vb, g: null };

    return { x, rec: recordOf(door, { ...joint, a }, x, periods.length ? { boundaries: [b] } : {}) };
  };

  test('development + validation reconcile with the continuous run, and the crossing lot is reported', () => {
    const d = runOf(dev, devBook, A, []);
    const f = runOf(full, fullBook, A, [full.ds.dates.indexOf(b)]);
    const w = windowsOf(viewOf(dev, 'D24', d.x, d.rec, b), viewOf(full, 'FULL', f.x, f.rec, b));

    for (const [k, v] of Object.entries(w.checks)) assert.ok(Math.abs(v) < 0.005, `${k} ${v}`);
    assert.equal(w.validation.crossing.length, 1);
    assert.equal(w.validation.lotsEntered, 0);
    assert.ok(Math.abs(w.validation.pnl - (f.rec.net - d.rec.net)) < 0.011);
    assert.equal(jointId({ ...joint, a: A }), jointId(joint));
  });

  test('B 50/50 against A on the same trades is pure position-size scaling', () => {
    const i = [full.ds.dates.indexOf(b)];
    const xa = runOf(full, fullBook, A, i).x.result;
    const xb = runOf(full, fullBook, B50, i).x.result;
    const m = matchLots(xa, xb);
    const s = scalingOf(m, xa, xb);

    assert.equal(s.resizedLots, 2);
    assert.equal(s.proportionalLots, 2);
    assert.ok(Math.abs(s.pathDelta) < 0.02, String(s.pathDelta));
    assert.ok(Math.abs(xb.net - xa.net / 2) < 0.02);
  });
});

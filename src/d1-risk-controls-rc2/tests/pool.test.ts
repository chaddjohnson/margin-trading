// The pooled evaluation with RC 2 controls on a synthetic two-symbol door: legacy controls equal Priority 3's `run` /
// `evaluate` exactly; next-session controls equal RC 1's runWithControls / evaluateWithControls exactly (books with
// their logs, funding, lots, marks, drawdowns, record, identity, key); entry-day exits flow through Priority 3's
// unchanged pool — a funded lot entering and exiting in one session (and in one minute), funded fills = virtual fills,
// one slot, Σ lots = net — and the freed slot can fund a later decision. No market data is read.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MarketSession } from '#types';
import { fixtureDoorOf } from '../../vg-d1-growth-joint/data.ts';
import { type EvalOptions, evaluate, run } from '../../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../../vg-d1-growth-joint/space.ts';
import { placeholder } from '../../vg-lifecycle-matched-optimization/config.ts';
import { evaluateWithControls, runWithControls } from '../../d1-risk-controls/run.ts';
import type { RiskConfig } from '../../d1-risk-controls/config.ts';
import { type Bar, sessionOf, weekdays } from '../../d1-risk-controls/tests/fixtures.ts';
import { type Day, crash, grid, pathOf, whipsaw } from '../../d1-risk-controls/tests/scenarios.ts';
import type { RiskConfig2 } from '../config.ts';
import { evaluateWithControls2, runWithControls2 } from '../run.ts';

const flat = (p: number) => [p, p, p];
const flat3 = (p: number): Bar[] => [{ o: p, c: p }, { o: p, c: p }, { o: p, c: p }];
// GDX: RC 1's crash with the dip-buy session extended after the fill (a same-session fall through an 8% stop);
// VGT: the whipsaw. Both dip-buy at the same instant on Friday 2021-03-05 (D1·GDX first).
const gdxSameDay = (): MarketSession[] => {
  const days: Day[] = crash.map((d, i) => (i === 4 ? { open: 95, closes: [95, 89.5, 89, 90, 90.5, 85, 82, 81] } : d));

  return pathOf(days);
};
// GDX whose fill minute itself trades through L (a low of 82 in the minute that opens at 90)
const gdxFillMinute = (): MarketSession[] => {
  const dates = weekdays(20);
  const bars: Bar[][] = [
    flat3(100),
    flat3(100),
    flat3(100),
    flat3(100),
    [{ o: 95, c: 95 }, { o: 95, c: 89.5 }, { o: 89.5, c: 89 }, { o: 89, c: 90 }, { o: 90, h: 90.5, l: 82, c: 84 }, { o: 84, c: 85 }],
    ...Array.from({ length: 15 }, () => flat3(85))
  ];

  return bars.map((b, i) => sessionOf(dates[i]!, b));
};
const vgt = () => pathOf([...whipsaw, flat(89), flat(89), flat(90)] as Day[]);
let doors = 0;
const doorOf = (gdx: MarketSession[]) => fixtureDoorOf(`risk-controls-rc2-${++doors}`, { GDX: gdx, VGT: vgt() });
const quad = (): Quad => ({ d1: { GDX: grid(), VGT: grid() }, g: { GDX: placeholder, VGT: placeholder }, first: 'D1' });
const V: EvalOptions = { enabled: { 'G:GDX': false } };
const ed: RiskConfig2 = {
  version: 2,
  books: { 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80, activation: 'entry-day' } } }
};
const ns: RiskConfig = {
  version: 1,
  books: {
    'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 }, hold: { mode: 'disabled' } },
    'D1:VGT': { declineGate: { mode: 'on', losses: 1, recoveryTenths: 1000, maxBlockSessions: 2 } }
  }
};

describe('compatibility in the pool', () => {
  it('legacy controls = Priority 3 (books, funding, lots, marks, drawdowns, record)', () => {
    const d = doorOf(gdxSameDay());
    const p3 = run(d, quad(), V, true, true);
    const x = runWithControls2(d, quad(), null, V, true, true, { cache: false });

    x.books.forEach((b, i) => {
      const { rc: _rc, ...rest } = b as unknown as { rc: unknown };

      assert.deepEqual(rest, p3.books[i]);
    });
    assert.deepEqual(x.result, p3.result);
    assert.deepEqual(evaluateWithControls2(doorOf(gdxSameDay()), quad(), null, V, { cache: false }).rec, evaluate(doorOf(gdxSameDay()), quad(), V));
  });

  it('next-session controls = RC 1 (books with their logs, the result, the record, identity and key)', () => {
    const d = doorOf(gdxSameDay());

    assert.deepEqual(runWithControls2(d, quad(), ns, V, true, true, { cache: false }), runWithControls(d, quad(), ns, V, true, true, { cache: false }));

    const a = evaluateWithControls2(d, quad(), ns, V, { cache: false });
    const b = evaluateWithControls(d, quad(), ns, V, { cache: false });

    assert.deepEqual(a.rec, b.rec);
    assert.deepEqual([a.risk.id, a.risk.key, a.risk.books], [b.risk.id, b.risk.key, b.risk.books]);
  });
});

describe('entry-day exits through the pool', () => {
  const invariants = (x: ReturnType<typeof runWithControls2>) => {
    const lots = [...x.result.lots].sort((a, b) => a.entryT - b.entryT);

    for (let i = 1; i < lots.length; i++)
      assert.ok(!lots[i - 1]!.open && lots[i]!.entryT >= lots[i - 1]!.fills.at(-1)!.t, `lot ${lots[i]!.id} overlaps`);
    for (const l of x.result.lots) {
      const v = x.books.find((b) => b.book === l.book)!.trades.find((t) => t.id === l.trade.id)!;

      assert.deepEqual(
        l.fills.map((f) => [f.s, f.k, f.t, f.raw, f.price, f.reason]),
        v.fills.map((f) => [f.s, f.k, f.t, f.raw, f.price, f.reason])
      );
    }
    assert.ok(Math.abs(x.result.lots.reduce((a, l) => a + l.net, 0) - x.result.net) < 1e-6);
  };

  it('a funded lot enters and exits in one session; one slot; funded = virtual; Σ lots = net; the slot is freed', () => {
    const x = runWithControls2(doorOf(gdxSameDay()), quad(), ed, V, true, false, { cache: false });
    const first = x.result.lots.find((l) => l.book === 'D1:GDX')!;

    invariants(x);
    assert.equal(first.fills[0]!.s, first.entryS, 'exit in the entry session');
    assert.equal(first.fills[0]!.reason, 'protective stop');
    assert.ok(first.fills[0]!.t > first.entryT);
    assert.equal(first.interest, 0);
    // the D1·VGT decision at the same instant was refused (slot occupied): the shadow lifecycle is unchanged
    assert.equal(x.result.funding.find((f) => f.book === 'D1:VGT')!.outcome, 'refused');
  });

  it('a fill-minute exit (entry and exit in one minute) is handled by the unchanged pool', () => {
    const x = runWithControls2(doorOf(gdxFillMinute()), quad(), ed, V, true, false, { cache: false });
    const l = x.result.lots.find((y) => y.book === 'D1:GDX')!;

    invariants(x);
    assert.deepEqual([l.fills[0]!.s === l.entryS, l.fills[0]!.t === l.entryT, l.fills[0]!.raw], [true, true, 90 * 0.92]);
    assert.ok(!l.open && l.net < -8_000 && l.net > -8_200, `${l.net.toFixed(2)}`);
  });

  it('is deterministic; the record carries the rc2 identity and key', () => {
    const d = doorOf(gdxSameDay());
    const a = evaluateWithControls2(d, quad(), ed, V, { cache: false });
    const b = evaluateWithControls2(d, quad(), JSON.parse(JSON.stringify(ed)) as RiskConfig2, V, { cache: false });

    assert.equal(JSON.stringify(a), JSON.stringify(b));
    assert.match(a.rec.id, /^rc2-/);
    assert.ok(a.risk.key.includes('|rc2:'));
    assert.equal(a.risk.books['D1:GDX']!.summary.entryDayExits! >= 1, true);
  });
});

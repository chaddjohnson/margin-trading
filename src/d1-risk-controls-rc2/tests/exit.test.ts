// The entry-day trigger (SPECIFICATION_RC2.md §2) on synthetic sessions: which observations are eligible after each
// kind of fill (a minute's opening print, the session's first minute after an overnight carry, the last minute, a
// delayed fill after missing minutes, the closing print), the fill conventions (minute open through L; the low → L
// under `stop`, the next open / the closing print / the trigger minute's close under `next-open`), the inclusive
// boundary, and causality (pre-fill minutes and minutes after the trigger never change the decision). No market data.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type Bar, datasetOf, sessionOf } from '../../d1-risk-controls/tests/fixtures.ts';
import { entryDayTrigger } from '../exit.ts';

const one = (bars: Bar[], closingPrint?: number | null) =>
  datasetOf([
    sessionOf('2021-03-04', [{ o: 100, c: 100 }]),
    sessionOf('2021-03-05', bars, closingPrint === undefined ? {} : { closingPrint })
  ]);
const S = 1; // the session under test
const L = 92; // the protective level of a fill at 100 with an 8% distance

describe('eligible observations after the fill', () => {
  it('a fill at a minute’s opening print: that minute’s low (a later trade) triggers at L', () => {
    const ds = one([{ o: 101, c: 100 }, { o: 100, h: 100.5, l: 91, c: 99 }, { o: 99, c: 99 }]);
    const p = entryDayTrigger(ds, S, 1, L, 'stop')!;

    assert.deepEqual([p.kind, p.triggerK, p.barIndex, p.price, p.execution], ['low', 1, 1, L, 'stop level']);
  });

  it('minutes before the fill minute are never read, whatever their lows', () => {
    const ds = one([{ o: 101, l: 50, c: 100 }, { o: 100, c: 99 }, { o: 99, l: 93, c: 98 }]);

    assert.equal(entryDayTrigger(ds, S, 1, L, 'stop'), undefined);
  });

  it('a later minute opening at or below L fills at that open (below L: not a loss cap)', () => {
    const ds = one([{ o: 100, c: 97 }, { o: 97, c: 95 }, { o: 88, c: 89 }, { o: 89, c: 90 }]);
    const p = entryDayTrigger(ds, S, 0, L, 'stop')!;

    assert.deepEqual([p.kind, p.barIndex, p.price, p.execution], ['open', 2, 88, 'minute open through stop']);
    assert.ok(p.price < L);
  });

  it('the first minute of the session (an order carried overnight fills at the opening trade)', () => {
    const ds = one([{ o: 100, l: 92, c: 96 }, { o: 96, c: 95 }]);

    assert.equal(entryDayTrigger(ds, S, 0, L, 'stop')!.barIndex, 0);
  });

  it('a fill in the last minute: only that minute’s low; under next-open it fills at the closing print', () => {
    const bars: Bar[] = [{ o: 101, c: 101 }, { o: 100, l: 91, c: 93 }];
    const p = entryDayTrigger(one(bars, 93.5), S, 1, L, 'next-open')!;

    assert.deepEqual([p.kind, p.triggerK, p.barIndex, p.price, p.execution], ['low', 1, 2, 93.5, 'closing print']);

    const q = entryDayTrigger(one(bars, null), S, 1, L, 'next-open')!;

    assert.deepEqual([q.barIndex, q.price, q.execution], [1, 93, 'trigger minute close']);
  });

  it('a delayed fill after missing minutes: observations start at the fill minute, the gap is not read', () => {
    const ds = one([
      { o: 101, c: 100, slot: 0 },
      { o: 100, l: 80, c: 100, slot: 1 }, // before the fill
      { o: 100, c: 99, slot: 7 }, // the fill minute (minutes 2–6 have no trades)
      { o: 99, l: 91.5, c: 95, slot: 8 }
    ]);
    const p = entryDayTrigger(ds, S, 2, L, 'next-open')!;

    // the trigger minute is the last one: under next-open the sale takes the closing print (= the last close, 95)
    assert.deepEqual([p.triggerK, p.barIndex, p.price, p.execution], [3, 4, 95, 'closing print']);
    assert.deepEqual(
      [entryDayTrigger(ds, S, 2, L, 'stop')!.barIndex, entryDayTrigger(ds, S, 2, L, 'stop')!.price],
      [3, L]
    );
  });

  it('a closing-print fill: no observation follows in its session', () => {
    const ds = one([{ o: 100, l: 50, c: 100 }]);

    assert.equal(entryDayTrigger(ds, S, ds.sBarCount[S]!, L, 'stop'), undefined);
  });

  it('is inclusive at L and silent a hair above it', () => {
    assert.equal(entryDayTrigger(one([{ o: 100, l: L, c: 99 }]), S, 0, L, 'stop')!.price, L);
    assert.equal(entryDayTrigger(one([{ o: 100, l: L + 1e-9, c: 99 }]), S, 0, L, 'stop'), undefined);
  });
});

describe('causality', () => {
  it('minutes after the trigger minute never change the decision (stop fill)', () => {
    const head: Bar[] = [{ o: 100, c: 98 }, { o: 98, l: 90, c: 91 }];
    const a = entryDayTrigger(one([...head, { o: 91, c: 120 }]), S, 0, L, 'stop');
    const b = entryDayTrigger(one([...head, { o: 50, c: 40 }, { o: 40, c: 30 }]), S, 0, L, 'stop');

    assert.deepEqual(a, b);
  });

  it('a session with no post-fill observation at or below L gives no trigger', () => {
    assert.equal(entryDayTrigger(one([{ o: 100, l: 95, c: 96 }, { o: 96, l: 92.01, c: 93 }]), S, 0, L, 'stop'), undefined);
  });
});

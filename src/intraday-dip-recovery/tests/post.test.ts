// The window, slice, sequential, ledger and concentration arithmetic on synthetic sessions spanning 2024–2026 (no
// market data is read): continuous runs, exact attribution across boundaries, reset drawdowns.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupMarketSessions } from '#lib';
import type { Tick } from '#types';
import { Rng } from '../../optimizer/rng.ts';
import { fixtureDoor } from '../data.ts';
import { viewOf } from '../evaluate.ts';
import { concentrationOf, ledgerOf, sequentialOf, sliceOf, windowsOf, yearTableOf } from '../post.ts';
import { candidateOf, zeroGrid } from '../space.ts';

const dates = [
  '2024-12-23', '2024-12-26', '2024-12-27', '2024-12-30', '2024-12-31',
  '2025-01-02', '2025-01-03', '2025-01-06', '2025-06-02', '2025-06-03', '2025-12-29', '2025-12-30', '2025-12-31',
  '2026-01-02', '2026-01-05', '2026-01-06'
];

const ticks = (): Tick[] => {
  const rng = Rng.from('dip-post-tests');
  const out: Tick[] = [];
  let price = 100;

  for (const date of dates) {
    const dst = date >= '2025-03-09' && date < '2025-11-02';
    const open = Date.parse(`${date}T09:30:00Z`) / 1000 + (dst ? 4 : 5) * 3600;

    for (let m = 0; m < 390; m++) {
      const shock = rng.next() < 0.004 ? -0.015 : 0;
      const o = price;
      const c = price * (1 + (rng.next() - 0.5) * 0.004 + shock);
      const h = Math.max(o, c) * (1 + rng.next() * 0.001);
      const l = Math.min(o, c) * (1 - rng.next() * 0.001);

      price = c;
      if (m > 0 && rng.next() < 0.1) continue;
      out.push({ time: open + m * 60, open: o, high: h, low: l, close: c, volume: 2000, trades: NaN });
    }

    out.push({ time: open + 390 * 60, open: price, high: price, low: price, close: price, volume: 9000, trades: NaN });
  }

  return out;
};

const view = viewOf(fixtureDoor(groupMarketSessions(ticks())));
const grid = candidateOf('F1', { ...zeroGrid(), B: 1, X: 40, Y: 10, S: 40, L: 20 }).grid;
const spec = { ruleSet: 'F1' as const, grid };

test('windows attribute the continuous run exactly; years sum to the whole', () => {
  const w = windowsOf(view, spec);

  assert.ok(w.result.lots.length > 0, 'the fixture trades');
  assert.ok(Math.abs(w.development + w.validation - w.full) < 1e-9);
  assert.ok(Math.abs(w.y2025 + w.y2026 - w.validation) < 1e-9);
  assert.ok(Math.abs(w.years.reduce((t, y) => t + y.net, 0) - w.full) < 1e-9);
  assert.ok(w.validationResetDd.maximum >= 0 && w.validationResetDd.maximum <= w.wholeRunDd.maximum + 1e-9);
  assert.equal(ledgerOf(view, w.result).length, w.result.lots.length);
  assert.equal(yearTableOf(view, w.result).reduce((t, y) => t + y.trades, 0), w.result.lots.length);
});

test('a slice is the marked change after the cutoff close; the sequential chain adds slices and charges switches', () => {
  const a = sliceOf(view, spec, '2024-12-31', '2025-06-03');
  const b = sliceOf(view, { ruleSet: 'F1', grid: candidateOf('F1', { ...grid, S: 30 }).grid }, '2025-06-03', '2026-01-06');
  const cut = (d: string) => view.door.sessions.find((s) => s.date === d)!.closeTime;
  const seq = sequentialOf([
    { cutoff: 'A', id: 'x', slice: a, cutCloseTime: cut('2024-12-31') },
    { cutoff: 'B', id: 'y', slice: b, cutCloseTime: cut('2025-06-03') }
  ]);
  const charge = (a.openAtEnd ? 50 : 0) + (b.openAtCutoff ? 50 : 0);

  assert.ok(Math.abs(a.net - (a.markAtEnd - a.markAtCutoff)) < 1e-9);
  assert.ok(Math.abs(seq.net - (a.net + b.net - charge)) < 1e-9);
  assert.equal(seq.charges, charge);
  assert.ok(seq.minuteDd >= 0);

  const flat = sequentialOf([{ cutoff: 'A', id: null, slice: null, cutCloseTime: 0 }]);

  assert.equal(flat.net, 0);
});

test('concentration counts entry months and blacks out the top month without changing anything else', () => {
  const r = windowsOf(view, spec).result;
  const c = concentrationOf(view, spec, r);

  assert.ok(c.episodes >= 1);
  assert.ok(c.blackout !== null);
  assert.ok((c.blackout as { lots: number }).lots <= r.lots.length + 1);
});

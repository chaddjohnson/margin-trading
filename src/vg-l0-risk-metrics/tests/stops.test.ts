// Synthetic cases of the stop-state reconstruction (stops.ts; PROTOCOL.md §6.5): a hand-built minute dataset and lot,
// with every expected level and value computed by hand. The historical gate G-S (every real stop exit) is separate.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Door } from '../../vg-d1-growth-joint/data.ts';
import type { Lot } from '../../vg-d1-growth-joint/pool.ts';
import { type BookParams, postEntryHigh, stopStateAt } from '../stops.ts';

const DAY = 86_400;
const T0 = Date.parse('2020-01-06T00:00:00Z') / 1000; // Monday
const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

// sessions: each an array of minute bars [open, high, low, close]; consecutive weekdays from T0
const doorOf = (sessions: [number, number, number, number][][]): Door => {
  const n = sessions.length;
  const bars = sessions.flat();
  const f = (len: number) => new Float64Array(len);
  const ds = {
    sessionCount: n,
    dates: [] as string[],
    sTime: f(n),
    sCloseTime: f(n),
    sOpen: f(n),
    sHigh: f(n),
    sLow: f(n),
    sClose: f(n),
    sClosingPrint: f(n),
    sBarStart: new Int32Array(n),
    sBarCount: new Int32Array(n),
    bTime: f(bars.length),
    bOpen: f(bars.length),
    bHigh: f(bars.length),
    bLow: f(bars.length),
    bClose: f(bars.length)
  };
  let k = 0;
  let day = 0;

  sessions.forEach((s, i) => {
    while ([0, 6].includes(new Date((T0 + day * DAY) * 1000).getUTCDay())) day++;
    ds.sTime[i] = T0 + day * DAY;
    ds.dates.push(new Date(ds.sTime[i]! * 1000).toISOString().slice(0, 10));
    ds.sCloseTime[i] = ds.sTime[i]! + 21 * 3600;
    ds.sBarStart[i] = k;
    ds.sBarCount[i] = s.length;
    ds.sOpen[i] = s[0]![0];
    ds.sHigh[i] = Math.max(...s.map((b) => b[1]));
    ds.sLow[i] = Math.min(...s.map((b) => b[2]));
    ds.sClose[i] = s.at(-1)![3];
    ds.sClosingPrint[i] = s.at(-1)![3];
    s.forEach((b, j) => {
      ds.bTime[k] = ds.sTime[i]! + 14.5 * 3600 + j * 60;
      [ds.bOpen[k], ds.bHigh[k], ds.bLow[k], ds.bClose[k]] = b;
      k++;
    });
    day++;
  });
  return { name: 'fixture:stops', sym: { VGT: { ds } } as unknown as Door['sym'], dates: ds.dates, from: ds.dates[0]!, to: ds.dates.at(-1)!, sessions: n } as Door;
};

const lotOf = (door: Door, eS: number, eK: number, raw: number, cost = 0.0005): Lot =>
  ({
    id: 1,
    book: 'D1:VGT',
    symbol: 'VGT',
    shares0: 100_000 / (raw * (1 + cost)),
    principal0: 100_000,
    entryS: eS,
    entryRaw: raw,
    entryTs: door.sym.VGT.ds.sTime[eS]!,
    trade: { eK },
    fills: []
  }) as unknown as Lot;

const d1 = (trailing: number, protective: number | null = null): BookParams => ({
  book: 'D1:VGT',
  trailing,
  hold: { mode: 'calendar', days: 15 },
  protective: protective === null ? null : { fraction: protective, activation: 'next-session' },
  initialStop: null,
  retention: null
});

// session 0: a pre-fill spike to 130 (minute 0), the fill at minute 1's open (100), highs 101; session 1 highs 120;
// session 2 closes 116
const door = doorOf([
  [
    [129, 130, 128, 129],
    [100, 101, 99, 100.5],
    [100.5, 101, 100, 100.8]
  ],
  [
    [101, 110, 101, 109],
    [109, 120, 108, 119]
  ],
  [
    [118, 118, 115, 116],
    [116, 117, 115.5, 116]
  ]
]);

test('the post-entry high ignores minutes before the fill (no pre-fill information) and rises with later sessions', () => {
  const lot = lotOf(door, 0, 1, 100);

  close(postEntryHigh(door, lot, 0), 101); // max(fill 100, close 100.8, highs of minutes 1–2 = 101); not the 130 spike
  close(postEntryHigh(door, lot, 1), 120);
  close(postEntryHigh(door, lot, 2), 120);
});

test('an armed profit-conditional trailing stop, its stressed protected value and the conservative value', () => {
  const lot = lotOf(door, 0, 1, 100);
  const st = stopStateAt(door, lot, 2, d1(0.05), 0.11, 5);
  const q = 100_000 / 100.05;
  const next = '2020-01-09'; // the session after Wednesday 2020-01-08
  const iNext = (100_000 * 0.11 * (Date.parse(`${next}T00:00:00Z`) / 1000 - door.sym.VGT.ds.sTime[0]!)) / (365 * DAY);

  assert.equal(st.nextSession, next);
  close(st.trailingLevel, 114); // 120 × 0.95
  assert.equal(st.trailingArmed, true); // q × 114 − 100,000 − interest ≈ +13,9xx > 0
  close(st.valueAtStop!, q * 114 * 0.9995 - 100_000 - iNext);
  close(st.valueStressed10!, q * 114 * 0.9 * 0.9995 - 100_000 - iNext); // the 10% gap below the level
  close(st.conservativeValue, Math.min(st.liquidation, st.valueStressed10!));
  close(st.profitAtRisk, Math.max(0, st.liquidation) - Math.max(0, st.valueStressed10!));
});

test('a losing lot: the profit-conditional trailing stop is NOT armed and nothing is credited', () => {
  // fill at 100; later highs 101 → level 95.95 ⇒ q × 95.95 < 100,000: not armed
  const d = doorOf([
    [[100, 100.5, 99.5, 100]],
    [[99, 101, 92, 93]],
    [[93, 94, 90, 91]]
  ]);
  const lot = lotOf(d, 0, 0, 100);
  const st = stopStateAt(d, lot, 2, d1(0.05), 0.11, 5);

  assert.equal(st.trailingArmed, false);
  assert.equal(st.effectiveLevel, null);
  assert.ok(st.liquidation < 0);
  close(st.conservativeValue, st.liquidation); // min(0, λ): the open loss counts, no protection is invented
  assert.equal(st.protectedProfit, 0);
});

test('an unconditional protective stop protects a losing lot; a stop above the close fills from the close', () => {
  const d = doorOf([
    [[100, 100.5, 99.5, 100]],
    [[99, 101, 92, 93]],
    [[93, 94, 90, 91]]
  ]);
  const lot = lotOf(d, 0, 0, 100);
  const st = stopStateAt(d, lot, 2, d1(0.05, 0.08), 0.11, 5);
  const q = 100_000 / 100.05;
  const iNext = (100_000 * 0.11 * (Date.parse(`${st.nextSession}T00:00:00Z`) / 1000 - d.sym.VGT.ds.sTime[0]!)) / (365 * DAY);

  close(st.protectiveLevel!, 92);
  close(st.effectiveLevel!, 92);
  // the level 92 is above the 91 close: the stressed fill is from the close, 91 × 0.9
  close(st.valueStressed10!, q * 91 * 0.9 * 0.9995 - 100_000 - iNext);
  close(st.conservativeValue, Math.min(st.liquidation, st.valueStressed10!));
});

test('trend retention: an armed trailing event sells only the retention fraction; the remainder gets no credit', () => {
  const lot = lotOf(door, 0, 1, 100);
  const p = { ...d1(0.05), book: 'G:VGT', retention: { sellFraction: 0.67 } };
  const st = stopStateAt(door, lot, 2, p, 0.11, 5);
  const q = 100_000 / 100.05;
  const iNext = (100_000 * 0.11 * (Date.parse(`${st.nextSession}T00:00:00Z`) / 1000 - door.sym.VGT.ds.sTime[0]!)) / (365 * DAY);
  const openLiq = q * 116 * 0.9995 - 100_000 - (100_000 * 0.11 * (door.sym.VGT.ds.sTime[2]! - door.sym.VGT.ds.sTime[0]!)) / (365 * DAY);

  assert.equal(st.retentionSellFraction, 0.67);
  close(st.valueStressed10!, 0.67 * (q * 114 * 0.9 * 0.9995 - 100_000 - iNext) + 0.33 * Math.min(0, openLiq));
});

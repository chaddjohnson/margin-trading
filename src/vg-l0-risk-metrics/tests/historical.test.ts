// Historical regression cases on the development doors (PROTOCOL.md §8 G1; the brief's Stage 1.6): the frozen New L0 on
// D24 — exact reconciliation, the exact attribution of its maximum drawdown, interest over a weekend and a holiday, and
// the stop-state reconstruction's causality (the state at a cutoff is identical on a shorter and a longer door).
// Reads D21 and D24 (development only; no record is written).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openPrefixDoor } from '../../vg-d1-growth-joint/data.ts';
import { incumbents } from '../../vg-l0-full-joint/nl0.ts';
import { reconcile, replay, toLedger } from '../engine.ts';
import { attributeDrawdown, bankedDrawdown, markedDrawdown, portfolioPath, tradeRisk } from '../metrics.ts';
import { bookParamsOf, stopStateAt } from '../stops.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const subject = () => ({ quad: incumbents().NL0.quad, controls: null });

test('New L0 on D24: reconciled ledger, exact drawdown attribution, principal and banked metrics', async () => {
  const door = await openPrefixDoor('D24', 'vg-l0-risk-metrics historical test (no record)', true);
  const r = replay(door, subject());
  const L = toLedger(r);
  const rc = reconcile(r, L);
  const pts = portfolioPath(L);
  const dd = markedDrawdown(pts);
  const a = attributeDrawdown(L, dd.peakT, dd.troughT);

  assert.equal(r2(r.rec.net), 382721.46);
  assert.equal(r2(dd.max), 19459.83);
  assert.equal(rc.lots, 34);
  assert.equal(dd.peakDate, '2023-01-25');
  assert.equal(dd.troughDate, '2023-02-24');
  assert.equal(r2(a.profitGiveback), 9124.1);
  assert.equal(r2(a.principalLoss), 10335.73);
  assert.ok(Math.abs(a.residual) < 1e-6);
  assert.equal(r2(Math.max(...L.lots.map((l) => tradeRisk(l, L.endT).principalLossLiq))), 8092.81);
  assert.equal(r2(bankedDrawdown(pts).max), 10335.73);

  // interest accrues calendar days: the first Monday mark of a lot held over a weekend carries Friday + 3 days
  const ds = door.sym.VGT.ds;
  let weekend = 0;
  let holiday = 0;

  for (const lot of L.lots) {
    const closes = lot.marks.filter((m) => m.t === ds.sCloseTime[door.dates.indexOf(m.date)]);

    for (let i = 1; i < closes.length; i++) {
      const a0 = closes[i - 1]!;
      const b0 = closes[i]!;

      if (a0.principal !== b0.principal) continue;

      const days = (Date.parse(`${b0.date}T00:00:00Z`) - Date.parse(`${a0.date}T00:00:00Z`)) / 86_400_000;
      const expected = (b0.principal * 0.11 * days) / 365;

      assert.ok(Math.abs(b0.interest - a0.interest - expected) < 1e-6, `${a0.date} → ${b0.date}`);
      if (days === 3) weekend++;
      if (days === 4) holiday++;
    }
  }
  assert.ok(weekend > 50 && holiday > 0, `weekends ${weekend}, long weekends ${holiday}`);
});

test('stop-state causality: the state at the C21 close is identical on D21 and on D24 (no later bar is read)', async () => {
  const d21 = await openPrefixDoor('D21', 'vg-l0-risk-metrics historical test (no record)', true);
  const d24 = await openPrefixDoor('D24', 'vg-l0-risk-metrics historical test (no record)', true);
  const at = (door: typeof d21) => {
    const r = replay(door, subject());
    const c = door.dates.indexOf('2021-12-31');
    const lot = r.result.lots.find((l) => l.entryS <= c && (l.open || l.fills.at(-1)!.s > c))!;

    return stopStateAt(door, lot, c, bookParamsOf(subject(), lot.book), 0.11, 5);
  };
  const a = at(d21);
  const b = at(d24);

  assert.deepEqual(a, b);
  assert.equal(a.book, 'D1:GDX');
  assert.equal(a.trailingArmed, true);
});

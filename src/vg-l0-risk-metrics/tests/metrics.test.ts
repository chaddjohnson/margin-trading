// Synthetic, hand-computed cases of the metric layer (PROTOCOL.md §8 gate G1; the brief's Stage 1.6). Every expected
// number below is computed by hand in the comment beside it, independently of the code under test.
//   node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-l0-risk-metrics/tests/*.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Ledger, LotLedger, LotMark } from '../ledger.ts';
import {
  attributeDrawdown,
  bankedDrawdown,
  floorShortfall,
  losingStreaks,
  markedDrawdown,
  openLotAt,
  portfolioPath,
  realizedDrawdown,
  realizedEpisodes,
  strictDrawdown,
  tail,
  tradeRisk
} from '../metrics.ts';
import { evaluateAccount, firstDeficiencyShock, linearDeficiencyShock, scenarioAccount } from '../margin.ts';
import { windowMetrics } from '../bundle.ts';

const DAY = 86_400;
const T0 = Date.parse('2020-01-06T00:00:00Z') / 1000; // a Monday
const T = (day: number) => T0 + day * DAY + 15 * 3600; // a mark during the session of `day`
const D = (day: number) => new Date((T0 + day * DAY) * 1000).toISOString().slice(0, 10);
const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

// A hand-built lot: entry at `raw` on `entryDay`, marks at the given (day, price), optional partial sale, optional exit.
const lotOf = (o: {
  id: number;
  entryDay: number;
  raw: number;
  path: [number, number][];
  exit?: [number, number, string?];
  partial?: [number, number, number]; // day, raw price, fraction of current shares
  cost?: number; // per side, fraction
  rate?: number;
  budget?: number;
  book?: string;
}): LotLedger => {
  const c = o.cost ?? 0;
  const r = o.rate ?? 0;
  const P = o.budget ?? 100_000;
  const entryPrice = o.raw * (1 + c);
  let q = P / entryPrice;
  let p = P;
  let realized = 0;
  const q0 = q;
  const marks: LotMark[] = [];
  const fills: LotLedger['fills'] = [];
  const yrs = (day: number) => (day - o.entryDay) / 365;
  const events = [...o.path.map(([d, x]) => ({ kind: 'mark' as const, d, x, t: T(d) })), ...(o.partial ? [{ kind: 'partial' as const, d: o.partial[0], x: o.partial[1], t: T(o.partial[0]) - 1800 }] : [])].sort((a, b) => a.t - b.t);

  for (const e of events) {
    if (e.kind === 'partial') {
      const f = o.partial![2];
      const sold = q * f;
      const repaid = p * f;
      const interest = repaid * r * yrs(e.d);
      const proceeds = sold * e.x * (1 - c);

      fills.push({ t: e.t, date: D(e.d), raw: e.x, price: e.x * (1 - c), partial: true, shares: sold, principal: repaid, interest, proceeds, net: proceeds - repaid - interest, reason: 'partial' });
      realized += proceeds - repaid - interest;
      q -= sold;
      p -= repaid;
      continue;
    }

    const interest = p * r * yrs(e.d);
    const pnl = realized + q * e.x - p - interest;

    marks.push({ t: e.t, date: D(e.d), price: e.x, shares: q, principal: p, interest, realized, pnl, liq: pnl - q * e.x * c });
  }

  let net = realized + (marks.at(-1)?.pnl ?? 0) - realized;

  if (o.exit) {
    const [d, x, reason] = o.exit;
    const interest = p * r * yrs(d);
    const proceeds = q * x * (1 - c);

    fills.push({ t: T(d) + 3600, date: D(d), raw: x, price: x * (1 - c), partial: false, shares: q, principal: p, interest, proceeds, net: proceeds - p - interest, reason: reason ?? 'exit' });
    net = realized + proceeds - p - interest;
  }

  return {
    id: o.id,
    book: o.book ?? 'D1:VGT',
    symbol: 'VGT',
    kind: 'deep',
    principal0: P,
    shares0: q0,
    entryT: T(o.entryDay) - 60,
    entryDate: D(o.entryDay),
    entryRaw: o.raw,
    entryPrice,
    fills,
    open: !o.exit,
    net,
    interest: 0,
    costs: 0,
    canonicalMae: null,
    marks
  };
};

const ledgerOf = (lots: LotLedger[], cost = 0, rate = 0): Ledger => {
  const last = Math.max(...lots.flatMap((l) => [...l.marks.map((m) => m.t), ...l.fills.map((f) => f.t)]));

  return { lots, startT: T0, endT: last, endDate: new Date(last * 1000).toISOString().slice(0, 10), costBps: cost * 10_000, rate, budget: 100_000 };
};

test('$100k → $250k → $210k: $40k peak giveback, $110k realized gain, $0 principal loss', () => {
  const lot = lotOf({ id: 1, entryDay: 0, raw: 100, path: [[0, 100], [1, 250], [2, 210]], exit: [2, 210] });
  const L = ledgerOf([lot]);
  const tr = tradeRisk(lot, L.endT);
  const pts = portfolioPath(L);
  const dd = markedDrawdown(pts);
  const a = attributeDrawdown(L, dd.peakT, dd.troughT);

  close(tr.net, 110_000); // 1,000 shares × 210 − 100,000
  close(tr.peakProfit, 150_000); // 1,000 × 250 − 100,000
  close(tr.maxGivebackAboveBreakeven, 40_000);
  close(tr.givebackToExit!, 40_000);
  assert.equal(tr.principalLossLiq, 0);
  assert.equal(tr.principalLossMarked, 0);
  close(dd.max, 40_000);
  close(a.profitGiveback, 40_000);
  close(a.principalLoss, 0);
  assert.equal(bankedDrawdown(pts).max, 0); // never below the banked high-water mark (0, then 110,000 at the exit)
  assert.equal(floorShortfall(pts).shortfall, 0);
  assert.equal(realizedDrawdown(pts).max, 0);
});

test('the same path after 5 bps per side and 11% interest (exact ledger arithmetic)', () => {
  const lot = lotOf({ id: 1, entryDay: 0, raw: 100, path: [[0, 100], [10, 250], [20, 210]], exit: [20, 210], cost: 0.0005, rate: 0.11 });
  const q = 100_000 / 100.05;
  const interest = (100_000 * 0.11 * 20) / 365;

  close(lot.net, q * 210 * 0.9995 - 100_000 - interest);
  const tr = tradeRisk(lot, lot.fills.at(-1)!.t);
  // the entry mark at 100: π = q·100 − 100,000 = −49.975…; λ subtracts q·100·0.0005 more
  close(tr.principalLossMarked, 100_000 - q * 100);
  close(tr.principalLossLiq, 100_000 - q * 100 * 0.9995);
  close(tr.entryCost, q * 0.05);
});

test('$100k → $60k: $40k principal loss and $40k equity drawdown (one lot)', () => {
  const lot = lotOf({ id: 1, entryDay: 0, raw: 100, path: [[0, 100], [1, 80], [2, 60]], exit: [2, 60] });
  const L = ledgerOf([lot]);
  const pts = portfolioPath(L);
  const dd = markedDrawdown(pts);
  const a = attributeDrawdown(L, dd.peakT, dd.troughT);

  close(tradeRisk(lot, L.endT).principalLossLiq, 40_000);
  close(tradeRisk(lot, L.endT).realizedPrincipalLoss!, 40_000);
  close(dd.max, 40_000);
  close(a.principalLoss, 40_000);
  close(a.profitGiveback, 0);
  close(floorShortfall(pts).shortfall, 40_000);
  close(bankedDrawdown(pts).max, 40_000);
  close(realizedDrawdown(pts).max, 40_000);
});

test('a winner gives back its profit, then falls below break-even: the two parts stay separate', () => {
  // 100 → 130 (+30k) → 90 (−10k), exit at 90
  const lot = lotOf({ id: 1, entryDay: 0, raw: 100, path: [[0, 100], [1, 130], [2, 110], [3, 90]], exit: [3, 90] });
  const L = ledgerOf([lot]);
  const tr = tradeRisk(lot, L.endT);
  const dd = markedDrawdown(portfolioPath(L));
  const a = attributeDrawdown(L, dd.peakT, dd.troughT);

  close(tr.maxGivebackAboveBreakeven, 30_000);
  close(tr.maxDeclineFromPeak, 40_000);
  close(tr.declineAboveBreakeven, 30_000);
  close(tr.declineBelowBreakeven, 10_000);
  close(tr.principalLossLiq, 10_000);
  close(dd.max, 40_000);
  close(a.profitGiveback, 30_000);
  close(a.principalLoss, 10_000);
  close(a.residual, 0);
  close(a.profitGiveback + a.principalLoss, dd.max); // no double counting
});

test('several closed losses separated by winners: realized drawdown nets the intervening profits', () => {
  const nets = [-5000, 3000, -6000, 10000, -2000];
  const lots = nets.map((n, i) => lotOf({ id: i + 1, entryDay: 3 * i, raw: 100, path: [[3 * i, 100], [3 * i + 1, 100 + n / 2000]], exit: [3 * i + 2, 100 + n / 1000] }));
  const L = ledgerOf(lots);
  const pts = portfolioPath(L);
  const ep = realizedEpisodes(L);
  const st = losingStreaks(L);

  // R: 0 → −5,000 → −2,000 → −8,000 → +2,000 → 0
  close(realizedDrawdown(pts).max, 8000);
  assert.equal(ep.length, 2);
  close(ep[0]!.depth, 8000);
  assert.equal(ep[0]!.lots, 3);
  assert.equal(ep[0]!.losing, 2);
  close(ep[0]!.grossLosses, -11000);
  close(ep[0]!.grossWins, 3000);
  assert.equal(ep[0]!.recoveryDate, D(11)); // the +10,000 lot's exit regains the 0 high
  close(ep[1]!.depth, 2000); // from the +2,000 high to 0, not regained
  assert.equal(ep[1]!.recoveryDate, null);
  assert.equal(st.longest.n, 1);
  close(st.deepest.sum, -6000);
  // the naive sum of losing trades (−13,000) is NOT the realized drawdown (8,000)
  assert.notEqual(nets.filter((n) => n < 0).reduce((a, b) => a + b, 0), -8000);
});

test('profit still open at a cutoff: banked drawdown ignores the open-profit giveback, the marked drawdown does not', () => {
  const l1 = lotOf({ id: 1, entryDay: 0, raw: 100, path: [[0, 100]], exit: [1, 105] }); // +5,000 banked
  const l2 = lotOf({ id: 2, entryDay: 2, raw: 100, path: [[2, 100], [3, 120], [4, 102]] }); // open: +20,000 then +2,000
  const L = ledgerOf([l1, l2]);
  const pts = portfolioPath(L);
  const o = openLotAt(L, T(3));

  close(o!.multiple, 1.2);
  close(pts.at(-1)!.m, 7000);
  close(pts.at(-1)!.r, 5000);
  close(markedDrawdown(pts).max, 18000); // 25,000 → 7,000
  assert.equal(bankedDrawdown(pts).max, 0); // never below the banked 5,000
  const dd = markedDrawdown(pts);
  const a = attributeDrawdown(L, dd.peakT, dd.troughT);

  close(a.profitGiveback, 18000);
  close(a.principalLoss, 0);
});

test('a carried lot across a boundary: the reset window counts its giveback from the boundary mark', () => {
  const l = lotOf({ id: 1, entryDay: 0, raw: 100, path: [[0, 100], [1, 140], [2, 150], [3, 110]], exit: [4, 115] });
  const L = ledgerOf([l]);
  const pts = portfolioPath(L);
  const boundary = T(1); // the cutoff close at +40,000
  const w = markedDrawdown(pts, 'marked', boundary);

  close(w.peakValue, 50000); // 150 after the boundary
  close(w.max, 40000); // 150 → 110
  const a = attributeDrawdown(L, w.peakT, w.troughT);

  close(a.profitGiveback, 40000);
  close(realizedDrawdown(pts, boundary).max, 0); // nothing banked or lost in the window: the exit banks +15,000
});

test('partial exits: the lot P&L keeps the realized part; principal loss is on the whole lot', () => {
  // 1,000 shares at 100; at 150 sell 50% (+25,000 realized); the 500 left fall to 80 (+15,000 total) and 40 (−5,000)
  const l = lotOf({ id: 1, entryDay: 0, raw: 100, path: [[0, 100], [1, 150], [2, 80], [3, 40]], partial: [2, 150, 0.5], exit: [3, 40] });
  const L = ledgerOf([l]);
  const pts = portfolioPath(L);
  const tr = tradeRisk(l, L.endT);

  close(l.net, -5000);
  close(tr.peakProfit, 50000);
  close(tr.principalLossLiq, 5000);
  close(tr.maxGivebackAboveBreakeven, 50000);
  close(tr.declineAboveBreakeven, 50000);
  close(tr.declineBelowBreakeven, 5000);
  close(realizedDrawdown(pts).max, 30000); // R: 0 → +25,000 (partial) → −5,000 (exit)
  close(bankedDrawdown(pts).max, 30000); // banked high 25,000, marked low −5,000
  close(floorShortfall(pts).shortfall, 5000);
});

test('one funded slot: overlapping lots are refused; back-to-back lots accumulate the banked net', () => {
  const a = lotOf({ id: 1, entryDay: 0, raw: 100, path: [[0, 100], [5, 110]] , exit: [6, 110] });
  const b = lotOf({ id: 2, entryDay: 3, raw: 100, path: [[3, 100], [4, 90]], exit: [4, 90] });

  assert.throws(() => portfolioPath(ledgerOf([a, b])));
  const c = lotOf({ id: 2, entryDay: 7, raw: 100, path: [[7, 100], [8, 90]], exit: [8, 90] });
  const pts = portfolioPath(ledgerOf([a, c]));

  close(pts.at(-1)!.r, 0); // +10,000 − 10,000
  close(markedDrawdown(pts).max, 10000);
});

test('the strict tracker (the engine’s): equal values never move the peak; recovery is the first strictly higher value', () => {
  const dd = strictDrawdown([
    { t: 1, v: 10 },
    { t: 2, v: 10 },
    { t: 3, v: 4 },
    { t: 4, v: 10 },
    { t: 5, v: 12 }
  ]);

  assert.equal(dd.max, 6);
  assert.equal(dd.peakT, 1);
  assert.equal(dd.troughT, 3);
  assert.equal(dd.recoveryT, 5); // 10 at t = 4 equals the peak: not a recovery under updateStrict
});

test('determinism: the same ledger gives identical metrics', () => {
  const mk = () => ledgerOf([lotOf({ id: 1, entryDay: 0, raw: 100, path: [[0, 100], [1, 130], [2, 90]], exit: [3, 95], cost: 0.0005, rate: 0.11 })]);
  const f = (L: Ledger) => JSON.stringify({ t: L.lots.map((l) => tradeRisk(l, L.endT)), dd: markedDrawdown(portfolioPath(L)), b: bankedDrawdown(portfolioPath(L)) });

  assert.equal(f(mk()), f(mk()));
});

test('tail statistics: linear quantiles and the worst-10% mean over k = ⌈0.1 n⌉', () => {
  const t = tail([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

  close(t.median, 6);
  close(t.p90, 10);
  close(t.worst10Mean, (11 + 10) / 2); // k = 2
});

// ----- the margin model -----

test('margin: the linear closed form equals the bisection; excess and ratios', () => {
  const a = { positions: [{ symbol: 'A', quantity: 1000, price: 100 }], cash: 0, debt: 40_000, maintenance: 0.35 };
  const e = evaluateAccount(a);

  close(e.equity, 60_000);
  close(e.requirement, 35_000);
  close(e.excess, 25_000);
  close(firstDeficiencyShock(a)!, linearDeficiencyShock(100_000, 0, 40_000, 0, 0.35)!, 1e-9); // 1 − 40/65
  close(linearDeficiencyShock(100_000, 0, 40_000, 0, 0.35)!, 1 - 40_000 / 65_000);
  assert.equal(firstDeficiencyShock({ ...a, debt: 0 }), null);
});

test('margin: the $250k → $210k giveback lowers the modelled excess by 40,000 × (1 − m) while the trade stays profitable', () => {
  const at = (slot: number) =>
    evaluateAccount(scenarioAccount({ core: 500_000, voogShare: 0.6, tradedSymbol: 'GDX', slotValue: slot, slotLoan: 100_000, slotInterest: 0, realized: 0, otherDebt: 0, maintenance: 0.35 }));

  close(at(250_000).excess - at(210_000).excess, 40_000 * 0.65);
  close(at(210_000).equity, 500_000 + 110_000);
});

test('margin: a concentration rule raises the requirement of the dominant position only', () => {
  const a = { positions: [{ symbol: 'A', quantity: 800, price: 100 }, { symbol: 'B', quantity: 200, price: 100 }], cash: 0, debt: 0, maintenance: 0.35, concentration: { trigger: 0.6, maintenance: 0.5 } };
  const e = evaluateAccount(a);

  close(e.requirement, 80_000 * 0.5 + 20_000 * 0.35);
  close(evaluateAccount({ ...a, positions: [...a.positions, { symbol: 'C', quantity: 10, price: 100, marginable: false }] }).requirement, 80_000 * 0.5 + 20_000 * 0.35 + 1000);
});

test('a window ending while a lot is open never reads that lot\'s later marks (amendment A3)', () => {
  // open at the window end (day 2, +20,000), later falls to −30,000 (day 4) and exits there
  const l = lotOf({ id: 1, entryDay: 0, raw: 100, path: [[0, 100], [1, 110], [2, 120], [3, 90], [4, 70]], exit: [4, 70] });
  const L = ledgerOf([l]);
  const pts = portfolioPath(L);
  const w = windowMetrics(L, pts, -Infinity, T(2));
  const all = windowMetrics(L, pts, -Infinity, L.endT);

  close(w.trades.principalLossMax, 0); // nothing below principal up to day 2
  close(w.trades.maxPeakProfit, 20000);
  assert.equal(w.trades.closed, 0);
  close(all.trades.principalLossMax, 30000);
});

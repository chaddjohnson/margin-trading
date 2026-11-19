// Test support for the pooled-candidate viewer (Priority 6): the repository root, real-data availability, and a small
// SYNTHETIC pooled-engine result (shape of src/vg-d1-growth-joint/pool.ts PoolResult) with the edge cases the five
// archived ledgers do not all contain: a Growth partial exit and a final exit carried across the 2024-12-31 boundary,
// a D1 position open at the endpoint, a refused executable decision, and (variant) a granted order still unfilled at
// the endpoint. Fills follow the engine's formulas (proceeds = shares × price; interest = principal × rate × days/365;
// net = proceeds − principal − interest); the marks are the marked net at each change.
import { Tracker } from '../../../src/multi-etf-allocator/engine.ts';
import type { FundingRecord, Lot, LotFill, PoolResult } from '../../../src/vg-d1-growth-joint/pool.ts';
import type { Calendar } from '../runner/portfolio-bridge.ts';

export { hasData, REPO } from './portfolio-env.ts';

const DATES = ['2024-12-27', '2024-12-30', '2024-12-31', '2025-01-02', '2025-01-03'];
const midnight = (d: string) => Date.parse(`${d}T00:00:00Z`) / 1000;
const closeOf = (d: string) => Date.parse(`${d}T21:00:00Z`) / 1000;
const minute = (s: number, k: number) => Date.parse(`${DATES[s]}T14:30:00Z`) / 1000 + k * 60;
const RATE = 0.11;
const YEAR = 365 * 86400;

export const syntheticCalendar: Calendar = {
  dates: DATES,
  sTime: DATES.map(midnight),
  sCloseTime: DATES.map(closeOf),
  barCount: { VGT: DATES.map(() => 390), GDX: DATES.map(() => 390) }
};

const trade = (book: Lot['book'], id: number, kind: string, dS: number, dK: number, eS: number, eK: number, raw: number) => ({
  book,
  id,
  kind,
  dS,
  dT: minute(dS, dK),
  dPrice: raw,
  eS,
  eK,
  eT: eK === 390 ? closeOf(DATES[eS]!) : minute(eS, eK),
  eRaw: raw,
  ePrice: raw * 1.0005,
  fills: [],
  open: false,
  vNet: 0,
  vInterest: 0
});

function lotOf(id: number, t: ReturnType<typeof trade>): Lot {
  const shares = 100_000 / t.ePrice;
  return {
    id,
    book: t.book,
    family: t.book.startsWith('D1') ? 'D1' : 'G',
    symbol: t.book.slice(t.book.indexOf(':') + 1) as Lot['symbol'],
    trade: t as Lot['trade'],
    principal0: 100_000,
    shares0: shares,
    shares,
    principal: 100_000,
    entryS: t.eS,
    entryT: t.eT,
    entryRaw: t.eRaw,
    entryPrice: t.ePrice,
    entryTs: midnight(DATES[t.eS]!),
    fills: [],
    realized: 0,
    interest: 0,
    open: true,
    net: 0,
    unrealized: 0,
    costs: shares * (t.ePrice - t.eRaw),
    worst: -500,
    worstT: t.eT + 60,
    best: 3000,
    bestT: t.eT + 120
  };
}

function exitFill(lot: Lot, s: number, k: number, raw: number, partial: boolean, f: number, reason: string): LotFill {
  const t = k === 390 ? closeOf(DATES[s]!) : minute(s, k);
  const price = raw * (1 - 0.0005);
  const sold = partial ? lot.shares * f : lot.shares;
  const repaid = partial ? lot.principal * f : lot.principal;
  const interest = repaid * RATE * ((midnight(DATES[s]!) - lot.entryTs) / YEAR);
  const proceeds = sold * price;
  const fill: LotFill = { s, k, t, raw, price, partial, shares: sold, principal: repaid, interest, proceeds, net: proceeds - repaid - interest, reason };
  lot.fills.push(fill);
  lot.trade.fills.push({ s, k, t, raw, price, partial, f: partial ? f : 1, reason });
  lot.realized += fill.net;
  lot.interest += interest;
  lot.costs += sold * (raw - price);
  if (partial) {
    lot.shares -= sold;
    lot.principal -= repaid;
  } else {
    lot.shares = 0;
    lot.principal = 0;
    lot.open = false;
    lot.net = lot.realized;
  }
  return fill;
}

const decision = (t: ReturnType<typeof trade>, outcome: 'granted' | 'refused', occupant = '', occupantBook: FundingRecord['occupantBook'] = null): FundingRecord => ({
  book: t.book,
  trade: t.id,
  kind: t.kind,
  s: t.dS,
  t: t.dT,
  price: t.dPrice,
  grant: outcome === 'granted' ? 100_000 : 0,
  outcome,
  reason: outcome === 'refused' ? 'slot occupied' : '',
  occupant,
  occupantBook
});

/**
 * Variant 'open': lot 1 Growth·VGT (rise) with a 50% partial exit on 2024-12-30 and its final exit at the 2025-01-02 close
 * (carried across the boundary); a D1·VGT decision refused while it holds the slot; lot 2 D1·GDX entered on 2025-01-03,
 * open at the end. Variant 'pending': lot 2 closes the same day and a granted D1·VGT order is still unfilled at the end.
 */
export function syntheticResult(variant: 'open' | 'pending' = 'open') {
  const t1 = trade('G:VGT', 1, 'rise', 0, 9, 0, 10, 100);
  const tRef = trade('D1:VGT', 7, 'deep', 1, 50, 1, 51, 104);
  const t2 = trade('D1:GDX', 3, 'deep', 4, 4, 4, 5, 40);
  const lot1 = lotOf(1, t1);
  exitFill(lot1, 1, 100, 110, true, 0.5, 'trailing stop');
  exitFill(lot1, 3, 390, 105, false, 1, 'trend exit');
  const lot2 = lotOf(2, t2);
  const funding = [decision(t1, 'granted'), decision(tRef, 'refused', 'G:VGT lot 1 ($50000.00)', 'G:VGT'), decision(t2, 'granted')];
  let pending: ReturnType<typeof trade> | null = null;
  if (variant === 'pending') {
    exitFill(lot2, 4, 200, 41, false, 1, 'trailing stop');
    pending = { ...trade('D1:VGT', 9, 'deep', 4, 300, -1, -1, 106), eS: -1, eK: -1, eT: NaN, eRaw: NaN, ePrice: NaN };
    funding.push(decision(pending, 'granted'));
  }
  // the end: lot 2 marked at the last close (accrued interest, no exit cost)
  let unrealized = 0;
  if (lot2.open) {
    const accrued = lot2.principal * RATE * ((midnight(DATES[4]!) - lot2.entryTs) / YEAR);
    unrealized = lot2.shares * 40.6 - lot2.principal - accrued;
    lot2.unrealized = unrealized;
    lot2.interest += accrued;
    lot2.net = lot2.realized + unrealized;
  }
  const realized = lot1.realized + lot2.realized;
  const net = realized + unrealized;
  // marks: the marked net at each change (time order), the last one the net
  const r1 = lot1.fills[0]!.net;
  const marks: [number, number][] = [
    [minute(0, 10), -60],
    [minute(0, 200), 900],
    [closeOf(DATES[0]!), 700],
    [minute(1, 100), r1 + 1200],
    [minute(1, 200), r1 - 1800],
    [closeOf(DATES[1]!), r1 + 300],
    [minute(2, 30), r1 + 2600],
    [closeOf(DATES[2]!), r1 + 2000],
    [minute(3, 60), r1 + 900],
    [closeOf(DATES[3]!), lot1.realized],
    [minute(4, 5), lot1.realized - 20],
    [minute(4, 120), lot1.realized - 900],
    [closeOf(DATES[4]!), net]
  ];
  const minuteT = new Tracker(0, 0);
  const sessionT = new Tracker(0, 0);
  let period: Tracker | null = null;
  const daily = new Float64Array(DATES.length);
  let equityAtBoundary = NaN;
  for (const [t, v] of marks) {
    minuteT.updateStrict(v, t);
    period?.updateStrict(v, t);
    const s = DATES.findIndex((d) => closeOf(d) === t);
    if (s >= 0) {
      daily[s] = v;
      sessionT.updateStrict(v, t);
      if (s === 2) {
        equityAtBoundary = v;
        period = new Tracker(v, t);
      }
    }
  }
  const view = (tr: Tracker) => {
    const st = tr.stats();
    return { max: st.maximum, peakT: st.peakTime, troughT: st.troughTime, recoveryT: st.recoveryTime };
  };
  const result = {
    endIndex: DATES.length - 1,
    net,
    realized,
    unrealized,
    dd: view(minuteT),
    ddDaily: view(sessionT),
    periods: [{ boundary: 2, equity: equityAtBoundary, dd: view(period!) }],
    lots: [lot1, lot2],
    funding,
    daily,
    principalAtClose: new Float64Array(DATES.length),
    valueAtClose: new Float64Array(DATES.length),
    heldAtClose: new Int8Array(DATES.length),
    peakPrincipal: 100_000,
    peakValue: 101_000,
    sessionsHeld: DATES.length,
    decisions: {
      'D1:GDX': { total: 1, granted: 1, refused: 0 },
      'D1:VGT': { total: variant === 'pending' ? 2 : 1, granted: variant === 'pending' ? 1 : 0, refused: 1 },
      'G:GDX': { total: 0, granted: 0, refused: 0 },
      'G:VGT': { total: 1, granted: 1, refused: 0 }
    },
    refusals: { 'slot occupied': 1 },
    marks: marks.length,
    markChanges: { t: marks.map((m) => m[0]), v: marks.map((m) => m[1]) }
  } as unknown as PoolResult;
  return { result, lots: [lot1, lot2], pending };
}

export const syntheticEntry = {
  id: 'synthetic',
  symbols: ['VGT', 'GDX'],
  enabled: { 'D1:GDX': true, 'D1:VGT': true, 'G:GDX': false, 'G:VGT': true } as const,
  targets: {
    fullNet: 0,
    fullMinuteDd: 0,
    validationNet: 0,
    validationResetDd: 0,
    developmentNet: 0,
    developmentMinuteDd: 0,
    developmentLots: 0,
    fullRealized: 0,
    fullUnrealized: 0,
    lots: 2,
    signature: 'synthetic',
    record: {},
    recordFormat: 'synthetic'
  }
};

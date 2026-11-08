// The ledger example of a Growth partial sale releasing principal that then admits a (downsized) D1 lot under B
// 100%/100%, on the synthetic sessions of tests/allocator.test.ts (report helper; no market data).
//   node --experimental-transform-types tools/vgt-d1-growth-joint/example.ts > research/vgt-d1-growth-joint/results/diagnostics/partial-release-synthetic.json
import { buildData } from '../../src/shared-margin-portfolio/tests/fixtures.ts';
import { runPool } from '../../src/vgt-d1-growth-joint/allocator.ts';
import type { VBook, VTrade } from '../../src/vgt-d1-growth-joint/books.ts';

const ds = buildData(
  Array.from({ length: 8 }, (_v, s) => ({ closes: [100 + s, 101 + s, 102 + s, 103 + s, 104 + s] }))
).ds;
const bt = (s: number, k: number) => (k < ds.sBarCount[s]! ? ds.bTime[ds.sBarStart[s]! + k]! : ds.sCloseTime[s]!);
const px = (s: number, k: number) => (k < ds.sBarCount[s]! ? ds.bOpen[ds.sBarStart[s]! + k]! : ds.sClosingPrint[s]!);
const tr = (
  family: 'D1' | 'G',
  id: number,
  dT: number,
  dS: number,
  e: [number, number],
  fills: { s: number; k: number; partial?: boolean; f?: number }[]
): VTrade => ({
  family,
  id,
  kind: family === 'D1' ? 'deep' : 'rise',
  dS,
  dT,
  dPrice: 100,
  eS: e[0],
  eK: e[1],
  eT: bt(e[0], e[1]),
  eRaw: px(e[0], e[1]),
  ePrice: px(e[0], e[1]) * 1.0005,
  fills: fills.map((x) => ({
    s: x.s,
    k: x.k,
    t: bt(x.s, x.k),
    raw: px(x.s, x.k),
    price: px(x.s, x.k) * 0.9995,
    partial: x.partial ?? false,
    f: x.f ?? 1,
    reason: 'trailing stop'
  })),
  open: false,
  vNet: 0,
  vInterest: 0
});
const book = (family: 'D1' | 'G', trades: VTrade[]): VBook => ({
  family,
  key: family,
  trades,
  signals: trades.length,
  firstDecision: null,
  endIndex: 7,
  standalone: { net: 0, realized: 0, minuteDd: 0, dailyDd: 0 }
});
const g = book('G', [
  tr(
    'G',
    1,
    ds.sCloseTime[0]!,
    0,
    [1, 0],
    [
      { s: 2, k: 2, partial: true, f: 0.5 },
      { s: 6, k: 3 }
    ]
  )
]);
const d1 = book('D1', [
  tr('D1', 1, bt(1, 1) + 60, 1, [1, 2], [{ s: 2, k: 0 }]),
  tr('D1', 2, bt(3, 1) + 60, 3, [3, 2], [{ s: 5, k: 1 }])
]);
const iso = (t: number) => new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ');
const r = runPool(ds, d1, g, { arch: 'B', d1Target: 1, gTarget: 1, first: 'D1' }, { detail: true });

console.log(
  JSON.stringify(
    {
      note: 'synthetic sessions (consecutive dates from 2018-01-01, five minutes each); 5 bps per side; 11% interest; B 100%/100%',
      funding: r.funding.map((f) => ({
        family: f.family,
        trade: f.trade,
        decision: iso(f.t),
        demand: f.demand,
        capacity: Math.round(f.capacity * 100) / 100,
        grant: Math.round(f.grant * 100) / 100,
        outcome: f.outcome,
        reason: f.reason,
        occupant: f.occupant
      })),
      lots: r.lots.map((l) => ({
        lot: l.id,
        family: l.family,
        entry: iso(l.entryT),
        principal: Math.round(l.principal0 * 100) / 100,
        shares: Math.round(l.shares0 * 1e4) / 1e4,
        fills: l.fills.map((f) => ({
          time: iso(f.t),
          partial: f.partial,
          shares: Math.round(f.shares * 1e4) / 1e4,
          principalRepaid: Math.round(f.principal * 100) / 100,
          interest: Math.round(f.interest * 100) / 100,
          net: Math.round(f.net * 100) / 100
        })),
        net: Math.round(l.net * 100) / 100
      })),
      poolNet: Math.round(r.net * 100) / 100,
      peakPrincipal: r.peakPrincipal
    },
    null,
    1
  )
);

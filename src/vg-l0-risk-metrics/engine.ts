// The adapter between the UNCHANGED evaluation path of Assignment 3 (RC 2's runWithControls2 on Priority 3's books and
// pool, src/vg-l0-full-joint/ = src/vg-l0-risk-families/ evaluation) and this study's engine-independent ledger.
//
// replay() runs one FIXED configuration on one door with the engine's detail and minute-mark recording on (read-only:
// no cache, archive or record of another study is written). toLedger() then RE-MARKS every funded lot independently
// from the door's raw minute bars — its own minutes from the entry fill to the exit, then every session close — with the
// ledger's formulas (pool.ts header):
//   pnl  = realized fills + shares × price − outstanding principal − principal × rate × (sessionDate − entrySessionDate) ÷ 365 d
//   liq  = pnl − shares × price × costBps ÷ 10,000 (the sale cost of the open shares)
// and reconcile() proves that the rebuilt path equals the engine's (every recorded minute-mark change, the maximum
// minute drawdown with its peak and trough instants, every lot's net, its canonical MAE and best mark).
import { recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import type { Lot, PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { secondsPerYear } from '../shared-margin-portfolio/strategy.ts';
import { runWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import type { VBook } from '../vg-d1-growth-joint/books.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import { type Cfg, canonicalCfg, quadOf } from '../vg-l0-full-joint/space.ts';
import { economics } from './context.ts';
import type { Fill, Ledger, LotLedger, LotMark } from './ledger.ts';
import { portfolioPath, strictDrawdown } from './metrics.ts';

export interface Replay {
  door: Door;
  cfg: Cfg;
  options: EvalOptions;
  books: VBook[];
  result: PoolResult;
  rec: Rec;
}

export const replay = (door: Door, cfg: Cfg, options: EvalOptions = vOptions, boundaries: string[] = []): Replay => {
  const c = canonicalCfg(cfg);
  const o = { ...options, ...(boundaries.length ? { boundaries } : {}) };
  // detail (lots' marks, funding log) and every minute-mark change; the RC 2 D1 book cache is bypassed (cache: false)
  const x = runWithControls2(door, quadOf(c), c.controls, o, true, true, { cache: false });

  return { door, cfg: c, options: o, books: x.books, result: x.result, rec: recordOf(door, quadOf(c), x, o) };
};

const iso = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

// Rebuild one lot's marks from the raw bars of its symbol.
const remark = (door: Door, lot: Lot, endIndex: number, rate: number, costBps: number): LotMark[] => {
  const ds = door.sym[lot.symbol as 'GDX' | 'VGT'].ds;
  const out: LotMark[] = [];
  const fills = lot.trade.fills;
  let shares = lot.shares0;
  let principal = lot.principal0;
  let realized = 0;
  let next = 0; // the next exit fill of the virtual trade
  let open = true;
  const lastS = lot.open ? endIndex : lot.fills.at(-1)!.s;
  const apply = (s: number, k: number) => {
    while (open && fills[next] && fills[next]!.s === s && fills[next]!.k === k) {
      const f = lot.fills[next]!; // the funded fill (its dollars), aligned with the virtual fill

      if (f.s !== s || f.k !== k) throw new Error(`lot ${lot.id}: funded fill ${next} is not at (${s}, ${k})`);
      realized += f.net;
      shares -= f.shares;
      principal -= f.principal;
      next++;
      if (!f.partial) open = false;
    }
  };
  const mark = (s: number, t: number, price: number) => {
    const interest = principal * rate * ((ds.sTime[s]! - lot.entryTs) / secondsPerYear);
    const mv = shares * price;
    const pnl = realized + mv - principal - interest;

    out.push({ t, date: door.dates[s]!, price, shares, principal, interest, realized, pnl, liq: pnl - (mv * costBps) / 10_000 });
  };

  for (let s = lot.entryS; s <= lastS && open; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const k0 = s === lot.entryS ? lot.trade.eK : 0;

    for (let k = k0; k < count && open; k++) {
      apply(s, k);
      if (open) mark(s, ds.bTime[start + k]!, ds.bClose[start + k]!);
    }
    if (!open) break;
    apply(s, count); // closing-print exits
    if (open) mark(s, ds.sCloseTime[s]!, ds.sClose[s]!);
  }

  if (!lot.open && open) throw new Error(`lot ${lot.id}: its exit was never reached while re-marking`);
  return out;
};

export const toLedger = (r: Replay): Ledger => {
  const { door, result } = r;
  const rate = r.options.friction?.rate ?? economics.rate;
  const costBps = r.options.friction?.costBps ?? economics.costBps;
  const ds = door.sym.VGT.ds;
  const lots: LotLedger[] = result.lots.map((l) => {
    const fills: Fill[] = l.fills.map((f) => ({
      t: f.t,
      date: door.dates[f.s]!,
      raw: f.raw,
      price: f.price,
      partial: f.partial,
      shares: f.shares,
      principal: f.principal,
      interest: f.interest,
      proceeds: f.proceeds,
      net: f.net,
      reason: f.reason
    }));

    return {
      id: l.id,
      book: l.book,
      symbol: l.symbol,
      kind: l.trade.kind,
      principal0: l.principal0,
      shares0: l.shares0,
      entryT: l.entryT,
      entryDate: door.dates[l.entryS]!,
      entryRaw: l.entryRaw,
      entryPrice: l.entryPrice,
      fills,
      open: l.open,
      net: l.net,
      interest: l.interest,
      costs: l.costs,
      canonicalMae: Math.min(l.worst, l.net),
      marks: remark(door, l, result.endIndex, rate, costBps)
    };
  });

  return {
    lots,
    startT: ds.bTime[ds.sBarStart[0]!]!,
    endT: ds.sCloseTime[result.endIndex]!,
    endDate: door.dates[result.endIndex]!,
    costBps,
    rate,
    budget: economics.budget
  };
};

// The reconciliation to the engine (IMPLEMENTATION_AND_TESTS.md §3). Throws on the first discrepancy above tolerance.
export const reconcile = (r: Replay, L: Ledger, tol = 1e-6) => {
  const res = r.result;
  const pts = portfolioPath(L);
  const byT = new Map<number, number>();

  for (const p of pts) byT.set(p.t, p.m); // the last value at an instant
  const mc = res.markChanges!;
  let checked = 0;
  let unmatched = 0;

  for (let i = 0; i < mc.t.length; i++) {
    const v = byT.get(mc.t[i]!);

    if (v === undefined) {
      // the engine's first record is the flat 0 at the first session's close (an empty change list records any value)
      if (!(i === 0 && mc.v[0] === 0)) unmatched++;
      continue;
    }
    if (Math.abs(v - mc.v[i]!) > tol * Math.max(1, Math.abs(mc.v[i]!))) throw new Error(`mark at ${iso(mc.t[i]!)} ${mc.t[i]}: rebuilt ${v} vs engine ${mc.v[i]}`);
    checked++;
  }
  if (unmatched) throw new Error(`${unmatched} engine minute-mark change(s) at instants the rebuilt path lacks`);

  const dd = strictDrawdown(pts.map((p) => ({ t: p.t, v: p.m })), 0, pts[0]!.t);

  if (Math.abs(dd.max - res.dd.max) > tol * Math.max(1, res.dd.max)) throw new Error(`DD rebuilt ${dd.max} vs engine ${res.dd.max}`);
  if (dd.peakT !== res.dd.peakT || dd.troughT !== res.dd.troughT) throw new Error(`DD instants rebuilt ${dd.peakT}/${dd.troughT} vs engine ${res.dd.peakT}/${res.dd.troughT}`);

  for (const [i, l] of L.lots.entries()) {
    const e = res.lots[i]!;
    const last = l.marks.at(-1);
    const worst = Math.min(...l.marks.map((k) => k.pnl));
    const best = Math.max(...l.marks.map((k) => k.pnl));

    if (l.open && last && Math.abs(last.pnl - e.net) > tol * Math.max(1, Math.abs(e.net))) throw new Error(`open lot ${l.id}: end mark ${last.pnl} vs engine ${e.net}`);
    if (Math.abs(Math.min(worst, l.net) - l.canonicalMae!) > tol * Math.max(1, Math.abs(l.canonicalMae!))) throw new Error(`lot ${l.id}: rebuilt MAE ${Math.min(worst, l.net)} vs engine ${l.canonicalMae}`);
    if (Math.abs(best - e.best) > tol * Math.max(1, Math.abs(e.best))) throw new Error(`lot ${l.id}: rebuilt best ${best} vs engine ${e.best}`);
  }

  const sumLots = L.lots.reduce((s, l) => s + l.net, 0);

  if (Math.abs(sumLots - res.net) > tol * Math.max(1, Math.abs(res.net))) throw new Error(`Σ lots ${sumLots} vs net ${res.net}`);
  return { marksChecked: checked, engineChangesNotRebuilt: unmatched, points: pts.length, ddMax: dd.max, lots: L.lots.length };
};

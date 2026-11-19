// The engine-independent ledger the metrics read (METRIC_SPECIFICATION.md §1). It mirrors the established funded-lot
// ledger of Priority 3's pooled replay (src/vg-d1-growth-joint/pool.ts) without importing it, so that synthetic cases can
// be written by hand and the historical cases can be reconciled to the engine (engine.ts).
//
// UNITS: dollars; times are Unix seconds; dates are New York session dates (YYYY-MM-DD).
//
// ONE FUNDED SLOT: at most one lot is open at any instant (the pool's exclusive slot). The portfolio's marked net at a
// marking instant t is therefore M(t) = R_before(lot) + pnl(lot, t) while a lot is open and R(t) while flat, where
// R_before is the realized net of every earlier lot and pnl(lot, t) the lot's own marked P&L (below). The metrics never
// assume this decomposition silently: portfolioPath() rebuilds M from the lots and the reconciliation compares it with the
// engine's own minute marks.

// One exit fill (a final exit, or a partial sale of a fraction of the current shares).
export interface Fill {
  t: number; // the fill instant (a minute's opening print, or the session close for a closing-print fill)
  date: string;
  raw: number; // the traded price before the per-side cost
  price: number; // after the per-side cost (and any modelled stop slippage)
  partial: boolean;
  shares: number; // shares sold
  principal: number; // principal repaid with this fill
  interest: number; // interest paid with this fill (on the repaid principal)
  proceeds: number; // shares × price
  net: number; // proceeds − principal − interest
  reason: string;
}

// One marking instant while the lot is (at least partly) open.
export interface LotMark {
  t: number;
  date: string;
  price: number; // the mark price: the held symbol's minute close, or the session close
  shares: number; // outstanding shares after any fill at or before t
  principal: number; // outstanding principal
  interest: number; // interest accrued on the outstanding principal to the mark's session date
  realized: number; // this lot's realized net of its fills at or before t (partial sales)
  pnl: number; // MARKED: realized + shares × price − principal − interest (no exit cost: the marked-net convention)
  liq: number; // LIQUIDATION-EQUIVALENT: pnl − shares × price × costBps ÷ 10,000 (the sale cost of the open shares)
}

export interface LotLedger {
  id: number; // 1-based order of funding
  book: string; // e.g. 'D1:GDX', 'D1:VGT', 'G:VGT'
  symbol: string;
  kind: string; // the virtual trade's setup kind
  principal0: number; // the funded principal (the slot's $100,000)
  shares0: number; // principal0 ÷ entryPrice (fractional)
  entryT: number;
  entryDate: string;
  entryRaw: number;
  entryPrice: number; // after the per-side cost
  fills: Fill[];
  open: boolean; // still (partly) open at the ledger's end
  net: number; // realized net when closed; realized + the end mark when open
  interest: number; // total interest (paid, plus accrued to the end while open)
  costs: number; // per-side costs paid (entry + exit fills)
  canonicalMae: number | null; // the engine's published MAE: min(the lowest mark, the final net); null for synthetic lots
  marks: LotMark[]; // every marking instant while open, ascending time
}

export interface Ledger {
  lots: LotLedger[]; // in funding order (one slot: lot i exits before lot i + 1 enters)
  startT: number; // the first session's first instant
  endT: number; // the last marking instant (the last session close)
  endDate: string;
  costBps: number; // per side
  rate: number; // simple annual interest on outstanding principal, calendar days ÷ 365
  budget: number; // the fixed funded principal
}

// A point of the portfolio path.
export interface PathPoint {
  t: number;
  date: string;
  m: number; // the marked net M(t)
  liq: number; // the liquidation-equivalent net (M − the open shares' sale cost)
  r: number; // the realized ("banked") net R(t): every fill at or before t, partial sales included
  lot: number | null; // index into ledger.lots of the lot open after t (null: flat)
}

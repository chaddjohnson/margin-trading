// The study's single evaluation path (PROTOCOL.md §5): RC 2's pooled runner (src/d1-risk-controls-rc2/run.ts — the two
// controlled D1 books, Priority 3's Growth books and pool and compact record, unchanged) on one door. A search record
// is Priority 3's compact record (its identity = RC 2's riskId2) plus each D1 book's control summary; a DETAILED record
// (qualification centres, fold rows, diagnostics) adds the cutoff-exposure and per-lot inputs of the risk-aware
// selector and of the standard's §5.9 disclosure, computed from the complete pooled replay.
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import type { Lot, PoolResult } from '../vg-d1-growth-joint/pool.ts';
import type { RiskConfig2 } from '../d1-risk-controls-rc2/config.ts';
import { evaluateWithControls2, runWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import type { RcLog2 } from '../d1-risk-controls-rc2/book.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';

export type D1BookId = 'D1:GDX' | 'D1:VGT';

export interface RcLite {
  virtualTrades: number;
  protective: number; // protective exits (any activation)
  protectiveGap: number; // at a session's opening trade
  entryDay: number; // on the entry session (entry-day books)
  maximumHold: number;
  adaptive: number; // positions whose adaptive hold extended
  episodes: number; // decline-gate episodes
  blocks: number;
  blockedSessions: number;
}

export type SRec = Rec & { rc: Partial<Record<D1BookId, RcLite>> };

const lite = (l: RcLog2): RcLite => ({
  virtualTrades: l.trades.length,
  protective: l.summary.protectiveExits,
  protectiveGap: l.summary.protectiveGapExits,
  entryDay: l.summary.entryDayExits ?? 0,
  maximumHold: l.summary.maximumHoldExits,
  adaptive: l.summary.adaptiveExtensions,
  episodes: l.summary.episodes,
  blocks: l.summary.blocks,
  blockedSessions: l.summary.blockedSessions
});

export const evaluate = (door: Door, quad: Quad, controls: RiskConfig2 | null, o: EvalOptions): SRec => {
  const { rec, risk } = evaluateWithControls2(door, quad, controls, o);
  const rc: SRec['rc'] = {};

  for (const [b, l] of Object.entries(risk.books)) rc[b as D1BookId] = lite(l as RcLog2);
  return { ...rec, rc };
};

// ----- the detailed record: exposure at the door's last close and per-lot excursions -----

export interface LotRow {
  book: string;
  entry: string; // date
  entryRaw: number;
  exit: string | null; // date of the final exit; null while open
  reason: string; // the final exit reason, or 'open'
  net: number; // realized (closed) or marked at the door's end (open)
  mae: number; // min(the lowest minute mark during its life, its final net): realized fills + remainder, no exit cost
  maeAt: string | null;
  days: number; // calendar days held (to the door's end while open)
}

export interface OpenLot {
  book: string;
  entry: string;
  entryRaw: number;
  principal: number;
  shares: number;
  close: number; // the door's last close of its symbol
  marketValue: number; // shares × close
  multiple: number; // marketValue ÷ the lot's original principal
  mark: number; // shares × close − outstanding principal − accrued interest (no exit cost; the marked-net convention)
}

export interface RiskInputs {
  endDate: string;
  net: number; // the marked net at the door's last close (the training net at a cutoff)
  realized: number;
  unrealized: number;
  conservativeNet: number; // realized + min(0, unrealized): open gains are not credited, open losses are
  openLot: OpenLot | null; // one funded slot: at most one lot open
  openShare: number | null; // unrealized ÷ net (null when net ≤ 0)
  occupancy: number; // sessions with a funded lot at the close ÷ sessions
  lots: number;
  mae: { count: number; median: number; p90: number; worst: number; worstBook: string | null }; // p90 = the 0.1 quantile (the adverse tail)
  maeByBook: Record<string, number>; // the worst per-lot MAE of each funded book
  worstRealized: number | null;
  meanLosing: number | null;
  losing: number;
  rows: LotRow[];
}

const dateOf = (door: Door, s: number) => door.dates[s]!;

export const riskInputsOf = (door: Door, x: { result: PoolResult }, rec: Rec): RiskInputs => {
  const r = x.result;
  const end = r.endIndex;
  const lots = r.lots;
  const mae = (l: Lot) => Math.min(l.worst, l.net);
  const maeAtOf = (l: Lot) => (Number.isFinite(l.worstT) && l.worst <= l.net ? new Date(l.worstT * 1000).toISOString().slice(0, 10) : l.open ? null : dateOf(door, l.fills.at(-1)!.s));
  const rows: LotRow[] = lots.map((l) => ({
    book: l.book,
    entry: dateOf(door, l.entryS),
    entryRaw: l.entryRaw,
    exit: l.open ? null : dateOf(door, l.fills.at(-1)!.s),
    reason: l.open ? 'open' : l.fills.at(-1)!.reason,
    net: l.net,
    mae: mae(l),
    maeAt: maeAtOf(l),
    days: ((l.open ? door.sym.VGT.ds.sTime[end]! : door.sym.VGT.ds.sTime[l.fills.at(-1)!.s]!) - door.sym.VGT.ds.sTime[l.entryS]!) / 86400
  }));
  const open = lots.find((l) => l.open) ?? null;
  let openLot: OpenLot | null = null;

  if (open) {
    const ds = door.sym[open.symbol].ds;
    const close = ds.sClose[end]!;

    openLot = {
      book: open.book,
      entry: dateOf(door, open.entryS),
      entryRaw: open.entryRaw,
      principal: open.principal,
      shares: open.shares,
      close,
      marketValue: open.shares * close,
      multiple: (open.shares * close) / open.principal0,
      mark: open.unrealized // the pool's end-of-run mark with the run's own interest rate
    };
  }

  const maes = rows.map((x) => x.mae).sort((a, b) => a - b);
  const closed = lots.filter((l) => !l.open);
  const losing = closed.filter((l) => l.net < 0);
  const maeByBook: Record<string, number> = {};

  for (const x of rows) maeByBook[x.book] = Math.min(maeByBook[x.book] ?? Infinity, x.mae);

  const worstRow = rows.reduce<LotRow | null>((a, x) => (!a || x.mae < a.mae ? x : a), null);

  return {
    endDate: dateOf(door, end),
    net: rec.net,
    realized: rec.realized,
    unrealized: rec.unrealized,
    conservativeNet: rec.realized + Math.min(0, rec.unrealized),
    openLot,
    openShare: rec.net > 0 ? rec.unrealized / rec.net : null,
    occupancy: rec.sessions > 0 ? rec.sessionsHeld / rec.sessions : 0,
    lots: lots.length,
    mae: {
      count: maes.length,
      median: maes.length ? quantile(maes, 0.5) : 0,
      p90: maes.length ? quantile(maes, 0.1) : 0,
      worst: maes.length ? maes[0]! : 0,
      worstBook: worstRow?.book ?? null
    },
    maeByBook,
    worstRealized: closed.length ? Math.min(...closed.map((l) => l.net)) : null,
    meanLosing: losing.length ? losing.reduce((a, l) => a + l.net, 0) / losing.length : null,
    losing: losing.length,
    rows
  };
};

export type DRec = SRec & { risk: RiskInputs };

export const evaluateDetail = (door: Door, quad: Quad, controls: RiskConfig2 | null, o: EvalOptions): DRec => {
  const x = runWithControls2(door, quad, controls, o, true, false);
  const rec = recordOf(door, quad, x, o);
  const base = evaluate(door, quad, controls, o); // the identical search record (identity and control summaries)

  if (base.net !== rec.net || base.dd !== rec.dd || base.signature !== rec.signature)
    throw new Error('the detailed replay differs from the search record');
  return { ...base, risk: riskInputsOf(door, x, rec) };
};

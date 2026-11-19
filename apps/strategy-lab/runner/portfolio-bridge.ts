// The bridge from the verified pooled engine into Strategy Lab's result model (Priority 6,
// docs/strategy-lab/POOLED_CANDIDATES.md). It implements NO trading rule: the replay is the research engine's own
// run — src/vg-lifecycle-matched-optimization/life.ts `runLife(…, 'L0')`, which is Priority 3's
// src/vg-d1-growth-joint/evaluate.ts `run` (the canonical virtual books and the unchanged pooled replay, one exclusive
// $100,000 slot) — and its compact record (`recordOf`). This module only converts the engine's FUNDED lots, its funding
// log and its minute marks into:
//
//   events     contract-v2 events: executed entries, partial exits (meta.partial) and final exits of funded positions,
//              and — as rejected signals, shown only on request — the pool's refusals of executable decisions
//              ("slot occupied"). The books' virtual (shadow) trades are never exported.
//   positions  the pooled ledger: one row per funded position with its fills, remaining shares and principal.
//   equity     per NYSE session: the marked net at the close and the deepest minute drawdown inside the session.
//   metrics    portfolio totals, development/validation periods of the ONE continuous run, booked attribution per
//              component, refusals, granted-but-unfilled orders, and the parity check against the archived targets.
//
// Every aggregate is reconciled against the engine's own figures (net, realized, unrealized, minute drawdown, lots);
// any disagreement throws, so an unverifiable replay is never displayed.

import { Tracker } from '../../../src/multi-etf-allocator/engine.ts';
import type { BookId as EngineBookId } from '../../../src/vg-d1-growth-joint/books.ts';
import type { Door } from '../../../src/vg-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, recordOf } from '../../../src/vg-d1-growth-joint/evaluate.ts';
import type { FundingRecord, Lot, PoolResult } from '../../../src/vg-d1-growth-joint/pool.ts';
import { type Quad, gId, normalize, quadId } from '../../../src/vg-d1-growth-joint/space.ts';
import { runLife } from '../../../src/vg-lifecycle-matched-optimization/life.ts';
import type { LabEvent, LabValue } from '../shared/contract.ts';
import {
  type Attribution,
  type BookId,
  type CandidateEntry,
  type DrawdownFigure,
  type ParityCheck,
  type PendingOrder,
  PORTFOLIO_BENCHMARK,
  type PortfolioEquity,
  type PortfolioMetrics,
  type PortfolioPosition,
  type PositionFill,
  componentOfBook,
  symbolOfBook
} from '../shared/portfolio.ts';
import { canonicalJson } from '../shared/preview.ts';

export interface ReplayArtifacts {
  events: LabEvent[];
  positions: PortfolioPosition[];
  metrics: PortfolioMetrics;
  equity: PortfolioEquity;
}

/** The session calendar of the replay's door (the pool's common sessions). */
export interface Calendar {
  dates: readonly string[];
  /** Unix seconds: the session's midnight UTC and its scheduled close. */
  sTime: ArrayLike<number>;
  sCloseTime: ArrayLike<number>;
  /** Regular minute bars per session, per symbol (bar index k = this count is the closing print). */
  barCount: Record<string, ArrayLike<number>>;
}

export const calendarOf = (door: Door): Calendar => ({
  dates: door.dates,
  sTime: door.sym.VGT.ds.sTime,
  sCloseTime: door.sym.VGT.ds.sCloseTime,
  barCount: { VGT: door.sym.VGT.ds.sBarCount, GDX: door.sym.GDX.ds.sBarCount }
});

const PRINCIPAL = PORTFOLIO_BENCHMARK.principal;
const iso = (sec: number) => new Date(sec * 1000).toISOString().replace('.000Z', 'Z');
const isoOrNull = (sec: number) => (Number.isFinite(sec) ? iso(sec) : null);
const r2 = (v: number) => Math.round(v * 100) / 100;
const fail = (msg: string): never => {
  throw new Error(`pooled replay: ${msg}`);
};
const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

const FAMILY_TEXT = { D1: 'D1', Growth: 'Growth' } as const;

/** The engine input of a catalog entry: its canonical quad (identity re-checked) and the evaluation options. */
export function engineInputOf(entry: CandidateEntry): { quad: Quad; options: EvalOptions } {
  const quad = normalize(entry.quad as unknown as Quad);
  if (canonicalJson(quad) !== canonicalJson(entry.quad)) fail(`${entry.id}: the catalog quad is not canonical`);
  if (quadId(quad) !== entry.identities.priority3QuadId)
    fail(`${entry.id}: quad ${quadId(quad)} ≠ the catalog's Priority 3 id ${entry.identities.priority3QuadId}`);
  for (const c of entry.components)
    if (c.enabled && c.family === 'Growth' && gId(quad.g[c.symbol as 'VGT' | 'GDX']) !== c.identity)
      fail(`${entry.id}: Growth·${c.symbol} identity differs from the catalog`);
  for (const [b, on] of Object.entries(entry.enabled))
    if (entry.components.find((c) => c.book === b)?.enabled !== on) fail(`${entry.id}: component ${b} switch differs`);
  if (quad.first !== 'D1') fail(`${entry.id}: the same-instant priority must be D1 first`);
  return {
    quad,
    options: { enabled: { ...(entry.enabled as Record<EngineBookId, boolean>) }, boundaries: [PORTFOLIO_BENCHMARK.boundary] }
  };
}

/** Replay one catalog candidate on an open FULL door and convert the result. */
export function replayCandidate(door: Door, entry: CandidateEntry, replayId: string): ReplayArtifacts & { record: Rec } {
  if (door.from !== PORTFOLIO_BENCHMARK.from || door.to !== PORTFOLIO_BENCHMARK.to)
    fail(`the door covers ${door.from} → ${door.to}, not the benchmark window`);
  const { quad, options } = engineInputOf(entry);
  const x = runLife(door, quad, options, 'L0', { recordMarks: true });
  if (x.rounds !== 1 || x.growthSims !== 0) fail('L0 must be one pooled replay of the canonical books');
  const record = recordOf(door, quad, { books: x.books, result: x.result }, options);
  return { ...convertReplay({ calendar: calendarOf(door), result: x.result, record, entry, replayId }), record };
}

// ----- the conversion (pure; unit-tested on synthetic engine results) -----

export interface ConvertInput {
  calendar: Calendar;
  result: PoolResult;
  record: Rec | Record<string, unknown>;
  entry: Pick<CandidateEntry, 'id' | 'symbols' | 'targets' | 'enabled'>;
  replayId: string;
}

const precisionOf = (cal: Calendar, symbol: string, s: number, k: number): 'minute' | 'session-close' => {
  const n = cal.barCount[symbol]?.[s];
  if (n === undefined) fail(`no bar count for ${symbol} session ${s}`);
  return k === n ? 'session-close' : 'minute';
};
const meaning = (p: 'minute' | 'session-close') =>
  p === 'minute'
    ? 'start of the minute bar the engine filled in (fills at minute-bar prices)'
    : 'the session’s closing print (scheduled close)';
const decisionPrecision = (cal: Calendar, s: number, t: number): 'minute' | 'session-close' =>
  t === cal.sCloseTime[s] ? 'session-close' : 'minute';

const v = (key: string, label: string, value: LabValue['value'], unit: LabValue['unit']): LabValue => ({ key, label, value, unit });

function drawdownFigure(d: { max: number; peakT: number; troughT: number; recoveryT: number }): DrawdownFigure {
  return {
    usd: r2(d.max),
    pctOfPrincipal: Math.round((d.max / PRINCIPAL) * 1e6) / 1e4,
    peakT: d.max > 0 ? isoOrNull(d.peakT) : null,
    troughT: d.max > 0 ? isoOrNull(d.troughT) : null,
    recoveryT: d.max > 0 ? isoOrNull(d.recoveryT) : null
  };
}

export function convertReplay({ calendar: cal, result: r, record, entry, replayId }: ConvertInput): ReplayArtifacts {
  const marks = r.markChanges ?? fail('the replay recorded no minute marks');
  const boundaryIndex = cal.dates.indexOf(PORTFOLIO_BENCHMARK.boundary);
  if (boundaryIndex < 0) fail(`${PORTFOLIO_BENCHMARK.boundary} is not a session of the replay`);
  const boundaryClose = cal.sCloseTime[boundaryIndex]!;
  const lastClose = cal.sCloseTime[r.endIndex]!;

  // ----- positions and their events -----
  const events: LabEvent[] = [];
  const positions: PortfolioPosition[] = [];
  const lotByTrade = new Map<string, Lot>();
  for (const lot of r.lots) {
    const key = `${lot.book}#${lot.trade.id}`;
    if (lotByTrade.has(key)) fail(`two funded lots for ${key}`);
    lotByTrade.set(key, lot);
    const book = lot.book as BookId;
    const component = componentOfBook(book);
    const symbol = lot.symbol;
    if (symbolOfBook(book) !== symbol) fail(`lot ${lot.id}: book ${book} on ${symbol}`);
    if (!entry.symbols.includes(symbol)) fail(`lot ${lot.id} trades ${symbol}, outside the candidate's symbols`);
    if (entry.enabled[book] !== true) fail(`lot ${lot.id} belongs to the disabled component ${book}`);
    const pid = `P-${lot.id}`;
    const entryId = `${symbol}:${pid}:entry`;
    const finalFill = lot.fills.find((f) => !f.partial) ?? null;
    if (lot.fills.some((f, i) => !f.partial && i !== lot.fills.length - 1)) fail(`lot ${lot.id}: a fill after the final exit`);
    if (lot.open === (finalFill !== null)) fail(`lot ${lot.id}: open flag and final exit disagree`);
    const finalId = finalFill ? `${symbol}:${pid}:exit` : null;
    const entryPrecision = precisionOf(cal, symbol, lot.entryS, lot.trade.eK);
    const fills: PositionFill[] = [];
    let shares = lot.shares0;
    let principal = lot.principal0;
    fills.push({
      kind: 'entry',
      eventId: entryId,
      t: iso(lot.entryT),
      timePrecision: entryPrecision,
      price: lot.entryRaw,
      priceAfterCost: lot.entryPrice,
      shares: lot.shares0,
      amount: lot.principal0,
      principalRepaid: null,
      interest: null,
      fillNet: null,
      sharesAfter: lot.shares0,
      principalAfter: lot.principal0,
      reason: `${FAMILY_TEXT[component]} ${lot.trade.kind} entry`
    });
    let partialNo = 0;
    let partialNet = 0;
    for (const f of lot.fills) {
      shares -= f.shares;
      principal -= f.principal;
      if (!f.partial) {
        shares = 0;
        principal = 0;
      } else partialNet += f.net;
      const id = f.partial ? `${symbol}:${pid}:partial-${++partialNo}` : finalId!;
      fills.push({
        kind: f.partial ? 'partial' : 'final',
        eventId: id,
        t: iso(f.t),
        timePrecision: precisionOf(cal, symbol, f.s, f.k),
        price: f.raw,
        priceAfterCost: f.price,
        shares: f.shares,
        amount: f.proceeds,
        principalRepaid: f.principal,
        interest: f.interest,
        fillNet: f.net,
        sharesAfter: shares,
        principalAfter: principal,
        reason: f.reason
      });
    }
    // The ledger's own reconciliation: fills sum to the lot's realized P&L and close its shares and principal.
    const realized = lot.fills.reduce((a, f) => a + f.net, 0);
    if (!close(realized, lot.realized, 1e-6)) fail(`lot ${lot.id}: fills ${realized} ≠ realized ${lot.realized}`);
    if (!close(shares, lot.shares, 1e-9 * lot.shares0) || !close(principal, lot.principal, 1e-6))
      fail(`lot ${lot.id}: remaining shares or principal do not reconcile`);
    const net = lot.open ? lot.realized + lot.unrealized : lot.realized;
    if (!close(net, lot.net, 1e-6)) fail(`lot ${lot.id}: net ${lot.net} ≠ realized + unrealized`);
    const lastT = finalFill ? finalFill.t : lastClose;
    const position: PortfolioPosition = {
      id: pid,
      lot: lot.id,
      book,
      component,
      symbol,
      setup: lot.trade.kind,
      decisionT: iso(lot.trade.dT),
      decisionPrice: lot.trade.dPrice,
      principal: lot.principal0,
      shares: lot.shares0,
      fills,
      status: lot.open ? 'open' : 'closed',
      partialExits: partialNo,
      realized: lot.realized,
      unrealized: lot.open ? lot.unrealized : 0,
      net,
      interest: lot.interest,
      costs: lot.costs,
      exitReason: finalFill?.reason ?? null,
      calendarDays: Math.round(((lastT - lot.entryTs) / 86400) * 10) / 10,
      mae: lot.worst,
      maeT: isoOrNull(lot.worstT)
    };
    positions.push(position);

    const common = { component, book, position: pid, lot: lot.id, setup: lot.trade.kind };
    events.push({
      id: entryId,
      runId: replayId,
      symbol,
      kind: 'executed_entry',
      t: iso(lot.entryT),
      timePrecision: entryPrecision,
      timeMeaning: meaning(entryPrecision),
      price: lot.entryRaw,
      priceBasis: 'fill',
      reason: `${FAMILY_TEXT[component]} ${lot.trade.kind} entry funded from the shared $100,000 pool (${pid})`,
      values: [
        v('component', 'Component', `${FAMILY_TEXT[component]} · ${symbol}`, 'text'),
        v('position', 'Position', pid, 'text'),
        v('decisionTime', 'Decision time', iso(lot.trade.dT), 'datetime'),
        v('decisionPrice', 'Decision price', lot.trade.dPrice, 'price'),
        v('priceAfterCost', 'Entry price after the per-side cost', lot.entryPrice, 'price'),
        v('shares', 'Shares (split-adjusted to the basis date)', lot.shares0, 'count'),
        v('principal', 'Principal', lot.principal0, 'usd'),
        ...(lot.open
          ? [
              v('positionNet', 'Whole position net, marked at the last close', net, 'usd'),
              v('remainderMarked', 'Open remainder, marked (unrealized)', lot.unrealized, 'usd'),
              v('partialFillsNet', 'Partial exits realized', partialNet, 'usd'),
              v('markDate', 'Marked at the close of', cal.dates[r.endIndex]!, 'date')
            ]
          : [])
      ],
      tradeId: pid,
      linkedEventId: finalId,
      meta: { ...common, open: lot.open, partialFills: partialNo }
    });
    let k = 0;
    for (const f of fills) {
      if (f.kind === 'entry') continue;
      const partial = f.kind === 'partial';
      if (partial) k++;
      events.push({
        id: f.eventId,
        runId: replayId,
        symbol,
        kind: 'executed_exit',
        t: f.t,
        timePrecision: f.timePrecision,
        timeMeaning: meaning(f.timePrecision),
        price: f.price,
        priceBasis: 'fill',
        reason: `${partial ? `Partial exit ${k}` : 'Final exit'}: ${f.reason}`,
        values: [
          v('component', 'Component', `${FAMILY_TEXT[component]} · ${symbol}`, 'text'),
          v('position', 'Position', pid, 'text'),
          v('exitReason', 'Exit reason', f.reason, 'text'),
          v('priceAfterCost', 'Exit price after the per-side cost', f.priceAfterCost, 'price'),
          v('sharesSold', 'Shares sold', f.shares, 'count'),
          v('sharesRemaining', 'Shares remaining', f.sharesAfter, 'count'),
          v('proceeds', 'Proceeds', f.amount, 'usd'),
          v('principalRepaid', 'Principal repaid', f.principalRepaid, 'usd'),
          v('principalRemaining', 'Principal remaining', f.principalAfter, 'usd'),
          v('interest', 'Interest on the repaid principal', f.interest, 'usd'),
          v('fillNet', 'This fill’s realized P&L (after costs and interest)', f.fillNet, 'usd'),
          ...(partial
            ? []
            : [
                v('net', 'Whole position net (after costs and interest)', lot.realized, 'usd'),
                v('partialFillsNet', 'Partial exits realized', partialNet, 'usd'),
                v('positionInterest', 'Whole position interest', lot.interest, 'usd'),
                v('positionCosts', 'Whole position transaction costs', lot.costs, 'usd')
              ])
        ],
        tradeId: pid,
        linkedEventId: entryId,
        meta: partial
          ? { ...common, partial: true, fill: k }
          : { ...common, exitReason: f.reason, partialFills: partialNo }
      });
    }
  }

  // ----- funding decisions: granted ↔ lots, pending orders, refusals -----
  const pending: PendingOrder[] = [];
  const refusalsByBook: Partial<Record<BookId, number>> = {};
  let slotOccupied = 0;
  const granted = new Set<string>();
  const refused: FundingRecord[] = [];
  for (const d of r.funding) {
    const book = d.book as BookId;
    if (entry.enabled[book] !== true) fail(`a decision of the disabled component ${book}`);
    const key = `${d.book}#${d.trade}`;
    if (d.outcome === 'granted') {
      granted.add(key);
      if (lotByTrade.has(key)) continue;
      // Granted but never filled: only the order reserved at the endpoint (its fill is after the last session).
      pending.push({
        book,
        component: componentOfBook(book),
        symbol: symbolOfBook(book),
        decisionT: iso(d.t),
        decisionPrice: d.price,
        setup: d.kind
      });
    } else {
      if (d.reason !== 'slot occupied') fail(`refusal reason "${d.reason}" (only "slot occupied" is possible here)`);
      slotOccupied++;
      refusalsByBook[book] = (refusalsByBook[book] ?? 0) + 1;
      refused.push(d);
    }
  }
  if (pending.length > 1) fail(`${pending.length} granted orders without a lot (at most the one reserved at the end)`);
  if (pending.length === 1 && r.lots.some((l) => l.open)) fail('a pending order beside an open lot');
  for (const key of lotByTrade.keys()) if (!granted.has(key)) fail(`lot ${key} has no granted decision`);

  for (const d of refused) {
    const book = d.book as BookId;
    const symbol = symbolOfBook(book);
    const component = componentOfBook(book);
    const precision = decisionPrecision(cal, d.s, d.t);
    events.push({
      id: `${symbol}:refused:${book}:${d.trade}`,
      runId: replayId,
      symbol,
      kind: 'rejected_signal',
      t: iso(d.t),
      timePrecision: precision,
      timeMeaning: 'the funding decision (when the signal was first knowable); NOT executed',
      price: d.price,
      priceBasis: 'decision',
      reason: `Refused by the pool: insufficient pool availability — the $100,000 slot was held by ${d.occupant}. ${FAMILY_TEXT[component]} ${d.kind} signal; not a fill, position or P&L.`,
      values: [
        v('component', 'Component', `${FAMILY_TEXT[component]} · ${symbol}`, 'text'),
        v('refusal', 'Refusal', 'insufficient pool availability (slot occupied)', 'text'),
        v('occupant', 'Slot held by', d.occupant, 'text')
      ],
      tradeId: null,
      linkedEventId: null,
      meta: { component, book, refused: true, reasonCode: 'slot_occupied', occupantBook: d.occupantBook, setup: d.kind }
    });
  }

  // ----- equity: per session, the close mark and the deepest minute drawdown -----
  const n = r.endIndex + 1;
  const equity: PortfolioEquity = {
    dates: cal.dates.slice(0, n) as string[],
    closeMs: Array.from({ length: n }, (_, s) => cal.sCloseTime[s]! * 1000),
    marked: Array.from(r.daily.subarray(0, n), (x) => r2(x)),
    realized: new Array<number>(n).fill(0),
    drawdown: new Array<number>(n).fill(0),
    low: new Array<number>(n).fill(0)
  };
  const minute = new Tracker(0, 0);
  const dev = new Tracker(0, 0);
  let peak = 0;
  let last = 0;
  let s = 0;
  let sessionLow = 0;
  let sessionDd = 0;
  const finishSession = () => {
    equity.drawdown[s] = r2(sessionDd);
    equity.low[s] = r2(sessionLow);
  };
  sessionLow = 0;
  for (let i = 0; i < marks.t.length; i++) {
    const t = marks.t[i]!;
    const value = marks.v[i]!;
    while (s < n - 1 && t > cal.sCloseTime[s]!) {
      finishSession();
      s++;
      sessionLow = last;
      sessionDd = peak - last;
    }
    minute.updateStrict(value, t);
    if (t <= boundaryClose) dev.updateStrict(value, t);
    if (value > peak) peak = value;
    last = value;
    if (value < sessionLow) sessionLow = value;
    if (peak - value > sessionDd) sessionDd = peak - value;
  }
  finishSession();
  while (s < n - 1) {
    s++;
    sessionLow = last;
    sessionDd = peak - last;
    finishSession();
  }
  // realized by session close (fills stamped ≤ the close)
  const realizedFills = r.lots.flatMap((l) => l.fills.map((f) => ({ t: f.t, net: f.net }))).sort((a, b) => a.t - b.t);
  let cum = 0;
  let j = 0;
  for (let q = 0; q < n; q++) {
    while (j < realizedFills.length && realizedFills[j]!.t <= cal.sCloseTime[q]!) cum += realizedFills[j++]!.net;
    equity.realized[q] = r2(cum);
  }
  const ddStats = minute.stats();
  if (!close(ddStats.maximum, r.dd.max, 1e-6)) fail(`the minute drawdown from the marks ${ddStats.maximum} ≠ the engine's ${r.dd.max}`);
  if (!close(Math.max(...equity.drawdown), r2(r.dd.max), 0.0051)) fail('the per-session drawdowns do not reach the minute drawdown');
  if (!close(equity.marked[n - 1]!, r2(r.net), 0.0051)) fail('the last close mark ≠ the replay net');

  // ----- metrics -----
  const rec = record as Record<string, unknown>;
  const period = r.periods[0] ?? fail('no period boundary in the replay');
  if (period.boundary !== boundaryIndex) fail('the period boundary is not 2024-12-31');
  const sumNet = positions.reduce((a, p) => a + p.net, 0);
  const sumRealized = positions.reduce((a, p) => a + p.realized, 0);
  const sumUnrealized = positions.reduce((a, p) => a + p.unrealized, 0);
  const tol = 0.0005 * (positions.length + 1);
  if (!close(sumNet, r.net, tol)) fail(`Σ position net ${sumNet} ≠ the replay net ${r.net}`);
  if (!close(sumRealized, r.realized, tol)) fail(`Σ realized ${sumRealized} ≠ ${r.realized}`);
  if (!close(sumUnrealized, r.unrealized, tol)) fail(`Σ unrealized ${sumUnrealized} ≠ ${r.unrealized}`);
  if (rec.lots !== positions.length) fail(`the record has ${String(rec.lots)} lots, the ledger ${positions.length}`);

  const entryAfter = (p: PortfolioPosition) => Date.parse(p.fills[0]!.t) / 1000 > boundaryClose;
  const realizedAtBoundary = r.lots.reduce(
    (a, l) => a + l.fills.filter((f) => f.t <= boundaryClose).reduce((x, f) => x + f.net, 0),
    0
  );
  const carriedIn = positions
    .filter((p) => !entryAfter(p) && (p.status === 'open' || Date.parse(p.fills.at(-1)!.t) / 1000 > boundaryClose))
    .map((p) => p.id);
  const unrealizedAtBoundary = period.equity - realizedAtBoundary;
  const attribution: Attribution[] = (Object.keys(entry.enabled) as BookId[])
    .filter((b) => entry.enabled[b])
    .map((book) => {
      const ps = positions.filter((p) => p.book === book);
      const d = r.decisions[book as EngineBookId];
      return {
        book,
        component: componentOfBook(book),
        symbol: symbolOfBook(book),
        positions: ps.length,
        open: ps.filter((p) => p.status === 'open').length,
        partialExits: ps.reduce((a, p) => a + p.partialExits, 0),
        booked: r2(ps.reduce((a, p) => a + p.net, 0)),
        realized: r2(ps.reduce((a, p) => a + p.realized, 0)),
        unrealized: r2(ps.reduce((a, p) => a + p.unrealized, 0)),
        wins: ps.filter((p) => p.status === 'closed' && p.net > 0).length,
        losses: ps.filter((p) => p.status === 'closed' && p.net < 0).length,
        decisions: d.total,
        granted: d.granted,
        refused: d.refused
      };
    });

  const sessions = n;
  const devDd = dev.stats();
  const metrics: PortfolioMetrics = {
    kind: 'pooled candidate replay',
    window: {
      from: PORTFOLIO_BENCHMARK.from,
      to: cal.dates[r.endIndex]!,
      boundary: PORTFOLIO_BENCHMARK.boundary,
      validationFrom: PORTFOLIO_BENCHMARK.validationFrom,
      sessions
    },
    principal: PRINCIPAL,
    full: {
      net: r2(r.net),
      realized: r2(r.realized),
      unrealized: r2(r.unrealized),
      minuteDd: drawdownFigure(r.dd),
      dailyDd: drawdownFigure(r.ddDaily),
      interest: r2(r.lots.reduce((a, l) => a + l.interest, 0)),
      costs: r2(r.lots.reduce((a, l) => a + l.costs, 0)),
      positions: positions.length,
      closedPositions: positions.filter((p) => p.status === 'closed').length,
      openPositions: positions.filter((p) => p.status === 'open').length,
      exitFills: positions.reduce((a, p) => a + p.fills.length - 1, 0),
      partialExits: positions.reduce((a, p) => a + p.partialExits, 0),
      wins: positions.filter((p) => p.status === 'closed' && p.net > 0).length,
      losses: positions.filter((p) => p.status === 'closed' && p.net < 0).length,
      sessionsHeld: r.sessionsHeld,
      exposurePct: Math.round((r.sessionsHeld / sessions) * 1e4) / 100,
      peakPrincipal: r2(r.peakPrincipal)
    },
    development: {
      net: r2(period.equity),
      minuteDd: drawdownFigure({ max: devDd.maximum, peakT: devDd.peakTime, troughT: devDd.troughTime, recoveryT: devDd.recoveryTime }),
      positionsEntered: positions.filter((p) => !entryAfter(p)).length
    },
    validation: {
      net: r2(r.net - period.equity),
      resetDd: drawdownFigure(period.dd),
      realizedChange: r2(r.realized - realizedAtBoundary),
      unrealizedChange: r2(r.unrealized - unrealizedAtBoundary),
      positionsEntered: positions.filter(entryAfter).length,
      carriedIn
    },
    attribution,
    refusals: { slotOccupied, byBook: refusalsByBook },
    pending,
    parity: parityOf(entry.targets, r, rec, positions.length, period.equity, devDd.maximum),
    record: rec
  };
  return { events, positions, metrics, equity };
}

// ----- parity against the archived targets -----

const numEq = (a: unknown, b: unknown) =>
  typeof a === 'number' && typeof b === 'number' ? (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) < 0.005 : canonicalJson(a) === canonicalJson(b);

/**
 * Each archived figure is matched independently at its published precision (cents): the full-history marked net, the
 * minute drawdown, the validation change (marked net at 2026-10-30 − at the 2024-12-31 close), the development net and
 * drawdown, realized/unrealized, the funded-lot count and ledger signature, and every field of the archived compact
 * record. Rounded subperiod figures may differ from the rounded total by a cent, so each is rounded on its own.
 */
export function parityOf(
  t: CandidateEntry['targets'],
  r: PoolResult,
  rec: Record<string, unknown>,
  lots: number,
  boundaryEquity: number,
  devDd: number
): PortfolioMetrics['parity'] {
  const checks: ParityCheck[] = [];
  const add = (field: string, target: number | string, got: number | string) =>
    checks.push({ field, target, got, pass: numEq(target, got) });
  add('full-history marked net', t.fullNet, r2(r.net));
  add('full-history maximum minute drawdown', t.fullMinuteDd, r2(r.dd.max));
  add('2025–2026 marked net (validation)', t.validationNet, r2(r.net - boundaryEquity));
  add('validation reset minute drawdown', t.validationResetDd, r2(r.periods[0]!.dd.max));
  add('development net (2024-12-31 close)', t.developmentNet, r2(boundaryEquity));
  add('development minute drawdown', t.developmentMinuteDd, r2(devDd));
  add('full-history realized', t.fullRealized, r2(r.realized));
  add('full-history unrealized', t.fullUnrealized, r2(r.unrealized));
  add('funded positions', t.lots, lots);
  add('funded-lot ledger signature', t.signature, String(rec.signature));
  // Every field of the archived record, including its id (the Priority 3 quad id) and the books' standalone
  // (virtual) figures, which the replay computes but never displays.
  for (const [k, want] of Object.entries(t.record)) {
    const got = rec[k];
    checks.push({ field: `record.${k}`, target: canonicalJson(want), got: canonicalJson(got), pass: canonicalRecordEq(want, got) });
  }
  return { status: checks.every((c) => c.pass) ? 'verified' : 'mismatch', checks };
}

const canonicalRecordEq = (a: unknown, b: unknown): boolean => {
  if (typeof a === 'number' && typeof b === 'number') return numEq(a, b);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => canonicalRecordEq(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return ka.join() === kb.join() && ka.every((k) => canonicalRecordEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
};

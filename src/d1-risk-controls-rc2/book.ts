// A D1 virtual book with RC 2 controls (SPECIFICATION_RC2.md): RC 1's RiskShadowBook (src/d1-risk-controls/book.ts,
// unchanged), plus the entry-day activation of the protective stop. At the fill of a position whose book uses
// entry-day activation, the first post-fill trigger of the fill's own session (exit.ts entryDayTrigger) becomes the
// position's scheduled exit for that session; from the next session on, RC 1's exit manager decides as before. No other
// exit acts on the entry session in either mode.
//
// runD1BookRc2 is RC 1's runD1BookWithControls (itself Priority 3's runD1Book) line for line, with this book and ONE
// addition: after a fill at bar k, an exit scheduled at that same bar (an entry-day trigger in the fill minute) executes
// immediately — the pool's own rule for a new lot's exits in its fill minute (src/vg-d1-growth-joint/pool.ts). With
// every book at next-session activation that addition never fires, so the result equals RC 1's exactly (gate V3).
import type { Dataset } from '../four-family/data.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import type { BookSettings, VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import type { ExitDecision, ExitReason, StrategyParams } from '../shared-margin-portfolio/strategy.ts';
import { interestOn } from '../shared-margin-portfolio/strategy.ts';
import {
  type BookId,
  type D1Grid,
  type Friction,
  type VTrade,
  baseFriction,
  bookId,
  d1KeyOf,
  d1StrategyParams
} from '../vg-d1-growth-joint/books.ts';
import { economics } from '../vg-d1-growth-joint/context.ts';
import { type RcLog, type RcTrade, type RiskVBook, RiskShadowBook } from '../d1-risk-controls/book.ts';
import { type D1RiskControls2, canonicalControls2, controlErrors2, isEntryDay, toRc1Controls } from './config.ts';
import { entryDayTrigger } from './exit.ts';

export type Sym = 'GDX' | 'VGT';

export interface RcTrade2 extends RcTrade {
  activation?: 'entry-day'; // present only on an entry-day book
  entryDayExit?: boolean; // the position exited on its entry session (entry-day books only)
}

export interface RcLog2 extends RcLog {
  trades: RcTrade2[];
  summary: RcLog['summary'] & { entryDayExits?: number }; // present only on an entry-day book
}

export type RiskVBook2 = Omit<RiskVBook, 'rc'> & { rc: RcLog2 };

export class RiskShadowBook2 extends RiskShadowBook {
  readonly entryDay: boolean;
  readonly controls2: D1RiskControls2 | null;
  entryDayExits = 0;
  private entryDayDecision: ExitDecision | null = null;

  constructor(
    symbol: Sym,
    ds: Dataset,
    params: StrategyParams,
    settings: BookSettings,
    armStart: number,
    controls: D1RiskControls2 | null
  ) {
    // RC 1's book with the RC 1 part of the controls (its canonical form; the activation dropped)
    super(symbol, ds, params, settings, armStart, controls ? (toRc1Controls(controls) ?? null) : null);
    this.controls2 = controls;
    this.entryDay = isEntryDay(controls ?? undefined) && this.resolved.stopDistanceTenths !== null;
  }

  override open(s: number, k: number): VirtualTrade {
    const trade = super.open(s, k);

    this.entryDayDecision = null;
    if (!this.entryDay) return trade;

    const rc = this.rcOf.get(trade)! as RcTrade2;

    rc.activation = 'entry-day';
    rc.entryDayExit = false;

    const position = this.position!;
    const level = rc.protectiveLevel!;
    const p = entryDayTrigger(this.ds, s, k, level, this.settings.stopFill);

    if (!p) return trade;

    const exit = position.exit;
    const decision: ExitDecision = {
      reason: 'protective stop' as ExitReason,
      barIndex: p.barIndex,
      price: p.price,
      time: p.time,
      execution: p.execution,
      isMaximumHoldDue: false, // the entry session: no hold age
      signalTime: NaN,
      signalPrice: NaN,
      stopPrice: exit.stopPrice,
      stopActive: exit.isStopActive(position.lot, s)
    };

    if (interestOn(position.lot, this.settings.rate, this.ds.sTime[s]!) !== 0) throw new Error('entry-day interest');
    position.decision = decision;
    this.entryDayDecision = decision;
    return trade;
  }

  override close(s: number, decision: ExitDecision): VirtualTrade {
    const entryDay = decision === this.entryDayDecision;
    const trade = super.close(s, decision);

    if (entryDay) {
      const rc = this.rcOf.get(trade)! as RcTrade2;

      this.entryDayExits++;
      rc.entryDayExit = true;
      rc.hold.effectiveDaysAtExit = null; // no hold was evaluated: the position never reached a session start
      this.entryDayDecision = null;
    }
    return trade;
  }

  override log(): RcLog2 {
    const l = super.log() as RcLog2;

    if (!this.entryDay) return l;
    return {
      ...l,
      controls: canonicalControls2(this.controls2 ?? undefined) as RcLog2['controls'],
      summary: { ...l.summary, entryDayExits: this.entryDayExits }
    };
  }
}

// ----- the book runner: RC 1's runD1BookWithControls with the RC 2 book and the fill-minute exit -----

export const runD1BookRc2 = (
  ds: Dataset,
  s0: Sym,
  grid: D1Grid,
  controls: D1RiskControls2 | undefined | null,
  opts: { armStart: number; accountingStart: number; endIndex: number; friction?: Friction }
): RiskVBook2 => {
  const id: BookId = bookId('D1', s0);
  const errors = controls ? controlErrors2(id, controls) : [];

  if (errors.length) throw new Error(`${id}: ${errors.join('; ')}`);

  const canonical = canonicalControls2(controls ?? undefined);
  const h = canonical?.hold;

  if (h?.mode === 'adaptive' && !(h.extendedHoldDays > grid.maximumHoldDays))
    throw new Error(`${id}: extendedHoldDays ${h.extendedHoldDays} must exceed maximumHoldDays ${grid.maximumHoldDays}`);

  const fr = opts.friction ?? baseFriction;
  const params = d1StrategyParams(s0, grid);
  const settings: BookSettings = {
    notional: economics.notional,
    rate: fr.rate,
    stopFill: fr.stopFill,
    costBps: fr.costBps,
    stopSlippageBps: fr.stopSlippageBps
  };
  const book = new RiskShadowBook2(s0, ds, params, settings, opts.armStart, canonical);
  const out: VTrade[] = [];
  const byTrade = new Map<VirtualTrade, VTrade>();
  const minute = new Tracker(0, ds.bTime[ds.sBarStart[opts.accountingStart]!]!);
  const daily = new Tracker(0, ds.sTime[opts.accountingStart]!);
  let realized = 0;

  const close = (s: number, k: number) => {
    const decision = book.exitAt(k);

    if (!decision) return;

    const trade = book.close(s, decision);
    const v = byTrade.get(trade)!;

    v.fills.push({
      s,
      k: decision.barIndex,
      t: decision.time,
      raw: decision.price,
      price: trade.exitPrice,
      partial: false,
      f: 1,
      reason: decision.reason
    });
    v.vNet = trade.net;
    v.vInterest = trade.interest;
    realized += trade.net;
  };
  const fill = (s: number, k: number) => {
    if (!book.fillAt(k)) return false;

    const trade = book.open(s, k);
    const v = byTrade.get(trade)!;

    v.eS = s;
    v.eK = k;
    v.eT = trade.entryTime;
    v.eRaw = trade.entryRawPrice;
    v.ePrice = trade.entryPrice;
    return true;
  };
  const mark = (price: number, s: number, t: number) =>
    minute.updateStrict(realized + book.markAt(price, ds.sTime[s]!), t);

  for (let s = opts.accountingStart + 1; s <= opts.endIndex; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;

    book.beginSession(s);

    for (let k = 0; k < count; k++) {
      const heldBefore = Boolean(book.position);

      close(s, k);
      // RC 2: a new position's exit in its own fill minute (an entry-day trigger at bar k) executes after the fill
      if (fill(s, k)) close(s, k);

      const signal = book.processBar(s, k);

      if (signal) {
        const trade = book.commit(signal, s, 'granted');
        const v: VTrade = {
          book: id,
          id: trade.id,
          kind: trade.setupKind,
          dS: s,
          dT: trade.decisionTime,
          dPrice: trade.decisionPrice,
          eS: -1,
          eK: -1,
          eT: NaN,
          eRaw: NaN,
          ePrice: NaN,
          fills: [],
          open: false,
          vNet: 0,
          vInterest: 0
        };

        byTrade.set(trade, v);
        out.push(v);
      }

      if (heldBefore || book.position) mark(ds.bClose[start + k]!, s, ds.bTime[start + k]!);
    }

    close(s, count);
    fill(s, count); // a closing-print fill has no observable price after it in its session
    book.afterSession(s);
    mark(ds.sClose[s]!, s, ds.sCloseTime[s]!);
    daily.updateStrict(realized + book.markAt(ds.sClose[s]!, ds.sTime[s]!), ds.sTime[s]!);
  }

  book.finish(opts.endIndex);

  for (const [trade, v] of byTrade) {
    if (v.eS >= 0 && v.fills.length === 0) {
      v.open = true;
      v.vNet = trade.net;
      v.vInterest = trade.interest;
    }
  }

  for (let i = 1; i < out.length; i++)
    if (out[i]!.dT <= out[i - 1]!.dT) throw new Error(`${id}: decisions are not strictly ordered`);

  const rcTag = canonical && isEntryDay(canonical) ? 'rc2' : 'rc1';

  return {
    book: id,
    key: canonical ? `${d1KeyOf(grid)}|${rcTag}:${JSON.stringify(canonical)}` : d1KeyOf(grid),
    trades: out,
    signals: book.signals.length,
    firstDecision: out[0] ? ds.dates[out[0].dS]! : null,
    endIndex: opts.endIndex,
    standalone: {
      net: realized + book.markAt(ds.sClose[opts.endIndex]!, ds.sTime[opts.endIndex]!),
      realized,
      minuteDd: minute.stats().maximum,
      dailyDd: daily.stats().maximum
    },
    rc: book.log()
  };
};

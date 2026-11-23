// RC 3 of the D1 book: RC 2's RiskShadowBook2 (src/d1-risk-controls-rc2/book.ts, unchanged) plus the optional S1
// staged trailing stop (staged-stop@1, research/vg-l0-staged-stop/RULE_SPECIFICATION.md §1.1). The book hooks the
// tracker in immediately after its exit manager's onEntry (in open, after RC 2's open — which ran RC 1's open, where the
// RiskExitManager replaced the frozen ExitManager after the same onEntry) and immediately after the manager's
// afterSession (ShadowBook.afterSession's own condition: a position open, not on its entry session). No other code
// changes: the manager decides eligibility, triggers, fills, reasons and precedence exactly as before.
//
// RC 2's entry-day decision (a protective trigger in the fill's own session) is built inside RC 2's open, before the
// hook, from the manager's stopPrice / isStopActive. Its trigger uses only the protective level; its two record-only
// fields are re-taken after the hook on the SAME object (RC 2's close recognizes it by identity).
//
// runD1BookRc3 is RC 2's runD1BookRc2 line for line with this book. A book with the stage OFF never runs here: the
// pooled runner (run.ts) calls runD1BookRc2 itself, so OFF is the existing code path, not an imitation of it.
import type { Dataset } from '../four-family/data.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import type { BookSettings, VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import type { ExitDecision, StrategyParams } from '../shared-margin-portfolio/strategy.ts';
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
import { type RiskVBook2, RiskShadowBook2 } from '../d1-risk-controls-rc2/book.ts';
import {
  type D1RiskControls2,
  canonicalControls2,
  controlErrors2,
  isEntryDay
} from '../d1-risk-controls-rc2/config.ts';
import { type StagedBookConfig, bookErrors, bookKeySuffix, tau1TenthsOfD1 } from '../staged-stop/config.ts';
import { type StagedLite, type StagedRow, StagedTracker } from '../staged-stop/tracker.ts';

export type Sym = 'GDX' | 'VGT';

export type RiskVBook3 = RiskVBook2 & { staged: StagedLite; stagedRows?: StagedRow[] };

export class RiskShadowBook3 extends RiskShadowBook2 {
  readonly staged: StagedTracker;

  constructor(
    symbol: Sym,
    ds: Dataset,
    params: StrategyParams,
    settings: BookSettings,
    armStart: number,
    controls: D1RiskControls2 | null,
    staged: StagedBookConfig,
    detail = false
  ) {
    super(symbol, ds, params, settings, armStart, controls);
    this.staged = new StagedTracker(staged, params.trailingStopPercentage, detail);
  }

  override open(s: number, k: number): VirtualTrade {
    const trade = super.open(s, k);
    const position = this.position!;

    this.staged.onEntry(position.exit, trade.entryRawPrice, s, this.ds.sClose[s]!);

    const d = position.decision; // RC 2's entry-day decision, if any (the frozen open leaves it undefined)

    if (d) {
      d.stopPrice = position.exit.stopPrice;
      d.stopActive = position.exit.isStopActive(position.lot, s);
    }
    return trade;
  }

  override close(s: number, decision: ExitDecision): VirtualTrade {
    this.staged.onExitEvent(decision.reason, s, decision.price, this.position!.exit, true);
    return super.close(s, decision);
  }

  override afterSession(s: number) {
    super.afterSession(s);
    if (this.position && this.position.trade.entryIndex !== s)
      this.staged.afterSession(this.position.exit, s, this.ds.sClose[s]!);
  }
}

// ----- the book runner: RC 2's runD1BookRc2 with the RC 3 book (staged ON) -----

export const runD1BookRc3 = (
  ds: Dataset,
  s0: Sym,
  grid: D1Grid,
  controls: D1RiskControls2 | undefined | null,
  staged: StagedBookConfig,
  opts: { armStart: number; accountingStart: number; endIndex: number; friction?: Friction; detail?: boolean }
): RiskVBook3 => {
  const id: BookId = bookId('D1', s0);
  const errors = controls ? controlErrors2(id, controls) : [];

  errors.push(...bookErrors(id, staged, tau1TenthsOfD1(grid.trailingStopPercentage)));
  if (errors.length) throw new Error(`${id}: ${errors.join('; ')}`);

  const canonical = canonicalControls2(controls ?? undefined);
  const h = canonical?.hold;

  if (h?.mode === 'adaptive' && !(h.extendedHoldDays > grid.maximumHoldDays))
    throw new Error(
      `${id}: extendedHoldDays ${h.extendedHoldDays} must exceed maximumHoldDays ${grid.maximumHoldDays}`
    );

  const fr = opts.friction ?? baseFriction;
  const params = d1StrategyParams(s0, grid);
  const settings: BookSettings = {
    notional: economics.notional,
    rate: fr.rate,
    stopFill: fr.stopFill,
    costBps: fr.costBps,
    stopSlippageBps: fr.stopSlippageBps
  };
  const book = new RiskShadowBook3(s0, ds, params, settings, opts.armStart, canonical, staged, opts.detail === true);
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
  const baseKey = canonical ? `${d1KeyOf(grid)}|${rcTag}:${JSON.stringify(canonical)}` : d1KeyOf(grid);

  return {
    book: id,
    key: `${baseKey}${bookKeySuffix(staged)}`,
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
    rc: book.log(),
    staged: book.staged.lite(),
    ...(book.staged.rows ? { stagedRows: book.staged.rows } : {})
  };
};

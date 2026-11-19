// A D1 virtual book with risk controls (SPECIFICATION.md §4–§8): the frozen ShadowBook (src/multi-etf-allocator/
// shadow.ts), extended — never edited — with
// - the exit side of each new position (RiskExitManager: the protective stop and the hold policy), installed at the
//   fill in place of the frozen ExitManager after the same onEntry;
// - stop slippage on protective fills (the stress applies to them exactly as to trailing-stop fills);
// - the decline gate: episodes of failed attempts (virtual exits with net ≤ 0), the block after K of them, and its end
//   by recovery, cooldown or a profitable exit; while blocked, arming is refused (the frozen machine is not called);
// - the per-trade and event logs.
//
// runD1BookWithControls is Priority 3's runD1Book (src/vg-d1-growth-joint/books.ts) line for line with this book in
// place of ShadowBook: with every control at its default its VBook equals runD1Book's exactly (parity gates).
import type { Dataset } from '../four-family/data.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { type BookSettings, type VirtualTrade, ShadowBook } from '../multi-etf-allocator/shadow.ts';
import type { ExitDecision, ReboundSignal, SetupKind, StrategyParams } from '../shared-margin-portfolio/strategy.ts';
import {
  type BookId,
  type D1Grid,
  type Friction,
  type VBook,
  type VTrade,
  baseFriction,
  bookId,
  d1KeyOf,
  d1StrategyParams
} from '../vg-d1-growth-joint/books.ts';
import { economics } from '../vg-d1-growth-joint/context.ts';
import { type D1RiskControls, type Resolved, canonicalControls, controlErrors, resolve } from './config.ts';
import { type ExitPolicy, type HoldRuntime, RiskExitManager, isProtective } from './exit.ts';

export type Sym = 'GDX' | 'VGT';

export interface RcTrade {
  trade: number;
  decisionDate: string;
  gate: 'off' | 'no episode' | 'within allowance';
  episode: number | null;
  lossesBefore: number;
  entryDate: string | null;
  entryRaw: number | null;
  protectiveLevel: number | null;
  hold: {
    mode: 'legacy' | 'disabled' | 'adaptive';
    baseDays: number;
    extendedDays: number | null;
    extendedFrom: string | null;
    effectiveDaysAtExit: number | null;
  };
  exitDate: string | null;
  exitReason: string;
  exitControl: string;
  net: number;
}

export interface RcEvent {
  type: 'episode start' | 'failed attempt' | 'block engaged' | 'arming refused' | 'episode end';
  date: string;
  t: number;
  episode: number;
  [k: string]: unknown;
}

export interface RcSummary {
  protectiveExits: number;
  protectiveGapExits: number;
  maximumHoldExits: number;
  adaptiveExtensions: number;
  episodes: number;
  blocks: number;
  blockedSessions: number;
  blockedMinutes: number;
}

export interface RcLog {
  controls: D1RiskControls | null;
  trades: RcTrade[];
  events: RcEvent[];
  summary: RcSummary;
}

export type RiskVBook = VBook & { rc: RcLog };

// ----- the decline gate (SPECIFICATION.md §6) -----

interface Episode {
  id: number;
  refHigh: number;
  low: number;
  losses: number;
  blockedFrom: number; // the session index at which the block engaged, -1 = not blocked
  refusal: { s: number; firstT: number; kind: SetupKind; close: number; minutes: number } | null;
}

export class DeclineGate {
  episode: Episode | null = null;
  episodes = 0;
  blocks = 0;
  blockedSessions = 0;
  blockedMinutes = 0;

  constructor(
    readonly ds: Dataset,
    readonly cfg: NonNullable<Resolved['gate']>,
    readonly events: RcEvent[]
  ) {}

  get blocked() {
    return this.episode !== null && this.episode.blockedFrom >= 0;
  }

  private event(type: RcEvent['type'], s: number, t: number, extra: Record<string, unknown> = {}) {
    this.events.push({ type, date: this.ds.dates[s]!, t, episode: this.episode!.id, ...extra });
  }

  resetLevel(e: Episode) {
    return e.low + (this.cfg.recoveryTenths / 1000) * (e.refHigh - e.low);
  }

  // The state a new decision is taken in (never blocked: arming is refused while blocked).
  stateAtDecision(): Pick<RcTrade, 'gate' | 'episode' | 'lossesBefore'> {
    if (this.blocked) throw new Error('a decision while the decline gate is blocked');
    return this.episode
      ? { gate: 'within allowance', episode: this.episode.id, lossesBefore: this.episode.losses }
      : { gate: 'no episode', episode: null, lossesBefore: 0 };
  }

  // A virtual exit: a failed attempt (net ≤ 0) starts or extends the episode and may engage the block; a profitable
  // exit ends an unblocked episode.
  onExit(s: number, t: number, trade: VirtualTrade) {
    const e = this.episode;

    if (trade.net > 0) {
      if (e && e.blockedFrom >= 0) throw new Error('a profitable exit while the decline gate is blocked');
      if (e) this.end(s, t, 'profitable exit', { trade: trade.id });
      return;
    }

    if (!e) {
      this.episode = {
        id: ++this.episodes,
        refHigh: trade.referenceHigh,
        low: Infinity,
        losses: 1,
        blockedFrom: -1,
        refusal: null
      };
      this.event('episode start', s, t, { trade: trade.id, refHigh: trade.referenceHigh, net: trade.net });
    } else {
      e.losses++;
      this.event('failed attempt', s, t, { trade: trade.id, losses: e.losses, net: trade.net });
    }

    const ep = this.episode!;

    if (ep.losses >= this.cfg.losses && ep.blockedFrom < 0) {
      ep.blockedFrom = s;
      this.blocks++;
      this.event('block engaged', s, t, { losses: ep.losses, maxBlockSessions: this.cfg.maxBlockSessions });
    }
  }

  // An arming refused at minute k of session s (one event per session; the minutes are counted).
  refuse(s: number, t: number, kind: SetupKind, close: number) {
    const e = this.episode!;

    this.blockedMinutes++;
    if (e.refusal && e.refusal.s === s) e.refusal.minutes++;
    else {
      this.flushRefusal();
      e.refusal = { s, firstT: t, kind, close, minutes: 1 };
      this.blockedSessions++;
    }
  }

  private flushRefusal() {
    const e = this.episode;

    if (!e?.refusal) return;

    const r = e.refusal;

    this.events.push({
      type: 'arming refused',
      date: this.ds.dates[r.s]!,
      t: r.firstT,
      episode: e.id,
      kind: r.kind,
      close: r.close,
      minutes: r.minutes,
      losses: e.losses,
      refHigh: e.refHigh,
      low: e.low,
      resetLevel: this.resetLevel(e)
    });
    e.refusal = null;
  }

  private end(s: number, t: number, reason: string, extra: Record<string, unknown> = {}) {
    const e = this.episode!;

    this.flushRefusal();
    this.event('episode end', s, t, { reason, losses: e.losses, refHigh: e.refHigh, low: e.low, ...extra });
    this.episode = null;
  }

  // The session close: the episode low, then the recovery reset, then the cooldown (effective from the next session).
  afterClose(s: number) {
    const e = this.episode;

    if (!e) return;

    const close = this.ds.sClose[s]!;

    e.low = Math.min(e.low, close);

    const level = this.resetLevel(e);

    if (close >= level) this.end(s, this.ds.sCloseTime[s]!, 'recovery', { close, resetLevel: level });
    else if (e.blockedFrom >= 0 && s - e.blockedFrom >= this.cfg.maxBlockSessions)
      this.end(s, this.ds.sCloseTime[s]!, 'block expired', { close, resetLevel: level, blockedFrom: this.ds.dates[e.blockedFrom] });
  }

  finish(endIndex: number) {
    if (this.episode) this.end(endIndex, this.ds.sCloseTime[endIndex]!, 'open at end');
  }
}

// ----- the book -----

const holdRuntime = (r: Resolved, params: StrategyParams, entryRaw: number): HoldRuntime => {
  const h = r.hold;

  if (h.mode === 'legacy') return { mode: 'legacy', days: params.maximumHoldDays };
  if (h.mode === 'disabled') return { mode: 'disabled' };
  return {
    mode: 'adaptive',
    baseDays: params.maximumHoldDays,
    extendedDays: h.extendedHoldDays,
    progressPrice: entryRaw * (1 + h.progressTenths / 1000)
  };
};

export class RiskShadowBook extends ShadowBook {
  readonly resolved: Resolved;
  readonly gate: DeclineGate | null;
  readonly events: RcEvent[] = [];
  readonly rcOf = new Map<VirtualTrade, RcTrade>();
  readonly rcTrades: RcTrade[] = [];
  protectiveExits = 0;
  protectiveGapExits = 0;
  maximumHoldExits = 0;
  adaptiveExtensions = 0;

  constructor(
    symbol: Sym,
    ds: Dataset,
    params: StrategyParams,
    settings: BookSettings,
    armStart: number,
    readonly controls: D1RiskControls | null
  ) {
    super(symbol as never, 'd1' as never, ds, params, settings, armStart);
    this.resolved = resolve(controls ?? undefined);
    this.gate = this.resolved.gate ? new DeclineGate(ds, this.resolved.gate, this.events) : null;
  }

  // Bar k completes. While the gate is blocked and the book is flat with nothing armed, arming is refused: the frozen
  // machine is not called for the minute (its only effect would be the arming).
  override processBar(s: number, k: number): ReboundSignal | undefined {
    if (this.gate?.blocked && !this.positionAtStart && !this.exitedThisSession && !this.order && !this.position) {
      if (this.machine.setup) throw new Error(`${this.symbol}: a setup is armed while the decline gate is blocked`);
      if (this.machine.continuationActive)
        throw new Error(`${this.symbol}: a continuation window is open while the decline gate is blocked`);

      const b = this.ds.sBarStart[s]! + k;
      const kind = this.machine.armingKind(s, this.ds.bClose[b]!);

      if (kind) this.gate.refuse(s, this.ds.bTime[b]! + 60, kind, this.ds.bClose[b]!);
      return undefined;
    }

    return super.processBar(s, k);
  }

  override commit(signal: ReboundSignal, s: number, outcome: 'granted' | 'refused'): VirtualTrade {
    const trade = super.commit(signal, s, outcome);
    const gate = this.gate ? this.gate.stateAtDecision() : { gate: 'off' as const, episode: null, lossesBefore: 0 };
    const rc: RcTrade = {
      trade: trade.id,
      decisionDate: this.ds.dates[s]!,
      ...gate,
      entryDate: null,
      entryRaw: null,
      protectiveLevel: null,
      hold: {
        mode: this.resolved.hold.mode,
        baseDays: this.params.maximumHoldDays,
        extendedDays: this.resolved.hold.mode === 'adaptive' ? this.resolved.hold.extendedHoldDays : null,
        extendedFrom: null,
        effectiveDaysAtExit: null
      },
      exitDate: null,
      exitReason: 'open',
      exitControl: 'open',
      net: 0
    };

    this.rcOf.set(trade, rc);
    this.rcTrades.push(rc);
    return trade;
  }

  // The fill: the frozen open (the frozen ExitManager's onEntry), then this position's controlled exit manager, built
  // from the same inputs and given the same onEntry.
  override open(s: number, k: number): VirtualTrade {
    const trade = super.open(s, k);
    const position = this.position!;
    const raw = trade.entryRawPrice;
    const d = this.resolved.stopDistanceTenths;
    const policy: ExitPolicy = {
      protectiveLevel: d === null ? null : raw * (1 - d / 1000),
      hold: holdRuntime(this.resolved, this.params, raw)
    };
    const exit = new RiskExitManager(
      this.ds,
      this.params,
      { stopFill: this.settings.stopFill, marginInterestRate: this.settings.rate },
      policy
    );

    exit.onEntry(position.lot, s, k, raw);
    position.exit = exit;

    const rc = this.rcOf.get(trade)!;

    rc.entryDate = this.ds.dates[s]!;
    rc.entryRaw = raw;
    rc.protectiveLevel = policy.protectiveLevel;
    return trade;
  }

  override close(s: number, decision: ExitDecision): VirtualTrade {
    const exit = this.position!.exit as RiskExitManager;
    const trade = super.close(s, decision);
    const protective = isProtective(decision.reason);

    // the stop-slippage stress on protective fills (the frozen close slips trailing-stop fills only); a protective
    // exit loses with or without it, so the continuation rule (net > 0) saw the same sign
    if (protective && this.settings.stopSlippageBps !== 0) {
      if (trade.net > 0) throw new Error('a profitable protective exit');

      const price = this.sellPrice(decision.price) * (1 - this.settings.stopSlippageBps / 10000);
      const proceeds = trade.shares * price;

      trade.exitPrice = price;
      trade.gross = proceeds - trade.investment;
      trade.net = proceeds - trade.investment - trade.interest;
    }

    if (protective) {
      this.protectiveExits++;
      if ((decision.reason as string) === 'protective stop gap') this.protectiveGapExits++;
    }
    if (decision.reason === 'maximum hold') this.maximumHoldExits++;

    const rc = this.rcOf.get(trade)!;

    rc.exitDate = this.ds.dates[s]!;
    rc.exitReason = decision.reason;
    rc.exitControl = protective ? 'protective stop' : decision.reason;
    rc.net = trade.net;
    rc.hold.effectiveDaysAtExit = exit.effectiveHold;
    rc.hold.extendedFrom = exit.extendedFrom >= 0 ? this.ds.dates[exit.extendedFrom]! : null;
    if (exit.extendedFrom >= 0) this.adaptiveExtensions++;
    this.gate?.onExit(s, decision.time, trade);
    return trade;
  }

  override afterSession(s: number) {
    super.afterSession(s);
    this.gate?.afterClose(s);
  }

  override finish(endIndex: number) {
    super.finish(endIndex);

    if (this.position) {
      const { trade, exit } = this.position;
      const rc = this.rcOf.get(trade)!;
      const x = exit as RiskExitManager;

      rc.net = trade.net;
      rc.hold.effectiveDaysAtExit = Number.isNaN(x.effectiveHold) ? null : x.effectiveHold;
      rc.hold.extendedFrom = x.extendedFrom >= 0 ? this.ds.dates[x.extendedFrom]! : null;
    }
    this.gate?.finish(endIndex);
  }

  log(): RcLog {
    return {
      controls: this.controls,
      trades: this.rcTrades,
      events: this.events,
      summary: {
        protectiveExits: this.protectiveExits,
        protectiveGapExits: this.protectiveGapExits,
        maximumHoldExits: this.maximumHoldExits,
        adaptiveExtensions: this.adaptiveExtensions,
        episodes: this.gate?.episodes ?? 0,
        blocks: this.gate?.blocks ?? 0,
        blockedSessions: this.gate?.blockedSessions ?? 0,
        blockedMinutes: this.gate?.blockedMinutes ?? 0
      }
    };
  }
}

// ----- the book runner: runD1Book with the controlled book -----

export const runD1BookWithControls = (
  ds: Dataset,
  s0: Sym,
  grid: D1Grid,
  controls: D1RiskControls | undefined | null,
  opts: { armStart: number; accountingStart: number; endIndex: number; friction?: Friction }
): RiskVBook => {
  const id: BookId = bookId('D1', s0);
  const errors = controls ? controlErrors(id, controls) : [];

  if (errors.length) throw new Error(`${id}: ${errors.join('; ')}`);

  const canonical = canonicalControls(controls ?? undefined);
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
  const book = new RiskShadowBook(s0, ds, params, settings, opts.armStart, canonical);
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
    if (!book.fillAt(k)) return;

    const trade = book.open(s, k);
    const v = byTrade.get(trade)!;

    v.eS = s;
    v.eK = k;
    v.eT = trade.entryTime;
    v.eRaw = trade.entryRawPrice;
    v.ePrice = trade.entryPrice;
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
      fill(s, k);

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
    fill(s, count);
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

  return {
    book: id,
    key: canonical ? `${d1KeyOf(grid)}|rc1:${JSON.stringify(canonical)}` : d1KeyOf(grid),
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

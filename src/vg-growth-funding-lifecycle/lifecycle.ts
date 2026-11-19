// vg-growth-funding-lifecycle (Priority 5A): the EXPERIMENTAL, study-specific Growth funding lifecycles L1 and L2
// (research/vg-growth-funding-lifecycle/PROTOCOL.md §5). Never a production or canonical default: Strategy Lab and the
// canonical engine (src/growth-trading/) are unchanged and never call this file.
//
// WHAT THIS FILE IS. `simulateLifecycle` is a study-local copy of the canonical orchestrator `simulateTrading`
// (src/growth-trading/riseTrading.ts, v1.4.0, file sha256 78b3423c…4018b, lines 496–1062) — every line identical except
// the marked `LIFECYCLE` insertions — driving the UNCHANGED canonical components (ShadowBook, EntryGates,
// ContinuationController, PositionRules, DrawdownRecoveryGate). With `life` null (or mode L0) it is the canonical
// simulation exactly (tests/parity.test.ts: field for field against simulateTrading on real data).
//
// WHY A COPY. The canonical harness capacity hook (GateRuntime.capacity) does not express L1 (audit, PROTOCOL.md §5.2):
// it is asked BEFORE the trend filter, the Drawdown Recovery Gate and the initial-stop availability; a block of an
// eligibility opportunity leaves the opportunity armed and re-evaluated at every later bar (an automatic funding retry,
// i.e. an L2-like rule inside native eligibility). The refusal must instead happen where a request reaches the
// allocator — at the book's order (ShadowBook.commit) — after every gate passed.
//
// L1 (`LifecycleBook.commit`): every Growth order (base crossing, latched / renewal / drawdown-release decision,
// continuation trigger) first asks the allocator (`ask`). Granted: the canonical order. Refused: the decision-time
// transitions stay canonical (the opportunity is consumed, a renewal watch cancelled, an open continuation episode
// closed by base priority, a triggered episode ended, a live opportunity superseded by a continuation trigger), but NO
// order and NO position exist: the book's D1 machine is cleared as under D1's cancel semantics, so the book is flat,
// keeps observing the market and decides again only under its own canonical rules. No refusal is queued or retried.
//
// L2: L1 plus ONE retained refused BASE opportunity per book (continuation refusals stay L1): reassessed at every
// completed signal bar while the book is flat with no order, after the canonical decisions of that instant; terminal on
// expiry (20 sessions from the refused decision, or the originating opportunity's earlier native bound), invalidation
// (the entry predicate, the setup's own policy conditions, the 5% extension guard), a newer refused base request
// (superseded), or any granted entry; blocked (kept) by the trend filter / drawdown gate / initial-stop availability;
// waiting (kept) while the allocator says the slot is occupied. A pass with the slot available places an order filled at
// the next eligible trade (canonical commit), initialized from that fill only.
import type { Dataset } from '../four-family/data.ts';
import type { PhenotypeName, Sym } from '../multi-etf-allocator/context.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import {
  type BookSettings,
  type DecisionOutcome as AllocatorOutcome,
  type VirtualTrade,
  ShadowBook
} from '../multi-etf-allocator/shadow.ts';
import type { SignalBar } from '../entry-signals/bars.ts';
import { ContinuationController, DecisionLog, type LogValue } from '../growth-trading/continuation.ts';
import {
  type EligibilityConfig,
  EntryGates,
  type GateRuntime,
  type GatedDecision,
  type Opportunity,
  risePredicateStates
} from '../growth-trading/entryGates.ts';
import { DrawdownRecoveryGate } from '../growth-trading/drawdownGate.ts';
import {
  type BreakoutEntryConfig,
  type EntryMethod,
  PositionRules,
  type ProtectionCheck,
  sessionSma
} from '../growth-trading/optionalRules.ts';
import {
  type DecisionOutcome,
  type EntryDecision,
  type Excursion,
  type DailyMark,
  type GateVetoReason,
  type Simulation,
  type SimulationOptions,
  STRATEGY_KEY,
  gateLogValues,
  lastMinuteBefore,
  originOf
} from '../growth-trading/riseTrading.ts';
import type { ReboundSignal, Setup, SetupKind } from '../shared-margin-portfolio/strategy.ts';

// ----- the lifecycle runtime -----

export type Mode = 'L0' | 'L1' | 'L2';
export const modes: readonly Mode[] = ['L0', 'L1', 'L2'];

// L2's fixed experimental constants (the brief §5; never optimized, never changed after results).
export const L2 = { maxAgeSessions: 20, maxExtension: 0.05 } as const;

export type AskKind = 'base' | 'continuation' | 'retained';

// The allocator's answer to one request of this book at (s, t): true = the slot is available (the order is granted).
export type Ask = (s: number, t: number, kind: AskKind) => boolean;

export interface LifeRequest {
  seq: number;
  t: number;
  s: number;
  kind: AskKind;
  setupKind: string; // rise | trend_breakout | a continuation method
  price: number; // the decision price
  available: boolean;
  outcome: 'granted' | 'refused' | 'waiting'; // waiting: an L2 reassessment that found the slot occupied (no order)
  trade: VirtualTrade | null; // granted: the order; refused: the phantom (never an order); waiting: null
  retained: string | null; // the retained opportunity (L2) this request belongs to or creates
}

export type RetainedEnd =
  | 'entered' // its own reassessment was granted: an order was placed
  | 'consumed_by_entry' // another source's request was granted (any actual entry clears it)
  | 'superseded' // a newer refused base request replaced it
  | 'expired'
  | 'invalidated'
  | 'end_of_data';

export interface Retained {
  id: string; // R-1, R-2 … per book
  origin: string; // crossing | breakout | opportunity:<kind>:<policy>
  refusedTrade: VirtualTrade; // the phantom of the refused base request
  refusedTime: number;
  refusedSession: number;
  refusedPrice: number; // the original refused decision price (the 5% guard's reference)
  trigger: number; // the decision's trigger (Rise threshold; breakout: the prior high broken)
  reference: number; // Rise: the recent low; breakout: the SMA at the signal
  opportunity: Opportunity | null; // the native eligibility opportunity it came from (null: eligibility OFF)
  policy: string | null;
  bound: number; // the last session it may decide in (min(refused + 20, native last eligible session))
  maxClose: number; // deterioration policy: the highest completed-bar close since the native arming
  evaluations: number;
  blocked: Record<string, number>; // gate blocks by reason (kept)
  waits: number; // reassessments with every check passed but the slot occupied (kept)
  end: RetainedEnd | null;
  endTime: number;
  endSession: number;
  endReason: string;
  entryTrade: VirtualTrade | null;
  transitions: { t: number; s: number; event: string; reason: string; values?: Record<string, LogValue> }[];
}

export interface LifeRuntime {
  mode: Mode;
  ask: Ask;
  bars: readonly SignalBar[]; // the run-resolution bars (the retained reassessment schedule; L2)
  rise: { advanceFromRecentLowPercent: number; recentLowLookbackBars: number } | null; // Rise entry (L2 predicate)
  breakout: BreakoutEntryConfig | null; // breakout entry (L2 predicate)
}

export interface LifeOutcome {
  mode: Mode;
  requests: LifeRequest[];
  retained: Retained[];
}

// ----- the book -----

// The canonical ShadowBook whose `commit` first asks the allocator. Granted (or pre-approved by an L2 reassessment that
// already asked at this instant): exactly the canonical commit. Refused: the trade object is created (callers need it
// and the decision log names it) but never becomes an order: `order` is cleared and the D1 machine's pending signal and
// any armed setup are cleared (D1's cancel semantics), so the book is flat with no order.
export class LifecycleBook extends ShadowBook {
  preApproved = false;
  onRequest: (trade: VirtualTrade, s: number, signal: ReboundSignal, available: boolean, kind: AskKind) => void = () =>
    undefined;

  constructor(
    symbol: Sym,
    phenotype: PhenotypeName,
    ds: Dataset,
    params: ConstructorParameters<typeof ShadowBook>[3],
    settings: BookSettings,
    armStart: number,
    private readonly ask: Ask
  ) {
    super(symbol, phenotype, ds, params, settings, armStart);
  }

  override commit(signal: ReboundSignal, s: number, outcome: AllocatorOutcome): VirtualTrade {
    if (outcome !== 'granted') throw new Error('the canonical callers always commit as granted');

    const kind = String(signal.setup.kind);
    const base = kind === 'rise' || kind === 'trend_breakout';
    const pre = this.preApproved;

    this.preApproved = false;

    const askKind: AskKind = pre ? 'retained' : base ? 'base' : 'continuation';
    const available = pre || this.ask(s, signal.decisionTime, askKind);

    if (available) {
      const trade = super.commit(signal, s, 'granted');

      this.onRequest(trade, s, signal, true, askKind);
      return trade;
    }

    const trade = super.commit(signal, s, 'refused');

    this.order = undefined;
    this.machine.clearSetup('cancelled', s);
    this.onRequest(trade, s, signal, false, askKind);
    return trade;
  }
}

const prefixed = (prefix: string, values: Record<string, LogValue>) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [`${prefix}${k}`, v]));

const atOrBelow = (x: number, level: number) => x <= level * (1 + 1e-12);
const atOrAbove = (x: number, level: number) => x >= level * (1 - 1e-12);
const pct = (p: number) => {
  const f = Number(`${p}e-2`);

  return Number.isFinite(f) ? f : p / 100;
};

export type LifeSimulation = Simulation & { life: LifeOutcome | null };

// ----- the request log and L2's retained opportunity -----

interface Ctx {
  enter: (d: Pick<EntryDecision, 'id' | 'time' | 'price' | 'trigger' | 'reference'>, s: number) => VirtualTrade;
  gates: EntryGates | null;
  rules: PositionRules | null;
  protect: (s: number, time: number, source: string) => ProtectionCheck;
  outcomes: DecisionOutcome[];
  byTrade: Map<VirtualTrade, DecisionOutcome>;
  entryMethod: EntryMethod;
}

const lifecycleState = (ds: Dataset, life: LifeRuntime, book: LifecycleBook, ctx: Ctx) => {
  const requests: LifeRequest[] = [];
  const retainedList: Retained[] = [];
  const resolved = new Set<Retained>();
  const l2 = life.mode === 'L2';
  const breakout = ctx.entryMethod === 'trend_breakout';

  if (l2 && breakout && !life.breakout) throw new Error('L2: a breakout book needs its breakout configuration');
  if (l2 && !breakout && !life.rise) throw new Error('L2: a Rise book needs its Rise parameters');

  const predicate =
    l2 && !breakout
      ? risePredicateStates(life.bars, life.rise!.advanceFromRecentLowPercent, life.rise!.recentLowLookbackBars)
      : null;
  let current: Retained | null = null;
  let own: Retained | null = null; // the retained opportunity whose pre-approved order is being placed
  let lastAskT = -Infinity;
  let next = 0;

  const note = (r: Retained, t: number, s: number, event: string, reason: string, values?: Record<string, LogValue>) =>
    r.transitions.push({ t, s, event, reason, ...(values ? { values } : {}) });

  const end = (
    r: Retained,
    e: RetainedEnd,
    t: number,
    s: number,
    reason: string,
    values?: Record<string, LogValue>
  ) => {
    r.end = e;
    r.endTime = t;
    r.endSession = s;
    r.endReason = reason;
    note(r, t, s, e, reason, values);
    if (current === r) current = null;
  };

  // The native eligibility opportunity (and the gated decision kind) the refused base request came from, once the
  // canonical call that placed the request has returned (EntryGates sets o.trade after the order call).
  const resolve = (r: Retained) => {
    if (resolved.has(r)) return;
    resolved.add(r);

    const o = ctx.gates?.opportunities.findLast((x) => x.trade === r.refusedTrade) ?? null;
    const d: GatedDecision | null = ctx.gates?.decisions.findLast((x) => x.trade === r.refusedTrade) ?? null;

    if (o) {
      r.opportunity = o;
      r.policy = o.policy;
      r.bound = Math.min(r.bound, o.lastEligibleSession);
      r.maxClose = o.maxClose;
      r.origin = `opportunity:${d?.kind ?? 'unknown'}:${o.policy}`;
    } else r.origin = breakout ? 'breakout' : 'crossing';
  };

  book.onRequest = (trade, s, signal, available, kind) => {
    const t = signal.decisionTime;

    if (t === lastAskT) throw new Error(`${book.symbol}: two requests of one book at one instant (${ds.dates[s]})`);
    lastAskT = t;

    const request: LifeRequest = {
      seq: requests.length + 1,
      t,
      s,
      kind,
      setupKind: String(signal.setup.kind),
      price: signal.decisionPrice,
      available,
      outcome: available ? 'granted' : 'refused',
      trade,
      retained: kind === 'retained' ? (own?.id ?? null) : null
    };

    requests.push(request);

    if (available) {
      // any actual entry (an order granted) ends the retained opportunity
      if (current) {
        if (current === own) {
          current.entryTrade = trade;
          end(current, 'entered', t, s, 'its reassessment was granted: order placed for the next eligible trade');
        } else end(current, 'consumed_by_entry', t, s, `a ${kind} request was granted`);
      }
      return;
    }

    if (!l2 || kind !== 'base') return;

    if (current) end(current, 'superseded', t, s, 'a newer base request was refused');

    const r: Retained = {
      id: `R-${retainedList.length + 1}`,
      origin: '',
      refusedTrade: trade,
      refusedTime: t,
      refusedSession: s,
      refusedPrice: signal.decisionPrice,
      trigger: signal.trigger,
      reference: signal.trailingLow,
      opportunity: null,
      policy: null,
      bound: s + L2.maxAgeSessions,
      maxClose: NaN,
      evaluations: 0,
      blocked: {},
      waits: 0,
      end: null,
      endTime: NaN,
      endSession: -1,
      endReason: '',
      entryTrade: null,
      transitions: []
    };

    note(r, t, s, 'retained', 'a base request refused: slot occupied', {
      price: signal.decisionPrice,
      cap: r.refusedPrice * (1 + L2.maxExtension)
    });
    retainedList.push(r);
    current = r;
    request.retained = r.id;
  };

  const invalid = (reason: string, values: Record<string, LogValue>) => ({ valid: false, reason, values });

  // The retained setup's validity at completed bar j of session s (terminal on failure).
  const validity = (
    r: Retained,
    j: number,
    s: number
  ): { valid: boolean; reason: string; values: Record<string, LogValue> } => {
    const close = breakout ? ds.sClose[s]! : life.bars[j]!.close;
    const cap = r.refusedPrice * (1 + L2.maxExtension);

    if (!atOrBelow(close, cap))
      return invalid('extension_exceeded: above 1.05 × the refused decision price', { close, cap });

    if (breakout) {
      const c = life.breakout!;
      const now = sessionSma(ds, s, c.smaSessions);
      const then = sessionSma(ds, s - c.slopeComparisonSessions, c.smaSessions);

      if (!now.ok || !then.ok) return invalid('breakout_unavailable: the trend SMA is not available', { close });
      if (!(close > now.value)) return invalid('breakout_below_sma', { close, sma: now.value });
      if (!(now.value > then.value)) return invalid('breakout_sma_not_rising', { sma: now.value, smaThen: then.value });
      if (!(close > r.trigger))
        return invalid('breakout_below_level: the broken prior high was lost', { close, level: r.trigger });

      return { valid: true, reason: 'breakout trend and level hold', values: { close, sma: now.value } };
    }

    const p = predicate!;

    if (p.holds[j] !== 1)
      return invalid('predicate_false: the close fell below X% over the rolling low', {
        close,
        threshold: p.threshold[j]!
      });

    const o = r.opportunity;
    const cfg = ctx.gates?.eligibility as EligibilityConfig | null | undefined;

    if (o && cfg) {
      if (cfg.policy === 'minimum_strength') {
        const level = o.recentLow * (1 + pct(cfg.minimumAdvancePercent));

        if (!atOrAbove(close, level)) return invalid('strength_below_minimum (native policy 2)', { close, level });
      } else if (cfg.policy === 'maximum_extension') {
        const level = o.signalPrice * (1 + pct(cfg.maximumExtensionPercent));

        if (!atOrBelow(close, level)) return invalid('extension_exceeded (native policy 3)', { close, level });
      } else if (cfg.policy === 'deterioration') {
        r.maxClose = Math.max(r.maxClose, close);

        const floor = r.maxClose * (1 - pct(cfg.deteriorationDropPercent));

        if (atOrBelow(close, floor)) return invalid('deteriorated (native policy 4)', { close, floor });
      }
    }

    return { valid: true, reason: 'predicate holds', values: { close } };
  };

  const step = (r: Retained, s: number, j: number) => {
    const bar = life.bars[j]!;

    if (bar.end <= r.refusedTime) return;
    resolve(r);
    if (book.position || book.order) throw new Error(`${book.symbol}: a retained opportunity while invested`);
    if (bar.end !== ds.sCloseTime[s]) throw new Error('L2 reassesses on daily bars ending at the scheduled close');
    if (lastAskT === bar.end) return; // the book already requested at this instant (one request per instant)

    r.evaluations++;

    const v = validity(r, j, s);

    if (!v.valid) {
      end(r, 'invalidated', bar.end, s, v.reason, v.values);
      return;
    }

    const price = breakout ? ds.sClose[s]! : bar.close;
    let pass = true;
    let reason = '';

    if (ctx.gates) {
      const g = ctx.gates.check(s, bar.end, price, 'retained', { retained: r.id });

      pass = g.pass;
      reason = g.reason;
    } else if (ctx.rules?.initialStop) {
      const c = ctx.protect(s, bar.end, 'retained');

      pass = c.pass;
      reason = c.reason;
    }

    if (!pass) {
      r.blocked[reason] = (r.blocked[reason] ?? 0) + 1;
      if (r.transitions.at(-1)?.event !== `blocked:${reason}`) note(r, bar.end, s, `blocked:${reason}`, reason);
      return;
    }

    if (!life.ask(s, bar.end, 'retained')) {
      r.waits++;
      lastAskT = bar.end;
      requests.push({
        seq: requests.length + 1,
        t: bar.end,
        s,
        kind: 'retained',
        setupKind: breakout ? 'trend_breakout' : 'rise',
        price,
        available: false,
        outcome: 'waiting',
        trade: null,
        retained: r.id
      });
      if (r.transitions.at(-1)?.event !== 'waiting')
        note(r, bar.end, s, 'waiting', 'every check passed; the slot is occupied');
      return;
    }

    // The decision: an order at the next eligible trade, at the then-current price (never the refused price).
    const d = { id: `${r.id}@${bar.end}`, time: bar.end, price, trigger: r.trigger, reference: r.reference };

    book.preApproved = true;
    own = r;

    const trade = ctx.enter(d, s);

    own = null;
    if (book.preApproved) throw new Error('the pre-approved retained order did not reach the book');
    ctx.gates?.afterEntry(trade, s, bar.end, 'an L2 retained entry');

    const outcome: DecisionOutcome = {
      decision: { id: d.id, sessionIndex: s, time: d.time, price: d.price, trigger: d.trigger, reference: d.reference },
      status: 'unfilled_at_end',
      reason: null,
      trade
    };

    ctx.outcomes.push(outcome);
    ctx.byTrade.set(trade, outcome);
  };

  return {
    beginSession(s: number) {
      if (!l2) return;
      while (next < life.bars.length && life.bars[next]!.sessionIndex < s) next++;
    },
    until(s: number, t: number) {
      if (!l2) return;
      while (next < life.bars.length && life.bars[next]!.sessionIndex === s && life.bars[next]!.end <= t) {
        const j = next++;

        if (current) step(current, s, j);
      }
    },
    afterSession(s: number) {
      if (!current) return;
      resolve(current);
      if (s >= current.bound)
        end(current, 'expired', ds.sCloseTime[s]!, s, `expired after the close of its last eligible session`, {
          bound: ds.dates[current.bound] ?? null
        });
    },
    finish(endSession: number) {
      if (current) {
        resolve(current);
        end(current, 'end_of_data', ds.sCloseTime[endSession]!, endSession, 'the end of the data');
      }
    },
    outcome(): LifeOutcome {
      return { mode: life.mode, requests, retained: retainedList };
    }
  };
};

// ----- the copied orchestrator (riseTrading.ts simulateTrading, lines 496–1062; LIFECYCLE marks the insertions) -----

export const simulateLifecycle = (
  ds: Dataset,
  decisions: readonly EntryDecision[],
  options: SimulationOptions,
  life: LifeRuntime | null = null
): LifeSimulation => {
  const { firstSession, endSession } = options;
  const origin = options.originSession ?? firstSession;

  if (!(firstSession >= 0 && firstSession <= endSession && endSession < ds.sessionCount))
    throw new Error(`session range ${firstSession}..${endSession} is outside the dataset`);

  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i]!;

    if (i > 0 && d.time <= decisions[i - 1]!.time)
      throw new Error('decisions must be in strictly ascending time order');
    if (d.sessionIndex < firstSession || d.sessionIndex > endSession)
      throw new Error(`decision ${d.id} lies outside the simulated sessions`);
    if (!(d.time > ds.sTime[d.sessionIndex]! && d.time <= ds.sCloseTime[d.sessionIndex]!))
      throw new Error(`decision ${d.id} is not inside its session ${ds.dates[d.sessionIndex]}`);
  }

  const classic = options.continuation?.config.method === 'classic_d1';

  // classic_d1 needs the D1 machine's continuation fields (exitParamsOf sets them). Without classic_d1 a postExit flag
  // in the exit params is inert (the machine never arms and processBar is never called), as in v1.0.0 — the Study 8
  // exit-parity test feeds D1 books' own params this way.
  if (classic && options.exit.postExit !== true)
    throw new Error('classic_d1 continuation needs exit params with the D1 continuation fields (exitParamsOf)');

  // The book's own entry machine is never asked for a deep-dip signal. Without classic_d1 it never arms (arming would
  // start after the data); with it, only its post-exit continuation path can arm, from the first simulated session.
  // LIFECYCLE: L1/L2 books ask the allocator at every order; L0 (or no lifecycle) is the canonical ShadowBook.
  const lifecycle = life && life.mode !== 'L0' ? life : null;
  const book = lifecycle
    ? new LifecycleBook(
        options.symbol as Sym,
        STRATEGY_KEY as PhenotypeName,
        ds,
        options.exit,
        options.book,
        classic ? firstSession : ds.sessionCount,
        lifecycle.ask
      )
    : new ShadowBook(
        options.symbol as Sym,
        STRATEGY_KEY as PhenotypeName,
        ds,
        options.exit,
        options.book,
        classic ? firstSession : ds.sessionCount
      );
  const log = new DecisionLog();
  const entryMethod: EntryMethod = options.entryMethod ?? 'rise_from_recent_low';
  // v1.3.0: the initial risk stop / trend retention. Null with both OFF: none of their code runs (the v1.2.0 paths).
  const rules =
    options.rules && (options.rules.initialStop || options.rules.retention)
      ? new PositionRules(ds, options.rules, book, options.exit, options.book, log)
      : null;
  // The initial risk stop's decision-time availability, wherever an entry is decided (a failure is noted once per
  // check; the caller records the blocked decision).
  const protect = (s: number, time: number, source: string) => {
    const check = rules!.protection(s, time)!;

    if (!check.pass) rules!.noteBlocked(time, s, source, check);
    return check;
  };
  // v1.4.0: the Drawdown Recovery Gate joins the entry gates (alone: without the trend filter and eligibility).
  const drawdownGate = options.drawdown ? new DrawdownRecoveryGate(ds, options.drawdown, firstSession) : null;
  const baseGates: GateRuntime | null = drawdownGate
    ? {
        ...(options.gates ?? {
          trend: null,
          eligibility: null,
          bars: [],
          entry: { advanceFromRecentLowPercent: NaN, recentLowLookbackBars: NaN }
        }),
        drawdown: drawdownGate
      }
    : (options.gates ?? null);
  const gateRuntime =
    baseGates && rules?.initialStop
      ? { ...baseGates, protection: (s: number, time: number) => protect(s, time, 'entry_gate') }
      : (baseGates ?? null);
  const gated = Boolean(
    gateRuntime && (gateRuntime.trend || gateRuntime.eligibility || gateRuntime.capacity || gateRuntime.drawdown)
  );
  let continuation: ContinuationController | null = null;
  let setupSeq = 0;
  const outcomes: DecisionOutcome[] = [];
  // Places the order of a base-family decision (the crossing, a latched opportunity, a renewal signal).
  const enter = (d: Pick<EntryDecision, 'id' | 'time' | 'price' | 'trigger' | 'reference'>, s: number) => {
    // Base priority: an open continuation episode is closed (and an armed setup cancelled) before the base order.
    continuation?.beforeBaseEntry(s, d.time);

    const setup: Setup = {
      id: gated ? ++setupSeq : outcomes.length + 1,
      // ShadowBook only records it; not a D1 setup kind
      kind: (entryMethod === 'trend_breakout' ? 'trend_breakout' : 'rise') as string as SetupKind,
      activationIndex: s,
      activationTime: d.time,
      activationPrice: d.price,
      referenceHigh: NaN,
      anchorHigh: NaN,
      trailingLow: d.reference,
      trailingLowTime: NaN,
      reboundTrigger: d.trigger,
      declinedSignals: 0,
      status: 'armed',
      endIndex: -1
    };
    const signal: ReboundSignal = {
      setup,
      index: s,
      barIndex: lastMinuteBefore(ds, s, d.time),
      decisionTime: d.time,
      decisionPrice: d.price,
      trigger: d.trigger,
      trailingLow: d.reference
    };
    const trade = book.commit(signal, s, 'granted');

    rules?.attach(trade, s, d.time); // v1.3.0: fixes the initial risk stop's ATR for this order

    return trade;
  };
  const gates =
    gated && gateRuntime
      ? new EntryGates(ds, gateRuntime, log, { enter, flatWithoutOrder: () => !book.position && !book.order })
      : null;
  const protectedOnly = Boolean(rules?.initialStop && !gates);

  continuation = options.continuation
    ? new ContinuationController(
        ds,
        book,
        options.continuation,
        log,
        (s, time) => lastMinuteBefore(ds, s, time),
        gates
          ? {
              check: (s, time, price, ref) => {
                const g = gates.check(s, time, price, 'continuation', ref);

                return { pass: g.pass, reason: g.reason, text: g.text, values: gateLogValues(g) };
              },
              afterEntry: (trade, s, time) => {
                rules?.attach(trade, s, time);
                gates.afterEntry(trade, s, time, 'a continuation entry');
              }
            }
          : protectedOnly
            ? {
                // v1.3.0, the initial risk stop ON without an entry gate: its availability is the only check.
                check: (s, time) => {
                  const c = protect(s, time, 'continuation');

                  return { pass: c.pass, reason: c.reason, text: c.text, values: prefixed('protection.', c.values) };
                },
                afterEntry: (trade, s, time) => rules!.attach(trade, s, time)
              }
            : null
      )
    : null;
  const markChanges = options.recordMinuteMarks ? { t: [] as number[], marked: [] as number[] } : null;
  const byTrade = new Map<VirtualTrade, DecisionOutcome>();
  const excursions = new Map<VirtualTrade, Excursion>();
  const daily: DailyMark[] = [];
  const minute = new Tracker(0, ds.bTime[ds.sBarStart[origin]!]!);
  const session = new Tracker(0, ds.sTime[origin]!);
  let realized = 0;
  let minuteMarks = 0;
  let next = 0;

  const baseEntry = (
    d: EntryDecision,
    s: number,
    disposition: 'taken' | 'rejected' | 'vetoed' | 'deferred' | 'invalidated',
    reason: string | null,
    trade: VirtualTrade | null,
    g: GatedDecision | null = null,
    at = log.entries.length,
    protection: ProtectionCheck | null = null
  ) =>
    log.insert(at, {
      t: d.time,
      session: s,
      event: 'base_signal',
      origin: 'base_growth',
      method: null,
      episode: null,
      ...(g?.opportunity ? { opportunity: g.opportunity.id } : {}),
      trade,
      disposition,
      reason,
      values: {
        close: d.price,
        // v1.3.0 breakout decisions: the prior high and the intrinsic SMA (the Rise entry: its threshold and low)
        ...(d.breakout
          ? {
              entryMethod: 'trend_breakout',
              priorHigh: d.breakout.priorHigh,
              priorHighSession: ds.dates[d.breakout.priorHighSession]!,
              sma: d.breakout.sma,
              smaThen: d.breakout.smaThen
            }
          : { threshold: d.trigger, recentLow: d.reference }),
        ...(g ? { ...(g.gate ? gateLogValues(g.gate) : {}), ...prefixed('policy.', g.validity ?? {}) } : {}),
        ...(protection ? { gate: protection.reason, ...prefixed('protection.', protection.values) } : {})
      }
    });

  const decide = (d: EntryDecision, s: number) => {
    if (book.position) {
      outcomes.push({ decision: d, status: 'rejected', reason: 'position_open', trade: book.position.trade });
      baseEntry(d, s, 'rejected', 'position_open', book.position.trade);
      return;
    }

    if (book.order) {
      outcomes.push({ decision: d, status: 'rejected', reason: 'order_pending', trade: book.order.trade });
      baseEntry(d, s, 'rejected', 'order_pending', book.order.trade);
      return;
    }

    if (gates) {
      const at = log.entries.length; // the raw crossing is logged before the entries the gates add for it
      const g = gates.onCrossing(
        { time: d.time, price: d.price, trigger: d.trigger, reference: d.reference, barIndex: d.signal?.index ?? null },
        s
      );

      if (g.disposition === 'taken') {
        const outcome: DecisionOutcome = {
          decision: d,
          status: 'unfilled_at_end',
          reason: null,
          trade: g.trade,
          gate: g
        };

        outcomes.push(outcome);
        byTrade.set(g.trade!, outcome);
        baseEntry(d, s, 'taken', null, g.trade, g, at);
      } else {
        const reason: GateVetoReason =
          g.disposition === 'invalidated' ? 'policy_invalidated' : (g.gate!.reason as GateVetoReason);

        outcomes.push({
          decision: d,
          status: g.disposition === 'deferred' ? 'deferred' : 'vetoed',
          reason,
          trade: null,
          gate: g
        });
        baseEntry(d, s, g.disposition, g.reason, null, g, at);
      }

      return;
    }

    // v1.3.0, the initial risk stop ON without an entry gate: no entry without the requested protection.
    if (protectedOnly) {
      const check = protect(s, d.time, 'base_signal');

      if (!check.pass) {
        outcomes.push({
          decision: d,
          status: 'vetoed',
          reason: check.reason as GateVetoReason,
          trade: null,
          protection: check
        });
        baseEntry(d, s, 'vetoed', check.text, null, null, log.entries.length, check);
        return;
      }
    }

    const trade = enter(d, s);
    const outcome: DecisionOutcome = { decision: d, status: 'unfilled_at_end', reason: null, trade };

    outcomes.push(outcome);
    byTrade.set(trade, outcome);
    baseEntry(d, s, 'taken', null, trade);
  };

  const r2 = (x: number) => Math.round(x * 100) / 100;
  const tagOf = (trade: VirtualTrade) => {
    const o = originOf(trade);

    return { origin: o.origin, method: o.method };
  };
  const logExit = (trade: VirtualTrade, s: number) => {
    // v1.3.0: a position closed in several fills sums its fills (the trade's net, interest and gross are its totals).
    const pos = rules?.positionOf(trade);
    const fills = pos && pos.fills.length > 1 ? pos.fills : null;
    const grossBeforeCosts = fills
      ? fills.reduce((a, f) => a + f.grossBeforeCosts, 0)
      : trade.shares * (trade.exitRawPrice - trade.entryRawPrice);
    const costs = fills
      ? trade.shares * (trade.entryPrice - trade.entryRawPrice) + fills.reduce((a, f) => a + f.exitCost, 0)
      : trade.shares * (trade.entryPrice - trade.entryRawPrice) + trade.shares * (trade.exitRawPrice - trade.exitPrice);
    const final = pos?.fills.at(-1);

    log.add({
      t: trade.exitTime,
      session: s,
      event: 'exit',
      ...tagOf(trade),
      episode: null,
      trade,
      disposition: null,
      reason: trade.exitReason,
      values: {
        fill: trade.exitExecution,
        price: trade.exitRawPrice,
        stopPrice: trade.exitStopPrice,
        stopActive: trade.stopActiveAtExit,
        maximumHoldDue: trade.maximumHoldDue,
        bufferDecision: Number.isNaN(trade.bufferSignalTime)
          ? null
          : new Date(trade.bufferSignalTime * 1000).toISOString(),
        grossBeforeCosts: r2(grossBeforeCosts),
        costs: r2(costs),
        interest: r2(trade.interest),
        net: r2(trade.net),
        reconciles: Math.abs(grossBeforeCosts - costs - trade.interest - trade.net) < 1e-6,
        qualifiesForContinuation: trade.net > 0,
        ...(final
          ? {
              rule: final.rule,
              ...(pos!.stop ? { initialStop: pos!.stop.level } : {}),
              ...(final.instruction.sameTrade.length ? { sameTrade: final.instruction.sameTrade.join(',') } : {}),
              fills: pos!.fills.length,
              ...(fills
                ? {
                    finalFillShares: final.shares,
                    finalFillNet: r2(final.net),
                    partialFillsNet: r2(pos!.partialNet),
                    positionNet: r2(trade.net)
                  }
                : {})
            }
          : {})
      }
    });
  };
  const logFill = (trade: VirtualTrade, s: number) =>
    log.add({
      t: trade.entryTime,
      session: s,
      event: 'fill',
      ...tagOf(trade),
      episode: null,
      trade,
      disposition: null,
      reason: trade.entryExecution,
      values: {
        price: trade.entryRawPrice,
        priceAfterCost: trade.entryPrice,
        decision: new Date(trade.decisionTime * 1000).toISOString(),
        carriedOvernight: trade.carriedOvernight
      }
    });

  // v1.3.0 (the initial risk stop or retention ON): the exits due at bar k, in order. A partial sale keeps the
  // position and the remainder's next exit may be due at the same bar (a lower stop crossed later in the minute).
  const exitsAt = (s: number, k: number) => {
    for (let guard = 0; guard < 3; guard++) {
      const exit = book.exitAt(k);

      if (!exit) return;

      const instruction = rules!.instructionOf(exit);

      if (instruction?.partial) {
        const fill = rules!.partialSale(s, exit);

        realized += fill.net;
        continue;
      }

      const position = book.position!;
      const sharesSold = position.lot.shares;
      const principalRepaid = position.lot.investment;
      const partials = rules!.positionOf(position.trade)?.fills.length ?? 0;
      // classic_d1: the D1 machine opens its continuation window from the net the book computes, which after partial
      // fills is the remainder's alone; it is re-judged on the whole position's net below.
      const m = book.machine;
      const machine = partials
        ? { a: m.continuationActive, h: m.continuationHigh, st: m.continuationStart, w: m.continuationWindows }
        : null;
      const trade = book.close(s, exit);
      const fill = rules!.finalize(trade, s, exit, sharesSold, principalRepaid);

      if (machine) {
        m.continuationActive = machine.a;
        m.continuationHigh = machine.h;
        m.continuationStart = machine.st;
        m.continuationWindows = machine.w;
        m.onExit(s, exit.price, trade.net);
      }
      realized += fill.net;
      logExit(trade, s);
      continuation?.afterExit(s, trade);
      return;
    }

    throw new Error(`more than two exit fills at one bar (${ds.dates[s]} bar ${k})`);
  };

  // LIFECYCLE: the request log and L2's retained opportunity (absent in L0).
  const lifeState = lifecycle
    ? lifecycleState(ds, lifecycle, book as LifecycleBook, {
        enter,
        gates,
        rules,
        protect,
        outcomes,
        byTrade,
        entryMethod
      })
    : null;

  for (let s = firstSession; s <= endSession; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const sessionTime = ds.sTime[s]!;

    book.beginSession(s);
    continuation?.beginSession(s);
    gates?.beginSession(s);
    lifeState?.beginSession(s); // LIFECYCLE

    let invested = Boolean(book.position);

    for (let k = 0; k <= count; k++) {
      const t = k < count ? ds.bTime[start + k]! : ds.sCloseTime[s]!;
      // Base decisions and (v1.2.0) latched-opportunity steps due at or before `time`, in time order; at one instant a
      // fresh crossing goes first, then the live opportunity. With both gates OFF this is the v1.1.0 base loop.
      // v1.4.0: the Drawdown Recovery Gate's observations join the merge; at one instant a completed close goes first (a
      // decision at that instant knows it; a release it causes may schedule a latched step then), while an opening or
      // reopening trade at that instant goes after the decisions (it can be their own fill).
      const baseUntil = (time: number) => {
        for (;;) {
          const tb = next < decisions.length && decisions[next]!.sessionIndex === s ? decisions[next]!.time : Infinity;
          const tg = gates ? gates.nextTime(s, time) : Infinity;

          if (drawdownGate) {
            const to = drawdownGate.nextTime;

            // a completed close is known at its instant (before the decisions then); an opening or reopening TRADE at
            // an instant comes after that instant's decisions (it may be their fill), so it waits for a later instant
            if (drawdownGate.nextIsFull ? to <= time && to <= tb && to <= tg : to < time && to < tb && to < tg) {
              drawdownGate.step();
              continue;
            }
          }

          if (tb <= time && tb <= tg) {
            decide(decisions[next]!, s);
            next++;
          } else if (tg <= time) gates!.evaluate(s);
          else return;
        }
      };

      // In time order: a base decision (and a latched step) at or before a continuation step goes first (priority at a
      // tie: fresh crossing, then live opportunity, then continuation).
      if (continuation)
        for (let ct = continuation.nextTime(s, k, t); ct <= t; ct = continuation.nextTime(s, k, t)) {
          baseUntil(ct);
          continuation.evaluate(s, k);
        }

      baseUntil(t);
      lifeState?.until(s, t); // LIFECYCLE: L2 reassessments due at or before t, after the canonical decisions

      if (rules) exitsAt(s, k);
      else {
        const exit = book.exitAt(k);

        if (exit) {
          const trade = book.close(s, exit);

          realized += trade.net;
          logExit(trade, s);
          continuation?.afterExit(s, trade);
        }
      }

      if (book.fillAt(k)) {
        const trade = book.open(s, k);
        const base = byTrade.get(trade);
        const gatedFill = gates ? gates.afterFill(trade) : false;

        if (base) base.status = 'filled';
        else if (!gatedFill && !continuation?.afterFill(trade))
          throw new Error(`fill of an unknown order (trade ${trade.id})`);
        excursions.set(trade, { worst: Infinity, worstTime: NaN, best: -Infinity, bestTime: NaN, marks: 0 });
        invested = true;
        logFill(trade, s);

        // v1.3.0: the position's rules start at its fill; the initial risk stop may already act in this minute.
        if (rules) {
          rules.onFill(trade, s, k);
          exitsAt(s, k);
        }
      }

      const price = k < count ? ds.bClose[start + k]! : ds.sClose[s]!;
      const mark = book.markAt(price, sessionTime);
      // v1.3.0: a position's own excursion includes the net of its partial fills (the book marks the remainder).
      const positionMark = rules && book.position ? mark + rules.openPartialNet() : mark;

      minute.updateStrict(realized + mark, t);
      minuteMarks++;

      if (markChanges && markChanges.marked.at(-1) !== realized + mark) {
        markChanges.t.push(t);
        markChanges.marked.push(realized + mark);
      }

      if (book.position) {
        const x = excursions.get(book.position.trade)!;

        x.marks++;

        if (positionMark < x.worst) {
          x.worst = positionMark;
          x.worstTime = t;
        }

        if (positionMark > x.best) {
          x.best = positionMark;
          x.bestTime = t;
        }
      }
    }

    if (next < decisions.length && decisions[next]!.sessionIndex === s)
      throw new Error(`decision ${decisions[next]!.id} comes after the close of ${ds.dates[s]}`);
    if (continuation && !continuation.classic && continuation.nextTime(s, count + 1, Infinity) !== Infinity)
      throw new Error(`a continuation bar of ${ds.dates[s]} ends after its close`);
    if (gates && gates.nextTime(s, Infinity) !== Infinity)
      throw new Error(`an eligibility bar of ${ds.dates[s]} ends after its close`);

    book.afterSession(s);
    rules?.afterSession(s); // v1.3.0: the trend-retention count at the completed close
    continuation?.afterSession(s);
    gates?.afterSession(s);
    lifeState?.afterSession(s); // LIFECYCLE: L2 expiry after the close

    const unrealized = book.markAt(ds.sClose[s]!, sessionTime);

    session.updateStrict(realized + unrealized, sessionTime);
    daily.push({
      index: s,
      date: ds.dates[s]!,
      close: ds.sClose[s]!,
      realized,
      unrealized,
      marked: realized + unrealized,
      heldAtClose: Boolean(book.position),
      investedDuringSession: invested
    });
  }

  book.finish(endSession);
  rules?.finish(endSession);
  continuation?.finish(endSession);
  gates?.finish(endSession);
  lifeState?.finish(endSession); // LIFECYCLE

  return {
    symbol: options.symbol,
    firstSession,
    endSession,
    exit: options.exit,
    book: options.book,
    trades: book.trades.filter((trade) => trade.entryIndex >= 0),
    outcomes,
    excursions,
    daily,
    minuteDrawdown: minute.stats(),
    dailyDrawdown: session.stats(),
    minuteMarks,
    realized,
    log,
    continuation,
    gates,
    markChanges,
    entryMethod,
    rules,
    life: lifeState ? lifeState.outcome() : null // LIFECYCLE
  };
};

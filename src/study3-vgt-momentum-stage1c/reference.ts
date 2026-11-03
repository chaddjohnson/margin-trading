// Study 3, Stage 1c (research/study3-vgt-momentum-stage1c): the independent slow reference simulator. It implements
// ENGINE_CONTRACT.md — §1–§10 (Stage 1b's contract with Stage 1b AMENDMENTS.md A1 items 1–7) and the Stage 1c additions
// §11–§14 (the account loss record R, protection rules A, B and C, XN, the counters) — read with PROTOCOL.md §3–§4 and
// §8, from the written specification only. It was written in a separate context without reading either fast engine,
// starting from a copy of Stage 1b's independent reference (src/study3-vgt-momentum-stage1b/reference.ts, which
// passed parity with Stage 1b's fast engine), and exists only to check Stage 1c's fast engine by parity.
//
// Structure: an explicit session-by-session, minute-by-minute event simulation. The account is an explicit ledger
// (principal cash M, per-trade loan segments split at trims, net-debit account-interest segments split at fills, flat
// periods, the loss record R); orders are explicit objects (a pending entry, a close-decided exit or transition, a
// trim, a conversion, rule A's losing-hold order) that the minute loop executes in the contract's order. Clarity over
// speed. Readings of Stage 1b contract text are recorded in research/study3-vgt-momentum-stage1b/reviews/
// REFERENCE_AUTHOR_NOTES.md and cited as [Nn]; readings of the Stage 1c additions are recorded in
// research/study3-vgt-momentum-stage1c/reviews/REFERENCE_AUTHOR_NOTES.md and cited as [Cn]. With no `protect` on any
// policy the simulation is Stage 1b's reference unchanged.
import { createHash } from 'node:crypto';
import type { Dataset } from '../four-family/data.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { firstTradeAfterDecision, firstTradeFrom, priceAt, timeAt } from '../shared-margin-portfolio/strategy.ts';
import { Features, monthOf } from '../study3-vgt-momentum/features.ts';
import { type Signals, signalsOf } from '../study3-vgt-momentum/signals.ts';
import type {
  AccountEvent,
  BlockRow,
  DailyRow,
  DrawdownStats,
  ExitReason,
  LosingHoldEvent,
  Policy,
  RunOptions,
  RunResult,
  ScheduleItem,
  StopComponent,
  Trade,
  Transition,
  WindowResult
} from './types.ts';

const secondsPerDay = 86400;
const daysPerYear = 365;
const stage1HurdleRate = 0.11; // X6b's `sessions` stall hurdle: Stage 1's fixed hurdle rate [N9]
const tolerance = 1e-12; // rule C's relative tolerance (X and the level inclusive), contract §11.3

// The exits by one of the policy's own rules (contract §11.1): they write the account loss record R. Transitions,
// conversions, ZR resizes and the end-of-run valuation never do.
const ownRuleReasons: ReadonlySet<ExitReason> = new Set<ExitReason>([
  'stop',
  'stop gap',
  'own out',
  'trend',
  'damage',
  'structural',
  'stale',
  'max hold',
  'stall',
  'losing hold'
]);

// ----- policies -----

interface PolicyRuntime {
  policy: Policy;
  id: string;
  signals: Signals;
  floorOut: Int8Array | null; // XS: E05(θ, b)'s own OUT from signalsOf (C_s < F (1 − b), F the latest swing low)
  givebacks: { A: number; G: number }[]; // XRD's component and, under Z3(g), (g, g)
}

// ----- orders -----

interface EntryOrder {
  kind: 'first' | 'reentry';
  rule: string; // fresh, adoption, an R-rule, minute
  structLevel: number; // the entry's recorded structural level (NaN when none)
  releaseEntry: boolean; // decided at the first permitted decision session after a rule-B cooldown (§11.2)
  cLevel: number; // rule C's level if C was armed at the decision, else NaN (§11.3)
}

// Rule A's losing-hold order for the current session (contract §11.5), created by the check at the session's start.
interface LosingHoldOrder {
  bar: number; // aBar
  fallback: boolean; // mode next without a later trade: bar count − 1's close, after step 3
  opening: boolean; // an opening fill (mode open)
  stopSlip: boolean; // a market sale paying the stop slippage (mode next and the fallback)
  done: boolean; // executed or lapsed
}

// The account loss record R (contract §11.1): the last own-rule exit of a whole position.
interface LossRecord {
  exitIndex: number;
  exitRaw: number;
  entryRaw: number;
  net: number;
  consumed: boolean;
}

interface ExitOrder {
  reason: ExitReason; // the close-decided reason, or 'transition'
  transition: boolean;
}

interface TrimOrder {
  q: number; // shares, fixed at the deciding close
}

interface ConversionOrder {
  target: number; // S' = B0 / C_b
  to: PolicyRuntime;
  structLevel: number;
}

// ----- campaign, position, ZR segment -----

interface Campaign {
  id: number;
  stoppedHigh: number;
  stopAtExit: number;
  trough: number;
  exitIndex: number;
  structLevel: number;
  permHigh: number;
  belowStop: boolean;
  failedBefore: boolean;
}

interface LoanSegment {
  from: number; // session
  principal: number;
  to: number; // closing session (−1 while open)
  interest: number; // interest of the closed segment
}

interface Position {
  trade: Trade;
  pr: PolicyRuntime; // the position keeps its own policy (S2)
  entryIndex: number;
  S: number;
  L: number;
  E: number;
  Hc: number;
  MFE: number;
  MAE: number;
  structLevel: number;
  stopCore: number;
  coreComponent: StopComponent;
  volLevel: number;
  level: number; // the resting stop level in force
  levelComponent: StopComponent;
  ownCount: number;
  ownOutSeen: boolean;
  permExpired: boolean;
  permHigh: number;
  floorArmed: boolean;
  lastHigh: number;
  peakProfit: number;
  trimCash: number;
  accrued: number; // closed loan segments' interest
  loans: LoanSegment[]; // the last one is open
}

interface ZrSegment {
  trade: Trade;
  S: number;
  basis: number;
  friction: number;
  start: number;
  Hc: number;
  MAE: number;
  MFE: number;
  peakProfit: number;
}

interface WindowState {
  boundary: number;
  startMark: number;
  startLiquidation: number;
  tracker: Tracker;
  dailyPeak: number;
  dailyDd: number;
  peakGross: number;
  sessions: number;
  sessionsLong: number;
  grossDollarDays: number;
  loanDollarDays: number;
  debitDollarDays: number;
  interestBase: number;
}

const ddStats = (tracker: Tracker): DrawdownStats => {
  const stats = tracker.stats();

  return {
    maximum: stats.maximum,
    peakTime: stats.peakTime,
    troughTime: stats.troughTime,
    peakValue: stats.peakValue,
    troughValue: stats.troughValue
  };
};

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

const pathHashOf = (trades: Trade[]) => {
  const sequence: number[] = [];

  for (const trade of trades) {
    sequence.push(trade.entryIndex, trade.entryBar, trade.exitIndex, trade.exitBar);

    for (const trim of trade.trims) {
      sequence.push(-2, trim.index, trim.bar);
    }
  }

  return createHash('sha256')
    .update(new Uint8Array(new Int32Array(sequence).buffer))
    .digest('hex')
    .slice(0, 24);
};

class ReferenceSimulation {
  private readonly F: Features;
  private readonly sma200: Float64Array;
  private readonly runtimes = new Map<Policy, PolicyRuntime>();
  private readonly items: ScheduleItem[];
  private readonly boundaries = new Map<number, Policy>();
  private readonly B0: number;
  private readonly c: number;
  private readonly r: number;
  private readonly stopSlip: number;
  private readonly entrySlip: number;
  private readonly openSlip: number;
  private readonly delay: number;
  private readonly e: number;
  private readonly end: number;
  private readonly net: boolean;
  private readonly record: boolean;
  private readonly mode: Transition;
  private readonly zr: boolean;
  private readonly windowStarts: Set<number>;
  private readonly losingHoldFill: 'next' | 'open';
  private readonly restrictionCarry: 'persist' | 'reset';
  private rflTriggers: Int8Array | null = null;

  // policy and order state
  private active: PolicyRuntime;
  private adoptionClose: number;
  private adoptionDeferred = false; // a discarded first-entry decision carried the `adoption` label (§11.4)
  private R: LossRecord | null = null; // the account loss record (account state, not policy state; §11.1)
  private cooling = false; // the minute rule was frozen by a rule-B cooldown since the reference last (re)started
  private pos: Position | null = null;
  private seg: ZrSegment | null = null;
  private campaign: Campaign | null = null;
  private entryOrder: EntryOrder | null = null;
  private exitOrder: ExitOrder | null = null;
  private trimOrder: TrimOrder | null = null;
  private conversionOrder: ConversionOrder | null = null;
  private readonly reference = { active: false, value: NaN, triggerFrom: 0 }; // the intraday minute-rule reference

  // the account ledger
  private M = 0; // principal cash: sale proceeds − buy costs (interest never enters it)
  private realized = 0; // closed trades' nets
  private closedTradeInterest = 0;
  private closedA = 0; // net-debit: account interest of closed segments
  private segFrom: number; // net-debit: the open account-interest segment's first session
  private base = 0; // net-debit: max(−M, 0) of the open segment
  private flatStartA: number | null = 0; // account interest when the current flat period began (null while long)
  private flatInterest = 0;

  // results and accumulators
  private readonly trades: Trade[] = [];
  private readonly transitions: RunResult['transitions'] = [];
  private readonly events: AccountEvent[] = [];
  private readonly daily: DailyRow[] = [];
  private readonly windows: WindowResult[] = [];
  private window: WindowState | null = null;
  private readonly tracker: Tracker;
  private campaigns = 0;
  private reentries = 0;
  private reentryOpportunities = 0;
  private dailyPeak = 0;
  private dailyDd = 0;
  private sessionsLong = 0;
  private peakGross = 0;
  private grossDollarDays = 0;
  private loanDollarDays = 0;
  private debitDollarDays = 0;
  private readonly years = new Set<number>();
  private lastMark = 0;
  private lastLiquidation = 0;

  // Stage 1c counters and diagnostic rows (§14)
  private aChecks = 0;
  private aDue = 0;
  private aCancelled = 0;
  private bBlocks = 0;
  private cBlocks = 0;
  private bcBoth = 0;
  private cFillsBelow = 0;
  private readonly blocks: BlockRow[] = [];
  private readonly aEvents: LosingHoldEvent[] = [];

  constructor(
    private readonly ds: Dataset,
    schedule: Policy | ScheduleItem[],
    private readonly options: RunOptions
  ) {
    this.e = options.firstDecisionIndex;
    this.end = options.endIndex;

    if (!(Number.isInteger(this.e) && Number.isInteger(this.end) && this.e >= 0 && this.end >= this.e)) {
      throw new Error(`reference: invalid run frame ${this.e}..${this.end}`);
    }

    if (this.end >= ds.sessionCount) {
      throw new Error(`reference: endIndex ${this.end} is beyond the dataset (${ds.sessionCount} sessions)`);
    }

    this.items = Array.isArray(schedule) ? [...schedule] : [{ index: this.e, policy: schedule }];

    if (this.items.length === 0 || this.items[0]!.index !== this.e) {
      throw new Error('reference: the first schedule item must have index firstDecisionIndex');
    }

    for (let i = 1; i < this.items.length; i++) {
      const item = this.items[i]!;

      if (!(item.index > this.items[i - 1]!.index)) {
        throw new Error('reference: schedule indices must increase');
      }

      this.boundaries.set(item.index, item.policy);
    }

    this.zr = this.items.length === 1 && this.items[0]!.policy.sizing.kind === 'ZR';

    if (!this.zr && this.items.some((item) => item.policy.sizing.kind === 'ZR')) {
      throw new Error('reference: ZR is defined only for a single-item schedule (ENGINE_CONTRACT.md §10)'); // [N24]
    }

    this.B0 = options.principal;
    this.c = options.costBps / 1e4;
    this.r = options.rate;
    this.stopSlip = options.stopSlippageBps / 1e4;
    this.entrySlip = options.entrySlippageBps / 1e4;
    this.openSlip = (options.openSlippageBps ?? 0) / 1e4;
    this.delay = options.delayMinutes;
    this.net = options.financing === 'net';
    this.record = Boolean(options.recordDaily);
    this.mode = options.transition ?? 'S1';
    this.losingHoldFill = options.losingHoldFill ?? 'next';
    this.restrictionCarry = options.restrictionCarry ?? 'persist';
    this.windowStarts = new Set((options.windows ?? []).filter((b) => b >= this.e && b < this.end));
    this.F = new Features(ds);
    this.sma200 = this.F.sma(200);
    this.segFrom = this.e;
    this.adoptionClose = this.e;
    this.active = this.runtime(this.items[0]!.policy);
    this.tracker = new Tracker(0, ds.sCloseTime[this.e]!); // [N3]
  }

  run(): RunResult {
    if (!this.zr) {
      this.startReference(this.active, this.e);
    }

    for (let s = this.e; s <= this.end; s++) {
      if (s > this.e) {
        if (this.zr) {
          this.zrSession(s);
        } else {
          this.session(s);
        }
      }

      if (this.zr) {
        this.zrClose(s);
      } else {
        this.close(s);
      }

      this.account(s);
    }

    return this.finish();
  }

  // ----- calendar, prices, interest -----

  private days(from: number, to: number) {
    return (this.ds.sTime[to]! - this.ds.sTime[from]!) / secondsPerDay;
  }

  private buyPrice(raw: number, opening: boolean) {
    return raw * (1 + this.entrySlip) * (1 + this.c) * (opening ? 1 + this.openSlip : 1);
  }

  private sellPrice(raw: number, stop: boolean, opening: boolean) {
    return raw * (stop ? 1 - this.stopSlip : 1) * (1 - this.c) * (opening ? 1 - this.openSlip : 1);
  }

  // I_trade(s) = accrued + L r Δdays(segStart → s) / 365.
  private tradeInterest(p: Position, s: number) {
    const open = p.loans[p.loans.length - 1]!;

    return p.accrued + (p.L * this.r * this.days(open.from, s)) / daysPerYear;
  }

  private zrInterest(g: ZrSegment, s: number) {
    return (this.B0 * this.r * this.days(g.start, s)) / daysPerYear;
  }

  private openTradeInterest(s: number) {
    if (this.pos) {
      return this.tradeInterest(this.pos, s);
    }

    return this.seg ? this.zrInterest(this.seg, s) : 0;
  }

  // A(s): fixed-slot — Σ closed trades' interest + the open trade's; net-debit — closed segments + the open segment.
  private accountInterest(s: number) {
    if (this.net) {
      return this.closedA + (this.base * this.r * this.days(this.segFrom, s)) / daysPerYear;
    }

    return this.closedTradeInterest + this.openTradeInterest(s);
  }

  private carried(s: number) {
    return this.net ? this.accountInterest(s) - (this.closedTradeInterest + this.openTradeInterest(s)) : 0;
  }

  // Every fill: (net-debit) close the account-interest segment at s, change M, open a new segment on max(−M, 0).
  private cashFlow(s: number, delta: number) {
    if (this.net) {
      this.closedA = this.accountInterest(s);
      this.segFrom = s;
    }

    this.M += delta;

    if (this.net) {
      this.base = Math.max(-this.M, 0);
    }
  }

  private beginFlat(s: number) {
    this.flatStartA = this.accountInterest(s);
  }

  // A flat period is booked at the next entry (before its cash flow) and at the end if flat.
  private endFlat(s: number) {
    if (this.flatStartA !== null && this.net) {
      this.flatInterest += this.accountInterest(s) - this.flatStartA;
    }

    this.flatStartA = null;
  }

  // ----- the account's view -----

  private isLong() {
    return this.pos !== null || this.seg !== null;
  }

  private shares() {
    return this.pos ? this.pos.S : this.seg ? this.seg.S : 0;
  }

  private loanNow() {
    return this.pos ? this.pos.L : this.seg ? this.B0 : 0;
  }

  private openTradeId() {
    return this.pos ? this.pos.trade.id : this.seg ? this.seg.trade.id : 0;
  }

  private markAt(s: number, p: number) {
    const S = this.shares();

    if (this.net) {
      return this.M + (S === 0 ? 0 : S * p) - this.accountInterest(s);
    }

    if (this.pos) {
      const q = this.pos;

      return this.realized + (q.trimCash + q.S * p - q.L - this.tradeInterest(q, s));
    }

    if (this.seg) {
      const g = this.seg;

      return this.realized + g.S * (p - g.basis) - g.friction - this.zrInterest(g, s);
    }

    return this.realized;
  }

  private markMinute(value: number, time: number) {
    this.tracker.updateStrict(value, time);
    this.window?.tracker.updateStrict(value, time);
    this.options.markSink?.(value, time);
  }

  private flatMark(s: number, time: number) {
    this.markMinute(this.markAt(s, NaN), time);
  }

  private event(
    s: number,
    bar: number,
    kind: AccountEvent['kind'],
    trade: number,
    raw: number,
    shares: number,
    cash: number
  ) {
    if (!this.record) {
      return;
    }

    const S = this.shares();
    const interest = this.accountInterest(s);

    this.events.push({
      index: s,
      bar,
      kind,
      trade,
      raw,
      shares,
      cash,
      M: this.M,
      L: this.loanNow(),
      debit: Math.max(-this.M, 0),
      interest,
      S,
      G: S * raw,
      mark: this.M + S * raw - interest
    });
  }

  // ----- signals -----

  private runtime(policy: Policy): PolicyRuntime {
    let pr = this.runtimes.get(policy);

    if (!pr) {
      const floor = policy.exit.floor;
      let floorOut: Int8Array | null = null;

      if (floor) {
        const zigzag = signalsOf(this.F, 'E05', { theta: floor.theta, b: floor.b });

        if (zigzag.kind !== 'event' || !zigzag.out) {
          throw new Error('reference: E05 has no own OUT');
        }

        floorOut = zigzag.out;
      }

      const givebacks = policy.exit.giveback ? [{ A: policy.exit.giveback.A, G: policy.exit.giveback.G }] : [];

      if (policy.sizing.kind === 'Z3') {
        givebacks.push({ A: policy.sizing.G, G: policy.sizing.G });
      }

      pr = {
        policy,
        id: policy.id,
        signals: signalsOf(this.F, policy.entry, policy.entryParams),
        floorOut,
        givebacks
      };
      this.runtimes.set(policy, pr);
    }

    return pr;
  }

  private rfl() {
    if (!this.rflTriggers) {
      const zigzag = signalsOf(this.F, 'E05', { theta: 0.05, b: 0.005 });

      if (zigzag.kind !== 'event') {
        throw new Error('reference: E05 is not an event family');
      }

      this.rflTriggers = zigzag.trigger;
    }

    return this.rflTriggers;
  }

  // ownOut(s): level → state OUT; event with a level array → C_s below the recorded level; event or intraday with
  // `out` → out[s] = 1; otherwise false.
  private ownOut(pr: PolicyRuntime, s: number, structLevel: number) {
    const sig = pr.signals;
    const C = this.ds.sClose[s]!;

    switch (sig.kind) {
      case 'level':
        return sig.state[s] === 0;
      case 'event':
        if (sig.level) {
          return C < structLevel;
        }

        return sig.out ? sig.out[s] === 1 : false;
      case 'intraday':
        return sig.out[s] === 1;
      default:
        return false;
    }
  }

  // fresh(s): level → state IN; event → trigger; intraday and none → never.
  private fresh(pr: PolicyRuntime, s: number) {
    const sig = pr.signals;

    if (sig.kind === 'level') {
      return sig.state[s] === 1;
    }

    return sig.kind === 'event' ? sig.trigger[s] === 1 : false;
  }

  private eventLevel(pr: PolicyRuntime, s: number) {
    const sig = pr.signals;

    return sig.kind === 'event' && sig.level ? sig.level[s]! : NaN;
  }

  // The intraday reference as at a run start (or a flat boundary): folded over session s's minutes, triggering
  // from s + 1; inactive for a non-intraday policy.
  private startReference(pr: PolicyRuntime, s: number) {
    const sig = pr.signals;

    this.cooling = false; // cleared whenever the reference is (re)started (§11.2) [C11]

    if (sig.kind !== 'intraday') {
      this.reference.active = false;

      return;
    }

    const start = this.ds.sBarStart[s]!;
    const count = this.ds.sBarCount[s]!;
    let value = sig.mode === 'low' ? Infinity : -Infinity;

    for (let k = 0; k < count; k++) {
      value =
        sig.mode === 'low' ? Math.min(value, this.ds.bLow[start + k]!) : Math.max(value, this.ds.bHigh[start + k]!);
    }

    this.reference.active = true;
    this.reference.value = value;
    this.reference.triggerFrom = s + 1;
  }

  // ----- §11: the protection rules' predicates (pure functions of R, the deciding policy and the decision) -----

  // R restricts only while present, unconsumed and losing (strictly: a break-even exit restricts nothing).
  private restrictingRecord(): LossRecord | null {
    const R = this.R;

    return R !== null && !R.consumed && R.net < 0 ? R : null;
  }

  // blockB(s, minute) with the deciding (active) policy's B (§11.2).
  private blockB(pr: PolicyRuntime, s: number, minute: boolean) {
    const B = pr.policy.protect?.B;
    const R = this.restrictingRecord();

    if (!B || !R) {
      return false;
    }

    return minute ? s < R.exitIndex + B.C + 1 : s < R.exitIndex + B.C;
  }

  // Rule C's level when C is armed for the deciding policy (§11.3), else NaN.
  private armedLevel(pr: PolicyRuntime) {
    const C = pr.policy.protect?.C;
    const R = this.restrictingRecord();

    if (!C || !R || !(R.exitRaw <= R.entryRaw * (1 - C.X) * (1 + tolerance))) {
      return NaN;
    }

    return R.exitRaw * (1 + C.Y);
  }

  // allowC(price, previous) (§11.3); `previous` NaN means no observation since the arming exit.
  private allowC(pr: PolicyRuntime, price: number, previous: number) {
    const level = this.armedLevel(pr);

    if (Number.isNaN(level)) {
      return true;
    }

    const floor = level * (1 - tolerance);
    const cross = Boolean(pr.policy.protect?.C?.cross);

    return price >= floor && (!cross || previous < floor);
  }

  // The previous close for a decision in session s: C_{s−1} if s − 1 ≥ R.exitIndex, else NaN (§11.3).
  private previousClose(s: number) {
    const R = this.R;

    return R !== null && s - 1 >= R.exitIndex ? this.ds.sClose[s - 1]! : NaN;
  }

  // releaseEntry: a decision at s = R.exitIndex + C (close) or in session R.exitIndex + C + 1 (minute) with the
  // deciding policy's B active and R unconsumed and losing (§11.2). B with C = 0 has no cooldown and so no release
  // [C1].
  private isRelease(pr: PolicyRuntime, s: number, minute: boolean) {
    const B = pr.policy.protect?.B;
    const R = this.restrictingRecord();

    if (!B || !R || !(B.C >= 1)) {
      return false;
    }

    return minute ? s === R.exitIndex + B.C + 1 : s === R.exitIndex + B.C;
  }

  private blockRow(s: number, kind: BlockRow['kind'], entry: BlockRow['entry'], minute: boolean, policy: string) {
    if (this.record) {
      this.blocks.push({ index: s, kind, entry, minute, policy });
    }
  }

  // ----- §11.5: rule A's check at the start of session s (position open, no exit executing in s) -----

  private losingHoldCheck(s: number, delayed: number): LosingHoldOrder | null {
    const { ds } = this;
    const p = this.pos!;
    const A = p.pr.policy.protect?.A; // the position's own policy's N (S2: the continuing old position keeps it)

    if (!A || !(s > p.entryIndex)) {
      return null;
    }

    // Eligibility: d = calendar days from the entry session's date; offset = the entry fill time − the time of the
    // entry session's scheduled opening-fill bar (bar 0, or the delayed bar; bar 0 if none) [C6].
    const e = p.entryIndex;
    let scheduled = 0;

    if (this.delay > 0) {
      const j = firstTradeFrom(ds, e, ds.bTime[ds.sBarStart[e]!]! + 60 * this.delay);

      scheduled = j >= 0 ? j : 0;
    }

    const offset = p.trade.entryTime - timeAt(ds, e, scheduled);
    const d = Math.round((ds.sTime[s]! - ds.sTime[e]!) / secondsPerDay);

    if (!(d > A.N || (d === A.N && offset <= 0))) {
      return null;
    }

    // The hypothetical liquidation at the opening print (opening slippage included in both modes).
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const openMode = this.losingHoldFill === 'open';
    const x0 = openMode && delayed >= 0 ? priceAt(ds, s, delayed) : ds.bOpen[start]!; // [C5]
    const netOpen = p.S * x0 * (1 - this.c) * (1 - this.openSlip) + p.trimCash - p.L - this.tradeInterest(p, s);
    const due = netOpen < 0;

    this.aChecks += 1;

    if (this.record) {
      this.aEvents.push({ index: s, trade: p.trade.id, netOpen, due });
    }

    if (!due) {
      return null;
    }

    this.aDue += 1;

    const fallback: LosingHoldOrder = { bar: count - 1, fallback: true, opening: false, stopSlip: true, done: false };

    if (openMode) {
      this.trimOrder = null; // a pending trim at the same bar is cancelled: the whole position is sold instead

      return delayed >= 0 ? { bar: delayed, fallback: false, opening: true, stopSlip: false, done: false } : fallback;
    }

    // Mode next: the next trade after the (delayed) print; a pending trim executes at its opening trade first.
    const j = firstTradeFrom(ds, s, ds.bTime[start]! + 60 * (1 + this.delay));

    return j >= 0 ? { bar: j, fallback: false, opening: false, stopSlip: true, done: false } : fallback;
  }

  // The losing-hold sale of the whole position at bar k (raw, time), then a flat minute mark at the fill.
  private losingHoldExit(s: number, k: number, raw: number, time: number, order: LosingHoldOrder) {
    order.done = true;
    this.exitOrder = null; // as after a stop [C4]
    this.closePosition(s, k, time, raw, 'losing hold', order.opening, '', order.stopSlip);
    this.flatMark(s, time);
  }

  // ----- the minute loop of a session s > e (§2) -----

  private session(s: number) {
    const { ds } = this;
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const delayed = this.delay > 0 ? firstTradeFrom(ds, s, ds.bTime[start]! + 60 * this.delay) : 0;
    const exitBar = this.pos && (this.exitOrder || this.conversionOrder) ? delayed : -1;
    // §11.5: rule A's check at the start of the session, with the position open and no exit executing in s (exitBar
    // = −1) [C4]. In mode open a due order cancels the pending trim, so it precedes trimBar.
    const aOrder = this.pos && exitBar === -1 ? this.losingHoldCheck(s, delayed) : null;
    const trimBar = this.pos && this.trimOrder ? delayed : -1;
    let entryBar = !this.pos && this.entryOrder ? delayed : -1;
    let entry: EntryOrder | null = entryBar >= 0 ? this.entryOrder : null;
    let entryFromOrder = entryBar >= 0;
    let exited = false;
    let entered = false;
    let frozenCounted = false; // a rule-B minute block is counted once per session [C3]
    let cCounted = false; // a rule-C minute block is counted once per session [C3]
    const intraday = () => this.active.signals.kind === 'intraday';

    if (!(this.pos || entryBar >= 0 || (intraday() && this.reference.active && !this.entryOrder))) {
      return;
    }

    for (let k = 0; k <= count; k++) {
      const bar = start + k;

      // 1. the pending close-decided exit, transition or conversion at the opening trade (+ delay)
      if (k === exitBar && this.pos) {
        if (this.conversionOrder) {
          this.convert(s, k);

          if (k < count && this.fillBarStop(s, k)) {
            exited = true;
          }
        } else if (this.exitOrder) {
          this.executeExit(s, k);
          exited = true;
        }
      }

      // 2. the pending trim, if the open is above the resting level (or at the closing print)
      if (k === trimBar && this.trimOrder) {
        if (this.pos && (k === count || ds.bOpen[bar]! > this.pos.level)) {
          this.trim(s, k);
        }

        this.trimOrder = null;
      }

      // 2b. rule A's losing-hold order at its bar (§11.5): a gap at the opening print through the resting level is
      // the stop's (step 3); a position closed before aBar lets the order lapse [C7].
      if (aOrder && !aOrder.fallback && !aOrder.done && k === aOrder.bar) {
        if (!this.pos) {
          aOrder.done = true;
          this.aCancelled += 1;
        } else if (k === 0 && ds.bOpen[start]! <= this.pos.level) {
          aOrder.done = true;
          this.aCancelled += 1;
        } else {
          this.losingHoldExit(s, k, priceAt(ds, s, k), timeAt(ds, s, k), aOrder);
          exited = true;
        }
      }

      // 3. the resting stop
      if (this.pos && k < count && k !== exitBar && this.restingStop(s, k)) {
        exited = true;
      }

      // 3b. rule A's fallback (mode next with no later trade): after step 3 of bar count − 1, sell at that bar's close
      // at its bar time (not an opening fill; stop slippage) [C5].
      if (aOrder && aOrder.fallback && !aOrder.done && k === count - 1) {
        if (this.pos) {
          this.losingHoldExit(s, k, ds.bClose[bar]!, ds.bTime[bar]!, aOrder);
          exited = true;
        } else {
          aOrder.done = true;
          this.aCancelled += 1;
        }
      }

      // 4. the entry (a pending order at the opening trade, or a same-session minute decision)
      if (k === entryBar && entry && !this.pos && !exited && !entered) {
        this.open(s, k, entry, entryFromOrder);

        if (entryFromOrder) {
          this.entryOrder = null;
        }

        entered = true;
        entryBar = -1;
        entry = null;

        if (k < count && this.fillBarStop(s, k)) {
          exited = true;
        }
      }

      // 5. the intraday minute rule
      if (!this.pos && !this.entryOrder && entryBar < 0 && this.reference.active && k < count && intraday()) {
        const sig = this.active.signals;

        if (sig.kind === 'intraday') {
          const ref = this.reference;
          const allowed =
            !entered && s >= ref.triggerFrom && !(this.campaign !== null && this.active.policy.reentry === 'RN');
          const kind: EntryOrder['kind'] = this.campaign ? 'reentry' : 'first';
          const R = this.R;
          // §11.2: after the exit session and until the release the minute rule is frozen.
          const frozen = R !== null && s > R.exitIndex && this.blockB(this.active, s, true);
          let fire = false;

          if (frozen) {
            // It does not fire; a low reference is not updated; a high reference ratchets to the cooldown's highs.
            if (sig.mode === 'high') {
              ref.value = Math.max(ref.value, ds.bHigh[bar]!);
            }

            this.cooling = true;

            if (allowed && !frozenCounted) {
              frozenCounted = true;
              this.bBlocks += 1;
              this.blockRow(s, 'B', kind, true, this.active.id);
            }
          } else {
            if (this.cooling) {
              // The first unfrozen minute after a cooldown: a low reference restarts at +∞ (high keeps its value).
              this.cooling = false;

              if (sig.mode === 'low') {
                ref.value = Infinity;
              }
            }

            let own = false;

            if (sig.mode === 'low') {
              ref.value = Math.min(ref.value, ds.bLow[bar]!);
              own = ds.bClose[bar]! >= ref.value * (1 + sig.y);
            } else {
              own = ds.bClose[bar]! > ref.value * (1 + sig.y);
              ref.value = Math.max(ref.value, ds.bHigh[bar]!);
            }

            if (allowed && own) {
              // §11.3: the deciding minute's close against the level; previous = the previous minute's close, or at
              // minute 0 the previous session's close when not earlier than the arming exit session.
              const previous = k > 0 ? ds.bClose[bar - 1]! : this.previousClose(s);

              if (this.allowC(this.active, ds.bClose[bar]!, previous)) {
                fire = true;
              } else if (!cCounted) {
                // A prevented firing: the reference stays active with its Stage 1b update [C2].
                cCounted = true;
                this.cBlocks += 1;
                this.blockRow(s, 'C', kind, true, this.active.id);
              }
            }
          }

          if (fire) {
            ref.active = false;

            const decision = ds.bTime[bar]! + 60 + 60 * this.delay;
            const fill = firstTradeAfterDecision(ds, s, decision);
            const order: EntryOrder = {
              kind,
              rule: 'minute',
              structLevel: NaN,
              releaseEntry: this.isRelease(this.active, s, true),
              cLevel: this.armedLevel(this.active)
            };

            this.adoptionDeferred = false; // an entry decision passed [C8]

            if (fill >= 0) {
              entryBar = fill;
              entry = order;
              entryFromOrder = false;
            } else {
              this.entryOrder = order; // a `minute` pending entry for the next session's opening trade
            }
          }
        }
      }

      // 6. minute marks while long
      if (this.pos && k < count) {
        const p = this.pos;

        if (!(p.entryIndex === s && p.trade.entryBar > k)) {
          p.MAE = Math.min(p.MAE, ds.bLow[bar]!);
          p.MFE = Math.max(p.MFE, ds.bHigh[bar]!);
        }

        this.markMinute(this.markAt(s, ds.bClose[bar]!), ds.bTime[bar]!);
      }
    }
  }

  private executeExit(s: number, k: number) {
    const p = this.pos!;
    const order = this.exitOrder!;
    const raw = priceAt(this.ds, s, k);
    const time = timeAt(this.ds, s, k);
    const throughLevel = k === 0 && this.ds.bOpen[this.ds.sBarStart[s]!]! <= p.level;
    const reason: ExitReason = order.transition ? 'transition' : throughLevel ? 'stop gap' : order.reason;

    this.exitOrder = null;
    this.closePosition(s, k, time, raw, reason, true, order.transition && throughLevel ? 'gap' : '');
    this.flatMark(s, time);
  }

  private restingStop(s: number, k: number) {
    const p = this.pos!;
    const bar = this.ds.sBarStart[s]! + k;

    if (this.ds.bOpen[bar]! <= p.level) {
      return this.stopOut(s, k, true);
    }

    return this.ds.bLow[bar]! <= p.level ? this.stopOut(s, k, false) : false;
  }

  // The fill-bar check after an entry or a conversion: the minute's low only (the fill is at or above its open).
  private fillBarStop(s: number, k: number) {
    const p = this.pos;

    return p !== null && this.ds.bLow[this.ds.sBarStart[s]! + k]! <= p.level ? this.stopOut(s, k, false) : false;
  }

  private stopOut(s: number, k: number, atOpen: boolean) {
    const { ds } = this;
    const p = this.pos!;
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const bar = start + k;
    const gap = atOpen && k === 0;
    let fillBar = k;
    let raw = atOpen ? ds.bOpen[bar]! : p.level;
    let time = ds.bTime[bar]!;

    if (this.delay > 0) {
      const j = firstTradeFrom(ds, s, ds.bTime[bar]! + 60 * this.delay);

      if (j >= 0) {
        fillBar = j;
        raw = priceAt(ds, s, j);
        time = timeAt(ds, s, j);
      } else {
        fillBar = count - 1; // [N7]
        raw = ds.bClose[start + count - 1]!;
        time = ds.bTime[start + count - 1]!;
      }
    }

    this.exitOrder = null;
    this.closePosition(s, fillBar, time, raw, gap ? 'stop gap' : 'stop', gap, '');
    this.flatMark(s, ds.bTime[bar]!);

    return true;
  }

  // ----- fills -----

  private newTrade(
    pr: PolicyRuntime,
    campaign: number,
    kind: Trade['kind'],
    rule: string,
    s: number,
    k: number,
    raw: number,
    entryPrice: number,
    shares: number,
    principal: number,
    friction: number
  ): Trade {
    const trade: Trade = {
      id: this.trades.length + 1,
      policy: pr.id,
      campaign,
      kind,
      rule,
      entryIndex: s,
      entryBar: k,
      entryTime: timeAt(this.ds, s, k),
      entryRaw: raw,
      entryPrice,
      shares,
      principal,
      trims: [],
      exitIndex: -1,
      exitBar: -1,
      exitTime: NaN,
      exitRaw: NaN,
      exitPrice: NaN,
      exitShares: 0,
      exitReason: 'open',
      stopComponent: '',
      stopLevel: NaN,
      gapFlag: '',
      shortfall: 0,
      proceeds: 0,
      priceGain: 0,
      friction,
      interest: 0,
      net: 0,
      sessionsHeld: 0,
      calendarDays: 0,
      maeLow: raw,
      mfeHigh: raw,
      highClose: raw,
      peakProfit: -Infinity, // set at held closes [N14]
      peakGross: 0,
      cLevel: NaN, // set by open() from its decision; conversions and ZR segments keep NaN / false [C9]
      cFillBelow: false,
      releaseEntry: false
    };

    this.trades.push(trade);

    return trade;
  }

  private newPosition(
    trade: Trade,
    pr: PolicyRuntime,
    s: number,
    S: number,
    L: number,
    x: number,
    structLevel: number,
    permHigh: number
  ): Position {
    return {
      trade,
      pr,
      entryIndex: s,
      S,
      L,
      E: x,
      Hc: x,
      MFE: x,
      MAE: x,
      structLevel,
      stopCore: -Infinity,
      coreComponent: '',
      volLevel: -Infinity,
      level: -Infinity,
      levelComponent: '',
      ownCount: 0,
      ownOutSeen: false,
      permExpired: false,
      permHigh,
      floorArmed: false,
      lastHigh: s,
      peakProfit: -Infinity,
      trimCash: 0,
      accrued: 0,
      loans: [{ from: s, principal: L, to: -1, interest: 0 }]
    };
  }

  // §3: open the active policy's position at bar k.
  private open(s: number, k: number, order: EntryOrder, opening: boolean) {
    const pr = this.active;
    const x = priceAt(this.ds, s, k);
    const newCampaign = order.kind === 'first' || this.campaign === null;
    let campaign: number;
    let permHigh = -Infinity;

    this.endFlat(s);

    if (newCampaign) {
      this.campaigns += 1;
      campaign = this.campaigns;
    } else {
      this.reentries += 1;
      campaign = this.campaign!.id;
      permHigh = this.campaign!.permHigh;
    }

    this.campaign = null; // it lives inside the position from here

    const buy = this.buyPrice(x, opening);
    const S = this.B0 / buy;
    const trade = this.newTrade(
      pr,
      campaign,
      newCampaign ? 'first' : 'reentry',
      order.rule,
      s,
      k,
      x,
      buy,
      S,
      this.B0,
      this.B0 - S * x
    );

    // §11.2–§11.3: the decision's release label and C level; a fill gapping below the level is recorded, never undone.
    trade.releaseEntry = order.releaseEntry;
    trade.cLevel = order.cLevel;
    trade.cFillBelow = x < order.cLevel * (1 - tolerance); // false when cLevel is NaN

    if (trade.cFillBelow) {
      this.cFillsBelow += 1;
    }

    this.consumeRecord(); // every entry fill consumes R (§11.1)
    this.pos = this.newPosition(trade, pr, s, S, this.B0, x, order.structLevel, permHigh);
    this.cashFlow(s, -this.B0);
    this.event(s, k, 'entry', trade.id, x, S, -this.B0);
    this.updateLevel(s, true);
  }

  private consumeRecord() {
    if (this.R) {
      this.R.consumed = true;
    }
  }

  // §4: a trim of the pending q shares at bar k (an opening fill).
  private trim(s: number, k: number) {
    const p = this.pos!;
    const t = p.trade;
    const q = Math.min(this.trimOrder!.q, p.S);

    if (!(q > 0)) {
      return; // Z1/Z2 never buy [N20]
    }

    const y = priceAt(this.ds, s, k);
    const price = this.sellPrice(y, false, true);
    const proceeds = q * price;
    const segment = p.loans[p.loans.length - 1]!;

    segment.interest = (p.L * this.r * this.days(segment.from, s)) / daysPerYear;
    segment.to = s;
    p.accrued += segment.interest;

    const repaid = Math.min(p.L, proceeds);

    p.L -= repaid;
    p.trimCash += proceeds - repaid;
    p.S -= q;
    p.loans.push({ from: s, principal: p.L, to: -1, interest: 0 });
    t.proceeds += proceeds;
    t.priceGain += q * (y - p.E);
    t.friction += q * (y - price);
    t.trims.push({ index: s, bar: k, raw: y, price, shares: q, proceeds, repaid });
    this.cashFlow(s, proceeds);
    this.event(s, k, 'trim', t.id, y, q, proceeds);
  }

  // The trade-side bookkeeping of a close of all shares at raw y for `value` (§4).
  private settle(p: Position, s: number, bar: number, time: number, raw: number, value: number, exitPrice: number) {
    const t = p.trade;
    const interest = this.tradeInterest(p, s);
    const segment = p.loans[p.loans.length - 1]!;

    segment.interest = interest - p.accrued;
    segment.to = s;
    t.exitIndex = s;
    t.exitBar = bar;
    t.exitTime = time;
    t.exitRaw = raw;
    t.exitShares = p.S;
    t.exitPrice = exitPrice;
    t.stopLevel = p.level;
    t.proceeds += value;
    t.priceGain += p.S * (raw - p.E);
    t.friction += p.S * raw - value;
    t.interest = interest;
    t.net = t.proceeds - t.principal - interest;
    t.sessionsHeld = s - p.entryIndex + 1;
    t.calendarDays = this.days(p.entryIndex, s);
    t.highClose = p.Hc;
    t.maeLow = p.MAE;
    t.mfeHigh = p.MFE;
    this.realized += t.net;
    this.closedTradeInterest += interest;
    this.cashFlow(s, value);
  }

  // A close of the position (stop, stop gap, a close-decided exit, a transition or rule A's losing hold) and its
  // consequences. `stopSlip` defaults to the stops' (a losing-hold sale states its own, §11.5).
  private closePosition(
    s: number,
    bar: number,
    time: number,
    raw: number,
    reason: ExitReason,
    opening: boolean,
    gapFlag: Trade['gapFlag'],
    stopSlip?: boolean
  ) {
    const p = this.pos!;
    const t = p.trade;
    const stop = reason === 'stop' || reason === 'stop gap';
    const sell = this.sellPrice(raw, stopSlip ?? stop, opening);
    const value = p.S * sell;
    const exitedShares = p.S;

    t.exitReason = reason;
    t.stopComponent = stop ? p.levelComponent : '';

    if (stop) {
      t.shortfall = p.level - raw;
      t.gapFlag = reason === 'stop gap' ? (this.ds.sClose[s - 1]! < p.level ? 'level above prior close' : 'gap') : '';
    } else {
      t.gapFlag = gapFlag;
    }

    this.settle(p, s, bar, time, raw, value, sell);
    this.pos = null;
    this.trimOrder = null;
    this.event(s, bar, reason === 'transition' ? 'transition' : 'exit', t.id, raw, exitedShares, value);

    // §11.1: an own-rule exit of the whole position writes the account loss record, whether or not any policy has B
    // or C; a transition never does [C18].
    if (ownRuleReasons.has(reason)) {
      this.R = { exitIndex: s, exitRaw: raw, entryRaw: p.E, net: t.net, consumed: false };
    }

    if (reason === 'transition') {
      this.transitions.push({ index: s, kind: 'transition', detail: `${p.pr.id} -> ${this.active.id}` }); // [N16]
    }

    // A conversion still pending when the old position is stopped first becomes S1's adoption at that exit.
    if (this.conversionOrder) {
      this.active = this.conversionOrder.to;
      this.conversionOrder = null;
    }

    // The campaign after a close.
    const rule = p.pr.policy.reentry;
    const ends =
      reason === 'own out' ||
      reason === 'transition' ||
      p.pr.id !== this.active.id ||
      (rule === 'RPM' ? p.permExpired : p.ownOutSeen);

    if (ends) {
      this.campaign = null;
    } else {
      this.reentryOpportunities += 1;
      this.campaign = {
        id: t.campaign,
        stoppedHigh: p.Hc,
        stopAtExit: p.level,
        trough: Infinity,
        exitIndex: s,
        structLevel: p.structLevel,
        permHigh: p.permHigh,
        belowStop: false,
        failedBefore: false
      };
    }

    if (p.pr.id !== this.active.id) {
      this.adoptionClose = s; // the exit session of a position whose policy is no longer the active one
      this.adoptionDeferred = false; // a new adoption close is set [C8]
    }

    // The intraday reference after an exit.
    const sig = this.active.signals;

    if (sig.kind === 'intraday') {
      this.cooling = false; // the reference restarts [C11]
      this.reference.active = true;
      this.reference.value = sig.mode === 'low' ? Infinity : p.pr.id === this.active.id ? p.Hc : -Infinity;
      this.reference.triggerFrom = s + 1;
    }

    this.beginFlat(s);
  }

  // §6: the S3 conversion at the opening trade x of bar k.
  private convert(s: number, k: number) {
    const order = this.conversionOrder!;
    const p = this.pos!;
    const old = p.trade;
    const x = priceAt(this.ds, s, k);
    const gapped = k === 0 && this.ds.bOpen[this.ds.sBarStart[s]!]! <= p.level;
    const target = order.target;
    const S = p.S;
    const sell = this.sellPrice(x, false, true);
    const buy = this.buyPrice(x, true);
    let value: number;
    let principal: number;
    let friction: number;

    if (S >= target) {
      value = target * x + (S - target) * sell;
      principal = target * x;
      friction = 0;
    } else {
      value = S * x;
      principal = S * x + (target - S) * buy;
      friction = (target - S) * (buy - x);
    }

    this.conversionOrder = null;
    this.exitOrder = null;
    old.exitReason = 'conversion';
    old.stopComponent = '';
    old.gapFlag = gapped ? 'gap' : '';
    this.settle(p, s, k, timeAt(this.ds, s, k), x, value, value / S);
    this.transitions.push({ index: s, kind: 'conversion', detail: `${p.pr.id} -> ${order.to.id}` });
    this.campaign = null; // [N15]
    this.trimOrder = null;
    this.campaigns += 1;
    this.active = order.to;

    const trade = this.newTrade(
      order.to,
      this.campaigns,
      'conversion',
      'conversion',
      s,
      k,
      x,
      principal / target,
      target,
      principal,
      friction
    );

    this.consumeRecord(); // a conversion is an entry fill (§11.1); its old leg never writes R [C9]
    this.pos = this.newPosition(trade, order.to, s, target, principal, x, order.structLevel, -Infinity);
    this.cashFlow(s, -principal);
    this.event(s, k, 'conversion', trade.id, x, Math.abs(target - S), value - principal);
    this.updateLevel(s, true);
  }

  // ----- §7: the resting stop level -----

  private updateLevel(s: number, atFill: boolean) {
    const p = this.pos!;
    const x = p.pr.policy.exit;
    const Hc = p.Hc;
    const Hh = Math.max(p.MFE, Hc);
    const E = p.E;
    const I = this.tradeInterest(p, Math.max(s, p.entryIndex));
    let core = -Infinity;
    let component: StopComponent = '';
    const consider = (value: number, name: StopComponent) => {
      if (value > core) {
        core = value; // ties keep the earlier-listed component [N11]
        component = name;
      }
    };

    if (x.hard !== undefined) {
      consider(E * (1 - x.hard), 'hard');
    }

    if (x.trail) {
      consider((x.trail.ref === 1 ? Hh : Hc) * (1 - x.trail.t), 'trail');
    }

    if (x.catastrophic !== undefined) {
      consider(Hc * (1 - x.catastrophic), 'catastrophic');
    }

    if (x.vol) {
      const atr = this.F.atr(x.vol.n)[atFill ? s - 1 : s];
      const d =
        atr !== undefined && Number.isFinite(atr) ? clamp((x.vol.k * atr) / Hc, x.vol.dmin, x.vol.dmax) : x.vol.dmax;

      p.volLevel = Math.max(p.volLevel, Hc * (1 - d));
      consider(p.volLevel, 'vol');
    }

    if (x.ratchet && Hc >= E * (1 + x.ratchet.g)) {
      consider(Hc * (1 - x.ratchet.t2), 'ratchet');
    }

    if (x.retain && Hc >= E * (1 + x.retain.a)) {
      consider(E + x.retain.rho * (Hc - E), 'retain');
    }

    for (const g of p.pr.givebacks) {
      if (p.S > 0 && p.peakProfit >= g.A) {
        consider((p.peakProfit - g.G - p.trimCash + p.L + I) / p.S, 'giveback');
      }
    }

    if (x.expTrail && p.S > 0) {
      const { t0, gamma, tmin } = x.expTrail;
      const tEff = Math.min(t0, Math.max(tmin, t0 * Math.pow((p.S * Hc) / this.B0, -gamma)));

      consider(Hc * (1 - tEff), 'exp');
    }

    if (core > p.stopCore) {
      p.stopCore = core;
      p.coreComponent = component;
    }

    let d1 = -Infinity;

    if (x.d1net && p.S > 0 && p.S * Hh * (1 - x.d1net.t) - p.L - I + p.trimCash > 0) {
      d1 = Hh * (1 - x.d1net.t);
    }

    if (d1 > p.stopCore) {
      p.level = d1;
      p.levelComponent = 'd1net';
    } else {
      p.level = p.stopCore;
      p.levelComponent = p.coreComponent;
    }
  }

  // ----- §5: the close of session s -----

  private close(s: number) {
    if (this.pos) {
      this.closeLong(s);
    } else if (!this.entryOrder) {
      this.decideFlat(this.active, s);
    }

    const next = this.boundaries.get(s);

    if (next) {
      this.boundary(next, s);
    }
  }

  private closeLong(s: number) {
    const p = this.pos!;
    const t = p.trade;
    const C = this.ds.sClose[s]!;

    this.markMinute(this.markAt(s, C), this.ds.sCloseTime[s]!);

    if (C > p.Hc) {
      p.lastHigh = s;
    }

    p.Hc = Math.max(p.Hc, C);

    const own = this.ownOut(p.pr, s, p.structLevel);

    if (own) {
      p.ownOutSeen = true;
    }

    p.ownCount = own ? p.ownCount + 1 : 0;

    if (p.pr.policy.reentry === 'RPM') {
      p.permHigh = Math.max(p.permHigh, C);

      if (C < this.sma200[s]! || C <= 0.85 * p.permHigh) {
        p.permExpired = true;
      }
    }

    const profit = p.trimCash + p.S * C - p.L - this.tradeInterest(p, s);

    p.peakProfit = Math.max(p.peakProfit, profit);
    t.peakProfit = p.peakProfit;
    t.peakGross = Math.max(t.peakGross, p.S * C);

    const reason = this.decideExit(p, s, C);

    if (reason) {
      this.exitOrder = { reason, transition: false };
    } else if (s < this.end) {
      this.decideTrim(p, s, C);
    }

    this.updateLevel(s, false); // [N12]
  }

  // The close-decided exit, first match: own out > trend > damage > structural > stale > max hold > stall.
  private decideExit(p: Position, s: number, C: number): ExitReason | null {
    const x = p.pr.policy.exit;
    const closes = this.ds.sClose;

    if (x.own && p.ownCount >= (x.ownConsecutive ?? 1)) {
      return 'own out';
    }

    if (x.trendLow !== undefined && C < this.F.priorMinClose(x.trendLow)[s]!) {
      return 'trend';
    }

    if (x.damage) {
      const { p: depth, N, mode } = x.damage;
      const priceDamage = C <= p.Hc * (1 - depth);
      const trendDamage = N > 0 && C < this.F.priorMinClose(N)[s]!;
      const both = mode === 1 || (mode === 2 && C > this.sma200[s]!);

      if (both ? priceDamage && trendDamage : priceDamage || trendDamage) {
        return 'damage';
      }
    }

    if (x.floor && p.pr.floorOut) {
      const out = p.pr.floorOut[s];

      if (out === 1 && (!x.floor.arm || p.floorArmed)) {
        return 'structural';
      }

      if (out === 0) {
        p.floorArmed = true; // armed after a held close with E05's out 0 (AMENDMENTS.md A1.2) [N10]
      }
    }

    if (x.stale && s - p.lastHigh >= x.stale.U && C <= p.Hc * (1 - x.stale.d)) {
      return 'stale';
    }

    if (x.maxHold !== undefined && s - p.entryIndex + 1 >= x.maxHold) {
      return 'max hold';
    }

    if (x.stall && s - p.entryIndex >= x.stall.T) {
      const { T, m, d, hurdle } = x.stall;
      const then = closes[s - T]!;
      const h =
        hurdle === 'sessions'
          ? (stage1HurdleRate * T) / 252
          : (p.L * this.r * this.days(s - T, s)) / daysPerYear / (p.S * then);

      if (C < then * (1 + h + m) && C <= p.Hc * (1 - d)) {
        return 'stall';
      }
    }

    return null;
  }

  private decideTrim(p: Position, s: number, C: number) {
    const z = p.pr.policy.sizing;
    const dates = this.ds.dates;

    if (z.kind === 'Z1') {
      if (monthOf(dates[s]!) !== monthOf(dates[s - 1]!) && p.S * C > this.B0 * (1 + z.band)) {
        this.trimOrder = { q: p.S - this.B0 / C };
      }
    } else if (z.kind === 'Z2') {
      if (p.S * C >= this.B0 * (1 + z.u)) {
        this.trimOrder = { q: p.S - (this.B0 * (1 + z.v)) / C };
      }
    }
  }

  // decideFlat(policy, s): campaign state, then the re-entry rule or a fresh first entry.
  private decideFlat(pr: PolicyRuntime, s: number) {
    const C = this.ds.sClose[s]!;
    const rule = pr.policy.reentry;
    const existing = this.campaign;

    if (existing) {
      const dies =
        rule === 'RPM'
          ? C < this.sma200[s]! || C <= 0.85 * Math.max(existing.permHigh, C)
          : this.ownOut(pr, s, existing.structLevel);

      if (dies) {
        this.campaign = null;
      } else {
        existing.trough = Math.min(existing.trough, C);
        existing.permHigh = Math.max(existing.permHigh, C);
      }
    }

    const alive = this.campaign;
    let reclaimed = false;

    if (alive) {
      reclaimed = alive.belowStop && C > alive.stopAtExit;

      if (C <= alive.stopAtExit) {
        alive.belowStop = true;
      }
    }

    // §11.4: the adoption-deferred flag clears at a flat close without a live campaign whose fresh condition is false
    // [C8].
    if (!alive && !this.fresh(pr, s)) {
      this.adoptionDeferred = false;
    }

    if (s === this.end) {
      return;
    }

    let order: EntryOrder | null = null;
    const none = { releaseEntry: false, cLevel: NaN }; // set below when the decision passes

    if (alive) {
      const fresh = pr.signals.kind === 'event' && pr.signals.trigger[s] === 1;
      let ok = false;

      switch (rule) {
        case 'R0':
          ok = true;
          break;
        case 'RC10':
          ok = s - alive.exitIndex >= 10;
          break;
        case 'R3F':
          ok = C > alive.stoppedHigh;
          break;
        case 'RP50':
          ok = C >= alive.trough + 0.5 * (alive.stoppedHigh - alive.trough);
          break;
        case 'RS':
          ok = reclaimed;
          break;
        case 'RFL':
          ok = this.rfl()[s] === 1;
          break;
        case 'REF': {
          const efficient = this.F.efficiency(30)[s]! >= 0.3 && this.F.annualisedReturn(30)[s]! >= 0.11;

          ok = efficient && alive.failedBefore;

          if (!efficient) {
            alive.failedBefore = true;
          }

          break;
        }
        case 'RPM':
          ok = C > this.F.priorMaxClose(10)[s]!;
          break;
        case 'RN':
        case 'RF':
          ok = false;
          break;
      }

      if (ok) {
        order = { kind: 'reentry', rule, structLevel: alive.structLevel, ...none };
      } else if (fresh && rule !== 'RN') {
        order = { kind: 'reentry', rule: 'fresh', structLevel: this.eventLevel(pr, s), ...none };
      }
    } else if (this.fresh(pr, s)) {
      // A first entry at the adoption close, or one of the same uninterrupted signal state after a discarded
      // adoption decision, keeps the label `adoption` (§11.4).
      order = {
        kind: 'first',
        rule: s === this.adoptionClose || this.adoptionDeferred ? 'adoption' : 'fresh',
        structLevel: this.eventLevel(pr, s),
        ...none
      };
    }

    if (!order) {
      return;
    }

    // §11.2–§11.4: the deciding policy's B and C. A discarded decision has no effect beyond counters and block rows:
    // nothing becomes pending, the reference, its value and triggerFrom are untouched and no adoption label is consumed.
    const blockedB = this.blockB(pr, s, false);
    const allowedC = this.allowC(pr, C, this.previousClose(s));

    if (blockedB || !allowedC) {
      if (blockedB) {
        this.bBlocks += 1;
      } else {
        this.cBlocks += 1;
      }

      if (blockedB && !allowedC) {
        this.bcBoth += 1;
      }

      this.blockRow(s, blockedB && !allowedC ? 'BC' : blockedB ? 'B' : 'C', order.kind, false, pr.id);

      if (order.kind === 'first' && order.rule === 'adoption') {
        this.adoptionDeferred = true;
      }

      return;
    }

    order.releaseEntry = this.isRelease(pr, s, false);
    order.cLevel = this.armedLevel(pr);
    this.adoptionDeferred = false; // an entry decision passed [C8]
    this.entryOrder = order;
    this.reference.active = false;
  }

  // ----- §6: a schedule boundary at the close of b, after its close processing -----

  private boundary(policy: Policy, b: number) {
    const next = this.runtime(policy);

    if (next.id === this.active.id) {
      return; // an identical re-selection: position, orders and campaign continue
    }

    const detail = `${this.active.id} -> ${next.id}`;

    this.entryOrder = null;

    // §11.1 restrictionCarry: under `reset` the loss record is cleared immediately after the pending entry is
    // cancelled and before any decideFlat(new, b); under `persist` it is account memory and is untouched.
    if (this.restrictionCarry === 'reset') {
      this.R = null;
    }

    if (this.pos) {
      if (this.mode === 'S2') {
        this.transitions.push({ index: b, kind: 'continue-old', detail });
        this.campaign = null;
        this.active = next;
        this.reference.active = false;
      } else if (this.mode === 'S3' && !this.exitOrder && this.fresh(next, b)) {
        this.conversionOrder = {
          target: this.B0 / this.ds.sClose[b]!,
          to: next,
          structLevel: this.eventLevel(next, b)
        };
        this.exitOrder = null;
        this.trimOrder = null;
        this.campaign = null;
        this.reference.active = false; // the active policy changes at the conversion
      } else {
        this.trimOrder = null;
        this.campaign = null;

        if (!this.exitOrder) {
          this.exitOrder = { reason: 'transition', transition: true };
        }

        this.active = next;
        this.reference.active = false;
      }
    } else {
      this.transitions.push({ index: b, kind: 'adopt-flat', detail });
      this.campaign = null;
      this.active = next;
      this.adoptionClose = b;
      this.adoptionDeferred = false; // a new adoption close is set [C8]
      this.startReference(next, b);
      this.decideFlat(next, b);
    }
  }

  // ----- §10: ZR (C-ALR), Stage 1's monthly reset to B0/raw shares -----

  private zrSession(s: number) {
    const { ds } = this;
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const k0 = this.delay > 0 ? firstTradeFrom(ds, s, ds.bTime[start]! + 60 * this.delay) : 0;
    const reset = k0 >= 0 && (this.seg === null || monthOf(ds.dates[s]!) !== monthOf(ds.dates[s - 1]!));

    for (let k = 0; k <= count; k++) {
      if (reset && k === k0) {
        this.zrReset(s, k);
      }

      if (this.seg && k < count) {
        const g = this.seg;
        const bar = start + k;

        if (!(g.trade.entryIndex === s && g.trade.entryBar > k)) {
          g.MAE = Math.min(g.MAE, ds.bLow[bar]!);
          g.MFE = Math.max(g.MFE, ds.bHigh[bar]!);
        }

        this.markMinute(this.markAt(s, ds.bClose[bar]!), ds.bTime[bar]!);
      }
    }
  }

  private zrReset(s: number, k: number) {
    const raw = priceAt(this.ds, s, k); // bOpen[k0] (the closing print only if no minute is left)
    const time = timeAt(this.ds, s, k);
    const before = this.seg ? this.seg.S : 0;

    if (this.seg) {
      const g = this.seg;
      const t = g.trade;
      const interest = this.zrInterest(g, s);

      t.exitIndex = s;
      t.exitBar = k;
      t.exitTime = time;
      t.exitRaw = raw;
      t.exitPrice = raw;
      t.exitShares = g.S;
      t.exitReason = 'resize';
      t.stopLevel = -Infinity;
      t.priceGain = g.S * (raw - g.basis);
      t.friction = g.friction;
      t.interest = interest;
      t.net = t.priceGain - t.friction - interest;
      t.proceeds = t.net + t.principal + interest;
      t.sessionsHeld = s - t.entryIndex + 1;
      t.calendarDays = this.days(t.entryIndex, s);
      t.highClose = g.Hc;
      t.maeLow = g.MAE;
      t.mfeHigh = g.MFE;
      this.realized += t.net;
      this.closedTradeInterest += interest;
      this.cashFlow(s, t.priceGain + this.B0);
      this.seg = null;
      this.event(s, k, 'exit', t.id, raw, t.exitShares, t.priceGain + this.B0);
    } else {
      this.endFlat(s);
    }

    const S = this.B0 / raw;
    const friction = Math.abs(S - before) * raw * this.c;

    if (this.campaigns === 0) {
      this.campaigns = 1; // one always-long campaign [N23]
    }

    // The first segment is kind first, rule fresh; later ones kind reentry, rule resize (AMENDMENTS.md A1.4) [N23].
    const first = before === 0;
    const trade = this.newTrade(
      this.active,
      1,
      first ? 'first' : 'reentry',
      first ? 'fresh' : 'resize',
      s,
      k,
      raw,
      raw,
      S,
      this.B0,
      friction
    );

    trade.stopLevel = -Infinity;
    this.seg = { trade, S, basis: raw, friction, start: s, Hc: raw, MAE: raw, MFE: raw, peakProfit: -Infinity };
    this.cashFlow(s, -(this.B0 + friction));
    this.event(s, k, 'entry', trade.id, raw, S, -(this.B0 + friction));
  }

  private zrClose(s: number) {
    const g = this.seg;

    if (!g) {
      return;
    }

    const C = this.ds.sClose[s]!;

    this.markMinute(this.markAt(s, C), this.ds.sCloseTime[s]!);
    g.Hc = Math.max(g.Hc, C);
    g.peakProfit = Math.max(g.peakProfit, g.S * (C - g.basis) - g.friction - this.zrInterest(g, s));
    g.trade.peakProfit = g.peakProfit;
    g.trade.peakGross = Math.max(g.trade.peakGross, g.S * C);
  }

  // ----- §8–§9: closes, daily rows, exposure, windows -----

  private account(s: number) {
    const { ds } = this;
    const C = ds.sClose[s]!;
    const long = this.isLong();

    if (!long && this.net && s > this.e) {
      this.markMinute(this.markAt(s, C), ds.sCloseTime[s]!);
    }

    const S = this.shares();
    const L = this.loanNow();
    const mark = this.markAt(s, C);
    const liquidation = mark - S * C * this.c;
    const gross = S * C;
    const debit = Math.max(-this.M, 0);

    this.lastMark = mark;
    this.lastLiquidation = liquidation;

    if (this.record) {
      this.daily.push({
        mark,
        liquidation,
        shares: S,
        loan: L,
        gross,
        cash: this.M,
        realized: this.realized - this.carried(s),
        openTrade: this.openTradeId()
      });
    }

    if (long) {
      this.sessionsLong += 1;
      this.years.add(ds.sYear[s]!);
      this.peakGross = Math.max(this.peakGross, gross);
    }

    this.dailyPeak = Math.max(this.dailyPeak, mark);
    this.dailyDd = Math.max(this.dailyDd, this.dailyPeak - mark);

    const current = this.window;

    if (current && s > current.boundary) {
      current.dailyPeak = Math.max(current.dailyPeak, mark);
      current.dailyDd = Math.max(current.dailyDd, current.dailyPeak - mark);
      current.peakGross = Math.max(current.peakGross, gross);
      current.sessions += 1;

      if (long) {
        current.sessionsLong += 1;
      }
    }

    if (this.windowStarts.has(s)) {
      if (current) {
        this.finishWindow(current, s, mark, liquidation);
      }

      this.window = {
        boundary: s,
        startMark: mark,
        startLiquidation: liquidation,
        tracker: new Tracker(mark, ds.sCloseTime[s]!),
        dailyPeak: mark,
        dailyDd: 0,
        peakGross: 0,
        sessions: 0,
        sessionsLong: 0,
        grossDollarDays: 0,
        loanDollarDays: 0,
        debitDollarDays: 0,
        interestBase: this.accountInterest(s)
      };
    }

    if (s < this.end) {
      const days = this.days(s, s + 1);

      this.grossDollarDays += gross * days;
      this.loanDollarDays += L * days;
      this.debitDollarDays += debit * days;

      if (this.window) {
        this.window.grossDollarDays += gross * days;
        this.window.loanDollarDays += L * days;
        this.window.debitDollarDays += debit * days;
      }
    }
  }

  private finishWindow(w: WindowState, s: number, mark: number, liquidation: number) {
    this.windows.push({
      boundary: w.boundary,
      end: s,
      startMark: w.startMark,
      startLiquidation: w.startLiquidation,
      endMark: mark,
      endLiquidation: liquidation,
      increment: liquidation - w.startLiquidation,
      minuteDd: ddStats(w.tracker),
      dailyDd: w.dailyDd,
      grossDollarDays: w.grossDollarDays,
      loanDollarDays: w.loanDollarDays,
      debitDollarDays: w.debitDollarDays,
      calendarDays: this.days(w.boundary, s),
      peakGross: w.peakGross,
      sessionsLong: w.sessionsLong,
      sessions: w.sessions,
      interest: this.accountInterest(s) - w.interestBase
    });
  }

  // ----- the end of the run -----

  private finish(): RunResult {
    const { end } = this;
    const C = this.ds.sClose[end]!;
    const S = this.shares();
    const A = this.accountInterest(end);
    const carriedInterest = this.carried(end);
    let openNet = 0;

    // §4 End of run: the open trade valued at C_end (1 − c); exitIndex and exitBar stay −1, exitTime NaN
    // (AMENDMENTS.md A1.6) [N13].
    if (this.pos) {
      const p = this.pos;
      const t = p.trade;
      const value = p.S * C * (1 - this.c);

      t.exitRaw = C;
      t.exitShares = p.S;
      t.exitPrice = C * (1 - this.c);
      t.stopLevel = p.level;
      t.proceeds += value;
      t.priceGain += p.S * (C - p.E);
      t.friction += p.S * C * this.c;
      t.interest = this.tradeInterest(p, end);
      t.net = t.proceeds - t.principal - t.interest;
      t.sessionsHeld = end - p.entryIndex + 1;
      t.calendarDays = this.days(p.entryIndex, end);
      t.highClose = p.Hc;
      t.maeLow = p.MAE;
      t.mfeHigh = p.MFE;
      openNet = t.net;
    } else if (this.seg) {
      const g = this.seg;
      const t = g.trade;

      t.exitRaw = C;
      t.exitShares = g.S;
      t.exitPrice = C * (1 - this.c);
      t.priceGain = g.S * (C - g.basis);
      t.friction = g.friction + g.S * C * this.c;
      t.interest = this.zrInterest(g, end);
      t.net = t.priceGain - t.friction - t.interest;
      t.proceeds = t.net + t.principal + t.interest;
      t.sessionsHeld = end - t.entryIndex + 1;
      t.calendarDays = this.days(t.entryIndex, end);
      t.highClose = g.Hc;
      t.maeLow = g.MAE;
      t.mfeHigh = g.MFE;
      openNet = t.net;
    } else {
      this.endFlat(end); // net-debit: the unbooked flat interest
    }

    const endMark = this.markAt(end, C);
    const endLiquidation = this.net ? this.M + (S === 0 ? 0 : S * C * (1 - this.c)) - A : this.realized + openNet;

    if (this.window) {
      this.finishWindow(this.window, end, this.lastMark, this.lastLiquidation);
      this.window = null;
    }

    if (this.record) {
      const cash = S === 0 ? 0 : S * C * (1 - this.c);
      const M = this.M + cash;

      this.events.push({
        index: end,
        bar: -1,
        kind: 'end',
        trade: this.openTradeId(),
        raw: C,
        shares: S,
        cash,
        M,
        L: 0,
        debit: Math.max(-M, 0),
        interest: A,
        S: 0,
        G: 0,
        mark: M - A
      });
    }

    const result: RunResult = {
      trades: this.trades,
      realized: this.realized,
      endMark,
      endLiquidation,
      minuteDd: ddStats(this.tracker),
      dailyDd: this.dailyDd,
      windows: this.windows,
      sessionsLong: this.sessionsLong,
      sessions: end - this.e,
      grossDollarDays: this.grossDollarDays,
      loanDollarDays: this.loanDollarDays,
      calendarDays: this.days(this.e, end),
      peakGross: this.peakGross,
      campaigns: this.campaigns,
      reentries: this.reentries,
      reentryOpportunities: this.reentryOpportunities,
      yearsHeld: this.years.size,
      transitions: this.transitions,
      flatInterest: this.net ? this.flatInterest : 0,
      carriedInterest,
      debitDollarDays: this.debitDollarDays,
      pathHash: pathHashOf(this.trades),
      aChecks: this.aChecks,
      aDue: this.aDue,
      aCancelled: this.aCancelled,
      bBlocks: this.bBlocks,
      cBlocks: this.cBlocks,
      bcBoth: this.bcBoth,
      cFillsBelow: this.cFillsBelow
    };

    if (this.record) {
      result.daily = this.daily;
      result.events = this.events;
      result.blocks = this.blocks;
      result.aEvents = this.aEvents;
    }

    return result;
  }
}

// The independent reference: run(ds, schedule, options) of ENGINE_CONTRACT.md, slowly and literally.
export const referenceRun = (ds: Dataset, schedule: Policy | ScheduleItem[], options: RunOptions): RunResult =>
  new ReferenceSimulation(ds, schedule, options).run();

# D1 risk controls — specification (RC 1)

Optional, independently configurable risk controls for the D1 books of a New L0-family pooled portfolio (D1·VGT,
D1·GDX, Growth·VGT in one funded $100,000 slot). Written **before** the implementation (`src/d1-risk-controls/`). This is
a research mechanism, not a recommendation: nothing here shows that any control improves profit or reduces risk.
Choosing structures, parameters and thresholds is Assignment 2's job, under a precommitted protocol.

- **Spec id / version:** `RC` 1 (the `version: 1` field of a serialized configuration). A behavioural change needs a
  new version, never a silent edit.
- **Code:** `src/d1-risk-controls/` (configuration and identity `config.ts`; exit side `exit.ts`; book `book.ts`;
  pooled runner `run.ts`). The frozen engine files are **not edited** (§9).
- **Evidence it rests on:** `research/vg-l0-walk-forward-diagnostic/REPORT.md` (§3.4, §6 recommendation 8).

## 1. Why these three mechanisms exist, and what the evidence supports

| Observation (walk-forward diagnostic, sealed) | Mechanism | What the evidence does **not** show |
|---|---|---|
| D1 uses the **net-profit stop policy**: the trailing stop is active only while the position would be profitable at the stop level. An underwater lot has **no price exit before its maximum hold**. 62 of 64 losing D1 lots of the failing fold primaries exited at the maximum hold or the buffered loss. One crash dip-buy reached an MAE of −$44,579.74 before its hold expired. | **2A** an unconditional protective loss stop | It does not show that a stop would have raised net profit. Stops also sell dips that recover, and gaps make the loss larger than the stop distance. |
| In the 2022 bear the books re-entered and lost repeatedly at the maximum hold: a median of 6 maximum-hold losses (−$28.9k) per breaching 2022–2023 winner. | **2B** configurable maximum-hold policies; **2C** a prolonged-decline repeat-entry restriction | It does not show which hold length, or which restriction, is better. New L0 itself survived those episodes with the legacy rules, through parameters chosen with hindsight. |
| The diagnostic found **no implementation or accounting defect** in the audited engines. | None of these is a bug fix. | The legacy behaviour is correct as specified; these are new, optional rules. |

The frozen New L0's own historical backtest ($479,605.18 net, $20,385.99 minute DD, 2016-01-04 → 2026-10-30) is a
different object from the walk-forward procedures that failed to select robust portfolios at earlier cutoffs. New L0
itself was never tested by those procedures (it came from an informed lane, chosen with later data).

## 2. The legacy D1 state machine (inspected, unchanged)

Source of truth: `src/shared-margin-portfolio/strategy.ts` (`EntryMachine`, `ExitManager`), driven by
`src/multi-etf-allocator/shadow.ts` (`ShadowBook`) and Priority 3's `src/vg-d1-growth-joint/books.ts` (`runD1Book`).

| Rule | Legacy behaviour | Reference |
|---|---|---|
| Deep entry | A completed minute's close ≥ X below the rolling L-session high **arms** a setup (the arming minute never buys); the trailing low follows later minute lows; a close ≥ trailing low × (1 + Y) is the decision; the order fills at the first trade after it (or the next session's opening trade) | `EntryMachine.processBar`, `firstTradeAfterDecision` |
| Post-exit continuation | Only a **profitable** exit (net > 0) opens a window of W sessions; within it a close ≤ H × (1 − P) arms (H = the exit price, then raised by later session highs); any arming closes the window | `EntryMachine.onExit`, `afterSession`, `armingKind` |
| Flat-at-start rule | Entries only on sessions that start flat; never on an exit session | `ShadowBook.processBar` guard |
| Trailing stop | Level = post-entry high × (1 − stop), raised once a day after each session, never on the entry session; **active only if** shares × level − principal − interest > 0 (policy `net`) | `ExitManager.onEntry`, `afterSession`, `isStopActive` |
| Exits evaluated | Only for a position open at a session's start (no exit on the entry session) | `ShadowBook.beginSession` |
| Maximum hold | Calendar days: (session date − fill-session date) ÷ 86,400 s ≥ hold **and** shares × open − principal − interest < 0 (loss at the opening trade) → sells at the next observed trade after the opening minute. A profitable open is kept. | `ExitManager.evaluate` (`daysHeld`, `isMaximumHoldDue`) |
| Buffered intraday loss | Only once daysHeld ≥ hold: the first completed minute whose close gives net ≤ −principal × buffer sells at the first trade after it, or is carried to the next opening trade | `ExitManager.evaluate` |
| Material-loss / lower-price re-entry / recovery reset | **None in D1.** They exist only in the older restricted files (`src/app/allIn-trailingBuy.ts`: 1% material loss, 2% lower level, 38% recovery reset), not in the post-exit-continuation D1 that New L0 uses (`allIn-trailingBuy-postExitContinuation.ts` lines 91–95; `docs/strategy-lab/GROWTH_TRADING_AUDIT.md` §1, §5) | — |
| Shadow lifecycle | Each D1 book takes every signal it produces (a virtual trade); the pool decides which are funded; a refusal never feeds back | `ShadowBook`, `src/vg-d1-growth-joint/pool.ts` |
| Execution prices | Entry: first trade after the decision (minute open or closing print), ×(1 + 5 bps). Exits: opening trade, minute open, stop level (`stop` fill) or next minute's open (`next-open`), ×(1 − 5 bps) and, for stops only, × (1 − stop slippage). Interest: principal × 11% × calendar days ÷ 365 from the fill session's date. | `ShadowBook.open`, `close`; `pool.ts` `exitFill` |

Because every D1 exit rule is scale-invariant (price levels, or P&L relative to the same principal), a funded lot
exits exactly when and where its virtual trade does. The three controls keep that property (§6).

## 3. Configuration schema

A portfolio's controls are one object with optional entries for the two D1 books only. **Absent = legacy.** Growth
books cannot carry controls.

```ts
interface RiskConfig {
  version: 1;
  books: { 'D1:GDX'?: D1RiskControls; 'D1:VGT'?: D1RiskControls };
}
interface D1RiskControls {
  protectiveStop?: { mode: 'off' } | { mode: 'on'; stopDistanceTenths: number };
  hold?: { mode: 'legacy' } | { mode: 'disabled' } | { mode: 'adaptive'; extendedHoldDays: number; progressTenths: number };
  declineGate?: { mode: 'off' } | { mode: 'on'; losses: number; recoveryTenths: number; maxBlockSessions: number };
}
```

| Field | Unit | Valid values | Default |
|---|---|---|---|
| `protectiveStop.stopDistanceTenths` | tenths of a percentage point of the entry fill's raw price (80 = 8.0%) | integer 1…999 | `off` |
| `hold.mode` | — | `legacy`, `disabled`, `adaptive` | `legacy` |
| `hold.extendedHoldDays` (adaptive) | calendar days | integer, > the book's `maximumHoldDays`, ≤ 365 | — |
| `hold.progressTenths` (adaptive) | tenths of a percentage point above the entry fill's raw price | integer 1…999 | — |
| `declineGate.losses` | non-profitable exits in one decline episode | integer 1…20 | `off` |
| `declineGate.recoveryTenths` | tenths of a percentage point of the episode's decline (1000 = the whole decline) | integer 1…1000 | — |
| `declineGate.maxBlockSessions` | trading sessions (the unit of D1's other entry parameters L and W) | integer 1…1000 | — |

These ranges are **engineering validity** (a value outside them is meaningless or unbounded), not research boxes.
The research boxes are Assignment 2's to precommit (the handoff proposes options; none is binding).

**Validation** (`validateRiskConfig`, called by the parser and again by every runner entry point):
- `version` must be 1; unknown keys anywhere are refused; only `D1:GDX` and `D1:VGT` may appear.
- Integers only, inside the ranges above. `extendedHoldDays` is checked against the book's own `maximumHoldDays` at the
  runner boundary (the D1 grid is not part of the controls object).
- **`hold.mode = 'disabled'` requires `protectiveStop.mode = 'on'`** on the same book. It is refused otherwise, both
  when the configuration is parsed and when a runner starts.

**The combinations Assignment 2 expects** (per D1 book; the two books are independent and may differ):

| Family | Protective stop | Hold | Decline gate |
|---|---|---|---|
| A — legacy D1 | off | legacy | off or on |
| B — protected D1 | on | legacy | off or on |
| C — stop-protected unlimited hold | on | disabled | off or on |
| D — bounded adaptive hold | on | adaptive | off or on |

Also valid but not part of A–D: off + adaptive (adaptive is bounded, so it does not need a stop). Refused: off +
disabled.

**Identity and serialization** (`config.ts`):
- `canonicalControls` drops every default (`off`, `legacy`), sorts keys and keeps integers; a configuration whose
  books are all default canonicalizes to **legacy**.
- A legacy configuration's identity is the frozen identity **unchanged** (5B `cfgId`, Priority 3 `quadId`), its
  evaluation key is Priority 3's `evalKey` unchanged, and its evaluation record is Priority 3's record byte for byte.
  Old JSON configurations (no `controls` field) are legacy and stay valid.
- A non-legacy configuration's identity is `rc1-` + the first 16 hex of sha256(`rc1#` + canonical controls JSON + `#` +
  the configuration's canonical string with the **inactive** D1 genes masked). Under `hold: disabled` the book's
  `maximumHoldDays` and `intradayLossBuffer` are inactive (the buffer only applies from the hold age) and are masked,
  so behaviourally identical configurations get one identity. Its evaluation key is Priority 3's key + `|rc1:` + the
  canonical controls JSON.
- `serializeRiskConfig` / `parseRiskConfig` round-trip exactly (tested).

## 4. Mechanism 2A — the unconditional protective loss stop

| Aspect | Rule |
|---|---|
| Level | **L = e × (1 − d ÷ 1000)**, where e is the entry fill's **raw** trade price (`VTrade.eRaw`: the first trade after the decision, before the modelled 5 bps cost) and d is `stopDistanceTenths`. Double precision, no rounding. Fixed at the fill and **immutable** for the position's life: it never trails, and it is not moved by the trailing stop, the hold or the gate. |
| Why the raw fill price | It is the observed execution print. It does not move when a cost stress changes the per-side cost, and it is the same price scale the trailing stop compares against. |
| Fees and interest | Do **not** affect the trigger: it compares raw prices with L. They do affect the exit's net (proceeds after the 5 bps cost, minus principal and interest). A protective exit always has a negative net: L < e, and the cost and interest only add to the loss. |
| Activity | Unconditional: active at every session a position is open at the start, **whether or not it was ever profitable**. As with every D1 exit, it is not evaluated on the entry session (the D1 convention, §2). This is a limitation: a fall on the entry session is realized no earlier than the next session's opening trade, which may be better or worse than L. |
| Trigger boundary | **Inclusive**: a price ≤ L triggers (the trailing stop's own `<=` convention). |
| Execution (gap) | Session open ≤ L → fills at the **opening trade** (`protective stop gap`, execution `opening trade`). |
| Execution (intraday) | The first minute k with open ≤ L fills at that open (`minute open through stop`); otherwise the first minute with low ≤ L fills at **L** under the `stop` fill convention (`stop level`, an assumption: bars show trading through L, not the price a stop order got), or at the next minute's open under `next-open` (else that minute's close, `trigger minute close`). Reason `protective stop`. |
| Costs and stresses | Proceeds × (1 − 5 bps); the stop-slippage stress applies to protective fills exactly as to trailing-stop fills. |
| Ambiguous OHLC ordering | Within one minute bar the order of prices is unknown. Conservative, deterministic rules: an opening print through a level fills at that print; a level reached only by the minute's low fills at the level (or at the next open under `next-open`). When both the trailing stop and the protective stop are reached in one minute, the **higher** level is assumed to trade first. |
| Not a loss cap | A gap below L (an opening trade or a minute open through L) fills below L, so the realized loss can exceed d. Tests show it on synthetic gaps. |

### 4.1 Precedence inside one session (the first causally executable exit)

The session's single exit is decided from pre-session state and the session's bars, in this order:

1. **Opening trade.** If the trailing stop is active and open ≤ its level → `trailing stop gap` (legacy). Else, if
   open ≤ L → `protective stop gap`. A resting stop gapped through takes the opening trade ahead of a carried buffered
   sale and of the maximum-hold exit (the legacy convention, extended to the new stop).
2. **A carried buffered sale** fills at the opening trade (legacy).
3. **Maximum hold due** (§5; loss at the opening trade) → sells at the next trade after the opening minute, at bar
   k_H. If the protective stop is reached in an **earlier** minute (k < k_H), the protective stop wins; a tie goes to
   the maximum hold, whose order was decided at the open.
4. **Intraday stops.** The first minute that reaches an active trailing stop or the protective stop. When the trailing
   stop is active its level exceeds L, because an active stop is above breakeven and breakeven is above e > L; so the
   trailing stop is always reached first and its legacy fill is kept.
5. **Before the hold age:** that stop exit, if any.
6. **From the hold age:** the buffered loss against the stop, by the legacy comparison: the stop wins if it is reached
   in the buffer's signal minute or earlier, or by an opening print through it in the next minute; otherwise the
   buffered sale (or its overnight carry).

Implementation (`exit.ts`): the legacy `ExitManager.evaluate` computes the legacy decision (steps 1–6 without L); the
protective trigger is computed separately with the same fill conventions; the two are combined by exactly the rules
above. With the stop off, the legacy decision is returned unchanged.

### 4.2 Interaction with other D1 rules

- **Trailing stop:** unchanged (level, ratchet, net-profit activation). The protective stop adds protection while the
  trailing stop is inactive; it never replaces or lowers it.
- **Continuation:** a protective exit is a loss, so it never opens a continuation window (legacy rule: only net > 0).
- **Loss buffer:** unchanged; it can still act from the hold age when the price has not reached L.
- **Re-entry:** the legacy flat-at-start rule applies (no re-entry on the exit session). D1 has no material-loss
  restriction. The decline gate (§6) counts a protective exit as a failed attempt.
- **Logging:** exit reason `protective stop` / `protective stop gap`, distinct from `trailing stop`,
  `trailing stop gap`, `maximum hold` and `buffered intraday loss`; the per-trade record carries the level.

## 5. Mechanism 2B — maximum-hold policies

Every day count is in **calendar days**, as in legacy D1: daysHeld(s) = (date(s) − date(fill session)) ÷ 1 day, using
midnight UTC of the New York dates (exact integers). Interest accrues on calendar days in every mode.

| Mode | Effective hold H(s) at session s | Maximum-hold exit | Buffered loss | Requirement |
|---|---|---|---|---|
| `legacy` (default) | the book's `maximumHoldDays` | legacy: daysHeld ≥ H **and** a loss at the opening trade → next trade after the opening minute | legacy: from daysHeld ≥ H | — |
| `disabled` | ∞ | never | never (it only applies from the hold age) | `protectiveStop.mode = 'on'` |
| `adaptive` | §5.1 | as legacy, with H(s) | as legacy, from daysHeld ≥ H(s) | none (bounded) |

`disabled` does not bound a loss (gaps through the stop) or the time in the market: a position whose price never
reaches L and never activates the trailing stop stays open indefinitely.

The loss-only condition is **preserved in every mode**: an expiring position that is profitable at the opening trade
is kept, as in legacy D1. No mode turns the loss-only exit into an unconditional exit.

### 5.1 The adaptive policy: progress-extended hold

**Chosen concept.** The repository's existing *progress-based hold extension* (`src/app/allIn-trailingBuy-progressHold.ts`,
studied by the trailing-buy variants): give a position more time once it has shown progress; cut a position that never
did at the base hold. It is one minimal rule, not a family.

| Item | Definition |
|---|---|
| Inputs | e = the entry fill's raw price; the **post-entry high** through the previous session, the same high the trailing stop uses (entry session: max(fill price, close, highs from the fill minute on); then each later session's high, added after its close) |
| Parameters | H_min = the book's `maximumHoldDays` (the base); H_max = `extendedHoldDays`; g = `progressTenths` ÷ 1000 |
| Calculation | Before session s: **H(s) = H_max if post-entry high ≥ e × (1 + g), else H_min** |
| Bounds | H_min ≤ H(s) ≤ H_max ≤ 365, all finite; H_max > H_min is validated |
| Rounding | None: days are integers, the comparison is exact in double precision, inclusive (≥) |
| Warm-up | None needed: the post-entry high exists from the fill |
| When the deadline is determined | Re-evaluated before every session at which the position is open at the start. It can only move from H_min to H_max, never back, because the post-entry high never falls (**latched**). The session at which the extension first applied is logged. |
| Causality | Uses only prices through the previous session close (and, on the entry session, the minutes after the fill, which all precede the next session). Nothing after the decision instant. |
| Precedence | Identical to legacy with H(s) in place of the fixed hold (§4.1 steps 3 and 6) |

It is not claimed to reduce risk or to raise profit. With H_min below the legacy hold it cuts failures earlier; with
H_max above it, it holds positions that once made progress longer. Assignment 2 decides.

## 6. Mechanism 2C — the prolonged-decline repeat-entry restriction (decline gate)

An **entry** restriction. It limits how many failed D1 attempts a book makes in one decline before it waits for a
recovery or a bounded cooldown. It never needs to know whether a decline has ended.

| Item | Definition |
|---|---|
| Failed attempt | A virtual trade of the book that exits with **net ≤ 0** (after costs and interest): the exact complement of the continuation rule's net > 0. Every exit reason counts (maximum hold, buffered loss, protective stop, a trailing stop gapped at a loss). Counted at the exit instant. |
| Episode start | The first failed attempt while no episode is active. Reference peak **R = that trade's setup reference high** (the rolling L-session high frozen at the setup's arming, `VirtualTrade.referenceHigh`). Episode low m = the lowest **session close** from the exit session on (the exit session's close is the first one counted). |
| During the episode | Each later failed attempt adds 1 to the count. R stays the first attempt's peak (no re-anchoring, so one decline is not counted as several). |
| Block | When the count reaches `losses` (K), the block engages at that exit (the exit session never arms anyway). While blocked, the book arms **no new setup**, deep or continuation. |
| Reset at a session close | After each session close while an episode is active: m ← min(m, close); then, in this order: (1) **recovery**: close ≥ m + r × (R − m), with r = `recoveryTenths` ÷ 1000 → the episode ends; (2) **cooldown**: if blocked and (s − s_block) ≥ `maxBlockSessions` (trading sessions since the session at which the block engaged) → the episode ends. A reset takes effect from the next session. |
| Reset at a profitable exit | A virtual exit with net > 0 while the episode is active and **not blocked** ends it (that attempt worked). While blocked no position can exist. |
| No permanent lockout | A block lasts at most `maxBlockSessions` sessions; then the episode ends and the next failed attempt starts a new one. In a decline lasting years the book can make at most K attempts per cooldown. |
| Persistence | The state belongs to the **virtual book** and is driven by its own virtual trades, funded or not (the shadow lifecycle: funding never feeds back). It is not reset by funding, refusals or the other books. |
| Causality | Uses only exits already executed and session closes already printed. |
| Unblocked episodes | Have no time limit: an old failure keeps counting until a recovery or a profitable exit. This is deliberate: the price has not recovered r of the decline. |

### 6.1 Interaction with existing D1 rules

- **Continuation:** a failed exit opens no continuation window (legacy). A window opened by a profitable exit ends any
  unblocked episode, so the gate never blocks a continuation that legacy rules allow. At the moment a block engages
  the book is flat, has no armed setup and no open window (any arming closes the window; the failed trade armed). The
  runner asserts this invariant.
- **Armed setups:** the gate acts on arming only. A setup armed before a block cannot exist (the block engages only at
  an exit while flat), and the runner throws if it ever finds one.
- **Flat-at-start rule:** unchanged.
- **Material-loss / lower-price re-entry:** not present in D1 (§2); the gate is new, not a re-implementation. Unlike
  the old lower-price rule, it does not invite re-entry at lower prices; it waits.

### 6.2 Decision log

For every signal the book takes, the gate state at the decision (`off`, `no episode`, `within allowance j/K`). For every
session in which arming was refused: the first refused minute, the setup kind that would have armed, the number of
refused minutes, the episode, R, m and the reset level. Episode events: start, each failed attempt, block engaged,
end (recovery, cooldown, profitable exit) or open at the data's end.

## 7. Execution chronology of one D1 book (one session)

Per session s (the frozen order of `runD1Book`, unchanged):

1. `beginSession(s)`: a carried entry order resolves its fill bar; a position open at the start decides its exit for
   the session (adaptive hold first updates H(s); then §4.1).
2. For each bar k: the scheduled exit at k (fills, accounting, gate update on a failed or profitable exit); the
   scheduled entry fill at k (the protective level and hold policy are fixed for the new position); then the bar's
   completion: arming (refused while blocked) or the rebound decision.
3. The closing print: exit, then fill.
4. `afterSession(s)`: the position's post-entry high and trailing stop (not on the entry session); the continuation
   window; then the gate's session-close update (episode low, recovery, cooldown).

The pool (`src/vg-d1-growth-joint/pool.ts`, unchanged) then funds or refuses each virtual trade at its decision instant
in the frozen same-instant order D1 → GDX → VGT, with one exclusive slot; its accounting, marks and drawdowns are
Priority 3's.

## 8. Output schema

`runD1BookWithControls` returns Priority 3's `VBook` (exactly equal to `runD1Book`'s for legacy controls), plus `rc`:

```ts
rc: {
  controls: D1RiskControls | null;            // canonical, null = legacy
  trades: {                                   // one per virtual trade, in decision order
    trade: number; decisionDate: string;
    gate: 'off' | 'no episode' | 'within allowance'; episode: number | null; lossesBefore: number;
    entryRaw: number | null; protectiveLevel: number | null;
    hold: { mode: 'legacy' | 'disabled' | 'adaptive'; baseDays: number; extendedDays: number | null;
            extendedFrom: string | null; effectiveDaysAtExit: number | null };
    exitDate: string | null; exitReason: string; exitControl: string; net: number;
  }[];
  events: { type: string; date: string; t: number; [k: string]: unknown }[];  // gate and episode events
  summary: { protectiveExits: number; protectiveGapExits: number; maximumHoldExits: number;
             blockedSessions: number; blockedMinutes: number; episodes: number };
}
```

`evaluateWithControls` returns `{ rec, risk }`: `rec` is Priority 3's compact record (with the `rc1-` identity for a
non-legacy configuration), `risk` the two D1 books' `rc` and the configuration's identity and key.

## 9. Isolation and compatibility

- **No frozen file is edited.** `strategy.ts`, `shadow.ts`, `phenotypes.ts`, `books.ts`, `pool.ts`, `evaluate.ts` and
  every study's code stay byte-identical, so Priority 3's evaluation digest stays `147cad7c…` and every sealed digest
  guard on this line keeps passing. The new module subclasses `ExitManager` and `ShadowBook`, mirrors `runD1Book`'s
  driver loop, and reuses `runPool`, `runGrowthBook` (through `booksOf`) and `recordOf` unchanged.
- **Growth·VGT is unchanged:** it is built by Priority 3's `booksOf` and is never given controls. Growth·GDX stays
  disabled. **Shadow-entry eligibility stays off:** the runner uses Priority 3's pool, which has no eligibility
  insertion; no delayed-entry path exists.
- **Parity:** with every control at its default, the runner's books, records, funded lots, funding decisions, marks and
  drawdowns equal the frozen engine's exactly (gates P1–P6 of the study protocol).

## 10. Counterexamples and limitations

- **Gap risk:** an opening trade below L (overnight news, a crash open) fills below L. A protective stop is not a loss
  cap; synthetic tests show losses larger than d.
- **Entry-session exposure:** no exit of any kind on the entry session (the D1 convention).
- **Indefinite holding:** under `disabled`, a position that drifts sideways between L and its inactive trailing stop is
  held indefinitely, and pays interest on calendar days the whole time.
- **Exposure growth:** a fixed $100,000 principal does not fix market exposure; a long-held winner's market value can
  grow to a multiple of the principal (2.5× in the diagnostic) and give back far more than any loss stop protects. None
  of these controls addresses a winner's give-back; the trailing stop does.
- **Regime shift:** a stop distance, hold or gate that fits one decline (2020: fast; 2022: slow) can be wrong for the
  next. Thresholds fitted to 2016–2024 inherit that history's two breaking events.
- **Previously examined data:** 2020, 2022 and 2025–2026 have been examined by many studies. Retrospective evidence on
  them is not a holdout, and relabelling dates cannot make it one.
- **OHLC ambiguity:** minute bars do not order prices inside a minute; the conservative conventions of §4 decide.
- **Split adjustment:** stop levels assume one continuous price scale. The FULL door applies forward split adjustment
  (VGT's 8:1 split of 2026-04-21); the development doors contain no split of VGT or GDX. A door without adjustment
  across a split would trigger false exits (for the legacy trailing stop too).
- **The $35,000 ceiling** is a research criterion on historical paths, not an enforceable future loss limit.

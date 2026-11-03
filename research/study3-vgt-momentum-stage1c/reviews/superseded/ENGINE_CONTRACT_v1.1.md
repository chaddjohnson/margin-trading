# ENGINE CONTRACT — Stage 1c run semantics (part of the protocol freeze)

This file makes PROTOCOL.md §3–§4 and §8 operational for two independent implementations (the fast engine
`src/study3-vgt-momentum-stage1c/engine.ts` and the reference `src/study3-vgt-momentum-stage1c/reference.ts`). Where it
is more specific than PROTOCOL.md it governs the engines; where they conflict PROTOCOL.md governs and the conflict is a
defect.

## §1–§10. Stage 1b's contract, unchanged

Sections 1–10 are **Stage 1b's `ENGINE_CONTRACT.md`** (`research/study3-vgt-momentum-stage1b/ENGINE_CONTRACT.md`,
sha256 `7eed7cc0…`, frozen 2026-10-28) **with Stage 1b amendment A1 items 1–7** (`research/study3-vgt-momentum-stage1b/
AMENDMENTS.md`), verbatim and binding: run frame, the minute loop and its step order, entries and campaigns, exits,
trims and settlement, the close, boundaries S1/S2/S3, stop levels, interest/marks/account, daily rows/windows/counts,
ZR. With every Stage 1c rule absent (`protect` undefined or empty) an engine must reproduce Stage 1b's fast engine
bit for bit (same trades, marks, drawdowns, dollar-days). Notation below is Stage 1b's: s session, k minute index of
the session (k = count is the closing print), `start` = `sBarStart[s]`, B₀ principal, c = costBps/10⁴, S shares, L the
open trade's principal, trimCash, I_trade(s) the open trade's interest to session date s, E its raw first fill, Hc, Hh.

## §11. Protection rules (Policy.protect = { A?: { N }, B?: { C }, C?: { X, Y, cross } })

### 11.1 The account loss record R

- R is account state (not policy state): `{ exitIndex, exitRaw, entryRaw, net, consumed }` or none; initially none (the
  executable account starts with none).
- **Written** after every close of a whole position by one of the policy's own rules — exit reasons `stop`, `stop gap`,
  `own out`, `trend`, `damage`, `structural`, `stale`, `max hold`, `stall`, `losing hold` (a pending close-decided
  reason executed at a boundary keeps its reason and counts) — as R := { exitIndex = the exit session, exitRaw = the
  trade's raw exit fill, entryRaw = the trade's E, net = the trade's net (proceeds − principal − interest), consumed =
  false }, whether or not any policy has B or C.
- **Never written** by `transition`, `conversion`, `resize` or the end-of-run valuation; such exits neither start,
  extend nor clear a cooldown or a level.
- **Consumed:** at every entry fill (first, re-entry, minute, conversion) R.consumed := true (if R exists). A consumed
  R restricts nothing.
- **Boundary option** `restrictionCarry` (RunOptions; default `persist`): under `reset`, at a boundary b whose new
  policy id differs from the active one (identical re-selections skip §6 and this), R := none immediately after the
  pending entry is cancelled and before any decideFlat(new, b). Own-rule exits executing after b (an S1 pending
  close-decided reason at b+1, an S2 continue-old exit) write R as usual. Under `persist` R is untouched.

### 11.2 Rule B (cooldown, C ∈ ℕ, C ≥ 1)

With the **active** policy having B: `blockB(s, minute)` = R present ∧ ¬R.consumed ∧ R.net < 0 ∧ (minute ? s <
R.exitIndex + C + 1 : s < R.exitIndex + C). This decision-session rule is the definition. A close decision at s
(decideFlat) whose chosen entry exists is discarded if blockB(s, false). In the minute loop (Stage 1b §2 step 5, flat,
no pending entry, reference active, k < count, active policy intraday): if blockB(s, true), the reference is **not
updated** at that minute, the rule does not fire, and a flag `cooling` is set; at the first minute where blockB(s,
true) is false and `cooling` is set, `cooling` is cleared and a **low-mode reference restarts at +∞** (high mode keeps
its value) before that minute's normal Stage 1b processing. `cooling` is cleared whenever the reference is (re)started
(§2 of Stage 1b). A trade's `releaseEntry` is true iff its decision was made at s = R.exitIndex + C (close) or in
session R.exitIndex + C + 1 (minute) with B active and R unconsumed and losing.

### 11.3 Rule C (recovery level, X ∈ (0, 1), Y ≥ 0, cross ∈ {0, 1})

With the **active** policy having C: armed = R present ∧ ¬R.consumed ∧ R.net < 0 ∧ R.exitRaw ≤ R.entryRaw × (1 − X) ×
(1 + 10⁻¹²). level = R.exitRaw × (1 + Y). `allowC(price, previous)` = ¬armed ∨ (price ≥ level × (1 − 10⁻¹²) ∧ (cross =
0 ∨ previous < level × (1 − 10⁻¹²))). A close decision at s is discarded unless allowC(C_s, previous) with previous =
C_{s−1} if s − 1 ≥ R.exitIndex, else NaN (no observation since the arming exit). A minute-rule firing at minute k of
session s requires allowC(bClose[k], previous) with previous = bClose[k − 1] for k > 0, else C_{s−1} if s − 1 ≥
R.exitIndex, else NaN; if its own condition holds and allowC fails it does not fire and the reference keeps its Stage
1b update. Per trade: `cLevel` = the level if C was armed at its decision (NaN otherwise) and `cFillBelow` = fill raw <
cLevel × (1 − 10⁻¹²); recorded, never acted on.

### 11.4 B and C together; discarded decisions; counting

A decision is discarded if blockB or ¬allowC. **A discarded decision has no effect beyond counters and block rows:**
`pending` stays undefined; the campaign object, refActive, refValue (except §11.2's cooldown rule) and triggerFrom are
unchanged; no adoption label is consumed. A prevented minute firing leaves refActive true; in high mode the
own-condition test precedes ref := max(ref, bHigh) exactly as in Stage 1b. Counters (RunResult): `bBlocks` = discarded
close decisions with blockB true + sessions in which the minute rule was frozen by blockB while otherwise allowed;
`cBlocks` = discarded close decisions with blockB false and ¬allowC + sessions in which a minute firing was prevented by
¬allowC; `bcBoth` = discarded close decisions failing both. Block rows carry the deciding policy's id (at an adopt-flat
boundary decideFlat runs for the old and the new policy; both rows are kept).

### 11.5 Rule A (maximum losing hold, N ∈ ℕ)

- **Eligibility.** Let e = the open trade's entry session and offset = the entry fill time − the time of e's
  **scheduled opening-fill bar** (bar 0; under a delay d > 0 the bar firstTradeFrom(e, bTime[start_e] + 60 d), bar 0 if
  none); an opening-order fill (and an S3 conversion) has offset 0. Session s > e is eligible iff d = (sTime[s] −
  sTime[e]) / 86,400 (rounded; sTime is the New York date's UTC midnight) > N, or d = N and offset ≤ 0. The position's
  own policy's N applies (under S2 the continuing old position keeps its policy's A).
- **The check** at the start of each session s > e processed with the position open, eligible, with **no** pending
  close-decided exit, transition or conversion executing in s (exitBar = −1): x₀ = bOpen[start] in mode `next`, or
  priceAt(s, delayed) in mode `open`; netOpen = S x₀ (1 − c)(1 − openSlip/10⁴) + trimCash − L − I_trade(s) (opening
  slippage is part of the hypothetical liquidation at the print in both modes; declared). `aChecks` += 1. If netOpen <
  0 the rule is **due** (`aDue` += 1) with fill bar aBar:
  - mode `next` (default, RunOptions `losingHoldFill`): aBar = firstTradeFrom(ds, s, bTime[start] + 60 (1 + d)); if −1
    (no later minute and no print) the **fallback**: aBar = count − 1, filled at that minute's close at its bar time;
    not an opening fill.
  - mode `open`: aBar = `delayed` (0 without delay); an opening fill. A pending trim at the same bar is cancelled (the
    whole position is sold instead); in mode `next` a pending trim executes at its opening trade first (netOpen,
    computed on the pre-trim state at the same print, is unchanged by it).
- **Execution** in the minute loop, as step **2b** between Stage 1b's step 2 (trim) and step 3 (resting stop), at k =
  aBar, if still long and not the fallback: if k = 0 and bOpen[start] ≤ the resting level, do nothing (step 3 then
  fires the stop gap at the opening print; `aCancelled` += 1); otherwise (k > 0, or k = 0 above the level) the
  losing-hold order sells the whole position at raw = priceAt(s, k) with reason `losing hold`, sell price raw (1 −
  c)(1 − openSlip if opening), no stop slippage, stopComponent '', then a flat minute mark at timeAt(s, k), exited :=
  true. On bars before aBar the resting stop acts as usual (Stage 1b step 3, with its own delay semantics). The
  **fallback** runs after step 3 of bar count − 1: if still long, sell at bClose of that bar (reason `losing hold`, not
  opening). If the position was closed before aBar the due exit lapses (`aCancelled` += 1).
- After an A exit everything is as after a stop: §4's campaign rule, R written (§11.1), the intraday reference
  restarted, no entry in the session. The check repeats at every eligible session while the position stays open.

## §12. Exit family XN (D1-style profit-conditional trail)

ExitSpec { own, hard: h, d1net: { t } }: Stage 1b's B-D1N component (§7: Hh(1 − t), present for the next session iff S
× Hh(1 − t) − L − I_trade(max(s, entry)) + trimCash > 0, re-evaluated at each close and at the fill, never carried while
inactive, no friction in the test) together with the always-on hard component E(1 − h) in the ratcheted core. Level =
max(stopCore, d1); component `d1net` when d1 > stopCore. Box t 0.03–0.15 (q 0.001, default 0.073), h 0.05–0.40 (q 0.001,
default 0.40). **Deviations from D1 `primary` (stated, kept for parity with Stage 1b's frozen component):** the profit
test accrues interest through the deciding close (D1: through the applying session's date, ≈ 1–4 days more); the hard
stop is live from the fill bar of the entry session (D1 has no hard stop and checks no exit on the entry session).

## §13. Policies, identity and the schedule

- A Stage 1c policy is a Stage 1b policy plus `protect`. Its canonical key is Stage 1b's key string followed by
  `|A{N=…}B{C=…}C{X=…,Y=…,cross=…}` with absent rules omitted (`|-` when none); its ID is
  `<entry>/<exit>.<contract>/<mask>-` + the first 10 hex of sha256(key) (contract `rep` = own 0, `or` = own 1, `ret` =
  XO). Two policies are identical iff their keys are equal; picks differing only in rule parameters are different
  policies (an S1 transition sells and the new policy re-decides). Policies built from Stage 1b keys keep Stage 1b's IDs
  and have no `protect`.
- S1/S2/S3 are Stage 1b §6 unchanged; R follows §11.1 at boundaries; under S2 the continuing old position keeps its own
  policy's A, while B and C of the new active policy govern new entries.

## §14. Results added to Stage 1b's RunResult

`aChecks`, `aDue`, `aCancelled`, `bBlocks`, `cBlocks`, `bcBoth`, `cFillsBelow` (entries with `cFillBelow`); per trade
`cLevel`, `cFillBelow`, `releaseEntry`; with `recordDaily`, `blocks` (index, kind B | C | BC, entry kind, minute,
policy id) and `aEvents` (index, trade, netOpen, due). Trades closed by A have exitReason `losing hold`. Window
increments are reported when windows are given.

## §15. Closed-form test expectations (synthetic sessions; `tests/`)

- Opening-trade entry on a Friday F: N = 8 → first eligible session is the first dated ≥ F + 8 (Saturday F + 8 →
  Monday F + 10); N = 15 → the first dated ≥ F + 15; a holiday on that Monday → the next session. Under a 1-minute delay
  the opening-order fill keeps offset 0 (same eligible session) and A sells at minute 2. A minute-rule fill after the
  first bar is eligible only at a session dated > F + N.
- netOpen just below zero → exit at the second minute's open (mode next) or the opening print (mode open); just above
  → hold; profitable at the first eligible open and losing at the next → exit at the next; a profitable position is
  never sold by A.
- Open ≤ resting level on an eligible losing open → `stop gap` at the open, no `losing hold`, `aCancelled` = 1; low of
  minute 0 ≤ level with the open above it, mode next → `stop` at the level in minute 0.
- B with C = 5 after a losing exit in session x → the first allowed close decision is x + 5 (entry at x + 6's open);
  C = 0 is identical to no B; a profitable exit → no cooldown; discarded decisions are not queued; an intraday
  low-mode reference restarts after the cooldown; a consumed record restricts nothing.
- C with entry 100, exit 95, X = 0.05 → armed (inclusive); X = 0.051 → not armed; Y = 0.02 → level 96.9: a decision
  close of 96.89 is refused, 96.9 exactly is allowed (tolerance 10⁻¹²), 97 is allowed; a fill gapping below is recorded;
  a trade losing only interest (exit raw = entry raw) never arms; C-cross needs a previous close below the level.
- Interest: a trade's I_trade over a Friday → Monday segment counts 3 days, once.

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

- R is account state (not policy state): `{ exitIndex, exitRaw, entryRaw, net, consumed, below }` or none; initially
  none.
- **Written** after every close of a whole position by one of the policy's own rules — exit reasons `stop`,
  `stop gap`, `own out`, `trend`, `damage`, `structural`, `stale`, `max hold`, `stall`, `losing hold` (a pending
  close-decided reason executed at a boundary keeps its reason and counts) — as R := { exitIndex = the exit session,
  exitRaw = the trade's raw exit fill (`exitRaw`), entryRaw = the trade's E, net = the trade's net (proceeds − principal
  − interest), consumed = false, below = false }. It is written whether or not any policy has B or C.
- **Never written** by `transition`, `conversion`, `resize` or the end-of-run valuation.
- **Consumed:** at every entry fill (first, re-entry, minute, conversion) R.consumed := true (if R exists).
- **Boundary option** `restrictionCarry` (RunOptions; default `persist`): under `reset`, R := none at every boundary
  where the active policy changes, at the start of §6's boundary processing at b's close (after the old policy's
  close processing, before the new policy's first decision at b). Under `persist` R is untouched.
- **below** (C-cross): at every close s while flat with R present and not consumed, if the active policy has C,
  R.below := R.below or C_s < R.exitRaw × (1 + Y) (the active policy's Y), evaluated before decideFlat at s.

### 11.2 Rule B (cooldown, C ∈ ℕ, C ≥ 1)

With the **active** policy having B: `blockB(s, minute)` = R present ∧ R.net < 0 ∧ (minute ? s < R.exitIndex + C + 1 : s <
R.exitIndex + C). A close decision at s (decideFlat) whose chosen entry exists is discarded if blockB(s, false); a
minute-rule firing in session s is not allowed if blockB(s, true) (the intraday reference keeps accumulating as when
`allowed` is false in Stage 1b §2 step 5). Nothing is queued; campaign bookkeeping in decideFlat (death, trough,
permHigh, belowStop, REF's failedBefore) runs unchanged before the check.

### 11.3 Rule C (recovery level, X ∈ (0, 1), Y ≥ 0, cross ∈ {0, 1})

With the **active** policy having C: armed = R present ∧ ¬R.consumed ∧ R.net < 0 ∧ R.exitRaw ≤ R.entryRaw × (1 − X) ×
(1 + 10⁻¹²). level = R.exitRaw × (1 + Y). `allowC(price)` = ¬armed ∨ (price ≥ level × (1 − 10⁻¹²) ∧ (cross = 0 ∨
R.below)). A close decision at s is discarded unless allowC(C_s); a minute-rule firing at minute k requires
allowC(bClose[k]) in addition to its own condition (if its own condition holds and allowC fails, the firing does not
happen and the reference keeps accumulating). Whether a fill under an armed C met the level (fill raw ≥ level) is
recorded per trade (`cLevel`, `cFillBelow`), never acted on.

### 11.4 B and C together; counting

A decision is discarded if blockB or ¬allowC. Counters (RunResult): `bBlocks` = discarded close decisions with blockB
true + sessions in which a minute firing was prevented by blockB; `cBlocks` likewise for ¬allowC with blockB false
(so the two never double count); `bcBoth` = discarded close decisions failing both.

### 11.5 Rule A (maximum losing hold, N ∈ ℕ, 3 ≤ N)

- **Eligibility.** Let e = the open trade's entry session, offset = the entry fill time − bTime[sBarStart[e]] (seconds;
  0 for an opening-trade fill without delay). Session s > e is eligible iff d > N or (d = N and offset ≤ 0), with d =
  (sTime[s] − sTime[e]) / 86,400 rounded to an integer (sTime is the New York date's UTC midnight). The position's own
  policy's N applies (under S2 the old position keeps its policy's A).
- **The check** at the start of each session s > e processed with the position open, eligible, when **no** pending
  close-decided exit, transition or conversion executes in s (exitBar = −1): x₀ = bOpen[start] (the opening print);
  netOpen = S x₀ (1 − c)(1 − openSlip/10⁴) + trimCash − L − I_trade(s). `aChecks` += 1. If netOpen < 0 the rule is
  **due** (`aDue` += 1) with fill bar aBar:
  - mode `next` (default, RunOptions `losingHoldFill`): aBar = firstTradeFrom(ds, s, bTime[start] + 60 (1 +
    delayMinutes)); if −1, aBar = count − 1 with the fill at that minute's close at its bar time (as Stage 1b §2 step
    3's fallback); the fill is **not** an opening fill.
  - mode `open`: aBar = `delayed` (0, or the delay bar); the fill is an opening fill.
- **Execution** inside the minute loop at k = aBar, as a new step **2b** between Stage 1b's step 2 (trim) and step 3
  (resting stop), only if still long: if k < count and bOpen[start + k] ≤ the resting level, do nothing (step 3 then
  fires the stop at that open with its usual reason and fill; `aCancelled` += 1); otherwise close the whole position at
  raw = priceAt(s, k) (or the fallback close) with reason `losing hold`, sell price raw (1 − c)(1 − openSlip if opening),
  no stop slippage, trade.stopComponent = '', then take a flat minute mark at the fill time, exited := true. If the
  position was closed earlier in the session (a stop at bars < aBar), the due exit lapses (`aCancelled` += 1).
- In mode `open` a pending trim at the same bar (trimBar = aBar) is cancelled when A is due (the whole position is
  sold at that opening trade instead); in mode `next` a pending trim executes at its opening trade first and the
  remaining shares are sold at aBar (netOpen is computed on the pre-trim state; a trim at the opening print does not
  change it).
- After an A exit everything is as after a stop: §4's campaign rule (alive unless ownOutSeen etc.), R written (§11.1),
  the intraday reference restarted, no entry in the session.
- The check repeats at every eligible session while the position stays open (a profitable eligible open keeps it).

## §12. Exit family XN (D1-style profit-conditional trail)

ExitSpec { own, hard: h, d1net: { t } }: Stage 1b's B-D1N component (§7: Hh(1 − t), present for the next session iff S
× Hh(1 − t) − L − I_trade(max(s, entry)) + trimCash > 0, re-evaluated at each close and at the fill, never carried while
inactive, no friction in the test, as D1 `primary`) together with the always-on hard component E(1 − h) in the
ratcheted core. Level = max(stopCore, d1); component `d1net` when d1 > stopCore. Box t 0.03–0.15 (q 0.001, default
0.073), h 0.05–0.40 (q 0.001, default 0.40).

## §13. Policies, identity and the schedule

- A Stage 1c policy is a Stage 1b policy plus `protect`. Its canonical key is Stage 1b's key string followed by
  `|A{N=…}B{C=…}C{X=…,Y=…,cross=…}` with absent rules omitted (`|-` when none); its ID is
  `<entry>/<exit>.<contract>/<mask>-` + the first 10 hex of sha256(key) (contract `rep` = own 0, `or` = own 1, `ret` =
  XO). Two policies are identical iff their keys are equal. Policies built from Stage 1b keys keep Stage 1b's IDs and
  have no `protect`.
- S1/S2/S3 are Stage 1b §6 unchanged; R follows §11.1 at boundaries; under S2 the continuing old position keeps its own
  policy's A, while B and C of the new active policy govern new entries.

## §14. Results added to Stage 1b's RunResult

`aChecks`, `aDue`, `aCancelled`, `bBlocks`, `cBlocks`, `bcBoth`, `cFillsBelow` (entries whose fill raw < level while C
was armed at the decision); per trade `cLevel` (NaN unless C was armed at its decision); with `recordDaily`, `blocks`
(one row per discarded decision or prevented minute session: index, kind B | C | BC, entry kind) and `aEvents` (index,
netOpen, due). Trades closed by A have exitReason `losing hold`. The summary also carries the yearly window increments
when windows are given.

## §15. Closed-form test expectations (synthetic sessions; `tests/`)

- Entry at the opening trade of a Friday (date F): N = 8 → first eligible session is the first session dated ≥ F + 8
  (Saturday F + 8 → Monday F + 10); N = 15 → the first ≥ F + 15. A minute-rule fill on F after the first bar shifts it
  to the first session dated > F + N.
- netOpen just below zero → exit at the second minute's open (mode next) or the opening print (mode open); just above →
  hold; profitable at the first eligible open and losing at the next → exit at the next.
- Open ≤ resting level on an eligible losing open → `stop gap` at the open, no `losing hold`; low of minute 0 ≤ level
  with the open above it, mode next → `stop` at the level in minute 0.
- B with C = 5 after a losing exit in session x → no entry fills before x + 6; a level state IN at the release close
  enters at the next open; a profitable exit → no cooldown.
- C with entry 100, exit 95, X = 0.05 → armed (inclusive); X = 0.051 → not armed; Y = 0.02 → level 96.9: a decision
  close of 96.89 is refused, 96.9 exactly is allowed (inclusive, tolerance 10⁻¹²), 97 is allowed; a trade losing only
  interest (exit raw ≥ entry raw) never arms.
- Interest: one trade's I_trade over a Friday → Monday segment counts 3 days, once.

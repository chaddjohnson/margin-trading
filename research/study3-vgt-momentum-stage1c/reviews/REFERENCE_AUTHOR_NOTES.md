# Reference-engine author's notes (independent context) — Stage 1c

Written 2026-10-29 (UTC; drafted from 15:31 to 15:43, times from `date -u`) by the agent that wrote
`src/study3-vgt-momentum-stage1c/reference.ts` under `reviews/REFERENCE_AUTHOR_BRIEF.md` (sha256 `9d524b41…`).

**Delivered:** `reference.ts`, sha256 `fe006ccb3a7247816ea7415eefa7c8f03613985c41620cae32cd8f290a2a4dc1`. It exports
`referenceRun(ds, schedule, options): RunResult` with the types of `src/study3-vgt-momentum-stage1c/types.ts`.

**Checks:**

- `npx tsc --noEmit -p tsconfig.json` reports nothing for this file.
- The file passes `prettier --check`.

## What I read, and what I did not open

**Specification:**

- `ENGINE_CONTRACT.md` (sha256 `a2cdb357…52ef49`), in full.
- `PROTOCOL.md` (sha256 `192c7287…92ca9c`): §3–§4 and §8, plus the header for precedence.
- Stage 1b's `ENGINE_CONTRACT.md` (sha256 `7eed7cc0…d123cde`) and Stage 1b's `AMENDMENTS.md` (A1 and A2).
- Stage 1c's `AMENDMENTS.md`: I checked only its headings. It has no amendments.

**Code:**

- Stage 1b's `reference.ts` (sha256 `50d34873…c539`, its A1 version). I copied it as the starting point.
- Stage 1b and Stage 1c `types.ts`.
- Stage 1b's `reviews/REFERENCE_AUTHOR_NOTES.md`.
- `signals.ts` and `features.ts` (their exports and the intraday and control families).
- D1's fill primitives in `src/shared-margin-portfolio/strategy.ts`.
- The `Dataset` type.
- The synthetic builders: Stage 1 `tests/fixtures.ts` and Stage 1b `tests/synthetic.ts`.

**Not opened:**

- Any other Stage 1c source file, including `engine.ts` and `tests/`.
- Stage 1b's `engine.ts` and its other implementation files.
- `src/study3-vgt-momentum/engine.ts`.
- Anything under `data/`.

**Notes on running the scratch tests:**

- The fixture builders import `mulberry32` and a type from Stage 1's engine, so my scratch tests loaded that module
  without my reading it. The same was true for Stage 1b's author.
- `four-family/data.ts` reads `config/archive/legacy-research-inputs.json` at import, a path manifest rather than
  market data. The scratch scripts therefore ran with the repository as the working directory. No market data was
  opened, and nothing was written in the repository except the two permitted files.
- I ran no Stage 1c engine code. I ran Stage 1b's reference, which I was allowed to read, only to compare it with my
  reference when no `protect` is set.

## Structure

Stage 1b's reference is kept unchanged as the implementation of §1–§10 (its readings are [N1]–[N25] in Stage 1b's
notes). The Stage 1c additions are cited in the code as [Cn]:

**New state:**

- The account loss record `R = { exitIndex, exitRaw, entryRaw, net, consumed }`.
- `adoptionDeferred`.
- `cooling`.
- The counters and the `blocks` and `aEvents` rows.
- Entry orders now carry `releaseEntry` and `cLevel`.
- A per-session `LosingHoldOrder` (aBar, fallback, opening, stop-slippage flags).

**Predicates** (pure functions of R, the deciding policy and the decision): `blockB`, `armedLevel` (C's level or NaN),
`allowC`, `previousClose` and `isRelease`.

**Rule A:**

- `losingHoldCheck` runs at the start of a session, before `trimBar` is fixed.
- Step 2b executes the order at aBar.
- Step 3b is the mode-next fallback, after step 3 of bar count − 1.

**Rules B and C:**

- **Minute loop:** step 5 has the freeze and cooling logic, and rule C on the deciding minute's close.
- **Close decisions:** `decideFlat` does its Stage 1b campaign bookkeeping and chooses the entry as before. The chosen
  entry is then tested against B and C and either passes or is discarded.

**The record R:**

- `closePosition` writes R for own-rule reasons.
- `open` and `convert` consume it.
- `boundary` clears it under `restrictionCarry: 'reset'`.

**XN** needs no new code. `{ own, hard, d1net }` is already Stage 1b's hard component plus B-D1N (§12).

## Readings and choices (cited in the code as [Cn])

- **C1. `releaseEntry` needs a cooldown of at least one session (§11.2 against §11.2's own "C = 0 is identical to no
  B", §15, and PROTOCOL §4.3 "C = 0 is exactly the mask-off control").**
  - The literal formula would mark, under B{C = 0}, a close decision at the exit session itself, or a minute decision
    in session x + 1, as a release entry. That would make C = 0 differ from no B in a recorded trade field.
  - §11.2's header already restricts B to C ≥ 1, so I set `releaseEntry` only when C ≥ 1. With C = 0, every trade
    field and every counter is identical to no B. The sweep checks this on every B{C = 0} run.
- **C2. A minute firing prevented by C needs Stage 1b's `allowed` (§11.4 `cBlocks`).**
  - A "firing" requires `allowed` (no entry this session, s ≥ triggerFrom, no RN campaign) and the own condition.
    `cBlocks` counts sessions where both held and `allowC` failed.
  - The reference keeps its Stage 1b update and stays active, so a later minute of the same session can still fire.
    Such a session yields both a C row and an entry. The hand case "C minute" shows this.
- **C3. Minute blocks are counted once per session**, with one block row for each counted session.
  - A row's `entry` is the kind the rule would have had: `reentry` if a campaign is alive, else `first`.
  - Minute rows are `B` or `C`, never `BC`: a frozen minute is not tested against C, and `bcBoth` is defined only
    for close decisions.
- **C4. Rule A's check runs when exitBar = −1 (§11.5's parenthetical).**
  - This coincides with "no pending close-decided exit, transition or conversion executing in s" except in Stage
    1b's N25 edge: the delayed bar is −1 with no minute at or after open + d and no closing print, so a pending order
    cannot execute.
  - In that edge the check runs. If the order is due, the A sale also clears the stranded pending exit, as a stop
    does.
- **C5. The mode-next fallback, and mode open without a delayed bar.**
  - **Mode-next fallback:** if `firstTradeFrom(s, open + 60(1 + d))` is −1, the order sells after step 3 of bar
    count − 1 at that bar's close and time. It is not an opening fill and pays stop slippage.
  - **Mode `open` with `delayed` = −1** (the same N25 edge, which the contract leaves undefined):
    - x₀ is bOpen[start], the opening print;
    - the sale uses the same fallback.
- **C6. The offset for A's eligibility** is measured in time: entry fill time minus the time of the entry session's
  scheduled opening-fill bar.
  - That bar is 0, or the delayed bar `firstTradeFrom(e, bTime[start_e] + 60d)`, or 0 when that is −1. A closing-print
    bar uses `sCloseTime`.
  - d = round(Δ`sTime` / 86,400). The session is eligible iff d > N, or d = N and offset ≤ 0.
  - The position's own policy's A applies, and only sessions after the entry session are checked.
- **C7. `aCancelled`** counts each due order that does not sell:
  - the k = 0 gap exception (bOpen ≤ the resting level, so step 3 sells with a `stop gap`);
  - a position already closed when aBar is reached;
  - a position already closed when the fallback's bar is reached.

  Each due order resolves exactly once, so `aDue` = (number of `losing hold` exits) + `aCancelled`. The sweep checks
  this.
- **C8. The adoption-deferred flag (§11.4)** is account state.
  - **Set:** only when a discarded first-entry decision carried the `adoption` label, either because s is the
    adoption close or because the flag was already set.
  - **Cleared** at:
    - a flat close (in `decideFlat`) with no live campaign after the campaign update, where the deciding policy's
      fresh condition is false (evaluated before the s = end early return);
    - any entry decision that passes (close or minute, first entry or re-entry);
    - every new adoption close: the run start, a flat boundary, or the exit of a position whose policy is no longer
      active.
  - **Label:** a first entry is labelled `adoption` iff s is the adoption close or the flag is set.
- **C9. Conversions and ZR segments.**
  - They carry `cLevel` NaN, `cFillBelow` false and `releaseEntry` false.
  - B and C do not apply to conversions. A conversion is a boundary action, not a decision in the sense of §11.4.
    Besides, R is always consumed or absent while long, so neither rule could restrict one.
  - A conversion consumes R (§11.1). Its old leg (reason `conversion`) never writes R.
- **C10. ZR (C-ALR).** `protect` is ignored on a ZR schedule: a `resize` never writes R, and A is not checked. No
  matrix cell combines them.
- **C11. `cooling`** is cleared whenever the reference is (re)started:
  - in `startReference` (run start and flat boundaries, for any policy);
  - at each post-exit restart.

  The freeze test runs inside step 5's guard (flat, no pending entry, reference active, k < count, active policy
  intraday). The exit session is never frozen, so its minutes update the reference normally from the exit minute
  on, as Stage 1b's N6 describes.
- **C12. Policy identity at boundaries** compares `Policy.id`, as Stage 1b does. The id is the canonical key's hash
  (§13), and the reference does not recompute keys.
- **C13. A pending trim alongside a due A order.**
  - **Mode next:** the trim executes at step 2 of its bar. When missing minutes put aBar on the same bar, the trim
    still comes first and step 2b sells the rest.
  - **Mode open:** the pending trim is cancelled when the check finds A due. This is equivalent to cancelling it at
    the shared bar, since a trim on a gap through the level, or after a stop, would not execute anyway.
  - netOpen is computed before the trim in both modes.
- **C14. The A sale.**
  - **Price:** raw × (1 − stopSlip if mode next or fallback) × (1 − c) × (1 − openSlip if mode open).
  - **Trade fields:** `exitBar` = aBar (count − 1 for the fallback), `stopComponent` '', `gapFlag` '', shortfall 0.
  - **Event:** kind `exit`.
  - **Mark:** a flat minute mark at the fill time.
  - **Afterwards:**
    - Stage 1b's campaign rule applies, so the campaign stays alive unless it ends for one of the listed reasons;
    - `reentryOpportunities` += 1 if it stays alive;
    - R is written;
    - the reference restarts;
    - no entry is possible in the session.
  - The bar's low and high are not added to MAE/MFE, as with a stop at bar k (Stage 1b N4).
- **C15. PROTOCOL §8.2 "any fill consumes it" against the contract's "every entry fill".** I implemented the
  contract's wording. They are equivalent: R is written only at exits, an entry consumes it, and so R is consumed or
  absent whenever a trim, exit or transition fill can occur.
- **C16. The end close.** `decideFlat` stops before choosing an entry at s = end (Stage 1b), so no B or C block is
  counted there. The minute rule still runs in the end session, as in Stage 1b.
- **C17. Discarded close decisions.** Stage 1b's campaign bookkeeping in `decideFlat` always runs before the B/C test:
  death, trough, permHigh, belowStop and REF's failedBefore. A discard changes only counters, rows and the
  adoption-deferred flag.
- **C18. Writing R.** `closePosition` writes R for every reason except `transition`: stops, stop gaps, close-decided
  reasons (including a pending own-rule reason executed after a boundary, under S1 or S2) and `losing hold`.
  - exitRaw is the raw fill, which for a delayed stop is the delayed fill.
  - A close-decided exit relabelled `stop gap` at k = 0 writes R.
  - A `transition` through the level at k = 0 does not.
  - A position of a no-longer-active policy (S2) writes R as usual.

## Contract statements I believe are wrong, contradictory or underspecified

1. **§11.2: releaseEntry under C = 0.** The header says C ≥ 1, and the text and §15 say "C = 0 is identical to no B".
   But the literal releaseEntry definition marks decisions at s = R.exitIndex + 0 (close) or in R.exitIndex + 1
   (minute) when B{C = 0} is set. So a B{C = 0} run would differ from no B in `releaseEntry`. Resolved by C1.
2. **§11.5: "an in-session minute-rule fill has offset > 0".** This is stated as a consequence, but it does not
   follow from the time definition.
   - Example: under a delay d with the minute at open + 60d missing, a minute firing at bar 0 fills at the first bar
     at or after open + 60 + 60d. That can be the scheduled opening-fill bar itself, giving offset 0.
   - I followed the time definition, which matches PROTOCOL's "filled at its session's scheduled opening-fill bar".
     This only matters with a delay and missing minutes.
3. **§11.5: mode `open` with `delayed` = −1 is undefined.** priceAt(s, −1) and aBar = −1 are meaningless. Separately,
   "(exitBar = −1)" and "no pending … exit … executing in s" diverge in the same N25 edge. Resolved by C4 and C5.
   Unreachable on regular sessions with d ≤ 5.
4. **§11.4 `cBlocks` (minute part)** does not say whether Stage 1b's `allowed` must hold, while `bBlocks` says so
   explicitly. It also does not say how to count a session where a minute is prevented and a later minute fires.
   Resolved by C2 and C3.
5. **PROTOCOL §8.2 "any fill consumes it" against contract §11.1 "every entry fill".** The wording differs but the
   behaviour is equivalent (C15).

I found no statement that I believe is plainly wrong in the sense of contradicting PROTOCOL.md's intent.

## Self-tests (scratch, outside the repository: `/tmp/claude-1000/ref-author-1c/`)

All on synthetic sessions: `datasetOf`/`path`/`flatSession` equivalents on explicit dates (for a holiday),
`randomWalk` and `syntheticMarket`.

### Hand cases (`hand.ts`, 75 checks, all pass), one or more per §15 expectation

**Rule A:**

- **Eligibility:**
  - Friday entry: N = 8 exits Monday F + 10 at minute 1; N = 15 exits Monday F + 17.
  - A holiday on that Monday moves the exit to Tuesday.
  - A 1-minute delay fills at minute 1 and sells at minute 2 in the same session.
  - d = N is eligible for an opening fill.
  - An in-session E10 minute fill is eligible only at d > N.
- **netOpen at ±1e−9 relative:**
  - just below: exit at minute 1 (next) or at the print (open);
  - just above: hold, then exit at the next session.
  - A profitable position is never sold by A.
- **Against the resting stop:**
  - An open through the level gives `stop gap` at the open, no `losing hold`, `aCancelled` = 1 (both modes).
  - A minute-0 low through the level with the open above gives `stop` at the level (next), or `losing hold` at the
    print (open).
- **Slippage:** 25 bps stop slippage gives raw (1 − 0.0025)(1 − c) in mode next; mode open pays opening slippage only.
- **Fallback:** a one-bar session without a closing print.
- **Trim with A:** trim then A in mode next; trim cancelled in mode open; netOpen identical in both.
- **Boundaries:**
  - S2 keeps the old position's A.
  - A new pick with A does not govern an S2 old position.
  - An S3 conversion counts A from the conversion session (offset 0); its old leg closes with reason `conversion`.

**Rule B:**

- C = 5 gives the first allowed close decision at x + 5 and the entry at x + 6, with `bBlocks` 5 and rows 2..6.
- C = 0 is identical to no B.
- A profitable exit starts no cooldown.
- Discarded decisions are not queued.
- **E09 (low mode):**
  - frozen sessions are counted once each;
  - the reference restarts at the release, so a flat release session gives no buy;
  - a rebound in the release session is a release entry;
  - C = 0 is identical to no B.
- **E10 (high mode):**
  - highs made during the cooldown block a buy at the release;
  - a later close above them buys;
  - a breakout in the release session is a release entry.
- **Across a boundary:**
  - An S1 pending `max hold` loss at b + 1 writes R, and the new pick's B discards its decisions until the release.
    That entry keeps the label `adoption` (also under `reset`, because the exit is after b).
  - An E10 pick seeded at −∞ makes no buy on flat prices.
  - `persist` against `reset` at a flat boundary.
  - Both the old and the new policy's discarded decisions at an adopt-flat boundary are counted, each with its own
    id.
  - A consumed record (re-entry, then an S1 transition) restricts nothing.

**Rule C:**

- **Arming:** entry 100, exit 95. X = 0.05 arms (inclusive); X = 0.051 does not.
- **Level:** Y = 0.02 gives level 96.9. A close of 96.89 is refused; 96.9 and 97 are allowed.
- **Fills and interest:** a fill gapping below the level is recorded (`cFillsBelow` 1). An interest-only loss never
  arms.
- **C-cross:**
  - a close above the level at the exit session has no previous observation: refused;
  - a previous close above the level: refused;
  - a close below and then above: allowed.
- **B and C together:** BC, BC, BC, then C.
- **C on the minute rule (E09):** the rebound is refused until a minute close reaches the level.

**Other:**

- Interest over Friday → Monday counts 3 days, once.
- `protect: {}` has no effect.

### Sweep (`sweep.ts`, 9,729 runs, about 2.18 million checks, all pass, 3.6 s)

**Inputs:**

- 1,200 single policies, each run in both financing modes:
  - 15 entries (all 12 families and 3 controls) × 16 exit specifications (including XN `rep`/`or`);
  - all 10 re-entry rules; Z0/Z1/Z2/Z3;
  - random protect masks: A N ∈ {3, 5, 8, 15, 30}; B C ∈ {0, 1, 2, 5, 10}; C X ∈ {0.005, 0.02, 0.05},
    Y ∈ {0, 0.02, 0.05, 0.12}, cross 30%;
  - delays 0/1/5, stop, entry and opening slippage, `losingHoldFill` next/open, windows.
- 400 four-item schedules × S1/S2/S3 × both modes, with `persist`/`reset` and identical re-selections.

**Checked on every run:**

- **Ledger:**
  - realized = Σ closed nets;
  - each trade's net = proceeds − principal − interest, and proceeds − principal = priceGain − friction;
  - endLiquidation = Σ nets − carriedInterest (net-debit) or Σ nets (slot);
  - daily liquidation = mark − G c.
- **Entries:** at most one per session, none in an exit session.
- **Rule A:**
  - `aDue` = losing holds + `aCancelled`;
  - every `losing hold` has a due check for that trade and session;
  - no `losing hold` at a not-due check;
  - no A activity without A.
- **Counters:** `bBlocks` + `cBlocks` = rows; `bcBoth` = BC rows; `cFillsBelow` = trades with `cFillBelow`.

**Checked on single-policy runs:**

- **B:** the first entry after a losing own-rule exit at x is at or after x + C + 1.
- **C:**
  - the recorded `cLevel` equals exitRaw (1 + Y) exactly when armed, and is NaN otherwise;
  - the decision close is at or above the level (close decisions, no delay);
  - C-cross: the previous close is below the level and not earlier than the exit;
  - `cFillBelow` is consistent with the fill price.
- **releaseEntry:** only at x + C + 1 (close decisions) or later (minute), and only with C ≥ 1.

**Comparisons:**

- **Mode independence:** trades, blocks and counters are identical in both financing modes.
- **Without `protect`:** the full RunResult equals Stage 1b's reference, apart from the Stage 1c-only fields, on
  every single-policy and schedule run.
- **B{C = 0}:** the full RunResult equals the run without B.
- **Executability:** every close-decided entry is by the policy active at its decision (checked on runs without a
  delay).

**Coverage observed:**

- 2,497 `losing hold` exits and 19 lapses;
- 369 release entries and 69 fills below the C level;
- 2,180 B blocks (1,134 of them minute rows), 14,059 C blocks (3,673 of them minute rows), 103 BC.

### Prefix invariance (`prefix.ts`, 600 runs, all A + B + C, all pass)

A run ending at an earlier session reproduces:

- every trade closed by then;
- every block row before the cut;
- every A event up to the cut.

So there is no look-ahead.

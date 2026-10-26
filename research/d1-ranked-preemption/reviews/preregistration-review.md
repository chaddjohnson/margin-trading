# Preregistration review (independent, read-only) — saved verbatim

Reviewer: an independent subagent that did not write the protocol or the code. Brief: the conversation's
preregistration-review prompt (read-only; brief, PROTOCOL.md draft `40eef8d8…`, context.ts, the stage code).
Received 2026-10-26 ~17:31Z, before the protocol freeze. Dispositions: `DISPOSITIONS.md`.

---

# Preregistration review: `d1-ranked-preemption` (independent, adversarial, read-only)

**What I reviewed** (2026-10-26, about 16:58–17:15 UTC). I ran nothing and modified nothing.
- `PROTOCOL.md` sha256 `40eef8d8370e…`. It did not change during the review (mtime 16:56:48Z).
- `brief/BRIEF.md` sha256 `e784c557f07b…`. This matches the hash the protocol cites, and all of §0–§10 is present.
- `context.ts` was `8bac4b40b456…` when I first read it. It changed during the review to `8d4880a71eaa…`: environment-variable path overrides were added at lines 19–39. No constant value changed.
- These files appeared or were edited while I was reading: `controls.ts`, `walkforward.ts`, `final.ts`, `parity.ts`, `freezes.ts`, `runs.ts`, `cli.ts`, `researchPools.ts`, `tables.ts`. I checked them against the protocol, but the engine and code-freeze review must look at them again.

## (a) Verdict

**Safe to freeze after fixing findings 1–5.**

The protocol is detailed, and the code implements most of it as written:
- the data doors stop at each search end and are hash-checked;
- the rankings are sealed and re-verified, and they define open-trade and calendar-day rules;
- P1's estimate and fill-time tests are causal, and both use the ledger's own formula;
- each book's virtual trades continue independently of funding, as required;
- A/B/C/D and the switched-off (P0) version of D exist;
- every numeric constant in the protocol matches `context.ts`.

Five issues must be settled before the freeze. Each changes a rule that affects outcomes, and none could later be amended as "technical":
1. The material-opportunity rule can give R1 and R2 unequal joint-search budgets, which the brief forbids.
2. When a preemption is "superseded" by the incumbent's own stop in the same bar, the replacement is bought at that bar's open using knowledge that the stop fills later in the bar.
3. At an opening or closing auction (the protocol's own Friday→Monday case), the purchase is made conditional on the sale's price at the same print, which cannot be executed.
4. The only out-of-sample requirement is V(X) ≥ V(A), with zero margin and at 5 bps only. The "material improvement" gate exists only in-sample.
5. The chronological order of windows is only stated in the text. Neither the data doors nor the new read-only CLI enforce it.

## (b) Findings

### MATERIAL

**1. R1 and R2 can get unequal Stage D budgets.**
- *Where:* PROTOCOL §9 lines 277–282 judge materiality per (window, ranking) and run an immaterial one at 25%. `diagnostic.ts:133–141` sets `budgetShare` per ranking, and `joint.ts:367` sets the budget to `jointBudget × share`.
- *Problem:* C_R1 and C_R2 differ, so their actionable counts differ. One branch can run at 100% and the other at 25%. This contradicts the brief: §4 says "R1 and R2 must be tested with equal search budgets" and §6 asks for "two separate, equal-budget experimental branches". The comment at `context.ts:146` ("either ranking") contradicts both the protocol and the code.
- *Fix:*
  - Decide materiality per window: material if either ranking reaches the threshold in any of B4, B5 or C_Rk, and give both branches the same share.
  - Correct the comment.
  - State whether a downscaled branch can still be nominated. I recommend yes, with the label.

**2. A superseded switch relies on an intrabar stop fill.**
- *Where:* §5.3.5 lines 160–162 ("own exit precedes the sale … replacement keeps its reservation and is bought at its fill"). In `engine.ts`, lines 1034–1066 run virtual exits, then the pending-sale resolution, then fills, all in the same bar; lines 1405–1409 handle the superseded case. The replay does the same at `replay.ts:411–419`.
- *Problem:* The frozen stop fill is `stopFill: 'stop'` (`config/pools/B5.json` execution; `strategy.ts:327–331`). A trailing stop at the stop level is triggered by bar k's low, yet the replacement is then funded at bar k's open. Funding therefore depends on information that only appears after the fill price. Brief §5.4 forbids "using knowledge of a future bar or stop fill".
- *Size:* Small in practice. Under the D1 'net' stop policy, an active stop means the virtual net at the stop price is above zero, so a sale at the open would usually pass. The abort band is roughly (−exit friction, $0).
- *Coverage:* `engine.test.ts:350` tests only the gap-at-open case.
- *Fix:*
  - When an own exit and the planned sale fall on the same event, fund the replacement only if the fill-time test at that event's opening price passes. Otherwise abort; the own exit still closes the lot.
  - Exits that execute at the open are unaffected: gap stop, pending buffered loss, maximum hold, and minute-open-through-stop.
  - Add the intrabar-stop case to the §18 tests and to the parity gate.

**3. Same-auction "atomic" switches cannot be executed.**
- *Where:* §5.3.4 lines 152–155 and §5.3.5. The case appears in `engine.test.ts:218–253`: a Friday last-minute decision; the XRT sale and the VGT purchase both happen at Monday's first trade (`exitTime === entryTime`); VGT is bought only if the sale passes at that same print.
- *Problem:* At an opening or closing auction, or at the opening trade of an order carried overnight, a buy cannot be made contingent on the sale's print. If the open lands between the stop and the breakeven price, a real account would end up holding two positions, or not the intended one. Brief §5.4 requires "a documented conservative next-eligible-event sequence" when atomic execution is impossible.
- *Fix:*
  - State the within-minute assumption explicitly: the sale fills at the minute's open, and the contingent buy is modelled at the same minute's open. This is a latency assumption.
  - For auction events (the closing print, or the session's opening trade for a carried order), abort unless the sale's event comes strictly before the replacement's fill event.
  - Optionally freeze a sensitivity, "P1-strict" (the sale must strictly precede the replacement fill at every event), and report it for B and D.

**4. No out-of-sample test of material improvement, costs or concentration.**
- *Where:* F2 in §13.3 lines 358–359 requires only V(X) ≥ V(A), at 5 bps (`walkforward.ts:227`). N2 in §14.2 line 369 requires +$25,000, but only on the final *training* window.
- *Problem:*
  - N2's window contains both validation folds, and D was optimised there to beat A, so N2 is trivially passable for D.
  - Brief §7 asks for "minimum material improvement over B4/B5" and "cost sensitivity" among the gates for fold success.
  - With four procedures, two folds and a zero margin, a B with no real effect can pass F2 in both folds with non-negligible probability. Its A-vs-B difference is a small paired number.
  - The 2024–2026 historical check only tests non-inferiority (−$10,000).
- *Fix (decide now):*
  - Add a fold margin: for example V(X) − V(A) ≥ $5,000 per fold, or the sum over both folds ≥ $10,000.
  - Also require V(X) ≥ V(A) at 10 bps.
  - State in §0 and §13.4 that A in the folds uses B5 vectors chosen on inspected 2016–2026 history. That makes A advantaged by hindsight relative to D, and B shares the same contamination.

**5. The chronological stage order is not enforced.**
- *Where:* §13.6 lines 393–398 and §9 line 281 state the order. `trainingUniverse(window)` in `data.ts` will open any window at any time.
- *Problem:*
  - Fold-b's training data contains fold-a's validation years, and the final window's contains both folds'.
  - Running a later window first, or reading its outcomes, would expose an earlier fold's validation years before that fold's `PICKS.json` is sealed.
  - The new read-only CLI makes this easy. `fixed B5 --policy P1 --ranking final/R1` runs through 2023-12-29 as soon as a final ranking exists (`cli.ts:120–127` and 155–175). It loads data through `loadNUniverse` directly (`cli.ts:234`), bypassing the doors and the `assertAudited` check.
- *Fix:*
  - Add to §4.4, and enforce in `data.ts`: `trainingUniverse('fold-b')` refuses unless fold-a's sealed PICKS (or VALIDATION) verifies; `trainingUniverse('final')` refuses unless `PROCEDURE_GATE.json` verifies.
  - Route all CLI loads through these doors, with the audit check.

### MINOR

**6. Portfolio-mode P1 and windowed drawdowns are never checked on real data.**
- *Where:* parity check (iii) in §5.1 is fixed-mode only. Gate N4 relies on the portfolio P1 engine path. Gate F1 and the historical check rely on the replay's windowed trackers (`evaluate.ts:388–440`). Validation cross-checks only whole-run net and lot counts.
- *Fix:* add two checks to §5.1:
  - (iv) on random pools, when margin never binds, portfolio P1 funds the same sequence as fixed P1, and cash and equity are conserved;
  - (v) windowed minute and daily drawdowns and V recomputed from the engine's per-session marks, for at least 20 runs that have a boundary.
- *Text mismatch:* §5.1 says (iii) covers "P0, P0R, P1, P1-B250", but `parity.ts` (iii) runs only P0R, P1 and P1-B250. Add P0 or fix the text.

**7. V is measured asymmetrically.**
- *Where:* §13.2 and `evaluate.ts:436`.
- *Problem:* The end mark subtracts the exit friction of a lot still open; the start mark (the search-end close) does not. A lot open at the boundary shifts V by about $50 at 5 bps, which can flip a zero-margin F2.
- *Fix:* Apply the liquidation convention at both ends.

**8. The historical check uses only the fast replay.**
- *Where:* `final.ts:247` uses `evaluator.pools` (the replay), although §5.1 line 115 names the engine as the authority for every reported run.
- *Fix:* Also run the engine and require equality, as the controls and validation stages already do.

**9. Fold budgets depend on contaminated vectors.**
- *Where:* §9 line 277. B4/B5 actionable counts decide fold budgets, but their vectors were chosen on inspected 2016–2026 history (`docs/pools/README.md:258`).
- *Fix:* In folds, decide materiality from C_R1 and C_R2 only, and report the B4/B5 counts descriptively. Alternatively, disclose the exception in §0.

**10. N3 is gated on the same draws used for selection.**
- *Where:* §11.4.4 and `joint.ts`. The arm finalist and the branch pick are the best J_nbB among up to six candidates; N3 for D (`final.ts`) then reuses those draws.
- *Fix:* Draw a fresh set for N3 (for example stage `nomination:final:<ranking>`), or acknowledge the bias.

**11. C is neither nominable nor a gate for D.**
- *Where:* §13.4 makes V(D) − V(C) descriptive only. Hypothesis H2 (joint beats standalone) can therefore fail while D is still nominated.
- *Fix:* State explicitly that C is not nominable and that D's nomination does not require V(D) ≥ V(C). Or add that as a gate.

**12. Disclosures missing from §0.**
- In the folds, A and B use B5 vectors chosen with knowledge of the validation years.
- A B nominee's 2024–2026 check reuses vectors that were selected on that window, so that check is weaker evidence for B than for D.
- Multiple testing: four procedures × two folds, with one nominee chosen by the maximum neighbourhood median.

**13. An own exit at a bar's close can beat the sale price.**
- *Where:* "trigger minute close" exits (`strategy.ts:335–339`) can book the incumbent at bar k's close, above the open the sale would have used.
- *Note:* This is rare, and the fix in finding 2 covers it if both funding and booking use the event's open.

**14. Constants and documentation mismatches.**
- *Hard-coded outside `context.ts`,* although the protocol header says every constant is declared there:
  - the 8/4 split of local-search moves (`standalone.ts:224`);
  - B's 64 N3 draws (`controls.ts:225`), while D's come from the tier;
  - 40 parity runs and the 20-run coverage rule (`parity.ts`);
  - benchmark safety factor 1.5 and the +25% fold share (`benchmark.ts`);
  - the −1e9 infeasibility offset in J_pool;
  - the step units (`space.ts`).
- *Unused:* `reserveMaxSurvivorsForIdle: 61` (`context.ts:141`) is undocumented and unused; `incumbentMutants: 46` is unused (it is implied by the population size).
- *Wrong comments in `context.ts`:*
  - line 140 says "occupied days", but the protocol and code use held sessions;
  - line 146 says "either ranking";
  - the section references §6.4, §8, §9, §10 and §11–§13 should be §7, §9, §10, §11 and §13–§14.
- *In the protocol:*
  - §13.6 sits inside §15;
  - §11.4.1 should say that only feasible configurations are promoted, and that an arm or branch with none has no pick (so its gates fail), as the code does;
  - the refinement move size (±1 to 3 step units) is not stated.

**15. Environment overrides can redirect the study.**
- *Where:* `context.ts:19–39`, added during the review. `RANKED_PREEMPTION_ROOT` and `RANKED_PREEMPTION_DATA` redirect the research root (including `PROTOCOL.md`, the freezes and the sealed records) and the data root.
- *Fix:* Have `requireFrozen`, `freeze-protocol` and `freeze-code` refuse to run if either variable is set. Record their absence in each sealed record and state the rule in §17.

**16. The Node version is not enforced.**
- *Where:* `context.ts:196` only records `v24.21.0`, and v23.6.1 is also on the machine's PATH.
- *Fix:* Have the guard refuse any other `process.version`.

**17. Amendments can change gate logic too easily.**
- *Problem:* The gate logic lives in `walkforward.ts` and `final.ts`. An amendment can change those files with only a text justification, because `verifyCodeFreeze` accepts any digest recorded by `appendAmendment`.
- *Fix:*
  - In §17, list the gate, door and allocator files as outcome-defining. An amendment touching them should need a new independent review and must not follow a sealed outcome of an affected stage.
  - Say how report and CLI code added after the code freeze will be handled.

**18. The P1-B250/B500 thresholds don't scale in portfolio mode.**
- *Problem:* They are absolute dollars, which is fine on a $100k fixed lot. In portfolio mode a lot is 20% of equity and can be much larger than $100k.
- *Fix:* State that these sensitivities are fixed-pool only, or scale them by the lot's principal.

**19. N4 inverts when A's productivity is negative.**
- *Problem:* `pf.productivity >= 0.9 × A` in `final.ts` becomes the wrong test if A's productivity is below zero.
- *Fix:* Use X ≥ A − 0.1·|A|.

**20. Preemption records lack rank values.**
- *Problem:* Brief §5.7 asks for rank values, but the records hold only rank positions (`engine.ts:90–93`).
- *Fix:* Add the source's and target's R scores. Build reports from engine runs, since the replay leaves `targetVirtualState` blank.

**21. Regime keys collide with ranking keys.**
- *Problem:* The regimes are keyed R1–R13 in `context.ts`, which collides with the ranking keys R1/R2 inside sealed diagnostic records.
- *Fix:* Rename them, for example G1–G13.

**22. §19 under-specifies the CLI and ledger.**
- *Problem:* It does not commit to brief §8's requirements: the ledger columns, CSV and JSON export, funded-versus-blocked counts, realized/unrealized reconciliation, preemption columns and a per-symbol collision report.
- *Fix:* Specify them before the code freeze. None of this affects outcomes.

**23. §18 is missing tests.**
- *Add tests for:*
  - a refused (stale) signal never being reconsidered;
  - a portfolio margin refusal meaning no preemption;
  - a two-step chain A→B→C over separate minutes;
  - the intrabar-stop supersede case (finding 2);
  - the same-auction cases (finding 3).
- *Weak mutation test:* the post-switch test (`engine.test.ts:407–440`) mutates only bar arrays and `sClose`. It leaves `sOpen`, `sHigh`, `sLow`, `sClosingPrint` and `sMinClose` untouched, and the exit manager reads these. Mutate every array.

**24. Wording and provenance gaps.**
- §4.2 should say that GDXJ and OIH are *ineligible* under rule D1 (first bar 2016-05-02), not just "late".
- The standalone phenotype JSONs do not record the universe record's hash.
- §16 should state that there is no wall-clock truncation: budgets are evaluation counts, so the "time cap" in brief §2 cannot change results.

## (c) Checked and found fine

- **Brief:** saved complete (265 lines, under 50,000 characters); its sha256 equals the protocol's citation.
- **Data doors:**
  - the training door stops at the search end, asserts the last loaded date, checks file hashes against the audit and records hashes of the loaded bars;
  - the validation door requires a sealed PICKS file;
  - the historical door requires a sealed selection that names a nominee;
  - each window's trace cache belongs to its own evaluator, so nothing is shared across windows.
- **Universe:** 61 eligible symbols, all starting 2016-01-04 with 2,710 sessions; `identical: true` against the October 25 audit.
- **R1/R2 rankings:**
  - an open trade is counted at liquidation value (exit friction plus interest) in both numerator and denominator;
  - days are calendar days from midnight-UTC session dates, so there are no daylight-saving fractions, and a same-day trade counts as 1;
  - a standalone book has a single funded state;
  - ties go to more trades, then the symbol; unrankable symbols go last;
  - all 61 symbols are ranked, so B5's members always have a training-derived rank.
- **Stage A and arms:**
  - representative selection (by J_nb), the library rule (Jaccard ≥ 0.5) and the screening and reserve rules are implemented as written;
  - incumbent D1 phenotypes never seed Stage A;
  - the B arm runs in the final window only and is not nominable.
- **P1 core rules, all correct:**
  - only a strictly higher-ranked signal can start a preemption;
  - the decision estimate uses the last price, both frictions and interest to the decision date;
  - the sale is re-tested at fill time with interest to the fill date, including the weekend;
  - the booked lot net is asserted equal to the tested net;
  - at most one lot or reservation at a time is asserted;
  - a pending preemption blocks every other decision, so there is no chain within a minute;
  - a reservation is never preempted;
  - if the replacement's order fills first, or the data ends while pending, the switch aborts;
  - a preempted lot is booked once and its later virtual exit moves no money;
  - virtual books are never reset;
  - a freshly bought lot cannot be preempted until it clears both frictions, which naturally prevents churn.
- **Shadow books:** `ShadowBook.commit`'s outcome only labels the trade and never feeds back, so cached traces are valid under every policy and ranking.
- **Replay event order:** exits, then the pending sale, then fills, then decisions (in priority order under P0R/P1) — the same order as the engine.
- **Constants:** every numeric value in `PROTOCOL.md` matches `context.ts`, including the tiers, gates, joint-search and standalone settings, diagnostic thresholds, minimum lots, and the minimum-trade rule giving 4/5/7.
- **Benchmark and parity outputs:** the benchmark records only timings and memory. Parity records only equalities and counts; check (i) runs only P0 on `all` (already-known anchors), and checks (ii)/(iii) use final-window training data with random pools and priorities.
- **Prospective B4/B5 freeze:** it binds the `pools` script value, the imports map and the lock-file hash. The `package.json` diff only adds a script, and `git status` shows only that file modified plus the two new study directories.
- **Sealed records:** written once, body hash verified on every read, amendments hash-chained; freeze-protocol refuses if any outcome stage directory exists.
- **Determinism:** all RNGs are seeded by labels, worker results come back in request order, and R1/R2 use paired seeds.

# Methodology review: Study 3 Stage 1 protocol v1.0 (pre-freeze draft)

**Reviewer:** an independent methodology reviewer (subagent) who did not design the study. Written 2026-10-28.
**Files read in full:** `brief/BRIEF.md`, `FIRST_PRINCIPLES_AND_HYPOTHESES.md` (FP), `MECHANISM_CATALOG.json` (CAT), `PROTOCOL.md` (P), `EXPERIMENT_MATRIX.json` (MX), `RESEARCH_RECOVERY.md`.
**Files skimmed:** `src/shared-margin-portfolio/strategy.ts` (ExitManager, firstTradeAfterDecision, interestOn), `src/multi-etf-allocator/shadow.ts`, `Tracker.updateStrict` in `src/multi-etf-allocator/engine.ts`, `src/lib/session.ts`, `src/lib/evaluation.ts`, `src/portfolio-aware-d1/nbook/universe.ts`, `data/partitions.json`, and the Study 1 and Study 2 `FINAL_COMPARISON_AND_RECOMMENDATION.md`.
**Not done:** no market-data bar was read and no simulation was run. Market-return figures below are approximate general knowledge, not computed.

**Verified, so no finding:**
- The loader door is real: `loadBounded(…, window.end)` reads only up to the end date, and `optimization` access refuses partitions other than training before reading.
- The training partition ends on 2023-12-31.
- Session O is the first regular minute's open, and C is the closing print.
- `interestOn` counts calendar days / 365 from the entry session's date.
- `firstTradeAfterDecision` matches what the catalog says about it.

## Findings

### BLOCKER

**1. BLOCKER: the budget caps are smaller than the design they are meant to cap.**
*Where:* P §8 "Budget caps"; MX `S4_develop.M3`; FP §5.6.
*Problem:*
- The real count per family and history is 1,024 + 128 + 16·2d (the shortlist centres are already evaluated) + 16 (the 10 bps reruns), which is 1,168 + 32d.
- Family dimensions d (catalog parameters plus h and t):
  - d = 5: E02, E03, E04, E06
  - d = 4: E01, E05, E07, E08, E11, E12
  - d = 3: E09, E10
- If all 12 families pass M1, one history needs 4×1,328 + 6×1,296 + 2×1,264 = **15,616**. The cap is 15,000.
- Over five histories that is **78,080**. The total cap is 75,000.
- That excludes the M1 panel: 12×4 + X-CS×4 + 6 controls = 58 runs per history.
- FP §5.6 is inconsistent with all of this: it says "up to 11 families", "16 × (2d + 1)" and "about 70,000".
- A cap enforced in code that the predeclared design can exceed leaves the run undefined: it either aborts mid-stage or truncates in an order-dependent way.

*Fix:*
- State the planned count per family-history as 1,168 + 32d, the cap per history as ≥ 15,700, and the total cap as ≥ 78,500. Count the M1 panel runs separately (≤ 60 per history).
- Before the first evaluation in a history, compute that history's planned count from the M1 gate outcomes. If it exceeds a cap, **refuse to start** rather than truncate.
- Correct FP §5.6 to the same numbers.

**2. BLOCKER: the state, campaign and re-entry rules that define results are not fully specified.**
*Where:* CAT `conventions.campaignState`, `sessionRule`, `reentry`, `template.reentry`, `exits.CX1/CX2/OX`; FP §5.1 and §5.4; P §3 "Campaigns".
*Problem:* whatever the implementer chooses for each gap below becomes an unfrozen degree of freedom. Several gaps feed the M1 gate g4 (which uses OX, CX1, CX2), TPL, and the brief's first-entry versus re-entry question. Add the following wording to CAT `conventions` (and mirror it in P §3).

- **(a) Initial state.**
  - Every state machine starts at the first session where its inputs are defined, counting from 2016-01-04: the hysteresis states, the E04 CUSUM, the E05 zigzag, the E11 permission and the E07 pending breakout.
  - Level states start OUT.
  - At the first decision close (2017-01-03), a level family whose state is IN counts as a fresh signal.
  - Without this rule, E01, E02 and E06 may sit out all of calm 2017 because their OUT→IN transition happened in 2016.
- **(b) Detectors always run.** Event and intraday detectors run at every session whether flat or long.
  - A trigger while long is logged as "suppressed: long". It does not add to the position and does not reset the trade's references.
  - An E07 acceptance that completes while flat counts as a fresh trigger, even if its breakout began while long.
- **(c) Campaign clock for each type.** Today only "level" and "event" are defined.
  - Level: the campaign is alive while the state is IN.
  - Event: alive until the family's own OUT condition holds at a close. It is evaluated at every close, flat or long.
  - Intraday (E09, E10): treated as event, with own OUT = C_s < min(C_{s−20..s−1}).
  - Campaign type (E11): alive while permission is ON.
  - "Own OUT disabled" (CX1, CX2, X1, X8*) disables only the exit order. The own-OUT condition still ends the campaign.
- **(d) Fresh signal during a live campaign** (event, intraday and E11 types). It is entered and labelled "re-entry (fresh)" in the same campaign.
  - The trade's references are reset to the new signal's (E08 box low, E12 pullback low).
  - An R3 re-entry keeps the campaign's existing references.
  - "First entry" means an entry made while no campaign is alive. Use this label for the first-entry/re-entry split.
- **(e) R3 reference.** "Highest close of the stopped trade" = max(raw entry fill, closes of sessions at whose close the lot was held).
  - This gives a defined value for a lot stopped inside its entry session, which can now happen because stops are checked from the fill bar.
  - The reference comes from the most recent stopped trade, not the campaign maximum.
  - State the same definition for "trade high close" in R4.
- **(f) Precedence between the R rules and fresh signals.**
  - R2: a fresh signal overrides the cool-down. This is the brief's "no forced waiting".
  - R5: refuse fresh signals until the own-OUT condition has held once.
  - R1: only fresh signals.
  - In each case, say whether the CAT rule "fresh signals always permit entry" is overridden.
- **(g) Exit-session rule.** "Never in a session that had an exit" refers to the session where the entry **fills**.
  - A close-decided entry at the close of a session with an intraday exit is allowed and fills at the next open.
  - If one close produces both an exit signal (while long) and an entry signal, the exit executes and the entry signal is discarded, not queued. Example: an E12 trigger with C_s > H_{s−1} on the same close as C_s below the old pullback low.
- **(h) Coverage gaps.** Define the re-entry rule after OX's catastrophic stop (recommend R3 or fresh) and for every M2X exit (R3 or fresh unless the exit is X7). State that Z1 tranche additions are not "entries" under the one-entry-per-session rule.
- **(i) Own OUT for a level family** is the **state** OUT at a close, not the transition. This matters for placebo entries made while OUT (finding 16).

**3. BLOCKER: the verdict rubric cannot tell leveraged exposure (beta) from timing skill, and K is too weak.**
*Where:* P §11.
*Problem:*
- Three of the four windows are known bull years. VGT price returns were roughly +45% (2020), +30% (2021), −30% (2022) and +50% (2023).
- A monthly re-sized always-long slot would show roughly +$30k, +$20k, −$40k and +$40k. It passes T(i) and T(ii) and fails only (iii) and (iv).
- So almost any long-biased rule with a working 2022 exit passes T. In practice T tests one thing: not losing more than $15k in 2022.
- K says P* "exceeds at least one" of three unoptimised, stop-free controls. That is a low bar, and it compares Σ net only, ignoring drawdown.
- R is largely tautological (finding 4).
- Together, the rubric is biased toward a positive-sounding label for exposure to a known bull market.

*Fix (replacement wording for §11; the dollar values are suggestions but must be frozen):*
- **Materiality.** A window counts as positive only if V_F ≥ +$2,000. |V_F| < $2,000 counts as "flat", not positive.
- **Exposure-matched edge E.**
  - Define f_F = P\*_F's borrowed-principal dollar-days in window F ÷ ($100,000 × calendar days in F).
  - Define B_F = f_F × V_F(C-ALR). Use C-ALR, not C-AL (finding 14).
  - E passes if Σ_F (V_F − B_F) ≥ +$10,000 and V_F − B_F > 0 in ≥ 2 of 4 windows.
- **K, made strict.** P\* "exceeds" a control only if Σ V(P\*) − Σ V(control) ≥ +$5,000 **and** P\*'s maximum window minute drawdown ≤ the control's, or ≤ $35,000 where the control breaches $35,000. "Advantage over conventional controls" requires exceeding **all three** of C-SMA, C-DON and C-TSM.
- **Labels, applied in this order:**
  1. No acceptable candidates.
  2. T fails → **no demonstrated standalone edge**.
  3. T passes, E fails → **positive retrospective net explained by exposure; no demonstrated timing edge**.
  4. T and E pass, R fails → **no demonstrated standalone edge (fragile)**.
  5. T, E and R pass, K not satisfied for all three controls → **promising standalone value, no demonstrated advantage over conventional trend controls (unvalidated)**.
  6. All pass → **promising but unvalidated**.

### MAJOR

**4. MAJOR: robustness test R is mostly true by construction for H's P\*, and never stresses the procedure.**
*Where:* P §11 "Robustness R" and §8 "Family champion" and "Feasibility".
*Problem:*
- H's development period is 2017–2023, so H's P\* already has 10 bps net > 0 (champion rule) and minute drawdown ≤ $35k (feasibility). r1 and r6 are therefore identities.
- r3 largely repeats neighbourhood feasibility (≥ 0.75).
- For D's P\*, only 2023 lies outside its development period.
- R never tests the stressed **fold increments**, which are the only non-selection evidence.
- It is not stated whether both candidates must pass, or what happens if H has no P\*.

*Fix:*
- Add R0: re-simulate each sealed P\*_F over its window **without re-selection** at 10 bps, at 14%, with 25 bps stop slippage (including gap fills), and with a +1 minute delay. Require Σ_F V_F > 0 under each stress, and T(iii) at baseline.
- Keep r1–r6, but label r1 and r6 for H's P\* as "identity checks, not evidence".
- R requires both H's and D's P\* to pass. If H's P\* is undefined, R fails.

**5. MAJOR: there is no drawdown across window boundaries for the procedure, and "percent drawdown" is ambiguous.**
*Where:* P §3 "Window increments" and §11 T(iii); brief §7 M5 and §8.
*Problem:*
- Each window's drawdown restarts its peak at b's mark. A loss from a Nov-2021 peak (fold B) followed by 2022 losses (fold C) can exceed $35k in total while each window stays ≤ $35k. Study 1 found that training drawdown gates did not bound 2022–23 losses.
- `Tracker.maximumPercent` is a percentage of the peak, not of the $100k slot.

*Fix:*
- Define the procedure path Π: P\*_A's marks over (2019-12-31, 2020-12-31], then P\*_B's over 2021, P\*_C's over 2022 and P\*_D's over 2023. Rebase each window to continue from the previous window's end value, with the peak carried across boundaries.
- Add T(v): Π's minute drawdown ≤ $35,000.
- Report every drawdown percentage as $DD / $100,000.

**6. MAJOR: development-end accounting, which the selection depends on, is undefined.**
*Where:* P §5, §7 and §8; MX `S4_develop`.
*Fix (add to P §5):*
- Development net = the liquidation-equivalent mark at the development-end close. This is realised P&L plus the open lot's shares × close × (1 − bps), minus principal, minus interest to that date.
- A close-decided order pending at the development end is not executed.
- "Closed trades" (g1 and feasibility) exclude the open lot.
- The trade-path hash encodes an open lot as (entry session, entry bar, −1, −1).
- Hard check in S5: the replay's liquidation mark at b equals the sealed development-end mark exactly; any difference fails the stage.

**7. MAJOR: stop and fill mechanics are incomplete.**
*Where:* P §3 "Resting stops" and "Same-session order"; CAT `template.stopLevel`, `exits.OX/CX2/X2/X4/X5a/X8T/X8AND`.
*Fix (add to P §3):*
- **(a)** The hard stop is the **raw (pre-friction)** entry fill × (1 − h).
- **(b)** "Highest close since entry" in every stop has the reference max(raw fill, closes held). The catastrophic 15% stops (OX, CX2, X4, X8T, X8AND) are therefore active from the fill bar at raw fill × 0.85. Today they have no defined level in the entry session, and OX and CX2 feed gate g4.
- **(c)** The resting level is the maximum of all active components (hard, trailing, stage and catastrophic) and is never lowered. For X2, state that the ATR-scaled level ratchets. Report the un-ratcheted path only as a diagnostic in the 2020 crisis trace that brief §6.2 requires.
- **(d)** Scan wording: "scanning minutes in time order from the fill bar (or bar 0), the first minute with open ≤ stop or low ≤ stop exits — at its open if open ≤ stop, else at the stop level." The current wording can be read as two separate passes.
- **(e)** The closing print: state whether a closing print ≤ stop fills the stop when no earlier minute triggered. Recommend: yes, at the closing print. Note that D1 does not do this, so this is a deliberate departure.
- **(f)** If a close-decided exit and open ≤ stop coincide, label the exit a gap stop, so that stop-slippage stress applies to it.
- **(g)** Stop-slippage stress applies to gap fills as well as intraday stop fills, as in shadow.ts.

**8. MAJOR: E10 is degenerate at its default, and its definition contradicts its hypothesis. E09 has the same reference problem.**
*Where:* CAT `entries[E09/E10].definition`; FP M09/M09-B.
*Problem:*
- The hypothesis says E10 "buys only a new high since the exit".
- The definition starts high\* at the first minute of the session **after** the exit, and the default is Yb = 0. Any later minute that closes above the first minute's high triggers, so E10 re-enters on the morning after almost every exit.
- E10 also enters almost immediately on 2017-01-04.
- E09 at small Y behaves similarly.
- The result is essentially "always long with stops", counted as a separate family.

*Fix:*
- Accumulate high\* (E10) and low\* (E09) from the exit fill minute onward, including the rest of the exit session, with no trigger before the next session.
- For the first eligible session, seed the references from 2017-01-03's minutes.
- If a genuine breakout is intended, set E10's high\* = max(that value, the exited trade's highest close).
- Before freezing, record the expected trigger rate at the defaults on synthetic data.

**9. MAJOR: there are leakage channels before the code freeze and between stages.**
*Where:* P §6 (S2, S3, "any order"); MX `S2_parity`; P header (amendments).
*Problem:*
- **(a)** S2 parity runs outcome-bearing full-history simulations on H (2017–2023), including all evaluation windows, **before** the S3 code freeze. Every default × {OX, CX1, CX2, TPL}, the controls, and 64 random vectors per family are run. Any P&L that appears in a log can steer which "bugs" get fixed.
- **(b)** "S4/S5 for different folds may run in any order" allows S4-H, S6 and S7 to run before the fold seals.
- **(c)** There is no rule for code fixes after outcomes are seen.

*Fix:*
- **(a)** Restrict S2's market-data parity to ≤ 2019-12-31 plus synthetic fixtures. Defer parity on H to S7/S8, or run it in a harness whose API returns only counts of differing fields and never computes or prints net, drawdown or trade P&L.
- **(b)** S4-A, S4-B, S4-C and S4-D must be sealed before S4-H, any S5, S6 or S7. S6, S7 and S8 require every S4 seal and every S5 record.
- **(c)** A defect that violates a predeclared test or identity is fixed through an append-only amendment. Then re-hash the code freeze, rerun every affected stage with the original seeds labelled `rerun-<n>`, report both records, and base the verdict on the rerun. No other code change is allowed after S3.

**10. MAJOR: the value of re-entry is never tested on the candidates actually selected.**
*Where:* CAT `template.reentry`; MX `S6_diagnostics.M2R`; brief §6 ("for any claimed value of renewable trend reentry…").
*Problem:*
- TPL hard-wires "R3 or fresh", so every P\* implicitly claims that re-entry adds value.
- M2R covers only E01, E02, E07 and E11 at their defaults on H.

*Fix:*
- In S5, for each fold's P\*_F, and in S7, for each finalist, keep the selected parameters and swap the re-entry rule for R1 (no re-entry), R2 (fixed cool-down) and R0. These runs are descriptive and change no selection.
- Report complete campaign net including losing restarts, turnover, interest, missed post-stop gains, and a split of each window's increment into first entries and re-entries.

**11. MAJOR: the design encodes known history in ways that need neutralising or disclosing.**
*Where:* P §11 T(iv), §1 and §12; FP §0 and M05; CAT defaults.
*Problem:*
- T(iv) singles out fold C (V_C ≥ −$15,000) because the designer knows 2022 was the down year.
- E06 is motivated by Study 2's D1-idle calm advances, which include 2021 and late 2023, i.e. windows B and D.
- The defaults (TPL h 8%/t 10%, catastrophic 15%, E11 D 15%, E01 d_out 10%) and the brief's fold layout (three of four windows up) were set with that history known.
- M1 gates run at these defaults, so this knowledge decides which families are searched.

*Fix:*
- Replace T(iv) with "min_F V_F ≥ −$15,000".
- Add a "known-history design-bias register" to P §1. It should list each fixed constant and default, say whether it came from general priors or from knowledge of specific episodes, disclose E06's motivation, and state that the fold replays test only whether *execution* was blind to each window.

### MINOR

**12. MINOR: neighbourhood mechanics.** *Where:* P §8.
- Clamped one-at-a-time points can coincide with the centre and double-count it, which favours box-edge optima (likely for t near 30% in bull development periods). Replace a clamped point with the point one step inward; if that also coincides, drop it and shrink the denominator.
- Define integer rounding as round-half-away-from-zero, with at least ±1 step.
- Give local points a tie-break index (1024 + 32k + j) and break ties between families by ascending family ID.
- Report every champion that sits on a box boundary.

**13. MINOR: the M1 gates count trades, not independent opportunities.** *Where:* P §7 g1/g2.
- "≥ 6 closed trades" rewards churn.
- In fold A, g2 requires an entry in each of 2017, 2018 and 2019, which excludes long holds.
- Count campaigns, or entries separated by ≥ 10 flat sessions, for g1 and feasibility, and state the fold-A asymmetry.

**14. MINOR: the controls are not a fair fixed slot.** *Where:* CAT `controls`; P §9, §11.
- C-AL is one 2017 lot, so its exposure grows to about 2–4× the slot by 2020–2023. Label it as such and use C-ALR as the always-long reference for fixed-slot comparisons.
- Add "C-SMA, C-DON, C-TSM × TPL defaults" (same stops and R rule) so the signal can be separated from the exit.
- Report each control's window drawdowns and $35k breaches next to K.

**15. MINOR: the ledgers and labels are not predeclared.** *Where:* MX `S8_analysis`; P §6 S8; brief §7 M4.
Freeze these formulas now:
- Trend legs: a zigzag on closes with 10% reversal; an up-leg runs from a confirmed trough to its peak and needs a gain ≥ 15%.
- Capture = the strategy's price gain on positions held within the leg, in dollars, ÷ ($100k × leg return).
- Entry delay = sessions from the leg's trough to the first entry.
- Lost post-stop gain = the price rise from each stop exit to the leg's peak while flat.
- Idle share of each leg.
- Episode labels with exact dates (2018 Q4, COVID, 2021, 2022, 2023).
- Concentration: the top trade's and the top campaign's share of net.
Label every one of these as hindsight-based.

**16. MINOR: the placebo is underspecified.** *Where:* P §10.
- Random entries use only the candidate's price stops (h, t) plus a holding cap drawn from the candidate's empirical holding-time distribution. Own OUT is not used.
- "Eligible flat closes" follow the same session rules as the candidate.
- Report the candidate's percentile, with the sentence "descriptive; not a significance test".
- Define the inverted-state placebo as: enter when the state is OUT, exit when it is IN, same stops.

**17. MINOR: M5 stress definitions and outputs.** *Where:* P §10; MX `S7_robustness`.
- Define +1/+5 minute delay for each fill type: opening fill → bar k+1/k+5; stop → open of the minute after the trigger; minute-clock entry → decision + 1/5 minutes.
- Entry slippage applies to minute-clock fills too.
- State whether X6b's 0.11 constant follows the stressed interest rate.
- Add the brief §7 M5 outputs: largest win and loss by lot and by campaign, consecutive losses, recovery time, time underwater, holding distribution, mix of exit reasons, and % time funded.
- Add a test to S2 that mutating any bar after a decision time leaves that decision and its fill unchanged.

**18. MINOR: archive and reporting fields are short of brief §7 M3 and §8.** *Where:* P §8 archive; P §9.
- Add MAE/MFE, turnover, the entry/re-entry mix, the exit-reason mix, borrowed dollar-days, mean/median/maximum hold, the realised/unrealised split, profit factor and net per borrowed dollar-day.
- Predeclare a non-dominated (Pareto) report over development net, minute drawdown, exposure and campaign capture.

**19. MINOR: the value of the search is never measured.** *Where:* P §8 and §9.
- Study 1 found that more search did not help.
- Predeclare P0: the family whose TPL default has the highest development net among families that pass M1.
- Report Σ V_F(P0) against Σ V_F(P\*) under the same rubric.

**20. MINOR: distinctness is overstated.** *Where:* FP §4.2 and §5.1; CAT `exits`.
- E01 at d_in = 0, E07 at A = 0, E11's permission and trigger, and C-DON are all rules about N-session highs.
- E02 at a_in = a_gap = 0 is close to C-TSM.
- X1 = CX1 = X6c = X8P, and X8T = CX2.
- Fix the counts and do not count duplicates as separate exit families.
- Add the A–K coverage table that brief §10 item 4 requires (A→E09/E10, B→E12, C→E05/X3, D→E01/Z2, E→E07, F→E03, G→E08, H→Z1, I→X6, J→A3/E11, K→E11/R0–R5). Note that E covers persistence but not retest/reclaim.

**21. MINOR: freeze scope and record-keeping.** *Where:* P header and S1/S3; `RESEARCH_RECOVERY.md`.
- Include FP and `MECHANISM_SELECTION.md` (which does not exist yet) in `PROTOCOL_FREEZE.json`.
- The code freeze should cover the whole import closure, not only `src/study3-vgt-momentum/`: `src/lib/**`, `shared-margin-portfolio/strategy.ts`, `four-family/data.ts`, the `Tracker` in `multi-etf-allocator/engine.ts`, plus `package-lock.json` and `tsconfig`. Each stage should also check `git status --porcelain` outside the study folder.
- Record the synthetic timing run (command, runtime, hash) that FP §5.6 promises.
- `RESEARCH_RECOVERY.md` is stale (16:23Z, "protocol not yet written"). Update it before the freeze.

**22. MINOR: label precedence, a study-level "insufficient evidence" label, and the candidate carried forward.** *Where:* P §11.
- Apply the labels in a fixed order (finding 3).
- Add "insufficient evidence" when P\* has no lot entered or carried in ≥ 2 windows.
- State that H's P\* is the candidate registered for any later stage, and that its evidence is the procedure's fold record, not its own H result.

**23. MINOR: sizing Z1 and Z2.** *Where:* CAT `sizing`.
- Z1: one stop for the position, with the hard part from the first tranche's raw fill.
- Z2: partial sales come out of lots first-in, first-out.
- Report net per borrowed dollar-day and a comparison with Z0 scaled to the same average exposure, as brief §5H requires.

**24. MINOR: multiple-testing reporting.** *Where:* P §11 family labels and §12.
- "Consistent" means V > 0 in ≥ 3 windows, which beta alone delivers. Rename it "positive in ≥ 3 windows".
- Report how many TPL defaults and controls also earn that label, as a reference rate.
- State the total number of evaluated configurations next to every result.
- Never quote P\*'s development net as an expected result, because selecting the maximum across 12 families biases it upward.

**25. MINOR: small definitions.**
- Minute-clock families: the first eligible session is 2017-01-04.
- E03: ER = 0 when Σ|ΔC| = 0.
- E05 zigzag and E04 CUSUM start on 2016-01-04.
- E12: "set at a session ≥ s−62" uses the latest session that attains the maximum.
- R4: the trough includes the exit session's close.
- Integer Sobol mapping: floor(lo + u·(hi − lo + 1)), so the endpoints are not under-sampled.
- CAT's "O official" should read "first regular-minute open".

### NOTE

**26. NOTE.** Minute drawdown is sampled at minute closes, not lows, and leaves out exit friction. It slightly understates intraminute drawdown. Disclose this.

**27. NOTE.** Each fold carries P\*_F's own hypothetical open lot across b, with stop references from its old fill. A real switch at b would rebuy at the b+1 open. Disclose this, and optionally report a "re-enter at b+1 open" sensitivity.

**28. NOTE.** Price-only accounting penalises high-exposure rules by about VGT's dividend yield (around 0.6–1% per year of exposure). The convention is uniform across candidates and controls, but the size of the effect should be stated.

**29. NOTE.** Four correlated, overlapping windows support screening, not inference. State that no significance is claimed.

**30. NOTE.** Running M2 after M3, as diagnostics only, departs from the brief's M2→M3 order. It is defensible because it stops M2 results from choosing the template. Disclose it as a deviation with that reason.

**31. NOTE.** The "mirrors D1" claim should be narrowed to minute fills and interest. D1 never checks the stop in the entry session and trails from session highs; Study 3 checks from the fill bar and trails from closes.

## Overall assessment

The protocol is **not fit to freeze as written**. Most of the remaining work is precise definitions, not redesign.

- **Must fix before the freeze:**
  - the budget caps (finding 1);
  - the undefined state, campaign and re-entry rules (finding 2);
  - a rubric that cannot separate exposure from timing skill (finding 3).
- **Should also fix before the freeze:**
  - the circular robustness test (finding 4);
  - cross-window drawdown for the procedure (finding 5);
  - development-end accounting (finding 6);
  - stop mechanics (finding 7);
  - E10's degenerate reference (finding 8);
  - the pre-code-freeze parity run on H and the stage order (finding 9);
  - re-entry ablations on the selected candidates (finding 10);
  - the hindsight register (finding 11).

The core design is sound for a retrospective study. Folds are fixed before results; each fold's selection is mechanical and sealed before its window is loaded; data doors are enforced in code; the budgets are bounded; selection uses the neighbourhood median; there are no-search defaults and controls. With the fixes above it would be fit to freeze.

Even then, any positive label remains a retrospective screen on a known bull-market history with four correlated windows. It is not validation, and it should be reported that way.
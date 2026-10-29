# Methodology re-review 3 — v1.1 dispositions, contract, matrix and code (independent read-only agent context)

Reviewer: a separate Claude agent context with read-only instructions (no file changes, no market data; it ran the
synthetic rule tests). Reviewed: PROTOCOL v1.1, ENGINE_CONTRACT §11–§15, MECHANISM_CATALOG, EXPERIMENT_MATRIX v1.1 and
generator, both earlier reviews and dispositions, and the Stage 1c code. Received and saved 2026-10-29 by 15:14Z
(clock). The reviewer's file times (16:02, 16:06) are local CET (= 15:02Z, 15:06Z). Text below is the reviewer's final
message, verbatim.

---

# Re-review: Stage 1c PROTOCOL v1.1, ENGINE_CONTRACT §11–§15, matrix v1.1, and code

**Scope:** I read the brief, PROTOCOL v1.1 (and diffed it against v1.0), ENGINE_CONTRACT, MECHANISM_CATALOG, the matrix and its generator, both reviews and both disposition files. In code I read engine.ts (diffed against Stage 1b's), search.ts, develop.ts, data.ts, catalog.ts, metrics.ts, pool.ts and worker.ts, plus the parts of evaluate.ts and analysis.ts that bear on the dispositions. I ran `tests/rules.test.ts`: 30/30 pass. I opened nothing under `data/`.

Several files changed while I was reviewing (engine/develop/search/data at 16:06, matrix at 16:02). I re-checked the cited logic after those changes; it is unchanged.

## Findings

### 1. MAJOR — Rule B cooldown on high-mode intraday entries (E10) can buy automatically when the timer expires
- **Location:** ENGINE_CONTRACT §11.2 ("high mode keeps its value"); engine.ts:1333–1356 (the freeze applies to both modes); engine.ts:902 (the reference is seeded at −∞ when the policy managing the position is not the active one).
- **Problem:** v1.0 let E10's reference keep ratcheting upward; review 2 #4 called that fine. v1.1 freezes both modes, which breaks E10.
  - **Development runs:** the frozen reference stays at the pre-exit highest close p.hc. Highs made during the cooldown are ignored. If price rallied above p.hc during the cooldown, E10 fires in the first minute of exit + C + 1. That is a buy released by the timer, from what is an event trigger (a breakout over the running high). This contradicts PROTOCOL §4.3 ("event triggers are discarded") and brief §5B.
  - **Executable paths:** the reference starts at −∞ in two cases:
    - S1, primary: the old pick's pending own-rule exit executes at b+1 at a loss and the new pick is E10 with B.
    - S2: the continuing old position exits by its own rule.

    Frozen at −∞, `bClose > −∞` is true, so E10 fires unconditionally at minute 0 of exit + C + 1.
  - **Reach:** 100 E10 × B cells per history.
- **Fix:**
  - **Contract:** while blockB holds, a high-mode reference keeps updating `ref := max(ref, bHigh)` every minute and only firing is suppressed. Low mode stays as now.
  - **Engine:** implement the same.
  - **Tests:** a rally above p.hc during the cooldown gives no buy at release; the −∞ seed case at an S1 boundary.

### 2. MAJOR — "(objective-dependent)" cannot be computed as specified
- **Location:** PROTOCOL §11 item 5 vs §9.1; analysis.ts:412–417.
- **Problem:** Π-NET is assessed on (b)–(h), and (d) needs Π-NET with its rules removed, which §9.1 never enumerates. analysis.ts silently drops (d) for Π-NET (no comparator), so protocol and code disagree. Because evaluate's counts are code-enforced, adding the run later needs an amendment.
- **Fix:** add Π-NET-off (Π-NET-sub(000)) to §9.1 and to evaluate's planned runs. Otherwise state explicitly that Π-NET is assessed on (b), (c), (e2), (f), (g), (h) only.

### 3. MINOR — C = 0 is not equivalent to "no B" for intraday families
- **Location:** ENGINE_CONTRACT §15, PROTOCOL §4.3:154, engine.ts:335/1333.
- **Problem:** with C = 0 the minute check is still true in the exit session x (x < x + 1). The reference is frozen there and a low-mode reference restarts at +∞ at x+1. Stage 1b instead keeps the minimum of lows since the exit. The C = 0 test uses only a close-decided policy, so it misses this.
- **Fix:** freeze and set the cooling flag only when s ≥ triggerFrom (that is, s > R.exitIndex). This changes nothing for C ≥ 1. Add an E09 test with C = 0.

### 4. MINOR — Protocol and contract disagree on rule A eligibility for a carried minute order
- **Location:** PROTOCOL §4.3:139–141 vs contract §11.5; engine.ts:725.
- **Problem:** a minute decision in the last minute (`firstTradeAfterDecision` returns −1) carries over and fills at the next session's scheduled opening bar. Its offset is 0, so it is eligible at d = N. The protocol says minute-rule entries are eligible only on a session dated > F + N. The protocol governs on conflict, so a reference engine could diverge.
- **Fix:** reword §4.3: "a fill after its session's scheduled opening-fill bar (an in-session minute-rule fill); a minute order carried to the next open is an opening fill".

### 5. MINOR — Counter definitions are ambiguous, and parity compares rule events
- **Location:** contract §11.2 and §11.4.
- **Problem:**
  - The minute `bBlocks` counts on Stage 1b's `allowed` (not entered, s ≥ triggerFrom, no RN campaign), not on whether the rule would have fired.
  - The freeze applies even when the rule is not allowed.
  - At an adopt-flat boundary, the old policy's discarded decision is counted in bBlocks/cBlocks, although boundary cancellation would have voided it anyway.
- **Fix:** state all three in the contract.

### 6. MINOR — B/C blocks relabel adoption entries, which inflates rubric item (e)
- **Location:** engine.ts decideFlat (`s === adoptionAt`); PROTOCOL §11 item 2.
- **Problem:** a decision discarded at b leaves a persisting-state entry later labelled `fresh`, which counts toward "≥ 4 first entries not labelled adoption".
- **Fix:** carry the adoption label to the first permitted decision of the same uninterrupted state, or count B/C-delayed adoptions as adoption in (e). Declare whichever is chosen.

### 7. MINOR — Rule A's next-trade sale is immune to every slippage stress
- **Location:** contract §11.5 ("no stop slippage"); rubric (h).
- **Problem:** stop exits pay stop slippage under stop25, and opening exits pay under open50. A's market sell after the open pays nothing beyond cost10. This biases (h) in favour of A masks.
- **Fix:** apply `stopSlippageBps` (or a declared market-sell slippage) to mode-next A fills. Otherwise declare the asymmetry and report A exits under stop25.

### 8. MINOR — CRN twin statistics are incomplete and "inert" is too loose
- **Location:** develop.ts:104–128.
- **Problem:**
  - Twins are looked up by index in `zero.points`. `addPoints` keeps only the first index of a duplicate vector, so a duplicate in the 000 cell drops masked point i from the twin set.
  - "Inert" means equal `pathHash`, but pathHashOf hashes only session/bar pairs. Example: an A sale at bar 1 that coincides with the twin's stop at bar 1 (same session) counts as inert.
- **Fix:** resolve twins by the entry/exit projection via `zero.byVector` or an index alias map. Define inert as equal pathHash and |Δnet| ≤ 1e-6.

### 9. MINOR — First-pass (J17) champions of deep cells are lost
- **Location:** search.ts:466/569; develop.ts:521 (cellSummary after the deep pass); evaluate.ts:292.
- **Problem:** deep J33 rescoring overwrites `state.scored`. As a result:
  - §7.2's "champion rate / median φ by dimension count and mask" and "reason for no champion" become J33-based for deep cells.
  - The §9.1 "first-pass RoD champions (J17)" null draws final deep champions for deep cells.
- **Fix:** snapshot each cell's J17 scored centers, champions and reason before deepPass. Seal them and use them for the first-pass null and the §7.2 statistics.

### 10. MINOR — The matrix states the wrong seed labels
- **Location:** EXPERIMENT_MATRIX.json `cells[].seedLabel`; make_matrix.py:123.
- **Problem:** the label is `study3c|<history>|<entry>|<exit>|<contract>|<mask>|global`, with the mask. That contradicts the pair-level labels in PROTOCOL §7.1 and search.ts. The fixed-parent stream (`<pair>|FP`, develop.ts:480) and the null per-fold draw order are documented nowhere.
- **Fix:** regenerate with pair-level labels and add the local, joint, fixed-parent and null label/draw conventions.

### 11. MINOR — The NET list's distinctness rule and tie-break are undefined
- **Location:** PROTOCOL §7.3; develop.ts `take('net', …, () => null)`.
- **Problem:** no single "champion path" exists for the NET list, so the code skips no pairs. The tie-break (lower first-cell index) is not stated.
- **Fix:** state "path of the champion giving the pair's NET score" or "no path check in the NET list", and state the tie-break.

### 12. MINOR — Fixed-parent details are unspecified
- **Location:** PROTOCOL §7.4; develop.ts:480–491; evaluate.ts.
- **Problem:**
  - Fixed-parent rule boxes are the declared ones, not the pair's widened rule boxes.
  - Forced FP-m with no champion falls back to the parent; the protocol only says "whenever one exists".
  - Gated "parent unchanged" is stored as `null`, the same value as "no champion".
- **Fix:** state all three. Store the gated outcome explicitly (`adopted` | `parent` | `none`).

### 13. MINOR — Rubric item (d) still has interpretation gaps
- **Location:** PROTOCOL §11:374–380.
- **Problems and fixes:**
  - (i) "Active rule" is undefined; analysis.ts uses mask ≠ 000, even when the rule is inert. State that definition.
  - (ii) The table merges two independent conditions; row 3's "as above" is ambiguous. State d1 (depends on the fold-C pick only) and d2 (A, B, D picks only) separately.
  - (iii) `0.75 × max(0, ΣW(Π1-off))` requires ΣW(Π1) ≥ 0 when Π1-off lost in those windows, which is stricter than "retention". Use, for example, `ΣW(Π1) ≥ ΣW(off) − 0.25·|ΣW(off)|`, or declare the intent.
  - (iv) d1's "or W_C(Π1) ≥ −$2,000" passes even when the rules worsened 2022 against Π1-off. In the no-rule case, 2022 loss reduction rests only on (b)'s −$15k floor (≥ $15,966 better than Stage 1b's −$30,966). Word (d1) as "2022 outcome acceptable" and say so explicitly.

### 14. MINOR — "(target-year-informed)" is too narrow
- **Location:** PROTOCOL §1 item 1:44.
- **Problem:** the qualifier covers only A and C events. B was designed from the same 2022 trades. B can block #13 with C ≳ 30 (≈ 29 sessions after #12's exit), and #12 with C ≳ 62 (≈ 61 sessions after #11), which the widening to 89 sessions allows.
- **Fix:** extend the qualifier to B events, i.e. to all rule events.

### 15. MINOR — Two requested comparisons can come out empty
- **Location:** PROTOCOL §9.1; evaluate.ts Pi1-cross / Pi1-open.
- **Problem:** Π1-cross and Π1-open are empty if no fold pick has C or A respectively. The brief asks to determine whether "cross upward from below" adds material functionality (§5C) and to compare the opening-print and next-trade fills (§5A).
- **Fix:** predeclare C-cross and A-open runs on the A- and C-mask P\*-m picks per fold and on P\*_H, inside the planned counts.

### 16. MINOR — Neighbourhood analysis is coarser than the brief asks (§9.1, §9.4)
- **Location:** PROTOCOL §10.
- **Problem:** OAT steps are ±1/±2 × 5% of the range (N and C ≈ ±3/±6; X ≈ ±0.7/1.4 pp). The brief asks for small integer day changes and ±0.1/0.5/1/2 pp. The "joint with stop distances" profiles are missing.
- **Fix:** add ±1/±2 integer steps for N and C, ±0.1/0.5/1/2 pp steps for X, Y and the exit's stop fractions, and rule × stop-distance grids for the picks.

### 17. MINOR — Reporting commitments are missing or live only in the dispositions
- **Brief §8 items absent from the protocol:** maximum single-trade adverse excursion, loss streak, campaign drawdown, unrealised giveback, holding duration / time invested, peak exposure.
- **Commitments made only in the disposition files:**
  - R2-3: Π1 losing transition exits (count, $).
  - R2-4(b): releaseEntry counts and nets.
  - R2-4(c): the fresh 0→1 variant is not run.
  - R2-10: no `aClock: 'date'` sensitivity.
  - R1-13: the 16384 MB heap and the exact develop command.
- **Problem:** the disposition files are hashed in the freeze but are not in the precedence chain.
- **Fix:** move these into PROTOCOL §9, §10, §12 and §13, or add the dispositions to the precedence list.

### 18. MINOR — The §12 test list misses brief §8 cases
- **Missing cases:**
  - an early-close session;
  - "regime reset";
  - "an order waiting during cooldown" (state why it cannot occur: pending orders exist only while flat, and a losing exit precedes any decision);
  - X/Y quantization;
  - E10 under a cooldown;
  - C = 0 on E09;
  - an S1 b+1 pending own-rule losing exit feeding the new pick's B.
- **Fix:** add them to §12.

### 19. NOTE — The bounded reader decodes the whole stop line
- **Location:** data.ts:95–100.
- **Problem:** `toString('utf8')` decodes the entire stop line before the date check. Nothing is split or recorded.
- **Fix:** decode only the first ≤ 32 bytes for the check, to make "unparsed" literal.

### 20. NOTE — `data/partitions.json` is parsed on every load
- **Location:** data.ts:213; PROTOCOL §12.
- **Problem:** the shared `resolveDataset` → `readPartitionConfig` parses it on every load, but §12 lists it as hashed "as opaque bytes".
- **Fix:** reword: dates only, parsed by the shared loader.

### 21. NOTE — Budget enforcement is post hoc, and the default worker door is tautological
- **Correct:** the cap arithmetic: deep 1792 + 4×64 + 8×33 + 4×32 = 2,440 per cell; fixed parent 64 + 2 + 2×33 = 132 per mask; 1,328,684 per history; 6,643,420 in total.
- **Weak:**
  - develop.ts:502 only checks the total after every evaluation has run.
  - pool.ts:28 defaults `door = ds.lastDate`, which can never fail.
- **Fix:** add per-stage and per-cell planned-count assertions, and make `door` a required argument.

### 22. NOTE — The widened upper edge of continuous parameters is not quantized
- **Location:** develop.ts:344.
- **Problem:** the upper edge is left unquantized (the lower edge is quantized). This is harmless because fromUnit quantizes, and every widened lower edge stays on the original grid.
- **Fix:** state it.

### 23. NOTE — The twin claim in §7.1 is too general
- **Problem:** the "same entry/exit values at index i" claim holds for global (0–2,047) and reference indices only. Local and joint indices depend on the chosen seed or center.
- **Fix:** restrict the wording.

### 24. NOTE — Π1 − Π1-off includes transitions that exist only because of rule parameters
- **Problem:** consecutive picks that differ only in rule parameters are transitioned in Π1. With the rules removed they become identical policies, so Π1-off has no transition there.
- **Fix:** report the part of ΔΣW that comes from such boundaries.

## Verified as consistent
- **Engine vs contract §11:**
  - blockB requires ¬consumed.
  - Discarded decisions have no side effects: decideFlat nulls `entry` before any campaign, pending or refActive change.
  - A prevented minute firing keeps refActive and the Stage 1b reference update order.
  - The `reset` clear runs after the pending entry is cancelled and before decideFlat(new); identical re-selections skip it.
  - C-cross uses the previous observation at or after the arming exit, as specified.
  - A's eligibility offset is measured from the scheduled opening bar.
  - Mode `open` decides on priceAt(s, delayed).
  - Step 2b is ordered correctly: a gap at k = 0 belongs to the stop; at k > 0 the working order sells at the bar's open.
  - The fallback runs after step 3.
  - aCancelled is counted correctly.
- **Rules-off bit-identity holds:** every inserted branch is gated by `protect` or `restrictionCarry`. Writing and consuming R has no effect without `protect`. The extra fields stay out of pathHash.
- **Common random numbers (CRN):**
  - The Sobol generator is Gray-code ordered with a per-dimension shift, so prefixes are consistent.
  - The labels are pair-level.
  - All 8 masks of a pair share one widened box object, and entry boxes are never widened. Global and deep-global twins are therefore exact.
  - J17 is exactly the first 16 draws of the sequential J33 stream, clamped to the current box.
  - Every first-pass center is rescored with J33 before deep champions are chosen.
- **Search and selection:** deep-list caps (XF-T counted as XF, both contracts of a family together), the distinctness skip for mask lists, the widening rule, gated/forced fixed-parent picks, and picks per §7.5 all match the protocol.
- **Data:** the reader compares the date before any tokenising and does not read `splits.json` (`splits: []` short-circuits `readSplits`). One door per process, the worker door assert and the end+1 06:00Z assert are in place.

## Overall
No BLOCKER. The protocol should not be frozen until findings 1 and 2 are fixed:
- **Finding 1:** contract, engine and tests.
- **Finding 2:** PROTOCOL §9.1 plus evaluate's planned counts.

Findings 3–5, 9 and 11–13 are binding-text ambiguities that an independent reference implementation or analysis.ts could read differently. They should be fixed in the same revision. The rest are wording, reporting or test additions. With those changes the design can be frozen.

# Methodology re-review 2: Study 3 Stage 1, protocol v1.1 (pre-freeze)

**Reviewer:** an independent subagent. Written 2026-10-28T17:24Z.

**Basis**
- I read in full:
  - METHODOLOGY_REVIEW_1 and its dispositions
  - PROTOCOL v1.1, CATALOG v1.1, MATRIX v1.1, MECHANISM_SELECTION and FP §5–6
  - BRIEF §4, §6, §7 and §11
  - engine.ts, reference.ts, signals.ts, features.ts, specs.ts, context.ts, parity.ts and the tests
- I skimmed rubric.ts, search.ts, stages.ts and metrics.ts. These are work in progress.
- No market data was read. The suite passes 17/17.
- I ran synthetic-only probes on the S2 walks (seeds 21–24, 900 sessions, TPL defaults) using a temporary test file, which I have deleted.
- **States reviewed (sha256 prefixes):**
  - PROTOCOL `34773145cde2`, CATALOG `4b314e6162dd`, MX `252284ab21e3`, FP `0cd819d436dc`, SELECTION `074879d0c8fb`
  - engine `3c5280e102fe`, reference `3e8fca51833b`, signals `b1a544206239`, features `2a24f2cab87b`, specs `e03e897d558b`, context `ceb015a4bed7`, parity `97ce0022885a`
  - engine.ts and PROTOCOL.md (the §8 local-refinement wording) changed during the review.

## Findings

### MAJOR

**1. MAJOR: the code-enforced caps are still the v1.0 values.**
*Where:* `context.ts:97–99` (`capPerHistory: 15000`, `capTotal: 75000`, `capPerFamilyHistory: 1344`), used at `stages.ts` ~L533 (`planned > budget.capPerHistory`).
*Problem:*
- Disposition 1 and RESEARCH_RECOVERY ("context.ts mirrors … 16,000/80,000") both say these were updated. They were not.
- If all 12 families pass M1, the planned count is 15,616, which exceeds 15,000. The history would refuse to start.
- The study would then stall, or someone would change the cap after seeing the gate outcomes.

*Fix:*
- Set the caps to 16,000 and 80,000.
- Drop `capPerFamilyHistory` or set it to 1,328.
- Add a test asserting that the context caps equal the protocol caps and that 4·1328 + 6·1296 + 2·1264 + 70 ≤ the cap.
- Correct the disposition and the checkpoint.

**2. MAJOR: the level-family "fresh signal" is unwritten, and v1.1's campaign rule creates an asymmetry.**
*Where:* engine `freshAt` (L582: state IN); reference L756 (`isLevel ? v.state`); FP §5.1 ("a level family's OUT → IN transition"); FP §5.4 (R1 "lapse and re-qualify"); CAT `stateStart`, which defines only the first-decision-close case.
*Problem:*
- Both implementations treat **any flat close with the state IN and no live campaign** as fresh.
- With finding 2c's new rule (an own OUT seen while long ends the campaign), CX1 and CX2 for E01–E04 and E06 behave as follows:
  - If the state went OUT and back IN while long, a later stop ends the campaign, and the next flat close re-enters immediately as a "first" entry.
  - If the state stayed IN, the trade must wait for the R3 reclaim.
- The documents say "triggers while long are ignored", so the strict reading forbids this.
- Probe: 6 of 71 later level-family CX1 entries were such next-session "first" entries after a stop.
- This feeds g4 (CX1, CX2).

*Fix (choose one before the freeze):*
- (a) Write the code's rule into CAT `conventions` and P §3: "with no live campaign, a level family enters at any flat close whose state is IN". Disclose the asymmetry.
- (b) Require a flat close with the state OUT after a campaign ends before the next IN counts. Change engine and reference identically.

**3. MAJOR: C-TSM decides on a different session in the docs and in the code. It is a K control.**
*Where:* CAT `controls.C-TSM` and FP §5.3 ("at each month's last session"); signals.ts L451 and reference.ts L353 (the first session of each month).
*Problem:*
- The code decides at the close of the month's first session, so orders fill at the month's second session.
- Probe: the state changed on the first January session.
- K is verdict-bearing.

*Fix:*
- Preferred: change the catalog and FP text to "at each month's first session". This is cheapest and raises no data-door question.
- If "last session" is kept, derive it from `src/lib/calendar.ts`, never from `dates[s+1]`. That bar may not exist at a development end such as 2019-12-31.

**4. MAJOR: the S2 market-data record leaks levels, and there is no procedure for a failing S2.**
*Where:* parity.ts `money()` and the daily-mark messages (`engine <a> reference <b>` for net, endLiquidation, minuteDrawdown and marks); stages.ts parity stage (`first: outcome.differences.slice(0, 3)` ~L370/391, `log('parity FAILED …')`), which seals the stage even when `pass` is false.
*Problem:*
- This contradicts P §6 S2(b) ("only difference counts and largest differences (no net, DD or P&L)") and finding 9a.
- A mismatch on fold A's development data would print P&L into a sealed record exactly when code is being fixed.
- S2 is write-once, but there is no rule for rerunning it after a fix before S3.

*Fix:*
- In market-data mode, emit field names and |Δ| only, never levels, in records and logs.
- Define the failure path:
  - a failing S2 is kept as attempt n (redacted);
  - a code fix follows;
  - S2 is rerun as `parity-rerun-<n>`;
  - S3 requires a passing S2.
- Write this into P §6.

**5. MAJOR: the E benchmark C-ALR is unverified.**
*Where:* reference.ts L368 throws for C-ALR; stages.ts excludes it from S2(b) and S7 parity (~L343, ~L1102); no unit test touches it. Rubric E uses B_F = f_F · V_F(C-ALR).
*Problem:* a verdict gate rests on an engine path that has no independent check.

*Fix:*
- Add a closed-form synthetic test:
  - a monthly path with hand-computed segment P&L;
  - friction on the traded difference;
  - $100k interest;
  - liquidation at b and at e;
  - the window increment.
- Add an independent C-ALR restatement to reference.ts and include it in S2(b) and S7 parity.

### MINOR

**6. MINOR: the random-entry placebo for E09/E10 is contaminated by real minute-rule entries.**
*Where:* engine L717 (`allowed` ignores `randomEntry`).
*Problem:* in the probe, the E09 placebo made 35 "minute" and 9 random entries; E10 made 23 and 11.
*Fix:* disable the intraday trigger when `randomEntry` is set. State in P §10 that the family's entry rule, including the minute rule, is unused.

**7. MINOR: placebo holds are one session too long.**
*Where:* stages.ts ~L1060 draws from `sessionsHeld` (the exit session included); engine L805 exits at the open after the close where held ≥ n.
*Problem:* probe: a drawn hold of 5 gave a realised `sessionsHeld` of 6, 6, 6.
*Fix:* draw n − 1, or define the drawn quantity as "sessions to the exit decision", and state it in P §10.

**8. MINOR: the b-mark check says "exactly", but the code uses a tolerance.**
*Where:* P §3 "Development-end accounting"; MX S5 checks; code stages.ts ~L718 (`< 1e-6`).
*Problem:* the development-end and replay formulas are not bit-identical. Probe: 24 of 144 cases differ, by at most 1.5e-11.
*Fix:* write "equal within $10⁻⁶".

**9. MINOR: the rubric has definitional gaps.** rubric.ts already makes these choices, but P §11 should state them.
- (a) D's P\* undefined → R fails (`candidateOk(undefined)` is false).
- (b) Window dollar-days for f_F = Σ over s from b to e−1 of invested_s × (date_{s+1} − date_s), as in `windowFigures`, so f ∈ [0, 1].
- (c) Π uses non-liquidation minute marks. Each window is offset to start at the previous window's end mark. The peak starts at 0 at b_A. Undefined folds are skipped (flat). This is `chainWindows`.
- (d) R0's "and T(iii) at baseline" repeats T(iii). Replace it with "window minute DD ≤ $35,000 in every window under each stress", or delete it.
- (e) E's per-window test is strict > 0, while T(ii) uses the $2,000 materiality. Decide and freeze; I recommend ≥ +$2,000.
- (f) K's "largest window minute drawdown" is the maximum over defined folds for P\* and over all four folds for each control.
- (g) "Campaigns" in g1 and feasibility = first entries (tranche 0) in the development window, including an open one (metrics.ts L16).

**10. MINOR: the bias register names the wrong family.**
*Where:* P §1(c).
*Problem:* it says "E05 (calm advance)". Calm advance is E06 (M05); E05 is the rising floor.
*Fix:* correct the ID.

**11. MINOR: the frozen documents have no precedence rule.**
*Problem:* FP is in the freeze set but still contains superseded sentences that §6 does not list:
- §5.1 "A fresh signal … always permits entry" (R5 overrides it);
- §5.1 "Minute-clock families … start their running reference at the first session after the exit";
- §5.4's R1 wording (see finding 2).

*Fix:*
- Add a precedence clause to the P header and FP §6: catalog v1.1 definitions > PROTOCOL v1.1 > MX > FP/SELECTION narrative.
- List these sentences as superseded.

**12. MINOR: the A2 weekly clock differs between catalog and code.**
*Where:* CAT A2 ("the last session of each ISO week"); code `isFriday` (features.ts L269).
*Problem:* there are no decisions in weeks whose Friday is a holiday: Good Friday every year, 2020-07-03, 2020-12-25 and 2021-01-01.
*Fix:* align the text or the code (a calendar-based last session).

**13. MINOR: the neighbourhood "one step further inward" is ambiguous.**
*Where:* P §8; the code is search.ts L193–206, which uses centre ∓ 2·step.
*Fix:* write "the + point becomes centre − 2·step (the − point centre + 2·step), quantised; dropped if it equals the centre or leaves the box".

**14. MINOR: the delay stress is not applied to a carried minute decision.**
*Where:* engine L617 and reference L576 (`max(openTime, decisionTime + delay)`).
*Problem:*
- A minute decision that cannot fill in its session fills at the next session's first trade with no +k. That is inconsistent with "opening fills at the first trade ≥ open + k".
- `decisionTime` already includes the delay, so it is counted twice.

*Fix:* use `firstTradeFrom(openTime + k·60)` for a carried decision, in both engine and reference.

**15. MINOR: the trigger rates were deferred past the freeze.**
*Problem:* finding 8 asked for them before freezing; the disposition defers them to S2.
*Measured on the S2 walks (TPL defaults):*
- E10: 1.8 entries per year, exposure 0.16, so no longer degenerate.
- E09: 9.0 per year, exposure 0.75, which is close to always-long-with-stops.
- The others: 1.3–4.8 per year, exposure 0.19–0.44.

*Fix:* record these under `audit/` before S1, and disclose E09's high default exposure (E is the relevant guard).

**16. MINOR: reporting is incomplete against the dispositions and the brief.**
- §11 has no P0-versus-P\* line (disposition 19 says it does).
- §10 lacks the exposure-scaled Z0 comparison (disposition 23).
- §9 lacks the realised/unrealised split, profit factor, hold statistics and MAE/MFE per fold (brief §8).
- No item covers brief §6.2's crisis-volatility stop trace, which includes the un-ratcheted X2 diagnostic from review-1 7c.

*Fix:* add one line for each.

**17. MINOR: the catalog has two text defects.**
- **E12:** the parenthetical "(the latest session attaining the 250-session maximum close)" is attached to the pullback low. It belongs to "was set at a session ≥ s−62".
- **E09/E10:** "the first completed minute of a later session whose close…" reads as "the session's first minute".
  - Reword it as "the first completed minute, in a session after the exit session, whose close…".

**18. MINOR: the checkpoint and records do not meet the recovery guide.**
- RESEARCH_RECOVERY uses estimated timestamps ("17:2xZ", "~17:00Z", "~17:2xZ"). The guide requires `date -u`.
- The checkpoint's claim that context.ts mirrors the caps is false (see finding 1).
- The S0 audit record is called sealed without its sha256.
- The CAT `written` field says "~17:05Z".

*Fix:* use clock times, quote the hashes, and correct the constants line.

### NOTE

**19. NOTE: the 7e rejection is acceptable.**
- It is factually correct:
  - D1's ExitManager scans `k < count` only (strategy.ts L320);
  - D1 applies the gap check at the next open (L291).
- The bias runs both ways:
  - an overnight rebound keeps the lot;
  - a further fall fills worse at the next open.
- Add an S7 count: held sessions whose closing print was ≤ the stop with no minute trigger, and the next-open outcome of each.

**20. NOTE: the delayed-stop stress has a small inconsistency (identical in engine and reference).**
- The position is closed at the trigger minute k, but the fill is at minute kd > k.
- Minutes k to kd−1 are unmarked, and E09/E10's reference starts at k.
- This only affects stress runs. Disclose it.

**21. NOTE:** `METHODOLOGY_REVIEW_1_DISPOSITIONS.md`, which holds the 7e reasoning and the partial acceptances, is outside the freeze set. Hash it in `PROTOCOL_FREEZE.json`.

**22. NOTE:** MX S2 lists "C-AL × {own exit, TPL}", but stages runs C-AL with its own exit only. Align them.

**23. NOTE:** trade-path distinctness uses a 32-bit FNV hash plus the trade count (engine L185). Collision odds are about 1e-4 per family-history. Consider sha256.

**24. NOTE: answers to the specific checks.**
- **Check 3 (engine rules versus §3).** The engine and the reference agree with §3, apart from findings 2, 12, 14 and 20, on:
  - campaign death on an own OUT seen while long;
  - a fresh signal inside a campaign becoming a re-entry with its new references;
  - E09/E10 references accumulating from the exit minute and seeded from 2017-01-03, triggering from the next session;
  - E10 seeded at Hc;
  - gap-stop labelling of close-decided exits (bar 0, open ≤ stop) with stop slippage;
  - stop delay;
  - stops never lowered except X5b;
  - Z2 FIFO (engine only);
  - one entry per session, none in an exit session.
- **Check 5 (look-ahead).** None found. I checked:
  - daily windows ≤ s, and "prior" windows < s;
  - the fill-session stop uses the raw fill and ATR[s−1];
  - Z2's target comes from s−1;
  - minute decisions use completed minutes, and E10 compares only with earlier minutes;
  - R4's trough is causal;
  - the C-TSM, E05, E07 and E11 state machines are causal.

## Verdict

v1.1 does not fully address review 1. Most of it is in place: the rubric (ordered, non-circular, implementable from the sealed S5/S7 figures), R0, Π, the stage order, development-end accounting, the stop mechanics, and the E09/E10 references in both implementations. But it is **not fit to freeze yet**.

- **Must change in the frozen text, before S1:**
  - finding 2: write the level-family fresh rule, or change both implementations;
  - finding 3: C-TSM's decision session;
  - findings 8, 9, 10, 11, 12, 13 and 17;
  - the placebo definitions in findings 6 and 7.
- **Before S2 runs:** finding 4 (redaction and the failure and rerun path).
- **Before S3:**
  - code fixes for findings 1, 5, 6, 7 and 14;
  - correcting the checkpoint and disposition claims (findings 1 and 18).

After these, and a rerun of the suite plus a diff check of the final text against this review, the protocol is fit to freeze. None of the fixes needs a redesign, and nothing found reopens a data door.

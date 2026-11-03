# Methodology re-review 3: Study 3 Stage 1b, PROTOCOL v1.1 against the dispositions of reviews 1 and 2

- **Reviewer:** an independent, read-only subagent in a separate context. It ran no strategy, read no `data/` file and
  changed no Git state. The only file it wrote is this report.
- **Written:** 2026-10-28T23:35Z (UTC, from `date -u`).
- **Reviewed (sha256):** `PROTOCOL.md` v1.1 `b294ef1b512c8503294ce615a44fd3751f61ab909246f7086c2a762320906ed4`;
  `EXPERIMENT_MATRIX.json` v1.1 `fa99dba531d056ea4e4cb62ba36c18b271ae1d00c6211862c4ac08591ca86d08`;
  `brief/BRIEF.md` `c7b09fe885a8115fd9a9605f0aa5eae99f274a562103f4159bade683a412079f`;
  `METHODOLOGY_REVIEW_1.md` `4ce6bd63…f6feea`; `METHODOLOGY_REVIEW_2.md` `f612c55b…97be60f`;
  `METHODOLOGY_REVIEW_1_DISPOSITIONS.md` `f016aa72a706d5b5df570706247e6a9edd233f0ecc6481da2698bb8bae9031df`;
  `METHODOLOGY_REVIEW_2_DISPOSITIONS.md` `b034289869b2c08088b146b3da81d09798393e7665d56744c35f06a44a80fa16`;
  for comparison `superseded/PROTOCOL_v1.0.md` `1fee1998…2608979`.
- **Code consulted:** only to confirm that two ambiguities are real. `engine.ts` keeps interest out of M and treats an
  identical ID as "no switch" under S1, S2 and S3. Neither choice is written in the protocol, and the independent
  reference is to be built from the protocol alone.
- **Severity scale:** the same as reviews 1 and 2.
- **Budget arithmetic in §7.7, re-checked:**
  - L-A: 13 × 20 + 13 × 9 = 377.
  - L-B: 44 × (1,024 + 128 + 16 × 33) = 73,920, with a worst-case widening of 73,920.
  - L-C: 12 × (2,704 + 9 × 34) = 36,120, with a worst-case widening of 12 × 2,704 = 32,448.
  - L-D: 2 × 3 × 306 = 1,836.
  - NET re-entry: 12 × 306 = 3,672.
  - Total: 222,293 per history and 1,111,465 for the five histories. Both totals are correct and match
    `caps.perHistoryBreakdown`. The one inconsistency is new finding 13.

## Prior findings

Status: **impl** = implemented as disposed; **partial** = implemented in part; **not** = not implemented; **new
defect** = implemented, but the change introduces a defect listed below.

| # | Status | Note |
|---|---|---|
| R1-1 | impl | All 12 families + C-SMA in L-A (§4.1, §7.2, matrix); P04 = E04 × XF; bias register (f). |
| R1-2 | impl | E06 only in P01–P03; Π-noE06 predeclared (§7.6, §9). E06 can still take P12 (8 of 38 eligible cells). Disclose this in the multiplicity register. |
| R1-3 | impl | 2+2 local seeds and an 8+8 shortlist (§7.1); budget recomputed. The disposition cites §7.8, which does not exist (the budget is §7.7). Shortlist fill wording: new finding 11. |
| R1-4 | partial | The S2 gate is in §11.4 and "(objective-dependent)" is in §11.5. But Π1-S2's own label is missing from the headline list (§11, last paragraph), and the scope of the "(transition-convention-dependent)" suffix is unclear (new finding 9). |
| R1-5 | impl | Annual-reset controls with Π1's window overlay; max(continuous, reset) in (e). Which overlay applies when testing Π1-S2 is unstated (new finding 9). |
| R1-6 | impl | B_F split into a price term and a financing term (§9). The window "price gain − friction" of C-ALR for a lot that spans a boundary is undefined (new finding 10). The primary B_F is not itself labelled ex-post. |
| R1-7 | impl | C-IDLE rule (§5.2); canonical ID (§4.6). Its serialisation is not frozen (new finding 12). |
| R1-8 | impl | 128 perturbed S1 paths with thresholds (§8, §11(f)); re-entry rule, sizing and discrete dimensions fixed. The stress clause is weak (new finding 8). |
| R1-9 | new defect | Campaign and up-leg clauses are added with contributions defined. The giveback clause is implied by (c), so it can never fail (new finding 7). "Σ giveback / Σ peak open profit" is not among the outputs. |
| R1-10 | partial | Own-rule exits, ≥ 4 first entries in ≥ 3 windows. S1 adoption entries and transition-only carries satisfy the counts mechanically (new finding 7). Per-window counts are not listed as an output. |
| R1-11 | impl | Diagnostics allowance deleted; cap = plan; used > plan is refused. Timing is synthetic; no pre-freeze RAM estimate. |
| R1-12 | impl | Prefix, poisoned-future, b-mark and path-prefix tests in parity (d) and in the `evaluate` guards. |
| R1-13 | impl | X4 mapped by its components; HS = {0.08, own 0}; ATR fallback = dmin + dgap. |
| R1-14 | impl | Nomination rule in §11. Not covered: Π1 is "promising" but P\*_H is undefined (new finding 9). |
| R1-15 | partial | (a)–(e) are in §3.1/§5.2. (f), "a change of re-entry rule or sizing alone forces an S1 round trip", is disclosed nowhere in v1.1, although the disposition says it is. |
| R1-16 | impl | q is fixed at the deciding close (§4.4); S' = B₀/C_b (§5.2). |
| R1-17 | impl | Z1 decides at the first close of a month, using the previous session's date. |
| R1-18 | partial | Done, except that ties among the non-R3F re-entry rules have no tie-break; RF ≡ RN for level families makes such ties certain (new finding 11). |
| R1-19 | impl | Gate of ≥ 5 opportunities; per-rule attribution. |
| R1-20 | impl | `repair` runs after develop-H (§2, §5.5, §12). |
| R1-21 | partial | Aligned, and XF-T is a searched box. The matrix still carries v1.0's `search.sizing.perPairing: 297` (new finding 13). |
| R1-22 | impl | Carried items (§5.4), decomposition (§5.3), (a)–(e) in §5.5. |
| R1-23 | impl | Executability is in §11.1. The Stage 1 comparison is in §9, but its financing mode is unstated (new finding 5). The DD-matched comparison is reported; raw dollars govern. |
| R1-24 | impl | F1–F22 frozen. The v1.1 rules have gaps (new finding 14). |
| R1-25 | new defect | Superseded by the net-debit account, which has new defects (new findings 1, 4, 5). |
| R1-26 | impl | §8 (5% steps disclosed, (vi) defined, capture ≥ 50%). |
| R1-27 | impl (D) | Coverage and duplicates recorded; multiplicity register. |
| R1-28 | partial | §2 is now precise and per-load assertions are added. No cutoff assertion for the splits reader. |
| R1-29 | impl | §9. |
| R1-30 | impl (D) | §5.1, §5.2. |
| R1-31 | impl (D) | §6. |
| R1-32 | impl (D) | Disclosed in the dispositions file only, not in §13. |
| R2-1 | impl | As R1-13. |
| R2-2 | new defect | Net-debit is adopted (§3.2, matrix). "Settled" and "booked to the account" leave open whether interest enters M (compounding) and whether marks carry flat interest before the next fill (new finding 1). A trade is charged interest on carried balances (new finding 4). ZR/C-ALR is undefined under net-debit (new finding 5). |
| R2-3 | impl | B_F fixed; L-D reports the price and interest parts separately. In §7.5, "borrowed dollar-day" does not say whether it means principal or debit. |
| R2-4 | impl | S3 runs before the gap check; delay rule; the conversion is exempt from the one-entry rule; S2 trims continue; S2 ≡ S1 when flat; separate transition line; S3 renamed. Double-count risk on the transition line (new finding 10). |
| R2-5 | impl | C-IDLE window; a pairing without a step-1 champion is eliminated and kept in the denominator. |
| R2-6 | impl | Table frozen, with a closed-form subset. Gaps: new finding 14. |
| R2-7 | partial | Coverage, independence, tolerances, counters and evaluate-stage parity are in. Missing: the tolerance list omits the stop component and daily marks; the random vectors cycle only E06/E05/E09/C-SMA; the reference's permitted imports are unstated (new finding 15). |
| R2-8 | impl | RS: cross from below, with the level of the fill session; REF counts the exit session's close. |
| R2-9 | partial | Raw-E price gain, (v) and (vi) are in. The exit step became "principal and interest are settled", which is ambiguous (new finding 1). The reviewer's daily-mark identity was not adopted; (vii) is now S > 0. |
| R2-10 | impl | Per-event ledger. The realised gain uses E(1 + bps), which is wrong under entry slippage and for shares rebooked at a conversion (new finding 17). |
| R2-11 | impl | Three DD bases defined. |
| R2-12 | impl | The wording of the stop-fill fallback is garbled (new finding 16). |
| R2-13 | impl | Hh includes closes; `level above prior close`; shortfall recorded. |
| R2-14 | impl | t0-wins formula, collapse rule, XU added. F16 tests "tmin near t0" rather than the in-box tmin > t0. XU's counter is undefined (new findings 14, 16). |
| R2-15 | impl | Trim ratchet, Z3(g), the I_s convention and S > 0 are stated. |
| R2-16 | impl | XS arming; unarmed X3 is parity-only. |
| R2-17 | impl (D) | XO count defined. The level-family delay equivalence is disclosed only in the dispositions. |
| R2-18 | impl | D1 rule adopted. The date of I_s in the activation test is unstated (new finding 16). |
| R2-19 | impl | Z1 timing; no trim at an exit close. |
| R2-20 | impl | Guard added. Measured at the center or as a J32 median: unstated (new finding 11). |
| R2-21 | impl | Gate and attribution. |
| R2-22 | impl | Priority frozen. The reason labels of XD-P and XD-T are unassigned (new finding 16). |
| R2-23 | new defect | The widening rule is under-specified (new finding 6). XD-P/XD-T, the XV traces and the shortfall statistics are in. |
| R2-24 | impl (D) | §13. |
| R2-25 | impl (D) | §13. |
| R2-26 | impl | §8, §13. |
| R2-27 | impl | §2. |
| R2-28 | partial | Constants are in the matrix, but the leftover 297 key remains (new finding 13). Stage 1's Z1/Z2 are qualified. |
| R2-29 | impl | φ_fin uses L, not the debit; that is "own financing" only in fixed-slot mode (new finding 17). |
| R2-30 | n/a | No finding. |

## New findings

No BLOCKER; 3 MAJOR, 13 MINOR, 1 NOTE.

1. **MAJOR, §3.2: the booking of interest is ambiguous (simple versus compounding; marks between fills).**
   - *Problem:* I is "a separate liability; it bears no interest", yet at an exit "the trade's principal and interest
     are settled", and flat interest "is booked to the account at the next fill". One reading moves settled interest
     into M. The debit max(−M, 0) then bears interest on past interest, which compounds at every fill (roughly
     $5–8k over 2020–2023 at an ~$100k debit) and contradicts brief §2 and §13 ("simple"). Another reading keeps all
     interest in I, which is what the fast engine does. A literal reading of "booked at the next fill" also leaves
     flat interest out of marks, W_F and the flat-period DD until the next fill.
   - *Impact:* the independent reference is written from the protocol alone, so it can resolve either point the
     other way. A disagreement fails parity (b), and a parity failure is the "Invalid" label.
   - *Fix:* "Accrued interest never enters M. M = Σ sale proceeds − Σ buy costs. The segment base is
     max(−M, 0). I = all interest (trade and flat) accrued to the mark's session date and enters every mark,
     including marks while flat. 'Settled' and 'booked' mean attribution only." Add a closed-form fixture with a
     carried loss followed by a gain, so that the booked interest has a known value.
2. **MAJOR, §5.2: S2 under an identical re-selection is undefined, and the verdict needs S2.**
   - *Problem:* "an identical policy is not transitioned" appears only in the S1 bullet. S2 says "no re-entry of the
     old campaign", without an exemption. A literal S2 therefore kills the re-entries of an unchanged pick that is
     long at b, while S1 and the fast engine continue the campaign.
   - *Impact:* parity (b) includes the "identical ID" pair, so the reference and the fast engine can disagree.
     Rubric item 4 also requires S2 to pass.
   - *Fix:* "Under S1, S2 and S3 an identical policy is not transitioned: its position, pending orders and campaign
     continue." Also state that after an S2 exit the latest sealed pick is adopted. Give expected values for F13's
     identical-reselection case under S2.
3. **MAJOR, §11 (last paragraph), §8 and §10: the descriptive labels, and the "(objective-dependent)" qualifier that
   depends on them, cannot be computed from enumerated runs.**
   - *Problem:* to "reach this label", Π-NET needs (f) and (e). For (f) it needs 128 perturbed paths and the four
     stresses, but §8 builds perturbed paths only for Π1's fold picks and §10 stresses only Π1 and P\*_H. For (e) it
     needs annual-reset controls with Π-NET's sizing overlays, but §9 specifies Π1's overlays.
   - *Problem (other paths):* Π-P0 has no J128 at all, and the Stage 1 picks have none either. §7.7 says "no other
     run is allowed", so these labels are either undefined or produced by unplanned runs.
   - *Fix:* enumerate the Π-NET perturbed paths, the Π-NET stresses and the Π-NET annual-reset controls in the
     `robustness`/`evaluate` plans. For Π-P0, Π-noE06, the static path and the Stage 1 paths, declare (f) "not
     computed" and define their labels on the items that are computed. State that the qualifier compares Π-NET on the
     same items as Π1.
4. **MINOR, §3.2 and §4.2: in net-debit mode a trade is charged interest on carried balances.**
   - *Problem:* identity (i) makes a trade's interest equal to all of the account's interest during the trade's life,
     including interest on earlier carried losses (or the saving from earlier gains). P_s, XRD, Z3, B-D1N, the trade
     nets and the (g) campaign contributions therefore depend on unrelated earlier trades. In Π1 they also depend on
     the previous policy's P&L. The same policy then behaves differently in its development run (M accumulated
     since 2017) and in the path.
   - *Fix:* per segment, charge the trade rate × min(D, L) and book the remainder as "carried-balance interest" on a
     line beside flat interest. Use only the trade's own share in P_s/XRD/B-D1N/Z3, and restate identity (i).
     Otherwise keep the current rule, disclose it, and add a fixture.
5. **MINOR, §4.4 ZR, §4.5 and §9: C-ALR is undefined under net-debit.**
   - *Problem:* "Constant $100,000 principal" has no meaning in net-debit mode. Nothing says whether the monthly
     reset round-trips the whole position or trades only the difference. The difference matters because friction
     enters B_F's price term (up to about $1.2k a year). A top-up buy also conflicts with identity (iii) and the
     one-entry rule. Separately, §9's "Π1 vs Stage 1's S1 path" does not name a financing mode.
   - *Fix:* specify ZR's fills (difference trade, q fixed at the prior close, or Stage 1's convention stated
     exactly), exempt ZR from (iii) and the one-entry rule, and state that the Stage 1 comparison uses net-debit (and
     fixed-slot alongside).
6. **MINOR, §7.3: the widening rule leaves four points open.**
   - (a) "Replaces … only if its RoD champion scores higher (for both pipelines)" can mean one RoD decision applied
     to both pipelines, or a separate test for each pipeline on its own score.
   - (b) It does not say whether the local and J32 radii (±10% "of the range") use the widened range or the original
     range, so scores at different radii get compared.
   - (c) It does not say what happens when several parameters lie near edges.
   - (d) Widening XF-T's upper t edge (0.12 → 0.165) defeats the purpose of P03 and P07 ("tighter trail").
   - *Fix:* one RoD decision used by both pipelines, or state per-pipeline; radii on the original range; widen every
     qualifying edge in one `|wide` search; exempt XF-T's upper t edge.
7. **MINOR, §11(g) and §11(d): one rubric clause is vacuous and two counts can be met by the boundary mechanics.**
   - *(g):* a campaign's giveback is a decline in the account mark, so it is ≤ Π1's chained minute DD. Since (c) is
     applied first, "largest campaign giveback > $35,000" can never fail at item 4, and brief §13(g) giveback is not
     tested.
   - *(d):* every S1 adoption of a level policy that is IN gives a "first entry", and a transition fill at b+1 counts
     as a carried position in the next window.
   - *Fix:* freeze a relative giveback criterion now (for example Σ campaign giveback / Σ campaign peak P&L ≤ 0.5
     over campaigns with a peak of at least $5,000), or declare the clause descriptive. Do not count the first entry
     decided at the adoption close as a first entry. "Position in window F" = long at ≥ 1 session close in
     (b_F, e_F].
8. **MINOR, §11(f): the stress clause is nearly implied by (b).**
   - *Problem:* the end liquidation mark equals Σ W. At 14% the extra interest is 3/11 of Π1's interest, at most about
     $12k over four years at a $100k debit, so once (b) requires ≥ $20k that check can never fail. The 10 bps and 25
     bps checks bind only at roughly 25+ round trips a year. No stress checks the DD.
   - *Fix:* under each of the four stresses, require stressed Σ W ≥ +$10,000 and stressed chained minute DD ≤ $35,000.
9. **MINOR, §11: labels and nomination leave edge cases open.**
   - (a) The "(transition-convention-dependent)" suffix should apply only when every Π1 item passes and S2 alone
     fails.
   - (b) Add Π1-S2's label to the headline list.
   - (c) When testing (e) for Π1-S2, state which sizing overlay the annual-reset controls use.
   - (d) Nomination should be "none" when P\*_H is undefined.
   - (e) "Any door refusal" should read "any door refusal during a stage" (F19 deliberately refuses).
10. **MINOR, §3.3 and §9: the window decomposition can double-count and B_F's price term is undefined.**
    - *Problem:* the transition line (b's liquidation mark → the b+1 fill) is exactly the old trade's window
      contribution, so listing it "as its own line" without removing it from that trade, and from its campaign in
      (g), counts it twice. "(Price gain − friction)_F(C-ALR)" is defined only per sale, not for a lot that spans
      the window.
    - *Fix:* state that the transition line replaces the old trade's window contribution and is excluded from
      campaign contributions (or included; choose one). Define (price gain − friction)_F := W_F + interest_F of
      C-ALR.
11. **MINOR, §7.1, §7.4 and §7.5: selection tie-breaks and measurements are incomplete.**
    - Step 2 gives only "R3F on ties". Add "then §4.3's listed order".
    - The sizing guard's price gain per notional dollar-day can be taken at the center or as a J32 median. Choose one
      (center).
    - Shortlist: say "alternate the next-best path-distinct point by net, then by center RoD, until 16 or exhaustion".
12. **MINOR, §4.6: the policy-ID serialisation is not frozen.**
    - *Problem:* number formatting and separators are unspecified, and the J128 seeds (`study3b|<policyId>|J128`),
      and therefore rubric (f), depend on them.
    - *Fix:* freeze the exact key format (for example sorted-key JSON with quantised decimal strings) and put one
      test vector (policy → ID) in the matrix.
13. **MINOR, matrix: a v1.0 leftover contradicts the protocol.**
    - *Problem:* `search.sizing.perPairing: 297` (v1.0's 9 × 33) contradicts `sizingStep.perPairing: 306` and §7.5.
      Code that reads constants from the matrix can use the wrong value.
    - *Fix:* delete `search.sizing`.
14. **MINOR, §12: the fixtures miss several v1.1 rules.**
    - *Missing:* net-debit with positive carried cash and M ≥ B₀ (zero debit); the interest-booking convention
      (finding 1); B-D1N deactivation and reactivation through interest accrual; XU's counter; S2 identical
      re-selection and S2 adoption of the latest pick; a C-IDLE window; Z1 month detection after a holiday at a
      boundary; S3 with a delay where the old stop fires; S3 when flat.
    - *Missing (analysis):* nothing tests the `analysis` quantities (W_F decomposition, B_F, campaign and up-leg
      contributions, giveback, (d) counts) against hand-computed values on a synthetic four-window path.
    - *F16:* it should test tmin > t0 (allowed by the boxes).
    - *Fix:* add F23–F25 covering these cases.
15. **MINOR, §12 parity: coverage, imports and code identity have gaps.**
    - (a) The random vectors cycle only E06, E05, E09 and C-SMA. Pairing entries E02, E03, E04, E07 and E11, with
      their searched entry parameters, never meet the reference under Stage 1b exits, net-debit or RPM. Add ≥ 64
      joint vectors per pairing box.
    - (b) Add the stop component and daily marks to the tolerance list (review 2 #7(4)).
    - (c) "From this protocol and `types.ts` only" cannot produce E01–E12. State the permitted imports (Stage 1
      `signals.ts`, the loader, `Tracker`).
    - (d) `parity` precedes `freeze-code`, and git HEAD does not pin uncommitted code. Record the hash of the import
      closure in the parity record and make `freeze-code` refuse a mismatch.
16. **MINOR, §3.1 and §4.2: several definitions are left for the reference to guess, and each guess risks a parity
    failure.**
    - (a) The stop-fill fallback "the closing print if no minute is left, else the last minute's close" reads as
      contradicting "first trade ≥ trigger + k". Reword it as: first trade ≥ trigger + k; if there is none, the
      closing print; if there is no closing print, the last minute's close.
    - (b) XU: is "new Hc" a strict increase? Does the count start at the fill session's close?
    - (c) B-D1N: is I taken at the close date s or at the traded session's date?
    - (d) `own` for XM20–250, XD-P and XD-T.
    - (e) The reason labels of XD-P and XD-T.
    - (f) The label of a transition at an open ≤ the old level (`transition` plus a gap flag).
    - (g) A typo in §4.2: "R3 = R3F = R3F".
17. **NOTE.**
    - Realised gain per sale should use the trade's cost per share, not E(1 + bps).
    - "B₀ of market value at the fill" is really the cost; market value is B₀/(1 + c).
    - XP's φ_fin uses L, not the debit.
    - §1/§5.2 should state explicitly how brief §3B.3 is disposed: S3 is a netted re-entry, and a true state transfer
      is rejected as undefined.
    - C-STOP (the brief's simple stop/re-entry control) is not a rubric control.
    - The dispositions cite a non-existent §7.8.

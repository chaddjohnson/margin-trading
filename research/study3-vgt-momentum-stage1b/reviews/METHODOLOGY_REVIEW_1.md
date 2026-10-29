# Methodology review 1 — Study 3 Stage 1b protocol draft v1.0 (chronology and inference lens)

- **Reviewer:** independent read-only subagent (separate context). No market data, `data/` file or strategy was run or read.
- **Written:** 2026-10-28T23:02Z (UTC, from `date -u`).
- **Reviewed (sha256):** `PROTOCOL.md` `1fee1998eb6b9ffd5cfae5bb7b375110c263f59a4148484f3d7804d7a2608979`;
  `EXPERIMENT_MATRIX.json` `1b6417a0dd14e352dc9bbcced9e4449ca76a68e77068dc03e7687c59a129ac70`;
  `brief/BRIEF.md` `c7b09fe885a8115fd9a9605f0aa5eae99f274a562103f4159bade683a412079f`.
- **Consulted read-only:** Stage 1 `PROTOCOL.md`, `CHRONOLOGICAL_RESULTS.md`, `FINAL_COMPARISON_AND_RECOMMENDATION.md`,
  `MECHANISM_CATALOG.json`, `reviews/`, `src/study3-vgt-momentum/{engine,specs,signals}.ts`, `src/lib/evaluation.ts`
  (`loadDatasetSessions`/`loadBounded`), `src/lib/session.ts`, `src/four-family/data.ts`.
- **Severity scale:** BLOCKER (freeze must not proceed), MAJOR (fix before freeze; can bias or void the verdict),
  MINOR (fix or disclose before freeze), NOTE (disclose).

No BLOCKER. Fourteen MAJOR findings. Four of them (1, 5, 6 and 8) could produce a false "historically promising"
label or make the Stage 1 comparison meaningless.

## Findings

### MAJOR

**1. MAJOR: the families that failed in Stage 1 are removed from the panel without a stated reason (hindsight exclusion).**
*Where:* §4.1 panel; §7.3 entry controls; §7.4 pairings; matrix `panelEntries`.
*Problem:* The panel drops E04 (CUSUM) as well as E01, E08, E10 and E12. E04 is the family that Stage 1's
procedure chose in folds B and C, and it caused the −$57,578 loss in 2022. E12 lost money in 2023. The protocol gives
no reason, and the design-bias register (§1) does not mention the exclusion. Because E04 cannot be a pairing or a
P12 cell, the new procedure cannot repeat Stage 1's 2022 choice. Any "more reliable chronological behaviour than
Stage 1" (the brief's §1 question) is then confounded with removing the known culprit. Removing it was decided with
knowledge of the evaluation windows, which is exactly what brief §1 forbids ("do not rescue … by hindsight").
*Fix:* Put E04, E01, E08, E10 and E12 in L-A at defaults. This costs about 5 × 27 runs.
Add E04 as a fifth L-B entry control or as a predeclared pairing (E04 × XF is its nearest Stage 1 template). Or
justify each exclusion on grounds that do not depend on outcomes (duplicate mechanism, degenerate default), list
the exclusion in the bias register as hindsight-informed, and add a predeclared descriptive sensitivity that runs
the procedure with an E04 pairing.

**2. MAJOR: E06 gets several more chances in the final selection than any other family (known-good crowding).**
*Where:* §7.4 P01–P04, P12; §7.3 entry controls; §7.6.
*Problem:* E06 has 4 of the 11 fixed pairings, and it is 1 of the 4 L-B entry controls that P12 draws from (6–7 of
the 34 eligible P12 cells are E06 cells). Every other entry family gets one pairing. P\* is the maximum over pairings,
so E06 gets about 4–5 draws against 1 for E05, E03, E11, E09, E02, E07 and C-SMA. Brief §7C names three E06
pairings as mandatory. P04 (E06 × XRD) is discretionary, and it was chosen knowing that E06 was Stage 1's H pick and
its fold-A and fold-D picks. Brief §7C says "do not let the known good examples crowd out alternatives".
*Fix:* Keep E06 at the three mandated pairings and replace P04 with a pairing on a non-E06 entry (for example
E04 × XF, see finding 1, or E05 × XS). Predeclare a descriptive path "Π-noE06" (the same pipeline restricted to
non-E06 pairings, S1) so the report can show how much the result depends on E06. Optionally, choose the best pairing
per entry family first and then compare across families.

**3. MAJOR: the shortlist and local refinement are ranked by development net, but the primary champion is chosen by
return over drawdown (RoD).**
*Where:* §7.1 local refinement and shortlist; §7.3; §7.4.
*Problem:* The four local seeds and the 16 shortlisted centers are the best points by net. RoD (§7.1 scores) can
only choose among them. Net rewards exposure, which is Stage 1's failure mode (bias register (b)). If the top 16 by
net are all wide-trail, high-exposure points, the RoD pipeline cannot reach a low-drawdown alternative. The primary
objective is therefore filtered by the objective it was meant to replace, and P\* and P\*-NET share most of their
candidates.
*Fix:* Rank seeds and the shortlist by the pipeline's own score at the center. For the RoD pipeline that is
net / max(DD, $10,000); for P\*-NET it is net. Give each pipeline its own shortlist and J32 set, or use a union of
the 8 best by net and the 8 best by center RoD, both trade-path-distinct. Recompute §7.7: about +528 runs per L-B cell
and per pairing for a second shortlist. Freeze the tie-breaks.

**4. MAJOR: the verdict rests on one path built from two choices that the 2022 outcome informed (S1 transitions and the
RoD objective).**
*Where:* §5.2 S1; §9 Π1; §11; §1 bias register (b).
*Problem:* Whenever the pick changes, S1 liquidates at b+1 and the new policy re-enters with B₀. That amounts to a
boundary resize to $100,000, the very effect that would have shrunk Stage 1's 2.37× lot before 2022. How much reset
Π1 gets depends on how unstable the selection is: a pick that changes at 2021-12-31 is reset, a stable one is not.
RoD was chosen as primary knowing that net-maximisation failed in 2022. Neither choice is wrong, but a
"historically promising" label could then depend on a convention picked with hindsight, not on timing skill. The
rubric computes S2 and Π-NET only "descriptively" (§11).
*Fix:* Require "historically promising" to hold for Π1 and Π1-S2 on items (b), (c) and (e). If it holds for Π1
only, label the result "no demonstrated edge (transition-convention-dependent)". Put the labels of Π1-S2, Π1-S3 and
Π-NET in the verdict headline, and predeclare that a label holding for RoD only must be reported as
objective-dependent. Report how often the pick changed at each boundary and how much exposure each reset removed.

**5. MAJOR: the controls are not treated like Π1, so the excess-over-controls test is biased in Π1's favour.**
*Where:* §9 Controls; §11 item 4(e) (C-SMA, C-DON, C-TSM, flat-start).
*Problem:* Each control starts flat on 2019-12-31 and then runs continuously at Z0. It carries appreciated
fixed-share lots from 2020–2021 into 2022. Π1 gets the S1 boundary reset (finding 4) and can also use a Z1/Z2/Z3
overlay chosen in L-D. Brief §10 asks for "identical financing, exposure treatment and time windows". As designed,
Π1 can beat C-SMA in 2022 because of the reset or the trim rather than its timing. Brief §3B also warns against
"artificial flat-period advantages".
*Fix:* Also run each control as an annual S1 path: forced liquidation at each b+1 opening trade, then re-entry on
its own signal, with no state carried over. Test against the stronger of the continuous and annual-reset versions.
When Π1's policy in window F carries a sizing overlay, compare against the control under the same overlay (or
against C-ALZ1 for Z1). Predeclare all of this.

**6. MAJOR: the exposure-matched benchmark mixes market-value exposure with principal financing, so the excess is
inflated.**
*Where:* §9, B_F = f_MV,F(Π1) × W_F(C-ALR, flat-start); §11 item 4(e).
*Problem:* W(C-ALR) already deducts interest on a constant $100,000. Scaling it by f_MV = Ḡ/B₀ scales that interest
too, but a fixed-share lot pays interest only on L ≤ B₀. Take a lot worth 2× the slot all year at 11%: the strategy
pays $11,000 of interest, while the benchmark is charged 2 × $11,000. The excess is then +$11,000 a year from
financing alone, more than the whole four-year threshold of +$10,000. Under S1 a lot that rises 30% within a year
still gains about $1,600. Z1/Z2 repayments (L < G) widen the gap the same way, because C-ALR never retains gains.
*Fix:* Split the benchmark into a price part and a financing part. For example, B_F = f_MV,F × (C-ALR price gain −
friction)_F − interest_F(Π1), so that excess = Π1 price gain − friction − f_MV × the C-ALR price component and
financing cancels. Alternatively, match on both: scale price by f_MV and interest by f_L = borrowed-principal
dollar-days / (B₀ × days). Keep the current B_F and Stage 1's principal-day version as reported diagnostics. Add the
risk-matched diagnostic that brief §4 asks for: C-ALR scaled to Π1's window minute drawdown.

**7. MAJOR: the executable path is not defined when P\*_F does not exist.**
*Where:* §5.1, §5.2, §9 Π1; §11 item 2 ("P\* undefined in ≥ 2 folds").
*Problem:* The rubric allows exactly one fold without a P\*, which is plausible in fold A: it has 3 development
years, and in Stage 1, 6 of 12 families failed gates there. §5 never says what the account does at such a boundary.
It could liquidate and stay flat, keep the old policy, or hold under S2 and S3. The verdict object would then be
defined in code after the protocol freeze, without review.
*Fix:* Predeclare the rule. Under S1 and S3, liquidate at the b+1 opening trade (as a transition) and stay flat
(C-IDLE) through e_F; W_F counts as non-positive. Under S2, the open position runs to its own exit and then stays flat.
Apply the same rule to Π-NET, Π-P0 and the static path. Define the canonical policy-ID serialisation used by the
"identical policy → no transition" rule: entry and parameters, exit and parameters, re-entry rule, sizing, all
quantised.

**8. MAJOR: rubric item (f) mostly repeats the champion filter, so it barely tests anything.**
*Where:* §11 item 4(f); §7.1 (φ ≥ 0.75 on J32 at ±10%); §8 J128 at ±10%.
*Problem:* Every fold pick is already a champion with φ ≥ 0.75 on 32 draws from the same ±10% uniform distribution
that J128 uses. Requiring a J128 development share ≥ 0.75 re-estimates a quantity the pick was selected on, so it
fails only from winner's-curse noise. The brief asks for neighbourhood profit and risk feasibility (§13(f)) and for
post-selection sensitivity in the next fold (§8). Neither enters the rubric. The next-window neighbourhoods in §8
are computed but have no threshold.
*Fix:* Replace or supplement (f) with a perturbed executable path. For each j = 1..128, perturb every fold pick
with its j-th J128 draw and run the S1 path. Require that ≥ 75% of the 128 paths have Σ W > 0 and chained minute DD ≤
$35,000, and that the median path's Σ W is ≥ 50% of Π1's. Keep the development J128 share as descriptive, or widen
it to ±20% and give it its own predeclared threshold. Specify how sizing grid parameters and the re-entry rule are
treated in J128: fixed or perturbed.

**9. MAJOR: rubric item (g) is weak, can be gamed by splitting a trend into several trades, and leaves out giveback.**
*Where:* §11 item 4(g); brief §13(g), §8.
*Problem:* "Σ W_F minus the largest single trade's contribution ≤ 0" passes if everything except the largest trade
nets +$1. Designs with tight trails and re-entry (P03, P07, RPM) split one trend into many trades and pass easily;
wide-trail designs hold it as one lot. The criterion therefore favours the brief's core hypothesis by construction.
The brief's "giveback dependence" has no criterion at all, and "contribution" is undefined for trades that span a
boundary or are still open at the end.
*Fix:* Measure dependence on campaigns and trend legs. Require Σ W_F minus the largest campaign's contribution ≥
+$5,000, and Σ W_F minus the contribution of the largest §10 up-leg ≥ +$5,000. Define "contribution" as the trade's
or campaign's window-increment share, liquidation-marked at e. Add a giveback item: the largest giveback of any
campaign inside the evaluation windows (peak open profit minus final or end-liquidated net) ≤ $35,000, with Σ
giveback / Σ peak open profit reported. Freeze the numbers now.

**10. MAJOR: the evidence gate (d) counts forced transitions and is too low.**
*Where:* §11 item 2.
*Problem:* "< 6 closed trades in 2020–2023" counts S1 transition exits and probably the end liquidation, so up to 3
of the 6 can be boundary artefacts. Six trades over four dependent annual regimes is very little evidence. Brief §7E
and §13(d) ask for independent opportunities.
*Fix:* Count only exits triggered by the policy's own rules. Exclude transitions, conversions and the end
liquidation. Require at least 6 such exits and at least 4 campaigns (first entries) spread over at least 3 windows,
and report the counts per window.

**11. MAJOR: the budgets contain an undefined 30,000-run "diagnostics" allowance and slack above the plan.**
*Where:* §7.7; §2 ("diagnostics load through 2023-12-29"); §12 (no diagnostics stage); matrix `caps`, `stages`.
*Problem:* "diagnostics ≤ 30,000" has no defined content and no stage. It allows 30,000 outcome-bearing runs over the
evaluation windows after results are seen. The per-history cap of 140,000 is 28% above the planned 109,650, the total
cap of 700,000 is 152,000 above 5 × plan, and robustness has 80,000 against roughly 10,000 implied. The refusal check
only compares the planned count with the cap, so the slack invites expansion after the evaluation windows are seen
(brief §7: "do not expand because a later fold disappoints").
*Fix:* Delete the diagnostics allowance, or list its exact runs and counts and add a stage for it. Set each stage's
cap to its computed planned count, plus P12 where it exists. Code should refuse any count used ≠ planned. Any later
run requires an amendment, is labelled exploratory, and is excluded from the verdict and from nominating a candidate.
Record the measured runtime, RAM and worker count that justify the budget (brief §7: "audit workers, RAM and
runtime").

**12. MAJOR: no prefix-invariance or b-mark test guards the evaluate stage, which holds 2020–2023 in memory.**
*Where:* §2 doors; §9; §12 parity (c)/(d), evaluate.
*Problem:* The development doors are sound. However, `evaluate`, `repair` and `robustness` load through 2023-12-29,
and the 2020–2023 decisions of Π1 are then protected only by the code being causal. Independent-reference parity
does not catch a non-causal feature that both implementations share, such as a centred window, a full-series
normalisation, or a zigzag or swing-low confirmation that reads ahead. Stage 1 had a b-mark check (its §3:
development value = replay mark at b). Stage 1b has dropped it.
*Fix:* Add the following tests to `parity` and to the evaluate guards.
- **Prefix invariance:** every signal, feature, exit component and re-entry state array computed on data truncated at
  each b is bit-identical for s ≤ b to the same array computed on the full ≤ 2023-12-29 dataset.
- **Poisoned future:** randomly perturb every bar after b and require the trade paths and decisions through b to
  stay identical.
- **b-mark:** each sealed pick's continuous run on the full data reproduces its sealed development liquidation mark
  and trade path at b.
- **Executable-path prefix:** Π1 rerun with data truncated at each internal boundary gives an identical ledger up to
  that boundary.

**13. MAJOR: the Stage 1 equivalence claimed for X4 is false, so the parity stage would label the study Invalid.**
*Where:* §4.2 "Stage 1 equivalences"; §12 parity (a); §11 item 1.
*Problem:* Stage 1's `X4` (`specs.ts`: `{ catastrophic: 0.15, trendLow: 50 }`; `engine.ts`: catastrophic = Hc × (1 −
x)) uses a trailing catastrophic stop below the highest close. XT's catastrophic stop is the hard level E(1 − h) below
the fill, so XT(rat 0, N 50, h 0.15) ≠ X4 once the price rises above E. The claim "HS = XF with t = ∞" also leaves out
own = 0 (Stage 1 `HS` has `ownOut: false`, whereas XF's default is own = 1), and t = ∞ lies outside XF's box. The other
claims check out against the code: TPL = XF(ref 0, own 1), OX = XO(0.15, 1), X2 = XV defaults, X3 = XS defaults
(E05 `out`, which does not depend on the position), and X8AND = XD defaults.
*Fix:* Either give XT a catastrophic-reference option (E or Hc) and state X4 = XT(rat 0, N 50, h 0.15, cat-ref Hc), or
drop X4 from the equivalences and from parity (a). State HS = XF(h 0.08, t = ∞, own 0) and allow t = ∞ for parity only.
Also specify XV's distance when ATR is undefined (Stage 1 uses the maximum distance).

**14. MAJOR: the protocol does not predeclare which candidate, if any, goes to a later authorised test.**
*Where:* §7.6, §9, §11 item 5, §13; brief §12 (final report: "candidates (or none) for a *later* authorized test").
*Problem:* The study produces many paths and objects: Π1, Π1-S2, Π1-S3, Π-NET, Π-P0, the static path, 12 H-pairing
final policies, P\*_H and the controls. All of them are reported over the same windows. Without a rule, the final
report can name whichever looked best, which would be selection on the evaluation windows. Stage 1 avoided this
("H's P\* is the candidate carried to any later stage").
*Fix:* Predeclare the rule. Only if Π1's label is "historically promising" is the procedure's own output, P\*_H (its
sealed policy ID, with sizing and re-entry rule), nominated. Otherwise the nomination is "none". No descriptive path,
H-pairing policy or control may be nominated, and each is reported with the total number of configurations
evaluated.

### MINOR

**15. MINOR: the edge cases at a transition are not fully specified.** *Where:* §3.1 same-session order; §5.2.
(a) **S3 at an opening gap through the old stop.** The order "pending exit or transition, else gap check, … then entry
or conversion" turns a gap into a stop exit and, under the no-entry-after-exit rule, no new position, whereas S1
records a transition at the same price. State the S3 outcome explicitly.
(b) **Delay stress (+k minutes).** State whether the old resting stop stays active between the open and the delayed
transition fill. Stage 1's engine checks it on earlier bars.
(c) **S2 with overlays.** Say whether the old policy's Z1/Z2 trims and its XRD/Z3 components keep running until the
old position exits.
(d) **b+1.** Define it as the next session in the data, not the next calendar day. Fixture-test 2019-12-31→2020-01-02,
2020-12-31→2021-01-04, 2021-12-31→2022-01-03 and 2022-12-30→2023-01-03 (the observed holiday), including interest
over the closed days.
(e) **S3 for event and intraday policies.** A fresh event trigger exactly at b is rare, so S3 almost always reduces
to S1 for these policies. Disclose this and report how often conversion happened.
(f) **Partly identical policies.** A change of re-entry rule or sizing alone forces an S1 round trip. Disclose it.

**16. MINOR: the size of a trim or conversion is computed from the price of its own fill.** *Where:* §4.4 Z1/Z2
("sell q = S − B₀/raw"); §5.2 S3 (q from x).
*Problem:* The order quantity depends on the opening print at which it executes. A notional entry ($100,000 at
market) is executable, but "sell everything above $100,000 of value at the price I will get" is not a single order.
*Fix:* Size q from the decision close, for example q = S − B₀/C_s for Z1/Z2 and S3, and let the gap move the
resulting value. Alternatively keep the current rule and disclose it as a small look-ahead in sizing, with a
sensitivity that sizes from the close.

**17. MINOR: "last session of each calendar month" (Z1) can read a future bar when implemented.** *Where:* §4.4.
*Problem:* Detecting a month end by `dates[s+1]` reads the next bar, and at a development end the next bar does not
exist.
*Fix:* Decide from the exchange calendar (src/lib/calendar.ts or the scheduled-holiday list), or decide at the first
close of the new month as C-ALR's open-of-month reset does. Test it at each b.

**18. MINOR: several selection and feasibility denominators and tie-breaks are undefined.** *Where:* §7.1, §7.4,
§7.5, §7.6; matrix `seedLabels`.
- Whether φ and the median use 33 points (the center included) or 32.
- What "best-scoring **feasible** rule" (re-entry) and "scores higher" (sizing) require: center feasibility, φ ≥ 0.75
  and 10 bps net > 0 like a champion? Sizing ties should go to Z0, and ties among variants need a rule.
- What happens to a pairing that has feasible points but no champion.
- The indices and ties for local points (Stage 1 used 1024 + 32k + j) and for shortlist ties.
- Whether binary and categorical dimensions move in local refinement.
- Whether E06 × XF counts as "already in P01–P11" through P03's XF-T.
- How P12 is chosen in the P\*-NET pipeline: the RoD or the NET cell. A different P12 needs another 2,704 + 330 runs
  that are not budgeted.
- The exact `<cell>` and `<policy>` strings in the seed labels.

**19. MINOR: the re-entry step chooses among 10 rules even when there are no re-entry opportunities.** *Where:* §7.4
step 2; brief §6 ("don't build an elaborate reentry optimizer on a family that almost never reenters").
*Problem:* If the champion has only a few non-own-OUT exits while the campaign is alive, the choice among 10 rules
is either a tie or fitted to one or two events.
*Fix:* Add a training-only gate: compare rules only if the step-1 champion has ≥ k re-entry opportunities in
development (for example k = 5); otherwise keep R3F. Log the gate's outcome.

**20. MINOR: the `repair` stage runs before the `develop` stages.** *Where:* §12 stage order.
*Problem:* `repair` produces Stage 1b outcomes on 2020–2023: S1/S2/S3 paths and Z1/Z2/Z3 counterfactuals on the 2022
lot. Any amendment needed during `develop` would then be written with knowledge of how the overlays and transitions
behaved in 2022.
*Fix:* Run `repair` after `develop-A..D` and `develop-H` are sealed and before `evaluate`, or seal its payload
unread until then.

**21. MINOR: inconsistencies between the protocol and the matrix.**
- §2 lets `evaluate` run after develop-A..D, while §9 and §12 require develop-H as well.
- The matrix lists XF-T under `fixedExits`, yet P03 and P07 search its box.
- The matrix lacks the re-entry constants (RC10 10, RP50 0.5, RFL θ/b, REF 30/0.30/0.11, RPM 0.85/SMA200/10), Z1's
  timing, the S1–S3 rules, P0, P\*-NET, the static path, and the rule for an undefined P\*.
- §12 requires `git status --porcelain` to be empty outside the namespace, which conflicts with a possible CLI or
  `package.json` entry (brief §14).

Align these before the freeze.

**22. MINOR: the characterisation and reconciliation of the splice are incomplete.** *Where:* §5.4, §5.5, §5.3.
(a) §5.4 says only that an open lot is carried with its old references. Stage 1's Π also carried the campaign and
re-entry state, the pending orders at b, the stop references (Hc) and the fixed share count (exposure drift).
(b) Predeclare a per-boundary decomposition of Π(splice) − Π1-S1 into the carried-lot increment, the transition
gap and friction, the re-entry timing after adoption, and the interest.
(c) Reproduce every window's V and window DD, the −$33,954 carried-lot increment, the $236,944 value at the boundary
and the ~+$83,131 lifetime net to the cent from the sealed records, not only Σ V and Π DD.
(d) To answer "did the old procedure fail when executed" (brief §3B), also apply Stage 1's own frozen rubric (T, E)
to Stage 1's S1 path, beside Stage 1b's.
(e) Brief §3A asks to "reproduce the four picks", but CLAUDE.md §4 forbids rerunning a completed study. Resolve the
conflict by recomputing each pick as the argmax of the sealed Stage 1 archives under Stage 1's rule (read-only) and
say so.

**23. MINOR: the rubric omits parts of brief §13(a) and §1.** *Where:* §11 items 1 and 4.
(a) Item 1 should also fail on executability violations: a lot before its policy entered (outside S2), two entries
in one session, an entry in an exit session, a fill at the close that decided it, a door refusal, or a retained bar
after the cap.
(b) The brief's question asks for "more reliable chronological behaviour than the frozen Stage 1 procedure", but no
item compares Π1 with Stage 1's S1 executable path. Add a predeclared comparison, descriptive or a criterion.
(c) The comparison with controls in (e) is in raw dollars only. A Π1 with C-SMA's net at half its drawdown fails,
which conflicts with the primary RoD objective. Keep raw dollars, add a predeclared DD-matched comparison, and state
which one governs.

**24. MINOR: the synthetic fixtures are not listed in the frozen texts.** *Where:* §12 parity (c).
*Problem:* Brief §3B, §4 and §11 name the cases: a switch during a crash, a gain, a pending stop, a weekend or
holiday, a changing selection, a carry or transfer, a pending order, a same-day re-entry, a principal repayment on a
trim, +100% then −30%, a long flat period, a deep gap, a partial trim, rejection of future-bar access, and no 2024–2026
read. If they are not listed, they are chosen after the freeze.
*Fix:* List each fixture and its expected invariant in the protocol or matrix.

**25. MINOR: a negative account cash balance bears no interest.** *Where:* §3.2 (K, "cash earns 0%").
*Problem:* After losses K < 0, but every entry still borrows B₀ and the deficit pays nothing. Calling this
convention "conservative" is only half true: positive cash earning 0% is conservative, an unfunded deficit at 0% is
not.
*Fix:* Disclose it symmetrically. Optionally add a sensitivity that charges the rate on max(0, −K).

**26. MINOR: the neighbourhood definitions diverge from the brief or are undefined.** *Where:* §8.
- The OAT "step" is 5% of the range, whereas the brief says "grid steps". Say that this departs from the brief.
- Report the unique-vector counts and the changes in entry and exit paths per OAT point, as brief §8 asks.
- Define (vi), "J128 minus the OAT envelope".
- Define "capturing" an up-leg, for example capture ≥ 50% under the frozen formula of Stage 1 §13.

**27. MINOR: compute per dimension differs across cells and pairings.** *Where:* §7.3, §7.4.
*Problem:* Each cell gets 1,024 or 2,048 points whatever its dimension: XO has 2 dimensions, XT 6, and E06 × XV 9.
Taking the maximum over pairings favours the more flexible ones.
*Fix:* Disclose the coverage per dimension and the duplicate rates in each sealed record, and count P12's double
selection (best of 40 L-B cells, then searched again) in the multiplicity report.

### NOTE

**28. NOTE: the data door is adequate as specified.** `loadBounded` keeps ticks with time < end + 2 UTC days,
`groupMarketSessions` drops extended-hours bars, and `selectRunSessions` keeps only the sessions inside the window. No
history end in this study (all on a Tuesday or Friday before a holiday or weekend) retains a later regular bar. Rows
from 2024 onward are nevertheless parsed and hashed, though not kept. State this precisely rather than "not loaded".
Extend the bar-time assertion to each history's development end, not only the 2023-12-30T00:00Z cap, and assert that
the distributions and splits readers drop entries after the cap.

**29. NOTE: development scoring does not match how Π1 runs.** Selection uses continuous runs from 2017, which credit
lots held from earlier years. In Π1 a policy starts flat at b. Consider reporting, descriptively, each pick's
development-year increments from a flat start each year, so that misalignment is visible.

**30. NOTE: S1 adopts a policy immediately at the boundary.** A new level policy whose state is IN at b enters at b+1
(Stage 1's `levelFresh` convention), even where its own continuous run would have waited for its re-entry rule.
Disclose this. Also state that the selection computation is assumed to finish between b's close and b+1's open (each
gap includes at least one non-trading day).

**31. NOTE: the feasibility thresholds are the same in form but bind differently across folds.** "Held in ≥ 3
calendar years" means every development year in fold A, but 3 of 6 in fold D. Disclose.

**32. NOTE: the rubric thresholds are modest.** Σ W ≥ $20,000 over four years (about 5% a year on the slot) and
"positive in ≥ 3 windows" are easy to meet with exposure alone, since 3 of the 4 windows advanced (Stage 1
`CHRONOLOGICAL_RESULTS.md` §4). Items (e) and (f) carry the discrimination, which is why findings 5, 6 and 8 matter.

## Overall assessment

The design repairs Stage 1's central flaw. The selection model is kept separate from the account state, the
development doors are sound, the stages are write-once and code-enforced, and the S1/S2/S3 semantics mostly honour
brief §3B. The equivalence claims hold for TPL, OX, X2, X3 and X8AND. Inference is weaker than chronology, though:
several pieces are tilted, all in the same direction, by knowledge of 2020–2023.
- E04 and other families that failed are dropped without a reason, while E06 gets several more chances.
- RoD is filtered through a shortlist ranked by net.
- The verdict hangs on one transition convention whose boundary resize helps in 2022.
- The excess-over-benchmark test credits the strategy with financing it did not pay for, and the controls get
  neither the boundary reset nor the sizing overlays.
- The neighbourhood item (f) restates the champion filter, and the winner item (g) can be passed by splitting a trend
  into several trades.
- Mechanically: an undefined path when a fold has no pick, no prefix-invariance test while 2020–2023 sits in memory,
  a false X4 parity anchor, an unbounded diagnostics budget, and no predeclared candidate for a later test.

None of these needs new data or results; all can be fixed by editing the texts before the freeze. Until findings
1–14 are resolved or explicitly disposed, a "historically promising" label from this protocol would not be credible
evidence, and the protocol should not be frozen.

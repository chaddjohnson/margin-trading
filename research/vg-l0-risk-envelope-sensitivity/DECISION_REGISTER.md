# DECISION_REGISTER — RES-A 1.0.0 (Stage A recommendations and the user's open decisions)

Everything below is a **recommendation from a retrospective, exploratory audit of fixed candidates**; nothing is
decided, adopted or authorized by it. The 30 % and 35 % levels were proposed after the pilot's outcome was known, so no
statement here is prospective validation. The original NL0 method (P0: marked DD ≤ 35 % of C0) remains the
authoritative reference. Evidence: `REPORT.md` (sections cited), `results/TABLES.md`, `results/analysis-C2x.json`.

## 1. Recommendations

| ID | Topic | Recommendation | Evidence (REPORT §) | Grade |
|---|---|---|---|---|
| R1 | **25 % banked-capital DD** | **Too restrictive on these candidates; do not use it in any further envelope study.** At C24 it removes the control's two most profitable shortlisted phenotypes ($218,842; $205,661) and lowers the best qualified member of the common population from $218,842 to $197,012 (−$21,830, beyond the $2,500 margin: rubric item 1 holds). At C21 it removes one control member ($188,316) and leaves the best ($216,732) unchanged. | §6, §7 | strong on these fixed candidates; exploratory |
| R2 | **30 % banked-capital DD** | **The smallest tested level that keeps every control candidate in this set.** It restores all four members that 25 % removed (C21 1, C24 3), qualifies 23 / 24 (C21) and 24 / 24 (C24) of the common population, and its best qualified member equals P0's at both cutoffs ($216,732; $218,842). It is the level to carry into a Stage B, if one is run. | §4, §6 | strong on these candidates; exploratory |
| R3 | **35 % banked-capital DD** | **Adds nothing over 30 % here; not needed.** No verdict of the 26 qualification members changes between P3 and P4 (or P7 and P8) at either cutoff; rung-3 best is unchanged; at the centre it admits only extra lower-profit centres (C21 161, best $164,813; C24 270, best $178,528); in the G1 extended set it qualifies two more C24 configurations ($135,706, $134,935). | §4, §5, §6 | strong on these candidates |
| R4 | **Trade principal-loss gate (25 %)** | **Redundant at BD 25 %, independently binding (but not decisive) at BD 30 / 35 %.** P6 ≡ P2 on every centre, rung and member (PL never fails without BD). With BD at 30 % it alone excludes 88 (C21) / 67 (C24) centres, at 35 % 141 / 87 — none at rung 3 and no qualification member. Keeping it is a risk preference (it caps a single trade's loss of principal), not a profit question. | §4.4, §6 | strong |
| R5 | **40 % marked DD (P1 vs P0)** | **Admits more candidates, not better ones.** P1 admits 1,197 (C21) / 1,202 (C24) more centres than P0, but the most profitable admissible centre, the best rung-3-feasible centre and the best qualified member are **identical under P0 and P1** at both cutoffs. The C21 members it newly qualifies ($202,274, $186,760, $169,804; DD $35.7k–$38.3k) are below P0's best; their confirmation p10 nets are lower ($78.6k for the $202,274 member). | §4, §5, §6 | strong on these candidates |
| R6 | **No relaxation improves on P0 on these candidates** | Keep P0 (the original NL0 method) as the authoritative reference; **do not change the optimization standard or NL0 1.0.0.** Best qualified centre net is the same under P0, P1, P3 and P4 at both cutoffs; P2 / P6 are worse at C24. Rubric item 2 fails at both cutoffs. | §6, §8 | strong (fixed candidates); says nothing about what a new search would find |
| R7 | **Attribution of the pilot's shortfall** | C21 (Δ −$4,456): **entirely search path** — the constraint changes nothing on either arm's vectors. C24 (Δ −$21,830): **the 25 % gate** removes the control's best (constraint −$29,499 on CTRL's vectors), partly offset by EXP's search path (+$7,669 at P2); measured the other way, the search path costs −$21,830 and the constraint on EXP's own vectors costs $0. The 25 % gate explains the C24 shortfall in the CTRL-first order, not the C21 one; the decomposition is order dependent and both orders are reported. | §7 | strong (arithmetic on sealed populations); one seed pair per cell |
| R8 | **Stage B** | **Optional, low priority.** If the user wants the envelope's principal / banked protection for its own sake, the smallest informative study is a replicated **non-inferiority** test of **P3 against P0** (8 new paired seeds per cell, C21 + C24, ≈ 1.15 M requested evaluations, ≈ 2.1 GPU-hours measured; `STAGE_B_OPTION.md`). It is **not** justified as a search for higher profit: on the fixed candidates P3 never beats P0, and it cannot resolve differences below ≈ $10k. | §9 | judgment |
| R9 | **Pause or continue** | **Pausing risk-envelope optimization and returning to staged trailing-stop work is defensible and is the audit's default suggestion.** The envelope's best case on this evidence is parity with P0 plus extra guarantees on historical paths; only Stage B could show otherwise, and its power is limited. | §9 | judgment |
| R10 | Alternative risk policies (peak-equity %, capped hybrid 40/30/60, profit-component attribution) | No new study warranted now: they admit almost every recorded candidate (the pilot's diagnostics); the banked gate was the only discriminating envelope component. Revisit only as a separate, prospectively specified study. | §10 | moderate |

## 2. What would require a new optimization (not answerable from archives)

- Whether a search **run under** P3 (or P4, P1) explores regions the control misses, and what it would select there.
- Whether the envelope's admissions of DD in ($35k, $40k] lead the search into better robust phenotypes, rather than the
  giveback-heavy ones the pilot saw at C21.
- Any replicated or chronological claim about a policy (the archives hold one seed pair per cell and two cutoffs).

## 3. Decisions for the user (none taken here)

| ID | Decision | Options | Audit's suggestion |
|---|---|---|---|
| U1 | Authorize a Stage B? | (a) no further optimization; (b) the P0-vs-P3 non-inferiority design of `STAGE_B_OPTION.md`; (c) a variant (add P4, add C19, more seeds) | (a), or (b) only if the envelope's guarantees are wanted for their own sake |
| U2 | Banked-capital level for any future envelope work | 25 % / 30 % / 35 % | 30 % (25 % shown restrictive; 35 % adds nothing here) |
| U3 | Keep the 25 % principal-loss gate in a future envelope? | keep / drop | keep only as an explicit risk preference (it binds alone at BD 30 %, rarely and never decisively here) |
| U4 | Return to staged trailing-stop work? | yes / after Stage B | yes |
| U5 | Branches | keep `research/vg-l0-risk-envelope-sensitivity` and the pilot branch unmerged / merge parts | keep unmerged until review; nothing merged |
| U6 | Git-ignored caches | keep / compress / remove the pilot's job archives (≈ 1.3 GB) and this audit's copies and CPU archives in `.cache/vg-l0-risk-envelope-sensitivity/` (≈ 1.4 GB) | keep until the review; then remove the audit's copies first (the originals stay with the pilot) |
| U7 | Any change of the optimization standard or NL0 1.0.0 | — | none recommended |

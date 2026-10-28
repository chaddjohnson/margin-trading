# Independent confirmatory methodology review 2 of protocol v2 (verbatim)

Reviewer: a fresh independent read-only subagent (general-purpose), 2026-10-28 (UTC), given the brief, protocol v2, review 1 and its dispositions. Its report follows unedited; dispositions are in `METHODOLOGY_REVIEW_2_DISPOSITIONS.md`.

---

**Confirmatory methodology review of PROTOCOL v2 (read-only; I modified no files)**

I found no blockers and one new major problem (N1). The SRC identities and all seven parity rows verify. Disclosure: to check its V convention I opened one published standalone-audit fold record (`fold.jsonl`, XLB fold A). I am not passing its value on.

### 1. Review-1 findings: does v2 resolve them?
1. **Yes.** Lost/gained now come from the full replay, and counts use the map's convention. I verified all seven rows (§4).
2. **Yes.** All seven rows and the designer-seen mark are present. A residual gap is in N4.
3. **Yes.** The ∞ convention is set for E_b and F_b, with a test.
4. **Yes.** Identities are written in, the filter is fixed, and the SRC = S1 case is defined. The R2 rationale matches the source (Spearman 0.72 vs 0.41; FROZEN_PRIORITY_RANKINGS.md). A residual is in N4.
5. **Partly.** The screen-before-later-runs order is fixed. But §11 ("No run ending later is made before both seals exist") contradicts Stage 2's post-cutoff parity runs (N3).
6. **Partly.** The NC, materiality and k-of-n rules are added. The thin test is per lot only; the family/event part was dropped (N1).
7. **Yes.** Minor wording residual in N10.
8. **Yes.** The windowed minute figure is declared not computed, and R is daily-only.
9. **Yes.**
10. **Yes.**
11. **Partly.** It does not say which P window's Off-shock flag applies (N7).
12. **Partly.** §10.3 lets the screens be recomputed after results are seen (N2).
13. **Yes.**
14. **Yes.**
15. **Yes.**
16. **Yes.**
17. **Partly (minor).** Overlap by regime is only computed against B, not between ETF pairs (brief §5). Everything else was added.
18. **Yes.**
19. **Yes.**

### 2. New problems in v2
**N1 — major — §9.1 C / §9.3.** "Not thin" only subtracts the largest single scenario-only lot. A counting replay, and so a `limited` verdict, can still rest on one event family or regime. Several lots in, say, the 2022 decline would pass. The brief (§5, §9) says one independent event means thin/inconclusive.
- *Fix:* also count a replay as thin if ΔV@5 minus the largest positive scenario-only share of any single G-regime (or w = 10 family) is ≤ 0.
- Report ΔV by family as well.
- Do not use the 252-session independence rule for this: fold A is only about 378 sessions long.

**N2 — minor (leak path) — §10.3.** After results are seen, a "defect in screen code" allows the screens to be recomputed. The screens share the observer, gate and occupancy code, so nearly any defect qualifies.
- *Fix:* keep the original seal. Replay both selections, report both, and let the more conservative verdict govern.
- Require each defect to be shown by a fixture or parity test.

**N3 — minor — §11 vs §10.2.** Stage 2 runs to 2021-12-31 and 2023-12-29 before the screens: B4/B5 and VGT window anchors, 103 P-nominee fold V values, and the T map rows.
- *Fix:* reword to "no run whose outputs feed Level D, Level C or tables".
- Have Stage 2 report only pass/fail and differences, not values. The P fold V values are evaluation-window outcomes, including SRC XLB and XOP.

**N4 — minor — §0 disclosure.** `audit/PRIOR_STUDY_NOTES.md` shows the designer saw two things §0 does not list:
- the portfolio-aware decompositions on T against B4: P-add-GDX +$146,293, P-add-XOP +$81,268, XLE-P +$67,122;
- the holdout and final figures for 2024–26.

Two further points:
- Applying the same filter to R1 would give **XLK (fold A) and XME (fold B)**. So choosing R2 is what makes XOP, a designer-seen ETF, the SRC.
- *Fix:* list all of this in §0, and add a verdict qualifier when every counting replay is a designer-seen ETF.

**N5 — minor — §7.1 NC.** The NC pool takes candidates that pass every gate and fail only fo_net ≤ 0. That is exactly the H2 profile. "S1 must beat NC" and `screen non-discriminating` would then misread an H2 success.
- *Fix:* require idle_net ≤ 0 or sa_net ≤ 0 for NC, or state how the result will be read.

**N6 — minor — §9.1 R.** It is unclear whether the fallback "C0 > 35% ⇒ ≤ B's + 1.0 point" replaces the ≤ 35% test or is added to it. *Fix:* state which.

**N7 — minor — §9.3.** For P it does not say which Off-shock flag applies (P-A, P-B or both). Fold A (G8/G9 only) contains no broad-shock regime, so Off-shock is met automatically on P-A. *Fix:* require it on P-B, or on both.

**N8 — minor — §7.2.** "the union of its U candidates" could be read as inserting them together, which §7.2 itself refuses. *Fix:* say "each, one at a time", and state whether NC is included.

**N9 — note — §6.3.2.** The greedy tie-break on "a's time" can give (i, j) and (j, i) different matched counts. *Fix:* match once per unordered pair.

**N10 — note — §9.2.** "(full path not positive)" is the wrong label when ΔV > 0 but the replay fails materiality. *Fix:* rename it "not counting".

**N11 — note — §4 / §10.2.**
- Name the key: `selections.ARCH.<SYM>.a0.nominee`. The `ALL` pool's `a0r` has 51 fold-A nominees. I verified that ARCH a0 equals the source survivors, 49 / 54, with grids equal.
- Apply ±$0.50 to every whole-dollar anchor (drawdowns, VGT, B4/B5), not just the map rows.
- Write in the fallback SRC symbols: **KBE** (fold A) and **IWN** (fold B).

I found no undefined terms that would block, no measurement that cannot be done, and no conflict with the brief's mandatory items beyond N1. Under shadow semantics a setup can only end by signalling or stay armed to the end, so the armed interval is well-defined.

### 3. SRC identities: confirmed
- **Fold A, R2 order:** IYT (sparse, F7), XLU (very sparse), VPU (very sparse, F7), TIP (rejected), VOOG (sparse, F7) all fail. **XLB passes at position 6** (survivor, credible, adequate, 11 trades, d1-0018930c77).
- **Fold B, R2 order:** TIP is rejected. **XOP passes at position 2** (survivor, adequate, 28 trades, d1-dbade45b13).
- R2 uses data only up to the search end, so there is no evaluation leakage.
- The nominee counts (49 / 54) and both no-nominee lists are correct.
- The grids are as stated: B5's GDX book, the GDX fold A0s, and U = `d1Values` = 216.3.73.8.74.29.90.60.

### 4. Parity anchors (§10.2): all match
- All seven rows equal OPPORTUNITY_MAP.md lines 50–69: GDX, XOP, XLE, EWZ, TLT, XLU and GLD (counts, funded, lost (net) / gained, Δ@5).
- "unchanged D1" is the control `D1 shipped constants`, which equals VGT primary.
- The map counts every same-minute decision as busy (`opportunity.ts`, start ≤ T).
- Other anchors match their published sources:
  - $242,196.011 (robustness `daily.csv`);
  - VALIDATION 129,369.85 / 217,492.04 / 62,160.78 / 46,506.24 / 112,826.16 / 170,997.21;
  - B5 T $388,489.26;
  - drawdowns 17,702 / 16,557 / 22,327 / 17,269 (peak reset at the search end);
  - VGT 32,698 / 14,894 / 22,145 / 17,421.
- The `fold.jsonl` boundary-to-end mark convention matches the protocol's V.

**Freeze recommendation: freeze after the listed fixes.** N1 is required. N2–N8 are cheap text changes and should be closed before the freeze.

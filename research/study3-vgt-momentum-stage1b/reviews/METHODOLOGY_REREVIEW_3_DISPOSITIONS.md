# Dispositions — methodology re-review 3 (PROTOCOL v1.1 against reviews 1 and 2)

Re-review: `METHODOLOGY_REREVIEW_3.md` (sha256 `dd47ae6b28dfbdc05a782208419059a9b41b1aef743a5a091391b403aed0152f`), on
PROTOCOL v1.1 (`b294ef1b…906ed4`, preserved as `superseded/PROTOCOL_v1.1.md` with the ENGINE_CONTRACT reference added,
sha256 `868bf4c3…7333ea8b`). Dispositions written by the study author (not independent). All changes are in PROTOCOL
v1.2, ENGINE_CONTRACT.md and EXPERIMENT_MATRIX v1.2, written before any Stage 1b mechanism has run on market data (the
only market-data stage so far is `audit`, which runs no strategy). "A" = accepted as recommended; "A\*" = accepted with
the stated variant; "D" = disclosed.

| # | Sev. | Disposition | Where |
|---|---|---|---|
| 1 | MAJOR | **A.** "Accrued interest never enters M"; M = Σ sale proceeds − Σ buy costs; A accrues to every mark's date and enters every mark, flat marks included; "settled/booked" removed; fixture F23 (closed form). | §3.2, contract §8, F23 |
| 2 | MAJOR | **A.** Identical re-selection is not transitioned under S1, S2 and S3 (position, pending orders, campaign continue); after an S2 exit the latest sealed pick is adopted; fixture F24. | §5.2, contract §6, F24 |
| 3 | MAJOR | **A.** Enumerated: Π-NET's 128 perturbed paths, its four rubric stresses and annual-reset controls with its overlays (C-SMA, C-DON, C-TSM); the qualifier compares Π-NET on items (b)–(g); other descriptive paths have (f) "not computed". | §9, §10, §11, matrix |
| 4 | MINOR | **A\*.** Every trade is charged interest on its own principal L (the fixed-slot formula) in both modes, so trade paths and decisions (P_s, XRD, Z3, B-D1N, XP) never depend on the account's history; the account's net-debit interest differs by a separate carried-balance line (A − Σ trade interest), identity (i) restated, the window decomposition carries the line. | §3.2, §3.3, contract §8 |
| 5 | MINOR | **A.** ZR under net-debit specified (difference-trade friction, M bookkeeping, A on max(−M, 0)), exempt from (iii) and the one-entry rule; the Stage 1 comparison uses net-debit with fixed-slot beside it. | §4.4, §9, contract §10 |
| 6 | MINOR | **A.** One RoD decision for both pipelines; radii on the declared range; every qualifying edge in one `|wide` search; XF-T's upper t edge exempt. | §7.3 |
| 7 | MINOR | **A.** (g): the $35,000 campaign-giveback clause is replaced by Σ giveback / Σ peak P&L ≤ 0.5 over campaigns peaking at ≥ $5,000. (d): first entries decided at an adoption close are labelled `adoption` and excluded; "position in window F" = long at ≥ 1 close in (b_F, e_F]. | §11, §5.2, contract §5 |
| 8 | MINOR | **A.** Under each of the four stresses: stressed Σ W ≥ +$10,000 and stressed chained minute DD ≤ $35,000. | §11(f) |
| 9 | MINOR | **A.** (a) the S2 suffix applies only when every Π1 item passes; (b) Π1-S2's label is in the headline; (c) Π1-S2 uses Π1's annual-reset controls; (d) nomination "none" when P\*_H is undefined; (e) "door refusal during a stage". | §11 |
| 10 | MINOR | **A.** The transition line is a sub-line of the old trade's contribution (no double count) and stays in its campaign; (price gain − friction)_F(C-ALR) := W_F + interest_F of C-ALR (already so in code). | §3.3, §9 |
| 11 | MINOR | **A.** Step-2 ties: R3F, then §4.3's order; the sizing guard is measured at the center; shortlist wording fixed. | §7.1, §7.4, §7.5 |
| 12 | MINOR | **A.** Key serialisation frozen with a test vector (`E06/XS/R3F/Z2(0.5,0)-0509c388d5`) in the matrix and a test. | §4.6, matrix |
| 13 | MINOR | **A.** `search.sizing` deleted. | matrix |
| 14 | MINOR | **A\*.** Added F23 (net-debit carried interest, closed form), F24 (S2 identical re-selection, C-IDLE window, XU counter), F25 (Σ contributions − Δ carried = W_F on a synthetic four-window path). B-D1N deactivation, Z1 after a holiday at a boundary and S3 with a delayed fallback are covered by fast-vs-reference parity and the branch-coverage counters rather than closed-form fixtures (disclosed). F16 stays at tmin < t0 (the t0-wins rule makes tmin > t0 equivalent to t_eff = t0; covered by parity's random vectors). | §12 |
| 15 | MINOR | **A.** (a) 64 joint vectors over every pairing box; (b) stop component and daily marks in the tolerance list; (c) the reference's permitted imports listed; (d) the parity record stores the code-manifest hash and `freeze-code` refuses a mismatch or a failing parity. | §12 |
| 16 | MINOR | **A.** (a) stop-fill fallback reworded; (b) XU: strict new held-close high, count from the entry session; (c) B-D1N: I at the close date; (d) fixed exits own 0; (e) XD-P/XD-T reason `damage`; (f) a transition at an open ≤ the old level keeps `transition` with a gap flag; (g) typo fixed. | §3.1, §4.2 |
| 17 | NOTE | **A.** Realised gain per sale uses the trade's cost per share; "B₀ of cost"; XP uses the trade's principal (stated); S3 is a netted re-entry and a true state transfer is rejected as undefined; C-STOP is a reported, not a rubric, control; the earlier dispositions' "§7.8" means §7.7. | §3.2, §3.3, §4.2, §5.2, §13 |

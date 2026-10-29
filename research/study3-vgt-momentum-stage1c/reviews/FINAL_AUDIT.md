# Final audit — independent read-only agent context (verbatim)

Brief: `reviews/FINAL_AUDIT_BRIEF.md`. The auditor recomputed every binding quantity from the sealed payloads with its
own scripts, wrote nothing to the repository, and returned the text below (received 2026-10-29 ≈17:25Z).

---

# Final audit: Study 3 Stage 1c (independent, read-only), 2026-10-29T17:24Z

**Scope and method.** I recomputed the results from the sealed payloads using my own scripts in `/tmp/claude-1000/audit1c/`. I also ran `status` and `verify` (all stages "sealed, verifies", 0 problems) and `rules.test.ts` (36/36 pass). I regenerated the tables into a scratch copy with `STAGE1C_REPORT_RESULTS`; all 21 files are byte-identical to `results/tables/`. I wrote nothing to the repository. The changes to IMPLEMENTATION_AUDIT.md and the final-tests logs during the audit were made by the parent session.

## Findings

**1. MAJOR: the reports claim the rules "robustly" cut drawdown, which goes beyond the allowed wording.** (README one-page outcome, bullet 2; FINAL §2 bullet 1, "What the rules do robustly is cut drawdown"; FINAL §4.2, "its robust effect here")
- The drawdown benefit comes only from 128 parameter perturbations of the same picks. PROTOCOL §13 says these are not independent market samples.
- It sits in 2022, the year the rules were designed from. Π1-off's chained drawdown runs from a peak on 2021-12-27 to a trough on 2022-10-13.
- Perturbed Π1 stays at or below $35k drawdown in 79/128 paths (62%), against 0/128 for the rule-free twins. The predeclared primary protection statement fails (33.6% paired).
- **Fix:** reword as "in one retrospective, target-year-informed replay and its parameter perturbations…" and drop "robust" from the recommendation.

**2. MINOR: report statements contradicted by the sealed tables.**
- (a) INTERACTIONS says C-SMA reset "beat Π1 … within the control margin". In fact Π1 beat C-SMA reset by +$2,673 (+$51,669 vs +$48,996); the shortfall is against the required +$5,000 margin.
- (b) INTERACTIONS says "with tight trails A is mostly inert" and "B matters most for E09/E10". The `cells-*.csv` `actedA` (share of vectors with an A sale) for XF-T mask-100 cells is 82% (history A) and 93% (H), among the highest of any exit; XRP is the lowest (68% / 80%). B's activity on E10 is 37% / 45%, below E06 (69% / 81%).
- (c) ABLATIONS §3 says median Δnet vs the twin is "≈ $0 for single rules". For A-only it is −$909, −$4,429, −$2,351 and −$5,434 in histories B, C, D and H.
- (d) FINAL §2 and ABLATIONS §1 say "59% of perturbed Π1 paths within $35,000". 59% is the share that is both positive and within $35k; drawdown alone is 62%.
- (e) ENTRY_EXIT says the picks' neighbourhoods are "100% positive by construction". That is an empirical J128 result; selection only requires φ ≥ 0.75 on J33.
- (f) README says Π1 passes "every stress". The 0 bps stress gives a $51,541 drawdown; only the rubric-(h) stresses pass.
- (g) NEIGHBORHOODS says the 2022 rallies were "where the rules' re-entry timing mattered". Π1-off captured the same three legs as well: 92 / 97 / 93% vs Π1's 91 / 82 / 102% (`legs.md`).
- (h) FINAL says "B at 10 sessions changes nothing". It leaves the three 2022 trades unchanged, but 2023 goes from +$11,049 to +$14,343 and Σ from +$12,573 to +$15,867.
- (i) INTERACTIONS says "2021: one A sale (−$714)". There were two: trade 5 at −$714 and trade 6 at −$106.

**3. MINOR: missing "(target-year-informed)" tags and predeclared wording.**
- Untagged statements that credit 2022 results to the rules: CHRONO (a) and (d) ("+$40,351 … timing via A×B"); NEIGHBORHOODS (the "losses cut" sentence and the legs sentence); INTERACTIONS ("A × B is the effective combination"; the alternative-explanations bullet).
- Two predeclared statements that hold are reported without the required "in one retrospective, target-year-informed replay" wording: the procedure statement (Π1 vs Π-000) and "2022 improved with trend retention". The second (`analysis.json` `protection.y2022.holds = true`) appears only in `verdict.md`.

**4. MINOR: protocol and brief deliverables missing or only partly delivered.**
- The H Pareto set (PROTOCOL §10, brief §9.5) is absent; "Pareto" appears only in PROTOCOL.md. It can be computed from the cells-H payload.
- Drawdown peak and trough dates (PROTOCOL §3, brief §8) are not reported. Π1 chained: 2021-11-22 → 2022-05-20.
- §11 requires every report to quote the total configuration count; only README and FINAL do.
- CHRONO (e) omits the Π-000 comparator required by §9.2(e): 2020 + 2021 + 2023 = +$23,685.
- The rule × stop grids and the ledger fill prices, shares and friction exist only in payloads.

**5. MINOR: a second degenerate control row is not disclosed.**
- C-ALZ1|reset has the same path hash as C-AL|reset (`d73b5c1a…`): +$71,331, 0 trims, peak gross $152,700.
- Cause: the call `controlResetSchedule(…, [Z0×4])` in `evaluate.ts` overrides Z1 for every control.
- A2 discloses only C-ALR|reset, and `paths.md` prints this row as if it were valid. No rubric item uses it.
- **Fix:** a disclosure amendment (A3) and label or drop the row.

**6. MINOR: stray untracked artifacts that are not git-ignored would be committed.**
- `research/study3-vgt-momentum-stage1c/research/study3-vgt-momentum-stage1c/results/tables/` holds 6 header-only tables, created 17:05:22Z. This matches a `report_tables.py` run from inside the study directory (`ROOT` is relative to the working directory).
- `scripts/__pycache__/report_tables.cpython-314.pyc` is also untracked.
- `report_tables.py` writes empty tables when the records are missing instead of failing. It also reads the git-ignored archives without checking their sha256, and silently blanks the diag-2022 "feasible" columns when they are absent.
- **Fix:** delete both before committing and make the script fail closed.

**7. MINOR: verification fails on a fresh clone.**
- The develop records list the git-ignored `archive.jsonl.gz` as payloads, so on the pushed branch `status` shows develop-A…H as BROKEN and `verify` fails.
- `diag-2022.md` cannot be regenerated from committed files.
- **Fix:** document this in the README, or make the verifier treat a git-ignored archive as "absent", not corrupt.

**8. MINOR: records and checks are thinner than §7.6 and §12 state.**
- Records hold only the filtered `git.outside` list, not the porcelain status. IMPLEMENTATION_AUDIT §1 says they hold it.
- `evaluate` (338 evaluations) and `robustness` (2,619) have no planned count and no guard against exceeding one.
- In `analysis.ts`, `ledgerChecks` tests (vii) only as shares ≥ 0, and does not assert positions-under-active-policy or B/C compliance (§11 item a).
- My own checks of these on Π1, Π1-off and Π1-reset found 0 violations, so there is no effect on the outcome. **Fix:** disclose and correct the wording.

**9. MINOR: the checkpoint and README state are stale or premature.**
- RESEARCH_RECOVERY's top screen says "Amendment head: A1" (A2 exists), still says "Then: write the reports", and says "Running processes: none" while the final audit and the `wt-final` worktree were live.
- README says "COMPLETE … final audit and dispositions in reviews/; commit and push recorded", none of which existed at audit time.

**10. NOTE: all four binding picks sit in widened-box regions, one at its natural limit.**
- Fold B ρ = 1.00 (the natural limit); fold C ρ = 0.98; fold A t2 = 0.005 (declared box 0.03–0.25); fold D γ = 2.57 (declared 0–2).
- The reports do not discuss these edge optima; they are consistent with item (f) failing.

**11. NOTE: test and stress gaps.**
- There is no explicit synthetic test of B after repeated losses (brief §8). The sealed Π1 handles four consecutive losses correctly (trades 8–11).
- The missing-bar stress leaves Π-000 and P\*_H bit-identical at both 1% and 5% (bar 0 is never removed), so it is weak.
- I did not run `tsc` or ESLint (outside my authorisation), so the IMPLEMENTATION_AUDIT §6 claims for those are unverified.

**12. NOTE: everything below verified with no discrepancy.**
- **Rubric for Π1:** (b) W = +23,749 / +18,148 / −6,415 / +16,186, Σ +51,669, 3 positive windows. (c) window drawdowns 23,198 / 11,086 / 22,004 / 14,170, chained 24,193. (e) 10 own-rule exits, 10 non-adoption first entries in 4 windows, long at 72.5% of closes. (d) d1 holds; d2: 58,084 ≥ 54,164. (g) excess +10,783, 1 window, C-SMA margin +2,673. (f) 58.6%, median 21,845 < 25,834. (h) all five stresses pass. (e2) +14,312 / +21,374 / 0.606. No near misses. Π1 sits at the 89.8th percentile of the deep null (median +19,286), so it is not selection-indistinguishable. Primary protection +26,216 / −31,870 / 33.6% (does not hold). Procedure statement holds. Gated fixed-parent 0/7. Π-NET is risk-incompatible. Π1-S2 fails b, c and g; Π1-reset equals Π1. Both are moot because Π1 fails items. Every recomputed value agrees with `analysis.json` to within 1e-9.
- **Ledger identities and executability:** identities (i), (ii), (iii), (v) and (vii) hold on Π1, Π1-off, Π-000, Π-NET, Z1, S2, the anchors and the controls; the only exceptions are by design (the declared ZR friction exemption on C-ALR, and the S3 conversion); one entry per session, no entry in an exit session, and every entry under its window's pick.
- **Selection integrity:** P\*, P\*-NET, the 8 mask picks and the champions recompute exactly in all five histories; the 13-pair deep union recomputes exactly from the first-pass snapshots under §7.3; pick summaries equal the robustness stage's independent re-runs.
- **Doors, freezes and scope:** every door ends at or before its stage's development end or 2023-12-29, with a recorded stop line; no code path reads `splits.json`, `distributions.csv` or post-2023 data; the protocol freeze (9 files) and the code freeze (87 files, `c0cea391…`) hold; the git diff since `2a7996dd` is empty, and nothing outside the two allowed directories is changed.
- **Rule mechanics:** A: eligibility dates (N, bar-0 rule, weekends), due exactly when net at the open < 0, fill at bar 1, no check in transition sessions. B: all 127 blocks inside the exit + C windows, and releases at exit + C + 1. C never armed on Π1; where it does arm (Π-001 / 101 / 011 / 111 and the FP paths), the level equals exitRaw × (1 + Y) with a correct arming condition.
- **Anchors and suite:** the Stage 1b Π1 and Stage 1 S1 anchors match the Stage 1b sealed files. The final data-less suite shows 784 / 733 / 8 / 28 / 15, the same failing files as the baseline plus 36 new passing tests.
- **Brief §12:** items 1–8 are delivered apart from the gaps in findings 4 and 5. Item 9 (commit, push, remote verification) is pending.

## Overall statement

Yes, the sealed evidence supports the reported verdict: "no demonstrated edge", with no candidate nominated. I recomputed every binding item independently from the payloads and each matches the sealed analysis. The three failures are far from their thresholds, so the label does not depend on rounding or a single borderline item: (g) only one excess window, and the C-SMA margin is +$2,673 against $5,000; (f) 58.6% of perturbed paths qualify against 75%, and the median is below half of Π1; (e2) the giveback share is 0.606 against 0.5. Selection integrity, data doors, freezes, scope, ledger identities and rule mechanics all hold. The defects are in the reporting: the "robust drawdown" framing, several narrative claims the sealed tables contradict, missing tags and descriptive deliverables, an undisclosed degenerate control row, and housekeeping before the commit. None of them needs a stage rerun or a change to a sealed record.
